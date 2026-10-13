// Self-check for Content-Aware Fill, Select Subject/Sky and the max-flow solver. Not bundled.
// Run: node src/core/contentaware.check.ts   (add `--bench` for 1500x1000 timings)
// @ts-ignore: Node needs the extension; the bundler config doesn't allow it
import { contentAwareFill, selectSubject, selectSky, Graph, type Img } from './contentaware.ts';

function assert(ok: unknown, msg = 'assertion failed'): void { if (!ok) throw new Error(msg); }
const ms = (t: number) => `${(performance.now() - t).toFixed(0)} ms`;
let s = 7;
const noise = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5);

// (c) max-flow on CLRS Fig. 26.1: nodes v1..v4 = 0..3, max flow 23, min cut S = {s, v1, v2, v4}.
{
  const g = new Graph(4, 8);
  g.addTWeights(0, 16, 0); g.addTWeights(1, 13, 0);
  g.addEdge(0, 2, 12, 0); g.addEdge(1, 0, 4, 0); g.addEdge(1, 3, 14, 0); g.addEdge(2, 1, 9, 0);
  g.addTWeights(2, 0, 20); g.addEdge(3, 2, 7, 0); g.addTWeights(3, 0, 4);
  const f = g.maxflow(), side = [0, 1, 2, 3].map((i) => g.inSource(i)).join();
  assert(f === 23, `max flow ${f}`);
  assert(side === 'true,true,false,true', `cut ${side}`);
  console.log('ok  max-flow = 23, cut {v1,v2,v4}|{v3}');
}

// (a) vertical stripes (period 16, hole edges on opposite phases) with a 24x24 hole: the fill should continue the stripes.
{
  const W = 120, H = 90, data = new Uint8ClampedArray(W * H * 4), alpha = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, v = x % 16 < 8 ? 40 : 210;
    data[i] = v; data[i + 1] = 255 - v; data[i + 2] = 100; data[i + 3] = 255;
    if (x >= 44 && x < 68 && y >= 33 && y < 57) alpha[y * W + x] = 255;
  }
  const truth = data.slice();
  for (let p = 0; p < W * H; p++) if (alpha[p]) { data[p * 4] = 255; data[p * 4 + 1] = 0; data[p * 4 + 2] = 255; }
  const t = performance.now();
  const out = contentAwareFill({ width: W, height: H, data }, alpha, null, { colorAdapt: true });
  let err = 0, n = 0, flat = 0;
  for (let p = 0; p < W * H; p++) if (alpha[p]) for (let c = 0; c < 3; c++) { err += Math.abs(out[p * 4 + c] - truth[p * 4 + c]); flat += Math.abs((c === 2 ? 100 : 127.5) - truth[p * 4 + c]); n++; }
  const mae = err / n;
  console.log(`ok  stripes inpaint MAE ${mae.toFixed(1)} (flat-fill baseline ${(flat / n).toFixed(1)}) in ${ms(t)}`);
  assert(mae < 12, `stripe MAE too high: ${mae}`);
}

const iou = (a: Uint8Array, truth: (p: number) => boolean) => {
  let i = 0, u = 0;
  for (let p = 0; p < a.length; p++) { const m = a[p] >= 128, t = truth(p); if (m && t) i++; if (m || t) u++; }
  return i / u;
};

// (b) gray textured background + red disk: Select Subject should find the disk.
function diskImage(W: number, H: number): { img: Img; inDisk: (p: number) => boolean } {
  const data = new Uint8ClampedArray(W * H * 4), cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.25;
  const inDisk = (p: number) => ((p % W) + 0.5 - cx) ** 2 + (((p / W) | 0) + 0.5 - cy) ** 2 < R * R;
  for (let p = 0; p < W * H; p++) {
    const g = 128 + noise() * 60 + 20 * Math.sin((p % W) / 3);
    const [r, gg, b] = inDisk(p) ? [215 + noise() * 30, 30 + noise() * 30, 35 + noise() * 30] : [g, g, g];
    data.set([r, gg, b, 255], p * 4);
  }
  return { img: { width: W, height: H, data }, inDisk };
}
{
  const { img, inDisk } = diskImage(240, 180);
  const t = performance.now(), a = selectSubject(img), score = iou(a, inDisk);
  console.log(`ok  subject IoU ${score.toFixed(3)} in ${ms(t)}`);
  assert(score > 0.85, `subject IoU ${score}`);
}

// Bonus: sky gradient over a textured green field with a hill.
{
  const W = 240, H = 160, data = new Uint8ClampedArray(W * H * 4);
  const horizon = (x: number) => 90 + 20 * Math.sin(x / 30);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sky = y < horizon(x), i = (y * W + x) * 4;
    data.set(sky ? [90 + y / 2, 150 + y / 3, 235, 255] : [60 + noise() * 70, 120 + noise() * 70, 50 + noise() * 50, 255], i);
  }
  const t = performance.now(), a = selectSky({ width: W, height: H, data });
  assert(a, 'sky not found');
  const score = iou(a!, (p) => ((p / W) | 0) < horizon(p % W));
  console.log(`ok  sky IoU ${score.toFixed(3)} in ${ms(t)}`);
  assert(score > 0.9, `sky IoU ${score}`);
}

if ((globalThis as any).process.argv.includes('--bench')) {
  const W = 1500, H = 1000, data = new Uint8ClampedArray(W * H * 4), alpha = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = 128 + 60 * Math.sin(x / 9) * Math.cos(y / 13) + noise() * 30;
    data.set([v, v * 0.8 + 30, 255 - v, 255], (y * W + x) * 4);
    if (x >= 600 && x < 900 && y >= 350 && y < 650) alpha[y * W + x] = 255;
  }
  let t = performance.now();
  contentAwareFill({ width: W, height: H, data }, alpha, null);
  console.log(`bench fill 300x300 hole, whole 1500x1000 layer: ${ms(t)}`);
  t = performance.now();
  contentAwareFill({ width: W, height: H, data }, alpha, { x: 300, y: 50, w: 900, h: 900 });
  console.log(`bench fill 300x300 hole, auto band: ${ms(t)}`);
  const { img } = diskImage(W, H);
  t = performance.now(); selectSubject(img); console.log(`bench subject 1500x1000: ${ms(t)}`);
  t = performance.now(); selectSky(img); console.log(`bench sky 1500x1000: ${ms(t)}`);
}
console.log('all content-aware checks passed');
