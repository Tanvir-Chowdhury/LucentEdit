import { useEffect, useRef } from 'preact/hooks';
import { cur, cursorPos, fg, bg, useTick, touch } from '../core/store';
import { flatten } from '../core/render';
import { ctx2d } from '../core/util';
import { samplers, sampleAt } from '../tools/extra';
import { viewportSize } from './commands';
import { view } from '../tools/types';

// Navigator, Info, Histogram and Swatches panels.

/** Small flattened preview, re-rendered at most every 250 ms (cheap on low-spec PCs). */
let previewCache: { key: string; c: HTMLCanvasElement } | null = null;
function preview(maxSize: number): HTMLCanvasElement | null {
  const ds = cur();
  if (!ds) return null;
  const key = `${ds.doc.id}:${ds.hIndex}:${ds.doc.width}x${ds.doc.height}:${maxSize}`;
  if (previewCache?.key !== key) previewCache = { key, c: flatten(ds.doc, Math.min(1, maxSize / Math.max(ds.doc.width, ds.doc.height))) };
  return previewCache.c;
}

export function NavigatorPanel() {
  useTick();
  const ref = useRef<HTMLCanvasElement>(null);
  const ds = cur();
  useEffect(() => {
    const c = ref.current, p = preview(260);
    if (!c || !p || !ds) return;
    c.width = p.width; c.height = p.height;
    const x = c.getContext('2d')!;
    x.drawImage(p, 0, 0);
    // Visible area rectangle.
    const s = p.width / ds.doc.width;
    const a = view.toDoc(0, 0), b = view.toDoc(viewportSize.w, viewportSize.h);
    x.strokeStyle = '#ef4444'; x.lineWidth = 2;
    x.strokeRect(Math.min(a.x, b.x) * s, Math.min(a.y, b.y) * s, Math.abs(b.x - a.x) * s, Math.abs(b.y - a.y) * s);
  });
  if (!ds) return <div class="empty">No document</div>;
  const jump = (e: PointerEvent) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width) * ds.doc.width, dy = ((e.clientY - r.top) / r.height) * ds.doc.height;
    // Center the view on the clicked document point.
    ds.view.panX = viewportSize.w / 2 - dx * ds.view.zoom;
    ds.view.panY = viewportSize.h / 2 - dy * ds.view.zoom;
    touch();
  };
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 8 }}>
      <canvas ref={ref} style={{ maxWidth: '100%', cursor: 'pointer', boxShadow: '0 0 0 1px var(--line-2)' }}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); jump(e); }}
        onPointerMove={(e) => { if (e.buttons) jump(e); }} />
      <div style={{ color: 'var(--muted)', marginTop: 6 }}>{Math.round(ds.view.zoom * 100)}% · drag to move the view</div>
    </div>
  );
}

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

export function InfoPanel() {
  useTick();
  const ds = cur();
  const p = cursorPos.value;
  if (!ds) return <div class="empty">No document</div>;
  const px = p ? sampleAt(p.x, p.y) : null;
  return (
    <div style={{ padding: '4px 12px', lineHeight: 1.8 }}>
      <div class="row"><span class="lbl">Cursor</span>{p ? <b>X {p.x} · Y {p.y}</b> : <span style={{ color: 'var(--muted)' }}>outside canvas</span>}</div>
      {px && (
        <div class="row"><span class="lbl">Color</span>
          <span class="swatch" style={{ width: 16, height: 16 }}><i style={{ background: `rgba(${px[0]},${px[1]},${px[2]},${px[3] / 255})` }} /></span>
          <b>R {px[0]} G {px[1]} B {px[2]}</b><span style={{ color: 'var(--muted)' }}>{hex(px[0], px[1], px[2])} · A {Math.round((px[3] / 255) * 100)}%</span>
        </div>
      )}
      <div class="row"><span class="lbl">Document</span><b>{ds.doc.width} × {ds.doc.height} px</b></div>
      <div class="row"><span class="lbl">Colors</span>FG <b>{fg.value}</b> BG <b>{bg.value}</b></div>
      {samplers.value.map((s, i) => {
        const c = sampleAt(s.x, s.y);
        return (
          <div class="row"><span class="lbl">#{i + 1}</span>
            {c ? <><span class="swatch" style={{ width: 16, height: 16 }}><i style={{ background: hex(c[0], c[1], c[2]) }} /></span><b>R {c[0]} G {c[1]} B {c[2]}</b></> : '—'}
          </div>
        );
      })}
      {!samplers.value.length && <div style={{ color: 'var(--muted)' }}>Tip: the Color Sampler tool (Shift+I) pins readings here.</div>}
    </div>
  );
}

export function HistogramPanel() {
  useTick();
  const ref = useRef<HTMLCanvasElement>(null);
  const ds = cur();
  useEffect(() => {
    const c = ref.current, p = preview(400);
    if (!c || !p) return;
    const d = ctx2d(p).getImageData(0, 0, p.width, p.height).data;
    const h = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      h[0][d[i]]++; h[1][d[i + 1]]++; h[2][d[i + 2]]++;
      h[3][Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
    }
    const x = c.getContext('2d')!;
    x.clearRect(0, 0, 256, 120);
    const max = Math.max(1, ...h.map((a) => Math.max(...a)));
    x.globalCompositeOperation = 'lighter';
    (['#ef4444', '#22c55e', '#3b82f6'] as const).forEach((col, k) => {
      x.fillStyle = col + '99';
      for (let v = 0; v < 256; v++) { const bh = (h[k][v] / max) * 118; x.fillRect(v, 120 - bh, 1, bh); }
    });
    x.globalCompositeOperation = 'source-over';
    x.strokeStyle = '#e5e7eb'; x.beginPath();
    for (let v = 0; v < 256; v++) { const y = 120 - (h[3][v] / max) * 118; v ? x.lineTo(v, y) : x.moveTo(v, y); }
    x.stroke();
  });
  if (!ds) return <div class="empty">No document</div>;
  return (
    <div style={{ padding: 10 }}>
      <canvas ref={ref} width={256} height={120} style={{ width: '100%', height: 120, background: 'var(--bg-0)', borderRadius: 6 }} />
      <div style={{ color: 'var(--muted)', marginTop: 6 }}>RGB channels with luminosity outline</div>
    </div>
  );
}

const SWATCHES = [
  '#000000', '#1f2937', '#4b5563', '#9ca3af', '#d1d5db', '#ffffff', '#7f1d1d', '#dc2626', '#f87171', '#9a3412', '#ea580c', '#fb923c',
  '#a16207', '#eab308', '#fde047', '#3f6212', '#65a30d', '#a3e635', '#065f46', '#059669', '#34d399', '#155e75', '#0891b2', '#67e8f9',
  '#1e3a8a', '#2563eb', '#93c5fd', '#3730a3', '#4f46e5', '#a5b4fc', '#581c87', '#9333ea', '#d8b4fe', '#831843', '#db2777', '#f9a8d4',
];

export function SwatchesPanel() {
  return (
    <div style={{ padding: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
        {SWATCHES.map((c) => (
          <button title={`${c} · click: foreground, Alt-click: background`} style={{ aspectRatio: '1', background: c, border: '1px solid rgba(255,255,255,.12)', borderRadius: 4, padding: 0 }}
            onClick={(e) => { if (e.altKey) bg.value = c; else fg.value = c; }} />
        ))}
      </div>
    </div>
  );
}
