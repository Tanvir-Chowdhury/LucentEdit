import type { Tool, PEvent, OverlayCtx } from './types';
import { textEditing, view } from './types';
import type { PathNode, ShapeLayer, SubPath, TextLayer } from '../core/types';
import { cur, commit, touch, activeLayer, fg, shapeOpts, select, strokeColor } from '../core/store';
import { layerMatrix } from '../core/util';
import { newShape, newPath, newText, addLayer, layerAt, toPathProps } from '../core/ops';
import { normalizePaths, pathBounds, mapPaths } from '../core/paths';
import { ACCENT, drawPill } from './move';

// Shape tools, Pen, Direct Selection and Type.

let start: PEvent | null = null;
let box: { x: number; y: number; w: number; h: number } | null = null;
let lineEnd: { x: number; y: number } | null = null;

export const shapeTool: Tool = {
  cursor: () => 'crosshair',
  down(e) { start = e; box = null; lineEnd = null; },
  move(e) {
    if (!start) return;
    const kind = shapeOpts.value.shape;
    if (kind === 'line') {
      let { x, y } = e;
      if (e.shift) {
        const a = Math.round(Math.atan2(y - start.y, x - start.x) / (Math.PI / 4)) * (Math.PI / 4), d = Math.hypot(x - start.x, y - start.y);
        x = start.x + Math.cos(a) * d; y = start.y + Math.sin(a) * d;
      }
      lineEnd = { x, y };
    } else {
      let w = e.x - start.x, h = e.y - start.y;
      if (e.shift) { const s = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * s; h = Math.sign(h || 1) * s; }
      box = e.alt ? { x: start.x - Math.abs(w), y: start.y - Math.abs(h), w: Math.abs(w) * 2, h: Math.abs(h) * 2 }
        : { x: Math.min(start.x, start.x + w), y: Math.min(start.y, start.y + h), w: Math.abs(w), h: Math.abs(h) };
    }
    touch(false);
  },
  up(e) {
    const ds = cur();
    if (!ds || !start) return;
    const o = shapeOpts.value;
    const stroke = o.stroke ? { paint: strokeColor.value, width: o.strokeWidth, join: 'round' as const, cap: 'round' as const } : null;
    if (o.shape === 'line') {
      const end = lineEnd ?? { x: e.x + 100, y: e.y };
      const n = (x: number, y: number): PathNode => ({ x, y, ix: x, iy: y, ox: x, oy: y });
      const l = newPath([{ closed: false, nodes: [n(start.x, start.y), n(end.x, end.y)] }], {
        fill: null, stroke: { paint: o.stroke ? strokeColor.value : fg.value, width: Math.max(1, o.strokeWidth), cap: 'round', join: 'round' }, name: 'Line',
      });
      addLayer(l, ds);
    } else {
      const b = box && box.w >= 2 && box.h >= 2 ? box : { x: start.x - 50, y: start.y - 50, w: 100, h: 100 };
      const l = newShape({
        shape: o.shape, ...b, fill: o.fill ? fg.value : null, stroke,
        radius: o.shape === 'rect' ? o.radius : undefined,
        sides: o.shape === 'polygon' ? o.sides : o.shape === 'star' ? o.points : undefined,
        inner: o.shape === 'star' ? o.inner : undefined,
      });
      if (!l.fill && !l.stroke) l.stroke = { paint: fg.value, width: 2 };
      addLayer(l, ds);
    }
    start = null; box = null; lineEnd = null;
    commit('New Shape');
  },
  overlay(o) {
    const { ctx } = o;
    if (start && lineEnd) {
      const a = o.toScreen(start.x, start.y), b = o.toScreen(lineEnd.x, lineEnd.y);
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      drawPill(ctx, `${Math.round(Math.hypot(lineEnd.x - start.x, lineEnd.y - start.y))} px`, b.x, b.y + 22);
    }
    if (!box) return;
    const a = o.toScreen(box.x, box.y), b = o.toScreen(box.x + box.w, box.y + box.h);
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5;
    ctx.beginPath();
    const kind = shapeOpts.value.shape;
    if (kind === 'ellipse') ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, (b.x - a.x) / 2, (b.y - a.y) / 2, 0, 0, Math.PI * 2);
    else if (kind === 'polygon' || kind === 'star') {
      const n = kind === 'star' ? shapeOpts.value.points * 2 : shapeOpts.value.sides;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n, r = kind === 'star' && i % 2 ? shapeOpts.value.inner : 1;
        const x = (a.x + b.x) / 2 + (Math.cos(ang) * r * (b.x - a.x)) / 2, y = (a.y + b.y) / 2 + (Math.sin(ang) * r * (b.y - a.y)) / 2;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
    } else ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.stroke();
    drawPill(ctx, `${Math.round(box.w)} × ${Math.round(box.h)}`, (a.x + b.x) / 2, b.y + 20);
  },
};

// Pen: click for corners, drag for smooth points, click the first point to close.

let penNodes: PathNode[] = [];
let penDrag = false;
let penHover: { x: number; y: number } | null = null;

function finishPen(closed: boolean) {
  const ds = cur();
  if (ds && penNodes.length >= 2) {
    const l = newPath([{ closed, nodes: penNodes }], closed
      ? { fill: fg.value, stroke: null }
      : { fill: null, stroke: { paint: fg.value, width: Math.max(1, shapeOpts.value.strokeWidth), cap: 'round', join: 'round' } });
    l.name = 'Path';
    addLayer(l, ds);
    commit('Pen Path');
  }
  penNodes = [];
  penHover = null;
  touch();
}

export const penTool: Tool = {
  cursor: () => 'crosshair',
  down(e) {
    let { x, y } = e;
    const last = penNodes[penNodes.length - 1];
    if (penNodes.length >= 2) {
      const f = penNodes[0], s = { x: e.sx, y: e.sy };
      const fs = view.toScreen(f.x, f.y);
      if (fs && Math.hypot(fs.x - s.x, fs.y - s.y) < 9) { finishPen(true); return; }
    }
    if (e.shift && last) {
      const a = Math.round(Math.atan2(y - last.y, x - last.x) / (Math.PI / 4)) * (Math.PI / 4), d = Math.hypot(x - last.x, y - last.y);
      x = last.x + Math.cos(a) * d; y = last.y + Math.sin(a) * d;
    }
    penNodes.push({ x, y, ix: x, iy: y, ox: x, oy: y });
    penDrag = true;
    touch(false);
  },
  move(e) {
    const n = penNodes[penNodes.length - 1];
    if (!penDrag || !n) return;
    n.ox = e.x; n.oy = e.y;
    n.ix = 2 * n.x - e.x; n.iy = 2 * n.y - e.y;
    n.smooth = true;
    touch(false);
  },
  up() { penDrag = false; },
  hover(e) { penHover = { x: e.x, y: e.y }; touch(false); },
  dbl() { finishPen(false); },
  key(e) {
    if ((e.key === 'Enter' || e.key === 'Escape') && penNodes.length) { finishPen(false); return true; }
    if (e.key === 'Backspace' && penNodes.length) { penNodes.pop(); touch(false); return true; }
    return false;
  },
  deactivate() { if (penNodes.length >= 2) finishPen(false); penNodes = []; },
  overlay(o) {
    const { ctx } = o;
    if (!penNodes.length) return;
    ctx.beginPath();
    const s0 = o.toScreen(penNodes[0].x, penNodes[0].y);
    ctx.moveTo(s0.x, s0.y);
    for (let i = 1; i < penNodes.length; i++) {
      const a = penNodes[i - 1], b = penNodes[i];
      const c1 = o.toScreen(a.ox, a.oy), c2 = o.toScreen(b.ix, b.iy), p = o.toScreen(b.x, b.y);
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
    }
    if (penHover && !penDrag) {
      const a = penNodes[penNodes.length - 1];
      const c1 = o.toScreen(a.ox, a.oy), p = o.toScreen(penHover.x, penHover.y);
      ctx.bezierCurveTo(c1.x, c1.y, p.x, p.y, p.x, p.y);
    }
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5; ctx.stroke();
    drawNodes(o, penNodes, penNodes.length - 1, (x, y) => ({ x, y }));
  },
};

function drawNodes(o: OverlayCtx, nodes: PathNode[], active: number, map: (x: number, y: number) => { x: number; y: number }) {
  const { ctx } = o;
  nodes.forEach((n, i) => {
    const p = o.toScreen(map(n.x, n.y).x, map(n.x, n.y).y);
    if (i === active || (selNode && selNode.n === n)) {
      for (const [hx, hy] of [[n.ix, n.iy], [n.ox, n.oy]]) {
        if (hx === n.x && hy === n.y) continue;
        const h = map(hx, hy), hs = o.toScreen(h.x, h.y);
        ctx.strokeStyle = ACCENT; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(hs.x, hs.y); ctx.stroke();
        ctx.beginPath(); ctx.arc(hs.x, hs.y, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      }
    }
    ctx.fillStyle = i === active || (selNode && selNode.n === n) ? ACCENT : '#fff';
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5;
    ctx.fillRect(p.x - 3.5, p.y - 3.5, 7, 7);
    ctx.strokeRect(p.x - 3.5, p.y - 3.5, 7, 7);
  });
}

// Direct Selection: edit anchors and handles of the selected shape.

let selNode: { sp: SubPath; n: PathNode; part: 'anchor' | 'in' | 'out' } | null = null;
let dragging = false;
let dsStart: PEvent | null = null;

function editTarget(): ShapeLayer | null {
  const l = activeLayer();
  return l && l.type === 'shape' && !l.locked ? l : null;
}

/** Natural path coords <-> document coords for a path layer. */
function mapper(l: ShapeLayer) {
  const m = layerMatrix(l), inv = m.inverse();
  const sx = l.w / (l.nw ?? l.w), sy = l.h / (l.nh ?? l.h);
  return {
    toDoc: (x: number, y: number) => { const p = m.transformPoint({ x: x * sx, y: y * sy }); return { x: p.x, y: p.y }; },
    toNat: (x: number, y: number) => { const p = inv.transformPoint({ x, y }); return { x: p.x / sx, y: p.y / sy }; },
  };
}

/** Refit the layer box to its edited path, keeping the drawing where it is. */
function renormalize(l: ShapeLayer) {
  const sx = l.w / (l.nw ?? l.w), sy = l.h / (l.nh ?? l.h);
  const local = mapPaths(l.paths ?? [], (x, y) => [x * sx, y * sy]);
  const b = pathBounds(local);
  const m = layerMatrix(l);
  const c = m.transformPoint({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const n = normalizePaths(local);
  l.paths = n.paths;
  l.nw = l.w = Math.max(0.01, b.w);
  l.nh = l.h = Math.max(0.01, b.h);
  l.x = c.x - l.w / 2; l.y = c.y - l.h / 2;
}

function hitNode(l: ShapeLayer, e: PEvent) {
  const mp = mapper(l);
  const near = (x: number, y: number) => {
    const d = mp.toDoc(x, y), s = view.toScreen(d.x, d.y);
    return Math.hypot(s.x - e.sx, s.y - e.sy) < 7;
  };
  for (const sp of l.paths ?? []) for (const n of sp.nodes) {
    if (selNode?.n === n) {
      if (near(n.ix, n.iy) && (n.ix !== n.x || n.iy !== n.y)) return { sp, n, part: 'in' as const };
      if (near(n.ox, n.oy) && (n.ox !== n.x || n.oy !== n.y)) return { sp, n, part: 'out' as const };
    }
    if (near(n.x, n.y)) return { sp, n, part: 'anchor' as const };
  }
  return null;
}

export const directTool: Tool = {
  cursor: () => 'default',
  down(e) {
    const ds = cur();
    if (!ds) return;
    let l = editTarget();
    if (l && l.shape !== 'path') {
      const h = hitNodeGeneric(l, e);
      if (h) { Object.assign(l, toPathProps(l)); }
    }
    const hit = l && l.shape === 'path' ? hitNode(l, e) : null;
    if (hit && l) {
      if (e.alt && hit.part === 'anchor') {
        // Alt-click toggles between corner and smooth.
        const n = hit.n;
        if (n.ix === n.x && n.iy === n.y && n.ox === n.x && n.oy === n.y) {
          const i = hit.sp.nodes.indexOf(n), nodes = hit.sp.nodes;
          const prev = nodes[(i - 1 + nodes.length) % nodes.length], next = nodes[(i + 1) % nodes.length];
          const dx = (next.x - prev.x) / 4, dy = (next.y - prev.y) / 4;
          Object.assign(n, { ix: n.x - dx, iy: n.y - dy, ox: n.x + dx, oy: n.y + dy, smooth: true });
        } else Object.assign(n, { ix: n.x, iy: n.y, ox: n.x, oy: n.y, smooth: false });
        renormalize(l);
        commit('Convert Point');
        selNode = hit;
        return;
      }
      selNode = hit; dragging = true; dsStart = e;
      touch(false);
      return;
    }
    const target = layerAt(e.x, e.y, ds);
    selNode = null;
    if (target && target.type === 'shape') select([target.id]);
    else if (!target) select([]);
    touch();
  },
  move(e) {
    const l = editTarget();
    if (!dragging || !selNode || !l) return;
    const mp = mapper(l);
    const p = mp.toNat(e.x, e.y);
    const n = selNode.n;
    if (selNode.part === 'anchor') {
      const dx = p.x - n.x, dy = p.y - n.y;
      n.x += dx; n.y += dy; n.ix += dx; n.iy += dy; n.ox += dx; n.oy += dy;
    } else {
      const [k, o] = selNode.part === 'in' ? (['i', 'o'] as const) : (['o', 'i'] as const);
      (n as any)[k + 'x'] = p.x; (n as any)[k + 'y'] = p.y;
      if (n.smooth && !e.alt) {
        const len = Math.hypot((n as any)[o + 'x'] - n.x, (n as any)[o + 'y'] - n.y);
        const ang = Math.atan2(p.y - n.y, p.x - n.x) + Math.PI;
        (n as any)[o + 'x'] = n.x + Math.cos(ang) * len; (n as any)[o + 'y'] = n.y + Math.sin(ang) * len;
      } else if (e.alt) n.smooth = false;
    }
    touch(false);
  },
  up() {
    const l = editTarget();
    if (dragging && l && dsStart) { renormalize(l); commit('Edit Path'); }
    dragging = false;
  },
  key(e) {
    const l = editTarget();
    if ((e.key === 'Delete' || e.key === 'Backspace') && selNode && l?.paths) {
      selNode.sp.nodes.splice(selNode.sp.nodes.indexOf(selNode.n), 1);
      l.paths = l.paths.filter((sp) => sp.nodes.length > 1);
      selNode = null;
      if (l.paths.length) { renormalize(l); commit('Delete Anchor'); }
      return true;
    }
    return false;
  },
  overlay(o) {
    const l = editTarget();
    if (!l) return;
    const paths = l.shape === 'path' ? l.paths ?? [] : (toPathProps(l).paths ?? []);
    const mp = l.shape === 'path' ? mapper(l) : mapper({ ...l, nw: l.w, nh: l.h });
    const { ctx } = o;
    // Path outline
    ctx.beginPath();
    for (const sp of paths) {
      const ns = sp.nodes;
      ns.forEach((n, i) => {
        if (!i) { const p = mp.toDoc(n.x, n.y), s = o.toScreen(p.x, p.y); ctx.moveTo(s.x, s.y); return; }
        const a = ns[i - 1];
        const c1 = mp.toDoc(a.ox, a.oy), c2 = mp.toDoc(n.ix, n.iy), p = mp.toDoc(n.x, n.y);
        const s1 = o.toScreen(c1.x, c1.y), s2 = o.toScreen(c2.x, c2.y), s3 = o.toScreen(p.x, p.y);
        ctx.bezierCurveTo(s1.x, s1.y, s2.x, s2.y, s3.x, s3.y);
      });
      if (sp.closed && ns.length > 1) {
        const a = ns[ns.length - 1], n = ns[0];
        const c1 = mp.toDoc(a.ox, a.oy), c2 = mp.toDoc(n.ix, n.iy), p = mp.toDoc(n.x, n.y);
        const s1 = o.toScreen(c1.x, c1.y), s2 = o.toScreen(c2.x, c2.y), s3 = o.toScreen(p.x, p.y);
        ctx.bezierCurveTo(s1.x, s1.y, s2.x, s2.y, s3.x, s3.y);
      }
    }
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 1; ctx.stroke();
    for (const sp of paths) drawNodes(o, sp.nodes, -1, (x, y) => mp.toDoc(x, y));
  },
};

function hitNodeGeneric(l: ShapeLayer, e: PEvent) {
  const tmp: ShapeLayer = { ...l, ...toPathProps(l) } as ShapeLayer;
  return hitNode(tmp, e);
}

// Type tool

export function beginTextEdit(l: TextLayer) {
  select([l.id]);
  textEditing.value = l.id;
}

let tStart: PEvent | null = null, tBox: { x: number; y: number; w: number; h: number } | null = null;

export const textTool: Tool = {
  cursor: () => 'text',
  down(e) {
    const ds = cur();
    if (!ds) return;
    if (textEditing.value) { textEditing.value = null; return; }
    const hit = layerAt(e.x, e.y, ds);
    if (hit && hit.type === 'text' && !hit.locked) { beginTextEdit(hit); return; }
    tStart = e; tBox = null;
  },
  move(e) {
    if (!tStart) return;
    tBox = { x: Math.min(tStart.x, e.x), y: Math.min(tStart.y, e.y), w: Math.abs(e.x - tStart.x), h: Math.abs(e.y - tStart.y) };
    touch(false);
  },
  up() {
    const ds = cur();
    if (!ds || !tStart) return;
    const boxText = tBox && tBox.w > 10;
    const l = newText('', boxText ? tBox!.x : tStart.x, boxText ? tBox!.y : tStart.y - 0, boxText ? { autoWidth: false, w: tBox!.w } : {});
    if (!boxText) l.y = tStart.y - l.h / 2;
    l.name = 'Text';
    addLayer(l, ds);
    tStart = null; tBox = null;
    beginTextEdit(l);
  },
  overlay(o) {
    if (!tBox) return;
    const a = o.toScreen(tBox.x, tBox.y), b = o.toScreen(tBox.x + tBox.w, tBox.y + tBox.h);
    o.ctx.setLineDash([4, 3]); o.ctx.strokeStyle = ACCENT; o.ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); o.ctx.setLineDash([]);
  },
};
