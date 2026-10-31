import { render } from 'preact';
import '@fontsource-variable/inter';
import './styles.css';
import { App } from './ui/App';
import { startMcpBridge } from './mcp/server';
import './core/adjust';
import * as store from './core/store';
import { registerTools } from './tools';
import { restoreLibrary } from './core/library';
import { loadSystemFonts } from './core/fonts';
import { SELECT_TOOLS } from './tools/select2';
import { RETOUCH_TOOLS } from './tools/retouch';
import { WARP_TOOLS, WARP_COMMANDS } from './tools/warp';
import { CONTENT_AWARE_COMMANDS } from './ui/contentAware';
import { SELECT_COMMANDS } from './ui/selectDialogs';
import { COMMANDS } from './ui/commands';
import { PS_COMMANDS } from './ui/psCommands';
import { ACTION_COMMANDS } from './ui/ActionsPanel';
import { installRecorder } from './core/actions';
import { isDemo, openDemoDocument } from './core/demo';

// Feature modules contribute tools and commands before the first render.
registerTools(SELECT_TOOLS);
registerTools(RETOUCH_TOOLS);
registerTools(WARP_TOOLS);
COMMANDS.push(...SELECT_COMMANDS, ...PS_COMMANDS, ...ACTION_COMMANDS, ...WARP_COMMANDS, ...CONTENT_AWARE_COMMANDS);
// Wraps every command so Actions can record it; must run after all command lists are added.
installRecorder(COMMANDS);

async function mount() {
  if (isDemo) {
    // Measure sample text with the bundled font before creating the initial history snapshot.
    // A font failure should still leave a usable editor with fallback fonts.
    await document.fonts.load('750 100px "Inter Variable"').catch(() => {});
    openDemoDocument();
  }
  render(<App />, document.getElementById('app')!);
}
void mount();
startMcpBridge().catch((e) => console.error('MCP bridge failed to start', e));
// Reopen the Assets folder chosen last time (desktop).
restoreLibrary().catch(() => {});
// Desktop: read installed fonts in the background so every font is ready in the pickers.
if ('__TAURI_INTERNALS__' in window) loadSystemFonts();
if (import.meta.env.DEV) (window as any).__lucentedit = { store };
