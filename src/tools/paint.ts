import type { Tool, PEvent, OverlayCtx } from './types';
import type { RasterLayer, DocState, Layer } from '../core/types';
import { cur, commit, touch, activeLayer, brush, fg, bg, bucket, gradientOpts, toast, maskTarget } from '../core/store';
import { makeCanvas, ctx2d, cloneCanvas, parseColor } from '../core/util';
import { newRaster, addLayer, editablePixels } from '../core/ops';
import { pixelMatrix, compositeMasked, floodRegion, sampleColor, quickMaskStandIn } from '../core/selection';
import { flatten } from '../core/render';
import { ACCENT } from './move';

// Brush, Eraser, Paint Bucket, Gradient and Eyedropper.

interface Stroke {
  ds: DocState;
  layer: RasterLayer;
  base: HTMLCanvasElement; // pixels before the stroke
  stroke: HTMLCanvasElement; // accumulated dabs
  dab: HTMLCanvasElement;
  inv: DOMMatrix; // doc -> layer pixels
  last: { x: number; y: number };
  scale: number;
  erase: boolean;
}

let s: Stroke | null = null;
let hoverPt: { x: number; y: number } | null = null;
let lastPoint: { x: number; y: number } | null = null; // for Shift-click straight lines

function makeDab(size: number, hardness: number, color: string): HTMLCanvasElement {
  const d = Math.max(1, Math.ceil(size));
  const c = makeCanvas(d, d), x = ctx2d(c);
  const [r, g, b] = parseColor(color);
  const grad = x.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, d / 2);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(Math.min(0.99, hardness), `rgba(${r},${g},${b},1)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = grad;
  x.fillRect(0, 0, d, d);
  return c;
}

/** The raster layer to paint on, creating one when the active layer isn't raster. */
function paintTarget(ds: DocState, erase: boolean): RasterLayer | null {
  let l: Layer | null = activeLayer(ds);
  if (!l || l.type === 'group' || (!erase && l.type !== 'raster')) {
    if (l) toast('Painting on a new layer');
    return addLayer(newRaster(ds, 'Paint'), ds) as RasterLayer;
  }
  if (!l.visible) { toast('Layer is hidden', 'error'); return null; }
  return editablePixels(l, ds);
}

function stamp(to: { x: number; y: number }, pressure: number) {
  if (!s) return;
  const x = ctx2d(s.stroke);
  const { size, flow } = brush.value;
  const a = s.inv.transformPoint(s.last), b = s.inv.transformPoint(to);
  const sz = Math.max(1, size * s.scale * pressure);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const step = Math.max(1, sz * 0.12);
  x.globalAlpha = flow;
  for (let t = 0; t <= dist; t += step) {
    const px = a.x + ((b.x - a.x) * t) / (dist || 1), py = a.y + ((b.y - a.y) * t) / (dist || 1);
    x.drawImage(s.dab, px - sz / 2, py - sz / 2, sz, sz);
  }
  s.last = to;
  recomposite();
}

function recomposite() {
  if (!s) return;
  const lc = ctx2d(s.layer.canvas);
  lc.clearRect(0, 0, s.layer.canvas.width, s.layer.canvas.height);
  lc.drawImage(s.base, 0, 0);
  compositeMasked(s.ds, s.layer, s.stroke, s.erase ? 'destination-out' : 'source-over', brush.value.opacity);
  touch(false);
}

/** When editing a layer mask, paint into the mask through a stand-in raster layer. */
function maskStandIn(ds: DocState): RasterLayer | null {
  const qm = quickMaskStandIn(ds);
  if (qm) return qm;
  const l = activeLayer(ds);
  if (!l || !l.mask || maskTarget.value !== l.id) return null;
  const canvas = cloneCanvas(l.mask.canvas);
  l.mask = { ...l.mask, canvas };
  return { id: l.id, name: 'mask', type: 'raster', canvas, visible: true, locked: false, opacity: 1, blend: 'normal', x: l.mask.x, y: l.mask.y, w: canvas.width, h: canvas.height, rotation: 0 };
}

const isDark = (c: string) => { const [r, g, b] = parseColor(c); return 0.299 * r + 0.587 * g + 0.114 * b < 128; };

function brushLike(erase: boolean): Tool {
  return {
    cursor: () => 'none',
    hover(e) { hoverPt = { x: e.x, y: e.y }; touch(false); },
    down(e) {
      const ds = cur();
      if (!ds) return;
      // On a mask, black hides and white reveals (the eraser paints the background color).
      const standIn = maskStandIn(ds);
      const hide = standIn ? isDark(erase ? bg.value : fg.value) : erase;
      const layer = standIn ?? paintTarget(ds, erase);
      if (!layer) return;
      const base = cloneCanvas(layer.canvas);
      const m = pixelMatrix(layer);
      const scale = Math.hypot(m.inverse().a, m.inverse().b);
      const { size, hardness } = brush.value;
      s = {
        ds, layer, base, stroke: makeCanvas(layer.canvas.width, layer.canvas.height),
        dab: makeDab(Math.max(8, size * scale), hardness, standIn || erase ? '#000' : fg.value),
        inv: m.inverse(), last: e.shift && lastPoint ? lastPoint : { x: e.x, y: e.y }, scale, erase: hide,
      };
      stamp({ x: e.x, y: e.y }, e.pointerType === 'pen' ? Math.max(0.1, e.pressure) : 1);
    },
    move(e) {
      hoverPt = { x: e.x, y: e.y };
      if (s) stamp({ x: e.x, y: e.y }, e.pointerType === 'pen' ? Math.max(0.1, e.pressure) : 1);
    },
    up(e) {
      if (!s) return;
      lastPoint = { x: e.x, y: e.y };
      const onMask = s.layer.name === 'mask';
      s = null;
      commit(onMask ? 'Edit Mask' : erase ? 'Eraser' : 'Brush');
    },
    overlay(o: OverlayCtx) {
      if (!hoverPt) return;
      const p = o.toScreen(hoverPt.x, hoverPt.y), r = Math.max(1.5, (brush.value.size * o.zoom) / 2);
      const { ctx } = o;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1; ctx.stroke();
      if (r < 4) { ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 0.5, p.y - 6, 1, 12); ctx.fillRect(p.x - 6, p.y - 0.5, 12, 1); }
    },
    deactivate() { hoverPt = null; },
  };
}

export const brushTool = brushLike(false);
export const eraserTool = brushLike(true);

export const bucketTool: Tool = {
  cursor: () => 'crosshair',
  down(e) {
    const ds = cur();
    if (!ds) return;
    const l = activeLayer(ds);
    // Vector layers: bucket sets the fill, like Illustrator's live paint.
    if (l && (l.type === 'shape' || l.type === 'text') && !l.locked) {
      l.fill = fg.value;
      commit('Fill');
      return;
    }
    const target = l?.type === 'raster' ? editablePixels(l, ds) : addLayer(newRaster(ds, 'Fill'), ds) as RasterLayer;
    if (!target) return;
    const inv = pixelMatrix(target).inverse();
    const p = inv.transformPoint({ x: e.x, y: e.y });
    const img = ctx2d(target.canvas).getImageData(0, 0, target.canvas.width, target.canvas.height);
    const region = floodRegion(img, p.x, p.y, bucket.value.tolerance, bucket.value.contiguous);
    const x = ctx2d(region);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = fg.value;
    x.fillRect(0, 0, region.width, region.height);
    compositeMasked(ds, target, region);
    commit('Paint Bucket');
  },
};

let gStart: PEvent | null = null, gEnd: PEvent | null = null;

export const gradientTool: Tool = {
  cursor: () => 'crosshair',
  down(e) { gStart = e; gEnd = e; },
  move(e) { gEnd = e; touch(false); },
  up() {
    const ds = cur();
    const a = gStart, b = gEnd;
    gStart = gEnd = null;
    if (!ds || !a || !b || Math.hypot(b.x - a.x, b.y - a.y) < 2) return touch(false);
    const l = activeLayer(ds);
    const type = gradientOpts.value.type;
    const stops = [{ offset: 0, color: fg.value }, { offset: 1, color: bg.value }];
    if (l && (l.type === 'shape' || l.type === 'text') && !l.locked) {
      const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI - l.rotation;
      l.fill = { type, angle: Math.round(angle), stops };
      commit('Gradient Fill');
      return;
    }
    const target = l?.type === 'raster' ? editablePixels(l, ds) : addLayer(newRaster(ds, 'Gradient'), ds) as RasterLayer;
    if (!target) return;
    const c = makeCanvas(target.canvas.width, target.canvas.height), x = ctx2d(c);
    x.setTransform(pixelMatrix(target).inverse());
    const g = type === 'radial'
      ? x.createRadialGradient(a.x, a.y, 0, a.x, a.y, Math.hypot(b.x - a.x, b.y - a.y))
      : x.createLinearGradient(a.x, a.y, b.x, b.y);
    stops.forEach((s) => g.addColorStop(s.offset, s.color));
    x.fillStyle = g;
    x.fillRect(-1e5, -1e5, 2e5, 2e5);
    compositeMasked(ds, target, c);
    commit('Gradient');
  },
  overlay(o) {
    if (!gStart || !gEnd) return;
    const a = o.toScreen(gStart.x, gStart.y), b = o.toScreen(gEnd.x, gEnd.y);
    const { ctx } = o;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    for (const [p, c] of [[a, fg.value], [b, bg.value]] as const) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = ACCENT; ctx.lineWidth = 2; ctx.stroke();
    }
  },
};

let sampleCache: HTMLCanvasElement | null = null;
function pick(e: PEvent) {
  const ds = cur();
  if (!ds) return;
  const c = sampleCache ?? (sampleCache = flatten(ds.doc, 1, true));
  if (e.x < 0 || e.y < 0 || e.x >= c.width || e.y >= c.height) return;
  const [r, g, b, a] = ctx2d(c).getImageData(Math.floor(e.x), Math.floor(e.y), 1, 1).data;
  if (!a) return;
  const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  if (e.alt) bg.value = hex; else fg.value = hex;
}

export const eyedropperTool: Tool = {
  cursor: () => 'crosshair',
  down(e) { sampleCache = null; pick(e); },
  move(e) { pick(e); },
  up() { sampleCache = null; },
};

export { sampleColor };
