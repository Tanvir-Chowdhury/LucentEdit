import { useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { Plus, Trash2, Star, FolderOpen, Pencil, Type, Wand2 } from 'lucide-preact';
import { fg, toast, selectedLayers, commit, touch, useTick, textOpts } from '../core/store';
import {
  library, chooseLibraryFolder, createBrand, updateBrand, renameBrand, deleteBrand, activeBrand, setActiveBrand,
  brandByName, categoryLabel, Brand, BrandColor, BrandFont,
} from '../core/library';
import { fontWeights } from '../core/fonts';
import { setProps } from '../core/ops';
import { cssFamily } from '../core/render';
import { FontPicker } from './FontPicker';
import { Swatch } from './controls';
import { askConfirm, askText } from './dialogs';
import { assetScope, assetCategory } from './AssetsPanel';
import { ui } from './psCommands';

// Brands panel: several brand kits (colors, fonts, guidelines, assets) side by side.

const editing = signal<string | null>(null);
const ROLES: BrandColor['role'][] = ['primary', 'secondary', 'accent', 'text', 'background', 'other'];
const run = (p: Promise<unknown>, ok?: string) => p.then(() => ok && toast(ok, 'success')).catch((e) => toast(String(e?.message ?? e), 'error'));

/** Brand edits update the panel at once and are written to brand.json shortly after.
 *  Pending edits are kept per brand and merged, so quick edits to several fields all land. */
const pending = new Map<string, { timer: number; patch: Partial<Brand> }>();
function saveSoon(b: Brand, patch: Partial<Brand>) {
  Object.assign(b, patch);
  library.value = { ...library.value };
  const p = pending.get(b.name) ?? { timer: 0, patch: {} };
  clearTimeout(p.timer);
  p.patch = { ...p.patch, ...patch };
  p.timer = window.setTimeout(() => void flush(b.name), 400);
  pending.set(b.name, p);
}
/** Writes a brand's pending edits now (before it is renamed or deleted). */
function flush(name: string): Promise<unknown> {
  const p = pending.get(name);
  if (!p) return Promise.resolve();
  clearTimeout(p.timer);
  pending.delete(name);
  return run(updateBrand(name, p.patch));
}

/** Apply brand fonts to selected text layers: large text gets the heading font, the rest the body font. */
export function applyBrandFonts(b: Brand) {
  const texts = selectedLayers().filter((l) => l.type === 'text');
  if (!texts.length) return toast('Select text layers first', 'error');
  for (const l of texts) {
    const f = (l.type === 'text' && l.size >= 32 ? b.fonts.heading : b.fonts.body) ?? b.fonts.body ?? b.fonts.heading;
    if (f) setProps(l, { family: f.family, ...(f.weight ? { weight: f.weight } : {}) });
  }
  commit('Apply Brand Fonts');
}

function applyColorToSelection(hex: string) {
  const ls = selectedLayers().filter((l) => !l.locked && (l.type === 'shape' || l.type === 'text'));
  if (!ls.length) return toast('Select shape or text layers to recolor', 'error');
  ls.forEach((l) => ((l as any).fill = hex));
  commit('Apply Brand Color');
}

function FontRow({ b, role, label }: { b: Brand; role: 'heading' | 'body' | 'accent'; label: string }) {
  const f: BrandFont | undefined = b.fonts[role];
  const set = (next: BrandFont | undefined) => saveSoon(b, { fonts: { ...b.fonts, [role]: next } });
  return (
    <div class="brand-font">
      <div class="row">
        <span class="lbl">{label}</span>
        <FontPicker value={f?.family ?? 'Choose a font…'} onChange={(family) => set({ family, weight: f?.weight ?? (role === 'heading' ? 700 : 400) })} width={150} />
        {f && (
          <select value={String(f.weight ?? 400)} onChange={(e) => set({ ...f, weight: +(e.target as HTMLSelectElement).value })} title="Weight">
            {fontWeights(f.family).map((w) => <option value={w}>{w}</option>)}
          </select>
        )}
        {f && <button class="icon-btn" title="Remove" onClick={() => set(undefined)}><Trash2 size={12} /></button>}
      </div>
      {f && <div class="brand-font-preview" style={{ fontFamily: cssFamily(f.family), fontWeight: f.weight ?? 400, fontSize: role === 'heading' ? 22 : 15 }}>{role === 'heading' ? 'The quick brown fox' : 'Jumps over the lazy dog 0123456789'}</div>}
    </div>
  );
}

function BrandEditor({ b }: { b: Brand }) {
  const active = activeBrand.value === b.name;
  const counts = b.categories.map((c) => [c, library.value.assets.filter((a) => a.category === c).length] as const);
  const openAssets = (cat?: string) => { assetScope.value = b.name; assetCategory.value = cat ?? 'All'; ui.value = { ...ui.value, bottomTab: 'assets' }; };
  return (
    <div class="brand-editor">
      <div class="row" style={{ marginBottom: 8 }}>
        <b style={{ fontSize: 14, flex: 1 }}>{b.name}</b>
        <button class={`btn${active ? ' primary' : ''}`} title="The active brand's fonts and colors are offered first in pickers and to AI agents" onClick={() => setActiveBrand(active ? null : b.name)}><Star size={13} /> {active ? 'Active' : 'Set active'}</button>
        <button class="icon-btn" title="Rename brand" onClick={() => askText('Rename brand', 'Name', b.name, (v) => { run(flush(b.name).then(() => renameBrand(b.name, v)).then((n) => { editing.value = n; })); })}><Pencil size={13} /></button>
        <button class="icon-btn" title="Delete brand" onClick={() => askConfirm(`Delete brand "${b.name}"?`, 'Its folder, brand kit and every asset in it are deleted from disk.', 'Delete', () => { pending.delete(b.name); run(deleteBrand(b.name)); editing.value = null; })}><Trash2 size={13} /></button>
      </div>

      <div class="section-title">Colors
        <button class="icon-btn" title="Add the foreground color" onClick={() => saveSoon(b, { colors: [...b.colors, { name: `Color ${b.colors.length + 1}`, hex: fg.value, role: b.colors.length ? 'other' : 'primary' }] })}><Plus size={13} /></button>
      </div>
      {b.colors.map((c, i) => (
        <div class="row brand-color">
          <Swatch value={c.hex} onChange={(hex) => { const colors = b.colors.map((x, j) => (j === i ? { ...x, hex } : x)); saveSoon(b, { colors }); }} />
          <input class="text-in grow" value={c.name} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => saveSoon(b, { colors: b.colors.map((x, j) => (j === i ? { ...x, name: (e.target as HTMLInputElement).value } : x)) })} />
          <select value={c.role ?? 'other'} onChange={(e) => saveSoon(b, { colors: b.colors.map((x, j) => (j === i ? { ...x, role: (e.target as HTMLSelectElement).value as BrandColor['role'] } : x)) })}>
            {ROLES.map((r) => <option value={r}>{r}</option>)}
          </select>
          <button class="icon-btn" title="Use as foreground color" onClick={() => (fg.value = c.hex)}><Wand2 size={12} /></button>
          <button class="icon-btn" title="Apply to selected shapes/text" onClick={() => applyColorToSelection(c.hex)}><Type size={12} /></button>
          <button class="icon-btn" title="Remove" onClick={() => saveSoon(b, { colors: b.colors.filter((_, j) => j !== i) })}><Trash2 size={12} /></button>
        </div>
      ))}
      {!b.colors.length && <div style={{ color: 'var(--muted)', marginBottom: 6 }}>Add the brand's colors. The + button adds the current foreground color.</div>}

      <div class="section-title" style={{ marginTop: 10 }}>Typography
        <button class="btn ghost" style={{ height: 22, padding: '0 6px' }} title="Large text gets the heading font, the rest the body font" onClick={() => applyBrandFonts(b)}>Apply to selected text</button>
      </div>
      <FontRow b={b} role="heading" label="Heading" />
      <FontRow b={b} role="body" label="Body" />
      <FontRow b={b} role="accent" label="Accent" />
      {b.fonts.body && <button class="btn ghost" style={{ marginBottom: 6 }} onClick={() => { textOpts.value = { ...textOpts.value, family: b.fonts.body!.family, weight: b.fonts.body!.weight ?? 400 }; touch(); toast('Type tool now uses the body font'); }}>Use body font in the Type tool</button>}

      <div class="section-title" style={{ marginTop: 10 }}>Assets
        <button class="icon-btn" title="Open this brand's assets" onClick={() => openAssets()}><FolderOpen size={13} /></button>
      </div>
      <div class="asset-cats" style={{ marginBottom: 6 }}>
        {counts.map(([c, n]) => <button class="chip" onClick={() => openAssets(c)}>{categoryLabel(c)} <span>{n}</span></button>)}
      </div>

      <div class="section-title" style={{ marginTop: 10 }}>Details</div>
      <div class="kv" style={{ gridTemplateColumns: '70px 1fr', gap: 6 }}>
        <label>Tagline</label><input class="text-in" value={b.tagline ?? ''} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => saveSoon(b, { tagline: (e.target as HTMLInputElement).value })} />
        <label>Website</label><input class="text-in" value={b.website ?? ''} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => saveSoon(b, { website: (e.target as HTMLInputElement).value })} />
      </div>
      <textarea class="text-in" style={{ height: 90, padding: 8, marginTop: 6, resize: 'vertical' }} placeholder="Guidelines: tone of voice, logo clear space, do's and don'ts… (AI agents read this)"
        value={b.guidelines} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => saveSoon(b, { guidelines: (e.target as HTMLTextAreaElement).value })} />
    </div>
  );
}

export function BrandsPanel() {
  useTick();
  const lib = library.value;
  const [, force] = useState(0);
  if (!lib.root) {
    return (
      <div class="empty" style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
        <div>Brands live in your Assets folder. Choose one to manage brand kits: colors, fonts, logos and guidelines.</div>
        <button class="btn primary" onClick={() => run(chooseLibraryFolder())}><FolderOpen size={14} /> Choose Assets Folder…</button>
      </div>
    );
  }
  const current = brandByName(editing.value) ?? brandByName(activeBrand.value) ?? lib.brands[0];
  return (
    <div class="assets">
      <div class="brand-list">
        {lib.brands.map((b) => (
          <button class={`brand-card${current?.name === b.name ? ' on' : ''}`} onClick={() => { editing.value = b.name; force((n) => n + 1); }}>
            <div class="row" style={{ gap: 6 }}>
              <b>{b.name}</b>{activeBrand.value === b.name && <Star size={11} fill="currentColor" />}
            </div>
            <div class="brand-dots">{b.colors.slice(0, 8).map((c) => <i style={{ background: c.hex }} />)}</div>
            <small>{[b.fonts.heading?.family, b.fonts.body?.family].filter(Boolean).join(' / ') || 'No fonts yet'}</small>
          </button>
        ))}
        <button class="brand-card add" onClick={() => askText('New brand', 'Brand name', '', (v) => run(createBrand(v).then((b) => { editing.value = b.name; if (!activeBrand.value) setActiveBrand(b.name); }), `Created ${v}`))}>
          <Plus size={16} /> New brand
        </button>
      </div>
      {current ? <BrandEditor b={current} /> : <div class="empty">Create your first brand to store its logos, colors and fonts together.</div>}
    </div>
  );
}
