import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { Layer, ShapeLayer, TextLayer, DocState, Effects, BlendMode, AdjustLayer } from '../core/types';
import { filterById } from '../core/filters';
import { CurvesEditor } from './CurvesEditor';
import { selectLayerPixels } from '../core/selection';
import { ui } from './psCommands';
import { NavigatorPanel, InfoPanel, HistogramPanel, SwatchesPanel } from './infoPanels';
import { historySource } from '../tools/retouch';
import { ActionsPanel } from './ActionsPanel';
import { AssetsPanel } from './AssetsPanel';
import { BrandsPanel } from './BrandsPanel';
import { BLEND_MODES } from '../core/types';
import { tick, cur, commit, touch, select, selectedLayers, jumpTo, maskTarget } from '../core/store';
import { useTick, usePaint } from '../core/store';
import { setProps, moveInto, scaleLayer, editSmartContents } from '../core/ops';
import { thumbnail } from '../core/render';
import { walk, findLayer, containerOf, refreshGroups } from '../core/util';
import { Icon } from './icons';
import { NumField, PaintEditor, Swatch, Seg } from './controls';
import { FontSelect } from './chrome';
import { run } from './commands';

const BLEND_LABEL = (b: string) => b.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

const TOP_TABS: [string, string][] = [['properties', 'Properties'], ['navigator', 'Navigator'], ['info', 'Info'], ['histogram', 'Histogram']];
const BOTTOM_TABS: [string, string][] = [['layers', 'Layers'], ['assets', 'Assets'], ['brands', 'Brands'], ['history', 'History'], ['actions', 'Actions'], ['swatches', 'Swatches']];

export function Panels() {
  useTick();
  const u = ui.value;
  const tabs = (list: [string, string][], key: 'topTab' | 'bottomTab') => (
    <div class="panel-tabs">
      {list.map(([id, label]) => <button class={`panel-tab${u[key] === id ? ' on' : ''}`} onClick={() => (ui.value = { ...ui.value, [key]: id })}>{label}</button>)}
    </div>
  );
  return (
    <div class="panels">
      <div class="panel" style={{ flex: '1 1 46%', minHeight: 180 }}>
        <div class="panel-head">{tabs(TOP_TABS, 'topTab')}</div>
        <div class="panel-body" style={{ flex: 1, padding: u.topTab === 'properties' ? undefined : 0 }}>
          {u.topTab === 'navigator' ? <NavigatorPanel /> : u.topTab === 'info' ? <InfoPanel /> : u.topTab === 'histogram' ? <HistogramPanel /> : <Properties />}
        </div>
      </div>
      <div class="panel grow" style={{ flex: '1 1 54%', minHeight: 220 }}>
        <div class="panel-head">{tabs(BOTTOM_TABS, 'bottomTab')}</div>
        {u.bottomTab === 'history' ? <HistoryPanel /> : u.bottomTab === 'swatches' ? <SwatchesPanel /> : u.bottomTab === 'actions' ? <ActionsPanel /> : u.bottomTab === 'assets' ? <div class="layers"><AssetsPanel /></div> : u.bottomTab === 'brands' ? <div class="layers"><BrandsPanel /></div> : <LayersPanel />}
      </div>
    </div>
  );
}

// Properties

function Section({ title, children, right }: { title: string; children: any; right?: any }) {
  return (
    <div class="section">
      <div class="section-title">{title}{right}</div>
      {children}
    </div>
  );
}

const live = () => touch();
const done = (label: string) => () => commit(label);

function Properties() {
  const ds = cur();
  if (!ds) return <div class="empty">Open or create a document to start designing.</div>;
  const sel = selectedLayers(ds);
  if (!sel.length) return <DocProps ds={ds} />;
  if (sel.length > 1) {
    return (
      <>
        <Section title={`${sel.length} layers`}>
          <div class="row" style={{ flexWrap: 'wrap', gap: 2 }}>
            {[['alignL', 'alignLeft'], ['alignHC', 'alignHCenter'], ['alignR', 'alignRight'], ['alignT', 'alignTop'], ['alignVC', 'alignVCenter'], ['alignB', 'alignBottom'], ['distH', 'distH'], ['distV', 'distV']].map(([id, icon]) => (
              <button class="icon-btn" title={id} onClick={() => run(id)}><Icon name={icon} size={15} /></button>
            ))}
          </div>
          <div class="row"><button class="btn grow" onClick={() => run('group')}><Icon name="group" size={14} /> Group</button><button class="btn grow" onClick={() => run('mergeDown')}><Icon name="merge" size={14} /> Merge</button></div>
        </Section>
        <Appearance layers={sel} />
      </>
    );
  }
  const l = sel[0];
  return (
    <>
      <Transform l={l} />
      <Appearance layers={[l]} />
      {l.type === 'shape' && <ShapeProps l={l} />}
      {l.type === 'text' && <TextProps l={l} />}
      {l.type === 'raster' && (
        <Section title="Image">
          <div class="row" style={{ color: 'var(--muted)' }}>{l.canvas.width} × {l.canvas.height} px source</div>
          <div class="row">
            <button class="btn grow" onClick={() => run('filter:hue-saturation')}>Adjust…</button>
            <button class="btn grow" onClick={() => run('filter:gaussian-blur')}>Blur…</button>
          </div>
          <div class="row">
            <button class="btn grow" onClick={() => { l.w = l.canvas.width; l.h = l.canvas.height; commit('Reset Size'); }}>Original size</button>
          </div>
        </Section>
      )}
      {l.type === 'adjust' && <AdjustProps l={l} />}
      {l.type !== 'group' && l.type !== 'adjust' && <EffectsProps l={l} />}
    </>
  );
}

/** Live controls for an adjustment layer (same parameters as the destructive filter). */
function AdjustProps({ l }: { l: AdjustLayer }) {
  const f = filterById(l.filter);
  if (!f) return <div class="empty">Unknown adjustment "{l.filter}"</div>;
  const set = (k: string, v: any) => { l.params = { ...l.params, [k]: v }; touch(); };
  const curves = (f as any).custom === 'curves';
  return (
    <Section title={f.name}>
      {curves && <CurvesEditor params={l.params} onChange={(k, v) => { set(k, v); commitSoon(f.name); }} />}
      {f.params.map((p: any) => (
        <div class="row" style={{ marginBottom: 6 }}>
          <span class="lbl">{p.label}</span>
          {p.type === 'select' ? (
            <select class="grow" value={String(l.params[p.key])} onChange={(e) => { set(p.key, (e.target as HTMLSelectElement).value); commit(f.name); }}>
              {(p.options ?? []).map((o: any) => <option value={String(o.value ?? o)}>{o.label ?? o}</option>)}
            </select>
          ) : p.type === 'checkbox' ? (
            <input type="checkbox" checked={!!l.params[p.key]} onChange={(e) => { set(p.key, (e.target as HTMLInputElement).checked); commit(f.name); }} />
          ) : p.type === 'color' ? (
            <Swatch value={String(l.params[p.key])} onChange={(c) => set(p.key, c)} onDone={done(f.name)} />
          ) : (
            <>
              <input type="range" class="grow" min={p.min} max={p.max} step={p.step ?? 1} value={l.params[p.key]} style={{ width: '100%' }} onInput={(e) => set(p.key, +(e.target as HTMLInputElement).value)} onChange={done(f.name)} />
              <NumField value={l.params[p.key]} min={p.min} max={p.max} step={p.step ?? 1} width={64} onChange={(v) => set(p.key, v)} onCommit={done(f.name)} />
            </>
          )}
        </div>
      ))}
      {!f.params.length && !curves && <div style={{ color: 'var(--muted)' }}>No settings. Lower the opacity or paint on a mask to limit it.</div>}
    </Section>
  );
}

/** Commit after edits settle (the Curves editor reports every drag step). */
let commitTimer = 0;
function commitSoon(label: string) {
  clearTimeout(commitTimer);
  commitTimer = window.setTimeout(() => commit(label), 400);
}

function DocProps({ ds }: { ds: DocState }) {
  const d = ds.doc;
  return (
    <>
      <Section title="Document">
        <div class="row"><input class="text-in" value={d.name} onChange={(e) => { d.name = (e.target as HTMLInputElement).value || d.name; commit('Rename Document'); }} onKeyDown={(e) => e.stopPropagation()} /></div>
        <div class="grid2" style={{ marginTop: 6 }}>
          <NumField label="W" value={d.width} unit="px" min={1} max={20000} onChange={(v) => { d.width = Math.round(v); live(); }} onCommit={done('Canvas Size')} />
          <NumField label="H" value={d.height} unit="px" min={1} max={20000} onChange={(v) => { d.height = Math.round(v); live(); }} onCommit={done('Canvas Size')} />
        </div>
        <div class="row" style={{ marginTop: 8 }}>
          <span class="lbl">Background</span>
          <Swatch value={d.background} onChange={(c) => { d.background = c; live(); }} onDone={done('Background')} />
          <label class="opt"><input type="checkbox" checked={!d.background} onChange={(e) => { d.background = (e.target as HTMLInputElement).checked ? null : '#ffffff'; commit('Background'); }} /> Transparent</label>
        </div>
        <div class="row" style={{ marginTop: 8 }}>
          <button class="btn grow" onClick={() => run('imageSize')}>Image Size…</button>
          <button class="btn grow" onClick={() => run('canvasSize')}>Canvas Size…</button>
        </div>
      </Section>
      <div class="empty">Select a layer to edit its properties.<br />Tip: press <kbd>Ctrl</kbd>+<kbd>F</kbd> to search every command.</div>
    </>
  );
}

function Transform({ l }: { l: Layer }) {
  const [lock, setLock] = useState(false);
  const group = l.type === 'group';
  const setSize = (key: 'w' | 'h', v: number) => {
    v = Math.max(1, v);
    if (group) {
      const s = v / l[key];
      scaleLayer(l, key === 'w' || lock ? s : 1, key === 'h' || lock ? s : 1, l.x, l.y);
      refreshGroups([l]);
    } else {
      const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
      const ratio = l.w / l.h;
      if (key === 'w') { l.w = v; if (lock) l.h = v / ratio; } else { l.h = v; if (lock) l.w = v * ratio; }
      if (l.type === 'text') { (l as TextLayer).autoWidth = false; }
      l.x = cx - l.w / 2; l.y = cy - l.h / 2;
    }
    live();
  };
  return (
    <Section title={l.name} right={<span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{l.type === 'raster' ? 'Pixel layer' : l.type === 'shape' ? (l as ShapeLayer).shape === 'path' ? 'Vector path' : 'Shape' : l.type === 'text' ? 'Text' : l.type === 'adjust' ? 'Adjustment' : l.type === 'smart' ? 'Smart Object' : 'Group'}</span>}>
      <div class="grid2">
        <NumField label="X" value={l.x} onChange={(v) => { setProps(l, { x: v }); live(); }} onCommit={done('Move')} />
        <NumField label="Y" value={l.y} onChange={(v) => { setProps(l, { y: v }); live(); }} onCommit={done('Move')} />
        <NumField label="W" value={l.w} min={1} onChange={(v) => setSize('w', v)} onCommit={done('Resize')} />
        <div class="row" style={{ gap: 4 }}>
          <NumField label="H" value={l.h} min={1} onChange={(v) => setSize('h', v)} onCommit={done('Resize')} />
          <button class={`icon-btn${lock ? ' on' : ''}`} title="Constrain proportions" onClick={() => setLock(!lock)}><Icon name="link" size={13} /></button>
        </div>
        {!group && <NumField label="↻" value={l.rotation} unit="°" onChange={(v) => { l.rotation = ((v % 360) + 360) % 360; live(); }} onCommit={done('Rotate')} />}
        {l.type === 'shape' && l.shape === 'rect' && <NumField label="R" title="Corner radius" value={l.radius ?? 0} min={0} onChange={(v) => { l.radius = v; live(); }} onCommit={done('Corner Radius')} />}
        {l.type === 'shape' && (l.shape === 'polygon' || l.shape === 'star') && <NumField label="#" title={l.shape === 'star' ? 'Points' : 'Sides'} value={l.sides ?? 5} min={3} max={64} onChange={(v) => { l.sides = Math.round(v); live(); }} onCommit={done('Sides')} />}
      </div>
    </Section>
  );
}

function Appearance({ layers }: { layers: Layer[] }) {
  const l = layers[0];
  return (
    <Section title="Appearance">
      <div class="row">
        <select class="grow" value={l.blend} onChange={(e) => { layers.forEach((x) => (x.blend = (e.target as HTMLSelectElement).value as BlendMode)); commit('Blend Mode'); }}>
          {BLEND_MODES.map((b) => <option value={b}>{BLEND_LABEL(b)}</option>)}
        </select>
        <NumField label="◐" title="Opacity" value={Math.round(l.opacity * 100)} min={0} max={100} unit="%" width={84} onChange={(v) => { layers.forEach((x) => (x.opacity = v / 100)); live(); }} onCommit={done('Opacity')} />
      </div>
      <div class="row">
        <input type="range" class="grow" min={0} max={100} value={Math.round(l.opacity * 100)} style={{ width: '100%' }} onInput={(e) => { layers.forEach((x) => (x.opacity = +(e.target as HTMLInputElement).value / 100)); live(); }} onChange={done('Opacity')} />
      </div>
    </Section>
  );
}

function StrokeEditor({ l }: { l: ShapeLayer | TextLayer }) {
  const s = l.stroke;
  return (
    <Section title="Stroke">
      <PaintEditor value={s?.paint ?? null} onChange={(p) => { l.stroke = p ? { ...(s ?? { width: 2, join: 'round', cap: 'round' }), paint: p } : null; live(); }} onCommit={done('Stroke')} />
      {s && (
        <>
          <div class="grid2" style={{ marginTop: 8 }}>
            <NumField label="W" value={s.width} min={0} unit="px" onChange={(v) => { s.width = v; live(); }} onCommit={done('Stroke Width')} />
            <select value={s.dash?.length ? 'dash' : s.cap === 'round' && false ? 'dot' : 'solid'} onChange={(e) => { const v = (e.target as HTMLSelectElement).value; s.dash = v === 'dash' ? [s.width * 3, s.width * 2] : v === 'dot' ? [0.1, s.width * 2] : []; if (v === 'dot') s.cap = 'round'; commit('Stroke Style'); }}>
              <option value="solid">Solid</option><option value="dash">Dashed</option><option value="dot">Dotted</option>
            </select>
          </div>
          <div class="row" style={{ marginTop: 6 }}>
            <span class="lbl">Join</span>
            <Seg value={s.join ?? 'miter'} onChange={(v) => { s.join = v as CanvasLineJoin; commit('Stroke Join'); }} options={[{ v: 'miter', label: 'Miter' }, { v: 'round', label: 'Round' }, { v: 'bevel', label: 'Bevel' }]} />
          </div>
          <div class="row">
            <span class="lbl">Cap</span>
            <Seg value={s.cap ?? 'butt'} onChange={(v) => { s.cap = v as CanvasLineCap; commit('Stroke Cap'); }} options={[{ v: 'butt', label: 'Butt' }, { v: 'round', label: 'Round' }, { v: 'square', label: 'Square' }]} />
          </div>
        </>
      )}
    </Section>
  );
}

function ShapeProps({ l }: { l: ShapeLayer }) {
  return (
    <>
      <Section title="Fill">
        <PaintEditor value={l.fill} onChange={(p) => { l.fill = p; live(); }} onCommit={done('Fill')} />
      </Section>
      <StrokeEditor l={l} />
      {l.shape === 'star' && (
        <Section title="Star">
          <NumField label="◌" title="Inner radius" value={Math.round((l.inner ?? 0.45) * 100)} min={5} max={100} unit="%" onChange={(v) => { l.inner = v / 100; live(); }} onCommit={done('Star')} />
        </Section>
      )}
    </>
  );
}

function TextProps({ l }: { l: TextLayer }) {
  const up = (p: Partial<TextLayer>) => { setProps(l, p); live(); };
  return (
    <>
      <Section title="Text">
        <textarea class="text-in" style={{ height: 64, padding: 8, resize: 'vertical' }} value={l.text}
          onInput={(e) => up({ text: (e.target as HTMLTextAreaElement).value })} onChange={done('Edit Text')} onKeyDown={(e) => e.stopPropagation()} />
        <div class="row" style={{ marginTop: 6 }}><FontSelect value={l.family} onChange={(v) => { up({ family: v }); commit('Font'); }} /></div>
        <div class="grid2" style={{ marginTop: 6 }}>
          <select value={String(l.weight)} onChange={(e) => { up({ weight: +(e.target as HTMLSelectElement).value }); commit('Font Weight'); }}>
            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => <option value={w}>{w}</option>)}
          </select>
          <NumField label="pt" value={l.size} min={1} max={2000} onChange={(v) => up({ size: v })} onCommit={done('Font Size')} />
          <NumField label="↕" title="Line height" value={l.lineHeight} step={0.05} min={0.5} max={5} onChange={(v) => up({ lineHeight: v })} onCommit={done('Line Height')} />
          <NumField label="↔" title="Letter spacing" value={l.letterSpacing} step={0.5} min={-50} max={200} unit="px" onChange={(v) => up({ letterSpacing: v })} onCommit={done('Tracking')} />
        </div>
        <div class="row" style={{ marginTop: 6 }}>
          <Seg value={l.align as any} onChange={(v) => { up({ align: v as CanvasTextAlign }); commit('Align Text'); }} options={[{ v: 'left', icon: 'textLeft' }, { v: 'center', icon: 'textCenter' }, { v: 'right', icon: 'textRight' }]} />
          <button class={`icon-btn${l.italic ? ' on' : ''}`} onClick={() => { up({ italic: !l.italic }); commit('Italic'); }}><Icon name="italic" size={15} /></button>
          <label class="opt" title="Auto width (point text) or fixed width that wraps (paragraph text)"><input type="checkbox" checked={l.autoWidth} onChange={(e) => { up({ autoWidth: (e.target as HTMLInputElement).checked }); commit('Text Box'); }} /> Auto width</label>
        </div>
      </Section>
      <Section title="Fill">
        <PaintEditor value={l.fill} allowNone={false} onChange={(p) => { if (p) l.fill = p; live(); }} onCommit={done('Text Color')} />
      </Section>
      <StrokeEditor l={l} />
    </>
  );
}

function EffectsProps({ l }: { l: Layer }) {
  const fx: Effects = l.effects ?? {};
  const set = (next: Effects) => { l.effects = next; live(); };
  const sh = fx.shadow, gl = fx.glow;
  return (
    <Section title="Effects">
      <div class="row">
        <label class="opt grow"><input type="checkbox" checked={!!sh?.enabled} onChange={(e) => { set({ ...fx, shadow: { color: 'rgba(0,0,0,0.45)', blur: 24, x: 0, y: 12, ...sh, enabled: (e.target as HTMLInputElement).checked } }); commit('Drop Shadow'); }} /> Drop shadow</label>
        {sh?.enabled && <Swatch value={sh.color} onChange={(c) => set({ ...fx, shadow: { ...sh, color: c } })} onDone={done('Shadow Color')} />}
      </div>
      {sh?.enabled && (
        <div class="grid3" style={{ margin: '6px 0 8px' }}>
          <NumField label="X" value={sh.x} onChange={(v) => set({ ...fx, shadow: { ...sh, x: v } })} onCommit={done('Shadow')} />
          <NumField label="Y" value={sh.y} onChange={(v) => set({ ...fx, shadow: { ...sh, y: v } })} onCommit={done('Shadow')} />
          <NumField label="B" title="Blur" value={sh.blur} min={0} onChange={(v) => set({ ...fx, shadow: { ...sh, blur: v } })} onCommit={done('Shadow')} />
        </div>
      )}
      <div class="row">
        <label class="opt grow"><input type="checkbox" checked={!!gl?.enabled} onChange={(e) => { set({ ...fx, glow: { color: '#ffffff', blur: 30, ...gl, enabled: (e.target as HTMLInputElement).checked } }); commit('Outer Glow'); }} /> Outer glow</label>
        {gl?.enabled && <Swatch value={gl.color} onChange={(c) => set({ ...fx, glow: { ...gl, color: c } })} onDone={done('Glow Color')} />}
      </div>
      {gl?.enabled && (
        <div class="grid2" style={{ marginTop: 6 }}>
          <NumField label="B" title="Size" value={gl.blur} min={0} onChange={(v) => set({ ...fx, glow: { ...gl, blur: v } })} onCommit={done('Glow')} />
        </div>
      )}
    </Section>
  );
}

// Layers

const thumbs = new Map<string, { key: string; c: HTMLCanvasElement }>();
function Thumb({ l, hIndex }: { l: Layer; hIndex: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = `${hIndex}:${l.w}:${l.h}`;
  useEffect(() => {
    let t = thumbs.get(l.id);
    if (!t || t.key !== key) { t = { key, c: thumbnail(l, 64) }; thumbs.set(l.id, t); }
    const el = ref.current!;
    el.innerHTML = '';
    t.c.style.width = '32px';
    t.c.style.height = '32px';
    el.appendChild(t.c);
  }, [l, key]);
  return <div class="thumb" ref={ref} />;
}

function MaskThumb({ l, hIndex }: { l: Layer; hIndex: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const m = l.mask, c = ref.current;
    if (!m || !c) return;
    const x = c.getContext('2d')!;
    const s = Math.min(64 / m.canvas.width, 64 / m.canvas.height);
    x.fillStyle = '#000'; x.fillRect(0, 0, 64, 64);
    // Show the mask as white-on-black like Photoshop.
    const tmp = document.createElement('canvas'); tmp.width = 64; tmp.height = 64;
    const t = tmp.getContext('2d')!;
    t.drawImage(m.canvas, (64 - m.canvas.width * s) / 2, (64 - m.canvas.height * s) / 2, m.canvas.width * s, m.canvas.height * s);
    t.globalCompositeOperation = 'source-in'; t.fillStyle = '#fff'; t.fillRect(0, 0, 64, 64);
    x.drawImage(tmp, 0, 0);
  }, [l.mask?.canvas, hIndex]);
  return <canvas ref={ref} width={64} height={64} style={{ width: 32, height: 32 }} />;
}

const renaming = signal<string | null>(null);
let dragId: string | null = null;

function LayerRow({ l, depth, ds, anchor }: { l: Layer; depth: number; ds: DocState; anchor: { id: string | null } }) {
  useTick();
  const [drop, setDrop] = useState<'above' | 'below' | 'into' | null>(null);
  const on = ds.selected.includes(l.id);
  const onClick = (e: MouseEvent) => {
    if (e.shiftKey && anchor.id) {
      const flat = [...walk(ds.doc.layers)].map(([x]) => x.id).reverse();
      const a = flat.indexOf(anchor.id), b = flat.indexOf(l.id);
      select(flat.slice(Math.min(a, b), Math.max(a, b) + 1));
    } else if (e.ctrlKey || e.metaKey) {
      select(on ? ds.selected.filter((i) => i !== l.id) : [...ds.selected, l.id]);
      anchor.id = l.id;
    } else { select([l.id]); anchor.id = l.id; }
  };
  const zone = (e: DragEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const f = (e.clientY - r.top) / r.height;
    return l.type === 'group' && f > 0.3 && f < 0.7 ? 'into' : f < 0.5 ? 'above' : 'below';
  };
  return (
    <>
      <div
        class={`layer${on ? ' on' : ''}${l.visible ? '' : ' hidden'}${drop ? ' drop-' + drop : ''}`}
        style={{ paddingLeft: 6 + depth * 16 }}
        draggable={renaming.value !== l.id}
        onDragStart={(e) => { dragId = l.id; e.dataTransfer!.effectAllowed = 'move'; e.dataTransfer!.setData('text/plain', l.id); }}
        onDragOver={(e) => { if (!dragId || dragId === l.id) return; e.preventDefault(); setDrop(zone(e)); }}
        onDragLeave={() => setDrop(null)}
        onDrop={(e) => {
          e.preventDefault();
          const z = zone(e);
          setDrop(null);
          if (!dragId || dragId === l.id) return;
          if (z === 'into') moveInto(dragId, l.id, (l as any).children.length, ds);
          else {
            const arr = containerOf(ds.doc, l.id)!;
            const parent = [...walk(ds.doc.layers)].find(([x]) => x.id === l.id)?.[1] ?? null;
            const i = arr.indexOf(l);
            moveInto(dragId, parent?.id ?? null, z === 'above' ? i + 1 : i, ds);
          }
          dragId = null;
          commit('Reorder Layers', ds);
        }}
        onClick={onClick}
        onDblClick={(e) => {
          // Double-clicking a Smart Object's thumbnail opens its contents, like Photoshop.
          if (l.type === 'smart' && (e.target as HTMLElement).closest('.thumb')) return editSmartContents(l, ds);
          renaming.value = l.id;
        }}
      >
        {l.type === 'group'
          ? <button class="twisty" onClick={(e) => { e.stopPropagation(); l.expanded = !l.expanded; touch(); }}><Icon name={l.expanded ? 'down' : 'right'} size={13} /></button>
          : <span style={{ width: 16, flex: 'none' }} />}
        <button class="icon-btn" style={{ width: 22 }} title="Toggle visibility" onClick={(e) => {
          e.stopPropagation();
          if (e.altKey) {
            // Alt-click: show only this layer (or show all again), like Photoshop.
            const others = [...walk(ds.doc.layers)].map(([x]) => x).filter((x) => x !== l && !(x.type === 'group' && [...walk(x.children)].some(([c]) => c === l)));
            const solo = others.some((x) => x.visible);
            others.forEach((x) => (x.visible = !solo));
            l.visible = true;
            commit(solo ? 'Show Only This Layer' : 'Show All Layers');
            return;
          }
          l.visible = !l.visible; commit(l.visible ? 'Show Layer' : 'Hide Layer');
        }}>
          <Icon name={l.visible ? 'eye' : 'eyeOff'} size={14} />
        </button>
        {l.clip && <span title="Clipped to the layer below" style={{ color: 'var(--accent)', marginLeft: -4, flex: 'none' }}>↳</span>}
        <div onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            selectLayerPixels(ds, l, e.shiftKey && e.altKey ? 'intersect' : e.shiftKey ? 'add' : e.altKey ? 'subtract' : 'replace');
            return;
          }
          maskTarget.value = null;
        }} title="Ctrl-click: load layer pixels as selection" class={l.mask && maskTarget.value !== l.id ? 'target' : ''} style={{ borderRadius: 6, flex: 'none' }}>
          {l.type === 'group' ? <div class="thumb icon"><Icon name={l.expanded ? 'folderOpen' : 'folder'} size={16} /></div>
            : l.type === 'adjust' ? <div class="thumb icon" title={l.name}><Icon name="sliders" size={16} /></div>
            : <Thumb l={l} hIndex={ds.hIndex} />}
        </div>
        {l.mask && (
          <div
            title={`Layer mask${l.mask.enabled ? '' : ' (disabled)'} · click to paint on it (black hides, white reveals) · Shift-click to toggle`}
            class={`thumb mask-thumb${maskTarget.value === l.id ? ' target' : ''}${l.mask.enabled ? '' : ' off'}`}
            onClick={(e) => { e.stopPropagation(); select([l.id]); if (e.shiftKey) { l.mask = { ...l.mask!, enabled: !l.mask!.enabled }; commit('Toggle Mask'); } else maskTarget.value = l.id; }}
          >
            <MaskThumb l={l} hIndex={ds.hIndex} />
          </div>
        )}
        <div class="lname">
          {renaming.value === l.id ? (
            <input
              value={l.name}
              ref={(el) => { if (el) setTimeout(() => { el.focus(); el.select(); }); }}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
              onBlur={(e) => { const v = (e.target as HTMLInputElement).value.trim(); renaming.value = null; if (v && v !== l.name) { l.name = v; commit('Rename Layer'); } }}
            />
          ) : (
            <>
              {l.name}
              {l.type === 'smart' && <span class="badge" title="Smart Object">SO</span>}
              {l.effects && (l.effects.shadow?.enabled || l.effects.glow?.enabled) && <span class="badge" title="Layer effects">fx</span>}
            </>
          )}
        </div>
        <button class={`icon-btn mini${l.locked ? ' on' : ''}`} title="Lock" onClick={(e) => { e.stopPropagation(); l.locked = !l.locked; commit(l.locked ? 'Lock Layer' : 'Unlock Layer'); }}>
          <Icon name={l.locked ? 'lock' : 'unlock'} size={13} />
        </button>
      </div>
      {l.type === 'group' && l.expanded && [...l.children].reverse().map((c) => <LayerRow key={c.id} l={c} depth={depth + 1} ds={ds} anchor={anchor} />)}
    </>
  );
}

const anchorRef = { id: null as string | null };

function LayersPanel() {
  const ds = cur();
  if (!ds) return <div class="empty">No document open</div>;
  return (
    <>
      <div class="layers" onClick={(e) => { if (e.target === e.currentTarget) select([]); }}>
        {[...ds.doc.layers].reverse().map((l) => <LayerRow key={l.id} l={l} depth={0} ds={ds} anchor={anchorRef} />)}
        {!ds.doc.layers.length && <div class="empty">No layers yet.<br />Draw a shape, type text, paint, or drop an image here.</div>}
        <div
          style={{ height: 30 }}
          onDragOver={(e) => { if (dragId) e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); if (dragId) { moveInto(dragId, null, 0, ds); dragId = null; commit('Reorder Layers', ds); } }}
        />
      </div>
      <div class="layer-foot">
        <span style={{ marginRight: 'auto', color: 'var(--muted)', paddingLeft: 4 }}>{[...walk(ds.doc.layers)].length} layers</span>
        <button class="icon-btn" title="New layer (Ctrl+Shift+N)" onClick={() => run('newLayer')}><Icon name="plus" size={15} /></button>
        <button class="icon-btn" title="Add layer mask (from the selection if there is one)" onClick={() => run(ds.mask ? 'maskSel' : 'maskReveal')} disabled={!ds.selected.length}><Icon name="frame" size={15} /></button>
        <button class="icon-btn" title="Group (Ctrl+G)" onClick={() => run('group')} disabled={!ds.selected.length}><Icon name="folderPlus" size={15} /></button>
        <button class="icon-btn" title="Duplicate (Ctrl+J)" onClick={() => run('dupLayer')} disabled={!ds.selected.length}><Icon name="copy" size={15} /></button>
        <button class="icon-btn" title="Merge down (Ctrl+E)" onClick={() => run('mergeDown')} disabled={!ds.selected.length}><Icon name="merge" size={15} /></button>
        <button class="icon-btn" title="Delete layer" onClick={() => run('delLayer')} disabled={!ds.selected.length}><Icon name="trash" size={15} /></button>
      </div>
    </>
  );
}

function HistoryPanel() {
  const ds = cur();
  if (!ds) return <div class="empty">No document open</div>;
  return (
    <div class="layers">
      {ds.history.map((h, i) => (
        <div class={`history-item${i === ds.hIndex ? ' on' : ''}${i > ds.hIndex ? ' future' : ''}`} onClick={() => jumpTo(i, ds)}>
          <button class={`icon-btn${historySource.value === i ? ' on' : ''}`} style={{ width: 20, height: 20 }} title="Set the source for the History Brush"
            onClick={(e) => { e.stopPropagation(); historySource.value = i; }}><Icon name="brush" size={12} /></button>
          <Icon name={i === 0 ? 'file' : 'history'} size={13} /> {h.label}
        </div>
      ))}
    </div>
  );
}

export { findLayer };
