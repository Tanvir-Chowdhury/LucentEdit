import { useEffect, useRef, useState } from 'preact/hooks';
import { parseCurve, formatCurve, curveLUT } from '../core/filters';
import { clamp } from '../core/util';

// Curves dialog editor: 256x256 graph, one curve per channel stored as "x,y;x,y" in the filter params.
// Click adds a point, drag moves it, double-click or dragging it off the graph deletes it.

const CHANNELS: [string, string, string][] = [['rgb', 'RGB', '#9aa0a6'], ['red', 'Red', '#e5484d'], ['green', 'Green', '#30a46c'], ['blue', 'Blue', '#3e7bfa']];
const N = 256, HIT = 8, OUT = 24;

export function CurvesEditor({ params, onChange }: { params: Record<string, any>; onChange: (key: string, value: string) => void }) {
  const [ch, setCh] = useState('rgb');
  const cv = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ idx: number; pts: [number, number][] } | null>(null);
  const pts = parseCurve(params[ch]);
  const color = CHANNELS.find((c) => c[0] === ch)![2];

  useEffect(() => {
    const x = cv.current!.getContext('2d')!;
    x.clearRect(0, 0, N, N);
    x.strokeStyle = 'rgba(128,128,128,.3)'; x.lineWidth = 1;
    x.beginPath();
    for (let i = 1; i < 4; i++) { const v = Math.round((i * N) / 4) + 0.5; x.moveTo(v, 0); x.lineTo(v, N); x.moveTo(0, v); x.lineTo(N, v); }
    x.moveTo(0, N); x.lineTo(N, 0);
    x.stroke();
    const lut = curveLUT(pts);
    x.strokeStyle = color; x.lineWidth = 2;
    x.beginPath();
    for (let v = 0; v < 256; v++) v ? x.lineTo(v + 0.5, 255.5 - lut[v]) : x.moveTo(0.5, 255.5 - lut[0]);
    x.stroke();
    x.fillStyle = color;
    for (const [px, py] of pts) x.fillRect(px - 3, 255 - py - 3, 7, 7);
  });

  /** Pointer position in curve units (0..255, y up); may fall outside while dragging. */
  const at = (e: PointerEvent | MouseEvent): [number, number] => {
    const r = cv.current!.getBoundingClientRect();
    return [((e.clientX - r.left) * N) / r.width, 255 - ((e.clientY - r.top) * N) / r.height];
  };
  const hit = (list: [number, number][], [x, y]: [number, number]) => list.findIndex((p) => Math.abs(p[0] - x) <= HIT && Math.abs(p[1] - y) <= HIT);
  const emit = (list: [number, number][]) => onChange(ch, formatCurve(list));

  const down = (e: PointerEvent) => {
    const pos = at(e), list = pts.map((p) => [...p] as [number, number]);
    let idx = hit(list, pos);
    if (idx < 0) {
      const x = Math.round(clamp(pos[0], 0, 255));
      if (list.some((p) => p[0] === x)) return;
      list.push([x, Math.round(clamp(pos[1], 0, 255))]);
      list.sort((a, b) => a[0] - b[0]);
      idx = list.findIndex((p) => p[0] === x);
      emit(list);
    }
    drag.current = { idx, pts: list };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = at(e), { idx, pts: list } = d, n = list.length;
    const lo = idx > 0 ? list[idx - 1][0] + 1 : 0, hi = idx < n - 1 ? list[idx + 1][0] - 1 : 255;
    list[idx] = [Math.round(clamp(x, lo, hi)), Math.round(clamp(y, 0, 255))];
    const off = x < -OUT || x > 255 + OUT || y < -OUT || y > 255 + OUT;
    emit(off && n > 2 ? list.filter((_, i) => i !== idx) : list);
  };
  const dbl = (e: MouseEvent) => {
    const i = hit(pts, at(e));
    if (i >= 0 && pts.length > 2) emit(pts.filter((_, j) => j !== i));
  };

  return (
    <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
      <div class="row" style={{ gap: 8, alignItems: 'center' }}>
        <label>Channel</label>
        <select value={ch} onChange={(e) => setCh((e.target as HTMLSelectElement).value)}>{CHANNELS.map(([k, label]) => <option value={k}>{label}</option>)}</select>
        <button class="btn ghost" onClick={() => onChange(ch, '0,0;255,255')}>Reset channel</button>
      </div>
      <canvas
        ref={cv} width={N} height={N}
        style={{ width: N, height: N, border: '1px solid var(--line-2)', borderRadius: 4, cursor: 'crosshair', touchAction: 'none' }}
        onPointerDown={down} onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)} onDblClick={dbl}
      />
      <span class="sub" style={{ opacity: 0.7, fontSize: 11 }}>Click to add a point, drag to move, double-click or drag off the graph to delete.</span>
    </div>
  );
}
