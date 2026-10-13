// Geometry and raster helpers for Edit > Transform (Skew/Distort/Perspective/Warp) and
// Filter > Liquify. Pure: no store or UI imports, so warp.check.ts can run it under Node.

export interface Pt { x: number; y: number }
/** Corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Pt, Pt, Pt, Pt];
/** 3x3 homography, row-major [a b c; d e f; g h 1]. */
export type Mat3 = number[];

// Projective mapping

/** Solve an 8x8 linear system by Gaussian elimination with partial pivoting. */
function solve8(A: number[][], b: number[]): number[] {
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    const d = A[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / d;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = s / (A[r][r] || 1e-12);
  }
  return x;
}

/** Homography that maps each src[i] onto dst[i]. */
export function homography(src: Quad, dst: Quad): Mat3 {
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i], { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  return [...solve8(A, b), 1];
}

export function applyH(H: Mat3, x: number, y: number): Pt {
  const w = H[6] * x + H[7] * y + H[8];
  return { x: (H[0] * x + H[1] * y + H[2]) / w, y: (H[3] * x + H[4] * y + H[5]) / w };
}

const UNIT: Quad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

/** (n+1)^2 mesh vertices of a quad, row-major in (v, u); perspective-correct so lines stay straight. */
export function quadMesh(quad: Quad, n: number): Pt[] {
  const H = homography(UNIT, quad);
  const pts: Pt[] = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) pts.push(applyH(H, i / n, j / n));
  return pts;
}

// Warp: bicubic Bezier patch

const bern = (t: number): [number, number, number, number] => {
  const s = 1 - t;
  return [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
};

/** Evaluate a 4x4 Bezier patch (16 control points, row-major: grid[row*4+col]) at (u, v). */
export function bezierPatch(grid: Pt[], u: number, v: number): Pt {
  const bu = bern(u), bv = bern(v);
  let x = 0, y = 0;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const w = bv[j] * bu[i], p = grid[j * 4 + i];
    x += w * p.x; y += w * p.y;
  }
  return { x, y };
}

export function patchMesh(grid: Pt[], n: number): Pt[] {
  const pts: Pt[] = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) pts.push(bezierPatch(grid, i / n, j / n));
  return pts;
}

/** Undistorted control grid for a rect (points at thirds). */
export function identityGrid(x: number, y: number, w: number, h: number): Pt[] {
  const g: Pt[] = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) g.push({ x: x + (w * i) / 3, y: y + (h * j) / 3 });
  return g;
}

/** Control grid that follows a quad (thirds mapped through its homography). */
export function gridFromQuad(q: Quad): Pt[] {
  const H = homography(UNIT, q);
  const g: Pt[] = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) g.push(applyH(H, i / 3, j / 3));
  return g;
}

export const WARP_PRESETS = ['None', 'Arc', 'Bulge', 'Flag', 'Wave', 'Fish', 'Rise', 'Inflate', 'Twist'] as const;
export type WarpPreset = (typeof WARP_PRESETS)[number];

/** Photoshop-like warp style: control grid for the rect at bend -100..100 (approximations of PS's shapes). */
export function presetGrid(preset: WarpPreset, x: number, y: number, w: number, h: number, bendPct: number): Pt[] {
  const b = bendPct / 100;
  const g = identityGrid(x, y, w, h);
  const cx = x + w / 2, cy = y + h / 2;
  g.forEach((p, k) => {
    const i = k % 4, j = (k / 4) | 0, u = i / 3, v = j / 3;
    const inner = i === 1 || i === 2, edgeRow = j === 0 || j === 3, edgeCol = i === 0 || i === 3;
    switch (preset) {
      case 'Arc': // every row bows up; the top spreads and the bottom tucks in, like a fan
        if (inner) p.y -= b * h * 0.6;
        p.x += (u - 0.5) * w * b * 0.4 * (1 - 2 * v);
        break;
      case 'Bulge': // top bows up, bottom bows down
        if (inner) p.y -= b * h * 0.45 * (1 - 2 * v);
        break;
      case 'Flag': // same S wave on every row
        if (i === 1) p.y -= b * h * 0.5;
        if (i === 2) p.y += b * h * 0.5;
        break;
      case 'Wave': // S wave whose amplitude flips from top to bottom
        if (inner) p.y += (i === 1 ? -1 : 1) * b * h * (0.5 - 0.75 * v);
        break;
      case 'Fish': // fat body, pinched tail on the right
        if (i === 1 || i === 2) p.y -= b * h * 0.4 * (1 - 2 * v);
        if (i === 3) p.y += b * h * 0.3 * (1 - 2 * v);
        break;
      case 'Rise': // the right side lifts, with an S in between
        p.y -= b * h * 0.5 * (i >= 2 ? 1 : 0) * (i === 2 ? 0.5 : 1);
        if (i === 1) p.y += b * h * 0.1;
        break;
      case 'Inflate': // all four edges bow outward, corners stay
        if (edgeRow && inner) p.y += (j === 0 ? -1 : 1) * b * h * 0.4;
        if (edgeCol && (j === 1 || j === 2)) p.x += (i === 0 ? -1 : 1) * b * w * 0.4;
        break;
      case 'Twist': { // rows rotate around the center more toward the top and bottom
        const a = b * (Math.PI / 4) * (2 * v - 1);
        const dx = p.x - cx, dy = p.y - cy;
        p.x = cx + dx * Math.cos(a) - dy * Math.sin(a);
        p.y = cy + dx * Math.sin(a) + dy * Math.cos(a);
        break;
      }
    }
  });
  return g;
}

export function boundsOf(pts: Pt[]): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Mesh rendering

/**
 * Draw `src` onto `ctx` through a mesh: `dst` holds (n+1)^2 vertices (row-major) in ctx space,
 * vertex (i, j) receiving source point (i/n * W, j/n * H). Each triangle is an affine drawImage
 * clipped to the triangle grown by ~0.6px so neighbouring triangles overlap and hide seams.
 */
export function drawMesh(ctx: CanvasRenderingContext2D, src: CanvasImageSource & { width: number; height: number }, dst: Pt[], n: number) {
  const W = src.width, H = src.height;
  const tri = (s0: Pt, s1: Pt, s2: Pt, d0: Pt, d1: Pt, d2: Pt) => {
    const den = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
    if (!den) return;
    const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / den;
    const c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / den;
    const b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / den;
    const d = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / den;
    const e = d0.x - a * s0.x - c * s0.y, f = d0.y - b * s0.x - d * s0.y;
    const mx = (d0.x + d1.x + d2.x) / 3, my = (d0.y + d1.y + d2.y) / 3;
    const grow = (p: Pt) => { const dx = p.x - mx, dy = p.y - my, l = Math.hypot(dx, dy) || 1; return [p.x + (dx / l) * 0.6, p.y + (dy / l) * 0.6]; };
    ctx.save();
    ctx.beginPath();
    const [g0, g1, g2] = [grow(d0), grow(d1), grow(d2)];
    ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.lineTo(g2[0], g2[1]); ctx.closePath();
    ctx.clip();
    ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([a, b, c, d, e, f])));
    // Only the source cell (plus a 1px margin) needs drawing.
    const sx = Math.max(0, Math.floor(Math.min(s0.x, s1.x, s2.x)) - 1), sy = Math.max(0, Math.floor(Math.min(s0.y, s1.y, s2.y)) - 1);
    const sw = Math.min(W, Math.ceil(Math.max(s0.x, s1.x, s2.x)) + 1) - sx, sh = Math.min(H, Math.ceil(Math.max(s0.y, s1.y, s2.y)) + 1) - sy;
    if (sw > 0 && sh > 0) ctx.drawImage(src, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.restore();
  };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * (n + 1) + i;
    const p00 = dst[k], p10 = dst[k + 1], p01 = dst[k + n + 1], p11 = dst[k + n + 2];
    const s00 = { x: (i / n) * W, y: (j / n) * H }, s10 = { x: ((i + 1) / n) * W, y: s00.y };
    const s01 = { x: s00.x, y: ((j + 1) / n) * H }, s11 = { x: s10.x, y: s01.y };
    tri(s00, s10, s11, p00, p10, p11);
    tri(s00, s11, s01, p00, p11, p01);
  }
}

/** Map pts into an output canvas: subtract origin, then scale. */
const toOut = (pts: Pt[], ox: number, oy: number, s: number) => pts.map((p) => ({ x: (p.x - ox) * s, y: (p.y - oy) * s }));

/** Draw `src` into the quadrilateral `quad` (doc space) on `out`, whose pixel (0,0) is doc (ox, oy) at `scale` px per doc px. */
export function renderQuad(src: HTMLCanvasElement, quad: Quad, out: HTMLCanvasElement, ox = 0, oy = 0, scale = 1, n = 16) {
  const ctx = out.getContext('2d')!;
  ctx.clearRect(0, 0, out.width, out.height);
  drawMesh(ctx, src, toOut(quadMesh(quad, n), ox, oy, scale), n);
}

/** Draw `src` warped by a 4x4 Bezier control grid (doc space) on `out` (see renderQuad for ox/oy/scale). */
export function renderWarp(src: HTMLCanvasElement, grid: Pt[], out: HTMLCanvasElement, ox = 0, oy = 0, scale = 1, n = 24) {
  const ctx = out.getContext('2d')!;
  ctx.clearRect(0, 0, out.width, out.height);
  drawMesh(ctx, src, toOut(patchMesh(grid, n), ox, oy, scale), n);
}

// Liquify: backward displacement field. Output pixel p shows original(p + d(p)), so every
// stroke resamples the untouched original and quality never degrades.

export interface Field { w: number; h: number; dx: Float32Array; dy: Float32Array }
export type LiquifyKind = 'warp' | 'reconstruct' | 'pucker' | 'bloat' | 'twirlCW' | 'twirlCCW';

export const newField = (w: number, h: number): Field => ({ w, h, dx: new Float32Array(w * h), dy: new Float32Array(w * h) });

function sampleField(a: Float32Array, w: number, h: number, x: number, y: number): number {
  x = Math.min(w - 1, Math.max(0, x)); y = Math.min(h - 1, Math.max(0, y));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
  const fx = x - x0, fy = y - y0;
  const top = a[y0 * w + x0] * (1 - fx) + a[y0 * w + x1] * fx;
  const bot = a[y1 * w + x0] * (1 - fx) + a[y1 * w + x1] * fx;
  return top * (1 - fy) + bot * fy;
}

/**
 * Apply one brush dab to the field. (cx, cy) center and `radius` in field px; `pressure` 0..1;
 * `density` 0..1 (higher = harder edge); (mx, my) the drag vector for 'warp'; `rate` 0..1 the
 * per-dab strength of the other modes. Returns the touched rect (field px).
 */
export function liquifyDab(f: Field, kind: LiquifyKind, cx: number, cy: number, radius: number, pressure: number, density: number, mx = 0, my = 0, rate = 0.5) {
  const { w, h, dx, dy } = f;
  const x0 = Math.max(0, Math.floor(cx - radius)), y0 = Math.max(0, Math.floor(cy - radius));
  const x1 = Math.min(w - 1, Math.ceil(cx + radius)), y1 = Math.min(h - 1, Math.ceil(cy + radius));
  if (x1 < x0 || y1 < y0) return null;
  // Results go to a bbox buffer first so every lookup in this dab reads the pre-dab field.
  const bw = x1 - x0 + 1, ndx = new Float32Array(bw * (y1 - y0 + 1)), ndy = new Float32Array(ndx.length);
  const power = 1 + density * 3;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const rx = x - cx, ry = y - cy, d = Math.hypot(rx, ry) / radius;
    if (d >= 1) { ndx[(y - y0) * bw + x - x0] = dx[y * w + x]; ndy[(y - y0) * bw + x - x0] = dy[y * w + x]; continue; }
    const wgt = Math.pow(1 - d * d, power) * pressure;
    const i = y * w + x, bi = (y - y0) * bw + x - x0;
    if (kind === 'reconstruct') { const k = 1 - wgt * rate; ndx[bi] = dx[i] * k; ndy[bi] = dy[i] * k; continue; }
    let qx = x, qy = y;
    if (kind === 'warp') { qx = x - mx * wgt; qy = y - my * wgt; }
    else if (kind === 'bloat' || kind === 'pucker') {
      const s = wgt * rate * 0.15 * (kind === 'bloat' ? 1 : -1);
      qx = x - rx * s; qy = y - ry * s;
    } else {
      const a = wgt * rate * 0.12 * (kind === 'twirlCW' ? -1 : 1);
      const c = Math.cos(a), s = Math.sin(a);
      qx = cx + rx * c - ry * s; qy = cy + rx * s + ry * c;
    }
    // New displacement: look up where q pointed, then account for the move from p to q.
    ndx[bi] = sampleField(dx, w, h, qx, qy) + qx - x;
    ndy[bi] = sampleField(dy, w, h, qx, qy) + qy - y;
  }
  for (let y = y0; y <= y1; y++) {
    dx.set(ndx.subarray((y - y0) * bw, (y - y0 + 1) * bw), y * w + x0);
    dy.set(ndy.subarray((y - y0) * bw, (y - y0 + 1) * bw), y * w + x0);
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

type Img = { width: number; height: number; data: Uint8ClampedArray };

/**
 * Resample `orig` through the field into `out` (same size as orig). The field may be lower
 * resolution than the image: it is bilinearly upsampled and its vectors scaled. `rect` (in out
 * px) limits the work to a dirty region. Bilinear sampling is alpha-weighted to avoid dark fringes.
 */
export function liquifyRender(orig: Img, f: Field, out: Img, rect?: { x: number; y: number; w: number; h: number }) {
  const W = orig.width, H = orig.height, src = orig.data, dst = out.data;
  const sx = f.w / W, sy = f.h / H; // image px -> field px
  const rx0 = rect ? Math.max(0, Math.floor(rect.x)) : 0, ry0 = rect ? Math.max(0, Math.floor(rect.y)) : 0;
  const rx1 = rect ? Math.min(W, Math.ceil(rect.x + rect.w)) : W, ry1 = rect ? Math.min(H, Math.ceil(rect.y + rect.h)) : H;
  for (let y = ry0; y < ry1; y++) for (let x = rx0; x < rx1; x++) {
    const fx = (x + 0.5) * sx - 0.5, fy = (y + 0.5) * sy - 0.5;
    let px = x, py = y;
    if (sx === 1 && sy === 1) { const i = y * W + x; px += f.dx[i]; py += f.dy[i]; }
    else { px += sampleField(f.dx, f.w, f.h, fx, fy) / sx; py += sampleField(f.dy, f.w, f.h, fx, fy) / sy; }
    const o = (y * W + x) * 4;
    if (px < -0.5 || py < -0.5 || px > W - 0.5 || py > H - 0.5) { dst[o] = dst[o + 1] = dst[o + 2] = dst[o + 3] = 0; continue; }
    px = Math.min(W - 1, Math.max(0, px)); py = Math.min(H - 1, Math.max(0, py));
    const x0 = Math.floor(px), y0 = Math.floor(py), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
    const ax = px - x0, ay = py - y0;
    const i00 = (y0 * W + x0) * 4, i10 = (y0 * W + x1) * 4, i01 = (y1 * W + x0) * 4, i11 = (y1 * W + x1) * 4;
    const w00 = (1 - ax) * (1 - ay) * src[i00 + 3], w10 = ax * (1 - ay) * src[i10 + 3];
    const w01 = (1 - ax) * ay * src[i01 + 3], w11 = ax * ay * src[i11 + 3];
    const a = w00 + w10 + w01 + w11;
    if (a <= 0) { dst[o] = dst[o + 1] = dst[o + 2] = dst[o + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) dst[o + c] = (src[i00 + c] * w00 + src[i10 + c] * w10 + src[i01 + c] * w01 + src[i11 + c] * w11) / a;
    dst[o + 3] = a;
  }
}
