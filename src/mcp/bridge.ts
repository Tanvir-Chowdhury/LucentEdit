import type { DocState, Layer, GroupLayer } from '../core/types';
import { touch } from '../core/store';
import { findLayer, containerOf, duplicateLayer } from '../core/util';
import { groupSelected, ungroup, moveLayer } from '../core/ops';

// Store and op re-exports for the MCP server, plus id-based helpers.

export { cur, docs, activeIndex, commit, touch, undo, redo, createDoc, openDocState, mcpStatus } from '../core/store';
export {
  newShape, newPath, newText, newRaster, addLayer, removeLayers, setProps, reorder, align, distribute, layerSummary,
  toPaint, toStroke, resizeCanvas, resizeImage,
} from '../core/ops';

export const findLayerIn = findLayer;

export function duplicateLayerOp(ds: DocState, id: string, dx: number, dy: number): Layer {
  const l = findLayer(ds.doc, id);
  if (!l) throw new Error(`Layer "${id}" not found`);
  const c = duplicateLayer(l);
  c.name = `${l.name} copy`;
  moveLayer(c, dx, dy);
  const arr = containerOf(ds.doc, id)!;
  arr.splice(arr.indexOf(l) + 1, 0, c);
  ds.selected = [c.id];
  touch();
  return c;
}

export function groupIds(ds: DocState, ids: string[], name: string): GroupLayer | null {
  ds.selected = ids.filter((id) => findLayer(ds.doc, id));
  return groupSelected(name, ds);
}

export function ungroupId(ds: DocState, id: string) {
  const g = findLayer(ds.doc, id);
  if (!g || g.type !== 'group') throw new Error('Not a group');
  ds.selected = [id];
  ungroup(ds);
}
