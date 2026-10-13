// Pure (DOM-free) data and logic for Photoshop-style Actions: step types, which commands are
// recordable, step appending with filter dedupe, and function-key matching.
// Kept import-free so actions.check.ts can run it under plain Node.

export type Step = (
  | { kind: 'command'; id: string }
  | { kind: 'filter'; id: string; params: Record<string, any> }
  | { kind: 'mcp'; tool: string; args: any }
  | { kind: 'stop'; message: string }
) & { enabled?: boolean };

export interface Action { id: string; name: string; set: string; steps: Step[]; key?: string; color?: string }

/** Commands that do not change the document (view, files, windows, help) are never recorded. */
const SKIP = /^(palette|shortcuts|preferences|screenMode.*|zoom.*|fit|actual|win.*|togglePanels|about|mcp|new|open|save.*|export.*|close.*|undo|redo2?|actionsPanel|playAction|toggleRecord)$/;
export const isRecordable = (commandId: string) => !SKIP.test(commandId);

/**
 * Append a recorded step. A filter step replaces the most recent `filter:<id>` command step,
 * since the command only opened the filter and the filter step carries the chosen params.
 */
export function appendStep(steps: Step[], step: Step): Step[] {
  if (step.kind === 'filter') {
    for (let i = steps.length - 1; i >= 0; i--) {
      const s = steps[i];
      if (s.kind === 'command' && s.id === `filter:${step.id}`) return [...steps.slice(0, i), step, ...steps.slice(i + 1)];
    }
  }
  return [...steps, step];
}

export const FN_KEYS = Array.from({ length: 12 }, (_, i) => `F${i + 1}`);

/** True when `key` ('F2', 'Shift+F2', 'Mod+Shift+F12') matches the pressed key and modifiers. Alt is never used. */
export function fnKeyMatches(key: string | undefined, e: { key: string; mod: boolean; shift: boolean; alt: boolean }) {
  if (!key || e.alt) return false;
  const parts = key.split('+');
  return parts[parts.length - 1] === e.key && FN_KEYS.includes(e.key) && parts.includes('Mod') === e.mod && parts.includes('Shift') === e.shift;
}

/** Restore actions from storage text; anything malformed yields null so callers fall back to defaults. */
export function parseActions(text: string | null): Action[] | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text);
    if (!Array.isArray(v)) return null;
    return v.filter((a) => a && typeof a.id === 'string' && typeof a.name === 'string' && Array.isArray(a.steps))
      .map((a) => ({ ...a, set: typeof a.set === 'string' ? a.set : 'Default Actions' }));
  } catch { return null; }
}

/** Ordered set names, each with its actions. */
export function groupBySet(actions: Action[]): [string, Action[]][] {
  const m = new Map<string, Action[]>();
  for (const a of actions) m.set(a.set, [...(m.get(a.set) ?? []), a]);
  return [...m];
}

export const DEFAULT_ACTIONS: Action[] = [
  { id: 'def-flatten-sharpen', name: 'Flatten & Sharpen', set: 'Default Actions', steps: [
    { kind: 'command', id: 'flatten' },
    { kind: 'filter', id: 'sharpen', params: { amount: 80, radius: 2, threshold: 0 } },
  ] },
  { id: 'def-gray-contrast', name: 'Grayscale + Auto Contrast', set: 'Default Actions', steps: [
    { kind: 'filter', id: 'grayscale', params: {} },
    { kind: 'filter', id: 'auto-contrast', params: {} },
  ] },
  { id: 'def-dup-blur', name: 'Duplicate & Blur Background', set: 'Default Actions', steps: [
    { kind: 'command', id: 'dupLayer' },
    { kind: 'filter', id: 'gaussian-blur', params: { radius: 6 } },
  ] },
  { id: 'def-web-prep', name: 'Web Export Prep', set: 'Default Actions', steps: [
    { kind: 'command', id: 'flatten' },
    { kind: 'filter', id: 'auto-tone', params: {} },
  ] },
];
