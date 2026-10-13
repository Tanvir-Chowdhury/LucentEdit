import { useEffect, useMemo, useState } from 'preact/hooks';
import { dialog, cur, fg, wand, activeLayer } from '../core/store';
import {
  reselect, canReselect, modifyBorder, modifySmooth, modifyExpand, modifyContract, grow, similar, colorRange, rangeSpec,
  saveSelection, loadSelection, selectLayerPixels, toggleQuickMask, SelMode, ColorRangeTarget,
} from '../core/selection';
import { colorRangeAlpha } from '../core/selectops';
import { flatten } from '../core/render';
import { ctx2d, makeCanvas } from '../core/util';
import type { DocState } from '../core/types';
import type { Command } from './commands';
import { Icon } from './icons';
import { NumField, Swatch, Seg } from './controls';

// Select menu: commands and their dialogs (kinds prefixed 'sel:').

const close = () => (dialog.value = null);
const withDoc = (f: (ds: DocState) => void) => () => { const ds = cur(); if (ds) f(ds); };
const hasDoc = () => !!cur();
const hasMask = () => !!cur()?.mask;

export const SELECT_COMMANDS: Command[] = [
  { id: 'reselect', label: 'Reselect', keys: 'Mod+Shift+D', run: withDoc(reselect), enabled: () => { const ds = cur(); return !!ds && canReselect(ds); } },
  { id: 'colorRange', label: 'Color Range…', run: () => (dialog.value = { kind: 'sel:colorRange' }), enabled: hasDoc },
  { id: 'modifyBorder', label: 'Modify › Border…', run: () => (dialog.value = { kind: 'sel:border' }), enabled: hasMask },
  { id: 'modifySmooth', label: 'Modify › Smooth…', run: () => (dialog.value = { kind: 'sel:smooth' }), enabled: hasMask },
  { id: 'modifyExpand', label: 'Modify › Expand…', run: () => (dialog.value = { kind: 'sel:expand' }), enabled: hasMask },
  { id: 'modifyContract', label: 'Modify › Contract…', run: () => (dialog.value = { kind: 'sel:contract' }), enabled: hasMask },
  { id: 'grow', label: 'Grow', run: withDoc((ds) => grow(ds, wand.value.tolerance)), enabled: hasMask },
  { id: 'similar', label: 'Similar', run: withDoc((ds) => similar(ds, wand.value.tolerance)), enabled: hasMask },
  { id: 'quickMask', label: 'Edit in Quick Mask Mode', keys: 'Q', run: withDoc(toggleQuickMask), enabled: hasDoc },
  { id: 'loadSelection', label: 'Load Selection…', run: () => (dialog.value = { kind: 'sel:load' }), enabled: () => !!cur()?.channels?.length },
  { id: 'saveSelection', label: 'Save Selection…', run: () => (dialog.value = { kind: 'sel:save' }), enabled: hasMask },
  { id: 'selectLayerPixels', label: 'Select Layer Pixels', run: withDoc((ds) => { const l = activeLayer(ds); if (l) selectLayerPixels(ds, l); }), enabled: () => !!activeLayer() },
];

/** Command ids in Photoshop's Select-menu order ('-' = separator). */
export function selectMenu(): (string | '-')[] {
  return [
    'selectAll', 'deselect', 'reselect', 'inverse', '-',
    'allLayers', 'deselectLayers', 'selectLayerPixels', '-',
    'colorRange', '-',
    'feather', 'modifyBorder', 'modifySmooth', 'modifyExpand', 'modifyContract', '-',
    'grow', 'similar', '-',
    'quickMask', '-',
    'loadSelection', 'saveSelection',
  ];
}

function Dialog({ title, children, onOk }: { title: string; children: any; onOk: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, []);
  const ok = () => { onOk(); close(); };
  return (
    <div class="backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class="dialog" onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') ok(); }}>
        <div class="dialog-head"><div>{title}</div><button class="icon-btn" onClick={close}><Icon name="x" /></button></div>
        <div class="dialog-body">{children}</div>
        <div class="dialog-foot"><button class="btn ghost" onClick={close}>Cancel</button><button class="btn primary" onClick={ok}>OK</button></div>
      </div>
    </div>
  );
}

const MODIFY: Record<string, { title: string; label: string; def: number; max: number; run: (ds: DocState, v: number) => void }> = {
  'sel:border': { title: 'Border Selection', label: 'Width', def: 10, max: 200, run: modifyBorder },
  'sel:smooth': { title: 'Smooth Selection', label: 'Sample Radius', def: 5, max: 500, run: modifySmooth },
  'sel:expand': { title: 'Expand Selection', label: 'Expand By', def: 5, max: 500, run: modifyExpand },
  'sel:contract': { title: 'Contract Selection', label: 'Contract By', def: 5, max: 500, run: modifyContract },
};

function ModifyDialog({ kind }: { kind: string }) {
  const m = MODIFY[kind];
  const [v, setV] = useState(m.def);
  return (
    <Dialog title={m.title} onOk={withDoc((ds) => m.run(ds, v))}>
      <div class="kv"><label>{m.label}</label><NumField value={v} min={1} max={m.max} unit="px" onChange={setV} /></div>
    </Dialog>
  );
}

type Preset = 'color' | 'highlights' | 'midtones' | 'shadows';
type AddMode = 'replace' | 'add' | 'subtract';

function ColorRangeDialog() {
  const ds = cur()!;
  const [color, setColor] = useState(fg.value);
  const [fuzz, setFuzz] = useState(40);
  const [preset, setPreset] = useState<Preset>('color');
  const [mode, setMode] = useState<AddMode>('replace');
  // Small flattened copy for the live preview.
  const small = useMemo(() => {
    const f = flatten(ds.doc, Math.min(1, 200 / Math.max(ds.doc.width, ds.doc.height)), false);
    return ctx2d(f).getImageData(0, 0, f.width, f.height);
  }, []);
  const target: ColorRangeTarget = preset === 'color' ? color : preset;
  const preview = useMemo(() => {
    const n = small.width * small.height, a = colorRangeAlpha(small.data, n, rangeSpec(target), fuzz);
    const c = makeCanvas(small.width, small.height), x = ctx2d(c), img = x.createImageData(small.width, small.height);
    for (let p = 0; p < n; p++) { img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = a[p]; img.data[p * 4 + 3] = 255; }
    x.putImageData(img, 0, 0);
    return c.toDataURL();
  }, [target, fuzz]);
  const pick = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect();
    const px = Math.floor(((e.clientX - r.left) / r.width) * small.width), py = Math.floor(((e.clientY - r.top) / r.height) * small.height);
    const i = (py * small.width + px) * 4, d = small.data;
    setColor('#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''));
    setPreset('color');
  };
  return (
    <Dialog title="Color Range" onOk={() => colorRange(ds, target, fuzz, mode)}>
      <div class="kv">
        <label>Select</label>
        <Seg value={preset} onChange={setPreset} options={[{ v: 'color', label: 'Sampled' }, { v: 'highlights', label: 'Highlights' }, { v: 'midtones', label: 'Midtones' }, { v: 'shadows', label: 'Shadows' }]} />
        {preset === 'color' && <><label>Color</label><div class="row"><Swatch value={color} onChange={setColor} /><span style={{ color: 'var(--muted)' }}>or click the preview</span></div></>}
        {preset === 'color' && <><label>Fuzziness</label><div class="row"><input type="range" min={0} max={200} value={fuzz} onInput={(e) => setFuzz(+(e.target as HTMLInputElement).value)} /><b>{fuzz}</b></div></>}
        <label>Mode</label>
        <Seg value={mode} onChange={setMode} options={[{ v: 'replace', label: 'New' }, { v: 'add', label: 'Add' }, { v: 'subtract', label: 'Subtract' }]} />
        <label>Preview</label>
        <img src={preview} onClick={pick} style={{ maxWidth: 200, maxHeight: 200, cursor: 'crosshair', imageRendering: 'pixelated', borderRadius: 4 }} />
      </div>
    </Dialog>
  );
}

function SaveDialog() {
  const ds = cur()!;
  const [name, setName] = useState(`Alpha ${(ds.channels?.length ?? 0) + 1}`);
  return (
    <Dialog title="Save Selection" onOk={() => saveSelection(ds, name)}>
      <div class="kv"><label>Name</label><input class="text-in" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></div>
    </Dialog>
  );
}

function LoadDialog() {
  const ds = cur()!;
  const chans = ds.channels ?? [];
  const [i, setI] = useState(chans.length - 1);
  const [mode, setMode] = useState<SelMode>('replace');
  const [invert, setInvert] = useState(false);
  return (
    <Dialog title="Load Selection" onOk={() => loadSelection(ds, i, mode, invert)}>
      <div class="kv">
        <label>Channel</label>
        <select value={String(i)} onChange={(e) => setI(+(e.target as HTMLSelectElement).value)}>{chans.map((c, j) => <option value={j}>{c.name}</option>)}</select>
        <label>Invert</label><label class="opt"><input type="checkbox" checked={invert} onChange={(e) => setInvert((e.target as HTMLInputElement).checked)} /> Invert</label>
        <label>Operation</label>
        <Seg value={mode} onChange={setMode} options={[{ v: 'replace', label: 'New' }, { v: 'add', label: 'Add' }, { v: 'subtract', label: 'Subtract' }, { v: 'intersect', label: 'Intersect' }]} />
      </div>
    </Dialog>
  );
}

/** Mount once next to <Dialogs/>; renders the 'sel:*' dialogs. */
export function SelectDialogs() {
  const d = dialog.value;
  if (!d || !d.kind.startsWith('sel:') || !cur()) return null;
  if (MODIFY[d.kind]) return <ModifyDialog kind={d.kind} key={d.kind} />;
  if (d.kind === 'sel:colorRange') return <ColorRangeDialog />;
  if (d.kind === 'sel:save') return <SaveDialog />;
  if (d.kind === 'sel:load') return <LoadDialog />;
  return null;
}
