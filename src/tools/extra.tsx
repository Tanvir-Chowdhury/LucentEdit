import { signal } from '@preact/signals';
import { PenLine, Plus, Minus, ChevronsUpDown, MousePointer, Crosshair, Ruler, RotateCw } from 'lucide-preact';
import type { Tool, PEvent, OverlayCtx, ToolMeta } from './types';
import { view } from './types';
import type { PathNode, ShapeLayer } from '../core/types';
import { cur, commit, touch, fg, shapeOpts, activeLayer, toast } from '../core/store';
import { newPath, addLayer, toPathProps } from '../core/ops';
import { flatten } from '../core/render';
import { ctx2d } from '../core/util';
import { moveTool, ACCENT, drawPill } from './move';
import { editTarget, mapper, renormalize, hitNode, drawNodes } from './vector';

// Pen variants, anchor tools, measuring tools and Rotate View (Photoshop groups pen, eyedropper, hand).

// Freeform Pen: drag to draw; the stroke is simplified and smoothed into a bezier path.

let free: { x: number; y: number }[] = [];

function simplify(pts: { x: number; y: number }[], eps: number): { x: number; y: number }[] {
  // Ramer-Douglas-Peucker.
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let idx = 0, dmax = 0;
  const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((b.x - a.x) * (a.y - pts[i].y) - (a.x - pts[i].x) * (b.y - a.y)) / L;
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax <= eps) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}

/** Catmull-Rom through points -> smooth bezier nodes. */
export function smoothNodes(pts: { x: number; y: number }[], closed: boolean): PathNode[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const tx = (next.x - prev.x) / 6, ty = (next.y - prev.y) / 6;
    return { x: p.x, y: p.y, ix: p.x - tx, iy: p.y - ty, ox: p.x + tx, oy: p.y + ty, smooth: true };
  });
}

const freeformTool: Tool = {
  cursor: () => 'crosshair',
  down(e) { free = [{ x: e.x, y: e.y }]; },
  move(e) { free.push({ x: e.x, y: e.y }); touch(false); },
  up() {
    const ds = cur();
    if (ds && free.length > 2) {
      const first = free[0], last = free[free.length - 1];
      const closed = Math.hypot(first.x - last.x, first.y - last.y) * view.zoom < 12;
      const pts = simplify(free, 2.5 / view.zoom);
      if (closed && pts.length > 2) pts.pop();
      const l = newPath([{ closed, nodes: smoothNodes(pts, closed) }], closed
        ? { fill: fg.value, stroke: null }
        : { fill: null, stroke: { paint: fg.value, width: Math.max(1, shapeOpts.value.strokeWidth), cap: 'round', join: 'round' } });
      l.name = 'Freeform Path';
      addLayer(l, ds);
      commit('Freeform Pen');
    }
    free = [];
    touch(false);
  },
  overlay(o) {
    if (free.length < 2) return;
    o.ctx.beginPath();
    free.forEach((p, i) => { const s = o.toScreen(p.x, p.y); i ? o.ctx.lineTo(s.x, s.y) : o.ctx.moveTo(s.x, s.y); });
    o.ctx.strokeStyle = ACCENT; o.ctx.lineWidth = 1.5; o.ctx.stroke();
  },
};

// Add / Delete Anchor and Convert Point act on the selected path or shape.

function pathTarget(): ShapeLayer | null {
  const l = editTarget();
  if (!l) { toast('Select a shape or path layer first', 'error'); return null; }
  if (l.shape !== 'path') Object.assign(l, toPathProps(l));
  return l;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const addAnchorTool: Tool = {
  cursor: () => 'crosshair',
  down(e) {
    const l = pathTarget();
    if (!l?.paths) return;
    const mp = mapper(l);
    let best = { d: Infinity, sp: -1, i: -1, t: 0 };
    l.paths.forEach((sp, si) => {
      const n = sp.nodes, segs = sp.closed ? n.length : n.length - 1;
      for (let i = 0; i < segs; i++) {
        const a = n[i], b = n[(i + 1) % n.length];
        for (let k = 1; k < 40; k++) {
          const t = k / 40, u = 1 - t;
          const x = u * u * u * a.x + 3 * u * u * t * a.ox + 3 * u * t * t * b.ix + t * t * t * b.x;
          const y = u * u * u * a.y + 3 * u * u * t * a.oy + 3 * u * t * t * b.iy + t * t * t * b.y;
          const p = mp.toDoc(x, y), s = view.toScreen(p.x, p.y);
          const d = Math.hypot(s.x - e.sx, s.y - e.sy);
          if (d < best.d) best = { d, sp: si, i, t };
        }
      }
    });
    if (best.d > 8) return toast('Click on the path outline to add an anchor');
    // Split the cubic at t (de Casteljau) and insert the new node.
    const sp = l.paths[best.sp], a = sp.nodes[best.i], b = sp.nodes[(best.i + 1) % sp.nodes.length], t = best.t;
    const p01 = { x: lerp(a.x, a.ox, t), y: lerp(a.y, a.oy, t) }, p12 = { x: lerp(a.ox, b.ix, t), y: lerp(a.oy, b.iy, t) }, p23 = { x: lerp(b.ix, b.x, t), y: lerp(b.iy, b.y, t) };
    const q0 = { x: lerp(p01.x, p12.x, t), y: lerp(p01.y, p12.y, t) }, q1 = { x: lerp(p12.x, p23.x, t), y: lerp(p12.y, p23.y, t) };
    const m = { x: lerp(q0.x, q1.x, t), y: lerp(q0.y, q1.y, t) };
    a.ox = p01.x; a.oy = p01.y; b.ix = p23.x; b.iy = p23.y;
    sp.nodes.splice(best.i + 1, 0, { x: m.x, y: m.y, ix: q0.x, iy: q0.y, ox: q1.x, oy: q1.y, smooth: true });
    renormalize(l);
    commit('Add Anchor Point');
  },
  overlay: (o) => anchorsOverlay(o),
};

const deleteAnchorTool: Tool = {
  cursor: () => 'crosshair',
  down(e) {
    const l = pathTarget();
    const h = l && hitNode(l, e);
    if (!l?.paths || !h || h.part !== 'anchor') return;
    if (h.sp.nodes.length <= 2) return toast('A path needs at least two anchor points', 'error');
    h.sp.nodes.splice(h.sp.nodes.indexOf(h.n), 1);
    renormalize(l);
    commit('Delete Anchor Point');
  },
  overlay: (o) => anchorsOverlay(o),
};

const convertPointTool: Tool = {
  cursor: () => 'default',
  down(e) {
    const l = pathTarget();
    const h = l && hitNode(l, e);
    if (!l || !h || h.part !== 'anchor') return;
    const n = h.n, nodes = h.sp.nodes, i = nodes.indexOf(n);
    const isCorner = n.ix === n.x && n.iy === n.y && n.ox === n.x && n.oy === n.y;
    if (isCorner) {
      const prev = nodes[(i - 1 + nodes.length) % nodes.length], next = nodes[(i + 1) % nodes.length];
      const dx = (next.x - prev.x) / 4, dy = (next.y - prev.y) / 4;
      Object.assign(n, { ix: n.x - dx, iy: n.y - dy, ox: n.x + dx, oy: n.y + dy, smooth: true });
    } else Object.assign(n, { ix: n.x, iy: n.y, ox: n.x, oy: n.y, smooth: false });
    renormalize(l);
    commit('Convert Point');
  },
  overlay: (o) => anchorsOverlay(o),
};

function anchorsOverlay(o: OverlayCtx) {
  const l = editTarget();
  if (!l || l.shape !== 'path') return;
  const mp = mapper(l);
  for (const sp of l.paths ?? []) drawNodes(o, sp.nodes, -1, (x, y) => mp.toDoc(x, y));
}

// Color Sampler: up to 10 sample points shown in the Info panel. Alt-click removes one.

export const samplers = signal<{ x: number; y: number }[]>([]);

export function sampleAt(x: number, y: number): [number, number, number, number] | null {
  const ds = cur();
  if (!ds) return null;
  const f = flatten(ds.doc, 1, true);
  if (x < 0 || y < 0 || x >= f.width || y >= f.height) return null;
  const d = ctx2d(f).getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  return [d[0], d[1], d[2], d[3]];
}

const samplerTool: Tool = {
  cursor: () => 'crosshair',
  down(e) {
    const list = samplers.value;
    const hit = list.findIndex((p) => { const s = view.toScreen(p.x, p.y); return Math.hypot(s.x - e.sx, s.y - e.sy) < 8; });
    if (e.alt) { if (hit >= 0) samplers.value = list.filter((_, i) => i !== hit); }
    else if (hit < 0) {
      if (list.length >= 10) return toast('Up to 10 color samplers', 'error');
      samplers.value = [...list, { x: Math.floor(e.x), y: Math.floor(e.y) }];
    }
    touch(false);
  },
  overlay(o) {
    samplers.value.forEach((p, i) => {
      const s = o.toScreen(p.x + 0.5, p.y + 0.5), c = o.ctx;
      c.strokeStyle = '#000'; c.lineWidth = 3;
      c.beginPath(); c.arc(s.x, s.y, 6, 0, Math.PI * 2); c.moveTo(s.x - 10, s.y); c.lineTo(s.x + 10, s.y); c.moveTo(s.x, s.y - 10); c.lineTo(s.x, s.y + 10); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
      c.font = '700 11px "Inter Variable", sans-serif'; c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 3;
      c.strokeText(String(i + 1), s.x + 8, s.y + 16); c.fillText(String(i + 1), s.x + 8, s.y + 16);
    });
  },
};

// Ruler: measure distance and angle; "Straighten" rotates the active layer to level the line.

export const ruler = signal<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);

export function rulerInfo() {
  const r = ruler.value;
  if (!r) return null;
  const dx = r.b.x - r.a.x, dy = r.b.y - r.a.y;
  return { dx, dy, length: Math.hypot(dx, dy), angle: (-Math.atan2(dy, dx) * 180) / Math.PI };
}

export function straightenLayer() {
  const info = rulerInfo(), l = activeLayer();
  if (!info || !l || l.locked || l.type === 'group') return toast('Draw a ruler line and select a layer', 'error');
  // Rotate so the measured line becomes horizontal.
  let a = info.angle;
  if (a > 90) a -= 180; else if (a < -90) a += 180;
  l.rotation = (((l.rotation + a) % 360) + 360) % 360;
  ruler.value = null;
  commit('Straighten');
}

const rulerTool: Tool = {
  cursor: () => 'crosshair',
  down(e) { ruler.value = { a: { x: e.x, y: e.y }, b: { x: e.x, y: e.y } }; },
  move(e) {
    const r = ruler.value;
    if (!r) return;
    let { x, y } = e;
    if (e.shift) {
      const ang = Math.round(Math.atan2(y - r.a.y, x - r.a.x) / (Math.PI / 4)) * (Math.PI / 4), d = Math.hypot(x - r.a.x, y - r.a.y);
      x = r.a.x + Math.cos(ang) * d; y = r.a.y + Math.sin(ang) * d;
    }
    ruler.value = { a: r.a, b: { x, y } };
    touch(false);
  },
  up() { touch(); },
  key(e) { if (e.key === 'Escape' && ruler.value) { ruler.value = null; touch(); return true; } return false; },
  overlay(o) {
    const r = ruler.value, info = rulerInfo();
    if (!r || !info) return;
    const a = o.toScreen(r.a.x, r.a.y), b = o.toScreen(r.b.x, r.b.y), c = o.ctx;
    c.strokeStyle = '#000'; c.lineWidth = 3; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
    for (const p of [a, b]) { c.beginPath(); c.moveTo(p.x - 5, p.y); c.lineTo(p.x + 5, p.y); c.moveTo(p.x, p.y - 5); c.lineTo(p.x, p.y + 5); c.stroke(); }
    drawPill(c, `${info.length.toFixed(1)} px  ·  ${info.angle.toFixed(1)}°`, b.x, b.y + 22);
  },
};

// Rotate View (R): spins the canvas on screen only. Shift snaps to 15°; double-click or Esc resets.

let rotStart: { ang: number; rot: number } | null = null;
const viewCenter = () => ({ x: view.width / 2, y: view.height / 2 });

const rotateViewTool: Tool = {
  cursor: () => 'grab',
  down(e) {
    const ds = cur();
    if (!ds) return;
    const c = viewCenter();
    rotStart = { ang: Math.atan2(e.sy - c.y, e.sx - c.x), rot: ds.view.rotation ?? 0 };
  },
  move(e) {
    const ds = cur();
    if (!ds || !rotStart) return;
    const c = viewCenter();
    let r = rotStart.rot + ((Math.atan2(e.sy - c.y, e.sx - c.x) - rotStart.ang) * 180) / Math.PI;
    if (e.shift) r = Math.round(r / 15) * 15;
    ds.view.rotation = ((r % 360) + 360) % 360;
    touch();
  },
  up() { rotStart = null; },
  dbl() { resetRotation(); },
  key(e) { if (e.key === 'Escape' && cur()?.view.rotation) { resetRotation(); return true; } return false; },
};

export function resetRotation() {
  const ds = cur();
  if (ds) { ds.view.rotation = 0; touch(); }
}

export const EXTRA_TOOLS: ToolMeta[] = [
  { id: 'pathSelect', group: 'path', label: 'Path Selection', key: 'A', icon: MousePointer, tool: moveTool },
  { id: 'freeformPen', group: 'pen', label: 'Freeform Pen', key: 'P', icon: PenLine, tool: freeformTool },
  { id: 'addAnchor', group: 'pen', label: 'Add Anchor Point', key: '', icon: Plus, tool: addAnchorTool },
  { id: 'deleteAnchor', group: 'pen', label: 'Delete Anchor Point', key: '', icon: Minus, tool: deleteAnchorTool },
  { id: 'convertPoint', group: 'pen', label: 'Convert Point', key: '', icon: ChevronsUpDown, tool: convertPointTool },
  {
    id: 'colorSampler', group: 'eyedropper', label: 'Color Sampler', key: 'I', icon: Crosshair, tool: samplerTool,
    options: () => (
      <>
        <span class="opt" style={{ color: 'var(--muted)' }}>Click to add a sampler (up to 10) · Alt-click removes · readings in the Info panel</span>
        <button class="btn ghost" onClick={() => { samplers.value = []; touch(false); }}>Clear All</button>
      </>
    ),
  },
  {
    id: 'ruler', group: 'eyedropper', label: 'Ruler', key: 'I', icon: Ruler, tool: rulerTool,
    options: () => {
      const i = rulerInfo();
      return (
        <>
          {i ? <span class="opt">W <b>{i.dx.toFixed(1)}</b> H <b>{i.dy.toFixed(1)}</b> L <b>{i.length.toFixed(1)}</b> A <b>{i.angle.toFixed(1)}°</b></span>
            : <span class="opt" style={{ color: 'var(--muted)' }}>Drag to measure · Shift snaps to 45°</span>}
          <button class="btn" disabled={!i} onClick={straightenLayer}>Straighten Layer</button>
          <button class="btn ghost" disabled={!i} onClick={() => { ruler.value = null; touch(false); }}>Clear</button>
        </>
      );
    },
  },
  {
    id: 'rotateView', group: 'hand', label: 'Rotate View', key: 'R', icon: RotateCw, tool: rotateViewTool,
    options: () => (
      <>
        <span class="opt">Rotation <b>{Math.round(cur()?.view.rotation ?? 0)}°</b></span>
        <button class="btn" onClick={resetRotation}>Reset View</button>
        <span class="opt" style={{ color: 'var(--muted)' }}>Drag to rotate the canvas view · Shift snaps 15° · Esc resets</span>
      </>
    ),
  },
];

