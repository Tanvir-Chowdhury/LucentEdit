import { signal } from '@preact/signals';

// Contract between the viewport and the tools. Coordinates: x/y in document pixels,
// sx/sy in CSS pixels relative to the viewport element.

export interface PEvent {
  x: number; y: number; sx: number; sy: number;
  shift: boolean; alt: boolean; ctrl: boolean;
  button: number; pressure: number; pointerType: string;
}

export interface OverlayCtx {
  ctx: CanvasRenderingContext2D; // CSS-pixel space
  zoom: number;
  toScreen: (x: number, y: number) => { x: number; y: number };
  time: number;
}

export interface Tool {
  cursor?: (e: PEvent | null) => string;
  down?(e: PEvent): void;
  move?(e: PEvent): void; // while dragging
  up?(e: PEvent): void;
  hover?(e: PEvent): void; // pointer moving without buttons
  dbl?(e: PEvent): void;
  key?(e: KeyboardEvent): boolean; // return true when handled
  overlay?(o: OverlayCtx): void;
  deactivate?(): void;
}

/** Set by the viewport so tools can convert coordinates and request text editing. */
export const view = {
  zoom: 1,
  toScreen: (x: number, y: number) => ({ x, y }),
  toDoc: (x: number, y: number) => ({ x, y }),
};

export const textEditing = signal<string | null>(null);
export const cropRect = signal<{ x: number; y: number; w: number; h: number } | null>(null);
