import { useEffect, useState } from 'preact/hooks';
import { Play, Square, Circle } from 'lucide-preact';
import { cur, dialog, toast } from '../core/store';
import {
  actions, recording, playing, selected, selectedAction, groupBySet, newAction, deleteAction, deleteStep, renameAction,
  setStepEnabled, updateAction, insertStep, startRecording, stopRecording, playAction, playOnAllDocuments, stepLabel,
  stepDetail, FN_KEYS, type Action,
} from '../core/actions';
import { prettyKeys, type Command } from './commands';
import { ui } from './psCommands';
import { Icon } from './icons';

// Actions panel (Window > Actions, Alt+F9) and its dialogs (kinds prefixed 'act:').

const close = () => (dialog.value = null);
const stop = (e: Event) => e.stopPropagation();

function toggleRecord() {
  if (recording.value) return stopRecording();
  const a = selectedAction();
  if (a) startRecording(a.id);
  else dialog.value = { kind: 'act:new' };
}

function play(all = false) {
  const a = selectedAction();
  if (!a) return toast('Select an action to play', 'error');
  if (!cur()) return toast('Open a document first', 'error');
  // Playing from a selected step starts there, as in Photoshop.
  const from = selected.value?.step ?? 0;
  const run = from ? { ...a, steps: a.steps.slice(from) } : a;
  void (all ? playOnAllDocuments(run) : playAction(run));
}

function rename(a: Action) {
  dialog.value = { kind: 'text', data: { title: 'Rename Action', label: 'Name', value: a.name, onOk: (v: string) => renameAction(a.id, v) } };
}

function insertStop() {
  const a = selectedAction();
  if (!a) return toast('Select an action first', 'error');
  const at = (selected.value?.step ?? a.steps.length - 1) + 1;
  dialog.value = { kind: 'text', data: { title: 'Insert Stop', label: 'Message', value: '', onOk: (message: string) => insertStep(a.id, at, { kind: 'stop', message }) } };
}

function del() {
  const s = selected.value, a = selectedAction();
  if (!s || !a) return;
  if (s.step !== undefined) { deleteStep(a.id, s.step); selected.value = { action: a.id }; return; }
  dialog.value = { kind: 'confirm', data: { title: 'Delete Action', message: `Delete the action "${a.name}"?`, okLabel: 'Delete', onOk: () => deleteAction(a.id) } };
}

export function ActionsPanel() {
  const list = actions.value, sel = selected.value, rec = recording.value, busy = !!playing.value;
  const [closedSets, setClosedSets] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const indent = (n: number) => ({ paddingLeft: 8 + n * 16 });
  const btn = (title: string, icon: any, onClick: () => void, disabled = false, color?: string) => (
    <button class="icon-btn" title={title} disabled={disabled} onClick={onClick} style={color ? { color } : undefined}><Icon name={icon} size={15} /></button>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div class="layers" style={{ flex: 1, overflow: 'auto' }}>
        {!list.length && <div class="empty">No actions. Click + to record one.</div>}
        {groupBySet(list).map(([set, acts]) => (
          <>
            <div class="history-item" onClick={() => setClosedSets({ ...closedSets, [set]: !closedSets[set] })}>
              <Icon name={closedSets[set] ? 'right' : 'down'} size={13} /><Icon name="folder" size={14} /><span>{set}</span>
            </div>
            {!closedSets[set] && acts.map((a) => {
              const allOn = a.steps.every((s) => s.enabled !== false);
              return (
                <>
                  <div class={`history-item${sel?.action === a.id && sel.step === undefined ? ' on' : ''}`} style={indent(1)}
                    onClick={() => (selected.value = { action: a.id })} onDblClick={() => rename(a)} title="Double-click to rename">
                    <input type="checkbox" title="Toggle all steps" checked={allOn} onClick={stop}
                      onChange={(e) => { const on = (e.target as HTMLInputElement).checked; updateAction(a.id, (x) => ({ ...x, steps: x.steps.map((s) => ({ ...s, enabled: on })) })); }} />
                    <span onClick={(e) => { stop(e); setOpen({ ...open, [a.id]: !open[a.id] }); }} style={{ display: 'flex' }}><Icon name={open[a.id] ? 'down' : 'right'} size={13} /></span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    {rec === a.id && <span title="Recording" style={{ width: 8, height: 8, borderRadius: 4, background: '#ef4444' }} />}
                    {a.key && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{prettyKeys(a.key)}</span>}
                  </div>
                  {open[a.id] && a.steps.map((s, i) => (
                    <div class={`history-item${sel?.action === a.id && sel.step === i ? ' on' : ''}`} style={{ ...indent(2), opacity: s.enabled === false ? 0.5 : 1 }}
                      onClick={() => (selected.value = { action: a.id, step: i })}>
                      <input type="checkbox" title="Include this step" checked={s.enabled !== false} onClick={stop}
                        onChange={(e) => setStepEnabled(a.id, i, (e.target as HTMLInputElement).checked)} />
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stepDetail(s)}>
                        {stepLabel(s)}{stepDetail(s) && <span style={{ color: 'var(--muted)' }}> · {stepDetail(s)}</span>}
                      </span>
                    </div>
                  ))}
                  {open[a.id] && !a.steps.length && <div class="history-item future" style={indent(2)}>No steps{rec === a.id ? ' yet: recording…' : ''}</div>}
                </>
              );
            })}
          </>
        ))}
      </div>
      <div class="row" style={{ gap: 2, padding: 4, borderTop: '1px solid var(--line)', justifyContent: 'flex-end' }}>
        {btn('Stop recording', Square, () => stopRecording(), !rec)}
        {btn(rec ? 'Stop recording' : 'Begin recording', Circle, toggleRecord, busy, rec ? '#ef4444' : undefined)}
        {btn('Play selection', Play, () => play(false), busy || !sel)}
        {btn('Play on all open documents', 'layers', () => play(true), busy || !sel)}
        {btn('Insert Stop', 'hand', insertStop, busy || !sel)}
        {btn('Create new action', 'plus', () => (dialog.value = { kind: 'act:new' }), busy)}
        {btn('Delete', 'trash', del, busy || !sel)}
      </div>
    </div>
  );
}

function ActDialog({ title, children, foot }: { title: string; children: any; foot: any }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, []);
  return (
    <div class="backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class="dialog" onKeyDown={stop}>
        <div class="dialog-head"><div>{title}</div><button class="icon-btn" onClick={close}><Icon name="x" /></button></div>
        <div class="dialog-body">{children}</div>
        <div class="dialog-foot">{foot}</div>
      </div>
    </div>
  );
}

function NewActionDialog() {
  const sets = [...new Set(actions.value.map((a) => a.set))];
  const [name, setName] = useState(`Action ${actions.value.length + 1}`);
  const [set, setSet] = useState(sets[0] ?? 'Default Actions');
  const [fn, setFn] = useState('');
  const [shift, setShift] = useState(false);
  const [mod, setMod] = useState(false);
  const ok = () => {
    if (!name.trim()) return;
    const key = fn ? [mod && 'Mod', shift && 'Shift', fn].filter(Boolean).join('+') : undefined;
    close();
    startRecording(newAction(name.trim(), set.trim(), key).id);
  };
  const val = (f: (v: string) => void) => (e: Event) => f((e.target as HTMLInputElement).value);
  return (
    <ActDialog title="New Action" foot={<><button class="btn ghost" onClick={close}>Cancel</button><button class="btn primary" onClick={ok}>Record</button></>}>
      <div class="kv" onKeyDown={(e) => e.key === 'Enter' && ok()}>
        <label>Name</label><input class="text-in" value={name} onInput={val(setName)} ref={(el) => { if (el) setTimeout(() => el.select()); }} />
        <label>Set</label>
        <input class="text-in" list="act-sets" value={set} onInput={val(setSet)} />
        <datalist id="act-sets">{sets.map((s) => <option value={s} />)}</datalist>
        <label>Function Key</label>
        <div class="row" style={{ gap: 8 }}>
          <select value={fn} onChange={val(setFn)}><option value="">None</option>{FN_KEYS.map((k) => <option value={k}>{k}</option>)}</select>
          <label><input type="checkbox" checked={shift} disabled={!fn} onChange={(e) => setShift((e.target as HTMLInputElement).checked)} /> Shift</label>
          <label><input type="checkbox" checked={mod} disabled={!fn} onChange={(e) => setMod((e.target as HTMLInputElement).checked)} /> {prettyKeys('Mod')}</label>
        </div>
      </div>
    </ActDialog>
  );
}

function StopDialog({ d }: { d: { message: string; canContinue: boolean; onContinue: () => void } }) {
  return (
    <ActDialog title="Action Paused" foot={<>
      <button class="btn ghost" onClick={close}>Stop</button>
      {d.canContinue && <button class="btn primary" onClick={d.onContinue}>Continue</button>}
    </>}>
      <p style={{ margin: 0, color: 'var(--text-2)' }}>{d.message || 'Playback stopped.'}</p>
    </ActDialog>
  );
}

/** Mount once next to <Dialogs/>; renders the 'act:*' dialogs. */
export function ActionDialogs() {
  const d = dialog.value;
  if (!d || !d.kind.startsWith('act:')) return null;
  if (d.kind === 'act:new') return <NewActionDialog />;
  if (d.kind === 'act:stop') return <StopDialog d={d.data} />;
  return null;
}

export const ACTION_COMMANDS: Command[] = [
  { id: 'actionsPanel', label: 'Actions', keys: 'Alt+F9', run: () => (ui.value = { ...ui.value, panels: true, bottomTab: 'actions' }) },
  { id: 'playAction', label: 'Play Selected Action', run: () => play(false), enabled: () => !!selectedAction() && !!cur() && !playing.value },
  { id: 'toggleRecord', label: 'Start/Stop Recording', run: toggleRecord, enabled: () => !playing.value },
];
