// Font names between CSS (family + weight + italic) and PostScript ("Inter-SemiBoldItalic"),
// the form PDF, Illustrator and Photoshop files use. Pure, so fontnames.check.ts runs under Node.

/** "ABCDEF+Inter-SemiBoldItalic" -> { family: "Inter", weight: 600, italic: true } */
export function psFontToCss(name: string) {
  const n = name.replace(/^[A-Z]{6}\+/, '');
  const [fam, style = ''] = n.split(/-(?=[^-]*$)/);
  const s = style.toLowerCase();
  const weight = /thin|hairline/.test(s) ? 100 : /extra ?light|ultra ?light/.test(s) ? 200 : /light/.test(s) ? 300 : /medium/.test(s) ? 500
    : /semi ?bold|demi/.test(s) ? 600 : /extra ?bold|ultra ?bold/.test(s) ? 800 : /black|heavy/.test(s) ? 900 : /bold/.test(s) ? 700 : 400;
  const family = fam.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/MT$|PS$/, '').trim() || 'sans-serif';
  return { family, weight, italic: /italic|oblique/.test(s) };
}

const WEIGHT_NAMES: Record<number, string> = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };

/** PostScript-style name Illustrator and Acrobat match against installed fonts. */
export function cssToPsFont(family: string, weight: number, italic: boolean): string {
  const f = family.replace(/\s*Variable$/i, '').trim();
  const generic: Record<string, string> = { 'sans-serif': 'Helvetica', 'system-ui': 'Helvetica', serif: 'Times', monospace: 'Courier', cursive: 'Helvetica' };
  const bold = weight >= 600;
  if (generic[f.toLowerCase()]) {
    const b = generic[f.toLowerCase()];
    if (b === 'Times') return italic ? (bold ? 'Times-BoldItalic' : 'Times-Italic') : bold ? 'Times-Bold' : 'Times-Roman';
    return `${b}${bold || italic ? '-' : ''}${bold ? 'Bold' : ''}${italic ? (b === 'Helvetica' || b === 'Courier' ? 'Oblique' : 'Italic') : ''}`;
  }
  const w = WEIGHT_NAMES[Math.round(Math.min(900, Math.max(100, weight)) / 100) * 100] ?? 'Regular';
  return `${f.replace(/[^A-Za-z0-9]/g, '')}-${w === 'Regular' && italic ? 'Italic' : `${w}${italic ? 'Italic' : ''}`}`;
}

