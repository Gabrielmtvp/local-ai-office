#!/usr/bin/env node
// Local AI Office — bridge between the pixel office (browser) and real Claude Code sessions.
// Zero dependencies. Listens on 127.0.0.1 only.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, execFile, execFileSync } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number(process.env.OFFICE_PORT || 4777);
const WORKSPACES = path.resolve(process.env.OFFICE_WORKSPACES || path.join(os.homedir(), 'AI-Office', 'workspaces'));
// Find the Claude Code executable. Terminal shells often add it through ~/.zshrc (PATH or alias),
// which a program started from Finder or Node does not see, so we look in the usual places too.
function isExec(p) { try { fs.accessSync(p, fs.constants.X_OK); return fs.statSync(p).isFile(); } catch { return false; } }
function findClaude() {
  const tried = [];
  const ok = p => { tried.push(p); return p && isExec(p); };
  if (process.env.CLAUDE_BIN) { if (ok(process.env.CLAUDE_BIN)) return { bin: process.env.CLAUDE_BIN, tried }; }
  for (const dir of (process.env.PATH || '').split(path.delimiter)) if (dir && ok(path.join(dir, 'claude'))) return { bin: path.join(dir, 'claude'), tried };
  const home = os.homedir();
  const candidates = [
    path.join(home, '.local', 'bin', 'claude'), path.join(home, '.claude', 'local', 'claude'),
    '/opt/homebrew/bin/claude', '/usr/local/bin/claude', path.join(home, '.npm-global', 'bin', 'claude'),
    path.join(home, '.bun', 'bin', 'claude'), path.join(home, '.volta', 'bin', 'claude'),
  ];
  try { for (const v of fs.readdirSync(path.join(home, '.nvm', 'versions', 'node'))) candidates.push(path.join(home, '.nvm', 'versions', 'node', v, 'bin', 'claude')); } catch { /* no nvm */ }
  for (const c of candidates) if (ok(c)) return { bin: c, tried };
  // Last resort: ask your login shell, which loads ~/.zshrc (handles aliases too).
  try {
    const sh = process.env.SHELL || '/bin/zsh';
    const out = execFileSync(sh, ['-ilc', 'alias claude 2>/dev/null; command -v claude 2>/dev/null; true'], { encoding: 'utf8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'] });
    for (const raw of out.split('\n')) {
      const line = raw.trim();
      const m = line.match(/^(?:alias )?claude=['"]?(~?\/[^'"\s]+)/) || line.match(/^(\/\S+)$/);
      const p = m && m[1].replace(/^~/, home);
      if (p && ok(p)) return { bin: p, tried };
    }
  } catch { /* shell lookup failed */ }
  return { bin: null, tried };
}
let CLAUDE = findClaude();
const CLAUDE_BIN_LABEL = () => CLAUDE.bin || 'claude';
const STATE_FILE = path.join(__dirname, 'agents.json');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const HOME = fs.realpathSync(os.homedir());
const PUBLIC = path.join(__dirname, 'public');
const TOKEN = crypto.randomBytes(24).toString('hex'); // new on every start
const INTERNAL_TOKEN = crypto.randomBytes(24).toString('hex'); // only for the approval helper (perm-mcp.js)
const SECRETS_FILE = path.join(__dirname, 'secrets.json'); // local GitLab tokens, never sent to the browser
const MODES = ['plan', 'acceptEdits']; // never bypassPermissions
const MAX_AGENTS = 40;       // whole building
const DESKS_PER_ROOM = 8;    // each project room has 8 desks
const MAX_PROJECT_ROOMS = 7;  // + kitchen and game room = 9 rooms (3x3 building)
const ROOM_THEMES = ['night', 'day', 'lab', 'slate'];

const ROLES = {
  architect: { label: 'Architect', prompt: 'You are the Architect on a small AI software team. Focus on system design, structure, interfaces and clear written plans. Explain trade-offs briefly.' },
  developer: { label: 'Developer', prompt: 'You are the Developer on a small AI software team. Implement features with clean, working code that follows the conventions already in the project.' },
  tester: { label: 'Tester', prompt: 'You are the Tester on a small AI software team. Write and improve tests, look for edge cases and report failures clearly.' },
  researcher: { label: 'Researcher', prompt: 'You are the Researcher on a small AI software team. Read code and documentation, investigate questions and summarise findings with references to files.' },
  custom: { label: 'Agent', prompt: '' },
};
const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor', '.next', 'dist', 'build', '.venv', '__pycache__', '.cache', '.idea']);

fs.mkdirSync(WORKSPACES, { recursive: true });

// ---------- projects ----------
// A project is a folder agents work in: either a new folder under WORKSPACES, or an existing
// folder anywhere in your home directory (e.g. ~/projects/my-app).
let projects = {};
try { projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8')); } catch { /* first run */ }
function saveProjects() { fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2)); }
const BLOCKED_TOP = new Set(['Library', 'Applications', 'Pictures', 'Music', 'Movies', 'Public']);
function validateProjectPath(input) {
  let p = String(input || '').trim();
  if (!p) throw new Error('Choose a folder.');
  if (p === '~' || p.startsWith('~/')) p = path.join(HOME, p.slice(1));
  if (!path.isAbsolute(p)) throw new Error('Use a full path, like ~/projects/my-app.');
  let real;
  try { real = fs.realpathSync(p); } catch { throw new Error('That folder does not exist.'); }
  if (!fs.statSync(real).isDirectory()) throw new Error('That is not a folder.');
  if (real === HOME || !real.startsWith(HOME + path.sep)) throw new Error('Pick a folder inside your home directory (not the home folder itself).');
  const parts = path.relative(HOME, real).split(path.sep);
  if (parts.some(x => x.startsWith('.')) || BLOCKED_TOP.has(parts[0])) throw new Error('Hidden and system folders cannot be used as projects.');
  return real;
}
function projectIdFor(p) { return crypto.createHash('sha1').update(p).digest('hex').slice(0, 12); }
function addProject(dir, name, kind) {
  const id = projectIdFor(dir);
  if (!projects[id]) {
    if (Object.keys(projects).length >= MAX_PROJECT_ROOMS) throw new Error(`The building has room for ${MAX_PROJECT_ROOMS} projects. Remove one first.`);
    projects[id] = { id, name: (name || path.basename(dir)).slice(0, 40), path: dir, kind, added: Date.now(), theme: ROOM_THEMES[Object.keys(projects).length % ROOM_THEMES.length] };
    saveProjects();
  }
  return projects[id];
}
function ensureWorkspaceProject(folder) {
  const dir = path.join(WORKSPACES, folder);
  fs.mkdirSync(dir, { recursive: true });
  return addProject(fs.realpathSync(dir), folder, 'workspace');
}
function projectDir(a) {
  const p = projects[a.project];
  if (!p) throw new Error('This agent has no project. Pick one in the Context tab.');
  if (!fs.existsSync(p.path)) throw new Error(`Project folder is missing: ${p.path}`);
  return p.path;
}

function freeDesk(projectId, exceptId) {
  const used = new Set(Object.values(agents).filter(a => a.project === projectId && a.id !== exceptId).map(a => a.desk));
  for (let d = 0; d < DESKS_PER_ROOM; d++) if (!used.has(d)) return d;
  return -1;
}

// ---------- state ----------
let agents = {};
try { agents = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { /* first run */ }
for (const a of Object.values(agents)) {
  a.status = 'idle'; a.log = (a.log || []).slice(-300); a.role = a.role || 'custom'; a.allowed = a.allowed || [];
  if (!a.project && a.folder) { try { a.project = ensureWorkspaceProject(a.folder).id; } catch { /* ignore */ } }
  delete a.folder;
}
if (!Object.keys(projects).length) ensureWorkspaceProject('ai-office-app');
{ // give older projects a room theme, and make sure desks are unique inside each room
  let i = 0; for (const p of Object.values(projects)) { if (!p.theme) p.theme = ROOM_THEMES[i % ROOM_THEMES.length]; i++; }
  saveProjects();
  const seen = new Set();
  for (const a of Object.values(agents)) {
    const key = a.project + ':' + a.desk;
    if (a.desk === undefined || a.desk < 0 || a.desk >= DESKS_PER_ROOM || seen.has(key)) a.desk = freeDesk(a.project, a.id);
    seen.add(a.project + ':' + a.desk);
  }
}
const procs = {}; // id -> child process
const clients = new Set();

function save() {
  const out = {};
  for (const [id, a] of Object.entries(agents)) out[id] = { ...a, log: a.log.slice(-300) };
  fs.writeFileSync(STATE_FILE, JSON.stringify(out, null, 2));
}
function lastActivity(a) {
  for (let i = a.log.length - 1; i >= 0; i--) {
    const e = a.log[i];
    if (e.kind === 'tool' || e.kind === 'assistant' || e.kind === 'error') return { text: e.text.split('\n')[0].slice(0, 80), t: e.t };
  }
  const e = a.log[a.log.length - 1];
  return e ? { text: '', t: e.t } : { text: '', t: 0 };
}
function publicAgent(a) {
  const act = lastActivity(a);
  const p = projects[a.project] || { name: '(no project)', path: '' };
  return { id: a.id, name: a.name, role: a.role, project: a.project, folder: p.name, projectPath: p.path, mode: a.mode, status: a.status, desk: a.desk,
    sessionId: a.sessionId, cost: a.cost || 0, allowed: a.allowed, activity: act.text, lastAt: act.t,
    asking: pendingFor(a.id), pipeline: a.pipelineStep || null };
}
function broadcast(evt) {
  const data = `data: ${JSON.stringify(evt)}\n\n`;
  for (const res of clients) res.write(data);
}
function setStatus(a, status) { a.status = status; broadcast({ type: 'status', id: a.id, status, cost: a.cost || 0 }); }
function addLog(a, entry) {
  entry.t = Date.now();
  a.log.push(entry);
  if (a.log.length > 600) a.log.splice(0, a.log.length - 600);
  broadcast({ type: 'log', id: a.id, entry });
}

// ---------- helpers ----------
function safeFolder(name) {
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(name) || name.startsWith('.')) return null;
  const full = path.resolve(WORKSPACES, name);
  if (!full.startsWith(WORKSPACES + path.sep)) return null;
  return full;
}
function gitBranch(dir) {
  try {
    const head = fs.readFileSync(path.join(dir, '.git', 'HEAD'), 'utf8').trim();
    return head.startsWith('ref: refs/heads/') ? head.slice(16) : head.slice(0, 8);
  } catch { return null; }
}
function browse(input) {
  let dir = input ? String(input) : HOME;
  if (dir === '~' || dir.startsWith('~/')) dir = path.join(HOME, dir.slice(1));
  let real; try { real = fs.realpathSync(dir); } catch { real = HOME; }
  if (real !== HOME && !real.startsWith(HOME + path.sep)) real = HOME;
  const rel = path.relative(HOME, real).split(path.sep).filter(Boolean);
  if (rel.some(x => x.startsWith('.')) || BLOCKED_TOP.has(rel[0])) real = HOME;
  let entries = [];
  try { entries = fs.readdirSync(real, { withFileTypes: true }); } catch { /* unreadable */ }
  const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && !(real === HOME && BLOCKED_TOP.has(e.name)) && !SKIP_DIRS.has(e.name))
    .map(e => {
      const full = path.join(real, e.name);
      const marks = ['.git', 'package.json', 'composer.json', 'go.mod', 'pyproject.toml', 'Cargo.toml', 'pom.xml'].filter(m => { try { return fs.existsSync(path.join(full, m)); } catch { return false; } });
      return { name: e.name, project: marks.length > 0 };
    }).sort((x, y) => (y.project - x.project) || x.name.localeCompare(y.name)).slice(0, 400);
  return { path: real, display: real === HOME ? '~' : '~/' + path.relative(HOME, real), parent: real === HOME ? null : path.dirname(real), dirs, canAdd: real !== HOME };
}
// Resolve a relative path inside a workspace, following symlinks, refusing escapes.
function safeInside(root, rel) {
  const realRoot = fs.realpathSync(root);
  const target = path.resolve(realRoot, rel || '.');
  let real;
  try { real = fs.realpathSync(target); } catch { return null; }
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) return null;
  return real;
}
function parseAllowed(input) {
  const list = Array.isArray(input) ? input : String(input || '').split(/[,\n]/);
  const out = [];
  for (let s of list) {
    s = String(s).trim();
    if (!s) continue;
    if (!/^[A-Za-z0-9 ._\-\/:=@]{1,60}$/.test(s)) throw new Error(`Allowed command "${s}" has characters that are not allowed.`);
    out.push(s);
  }
  return out.slice(0, 12);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 1e6) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(e); } });
  });
}
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }

function summarizeTool(name, input) {
  if (!input) return name;
  const v = input.file_path || input.notebook_path || input.path || input.command || input.pattern || input.url || input.query || input.description || '';
  return v ? `${name}: ${String(v).replace(/\s+/g, ' ').slice(0, 140)}` : name;
}

// ---------- system stats ----------
let lastCpu = os.cpus();
let cpuPct = 0;
setInterval(() => {
  const now = os.cpus();
  let idle = 0, total = 0;
  now.forEach((c, i) => {
    const p = lastCpu[i] || c;
    for (const k of Object.keys(c.times)) total += c.times[k] - p.times[k];
    idle += c.times.idle - p.times.idle;
  });
  cpuPct = total > 0 ? Math.round(100 * (1 - idle / total)) : 0;
  lastCpu = now;
}, 2000).unref();
function systemStats() {
  let disk = null;
  try { const s = fs.statfsSync(os.homedir()); disk = Math.round(100 * (1 - s.bavail / s.blocks)); } catch { /* old node */ }
  return { cpu: cpuPct, ram: Math.round(100 * (1 - os.freemem() / os.totalmem())), disk, host: os.hostname(), platform: process.platform };
}

// ---------- project info ----------
function projectInfo(dir) {
  const has = f => fs.existsSync(path.join(dir, f));
  const read = f => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return null; } };
  const stack = [];
  let name = path.basename(dir), description = '';
  const pkgRaw = read('package.json');
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw);
      name = pkg.name || name; description = pkg.description || '';
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps.next) stack.push('Next.js'); else if (deps.react) stack.push('React');
      if (deps.vue) stack.push('Vue'); if (deps.svelte) stack.push('Svelte');
      if (deps['@nestjs/core']) stack.push('NestJS'); else if (deps.express) stack.push('Express');
      if (deps.typescript || has('tsconfig.json')) stack.push('TypeScript'); else stack.push('Node.js');
    } catch { stack.push('Node.js'); }
  }
  const composer = read('composer.json');
  if (composer) { stack.push(composer.includes('laravel/framework') ? 'Laravel' : 'PHP'); if (composer.includes('filament/filament')) stack.push('Filament'); }
  if (has('pyproject.toml') || has('requirements.txt')) stack.push('Python');
  if (has('go.mod')) stack.push('Go');
  if (has('Cargo.toml')) stack.push('Rust');
  if (has('pom.xml') || has('build.gradle')) stack.push('Java');
  if (has('Dockerfile') || has('docker-compose.yml')) stack.push('Docker');
  const branch = gitBranch(dir);
  let readme = ['README.md', 'readme.md', 'README.txt', 'README'].find(has) || null;
  if (!description && readme) {
    const lines = (read(readme) || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('![') && !l.startsWith('<'));
    description = (lines[0] || '').slice(0, 200);
  }
  let files = 0;
  try { files = fs.readdirSync(dir).length; } catch { /* empty */ }
  return { name, stack: [...new Set(stack)], description, readme, empty: files === 0, path: dir, branch };
}

function listTree(root, rel = '', depth = 0, counter = { n: 0 }) {
  if (depth > 6 || counter.n > 3000) return [];
  let entries;
  try { entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { return []; }
  entries = entries.filter(e => !(e.isDirectory() && SKIP_DIRS.has(e.name)) && e.name !== '.DS_Store');
  entries.sort((x, y) => (y.isDirectory() - x.isDirectory()) || x.name.localeCompare(y.name));
  const out = [];
  for (const e of entries) {
    counter.n++;
    const p = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push({ name: e.name, path: p, dir: true, children: listTree(root, p, depth + 1, counter) });
    else if (e.isFile()) out.push({ name: e.name, path: p, dir: false });
  }
  return out;
}

// ---------- run Claude Code ----------
// Runs one Claude Code turn for an agent. Resolves with { ok, result } when the process ends.
function runTask(a, text, opts = {}) {
  return new Promise(resolve => runTaskInner(a, text, opts, resolve));
}
function runTaskInner(a, text, opts, done) {
  let cwd;
  try { cwd = projectDir(a); } catch (e) { addLog(a, { kind: 'user', text, from: opts.from }); addLog(a, { kind: 'error', text: e.message }); setStatus(a, 'error'); return done({ ok: false, result: e.message }); }
  const args = ['-p', text, '--output-format', 'stream-json', '--verbose', '--permission-mode', opts.mode || a.mode];
  if (a.sessionId) args.push('--resume', a.sessionId);
  const rolePrompt = (ROLES[a.role] || ROLES.custom).prompt;
  if (rolePrompt) args.push('--append-system-prompt', `${rolePrompt} Your name is ${a.name}.`);
  // Anything not auto-allowed is sent to you as an Allow / Deny bubble in the office.
  const mcp = { mcpServers: { office: { command: process.execPath, args: [path.join(__dirname, 'perm-mcp.js')],
    env: { OFFICE_URL: `http://127.0.0.1:${PORT}`, OFFICE_INTERNAL_TOKEN: INTERNAL_TOKEN, OFFICE_AGENT_ID: a.id } } } };
  args.push('--mcp-config', JSON.stringify(mcp), '--permission-prompt-tool', 'mcp__office__approve');
  const allow = (a.allowed || []).map(c => /^[A-Z][A-Za-z]+$/.test(c) ? c : `Bash(${c}:*)`);
  if (allow.length) args.push('--allowedTools', ...allow);

  addLog(a, { kind: 'user', text, from: opts.from });
  setStatus(a, 'working');
  a._result = '';

  let child;
  try {
    if (!CLAUDE.bin) CLAUDE = findClaude(); // maybe installed since start
    if (!CLAUDE.bin) {
      addLog(a, { kind: 'error', text: 'Could not find Claude Code. In Terminal run:  which claude  — then start the office with:\nCLAUDE_BIN=/path/from/which node server.js' });
      setStatus(a, 'error'); return done({ ok: false, result: 'Claude Code not found' });
    }
    // Make sure child processes (claude itself spawns node, git, etc.) see the same tools as your shell.
    const env = { ...process.env, PATH: [path.dirname(CLAUDE.bin), process.env.PATH, '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'].filter(Boolean).join(path.delimiter) };
    child = spawn(CLAUDE.bin, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    addLog(a, { kind: 'error', text: `Could not start Claude Code: ${e.message}` });
    setStatus(a, 'error'); return done({ ok: false, result: e.message });
  }
  procs[a.id] = child;
  let buf = '', stderr = '', gotResult = false;

  child.stdout.on('data', chunk => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line) continue;
      let ev; try { ev = JSON.parse(line); } catch { continue; }
      handleEvent(a, ev, () => { gotResult = true; });
    }
  });
  child.stderr.on('data', c => { stderr += c; if (stderr.length > 8000) stderr = stderr.slice(-8000); });
  child.on('error', e => {
    addLog(a, { kind: 'error', text: e.code === 'ENOENT' ? `Could not start "${CLAUDE_BIN_LABEL()}". In Terminal run "which claude" and start the office with CLAUDE_BIN=<that path> node server.js` : e.message });
  });
  child.on('close', (code, signal) => {
    delete procs[a.id];
    denyPendingFor(a.id, 'The task ended.');
    let ok = true;
    if (signal) { addLog(a, { kind: 'system', text: 'Task stopped.' }); setStatus(a, 'idle'); ok = false; }
    else if (code !== 0 && !gotResult) {
      addLog(a, { kind: 'error', text: (stderr.trim() || `Claude Code exited with code ${code}`).slice(-1500) });
      setStatus(a, 'error'); ok = false;
    } else if (a.status === 'working') setStatus(a, 'waiting');
    if (a.status === 'error') ok = false;
    save();
    done({ ok, result: a._result || lastAssistantText(a) });
  });
}

function handleEvent(a, ev, markResult) {
  if (ev.session_id && !a.sessionId) { a.sessionId = ev.session_id; broadcast({ type: 'agent', agent: publicAgent(a) }); }
  if (ev.type === 'assistant' && ev.message && Array.isArray(ev.message.content)) {
    for (const part of ev.message.content) {
      if (part.type === 'text' && part.text.trim()) addLog(a, { kind: 'assistant', text: part.text });
      else if (part.type === 'tool_use') {
        const file = part.input && (part.input.file_path || part.input.notebook_path);
        addLog(a, { kind: 'tool', tool: part.name, text: summarizeTool(part.name, part.input), file: file ? String(file) : undefined });
      }
    }
  } else if (ev.type === 'user' && ev.message && Array.isArray(ev.message.content)) {
    for (const part of ev.message.content) {
      if (part.type !== 'tool_result') continue;
      const t = typeof part.content === 'string' ? part.content
        : Array.isArray(part.content) ? part.content.map(c => c.text || '').join('\n') : JSON.stringify(part.content);
      if (part.is_error) addLog(a, { kind: 'denied', text: t.slice(0, 400) });
      else if (t && t.trim()) addLog(a, { kind: 'output', text: t.slice(0, 2000) });
    }
  } else if (ev.type === 'result') {
    markResult();
    if (typeof ev.result === 'string') a._result = ev.result;
    if (typeof ev.total_cost_usd === 'number') a.cost = (a.cost || 0) + ev.total_cost_usd;
    if (ev.session_id) a.sessionId = ev.session_id;
    if (ev.is_error) { addLog(a, { kind: 'error', text: ev.result || ev.subtype || 'Task failed' }); setStatus(a, 'error'); }
    else {
      const secs = ev.duration_ms ? ` in ${(ev.duration_ms / 1000).toFixed(1)}s` : '';
      addLog(a, { kind: 'system', text: `Done${secs}${ev.num_turns ? `, ${ev.num_turns} turns` : ''}.` });
      setStatus(a, 'waiting');
    }
  }
}


// ---------- approvals (Allow / Deny bubbles) ----------
const approvals = new Map(); // id -> { id, agentId, tool, summary, detail, t, resolve }
function summarizeRequest(tool, input) {
  input = input || {};
  if (tool === 'Bash') return { summary: String(input.command || '').slice(0, 300), detail: input.description || '' };
  const target = input.file_path || input.notebook_path || input.path || input.url || input.pattern || input.query || '';
  return { summary: `${tool}${target ? ': ' + String(target).slice(0, 200) : ''}`, detail: '' };
}
function pendingFor(agentId) {
  for (const ap of approvals.values()) if (ap.agentId === agentId) return { id: ap.id, tool: ap.tool, summary: ap.summary, detail: ap.detail, t: ap.t };
  return null;
}
function resolveApproval(ap, behavior, message, how) {
  if (!approvals.has(ap.id)) return;
  approvals.delete(ap.id);
  ap.resolve(behavior === 'allow' ? { behavior: 'allow' } : { behavior: 'deny', message: message || 'Denied in AI Office.' });
  const a = agents[ap.agentId];
  if (a) {
    addLog(a, { kind: behavior === 'allow' ? 'approved' : 'rejected', text: `${how || (behavior === 'allow' ? 'Allowed' : 'Denied')}: ${ap.summary}` });
    broadcast({ type: 'agent', agent: publicAgent(a) });
  }
  broadcast({ type: 'approval-done', id: ap.id, agentId: ap.agentId, behavior });
}
function denyPendingFor(agentId, message) { for (const ap of [...approvals.values()]) if (ap.agentId === agentId) resolveApproval(ap, 'deny', message, 'Cancelled'); }
function allowedPrefixFor(ap) {
  if (ap.tool !== 'Bash') return ap.tool;
  const words = ap.summary.trim().split(/\s+/).filter(w => /^[A-Za-z0-9._\-\/:=@]+$/.test(w));
  return words.slice(0, words[0] && /^(npm|pnpm|yarn|composer|php|git|docker|make|bundle|go|cargo|python3?|pytest|npx|vendor\/bin\/\S+|\.\/vendor\/bin\/\S+)$/.test(words[0]) ? 2 : 1).join(' ');
}
function handleInternalApproval(req, res) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return json(res, 401, { behavior: 'deny', message: 'bad token' });
  readBody(req).then(b => {
    const a = agents[b.agentId];
    if (!a) return json(res, 200, { behavior: 'deny', message: 'Unknown agent.' });
    const id = crypto.randomUUID();
    const { summary, detail } = summarizeRequest(b.tool, b.input);
    const ap = { id, agentId: a.id, tool: String(b.tool || 'tool'), summary, detail, t: Date.now(), resolve: (decision) => json(res, 200, decision) };
    approvals.set(id, ap);
    req.on('close', () => { if (approvals.has(id)) { approvals.delete(id); broadcast({ type: 'approval-done', id, agentId: a.id, behavior: 'deny' }); } });
    addLog(a, { kind: 'ask', text: summary, tool: ap.tool, approvalId: id });
    broadcast({ type: 'approval', approval: { id, agentId: a.id, tool: ap.tool, summary, detail, t: ap.t } });
    broadcast({ type: 'agent', agent: publicAgent(a) });
  }).catch(e => json(res, 400, { behavior: 'deny', message: e.message }));
}
function lastAssistantText(a) {
  for (let i = a.log.length - 1; i >= 0; i--) if (a.log[i].kind === 'assistant') return a.log[i].text;
  return '';
}

// ---------- team pipelines: Architect -> Developer -> Tester ----------
const pipelines = {}; // id -> pipeline
let activePipelineByProject = {};
function publicPipeline(pl) { return { id: pl.id, projectId: pl.projectId, goal: pl.goal, status: pl.status, round: pl.round, steps: pl.steps, startedAt: pl.startedAt, endedAt: pl.endedAt, verdict: pl.verdict }; }
function plUpdate(pl) { broadcast({ type: 'pipeline', pipeline: publicPipeline(pl) }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function handoff(pl, from, to, label) {
  if (!from || !to || from.id === to.id) return;
  broadcast({ type: 'handoff', from: from.id, to: to.id, label });
  addLog(to, { kind: 'system', text: `${from.name} handed over: ${label}` });
  await sleep(6500); // time for the walk to the other desk
}
async function runPipeline(pl) {
  const team = Object.values(agents).filter(a => a.project === pl.projectId);
  const pick = role => team.find(a => a.role === role);
  const architect = pick('architect'), developer = pick('developer') || team.find(a => a.role === 'custom'), tester = pick('tester');
  const step = (role, agent, round) => { const st = { role, agentId: agent.id, name: agent.name, status: 'working', round, startedAt: Date.now() }; pl.steps.push(st); agent.pipelineStep = role; plUpdate(pl); return st; };
  const finish = (st, ok) => { st.status = ok ? 'done' : 'failed'; st.endedAt = Date.now(); const a = agents[st.agentId]; if (a) a.pipelineStep = null; plUpdate(pl); };
  const stopped = () => pl.status === 'stopped';
  try {
    let plan = '';
    if (architect) {
      const st = step('Plan', architect, 0);
      const r = await runTask(architect, `Team goal: ${pl.goal}\n\nWrite a short, concrete implementation plan for the Developer (${developer.name}): which files to change, the steps, and how to test it. Do not edit any files.`, { mode: 'plan', from: 'Team pipeline' });
      finish(st, r.ok); if (!r.ok || stopped()) throw new Error(stopped() ? 'stopped' : 'The Architect could not finish the plan.');
      plan = r.result; await handoff(pl, architect, developer, 'Plan');
    }
    let report = '', passed = false;
    for (let round = 1; round <= pl.maxRounds && !passed; round++) {
      pl.round = round;
      const st = step(round === 1 ? 'Build' : 'Fix', developer, round);
      const prompt = round === 1
        ? `Team goal: ${pl.goal}\n\n${plan ? `Plan from ${architect.name} (Architect):\n${plan}\n\n` : ''}Implement it. When you are done, summarise what you changed.`
        : `${tester.name} (Tester) found problems:\n${report}\n\nFix them, then summarise what you changed.`;
      const r = await runTask(developer, prompt, { from: round === 1 ? (architect ? `${architect.name} (Architect)` : 'Team pipeline') : `${tester.name} (Tester)` });
      finish(st, r.ok); if (!r.ok || stopped()) throw new Error(stopped() ? 'stopped' : 'The Developer could not finish.');
      if (!tester) { passed = true; pl.verdict = 'Done (no Tester in this room)'; break; }
      await handoff(pl, developer, tester, round === 1 ? 'Work to test' : 'Fixes to re-test');
      const st2 = step('Test', tester, round);
      const t = await runTask(tester, `Team goal: ${pl.goal}\n\n${developer.name} (Developer) reports:\n${r.result}\n\nVerify the work: review the changes and run the tests you are allowed to run. End your reply with exactly one line: "VERDICT: PASS" or "VERDICT: FAIL - <short reason>".`, { from: `${developer.name} (Developer)` });
      finish(st2, t.ok); if (!t.ok || stopped()) throw new Error(stopped() ? 'stopped' : 'The Tester could not finish.');
      const m = /VERDICT:\s*(PASS|FAIL)\b[^\n]*/i.exec(t.result || '');
      passed = !!m && m[1].toUpperCase() === 'PASS';
      pl.verdict = m ? m[0].trim() : 'No verdict given';
      report = t.result;
      if (!passed && round < pl.maxRounds) await handoff(pl, tester, developer, 'Bug report');
    }
    pl.status = passed ? 'passed' : 'failed';
    const proj = projects[pl.projectId];
    if (passed && proj && proj.gitlab && proj.gitlab.autoMR) {
      try { await openMergeRequest(proj, { agent: developer, title: pl.goal, description: `Goal: ${pl.goal}\n\n${pl.verdict}` }); }
      catch (e) { pl.mrError = e.message; addLog(developer, { kind: 'error', text: 'Merge request: ' + e.message }); }
    }
  } catch (e) {
    if (pl.status !== 'stopped') { pl.status = 'failed'; pl.verdict = e.message; }
  } finally {
    pl.endedAt = Date.now();
    for (const a of Object.values(agents)) if (a.project === pl.projectId) a.pipelineStep = null;
    delete activePipelineByProject[pl.projectId];
    plUpdate(pl); save();
  }
}

// ---------- git + GitLab merge requests ----------
let secrets = {};
try { secrets = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8')); } catch { /* none yet */ }
function saveSecrets() { fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2), { mode: 0o600 }); try { fs.chmodSync(SECRETS_FILE, 0o600); } catch { /* windows */ } }
function git(dir, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: dir, timeout: opts.timeout || 60000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim().split('\n').slice(-3).join(' '))); else resolve(stdout.trim());
    });
  });
}
function parseRemote(url) {
  if (!url) return null;
  let m = url.match(/^git@([^:]+):(.+?)(\.git)?$/) || url.match(/^ssh:\/\/git@([^/:]+)(?::\d+)?\/(.+?)(\.git)?$/) || url.match(/^https?:\/\/(?:[^@/]+@)?([^/]+)\/(.+?)(\.git)?$/);
  return m ? { host: m[1], path: m[2] } : null;
}
async function gitInfo(proj) {
  const dir = proj.path;
  const out = { isRepo: fs.existsSync(path.join(dir, '.git')), branch: null, remote: null, changes: 0, files: [] };
  if (!out.isRepo) return out;
  try { out.branch = await git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']); } catch { /* new repo */ }
  try { out.remote = await git(dir, ['remote', 'get-url', 'origin']); } catch { /* no remote */ }
  try { const st = await git(dir, ['status', '--porcelain']); out.files = st ? st.split('\n').map(l => l.slice(3)).slice(0, 50) : []; out.changes = st ? st.split('\n').length : 0; } catch { /* ignore */ }
  const r = parseRemote(out.remote);
  const g = proj.gitlab || {};
  out.gitlab = {
    url: g.url || (r ? `https://${r.host}` : ''), path: g.path || (r ? r.path : ''), target: g.target || '',
    autoMR: !!g.autoMR, hasToken: !!(secrets.gitlab && secrets.gitlab[(g.url || (r ? `https://${r.host}` : '')).replace(/\/$/, '')]),
  };
  out.mr = proj.mr || null;
  return out;
}
async function gitlabApi(proj, method, apiPath, body) {
  const info = await gitInfo(proj);
  const base = info.gitlab.url.replace(/\/$/, '');
  if (!base) throw new Error('Set the GitLab URL for this project first.');
  const token = secrets.gitlab && secrets.gitlab[base];
  if (!token) throw new Error(`Add a GitLab access token for ${base} (Project Info → GitLab).`);
  const res = await fetch(`${base}/api/v4${apiPath}`, { method, headers: { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 200) }; }
  if (!res.ok) { const err = new Error(`GitLab ${res.status}: ${typeof data.message === 'string' ? data.message : JSON.stringify(data.message || data.error)}`); err.status = res.status; err.data = data; throw err; }
  return data;
}
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'changes';
async function openMergeRequest(proj, { agent, title, description }) {
  const dir = proj.path, info = await gitInfo(proj);
  if (!info.isRepo) throw new Error('This project is not a git repository.');
  if (!info.remote) throw new Error('This repository has no "origin" remote.');
  if (!info.gitlab.path) throw new Error('Could not work out the GitLab project path. Set it in Project Info → GitLab.');
  const enc = encodeURIComponent(info.gitlab.path);
  let target = info.gitlab.target;
  if (!target) { const p = await gitlabApi(proj, 'GET', `/projects/${enc}`); target = p.default_branch || 'main'; }
  let branch = info.branch;
  if (!branch || branch === 'HEAD' || branch === target) {
    branch = `ai-office/${slug(title)}-${Date.now().toString(36).slice(-4)}`;
    await git(dir, ['checkout', '-b', branch]);
  }
  if (info.changes) {
    await git(dir, ['add', '-A']);
    await git(dir, ['commit', '-m', title.slice(0, 72), '-m', `${description || ''}\n\nMade with AI Office${agent ? ` by ${agent.name} (${agent.role})` : ''}.`]);
  }
  await git(dir, ['push', '-u', 'origin', branch], { timeout: 120000 });
  let mr;
  try {
    mr = await gitlabApi(proj, 'POST', `/projects/${enc}/merge_requests`, { source_branch: branch, target_branch: target, title, description: description || title, remove_source_branch: true });
  } catch (e) {
    if (e.status !== 409) throw e;
    const list = await gitlabApi(proj, 'GET', `/projects/${enc}/merge_requests?state=opened&source_branch=${encodeURIComponent(branch)}`);
    if (!list.length) throw e; mr = list[0];
  }
  proj.mr = { iid: mr.iid, url: mr.web_url, title: mr.title, branch, target, agentId: agent ? agent.id : null, state: mr.state, ci: (mr.head_pipeline && mr.head_pipeline.status) || 'pending', at: Date.now() };
  saveProjects();
  if (agent) addLog(agent, { kind: 'system', text: `Opened merge request !${mr.iid}: ${mr.web_url}` });
  broadcast({ type: 'git', projectId: proj.id, mr: proj.mr });
  return proj.mr;
}
async function pollMergeRequests() {
  for (const proj of Object.values(projects)) {
    const mr = proj.mr; if (!mr || mr.state === 'merged' || mr.state === 'closed') continue;
    try {
      const info = await gitInfo(proj);
      const data = await gitlabApi(proj, 'GET', `/projects/${encodeURIComponent(info.gitlab.path)}/merge_requests/${mr.iid}`);
      const ci = (data.head_pipeline && data.head_pipeline.status) || (data.pipeline && data.pipeline.status) || mr.ci;
      if (ci !== mr.ci || data.state !== mr.state) { mr.ci = ci; mr.state = data.state; saveProjects(); broadcast({ type: 'git', projectId: proj.id, mr }); }
    } catch { /* offline or token issue: try again later */ }
  }
}
setInterval(pollMergeRequests, Number(process.env.OFFICE_CI_POLL_MS || 30000)).unref();

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

async function api(req, res, url) {
  const p = url.pathname;
  if (p === '/api/events' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify({ type: 'hello' })}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => { clients.delete(res); clearInterval(ping); });
    return;
  }
  if (p === '/api/config' && req.method === 'GET') {
    return json(res, 200, { workspaces: WORKSPACES, modes: MODES, roles: Object.fromEntries(Object.entries(ROLES).map(([k, v]) => [k, v.label])), maxAgents: MAX_AGENTS, desksPerRoom: DESKS_PER_ROOM, maxProjects: MAX_PROJECT_ROOMS, themes: ROOM_THEMES, port: PORT, home: HOME });
  }
  if (p === '/api/system' && req.method === 'GET') return json(res, 200, systemStats());
  if (p === '/api/agents' && req.method === 'GET') return json(res, 200, Object.values(agents).map(publicAgent));
  if (p === '/api/browse' && req.method === 'GET') return json(res, 200, browse(url.searchParams.get('path')));
  if (p === '/api/projects' && req.method === 'GET') {
    return json(res, 200, Object.values(projects).map(pr => ({ ...pr, exists: fs.existsSync(pr.path), agents: Object.values(agents).filter(a => a.project === pr.id).length, branch: gitBranch(pr.path) }))
      .sort((x, y) => x.name.localeCompare(y.name)));
  }
  if (p === '/api/projects' && req.method === 'POST') {
    const b = await readBody(req);
    let pr;
    if (b.path) pr = addProject(validateProjectPath(b.path), b.name ? String(b.name).trim() : null, 'linked');
    else {
      const folder = String(b.name || '').trim();
      if (!safeFolder(folder)) return json(res, 400, { error: 'New project names may use letters, numbers, . _ - only.' });
      pr = ensureWorkspaceProject(folder);
    }
    broadcast({ type: 'projects' });
    return json(res, 201, pr);
  }
  const pm = p.match(/^\/api\/projects\/([0-9a-f]{12})(\/[a-z-]+)?$/);
  if (pm) {
    const pr = projects[pm[1]];
    if (!pr) return json(res, 404, { error: 'No such project' });
    if (!pm[2] && req.method === 'DELETE') {
      if (Object.values(agents).some(a => a.project === pr.id)) return json(res, 409, { error: 'Move or remove the agents on this project first.' });
      delete projects[pr.id]; saveProjects(); broadcast({ type: 'projects' });
      return json(res, 200, { ok: true });
    }
    if (pm[2] === '/assign-all' && req.method === 'POST') {
      if (Object.keys(procs).length) return json(res, 409, { error: 'Some agents are still working. Stop them first.' });
      if (!fs.existsSync(pr.path)) return json(res, 400, { error: 'Project folder is missing.' });
      if (Object.keys(agents).length > DESKS_PER_ROOM) return json(res, 400, { error: `A room has ${DESKS_PER_ROOM} desks, and you have ${Object.keys(agents).length} agents.` });
      for (const a of Object.values(agents)) if (a.project !== pr.id) {
        a.project = pr.id; a.sessionId = null; a.desk = freeDesk(pr.id, a.id);
        addLog(a, { kind: 'system', text: `Moved to project ${pr.name} (${pr.path}). Started a fresh conversation.` });
        broadcast({ type: 'agent', agent: publicAgent(a) });
      }
      save(); broadcast({ type: 'projects' });
      return json(res, 200, { ok: true });
    }
    if (pm[2] === '/pipeline' && req.method === 'POST') {
      const b = await readBody(req);
      const goal = String(b.goal || '').trim().slice(0, 2000);
      if (!goal) return json(res, 400, { error: 'Describe the goal for the team.' });
      if (activePipelineByProject[pr.id]) return json(res, 409, { error: 'A pipeline is already running in this room.' });
      const team = Object.values(agents).filter(a => a.project === pr.id);
      if (!team.some(a => a.role === 'developer' || a.role === 'custom')) return json(res, 400, { error: 'This room needs a Developer (or a Custom agent) to run a pipeline.' });
      if (team.some(a => procs[a.id])) return json(res, 409, { error: 'Someone in this room is still working. Wait or stop them first.' });
      const pl = { id: crypto.randomUUID(), projectId: pr.id, goal, status: 'running', round: 0, maxRounds: Math.max(1, Math.min(3, Number(b.maxRounds) || 2)), steps: [], startedAt: Date.now() };
      pipelines[pl.id] = pl; activePipelineByProject[pr.id] = pl.id;
      plUpdate(pl); runPipeline(pl);
      return json(res, 202, publicPipeline(pl));
    }
    if (pm[2] === '/git' && req.method === 'GET') return json(res, 200, await gitInfo(pr));
    if (pm[2] === '/gitlab' && req.method === 'POST') {
      const b = await readBody(req);
      const url = String(b.url || '').trim().replace(/\/$/, '');
      if (url && !/^https?:\/\/[A-Za-z0-9.\-:]+$/.test(url)) return json(res, 400, { error: 'GitLab URL should look like https://gitlab.com' });
      pr.gitlab = { url, path: String(b.path || '').trim().replace(/^\/|\.git$/g, ''), target: String(b.target || '').trim(), autoMR: !!b.autoMR };
      if (b.token) { secrets.gitlab = secrets.gitlab || {}; secrets.gitlab[url || (await gitInfo(pr)).gitlab.url] = String(b.token).trim(); saveSecrets(); }
      saveProjects(); broadcast({ type: 'git', projectId: pr.id, mr: pr.mr || null });
      return json(res, 200, await gitInfo(pr));
    }
    if (pm[2] === '/merge-request' && req.method === 'POST') {
      const b = await readBody(req);
      if (Object.values(agents).some(a => a.project === pr.id && procs[a.id])) return json(res, 409, { error: 'Wait until the agents in this room finish.' });
      const agent = agents[b.agentId] && agents[b.agentId].project === pr.id ? agents[b.agentId] : null;
      const title = String(b.title || '').trim().slice(0, 200);
      if (!title) return json(res, 400, { error: 'Give the merge request a title.' });
      try { return json(res, 200, await openMergeRequest(pr, { agent, title, description: String(b.description || '').slice(0, 5000) })); }
      catch (e) { return json(res, 400, { error: e.message }); }
    }
    if (pm[2] === '/settings' && req.method === 'POST') {
      const b = await readBody(req);
      if (b.theme && ROOM_THEMES.includes(b.theme)) pr.theme = b.theme;
      if (b.name && String(b.name).trim()) pr.name = String(b.name).trim().slice(0, 40);
      saveProjects(); broadcast({ type: 'projects' });
      for (const a of Object.values(agents)) if (a.project === pr.id) broadcast({ type: 'agent', agent: publicAgent(a) });
      return json(res, 200, pr);
    }
    return json(res, 404, { error: 'Not found' });
  }
  if (p === '/api/approvals' && req.method === 'GET') return json(res, 200, [...approvals.values()].map(ap => ({ id: ap.id, agentId: ap.agentId, tool: ap.tool, summary: ap.summary, detail: ap.detail, t: ap.t })));
  const am = p.match(/^\/api\/approvals\/([0-9a-f-]{36})$/);
  if (am && req.method === 'POST') {
    const ap = approvals.get(am[1]); if (!ap) return json(res, 404, { error: 'This request was already answered.' });
    const b = await readBody(req);
    if (b.decision === 'always') {
      const a = agents[ap.agentId]; const prefix = allowedPrefixFor(ap);
      if (a && prefix && !a.allowed.includes(prefix)) { a.allowed = parseAllowed([...a.allowed, prefix]); save(); broadcast({ type: 'agent', agent: publicAgent(a) }); }
      resolveApproval(ap, 'allow', null, prefix ? `Always allowed "${prefix}"` : 'Allowed');
    } else resolveApproval(ap, b.decision === 'allow' ? 'allow' : 'deny', b.message, null);
    return json(res, 200, { ok: true });
  }
  if (p === '/api/pipelines' && req.method === 'GET') return json(res, 200, Object.values(pipelines).sort((x, y) => y.startedAt - x.startedAt).slice(0, 20).map(publicPipeline));
  const plm = p.match(/^\/api\/pipelines\/([0-9a-f-]{36})\/stop$/);
  if (plm && req.method === 'POST') {
    const pl = pipelines[plm[1]]; if (!pl) return json(res, 404, { error: 'No such pipeline' });
    pl.status = 'stopped'; pl.verdict = 'Stopped by you';
    for (const a of Object.values(agents)) if (a.project === pl.projectId && procs[a.id]) { denyPendingFor(a.id, 'Pipeline stopped.'); procs[a.id].kill('SIGTERM'); }
    plUpdate(pl); return json(res, 200, { ok: true });
  }
  if (p === '/api/stop-all' && req.method === 'POST') { for (const c of Object.values(procs)) c.kill('SIGTERM'); return json(res, 200, { ok: true }); }
  if (p === '/api/agents' && req.method === 'POST') {
    const b = await readBody(req);
    const role = ROLES[b.role] ? b.role : 'custom';
    const name = String(b.name || ROLES[role].label).trim().slice(0, 24);
    const mode = MODES.includes(b.mode) ? b.mode : 'plan';
    const allowed = parseAllowed(b.allowed);
    const pr = projects[b.project];
    if (!name) return json(res, 400, { error: 'Name is required.' });
    if (!pr) return json(res, 400, { error: 'Choose a project.' });
    if (Object.keys(agents).length >= MAX_AGENTS) return json(res, 400, { error: `The building is full (${MAX_AGENTS} agents). Remove an agent first.` });
    const desk = freeDesk(pr.id);
    if (desk < 0) return json(res, 400, { error: `${pr.name} has no free desks (${DESKS_PER_ROOM} per room).` });
    const id = crypto.randomUUID();
    agents[id] = { id, name, role, project: pr.id, mode, allowed, desk, status: 'idle', sessionId: null, cost: 0, log: [] };
    addLog(agents[id], { kind: 'system', text: `${name} joined the office. Project: ${pr.name} (${pr.path}) · mode: ${mode}` });
    broadcast({ type: 'projects' });
    save();
    broadcast({ type: 'agent', agent: publicAgent(agents[id]) });
    return json(res, 201, publicAgent(agents[id]));
  }
  const m = p.match(/^\/api\/agents\/([0-9a-f-]{36})(\/[a-z]+)?$/);
  if (!m) return json(res, 404, { error: 'Not found' });
  const a = agents[m[1]];
  if (!a) return json(res, 404, { error: 'No such agent' });
  const action = m[2] || '';
  let dir = null; try { dir = projectDir(a); } catch { /* reported per action */ }
  const needDir = () => { if (!dir) { json(res, 400, { error: 'Project folder is missing. Pick another project in the Context tab.' }); return false; } return true; };

  if (action === '' && req.method === 'GET') return json(res, 200, { ...publicAgent(a), log: a.log });
  if (action === '' && req.method === 'DELETE') {
    if (procs[a.id]) procs[a.id].kill('SIGTERM');
    delete agents[a.id]; save();
    broadcast({ type: 'removed', id: a.id });
    return json(res, 200, { ok: true });
  }
  if (action === '/message' && req.method === 'POST') {
    const b = await readBody(req);
    const text = String(b.text || '').trim();
    if (!text) return json(res, 400, { error: 'Empty message' });
    if (procs[a.id]) return json(res, 409, { error: `${a.name} is still working. Stop the task or wait.` });
    runTask(a, text);
    return json(res, 202, { ok: true });
  }
  if (action === '/stop' && req.method === 'POST') { denyPendingFor(a.id, 'Stopped by you.'); if (procs[a.id]) procs[a.id].kill('SIGTERM'); return json(res, 200, { ok: true }); }
  if (action === '/settings' && req.method === 'POST') {
    const b = await readBody(req);
    if (b.mode && MODES.includes(b.mode)) a.mode = b.mode;
    if (b.allowed !== undefined) a.allowed = parseAllowed(b.allowed);
    if (b.project && b.project !== a.project) {
      const pr = projects[b.project];
      if (!pr) return json(res, 400, { error: 'No such project' });
      if (procs[a.id]) return json(res, 409, { error: `${a.name} is working. Stop the task first.` });
      const desk = freeDesk(pr.id, a.id);
      if (desk < 0) return json(res, 400, { error: `${pr.name} has no free desks.` });
      a.project = pr.id; a.sessionId = null; a.desk = desk;
      addLog(a, { kind: 'system', text: `Moved to project ${pr.name} (${pr.path}). Started a fresh conversation.` });
      broadcast({ type: 'projects' });
    }
    if (b.newSession) { a.sessionId = null; addLog(a, { kind: 'system', text: 'Started a fresh conversation.' }); }
    save(); broadcast({ type: 'agent', agent: publicAgent(a) });
    return json(res, 200, publicAgent(a));
  }
  if (action === '/project' && req.method === 'GET') { if (!needDir()) return; return json(res, 200, projectInfo(dir)); }
  if (action === '/tree' && req.method === 'GET') { if (!needDir()) return; return json(res, 200, { root: projects[a.project].name, tree: listTree(dir) }); }
  if (action === '/file' && req.method === 'GET') {
    if (!needDir()) return;
    const real = safeInside(dir, url.searchParams.get('path') || '');
    if (!real) return json(res, 404, { error: 'File not found in this workspace.' });
    const st = fs.statSync(real);
    if (!st.isFile()) return json(res, 400, { error: 'Not a file.' });
    if (st.size > 512 * 1024) return json(res, 413, { error: 'File is larger than 512 KB.' });
    const buf = fs.readFileSync(real);
    if (buf.includes(0)) return json(res, 415, { error: 'Binary file — not shown.' });
    return json(res, 200, { path: path.relative(fs.realpathSync(dir), real), content: buf.toString('utf8') });
  }
  if (action === '/reveal' && req.method === 'POST') {
    if (!needDir()) return;
    if (process.platform !== 'darwin') return json(res, 400, { error: 'Reveal in Finder only works on macOS.' });
    execFile('open', [dir], () => {});
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  // Block DNS-rebinding and other-origin pages.
  const host = (req.headers.host || '').toLowerCase();
  if (host !== `127.0.0.1:${PORT}` && host !== `localhost:${PORT}`) { res.writeHead(403); return res.end('Forbidden host'); }
  const origin = req.headers.origin;
  if (origin && origin !== `http://127.0.0.1:${PORT}` && origin !== `http://localhost:${PORT}`) { res.writeHead(403); return res.end('Forbidden origin'); }

  const url = new URL(req.url, `http://${host}`);
  const p = url.pathname;

  if (p === '/internal/approval' && req.method === 'POST') return handleInternalApproval(req, res);
  if (p.startsWith('/api/')) {
    const tok = req.headers['x-office-token'] || url.searchParams.get('token');
    if (tok !== TOKEN) return json(res, 401, { error: 'Bad token — reload the page.' });
    try { return await api(req, res, url); } catch (e) { return json(res, 400, { error: e.message }); }
  }

  // Static files; token is injected into index.html (other origins can't read it).
  const file = p === '/' ? '/index.html' : p;
  const full = path.resolve(PUBLIC, '.' + file);
  if (!full.startsWith(PUBLIC + path.sep) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  let body = fs.readFileSync(full);
  if (file === '/index.html') body = Buffer.from(body.toString().replace('__OFFICE_TOKEN__', TOKEN));
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(full)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
  });
  res.end(body);
});

server.requestTimeout = 0; server.headersTimeout = 60000; server.timeout = 0; // approval requests can wait for you
server.listen(PORT, HOST, () => {
  console.log(`\n  🏢  AI Office is open at  http://127.0.0.1:${PORT}`);
  console.log(`  📁  Agent workspaces live in    ${WORKSPACES}`);
  console.log(CLAUDE.bin ? `  🤖  Using Claude Code at        ${CLAUDE.bin}` : `  ⚠️   Claude Code not found. Run "which claude" and start with: CLAUDE_BIN=<path> node server.js`);
  console.log(`  🔒  Listening on 127.0.0.1 only. Press Ctrl+C to close the office.\n`);
});

function shutdown() { for (const c of Object.values(procs)) c.kill('SIGTERM'); save(); process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
