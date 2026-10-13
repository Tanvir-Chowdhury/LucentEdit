import type { DocState, Layer } from './types';
import { ctx2d, makeCanvas } from './util';
import { editablePixels } from './ops';
import { compositeMasked } from './selection';
import { resolveParams, type FilterDef } from './filters-algo';

// Destructive pixel filters (Photoshop "Image > Adjustments" and "Filter" menus).
// The algorithms and the FILTERS registry live in filters-algo.ts (DOM-free); this module adds the canvas plumbing.
export * from './filters-algo';

/** Run a filter on a copy of the pixels and return the result canvas. */
export function filteredCopy(src: HTMLCanvasElement, f: FilterDef, params: Record<string, any>): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height), x = ctx2d(c);
  x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height);
  f.run(img, resolveParams(f, params));
  x.putImageData(img, 0, 0);
  return c;
}

/** Apply a filter to a layer (rasterizing it if needed), limited to the pixel selection. */
export function applyFilter(ds: DocState, layer: Layer, f: FilterDef, params: Record<string, any>, original?: HTMLCanvasElement) {
  const r = editablePixels(layer, ds);
  if (!r) return null;
  const srcPixels = original ?? r.canvas;
  const out = filteredCopy(srcPixels, f, params);
  if (!ds.mask) { r.canvas = out; return r; }
  const base = makeCanvas(srcPixels.width, srcPixels.height);
  ctx2d(base).drawImage(srcPixels, 0, 0);
  r.canvas = base;
  compositeMasked(ds, r, out);
  return r;
}
