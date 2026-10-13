import { render } from 'preact';
import '@fontsource-variable/inter';
import './styles.css';
import { App } from './ui/App';
import { startMcpBridge } from './mcp/server';
import './core/adjust';
import * as store from './core/store';
import { registerTools } from './tools';
import { restoreLibrary } from './core/library';
import { SELECT_TOOLS } from './tools/select2';
import { RETOUCH_TOOLS } from './tools/retouch';
import { WARP_TOOLS, WARP_COMMANDS } from './tools/warp';
import { CONTENT_AWARE_COMMANDS } from './ui/contentAware';
import { SELECT_COMMANDS } from './ui/selectDialogs';
import { COMMANDS } from './ui/commands';
import { PS_COMMANDS } from './ui/psCommands';
import { ACTION_COMMANDS } from './ui/ActionsPanel';
import { installRecorder } from './core/actions';

// Feature modules contribute tools and commands before the first render.
registerTools(SELECT_TOOLS);
registerTools(RETOUCH_TOOLS);
registerTools(WARP_TOOLS);
COMMANDS.push(...SELECT_COMMANDS, ...PS_COMMANDS, ...ACTION_COMMANDS, ...WARP_COMMANDS, ...CONTENT_AWARE_COMMANDS);
// Wraps every command so Actions can record it; must run after all command lists are added.
installRecorder(COMMANDS);

render(<App />, document.getElementById('app')!);
startMcpBridge().catch((e) => console.error('MCP bridge failed to start', e));
// Reopen the Assets folder chosen last time (desktop).
restoreLibrary().catch(() => {});
if (import.meta.env.DEV) (window as any).__lucentedit = { store };
