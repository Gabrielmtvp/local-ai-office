// Isometric pixel-art office renderer. Exposes window.Office.
(function () {
  const W = 420, H = 324;
  const TW = 20, TH = 10, WALL = 100, N = 10;
  let OX = 210, OY = 112;
  const ZERO = { x: 0, y: 0 };
  let RO = ZERO; // room origin (world offset in tiles)
  const useGeom = (ox, oy, ro) => { OX = ox; OY = oy; RO = ro || ZERO; };
  const iso = (x, y) => [OX + (x + RO.x - y - RO.y) * TW, OY + (x + RO.x + y + RO.y) * TH];
  const wallL = (y, h) => { const p = iso(0, y); return [p[0], p[1] - h]; };
  const wallR = (x, h) => { const p = iso(x, 0); return [p[0], p[1] - h]; };

  // Desk slots (desk origin in grid units; desk is 2 wide in x, 1 deep in y).
  const SLOTS = [
    { x: 2.4, y: 3.2, kit: 'laptop' }, { x: 5.2, y: 1.3, kit: 'laptop' },
    { x: 1.9, y: 6.6, kit: 'monitor' }, { x: 7.0, y: 4.4, kit: 'laptop' },
    { x: 4.4, y: 8.1, kit: 'monitor' }, { x: 7.6, y: 7.3, kit: 'laptop' },
    { x: 0.5, y: 9.0, kit: 'laptop' }, { x: 8.0, y: 2.0, kit: 'monitor' },
  ];

  const LOOKS = {
    architect: { shirt: '#2563eb', shirtD: '#1e40af', head: 'cap', hat: '#1d4ed8', hatD: '#1e3a8a', hair: '#3b2a1a' },
    developer: { shirt: '#dc2626', shirtD: '#991b1b', head: 'hood', hat: '#b91c1c', hatD: '#7f1d1d', hair: '#1f1612' },
    tester: { shirt: '#16a34a', shirtD: '#166534', head: 'cap', hat: '#15803d', hatD: '#14532d', hair: '#3b2a1a' },
    researcher: { shirt: '#9333ea', shirtD: '#6b21a8', head: 'long', hat: '#7e22ce', hatD: '#581c87', hair: '#7e22ce' },
  };
  const CUSTOM = [
    { shirt: '#f59e0b', shirtD: '#b45309', head: 'short', hair: '#4a2f1b' },
    { shirt: '#0ea5e9', shirtD: '#0369a1', head: 'short', hair: '#111827' },
    { shirt: '#ec4899', shirtD: '#be185d', head: 'long', hair: '#c2410c', hat: '#c2410c' },
    { shirt: '#14b8a6', shirtD: '#0f766e', head: 'cap', hat: '#0f766e', hatD: '#134e4a', hair: '#3b2a1a' },
  ];
  function lookFor(agent) { return LOOKS[agent.role] || CUSTOM[(agent.desk || 0) % CUSTOM.length]; }

  let hoverDesk = -1;
  const CAT = { x: 6.3, y: 6.5 };
  const THEMES = {
    warm: { floor: ['#a16207', '#a8690c', '#9a5c06', '#a36509', '#965904'], wallL: '#7c2d12', wallR: '#9a3412', trimL: '#c2410c', trimR: '#ea580c',
      sky: ['#1e1b4b', '#7c2d12', '#ea580c', '#fde68a'], bld: ['#431407', '#290c03'], lit: ['#fde68a', '#fbbf24'], stars: false, neon: ['Coffee', '&', 'Chill'], neonC: '#fb923c', rug: ['#713f12', '#854d0e', '#a16207', '#fde68a'] },
    arcade: { floor: ['#1e1b4b', '#221e52', '#1b1845', '#201c4f', '#1a1742'], wallL: '#2e1065', wallR: '#3b0764', trimL: '#ec4899', trimR: '#a855f7',
      sky: ['#020617', '#1e1b4b', '#701a75', '#db2777'], bld: ['#0f0a2e', '#08051c'], lit: ['#f0abfc', '#67e8f9'], stars: true, neon: ['Game', 'Over', '?'], neonC: '#f472b6', rug: ['#4c1d95', '#5b21b6', '#6d28d9', '#f0abfc'] },
    slate: { floor: ['#57534e', '#5c5752', '#524d48', '#59544f', '#4f4a45'], wallL: '#3f3f46', wallR: '#52525b', trimL: '#71717a', trimR: '#a1a1aa',
      sky: ['#0c4a6e', '#0369a1', '#38bdf8', '#e0f2fe'], bld: ['#1e293b', '#0f172a'], lit: ['#e2e8f0', '#94a3b8'], stars: false, neon: ['Sync', 'Up', ''], neonC: '#38bdf8', rug: ['#1e293b', '#334155', '#475569', '#94a3b8'] },
    night: { floor: ['#7a4f2e', '#7f5431', '#744a2b', '#7e5331', '#71472a'], wallL: '#2b2740', wallR: '#332e4c', trimL: '#4a4366', trimR: '#544c73',
      sky: ['#0f1235', '#3b2a7a', '#a3478f', '#f2a65a'], bld: ['#232a52', '#181c3a'], lit: ['#fde68a', '#fbbf24'], stars: true, neon: ['Better', 'Code', 'Together'], neonC: '#60a5fa', rug: ['#1e3a5f', '#27507d', '#2b5b8c', '#7aa7d6'] },
    day: { floor: ['#c9a27a', '#c49c73', '#cfa880', '#c7a077', '#c19870'], wallL: '#d9d2c5', wallR: '#e6dfd2', trimL: '#bfb5a3', trimR: '#cdc3b1',
      sky: ['#7dd3fc', '#bae6fd', '#e0f2fe', '#fef3c7'], bld: ['#94a3b8', '#64748b'], lit: ['#e2e8f0', '#cbd5e1'], stars: false, neon: ['Ship', 'It', 'Today'], neonC: '#f97316', rug: ['#14532d', '#166534', '#15803d', '#86efac'] },
    lab: { floor: ['#334155', '#2f3b4e', '#364459', '#303d51', '#2c374a'], wallL: '#1f2937', wallR: '#273244', trimL: '#0ea5e9', trimR: '#0ea5e9',
      sky: ['#020617', '#0f172a', '#134e4a', '#14b8a6'], bld: ['#0f172a', '#020617'], lit: ['#5eead4', '#2dd4bf'], stars: true, neon: ['Test', 'All', 'Things'], neonC: '#22d3ee', rug: ['#3b0764', '#581c87', '#6b21a8', '#c084fc'] },
  };
  const STATUS = { idle: '#94a3b8', working: '#22c55e', waiting: '#facc15', error: '#ef4444' };

  // ---------- primitives ----------
  function poly(ctx, pts, fill) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  const up = (p, h) => [p[0], p[1] - h];
  function box(ctx, x, y, w, d, h, z, top, left, right) {
    const A = iso(x, y), B = iso(x + w, y), C = iso(x + w, y + d), D = iso(x, y + d);
    poly(ctx, [up(D, z), up(C, z), up(C, z + h), up(D, z + h)], left);
    poly(ctx, [up(B, z), up(C, z), up(C, z + h), up(B, z + h)], right);
    poly(ctx, [up(A, z + h), up(B, z + h), up(C, z + h), up(D, z + h)], top);
  }
  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // ---------- character sprite (12 cells wide; sitting 16 tall, standing 20 tall) ----------
  // opts: noChair, pose ('sit' | 'stand' | 'sofa'), back (facing away), walk (phase or -1), hold ('mug'|'book'|'can'), armsUp
  function drawCharacter(ctx, cx, by, look, st, t, c, opts = {}) {
    const pose = opts.pose || 'sit';
    const typing = st === 'working' && pose === 'sit' && !opts.noChair;
    const walking = opts.walk >= 0 && opts.walk !== undefined;
    const bob = typing ? (Math.floor(t / 260) % 2) : walking ? (Math.floor(opts.walk) % 2) : (pose === 'sit' && st === 'idle' ? (Math.floor(t / 1400) % 2) : 0);
    const H = pose === 'stand' ? 20 : 16;
    const x0 = Math.round(cx - 6 * c), y0 = Math.round(by - H * c + bob * (c / 2));
    const r = (x, y, w, h, col) => px(ctx, x0 + x * c, y0 + y * c, w * c, h * c, col);
    const skin = '#f2c6a0', skinD = '#d9a47c', pants = '#334155', shoe = '#1e1b2e';
    if (!opts.noChair && pose === 'sit') { r(1, 5, 10, 10, '#2a2438'); r(1, 5, 10, 1, '#3d3552'); }
    // legs
    if (pose === 'stand') {
      const ph = walking ? Math.floor(opts.walk) % 2 : -1;
      r(4, 16, 2, ph === 0 ? 3 : 4, pants); r(6, 16, 2, ph === 1 ? 3 : 4, pants);
      r(4, ph === 0 ? 18.5 : 19.5, 2, 0.5, shoe); r(6, ph === 1 ? 18.5 : 19.5, 2, 0.5, shoe);
    } else if (pose === 'sofa') { r(3.5, 15.5, 5, 1.5, pants); r(3.5, 17, 2, 0.5, shoe); r(6.5, 17, 2, 0.5, shoe); }
    // body
    r(3, 10, 6, 6, opts.back ? look.shirtD : look.shirt); r(3, 15, 6, 1, look.shirtD);
    if (!opts.back) r(5, 10, 2, 1, skinD);
    // arms
    if (opts.armsUp) { r(2, 5, 1, 6, look.shirtD); r(9, 5, 1, 6, look.shirtD); r(2, 4, 1, 1, skin); r(9, 4, 1, 1, skin); }
    else {
      const a = typing ? Math.floor(t / 140) % 2 : walking ? Math.floor(opts.walk) % 2 : 0;
      r(2, 11 + a, 1, 4, look.shirtD); r(9, 12 - a, 1, 4, look.shirtD);
      if (!opts.back) { r(2, 15 + a, 1, 1, skin); r(9, 16 - a, 1, 1, skin); }
    }
    // head
    if (opts.back) {
      r(3, 3, 6, 7, skin);
      const top = look.head === 'hood' ? look.hat : look.hair;
      r(3, 2, 6, 7, top); r(2, 3, 1, 5, top); r(9, 3, 1, 5, top);
      if (look.head === 'cap') { r(3, 1, 6, 2, look.hat); r(3, 3, 6, 1, look.hatD); }
      if (look.head === 'long') { r(2, 4, 1, 8, look.hair); r(9, 4, 1, 8, look.hair); r(3, 9, 6, 2, look.hair); }
      if (look.head === 'hood') { r(2, 1, 8, 3, look.hat); r(3, 8, 6, 2, look.hatD); }
    } else {
      r(3, 3, 6, 7, skin); r(3, 9, 6, 1, skinD);
      const blink = Math.floor(t / 2600 + (look.shirt.charCodeAt(2) % 7)) % 9 === 0;
      const sleepy = (pose === 'sit' && !opts.noChair && st === 'idle' && Math.floor(t / 3000) % 2) || opts.sleep;
      if (sleepy || blink) { r(4, 6, 1, 0.5, '#1f1b2e'); r(7, 6, 1, 0.5, '#1f1b2e'); }
      else { r(4, 5, 1, 2, '#1f1b2e'); r(7, 5, 1, 2, '#1f1b2e'); }
      r(3.5, 7, 1, 1, '#f0a3a3'); r(7.5, 7, 1, 1, '#f0a3a3');
      if (st === 'error') r(5, 8, 2, 0.5, '#7f1d1d');
      else if (st === 'waiting' || opts.happy) r(5.5, 8, 1, 1, '#9f4b3b');
      else r(5, 8, 2, 0.5, '#b46a55');
      switch (look.head) {
        case 'cap': r(3, 1, 6, 2, look.hat); r(2, 3, 8, 1, look.hatD); r(8, 3, 3, 1, look.hatD); r(3, 4, 1, 2, look.hair); r(8, 4, 1, 2, look.hair); break;
        case 'hood': r(2, 1, 8, 3, look.hat); r(2, 4, 1, 6, look.hat); r(9, 4, 1, 6, look.hat); r(3, 3, 6, 1, look.hair); r(3, 1, 6, 1, look.hatD); break;
        case 'long': r(2, 1, 8, 3, look.hair); r(2, 4, 1, 8, look.hair); r(9, 4, 1, 8, look.hair); r(3, 4, 2, 1, look.hair); r(4, 1, 4, 1, look.hatD || look.hair); break;
        default: r(3, 1, 6, 3, look.hair); r(3, 4, 1, 2, look.hair); r(8, 4, 1, 2, look.hair);
      }
    }
    // held items
    if (!opts.back && opts.hold === 'mug') {
      r(8.5, 12, 2, 2.5, '#f8fafc'); r(10.5, 12.5, 0.5, 1, '#e2e8f0');
      const s = Math.floor(t / 300) % 3;
      ctx.globalAlpha = 0.6; r(9 + (s === 1 ? 0.5 : 0), 10 - s * 0.5, 0.5, 1.5, '#e2e8f0'); r(10 - (s === 2 ? 0.5 : 0), 9 - s * 0.5, 0.5, 1, '#e2e8f0'); ctx.globalAlpha = 1;
    }
    if (!opts.back && opts.hold === 'book') { r(3, 12, 6, 3.5, '#b91c1c'); r(5.75, 12, 0.5, 3.5, '#7f1d1d'); r(3.5, 12.5, 2, 0.5, '#fecaca'); }
    if (!opts.back && opts.hold === 'can') {
      r(8.5, 12, 3, 2.5, '#16a34a'); r(11.5, 11.5, 1.5, 0.5, '#15803d');
      const d = (t / 120) % 6; r(13, 12 + d * 0.6, 0.5, 0.5, '#60a5fa'); r(12.5, 13 + ((d + 3) % 6) * 0.6, 0.5, 0.5, '#93c5fd');
    }
  }

  function avatar(agent, size = 2) {
    const cv = document.createElement('canvas');
    cv.width = 12 * size + 8; cv.height = 13 * size + 4;
    const ctx = cv.getContext('2d');
    drawCharacter(ctx, cv.width / 2, cv.height + 3 * size, lookFor(agent), 'waiting', 0, size, { noChair: true });
    return cv.toDataURL();
  }

  // ---------- static room ----------
  function drawCity(ctx, y0, y1, h0, h1, seed, t, T) {
    const R = rng(seed);
    ctx.save();
    ctx.beginPath();
    const q = [wallL(y0, h0), wallL(y1, h0), wallL(y1, h1), wallL(y0, h1)];
    ctx.moveTo(...q[0]); q.slice(1).forEach(p => ctx.lineTo(...p)); ctx.closePath(); ctx.clip();
    const g = ctx.createLinearGradient(0, q[3][1] - 10, 0, q[0][1] + 10);
    g.addColorStop(0, T.sky[0]); g.addColorStop(0.55, T.sky[1]); g.addColorStop(0.85, T.sky[2]); g.addColorStop(1, T.sky[3]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < (T.stars ? 18 : 0); i++) { const sy = y0 + R() * (y1 - y0); const p = wallL(sy, h1 - 4 - R() * 25); px(ctx, p[0], p[1], 1, 1, '#e0e7ff'); }
    for (let layer = 0; layer < 2; layer++) {
      for (let s = y0 - 0.1; s < y1; s += 0.22 + R() * 0.2) {
        const w = 0.18 + R() * 0.3;
        const bh = (layer ? 10 : 22) + R() * (layer ? 26 : 34);
        const col = layer ? T.bld[1] : T.bld[0];
        poly(ctx, [wallL(s, h0), wallL(s + w, h0), wallL(s + w, h0 + bh), wallL(s, h0 + bh)], col);
        for (let k = 3; k < bh - 2; k += 4) for (let j = 0.05; j < w - 0.04; j += 0.09) {
          const on = R() > 0.55; const flick = Math.floor(t / 1700 + k + j * 50) % 13 === 0;
          if (on && !flick) { const p = wallL(s + j, h0 + k); px(ctx, p[0], p[1], 1, 1, layer ? T.lit[1] : T.lit[0]); }
        }
      }
    }
    ctx.restore();
    const frame = '#3a2a20';
    ctx.strokeStyle = frame; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(...q[0]); q.slice(1).forEach(p => ctx.lineTo(...p)); ctx.closePath(); ctx.stroke();
    const mid = (y0 + y1) / 2;
    ctx.beginPath(); ctx.moveTo(...wallL(mid, h0)); ctx.lineTo(...wallL(mid, h1)); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(...wallL(y0, (h0 + h1) / 2)); ctx.lineTo(...wallL(y1, (h0 + h1) / 2)); ctx.stroke();
    poly(ctx, [wallL(y0 - 0.1, h0 - 1), wallL(y1 + 0.1, h0 - 1), wallL(y1 + 0.1, h0 - 4), wallL(y0 - 0.1, h0 - 4)], '#5b4030');
  }

  function drawStatic(ctx, t, T = THEMES.night, o = {}) {
    const L = o.left !== false, Rw = o.right !== false;
    if (o.clear !== false) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // floor slab edge
    const F = [iso(0, N), iso(N, N), iso(N, 0)];
    if (o.slab !== false) { poly(ctx, [F[0], F[1], up(F[1], -8), up(F[0], -8)], '#3b2618');
    poly(ctx, [F[1], F[2], up(F[2], -8), up(F[1], -8)], '#2c1c12'); }
    // floor planks
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const v = (x * 7 + y * 3) % 5;
      const cols = T.floor;
      poly(ctx, [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], cols[v]);
      ctx.strokeStyle = 'rgba(40,24,14,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(...iso(x, y + 0.5)); ctx.lineTo(...iso(x + 1, y + 0.5)); ctx.stroke();
    }
    // walls
    if (L) {
      poly(ctx, [iso(0, 0), iso(0, N), wallL(N, WALL), wallL(0, WALL)], T.wallL);
      for (let h = 12; h < WALL; h += 12) { ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.moveTo(...wallL(0, h)); ctx.lineTo(...wallL(N, h)); ctx.stroke(); }
      poly(ctx, [wallL(0, WALL), wallL(N, WALL), wallL(N, WALL - 4), wallL(0, WALL - 4)], T.trimL);
      poly(ctx, [iso(0, 0), iso(0, N), wallL(N, 5), wallL(0, 5)], '#1e1a2d');
    }
    if (Rw) {
      poly(ctx, [iso(0, 0), iso(N, 0), wallR(N, WALL), wallR(0, WALL)], T.wallR);
      for (let h = 12; h < WALL; h += 12) { ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.moveTo(...wallR(0, h)); ctx.lineTo(...wallR(N, h)); ctx.stroke(); }
      poly(ctx, [wallR(0, WALL), wallR(N, WALL), wallR(N, WALL - 4), wallR(0, WALL - 4)], T.trimR);
      poly(ctx, [iso(0, 0), iso(N, 0), wallR(N, 5), wallR(0, 5)], '#241f36');
    }
    if (L && Rw) { const c = iso(0, 0); poly(ctx, [c, wallL(0, WALL), [c[0] + 1, c[1] - WALL], [c[0] + 1, c[1]]], '#1c1829'); }

    if (L) {
    drawCity(ctx, 0.6, 3.6, 20, 90, 11, t, T);
    drawCity(ctx, 4.1, 7.1, 20, 90, 29, t, T);

    // neon sign
    ctx.save();
    const np = wallL(9.7, 80);
    ctx.setTransform(1, -0.5, 0, 1, np[0], np[1]);
    ctx.shadowColor = T.neonC; ctx.shadowBlur = 8;
    ctx.strokeStyle = T.neonC; ctx.lineWidth = 1.5; ctx.strokeRect(0, 0, 36, 34);
    ctx.fillStyle = '#bfdbfe'; ctx.font = 'bold 8px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center';
    T.neon.forEach((w, i) => ctx.fillText(w, 18, 10 + i * 9));
    ctx.restore();
    }

    if (Rw) {
    // whiteboard
    poly(ctx, [wallR(3.0, 30), wallR(5.8, 30), wallR(5.8, 82), wallR(3.0, 82)], '#94a3b8');
    poly(ctx, [wallR(3.1, 33), wallR(5.7, 33), wallR(5.7, 79), wallR(3.1, 79)], '#e2e8f0');
    ctx.save();
    const wp = wallR(3.35, 72);
    ctx.setTransform(1, 0.5, 0, 1, wp[0], wp[1]);
    ctx.fillStyle = '#334155'; ctx.font = '7px ui-monospace, Menlo, monospace';
    ['Build', 'Test', 'Improve', 'Ship'].forEach((w, i) => { ctx.fillStyle = '#16a34a'; ctx.fillText('✓', 0, i * 10); ctx.fillStyle = '#334155'; ctx.fillText(w, 8, i * 10); });
    ctx.restore();
    poly(ctx, [wallR(3.2, 30), wallR(5.6, 30), wallR(5.6, 28), wallR(3.2, 28)], '#64748b');

    // wall clock
    ctx.save(); const cp = wallR(7.4, 78); ctx.setTransform(1, 0.5, 0, 1, cp[0], cp[1]);
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
    const d = new Date(); const hh = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * 6.283, mm = d.getMinutes() / 60 * 6.283;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(hh) * 3, -Math.cos(hh) * 3); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(mm) * 5, -Math.cos(mm) * 5); ctx.stroke();
    ctx.restore();
    }

    // rug
    poly(ctx, [iso(3.2, 3.6), iso(7.2, 3.6), iso(7.2, 7.4), iso(3.2, 7.4)], T.rug[0]);
    poly(ctx, [iso(3.45, 3.85), iso(6.95, 3.85), iso(6.95, 7.15), iso(3.45, 7.15)], T.rug[1]);
    poly(ctx, [iso(3.8, 4.2), iso(6.6, 4.2), iso(6.6, 6.8), iso(3.8, 6.8)], T.rug[2]);
    ctx.strokeStyle = T.rug[3]; ctx.setLineDash([2, 2]); ctx.beginPath();
    [[3.6, 4.0], [6.8, 4.0], [6.8, 7.0], [3.6, 7.0]].forEach((p, i) => i ? ctx.lineTo(...iso(...p)) : ctx.moveTo(...iso(...p)));
    ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
  }

  // ---------- furniture ----------
  function bookshelf(ctx, x, y, w, seed) {
    const R = rng(seed), h = 70, d = 0.55;
    box(ctx, x, y, w, d, h, 0, '#5a3a24', '#6b4529', '#4a2f1d');
    const bookCols = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#e5e7eb', '#14b8a6'];
    for (let s = 0; s < 4; s++) {
      const z = 6 + s * 16;
      poly(ctx, [up(iso(x + 0.05, y + d), z - 2), up(iso(x + w - 0.05, y + d), z - 2), up(iso(x + w - 0.05, y + d), z), up(iso(x + 0.05, y + d), z)], '#3d2716');
      let t = 0.1;
      while (t < w - 0.15) {
        const bw = 0.08 + R() * 0.06, bh = 8 + R() * 5;
        const p = up(iso(x + t, y + d), z);
        const q = up(iso(x + t + bw, y + d), z);
        poly(ctx, [p, q, up(q, bh), up(p, bh)], bookCols[Math.floor(R() * bookCols.length)]);
        t += bw + 0.015;
        if (R() > 0.9) t += 0.15;
      }
    }
  }
  function plant(ctx, x, y, big, t, seed) {
    const s = big ? 1 : 0.7;
    box(ctx, x, y, 0.5 * s, 0.5 * s, 9 * s, 0, '#c2683f', '#a8552f', '#8c4626');
    const c = up(iso(x + 0.25 * s, y + 0.25 * s), 9 * s);
    const R = rng(seed);
    const sway = Math.sin(t / 1400 + seed) * 0.8;
    const greens = ['#166534', '#15803d', '#16a34a', '#22c55e'];
    const n = big ? 26 : 14;
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, rr = R() * (big ? 11 : 7);
      const hy = R() * (big ? 26 : 16);
      px(ctx, c[0] + Math.cos(a) * rr + sway * hy / 20, c[1] - hy - 2, 3, 3, greens[Math.floor(R() * 4)]);
    }
  }
  function coffeeTable(ctx, t) {
    box(ctx, 4.5, 4.9, 1.5, 1.1, 2, 7, '#1f2937', '#111827', '#0b1220');
    box(ctx, 4.55, 4.95, 0.12, 0.12, 7, 0, '#111', '#111', '#111');
    box(ctx, 5.85, 5.85, 0.12, 0.12, 7, 0, '#111', '#111', '#111');
    ctx.globalAlpha = 0.65; box(ctx, 4.45, 4.85, 1.6, 1.2, 1, 9, '#7dd3fc', '#38bdf8', '#0ea5e9'); ctx.globalAlpha = 1;
    plant(ctx, 5.0, 5.2, false, t, 77);
  }
  function cat(ctx, t) {
    const p = iso(CAT.x, CAT.y); const br = Math.floor(t / 900) % 2;
    const x = p[0] - 8, y = p[1] - 7;
    px(ctx, x + 1, y + 3 - br, 14, 5 + br, '#f59e0b'); px(ctx, x, y + 4, 16, 3, '#f59e0b');
    px(ctx, x + 3, y + 4, 2, 2, '#b45309'); px(ctx, x + 7, y + 4 - br, 2, 2, '#b45309'); px(ctx, x + 11, y + 4, 2, 2, '#b45309');
    px(ctx, x + 12, y + 1, 6, 5, '#fbbf24'); px(ctx, x + 12, y - 1, 2, 2, '#f59e0b'); px(ctx, x + 16, y - 1, 2, 2, '#f59e0b');
    px(ctx, x + 13, y + 3, 2, 1, '#78350f'); px(ctx, x + 16, y + 3, 1, 1, '#78350f');
    px(ctx, x - 3, y + 6, 6, 2, '#f59e0b');
    if (Math.floor(t / 1600) % 2) { ctx.fillStyle = '#cbd5e1'; ctx.font = '6px monospace'; ctx.fillText('z', x + 19, y - 2 - br); }
  }
  function sofa(ctx) {
    box(ctx, 4.5, 4.0, 1.8, 0.7, 7, 0, '#3f3a63', '#2f2a4f', '#262141');
    box(ctx, 4.5, 4.0, 1.8, 0.22, 20, 0, '#4b4577', '#38325c', '#2c2749');
    box(ctx, 4.5, 4.0, 0.2, 0.7, 12, 0, '#4b4577', '#38325c', '#2c2749');
    box(ctx, 6.1, 4.0, 0.2, 0.7, 12, 0, '#4b4577', '#38325c', '#2c2749');
    box(ctx, 4.72, 4.24, 0.62, 0.42, 2, 7, '#5a5390', '#463f75', '#38325c');
    box(ctx, 5.45, 4.24, 0.62, 0.42, 2, 7, '#5a5390', '#463f75', '#38325c');
  }
  function coffeeCounter(ctx, t) {
    box(ctx, 0.1, 3.6, 0.65, 1.0, 18, 0, '#cbd5e1', '#94a3b8', '#64748b');
    box(ctx, 0.15, 3.75, 0.45, 0.45, 12, 18, '#1f2937', '#111827', '#0b1220');
    const m = up(iso(0.4, 4.2), 22); px(ctx, m[0] - 1, m[1] - 2, 3, 2, Math.floor(t / 600) % 2 ? '#ef4444' : '#7f1d1d');
    const c = up(iso(0.45, 4.45), 18); px(ctx, c[0] - 2, c[1] - 4, 4, 4, '#f8fafc'); px(ctx, c[0] + 2, c[1] - 3, 1, 2, '#e2e8f0');
  }
  // ---------- extra rooms ----------
  function chair(ctx, x, y, col, back) {
    box(ctx, x, y, 0.45, 0.45, 2, 7, col, '#1f2937', '#111827');
    box(ctx, x + 0.2, y + 0.2, 0.06, 0.06, 7, 0, '#111', '#111', '#111');
    if (back === 'x') box(ctx, x - 0.02, y, 0.08, 0.45, 12, 7, col, '#1f2937', '#111827');
    if (back === 'y') box(ctx, x, y - 0.02, 0.45, 0.08, 12, 7, col, '#1f2937', '#111827');
  }
  function meetingRoom(items, ctx, t, o = {}) {
    const seats = [];
    for (let i = 0; i < 4; i++) { seats.push([3.4 + i * 0.95, 2.9, 'y']); seats.push([3.4 + i * 0.95, 5.85, null]); }
    seats.push([2.4, 4.1, 'x']); seats.push([7.6, 4.1, null]);
    seats.forEach(([x, y, b]) => items.push({ k: x + y + 0.9, f: () => chair(ctx, x, y, '#334155', b) }));
    items.push({ k: 3.2 + 3.5 + 6, f: () => {
      box(ctx, 3.2, 3.5, 4, 2, 3, 11, '#e7e5e4', '#a8a29e', '#78716c');
      box(ctx, 3.6, 4.3, 0.2, 0.4, 11, 0, '#57534e', '#57534e', '#44403c'); box(ctx, 6.6, 4.3, 0.2, 0.4, 11, 0, '#57534e', '#57534e', '#44403c');
      const lp = up(iso(4.4, 4.2), 14); px(ctx, lp[0] - 6, lp[1] - 6, 12, 6, '#94a3b8'); px(ctx, lp[0] - 5, lp[1] - 5, 10, 4, '#cbd5e1');
      const lp2 = up(iso(6, 4.8), 14); px(ctx, lp2[0] - 6, lp2[1] - 6, 12, 6, '#94a3b8'); px(ctx, lp2[0] - 5, lp2[1] - 5, 10, 4, '#cbd5e1');
      const sp = up(iso(5.2, 4.5), 14); px(ctx, sp[0] - 3, sp[1] - 2, 6, 3, '#111827');
      const cup = up(iso(4.0, 5.0), 14); px(ctx, cup[0] - 1, cup[1] - 3, 3, 3, '#f8fafc');
    } });
    if (!o.noWall) items.push({ k: 2.5, f: () => { // TV on right wall
      poly(ctx, [wallR(6.4, 40), wallR(8.8, 40), wallR(8.8, 78), wallR(6.4, 78)], '#0b1220');
      const g = Math.floor(t / 2000) % 3;
      poly(ctx, [wallR(6.5, 43), wallR(8.7, 43), wallR(8.7, 75), wallR(6.5, 75)], ['#1d4ed8', '#0f766e', '#7c3aed'][g]);
      for (let i = 0; i < 4; i++) poly(ctx, [wallR(6.8 + i * 0.45, 48), wallR(7.0 + i * 0.45, 48), wallR(7.0 + i * 0.45, 52 + i * 5), wallR(6.8 + i * 0.45, 52 + i * 5)], '#e0f2fe');
    } });
    items.push({ k: 0.8, f: () => plant(ctx, 0.15, 0.15, true, t, 21) });
    items.push({ k: 19.5, f: () => plant(ctx, 9.3, 9.3, true, t, 22) });
    items.push({ k: 9.9, f: () => plant(ctx, 9.2, 0.2, true, t, 23) });
    items.push({ k: 8.3, f: () => plant(ctx, 0.2, 7.6, false, t, 24) });
  }
  function arcade(ctx, x, y, col, t, seed) {
    box(ctx, x, y, 0.7, 0.7, 34, 0, '#111827', col, '#1f2937');
    const a = up(iso(x + 0.1, y + 0.7), 18), b = up(iso(x + 0.6, y + 0.7), 18);
    const f = Math.floor(t / 250 + seed) % 4;
    poly(ctx, [a, b, up(b, 10), up(a, 10)], ['#22d3ee', '#a78bfa', '#f472b6', '#facc15'][f]);
    const c = up(iso(x + 0.35, y + 0.75), 14); px(ctx, c[0] - 1, c[1] - 3, 2, 3, '#ef4444'); px(ctx, c[0] + 3, c[1] - 2, 2, 2, '#facc15');
    const m = up(iso(x + 0.1, y + 0.7), 30); const n = up(iso(x + 0.6, y + 0.7), 30); poly(ctx, [m, n, up(n, 4), up(m, 4)], col);
  }
  function beanbag(ctx, x, y, col, colD) {
    const p = iso(x, y);
    px(ctx, p[0] - 9, p[1] - 8, 18, 8, col); px(ctx, p[0] - 7, p[1] - 12, 14, 4, col); px(ctx, p[0] - 9, p[1] - 2, 18, 2, colD); px(ctx, p[0] - 4, p[1] - 10, 6, 2, colD);
  }
  function gameRoom(items, ctx, t, o = {}) {
    items.push({ k: 4 + 4 + 3.6, f: () => {
      box(ctx, 3.8, 4.0, 2.6, 1.4, 2, 11, '#15803d', '#166534', '#14532d');
      box(ctx, 4.0, 4.2, 0.12, 0.12, 11, 0, '#111', '#111', '#111'); box(ctx, 6.2, 5.2, 0.12, 0.12, 11, 0, '#111', '#111', '#111');
      box(ctx, 6.2, 4.2, 0.12, 0.12, 11, 0, '#111', '#111', '#111'); box(ctx, 4.0, 5.2, 0.12, 0.12, 11, 0, '#111', '#111', '#111');
      poly(ctx, [up(iso(5.1, 4.0), 13), up(iso(5.1, 5.4), 13), up(iso(5.1, 5.4), 17), up(iso(5.1, 4.0), 17)], 'rgba(248,250,252,.8)');
      const ph = (t / 900) % 2, bx = ph < 1 ? 4.2 + ph * 1.8 : 6.0 - (ph - 1) * 1.8;
      const bp = up(iso(bx, 4.7), 15 + Math.abs(Math.sin(ph * Math.PI)) * 8); px(ctx, bp[0] - 1, bp[1] - 1, 2, 2, '#fff7ed');
    } });
    [[1.0, 0.3, '#7c3aed'], [2.0, 0.3, '#db2777'], [3.0, 0.3, '#0891b2']].forEach(([x, y, c], i) => items.push({ k: x + y + 1.4, f: () => arcade(ctx, x, y, c, t, i) }));
    [[7.5, 7.0, '#f97316', '#c2410c'], [8.4, 6.2, '#22c55e', '#15803d'], [6.6, 8.0, '#3b82f6', '#1d4ed8']].forEach(([x, y, c, d]) => items.push({ k: x + y, f: () => beanbag(ctx, x, y, c, d) }));
    if (!o.noWall) items.push({ k: 7.0, f: () => { // dartboard on right wall
      ctx.save(); const p = wallR(6.8, 62); ctx.setTransform(1, 0.5, 0, 1, p[0], p[1]);
      ['#111827', '#ef4444', '#f8fafc', '#16a34a', '#ef4444'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 9 - i * 2, 0, 7); ctx.fill(); });
      ctx.restore();
    } });
    items.push({ k: 19.5, f: () => plant(ctx, 9.3, 9.3, true, t, 31) });
    items.push({ k: 8.3, f: () => plant(ctx, 0.2, 7.6, false, t, 32) });
    items.push({ k: CAT.x + CAT.y + 0.4, f: () => cat(ctx, t) });
  }
  function lounge(items, ctx, t, o = {}) {
    items.push({ k: 4.6, f: () => coffeeCounter(ctx, t) });
    items.push({ k: 4.4, f: () => { // kitchen counter + fridge along right wall
      box(ctx, 3.0, 0.05, 3.6, 0.75, 18, 0, '#e2e8f0', '#94a3b8', '#64748b');
      for (let i = 0; i < 4; i++) { const p = up(iso(3.3 + i * 0.9, 0.8), 4); poly(ctx, [p, [p[0] + 12, p[1] + 6], [p[0] + 12, p[1] - 4], [p[0], p[1] - 10]], '#cbd5e1'); }
      const s = up(iso(4.4, 0.4), 18); px(ctx, s[0] - 6, s[1] - 2, 12, 4, '#94a3b8');
    } });
    items.push({ k: 7.6, f: () => { box(ctx, 6.8, 0.05, 0.9, 0.8, 44, 0, '#f8fafc', '#e2e8f0', '#cbd5e1'); const h = up(iso(6.9, 0.85), 26); px(ctx, h[0] + 2, h[1] - 6, 2, 10, '#94a3b8'); } });
    [[3.4, 4.4], [6.3, 5.2]].forEach(([x, y], i) => {
      items.push({ k: x + y + 0.9, f: () => {
        box(ctx, x + 0.25, y + 0.25, 0.12, 0.12, 12, 0, '#334155', '#334155', '#1f2937');
        box(ctx, x, y, 0.6, 0.6, 2, 12, '#fef3c7', '#d6c39a', '#b8a57d');
        const m = up(iso(x + 0.3, y + 0.3), 14); px(ctx, m[0] - 1, m[1] - 3, 3, 3, ['#fca5a5', '#93c5fd'][i]);
      } });
      [[x - 0.6, y + 0.1], [x + 0.8, y + 0.1], [x + 0.1, y + 0.85]].forEach(([sx, sy]) => items.push({ k: sx + sy + 0.5, f: () => chair(ctx, sx, sy, '#f59e0b', null) }));
    });
    items.push({ k: 9.0, f: () => { // big sofa along front-left
      box(ctx, 1.0, 7.4, 0.7, 2.0, 7, 0, '#be123c', '#9f1239', '#881337');
      box(ctx, 0.8, 7.4, 0.25, 2.0, 18, 0, '#e11d48', '#be123c', '#9f1239');
    } });
    items.push({ k: 0.8, f: () => plant(ctx, 0.15, 0.15, true, t, 41) });
    items.push({ k: 9.9, f: () => plant(ctx, 9.2, 0.2, true, t, 42) });
    items.push({ k: 19.5, f: () => plant(ctx, 9.3, 9.3, true, t, 43) });
    if (!o.noLamp) items.push({ k: 15.6, f: () => floorLamp(ctx, 9.5, 6.0, t) });
    items.push({ k: CAT.x + CAT.y + 0.4, f: () => cat(ctx, t) });
  }
  function floorLamp(ctx, x, y, t) {
    const p = iso(x, y);
    const g = ctx.createRadialGradient(p[0], p[1] - 44, 2, p[0], p[1] - 44, 40);
    g.addColorStop(0, 'rgba(253,224,71,.35)'); g.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = g; ctx.fillRect(p[0] - 40, p[1] - 84, 80, 80);
    px(ctx, p[0] - 4, p[1] - 2, 8, 2, '#1f2937'); px(ctx, p[0] - 1, p[1] - 40, 2, 38, '#374151');
    px(ctx, p[0] - 6, p[1] - 52, 12, 12, '#fde68a'); px(ctx, p[0] - 7, p[1] - 41, 14, 2, '#f59e0b');
  }

  function desk(ctx, slot, agent, i, t, seated) {
    const { x, y } = slot, h = 14;
    const st = agent && agent.status;
    // chair + character behind desk
    const cp = iso(x + 1.05, y - 0.15);
    px(ctx, cp[0] - 7, cp[1] - 4, 14, 3, '#1c1828');
    if (agent && seated) drawCharacter(ctx, cp[0], cp[1] - 2, lookFor(agent), st, t + i * 333, 2);
    else { px(ctx, cp[0] - 10, cp[1] - 24, 20, 20, '#2a2438'); px(ctx, cp[0] - 10, cp[1] - 24, 20, 2, '#3d3552'); px(ctx, cp[0] - 1, cp[1] - 4, 2, 4, '#1c1828'); }
    box(ctx, x, y, 2, 1, 3, h - 3, '#b47a46', '#8d5a31', '#6f4425');
    box(ctx, x + 0.05, y + 0.85, 0.12, 0.12, h - 3, 0, '#5b3a22', '#5b3a22', '#4a2f1b');
    box(ctx, x + 1.83, y + 0.85, 0.12, 0.12, h - 3, 0, '#5b3a22', '#5b3a22', '#4a2f1b');
    box(ctx, x + 1.83, y + 0.05, 0.12, 0.12, h - 3, 0, '#5b3a22', '#5b3a22', '#4a2f1b');
    box(ctx, x + 1.3, y + 0.1, 0.6, 0.8, 8, 2, '#8d5a31', '#7a4d2a', '#5e3b20');
    const glow = !agent ? '#334155' : st === 'working' ? (Math.floor(t / 220) % 2 ? '#60a5fa' : '#3b82f6')
      : st === 'waiting' ? '#facc15' : st === 'error' ? (Math.floor(t / 400) % 2 ? '#ef4444' : '#991b1b') : '#64748b';
    const top = up(iso(x + 1.0, y + 0.72), h);
    if (slot.kit === 'monitor') {
      px(ctx, top[0] - 2, top[1] - 6, 4, 6, '#111827');
      px(ctx, top[0] - 12, top[1] - 20, 24, 15, '#111827');
      px(ctx, top[0] - 11, top[1] - 19, 22, 13, '#1f2937');
      px(ctx, top[0] - 2, top[1] - 14, 4, 3, glow);
      px(ctx, top[0] - 6, top[1] - 1, 12, 2, '#cbd5e1');
    } else {
      px(ctx, top[0] - 9, top[1] - 2, 18, 3, '#94a3b8');
      px(ctx, top[0] - 9, top[1] - 13, 18, 11, '#cbd5e1');
      px(ctx, top[0] - 8, top[1] - 12, 16, 9, '#a5b0c2');
      px(ctx, top[0] - 1, top[1] - 9, 3, 3, glow);
    }
    if (agent && seated && (st === 'working' || st === 'waiting')) { // screen light on face
      ctx.globalAlpha = 0.18; px(ctx, cp[0] - 7, cp[1] - 30, 14, 16, glow); ctx.globalAlpha = 1;
    }
    const R = rng(i * 97 + 5);
    const mug = up(iso(x + 0.35, y + 0.6), h);
    px(ctx, mug[0] - 2, mug[1] - 5, 4, 5, ['#f8fafc', '#fca5a5', '#93c5fd'][i % 3]); px(ctx, mug[0] + 2, mug[1] - 4, 1, 2, '#e2e8f0');
    const pap = up(iso(x + 1.6, y + 0.6), h);
    poly(ctx, [[pap[0] - 6, pap[1]], [pap[0], pap[1] - 3], [pap[0] + 6, pap[1]], [pap[0], pap[1] + 3]], '#f1f5f9');
    if (R() > 0.5) { const b = up(iso(x + 0.3, y + 0.25), h); px(ctx, b[0] - 4, b[1] - 6, 8, 2, '#ef4444'); px(ctx, b[0] - 4, b[1] - 4, 8, 2, '#3b82f6'); px(ctx, b[0] - 4, b[1] - 2, 8, 2, '#eab308'); }
    if (agent && seated) bubble(ctx, cp[0] + 10, cp[1] - 36, st, t);
    if (!agent && hoverDesk === i) {
      ctx.fillStyle = 'rgba(203,213,225,.55)'; ctx.font = '7px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center';
      ctx.fillText('+ free desk', top[0], top[1] - 24); ctx.textAlign = 'left';
    }
  }
  function bubble(ctx, x, y, st, t) {
    if (st === 'working') return;
    const c = STATUS[st];
    px(ctx, x, y, 13, 9, '#f8fafc'); px(ctx, x + 2, y + 9, 2, 2, '#f8fafc');
    if (st === 'waiting') { px(ctx, x + 5, y + 1, 3, 5, c); px(ctx, x + 5, y + 7, 3, 1, c); }
    else if (st === 'error') { px(ctx, x + 3, y + 1, 2, 2, c); px(ctx, x + 8, y + 1, 2, 2, c); px(ctx, x + 5, y + 3, 3, 3, c); px(ctx, x + 3, y + 6, 2, 2, c); px(ctx, x + 8, y + 6, 2, 2, c); }
    else { ctx.fillStyle = '#64748b'; ctx.font = 'bold 7px monospace'; ctx.fillText(Math.floor(t / 900) % 2 ? 'z' : 'zZ', x + 2, y + 7); }
  }

  // ---------- navigation ----------
  const G = 20, CELL = N / G; // 0.5-tile cells
  const cellOf = (x, y) => [Math.max(0, Math.min(G - 1, Math.floor(x / CELL))), Math.max(0, Math.min(G - 1, Math.floor(y / CELL)))];
  const centerOf = (gx, gy) => [(gx + 0.5) * CELL, (gy + 0.5) * CELL];
  const seatOf = d => ({ x: SLOTS[d].x + 1.05, y: SLOTS[d].y - 0.15 });

  // Points of interest. approach = where the path ends, spot = final position, act = what they do there.
  const POIS = [
    { id: 'coffee', approach: [1.25, 4.1], back: true, act: 'coffee', say: 'Coffee break' },
    { id: 'shelfA', approach: [1.3, 0.95], back: true, act: 'book', say: 'Reading' },
    { id: 'shelfB', approach: [7.4, 0.9], back: true, act: 'book', say: 'Reading' },
    { id: 'window1', approach: [0.85, 2.1], back: true, act: 'window', say: 'Enjoying the view' },
    { id: 'window2', approach: [0.85, 5.6], back: true, act: 'window', say: 'Enjoying the view' },
    { id: 'cat', approach: [5.75, 6.95], act: 'cat', say: 'Petting the cat' },
    { id: 'plantA', approach: [8.8, 0.95], act: 'water', say: 'Watering plants' },
    { id: 'plantB', approach: [8.75, 8.85], act: 'water', say: 'Watering plants' },
    { id: 'plantC', approach: [0.9, 8.0], act: 'water', say: 'Watering plants' },
    { id: 'sofa1', approach: [4.25, 4.75], spot: [5.05, 4.5], act: 'sofa', say: 'Taking a break' },
    { id: 'sofa2', approach: [6.6, 4.75], spot: [5.8, 4.5], act: 'sofa', say: 'Taking a break' },
    { id: 'stretch1', approach: [3.6, 7.0], act: 'stretch', say: 'Stretching' },
    { id: 'stretch2', approach: [7.0, 3.4], act: 'stretch', say: 'Stretching' },
  ];

  function buildGrid(visibleDesks) {
    const blocked = Array.from({ length: G }, () => new Uint8Array(G));
    const mark = (x0, y0, x1, y1) => {
      for (let gx = 0; gx < G; gx++) for (let gy = 0; gy < G; gy++) {
        const cx0 = gx * CELL, cy0 = gy * CELL;
        if (cx0 < x1 && cx0 + CELL > x0 && cy0 < y1 && cy0 + CELL > y0) blocked[gx][gy] = 1;
      }
    };
    mark(0, 0, N, 0.45); mark(0, 0, 0.45, N);
    for (const d of visibleDesks) { const s = SLOTS[d]; mark(s.x - 0.05, s.y - 0.55, s.x + 2.05, s.y + 1.05); }
    mark(0.4, 0, 2.2, 0.65); mark(6.6, 0, 8.2, 0.65);         // shelves
    mark(0.1, 3.6, 0.8, 4.6);                                   // coffee counter
    mark(4.45, 4.85, 6.05, 6.05); mark(4.5, 4.0, 6.3, 4.7);     // table, sofa
    mark(9.15, 0.15, 9.75, 0.75); mark(9.25, 9.25, 9.85, 9.85); mark(0.15, 7.55, 0.6, 8.0); mark(0.1, 0.1, 0.7, 0.7); // plants
    mark(9.35, 5.85, 9.65, 6.15);                               // lamp
    mark(CAT.x - 0.35, CAT.y - 0.15, CAT.x + 0.35, CAT.y + 0.2); // cat
    return blocked;
  }
  function nearestFree(blocked, gx, gy) {
    if (!blocked[gx][gy]) return [gx, gy];
    const seen = new Set([gx + ',' + gy]), q = [[gx, gy]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        const k = nx + ',' + ny; if (seen.has(k)) continue; seen.add(k);
        if (!blocked[nx][ny]) return [nx, ny];
        q.push([nx, ny]);
      }
    }
    return [gx, gy];
  }
  function findPath(blocked, from, to) {
    const s = nearestFree(blocked, ...cellOf(...from)), e = nearestFree(blocked, ...cellOf(...to));
    const prev = new Map(), key = (x, y) => x * G + y;
    const q = [s]; prev.set(key(...s), null);
    while (q.length) {
      const [x, y] = q.shift();
      if (x === e[0] && y === e[1]) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= G || ny >= G || blocked[nx][ny] || prev.has(key(nx, ny))) continue;
        prev.set(key(nx, ny), [x, y]); q.push([nx, ny]);
      }
    }
    if (!prev.has(key(...e))) return null;
    const cells = []; let c = e;
    while (c) { cells.unshift(c); c = prev.get(key(...c)); }
    // keep only turning points
    const pts = [];
    for (let i = 0; i < cells.length; i++) {
      const a = cells[i - 1], b = cells[i], n = cells[i + 1];
      if (!a || !n || (b[0] - a[0]) !== (n[0] - b[0]) || (b[1] - a[1]) !== (n[1] - b[1])) pts.push(centerOf(...b));
    }
    return pts;
  }

  // ---------- public ----------
  function create(canvas, cfg = {}) {
    const layout = cfg.layout || 'office';
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    const bgx = bg.getContext('2d');
    let lastBg = -1e9;
    let agents = [];
    let hover = -1, selectedDesk = -1;
    let wanderOn = true, theme = THEMES[cfg.theme] || THEMES.night;
    let grid = buildGrid([0]), gridKey = '';
    const walkers = new Map(); // id -> wander state
    let onFrame = null, lastT = 0;

    function visibleDesks() {
      const used = new Set(agents.map(a => a.desk));
      let free = 0; while (used.has(free)) free++;
      const v = [...used].filter(d => d < SLOTS.length);
      if (free < SLOTS.length) v.push(free);
      return v;
    }
    const roaming = a => a.status === 'idle' || a.status === 'waiting';

    function step(t, dt) {
      const vis = visibleDesks(), gk = vis.sort().join(',');
      if (gk !== gridKey) { grid = buildGrid(vis); gridKey = gk; }
      const ids = new Set(agents.map(a => a.id));
      for (const id of walkers.keys()) if (!ids.has(id)) walkers.delete(id);
      for (const a of agents) {
        if (a.desk >= SLOTS.length) continue;
        let w = walkers.get(a.id);
        const seat = seatOf(a.desk);
        if (!w) { w = { mode: 'seated', x: seat.x, y: seat.y, path: [], nextAt: t + 3000 + Math.random() * 7000, lastStatus: a.status, walk: 0 }; walkers.set(a.id, w); }
        if (w.desk !== a.desk) { w.desk = a.desk; if (w.mode === 'seated') { w.x = seat.x; w.y = seat.y; } }
        if (a.status !== w.lastStatus) {
          if (roaming(a) && !roaming({ status: w.lastStatus })) w.nextAt = t + 6000 + Math.random() * 8000;
          w.lastStatus = a.status;
        }
        const goHome = (fast) => {
          const exit = centerOf(...nearestFree(grid, ...cellOf(seat.x, seat.y)));
          const path = findPath(grid, [w.x, w.y], exit) || [];
          w.path = [...path, [seat.x, seat.y]]; w.mode = 'returning'; w.fast = fast; w.poi = null; w.act = null;
        };
        if (!wanderOn || !roaming(a)) {
          if (w.mode === 'walking' || w.mode === 'activity') goHome(true);
        } else if (w.mode === 'seated' && t > w.nextAt) {
          const taken = new Set([...walkers.values()].map(o => o.poi && o.poi.id));
          const options = POIS.filter(p => !taken.has(p.id));
          const poi = options[Math.floor(Math.random() * options.length)];
          if (poi) {
            const exit = centerOf(...nearestFree(grid, ...cellOf(seat.x, seat.y)));
            const path = findPath(grid, exit, poi.approach);
            if (path) { w.path = [exit, ...path, ...(poi.spot ? [poi.spot] : [])]; w.mode = 'walking'; w.poi = poi; w.fast = false; }
            else w.nextAt = t + 5000;
          }
        } else if (w.mode === 'activity' && t > w.until) {
          if (Math.random() < 0.45) {
            const taken = new Set([...walkers.values()].map(o => o.poi && o.poi.id));
            const options = POIS.filter(p => !taken.has(p.id) || p === w.poi).filter(p => p !== w.poi);
            const poi = options[Math.floor(Math.random() * options.length)];
            const from = w.poi && w.poi.spot ? w.poi.approach : [w.x, w.y];
            const path = poi && findPath(grid, from, poi.approach);
            if (path) { w.path = [...(w.poi && w.poi.spot ? [w.poi.approach] : []), ...path, ...(poi.spot ? [poi.spot] : [])]; w.mode = 'walking'; w.poi = poi; w.act = null; }
            else goHome(false);
          } else {
            if (w.poi && w.poi.spot) { const back = w.poi.approach; goHome(false); w.path.unshift(back); } else goHome(false);
          }
        }
        // movement
        if (w.mode === 'walking' || w.mode === 'returning') {
          let remaining = (w.fast ? 2.8 : 1.25) * dt / 1000;
          while (remaining > 0 && w.path.length) {
            const [tx, ty] = w.path[0];
            const dx = tx - w.x, dy = ty - w.y, dist = Math.hypot(dx, dy);
            if (dist > 0.001) w.back = (dx + dy) < -0.001 ? true : (dx + dy) > 0.001 ? false : w.back;
            if (dist <= remaining) { w.x = tx; w.y = ty; w.path.shift(); remaining -= dist; }
            else { w.x += dx / dist * remaining; w.y += dy / dist * remaining; remaining = 0; }
          }
          w.walk += dt / 170;
          if (!w.path.length) {
            if (w.mode === 'returning') { w.mode = 'seated'; w.x = seat.x; w.y = seat.y; w.nextAt = t + 15000 + Math.random() * 20000; }
            else { w.mode = 'activity'; w.started = t; w.until = t + 6000 + Math.random() * 7000; w.act = w.poi.act; }
          }
        }
      }
    }

    function drawWalker(a, w, t) {
      const p = iso(w.x, w.y);
      const look = lookFor(a);
      const opts = { noChair: true, pose: 'stand', walk: -1 };
      if (w.mode === 'walking' || w.mode === 'returning') { opts.walk = w.walk; opts.back = w.back; }
      else if (w.mode === 'activity') {
        const el = t - w.started;
        switch (w.act) {
          case 'coffee': opts.back = el < 1800; if (!opts.back) opts.hold = 'mug'; break;
          case 'book': opts.back = el < 1600; if (!opts.back) opts.hold = 'book'; break;
          case 'window': opts.back = true; break;
          case 'cat': opts.happy = true; break;
          case 'water': opts.hold = 'can'; break;
          case 'sofa': opts.pose = 'sofa'; opts.hold = el > 2500 && el < 6000 ? 'mug' : null; opts.sleep = el > 6000; break;
          case 'stretch': opts.armsUp = Math.floor(el / 900) % 2 === 0; break;
        }
      }
      // shadow
      ctx.globalAlpha = 0.25; px(ctx, p[0] - 7, p[1] - 1, 14, 3, '#000'); ctx.globalAlpha = 1;
      drawCharacter(ctx, p[0], opts.pose === 'sofa' ? p[1] - 8 : p[1], look, a.status, t, 2, opts);
      const top = p[1] - (opts.pose === 'sofa' ? 44 : 44);
      if (a.status === 'waiting') bubble(ctx, p[0] + 9, top, 'waiting', t);
      else if (w.mode === 'activity' && w.act === 'cat') heart(ctx, p[0] + 9, top, t);
      else if (w.mode === 'activity' && w.act === 'sofa' && opts.sleep) bubble(ctx, p[0] + 9, top, 'idle', t);
    }
    function heart(ctx, x, y, t) {
      const f = Math.floor(t / 400) % 2;
      px(ctx, x, y, 13, 9, '#f8fafc'); px(ctx, x + 2, y + 9, 2, 2, '#f8fafc');
      const c = '#ef4444';
      px(ctx, x + 3, y + 2, 3, 2, c); px(ctx, x + 7, y + 2, 3, 2, c); px(ctx, x + 3, y + 4 - f * 0, 7, 2, c); px(ctx, x + 4, y + 6, 5, 1, c); px(ctx, x + 6, y + 7, 1, 1, c);
    }

    function frame(t) {
      useGeom(210, 112);
      const dt = Math.min(100, t - (lastT || t)); lastT = t;
      step(t, dt);
      hoverDesk = hover;
      if (t - lastBg > 2000) { drawStatic(bgx, t, theme); lastBg = t; }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bg, 0, 0);
      const byDesk = {}; for (const a of agents) byDesk[a.desk] = a;
      const items = [];
      if (layout !== 'office') {
        ({ meeting: meetingRoom, games: gameRoom, lounge })[layout](items, ctx, t);
        items.sort((a, b) => a.k - b.k).forEach(it => it.f());
        if (onFrame) onFrame();
        requestAnimationFrame(frame);
        return;
      }
      items.push({ k: 0.6 + 0.5, f: () => bookshelf(ctx, 0.4, 0.05, 1.8, 3) });
      items.push({ k: 8.2 + 0.5, f: () => bookshelf(ctx, 6.6, 0.05, 1.6, 9) });
      items.push({ k: 0.8, f: () => plant(ctx, 0.15, 0.15, true, t, 1) });
      items.push({ k: 4.6, f: () => coffeeCounter(ctx, t) });
      items.push({ k: 9.9, f: () => plant(ctx, 9.2, 0.2, true, t, 3) });
      items.push({ k: 19.5, f: () => plant(ctx, 9.3, 9.3, true, t, 5) });
      items.push({ k: 8.3, f: () => plant(ctx, 0.2, 7.6, false, t, 6) });
      items.push({ k: 9.0, f: () => sofa(ctx) });
      items.push({ k: 12.1, f: () => coffeeTable(ctx, t) });
      items.push({ k: CAT.x + CAT.y + 0.4, f: () => cat(ctx, t) });
      items.push({ k: 15.6, f: () => floorLamp(ctx, 9.5, 6.0, t) });
      const vis = new Set(visibleDesks());
      SLOTS.forEach((s, i) => {
        if (!vis.has(i)) return;
        const a = byDesk[i]; const w = a && walkers.get(a.id);
        items.push({ k: s.x + s.y + 2.5, f: () => desk(ctx, s, a, i, t, !w || w.mode === 'seated') });
      });
      for (const a of agents) {
        const w = walkers.get(a.id);
        if (!w || w.mode === 'seated') continue;
        const onSofa = w.mode === 'activity' && w.act === 'sofa';
        items.push({ k: onSofa ? 9.05 : w.x + w.y + 0.35, f: () => drawWalker(a, w, t) });
      }
      items.sort((a, b) => a.k - b.k).forEach(it => it.f());
      // highlight
      for (const [d, col] of [[hover, 'rgba(96,165,250,.9)'], [selectedDesk, 'rgba(248,250,252,.95)']]) {
        if (d < 0 || d >= SLOTS.length || !vis.has(d)) continue;
        const s = SLOTS[d];
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash(col.startsWith('rgba(248') ? [] : [3, 2]);
        ctx.beginPath();
        [[s.x - 0.25, s.y - 0.75], [s.x + 2.25, s.y - 0.75], [s.x + 2.25, s.y + 1.25], [s.x - 0.25, s.y + 1.25]].forEach((p, i) => i ? ctx.lineTo(...iso(...p)) : ctx.moveTo(...iso(...p)));
        ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
      }
      if (onFrame) onFrame();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function hitTest(cx, cy) { // canvas coords -> { agentId } | { desk }
      useGeom(210, 112);
      for (const a of agents) {
        const w = walkers.get(a.id);
        if (!w || w.mode === 'seated') continue;
        const p = iso(w.x, w.y);
        if (Math.abs(cx - p[0]) < 12 && cy < p[1] + 3 && cy > p[1] - 42) return { agentId: a.id };
      }
      const vis = new Set(visibleDesks());
      let best = -1, bd = 1e9;
      SLOTS.forEach((s, i) => {
        if (!vis.has(i)) return;
        const c = iso(s.x + 1, s.y + 0.2); const dx = cx - c[0], dy = cy - (c[1] - 22);
        if (Math.abs(dx) < 34 && dy > -30 && dy < 34) { const d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; best = i; } }
      });
      if (best < 0) return null;
      const a = agents.find(x => x.desk === best);
      return a ? { agentId: a.id, desk: best } : { desk: best };
    }
    function labelPoint(a) {
      useGeom(210, 112);
      const w = walkers.get(a.id);
      if (!w || w.mode === 'seated') { const s = SLOTS[a.desk]; const p = iso(s.x + 1.05, s.y - 0.15); return { x: p[0] / W, y: (p[1] - 50) / H }; }
      const p = iso(w.x, w.y); const onSofa = w.mode === 'activity' && w.act === 'sofa';
      return { x: p[0] / W, y: (p[1] - (onSofa ? 44 : 46)) / H };
    }
    function activity(a) {
      const w = walkers.get(a.id);
      if (!w || w.mode === 'seated') return null;
      if (w.mode === 'returning') return 'Heading back to the desk';
      if (w.mode === 'walking') return w.poi ? ({ coffee: 'Going for coffee', book: 'Going to the bookshelf', window: 'Going to the window', cat: 'Going to see the cat', water: 'Going to water plants', sofa: 'Going to the sofa', stretch: 'Taking a walk' }[w.poi.act]) : 'Walking';
      return w.poi ? w.poi.say : null;
    }
    return {
      setAgents(list) { agents = list; },
      setHover(d) { hover = d; },
      setSelected(d) { selectedDesk = d; },
      setWander(v) { wanderOn = v; },
      setTheme(name) { theme = THEMES[name] || THEMES.night; lastBg = -1e9; },
      onFrame(fn) { onFrame = fn; },
      hitTest, labelPoint, activity, W, H,
      deskAt(cx, cy) { const h = hitTest(cx, cy); return h && h.desk !== undefined ? h.desk : -1; },
    };
  }

  // =====================================================================
  // World: all rooms in ONE building, joined by hallways and doorways.
  // Rooms are 10x10 tiles on a grid with 2-tile hallways between them.
  // =====================================================================
  const DOORS = { // door ranges (local tiles) per layout and wall side
    office: { xp: [5, 6.5], xm: [5, 6.5], yp: [3, 4.5], ym: [3, 4.5] },
    lounge: { xp: [5, 6.5], xm: [5, 6.5], yp: [3, 4.5], ym: [1.5, 3] },
    games: { xp: [5, 6.5], xm: [5, 6.5], yp: [3, 4.5], ym: [5, 6.5] },
    meeting: { xp: [5, 6.5], xm: [5, 6.5], yp: [3, 4.5], ym: [3, 4.5] },
  };
  const ROOM_POIS = {
    office: (r) => [
      { approach: [1.3, 0.95], back: true, act: 'book', say: 'Reading' },
      { approach: [7.4, 0.9], back: true, act: 'book', say: 'Reading' },
      { approach: [1.25, 4.1], back: true, act: 'coffee', say: 'Coffee break' },
      ...(r.outerL ? [{ approach: [0.85, 2.1], back: true, act: 'window', say: 'Enjoying the view' }, { approach: [0.85, 5.6], back: true, act: 'window', say: 'Enjoying the view' }] : []),
      { approach: [5.75, 6.95], act: 'cat', say: 'Petting the cat' },
      { approach: [8.8, 0.95], act: 'water', say: 'Watering plants' },
      { approach: [4.25, 4.75], spot: [5.05, 4.5], act: 'sofa', say: 'Taking a break', k: 9.05 },
      { approach: [6.6, 4.75], spot: [5.8, 4.5], act: 'sofa', say: 'Taking a break', k: 9.05 },
    ],
    lounge: () => [
      { approach: [1.25, 4.1], back: true, act: 'coffee', say: 'Making coffee' },
      { approach: [7.25, 1.3], back: true, act: 'fridge', say: 'Raiding the fridge' },
      { approach: [2.75, 5.4], spot: [3.03, 4.75], act: 'sofa', say: 'Having a snack' },
      { approach: [4.65, 5.4], spot: [4.43, 4.75], act: 'sofa', say: 'Having a snack' },
      { approach: [5.6, 6.25], spot: [5.93, 5.55], act: 'sofa', say: 'Chatting' },
      { approach: [7.65, 6.25], spot: [7.33, 5.55], act: 'sofa', say: 'Chatting' },
      { approach: [2.2, 8.0], spot: [1.35, 8.0], act: 'sofa', say: 'Relaxing' },
      { approach: [2.2, 8.9], spot: [1.35, 8.9], act: 'sofa', say: 'Relaxing' },
      { approach: [5.75, 6.95], act: 'cat', say: 'Petting the cat' },
    ],
    games: () => [
      { approach: [1.35, 1.4], back: true, act: 'arcade', say: 'Playing arcade' },
      { approach: [2.35, 1.4], back: true, act: 'arcade', say: 'Playing arcade' },
      { approach: [3.35, 1.4], back: true, act: 'arcade', say: 'Playing arcade' },
      { approach: [3.4, 4.7], act: 'pingpong', say: 'Playing ping-pong' },
      { approach: [6.8, 4.7], act: 'pingpong', back: true, say: 'Playing ping-pong' },
      { approach: [7.5, 7.7], spot: [7.5, 7.05], act: 'sofa', say: 'Chilling' },
      { approach: [8.4, 6.9], spot: [8.4, 6.25], act: 'sofa', say: 'Chilling' },
      { approach: [6.6, 8.7], spot: [6.6, 8.05], act: 'sofa', say: 'Chilling' },
      { approach: [5.75, 6.95], act: 'cat', say: 'Petting the cat' },
    ],
    meeting: () => [0, 1, 2, 3].map(i => ({ approach: [3.62 + i * 0.95, 6.8], spot: [3.62 + i * 0.95, 6.07], act: 'sofa', say: 'In a meeting' })),
  };
  const catBlock = () => [CAT.x - 0.35, CAT.y - 0.15, CAT.x + 0.35, CAT.y + 0.2];
  const ROOM_BLOCKS = {
    office: (vis) => [
      ...vis.map(d => { const s = SLOTS[d]; return [s.x - 0.05, s.y - 0.55, s.x + 2.05, s.y + 1.05]; }),
      [0.4, 0, 2.2, 0.65], [6.6, 0, 8.2, 0.65], [0.1, 3.6, 0.8, 4.6], [4.45, 4.85, 6.05, 6.05], [4.5, 4.0, 6.3, 4.7],
      [9.15, 0.15, 9.75, 0.75], [9.25, 9.25, 9.85, 9.85], [0.15, 7.55, 0.6, 8.0], [0.1, 0.1, 0.7, 0.7], catBlock(),
    ],
    lounge: () => [
      [0.1, 3.6, 0.8, 4.6], [3.0, 0, 6.6, 0.85], [6.8, 0, 7.7, 0.85], [3.4, 4.4, 4.0, 5.0], [6.3, 5.2, 6.9, 5.8],
      [2.8, 4.5, 3.25, 4.95], [4.2, 4.5, 4.65, 4.95], [3.5, 5.25, 3.95, 5.7], [5.7, 5.3, 6.15, 5.75], [7.1, 5.3, 7.55, 5.75], [6.4, 6.05, 6.85, 6.5],
      [0.8, 7.4, 1.7, 9.4], [0.1, 0.1, 0.7, 0.7], [9.15, 0.15, 9.75, 0.75], [9.25, 9.25, 9.85, 9.85], catBlock(),
    ],
    games: () => [
      [3.8, 4.0, 6.4, 5.4], [1.0, 0.3, 1.7, 1.0], [2.0, 0.3, 2.7, 1.0], [3.0, 0.3, 3.7, 1.0],
      [7.2, 6.75, 7.8, 7.3], [8.1, 5.95, 8.7, 6.5], [6.3, 7.75, 6.9, 8.3], [9.25, 9.25, 9.85, 9.85], [0.15, 7.55, 0.6, 8.0], catBlock(),
    ],
    meeting: () => [
      [3.2, 3.5, 7.2, 5.5], [3.3, 2.85, 6.8, 3.4], [3.3, 5.8, 6.8, 6.35], [2.35, 4.05, 2.9, 4.6], [7.55, 4.05, 8.1, 4.6],
      [0.1, 0.1, 0.7, 0.7], [9.15, 0.15, 9.75, 0.75], [9.25, 9.25, 9.85, 9.85], [0.15, 7.55, 0.6, 8.0],
    ],
  };


  // ---------- outdoors: grass, streets, sidewalks, trees, cars ----------
  const treeCache = new Map();
  function treeSprite(seed, size) {
    const key = seed + ':' + size;
    if (treeCache.has(key)) return treeCache.get(key);
    const c = document.createElement('canvas'); c.width = 64; c.height = 90;
    const g = c.getContext('2d'), R = rng(seed * 31 + 7), cx = 32, by = 84;
    const s = size;
    g.globalAlpha = 0.25; g.fillStyle = '#000'; g.fillRect(cx - 14 * s, by - 3, 28 * s, 5); g.globalAlpha = 1;
    px(g, cx - 2, by - 18 * s, 4, 18 * s, '#6b4226'); px(g, cx - 2, by - 18 * s, 1, 18 * s, '#8a5a34');
    const greens = R() > 0.7 ? ['#1f5130', '#2b6b3c', '#378a4b', '#4fa85f'] : ['#1d4a2a', '#256238', '#2f7a44', '#3f9a55'];
    const top = by - 18 * s, rad = 15 * s;
    for (let i = 0; i < 70; i++) {
      const a = R() * Math.PI * 2, r = Math.sqrt(R()) * rad;
      const x = cx + Math.cos(a) * r, y = top - 10 * s + Math.sin(a) * r * 0.85;
      const shade = y < top - 14 * s ? 3 : y < top - 6 * s ? 2 : Math.cos(a) > 0.3 ? 1 : 0;
      px(g, x - 2, y - 2, 5, 5, greens[Math.min(3, shade + (R() > 0.8 ? 1 : 0))]);
    }
    if (R() > 0.6) for (let i = 0; i < 5; i++) px(g, cx - rad * 0.6 + R() * rad * 1.2, top - 16 * s + R() * rad, 2, 2, ['#fca5a5', '#fde68a', '#f9a8d4'][i % 3]);
    treeCache.set(key, c); return c;
  }
  function tree(ctx, x, y, seed, size) { const p = iso(x, y); ctx.drawImage(treeSprite(seed, size), Math.round(p[0] - 32), Math.round(p[1] - 84)); }
  function bush(ctx, x, y, seed) {
    const p = iso(x, y), R = rng(seed);
    for (let i = 0; i < 12; i++) px(ctx, p[0] - 8 + R() * 14, p[1] - 9 + R() * 7, 4, 4, ['#1f5130', '#2b6b3c', '#378a4b'][i % 3]);
    if (seed % 3 === 0) for (let i = 0; i < 3; i++) px(ctx, p[0] - 6 + R() * 12, p[1] - 9 + R() * 5, 2, 2, '#f472b6');
  }
  function bench(ctx, x, y, axis) {
    if (axis === 'x') { box(ctx, x, y, 1.2, 0.35, 2, 5, '#a16207', '#854d0e', '#713f12'); box(ctx, x, y, 1.2, 0.08, 7, 5, '#a16207', '#854d0e', '#713f12'); }
    else { box(ctx, x, y, 0.35, 1.2, 2, 5, '#a16207', '#854d0e', '#713f12'); box(ctx, x, y, 0.08, 1.2, 7, 5, '#a16207', '#854d0e', '#713f12'); }
  }
  function streetLamp(ctx, x, y, t) {
    const p = iso(x, y);
    const g = ctx.createRadialGradient(p[0], p[1] - 4, 2, p[0], p[1] - 4, 34);
    g.addColorStop(0, 'rgba(253,230,138,.28)'); g.addColorStop(1, 'rgba(253,230,138,0)');
    ctx.fillStyle = g; ctx.fillRect(p[0] - 36, p[1] - 30, 72, 52);
    px(ctx, p[0] - 1, p[1] - 46, 2, 46, '#1f2937'); px(ctx, p[0] - 4, p[1] - 2, 8, 2, '#111827');
    px(ctx, p[0] - 4, p[1] - 50, 8, 4, '#374151'); px(ctx, p[0] - 3, p[1] - 46, 6, 2, '#fde68a');
  }
  function fountain(ctx, x, y, t) {
    box(ctx, x - 1, y - 1, 2, 2, 5, 0, '#94a3b8', '#64748b', '#475569');
    const w = Math.floor(t / 300) % 2;
    poly(ctx, [up(iso(x - 0.8, y - 0.8), 5), up(iso(x + 0.8, y - 0.8), 5), up(iso(x + 0.8, y + 0.8), 5), up(iso(x - 0.8, y + 0.8), 5)], w ? '#38bdf8' : '#0ea5e9');
    box(ctx, x - 0.15, y - 0.15, 0.3, 0.3, 12, 5, '#cbd5e1', '#94a3b8', '#64748b');
    const p = up(iso(x, y), 17);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + t / 600; px(ctx, p[0] + Math.cos(a) * (3 + (t / 80 + i) % 6), p[1] - 2 + ((t / 80 + i * 2) % 6), 1, 2, '#bae6fd'); }
    px(ctx, p[0] - 1, p[1] - 6 - w, 2, 6, '#e0f2fe');
  }
  function car(ctx, x, y, axis, col, dir) {
    const L = 1.7, Wd = 0.8;
    const [w, d] = axis === 'x' ? [L, Wd] : [Wd, L];
    const x0 = x - w / 2, y0 = y - d / 2;
    ctx.globalAlpha = 0.25; poly(ctx, [iso(x0 - 0.05, y0 - 0.05), iso(x0 + w + 0.1, y0 - 0.05), iso(x0 + w + 0.1, y0 + d + 0.1), iso(x0 - 0.05, y0 + d + 0.1)], '#000'); ctx.globalAlpha = 1;
    box(ctx, x0, y0, w, d, 6, 2, col[0], col[1], col[2]);
    const cw = axis === 'x' ? 0.85 : 0.68, cd = axis === 'x' ? 0.68 : 0.85;
    const cx0 = axis === 'x' ? x0 + (dir > 0 ? 0.3 : 0.55) : x0 + 0.06, cy0 = axis === 'x' ? y0 + 0.06 : y0 + (dir > 0 ? 0.3 : 0.55);
    box(ctx, cx0, cy0, cw, cd, 5, 8, col[0], '#bfdbfe', '#93c5fd');
    // lights
    const front = axis === 'x' ? up(iso(dir > 0 ? x0 + w : x0, y0 + d), 5) : up(iso(x0 + w, dir > 0 ? y0 + d : y0), 5);
    px(ctx, front[0] - 2, front[1] - 1, 3, 2, '#fef08a');
  }
  const CAR_COLS = [['#ef4444', '#b91c1c', '#991b1b'], ['#3b82f6', '#1d4ed8', '#1e40af'], ['#f8fafc', '#cbd5e1', '#94a3b8'], ['#facc15', '#ca8a04', '#a16207'], ['#22c55e', '#15803d', '#166534'], ['#111827', '#1f2937', '#030712'], ['#a855f7', '#7e22ce', '#6b21a8']];

  function buildOutdoors(WNX, WNY, MG) {
    const roadA = [WNY + 3, WNY + 6], roadB = [WNX + 3, WNX + 6];
    const lot = { x0: WNX + 6.6, x1: WNX + MG + 2, y0: 0.5, y1: Math.min(WNY - 1, 11) };
    const isRoad = (x, y) => (y >= roadA[0] && y < roadA[1]) || (x >= roadB[0] && x < roadB[1]);
    const isWalk = (x, y) => (x >= WNX && x < WNX + 2.6 && y < WNY + 2.6) || (y >= WNY && y < WNY + 2.6 && x < WNX + 2.6);
    const isLot = (x, y) => x >= lot.x0 && x < lot.x1 && y >= lot.y0 && y < lot.y1;
    const inside = (x, y) => x >= -0.2 && y >= -0.2 && x < WNX + 0.2 && y < WNY + 0.2;
    const back = [], front = [], cars = [];
    const R = rng(4242);
    const free = (x, y, r) => !inside(x, y) && !isRoad(x, y) && !isRoad(x + r, y + r) && !isRoad(x - r, y - r) && !isWalk(x, y) && !isWalk(x + r, y + r) && !isLot(x, y) && !isLot(x + r, y + r)
      && !(x > WNX - 1 && x < WNX + 3.5 && y > WNY - 1 && y < WNY + 3.5);
    // trees: rows behind the building + scattered park trees in front
    const spots = [];
    for (let x = -MG + 1; x < WNX + MG; x += 2.6) spots.push([x + R() * 0.8, -1.6 - R() * 2.5]);
    for (let y = -MG + 1; y < WNY + MG; y += 2.6) spots.push([-1.6 - R() * 2.5, y + R() * 0.8]);
    for (let i = 0; i < 160; i++) spots.push([-MG + R() * (WNX + 2 * MG), -MG + R() * (WNY + 2 * MG)]);
    const placed = [];
    for (const [x, y] of spots) {
      if (!free(x, y, 0.9)) continue;
      if (placed.some(([px2, py2]) => Math.hypot(px2 - x, py2 - y) < 1.8)) continue;
      placed.push([x, y]);
      const seed = Math.floor(R() * 1000), size = 0.85 + R() * 0.45;
      const item = { k: x + y + 0.2, draw: (c) => tree(c, x, y, seed, size) };
      ((x < 0 && y <= WNY) || (y < 0 && x <= WNX) ? back : front).push(item);
    }
    for (let i = 0; i < 50; i++) {
      const x = -MG + R() * (WNX + 2 * MG), y = -MG + R() * (WNY + 2 * MG);
      if (!free(x, y, 0.4)) continue;
      const seed = Math.floor(R() * 999);
      ((x < 0 && y <= WNY) || (y < 0 && x <= WNX) ? back : front).push({ k: x + y, draw: (c) => bush(c, x, y, seed) });
    }
    // sidewalk furniture
    for (let x = 1.5; x < WNX; x += 5) { front.push({ k: x + WNY + 2.3, draw: (c, t) => streetLamp(c, x, WNY + 2.3, t) }); }
    for (let y = 1.5; y < WNY; y += 5) { front.push({ k: WNX + 2.3 + y, draw: (c, t) => streetLamp(c, WNX + 2.3, y, t) }); }
    const pois = [], blocks = [];
    for (let x = 1.5; x < WNX; x += 5) blocks.push([x - 0.15, WNY + 2.15, x + 0.15, WNY + 2.45]);
    for (let y = 1.5; y < WNY; y += 5) blocks.push([WNX + 2.15, y - 0.15, WNX + 2.45, y + 0.15]);
    for (let x = 4; x < WNX - 1; x += 5) {
      front.push({ k: x + WNY + 2.6, draw: (c) => bench(c, x, WNY + 1.9, 'x') });
      blocks.push([x, WNY + 1.9, x + 1.2, WNY + 2.25]);
      pois.push({ approach: [x + 0.6, WNY + 1.4], spot: [x + 0.6, WNY + 2.05], act: 'sofa', say: 'Sitting outside' });
    }
    for (let y = 4; y < WNY - 1; y += 5) {
      front.push({ k: WNX + 2.6 + y, draw: (c) => bench(c, WNX + 1.9, y, 'y') });
      blocks.push([WNX + 1.9, y, WNX + 2.25, y + 1.2]);
      pois.push({ approach: [WNX + 1.4, y + 0.6], spot: [WNX + 2.05, y + 0.6], act: 'sofa', say: 'Sitting outside' });
    }
    front.push({ k: WNX + WNY + 2.6, draw: (c, t) => fountain(c, WNX + 1.3, WNY + 1.3, t) });
    blocks.push([WNX + 0.3, WNY + 0.3, WNX + 2.3, WNY + 2.3]);
    pois.push({ approach: [WNX + 1.3, WNY - 0.0 + 2.45], back: true, act: 'fountain', say: 'At the fountain' });
    pois.push({ approach: [WNX + 2.45, WNY + 1.3], back: true, act: 'fountain', say: 'At the fountain' });
    pois.push({ approach: [WNX * 0.25, WNY + 1.2], act: 'stretch', say: 'Getting some fresh air' });
    pois.push({ approach: [WNX + 1.2, WNY * 0.3], act: 'stretch', say: 'Getting some fresh air' });
    // parked cars
    for (let y = lot.y0 + 0.9, i = 0; y < lot.y1 - 0.5; y += 1.3, i++) {
      if (R() < 0.25) continue;
      const x = lot.x0 + 1.2, col = CAR_COLS[Math.floor(R() * CAR_COLS.length)];
      front.push({ k: x + y + 0.4, draw: (c) => car(c, x, y, 'x', col, 1) });
    }
    // moving cars on both streets
    const spanA = [-MG - 3, WNX + MG + 3], spanB = [-MG - 3, WNY + MG + 3];
    const mk = (axis, lane, dir, speed, offset, col) => ({ axis, dir, col, pos: (t) => {
      const [a, b] = axis === 'x' ? spanA : spanB, L = b - a;
      let v = ((t / 1000) * speed + offset) % L; if (dir < 0) v = L - v;
      const along = a + v;
      return axis === 'x' ? { x: along, y: lane } : { x: lane, y: along };
    } });
    cars.push(mk('x', roadA[0] + 0.8, 1, 2.2, 0, CAR_COLS[0]), mk('x', roadA[0] + 0.8, 1, 2.2, 22, CAR_COLS[3]),
      mk('x', roadA[0] + 2.2, -1, 1.8, 8, CAR_COLS[1]), mk('x', roadA[0] + 2.2, -1, 1.8, 30, CAR_COLS[2]),
      mk('y', roadB[0] + 0.8, 1, 2.0, 5, CAR_COLS[4]), mk('y', roadB[0] + 2.2, -1, 2.4, 14, CAR_COLS[6]), mk('y', roadB[0] + 2.2, -1, 2.4, 36, CAR_COLS[5]));
    return { back, front, cars, pois, blocks, roadA, roadB, lot, isRoad, isWalk, isLot, inside };
  }

  function drawGround(WW, WH, WNX, WNY, MG, O) {
    const c = document.createElement('canvas'); c.width = WW; c.height = WH;
    const g = c.getContext('2d');
    g.fillStyle = '#0b1220'; g.fillRect(0, 0, WW, WH);
    for (let x = -WNY - 2 * MG - 4; x < WNX + WNY + 2 * MG + 4; x++) for (let y = -WNX - 2 * MG - 4; y < WNX + WNY + 2 * MG + 4; y++) {
      const p = iso(x + 0.5, y + 0.5);
      if (p[0] < -30 || p[0] > WW + 30 || p[1] < -20 || p[1] > WH + 20) continue;
      if (O.inside(x + 0.5, y + 0.5)) continue;
      let col;
      const cx = x + 0.5, cy = y + 0.5;
      if (O.isRoad(cx, cy)) col = (x + y) % 2 ? '#2b2f3a' : '#2e323d';
      else if (O.isWalk(cx, cy)) col = (x + y) % 2 ? '#8b93a3' : '#959dac';
      else if (O.isLot(cx, cy)) col = '#3a3f4b';
      else { const n = (x * 73856093 ^ y * 19349663) >>> 0; col = ['#3d6b35', '#3e6d36', '#3c6934', '#3f6e37'][n % 4]; }
      poly(g, [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], col);
      if (!O.isRoad(cx, cy) && !O.isWalk(cx, cy) && !O.isLot(cx, cy)) {
        const n = (x * 2654435761 ^ y * 40503) >>> 0;
        if (n % 5 === 0) { const q = iso(cx, cy); px(g, q[0] - 3 + (n % 7), q[1] - 2, 1, 2, '#5b8f4e'); px(g, q[0] + 2, q[1] - 1 + (n % 3), 1, 2, '#5b8f4e'); }
        if (n % 37 === 0) { const q = iso(cx, cy); px(g, q[0], q[1] - 1, 2, 2, ['#fde68a', '#fca5a5', '#f0abfc'][n % 3]); }
      }
    }
    // lane markings
    const [a0, a1] = O.roadA, [b0, b1] = O.roadB;
    for (let x = -60; x < 120; x += 1.2) { if (x > b0 - 0.2 && x < b1) continue; poly(g, [iso(x, (a0 + a1) / 2 - 0.05), iso(x + 0.6, (a0 + a1) / 2 - 0.05), iso(x + 0.6, (a0 + a1) / 2 + 0.05), iso(x, (a0 + a1) / 2 + 0.05)], '#facc15'); }
    for (let y = -60; y < 120; y += 1.2) { if (y > a0 - 0.2 && y < a1) continue; poly(g, [iso((b0 + b1) / 2 - 0.05, y), iso((b0 + b1) / 2 + 0.05, y), iso((b0 + b1) / 2 + 0.05, y + 0.6), iso((b0 + b1) / 2 - 0.05, y + 0.6)], '#facc15'); }
    // crosswalk + curbs
    for (let i = 0; i < 6; i++) { const y = a0 + 0.25 + i * 0.47; poly(g, [iso(b0 - 1.4, y), iso(b0 - 0.4, y), iso(b0 - 0.4, y + 0.25), iso(b0 - 1.4, y + 0.25)], '#e5e7eb'); }
    for (let i = 0; i < 6; i++) { const x = b0 + 0.25 + i * 0.47; poly(g, [iso(x, a0 - 1.4), iso(x + 0.25, a0 - 1.4), iso(x + 0.25, a0 - 0.4), iso(x, a0 - 0.4)], '#e5e7eb'); }
    // parking lines
    const L = O.lot;
    for (let y = L.y0 + 0.25; y < L.y1; y += 1.3) poly(g, [iso(L.x0 + 0.2, y), iso(L.x0 + 2.4, y), iso(L.x0 + 2.4, y + 0.06), iso(L.x0 + 0.2, y + 0.06)], '#e5e7eb');
    // building drop shadow on the grass
    g.globalAlpha = 0.25; poly(g, [iso(WNX, 0), iso(WNX + 0.6, 0.3), iso(WNX + 0.6, WNY + 0.6), iso(0.3, WNY + 0.6), iso(0, WNY), iso(WNX, WNY)], '#000'); g.globalAlpha = 1;
    return c;
  }

  function planBuilding(defs) {
    const n = defs.length;
    const C = n <= 4 ? 2 : 3, R = Math.max(1, Math.ceil(n / C));
    const WNX = C * 12 - 2, WNY = R * 12 - 2;
    const rooms = defs.map((d, i) => {
      const col = i % C, row = Math.floor(i / C);
      return { ...d, col, row, o: { x: col * 12, y: row * 12 }, outerL: col === 0, outerR: row === 0, T: THEMES[d.theme] || THEMES.night };
    });
    const parts = [];
    for (const r of rooms) {
      const D = DOORS[r.layout] || DOORS.office, { x: ox, y: oy } = r.o;
      if (r.col < C - 1) parts.push(['x', ox + 10, oy, oy + 10, oy + D.xp[0], oy + D.xp[1]]);
      if (r.col > 0) parts.push(['x', ox, oy, oy + 10, oy + D.xm[0], oy + D.xm[1]]);
      if (r.row < R - 1) parts.push(['y', oy + 10, ox, ox + 10, ox + D.yp[0], ox + D.yp[1]]);
      if (r.row > 0) parts.push(['y', oy, ox, ox + 10, ox + D.ym[0], ox + D.ym[1]]);
    }
    return { C, R, WNX, WNY, rooms, parts };
  }

  function createWorld(canvas, cfg) {
    const plan = planBuilding(cfg.rooms);
    const { WNX, WNY, rooms, C, R } = plan;
    const MG = 8; // outdoor margin (tiles) around the building
    const WOX = (WNY + 2 * MG) * TW + 10, WOY = 2 * MG * TH + 132;
    const WW = (WNX + WNY + 4 * MG) * TW + 20, WH = WOY + (WNX + WNY + 2 * MG) * TH + 20;
    const OUT = buildOutdoors(WNX, WNY, MG);
    let ground = null;
    canvas.width = WW; canvas.height = WH;
    const ctx = canvas.getContext('2d');
    const bg = document.createElement('canvas'); bg.width = WW; bg.height = WH;
    const bgx = bg.getContext('2d');
    let agents = [], lastBg = -1e9, lastT = 0, wanderOn = true, onFrame = null, alive = true, selectedId = null;
    const walkers = new Map();
    const GX = WNX * 2 + 5, GY = WNY * 2 + 5, CELLW = 0.5; // building + sidewalk
    let grid = null, gridKey = '';
    const roomOf = id => rooms.find(r => r.id === id);
    const inWorld = a => roomOf(a.room) && a.desk < SLOTS.length;
    const seatOf = a => { const r = roomOf(a.room); const s = SLOTS[a.desk]; return { x: r.o.x + s.x + 1.05, y: r.o.y + s.y - 0.15 }; };
    const pois = [];
    OUT.pois.forEach((p, i) => pois.push({ ...p, id: '_outside:' + i, room: '_outside' }));
    rooms.forEach(r => (ROOM_POIS[r.layout] || (() => []))(r).forEach((p, i) => pois.push({
      ...p, id: r.id + ':' + i, room: r.id,
      approach: [p.approach[0] + r.o.x, p.approach[1] + r.o.y], spot: p.spot && [p.spot[0] + r.o.x, p.spot[1] + r.o.y], k: p.k !== undefined ? p.k + r.o.x + r.o.y : undefined,
    })));
    const PIECES = [];
    for (const [axis, plane, a0, a1, d0, d1] of plan.parts) {
      for (let v = a0; v < a1 - 0.001; v += 0.5) {
        if (v + 0.5 > d0 + 0.001 && v < d1 - 0.001) continue;
        PIECES.push(axis === 'x' ? { x: plane - 0.06, y: v, w: 0.12, d: 0.5 } : { x: v, y: plane - 0.06, w: 0.5, d: 0.12 });
      }
      for (const d of [d0, d1]) PIECES.push(axis === 'x' ? { x: plane - 0.08, y: d - 0.08, w: 0.16, d: 0.16, post: true } : { x: d - 0.08, y: plane - 0.08, w: 0.16, d: 0.16, post: true });
    }
    const hallPlants = [];
    for (let c = 0; c < C - 1; c++) hallPlants.push([c * 12 + 10.6, 0.3]);
    for (let r = 0; r < R - 1; r++) hallPlants.push([0.3, r * 12 + 10.6]);

    function buildWorldGrid() {
      const b = Array.from({ length: GX }, () => new Uint8Array(GY));
      const mark = (x0, y0, x1, y1) => {
        const gx0 = Math.max(0, Math.floor(x0 / CELLW)), gx1 = Math.min(GX - 1, Math.ceil(x1 / CELLW) - 1);
        const gy0 = Math.max(0, Math.floor(y0 / CELLW)), gy1 = Math.min(GY - 1, Math.ceil(y1 / CELLW) - 1);
        for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) b[gx][gy] = 1;
      };
      mark(0, 0, WNX, 0.45); mark(0, 0, 0.45, WNY);
      for (const p of PIECES) mark(p.x + 0.01, p.y + 0.01, p.x + p.w - 0.01, p.y + p.d - 0.01);
      for (const r of rooms) {
        const vis = agents.filter(a => a.room === r.id && a.desk < SLOTS.length).map(a => a.desk);
        for (const [x0, y0, x1, y1] of (ROOM_BLOCKS[r.layout] || (() => []))(vis)) mark(x0 + r.o.x, y0 + r.o.y, x1 + r.o.x, y1 + r.o.y);
      }
      for (const [x, y] of hallPlants) mark(x, y, x + 0.8, y + 0.6);
      for (const r of rooms) { // outer front edges are walls, only the hallway ends are open entrances
        if (r.row === R - 1) mark(r.o.x, WNY + 0.01, r.o.x + 10, WNY + 0.49);
        if (r.col === C - 1) mark(WNX + 0.01, r.o.y, WNX + 0.49, r.o.y + 10);
      }
      for (const [x0, y0, x1, y1] of OUT.blocks) mark(x0, y0, x1, y1);
      return b;
    }
    const cellOfW = (x, y) => [Math.max(0, Math.min(GX - 1, Math.floor(x / CELLW))), Math.max(0, Math.min(GY - 1, Math.floor(y / CELLW)))];
    const centerW = (gx, gy) => [(gx + 0.5) * CELLW, (gy + 0.5) * CELLW];
    function nearestFreeW(gx, gy) {
      if (!grid[gx][gy]) return [gx, gy];
      const seen = new Set([gx * GY + gy]), q = [[gx, gy]];
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GX || ny >= GY || seen.has(nx * GY + ny)) continue;
          seen.add(nx * GY + ny); if (!grid[nx][ny]) return [nx, ny]; q.push([nx, ny]);
        }
      }
      return [gx, gy];
    }
    function pathW(from, to) {
      const s = nearestFreeW(...cellOfW(...from)), e = nearestFreeW(...cellOfW(...to));
      const prev = new Map([[s[0] * GY + s[1], null]]), q = [s];
      while (q.length) {
        const [x, y] = q.shift(); if (x === e[0] && y === e[1]) break;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, k = nx * GY + ny;
          if (nx < 0 || ny < 0 || nx >= GX || ny >= GY || grid[nx][ny] || prev.has(k)) continue;
          prev.set(k, [x, y]); q.push([nx, ny]);
        }
      }
      if (!prev.has(e[0] * GY + e[1])) return null;
      const cells = []; let c = e; while (c) { cells.unshift(c); c = prev.get(c[0] * GY + c[1]); }
      const pts = [];
      for (let i = 0; i < cells.length; i++) { const a = cells[i - 1], b = cells[i], n = cells[i + 1]; if (!a || !n || (b[0] - a[0]) !== (n[0] - b[0]) || (b[1] - a[1]) !== (n[1] - b[1])) pts.push(centerW(...b)); }
      return pts;
    }
    const isRoomTile = (x, y) => rooms.some(r => x >= r.o.x && x < r.o.x + 10 && y >= r.o.y && y < r.o.y + 10);

    function drawWorldStatic(t) {
      useGeom(WOX, WOY);
      bgx.clearRect(0, 0, WW, WH);
      if (!ground) ground = drawGround(WW, WH, WNX, WNY, MG, OUT);
      bgx.drawImage(ground, 0, 0);
      useGeom(WOX, WOY);
      for (const it of OUT.back) it.draw(bgx, t);   // trees behind the back walls
      useGeom(WOX, WOY);
      const F = [iso(0, WNY), iso(WNX, WNY), iso(WNX, 0)];
      poly(bgx, [F[0], F[1], up(F[1], -8), up(F[0], -8)], '#2b2f3d');
      poly(bgx, [F[1], F[2], up(F[2], -8), up(F[1], -8)], '#1f2230');
      for (let x = 0; x < WNX; x++) for (let y = 0; y < WNY; y++) {
        if (isRoomTile(x, y)) continue;
        poly(bgx, [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], (x + y) % 2 ? '#4b5266' : '#454c5f');
      }
      for (let c = 0; c < C - 1; c++) { // hallway pieces of the outer walls
        const x0 = c * 12 + 10;
        poly(bgx, [iso(x0, 0), iso(x0 + 2, 0), wallR(x0 + 2, WALL), wallR(x0, WALL)], '#3a3f52');
        poly(bgx, [wallR(x0, WALL), wallR(x0 + 2, WALL), wallR(x0 + 2, WALL - 4), wallR(x0, WALL - 4)], '#5b6280');
        poly(bgx, [iso(x0 + 0.3, 1), iso(x0 + 1.7, 1), iso(x0 + 1.7, WNY - 1), iso(x0 + 0.3, WNY - 1)], 'rgba(30,58,95,.55)');
        if (c === 0) { bgx.save(); const ep = wallR(x0 + 0.5, 70); bgx.setTransform(1, 0.5, 0, 1, ep[0], ep[1]);
          bgx.fillStyle = '#14532d'; bgx.fillRect(0, 0, 22, 9); bgx.fillStyle = '#86efac'; bgx.font = 'bold 6px ui-monospace, Menlo, monospace'; bgx.fillText('EXIT', 4, 7); bgx.restore(); }
      }
      for (let r = 0; r < R - 1; r++) {
        const y0 = r * 12 + 10;
        poly(bgx, [iso(0, y0), iso(0, y0 + 2), wallL(y0 + 2, WALL), wallL(y0, WALL)], '#33384a');
        poly(bgx, [wallL(y0, WALL), wallL(y0 + 2, WALL), wallL(y0 + 2, WALL - 4), wallL(y0, WALL - 4)], '#545b78');
        poly(bgx, [iso(1, y0 + 0.3), iso(WNX - 1, y0 + 0.3), iso(WNX - 1, y0 + 1.7), iso(1, y0 + 1.7)], 'rgba(30,58,95,.55)');
      }
      for (const r of rooms) { useGeom(WOX, WOY, r.o); drawStatic(bgx, t, r.T, { clear: false, slab: false, left: r.outerL, right: r.outerR }); }
      useGeom(WOX, WOY);
    }

    const roaming = a => a.status === 'idle' || a.status === 'waiting';
    function step(t, dt) {
      const live = agents.filter(inWorld);
      const gk = live.map(a => a.room + ':' + a.desk).sort().join(',');
      if (!grid || gk !== gridKey) { grid = buildWorldGrid(); gridKey = gk; }
      const ids = new Set(live.map(a => a.id));
      for (const id of walkers.keys()) if (!ids.has(id)) walkers.delete(id);
      for (const a of live) {
        const seat = seatOf(a);
        let w = walkers.get(a.id);
        if (!w || w.room !== a.room || w.desk !== a.desk) { w = { mode: 'seated', x: seat.x, y: seat.y, path: [], nextAt: t + 2500 + Math.random() * 7000, lastStatus: a.status, walk: 0, room: a.room, desk: a.desk }; walkers.set(a.id, w); }
        if (a.status !== w.lastStatus) { if (roaming(a) && !roaming({ status: w.lastStatus })) w.nextAt = t + 6000 + Math.random() * 8000; w.lastStatus = a.status; }
        const exitOf = () => centerW(...nearestFreeW(...cellOfW(seat.x, seat.y)));
        const goHome = (fast) => {
          const from = w.poi && w.poi.spot && w.mode === 'activity' ? w.poi.approach : null;
          const path = pathW(from || [w.x, w.y], exitOf()) || [];
          w.path = [...(from ? [from] : []), ...path, [seat.x, seat.y]]; w.mode = 'returning'; w.fast = fast; w.poi = null; w.act = null;
        };
        const pick = () => {
          const taken = new Set([...walkers.values()].map(o => o.poi && o.poi.id));
          const free = pois.filter(p => !taken.has(p.id));
          const away = free.filter(p => p.room !== a.room), home = free.filter(p => p.room === a.room);
          const pool = (Math.random() < 0.6 && away.length) ? away : (home.length ? home : free);
          return pool[Math.floor(Math.random() * pool.length)];
        };
        if (!wanderOn || !roaming(a)) {
          if (w.mode === 'walking' || w.mode === 'activity') goHome(true);
        } else if (w.mode === 'seated' && t > w.nextAt) {
          const poi = pick(), exit = exitOf();
          const path = poi && pathW(exit, poi.approach);
          if (path) { w.path = [exit, ...path, ...(poi.spot ? [poi.spot] : [])]; w.mode = 'walking'; w.poi = poi; w.fast = false; }
          else w.nextAt = t + 4000;
        } else if (w.mode === 'activity' && t > w.until) {
          if (Math.random() < 0.4) {
            const poi = pick(); const from = w.poi && w.poi.spot ? w.poi.approach : [w.x, w.y];
            const path = poi && pathW(from, poi.approach);
            if (path) { w.path = [...(w.poi && w.poi.spot ? [w.poi.approach] : []), ...path, ...(poi.spot ? [poi.spot] : [])]; w.mode = 'walking'; w.poi = poi; w.act = null; }
            else goHome(false);
          } else goHome(false);
        }
        if (w.mode === 'walking' || w.mode === 'returning') {
          let remaining = (w.fast ? 3.4 : 1.4) * dt / 1000;
          while (remaining > 0 && w.path.length) {
            const [tx, ty] = w.path[0]; const dx = tx - w.x, dy = ty - w.y, dist = Math.hypot(dx, dy);
            if (dist > 0.001) w.back = (dx + dy) < -0.001 ? true : (dx + dy) > 0.001 ? false : w.back;
            if (dist <= remaining) { w.x = tx; w.y = ty; w.path.shift(); remaining -= dist; } else { w.x += dx / dist * remaining; w.y += dy / dist * remaining; remaining = 0; }
          }
          w.walk += dt / 170;
          if (!w.path.length) {
            if (w.mode === 'returning') { w.mode = 'seated'; w.x = seat.x; w.y = seat.y; w.nextAt = t + 12000 + Math.random() * 15000; }
            else { w.mode = 'activity'; w.started = t; w.until = t + 7000 + Math.random() * 8000; w.act = w.poi.act; }
          }
        }
      }
    }

    function drawWalkerW(a, w, t) {
      const p = iso(w.x, w.y), look = lookFor(a);
      const opts = { noChair: true, pose: 'stand', walk: -1 };
      if (w.mode === 'walking' || w.mode === 'returning') { opts.walk = w.walk; opts.back = w.back; }
      else if (w.mode === 'activity') {
        const el = t - w.started;
        opts.back = !!w.poi.back;
        switch (w.act) {
          case 'coffee': opts.back = el < 1800; if (!opts.back) opts.hold = 'mug'; break;
          case 'fridge': opts.back = el < 2200; if (!opts.back) opts.hold = 'mug'; break;
          case 'book': opts.back = el < 1600; if (!opts.back) opts.hold = 'book'; break;
          case 'cat': opts.happy = true; break;
          case 'water': opts.hold = 'can'; break;
          case 'sofa': opts.pose = 'sofa'; opts.back = false; opts.hold = el > 2500 && el < 6000 ? 'mug' : null; opts.sleep = el > 7000; break;
          case 'arcade': opts.walk = Math.floor(t / 180) % 2; break;
          case 'pingpong': opts.armsUp = Math.floor((t + (w.poi.back ? 450 : 0)) / 450) % 2 === 0; break;
          case 'stretch': opts.armsUp = Math.floor(el / 900) % 2 === 0; break;
          case 'fountain': opts.back = el < 4000; opts.happy = true; break;
        }
      }
      ctx.globalAlpha = 0.25; px(ctx, p[0] - 7, p[1] - 1, 14, 3, '#000'); ctx.globalAlpha = 1;
      drawCharacter(ctx, p[0], opts.pose === 'sofa' ? p[1] - 8 : p[1], look, a.status, t, 2, opts);
      const top = p[1] - 44;
      if (a.status === 'waiting') bubble(ctx, p[0] + 9, top, 'waiting', t);
      else if (w.mode === 'activity' && w.act === 'cat') {
        const x = p[0] + 9, y = top, c = '#ef4444';
        px(ctx, x, y, 13, 9, '#f8fafc'); px(ctx, x + 2, y + 9, 2, 2, '#f8fafc');
        px(ctx, x + 3, y + 2, 3, 2, c); px(ctx, x + 7, y + 2, 3, 2, c); px(ctx, x + 3, y + 4, 7, 2, c); px(ctx, x + 4, y + 6, 5, 1, c); px(ctx, x + 6, y + 7, 1, 1, c);
      } else if (w.mode === 'activity' && w.act === 'sofa' && opts.sleep) bubble(ctx, p[0] + 9, top, 'idle', t);
    }

    function roomItems(r, t) {
      const local = [];
      if (r.layout === 'office') {
        const byDesk = {}; for (const a of agents) if (a.room === r.id && a.desk < SLOTS.length) byDesk[a.desk] = a;
        local.push({ k: 1.1, f: () => bookshelf(ctx, 0.4, 0.05, 1.8, 3) });
        local.push({ k: 8.7, f: () => bookshelf(ctx, 6.6, 0.05, 1.6, 9) });
        local.push({ k: 0.8, f: () => plant(ctx, 0.15, 0.15, true, t, 1) });
        local.push({ k: 4.6, f: () => coffeeCounter(ctx, t) });
        local.push({ k: 9.9, f: () => plant(ctx, 9.2, 0.2, true, t, 3) });
        local.push({ k: 19.5, f: () => plant(ctx, 9.3, 9.3, true, t, 5) });
        local.push({ k: 8.3, f: () => plant(ctx, 0.2, 7.6, false, t, 6) });
        local.push({ k: 9.0, f: () => sofa(ctx) });
        local.push({ k: 12.1, f: () => coffeeTable(ctx, t) });
        local.push({ k: CAT.x + CAT.y + 0.4, f: () => cat(ctx, t) });
        for (const [d, a] of Object.entries(byDesk)) {
          const s = SLOTS[d]; const w = walkers.get(a.id);
          local.push({ k: s.x + s.y + 2.5, f: () => {
            desk(ctx, s, a, +d, t, !w || w.mode === 'seated');
            if (a.id === selectedId) { // selection ring around the desk
              ctx.strokeStyle = 'rgba(248,250,252,.9)'; ctx.lineWidth = 1; ctx.beginPath();
              [[s.x - 0.25, s.y - 0.75], [s.x + 2.25, s.y - 0.75], [s.x + 2.25, s.y + 1.25], [s.x - 0.25, s.y + 1.25]].forEach((p, i) => i ? ctx.lineTo(...iso(...p)) : ctx.moveTo(...iso(...p)));
              ctx.closePath(); ctx.stroke();
            }
          } });
        }
      } else if (r.layout === 'lounge') lounge(local, ctx, t, { noLamp: true });
      else if (r.layout === 'games') gameRoom(local, ctx, t, { noWall: !r.outerR });
      else if (r.layout === 'meeting') meetingRoom(local, ctx, t, { noWall: !r.outerR });
      return local.map(it => ({ k: it.k + r.o.x + r.o.y, f: () => { useGeom(WOX, WOY, r.o); it.f(); useGeom(WOX, WOY); } }));
    }

    function frame(t) {
      if (!alive) return;
      const dt = Math.min(100, t - (lastT || t)); lastT = t;
      useGeom(WOX, WOY);
      step(t, dt);
      if (t - lastBg > 2000) { drawWorldStatic(t); lastBg = t; }
      useGeom(WOX, WOY);
      ctx.clearRect(0, 0, WW, WH);
      ctx.drawImage(bg, 0, 0);
      const items = [];
      for (const r of rooms) items.push(...roomItems(r, t));
      for (const p of PIECES) items.push({ k: p.x + p.w + p.y + p.d - 0.05, f: () => p.post
        ? box(ctx, p.x, p.y, p.w, p.d, 34, 0, '#6b4f3a', '#5a3f2c', '#4a3324')
        : box(ctx, p.x, p.y, p.w, p.d, 24, 0, '#d6dbe6', '#9aa3b8', '#7a839a') });
      for (const [x, y] of hallPlants) items.push({ k: x + y + 1.1, f: () => plant(ctx, x, y, true, t, Math.round(x * 7 + y)) });
      for (const it of OUT.front) items.push({ k: it.k, f: () => it.draw(ctx, t) });
      for (const c of OUT.cars) { const p = c.pos(t); items.push({ k: p.x + p.y + 0.4, f: () => car(ctx, p.x, p.y, c.axis, c.col, c.dir) }); }
      for (const a of agents.filter(inWorld)) {
        const w = walkers.get(a.id); if (!w || w.mode === 'seated') continue;
        const sitting = w.mode === 'activity' && w.act === 'sofa';
        const k = sitting && w.poi.k !== undefined ? w.poi.k : (sitting && w.poi.spot ? w.poi.spot[0] + w.poi.spot[1] + 0.6 : w.x + w.y + 0.35);
        items.push({ k, f: () => drawWalkerW(a, w, t) });
      }
      items.sort((a, b) => a.k - b.k).forEach(it => it.f());
      useGeom(WOX, WOY);
      if (onFrame) onFrame();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function roomAt(cx, cy) {
      const X = cx - WOX, Y = cy - WOY; const gx = (Y / TH + X / TW) / 2, gy = (Y / TH - X / TW) / 2;
      return rooms.find(r => gx >= r.o.x && gx < r.o.x + 10 && gy >= r.o.y && gy < r.o.y + 10) || null;
    }
    return {
      W: WW, H: WH, rooms,
      destroy() { alive = false; },
      setAgents(list) { agents = list; },
      setSelected(id) { selectedId = id; },
      setWander(v) { wanderOn = v; },
      onFrame(fn) { onFrame = fn; },
      roomAt,
      size() { return { W: WW, H: WH }; },
      buildingBounds() {
        useGeom(WOX, WOY);
        return { x0: iso(0, WNY)[0], x1: iso(WNX, 0)[0], y0: iso(0, 0)[1] - WALL, y1: iso(WNX, WNY)[1] + 8 };
      },
      roomBounds(id) {
        useGeom(WOX, WOY); const r = roomOf(id); if (!r) return null;
        const pts = [iso(r.o.x, r.o.y), iso(r.o.x + 10, r.o.y), iso(r.o.x + 10, r.o.y + 10), iso(r.o.x, r.o.y + 10)];
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys) - (r.outerL || r.outerR ? WALL : 30), y1: Math.max(...ys) };
      },
      roomLabelPoint(id) { useGeom(WOX, WOY); const r = roomOf(id); const p = iso(r.o.x + 10, r.o.y + 10); return { x: p[0], y: p[1] + 4 }; },
      hitTest(cx, cy) { // canvas px -> { agentId } | { room } | null
        useGeom(WOX, WOY);
        let best = null, bd = 1e9;
        for (const a of agents.filter(inWorld)) {
          const w = walkers.get(a.id);
          const p = (!w || w.mode === 'seated') ? iso(seatOf(a).x, seatOf(a).y) : iso(w.x, w.y);
          const dx = cx - p[0], dy = cy - (p[1] - 20);
          if (Math.abs(dx) < 16 && Math.abs(dy) < 26) { const d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; best = a.id; } }
        }
        if (best) return { agentId: best };
        const r = roomAt(cx, cy); return r ? { room: r.id } : null;
      },
      labelPoint(a) {
        useGeom(WOX, WOY);
        const w = walkers.get(a.id);
        if (!inWorld(a)) return null;
        if (!w || w.mode === 'seated') { const s = seatOf(a); const p = iso(s.x, s.y); return { x: p[0], y: p[1] - 50 }; }
        const p = iso(w.x, w.y); return { x: p[0], y: p[1] - 46 };
      },
      activity(a) {
        const w = walkers.get(a.id); if (!w || w.mode === 'seated') return null;
        if (w.mode === 'returning') return 'Heading back to the desk';
        if (w.mode === 'walking') { if (w.poi && w.poi.room === '_outside') return 'Going outside'; const r = w.poi && roomOf(w.poi.room); return r && r.id !== a.room ? `Walking to ${r.name}` : 'Walking'; }
        return w.poi ? w.poi.say : null;
      },
    };
  }

  window.Office = { create, createWorld, avatar, STATUS, slots: SLOTS.length, themes: Object.keys(THEMES) };
})();
