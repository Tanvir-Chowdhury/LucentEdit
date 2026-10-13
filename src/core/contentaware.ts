// Content-Aware Fill (PatchMatch inpainting) and on-device Select Subject / Select Sky
// (colour models + graph cut). Pure pixel code with no imports and no DOM, so the Web Worker
// and plain Node (contentaware.check.ts) can run it. Nothing here downloads or uses ML models.

export interface Img { width: number; height: number; data: Uint8ClampedArray }
export interface Rect { x: number; y: number; w: number; h: number }

// Seeded xorshift so results are reproducible.
let rs = 0x9e3779b9;
const rnd = () => { rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; return (rs >>> 0) / 4294967296; };

/** Per-pixel count of set pixels in the (2r+1)^2 window (in-bounds only), via an integral image. */
function windowSum(a: Uint8Array, w: number, h: number, r: number): Int32Array {
  const W1 = w + 1, S = new Int32Array(W1 * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += a[y * w + x] ? 1 : 0; S[(y + 1) * W1 + x + 1] = S[y * W1 + x + 1] + row; }
  }
  const out = new Int32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      out[y * w + x] = S[y1 * W1 + x1] - S[y0 * W1 + x1] - S[y1 * W1 + x0] + S[y0 * W1 + x0];
    }
  }
  return out;
}
const dilateBin = (a: Uint8Array, w: number, h: number, r: number) => windowSum(a, w, h, r).map((v) => (v > 0 ? 1 : 0)) as unknown as Uint8Array;

/** Sampling area for 'Auto': a band of 3x the selection size centred on it. */
export function autoSampleRect(b: Rect, W: number, H: number): Rect {
  const x0 = Math.max(0, b.x - b.w), y0 = Math.max(0, b.y - b.h);
  const x1 = Math.min(W, b.x + 2 * b.w), y1 = Math.min(H, b.y + 2 * b.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Content-Aware Fill

export interface FillOpts { patch?: number; colorAdapt?: boolean; onProgress?: (f: number) => void }

interface Level { w: number; h: number; I: Float32Array; hole: Uint8Array }

function downLevel(L: Level): Level {
  const w = (L.w + 1) >> 1, h = (L.h + 1) >> 1;
  const I = new Float32Array(w * h * 4), hole = new Uint8Array(w * h), cnt = new Float32Array(w * h);
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const p = y * L.w + x, q = (y >> 1) * w + (x >> 1);
    if (L.hole[p]) { hole[q] = 1; continue; } // conservative: any hole pixel makes the coarse pixel a hole
    cnt[q]++;
    for (let c = 0; c < 4; c++) I[q * 4 + c] += L.I[p * 4 + c];
  }
  for (let q = 0; q < w * h; q++) if (cnt[q]) for (let c = 0; c < 4; c++) I[q * 4 + c] /= cnt[q];
  return { w, h, I, hole };
}

/** Source centres whose whole patch is inside the image and outside the hole. */
function sourceCentres(L: Level, r: number) {
  const { w, h, hole } = L, bad = windowSum(hole, w, h, r), ok = new Uint8Array(w * h);
  let n = 0;
  for (let y = r; y < h - r; y++) for (let x = r; x < w - r; x++) if (!bad[y * w + x]) { ok[y * w + x] = 1; n++; }
  const list = new Int32Array(n);
  for (let p = 0, k = 0; p < w * h; p++) if (ok[p]) list[k++] = p;
  return { ok, list };
}

function holeBox(hole: Uint8Array, w: number, h: number): Rect | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hole[y * w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Sum of squared RGBA differences between the patch at target centre c and source centre s; stops early past `best`. */
function patchDist(I: Float32Array, w: number, h: number, r: number, c: number, s: number, best: number): number {
  const cx = c % w, cy = (c / w) | 0, sx = s % w, sy = (s / w) | 0;
  const x0 = Math.max(-r, -cx), x1 = Math.min(r, w - 1 - cx), y0 = Math.max(-r, -cy), y1 = Math.min(r, h - 1 - cy);
  let d = 0;
  for (let dy = y0; dy <= y1; dy++) {
    let pi = ((cy + dy) * w + cx + x0) * 4, qi = ((sy + dy) * w + sx + x0) * 4;
    for (let dx = x0; dx <= x1; dx++, pi += 4, qi += 4) {
      const a = I[pi] - I[qi], b = I[pi + 1] - I[qi + 1], e = I[pi + 2] - I[qi + 2], f = I[pi + 3] - I[qi + 3];
      d += a * a + b * b + e * e + f * f;
    }
    if (d >= best) return d;
  }
  return d;
}

/** Initial guess for the coarsest hole: peel inward, each pixel the mean of its known 4-neighbours. */
function onionFill(L: Level) {
  const { w, h, I } = L, known = L.hole.map((v) => 1 - v);
  for (let changed = true; changed;) {
    changed = false;
    const next: number[] = [];
    for (let p = 0; p < w * h; p++) {
      if (known[p]) continue;
      const x = p % w, y = (p / w) | 0, acc = [0, 0, 0, 0];
      let n = 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q < 0 || !known[q]) continue;
        for (let c = 0; c < 4; c++) acc[c] += I[q * 4 + c];
        n++;
      }
      if (n) { for (let c = 0; c < 4; c++) I[p * 4 + c] = acc[c] / n; next.push(p); }
    }
    for (const p of next) known[p] = 1;
    changed = next.length > 0;
  }
}

interface Field { tgt: Int32Array; tIndex: Int32Array; nnf: Int32Array; dist: Float32Array; ok: Uint8Array; list: Int32Array }

function makeField(L: Level, r: number): Field {
  const { w, h } = L, band = dilateBin(L.hole, w, h, r), tIndex = new Int32Array(w * h).fill(-1);
  let n = 0;
  for (let p = 0; p < w * h; p++) if (band[p]) tIndex[p] = n++;
  const tgt = new Int32Array(n);
  for (let p = 0; p < w * h; p++) if (band[p]) tgt[tIndex[p]] = p;
  const { ok, list } = sourceCentres(L, r);
  return { tgt, tIndex, nnf: new Int32Array(n), dist: new Float32Array(n), ok, list };
}

/** One PatchMatch sweep: propagation from the previous neighbours, then random search. */
function pmPass(L: Level, F: Field, r: number, forward: boolean) {
  const { w, h, I } = L, { tgt, tIndex, nnf, dist, ok } = F, n = tgt.length, st = forward ? 1 : -1;
  for (let k = forward ? 0 : n - 1; k >= 0 && k < n; k += st) {
    const c = tgt[k], cx = c % w, cy = (c / w) | 0;
    let best = dist[k], bs = nnf[k];
    const tx = cx - st >= 0 && cx - st < w ? tIndex[c - st] : -1;
    if (tx >= 0) {
      const s = nnf[tx] + st, sx = (nnf[tx] % w) + st;
      if (sx >= 0 && sx < w && ok[s]) { const d = patchDist(I, w, h, r, c, s, best); if (d < best) { best = d; bs = s; } }
    }
    const ty = cy - st >= 0 && cy - st < h ? tIndex[c - st * w] : -1;
    if (ty >= 0) {
      const s = nnf[ty] + st * w;
      if (s >= 0 && s < w * h && ok[s]) { const d = patchDist(I, w, h, r, c, s, best); if (d < best) { best = d; bs = s; } }
    }
    for (let R = Math.max(w, h); R >= 1; R >>= 1) {
      const bx = bs % w, by = (bs / w) | 0;
      const sx = Math.min(w - 1, Math.max(0, bx + Math.round((rnd() * 2 - 1) * R)));
      const sy = Math.min(h - 1, Math.max(0, by + Math.round((rnd() * 2 - 1) * R)));
      const s = sy * w + sx;
      if (s !== bs && ok[s]) { const d = patchDist(I, w, h, r, c, s, best); if (d < best) { best = d; bs = s; } }
    }
    nnf[k] = bs; dist[k] = best;
  }
}

/** Each hole pixel becomes the weighted mean of what every overlapping matched patch says it should be. */
function vote(L: Level, F: Field, r: number, uniform: boolean, box: Rect) {
  const { w, h, I, hole } = L, { tgt, nnf, dist } = F;
  const acc = new Float32Array(box.w * box.h * 5);
  let s2 = 1;
  if (!uniform) { const sorted = dist.slice().sort(); s2 = Math.max(1, sorted[Math.floor(sorted.length * 0.75)] ?? 1); }
  for (let k = 0; k < tgt.length; k++) {
    const c = tgt[k], s = nnf[k], cx = c % w, cy = (c / w) | 0;
    const wt = uniform ? 1 : Math.max(1e-6, Math.exp(-dist[k] / (2 * s2)));
    for (let dy = -r; dy <= r; dy++) {
      const y = cy + dy;
      if (y < box.y || y >= box.y + box.h) continue;
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        if (x < box.x || x >= box.x + box.w || !hole[y * w + x]) continue;
        const a = ((y - box.y) * box.w + x - box.x) * 5, q = (s + dy * w + dx) * 4;
        acc[a] += wt * I[q]; acc[a + 1] += wt * I[q + 1]; acc[a + 2] += wt * I[q + 2]; acc[a + 3] += wt * I[q + 3]; acc[a + 4] += wt;
      }
    }
  }
  for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) {
    const p = y * w + x, a = ((y - box.y) * box.w + x - box.x) * 5;
    if (hole[p] && acc[a + 4] > 0) for (let c = 0; c < 4; c++) I[p * 4 + c] = acc[a + c] / acc[a + 4];
  }
}

/**
 * Fill the pixels where `alpha` > 0 (soft selection, 0..255) with content sampled from `region`
 * (null = whole image). Multi-scale PatchMatch (Barnes 2009) with Wexler-style EM voting,
 * coarse to fine. Returns new RGBA data; soft edges blend fill and original by alpha.
 */
export function contentAwareFill(img: Img, alpha: Uint8Array, region: Rect | null, opts: FillOpts = {}): Uint8ClampedArray {
  const { width: W, height: H, data } = img;
  const r = (opts.patch ?? 7) >> 1;
  rs = 0x9e3779b9;
  const hb = holeBox(alpha, W, H);
  if (!hb) return data.slice();
  // Working crop: the sampling region plus the hole (padded so boundary patches see context).
  const pad = r * 2 + 2;
  let x0 = hb.x - pad, y0 = hb.y - pad, x1 = hb.x + hb.w + pad, y1 = hb.y + hb.h + pad;
  if (region) { x0 = Math.min(x0, region.x); y0 = Math.min(y0, region.y); x1 = Math.max(x1, region.x + region.w); y1 = Math.max(y1, region.y + region.h); }
  else { x0 = 0; y0 = 0; x1 = W; y1 = H; }
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
  const cw = x1 - x0, ch = y1 - y0;
  const L0: Level = { w: cw, h: ch, I: new Float32Array(cw * ch * 4), hole: new Uint8Array(cw * ch) };
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const p = y * cw + x, i = ((y + y0) * W + x + x0) * 4;
    for (let c = 0; c < 4; c++) L0.I[p * 4 + c] = data[i + c];
    L0.hole[p] = alpha[(y + y0) * W + x + x0] ? 1 : 0;
  }
  // Pyramid: halve until the hole is a few patches wide (or too few clean source patches remain).
  const levels = [L0];
  for (;;) {
    const L = levels[levels.length - 1], b = holeBox(L.hole, L.w, L.h)!;
    if (Math.max(b.w, b.h) <= 4 * r || Math.min(L.w, L.h) < 8 * r) break;
    const N = downLevel(L);
    if (sourceCentres(N, r).list.length < 64) break;
    levels.push(N);
  }
  const fields = levels.map((L) => makeField(L, r));
  if (!fields[0].list.length) throw new Error('Not enough pixels outside the selection to sample from');
  const iters = levels.map((_, i) => (i === 0 ? 2 : Math.min(8, 3 + i)));
  const total = fields.reduce((s, F, i) => s + F.tgt.length * iters[i], 0);
  let done = 0;

  for (let li = levels.length - 1; li >= 0; li--) {
    const L = levels[li], F = fields[li], box = holeBox(L.hole, L.w, L.h)!;
    if (li === levels.length - 1) {
      onionFill(L);
      for (let k = 0; k < F.tgt.length; k++) F.nnf[k] = F.list[(rnd() * F.list.length) | 0];
    } else {
      // Upsample the coarser field: same match, offset by the pixel's position inside its 2x2 cell.
      const C = levels[li + 1], CF = fields[li + 1];
      for (let k = 0; k < F.tgt.length; k++) {
        const p = F.tgt[k], x = p % L.w, y = (p / L.w) | 0;
        const ct = CF.tIndex[Math.min(C.h - 1, y >> 1) * C.w + Math.min(C.w - 1, x >> 1)];
        let s = -1;
        if (ct >= 0) {
          const cs = CF.nnf[ct], sx = Math.min(L.w - 1, (cs % C.w) * 2 + (x & 1)), sy = Math.min(L.h - 1, ((cs / C.w) | 0) * 2 + (y & 1));
          if (F.ok[sy * L.w + sx]) s = sy * L.w + sx;
        }
        F.nnf[k] = s >= 0 ? s : F.list[(rnd() * F.list.length) | 0];
      }
      vote(L, F, r, true, box);
    }
    for (let it = 0; it < iters[li]; it++) {
      for (let k = 0; k < F.tgt.length; k++) F.dist[k] = patchDist(L.I, L.w, L.h, r, F.tgt[k], F.nnf[k], Infinity);
      pmPass(L, F, r, it % 2 === 0);
      if (li > 0) pmPass(L, F, r, it % 2 !== 0);
      vote(L, F, r, false, box);
      done += F.tgt.length;
      opts.onProgress?.(done / total);
    }
  }

  if (opts.colorAdapt) adaptColor(L0, fields[0]);
  const out = data.slice();
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const p = y * cw + x, gp = (y + y0) * W + x + x0;
    if (!L0.hole[p]) continue;
    const t = alpha[gp] / 255, i = gp * 4;
    for (let c = 0; c < 4; c++) out[i + c] = data[i + c] * (1 - t) + L0.I[p * 4 + c] * t;
  }
  return out;
}

/**
 * Colour adaptation: known pixels next to the hole vs the source pixels their patches matched.
 * The mean difference is the lighting/tint gap between source area and surroundings; shift the fill by it.
 */
function adaptColor(L: Level, F: Field) {
  const { I, hole } = L, diff = [0, 0, 0];
  let n = 0;
  for (let k = 0; k < F.tgt.length; k++) {
    const c = F.tgt[k], s = F.nnf[k];
    if (hole[c]) continue;
    for (let ch = 0; ch < 3; ch++) diff[ch] += I[c * 4 + ch] - I[s * 4 + ch];
    n++;
  }
  if (!n) return;
  for (let p = 0; p < L.w * L.h; p++) if (hole[p]) for (let ch = 0; ch < 3; ch++) I[p * 4 + ch] += diff[ch] / n;
}

// Max-flow / min-cut (Boykov-Kolmogorov 2004: two search trees, augment, adopt orphans)

const TERMINAL = -2, ORPHAN = -3, NONE = -1;

export class Graph {
  n: number; m = 0; flow = 0;
  first: Int32Array; head: Int32Array; next: Int32Array; cap: Float64Array; tr: Float64Array;
  tree: Uint8Array; // 0 free, 1 source tree, 2 sink tree
  constructor(n: number, maxEdges: number) {
    this.n = n;
    this.first = new Int32Array(n).fill(-1);
    this.head = new Int32Array(maxEdges * 2); this.next = new Int32Array(maxEdges * 2); this.cap = new Float64Array(maxEdges * 2);
    this.tr = new Float64Array(n); this.tree = new Uint8Array(n);
  }
  /** Edge i->j with capacity `cap` and j->i with `rev`. */
  addEdge(i: number, j: number, cap: number, rev: number) {
    const e = this.m++ * 2;
    this.head[e] = j; this.cap[e] = cap; this.next[e] = this.first[i]; this.first[i] = e;
    this.head[e + 1] = i; this.cap[e + 1] = rev; this.next[e + 1] = this.first[j]; this.first[j] = e + 1;
  }
  /** Terminal links: source->i with `cs`, i->sink with `ct`. */
  addTWeights(i: number, cs: number, ct: number) {
    const d = this.tr[i];
    if (d > 0) cs += d; else ct -= d;
    this.flow += Math.min(cs, ct);
    this.tr[i] = cs - ct;
  }
  inSource(i: number) { return this.tree[i] === 1; }

  maxflow(): number {
    const { n, first, head, next, cap, tr, tree } = this;
    const parent = new Int32Array(n).fill(NONE), ts = new Int32Array(n), dist = new Int32Array(n);
    const queue = new Int32Array(n + 1), inQ = new Uint8Array(n);
    let qh = 0, qt = 0, TIME = 1;
    const activate = (i: number) => { if (!inQ[i]) { inQ[i] = 1; queue[qt] = i; qt = (qt + 1) % (n + 1); } };
    const pop = () => { if (qh === qt) return -1; const i = queue[qh]; qh = (qh + 1) % (n + 1); inQ[i] = 0; return i; };
    for (let i = 0; i < n; i++) {
      if (tr[i] > 0) { tree[i] = 1; parent[i] = TERMINAL; activate(i); }
      else if (tr[i] < 0) { tree[i] = 2; parent[i] = TERMINAL; activate(i); }
    }
    const orphans: number[] = [];
    const orphan = (x: number) => { parent[x] = ORPHAN; orphans.push(x); };
    // Depth of j's tree path to its terminal, or -1 if it leads to an orphan (memoised per TIME).
    const origin = (j: number) => {
      let d = 0, y = j;
      for (;;) {
        if (ts[y] === TIME) { d += dist[y]; break; }
        const a = parent[y];
        if (a === TERMINAL) { ts[y] = TIME; dist[y] = 1; d += 1; break; }
        if (a < 0) return -1;
        d++; y = head[a];
      }
      for (let y2 = j, dd = d; ts[y2] !== TIME; y2 = head[parent[y2]]) { ts[y2] = TIME; dist[y2] = dd--; }
      return d;
    };
    let curNode = -1;
    for (;;) {
      let i = curNode;
      curNode = -1;
      if (i < 0 || !tree[i]) { i = pop(); if (i < 0) break; if (!tree[i]) continue; }
      // Grow the tree from i until it touches the other tree.
      let mid = -1;
      if (tree[i] === 1) {
        for (let a = first[i]; a >= 0; a = next[a]) if (cap[a] > 0) {
          const j = head[a];
          if (!tree[j]) { tree[j] = 1; parent[j] = a ^ 1; activate(j); }
          else if (tree[j] === 2) { mid = a; break; }
        }
      } else {
        for (let a = first[i]; a >= 0; a = next[a]) if (cap[a ^ 1] > 0) {
          const j = head[a];
          if (!tree[j]) { tree[j] = 2; parent[j] = a ^ 1; activate(j); }
          else if (tree[j] === 1) { mid = a ^ 1; break; }
        }
      }
      if (mid < 0) continue;
      curNode = i;
      TIME++;
      // Augment along source-root .. mid .. sink-root by the bottleneck.
      const u = head[mid ^ 1], v = head[mid];
      let b = cap[mid], x: number;
      for (x = u; parent[x] !== TERMINAL; x = head[parent[x]]) b = Math.min(b, cap[parent[x] ^ 1]);
      b = Math.min(b, tr[x]);
      for (x = v; parent[x] !== TERMINAL; x = head[parent[x]]) b = Math.min(b, cap[parent[x]]);
      b = Math.min(b, -tr[x]);
      cap[mid] -= b; cap[mid ^ 1] += b;
      for (x = u; ;) {
        const a = parent[x];
        if (a === TERMINAL) { tr[x] -= b; if (tr[x] === 0) orphan(x); break; }
        cap[a] += b; cap[a ^ 1] -= b;
        const up = head[a];
        if (cap[a ^ 1] === 0) orphan(x);
        x = up;
      }
      for (x = v; ;) {
        const a = parent[x];
        if (a === TERMINAL) { tr[x] += b; if (tr[x] === 0) orphan(x); break; }
        cap[a ^ 1] += b; cap[a] -= b;
        const up = head[a];
        if (cap[a] === 0) orphan(x);
        x = up;
      }
      this.flow += b;
      // Adoption: re-attach each orphan to a valid same-tree neighbour, or free it.
      while (orphans.length) {
        const o = orphans.pop()!, t = tree[o];
        let best = -1, bd = Infinity;
        for (let a = first[o]; a >= 0; a = next[a]) {
          const j = head[a];
          if (tree[j] !== t || !(t === 1 ? cap[a ^ 1] > 0 : cap[a] > 0)) continue;
          const d = origin(j);
          if (d >= 0 && d < bd) { bd = d; best = a; }
        }
        if (best >= 0) { parent[o] = best; ts[o] = TIME; dist[o] = bd + 1; continue; }
        for (let a = first[o]; a >= 0; a = next[a]) {
          const j = head[a];
          if (tree[j] !== t) continue;
          const pa = parent[j];
          if (pa >= 0 && head[pa] === o) orphan(j);
          if (t === 1 ? cap[a ^ 1] > 0 : cap[a] > 0) activate(j);
        }
        tree[o] = 0; parent[o] = NONE;
      }
    }
    return this.flow;
  }
}

// Select Subject / Select Sky

interface Small { w: number; h: number; rgb: Float32Array; lab: Float32Array }

/** Box-downscale so the long side is at most `maxSide`, with a CIE Lab copy. */
function shrink(img: Img, maxSide: number): Small {
  const { width: W, height: H, data } = img;
  const f = Math.max(1, Math.max(W, H) / maxSide), w = Math.max(1, Math.round(W / f)), h = Math.max(1, Math.round(H / f));
  const rgb = new Float32Array(w * h * 3), cnt = new Float32Array(w * h);
  for (let y = 0; y < H; y++) {
    const sy = Math.min(h - 1, Math.floor((y * h) / H));
    for (let x = 0; x < W; x++) {
      const q = sy * w + Math.min(w - 1, Math.floor((x * w) / W)), i = (y * W + x) * 4;
      rgb[q * 3] += data[i]; rgb[q * 3 + 1] += data[i + 1]; rgb[q * 3 + 2] += data[i + 2]; cnt[q]++;
    }
  }
  const lab = new Float32Array(w * h * 3);
  const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const fl = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  for (let q = 0; q < w * h; q++) {
    for (let c = 0; c < 3; c++) rgb[q * 3 + c] /= cnt[q] || 1;
    const R = lin(rgb[q * 3]), G = lin(rgb[q * 3 + 1]), B = lin(rgb[q * 3 + 2]);
    const X = fl((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), Y = fl(0.2126 * R + 0.7152 * G + 0.0722 * B), Z = fl((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
    lab[q * 3] = 116 * Y - 16; lab[q * 3 + 1] = 500 * (X - Y); lab[q * 3 + 2] = 200 * (Y - Z);
  }
  return { w, h, rgb, lab };
}

/** Colour model: k-means clusters in Lab, each a diagonal Gaussian (a cheap GMM stand-in). */
interface Model { k: number; mu: Float64Array; iv: Float64Array; c: Float64Array }

function fitModel(lab: Float32Array, idx: ArrayLike<number>, k: number): Model {
  const n = idx.length;
  if (!n) return { k: 1, mu: new Float64Array([50, 0, 0]), iv: new Float64Array([1e-3, 1e-3, 1e-3]), c: new Float64Array([10]) };
  k = Math.min(k, n);
  const mu = new Float64Array(k * 3), asg = new Int32Array(n), minD = new Float64Array(n).fill(Infinity);
  // Farthest-point initialisation, then Lloyd iterations.
  let pick = idx[n >> 1];
  for (let j = 0; j < k; j++) {
    for (let c = 0; c < 3; c++) mu[j * 3 + c] = lab[pick * 3 + c];
    let far = 0;
    for (let t = 0; t < n; t++) {
      const p = idx[t];
      const d = (lab[p * 3] - mu[j * 3]) ** 2 + (lab[p * 3 + 1] - mu[j * 3 + 1]) ** 2 + (lab[p * 3 + 2] - mu[j * 3 + 2]) ** 2;
      if (d < minD[t]) minD[t] = d;
      if (minD[t] > far) { far = minD[t]; pick = p; }
    }
  }
  const sum = new Float64Array(k * 7);
  for (let it = 0; it < 8; it++) {
    sum.fill(0);
    for (let t = 0; t < n; t++) {
      const p = idx[t];
      let bj = 0, bd = Infinity;
      for (let j = 0; j < k; j++) {
        const d = (lab[p * 3] - mu[j * 3]) ** 2 + (lab[p * 3 + 1] - mu[j * 3 + 1]) ** 2 + (lab[p * 3 + 2] - mu[j * 3 + 2]) ** 2;
        if (d < bd) { bd = d; bj = j; }
      }
      asg[t] = bj;
      for (let c = 0; c < 3; c++) { sum[bj * 7 + c] += lab[p * 3 + c]; sum[bj * 7 + 3 + c] += lab[p * 3 + c] ** 2; }
      sum[bj * 7 + 6]++;
    }
    for (let j = 0; j < k; j++) if (sum[j * 7 + 6]) for (let c = 0; c < 3; c++) mu[j * 3 + c] = sum[j * 7 + c] / sum[j * 7 + 6];
  }
  const iv = new Float64Array(k * 3), cst = new Float64Array(k);
  for (let j = 0; j < k; j++) {
    const m = sum[j * 7 + 6];
    let logDet = 0;
    for (let c = 0; c < 3; c++) {
      const v = Math.max(9, m ? sum[j * 7 + 3 + c] / m - mu[j * 3 + c] ** 2 : 100); // floor: std >= 3 Lab units
      iv[j * 3 + c] = 1 / v; logDet += Math.log(v);
    }
    cst[j] = m ? 0.5 * logDet - Math.log(m / n) : Infinity;
  }
  return { k, mu, iv, c: cst };
}

/** Negative log-likelihood of pixel p under the model (best component). `mahal` drops the constant terms. */
function nll(M: Model, lab: Float32Array, p: number, mahal = false): number {
  let best = Infinity;
  for (let j = 0; j < M.k; j++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d += (lab[p * 3 + c] - M.mu[j * 3 + c]) ** 2 * M.iv[j * 3 + c];
    d = mahal ? d : 0.5 * d + M.c[j];
    if (d < best) best = d;
  }
  return best;
}

const indices = (m: Uint8Array, want = 1) => { const out: number[] = []; for (let p = 0; p < m.length; p++) if (m[p] === want) out.push(p); return out; };

/**
 * GrabCut-style segmentation: refit fg/bg colour models from the current labels, then solve a
 * binary MRF (model NLL unaries + 8-neighbour contrast-sensitive Potts) with max-flow.
 */
function grabCut(S: Small, init: Uint8Array, hardFg: Uint8Array | null, hardBg: Uint8Array, iters: number, extraFg?: Float32Array): Uint8Array {
  const { w, h, lab } = S, n = w * h, K = 1e6, gamma = 50;
  const d2 = (p: number, q: number) => (lab[p * 3] - lab[q * 3]) ** 2 + (lab[p * 3 + 1] - lab[q * 3 + 1]) ** 2 + (lab[p * 3 + 2] - lab[q * 3 + 2]) ** 2;
  let mean = 0, cnt = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (x + 1 < w) { mean += d2(p, p + 1); cnt++; }
    if (y + 1 < h) { mean += d2(p, p + w); cnt++; }
  }
  const beta = 1 / (2 * Math.max(1e-6, mean / Math.max(1, cnt)));
  let labels = init.slice();
  for (let it = 0; it < iters; it++) {
    const fgIdx = indices(labels, 1), bgIdx = indices(labels, 0);
    if (!fgIdx.length || !bgIdx.length) break;
    const F = fitModel(lab, fgIdx, 5), B = fitModel(lab, bgIdx, 5);
    const g = new Graph(n, n * 4);
    for (let p = 0; p < n; p++) {
      if (hardFg?.[p]) g.addTWeights(p, K, 0);
      else if (hardBg[p]) g.addTWeights(p, 0, K);
      else g.addTWeights(p, nll(B, lab, p), nll(F, lab, p) + (extraFg ? extraFg[p] : 0));
    }
    const link = (p: number, q: number, s: number) => { const wt = (gamma * Math.exp(-beta * d2(p, q))) / s; g.addEdge(p, q, wt, wt); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (x + 1 < w) link(p, p + 1, 1);
      if (y + 1 < h) {
        link(p, p + w, 1);
        if (x + 1 < w) link(p, p + w + 1, Math.SQRT2);
        if (x > 0) link(p, p + w - 1, Math.SQRT2);
      }
    }
    g.maxflow();
    const next = new Uint8Array(n);
    for (let p = 0; p < n; p++) next[p] = g.inSource(p) ? 1 : 0;
    labels = next;
  }
  return labels;
}

/** 4-connected components of value `v`; returns a component id per pixel (-1 elsewhere) and sizes. */
function components(m: Uint8Array, w: number, h: number, v: number) {
  const id = new Int32Array(w * h).fill(-1), sizes: number[] = [], stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (m[s] !== v || id[s] >= 0) continue;
    const c = sizes.length;
    let size = 0;
    id[s] = c; stack.push(s);
    while (stack.length) {
      const p = stack.pop()!, x = p % w, y = (p / w) | 0;
      size++;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && m[q] === v && id[q] < 0) { id[q] = c; stack.push(q); }
      }
    }
    sizes.push(size);
  }
  return { id, sizes };
}

/** Drop foreground blobs smaller than `minFrac` of the largest; fill background holes not touching the border (up to `maxHole` pixels). */
function cleanMask(m: Uint8Array, w: number, h: number, minFrac: number, maxHole: number) {
  const fg = components(m, w, h, 1), big = Math.max(0, ...fg.sizes);
  for (let p = 0; p < w * h; p++) if (fg.id[p] >= 0 && fg.sizes[fg.id[p]] < big * minFrac) m[p] = 0;
  const bg = components(m, w, h, 0), touches = new Uint8Array(bg.sizes.length);
  for (let x = 0; x < w; x++) { touches[bg.id[x]] = 1; touches[bg.id[(h - 1) * w + x]] = 1; }
  for (let y = 0; y < h; y++) { touches[bg.id[y * w]] = 1; touches[bg.id[y * w + w - 1]] = 1; }
  for (let p = 0; p < w * h; p++) { const c = bg.id[p]; if (c >= 0 && !touches[c] && bg.sizes[c] <= maxHole) m[p] = 1; }
}

/**
 * Joint-bilateral upsampling (Kopf 2007) of the low-res binary mask, guided by the full-res colours,
 * so the edge follows real image edges. Returns a soft full-res alpha plane.
 */
function upsampleMask(img: Img, S: Small, m: Uint8Array): Uint8Array {
  const { width: W, height: H, data } = img, { w, h, rgb } = S, R = 2, T = 2 * R + 1;
  const out = new Uint8Array(W * H);
  const lut = new Float32Array(12300);
  for (let i = 0; i < lut.length; i++) lut[i] = Math.exp(-(i * 16) / (2 * 30 * 30));
  const axis = (N: number, n: number) => {
    const idx = new Int32Array(N * T), wt = new Float32Array(N * T), centre = new Int32Array(N);
    for (let x = 0; x < N; x++) {
      const f = ((x + 0.5) * n) / N - 0.5, c = Math.min(n - 1, Math.max(0, Math.round(f)));
      centre[x] = c;
      for (let i = 0; i < T; i++) { const q = c + i - R; idx[x * T + i] = Math.min(n - 1, Math.max(0, q)); wt[x * T + i] = Math.exp(-((q - f) ** 2) / 2); }
    }
    return { idx, wt, centre };
  };
  const X = axis(W, w), Y = axis(H, h);
  // Low-res pixels whose whole window agrees need no filtering (most of the image).
  const ws = windowSum(m, w, h, R), uniform = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const area = (Math.min(h - 1, y + R) - Math.max(0, y - R) + 1) * (Math.min(w - 1, x + R) - Math.max(0, x - R) + 1);
    const s = ws[y * w + x];
    uniform[y * w + x] = s === 0 || s === area ? 1 : 0;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, cq = Y.centre[y] * w + X.centre[x];
    if (uniform[cq]) { out[p] = m[cq] * 255; continue; }
    const i = p * 4, r0 = data[i], g0 = data[i + 1], b0 = data[i + 2];
    let acc = 0, sum = 0;
    for (let j = 0; j < T; j++) {
      const row = Y.idx[y * T + j] * w, wy = Y.wt[y * T + j];
      for (let k = 0; k < T; k++) {
        const q = row + X.idx[x * T + k];
        const dd = (r0 - rgb[q * 3]) ** 2 + (g0 - rgb[q * 3 + 1]) ** 2 + (b0 - rgb[q * 3 + 2]) ** 2;
        const wt = wy * X.wt[x * T + k] * lut[Math.min(lut.length - 1, dd >> 4)];
        acc += wt * m[q]; sum += wt;
      }
    }
    const v = sum > 0 ? acc / sum : m[cq];
    const t = Math.min(1, Math.max(0, (v - 0.3) / 0.4));
    out[p] = Math.round(t * t * (3 - 2 * t) * 255);
  }
  return out;
}

/**
 * Select Subject without ML: background colour model from the image border, saliency = distance
 * from it times a centre prior, then GrabCut refinement on a <=256 px grid and edge-aware upsampling.
 * Returns a soft alpha plane (0..255) at full resolution.
 */
export function selectSubject(img: Img): Uint8Array {
  const S = shrink(img, 256), { w, h, lab } = S, n = w * h;
  const bw = Math.max(2, Math.round(0.03 * Math.max(w, h)));
  const border = new Uint8Array(n), prior = new Float32Array(n), score = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, dx = (x + 0.5) / w - 0.5, dy = (y + 0.5) / h - 0.5;
    border[p] = x < bw || y < bw || x >= w - bw ? 1 : 0; // not the bottom edge: subjects often touch it
    prior[p] = Math.exp(-(dx * dx + dy * dy) / (2 * 0.3 * 0.3));
  }
  const bgM = fitModel(lab, indices(border), 5);
  for (let p = 0; p < n; p++) score[p] = Math.sqrt(nll(bgM, lab, p, true)) * prior[p];
  const thr = otsu(score);
  const init = new Uint8Array(n);
  let cnt = 0;
  for (let p = 0; p < n; p++) if (!border[p] && score[p] > thr) { init[p] = 1; cnt++; }
  if (cnt < n * 0.005) { // nothing stands out: start from the central box
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) init[y * w + x] = x > w / 4 && x < (3 * w) / 4 && y > h / 4 && y < (3 * h) / 4 ? 1 : 0;
  }
  const extra = prior.map((v) => 2 * (1 - v));
  const labels = grabCut(S, init, null, border, 4, extra);
  cleanMask(labels, w, h, 0.05, Infinity);
  return upsampleMask(img, S, labels);
}

/** Otsu threshold over a float array (256 bins up to the 99th percentile). */
function otsu(v: Float32Array): number {
  const sorted = v.slice().sort(), hi = Math.max(1e-6, sorted[Math.floor(sorted.length * 0.99)]);
  const hist = new Float64Array(256);
  for (const x of v) hist[Math.min(255, Math.floor((x / hi) * 255))]++;
  let total = 0, sumAll = 0;
  for (let i = 0; i < 256; i++) { total += hist[i]; sumAll += i * hist[i]; }
  let wB = 0, sB = 0, best = -1, at = 0;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; sB += i * hist[i];
    const wF = total - wB;
    if (!wB || !wF) continue;
    const between = wB * wF * (sB / wB - (sumAll - sB) / wF) ** 2;
    if (between > best) { best = between; at = i; }
  }
  return ((at + 0.5) / 255) * hi;
}

/**
 * Select Sky without ML: smooth, bright or blue pixels connected to the top edge that match a
 * colour model of the top rows, refined with the same graph cut. Null when the top doesn't look like sky.
 */
export function selectSky(img: Img): Uint8Array | null {
  const S = shrink(img, 256), { w, h, lab } = S, n = w * h;
  // Texture: local mean of the L gradient.
  const tex = new Float32Array(n), gl = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, L = (q: number) => lab[q * 3];
    gl[p] = (Math.abs(L(y * w + Math.min(w - 1, x + 1)) - L(y * w + Math.max(0, x - 1))) + Math.abs(L(Math.min(h - 1, y + 1) * w + x) - L(Math.max(0, y - 1) * w + x))) / 2;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, y - 2); j <= Math.min(h - 1, y + 2); j++) for (let i = Math.max(0, x - 2); i <= Math.min(w - 1, x + 2); i++) { s += gl[j * w + i]; c++; }
    tex[y * w + x] = s / c;
  }
  const band = Math.max(2, Math.round(0.06 * h)), top = new Uint8Array(n);
  let mL = 0, mT = 0;
  for (let p = 0; p < band * w; p++) { top[p] = 1; mL += lab[p * 3]; mT += tex[p]; }
  mL /= band * w; mT /= band * w;
  const TEX = 4;
  if (mT > TEX * 1.5 || mL < 35) return null;
  const topM = fitModel(lab, indices(top), 3);
  const cand = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const L = lab[p * 3], b = lab[p * 3 + 2];
    cand[p] = (tex[p] < TEX * 1.5 && nll(topM, lab, p, true) < 16) || (b < -8 && L > 40 && tex[p] < TEX * 2) ? 1 : 0;
  }
  // Keep candidates connected to the top edge.
  const comp = components(cand, w, h, 1), keep = new Uint8Array(comp.sizes.length);
  for (let x = 0; x < w; x++) if (comp.id[x] >= 0) keep[comp.id[x]] = 1;
  const region = new Uint8Array(n);
  let cnt = 0;
  for (let p = 0; p < n; p++) if (comp.id[p] >= 0 && keep[comp.id[p]]) { region[p] = 1; cnt++; }
  if (cnt < n * 0.01) return null;
  const hardFg = new Uint8Array(n), hardBg = new Uint8Array(n), bottom = Math.max(2, Math.round(0.05 * h));
  for (let p = 0; p < n; p++) {
    const y = (p / w) | 0;
    hardFg[p] = region[p] && y < band ? 1 : 0;
    hardBg[p] = !region[p] && y >= h - bottom ? 1 : 0;
  }
  const extra = tex.map((t) => Math.max(0, t - TEX));
  const labels = grabCut(S, region, hardFg, hardBg, 2, extra);
  // Only sky that reaches the top edge; fill small holes (birds, specks).
  const lc = components(labels, w, h, 1), lk = new Uint8Array(lc.sizes.length);
  for (let x = 0; x < w; x++) if (lc.id[x] >= 0) lk[lc.id[x]] = 1;
  for (let p = 0; p < n; p++) labels[p] = lc.id[p] >= 0 && lk[lc.id[p]] ? 1 : 0;
  cleanMask(labels, w, h, 0, n * 0.005);
  return upsampleMask(img, S, labels);
}

/** A unit of work for the worker (or the inline fallback). */
export type CaJob =
  | { kind: 'fill'; img: Img; alpha: Uint8Array; region: Rect | null; colorAdapt: boolean }
  | { kind: 'subject' | 'sky'; img: Img };

export function runCaJob(j: CaJob, onProgress?: (f: number) => void): Uint8ClampedArray | Uint8Array | null {
  if (j.kind === 'fill') return contentAwareFill(j.img, j.alpha, j.region, { colorAdapt: j.colorAdapt, onProgress });
  return j.kind === 'subject' ? selectSubject(j.img) : selectSky(j.img);
}
