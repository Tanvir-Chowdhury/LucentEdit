import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { dialog, cur, commit, activeLayer, toast } from '../core/store';
import { editablePixels, addLayer, newRaster } from '../core/ops';
import { maskForLayer, setSelection, alphaCanvas } from '../core/selection';
import { flatten } from '../core/render';
import { ctx2d, makeCanvas, findLayer } from '../core/util';
import { autoSampleRect, runCaJob, type CaJob, type Rect } from '../core/contentaware';
import type { Command } from './commands';
import { Icon } from './icons';
import { Seg } from './controls';

// Edit > Content-Aware Fill and Select > Subject / Sky (on-device, no ML). Dialog kinds 'ca:*'.

const close = () => (dialog.value = null);
const progress = signal<{ label: string; f: number; cancel: () => void } | null>(null);

/** Run a job in a Web Worker with a cancellable progress modal. Resolves null when cancelled. */
function runJob(job: CaJob, label: string): Promise<{ result: Uint8ClampedArray | Uint8Array | null } | null> {
  return new Promise((resolve, reject) => {
    const inline = () => setTimeout(() => { try { resolve({ result: runCaJob(job) }); } catch (e) { reject(e); } }, 30);
    let w: Worker;
    try { w = new Worker(new URL('../core/contentaware.worker.ts', import.meta.url), { type: 'module' }); }
    catch { toast(`${label}…`); inline(); return; } // no worker support: run on this thread, no cancel
    const done = () => { w.terminate(); progress.value = null; if (dialog.value?.kind === 'ca:progress') close(); };
    w.onmessage = (e) => {
      const m = e.data;
      if ('progress' in m) { if (progress.value) progress.value = { ...progress.value, f: m.progress }; return; }
      done();
      if (m.error) reject(new Error(m.error)); else resolve({ result: m.result });
    };
    w.onerror = (e) => { e.preventDefault(); done(); inline(); }; // worker failed to load: fall back inline
    try {
      w.postMessage(job); // copied, not transferred: the inline fallback may still need the pixels
      progress.value = { label, f: 0, cancel: () => { done(); resolve(null); } };
      dialog.value = { kind: 'ca:progress' };
    } catch (e) { done(); reject(e); }
  });
}

type FillOpts = { auto: boolean; newLayer: boolean; colorAdapt: boolean };

export async function contentAwareFill(o: FillOpts) {
  const ds = cur();
  if (!ds?.mask) return;
  const l = editablePixels(activeLayer(ds), ds); // rasterizes / takes ownership of the pixels
  if (!l) return;
  const { width: W, height: H } = l.canvas;
  const md = ctx2d(maskForLayer(ds, l)!).getImageData(0, 0, W, H).data, alpha = new Uint8Array(W * H);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let p = 0; p < W * H; p++) {
    if (!(alpha[p] = md[p * 4 + 3])) continue;
    const x = p % W, y = (p / W) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) { toast('The selection does not cover this layer', 'error'); return; }
  const region: Rect | null = o.auto ? autoSampleRect({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }, W, H) : null;
  const img = ctx2d(l.canvas).getImageData(0, 0, W, H);
  let res;
  try { res = await runJob({ kind: 'fill', img: { width: W, height: H, data: img.data }, alpha, region, colorAdapt: o.colorAdapt }, 'Content-Aware Fill'); }
  catch (e: any) { toast(`Content-Aware Fill failed: ${e.message ?? e}`, 'error'); return; }
  if (!res?.result) return;
  // Undo/close during the run replaces the layer object: drop the result rather than write a stale layer.
  if (cur() !== ds || findLayer(ds.doc, l.id) !== l || l.canvas.width !== W || l.canvas.height !== H) { toast('Document changed; fill discarded', 'error'); return; }
  const out = new ImageData(new Uint8ClampedArray(res.result.buffer as ArrayBuffer), W, H);
  if (o.newLayer) {
    for (let p = 0; p < W * H; p++) out.data[p * 4 + 3] = (out.data[p * 4 + 3] * alpha[p]) / 255;
    const c = makeCanvas(W, H);
    ctx2d(c).putImageData(out, 0, 0);
    const nl = Object.assign(newRaster(ds, 'Content-Aware Fill', c), { x: l.x, y: l.y, w: l.w, h: l.h, rotation: l.rotation });
    addLayer(nl, ds, l.id);
  } else ctx2d(l.canvas).putImageData(out, 0, 0);
  commit('Content-Aware Fill', ds);
}

export async function selectBy(kind: 'subject' | 'sky') {
  const ds = cur();
  if (!ds) return;
  const name = kind === 'subject' ? 'Subject' : 'Sky';
  const f = flatten(ds.doc, 1, true), { width: W, height: H } = f;
  let res;
  try { res = await runJob({ kind, img: { width: W, height: H, data: ctx2d(f).getImageData(0, 0, W, H).data } }, `Select ${name}`); }
  catch (e: any) { toast(`Select ${name} failed: ${e.message ?? e}`, 'error'); return; }
  if (!res) return;
  const a = res.result as Uint8Array | null;
  if (!a || !a.some((v) => v > 0) || ds.doc.width !== W || ds.doc.height !== H) { toast(`No ${name.toLowerCase()} found (on-device estimate)`); return; }
  setSelection(ds, alphaCanvas(a, W, H), 'replace');
  toast(`${name} selected (on-device estimate)`, 'success');
}

export const CONTENT_AWARE_COMMANDS: Command[] = [
  { id: 'contentAwareFill', label: 'Content-Aware Fill…', run: () => (dialog.value = { kind: 'ca:fill' }), enabled: () => !!cur()?.mask && !!activeLayer() },
  { id: 'selectSubject', label: 'Subject', run: () => void selectBy('subject'), enabled: () => !!cur() },
  { id: 'selectSky', label: 'Sky', run: () => void selectBy('sky'), enabled: () => !!cur() },
];

function useEscape(f: () => void) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); f(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, []);
}

function FillDialog() {
  const [sample, setSample] = useState<'auto' | 'whole'>('auto');
  const [output, setOutput] = useState<'current' | 'new'>('current');
  const [adapt, setAdapt] = useState(true);
  useEscape(close);
  const ok = () => { close(); void contentAwareFill({ auto: sample === 'auto', newLayer: output === 'new', colorAdapt: adapt }); };
  return (
    <div class="backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class="dialog" onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') ok(); }}>
        <div class="dialog-head"><div>Content-Aware Fill</div><button class="icon-btn" onClick={close}><Icon name="x" /></button></div>
        <div class="dialog-body">
          <div class="kv">
            <label>Sampling Area</label>
            <Seg value={sample} onChange={setSample} options={[{ v: 'auto', label: 'Auto', title: 'Band of 3x the selection size around it' }, { v: 'whole', label: 'Whole Layer' }]} />
            <label>Output To</label>
            <Seg value={output} onChange={setOutput} options={[{ v: 'current', label: 'Current Layer' }, { v: 'new', label: 'New Layer' }]} />
            <label>Color</label>
            <label class="opt"><input type="checkbox" checked={adapt} onChange={(e) => setAdapt((e.target as HTMLInputElement).checked)} /> Color Adaptation</label>
          </div>
        </div>
        <div class="dialog-foot"><button class="btn ghost" onClick={close}>Cancel</button><button class="btn primary" onClick={ok}>OK</button></div>
      </div>
    </div>
  );
}

function ProgressDialog() {
  const p = progress.value;
  useEscape(() => progress.value?.cancel());
  if (!p) return null;
  return (
    <div class="backdrop">
      <div class="dialog">
        <div class="dialog-head"><div>{p.label}</div></div>
        <div class="dialog-body">
          <progress max={1} value={p.f || undefined} style={{ width: 260 }} />
        </div>
        <div class="dialog-foot"><button class="btn ghost" onClick={p.cancel}>Cancel</button></div>
      </div>
    </div>
  );
}

/** Mount once next to <Dialogs/>; renders the 'ca:*' dialogs. */
export function ContentAwareDialogs() {
  const d = dialog.value;
  if (!d || !d.kind.startsWith('ca:') || !cur()) return null;
  if (d.kind === 'ca:fill') return <FillDialog />;
  if (d.kind === 'ca:progress') return <ProgressDialog />;
  return null;
}
