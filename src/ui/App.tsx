import { useEffect } from 'preact/hooks';
import { docs, tool, toasts, brush, dialog, cur, activeLayer, tick } from '../core/store';
import { useTick, usePaint } from '../core/store';
import { toolById, toolShortcut } from '../tools';
import { textEditing } from '../tools/types';
import { beginTextEdit } from '../tools/vector';
import { MenuBar, OptionsBar, Toolbar, Tabs, StatusBar, Tooltip } from './chrome';
import { Panels } from './panels';
import { Viewport, spaceDown } from './Viewport';
import { Dialogs, PresetCard, PRESETS, askConfirm } from './dialogs';
import { ColorPickerPopover } from './controls';
import { matchShortcut, nudge, paste, placeFiles, openFiles, newDocument, run } from './commands';
import { fileToOpened } from '../core/io';
import { Icon } from './icons';

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
  // Ctrl+V is handled by the paste event so system-clipboard images work.
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') return;
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
        <div class="hero">
          <img src="/logo.svg" alt="" />
          <div>
            <h1>Welcome to <span>Lucent</span></h1>
            <p>Photo editing and vector design in one fast, free app, ready for AI agents.</p>
          </div>
        </div>
        <div class="welcome-actions">
          <button class="btn primary" onClick={() => (dialog.value = { kind: 'new' })}><Icon name="plus" /> New document</button>
          <button class="btn" onClick={() => openFiles()}><Icon name="folderOpen" /> Open…</button>
          <button class="btn ghost" onClick={() => run('mcp')}><Icon name="plug" /> Connect an AI agent</button>
        </div>
        <h3>Start from a preset</h3>
        <div class="presets">
          {PRESETS.slice(0, 10).map((p) => <PresetCard p={p} onClick={() => newDocument(p.w, p.h, p.name)} />)}
        </div>
        <div class="tips">
          <div class="tip-card"><b><Icon name="keyboard" size={15} /> Photoshop shortcuts</b>V, M, L, B, T, P, U, Ctrl+T, Ctrl+J and the rest work the way you expect. Press <kbd>Ctrl</kbd>+<kbd>/</kbd> for the full list.</div>
          <div class="tip-card"><b><Icon name="file" size={15} /> Opens PSD & SVG</b>Bring your Photoshop layers and Illustrator SVGs. Export back to PSD, SVG, PNG, JPG and WebP.</div>
          <div class="tip-card"><b><Icon name="sparkles" size={15} /> Design with AI</b>Claude Code, Cursor, Codex and other agents can build and edit designs here through MCP.</div>
        </div>
      </div>
    </div>
  );
}

function Toasts() {
  return (
    <div class="toasts">
      {toasts.value.map((t) => (
        <div class={`toast ${t.kind}`} key={t.id}>
          <Icon name={t.kind === 'error' ? 'info' : t.kind === 'success' ? 'check' : 'sparkles'} size={14} /> {t.text}
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
          askConfirm('Quit Lucent?', `${dirty.length} document${dirty.length > 1 ? 's have' : ' has'} unsaved changes that will be lost.`, 'Quit without saving', () => w.destroy());
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
    <div class="app">
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
      <ColorPickerPopover />
      <Tooltip />
      <Toasts />
    </div>
  );
}
