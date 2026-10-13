import { signal } from '@preact/signals';
import { GripHorizontal, GripVertical, LassoSelect, Magnet, WandSparkles } from 'lucide-preact';
import type { Tool, PEvent, OverlayCtx, ToolMeta } from './types';
import { view } from './types';
import { cur, touch } from '../core/store';
import { setSelection, deselect, alphaCanvas, SelMode } from '../core/selection';
import { gradientMagnitude, snapToEdge, edgePath, floodWindow } from '../core/selectops';
import { flatten } from '../core/render';
import { ctx2d, makeCanvas } from '../core/util';
import { Slider } from '../ui/controls';
import { ants } from './select';
import { ACCENT } from './move';

// Single row/column marquee, Polygonal and Magnetic Lasso, Quick Selection.

type Pt = { x: number; y: number };
const modeOf = (e: PEvent): SelMode => (e.shift && e.alt ? 'intersect' : e.shift ? 'add' : e.alt ? 'subtract' : 'replace');
const hint = (t: string) => <span class="opt" style={{ color: 'var(--muted)' }}>{t}</span>;
const flatImage = () => { const ds = cur()!; const f = flatten(ds.doc, 1, false); return ctx2d(f).getImageData(0, 0, f.width, f.height); };

function line(o: OverlayCtx, pts: Pt[], close = false) {
  const { ctx } = o;
  ctx.beginPath();
  pts.forEach((p, i) => { const s = o.toScreen(p.x, p.y); if (i) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y); });
  if (close) ctx.closePath();
  ants(ctx, o.time);
}

function finish(pts: Pt[], mode: SelMode) {
  const ds = cur();
  if (!ds) return;
  if (pts.length < 3) { if (mode === 'replace') deselect(ds); return; }
  const p = new Path2D();
  pts.forEach((pt, i) => (i ? p.lineTo(pt.x, pt.y) : p.moveTo(pt.x, pt.y)));
  p.closePath();
  setSelection(ds, p, mode);
}

const nearScreen = (a: Pt, b: Pt, px = 8) => { const s = view.toScreen(a.x, a.y), t = view.toScreen(b.x, b.y); return Math.hypot(s.x - t.x, s.y - t.y) <= px; };

// Single Row / Single Column marquee

function lineMarquee(row: boolean): Tool {
  return {
    cursor: () => 'crosshair',
    down(e) {
      const ds = cur();
      if (!ds) return;
      const p = new Path2D();
      if (row) p.rect(0, Math.floor(e.y), ds.doc.width, 1);
      else p.rect(Math.floor(e.x), 0, 1, ds.doc.height);
      setSelection(ds, p, modeOf(e));
    },
  };
}

// Polygonal Lasso

let poly: Pt[] = [], polyMode: SelMode = 'replace', polyHover: Pt | null = null;

function constrain(from: Pt, to: Pt): Pt {
  const dx = to.x - from.x, dy = to.y - from.y, a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  const len = dx * Math.cos(a) + dy * Math.sin(a);
  return { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len };
}

function polyClose() { const pts = poly; poly = []; finish(pts, polyMode); touch(); }

export const polyLassoTool: Tool = {
  cursor: () => 'crosshair',
  down(e) {
    if (!poly.length) { polyMode = modeOf(e); poly = [{ x: e.x, y: e.y }]; return touch(false); }
    if (poly.length >= 3 && nearScreen(poly[0], e)) return polyClose();
    poly.push(e.shift ? constrain(poly[poly.length - 1], e) : { x: e.x, y: e.y });
    touch(false);
  },
  move(e) { polyHover = { x: e.x, y: e.y }; touch(false); },
  hover(e) { polyHover = e.shift && poly.length ? constrain(poly[poly.length - 1], e) : { x: e.x, y: e.y }; if (poly.length) touch(false); },
  dbl() {
    // The double-click's own clicks already added (near-)duplicate points.
    while (poly.length > 1 && nearScreen(poly[poly.length - 1], poly[poly.length - 2], 3)) poly.pop();
    if (poly.length) polyClose();
  },
  key(e) {
    if (!poly.length) return false;
    if (e.key === 'Enter') { polyClose(); return true; }
    if (e.key === 'Escape') { poly = []; touch(false); return true; }
    if (e.key === 'Backspace' || e.key === 'Delete') { poly.pop(); touch(false); return true; }
    return false;
  },
  deactivate() { poly = []; polyHover = null; },
  overlay(o) {
    if (!poly.length) return;
    line(o, polyHover ? [...poly, polyHover] : poly);
    if (poly.length >= 3 && polyHover && nearScreen(poly[0], polyHover)) {
      const s = o.toScreen(poly[0].x, poly[0].y);
      o.ctx.beginPath(); o.ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
      o.ctx.strokeStyle = ACCENT; o.ctx.lineWidth = 2; o.ctx.stroke();
    }
  },
};

// Magnetic Lasso: after the first click, moving the mouse lays an edge-following path.

export const magnetic = signal({ width: 10, frequency: 40 });
let mag: { g: Float32Array; W: number; H: number; pts: Pt[]; anchors: number[]; live: Pt[]; mode: SelMode } | null = null;

function magLive(e: Pt) {
  if (!mag) return;
  const { g, W, H, pts } = mag, a = pts[pts.length - 1];
  const b = snapToEdge(g, W, H, e.x, e.y, magnetic.value.width);
  // shortcut: very long jumps (fast flicks) fall back to a straight segment to keep Dijkstra cheap.
  mag.live = Math.hypot(b.x - a.x, b.y - a.y) > 400 ? [b] : edgePath(g, W, H, a, b, magnetic.value.width);
  if (Math.hypot(b.x - a.x, b.y - a.y) >= magnetic.value.frequency) magAnchor();
}

function magAnchor() {
  if (!mag || !mag.live.length) return;
  mag.pts.push(...mag.live);
  mag.anchors.push(mag.pts.length - 1);
  mag.live = [];
}

function magClose() {
  if (!mag) return;
  magAnchor();
  const { pts, mode } = mag;
  mag = null;
  finish(pts, mode);
  touch();
}

export const magneticLassoTool: Tool = {
  cursor: () => 'crosshair',
  down(e) {
    const ds = cur();
    if (!ds) return;
    if (!mag) {
      const img = flatImage(), W = img.width, H = img.height, g = gradientMagnitude(img.data, W, H);
      const p = snapToEdge(g, W, H, e.x, e.y, magnetic.value.width);
      mag = { g, W, H, pts: [p], anchors: [0], live: [], mode: modeOf(e) };
      return touch(false);
    }
    if (mag.pts.length > 2 && nearScreen(mag.pts[0], e)) return magClose();
    magLive(e);
    magAnchor();
    touch(false);
  },
  move(e) { if (mag) { magLive(e); touch(false); } },
  hover(e) { if (mag) { magLive(e); touch(false); } },
  dbl() { magClose(); },
  key(e) {
    if (!mag) return false;
    if (e.key === 'Enter') { magClose(); return true; }
    if (e.key === 'Escape') { mag = null; touch(false); return true; }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (mag.anchors.length > 1) { mag.anchors.pop(); mag.pts.length = mag.anchors[mag.anchors.length - 1] + 1; mag.live = []; }
      else mag = null;
      touch(false);
      return true;
    }
    return false;
  },
  deactivate() { mag = null; },
  overlay(o) {
    if (!mag) return;
    line(o, [...mag.pts, ...mag.live]);
    const { ctx } = o;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ACCENT; ctx.lineWidth = 1;
    for (const i of mag.anchors) { const s = o.toScreen(mag.pts[i].x, mag.pts[i].y); ctx.fillRect(s.x - 2.5, s.y - 2.5, 5, 5); ctx.strokeRect(s.x - 2.5, s.y - 2.5, 5, 5); }
  },
};

// Quick Selection: brush-like strokes that flood similar colors near the brush.

export const quickSel = signal({ size: 30, tolerance: 32 });
let qs: { d: Uint8ClampedArray; W: number; H: number; acc: Uint8Array; view: HTMLCanvasElement; last: Pt; mode: SelMode } | null = null;
let qsHover: Pt | null = null;

function qsDab(p: Pt) {
  if (!qs) return;
  const { size, tolerance } = quickSel.value;
  const win = Math.max(4, size * 2); // window of 4x brush size around the dab
  floodWindow(qs.d, qs.W, qs.H, p.x, p.y, tolerance, win, qs.acc);
  // Copy just the window into the preview canvas.
  const x0 = Math.max(0, Math.floor(p.x) - win), y0 = Math.max(0, Math.floor(p.y) - win);
  const x1 = Math.min(qs.W, Math.floor(p.x) + win + 1), y1 = Math.min(qs.H, Math.floor(p.y) + win + 1);
  if (x1 <= x0 || y1 <= y0) return;
  const img = new ImageData(x1 - x0, y1 - y0);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = ((y - y0) * (x1 - x0) + x - x0) * 4;
    img.data[i] = 139; img.data[i + 1] = 92; img.data[i + 2] = 246; img.data[i + 3] = qs.acc[y * qs.W + x]; // ACCENT tint
  }
  ctx2d(qs.view).putImageData(img, x0, y0);
}

function qsTo(p: Pt) {
  if (!qs) return;
  const a = qs.last, dist = Math.hypot(p.x - a.x, p.y - a.y), step = Math.max(2, quickSel.value.size / 4);
  for (let t = step; t <= dist; t += step) qsDab({ x: a.x + ((p.x - a.x) * t) / dist, y: a.y + ((p.y - a.y) * t) / dist });
  if (dist >= step) qs.last = p;
}

export const quickSelectionTool: Tool = {
  cursor: () => 'crosshair',
  down(e) {
    const ds = cur();
    if (!ds) return;
    const img = flatImage();
    // Like Photoshop: the first stroke makes a new selection, later strokes add; Alt subtracts.
    const mode: SelMode = e.alt ? 'subtract' : e.shift || ds.mask ? 'add' : 'replace';
    qs = { d: img.data, W: img.width, H: img.height, acc: new Uint8Array(img.width * img.height), view: makeCanvas(img.width, img.height), last: { x: e.x, y: e.y }, mode };
    qsDab(e);
    touch(false);
  },
  move(e) { qsHover = { x: e.x, y: e.y }; if (qs) qsTo(e); touch(false); },
  hover(e) { qsHover = { x: e.x, y: e.y }; touch(false); },
  up() {
    const ds = cur();
    if (!qs || !ds) return;
    const { acc, W, H, mode } = qs;
    qs = null;
    setSelection(ds, alphaCanvas(acc, W, H), mode);
  },
  deactivate() { qs = null; qsHover = null; },
  overlay(o) {
    const { ctx } = o;
    if (qs) {
      const m = o.matrix;
      ctx.save();
      ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
      ctx.globalAlpha = 0.35;
      ctx.imageSmoothingEnabled = o.zoom < 1;
      ctx.drawImage(qs.view, 0, 0, qs.W, qs.H);
      ctx.restore();
    }
    if (qsHover) {
      const p = o.toScreen(qsHover.x, qsHover.y);
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, (quickSel.value.size * o.zoom) / 2), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    }
  },
};

export const SELECT_TOOLS: ToolMeta[] = [
  { id: 'rowMarquee', label: 'Single Row Marquee', key: 'M', group: 'marquee', icon: GripHorizontal, tool: lineMarquee(true), options: () => hint('Click to select a 1 px row · Shift adds · Alt subtracts') },
  { id: 'colMarquee', label: 'Single Column Marquee', key: 'M', group: 'marquee', icon: GripVertical, tool: lineMarquee(false), options: () => hint('Click to select a 1 px column · Shift adds · Alt subtracts') },
  { id: 'polyLasso', label: 'Polygonal Lasso', key: 'L', group: 'lasso', icon: LassoSelect, tool: polyLassoTool, options: () => hint('Click to add points · Shift snaps to 45° · double-click, Enter or click the start to close · Backspace undoes a point · Esc cancels') },
  {
    id: 'magneticLasso', label: 'Magnetic Lasso', key: 'L', group: 'lasso', icon: Magnet, tool: magneticLassoTool,
    options: () => {
      const m = magnetic.value;
      return (
        <>
          <Slider label="Width" value={m.width} min={1} max={40} unit="px" onChange={(v) => (magnetic.value = { ...m, width: v })} />
          <Slider label="Frequency" value={m.frequency} min={5} max={200} unit="px" onChange={(v) => (magnetic.value = { ...m, frequency: v })} />
          {hint('Click to start, then move along an edge · click adds an anchor · Enter or double-click closes')}
        </>
      );
    },
  },
  {
    id: 'quickSelection', label: 'Quick Selection', key: 'W', group: 'wand', icon: WandSparkles, tool: quickSelectionTool,
    options: () => {
      const q = quickSel.value;
      return (
        <>
          <Slider label="Size" value={q.size} min={2} max={300} unit="px" onChange={(v) => (quickSel.value = { ...q, size: v })} />
          <Slider label="Tolerance" value={q.tolerance} min={0} max={255} onChange={(v) => (quickSel.value = { ...q, tolerance: v })} />
          {hint('Paint over an area to select it · Alt subtracts')}
        </>
      );
    },
  },
];
