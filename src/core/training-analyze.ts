// Brand Training, pure part: turns example designs into facts (layer roles, palette, layout),
// facts into a Brand Style Profile, and scores new designs against it. DOM-free and import-free
// so training.check.ts runs it under plain Node.

export type Role = 'background' | 'photo' | 'headline' | 'subhead' | 'body' | 'cta' | 'price' | 'logo' | 'legal' | 'badge' | 'graphic';
export const ROLES: Role[] = ['headline', 'subhead', 'body', 'cta', 'price', 'logo', 'photo', 'legal', 'badge', 'graphic', 'background'];
export type Bucket = 'approved' | 'inspiration' | 'avoid';

/** A layer as read from a document, in document pixels. */
export interface RawEl {
  type: 'text' | 'shape' | 'image';
  name: string;
  role?: string;
  x: number; y: number; w: number; h: number;
  text?: string; size?: number; family?: string; weight?: number; fill?: string; align?: string;
  /** Corner radius of a shape, in px. */
  radius?: number;
}
/** A layer with its role, box normalized to 0..1 of the canvas, size as a fraction of canvas height. */
export interface El {
  role: Role;
  x: number; y: number; w: number; h: number;
  family?: string; size?: number; weight?: number; words?: number; upper?: boolean; fill?: string; align?: string;
  /** Corner radius as a share of the shape's height (0.5 = pill). */
  radius?: number;
}
export interface Swatch { hex: string; share: number }
export interface Facts {
  id: string;
  bucket: Bucket;
  width: number;
  height: number;
  /** Has real layers (not a flat image), so layout and type facts are known. */
  layered: boolean;
  palette: Swatch[];
  luminance: number;
  elements: El[];
}

// Colors

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
export const toHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
export function parseHex(c: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
/** Perceptual-ish RGB distance ("redmean"), 0 to about 765. */
export function colorDist(a: string, b: string) {
  const p = parseHex(a), q = parseHex(b);
  if (!p || !q) return 999;
  const rm = (p[0] + q[0]) / 2, dr = p[0] - q[0], dg = p[1] - q[1], db = p[2] - q[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}
const lum = (c: string) => { const p = parseHex(c); return p ? (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255 : 0.5; };

/** Dominant colors of RGBA pixels: 4-bit bins, then near bins merged into the bigger one. */
export function quantize(rgba: ArrayLike<number>, n = 6): { palette: Swatch[]; luminance: number } {
  const bins = new Map<number, { r: number; g: number; b: number; c: number }>();
  let total = 0, lsum = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = bins.get(k) ?? { r: 0, g: 0, b: 0, c: 0 };
    e.r += r; e.g += g; e.b += b; e.c++;
    bins.set(k, e);
    total++;
    lsum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  if (!total) return { palette: [], luminance: 0.5 };
  const sorted = [...bins.values()].sort((a, b) => b.c - a.c).map((e) => ({ hex: toHex(e.r / e.c, e.g / e.c, e.b / e.c), c: e.c }));
  const merged: { hex: string; c: number }[] = [];
  for (const s of sorted) {
    const near = merged.find((m) => colorDist(m.hex, s.hex) < 60);
    if (near) near.c += s.c; else merged.push({ ...s });
  }
  const palette = merged.sort((a, b) => b.c - a.c).slice(0, n).map((m) => ({ hex: m.hex, share: round(m.c / total) })).filter((s) => s.share >= 0.01);
  return { palette, luminance: round(lsum / total) };
}

// Roles

const NAME_RULES: [RegExp, Role][] = [
  [/\b(logo|wordmark|brandmark|logotype)\b/i, 'logo'],
  [/\b(cta|button|btn)\b|shop now|buy now|learn more|sign up/i, 'cta'],
  [/\bprice\b/i, 'price'],
  [/\b(legal|disclaimer|terms|copyright|fine ?print)\b/i, 'legal'],
  [/\b(sub ?head|subtitle|sub-title|tagline|kicker|eyebrow)\b/i, 'subhead'],
  [/\b(headline|title|heading|h1)\b/i, 'headline'],
  [/\b(badge|sticker|ribbon|burst)\b/i, 'badge'],
  [/\b(bg|background|backdrop)\b/i, 'background'],
  [/\b(photo|image|img|picture|hero|product)\b/i, 'photo'],
];
const PRICE = /[$€£¥₹]\s?\d|\d+[.,]\d{2}\b|\d+\s?%\s?off/i;

const area = (e: { w: number; h: number }) => e.w * e.h;
const center = (e: { x: number; y: number; w: number; h: number }) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
const contains = (o: { x: number; y: number; w: number; h: number }, p: { x: number; y: number }) => p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h;

/** Role of every element: an explicit role wins, then the layer name, then layout heuristics.
 *  shortcut: heuristics only, no vision model; a designer can always set the role by hand. */
export function inferRoles(raw: RawEl[], W: number, H: number): El[] {
  const els: (El & { type: RawEl['type']; text?: string; fixed: boolean })[] = raw.map((r) => {
    const explicit = ROLES.includes(r.role as Role) ? (r.role as Role) : undefined;
    const named = NAME_RULES.find(([re]) => re.test(r.name))?.[1];
    const words = r.text ? r.text.trim().split(/\s+/).filter(Boolean).length : undefined;
    return {
      role: explicit ?? named ?? 'graphic', fixed: !!(explicit ?? named), type: r.type, text: r.text,
      x: r.x / W, y: r.y / H, w: r.w / W, h: r.h / H,
      family: r.family, size: r.size != null ? r.size / H : undefined, weight: r.weight, fill: r.fill, words, align: r.align,
      radius: r.radius != null && r.h > 0 ? Math.min(0.5, r.radius / r.h) : undefined,
      upper: r.text ? r.text === r.text.toUpperCase() && /[A-Z]/.test(r.text) : undefined,
    };
  });
  const texts = els.filter((e) => e.type === 'text').sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  const top = texts.find((t) => !t.fixed || t.role === 'headline');
  const big = top?.size ?? 0;
  for (const t of texts) {
    if (t.fixed) continue;
    const s = t.size ?? 0;
    const button = els.find((o) => o.type === 'shape' && o !== t && area(o) < 0.15 && contains(o, center(t)));
    if (t === top) t.role = 'headline';
    else if (t.text && PRICE.test(t.text)) t.role = 'price';
    else if ((t.words ?? 9) <= 4 && button) { t.role = 'cta'; if (!button.fixed) button.role = 'cta'; }
    else if (s < 0.45 * big && t.y > 0.78) t.role = 'legal';
    else if (s >= 0.6 * big) t.role = 'subhead';
    else t.role = 'body';
  }
  for (const e of els) {
    if (e.fixed || e.type === 'text' || e.role === 'cta') continue;
    const a = area(e), c = center(e);
    const corner = (c.x < 0.3 || c.x > 0.7) && (c.y < 0.3 || c.y > 0.7);
    if (a >= 0.85) e.role = e.type === 'image' ? 'photo' : 'background';
    else if (e.type === 'image' && a >= 0.2) e.role = 'photo';
    else if (e.type === 'image' && a < 0.08 && corner) e.role = 'logo';
    else e.role = 'graphic';
  }
  return els.map(({ type, text, fixed, ...e }) => { void type; void text; void fixed; return clean(e); });
}

function clean(e: El): El {
  const o: any = { ...e, x: round(e.x), y: round(e.y), w: round(e.w), h: round(e.h) };
  if (e.size != null) o.size = Math.round(e.size * 1e5) / 1e5; // small numbers: keep ratios exact
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
}

// Profile

export type Format = 'story' | 'portrait' | 'square' | 'landscape' | 'banner';
export function formatOf(w: number, h: number): Format {
  const a = w / h;
  return a < 0.66 ? 'story' : a < 0.9 ? 'portrait' : a < 1.15 ? 'square' : a < 2.3 ? 'landscape' : 'banner';
}
export type Spot = `${'top' | 'middle' | 'bottom'}-${'left' | 'center' | 'right'}`;
export function spotOf(e: { x: number; y: number; w: number; h: number; align?: string }): Spot {
  const c = center(e);
  const row = c.y < 1 / 3 ? 'top' : c.y < 2 / 3 ? 'middle' : 'bottom';
  const colOf = (v: number) => (v < 1 / 3 ? 'left' : v < 2 / 3 ? 'center' : 'right');
  // Text is anchored by its alignment (a wide left-aligned headline reads as left, not center).
  const col = e.align === 'left' ? colOf(e.x) : e.align === 'right' ? colOf(e.x + e.w - 0.001) : colOf(c.x);
  return `${row}-${col}`;
}

export interface Archetype { id: string; format: Format; aspect: number; slots: (Pick<El, 'role' | 'x' | 'y' | 'w' | 'h'>)[]; from: string[]; bucket: Bucket }
export interface Profile {
  counts: Record<Bucket, number>;
  palette: Swatch[];
  avoidColors: string[];
  ground: 'light' | 'dark' | 'mixed';
  formats: Partial<Record<Format, number>>;
  type: {
    headlineSize?: number; headlineToBody?: number; headlineWeight?: number; headlineWords?: number; uppercaseHeadlines?: number;
    families: { role: Role; family: string; count: number }[];
  };
  layout: {
    margin?: number; whitespace?: number;
    logoRate: number; logoSpot?: { spot: Spot; share: number };
    headlineSpot?: { spot: Spot; share: number };
    ctaRate: number; photoRate: number;
    /** Button corner radius as a share of its height (0.5 = pill). */
    ctaRadius?: number;
  };
  archetypes: Archetype[];
  summary: string[];
}

const round = (n: number) => Math.round(n * 1000) / 1000;
function median(xs: number[]) {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}
function mode<T extends string>(xs: T[]): { value: T; share: number } | undefined {
  if (!xs.length) return undefined;
  const m = new Map<T, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  const [value, n] = [...m].sort((a, b) => b[1] - a[1])[0];
  return { value, share: round(n / xs.length) };
}

/** Distance from the nearest canvas edge to the content, as a fraction of the canvas's short
 *  side (so the same 86 px margin reads the same on a square and on a tall story). */
export function marginOf(f: Facts) {
  const inner = f.elements.filter((e) => e.role !== 'background' && area(e) < 0.6);
  if (!inner.length) return undefined;
  const W = f.width, H = f.height, s = Math.min(W, H);
  return round(Math.max(0, Math.min(...inner.map((e) => Math.min(e.x * W, e.y * H, (1 - e.x - e.w) * W, (1 - e.y - e.h) * H) / s))));
}
/** Share of the canvas not covered by any element except the background (20×20 grid). */
export function whitespaceOf(f: Facts) {
  const els = f.elements.filter((e) => e.role !== 'background');
  let empty = 0;
  for (let gy = 0; gy < 20; gy++) for (let gx = 0; gx < 20; gx++) {
    const p = { x: (gx + 0.5) / 20, y: (gy + 0.5) / 20 };
    if (!els.some((e) => contains(e, p))) empty++;
  }
  return round(empty / 400);
}
const headlineOf = (f: Facts) => f.elements.filter((e) => e.role === 'headline').sort((a, b) => (b.size ?? 0) - (a.size ?? 0))[0];
const bodyOf = (f: Facts) => f.elements.filter((e) => e.role === 'body').sort((a, b) => (b.size ?? 0) - (a.size ?? 0))[0];

/** Learns the brand's style. Approved work drives everything; inspiration adds layout ideas only
 *  (it is someone else's work, so never its colors or fonts); avoid lists colors to stay away from. */
/** brandColors: the brand kit's colors, which can never become colors to avoid. */
export function buildProfile(all: Facts[], brandColors: string[] = []): Profile {
  const approved = all.filter((f) => f.bucket === 'approved');
  const insp = all.filter((f) => f.bucket === 'inspiration');
  const avoid = all.filter((f) => f.bucket === 'avoid');
  const layoutSet = [...approved, ...insp].filter((f) => f.layered);
  const typeSet = approved.filter((f) => f.layered);

  // Palette: pooled from approved work, weighted by share.
  const pool: Swatch[] = [];
  for (const f of approved) for (const s of f.palette) {
    const near = pool.find((p) => colorDist(p.hex, s.hex) < 60);
    if (near) near.share += s.share / approved.length; else pool.push({ hex: s.hex, share: s.share / approved.length });
  }
  const palette = pool.sort((a, b) => b.share - a.share).slice(0, 8).map((s) => ({ hex: s.hex, share: round(s.share) }));
  const avoidColors = [...new Set(avoid.flatMap((f) => f.palette.filter((s) => s.share >= 0.12).map((s) => s.hex)))]
    .filter((c) => ![...palette.map((p) => p.hex), ...brandColors].some((k) => colorDist(k, c) < 90)).slice(0, 6);

  const lums = approved.map((f) => f.luminance);
  const light = lums.filter((l) => l >= 0.55).length, dark = lums.filter((l) => l < 0.45).length;
  const ground = !lums.length ? 'mixed' : light / lums.length >= 0.7 ? 'light' : dark / lums.length >= 0.7 ? 'dark' : 'mixed';

  const formats: Profile['formats'] = {};
  for (const f of [...approved, ...insp]) { const k = formatOf(f.width, f.height); formats[k] = (formats[k] ?? 0) + 1; }

  const heads = typeSet.map(headlineOf).filter(Boolean) as El[];
  const ratios = typeSet.map((f) => { const h = headlineOf(f), b = bodyOf(f); return h?.size && b?.size ? h.size / b.size : undefined; }).filter((x): x is number => x != null);
  const famCount = new Map<string, { role: Role; family: string; count: number }>();
  const TEXT_ROLES: Role[] = ['headline', 'subhead', 'body', 'cta', 'price', 'legal'];
  for (const f of typeSet) for (const e of f.elements) if (e.family && TEXT_ROLES.includes(e.role)) { // a wordmark's font is the logo's, not the brand's type
    const role: Role = e.role === 'headline' || e.role === 'subhead' ? 'headline' : 'body';
    const k = `${role}|${e.family.toLowerCase()}`;
    const v = famCount.get(k) ?? { role, family: e.family, count: 0 };
    v.count++;
    famCount.set(k, v);
  }

  const withLogo = layoutSet.filter((f) => f.elements.some((e) => e.role === 'logo'));
  const logoSpot = mode(withLogo.map((f) => spotOf(f.elements.find((e) => e.role === 'logo')!)));
  const headSpot = mode(layoutSet.map(headlineOf).filter(Boolean).map((h) => spotOf(h!)));
  const rate = (r: Role) => (layoutSet.length ? round(layoutSet.filter((f) => f.elements.some((e) => e.role === r)).length / layoutSet.length) : 0);

  const profile: Profile = {
    counts: { approved: approved.length, inspiration: insp.length, avoid: avoid.length },
    palette, avoidColors, ground, formats,
    type: {
      headlineSize: median(heads.map((h) => h.size!).filter((s) => s != null)),
      headlineToBody: median(ratios),
      headlineWeight: median(heads.map((h) => h.weight!).filter((w) => w != null)),
      headlineWords: median(heads.map((h) => h.words!).filter((w) => w != null)),
      uppercaseHeadlines: heads.length ? round(heads.filter((h) => h.upper).length / heads.length) : undefined,
      families: [...famCount.values()].sort((a, b) => b.count - a.count).slice(0, 6),
    },
    layout: {
      margin: median(layoutSet.map(marginOf).filter((m): m is number => m != null)),
      whitespace: median(layoutSet.map(whitespaceOf)),
      logoRate: layoutSet.length ? round(withLogo.length / layoutSet.length) : 0,
      logoSpot: logoSpot && { spot: logoSpot.value, share: logoSpot.share },
      headlineSpot: headSpot && { spot: headSpot.value, share: headSpot.share },
      ctaRate: rate('cta'), photoRate: rate('photo'),
      ctaRadius: median(typeSet.flatMap((f) => f.elements.filter((e) => e.role === 'cta' && e.radius != null).map((e) => e.radius!))),
    },
    archetypes: archetypesOf(layoutSet),
    summary: [],
  };
  profile.summary = summarize(profile);
  return profile;
}

/** One reusable layout per distinct arrangement (format + roles on a 3×3 grid). */
function archetypesOf(fs: Facts[]): Archetype[] {
  const out = new Map<string, Archetype>();
  for (const f of fs) {
    const slots = f.elements.filter((e) => area(e) >= 0.002 && e.role !== 'graphic').slice(-14)
      .map(({ role, x, y, w, h }) => ({ role, x, y, w, h }));
    if (!slots.some((s) => s.role === 'headline')) continue;
    const format = formatOf(f.width, f.height);
    const sig = format + ':' + slots.map((s) => `${s.role}@${spotOf(s)}`).sort().join(',');
    const have = out.get(sig);
    if (have) { have.from.push(f.id); if (f.bucket === 'approved') have.bucket = 'approved'; continue; }
    out.set(sig, { id: `${format}-${hash(sig)}`, format, aspect: round(f.width / f.height), slots, from: [f.id], bucket: f.bucket });
  }
  return [...out.values()].sort((a, b) => (a.bucket === b.bucket ? b.from.length - a.from.length : a.bucket === 'approved' ? -1 : 1)).slice(0, 24);
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).slice(0, 6);
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
function summarize(p: Profile): string[] {
  const s: string[] = [];
  const n = p.counts;
  s.push(`Learned from ${n.approved} approved, ${n.inspiration} inspiration and ${n.avoid} avoid example${n.avoid === 1 ? '' : 's'}.`);
  const main = p.palette.filter((c) => c.share >= 0.03);
  if (main.length) s.push(`Palette led by ${main.slice(0, 4).map((c) => `${c.hex} (${pct(c.share)})`).join(', ')}; ${p.ground === 'mixed' ? 'both light and dark grounds' : `mostly ${p.ground} grounds`}.`);
  if (p.avoidColors.length) s.push(`Avoid ${p.avoidColors.join(', ')}.`);
  const t = p.type;
  if (t.headlineSize) s.push(`Headlines about ${pct(t.headlineSize)} of the canvas height${t.headlineToBody ? `, ${t.headlineToBody.toFixed(1)}× the body size` : ''}${t.headlineWeight ? `, weight ${Math.round(t.headlineWeight)}` : ''}${t.headlineWords ? `, around ${Math.round(t.headlineWords)} words` : ''}${t.uppercaseHeadlines && t.uppercaseHeadlines >= 0.5 ? ', usually uppercase' : ''}.`);
  if (t.families.length) s.push(`Type: ${t.families.slice(0, 3).map((f) => `${f.family} for ${f.role === 'headline' ? 'headlines' : 'text'}`).join(', ')}.`);
  const l = p.layout;
  if (l.margin != null) s.push(`Margins about ${pct(l.margin)} of the canvas; about ${pct(l.whitespace ?? 0)} left empty.`);
  if (l.logoSpot) s.push(`Logo in ${pct(l.logoRate)} of designs, usually ${l.logoSpot.spot.replace('-', ' ')}.`);
  if (l.headlineSpot) s.push(`Headline usually ${l.headlineSpot.spot.replace('-', ' ')}.`);
  if (l.ctaRate) s.push(`A call-to-action button in ${pct(l.ctaRate)} of designs${l.ctaRadius != null ? ` (${l.ctaRadius >= 0.45 ? 'pill-shaped' : l.ctaRadius < 0.05 ? 'square corners' : 'rounded corners'})` : ''}; a photo in ${pct(l.photoRate)}.`);
  const fm = Object.entries(p.formats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`);
  if (fm.length) s.push(`Formats: ${fm.join(', ')}.`);
  return s;
}

// Fit score

export interface Check { id: string; label: string; ok: boolean; detail: string; weight: number; partial?: number }
export interface FitResult { score: number; checks: Check[]; fixes: string[] }

export function scoreFit(f: Facts, p: Profile, brand: { colors: string[]; fonts: string[] }): FitResult {
  const checks: Check[] = [];
  const allowed = [...brand.colors, ...p.palette.filter((s) => s.share >= 0.04).map((s) => s.hex)];
  if (allowed.length && f.palette.length) {
    const onBrand = f.palette.filter((s) => allowed.some((c) => colorDist(c, s.hex) < 70)).reduce((a, s) => a + s.share, 0);
    const total = f.palette.reduce((a, s) => a + s.share, 0) || 1;
    const share = onBrand / total;
    const off = f.palette.filter((s) => s.share >= 0.04 && !allowed.some((c) => colorDist(c, s.hex) < 70)).map((s) => s.hex);
    checks.push({ id: 'palette', label: 'Brand colors', ok: share >= 0.75, partial: share, weight: 4, detail: share >= 0.75 ? `${pct(share)} of the design uses brand colors` : `Only ${pct(share)} uses brand colors; off-brand: ${off.join(', ')}` });
  }
  // Text and shape colors count even when they cover little area (neon text on white is off-brand).
  const fills = [...new Set(f.elements.filter((e) => e.fill && e.role !== 'logo' && parseHex(e.fill)).map((e) => e.fill!.toLowerCase()))];
  if (allowed.length && fills.length) {
    const off = fills.filter((c) => !allowed.some((a) => colorDist(a, c) < 70) && !/^#(f{3}|f{6}|0{3}|0{6})$/.test(c));
    checks.push({ id: 'fills', label: 'Text and shape colors', ok: !off.length, weight: 2, detail: off.length ? `Not brand colors: ${off.join(', ')}` : 'Text and shapes use brand colors' });
  }
  if (p.avoidColors.length) {
    const hit = [...new Set([...f.palette.filter((s) => s.share >= 0.04).map((s) => s.hex), ...fills])]
      .filter((h) => p.avoidColors.some((c) => colorDist(c, h) < 60) && !brand.colors.some((c) => colorDist(c, h) < 60)); // the brand kit wins
    checks.push({ id: 'avoid', label: 'No avoided colors', ok: !hit.length, weight: 2, detail: hit.length ? `Uses ${hit.join(', ')}, which appears in Avoid examples` : 'None of the avoided colors are used' });
  }
  const fonts = [...brand.fonts, ...p.type.families.map((x) => x.family)].map((x) => x.toLowerCase());
  const used = [...new Set(f.elements.filter((e) => e.family).map((e) => e.family!))];
  if (fonts.length && used.length) {
    const bad = used.filter((u) => !fonts.includes(u.toLowerCase()));
    checks.push({ id: 'fonts', label: 'Brand fonts', ok: !bad.length, weight: 3, detail: bad.length ? `Not brand fonts: ${bad.join(', ')}` : 'All text uses brand fonts' });
  }
  const h = headlineOf(f), b = bodyOf(f);
  if (p.type.headlineSize && h?.size) {
    const r = h.size / p.type.headlineSize;
    checks.push({ id: 'headline', label: 'Headline size', ok: r >= 0.65 && r <= 1.5, weight: 1, detail: `Headline is ${pct(h.size)} of the height; the brand uses about ${pct(p.type.headlineSize)}` });
  }
  if (p.type.headlineToBody && h?.size && b?.size) {
    const r = h.size / b.size / p.type.headlineToBody;
    checks.push({ id: 'hierarchy', label: 'Type hierarchy', ok: r >= 0.6 && r <= 1.6, weight: 1, detail: `Headline is ${(h.size / b.size).toFixed(1)}× the body; the brand uses ${p.type.headlineToBody.toFixed(1)}×` });
  }
  const m = marginOf(f);
  if (p.layout.margin != null && m != null && f.layered) {
    checks.push({ id: 'margin', label: 'Margins', ok: m >= p.layout.margin * 0.6, weight: 1, detail: `Closest content is ${pct(m)} from the edge; the brand keeps about ${pct(p.layout.margin)}` });
  }
  if (p.layout.logoRate >= 0.5 && f.layered) {
    const logo = f.elements.find((e) => e.role === 'logo');
    const where = logo ? spotOf(logo) : undefined;
    const want = p.layout.logoSpot?.spot;
    checks.push({ id: 'logo', label: 'Logo', ok: !!logo, weight: 2, detail: !logo ? `No logo; ${pct(p.layout.logoRate)} of brand designs have one${want ? ` (usually ${want.replace('-', ' ')})` : ''}` : where === want || !want ? 'Logo present' : `Logo is ${where!.replace('-', ' ')}; the brand usually puts it ${want.replace('-', ' ')}` });
  }
  if (p.ground !== 'mixed') {
    const isLight = f.luminance >= 0.5;
    checks.push({ id: 'ground', label: 'Light or dark ground', ok: isLight === (p.ground === 'light'), weight: 1, detail: `This design is ${isLight ? 'light' : 'dark'}; the brand mostly uses ${p.ground} grounds` });
  }
  if (p.layout.whitespace != null && f.layered) {
    const w = whitespaceOf(f);
    checks.push({ id: 'space', label: 'Empty space', ok: Math.abs(w - p.layout.whitespace) <= 0.25, weight: 1, detail: `${pct(w)} empty; the brand leaves about ${pct(p.layout.whitespace)}` });
  }
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const got = checks.reduce((a, c) => a + c.weight * (c.ok ? 1 : c.partial ?? 0), 0);
  return { score: total ? Math.round((got / total) * 100) : 0, checks, fixes: checks.filter((c) => !c.ok).map((c) => c.detail) };
}

// Similarity

export function similarity(a: Pick<Facts, 'width' | 'height' | 'palette' | 'luminance' | 'elements'>, b: Pick<Facts, 'width' | 'height' | 'palette' | 'luminance' | 'elements'>) {
  const aspect = 1 - Math.min(1, Math.abs(Math.log((a.width / a.height) / (b.width / b.height))) / Math.log(3));
  const pal = a.palette.length && b.palette.length
    ? a.palette.reduce((s, x) => s + x.share * Math.max(0, ...b.palette.map((y) => 1 - colorDist(x.hex, y.hex) / 200)), 0) / (a.palette.reduce((s, x) => s + x.share, 0) || 1)
    : 0.5;
  const ra = new Set(a.elements.map((e) => e.role)), rb = new Set(b.elements.map((e) => e.role));
  const union = new Set([...ra, ...rb]).size;
  const roles = union ? [...ra].filter((r) => rb.has(r)).length / union : 0.5;
  const l = 1 - Math.abs(a.luminance - b.luminance);
  return round(0.3 * aspect + 0.3 * pal + 0.25 * roles + 0.15 * l);
}
