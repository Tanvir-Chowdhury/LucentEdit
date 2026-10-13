import type { Layer, RasterLayer } from '../core/types';
import {
  cur, commit, touch, undo, redo, selectedLayers, activeLayer, dialog, toast, openDocState, closeDoc, docs,
  activeIndex, fg, bg, tool, viewOpts, select, createDoc, maskTarget,
} from '../core/store';
import {
  duplicateSelected, deleteSelected, groupSelected, ungroup, mergeDown, flattenImage, rasterize, reorder, newRaster,
  addLayer, editablePixels, align, distribute, transformCanvas, cropDoc, moveLayer, flipLayers, topLevel, addMask, applyMask, setClip, MaskMode,
} from '../core/ops';
import { selectAll, deselect, invertSelection, maskBounds, clearSelection, fillSelection, copyPixels, featherSelection } from '../core/selection';
import { duplicateLayer, makeCanvas, ctx2d, walk, refreshGroups, unionRects, bounds } from '../core/util';
import { pickFiles, docFromFile, layersFromFile, exportBytes, saveAs, isTauri, OpenedFile } from '../core/io';
import { FILTERS, filterById } from '../core/filters';
import { setTool, zoomAt } from '../tools';
import { view } from '../tools/types';

// Every user action in one registry: menus, keyboard shortcuts and the command palette.

export interface Command { id: string; label: string; keys?: string; run: () => void; enabled?: () => boolean }

export const viewportSize = { w: 1200, h: 800 };

export function fitView(maxZoom = 64) {
  const ds = cur();
  if (!ds) return;
  const pad = 48;
  const z = Math.min((viewportSize.w - pad * 2) / ds.doc.width, (viewportSize.h - pad * 2) / ds.doc.height, maxZoom);
  ds.view.zoom = Math.max(0.02, z);
  ds.view.panX = (viewportSize.w - ds.doc.width * ds.view.zoom) / 2;
  ds.view.panY = (viewportSize.h - ds.doc.height * ds.view.zoom) / 2;
  view.zoom = ds.view.zoom;
  touch();
}

export function actualPixels() {
  const ds = cur();
  if (!ds) return;
  zoomAt(1 / ds.view.zoom, viewportSize.w / 2, viewportSize.h / 2);
}

export async function openFiles(files?: OpenedFile[]) {
  const list = files ?? (await pickFiles(true));
  for (const f of list) {
    try {
      const doc = await docFromFile(f);
      openDocState(doc, `Open ${f.name}`);
    } catch (e: any) {
      toast(`Couldn't open ${f.name}: ${e.message ?? e}`, 'error');
    }
  }
}

export async function placeFiles(files?: OpenedFile[]) {
  const ds = cur();
  if (!ds) return openFiles(files);
  const list = files ?? (await pickFiles(true));
  for (const f of list) {
    try {
      for (const l of await layersFromFile(f, ds.doc)) addLayer(l, ds);
      commit(`Place ${f.name}`, ds);
    } catch (e: any) {
      toast(`Couldn't place ${f.name}: ${e.message ?? e}`, 'error');
    }
  }
}

export async function saveDoc(as = false) {
  const ds = cur();
  if (!ds) return;
  const bytes = await exportBytes(ds.doc, 'lucent');
  const name = `${ds.doc.name}.lucent`;
  const path = await saveAs(bytes, name, 'lucent', as ? undefined : ds.doc.path);
  if (path === null) return;
  if (path) {
    ds.doc.path = path;
    ds.doc.name = path.split(/[\\/]/).pop()!.replace(/\.lucent$/i, '');
  }
  ds.dirty = false;
  toast(isTauri ? `Saved ${ds.doc.name}.lucent` : 'Downloaded .lucent file', 'success');
  touch();
}

export async function quickExport(format: 'png' | 'jpg' | 'svg') {
  const ds = cur();
  if (!ds) return;
  const bytes = await exportBytes(ds.doc, format);
  const p = await saveAs(bytes, `${ds.doc.name}.${format}`, format);
  if (p !== null) toast(`Exported ${format.toUpperCase()}`, 'success');
}

// Clipboard (layers or pixels).

let clip: Layer[] = [];

function copy(cut = false) {
  const ds = cur();
  if (!ds) return;
  const l = activeLayer(ds);
  if (ds.mask && l && l.type !== 'group') {
    const r = l.type === 'raster' ? l : null;
    const src = makeCanvas(ds.doc.width, ds.doc.height);
    const tmp = { ...l, visible: true, opacity: 1, blend: 'normal' } as Layer;
    import('../core/render').then(({ drawLayer }) => {
      drawLayer(ctx2d(src), tmp);
      const px = copyPixels(ds, l, src);
      const b = maskBounds(ds);
      const out = b ? makeCanvas(b.w, b.h) : px;
      if (b) ctx2d(out).drawImage(px, -b.x, -b.y);
      clip = [{ ...newRaster(ds, `${l.name} copy`, out, b?.x ?? 0, b?.y ?? 0) }];
      if (cut && r) {
        const e = editablePixels(r, ds);
        if (e) { clearSelection(ds, e); commit('Cut'); }
      }
      writeSystemClipboard(out);
    });
    return;
  }
  const sel = selectedLayers(ds);
  if (!sel.length) return;
  clip = sel.map((x) => duplicateLayer(x));
  if (cut) { deleteSelected(); }
}

async function writeSystemClipboard(c: HTMLCanvasElement) {
  try {
    const blob: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej()), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  } catch { /* not supported here; internal clipboard still works */ }
}

export function paste() {
  const ds = cur();
  if (!ds || !clip.length) return false;
  const ids: string[] = [];
  for (const l of clip) {
    const c = duplicateLayer(l);
    addLayer(c, ds);
    ids.push(c.id);
  }
  ds.selected = ids;
  commit('Paste');
  return true;
}

export function nudge(dx: number, dy: number) {
  const ds = cur();
  if (!ds) return;
  const sel = topLevel(selectedLayers(ds), ds).filter((l) => !l.locked);
  if (!sel.length) return;
  sel.forEach((l) => moveLayer(l, dx, dy));
  refreshGroups(ds.doc.layers);
  commit('Nudge');
}

function deleteAction() {
  const ds = cur();
  if (!ds) return;
  const l = activeLayer(ds);
  if (ds.mask && l) {
    const r = editablePixels(l, ds);
    if (r) { clearSelection(ds, r); commit('Clear'); }
    return;
  }
  deleteSelected();
}

function fillAction(color: string) {
  const ds = cur();
  if (!ds) return;
  let l = activeLayer(ds);
  if (!l || l.type === 'group') l = addLayer(newRaster(ds, 'Fill'), ds);
  if (l.locked) return toast('Layer is locked', 'error');
  if (l.type === 'shape' || l.type === 'text') { l.fill = color; commit('Fill'); return; }
  const r = editablePixels(l, ds);
  if (!r) return;
  fillSelection(ds, r as RasterLayer, color);
  commit('Fill');
}

function newLayer() {
  const ds = cur();
  if (!ds) return;
  const n = [...walk(ds.doc.layers)].filter(([l]) => l.type === 'raster').length + 1;
  addLayer(newRaster(ds, `Layer ${n}`), ds);
  commit('New Layer');
}

function cropToSelection() {
  const ds = cur();
  const b = ds && maskBounds(ds);
  if (!ds || !b) return toast('Make a selection first', 'error');
  cropDoc(b, ds);
}

function trim() {
  const ds = cur();
  if (!ds) return;
  import('../core/render').then(({ flatten }) => {
    const f = flatten(ds.doc, 1, false);
    const d = ctx2d(f).getImageData(0, 0, f.width, f.height).data;
    let x1 = f.width, y1 = f.height, x2 = -1, y2 = -1;
    for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) if (d[(y * f.width + x) * 4 + 3]) {
      x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y);
    }
    if (x2 < 0) return toast('Nothing to trim', 'error');
    cropDoc({ x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 }, ds);
  });
}

function flipSelected(h: boolean) {
  const ds = cur();
  if (!ds) return;
  const sel = topLevel(selectedLayers(ds), ds).filter((l) => !l.locked);
  const b = unionRects(sel.map(bounds));
  if (!b) return;
  flipLayers(sel, h, b.x + b.w / 2, b.y + b.h / 2);
  refreshGroups(ds.doc.layers);
  commit(h ? 'Flip Horizontal' : 'Flip Vertical');
}

function rotateLayers(deg: number) {
  const ds = cur();
  if (!ds) return;
  for (const l of selectedLayers(ds)) if (!l.locked && l.type !== 'group') l.rotation = (((l.rotation + deg) % 360) + 360) % 360;
  commit('Rotate');
}

function maskCmd(mode: MaskMode) {
  const l = activeLayer();
  if (!l) return;
  addMask(l, mode);
  maskTarget.value = l.id;
  commit('Add Layer Mask');
}
const withMask = (f: (l: Layer) => void, label: string) => () => { const l = activeLayer(); if (l?.mask) { f(l); commit(label); } };
const hasMaskLayer = () => !!activeLayer()?.mask;

const hasDoc = () => !!cur();
const hasSel = () => !!cur()?.selected.length;
const hasMask = () => !!cur()?.mask;

export const COMMANDS: Command[] = [
  // File
  { id: 'new', label: 'New…', keys: 'Mod+N', run: () => (dialog.value = { kind: 'new' }) },
  { id: 'open', label: 'Open…', keys: 'Mod+O', run: () => openFiles() },
  { id: 'place', label: 'Place / Import…', keys: 'Mod+Shift+P', run: () => placeFiles(), enabled: hasDoc },
  { id: 'save', label: 'Save', keys: 'Mod+S', run: () => saveDoc(), enabled: hasDoc },
  { id: 'saveAs', label: 'Save As…', keys: 'Mod+Shift+S', run: () => saveDoc(true), enabled: hasDoc },
  { id: 'export', label: 'Export As…', keys: 'Mod+Shift+E', run: () => (dialog.value = { kind: 'export' }), enabled: hasDoc },
  { id: 'exportPng', label: 'Quick Export as PNG', keys: 'Mod+Shift+Alt+W', run: () => quickExport('png'), enabled: hasDoc },
  { id: 'exportSvg', label: 'Quick Export as SVG', run: () => quickExport('svg'), enabled: hasDoc },
  { id: 'close', label: 'Close', keys: 'Mod+W', run: () => closeDoc(activeIndex.value), enabled: hasDoc },
  // Edit
  { id: 'undo', label: 'Undo', keys: 'Mod+Z', run: undo, enabled: () => (cur()?.hIndex ?? 0) > 0 },
  { id: 'redo', label: 'Redo', keys: 'Mod+Shift+Z', run: redo, enabled: () => !!cur() && cur()!.hIndex < cur()!.history.length - 1 },
  { id: 'redo2', label: 'Redo', keys: 'Mod+Y', run: redo },
  { id: 'cut', label: 'Cut', keys: 'Mod+X', run: () => copy(true), enabled: hasSel },
  { id: 'copy', label: 'Copy', keys: 'Mod+C', run: () => copy(false), enabled: hasSel },
  { id: 'paste', label: 'Paste', keys: 'Mod+V', run: () => void paste() },
  { id: 'delete', label: 'Delete', keys: 'Delete', run: deleteAction, enabled: hasSel },
  { id: 'fill', label: 'Fill with Foreground', keys: 'Alt+Backspace', run: () => fillAction(fg.value), enabled: hasDoc },
  { id: 'fillBg', label: 'Fill with Background', keys: 'Mod+Backspace', run: () => fillAction(bg.value), enabled: hasDoc },
  { id: 'transform', label: 'Free Transform', keys: 'Mod+T', run: () => setTool('move'), enabled: hasSel },
  { id: 'flipH', label: 'Flip Layer Horizontal', run: () => flipSelected(true), enabled: hasSel },
  { id: 'flipV', label: 'Flip Layer Vertical', run: () => flipSelected(false), enabled: hasSel },
  { id: 'rot90', label: 'Rotate Layer 90° CW', run: () => rotateLayers(90), enabled: hasSel },
  { id: 'rot-90', label: 'Rotate Layer 90° CCW', run: () => rotateLayers(-90), enabled: hasSel },
  // Image
  { id: 'imageSize', label: 'Image Size…', keys: 'Mod+Alt+I', run: () => (dialog.value = { kind: 'imageSize' }), enabled: hasDoc },
  { id: 'canvasSize', label: 'Canvas Size…', keys: 'Mod+Alt+C', run: () => (dialog.value = { kind: 'canvasSize' }), enabled: hasDoc },
  { id: 'rotCW', label: 'Rotate Canvas 90° CW', run: () => transformCanvas('cw'), enabled: hasDoc },
  { id: 'rotCCW', label: 'Rotate Canvas 90° CCW', run: () => transformCanvas('ccw'), enabled: hasDoc },
  { id: 'rot180', label: 'Rotate Canvas 180°', run: () => transformCanvas('180'), enabled: hasDoc },
  { id: 'flipCanvasH', label: 'Flip Canvas Horizontal', run: () => transformCanvas('flipH'), enabled: hasDoc },
  { id: 'flipCanvasV', label: 'Flip Canvas Vertical', run: () => transformCanvas('flipV'), enabled: hasDoc },
  { id: 'cropSel', label: 'Crop to Selection', run: cropToSelection, enabled: hasMask },
  { id: 'trim', label: 'Trim Transparent Pixels', run: trim, enabled: hasDoc },
  // Layer
  { id: 'newLayer', label: 'New Layer', keys: 'Mod+Shift+N', run: newLayer, enabled: hasDoc },
  { id: 'dupLayer', label: 'Duplicate Layer', keys: 'Mod+J', run: () => duplicateSelected(), enabled: hasSel },
  { id: 'delLayer', label: 'Delete Layer', run: deleteSelected, enabled: hasSel },
  { id: 'group', label: 'Group Layers', keys: 'Mod+G', run: () => groupSelected(), enabled: hasSel },
  { id: 'ungroup', label: 'Ungroup Layers', keys: 'Mod+Shift+G', run: () => ungroup(), enabled: hasSel },
  { id: 'mergeDown', label: 'Merge Down', keys: 'Mod+E', run: () => mergeDown(), enabled: hasSel },
  { id: 'flatten', label: 'Flatten Image', run: () => flattenImage(), enabled: hasDoc },
  { id: 'maskReveal', label: 'Add Layer Mask: Reveal All', run: () => maskCmd('reveal'), enabled: hasSel },
  { id: 'maskHide', label: 'Add Layer Mask: Hide All', run: () => maskCmd('hide'), enabled: hasSel },
  { id: 'maskSel', label: 'Add Layer Mask: Reveal Selection', run: () => maskCmd('selection'), enabled: () => hasSel() && hasMask() },
  { id: 'maskHideSel', label: 'Add Layer Mask: Hide Selection', run: () => maskCmd('hideSelection'), enabled: () => hasSel() && hasMask() },
  { id: 'maskToggle', label: 'Enable/Disable Layer Mask', run: withMask((l) => (l.mask = { ...l.mask!, enabled: !l.mask!.enabled }), 'Toggle Mask'), enabled: hasMaskLayer },
  { id: 'maskApply', label: 'Apply Layer Mask', run: withMask((l) => { applyMask(l); maskTarget.value = null; }, 'Apply Mask'), enabled: hasMaskLayer },
  { id: 'maskDelete', label: 'Delete Layer Mask', run: withMask((l) => { delete l.mask; maskTarget.value = null; }, 'Delete Mask'), enabled: hasMaskLayer },
  { id: 'clip', label: 'Create/Release Clipping Mask', keys: 'Mod+Alt+G', run: () => { const l = activeLayer(); if (l) { setClip(l, !l.clip); commit(l.clip ? 'Create Clipping Mask' : 'Release Clipping Mask'); } }, enabled: hasSel },
  { id: 'rasterize', label: 'Rasterize Layer', run: () => { const l = activeLayer(); if (l) { rasterize(l); commit('Rasterize'); } }, enabled: hasSel },
  { id: 'front', label: 'Bring to Front', keys: 'Mod+Shift+]', run: () => arrange('top'), enabled: hasSel },
  { id: 'forward', label: 'Bring Forward', keys: 'Mod+]', run: () => arrange('up'), enabled: hasSel },
  { id: 'backward', label: 'Send Backward', keys: 'Mod+[', run: () => arrange('down'), enabled: hasSel },
  { id: 'back', label: 'Send to Back', keys: 'Mod+Shift+[', run: () => arrange('bottom'), enabled: hasSel },
  { id: 'alignL', label: 'Align Left', run: () => alignCmd('left'), enabled: hasSel },
  { id: 'alignHC', label: 'Align Horizontal Centers', run: () => alignCmd('hcenter'), enabled: hasSel },
  { id: 'alignR', label: 'Align Right', run: () => alignCmd('right'), enabled: hasSel },
  { id: 'alignT', label: 'Align Top', run: () => alignCmd('top'), enabled: hasSel },
  { id: 'alignVC', label: 'Align Vertical Centers', run: () => alignCmd('vcenter'), enabled: hasSel },
  { id: 'alignB', label: 'Align Bottom', run: () => alignCmd('bottom'), enabled: hasSel },
  { id: 'distH', label: 'Distribute Horizontally', run: () => { distribute(selectedLayers(), 'h'); commit('Distribute'); }, enabled: hasSel },
  { id: 'distV', label: 'Distribute Vertically', run: () => { distribute(selectedLayers(), 'v'); commit('Distribute'); }, enabled: hasSel },
  // Select
  { id: 'selectAll', label: 'Select All', keys: 'Mod+A', run: () => { const ds = cur(); if (ds) selectAll(ds); }, enabled: hasDoc },
  { id: 'deselect', label: 'Deselect', keys: 'Mod+D', run: () => { const ds = cur(); if (ds) deselect(ds); }, enabled: hasMask },
  { id: 'inverse', label: 'Inverse', keys: 'Mod+Shift+I', run: () => { const ds = cur(); if (ds) invertSelection(ds); }, enabled: hasDoc },
  { id: 'feather', label: 'Feather…', keys: 'Shift+F6', run: () => (dialog.value = { kind: 'feather' }), enabled: hasMask },
  { id: 'allLayers', label: 'All Layers', keys: 'Mod+Alt+A', run: () => { const ds = cur(); if (ds) select(ds.doc.layers.map((l) => l.id)); }, enabled: hasDoc },
  { id: 'deselectLayers', label: 'Deselect Layers', run: () => select([]), enabled: hasSel },
  // View
  { id: 'zoomIn', label: 'Zoom In', keys: 'Mod+=', run: () => zoomAt(1.25, viewportSize.w / 2, viewportSize.h / 2), enabled: hasDoc },
  { id: 'zoomOut', label: 'Zoom Out', keys: 'Mod+-', run: () => zoomAt(0.8, viewportSize.w / 2, viewportSize.h / 2), enabled: hasDoc },
  { id: 'fit', label: 'Fit on Screen', keys: 'Mod+0', run: () => fitView(), enabled: hasDoc },
  { id: 'actual', label: '100%', keys: 'Mod+1', run: actualPixels, enabled: hasDoc },
  { id: 'snap', label: 'Snap & Smart Guides', keys: 'Mod+Shift+;', run: () => (viewOpts.value = { ...viewOpts.value, snap: !viewOpts.value.snap }) },
  { id: 'gridToggle', label: 'Show Grid', keys: "Mod+'", run: () => { viewOpts.value = { ...viewOpts.value, grid: !viewOpts.value.grid }; touch(); } },
  { id: 'rulers', label: 'Show Rulers', keys: 'Mod+R', run: () => { viewOpts.value = { ...viewOpts.value, rulers: !viewOpts.value.rulers }; touch(); } },
  // Help & misc
  { id: 'palette', label: 'Command Palette', keys: 'Mod+K', run: () => (dialog.value = { kind: 'palette' }) },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', keys: 'Mod+/', run: () => (dialog.value = { kind: 'shortcuts' }) },
  { id: 'mcp', label: 'Connect AI Agents (MCP)…', run: () => (dialog.value = { kind: 'mcp' }) },
  { id: 'about', label: 'About Lucent', run: () => (dialog.value = { kind: 'about' }) },
  { id: 'defaultColors', label: 'Default Colors', keys: 'D', run: () => { fg.value = '#000000'; bg.value = '#ffffff'; } },
  { id: 'swapColors', label: 'Swap Colors', keys: 'X', run: () => { const f = fg.value; fg.value = bg.value; bg.value = f; } },
  ...FILTERS.map((f) => ({
    id: `filter:${f.id}`, label: `${f.menu === 'adjust' ? 'Adjust' : 'Filter'}: ${f.name}${f.params.length ? '…' : ''}`,
    keys: f.id === 'invert' ? 'Mod+I' : f.id === 'levels' ? 'Mod+L' : f.id === 'hue-saturation' ? 'Mod+U' : f.id === 'grayscale' ? 'Mod+Shift+U' : undefined,
    run: () => openFilter(f.id), enabled: hasSel,
  })),
];

function arrange(to: 'up' | 'down' | 'top' | 'bottom') {
  const ds = cur();
  if (!ds) return;
  const sel = selectedLayers(ds);
  (to === 'up' || to === 'top' ? [...sel].reverse() : sel).forEach((l) => reorder(l.id, to, ds));
  commit('Arrange');
}

function alignCmd(mode: Parameters<typeof align>[1]) {
  const sel = selectedLayers();
  align(sel, mode, sel.length > 1 ? 'selection' : 'canvas');
  commit('Align');
}

export function openFilter(id: string) {
  const f = filterById(id);
  const l = activeLayer();
  if (!f || !l) return toast('Select a layer first', 'error');
  if (l.locked) return toast('Layer is locked', 'error');
  if (!f.params.length) {
    import('../core/filters').then(({ applyFilter }) => { const ds = cur(); if (ds && applyFilter(ds, l, f, {})) commit(f.name); });
    return;
  }
  dialog.value = { kind: 'filter', data: { id: f.id } };
}

export const cmd = (id: string) => COMMANDS.find((c) => c.id === id)!;
export function run(id: string) {
  const c = cmd(id);
  if (c && (!c.enabled || c.enabled())) c.run();
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export function prettyKeys(k?: string) {
  if (!k) return '';
  return k.split('+').map((p) => (p === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : p === 'Shift' ? (isMac ? '⇧' : 'Shift') : p === 'Alt' ? (isMac ? '⌥' : 'Alt') : p)).join(isMac ? '' : '+');
}

/** Match a keyboard event against command shortcuts. */
export function matchShortcut(e: KeyboardEvent): Command | null {
  const mod = isMac ? e.metaKey : e.ctrlKey;
  let key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (e.code === 'Equal' || key === '+') key = '=';
  if (e.code === 'Minus') key = '-';
  if (e.code === 'BracketRight' || key === '}') key = ']';
  if (e.code === 'BracketLeft' || key === '{') key = '[';
  if (e.code === 'Semicolon') key = ';';
  if (e.code === 'Quote') key = "'";
  if (e.code === 'Slash') key = '/';
  if (e.code === 'Digit0') key = '0';
  if (e.code === 'Digit1') key = '1';
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
  for (const c of COMMANDS) {
    if (!c.keys) continue;
    const parts = c.keys.split('+');
    const k = parts[parts.length - 1].toUpperCase();
    const want = { mod: parts.includes('Mod'), shift: parts.includes('Shift'), alt: parts.includes('Alt') };
    const keyOk = k === key.toUpperCase() || (k === 'DELETE' && (key === 'Delete' || key === 'Backspace') && !want.mod && !want.alt);
    // Ctrl + "+" is Shift+= on most layouts, so Shift doesn't matter for zoom in.
    const shiftOk = want.shift === e.shiftKey || k === '=';
    if (keyOk && want.mod === mod && shiftOk && want.alt === e.altKey) return c;
  }
  return null;
}

export function newDocument(width: number, height: number, name?: string, background: string | null = '#ffffff') {
  const doc = createDoc({ width, height, name, background });
  const ds = openDocState(doc, 'New Document');
  return ds;
}

export { tool, docs, featherSelection };
