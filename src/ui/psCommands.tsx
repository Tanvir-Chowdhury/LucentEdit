import { useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { Layer, RasterLayer, BlendMode } from '../core/types';
import { BLEND_MODES } from '../core/types';
import {
  cur, commit, touch, activeLayer, selectedLayers, select, dialog, toast, fg, bg, docs, activeIndex, openDocState, createDoc,
  jumpTo, viewOpts, brush, tool, HISTORY_LIMIT,
} from '../core/store';
import { newRaster, newShape, addLayer, editablePixels } from '../core/ops';
import { flatten, drawLayers } from '../core/render';
import { maskBounds, maskEdges, compositeMasked } from '../core/selection';
import { makeCanvas, ctx2d, walk, cloneLayers, findLayer, uid } from '../core/util';
import { FILTERS, filterById, applyFilter } from '../core/filters';
import { newAdjustment } from '../core/adjust';
import { exportBytes, docFromFile } from '../core/io';
import { setClipboard, fitView, saveDoc, quickExport, lastFilter } from './commands';
import type { Command } from './commands';
import { NumField, Swatch } from './controls';
import { Icon } from './icons';

// Photoshop commands that go beyond the basics: Edit > Fill/Stroke, Layer via Copy/Cut, Merge Visible,
// adjustment and fill layers, guides, screen modes, layer navigation and panel visibility.

/** UI chrome state: Tab hides panels, F cycles screen modes, Window menu picks panel tabs. */
export const ui = signal({ panels: true, screen: 0 as 0 | 1 | 2, topTab: 'properties', bottomTab: 'layers' });

const hasDoc = () => !!cur();
const hasSel = () => !!cur()?.selected.length;
const hasMask = () => !!cur()?.mask;

function layerViaCopy(cut: boolean) {
  const ds = cur();
  const l = activeLayer(ds);
  if (!ds || !l) return;
  if (!ds.mask) {
    // Without a selection, Ctrl+J duplicates the layer.
    if (cut) return toast('Make a selection first', 'error');
    import('../core/ops').then(({ duplicateSelected }) => duplicateSelected(ds));
    return;
  }
  const src = makeCanvas(ds.doc.width, ds.doc.height);
  drawLayers(ctx2d(src), [{ ...l, visible: true, opacity: 1, blend: 'normal' } as Layer]);
  const x = ctx2d(src);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(ds.mask, 0, 0);
  const b = maskBounds(ds);
  if (!b) return;
  const out = makeCanvas(b.w, b.h);
  ctx2d(out).drawImage(src, -b.x, -b.y);
  if (cut) {
    const r = editablePixels(l, ds);
    if (!r) return;
    const c = makeCanvas(r.canvas.width, r.canvas.height);
    ctx2d(c).fillRect(0, 0, c.width, c.height);
    compositeMasked(ds, r, c, 'destination-out');
  }
  addLayer(newRaster(ds, cut ? 'Layer via Cut' : 'Layer via Copy', out, b.x, b.y), ds);
  commit(cut ? 'Layer via Cut' : 'Layer via Copy');
}

function copyMerged() {
  const ds = cur();
  if (!ds) return;
  const f = flatten(ds.doc, 1, false);
  const b = maskBounds(ds) ?? { x: 0, y: 0, w: ds.doc.width, h: ds.doc.height };
  const out = makeCanvas(b.w, b.h), x = ctx2d(out);
  x.drawImage(f, -b.x, -b.y);
  if (ds.mask) { x.globalCompositeOperation = 'destination-in'; x.drawImage(ds.mask, -b.x, -b.y); }
  setClipboard([newRaster(ds, 'Merged', out, b.x, b.y)]);
  toast('Copied merged');
}

/** Merge Visible (Ctrl+Shift+E) or Stamp Visible (Ctrl+Alt+Shift+E: merged copy on a new layer). */
function mergeVisible(stamp: boolean) {
  const ds = cur();
  if (!ds) return;
  const f = flatten(ds.doc, 1, false);
  const r = newRaster(ds, stamp ? 'Stamp Visible' : 'Merged', f);
  if (stamp) { addLayer(r, ds); commit('Stamp Visible'); return; }
  const hidden = ds.doc.layers.filter((l) => !l.visible);
  ds.doc.layers = [...hidden, r];
  ds.selected = [r.id];
  commit('Merge Visible');
}

function newFillLayer(kind: 'solid' | 'gradient') {
  const ds = cur();
  if (!ds) return;
  const fill = kind === 'solid' ? fg.value : { type: 'linear' as const, angle: 90, stops: [{ offset: 0, color: fg.value }, { offset: 1, color: bg.value }] };
  const l = newShape({ shape: 'rect', x: 0, y: 0, w: ds.doc.width, h: ds.doc.height, fill, name: kind === 'solid' ? 'Color Fill' : 'Gradient Fill' });
  addLayer(l, ds);
  if (ds.mask) import('../core/ops').then(({ addMask }) => { addMask(l, 'selection', ds); commit('New Fill Layer'); });
  else commit('New Fill Layer');
}

function adjustmentLayer(id: string) {
  const ds = cur();
  if (!ds) return;
  try {
    const l = newAdjustment(ds, id);
    if (ds.mask) import('../core/ops').then(({ addMask }) => { addMask(l, 'selection', ds); commit(`${l.name} Layer`); });
    else commit(`${l.name} Layer`);
    ui.value = { ...ui.value, topTab: 'properties' };
  } catch (e: any) { toast(e.message, 'error'); }
}

/** Photoshop layer navigation: Alt+[ / Alt+] select below/above; Alt+, / Alt+. bottom/top. */
function selectAdjacent(dir: 'up' | 'down' | 'top' | 'bottom', extend = false) {
  const ds = cur();
  if (!ds) return;
  const flat = [...walk(ds.doc.layers)].map(([l]) => l);
  if (!flat.length) return;
  const curIdx = flat.findIndex((l) => l.id === ds.selected[ds.selected.length - 1]);
  let i = dir === 'top' ? flat.length - 1 : dir === 'bottom' ? 0 : curIdx < 0 ? flat.length - 1 : curIdx + (dir === 'up' ? 1 : -1);
  i = Math.max(0, Math.min(flat.length - 1, i));
  const id = flat[i].id;
  select(extend ? [...new Set([...ds.selected, id])] : [id]);
}

function toggleHide() {
  const ds = cur();
  if (!ds) return;
  const sel = selectedLayers(ds);
  const show = sel.every((l) => !l.visible);
  sel.forEach((l) => (l.visible = show));
  commit(show ? 'Show Layers' : 'Hide Layers');
}

function toggleLock() {
  const ds = cur();
  if (!ds) return;
  const sel = selectedLayers(ds);
  const lock = !sel.every((l) => l.locked);
  sel.forEach((l) => (l.locked = lock));
  commit(lock ? 'Lock Layers' : 'Unlock Layers');
}

function cycleBlend(dir: 1 | -1) {
  const ds = cur();
  const l = activeLayer(ds);
  if (!ds || !l) return;
  const i = BLEND_MODES.indexOf(l.blend);
  l.blend = BLEND_MODES[(i + dir + BLEND_MODES.length) % BLEND_MODES.length] as BlendMode;
  toast(`Blend mode: ${l.blend}`);
  commit('Blend Mode');
}

/** Number keys: opacity for painting tools, layer opacity otherwise (1 = 10% ... 0 = 100%). */
export function numberKey(n: number, shift: boolean) {
  const v = n === 0 ? 1 : n / 10;
  const painting = ['spotHeal', 'brush', 'eraser', 'pencil', 'cloneStamp', 'healBrush', 'historyBrush', 'dodge', 'burn', 'sponge', 'blur', 'sharpen', 'smudge', 'colorReplace', 'bgEraser'].includes(tool.value);
  if (painting) {
    brush.value = shift ? { ...brush.value, flow: v } : { ...brush.value, opacity: v };
    toast(`${shift ? 'Flow' : 'Opacity'} ${Math.round(v * 100)}%`);
    return;
  }
  const sel = selectedLayers();
  if (!sel.length) return;
  sel.forEach((l) => (l.opacity = v));
  commit('Opacity');
}

function duplicateDocument() {
  const ds = cur();
  if (!ds) return;
  const d = createDoc({ name: `${ds.doc.name} copy`, width: ds.doc.width, height: ds.doc.height, background: ds.doc.background });
  d.layers = cloneLayers(ds.doc.layers);
  // Fresh ids so the copy is independent; raster canvases are copy-on-write anyway.
  for (const [l] of walk(d.layers)) l.id = uid();
  d.guides = ds.doc.guides && { v: [...ds.doc.guides.v], h: [...ds.doc.guides.h] };
  openDocState(d, 'Duplicate');
}

async function revert() {
  const ds = cur();
  if (!ds) return;
  if (ds.doc.path) {
    try {
      const { readPath } = await import('../core/io');
      const d = await docFromFile({ name: ds.doc.path.split(/[\\/]/).pop()!, path: ds.doc.path, bytes: await readPath(ds.doc.path) });
      Object.assign(ds.doc, { ...d, id: ds.doc.id });
      ds.mask = null;
      commit('Revert');
      return;
    } catch (e: any) { return toast(`Couldn't revert: ${e.message}`, 'error'); }
  }
  jumpTo(0, ds);
  commit('Revert');
}

/** Image > Mode > Grayscale: desaturate every pixel layer and vector colors. */
function toGrayscale() {
  const ds = cur();
  if (!ds) return;
  const gray = (c: string) => {
    const x = ctx2d(makeCanvas(1, 1));
    x.fillStyle = c; x.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = x.getImageData(0, 0, 1, 1).data;
    const v = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    return `rgba(${v},${v},${v},${(a / 255).toFixed(3)})`;
  };
  const paintGray = (p: any) => (typeof p === 'string' ? gray(p) : p && { ...p, stops: p.stops.map((s: any) => ({ ...s, color: gray(s.color) })) });
  for (const [l] of walk(ds.doc.layers)) {
    if (l.type === 'raster') {
      const c = makeCanvas(l.canvas.width, l.canvas.height), x = ctx2d(c);
      x.drawImage(l.canvas, 0, 0);
      const img = x.getImageData(0, 0, c.width, c.height), d = img.data;
      for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      x.putImageData(img, 0, 0);
      l.canvas = c;
    } else if (l.type === 'shape' || l.type === 'text') {
      l.fill = paintGray(l.fill);
      if (l.stroke) l.stroke = { ...l.stroke, paint: paintGray(l.stroke.paint) };
    }
  }
  if (ds.doc.background) ds.doc.background = gray(ds.doc.background);
  commit('Grayscale');
}

/** Image > Reveal All: grow the canvas to include every layer. */
function revealAll() {
  const ds = cur();
  if (!ds) return;
  import('../core/util').then(({ bounds, unionRects }) => import('../core/ops').then(({ moveLayer }) => {
    const r = unionRects(ds.doc.layers.filter((l) => l.type !== 'adjust').map(bounds));
    if (!r) return;
    const x1 = Math.min(0, Math.floor(r.x)), y1 = Math.min(0, Math.floor(r.y));
    const x2 = Math.max(ds.doc.width, Math.ceil(r.x + r.w)), y2 = Math.max(ds.doc.height, Math.ceil(r.y + r.h));
    for (const l of ds.doc.layers) moveLayer(l, -x1, -y1);
    ds.doc.width = x2 - x1; ds.doc.height = y2 - y1;
    commit('Reveal All');
  }));
}

function clearGuides() {
  const ds = cur();
  if (!ds) return;
  ds.doc.guides = { v: [], h: [] };
  ds.dirty = true;
  touch();
}

function guidesFromShape() {
  const ds = cur();
  const l = activeLayer(ds);
  if (!ds || !l) return;
  import('../core/util').then(({ bounds }) => {
    const b = bounds(l);
    const g = (ds.doc.guides ??= { v: [], h: [] });
    g.v.push(Math.round(b.x), Math.round(b.x + b.w / 2), Math.round(b.x + b.w));
    g.h.push(Math.round(b.y), Math.round(b.y + b.h / 2), Math.round(b.y + b.h));
    ds.dirty = true;
    touch();
  });
}

const setView = (k: keyof typeof viewOpts.value) => () => { viewOpts.value = { ...viewOpts.value, [k]: !viewOpts.value[k] }; touch(); };
const showPanel = (where: 'top' | 'bottom', tab: string) => () => { ui.value = { ...ui.value, panels: true, [where === 'top' ? 'topTab' : 'bottomTab']: tab }; };

export const PS_COMMANDS: Command[] = [
  // File
  { id: 'closeAll', label: 'Close All', keys: 'Mod+Alt+W', run: () => { docs.value = []; activeIndex.value = -1; touch(); }, enabled: hasDoc },
  { id: 'revert', label: 'Revert', keys: 'F12', run: revert, enabled: hasDoc },
  { id: 'saveForWeb', label: 'Save for Web (Legacy)…', keys: 'Mod+Alt+Shift+S', run: () => (dialog.value = { kind: 'export' }), enabled: hasDoc },
  { id: 'exportJpg', label: 'Quick Export as JPG', run: () => quickExport('jpg'), enabled: hasDoc },
  { id: 'saveCopy', label: 'Save a Copy…', keys: 'Mod+Alt+S', run: () => saveDoc(true), enabled: hasDoc },
  // Edit
  { id: 'stepBackward', label: 'Step Backward', keys: 'Mod+Alt+Z', run: () => { const ds = cur(); if (ds) jumpTo(ds.hIndex - 1, ds); }, enabled: () => (cur()?.hIndex ?? 0) > 0 },
  { id: 'stepForward', label: 'Step Forward', keys: 'Mod+Shift+Alt+Z', run: () => { const ds = cur(); if (ds) jumpTo(ds.hIndex + 1, ds); }, enabled: hasDoc },
  { id: 'copyMerged', label: 'Copy Merged', keys: 'Mod+Shift+C', run: copyMerged, enabled: hasDoc },
  { id: 'pasteInPlace', label: 'Paste in Place', keys: 'Mod+Shift+V', run: () => import('./commands').then(({ paste }) => paste()) },
  { id: 'fillDialog', label: 'Fill…', keys: 'Shift+Backspace', run: () => (dialog.value = { kind: 'ps:fill' }), enabled: hasDoc },
  { id: 'fillDialog2', label: 'Fill…', keys: 'Shift+F5', run: () => (dialog.value = { kind: 'ps:fill' }), enabled: hasDoc },
  { id: 'strokeDialog', label: 'Stroke…', run: () => (dialog.value = { kind: 'ps:stroke' }), enabled: hasDoc },
  { id: 'purgeHistory', label: 'Purge History', run: () => { const ds = cur(); if (ds) { ds.history = [ds.history[ds.hIndex]]; ds.hIndex = 0; touch(); toast('History purged'); } }, enabled: hasDoc },
  { id: 'preferences', label: 'Preferences…', keys: 'Mod+K', run: () => (dialog.value = { kind: 'ps:prefs' }) },
  {
    id: 'lastFilter', label: 'Last Filter', keys: 'Mod+Alt+F', enabled: () => !!lastFilter.id && hasSel(),
    run: () => {
      const ds = cur(), l = activeLayer(ds), f = filterById(lastFilter.id);
      if (ds && l && f && applyFilter(ds, l, f, lastFilter.params)) commit(f.name);
    },
  },
  // Image
  { id: 'duplicateDoc', label: 'Duplicate…', run: duplicateDocument, enabled: hasDoc },
  { id: 'revealAll', label: 'Reveal All', run: revealAll, enabled: hasDoc },
  { id: 'modeGray', label: 'Mode: Grayscale', run: toGrayscale, enabled: hasDoc },
  // Layer
  { id: 'layerViaCopy', label: 'New Layer via Copy', keys: 'Mod+J', run: () => layerViaCopy(false), enabled: hasSel },
  { id: 'layerViaCut', label: 'New Layer via Cut', keys: 'Mod+Shift+J', run: () => layerViaCopy(true), enabled: hasSel },
  { id: 'newLayerQuiet', label: 'New Layer (no dialog)', keys: 'Mod+Alt+Shift+N', run: () => import('./commands').then(({ run }) => run('newLayer')), enabled: hasDoc },
  { id: 'fillSolid', label: 'New Fill Layer: Solid Color', run: () => newFillLayer('solid'), enabled: hasDoc },
  { id: 'fillGradient', label: 'New Fill Layer: Gradient', run: () => newFillLayer('gradient'), enabled: hasDoc },
  { id: 'mergeVisible', label: 'Merge Visible', keys: 'Mod+Shift+E', run: () => mergeVisible(false), enabled: hasDoc },
  { id: 'stampVisible', label: 'Stamp Visible (merge to new layer)', keys: 'Mod+Alt+Shift+E', run: () => mergeVisible(true), enabled: hasDoc },
  { id: 'hideLayers', label: 'Hide / Show Layers', keys: 'Mod+,', run: toggleHide, enabled: hasSel },
  { id: 'lockLayers', label: 'Lock / Unlock Layers', keys: 'Mod+/', run: toggleLock, enabled: hasSel },
  { id: 'lockLayers2', label: 'Lock / Unlock Layers', keys: '/', run: toggleLock, enabled: hasSel },
  { id: 'layerStyle', label: 'Layer Style…', run: showPanel('top', 'properties'), enabled: hasSel },
  { id: 'clearStyle', label: 'Clear Layer Style', run: () => { selectedLayers().forEach((l) => delete l.effects); commit('Clear Layer Style'); }, enabled: hasSel },
  { id: 'selNext', label: 'Select Layer Above', keys: 'Alt+]', run: () => selectAdjacent('up'), enabled: hasDoc },
  { id: 'selPrev', label: 'Select Layer Below', keys: 'Alt+[', run: () => selectAdjacent('down'), enabled: hasDoc },
  { id: 'selNextAdd', label: 'Add Layer Above to Selection', keys: 'Shift+Alt+]', run: () => selectAdjacent('up', true), enabled: hasDoc },
  { id: 'selPrevAdd', label: 'Add Layer Below to Selection', keys: 'Shift+Alt+[', run: () => selectAdjacent('down', true), enabled: hasDoc },
  { id: 'selTop', label: 'Select Top Layer', keys: 'Alt+.', run: () => selectAdjacent('top'), enabled: hasDoc },
  { id: 'selBottom', label: 'Select Bottom Layer', keys: 'Alt+,', run: () => selectAdjacent('bottom'), enabled: hasDoc },
  { id: 'blendNext', label: 'Next Blend Mode', keys: 'Shift+=', run: () => cycleBlend(1), enabled: hasSel },
  { id: 'blendPrev', label: 'Previous Blend Mode', keys: 'Shift+-', run: () => cycleBlend(-1), enabled: hasSel },
  ...FILTERS.filter((f) => (f as any).point).map((f) => ({ id: `adj:${f.id}`, label: `New Adjustment Layer: ${f.name}`, run: () => adjustmentLayer(f.id), enabled: hasDoc })),
  // View
  { id: 'zoom200', label: '200%', run: () => { const ds = cur(); if (ds) import('../tools').then(({ zoomAt }) => zoomAt(2 / ds.view.zoom, window.innerWidth / 2, window.innerHeight / 2)); }, enabled: hasDoc },
  { id: 'extras', label: 'Extras', keys: 'Mod+H', run: setView('extras') },
  { id: 'showGuides', label: 'Show Guides', keys: 'Mod+;', run: setView('guides') },
  { id: 'lockGuides', label: 'Lock Guides', keys: 'Mod+Alt+;', run: setView('lockGuides') },
  { id: 'clearGuides', label: 'Clear Guides', run: clearGuides, enabled: hasDoc },
  { id: 'newGuide', label: 'New Guide…', run: () => (dialog.value = { kind: 'ps:guide' }), enabled: hasDoc },
  { id: 'guidesFromShape', label: 'New Guides From Shape', run: guidesFromShape, enabled: hasSel },
  { id: 'screenMode', label: 'Screen Mode (cycle)', keys: 'F', run: () => { ui.value = { ...ui.value, screen: ((ui.value.screen + 1) % 3) as 0 | 1 | 2 }; setTimeout(() => fitView(), 50); } },
  { id: 'togglePanels', label: 'Show / Hide Panels', keys: 'Tab', run: () => { ui.value = { ...ui.value, panels: !ui.value.panels }; } },
  { id: 'nextDoc', label: 'Next Document', keys: 'Mod+Tab', run: () => { if (docs.value.length) { activeIndex.value = (activeIndex.value + 1) % docs.value.length; touch(); } } },
  { id: 'prevDoc', label: 'Previous Document', keys: 'Mod+Shift+Tab', run: () => { if (docs.value.length) { activeIndex.value = (activeIndex.value - 1 + docs.value.length) % docs.value.length; touch(); } } },
  // Window
  { id: 'winLayers', label: 'Layers', keys: 'F7', run: showPanel('bottom', 'layers') },
  { id: 'winHistory', label: 'History', run: showPanel('bottom', 'history') },
  { id: 'winSwatches', label: 'Swatches', run: showPanel('bottom', 'swatches') },
  { id: 'winProperties', label: 'Properties', run: showPanel('top', 'properties') },
  { id: 'winInfo', label: 'Info', keys: 'F8', run: showPanel('top', 'info') },
  { id: 'winNavigator', label: 'Navigator', run: showPanel('top', 'navigator') },
  { id: 'winHistogram', label: 'Histogram', run: showPanel('top', 'histogram') },
  { id: 'winColor', label: 'Color', keys: 'F6', run: showPanel('bottom', 'swatches') },
];

// Dialogs

function Shell({ title, children, onOk }: { title: string; children: any; onOk: () => void }) {
  const close = () => (dialog.value = null);
  return (
    <div class="backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class="dialog" onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') close(); if (e.key === 'Enter') onOk(); }}>
        <div class="dialog-head"><div>{title}</div><button class="icon-btn" onClick={close}><Icon name="x" /></button></div>
        <div class="dialog-body">{children}</div>
        <div class="dialog-foot"><button class="btn ghost" onClick={close}>Cancel</button><button class="btn primary" onClick={onOk}>OK</button></div>
      </div>
    </div>
  );
}

const CONTENTS = ['Foreground Color', 'Background Color', 'Color…', 'Black', '50% Gray', 'White'] as const;

function FillDialog() {
  const [what, setWhat] = useState<(typeof CONTENTS)[number]>('Foreground Color');
  const [color, setColor] = useState(fg.value);
  const [opacity, setOpacity] = useState(100);
  const [mode, setMode] = useState<BlendMode>('normal');
  const ok = () => {
    dialog.value = null;
    const ds = cur();
    let l = activeLayer(ds);
    if (!ds) return;
    if (!l || l.type === 'group' || l.type === 'adjust') l = addLayer(newRaster(ds, 'Fill'), ds);
    const c = what === 'Foreground Color' ? fg.value : what === 'Background Color' ? bg.value : what === 'Black' ? '#000' : what === 'White' ? '#fff' : what === '50% Gray' ? '#808080' : color;
    if ((l.type === 'shape' || l.type === 'text') && !ds.mask) { l.fill = c; commit('Fill'); return; }
    const r = editablePixels(l, ds);
    if (!r) return;
    const t = makeCanvas(r.canvas.width, r.canvas.height), x = ctx2d(t);
    x.fillStyle = c; x.fillRect(0, 0, t.width, t.height);
    compositeMasked(ds, r, t, mode === 'normal' ? 'source-over' : mode, opacity / 100);
    commit('Fill');
  };
  return (
    <Shell title="Fill" onOk={ok}>
      <div class="kv">
        <label>Contents</label>
        <div class="row"><select class="grow" value={what} onChange={(e) => setWhat((e.target as HTMLSelectElement).value as any)}>{CONTENTS.map((c) => <option>{c}</option>)}</select>{what === 'Color…' && <Swatch value={color} onChange={setColor} />}</div>
        <label>Mode</label>
        <select value={mode} onChange={(e) => setMode((e.target as HTMLSelectElement).value as BlendMode)}>{BLEND_MODES.map((b) => <option value={b}>{b}</option>)}</select>
        <label>Opacity</label><NumField value={opacity} min={1} max={100} unit="%" onChange={setOpacity} />
      </div>
      <p style={{ color: 'var(--muted)', marginBottom: 0 }}>Fills the selection (or the whole layer) on the active layer.</p>
    </Shell>
  );
}

function StrokeDialog() {
  const [width, setWidth] = useState(4);
  const [color, setColor] = useState(fg.value);
  const [where, setWhere] = useState<'inside' | 'center' | 'outside'>('center');
  const ok = () => {
    dialog.value = null;
    const ds = cur();
    if (!ds) return;
    let l = activeLayer(ds);
    if (!ds.mask) {
      // No selection: stroke the layer's own shape like Layer Style > Stroke would.
      if (l && (l.type === 'shape' || l.type === 'text')) { l.stroke = { paint: color, width, join: 'round', cap: 'round' }; commit('Stroke'); return; }
      return toast('Make a selection to stroke', 'error');
    }
    if (!l || l.type !== 'raster') l = addLayer(newRaster(ds, 'Stroke'), ds);
    const r = editablePixels(l, ds) as RasterLayer;
    if (!r) return;
    // Grow the selection edge by `width` with repeated edge stamping, colored, clipped by side.
    const edges = maskEdges(ds.mask);
    const band = makeCanvas(ds.doc.width, ds.doc.height), b = ctx2d(band);
    const steps = Math.max(1, Math.round(width));
    for (let dy = -steps; dy <= steps; dy++) for (let dx = -steps; dx <= steps; dx++) {
      if (dx * dx + dy * dy <= (width / (where === 'center' ? 2 : 1)) ** 2) b.drawImage(edges, dx, dy);
    }
    b.globalCompositeOperation = 'source-in';
    b.fillStyle = color; b.fillRect(0, 0, band.width, band.height);
    if (where !== 'center') { b.globalCompositeOperation = where === 'inside' ? 'destination-in' : 'destination-out'; b.drawImage(ds.mask, 0, 0); }
    const lc = ctx2d(r.canvas);
    lc.save();
    lc.setTransform(new DOMMatrix().scaleSelf(r.canvas.width / r.w, r.canvas.height / r.h).translateSelf(-r.x, -r.y));
    lc.drawImage(band, 0, 0);
    lc.restore();
    commit('Stroke');
  };
  return (
    <Shell title="Stroke" onOk={ok}>
      <div class="kv">
        <label>Width</label><NumField value={width} min={1} max={64} unit="px" onChange={setWidth} />
        <label>Color</label><Swatch value={color} onChange={setColor} />
        <label>Location</label>
        <select value={where} onChange={(e) => setWhere((e.target as HTMLSelectElement).value as any)}><option value="inside">Inside</option><option value="center">Center</option><option value="outside">Outside</option></select>
      </div>
    </Shell>
  );
}

function GuideDialog() {
  const [axis, setAxis] = useState<'v' | 'h'>('v');
  const [pos, setPos] = useState(100);
  const ok = () => {
    dialog.value = null;
    const ds = cur();
    if (!ds) return;
    (ds.doc.guides ??= { v: [], h: [] })[axis].push(pos);
    ds.dirty = true;
    touch();
  };
  return (
    <Shell title="New Guide" onOk={ok}>
      <div class="kv">
        <label>Orientation</label>
        <select value={axis} onChange={(e) => setAxis((e.target as HTMLSelectElement).value as any)}><option value="v">Vertical</option><option value="h">Horizontal</option></select>
        <label>Position</label><NumField value={pos} unit="px" onChange={setPos} />
      </div>
    </Shell>
  );
}

function PrefsDialog() {
  const v = viewOpts.value;
  const flag = (k: keyof typeof v, label: string) => (
    <label class="opt"><input type="checkbox" checked={!!v[k]} onChange={(e) => (viewOpts.value = { ...viewOpts.value, [k]: (e.target as HTMLInputElement).checked })} /> {label}</label>
  );
  return (
    <Shell title="Preferences" onOk={() => { dialog.value = null; touch(); }}>
      <div style={{ display: 'grid', gap: 10 }}>
        {flag('autoSelect', 'Move tool: Auto-Select layers')}
        {flag('snap', 'Snap & smart guides')}
        {flag('rulers', 'Show rulers')}
        {flag('guides', 'Show guides')}
        {flag('grid', 'Show grid')}
        <div style={{ color: 'var(--muted)' }}>History keeps the last {HISTORY_LIMIT} steps per document.</div>
      </div>
    </Shell>
  );
}

export function PsDialogs() {
  const d = dialog.value;
  if (!d || !d.kind.startsWith('ps:')) return null;
  if (d.kind === 'ps:fill') return <FillDialog />;
  if (d.kind === 'ps:stroke') return <StrokeDialog />;
  if (d.kind === 'ps:guide') return <GuideDialog />;
  if (d.kind === 'ps:prefs') return <PrefsDialog />;
  return null;
}

