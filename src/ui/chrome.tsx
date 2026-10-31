import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import {
  tool, fg, bg, tick, cur, brush, marquee, wand, bucket, gradientOpts, shapeOpts, textOpts, viewOpts, strokeColor,
  activeLayer, commit, touch, cursorPos, mcpStatus, docs, activeIndex, closeDoc, dialog, selectedLayers,
} from '../core/store';
import { useTick, usePaint } from '../core/store';
import { TOOLS, setTool, toolById, groupTools, groupCurrent, GROUP_ORDER } from '../tools';
import { CUSTOM_SHAPES } from '../tools/vector';
import { applyCrop, cancelCrop } from '../tools/select';
import { cropRect } from '../tools/types';
import { maskBounds, quickMask } from '../core/selection';
const quickMaskOn = () => quickMask.value;
import { setProps } from '../core/ops';
import type { TextLayer } from '../core/types';
import { Icon } from './icons';
import { askConfirm, askText } from './dialogs';
import { Swatch, NumField, Seg, Slider } from './controls';
import { COMMANDS, run, prettyKeys, cmd, fitView, actualPixels } from './commands';
import { FILTERS } from '../core/filters';
import { selectMenu } from './selectDialogs';
import { FontPicker } from './FontPicker';
import { zoomAt } from '../tools';
import { viewportSize } from './commands';

// Tooltip shared by toolbar buttons.
const tip = signal<{ x: number; y: number; text: string; keys?: string } | null>(null);
export function Tooltip() {
  const t = tip.value;
  if (!t) return null;
  return <div class="tip" style={{ left: t.x, top: t.y }}>{t.text}{t.keys && <b>{t.keys}</b>}</div>;
}
const showTip = (e: MouseEvent, text: string, keys?: string) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  tip.value = { x: r.right + 10, y: r.top + r.height / 2 - 12, text, keys };
};
const hideTip = () => (tip.value = null);

const flyout = signal<{ group: string; x: number; y: number } | null>(null);

export function Toolbar() {
  useTick();
  const slots: (string | '-')[] = GROUP_ORDER.filter((g, i, arr) => g === '-' ? arr[i - 1] !== '-' : groupTools(g).length > 0);
  let press = 0;
  const openFly = (e: MouseEvent, group: string) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    hideTip();
    flyout.value = { group, x: r.right + 6, y: r.top };
  };
  return (
    <div class="toolbar">
      {slots.map((g) => {
        if (g === '-') return <div class="tool-sep" />;
        const tools = groupTools(g);
        const t = tools.find((x) => x.id === tool.value) ?? toolById(groupCurrent.value[g] ?? tools[0].id);
        const on = tools.some((x) => x.id === tool.value);
        return (
          <button
            key={g}
            class={`tool-btn${on ? ' on' : ''}`}
            onClick={() => setTool(t.id)}
            onContextMenu={(e) => { e.preventDefault(); if (tools.length > 1) openFly(e, g); }}
            onPointerDown={(e) => { const el = e.currentTarget; clearTimeout(press); if (tools.length > 1) press = window.setTimeout(() => openFly({ currentTarget: el } as any, g), 380); }}
            onPointerUp={() => clearTimeout(press)}
            onPointerLeave={() => clearTimeout(press)}
            onMouseEnter={(e) => showTip(e, t.label + (tools.length > 1 ? ' (right-click for more)' : ''), t.key)}
            onMouseLeave={hideTip}
          >
            <Icon name={t.icon} size={18} />
            {tools.length > 1 && <span class="tool-more" />}
          </button>
        );
      })}
      <div class="colors">
        <button class="bg" style={{ background: bg.value }} title="Background color" onClick={(e) => openColor(e, 'bg')} />
        <button class="fg" style={{ background: fg.value }} title="Foreground color" onClick={(e) => openColor(e, 'fg')} />
        <button class="mini swap" title="Swap colors (X)" onClick={() => run('swapColors')}><Icon name="swap" size={11} /></button>
        <button class="mini reset" title="Default colors (D)" onClick={() => run('defaultColors')}><Icon name="reset" size={11} /></button>
      </div>
      <button class={`tool-btn${quickMaskOn() ? ' on' : ''}`} title="Edit in Quick Mask Mode (Q)" onClick={() => run('quickMask')} style={{ marginTop: 6 }}><Icon name="circleDashed" size={16} /></button>
      <button class="tool-btn" title="Change Screen Mode (F)" onClick={() => run('screenMode')}><Icon name="monitor" size={16} /></button>
    </div>
  );
}

export function ToolFlyout() {
  const f = flyout.value;
  useEffect(() => {
    if (!f) return;
    const close = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('.flyout')) flyout.value = null; };
    const t = setTimeout(() => window.addEventListener('pointerdown', close));
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', close); };
  }, [f]);
  if (!f) return null;
  return (
    <div class="menu-pop flyout" style={{ position: 'fixed', left: f.x, top: f.y, minWidth: 220 }}>
      {groupTools(f.group).map((t) => (
        <button class={`menu-item${tool.value === t.id ? ' hl' : ''}`} onClick={() => { setTool(t.id); flyout.value = null; }}>
          <Icon name={t.icon} size={15} /> {t.label}<span class="kbd">{t.key}</span>
        </button>
      ))}
    </div>
  );
}

import { openPicker } from './controls';
function openColor(e: MouseEvent, which: 'fg' | 'bg') {
  const s = which === 'fg' ? fg : bg;
  openPicker(e.currentTarget as HTMLElement, s.value, (c) => (s.value = c));
}

export const FONTS = [
  'Inter Variable', 'system-ui', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS',
  'Impact', 'Comic Sans MS', 'Segoe UI', 'Roboto', 'Ubuntu', 'Noto Sans', 'Noto Serif', 'DejaVu Sans', 'Palatino', 'Garamond',
  'Futura', 'Avenir', 'Gill Sans', 'Brush Script MT', 'serif', 'sans-serif', 'monospace', 'cursive',
];


function updateText(props: Partial<TextLayer>) {
  textOpts.value = { ...textOpts.value, ...(props as any) };
  for (const l of selectedLayers()) if (l.type === 'text') setProps(l, props);
  touch();
}
const commitText = () => { if (selectedLayers().some((l) => l.type === 'text')) commit('Text Style'); };

export function OptionsBar() {
  useTick();
  const t = toolById(tool.value);
  const meta = t;
  const b = brush.value;
  const so = shapeOpts.value;
  const to = textOpts.value;
  const active = activeLayer();
  const textL = active?.type === 'text' ? active : null;
  const body = (() => {
    if (meta.options) return meta.options();
    const key = tool.value.startsWith('shape') ? 'shape' : tool.value === 'marqueeEllipse' ? 'marquee' : tool.value;
    switch (key) {
      case 'move':
        return (
          <>
            <label class="opt"><input type="checkbox" checked={viewOpts.value.autoSelect} onChange={(e) => (viewOpts.value = { ...viewOpts.value, autoSelect: (e.target as HTMLInputElement).checked })} /> Auto-select</label>
            <label class="opt"><input type="checkbox" checked={viewOpts.value.snap} onChange={(e) => (viewOpts.value = { ...viewOpts.value, snap: (e.target as HTMLInputElement).checked })} /> Smart guides</label>
            <div class="opt-sep" />
            <div class="opt">
              {[['alignL', 'alignLeft'], ['alignHC', 'alignHCenter'], ['alignR', 'alignRight'], ['alignT', 'alignTop'], ['alignVC', 'alignVCenter'], ['alignB', 'alignBottom'], ['distH', 'distH'], ['distV', 'distV']].map(([id, icon]) => (
                <button class="icon-btn" title={cmd(id).label} onClick={() => run(id)} disabled={!cur()?.selected.length}><Icon name={icon} size={15} /></button>
              ))}
            </div>
            <div class="opt-sep" />
            <div class="opt">
              <button class="icon-btn" title="Flip horizontal" onClick={() => run('flipH')}><Icon name="flipH" size={15} /></button>
              <button class="icon-btn" title="Flip vertical" onClick={() => run('flipV')}><Icon name="flipV" size={15} /></button>
              <button class="icon-btn" title="Rotate 90°" onClick={() => run('rot90')}><Icon name="rotate" size={15} /></button>
            </div>
            <span class="opt" style={{ color: 'var(--muted)' }}>Drag handles to resize · Shift keeps ratio · drag outside a corner to rotate · Alt-drag duplicates</span>
          </>
        );
      case 'marquee':
        return (
          <>
            <Seg value={marquee.value.shape} onChange={(v) => (marquee.value = { shape: v })} options={[{ v: 'rect', icon: 'marquee', title: 'Rectangular' }, { v: 'ellipse', icon: 'circleDashed', title: 'Elliptical' }]} />
            <SelectionButtons />
          </>
        );
      case 'lasso':
        return <SelectionButtons />;
      case 'wand':
        return (
          <>
            <Slider label="Tolerance" value={wand.value.tolerance} min={0} max={255} onChange={(v) => (wand.value = { ...wand.value, tolerance: v })} />
            <label class="opt"><input type="checkbox" checked={wand.value.contiguous} onChange={(e) => (wand.value = { ...wand.value, contiguous: (e.target as HTMLInputElement).checked })} /> Contiguous</label>
            <SelectionButtons />
          </>
        );
      case 'crop': {
        const r = cropRect.value;
        return (
          <>
            {r ? <span class="opt">{Math.round(r.w)} × {Math.round(r.h)} px</span> : <span class="opt" style={{ color: 'var(--muted)' }}>Drag on the canvas to set the crop area</span>}
            <button class="btn" onClick={() => { const ds = cur(); if (ds) cropRect.value = { x: 0, y: 0, w: ds.doc.width, h: ds.doc.height }; touch(); }}>Whole canvas</button>
            {cur()?.mask && <button class="btn" onClick={() => { const ds = cur(); const m = ds && maskBounds(ds); if (m) cropRect.value = m; touch(); }}>From selection</button>}
            <button class="btn primary" disabled={!r} onClick={applyCrop}><Icon name="check" size={14} /> Apply</button>
            <button class="btn ghost" disabled={!r} onClick={cancelCrop}>Cancel</button>
          </>
        );
      }
      case 'brush':
      case 'eraser':
        return (
          <>
            <Slider label="Size" value={b.size} min={1} max={500} unit="px" onChange={(v) => (brush.value = { ...b, size: v })} />
            <Slider label="Hardness" value={Math.round(b.hardness * 100)} min={0} max={100} unit="%" onChange={(v) => (brush.value = { ...b, hardness: v / 100 })} />
            <Slider label="Opacity" value={Math.round(b.opacity * 100)} min={1} max={100} unit="%" onChange={(v) => (brush.value = { ...b, opacity: v / 100 })} />
            <Slider label="Flow" value={Math.round(b.flow * 100)} min={1} max={100} unit="%" onChange={(v) => (brush.value = { ...b, flow: v / 100 })} />
          </>
        );
      case 'bucket':
        return (
          <>
            <Slider label="Tolerance" value={bucket.value.tolerance} min={0} max={255} onChange={(v) => (bucket.value = { ...bucket.value, tolerance: v })} />
            <label class="opt"><input type="checkbox" checked={bucket.value.contiguous} onChange={(e) => (bucket.value = { ...bucket.value, contiguous: (e.target as HTMLInputElement).checked })} /> Contiguous</label>
            <span class="opt" style={{ color: 'var(--muted)' }}>On shapes and text, the bucket sets the fill color</span>
          </>
        );
      case 'gradient':
        return (
          <>
            <div class="swatch" style={{ width: 90 }}><i style={{ background: gradientOpts.value.type === 'radial' ? `radial-gradient(${fg.value}, ${bg.value})` : `linear-gradient(90deg, ${fg.value}, ${bg.value})` }} /></div>
            <Seg value={gradientOpts.value.type} onChange={(v) => (gradientOpts.value = { type: v })} options={[{ v: 'linear', label: 'Linear' }, { v: 'radial', label: 'Radial' }]} />
            <span class="opt" style={{ color: 'var(--muted)' }}>Drag to draw a foreground → background gradient. On shapes it becomes an editable gradient fill.</span>
          </>
        );
      case 'text':
        return (
          <>
            <FontSelect value={textL?.family ?? to.family} onChange={(v) => { updateText({ family: v }); commitText(); }} />
            <select value={String(textL?.weight ?? to.weight)} onChange={(e) => { updateText({ weight: +(e.target as HTMLSelectElement).value }); commitText(); }}>
              {[[100, 'Thin'], [200, 'Extra Light'], [300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Extra Bold'], [900, 'Black']].map(([v, n]) => <option value={v}>{n}</option>)}
            </select>
            <NumField label="pt" value={textL?.size ?? to.size} min={1} max={2000} onChange={(v) => updateText({ size: v })} onCommit={commitText} width={78} />
            <button class={`icon-btn${(textL?.italic ?? to.italic) ? ' on' : ''}`} title="Italic" onClick={() => { updateText({ italic: !(textL?.italic ?? to.italic) }); commitText(); }}><Icon name="italic" size={15} /></button>
            <Seg value={(textL?.align ?? to.align) as any} onChange={(v) => { updateText({ align: v as CanvasTextAlign }); commitText(); }} options={[{ v: 'left', icon: 'textLeft' }, { v: 'center', icon: 'textCenter' }, { v: 'right', icon: 'textRight' }]} />
            <Swatch value={typeof textL?.fill === 'string' ? textL.fill : fg.value} title="Text color" onChange={(c) => { if (textL) { textL.fill = c; touch(); } else fg.value = c; }} onDone={commitText} />
            <span class="opt" style={{ color: 'var(--muted)' }}>Click to type · drag for a text box · Esc to finish</span>
          </>
        );
      case 'pen':
        return (
          <>
            <NumField label="W" value={so.strokeWidth} min={0.5} max={200} unit="px" title="Stroke width for open paths" onChange={(v) => (shapeOpts.value = { ...so, strokeWidth: v })} width={84} />
            <span class="opt" style={{ color: 'var(--muted)' }}>Click to add corners, drag for curves, click the first point to close · Enter finishes · Backspace removes last point</span>
          </>
        );
      case 'direct':
        return <span class="opt" style={{ color: 'var(--muted)' }}>Drag anchor points and handles · Alt-click a point to toggle smooth/corner · Delete removes a point</span>;
      case 'shape':
        return (
          <>
            {so.shape === 'custom' && (
              <select value={so.custom} title="Custom shape" onChange={(e) => (shapeOpts.value = { ...so, custom: (e.target as HTMLSelectElement).value })}>
                {CUSTOM_SHAPES.map((c) => <option value={c.id}>{c.name}</option>)}
              </select>
            )}
            <div class="opt-sep" />
            <label class="opt"><input type="checkbox" checked={so.fill} onChange={(e) => (shapeOpts.value = { ...so, fill: (e.target as HTMLInputElement).checked })} /> Fill</label>
            <Swatch value={fg.value} title="Fill color" onChange={(c) => (fg.value = c)} />
            <label class="opt"><input type="checkbox" checked={so.stroke} onChange={(e) => (shapeOpts.value = { ...so, stroke: (e.target as HTMLInputElement).checked })} /> Stroke</label>
            <Swatch value={strokeColor.value} title="Stroke color" onChange={(c) => (strokeColor.value = c)} />
            <NumField label="W" value={so.strokeWidth} min={0} max={200} unit="px" onChange={(v) => (shapeOpts.value = { ...so, strokeWidth: v })} width={80} />
            {so.shape === 'rect' && <NumField label="R" title="Corner radius" value={so.radius} min={0} max={2000} unit="px" onChange={(v) => (shapeOpts.value = { ...so, radius: v })} width={80} />}
            {so.shape === 'polygon' && <NumField label="#" title="Sides" value={so.sides} min={3} max={64} onChange={(v) => (shapeOpts.value = { ...so, sides: v })} width={70} />}
            {so.shape === 'star' && <><NumField label="#" title="Points" value={so.points} min={3} max={64} onChange={(v) => (shapeOpts.value = { ...so, points: v })} width={70} /><NumField label="◌" title="Inner radius %" value={Math.round(so.inner * 100)} min={5} max={100} unit="%" onChange={(v) => (shapeOpts.value = { ...so, inner: v / 100 })} width={80} /></>}
          </>
        );
      case 'hand':
      case 'zoom':
      case 'eyedropper':
        return (
          <>
            <button class="btn" onClick={() => fitView()}><Icon name="fit" size={14} /> Fit Screen</button>
            <button class="btn" onClick={actualPixels}>100%</button>
            {tool.value === 'eyedropper' && <span class="opt" style={{ color: 'var(--muted)' }}>Click to sample foreground · Alt-click for background</span>}
          </>
        );
    }
    return null;
  })();
  return (
    <div class="optionsbar">
      <div class="tool-name"><Icon name={t.icon} size={16} /> {t.label}</div>
      {body}
    </div>
  );
}

function SelectionButtons() {
  return (
    <>
      <div class="opt-sep" />
      <button class="btn ghost" onClick={() => run('selectAll')}>Select All</button>
      <button class="btn ghost" onClick={() => run('inverse')}>Inverse</button>
      <button class="btn ghost" disabled={!cur()?.mask} onClick={() => run('feather')}>Feather…</button>
      <button class="btn ghost" disabled={!cur()?.mask} onClick={() => run('deselect')}>Deselect</button>
      <span class="opt" style={{ color: 'var(--muted)' }}>Shift adds · Alt subtracts · Shift+Alt intersects</span>
    </>
  );
}

/** Font family control used by the Type options bar and the Properties panel. */
export function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <FontPicker value={value} onChange={onChange} />;
}

// Menu bar

type MenuEntry = string | '-' | { label: string; items: MenuEntry[] };
/** Filter menu grouped like Photoshop (submenus come from FilterDef.submenu when present). */
function filterMenu(): MenuEntry[] {
  const filters = FILTERS.filter((f) => f.menu === 'filter');
  const order = ['Blur', 'Distort', 'Noise', 'Pixelate', 'Render', 'Sharpen', 'Stylize', 'Other'];
  const groups = new Map<string, string[]>();
  for (const f of filters) {
    const g = (f as any).submenu ?? 'Other';
    groups.set(g, [...(groups.get(g) ?? []), `filter:${f.id}`]);
  }
  const names = [...groups.keys()].sort((x, y) => (order.indexOf(x) + 99) % 99 - (order.indexOf(y) + 99) % 99);
  return ['lastFilter', '-', 'liquify', '-', ...names.map((n) => ({ label: n, items: groups.get(n)! }))];
}

function menus(): { label: string; items: MenuEntry[] }[] {
  const adjust = FILTERS.filter((f) => f.menu === 'adjust');
  const auto = adjust.filter((f) => f.id.startsWith('auto-')).map((f) => `filter:${f.id}`);
  return [
    { label: 'File', items: ['new', 'open', '-', 'close', 'closeAll', '-', 'save', 'saveAs', 'saveCopy', 'revert', '-',
      { label: 'Export', items: ['exportPng', 'exportJpg', 'exportSvg', 'exportPsd', 'exportAi', 'exportPdf', '-', 'export', 'saveForWeb'] }, '-', 'place'] },
    { label: 'Edit', items: ['undo', 'redo', 'stepForward', 'stepBackward', '-', 'cut', 'copy', 'copyMerged', 'paste', 'pasteInPlace', 'delete', '-', 'palette', '-',
      'fillDialog', 'contentAwareFill', 'strokeDialog', 'fill', 'fillBg', '-', 'transform',
      { label: 'Transform', items: ['transformSkew', 'transformDistort', 'transformPerspective', 'transformWarp', '-', 'rot180', 'rot90', 'rot-90', '-', 'flipH', 'flipV'] }, '-', 'purgeHistory', '-', 'shortcuts', 'preferences'] },
    { label: 'Image', items: [
      { label: 'Mode', items: ['modeGray'] },
      { label: 'Adjustments', items: adjust.filter((f) => !f.id.startsWith('auto-')).map((f) => `filter:${f.id}`) },
      '-', ...auto, ...(auto.length ? ['-'] : []), 'imageSize', 'canvasSize',
      { label: 'Image Rotation', items: ['rot180', 'rotCW', 'rotCCW', '-', 'flipCanvasH', 'flipCanvasV'] },
      'cropSel', 'trim', 'revealAll', '-', 'duplicateDoc'] },
    { label: 'Layer', items: [
      { label: 'New', items: ['newLayer', 'layerViaCopy', 'layerViaCut', '-', 'group'] },
      'dupLayer', 'delLayer', '-',
      { label: 'Layer Style', items: ['layerStyle', 'clearStyle'] },
      { label: 'New Fill Layer', items: ['fillSolid', 'fillGradient'] },
      { label: 'New Adjustment Layer', items: adjust.filter((f) => (f as any).point).map((f) => `adj:${f.id}`) },
      { label: 'Layer Mask', items: ['maskReveal', 'maskHide', 'maskSel', 'maskHideSel', '-', 'maskToggle', 'maskApply', 'maskDelete'] },
      'clip', '-', { label: 'Smart Objects', items: ['smartConvert', 'smartEdit', 'rasterize'] }, 'rasterize', '-', 'group', 'ungroup', 'hideLayers', '-',
      { label: 'Arrange', items: ['front', 'forward', 'backward', 'back'] },
      { label: 'Align', items: ['alignL', 'alignHC', 'alignR', 'alignT', 'alignVC', 'alignB'] },
      { label: 'Distribute', items: ['distH', 'distV'] }, '-', 'lockLayers', '-',
      'mergeDown', 'mergeVisible', 'stampVisible', 'flatten'] },
    { label: 'Select', items: (() => { const m = selectMenu(); const i = m.indexOf('colorRange'); m.splice(i + 1, 0, 'selectSubject', 'selectSky'); return m; })() },
    { label: 'Filter', items: filterMenu() },
    { label: 'View', items: ['zoomIn', 'zoomOut', 'fit', 'actual', 'zoom200', '-', 'screenMode', '-', 'extras',
      { label: 'Show', items: ['showGuides', 'gridToggle'] }, '-', 'rulers', '-', 'snap', '-', 'lockGuides', 'clearGuides', 'newGuide', 'guidesFromShape'] },
    { label: 'Window', items: ['actionsPanel', 'winAssets', 'winBrands', 'winHistogram', 'winHistory', 'winInfo', 'winLayers', 'winNavigator', 'winProperties', 'winSwatches', '-', 'togglePanels'] },
    { label: 'Help', items: ['shortcuts', 'mcp', '-', 'about'] },
  ];
}

const openMenu = signal<number | null>(null);

function MenuItems({ items }: { items: MenuEntry[] }) {
  const [sub, setSub] = useState<number | null>(null);
  return (
    <div class="menu-pop">
      {items.map((it, i) => {
        if (it === '-') return <div class="menu-sep" />;
        if (typeof it === 'object') {
          return (
            <div class="menu-root" onMouseEnter={() => setSub(i)} onMouseLeave={() => setSub(null)}>
              <button class={`menu-item${sub === i ? ' hl' : ''}`}><span style={{ width: 14, display: 'inline-grid' }} />{it.label}<span class="chev"><Icon name="right" size={13} /></span></button>
              {sub === i && <div class="menu-sub"><MenuItems items={it.items} /></div>}
            </div>
          );
        }
        const c = cmd(it);
        if (!c) return null;
        const v = viewOpts.value;
        const checked = (it === 'rulers' && v.rulers) || (it === 'gridToggle' && v.grid) || (it === 'snap' && v.snap) || (it === 'extras' && v.extras) || (it === 'showGuides' && v.guides) || (it === 'lockGuides' && v.lockGuides);
        const label = c.label.replace(/^[^:]+: /, ''); // the submenu already names the group
        return (
          <button class="menu-item" disabled={c.enabled ? !c.enabled() : false} onMouseEnter={() => setSub(null)} onClick={() => { openMenu.value = null; c.run(); }}>
            <span style={{ width: 14, display: 'inline-grid' }}>{checked && <Icon name="check" size={13} />}</span>
            {label}
            <span class="kbd">{prettyKeys(c.keys)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MenuBar() {
  useTick();
  const open = openMenu.value;
  useEffect(() => {
    if (open == null) return;
    const close = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('.menubar')) openMenu.value = null; };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') openMenu.value = null; };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', esc); };
  }, [open]);
  const st = mcpStatus.value;
  return (
    <div class="menubar">
      <div class="brand"><img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" /><span>LucentEdit</span></div>
      {menus().map((m, i) => (
        <div class="menu-root">
          <button class={`menu-btn${open === i ? ' open' : ''}`} onClick={() => (openMenu.value = open === i ? null : i)} onMouseEnter={() => { if (open != null) openMenu.value = i; }}>{m.label}</button>
          {open === i && <MenuItems items={menus()[i].items} />}
        </div>
      ))}
      <div class="spacer" />
      <button class="icon-btn" title="Command palette (Ctrl+K)" onClick={() => run('palette')}><Icon name="search" size={15} /></button>
      <button class="mcp-pill" onClick={() => (dialog.value = { kind: 'mcp' })} title="Connect AI agents through MCP">
        <span class={`dot${st.active ? ' busy' : st.enabled ? ' on' : ''}`} />
        {st.enabled ? (st.active ? 'Agent working…' : `MCP · ${st.port}`) : 'MCP (desktop app)'}
      </button>
    </div>
  );
}

export function Tabs() {
  useTick();
  return (
    <div class="tabs">
      {docs.value.map((ds, i) => (
        <button class={`tab${i === activeIndex.value ? ' on' : ''}`} onClick={() => { activeIndex.value = i; touch(); }} onAuxClick={(e) => { if (e.button === 1) closeDoc(i); }}>
          <span class="name">{ds.doc.name}</span>
          <span class="zoom">{Math.round(ds.view.zoom * 100)}%</span>
          {ds.dirty && <span class="dirty" />}
          <span class="x" onClick={(e) => { e.stopPropagation(); if (!ds.dirty) closeDoc(i); else askConfirm(`Close "${ds.doc.name}"?`, 'Unsaved changes will be lost.', 'Close without saving', () => closeDoc(i)); }}><Icon name="x" size={12} /></span>
        </button>
      ))}
      <button class="icon-btn" title="New document" onClick={() => (dialog.value = { kind: 'new' })} style={{ alignSelf: 'center' }}><Icon name="plus" size={15} /></button>
    </div>
  );
}

export function StatusBar() {
  useTick();
  const ds = cur();
  const cp = cursorPos.value;
  const mb = ds?.mask ? maskBounds(ds) : null;
  return (
    <div class="statusbar">
      {ds ? (
        <>
          <div class="zoom-ctl">
            <button onClick={() => zoomAt(0.8, viewportSize.w / 2, viewportSize.h / 2)}><Icon name="zoomOut" size={13} /></button>
            <b style={{ minWidth: 42, textAlign: 'center' }}>{Math.round(ds.view.zoom * 100)}%</b>
            <button onClick={() => zoomAt(1.25, viewportSize.w / 2, viewportSize.h / 2)}><Icon name="zoom" size={13} /></button>
            <button onClick={() => fitView()} title="Fit (Ctrl+0)"><Icon name="fit" size={12} /></button>
          </div>
          <span><b>{ds.doc.width} × {ds.doc.height}</b> px</span>
          {cp && <span>X <b>{cp.x}</b> Y <b>{cp.y}</b></span>}
          {mb && <span>Selection <b>{mb.w} × {mb.h}</b></span>}
          <span>{ds.selected.length ? `${ds.selected.length} layer${ds.selected.length > 1 ? 's' : ''} selected` : 'No layer selected'}</span>
        </>
      ) : <span>Ready</span>}
      <div class="spacer" />
      {mcpStatus.value.last && <span>Last agent action: <b>{mcpStatus.value.last}</b></span>}
      <span>Free & open source · MIT</span>
    </div>
  );
}

export { COMMANDS };
