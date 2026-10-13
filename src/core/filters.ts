import type { DocState, Layer } from './types';
import { ctx2d, makeCanvas, rgbToHsl, hslToRgb, clamp } from './util';
import { editablePixels } from './ops';
import { compositeMasked } from './selection';

// Destructive pixel filters (Photoshop "Image > Adjustments" and "Filter" menus).

export interface FilterParam { key: string; label: string; min: number; max: number; step?: number; value: number; unit?: string }
export interface FilterDef { id: string; name: string; menu: 'adjust' | 'filter'; params: FilterParam[]; run: (img: ImageData, p: Record<string, number>) => void }

const each = (img: ImageData, f: (d: Uint8ClampedArray, i: number) => void) => {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) f(d, i);
};

function blurRGBA(img: ImageData, radius: number) {
  const { width: W, height: H, data: d } = img;
  const R = Math.max(1, Math.round(radius / 2));
  const ch = [0, 1, 2, 3].map(() => new Float32Array(W * H));
  for (let p = 0; p < W * H; p++) {
    const a = d[p * 4 + 3] / 255;
    ch[0][p] = d[p * 4] * a; ch[1][p] = d[p * 4 + 1] * a; ch[2][p] = d[p * 4 + 2] * a; ch[3][p] = d[p * 4 + 3];
  }
  const tmp = new Float32Array(W * H), n = 2 * R + 1;
  for (const a of ch) for (let pass = 0; pass < 3; pass++) {
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
  for (let p = 0; p < W * H; p++) {
    const a = ch[3][p], k = a > 0 ? 255 / a : 0;
    d[p * 4] = ch[0][p] * k; d[p * 4 + 1] = ch[1][p] * k; d[p * 4 + 2] = ch[2][p] * k; d[p * 4 + 3] = a;
  }
}

export const FILTERS: FilterDef[] = [
  {
    id: 'brightness-contrast', name: 'Brightness/Contrast', menu: 'adjust',
    params: [{ key: 'brightness', label: 'Brightness', min: -150, max: 150, value: 0 }, { key: 'contrast', label: 'Contrast', min: -100, max: 100, value: 0 }],
    run: (img, p) => {
      const c = p.contrast / 100, f = c >= 0 ? 1 / (1 - c * 0.99) : 1 + c;
      each(img, (d, i) => { for (let k = 0; k < 3; k++) d[i + k] = (d[i + k] + p.brightness - 128) * f + 128; });
    },
  },
  {
    id: 'hue-saturation', name: 'Hue/Saturation', menu: 'adjust',
    params: [
      { key: 'hue', label: 'Hue', min: -180, max: 180, value: 0, unit: '°' },
      { key: 'saturation', label: 'Saturation', min: -100, max: 100, value: 0 },
      { key: 'lightness', label: 'Lightness', min: -100, max: 100, value: 0 },
    ],
    run: (img, p) => each(img, (d, i) => {
      let [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      h = (h + p.hue + 360) % 360;
      s = clamp(p.saturation >= 0 ? s + (1 - s) * (p.saturation / 100) * s : s * (1 + p.saturation / 100), 0, 1);
      l = clamp(p.lightness >= 0 ? l + (1 - l) * (p.lightness / 100) : l * (1 + p.lightness / 100), 0, 1);
      const [r, g, b] = hslToRgb(h, s, l);
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }),
  },
  {
    id: 'levels', name: 'Levels', menu: 'adjust',
    params: [
      { key: 'black', label: 'Input black', min: 0, max: 254, value: 0 },
      { key: 'white', label: 'Input white', min: 1, max: 255, value: 255 },
      { key: 'gamma', label: 'Gamma', min: 0.1, max: 3, step: 0.01, value: 1 },
    ],
    run: (img, p) => {
      const lut = new Uint8ClampedArray(256), range = Math.max(1, p.white - p.black);
      for (let v = 0; v < 256; v++) lut[v] = 255 * Math.pow(clamp((v - p.black) / range, 0, 1), 1 / p.gamma);
      each(img, (d, i) => { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; });
    },
  },
  {
    id: 'exposure', name: 'Exposure', menu: 'adjust',
    params: [{ key: 'exposure', label: 'Exposure', min: -3, max: 3, step: 0.05, value: 0 }],
    run: (img, p) => { const k = Math.pow(2, p.exposure); each(img, (d, i) => { d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }); },
  },
  {
    id: 'vibrance', name: 'Vibrance', menu: 'adjust',
    params: [{ key: 'amount', label: 'Vibrance', min: -100, max: 100, value: 30 }],
    run: (img, p) => each(img, (d, i) => {
      const max = Math.max(d[i], d[i + 1], d[i + 2]), avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
      const amt = ((Math.abs(max - avg) * 2) / 255) * (-p.amount / 100) + p.amount / 100;
      for (let k = 0; k < 3; k++) d[i + k] += (d[i + k] - avg) * amt;
    }),
  },
  { id: 'invert', name: 'Invert', menu: 'adjust', params: [], run: (img) => each(img, (d, i) => { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }) },
  { id: 'grayscale', name: 'Black & White', menu: 'adjust', params: [], run: (img) => each(img, (d, i) => { const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = v; }) },
  {
    id: 'sepia', name: 'Sepia', menu: 'adjust', params: [{ key: 'amount', label: 'Amount', min: 0, max: 100, value: 100 }],
    run: (img, p) => each(img, (d, i) => {
      const r = d[i], g = d[i + 1], b = d[i + 2], k = p.amount / 100;
      d[i] = r + ((0.393 * r + 0.769 * g + 0.189 * b) - r) * k;
      d[i + 1] = g + ((0.349 * r + 0.686 * g + 0.168 * b) - g) * k;
      d[i + 2] = b + ((0.272 * r + 0.534 * g + 0.131 * b) - b) * k;
    }),
  },
  {
    id: 'posterize', name: 'Posterize', menu: 'adjust', params: [{ key: 'levels', label: 'Levels', min: 2, max: 32, value: 6 }],
    run: (img, p) => { const n = Math.round(p.levels) - 1; each(img, (d, i) => { for (let k = 0; k < 3; k++) d[i + k] = Math.round((d[i + k] / 255) * n) * (255 / n); }); },
  },
  {
    id: 'threshold', name: 'Threshold', menu: 'adjust', params: [{ key: 'level', label: 'Level', min: 1, max: 255, value: 128 }],
    run: (img, p) => each(img, (d, i) => { const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] >= p.level ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = v; }),
  },
  {
    id: 'gaussian-blur', name: 'Gaussian Blur', menu: 'filter', params: [{ key: 'radius', label: 'Radius', min: 1, max: 100, value: 6, unit: 'px' }],
    run: (img, p) => blurRGBA(img, p.radius),
  },
  {
    id: 'sharpen', name: 'Unsharp Mask', menu: 'filter',
    params: [{ key: 'amount', label: 'Amount', min: 0, max: 300, value: 80, unit: '%' }, { key: 'radius', label: 'Radius', min: 1, max: 20, value: 2, unit: 'px' }],
    run: (img, p) => {
      const blurred = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
      blurRGBA(blurred, p.radius);
      const k = p.amount / 100, b = blurred.data;
      each(img, (d, i) => { for (let c = 0; c < 3; c++) d[i + c] = d[i + c] + (d[i + c] - b[i + c]) * k; });
    },
  },
  {
    id: 'noise', name: 'Add Noise', menu: 'filter', params: [{ key: 'amount', label: 'Amount', min: 0, max: 100, value: 12, unit: '%' }],
    run: (img, p) => each(img, (d, i) => { const n = (Math.random() - 0.5) * p.amount * 5.1; d[i] += n; d[i + 1] += n; d[i + 2] += n; }),
  },
  {
    id: 'pixelate', name: 'Pixelate', menu: 'filter', params: [{ key: 'size', label: 'Cell size', min: 2, max: 100, value: 12, unit: 'px' }],
    run: (img, p) => {
      const { width: W, height: H, data: d } = img, s = Math.round(p.size);
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
    id: 'vignette', name: 'Vignette', menu: 'filter', params: [{ key: 'amount', label: 'Amount', min: 0, max: 100, value: 50 }, { key: 'size', label: 'Size', min: 10, max: 100, value: 60 }],
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
];

export const filterById = (id: string) => FILTERS.find((f) => f.id === id || f.name.toLowerCase() === id.toLowerCase());

export function defaultParams(f: FilterDef): Record<string, number> {
  return Object.fromEntries(f.params.map((p) => [p.key, p.value]));
}

/** Run a filter on a copy of the pixels and return the result canvas. */
export function filteredCopy(src: HTMLCanvasElement, f: FilterDef, params: Record<string, number>): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height), x = ctx2d(c);
  x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height);
  f.run(img, { ...defaultParams(f), ...params });
  x.putImageData(img, 0, 0);
  return c;
}

/** Apply a filter to a layer (rasterizing it if needed), limited to the pixel selection. */
export function applyFilter(ds: DocState, layer: Layer, f: FilterDef, params: Record<string, number>, original?: HTMLCanvasElement) {
  const r = editablePixels(layer, ds);
  if (!r) return null;
  const srcPixels = original ?? r.canvas;
  const out = filteredCopy(srcPixels, f, params);
  if (!ds.mask) { r.canvas = out; return r; }
  const base = makeCanvas(srcPixels.width, srcPixels.height);
  ctx2d(base).drawImage(srcPixels, 0, 0);
  r.canvas = base;
  compositeMasked(ds, r, out);
  return r;
}
