// Document model. Everything is plain data except raster pixels, which live in a canvas.
// Coordinates are document pixels; layers are drawn in a local box [0,w]x[0,h] that is
// rotated around its center and placed at (x, y).

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light'
  | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

export const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn',
  'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
];

export interface GradientStop { offset: number; color: string }
export interface Gradient { type: 'linear' | 'radial'; angle?: number; stops: GradientStop[] }
/** A CSS color string or a gradient spanning the layer box. */
export type Paint = string | Gradient;

export interface Stroke {
  paint: Paint;
  width: number;
  dash?: number[];
  cap?: CanvasLineCap;
  join?: CanvasLineJoin;
}

export interface ShadowFx { enabled: boolean; color: string; blur: number; x: number; y: number }
export interface GlowFx { enabled: boolean; color: string; blur: number }
export interface Effects { shadow?: ShadowFx; glow?: GlowFx }

/** Layer mask in document space: alpha 255 reveals, 0 hides. Never mutate a shared canvas. */
export interface LayerMask { canvas: HTMLCanvasElement; x: number; y: number; enabled: boolean }

/** Bezier node with absolute handle positions (in the path's natural coordinate space). */
export interface PathNode { x: number; y: number; ix: number; iy: number; ox: number; oy: number; smooth?: boolean }
export interface SubPath { nodes: PathNode[]; closed: boolean }

interface Base {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  blend: BlendMode;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees, clockwise
  effects?: Effects;
  mask?: LayerMask;
  /** Clipping mask: only visible where the layer below has pixels. */
  clip?: boolean;
}

export interface RasterLayer extends Base {
  type: 'raster';
  /** Pixels. Never mutate a canvas that may be shared with history; replace it (copy-on-write). */
  canvas: HTMLCanvasElement;
}

export type ShapeKind = 'rect' | 'ellipse' | 'polygon' | 'star' | 'path';

export interface ShapeLayer extends Base {
  type: 'shape';
  shape: ShapeKind;
  fill: Paint | null;
  stroke: Stroke | null;
  radius?: number; // rect corner radius
  sides?: number; // polygon sides / star points
  inner?: number; // star inner radius ratio 0..1
  paths?: SubPath[]; // for 'path'
  nw?: number; // natural size of path coordinates
  nh?: number;
  fillRule?: CanvasFillRule;
}

export interface TextLayer extends Base {
  type: 'text';
  text: string;
  family: string;
  size: number;
  weight: number;
  italic: boolean;
  fill: Paint;
  align: CanvasTextAlign;
  lineHeight: number; // multiplier
  letterSpacing: number; // px
  stroke: Stroke | null;
  /** true: box width follows the text (point text); false: wraps at w (paragraph text). */
  autoWidth: boolean;
}

export interface GroupLayer extends Base {
  type: 'group';
  children: Layer[]; // bottom -> top, in document coordinates
  expanded: boolean;
}

/** Non-destructive adjustment: runs a point filter (FilterDef.point) on everything below it. */
export interface AdjustLayer extends Base {
  type: 'adjust';
  filter: string;
  params: Record<string, any>;
}

export type Layer = RasterLayer | ShapeLayer | TextLayer | GroupLayer | AdjustLayer;

export interface Doc {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string | null; // null = transparent
  layers: Layer[]; // bottom -> top
  path?: string; // where it was saved (desktop)
  /** Ruler guides in document pixels. */
  guides?: { v: number[]; h: number[] };
}

/** rotation: Rotate View tool angle in degrees, around the viewport center (view only). */
export interface View { zoom: number; panX: number; panY: number; rotation?: number }

export interface Snapshot {
  label: string;
  name: string;
  width: number;
  height: number;
  background: string | null;
  layers: Layer[];
  selected: string[];
}

export interface DocState {
  doc: Doc;
  history: Snapshot[];
  hIndex: number;
  selected: string[]; // layer ids
  /** Pixel selection: doc-sized canvas, alpha = selected. */
  mask: HTMLCanvasElement | null;
  /** Saved selections (Select > Save Selection), doc-sized alpha masks. */
  channels?: { name: string; mask: HTMLCanvasElement }[];
  /** Quick Mask being painted (doc-sized, alpha = selected); ds.mask is null while it exists. */
  qmask?: HTMLCanvasElement;
  view: View;
  dirty: boolean;
}
