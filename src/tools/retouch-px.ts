// Pure pixel math for the retouch tools (no DOM), so it can be checked outside the browser.
// Pixel buffers are RGBA, 8-bit straight alpha (ImageData) unless noted.

type Px = Uint8ClampedArray | Float32Array;

/** Source-over of a straight-alpha color with coverage t (0..1) onto pixel i. */
export function over(d: Px, i: number, r: number, g: number, b: number, t: number) {
  if (t <= 0) return;
  const da = d[i + 3] / 255, oa = t + da * (1 - t);
  const k = da * (1 - t);
  d[i] = (r * t + d[i] * k) / oa;
  d[i + 1] = (g * t + d[i + 1] * k) / oa;
  d[i + 2] = (b * t + d[i + 2] * k) / oa;
  d[i + 3] = oa * 255;
}

/** Move pixel i toward (r,g,b,a) by t, interpolating in premultiplied space (restores alpha too). */
export function mix(d: Px, i: number, r: number, g: number, b: number, a: number, t: number) {
  if (t <= 0) return;
  const da = d[i + 3], na = da + (a - da) * t;
  if (na <= 0.5) { d[i + 3] = 0; return; }
  d[i] = (d[i] * da + (r * a - d[i] * da) * t) / na;
  d[i + 1] = (d[i + 1] * da + (g * a - d[i + 1] * da) * t) / na;
  d[i + 2] = (d[i + 2] * da + (b * a - d[i + 2] * da) * t) / na;
  d[i + 3] = na;
}

export const luma = (d: Px, i: number) => (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;

/** One separable box pass over a 4-channel float buffer, edges clamped. */
function box1(src: Float32Array, dst: Float32Array, W: number, H: number, R: number, horiz: boolean) {
  const n = horiz ? W : H, m = horiz ? H : W, stride = horiz ? 4 : W * 4, line = horiz ? W * 4 : 4;
  const norm = 1 / (2 * R + 1);
  for (let j = 0; j < m; j++) {
    const base = j * line;
    for (let c = 0; c < 4; c++) {
      let s = 0;
      for (let k = -R; k <= R; k++) s += src[base + Math.min(n - 1, Math.max(0, k)) * stride + c];
      for (let k = 0; k < n; k++) {
        dst[base + k * stride + c] = s * norm;
        s += src[base + Math.min(n - 1, k + R + 1) * stride + c] - src[base + Math.max(0, k - R) * stride + c];
      }
    }
  }
}

/** Approximate gaussian blur (2 box passes) of RGBA pixels. Returns straight-alpha floats. */
export function blurred(d: Px, W: number, H: number, R: number): Float32Array {
  const a = new Float32Array(W * H * 4), b = new Float32Array(a.length);
  for (let i = 0; i < a.length; i += 4) {
    const al = d[i + 3] / 255;
    a[i] = d[i] * al; a[i + 1] = d[i + 1] * al; a[i + 2] = d[i + 2] * al; a[i + 3] = d[i + 3];
  }
  R = Math.max(1, Math.round(R));
  for (let p = 0; p < 2; p++) { box1(a, b, W, H, R, true); box1(b, a, W, H, R, false); }
  for (let i = 0; i < a.length; i += 4) {
    const al = a[i + 3] / 255;
    if (al > 0) { a[i] /= al; a[i + 1] /= al; a[i + 2] /= al; }
  }
  return a;
}

/**
 * Push-pull fill: `v` is premultiplied RGBA floats, `k` the known-ness (0..1) per pixel.
 * Unknown pixels get a smooth interpolation of the known ones (in place).
 */
export function pushPull(v: Float32Array, k: Float32Array, W: number, H: number) {
  if (W <= 1 && H <= 1) return;
  const w2 = Math.ceil(W / 2), h2 = Math.ceil(H / 2);
  const cv = new Float32Array(w2 * h2 * 4), ck = new Float32Array(w2 * h2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, kk = k[p];
    if (!kk) continue;
    const q = (y >> 1) * w2 + (x >> 1);
    ck[q] += kk;
    for (let c = 0; c < 4; c++) cv[q * 4 + c] += v[p * 4 + c] * kk;
  }
  for (let q = 0; q < w2 * h2; q++) {
    if (ck[q] > 0) for (let c = 0; c < 4; c++) cv[q * 4 + c] /= ck[q];
    ck[q] = Math.min(1, ck[q]);
  }
  pushPull(cv, ck, w2, h2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, kk = k[p];
    if (kk >= 1) continue;
    // Bilinear sample of the coarse level at this fine pixel's center.
    const fx = Math.min(w2 - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), fy = Math.min(h2 - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(w2 - 1, x0 + 1), y1 = Math.min(h2 - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    for (let c = 0; c < 4; c++) {
      const top = cv[(y0 * w2 + x0) * 4 + c] * (1 - tx) + cv[(y0 * w2 + x1) * 4 + c] * tx;
      const bot = cv[(y1 * w2 + x0) * 4 + c] * (1 - tx) + cv[(y1 * w2 + x1) * 4 + c] * tx;
      v[p * 4 + c] = v[p * 4 + c] * kk + (top * (1 - ty) + bot * ty) * (1 - kk);
    }
  }
}

/**
 * Inpaint the pixels where hole[p] is set: push-pull fill, a few diffusion passes to smooth
 * pyramid seams, then high-frequency texture borrowed from a nearby clean patch.
 */
export function inpaint(d: Px, W: number, H: number, hole: Uint8Array) {
  const n = W * H;
  const v = new Float32Array(n * 4), k = new Float32Array(n);
  let x1 = W, y1 = H, x2 = -1, y2 = -1;
  for (let p = 0; p < n; p++) {
    const al = d[p * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) v[p * 4 + c] = d[p * 4 + c] * al;
    v[p * 4 + 3] = d[p * 4 + 3];
    if (hole[p]) {
      const x = p % W, y = (p / W) | 0;
      if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
    } else k[p] = 1;
  }
  if (x2 < 0) return;
  pushPull(v, k, W, H);
  // Jacobi diffusion inside the hole only.
  const idx: number[] = [];
  for (let p = 0; p < n; p++) if (hole[p]) idx.push(p);
  const tmp = new Float32Array(idx.length * 4);
  for (let it = 0; it < 24; it++) {
    idx.forEach((p, j) => {
      const x = p % W, y = (p / W) | 0;
      const l = x > 0 ? p - 1 : p, r = x < W - 1 ? p + 1 : p, u = y > 0 ? p - W : p, dn = y < H - 1 ? p + W : p;
      for (let c = 0; c < 4; c++) tmp[j * 4 + c] = (v[l * 4 + c] + v[r * 4 + c] + v[u * 4 + c] + v[dn * 4 + c]) / 4;
    });
    idx.forEach((p, j) => { for (let c = 0; c < 4; c++) v[p * 4 + c] = tmp[j * 4 + c]; });
  }
  // Texture: detail (pixel minus its blur) from the best neighbouring patch beside the hole.
  const bw = x2 - x1 + 3, bh = y2 - y1 + 3;
  let best: [number, number] | null = null, bestScore = 0;
  for (const [dx, dy] of [[bw, 0], [-bw, 0], [0, bh], [0, -bh]]) {
    let score = 0;
    for (const p of idx) {
      const x = (p % W) + dx, y = ((p / W) | 0) + dy;
      if (x >= 0 && y >= 0 && x < W && y < H && !hole[y * W + x]) score++;
    }
    if (score > bestScore) { bestScore = score; best = [dx, dy]; }
  }
  const blur = best ? blurred(d, W, H, 2) : null;
  for (const p of idx) {
    const al = v[p * 4 + 3];
    const a = Math.max(0, Math.min(255, al));
    for (let c = 0; c < 3; c++) {
      let val = a > 0 ? v[p * 4 + c] / (a / 255) : 0;
      if (best && blur) {
        const x = (p % W) + best[0], y = ((p / W) | 0) + best[1];
        const q = y * W + x;
        if (x >= 0 && y >= 0 && x < W && y < H && !hole[q]) val += (d[q * 4 + c] - blur[q * 4 + c]) * 0.8;
      }
      d[p * 4 + c] = val;
    }
    d[p * 4 + 3] = a;
  }
}
