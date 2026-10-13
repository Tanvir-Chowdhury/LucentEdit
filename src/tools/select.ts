import type { Tool, PEvent, OverlayCtx } from './types';
import { cropRect, view } from './types';
import { cur, marquee, wand, touch } from '../core/store';
import { setSelection, magicWand, deselect, SelMode } from '../core/selection';
import { cropDoc } from '../core/ops';
import { ACCENT, drawPill } from './move';
import type { Rect } from '../core/util';

// Marquee, Lasso, Magic Wand and Crop.

const modeOf = (e: PEvent): SelMode => (e.shift && e.alt ? 'intersect' : e.shift ? 'add' : e.alt ? 'subtract' : 'replace');

let start: PEvent | null = null;
let rect: Rect | null = null;
let selMode: SelMode = 'replace';

function dragRect(a: PEvent, b: PEvent): Rect {
  let w = b.x - a.x, h = b.y - a.y;
  if (b.shift && selMode === 'replace') { const s = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * s; h = Math.sign(h || 1) * s; }
  if (b.alt && selMode === 'replace') return { x: a.x - Math.abs(w), y: a.y - Math.abs(h), w: Math.abs(w) * 2, h: Math.abs(h) * 2 };
  return { x: Math.min(a.x, a.x + w), y: Math.min(a.y, a.y + h), w: Math.abs(w), h: Math.abs(h) };
}

export const marqueeTool: Tool = {
  cursor: () => 'crosshair',
  down(e) { start = e; selMode = modeOf(e); rect = null; },
  move(e) { if (start) { rect = dragRect(start, e); touch(false); } },
  up() {
    const ds = cur();
    if (!ds) return;
    if (!rect || rect.w < 1 || rect.h < 1) { if (selMode === 'replace') deselect(ds); }
    else {
      const p = new Path2D();
      if (marquee.value.shape === 'ellipse') p.ellipse(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2, rect.h / 2, 0, 0, Math.PI * 2);
      else p.rect(Math.round(rect.x), Math.round(rect.y), Math.round(rect.w), Math.round(rect.h));
      setSelection(ds, p, selMode);
    }
    start = null; rect = null;
    touch();
  },
  overlay(o) {
    if (!rect) return;
    const { ctx } = o;
    const a = o.toScreen(rect.x, rect.y), b = o.toScreen(rect.x + rect.w, rect.y + rect.h);
    ctx.save();
    ctx.beginPath();
    if (marquee.value.shape === 'ellipse') ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
    else ctx.rect(a.x + 0.5, a.y + 0.5, b.x - a.x, b.y - a.y);
    ants(ctx, o.time);
    ctx.restore();
    drawPill(ctx, `${Math.round(rect.w)} × ${Math.round(rect.h)}`, (a.x + b.x) / 2, b.y + 20);
  },
};

export function ants(ctx: CanvasRenderingContext2D, time: number) {
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -((time / 60) % 8);
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.setLineDash([]);
}

let points: { x: number; y: number }[] = [];

export const lassoTool: Tool = {
  cursor: () => 'crosshair',
  down(e) { selMode = modeOf(e); points = [{ x: e.x, y: e.y }]; },
  move(e) { points.push({ x: e.x, y: e.y }); touch(false); },
  up() {
    const ds = cur();
    if (!ds) return;
    if (points.length < 3) { if (selMode === 'replace') deselect(ds); }
    else {
      const p = new Path2D();
      points.forEach((pt, i) => (i ? p.lineTo(pt.x, pt.y) : p.moveTo(pt.x, pt.y)));
      p.closePath();
      setSelection(ds, p, selMode);
    }
    points = [];
    touch();
  },
  overlay(o) {
    if (points.length < 2) return;
    const { ctx } = o;
    ctx.beginPath();
    points.forEach((pt, i) => { const s = o.toScreen(pt.x, pt.y); if (i) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y); });
    ants(ctx, o.time);
  },
};

export const wandTool: Tool = {
  cursor: () => 'crosshair',
  down(e) {
    const ds = cur();
    if (!ds) return;
    magicWand(ds, e.x, e.y, wand.value.tolerance, wand.value.contiguous, modeOf(e));
  },
};

// Crop: a box with handles; Enter applies, Escape cancels.

let cropDrag: { kind: 'new' | 'move' | 'edge'; fx?: number; fy?: number; startRect: Rect; start: PEvent } | null = null;

export function applyCrop() {
  const r = cropRect.value;
  if (r && r.w >= 1 && r.h >= 1) cropDoc(r);
  cropRect.value = null;
  touch();
}
export function cancelCrop() { cropRect.value = null; touch(); }

function cropHandles(r: Rect) {
  return [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]].map(([fx, fy]) => ({ fx, fy, p: view.toScreen(r.x + fx * r.w, r.y + fy * r.h) }));
}

export const cropTool: Tool = {
  cursor: (e) => {
    const r = cropRect.value;
    if (!r || !e) return 'crosshair';
    const h = cropHandles(r).find((h) => Math.abs(h.p.x - e.sx) < 10 && Math.abs(h.p.y - e.sy) < 10);
    if (h) return h.fx === 0.5 ? 'ns-resize' : h.fy === 0.5 ? 'ew-resize' : (h.fx === h.fy ? 'nwse-resize' : 'nesw-resize');
    if (e.x > r.x && e.y > r.y && e.x < r.x + r.w && e.y < r.y + r.h) return 'move';
    return 'crosshair';
  },
  down(e) {
    const ds = cur();
    if (!ds) return;
    const r = cropRect.value;
    if (r) {
      const h = cropHandles(r).find((h) => Math.abs(h.p.x - e.sx) < 10 && Math.abs(h.p.y - e.sy) < 10);
      if (h) { cropDrag = { kind: 'edge', fx: h.fx, fy: h.fy, startRect: r, start: e }; return; }
      if (e.x > r.x && e.y > r.y && e.x < r.x + r.w && e.y < r.y + r.h) { cropDrag = { kind: 'move', startRect: r, start: e }; return; }
    }
    cropDrag = { kind: 'new', startRect: { x: e.x, y: e.y, w: 0, h: 0 }, start: e };
  },
  move(e) {
    if (!cropDrag) return;
    const s = cropDrag.startRect, dx = e.x - cropDrag.start.x, dy = e.y - cropDrag.start.y;
    if (cropDrag.kind === 'new') cropRect.value = { x: Math.min(s.x, e.x), y: Math.min(s.y, e.y), w: Math.abs(e.x - s.x), h: Math.abs(e.y - s.y) };
    else if (cropDrag.kind === 'move') cropRect.value = { ...s, x: s.x + dx, y: s.y + dy };
    else {
      let { x, y, w, h } = s;
      if (cropDrag.fx === 0) { x += dx; w -= dx; } else if (cropDrag.fx === 1) w += dx;
      if (cropDrag.fy === 0) { y += dy; h -= dy; } else if (cropDrag.fy === 1) h += dy;
      cropRect.value = { x: Math.min(x, x + w), y: Math.min(y, y + h), w: Math.abs(w), h: Math.abs(h) };
    }
    touch(false);
  },
  up() {
    cropDrag = null;
    const r = cropRect.value;
    if (r) cropRect.value = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };
    touch();
  },
  dbl() { applyCrop(); },
  key(e) {
    if (e.key === 'Enter') { applyCrop(); return true; }
    if (e.key === 'Escape') { cancelCrop(); return true; }
    return false;
  },
  deactivate() { cropRect.value = null; },
  overlay(o: OverlayCtx) {
    const ds = cur();
    const r = cropRect.value;
    if (!ds || !r) return;
    const { ctx } = o;
    const a = o.toScreen(r.x, r.y), b = o.toScreen(r.x + r.w, r.y + r.h);
    ctx.save();
    ctx.fillStyle = 'rgba(8,8,12,0.55)';
    ctx.beginPath();
    ctx.rect(-1e4, -1e4, 3e4, 3e4);
    ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const f of [1 / 3, 2 / 3]) {
      ctx.moveTo(a.x + (b.x - a.x) * f, a.y); ctx.lineTo(a.x + (b.x - a.x) * f, b.y);
      ctx.moveTo(a.x, a.y + (b.y - a.y) * f); ctx.lineTo(b.x, a.y + (b.y - a.y) * f);
    }
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    for (const h of cropHandles(r)) { ctx.fillStyle = '#fff'; ctx.fillRect(h.p.x - 4, h.p.y - 4, 8, 8); ctx.strokeStyle = ACCENT; ctx.strokeRect(h.p.x - 4, h.p.y - 4, 8, 8); }
    ctx.restore();
    drawPill(ctx, `${Math.round(r.w)} × ${Math.round(r.h)}  ·  Enter to crop`, (a.x + b.x) / 2, b.y + 20);
  },
};
