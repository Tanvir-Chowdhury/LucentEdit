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
export const handTool: Tool = {
  cursor: () => (panStart ? 'grabbing' : 'grab'),
  down(e) { const ds = cur(); if (ds) panStart = { sx: e.sx, sy: e.sy, px: ds.view.panX, py: ds.view.panY }; },
  move(e) {
    const ds = cur();
    if (!ds || !panStart) return;
    ds.view.panX = panStart.px + (e.sx - panStart.sx);
    ds.view.panY = panStart.py + (e.sy - panStart.sy);
    touch(false);
  },
  up() { panStart = null; },
};

export function zoomAt(factor: number, sx: number, sy: number) {
  const ds = cur();
  if (!ds) return;
  const v = ds.view;
  const z = Math.min(64, Math.max(0.02, v.zoom * factor));
  // Keep the document point under the cursor fixed.
  v.panX = sx - ((sx - v.panX) * z) / v.zoom;
  v.panY = sy - ((sy - v.panY) * z) / v.zoom;
  v.zoom = z;
  view.zoom = z;
  touch();
}

export const zoomTool: Tool = {
  cursor: (e) => (e?.alt ? 'zoom-out' : 'zoom-in'),
  down(e) { zoomAt(e.alt ? 1 / 1.5 : 1.5, e.sx, e.sy); },
};

export interface ToolMeta { id: ToolId; label: string; key: string; icon: string; tool: Tool; variants?: () => string }

export const TOOLS: ToolMeta[] = [
  { id: 'move', label: 'Move', key: 'V', icon: 'move', tool: moveTool },
  { id: 'marquee', label: 'Marquee', key: 'M', icon: 'marquee', tool: marqueeTool },
  { id: 'lasso', label: 'Lasso', key: 'L', icon: 'lasso', tool: lassoTool },
  { id: 'wand', label: 'Magic Wand', key: 'W', icon: 'wand', tool: wandTool },
  { id: 'crop', label: 'Crop', key: 'C', icon: 'crop', tool: cropTool },
  { id: 'eyedropper', label: 'Eyedropper', key: 'I', icon: 'eyedropper', tool: eyedropperTool },
  { id: 'brush', label: 'Brush', key: 'B', icon: 'brush', tool: brushTool },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: 'eraser', tool: eraserTool },
  { id: 'bucket', label: 'Paint Bucket', key: 'G', icon: 'bucket', tool: bucketTool },
  { id: 'gradient', label: 'Gradient', key: 'G', icon: 'gradient', tool: gradientTool },
  { id: 'text', label: 'Type', key: 'T', icon: 'text', tool: textTool },
  { id: 'pen', label: 'Pen', key: 'P', icon: 'pen', tool: penTool },
  { id: 'direct', label: 'Direct Selection', key: 'A', icon: 'direct', tool: directTool },
  { id: 'shape', label: 'Shapes', key: 'U', icon: 'shape', tool: shapeTool },
  { id: 'hand', label: 'Hand', key: 'H', icon: 'hand', tool: handTool },
  { id: 'zoom', label: 'Zoom', key: 'Z', icon: 'zoom', tool: zoomTool },
];

export const toolById = (id: ToolId) => TOOLS.find((t) => t.id === id)!;

export function setTool(id: ToolId) {
  if (tool.value === id) return;
  toolById(tool.value)?.tool.deactivate?.();
  tool.value = id;
  touch();
}

/** Photoshop-style shortcut: pressing a key again (with Shift) cycles tools sharing that key. */
export function toolShortcut(key: string, shift: boolean): boolean {
  const k = key.toUpperCase();
  const matches = TOOLS.filter((t) => t.key === k);
  if (!matches.length) return false;
  if (shift) {
    if (k === 'U') {
      const order = ['rect', 'ellipse', 'polygon', 'star', 'line'] as const;
      const i = order.indexOf(shapeOpts.value.shape);
      shapeOpts.value = { ...shapeOpts.value, shape: order[(i + 1) % order.length] };
      setTool('shape');
      return true;
    }
    if (k === 'M') {
      marquee.value = { shape: marquee.value.shape === 'rect' ? 'ellipse' : 'rect' };
      setTool('marquee');
      return true;
    }
    if (k === 'G' && tool.value === 'gradient') {
      gradientOpts.value = { type: gradientOpts.value.type === 'linear' ? 'radial' : 'linear' };
    }
    const i = matches.findIndex((t) => t.id === tool.value);
    setTool(matches[(i + 1) % matches.length].id);
    return true;
  }
  if (!matches.some((t) => t.id === tool.value)) setTool(matches[0].id);
  return true;
}
