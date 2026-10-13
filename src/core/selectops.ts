// Pure pixel helpers for selection tools and Select-menu operations. No DOM here, so they
// can be checked under plain Node. Alpha planes are W*H Uint8Arrays (0 = unselected).

/** Square max filter of radius r along rows or columns; out-of-bounds clamps to the edge pixel. */
function slideMax(a: Uint8Array, W: number, H: number, r: number, horiz: boolean): Uint8Array {
  const out = new Uint8Array(a.length);
  const n = horiz ? W : H, lines = horiz ? H : W, step = horiz ? 1 : W;
  const q = new Int32Array(n + 2 * r + 1); // monotonic deque of positions
  for (let l = 0; l < lines; l++) {
    const base = horiz ? l * W : l;
    const at = (j: number) => a[base + (j < 0 ? 0 : j >= n ? n - 1 : j) * step];
    let h = 0, t = 0, j = -r;
    for (let i = 0; i < n; i++) {
      for (; j <= i + r; j++) {
        const v = at(j);
        while (t > h && at(q[t - 1]) <= v) t--;
        q[t++] = j;
      }
      while (q[h] < i - r) h++;
      out[base + i * step] = at(q[h]);
    }
  }
  return out;
}

/** Grow the selected area by r pixels (square kernel). */
export function dilate(a: Uint8Array, W: number, H: number, r: number): Uint8Array {
  r = Math.round(r);
  return r <= 0 ? a.slice() : slideMax(slideMax(a, W, H, r, true), W, H, r, false);
}

/** Shrink by r pixels. Edges clamp, so selections touching the canvas border don't shrink from it (Photoshop default). */
export function erode(a: Uint8Array, W: number, H: number, r: number): Uint8Array {
  const inv = a.map((v) => 255 - v);
  return dilate(inv, W, H, r).map((v) => 255 - v);
}

/** A band of `width` px centered on the selection edge. */
export function border(a: Uint8Array, W: number, H: number, width: number): Uint8Array {
  const d = dilate(a, W, H, Math.ceil(width / 2)), e = erode(a, W, H, Math.floor(width / 2));
  return d.map((v, i) => Math.max(0, v - e[i]));
}

export const luma = (d: ArrayLike<number>, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

export type RangeSpec = { r: number; g: number; b: number } | 'highlights' | 'midtones' | 'shadows';

/** Soft mask for Select > Color Range: alpha falls off linearly with distance from the color. */
export function colorRangeAlpha(d: ArrayLike<number>, n: number, spec: RangeSpec, fuzz: number): Uint8Array {
  const out = new Uint8Array(n);
  const ramp = (v: number, lo: number, hi: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
  const f = Math.max(1, fuzz);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    let s: number;
    if (typeof spec === 'object') s = 1 - (Math.abs(d[i] - spec.r) + Math.abs(d[i + 1] - spec.g) + Math.abs(d[i + 2] - spec.b)) / 3 / f;
    else {
      const y = luma(d, i);
      s = spec === 'highlights' ? ramp(y, 128, 192) : spec === 'shadows' ? 1 - ramp(y, 64, 128) : 1 - Math.abs(y - 128) / 64;
    }
    out[p] = s <= 0 ? 0 : Math.round(Math.min(1, s) * 255 * (d[i + 3] / 255));
  }
  return out;
}

/**
 * Grow / Similar: pixels whose color lies within the selected pixels' per-channel range
 * widened by `tol`. Contiguous floods outward from the current selection.
 */
export function growMask(d: ArrayLike<number>, sel: Uint8Array, W: number, H: number, tol: number, contiguous: boolean): Uint8Array {
  const lo = [255, 255, 255], hi = [0, 0, 0];
  let any = false;
  for (let p = 0; p < W * H; p++) if (sel[p] > 127) {
    any = true;
    for (let c = 0; c < 3; c++) { const v = d[p * 4 + c]; if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; }
  }
  const out = sel.slice();
  if (!any) return out;
  const ok = (p: number) => {
    for (let c = 0; c < 3; c++) { const v = d[p * 4 + c]; if (v < lo[c] - tol || v > hi[c] + tol) return false; }
    return true;
  };
  if (!contiguous) {
    for (let p = 0; p < W * H; p++) if (ok(p)) out[p] = 255;
    return out;
  }
  const stack: number[] = [];
  for (let p = 0; p < W * H; p++) if (sel[p] > 127) { out[p] = 255; stack.push(p); }
  while (stack.length) {
    const p = stack.pop()!, x = p % W;
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
      if (q >= 0 && q < W * H && out[q] !== 255 && ok(q)) { out[q] = 255; stack.push(q); }
    }
  }
  return out;
}

/** Contiguous flood from (sx,sy) limited to a window; marks matches in `acc` (doc-sized). */
export function floodWindow(d: ArrayLike<number>, W: number, H: number, sx: number, sy: number, tol: number, win: number, acc: Uint8Array) {
  sx = Math.floor(sx); sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
  const x0 = Math.max(0, sx - win), y0 = Math.max(0, sy - win), x1 = Math.min(W - 1, sx + win), y1 = Math.min(H - 1, sy + win);
  const ww = x1 - x0 + 1, seen = new Uint8Array(ww * (y1 - y0 + 1));
  const i0 = (sy * W + sx) * 4, r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2], a0 = d[i0 + 3], t4 = tol * 4;
  const stack = [sx, sy];
  seen[(sy - y0) * ww + sx - x0] = 1;
  while (stack.length) {
    const y = stack.pop()!, x = stack.pop()!;
    acc[y * W + x] = 255;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < x0 || ny < y0 || nx > x1 || ny > y1) continue;
      const k = (ny - y0) * ww + nx - x0;
      if (seen[k]) continue;
      seen[k] = 1;
      const i = (ny * W + nx) * 4;
      if (Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0) + Math.abs(d[i + 3] - a0) <= t4) stack.push(nx, ny);
    }
  }
}

/** Sobel gradient magnitude of luminance, normalized to 0..1 (clamped at half the max). */
export function gradientMagnitude(d: ArrayLike<number>, W: number, H: number): Float32Array {
  const L = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) L[p] = luma(d, p * 4);
  const g = new Float32Array(W * H);
  let max = 1;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    const gx = L[p - W + 1] + 2 * L[p + 1] + L[p + W + 1] - L[p - W - 1] - 2 * L[p - 1] - L[p + W - 1];
    const gy = L[p + W - 1] + 2 * L[p + W] + L[p + W + 1] - L[p - W - 1] - 2 * L[p - W] - L[p - W + 1];
    const m = Math.hypot(gx, gy);
    g[p] = m;
    if (m > max) max = m;
  }
  const k = 2 / max;
  for (let p = 0; p < W * H; p++) g[p] = Math.min(1, g[p] * k);
  return g;
}

/** Strongest-edge pixel within radius r of (x,y). */
export function snapToEdge(g: Float32Array, W: number, H: number, x: number, y: number, r: number): { x: number; y: number } {
  x = Math.round(x); y = Math.round(y);
  let best = { x: Math.min(W - 1, Math.max(0, x)), y: Math.min(H - 1, Math.max(0, y)) }, bv = -1;
  for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) {
    const dd = (xx - x) ** 2 + (yy - y) ** 2;
    if (dd > r * r) continue;
    const v = g[yy * W + xx] - dd * 1e-4; // tie-break toward the cursor
    if (v > bv) { bv = v; best = { x: xx, y: yy }; }
  }
  return best;
}

/**
 * Live-wire path from a to b: Dijkstra over 8-neighbours with cost low on strong edges,
 * restricted to the bounding box of a and b padded by `pad`.
 */
export function edgePath(g: Float32Array, W: number, H: number, a: { x: number; y: number }, b: { x: number; y: number }, pad: number): { x: number; y: number }[] {
  const x0 = Math.max(0, Math.min(a.x, b.x) - pad), y0 = Math.max(0, Math.min(a.y, b.y) - pad);
  const x1 = Math.min(W - 1, Math.max(a.x, b.x) + pad), y1 = Math.min(H - 1, Math.max(a.y, b.y) + pad);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, N = bw * bh;
  const dist = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const loc = (x: number, y: number) => (y - y0) * bw + (x - x0);
  const s = loc(a.x, a.y), t = loc(b.x, b.y);
  // Binary min-heap of (key, node).
  const hk: number[] = [], hn: number[] = [];
  const push = (k: number, n: number) => {
    let i = hk.length; hk.push(k); hn.push(n);
    while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= k) break; hk[i] = hk[p]; hn[i] = hn[p]; i = p; }
    hk[i] = k; hn[i] = n;
  };
  const pop = () => {
    const n = hn[0], k = hk.pop()!, m = hn.pop()!, L = hk.length;
    if (L) {
      let i = 0;
      for (;;) { let c = 2 * i + 1; if (c >= L) break; if (c + 1 < L && hk[c + 1] < hk[c]) c++; if (hk[c] >= k) break; hk[i] = hk[c]; hn[i] = hn[c]; i = c; }
      hk[i] = k; hn[i] = m;
    }
    return n;
  };
  dist[s] = 0; push(0, s);
  while (hk.length) {
    const u = pop();
    if (done[u]) continue;
    done[u] = 1;
    if (u === t) break;
    const ux = (u % bw) + x0, uy = ((u / bw) | 0) + y0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const vx = ux + dx, vy = uy + dy;
      if (vx < x0 || vy < y0 || vx > x1 || vy > y1) continue;
      const v = loc(vx, vy);
      if (done[v]) continue;
      const nd = dist[u] + (dx && dy ? 1.414 : 1) * (0.05 + 1 - g[vy * W + vx]);
      if (nd < dist[v]) { dist[v] = nd; prev[v] = u; push(nd, v); }
    }
  }
  const path: { x: number; y: number }[] = [];
  for (let v = t; v >= 0 && v !== s; v = prev[v]) path.push({ x: (v % bw) + x0, y: ((v / bw) | 0) + y0 });
  return path.reverse(); // excludes a, ends at b
}
