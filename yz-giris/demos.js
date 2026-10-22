/* "Oyun Yapay Zekâsına Giriş" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();

  /* ================= Pac-Man labirenti ve hayaletler ================= */
  const MAZE = [
    '#..#.###.#.###.#..#',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#.................#',
    '#.##.#.#####.#.##.#',
    '#....#...#...#....#',
    '#..#.###.#.###.#..#',
    '#........ ........#',
    '#.##.#.#####.#.##.#',
    '#..#.....#.....#..#',
    '#..#.###.#.###.#..#',
    '#.................#',
    '###################'];
  const R = MAZE.length, C = MAZE[0].length;
  const wall = (c, r) => r < 0 || r >= R || c < 0 || c >= C || MAZE[r][c] === '#';
  const DIRS = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
  const ORDER = ['up', 'left', 'down', 'right'];   // eşitlikte orijinal oyunun tercih sırası
  const REV = { up: 'down', down: 'up', left: 'right', right: 'left' };
  SL.PACMAZE = { MAZE, R, C, wall };

  function makeGame(o = {}) {
    const g = {
      bug: o.bug !== false, mode: 'scatter', modeT: 0, forced: null, caught: 0, score: 0, pellets: null,
      pac: { c: 9, r: 11, dir: 'left', prog: 0, speed: 7.5 },
      ghosts: [
        { name: 'Blinky', col: '#ff3b3b', c: 9, r: 7, dir: 'left', prog: 0, corner: [C - 2, -3] },
        { name: 'Pinky', col: '#ff8fd8', c: 8, r: 7, dir: 'up', prog: 0, corner: [1, -3] },
        { name: 'Inky', col: '#34e0ff', c: 10, r: 7, dir: 'up', prog: 0, corner: [C - 1, R + 1] },
        { name: 'Clyde', col: '#ffb347', c: 9, r: 3, dir: 'right', prog: 0, corner: [0, R + 1] }]
    };
    g.reset = () => {
      g.pac = { c: 9, r: 11, dir: 'left', prog: 0, speed: 7.5 };
      [[9, 7, 'left'], [8, 7, 'up'], [10, 7, 'up'], [9, 3, 'right']].forEach(([c, r, d], i) => Object.assign(g.ghosts[i], { c, r, dir: d, prog: 0 }));
      g.inv = 2;   // yakalandıktan sonra 2 sn dokunulmazlık
    };
    g.inv = 0;
    g.pellets = MAZE.map(row => row.split('').map(ch => ch === '.'));
    g.target = gh => {
      const p = g.pac, d = DIRS[p.dir], blink = g.ghosts[0];
      if (g.curMode() === 'scatter') return gh.corner;
      if (gh.name === 'Blinky') return [p.c, p.r];
      if (gh.name === 'Pinky') { const t = [p.c + 4 * d[0], p.r + 4 * d[1]]; if (g.bug && p.dir === 'up') t[0] -= 4; return t; }
      if (gh.name === 'Inky') { const m = [p.c + 2 * d[0], p.r + 2 * d[1]]; if (g.bug && p.dir === 'up') m[0] -= 2; return [2 * m[0] - blink.c, 2 * m[1] - blink.r]; }
      return Math.hypot(gh.c - p.c, gh.r - p.r) >= 8 ? [p.c, p.r] : gh.corner;   // Clyde
    };
    g.curMode = () => g.forced || g.mode;
    const choose = (a, tgt, allowRev) => {
      let best = null, bd = Infinity;
      for (const k of ORDER) {
        if (!allowRev && k === REV[a.dir]) continue;
        const [dx, dy] = DIRS[k];
        if (wall(a.c + dx, a.r + dy)) continue;
        const dd = Math.hypot(a.c + dx - tgt[0], a.r + dy - tgt[1]);
        if (dd < bd - 1e-9) { bd = dd; best = k; }
      }
      return best || REV[a.dir];
    };
    const step = (a, sp, dt, decide) => {
      if (wall(a.c + DIRS[a.dir][0], a.r + DIRS[a.dir][1])) { a.dir = decide(a); if (wall(a.c + DIRS[a.dir][0], a.r + DIRS[a.dir][1])) return; }
      a.prog += sp * dt;
      while (a.prog >= 1) { a.prog -= 1; a.c += DIRS[a.dir][0]; a.r += DIRS[a.dir][1]; a.dir = decide(a); if (wall(a.c + DIRS[a.dir][0], a.r + DIRS[a.dir][1])) { a.prog = 0; break; } }
    };
    g.update = (dt, mouseTile) => {
      // mod zamanlayıcısı: 7 sn dağıl, 20 sn kovala (1. seviye değerleri)
      if (!g.forced) {
        g.modeT += dt; const lim = g.mode === 'scatter' ? 7 : 20;
        if (g.modeT >= lim) { g.modeT = 0; g.mode = g.mode === 'scatter' ? 'chase' : 'scatter'; g.ghosts.forEach(gh => { gh.dir = REV[gh.dir]; gh.prog = 1 - gh.prog; gh.c -= DIRS[gh.dir][0]; gh.r -= DIRS[gh.dir][1]; }); }
      }
      step(g.pac, g.pac.speed, dt, a => {
        if (mouseTile) return choose(a, mouseTile, true);
        const opts = ORDER.filter(k => k !== REV[a.dir] && !wall(a.c + DIRS[k][0], a.r + DIRS[k][1]));
        return opts.length ? opts[Math.floor(Math.random() * opts.length)] : REV[a.dir];
      });
      if (g.pellets[g.pac.r] && g.pellets[g.pac.r][g.pac.c]) { g.pellets[g.pac.r][g.pac.c] = false; g.score++; if (mouseTile) SL.sfx('waka'); if (!g.pellets.some(r => r.some(Boolean))) g.pellets = MAZE.map(row => row.split('').map(ch => ch === '.')); }
      g.ghosts.forEach(gh => step(gh, 7, dt, a => choose(a, g.target(a), false)));
      const pp = g.pos(g.pac);
      g.inv = Math.max(0, g.inv - dt);
      if (g.inv <= 0 && g.ghosts.some(gh => V.dist(g.pos(gh), pp) < 0.7)) { g.caught++; if (mouseTile) SL.sfx('lose'); g.reset(); }
    };
    g.pos = a => V.v(a.c + DIRS[a.dir][0] * a.prog, a.r + DIRS[a.dir][1] * a.prog);
    g.draw = (ctx, S, ox, oy, showT) => {
      const t = T();
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        if (MAZE[r][c] === '#') { ctx.fillStyle = t.dark ? '#1b2a8a' : '#2b3fb8'; ctx.fillRect(ox + c * S + 1, oy + r * S + 1, S - 2, S - 2); }
        else if (g.pellets[r][c]) { ctx.fillStyle = t.dark ? '#ffd9b0' : '#b07040'; ctx.beginPath(); ctx.arc(ox + c * S + S / 2, oy + r * S + S / 2, 2.6, 0, 7); ctx.fill(); }
      }
      const P = a => { const p = g.pos(a); return V.v(ox + p.x * S + S / 2, oy + p.y * S + S / 2); };
      if (showT) g.ghosts.forEach(gh => {
        const tg = g.target(gh), gp = P(gh), Wc = C * S, Hc = R * S;
        const tp = V.v(SL.clamp(ox + tg[0] * S + S / 2, ox + 8, ox + Wc - 8), SL.clamp(oy + tg[1] * S + S / 2, oy + 8, oy + Hc - 8));   // harita dışındaki köşe hedeflerini kenarda göster
        ctx.save(); ctx.strokeStyle = gh.col; ctx.globalAlpha = 0.75; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gp.x, gp.y); ctx.lineTo(tp.x, tp.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tp.x - 7, tp.y - 7); ctx.lineTo(tp.x + 7, tp.y + 7); ctx.moveTo(tp.x + 7, tp.y - 7); ctx.lineTo(tp.x - 7, tp.y + 7); ctx.stroke(); ctx.restore();
      });
      const pp = P(g.pac), ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[g.pac.dir], mouth = 0.25 + 0.2 * Math.abs(Math.sin(Date.now() / 90));
      ctx.globalAlpha = g.inv > 0 && Math.floor(g.inv * 8) % 2 ? 0.3 : 1;
      ctx.fillStyle = '#ffe500'; ctx.beginPath(); ctx.moveTo(pp.x, pp.y); ctx.arc(pp.x, pp.y, S * 0.42, ang + mouth, ang + 2 * Math.PI - mouth); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      g.ghosts.forEach(gh => {
        const p = P(gh), rr = S * 0.42;
        ctx.fillStyle = gh.col; ctx.beginPath(); ctx.arc(p.x, p.y - 2, rr, Math.PI, 0); ctx.lineTo(p.x + rr, p.y + rr); for (let k = 0; k < 3; k++) { ctx.lineTo(p.x + rr - (k * 2 + 1) * rr / 3, p.y + rr - 5); ctx.lineTo(p.x + rr - (k * 2 + 2) * rr / 3, p.y + rr); } ctx.closePath(); ctx.fill();
        const e = DIRS[gh.dir]; ctx.fillStyle = '#fff'; [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(p.x + s * rr * 0.38, p.y - 4, 3.6, 0, 7); ctx.fill(); }); ctx.fillStyle = '#1a3cff'; [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(p.x + s * rr * 0.38 + e[0] * 1.6, p.y - 4 + e[1] * 1.6, 1.8, 0, 7); ctx.fill(); });
      });
    };
    return g;
  }
  SL.makePacGame = makeGame;

  D.titlepac = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const g = makeGame(); let timer, running = false;
    const S = 17, ox = W - C * S - 30, oy = 6;
    const draw = () => { ctx.clearRect(0, 0, W, H); g.draw(ctx, S, ox, oy, true); };
    const tick = () => { if (!running) return; g.update(1 / 30, null); draw(); timer = setTimeout(tick, 33); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };

  D.pacman = function (root) {
    const S = 28, W = C * S, H = R * S;
    const g = makeGame();
    let showT = true, followMouse = false;
    const side = el('div', { class: 'gv-side pac-side' });
    const w = new SL.World({
      W, H,
      reset() { g.reset(); g.caught = 0; g.score = 0; },
      update(dt, w) { const mt = followMouse && w.mouse.inside ? [Math.floor(w.mouse.x / S), Math.floor(w.mouse.y / S)] : null; g.update(dt, mt); },
      render(ctx) { g.draw(ctx, S, 0, 0, showT); }
    });
    const RULES = { Blinky: 'Pac-Man’in olduğu kare (takipçi)', Pinky: 'Pac-Man’in 4 kare önü (pusucu)', Inky: 'Pac-Man’in 2 kare önü + Blinky’den oraya olan okun 2 katı (sinsi)', Clyde: '8 kareden uzaksa Pac-Man, yakınsa kendi köşesi (çekingen)' };
    const hudHTML = (m) => `<div class="sv-counters"><span class="cnt">mod <b class="${m === 'chase' ? 'c-red' : 'c-green'}">${m === 'chase' ? 'KOVALA' : 'DAĞIL'}</b>${g.forced ? '' : ` (${Math.ceil((m === 'scatter' ? 7 : 20) - g.modeT)} sn)`}</span><span class="cnt">yakalanma <b>${g.caught}</b></span><span class="cnt">yem <b>${g.score}</b></span></div>` +
        g.ghosts.map(gh => `<div class="pac-rule"><b style="color:${gh.col}">●</b> <b>${gh.name}</b>: ${m === 'scatter' ? 'kendi köşesi (dağılma modu)' : RULES[gh.name]}</div>`).join('') +
        '<p class="mini">Kesikli çizgi + X = hayaletin şu anki hedef karesi. Her kavşakta hedefe kuş uçuşu en yakın yönü seçer; geri dönemez.</p>';
    // Kaymaz: kovala kipinin kuralları daha uzun; iki kipin en uzunu kadar yer ayır (genişlik değişince yeniden ölç)
    let sonG = 0;
    const yerAyir = () => {
      const gn = side.clientWidth; if (!gn || gn === sonG) return; sonG = gn;
      const eski = side.innerHTML; side.style.minHeight = '';
      let h = 0; for (const m of ['chase', 'scatter']) { side.innerHTML = hudHTML(m); h = Math.max(h, side.getBoundingClientRect().height); }
      side.innerHTML = eski; side.style.minHeight = Math.ceil(h) + 'px';
    };
    if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(yerAyir)).observe(side);
    w.hud = () => { yerAyir(); side.innerHTML = hudHTML(g.curMode()); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Mod ', select({ auto: 'otomatik (7 sn dağıl / 20 sn kovala)', chase: 'hep kovala', scatter: 'hep dağıl' }, 'auto', v => { g.forced = v === 'auto' ? null : v; })),
      el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { showT = e.target.checked; } }); cb.checked = true; return cb; })(), ' hedefleri göster'),
      el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { g.bug = e.target.checked; } }); cb.checked = true; return cb; })(), ' 1980 taşma hatası'),
      el('label', { class: 'ctl' }, el('input', { type: 'checkbox', onchange: e => { followMouse = e.target.checked; } }), ' Pac-Man fareye gitsin')),
    el('div', { class: 'gv-row' }, el('div', { style: 'flex:none' }, w.canvas), side), w.controls());
    w.reset();
    return { start: () => w.start(), stop: () => w.stop() };
  };

  /* ================= Zorluk düğmeleri: taret ================= */
  D.turret = function (root) {
    let react = 0.25, err = 6, rate = 2, lead = false, wallhack = false;
    const tur = V.v(590, 40), hist = [], bullets = [];
    let st = { shots: 0, hits: 0 }, cool = 0, bot = 0, aim = Math.PI / 2, flash = 0;
    const wallR = { x: 450, y: 170, w: 280, h: 26 };
    const info = el('div', { class: 'sv-counters' });
    const w = new SL.World({
      W: 1180, H: 360,
      reset() { st = { shots: 0, hits: 0 }; bullets.length = 0; hist.length = 0; cool = 0; },
      update(dt, w) {
        bot += dt;
        const p = w.mouse.inside ? V.v(w.mouse.x, Math.max(120, w.mouse.y)) : V.v(590 + Math.sin(bot * 0.55) * 470, 285 + Math.sin(bot * 1.3) * 30);
        hist.push({ t: w.time, p, v: hist.length ? V.mul(V.sub(p, hist[hist.length - 1].p), 1 / dt) : V.v() });
        while (hist.length && hist[0].t < w.time - 2) hist.shift();
        const seenRec = hist.find(h => h.t >= w.time - react) || hist[hist.length - 1];
        const hidden = !wallhack && segHitsRect(tur, seenRec.p, wallR);
        let tp = seenRec.p;
        if (lead) { const bs = 600, d = V.dist(tur, tp) / bs; tp = V.add(tp, V.mul(seenRec.v, d + react)); }
        aim = V.angle(V.sub(tp, tur));
        cool -= dt;
        if (!hidden && cool <= 0) {
          cool = 1 / rate; st.shots++; flash = 0.08;
          const a = aim + ((Math.random() * 2 - 1) * err * Math.PI) / 180;
          bullets.push({ p: V.copy(tur), v: V.fromAngle(a, 600), life: 1.2 });
        }
        flash -= dt;
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]; b.p = V.add(b.p, V.mul(b.v, dt)); b.life -= dt;
          if (!wallhack && b.p.x > wallR.x && b.p.x < wallR.x + wallR.w && b.p.y > wallR.y && b.p.y < wallR.y + wallR.h) { bullets.splice(i, 1); continue; }
          if (V.dist(b.p, p) < 14) { st.hits++; bullets.splice(i, 1); continue; }
          if (b.life <= 0) bullets.splice(i, 1);
        }
        w.player = p;
      },
      render(ctx, w, t) {
        ctx.fillStyle = t.dark ? '#3a3f55' : '#4a4f63'; ctx.fillRect(wallR.x, wallR.y, wallR.w, wallR.h);
        if (wallhack) SL.drawLabel(ctx, 'hile: duvarın arkasını görüyor ve mermi duvardan geçiyor', wallR.x + wallR.w / 2, wallR.y + wallR.h + 14, t.red, { size: 11 });
        ctx.save(); ctx.translate(tur.x, tur.y); ctx.rotate(aim); ctx.fillStyle = t.purple; ctx.fillRect(0, -5, 34, 10); ctx.restore();
        ctx.fillStyle = flash > 0 ? t.amber : t.purple; ctx.beginPath(); ctx.arc(tur.x, tur.y, 18, 0, 7); ctx.fill();
        ctx.fillStyle = t.red; bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.p.x, b.p.y, 3.5, 0, 7); ctx.fill(); });
        const p = w.player || V.v(590, 280);
        ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, 7); ctx.fill();
        SL.drawLabel(ctx, w.mouse.inside ? 'sen' : 'bot (fareyi getirin)', p.x, p.y + 24, t.green, { size: 11 });
        const pct = st.shots ? Math.round((100 * st.hits) / st.shots) : 0, few = st.shots < 5;   // birkaç atışla oran yargısı verme
        info.innerHTML = `<span class="cnt">atış <b>${st.shots}</b></span><span class="cnt">isabet <b>${st.hits}</b></span><span class="cnt">isabet oranı <b class="${few ? '' : pct > 60 ? 'c-red' : pct < 25 ? 'c-green' : ''}">${few ? '–' : '%' + pct}</b></span><span class="cnt">${few ? '⏳ henüz yargı yok (5 atış bekleniyor)' : pct > 70 ? '😡 “haksızlık!”' : pct < 15 ? '😴 “çok kolay”' : '😀 “zorlu ama adil”'}</span>`;
      }
    });
    function segHitsRect(a, b, r) { for (let k = 0; k <= 20; k++) { const p = V.lerp(a, b, k / 20); if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) return true; } return false; }
    return SL.worldDemo(root, w, el('div', { class: 'sv-controls' },
      slider('Tepki süresi (sn)', 0, 1, react, 0.05, v => { react = v; }), slider('Nişan hatası (°)', 0, 20, err, 1, v => { err = v; }), slider('Atış / sn', 0.5, 6, rate, 0.5, v => { rate = v; }),
      el('label', { class: 'ctl' }, el('input', { type: 'checkbox', onchange: e => { lead = e.target.checked; } }), ' hareketini tahmin et'),
      el('label', { class: 'ctl' }, el('input', { type: 'checkbox', onchange: e => { wallhack = e.target.checked; } }), ' hile yap')), info);
  };

  /* ================= laboratuvarlar ================= */
  const DV = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
  SL.AILABS.inky = {
    fn: 'inky_target', jsFn: 'inkyTarget',
    ref: (pac, dir, blinky) => { const d = DV[dir], m = [pac[0] + 2 * d[0], pac[1] + 2 * d[1]]; return [2 * m[0] - blinky[0], 2 * m[1] - blinky[1]]; },
    cases: () => { const cs = [[[10, 10], 'right', [8, 10]], [[5, 5], 'up', [5, 9]], [[0, 0], 'left', [3, 3]]]; const ds = Object.keys(DV); for (let i = 0; i < 30; i++) cs.push([[Math.floor(Math.random() * 19), Math.floor(Math.random() * 13)], ds[Math.floor(Math.random() * 4)], [Math.floor(Math.random() * 19), Math.floor(Math.random() * 13)]]); return cs; },
    show: (p, d, b) => `Pac-Man ${JSON.stringify(p)} yönü “${d}”, Blinky ${JSON.stringify(b)}`,
    hint: () => 'Önce Pac-Man’in 2 kare önünü bul (m). Hedef = m + (m − Blinky) = 2m − Blinky.'
  };
  SL.AILABS.clyde = {
    fn: 'clyde_target', jsFn: 'clydeTarget',
    ref: (clyde, pac, corner) => (Math.hypot(clyde[0] - pac[0], clyde[1] - pac[1]) >= 8 ? pac : corner),
    cases: () => { const cs = [[[0, 0], [8, 0], [0, 14]], [[0, 0], [7, 0], [0, 14]], [[3, 4], [0, 0], [0, 14]], [[10, 10], [2, 4], [0, 14]]]; for (let i = 0; i < 30; i++) { const a = [Math.floor(Math.random() * 19), Math.floor(Math.random() * 13)], b = [Math.floor(Math.random() * 19), Math.floor(Math.random() * 13)]; cs.push([a, b, [0, 14]]); } return cs; },
    show: (c, p, k) => `Clyde ${JSON.stringify(c)}, Pac-Man ${JSON.stringify(p)}, köşe ${JSON.stringify(k)}`,
    hint: (c, p) => `Mesafe = ${Math.hypot(c[0] - p[0], c[1] - p[1]).toFixed(2)}. 8 ve üstüyse Pac-Man’e, değilse köşeye.`
  };
})();

/* EK:BAŞLA — ısınma laboratuvarları */
(function () {
  'use strict';

  const DV2 = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  SL.AILABS.pinky = {
    fn: 'pinky_target', jsFn: 'pinkyTarget',
    ref: (pac, dir) => [pac[0] + 4 * DV2[dir][0], pac[1] + 4 * DV2[dir][1]],
    cases: () => { const cs = [[[10, 10], 'right'], [[10, 10], 'up'], [[3, 7], 'left'], [[0, 0], 'down']]; const ds = Object.keys(DV2); for (let i = 0; i < 20; i++) cs.push([[Math.floor(Math.random() * 19), Math.floor(Math.random() * 13)], ds[Math.floor(Math.random() * 4)]]); return cs; },
    show: (p, d) => `Pac-Man ${JSON.stringify(p)}, yönü “${d}”`,
    hint: () => 'Yön vektörünü 4 ile çarpıp Pac-Man’in karesine ekleyin. Ekranda y aşağı doğru artar: “up” = [0, −1].'
  };
  SL.AILABS.ghostmode = {
    fn: 'ghost_mode', jsFn: 'ghostMode',
    ref: t => (t % 27 < 7 ? 'DAGIL' : 'KOVALA'),
    cases: () => { const cs = [[0], [3], [6.9], [7], [20], [26.9], [27], [30], [34], [53.5], [54], [61]]; for (let i = 0; i < 15; i++) cs.push([Math.floor(Math.random() * 2000) / 10 + 0.05]); return cs; },
    show: t => `t = ${t} sn`,
    hint: t => `Bir tur 7 + 20 = 27 sn. t % 27 = ${Math.round((t % 27) * 100) / 100}; bu 7’den küçükse DAGIL.`
  };

})();

(function () {
  'use strict';
  const { el, btn } = SL;
  const D = window.DEMOS, T = () => SL.theme();
  /* ================= ajan döngüsü, adım adım: algıla → düşün → davran =================
     Dört senaryo; her “▶ Sonraki adım” döngünün bir aşamasını çalıştırır ve günlüğe düz cümleyle yazar. */
  D.agentloop = function (root) {
    const W = 720, H = 400, G0 = [150, 270], RANGE = 260, WALL = [400, 160, 400, 340];
    const PH = [['ALGILA', 'blue', 'görüş, ses'], ['DÜŞÜN', 'amber', 'kurallar'], ['DAVRAN', 'green', 'hareket']];
    const SC = [
      { ad: '😴 Sessiz gece', P: [650, 130], story: 'Oyuncu haritanın öbür ucunda; nöbetçi devriyede.',
        steps: [
          ['l-no', 'Görüyor mu? Oyuncu 519 birim uzakta, görüş menzili 260 → <b>hayır</b>. Ses var mı? <b>Yok</b>.'],
          ['', 'Kural listesi: “oyuncuyu görüyorsam kovala” ✗ · “ses duyduysam bak” ✗ · <b>“hiçbiri değilse devriye”</b> ✓'],
          ['l-ok', 'Devriye yolunda bir adım yürü (aşağı doğru).']],
        G: [150, 330], bub: '', moral: 'Çoğu karede döngü sıkıcıdır: “bir şey yok, devam”. Ama oyun saniyede 30–60 kez yine de sorar; çünkü bir sonraki karede cevap değişebilir.' },
      { ad: '👀 Önümde', P: [330, 215], story: 'Oyuncu duvarın bu tarafında, nöbetçinin baktığı yönde.',
        steps: [
          ['l-ok', 'Görüyor mu? Uzaklık 188 ≤ 260, oyuncu önünde, arada duvar yok → <b>evet, görüyor</b>.'],
          ['', 'Kural listesi yukarıdan aşağı: <b>“oyuncuyu görüyorsam kovala”</b> ✓ → gerisine bakılmaz.'],
          ['l-ok', 'Oyuncuya doğru koş, “!” göster, alarm sesi çal.']],
        G: [250, 235], bub: '!', snd: 'alert', moral: 'Aynı kural listesi, farklı algı → farklı davranış. “Zekâ” dediğimiz şeyin büyük kısmı DÜŞÜN kutusundaki birkaç kural.' },
      { ad: '🧱 Duvar arkasında, vazo kırıldı', P: [520, 250], noise: true, story: 'Oyuncu duvarın arkasına saklandı ama bir vazoyu devirdi: çatırtı!',
        steps: [
          ['l-no', 'Görüyor mu? Uzaklık 371 &gt; 260 ve arada duvar var → <b>hayır</b>.'],
          ['l-ok', 'Duyuyor mu? Çatırtının duyulma yarıçapı 420, uzaklık 371 → <b>evet</b>. Ama yalnızca <b>sesin geldiği yer</b> biliniyor, oyuncunun kendisi değil.'],
          ['', 'Kural listesi: “görüyorsam kovala” ✗ · <b>“ses duyduysam oraya gidip bak”</b> ✓'],
          ['l-ok', 'Sesin geldiği yöne, duvarın ucuna doğru yürü; başının üstünde “?” çıksın.']],
        G: [300, 300], bub: '?', moral: 'Bekçi <b>bilmiyor</b>, merak ediyor. Oyuncu da “beni duydu, kaçmalıyım” diye düşünür; gerilim buradan doğar. Sınırlı algı, inandırıcı davranış.' },
      { ad: '😈 Hileci bekçi', P: [520, 250], cheat: true, story: 'Aynı yer, bu kez hiç ses yok. Ama bu bekçinin “algısı” oyunun belleğini doğrudan okuyor.',
        steps: [
          ['l-no', 'Görüyor mu? Duvar umurunda değil: oyuncunun konumu (520, 250) doğrudan bellekten okundu → <b>“evet”</b>.'],
          ['', 'Kural listesi: <b>“oyuncuyu görüyorsam kovala”</b> ✓'],
          ['l-ok', 'Duvarın etrafından dolaşıp tam oyuncunun saklandığı yere koş.']],
        G: [380, 360], bub: '!', snd: 'alert', moral: 'Teknik olarak “daha zeki” ama oyuncu “beni duvarın arkasından nasıl gördü? <b>Hile!</b>” der. Isınma sorusundaki mükemmel düşman budur. Bu yüzden oyunlarda algı <b>bilerek</b> sınırlandırılır.' }];
    let cur = 0, k = 0;
    const diag = el('div'), log = el('div', { class: 'btd-log' }), story = el('div', { class: 'btd-story' }), moral = el('div', { class: 'btd-moral' });
    const phaseOf = (sc, i) => (i < 0 ? -1 : sc.steps.length === 4 ? [0, 0, 1, 2][i] : i);
    const logHTML = (sc, n) => sc.steps.slice(0, n).map((st, i) => `<div class="${st[0]}${i === n - 1 ? ' now' : ''}"><span style="color:var(--${PH[phaseOf(sc, i)][1]})">${phaseOf(sc, i) + 1}</span><b>${PH[phaseOf(sc, i)][0]}:</b> ${st[1]}</div>`).join('') || '<div class="hint"><span>·</span>“▶ Sonraki adım”a basın. Basmadan önce tahmin edin: bekçi ne yapacak?</div>';
    // Kaymaz ama boşluksuz: günlük + ders cümlesi için, bütün senaryoların en uzun hâli kadar yer ayrılır (gizli bir
    // ölçüm kutusunda bir kez çizilip ölçülür; genişlik değişince yeniden). Tahmini sabit yükseklik yok.
    const yerAyir = () => {
      const w = alan.clientWidth; if (!w) return;
      // ölçüm kopyası günlüğün kendi sütununda: aynı biçemler (sunumda da kitapta da) geçerli olsun
      const olc = el('div', { style: `position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:${w}px` });
      const l2 = el('div', { class: 'btd-log' }), m2 = el('div', { class: 'btd-moral' }); olc.append(l2, m2);
      const sutun = alan.parentElement; if (getComputedStyle(sutun).position === 'static') sutun.style.position = 'relative'; sutun.append(olc);
      // günlük ve ders cümlesi AYRI ayrı: toplamına yer ayırmak yetmez, günlük kısalınca (Baştan) ders cümlesi yukarı kayar
      let hl = 0, hm = 0;
      for (const sc of SC) for (let n = 0; n <= sc.steps.length; n++) {
        l2.innerHTML = logHTML(sc, n); m2.innerHTML = n === sc.steps.length ? '💡 ' + sc.moral : '';
        hl = Math.max(hl, l2.getBoundingClientRect().height); hm = Math.max(hm, m2.getBoundingClientRect().height);
      }
      olc.remove(); log.style.minHeight = Math.ceil(hl) + 'px'; moral.style.minHeight = Math.ceil(hm) + 'px';
      alan.style.minHeight = '';
      // hikâye satırı da (senaryoya göre bir ya da iki satır): en uzununa yer ayır
      const sw = story.clientWidth; if (sw) {
        const o2 = el('div', { class: 'btd-story', style: `position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:${sw}px` });
        const kap = story.parentElement; if (getComputedStyle(kap).position === 'static') kap.style.position = 'relative'; kap.append(o2);
        let h2 = 0; for (const sc of SC) { o2.innerHTML = '📖 ' + sc.story; h2 = Math.max(h2, o2.getBoundingClientRect().height); }
        o2.remove(); story.style.minHeight = Math.ceil(h2) + 'px';
      }
    };
    // çizgiler figürlerin (💂, 🧍) içinden geçmesin: uçlardan 24 birim kısalt
    const uclar = (a, b, r = 24) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, u = Math.min(r, L / 2) / L; return [[a[0] + dx * u, a[1] + dy * u], [b[0] - dx * u, b[1] - dy * u]]; };
    const draw = () => {
      const t = T(), sc = SC[cur], ph = phaseOf(sc, k - 1), acted = k >= sc.steps.length, G = acted ? sc.G : G0, P = sc.P;
      let s = `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="${t.card}" stroke="${t.rule}"/>`;
      // ses halkaları (en dıştaki = duyulma yarıçapı 420: nöbetçi, 371, içinde kalır); kutuların altında kalsın diye önce çizilir
      if (sc.noise && (ph === 0 || (k > 0 && !acted))) for (let r = 105; r <= 420; r += 105) s += `<circle cx="${P[0]}" cy="${P[1]}" r="${r}" fill="none" stroke="${t.amber}" stroke-width="2.5" opacity="${1.15 - r / 480}"/>`;
      PH.forEach((p, i) => {
        const x = 30 + i * 230, on = i === ph;
        s += `<rect x="${x}" y="14" width="190" height="64" rx="10" fill="${on ? t[p[1]] : t.card}" fill-opacity="${on ? 0.2 : 1}" stroke="${t[p[1]]}" stroke-width="${on ? 4 : 2}"/>`;
        s += `<text x="${x + 95}" y="43" text-anchor="middle" font-size="22" font-weight="800" fill="${t.ink}">${i + 1} · ${p[0]}</text><text x="${x + 95}" y="64" text-anchor="middle" font-size="16" fill="${t.muted}">${p[2]}</text>`;
        if (i < 2) s += `<text x="${x + 210}" y="52" text-anchor="middle" font-size="17" fill="${t.muted}">→</text>`;
      });
      s += `<text x="${W / 2}" y="98" text-anchor="middle" font-size="15" fill="${t.muted}">3’ten sonra döngü bir sonraki karede yeniden 1’den başlar</text>`;
      s += `<line x1="${WALL[0]}" y1="${WALL[1]}" x2="${WALL[2]}" y2="${WALL[3]}" stroke="${t.ink}" stroke-width="12" stroke-linecap="round"/><text x="${WALL[0] + 12}" y="${WALL[1] + 4}" font-size="16" fill="${t.muted}">duvar</text>`;
      if (!acted) s += `<path d="M${G0[0]},${G0[1]} L${G0[0] + RANGE * Math.cos(0.6)},${G0[1] - RANGE * Math.sin(0.6)} A${RANGE},${RANGE} 0 0 1 ${G0[0] + RANGE * Math.cos(0.6)},${G0[1] + RANGE * Math.sin(0.6)} Z" fill="${t.amber}" opacity=".13"/>`;
      if (ph === 0 || (k > 0 && !acted)) {
        const col = sc.cheat ? t.purple : (sc.ad.startsWith('👀') ? t.green : t.red);
        const [a1, a2] = uclar(G0, P); s += `<line x1="${a1[0]}" y1="${a1[1]}" x2="${a2[0]}" y2="${a2[1]}" stroke="${col}" stroke-width="3" stroke-dasharray="${sc.ad.startsWith('👀') ? '' : '8 6'}"/>`;
        // duvarın solunda, iki satır: duvar çizgisi ve nöbetçi yazının üstünden geçmesin
        if (sc.cheat) s += `<text x="${WALL[0] - 14}" y="${WALL[1] + 62}" text-anchor="end" font-size="14" font-weight="700" fill="${t.purple}"><tspan x="${WALL[0] - 14}">bellekten okuma:</tspan><tspan x="${WALL[0] - 14}" dy="17">duvar yok sayılıyor</tspan></text>`;
      }
      if (acted) { const [a1, a2] = uclar(G0, G); s += `<line x1="${a1[0]}" y1="${a1[1]}" x2="${a2[0]}" y2="${a2[1]}" stroke="${t.green}" stroke-width="3" stroke-dasharray="3 6"/>`; }
      s += `<text x="${G[0]}" y="${G[1] + 14}" text-anchor="middle" font-size="38">💂</text>`;
      if (acted && sc.bub) s += `<circle cx="${G[0] + 26}" cy="${G[1] - 34}" r="16" fill="${sc.bub === '!' ? t.red : t.amber}"/><text x="${G[0] + 26}" y="${G[1] - 27}" text-anchor="middle" font-size="20" font-weight="900" fill="#fff">${sc.bub}</text>`;
      s += `<text x="${P[0]}" y="${P[1] + 12}" text-anchor="middle" font-size="34">${sc.noise ? '🥷' : '🧍'}</text>`;
      if (sc.noise) s += `<text x="${P[0] + 30}" y="${P[1] + 34}" font-size="24">🏺</text>`;
      diag.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%" font-family="Source Sans 3">${s}</svg>`;
      log.innerHTML = logHTML(sc, k);
      moral.innerHTML = acted ? '💡 ' + sc.moral : '';
      next.disabled = acted;
      bastan.disabled = k === 0;   // başta sıfırlanacak bir şey yok: pasif (yerinde durur, kaymaz)
    };
    const next = btn('▶ Sonraki adım', () => { const sc = SC[cur]; if (k < sc.steps.length) { k++; if (k === sc.steps.length && sc.snd && SL.sfx) { try { SL.sfx(sc.snd); } catch (e) {} } draw(); } });
    const bs = SC.map((sc, i) => { const b = btn(sc.ad, () => { cur = i; k = 0; bs.forEach(x => x.classList.remove('primary')); b.classList.add('primary'); story.innerHTML = '📖 ' + sc.story; draw(); }); return b; });
    next.classList.add('primary');
    const bastan = btn('↺ Baştan', () => { k = 0; draw(); });
    root.setAttribute('data-prevent-swipe', '');
    const alan = el('div', {}, log, moral);
    root.append(el('div', { class: 'sv-controls btd-sc' }, ...bs), story, el('div', { class: 'btd-wrap al' }, diag, el('div', {}, el('div', { class: 'sv-controls' }, next, bastan), alan)));
    // yer ayırmayı genişlik her değiştiğinde (ilk görünüş, pencere, yazı tipleri yüklenince) yinele
    let sonW = 0;
    const izle = () => { const w = alan.clientWidth; if (w && w !== sonW) { sonW = w; yerAyir(); } };
    if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(izle)).observe(root);
    window.addEventListener('resize', izle); setTimeout(izle, 0);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { sonW = 0; izle(); });
    bs[0].classList.add('primary'); story.innerHTML = '📖 ' + SC[0].story; draw(); SL.onTheme(draw);
  };
})();
/* EK:BİTİŞ */
