import type { Doc, Layer, Paint, GroupLayer, ShapeLayer, TextLayer, BlendMode, SubPath } from './types';
import { BLEND_MODES } from './types';
import {
  uid, makeCanvas, ctx2d, imageToCanvas, bytesToDataURL, canvasToBlob, layerMatrix, downloadBlob,
  dataURLToBytes, refreshGroups, walk,
} from './util';
import { flatten, layoutText, fitText, renderLayerToDocCanvas } from './render';
import { createDoc } from './store';
import { shapeToPaths, pathsToD, parseSvgPath, mapPaths, normalizePaths } from './paths';
import { newRaster } from './ops';

// Files: native .lucentedit, PSD (via ag-psd), SVG import/export, raster images, and the
// desktop (Tauri) / browser file access layer.

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function tauriInvoke<T = any>(cmd: string, args?: any, opts?: any): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args, opts);
}

export interface OpenedFile { name: string; bytes: Uint8Array; path?: string }

export const OPEN_EXTS = ['lucentedit', 'lucent', 'psd', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'avif'];

export async function readPath(path: string): Promise<Uint8Array> {
  if (!isTauri) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`Cannot read ${path}`);
    return new Uint8Array(await r.arrayBuffer());
  }
  const buf = await tauriInvoke<ArrayBuffer>('read_file', { path });
  return new Uint8Array(buf);
}

export async function writePath(path: string, bytes: Uint8Array) {
  if (!isTauri) throw new Error('Writing to a file path needs the desktop app');
  await tauriInvoke('write_file_raw', bytes, { headers: { path: encodeURIComponent(path) } });
}

export async function pickFiles(multiple = true): Promise<OpenedFile[]> {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const res = await open({ multiple, filters: [{ name: 'Images & Documents', extensions: OPEN_EXTS }] });
    const paths = res == null ? [] : Array.isArray(res) ? res : [res];
    return Promise.all(paths.map(async (p) => ({ name: p.split(/[\\/]/).pop()!, path: p, bytes: await readPath(p) })));
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    input.accept = OPEN_EXTS.map((e) => '.' + e).join(',');
    input.onchange = async () => resolve(await Promise.all([...(input.files ?? [])].map(fileToOpened)));
    input.click();
  });
}

export async function fileToOpened(f: File): Promise<OpenedFile> {
  return { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) };
}

/** Ask where to save (desktop) or download (web). Returns the saved path, or '' on web, or null if cancelled. */
export async function saveAs(bytes: Uint8Array, name: string, ext: string, path?: string): Promise<string | null> {
  if (isTauri) {
    let target = path;
    if (!target) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      target = (await save({ defaultPath: name, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })) ?? undefined;
    }
    if (!target) return null;
    await writePath(target, bytes);
    return target;
  }
  downloadBlob(new Blob([bytes as BlobPart]), name);
  return '';
}

const extOf = (name: string) => name.split('.').pop()!.toLowerCase();
const baseName = (name: string) => name.replace(/\.[^.]+$/, '');
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', avif: 'image/avif' };

// Native format

export async function serializeDoc(doc: Doc): Promise<Uint8Array> {
  const enc = (ls: Layer[]): any[] => ls.map((l) => {
    const { mask, ...base } = l as any;
    let o: any = base;
    if (l.type === 'raster') { const { canvas, ...rest } = base; o = { ...rest, png: canvas.toDataURL('image/png') }; }
    if (l.type === 'group') o = { ...base, children: enc(l.children) };
    if (mask) o.mask = { x: mask.x, y: mask.y, enabled: mask.enabled, png: mask.canvas.toDataURL('image/png') };
    return o;
  });
  const { path, ...meta } = doc;
  void path;
  const json = JSON.stringify({ format: 'lucentedit', version: 1, doc: { ...meta, layers: enc(doc.layers) } });
  return new TextEncoder().encode(json);
}

export async function deserializeDoc(bytes: Uint8Array): Promise<Doc> {
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (data.format !== 'lucentedit' && data.format !== 'lucent') throw new Error('Not a LucentEdit document');
  const dec = async (ls: any[]): Promise<Layer[]> => Promise.all(ls.map(async (l) => {
    let o: any = l;
    if (l.type === 'raster') { const { png, ...rest } = l; o = { ...rest, canvas: await imageToCanvas(png) }; }
    if (l.type === 'group') o = { ...l, children: await dec(l.children) };
    if (l.mask) o.mask = { x: l.mask.x, y: l.mask.y, enabled: l.mask.enabled, canvas: await imageToCanvas(l.mask.png) };
    return o as Layer;
  }));
  const doc: Doc = { ...data.doc, id: uid('d'), layers: await dec(data.doc.layers) };
  return doc;
}

// Opening

export async function docFromFile(f: OpenedFile): Promise<Doc> {
  const ext = extOf(f.name);
  if (ext === 'lucentedit' || ext === 'lucent') { const d = await deserializeDoc(f.bytes); d.path = f.path; return d; }
  if (ext === 'psd') return readPsdDoc(f);
  if (ext === 'svg') {
    const { layers, width, height } = await importSvg(new TextDecoder().decode(f.bytes));
    const doc = createDoc({ name: baseName(f.name), width, height, background: null });
    doc.layers = layers;
    return doc;
  }
  const canvas = await imageToCanvas(await bytesToDataURL(f.bytes, MIME[ext] ?? 'image/png'));
  const doc = createDoc({ name: baseName(f.name), width: canvas.width, height: canvas.height, background: null });
  doc.layers = [{ id: uid(), name: 'Background', type: 'raster', canvas, visible: true, locked: false, opacity: 1, blend: 'normal', x: 0, y: 0, w: canvas.width, h: canvas.height, rotation: 0 }];
  return doc;
}

/** Layers to place into an existing document (File > Place, drag & drop, MCP add_image). */
export async function layersFromFile(f: OpenedFile, doc: Doc): Promise<Layer[]> {
  const ext = extOf(f.name);
  if (ext === 'svg') {
    const { layers } = await importSvg(new TextDecoder().decode(f.bytes));
    if (layers.length <= 1) return layers;
    const g: GroupLayer = { id: uid(), name: baseName(f.name), type: 'group', children: layers, expanded: false, visible: true, locked: false, opacity: 1, blend: 'normal', x: 0, y: 0, w: 1, h: 1, rotation: 0 };
    refreshGroups([g]);
    return [g];
  }
  if (ext === 'psd' || ext === 'lucentedit' || ext === 'lucent') {
    const d = await docFromFile(f);
    const g: GroupLayer = { id: uid(), name: d.name, type: 'group', children: d.layers, expanded: false, visible: true, locked: false, opacity: 1, blend: 'normal', x: 0, y: 0, w: 1, h: 1, rotation: 0 };
    refreshGroups([g]);
    return [g];
  }
  const canvas = await imageToCanvas(await bytesToDataURL(f.bytes, MIME[ext] ?? 'image/png'));
  // Fit large images inside the canvas like Photoshop's Place.
  const s = Math.min(1, doc.width / canvas.width, doc.height / canvas.height);
  const w = canvas.width * s, h = canvas.height * s;
  return [{ id: uid(), name: baseName(f.name), type: 'raster', canvas, visible: true, locked: false, opacity: 1, blend: 'normal', x: (doc.width - w) / 2, y: (doc.height - h) / 2, w, h, rotation: 0 }];
}

// PSD

const psdBlendIn = (b?: string): BlendMode => {
  const m = (b ?? 'normal').replace(/ /g, '-') as BlendMode;
  return BLEND_MODES.includes(m) ? m : 'normal';
};

async function readPsdDoc(f: OpenedFile): Promise<Doc> {
  const { readPsd } = await import('ag-psd');
  const psd = readPsd(f.bytes.buffer.slice(f.bytes.byteOffset, f.bytes.byteOffset + f.bytes.byteLength) as ArrayBuffer, { skipThumbnail: true });
  const doc = createDoc({ name: baseName(f.name), width: psd.width, height: psd.height, background: null });
  const conv = (ls: any[]): Layer[] => ls.map((l): Layer | null => {
    const common: any = { id: uid(), name: l.name ?? 'Layer', visible: !l.hidden, locked: false, opacity: l.opacity ?? 1, blend: psdBlendIn(l.blendMode), rotation: 0 };
    if (l.clipping) common.clip = true;
    if (l.mask?.canvas) common.mask = psdMaskIn(l.mask, psd.width, psd.height);
    if (l.children) {
      const g: GroupLayer = { ...common, type: 'group', children: conv(l.children), expanded: !!l.opened, x: 0, y: 0, w: 1, h: 1 };
      return g.children.length ? g : null;
    }
    if (!l.canvas || !l.canvas.width) return null;
    return { ...common, type: 'raster', canvas: l.canvas, x: l.left ?? 0, y: l.top ?? 0, w: l.canvas.width, h: l.canvas.height };
  }).filter(Boolean) as Layer[];
  doc.layers = conv(psd.children ?? []);
  if (!doc.layers.length && psd.canvas) doc.layers = [{ ...newRaster({ doc } as any, 'Background', psd.canvas) }];
  refreshGroups(doc.layers);
  return doc;
}

/** PSD masks are grayscale images over a default color; ours are alpha masks in doc space. */
function psdMaskIn(m: any, W: number, H: number) {
  const c = makeCanvas(W, H), x = ctx2d(c);
  if (m.defaultColor) { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); }
  const src = m.canvas as HTMLCanvasElement;
  const img = ctx2d(src).getImageData(0, 0, src.width, src.height);
  for (let i = 0; i < img.data.length; i += 4) { img.data[i + 3] = img.data[i]; img.data[i] = img.data[i + 1] = img.data[i + 2] = 0; }
  const t = makeCanvas(src.width, src.height);
  ctx2d(t).putImageData(img, 0, 0);
  x.clearRect(m.left ?? 0, m.top ?? 0, src.width, src.height);
  x.drawImage(t, m.left ?? 0, m.top ?? 0);
  return { canvas: c, x: 0, y: 0, enabled: !m.disabled };
}

export async function writePsdBytes(doc: Doc): Promise<Uint8Array> {
  const { writePsd } = await import('ag-psd');
  const conv = (ls: Layer[]): any[] => ls.map((l) => {
    const common = { name: l.name, hidden: !l.visible, opacity: l.opacity, blendMode: l.blend.replace(/-/g, ' '), clipping: !!l.clip };
    if (l.type === 'group') return { ...common, opened: l.expanded, children: conv(l.children) };
    // Render each layer with effects into document space, then crop to its bounds.
    const full = renderLayerToDocCanvas(doc, l);
    const b = layerBoundsPx(l, doc);
    if (!b) return { ...common, canvas: makeCanvas(1, 1), left: 0, top: 0 };
    const c = makeCanvas(b.w, b.h);
    ctx2d(c).drawImage(full, -b.x, -b.y);
    return { ...common, canvas: c, left: b.x, top: b.y };
  });
  const psd = { width: doc.width, height: doc.height, canvas: flatten(doc), children: conv(doc.layers) };
  return new Uint8Array(writePsd(psd as any, { generateThumbnail: true }));
}

function layerBoundsPx(l: Layer, doc: Doc) {
  const pad = l.effects?.shadow?.enabled || l.effects?.glow?.enabled ? 80 : 4;
  const m = layerMatrix(l);
  const pts = [[0, 0], [l.w, 0], [l.w, l.h], [0, l.h]].map(([x, y]) => m.transformPoint({ x, y }));
  const x1 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.x)) - pad)), y1 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.y)) - pad));
  const x2 = Math.min(doc.width, Math.ceil(Math.max(...pts.map((p) => p.x)) + pad)), y2 = Math.min(doc.height, Math.ceil(Math.max(...pts.map((p) => p.y)) + pad));
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// SVG export

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildSvg(doc: Doc): string {
  const defs: string[] = [];
  let n = 0;
  const paintRef = (p: Paint | null | undefined, w: number, h: number): string => {
    if (!p) return 'none';
    if (typeof p === 'string') return esc(p);
    const id = `g${n++}`;
    const stops = p.stops.map((s) => `<stop offset="${s.offset}" stop-color="${esc(s.color)}"/>`).join('');
    if (p.type === 'radial') defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${w / 2}" cy="${h / 2}" r="${Math.max(w, h) / 2}">${stops}</radialGradient>`);
    else {
      const a = ((p.angle ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), half = (Math.abs(w * c) + Math.abs(h * s)) / 2;
      defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${w / 2 - c * half}" y1="${h / 2 - s * half}" x2="${w / 2 + c * half}" y2="${h / 2 + s * half}">${stops}</linearGradient>`);
    }
    return `url(#${id})`;
  };
  const layerSvg = (l: Layer): string => {
    if (!l.visible) return '';
    const style = [l.opacity < 1 ? `opacity:${l.opacity}` : '', l.blend !== 'normal' ? `mix-blend-mode:${l.blend}` : ''].filter(Boolean).join(';');
    let filter = '';
    const fx = l.effects;
    if (fx?.shadow?.enabled || fx?.glow?.enabled) {
      const id = `f${n++}`;
      const parts = [
        fx.glow?.enabled ? `<feDropShadow dx="0" dy="0" stdDeviation="${fx.glow.blur / 2}" flood-color="${esc(fx.glow.color)}"/>` : '',
        fx.shadow?.enabled ? `<feDropShadow dx="${fx.shadow.x}" dy="${fx.shadow.y}" stdDeviation="${fx.shadow.blur / 2}" flood-color="${esc(fx.shadow.color)}"/>` : '',
      ];
      defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${parts.join('')}</filter>`);
      filter = ` filter="url(#${id})"`;
    }
    const attrs = `${style ? ` style="${style}"` : ''}${filter} data-name="${esc(l.name)}"`;
    if (l.mask?.enabled) {
      // SVG has no direct equivalent of a pixel mask; embed the masked result as an image.
      const full = renderLayerToDocCanvas(doc, { ...l, opacity: 1, blend: 'normal', effects: undefined } as Layer);
      return `<image${attrs} width="${doc.width}" height="${doc.height}" href="${full.toDataURL('image/png')}"/>`;
    }
    if (l.type === 'group') return `<g${attrs}>${l.children.map(layerSvg).join('')}</g>`;
    const m = layerMatrix(l);
    const tf = `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map((v) => +v.toFixed(4)).join(' ')})`;
    let body = '';
    if (l.type === 'raster') body = `<image width="${l.w}" height="${l.h}" preserveAspectRatio="none" href="${l.canvas.toDataURL('image/png')}"/>`;
    else if (l.type === 'shape') {
      const s = l.stroke;
      const strokeAttrs = s && s.width > 0 ? ` stroke="${paintRef(s.paint, l.w, l.h)}" stroke-width="${s.width}" stroke-linecap="${s.cap ?? 'butt'}" stroke-linejoin="${s.join ?? 'miter'}"${s.dash?.length ? ` stroke-dasharray="${s.dash.join(' ')}"` : ''}` : '';
      const fill = ` fill="${paintRef(l.fill, l.w, l.h)}"${l.fillRule === 'evenodd' ? ' fill-rule="evenodd"' : ''}`;
      if (l.shape === 'rect') body = `<rect width="${l.w}" height="${l.h}"${l.radius ? ` rx="${Math.min(l.radius, l.w / 2, l.h / 2)}"` : ''}${fill}${strokeAttrs}/>`;
      else if (l.shape === 'ellipse') body = `<ellipse cx="${l.w / 2}" cy="${l.h / 2}" rx="${l.w / 2}" ry="${l.h / 2}"${fill}${strokeAttrs}/>`;
      else body = `<path d="${pathsToD(shapeToPaths(l))}"${fill}${strokeAttrs}/>`;
    } else if (l.type === 'text') {
      const lines = layoutText(l), lh = l.size * l.lineHeight;
      const anchor = l.align === 'center' ? 'middle' : l.align === 'right' || l.align === 'end' ? 'end' : 'start';
      const x = anchor === 'middle' ? l.w / 2 : anchor === 'end' ? l.w : 0;
      const s = l.stroke;
      body = `<text font-family="${esc(l.family)}" font-size="${l.size}" font-weight="${l.weight}"${l.italic ? ' font-style="italic"' : ''}${l.letterSpacing ? ` letter-spacing="${l.letterSpacing}"` : ''} text-anchor="${anchor}" dominant-baseline="central" fill="${paintRef(l.fill, l.w, l.h)}"${s && s.width ? ` stroke="${paintRef(s.paint, l.w, l.h)}" stroke-width="${s.width}" paint-order="stroke"` : ''} xml:space="preserve">${lines.map((t, i) => `<tspan x="${x}" y="${i * lh + lh / 2}">${esc(t)}</tspan>`).join('')}</text>`;
    }
    return `<g transform="${tf}"${attrs}>${body}</g>`;
  };
  const content = doc.layers.map(layerSvg).join('\n');
  const bgRect = doc.background ? `<rect width="${doc.width}" height="${doc.height}" fill="${esc(doc.background)}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">\n<defs>${defs.join('')}</defs>\n${bgRect}\n${content}\n</svg>\n`;
}

// SVG import: render into a hidden DOM node so the browser resolves CSS, transforms and units.

export async function importSvg(text: string): Promise<{ layers: Layer[]; width: number; height: number }> {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none';
  host.innerHTML = text.replace(/<\?xml[^>]*>|<!DOCTYPE[^>]*>/gi, '');
  document.body.appendChild(host);
  try {
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    if (!svg) throw new Error('No <svg> element found');
    const vb = svg.viewBox?.baseVal;
    const width = Math.round(vb && vb.width ? vb.width : parseFloat(svg.getAttribute('width') || '') || 512);
    const height = Math.round(vb && vb.height ? vb.height : parseFloat(svg.getAttribute('height') || '') || 512);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    const toDOM = (m: DOMMatrix | SVGMatrix | null) => (m ? DOMMatrix.fromMatrix({ a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }) : new DOMMatrix());
    const rootInv = toDOM(svg.getScreenCTM()).inverse();
    const layers: Layer[] = [];
    const walkEl = async (el: Element, into: Layer[]) => {
      for (const child of Array.from(el.children)) {
        const tag = child.tagName.toLowerCase();
        if (['defs', 'style', 'title', 'desc', 'metadata', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'filter', 'symbol', 'pattern'].includes(tag)) continue;
        const cs = getComputedStyle(child);
        if (cs.display === 'none') continue;
        if (tag === 'g' || tag === 'a' || tag === 'svg') {
          const kids: Layer[] = [];
          await walkEl(child, kids);
          if (kids.length === 1) into.push(kids[0]);
          else if (kids.length) {
            const g: GroupLayer = { id: uid(), name: child.getAttribute('id') || child.getAttribute('data-name') || 'Group', type: 'group', children: kids, expanded: false, visible: true, locked: false, opacity: parseFloat(cs.opacity) || 1, blend: 'normal', x: 0, y: 0, w: 1, h: 1, rotation: 0 };
            into.push(g);
          }
          continue;
        }
        const ctm = rootInv.multiply(toDOM((child as SVGGraphicsElement).getScreenCTM?.() ?? null));
        const name = child.getAttribute('id') || child.getAttribute('data-name') || tag;
        if (tag === 'text') {
          const r = (child as SVGGraphicsElement).getBBox();
          const p = ctm.transformPoint({ x: r.x, y: r.y });
          const size = parseFloat(cs.fontSize) * Math.hypot(ctm.a, ctm.b);
          const t: TextLayer = {
            id: uid(), name, type: 'text', text: child.textContent?.trim() || '', family: cs.fontFamily.replace(/"/g, '') || 'Inter Variable', size,
            weight: parseInt(cs.fontWeight) || 400, italic: cs.fontStyle === 'italic', fill: svgPaint(child, cs.fill, host) ?? '#000', align: 'left',
            lineHeight: 1.2, letterSpacing: 0, stroke: null, autoWidth: true, visible: true, locked: false, opacity: parseFloat(cs.opacity) || 1,
            blend: 'normal', x: p.x, y: p.y, w: 10, h: 10, rotation: 0,
          };
          fitText(t);
          into.push(t);
          continue;
        }
        if (tag === 'image') {
          const href = child.getAttribute('href') || child.getAttribute('xlink:href');
          if (!href) continue;
          try {
            const canvas = await imageToCanvas(href);
            const r = (child as SVGGraphicsElement).getBBox();
            const p = ctm.transformPoint({ x: r.x, y: r.y });
            const s = Math.hypot(ctm.a, ctm.b);
            into.push({ id: uid(), name, type: 'raster', canvas, visible: true, locked: false, opacity: 1, blend: 'normal', x: p.x, y: p.y, w: r.width * s, h: r.height * s, rotation: 0 });
          } catch { /* unreachable image */ }
          continue;
        }
        const d = elementToPathData(child);
        if (!d) continue;
        const paths: SubPath[] = mapPaths(parseSvgPath(d), (x, y) => {
          const p = ctm.transformPoint({ x, y });
          return [p.x, p.y];
        });
        const n = normalizePaths(paths);
        if (!n.paths.length) continue;
        const sw = parseFloat(cs.strokeWidth) * Math.hypot(ctm.a, ctm.b);
        const strokePaint = svgPaint(child, cs.stroke, host);
        const shape: ShapeLayer = {
          id: uid(), name, type: 'shape', shape: 'path', paths: n.paths, nw: Math.max(n.w, 0.01), nh: Math.max(n.h, 0.01),
          fill: tag === 'line' || tag === 'polyline' && cs.fill === 'none' ? null : svgPaint(child, cs.fill, host),
          stroke: strokePaint && sw > 0 ? { paint: strokePaint, width: sw, cap: cs.strokeLinecap as CanvasLineCap, join: cs.strokeLinejoin as CanvasLineJoin } : null,
          fillRule: cs.fillRule === 'evenodd' ? 'evenodd' : 'nonzero',
          visible: true, locked: false, opacity: (parseFloat(cs.opacity) || 1) * (parseFloat(cs.fillOpacity) || 1), blend: 'normal',
          x: n.x, y: n.y, w: Math.max(n.w, 0.01), h: Math.max(n.h, 0.01), rotation: 0,
        };
        into.push(shape);
      }
    };
    await walkEl(svg, layers);
    refreshGroups(layers);
    return { layers, width, height };
  } finally {
    host.remove();
  }
}

function svgPaint(el: Element, v: string, host: HTMLElement): Paint | null {
  if (!v || v === 'none') return null;
  const m = /url\(["']?#([^"')]+)["']?\)/.exec(v);
  if (!m) return v;
  const g = host.querySelector(`#${CSS.escape(m[1])}`);
  if (!g) return '#000000';
  const stops = Array.from(g.querySelectorAll('stop')).map((s) => {
    const cs = getComputedStyle(s);
    const off = s.getAttribute('offset') ?? '0';
    return { offset: off.endsWith('%') ? parseFloat(off) / 100 : parseFloat(off), color: cs.stopColor || s.getAttribute('stop-color') || '#000' };
  });
  if (!stops.length) return '#000000';
  if (g.tagName.toLowerCase() === 'radialgradient') return { type: 'radial', stops };
  const num = (a: string, d: number) => { const s = g.getAttribute(a); return s == null ? d : s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s); };
  const angle = (Math.atan2(num('y2', 0) - num('y1', 0), num('x2', 1) - num('x1', 0)) * 180) / Math.PI;
  return { type: 'linear', angle, stops };
  void el;
}

function elementToPathData(el: Element): string | null {
  const a = (k: string) => parseFloat(el.getAttribute(k) || '0');
  switch (el.tagName.toLowerCase()) {
    case 'path': return el.getAttribute('d');
    case 'rect': {
      const x = a('x'), y = a('y'), w = a('width'), h = a('height');
      let rx = a('rx'), ry = a('ry');
      if (!rx && ry) rx = ry; if (!ry && rx) ry = rx;
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
    }
    case 'circle': { const cx = a('cx'), cy = a('cy'), r = a('r'); return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`; }
    case 'ellipse': { const cx = a('cx'), cy = a('cy'), rx = a('rx'), ry = a('ry'); return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`; }
    case 'line': return `M${a('x1')} ${a('y1')}L${a('x2')} ${a('y2')}`;
    case 'polyline':
    case 'polygon': {
      const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
      if (pts.length < 4) return null;
      let d = `M${pts[0]} ${pts[1]}`;
      for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
      return el.tagName.toLowerCase() === 'polygon' ? d + 'Z' : d;
    }
  }
  return null;
}

// Export

export type ExportFormat = 'png' | 'jpg' | 'webp' | 'svg' | 'psd' | 'lucentedit';

export async function exportBytes(doc: Doc, format: ExportFormat, opts: { quality?: number; scale?: number } = {}): Promise<Uint8Array> {
  if (format === 'svg') return new TextEncoder().encode(buildSvg(doc));
  if (format === 'psd') return writePsdBytes(doc);
  if (format === 'lucentedit') return serializeDoc(doc);
  const scale = opts.scale ?? 1;
  const opaque = format === 'jpg';
  const flat = flatten(opaque && !doc.background ? { ...doc, background: '#ffffff' } : doc, scale);
  const blob = await canvasToBlob(flat, format === 'jpg' ? 'image/jpeg' : `image/${format}`, opts.quality ?? 0.92);
  return new Uint8Array(await blob.arrayBuffer());
}

export function previewDataURL(doc: Doc, maxSize = 1024): string {
  const s = Math.min(1, maxSize / Math.max(doc.width, doc.height));
  return flatten(doc, s).toDataURL('image/png');
}

export { dataURLToBytes, walk };
