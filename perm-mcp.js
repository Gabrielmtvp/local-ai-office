#!/usr/bin/env node
// Tiny MCP server (stdio) that Claude Code calls when it needs permission to use a tool.
// It forwards the request to the AI Office bridge and waits for you to click Allow or Deny.
// Started by server.js via:  --mcp-config {...} --permission-prompt-tool mcp__office__approve
const http = require('http');

const URL_ = process.env.OFFICE_URL;          // e.g. http://127.0.0.1:4777
const TOKEN = process.env.OFFICE_INTERNAL_TOKEN;
const AGENT = process.env.OFFICE_AGENT_ID;

function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }

function askOffice(payload) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ agentId: AGENT, ...payload });
    const u = new URL('/internal/approval', URL_);
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-Internal-Token': TOKEN, Host: u.host },
      timeout: 15 * 60 * 1000 }, res => {
      let s = ''; res.on('data', c => { s += c; }); res.on('end', () => {
        try { resolve(JSON.parse(s)); } catch { resolve({ behavior: 'deny', message: 'AI Office returned an invalid answer.' }); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ behavior: 'deny', message: 'Nobody answered the approval request in time.' }); });
    req.on('error', e => resolve({ behavior: 'deny', message: 'AI Office is not reachable: ' + e.message }));
    req.end(body);
  });
}

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    return send({ jsonrpc: '2.0', id, result: {
      protocolVersion: (params && params.protocolVersion) || '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'ai-office-approvals', version: '1.0.0' },
    } });
  }
  if (method === 'tools/list') {
    return send({ jsonrpc: '2.0', id, result: { tools: [{
      name: 'approve',
      description: 'Ask the user in AI Office to allow or deny a tool call.',
      inputSchema: { type: 'object', properties: { tool_name: { type: 'string' }, input: { type: 'object' }, tool_use_id: { type: 'string' } }, required: ['tool_name', 'input'] },
    }] } });
  }
  if (method === 'tools/call') {
    const args = (params && params.arguments) || {};
    const input = args.input || args.tool_input || {};
    const decision = await askOffice({ tool: args.tool_name, input, toolUseId: args.tool_use_id });
    const result = decision.behavior === 'allow'
      ? { behavior: 'allow', updatedInput: input }
      : { behavior: 'deny', message: decision.message || 'Denied in AI Office.' };
    return send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } });
  }
  if (id !== undefined && method === 'ping') return send({ jsonrpc: '2.0', id, result: {} });
  if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
}

let buf = '';
process.stdin.on('data', chunk => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    handle(msg);
  }
});
process.stdin.on('end', () => process.exit(0));
