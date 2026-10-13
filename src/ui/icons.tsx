import {
  Move, SquareDashed, Lasso, WandSparkles, Crop, Pipette, Brush, Eraser, PaintBucket, Blend, Type, PenTool,
  MousePointer2, Shapes, Square, Circle, Hexagon, Star, Minus, Hand, ZoomIn, ZoomOut, Eye, EyeOff, Lock, Unlock,
  Plus, Trash2, Copy, FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown, X, ArrowLeftRight, RotateCcw,
  Undo2, Redo2, Image, Layers, History, Palette, SlidersHorizontal, Download, Upload, FileImage, Sparkles, Plug,
  Keyboard, Info, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal,
  AlignCenterHorizontal, AlignEndHorizontal, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Check, Search, Grid3x3, Magnet, Maximize, FlipHorizontal2,
  FlipVertical2, RotateCw, Spline, Link, Command, Heart, Merge, Group, Ungroup, Frame, CircleDashed, Droplet, Sun,
  MonitorSmartphone, FileText, LayoutTemplate, Smartphone, Monitor, Printer, Film, Megaphone, Gem,
} from 'lucide-preact';

const MAP: Record<string, any> = {
  move: Move, marquee: SquareDashed, lasso: Lasso, wand: WandSparkles, crop: Crop, eyedropper: Pipette, brush: Brush,
  eraser: Eraser, bucket: PaintBucket, gradient: Blend, text: Type, pen: PenTool, direct: MousePointer2, shape: Shapes,
  rect: Square, ellipse: Circle, polygon: Hexagon, star: Star, line: Minus, hand: Hand, zoom: ZoomIn, zoomOut: ZoomOut,
  eye: Eye, eyeOff: EyeOff, lock: Lock, unlock: Unlock, plus: Plus, trash: Trash2, copy: Copy, folderPlus: FolderPlus,
  folder: Folder, folderOpen: FolderOpen, right: ChevronRight, down: ChevronDown, x: X, swap: ArrowLeftRight,
  reset: RotateCcw, undo: Undo2, redo: Redo2, image: Image, layers: Layers, history: History, palette: Palette,
  sliders: SlidersHorizontal, download: Download, upload: Upload, file: FileImage, sparkles: Sparkles, plug: Plug,
  keyboard: Keyboard, info: Info, alignLeft: AlignStartVertical, alignHCenter: AlignCenterVertical,
  alignRight: AlignEndVertical, alignTop: AlignStartHorizontal, alignVCenter: AlignCenterHorizontal,
  alignBottom: AlignEndHorizontal, distH: AlignHorizontalDistributeCenter, distV: AlignVerticalDistributeCenter,
  textLeft: AlignLeft, textCenter: AlignCenter, textRight: AlignRight, bold: Bold, italic: Italic, check: Check,
  search: Search, grid: Grid3x3, magnet: Magnet, fit: Maximize, flipH: FlipHorizontal2, flipV: FlipVertical2,
  rotate: RotateCw, spline: Spline, link: Link, command: Command, heart: Heart, merge: Merge, group: Group,
  ungroup: Ungroup, frame: Frame, circleDashed: CircleDashed, droplet: Droplet, sun: Sun, devices: MonitorSmartphone,
  doc: FileText, template: LayoutTemplate, phone: Smartphone, monitor: Monitor, print: Printer, film: Film,
  ad: Megaphone, gem: Gem,
};

export function Icon({ name, size = 16, stroke = 1.75 }: { name: string; size?: number; stroke?: number }) {
  const C = MAP[name] ?? Square;
  return <C size={size} strokeWidth={stroke} />;
}
