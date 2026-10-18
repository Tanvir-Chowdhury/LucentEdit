// Self-check for the Illustrator PostScript reader. Run: npx tsx src/core/aiformat.check.ts
import { tokenize, aiToSvg, illustratorBody, epsPostScript } from './aiformat';
import { psFontToCss } from './fontnames';

let fails = 0;
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.error('FAIL', m); } };

// Tokens: numbers, nested strings with escapes, names, arrays, operators, structural comments.
const t = tokenize('%AI5_BeginLayer\n1 0.5 -2 m (a (b) \\(c\\) \\101) /_Helvetica-Bold [3 2] d %plain comment\n*u');
ok(t[0].t === 'op' && t[0].v === '%AI5_BeginLayer', 'layer marker kept');
ok(t.filter((x) => x.t === 'num').length === 3 && t[5].t === 'str' && t[5].v === 'a (b) (c) A', `string ${JSON.stringify(t[5])}`);
ok(t[6].t === 'name' && t[6].v === '_Helvetica-Bold' && t[7].t === 'arr' && t[7].v.join() === '3,2', 'name and array');
ok(t[t.length - 1].v === '*u' && !t.some((x) => x.v === 'comment'), 'comments dropped, *u op');

// A tiny Illustrator document: one named layer, a group with a red square and a compound path
// (square with a hole), a stroked line in a spot color, a guide, and point text.
const doc = `
%AI5_BeginLayer
1 1 1 1 0 0 0 79 128 255 Lb
(Artwork) Ln
u
0 0.79 0.91 0 k
10 90 m 50 90 L 50 50 L 10 50 L f
*u
0 0 0 1 k
60 90 m 100 90 L 100 50 L 60 50 L 60 90 L f
70 80 m 70 60 L 90 60 L 90 80 L 70 80 L f
*U
U
1 0.65 0 0 (Blue Spot) 0 X
2 w 1 J
10 30 m 100 30 L S
0 40 m 200 40 L
(N) *
0 To
1 0 0 1 10 10 0 Tp
TP
/_Helvetica-Bold 12 9 -3 Tf
0 g
(Hello) Tx
T*
(World) Tx
TO
LB
%AI5_EndLayer--
`;
const r = aiToSvg(doc, [0, 0, 110, 100], psFontToCss);
ok(r.width === 110 && r.height === 100, 'size from bounding box');
ok(r.layers === 1 && r.svg.includes('data-name="Artwork" data-keep="1"'), 'named layer group');
ok(r.svg.includes('<g data-name="Group">'), 'u/U group');
// 0 0.79 0.91 0 in Adobe's conversion is a warm orange-red (Acrobat shows about #f15a29).
const red = /fill="#([0-9a-f]{6})"/.exec(r.svg)![1];
ok(parseInt(red.slice(0, 2), 16) > 230 && parseInt(red.slice(2, 4), 16) > 70 && parseInt(red.slice(2, 4), 16) < 110, `CMYK red fill #${red}`);
ok(r.svg.includes('M10 10L50 10L50 50L10 50Z'), 'y flipped to top-down, closed by f');
ok(/fill-rule="evenodd"/.test(r.svg) && (r.svg.match(/M60 10/g)?.length === 1) && r.svg.includes('M70 20'), 'compound path is one evenodd path with its hole');
ok(/stroke="#0[0-9a-f]{5}"/.test(r.svg) && r.svg.includes('stroke-width="2"') && r.svg.includes('stroke-linecap="round"'), `spot-color stroke ${r.svg.match(/stroke="[^"]+"/)?.[0]}`);
ok(!r.svg.includes('M0 60'), 'guide skipped');
ok(r.texts === 2 && r.svg.includes('>Hello</text>') && r.svg.includes('font-family="Helvetica" font-size="12" font-weight="700"') && r.svg.includes('x="10" y="90"') && r.svg.includes('y="104.4"'), `point text ${r.svg.match(/<text[^>]*>/g)}`);
ok(r.paths === 3, `3 drawn paths (${r.paths})`);

// File detection
const eps = `%!PS-Adobe-3.0 EPSF-3.0\n%%Creator: Adobe Illustrator(TM) 5.5\n%%BoundingBox: 0 0 110 100\n%%EndProlog\n/garbage { 1 2 m } def\n%%EndSetup\n${doc}\n%%PageTrailer\nshowpage\n`;
const body = illustratorBody(eps)!;
ok(body && body.bbox.join() === '0,0,110,100' && !body.body.includes('garbage') && !body.body.includes('showpage'), 'body between %%EndSetup and %%PageTrailer');
ok(illustratorBody('%!PS-Adobe-3.0\n%%Creator: dvips\n%%BoundingBox: 0 0 10 10\n%%EndSetup\n') === null, 'non-Illustrator PostScript rejected');
// DOS EPS binary header: PostScript section located by offset
const ps = new TextEncoder().encode('%!PS-Adobe-3.0 EPSF-3.0\n');
const dos = new Uint8Array(30 + ps.length);
dos.set([0xc5, 0xd0, 0xd3, 0xc6]);
new DataView(dos.buffer).setUint32(4, 30, true);
new DataView(dos.buffer).setUint32(8, ps.length, true);
dos.set(ps, 30);
ok(epsPostScript(dos).startsWith('%!PS-Adobe'), 'DOS EPS header');

if (fails) throw new Error(`aiformat.check: ${fails} failure(s)`);
console.log('aiformat.check: ok');
