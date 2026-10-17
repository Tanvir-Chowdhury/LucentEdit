// Self-check for Brand Training analysis. Not bundled (nothing imports it).
// Run: npx tsx src/core/training.check.ts
import { inferRoles, quantize, buildProfile, scoreFit, similarity, colorDist, formatOf, marginOf, type Facts, type RawEl } from './training-analyze';

let fails = 0;
const ok = (cond: unknown, msg: string) => { if (!cond) { fails++; console.error('FAIL', msg); } };

// A typical promo: full-bleed photo, big headline top-left, body, CTA button, logo bottom-right, legal line.
const W = 1080, H = 1080;
const promo = (bg: string, fam = 'Brand Sans'): RawEl[] => [
  { type: 'image', name: 'Layer 1', x: 0, y: 0, w: W, h: H },
  { type: 'text', name: 'Layer 2', x: 80, y: 80, w: 800, h: 200, text: 'Fresh roast every morning', size: 96, family: fam, weight: 800, fill: bg },
  { type: 'text', name: 'Layer 3', x: 80, y: 320, w: 700, h: 80, text: 'Single-origin beans, roasted in small batches in our shop.', size: 32, family: fam, weight: 400 },
  { type: 'shape', name: 'Rectangle', x: 80, y: 800, w: 260, h: 80, fill: '#e4572e', radius: 40 },
  { type: 'text', name: 'Layer 5', x: 110, y: 820, w: 200, h: 40, text: 'Order now', size: 30, family: fam, weight: 700 },
  { type: 'image', name: 'acme', x: 900, y: 940, w: 120, h: 80 },
  { type: 'text', name: 'Layer 7', x: 80, y: 1030, w: 500, h: 20, text: 'Offer valid until June 30.', size: 16, family: fam, weight: 400 },
];
const els = inferRoles(promo('#ffffff'), W, H);
const roles = els.map((e) => e.role);
ok(roles[0] === 'photo', `full-bleed image is photo (${roles[0]})`);
ok(roles[1] === 'headline', `largest text is headline (${roles[1]})`);
ok(roles[2] === 'body', `paragraph is body (${roles[2]})`);
ok(roles[3] === 'cta' && roles[4] === 'cta', `button shape + label are cta (${roles[3]}, ${roles[4]})`);
ok(roles[5] === 'logo', `small corner image is logo (${roles[5]})`);
ok(roles[6] === 'legal', `small bottom text is legal (${roles[6]})`);
ok(inferRoles([{ type: 'text', name: 'Price tag', x: 0, y: 0, w: 10, h: 10, text: 'x', size: 10 }], 100, 100)[0].role === 'price', 'layer name wins');
ok(inferRoles([{ type: 'text', name: 'x', role: 'badge', x: 0, y: 0, w: 10, h: 10, text: 'x', size: 10 }], 100, 100)[0].role === 'badge', 'explicit role wins');

// Palette
const px: number[] = [];
for (let i = 0; i < 700; i++) px.push(20, 30, 40, 255);
for (let i = 0; i < 300; i++) px.push(228, 87, 46, 255);
for (let i = 0; i < 100; i++) px.push(0, 0, 0, 0); // transparent: ignored
const q = quantize(px);
ok(q.palette.length === 2 && Math.abs(q.palette[0].share - 0.7) < 0.01, `quantize shares ${JSON.stringify(q.palette)}`);
ok(colorDist(q.palette[1].hex, '#e4572e') < 10, 'quantize keeps the orange');

// Profile from 3 approved examples + 1 avoid (neon green) + 1 inspiration (other brand colors).
const facts = (id: string, bucket: Facts['bucket'], palette: Facts['palette'], lum: number, raw = promo('#fff')): Facts =>
  ({ id, bucket, width: W, height: H, layered: true, palette, luminance: lum, elements: inferRoles(raw, W, H) });
const brandPal = [{ hex: '#14202a', share: 0.6 }, { hex: '#e4572e', share: 0.25 }, { hex: '#f4efe6', share: 0.15 }];
const all: Facts[] = [
  facts('a1', 'approved', brandPal, 0.3), facts('a2', 'approved', brandPal, 0.32), facts('a3', 'approved', brandPal, 0.28),
  facts('x1', 'avoid', [{ hex: '#39ff14', share: 0.5 }, { hex: '#14202a', share: 0.5 }], 0.5),
  facts('i1', 'inspiration', [{ hex: '#7b2ff7', share: 1 }], 0.4),
];
const p = buildProfile(all);
ok(p.counts.approved === 3 && p.counts.inspiration === 1 && p.counts.avoid === 1, 'counts');
ok(colorDist(p.palette[0].hex, '#14202a') < 10, 'palette led by the brand navy');
ok(!p.palette.some((s) => colorDist(s.hex, '#7b2ff7') < 60), 'inspiration colors stay out of the palette');
ok(p.avoidColors.some((c) => colorDist(c, '#39ff14') < 10), 'avoid color learned');
ok(p.ground === 'dark', `ground ${p.ground}`);
ok(Math.abs((p.type.headlineSize ?? 0) - 96 / 1080) < 0.01, 'headline size learned');
ok(Math.abs((p.type.headlineToBody ?? 0) - 3) < 0.01, 'hierarchy ratio learned');
ok(p.layout.logoRate === 1 && p.layout.logoSpot?.spot === 'bottom-right', 'logo spot learned');
ok(p.archetypes.length === 1 && p.archetypes[0].from.length === 4 && p.archetypes[0].bucket === 'approved', `one archetype from 4 examples (${p.archetypes.map((a) => a.from.length)})`);
ok(p.type.families[0]?.family === 'Brand Sans', 'brand family learned');
ok(p.summary.length >= 5, 'summary written');
ok(p.layout.ctaRadius === 0.5 && p.summary.some((l) => l.includes('pill-shaped')), `button shape learned (${p.layout.ctaRadius})`);

// Fit: an on-brand design scores high; an off-brand one scores low with fixes.
const brand = { colors: ['#14202a', '#e4572e', '#f4efe6'], fonts: ['Brand Sans'] };
const good = scoreFit(facts('g', 'approved', brandPal, 0.3), p, brand);
ok(good.score >= 90, `on-brand score ${good.score} ${JSON.stringify(good.fixes)}`);
const offRaw = promo('#fff', 'Comic Sans MS').filter((e) => e.name !== 'acme').map((e) => (e.type === 'text' && e.size === 96 ? { ...e, size: 30 } : e));
const bad = scoreFit(facts('b', 'approved', [{ hex: '#39ff14', share: 0.8 }, { hex: '#ffffff', share: 0.2 }], 0.8, offRaw), p, brand);
ok(bad.score < 40, `off-brand score ${bad.score}`);
for (const id of ['palette', 'avoid', 'fonts', 'logo', 'ground']) ok(bad.checks.find((c) => c.id === id && !c.ok), `off-brand fails ${id}`);

// Neon text on white: little area, but its color is off-brand and on the avoid list.
const neon = inferRoles([{ type: 'text', name: 't', x: 300, y: 500, w: 400, h: 50, text: 'Big summer sale', size: 40, family: 'Brand Sans', fill: '#39ff14' }], W, H);
const neonFit = scoreFit({ id: 'n', bucket: 'approved', width: W, height: H, layered: true, palette: [{ hex: '#ffffff', share: 0.98 }, { hex: '#39ff14', share: 0.02 }], luminance: 0.97, elements: neon }, p, { ...brand, colors: [...brand.colors, '#ffffff'] });
ok(neonFit.checks.find((c) => c.id === 'fills' && !c.ok) && neonFit.checks.find((c) => c.id === 'avoid' && !c.ok), `neon text flagged by fills + avoid (${neonFit.score})`);

// Margins compare across formats: the same 86 px margin on a square and on a story.
const boxAt = (h: number): Facts => ({ id: 'm', bucket: 'approved', width: 1080, height: h, layered: true, palette: [], luminance: 0.3,
  elements: inferRoles([{ type: 'text', name: 'Headline', x: 86, y: 86, w: 600, h: 120, text: 'Hi', size: 90 }], 1080, h) });
ok(Math.abs((marginOf(boxAt(1920)) ?? 0) - (marginOf(boxAt(1080)) ?? 1)) < 0.001, `margin is format-independent (${marginOf(boxAt(1920))} vs ${marginOf(boxAt(1080))})`);

// A brand-kit color in an Avoid example is never learned as a color to avoid.
const whiteAvoid = [...all, facts('x2', 'avoid', [{ hex: '#ffffff', share: 0.9 }, { hex: '#39ff14', share: 0.1 }], 0.95)];
ok(!buildProfile(whiteAvoid, ['#ffffff']).avoidColors.some((c) => colorDist(c, '#ffffff') < 30), 'brand color never becomes an avoid color');

// Similarity and formats
ok(similarity(all[0], all[1]) > similarity(all[0], { ...all[4], width: 1080, height: 1920 }), 'similar examples rank higher');
ok(formatOf(1080, 1920) === 'story' && formatOf(1080, 1080) === 'square' && formatOf(728, 90) === 'banner', 'formats');

if (fails) { console.error(`training.check: ${fails} failure(s)`); throw new Error('training.check failed'); }
console.log('training.check: ok');
