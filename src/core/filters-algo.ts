import { clamp, parseColor } from './util';

// Pure pixel algorithms for Image > Adjustments and the Filter menu.
// No DOM access here so the module can be exercised from Node (see filters-algo.check.ts).

/** Minimal ImageData shape; real ImageData satisfies it. */
export type Img = { width: number; height: number; data: Uint8ClampedArray };
export type ParamValue = number | string | boolean;

export interface FilterParam {
  key: string; label: string; value: ParamValue;
  /** Defaults to 'slider'. 'text' params are edited by a custom editor (Curves). */
  type?: 'slider' | 'select' | 'color' | 'checkbox' | 'text';
  min?: number; max?: number; step?: number; unit?: string;
  options?: string[];
}
export interface FilterDef {
  id: string; name: string; menu: 'adjust' | 'filter';
  /** Photoshop Filter submenu. */
  submenu?: string;
  /** Pure per-pixel color op (no neighborhood, no image statistics): usable as an adjustment layer. */
  point?: true;
  /** Dialog renders a custom editor instead of generic param rows. */
  custom?: 'curves';
  params: FilterParam[];
  run: (img: Img, p: Record<string, any>) => void;
}

// Param builders
const S = (key: string, label: string, min: number, max: number, value: number, extra: Partial<FilterParam> = {}): FilterParam => ({ key, label, min, max, value, ...extra });
const SEL = (key: string, label: string, options: string[], value = options[0]): FilterParam => ({ key, label, type: 'select', options, value });
const COL = (key: string, label: string, value: string): FilterParam => ({ key, label, type: 'color', value });
const CHK = (key: string, label: string, value: boolean): FilterParam => ({ key, label, type: 'checkbox', value });
const on = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';
const rgbOf = (hex: unknown): [number, number, number] => { const c = parseColor(String(hex ?? '#000')); return [c[0], c[1], c[2]]; };

/** Seeded PRNG (mulberry32) so previews and the final apply match. */
function rng(seed: number) {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const copyImg = (img: Img): Img => ({ width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) });
const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

const each = (img: Img, f: (d: Uint8ClampedArray, i: number) => void) => {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) f(d, i);
};

/** Apply per-channel 256-entry lookup tables to RGB. */
function applyLUT(img: Img, lr: ArrayLike<number>, lg = lr, lb = lr) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = lr[d[i]]; d[i + 1] = lg[d[i + 1]]; d[i + 2] = lb[d[i + 2]]; }
}

/** Shift every RGB channel so Rec.601 luma matches the original (Preserve Luminosity). */
function keepLuma(d: Uint8ClampedArray, i: number, y0: number) {
  const dy = y0 - luma(d[i], d[i + 1], d[i + 2]);
  d[i] += dy; d[i + 1] += dy; d[i + 2] += dy;
}

/** Hue/Saturation/Lightness shift of one pixel, blended by w. Allocation-free (same math as util rgbToHsl/hslToRgb). */
function hslShift(d: Uint8ClampedArray, i: number, dh: number, ds: number, dl: number, w = 1) {
  const r0 = d[i] / 255, g0 = d[i + 1] / 255, b0 = d[i + 2] / 255;
  const max = Math.max(r0, g0, b0), min = Math.min(r0, g0, b0), c = max - min;
  let l = (max + min) / 2, s = c ? (l > 0.5 ? c / (2 - max - min) : c / (max + min)) : 0;
  let h = !c ? 0 : (max === r0 ? (g0 - b0) / c + (g0 < b0 ? 6 : 0) : max === g0 ? (b0 - r0) / c + 2 : (r0 - g0) / c + 4) * 60;
  h = (((h + dh) % 360) + 360) % 360;
  s = clamp(ds >= 0 ? s + (1 - s) * (ds / 100) * s : s * (1 + ds / 100), 0, 1);
  l = clamp(dl >= 0 ? l + (1 - l) * (dl / 100) : l * (1 + dl / 100), 0, 1);
  const a = s * Math.min(l, 1 - l);
  for (let n = 0, ch = 0; ch < 3; ch++, n = ch === 1 ? 8 : 4) {
    const k = (n + h / 30) % 12, v = (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
    d[i + ch] += (v - d[i + ch]) * w;
  }
}

// Neighborhood helpers

/** In-place sliding box blur of a plane, `passes` times (3 passes ~ gaussian). */
function boxPlane(a: Float32Array, W: number, H: number, R: number, passes: number) {
  const tmp = new Float32Array(W * H), n = 2 * R + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < H; y++) {
      const row = y * W;
      let s = 0;
      for (let x = -R; x <= R; x++) s += a[row + clamp(x, 0, W - 1)];
      for (let x = 0; x < W; x++) {
        tmp[row + x] = s / n;
        s += a[row + Math.min(W - 1, x + R + 1)] - a[row + Math.max(0, x - R)];
      }
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let y = -R; y <= R; y++) s += tmp[clamp(y, 0, H - 1) * W + x];
      for (let y = 0; y < H; y++) {
        a[y * W + x] = s / n;
        s += tmp[Math.min(H - 1, y + R + 1) * W + x] - tmp[Math.max(0, y - R) * W + x];
      }
    }
  }
}

/** Box blur RGBA with premultiplied alpha. */
function blurImg(img: Img, R: number, passes: number) {
  const { width: W, height: H, data: d } = img;
  const ch = [0, 1, 2, 3].map(() => new Float32Array(W * H));
  for (let p = 0; p < W * H; p++) {
    const a = d[p * 4 + 3] / 255;
    ch[0][p] = d[p * 4] * a; ch[1][p] = d[p * 4 + 1] * a; ch[2][p] = d[p * 4 + 2] * a; ch[3][p] = d[p * 4 + 3];
  }
  for (const a of ch) boxPlane(a, W, H, R, passes);
  for (let p = 0; p < W * H; p++) {
    const a = ch[3][p], k = a > 0 ? 255 / a : 0;
    d[p * 4] = ch[0][p] * k; d[p * 4 + 1] = ch[1][p] * k; d[p * 4 + 2] = ch[2][p] * k; d[p * 4 + 3] = a;
  }
}
const blurRGBA = (img: Img, radius: number) => blurImg(img, Math.max(1, Math.round(radius / 2)), 3);

function lumaPlane(img: Img): Float32Array {
  const d = img.data, L = new Float32Array(img.width * img.height);
  for (let p = 0; p < L.length; p++) L[p] = luma(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
  return L;
}

/** 3x3 convolution on premultiplied RGBA, edges replicated. */
function convolve3(img: Img, k: number[]) {
  const { width: W, height: H, data: d } = img, src = new Float32Array(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    const a = d[p * 4 + 3] / 255;
    src[p * 4] = d[p * 4] * a; src[p * 4 + 1] = d[p * 4 + 1] * a; src[p * 4 + 2] = d[p * 4 + 2] * a; src[p * 4 + 3] = d[p * 4 + 3];
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = -1; j <= 1; j++) {
      const row = clamp(y + j, 0, H - 1) * W;
      for (let i = -1; i <= 1; i++) {
        const q = (row + clamp(x + i, 0, W - 1)) * 4, w = k[(j + 1) * 3 + i + 1];
        r += src[q] * w; g += src[q + 1] * w; b += src[q + 2] * w; a += src[q + 3] * w;
      }
    }
    const o = (y * W + x) * 4, al = clamp(a, 0, 255), m = al > 0 ? 255 / al : 0;
    d[o] = r * m; d[o + 1] = g * m; d[o + 2] = b * m; d[o + 3] = al;
  }
}

function unsharp(img: Img, amount: number, radius: number, threshold = 0) {
  const blurred = copyImg(img);
  blurRGBA(blurred, radius);
  const k = amount / 100, b = blurred.data, d = img.data;
  for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) {
    const diff = d[i + c] - b[i + c];
    if (Math.abs(diff) >= threshold) d[i + c] = d[i + c] + diff * k;
  }
}

/** Inverse-mapping warp with bilinear (alpha-weighted) sampling. `map` writes the source coords into o. */
function remap(img: Img, map: (x: number, y: number, o: Float64Array) => void, edge: 'clamp' | 'wrap' | 'transparent' = 'clamp') {
  const { width: W, height: H, data: d } = img, src = new Uint8ClampedArray(d), o = new Float64Array(2);
  const ix = (v: number, n: number) => (edge === 'wrap' ? ((v % n) + n) % n : v < 0 ? 0 : v >= n ? n - 1 : v);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    map(x, y, o);
    const sx = o[0], sy = o[1], i = (y * W + x) * 4;
    if (edge === 'transparent' && (sx < -0.5 || sy < -0.5 || sx > W - 0.5 || sy > H - 0.5)) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; continue; }
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    const xa = ix(x0, W), xb = ix(x0 + 1, W), ya = ix(y0, H) * W, yb = ix(y0 + 1, H) * W;
    const q00 = (ya + xa) * 4, q10 = (ya + xb) * 4, q01 = (yb + xa) * 4, q11 = (yb + xb) * 4;
    const w00 = (1 - fx) * (1 - fy) * src[q00 + 3], w10 = fx * (1 - fy) * src[q10 + 3], w01 = (1 - fx) * fy * src[q01 + 3], w11 = fx * fy * src[q11 + 3];
    const a = w00 + w10 + w01 + w11;
    if (a <= 0) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) d[i + c] = (src[q00 + c] * w00 + src[q10 + c] * w10 + src[q01 + c] * w01 + src[q11 + c] * w11) / a;
    d[i + 3] = a;
  }
}

/** Median of a (2r+1)^2 window per RGB channel (Huang sliding histogram). */
function medianImg(img: Img, r: number) {
  const { width: W, height: H, data: d } = img, src = new Uint8ClampedArray(d), k = 2 * r + 1, th = (k * k) >> 1;
  const hist = new Int32Array(256), rows = new Int32Array(k);
  for (let y = 0; y < H; y++) {
    for (let j = 0; j < k; j++) rows[j] = clamp(y + j - r, 0, H - 1) * W;
    for (let c = 0; c < 3; c++) {
      hist.fill(0);
      for (let j = 0; j < k; j++) for (let i = -r; i <= r; i++) hist[src[(rows[j] + clamp(i, 0, W - 1)) * 4 + c]]++;
      let m = 0, ltm = 0;
      while (ltm + hist[m] <= th) { ltm += hist[m]; m++; }
      for (let x = 0; ; ) {
        d[(y * W + x) * 4 + c] = m;
        if (++x >= W) break;
        const xo = Math.max(0, x - r - 1), xn = Math.min(W - 1, x + r);
        for (let j = 0; j < k; j++) {
          const vo = src[(rows[j] + xo) * 4 + c], vn = src[(rows[j] + xn) * 4 + c];
          hist[vo]--; if (vo < m) ltm--;
          hist[vn]++; if (vn < m) ltm++;
        }
        while (ltm > th) { m--; ltm -= hist[m]; }
        while (ltm + hist[m] <= th) { ltm += hist[m]; m++; }
      }
    }
  }
}

/** Running min/max over a window of 2r+1 along one line (van Herk / Gil-Werman, O(1) per sample). */
function minmaxLine(P: Uint8Array, m: number, r: number, out: Uint8Array, n: number, isMax: boolean, g: Uint8Array, h: Uint8Array) {
  const k = 2 * r + 1;
  for (let j = 0; j < m; j++) { const v = P[j]; g[j] = j % k === 0 ? v : isMax ? Math.max(g[j - 1], v) : Math.min(g[j - 1], v); }
  for (let j = m - 1; j >= 0; j--) { const v = P[j]; h[j] = j % k === k - 1 || j === m - 1 ? v : isMax ? Math.max(h[j + 1], v) : Math.min(h[j + 1], v); }
  for (let i = 0; i < n; i++) out[i] = isMax ? Math.max(h[i], g[i + 2 * r]) : Math.min(h[i], g[i + 2 * r]);
}

/** Square-window Maximum/Minimum on all four channels, separable. */
function rankMinMax(img: Img, r: number, isMax: boolean) {
  const { width: W, height: H, data: d } = img, L = Math.max(W, H), m = L + 2 * r;
  const P = new Uint8Array(m), g = new Uint8Array(m), h = new Uint8Array(m), out = new Uint8Array(L);
  for (let c = 0; c < 4; c++) {
    for (let y = 0; y < H; y++) {
      const row = y * W * 4 + c;
      for (let j = 0; j < W + 2 * r; j++) P[j] = d[row + clamp(j - r, 0, W - 1) * 4];
      minmaxLine(P, W + 2 * r, r, out, W, isMax, g, h);
      for (let x = 0; x < W; x++) d[row + x * 4] = out[x];
    }
    for (let x = 0; x < W; x++) {
      const col = x * 4 + c;
      for (let j = 0; j < H + 2 * r; j++) P[j] = d[col + clamp(j - r, 0, H - 1) * W * 4];
      minmaxLine(P, H + 2 * r, r, out, H, isMax, g, h);
      for (let y = 0; y < H; y++) d[col + y * W * 4] = out[y];
    }
  }
}

/** Sum over the n x n box ending at (x, y), edges replicated. Exact while sums stay < 2^24. */
function boxSumEnd(a: Float32Array, W: number, H: number, n: number): Float32Array {
  const t = new Float32Array(W * H), o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const row = y * W;
    let s = a[row] * n;
    for (let x = 0; x < W; x++) { if (x) s += a[row + x] - a[row + Math.max(0, x - n)]; t[row + x] = s; }
  }
  for (let x = 0; x < W; x++) {
    let s = t[x] * n;
    for (let y = 0; y < H; y++) { if (y) s += t[y * W + x] - t[Math.max(0, y - n) * W + x]; o[y * W + x] = s; }
  }
  return o;
}

/** Kuwahara filter: each pixel takes the mean of its least-varying quadrant (painterly, edge-preserving). */
// shortcut: keeps 5 full-size float planes (~240 MB at 4000x3000); tile the image if memory becomes a problem.
function kuwahara(img: Img, r: number) {
  const { width: W, height: H, data: d } = img, n = r + 1, N = n * n;
  const planes = [0, 1, 2].map((c) => { const p = new Float32Array(W * H); for (let i = 0; i < p.length; i++) p[i] = d[i * 4 + c]; return p; });
  const L = lumaPlane(img), L2 = new Float32Array(W * H);
  for (let i = 0; i < L.length; i++) { L[i] = Math.round(L[i]); L2[i] = L[i] * L[i]; }
  const [sR, sG, sB, sL, sL2] = [...planes, L, L2].map((p) => boxSumEnd(p, W, H, n));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const xs = [x, Math.min(W - 1, x + r)], ys = [y, Math.min(H - 1, y + r)];
    let best = -1, bv = Infinity;
    for (const yy of ys) for (const xx of xs) {
      const q = yy * W + xx, mu = sL[q] / N, v = sL2[q] / N - mu * mu;
      if (v < bv) { bv = v; best = q; }
    }
    const o = (y * W + x) * 4;
    d[o] = sR[best] / N; d[o + 1] = sG[best] / N; d[o + 2] = sB[best] / N;
  }
}

/** Separable edge-preserving blur (bilateral approximation of Photoshop's Surface Blur). */
function surfaceBlur(img: Img, r: number, threshold: number) {
  const { width: W, height: H, data: d } = img, t = Math.max(1, threshold * 2.5);
  // shortcut: at most ~21 taps per axis (strided for big radii) to stay interactive; use full taps if quality matters more.
  const st = Math.max(1, Math.ceil((2 * r + 1) / 21));
  const pass = (horiz: boolean) => {
    const src = new Uint8ClampedArray(d), len = horiz ? W : H, lines = horiz ? H : W;
    const step = horiz ? 4 : W * 4;
    for (let l = 0; l < lines; l++) {
      const base = horiz ? l * W * 4 : l * 4;
      for (let p = 0; p < len; p++) {
        const i = base + p * step;
        for (let c = 0; c < 3; c++) {
          const v = src[i + c];
          let s = 0, ws = 0;
          for (let k = Math.max(0, p - r), ke = Math.min(len - 1, p + r); k <= ke; k += st) {
            const u = src[base + k * step + c], w = 1 - Math.abs(u - v) / t;
            if (w > 0) { s += u * w; ws += w; }
          }
          d[i + c] = ws ? s / ws : v;
        }
      }
    }
  };
  pass(true); pass(false);
}

/** Jittered-grid Voronoi: nearest seed index and distance for every pixel. */
function voronoi(W: number, H: number, cell: number, seed: number) {
  const gw = Math.ceil(W / cell), gh = Math.ceil(H / cell), rand = rng(seed);
  const px = new Float32Array(gw * gh), py = new Float32Array(gw * gh);
  for (let g = 0; g < gw * gh; g++) { px[g] = ((g % gw) + rand()) * cell; py[g] = (Math.floor(g / gw) + rand()) * cell; }
  const label = new Int32Array(W * H), dist = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    let best = 0, bd = Infinity;
    for (let j = Math.max(0, gy - 1); j <= Math.min(gh - 1, gy + 1); j++) for (let i = Math.max(0, gx - 1); i <= Math.min(gw - 1, gx + 1); i++) {
      const g = j * gw + i, dd = (px[g] - x) ** 2 + (py[g] - y) ** 2;
      if (dd < bd) { bd = dd; best = g; }
    }
    label[y * W + x] = best; dist[y * W + x] = Math.sqrt(bd);
  }
  return { label, dist, cells: gw * gh };
}

/** Alpha-weighted mean RGBA per Voronoi cell. */
function cellMeans(img: Img, label: Int32Array, cells: number) {
  const d = img.data, acc = new Float64Array(cells * 5);
  for (let p = 0; p < label.length; p++) {
    const g = label[p] * 5, a = d[p * 4 + 3];
    acc[g] += d[p * 4] * a; acc[g + 1] += d[p * 4 + 1] * a; acc[g + 2] += d[p * 4 + 2] * a; acc[g + 3] += a; acc[g + 4]++;
  }
  const out = new Float32Array(cells * 4);
  for (let g = 0; g < cells; g++) {
    const a = acc[g * 5 + 3];
    out[g * 4] = a ? acc[g * 5] / a : 0; out[g * 4 + 1] = a ? acc[g * 5 + 1] / a : 0; out[g * 4 + 2] = a ? acc[g * 5 + 2] / a : 0;
    out[g * 4 + 3] = acc[g * 5 + 4] ? a / acc[g * 5 + 4] : 0;
  }
  return out;
}

/** Fractal value noise in 0..1. cellX/cellY set the largest feature size. */
function fbm(W: number, H: number, seed: number, cellX: number, cellY: number, octaves: number): Float32Array {
  const out = new Float32Array(W * H), rand = rng(seed);
  const fade = (t: number) => t * t * (3 - 2 * t);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const cx = Math.max(1, cellX / 2 ** o), cy = Math.max(1, cellY / 2 ** o);
    const gw = Math.ceil(W / cx) + 2, gh = Math.ceil(H / cy) + 2, lat = new Float32Array(gw * gh);
    for (let i = 0; i < lat.length; i++) lat[i] = rand();
    const x0 = new Int32Array(W), fx = new Float32Array(W);
    for (let x = 0; x < W; x++) { const u = x / cx; x0[x] = Math.floor(u); fx[x] = fade(u - x0[x]); }
    for (let y = 0; y < H; y++) {
      const v = y / cy, y0 = Math.floor(v), fy = fade(v - y0), r0 = y0 * gw, r1 = r0 + gw;
      for (let x = 0; x < W; x++) {
        const a = lat[r0 + x0[x]], b = lat[r0 + x0[x] + 1], c = lat[r1 + x0[x]], e = lat[r1 + x0[x] + 1], t = fx[x];
        out[y * W + x] += amp * ((a + (b - a) * t) * (1 - fy) + (c + (e - c) * t) * fy);
      }
    }
    total += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Fill RGB with lerp(c1, c2, n) and make opaque. */
function paintNoise(img: Img, n: Float32Array, c1: number[], c2: number[], diff = false) {
  const d = img.data;
  for (let p = 0; p < n.length; p++) {
    const t = n[p], i = p * 4;
    for (let c = 0; c < 3; c++) {
      const v = c1[c] + (c2[c] - c1[c]) * t;
      d[i + c] = diff ? Math.abs(d[i + c] - v) : v;
    }
    if (!diff) d[i + 3] = 255;
  }
}

// Stats-based helpers (Auto Tone/Contrast/Color, Equalize)

function histograms(img: Img) {
  const d = img.data, h = [new Float64Array(256), new Float64Array(256), new Float64Array(256)];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { h[0][d[i]]++; h[1][d[i + 1]]++; h[2][d[i + 2]]++; }
  return h;
}
/** Black/white points that clip `clip` fraction at each end. */
function clipPoints(h: Float64Array, clip: number): [number, number] {
  let n = 0; for (let v = 0; v < 256; v++) n += h[v];
  const cut = n * clip;
  let lo = 0, hi = 255, s = 0;
  for (s = 0; lo < 255 && s + h[lo] <= cut; lo++) s += h[lo];
  for (s = 0; hi > 0 && s + h[hi] <= cut; hi--) s += h[hi];
  return hi > lo ? [lo, hi] : [0, 255];
}
const stretchLUT = (lo: number, hi: number, gamma = 1) => {
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = 255 * Math.pow(clamp((v - lo) / (hi - lo), 0, 1), gamma);
  return lut;
};

// Curves

/** Parse "x,y;x,y;..." into sorted, x-unique control points. */
export function parseCurve(s: unknown): [number, number][] {
  const pts = String(s ?? '').split(';').map((t) => t.split(',').map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite)).map((p) => [clamp(p[0], 0, 255), clamp(p[1], 0, 255)] as [number, number]);
  pts.sort((a, b) => a[0] - b[0]);
  const out = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0]);
  return out.length ? out : [[0, 0], [255, 255]];
}
export const formatCurve = (pts: [number, number][]) => pts.map((p) => `${Math.round(p[0])},${Math.round(p[1])}`).join(';');

/** Monotone cubic (Fritsch-Carlson) interpolation of control points to a 256-entry LUT. */
export function curveLUT(pts: [number, number][]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256), n = pts.length;
  if (n === 1) return lut.fill(pts[0][1]);
  const m: number[] = [], t: number[] = [];
  for (let i = 0; i < n - 1; i++) m.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]));
  t.push(m[0]);
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  for (let v = 0, k = 0; v < 256; v++) {
    if (v <= pts[0][0]) { lut[v] = pts[0][1]; continue; }
    if (v >= pts[n - 1][0]) { lut[v] = pts[n - 1][1]; continue; }
    while (v > pts[k + 1][0]) k++;
    const h = pts[k + 1][0] - pts[k][0], s = (v - pts[k][0]) / h, s2 = s * s, s3 = s2 * s;
    lut[v] = (2 * s3 - 3 * s2 + 1) * pts[k][1] + (s3 - 2 * s2 + s) * h * t[k] + (-2 * s3 + 3 * s2) * pts[k + 1][1] + (s3 - s2) * h * t[k + 1];
  }
  return lut;
}

const IDENTITY_CURVE = '0,0;255,255';
const PHOTO_FILTERS: Record<string, string> = {
  'Warming Filter (85)': '#ec8a00', 'Warming Filter (LBA)': '#fa9600', 'Warming Filter (81)': '#eba10f',
  'Cooling Filter (80)': '#006dff', 'Cooling Filter (LBB)': '#005dff', 'Cooling Filter (82)': '#00b5ff', Sepia: '#ac7a33',
};
const SELECTIVE = ['Reds', 'Yellows', 'Greens', 'Cyans', 'Blues', 'Magentas', 'Whites', 'Neutrals', 'Blacks'];

/** Color Balance tonal weights (GIMP model) for a channel value 0..1. */
const cbWeights = (v: number): [number, number, number] => {
  const a = 0.25, b = 0.333, sc = 0.7;
  return [
    clamp((v - b) / -a + 0.5, 0, 1) * sc,
    clamp((v - b) / a + 0.5, 0, 1) * clamp((v + b - 1) / -a + 0.5, 0, 1) * sc,
    clamp((v + b - 1) / a + 0.5, 0, 1) * sc,
  ];
};

export const FILTERS: FilterDef[] = [
  // Image > Adjustments
  {
    id: 'brightness-contrast', name: 'Brightness/Contrast', menu: 'adjust', point: true,
    params: [S('brightness', 'Brightness', -150, 150, 0), S('contrast', 'Contrast', -100, 100, 0)],
    run: (img, p) => {
      const c = p.contrast / 100, f = c >= 0 ? 1 / (1 - c * 0.99) : 1 + c, lut = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) lut[v] = (v + p.brightness - 128) * f + 128;
      applyLUT(img, lut);
    },
  },
  {
    id: 'levels', name: 'Levels', menu: 'adjust', point: true,
    params: [S('black', 'Input black', 0, 254, 0), S('white', 'Input white', 1, 255, 255), S('gamma', 'Gamma', 0.1, 3, 1, { step: 0.01 })],
    run: (img, p) => {
      const lut = new Uint8ClampedArray(256), range = Math.max(1, p.white - p.black);
      for (let v = 0; v < 256; v++) lut[v] = 255 * Math.pow(clamp((v - p.black) / range, 0, 1), 1 / p.gamma);
      applyLUT(img, lut);
    },
  },
  {
    id: 'curves', name: 'Curves', menu: 'adjust', point: true, custom: 'curves',
    params: [
      { key: 'rgb', label: 'RGB', type: 'text', value: IDENTITY_CURVE },
      { key: 'red', label: 'Red', type: 'text', value: IDENTITY_CURVE },
      { key: 'green', label: 'Green', type: 'text', value: IDENTITY_CURVE },
      { key: 'blue', label: 'Blue', type: 'text', value: IDENTITY_CURVE },
    ],
    run: (img, p) => {
      const master = curveLUT(parseCurve(p.rgb));
      const [r, g, b] = [p.red, p.green, p.blue].map((s) => curveLUT(parseCurve(s)).map((v) => master[v]));
      applyLUT(img, r, g, b);
    },
  },
  {
    id: 'exposure', name: 'Exposure', menu: 'adjust', point: true,
    params: [S('exposure', 'Exposure', -3, 3, 0, { step: 0.05 })],
    run: (img, p) => { const k = Math.pow(2, p.exposure), lut = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) lut[v] = v * k; applyLUT(img, lut); },
  },
  {
    id: 'vibrance', name: 'Vibrance', menu: 'adjust', point: true,
    params: [S('amount', 'Vibrance', -100, 100, 30)],
    run: (img, p) => each(img, (d, i) => {
      const max = Math.max(d[i], d[i + 1], d[i + 2]), avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
      const amt = ((Math.abs(max - avg) * 2) / 255) * (-p.amount / 100) + p.amount / 100;
      for (let k = 0; k < 3; k++) d[i + k] += (d[i + k] - avg) * amt;
    }),
  },
  {
    id: 'hue-saturation', name: 'Hue/Saturation', menu: 'adjust', point: true,
    params: [S('hue', 'Hue', -180, 180, 0, { unit: '°' }), S('saturation', 'Saturation', -100, 100, 0), S('lightness', 'Lightness', -100, 100, 0)],
    run: (img, p) => each(img, (d, i) => hslShift(d, i, p.hue, p.saturation, p.lightness)),
  },
  {
    id: 'color-balance', name: 'Color Balance', menu: 'adjust', point: true,
    params: [
      S('shadowsCR', 'Shadows Cyan–Red', -100, 100, 0), S('shadowsMG', 'Shadows Magenta–Green', -100, 100, 0), S('shadowsYB', 'Shadows Yellow–Blue', -100, 100, 0),
      S('midCR', 'Midtones Cyan–Red', -100, 100, 0), S('midMG', 'Midtones Magenta–Green', -100, 100, 0), S('midYB', 'Midtones Yellow–Blue', -100, 100, 0),
      S('highCR', 'Highlights Cyan–Red', -100, 100, 0), S('highMG', 'Highlights Magenta–Green', -100, 100, 0), S('highYB', 'Highlights Yellow–Blue', -100, 100, 0),
      CHK('preserve', 'Preserve Luminosity', true),
    ],
    run: (img, p) => {
      const luts = (['CR', 'MG', 'YB'] as const).map((k) => {
        const lut = new Uint8ClampedArray(256), s = +p['shadows' + k] / 100, m = +p['mid' + k] / 100, h = +p['high' + k] / 100;
        for (let v = 0; v < 256; v++) { const [ws, wm, wh] = cbWeights(v / 255); lut[v] = v + 255 * (s * ws + m * wm + h * wh); }
        return lut;
      });
      const d = img.data, keep = on(p.preserve);
      for (let i = 0; i < d.length; i += 4) {
        const y0 = luma(d[i], d[i + 1], d[i + 2]);
        d[i] = luts[0][d[i]]; d[i + 1] = luts[1][d[i + 1]]; d[i + 2] = luts[2][d[i + 2]];
        if (keep) keepLuma(d, i, y0);
      }
    },
  },
  { id: 'grayscale', name: 'Black & White', menu: 'adjust', point: true, params: [], run: (img) => each(img, (d, i) => { const v = luma(d[i], d[i + 1], d[i + 2]); d[i] = d[i + 1] = d[i + 2] = v; }) },
  {
    id: 'photo-filter', name: 'Photo Filter', menu: 'adjust', point: true,
    params: [SEL('filter', 'Filter', ['Custom', ...Object.keys(PHOTO_FILTERS)], 'Warming Filter (85)'), COL('color', 'Color (Custom)', '#ec8a00'), S('density', 'Density', 0, 100, 25, { unit: '%' }), CHK('preserve', 'Preserve Luminosity', true)],
    run: (img, p) => {
      const col = rgbOf(PHOTO_FILTERS[p.filter] ?? p.color), k = p.density / 100, d = img.data, keep = on(p.preserve);
      for (let i = 0; i < d.length; i += 4) {
        const y0 = luma(d[i], d[i + 1], d[i + 2]);
        for (let c = 0; c < 3; c++) d[i + c] += (d[i + c] * col[c] / 255 - d[i + c]) * k;
        if (keep) keepLuma(d, i, y0);
      }
    },
  },
  {
    id: 'channel-mixer', name: 'Channel Mixer', menu: 'adjust', point: true,
    params: [
      S('rr', 'Red out: Red', -200, 200, 100, { unit: '%' }), S('rg', 'Red out: Green', -200, 200, 0, { unit: '%' }), S('rb', 'Red out: Blue', -200, 200, 0, { unit: '%' }), S('rc', 'Red out: Constant', -200, 200, 0, { unit: '%' }),
      S('gr', 'Green out: Red', -200, 200, 0, { unit: '%' }), S('gg', 'Green out: Green', -200, 200, 100, { unit: '%' }), S('gb', 'Green out: Blue', -200, 200, 0, { unit: '%' }), S('gc', 'Green out: Constant', -200, 200, 0, { unit: '%' }),
      S('br', 'Blue out: Red', -200, 200, 0, { unit: '%' }), S('bg', 'Blue out: Green', -200, 200, 0, { unit: '%' }), S('bb', 'Blue out: Blue', -200, 200, 100, { unit: '%' }), S('bc', 'Blue out: Constant', -200, 200, 0, { unit: '%' }),
      CHK('mono', 'Monochrome (uses Red row)', false),
    ],
    run: (img, p) => {
      const m = ['rr', 'rg', 'rb', 'gr', 'gg', 'gb', 'br', 'bg', 'bb'].map((k) => p[k] / 100), c = [p.rc, p.gc, p.bc].map((v) => (v / 100) * 255);
      if (on(p.mono)) { for (let k = 3; k < 9; k++) m[k] = m[k % 3]; c[1] = c[2] = c[0]; }
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        d[i] = r * m[0] + g * m[1] + b * m[2] + c[0];
        d[i + 1] = r * m[3] + g * m[4] + b * m[5] + c[1];
        d[i + 2] = r * m[6] + g * m[7] + b * m[8] + c[2];
      }
    },
  },
  { id: 'invert', name: 'Invert', menu: 'adjust', point: true, params: [], run: (img) => { const lut = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) lut[v] = 255 - v; applyLUT(img, lut); } },
  {
    id: 'posterize', name: 'Posterize', menu: 'adjust', point: true, params: [S('levels', 'Levels', 2, 32, 6)],
    run: (img, p) => { const n = Math.max(1, Math.round(p.levels) - 1), lut = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) lut[v] = Math.round((v / 255) * n) * (255 / n); applyLUT(img, lut); },
  },
  {
    id: 'threshold', name: 'Threshold', menu: 'adjust', point: true, params: [S('level', 'Level', 1, 255, 128)],
    run: (img, p) => each(img, (d, i) => { const v = luma(d[i], d[i + 1], d[i + 2]) >= p.level ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = v; }),
  },
  {
    id: 'gradient-map', name: 'Gradient Map', menu: 'adjust', point: true,
    params: [COL('c1', 'Shadows color', '#000000'), COL('c2', 'Highlights color', '#ffffff'), CHK('reverse', 'Reverse', false)],
    run: (img, p) => {
      let a = rgbOf(p.c1), b = rgbOf(p.c2);
      if (on(p.reverse)) [a, b] = [b, a];
      const lut = [0, 1, 2].map((c) => { const l = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) l[v] = a[c] + ((b[c] - a[c]) * v) / 255; return l; });
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) { const y = Math.round(luma(d[i], d[i + 1], d[i + 2])); d[i] = lut[0][y]; d[i + 1] = lut[1][y]; d[i + 2] = lut[2][y]; }
    },
  },
  {
    id: 'selective-color', name: 'Selective Color', menu: 'adjust', point: true,
    params: [SEL('colors', 'Colors', SELECTIVE), S('cyan', 'Cyan', -100, 100, 0, { unit: '%' }), S('magenta', 'Magenta', -100, 100, 0, { unit: '%' }), S('yellow', 'Yellow', -100, 100, 0, { unit: '%' }), S('black', 'Black', -100, 100, 0, { unit: '%' }), SEL('method', 'Method', ['Relative', 'Absolute'])],
    run: (img, p) => {
      const sel = Math.max(0, SELECTIVE.indexOf(p.colors)), adj = [p.cyan / 100, p.magenta / 100, p.yellow / 100], kb = p.black / 100, rel = p.method !== 'Absolute', d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), mid = r + g + b - max - min;
        let w = 0;
        switch (sel) {
          case 0: if (r === max) w = max - mid; break;
          case 1: if (b === min) w = mid - min; break;
          case 2: if (g === max) w = max - mid; break;
          case 3: if (r === min) w = mid - min; break;
          case 4: if (b === max) w = max - mid; break;
          case 5: if (g === min) w = mid - min; break;
          case 6: if (min > 0.5) w = (min - 0.5) * 2; break;
          case 7: w = Math.max(0, 1 - (Math.abs(max - 0.5) + Math.abs(min - 0.5))); break;
          case 8: if (max < 0.5) w = (0.5 - max) * 2; break;
        }
        if (!w) continue;
        for (let c = 0; c < 3; c++) {
          const v = d[i + c] / 255, base = (-1 - adj[c]) * kb - adj[c];
          d[i + c] = 255 * (v + clamp(rel ? base * (1 - v) : base, -v, 1 - v) * w);
        }
      }
    },
  },
  {
    id: 'shadows-highlights', name: 'Shadows/Highlights', menu: 'adjust',
    params: [S('shadows', 'Shadows amount', 0, 100, 35, { unit: '%' }), S('highlights', 'Highlights amount', 0, 100, 0, { unit: '%' }), S('radius', 'Radius', 1, 100, 30, { unit: 'px' })],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, L = lumaPlane(img), s = p.shadows / 100, h = p.highlights / 100;
      boxPlane(L, W, H, Math.max(1, Math.round(p.radius / 2)), 3);
      for (let q = 0; q < L.length; q++) {
        const l = L[q] / 255, ws = (1 - l) ** 2 * s, wh = l * l * h, i = q * 4;
        for (let c = 0; c < 3; c++) d[i + c] = d[i + c] + (255 - d[i + c]) * ws - d[i + c] * wh;
      }
    },
  },
  {
    id: 'desaturate', name: 'Desaturate', menu: 'adjust', point: true, params: [],
    run: (img) => each(img, (d, i) => { const v = (Math.max(d[i], d[i + 1], d[i + 2]) + Math.min(d[i], d[i + 1], d[i + 2])) / 2; d[i] = d[i + 1] = d[i + 2] = v; }),
  },
  {
    id: 'replace-color', name: 'Replace Color', menu: 'adjust', point: true,
    params: [COL('color', 'Select color', '#ff0000'), S('fuzziness', 'Fuzziness', 0, 200, 40), S('hue', 'Hue', -180, 180, 0, { unit: '°' }), S('saturation', 'Saturation', -100, 100, 0), S('lightness', 'Lightness', -100, 100, 0)],
    run: (img, p) => {
      const [tr, tg, tb] = rgbOf(p.color), f = Math.max(1, p.fuzziness * 2), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const w = 1 - Math.hypot(d[i] - tr, d[i + 1] - tg, d[i + 2] - tb) / f;
        if (w > 0) hslShift(d, i, p.hue, p.saturation, p.lightness, w);
      }
    },
  },
  {
    id: 'equalize', name: 'Equalize', menu: 'adjust', params: [],
    run: (img) => {
      const [hr, hg, hb] = histograms(img), cdf = new Float64Array(256);
      let s = 0; for (let v = 0; v < 256; v++) { s += hr[v] + hg[v] + hb[v]; cdf[v] = s; }
      let c0 = 0; for (let v = 0; v < 256; v++) if (cdf[v]) { c0 = cdf[v]; break; }
      const lut = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) lut[v] = s > c0 ? Math.round(((cdf[v] - c0) / (s - c0)) * 255) : v;
      applyLUT(img, lut);
    },
  },
  {
    id: 'auto-tone', name: 'Auto Tone', menu: 'adjust', params: [],
    run: (img) => { const [r, g, b] = histograms(img).map((h) => stretchLUT(...clipPoints(h, 0.001))); applyLUT(img, r, g, b); },
  },
  {
    id: 'auto-contrast', name: 'Auto Contrast', menu: 'adjust', params: [],
    run: (img) => {
      const hs = histograms(img), all = new Float64Array(256);
      for (let v = 0; v < 256; v++) all[v] = hs[0][v] + hs[1][v] + hs[2][v];
      applyLUT(img, stretchLUT(...clipPoints(all, 0.001)));
    },
  },
  {
    id: 'auto-color', name: 'Auto Color', menu: 'adjust', params: [],
    run: (img) => {
      const pts = histograms(img).map((h) => clipPoints(h, 0.001));
      applyLUT(img, ...(pts.map(([lo, hi]) => stretchLUT(lo, hi)) as [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray]));
      // Neutralize midtones: gamma each channel so its mean meets the common mean.
      const hs = histograms(img), means = hs.map((h) => { let n = 0, s = 0; for (let v = 0; v < 256; v++) { n += h[v]; s += h[v] * v; } return n ? s / n / 255 : 0.5; });
      const target = clamp((means[0] + means[1] + means[2]) / 3, 0.01, 0.99);
      const luts = means.map((m) => stretchLUT(0, 255, clamp(Math.log(target) / Math.log(clamp(m, 0.01, 0.99)), 0.5, 2)));
      applyLUT(img, luts[0], luts[1], luts[2]);
    },
  },
  {
    id: 'sepia', name: 'Sepia', menu: 'adjust', point: true, params: [S('amount', 'Amount', 0, 100, 100)],
    run: (img, p) => each(img, (d, i) => {
      const r = d[i], g = d[i + 1], b = d[i + 2], k = p.amount / 100;
      d[i] = r + ((0.393 * r + 0.769 * g + 0.189 * b) - r) * k;
      d[i + 1] = g + ((0.349 * r + 0.686 * g + 0.168 * b) - g) * k;
      d[i + 2] = b + ((0.272 * r + 0.534 * g + 0.131 * b) - b) * k;
    }),
  },

  // Filter > Blur
  {
    id: 'average', name: 'Average', menu: 'filter', submenu: 'Blur', params: [],
    run: (img) => {
      const d = img.data; let r = 0, g = 0, b = 0, a = 0;
      for (let i = 0; i < d.length; i += 4) { const w = d[i + 3]; r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; a += w; }
      if (!a) return;
      for (let i = 0; i < d.length; i += 4) { d[i] = r / a; d[i + 1] = g / a; d[i + 2] = b / a; }
    },
  },
  { id: 'blur', name: 'Blur', menu: 'filter', submenu: 'Blur', params: [], run: (img) => convolve3(img, [1, 2, 1, 2, 4, 2, 1, 2, 1].map((v) => v / 16)) },
  { id: 'blur-more', name: 'Blur More', menu: 'filter', submenu: 'Blur', params: [], run: (img) => blurImg(img, 1, 3) },
  {
    id: 'box-blur', name: 'Box Blur', menu: 'filter', submenu: 'Blur', params: [S('radius', 'Radius', 1, 200, 10, { unit: 'px' })],
    run: (img, p) => blurImg(img, Math.max(1, Math.round(p.radius)), 1),
  },
  {
    id: 'gaussian-blur', name: 'Gaussian Blur', menu: 'filter', submenu: 'Blur', params: [S('radius', 'Radius', 1, 100, 6, { unit: 'px' })],
    run: (img, p) => blurRGBA(img, p.radius),
  },
  {
    id: 'motion-blur', name: 'Motion Blur', menu: 'filter', submenu: 'Blur',
    params: [S('angle', 'Angle', -90, 90, 0, { unit: '°' }), S('distance', 'Distance', 1, 500, 10, { unit: 'px' })],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, src = new Uint8ClampedArray(d), a = (p.angle * Math.PI) / 180;
      // shortcut: at most 64 nearest-neighbor taps; long distances get sparser sampling.
      const n = Math.max(2, Math.min(64, Math.round(p.distance))), ox = new Int32Array(n), oy = new Int32Array(n);
      for (let k = 0; k < n; k++) { const t = (k / (n - 1) - 0.5) * p.distance; ox[k] = Math.round(Math.cos(a) * t); oy[k] = Math.round(-Math.sin(a) * t); }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let r = 0, g = 0, b = 0, al = 0;
        for (let k = 0; k < n; k++) {
          const q = (clamp(y + oy[k], 0, H - 1) * W + clamp(x + ox[k], 0, W - 1)) * 4, w = src[q + 3];
          r += src[q] * w; g += src[q + 1] * w; b += src[q + 2] * w; al += w;
        }
        const i = (y * W + x) * 4;
        if (al) { d[i] = r / al; d[i + 1] = g / al; d[i + 2] = b / al; }
        d[i + 3] = al / n;
      }
    },
  },
  {
    id: 'radial-blur', name: 'Radial Blur', menu: 'filter', submenu: 'Blur',
    params: [S('amount', 'Amount', 1, 100, 10), SEL('method', 'Method', ['Spin', 'Zoom']), S('x', 'Center X', 0, 100, 50, { unit: '%' }), S('y', 'Center Y', 0, 100, 50, { unit: '%' })],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, src = new Uint8ClampedArray(d), n = 24;
      const cx = (W * p.x) / 100, cy = (H * p.y) / 100, zoom = p.method === 'Zoom', amt = p.amount / 100;
      const cs = new Float64Array(n), sn = new Float64Array(n);
      for (let k = 0; k < n; k++) {
        const t = k / (n - 1) - 0.5;
        if (zoom) { cs[k] = 1 + t * amt * 0.5; sn[k] = 0; } else { const ang = t * amt * (Math.PI / 3); cs[k] = Math.cos(ang); sn[k] = Math.sin(ang); }
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dx = x - cx, dy = y - cy;
        let r = 0, g = 0, b = 0, al = 0;
        for (let k = 0; k < n; k++) {
          const sx = Math.round(cx + dx * cs[k] - dy * sn[k]), sy = Math.round(cy + dx * sn[k] + dy * cs[k]);
          const q = (clamp(sy, 0, H - 1) * W + clamp(sx, 0, W - 1)) * 4, w = src[q + 3];
          r += src[q] * w; g += src[q + 1] * w; b += src[q + 2] * w; al += w;
        }
        const i = (y * W + x) * 4;
        if (al) { d[i] = r / al; d[i + 1] = g / al; d[i + 2] = b / al; }
        d[i + 3] = al / n;
      }
    },
  },
  {
    id: 'surface-blur', name: 'Surface Blur', menu: 'filter', submenu: 'Blur',
    params: [S('radius', 'Radius', 1, 50, 5, { unit: 'px' }), S('threshold', 'Threshold', 2, 255, 15)],
    run: (img, p) => surfaceBlur(img, Math.round(p.radius), p.threshold),
  },

  // Filter > Distort
  {
    id: 'pinch', name: 'Pinch', menu: 'filter', submenu: 'Distort', params: [S('amount', 'Amount', -100, 100, 50, { unit: '%' })],
    run: (img, p) => {
      const cx = (img.width - 1) / 2, cy = (img.height - 1) / 2, R = Math.min(img.width, img.height) / 2, a = clamp(p.amount / 100, -1, 1);
      remap(img, (x, y, o) => {
        const dx = x - cx, dy = y - cy, dd = Math.hypot(dx, dy) / R;
        const f = dd >= 1 || dd === 0 ? 1 : Math.pow(Math.sin((Math.PI / 2) * dd), -a);
        o[0] = cx + dx * f; o[1] = cy + dy * f;
      });
    },
  },
  {
    id: 'polar-coordinates', name: 'Polar Coordinates', menu: 'filter', submenu: 'Distort', params: [SEL('mode', 'Mode', ['Rectangular to Polar', 'Polar to Rectangular'])],
    run: (img, p) => {
      const W = img.width, H = img.height, cx = W / 2, cy = H / 2;
      if (p.mode === 'Polar to Rectangular') remap(img, (x, y, o) => {
        const t = (x / W) * 2 * Math.PI - Math.PI, r = y / H;
        o[0] = cx + Math.sin(t) * r * cx; o[1] = cy - Math.cos(t) * r * cy;
      });
      else remap(img, (x, y, o) => {
        const dx = (x - cx) / cx, dy = (y - cy) / cy;
        o[0] = ((Math.atan2(dx, -dy) + Math.PI) / (2 * Math.PI)) * W; o[1] = Math.hypot(dx, dy) * H;
      });
    },
  },
  {
    id: 'ripple', name: 'Ripple', menu: 'filter', submenu: 'Distort', params: [S('amount', 'Amount', -999, 999, 100, { unit: '%' }), SEL('size', 'Size', ['Small', 'Medium', 'Large'], 'Medium')],
    run: (img, p) => {
      const L = p.size === 'Small' ? 8 : p.size === 'Large' ? 32 : 16, A = ((p.amount / 100) * L) / 4, k = (2 * Math.PI) / L;
      remap(img, (x, y, o) => { o[0] = x + A * Math.sin(y * k); o[1] = y + A * Math.sin(x * k); });
    },
  },
  {
    id: 'spherize', name: 'Spherize', menu: 'filter', submenu: 'Distort', params: [S('amount', 'Amount', -100, 100, 100, { unit: '%' })],
    run: (img, p) => {
      const cx = (img.width - 1) / 2, cy = (img.height - 1) / 2, R = Math.min(img.width, img.height) / 2, f = clamp(p.amount / 100, -1, 1);
      remap(img, (x, y, o) => {
        const dx = x - cx, dy = y - cy, dd = Math.hypot(dx, dy) / R;
        let k = 1;
        if (dd > 0 && dd < 1) { const g = f > 0 ? Math.asin(dd) * (2 / Math.PI) : Math.sin((dd * Math.PI) / 2); k = (dd + Math.abs(f) * (g - dd)) / dd; }
        o[0] = cx + dx * k; o[1] = cy + dy * k;
      });
    },
  },
  {
    id: 'twirl', name: 'Twirl', menu: 'filter', submenu: 'Distort', params: [S('angle', 'Angle', -999, 999, 50, { unit: '°' })],
    run: (img, p) => {
      const cx = (img.width - 1) / 2, cy = (img.height - 1) / 2, R = Math.min(img.width, img.height) / 2, a = (p.angle * Math.PI) / 180;
      remap(img, (x, y, o) => {
        const dx = x - cx, dy = y - cy, dd = Math.hypot(dx, dy) / R;
        if (dd >= 1) { o[0] = x; o[1] = y; return; }
        const t = a * (1 - dd), c = Math.cos(t), s = Math.sin(t);
        o[0] = cx + dx * c - dy * s; o[1] = cy + dx * s + dy * c;
      });
    },
  },
  {
    id: 'wave', name: 'Wave', menu: 'filter', submenu: 'Distort',
    params: [S('wavelength', 'Wavelength', 2, 500, 120, { unit: 'px' }), S('amplitude', 'Amplitude', 1, 500, 20, { unit: 'px' }), SEL('type', 'Type', ['Sine', 'Triangle', 'Square'])],
    run: (img, p) => {
      const L = Math.max(1, p.wavelength), A = p.amplitude;
      const w = p.type === 'Triangle' ? (t: number) => 1 - 4 * Math.abs(t - Math.floor(t + 0.5)) : p.type === 'Square' ? (t: number) => (t - Math.floor(t) < 0.5 ? 1 : -1) : (t: number) => Math.sin(2 * Math.PI * t);
      remap(img, (x, y, o) => { o[0] = x + A * w(y / L); o[1] = y + A * w(x / L); });
    },
  },
  {
    id: 'zigzag', name: 'ZigZag', menu: 'filter', submenu: 'Distort', params: [S('amount', 'Amount', -100, 100, 10), S('ridges', 'Ridges', 1, 20, 5)],
    run: (img, p) => {
      const cx = (img.width - 1) / 2, cy = (img.height - 1) / 2, R = Math.min(img.width, img.height) / 2, n = Math.round(p.ridges);
      const A = ((p.amount / 100) * R) / (2 * n);
      remap(img, (x, y, o) => {
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), dd = r / R;
        if (dd >= 1 || r === 0) { o[0] = x; o[1] = y; return; }
        const k = (r + A * Math.sin(2 * Math.PI * n * dd) * (1 - dd)) / r;
        o[0] = cx + dx * k; o[1] = cy + dy * k;
      });
    },
  },

  // Filter > Noise
  {
    id: 'noise', name: 'Add Noise', menu: 'filter', submenu: 'Noise', params: [S('amount', 'Amount', 0, 100, 12, { unit: '%' })],
    run: (img, p) => each(img, (d, i) => { const n = (Math.random() - 0.5) * p.amount * 5.1; d[i] += n; d[i + 1] += n; d[i + 2] += n; }),
  },
  {
    id: 'despeckle', name: 'Despeckle', menu: 'filter', submenu: 'Noise', params: [],
    run: (img) => {
      // Median everywhere except on strong edges, which keep their original pixels.
      const { width: W, height: H, data: d } = img, src = new Uint8ClampedArray(d), L = lumaPlane(img);
      medianImg(img, 1);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const gx = L[y * W + Math.min(W - 1, x + 1)] - L[y * W + Math.max(0, x - 1)], gy = L[Math.min(H - 1, y + 1) * W + x] - L[Math.max(0, y - 1) * W + x];
        if (gx * gx + gy * gy > 1600) { const i = (y * W + x) * 4; d[i] = src[i]; d[i + 1] = src[i + 1]; d[i + 2] = src[i + 2]; }
      }
    },
  },
  {
    id: 'dust-scratches', name: 'Dust & Scratches', menu: 'filter', submenu: 'Noise', params: [S('radius', 'Radius', 1, 20, 1, { unit: 'px' }), S('threshold', 'Threshold', 0, 255, 0)],
    run: (img, p) => {
      const src = new Uint8ClampedArray(img.data), d = img.data, t = p.threshold;
      medianImg(img, clamp(Math.round(p.radius), 1, 20));
      for (let i = 0; i < d.length; i++) if ((i & 3) !== 3 && Math.abs(src[i] - d[i]) <= t) d[i] = src[i];
    },
  },
  {
    id: 'median', name: 'Median', menu: 'filter', submenu: 'Noise', params: [S('radius', 'Radius', 1, 20, 1, { unit: 'px' })],
    run: (img, p) => medianImg(img, clamp(Math.round(p.radius), 1, 20)),
  },
  {
    id: 'reduce-noise', name: 'Reduce Noise', menu: 'filter', submenu: 'Noise', params: [S('strength', 'Strength', 0, 10, 6)],
    run: (img, p) => { if (p.strength > 0) surfaceBlur(img, 2, p.strength * 4); },
  },

  // Filter > Pixelate
  {
    id: 'color-halftone', name: 'Color Halftone', menu: 'filter', submenu: 'Pixelate',
    params: [S('radius', 'Max radius', 4, 127, 8, { unit: 'px' }), S('a1', 'Channel 1 angle', -360, 360, 108, { unit: '°' }), S('a2', 'Channel 2 angle', -360, 360, 162, { unit: '°' }), S('a3', 'Channel 3 angle', -360, 360, 90, { unit: '°' })],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, src = new Uint8ClampedArray(d), cell = 2 * p.radius;
      [p.a1, p.a2, p.a3].forEach((deg, c) => {
        const a = (deg * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const u = x * cs + y * sn, v = -x * sn + y * cs, cu = (Math.floor(u / cell) + 0.5) * cell, cv = (Math.floor(v / cell) + 0.5) * cell;
          const X = clamp(Math.round(cu * cs - cv * sn), 0, W - 1), Y = clamp(Math.round(cu * sn + cv * cs), 0, H - 1);
          const rad = cell * Math.SQRT1_2 * Math.sqrt(src[(Y * W + X) * 4 + c] / 255);
          d[(y * W + x) * 4 + c] = clamp(rad - Math.hypot(u - cu, v - cv) + 0.5, 0, 1) * 255;
        }
      });
    },
  },
  {
    id: 'crystallize', name: 'Crystallize', menu: 'filter', submenu: 'Pixelate', params: [S('size', 'Cell size', 3, 300, 10, { unit: 'px' })],
    run: (img, p) => {
      const { label, cells } = voronoi(img.width, img.height, Math.max(3, p.size), 1), m = cellMeans(img, label, cells), d = img.data;
      for (let q = 0; q < label.length; q++) { const g = label[q] * 4; d[q * 4] = m[g]; d[q * 4 + 1] = m[g + 1]; d[q * 4 + 2] = m[g + 2]; d[q * 4 + 3] = m[g + 3]; }
    },
  },
  { id: 'facet', name: 'Facet', menu: 'filter', submenu: 'Pixelate', params: [], run: (img) => kuwahara(img, 2) },
  {
    id: 'fragment', name: 'Fragment', menu: 'filter', submenu: 'Pixelate', params: [],
    run: (img) => {
      const { width: W, height: H, data: d } = img, src = new Uint8ClampedArray(d), off = [[-4, -4], [4, -4], [-4, 4], [4, 4]];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        for (let c = 0; c < 4; c++) {
          let s = 0;
          for (const [ox, oy] of off) s += src[(clamp(y + oy, 0, H - 1) * W + clamp(x + ox, 0, W - 1)) * 4 + c];
          d[i + c] = s / 4;
        }
      }
    },
  },
  {
    id: 'mezzotint', name: 'Mezzotint', menu: 'filter', submenu: 'Pixelate', params: [SEL('type', 'Type', ['Fine Dots', 'Medium Dots', 'Coarse Dots', 'Short Lines', 'Medium Lines', 'Long Lines'])],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, rand = rng(7);
      const t = String(p.type), dots = t.endsWith('Dots'), size = ({ 'Fine Dots': 1, 'Medium Dots': 2, 'Coarse Dots': 3, 'Short Lines': 4, 'Medium Lines': 8, 'Long Lines': 16 } as Record<string, number>)[t] ?? 1;
      const bw = Math.ceil(W / size), bh = dots ? Math.ceil(H / size) : H, thr = new Uint8Array(bw * bh * 3);
      for (let i = 0; i < thr.length; i++) thr[i] = rand() * 255;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const b = ((dots ? Math.floor(y / size) : y) * bw + Math.floor(x / size)) * 3, i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) d[i + c] = d[i + c] > thr[b + c] ? 255 : 0;
      }
    },
  },
  {
    id: 'pixelate', name: 'Mosaic', menu: 'filter', submenu: 'Pixelate', params: [S('size', 'Cell size', 2, 100, 12, { unit: 'px' })],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, s = Math.max(1, Math.round(p.size));
      for (let by = 0; by < H; by += s) for (let bx = 0; bx < W; bx += s) {
        const acc = [0, 0, 0, 0]; let n = 0;
        for (let y = by; y < Math.min(H, by + s); y++) for (let x = bx; x < Math.min(W, bx + s); x++) {
          const i = (y * W + x) * 4; for (let k = 0; k < 4; k++) acc[k] += d[i + k]; n++;
        }
        for (let y = by; y < Math.min(H, by + s); y++) for (let x = bx; x < Math.min(W, bx + s); x++) {
          const i = (y * W + x) * 4; for (let k = 0; k < 4; k++) d[i + k] = acc[k] / n;
        }
      }
    },
  },
  {
    id: 'pointillize', name: 'Pointillize', menu: 'filter', submenu: 'Pixelate', params: [S('size', 'Cell size', 3, 300, 10, { unit: 'px' }), COL('bg', 'Background', '#ffffff')],
    run: (img, p) => {
      const cell = Math.max(3, p.size), { label, dist, cells } = voronoi(img.width, img.height, cell, 2), m = cellMeans(img, label, cells), d = img.data, bg = rgbOf(p.bg), R = cell * 0.5;
      for (let q = 0; q < label.length; q++) {
        const g = label[q] * 4, t = clamp(R - dist[q] + 0.5, 0, 1), i = q * 4;
        for (let c = 0; c < 3; c++) d[i + c] = bg[c] + (m[g + c] - bg[c]) * t;
        d[i + 3] = 255;
      }
    },
  },

  // Filter > Render (fg/bg params: hex colors; the UI passes the current foreground/background)
  {
    id: 'clouds', name: 'Clouds', menu: 'filter', submenu: 'Render', params: [COL('fg', 'Foreground', '#000000'), COL('bg', 'Background', '#ffffff'), S('seed', 'Seed', 0, 9999, 1)],
    run: (img, p) => paintNoise(img, fbm(img.width, img.height, p.seed, 128, 128, 7), rgbOf(p.fg), rgbOf(p.bg)),
  },
  {
    id: 'difference-clouds', name: 'Difference Clouds', menu: 'filter', submenu: 'Render', params: [COL('fg', 'Foreground', '#000000'), COL('bg', 'Background', '#ffffff'), S('seed', 'Seed', 0, 9999, 1)],
    run: (img, p) => paintNoise(img, fbm(img.width, img.height, p.seed, 128, 128, 7), rgbOf(p.fg), rgbOf(p.bg), true),
  },
  {
    id: 'fibers', name: 'Fibers', menu: 'filter', submenu: 'Render',
    params: [S('variance', 'Variance', 1, 64, 16), S('strength', 'Strength', 1, 64, 4), COL('fg', 'Foreground', '#000000'), COL('bg', 'Background', '#ffffff'), S('seed', 'Seed', 0, 9999, 1)],
    run: (img, p) => {
      const n = fbm(img.width, img.height, p.seed, 4, 16 * p.strength, 3), k = p.variance / 16;
      for (let i = 0; i < n.length; i++) n[i] = clamp(0.5 + (n[i] - 0.5) * k * 2, 0, 1);
      paintNoise(img, n, rgbOf(p.fg), rgbOf(p.bg));
    },
  },
  {
    id: 'lens-flare', name: 'Lens Flare', menu: 'filter', submenu: 'Render',
    params: [S('brightness', 'Brightness', 10, 300, 100, { unit: '%' }), S('x', 'Center X', 0, 100, 30, { unit: '%' }), S('y', 'Center Y', 0, 100, 30, { unit: '%' }), SEL('type', 'Lens type', ['50-300mm Zoom', '35mm Prime', '105mm Prime', 'Movie Prime'])],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, fx = (W * p.x) / 100, fy = (H * p.y) / 100, sc = Math.max(W, H), br = p.brightness / 100;
      const ti = Math.max(0, ['50-300mm Zoom', '35mm Prime', '105mm Prime', 'Movie Prime'].indexOf(p.type));
      const ringR = [0.12, 0.08, 0.15, 0][ti], nGhost = [5, 3, 4, 2][ti];
      // Ghost disks along the line from the flare through the image center: [t, radius, r, g, b].
      const ghosts = [[0.5, 0.03, 120, 200, 255], [0.8, 0.05, 255, 160, 80], [1.2, 0.02, 160, 255, 160], [1.5, 0.07, 120, 140, 255], [1.9, 0.04, 255, 120, 200]].slice(0, nGhost)
        .map(([t, r, ...c]) => ({ x: fx + (W / 2 - fx) * t, y: fy + (H / 2 - fy) * t, r: r * sc, c }));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dd = Math.hypot(x - fx, y - fy) / sc, glow = Math.exp(-dd * dd / 0.0025) + 0.4 * Math.exp(-dd / 0.08);
        const ring = ringR ? 0.25 * Math.exp(-(((dd - ringR) / 0.006) ** 2)) : 0;
        let r = 255 * glow + 200 * ring, g = 250 * glow + 230 * ring, b = 235 * glow + 255 * ring;
        for (const gh of ghosts) {
          const t = clamp(gh.r - Math.hypot(x - gh.x, y - gh.y), 0, 2) * 0.075;
          if (t) { r += gh.c[0] * t; g += gh.c[1] * t; b += gh.c[2] * t; }
        }
        const i = (y * W + x) * 4, add = [r * br, g * br, b * br];
        for (let c = 0; c < 3; c++) d[i + c] = 255 - ((255 - d[i + c]) * (255 - clamp(add[c], 0, 255))) / 255;
      }
    },
  },
  {
    id: 'vignette', name: 'Vignette', menu: 'filter', submenu: 'Render', params: [S('amount', 'Amount', 0, 100, 50), S('size', 'Size', 10, 100, 60)],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, cx = W / 2, cy = H / 2, maxR = Math.hypot(cx, cy), inner = maxR * (p.size / 100);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const r = Math.hypot(x - cx, y - cy);
        if (r <= inner) continue;
        const k = 1 - (p.amount / 100) * Math.min(1, ((r - inner) / (maxR - inner)) ** 2);
        const i = (y * W + x) * 4; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
      }
    },
  },

  // Filter > Sharpen
  { id: 'sharpen-simple', name: 'Sharpen', menu: 'filter', submenu: 'Sharpen', params: [], run: (img) => convolve3(img, [0, -0.25, 0, -0.25, 2, -0.25, 0, -0.25, 0]) },
  { id: 'sharpen-more', name: 'Sharpen More', menu: 'filter', submenu: 'Sharpen', params: [], run: (img) => convolve3(img, [-0.5, -0.5, -0.5, -0.5, 5, -0.5, -0.5, -0.5, -0.5]) },
  { id: 'sharpen-edges', name: 'Sharpen Edges', menu: 'filter', submenu: 'Sharpen', params: [], run: (img) => unsharp(img, 100, 2, 8) },
  {
    id: 'smart-sharpen', name: 'Smart Sharpen', menu: 'filter', submenu: 'Sharpen',
    params: [S('amount', 'Amount', 1, 500, 100, { unit: '%' }), S('radius', 'Radius', 0.1, 64, 1, { step: 0.1, unit: 'px' }), S('noise', 'Reduce Noise', 0, 100, 10, { unit: '%' })],
    run: (img, p) => unsharp(img, p.amount, Math.max(1, p.radius * 2), p.noise * 0.3),
  },
  {
    id: 'sharpen', name: 'Unsharp Mask', menu: 'filter', submenu: 'Sharpen',
    params: [S('amount', 'Amount', 0, 300, 80, { unit: '%' }), S('radius', 'Radius', 1, 20, 2, { unit: 'px' }), S('threshold', 'Threshold', 0, 255, 0)],
    run: (img, p) => unsharp(img, p.amount, p.radius, p.threshold),
  },

  // Filter > Stylize
  {
    id: 'diffuse', name: 'Diffuse', menu: 'filter', submenu: 'Stylize', params: [SEL('mode', 'Mode', ['Normal', 'Darken Only', 'Lighten Only'])],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, src = new Uint8ClampedArray(d), rand = rng(3), mode = p.mode;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const q = (clamp(y + Math.floor(rand() * 5) - 2, 0, H - 1) * W + clamp(x + Math.floor(rand() * 5) - 2, 0, W - 1)) * 4, i = (y * W + x) * 4;
        if (mode !== 'Normal') { const lq = luma(src[q], src[q + 1], src[q + 2]), li = luma(src[i], src[i + 1], src[i + 2]); if (mode === 'Darken Only' ? lq >= li : lq <= li) continue; }
        d[i] = src[q]; d[i + 1] = src[q + 1]; d[i + 2] = src[q + 2]; d[i + 3] = src[q + 3];
      }
    },
  },
  {
    id: 'emboss', name: 'Emboss', menu: 'filter', submenu: 'Stylize',
    params: [S('angle', 'Angle', -180, 180, 135, { unit: '°' }), S('height', 'Height', 1, 10, 3, { unit: 'px' }), S('amount', 'Amount', 1, 500, 100, { unit: '%' })],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, L = lumaPlane(img), a = (p.angle * Math.PI) / 180, k = p.amount / 100;
      const ox = Math.round(Math.cos(a) * p.height), oy = Math.round(-Math.sin(a) * p.height);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = 128 + (L[clamp(y + oy, 0, H - 1) * W + clamp(x + ox, 0, W - 1)] - L[clamp(y - oy, 0, H - 1) * W + clamp(x - ox, 0, W - 1)]) * k;
        const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v;
      }
    },
  },
  {
    id: 'find-edges', name: 'Find Edges', menu: 'filter', submenu: 'Stylize', params: [],
    run: (img) => {
      const { width: W, height: H, data: d } = img, s = new Uint8ClampedArray(d);
      const at = (x: number, y: number, c: number) => s[(clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)) * 4 + c];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
        const gx = at(x + 1, y - 1, c) + 2 * at(x + 1, y, c) + at(x + 1, y + 1, c) - at(x - 1, y - 1, c) - 2 * at(x - 1, y, c) - at(x - 1, y + 1, c);
        const gy = at(x - 1, y + 1, c) + 2 * at(x, y + 1, c) + at(x + 1, y + 1, c) - at(x - 1, y - 1, c) - 2 * at(x, y - 1, c) - at(x + 1, y - 1, c);
        d[(y * W + x) * 4 + c] = 255 - Math.hypot(gx, gy) / 2;
      }
    },
  },
  {
    id: 'oil-paint', name: 'Oil Paint', menu: 'filter', submenu: 'Stylize', params: [S('stylization', 'Stylization', 1, 10, 4), S('cleanliness', 'Cleanliness', 0, 10, 2)],
    run: (img, p) => { if (p.cleanliness > 0) blurRGBA(img, p.cleanliness); kuwahara(img, clamp(Math.round(p.stylization), 1, 10)); },
  },
  { id: 'solarize', name: 'Solarize', menu: 'filter', submenu: 'Stylize', point: true, params: [], run: (img) => { const lut = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) lut[v] = v > 127 ? 255 - v : v; applyLUT(img, lut); } },
  {
    id: 'tiles', name: 'Tiles', menu: 'filter', submenu: 'Stylize',
    params: [S('tiles', 'Number of tiles', 1, 99, 10), S('offset', 'Maximum offset', 1, 99, 10, { unit: '%' }), SEL('fill', 'Fill empty area with', ['Background Color', 'Inverse Image', 'Unaltered Image', 'Transparent']), COL('bg', 'Background', '#ffffff')],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, src = new Uint8ClampedArray(d), rand = rng(5);
      const size = Math.max(1, Math.floor(Math.min(W, H) / Math.max(1, p.tiles))), maxOff = (size * p.offset) / 100, bg = rgbOf(p.bg);
      for (let i = 0; i < d.length; i += 4) {
        if (p.fill === 'Transparent') d[i + 3] = 0;
        else if (p.fill === 'Inverse Image') { d[i] = 255 - src[i]; d[i + 1] = 255 - src[i + 1]; d[i + 2] = 255 - src[i + 2]; }
        else if (p.fill !== 'Unaltered Image') { d[i] = bg[0]; d[i + 1] = bg[1]; d[i + 2] = bg[2]; d[i + 3] = 255; }
      }
      for (let ty = 0; ty < H; ty += size) for (let tx = 0; tx < W; tx += size) {
        const ox = Math.round((rand() * 2 - 1) * maxOff), oy = Math.round((rand() * 2 - 1) * maxOff);
        for (let y = ty; y < Math.min(H, ty + size); y++) for (let x = tx; x < Math.min(W, tx + size); x++) {
          const X = x + ox, Y = y + oy;
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const s = (y * W + x) * 4, o = (Y * W + X) * 4;
          d[o] = src[s]; d[o + 1] = src[s + 1]; d[o + 2] = src[s + 2]; d[o + 3] = src[s + 3];
        }
      }
    },
  },
  {
    id: 'trace-contour', name: 'Trace Contour', menu: 'filter', submenu: 'Stylize', params: [S('level', 'Level', 0, 255, 128), SEL('edge', 'Edge', ['Upper', 'Lower'])],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, s = new Uint8ClampedArray(d), t = p.level, up = p.edge !== 'Lower';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
        const i = (y * W + x) * 4 + c, v = s[i], r = s[(y * W + Math.min(W - 1, x + 1)) * 4 + c], b = s[(Math.min(H - 1, y + 1) * W + x) * 4 + c];
        const edge = up ? v > t && (r <= t || b <= t) : v < t && (r >= t || b >= t);
        d[i] = edge ? 0 : 255;
      }
    },
  },
  {
    id: 'wind', name: 'Wind', menu: 'filter', submenu: 'Stylize', params: [SEL('method', 'Method', ['Wind', 'Blast', 'Stagger']), SEL('direction', 'Direction', ['From the Right', 'From the Left'])],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, src = new Uint8ClampedArray(d), rand = rng(9), L = lumaPlane(img);
      const maxLen = p.method === 'Blast' ? 40 : 20, fromRight = p.direction !== 'From the Left', step = fromRight ? -1 : 1;
      for (let y = 0; y < H; y++) {
        let len = 0, left = 0, cr = 0, cg = 0, cb = 0;
        for (let k = 0, x = fromRight ? W - 1 : 0; k < W; k++, x += step) {
          const i = (y * W + x) * 4, prev = x - step;
          // A brightness edge facing the wind starts a streak carrying that pixel's color downwind.
          if (prev >= 0 && prev < W && L[y * W + x] - L[y * W + prev] > 20 && (p.method !== 'Stagger' || rand() < 0.5)) {
            len = left = Math.max(2, Math.round(rand() * maxLen)); cr = src[i]; cg = src[i + 1]; cb = src[i + 2]; continue;
          }
          if (left > 0) { const t = left / len; d[i] += (cr - d[i]) * t; d[i + 1] += (cg - d[i + 1]) * t; d[i + 2] += (cb - d[i + 2]) * t; left--; }
        }
      }
    },
  },

  // Filter > Other
  {
    id: 'high-pass', name: 'High Pass', menu: 'filter', submenu: 'Other', params: [S('radius', 'Radius', 0.1, 250, 10, { step: 0.1, unit: 'px' })],
    run: (img, p) => {
      const b = copyImg(img), d = img.data;
      blurRGBA(b, p.radius);
      for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = d[i + c] - b.data[i + c] + 128;
    },
  },
  { id: 'maximum', name: 'Maximum', menu: 'filter', submenu: 'Other', params: [S('radius', 'Radius', 1, 20, 1, { unit: 'px' })], run: (img, p) => rankMinMax(img, clamp(Math.round(p.radius), 1, 20), true) },
  { id: 'minimum', name: 'Minimum', menu: 'filter', submenu: 'Other', params: [S('radius', 'Radius', 1, 20, 1, { unit: 'px' })], run: (img, p) => rankMinMax(img, clamp(Math.round(p.radius), 1, 20), false) },
  {
    id: 'offset', name: 'Offset', menu: 'filter', submenu: 'Other',
    params: [S('dx', 'Horizontal', -4000, 4000, 50, { unit: 'px' }), S('dy', 'Vertical', -4000, 4000, 50, { unit: 'px' }), SEL('edge', 'Undefined areas', ['Wrap Around', 'Set to Transparent', 'Repeat Edge Pixels'])],
    run: (img, p) => {
      const dx = Math.round(p.dx), dy = Math.round(p.dy);
      remap(img, (x, y, o) => { o[0] = x - dx; o[1] = y - dy; }, p.edge === 'Set to Transparent' ? 'transparent' : p.edge === 'Repeat Edge Pixels' ? 'clamp' : 'wrap');
    },
  },
];

const SUBMENUS = ['Blur', 'Distort', 'Noise', 'Pixelate', 'Render', 'Sharpen', 'Stylize', 'Other'];

/** Filter menu grouped into Photoshop's submenus, in Photoshop order. */
export function filterSubmenus(): { name: string; ids: string[] }[] {
  return SUBMENUS.map((name) => ({ name, ids: FILTERS.filter((f) => f.menu === 'filter' && f.submenu === name).map((f) => f.id) }));
}

/** Look up by id (exact) first, then by display name (case-insensitive). */
export const filterById = (id: string) => {
  const k = String(id).toLowerCase();
  return FILTERS.find((f) => f.id === id) ?? FILTERS.find((f) => f.name.toLowerCase() === k);
};

export function defaultParams(f: FilterDef): Record<string, ParamValue> {
  return Object.fromEntries(f.params.map((p) => [p.key, p.value]));
}

/** Defaults merged with overrides; slider values coerced to numbers (MCP clients may send strings). */
export function resolveParams(f: FilterDef, params: Record<string, any> = {}): Record<string, any> {
  const out: Record<string, any> = { ...defaultParams(f), ...params };
  for (const p of f.params) if ((p.type ?? 'slider') === 'slider') { const n = Number(out[p.key]); out[p.key] = Number.isFinite(n) ? n : p.value; }
  return out;
}
