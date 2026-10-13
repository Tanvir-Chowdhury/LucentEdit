import type { DocState, Layer, RasterLayer } from './types';
import { signal } from '@preact/signals';
import { makeCanvas, ctx2d, layerMatrix, parseColor, cloneCanvas, Rect } from './util';
import { flatten, renderLayerToDocCanvas } from './render';
import { dilate, erode, border, growMask, colorRangeAlpha, RangeSpec } from './selectops';
import { touch } from './store';

// Pixel selections are document-sized alpha masks. Vector selections (marquee/lasso)
// also keep their outline so marching ants can be drawn crisply.

export type SelMode = 'replace' | 'add' | 'subtract' | 'intersect';
interface MaskMeta { outline?: Path2D; edges?: HTMLCanvasElement; bounds?: Rect | null }
const meta = new WeakMap<HTMLCanvasElement, MaskMeta>();
export const maskMeta = (m: HTMLCanvasElement) => {
  let v = meta.get(m);
  if (!v) meta.set(m, (v = {}));
  return v;
};

export function setSelection(ds: DocState, shape: Path2D | HTMLCanvasElement, mode: SelMode) {
  const { width: W, height: H } = ds.doc;
  const next = makeCanvas(W, H), x = ctx2d(next);
  const draw = (c: CanvasRenderingContext2D) => {
    if (shape instanceof HTMLCanvasElement) c.drawImage(shape, 0, 0);
    else { c.fillStyle = '#000'; c.fill(shape); }
  };
  if (mode === 'replace' || !ds.mask) {
    if (mode === 'subtract') return;
    draw(x);
  } else {
    x.drawImage(ds.mask, 0, 0);
    x.globalCompositeOperation = mode === 'add' ? 'source-over' : mode === 'subtract' ? 'destination-out' : 'destination-in';
    draw(x);
  }
  ds.mask = next;
  if (mode === 'replace' && !(shape instanceof HTMLCanvasElement)) maskMeta(next).outline = shape;
  if (!maskBounds(ds)) ds.mask = null;
  touch();
}

export function selectAll(ds: DocState) {
  const p = new Path2D();
  p.rect(0, 0, ds.doc.width, ds.doc.height);
  setSelection(ds, p, 'replace');
}

const lastMask = new WeakMap<DocState, HTMLCanvasElement>();
export function deselect(ds: DocState) {
  if (ds.mask) lastMask.set(ds, ds.mask);
  ds.mask = null;
  touch();
}
export const canReselect = (ds: DocState) => lastMask.has(ds);
export function reselect(ds: DocState) {
  const m = lastMask.get(ds);
  if (m) setSelection(ds, m, 'replace');
}

export function invertSelection(ds: DocState) {
  const { width: W, height: H } = ds.doc;
  const n = makeCanvas(W, H), x = ctx2d(n);
  x.fillRect(0, 0, W, H);
  if (ds.mask) {
    x.globalCompositeOperation = 'destination-out';
    x.drawImage(ds.mask, 0, 0);
  }
  const outline = ds.mask ? maskMeta(ds.mask).outline : undefined;
  ds.mask = n;
  if (outline) {
    const p = new Path2D(outline);
    p.rect(0, 0, W, H);
    maskMeta(n).outline = p;
  }
  touch();
}

export function featherSelection(ds: DocState, radius: number) {
  if (!ds.mask || radius <= 0) return;
  const n = makeCanvas(ds.mask.width, ds.mask.height), x = ctx2d(n);
  const data = ctx2d(ds.mask).getImageData(0, 0, n.width, n.height);
  boxBlurAlpha(data, radius);
  x.putImageData(data, 0, 0);
  ds.mask = n;
  touch();
}

export function maskBounds(ds: DocState): Rect | null {
  if (!ds.mask) return null;
  const m = maskMeta(ds.mask);
  if (m.bounds !== undefined) return m.bounds;
  const { width: W, height: H } = ds.mask;
  const d = ctx2d(ds.mask).getImageData(0, 0, W, H).data;
  let x1 = W, y1 = H, x2 = -1, y2 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 0) {
      if (x < x1) x1 = x; if (x > x2) x2 = x;
      if (y < y1) y1 = y; if (y > y2) y2 = y;
    }
  }
  m.bounds = x2 < 0 ? null : { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 };
  return m.bounds;
}

/** One-pixel edge image of the mask, for marching ants when there's no vector outline. */
export function maskEdges(mask: HTMLCanvasElement): HTMLCanvasElement {
  const m = maskMeta(mask);
  if (m.edges) return m.edges;
  const { width: W, height: H } = mask;
  const src = ctx2d(mask).getImageData(0, 0, W, H).data;
  const out = makeCanvas(W, H), ox = ctx2d(out);
  const img = ox.createImageData(W, H), d = img.data;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[(y * W + x) * 4 + 3] > 127;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (on(x, y) && (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1))) {
      const i = (y * W + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255;
    }
  }
  ox.putImageData(img, 0, 0);
  return (m.edges = out);
}

/** Matrix mapping a raster layer's pixel space to document space. */
export function pixelMatrix(l: RasterLayer): DOMMatrix {
  return layerMatrix(l).scaleSelf(l.w / l.canvas.width, l.h / l.canvas.height);
}

/** The selection mask resampled into a raster layer's pixel space. */
export function maskForLayer(ds: DocState, l: RasterLayer): HTMLCanvasElement | null {
  if (!ds.mask) return null;
  const c = makeCanvas(l.canvas.width, l.canvas.height), x = ctx2d(c);
  const inv = pixelMatrix(l).inverse();
  x.setTransform(inv);
  x.drawImage(ds.mask, 0, 0);
  return c;
}

/** Composite `src` onto the layer only where selected (or everywhere if no selection). */
export function compositeMasked(ds: DocState, l: RasterLayer, src: HTMLCanvasElement, op: GlobalCompositeOperation = 'source-over', alpha = 1) {
  const m = maskForLayer(ds, l);
  let s = src;
  if (m) {
    s = makeCanvas(src.width, src.height);
    const x = ctx2d(s);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(m, 0, 0);
  }
  const lc = ctx2d(l.canvas);
  lc.save();
  lc.globalAlpha = alpha;
  lc.globalCompositeOperation = op;
  lc.drawImage(s, 0, 0);
  lc.restore();
}

export function fillSelection(ds: DocState, l: RasterLayer, color: string) {
  const c = makeCanvas(l.canvas.width, l.canvas.height), x = ctx2d(c);
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  compositeMasked(ds, l, c);
}

export function clearSelection(ds: DocState, l: RasterLayer) {
  const c = makeCanvas(l.canvas.width, l.canvas.height), x = ctx2d(c);
  x.fillRect(0, 0, c.width, c.height);
  compositeMasked(ds, l, c, 'destination-out');
}

/** Copy the selected pixels of a layer into a document-sized canvas. */
export function copyPixels(ds: DocState, l: Layer, source: HTMLCanvasElement): HTMLCanvasElement {
  const c = makeCanvas(ds.doc.width, ds.doc.height), x = ctx2d(c);
  x.drawImage(source, 0, 0);
  if (ds.mask) {
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(ds.mask, 0, 0);
  }
  void l;
  return c;
}

/** Flood fill region (magic wand / paint bucket) as a mask canvas of the same size as `img`. */
export function floodRegion(img: ImageData, sx: number, sy: number, tolerance: number, contiguous: boolean): HTMLCanvasElement {
  const { width: W, height: H, data: d } = img;
  const out = makeCanvas(W, H);
  sx = Math.floor(sx); sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return out;
  const i0 = (sy * W + sx) * 4;
  const r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2], a0 = d[i0 + 3];
  const tol = tolerance * 4;
  const match = (i: number) => Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0) + Math.abs(d[i + 3] - a0) <= tol;
  const sel = new Uint8Array(W * H);
  if (contiguous) {
    const stack = [sy * W + sx];
    sel[sy * W + sx] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % W, y = (p / W) | 0;
      const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
      for (const q of nb) if (q >= 0 && !sel[q] && match(q * 4)) { sel[q] = 1; stack.push(q); }
    }
  } else for (let p = 0; p < W * H; p++) if (match(p * 4)) sel[p] = 1;
  const ox = ctx2d(out), o = ox.createImageData(W, H);
  for (let p = 0; p < W * H; p++) if (sel[p]) o.data[p * 4 + 3] = 255;
  ox.putImageData(o, 0, 0);
  return out;
}

export function magicWand(ds: DocState, x: number, y: number, tolerance: number, contiguous: boolean, mode: SelMode) {
  const flat = flatten(ds.doc, 1, false);
  const img = ctx2d(flat).getImageData(0, 0, flat.width, flat.height);
  setSelection(ds, floodRegion(img, x, y, tolerance, contiguous), mode);
}

/** Sample the composite color at a document point. */
export function sampleColor(ds: DocState, x: number, y: number): string | null {
  const flat = flatten(ds.doc, 1, true);
  if (x < 0 || y < 0 || x >= flat.width || y >= flat.height) return null;
  const [r, g, b, a] = ctx2d(flat).getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  if (!a) return null;
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function boxBlurAlpha(img: ImageData, r: number) {
  const { width: W, height: H, data: d } = img;
  const a = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3];
  const tmp = new Float32Array(W * H);
  const R = Math.max(1, Math.round(r / 2));
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) {
      let s = 0;
      for (let x = -R; x <= R; x++) s += a[y * W + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        tmp[y * W + x] = s / (2 * R + 1);
        s += a[y * W + Math.min(W - 1, x + R + 1)] - a[y * W + Math.max(0, x - R)];
      }
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let y = -R; y <= R; y++) s += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        a[y * W + x] = s / (2 * R + 1);
        s += tmp[Math.min(H - 1, y + R + 1) * W + x] - tmp[Math.max(0, y - R) * W + x];
      }
    }
  }
  for (let i = 0; i < W * H; i++) d[i * 4 + 3] = a[i];
}

export const colorToRGBA = parseColor;

// Select menu: Modify, Grow/Similar, Color Range, saved selections, layer pixels, Quick Mask.

function maskAlpha(ds: DocState): Uint8Array | null {
  if (!ds.mask) return null;
  const { width: W, height: H } = ds.mask, d = ctx2d(ds.mask).getImageData(0, 0, W, H).data;
  const a = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) a[p] = d[p * 4 + 3];
  return a;
}

/** Doc-sized mask canvas from an alpha plane. */
export function alphaCanvas(a: Uint8Array, W: number, H: number): HTMLCanvasElement {
  const c = makeCanvas(W, H), x = ctx2d(c), img = x.createImageData(W, H);
  for (let p = 0; p < W * H; p++) img.data[p * 4 + 3] = a[p];
  x.putImageData(img, 0, 0);
  return c;
}

function modify(ds: DocState, f: (a: Uint8Array, W: number, H: number) => Uint8Array) {
  const a = maskAlpha(ds);
  if (!a) return;
  const { width: W, height: H } = ds.mask!;
  setSelection(ds, alphaCanvas(f(a, W, H), W, H), 'replace');
}

export const modifyExpand = (ds: DocState, px: number) => modify(ds, (a, W, H) => dilate(a, W, H, px));
export const modifyContract = (ds: DocState, px: number) => modify(ds, (a, W, H) => erode(a, W, H, px));
export const modifyBorder = (ds: DocState, width: number) => modify(ds, (a, W, H) => border(a, W, H, width));
/** Blur then threshold: rounds corners and drops specks smaller than the radius. */
export function modifySmooth(ds: DocState, radius: number) {
  modify(ds, (a, W, H) => {
    const img = new ImageData(W, H);
    for (let p = 0; p < W * H; p++) img.data[p * 4 + 3] = a[p];
    boxBlurAlpha(img, radius * 2);
    return a.map((_, p) => (img.data[p * 4 + 3] >= 128 ? 255 : 0));
  });
}

const flatData = (ds: DocState) => { const f = flatten(ds.doc, 1, false); return ctx2d(f).getImageData(0, 0, f.width, f.height).data; };

export const grow = (ds: DocState, tolerance: number) => modify(ds, (a, W, H) => growMask(flatData(ds), a, W, H, tolerance, true));
export const similar = (ds: DocState, tolerance: number) => modify(ds, (a, W, H) => growMask(flatData(ds), a, W, H, tolerance, false));

export type ColorRangeTarget = string | 'highlights' | 'midtones' | 'shadows';
export const rangeSpec = (t: ColorRangeTarget): RangeSpec => {
  if (t === 'highlights' || t === 'midtones' || t === 'shadows') return t;
  const [r, g, b] = parseColor(t);
  return { r, g, b };
};

/** Select > Color Range. Soft mask: alpha falls off with distance from `color` (fuzziness 0..200). */
export function colorRange(ds: DocState, color: ColorRangeTarget, fuzziness: number, mode: 'replace' | 'add' | 'subtract' = 'replace') {
  const { width: W, height: H } = ds.doc;
  setSelection(ds, alphaCanvas(colorRangeAlpha(flatData(ds), W * H, rangeSpec(color), fuzziness), W, H), mode);
}

export function saveSelection(ds: DocState, name: string) {
  if (!ds.mask) return;
  (ds.channels ??= []).push({ name: name || `Alpha ${ds.channels.length + 1}`, mask: cloneCanvas(ds.mask) });
  touch();
}

export function loadSelection(ds: DocState, index: number, mode: SelMode = 'replace', invert = false) {
  const ch = ds.channels?.[index];
  if (!ch) return;
  let m = ch.mask;
  if (invert) {
    m = makeCanvas(ds.doc.width, ds.doc.height);
    const x = ctx2d(m);
    x.fillRect(0, 0, m.width, m.height);
    x.globalCompositeOperation = 'destination-out';
    x.drawImage(ch.mask, 0, 0);
  }
  setSelection(ds, m, mode);
}

/** Ctrl+click on a layer thumbnail: select the layer's opaque pixels. */
export function selectLayerPixels(ds: DocState, layer: Layer, mode: SelMode = 'replace') {
  setSelection(ds, renderLayerToDocCanvas(ds.doc, layer), mode);
}

/** Quick Mask mode: the selection becomes a paintable mask shown as a red overlay. */
export const quickMask = signal(false);

export function toggleQuickMask(ds: DocState) {
  if (quickMask.value) {
    const m = ds.qmask;
    ds.qmask = undefined;
    quickMask.value = false;
    if (m) setSelection(ds, m, 'replace');
    else touch();
    return;
  }
  // Kept outside ds.mask so brush strokes aren't clipped by the selection they edit.
  ds.qmask = ds.mask ? cloneCanvas(ds.mask) : makeCanvas(ds.doc.width, ds.doc.height);
  ds.mask = null;
  quickMask.value = true;
  touch();
}

/** Brush/eraser stand-in for Quick Mask: a fresh copy of the quick mask placed at 0,0 (see paint.ts maskStandIn). */
export function quickMaskStandIn(ds: DocState): RasterLayer | null {
  if (!quickMask.value) return null;
  if (!ds.qmask) { ds.qmask = ds.mask ?? makeCanvas(ds.doc.width, ds.doc.height); ds.mask = null; } // doc switched while on
  const canvas = (ds.qmask = cloneCanvas(ds.qmask)); // a selection made meanwhile still clips the stroke
  return { id: 'quickmask', name: 'mask', type: 'raster', canvas, visible: true, locked: false, opacity: 1, blend: 'normal', x: 0, y: 0, w: canvas.width, h: canvas.height, rotation: 0 };
}

let tint: HTMLCanvasElement | null = null;
/** Rubylith: tint unselected areas red. Screen = pan + doc * zoom, in CSS px scaled by dpr. */
/** `m` maps document pixels to device pixels (viewport transform including Rotate View). */
export function drawQuickMaskOverlay(ctx: CanvasRenderingContext2D, ds: DocState, m: DOMMatrix, zoom: number) {
  if (!quickMask.value || !ds.qmask) return;
  const { width: W, height: H } = ds.qmask;
  if (!tint || tint.width !== W || tint.height !== H) tint = makeCanvas(W, H);
  const t = ctx2d(tint);
  t.globalCompositeOperation = 'copy';
  t.fillStyle = 'rgba(255,0,0,0.5)';
  t.fillRect(0, 0, W, H);
  t.globalCompositeOperation = 'destination-out';
  t.drawImage(ds.qmask, 0, 0);
  ctx.save();
  ctx.setTransform(m);
  ctx.imageSmoothingEnabled = zoom < 1;
  ctx.drawImage(tint, 0, 0);
  ctx.restore();
}
