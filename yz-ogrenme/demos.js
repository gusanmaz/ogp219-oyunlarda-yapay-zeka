/* "Öğrenen YZ" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const argmax = a => { let k = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[k]) k = i; return k; };
  const lineChart = (ctx, x, y, w, h, data, col, t, label) => {
    ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)'; ctx.fillRect(x, y, w, h);
    
    if (data.length < 2) { if (label) SL.drawLabel(ctx, label, x + 6, y + 10, t.muted, { size: 10, align: 'left' }); return; }
    let lo = Math.min(...data), hi = Math.max(...data); if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
    if (lo < 0 && hi > 0) { const zy = y + h - ((0 - lo) / (hi - lo)) * h; ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, zy); ctx.lineTo(x + w, zy); ctx.stroke(); }
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
    data.forEach((v, i) => { const px = x + (i / (data.length - 1)) * w, py = y + h - ((v - lo) / (hi - lo)) * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.stroke();
    if (label) SL.drawLabel(ctx, label, x + 6, y + 10, t.ink, { size: 10, align: 'left', bg: true });
    SL.drawLabel(ctx, hi.toFixed(1), x + w - 4, y + 9, t.muted, { size: 9, align: 'right' }); SL.drawLabel(ctx, lo.toFixed(1), x + w - 4, y + h - 5, t.muted, { size: 9, align: 'right' });
  };
  SL.LEARN_lineChart = lineChart;

  /* ================= ızgara dünyası (Q-learning) ================= */
  const ACT = [[0, -1], [1, 0], [0, 1], [-1, 0]];  // yukarı, sağ, aşağı, sol
  const ARW = ['↑', '→', '↓', '←'];
  function GridEnv(map) {
    const rows = map.map(r => r.split('')); const H = rows.length, W = rows[0].length;
    let start = 0; rows.forEach((r, y) => r.forEach((c, x) => { if (c === 'S') start = y * W + x; }));
    const env = {
      W, H, rows, start, stepR: -0.1,
      cell: s => rows[Math.floor(s / W)][s % W],
      step(s, a) {
        const x = s % W, y = Math.floor(s / W), nx = x + ACT[a][0], ny = y + ACT[a][1];
        let ns = s; if (nx >= 0 && ny >= 0 && nx < W && ny < H && rows[ny][nx] !== '#') ns = ny * W + nx;
        const c = env.cell(ns);
        if (c === 'G') return { ns, r: 10, done: true };
        if (c === 'L') return { ns, r: -10, done: true };
        return { ns, r: env.stepR, done: false };
      }
    };
    return env;
  }
  SL.GridEnv = GridEnv;
  const MAP1 = ['..........', '.S..#.....', '....#..LL.', '....#....G', '.LL....#..', '.......#..'];

  D.qgrid = function (root) {
    const env = GridEnv(MAP1), N = env.W * env.H;
    const W = 720, H = 300, cs = 46, ox = 10, oy = 8;
    const cfg = { alpha: 0.5, gamma: 0.9, eps: 0.2, showQ: true };
    let Q, s, ep, steps, ret, rets, last, timer = null, mode = null;
    const reset = () => { Q = Array.from({ length: N }, () => [0, 0, 0, 0]); s = env.start; ep = 0; steps = 0; ret = 0; rets = []; last = null; };
    reset();
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const choose = st => (Math.random() < cfg.eps ? Math.floor(Math.random() * 4) : argmax(Q[st]));
    const stepOnce = () => {
      const a = choose(s), { ns, r, done } = env.step(s, a);
      const old = Q[s][a], mx = done ? 0 : Math.max(...Q[ns]);
      Q[s][a] = old + cfg.alpha * (r + cfg.gamma * mx - old);
      last = { s, a, r, old, mx, nw: Q[s][a], done };
      ret += r; steps++; s = ns;
      if (done || steps >= 200) { rets.push(ret); ep++; s = env.start; steps = 0; ret = 0; }
    };
    const runEpisodes = n => { const target = ep + n; let guard = 0; while (ep < target && guard++ < 300000) stepOnce(); };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const mxQ = Math.max(1, ...Q.flat().map(Math.abs));
      for (let i = 0; i < N; i++) {
        const x = ox + (i % env.W) * cs, y = oy + Math.floor(i / env.W) * cs, c = env.cell(i);
        if (c === '#') { ctx.fillStyle = t.dark ? '#4a4f63' : '#3d4255'; ctx.fillRect(x, y, cs - 1, cs - 1); continue; }
        if (c === 'L') { ctx.fillStyle = t.dark ? '#6b2a2a' : '#f3b3a8'; ctx.fillRect(x, y, cs - 1, cs - 1); SL.drawLabel(ctx, 'lav −10', x + cs / 2, y + cs / 2, t.red, { size: 9 }); continue; }
        if (c === 'G') { ctx.fillStyle = t.dark ? '#24543a' : '#bde8c9'; ctx.fillRect(x, y, cs - 1, cs - 1); SL.drawLabel(ctx, 'hazine', x + cs / 2, y + cs / 2 - 6, t.green, { size: 9 }); SL.drawLabel(ctx, '+10', x + cs / 2, y + cs / 2 + 7, t.green, { size: 9 }); continue; }
        const cx = x + cs / 2, cy = y + cs / 2;
        if (cfg.showQ) {
          const tri = [[[x, y], [x + cs - 1, y]], [[x + cs - 1, y], [x + cs - 1, y + cs - 1]], [[x + cs - 1, y + cs - 1], [x, y + cs - 1]], [[x, y + cs - 1], [x, y]]];
          tri.forEach(([p, q], a) => { const v = Q[i][a] / mxQ; ctx.fillStyle = v >= 0 ? `rgba(46,170,90,${Math.min(0.85, v)})` : `rgba(230,70,70,${Math.min(0.85, -v)})`; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill(); });
        } else { ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'; ctx.fillRect(x, y, cs - 1, cs - 1); }
        ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cs - 2, cs - 2);
        if (Q[i].some(v => v !== 0)) SL.drawLabel(ctx, ARW[argmax(Q[i])], cx, cy, t.ink, { size: 15 });
        if (c === 'S') SL.drawLabel(ctx, 'S', x + 8, y + 9, t.blue, { size: 10 });
      }
      const ax = ox + (s % env.W) * cs + cs / 2, ay = oy + Math.floor(s / env.W) * cs + cs / 2;
      ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(ax, ay, 9, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      const px = ox + env.W * cs + 14, pw = W - px - 8;
      lineChart(ctx, px, oy, pw, 120, rets.slice(-200), t.blue, t, 'bölüm getirisi');
      SL.drawLabel(ctx, `bölüm: ${ep}`, px, oy + 140, t.ink, { size: 12, align: 'left' });
      SL.drawLabel(ctx, `adım: ${steps}`, px, oy + 158, t.muted, { size: 11, align: 'left' });
      const avg = rets.slice(-20); SL.drawLabel(ctx, `son 20 ort.: ${avg.length ? (avg.reduce((a, b) => a + b, 0) / avg.length).toFixed(2) : '—'}`, px, oy + 176, t.muted, { size: 11, align: 'left' });
      SL.drawLabel(ctx, 'yeşil = iyi, kırmızı = kötü', px, oy + 206, t.muted, { size: 10, align: 'left' });
      SL.drawLabel(ctx, 'ok = açgözlü (en iyi) eylem', px, oy + 222, t.muted, { size: 10, align: 'left' });
      SL.drawLabel(ctx, 'tık = duvar/lav/boş', px, oy + 238, t.muted, { size: 10, align: 'left' });
      if (last) {
        const f = v => v.toFixed(2);
        info.innerHTML = `Son güncelleme: Q(s, ${ARW[last.a]}) ← ${f(last.old)} + α·(r + γ·max Q(s′) − ${f(last.old)}) = ${f(last.old)} + ${cfg.alpha}·(${f(last.r)} + ${cfg.gamma}·${f(last.mx)} − ${f(last.old)}) = <b>${f(last.nw)}</b>${last.done ? ' (bölüm bitti: max Q(s′) = 0)' : ''}`;
      } else info.innerHTML = 'Henüz hiçbir şey bilmiyor: bütün Q değerleri 0. “1 adım” ile Bellman güncellemesini tek tek görün, sonra “100 bölüm eğit”.';
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } mode = null; playBtn.textContent = '▶ canlı oynat'; };
    const playBtn = btn('▶ canlı oynat', () => { if (timer) { stop(); return; } mode = 'play'; playBtn.textContent = '⏸ durdur'; timer = setInterval(() => { stepOnce(); draw(); }, 60); });
    C.addEventListener('mousedown', e => {
      const r = C.getBoundingClientRect(), x = ((e.clientX - r.left) * W) / r.width - ox, y = ((e.clientY - r.top) * H) / r.height - oy;
      const gx = Math.floor(x / cs), gy = Math.floor(y / cs); if (gx < 0 || gy < 0 || gx >= env.W || gy >= env.H) return;
      const c = env.rows[gy][gx]; if (c === 'S' || c === 'G') return;
      env.rows[gy][gx] = c === '.' ? '#' : c === '#' ? 'L' : '.'; draw();
    });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      slider('α öğrenme hızı', 0.05, 1, cfg.alpha, 0.05, v => { cfg.alpha = v; }),
      slider('γ indirim', 0, 0.99, cfg.gamma, 0.01, v => { cfg.gamma = v; }),
      slider('ε keşif', 0, 1, cfg.eps, 0.05, v => { cfg.eps = v; }),
      slider('adım cezası', -1, 0, env.stepR, 0.05, v => { env.stepR = v; })),
      el('div', { class: 'sv-controls' },
        btn('1 adım', () => { stop(); stepOnce(); draw(); }), playBtn,
        btn('10 bölüm eğit', () => { stop(); runEpisodes(10); draw(); }), btn('100 bölüm eğit', () => { stop(); runEpisodes(100); draw(); }),
        el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.showQ = e.target.checked; draw(); } }); x.checked = true; return x; })(), ' Q renkleri'),
        btn('↺ unut', () => { stop(); reset(); draw(); })),
      C, info);
    draw(); SL.onTheme(draw);
    return { stop };
  };

  /* ================= çok kollu haydut: keşif ve sömürü ================= */
  D.bandit = function (root) {
    const W = 720, H = 250, K = 4;
    let p, est, cnt, total, pulls, showTrue = false, eps = 0.1, hist, opt;
    const newGame = () => { p = Array.from({ length: K }, () => 0.15 + Math.random() * 0.7); est = Array(K).fill(0); cnt = Array(K).fill(0); total = 0; pulls = 0; hist = []; opt = 0; };
    newGame();
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const pull = (k) => { if (k == null) k = Math.random() < eps ? Math.floor(Math.random() * K) : argmax(est); const r = Math.random() < p[k] ? 1 : 0; cnt[k]++; est[k] += (r - est[k]) / cnt[k]; total += r; pulls++; opt += Math.max(...p); hist.push(total / pulls); return [k, r]; };
    let lastPull = null;
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const best = argmax(p);
      for (let k = 0; k < K; k++) {
        const x = 20 + k * 110, y = 20, w = 90, h = 150;
        ctx.fillStyle = t.dark ? '#2b2f40' : '#e9e6f2'; ctx.fillRect(x, y, w, h);
        if (lastPull && lastPull[0] === k) { ctx.strokeStyle = lastPull[1] ? t.green : t.red; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h); }
        const bh = est[k] * (h - 40); ctx.fillStyle = t.blue; ctx.fillRect(x + 14, y + h - 10 - bh, 26, bh);
        if (showTrue) { const th = p[k] * (h - 40); ctx.fillStyle = t.amber; ctx.fillRect(x + 50, y + h - 10 - th, 26, th); }
        SL.drawLabel(ctx, '🎰 ' + (k + 1), x + w / 2, y + 12, t.ink, { size: 12 });
        SL.drawLabel(ctx, `tahmin ${est[k].toFixed(2)}`, x + w / 2, y + h + 14, t.blue, { size: 10 });
        SL.drawLabel(ctx, `${cnt[k]} kez`, x + w / 2, y + h + 28, t.muted, { size: 10 });
        if (showTrue) SL.drawLabel(ctx, `gerçek ${p[k].toFixed(2)}${k === best ? ' ★' : ''}`, x + w / 2, y + h + 42, t.amber, { size: 10 });
      }
      lineChart(ctx, 470, 20, 230, 150, hist.slice(-300), t.green, t, 'çekiş başına ortalama ödül');
      SL.drawLabel(ctx, `toplam ödül ${total} / ${pulls} çekiş`, 585, 186, t.ink, { size: 11 });
      SL.drawLabel(ctx, `pişmanlık ≈ ${(opt - total).toFixed(1)}`, 585, 202, t.red, { size: 11 });
      info.innerHTML = `Mavi: ajanın tahmini (ortalama ödül), sarı: gerçek olasılık. ε = ${eps}: her çekişte %${Math.round(eps * 100)} rastgele makine (keşif), kalan zamanda en iyi görünen (sömürü). <b>Pişmanlık</b> = hep en iyi makineyi çekseydik beklenen ödül − aldığımız.`;
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      slider('ε keşif', 0, 1, eps, 0.05, v => { eps = v; draw(); }),
      btn('1 çek', () => { lastPull = pull(); draw(); }), btn('100 çek', () => { for (let i = 0; i < 100; i++) lastPull = pull(); draw(); }), btn('1000 çek', () => { for (let i = 0; i < 1000; i++) lastPull = pull(); draw(); }),
      btn('gerçeği göster/gizle', () => { showTrue = !showTrue; draw(); }), btn('↺ yeni makineler', () => { newGame(); lastPull = null; draw(); })), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= ödül hilesi (CoastRunners) ================= */
  // pist: S'den F'ye uzun bir yol; yan cepte iki altın (A, B) sırayla yeniden doğar
  const TRACK = ['##############', '#S....#......#', '###.#.#.####.#', '#A..#...#..#.#', '#.###.###.##.#', '#B..#.....#..F', '##############'];
  function hackEnv(design) {
    const rows = TRACK.map(r => r.split('')), Hh = rows.length, Ww = rows[0].length;
    let start, A, B; rows.forEach((r, y) => r.forEach((c, x) => { const i = y * Ww + x; if (c === 'S') start = i; if (c === 'A') A = i; if (c === 'B') B = i; }));
    // durum = hücre × hangi altın aktif (0: A, 1: B)
    return {
      Ww, Hh, rows, start, A, B, nS: Ww * Hh * 2,
      step(cell, coin, a) {
        const x = cell % Ww, y = Math.floor(cell / Ww), nx = x + ACT[a][0], ny = y + ACT[a][1];
        let nc = cell; if (rows[ny] && rows[ny][nx] && rows[ny][nx] !== '#') nc = ny * Ww + nx;
        let r = design === 'score' ? 0 : -0.05, ncoin = coin, done = false;
        if ((coin === 0 && nc === A) || (coin === 1 && nc === B)) { ncoin = 1 - coin; r += design === 'score' ? 1 : 0; }
        if (rows[Math.floor(nc / Ww)][nc % Ww] === 'F') { r += design === 'score' ? 3 : 10; done = true; }
        return { nc, ncoin, r, done };
      }
    };
  }
  SL.hackEnv = hackEnv;
  function trainHack(env, episodes) {
    const Q = Array.from({ length: env.nS }, () => [0, 0, 0, 0]); const st = (c, k) => c * 2 + k;
    for (let e = 0; e < episodes; e++) {
      let c = env.start, k = 0; const eps = Math.max(0.05, 1 - e / (episodes * 0.7));
      for (let i = 0; i < 120; i++) {
        const s = st(c, k), a = Math.random() < eps ? Math.floor(Math.random() * 4) : argmax(Q[s]);
        const { nc, ncoin, r, done } = env.step(c, k, a), s2 = st(nc, ncoin);
        Q[s][a] += 0.3 * (r + (done ? 0 : 0.97 * Math.max(...Q[s2])) - Q[s][a]);
        c = nc; k = ncoin; if (done) break;
      }
    }
    return Q;
  }
  SL.trainHack = trainHack;
  D.rewardhack = function (root) {
    const W = 720, H = 330, cs = 40, ox = 80, oy = 14;
    let design = 'score', env, Q, c, k, score, t, done, timer = null, trained = false, laps = 0;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const setup = () => { env = hackEnv(design); Q = null; trained = false; c = env.start; k = 0; score = 0; t = 0; done = false; laps = 0; };
    const train = () => { Q = trainHack(env, 4000); trained = true; c = env.start; k = 0; score = 0; t = 0; done = false; laps = 0; };
    const step = () => {
      if (!trained || done || t >= 120) return;
      const a = argmax(Q[c * 2 + k]), r = env.step(c, k, a); if (r.ncoin !== k) laps++;
      c = r.nc; k = r.ncoin; score += r.r; t++; done = r.done;
    };
    const draw = () => {
      const tt = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = tt.card; ctx.fillRect(0, 0, W, H);
      env.rows.forEach((r, y) => r.forEach((ch, x) => {
        const px = ox + x * cs, py = oy + y * cs;
        if (ch === '#') { ctx.fillStyle = tt.dark ? '#1f3a52' : '#9cc7e6'; ctx.fillRect(px, py, cs - 1, cs - 1); return; }
        ctx.fillStyle = tt.dark ? '#2b2f40' : '#eef0f6'; ctx.fillRect(px, py, cs - 1, cs - 1);
        if (ch === 'F') { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; ctx.fillRect(px + i * 10, py + j * 10, 10, 10); } }
        if (ch === 'S') SL.drawLabel(ctx, 'başla', px + cs / 2, py + cs / 2, tt.blue, { size: 10 });
        const isA = ch === 'A', isB = ch === 'B';
        if (isA || isB) { const active = (isA && k === 0) || (isB && k === 1); ctx.fillStyle = active ? tt.amber : tt.rule; ctx.beginPath(); ctx.arc(px + cs / 2, py + cs / 2, 10, 0, 7); ctx.fill(); SL.drawLabel(ctx, isA ? 'A' : 'B', px + cs / 2, py + cs / 2, '#222', { size: 10 }); }
      }));
      const bx = ox + (c % env.Ww) * cs + cs / 2, by = oy + Math.floor(c / env.Ww) * cs + cs / 2;
      ctx.fillStyle = tt.red; ctx.beginPath(); ctx.moveTo(bx + 12, by); ctx.lineTo(bx - 9, by - 8); ctx.lineTo(bx - 9, by + 8); ctx.closePath(); ctx.fill();
      SL.drawLabel(ctx, 'tekne', bx, by - 16, tt.red, { size: 10 });
      SL.drawLabel(ctx, `puan: ${score.toFixed(1)}   adım: ${t}/120   altın: ${laps}   ${done ? '🏁 YARIŞI BİTİRDİ' : t >= 120 ? '⌛ süre bitti — yarışı hiç bitirmedi!' : ''}`, W / 2, H - 22, done ? tt.green : t >= 120 ? tt.red : tt.ink, { size: 13 });
      info.innerHTML = design === 'score'
        ? '<b>Ödül = oyunun puanı</b> (CoastRunners gibi): her altın +1, bitiş +3. Altınlar A ve B arasında sırayla yeniden doğar. Eğitip izleyin: ajan neyi “öğrendi”?'
        : '<b>Ödül = ne istediğimiz</b>: bitiş +10, her adım −0,05 (acele et), altın 0. Aynı algoritma, aynı harita, farklı ödül.';
      if (!trained) info.innerHTML += ' <i>Önce “eğit” (4000 bölüm, ~1 sn).</i>';
    };
    const play = () => { if (timer) clearInterval(timer); timer = setInterval(() => { step(); draw(); if (done || t >= 120) { clearInterval(timer); timer = null; } }, 90); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Ödül tasarımı: ', select({ score: 'oyun puanı (altın +1, bitiş +3)', intent: 'niyet (bitiş +10, adım −0,05)' }, design, v => { design = v; if (timer) clearInterval(timer); timer = null; setup(); draw(); })),
      btn('🧠 eğit', () => { train(); draw(); }), btn('▶ izle', () => { if (!trained) train(); c = env.start; k = 0; score = 0; t = 0; done = false; laps = 0; play(); })), C, info);
    setup(); draw(); SL.onTheme(draw);
    return { stop() { if (timer) clearInterval(timer); timer = null; } };
  };

  /* ================= nöroevrim: yarış arabaları ================= */
  const TRK = (() => { const P = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; const r = 1 + 0.28 * Math.sin(3 * a) + 0.12 * Math.cos(5 * a); P.push(V.v(360 + Math.cos(a) * 225 * r, 170 + Math.sin(a) * 100 * r)); } return P; })();
  const TW = 26;
  const segInfo = (() => { const L = [0]; for (let i = 0; i < TRK.length; i++) L.push(L[i] + V.dist(TRK[i], TRK[(i + 1) % TRK.length])); return L; })();
  const LEN = segInfo[TRK.length];
  function nearest(p) {
    let best = Infinity, prog = 0;
    for (let i = 0; i < TRK.length; i++) {
      const a = TRK[i], b = TRK[(i + 1) % TRK.length], ab = V.sub(b, a), t = Math.max(0, Math.min(1, V.dot(V.sub(p, a), ab) / V.len2(ab)));
      const d = V.dist(p, V.add(a, V.mul(ab, t))); if (d < best) { best = d; prog = segInfo[i] + t * V.len(ab); }
    }
    return { d: best, prog };
  }
  const RAYS = [-1.1, -0.5, 0, 0.5, 1.1];
  const sense = car => RAYS.map(o => { const dir = V.fromAngle(car.h + o); for (let s = 6; s <= 120; s += 6) { if (nearest(V.add(car.p, V.mul(dir, s))).d > TW) return s / 120; } return 1; });
  // küçük sinir ağı: 5 giriş → 6 gizli (tanh) → 2 çıkış (direksiyon, gaz)
  const NI = 6, NH = 6, NO = 2, NW = NI * NH + NH * NO;   // girişlere sabit 1 (bias) eklenir
  const forward = (w, x) => { const xin = [...x, 1], h = []; for (let j = 0; j < NH; j++) { let s = 0; for (let i = 0; i < NI; i++) s += w[j * NI + i] * xin[i]; h.push(Math.tanh(s)); } const o = []; for (let k = 0; k < NO; k++) { let s = 0; for (let j = 0; j < NH; j++) s += w[NI * NH + k * NH + j] * h[j]; o.push(Math.tanh(s)); } return o; };
  SL.NE_forward = forward;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  D.neuro = function (root) {
    const W = 720, H = 340, POP = 30;
    let gen = 1, cars, genes, best = [], timer = null, sigma = 0.3, fast = 1, tframe = 0, bestEver = null;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const startP = TRK[0], startH = V.angle(V.sub(TRK[1], TRK[0]));
    const spawn = () => { cars = genes.map(g => ({ g, p: V.copy(startP), h: startH, v: 0, alive: true, prog: 0, last: 0, best: 0, idle: 0 })); tframe = 0; };
    const init = () => { genes = Array.from({ length: POP }, () => Array.from({ length: NW }, () => gauss() * 0.8)); gen = 1; best = []; bestEver = null; spawn(); };
    const evolve = () => {
      cars.sort((a, b) => b.best - a.best); best.push(cars[0].best / LEN); if (!bestEver || cars[0].best > bestEver.f) bestEver = { f: cars[0].best, g: cars[0].g.slice() };
      const elite = cars.slice(0, 5).map(c => c.g);
      genes = [elite[0].slice(), elite[1].slice()];
      while (genes.length < POP) { const a = elite[Math.floor(Math.random() * 5)], b = elite[Math.floor(Math.random() * 5)]; genes.push(a.map((w, i) => (Math.random() < 0.5 ? w : b[i]) + (Math.random() < 0.2 ? gauss() * sigma : 0))); }
      gen++; spawn();
    };
    const tick = () => {
      let alive = 0; tframe++;
      cars.forEach(c => {
        if (!c.alive) return; alive++;
        const [steer, gas] = forward(c.g, sense(c));
        c.h += steer * 0.09; c.v = Math.max(0.4, Math.min(4, c.v + gas * 0.15)); c.p = V.add(c.p, V.mul(V.fromAngle(c.h), c.v));
        const n = nearest(c.p); if (n.d > TW) { c.alive = false; return; }
        let dp = n.prog - c.last; if (dp < -LEN / 2) dp += LEN; if (dp > LEN / 2) dp -= LEN; c.prog += dp; c.last = n.prog;
        if (c.prog > c.best + 0.5) { c.best = c.prog; c.idle = 0; } else if (++c.idle > 90) c.alive = false;
        if (c.prog > LEN * 2) c.alive = false;   // iki tur yeter
      });
      if (!alive || tframe > 1500) evolve();
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      ctx.lineJoin = 'round'; ctx.strokeStyle = t.dark ? '#3a3f55' : '#d3d6e2'; ctx.lineWidth = TW * 2; ctx.beginPath(); TRK.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = t.ink; ctx.lineWidth = 3; const n0 = V.perp(V.norm(V.sub(TRK[1], TRK[0]))); ctx.beginPath(); ctx.moveTo(startP.x + n0.x * TW, startP.y + n0.y * TW); ctx.lineTo(startP.x - n0.x * TW, startP.y - n0.y * TW); ctx.stroke();
      const lead = cars.reduce((a, c) => (c.alive && (!a || c.prog > a.prog) ? c : a), null);
      cars.forEach(c => {
        ctx.save(); ctx.translate(c.p.x, c.p.y); ctx.rotate(c.h); ctx.globalAlpha = c.alive ? 0.9 : 0.25; ctx.fillStyle = c === lead ? t.green : t.blue; ctx.fillRect(-7, -4, 14, 8); ctx.restore();
      });
      if (lead) { ctx.strokeStyle = t.amber; ctx.lineWidth = 1.5; sense(lead).forEach((d, i) => { const e = V.add(lead.p, V.mul(V.fromAngle(lead.h + RAYS[i]), d * 120)); ctx.beginPath(); ctx.moveTo(lead.p.x, lead.p.y); ctx.lineTo(e.x, e.y); ctx.stroke(); }); }
      lineChart(ctx, 560, 8, 152, 60, best, t.green, t, 'en iyi (tur)');
      SL.drawLabel(ctx, `nesil ${gen} · yaşayan ${cars.filter(c => c.alive).length}/${POP}`, 10, 14, t.ink, { size: 12, align: 'left' });
      info.innerHTML = `Her araba 5 ışınla (sarı) duvara uzaklığı ölçer; 5 giriş + sabit → 6 gizli nöron → direksiyon ve gaz. Ağırlıkları <b>kimse eğitmiyor</b>: her nesilde en çok yol alan 5 arabanın ağırlıkları karıştırılıp biraz bozularak (mutasyon σ = ${sigma}) yeni nesil yapılıyor. Yeşil: önde giden. En iyi: <b>${best.length ? Math.max(...best).toFixed(2) : 0} tur</b> (2 turda durdurulur).`;
    };
    const loop = () => { for (let i = 0; i < fast; i++) tick(); draw(); };
    const pb = btn('⏸ durdur', () => (timer ? stopT() : startT()));
    const startT = () => { if (!timer) timer = setInterval(loop, 33); pb.textContent = '⏸ durdur'; };
    const stopT = () => { if (timer) { clearInterval(timer); timer = null; } pb.textContent = '▶ devam'; };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      pb, slider('hız ×', 1, 20, fast, 1, v => { fast = v; }), slider('mutasyon σ', 0.05, 1, sigma, 0.05, v => { sigma = v; }),
      btn('⏭ nesli bitir', () => { evolve(); draw(); }), btn('↺ baştan', () => { init(); draw(); })), C, info);
    init(); draw(); SL.onTheme(draw);
    return { start: startT, stop: stopT };
  };

  /* ---------- simlab: Q güncellemesi ---------- */
  SL.SIMLABS.qlearn = function (box, api) {
    const env = GridEnv(['........', '.S..#...', '....#.L.', '......#G', '..L.....']), N = env.W * env.H, cs = 40, W = env.W * cs + 20, H = env.H * cs + 20;
    let fn = null, Q, s, eps = 0.3, rets = [], ret = 0, steps = 0;
    const reset = () => { Q = Array.from({ length: N }, () => [0, 0, 0, 0]); s = env.start; rets = []; ret = 0; steps = 0; };
    reset();
    const w = new SL.World({
      W, H: H + 70, autoplay: false,
      update(dt, w) {
        if (!fn) return;
        for (let k = 0; k < 20; k++) {
          const a = Math.random() < eps ? Math.floor(Math.random() * 4) : argmax(Q[s]); const { ns, r, done } = env.step(s, a);
          let v; try { v = fn(Q[s][a], r, Math.max(...Q[ns]), 0.5, 0.9, done); } catch (e) { w.pause(); api.setMsg('err', '⚠️ qUpdate hata verdi: ' + SL.jsErrorText(e)); return; }
          if (typeof v !== 'number' || !isFinite(v)) { w.pause(); api.setMsg('err', '⚠️ qUpdate bir sayı döndürmeli (döndürdüğü: ' + v + ').'); return; }
          Q[s][a] = v; ret += r; steps++; s = ns;
          if (done || steps > 150) { rets.push(ret); ret = 0; steps = 0; s = env.start; }
        }
      },
      render(ctx, w, t) {
        const mx = Math.max(1, ...Q.flat().map(Math.abs));
        for (let i = 0; i < N; i++) {
          const x = 10 + (i % env.W) * cs, y = 10 + Math.floor(i / env.W) * cs, c = env.cell(i);
          ctx.fillStyle = c === '#' ? (t.dark ? '#4a4f63' : '#3d4255') : c === 'L' ? (t.dark ? '#6b2a2a' : '#f3b3a8') : c === 'G' ? (t.dark ? '#24543a' : '#bde8c9') : (() => { const v = Math.max(...Q[i]) / mx; return v >= 0 ? `rgba(46,170,90,${Math.min(0.7, v)})` : `rgba(230,70,70,${Math.min(0.7, -v)})`; })();
          ctx.fillRect(x, y, cs - 1, cs - 1);
          if (c === '.' || c === 'S') { if (Q[i].some(v => v !== 0)) SL.drawLabel(ctx, ARW[argmax(Q[i])], x + cs / 2, y + cs / 2, t.ink, { size: 14 }); }
          if (c === 'G') SL.drawLabel(ctx, '+10', x + cs / 2, y + cs / 2, t.green, { size: 10 }); if (c === 'L') SL.drawLabel(ctx, '−10', x + cs / 2, y + cs / 2, t.red, { size: 10 });
        }
        ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(10 + (s % env.W) * cs + cs / 2, 10 + Math.floor(s / env.W) * cs + cs / 2, 8, 0, 7); ctx.fill();
        lineChart(ctx, 10, H, W - 20, 60, rets.slice(-150), t.blue, t, `bölüm getirisi (${rets.length} bölüm)`);
      },
      reset() { reset(); }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    const ref = (q, r, m, a, g, d) => q + a * (r + (d ? 0 : g * m) - q);
    return {
      world: w,
      setFns(f) { fn = f.qUpdate; reset(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try {
          const cases = [[0, -0.1, 0, 0.5, 0.9, false], [2, 10, 5, 0.5, 0.9, true], [1, -0.1, 3, 0.1, 0.9, false], [-2, -10, 4, 1, 0.9, true], [0.5, 0, 2, 0.3, 0.5, false]];
          for (const cs_ of cases) { const got = mod.qUpdate(...cs_), exp = ref(...cs_); if (typeof got !== 'number' || Math.abs(got - exp) > 1e-9) return { ok: false, msg: `❌ qUpdate(${cs_.join(', ')}) = ${got}, beklenen ${exp.toFixed(4)}.${cs_[5] ? ' İpucu: bölüm bittiyse (done) gelecek yok: max Q(s′) kullanılmaz.' : ''}` }; }
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Bellman güncellemesi doğru. Sağda ajan sizin fonksiyonunuzla öğreniyor: oklar hazineye dönüyor, getiri grafiği yükseliyor mu?' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  SL.AILABS.ret = {
    fn: 'discounted_return', jsFn: 'discountedReturn', tol: 1e-9,
    ref: (rs, g) => rs.reduceRight((acc, r) => r + g * acc, 0),
    cases: () => { const cs = [[[1, 1, 1], 1], [[1, 1, 1], 0.5], [[0, 0, 10], 0.9], [[], 0.9], [[-0.1, -0.1, -0.1, 10], 0.9], [[5], 0]]; for (let i = 0; i < 10; i++) cs.push([Array.from({ length: 1 + Math.floor(Math.random() * 8) }, () => Math.round((Math.random() * 4 - 1) * 10) / 10), [0.5, 0.9, 0.99][i % 3]]); return cs; },
    show: (rs, g) => `ödüller ${JSON.stringify(rs)}, γ = ${g}`,
    hint: () => 'G = r₀ + γ·r₁ + γ²·r₂ + … Ya üsleri tek tek hesaplayın ya da sondan başa gidin: G = r + γ·G.'
  };
  SL.AILABS.egreedy = {
    fn: 'epsilon_greedy', jsFn: 'epsilonGreedy',
    ref: (qs, eps, u, k) => { if (u < eps) return k; let b = 0; qs.forEach((v, i) => { if (v > qs[b]) b = i; }); return b; },
    cases: () => { const cs = [[[1, 5, 2, 0], 0.1, 0.5, 3], [[1, 5, 2, 0], 0.1, 0.05, 3], [[0, 0, 0, 0], 0.2, 0.9, 2], [[3, 7, 7, 1], 0, 0.3, 0], [[-1, -3, -0.5, -2], 1, 0.99, 1]]; for (let i = 0; i < 10; i++) cs.push([Array.from({ length: 4 }, () => Math.round((Math.random() * 10 - 3) * 10) / 10), [0.1, 0.3, 0.5][i % 3], Math.round(Math.random() * 100) / 100, Math.floor(Math.random() * 4)]); return cs; },
    show: (qs, e, u, k) => `Q değerleri ${JSON.stringify(qs)}, ε = ${e}, zar u = ${u}, rastgele eylem k = ${k}`,
    hint: () => 'u < ε ise keşif: k döndür. Değilse sömürü: en büyük Q’nun indisi (eşitlikte ilk).'
  };
  SL.AILABS.forward = {
    fn: 'forward', jsFn: 'forward', tol: 1e-6,
    ref: (x, W1, b1, W2, b2) => { const h = W1.map((row, j) => Math.tanh(row.reduce((a, w, i) => a + w * x[i], b1[j]))); return W2.map((row, k) => Math.tanh(row.reduce((a, w, j) => a + w * h[j], b2[k]))); },
    cases: () => { const r = () => Math.round((Math.random() * 2 - 1) * 100) / 100; const cs = [[[1, 0], [[1, 0], [0, 1]], [0, 0], [[1, 1]], [0]], [[0.5, 0.5, 0.5], [[0, 0, 0]], [1], [[2], [-1]], [0, 0.5]]]; for (let i = 0; i < 8; i++) { const ni = 2 + (i % 3), nh = 2 + (i % 2), no = 1 + (i % 2); cs.push([Array.from({ length: ni }, r), Array.from({ length: nh }, () => Array.from({ length: ni }, r)), Array.from({ length: nh }, r), Array.from({ length: no }, () => Array.from({ length: nh }, r)), Array.from({ length: no }, r)]); } return cs; },
    show: (x, W1, b1, W2, b2) => `x = ${JSON.stringify(x)}, W1 = ${JSON.stringify(W1)}, b1 = ${JSON.stringify(b1)}, W2 = ${JSON.stringify(W2)}, b2 = ${JSON.stringify(b2)}`,
    hint: () => 'Her gizli nöron j: h[j] = tanh(b1[j] + Σ W1[j][i]·x[i]). Her çıkış k: y[k] = tanh(b2[k] + Σ W2[k][j]·h[j]). Sonuç bir liste.'
  };

  /* ---------- başlık ---------- */
  D.titlelearn = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const cols = 16, rows = 5, cs = 34, ox = 690, oy = 30;
    let V0 = Array(cols * rows).fill(0), t = 0, timer, running = false;
    const goal = 2 * cols + 15;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // değer yayılımı (değer iterasyonu): hazine değeri ızgaraya yayılır
      const nv = V0.slice(); for (let i = 0; i < V0.length; i++) { if (i === goal) { nv[i] = 1; continue; } const x = i % cols, y = Math.floor(i / cols); let m = 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) m = Math.max(m, V0[ny * cols + nx]); }); nv[i] = 0.9 * m; }
      V0 = nv;
      for (let i = 0; i < V0.length; i++) { const x = ox + (i % cols) * cs, y = oy + Math.floor(i / cols) * cs; ctx.fillStyle = `rgba(122,220,160,${0.08 + V0[i] * 0.6})`; ctx.fillRect(x, y, cs - 3, cs - 3); }
      const gx = ox + (goal % cols) * cs, gy = oy + Math.floor(goal / cols) * cs; ctx.fillStyle = '#ffd36b'; ctx.fillRect(gx, gy, cs - 3, cs - 3);
      if (t % 60 === 0) V0 = Array(cols * rows).fill(0);
    };
    const tick = () => { if (!running) return; t++; draw(); timer = setTimeout(tick, 120); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
