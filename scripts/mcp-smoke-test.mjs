#!/usr/bin/env node
// End-to-end MCP check against a running Lucent app: builds a small design, renders a
// preview and exports PNG/SVG/PSD/.lucent into a temp folder. Usage: npm run test:mcp

import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.env.LUCENT_MCP_URL ?? 'http://127.0.0.1:47800/mcp';
let id = 0;

async function rpc(method, params) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
}

async function tool(name, args = {}) {
  const res = await rpc('tools/call', { name, arguments: args });
  if (res.isError) throw new Error(`${name}: ${res.content[0].text}`);
  const c = res.content[0];
  return c.type === 'text' ? (() => { try { return JSON.parse(c.text); } catch { return c.text; } })() : c;
}

const out = mkdtempSync(join(tmpdir(), 'lucent-smoke-'));
const checks = [];
const check = (name, ok) => { checks.push([name, ok]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };

try {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } });
  check('initialize', init.serverInfo?.name === 'lucent');
  const { tools } = await rpc('tools/list');
  check(`tools/list (${tools.length} tools)`, tools.length >= 25);

  const doc = await tool('new_document', { width: 800, height: 600, name: 'Smoke test' });
  check('new_document', doc.width === 800);
  const ops = await tool('batch', {
    operations: [
      { tool: 'add_shape', args: { shape: 'rect', x: 0, y: 0, width: 800, height: 600, fill: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#7c3aed' }, { offset: 1, color: '#0ea5e9' }] } } },
      { tool: 'add_shape', args: { shape: 'star', x: 340, y: 60, width: 120, height: 120, fill: '#fde047' } },
      { tool: 'add_text', args: { text: 'Smoke test', x: 0, y: 260, width: 800, align: 'center', font_size: 72, font_weight: 800, color: '#fff' } },
      { tool: 'add_path', args: { d: 'M10 80 Q 95 10 180 80 T 350 80', x: 225, y: 420, fill: null, stroke: '#fff', stroke_width: 6 } },
    ],
  });
  check('batch create', Array.isArray(ops) && ops.length === 4);
  const g = await tool('group_layers', { ids: [ops[1].id, ops[2].id], name: 'Hero' });
  check('group_layers', g.type === 'group' && g.children.length === 2);
  await tool('update_layer', { id: ops[1].id, effects: { glow: { enabled: true, color: '#fde047', blur: 30 } } });
  const filtered = await tool('apply_filter', { id: ops[0].id, filter: 'noise', params: { amount: 8 } });
  check('apply_filter rasterizes vector layer', filtered.type === 'raster');
  const prev = await tool('render_preview', { max_size: 256 });
  check('render_preview returns image', prev.type === 'image' && prev.data.length > 1000);
  for (const format of ['png', 'svg', 'psd', 'lucent']) {
    const path = join(out, `smoke.${format}`);
    await tool('export_document', { format, path });
    check(`export ${format}`, statSync(path).size > 100);
  }
  const undone = await tool('undo', { steps: 1 });
  check('undo', undone.canUndo === true);
} catch (e) {
  check(`error: ${e.message}`, false);
}

const failed = checks.filter(([, ok]) => !ok).length;
console.log(`\n${checks.length - failed}/${checks.length} passed · files in ${out}`);
process.exit(failed ? 1 : 0);
