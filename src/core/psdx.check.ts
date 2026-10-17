export {}; // a module, so top-level await is allowed
// Self-check for Photoshop layer conversion. Run: npx tsx src/core/psdx.check.ts
// layerMatrix needs DOMMatrix; Node has none, so a minimal one for translate/rotate is provided.
class M { a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
  translateSelf(x: number, y: number) { this.e += this.a * x + this.c * y; this.f += this.b * x + this.d * y; return this; }
  rotateSelf(deg: number) { const r = (deg * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r); const { a, b, c, d } = this; this.a = a * cos + c * sin; this.b = b * cos + d * sin; this.c = c * cos - a * sin; this.d = d * cos - b * sin; return this; }
  transformPoint(p: { x: number; y: number }) { return { x: this.a * p.x + this.c * p.y + this.e, y: this.b * p.x + this.d * p.y + this.f }; } }
(globalThis as any).DOMMatrix ??= M;

const { psdShapeIn, psdShapeOut, psdAdjustIn, psdAdjustOut, psdEffectsIn, psdEffectsOut, psdColor } = await import('./psdx');
let fails = 0;
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.error('FAIL', m); } };
const near = (a: number, b: number, e = 0.01) => Math.abs(a - b) < e;

// A Photoshop rectangle shape layer: 4 sharp knots at (100,50)-(300,150), red fill, 4 px blue stroke.
const knot = (x: number, y: number) => ({ linked: false, points: [x, y, x, y, x, y] });
const psRect = {
  vectorMask: { paths: [{ open: false, fillRule: 'non-zero', knots: [knot(100, 50), knot(300, 50), knot(300, 150), knot(100, 150)] }] },
  vectorFill: { type: 'color', color: { r: 228, g: 87, b: 46 } },
  vectorStroke: { strokeEnabled: true, fillEnabled: true, lineWidth: { units: 'Pixels', value: 4 }, content: { type: 'color', color: { fr: 0, fg: 0, fb: 1 } } },
};
const s = psdShapeIn(psRect)!;
ok(s && s.type === 'shape' && s.x === 100 && s.y === 50 && s.w === 200 && s.h === 100, `shape box ${JSON.stringify(s && [s.x, s.y, s.w, s.h])}`);
ok(s.fill === '#e4572e' && s.stroke?.paint === '#0000ff' && s.stroke?.width === 4, 'fill and stroke');
ok(s.paths![0].nodes.length === 4 && s.paths![0].closed && s.paths![0].nodes[1].x === 200, 'path nodes in local space');
ok(psdShapeIn({ vectorMask: psRect.vectorMask }) === null, 'vector mask without fill stays a pixel layer');

// Round trip: ours -> Photoshop -> ours keeps geometry and colors.
const ours = { ...s, id: 'a', name: 'Rect', visible: true, locked: false, opacity: 1, blend: 'normal' } as any;
const back = psdShapeIn(psdShapeOut(ours))!;
ok(back.x === 100 && back.y === 50 && back.w === 200 && back.h === 100 && back.fill === '#e4572e' && back.stroke?.width === 4, 'shape round trip');
const ell = { id: 'e', name: 'E', type: 'shape', shape: 'ellipse', x: 10, y: 20, w: 100, h: 60, rotation: 0, fill: '#112233', stroke: null, visible: true, locked: false, opacity: 1, blend: 'normal' } as any;
const eb = psdShapeIn(psdShapeOut(ell))!;
ok(near(eb.x, 10) && near(eb.y, 20) && near(eb.w, 100) && near(eb.h, 60) && eb.paths![0].nodes.length === 4, `ellipse round trip ${JSON.stringify([eb.x, eb.y, eb.w, eb.h])}`);
ok(psdShapeOut({ ...ell, fill: { type: 'linear', stops: [] } }) === undefined, 'gradient fills stay pixels in PSD');

// Adjustments both ways
for (const a of [
  { type: 'brightness/contrast', brightness: 20, contrast: -10 },
  { type: 'hue/saturation', master: { a: 0, b: 0, c: 0, d: 0, hue: 30, saturation: -20, lightness: 5 } },
  { type: 'curves', rgb: [{ input: 0, output: 0 }, { input: 128, output: 160 }, { input: 255, output: 255 }] },
  { type: 'levels', rgb: { shadowInput: 10, highlightInput: 240, shadowOutput: 0, highlightOutput: 255, midtoneInput: 1.2 } },
  { type: 'posterize', levels: 5 }, { type: 'threshold', level: 100 }, { type: 'invert' }, { type: 'exposure', exposure: 0.5 }, { type: 'vibrance', vibrance: 40 },
]) {
  const ourA = psdAdjustIn(a)!;
  ok(ourA, `${a.type} imported`);
  const again = psdAdjustIn(psdAdjustOut(ourA))!;
  ok(JSON.stringify(again) === JSON.stringify(ourA), `${a.type} round trip ${JSON.stringify(ourA)} vs ${JSON.stringify(again)}`);
}
ok(psdAdjustIn({ type: 'gradient map' }) === null, 'unknown adjustment skipped');

// Effects: Photoshop's 120° light, 10 px distance puts the shadow down and to the right.
const fx = psdEffectsIn({ dropShadow: [{ enabled: true, color: { r: 0, g: 0, b: 0 }, opacity: 0.5, angle: 120, distance: { units: 'Pixels', value: 10 }, size: { units: 'Pixels', value: 8 } }], outerGlow: { enabled: true, color: { r: 255, g: 255, b: 0 }, opacity: 0.6, size: { units: 'Pixels', value: 12 } } })!;
ok(fx.shadow && near(fx.shadow.x, 5) && near(fx.shadow.y, 8.66) && fx.shadow.blur === 8 && fx.shadow.color === 'rgba(0,0,0,0.5)', `shadow ${JSON.stringify(fx.shadow)}`);
ok(fx.glow && fx.glow.blur === 12 && fx.glow.color === 'rgba(255,255,0,0.6)', 'glow');
const fx2 = psdEffectsIn(psdEffectsOut(fx))!;
ok(fx2.shadow && near(fx2.shadow.x, 5) && near(fx2.shadow.y, 8.66) && fx2.glow?.blur === 12, 'effects round trip');
ok(psdColor({ fr: 1, fg: 0.5, fb: 0 }) === '#ff8000', 'float colors');

if (fails) throw new Error(`psdx.check: ${fails} failure(s)`);
console.log('psdx.check: ok');
