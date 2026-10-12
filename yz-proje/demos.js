/* "Proje: Hepsini Birleştir" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ================= gizlilik mini oyunu: dönemin bütün sistemleri bir arada ================= */
  const MAP = [
    '########################',
    '#S.....#.........#.....#',
    '#.####.#.#######.#.###.#',
    '#.#..C.#.#.....#...#C..#',
    '#.#.####.#.###.#####.#.#',
    '#...#....#..C#.......#.#',
    '###.#.####.###.#####.#.#',
    '#...#......#...#...#...#',
    '#.#####.##.#.###.#.###.#',
    '#..C..#..#...#...#...C.#',
    '#.###.##.#####.#####.#.#',
    '#.........#.........#.E#',
    '########################'
  ];
  const GW = MAP[0].length, GH = MAP.length, CS = 25;
  const wall = (x, y) => x < 0 || y < 0 || x >= GW || y >= GH || MAP[y][x] === '#';
  const cellOf = p => [Math.floor(p.x / CS), Math.floor(p.y / CS)];
  const center = (x, y) => V.v(x * CS + CS / 2, y * CS + CS / 2);
  function astar(sx, sy, tx, ty, stats) {   // Y8: 4 yönlü ızgara A*
    if (wall(tx, ty)) return null;
    const key = (x, y) => y * GW + x, g = new Map([[key(sx, sy), 0]]), par = new Map(), open = [[0, sx, sy]], closed = new Set();
    while (open.length) {
      open.sort((a, b) => a[0] - b[0]); const [, x, y] = open.shift(), k = key(x, y); if (closed.has(k)) continue; closed.add(k); if (stats) stats.nodes++;
      if (x === tx && y === ty) { const path = []; for (let c = k; c !== undefined; c = par.get(c)) path.unshift([c % GW, (c / GW) | 0]); return path; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (wall(nx, ny)) continue; const nk = key(nx, ny), ng = g.get(k) + 1; if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); par.set(nk, k); open.push([ng + Math.abs(nx - tx) + Math.abs(ny - ty), nx, ny]); } }
    }
    return null;
  }
  function los(a, b) {   // Y11: ızgarada görüş hattı (küçük adımlarla örnekleme)
    const d = V.dist(a, b), n = Math.ceil(d / 6);
    for (let i = 1; i < n; i++) { const p = V.lerp(a, b, i / n); const [x, y] = cellOf(p); if (wall(x, y)) return false; }
    return true;
  }
  SL.STEALTH = { MAP, astar, los, wall };
  const DEFAULT_DECIDE = bb => (bb.sees && bb.awareness >= 1 ? 'kovala' : bb.awareness >= 0.4 || bb.heardNoise ? 'incele' : 'devriye');
  SL.STEALTH_DECIDE = DEFAULT_DECIDE;

  function makeGame(opts = {}) {
    const st = { sound: !!opts.sound, decide: opts.decide || DEFAULT_DECIDE, layers: Object.assign({ cones: true, paths: true, labels: true, bars: true, director: true, memory: true, hearing: true }, opts.layers || {}) };
    const PATROLS = [[[3, 7], [1, 7], [1, 11], [8, 11], [8, 9], [7, 7]], [[10, 7], [14, 7], [14, 9], [10, 9]], [[20, 1], [22, 1], [22, 7], [17, 7], [17, 5], [20, 5]]];
    const reset = () => {
      st.player = center(1, 1); st.ppath = []; st.coins = []; st.exit = null;
      MAP.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'C') st.coins.push([x, y]); if (ch === 'E') st.exit = [x, y]; }));
      st.guards = PATROLS.map((pts, i) => ({ id: i, p: center(...pts[0]), dir: V.v(1, 0), patrol: pts, wp: 1, path: [], bb: { state: 'devriye', awareness: 0, sees: false, heardNoise: false, lastKnown: null, timeSinceSeen: 99, searchT: 0, noiseFlag: false } }));
      st.caught = 0; st.collected = 0; st.won = false; st.noise = null; st.t = 0; st.stones = 3; st.mouse = null; st.vision = 170; st.dirLog = []; st.aiMs = 0; st.stats = { nodes: 0, paths: 0 }; st.statsHist = [];
    };
    reset();
    st.reset = reset;
    st.clickTo = p => { const [sx, sy] = cellOf(st.player), [tx, ty] = cellOf(p); const path = astar(sx, sy, tx, ty, null); if (path) st.ppath = path.slice(1).map(c => center(...c)); };
    st.throwStone = p => { if (st.won || st.stones <= 0 || !p) return false; const [x, y] = cellOf(p); if (wall(x, y)) return false; st.stones--; if (st.sound) SL.sfx('knock'); st.noise = { p: center(x, y), r: 170, t: 0 }; return true; };   // Y11: sesle dikkat dağıtma
    const guardGoTo = (g, cell) => { const [sx, sy] = cellOf(g.p); const path = astar(sx, sy, cell[0], cell[1], st.stats); st.stats.paths++; g.path = path ? path.slice(1).map(c => center(...c)) : []; g.goal = cell; };
    const follow = (g, speed, dt) => {   // Y7: hedef noktaya “arrive” ile git
      if (!g.path.length) return true;
      const tgt = g.path[0], to = V.sub(tgt, g.p), d = V.len(to);
      if (d < 3) { g.path.shift(); return !g.path.length; }
      const v = V.mul(V.norm(to), Math.min(speed, d * 6) * dt); g.p = V.add(g.p, v); g.dir = V.norm(V.lerp(g.dir, V.norm(to), 0.25)); return false;
    };
    st.update = dt => {
      if (st.won) return;
      const t0 = performance.now();
      st.t += dt;
      // oyuncu
      if (st.ppath.length) { const tgt = st.ppath[0], to = V.sub(tgt, st.player), d = V.len(to); if (d < 3) st.ppath.shift(); else st.player = V.add(st.player, V.mul(V.norm(to), Math.min(105 * dt, d))); }
      const [pcx, pcy] = cellOf(st.player);
      const ci = st.coins.findIndex(([x, y]) => x === pcx && y === pcy);
      if (ci >= 0) { st.coins.splice(ci, 1); st.collected++; if (st.sound) SL.sfx('waka'); if (st.layers.hearing) st.noise = { p: V.copy(st.player), r: 170, t: 0 }; }
      if (!st.coins.length && pcx === st.exit[0] && pcy === st.exit[1]) { st.won = true; if (st.sound) { SL.sfx('alert'); setTimeout(() => SL.sfx('alert'), 160); } }
      if (st.noise) { st.noise.t += dt; if (st.noise.t > 0.6) st.noise = null; }
      // muhafızlar: ALGILA → HATIRLA (kara tahta) → KARAR VER → DAVRAN
      st.guards.forEach(g => {
        const bb = g.bb, to = V.sub(st.player, g.p), d = V.len(to);
        const inCone = d < st.vision && V.dot(g.dir, V.norm(to)) > Math.cos(35 * Math.PI / 180) && los(g.p, st.player);
        bb.sees = inCone;
        if (inCone) { bb.awareness = Math.min(1.5, bb.awareness + dt * (1.6 - d / st.vision)); bb.lastKnown = cellOf(st.player); bb.timeSinceSeen = 0; }
        else { bb.timeSinceSeen += dt; const floor = bb.lastKnown && bb.awareness >= 0.4 ? 0.4 : 0; bb.awareness = Math.max(floor, bb.awareness - dt * 0.12); }   // şüphelendiyse, son görülen yeri araştırmadan unutmaz
        if (!st.layers.memory && !inCone) { bb.lastKnown = null; bb.awareness = Math.min(bb.awareness, 0.39); }
        if (st.noise && st.noise.t < dt * 1.5 && V.dist(st.noise.p, g.p) < st.noise.r) { bb.noiseFlag = true; bb.lastKnown = cellOf(st.noise.p); bb.searchT = 0; if (bb.state === 'incele') g.goal = null; }
        bb.heardNoise = bb.noiseFlag;   // kara tahtada kalır: muhafız oraya gidip bakana kadar “ses duydum”
        let next; try { next = st.decide({ sees: bb.sees, awareness: Math.round(bb.awareness * 100) / 100, heardNoise: bb.heardNoise, timeSinceSeen: Math.round(bb.timeSinceSeen * 10) / 10, hasLastKnown: !!bb.lastKnown }); } catch (e) { next = 'hata'; if (opts.onError) opts.onError(e); }
        if (!['devriye', 'incele', 'kovala'].includes(next)) { next = bb.state; if (opts.onBad) opts.onBad(next); }
        if (next !== bb.state) { if (next === 'kovala' && st.sound) SL.sfx('alert'); bb.state = next; g.path = []; g.goal = null; bb.searchT = 0; }
        if (bb.state === 'devriye') { if (!g.path.length) { guardGoTo(g, g.patrol[g.wp]); g.wp = (g.wp + 1) % g.patrol.length; } follow(g, 55, dt); }
        else if (bb.state === 'incele') {
          const tgt = bb.lastKnown;
          if (tgt && (!g.goal || g.goal[0] !== tgt[0] || g.goal[1] !== tgt[1])) guardGoTo(g, tgt);
          if (follow(g, 80, dt) || !tgt) { bb.searchT += dt; g.dir = V.rot(g.dir, dt * 2); if (bb.searchT > 3) { bb.lastKnown = null; bb.noiseFlag = false; bb.awareness = Math.min(bb.awareness, 0.3); } }
        } else if (bb.state === 'kovala') {
          const pc = cellOf(st.player); if (!g.goal || Math.abs(g.goal[0] - pc[0]) + Math.abs(g.goal[1] - pc[1]) > 0 || !g.path.length) guardGoTo(g, pc);
          follow(g, 100, dt);
        }
        if (V.dist(g.p, st.player) < 14) { st.caught++; st.player = center(1, 1); st.ppath = []; if (st.sound) SL.sfx('lose'); st.guards.forEach(h => { h.bb.awareness = 0; h.bb.lastKnown = null; h.bb.noiseFlag = false; h.bb.state = 'devriye'; h.path = []; h.goal = null; }); if (st.layers.director) { st.vision = Math.max(110, st.vision - 20); st.dirLog.unshift(`${st.t.toFixed(0)} sn: yakalandın → görüş ${st.vision}`); } }
      });
      // YÖNETMEN (Y17): uzun süre yakalanmazsa görüş yavaşça artar
      if (st.layers.director && Math.floor(st.t) % 15 === 0 && Math.floor(st.t - dt) % 15 !== 0 && st.t > 1 && st.vision < 220) { st.vision += 10; st.dirLog.unshift(`${st.t.toFixed(0)} sn: rahat gidiyorsun → görüş ${st.vision}`); }
      st.dirLog = st.dirLog.slice(0, 3);
      st.aiMs = 0.9 * st.aiMs + 0.1 * (performance.now() - t0);
    };
    st.draw = (ctx, W, H, t) => {
      MAP.forEach((row, y) => [...row].forEach((ch, x) => { ctx.fillStyle = ch === '#' ? (t.dark ? '#3a3f55' : '#4a4f63') : (t.dark ? '#262a38' : '#efe9dc'); ctx.fillRect(x * CS, y * CS, CS - 1, CS - 1); }));
      const [ex, ey] = st.exit; ctx.fillStyle = st.coins.length ? (t.dark ? '#3c4a3c' : '#c9d9c4') : t.green; ctx.fillRect(ex * CS + 3, ey * CS + 3, CS - 7, CS - 7); SL.drawLabel(ctx, 'ÇIKIŞ', ex * CS + CS / 2, ey * CS + CS / 2, t.ink, { size: 8, bg: false });
      st.coins.forEach(([x, y]) => { ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(x * CS + CS / 2, y * CS + CS / 2, 6, 0, 7); ctx.fill(); });
      if (st.noise) { ctx.strokeStyle = t.amber; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(st.noise.p.x, st.noise.p.y, st.noise.r * Math.min(1, st.noise.t / 0.3), 0, 7); ctx.stroke(); }
      st.guards.forEach(g => {
        const col = { devriye: t.blue, incele: t.amber, kovala: t.red }[g.bb.state];
        if (st.layers.cones) { const a = Math.atan2(g.dir.y, g.dir.x); ctx.fillStyle = col; ctx.globalAlpha = 0.13; ctx.beginPath(); ctx.moveTo(g.p.x, g.p.y); ctx.arc(g.p.x, g.p.y, st.vision, a - 35 * Math.PI / 180, a + 35 * Math.PI / 180); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
        if (st.layers.paths && g.path.length) { ctx.strokeStyle = col; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(g.p.x, g.p.y); g.path.forEach(q => ctx.lineTo(q.x, q.y)); ctx.stroke(); ctx.setLineDash([]); }
        if (st.layers.paths && g.bb.lastKnown) { const q = center(...g.bb.lastKnown); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x - 5, q.y - 5); ctx.lineTo(q.x + 5, q.y + 5); ctx.moveTo(q.x + 5, q.y - 5); ctx.lineTo(q.x - 5, q.y + 5); ctx.stroke(); }
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(g.p.x, g.p.y, 9, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        if (st.layers.bars) { ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'; ctx.fillRect(g.p.x - 12, g.p.y - 20, 24, 4); ctx.fillStyle = g.bb.awareness >= 1 ? t.red : g.bb.awareness >= 0.4 ? t.amber : t.green; ctx.fillRect(g.p.x - 12, g.p.y - 20, 24 * Math.min(1, g.bb.awareness), 4); }
        if (st.layers.labels) SL.drawLabel(ctx, g.bb.state, g.p.x, g.p.y + 18, col, { size: 9 });
      });
      if (st.ppath.length) { ctx.strokeStyle = t.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(st.player.x, st.player.y); st.ppath.forEach(q => ctx.lineTo(q.x, q.y)); ctx.stroke(); }
      ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(st.player.x, st.player.y, 8, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      if (st.won) SL.drawLabel(ctx, '🎉 KAÇTIN! Bütün altınlar toplandı.', GW * CS / 2, GH * CS / 2, t.green, { size: 18 });
    };
    return st;
  }
  SL.makeStealth = makeGame;

  D.stealth = function (root) {
    const W = 720, H = 340;
    const g = makeGame({ sound: true });
    let timer = null, last = 0;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    C.style.width = '960px'; C.style.height = 'auto'; C.style.maxWidth = '100%';   // dönemin final oyunu: büyük göster
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      g.draw(ctx, W, H, t);
      const px = GW * CS + 8;
      [`altın: ${g.collected}/5`, `taş (X): ${g.stones}`, `yakalanma: ${g.caught}`, `görüş: ${g.vision}`, `YZ: ${g.aiMs.toFixed(2)} ms`, `A* çağrısı: ${g.stats.paths}`].forEach((s, i) => SL.drawLabel(ctx, s, px, 14 + i * 16, t.ink, { size: 10, align: 'left', bg: false }));
      SL.drawLabel(ctx, 'yönetmen:', px, 112, t.muted, { size: 10, align: 'left', bg: false });
      g.dirLog.forEach((s, i) => SL.drawLabel(ctx, s.length > 15 ? s.slice(0, 15) + '…' : s, px, 128 + i * 15, t.purple, { size: 9, align: 'left', bg: false }));
      [['devriye', t.blue], ['incele', t.amber], ['kovala', t.red]].forEach(([n, c], i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px + 5, 200 + i * 18, 5, 0, 7); ctx.fill(); SL.drawLabel(ctx, n, px + 14, 200 + i * 18, t.ink, { size: 10, align: 'left', bg: false }); });
      const gb = g.guards.map(x => `M${x.id + 1}: ${x.bb.state}, farkındalık ${x.bb.awareness.toFixed(2)}${x.bb.lastKnown ? `, son görülen (${x.bb.lastKnown})` : ''}`).join(' · ');
      info.innerHTML = `<b>Tıkla:</b> yeşil oyuncu A* ile oraya yürür. <b>X tuşu:</b> farenin olduğu yere taş at (3 hak): ses, duyan muhafızı oraya çeker. 5 altını topla, çıkışa ulaş. Altın toplamak da <b>ses</b> çıkarır. <span class="mini">Kara tahta → ${gb}</span>`;
    };
    const loop = now => { if (!timer) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; g.update(dt); draw(); timer = requestAnimationFrame(loop); };
    const start = () => { if (timer) return; last = 0; timer = requestAnimationFrame(loop); };
    const stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; };
    C.addEventListener('mousedown', e => { const b = C.getBoundingClientRect(); const p = V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height); if (p.x < GW * CS && p.y < GH * CS) g.clickTo(p); });
    const mpos = e => { const b = C.getBoundingClientRect(); return V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height); };
    C.addEventListener('mousemove', e => { g.mouse = mpos(e); });
    window.addEventListener('keydown', e => {   // X = taş at (fare oyuncuyu yönettiği için düğme yerine klavye)
      if (!timer || (e.key !== 'x' && e.key !== 'X') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && e.target.closest && e.target.closest('.CodeMirror, input, textarea, select')) return;
      g.throwStone(g.mouse); e.preventDefault();
    });
    const tog = (k, label) => el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { g.layers[k] = e.target.checked; draw(); } }); x.checked = g.layers[k]; return x; })(), ' ' + label);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, tog('cones', 'görüş konileri'), tog('paths', 'yollar ve son görülen yer'), tog('bars', 'farkındalık'), tog('labels', 'durum'), tog('memory', 'hafıza'), tog('hearing', 'işitme'), tog('director', 'yönetmen'), btn('↺ baştan', () => { g.reset(); draw(); })), C, info);
    draw(); SL.onTheme(draw);
    return { start, stop };
  };

  /* ---------- simlab: muhafızın karar fonksiyonu ---------- */
  SL.SIMLABS.guard = function (box, api) {
    const W = 680, H = 370;
    let fn = null;
    const g = makeGame({ decide: bb => (fn ? fn(Object.assign({}, bb)) : 'devriye'), onError: e => { w.pause(); api.setMsg('err', '⚠️ decide hata verdi: ' + SL.jsErrorText(e)); }, onBad: v => { w.pause(); api.setMsg('err', '⚠️ decide şunlardan birini döndürmeli: "devriye", "incele", "kovala".'); } });
    let bot = 0;
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt) {   // oyuncu kendi kendine dolaşır (bot): altınlara sırayla gider
        bot -= dt; if (bot <= 0 && !g.ppath.length && g.coins.length) { const [x, y] = g.coins[0]; g.clickTo(V.v(x * CS + CS / 2, y * CS + CS / 2)); bot = 0.5; }
        g.update(dt);
      },
      render(ctx, w, t) { g.draw(ctx, W, H, t); SL.drawLabel(ctx, `yakalanma ${g.caught} · altın ${g.collected}`, W - 6, H - 8, t.muted, { size: 10, align: 'right' }); },
      reset() { g.reset(); }
    });
    box.append(w.canvas, w.controls({ speed: true })); w.reset();
    const ref = DEFAULT_DECIDE;
    return {
      world: w,
      setFns(f) { fn = f.decide; g.reset(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        const cases = [];
        for (const sees of [false, true]) for (const aw of [0, 0.2, 0.4, 0.7, 1, 1.3]) for (const heard of [false, true]) cases.push({ sees, awareness: aw, heardNoise: heard, timeSinceSeen: sees ? 0 : 2, hasLastKnown: aw > 0 || heard });
        try {
          for (const c of cases) { const got = mod.decide(Object.assign({}, c)), exp = ref(c); if (got !== exp) return { ok: false, msg: `❌ decide(${JSON.stringify(c)}) = ${JSON.stringify(got)}, beklenen "${exp}".` }; }
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Öncelik sırası doğru (kovala > incele > devriye). Sağda üç muhafız sizin kararınızla çalışıyor; bot oyuncu altınları topluyor.' };
      }
    };
  };

  /* ---------- ailab ---------- */
  SL.AILABS.selector = {
    fn: 'select_behavior', jsFn: 'selectBehavior',
    ref: (order, cond) => { for (const n of order) if (cond[n]) return n; return null; },
    cases: () => [[['kovala', 'incele', 'devriye'], { kovala: false, incele: true, devriye: true }], [['kovala', 'incele', 'devriye'], { kovala: true, incele: true, devriye: true }], [['kovala', 'incele', 'devriye'], { kovala: false, incele: false, devriye: true }], [['kovala', 'incele'], { kovala: false, incele: false }], [['kaç', 'saldır', 'ara'], { kaç: false, saldır: true, ara: true }], [[], {}], [['a', 'b', 'c'], { a: false, b: false, c: true }]],
    show: (o, c) => `öncelik ${JSON.stringify(o)}, koşullar ${JSON.stringify(c)}`,
    hint: () => 'Sırayla dolaş: koşulu doğru olan İLK davranışı döndür. Hiçbiri doğru değilse None. Bu, davranış ağacındaki “seçici” (selector) düğümünün ta kendisi.'
  };

  /* ---------- başlık ---------- */
  D.titleproj = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const labels = ['FSM', 'BT', 'Utility', 'GOAP', 'Minimax', 'Steering', 'A*', 'NavMesh', 'Grup', 'Algılama', 'Taktik', 'RL', 'LLM', 'PCG', 'Üretken', 'Zorluk', 'Performans'];
    let t = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const cx = 990, cy = 115;
      labels.forEach((l, i) => { const a = (i / labels.length) * Math.PI * 2 + t * 0.004, r = 85 + Math.sin(t * 0.02 + i) * 6, x = cx + Math.cos(a) * r * 2.2, y = cy + Math.sin(a) * r * 0.95; ctx.strokeStyle = 'rgba(255,154,184,0.25)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '600 13px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(l, x, y + 4); });
      ctx.fillStyle = '#ff9ab8'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#1c0c14'; ctx.font = '700 13px "JetBrains Mono", monospace'; ctx.fillText('OYUN', cx, cy + 5);
    };
    const tick = () => { if (!running) return; t++; draw(); timer = setTimeout(tick, 50); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();

/* EK:BAŞLA — ısınma laboratuvarları */
(function () {
  'use strict';

  SL.AILABS.cansee = {
    fn: 'can_see', jsFn: 'canSee',
    ref: (d, a, los, range, half) => d <= range && Math.abs(a) <= half && los === true,
    cases: () => [[100, 10, true, 170, 35], [200, 10, true, 170, 35], [100, 50, true, 170, 35], [100, -50, true, 170, 35], [100, -20, true, 170, 35], [100, 10, false, 170, 35], [170, 35, true, 170, 35], [0, 0, true, 170, 35], [169, -35, false, 170, 35], [60, 90, true, 120, 60]],
    show: (d, a, l, r, h) => `uzaklık ${d}, açı ${a}°, arada duvar ${l ? 'yok' : 'VAR'}, menzil ${r}, yarı açı ${h}°`,
    hint: (d, a) => (a < 0 ? `Açı eksi olabilir (oyuncu solda): mutlak değerini alın, Math.abs(${a}) = ${Math.abs(a)}.` : 'Üç koşulun ÜÇÜ de doğru olmalı: menzil içinde VE koninin içinde VE arada duvar yok.')
  };
  SL.AILABS.awstep = {
    fn: 'awareness_step', jsFn: 'awarenessStep', tol: 1e-9,
    ref: (aw, sees, dt) => (sees ? Math.min(1.5, aw + dt * 1.0) : Math.max(0, aw - dt * 0.12)),
    cases: () => [[0, true, 0.5], [0.9, true, 0.5], [1.4, true, 0.5], [1.5, true, 1], [1, false, 1], [0.05, false, 1], [0, false, 2], [0.4, false, 0.5], [0.3, true, 0.1], [1.2, false, 5]],
    show: (a, s, d) => `farkındalık ${a}, görüyor mu ${s}, geçen süre ${d} sn`,
    hint: (a, s) => (s ? 'Görüyorsa saniyede 1 artar: aw + dt · 1. Ama 1,5’i geçemez: Math.min(1.5, …).' : 'Görmüyorsa saniyede 0,12 azalır: aw − dt · 0,12. Ama 0’ın altına inemez: Math.max(0, …).')
  };
})();
/* EK:BİTİŞ */
