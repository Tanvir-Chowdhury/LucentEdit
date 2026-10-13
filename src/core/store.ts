import { signal } from '@preact/signals';
import { Component } from 'preact';

// @preact/signals patches shouldComponentUpdate to skip components whose props are
// reference-equal. Layers are mutated in place, so restore Preact's normal behavior.
delete (Component.prototype as any).shouldComponentUpdate;
import type { Doc, DocState, Snapshot, Layer } from './types';
import { cloneLayers, uid, refreshGroups, findLayer } from './util';

// Global editor state. Documents are plain mutable objects; `tick` tells the UI something
// changed and `paint` asks the viewport to repaint (cheap, used during drags).

export const docs = signal<DocState[]>([]);
export const activeIndex = signal(-1);
export const tick = signal(0);
export const paint = signal(0);

export const HISTORY_LIMIT = 40;

/** True while the user drags on the canvas; agent calls wait so they never land mid-stroke. */
export const interaction = { active: false };
export async function whenIdle() {
  // Capped so a lost pointer-up can never block agents forever.
  for (let t = 0; interaction.active && t < 500; t++) await new Promise((r) => setTimeout(r, 40));
}

/** Subscribe a component to document changes (a bare `tick.value;` can be stripped by the bundler). */
export const useTick = () => tick.value;
export const usePaint = () => paint.value + tick.value;

export function touch(ui = true) {
  paint.value++;
  if (ui) tick.value++;
}

// Reading `tick` here subscribes any component that looks at the current document to changes.
// (@preact/signals skips re-rendering signal-reading children when their props are unchanged.)
export const cur = (): DocState | null => (tick.value >= 0 ? docs.value[activeIndex.value] ?? null : null);
export const curDoc = (): Doc | null => cur()?.doc ?? null;

export function snapshotOf(ds: DocState, label: string): Snapshot {
  const d = ds.doc;
  return { label, name: d.name, width: d.width, height: d.height, background: d.background, layers: cloneLayers(d.layers), selected: [...ds.selected] };
}

export function openDocState(doc: Doc, label = 'New Document'): DocState {
  const ds: DocState = { doc, history: [], hIndex: -1, selected: [], mask: null, view: { zoom: 1, panX: 0, panY: 0 }, dirty: false };
  refreshGroups(doc.layers);
  ds.history.push(snapshotOf(ds, label));
  ds.hIndex = 0;
  const top = doc.layers[doc.layers.length - 1];
  if (top) ds.selected = [top.id];
  docs.value = [...docs.value, ds];
  activeIndex.value = docs.value.length - 1;
  needsFit.value = true;
  touch();
  return ds;
}

export function createDoc(opts: { name?: string; width: number; height: number; background?: string | null }): Doc {
  return {
    id: uid('d'),
    name: opts.name || `Untitled-${docs.value.length + 1}`,
    width: Math.max(1, Math.round(opts.width)),
    height: Math.max(1, Math.round(opts.height)),
    background: opts.background === undefined ? '#ffffff' : opts.background,
    layers: [],
  };
}

export function closeDoc(i: number) {
  const list = docs.value.filter((_, j) => j !== i);
  docs.value = list;
  if (activeIndex.value >= list.length) activeIndex.value = list.length - 1;
  else if (i < activeIndex.value) activeIndex.value--;
  touch();
}

/** Record the current state as a history step. Call after every finished user/agent action. */
export function commit(label: string, ds: DocState | null = cur()) {
  if (!ds) return;
  refreshGroups(ds.doc.layers);
  ds.history = ds.history.slice(0, ds.hIndex + 1);
  ds.history.push(snapshotOf(ds, label));
  if (ds.history.length > HISTORY_LIMIT) ds.history.shift();
  ds.hIndex = ds.history.length - 1;
  ds.dirty = true;
  touch();
}

function restore(ds: DocState, s: Snapshot) {
  Object.assign(ds.doc, { name: s.name, width: s.width, height: s.height, background: s.background, layers: cloneLayers(s.layers) });
  ds.selected = s.selected.filter((id) => findLayer(ds.doc, id));
  touch();
}

export function jumpTo(i: number, ds: DocState | null = cur()) {
  if (!ds || i < 0 || i >= ds.history.length) return;
  ds.hIndex = i;
  restore(ds, ds.history[i]);
  ds.dirty = true;
}
export const undo = () => { const ds = cur(); if (ds) jumpTo(ds.hIndex - 1, ds); };
export const redo = () => { const ds = cur(); if (ds) jumpTo(ds.hIndex + 1, ds); };

export function selectedLayers(ds: DocState | null = cur()): Layer[] {
  if (!ds) return [];
  return ds.selected.map((id) => findLayer(ds.doc, id)).filter(Boolean) as Layer[];
}
export const activeLayer = (ds: DocState | null = cur()): Layer | null => {
  const s = selectedLayers(ds);
  return s[s.length - 1] ?? null;
};

export function select(ids: string[], ds: DocState | null = cur()) {
  if (!ds) return;
  ds.selected = ids;
  touch();
}

// Tool & UI settings

export type ToolId =
  | 'move' | 'marquee' | 'lasso' | 'wand' | 'crop' | 'eyedropper' | 'brush' | 'eraser'
  | 'bucket' | 'gradient' | 'text' | 'pen' | 'direct' | 'shape' | 'hand' | 'zoom';

export const tool = signal<ToolId>('move');
export const fg = signal('#111827');
export const bg = signal('#ffffff');
export const strokeColor = signal('#111827');
export const needsFit = signal(false);
/** Layer id whose mask (not pixels) the brush and eraser edit. */
export const maskTarget = signal<string | null>(null);

export const brush = signal({ size: 24, hardness: 0.8, opacity: 1, flow: 1 });
export const marquee = signal<{ shape: 'rect' | 'ellipse' }>({ shape: 'rect' });
export const wand = signal({ tolerance: 32, contiguous: true });
export const bucket = signal({ tolerance: 32, contiguous: true });
export const gradientOpts = signal<{ type: 'linear' | 'radial' }>({ type: 'linear' });
export const shapeOpts = signal({
  shape: 'rect' as 'rect' | 'ellipse' | 'polygon' | 'star' | 'line',
  fill: true, stroke: false, strokeWidth: 2, radius: 0, sides: 6, points: 5, inner: 0.45,
});
export const textOpts = signal({ family: 'Inter Variable', size: 48, weight: 600, italic: false, align: 'left' as CanvasTextAlign });
export const viewOpts = signal({ snap: true, grid: false, autoSelect: true, rulers: true });
export const cursorPos = signal<{ x: number; y: number } | null>(null);
export const mcpStatus = signal<{ port: number; active: number; last?: string; enabled: boolean }>({ port: 0, active: 0, enabled: false });

export type Toast = { id: number; text: string; kind: 'info' | 'error' | 'success' };
export const toasts = signal<Toast[]>([]);
let toastId = 0;
export function toast(text: string, kind: Toast['kind'] = 'info') {
  const t = { id: ++toastId, text, kind };
  toasts.value = [...toasts.value, t];
  setTimeout(() => (toasts.value = toasts.value.filter((x) => x.id !== t.id)), kind === 'error' ? 5000 : 2800);
}

export type DialogState = { kind: string; data?: any } | null;
export const dialog = signal<DialogState>(null);
