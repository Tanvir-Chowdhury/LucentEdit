import type { ShapeLayer, AdjustLayer, Effects, SubPath, Gradient, Paint } from './types';
import { normalizePaths, mapPaths, shapeToPaths } from './paths';
import { layerMatrix } from './util';

// Photoshop layer types beyond pixels, both ways: shape layers (vector mask + fill/stroke) as
// editable shapes, adjustment layers as adjustment layers, and drop shadow / outer glow as
// effects. Pure (no DOM), so psdx.check.ts runs it under Node. Data shapes follow ag-psd.

const hex2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
/** ag-psd color ({r,g,b} 0-255 or {fr,fg,fb} 0-1) as #rrggbb. */
export function psdColor(c: any): string {
  if (!c) return '#000000';
  if ('fr' in c) return `#${hex2(c.fr * 255)}${hex2(c.fg * 255)}${hex2(c.fb * 255)}`;
  if ('r' in c) return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
  if ('k' in c) return '#000000';
  return '#808080';
}
export function hexToPsd(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})/i.exec(hex) ?? /^#?([0-9a-f]{3})/i.exec(hex);
  const h = m ? (m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1]) : '000000';
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
const rgba = (hex: string, a: number) => { const c = hexToPsd(hex); return `rgba(${c.r},${c.g},${c.b},${Math.round(a * 1000) / 1000})`; };
const px = (u: any, d = 0) => (typeof u === 'number' ? u : u?.value ?? d);

/** Photoshop gradient fill (vector content) as one of ours. */
function gradientIn(v: any): Gradient | null {
  if (!v?.colorStops?.length) return null;
  const stops = v.colorStops.map((s: any) => ({ offset: Math.max(0, Math.min(1, (s.location ?? 0) / 4096)), color: psdColor(s.color) }));
  return { type: v.style === 'radial' ? 'radial' : 'linear', angle: -(v.angle ?? 90), stops };
}

/** A shape layer (vector mask with a fill or stroke) as an editable shape; null for pixel layers. */
export function psdShapeIn(l: any): Omit<ShapeLayer, 'id' | 'name' | 'visible' | 'locked' | 'opacity' | 'blend'> | null {
  const paths = l.vectorMask?.paths as any[] | undefined;
  if (!paths?.length || (!l.vectorFill && !l.vectorStroke)) return null;
  const subs: SubPath[] = paths.filter((p) => p.knots?.length).map((p) => ({
    closed: !p.open,
    nodes: p.knots.map((k: any) => { const [ix, iy, x, y, ox, oy] = k.points; return { x, y, ix, iy, ox, oy, smooth: !!k.linked }; }),
  }));
  if (!subs.length) return null;
  const n = normalizePaths(subs);
  if (n.w < 0.5 || n.h < 0.5) return null;
  const vf = l.vectorFill, vs = l.vectorStroke;
  const fill: Paint | null = vs?.fillEnabled === false ? null : vf?.type === 'color' ? psdColor(vf.color) : gradientIn(vf) ?? (vf ? '#808080' : null);
  const strokePaint = vs?.content?.type === 'color' ? psdColor(vs.content.color) : gradientIn(vs?.content);
  const stroke = vs?.strokeEnabled && strokePaint ? {
    paint: strokePaint, width: px(vs.lineWidth, 1),
    cap: ({ round: 'round', square: 'square' } as any)[vs.lineCapType] ?? 'butt', join: ({ round: 'round', bevel: 'bevel' } as any)[vs.lineJoinType] ?? 'miter',
    ...(vs.lineDashSet?.length ? { dash: vs.lineDashSet.map((d: any) => px(d) * px(vs.lineWidth, 1)) } : {}),
  } as ShapeLayer['stroke'] : null;
  const subtracts = paths.some((p) => p.operation === 'subtract' || p.operation === 'exclude' || p.fillRule === 'even-odd');
  return {
    type: 'shape', shape: 'path', paths: n.paths, nw: n.w, nh: n.h, x: n.x, y: n.y, w: n.w, h: n.h, rotation: 0,
    fill, stroke, ...(subtracts ? { fillRule: 'evenodd' as const } : {}),
  };
}

/** Our shape as Photoshop vector data (doc-space path, fill, stroke), so it stays a shape layer. */
export function psdShapeOut(l: ShapeLayer) {
  if (typeof l.fill !== 'string' && l.fill !== null) return undefined; // gradient fills: pixels only
  if (l.stroke && typeof l.stroke.paint !== 'string') return undefined;
  const m = layerMatrix(l);
  const doc = mapPaths(shapeToPaths(l), (x, y) => { const p = m.transformPoint({ x, y }); return [p.x, p.y]; });
  const vectorMask = {
    paths: doc.map((sp) => ({
      open: !sp.closed, fillRule: l.fillRule === 'evenodd' ? 'even-odd' : 'non-zero', operation: 'combine',
      knots: sp.nodes.map((nd) => ({ linked: nd.smooth ?? false, points: [nd.ix, nd.iy, nd.x, nd.y, nd.ox, nd.oy] })),
    })),
  };
  const vectorFill = { type: 'color', color: hexToPsd(typeof l.fill === 'string' ? l.fill : '#000000') };
  const s = l.stroke;
  const vectorStroke = {
    strokeEnabled: !!s && s.width > 0, fillEnabled: l.fill !== null,
    lineWidth: { units: 'Pixels', value: s?.width ?? 1 }, lineCapType: s?.cap === 'round' ? 'round' : s?.cap === 'square' ? 'square' : 'butt',
    lineJoinType: s?.join === 'round' ? 'round' : s?.join === 'bevel' ? 'bevel' : 'miter', lineAlignment: 'center', opacity: 1,
    content: { type: 'color', color: hexToPsd(typeof s?.paint === 'string' ? s.paint : '#000000') },
    ...(s?.dash?.length ? { lineDashSet: s.dash.map((d) => ({ units: 'None', value: d / (s.width || 1) })) } : {}),
  };
  return { vectorMask, vectorFill, vectorStroke };
}

/** Photoshop adjustment layer as ours (filter id + params); null when we have no equivalent. */
export function psdAdjustIn(a: any): Pick<AdjustLayer, 'filter' | 'params'> | null {
  const curve = (pts?: { input: number; output: number }[]) => (pts?.length ? pts.map((p) => `${p.input},${p.output}`).join(';') : '0,0;255,255');
  switch (a?.type) {
    case 'brightness/contrast': return { filter: 'brightness-contrast', params: { brightness: a.brightness ?? 0, contrast: a.contrast ?? 0 } };
    case 'levels': { const c = a.rgb ?? {}; return { filter: 'levels', params: { black: c.shadowInput ?? 0, white: c.highlightInput ?? 255, gamma: Math.max(0.1, Math.min(3, c.midtoneInput ?? 1)) } }; }
    case 'curves': return { filter: 'curves', params: { rgb: curve(a.rgb), red: curve(a.red), green: curve(a.green), blue: curve(a.blue) } };
    case 'exposure': return { filter: 'exposure', params: { exposure: a.exposure ?? 0 } };
    case 'vibrance': return { filter: 'vibrance', params: { amount: a.vibrance ?? 0 } };
    case 'hue/saturation': { const m = a.master ?? {}; return { filter: 'hue-saturation', params: { hue: m.hue ?? 0, saturation: m.saturation ?? 0, lightness: m.lightness ?? 0 } }; }
    case 'black & white': return { filter: 'grayscale', params: {} };
    case 'invert': return { filter: 'invert', params: {} };
    case 'posterize': return { filter: 'posterize', params: { levels: a.levels ?? 4 } };
    case 'threshold': return { filter: 'threshold', params: { level: a.level ?? 128 } };
    default: return null;
  }
}

/** Our adjustment layer as a Photoshop adjustment; undefined when Photoshop has no equivalent. */
export function psdAdjustOut(l: Pick<AdjustLayer, 'filter' | 'params'>): any {
  const p = l.params ?? {};
  const curve = (s: unknown) => String(s ?? '0,0;255,255').split(';').map((t) => t.split(',').map(Number)).filter((q) => q.length === 2).map(([input, output]) => ({ input, output }));
  switch (l.filter) {
    case 'brightness-contrast': return { type: 'brightness/contrast', brightness: p.brightness ?? 0, contrast: p.contrast ?? 0 };
    case 'levels': return { type: 'levels', rgb: { shadowInput: p.black ?? 0, highlightInput: p.white ?? 255, shadowOutput: 0, highlightOutput: 255, midtoneInput: p.gamma ?? 1 } };
    case 'curves': return { type: 'curves', rgb: curve(p.rgb), red: curve(p.red), green: curve(p.green), blue: curve(p.blue) };
    case 'exposure': return { type: 'exposure', exposure: p.exposure ?? 0, offset: 0, gamma: 1 };
    case 'vibrance': return { type: 'vibrance', vibrance: p.amount ?? 0, saturation: 0 };
    case 'hue-saturation': return { type: 'hue/saturation', master: { a: 0, b: 0, c: 0, d: 0, hue: p.hue ?? 0, saturation: p.saturation ?? 0, lightness: p.lightness ?? 0 } };
    case 'grayscale': return { type: 'black & white', reds: 40, yellows: 60, greens: 40, cyans: 60, blues: 20, magentas: 80, useTint: false, tintColor: { r: 0, g: 0, b: 0 } };
    case 'invert': return { type: 'invert' };
    case 'posterize': return { type: 'posterize', levels: p.levels ?? 4 };
    case 'threshold': return { type: 'threshold', level: p.level ?? 128 };
    default: return undefined;
  }
}

/** Drop shadow and outer glow (first of each) as our effects. */
export function psdEffectsIn(e: any): Effects | undefined {
  if (!e || e.disabled) return undefined;
  const out: Effects = {};
  const s = e.dropShadow?.find((x: any) => x.enabled !== false);
  if (s) {
    const a = ((s.angle ?? 120) * Math.PI) / 180, d = px(s.distance, 5);
    out.shadow = { enabled: true, color: rgba(psdColor(s.color), s.opacity ?? 0.75), blur: px(s.size, 5), x: Math.round(-Math.cos(a) * d * 100) / 100, y: Math.round(Math.sin(a) * d * 100) / 100 };
  }
  const g = e.outerGlow;
  if (g && g.enabled !== false) out.glow = { enabled: true, color: rgba(psdColor(g.color), g.opacity ?? 0.75), blur: px(g.size, 5) };
  return out.shadow || out.glow ? out : undefined;
}

/** Our effects as Photoshop layer effects. */
export function psdEffectsOut(e: Effects | undefined): any {
  if (!e) return undefined;
  const col = (c: string) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (m) { const [r, g, b, a = 1] = m[1].split(',').map(Number); return { color: { r, g, b }, opacity: a }; } return { color: hexToPsd(c), opacity: 1 }; };
  const out: any = {};
  if (e.shadow?.enabled) {
    const c = col(e.shadow.color);
    out.dropShadow = [{ enabled: true, present: true, showInDialog: true, color: c.color, opacity: c.opacity, blendMode: 'multiply',
      angle: Math.round((Math.atan2(e.shadow.y, -e.shadow.x) * 180) / Math.PI), distance: { units: 'Pixels', value: Math.hypot(e.shadow.x, e.shadow.y) }, size: { units: 'Pixels', value: e.shadow.blur }, useGlobalLight: false }];
  }
  if (e.glow?.enabled) { const c = col(e.glow.color); out.outerGlow = { enabled: true, present: true, showInDialog: true, color: c.color, opacity: c.opacity, blendMode: 'screen', size: { units: 'Pixels', value: e.glow.blur } }; }
  return out.dropShadow || out.outerGlow ? out : undefined;
}
