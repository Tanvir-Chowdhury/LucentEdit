import type { PathNode, ShapeLayer, SubPath } from './types';

// SVG path data <-> editable bezier nodes, and Path2D construction for shapes.

const node = (x: number, y: number): PathNode => ({ x, y, ix: x, iy: y, ox: x, oy: y });

/** Parse SVG path data into absolute cubic subpaths (arcs and quadratics converted). */
export function parseSvgPath(d: string): SubPath[] {
  const toks = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) ?? [];
  const out: SubPath[] = [];
  let i = 0, cmd = '', cx = 0, cy = 0, sx = 0, sy = 0;
  let cur: SubPath | null = null;
  let lastC: [number, number] | null = null; // last cubic control (for S)
  let lastQ: [number, number] | null = null; // last quad control (for T)
  const num = () => parseFloat(toks[i++]);
  const isNum = () => i < toks.length && !/^[a-zA-Z]$/.test(toks[i]);
  const start = (x: number, y: number) => {
    cur = { nodes: [node(x, y)], closed: false };
    out.push(cur);
  };
  const cubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    if (!cur) start(cx, cy);
    const n = cur!.nodes;
    const last = n[n.length - 1];
    last.ox = x1; last.oy = y1;
    n.push({ x, y, ix: x2, iy: y2, ox: x, oy: y });
    cx = x; cy = y;
  };
  while (i < toks.length) {
    if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++];
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase();
    let C = cmd.toUpperCase();
    if (C === 'Z') {
      if (cur) {
        const n = (cur as SubPath).nodes;
        const f = n[0], l = n[n.length - 1];
        // Merge a duplicated closing node into the first one.
        if (n.length > 1 && Math.abs(f.x - l.x) < 1e-6 && Math.abs(f.y - l.y) < 1e-6) {
          f.ix = l.ix; f.iy = l.iy;
          n.pop();
        }
        (cur as SubPath).closed = true;
      }
      cx = sx; cy = sy; cur = null; lastC = lastQ = null;
      continue;
    }
    if (!isNum()) { i++; continue; }
    do {
      const relx = rel ? cx : 0, rely = rel ? cy : 0;
      switch (C) {
        case 'M': {
          const x = num() + relx, y = num() + rely;
          start(x, y); cx = sx = x; cy = sy = y;
          cmd = rel ? 'l' : 'L';
          C = 'L';
          lastC = lastQ = null;
          break;
        }
        case 'L': { const x = num() + relx, y = num() + rely; cubic(cx, cy, x, y, x, y); lastC = lastQ = null; break; }
        case 'H': { const x = num() + relx; cubic(cx, cy, x, cy, x, cy); lastC = lastQ = null; break; }
        case 'V': { const y = num() + rely; cubic(cx, cy, cx, y, cx, y); lastC = lastQ = null; break; }
        case 'C': {
          const x1 = num() + relx, y1 = num() + rely, x2 = num() + relx, y2 = num() + rely, x = num() + relx, y = num() + rely;
          cubic(x1, y1, x2, y2, x, y); lastC = [x2, y2]; lastQ = null; break;
        }
        case 'S': {
          const x1 = lastC ? 2 * cx - lastC[0] : cx, y1 = lastC ? 2 * cy - lastC[1] : cy;
          const x2 = num() + relx, y2 = num() + rely, x = num() + relx, y = num() + rely;
          cubic(x1, y1, x2, y2, x, y); lastC = [x2, y2]; lastQ = null; break;
        }
        case 'Q': {
          const qx = num() + relx, qy = num() + rely, x = num() + relx, y = num() + rely;
          cubic(cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy), x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x, y);
          lastQ = [qx, qy]; lastC = null; break;
        }
        case 'T': {
          const qx: number = lastQ ? 2 * cx - lastQ[0] : cx, qy: number = lastQ ? 2 * cy - lastQ[1] : cy;
          const x = num() + relx, y = num() + rely;
          cubic(cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy), x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x, y);
          lastQ = [qx, qy]; lastC = null; break;
        }
        case 'A': {
          const rx = num(), ry = num(), rot = num(), large = num(), sweep = num(), x = num() + relx, y = num() + rely;
          for (const b of arcToCubics(cx, cy, rx, ry, rot, !!large, !!sweep, x, y)) cubic(...b);
          cx = x; cy = y; lastC = lastQ = null; break;
        }
        default: i++;
      }
    } while (isNum() && C !== 'Z');
  }
  // Mark nodes whose handles are collinear as smooth, so editing keeps them smooth.
  for (const sp of out) for (const n of sp.nodes) {
    const a = Math.atan2(n.y - n.iy, n.x - n.ix), b = Math.atan2(n.oy - n.y, n.ox - n.x);
    const hasBoth = (n.ix !== n.x || n.iy !== n.y) && (n.ox !== n.x || n.oy !== n.y);
    n.smooth = hasBoth && Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.02;
  }
  return out;
}

type Cubic = [number, number, number, number, number, number];

/** Endpoint arc parameterization -> cubic segments (SVG spec F.6). */
function arcToCubics(x1: number, y1: number, rx: number, ry: number, phiDeg: number, large: boolean, sweep: boolean, x2: number, y2: number): Cubic[] {
  if (!rx || !ry) return [[x1, y1, x2, y2, x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (phiDeg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const sign = large === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const co = sign * Math.sqrt(Math.max(0, num / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const segs = Math.ceil(Math.abs(dt) / (Math.PI / 2));
  const out: Cubic[] = [];
  const d = dt / segs, k = (4 / 3) * Math.tan(d / 4);
  const pt = (t: number) => [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
  const der = (t: number) => [-rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos];
  for (let s = 0; s < segs; s++) {
    const a = t1 + s * d, b = a + d;
    const [ax, ay] = pt(a), [bx, by] = pt(b), [dax, day] = der(a), [dbx, dby] = der(b);
    out.push([ax + k * dax, ay + k * day, bx - k * dbx, by - k * dby, bx, by]);
  }
  return out;
}

function bezierExtents(p0: number, p1: number, p2: number, p3: number): number[] {
  // Roots of the derivative give the extrema of one axis.
  const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0;
  const ts: number[] = [];
  if (Math.abs(a) < 1e-9) { if (Math.abs(b) > 1e-9) ts.push(-c / b); }
  else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) { const s = Math.sqrt(disc); ts.push((-b + s) / (2 * a), (-b - s) / (2 * a)); }
  }
  return ts.filter((t) => t > 0 && t < 1).map((t) => {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  });
}

export function pathBounds(paths: SubPath[]) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const add = (x: number, y: number) => { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); };
  for (const sp of paths) {
    const n = sp.nodes;
    n.forEach((p, i) => {
      add(p.x, p.y);
      const q = n[i + 1] ?? (sp.closed ? n[0] : null);
      if (!q) return;
      bezierExtents(p.x, p.ox, q.ix, q.x).forEach((x) => add(x, p.y));
      bezierExtents(p.y, p.oy, q.iy, q.y).forEach((y) => add(p.x, y));
    });
  }
  if (x1 === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function mapPaths(paths: SubPath[], f: (x: number, y: number) => [number, number]): SubPath[] {
  return paths.map((sp) => ({
    closed: sp.closed,
    nodes: sp.nodes.map((n) => {
      const [x, y] = f(n.x, n.y), [ix, iy] = f(n.ix, n.iy), [ox, oy] = f(n.ox, n.oy);
      return { x, y, ix, iy, ox, oy, smooth: n.smooth };
    }),
  }));
}

/** Move paths so their bounds start at 0,0. Returns the offset and natural size. */
export function normalizePaths(paths: SubPath[]) {
  const b = pathBounds(paths);
  return { paths: mapPaths(paths, (x, y) => [x - b.x, y - b.y]), ...b };
}

function tracePaths(p: Path2D | CanvasRenderingContext2D, paths: SubPath[], sx: number, sy: number) {
  for (const sp of paths) {
    const n = sp.nodes;
    if (!n.length) continue;
    p.moveTo(n[0].x * sx, n[0].y * sy);
    const segs = sp.closed ? n.length : n.length - 1;
    for (let i = 0; i < segs; i++) {
      const a = n[i], b = n[(i + 1) % n.length];
      p.bezierCurveTo(a.ox * sx, a.oy * sy, b.ix * sx, b.iy * sy, b.x * sx, b.y * sy);
    }
    if (sp.closed) p.closePath();
  }
}

/** Shape geometry as editable subpaths in local box coordinates (w x h). */
export function shapeToPaths(l: ShapeLayer): SubPath[] {
  const { w, h } = l;
  if (l.shape === 'path') {
    const sx = l.nw ? w / l.nw : 1, sy = l.nh ? h / l.nh : 1;
    return mapPaths(l.paths ?? [], (x, y) => [x * sx, y * sy]);
  }
  if (l.shape === 'ellipse') {
    const k = 0.5522847498, rx = w / 2, ry = h / 2, cx = rx, cy = ry;
    const pts: [number, number, number, number][] = [[cx, 0, k * rx, 0], [w, cy, 0, k * ry], [cx, h, -k * rx, 0], [0, cy, 0, -k * ry]];
    return [{ closed: true, nodes: pts.map(([x, y, dx, dy]) => ({ x, y, ix: x - dx, iy: y - dy, ox: x + dx, oy: y + dy, smooth: true })) }];
  }
  if (l.shape === 'rect') {
    const r = Math.min(l.radius ?? 0, w / 2, h / 2);
    if (!r) return [{ closed: true, nodes: [node(0, 0), node(w, 0), node(w, h), node(0, h)] }];
    const k = r * 0.5522847498;
    const n = (x: number, y: number, ix: number, iy: number, ox: number, oy: number): PathNode => ({ x, y, ix, iy, ox, oy });
    return [{
      closed: true, nodes: [
        n(r, 0, r - k, 0, r, 0), n(w - r, 0, w - r, 0, w - r + k, 0),
        n(w, r, w, r - k, w, r), n(w, h - r, w, h - r, w, h - r + k),
        n(w - r, h, w - r + k, h, w - r, h), n(r, h, r, h, r - k, h),
        n(0, h - r, 0, h - r + k, 0, h - r), n(0, r, 0, r, 0, r - k),
      ],
    }];
  }
  const sides = Math.max(3, Math.round(l.sides ?? (l.shape === 'star' ? 5 : 6)));
  const pts: PathNode[] = [];
  const count = l.shape === 'star' ? sides * 2 : sides;
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    const r = l.shape === 'star' && i % 2 ? (l.inner ?? 0.45) : 1;
    pts.push(node(w / 2 + (Math.cos(a) * r * w) / 2, h / 2 + (Math.sin(a) * r * h) / 2));
  }
  return [{ closed: true, nodes: pts }];
}

export function shapePath2D(l: ShapeLayer): Path2D {
  const p = new Path2D();
  if (l.shape === 'rect' && !l.radius) p.rect(0, 0, l.w, l.h);
  else if (l.shape === 'rect' && (p as any).roundRect) (p as any).roundRect(0, 0, l.w, l.h, Math.min(l.radius!, l.w / 2, l.h / 2));
  else if (l.shape === 'ellipse') p.ellipse(l.w / 2, l.h / 2, Math.abs(l.w / 2), Math.abs(l.h / 2), 0, 0, Math.PI * 2);
  else if (l.shape === 'path') tracePaths(p, l.paths ?? [], l.nw ? l.w / l.nw : 1, l.nh ? l.h / l.nh : 1);
  else tracePaths(p, shapeToPaths(l), 1, 1);
  return p;
}

export function pathsToD(paths: SubPath[], sx = 1, sy = 1): string {
  const f = (v: number) => Math.round(v * 100) / 100;
  let d = '';
  for (const sp of paths) {
    const n = sp.nodes;
    if (!n.length) continue;
    d += `M${f(n[0].x * sx)} ${f(n[0].y * sy)}`;
    const segs = sp.closed ? n.length : n.length - 1;
    for (let i = 0; i < segs; i++) {
      const a = n[i], b = n[(i + 1) % n.length];
      const straight = a.ox === a.x && a.oy === a.y && b.ix === b.x && b.iy === b.y;
      d += straight ? `L${f(b.x * sx)} ${f(b.y * sy)}` : `C${f(a.ox * sx)} ${f(a.oy * sy)} ${f(b.ix * sx)} ${f(b.iy * sy)} ${f(b.x * sx)} ${f(b.y * sy)}`;
    }
    if (sp.closed) d += 'Z';
  }
  return d;
}
