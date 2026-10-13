import type { Layer, GroupLayer, Doc } from './types';

let idSeq = 0;
export const uid = (p = 'l') => `${p}${Date.now().toString(36)}${(idSeq++).toString(36)}`;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: false })!;

export function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height);
  ctx2d(c).drawImage(src, 0, 0);
  return c;
}

export function canvasToDataURL(c: HTMLCanvasElement) { return c.toDataURL('image/png'); }

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not load image'));
    img.src = src;
  });
}

export async function imageToCanvas(src: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);
  const c = makeCanvas(img.naturalWidth || img.width || 512, img.naturalHeight || img.height || 512);
  ctx2d(c).drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export function bytesToDataURL(bytes: Uint8Array, mime: string): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(new Blob([bytes as BlobPart], { type: mime }));
  });
}

export function dataURLToBytes(url: string): Uint8Array {
  const b = atob(url.slice(url.indexOf(',') + 1));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

export function canvasToBlob(c: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), type, quality));
}

// Colors

export type RGBA = [number, number, number, number];
const probe = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d')! : null;

/** Parse any CSS color into 0-255 RGBA (alpha 0-1). */
export function parseColor(c: string): RGBA {
  const m = /^#([0-9a-f]{3,8})$/i.exec(c.trim());
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((x) => x + x).join('');
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  if (!probe) return [0, 0, 0, 1];
  probe.fillStyle = '#000';
  probe.fillStyle = c;
  const v = probe.fillStyle as string;
  if (v.startsWith('#')) return parseColor(v);
  const p = v.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
  return [p[0], p[1], p[2], p[3] ?? 1];
}

const hx = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
export function toHex([r, g, b, a]: RGBA): string {
  return `#${hx(r)}${hx(g)}${hx(b)}${a < 1 ? hx(a * 255) : ''}`;
}
export const normHex = (c: string) => toHex(parseColor(c));

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };
  return [f(5), f(3), f(1)];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) * 255;
  return [f(0), f(8), f(4)];
}

// Geometry

export interface Rect { x: number; y: number; w: number; h: number }

/** Local layer box -> document matrix. */
export function layerMatrix(l: { x: number; y: number; w: number; h: number; rotation: number }): DOMMatrix {
  const m = new DOMMatrix();
  m.translateSelf(l.x + l.w / 2, l.y + l.h / 2);
  if (l.rotation) m.rotateSelf(l.rotation);
  m.translateSelf(-l.w / 2, -l.h / 2);
  return m;
}

export function corners(l: Layer): { x: number; y: number }[] {
  const m = layerMatrix(l);
  return [[0, 0], [l.w, 0], [l.w, l.h], [0, l.h]].map(([x, y]) => {
    const p = m.transformPoint({ x, y });
    return { x: p.x, y: p.y };
  });
}

/** Axis-aligned bounds in document space. */
export function bounds(l: Layer): Rect {
  if (!l.rotation) return { x: l.x, y: l.y, w: l.w, h: l.h };
  const c = corners(l);
  const xs = c.map((p) => p.x), ys = c.map((p) => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function unionRects(rs: Rect[]): Rect | null {
  if (!rs.length) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const r of rs) {
    x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// Layer tree helpers

export function* walk(layers: Layer[], parent: GroupLayer | null = null): Generator<[Layer, GroupLayer | null]> {
  for (const l of layers) {
    yield [l, parent];
    if (l.type === 'group') yield* walk(l.children, l);
  }
}

export function findLayer(doc: Doc, id: string): Layer | null {
  for (const [l] of walk(doc.layers)) if (l.id === id) return l;
  return null;
}

/** The array that holds a layer (doc.layers or a group's children). */
export function containerOf(doc: Doc, id: string): Layer[] | null {
  if (doc.layers.some((l) => l.id === id)) return doc.layers;
  for (const [l] of walk(doc.layers)) if (l.type === 'group' && l.children.some((c) => c.id === id)) return l.children;
  return null;
}

/** Recompute group boxes from their children (groups have no transform of their own). */
export function refreshGroups(layers: Layer[]) {
  for (const l of layers) {
    if (l.type !== 'group') continue;
    refreshGroups(l.children);
    const r = unionRects(l.children.map(bounds));
    if (r) Object.assign(l, r);
    l.rotation = 0;
  }
}

/** Deep-clone layers. Raster and mask canvases are shared on purpose (copy-on-write). */
export function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map((l) => {
    const { mask, ...rest } = l;
    let c: Layer;
    if (l.type === 'group') c = { ...(rest as any), children: cloneLayers(l.children) };
    else if (l.type === 'smart') c = { ...(rest as any), effects: structuredClone(l.effects), content: { ...l.content, layers: cloneLayers(l.content.layers) } };
    else if (l.type === 'raster') c = { ...(rest as any), effects: structuredClone(l.effects) };
    else c = structuredClone(rest) as Layer;
    if (mask) c.mask = { ...mask };
    return c;
  });
}

/** Clone with fresh ids and private canvases (for duplicate/paste). */
export function duplicateLayer(l: Layer): Layer {
  const c = cloneLayers([l])[0];
  const fresh = (x: Layer) => {
    x.id = uid();
    if (x.type === 'raster') x.canvas = cloneCanvas(x.canvas);
    if (x.mask) x.mask = { ...x.mask, canvas: cloneCanvas(x.mask.canvas) };
    if (x.type === 'group') x.children.forEach(fresh);
  };
  fresh(c);
  return c;
}

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
