// Self-check for the pure warp geometry. Not bundled (nothing imports it).
// Run: npx -y tsx src/core/warp.check.ts
import { homography, applyH, bezierPatch, identityGrid, gridFromQuad, presetGrid, WARP_PRESETS, quadMesh, newField, liquifyDab, liquifyRender } from './warp';

// Local asserts: tsconfig has no Node types, so no node:assert.
function ok(c: unknown, msg = 'assertion failed') { if (!c) throw new Error(msg); }
const assert = { ok, deepEqual: (a: ArrayLike<number>, b: ArrayLike<number>) => ok(a.length === b.length && Array.from(a).every((v, i) => v === b[i]), 'arrays differ') };
const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

// Homography maps the four corners exactly, and keeps a straight line straight.
const src = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }] as const;
const dst = [{ x: 10, y: 5 }, { x: 140, y: -20 }, { x: 120, y: 90 }, { x: -15, y: 60 }] as const;
const H = homography([...src] as any, [...dst] as any);
src.forEach((p, i) => { const q = applyH(H, p.x, p.y); near(q.x, dst[i].x); near(q.y, dst[i].y); });
const a = applyH(H, 0, 0), b = applyH(H, 100, 50), m = applyH(H, 50, 25); // diagonal stays a line
near((b.x - a.x) * (m.y - a.y) - (b.y - a.y) * (m.x - a.x), 0, 1e-6);

// Mesh corners equal the quad corners.
const mesh = quadMesh([...dst] as any, 4);
near(mesh[0].x, 10); near(mesh[4].x, 140); near(mesh[24].y, 90); near(mesh[20].x, -15);

// Identity Bezier grid is the identity map.
const g = identityGrid(20, 30, 300, 150);
for (const [u, v] of [[0, 0], [1, 1], [0.25, 0.7], [0.5, 0.5], [0.9, 0.1]]) {
  const p = bezierPatch(g, u, v);
  near(p.x, 20 + 300 * u); near(p.y, 30 + 150 * v);
}
// gridFromQuad of an axis-aligned rect is the identity grid; preset "None" or bend 0 too.
gridFromQuad([{ x: 20, y: 30 }, { x: 320, y: 30 }, { x: 320, y: 180 }, { x: 20, y: 180 }]).forEach((p, i) => { near(p.x, g[i].x); near(p.y, g[i].y); });
for (const name of WARP_PRESETS) presetGrid(name, 20, 30, 300, 150, 0).forEach((p, i) => { near(p.x, g[i].x); near(p.y, g[i].y); });
assert.ok(presetGrid('Arc', 0, 0, 300, 150, 50).some((p, i) => Math.abs(p.y - identityGrid(0, 0, 300, 150)[i].y) > 1));

// Liquify: zero field reproduces the image; a warp dab moves content along the drag; reconstruct undoes it.
const W = 32, Hh = 32;
const img = { width: W, height: Hh, data: new Uint8ClampedArray(W * Hh * 4) };
for (let i = 0; i < W * Hh; i++) { img.data[i * 4] = (i % W) * 8; img.data[i * 4 + 3] = 255; }
const out = { width: W, height: Hh, data: new Uint8ClampedArray(W * Hh * 4) };
const f = newField(W, Hh);
liquifyRender(img, f, out);
assert.deepEqual(out.data, img.data);
liquifyDab(f, 'warp', 16, 16, 10, 1, 0, 4, 0);
liquifyRender(img, f, out);
assert.ok(out.data[(16 * W + 16) * 4] < img.data[(16 * W + 16) * 4], 'content pushed right shows lower x values at center');
for (let k = 0; k < 200; k++) liquifyDab(f, 'reconstruct', 16, 16, 12, 1, 0, 0, 0, 1);
liquifyRender(img, f, out);
near(out.data[(16 * W + 16) * 4], img.data[(16 * W + 16) * 4], 1.5);
// Half-resolution field upsamples: zero field is still identity.
liquifyRender(img, newField(16, 16), out);
assert.deepEqual(out.data, img.data);

console.log('warp.check: ok');
