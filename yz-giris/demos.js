/* "Oyun Yapay Zekâsına Giriş" destesine özel demolar (ortak: ../ortak/oyunai.js) */
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
      if (g.pellets[g.pac.r] && g.pellets[g.pac.r][g.pac.c]) { g.pellets[g.pac.r][g.pac.c] = false; g.score++; if (!g.pellets.some(r => r.some(Boolean))) g.pellets = MAZE.map(row => row.split('').map(ch => ch === '.')); }
      g.ghosts.forEach(gh => step(gh, 7, dt, a => choose(a, g.target(a), false)));
      const pp = g.pos(g.pac);
      g.inv = Math.max(0, g.inv - dt);
      if (g.inv <= 0 && g.ghosts.some(gh => V.dist(g.pos(gh), pp) < 0.7)) { g.caught++; g.reset(); }
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
    w.hud = () => {
      const m = g.curMode();
      side.innerHTML = `<div class="sv-counters"><span class="cnt">mod <b class="${m === 'chase' ? 'c-red' : 'c-green'}">${m === 'chase' ? 'KOVALA' : 'DAĞIL'}</b>${g.forced ? '' : ` (${Math.ceil((m === 'scatter' ? 7 : 20) - g.modeT)} sn)`}</span><span class="cnt">yakalanma <b>${g.caught}</b></span><span class="cnt">yem <b>${g.score}</b></span></div>` +
        g.ghosts.map(gh => `<div class="pac-rule"><b style="color:${gh.col}">●</b> <b>${gh.name}</b>: ${m === 'scatter' ? 'kendi köşesi (dağılma modu)' : RULES[gh.name]}</div>`).join('') +
        '<p class="mini">Kesikli çizgi + X = hayaletin şu anki hedef karesi. Her kavşakta hedefe kuş uçuşu en yakın yönü seçer; geri dönemez.</p>';
    };
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
        const p = w.mouse.inside ? V.v(w.mouse.x, Math.max(120, w.mouse.y)) : V.v(590 + Math.sin(bot * 0.55) * 300, 285 + Math.sin(bot * 1.3) * 30);
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
        const pct = st.shots ? Math.round((100 * st.hits) / st.shots) : 0;
        info.innerHTML = `<span class="cnt">atış <b>${st.shots}</b></span><span class="cnt">isabet <b>${st.hits}</b></span><span class="cnt">isabet oranı <b class="${pct > 60 ? 'c-red' : pct < 25 ? 'c-green' : ''}">%${pct}</b></span><span class="cnt">${pct > 70 ? '😡 “haksızlık!”' : pct < 15 ? '😴 “çok kolay”' : '😀 “zorlu ama adil”'}</span>`;
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
