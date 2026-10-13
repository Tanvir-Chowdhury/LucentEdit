import type { DocState, Layer, RasterLayer, ShapeLayer, TextLayer, GroupLayer, Paint, Stroke, SubPath } from './types';
import { cur, commit, touch, select, selectedLayers, activeLayer, fg, textOpts, toast } from './store';
import {
  uid, makeCanvas, ctx2d, cloneCanvas, findLayer, containerOf, walk, bounds, unionRects,
  duplicateLayer, refreshGroups, layerMatrix, Rect,
} from './util';
import { fitText, drawLayer, drawLayers } from './render';
import { normalizePaths, shapeToPaths, shapePath2D } from './paths';

// Layer operations shared by the UI and the MCP server. Functions mutate the current
// document; callers decide when to commit() a history step.

const base = (name: string, x: number, y: number, w: number, h: number) => ({
  id: uid(), name, visible: true, locked: false, opacity: 1, blend: 'normal' as const, x, y, w, h, rotation: 0,
});

export function newRaster(ds: DocState, name = 'Layer', canvas?: HTMLCanvasElement, x = 0, y = 0): RasterLayer {
  const c = canvas ?? makeCanvas(ds.doc.width, ds.doc.height);
  return { ...base(name, x, y, c.width, c.height), type: 'raster', canvas: c };
}

export function newShape(opts: Partial<ShapeLayer> & { shape: ShapeLayer['shape']; x: number; y: number; w: number; h: number }): ShapeLayer {
  const names = { rect: 'Rectangle', ellipse: 'Ellipse', polygon: 'Polygon', star: 'Star', path: 'Path' };
  return {
    ...base(names[opts.shape], opts.x, opts.y, opts.w, opts.h),
    type: 'shape', fill: fg.value, stroke: null, ...opts,
  } as ShapeLayer;
}

export function newPath(paths: SubPath[], opts: Partial<ShapeLayer> = {}): ShapeLayer {
  const n = normalizePaths(paths);
  return newShape({ shape: 'path', x: n.x, y: n.y, w: Math.max(n.w, 0.01), h: Math.max(n.h, 0.01), paths: n.paths, nw: Math.max(n.w, 0.01), nh: Math.max(n.h, 0.01), ...opts });
}

export function newText(text: string, x: number, y: number, opts: Partial<TextLayer> = {}): TextLayer {
  const t = textOpts.value;
  const l: TextLayer = {
    ...base(text.split('\n')[0].slice(0, 30) || 'Text', x, y, 10, 10), type: 'text', text,
    family: t.family, size: t.size, weight: t.weight, italic: t.italic, align: t.align,
    fill: fg.value, lineHeight: 1.2, letterSpacing: 0, stroke: null, autoWidth: true, ...opts,
  };
  fitText(l);
  return l;
}

/** Insert above the active layer (or at top) and select it. */
export function addLayer(l: Layer, ds: DocState | null = cur(), above?: string) {
  if (!ds) return l;
  const ref = above ?? ds.selected[ds.selected.length - 1];
  const arr = (ref && containerOf(ds.doc, ref)) || ds.doc.layers;
  const i = ref ? arr.findIndex((x) => x.id === ref) : -1;
  arr.splice(i >= 0 ? i + 1 : arr.length, 0, l);
  ds.selected = [l.id];
  refreshGroups(ds.doc.layers);
  touch();
  return l;
}

export function removeLayers(ids: string[], ds: DocState | null = cur(), pruneEmpty = true) {
  if (!ds) return;
  const del = (arr: Layer[]) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const l = arr[i];
      if (ids.includes(l.id)) arr.splice(i, 1);
      else if (l.type === 'group') del(l.children);
    }
  };
  del(ds.doc.layers);
  // Drop empty groups.
  const prune = (arr: Layer[]) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const l = arr[i];
      if (l.type === 'group') { prune(l.children); if (!l.children.length) arr.splice(i, 1); }
    }
  };
  if (pruneEmpty) prune(ds.doc.layers);
  ds.selected = ds.selected.filter((id) => !ids.includes(id) && findLayer(ds.doc, id));
  touch();
}

export function deleteSelected() {
  const ds = cur();
  if (!ds || !ds.selected.length) return;
  removeLayers(ds.selected, ds);
  commit('Delete Layer');
}

export function duplicateSelected(ds: DocState | null = cur()) {
  if (!ds) return [];
  const out: string[] = [];
  for (const l of selectedLayers(ds)) {
    const c = duplicateLayer(l);
    c.name = l.name.endsWith(' copy') ? l.name : `${l.name} copy`;
    const arr = containerOf(ds.doc, l.id)!;
    arr.splice(arr.indexOf(l) + 1, 0, c);
    out.push(c.id);
  }
  ds.selected = out;
  commit('Duplicate Layer', ds);
  return out;
}

export function setProps(l: Layer, props: Record<string, any>) {
  const allowed = new Set(Object.keys(l));
  ['effects', 'radius', 'sides', 'inner', 'fillRule', 'stroke', 'fill'].forEach((k) => allowed.add(k));
  for (const [k, v] of Object.entries(props)) {
    if (k === 'id' || k === 'type' || k === 'children' || k === 'canvas' || k === 'paths' || k === 'x' || k === 'y') continue;
    if (!allowed.has(k)) continue;
    (l as any)[k] = v;
  }
  if (l.type === 'text' && ['text', 'size', 'family', 'weight', 'italic', 'lineHeight', 'letterSpacing', 'autoWidth', 'w', 'align'].some((k) => k in props)) {
    if ('w' in props) l.autoWidth = props.autoWidth ?? false;
    fitText(l);
  }
  if ('x' in props || 'y' in props) {
    // Moving goes through moveLayer so group children and masks follow.
    if (l.type === 'group') refreshGroups([l]);
    moveLayer(l, (props.x ?? l.x) - l.x, (props.y ?? l.y) - l.y);
  }
}

export function moveLayer(l: Layer, dx: number, dy: number) {
  l.x += dx; l.y += dy;
  // Masks are linked to their layer, like Photoshop's chain icon.
  if (l.mask) l.mask = { ...l.mask, x: l.mask.x + dx, y: l.mask.y + dy };
  if (l.type === 'group') l.children.forEach((c) => moveLayer(c, dx, dy));
}

/** Scale a layer (and group children) from an origin point. */
export function scaleLayer(l: Layer, sx: number, sy: number, ox: number, oy: number) {
  if (l.mask) {
    const m = l.mask;
    const c = makeCanvas(m.canvas.width * Math.abs(sx), m.canvas.height * Math.abs(sy));
    ctx2d(c).drawImage(m.canvas, 0, 0, c.width, c.height);
    l.mask = { ...m, canvas: c, x: ox + (m.x - ox) * sx, y: oy + (m.y - oy) * sy };
  }
  if (l.type === 'group') {
    l.children.forEach((c) => scaleLayer(c, sx, sy, ox, oy));
    refreshGroups([l]);
    return;
  }
  const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
  l.w = Math.max(1, l.w * Math.abs(sx));
  l.h = Math.max(1, l.h * Math.abs(sy));
  const ncx = ox + (cx - ox) * sx, ncy = oy + (cy - oy) * sy;
  l.x = ncx - l.w / 2; l.y = ncy - l.h / 2;
  if (l.type === 'text') {
    l.size = Math.max(1, l.size * Math.abs(sy));
    if (!l.autoWidth) fitText(l); else fitText(l);
  }
}

export function reorder(id: string, to: 'up' | 'down' | 'top' | 'bottom' | number, ds: DocState | null = cur()) {
  if (!ds) return;
  const arr = containerOf(ds.doc, id);
  if (!arr) return;
  const i = arr.findIndex((l) => l.id === id);
  const [l] = arr.splice(i, 1);
  let j = typeof to === 'number' ? to : to === 'up' ? i + 1 : to === 'down' ? i - 1 : to === 'top' ? arr.length : 0;
  j = Math.max(0, Math.min(arr.length, j));
  arr.splice(j, 0, l);
  touch();
}

/** Move a layer into a container at index (used by drag & drop in the Layers panel). */
export function moveInto(id: string, targetGroup: string | null, index: number, ds: DocState | null = cur()) {
  if (!ds) return;
  const l = findLayer(ds.doc, id);
  if (!l) return;
  if (targetGroup && (targetGroup === id || (l.type === 'group' && [...walk(l.children)].some(([c]) => c.id === targetGroup)))) return;
  const src = containerOf(ds.doc, id)!;
  const si = src.indexOf(l);
  src.splice(si, 1);
  const dst = targetGroup ? (findLayer(ds.doc, targetGroup) as GroupLayer).children : ds.doc.layers;
  if (src === dst && si < index) index--;
  dst.splice(Math.max(0, Math.min(dst.length, index)), 0, l);
  refreshGroups(ds.doc.layers);
  touch();
}

export function groupSelected(name = 'Group', ds: DocState | null = cur()) {
  if (!ds) return null;
  const sel = selectedLayers(ds);
  if (!sel.length) return null;
  // Keep original stacking order inside the group; place the group where the topmost one was.
  const ordered: Layer[] = topLevel(sel, ds);
  const top = ordered[ordered.length - 1];
  const arr = containerOf(ds.doc, top.id)!;
  const below = arr.slice(0, arr.indexOf(top)).filter((l) => !sel.includes(l)).length;
  removeLayers(ordered.map((l) => l.id), ds, false);
  const g: GroupLayer = { ...base(name, 0, 0, 1, 1), type: 'group', children: ordered, expanded: true };
  arr.splice(below, 0, g);
  refreshGroups(ds.doc.layers);
  ds.selected = [g.id];
  commit('Group Layers', ds);
  return g;
}

/** Selected layers in stacking order, without any whose ancestor group is also selected. */
export function topLevel(sel: Layer[], ds: DocState): Layer[] {
  const out: Layer[] = [];
  const visit = (arr: Layer[]) => {
    for (const l of arr) {
      if (sel.includes(l)) out.push(l);
      else if (l.type === 'group') visit(l.children);
    }
  };
  visit(ds.doc.layers);
  return out;
}

export function ungroup(ds: DocState | null = cur()) {
  if (!ds) return;
  const groups = selectedLayers(ds).filter((l): l is GroupLayer => l.type === 'group');
  if (!groups.length) return;
  const ids: string[] = [];
  for (const g of groups) {
    const arr = containerOf(ds.doc, g.id)!;
    const i = arr.indexOf(g);
    arr.splice(i, 1, ...g.children);
    ids.push(...g.children.map((c) => c.id));
  }
  ds.selected = ids;
  commit('Ungroup', ds);
}

/** Convert any layer into a raster layer covering its bounds (effects baked in). */
export function rasterize(l: Layer, ds: DocState | null = cur()): RasterLayer | null {
  if (!ds) return null;
  if (l.type === 'raster') return l;
  // Render into a canvas cropped to the layer's bounds, padded for strokes and effects.
  const fx = l.effects;
  const fxPad = Math.max(fx?.shadow?.enabled ? fx.shadow.blur * 1.5 + Math.max(Math.abs(fx.shadow.x), Math.abs(fx.shadow.y)) : 0, fx?.glow?.enabled ? fx.glow.blur * 1.5 : 0);
  const strokePad = (l as ShapeLayer).stroke?.width ?? 0;
  const pad = Math.ceil(2 + fxPad + strokePad);
  const b = bounds(l);
  const x0 = Math.floor(b.x - pad), y0 = Math.floor(b.y - pad);
  const w = Math.min(16000, Math.ceil(b.w + pad * 2)), h = Math.min(16000, Math.ceil(b.h + pad * 2));
  const c = makeCanvas(w, h), x = ctx2d(c);
  x.translate(-x0, -y0);
  drawLayer(x, { ...l, visible: true, opacity: 1, blend: 'normal' } as Layer);
  const r = newRaster(ds, l.name, c, x0, y0);
  Object.assign(r, { id: l.id, visible: l.visible, locked: l.locked, opacity: l.opacity, blend: l.blend });
  const arr = containerOf(ds.doc, l.id)!;
  arr[arr.indexOf(l)] = r;
  touch();
  return r;
}

/** Ensure the layer is raster and owns its pixels (copy-on-write before editing). */
export function editablePixels(l: Layer | null, ds: DocState | null = cur()): RasterLayer | null {
  if (!l || !ds) return null;
  if (l.locked) { toast('Layer is locked', 'error'); return null; }
  if (l.type === 'adjust') { toast('Adjustment layers have no pixels: paint on its mask or another layer', 'error'); return null; }
  let r = l as RasterLayer;
  if (l.type !== 'raster') {
    r = rasterize(l, ds)!;
    toast(`"${l.name}" was rasterized`);
  }
  r.canvas = cloneCanvas(r.canvas);
  return r;
}

export function mergeDown(ds: DocState | null = cur()) {
  if (!ds) return;
  const top = activeLayer(ds);
  if (!top) return;
  const arr = containerOf(ds.doc, top.id)!;
  const i = arr.indexOf(top);
  const below = arr[i - 1];
  if (!below) return toast('No layer below to merge with', 'error');
  const c = makeCanvas(ds.doc.width, ds.doc.height), x = ctx2d(c);
  // drawLayers (not drawLayer) so an adjustment layer on top is baked into the merge.
  drawLayers(x, [{ ...below, visible: true, clip: undefined } as Layer, { ...top, visible: true } as Layer]);
  const r = newRaster(ds, below.name, c);
  arr.splice(i - 1, 2, r);
  ds.selected = [r.id];
  commit('Merge Down', ds);
}

export function flattenImage(ds: DocState | null = cur()) {
  if (!ds) return;
  const c = makeCanvas(ds.doc.width, ds.doc.height), x = ctx2d(c);
  drawLayers(x, ds.doc.layers);
  const r = newRaster(ds, 'Background', c);
  ds.doc.layers = [r];
  ds.selected = [r.id];
  commit('Flatten Image', ds);
}

// Layer masks and clipping masks

export type MaskMode = 'reveal' | 'hide' | 'selection' | 'hideSelection';

export function addMask(l: Layer, mode: MaskMode, ds: DocState | null = cur()) {
  if (!ds) return;
  const c = makeCanvas(ds.doc.width, ds.doc.height), x = ctx2d(c);
  if (mode === 'reveal') x.fillRect(0, 0, c.width, c.height);
  if (mode === 'selection' && ds.mask) x.drawImage(ds.mask, 0, 0);
  if (mode === 'hideSelection') {
    x.fillRect(0, 0, c.width, c.height);
    if (ds.mask) { x.globalCompositeOperation = 'destination-out'; x.drawImage(ds.mask, 0, 0); }
  }
  l.mask = { canvas: c, x: 0, y: 0, enabled: true };
  touch();
}

/** Bake the mask into the layer's pixels (rasterizes vector layers). */
export function applyMask(l: Layer, ds: DocState | null = cur()) {
  if (!ds || !l.mask) return;
  const m = l.mask;
  delete l.mask;
  const r = l.type === 'raster' ? l : rasterize(l, ds);
  if (!r) return;
  const c = cloneCanvas(r.canvas), x = ctx2d(c);
  x.globalCompositeOperation = 'destination-in';
  x.setTransform(layerMatrix(r).scaleSelf(r.w / c.width, r.h / c.height).inverse());
  x.drawImage(m.canvas, m.x, m.y);
  r.canvas = c;
  touch();
}

export function setClip(l: Layer, clip: boolean) {
  l.clip = clip || undefined;
  touch();
}

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

export function align(layers: Layer[], mode: AlignMode, to: 'selection' | 'canvas', ds: DocState | null = cur()) {
  if (!ds || !layers.length) return;
  const ref: Rect = to === 'canvas' || layers.length === 1 ? { x: 0, y: 0, w: ds.doc.width, h: ds.doc.height } : unionRects(layers.map(bounds))!;
  for (const l of layers) {
    const b = bounds(l);
    let dx = 0, dy = 0;
    if (mode === 'left') dx = ref.x - b.x;
    if (mode === 'hcenter') dx = ref.x + ref.w / 2 - (b.x + b.w / 2);
    if (mode === 'right') dx = ref.x + ref.w - (b.x + b.w);
    if (mode === 'top') dy = ref.y - b.y;
    if (mode === 'vcenter') dy = ref.y + ref.h / 2 - (b.y + b.h / 2);
    if (mode === 'bottom') dy = ref.y + ref.h - (b.y + b.h);
    moveLayer(l, dx, dy);
  }
  refreshGroups(ds.doc.layers);
  touch();
}

export function distribute(layers: Layer[], axis: 'h' | 'v') {
  if (layers.length < 3) return;
  const key = axis === 'h' ? 'x' : 'y', size = axis === 'h' ? 'w' : 'h';
  const items = layers.map((l) => ({ l, b: bounds(l) })).sort((a, b) => a.b[key] - b.b[key]);
  const first = items[0].b, last = items[items.length - 1].b;
  const total = items.reduce((s, i) => s + i.b[size], 0);
  const gap = (last[key] + last[size] - first[key] - total) / (items.length - 1);
  let pos = first[key];
  for (const it of items) {
    const d = pos - it.b[key];
    moveLayer(it.l, key === 'x' ? d : 0, key === 'y' ? d : 0);
    pos += it.b[size] + gap;
  }
  touch();
}

/** Adjustment layers always cover the whole document. */
export function fitAdjustments(ds: DocState) {
  for (const [l] of walk(ds.doc.layers)) if (l.type === 'adjust') Object.assign(l, { x: 0, y: 0, w: ds.doc.width, h: ds.doc.height });
}

export function cropDoc(r: Rect, ds: DocState | null = cur()) {
  if (!ds) return;
  const x = Math.round(r.x), y = Math.round(r.y);
  for (const l of ds.doc.layers) moveLayer(l, -x, -y);
  ds.doc.width = Math.max(1, Math.round(r.w));
  ds.doc.height = Math.max(1, Math.round(r.h));
  ds.mask = null;
  fitAdjustments(ds);
  commit('Crop', ds);
}

export function resizeCanvas(w: number, h: number, anchor: [number, number] = [0.5, 0.5], ds: DocState | null = cur()) {
  if (!ds) return;
  w = Math.max(1, w); h = Math.max(1, h);
  const dx = (w - ds.doc.width) * anchor[0], dy = (h - ds.doc.height) * anchor[1];
  for (const l of ds.doc.layers) moveLayer(l, dx, dy);
  ds.doc.width = Math.max(1, Math.round(w)); ds.doc.height = Math.max(1, Math.round(h));
  ds.mask = null;
  fitAdjustments(ds);
  commit('Canvas Size', ds);
}

export function resizeImage(w: number, h: number, ds: DocState | null = cur()) {
  if (!ds) return;
  w = Math.max(1, w); h = Math.max(1, h);
  const sx = w / ds.doc.width, sy = h / ds.doc.height;
  for (const l of ds.doc.layers) scaleLayer(l, sx, sy, 0, 0);
  ds.doc.width = Math.max(1, Math.round(w)); ds.doc.height = Math.max(1, Math.round(h));
  ds.mask = null;
  fitAdjustments(ds);
  commit('Image Size', ds);
}

/** Rotate or flip the whole canvas. */
export function transformCanvas(kind: 'cw' | 'ccw' | '180' | 'flipH' | 'flipV', ds: DocState | null = cur()) {
  if (!ds) return;
  const W = ds.doc.width, H = ds.doc.height;
  const M = {
    cw: [0, 1, -1, 0, H, 0], ccw: [0, -1, 1, 0, 0, W], '180': [-1, 0, 0, -1, W, H], flipH: [-1, 0, 0, 1, W, 0], flipV: [1, 0, 0, -1, 0, H],
  }[kind];
  const nw = kind === 'cw' || kind === 'ccw' ? H : W, nh = kind === 'cw' || kind === 'ccw' ? W : H;
  const mapLayer = (l: Layer) => {
    if (l.mask) {
      const c = makeCanvas(nw, nh), x = ctx2d(c);
      x.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
      x.drawImage(l.mask.canvas, l.mask.x, l.mask.y);
      l.mask = { ...l.mask, canvas: c, x: 0, y: 0 };
    }
    if (l.type === 'group') { l.children.forEach(mapLayer); return; }
    const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    let ncx = cx, ncy = cy;
    if (kind === 'cw') { ncx = H - cy; ncy = cx; l.rotation += 90; }
    if (kind === 'ccw') { ncx = cy; ncy = W - cx; l.rotation -= 90; }
    if (kind === '180') { ncx = W - cx; ncy = H - cy; l.rotation += 180; }
    if (kind === 'flipH' || kind === 'flipV') {
      if (kind === 'flipH') ncx = W - cx; else ncy = H - cy;
      l.rotation = -l.rotation;
      flipContent(l, kind === 'flipH');
    }
    l.rotation = ((l.rotation % 360) + 360) % 360;
    l.x = ncx - l.w / 2; l.y = ncy - l.h / 2;
  };
  ds.doc.layers.forEach(mapLayer);
  if (kind === 'cw' || kind === 'ccw') { ds.doc.width = H; ds.doc.height = W; }
  ds.mask = null;
  fitAdjustments(ds);
  commit(kind.startsWith('flip') ? 'Flip Canvas' : 'Rotate Canvas', ds);
}

/** Flip layers on screen around a pivot (Edit > Flip): mirrors positions, rotation, content and masks. */
export function flipLayers(layers: Layer[], horizontal: boolean, px: number, py: number) {
  const flipOne = (l: Layer) => {
    if (l.mask) {
      const m = l.mask, c = makeCanvas(m.canvas.width, m.canvas.height), x = ctx2d(c);
      if (horizontal) { x.translate(c.width, 0); x.scale(-1, 1); } else { x.translate(0, c.height); x.scale(1, -1); }
      x.drawImage(m.canvas, 0, 0);
      l.mask = { ...m, canvas: c, x: horizontal ? 2 * px - m.x - c.width : m.x, y: horizontal ? m.y : 2 * py - m.y - c.height };
    }
    if (l.type === 'group') { l.children.forEach(flipOne); return; }
    const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    if (horizontal) l.x = 2 * px - cx - l.w / 2; else l.y = 2 * py - cy - l.h / 2;
    l.rotation = (360 - l.rotation) % 360;
    flipContent(l, horizontal);
  };
  layers.forEach(flipOne);
}

/** Mirror a layer's content in place within its box. */
export function flipContent(l: Layer, horizontal: boolean) {
  if (l.type === 'raster') {
    const c = makeCanvas(l.canvas.width, l.canvas.height), x = ctx2d(c);
    if (horizontal) { x.translate(c.width, 0); x.scale(-1, 1); } else { x.translate(0, c.height); x.scale(1, -1); }
    x.drawImage(l.canvas, 0, 0);
    l.canvas = c;
  } else if (l.type === 'shape') {
    if (l.shape !== 'path') {
      if (l.shape === 'rect' || l.shape === 'ellipse') return;
      // Polygons/stars: convert to path first so the flip is exact.
      Object.assign(l, toPathProps(l));
    }
    const W = l.nw ?? l.w, H = l.nh ?? l.h;
    l.paths = (l.paths ?? []).map((sp) => ({
      closed: sp.closed,
      nodes: sp.nodes.map((n) => horizontal
        ? { ...n, x: W - n.x, ix: W - n.ix, ox: W - n.ox }
        : { ...n, y: H - n.y, iy: H - n.iy, oy: H - n.oy }),
    }));
  } else if (l.type === 'group') l.children.forEach((c) => flipContent(c, horizontal));
}

export function toPathProps(l: ShapeLayer): Partial<ShapeLayer> {
  return { shape: 'path', paths: shapeToPaths(l), nw: l.w, nh: l.h };
}

/** Make a gradient or solid paint from loose input (used by MCP). */
export function toPaint(v: any): Paint | null {
  if (v == null || v === 'none' || v === false) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && Array.isArray(v.stops)) {
    return { type: v.type === 'radial' ? 'radial' : 'linear', angle: Number(v.angle ?? 90), stops: v.stops.map((s: any, i: number) => ({ offset: Number(s.offset ?? i / Math.max(1, v.stops.length - 1)), color: String(s.color) })) };
  }
  return null;
}

export function toStroke(v: any, width?: number): Stroke | null {
  if (v == null || v === 'none' || v === false) return null;
  if (typeof v === 'string' || Array.isArray(v?.stops)) return { paint: toPaint(v)!, width: width ?? 2, join: 'round', cap: 'round' };
  if (typeof v === 'object') return { paint: toPaint(v.paint ?? v.color ?? '#000')!, width: Number(v.width ?? width ?? 2), dash: v.dash, cap: v.cap ?? 'round', join: v.join ?? 'round' };
  return null;
}

export const layerSummary = (l: Layer): any => {
  const o: any = { id: l.id, name: l.name, type: l.type, x: Math.round(l.x), y: Math.round(l.y), width: Math.round(l.w), height: Math.round(l.h) };
  if (l.rotation) o.rotation = l.rotation;
  if (!l.visible) o.visible = false;
  if (l.locked) o.locked = true;
  if (l.opacity !== 1) o.opacity = l.opacity;
  if (l.blend !== 'normal') o.blend = l.blend;
  if (l.effects) o.effects = l.effects;
  if (l.mask) o.mask = { enabled: l.mask.enabled };
  if (l.clip) o.clipped = true;
  if (l.type === 'shape') Object.assign(o, { shape: l.shape, fill: l.fill, stroke: l.stroke, radius: l.radius, sides: l.sides });
  if (l.type === 'text') Object.assign(o, { text: l.text, fontFamily: l.family, fontSize: l.size, fontWeight: l.weight, color: l.fill, align: l.align });
  if (l.type === 'group') o.children = l.children.map(layerSummary).reverse();
  return o;
};

export function layerAt(x: number, y: number, ds: DocState | null = cur(), deep = true): Layer | null {
  if (!ds) return null;
  const hit = (arr: Layer[]): Layer | null => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const l = arr[i];
      if (!l.visible || l.type === 'adjust') continue;
      if (l.type === 'group') {
        const h = hit(l.children);
        if (h) return deep ? h : l;
        continue;
      }
      const p = layerMatrix(l).inverse().transformPoint({ x, y });
      const pad = l.type === 'shape' && l.stroke ? l.stroke.width / 2 + 2 : 2;
      if (p.x < -pad || p.y < -pad || p.x > l.w + pad || p.y > l.h + pad) continue;
      if (l.type === 'raster') {
        const px = Math.floor((p.x / l.w) * l.canvas.width), py = Math.floor((p.y / l.h) * l.canvas.height);
        if (px < 0 || py < 0 || px >= l.canvas.width || py >= l.canvas.height) continue;
        const a = l.canvas.getContext('2d')!.getImageData(px, py, 1, 1).data[3];
        if (a < 10) continue;
      }
      if (l.type === 'shape' && (l.shape === 'ellipse' || l.shape === 'path' || l.shape === 'star' || l.shape === 'polygon') && !l.stroke) {
        // Precise hit-test on fill geometry.
        const t = ctx2d(makeCanvas(1, 1));
        if (!t.isPointInPath(shapePath2D(l), p.x, p.y, l.fillRule ?? 'nonzero')) continue;
      }
      return l;
    }
    return null;
  };
  return hit(ds.doc.layers);
}

