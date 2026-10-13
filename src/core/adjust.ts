import type { DocState, AdjustLayer } from './types';
import { renderHooks } from './render';
import { FILTERS, filterById, resolveParams } from './filters';
import { uid } from './util';
import { addLayer } from './ops';

// Adjustment layers: non-destructive point filters applied to the layers below.

renderHooks.adjust = (img, id, params) => {
  const f = filterById(id);
  if (f) f.run(img, resolveParams(f, params));
};

/** Filters that only depend on each pixel's own color, so they can run live at any zoom. */
export const adjustableFilters = () => FILTERS.filter((f) => (f as any).point);

export function newAdjustment(ds: DocState, filterId: string, params: Record<string, any> = {}): AdjustLayer {
  const f = filterById(filterId);
  if (!f || !(f as any).point) throw new Error(`"${filterId}" can't be an adjustment layer`);
  const l: AdjustLayer = {
    id: uid(), name: f.name, type: 'adjust', filter: f.id, params: resolveParams(f, params),
    visible: true, locked: false, opacity: 1, blend: 'normal', x: 0, y: 0, w: ds.doc.width, h: ds.doc.height, rotation: 0,
  };
  addLayer(l, ds);
  return l;
}
