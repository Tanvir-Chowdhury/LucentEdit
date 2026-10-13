import type { Doc, Layer, Paint, ShapeLayer, TextLayer, Stroke, AdjustLayer } from './types';
import { shapePath2D } from './paths';
import { layerMatrix, makeCanvas, ctx2d } from './util';

// Canvas2D renderer shared by the viewport, thumbnails, export and MCP previews.

export const renderHooks = {
  hideId: null as string | null,
  /** Set by filters.ts: runs a point filter on pixels (kept as a hook to avoid an import cycle). */
  adjust: null as null | ((img: ImageData, filter: string, params: Record<string, any>) => void),
};

export function fontString(l: Pick<TextLayer, 'italic' | 'weight' | 'size' | 'family'>) {
  const fam = /[\s,]/.test(l.family) && !/["']/.test(l.family) && !l.family.includes(',') ? `"${l.family}"` : l.family;
  return `${l.italic ? 'italic ' : ''}${l.weight} ${l.size}px ${fam}, sans-serif`;
}

let measureCtx: CanvasRenderingContext2D | null = null;
const mctx = () => (measureCtx ??= ctx2d(makeCanvas(4, 4)));

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${px}px`;
}

/** Break text into lines; wraps at the box width for paragraph text. */
export function layoutText(l: TextLayer): string[] {
  const ctx = mctx();
  ctx.font = fontString(l);
  setSpacing(ctx, l.letterSpacing);
  const raw = l.text.split('\n');
  if (l.autoWidth) return raw;
  const lines: string[] = [];
  for (const para of raw) {
    const words = para.split(/(\s+)/);
    let line = '';
    for (const w of words) {
      const test = line + w;
      if (line && ctx.measureText(test).width > l.w) {
        lines.push(line.trimEnd());
        line = w.trimStart();
      } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

/** Recompute a text layer's box from its content. */
export function fitText(l: TextLayer) {
  const lines = layoutText(l);
  if (l.autoWidth) {
    const ctx = mctx();
    ctx.font = fontString(l);
    setSpacing(ctx, l.letterSpacing);
    const oldW = l.w;
    l.w = Math.max(4, Math.ceil(Math.max(...lines.map((s) => ctx.measureText(s).width)))) + 2;
    // Keep the anchor edge fixed when width changes.
    if (l.align === 'center') l.x += (oldW - l.w) / 2;
    else if (l.align === 'right') l.x += oldW - l.w;
  }
  l.h = Math.max(1, Math.ceil(lines.length * l.size * l.lineHeight));
}

export function paintStyle(ctx: CanvasRenderingContext2D, p: Paint, w: number, h: number): string | CanvasGradient {
  if (typeof p === 'string') return p;
  let g: CanvasGradient;
  if (p.type === 'radial') {
    g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
  } else {
    const a = ((p.angle ?? 0) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
    const half = (Math.abs(w * cos) + Math.abs(h * sin)) / 2;
    g = ctx.createLinearGradient(w / 2 - cos * half, h / 2 - sin * half, w / 2 + cos * half, h / 2 + sin * half);
  }
  for (const s of p.stops) {
    try { g.addColorStop(Math.min(1, Math.max(0, s.offset)), s.color); } catch { /* bad color */ }
  }
  return g;
}

function applyStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
  ctx.strokeStyle = paintStyle(ctx, s.paint, w, h);
  ctx.lineWidth = s.width;
  ctx.lineCap = s.cap ?? 'butt';
  ctx.lineJoin = s.join ?? 'miter';
  ctx.setLineDash(s.dash ?? []);
}

/** Draw the layer's own pixels/geometry in its local box (no opacity, blend or effects). */
export function drawContent(ctx: CanvasRenderingContext2D, l: Layer) {
  if (l.type === 'raster') {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(l.canvas, 0, 0, l.w, l.h);
  } else if (l.type === 'shape') drawShape(ctx, l);
  else if (l.type === 'text') drawText(ctx, l);
}

function drawShape(ctx: CanvasRenderingContext2D, l: ShapeLayer) {
  const p = shapePath2D(l);
  if (l.fill) {
    ctx.fillStyle = paintStyle(ctx, l.fill, l.w, l.h);
    ctx.fill(p, l.fillRule ?? 'nonzero');
  }
  if (l.stroke && l.stroke.width > 0) {
    applyStroke(ctx, l.stroke, l.w, l.h);
    ctx.stroke(p);
  }
}

function drawText(ctx: CanvasRenderingContext2D, l: TextLayer) {
  const lines = layoutText(l);
  ctx.font = fontString(l);
  setSpacing(ctx, l.letterSpacing);
  ctx.textBaseline = 'middle';
  ctx.textAlign = l.align;
  const lh = l.size * l.lineHeight;
  const x = l.align === 'center' ? l.w / 2 : l.align === 'right' ? l.w : 0;
  ctx.fillStyle = paintStyle(ctx, l.fill, l.w, l.h);
  if (l.stroke && l.stroke.width > 0) applyStroke(ctx, l.stroke, l.w, l.h);
  lines.forEach((s, i) => {
    const y = i * lh + lh / 2;
    if (l.stroke && l.stroke.width > 0) ctx.strokeText(s, x, y);
    ctx.fillText(s, x, y);
  });
  setSpacing(ctx, 0);
}

/** Draws only the shadow of `l`, by drawing the content far away and offsetting the shadow back. */
function drawShadowOnly(ctx: CanvasRenderingContext2D, l: Layer, color: string, blur: number, dx: number, dy: number) {
  const K = 100000;
  const m = ctx.getTransform();
  const scale = Math.hypot(m.a, m.b);
  ctx.save();
  ctx.translate(-K, 0);
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * scale;
  // Shadow offsets are in device pixels: undo the local -K shift, then add the effect offset.
  ctx.shadowOffsetX = m.a * K + dx * scale;
  ctx.shadowOffsetY = m.b * K + dy * scale;
  drawContent(ctx, l);
  ctx.restore();
}

export function drawLayer(ctx: CanvasRenderingContext2D, l: Layer) {
  if (!l.visible || l.opacity <= 0 || l.id === renderHooks.hideId) return;
  if (l.mask?.enabled) {
    // Render in isolation, cut with the mask, then composite with opacity and blend.
    const off = isolate(ctx, (o) => drawLayer(o, { ...l, mask: undefined, opacity: 1, blend: 'normal' } as Layer));
    const o = ctx2d(off);
    o.setTransform(ctx.getTransform());
    o.globalCompositeOperation = 'destination-in';
    o.drawImage(l.mask.canvas, l.mask.x, l.mask.y);
    composite(ctx, off, l.opacity, l.blend);
    return;
  }
  ctx.save();
  ctx.globalAlpha *= l.opacity;
  ctx.globalCompositeOperation = l.blend === 'normal' ? 'source-over' : l.blend;
  if (l.type === 'group') {
    if (l.opacity < 1 || l.blend !== 'normal') {
      // Composite the group in isolation so opacity/blend apply to the whole.
      const off = isolate(ctx, (o) => drawLayers(o, l.children));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(off, 0, 0);
    } else drawLayers(ctx, l.children);
    ctx.restore();
    return;
  }
  const m = layerMatrix(l);
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  const fx = l.effects;
  if (fx?.glow?.enabled) drawShadowOnly(ctx, l, fx.glow.color, fx.glow.blur, 0, 0);
  if (fx?.shadow?.enabled) drawShadowOnly(ctx, l, fx.shadow.color, fx.shadow.blur, fx.shadow.x, fx.shadow.y);
  drawContent(ctx, l);
  ctx.restore();
}

/** Draw `fn` into a fresh canvas the size of ctx with the same transform. */
function isolate(ctx: CanvasRenderingContext2D, fn: (o: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const off = makeCanvas(ctx.canvas.width, ctx.canvas.height);
  const o = ctx2d(off);
  o.setTransform(ctx.getTransform());
  o.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
  fn(o);
  return off;
}

function composite(ctx: CanvasRenderingContext2D, off: HTMLCanvasElement, opacity: number, blend: Layer['blend']) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= opacity;
  ctx.globalCompositeOperation = blend === 'normal' ? 'source-over' : blend;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}

/** Draw a stack bottom-to-top, handling clipping masks (clipped layers show only over their base). */
/** Apply an adjustment layer to what is already drawn in ctx, inside its box, mask and opacity. */
let adjustScratch: HTMLCanvasElement | null = null;

/**
 * Apply an adjustment layer to what is already drawn in ctx. Only the device-space area of the
 * layer's box (the document) is read back, and one scratch canvas is reused across frames.
 */
function applyAdjust(ctx: CanvasRenderingContext2D, l: AdjustLayer) {
  if (!l.visible || l.opacity <= 0 || !renderHooks.adjust) return;
  const m = ctx.getTransform();
  const pts = [[l.x, l.y], [l.x + l.w, l.y], [l.x + l.w, l.y + l.h], [l.x, l.y + l.h]].map(([x, y]) => m.transformPoint({ x, y }));
  const x0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.x)))), y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.y))));
  const x1 = Math.min(ctx.canvas.width, Math.ceil(Math.max(...pts.map((p) => p.x)))), y1 = Math.min(ctx.canvas.height, Math.ceil(Math.max(...pts.map((p) => p.y))));
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const img = ctx.getImageData(x0, y0, w, h);
  renderHooks.adjust(img, l.filter, l.params);
  if (!adjustScratch || adjustScratch.width < w || adjustScratch.height < h) adjustScratch = makeCanvas(Math.max(w, adjustScratch?.width ?? 0), Math.max(h, adjustScratch?.height ?? 0));
  const a = ctx2d(adjustScratch);
  a.setTransform(1, 0, 0, 1, 0, 0);
  a.globalCompositeOperation = 'copy';
  a.putImageData(img, 0, 0);
  if (l.mask?.enabled) {
    a.setTransform(new DOMMatrix().translateSelf(-x0, -y0).multiplySelf(m));
    a.globalCompositeOperation = 'destination-in';
    a.drawImage(l.mask.canvas, l.mask.x, l.mask.y);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= l.opacity;
  ctx.globalCompositeOperation = l.blend === 'normal' ? 'source-over' : l.blend;
  // The caller's clip (document bounds) keeps the workspace around the page untouched.
  ctx.drawImage(adjustScratch, 0, 0, w, h, x0, y0, w, h);
  ctx.restore();
}

export function drawLayers(ctx: CanvasRenderingContext2D, layers: Layer[]) {
  for (let i = 0; i < layers.length; i++) {
    const base = layers[i];
    if (base.type === 'adjust') { applyAdjust(ctx, base); continue; }
    let j = i + 1;
    while (j < layers.length && layers[j].clip) j++;
    if (j === i + 1 || !base.visible) {
      drawLayer(ctx, base);
      i = j - 1;
      continue;
    }
    const off = isolate(ctx, (o) => {
      drawLayer(o, { ...base, opacity: 1, blend: 'normal' } as Layer);
      for (let k = i + 1; k < j; k++) {
        const c = layers[k];
        if (!c.visible) continue;
        if (c.type === 'adjust') { applyAdjust(o, c); continue; }
        // source-atop keeps the base's alpha: clipped layers only paint over the base.
        const clipped = isolate(o, (x) => drawLayer(x, { ...c, blend: 'normal' } as Layer));
        o.save();
        o.setTransform(1, 0, 0, 1, 0, 0);
        o.globalCompositeOperation = 'source-atop';
        o.drawImage(clipped, 0, 0);
        o.restore();
      }
    });
    composite(ctx, off, base.opacity, base.blend);
    i = j - 1;
  }
}

let checker: CanvasPattern | null = null;
export function checkerPattern(ctx: CanvasRenderingContext2D) {
  if (checker) return checker;
  const c = makeCanvas(16, 16), x = ctx2d(c);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#d9dce3'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8);
  return (checker = ctx.createPattern(c, 'repeat')!);
}

/** Draw background + layers in document coordinates (caller sets the transform). */
export function renderDoc(ctx: CanvasRenderingContext2D, doc: Doc, opts: { checker?: boolean } = {}) {
  ctx.save();
  if (doc.background) {
    ctx.fillStyle = doc.background;
    ctx.fillRect(0, 0, doc.width, doc.height);
  } else if (opts.checker) {
    ctx.fillStyle = checkerPattern(ctx);
    ctx.fillRect(0, 0, doc.width, doc.height);
    // Adjustments must not tint the transparency checkerboard: render the stack in isolation.
    if (doc.layers.some((l) => l.type === 'adjust')) {
      composite(ctx, isolate(ctx, (o) => drawLayers(o, doc.layers)), 1, 'normal');
      ctx.restore();
      return;
    }
  }
  drawLayers(ctx, doc.layers);
  ctx.restore();
}

/** Flatten the document into a new canvas. */
export function flatten(doc: Doc, scale = 1, background = true): HTMLCanvasElement {
  const c = makeCanvas(doc.width * scale, doc.height * scale);
  const ctx = ctx2d(c);
  ctx.scale(scale, scale);
  renderDoc(ctx, background ? doc : { ...doc, background: null });
  return c;
}

/** Render one layer (with effects) into a document-sized canvas. */
export function renderLayerToDocCanvas(doc: Doc, l: Layer): HTMLCanvasElement {
  const c = makeCanvas(doc.width, doc.height);
  drawLayer(ctx2d(c), { ...l, visible: true, opacity: 1, blend: 'normal' } as Layer);
  return c;
}

export function thumbnail(l: Layer, size = 40): HTMLCanvasElement {
  const c = makeCanvas(size, size);
  const ctx = ctx2d(c);
  const s = Math.min(size / Math.max(1, l.w), size / Math.max(1, l.h));
  ctx.translate((size - l.w * s) / 2, (size - l.h * s) / 2);
  ctx.scale(s, s);
  if (l.type === 'group') {
    ctx.translate(-l.x, -l.y);
    drawLayers(ctx, l.children);
  } else drawContent(ctx, l);
  return c;
}
