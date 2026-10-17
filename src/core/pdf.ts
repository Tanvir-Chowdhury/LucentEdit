import type { Doc, Layer, Paint, ShapeLayer, TextLayer, Gradient } from './types';
import { shapeToPaths } from './paths';
import { layerMatrix, makeCanvas, ctx2d } from './util';
import { flatten, renderLayerToDocCanvas, layoutText, fontString } from './render';
import { psFontToCss, cssToPsFont } from './fontnames';
export { psFontToCss, cssToPsFont };

// Adobe Illustrator (.ai) and PDF. Illustrator saves .ai files as PDF documents by default
// ("Create PDF Compatible File"), and opens a PDF saved as .ai as editable artwork. So:
// - Opening: pdf.js reads the first page's vector drawing, which becomes SVG for importSvg.
// - Saving: a small vector PDF writer. Shapes stay paths, text stays text (by font name), and
//   anything PDF can't express (masks, effects, adjustment layers) is embedded as an image.

// ---------------------------------------------------------------- Opening (.ai / .pdf)

type M6 = [number, number, number, number, number, number];
const mul = (m: M6, n: M6): M6 => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: M6, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const r2 = (v: number) => Math.round(v * 100) / 100;
const escXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** First page of a PDF / PDF-compatible .ai as SVG text (paths, images, live text). */
export async function pdfToSvg(bytes: Uint8Array): Promise<{ svg: string; pages: number }> {
  const head = new TextDecoder().decode(bytes.slice(0, 1024));
  if (!head.includes('%PDF')) {
    throw new Error(head.startsWith('%!PS') ? 'This .ai file was saved without PDF compatibility. In Illustrator, save it again with "Create PDF Compatible File" turned on.' : 'Not a PDF or PDF-compatible .ai file');
  }
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const W = Math.round(vp.width), H = Math.round(vp.height);
  const base = vp.transform as M6;
  const ops = await page.getOperatorList();
  const { OPS } = pdfjs;
  const out: string[] = [];
  const defs: string[] = [];
  type St = { ctm: M6; fill: string; stroke: string; fa: number; sa: number; lw: number; cap: number; join: number; dash: number[]; fillPat?: string; clip?: { d: string; box: Box }; font?: string; size: number; leading: number };
  let st: St = { ctm: [1, 0, 0, 1, 0, 0], fill: '#000000', stroke: '#000000', fa: 1, sa: 1, lw: 1, cap: 0, join: 0, dash: [], size: 12, leading: 0 };
  const stack: St[] = [];
  let pendingClip = false, gid = 0;
  // Transparency groups: the opacity in effect when a group starts applies to all of it.
  let groupAlpha = 1;
  const groupStack: number[] = [];
  // Text drawing ops carry color and font; getTextContent carries the strings. Each text piece
  // takes the style of the run drawn closest to where it starts.
  const textRuns: { fill: string; fa: number; font?: string; x: number; y: number }[] = [];
  let tm: M6 = [1, 0, 0, 1, 0, 0], tlm: M6 = [1, 0, 0, 1, 0, 0];
  const hex = (a: any[]) => (typeof a[0] === 'string' ? a[0] : `#${a.slice(0, 3).map((v: number) => Math.round(v).toString(16).padStart(2, '0')).join('')}`);
  type Box = [number, number, number, number];
  /** SVG path data in page px, plus its bounding box (control points included: close enough). */
  const pathD = (data: ArrayLike<number>, m: M6): { d: string; box: Box } => {
    let d = '';
    const box: Box = [Infinity, Infinity, -Infinity, -Infinity];
    const pt = (x: number, y: number) => { const [px, py] = apply(m, x, y); box[0] = Math.min(box[0], px); box[1] = Math.min(box[1], py); box[2] = Math.max(box[2], px); box[3] = Math.max(box[3], py); return [px, py]; };
    for (let i = 0; i < data.length;) {
      const op = data[i++];
      if (op === 0 || op === 1) { const [x, y] = pt(data[i++], data[i++]); d += `${op ? 'L' : 'M'}${r2(x)} ${r2(y)}`; }
      else if (op === 2) { const p = [0, 1, 2].map(() => pt(data[i++], data[i++])); d += `C${p.flat().map(r2).join(' ')}`; }
      else if (op === 3) { const p = [0, 1].map(() => pt(data[i++], data[i++])); d += `Q${p.flat().map(r2).join(' ')}`; }
      else if (op === 4) d += 'Z';
      else break;
    }
    return { d, box };
  };
  /** a covers b, give or take 2% (clip circles often overhang their square by a fraction of a px). */
  const covers = (a: Box, b: Box) => {
    const t = Math.max(1, 0.02 * Math.max(b[2] - b[0], b[3] - b[1]));
    return a[0] <= b[0] + t && a[1] <= b[1] + t && a[2] >= b[2] - t && a[3] >= b[3] - t;
  };
  const gradient = (ir: any[], m: M6): string | undefined => {
    if (!Array.isArray(ir) || ir[0] !== 'RadialAxial') return undefined;
    const [, kind, , stops, p0, p1, r0, r1] = ir;
    const id = `g${gid++}`;
    const stopsXml = (stops as [number, string][]).map(([o, c]) => `<stop offset="${r2(o)}" stop-color="${c}"/>`).join('');
    const t = `matrix(${m.map(r2).join(' ')})`;
    defs.push(kind === 'axial'
      ? `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" gradientTransform="${t}" x1="${p0[0]}" y1="${p0[1]}" x2="${p1[0]}" y2="${p1[1]}">${stopsXml}</linearGradient>`
      : `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" gradientTransform="${t}" fx="${p0[0]}" fy="${p0[1]}" cx="${p1[0]}" cy="${p1[1]}" r="${r1 ?? r0}">${stopsXml}</radialGradient>`);
    return `url(#${id})`;
  };

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i], a = ops.argsArray[i] as any[];
    switch (fn) {
      case OPS.save: stack.push({ ...st, dash: [...st.dash] }); break;
      case OPS.restore: st = stack.pop() ?? st; break;
      case OPS.transform: st.ctm = mul(st.ctm, a as M6); break;
      case OPS.setFillRGBColor: st.fill = hex(a); st.fillPat = undefined; break;
      case OPS.setStrokeRGBColor: st.stroke = hex(a); break;
      case OPS.setFillTransparent: st.fill = 'none'; break;
      case OPS.setStrokeTransparent: st.stroke = 'none'; break;
      case OPS.setFillColorN: {
        // ["Shading", objId, matrix]: the pattern matrix maps pattern space to the page, not the CTM.
        // Tiling patterns (textures) become their first color: close enough, and still editable.
        if (a[0] === 'TilingPattern') {
          const t = a[2]?.argsArray?.[(a[2]?.fnArray as number[] | undefined)?.indexOf(OPS.setFillRGBColor) ?? -1];
          st.fillPat = t ? hex(t) : 'none';
          break;
        }
        const ir = await objGet(page, a[1]);
        st.fillPat = (ir ? gradient(ir as any[], mul(base, (a[2] ?? [1, 0, 0, 1, 0, 0]) as M6)) : undefined) ?? 'none';
        break;
      }
      case OPS.paintFormXObjectBegin: stack.push({ ...st, dash: [...st.dash] }); if (a[0]) st.ctm = mul(st.ctm, Array.from(a[0] as number[]) as M6); break;
      case OPS.paintFormXObjectEnd: st = stack.pop() ?? st; break;
      case OPS.beginGroup: groupStack.push(groupAlpha); groupAlpha *= st.fa; st.fa = st.sa = 1; break;
      case OPS.endGroup: groupAlpha = groupStack.pop() ?? 1; break;
      case OPS.setLineWidth: st.lw = a[0]; break;
      case OPS.setLineCap: st.cap = a[0]; break;
      case OPS.setLineJoin: st.join = a[0]; break;
      case OPS.setDash: st.dash = a[0] ?? []; break;
      case OPS.setGState: for (const [k, v] of a[0] ?? []) { if (k === 'ca') st.fa = v; if (k === 'CA') st.sa = v; if (k === 'LW') st.lw = v; } break;
      case OPS.setFont: st.font = a[0]; st.size = a[1]; break;
      case OPS.clip: case OPS.eoClip: pendingClip = true; break;
      case OPS.beginText: tm = tlm = [1, 0, 0, 1, 0, 0]; break;
      case OPS.setTextMatrix: tm = tlm = (Array.isArray(a[0]) || ArrayBuffer.isView(a[0]) ? Array.from(a[0] as number[]) : a) as M6; break;
      case OPS.moveText: tm = tlm = mul(tlm, [1, 0, 0, 1, a[0], a[1]]); break;
      case OPS.setLeadingMoveText: st.leading = -a[1]; tm = tlm = mul(tlm, [1, 0, 0, 1, a[0], a[1]]); break;
      case OPS.setLeading: st.leading = a[0]; break;
      case OPS.nextLine: tm = tlm = mul(tlm, [1, 0, 0, 1, 0, -st.leading]); break;
      case OPS.showText: case OPS.showSpacedText: case OPS.nextLineShowText: case OPS.nextLineSetSpacingShowText: {
        if (fn === OPS.nextLineShowText || fn === OPS.nextLineSetSpacingShowText) tm = tlm = mul(tlm, [1, 0, 0, 1, 0, -st.leading]);
        const [x, y] = apply(mul(base, mul(st.ctm, tm)), 0, 0);
        textRuns.push({ fill: st.fill, fa: st.fa * groupAlpha, font: st.font, x, y });
        break;
      }
      case OPS.shadingFill: {
        // Illustrator gradients: a clipping path, then "sh". Fill the clip with the gradient.
        const g = gradient((await objGet(page, a[0])) as any[], mul(base, st.ctm));
        if (g && st.clip) out.push(`<path d="${st.clip.d}" fill="${g}"${st.fa * groupAlpha < 1 ? ` fill-opacity="${r2(st.fa * groupAlpha)}"` : ''}/>`);
        break;
      }
      case OPS.constructPath: {
        const [op, [data]] = a;
        const m = mul(base, st.ctm);
        const geo = data ? pathD(data, m) : null;
        if (!geo?.d) break;
        if (pendingClip) { st.clip = geo; pendingClip = false; }
        // Illustrator clip groups: a shape that covers its clipping path shows only the clip's shape.
        const d = st.clip && st.clip.d !== geo.d && covers(geo.box, st.clip.box) ? st.clip.d : geo.d;
        const fill = [OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke].includes(op);
        const stroke = [OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke].includes(op);
        if (!fill && !stroke) break;
        const scale = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
        const attrs = [
          `fill="${fill ? st.fillPat ?? st.fill : 'none'}"`,
          fill && st.fa * groupAlpha < 1 ? `fill-opacity="${r2(st.fa * groupAlpha)}"` : '',
          [OPS.eoFill, OPS.eoFillStroke, OPS.closeEOFillStroke].includes(op) ? 'fill-rule="evenodd"' : '',
          stroke ? `stroke="${st.stroke}" stroke-width="${r2(Math.max(0.1, st.lw * scale))}"` : '',
          stroke && st.sa * groupAlpha < 1 ? `stroke-opacity="${r2(st.sa * groupAlpha)}"` : '',
          stroke && st.cap ? `stroke-linecap="${['butt', 'round', 'square'][st.cap]}"` : '',
          stroke && st.join ? `stroke-linejoin="${['miter', 'round', 'bevel'][st.join]}"` : '',
          stroke && st.dash.length ? `stroke-dasharray="${st.dash.map((v) => r2(v * scale)).join(' ')}"` : '',
        ].filter(Boolean).join(' ');
        out.push(`<path d="${d}" ${attrs}/>`);
        break;
      }
      case OPS.paintImageXObject: case OPS.paintInlineImageXObject: {
        const img = fn === OPS.paintImageXObject ? await objGet(page, a[0]) : a[0];
        const url = imageDataURL(img);
        if (!url) break;
        // Images fill the unit square, flipped (PDF images are bottom-up).
        const m = mul(mul(base, st.ctm), [1, 0, 0, -1, 0, 1]);
        const p = [apply(m, 0, 0), apply(m, 1, 0), apply(m, 1, 1), apply(m, 0, 1)];
        const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
        const x = Math.min(...xs), y = Math.min(...ys);
        out.push(`<image href="${url}" x="${r2(x)}" y="${r2(y)}" width="${r2(Math.max(...xs) - x)}" height="${r2(Math.max(...ys) - y)}" preserveAspectRatio="none"${st.fa * groupAlpha < 1 ? ` opacity="${r2(st.fa * groupAlpha)}"` : ''}/>`);
        break;
      }
    }
  }

  // Live text: positions from the text layer, colors and font names from the drawing ops above.
  const text = await page.getTextContent();
  for (const it of text.items as any[]) {
    if (!it.str?.trim()) continue;
    const m = mul(base, it.transform as M6);
    // Nearest run on the same baseline at or before the piece's start (else simply the nearest).
    let r = textRuns[0] ?? { fill: '#000000', fa: 1, x: 0, y: 0 }, best = Infinity;
    for (const t of textRuns) {
      const dy = Math.abs(t.y - m[5]), dx = m[4] - t.x;
      const d = dy * 4 + (dx >= -0.5 ? dx : 1000 - dx);
      if (d < best) { best = d; r = t; }
    }
    const size = Math.hypot(m[2], m[3]);
    let fontName = '';
    try { fontName = r.font ? ((await objGet(page, r.font, true)) as any)?.name ?? '' : ''; } catch { /* unknown font */ }
    const f = fontName ? psFontToCss(fontName) : { family: text.styles[it.fontName]?.fontFamily ?? 'sans-serif', weight: 400, italic: false };
    out.push(`<text x="${r2(m[4])}" y="${r2(m[5])}" font-family="${escXml(f.family)}" font-size="${r2(size)}" font-weight="${f.weight}"${f.italic ? ' font-style="italic"' : ''} fill="${r.fill === 'none' ? '#000000' : r.fill}"${r.fa < 1 ? ` fill-opacity="${r.fa}"` : ''}>${escXml(it.str)}</text>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join('')}</defs>${out.join('')}</svg>`;
  return { svg, pages: pdf.numPages };
}

function objGet(page: any, id: string, common = false): Promise<unknown> {
  const objs = common || id.startsWith('g_') ? page.commonObjs : page.objs;
  return new Promise((resolve) => { try { objs.get(id, resolve); } catch { resolve(null); } });
}

function imageDataURL(img: any): string | null {
  if (!img) return null;
  const c = makeCanvas(img.width, img.height), x = ctx2d(c);
  if (img.bitmap) x.drawImage(img.bitmap, 0, 0);
  else if (img.data) {
    const id = x.createImageData(img.width, img.height), src = img.data as Uint8ClampedArray;
    if (src.length === img.width * img.height * 4) id.data.set(src);
    else for (let p = 0, q = 0; q < src.length; p += 4, q += 3) { id.data[p] = src[q]; id.data[p + 1] = src[q + 1]; id.data[p + 2] = src[q + 2]; id.data[p + 3] = 255; }
    x.putImageData(id, 0, 0);
  } else return null;
  return c.toDataURL('image/png');
}

// ---------------------------------------------------------------- Saving (.ai / .pdf)

const enc = new TextEncoder();
async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const s = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
const n = (v: number) => (Math.abs(v) < 1e-6 ? '0' : String(Math.round(v * 1000) / 1000));

let colorCtx: CanvasRenderingContext2D | null = null;
/** Any CSS color as [r, g, b] in 0..1 plus alpha. */
export function cssToRgb(c: string): [number, number, number, number] {
  colorCtx ??= ctx2d(makeCanvas(1, 1));
  colorCtx.clearRect(0, 0, 1, 1);
  colorCtx.fillStyle = '#000';
  colorCtx.fillStyle = c;
  colorCtx.fillRect(0, 0, 1, 1);
  const d = colorCtx.getImageData(0, 0, 1, 1).data;
  const a = d[3] / 255;
  return a ? [d[0] / 255 / a, d[1] / 255 / a, d[2] / 255 / a, a].map((v, i) => (i < 3 ? Math.min(1, v) : v)) as any : [0, 0, 0, 0];
}

const BLEND: Record<string, string> = {
  multiply: 'Multiply', screen: 'Screen', overlay: 'Overlay', darken: 'Darken', lighten: 'Lighten', 'color-dodge': 'ColorDodge', 'color-burn': 'ColorBurn',
  'hard-light': 'HardLight', 'soft-light': 'SoftLight', difference: 'Difference', exclusion: 'Exclusion', hue: 'Hue', saturation: 'Saturation', color: 'Color', luminosity: 'Luminosity',
};
/** WinAnsi text string for a PDF content stream, or null if it has characters WinAnsi lacks. */
function pdfString(s: string): string | null {
  const map: Record<string, number> = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '•': 0x95, '–': 0x96, '—': 0x97, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '™': 0x99 };
  let out = '';
  for (const ch of s) {
    const c = map[ch] ?? ch.charCodeAt(0);
    if (ch.length > 1 || (c > 0xff && !map[ch]) || (c < 0x20)) return null;
    out += c === 0x28 || c === 0x29 || c === 0x5c ? `\\${String.fromCharCode(c)}` : c > 0x7e ? `\\${c.toString(8).padStart(3, '0')}` : String.fromCharCode(c);
  }
  return `(${out})`;
}

const hasAlphaStops = (p: Paint | null | undefined) => typeof p === 'object' && !!p && p.stops.some((s) => cssToRgb(s.color)[3] < 0.999);
/** Layers PDF can't express as vectors: embedded as an image of the layer. */
function needsRaster(l: Layer): boolean {
  if (l.type === 'raster' || l.type === 'smart' || l.type === 'adjust') return true;
  if (l.mask?.enabled || l.clip || l.effects?.shadow?.enabled || l.effects?.glow?.enabled) return true;
  if (l.type === 'shape') return hasAlphaStops(l.fill) || hasAlphaStops(l.stroke?.paint);
  if (l.type === 'text') return typeof l.fill !== 'string' || !!(l.stroke && l.stroke.width > 0) || l.text.split('\n').some((t) => pdfString(t) === null);
  if (l.type === 'group') return l.children.some((c) => c.type === 'adjust');
  return false;
}

export async function docToPdf(doc: Doc): Promise<Uint8Array> {
  const W = doc.width, H = doc.height;
  const objects: (Uint8Array | null)[] = [null, null, null]; // 1 catalog, 2 pages, 3 page
  const add = (b: Uint8Array) => { objects.push(b); return objects.length; };
  const addStream = async (dict: string, data: Uint8Array) => {
    const z = await deflate(data);
    return add(concat(enc.encode(`<< ${dict} /Length ${z.length} /Filter /FlateDecode >>\nstream\n`), z, enc.encode('\nendstream')));
  };
  const fonts = new Map<string, string>(), gstates = new Map<string, string>(), xobjects: string[] = [], patterns: string[] = [];
  const fontRef = (ps: string) => {
    if (!fonts.has(ps)) fonts.set(ps, `/F${fonts.size + 1} ${add(enc.encode(`<< /Type /Font /Subtype /Type1 /BaseFont /${ps} /Encoding /WinAnsiEncoding >>`))} 0 R`);
    return fonts.get(ps)!.split(' ')[0];
  };
  const gs = (ca: number, CA: number, bm = 'Normal') => {
    const key = `${n(ca)}|${n(CA)}|${bm}`;
    if (!gstates.has(key)) gstates.set(key, `/G${gstates.size + 1} ${add(enc.encode(`<< /Type /ExtGState /ca ${n(ca)} /CA ${n(CA)} /BM /${bm} >>`))} 0 R`);
    return gstates.get(key)!.split(' ')[0];
  };
  const flip = new DOMMatrix([1, 0, 0, -1, 0, H]);
  const cm = (m: DOMMatrix) => `${n(m.a)} ${n(m.b)} ${n(m.c)} ${n(m.d)} ${n(m.e)} ${n(m.f)} cm\n`;
  const rgb = (c: string) => cssToRgb(c).slice(0, 3).map(n).join(' ');

  /** A gradient as a shading pattern; `toPage` maps the layer's local box to the page. */
  const pattern = (g: Gradient, w: number, h: number, toPage: DOMMatrix) => {
    const stops = [...g.stops].sort((a, b) => a.offset - b.offset);
    const fn = (c0: string, c1: string) => `<< /FunctionType 2 /Domain [0 1] /C0 [${rgb(c0)}] /C1 [${rgb(c1)}] /N 1 >>`;
    const func = stops.length < 2 ? fn(stops[0]?.color ?? '#000', stops[0]?.color ?? '#000')
      : `<< /FunctionType 3 /Domain [${n(stops[0].offset)} ${n(stops[stops.length - 1].offset)}] /Functions [${stops.slice(1).map((s, i) => fn(stops[i].color, s.color)).join(' ')}] /Bounds [${stops.slice(1, -1).map((s) => n(s.offset)).join(' ')}] /Encode [${stops.slice(1).map(() => '0 1').join(' ')}] >>`;
    let shading: string;
    if (g.type === 'radial') shading = `<< /ShadingType 3 /ColorSpace /DeviceRGB /Coords [${n(w / 2)} ${n(h / 2)} 0 ${n(w / 2)} ${n(h / 2)} ${n(Math.max(w, h) / 2)}] /Function ${func} /Extend [true true] >>`;
    else {
      const a = ((g.angle ?? 0) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a), half = (Math.abs(w * cos) + Math.abs(h * sin)) / 2;
      shading = `<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [${n(w / 2 - cos * half)} ${n(h / 2 - sin * half)} ${n(w / 2 + cos * half)} ${n(h / 2 + sin * half)}] /Function ${func} /Extend [true true] >>`;
    }
    const m = toPage;
    const id = add(enc.encode(`<< /Type /Pattern /PatternType 2 /Shading ${shading} /Matrix [${[m.a, m.b, m.c, m.d, m.e, m.f].map(n).join(' ')}] >>`));
    patterns.push(`/P${patterns.length + 1} ${id} 0 R`);
    return `/P${patterns.length}`;
  };

  const image = async (c: HTMLCanvasElement) => {
    const d = ctx2d(c).getImageData(0, 0, c.width, c.height).data;
    const rgbBytes = new Uint8Array(c.width * c.height * 3), alpha = new Uint8Array(c.width * c.height);
    for (let p = 0, q = 0; p < d.length; p += 4, q++) { rgbBytes[q * 3] = d[p]; rgbBytes[q * 3 + 1] = d[p + 1]; rgbBytes[q * 3 + 2] = d[p + 2]; alpha[q] = d[p + 3]; }
    const smask = await addStream(`/Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceGray /BitsPerComponent 8`, alpha);
    const id = await addStream(`/Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${smask} 0 R`, rgbBytes);
    xobjects.push(`/Im${xobjects.length + 1} ${id} 0 R`);
    return `/Im${xobjects.length}`;
  };
  /** Draw a doc-space canvas region as an image. */
  const placeImage = async (c: HTMLCanvasElement, x: number, y: number) => `q ${n(c.width)} 0 0 ${n(-c.height)} ${n(x)} ${n(y + c.height)} cm ${await image(c)} Do Q\n`;
  const cropped = (full: HTMLCanvasElement) => {
    const d = ctx2d(full).getImageData(0, 0, full.width, full.height).data;
    let x0 = full.width, y0 = full.height, x1 = -1, y1 = -1;
    for (let y = 0; y < full.height; y++) for (let x = 0; x < full.width; x++) if (d[(y * full.width + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const c = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
    ctx2d(c).drawImage(full, -x0, -y0);
    return { c, x: x0, y: y0 };
  };

  const pathOps = (l: ShapeLayer) => {
    let s = '';
    for (const sp of shapeToPaths(l)) {
      const nd = sp.nodes;
      if (!nd.length) continue;
      s += `${n(nd[0].x)} ${n(nd[0].y)} m\n`;
      const segs = sp.closed ? nd.length : nd.length - 1;
      for (let i = 0; i < segs; i++) {
        const a = nd[i], b = nd[(i + 1) % nd.length];
        s += a.ox === a.x && a.oy === a.y && b.ix === b.x && b.iy === b.y ? `${n(b.x)} ${n(b.y)} l\n` : `${n(a.ox)} ${n(a.oy)} ${n(b.ix)} ${n(b.iy)} ${n(b.x)} ${n(b.y)} c\n`;
      }
      if (sp.closed) s += 'h\n';
    }
    return s;
  };

  const layerOps = async (l: Layer, parentOpacity: number): Promise<string> => {
    if (!l.visible) return '';
    const opacity = parentOpacity * l.opacity;
    if (needsRaster(l)) {
      const full = renderLayerToDocCanvas(doc, l);
      const r = cropped(full);
      return r ? `q ${gs(opacity, opacity, BLEND[l.blend] ?? 'Normal')} gs\n${await placeImage(r.c, r.x, r.y)}Q\n` : '';
    }
    if (l.type === 'group') {
      let s = '';
      for (const c of l.children) s += await layerOps(c, opacity);
      return s;
    }
    const m = layerMatrix(l);
    // Color alpha (rgba fills) folds into the layer's opacity: PDF sets transparency only via gs.
    const alphaOf = (p: Paint | null | undefined) => (typeof p === 'string' ? cssToRgb(p)[3] : 1);
    const fa = l.type === 'shape' ? alphaOf(l.fill) : l.type === 'text' ? alphaOf(l.fill) : 1;
    const sa = l.type === 'shape' ? alphaOf(l.stroke?.paint) : 1;
    let s = `q ${gs(opacity * fa, opacity * sa, BLEND[l.blend] ?? 'Normal')} gs\n${cm(m)}`;
    const toPage = flip.multiply(m);
    if (l.type === 'shape') {
      const fill = l.fill, stroke = l.stroke && l.stroke.width > 0 ? l.stroke : null;
      if (fill) s += typeof fill === 'string' ? `${rgb(fill)} rg\n` : `/Pattern cs ${pattern(fill, l.w, l.h, toPage)} scn\n`;
      if (stroke) {
        s += typeof stroke.paint === 'string' ? `${rgb(stroke.paint)} RG\n` : `/Pattern CS ${pattern(stroke.paint, l.w, l.h, toPage)} SCN\n`;
        s += `${n(stroke.width)} w ${['butt', 'round', 'square'].indexOf(stroke.cap ?? 'butt')} J ${['miter', 'round', 'bevel'].indexOf(stroke.join ?? 'miter')} j [${(stroke.dash ?? []).map(n).join(' ')}] 0 d\n`;
      }
      s += pathOps(l) + (fill && stroke ? (l.fillRule === 'evenodd' ? 'B*' : 'B') : fill ? (l.fillRule === 'evenodd' ? 'f*' : 'f') : stroke ? 'S' : 'n') + '\n';
    } else if (l.type === 'text') {
      const t = l as TextLayer;
      const ps = cssToPsFont(t.family, t.weight, t.italic);
      const f = fontRef(ps);
      const lines = layoutText(t), lh = t.size * t.lineHeight;
      const mc = ctx2d(makeCanvas(4, 4));
      mc.font = fontString(t);
      mc.textBaseline = 'alphabetic';
      const mt = mc.measureText('Hg');
      // Canvas draws each line centred on its line box ("middle"); PDF draws from the baseline.
      const toBaseline = ((mt.fontBoundingBoxAscent ?? t.size * 0.8) - (mt.fontBoundingBoxDescent ?? t.size * 0.2)) / 2;
      s += `BT ${f} ${n(t.size)} Tf ${rgb(t.fill as string)} rg ${n(t.letterSpacing)} Tc\n`;
      lines.forEach((line, i) => {
        const w = mc.measureText(line).width + t.letterSpacing * Math.max(0, [...line].length - 1);
        const x = t.align === 'center' ? (t.w - w) / 2 : t.align === 'right' ? t.w - w : 0;
        const str = pdfString(line);
        if (str) s += `1 0 0 -1 ${n(x)} ${n(i * lh + lh / 2 + toBaseline)} Tm ${str} Tj\n`;
      });
      s += 'ET\n';
    }
    return s + 'Q\n';
  };

  let content = `1 0 0 -1 0 ${n(H)} cm\n`;
  if (doc.background) content += `${rgb(doc.background)} rg 0 0 ${n(W)} ${n(H)} re f\n`;
  // Adjustment layers change everything below them: flatten up to the topmost one into a single image.
  const lastAdjust = doc.layers.map((l) => l.type === 'adjust' && l.visible).lastIndexOf(true);
  if (lastAdjust >= 0) content += await placeImage(flatten({ ...doc, background: null, layers: doc.layers.slice(0, lastAdjust + 1) }), 0, 0);
  for (const l of doc.layers.slice(lastAdjust + 1)) content += await layerOps(l, 1);

  const contentId = await addStream('', enc.encode(content));
  const res = `/Resources << /Font << ${[...fonts.values()].join(' ')} >> /ExtGState << ${[...gstates.values()].join(' ')} >> /XObject << ${xobjects.join(' ')} >> /Pattern << ${patterns.join(' ')} >> >>`;
  objects[0] = enc.encode('<< /Type /Catalog /Pages 2 0 R >>');
  objects[1] = enc.encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects[2] = enc.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(W)} ${n(H)}] ${res} /Contents ${contentId} 0 R >>`);
  const info = add(enc.encode(`<< /Title ${pdfString(doc.name) ?? '(Untitled)'} /Creator (LucentEdit) /Producer (LucentEdit) >>`));

  const parts: Uint8Array[] = [enc.encode('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n')];
  let offset = parts[0].length;
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    const b = concat(enc.encode(`${i + 1} 0 obj\n`), o!, enc.encode('\nendobj\n'));
    offsets.push(offset); offset += b.length; parts.push(b);
  });
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  parts.push(enc.encode(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${offset}\n%%EOF\n`));
  return concat(...parts);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
