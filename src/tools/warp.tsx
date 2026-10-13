import { signal } from '@preact/signals';
import { Spline } from 'lucide-preact';
import type { Tool, PEvent, OverlayCtx, ToolMeta } from './types';
import { view } from './types';
import type { DocState, RasterLayer } from '../core/types';
import { cur, commit, touch, activeLayer, toast, jumpTo, dialog } from '../core/store';
import { editablePixels } from '../core/ops';
import { pixelMatrix } from '../core/selection';
import { bounds, findLayer, makeCanvas, ctx2d, type Rect } from '../core/util';
import { renderQuad, renderWarp, patchMesh, bezierPatch, gridFromQuad, presetGrid, identityGrid, boundsOf, WARP_PRESETS, type Pt, type Quad, type WarpPreset } from '../core/warp';
import { ACCENT } from './move';
import { Seg, Slider } from '../ui/controls';
import type { Command } from '../ui/commands';

// Edit > Transform > Skew / Distort / Perspective / Warp. A session captures the active layer as
// doc-aligned pixels, shows handles on its box, and previews into the layer itself (at reduced
// resolution for big layers). Apply renders at 1:1 and commits; Cancel restores the last history step.

export type TransformMode = 'skew' | 'distort' | 'perspective' | 'warp';
export const transformMode = signal<TransformMode>('distort');
export const warpOpts = signal<{ preset: WarpPreset; bend: number }>({ preset: 'None', bend: 50 });
/** True while a transform session is open (drives the options bar). */
export const transformActive = signal(false);

interface Session {
  ds: DocState;
  id: string;
  src: HTMLCanvasElement; // full-res, 1 px per doc px
  psrc: HTMLCanvasElement; // preview copy
  pscale: number;
  box: Rect;
  quad: Quad;
  grid: Pt[];
}
let S: Session | null = null;
const PREVIEW_PX = 2e6;
const MAX_SIDE = 16000;

const layer = () => (S ? (findLayer(S.ds.doc, S.id) as RasterLayer | null) : null);

function begin(): boolean {
  const ds = cur(), l0 = activeLayer(ds);
  if (!ds || !l0) { toast('Select a layer to transform', 'error'); return false; }
  if (l0.type === 'group') { toast('Transform one layer at a time: groups are not supported', 'error'); return false; }
  const r = editablePixels(l0, ds); // rasterizes vector/text layers (with a toast)
  if (!r) return false;
  const b = bounds(r);
  const x0 = Math.floor(b.x), y0 = Math.floor(b.y);
  const w = Math.max(1, Math.min(MAX_SIDE, Math.ceil(b.x + b.w) - x0)), h = Math.max(1, Math.min(MAX_SIDE, Math.ceil(b.y + b.h) - y0));
  const src = makeCanvas(w, h), x = ctx2d(src);
  x.setTransform(new DOMMatrix().translateSelf(-x0, -y0).multiplySelf(pixelMatrix(r)));
  x.drawImage(r.canvas, 0, 0);
  const pscale = Math.min(1, Math.sqrt(PREVIEW_PX / (w * h)));
  let psrc = src;
  if (pscale < 1) {
    psrc = makeCanvas(Math.max(1, Math.round(w * pscale)), Math.max(1, Math.round(h * pscale)));
    ctx2d(psrc).drawImage(src, 0, 0, psrc.width, psrc.height);
  }
  const box = { x: x0, y: y0, w, h };
  const quad: Quad = [{ x: x0, y: y0 }, { x: x0 + w, y: y0 }, { x: x0 + w, y: y0 + h }, { x: x0, y: y0 + h }];
  S = { ds, id: r.id, src, psrc, pscale, box, quad, grid: identityGrid(x0, y0, w, h) };
  Object.assign(r, { canvas: src, x: x0, y: y0, w, h, rotation: 0 });
  transformActive.value = true;
  touch();
  return true;
}

/** Render the current quad/grid into the layer: preview resolution, or 1:1 when `final`. */
function render(final = false) {
  const l = layer();
  if (!S || !l) return;
  const warp = transformMode.value === 'warp';
  const b = boundsOf(warp ? patchMesh(S.grid, 24) : S.quad);
  // Epsilon keeps float noise (e.g. 249.9999) from growing the layer by a pixel on every apply.
  const x0 = Math.floor(b.x + 1e-6), y0 = Math.floor(b.y + 1e-6);
  const w = Math.max(1, Math.min(MAX_SIDE, Math.ceil(b.x + b.w - 1e-6) - x0)), h = Math.max(1, Math.min(MAX_SIDE, Math.ceil(b.y + b.h - 1e-6) - y0));
  const s = final ? 1 : S.pscale, src = final ? S.src : S.psrc;
  const out = makeCanvas(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
  if (warp) renderWarp(src, S.grid, out, x0, y0, s);
  else renderQuad(src, S.quad, out, x0, y0, s);
  Object.assign(l, { canvas: out, x: x0, y: y0, w, h, rotation: 0 });
}

let raf = 0;
function schedule() {
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; render(); touch(false); });
}

const LABELS: Record<TransformMode, string> = { skew: 'Skew', distort: 'Distort', perspective: 'Perspective', warp: 'Warp' };

export function applyTransform() {
  if (!S) return;
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  const ds = S.ds;
  if (layer()) { render(true); commit(LABELS[transformMode.value], ds); }
  S = null;
  transformActive.value = false;
  touch();
}

export function cancelTransform() {
  if (!S) return;
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  const ds = S.ds;
  S = null;
  transformActive.value = false;
  jumpTo(ds.hIndex, ds); // the session never committed, so the last step is the pre-transform state
}

export function setTransformMode(m: TransformMode) {
  const prev = transformMode.value;
  transformMode.value = m;
  if (S && prev !== m) {
    if (m === 'warp') S.grid = gridFromQuad(S.quad);
    else if (prev === 'warp') { const g = S.grid; S.quad = [{ ...g[0] }, { ...g[3] }, { ...g[15] }, { ...g[12] }]; }
    schedule();
  }
  touch();
}

function setPreset(preset: WarpPreset, bend = warpOpts.value.bend) {
  warpOpts.value = { preset, bend };
  if (!S) return;
  if (transformMode.value !== 'warp') transformMode.value = 'warp';
  const b = S.box;
  S.grid = presetGrid(preset, b.x, b.y, b.w, b.h, bend);
  schedule();
}

/** Open a transform session on the active layer in `mode` and switch to the transform tool. */
export async function startTransform(mode: TransformMode) {
  if (S && S.ds !== cur()) applyTransform();
  if (!S && !begin()) return;
  setTransformMode(mode);
  const { setTool } = await import('./index'); // dynamic: tools/index registers this module
  setTool('transform');
}

// Handles: quad modes use 0-3 corners + 4-7 edge midpoints (top, right, bottom, left);
// warp uses the 16 grid points.
const EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0]];
function handles(): Pt[] {
  if (!S) return [];
  if (transformMode.value === 'warp') return S.grid;
  const q = S.quad;
  return [...q, ...EDGES.map(([a, b]) => ({ x: (q[a].x + q[b].x) / 2, y: (q[a].y + q[b].y) / 2 }))];
}
function hit(e: PEvent): number {
  const hs = handles();
  let best = -1, bd = 8;
  hs.forEach((p, i) => { const s = view.toScreen(p.x, p.y), d = Math.hypot(s.x - e.sx, s.y - e.sy); if (d <= bd) { bd = d; best = i; } });
  return best;
}

// Warp corners carry their tangent handles and the nearest interior point.
const WARP_FOLLOW: Record<number, number[]> = { 0: [1, 4, 5], 3: [2, 7, 6], 12: [8, 13, 9], 15: [11, 14, 10] };
const H_PARTNER = [1, 0, 3, 2], V_PARTNER = [3, 2, 1, 0];

let drag: { h: number; start: PEvent; quad: Quad; grid: Pt[] } | null = null;

const add = (p: Pt, dx: number, dy: number): Pt => ({ x: p.x + dx, y: p.y + dy });

export const transformTool: Tool = {
  cursor: (e) => (e && S && hit(e) >= 0 ? 'crosshair' : S ? 'move' : 'default'),
  down(e) {
    if (!S && !begin()) return;
    drag = { h: hit(e), start: e, quad: S!.quad.map((p) => ({ ...p })) as Quad, grid: S!.grid.map((p) => ({ ...p })) };
  },
  move(e) {
    if (!S || !drag) return;
    const dx = e.x - drag.start.x, dy = e.y - drag.start.y, h = drag.h, mode = transformMode.value;
    const q = drag.quad.map((p) => ({ ...p })) as Quad;
    if (h < 0) {
      // Dragging away from a handle moves the whole thing.
      if (mode === 'warp') S.grid = drag.grid.map((p) => add(p, dx, dy));
      else S.quad = q.map((p) => add(p, dx, dy)) as Quad;
    } else if (mode === 'warp') {
      const g = drag.grid.map((p) => ({ ...p }));
      for (const k of [h, ...(WARP_FOLLOW[h] ?? [])]) g[k] = add(g[k], dx, dy);
      S.grid = g;
    } else if (h >= 4) {
      const [a, b] = EDGES[h - 4];
      if (mode === 'distort') { q[a] = add(q[a], dx, dy); q[b] = add(q[b], dx, dy); }
      else {
        // Skew (and Perspective's edge handles): slide the edge along its own direction.
        const ex = q[b].x - q[a].x, ey = q[b].y - q[a].y, len = Math.hypot(ex, ey) || 1;
        const t = (dx * ex + dy * ey) / len;
        q[a] = add(q[a], (t * ex) / len, (t * ey) / len); q[b] = add(q[b], (t * ex) / len, (t * ey) / len);
      }
      S.quad = q;
    } else {
      const horiz = Math.abs(dx) >= Math.abs(dy);
      if (mode === 'distort') q[h] = add(q[h], dx, dy);
      else if (mode === 'skew') q[h] = horiz ? add(q[h], dx, 0) : add(q[h], 0, dy);
      else if (horiz) { q[h] = add(q[h], dx, 0); const p = H_PARTNER[h]; q[p] = add(q[p], -dx, 0); }
      else { q[h] = add(q[h], 0, dy); const p = V_PARTNER[h]; q[p] = add(q[p], 0, -dy); }
      S.quad = q;
    }
    schedule();
  },
  up() { drag = null; },
  key(e) {
    if (!S) return false;
    if (e.key === 'Enter') { applyTransform(); return true; }
    if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ')) { cancelTransform(); return true; }
    return false;
  },
  deactivate() { applyTransform(); }, // Photoshop applies a pending transform when you switch tools
  overlay(o: OverlayCtx) {
    if (!S || S.ds !== cur()) return;
    const { ctx } = o;
    const sp = (p: Pt) => o.toScreen(p.x, p.y);
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1.25;
    const dot = (p: Pt, square: boolean, r = 4) => {
      const s = sp(p);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      if (square) ctx.rect(Math.round(s.x) - r, Math.round(s.y) - r, r * 2, r * 2); else ctx.arc(s.x, s.y, r - 0.5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    };
    if (transformMode.value === 'warp') {
      const g = S.grid;
      ctx.beginPath();
      for (const t of [0, 1 / 3, 2 / 3, 1]) for (const across of [false, true]) {
        for (let k = 0; k <= 24; k++) {
          const s = sp(across ? bezierPatch(g, t, k / 24) : bezierPatch(g, k / 24, t));
          if (k) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y);
        }
      }
      ctx.stroke();
      ctx.strokeStyle = ACCENT + 'aa';
      ctx.beginPath();
      for (const [c, list] of Object.entries(WARP_FOLLOW)) for (const k of list.slice(0, 2)) {
        const a = sp(g[+c]), b = sp(g[k]);
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      ctx.strokeStyle = ACCENT;
      g.forEach((p, i) => dot(p, i in WARP_FOLLOW, i in WARP_FOLLOW ? 4 : 3.5));
      return;
    }
    ctx.beginPath();
    S.quad.forEach((p, i) => { const s = sp(p); if (i) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y); });
    ctx.closePath();
    ctx.stroke();
    handles().forEach((p, i) => dot(p, true, i < 4 ? 4 : 3.5));
  },
};

function TransformOptions() {
  const mode = transformMode.value, wo = warpOpts.value, active = transformActive.value;
  return (
    <>
      <Seg<TransformMode> value={mode} onChange={setTransformMode} options={(['skew', 'distort', 'perspective', 'warp'] as TransformMode[]).map((v) => ({ v, label: LABELS[v] }))} />
      {mode === 'warp' && (
        <>
          <span class="opt"><label>Warp</label>
            <select value={wo.preset} onChange={(e) => setPreset((e.target as HTMLSelectElement).value as WarpPreset)}>{WARP_PRESETS.map((p) => <option value={p}>{p}</option>)}</select>
          </span>
          {wo.preset !== 'None' && <Slider label="Bend" value={wo.bend} min={-100} max={100} unit="%" onChange={(v) => setPreset(wo.preset, v)} />}
        </>
      )}
      {active ? (
        <>
          <button class="btn ghost" onClick={cancelTransform}>Cancel</button>
          <button class="btn primary" onClick={applyTransform}>Apply</button>
        </>
      ) : <span class="opt" style={{ color: 'var(--muted)' }}>Click the canvas to transform the active layer · Enter applies · Esc cancels</span>}
    </>
  );
}

export const WARP_TOOLS: ToolMeta[] = [
  { id: 'transform', group: 'move', label: 'Transform', key: '', icon: Spline, tool: transformTool, options: TransformOptions },
];

const hasLayer = () => !!activeLayer();
export const WARP_COMMANDS: Command[] = [
  { id: 'transformSkew', label: 'Skew', run: () => void startTransform('skew'), enabled: hasLayer },
  { id: 'transformDistort', label: 'Distort', run: () => void startTransform('distort'), enabled: hasLayer },
  { id: 'transformPerspective', label: 'Perspective', run: () => void startTransform('perspective'), enabled: hasLayer },
  { id: 'transformWarp', label: 'Warp', run: () => void startTransform('warp'), enabled: hasLayer },
  { id: 'liquify', label: 'Liquify…', keys: 'Mod+Shift+X', run: () => { applyTransform(); dialog.value = { kind: 'liquify' }; }, enabled: hasLayer },
];
