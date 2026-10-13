import type { Layer, ShapeLayer, TextLayer, RasterLayer, DocState } from '../core/types';
import { BLEND_MODES } from '../core/types';
import {
  cur, docs, activeIndex, commit, touch, undo, redo, createDoc, openDocState, mcpStatus, findLayerIn,
} from './bridge';
import { whenIdle } from '../core/store';
import {
  newShape, newPath, newText, newRaster, addLayer, removeLayers, setProps, reorder, align, distribute, layerSummary,
  toPaint, toStroke, duplicateLayerOp, groupIds, ungroupId, resizeCanvas, resizeImage,
} from './bridge';
import { parseSvgPath } from '../core/paths';
import { filterById, FILTERS, applyFilter } from '../core/filters';
import { docFromFile, exportBytes, readPath, writePath, isTauri, layersFromFile, ExportFormat } from '../core/io';
import { flatten, drawLayer } from '../core/render';
import { makeCanvas, ctx2d, bytesToDataURL, imageToCanvas, walk } from '../core/util';
import { pixelMatrix } from '../core/selection';
import { FONTS } from '../ui/chrome';

// Model Context Protocol server (Streamable HTTP, JSON responses). The Rust shell relays
// POST /mcp bodies here; we answer with JSON-RPC.

const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const GUIDE = `LucentEdit is a layered image editor + vector design tool (like Photoshop + Illustrator). You control the
document that is open in the app; the user sees every change live and can undo it.

Coordinates: pixels, origin at the top-left of the document, x to the right, y down. Each layer has a box
(x, y, width, height) and an optional rotation in degrees around its center.
Layer order: later layers are on top. get_document lists layers top-first.
Colors: any CSS color ("#7c3aed", "rgb(0 0 0 / 50%)", "white"). Fills may also be gradients:
  {"type":"linear","angle":90,"stops":[{"offset":0,"color":"#a855f7"},{"offset":1,"color":"#22d3ee"}]}
  angle 0 = left→right, 90 = top→bottom. Radial: {"type":"radial","stops":[...]}.
Text: add_text with font_family (e.g. "Inter Variable", "Georgia"), font_size in px, font_weight 100-900, width to wrap.
Vectors: add_shape for rect/ellipse/polygon/star/line, add_path for any SVG path data (icons, logos, curves).
Effects: update_layer {effects:{shadow:{enabled:true,color:"rgba(0,0,0,.35)",blur:30,x:0,y:12},glow:{enabled:true,color:"#a855f7",blur:30}}}.
Workflow tips: new_document (or use the open one) → build background → shapes → text → effects → render_preview to
check your work visually → fix issues → export_document. Use batch to run many operations in one call.`;

type Json = Record<string, any>;
interface ToolDef { name: string; description: string; inputSchema: Json; run: (a: Json) => Promise<any> | any }

const paintSchema = { description: 'CSS color string, or gradient {type:"linear"|"radial", angle?, stops:[{offset,color}]}, or null for none', anyOf: [{ type: 'string' }, { type: 'object' }, { type: 'null' }] };
const num = (v: any, d: number) => (v === undefined || v === null || v === '' || isNaN(+v) ? d : +v);
const need = (ds: DocState | null) => { if (!ds) throw new Error('No document is open. Call new_document first.'); return ds; };

function getLayer(ds: DocState, id: string): Layer {
  const l = findLayerIn(ds.doc, id);
  if (!l) throw new Error(`Layer "${id}" not found. Call get_document to see layer ids.`);
  return l;
}

function docInfo(ds: DocState) {
  return {
    id: ds.doc.id, name: ds.doc.name, width: ds.doc.width, height: ds.doc.height, background: ds.doc.background,
    selected: ds.selected, layers: [...ds.doc.layers].reverse().map(layerSummary), canUndo: ds.hIndex > 0,
  };
}

function common(l: Layer, a: Json) {
  if (a.name) l.name = String(a.name);
  if (a.rotation != null) l.rotation = num(a.rotation, 0);
  if (a.opacity != null) l.opacity = Math.max(0, Math.min(1, num(a.opacity, 1)));
  if (a.blend && BLEND_MODES.includes(a.blend)) l.blend = a.blend;
  if (a.effects) l.effects = a.effects;
  if (a.visible != null) l.visible = !!a.visible;
}

function place(ds: DocState, l: Layer, a: Json) {
  addLayer(l, ds, a.above_id);
  if (a.parent_id) {
    const g = findLayerIn(ds.doc, a.parent_id);
    if (g?.type === 'group') {
      removeLayers([l.id], ds, false);
      g.children.push(l);
    }
  }
  return l;
}

async function loadSource(src: string): Promise<{ name: string; bytes: Uint8Array }> {
  if (/^data:/.test(src)) {
    const r = await fetch(src);
    const ext = (/^data:image\/([a-z+]+)/.exec(src)?.[1] ?? 'png').replace('svg+xml', 'svg').replace('jpeg', 'jpg');
    return { name: `image.${ext}`, bytes: new Uint8Array(await r.arrayBuffer()) };
  }
  if (/^https?:/.test(src)) {
    const r = await fetch(src);
    if (!r.ok) throw new Error(`Download failed (${r.status})`);
    const type = r.headers.get('content-type') ?? '';
    const ext = type.includes('svg') ? 'svg' : type.includes('jpeg') ? 'jpg' : type.includes('webp') ? 'webp' : src.split('?')[0].split('.').pop() || 'png';
    return { name: `${src.split('/').pop()?.split('?')[0] || 'image'}.${ext}`.replace(/\.(\w+)\.\1$/, '.$1'), bytes: new Uint8Array(await r.arrayBuffer()) };
  }
  return { name: src.split(/[\\/]/).pop()!, bytes: await readPath(src) };
}

const TOOLS: ToolDef[] = [
  {
    name: 'get_guide', description: 'How LucentEdit works for agents: coordinates, colors, gradients, text, effects and recommended workflow. Call this first.',
    inputSchema: { type: 'object', properties: {} }, run: () => GUIDE,
  },
  {
    name: 'list_documents', description: 'List open documents (tabs).', inputSchema: { type: 'object', properties: {} },
    run: () => docs.value.map((d, i) => ({ index: i, id: d.doc.id, name: d.doc.name, width: d.doc.width, height: d.doc.height, active: i === activeIndex.value, layers: d.doc.layers.length })),
  },
  {
    name: 'new_document', description: 'Create a new document and make it active.',
    inputSchema: { type: 'object', properties: { width: { type: 'number' }, height: { type: 'number' }, name: { type: 'string' }, background: { type: ['string', 'null'], description: 'CSS color, or null for transparent. Default white.' } }, required: ['width', 'height'] },
    run: (a) => {
      if (!(num(a.width, 0) >= 1 && num(a.height, 0) >= 1 && num(a.width, 0) <= 20000 && num(a.height, 0) <= 20000)) throw new Error('width and height must be between 1 and 20000');
      const ds = openDocState(createDoc({ width: num(a.width, 1080), height: num(a.height, 1080), name: a.name, background: a.background === undefined ? '#ffffff' : a.background }), 'AI: New Document');
      return docInfo(ds);
    },
  },
  {
    name: 'switch_document', description: 'Make another open document active (by id or index).',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, index: { type: 'number' } } },
    run: (a) => {
      const i = a.id ? docs.value.findIndex((d) => d.doc.id === a.id) : num(a.index, -1);
      if (i < 0 || i >= docs.value.length) throw new Error('Document not found');
      activeIndex.value = i; touch();
      return docInfo(docs.value[i]);
    },
  },
  {
    name: 'get_document', description: 'Active document info: size, background and the full layer tree (top layer first) with ids, boxes and properties.',
    inputSchema: { type: 'object', properties: {} }, run: () => docInfo(need(cur())),
  },
  {
    name: 'set_document', description: 'Rename, recolor background, or resize the active document. resize_mode "canvas" adds/removes space (anchored center), "scale" scales all artwork.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, background: { type: ['string', 'null'] }, width: { type: 'number' }, height: { type: 'number' }, resize_mode: { type: 'string', enum: ['canvas', 'scale'] } } },
    run: (a) => {
      const ds = need(cur());
      if (a.name) ds.doc.name = a.name;
      if (a.background !== undefined) ds.doc.background = a.background;
      if (a.width != null || a.height != null) {
        const w = num(a.width, ds.doc.width), h = num(a.height, ds.doc.height);
        if (!(w >= 1 && h >= 1 && w <= 20000 && h <= 20000)) throw new Error('width and height must be between 1 and 20000');
        if (a.resize_mode === 'scale') resizeImage(w, h, ds); else resizeCanvas(w, h, [0.5, 0.5], ds);
      } else commit('AI: Document', ds);
      return docInfo(ds);
    },
  },
  {
    name: 'add_shape', description: 'Add a vector shape layer: rect (optional corner radius), ellipse, polygon (sides), star (points, inner_radius 0-1) or line (from x,y to x+width,y+height).',
    inputSchema: {
      type: 'object', required: ['shape', 'x', 'y', 'width', 'height'],
      properties: {
        shape: { type: 'string', enum: ['rect', 'ellipse', 'polygon', 'star', 'line'] }, x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' },
        fill: paintSchema, stroke: paintSchema, stroke_width: { type: 'number' }, dash: { type: 'array', items: { type: 'number' } }, radius: { type: 'number' }, sides: { type: 'number' }, inner_radius: { type: 'number' },
        rotation: { type: 'number' }, opacity: { type: 'number' }, blend: { type: 'string' }, name: { type: 'string' }, effects: { type: 'object' }, parent_id: { type: 'string', description: 'Group to add into' },
      },
    },
    run: (a) => {
      const ds = need(cur());
      let l: ShapeLayer;
      if (a.shape === 'line') {
        const n = (x: number, y: number) => ({ x, y, ix: x, iy: y, ox: x, oy: y });
        const x1 = num(a.x, 0), y1 = num(a.y, 0);
        l = newPath([{ closed: false, nodes: [n(x1, y1), n(x1 + num(a.width, 100), y1 + num(a.height, 0))] }], { fill: null, name: 'Line' });
        l.stroke = toStroke(a.stroke ?? '#111827', num(a.stroke_width, 2));
      } else {
        l = newShape({
          shape: a.shape, x: num(a.x, 0), y: num(a.y, 0), w: Math.max(1, num(a.width, 100)), h: Math.max(1, num(a.height, 100)),
          fill: a.fill === undefined ? '#8b5cf6' : toPaint(a.fill), stroke: toStroke(a.stroke, num(a.stroke_width, 2)),
          radius: a.radius != null ? num(a.radius, 0) : undefined, sides: a.sides ?? a.points, inner: a.inner_radius,
        });
      }
      if (l.stroke && a.dash) l.stroke.dash = a.dash;
      common(l, a);
      place(ds, l, a);
      commit(`AI: Add ${l.name}`, ds);
      return layerSummary(l);
    },
  },
  {
    name: 'add_path', description: 'Add a vector path from SVG path data (M, L, H, V, C, S, Q, T, A, Z; absolute or relative). Great for icons, logos, curves and blobs. Optionally fit it into a box with x/y/width/height.',
    inputSchema: {
      type: 'object', required: ['d'],
      properties: {
        d: { type: 'string' }, fill: paintSchema, stroke: paintSchema, stroke_width: { type: 'number' }, fill_rule: { type: 'string', enum: ['nonzero', 'evenodd'] },
        x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' }, keep_aspect: { type: 'boolean', description: 'When fitting, keep proportions (default true)' },
        rotation: { type: 'number' }, opacity: { type: 'number' }, name: { type: 'string' }, effects: { type: 'object' }, parent_id: { type: 'string' },
      },
    },
    run: (a) => {
      const ds = need(cur());
      const paths = parseSvgPath(String(a.d));
      if (!paths.length) throw new Error('Could not parse path data');
      const l = newPath(paths, { fill: a.fill === undefined ? (a.stroke ? null : '#111827') : toPaint(a.fill), stroke: toStroke(a.stroke, num(a.stroke_width, 2)), fillRule: a.fill_rule });
      if (a.width || a.height) {
        let w = num(a.width, l.w), h = num(a.height, l.h);
        if (a.keep_aspect !== false && a.width && a.height) {
          const s = Math.min(w / l.w, h / l.h);
          const nw = l.w * s, nh = l.h * s;
          l.x = num(a.x, l.x) + (w - nw) / 2; l.y = num(a.y, l.y) + (h - nh) / 2; w = nw; h = nh;
        } else { l.x = num(a.x, l.x); l.y = num(a.y, l.y); }
        l.w = w; l.h = h;
      } else if (a.x != null || a.y != null) { l.x = num(a.x, l.x); l.y = num(a.y, l.y); }
      common(l, a);
      place(ds, l, a);
      commit(`AI: Add ${l.name}`, ds);
      return layerSummary(l);
    },
  },
  {
    name: 'add_text', description: 'Add a text layer. x/y is the top-left of the text box. Set width to wrap text into a paragraph box; align applies within the box.',
    inputSchema: {
      type: 'object', required: ['text', 'x', 'y'],
      properties: {
        text: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, font_size: { type: 'number' }, font_family: { type: 'string' },
        font_weight: { type: 'number' }, italic: { type: 'boolean' }, color: paintSchema, align: { type: 'string', enum: ['left', 'center', 'right'] },
        line_height: { type: 'number', description: 'Multiplier, default 1.2' }, letter_spacing: { type: 'number' }, stroke: paintSchema, stroke_width: { type: 'number' },
        rotation: { type: 'number' }, opacity: { type: 'number' }, name: { type: 'string' }, effects: { type: 'object' }, parent_id: { type: 'string' },
      },
    },
    run: (a) => {
      const ds = need(cur());
      const l: TextLayer = newText(String(a.text), num(a.x, 0), num(a.y, 0), {
        size: num(a.font_size, 48), family: a.font_family ?? 'Inter Variable', weight: num(a.font_weight, 600), italic: !!a.italic,
        fill: toPaint(a.color) ?? '#111827', align: a.align ?? 'left', lineHeight: num(a.line_height, 1.2), letterSpacing: num(a.letter_spacing, 0),
        stroke: toStroke(a.stroke, num(a.stroke_width, 2)), autoWidth: !a.width, w: a.width ? num(a.width, 100) : 10,
      });
      l.x = num(a.x, 0);
      common(l, a);
      place(ds, l, a);
      commit('AI: Add Text', ds);
      return layerSummary(l);
    },
  },
  {
    name: 'add_image', description: 'Place an image (PNG, JPG, WebP, GIF, SVG, PSD) from a local file path, an http(s) URL or a data: URL as a new layer. SVGs become editable vector layers. Optional x/y/width/height (aspect kept if only width or height is given).',
    inputSchema: { type: 'object', required: ['source'], properties: { source: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' }, name: { type: 'string' }, opacity: { type: 'number' }, effects: { type: 'object' } } },
    run: async (a) => {
      const ds = need(cur());
      const f = await loadSource(String(a.source));
      const layers = await layersFromFile(f, ds.doc);
      const out = [];
      for (const l of layers) {
        if (a.width || a.height) {
          const ratio = l.w / l.h;
          const w = a.width ? num(a.width, l.w) : num(a.height, l.h) * ratio, h = a.height ? num(a.height, l.h) : num(a.width, l.w) / ratio;
          const sx = w / l.w, sy = h / l.h;
          const { scaleLayer, moveLayer } = await import('../core/ops');
          scaleLayer(l, sx, sy, l.x, l.y);
          moveLayer(l, num(a.x, l.x) - l.x, num(a.y, l.y) - l.y);
        } else if (a.x != null || a.y != null) {
          const { moveLayer } = await import('../core/ops');
          moveLayer(l, num(a.x, l.x) - l.x, num(a.y, l.y) - l.y);
        }
        common(l, a);
        addLayer(l, ds);
        out.push(layerSummary(l));
      }
      commit('AI: Place Image', ds);
      return out.length === 1 ? out[0] : out;
    },
  },
  {
    name: 'add_raster_layer', description: 'Add an empty (or solid-filled) pixel layer covering the document, for painting with draw_stroke or applying filters.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, fill: { type: 'string' }, opacity: { type: 'number' }, blend: { type: 'string' } } },
    run: (a) => {
      const ds = need(cur());
      const l = newRaster(ds, a.name ?? 'Layer');
      if (a.fill) { const x = ctx2d(l.canvas); x.fillStyle = a.fill; x.fillRect(0, 0, l.canvas.width, l.canvas.height); }
      common(l, a);
      addLayer(l, ds);
      commit('AI: New Layer', ds);
      return layerSummary(l);
    },
  },
  {
    name: 'draw_stroke', description: 'Paint a freehand brush stroke through points on a pixel layer (creates one if layer_id is omitted). Set erase=true to erase.',
    inputSchema: {
      type: 'object', required: ['points'],
      properties: { layer_id: { type: 'string' }, points: { type: 'array', items: { type: 'array', items: { type: 'number' } }, description: '[[x,y], ...]' }, color: { type: 'string' }, size: { type: 'number' }, opacity: { type: 'number' }, erase: { type: 'boolean' }, smooth: { type: 'boolean' } },
    },
    run: (a) => {
      const ds = need(cur());
      let l = a.layer_id ? getLayer(ds, a.layer_id) : null;
      if (!l) { l = newRaster(ds, 'Paint'); addLayer(l, ds); }
      if (l.type !== 'raster') throw new Error('draw_stroke needs a pixel layer (type raster)');
      const r = l as RasterLayer;
      const { cloneCanvas } = { cloneCanvas: (c: HTMLCanvasElement) => { const n = makeCanvas(c.width, c.height); ctx2d(n).drawImage(c, 0, 0); return n; } };
      r.canvas = cloneCanvas(r.canvas);
      const x = ctx2d(r.canvas);
      x.setTransform(pixelMatrix(r).inverse());
      x.globalAlpha = Math.max(0, Math.min(1, num(a.opacity, 1)));
      x.globalCompositeOperation = a.erase ? 'destination-out' : 'source-over';
      x.strokeStyle = a.color ?? '#111827';
      x.lineWidth = num(a.size, 8);
      x.lineCap = 'round'; x.lineJoin = 'round';
      const pts: number[][] = a.points;
      x.beginPath();
      pts.forEach(([px, py], i) => {
        if (!i) return x.moveTo(px, py);
        if (a.smooth !== false && i < pts.length - 1) {
          const [nx, ny] = pts[i + 1];
          x.quadraticCurveTo(px, py, (px + nx) / 2, (py + ny) / 2);
        } else x.lineTo(px, py);
      });
      if (pts.length === 1) { x.arc(pts[0][0], pts[0][1], x.lineWidth / 2, 0, Math.PI * 2); x.fillStyle = x.strokeStyle; x.fill(); }
      else x.stroke();
      commit('AI: Brush Stroke', ds);
      return layerSummary(r);
    },
  },
  {
    name: 'update_layer', description: 'Change any layer properties: x, y, width, height, rotation, opacity, blend, visible, locked, name, fill, stroke, stroke_width, radius, sides, text, font_size, font_family, font_weight, italic, color, align, line_height, letter_spacing, effects, and params (for adjustment layers).',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' }, rotation: { type: 'number' }, opacity: { type: 'number' }, blend: { type: 'string', enum: BLEND_MODES }, visible: { type: 'boolean' }, locked: { type: 'boolean' }, name: { type: 'string' }, fill: paintSchema, stroke: paintSchema, stroke_width: { type: 'number' }, radius: { type: 'number' }, sides: { type: 'number' }, text: { type: 'string' }, font_size: { type: 'number' }, font_family: { type: 'string' }, font_weight: { type: 'number' }, italic: { type: 'boolean' }, color: paintSchema, align: { type: 'string' }, line_height: { type: 'number' }, letter_spacing: { type: 'number' }, effects: { type: 'object' }, params: { type: 'object' } } },
    run: (a) => {
      const ds = need(cur());
      const l = getLayer(ds, a.id);
      const p: Json = {};
      for (const k of ['x', 'y', 'rotation', 'opacity', 'blend', 'visible', 'locked', 'name', 'radius', 'sides', 'text', 'italic', 'align', 'effects']) if (a[k] !== undefined) p[k] = a[k];
      if (a.params !== undefined && l.type === 'adjust') l.params = { ...l.params, ...a.params };
      if (a.width !== undefined) p.w = num(a.width, l.w);
      if (a.height !== undefined) p.h = num(a.height, l.h);
      if (a.fill !== undefined) p.fill = toPaint(a.fill);
      if (a.color !== undefined) p.fill = toPaint(a.color);
      if (a.font_size !== undefined) p.size = num(a.font_size, 48);
      if (a.font_family !== undefined) p.family = a.font_family;
      if (a.font_weight !== undefined) p.weight = num(a.font_weight, 400);
      if (a.line_height !== undefined) p.lineHeight = num(a.line_height, 1.2);
      if (a.letter_spacing !== undefined) p.letterSpacing = num(a.letter_spacing, 0);
      if (a.stroke !== undefined) p.stroke = toStroke(a.stroke, num(a.stroke_width, (l as any).stroke?.width ?? 2));
      else if (a.stroke_width !== undefined && (l as any).stroke) p.stroke = { ...(l as any).stroke, width: num(a.stroke_width, 2) };
      if (l.type === 'group' && (p.w || p.h)) {
        throw new Error('Resize groups by updating their children, or use set_document resize_mode "scale".');
      }
      setProps(l, p);
      commit('AI: Update Layer', ds);
      return layerSummary(l);
    },
  },
  {
    name: 'delete_layers', description: 'Delete layers by id.', inputSchema: { type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' } } } },
    run: (a) => { const ds = need(cur()); removeLayers(a.ids, ds); commit('AI: Delete Layers', ds); return { deleted: a.ids.length }; },
  },
  {
    name: 'duplicate_layer', description: 'Duplicate a layer, optionally offset by dx/dy. Returns the copy.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, dx: { type: 'number' }, dy: { type: 'number' }, name: { type: 'string' } } },
    run: (a) => { const ds = need(cur()); const c = duplicateLayerOp(ds, a.id, num(a.dx, 0), num(a.dy, 0)); if (a.name) c.name = a.name; commit('AI: Duplicate', ds); return layerSummary(c); },
  },
  {
    name: 'reorder_layer', description: 'Move a layer in the stack: "top", "bottom", "up", "down" or a numeric index (0 = bottom).', inputSchema: { type: 'object', required: ['id', 'position'], properties: { id: { type: 'string' }, position: { type: ['string', 'number'] } } },
    run: (a) => { const ds = need(cur()); getLayer(ds, a.id); reorder(a.id, a.position, ds); commit('AI: Arrange', ds); return docInfo(ds).layers.map((l: any) => ({ id: l.id, name: l.name })); },
  },
  {
    name: 'group_layers', description: 'Group layers into a folder. Returns the group.', inputSchema: { type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' } }, name: { type: 'string' } } },
    run: (a) => { const ds = need(cur()); const g = groupIds(ds, a.ids, a.name ?? 'Group'); if (!g) throw new Error('Nothing to group'); return layerSummary(g); },
  },
  {
    name: 'ungroup_layer', description: 'Release a group’s children into its parent.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    run: (a) => { const ds = need(cur()); ungroupId(ds, a.id); return docInfo(ds).layers.length; },
  },
  {
    name: 'select_layers', description: 'Select layers in the UI (highlights them for the user).', inputSchema: { type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' } } } },
    run: (a) => { const ds = need(cur()); ds.selected = a.ids.filter((id: string) => findLayerIn(ds.doc, id)); touch(); return ds.selected; },
  },
  {
    name: 'align_layers', description: 'Align layers: left, hcenter, right, top, vcenter, bottom — relative to the canvas (default) or to the selection bounds.',
    inputSchema: { type: 'object', required: ['ids', 'align'], properties: { ids: { type: 'array', items: { type: 'string' } }, align: { type: 'string', enum: ['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom'] }, relative_to: { type: 'string', enum: ['canvas', 'selection'] } } },
    run: (a) => { const ds = need(cur()); const ls = a.ids.map((id: string) => getLayer(ds, id)); align(ls, a.align, a.relative_to === 'selection' ? 'selection' : 'canvas', ds); commit('AI: Align', ds); return ls.map(layerSummary); },
  },
  {
    name: 'distribute_layers', description: 'Evenly space 3+ layers horizontally (h) or vertically (v).', inputSchema: { type: 'object', required: ['ids', 'axis'], properties: { ids: { type: 'array', items: { type: 'string' } }, axis: { type: 'string', enum: ['h', 'v'] } } },
    run: (a) => { const ds = need(cur()); const ls = a.ids.map((id: string) => getLayer(ds, id)); distribute(ls, a.axis); commit('AI: Distribute', ds); return ls.map(layerSummary); },
  },
  {
    name: 'set_layer_mask', description: 'Give a layer a non-destructive mask. mode "shape" reveals only inside a rect/ellipse (x, y, width, height, optional feather px, invert to hide it instead); "selection" uses the current pixel selection; "reveal"/"hide" start fully visible/hidden; "none" removes the mask; "apply" bakes it into the pixels.',
    inputSchema: { type: 'object', required: ['id', 'mode'], properties: { id: { type: 'string' }, mode: { type: 'string', enum: ['shape', 'selection', 'reveal', 'hide', 'none', 'apply'] }, shape: { type: 'string', enum: ['rect', 'ellipse'] }, x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' }, radius: { type: 'number', description: 'Corner radius for rect' }, feather: { type: 'number' }, invert: { type: 'boolean' } } },
    run: async (a) => {
      const ds = need(cur());
      const l = getLayer(ds, a.id);
      const { addMask, applyMask } = await import('../core/ops');
      if (a.mode === 'none') delete l.mask;
      else if (a.mode === 'apply') applyMask(l, ds);
      else if (a.mode === 'shape') {
        const c = makeCanvas(ds.doc.width, ds.doc.height), x = ctx2d(c);
        if (a.feather) x.filter = `blur(${num(a.feather, 0)}px)`;
        x.beginPath();
        const X = num(a.x, 0), Y = num(a.y, 0), W = num(a.width, ds.doc.width), H = num(a.height, ds.doc.height);
        if (a.shape === 'ellipse') x.ellipse(X + W / 2, Y + H / 2, W / 2, H / 2, 0, 0, Math.PI * 2);
        else if ((x as any).roundRect && a.radius) (x as any).roundRect(X, Y, W, H, num(a.radius, 0));
        else x.rect(X, Y, W, H);
        x.fill();
        if (a.invert) {
          const inv = makeCanvas(c.width, c.height), y = ctx2d(inv);
          y.fillRect(0, 0, c.width, c.height);
          y.globalCompositeOperation = 'destination-out';
          y.drawImage(c, 0, 0);
          l.mask = { canvas: inv, x: 0, y: 0, enabled: true };
        } else l.mask = { canvas: c, x: 0, y: 0, enabled: true };
      } else addMask(l, a.mode, ds);
      commit('AI: Layer Mask', ds);
      return layerSummary(findLayerIn(ds.doc, a.id)!);
    },
  },
  {
    name: 'add_adjustment_layer', description: 'Add a non-destructive adjustment layer (like Photoshop) that changes everything below it: any filter with point=true, e.g. curves, levels, hue-saturation, brightness-contrast, color-balance, vibrance, exposure, photo-filter, gradient-map, black & white (grayscale), invert, posterize, threshold. Edit later with update_layer {id, params:{...}}; limit it with set_layer_mask.',
    inputSchema: { type: 'object', required: ['filter'], properties: { filter: { type: 'string' }, params: { type: 'object' }, name: { type: 'string' }, opacity: { type: 'number' } } },
    run: async (a) => {
      const ds = need(cur());
      const { newAdjustment } = await import('../core/adjust');
      const l = newAdjustment(ds, String(a.filter), a.params ?? {});
      common(l, a);
      commit(`AI: ${l.name} Layer`, ds);
      return { ...layerSummary(l), filter: l.filter, params: l.params };
    },
  },
  {
    name: 'set_guides', description: 'Replace the document ruler guides (vertical x positions, horizontal y positions, in px). Shapes snap to guides when moved in the UI.',
    inputSchema: { type: 'object', properties: { vertical: { type: 'array', items: { type: 'number' } }, horizontal: { type: 'array', items: { type: 'number' } } } },
    run: (a) => {
      const ds = need(cur());
      ds.doc.guides = { v: (a.vertical ?? []).map(Number), h: (a.horizontal ?? []).map(Number) };
      ds.dirty = true;
      touch();
      return ds.doc.guides;
    },
  },
  {
    name: 'merge_layers', description: 'mode "down": merge the given layer into the one below. "visible": merge all visible layers into one. "flatten": flatten the image to a single layer.',
    inputSchema: { type: 'object', required: ['mode'], properties: { mode: { type: 'string', enum: ['down', 'visible', 'flatten'] }, id: { type: 'string' } } },
    run: async (a) => {
      const ds = need(cur());
      const ops = await import('../core/ops');
      if (a.mode === 'flatten') ops.flattenImage(ds);
      else if (a.mode === 'down') { if (!a.id) throw new Error('id is required for mode "down"'); getLayer(ds, a.id); ds.selected = [a.id]; ops.mergeDown(ds); }
      else {
        const { flatten } = await import('../core/render');
        const r = ops.newRaster(ds, 'Merged', flatten(ds.doc, 1, false));
        ds.doc.layers = [...ds.doc.layers.filter((l) => !l.visible), r];
        ds.selected = [r.id];
        commit('AI: Merge Visible', ds);
      }
      return docInfo(ds);
    },
  },
  {
    name: 'set_clipping_mask', description: 'Clip a layer to the layer directly below it (Photoshop clipping mask): the layer only shows where the one below has pixels. Perfect for putting a photo or gradient inside a shape or text.',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, clip: { type: 'boolean', description: 'default true' } } },
    run: (a) => {
      const ds = need(cur());
      const l = getLayer(ds, a.id);
      l.clip = a.clip === false ? undefined : true;
      commit(l.clip ? 'AI: Clipping Mask' : 'AI: Release Clipping Mask', ds);
      return layerSummary(l);
    },
  },
  {
    name: 'select_area', description: 'Make a pixel selection (rect, ellipse or polygon points) that limits apply_filter, draw_stroke… use mode replace/add/subtract/intersect, or "clear" to deselect.',
    inputSchema: { type: 'object', required: ['shape'], properties: { shape: { type: 'string', enum: ['rect', 'ellipse', 'polygon', 'all', 'clear'] }, x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' }, points: { type: 'array', items: { type: 'array', items: { type: 'number' } } }, mode: { type: 'string', enum: ['replace', 'add', 'subtract', 'intersect'] } } },
    run: async (a) => {
      const ds = need(cur());
      const sel = await import('../core/selection');
      if (a.shape === 'clear') { sel.deselect(ds); return { selection: null }; }
      const p = new Path2D();
      if (a.shape === 'all') p.rect(0, 0, ds.doc.width, ds.doc.height);
      else if (a.shape === 'ellipse') p.ellipse(num(a.x, 0) + num(a.width, 0) / 2, num(a.y, 0) + num(a.height, 0) / 2, num(a.width, 0) / 2, num(a.height, 0) / 2, 0, 0, Math.PI * 2);
      else if (a.shape === 'polygon') (a.points ?? []).forEach(([px, py]: number[], i: number) => (i ? p.lineTo(px, py) : p.moveTo(px, py)));
      else p.rect(num(a.x, 0), num(a.y, 0), num(a.width, 0), num(a.height, 0));
      sel.setSelection(ds, p, a.mode ?? 'replace');
      return { selection: sel.maskBounds(ds) };
    },
  },
  {
    name: 'apply_filter', description: `Apply a pixel filter/adjustment to a layer (vector layers are rasterized). Filters: ${FILTERS.map((f) => `${f.id}(${f.params.map((p: any) => p.type === 'select' ? `${p.key}: ${(p.options ?? []).map((o: any) => o.value ?? o).join('|')}` : p.type === 'color' ? `${p.key}: color` : p.type === 'checkbox' ? `${p.key}: bool` : p.type === 'text' ? `${p.key}: text (curves: "x,y;x,y")` : `${p.key} ${p.min}..${p.max}`).join(', ')})`).join('; ')}.`,
    inputSchema: { type: 'object', required: ['id', 'filter'], properties: { id: { type: 'string' }, filter: { type: 'string', enum: FILTERS.map((f) => f.id) }, params: { type: 'object' } } },
    run: (a) => {
      const ds = need(cur());
      const f = filterById(a.filter);
      if (!f) throw new Error(`Unknown filter ${a.filter}`);
      const l = getLayer(ds, a.id);
      const r = applyFilter(ds, l, f, a.params ?? {});
      if (!r) throw new Error('Layer is locked');
      commit(`AI: ${f.name}`, ds);
      return layerSummary(r);
    },
  },
  {
    name: 'render_preview', description: 'Render the document (or one layer) to a PNG so you can SEE the design. Use it to check layout, contrast and alignment.',
    inputSchema: { type: 'object', properties: { max_size: { type: 'number', description: 'Longest side in px (default 1024)' }, layer_id: { type: 'string' } } },
    run: (a) => {
      const ds = need(cur());
      const max = num(a.max_size, 1024);
      let c: HTMLCanvasElement;
      if (a.layer_id) {
        const l = getLayer(ds, a.layer_id);
        const s = Math.min(1, max / Math.max(ds.doc.width, ds.doc.height));
        c = makeCanvas(ds.doc.width * s, ds.doc.height * s);
        const x = ctx2d(c); x.scale(s, s); drawLayer(x, { ...l, visible: true } as Layer);
      } else c = flatten(ds.doc, Math.min(1, max / Math.max(ds.doc.width, ds.doc.height)));
      return { __image: c.toDataURL('image/png').split(',')[1], note: `${ds.doc.width}×${ds.doc.height} document, preview ${c.width}×${c.height}` };
    },
  },
  {
    name: 'export_document', description: 'Export the active document. format: png, jpg, webp, svg, psd or lucentedit. With path (desktop app), writes the file there; otherwise returns PNG/JPG/WebP previews inline.',
    inputSchema: { type: 'object', required: ['format'], properties: { format: { type: 'string', enum: ['png', 'jpg', 'webp', 'svg', 'psd', 'lucentedit'] }, path: { type: 'string', description: 'Absolute output file path' }, scale: { type: 'number' }, quality: { type: 'number', description: '0-1 for jpg/webp' } } },
    run: async (a) => {
      const ds = need(cur());
      const fmt = a.format as ExportFormat;
      const bytes = await exportBytes(ds.doc, fmt, { scale: num(a.scale, 1), quality: num(a.quality, 0.92) });
      if (a.path) {
        if (!isTauri) throw new Error('Writing files requires the LucentEdit desktop app');
        await writePath(a.path, bytes);
        return { saved: a.path, bytes: bytes.length };
      }
      if (fmt === 'svg') return new TextDecoder().decode(bytes);
      if (fmt === 'png' || fmt === 'jpg' || fmt === 'webp') {
        const url = await bytesToDataURL(bytes, fmt === 'jpg' ? 'image/jpeg' : `image/${fmt}`);
        return { __image: url.split(',')[1], __mime: fmt === 'jpg' ? 'image/jpeg' : `image/${fmt}`, note: 'Pass a path to save to disk.' };
      }
      throw new Error('Pass a path to export PSD or .lucentedit files');
    },
  },
  {
    name: 'open_file', description: 'Open an image, SVG, PSD or .lucentedit file from a local path (desktop app) or URL as a new document.',
    inputSchema: { type: 'object', required: ['path'], properties: { path: { type: 'string' } } },
    run: async (a) => {
      const f = await loadSource(String(a.path));
      const doc = await docFromFile({ ...f, path: /^(https?|data):/.test(a.path) ? undefined : a.path });
      return docInfo(openDocState(doc, `Open ${f.name}`));
    },
  },
  {
    name: 'save_document', description: 'Save the active document as an editable .lucentedit file to path (or its previous path).',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
    run: async (a) => {
      const ds = need(cur());
      const path = a.path ?? ds.doc.path;
      if (!path) throw new Error('Provide a path, e.g. /home/me/Designs/poster.lucentedit');
      await writePath(path, await exportBytes(ds.doc, 'lucentedit'));
      ds.doc.path = path; ds.dirty = false; touch();
      return { saved: path };
    },
  },
  {
    name: 'undo', description: 'Undo the last N steps (default 1).', inputSchema: { type: 'object', properties: { steps: { type: 'number' } } },
    run: (a) => { for (let i = 0; i < Math.min(100, num(a.steps, 1)); i++) undo(); return docInfo(need(cur())); },
  },
  {
    name: 'redo', description: 'Redo N steps (default 1).', inputSchema: { type: 'object', properties: { steps: { type: 'number' } } },
    run: (a) => { for (let i = 0; i < Math.min(100, num(a.steps, 1)); i++) redo(); return docInfo(need(cur())); },
  },
  {
    name: 'list_fonts', description: 'Font families that are safe to use in add_text.', inputSchema: { type: 'object', properties: {} },
    run: () => FONTS.filter((f) => document.fonts.check(`16px "${f}"`) || ['serif', 'sans-serif', 'monospace', 'cursive', 'system-ui', 'Inter Variable'].includes(f)),
  },
  {
    name: 'batch', description: 'Run many tool calls in order in one request: {"operations":[{"tool":"add_shape","args":{...}}, ...]}. Stops at the first error. Results are returned in order.',
    inputSchema: { type: 'object', required: ['operations'], properties: { operations: { type: 'array', items: { type: 'object', properties: { tool: { type: 'string' }, args: { type: 'object' } }, required: ['tool'] } } } },
    run: async (a) => {
      const out: any[] = [];
      for (const [i, op] of (a.operations as any[]).entries()) {
        const t = TOOLS.find((x) => x.name === op.tool);
        if (!t || t.name === 'batch') throw new Error(`Operation ${i}: unknown tool ${op.tool}`);
        try { const r = await t.run(op.args ?? {}); out.push(r && r.__image ? '[image omitted]' : r); }
        catch (e: any) { throw new Error(`Operation ${i} (${op.tool}) failed: ${e.message ?? e}. Earlier operations were applied.`); }
      }
      return out;
    },
  },
];

function toContent(r: any) {
  if (r && typeof r === 'object' && r.__image) {
    return [{ type: 'image', data: r.__image, mimeType: r.__mime ?? 'image/png' }, ...(r.note ? [{ type: 'text', text: r.note }] : [])];
  }
  return [{ type: 'text', text: typeof r === 'string' ? r : JSON.stringify(r, null, 1) }];
}

async function handleOne(m: Json): Promise<Json | null> {
  const id = m.id;
  const reply = (result: any) => ({ jsonrpc: '2.0', id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });
  if (m.jsonrpc !== '2.0' || typeof m.method !== 'string') return id === undefined ? null : fail(-32600, 'Invalid request');
  if (id === undefined || id === null) return null; // notification
  switch (m.method) {
    case 'initialize': {
      const want = m.params?.protocolVersion;
      return reply({
        protocolVersion: PROTOCOLS.includes(want) ? want : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'lucentedit', title: 'LucentEdit Design Studio', version: '0.2.0' },
        instructions: GUIDE,
      });
    }
    case 'ping': return reply({});
    case 'tools/list': return reply({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case 'resources/list': return reply({ resources: [] });
    case 'prompts/list': return reply({ prompts: [] });
    case 'tools/call': {
      const t = TOOLS.find((x) => x.name === m.params?.name);
      if (!t) return fail(-32602, `Unknown tool: ${m.params?.name}`);
      await whenIdle();
      mcpStatus.value = { ...mcpStatus.value, active: mcpStatus.value.active + 1, last: t.name };
      try {
        const r = await t.run(m.params?.arguments ?? {});
        return reply({ content: toContent(r) });
      } catch (e: any) {
        return reply({ content: [{ type: 'text', text: `Error: ${e?.message ?? e}` }], isError: true });
      } finally {
        mcpStatus.value = { ...mcpStatus.value, active: Math.max(0, mcpStatus.value.active - 1) };
      }
    }
  }
  return fail(-32601, `Method not found: ${m.method}`);
}

/** Handle one HTTP POST body. Returns the response body, or null for "202 Accepted". */
export async function handleMcp(body: string): Promise<string | null> {
  let msg: any;
  try { msg = JSON.parse(body); } catch { return JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  if (Array.isArray(msg)) {
    const out = (await Promise.all(msg.map(handleOne))).filter(Boolean);
    return out.length ? JSON.stringify(out) : null;
  }
  const r = await handleOne(msg);
  return r ? JSON.stringify(r) : null;
}

/** Wire the desktop relay: the Rust side emits "mcp-request" for each POST /mcp. */
export async function startMcpBridge() {
  // Exposed for testing in a plain browser too: await window.lucentEditMcp('{"jsonrpc":"2.0",...}')
  (window as any).lucentEditMcp = handleMcp;
  if (!isTauri) return;
  const { listen } = await import('@tauri-apps/api/event');
  const { invoke } = await import('@tauri-apps/api/core');
  await listen<{ id: string; body: string }>('mcp-request', async (e) => {
    let res: string | null;
    try { res = await handleMcp(e.payload.body); } catch (err: any) { res = JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: String(err?.message ?? err) } }); }
    await invoke('mcp_respond', { id: e.payload.id, body: res });
  });
  const port = await invoke<number>('mcp_port');
  mcpStatus.value = { ...mcpStatus.value, port, enabled: port > 0 };
  const files = await invoke<string[]>('initial_files');
  for (const p of files) {
    try { const doc = await docFromFile({ name: p.split(/[\\/]/).pop()!, path: p, bytes: await readPath(p) }); openDocState(doc, 'Open'); } catch { /* ignore */ }
  }
}

export { imageToCanvas, walk };
