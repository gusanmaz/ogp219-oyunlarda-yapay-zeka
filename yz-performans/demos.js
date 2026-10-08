/* "Oyun YZ'sinde Performans" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const RNG = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ================= kare bütçesi: güncelleme politikaları ================= */
  // her ajanın bir “tam güncelleme” maliyeti (ms): algılama ışınları + karar + yol isteği (ara sıra pahalı)
  D.budget = function (root) {
    const W = 720, H = 340, MW = 400;
    const c = { n: 120, policy: 'all', aiBudget: 4, other: 9 };
    let agents = [], player = V.v(200, 150), hist = [], frame = 0, timer = null, r = RNG(3), rr = 0, focus = 0, drag = false;
    const make = () => { r = RNG(3); agents = Array.from({ length: 400 }, (_, i) => ({ p: V.v(r() * MW, 20 + r() * 270), v: V.fromAngle(r() * 7), last: 0, lod: 0 })); };
    const cost = a => 0.035 + (r() < 0.01 ? 0.6 : 0);         // %1 ihtimalle pahalı yol isteği
    const tick = () => {
      frame++; const N = c.n, A = agents.slice(0, N);
      A.forEach(a => { a.p = V.add(a.p, V.mul(a.v, 0.6)); if (a.p.x < 0 || a.p.x > MW) a.v.x *= -1; if (a.p.y < 20 || a.p.y > 290) a.v.y *= -1; });
      let ms = 0, updated = 0;
      const upd = a => { ms += cost(a); a.last = frame; updated++; };
      A.forEach((a, i) => { const d = V.dist(a.p, player); a.lod = i === focus ? 0 : d < 80 ? 0 : d < 180 ? 1 : 2; });
      if (c.policy === 'all') A.forEach(upd);
      else if (c.policy === 'slice') { let k = 0; while (ms < c.aiBudget && k < N) { upd(A[rr % N]); rr++; k++; } }
      else if (c.policy === 'lod') A.forEach(a => { const every = [1, 4, 15][a.lod]; if ((frame + a.p.x | 0) % every === 0) upd(a); });
      else if (c.policy === 'lodslice') {   // önce yakınlar (LOD 0) her kare, sonra kalan bütçe sırayla diğerlerine
        A.filter(a => a.lod === 0).forEach(upd);
        const rest = A.filter(a => a.lod > 0).sort((x, y) => x.last - y.last);
        for (const a of rest) { if (ms >= c.aiBudget) break; upd(a); }
      }
      hist.push({ ms, updated, total: ms + c.other }); if (hist.length > 160) hist.shift();
    };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const A = agents.slice(0, c.n);
      [80, 180].forEach((rad, i) => { ctx.strokeStyle = i ? t.rule : t.green; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(player.x, player.y, rad, 0, 7); ctx.stroke(); ctx.setLineDash([]); });
      A.forEach((a, i) => { const stale = frame - a.last; ctx.fillStyle = i === focus ? t.amber : [t.green, t.blue, t.muted][a.lod]; ctx.globalAlpha = clamp(1 - stale / 40, 0.25, 1); ctx.beginPath(); ctx.arc(a.p.x, a.p.y, i === focus ? 6 : 3.5, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
      ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(player.x, player.y, 8, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'kamera/oyuncu (sürükle)', player.x, player.y - 16, t.blue, { size: 10 });
      // sağ: kare süresi grafiği
      const gx = MW + 20, gw = W - gx - 10, gy = 20, gh = 200, maxMs = 40;
      ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)'; ctx.fillRect(gx, gy, gw, gh);
      const yOf = ms => gy + gh - (Math.min(maxMs, ms) / maxMs) * gh;
      ctx.strokeStyle = t.red; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, yOf(16.7)); ctx.lineTo(gx + gw, yOf(16.7)); ctx.stroke(); ctx.setLineDash([]);
      SL.drawLabel(ctx, '16,7 ms (60 FPS)', gx + gw - 4, yOf(16.7) - 9, t.red, { size: 10, align: 'right' });
      hist.forEach((h, i) => { const x = gx + (i / 160) * gw, w = gw / 160 + 0.5; ctx.fillStyle = t.dark ? '#4a4f63' : '#c9c6d6'; ctx.fillRect(x, yOf(c.other), w, gy + gh - yOf(c.other)); ctx.fillStyle = h.total > 16.7 ? t.red : t.purple; ctx.fillRect(x, yOf(h.total), w, yOf(c.other) - yOf(h.total)); });
      const last = hist.slice(-60), over = last.filter(h => h.total > 16.7).length, avgUpd = last.reduce((a, h) => a + h.updated, 0) / Math.max(1, last.length);
      const maxStale = Math.max(0, ...A.map(a => frame - a.last)), focusStale = A[focus] ? frame - A[focus].last : 0;
      SL.drawLabel(ctx, 'mor: YZ · gri: diğer sistemler', gx, gy + gh + 14, t.muted, { size: 10, align: 'left' });
      SL.drawLabel(ctx, `son 60 karede bütçe aşımı: ${over}`, gx, gy + gh + 34, over ? t.red : t.green, { size: 11, align: 'left' });
      SL.drawLabel(ctx, `kare başına güncellenen ajan: ${avgUpd.toFixed(0)} / ${c.n}`, gx, gy + gh + 52, t.ink, { size: 11, align: 'left' });
      SL.drawLabel(ctx, `en bayat: ${maxStale} kare · sarı: ${focusStale}`, gx, gy + gh + 70, maxStale > 60 ? t.red : t.ink, { size: 11, align: 'left' });
      info.innerHTML = { all: 'Herkes her kare: ajan sayısı arttıkça kare süresi doğrusal büyür; nadir pahalı yol istekleri <b>sıçrama</b> (kırmızı çubuk) yapar.', slice: `Zaman dilimleme: YZ’ye ${c.aiBudget} ms bütçe; sıra kimdeyse o güncellenir. Kare süresi sabit, ama ajan sayısı artınca herkesin güncelleme aralığı uzar: “en bayat ajan” büyür.`, lod: 'Uzaklığa göre LOD: yakınlar (yeşil) her kare, ortadakiler (mavi) 4 karede bir, uzaktakiler (gri) 15 karede bir. Ucuz ama bütçe garantisi yok: oyuncunun yanına kalabalık gelirse yine aşar.', lodslice: 'Karma (LOD Trader fikrine yakın): önemli olanlar (yakındakiler + takip edilen sarı ajan) her kare; kalan bütçe, en uzun süredir güncellenmeyenlere sırayla. Hem bütçe hem öncelik.' }[c.policy] + ' Soluk noktalar: uzun süredir güncellenmemiş ajanlar.';
    };
    const pos = e => { const b = C.getBoundingClientRect(); return V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height); };
    C.addEventListener('mousedown', e => { const p = pos(e); if (V.dist(p, player) < 20) drag = true; });
    C.addEventListener('mousemove', e => { if (drag) { const p = pos(e); player = V.v(clamp(p.x, 0, MW), clamp(p.y, 20, 290)); } });
    window.addEventListener('mouseup', () => { drag = false; });
    const run = () => { if (timer) return; timer = setInterval(() => { tick(); draw(); }, 33); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Politika: ', select({ all: 'herkes her kare', slice: 'zaman dilimleme (bütçe)', lod: 'uzaklığa göre LOD', lodslice: 'LOD + bütçe (öncelikli)' }, c.policy, v => { c.policy = v; })),
      slider('ajan sayısı', 20, 400, c.n, 10, v => { c.n = v; }), slider('YZ bütçesi (ms)', 1, 10, c.aiBudget, 0.5, v => { c.aiBudget = v; }),
      btn('🎯 başka ajanı takip et', () => { focus = Math.floor(Math.random() * c.n); })), C, info);
    make(); for (let i = 0; i < 5; i++) tick(); draw(); SL.onTheme(draw);
    return { start: run, stop };
  };

  /* ================= yol isteği kuyruğu: kare başına sınırlı A* ================= */
  D.pathqueue = function (root) {
    const W = 720, H = 300, GW = 26, GH = 15, cs = 20;
    const c = { budget: 60, burst: 12 };
    let grid, queue = [], doneList = [], frame = 0, timer = null, active = null, expHist = [], r = RNG(5);
    const mk = () => { r = RNG(5); grid = Array.from({ length: GW * GH }, (_, i) => { const x = i % GW, y = (i / GW) | 0; return x > 0 && x < GW - 1 && y > 0 && y < GH - 1 && r() < 0.22 ? 1 : 0; }); };
    const free = () => { let i; do { i = Math.floor(r() * GW * GH); } while (grid[i]); return i; };
    const startSearch = req => { const g = new Map([[req.s, 0]]); return { req, open: [[0, req.s]], g, par: new Map(), closed: new Set(), exp: 0 }; };
    const h = (a, b) => Math.abs(a % GW - b % GW) + Math.abs(((a / GW) | 0) - ((b / GW) | 0));
    const stepSearch = (S, limit) => {   // en fazla “limit” düğüm aç; bitti mi?
      let n = 0;
      while (S.open.length && n < limit) {
        S.open.sort((x, y) => x[0] - y[0]); const [, cur] = S.open.shift(); if (S.closed.has(cur)) continue; S.closed.add(cur); n++; S.exp++;
        if (cur === S.req.t) { const path = []; for (let k = cur; k !== undefined; k = S.par.get(k)) path.unshift(k); S.path = path; return { n, done: true }; }
        const x = cur % GW, y = (cur / GW) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const q = ny * GW + nx; if (grid[q] || S.closed.has(q)) continue; const ng = S.g.get(cur) + 1; if (ng < (S.g.get(q) ?? Infinity)) { S.g.set(q, ng); S.par.set(q, cur); S.open.push([ng + h(q, S.req.t), q]); } }
      }
      if (!S.open.length) { S.path = null; return { n, done: true }; }
      return { n, done: false };
    };
    const tick = () => {
      frame++; let left = c.budget, used = 0;
      while (left > 0) {
        if (!active) { const req = queue.shift(); if (!req) break; active = startSearch(req); }
        const res = stepSearch(active, left); left -= res.n; used += res.n;
        if (res.done) { doneList.push({ wait: frame - active.req.t0, path: active.path, s: active.req.s, t: active.req.t, at: frame }); active = null; }
      }
      expHist.push(used); if (expHist.length > 160) expHist.shift();
      doneList = doneList.filter(d => frame - d.at < 40);
    };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    let waits = [];
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      grid.forEach((v, i) => { ctx.fillStyle = v ? (t.dark ? '#4a4f63' : '#3d4255') : (t.dark ? '#2b2f40' : '#efe9dc'); ctx.fillRect((i % GW) * cs, ((i / GW) | 0) * cs, cs - 1, cs - 1); });
      if (active) active.closed.forEach(i => { ctx.fillStyle = 'rgba(169,112,255,0.35)'; ctx.fillRect((i % GW) * cs, ((i / GW) | 0) * cs, cs - 1, cs - 1); });
      doneList.forEach(d => { if (!d.path) return; ctx.strokeStyle = t.green; ctx.globalAlpha = 1 - (frame - d.at) / 40; ctx.lineWidth = 2; ctx.beginPath(); d.path.forEach((i, k) => { const x = (i % GW) * cs + cs / 2, y = ((i / GW) | 0) * cs + cs / 2; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.globalAlpha = 1; });
      const gx = GW * cs + 10;
      SL.drawLabel(ctx, `kuyruktaki istek: ${queue.length + (active ? 1 : 0)}`, gx, 20, queue.length > 10 ? t.red : t.ink, { size: 11, align: 'left' });
      const avgW = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
      SL.drawLabel(ctx, `ort. bekleme: ${avgW.toFixed(1)} kare`, gx, 40, t.ink, { size: 11, align: 'left' });
      SL.drawLabel(ctx, `kare başına düğüm: ≤ ${c.budget}`, gx, 60, t.muted, { size: 11, align: 'left' });
      const bx = gx, by = 90, bw = W - gx - 10, bh = 120, mx = Math.max(c.budget, 1);
      ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)'; ctx.fillRect(bx, by, bw, bh);
      expHist.forEach((v, i) => { ctx.fillStyle = t.purple; const hh = (v / mx) * bh; ctx.fillRect(bx + (i / 160) * bw, by + bh - hh, bw / 160 + 0.5, hh); });
      SL.drawLabel(ctx, 'kare başına açılan düğüm', bx, by + bh + 12, t.muted, { size: 10, align: 'left' });
      info.innerHTML = 'Her NPC’nin yol isteği bir <b>kuyruğa</b> girer; yol bulucu her kare en fazla belirli sayıda düğüm açar (mor alan: şu an aranan). Bir arama bitmezse <b>sonraki kareden devam eder</b>. Kare süresi sabit kalır; bedeli, isteklerin birkaç kare beklemesi. Çoğu oyunda NPC bu sürede “düşünüyormuş gibi” bir animasyon oynatır ya da kaba bir yöne yürümeye başlar.';
    };
    const run = () => { if (timer) return; timer = setInterval(() => { tick(); doneList.forEach(d => { if (d.at === frame) { waits.push(d.wait); if (waits.length > 40) waits.shift(); } }); draw(); }, 33); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      btn(`📨 ${c.burst} NPC aynı anda yol istesin`, () => { for (let i = 0; i < c.burst; i++) queue.push({ s: free(), t: free(), t0: frame }); }),
      slider('kare başına düğüm bütçesi', 20, 1000, c.budget, 10, v => { c.budget = v; }), btn('↺ temizle', () => { queue = []; active = null; doneList = []; waits = []; })), C, info);
    mk(); draw(); SL.onTheme(draw);
    return { start: run, stop };
  };

  /* ================= olay tabanlı güncelleme ================= */
  D.events = function (root) {
    const W = 720, H = 260;
    const c = { n: 500, mode: 'frame' };
    let t = 0, ops = 0, opsHist = [], timer = null, heap = [], npcs = [];
    const RATE = 0.1;   // açlık / sn
    const init = () => { const r = RNG(9); npcs = Array.from({ length: 2000 }, (_, i) => ({ hunger: r() * 0.9, rate: RATE * (0.5 + r()), t0: 0 })); heap = npcs.slice(0, c.n).map((n, i) => [(1 - n.hunger) / n.rate, i]).sort((a, b) => a[0] - b[0]); t = 0; ops = 0; opsHist = []; };
    const tick = () => {
      const dt = 1 / 30; t += dt; let o = 0;
      if (c.mode === 'frame') { for (let i = 0; i < c.n; i++) { const n = npcs[i]; n.hunger += n.rate * dt; o++; if (n.hunger >= 1) { n.hunger = 0; } } }
      else { while (heap.length && heap[0][0] <= t) { const [, i] = heap.shift(); o += 1 + Math.log2(c.n); const n = npcs[i]; n.hunger = 0; n.t0 = t; let k = 0; const due = t + 1 / n.rate; while (k < heap.length && heap[k][0] < due) k++; heap.splice(k, 0, [due, i]); } }
      opsHist.push(o); if (opsHist.length > 200) opsHist.shift();
    };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const draw = () => {
      const th = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = th.card; ctx.fillRect(0, 0, W, H);
      const mx = Math.max(10, ...opsHist), gx = 20, gw = 460, gy = 20, gh = 160;
      ctx.fillStyle = th.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)'; ctx.fillRect(gx, gy, gw, gh);
      opsHist.forEach((v, i) => { ctx.fillStyle = c.mode === 'frame' ? th.red : th.green; const hh = (v / mx) * gh; ctx.fillRect(gx + (i / 200) * gw, gy + gh - hh, gw / 200 + 0.5, hh); });
      const avg = opsHist.reduce((a, b) => a + b, 0) / Math.max(1, opsHist.length);
      SL.drawLabel(ctx, `kare başına iş (ortalama): ${avg.toFixed(1)}`, gx, gy + gh + 16, th.ink, { size: 12, align: 'left' });
      // sağ: sıradaki olaylar (öncelik kuyruğu)
      const lx = 500;
      SL.drawLabel(ctx, c.mode === 'events' ? 'sıradaki olaylar (öncelik kuyruğu)' : 'her kare, her NPC: açlık += hız·dt', lx, 22, th.muted, { size: 10, align: 'left' });
      if (c.mode === 'events') heap.slice(0, 7).forEach(([due, i], k) => SL.drawLabel(ctx, `NPC ${i}: ${Math.max(0, due - t).toFixed(1)} sn sonra acıkacak`, lx, 46 + k * 20, th.ink, { size: 11, align: 'left', bg: false }));
      // örnek NPC: açlık değerini istenince hesapla
      const n0 = npcs[0], h0 = c.mode === 'frame' ? n0.hunger : Math.min(1, n0.hunger + n0.rate * (t - n0.t0));
      SL.drawLabel(ctx, `NPC 0 açlık: ${h0.toFixed(2)}${c.mode === 'events' ? ' (istenince formülle hesaplandı)' : ''}`, gx, gy + gh + 40, th.blue, { size: 11, align: 'left' });
      info.innerHTML = c.mode === 'frame'
        ? `Kare tabanlı: ${c.n} NPC’nin açlığı her kare güncelleniyor; iş, NPC sayısıyla doğru orantılı ve <b>her kare</b> ödeniyor.`
        : `Olay tabanlı (David “Rez” Graham, GAP Online 2021): açlık doğrusal arttığı için her NPC’nin <b>ne zaman</b> acıkacağı önceden hesaplanır ve öncelik kuyruğuna (yığın) konur. Kare başına iş sadece o an gerçekleşen olaylar kadar; açlık değeri gerekince <code>açlık = başlangıç + hız · geçen süre</code> ile hesaplanır.`;
    };
    const run = () => { if (timer) return; timer = setInterval(() => { tick(); draw(); }, 33); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yöntem: ', select({ frame: 'her kare güncelle', events: 'olay tabanlı (öncelik kuyruğu)' }, c.mode, v => { c.mode = v; init(); })),
      slider('NPC sayısı', 100, 2000, c.n, 100, v => { c.n = v; init(); })), C, info);
    init(); draw(); SL.onTheme(draw);
    return { start: run, stop };
  };

  /* ---------- simlab: kimi güncelleyeyim? ---------- */
  SL.SIMLABS.slice = function (box, api) {
    const W = 520, H = 280, N = 60, BUDGET = 12;
    let fn = null, frame = 0, agents = [], stats = null;
    const r0 = RNG(2);
    const base = Array.from({ length: N }, () => ({ x: r0() * 480 + 20, y: r0() * 220 + 20 }));
    const player = { x: 260, y: 130 };
    const fresh = () => { agents = base.map((p, i) => ({ id: i, x: p.x, y: p.y, dist: Math.hypot(p.x - player.x, p.y - player.y), lastUpdate: 0 })); frame = 0; };
    fresh();
    const runSim = (f, frames) => {
      const A = base.map((p, i) => ({ id: i, x: p.x, y: p.y, dist: Math.hypot(p.x - player.x, p.y - player.y), lastUpdate: 0 }));
      let over = 0, maxGap = 0, nearMax = 0;
      for (let fr = 1; fr <= frames; fr++) {
        const pick = f(A.map(a => ({ ...a })), BUDGET, fr);
        if (!Array.isArray(pick)) throw new Error('pickAgents bir dizi (indis listesi) döndürmeli');
        const uniq = [...new Set(pick)].filter(i => Number.isInteger(i) && i >= 0 && i < N);
        if (uniq.length > BUDGET) over++;
        uniq.slice(0, BUDGET).forEach(i => { A[i].lastUpdate = fr; });
        A.forEach(a => { const g = fr - a.lastUpdate; if (g > maxGap) maxGap = g; if (a.dist < 60 && g > nearMax) nearMax = g; });
      }
      return { over, maxGap, nearMax, A };
    };
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt, w) {
        if (!fn) return; if (w.frame % 2) return; frame++;
        let pick; try { pick = fn(agents.map(a => ({ ...a })), BUDGET, frame); } catch (e) { w.pause(); api.setMsg('err', '⚠️ pickAgents hata verdi: ' + SL.jsErrorText(e)); return; }
        if (Array.isArray(pick)) [...new Set(pick)].slice(0, BUDGET).forEach(i => { if (agents[i]) agents[i].lastUpdate = frame; });
      },
      render(ctx, w, t) {
        ctx.strokeStyle = t.green; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(player.x, player.y, 60, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        agents.forEach(a => { const g = frame - a.lastUpdate; ctx.fillStyle = g === 0 ? t.amber : g > 10 ? t.red : t.blue; ctx.beginPath(); ctx.arc(a.x, a.y, 5, 0, 7); ctx.fill(); });
        ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(player.x, player.y, 7, 0, 7); ctx.fill();
        SL.drawLabel(ctx, 'sarı: bu kare güncellendi · mavi: yakında · kırmızı: 10+ karedir bekliyor', 10, H - 10, t.muted, { size: 10, align: 'left' });
      },
      reset() { fresh(); }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w,
      setFns(f) { fn = f.pickAgents; fresh(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try {
          const s = runSim(mod.pickAgents, 200);
          if (s.over) return { ok: false, msg: `❌ ${s.over} karede bütçe (${BUDGET} ajan) aşıldı.` };
          if (s.nearMax > 2) return { ok: false, msg: `❌ Oyuncuya yakın (yeşil halka içi) bir ajan ${s.nearMax} kare güncellenmeden kaldı. Yakındakiler en az 2 karede bir güncellenmeli.` };
          if (s.maxGap > 15) return { ok: false, msg: `❌ Bir ajan ${s.maxGap} kare güncellenmedi (açlık/starvation). Hiçbir ajan 15 kareden fazla beklememeli: en uzun süredir bekleyenlere sıra verin.` };
          return { ok: true, msg: `✅ Bütçe hiç aşılmadı; yakındakiler en fazla ${s.nearMax} kare, herkes en fazla ${s.maxGap} kare bekledi.` };
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  SL.AILABS.rr = {
    fn: 'slice_indices', jsFn: 'sliceIndices',
    ref: (n, per, fr) => { if (n === 0) return []; const k = Math.min(per, n), out = []; for (let j = 0; j < k; j++) out.push((fr * k + j) % n); return out; },
    cases: () => [[10, 3, 0], [10, 3, 1], [10, 3, 3], [10, 3, 4], [5, 5, 7], [5, 8, 2], [0, 3, 1], [7, 2, 100], [1, 1, 9], [12, 4, 2]],
    show: (n, p, f) => `n = ${n} ajan, kare başına ${p}, kare no ${f}`,
    hint: () => 'k = min(per_frame, n). Kare f’de güncellenecekler: (f·k + j) mod n, j = 0 … k−1. n = 0 ise boş liste. Böylece ajanlar sırayla, hiçbiri atlanmadan güncellenir.'
  };
  SL.AILABS.lod = {
    fn: 'lod_level', jsFn: 'lodLevel',
    ref: (d, on, tgt, near, far) => (tgt ? 0 : !on ? (d < near ? 1 : 3) : d < near ? 0 : d < far ? 1 : 2),
    cases: () => [[10, true, false, 30, 100], [50, true, false, 30, 100], [150, true, false, 30, 100], [150, true, true, 30, 100], [10, false, false, 30, 100], [500, false, false, 30, 100], [500, false, true, 30, 100], [29.9, true, false, 30, 100], [30, true, false, 30, 100], [100, true, false, 30, 100]],
    show: (d, o, t, n, f) => `uzaklık ${d}, ekranda mı ${o}, oyuncunun hedefi mi ${t}, yakın ${n}, uzak ${f}`,
    hint: () => 'Hedefse her zaman 0. Ekranda değilse: yakınsa (d < near) 1, değilse 3. Ekrandaysa: d < near → 0, d < far → 1, aksi hâlde 2.'
  };
  SL.AILABS.untilev = {
    fn: 'time_until', jsFn: 'timeUntil', tol: 1e-9,
    ref: (v, rate, th) => (v >= th ? 0 : rate <= 0 ? null : (th - v) / rate),
    cases: () => [[0.2, 0.1, 1], [0.95, 0.1, 1], [1.2, 0.1, 1], [0, 0.5, 2], [0.5, 0, 1], [3, 2, 10], [0.25, 0.05, 0.5]],
    show: (v, r, th) => `şu anki değer ${v}, artış hızı ${r}/sn, eşik ${th}`,
    hint: () => 'Değer zaten eşikteyse ya da üstündeyse 0. Hız 0 ya da negatifse asla ulaşmaz: None. Değilse (eşik − değer) / hız.'
  };

  /* ---------- başlık ---------- */
  D.titleperf = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let t = 0, timer, running = false; const r = RNG(1); const bars = Array.from({ length: 90 }, () => 0.3 + r() * 0.3);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const y16 = 60;
      ctx.strokeStyle = 'rgba(255,122,138,0.8)'; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(660, y16); ctx.lineTo(W - 20, y16); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '12px "JetBrains Mono", monospace'; ctx.fillText('16,7 ms', W - 80, y16 - 8);
      bars.forEach((b, i) => { const h = b * 140, x = 660 + i * 6.7; ctx.fillStyle = h > 170 - y16 ? 'rgba(255,122,138,0.9)' : 'rgba(122,200,255,0.75)'; ctx.fillRect(x, 200 - h, 5, h); });
    };
    const tick = () => { if (!running) return; t++; bars.shift(); bars.push(0.3 + r() * 0.3 + (r() < 0.04 ? 0.5 : 0)); draw(); timer = setTimeout(tick, 80); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
