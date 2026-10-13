import { render } from 'preact';
import '@fontsource-variable/inter';
import './styles.css';
import { App } from './ui/App';
import { startMcpBridge } from './mcp/server';
import './core/adjust';
import * as store from './core/store';
import { registerTools } from './tools';
import { SELECT_TOOLS } from './tools/select2';
import { RETOUCH_TOOLS } from './tools/retouch';
import { SELECT_COMMANDS } from './ui/selectDialogs';
import { COMMANDS } from './ui/commands';
import { PS_COMMANDS } from './ui/psCommands';

// Feature modules contribute tools and commands before the first render.
registerTools(SELECT_TOOLS);
registerTools(RETOUCH_TOOLS);
COMMANDS.push(...SELECT_COMMANDS, ...PS_COMMANDS);

render(<App />, document.getElementById('app')!);
startMcpBridge().catch((e) => console.error('MCP bridge failed to start', e));
if (import.meta.env.DEV) (window as any).__lucentedit = { store };
