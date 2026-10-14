import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { dialog, cur, commit, touch, activeLayer, mcpStatus, toast, fg, bg } from '../core/store';
import { filterById, defaultParams, applyFilter } from '../core/filters';
import { resizeImage, resizeCanvas, rasterize } from '../core/ops';
import { featherSelection } from '../core/selection';
import { exportBytes, saveAs, ExportFormat, isTauri } from '../core/io';
import { flatten } from '../core/render';
import type { RasterLayer } from '../core/types';
import { Icon } from './icons';
import { TOOLS } from '../tools';
import { NumField, Swatch } from './controls';
import { CurvesEditor } from './CurvesEditor';
import { COMMANDS, prettyKeys, newDocument, run, lastFilter } from './commands';

export const PRESETS = [
  { name: 'Instagram Post', w: 1080, h: 1080, icon: 'phone' },
  { name: 'Instagram Story', w: 1080, h: 1920, icon: 'phone' },
  { name: 'Full HD', w: 1920, h: 1080, icon: 'monitor' },
  { name: 'YouTube Thumbnail', w: 1280, h: 720, icon: 'film' },
  { name: 'Web Banner', w: 1440, h: 480, icon: 'ad' },
  { name: 'X / Twitter Header', w: 1500, h: 500, icon: 'ad' },
  { name: 'Presentation 16:9', w: 1920, h: 1080, icon: 'template' },
  { name: 'Logo', w: 1000, h: 1000, icon: 'gem' },
  { name: 'Icon', w: 512, h: 512, icon: 'gem' },
  { name: 'A4 (300 dpi)', w: 2480, h: 3508, icon: 'print' },
  { name: 'US Letter (300 dpi)', w: 2550, h: 3300, icon: 'print' },
  { name: 'Mobile App', w: 1170, h: 2532, icon: 'phone' },
];

function Dialog({ title, sub, children, foot, wide }: { title: string; sub?: string; children: any; foot?: any; wide?: boolean }) {
  const close = () => (dialog.value = null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, []);
  return (
    <div class="backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class={`dialog${wide ? ' wide' : ''}`} onKeyDown={(e) => e.stopPropagation()}>
        <div class="dialog-head"><div>{title}{sub && <span class="sub">{sub}</span>}</div><button class="icon-btn" onClick={close}><Icon name="x" /></button></div>
        <div class="dialog-body">{children}</div>
        {foot && <div class="dialog-foot">{foot}</div>}
      </div>
    </div>
  );
}

export function PresetCard({ p, on, onClick }: { p: { name: string; w: number; h: number; icon: string }; on?: boolean; onClick: () => void }) {
  const s = 36 / Math.max(p.w, p.h);
  return (
    <button class={`preset${on ? ' on' : ''}`} onClick={onClick}>
      <div style={{ height: 40, display: 'grid', placeItems: 'center' }}><div class="shape" style={{ width: p.w * s, height: p.h * s }} /></div>
      <span class="pname">{p.name}</span>
      <span class="psize">{p.w} × {p.h} px</span>
    </button>
  );
}

function NewDialog() {
  const [w, setW] = useState(1920), [h, setH] = useState(1080);
  const [name, setName] = useState('Untitled');
  const [bg, setBg] = useState<string | null>('#ffffff');
  const create = () => { dialog.value = null; newDocument(w, h, name, bg); };
  return (
    <Dialog title="New Document" sub="Pick a preset or set a custom size" wide foot={<><button class="btn ghost" onClick={() => (dialog.value = null)}>Cancel</button><button class="btn primary" onClick={create}>Create</button></>}>
      <div class="presets">{PRESETS.map((p) => <PresetCard p={p} on={p.w === w && p.h === h} onClick={() => { setW(p.w); setH(p.h); setName(p.name); }} />)}</div>
      <div class="kv" style={{ marginTop: 16 }}>
        <label>Name</label><input class="text-in" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
        <label>Size</label>
        <div class="row">
          <NumField label="W" value={w} min={1} max={20000} unit="px" onChange={setW} />
          <button class="icon-btn" title="Swap orientation" onClick={() => { setW(h); setH(w); }}><Icon name="swap" size={14} /></button>
          <NumField label="H" value={h} min={1} max={20000} unit="px" onChange={setH} />
        </div>
        <label>Background</label>
        <div class="row">
          {['#ffffff', '#000000', '#0f0f17'].map((c) => <button class={`btn${bg === c ? ' primary' : ''}`} onClick={() => setBg(c)}>{c === '#ffffff' ? 'White' : c === '#000000' ? 'Black' : 'Dark'}</button>)}
          <button class={`btn${bg === null ? ' primary' : ''}`} onClick={() => setBg(null)}>Transparent</button>
          <Swatch value={bg} onChange={setBg} />
        </div>
      </div>
    </Dialog>
  );
}

function ExportDialog() {
  const ds = cur()!;
  const [fmt, setFmt] = useState<ExportFormat>('png');
  const [q, setQ] = useState(92);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => flatten(ds.doc, Math.min(1, 480 / Math.max(ds.doc.width, ds.doc.height))).toDataURL(), []);
  const go = async () => {
    setBusy(true);
    try {
      const bytes = await exportBytes(ds.doc, fmt, { quality: q / 100, scale });
      const p = await saveAs(bytes, `${ds.doc.name}.${fmt}`, fmt);
      if (p !== null) { toast(`Exported ${fmt.toUpperCase()} (${(bytes.length / 1024).toFixed(0)} KB)`, 'success'); dialog.value = null; }
    } catch (e: any) { toast(`Export failed: ${e.message ?? e}`, 'error'); }
    setBusy(false);
  };
  const raster = fmt === 'png' || fmt === 'jpg' || fmt === 'webp';
  return (
    <Dialog title="Export As" sub={`${ds.doc.name} · ${ds.doc.width} × ${ds.doc.height}`} wide foot={<><button class="btn ghost" onClick={() => (dialog.value = null)}>Cancel</button><button class="btn primary" disabled={busy} onClick={go}><Icon name="download" size={14} /> {busy ? 'Exporting…' : 'Export'}</button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 280, borderRadius: 10, background: 'repeating-conic-gradient(#2a2a38 0 25%, #1f1f2a 0 50%) 0 0/16px 16px' }}>
          <img src={preview} style={{ maxWidth: '100%', maxHeight: 320, boxShadow: '0 10px 30px rgba(0,0,0,.5)' }} />
        </div>
        <div class="kv" style={{ alignContent: 'start' }}>
          <label>Format</label>
          <select value={fmt} onChange={(e) => setFmt((e.target as HTMLSelectElement).value as ExportFormat)}>
            <option value="png">PNG (lossless, transparency)</option>
            <option value="jpg">JPG (photos, small)</option>
            <option value="webp">WebP (web, small)</option>
            <option value="svg">SVG (vector)</option>
            <option value="psd">PSD (Photoshop, layered)</option>
            <option value="lucentedit">LucentEdit document</option>
          </select>
          {raster && <><label>Scale</label><select value={String(scale)} onChange={(e) => setScale(+(e.target as HTMLSelectElement).value)}>{[0.25, 0.5, 1, 2, 3, 4].map((s) => <option value={s}>{s}× · {Math.round(ds.doc.width * s)} × {Math.round(ds.doc.height * s)}</option>)}</select></>}
          {(fmt === 'jpg' || fmt === 'webp') && <><label>Quality</label><div class="row"><input type="range" min={10} max={100} value={q} onInput={(e) => setQ(+(e.target as HTMLInputElement).value)} /><b>{q}</b></div></>}
          <label />
          <div style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
            {fmt === 'svg' && 'Shapes, paths and text stay editable vectors. Pixel layers are embedded as images.'}
            {fmt === 'psd' && 'Opens in Photoshop with your layers, names, opacity and blend modes.'}
            {fmt === 'png' && 'Best for UI, graphics and anything with transparency.'}
            {fmt === 'jpg' && 'Transparent areas become white.'}
            {fmt === 'webp' && 'Modern web format with transparency and small files.'}
            {fmt === 'lucentedit' && 'Full editable document for reopening in LucentEdit.'}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function FilterDialog({ id }: { id: string }) {
  const f = filterById(id)!;
  const ds = cur()!;
  const layer = activeLayer(ds)!;
  // Color params named fg/bg (Clouds, Fibers) start from the current foreground/background colors.
  const [params, setParams] = useState<Record<string, any>>(() => {
    const d = defaultParams(f);
    if ('fg' in d) d.fg = fg.value;
    if ('bg' in d) d.bg = bg.value;
    return d;
  });
  const [previewOn, setPreviewOn] = useState(true);
  const orig = useRef<{ layer: RasterLayer; canvas: HTMLCanvasElement } | null>(null);
  const timer = useRef(0);

  // Live preview: always filter from the untouched original pixels.
  const preview = (p: Record<string, any>, on = previewOn) => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (!orig.current) {
        const r = layer.type === 'raster' ? layer : rasterize(layer, ds);
        if (!r) { dialog.value = null; return; }
        orig.current = { layer: r, canvas: r.canvas };
      }
      if (on) applyFilter(ds, orig.current.layer, f, p, orig.current.canvas);
      else orig.current.layer.canvas = orig.current.canvas;
      touch(false);
    }, 30);
  };
  useEffect(() => { preview(params); }, []);
  const set = (k: string, v: number | string | boolean) => { const n = { ...params, [k]: v }; setParams(n); preview(n); };

  const cancel = () => {
    clearTimeout(timer.current);
    // Restore from the last history snapshot (handles auto-rasterized layers too).
    import('../core/store').then(({ jumpTo }) => jumpTo(ds.hIndex, ds));
    dialog.value = null;
  };
  const ok = () => {
    clearTimeout(timer.current);
    if (orig.current) applyFilter(ds, orig.current.layer, f, params, orig.current.canvas);
    Object.assign(lastFilter, { id: f.id, params });
    commit(f.name, ds);
    dialog.value = null;
  };
  return (
    <div class="backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) cancel(); }}>
      <div class="dialog" onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') ok(); if (e.key === 'Escape') cancel(); }}>
        <div class="dialog-head"><div>{f.name}<span class="sub">{layer.name}{ds.mask ? ' · inside selection' : ''}</span></div><button class="icon-btn" onClick={cancel}><Icon name="x" /></button></div>
        <div class="dialog-body">
          {f.custom === 'curves' ? <CurvesEditor params={params} onChange={set} /> : f.params.map((p) => (
            <div class="slider-row">
              <label>{p.label}</label>
              {p.type === 'select' ? <select style={{ gridColumn: 'span 2' }} value={String(params[p.key])} onChange={(e) => set(p.key, (e.target as HTMLSelectElement).value)}>{p.options?.map((o) => <option value={o}>{o}</option>)}</select>
                : p.type === 'checkbox' ? <input type="checkbox" style={{ justifySelf: 'start' }} checked={!!params[p.key]} onChange={(e) => set(p.key, (e.target as HTMLInputElement).checked)} />
                : p.type === 'color' ? <Swatch value={String(params[p.key])} onChange={(c) => set(p.key, c)} />
                : <>
                  <input type="range" min={p.min} max={p.max} step={p.step ?? 1} value={+params[p.key]} onInput={(e) => set(p.key, +(e.target as HTMLInputElement).value)} />
                  <NumField value={+params[p.key]} min={p.min} max={p.max} step={p.step ?? 1} unit={p.unit} onChange={(v) => set(p.key, v)} />
                </>}
            </div>
          ))}
        </div>
        <div class="dialog-foot">
          <label class="opt" style={{ marginRight: 'auto' }}><input type="checkbox" checked={previewOn} onChange={(e) => { const on = (e.target as HTMLInputElement).checked; setPreviewOn(on); preview(params, on); }} /> Preview</label>
          <button class="btn ghost" onClick={() => { const d = defaultParams(f); setParams(d); preview(d); }}>Reset</button>
          <button class="btn ghost" onClick={cancel}>Cancel</button>
          <button class="btn primary" onClick={ok}>Apply</button>
        </div>
      </div>
    </div>
  );
}

function SizeDialog({ kind }: { kind: 'imageSize' | 'canvasSize' }) {
  const ds = cur()!;
  const [w, setW] = useState(ds.doc.width), [h, setH] = useState(ds.doc.height);
  const [lock, setLock] = useState(kind === 'imageSize');
  const [anchor, setAnchor] = useState<[number, number]>([0.5, 0.5]);
  const ratio = ds.doc.width / ds.doc.height;
  const ok = () => { dialog.value = null; kind === 'imageSize' ? resizeImage(w, h, ds) : resizeCanvas(w, h, anchor, ds); };
  return (
    <Dialog title={kind === 'imageSize' ? 'Image Size' : 'Canvas Size'} sub={kind === 'imageSize' ? 'Scales every layer' : 'Adds or removes space around the artwork'} foot={<><button class="btn ghost" onClick={() => (dialog.value = null)}>Cancel</button><button class="btn primary" onClick={ok}>OK</button></>}>
      <div class="kv">
        <label>Width</label><NumField value={w} min={1} max={20000} unit="px" onChange={(v) => { setW(Math.round(v)); if (lock) setH(Math.round(v / ratio)); }} />
        <label>Height</label><NumField value={h} min={1} max={20000} unit="px" onChange={(v) => { setH(Math.round(v)); if (lock) setW(Math.round(v * ratio)); }} />
        <label>Constrain</label><label class="opt"><input type="checkbox" checked={lock} onChange={(e) => setLock((e.target as HTMLInputElement).checked)} /> Keep proportions</label>
        <label>Percent</label>
        <div class="row">{[25, 50, 200].map((p) => <button class="btn" onClick={() => { setW(Math.round(ds.doc.width * p / 100)); setH(Math.round(ds.doc.height * p / 100)); }}>{p}%</button>)}</div>
        {kind === 'canvasSize' && (
          <>
            <label>Anchor</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 26px)', gap: 3 }}>
              {[0, 0.5, 1].flatMap((ay) => [0, 0.5, 1].map((ax) => (
                <button class={`btn${anchor[0] === ax && anchor[1] === ay ? ' primary' : ''}`} style={{ width: 26, height: 26, padding: 0 }} onClick={() => setAnchor([ax, ay])}>•</button>
              )))}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

function FeatherDialog() {
  const [r, setR] = useState(10);
  const ok = () => { const ds = cur(); if (ds) featherSelection(ds, r); dialog.value = null; };
  return (
    <Dialog title="Feather Selection" foot={<><button class="btn ghost" onClick={() => (dialog.value = null)}>Cancel</button><button class="btn primary" onClick={ok}>OK</button></>}>
      <div class="kv"><label>Radius</label><NumField value={r} min={1} max={250} unit="px" onChange={setR} /></div>
    </Dialog>
  );
}

function Code({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div class="code">
      {text}
      <button class="icon-btn copy" title="Copy" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1200); }).catch(() => {}); }}>
        <Icon name={ok ? 'check' : 'copy'} size={13} />
      </button>
    </div>
  );
}

function McpDialog() {
  const st = mcpStatus.value;
  const port = st.port || 47800;
  const url = `http://127.0.0.1:${port}/mcp`;
  return (
    <Dialog title="Connect AI Agents (MCP)" sub="Let Claude Code, Cursor, Codex, VS Code and other agents design with LucentEdit" wide foot={<button class="btn primary" onClick={() => (dialog.value = null)}>Done</button>}>
      <div class="row" style={{ marginBottom: 12 }}>
        <span class={`dot${st.enabled ? ' on' : ''}`} />
        {st.enabled
          ? <span>MCP server is running at <b>{url}</b>. Keep LucentEdit open while your agent works.</span>
          : <span>{isTauri ? 'MCP server is starting…' : 'The MCP server runs in the LucentEdit desktop app. Install it to connect agents.'}</span>}
      </div>
      <b>Claude Code</b>
      <Code text={`claude mcp add --transport http lucentedit ${url}`} />
      <b>Cursor / Windsurf / VS Code (mcp.json)</b>
      <Code text={JSON.stringify({ mcpServers: { lucentedit: { url } } }, null, 2)} />
      <b>Codex CLI, Claude Desktop & other stdio clients</b>
      <Code text={JSON.stringify({ mcpServers: { lucentedit: { command: 'npx', args: ['-y', 'lucentedit-mcp'], env: { LUCENTEDIT_MCP_URL: url } } } }, null, 2)} />
      <div style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
        Try asking your agent: <i>“Using LucentEdit, design a 1080×1080 Instagram post announcing our summer sale with a gradient background, bold headline and a call-to-action button, then export it as PNG.”</i>
        The agent can see its work through the <code>render_preview</code> tool and every action is undoable here with <kbd>Ctrl</kbd>+<kbd>Z</kbd>.
      </div>
    </Dialog>
  );
}

function ShortcutsDialog() {
  // Every registered tool with its Photoshop letter (Shift+letter cycles the group).
  const tools: [string, string][] = [...TOOLS.filter((t) => t.key).map((t): [string, string] => [t.label, t.key]), ['Brush size / hardness', '[ ] { }'], ['Opacity / flow', '1…0 / Shift+1…0'], ['Nudge (Shift ×10)', 'Arrows']];
  const cmds = COMMANDS.filter((c) => c.keys && !c.id.startsWith('redo2'));
  return (
    <Dialog title="Keyboard Shortcuts" sub="Photoshop-compatible. On macOS, Ctrl is ⌘." wide>
      <h4 style={{ margin: '4px 0 8px', color: 'var(--muted)' }}>Tools</h4>
      <div class="shortcut-grid">{tools.map(([n, k]) => <div><span>{n}</span><kbd>{k}</kbd></div>)}</div>
      <h4 style={{ margin: '16px 0 8px', color: 'var(--muted)' }}>Commands</h4>
      <div class="shortcut-grid">{cmds.map((c) => <div><span>{c.label.replace(/^(Adjust|Filter): /, '')}</span><kbd>{prettyKeys(c.keys)}</kbd></div>)}</div>
    </Dialog>
  );
}

function AboutDialog() {
  return (
    <Dialog title="About LucentEdit" foot={<button class="btn primary" onClick={() => (dialog.value = null)}>Close</button>}>
      <div class="hero" style={{ marginBottom: 12 }}>
        <img src="/logo.svg" style={{ width: 56, height: 56, borderRadius: 14 }} />
        <div><h1 style={{ fontSize: 22 }}><span>LucentEdit</span> 0.5.0</h1><p>Free, open-source image editor and vector design tool with a built-in MCP server.</p></div>
      </div>
      <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>No accounts, no subscriptions, no telemetry. Your files stay on your computer. Licensed under MIT.</p>
    </Dialog>
  );
}

function Palette() {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const list = COMMANDS.filter((c) => c.id !== 'redo2' && c.label.toLowerCase().includes(q.toLowerCase()) && (!c.enabled || c.enabled())).slice(0, 60);
  const go = (c = list[i]) => { if (!c) return; dialog.value = null; setTimeout(() => c.run(), 0); };
  return (
    <div class="backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) dialog.value = null; }}>
      <div class="palette" onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(list.length - 1, i + 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, i - 1)); }
        if (e.key === 'Enter') go();
        if (e.key === 'Escape') dialog.value = null;
      }}>
        <input autoFocus placeholder="Search commands, filters, tools…" value={q} ref={(el) => { if (el) setTimeout(() => el.focus()); }} onInput={(e) => { setQ((e.target as HTMLInputElement).value); setI(0); }} />
        <div class="list">
          {list.map((c, k) => (
            <button class={`menu-item${k === i ? ' hl' : ''}`} onMouseEnter={() => setI(k)} onClick={() => go(c)}>
              {c.label}<span class="kbd">{prettyKeys(c.keys)}</span>
            </button>
          ))}
          {!list.length && <div class="empty">No matching command</div>}
        </div>
      </div>
    </div>
  );
}

/** In-app replacements for window.confirm / window.prompt (unreliable in some webviews). */
export function askConfirm(title: string, message: string, okLabel: string, onOk: () => void) {
  dialog.value = { kind: 'confirm', data: { title, message, okLabel, onOk } };
}
export function askText(title: string, label: string, value: string, onOk: (v: string) => void) {
  dialog.value = { kind: 'text', data: { title, label, value, onOk } };
}

function ConfirmDialog({ d }: { d: any }) {
  const ok = () => { dialog.value = null; d.onOk(); };
  return (
    <Dialog title={d.title} foot={<><button class="btn ghost" onClick={() => (dialog.value = null)}>Cancel</button><button class="btn primary" onClick={ok}>{d.okLabel}</button></>}>
      <p style={{ margin: 0, color: 'var(--text-2)' }}>{d.message}</p>
    </Dialog>
  );
}

function TextDialog({ d }: { d: any }) {
  const [v, setV] = useState(d.value ?? '');
  const ok = () => { dialog.value = null; if (v.trim()) d.onOk(v.trim()); };
  return (
    <Dialog title={d.title} foot={<><button class="btn ghost" onClick={() => (dialog.value = null)}>Cancel</button><button class="btn primary" onClick={ok}>OK</button></>}>
      <div class="kv"><label>{d.label}</label><input class="text-in" value={v} ref={(el) => { if (el) setTimeout(() => el.focus()); }} onInput={(e) => setV((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && ok()} /></div>
    </Dialog>
  );
}

export function Dialogs() {
  const d = dialog.value;
  if (!d) return null;
  switch (d.kind) {
    case 'new': return <NewDialog />;
    case 'export': return cur() ? <ExportDialog /> : null;
    case 'filter': return cur() && activeLayer() ? <FilterDialog id={d.data.id} /> : null;
    case 'imageSize': case 'canvasSize': return cur() ? <SizeDialog kind={d.kind} /> : null;
    case 'feather': return <FeatherDialog />;
    case 'mcp': return <McpDialog />;
    case 'shortcuts': return <ShortcutsDialog />;
    case 'about': return <AboutDialog />;
    case 'palette': return <Palette />;
    case 'confirm': return <ConfirmDialog d={d.data} />;
    case 'text': return <TextDialog d={d.data} />;
  }
  return null;
}

export { run };
