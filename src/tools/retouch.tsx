import { signal } from '@preact/signals';
import {
  Pencil, Replace, Stamp, Bandage, Sparkles, ScanEye, Undo2, BrushCleaning, WandSparkles,
  Droplet, Triangle, Pointer, Sun, Moon, Cloud,
} from 'lucide-preact';
import type { Tool, PEvent, OverlayCtx, ToolMeta } from './types';
import { screenPath } from './types';
import type { DocState, Layer, RasterLayer } from '../core/types';
import { cur, commit, touch, activeLayer, brush, fg, toast } from '../core/store';
import { historyShift } from '../core/store';
import { ctx2d, cloneCanvas, parseColor, rgbToHsl, hslToRgb, walk, findLayer } from '../core/util';
import { editablePixels } from '../core/ops';
import { pixelMatrix, maskForLayer, compositeMasked, floodRegion } from '../core/selection';
import { flatten } from '../core/render';
import { Slider, Seg } from '../ui/controls';
import { over, mix, luma, blurred, inpaint } from './retouch-px';

// Photoshop retouching tools: pencil, color replacement, clone/healing/spot healing, red eye,
// history brush, background/magic eraser, blur/sharpen/smudge and dodge/burn/sponge.
// Brush tools share one dab engine that only reads and writes each dab's bounding box.

// Settings (exported so other panels can drive them)

export const colorReplaceOpts = signal({ tolerance: 32, sampling: 'once' as 'once' | 'continuous' });
export const cloneOpts = signal({ aligned: true, sample: 'current' as 'current' | 'all' });
export const redEyeOpts = signal({ darkness: 50 });
/** History snapshot index the History Brush paints from (the History panel may set it). */
export const historySource = signal(0);
// Keep pointing at the same snapshot when the oldest history step is dropped.
historyShift.subscribe((n) => { if (n) historySource.value = Math.max(0, historySource.value - 1); });
export const bgEraserOpts = signal({ tolerance: 32, sampling: 'once' as 'once' | 'continuous' });
export const magicEraserOpts = signal({ tolerance: 32, contiguous: true, opacity: 1 });
export const focusOpts = signal({ strength: 0.5 }); // blur / sharpen / smudge
export const toneOpts = signal({ range: 'midtones' as 'shadows' | 'midtones' | 'highlights', exposure: 0.5 });
export const spongeOpts = signal({ mode: 'desaturate' as 'saturate' | 'desaturate', flow: 0.5 });

// Dab engine

interface Stroke {
  ds: DocState;
  layer: RasterLayer;
  ctx: CanvasRenderingContext2D;
  m: DOMMatrix; // layer pixels -> doc
  inv: DOMMatrix; // doc -> layer pixels
  scale: number; // layer pixels per doc pixel
  sel: CanvasRenderingContext2D | null; // selection mask in layer pixels
  last: { x: number; y: number }; // doc
  carry: number; // distance left before the next dab, keeps spacing even across events
  data: any; // per-tool state
}

interface Dab { img: ImageData; x0: number; y0: number; w: Float32Array; cx: number; cy: number; r: number }

interface Kind {
  label: string;
  hard?: boolean; // aliased pixel circle
  spacing?: number; // fraction of the brush size
  pad?: (r: number) => number; // extra pixels read around the dab
  alt?(ds: DocState, e: PEvent): void; // Alt-click (set source)
  check?(ds: DocState, l: Layer): boolean; // before touching pixels; false cancels
  start?(s: Stroke, e: PEvent): boolean | void; // false cancels
  dab?(s: Stroke, d: Dab): void;
  mark?(s: Stroke, cx: number, cy: number, r: number, doc: { x: number; y: number }, dr: number): void; // instead of dab
  end?(s: Stroke): void;
  overlay?(o: OverlayCtx, hover: { x: number; y: number } | null, painting: boolean): void;
}

let hoverPt: { x: number; y: number } | null = null;
const pressureOf = (e: PEvent) => (e.pointerType === 'pen' ? Math.max(0.1, e.pressure) : 1);
const smooth = (t: number) => t * t * (3 - 2 * t);

function runDab(s: Stroke, k: Kind, cx: number, cy: number, r: number) {
  const { width: W, height: H } = s.layer.canvas;
  const pad = Math.ceil(k.pad?.(r) ?? 0);
  const x0 = Math.max(0, Math.floor(cx - r - pad)), y0 = Math.max(0, Math.floor(cy - r - pad));
  const x1 = Math.min(W, Math.ceil(cx + r + pad)), y1 = Math.min(H, Math.ceil(cy + r + pad));
  if (x1 <= x0 || y1 <= y0) return;
  const w = x1 - x0, h = y1 - y0;
  const img = s.ctx.getImageData(x0, y0, w, h);
  const sel = s.sel?.getImageData(x0, y0, w, h).data;
  const wt = new Float32Array(w * h);
  const hr = k.hard ? Math.max(r, 0.71) : r * brush.value.hardness;
  let any = false;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot(x0 + x + 0.5 - cx, y0 + y + 0.5 - cy);
    let v = k.hard ? (d <= hr ? 1 : 0) : d <= hr ? 1 : d >= r ? 0 : smooth((r - d) / (r - hr));
    if (sel) v *= sel[(y * w + x) * 4 + 3] / 255;
    wt[y * w + x] = v;
    if (v > 0) any = true;
  }
  if (!any) return;
  k.dab!(s, { img, x0, y0, w: wt, cx, cy, r });
  s.ctx.putImageData(img, x0, y0);
}

let stroke: Stroke | null = null;

function strokeTo(k: Kind, to: { x: number; y: number }, pressure: number) {
  const s = stroke;
  if (!s) return;
  const a = s.inv.transformPoint(s.last), b = s.inv.transformPoint(to);
  const sz = Math.max(1, brush.value.size * s.scale * pressure);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const step = Math.max(1, sz * (k.spacing ?? 0.25));
  let t = s.carry;
  for (; t <= dist; t += step) {
    const f = dist ? t / dist : 0;
    const cx = a.x + (b.x - a.x) * f, cy = a.y + (b.y - a.y) * f;
    if (k.mark) k.mark(s, cx, cy, sz / 2, { x: s.last.x + (to.x - s.last.x) * f, y: s.last.y + (to.y - s.last.y) * f }, (brush.value.size * pressure) / 2);
    else runDab(s, k, cx, cy, sz / 2);
  }
  s.carry = t - dist;
  s.last = to;
  touch(false);
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dashed = false) {
  ctx.save();
  if (dashed) ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

function crosshair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 7, y - 1.5, 14, 3); ctx.fillRect(x - 1.5, y - 7, 3, 14);
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 6, y - 0.5, 12, 1); ctx.fillRect(x - 0.5, y - 6, 1, 12);
}

function brushTool(k: Kind): Tool {
  return {
    cursor: () => 'none',
    hover(e) { hoverPt = { x: e.x, y: e.y }; touch(false); },
    down(e) {
      const ds = cur();
      if (!ds) return;
      if (e.alt && k.alt) { k.alt(ds, e); touch(false); return; }
      const l = activeLayer(ds);
      if (!l || l.type === 'group') { toast('Select a pixel layer first', 'error'); return; }
      if (!l.visible) { toast('Layer is hidden', 'error'); return; }
      if (k.check && !k.check(ds, l)) return;
      const wasRaster = l.type === 'raster';
      const layer = editablePixels(l, ds);
      if (!layer) return;
      const m = pixelMatrix(layer), inv = m.inverse();
      const selMask = maskForLayer(ds, layer);
      stroke = {
        ds, layer, ctx: ctx2d(layer.canvas), m, inv, scale: Math.hypot(inv.a, inv.b),
        sel: selMask ? ctx2d(selMask) : null, last: { x: e.x, y: e.y }, carry: 0, data: {},
      };
      if (k.start && k.start(stroke, e) === false) {
        stroke = null;
        if (!wasRaster) commit('Rasterize Layer');
        return;
      }
      strokeTo(k, { x: e.x, y: e.y }, pressureOf(e));
    },
    move(e) {
      hoverPt = { x: e.x, y: e.y };
      if (stroke) strokeTo(k, { x: e.x, y: e.y }, pressureOf(e));
      else touch(false);
    },
    up() {
      const s = stroke;
      if (!s) return;
      k.end?.(s);
      stroke = null;
      commit(k.label);
    },
    overlay(o) {
      if (hoverPt) {
        const p = o.toScreen(hoverPt.x, hoverPt.y), r = Math.max(1.5, (brush.value.size * o.zoom) / 2);
        drawRing(o.ctx, p.x, p.y, r);
        if (r < 4) crosshair(o.ctx, p.x, p.y);
      }
      k.overlay?.(o, hoverPt, !!stroke);
    },
    deactivate() { hoverPt = null; stroke = null; },
  };
}

// Sources: a canvas plus the matrix mapping target layer pixels to source pixels.

interface Source { canvas: HTMLCanvasElement; M: DOMMatrix }

/** Call fn for each brushed (or, with `all`, every) dab pixel i whose mapped source pixel j is in range. */
function eachSource(src: Source, d: Dab, fn: (i: number, p: number, sd: Uint8ClampedArray, j: number) => void, all = false) {
  const { M } = src, { width: SW, height: SH } = src.canvas;
  const w = d.img.width, h = d.img.height;
  const pts = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => M.transformPoint({ x: d.x0 + x, y: d.y0 + y }));
  const sx0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.x))) - 1), sy0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.y))) - 1);
  const sx1 = Math.min(SW, Math.ceil(Math.max(...pts.map((p) => p.x))) + 1), sy1 = Math.min(SH, Math.ceil(Math.max(...pts.map((p) => p.y))) + 1);
  if (sx1 <= sx0 || sy1 <= sy0) return;
  const sw = sx1 - sx0, sd = ctx2d(src.canvas).getImageData(sx0, sy0, sw, sy1 - sy0).data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (!all && d.w[p] <= 0) continue;
    const px = d.x0 + x + 0.5, py = d.y0 + y + 0.5;
    const sx = Math.floor(M.a * px + M.c * py + M.e) - sx0, sy = Math.floor(M.b * px + M.d * py + M.f) - sy0;
    if (sx < 0 || sy < 0 || sx >= sw || sy >= sy1 - sy0) continue;
    fn(p * 4, p, sd, (sy * sw + sx) * 4);
  }
}

/** Matrix from target layer pixels through a doc offset into a source's pixel space. */
const sourceMatrix = (s: Stroke, srcInv: DOMMatrix, ox = 0, oy = 0) => srcInv.multiply(new DOMMatrix([1, 0, 0, 1, ox, oy])).multiply(s.m);

/** Clone Stamp and Healing Brush: Alt-click a source, then paint from it. */
function sourceKind(heal: boolean): Kind {
  let src: { x: number; y: number; layerId: string } | null = null;
  let offset: { x: number; y: number } | null = null;
  return {
    label: heal ? 'Healing Brush' : 'Clone Stamp',
    pad: heal ? (r) => Math.max(2, r / 3) * 2 : undefined,
    alt(ds, e) {
      const l = activeLayer(ds);
      src = { x: e.x, y: e.y, layerId: l?.id ?? '' };
      offset = null;
    },
    check() {
      if (!src) toast('Alt-click to set a source point first', 'error');
      return !!src;
    },
    start(s, e) {
      if (!src) return false;
      if (!offset || !cloneOpts.value.aligned) offset = { x: src.x - e.x, y: src.y - e.y };
      let canvas: HTMLCanvasElement, inv: DOMMatrix;
      if (cloneOpts.value.sample === 'all') { canvas = flatten(s.ds.doc, 1, true); inv = new DOMMatrix(); }
      else {
        const sl = findLayer(s.ds.doc, src.layerId);
        if (!sl || sl.type !== 'raster') { toast('The source layer has no pixels; Alt-click a new source', 'error'); return false; }
        // Same layer: sample the pre-stroke pixels so the stroke never clones itself.
        canvas = sl.id === s.layer.id ? cloneCanvas(s.layer.canvas) : sl.canvas;
        inv = pixelMatrix(sl).inverse();
      }
      s.data = { src: { canvas, M: sourceMatrix(s, inv, offset.x, offset.y) } as Source };
    },
    dab(s, d) {
      const op = brush.value.opacity, data = d.img.data;
      if (!heal) {
        eachSource(s.data.src, d, (i, p, sd, j) => over(data, i, sd[j], sd[j + 1], sd[j + 2], (sd[j + 3] / 255) * d.w[p] * op));
        return;
      }
      // Healing: source detail (source minus its blur) on top of the destination's blur.
      const w = d.img.width, h = d.img.height;
      const patch = new Uint8ClampedArray(data.length);
      eachSource(s.data.src, d, (i, _p, sd, j) => { patch[i] = sd[j]; patch[i + 1] = sd[j + 1]; patch[i + 2] = sd[j + 2]; patch[i + 3] = sd[j + 3]; }, true);
      const R = Math.max(2, d.r / 3);
      const sb = blurred(patch, w, h, R), db = blurred(data, w, h, R);
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        if (d.w[p] <= 0 || !patch[i + 3] || !data[i + 3]) continue;
        mix(data, i, db[i] + patch[i] - sb[i], db[i + 1] + patch[i + 1] - sb[i + 1], db[i + 2] + patch[i + 2] - sb[i + 2], data[i + 3], d.w[p] * op);
      }
    },
    overlay(o, hover, painting) {
      if (!src) return;
      const at = hover && offset && (painting || cloneOpts.value.aligned) ? { x: hover.x + offset.x, y: hover.y + offset.y } : src;
      const p = o.toScreen(at.x, at.y);
      crosshair(o.ctx, p.x, p.y);
      if (at !== src) drawRing(o.ctx, p.x, p.y, Math.max(1.5, (brush.value.size * o.zoom) / 2), true);
    },
  };
}

// Kinds

const pencilKind: Kind = {
  label: 'Pencil',
  hard: true,
  spacing: 0.15,
  start(s) { s.data = parseColor(fg.value); },
  dab(s, d) {
    const [r, g, b] = s.data, op = brush.value.opacity, data = d.img.data;
    for (let p = 0; p < d.w.length; p++) if (d.w[p] > 0) over(data, p * 4, r, g, b, d.w[p] * op);
  },
};

function sampleAt(s: Stroke, x: number, y: number): number[] | null {
  const p = s.inv.transformPoint({ x, y });
  const { width: W, height: H } = s.layer.canvas;
  if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) return null;
  return [...s.ctx.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data];
}

/** Reference color for a dab: the stroke-start sample, or the dab center for continuous sampling. */
function refColor(s: Stroke, d: Dab, continuous: boolean): number[] | null {
  if (!continuous) return s.data.ref;
  const x = Math.min(d.img.width - 1, Math.max(0, Math.floor(d.cx) - d.x0)), y = Math.min(d.img.height - 1, Math.max(0, Math.floor(d.cy) - d.y0));
  const i = (y * d.img.width + x) * 4;
  return [...d.img.data.slice(i, i + 4)];
}

const near = (d: Uint8ClampedArray, i: number, ref: number[], tol: number) =>
  Math.abs(d[i] - ref[0]) + Math.abs(d[i + 1] - ref[1]) + Math.abs(d[i + 2] - ref[2]) <= tol * 3;

const colorReplaceKind: Kind = {
  label: 'Color Replacement',
  start(s, e) {
    const [r, g, b] = parseColor(fg.value);
    const [h, sat] = rgbToHsl(r, g, b);
    s.data = { ref: sampleAt(s, e.x, e.y), h, sat };
  },
  dab(s, d) {
    const o = colorReplaceOpts.value, ref = refColor(s, d, o.sampling === 'continuous');
    if (!ref || !ref[3]) return;
    const data = d.img.data, op = brush.value.opacity;
    for (let p = 0; p < d.w.length; p++) {
      const i = p * 4;
      if (d.w[p] <= 0 || !data[i + 3] || !near(data, i, ref, o.tolerance)) continue;
      const l = rgbToHsl(data[i], data[i + 1], data[i + 2])[2];
      const [r, g, b] = hslToRgb(s.data.h, s.data.sat, l);
      mix(data, i, r, g, b, data[i + 3], d.w[p] * op);
    }
  },
};

/** Find a layer by id inside a snapshot's layer tree. */
function snapshotLayer(layers: Layer[], id: string): Layer | null {
  for (const [l] of walk(layers)) if (l.id === id) return l;
  return null;
}

/**
 * The History Brush source layer: the chosen snapshot, or (if the layer didn't exist yet there)
 * the earliest later snapshot where it has pixels, so new layers can still be restored.
 */
function historySourceLayer(ds: DocState, id: string): RasterLayer | null {
  const from = Math.min(ds.history.length - 1, Math.max(0, historySource.value));
  for (let i = from; i < ds.history.length; i++) {
    const sl = snapshotLayer(ds.history[i].layers, id);
    if (sl?.type === 'raster') return sl;
  }
  return null;
}

const historyKind: Kind = {
  label: 'History Brush',
  check(ds, l) {
    if (!historySourceLayer(ds, l.id)) { toast('The history source has no pixels for this layer', 'error'); return false; }
    return true;
  },
  start(s) {
    const sl = historySourceLayer(s.ds, s.layer.id)!;
    s.data = { canvas: sl.canvas, M: sourceMatrix(s, pixelMatrix(sl).inverse()) } as Source;
  },
  dab(s, d) {
    const op = brush.value.opacity, data = d.img.data;
    eachSource(s.data, d, (i, p, sd, j) => mix(data, i, sd[j], sd[j + 1], sd[j + 2], sd[j + 3], d.w[p] * op));
  },
};

const bgEraserKind: Kind = {
  label: 'Background Eraser',
  start(s, e) { s.data = { ref: sampleAt(s, e.x, e.y) }; },
  dab(s, d) {
    const o = bgEraserOpts.value, ref = refColor(s, d, o.sampling === 'continuous');
    if (!ref || !ref[3]) return;
    const data = d.img.data, op = brush.value.opacity;
    for (let p = 0; p < d.w.length; p++) {
      const i = p * 4;
      if (d.w[p] > 0 && near(data, i, ref, o.tolerance)) data[i + 3] *= 1 - d.w[p] * op;
    }
  },
};

const blurR = (r: number) => Math.max(1, r / 8);
const blurKind: Kind = {
  label: 'Blur',
  pad: (r) => blurR(r) * 2,
  dab(_s, d) {
    const { width: w, height: h, data } = d.img, b = blurred(data, w, h, blurR(d.r)), k = focusOpts.value.strength;
    for (let p = 0; p < w * h; p++) if (d.w[p] > 0) { const i = p * 4; mix(data, i, b[i], b[i + 1], b[i + 2], b[i + 3], d.w[p] * k); }
  },
};

const sharpenKind: Kind = {
  label: 'Sharpen',
  pad: () => 2,
  dab(_s, d) {
    const { width: w, height: h, data } = d.img, b = blurred(data, w, h, 1), k = focusOpts.value.strength * 0.3;
    for (let p = 0; p < w * h; p++) {
      if (d.w[p] <= 0) continue;
      const i = p * 4, t = d.w[p] * k;
      for (let c = 0; c < 3; c++) data[i + c] = data[i + c] + (data[i + c] - b[i + c]) * t;
    }
  },
};

const smudgeKind: Kind = {
  label: 'Smudge',
  spacing: 0.08,
  dab(s, d) {
    const prev = s.data.prev as { x: number; y: number } | undefined;
    const dx = prev ? Math.round(prev.x - d.cx) : 0, dy = prev ? Math.round(prev.y - d.cy) : 0;
    if (!prev || (!dx && !dy)) { if (!prev) s.data.prev = { x: d.cx, y: d.cy }; return; }
    s.data.prev = { x: d.cx, y: d.cy };
    const { width: w, height: h, data } = d.img, { width: W, height: H } = s.layer.canvas;
    const from = s.ctx.getImageData(d.x0 + dx, d.y0 + dy, w, h).data, k = focusOpts.value.strength;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x, sx = d.x0 + x + dx, sy = d.y0 + y + dy;
      if (d.w[p] <= 0 || sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const i = p * 4;
      mix(data, i, from[i], from[i + 1], from[i + 2], from[i + 3], d.w[p] * k);
    }
  },
};

const rangeWeight = (L: number) => {
  const r = toneOpts.value.range;
  return r === 'shadows' ? (1 - L) * (1 - L) : r === 'highlights' ? L * L : 1 - (2 * L - 1) * (2 * L - 1);
};

function toneKind(dodge: boolean): Kind {
  return {
    label: dodge ? 'Dodge' : 'Burn',
    dab(_s, d) {
      const data = d.img.data, ex = toneOpts.value.exposure * 0.15;
      for (let p = 0; p < d.w.length; p++) {
        if (d.w[p] <= 0) continue;
        const i = p * 4, k = d.w[p] * ex * rangeWeight(luma(data, i));
        for (let c = 0; c < 3; c++) data[i + c] = dodge ? data[i + c] + (255 - data[i + c]) * k : data[i + c] * (1 - k);
      }
    },
  };
}

const spongeKind: Kind = {
  label: 'Sponge',
  dab(_s, d) {
    const data = d.img.data, o = spongeOpts.value, sign = o.mode === 'saturate' ? 1 : -1;
    for (let p = 0; p < d.w.length; p++) {
      if (d.w[p] <= 0) continue;
      const i = p * 4, g = luma(data, i) * 255, f = 1 + sign * d.w[p] * o.flow * 0.15;
      for (let c = 0; c < 3; c++) data[i + c] = g + (data[i + c] - g) * f;
    }
  },
};

/** Spot Healing: collect the painted area, inpaint it on release. */
const spotKind: Kind = {
  label: 'Spot Healing Brush',
  start(s) { s.data = { dabs: [] as { cx: number; cy: number; r: number }[], marks: [] as { x: number; y: number; r: number }[] }; },
  mark(s, cx, cy, r, doc, dr) {
    s.data.dabs.push({ cx, cy, r });
    s.data.marks.push({ ...doc, r: dr });
  },
  end(s) {
    const dabs = s.data.dabs as { cx: number; cy: number; r: number }[];
    if (!dabs.length) return;
    const { width: W, height: H } = s.layer.canvas;
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const d of dabs) { bx0 = Math.min(bx0, d.cx - d.r); by0 = Math.min(by0, d.cy - d.r); bx1 = Math.max(bx1, d.cx + d.r); by1 = Math.max(by1, d.cy + d.r); }
    // Read the hole plus a margin as wide as the hole, so there is clean texture beside it.
    const pad = Math.max(bx1 - bx0, by1 - by0) + 4;
    const x0 = Math.max(0, Math.floor(bx0 - pad)), y0 = Math.max(0, Math.floor(by0 - pad));
    const x1 = Math.min(W, Math.ceil(bx1 + pad)), y1 = Math.min(H, Math.ceil(by1 + pad));
    if (x1 <= x0 || y1 <= y0) return;
    const w = x1 - x0, h = y1 - y0;
    const img = s.ctx.getImageData(x0, y0, w, h);
    const sel = s.sel?.getImageData(x0, y0, w, h).data;
    const hole = new Uint8Array(w * h);
    for (const d of dabs) {
      const r2 = d.r * d.r;
      for (let y = Math.max(0, Math.floor(d.cy - d.r - y0)); y < Math.min(h, Math.ceil(d.cy + d.r - y0)); y++)
        for (let x = Math.max(0, Math.floor(d.cx - d.r - x0)); x < Math.min(w, Math.ceil(d.cx + d.r - x0)); x++) {
          const dx = x0 + x + 0.5 - d.cx, dy = y0 + y + 0.5 - d.cy;
          if (dx * dx + dy * dy <= r2 && (!sel || sel[(y * w + x) * 4 + 3] > 127)) hole[y * w + x] = 1;
        }
    }
    inpaint(img.data, w, h, hole);
    s.ctx.putImageData(img, x0, y0);
  },
  overlay(o) {
    const marks = stroke?.data?.marks as { x: number; y: number; r: number }[] | undefined;
    if (!marks) return;
    const { ctx } = o;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    for (const m of marks) { const p = o.toScreen(m.x, m.y), r = m.r * o.zoom; ctx.moveTo(p.x + r, p.y); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); }
    ctx.fill('nonzero');
    ctx.restore();
  },
};

// Non-brush tools

let reA: PEvent | null = null, reB: PEvent | null = null;

export const redEyeTool: Tool = {
  cursor: () => 'crosshair',
  down(e) { reA = reB = e; },
  move(e) { reB = e; touch(false); },
  up() {
    const ds = cur(), a = reA, b = reB;
    reA = reB = null;
    touch(false);
    if (!ds || !a || !b) return;
    let x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    if (w < 4 && h < 4) { x = a.x - 30; y = a.y - 30; w = h = 60; }
    const l = activeLayer(ds);
    if (!l || l.type === 'group') { toast('Select a pixel layer first', 'error'); return; }
    const layer = editablePixels(l, ds);
    if (!layer) return;
    const inv = pixelMatrix(layer).inverse();
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => inv.transformPoint({ x: px, y: py }));
    const x0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.x)))), y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.y))));
    const x1 = Math.min(layer.canvas.width, Math.ceil(Math.max(...pts.map((p) => p.x)))), y1 = Math.min(layer.canvas.height, Math.ceil(Math.max(...pts.map((p) => p.y))));
    if (x1 <= x0 || y1 <= y0) { toast('No red eye found'); return; }
    const ctx = ctx2d(layer.canvas), img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0), d = img.data;
    const selMask = maskForLayer(ds, layer);
    const sel = selMask ? ctx2d(selMask).getImageData(x0, y0, x1 - x0, y1 - y0).data : null;
    const dark = 1 - (redEyeOpts.value.darkness / 100) * 0.6;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const avg = (d[i + 1] + d[i + 2]) / 2;
      if (d[i] <= 80 || d[i] <= 1.5 * avg || !d[i + 3]) continue;
      const t = sel ? sel[i + 3] / 255 : 1;
      if (!t) continue;
      d[i] += (avg * dark - d[i]) * t; d[i + 1] += (d[i + 1] * dark - d[i + 1]) * t; d[i + 2] += (d[i + 2] * dark - d[i + 2]) * t;
      n++;
    }
    if (!n) { toast('No red eye found'); if (l.type !== 'raster') commit('Rasterize Layer'); return; }
    ctx.putImageData(img, x0, y0);
    commit('Red Eye');
  },
  overlay(o) {
    if (!reA || !reB) return;
    const a = reA, b = reB, { ctx } = o;
    const box = screenPath(o, (p) => p.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y)));
    ctx.save();
    ctx.setLineDash([4, 3]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.stroke(box);
    ctx.restore();
  },
};

export const magicEraserTool: Tool = {
  cursor: () => 'crosshair',
  down(e) {
    const ds = cur();
    if (!ds) return;
    const l = activeLayer(ds);
    if (!l || l.type === 'group') { toast('Select a pixel layer first', 'error'); return; }
    const layer = editablePixels(l, ds);
    if (!layer) return;
    const p = pixelMatrix(layer).inverse().transformPoint({ x: e.x, y: e.y });
    const { width: W, height: H } = layer.canvas;
    // One-shot click: reading the whole layer is fine here (same as the paint bucket).
    const img = ctx2d(layer.canvas).getImageData(0, 0, W, H);
    const o = magicEraserOpts.value;
    compositeMasked(ds, layer, floodRegion(img, p.x, p.y, o.tolerance, o.contiguous), 'destination-out', o.opacity);
    commit('Magic Eraser');
  },
};

export const pencilTool = brushTool(pencilKind);
export const colorReplaceTool = brushTool(colorReplaceKind);
export const cloneStampTool = brushTool(sourceKind(false));
export const healingBrushTool = brushTool(sourceKind(true));
export const spotHealingTool = brushTool(spotKind);
export const historyBrushTool = brushTool(historyKind);
export const bgEraserTool = brushTool(bgEraserKind);
export const blurTool = brushTool(blurKind);
export const sharpenTool = brushTool(sharpenKind);
export const smudgeTool = brushTool(smudgeKind);
export const dodgeTool = brushTool(toneKind(true));
export const burnTool = brushTool(toneKind(false));
export const spongeTool = brushTool(spongeKind);

// Options bar

const pct = (v: number) => Math.round(v * 100);
const check = (label: string, value: boolean, set: (v: boolean) => void) => (
  <label class="opt"><input type="checkbox" checked={value} onChange={(e) => set((e.target as HTMLInputElement).checked)} /> {label}</label>
);

function BrushSliders({ hardness = true, opacity = true }: { hardness?: boolean; opacity?: boolean }) {
  const b = brush.value;
  return (
    <>
      <Slider label="Size" value={b.size} min={1} max={500} unit="px" onChange={(v) => (brush.value = { ...brush.value, size: v })} />
      {hardness && <Slider label="Hardness" value={pct(b.hardness)} min={0} max={100} unit="%" onChange={(v) => (brush.value = { ...brush.value, hardness: v / 100 })} />}
      {opacity && <Slider label="Opacity" value={pct(b.opacity)} min={1} max={100} unit="%" onChange={(v) => (brush.value = { ...brush.value, opacity: v / 100 })} />}
    </>
  );
}

const Tolerance = ({ value, set }: { value: number; set: (v: number) => void }) => <Slider label="Tolerance" value={value} min={0} max={255} onChange={set} />;
const Sampling = ({ value, set }: { value: 'once' | 'continuous'; set: (v: 'once' | 'continuous') => void }) => (
  <Seg value={value} onChange={set} options={[{ v: 'once', label: 'Once', title: 'Sample once at stroke start' }, { v: 'continuous', label: 'Continuous', title: 'Sample under the brush center' }]} />
);

function SourceOptions() {
  const o = cloneOpts.value;
  return (
    <>
      <BrushSliders />
      <div class="opt-sep" />
      {check('Aligned', o.aligned, (v) => (cloneOpts.value = { ...cloneOpts.value, aligned: v }))}
      <div class="opt"><label>Sample</label>
        <Seg value={o.sample} onChange={(v) => (cloneOpts.value = { ...cloneOpts.value, sample: v })} options={[{ v: 'current', label: 'Current layer' }, { v: 'all', label: 'All layers' }]} />
      </div>
      <span class="opt" style={{ color: 'var(--muted)' }}>Alt-click to set the source</span>
    </>
  );
}

const FocusOptions = () => (
  <>
    <BrushSliders opacity={false} />
    <Slider label="Strength" value={pct(focusOpts.value.strength)} min={1} max={100} unit="%" onChange={(v) => (focusOpts.value = { strength: v / 100 })} />
  </>
);

const ToneOptions = () => (
  <>
    <BrushSliders opacity={false} />
    <div class="opt"><label>Range</label>
      <Seg value={toneOpts.value.range} onChange={(v) => (toneOpts.value = { ...toneOpts.value, range: v })} options={[{ v: 'shadows', label: 'Shadows' }, { v: 'midtones', label: 'Midtones' }, { v: 'highlights', label: 'Highlights' }]} />
    </div>
    <Slider label="Exposure" value={pct(toneOpts.value.exposure)} min={1} max={100} unit="%" onChange={(v) => (toneOpts.value = { ...toneOpts.value, exposure: v / 100 })} />
  </>
);

export const RETOUCH_TOOLS: ToolMeta[] = [
  { id: 'pencil', label: 'Pencil', key: 'B', group: 'brush', icon: Pencil, tool: pencilTool, options: () => <BrushSliders hardness={false} /> },
  {
    id: 'colorReplace', label: 'Color Replacement', key: 'B', group: 'brush', icon: Replace, tool: colorReplaceTool,
    options: () => (
      <>
        <BrushSliders />
        <div class="opt-sep" />
        <Tolerance value={colorReplaceOpts.value.tolerance} set={(v) => (colorReplaceOpts.value = { ...colorReplaceOpts.value, tolerance: v })} />
        <Sampling value={colorReplaceOpts.value.sampling} set={(v) => (colorReplaceOpts.value = { ...colorReplaceOpts.value, sampling: v })} />
      </>
    ),
  },
  { id: 'cloneStamp', label: 'Clone Stamp', key: 'S', group: 'stamp', icon: Stamp, tool: cloneStampTool, options: SourceOptions },
  {
    id: 'spotHeal', label: 'Spot Healing Brush', key: 'J', group: 'heal', icon: Sparkles, tool: spotHealingTool,
    options: () => (
      <>
        <BrushSliders hardness={false} opacity={false} />
        <span class="opt" style={{ color: 'var(--muted)' }}>Paint over a blemish; it is filled from its surroundings on release</span>
      </>
    ),
  },
  { id: 'healBrush', label: 'Healing Brush', key: 'J', group: 'heal', icon: Bandage, tool: healingBrushTool, options: SourceOptions },
  {
    id: 'redEye', label: 'Red Eye', key: 'J', group: 'heal', icon: ScanEye, tool: redEyeTool,
    options: () => (
      <>
        <Slider label="Darken" value={redEyeOpts.value.darkness} min={0} max={100} unit="%" onChange={(v) => (redEyeOpts.value = { darkness: v })} />
        <span class="opt" style={{ color: 'var(--muted)' }}>Drag around an eye, or click it</span>
      </>
    ),
  },
  {
    id: 'historyBrush', label: 'History Brush', key: 'Y', group: 'historyBrush', icon: Undo2, tool: historyBrushTool,
    options: () => {
      const ds = cur();
      const snap = ds?.history[Math.min(ds.history.length - 1, Math.max(0, historySource.value))];
      return (
        <>
          <BrushSliders />
          <span class="opt" style={{ color: 'var(--muted)' }}>Source: {snap?.label ?? 'none'}</span>
        </>
      );
    },
  },
  {
    id: 'bgEraser', label: 'Background Eraser', key: 'E', group: 'eraser', icon: BrushCleaning, tool: bgEraserTool,
    options: () => (
      <>
        <BrushSliders />
        <div class="opt-sep" />
        <Tolerance value={bgEraserOpts.value.tolerance} set={(v) => (bgEraserOpts.value = { ...bgEraserOpts.value, tolerance: v })} />
        <Sampling value={bgEraserOpts.value.sampling} set={(v) => (bgEraserOpts.value = { ...bgEraserOpts.value, sampling: v })} />
      </>
    ),
  },
  {
    id: 'magicEraser', label: 'Magic Eraser', key: 'E', group: 'eraser', icon: WandSparkles, tool: magicEraserTool,
    options: () => {
      const o = magicEraserOpts.value;
      return (
        <>
          <Tolerance value={o.tolerance} set={(v) => (magicEraserOpts.value = { ...o, tolerance: v })} />
          {check('Contiguous', o.contiguous, (v) => (magicEraserOpts.value = { ...o, contiguous: v }))}
          <Slider label="Opacity" value={pct(o.opacity)} min={1} max={100} unit="%" onChange={(v) => (magicEraserOpts.value = { ...o, opacity: v / 100 })} />
        </>
      );
    },
  },
  { id: 'blur', label: 'Blur', key: '', group: 'blurTools', icon: Droplet, tool: blurTool, options: FocusOptions },
  { id: 'sharpen', label: 'Sharpen', key: '', group: 'blurTools', icon: Triangle, tool: sharpenTool, options: FocusOptions },
  { id: 'smudge', label: 'Smudge', key: '', group: 'blurTools', icon: Pointer, tool: smudgeTool, options: FocusOptions },
  { id: 'dodge', label: 'Dodge', key: 'O', group: 'dodge', icon: Sun, tool: dodgeTool, options: ToneOptions },
  { id: 'burn', label: 'Burn', key: 'O', group: 'dodge', icon: Moon, tool: burnTool, options: ToneOptions },
  {
    id: 'sponge', label: 'Sponge', key: 'O', group: 'dodge', icon: Cloud, tool: spongeTool,
    options: () => (
      <>
        <BrushSliders opacity={false} />
        <Seg value={spongeOpts.value.mode} onChange={(v) => (spongeOpts.value = { ...spongeOpts.value, mode: v })} options={[{ v: 'desaturate', label: 'Desaturate' }, { v: 'saturate', label: 'Saturate' }]} />
        <Slider label="Flow" value={pct(spongeOpts.value.flow)} min={1} max={100} unit="%" onChange={(v) => (spongeOpts.value = { ...spongeOpts.value, flow: v / 100 })} />
      </>
    ),
  },
];
