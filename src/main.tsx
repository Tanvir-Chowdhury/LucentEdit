import { render } from 'preact';
import '@fontsource-variable/inter';
import './styles.css';
import { App } from './ui/App';
import { startMcpBridge } from './mcp/server';
import * as store from './core/store';

render(<App />, document.getElementById('app')!);
startMcpBridge().catch((e) => console.error('MCP bridge failed to start', e));
if (import.meta.env.DEV) (window as any).__lucent = { store };
