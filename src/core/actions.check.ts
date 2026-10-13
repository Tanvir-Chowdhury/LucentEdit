// Self-check for the pure Actions step logic. Not bundled (nothing imports it).
// Run: node src/core/actions.check.ts
// @ts-ignore: Node needs the .ts extension; the app's tsconfig does not allow it.
import { appendStep, isRecordable, fnKeyMatches, parseActions, groupBySet, DEFAULT_ACTIONS, type Step } from './actions-steps.ts';

// Tiny assert helpers (no node:assert, so tsc needs no Node types).
const assert = {
  ok(v: unknown, msg = 'assertion failed') { if (!v) throw new Error(msg); },
  equal(a: unknown, b: unknown) { if (a !== b) throw new Error(`${String(a)} !== ${String(b)}`); },
  deepEqual(a: unknown, b: unknown) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${x} !== ${y}`); },
};

// Recordable commands: document edits yes, view/file/window/help no.
for (const id of ['flatten', 'dupLayer', 'filter:invert', 'selectAll', 'rotCW']) assert.ok(isRecordable(id), id);
for (const id of ['palette', 'zoomIn', 'fit', 'actual', 'save', 'saveAs', 'exportPng', 'close', 'new', 'open', 'winLayers', 'about', 'mcp', 'undo', 'toggleRecord'])
  assert.ok(!isRecordable(id), id);

// Dedupe: a filter step replaces the matching filter:<id> command step, keeping order.
let steps: Step[] = [];
steps = appendStep(steps, { kind: 'command', id: 'dupLayer' });
steps = appendStep(steps, { kind: 'command', id: 'filter:gaussian-blur' });
steps = appendStep(steps, { kind: 'filter', id: 'gaussian-blur', params: { radius: 4 } });
assert.deepEqual(steps, [{ kind: 'command', id: 'dupLayer' }, { kind: 'filter', id: 'gaussian-blur', params: { radius: 4 } }]);
// No matching command: plain append. Unrelated command steps are kept.
steps = appendStep(steps, { kind: 'command', id: 'filter:invert' });
steps = appendStep(steps, { kind: 'filter', id: 'grayscale', params: {} });
assert.equal(steps.length, 4);
assert.equal(steps[2].kind, 'command');
// A later matching filter replaces the pending command step even with steps in between.
steps = appendStep(steps, { kind: 'filter', id: 'invert', params: {} });
assert.deepEqual(steps.map((s) => s.kind), ['command', 'filter', 'filter', 'filter']);
assert.equal((steps[2] as any).id, 'invert');

// Function keys.
const ev = (key: string, mod = false, shift = false, alt = false) => ({ key, mod, shift, alt });
assert.ok(fnKeyMatches('F2', ev('F2')));
assert.ok(!fnKeyMatches('F2', ev('F2', false, true)));
assert.ok(fnKeyMatches('Shift+F2', ev('F2', false, true)));
assert.ok(fnKeyMatches('Mod+Shift+F12', ev('F12', true, true)));
assert.ok(!fnKeyMatches('F2', ev('F2', false, false, true)));
assert.ok(!fnKeyMatches('F1', ev('F2')));
assert.ok(!fnKeyMatches(undefined, ev('F2')));
assert.ok(!fnKeyMatches('A', ev('A')));

// Storage round trip and malformed input.
assert.deepEqual(parseActions(JSON.stringify(DEFAULT_ACTIONS)), DEFAULT_ACTIONS);
assert.equal(parseActions(null), null);
assert.equal(parseActions('{oops'), null);
assert.equal(parseActions('{"a":1}'), null);
assert.deepEqual(parseActions('[{"id":"x","name":"X","steps":[]},{"bad":true}]'), [{ id: 'x', name: 'X', steps: [], set: 'Default Actions' }]);

// Grouping keeps first-seen set order.
const g = groupBySet([{ id: '1', name: 'a', set: 'B', steps: [] }, { id: '2', name: 'b', set: 'A', steps: [] }, { id: '3', name: 'c', set: 'B', steps: [] }]);
assert.deepEqual(g.map(([s, a]) => [s, a.length]), [['B', 2], ['A', 1]]);

console.log('actions.check: ok');

