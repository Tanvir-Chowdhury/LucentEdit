import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { FolderOpen, RefreshCw, Plus, Upload, Save, Trash2, Pencil, Tag, Palette as PaletteIcon, FolderPlus, Unplug } from 'lucide-preact';
import { cur, fg, bg, toast, selectedLayers, useTick } from '../core/store';
import {
  library, librarySupported, chooseLibraryFolder, refreshLibrary, createCategory, renameCategory, deleteCategory,
  importIntoCategory, deleteAsset, renameAsset, setAssetInfo, placeAsset, saveLayersAsAsset, assetThumb, savePalette,
  deletePalette, disconnectLibrary, Asset,
} from '../core/library';
import { pickFiles } from '../core/io';
import { askConfirm, askText } from './dialogs';

// Assets panel: browse the user's asset folder by category, place assets, save layers as assets.

export const assetCategory = signal<string>('All');
const query = signal('');
export const ASSET_MIME = 'application/x-lucentedit-asset';

function Thumb({ a }: { a: Asset }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { let live = true; assetThumb(a).then((u) => live && setSrc(u)); return () => { live = false; }; }, [a.id, a.modified, a.size]);
  if (a.kind === 'font') return <div class="asset-font" style={{ fontFamily: `"${a.name}"` }}>Aa</div>;
  return src ? <img src={src} alt="" draggable={false} /> : <div class="asset-ext">{a.ext.toUpperCase()}</div>;
}

const run = (p: Promise<unknown>, ok?: string) => p.then(() => ok && toast(ok, 'success')).catch((e) => toast(String(e?.message ?? e), 'error'));

function AssetCard({ a }: { a: Asset }) {
  const place = () => run(placeAsset(a), `Placed ${a.name}`);
  return (
    <div
      class="asset" title={`${a.file}${a.tags.length ? ` · ${a.tags.join(', ')}` : ''}${a.description ? `\n${a.description}` : ''}\nClick or drag onto the canvas to place`}
      draggable onDragStart={(e) => { e.dataTransfer!.setData(ASSET_MIME, a.id); e.dataTransfer!.effectAllowed = 'copy'; }}
      onClick={() => (cur() ? place() : toast('Open a document first', 'error'))}
    >
      <div class="asset-thumb"><Thumb a={a} /></div>
      <div class="asset-name">{a.name}</div>
      <div class="asset-actions" onClick={(e) => e.stopPropagation()}>
        <button class="icon-btn" title="Rename" onClick={() => askText('Rename asset', 'Name', a.name, (v) => run(renameAsset(a, v)))}><Pencil size={12} /></button>
        <button class="icon-btn" title="Tags & description (AI agents search these)" onClick={() => askText('Tags', 'Comma-separated tags', a.tags.join(', '), (v) => run(setAssetInfo(a, { tags: v.split(',').map((t) => t.trim()).filter(Boolean) })))}><Tag size={12} /></button>
        <button class="icon-btn" title="Delete from disk" onClick={() => askConfirm(`Delete ${a.file}?`, 'The file is removed from your assets folder.', 'Delete', () => run(deleteAsset(a)))}><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

export function AssetsPanel() {
  useTick();
  const lib = library.value;
  if (!librarySupported()) return <div class="empty">The Assets library needs the desktop app (or a Chromium-based browser) to save files in a folder.</div>;
  if (!lib.root) {
    return (
      <div class="empty" style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
        <div>Keep your logos, icons, photos, textures, fonts and brand colors in one folder on your computer, organized by category. AI agents can use them through MCP.</div>
        <button class="btn primary" onClick={() => run(chooseLibraryFolder())}><FolderOpen size={14} /> Choose Assets Folder…</button>
        {lib.error && <div style={{ color: 'var(--danger)' }}>{lib.error}</div>}
      </div>
    );
  }
  const cat = lib.categories.includes(assetCategory.value) ? assetCategory.value : 'All';
  const q = query.value.trim().toLowerCase();
  const list = lib.assets.filter((a) => (cat === 'All' || a.category === cat) && (!q || a.name.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q))));
  const target = cat === 'All' ? lib.categories[0] : cat;
  const saveSelected = (format: 'png' | 'svg' | 'lucentedit') => {
    if (!cur()) return toast('Open a document first', 'error');
    if (!target) return toast('Create a category first', 'error');
    const def = selectedLayers()[0]?.name ?? cur()!.doc.name;
    askText(`Save to ${target} as ${format.toUpperCase()}`, 'Asset name', def, (name) => run(saveLayersAsAsset(target, name, format), `Saved ${name} to ${target}`));
  };
  return (
    <div class="assets">
      <div class="assets-bar">
        <span class="assets-root" title={lib.root}><FolderOpen size={13} /> {lib.root.split(/[\\/]/).filter(Boolean).pop()}</span>
        <button class="icon-btn" title="Refresh" onClick={() => run(refreshLibrary())}><RefreshCw size={13} /></button>
        <button class="icon-btn" title="Change folder" onClick={() => run(chooseLibraryFolder())}><FolderOpen size={13} /></button>
        <button class="icon-btn" title="Disconnect folder (files are kept)" onClick={disconnectLibrary}><Unplug size={13} /></button>
      </div>
      <div class="asset-cats">
        {['All', ...lib.categories].map((c) => (
          <button class={`chip${c === cat ? ' on' : ''}`} onClick={() => (assetCategory.value = c)}
            onDblClick={() => c !== 'All' && askText('Rename category', 'Name', c, (v) => run(renameCategory(c, v)))}
            onContextMenu={(e) => { e.preventDefault(); if (c !== 'All') askConfirm(`Delete category "${c}"?`, 'The folder and every file in it are deleted from disk.', 'Delete', () => run(deleteCategory(c))); }}
            title={c === 'All' ? 'All assets' : `${c} · double-click to rename · right-click to delete`}>
            {c} <span>{c === 'All' ? lib.assets.length : lib.assets.filter((a) => a.category === c).length}</span>
          </button>
        ))}
        <button class="chip" title="New category" onClick={() => askText('New category', 'Name', '', (v) => run(createCategory(v)))}><FolderPlus size={12} /></button>
      </div>
      <input class="text-in" placeholder="Search names and tags…" value={query.value} onInput={(e) => (query.value = (e.target as HTMLInputElement).value)} onKeyDown={(e) => e.stopPropagation()} style={{ margin: '6px 0' }} />
      <div class="asset-grid">
        {list.map((a) => <AssetCard a={a} key={a.id} />)}
        {!list.length && <div class="empty" style={{ gridColumn: '1 / -1' }}>{lib.loading ? 'Loading…' : q ? 'No matches' : `No assets in ${cat} yet. Import files or save layers here.`}</div>}
      </div>
      <div class="asset-foot">
        <button class="btn" title={`Copy files into ${target ?? 'a category'}`} disabled={!target} onClick={async () => { const files = await pickFiles(true); if (files.length) run(importIntoCategory(target!, files), `Imported ${files.length} file(s)`); }}><Upload size={13} /> Import</button>
        <button class="btn" title="Save the selected layers (or the whole document) as a PNG asset" onClick={() => saveSelected('png')}><Save size={13} /> PNG</button>
        <button class="btn" title="Save the selected layers as an editable SVG asset" onClick={() => saveSelected('svg')}>SVG</button>
        <button class="btn" title="Save the selected layers with all layers intact" onClick={() => saveSelected('lucentedit')}>Layers</button>
      </div>
      <div class="section-title" style={{ margin: '10px 0 6px' }}>Brand palettes
        <button class="icon-btn" title="Save foreground, background and the selected layers' colors as a palette" onClick={() => {
          const colors = [fg.value, bg.value, ...selectedLayers().flatMap((l) => ('fill' in l && typeof l.fill === 'string' ? [l.fill] : []))];
          askText('Save palette', 'Palette name', 'Brand', (name) => run(savePalette({ name, colors: [...new Set(colors)] })));
        }}><Plus size={13} /></button>
      </div>
      {lib.palettes.map((p) => (
        <div class="row" style={{ marginBottom: 4 }}>
          <PaletteIcon size={13} /><span style={{ minWidth: 60 }}>{p.name}</span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
            {p.colors.map((c) => <button title={`${c} · click: foreground, Alt-click: background`} style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid rgba(255,255,255,.15)', background: c, padding: 0 }} onClick={(e) => { if (e.altKey) bg.value = c; else fg.value = c; }} />)}
          </div>
          <button class="icon-btn" title="Delete palette" onClick={() => run(deletePalette(p.name))}><Trash2 size={12} /></button>
        </div>
      ))}
      {!lib.palettes.length && <div style={{ color: 'var(--muted)' }}>No palettes yet. Agents read these to stay on brand.</div>}
    </div>
  );
}

