import { useEffect, useRef, useState } from 'preact/hooks';
import { Hand, Undo2, Shrink, Expand, RotateCw, RotateCcw, X } from 'lucide-preact';
import { dialog, cur, commit, activeLayer, jumpTo, toast } from '../core/store';
import { editablePixels } from '../core/ops';
import { findLayer, makeCanvas, ctx2d } from '../core/util';
import type { DocState, RasterLayer } from '../core/types';
import { newField, liquifyDab, liquifyRender, type Field, type LiquifyKind } from '../core/warp';
import { Slider } from './controls';

// Filter > Liquify. Strokes edit a displacement field at preview resolution (long side <= 1200 px)
// and re-render only the brushed rect from the untouched original. OK upsamples the field onto
// the layer's full-resolution pixels.

const PREVIEW_MAX = 1200;
const TOOLS: { k: LiquifyKind; label: string; key: string; icon: any }[] = [
  { k: 'warp', label: 'Forward Warp', key: 'W', icon: Hand },
  { k: 'reconstruct', label: 'Reconstruct', key: 'R', icon: Undo2 },
  { k: 'pucker', label: 'Pucker', key: 'S', icon: Shrink },
  { k: 'bloat', label: 'Bloat', key: 'B', icon: Expand },
  { k: 'twirlCW', label: 'Twirl Clockwise', key: 'C', icon: RotateCw },
  { k: 'twirlCCW', label: 'Twirl Counter-clockwise', key: 'Alt+C', icon: RotateCcw },
];

interface Setup { ds: DocState; id: string; rasterized: boolean; scale: number; orig: ImageData; out: ImageData; field: Field }

export function LiquifyDialog() {
  return dialog.value?.kind === 'liquify' ? <Liquify /> : null;
}

function Liquify() {
  const [kind, setKind] = useState<LiquifyKind>('warp');
  const [size, setSize] = useState(100); // brush diameter in layer pixels
  const [pressure, setPressure] = useState(50);
  const [density, setDensity] = useState(50);
  const [rate, setRate] = useState(80);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const setup = useRef<Setup | null>(null);
  const opts = useRef({ kind, size, pressure, density, rate });
  opts.current = { kind, size, pressure, density, rate };

  useEffect(() => {
    const ds = cur(), l = activeLayer(ds);
    const wasRaster = l?.type === 'raster';
    const r = l && l.type !== 'group' ? editablePixels(l, ds) : null;
    if (!ds || !r) { if (l?.type === 'group') toast('Liquify needs a single layer, not a group', 'error'); dialog.value = null; return; }
    const W = r.canvas.width, H = r.canvas.height, scale = Math.min(1, PREVIEW_MAX / Math.max(W, H));
    const pw = Math.max(1, Math.round(W * scale)), ph = Math.max(1, Math.round(H * scale));
    const c = canvas.current!;
    c.width = pw; c.height = ph;
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.drawImage(r.canvas, 0, 0, pw, ph);
    const orig = x.getImageData(0, 0, pw, ph);
    setup.current = { ds, id: r.id, rasterized: !wasRaster, scale, orig, out: new ImageData(new Uint8ClampedArray(orig.data), pw, ph), field: newField(pw, ph) };
    setSize((s) => Math.min(s, Math.max(W, H)));
  }, []);

  const close = (ok: boolean) => {
    const s = setup.current;
    dialog.value = null;
    if (!s) return;
    const l = findLayer(s.ds.doc, s.id) as RasterLayer | null;
    if (ok && l) {
      const W = l.canvas.width, H = l.canvas.height;
      const full = l.canvas.getContext('2d')!.getImageData(0, 0, W, H);
      const out = new ImageData(W, H);
      liquifyRender(full, s.field, out);
      const c = makeCanvas(W, H);
      ctx2d(c).putImageData(out, 0, 0);
      l.canvas = c; // editablePixels already gave this layer its own canvas; replace rather than mutate
      commit('Liquify', s.ds);
    } else if (s.rasterized) jumpTo(s.ds.hIndex, s.ds); // undo the rasterize done on open
  };

  const restoreAll = () => {
    const s = setup.current;
    if (!s) return;
    s.field.dx.fill(0); s.field.dy.fill(0);
    s.out.data.set(s.orig.data);
    canvas.current!.getContext('2d')!.putImageData(s.out, 0, 0);
  };

  // Brush interaction
  const stroke = useRef<{ x: number; y: number; alt: boolean; timer: number } | null>(null);
  const toPreview = (e: PointerEvent) => {
    const c = canvas.current!, r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };
  const dab = (x: number, y: number, mx = 0, my = 0, alt = false) => {
    const s = setup.current;
    if (!s) return;
    const o = opts.current;
    let k = o.kind;
    if (alt && (k === 'twirlCW' || k === 'twirlCCW')) k = k === 'twirlCW' ? 'twirlCCW' : 'twirlCW';
    if (alt && (k === 'bloat' || k === 'pucker')) k = k === 'bloat' ? 'pucker' : 'bloat';
    const rect = liquifyDab(s.field, k, x, y, Math.max(1, (o.size / 2) * s.scale), o.pressure / 100, o.density / 100, mx, my, o.rate / 100);
    if (!rect) return;
    liquifyRender(s.orig, s.field, s.out, rect);
    canvas.current!.getContext('2d')!.putImageData(s.out, 0, 0, rect.x, rect.y, rect.w, rect.h);
  };
  const moveRing = (e: PointerEvent) => {
    const c = canvas.current!, el = ring.current!, r = c.getBoundingClientRect(), s = setup.current;
    const d = s ? opts.current.size * s.scale * (r.width / c.width) : 0;
    Object.assign(el.style, { display: 'block', width: `${d}px`, height: `${d}px`, left: `${e.clientX - d / 2}px`, top: `${e.clientY - d / 2}px` });
  };
  const onDown = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = toPreview(e);
    const timed = opts.current.kind !== 'warp';
    // Bloat/Pucker/Twirl/Reconstruct keep acting while the button is held, like Photoshop.
    stroke.current = { ...p, alt: e.altKey, timer: timed ? window.setInterval(() => { const st = stroke.current; if (st) dab(st.x, st.y, 0, 0, st.alt); }, 30) : 0 };
    if (timed) dab(p.x, p.y, 0, 0, e.altKey);
  };
  const onMove = (e: PointerEvent) => {
    moveRing(e);
    const st = stroke.current;
    if (!st) return;
    const p = toPreview(e);
    if (opts.current.kind === 'warp') {
      // Push in steps no longer than a quarter brush so fast drags stay smooth.
      const s = setup.current!, step = Math.max(1, (opts.current.size / 2) * s.scale * 0.25);
      const dx = p.x - st.x, dy = p.y - st.y, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
      for (let i = 0; i < n; i++) dab(st.x + (dx * i) / n, st.y + (dy * i) / n, dx / n, dy / n);
    }
    st.x = p.x; st.y = p.y; st.alt = e.altKey;
  };
  const onUp = () => { if (stroke.current?.timer) clearInterval(stroke.current.timer); stroke.current = null; };
  useEffect(() => () => onUp(), []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'range' && e.key !== 'Escape') return;
      const key = e.key.toUpperCase();
      const hitTool = !e.ctrlKey && !e.metaKey && TOOLS.find((x) => x.key === (e.altKey ? 'Alt+' : '') + key);
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Enter') close(true);
      else if (e.key === '[' || e.key === ']') setSize((s) => Math.max(1, Math.min(15000, Math.round(s * (e.key === ']' ? 1.15 : 1 / 1.15)))));
      else if (hitTool) setKind(hitTool.k);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, []);

  return (
    <div class="backdrop">
      <div class="dialog" style={{ width: 'calc(100vw - 48px)', height: 'calc(100vh - 48px)', maxHeight: 'none' }} onKeyDown={(e) => e.stopPropagation()}>
        <div class="dialog-head"><div>Liquify<span class="sub">Paint to push pixels · Alt reverses Bloat/Pucker and Twirl · [ ] brush size</span></div><button class="icon-btn" onClick={() => close(false)}><X size={16} /></button></div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: '8px 18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TOOLS.map((t) => <button class={`tool-btn${kind === t.k ? ' on' : ''}`} title={`${t.label} (${t.key})`} aria-label={t.label} onClick={() => setKind(t.k)}><t.icon size={18} /></button>)}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'grid', placeItems: 'center', overflow: 'hidden', background: 'var(--bg-0, #0b0b10)', borderRadius: 8 }}>
            <canvas ref={canvas} onPointerDown={onDown as any} onPointerMove={onMove as any} onPointerUp={onUp} onPointerCancel={onUp}
              onPointerLeave={() => { if (ring.current) ring.current.style.display = 'none'; }}
              style={{ maxWidth: '100%', maxHeight: '100%', cursor: 'crosshair', touchAction: 'none', background: 'repeating-conic-gradient(#808080 0 25%, #a0a0a0 0 50%) 0 0 / 16px 16px' }} />
          </div>
          <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Slider label="Size" value={size} min={1} max={2000} onChange={setSize} unit="px" />
            <Slider label="Pressure" value={pressure} min={1} max={100} onChange={setPressure} />
            <Slider label="Density" value={density} min={0} max={100} onChange={setDensity} />
            <Slider label="Rate" value={rate} min={0} max={100} onChange={setRate} />
          </div>
        </div>
        <div class="dialog-foot">
          <button class="btn ghost" style={{ marginRight: 'auto' }} onClick={restoreAll}>Restore All</button>
          <button class="btn ghost" onClick={() => close(false)}>Cancel</button>
          <button class="btn primary" onClick={() => close(true)}>OK</button>
        </div>
      </div>
      <div ref={ring} style={{ position: 'fixed', display: 'none', pointerEvents: 'none', borderRadius: '50%', border: '1px solid #fff', boxShadow: '0 0 0 1px #000', zIndex: 200 }} />
    </div>
  );
}
