import { useEffect } from 'preact/hooks';
import { docs, tool, toasts, brush, dialog, cur, activeLayer, tick } from '../core/store';
import { useTick, usePaint } from '../core/store';
import { toolById, toolShortcut } from '../tools';
import { textEditing } from '../tools/types';
import { beginTextEdit } from '../tools/vector';
import { MenuBar, OptionsBar, Toolbar, Tabs, StatusBar, Tooltip, ToolFlyout } from './chrome';
import { SelectDialogs } from './selectDialogs';
import { PsDialogs, numberKey, ui } from './psCommands';
import { ActionDialogs } from './ActionsPanel';
import { LiquifyDialog } from './LiquifyDialog';
import { ContentAwareDialogs } from './contentAware';
import { actionForKey, playAction } from '../core/actions';
import { Panels } from './panels';
import { Viewport, spaceDown } from './Viewport';
import { Dialogs, PresetCard, PRESETS, askConfirm } from './dialogs';
import { ColorPickerPopover } from './controls';
import { matchShortcut, nudge, paste, placeFiles, openFiles, newDocument, run } from './commands';
import { fileToOpened } from '../core/io';
import { Icon } from './icons';
import { isDemo, downloadUrl, openDemoDocument } from '../core/demo';

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button'].includes((el as HTMLInputElement).type);
};

function onKeyDown(e: KeyboardEvent) {
  if (isTyping(e.target) || dialog.value || textEditing.value) return;
  if (e.code === 'Space') {
    if (!spaceDown.value) { spaceDown.value = true; }
    e.preventDefault();
    return;
  }
  const t = toolById(tool.value).tool;
  if (t.key?.(e)) { e.preventDefault(); return; }
  if (e.key === 'Escape' && ui.value.screen) { ui.value = { ...ui.value, screen: 0 }; return; }
  // Ctrl+V is handled by the paste event so system-clipboard images work.
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') return;
  const act = actionForKey(e);
  if (act) { e.preventDefault(); void playAction(act); return; }
  const c = matchShortcut(e);
  if (c) {
    e.preventDefault();
    if (!c.enabled || c.enabled()) c.run();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '[' || e.key === ']') {
    const b = brush.value;
    const step = b.size < 10 ? 1 : b.size < 50 ? 5 : b.size < 200 ? 10 : 25;
    brush.value = { ...b, size: Math.max(1, Math.min(1000, b.size + (e.key === ']' ? step : -step))) };
    return;
  }
  if (/^Digit[0-9]$/.test(e.code)) { numberKey(+e.code.slice(5), e.shiftKey); return; }
  if (e.key === '{' || e.key === '}') {
    const b = brush.value;
    brush.value = { ...b, hardness: Math.max(0, Math.min(1, b.hardness + (e.key === '}' ? 0.25 : -0.25))) };
    return;
  }
  if (e.key.startsWith('Arrow') && cur()?.selected.length) {
    e.preventDefault();
    const d = e.shiftKey ? 10 : 1;
    nudge(e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0);
    return;
  }
  if (e.key === 'Enter') {
    const l = activeLayer();
    if (l?.type === 'text' && !l.locked) { e.preventDefault(); beginTextEdit(l); }
    return;
  }
  if (/^[a-zA-Z]$/.test(e.key) && toolShortcut(e.key, e.shiftKey)) e.preventDefault();
}

function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') spaceDown.value = false;
}

async function onPaste(e: ClipboardEvent) {
  if (isTyping(e.target) || dialog.value || textEditing.value) return;
  const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
  e.preventDefault();
  if (files.length) {
    const opened = await Promise.all(files.map(fileToOpened));
    if (cur()) placeFiles(opened); else openFiles(opened);
    return;
  }
  const text = e.clipboardData?.getData('text/plain') ?? '';
  if (/^\s*<svg[\s\S]*<\/svg>\s*$/i.test(text)) {
    const f = { name: 'pasted.svg', bytes: new TextEncoder().encode(text) };
    if (cur()) placeFiles([f]); else openFiles([f]);
    return;
  }
  paste();
}

function Welcome() {
  return (
    <div class="welcome">
      <div class="welcome-inner">
        <header class="hero">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
          <div>
            <h1>LucentEdit</h1>
            <p>Photo editing and vector design. Free, offline, and ready for AI agents.</p>
          </div>
        </header>
        <div class="welcome-actions">
          <button class="btn primary" onClick={() => (dialog.value = { kind: 'new' })}><Icon name="plus" size={14} /> New document</button>
          <button class="btn" onClick={() => openFiles()}><Icon name="folderOpen" size={14} /> Open…</button>
          <span class="spacer" />
          <button class="btn ghost" onClick={() => run('mcp')}><Icon name="plug" size={14} /> Connect an AI agent</button>
        </div>
        <h3>New from preset</h3>
        <div class="presets">
          {PRESETS.slice(0, 10).map((p) => <PresetCard p={p} onClick={() => newDocument(p.w, p.h, p.name)} />)}
        </div>
        <ul class="hints">
          <li><Icon name="keyboard" size={14} /><span>Photoshop shortcuts work as you expect. <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>K</kbd> lists them all.</span></li>
          <li><Icon name="file" size={14} /><span>Opens PSD and SVG with layers. Exports PSD, SVG, PNG, JPG and WebP.</span></li>
          <li><Icon name="plug" size={14} /><span>Claude Code, Cursor, Codex and other agents can design here through MCP.</span></li>
        </ul>
      </div>
    </div>
  );
}

function Toasts() {
  return (
    <div class="toasts">
      {toasts.value.map((t) => (
        <div class={`toast ${t.kind}`} key={t.id}>
          <Icon name={t.kind === 'error' ? 'info' : t.kind === 'success' ? 'check' : 'info'} size={14} /> {t.text}
        </div>
      ))}
    </div>
  );
}

export function App() {
  useTick();
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('paste', onPaste);
    const blur = () => (spaceDown.value = false);
    window.addEventListener('blur', blur);
    const unload = (e: BeforeUnloadEvent) => { if (docs.value.some((d) => d.dirty) && !('__TAURI_INTERNALS__' in window)) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', unload);
    // Stop the browser from opening dropped files outside the canvas.
    const stop = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', stop);
    window.addEventListener('drop', stop);
    // Desktop: confirm before closing the window with unsaved documents.
    let unlistenClose: (() => void) | undefined;
    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
        const w = getCurrentWindow();
        unlistenClose = await w.onCloseRequested((e) => {
          const dirty = docs.value.filter((d) => d.dirty);
          if (!dirty.length) return;
          e.preventDefault();
          askConfirm('Quit LucentEdit?', `${dirty.length} document${dirty.length > 1 ? 's have' : ' has'} unsaved changes that will be lost.`, 'Quit without saving', () => w.destroy());
        });
      });
    }
    return () => {
      unlistenClose?.();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('blur', blur);
      window.removeEventListener('beforeunload', unload);
      window.removeEventListener('dragover', stop);
      window.removeEventListener('drop', stop);
    };
  }, []);

  const hasDocs = docs.value.length > 0;
  return (
    <div class={`app${isDemo ? ' demo' : ''}${ui.value.panels ? '' : ' no-panels'}${ui.value.screen ? ` screen-${ui.value.screen}` : ''}`}>
      {isDemo && <aside class="demo-banner" aria-label="Online demo">
        <span><b>Online demo</b> · Try editing the sample or open your own files. Edits stay in this browser tab; save to download a copy. MCP and local asset folders require the desktop app.</span>
        <button class="btn" onClick={() => { openDemoDocument(); }}>Open fresh sample</button>
        <a class="btn primary" href={downloadUrl} target="_blank" rel="noopener noreferrer">Download desktop app</a>
      </aside>}
      <MenuBar />
      <OptionsBar />
      <Toolbar />
      <div class="center">
        {hasDocs && <Tabs />}
        {hasDocs ? <Viewport /> : <Welcome />}
      </div>
      <Panels />
      <StatusBar />
      <Dialogs />
      <PsDialogs />
      <ActionDialogs />
      <LiquifyDialog />
      <ContentAwareDialogs />
      <SelectDialogs />
      <ToolFlyout />
      <ColorPickerPopover />
      <Tooltip />
      <Toasts />
    </div>
  );
}
