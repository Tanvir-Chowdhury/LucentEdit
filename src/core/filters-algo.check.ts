// Self-check for the pure filter algorithms. Not bundled (nothing imports it).
// Run: npx -y tsx src/core/filters-algo.check.ts
import { FILTERS, filterSubmenus, filterById, resolveParams, curveLUT, parseCurve, type Img } from './filters-algo';

function randomImg(W: number, H: number, seed = 1): Img {
  const data = new Uint8ClampedArray(W * H * 4);
  let s = seed;
  for (let i = 0; i < data.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; data[i] = s >> 23; }
  for (let i = 3; i < data.length; i += 64) data[i] = 0; // some fully transparent pixels
  return { width: W, height: H, data };
}

/** Wrap pixel data so any NaN/undefined write (which Uint8ClampedArray would silently turn into 0) throws. */
function nanGuard(img: Img): Img {
  const data = new Proxy(img.data, {
    get: (t, k) => { const v = (t as any)[k]; return typeof v === 'function' ? v.bind(t) : v; },
    set: (t, k, v) => { if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`wrote ${v} at ${String(k)}`); (t as any)[k] = v; return true; },
  });
  return { width: img.width, height: img.height, data };
}

let failed = 0;
const ids = new Set<string>();
for (const f of FILTERS) {
  if (ids.has(f.id)) { console.error('duplicate id', f.id); failed++; }
  ids.add(f.id);
  try { f.run(nanGuard(randomImg(64, 48)), resolveParams(f)); } catch (e) { console.error(`FAIL ${f.id}:`, (e as Error).message); failed++; }
}

// Curves: identity and a known monotone curve.
const id = curveLUT(parseCurve('0,0;255,255'));
if (id.some((v, i) => v !== i)) { console.error('curve identity broken'); failed++; }
const c = curveLUT(parseCurve('0,0;64,40;192,220;255,255'));
for (let i = 1; i < 256; i++) if (c[i] < c[i - 1]) { console.error('curve not monotone at', i); failed++; break; }
if (c[64] !== 40 || c[192] !== 220) { console.error('curve misses control points'); failed++; }
if (filterById('Sharpen')?.id !== 'sharpen-simple' || filterById('sharpen')?.id !== 'sharpen' || filterById('MOSAIC')?.id !== 'pixelate') { console.error('filterById lookup broken'); failed++; }
const grouped = filterSubmenus().flatMap((g) => g.ids);
const menuFilters = FILTERS.filter((f) => f.menu === 'filter').map((f) => f.id);
if (grouped.length !== menuFilters.length) { console.error('filters missing a submenu', menuFilters.filter((x) => !grouped.includes(x))); failed++; }

// Timing at 1000x1000.
const rows: [string, number][] = [];
for (const f of FILTERS) {
  const img = randomImg(1000, 1000), t = performance.now();
  f.run(img, resolveParams(f));
  rows.push([f.id, performance.now() - t]);
}
for (const [k, ms] of rows) console.log(`${ms > 1500 ? 'SLOW' : '    '} ${k.padEnd(22)} ${ms.toFixed(0).padStart(6)} ms`);
console.log(`${FILTERS.length} filters, ${failed} failures`);
if (failed) throw new Error('filters self-check failed');
