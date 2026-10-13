import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { cur, paint, tick, tool, viewOpts, cursorPos, needsFit, commit, touch, interaction, activeIndex } from '../core/store';
import { useTick, usePaint } from '../core/store';
import { renderDoc, fontString, fitText, renderHooks } from '../core/render';
import { maskMeta, maskEdges, drawQuickMaskOverlay } from '../core/selection';
import { layerMatrix, findLayer } from '../core/util';
import { removeLayers, layerAt } from '../core/ops';
import { toolById, zoomAt, handTool, unrotate } from '../tools';
import { view, textEditing, PEvent, OverlayCtx, cropRect } from '../tools/types';
import { beginTextEdit } from '../tools/vector';
import { viewportSize, fitView, placeFiles, openFiles } from './commands';
import { fileToOpened } from '../core/io';
import type { TextLayer } from '../core/types';

export const spaceDown = signal(false);

/** Document -> CSS-pixel matrix: zoom and pan, then the Rotate View angle around the viewport center. */
export function viewMatrix(v: { zoom: number; panX: number; panY: number; rotation?: number }): DOMMatrix {
  const m = new DOMMatrix();
  if (v.rotation) {
    const cx = view.width / 2, cy = view.height / 2;
    m.translateSelf(cx, cy).rotateSelf(v.rotation).translateSelf(-cx, -cy);
  }
  return m.translateSelf(v.panX, v.panY).scaleSelf(v.zoom);
}

const GUIDE = '#22d3ee';
/** Tool groups that paint, so they get every coalesced pointer event for smooth strokes. */
const COALESCE = new Set(['brush', 'eraser', 'stamp', 'heal', 'historyBrush', 'blurTools', 'dodge']);
let guideDrag: { axis: 'v' | 'h'; pos: number; index: number } | null = null;
const RULER = 18;

export function Viewport() {
  const host = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLCanvasElement>(null);
  const over = useRef<HTMLCanvasElement>(null);
  const [dropping, setDropping] = useState(false);
  const st = useRef({ dragging: false, panning: false, last: null as PEvent | null, dpr: 1, raf: 0, dirty: true });

  // Coordinate helpers shared with tools.
  const setupView = () => {
    const ds = cur();
    const v = ds?.view ?? { zoom: 1, panX: 0, panY: 0 };
    view.zoom = v.zoom;
    const m = viewMatrix(v), inv = m.inverse();
    view.toScreen = (x, y) => { const p = m.transformPoint({ x, y }); return { x: p.x, y: p.y }; };
    view.toDoc = (x, y) => { const p = inv.transformPoint({ x, y }); return { x: p.x, y: p.y }; };
  };

  const drawBase = () => {
    const c = base.current;
    const ds = cur();
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = st.current.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, c.width, c.height);
    if (!ds) return;
    const { zoom } = ds.view;
    const { width: W, height: H } = ds.doc;
    const M = new DOMMatrix().scaleSelf(dpr).multiplySelf(viewMatrix(ds.view));
    ctx.setTransform(M);
    // Page shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 28 * dpr;
    ctx.shadowOffsetY = 6 * dpr;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.setTransform(M);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.imageSmoothingEnabled = zoom < 2;
    renderDoc(ctx, ds.doc, { checker: true });
    ctx.restore();
    if (viewOpts.value.grid && viewOpts.value.extras) {
      const step = niceStep(40 / zoom);
      ctx.strokeStyle = 'rgba(139,92,246,0.22)';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      for (let x = 0; x <= W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y <= H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
    }
  };

  const drawOverlay = (time: number) => {
    const c = over.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = st.current.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const ds = cur();
    if (!ds) return;
    const { zoom } = ds.view;
    const M = new DOMMatrix().scaleSelf(dpr).multiplySelf(viewMatrix(ds.view));
    if (ds.mask && viewOpts.value.extras) {
      const outline = maskMeta(ds.mask).outline;
      ctx.save();
      ctx.setTransform(M);
      if (outline) {
        ctx.lineWidth = 1 / zoom;
        ctx.strokeStyle = '#000';
        ctx.stroke(outline);
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.lineDashOffset = -((time / 60) % 8) / zoom;
        ctx.strokeStyle = '#fff';
        ctx.stroke(outline);
      } else {
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time / 180);
        ctx.filter = 'invert(1)';
        ctx.drawImage(maskEdges(ds.mask), 0, 0);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'difference';
        ctx.drawImage(maskEdges(ds.mask), 0, 0);
      }
      ctx.restore();
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const o: OverlayCtx = { ctx, zoom, toScreen: view.toScreen, time };
    const t = toolById(tool.value)?.tool;
    ctx.save();
    t?.overlay?.(o);
    ctx.restore();
    if (tool.value !== 'move') {
      // Keep a subtle outline of the selected layer visible with other tools.
      const l = ds.selected.length === 1 ? findLayer(ds.doc, ds.selected[0]) : null;
      if (l && l.type !== 'group' && !['brush', 'eraser', 'crop', 'direct', 'pen'].includes(tool.value) && textEditing.value !== l.id) {
        const m = layerMatrix(l);
        ctx.beginPath();
        [[0, 0], [l.w, 0], [l.w, l.h], [0, l.h]].forEach(([x, y], i) => { const p = m.transformPoint({ x, y }); const s = view.toScreen(p.x, p.y); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
        ctx.closePath();
        ctx.strokeStyle = 'rgba(139,92,246,0.55)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    drawQuickMaskOverlay(ctx, ds, M, zoom);
    const g = ds.doc.guides;
    if (viewOpts.value.extras && viewOpts.value.guides && (g?.v.length || g?.h.length || guideDrag)) {
      ctx.save();
      ctx.setTransform(M);
      ctx.strokeStyle = GUIDE;
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      const v = [...(g?.v ?? [])], h = [...(g?.h ?? [])];
      if (guideDrag) {
        const list = guideDrag.axis === 'v' ? v : h;
        if (guideDrag.index >= 0) list[guideDrag.index] = guideDrag.pos; else list.push(guideDrag.pos);
      }
      for (const x of v) { ctx.moveTo(x, -1e5); ctx.lineTo(x, 1e5); }
      for (const y of h) { ctx.moveTo(-1e5, y); ctx.lineTo(1e5, y); }
      ctx.stroke();
      ctx.restore();
    }
    if (viewOpts.value.rulers && !ds.view.rotation) drawRulers(ctx, c.width / dpr, c.height / dpr, ds.view, ds.doc.width, ds.doc.height);
  };

  // Animation loop: base repaints only when asked; overlay animates (marching ants).
  useEffect(() => {
    const loop = (time: number) => {
      setupView();
      if (st.current.dirty) { drawBase(); st.current.dirty = false; }
      drawOverlay(time);
      st.current.raf = requestAnimationFrame(loop);
    };
    st.current.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(st.current.raf);
  }, []);

  useEffect(() => paint.subscribe(() => { st.current.dirty = true; }), []);
  useEffect(() => activeIndex.subscribe(() => { cropRect.value = null; }), []);
  useEffect(() => tick.subscribe(() => { st.current.dirty = true; }), []);

  // Resize with device pixel ratio.
  useEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      st.current.dpr = dpr;
      const r = el.getBoundingClientRect();
      viewportSize.w = r.width; viewportSize.h = r.height;
      view.width = r.width; view.height = r.height;
      for (const c of [base.current!, over.current!]) {
        c.width = Math.round(r.width * dpr);
        c.height = Math.round(r.height * dpr);
        c.style.width = `${r.width}px`;
        c.style.height = `${r.height}px`;
      }
      if (needsFit.value) { needsFit.value = false; fitView(1); }
      st.current.dirty = true;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => needsFit.subscribe((v) => {
    const r = host.current?.getBoundingClientRect();
    if (!v || !r || r.width < 10) return;
    viewportSize.w = r.width; viewportSize.h = r.height;
    needsFit.value = false;
    fitView(1);
  }), []);

  const toEvent = (e: PointerEvent | MouseEvent): PEvent => {
    const r = host.current!.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const p = view.toDoc(sx, sy);
    const pe = e as PointerEvent;
    return {
      x: p.x, y: p.y, sx, sy, shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey,
      button: e.button, pressure: pe.pressure ?? 0.5, pointerType: pe.pointerType ?? 'mouse',
    };
  };

  const activeTool = () => (spaceDown.value || st.current.panning ? handTool : toolById(tool.value).tool);

  const onDown = (e: PointerEvent) => {
    if (!cur()) return;
    host.current!.focus();
    if (textEditing.value) { (document.activeElement as HTMLElement)?.blur?.(); }
    if (e.button === 2) return;
    host.current!.setPointerCapture(e.pointerId);
    const pe = toEvent(e);
    st.current.dragging = true;
    interaction.active = true;
    st.current.panning = e.button === 1 || spaceDown.value;
    if (!st.current.panning && startGuideDrag(pe)) return;
    activeTool().down?.(pe);
    st.current.last = pe;
  };

  const onMove = (e: PointerEvent) => {
    const pe = toEvent(e);
    cursorPos.value = cur() ? { x: Math.floor(pe.x), y: Math.floor(pe.y) } : null;
    const t = activeTool();
    if (guideDrag && st.current.dragging) {
      guideDrag.pos = Math.round(guideDrag.axis === 'v' ? pe.x : pe.y);
      host.current!.style.cursor = guideDrag.axis === 'v' ? 'ew-resize' : 'ns-resize';
      return;
    }
    if (st.current.dragging) {
      // Coalesced events give smooth strokes on fast moves (painting and retouching tools).
      const evs = (e as any).getCoalescedEvents?.() as PointerEvent[] | undefined;
      if (evs && evs.length > 1 && COALESCE.has(toolById(tool.value).group) && !st.current.panning) evs.forEach((ce) => t.move?.(toEvent(ce)));
      else t.move?.(pe);
    } else t.hover?.(pe);
    host.current!.style.cursor = t.cursor?.(pe) ?? 'default';
  };

  const onUp = (e: PointerEvent) => {
    if (!st.current.dragging) return;
    st.current.dragging = false;
    const pe = toEvent(e);
    if (guideDrag) { endGuideDrag(pe); interaction.active = false; return; }
    try { activeTool().up?.(pe); } finally { interaction.active = false; }
    st.current.panning = false;
    try { host.current!.releasePointerCapture(e.pointerId); } catch { /* ok */ }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const ds = cur();
    if (!ds) return;
    const r = host.current!.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey || e.altKey) {
      zoomAt(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0022)), e.clientX - r.left, e.clientY - r.top);
    } else {
      const [dx, dy] = unrotate(e.shiftKey ? e.deltaY : e.deltaX, e.shiftKey ? 0 : e.deltaY, ds.view.rotation);
      ds.view.panX -= dx;
      ds.view.panY -= dy;
      touch(false);
    }
  };

  useEffect(() => {
    const el = host.current!;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onDbl = (e: MouseEvent) => {
    const pe = toEvent(e);
    const t = toolById(tool.value).tool;
    if (t.dbl) return t.dbl(pe);
    if (tool.value === 'move') {
      const l = layerAt(pe.x, pe.y);
      if (l?.type === 'text' && !l.locked) beginTextEdit(l);
    }
  };

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setDropping(false);
    const files = [...(e.dataTransfer?.files ?? [])];
    if (!files.length) return;
    const opened = await Promise.all(files.map(fileToOpened));
    if (cur()) placeFiles(opened); else openFiles(opened);
  };

  return (
    <div
      ref={host}
      class="viewport"
      tabIndex={0}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={() => { cursorPos.value = null; }}
      onDblClick={onDbl}
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={(e) => { e.preventDefault(); setDropping(true); }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      <canvas ref={base} />
      <canvas ref={over} style={{ pointerEvents: 'none' }} />
      <TextEditor />
      {dropping && <div class="drop-hint">Drop images, SVG, PSD or .lucentedit files to {cur() ? 'place them' : 'open them'}</div>}
    </div>
  );
}

/** Ruler drag creates a guide; with the Move tool, dragging an existing guide moves it. */
function startGuideDrag(pe: PEvent): boolean {
  const ds = cur();
  if (!ds || ds.view.rotation) return false;
  const g = (ds.doc.guides ??= { v: [], h: [] });
  if (viewOpts.value.rulers && (pe.sy < RULER || pe.sx < RULER)) {
    if (pe.sy < RULER && pe.sx < RULER) return false;
    guideDrag = pe.sy < RULER ? { axis: 'h', pos: Math.round(pe.y), index: -1 } : { axis: 'v', pos: Math.round(pe.x), index: -1 };
    return true;
  }
  if (tool.value !== 'move' || viewOpts.value.lockGuides || !viewOpts.value.guides) return false;
  const tol = 4 / ds.view.zoom;
  const vi = g.v.findIndex((x) => Math.abs(x - pe.x) < tol);
  if (vi >= 0) { guideDrag = { axis: 'v', pos: g.v[vi], index: vi }; return true; }
  const hi = g.h.findIndex((y) => Math.abs(y - pe.y) < tol);
  if (hi >= 0) { guideDrag = { axis: 'h', pos: g.h[hi], index: hi }; return true; }
  return false;
}

function endGuideDrag(pe: PEvent) {
  const ds = cur(), d = guideDrag;
  guideDrag = null;
  if (!ds || !d) return;
  const g = (ds.doc.guides ??= { v: [], h: [] });
  const list = d.axis === 'v' ? g.v : g.h;
  // Dropping back on a ruler (or outside the view) removes the guide.
  const remove = pe.sx < RULER || pe.sy < RULER;
  if (d.index >= 0) { if (remove) list.splice(d.index, 1); else list[d.index] = d.pos; }
  else if (!remove) list.push(d.pos);
  ds.dirty = true;
  touch();
}

function niceStep(min: number) {
  const p = Math.pow(10, Math.floor(Math.log10(min)));
  for (const m of [1, 2, 5, 10]) if (p * m >= min) return p * m;
  return p * 10;
}

function drawRulers(ctx: CanvasRenderingContext2D, w: number, h: number, v: { zoom: number; panX: number; panY: number }, dw: number, dh: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(17,17,24,0.96)';
  ctx.fillRect(0, 0, w, RULER);
  ctx.fillRect(0, 0, RULER, h);
  ctx.fillStyle = 'rgba(139,92,246,0.18)';
  ctx.fillRect(v.panX, 0, dw * v.zoom, RULER);
  ctx.fillRect(0, v.panY, RULER, dh * v.zoom);
  ctx.strokeStyle = '#30303d';
  ctx.beginPath();
  ctx.moveTo(0, RULER + 0.5); ctx.lineTo(w, RULER + 0.5);
  ctx.moveTo(RULER + 0.5, 0); ctx.lineTo(RULER + 0.5, h);
  ctx.stroke();
  const step = niceStep(70 / v.zoom);
  ctx.fillStyle = '#7d7d92';
  ctx.strokeStyle = '#4a4a5c';
  ctx.font = '9.5px "Inter Variable", system-ui';
  ctx.textBaseline = 'top';
  ctx.beginPath();
  const x0 = Math.floor(-v.panX / v.zoom / step) * step;
  for (let x = x0; x * v.zoom + v.panX < w; x += step) {
    const sx = Math.round(x * v.zoom + v.panX) + 0.5;
    if (sx < RULER) continue;
    ctx.moveTo(sx, 8); ctx.lineTo(sx, RULER);
    ctx.fillText(String(Math.round(x)), sx + 3, 2);
    for (let k = 1; k < 5; k++) { const mx = Math.round((x + (step * k) / 5) * v.zoom + v.panX) + 0.5; ctx.moveTo(mx, 14); ctx.lineTo(mx, RULER); }
  }
  const y0 = Math.floor(-v.panY / v.zoom / step) * step;
  for (let y = y0; y * v.zoom + v.panY < h; y += step) {
    const sy = Math.round(y * v.zoom + v.panY) + 0.5;
    if (sy < RULER) continue;
    ctx.moveTo(8, sy); ctx.lineTo(RULER, sy);
    ctx.save(); ctx.translate(2, sy + 3); ctx.rotate(Math.PI / 2); ctx.textBaseline = 'bottom'; ctx.fillText(String(Math.round(y)), 0, 0); ctx.restore();
    for (let k = 1; k < 5; k++) { const my = Math.round((y + (step * k) / 5) * v.zoom + v.panY) + 0.5; ctx.moveTo(14, my); ctx.lineTo(RULER, my); }
  }
  ctx.stroke();
  const cp = cursorPos.value;
  if (cp) {
    ctx.strokeStyle = '#a78bfa';
    ctx.beginPath();
    const sx = Math.round(cp.x * v.zoom + v.panX) + 0.5, sy = Math.round(cp.y * v.zoom + v.panY) + 0.5;
    ctx.moveTo(sx, 0); ctx.lineTo(sx, RULER);
    ctx.moveTo(0, sy); ctx.lineTo(RULER, sy);
    ctx.stroke();
  }
  ctx.fillStyle = '#111118';
  ctx.fillRect(0, 0, RULER, RULER);
  ctx.restore();
}

/** In-place text editing: a transparent textarea over the canvas; the canvas shows the live text. */
function TextEditor() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = textEditing.value;
  usePaint();
  const ds = cur();
  const l = id && ds ? (findLayer(ds.doc, id) as TextLayer | null) : null;
  const before = useRef<string>('');

  useEffect(() => {
    if (!l || !ref.current) return;
    before.current = l.text;
    ref.current.value = l.text;
    ref.current.focus();
    ref.current.select();
    renderHooks.hideId = null;
  }, [id]);

  if (!l || !ds) return null;
  const m = layerMatrix(l);
  const v = ds.view;
  const t = viewMatrix(v).multiply(m);
  const lh = l.size * l.lineHeight;

  const finish = () => {
    if (textEditing.value !== l.id) return;
    textEditing.value = null;
    if (!l.text.trim()) { removeLayers([l.id], ds); commit('Delete Empty Text'); return; }
    if (l.text !== before.current || ds.history[ds.hIndex].layers.every((x) => x.id !== l.id)) {
      l.name = l.text.split('\n')[0].slice(0, 30) || 'Text';
      commit('Type');
    }
    touch();
  };

  return (
    <textarea
      ref={ref}
      class={`text-editor${l.autoWidth ? '' : ' wrap'}`}
      spellcheck={false}
      style={{
        left: 0, top: 0,
        width: `${Math.max(l.w, 4) + 2}px`,
        height: `${Math.max(l.h, lh)}px`,
        transform: `matrix(${t.a},${t.b},${t.c},${t.d},${t.e},${t.f})`,
        font: fontString(l),
        lineHeight: `${lh}px`,
        letterSpacing: `${l.letterSpacing}px`,
        textAlign: l.align as any,
      }}
      onInput={(e) => {
        l.text = (e.target as HTMLTextAreaElement).value;
        fitText(l);
        touch(false);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); ref.current?.blur(); }
      }}
      onBlur={finish}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );
}
