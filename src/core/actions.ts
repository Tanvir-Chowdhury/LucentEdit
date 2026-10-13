import { signal, effect } from '@preact/signals';
import { cur, commit, tick, toast, dialog, docs, activeIndex, activeLayer, touch, type DialogState } from './store';
import { applyFilter, filterById } from './filters';
import { uid } from './util';
import { COMMANDS, lastFilter, isMac, type Command } from '../ui/commands';
import { appendStep, isRecordable, fnKeyMatches, parseActions, DEFAULT_ACTIONS, type Action, type Step } from './actions-steps';

// Photoshop Actions: record commands and filters into named actions, replay them on one or all documents.
// Pure step logic lives in actions-steps.ts; this module wires it to the store, commands and filters.

export * from './actions-steps';

const KEY = 'lucentedit.actions';

function load(): Action[] {
  try { return parseActions(localStorage.getItem(KEY)) ?? DEFAULT_ACTIONS; } catch { return DEFAULT_ACTIONS; }
}

export const actions = signal<Action[]>(load());
effect(() => {
  const v = actions.value;
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable: actions live for this session only */ }
});

/** Action id being recorded into, or null. */
export const recording = signal<string | null>(null);
/** Action id being played, or null. Recording is suspended while playing. */
export const playing = signal<string | null>(null);
/** Panel selection: an action, optionally one of its steps. */
export const selected = signal<{ action: string; step?: number } | null>(null);

export const selectedAction = () => actions.value.find((a) => a.id === selected.value?.action) ?? null;

// Editing

export function updateAction(id: string, f: (a: Action) => Action) {
  actions.value = actions.value.map((a) => (a.id === id ? f(a) : a));
}

export function newAction(name: string, set: string, key?: string): Action {
  // A function key belongs to one action only, as in Photoshop.
  if (key) actions.value = actions.value.map((a) => (a.key === key ? { ...a, key: undefined } : a));
  const a: Action = { id: uid('act'), name, set: set || 'Default Actions', steps: [], key };
  actions.value = [...actions.value, a];
  selected.value = { action: a.id };
  return a;
}

export function deleteAction(id: string) {
  if (recording.value === id) stopRecording();
  actions.value = actions.value.filter((a) => a.id !== id);
  if (selected.value?.action === id) selected.value = null;
}

export const renameAction = (id: string, name: string) => updateAction(id, (a) => ({ ...a, name }));
export const deleteStep = (id: string, i: number) => updateAction(id, (a) => ({ ...a, steps: a.steps.filter((_, j) => j !== i) }));
export const setStepEnabled = (id: string, i: number, on: boolean) =>
  updateAction(id, (a) => ({ ...a, steps: a.steps.map((s, j) => (j === i ? { ...s, enabled: on } : s)) }));
export const insertStep = (id: string, at: number, step: Step) =>
  updateAction(id, (a) => ({ ...a, steps: [...a.steps.slice(0, at), step, ...a.steps.slice(at)] }));

export function stepLabel(s: Step): string {
  switch (s.kind) {
    case 'command': return COMMANDS.find((c) => c.id === s.id)?.label.replace(/…$/, '') ?? s.id;
    case 'filter': return filterById(s.id)?.name ?? s.id;
    case 'mcp': return `MCP: ${s.tool}`;
    case 'stop': return 'Stop';
  }
}

export function stepDetail(s: Step): string {
  if (s.kind === 'filter') return Object.entries(s.params).map(([k, v]) => `${k}: ${v}`).join(', ');
  if (s.kind === 'mcp') return JSON.stringify(s.args ?? {});
  if (s.kind === 'stop') return s.message;
  return '';
}

// Recording

const originals = new WeakMap<Command, Command['run']>();
/** Snapshots that existed before or were already handled while recording. */
let seen = new WeakSet<object>();
/** Set by recordFilter so the history observer does not record the same filter twice. */
let explicitFilter = false;

function record(step: Step) {
  const id = recording.value;
  if (!id || playing.value) return;
  if (!actions.value.some((a) => a.id === id)) { recording.value = null; return; }
  updateAction(id, (a) => ({ ...a, steps: appendStep(a.steps, step) }));
}

export function startRecording(actionId: string) {
  seen = new WeakSet();
  for (const ds of docs.value) ds.history.forEach((h) => seen.add(h));
  explicitFilter = false;
  recording.value = actionId;
  selected.value = { action: actionId };
}

export function stopRecording() { recording.value = null; }

/** Record a filter with its params (for callers that apply filters outside FilterDialog). */
export function recordFilter(id: string, params: Record<string, any>) {
  if (!recording.value || playing.value) return;
  record({ kind: 'filter', id, params: { ...params } });
  explicitFilter = true;
}

/**
 * Wrap each command's run so recording captures it. Call once, after every command list has been
 * pushed into COMMANDS. Safe to call again: already wrapped commands are skipped.
 */
export function installRecorder(commands: Command[]) {
  for (const c of commands) {
    if (originals.has(c)) continue;
    const orig = c.run;
    originals.set(c, orig);
    c.run = () => {
      if (recording.value && isRecordable(c.id)) record({ kind: 'command', id: c.id });
      return orig();
    };
  }
}

// Filters applied through FilterDialog commit a history step named after the filter and set
// lastFilter; spotting that commit lets us record the filter with the params the user chose.
tick.subscribe(() => {
  if (!recording.value || playing.value) return;
  const ds = cur();
  const top = ds?.history[ds.hIndex];
  if (!top || seen.has(top)) return;
  seen.add(top);
  const f = filterById(top.label);
  if (!f || f.name !== top.label || lastFilter.id !== f.id) return;
  if (explicitFilter) { explicitFilter = false; return; }
  record({ kind: 'filter', id: f.id, params: { ...lastFilter.params } });
});

// Playback

const settle = () => new Promise((r) => setTimeout(r, 16));

/** Resolves once the dialog signal no longer holds `d`. */
function dialogClosed(d: DialogState): Promise<void> {
  return new Promise((res) => {
    const off = dialog.subscribe((v) => { if (v !== d) { queueMicrotask(() => off()); res(); } });
  });
}

/** Show the 'act:stop' dialog; true when the user chose Continue. */
async function confirmStop(message: string, canContinue: boolean): Promise<boolean> {
  let go = false;
  const d = { kind: 'act:stop', data: { message, canContinue, onContinue: () => { go = true; dialog.value = null; } } };
  dialog.value = d;
  await dialogClosed(d);
  return go;
}

/** Run one step. Returns false when the user halted playback at a stop. */
async function runStep(s: Step, isLast: boolean): Promise<boolean> {
  switch (s.kind) {
    case 'command': {
      const c = COMMANDS.find((x) => x.id === s.id);
      if (!c) throw new Error('unknown command');
      if (c.enabled && !c.enabled()) throw new Error('not available now');
      const r: any = (originals.get(c) ?? c.run)();
      if (r && typeof r.then === 'function') await r;
      await settle();
      // Commands that open a dialog (filters with settings, Image Size…) wait for the user, like Photoshop's modal steps.
      if (dialog.value) await dialogClosed(dialog.value);
      return true;
    }
    case 'filter': {
      const ds = cur(), l = activeLayer(ds), f = filterById(s.id);
      if (!ds || !l) throw new Error('no active layer');
      if (!f) throw new Error('unknown filter');
      if (l.locked) throw new Error('layer is locked');
      if (!applyFilter(ds, l, f, s.params ?? {})) throw new Error('layer cannot be filtered');
      Object.assign(lastFilter, { id: f.id, params: { ...s.params } });
      commit(f.name, ds);
      return true;
    }
    case 'mcp': {
      const { callTool } = await import('../mcp/server');
      await callTool(s.tool, s.args);
      return true;
    }
    case 'stop':
      return confirmStop(s.message, !isLast);
  }
}

async function runSteps(a: Action): Promise<boolean> {
  const steps = a.steps.map((s, i) => [s, i] as const).filter(([s]) => s.enabled !== false);
  for (const [k, [s, i]] of steps.entries()) {
    try {
      if (!(await runStep(s, k === steps.length - 1))) return false;
    } catch (e: any) {
      toast(`Action "${a.name}" stopped at step ${i + 1} (${stepLabel(s)}): ${e?.message ?? e}`, 'error');
      return false;
    }
  }
  return true;
}

/** Play an action on the active document. Resolves true when every step ran. */
export async function playAction(a: Action): Promise<boolean> {
  if (playing.value) return false;
  if (recording.value === a.id) stopRecording();
  playing.value = a.id;
  try { return await runSteps(a); } finally { playing.value = null; }
}

/** Batch: play an action on every open document, stopping at the first failure. */
export async function playOnAllDocuments(a: Action): Promise<boolean> {
  if (playing.value) return false;
  if (recording.value === a.id) stopRecording();
  const back = activeIndex.value;
  playing.value = a.id;
  try {
    for (let i = 0; i < docs.value.length; i++) {
      activeIndex.value = i;
      touch();
      if (!(await runSteps(a))) return false;
    }
    toast(`Played "${a.name}" on ${docs.value.length} document${docs.value.length === 1 ? '' : 's'}`, 'success');
    return true;
  } finally {
    activeIndex.value = Math.min(back, docs.value.length - 1);
    touch();
    playing.value = null;
  }
}

/** The action bound to the pressed function key (F1–F12, optional Shift/Mod), or null. */
export function actionForKey(e: KeyboardEvent): Action | null {
  const ev = { key: e.key, mod: isMac ? e.metaKey : e.ctrlKey, shift: e.shiftKey, alt: e.altKey };
  return actions.value.find((a) => fnKeyMatches(a.key, ev)) ?? null;
}
