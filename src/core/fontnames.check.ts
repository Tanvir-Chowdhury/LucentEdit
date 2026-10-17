// Self-check for font name conversion. Run: npx tsx src/core/fontnames.check.ts
import { psFontToCss, cssToPsFont } from './fontnames';

let fails = 0;
const eq = (a: unknown, b: unknown, m: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.error('FAIL', m, a, '!==', b); } };

eq(psFontToCss('ABCDEF+Inter-SemiBoldItalic'), { family: 'Inter', weight: 600, italic: true }, 'subset prefix, weight and italic');
eq(psFontToCss('FiraSans-Regular'), { family: 'Fira Sans', weight: 400, italic: false }, 'camel case family');
eq(psFontToCss('C059-Bold'), { family: 'C059', weight: 700, italic: false }, 'digits in family');
eq(psFontToCss('Rubik-Black'), { family: 'Rubik', weight: 900, italic: false }, 'black');
eq(psFontToCss('ArialMT'), { family: 'Arial', weight: 400, italic: false }, 'MT suffix');
eq(psFontToCss('Montserrat-ExtraLight'), { family: 'Montserrat', weight: 200, italic: false }, 'extra light');
eq(cssToPsFont('Inter Variable', 700, false), 'Inter-Bold', 'variable suffix dropped');
eq(cssToPsFont('Fira Sans', 400, true), 'FiraSans-Italic', 'regular italic');
eq(cssToPsFont('Fira Sans', 600, true), 'FiraSans-SemiBoldItalic', 'semibold italic');
eq(cssToPsFont('serif', 700, true), 'Times-BoldItalic', 'generic serif');
eq(cssToPsFont('sans-serif', 400, false), 'Helvetica', 'generic sans');
// Round trip
for (const [f, w, i] of [['Fira Sans', 300, false], ['Playfair Display', 900, true], ['C059', 700, false]] as const) {
  const back = psFontToCss(cssToPsFont(f, w, i));
  eq(back, { family: f, weight: w, italic: i }, `round trip ${f} ${w} ${i}`);
}
if (fails) throw new Error(`fontnames.check: ${fails} failure(s)`);
console.log('fontnames.check: ok');
