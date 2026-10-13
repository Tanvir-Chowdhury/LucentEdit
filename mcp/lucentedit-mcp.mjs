#!/usr/bin/env node
// LucentEdit MCP stdio bridge: forwards newline-delimited JSON-RPC from stdin to the running
// LucentEdit desktop app (Streamable HTTP at http://127.0.0.1:47800/mcp) and prints replies.
// Zero dependencies. Set LUCENTEDIT_MCP_URL to override the endpoint.

import { createInterface } from 'node:readline';

const FIXED = process.env.LUCENTEDIT_MCP_URL;
let url = FIXED || null;

async function findApp() {
  if (FIXED) return FIXED;
  for (let port = 47800; port <= 47810; port++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(400) });
      const j = await r.json();
      if (j?.name === 'lucentedit') return `http://127.0.0.1:${port}/mcp`;
    } catch { /* try next port */ }
  }
  return null;
}

const out = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');
const NOT_RUNNING = 'LucentEdit is not running. Open the LucentEdit app, then try again (it serves MCP on http://127.0.0.1:47800/mcp).';

async function forward(line) {
  let msg;
  try { msg = JSON.parse(line); } catch { return out({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  const ids = (Array.isArray(msg) ? msg : [msg]).filter((m) => m && m.id !== undefined && m.id !== null);
  for (let attempt = 0; attempt < 2; attempt++) {
    url ??= await findApp();
    if (!url) break;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
        body: line,
      });
      if (r.status === 202) return;
      const text = await r.text();
      if (text.trim()) process.stdout.write(text.trim() + '\n');
      return;
    } catch {
      url = FIXED || null; // app restarted on another port? rediscover once
    }
  }
  // App unreachable: still complete the handshake so the client registers the server.
  for (const m of ids) {
    if (m.method === 'initialize') {
      out({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: m.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'lucentedit', version: '0.3.0' }, instructions: NOT_RUNNING } });
    } else if (m.method === 'tools/list') {
      out({ jsonrpc: '2.0', id: m.id, result: { tools: [{ name: 'get_guide', description: NOT_RUNNING, inputSchema: { type: 'object', properties: {} } }] } });
    } else if (m.method === 'ping') {
      out({ jsonrpc: '2.0', id: m.id, result: {} });
    } else if (m.method === 'tools/call') {
      out({ jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: NOT_RUNNING }], isError: true } });
    } else {
      out({ jsonrpc: '2.0', id: m.id, error: { code: -32000, message: NOT_RUNNING } });
    }
  }
}

// Process messages in order so replies match request order.
let chain = Promise.resolve();
createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  chain = chain.then(() => forward(line)).catch((e) => process.stderr.write(`lucentedit-mcp: ${e?.message ?? e}\n`));
});
