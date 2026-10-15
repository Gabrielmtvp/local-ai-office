(function () {
  const TOKEN = window.OFFICE_TOKEN;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = (path, opts = {}) => fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'X-Office-Token': TOKEN, ...(opts.headers || {}) } })
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.statusText); return j; });

  // ---------- icons ----------
  const ICONS = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
    warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
    spinner: '<path d="M12 3a9 9 0 1 0 9 9"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="M9 20l3-6 3 3v4M12 14l-1-5 4 1 3 3M11 9l-4 2-1 4"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    maximize: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    minimize: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    zoomin: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>',
    zoomout: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/>',
    fit: '<path d="M3 12l9-8 9 8-9 8z"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    team: '<circle cx="6" cy="8" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="12" cy="16" r="2.5"/><path d="M8.3 9.5l2.2 4.5M15.7 9.5l-2.2 4.5M8.5 8h7"/>',
    branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10M18 10c0 5-6 3-10 7"/>',
    mr: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M6 8v8M18 16V9a3 3 0 0 0-3-3h-4M13 4l-2 2 2 2"/>',
  };
  const icon = n => `<svg viewBox="0 0 24 24">${ICONS[n] || ''}</svg>`;
  const paintIcons = (root = document) => root.querySelectorAll('[data-icon]').forEach(el => { if (!el.dataset.painted) { el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)); el.dataset.painted = 1; } });
  paintIcons();

  // ---------- state ----------
  const agents = new Map();
  const logs = new Map();
  let selected = null, cfg = {}, tab = 'chat', connected = false;
  let openFile = null, expanded = new Set(), termCleared = new Map();
  const avatarCache = new Map();
  const avatarFor = a => { const k = a.role + ':' + a.desk; if (!avatarCache.has(k)) avatarCache.set(k, Office.avatar(a, 3)); return avatarCache.get(k); };

  const STATUS_TEXT = { idle: 'Idle', working: 'Working', waiting: 'Waiting for you', error: 'Needs attention' };
  function activityText(a) {
    if (a.asking) return 'Needs your OK: ' + a.asking.summary;
    const carrying = office && office.activity(a);
    if (carrying && /^(Bringing|Handing)/.test(carrying)) return carrying;
    if (a.status === 'working' && a.pipeline) return `${a.pipeline} · ` + (a.activity ? a.activity.replace(/^(\w+): /, '') : 'thinking…');
    if (a.status === 'working') return a.activity ? a.activity.replace(/^(\w+): /, (m, t) => ({ Read: 'Reading ', Edit: 'Editing ', Write: 'Writing ', Bash: 'Running ', Glob: 'Searching ', Grep: 'Searching ', WebFetch: 'Reading ', WebSearch: 'Searching ' }[t] || t + ': ')) : 'Thinking…';
    if (a.status === 'waiting') return 'Waiting for you';
    if (a.status === 'error') return 'Needs attention';
    const roam = office && office.activity(a);
    if (roam) return roam;
    return 'Idle';
  }
  function ago(t) {
    if (!t) return '';
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 45) return 'Just now'; if (s < 3600) return Math.round(s / 60) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago'; return Math.round(s / 86400) + 'd ago';
  }
  const hhmm = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2600); }

  // ---------- building (all project rooms + shared break rooms, pan & zoom) ----------
  let office = null, worldKey = '';
  const src = document.createElement('canvas');
  const view = $('officeCanvas'), vctx = view.getContext('2d');
  let cam = { x: 0, y: 0, z: 1 }, fitZ = 1, camTarget = null, camInit = false, dpr = 1;
  const roomSigns = new Map();
  function roomDefs() {
    const proj = [...projects].sort((x, y) => (x.added || 0) - (y.added || 0)).slice(0, cfg.maxProjects || 7)
      .map(p => ({ id: p.id, name: p.name, kind: 'proj', layout: 'office', theme: p.theme || 'night' }));
    const defs = [...proj, { id: '_lounge', name: 'Kitchen & Lounge', kind: 'fun', layout: 'lounge', theme: 'warm' }, { id: '_games', name: 'Game Room', kind: 'fun', layout: 'games', theme: 'arcade' }];
    const C = defs.length <= 4 ? 2 : 3, total = C * Math.ceil(defs.length / C);
    while (defs.length < total) defs.push({ id: '_meeting' + defs.length, name: 'Meeting Room', kind: 'fun', layout: 'meeting', theme: 'slate' });
    return defs;
  }
  function buildWorld() {
    const defs = roomDefs();
    const key = JSON.stringify(defs.map(d => [d.id, d.name, d.theme]));
    if (key === worldKey && office) return;
    worldKey = key;
    if (office) office.destroy();
    office = Office.createWorld(src, { rooms: defs });
    office.onFrame(renderView);
    office.setWander(viewState.wander);
    office.setNight(isNight());
    syncWorldAgents();
    const box = $('labels'); box.querySelectorAll('.rsign').forEach(el => el.remove()); roomSigns.clear();
    for (const r of office.rooms) {
      const el = document.createElement('div'); el.className = 'rsign' + (r.kind === 'fun' ? ' fun' : '');
      el.onclick = () => focusRoom(r.id);
      box.appendChild(el); roomSigns.set(r.id, { el, r });
    }
    resizeView(); fitCamera(true); camInit = true;
    renderLabels();
  }
  function syncWorldAgents() {
    if (!office) return;
    office.setAgents([...agents.values()].map(a => ({ ...a, room: a.project, status: a.asking ? 'asking' : a.status })));
    office.setSelected(selected);
    const badges = {};
    for (const p of projects) if (p.mr && p.mr.agentId && p.mr.state !== 'closed') badges[p.mr.agentId] = p.mr.state === 'merged' ? 'merged' : (p.mr.ci || 'pending');
    office.setBadges(badges);
  }
  function fitCalc() {
    const b = office.buildingBounds(), w = view.clientWidth || 800, h = view.clientHeight || 500;
    return { b, z: Math.min(w / (b.x1 - b.x0 + 40), (h - 10) / (b.y1 - b.y0 + 40)) };
  }
  function fitCamera(instant) {
    if (!office) return;
    const { b, z } = fitCalc(); fitZ = z;
    const t = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 + 6 / fitZ, z: fitZ };
    if (instant) { Object.assign(cam, t); camTarget = null; } else camTarget = t;
  }
  const clampZ = z => { const cover = office ? Math.max((view.clientWidth || 800) / office.W, (view.clientHeight || 500) / office.H) : 0; return Math.max(fitZ * 0.5, cover, Math.min(fitZ * 5, z)); };
  const toScreen = (x, y) => [(x - cam.x) * cam.z + view.clientWidth / 2, (y - cam.y) * cam.z + view.clientHeight / 2];
  const toWorld = (x, y) => [(x - view.clientWidth / 2) / cam.z + cam.x, (y - view.clientHeight / 2) / cam.z + cam.y];
  function zoomAt(sx, sy, f) { const [wx, wy] = toWorld(sx, sy); const z = clampZ(cam.z * f); cam.x = wx - (sx - view.clientWidth / 2) / z; cam.y = wy - (sy - view.clientHeight / 2) / z; cam.z = z; camTarget = null; }
  function focusRoom(id) {
    const b = office && office.roomBounds(id); if (!b) return;
    camTarget = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, z: clampZ(Math.min(view.clientWidth / (b.x1 - b.x0 + 60), view.clientHeight / (b.y1 - b.y0 + 70))) };
  }
  function centerOnAgent(a) {
    if (!office || cam.z < fitZ * 1.2) return;
    const p = office.labelPoint({ ...a, room: a.project }); if (!p) return;
    const [sx, sy] = toScreen(p.x, p.y);
    if (sx < 60 || sy < 60 || sx > view.clientWidth - 60 || sy > view.clientHeight - 60) camTarget = { x: p.x, y: p.y + 40, z: cam.z };
  }
  function resizeView() {
    dpr = window.devicePixelRatio || 1;
    view.width = Math.max(1, Math.round(view.clientWidth * dpr)); view.height = Math.max(1, Math.round(view.clientHeight * dpr));
    if (!office) return;
    const ratio = cam.z / fitZ;
    fitZ = fitCalc().z;
    if (!camInit || Math.abs(ratio - 1) < 0.02) fitCamera(true); else cam.z = clampZ(fitZ * ratio);
  }
  new ResizeObserver(resizeView).observe($('officeCard'));

  function renderView() {
    if (camTarget) {
      const k = 0.2; cam.x += (camTarget.x - cam.x) * k; cam.y += (camTarget.y - cam.y) * k; cam.z += (camTarget.z - cam.z) * k;
      if (Math.abs(camTarget.z - cam.z) < 0.0005 && Math.abs(camTarget.x - cam.x) < 0.3 && Math.abs(camTarget.y - cam.y) < 0.3) { Object.assign(cam, camTarget); camTarget = null; }
    }
    vctx.setTransform(1, 0, 0, 1, 0, 0); vctx.clearRect(0, 0, view.width, view.height);
    vctx.imageSmoothingEnabled = cam.z * dpr < 1;
    const [sx, sy] = toScreen(0, 0);
    vctx.drawImage(src, sx * dpr, sy * dpr, office.W * cam.z * dpr, office.H * cam.z * dpr);
    positionLabels();
  }

  // pan / zoom / click
  let drag = null;
  view.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; view.setPointerCapture(e.pointerId); });
  view.addEventListener('pointermove', e => {
    if (drag) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) { drag.moved = true; view.classList.add('drag'); camTarget = null; }
      if (drag.moved) { cam.x = drag.cx - (e.clientX - drag.x) / cam.z; cam.y = drag.cy - (e.clientY - drag.y) / cam.z; }
      return;
    }
    const r = view.getBoundingClientRect(); const h = office && office.hitTest(...toWorld(e.clientX - r.left, e.clientY - r.top));
    view.style.cursor = h && h.agentId ? 'pointer' : 'grab';
  });
  view.addEventListener('pointerup', e => {
    const wasDrag = drag && drag.moved; drag = null; view.classList.remove('drag');
    if (wasDrag || !office) return;
    const r = view.getBoundingClientRect(); const h = office.hitTest(...toWorld(e.clientX - r.left, e.clientY - r.top));
    if (h && h.agentId) select(h.agentId);
  });
  view.addEventListener('dblclick', e => {
    const r = view.getBoundingClientRect(); const h = office && office.hitTest(...toWorld(e.clientX - r.left, e.clientY - r.top));
    if (h && h.room) { const room = office.rooms.find(x => x.id === h.room); if (room && cam.z > fitZ * 1.6 && room.kind === 'proj') openHire(room.id); else focusRoom(h.room); }
    else if (!h) fitCamera(false);
  });
  view.addEventListener('wheel', e => { e.preventDefault(); const r = view.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))); }, { passive: false });

  const labelEls = new Map(); let labelKey = '';
  function renderLabels() {
    const key = [...agents.values()].map(a => a.id + a.name + a.role + a.desk + (a.id === selected)).join('|');
    if (key === labelKey) { syncWorldAgents(); return; }
    labelKey = key;
    const box = $('labels'); labelEls.forEach(el => el.remove()); labelEls.clear();
    for (const a of agents.values()) {
      const el = document.createElement('div');
      el.className = 'olabel' + (a.id === selected ? ' sel' : '');
      el.innerHTML = `<div class="t"><img class="role-ico" src="${avatarFor(a)}" alt="">${esc(a.name)}</div><div class="s"><i class="dot ${a.status}"></i><span></span></div><div class="ask"></div>`;
      el.onclick = (e) => { if (!e.target.closest('[data-decide]')) select(a.id); };
      box.appendChild(el); labelEls.set(a.id, el);
    }
    syncWorldAgents();
  }
  function positionLabels() {
    if (!office) return;
    const zoomed = cam.z > fitZ * 1.35;
    for (const [id, el] of labelEls) {
      const a = agents.get(id); if (!a) continue;
      const p = office.labelPoint({ ...a, room: a.project });
      const show = p && (zoomed || id === selected || !!a.asking);
      el.style.display = show ? '' : 'none'; if (!show) continue;
      const [x, y] = toScreen(p.x, p.y);
      el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px';
      const txt = a.asking ? 'Needs your OK' : shortStatus(a), span = el.querySelector('.s span');
      if (span.textContent !== txt) span.textContent = txt;
      const dot = el.querySelector('.s .dot'), st = a.asking ? 'asking' : a.status;
      if (dot.className !== 'dot ' + st) dot.className = 'dot ' + st;
      const askId = a.asking ? a.asking.id : '';
      if (el._ask !== askId) {
        el._ask = askId; el.classList.toggle('asking', !!askId);
        el.querySelector('.ask').innerHTML = askId ? `<code>${esc(a.asking.summary.slice(0, 160))}</code>${askButtons(askId, true)}` : '';
      }
    }
    for (const { el, r } of roomSigns.values()) {
      el.style.display = zoomed ? 'none' : '';
      if (zoomed) continue;
      const p = office.roomLabelPoint(r.id); const [x, y] = toScreen(p.x, p.y);
      el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px';
      let html;
      if (r.kind === 'proj') {
        const mine = [...agents.values()].filter(a => a.project === r.id), w = mine.filter(a => a.status === 'working').length;
        html = `<span class="dot ${w ? 'on' : ''}"></span>${esc(r.name)}<small>${mine.length ? mine.length + ' agent' + (mine.length > 1 ? 's' : '') : 'empty'}${w ? ' · ' + w + ' working' : ''}</small>`;
      } else html = `${esc(r.name)}`;
      if (el._h !== html) { el.innerHTML = html; el._h = html; }
    }
  }
  function shortStatus(a) { const s = activityText(a); return s.length > 30 ? s.slice(0, 29) + '…' : s; }

  // ---------- sidebar ----------
  function renderAgentList() {
    const list = $('agentList');
    $('agentCount').textContent = `${agents.size}/${cfg.maxAgents || 8}`;
    if (!agents.size) { list.innerHTML = '<div class="empty-agents">No agents yet. Click + to add your first one.</div>'; return; }
    list.innerHTML = '';
    [...agents.values()].sort((x, y) => x.desk - y.desk).forEach(a => {
      const row = document.createElement('div');
      row.className = 'agent-row' + (a.id === selected ? ' sel' : '');
      row.innerHTML = `<div class="av-wrap"><img class="avatar" src="${avatarFor(a)}" alt=""><i class="dot ${a.asking ? 'asking' : a.status}"></i></div>
        <div><div class="nm">${esc(a.name)}</div><div class="act">${esc(activityText(a))}</div><div class="ago">${esc(ago(a.lastAt))}</div></div>`;
      row.onclick = () => select(a.id);
      list.appendChild(row);
    });
  }
  function renderSys() {
    const working = [...agents.values()].filter(a => a.status === 'working').length;
    const errors = [...agents.values()].filter(a => a.status === 'error').length;
    $('sysCard').classList.toggle('off', !connected);
    $('connDot').classList.toggle('on', connected);
    const asking = [...agents.values()].filter(a => a.asking).length;
    $('sysTitle').textContent = !connected ? 'Bridge offline' : asking ? `${asking} request${asking > 1 ? 's' : ''} waiting for your OK` : errors ? `${errors} agent${errors > 1 ? 's' : ''} need attention` : 'All systems running';
    $('sysSub').textContent = !connected ? 'Is server.js still running?' : working ? `${working} agent${working > 1 ? 's' : ''} working` : 'Your AI office is ready!';
    $('sysPill').textContent = connected ? 'Online' : 'Offline';
  }
  function renderAll() { renderAgentList(); renderLabels(); renderSys(); renderHeader(); }
  setInterval(() => { renderAgentList(); }, 2500);

  document.querySelectorAll('.nav li').forEach(li => li.onclick = () => {
    const n = li.dataset.nav;
    if (n === 'agents') return openHire();
    if (n === 'projects') return openProjects();
    if (n === 'settings') return openSettings();
    document.querySelectorAll('.nav li').forEach(x => x.classList.toggle('active', x === li));
    if (n === 'terminal' && !viewState.term) { viewState.term = true; applyView(); }
    const target = n === 'terminal' ? $('termPanel') : $('officeCard');
    target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash');
  });

  // ---------- selection / chat ----------
  async function select(id) {
    if (selected !== id) { openFile = null; expanded = new Set(); }
    selected = id;
    renderAll();
    const sa = agents.get(id); if (sa) centerOnAgent(sa);
    try { const full = await api('/api/agents/' + id); logs.set(id, full.log); } catch (e) { toast(e.message); }
    renderTab(); renderTerm(); loadTree(); loadProject();
    if (!openFile) renderCode();
    $('msg').focus();
  }
  function cur() { return agents.get(selected); }
  function renderHeader() {
    const a = cur();
    $('chatName').textContent = a ? a.name : 'No agent selected';
    $('chatAvatar').src = a ? avatarFor(a) : '';
    $('chatAvatar').style.visibility = a ? 'visible' : 'hidden';
    $('chatDot').className = 'dot ' + (a ? (a.status === 'idle' ? 'on' : a.status) : '');
    $('chatStatus').textContent = a ? (a.status === 'idle' ? 'Online' : STATUS_TEXT[a.status]) : 'Add an agent to start';
    $('chatStop').style.visibility = a && a.status === 'working' ? 'visible' : 'hidden';
    $('termStop').style.visibility = a && a.status === 'working' ? 'visible' : 'hidden';
    $('sendBtn').disabled = !a || a.status === 'working';
    $('msg').disabled = !a;
    $('msg').placeholder = !a ? 'Add an agent first' : a.status === 'working' ? `${a.name} is working…` : 'Type a message…';
    $('termTitle').textContent = a ? `${a.folder} · ${a.name}` : 'activity';
    ['qaReveal', 'qaReadme'].forEach(id => $(id).disabled = !a);
  }

  document.querySelectorAll('.tab').forEach(b => b.onclick = () => { tab = b.dataset.tab; document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === b)); renderTab(); });
  function renderTab() {
    $('tabChat').classList.toggle('hidden', tab !== 'chat');
    $('tabFiles').classList.toggle('hidden', tab !== 'files');
    $('tabContext').classList.toggle('hidden', tab !== 'context');
    if (tab === 'chat') renderChat(); else if (tab === 'files') renderFiles(); else renderContext();
  }

  function md(text) {
    const parts = String(text).split(/```(?:[\w+-]*)\n?/);
    return parts.map((p, i) => i % 2 ? `<pre>${esc(p.replace(/\n$/, ''))}</pre>`
      : esc(p).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')).join('');
  }
  function renderChat() {
    const box = $('tabChat'); const a = cur();
    if (!a) { box.innerHTML = '<div class="chat-empty">Click <b>+</b> next to Agents to add an agent, then give it a task here.</div>'; return; }
    const entries = logs.get(a.id) || [];
    let html = '', group = null;
    const flush = () => {
      if (!group) return;
      html += `<div class="m"><img class="ico" src="${avatarFor(a)}" alt=""><div class="body"><div class="who">${esc(a.name)}<span class="time">${hhmm(group.t)}</span></div>`;
      for (const it of group.items) {
        if (it.kind === 'assistant') html += `<div class="txt">${md(it.text)}</div>`;
        else html += `<ul class="checks">${it.list.map(c => `<li class="${c.cls}">${icon(c.cls === 'denied' ? 'warn' : c.cls === 'running' ? 'spinner' : 'check')}<span>${esc(c.text)}</span></li>`).join('')}</ul>`;
      }
      html += '</div></div>'; group = null;
    };
    const visible = entries.filter(e => e.kind !== 'output');
    visible.forEach((e, idx) => {
      if (e.kind === 'user') {
        flush();
        const fromA = e.from && [...agents.values()].find(x => e.from.startsWith(x.name));
        const ico = fromA ? `<img class="ico" src="${avatarFor(fromA)}" alt="">` : e.from ? `<div class="ico you">${icon('team')}</div>` : `<div class="ico you">${icon('user')}</div>`;
        html += `<div class="m">${ico}<div class="body"><div class="who">${e.from ? `<span>${esc(e.from)} <span class="from">handed over</span></span>` : 'You'}<span class="time">${hhmm(e.t)}</span></div><div class="txt">${md(e.text)}</div></div></div>`; return;
      }
      if (e.kind === 'ask') {
        flush();
        const pending = a.asking && a.asking.id === e.approvalId;
        const ans = visible.slice(idx + 1).find(x => x.kind === 'approved' || x.kind === 'rejected');
        html += `<div class="m"><img class="ico" src="${avatarFor(a)}" alt=""><div class="body"><div class="askcard"><div class="q">${esc(a.name)} wants to ${e.tool === 'Bash' ? 'run' : 'use ' + esc(e.tool) + ' on'}:</div><code>${esc(e.text)}</code>${pending ? askButtons(e.approvalId, false) : `<div class="q" style="margin:6px 0 0">${ans ? esc(ans.text.split(':')[0]) : 'No longer waiting'}</div>`}</div></div></div>`;
        return;
      }
      if (e.kind === 'approved' || e.kind === 'rejected') return;
      if (e.kind === 'system') { flush(); html += `<div class="note">${esc(e.text)}</div>`; return; }
      if (e.kind === 'error') { flush(); html += `<div class="errbox">${esc(e.text)}</div>`; return; }
      if (e.kind === 'tool' && visible[idx + 1] && visible[idx + 1].kind === 'ask') return; // shown as the approval card instead
      if (!group) group = { t: e.t, items: [] };
      if (e.kind === 'assistant') group.items.push({ kind: 'assistant', text: e.text });
      else {
        let last = group.items[group.items.length - 1];
        if (!last || last.kind !== 'checks') { last = { kind: 'checks', list: [] }; group.items.push(last); }
        if (e.kind === 'denied' && last.list.length && last.list[last.list.length - 1].cls === 'rejected') return;
        if (e.kind === 'denied') { const prev = last.list[last.list.length - 1]; if (prev) { prev.cls = 'denied'; prev.text += ' — not allowed'; } else last.list.push({ cls: 'denied', text: 'Blocked: ' + e.text.slice(0, 120) }); }
        else last.list.push({ cls: (a.status === 'working' && idx === visible.length - 1) ? 'running' : '', text: friendlyTool(e) });
      }
    });
    flush();
    if (a.status === 'working' && !a.asking) html += `<div class="working-line">${icon('spinner')}Working on the next steps…</div>`;
    if (!entries.some(e => e.kind === 'user')) html += `<div class="chat-empty">Say hello to ${esc(a.name)} — try “Look around this project and tell me what it is.”</div>`;
    box.innerHTML = html; box.scrollTop = box.scrollHeight;
  }
  function friendlyTool(e) {
    const m = e.text.match(/^(\w+): (.*)$/); if (!m) return e.text;
    const [, t, arg] = m; const short = arg.replace(/^.*\/(?=[^/]+\/[^/]+$)/, '');
    return ({ Read: 'Read ', Edit: 'Edited ', MultiEdit: 'Edited ', Write: 'Created ', Bash: 'Ran ', Glob: 'Searched files ', Grep: 'Searched for ', WebFetch: 'Fetched ', WebSearch: 'Searched the web for ', TodoWrite: 'Updated plan', Task: 'Delegated: ' }[t] ?? (t + ': ')) + (t === 'TodoWrite' ? '' : short);
  }
  function relPath(a, p) { const root = (a.projectPath || '') + '/'; return p.startsWith(root) ? p.slice(root.length) : p; }
  function renderFiles() {
    const box = $('tabFiles'); const a = cur();
    if (!a) { box.innerHTML = ''; return; }
    const map = new Map();
    for (const e of logs.get(a.id) || []) if (e.kind === 'tool' && e.file) {
      const p = relPath(a, e.file); const k = map.get(p) || { r: 0, w: 0 };
      if (/^(Write)$/.test(e.tool)) k.w++; else if (/Edit/.test(e.tool)) k.e = (k.e || 0) + 1; else k.r++;
      map.set(p, k);
    }
    if (!map.size) { box.innerHTML = '<div class="chat-empty">Files this agent reads or changes will appear here.</div>'; return; }
    box.innerHTML = '<ul class="flist">' + [...map].reverse().map(([p, k]) => `<li data-p="${esc(p)}">${k.w ? '<span class="badge w">created</span>' : k.e ? '<span class="badge e">edited</span>' : '<span class="badge">read</span>'}${esc(p)}</li>`).join('') + '</ul>';
    box.querySelectorAll('li').forEach(li => li.onclick = () => openPath(li.dataset.p));
  }
  function renderContext() {
    const box = $('tabContext'); const a = cur();
    if (!a) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="ctx">
      <div class="kv"><span>Role</span><span>${esc((cfg.roles || {})[a.role] || a.role)}</span></div>
      <label>Project</label>
      <div class="row-inline"><select id="cProject">${projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><button class="btn" id="cManage">Projects…</button></div>
      <div class="kv"><span>Folder</span><code>${esc(a.projectPath)}</code></div>
      <div class="kv"><span>Session</span><code>${a.sessionId ? esc(a.sessionId.slice(0, 18)) + '…' : 'new'}</code></div>
      <div class="kv"><span>Usage (approx.)</span><span>$${(a.cost || 0).toFixed(3)}</span></div>
      <label>Permissions</label>
      <select id="cMode"><option value="plan">Plan — read and propose only</option><option value="acceptEdits">Edit — may create and edit files</option></select>
      <label>Allowed commands</label>
      <input id="cAllowed" placeholder="npm test, git status" value="${esc((a.allowed || []).join(', '))}">
      <div class="row"><button class="btn" id="cSave">Save</button><button class="btn" id="cNew">New conversation</button><span class="spacer"></span><button class="btn danger" id="cFire">Remove agent</button></div>
    </div>`;
    $('cMode').value = a.mode;
    $('cProject').value = a.project;
    $('cProject').onchange = e => api(`/api/agents/${a.id}/settings`, { method: 'POST', body: JSON.stringify({ project: e.target.value }) })
      .then(() => { toast(`${a.name} moved to ${projects.find(p => p.id === e.target.value).name}`); })
      .catch(err => { toast(err.message); e.target.value = a.project; });
    $('cManage').onclick = openProjects;
    $('cMode').onchange = e => api(`/api/agents/${a.id}/settings`, { method: 'POST', body: JSON.stringify({ mode: e.target.value }) }).then(() => toast('Permissions updated')).catch(err => toast(err.message));
    $('cSave').onclick = () => api(`/api/agents/${a.id}/settings`, { method: 'POST', body: JSON.stringify({ allowed: $('cAllowed').value }) }).then(() => toast('Allowed commands saved')).catch(err => toast(err.message));
    $('cNew').onclick = () => api(`/api/agents/${a.id}/settings`, { method: 'POST', body: JSON.stringify({ newSession: true }) }).then(() => toast('Started a new conversation'));
    $('cFire').onclick = async () => { if (!confirm(`Remove ${a.name}? The project folder stays on disk.`)) return; await api('/api/agents/' + a.id, { method: 'DELETE' }); };
  }

  $('composer').addEventListener('submit', async e => {
    e.preventDefault();
    const text = $('msg').value.trim(); if (!text || !selected) return;
    try { await api(`/api/agents/${selected}/message`, { method: 'POST', body: JSON.stringify({ text }) }); $('msg').value = ''; autosize(); }
    catch (err) { toast(err.message); }
  });
  const autosize = () => { const t = $('msg'); t.style.height = 'auto'; t.style.height = Math.min(140, t.scrollHeight) + 'px'; };
  $('msg').addEventListener('input', autosize);
  $('msg').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('composer').requestSubmit(); } });
  const stop = () => selected && api(`/api/agents/${selected}/stop`, { method: 'POST' });
  $('chatStop').onclick = stop; $('termStop').onclick = stop;

  // ---------- terminal ----------
  function termLine(e, a) {
    const lim = (s, n) => { const lines = s.split('\n'); return lines.length > n ? lines.slice(0, n).join('\n') + `\n… ${lines.length - n} more lines` : s; };
    switch (e.kind) {
      case 'user': return `<div class="l prompt">➜ <b>${esc(a.folder)}</b> ${esc(e.text)}</div>`;
      case 'tool': return `<div class="l tool">${esc(e.text)}</div>`;
      case 'output': return `<div class="l out">${esc(lim(e.text, 14))}</div>`;
      case 'denied': return `<div class="l warn">✗ ${esc(e.text)}</div>`;
      case 'error': return `<div class="l bad">✗ ${esc(e.text)}</div>`;
      case 'system': return `<div class="l ok">✓ ${esc(e.text)}</div>`;
      case 'ask': return `<div class="l ask">Waiting for your OK: ${esc(e.text)}</div>`;
      case 'approved': return `<div class="l ok">✓ ${esc(e.text)}</div>`;
      case 'rejected': return `<div class="l warn">✗ ${esc(e.text)}</div>`;
      case 'assistant': return `<div class="l assistant">${esc(e.text.split('\n')[0].slice(0, 160))}</div>`;
    }
    return '';
  }
  function renderTerm() {
    const box = $('term'); const a = cur();
    if (!a) { box.innerHTML = '<div class="l out">Agent activity — commands, tool calls and output — streams here.</div>'; return; }
    const from = termCleared.get(a.id) || 0;
    const entries = (logs.get(a.id) || []).filter(e => e.t >= from);
    box.innerHTML = entries.map(e => termLine(e, a)).join('') + (a.status === 'working' ? '<div class="l"><span class="cursor"></span></div>' : '');
    box.scrollTop = box.scrollHeight;
  }
  $('termClear').onclick = () => { if (selected) { termCleared.set(selected, Date.now()); renderTerm(); } };

  // ---------- editor ----------
  async function loadTree() {
    const a = cur(); if (!a) { $('tree').innerHTML = ''; return; }
    try {
      const r = await api(`/api/agents/${a.id}/tree`);
      if (a.id !== selected) return;
      const t = $('tree');
      const rootOpen = !expanded.has('!root');
      let html = `<div class="node" data-root="1"><span class="chev">${rootOpen ? '▾' : '▸'}</span><b>${esc(r.root)}</b></div>`;
      const walk = (nodes, depth) => nodes.forEach(n => {
        const pad = `style="padding-left:${8 + depth * 12}px"`;
        if (n.dir) { const open = expanded.has(n.path); html += `<div class="node" ${pad} data-dir="${esc(n.path)}"><span class="chev">${open ? '▾' : '▸'}</span>${esc(n.name)}</div>`; if (open) walk(n.children, depth + 1); }
        else html += `<div class="node${openFile === n.path ? ' open-file' : ''}" ${pad} data-file="${esc(n.path)}"><span class="fi">▫</span>${esc(n.name)}</div>`;
      });
      if (rootOpen) { if (r.tree.length) walk(r.tree, 1); else html += '<div class="empty">Empty folder. Ask an agent to create something.</div>'; }
      t.innerHTML = html;
      t.querySelectorAll('[data-dir]').forEach(el => el.onclick = () => { const p = el.dataset.dir; expanded.has(p) ? expanded.delete(p) : expanded.add(p); loadTree(); });
      t.querySelectorAll('[data-file]').forEach(el => el.onclick = () => openPath(el.dataset.file));
      t.querySelector('[data-root]').onclick = () => { expanded.has('!root') ? expanded.delete('!root') : expanded.add('!root'); loadTree(); };
    } catch (e) { $('tree').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }
  $('treeRefresh').onclick = () => { loadTree(); if (openFile) openPath(openFile); };
  let treeTimer = null; const refreshTreeSoon = () => { clearTimeout(treeTimer); treeTimer = setTimeout(() => { loadTree(); if (openFile) openPath(openFile, true); loadProject(); }, 800); };

  async function openPath(p, quiet) {
    const a = cur(); if (!a) return;
    try {
      const r = await api(`/api/agents/${a.id}/file?path=${encodeURIComponent(p)}`);
      openFile = r.path;
      p.split('/').slice(0, -1).reduce((acc, seg) => { const q = acc ? acc + '/' + seg : seg; expanded.add(q); return q; }, '');
      renderCode(r);
      if (!quiet) loadTree();
    } catch (e) { if (!quiet) toast(e.message); }
  }
  function renderCode(file) {
    if (!file) { $('codeTabs').innerHTML = ''; $('code').innerHTML = '<div class="empty-code">Select a file to view it.</div>'; return; }
    const name = file.path.split('/').pop();
    $('codeTabs').innerHTML = `<div class="code-tab" title="${esc(file.path)}">${esc(name)}<button id="closeTab">${icon('x')}</button></div>`;
    $('closeTab').querySelector('svg').style.cssText = 'width:13px;height:13px';
    $('closeTab').onclick = () => { openFile = null; renderCode(); loadTree(); };
    const lines = file.content.split('\n');
    const ext = name.split('.').pop().toLowerCase();
    $('code').innerHTML = '<table>' + lines.map((l, i) => `<tr><td class="ln">${i + 1}</td><td class="src">${highlight(l, ext) || ' '}</td></tr>`).join('') + '</table>';
  }
  const KW = new Set('import export from default function return const let var if else for while do switch case break continue new class extends super this async await try catch finally throw typeof instanceof in of yield interface type enum implements public private protected static readonly namespace use echo fn def elif lambda pass None True False null true false undefined void package func go defer struct impl pub mod match where self Self'.split(' '));
  function highlight(line, ext) {
    if (['md', 'txt', 'json', 'lock', 'env', 'gitignore'].includes(ext)) {
      if (ext === 'json') return esc(line).replace(/(&quot;[^&]*?&quot;)(\s*:)?/g, (m, s, c) => c ? `<span class="tk-f">${s}</span>${c}` : `<span class="tk-s">${s}</span>`);
      return esc(line);
    }
    const re = /(\/\/.*$|#(?![\[!]).*$|\/\*.*?\*\/|--.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;
    const isHashComment = ['py', 'sh', 'rb', 'yml', 'yaml', 'toml', 'php', 'zsh', 'bash', 'conf'].includes(ext);
    const isDashComment = ['sql', 'lua'].includes(ext);
    let out = '', last = 0, m;
    while ((m = re.exec(line))) {
      out += esc(line.slice(last, m.index));
      const [tok, com, str, num, fn, word] = m;
      if (com) {
        if ((com.startsWith('#') && !isHashComment) || (com.startsWith('--') && !isDashComment)) { out += esc(com[0]); re.lastIndex = m.index + 1; last = re.lastIndex; continue; }
        out += `<span class="tk-c">${esc(com)}</span>`;
      } else if (str) out += `<span class="tk-s">${esc(str)}</span>`;
      else if (num) out += `<span class="tk-n">${num}</span>`;
      else if (fn) out += KW.has(fn) ? `<span class="tk-k">${fn}</span>` : `<span class="tk-f">${esc(fn)}</span>`;
      else if (word) out += KW.has(word) ? `<span class="tk-k">${word}</span>` : /^[A-Z]/.test(word) ? `<span class="tk-t">${esc(word)}</span>` : esc(word);
      last = m.index + tok.length;
    }
    return out + esc(line.slice(last));
  }

  // ---------- project ----------
  let project = null;
  async function loadProject() {
    const a = cur();
    if (!a) { $('projName').textContent = '—'; $('projStack').innerHTML = ''; $('projDesc').textContent = 'Select an agent to see its project.'; return; }
    try {
      project = await api(`/api/agents/${a.id}/project`);
      $('projName').textContent = project.name;
      $('projStack').innerHTML = (project.stack.length ? `<span class="chip">${esc(project.stack.join(' + '))}</span>` : '<span class="muted">No stack detected yet</span>') + (project.branch ? ` <span class="branch">⎇ ${esc(project.branch)}</span>` : '');
      $('projDesc').textContent = project.description || (project.empty ? 'Empty project folder — ask an agent to start building.' : `Shared by agents working in “${a.folder}”.`);
      $('qaReadme').disabled = !project.readme;
    } catch (e) { $('projDesc').textContent = e.message; }
    renderPipeline(); loadGit();
  }
  $('qaSwitch').onclick = () => openProjects();
  $('qaReveal').onclick = () => selected && api(`/api/agents/${selected}/reveal`, { method: 'POST' }).catch(e => toast(e.message));
  $('qaReadme').onclick = () => project && project.readme && openPath(project.readme);
  $('qaStopAll').onclick = () => api('/api/stop-all', { method: 'POST' }).then(() => toast('Stopping all running agents'));

  // ---------- approvals ----------
  function askButtons(id, compact) {
    return `<div class="ask-btns"><button type="button" class="yes" data-decide="allow" data-id="${id}">✅ Allow</button><button type="button" class="no" data-decide="deny" data-id="${id}">❌ Deny</button>${compact ? '' : `<button type="button" data-decide="always" data-id="${id}" title="Allow now and add it to this agent's allowed commands">Always allow</button>`}</div>`;
  }
  async function decide(id, decision) {
    try { await api(`/api/approvals/${id}`, { method: 'POST', body: JSON.stringify({ decision }) }); }
    catch (e) { toast(e.message); }
  }
  for (const box of [$('labels'), $('tabChat')]) box.addEventListener('click', e => {
    const b = e.target.closest('[data-decide]'); if (!b) return;
    e.stopPropagation(); b.disabled = true; decide(b.dataset.id, b.dataset.decide);
  });
  function updateTitle() {
    const n = [...agents.values()].filter(a => a.asking).length;
    document.title = n ? `(${n}) AI Office — needs your OK` : 'AI Office';
  }

  // ---------- team pipelines ----------
  const pipelinesByProject = new Map();
  function curProjectId() { const a = cur(); return a ? a.project : (projects[0] && projects[0].id); }
  function renderPipeline() {
    const pid = curProjectId(), pl = pid && pipelinesByProject.get(pid), box = $('plBox');
    const running = pl && pl.status === 'running';
    $('plRun').textContent = running ? 'Stop' : 'Run';
    $('plRun').classList.toggle('primary', !running);
    if (!pl) { box.className = 'pl-box muted'; box.textContent = 'Architect plans → Developer builds → Tester checks.'; return; }
    box.className = 'pl-box';
    const steps = pl.steps.map(st => `<span class="pl-step ${st.status}" title="${esc(st.name)}">${esc(st.role)} · ${esc(st.name)}</span>`).join('<span class="pl-arrow">→</span>');
    const verdict = pl.status === 'running' ? '' : `<div class="pl-verdict ${pl.status === 'passed' ? 'pass' : 'fail'}">${pl.status === 'passed' ? '✅ Passed' : pl.status === 'stopped' ? '⏹ Stopped' : '❌ ' + esc(pl.verdict || 'Failed')}</div>`;
    box.innerHTML = `<div class="pl-goal" title="${esc(pl.goal)}">“${esc(pl.goal)}”</div><div class="pl-steps">${steps || '<span class="muted">Starting…</span>'}</div>${verdict}`;
  }
  $('plRun').onclick = async () => {
    const pid = curProjectId(), pl = pid && pipelinesByProject.get(pid);
    if (pl && pl.status === 'running') { if (confirm('Stop the team pipeline?')) api(`/api/pipelines/${pl.id}/stop`, { method: 'POST' }); return; }
    if (!pid) return toast('Add agents to a project first.');
    const team = [...agents.values()].filter(a => a.project === pid);
    const who = r => (team.find(a => a.role === r) || {}).name;
    const dev = who('developer') || who('custom');
    $('plTeam').innerHTML = `In <b>${esc((projects.find(p => p.id === pid) || {}).name || '')}</b>: ` + [
      who('architect') ? `📐 ${esc(who('architect'))} plans` : '<span class="muted">no Architect (skips planning)</span>',
      dev ? `🛠 ${esc(dev)} builds` : '<span style="color:var(--red)">needs a Developer</span>',
      who('tester') ? `🧪 ${esc(who('tester'))} tests` : '<span class="muted">no Tester (skips testing)</span>'].join(' → ');
    $('plErr').textContent = ''; $('plDlg').showModal(); $('plGoal').focus();
  };
  $('plStart').addEventListener('click', async e => {
    e.preventDefault(); if (!$('plForm').reportValidity()) return;
    try {
      const pl = await api(`/api/projects/${curProjectId()}/pipeline`, { method: 'POST', body: JSON.stringify({ goal: $('plGoal').value, maxRounds: +$('plRounds').value }) });
      pipelinesByProject.set(pl.projectId, pl); renderPipeline(); $('plDlg').close(); $('plGoal').value = '';
      toast('Team pipeline started');
    } catch (err) { $('plErr').textContent = err.message; }
  });

  // ---------- git / GitLab ----------
  let gitInfo = null;
  async function loadGit() {
    const pid = curProjectId(); if (!pid) { $('gitLine').textContent = 'Git'; $('mrBox').innerHTML = ''; return; }
    try { gitInfo = await api(`/api/projects/${pid}/git`); } catch { gitInfo = null; }
    renderGit();
  }
  function renderGit() {
    const g = gitInfo;
    if (!g || !g.isRepo) { $('gitLine').textContent = 'Not a git repository'; $('mrBox').innerHTML = ''; $('mrOpen').disabled = true; return; }
    $('gitLine').innerHTML = `⎇ ${esc(g.branch || '?')}<span class="muted" style="font-weight:400"> · ${g.changes ? g.changes + ' changed file' + (g.changes > 1 ? 's' : '') : 'no changes'}</span>`;
    const mr = g.mr;
    $('mrBox').innerHTML = mr ? `<a href="${esc(mr.url)}" target="_blank" rel="noopener">!${mr.iid} ${esc(mr.title)}</a><span class="ci ${esc(mr.state === 'merged' ? 'merged' : mr.ci || 'pending')}"><i></i>${esc(mr.state === 'merged' ? 'merged' : 'CI ' + (mr.ci || 'pending'))}</span>`
      : (g.gitlab && g.gitlab.hasToken ? '<span class="muted">No merge request yet.</span>' : '<span class="muted">Connect GitLab with the ⚙ button to open merge requests.</span>');
    $('mrOpen').disabled = !g.remote;
  }
  $('glSettings').onclick = () => {
    const g = (gitInfo && gitInfo.gitlab) || {};
    $('glUrl').value = g.url || ''; $('glPath').value = g.path || ''; $('glTarget').value = g.target || ''; $('glAuto').checked = !!g.autoMR;
    $('glToken').value = ''; $('glTokState').textContent = g.hasToken ? '(saved — leave empty to keep it)' : '';
    $('glErr').textContent = ''; $('glDlg').showModal();
  };
  $('glSave').addEventListener('click', async e => {
    e.preventDefault();
    try {
      gitInfo = await api(`/api/projects/${curProjectId()}/gitlab`, { method: 'POST', body: JSON.stringify({ url: $('glUrl').value, path: $('glPath').value, target: $('glTarget').value, autoMR: $('glAuto').checked, token: $('glToken').value || undefined }) });
      $('glToken').value = ''; renderGit(); $('glDlg').close(); toast('GitLab settings saved');
    } catch (err) { $('glErr').textContent = err.message; }
  });
  $('mrOpen').onclick = async () => {
    await loadGit(); const g = gitInfo; if (!g) return;
    if (!g.gitlab || !g.gitlab.hasToken) { $('glSettings').click(); return; }
    const pid = curProjectId(), pl = pipelinesByProject.get(pid);
    const a = cur();
    const lastPrompt = a && (logs.get(a.id) || []).filter(e => e.kind === 'user' && !e.from).slice(-1)[0];
    $('mrTitle').value = (pl && pl.goal) || (lastPrompt && lastPrompt.text.split('\n')[0].slice(0, 120)) || '';
    $('mrDesc').value = pl && pl.verdict ? `Goal: ${pl.goal}\n\n${pl.verdict}` : '';
    const newBranch = !g.branch || g.branch === (g.gitlab.target || 'main') || g.branch === 'master';
    $('mrInfo').innerHTML = `${newBranch ? 'Creates a new branch from' : 'Pushes branch'} <b>${esc(g.branch || '')}</b> → <b>${esc(g.gitlab.target || 'default branch')}</b> on <code>${esc(g.gitlab.path)}</code>`;
    $('mrFiles').textContent = g.changes ? `Commits ${g.changes} changed file${g.changes > 1 ? 's' : ''}: ${g.files.slice(0, 6).join(', ')}${g.files.length > 6 ? '…' : ''}` : 'No uncommitted changes — pushes existing commits.';
    $('mrErr').textContent = ''; $('mrDlg').showModal();
  };
  $('mrGo').addEventListener('click', async e => {
    e.preventDefault(); if (!$('mrForm').reportValidity()) return;
    const btn = $('mrGo'); btn.disabled = true; btn.textContent = 'Pushing…';
    try {
      const a = cur();
      const mr = await api(`/api/projects/${curProjectId()}/merge-request`, { method: 'POST', body: JSON.stringify({ title: $('mrTitle').value, description: $('mrDesc').value, agentId: a && a.id }) });
      $('mrDlg').close(); toast(`Opened merge request !${mr.iid}`); loadGit();
    } catch (err) { $('mrErr').textContent = err.message; }
    finally { btn.disabled = false; btn.textContent = 'Commit, push & open MR'; }
  });

  // ---------- theme ----------
  const THEME_KEY = 'aioffice.theme';
  let theme = { ui: 'dark', sky: 'theme' };
  try { Object.assign(theme, JSON.parse(localStorage.getItem(THEME_KEY) || '{}')); } catch { /* ignore */ }
  const isNight = () => theme.sky === 'night' || (theme.sky === 'theme' && theme.ui !== 'light') || (theme.sky === 'auto' && (() => { const h = new Date().getHours(); return h >= 19 || h < 7; })());
  function applyTheme() {
    document.body.classList.toggle('light', theme.ui === 'light');
    $('themeTop').innerHTML = icon(theme.ui === 'light' ? 'moon' : 'sun');
    $('themeTop').title = theme.ui === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
    $('setTheme').value = theme.ui; $('setSky').value = theme.sky;
    if (office) office.setNight(isNight());
    try { localStorage.setItem(THEME_KEY, JSON.stringify(theme)); } catch { /* ignore */ }
  }
  $('themeTop').onclick = () => { theme.ui = theme.ui === 'light' ? 'dark' : 'light'; applyTheme(); };
  $('setTheme').onchange = e => { theme.ui = e.target.value; applyTheme(); };
  $('setSky').onchange = e => { theme.sky = e.target.value; applyTheme(); };
  setInterval(() => { if (office && theme.sky === 'auto') office.setNight(isNight()); }, 60000);

  // ---------- hire ----------
  let hireRole = 'developer';
  function openHire(projectId) {
    $('hErr').textContent = '';
    const roles = cfg.roles || { architect: 'Architect', developer: 'Developer', tester: 'Tester', researcher: 'Researcher', custom: 'Agent' };
    const taken = new Set([...agents.values()].map(a => a.role));
    hireRole = Object.keys(roles).find(r => r !== 'custom' && !taken.has(r)) || 'custom';
    const freeDesk = (() => { const used = new Set([...agents.values()].map(a => a.desk)); let d = 0; while (used.has(d)) d++; return d; })();
    $('roleGrid').innerHTML = Object.entries(roles).map(([k, v]) => `<button type="button" class="role${k === hireRole ? ' sel' : ''}" data-r="${k}"><img src="${Office.avatar({ role: k, desk: freeDesk }, 3)}" alt="">${esc(k === 'custom' ? 'Custom' : v)}</button>`).join('');
    $('roleGrid').querySelectorAll('.role').forEach(b => b.onclick = () => {
      hireRole = b.dataset.r; $('roleGrid').querySelectorAll('.role').forEach(x => x.classList.toggle('sel', x === b));
      if (!$('hName').dataset.touched) $('hName').value = roles[hireRole] === 'Agent' ? '' : roles[hireRole];
      $('hMode').value = hireRole === 'developer' ? 'acceptEdits' : 'plan';
      $('hAllowed').value = hireRole === 'tester' ? 'npm test' : '';
    });
    $('hName').value = roles[hireRole] === 'Agent' ? '' : roles[hireRole]; delete $('hName').dataset.touched;
    $('hMode').value = hireRole === 'developer' ? 'acceptEdits' : 'plan';
    $('hAllowed').value = hireRole === 'tester' ? 'npm test' : '';
    fillProjectSelect();
    const sel = cur(); if (typeof projectId === 'string' && projects.some(p => p.id === projectId)) $('hProject').value = projectId; else if (sel) $('hProject').value = sel.project;
    $('hire').showModal();
  }
  $('hName').addEventListener('input', () => { $('hName').dataset.touched = 1; });
  $('hireBtn').onclick = () => openHire();
  $('hOk').addEventListener('click', async e => {
    e.preventDefault();
    if (!$('hireForm').reportValidity()) return;
    try {
      const a = await api('/api/agents', { method: 'POST', body: JSON.stringify({ role: hireRole, name: $('hName').value, project: $('hProject').value, mode: $('hMode').value, allowed: $('hAllowed').value }) });
      agents.set(a.id, a); $('hire').close(); select(a.id);
    } catch (err) { $('hErr').textContent = err.message; }
  });
  $('hManage').onclick = () => openProjects();

  // ---------- projects ----------
  let projects = [];
  async function loadProjects() {
    try { projects = await api('/api/projects'); } catch { return; }
    buildWorld();
    fillProjectSelect();
    if ($('projects').open) renderProjectList();
    if (tab === 'context') renderContext();
  }
  function fillProjectSelect() {
    const keep = $('hProject').value;
    $('hProject').innerHTML = projects.map(p => `<option value="${p.id}">${esc(p.name)}${p.kind === 'linked' ? '' : ' (workspace)'} — ${p.agents} agent${p.agents === 1 ? '' : 's'}</option>`).join('');
    if (keep && projects.some(p => p.id === keep)) $('hProject').value = keep;
  }
  function renderProjectList() {
    const a = cur();
    $('projList').innerHTML = projects.map(p => `<div class="proj-item${p.exists ? '' : ' missing'}">
      <span data-icon="folder"></span>
      <div class="info"><b>${esc(p.name)}</b> ${p.branch ? `<span class="branch">⎇ ${esc(p.branch)}</span>` : ''}<code>${esc(p.path.replace(cfg.home, '~'))}${p.exists ? '' : ' — missing'}</code></div>
      <span class="meta">${p.agents} agent${p.agents === 1 ? '' : 's'}</span>
      <select class="theme-sel" data-theme="${p.id}" title="Room style">${(cfg.themes || ['night', 'day', 'lab', 'slate']).map(t => `<option value="${t}" ${p.theme === t ? 'selected' : ''}>${({ night: 'Night city', day: 'Daylight', lab: 'Lab', slate: 'Slate' })[t] || t}</option>`).join('')}</select>
      ${a && a.project !== p.id ? `<button type="button" class="btn" data-move="${p.id}" title="Move ${esc(a.name)} here">Move ${esc(a.name)}</button>` : ''}
      <button type="button" class="btn" data-all="${p.id}" title="Move every agent to this project">Use for all</button>
      ${p.agents ? '' : `<button type="button" class="icon-btn sm" data-del="${p.id}" title="Remove from list (files stay on disk)">${icon('trash')}</button>`}
    </div>`).join('');
    paintIcons($('projList'));
    $('projList').querySelectorAll('[data-move]').forEach(b => b.onclick = () => api(`/api/agents/${selected}/settings`, { method: 'POST', body: JSON.stringify({ project: b.dataset.move }) }).then(() => toast('Moved')).catch(e => $('pErr').textContent = e.message));
    $('projList').querySelectorAll('[data-all]').forEach(b => b.onclick = () => api(`/api/projects/${b.dataset.all}/assign-all`, { method: 'POST' }).then(() => toast('All agents moved')).catch(e => $('pErr').textContent = e.message));
    $('projList').querySelectorAll('[data-theme]').forEach(sel => sel.onchange = () => api(`/api/projects/${sel.dataset.theme}/settings`, { method: 'POST', body: JSON.stringify({ theme: sel.value }) }).catch(e => $('pErr').textContent = e.message));
    $('projList').querySelectorAll('[data-del]').forEach(b => b.onclick = () => api(`/api/projects/${b.dataset.del}`, { method: 'DELETE' }).catch(e => $('pErr').textContent = e.message));
  }
  async function browseTo(p) {
    try {
      const r = await api('/api/browse' + (p ? '?path=' + encodeURIComponent(p) : ''));
      $('bPath').textContent = r.display; $('bUp').disabled = !r.parent; $('bUp').onclick = () => r.parent && browseTo(r.parent);
      if (r.canAdd) $('pPath').value = r.display;
      $('bDirs').innerHTML = r.dirs.length ? r.dirs.map(d => `<div class="dir" data-n="${esc(d.name)}"><span class="pm">${d.project ? '●' : ''}</span>${esc(d.name)}<span class="go">open ›</span></div>`).join('') : '<div class="dir muted">No subfolders</div>';
      $('bDirs').querySelectorAll('[data-n]').forEach(el => el.onclick = () => browseTo(r.path + '/' + el.dataset.n));
    } catch (e) { $('pErr').textContent = e.message; }
  }
  function openProjects() {
    $('pErr').textContent = '';
    if ($('hire').open) $('hire').close();
    $('pNewHelp').textContent = `Created in ${cfg.workspaces || '~/AI-Office/workspaces'}`;
    renderProjectList(); browseTo(cfg.home ? cfg.home + '/projects' : null);
    $('projects').showModal();
  }
  document.querySelectorAll('.seg-b').forEach(b => b.onclick = () => {
    document.querySelectorAll('.seg-b').forEach(x => x.classList.toggle('sel', x === b));
    $('addLink').classList.toggle('hidden', b.dataset.m !== 'link'); $('addNew').classList.toggle('hidden', b.dataset.m !== 'new');
  });
  $('pAttach').onclick = async () => {
    $('pErr').textContent = '';
    try { const p = await api('/api/projects', { method: 'POST', body: JSON.stringify({ path: $('pPath').value }) }); toast(`Attached ${p.name}`); await loadProjects(); renderProjectList(); }
    catch (e) { $('pErr').textContent = e.message; }
  };
  $('pCreate').onclick = async () => {
    $('pErr').textContent = '';
    try { const p = await api('/api/projects', { method: 'POST', body: JSON.stringify({ name: $('pNew').value }) }); toast(`Created ${p.name}`); $('pNew').value = ''; await loadProjects(); renderProjectList(); }
    catch (e) { $('pErr').textContent = e.message; }
  };

  // ---------- output size: text size, panel width, expanded chat ----------
  const OUT_KEY = 'aioffice.output';
  let out = { fs: 13.5, rightW: 350, max: false };
  try { Object.assign(out, JSON.parse(localStorage.getItem(OUT_KEY) || '{}')); } catch { /* ignore */ }
  function applyOut() {
    out.fs = Math.max(11, Math.min(22, out.fs));
    out.rightW = Math.max(300, Math.min(Math.round(window.innerWidth * 0.6), out.rightW));
    document.documentElement.style.setProperty('--fs', out.fs + 'px');
    document.documentElement.style.setProperty('--right-w', out.rightW + 'px');
    document.body.classList.toggle('chat-max', out.max);
    $('chatMax').innerHTML = icon(out.max ? 'minimize' : 'maximize'); $('chatMax').title = out.max ? 'Back to normal size (X)' : 'Expand conversation (X)';
    try { localStorage.setItem(OUT_KEY, JSON.stringify(out)); } catch { /* ignore */ }
  }
  $('fsUp').onclick = () => { out.fs += 1.5; applyOut(); };
  $('fsDown').onclick = () => { out.fs -= 1.5; applyOut(); };
  $('chatMax').onclick = () => { out.max = !out.max; if (out.max && !viewState.chat) { viewState.chat = true; applyView(); } applyOut(); const b = $('tabChat'); b.scrollTop = b.scrollHeight; };
  $('resizer').addEventListener('pointerdown', e => {
    e.preventDefault(); const startX = e.clientX, startW = out.rightW;
    document.body.classList.add('resizing');
    const move = ev => { out.rightW = startW + (startX - ev.clientX); applyOut(); };
    const upH = () => { document.body.classList.remove('resizing'); removeEventListener('pointermove', move); removeEventListener('pointerup', upH); };
    addEventListener('pointermove', move); addEventListener('pointerup', upH);
  });
  $('resizer').addEventListener('dblclick', () => { out.rightW = 350; applyOut(); });
  applyOut();

  // ---------- view: panels, focus, wandering ----------
  const VIEW_KEY = 'aioffice.view';
  let viewState = { chat: true, editor: true, term: true, focus: false, wander: true };
  try { Object.assign(viewState, JSON.parse(localStorage.getItem(VIEW_KEY) || '{}')); } catch { /* storage unavailable */ }
  function applyView() {
    document.body.classList.toggle('hide-right', !viewState.chat);
    document.body.classList.toggle('hide-editor', !viewState.editor);
    document.body.classList.toggle('hide-term', !viewState.term);
    document.body.classList.toggle('focus', viewState.focus);
    $('tChat').classList.toggle('on', viewState.chat); $('tEditor').classList.toggle('on', viewState.editor); $('tTerm').classList.toggle('on', viewState.term);
    $('tWander').classList.toggle('on', viewState.wander); $('tFocus').classList.toggle('on', viewState.focus);
    $('tFocus').innerHTML = icon(viewState.focus ? 'minimize' : 'maximize'); $('tFocus').title = viewState.focus ? 'Exit focus (Esc)' : 'Focus: only the office (F)';
    ['tChat', 'tEditor', 'tTerm'].forEach(id => $(id).style.display = viewState.focus ? 'none' : '');
    document.querySelectorAll('.tool-sep').forEach((el, i) => el.style.display = viewState.focus && i === 1 ? 'none' : '');
    if (office) office.setWander(viewState.wander);
    try { localStorage.setItem(VIEW_KEY, JSON.stringify(viewState)); } catch { /* ignore */ }
    if (viewState.focus) { const h = $('focusHint'); h.classList.add('show'); clearTimeout(h._t); h._t = setTimeout(() => h.classList.remove('show'), 2500); }
    requestAnimationFrame(resizeView);
  }
  const toggle = k => { viewState[k] = !viewState[k]; applyView(); };
  $('tChat').onclick = () => toggle('chat'); $('tEditor').onclick = () => toggle('editor'); $('tTerm').onclick = () => toggle('term');
  $('tZin').onclick = () => zoomAt(view.clientWidth / 2, view.clientHeight / 2, 1.3);
  $('tZout').onclick = () => zoomAt(view.clientWidth / 2, view.clientHeight / 2, 1 / 1.3);
  $('tFit').onclick = () => fitCamera(false);
  $('tFocus').onclick = () => toggle('focus'); $('tWander').onclick = () => { toggle('wander'); toast(viewState.wander ? 'Idle agents will wander around' : 'Agents stay at their desks'); };
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { if (e.key === 'Escape') document.activeElement.blur(); return; }
    const k = e.key.toLowerCase();
    if (k === 'escape' && out.max) { out.max = false; applyOut(); }
    else if (k === 'x') $('chatMax').click();
    else if (k === 'escape' && viewState.focus) toggle('focus');
    else if (k === '+' || k === '=') zoomAt(view.clientWidth / 2, view.clientHeight / 2, 1.3);
    else if (k === '-') zoomAt(view.clientWidth / 2, view.clientHeight / 2, 1 / 1.3);
    else if (k === '0') fitCamera(false);
    else if (k === 'f') toggle('focus'); else if (k === 'c') toggle('chat'); else if (k === 'e') toggle('editor'); else if (k === 't') toggle('term'); else if (k === 'w') toggle('wander');
  });

  function openSettings() { $('setWs').textContent = cfg.workspaces || ''; $('setAddr').textContent = location.origin; $('settings').showModal(); }
  $('settingsTop').onclick = openSettings;

  // ---------- live updates ----------
  function connect() {
    const es = new EventSource('/api/events?token=' + TOKEN);
    es.onopen = () => { connected = true; renderSys(); };
    es.onerror = () => { connected = false; renderSys(); };
    es.onmessage = m => {
      const ev = JSON.parse(m.data);
      if (ev.type === 'agent') {
        const before = agents.get(ev.agent.id);
        agents.set(ev.agent.id, { ...before, ...ev.agent }); renderAll(); updateTitle();
        if (ev.agent.id === selected) { if (tab === 'context') renderContext(); if (before && before.project !== ev.agent.project) { openFile = null; expanded = new Set(); renderCode(); loadTree(); loadProject(); renderTerm(); } }
      }
      else if (ev.type === 'status') {
        const a = agents.get(ev.id); if (!a) return;
        a.status = ev.status; a.cost = ev.cost;
        renderAll();
        if (ev.id === selected) { renderChat(); renderTerm(); if (ev.status !== 'working') refreshTreeSoon(); }
      } else if (ev.type === 'log') {
        if (!logs.has(ev.id)) logs.set(ev.id, []);
        logs.get(ev.id).push(ev.entry);
        const a = agents.get(ev.id);
        if (a) { a.lastAt = ev.entry.t; if (['tool', 'assistant', 'error'].includes(ev.entry.kind)) a.activity = ev.entry.text.split('\n')[0].slice(0, 80); }
        renderAgentList(); renderLabels();
        if (ev.id === selected) {
          if (tab === 'chat') renderChat(); else if (tab === 'files') renderFiles();
          renderTerm();
          if (ev.entry.kind === 'tool' && /Write|Edit/.test(ev.entry.tool || '')) refreshTreeSoon();
        }
      } else if (ev.type === 'projects') { loadProjects();
      } else if (ev.type === 'approval') {
        const a = agents.get(ev.approval.agentId);
        if (a) { a.asking = ev.approval; toast(`${a.name} needs your OK to run: ${ev.approval.summary.slice(0, 60)}`); renderAll(); updateTitle(); if (ev.approval.agentId === selected) renderChat(); }
      } else if (ev.type === 'approval-done') {
        const a = agents.get(ev.agentId); if (a && a.asking && a.asking.id === ev.id) { a.asking = null; renderAll(); if (ev.agentId === selected) renderChat(); }
        updateTitle();
      } else if (ev.type === 'pipeline') {
        pipelinesByProject.set(ev.pipeline.projectId, ev.pipeline); renderPipeline();
        if (ev.pipeline.status === 'passed') toast('✅ Team pipeline passed'); else if (ev.pipeline.status === 'failed') toast('❌ Team pipeline failed');
      } else if (ev.type === 'handoff') {
        if (office) office.handoff(ev.from, ev.to, ev.label);
      } else if (ev.type === 'git') {
        const p = projects.find(x => x.id === ev.projectId); if (p) p.mr = ev.mr;
        syncWorldAgents();
        if (ev.projectId === curProjectId()) { if (gitInfo) gitInfo.mr = ev.mr; renderGit(); }
      } else if (ev.type === 'removed') {
        agents.delete(ev.id); logs.delete(ev.id);
        if (selected === ev.id) { selected = null; openFile = null; const next = agents.values().next().value; if (next) select(next.id); else { renderTab(); renderTerm(); loadTree(); loadProject(); renderCode(); } }
        renderAll();
      }
    };
  }
  async function pollSystem() {
    try {
      const s = await api('/api/system');
      $('sCpu').textContent = s.cpu + '%'; $('sRam').textContent = s.ram + '%'; $('sDisk').textContent = s.disk == null ? '–' : s.disk + '%';
    } catch { /* offline */ }
  }

  (async function init() {
    try {
      cfg = await api('/api/config');
      for (const a of await api('/api/agents')) agents.set(a.id, a);
    } catch (e) { toast('Could not reach the bridge: ' + e.message); }
    await loadProjects();
    try { for (const pl of (await api('/api/pipelines')).reverse()) pipelinesByProject.set(pl.projectId, pl); } catch { /* ignore */ }
    applyTheme();
    applyView();
    renderAll(); renderTab(); renderTerm();
    connect(); pollSystem(); setInterval(pollSystem, 3000);
    const first = [...agents.values()].sort((x, y) => x.desk - y.desk)[0];
    if (first) select(first.id);
  })();
})();
