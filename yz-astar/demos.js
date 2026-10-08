/* "A* ile Yol Bulma" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const SQ2 = Math.SQRT2;

  /* ================= ızgara ve arama motoru ================= */
  // cost[i]: 1 normal, 5 bataklık, Infinity duvar
  const HEUR = {
    manhattan: (dx, dy) => dx + dy,
    euclid: (dx, dy) => Math.hypot(dx, dy),
    octile: (dx, dy) => Math.max(dx, dy) + (SQ2 - 1) * Math.min(dx, dy),
    chebyshev: (dx, dy) => Math.max(dx, dy),
    zero: () => 0
  };
  SL.ASTAR_HEUR = HEUR;
  class Heap {   // ikili yığın (Öncelik Kuyrukları destesi)
    constructor() { this.a = []; }
    get size() { return this.a.length; }
    push(x, k) { const a = this.a; a.push([k, x]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
    pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  }
  /* algo: 'bfs' | 'dijkstra' | 'greedy' | 'astar'; w: ağırlık (A* için) */
  function search(G, s, g, o) {
    const { W, H, cost } = G, diag = o.diag, hf = o.hfn || HEUR[o.heur || (diag ? 'octile' : 'manhattan')], w = o.w || 1;
    const N = W * H, gS = new Float64Array(N).fill(Infinity), par = new Int32Array(N).fill(-1), closedAt = new Int32Array(N).fill(-1), openedAt = new Int32Array(N).fill(-1);
    const gx = g % W, gy = (g / W) | 0, h = i => hf(Math.abs((i % W) - gx), Math.abs(((i / W) | 0) - gy));
    const pri = i => (o.algo === 'bfs' ? openedAt[i] : o.algo === 'dijkstra' ? gS[i] : o.algo === 'greedy' ? h(i) : gS[i] + w * h(i));
    const heap = new Heap(); let step = 0, tick = 0;
    gS[s] = 0; openedAt[s] = 0; heap.push(s, pri(s));
    const order = [];
    while (heap.size) {
      const [, cur] = heap.pop();
      if (closedAt[cur] >= 0) continue;
      closedAt[cur] = ++step; order.push(cur);
      if (cur === g) break;
      const cx = cur % W, cy = (cur / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; if (dx && dy && !diag) continue;
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx; if (cost[ni] === Infinity || closedAt[ni] >= 0) continue;
        if (dx && dy && (cost[cy * W + nx] === Infinity || cost[ny * W + cx] === Infinity)) continue;   // köşe kesme yok
        const step2 = (dx && dy ? SQ2 : 1) * (o.algo === 'bfs' ? 1 : (cost[ni] + cost[cur]) / 2);
        const ng = gS[cur] + step2;
        if (o.algo === 'bfs') { if (openedAt[ni] >= 0) continue; gS[ni] = ng; par[ni] = cur; openedAt[ni] = ++tick; heap.push(ni, openedAt[ni]); continue; }
        if (ng < gS[ni]) { gS[ni] = ng; par[ni] = cur; if (openedAt[ni] < 0) openedAt[ni] = step; heap.push(ni, pri(ni)); }
      }
    }
    const path = []; if (closedAt[g] >= 0) for (let x = g; x >= 0; x = par[x]) path.unshift(x);
    let pc = 0; for (let k = 1; k < path.length; k++) { const a = path[k - 1], b = path[k], dg = (a % W !== b % W) && (((a / W) | 0) !== ((b / W) | 0)); pc += (dg ? SQ2 : 1) * (cost[a] + cost[b]) / 2; }
    return { order, closedAt, openedAt, gS, path, cost: path.length ? pc : Infinity, expanded: order.length };
  }
  SL.gridSearch = search;

  const PRESETS = {
    u: (W, H) => { const c = new Array(W * H).fill(1); for (let y = 3; y <= H - 4; y++) c[y * W + 19] = Infinity; for (let x = 11; x <= 19; x++) { c[3 * W + x] = Infinity; c[(H - 4) * W + x] = Infinity; } return { cost: c, s: (H >> 1) * W + 4, g: (H >> 1) * W + 26 }; },
    empty: (W, H) => ({ cost: new Array(W * H).fill(1), s: (H >> 1) * W + 3, g: (H >> 1) * W + W - 4 }),
    swamp: (W, H) => { const c = new Array(W * H).fill(1); for (let y = 0; y < H; y++) for (let x = 12; x <= 17; x++) c[y * W + x] = 5; for (let x = 12; x <= 17; x++) { c[1 * W + x] = 1; c[0 * W + x] = 1; } return { cost: c, s: 8 * W + 3, g: 8 * W + 27 }; },
    maze: (W, H) => {
      const c = new Array(W * H).fill(Infinity), vis = new Set();
      const carve = (x, y) => { vis.add(x + ',' + y); c[y * W + x] = 1; const ds = [[2, 0], [-2, 0], [0, 2], [0, -2]].sort(() => Math.random() - 0.5); for (const [dx, dy] of ds) { const nx = x + dx, ny = y + dy; if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1 || vis.has(nx + ',' + ny)) continue; c[(y + dy / 2) * W + x + dx / 2] = 1; carve(nx, ny); } };
      carve(1, 1); for (let k = 0; k < 40; k++) { const x = 1 + Math.floor(Math.random() * (W - 2)), y = 1 + Math.floor(Math.random() * (H - 2)); c[y * W + x] = 1; }
      const gy = H % 2 ? H - 2 : H - 3, gx = W % 2 ? W - 2 : W - 3; c[gy * W + gx] = 1; return { cost: c, s: 1 * W + 1, g: gy * W + gx };   // hücreler tek koordinatlarda oyulur
    }
  };

  /* ---------- ana demo: düzenlenebilir ızgara ---------- */
  function gridView(G, cell) {
    const W = G.W * cell, H = G.H * cell, cv = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(cv, W, H);
    const draw = (res, k, o = {}) => {
      const t = T(); ctx.clearRect(0, 0, W, H);
      const maxG = res ? Math.max(1, ...res.order.slice(0, k).map(i => res.gS[i]).filter(isFinite)) : 1;
      for (let i = 0; i < G.W * G.H; i++) {
        const x = (i % G.W) * cell, y = ((i / G.W) | 0) * cell, c = G.cost[i];
        let fill = c === Infinity ? (t.dark ? '#4a4f63' : '#3d4255') : c > 1 ? (t.dark ? '#2f4a2a' : '#b9d6a6') : t.card;
        if (res && c !== Infinity) {
          if (res.closedAt[i] >= 0 && res.closedAt[i] <= k) { const f = res.gS[i] / maxG; fill = `hsla(${210 - 170 * f}, 70%, ${t.dark ? 38 : 72}%, ${c > 1 ? 0.75 : 1})`; }
          else if (res.openedAt[i] >= 0 && res.openedAt[i] <= k && (o.algo !== 'bfs')) fill = t.dark ? '#5a4a1a' : '#ffe9b3';
        }
        ctx.fillStyle = fill; ctx.fillRect(x, y, cell, cell);
        if (o.nums && res && res.closedAt[i] >= 0 && res.closedAt[i] <= k && cell >= 30) { ctx.fillStyle = t.dark ? '#fff' : '#111'; ctx.font = '9px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText(res.gS[i].toFixed(1), x + cell / 2, y + cell / 2 + 3); }
      }
      ctx.strokeStyle = t.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
      for (let x = 0; x <= G.W; x++) { ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, H); ctx.stroke(); }
      for (let y = 0; y <= G.H; y++) { ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(W, y * cell); ctx.stroke(); }
      if (res && k >= res.order.length && res.path.length) {
        ctx.strokeStyle = t.red; ctx.lineWidth = Math.max(2, cell / 6); ctx.lineJoin = 'round'; ctx.beginPath();
        res.path.forEach((i, j) => { const x = (i % G.W + 0.5) * cell, y = (((i / G.W) | 0) + 0.5) * cell; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      }
      if (o.smooth && o.smooth.length) { ctx.strokeStyle = t.purple; ctx.lineWidth = Math.max(2, cell / 7); ctx.setLineDash([6, 4]); ctx.beginPath(); o.smooth.forEach((p, j) => (j ? ctx.lineTo(p.x * cell, p.y * cell) : ctx.moveTo(p.x * cell, p.y * cell))); ctx.stroke(); ctx.setLineDash([]); }
      const mark = (i, col, txt) => { const x = (i % G.W + 0.5) * cell, y = (((i / G.W) | 0) + 0.5) * cell; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, cell * 0.38, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(cell * 0.45)}px "Source Sans 3"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1); ctx.textBaseline = 'alphabetic'; };
      mark(G.s, t.blue, 'B'); mark(G.g, t.green, 'H');
      if (o.agent) { ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(o.agent.x * cell, o.agent.y * cell, cell * 0.3, 0, 7); ctx.fill(); }
    };
    return { canvas: cv, draw, cell };
  }
  function attachEditor(view, G, onChange) {
    let mode = null, paint = 1;
    const cellAt = e => { const r = view.canvas.getBoundingClientRect(); const x = Math.floor(((e.clientX - r.left) / r.width) * G.W), y = Math.floor(((e.clientY - r.top) / r.height) * G.H); return x >= 0 && y >= 0 && x < G.W && y < G.H ? y * G.W + x : -1; };
    view.canvas.addEventListener('mousedown', e => { const i = cellAt(e); if (i < 0) return; if (i === G.s) mode = 's'; else if (i === G.g) mode = 'g'; else { mode = 'p'; paint = G.brush === 'erase' ? 1 : G.brush === 'swamp' ? (G.cost[i] === 5 ? 1 : 5) : G.cost[i] === Infinity ? 1 : Infinity; G.cost[i] = paint; onChange(); } });
    view.canvas.addEventListener('mousemove', e => { if (!mode) return; const i = cellAt(e); if (i < 0) return; if (mode === 's' && G.cost[i] !== Infinity && i !== G.g) { G.s = i; onChange(); } else if (mode === 'g' && G.cost[i] !== Infinity && i !== G.s) { G.g = i; onChange(); } else if (mode === 'p' && i !== G.s && i !== G.g && G.cost[i] !== paint) { G.cost[i] = paint; onChange(); } });
    window.addEventListener('mouseup', () => { mode = null; });
  }

  D.astar = function (root) {
    const GW = 30, GH = 16;
    const G = Object.assign({ W: GW, H: GH, brush: 'wall' }, PRESETS[root.dataset.preset || 'u'](GW, GH));
    const cfg = { algo: root.dataset.algo || 'astar', heur: 'auto', diag: true, w: 1, nums: false, anim: true };
    const view = gridView(G, 28), stats = el('div', { class: 'sv-counters' });
    let res;
    const fp = new SL.FramePlayer(f => { view.draw(res, f.k, { algo: cfg.algo, nums: cfg.nums }); }, { speed: 60 });
    const run = (animate) => {
      res = search(G, G.s, G.g, { algo: cfg.algo, diag: cfg.diag, heur: cfg.heur === 'auto' ? null : cfg.heur, w: cfg.w });
      const frames = []; const n = res.order.length, stepK = Math.max(1, Math.ceil(n / 160));
      for (let k = 0; k <= n; k += stepK) frames.push({ k }); frames.push({ k: n + 1 });
      fp.load(frames, animate && cfg.anim ? 0 : 'end'); if (animate && cfg.anim) fp.play();
      stats.innerHTML = `<span class="cnt">genişletilen düğüm <b>${res.expanded}</b></span><span class="cnt">yol maliyeti <b>${isFinite(res.cost) ? res.cost.toFixed(2) : 'yol yok'}</b></span><span class="cnt">yol uzunluğu <b>${res.path.length ? res.path.length - 1 : '-'}</b> adım</span>`;
    };
    attachEditor(view, G, () => run(false));
    const opt = (lab, key, obj) => el('label', { class: 'ctl' }, lab, select(obj, cfg[key], v => { cfg[key] = v; run(true); }));
    root.setAttribute('data-prevent-swipe', '');
    root.append(
      el('div', { class: 'sv-controls' },
        opt('Algoritma: ', 'algo', { bfs: 'BFS (genişlik öncelikli)', dijkstra: 'Dijkstra', greedy: 'Greedy best-first', astar: 'A*' }),
        opt('Sezgi: ', 'heur', { auto: 'otomatik (4 yön: Manhattan, 8 yön: octile)', manhattan: 'Manhattan', euclid: 'Öklid', octile: 'octile', chebyshev: 'Chebyshev', zero: 'sıfır (h = 0)' }),
        slider('A* ağırlığı w', 1, 5, 1, 0.5, v => { cfg.w = v; run(true); }),
        el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.diag = e.target.checked; run(true); } }); x.checked = true; return x; })(), ' çapraz')),
      el('div', { class: 'sv-controls' },
        el('label', { class: 'ctl' }, 'Fırça: ', select({ wall: '🧱 duvar', swamp: '🟩 bataklık (maliyet 5)', erase: '🧽 sil' }, G.brush, v => { G.brush = v; })),
        ...Object.entries({ u: 'U engel', empty: 'boş', swamp: 'bataklık', maze: 'labirent' }).map(([k, lab]) => btn(lab, () => { Object.assign(G, PRESETS[k](GW, GH)); run(true); })),
        el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.nums = e.target.checked; fp.render(); } }); return x; })(), ' g değerleri'),
        btn('▶ Aramayı oynat', () => run(true), 'primary')),
      view.canvas, SL.transport(fp, { min: 5, max: 400, unit: 'kare/sn' }), stats);
    run(true); SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  /* ---------- dört algoritma yan yana ---------- */
  D.compare4 = function (root) {
    const GW = 24, GH = 13;
    const G = Object.assign({ W: GW, H: GH, brush: 'wall' }, (() => { const c = new Array(GW * GH).fill(1); for (let y = 2; y <= 10; y++) c[y * GW + 15] = Infinity; for (let x = 8; x <= 15; x++) { c[2 * GW + x] = Infinity; c[10 * GW + x] = Infinity; } return { cost: c, s: 6 * GW + 3, g: 6 * GW + 21 }; })());
    const algos = [['bfs', 'BFS'], ['dijkstra', 'Dijkstra'], ['greedy', 'Greedy best-first'], ['astar', 'A*']];
    const views = algos.map(() => gridView(G, 18)), labs = algos.map(() => el('div', { class: 'mini' }));
    const grid = el('div', { class: 'cmp4' }); algos.forEach(([, n], i) => grid.append(el('div', null, el('b', null, n), views[i].canvas, labs[i])));
    let results = [];
    const fp = new SL.FramePlayer(f => { results.forEach((r, i) => { views[i].draw(r, f.k, { algo: algos[i][0] }); labs[i].innerHTML = `genişletilen: <b>${Math.min(f.k, r.expanded)}</b>${f.k >= r.expanded ? ` / ${r.expanded} · maliyet <b>${isFinite(r.cost) ? r.cost.toFixed(1) : '—'}</b>` : ''}`; }); }, { speed: 40 });
    const run = () => { results = algos.map(([a]) => search(G, G.s, G.g, { algo: a, diag: true })); const n = Math.max(...results.map(r => r.expanded)); const F = []; for (let k = 0; k <= n + 1; k += 2) F.push({ k }); fp.load(F); fp.play(); };
    views.forEach(v => attachEditor(v, G, run));
    root.setAttribute('data-prevent-swipe', '');
    root.append(grid, SL.transport(fp, { min: 5, max: 300, unit: 'kare/sn' }), el('div', { class: 'mini' }, 'Herhangi bir ızgarada duvar çizin ya da B/H’yi sürükleyin: dördü aynı haritada yeniden yarışır.'));
    run(); SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  /* ---------- yol yumuşatma (string pulling) + steering ile izleme ---------- */
  function los(G, a, b) {   // hücre merkezleri arası görüş (ince adımlarla örnekle)
    const ax = a % G.W + 0.5, ay = ((a / G.W) | 0) + 0.5, bx = b % G.W + 0.5, by = ((b / G.W) | 0) + 0.5;
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
    for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n; for (const [ox, oy] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]]) { const cx = Math.floor(x + ox), cy = Math.floor(y + oy); if (G.cost[cy * G.W + cx] === Infinity) return false; } }
    return true;
  }
  function stringPull(G, path) { if (path.length < 3) return path.slice(); const out = [path[0]]; let anchor = 0; for (let i = 2; i < path.length; i++) if (!los(G, path[anchor], path[i])) { out.push(path[i - 1]); anchor = i - 1; } out.push(path[path.length - 1]); return out; }
  SL.stringPull = stringPull;
  D.smooth = function (root) {
    const GW = 30, GH = 16;
    const G = Object.assign({ W: GW, H: GH, brush: 'wall' }, (() => { const c = new Array(GW * GH).fill(1); const block = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) c[y * GW + x] = Infinity; }; block(8, 0, 9, 9); block(16, 6, 17, 15); block(22, 2, 26, 3); block(4, 12, 7, 13); return { cost: c, s: 13 * GW + 2, g: 2 * GW + 28 }; })());
    const view = gridView(G, 30);
    let res, sm, agent = null, mode = 'smooth', wp = 0, vel = V.v();
    const recompute = () => { res = search(G, G.s, G.g, { algo: 'astar', diag: true }); sm = res.path.length ? stringPull(G, res.path).map(i => V.v(i % GW + 0.5, ((i / GW) | 0) + 0.5)) : []; agent = sm.length ? V.copy(sm[0]) : null; wp = 1; vel = V.v(); };
    const w = new SL.World({
      W: 10, H: 10, reset: recompute,
      update(dt) {
        if (!agent) return;
        const pts = mode === 'smooth' ? sm : res.path.map(i => V.v(i % GW + 0.5, ((i / GW) | 0) + 0.5));
        if (wp >= pts.length) { if (V.len(vel) < 0.05) { recompute(); } vel = V.mul(vel, 0.9); agent = V.add(agent, V.mul(vel, dt)); return; }
        const tgt = pts[wp], last = wp === pts.length - 1, d = V.dist(agent, tgt);
        if (d < (last ? 0.1 : 0.45)) { wp++; return; }
        const des = V.setLen(V.sub(tgt, agent), last ? Math.min(6, d * 3) : 6);
        vel = V.add(vel, V.limit(V.sub(des, vel), 30 * dt)); agent = V.add(agent, V.mul(vel, dt));
      },
      render() { view.draw(res, Infinity, { smooth: mode === 'smooth' ? sm : null, agent }); }
    });
    w.canvas.style.display = 'none';
    attachEditor(view, G, () => { recompute(); });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Ajan şunu izlesin: ', select({ smooth: 'yumuşatılmış yol (mor)', raw: 'ham ızgara yolu (kırmızı)' }, mode, v => { mode = v; recompute(); })), el('span', { class: 'mini' }, 'Duvar çizin, B/H’yi sürükleyin.')), view.canvas, w.controls());
    w.reset();
    return { start: () => w.start(), stop: () => w.stop() };
  };

  /* ---------- simlab: sezgi fonksiyonunu sen yaz ---------- */
  SL.SIMLABS.heur = function (box, api) {
    const GW = 30, GH = 16;
    const maps = ['u', 'empty', 'swamp'].map(k => Object.assign({ W: GW, H: GH }, PRESETS[k](GW, GH)));
    let mi = 0, hfn = null;
    const views = maps.map(G => gridView(G, 18)), holder = el('div'), info = el('div', { class: 'mini' });
    views.forEach((v, k) => { v.canvas.style.display = k ? 'none' : ''; holder.append(v.canvas); });
    const w = new SL.World({
      W: 10, H: 10, autoplay: true,
      reset() { mi = 0; },
      update() {
        if (!hfn || w.frame % 120 !== 1) return;
        const k = mi % 3, G = maps[k];
        let r; try { r = search(G, G.s, G.g, { algo: 'astar', diag: true, hfn }); } catch (e) { w.pause(); api.setMsg('err', '⚠️ heuristic hata verdi: ' + SL.jsErrorText(e)); return; }
        const ref = search(G, G.s, G.g, { algo: 'dijkstra', diag: true });
        views.forEach((v, q) => { v.canvas.style.display = q === k ? '' : 'none'; });
        views[k].draw(r, Infinity, { algo: 'astar' });
        info.innerHTML = `Harita ${k + 1}/3 · A* (sizin sezginiz): <b>${r.expanded}</b> düğüm, maliyet <b>${r.cost.toFixed(2)}</b> · Dijkstra: ${ref.expanded} düğüm, maliyet ${ref.cost.toFixed(2)} ${Math.abs(r.cost - ref.cost) > 1e-6 ? '<b class="c-red">⚠️ en kısa değil!</b>' : '<b class="c-green">✔ en kısa</b>'}`;
        mi++;
      },
      render() {}
    });
    w.canvas.style.display = 'none';
    box.append(holder, info, w.controls({ speed: false }));
    w.reset();
    const cases = [[3, 4], [0, 0], [10, 0], [0, 7], [5, 5], [12, 3], [1, 9]];
    return {
      world: w,
      setFns(f) { hfn = (dx, dy) => { const v = f.heuristic(dx, dy); if (typeof v !== 'number' || !isFinite(v)) throw new Error('heuristic sayı döndürmeli: ' + String(v)); return v; }; w.reset(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try {
          for (const [dx, dy] of cases) { const v = mod.heuristic(dx, dy), want = HEUR.octile(dx, dy); if (typeof v !== 'number' || Math.abs(v - want) > 1e-6) return { ok: false, msg: `❌ heuristic(${dx}, ${dy}) octile mesafesi ${want.toFixed(4)} olmalı. Seninki: ${v}. (Formül: max + (√2 − 1) · min)` }; }
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Octile sezgisi doğru: 8 yönlü ızgarada kabul edilebilir ve tutarlı. Sağda üç haritada Dijkstra’ya göre kaç düğüm daha az genişlettiğini izleyin. Sonra bilerek 3 ile çarpın: yol hâlâ en kısa mı?' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  const parseGrid = rows => ({ W: rows[0].length, H: rows.length, cost: rows.join('').split('').map(ch => (ch === '#' ? Infinity : ch === '~' ? 5 : 1)) });
  SL.AILABS.gridcost = {
    fn: 'astar_cost', jsFn: 'astarCost', tol: 1e-6,
    ref: (rows, s, g) => { const G = parseGrid(rows); const r = search(G, s[1] * G.W + s[0], g[1] * G.W + g[0], { algo: 'dijkstra', diag: false }); return isFinite(r.cost) ? Math.round(r.cost * 1e6) / 1e6 : null; },
    cases: () => {
      const cs = [
        [['.....', '.###.', '.....'], [0, 1], [4, 1]],
        [['..#..', '..#..', '..#..'], [0, 0], [4, 0]],
        [['.~~~.', '.~~~.', '.....'], [0, 0], [4, 0]],
        [['....'], [0, 0], [3, 0]],
        [['.'], [0, 0], [0, 0]],
        [['.#.', '##.', '...'], [0, 0], [2, 2]]
      ];
      for (let i = 0; i < 10; i++) { const W = 6 + Math.floor(Math.random() * 6), H = 4 + Math.floor(Math.random() * 4); const rows = []; for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < W; x++) { const q = Math.random(); r += (x === 0 && y === 0) || (x === W - 1 && y === H - 1) ? '.' : q < 0.22 ? '#' : q < 0.35 ? '~' : '.'; } rows.push(r); } cs.push([rows, [0, 0], [W - 1, H - 1]]); }
      return cs;
    },
    show: (rows, s, g) => `ızgara ${JSON.stringify(rows)}, başlangıç ${JSON.stringify(s)}, hedef ${JSON.stringify(g)}`,
    hint: () => 'Adım maliyeti = (iki hücrenin maliyeti toplamı) / 2 ; "." = 1, "~" = 5, "#" = geçilmez. Sadece 4 yön. Yol yoksa None.'
  };
  SL.AILABS.heuristics = {
    fn: 'heuristics', jsFn: 'heuristics', tol: 1e-9,
    ref: (dx, dy) => [dx + dy, Math.max(dx, dy) + (SQ2 - 1) * Math.min(dx, dy), Math.hypot(dx, dy)],
    cases: () => { const cs = [[0, 0], [3, 4], [5, 0], [0, 5], [7, 7]]; for (let i = 0; i < 10; i++) cs.push([Math.floor(Math.random() * 30), Math.floor(Math.random() * 30)]); return cs; },
    show: (dx, dy) => `dx = ${dx}, dy = ${dy}`,
    hint: () => 'Manhattan = dx + dy · octile = max(dx,dy) + (√2 − 1)·min(dx,dy) · Öklid = √(dx² + dy²)'
  };

  /* ---------- başlık ---------- */
  D.titleastar = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const GW = 44, GH = 10, cell = 22, ox = 300;
    let G, res, k = 0, timer, running = false;
    const fresh = () => { const cost = new Array(GW * GH).fill(1); for (let i = 0; i < 70; i++) cost[Math.floor(Math.random() * GW * GH)] = Infinity; G = { W: GW, H: GH, cost }; const s = 5 * GW + 1, g = 4 * GW + GW - 2; cost[s] = 1; cost[g] = 1; res = search(G, s, g, { algo: 'astar', diag: true }); if (!res.path.length) return fresh(); k = 0; };
    fresh();
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < GW * GH; i++) {
        const x = ox + (i % GW) * cell, y = 6 + ((i / GW) | 0) * cell;
        if (G.cost[i] === Infinity) { ctx.fillStyle = 'rgba(170,170,230,0.35)'; ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4); continue; }
        if (res.closedAt[i] >= 0 && res.closedAt[i] <= k) { ctx.fillStyle = 'rgba(122,200,255,0.35)'; ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8); }
      }
      if (k >= res.order.length) { ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 4; ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 12; ctx.beginPath(); res.path.forEach((i, j) => { const x = ox + (i % GW + 0.5) * cell, y = 6 + (((i / GW) | 0) + 0.5) * cell; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.shadowBlur = 0; }
    };
    const tick = () => { if (!running) return; k += 3; if (k > res.order.length + 60) fresh(); draw(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
