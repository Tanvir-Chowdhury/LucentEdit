import type { Tool, PEvent, OverlayCtx } from './types';
import { view } from './types';
import type { Layer } from '../core/types';
import { cur, commit, touch, selectedLayers, viewOpts } from '../core/store';
import { layerMatrix, bounds, unionRects, cloneLayers, walk, findLayer, Rect } from '../core/util';
import { layerAt, moveLayer, scaleLayer, duplicateSelected, topLevel } from '../core/ops';
import { fitText } from '../core/render';

// Move tool with Photoshop-style free transform: drag to move (Alt duplicates), handles to
// resize (Shift keeps proportions, Alt from center), drag outside a corner to rotate.

/** Canvas overlay accent (matches --accent in styles.css). */
export const ACCENT = '#3d84f7';
const HANDLE = 8;

type Mode = 'move' | 'resize' | 'rotate' | 'band' | null;
interface Target { layers: Layer[]; box: { x: number; y: number; w: number; h: number; rotation: number }; single: Layer | null }

let mode: Mode = null;
let start: PEvent | null = null;
let startLayers: Layer[] = [];
let target: Target | null = null;
let handle = -1;
let applied = { x: 0, y: 0 };
let guides: { x?: number; y?: number }[] = [];
let band: Rect | null = null;
let hoverId: string | null = null;
let readout = '';
let startAngle = 0;

/** The transform box: a single layer's rotated box, or the union of several. */
export function transformTarget(): Target | null {
  const ds = cur();
  if (!ds) return null;
  const sel = topLevel(selectedLayers(ds), ds).filter((l) => l.visible);
  if (!sel.length) return null;
  if (sel.length === 1 && sel[0].type !== 'group') {
    const l = sel[0];
    return { layers: sel, box: { x: l.x, y: l.y, w: l.w, h: l.h, rotation: l.rotation }, single: l };
  }
  const r = unionRects(sel.map(bounds))!;
  return { layers: sel, box: { ...r, rotation: 0 }, single: null };
}

// Handles: 0 tl, 1 t, 2 tr, 3 r, 4 br, 5 b, 6 bl, 7 l (local fractions).
const HP: [number, number][] = [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]];

function boxMatrix(b: Target['box']) { return layerMatrix(b); }

function handlePoints(t: Target) {
  const m = boxMatrix(t.box);
  return HP.map(([fx, fy]) => {
    const p = m.transformPoint({ x: fx * t.box.w, y: fy * t.box.h });
    return view.toScreen(p.x, p.y);
  });
}

/** A short edge on screen drops its middle handle so corners stay clickable and readable. */
const shortEdge = (pts: { x: number; y: number }[], i: number) => Math.hypot(pts[i - 1].x - pts[(i + 1) % 8].x, pts[i - 1].y - pts[(i + 1) % 8].y) < 40;

function hitHandle(t: Target, e: PEvent): { handle: number; rotate: boolean } | null {
  const pts = handlePoints(t);
  for (let i = 0; i < 8; i++) {
    if (i % 2 && shortEdge(pts, i)) continue; // hidden middle handle (see drawTransformBox)
    if (Math.abs(pts[i].x - e.sx) <= HANDLE && Math.abs(pts[i].y - e.sy) <= HANDLE) return { handle: i, rotate: false };
  }
  if (t.single && t.single.type !== 'group') {
    for (const i of [0, 2, 4, 6]) {
      const d = Math.hypot(pts[i].x - e.sx, pts[i].y - e.sy);
      if (d > HANDLE && d < HANDLE + 18) {
        // Only outside the box counts as a rotate zone.
        const local = boxMatrix(t.box).inverse().transformPoint({ x: e.x, y: e.y });
        if (local.x < 0 || local.y < 0 || local.x > t.box.w || local.y > t.box.h) return { handle: i, rotate: true };
      }
    }
  }
  return null;
}

const ROT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M5 12a7 7 0 1 1 2.05 4.95" fill="none" stroke="white" stroke-width="4"/><path d="M5 12a7 7 0 1 1 2.05 4.95" fill="none" stroke="black" stroke-width="2"/><path d="M2 9l3 4 4-3" fill="none" stroke="black" stroke-width="2"/></svg>')}") 12 12, crosshair`;

function handleCursor(i: number, rotation: number) {
  const names = ['nwse', 'ns', 'nesw', 'ew'];
  const base = [0, 1, 2, 3, 0, 1, 2, 3][i];
  const steps = Math.round(((rotation % 180) + 180) / 45);
  return `${names[(base + steps) % 4]}-resize`;
}

/** Snap a moving rect to document and sibling edges/centers. */
function snap(r: Rect, exclude: Set<string>): { dx: number; dy: number } {
  guides = [];
  const ds = cur();
  if (!ds || !viewOpts.value.snap) return { dx: 0, dy: 0 };
  const th = 6 / view.zoom;
  const xs = [0, ds.doc.width / 2, ds.doc.width], ys = [0, ds.doc.height / 2, ds.doc.height];
  if (viewOpts.value.guides) { xs.push(...(ds.doc.guides?.v ?? [])); ys.push(...(ds.doc.guides?.h ?? [])); }
  for (const [l] of walk(ds.doc.layers)) {
    if (exclude.has(l.id) || !l.visible || l.type === 'group') continue;
    const b = bounds(l);
    xs.push(b.x, b.x + b.w / 2, b.x + b.w);
    ys.push(b.y, b.y + b.h / 2, b.y + b.h);
  }
  const best = (vals: number[], cands: number[]) => {
    let d = Infinity, at = 0;
    for (const v of vals) for (const c of cands) if (Math.abs(c - v) < Math.abs(d)) { d = c - v; at = c; }
    return Math.abs(d) <= th ? { d, at } : null;
  };
  const bx = best([r.x, r.x + r.w / 2, r.x + r.w], xs);
  const by = best([r.y, r.y + r.h / 2, r.y + r.h], ys);
  if (bx) guides.push({ x: bx.at });
  if (by) guides.push({ y: by.at });
  return { dx: bx?.d ?? 0, dy: by?.d ?? 0 };
}

function restoreStart() {
  // Put the transformed layers back to their state at pointer-down.
  const ds = cur();
  if (!ds) return;
  for (const s of startLayers) {
    const l = findLayer(ds.doc, s.id);
    if (!l) continue;
    const fresh = cloneLayers([s])[0];
    Object.assign(l, fresh);
  }
}

export const moveTool: Tool = {
  cursor: (e) => {
    if (!e) return 'default';
    const t = transformTarget();
    const h = t && hitHandle(t, e);
    if (h) return h.rotate ? ROT_CURSOR : handleCursor(h.handle, t!.box.rotation);
    return 'default';
  },

  hover(e) {
    const l = viewOpts.value.autoSelect || e.ctrl ? layerAt(e.x, e.y, cur(), false) : null;
    const id = l?.id ?? null;
    if (id !== hoverId) { hoverId = id; touch(false); }
  },

  down(e) {
    const ds = cur();
    if (!ds) return;
    start = e;
    applied = { x: 0, y: 0 };
    readout = '';
    target = transformTarget();
    const h = target && !target.layers.some((l) => l.locked) ? hitHandle(target, e) : null;
    if (h && target) {
      mode = h.rotate ? 'rotate' : 'resize';
      handle = h.handle;
      startLayers = cloneLayers(target.layers);
      const c = boxMatrix(target.box).transformPoint({ x: target.box.w / 2, y: target.box.h / 2 });
      startAngle = Math.atan2(e.y - c.y, e.x - c.x);
      return;
    }
    const auto = viewOpts.value.autoSelect !== e.ctrl;
    const hit = auto ? layerAt(e.x, e.y, ds, false) : null;
    if (auto) {
      if (hit) {
        if (e.shift) ds.selected = ds.selected.includes(hit.id) ? ds.selected.filter((i) => i !== hit.id) : [...ds.selected, hit.id];
        else if (!ds.selected.includes(hit.id)) ds.selected = [hit.id];
        touch();
      } else {
        // Clicking empty canvas inside the current transform box still moves it.
        const inBox = target && (() => {
          const p = boxMatrix(target.box).inverse().transformPoint({ x: e.x, y: e.y });
          return p.x >= 0 && p.y >= 0 && p.x <= target.box.w && p.y <= target.box.h;
        })();
        if (!inBox) {
          if (!e.shift) ds.selected = [];
          mode = 'band';
          band = { x: e.x, y: e.y, w: 0, h: 0 };
          touch();
          return;
        }
      }
    }
    if (e.alt && ds.selected.length) duplicateSelected(ds);
    target = transformTarget();
    if (!target || target.layers.some((l) => l.locked)) { mode = null; return; }
    mode = 'move';
    startLayers = cloneLayers(target.layers);
  },

  move(e) {
    const ds = cur();
    if (!ds || !start) return;
    if (mode === 'band' && band) {
      band = { x: Math.min(start.x, e.x), y: Math.min(start.y, e.y), w: Math.abs(e.x - start.x), h: Math.abs(e.y - start.y) };
      const hits = ds.doc.layers.filter((l) => {
        if (!l.visible || l.locked) return false;
        const b = bounds(l);
        return b.x < band!.x + band!.w && b.x + b.w > band!.x && b.y < band!.y + band!.h && b.y + b.h > band!.y;
      });
      ds.selected = hits.map((l) => l.id);
      touch();
      return;
    }
    if (!target) return;
    if (mode === 'move') {
      let dx = e.x - start.x, dy = e.y - start.y;
      if (e.shift) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      const ids = new Set<string>();
      for (const l of target.layers) for (const [c] of walk([l])) ids.add(c.id);
      const r = unionRects(startLayers.map(bounds))!;
      const s = snap({ ...r, x: r.x + dx, y: r.y + dy }, ids);
      dx = Math.round(dx + s.dx); dy = Math.round(dy + s.dy);
      for (const l of target.layers) moveLayer(l, dx - applied.x, dy - applied.y);
      applied = { x: dx, y: dy };
      readout = `X ${Math.round(r.x + dx)}  Y ${Math.round(r.y + dy)}`;
      touch(false);
      return;
    }
    if (mode === 'rotate' && target.single) {
      const b = target.box;
      const c = boxMatrix(b).transformPoint({ x: b.w / 2, y: b.h / 2 });
      let deg = b.rotation + ((Math.atan2(e.y - c.y, e.x - c.x) - startAngle) * 180) / Math.PI;
      if (e.shift) deg = Math.round(deg / 15) * 15;
      deg = ((deg % 360) + 360) % 360;
      target.single.rotation = Math.round(deg * 10) / 10;
      readout = `${Math.round(deg)}°`;
      touch(false);
      return;
    }
    if (mode === 'resize') {
      const b = target.box;
      const m = boxMatrix(b);
      const p = m.inverse().transformPoint({ x: e.x, y: e.y });
      const [fx, fy] = HP[handle];
      let L = 0, T = 0, R = b.w, B = b.h;
      if (fx === 0) L = p.x; if (fx === 1) R = p.x;
      if (fy === 0) T = p.y; if (fy === 1) B = p.y;
      if (e.alt) {
        if (fx === 0) R = b.w - L; if (fx === 1) L = b.w - R;
        if (fy === 0) B = b.h - T; if (fy === 1) T = b.h - B;
      }
      const corner = fx !== 0.5 && fy !== 0.5;
      const keepRatio = e.shift !== (target.single?.type === 'raster' && corner && false);
      if (keepRatio && corner) {
        const ratio = b.w / Math.max(1e-6, b.h);
        let w = Math.abs(R - L), h = Math.abs(B - T);
        if (w / ratio > h) h = w / ratio; else w = h * ratio;
        if (e.alt) { L = b.w / 2 - w / 2; R = b.w / 2 + w / 2; T = b.h / 2 - h / 2; B = b.h / 2 + h / 2; }
        else {
          if (fx === 0) L = R - w; else R = L + w;
          if (fy === 0) T = B - h; else B = T + h;
        }
      }
      if (R - L < 1) { if (fx === 0) L = R - 1; else R = L + 1; }
      if (B - T < 1) { if (fy === 0) T = B - 1; else B = T + 1; }
      const nw = R - L, nh = B - T;
      restoreStart();
      if (target.single) {
        const l = target.single;
        const c = m.transformPoint({ x: (L + R) / 2, y: (T + B) / 2 });
        if (l.type === 'text') {
          if (corner) { l.size = Math.max(1, (l as any).size * (nh / b.h)); fitText(l); }
          else if (fx !== 0.5) { l.autoWidth = false; l.w = nw; fitText(l); }
          const nc = { w: l.w, h: l.h };
          l.x = c.x - nc.w / 2; l.y = c.y - nc.h / 2;
          // Keep the fixed edge in place when the text reflows.
          if (!corner && fx !== 0.5) { l.x = c.x - nw / 2; }
          readout = `${Math.round(l.w)} × ${Math.round(l.h)}`;
        } else {
          l.w = nw; l.h = nh;
          l.x = c.x - nw / 2; l.y = c.y - nh / 2;
          readout = `W ${Math.round(nw)}  H ${Math.round(nh)}`;
        }
      } else {
        const sx = nw / b.w, sy = nh / b.h;
        const ox = b.x + (fx === 0 || e.alt ? (e.alt ? b.w / 2 : b.w) : 0);
        const oy = b.y + (fy === 0 || e.alt ? (e.alt ? b.h / 2 : b.h) : 0);
        for (const l of target.layers) scaleLayer(l, fx === 0.5 ? 1 : sx, fy === 0.5 ? 1 : sy, ox, oy);
        readout = `W ${Math.round(nw)}  H ${Math.round(nh)}`;
      }
      touch(false);
    }
  },

  up() {
    const was = mode;
    mode = null;
    band = null;
    guides = [];
    readout = '';
    if (was === 'move' && (applied.x || applied.y)) commit('Move');
    else if (was === 'resize') commit('Free Transform');
    else if (was === 'rotate') commit('Rotate');
    touch();
  },

  overlay(o: OverlayCtx) {
    const ds = cur();
    if (!ds) return;
    const { ctx } = o;
    const polygon = (l: { x: number; y: number; w: number; h: number; rotation: number }) => {
      const m = layerMatrix(l);
      ctx.beginPath();
      [[0, 0], [l.w, 0], [l.w, l.h], [0, l.h]].forEach(([x, y], i) => {
        const p = m.transformPoint({ x, y });
        const s = o.toScreen(p.x, p.y);
        if (i) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y);
      });
      ctx.closePath();
    };
    if (hoverId && !ds.selected.includes(hoverId) && mode == null) {
      const l = findLayer(ds.doc, hoverId);
      if (l) { polygon(l); ctx.strokeStyle = ACCENT; ctx.lineWidth = 1; ctx.stroke(); }
    }
    const sel = selectedLayers(ds);
    if (sel.length > 1) for (const l of sel) { polygon(l); ctx.strokeStyle = ACCENT + '99'; ctx.lineWidth = 1; ctx.stroke(); }
    const t = transformTarget();
    if (t && mode !== 'band') drawTransformBox(o, t.box, !!t.single && t.single.type !== 'group');
    for (const g of guides) {
      ctx.strokeStyle = '#ff3d9a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (g.x != null) { const a = o.toScreen(g.x, -1e5), b = o.toScreen(g.x, 1e5); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      if (g.y != null) { const a = o.toScreen(-1e5, g.y), b = o.toScreen(1e5, g.y); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      ctx.stroke();
    }
    if (band) {
      const a = o.toScreen(band.x, band.y), b = o.toScreen(band.x + band.w, band.y + band.h);
      ctx.fillStyle = ACCENT + '1f';
      ctx.strokeStyle = ACCENT;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.strokeRect(a.x + 0.5, a.y + 0.5, b.x - a.x, b.y - a.y);
    }
    if (readout && t) {
      const m = boxMatrix(t.box);
      const p = m.transformPoint({ x: t.box.w / 2, y: t.box.h });
      const s = o.toScreen(p.x, p.y);
      drawPill(ctx, readout, s.x, s.y + 22);
    }
  },
};

export function drawTransformBox(o: OverlayCtx, box: Target['box'], rotateHint: boolean) {
  const { ctx } = o;
  const m = layerMatrix(box);
  const pts = HP.map(([fx, fy]) => { const p = m.transformPoint({ x: fx * box.w, y: fy * box.h }); return o.toScreen(p.x, p.y); });
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  [0, 2, 4, 6].forEach((i, k) => (k ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y)));
  ctx.closePath();
  ctx.stroke();
  for (const [i, p] of pts.entries()) {
    if (i % 2 && shortEdge(pts, i)) continue;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(Math.round(p.x) - 4, Math.round(p.y) - 4, 8, 8);
    ctx.fill();
    ctx.stroke();
  }
  void rotateHint;
}

export function drawPill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  // Neutral readout chip (like Photoshop's transform info), so it never competes with the artwork.
  ctx.font = '500 11px "Inter Variable", system-ui, sans-serif';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = 'rgba(28,28,31,0.92)';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  (ctx as any).roundRect ? (ctx as any).roundRect(x - w / 2, y - 10, w, 20, 4) : ctx.rect(x - w / 2, y - 10, w, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8e8ea';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
}
