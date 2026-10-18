import { signal } from '@preact/signals';
import type { Doc, Layer } from './types';
import {
  library, Asset, Brand, brandByName, readAsset, importIntoCategory, readLibraryText, writeLibraryText, setAssetInfo,
  trainingPath, BRANDS_DIR, TRAINING_DIR, placeAsset, activeBrand,
} from './library';
import { docFromFile, exportBytes } from './io';
import { flatten } from './render';
import { cur, commit, createDoc, openDocState } from './store';
import { newShape, newText, addLayer, moveLayer } from './ops';
import { makeCanvas, ctx2d, unionRects, bounds } from './util';
import {
  inferRoles, quantize, buildProfile, scoreFit, similarity, formatOf, parseHex, colorDist,
  type Bucket, type Facts, type Profile, type RawEl, type Archetype, type FitResult, type Role,
} from './training-analyze';

// Brand Training: each brand's past designs (Approved), references (Inspiration) and don'ts
// (Avoid) are analyzed into a Brand Style Profile stored as Brands/<brand>/Training/style.json.
// Agents read the profile and nearest examples, rebuild a learned layout with the brand's own
// assets, and check their drafts with a brand-fit score. No model is fine-tuned: the profile
// is structured data any MCP agent can read, and everything stays in the local folder.

export type { Bucket, Profile, Archetype, FitResult, Facts };
export interface StyleFile {
  version: 1;
  brand: string;
  updated: string;
  profile: Profile;
  /** Cached facts per example id; `key` changes when the file changes, so only edits are re-analyzed. */
  facts: Record<string, Facts & { key: string }>;
  /** Examples that couldn't be read, by id -> key: not retried until the file changes. */
  unreadable?: Record<string, string>;
}

/** True when the style file is up to date for every example (read or known-unreadable). */
export function isCurrent(s: StyleFile | null | undefined, items: Asset[]): boolean {
  if (!s) return false;
  const known = (a: Asset) => s.facts[a.id]?.key === factKey(a) || s.unreadable?.[a.id] === factKey(a);
  return items.every(known) && Object.keys(s.facts).length + Object.keys(s.unreadable ?? {}).length === items.length;
}

export const brandStyles = signal<Record<string, StyleFile | null>>({});
const stylePath = (brand: string) => `${BRANDS_DIR}/${brand}/${TRAINING_DIR}/style.json`;

/** Cache key of an example's facts: bump the version when the analysis changes. */
export const factKey = (a: Asset) => `v3:${a.modified}:${a.size}:${a.training}`;

export const trainingItems = (brand: string, bucket?: Bucket) =>
  library.value.assets.filter((a) => a.brand === brand && a.training && (!bucket || a.training === bucket));

function needBrand(name?: string | null): Brand {
  const b = brandByName(name ?? activeBrand.value);
  if (!b) throw new Error(name ? `Brand "${name}" not found` : 'No active brand. Choose one in the Brands panel or pass a brand name.');
  return b;
}

// Facts

/** Layers flattened into analyzable elements (groups are opened unless named like a unit, e.g. "Logo"). */
function rawElements(layers: Layer[]): RawEl[] {
  const out: RawEl[] = [];
  const walk = (ls: Layer[]) => {
    for (const l of ls) {
      if (!l.visible || l.type === 'adjust') continue;
      const box = { name: l.name, role: l.role, x: l.x, y: l.y, w: l.w, h: l.h };
      if (l.type === 'group' && !l.role && !/logo|button|cta|badge/i.test(l.name)) walk(l.children);
      else if (l.type === 'text') out.push({ ...box, type: 'text', text: l.text, size: l.size, family: l.family, weight: l.weight, align: l.align, fill: typeof l.fill === 'string' ? l.fill : undefined });
      else if (l.type === 'shape') out.push({ ...box, type: 'shape', fill: typeof l.fill === 'string' ? l.fill : undefined, radius: l.shape === 'rect' ? l.radius ?? 0 : undefined });
      else out.push({ ...box, type: 'image' });
    }
  };
  walk(layers);
  return out;
}

const paletteOf = (c: HTMLCanvasElement) => quantize(ctx2d(c).getImageData(0, 0, c.width, c.height).data);

/** Facts of a document: layer roles from its layers, palette from a small render. */
export function factsFromDoc(doc: Doc, id = doc.id, bucket: Bucket = 'approved'): Facts {
  const small = flatten(doc, Math.min(1, 96 / Math.max(doc.width, doc.height)));
  const { palette, luminance } = paletteOf(small);
  return { id, bucket, width: doc.width, height: doc.height, layered: true, palette, luminance, elements: inferRoles(rawElements(doc.layers), doc.width, doc.height) };
}

const IMG_MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif' };

async function factsFromAsset(a: Asset): Promise<Facts> {
  const bytes = await readAsset(a);
  const bucket = a.training ?? 'approved';
  if (a.kind === 'document' || a.ext === 'svg') {
    return factsFromDoc(await docFromFile({ name: a.file, bytes }), a.id, bucket);
  }
  const mime = IMG_MIME[a.ext];
  if (!mime) throw new Error(`${a.file}: not an image or design file`);
  // Flat image: colors and format are known, layout needs layers (so elements stay empty).
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const W = img.naturalWidth || 1, H = img.naturalHeight || 1, s = Math.min(1, 96 / Math.max(W, H));
    const c = makeCanvas(Math.max(1, Math.round(W * s)), Math.max(1, Math.round(H * s)));
    ctx2d(c).drawImage(img, 0, 0, c.width, c.height);
    return { id: a.id, bucket, width: W, height: H, layered: false, ...paletteOf(c), elements: [] };
  } finally { URL.revokeObjectURL(url); }
}

// Style file

export async function loadStyle(brand: string): Promise<StyleFile | null> {
  if (brand in brandStyles.value) return brandStyles.value[brand];
  let s: StyleFile | null = null;
  try { const t = await readLibraryText(stylePath(brand)); s = t ? JSON.parse(t) : null; } catch { s = null; }
  brandStyles.value = { ...brandStyles.value, [brand]: s };
  return s;
}

/** Re-analyze changed examples and rebuild the brand's profile. */
export async function retrainBrand(name?: string, onProgress?: (done: number, total: number) => void): Promise<StyleFile> {
  const b = needBrand(name);
  const old = await loadStyle(b.name);
  const items = trainingItems(b.name);
  const facts: StyleFile['facts'] = {};
  const skipped: string[] = [];
  const unreadable: Record<string, string> = {};
  for (const [i, a] of items.entries()) {
    onProgress?.(i, items.length);
    const key = factKey(a);
    const cached = old?.facts[a.id];
    if (cached?.key === key) { facts[a.id] = cached; continue; }
    if (old?.unreadable?.[a.id] === key) { unreadable[a.id] = key; skipped.push(a.file); continue; }
    try { facts[a.id] = { ...(await factsFromAsset(a)), key }; } catch { unreadable[a.id] = key; skipped.push(a.file); }
  }
  onProgress?.(items.length, items.length);
  const profile = buildProfile(Object.values(facts), b.colors.map((c) => c.hex));
  if (skipped.length) profile.summary.push(`Couldn't read: ${skipped.join(', ')}.`);
  const style: StyleFile = { version: 1, brand: b.name, updated: new Date().toISOString(), profile, facts, ...(skipped.length ? { unreadable } : {}) };
  await writeLibraryText(stylePath(b.name), JSON.stringify(style, null, 1));
  brandStyles.value = { ...brandStyles.value, [b.name]: style };
  return style;
}

/** The profile, trained first if the brand has examples but no profile yet (or new examples). */
export async function styleFor(name?: string): Promise<StyleFile> {
  const b = needBrand(name);
  const s = await loadStyle(b.name);
  const items = trainingItems(b.name);
  return isCurrent(s, items) ? s! : retrainBrand(b.name);
}

// Adding examples

export async function addTrainingFiles(brand: string, bucket: Bucket, files: { name: string; bytes: Uint8Array }[]) {
  await importIntoCategory(trainingPath(needBrand(brand).name, bucket), files);
}

/** Save the active document (all layers intact) as a training example, with an optional note. */
export async function addCurrentDocument(brand: string, bucket: Bucket, note?: string): Promise<Asset> {
  const ds = cur();
  if (!ds) throw new Error('Open a document first');
  const b = needBrand(brand);
  const dir = trainingPath(b.name, bucket);
  const file = `${ds.doc.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-') || 'Design'}.lucentedit`;
  await importIntoCategory(dir, [{ name: file, bytes: await exportBytes(ds.doc, 'lucentedit') }]);
  const a = trainingItems(b.name, bucket).sort((x, y) => y.modified - x.modified)[0];
  if (a && note) await setAssetInfo(a, { description: note });
  return a;
}

// Using the profile

const brandFonts = (b: Brand) => [b.fonts.heading?.family, b.fonts.body?.family, b.fonts.accent?.family].filter(Boolean) as string[];

/** How well the active document (or a given doc) matches the brand. */
export async function scoreDocument(name?: string, doc: Doc | undefined = cur()?.doc): Promise<FitResult & { brand: string }> {
  if (!doc) throw new Error('Open a document first');
  const b = needBrand(name);
  const s = await styleFor(b.name);
  if (!Object.keys(s.facts).length) throw new Error(`"${b.name}" has no training examples yet. Add past designs to its Training > Approved folder.`);
  return { brand: b.name, ...scoreFit(factsFromDoc(doc), s.profile, { colors: b.colors.map((c) => c.hex), fonts: brandFonts(b) }) };
}

/** Training examples ranked by likeness to a target (the active doc, or a size) and an optional text query. */
export async function findSimilar(name: string | undefined, target: { doc?: Doc; width?: number; height?: number; query?: string; bucket?: Bucket }, limit = 5) {
  const b = needBrand(name);
  const s = await styleFor(b.name);
  const q = target.query?.toLowerCase().trim();
  const t = target.doc ? factsFromDoc(target.doc) : undefined;
  const items = trainingItems(b.name, target.bucket);
  return items.map((a) => {
    const f = s.facts[a.id];
    let score = 0.5;
    if (f && t) score = similarity(t, f);
    else if (f && target.width && target.height) score = 1 - Math.min(1, Math.abs(Math.log((f.width / f.height) / (target.width / target.height))) / Math.log(3));
    if (q && `${a.name} ${a.tags.join(' ')} ${a.description ?? ''}`.toLowerCase().includes(q)) score += 0.3;
    if (a.training === 'approved') score += 0.05;
    return { id: a.id, name: a.name, bucket: a.training!, note: a.description, tags: a.tags, format: f ? formatOf(f.width, f.height) : undefined, size: f ? `${f.width}×${f.height}` : undefined, score: Math.round(Math.min(1, score) * 100) / 100 };
  }).sort((x, y) => y.score - x.score).slice(0, limit);
}

/** Pick an archetype by id, or the one closest in aspect ratio to the target size. */
export function pickArchetype(p: Profile, id?: string, width?: number, height?: number): Archetype {
  if (!p.archetypes.length) throw new Error('No learned layouts yet: add layered designs (.lucentedit, .psd or .svg) to the brand\'s Approved examples.');
  if (id) {
    const a = p.archetypes.find((x) => x.id === id) ?? p.archetypes.find((x) => x.from.includes(id));
    if (!a) throw new Error(`Layout "${id}" not found. Use get_brand_style to list layouts.`);
    return a;
  }
  if (!width || !height) return p.archetypes[0];
  const want = width / height;
  return [...p.archetypes].sort((a, b) => Math.abs(Math.log(a.aspect / want)) - Math.abs(Math.log(b.aspect / want)))[0];
}

function brandColor(b: Brand, p: Profile, role: 'background' | 'text' | 'primary' | 'accent' | 'secondary', ground: 'light' | 'dark') {
  const byRole = b.colors.find((c) => c.role === role)?.hex;
  if (byRole) return byRole;
  const pool = [...b.colors.map((c) => c.hex), ...p.palette.map((s) => s.hex)];
  const L = (h: string) => { const c = parseHex(h); return c ? (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 : 0.5; };
  const sorted = [...pool].sort((x, y) => L(x) - L(y));
  if (role === 'background') return (ground === 'dark' ? sorted[0] : sorted[sorted.length - 1]) ?? (ground === 'dark' ? '#111111' : '#ffffff');
  if (role === 'text') return (ground === 'dark' ? sorted[sorted.length - 1] : sorted[0]) ?? (ground === 'dark' ? '#ffffff' : '#111111');
  // Accent: the most saturated color that isn't the ground or text.
  const sat = (h: string) => { const c = parseHex(h); return c ? Math.max(...c) - Math.min(...c) : 0; };
  return [...pool].sort((x, y) => sat(y) - sat(x))[0] ?? '#3d84f7';
}

const DEFAULT_COPY: Partial<Record<Role, string>> = {
  headline: 'Your headline here', subhead: 'A short supporting line', body: 'One or two sentences of body copy that explain the offer.',
  cta: 'Shop now', price: '$29', legal: 'Terms apply.', badge: 'NEW',
};

/**
 * Build a new document from a learned layout, filled with the brand's own fonts, colors and logo.
 * Text slots get placeholder copy unless `copy` provides it; the photo slot is a marked placeholder.
 */
export async function recreateLayout(name: string | undefined, opts: { layout?: string; width?: number; height?: number; copy?: Partial<Record<Role, string>> } = {}) {
  const b = needBrand(name);
  const s = await styleFor(b.name);
  const p = s.profile;
  const arch = pickArchetype(p, opts.layout, opts.width, opts.height);
  const W = Math.round(opts.width ?? 1080), H = Math.round(opts.height ?? W / arch.aspect);
  if (!(W >= 16 && H >= 16 && W <= 20000 && H <= 20000)) throw new Error('width and height must be between 16 and 20000');
  const ground = p.ground === 'dark' ? 'dark' : 'light';
  const bg = brandColor(b, p, 'background', ground), ink = brandColor(b, p, 'text', ground), accent = brandColor(b, p, 'accent', ground);
  const onAccent = colorDist(accent, '#ffffff') > colorDist(accent, '#111111') ? '#ffffff' : '#111111';
  const ds = openDocState(createDoc({ name: `${b.name} ${arch.format}`, width: W, height: H, background: bg }), `Recreate ${b.name} layout`);
  const head = b.fonts.heading ?? b.fonts.body, body = b.fonts.body ?? b.fonts.heading;
  const headSize = (p.type.headlineSize ?? 0.08) * H;
  // Floor on the short side, so wide banners don't get unreadably small body text.
  const bodySize = Math.max(10, 0.022 * Math.min(W, H), headSize / (p.type.headlineToBody ?? 2.6));
  const upper = (p.type.uppercaseHeadlines ?? 0) >= 0.5;
  const logo = library.value.assets.find((a) => a.brand === b.name && !a.training && /\/Logos$/.test(a.category) && a.kind !== 'font' && a.kind !== 'other');
  const box = (sl: Archetype['slots'][number]) => ({ x: Math.round(sl.x * W), y: Math.round(sl.y * H), w: Math.max(4, Math.round(sl.w * W)), h: Math.max(4, Math.round(sl.h * H)) });
  const created: { id: string; role: Role }[] = [];
  const add = (l: Layer, role: Role, name: string) => { l.role = role; l.name = name; addLayer(l, ds); created.push({ id: l.id, role }); };

  // A learned button is two slots (shape + label): the larger one draws both.
  const inside = (o: Archetype['slots'][number], i: Archetype['slots'][number]) => { const cx = i.x + i.w / 2, cy = i.y + i.h / 2; return cx >= o.x && cx <= o.x + o.w && cy >= o.y && cy <= o.y + o.h; };
  const slots = arch.slots.filter((sl) => sl.role !== 'cta' || !arch.slots.some((o) => o !== sl && o.role === 'cta' && o.w * o.h > sl.w * sl.h && inside(o, sl)));
  for (const sl of slots) {
    const r = box(sl);
    const copy = opts.copy?.[sl.role] ?? DEFAULT_COPY[sl.role] ?? '';
    switch (sl.role) {
      case 'background':
        add(newShape({ shape: 'rect', ...r, fill: bg, stroke: null }), 'background', 'Background');
        break;
      case 'photo':
        add(newShape({ shape: 'rect', ...r, fill: ground === 'dark' ? '#3a3a40' : '#d9d9de', stroke: null }), 'photo', 'Photo slot (place a brand photo here)');
        break;
      case 'logo':
        if (logo) {
          // A logo file can hold several layers: fit them into the slot together.
          const ls = await placeAsset(logo, { x: r.x, y: r.y });
          const u = unionRects(ls.map(bounds));
          if (u) {
            const k = Math.min(r.w / u.w, r.h / u.h);
            const { scaleLayer } = await import('./ops');
            for (const l of ls) { scaleLayer(l, k, k, u.x, u.y); moveLayer(l, r.x - u.x + (r.w - u.w * k) / 2, r.y - u.y + (r.h - u.h * k) / 2); }
          }
          for (const l of ls) { l.role = 'logo'; created.push({ id: l.id, role: 'logo' }); }
        } else add(newShape({ shape: 'rect', ...r, fill: null, stroke: { paint: ink, width: 2, dash: [6, 4] } }), 'logo', 'Logo slot (add a logo to the brand\'s Logos)');
        break;
      case 'cta': {
        add(newShape({ shape: 'rect', ...r, fill: accent, stroke: null, radius: Math.round((p.layout.ctaRadius ?? 0.15) * r.h) }), 'cta', 'CTA button');
        const t = newText(copy, r.x, r.y, { family: body?.family ?? 'Inter Variable', weight: 700, size: Math.min(r.h * 0.42, bodySize * 1.1), fill: onAccent, align: 'center', autoWidth: false, w: r.w });
        t.y = Math.round(r.y + (r.h - t.h) / 2);
        add(t, 'cta', 'CTA label');
        break;
      }
      case 'graphic': case 'badge':
        add(newShape({ shape: sl.role === 'badge' ? 'ellipse' : 'rect', ...r, fill: accent, opacity: sl.role === 'badge' ? 1 : 0.18, stroke: null } as any), sl.role, sl.role === 'badge' ? 'Badge' : 'Graphic');
        break;
      default: {
        const isHead = sl.role === 'headline' || sl.role === 'subhead' || sl.role === 'price';
        const size = sl.role === 'headline' ? headSize : sl.role === 'subhead' || sl.role === 'price' ? headSize * 0.55 : sl.role === 'legal' ? bodySize * 0.6 : bodySize;
        const f = isHead ? head : body;
        const text = sl.role === 'headline' && upper ? copy.toUpperCase() : copy;
        add(newText(text, r.x, r.y, {
          family: f?.family ?? 'Inter Variable', weight: sl.role === 'headline' ? (p.type.headlineWeight ?? f?.weight ?? 700) : f?.weight ?? 400,
          size: Math.max(8, Math.round(size)), fill: ink, autoWidth: false, w: r.w, lineHeight: sl.role === 'headline' ? 1.05 : 1.35,
        }), sl.role, sl.role[0].toUpperCase() + sl.role.slice(1));
      }
    }
  }
  commit(`Recreate ${b.name} layout`, ds);
  return { document: ds.doc.id, width: W, height: H, layout: arch.id, basedOn: arch.from, layers: created, colors: { background: bg, text: ink, accent } };
}
