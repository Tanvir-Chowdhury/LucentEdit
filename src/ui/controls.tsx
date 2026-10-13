import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { Paint, Gradient } from '../core/types';
import { parseColor, toHex, rgbToHsv, hsvToRgb, clamp } from '../core/util';
import { Icon } from './icons';

// Reusable inputs: color picker popover, swatches, scrubbable number fields, paint editor.

interface PickerReq { x: number; y: number; value: string; onChange: (c: string) => void; onDone?: () => void }
export const pickerReq = signal<PickerReq | null>(null);

const PRESETS = [
  '#000000', '#374151', '#6b7280', '#d1d5db', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];
const recent = signal<string[]>(loadRecent());
function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem('lucent.recentColors') || '[]'); } catch { return []; }
}
function pushRecent(c: string) {
  const list = [c, ...recent.value.filter((x) => x !== c)].slice(0, 10);
  recent.value = list;
  try { localStorage.setItem('lucent.recentColors', JSON.stringify(list)); } catch { /* storage unavailable */ }
}

export function openPicker(anchor: HTMLElement, value: string, onChange: (c: string) => void, onDone?: () => void) {
  const r = anchor.getBoundingClientRect();
  const x = Math.min(window.innerWidth - 248, Math.max(8, r.left));
  const y = r.bottom + 340 > window.innerHeight ? Math.max(8, r.top - 340) : r.bottom + 6;
  pickerReq.value = { x, y, value, onChange, onDone };
}

export function ColorPickerPopover() {
  const req = pickerReq.value;
  const [hsv, setHsv] = useState<[number, number, number]>([0, 0, 0]);
  const [alpha, setAlpha] = useState(1);
  const [hex, setHex] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!req) return;
    const [r, g, b, a] = parseColor(req.value);
    setHsv(rgbToHsv(r, g, b));
    setAlpha(a);
    setHex(toHex([r, g, b, 1]).slice(1));
    const close = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) done();
    };
    const t = setTimeout(() => window.addEventListener('pointerdown', close), 0);
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', close); };
  }, [req]);

  if (!req) return null;

  const emit = (h: [number, number, number], a: number) => {
    const [r, g, b] = hsvToRgb(...h);
    const c = toHex([r, g, b, a]);
    setHex(toHex([r, g, b, 1]).slice(1));
    req.onChange(c);
  };
  function done() {
    const [r, g, b] = hsvToRgb(...hsv);
    pushRecent(toHex([r, g, b, 1]));
    req?.onDone?.();
    pickerReq.value = null;
  }

  const drag = (el: HTMLElement, f: (fx: number, fy: number) => void) => (e: PointerEvent) => {
    el.setPointerCapture(e.pointerId);
    const go = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      f(clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1));
    };
    go(e);
    el.onpointermove = (ev) => go(ev as PointerEvent);
    el.onpointerup = () => { el.onpointermove = null; };
  };

  const [h, s, v] = hsv;
  const [cr, cg, cb] = hsvToRgb(h, s, v);
  const solid = `rgb(${cr},${cg},${cb})`;

  return (
    <div class="popover" style={{ left: req.x, top: req.y }} ref={box}>
      <div class="picker" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') done(); e.stopPropagation(); }}>
        <div
          class="sv"
          style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h} 100% 50%))` }}
          onPointerDown={(e) => drag(e.currentTarget as HTMLElement, (fx, fy) => { const n: [number, number, number] = [h, fx, 1 - fy]; setHsv(n); emit(n, alpha); })(e)}
        >
          <div class="knob" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: solid }} />
        </div>
        <div class="hue" onPointerDown={(e) => drag(e.currentTarget as HTMLElement, (fx) => { const n: [number, number, number] = [fx * 360, s, v]; setHsv(n); emit(n, alpha); })(e)}>
          <div class="knob" style={{ left: `${(h / 360) * 100}%`, background: `hsl(${h} 100% 50%)` }} />
        </div>
        <div
          class="alpha"
          style={{ background: `linear-gradient(90deg, transparent, ${solid}), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0/8px 8px` }}
          onPointerDown={(e) => drag(e.currentTarget as HTMLElement, (fx) => { setAlpha(fx); emit(hsv, Math.round(fx * 100) / 100); })(e)}
        >
          <div class="knob" style={{ left: `${alpha * 100}%`, background: solid }} />
        </div>
        <div class="row" style={{ marginTop: 10 }}>
          <div class="swatch"><i style={{ background: req.value }} /></div>
          <div class="field grow"><span>#</span><input value={hex} onInput={(e) => setHex((e.target as HTMLInputElement).value)} onChange={(e) => {
            const v2 = (e.target as HTMLInputElement).value.trim();
            if (/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v2)) {
              const [r, g, b] = parseColor('#' + v2);
              const n = rgbToHsv(r, g, b);
              setHsv(n); emit(n, alpha);
            }
          }} /></div>
          <div class="field" style={{ width: 64 }}><input value={Math.round(alpha * 100)} onChange={(e) => { const a = clamp(+(e.target as HTMLInputElement).value / 100 || 0, 0, 1); setAlpha(a); emit(hsv, a); }} /><span class="unit">%</span></div>
        </div>
        <div class="swatches">
          {[...PRESETS, ...recent.value].slice(0, 30).map((c) => (
            <button key={c} style={{ background: c }} title={c} onClick={() => { const [r, g, b] = parseColor(c); const n = rgbToHsv(r, g, b); setHsv(n); setAlpha(1); emit(n, 1); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Swatch({ value, onChange, onDone, title, size = 22 }: { value: string | null; onChange: (c: string) => void; onDone?: () => void; title?: string; size?: number }) {
  return (
    <button
      class={`swatch${value ? '' : ' none'}`}
      title={title}
      style={{ width: size, height: size, padding: 0 }}
      onClick={(e) => openPicker(e.currentTarget as HTMLElement, value ?? '#000000', onChange, onDone)}
    >
      <i style={{ background: value ?? undefined }} />
    </button>
  );
}

/** Number field with a scrubbable label (drag left/right like Photoshop). */
export function NumField({ label, value, onChange, onCommit, step = 1, min = -1e9, max = 1e9, unit, title, width }: {
  label?: string; value: number; onChange: (v: number) => void; onCommit?: () => void; step?: number; min?: number; max?: number; unit?: string; title?: string; width?: number;
}) {
  const [text, setText] = useState<string | null>(null);
  const round = (v: number) => Math.round(v * 100) / 100;
  const set = (v: number) => onChange(clamp(round(v), min, max));
  const scrub = (e: PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const x0 = e.clientX, v0 = value;
    el.onpointermove = (ev) => set(v0 + Math.round(((ev as PointerEvent).clientX - x0) / 2) * step * ((ev as PointerEvent).shiftKey ? 10 : 1));
    el.onpointerup = () => { el.onpointermove = null; onCommit?.(); };
  };
  return (
    <div class="field" title={title} style={width ? { width } : undefined}>
      {label && <span onPointerDown={scrub}>{label}</span>}
      <input
        value={text ?? String(round(value))}
        style={label ? undefined : { paddingLeft: 8 }}
        onFocus={(e) => (e.target as HTMLInputElement).select()}
        onInput={(e) => setText((e.target as HTMLInputElement).value)}
        onBlur={() => setText(null)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            const v = evalNum(text ?? String(value));
            if (v != null) { set(v); onCommit?.(); }
            setText(null);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            set(value + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1));
            onCommit?.();
          } else if (e.key === 'Escape') { setText(null); (e.target as HTMLInputElement).blur(); }
        }}
        onChange={() => {
          if (text == null) return;
          const v = evalNum(text);
          if (v != null) { set(v); onCommit?.(); }
          setText(null);
        }}
      />
      {unit && <span class="unit">{unit}</span>}
    </div>
  );
}

/** Allows simple math in number fields, e.g. "100*2" or "50+12". */
function evalNum(s: string): number | null {
  if (!/^[\d\s.+\-*/()]+$/.test(s)) return null;
  try { const v = Function(`"use strict";return (${s})`)(); return Number.isFinite(v) ? v : null; } catch { return null; }
}

/** Fill/stroke paint editor: none, solid or gradient with stops. */
export function PaintEditor({ value, onChange, onCommit, allowNone = true }: { value: Paint | null; onChange: (p: Paint | null) => void; onCommit: () => void; allowNone?: boolean }) {
  const kind = value == null ? 'none' : typeof value === 'string' ? 'solid' : value.type;
  const firstColor = value == null ? '#8b5cf6' : typeof value === 'string' ? value : value.stops[0]?.color ?? '#000';
  const setKind = (k: string) => {
    if (k === 'none') onChange(null);
    else if (k === 'solid') onChange(firstColor);
    else {
      const stops = typeof value === 'object' && value ? value.stops : [{ offset: 0, color: firstColor }, { offset: 1, color: '#22d3ee' }];
      onChange({ type: k as 'linear' | 'radial', angle: (value as Gradient)?.angle ?? 90, stops });
    }
    onCommit();
  };
  const g = typeof value === 'object' && value ? value : null;
  return (
    <div>
      <div class="row">
        {kind === 'solid' && <Swatch value={value as string} onChange={(c) => onChange(c)} onDone={onCommit} />}
        {kind === 'none' && <Swatch value={null} onChange={(c) => { onChange(c); }} onDone={onCommit} />}
        {g && <div class="swatch" style={{ width: 22 }}><i style={{ background: `linear-gradient(90deg, ${g.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(',')})` }} /></div>}
        <div class="seg grow" style={{ display: 'flex' }}>
          {allowNone && <button class={kind === 'none' ? 'on' : ''} title="None" onClick={() => setKind('none')}><Icon name="x" size={13} /></button>}
          <button class={kind === 'solid' ? 'on' : ''} title="Solid" onClick={() => setKind('solid')}><Icon name="droplet" size={13} /></button>
          <button class={kind === 'linear' ? 'on' : ''} title="Linear gradient" onClick={() => setKind('linear')}><Icon name="gradient" size={13} /></button>
          <button class={kind === 'radial' ? 'on' : ''} title="Radial gradient" onClick={() => setKind('radial')}><Icon name="sun" size={13} /></button>
        </div>
      </div>
      {g && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{ height: 14, borderRadius: 5, marginBottom: 8, boxShadow: '0 0 0 1px var(--line-2)', background: `linear-gradient(90deg, ${g.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(',')})` }}
          />
          {g.stops.map((s, i) => (
            <div class="row" key={i}>
              <Swatch value={s.color} onChange={(c) => { const stops = g.stops.map((x, j) => (j === i ? { ...x, color: c } : x)); onChange({ ...g, stops }); }} onDone={onCommit} />
              <NumField label="%" value={Math.round(s.offset * 100)} min={0} max={100} onChange={(v) => { const stops = g.stops.map((x, j) => (j === i ? { ...x, offset: v / 100 } : x)); onChange({ ...g, stops }); }} onCommit={onCommit} />
              <button class="icon-btn" title="Remove stop" disabled={g.stops.length <= 2} onClick={() => { onChange({ ...g, stops: g.stops.filter((_, j) => j !== i) }); onCommit(); }}><Icon name="trash" size={13} /></button>
            </div>
          ))}
          <div class="row">
            {g.type === 'linear' && <NumField label="∠" value={g.angle ?? 0} unit="°" onChange={(v) => onChange({ ...g, angle: v })} onCommit={onCommit} />}
            <button class="btn ghost" onClick={() => { onChange({ ...g, stops: [...g.stops, { offset: 0.5, color: '#ffffff' }].sort((a, b) => a.offset - b.offset) }); onCommit(); }}><Icon name="plus" size={13} /> Stop</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; icon?: string; label?: string; title?: string }[]; onChange: (v: T) => void }) {
  return (
    <div class="seg">
      {options.map((o) => (
        <button key={o.v} class={value === o.v ? 'on' : ''} title={o.title ?? o.label} onClick={() => onChange(o.v)}>
          {o.icon ? <Icon name={o.icon} size={14} /> : o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, onCommit, unit = '' }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; onCommit?: () => void; unit?: string }) {
  return (
    <div class="opt">
      <label>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onInput={(e) => onChange(+(e.target as HTMLInputElement).value)} onChange={() => onCommit?.()} />
      <NumField value={value} min={min} max={max} step={step} onChange={onChange} onCommit={onCommit} unit={unit} width={64} />
    </div>
  );
}
