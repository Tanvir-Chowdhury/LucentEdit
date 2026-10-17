import { signal } from '@preact/signals';
import type { Layer } from './types';
import { isTauri, tauriInvoke, readPath, writePath, layersFromFile, exportBytes } from './io';
import { cur, commit, toast, createDoc, touch } from './store';
import { addLayer, moveLayer, topLevel } from './ops';
import { bounds, unionRects, cloneLayers, makeCanvas, ctx2d } from './util';
import { flatten } from './render';

// Assets library: a folder chosen by the user. Each subfolder is a category, each file inside
// is an asset. library.json in the root keeps tags, descriptions and brand color palettes, so the
// folder stays plain and usable outside the app (and syncable with Dropbox/Drive/git).

export interface Asset {
  id: string; // "<category path>/<file>"
  name: string; // file name without extension
  file: string;
  /** Folder path inside the library: "Logos" or "Brands/<brand>/Logos". */
  category: string;
  /** Brand the asset belongs to (undefined for the shared library). */
  brand?: string;
  ext: string;
  kind: 'image' | 'vector' | 'document' | 'font' | 'other';
  size: number;
  modified: number;
  tags: string[];
  description?: string;
  /** Brand Training example (Brands/<brand>/Training/<bucket>): not a placeable brand asset. */
  training?: 'approved' | 'inspiration' | 'avoid';
}
export interface Palette { name: string; colors: string[] }

/** A brand kit, stored as Brands/<name>/brand.json next to the brand's own asset categories. */
export interface BrandColor { name: string; hex: string; role?: 'primary' | 'secondary' | 'accent' | 'text' | 'background' | 'other' }
export interface BrandFont { family: string; weight?: number }
export interface Brand {
  name: string;
  colors: BrandColor[];
  fonts: { heading?: BrandFont; body?: BrandFont; accent?: BrandFont };
  guidelines: string;
  tagline?: string;
  website?: string;
  /** Category folders of this brand, as library paths (Brands/<name>/<category>). */
  categories: string[];
}
export const BRANDS_DIR = 'Brands';
export const BRAND_CATEGORIES = ['Logos', 'Icons', 'Photos', 'Graphics', 'Templates', 'Fonts'];
/** Brand Training lives next to the brand's categories: Brands/<brand>/Training/<Approved|Inspiration|Avoid>. */
export const TRAINING_DIR = 'Training';
export const TRAINING_BUCKETS = { approved: 'Approved', inspiration: 'Inspiration', avoid: 'Avoid' } as const;
export const trainingPath = (brand: string, bucket: keyof typeof TRAINING_BUCKETS) => `${BRANDS_DIR}/${brand}/${TRAINING_DIR}/${TRAINING_BUCKETS[bucket]}`;
interface Meta { version: 1; assets: Record<string, { tags?: string[]; description?: string }>; palettes: Palette[] }

export const DEFAULT_CATEGORIES = ['Logos', 'Icons', 'Photos', 'Backgrounds', 'Textures', 'Illustrations', 'Templates', 'Fonts'];
const META_FILE = 'library.json';
const KINDS: Record<string, Asset['kind']> = {
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', bmp: 'image', avif: 'image',
  svg: 'vector', psd: 'document', lucentedit: 'document', lucent: 'document', ttf: 'font', otf: 'font', woff: 'font', woff2: 'font',
};

export const library = signal<{
  root: string | null; categories: string[]; brands: Brand[]; assets: Asset[]; palettes: Palette[]; loading: boolean; error?: string;
  /** A remembered folder that needs a click to reconnect (browser permission, or a missing drive). */
  pending?: string;
}>({
  root: null, categories: [], brands: [], assets: [], palettes: [], loading: false,
});

/** Brand currently used by the Type tool, pickers and AI agents (persisted per machine). */
export const activeBrand = signal<string | null>((() => { try { return localStorage.getItem('lucentedit.activeBrand'); } catch { return null; } })());
export function setActiveBrand(name: string | null) {
  activeBrand.value = name;
  try { name ? localStorage.setItem('lucentedit.activeBrand', name) : localStorage.removeItem('lucentedit.activeBrand'); } catch { /* storage unavailable */ }
}
export const brandByName = (name?: string | null) => (name ? library.value.brands.find((b) => b.name.toLowerCase() === name.toLowerCase()) : undefined);
/** Display name of a category path ("Brands/Acme/Logos" -> "Logos"). */
export const categoryLabel = (path: string) => path.split('/').pop()!;

// File system: Tauri commands on desktop, File System Access API in Chromium browsers.

interface Entry { name: string; isDir: boolean; size: number; modified: number }
interface LibFS {
  list(rel: string): Promise<Entry[]>;
  read(rel: string): Promise<Uint8Array>;
  write(rel: string, bytes: Uint8Array): Promise<void>;
  mkdir(rel: string): Promise<void>;
  remove(rel: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  /** Absolute path for MCP clients (desktop only). */
  abs(rel: string): string;
}

const join = (...p: string[]) => p.filter(Boolean).join('/').replace(/\/+/g, '/');

function tauriFS(root: string): LibFS {
  const a = (rel: string) => join(root, rel);
  return {
    list: async (rel) => (await tauriInvoke<any[]>('list_dir', { path: a(rel) })).map((e) => ({ name: e.name, isDir: e.is_dir, size: e.size, modified: e.modified_ms })),
    read: (rel) => readPath(a(rel)),
    write: (rel, b) => writePath(a(rel), b),
    mkdir: (rel) => tauriInvoke('make_dir', { path: a(rel) }),
    remove: (rel) => tauriInvoke('remove_path', { path: a(rel) }),
    rename: (from, to) => tauriInvoke('rename_path', { from: a(from), to: a(to) }),
    abs: a,
  };
}

function browserFS(rootHandle: any): LibFS {
  const dirOf = async (rel: string, create = false): Promise<any> => {
    let d = rootHandle;
    for (const part of rel.split('/').filter(Boolean)) d = await d.getDirectoryHandle(part, { create });
    return d;
  };
  const split = (rel: string) => { const i = rel.lastIndexOf('/'); return [rel.slice(0, Math.max(0, i)), rel.slice(i + 1)]; };
  const fs: LibFS = {
    async list(rel) {
      const out: Entry[] = [];
      for await (const [name, h] of (await dirOf(rel)).entries()) {
        if (h.kind === 'directory') out.push({ name, isDir: true, size: 0, modified: 0 });
        else { const f = await h.getFile(); out.push({ name, isDir: false, size: f.size, modified: f.lastModified }); }
      }
      return out;
    },
    async read(rel) {
      const [dir, name] = split(rel);
      const f = await (await (await dirOf(dir)).getFileHandle(name)).getFile();
      return new Uint8Array(await f.arrayBuffer());
    },
    async write(rel, bytes) {
      const [dir, name] = split(rel);
      const w = await (await (await dirOf(dir, true)).getFileHandle(name, { create: true })).createWritable();
      await w.write(bytes);
      await w.close();
    },
    async mkdir(rel) { await dirOf(rel, true); },
    async remove(rel) { const [dir, name] = split(rel); await (await dirOf(dir)).removeEntry(name, { recursive: true }); },
    async rename(from, to) {
      // FSA has no portable move: copy then delete (files only; categories are renamed file by file).
      const entries = await fs.list(from).catch(() => null);
      if (entries) {
        await fs.mkdir(to);
        for (const e of entries) await fs.rename(join(from, e.name), join(to, e.name));
        await fs.remove(from);
        return;
      }
      await fs.write(to, await fs.read(from));
      await fs.remove(from);
    },
    abs: (rel) => rel,
  };
  return fs;
}

let fs: LibFS | null = null;
const STORE_KEY = 'lucentedit.library';

/** True when the library can be used here (desktop app, or a browser with folder access). */
export const librarySupported = () => isTauri || 'showDirectoryPicker' in window;

export async function chooseLibraryFolder() {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const dir = await open({ directory: true, multiple: false, title: 'Choose a folder for your Assets library' });
    if (!dir || Array.isArray(dir)) return;
    await connect(String(dir), tauriFS(String(dir)));
    try { localStorage.setItem(STORE_KEY, String(dir)); } catch { /* storage unavailable */ }
  } else if ('showDirectoryPicker' in window) {
    const h = await (window as any).showDirectoryPicker({ mode: 'readwrite', id: 'lucentedit-assets' });
    await connect(h.name, browserFS(h));
    await handleStore('put', h).catch(() => {}); // remembered for the next visit
  } else toast('Choosing a folder needs the desktop app (or a Chromium browser)', 'error');
}

/** Browsers can't keep a folder in localStorage, but IndexedDB can hold its handle. */
function handleStore(op: 'get' | 'put' | 'delete', value?: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('lucentedit', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('handles');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('handles', op === 'get' ? 'readonly' : 'readwrite');
      const store = tx.objectStore('handles');
      const req = op === 'get' ? store.get('library') : op === 'put' ? store.put(value, 'library') : store.delete('library');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => open.result.close();
    };
  });
}

/** Use a folder by path (desktop). Same as choosing it in the dialog. */
export async function useLibraryFolder(path: string) {
  if (!isTauri) throw new Error('Setting the folder by path needs the desktop app');
  await connect(path, tauriFS(path));
  try { localStorage.setItem(STORE_KEY, path); } catch { /* storage unavailable */ }
}

/**
 * Reconnect to the folder used last time. Desktop: by its path. Browser: by the handle kept in
 * IndexedDB, at once if the browser still allows access, otherwise the panels offer a Reconnect
 * button (the browser needs a click to ask again). A missing folder is never recreated empty.
 */
export async function restoreLibrary() {
  if (isTauri) {
    let root: string | null = null;
    try { root = localStorage.getItem(STORE_KEY); } catch { /* storage unavailable */ }
    if (!root) return;
    await connect(root, tauriFS(root), false).catch(() => {
      library.value = { ...library.value, root: null, pending: root!, error: `Couldn't open ${root}. If it's on an external drive, connect it and press Reconnect.` };
    });
    return;
  }
  if (!('showDirectoryPicker' in window)) return;
  const h = await handleStore('get').catch(() => null);
  if (!h) return;
  const perm = await h.queryPermission?.({ mode: 'readwrite' }).catch(() => 'prompt');
  if (perm === 'granted') await connect(h.name, browserFS(h), false).catch(() => { library.value = { ...library.value, pending: h.name }; });
  else library.value = { ...library.value, pending: h.name };
}

/** Reconnect the remembered folder (call from a click: browsers only show the prompt then). */
export async function reconnectLibrary() {
  if (isTauri) return restoreLibrary();
  const h = await handleStore('get').catch(() => null);
  if (!h) { library.value = { ...library.value, pending: undefined }; return chooseLibraryFolder(); }
  if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('Access to the folder was not allowed');
  await connect(h.name, browserFS(h), false);
}

export function disconnectLibrary() {
  fs = null;
  if (isTauri) tauriInvoke('set_library_root', { path: null }).catch(() => {});
  else handleStore('delete').catch(() => {});
  try { localStorage.removeItem(STORE_KEY); } catch { /* storage unavailable */ }
  library.value = { root: null, categories: [], brands: [], assets: [], palettes: [], loading: false };
}

/** create: make the folder if needed (a newly chosen folder), never when reconnecting. */
async function connect(root: string, f: LibFS, create = true) {
  if (create) await f.mkdir('');
  else await f.list(''); // throws if the folder is gone
  if (isTauri) await tauriInvoke('set_library_root', { path: root }); // deletes/renames stay inside it
  const top = await f.list('');
  fs = f;
  library.value = { ...library.value, root, loading: true, error: undefined, pending: undefined };
  // A brand-new folder gets the default categories so it's ready to use.
  if (!top.some((e) => e.isDir)) for (const c of DEFAULT_CATEGORIES) await f.mkdir(c);
  await refreshLibrary();
}

async function readMeta(): Promise<Meta> {
  // Only a missing file means "empty": a damaged one must not be overwritten with nothing.
  if (!(await fs!.list('')).some((e) => e.name === META_FILE)) return { version: 1, assets: {}, palettes: [] };
  let m: any;
  try { m = JSON.parse(new TextDecoder().decode(await fs!.read(META_FILE))); } catch {
    throw new Error(`${META_FILE} in your Assets folder is damaged. Fix or remove it, then refresh.`);
  }
  return { version: 1, assets: m.assets ?? {}, palettes: Array.isArray(m.palettes) ? m.palettes : [] };
}

async function writeMeta(m: Meta) {
  await fs!.write(META_FILE, new TextEncoder().encode(JSON.stringify(m, null, 2)));
}

async function listAssets(dir: string, meta: Meta, brand?: string): Promise<Asset[]> {
  const out: Asset[] = [];
  for (const e of await fs!.list(dir)) {
    if (e.isDir || e.name.startsWith('.')) continue;
    const ext = e.name.split('.').pop()!.toLowerCase();
    const id = `${dir}/${e.name}`;
    out.push({
      id, name: e.name.replace(/\.[^.]+$/, ''), file: e.name, category: dir, brand, ext, kind: KINDS[ext] ?? 'other',
      size: e.size, modified: e.modified, tags: meta.assets[id]?.tags ?? [], description: meta.assets[id]?.description,
    });
  }
  return out;
}

const subdirs = async (dir: string) => (await fs!.list(dir).catch(() => [] as Entry[])).filter((e) => e.isDir && !e.name.startsWith('.')).map((e) => e.name).sort((a, b) => a.localeCompare(b));

export async function refreshLibrary() {
  if (!fs) return;
  library.value = { ...library.value, loading: true };
  try {
    const meta = await readMeta();
    const cats = (await subdirs('')).filter((c) => c !== BRANDS_DIR);
    const assets: Asset[] = [];
    for (const c of cats) assets.push(...(await listAssets(c, meta)));
    const brands: Brand[] = [];
    for (const b of await subdirs(BRANDS_DIR)) {
      const base = join(BRANDS_DIR, b);
      const kit = await readBrandFile(base);
      const bcats = (await subdirs(base)).filter((c) => c !== TRAINING_DIR).map((c) => join(base, c));
      for (const c of bcats) assets.push(...(await listAssets(c, meta, b)));
      for (const [bucket, dir] of Object.entries(TRAINING_BUCKETS) as [keyof typeof TRAINING_BUCKETS, string][]) {
        const items = await listAssets(join(base, TRAINING_DIR, dir), meta, b).catch(() => [] as Asset[]);
        assets.push(...items.map((a) => ({ ...a, training: bucket })));
      }
      brands.push({ name: b, colors: kit.colors ?? [], fonts: kit.fonts ?? {}, guidelines: kit.guidelines ?? '', tagline: kit.tagline, website: kit.website, categories: bcats });
    }
    library.value = { ...library.value, categories: cats, brands, assets, palettes: meta.palettes, loading: false, error: undefined };
    if (activeBrand.value && !brands.some((b) => b.name === activeBrand.value)) setActiveBrand(null);
    registerFonts(assets.filter((a) => a.kind === 'font'));
  } catch (e: any) {
    library.value = { ...library.value, loading: false, error: String(e?.message ?? e) };
  }
}

async function readBrandFile(base: string): Promise<Partial<Brand>> {
  try { return JSON.parse(new TextDecoder().decode(await fs!.read(join(base, 'brand.json')))); } catch { return {}; }
}

async function writeBrandFile(b: Brand) {
  const { categories, ...kit } = b;
  void categories;
  await need().write(join(BRANDS_DIR, b.name, 'brand.json'), new TextEncoder().encode(JSON.stringify(kit, null, 2)));
}

// Brands

export async function createBrand(name: string, kit: Partial<Omit<Brand, 'name' | 'categories'>> = {}) {
  const f = need(), n = safeName(name);
  await refreshLibrary(); // the folder may have changed outside the app
  if (brandByName(n)) throw new Error(`Brand "${n}" already exists`);
  for (const c of BRAND_CATEGORIES) await f.mkdir(join(BRANDS_DIR, n, c));
  for (const c of Object.values(TRAINING_BUCKETS)) await f.mkdir(join(BRANDS_DIR, n, TRAINING_DIR, c));
  await writeBrandFile({ name: n, colors: kit.colors ?? [], fonts: kit.fonts ?? {}, guidelines: kit.guidelines ?? '', tagline: kit.tagline, website: kit.website, categories: [] });
  await refreshLibrary();
  return brandByName(n)!;
}

export async function updateBrand(name: string, patch: Partial<Omit<Brand, 'name' | 'categories'>>) {
  const b = brandByName(name);
  if (!b) throw new Error(`Brand "${name}" not found`);
  await writeBrandFile({ ...b, ...patch, fonts: { ...b.fonts, ...(patch.fonts ?? {}) } });
  await refreshLibrary();
  return brandByName(name)!;
}

/** Renames a brand folder; returns the (sanitized) new name. */
export async function renameBrand(from: string, to: string) {
  const t = safeName(to);
  const f = need();
  await f.rename(join(BRANDS_DIR, from), join(BRANDS_DIR, t));
  const meta = await readMeta();
  const prefix = `${BRANDS_DIR}/${from}/`;
  for (const k of Object.keys(meta.assets)) if (k.startsWith(prefix)) { meta.assets[`${BRANDS_DIR}/${t}/${k.slice(prefix.length)}`] = meta.assets[k]; delete meta.assets[k]; }
  await writeMeta(meta);
  if (activeBrand.value === from) setActiveBrand(t);
  await refreshLibrary();
  return t;
}

export async function deleteBrand(name: string) {
  await need().remove(join(BRANDS_DIR, name));
  if (activeBrand.value === name) setActiveBrand(null);
  await refreshLibrary();
}

const need = () => {
  if (fs) return fs;
  const p = library.value.pending;
  throw new Error(p ? `The Assets folder "${p}" is not connected right now. Ask the user to press Reconnect in the Assets panel (Window > Assets).` : 'No Assets folder is set. Choose one in the Assets panel (Window > Assets).');
};
const safeName = (s: string) => s.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/^\.+/, '').slice(0, 120) || 'Untitled';
/** Throws a helpful error when no folder is connected (for MCP tools). */
export const needLibrary = () => void need();
export const findAsset = (idOrName: string) => {
  const q = idOrName.toLowerCase();
  return library.value.assets.find((a) => a.id.toLowerCase() === q) ?? library.value.assets.find((a) => a.name.toLowerCase() === q || a.file.toLowerCase() === q);
};

export async function createCategory(name: string, brand?: string) {
  await need().mkdir(brand ? join(BRANDS_DIR, brand, safeName(name)) : safeName(name));
  await refreshLibrary();
}

export async function renameCategory(from: string, to: string) {
  const f = need(), parent = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '', t = join(parent, safeName(to));
  await f.rename(from, t);
  const meta = await readMeta();
  for (const k of Object.keys(meta.assets)) if (k.startsWith(from + '/')) { meta.assets[t + k.slice(from.length)] = meta.assets[k]; delete meta.assets[k]; }
  await writeMeta(meta);
  await refreshLibrary();
}

export async function deleteCategory(name: string) {
  await need().remove(name);
  await refreshLibrary();
}

/** Copy files into a category (keeps the original name; adds " 2", " 3"... on clashes). */
export async function importIntoCategory(category: string, files: { name: string; bytes: Uint8Array }[]) {
  const f = need();
  for (const file of files) await f.write(join(category, uniqueName(category, safeName(file.name))), file.bytes);
  await refreshLibrary();
}

function uniqueName(category: string, file: string) {
  const taken = new Set(library.value.assets.filter((a) => a.category === category).map((a) => a.file.toLowerCase()));
  if (!taken.has(file.toLowerCase())) return file;
  const dot = file.lastIndexOf('.'), base = dot > 0 ? file.slice(0, dot) : file, ext = dot > 0 ? file.slice(dot) : '';
  for (let i = 2; ; i++) if (!taken.has(`${base} ${i}${ext}`.toLowerCase())) return `${base} ${i}${ext}`;
}

export async function deleteAsset(a: Asset) {
  await need().remove(a.id);
  const meta = await readMeta();
  delete meta.assets[a.id];
  await writeMeta(meta);
  await refreshLibrary();
}

export async function renameAsset(a: Asset, name: string) {
  const file = `${safeName(name)}.${a.ext}`;
  await need().rename(a.id, join(a.category, file));
  const meta = await readMeta();
  if (meta.assets[a.id]) { meta.assets[`${a.category}/${file}`] = meta.assets[a.id]; delete meta.assets[a.id]; }
  await writeMeta(meta);
  await refreshLibrary();
}

export async function setAssetInfo(a: Asset, info: { tags?: string[]; description?: string }) {
  const meta = await readMeta();
  meta.assets[a.id] = { ...meta.assets[a.id], ...info };
  await writeMeta(meta);
  await refreshLibrary();
}

export async function savePalette(p: Palette) {
  const meta = await readMeta();
  meta.palettes = [...meta.palettes.filter((x) => x.name !== p.name), p];
  await writeMeta(meta);
  await refreshLibrary();
}

export async function deletePalette(name: string) {
  const meta = await readMeta();
  meta.palettes = meta.palettes.filter((x) => x.name !== name);
  await writeMeta(meta);
  await refreshLibrary();
}

export const readAsset = (a: Asset) => need().read(a.id);
/** Text files inside the library (Brand Training's style.json); null when the file is missing. */
export async function readLibraryText(rel: string): Promise<string | null> {
  const f = need(), dir = rel.slice(0, Math.max(0, rel.lastIndexOf('/'))), name = rel.slice(rel.lastIndexOf('/') + 1);
  if (!(await f.list(dir).catch(() => [] as Entry[])).some((e) => e.name === name)) return null;
  return new TextDecoder().decode(await f.read(rel));
}
export const writeLibraryText = (rel: string, text: string) => need().write(rel, new TextEncoder().encode(text));
export const assetPath = (a: Asset) => need().abs(a.id);

/** Place an asset in the active document; optional box in document px (aspect kept if only one side). */
export async function placeAsset(a: Asset, box: { x?: number; y?: number; width?: number; height?: number; centerX?: number; centerY?: number } = {}): Promise<Layer[]> {
  const ds = cur();
  if (!ds) throw new Error('Open or create a document first');
  if (a.kind === 'font' || a.kind === 'other') throw new Error(`${a.file} can't be placed on the canvas`);
  const layers = await layersFromFile({ name: a.file, bytes: await readAsset(a) }, ds.doc);
  const { scaleLayer } = await import('./ops');
  for (const l of layers) {
    l.name = a.name;
    if (box.width || box.height) {
      const ratio = l.w / l.h;
      const w = box.width ?? (box.height! * ratio), h = box.height ?? (box.width! / ratio);
      scaleLayer(l, w / l.w, h / l.h, l.x, l.y);
    }
    if (box.x != null || box.y != null) moveLayer(l, (box.x ?? l.x) - l.x, (box.y ?? l.y) - l.y);
    if (box.centerX != null && box.centerY != null) moveLayer(l, box.centerX - (l.x + l.w / 2), box.centerY - (l.y + l.h / 2));
    addLayer(l, ds);
  }
  commit(`Place ${a.name}`, ds);
  return layers;
}

/**
 * Save layers of the active document (default: the selected ones) as a new asset.
 * PNG keeps pixels and effects, SVG keeps vectors editable, .lucentedit keeps every layer.
 */
export async function saveLayersAsAsset(category: string, name: string, format: 'png' | 'svg' | 'lucentedit' = 'png', layerIds?: string[]) {
  const ds = cur();
  if (!ds) throw new Error('Open a document first');
  const pick = layerIds?.length ? ds.doc.layers.flatMap(function find(l): Layer[] { return layerIds.includes(l.id) ? [l] : l.type === 'group' ? l.children.flatMap(find) : []; })
    : topLevel(ds.selected.map((id) => ds.doc.layers.flatMap(function find(l): Layer[] { return l.id === id ? [l] : l.type === 'group' ? l.children.flatMap(find) : []; })).flat(), ds);
  const src = pick.length ? pick : ds.doc.layers;
  const b = unionRects(src.filter((l) => l.type !== 'adjust').map(bounds));
  if (!b) throw new Error('Nothing to save');
  const pad = 2, x = Math.floor(b.x) - pad, y = Math.floor(b.y) - pad;
  const doc = createDoc({ name, width: Math.ceil(b.w) + pad * 2, height: Math.ceil(b.h) + pad * 2, background: null });
  doc.layers = cloneLayers(src);
  doc.layers.forEach((l) => moveLayer(l, -x, -y));
  const bytes = await exportBytes(doc, format);
  category = category.split('/').map(safeName).join('/'); // keeps Brands/<brand>/<category> paths intact
  const parts = category.split('/');
  const isBrand = parts[0].toLowerCase() === BRANDS_DIR.toLowerCase();
  if (isBrand ? parts.length !== 3 : parts.length !== 1) throw new Error(`"${category}" isn't a category: use a plain name like "Logos" (pass brand to save into a brand)`);
  const file = uniqueName(category, `${safeName(name)}.${format}`);
  await need().mkdir(category);
  await need().write(join(category, file), bytes);
  await refreshLibrary();
  touch();
  return library.value.assets.find((a) => a.id === `${category}/${file}`)!;
}

// Thumbnails (memory cache; rebuilt when the file changes).

const thumbs = new Map<string, Promise<string | null>>();
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', avif: 'image/avif' };

export function assetThumb(a: Asset, size = 160): Promise<string | null> {
  const key = `${a.id}:${a.modified}:${a.size}:${size}`;
  let p = thumbs.get(key);
  if (p) thumbs.delete(key); // re-inserted below: the Map's order is least-recently-used first
  else {
    p = (async () => {
      try {
        const bytes = await readAsset(a);
        if (MIME[a.ext]) return await downscaled(bytes, MIME[a.ext], size);
        if (a.kind === 'document') {
          const { docFromFile } = await import('./io');
          const d = await docFromFile({ name: a.file, bytes });
          return flatten(d, Math.min(1, size / Math.max(d.width, d.height))).toDataURL('image/png');
        }
        return null;
      } catch { return null; }
    })();
  }
  thumbs.set(key, p);
  if (thumbs.size > 400) thumbs.delete(thumbs.keys().next().value!);
  return p;
}

/** A small PNG of an image file, so the cache holds previews, not whole photos. */
async function downscaled(bytes: Uint8Array, mime: string, size: number): Promise<string> {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const w = img.naturalWidth || size, h = img.naturalHeight || size;
    const s = Math.min(1, size / Math.max(w, h));
    const c = makeCanvas(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
    ctx2d(c).drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

/** Small PNG preview for MCP clients (base64, no data: prefix). */
export async function assetPreviewPNG(a: Asset, max = 512): Promise<string> {
  const url = await assetThumb(a, max);
  if (!url) throw new Error(`No preview for ${a.file}`);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const s = Math.min(1, max / Math.max(img.naturalWidth || max, img.naturalHeight || max));
  const c = makeCanvas((img.naturalWidth || max) * s, (img.naturalHeight || max) * s);
  ctx2d(c).drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/png').split(',')[1];
}

// Fonts in the library become usable in the Type tool.

export const libraryFonts = signal<string[]>([]);
const loadedFonts = new Set<string>();

async function registerFonts(fonts: Asset[]) {
  const names: string[] = [];
  for (const f of fonts) {
    names.push(f.name);
    if (loadedFonts.has(f.id + f.modified)) continue;
    try {
      const face = new FontFace(f.name, (await readAsset(f)).buffer as ArrayBuffer);
      await face.load();
      document.fonts.add(face);
      loadedFonts.add(f.id + f.modified);
    } catch { /* not a valid font file */ }
  }
  libraryFonts.value = names;
}

