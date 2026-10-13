import type { Tool } from './types';
import { view } from './types';
import type { ToolId } from '../core/store';
import { tool, cur, touch, shapeOpts, marquee, gradientOpts } from '../core/store';
import { moveTool } from './move';
import { marqueeTool, lassoTool, wandTool, cropTool } from './select';
import { brushTool, eraserTool, bucketTool, gradientTool, eyedropperTool } from './paint';
import { shapeTool, penTool, directTool, textTool } from './vector';

// Pan & zoom tools live here because they only touch the view.

let panStart: { sx: number; sy: number; px: number; py: number } | null = null;

/** Map a screen-space vector into pre-rotation view space (pan happens before Rotate View). */
export function unrotate(dx: number, dy: number, rotation = 0): [number, number] {
  if (!rotation) return [dx, dy];
  const a = (-rotation * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [dx * c - dy * s, dx * s + dy * c];
}
export const handTool: Tool = {
  cursor: () => (panStart ? 'grabbing' : 'grab'),
  down(e) { const ds = cur(); if (ds) panStart = { sx: e.sx, sy: e.sy, px: ds.view.panX, py: ds.view.panY }; },
  move(e) {
    const ds = cur();
    if (!ds || !panStart) return;
    const [dx, dy] = unrotate(e.sx - panStart.sx, e.sy - panStart.sy, ds.view.rotation);
    ds.view.panX = panStart.px + dx;
    ds.view.panY = panStart.py + dy;
    touch(false);
  },
  up() { panStart = null; },
};

export function zoomAt(factor: number, sx: number, sy: number) {
  const ds = cur();
  if (!ds) return;
  const v = ds.view;
  const z = Math.min(64, Math.max(0.02, v.zoom * factor));
  // Keep the document point under the cursor fixed (in pre-rotation view space).
  const [ux, uy] = unrotate(sx - view.width / 2, sy - view.height / 2, v.rotation);
  const qx = view.width / 2 + ux, qy = view.height / 2 + uy;
  v.panX = qx - ((qx - v.panX) * z) / v.zoom;
  v.panY = qy - ((qy - v.panY) * z) / v.zoom;
  v.zoom = z;
  view.zoom = z;
  touch();
}

export const zoomTool: Tool = {
  cursor: (e) => (e?.alt ? 'zoom-out' : 'zoom-in'),
  down(e) { zoomAt(e.alt ? 1 / 1.5 : 1.5, e.sx, e.sy); },
};

import type { ToolMeta } from './types';
import { signal } from '@preact/signals';
import { CircleDashed, Square, Circle, Triangle, Hexagon, Star, Minus, Shapes } from 'lucide-preact';
import { EXTRA_TOOLS } from './extra';
export type { ToolMeta };

type ShapeKind = 'rect' | 'ellipse' | 'triangle' | 'polygon' | 'star' | 'line' | 'custom';

/** A tool that shares another tool's behavior but presets an option first (e.g. Ellipse vs Rectangle). */
function variant(base: Tool, before: () => void): Tool {
  return { ...base, down(e) { before(); base.down?.(e); }, hover(e) { before(); base.hover?.(e); } };
}
const shapeVariant = (shape: ShapeKind) => variant(shapeTool, () => { if (shapeOpts.value.shape !== shape) shapeOpts.value = { ...shapeOpts.value, shape }; });
const ellipseMarquee = variant(marqueeTool, () => { if (marquee.value.shape !== 'ellipse') marquee.value = { shape: 'ellipse' }; });
const rectMarquee = variant(marqueeTool, () => { if (marquee.value.shape !== 'rect') marquee.value = { shape: 'rect' }; });

export const TOOLS: ToolMeta[] = [
  { id: 'move', group: 'move', label: 'Move', key: 'V', icon: 'move', tool: moveTool },
  { id: 'marquee', group: 'marquee', label: 'Rectangular Marquee', key: 'M', icon: 'marquee', tool: rectMarquee },
  { id: 'marqueeEllipse', group: 'marquee', label: 'Elliptical Marquee', key: 'M', icon: CircleDashed, tool: ellipseMarquee },
  { id: 'lasso', group: 'lasso', label: 'Lasso', key: 'L', icon: 'lasso', tool: lassoTool },
  { id: 'wand', group: 'wand', label: 'Magic Wand', key: 'W', icon: 'wand', tool: wandTool },
  { id: 'crop', group: 'crop', label: 'Crop', key: 'C', icon: 'crop', tool: cropTool },
  { id: 'eyedropper', group: 'eyedropper', label: 'Eyedropper', key: 'I', icon: 'eyedropper', tool: eyedropperTool },
  { id: 'brush', group: 'brush', label: 'Brush', key: 'B', icon: 'brush', tool: brushTool },
  { id: 'eraser', group: 'eraser', label: 'Eraser', key: 'E', icon: 'eraser', tool: eraserTool },
  { id: 'gradient', group: 'gradient', label: 'Gradient', key: 'G', icon: 'gradient', tool: gradientTool },
  { id: 'bucket', group: 'gradient', label: 'Paint Bucket', key: 'G', icon: 'bucket', tool: bucketTool },
  { id: 'pen', group: 'pen', label: 'Pen', key: 'P', icon: 'pen', tool: penTool },
  { id: 'text', group: 'type', label: 'Horizontal Type', key: 'T', icon: 'text', tool: textTool },
  { id: 'direct', group: 'path', label: 'Direct Selection', key: 'A', icon: 'direct', tool: directTool },
  { id: 'shape', group: 'shape', label: 'Rectangle', key: 'U', icon: Square, tool: shapeVariant('rect') },
  { id: 'shapeEllipse', group: 'shape', label: 'Ellipse', key: 'U', icon: Circle, tool: shapeVariant('ellipse') },
  { id: 'shapeTriangle', group: 'shape', label: 'Triangle', key: 'U', icon: Triangle, tool: shapeVariant('triangle') },
  { id: 'shapePolygon', group: 'shape', label: 'Polygon', key: 'U', icon: Hexagon, tool: shapeVariant('polygon') },
  { id: 'shapeStar', group: 'shape', label: 'Star', key: 'U', icon: Star, tool: shapeVariant('star') },
  { id: 'shapeLine', group: 'shape', label: 'Line', key: 'U', icon: Minus, tool: shapeVariant('line') },
  { id: 'shapeCustom', group: 'shape', label: 'Custom Shape', key: 'U', icon: Shapes, tool: shapeVariant('custom') },
  { id: 'hand', group: 'hand', label: 'Hand', key: 'H', icon: 'hand', tool: handTool },
  { id: 'zoom', group: 'zoom', label: 'Zoom', key: 'Z', icon: 'zoom', tool: zoomTool },
  ...EXTRA_TOOLS,
];

/** Toolbar order (Photoshop's), '-' is a separator. Groups with no registered tools are skipped. */
export const GROUP_ORDER = [
  'move', '-', 'marquee', 'lasso', 'wand', 'crop', 'eyedropper', '-', 'heal', 'brush', 'stamp', 'historyBrush', 'eraser',
  'gradient', 'blurTools', 'dodge', '-', 'pen', 'type', 'path', 'shape', '-', 'hand', 'zoom',
];

/** Last tool used in each group: the one the toolbar slot shows. */
export const groupCurrent = signal<Record<string, string>>({});

export const toolById = (id: ToolId) => TOOLS.find((t) => t.id === id) ?? TOOLS[0];
export const groupTools = (g: string) => TOOLS.filter((t) => t.group === g);

export function setTool(id: ToolId) {
  const meta = TOOLS.find((t) => t.id === id);
  if (!meta || tool.value === id) return;
  toolById(tool.value)?.tool.deactivate?.();
  tool.value = id;
  groupCurrent.value = { ...groupCurrent.value, [meta.group]: id };
  if (id.startsWith('shape')) {
    const kind = ({ shape: 'rect', shapeEllipse: 'ellipse', shapeTriangle: 'triangle', shapePolygon: 'polygon', shapeStar: 'star', shapeLine: 'line', shapeCustom: 'custom' } as Record<string, ShapeKind>)[id];
    if (kind) shapeOpts.value = { ...shapeOpts.value, shape: kind };
  }
  if (id === 'marquee' || id === 'marqueeEllipse') marquee.value = { shape: id === 'marquee' ? 'rect' : 'ellipse' };
  touch();
}

/**
 * Photoshop tool keys: a letter selects the group's current tool; Shift+letter cycles through
 * all tools that share the letter.
 */
export function toolShortcut(key: string, shift: boolean): boolean {
  const k = key.toUpperCase();
  const matches = TOOLS.filter((t) => t.key === k);
  if (!matches.length) return false;
  if (shift) {
    if (k === 'G' && tool.value === 'gradient') gradientOpts.value = { type: gradientOpts.value.type === 'linear' ? 'radial' : 'linear' };
    const i = matches.findIndex((t) => t.id === tool.value);
    setTool(matches[(i + 1) % matches.length].id);
    return true;
  }
  if (matches.some((t) => t.id === tool.value)) return true;
  const g = matches[0].group;
  const remembered = groupCurrent.value[g];
  setTool(remembered && matches.some((t) => t.id === remembered) ? remembered : matches[0].id);
  return true;
}

/** Tools contributed by other modules register here (kept last so they never shadow core ids). */
export function registerTools(metas: ToolMeta[]) {
  for (const m of metas) if (!TOOLS.some((t) => t.id === m.id)) TOOLS.push(m);
}
