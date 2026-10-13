/* "Ağ Senkronizasyonu" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const big = C => { C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%'; };
  const mpos = (C, W, H) => e => { const b = C.getBoundingClientRect(); return V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height); };
  const clamp = SL.clamp, lerp = (a, b, t) => a + (b - a) * t;
  const keys = (isOn, list, onDown, onUp) => {
    const h = (e, down) => { if (!isOn()) return; const k = e.key === ' ' ? 'space' : e.key.toLowerCase(); if (!list.includes(k) || e.ctrlKey || e.metaKey || e.altKey) return; if (e.target && e.target.closest && e.target.closest('.CodeMirror, input, textarea, select')) return; if (down && e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); return; } (down ? onDown : onUp || (() => {}))(k); e.preventDefault(); e.stopImmediatePropagation(); };
    window.addEventListener('keydown', e => h(e, true), true); window.addEventListener('keyup', e => h(e, false), true);
  };
  const chk = (label, val, fn) => el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => fn(e.target.checked) }); x.checked = val; return x; })(), ' ' + label);
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  /* gecikmeli, kayıplı tek yönlü hat */
  const mkLink = () => { const q = []; return { send(msg, now, delay, loss, rnd) { if (loss && rnd() < loss) return false; q.push({ at: now + delay, msg }); return true; }, poll(now) { const out = []; for (let i = 0; i < q.length;) { if (q[i].at <= now + 1e-9) { out.push(q[i].msg); q.splice(i, 1); } else i++; } return out; }, inFlight: () => q, clear() { q.length = 0; } }; };
  SL.NET = { mkLink, rng };

  /* ================= 1) anlık görüntüler: ham, ara değerleme, dış değerleme ================= */
  const truthAt = t => { const u = (t / 3.4) % 1, tri = u < 0.5 ? u * 2 : 2 - u * 2; return 0.08 + 0.84 * tri; };       // keskin dönüşlü gidiş-geliş
  function makeSnap() {
    const st = { tick: 20, lat: 0.1, loss: 0, idelay: 0.15, simT: 0, hist: [], snaps: [], link: mkLink(), rnd: rng(7), nextSend: 0, under: 0, stats: { raw: 0, interp: 0, extra: 0, n: 0 } };
    st.reset = () => { st.simT = 0; st.hist = []; st.snaps = []; st.link.clear(); st.nextSend = 0; st.under = 0; st.rnd = rng(7); st.stats = { raw: 0, interp: 0, extra: 0, n: 0 }; st.cur = { truth: truthAt(0), raw: truthAt(0), interp: truthAt(0), extra: truthAt(0) }; };
    st.step = dt => {
      st.simT += dt; const now = st.simT;
      while (now >= st.nextSend) { st.link.send({ t: st.nextSend, x: truthAt(st.nextSend) }, st.nextSend, st.lat, st.loss, st.rnd); st.nextSend += 1 / st.tick; }
      st.link.poll(now).forEach(m => { st.snaps.push(m); st.snaps.sort((a, b) => a.t - b.t); if (st.snaps.length > 80) st.snaps.shift(); });
      const S = st.snaps, n = S.length, c = st.cur; c.truth = truthAt(now); c.starved = false;
      if (n) {
        c.raw = S[n - 1].x;
        const rt = now - st.lat - st.idelay; let i = n - 1; while (i > 0 && S[i - 1].t > rt) i--;                         // S[i-1].t <= rt < S[i].t
        if (i === 0) c.interp = S[0].x; else if (S[i].t >= rt && S[i - 1].t <= rt) c.interp = lerp(S[i - 1].x, S[i].x, (rt - S[i - 1].t) / (S[i].t - S[i - 1].t)); else { c.interp = S[n - 1].x; c.starved = true; st.under += dt; }
        if (n > 1) { const a = S[n - 2], b = S[n - 1], v = (b.x - a.x) / (b.t - a.t); c.extra = b.x + v * Math.min(now - b.t, 0.5); } else c.extra = c.raw;
      }
      if (now > 1) { st.stats.n++; st.stats.raw += Math.abs(c.raw - c.truth); st.stats.interp += Math.abs(c.interp - c.truth); st.stats.extra += Math.abs(c.extra - c.truth); }
      st.hist.push([now, c.truth, c.raw, c.interp, c.extra]); while (st.hist.length && st.hist[0][0] < now - 4) st.hist.shift();
    };
    st.reset(); return st;
  }
  SL.makeSnap = makeSnap;
  D.snap = function (root) {
    const W = 720, H = 350, s = makeSnap(); let timer = null;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const X = v => 60 + v * 600;
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const rows = [['truth', t.amber, 'SUNUCU: gerçek konum (şu an)'], ['raw', t.red, 'İSTEMCİ: son gelen paketi göster (ham)'], ['interp', t.green, `İSTEMCİ: ara değerleme (${Math.round((s.lat + s.idelay) * 1000)} ms geçmişi gösterir)`], ['extra', t.purple, 'İSTEMCİ: dış değerleme (son hızla ileri tahmin)']];
      rows.forEach(([k, c, name], i) => { const y = 30 + i * 34; ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(0), y); ctx.lineTo(X(1), y); ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(s.cur[k]), y, 9, 0, 7); ctx.fill(); SL.drawLabel(ctx, name + (k === 'interp' && s.cur.starved ? '  ⚠ tampon boş!' : ''), X(0), y - 15, c, { size: 10, align: 'left' }); });
      s.link.inFlight().forEach(m => { const f = clamp((m.at - s.simT) / (s.lat || 1e-6), 0, 1); ctx.fillStyle = t.amber; ctx.globalAlpha = 0.7; ctx.fillRect(X(m.msg.x) - 3, lerp(64, 30, f) - 3, 6, 6); ctx.globalAlpha = 1; });
      const gy0 = 335, gh = 170, gx0 = 40, gw = 660, tx = tt => gx0 + ((tt - (s.simT - 4)) / 4) * gw, vy = v => gy0 - 8 - v * (gh - 16);
      ctx.strokeStyle = t.rule; ctx.strokeRect(gx0, gy0 - gh, gw, gh); SL.drawLabel(ctx, 'konum – zaman (son 4 sn)', gx0 + 6, gy0 - gh + 10, t.muted, { size: 10, align: 'left' });
      [[1, t.amber, 2.5, [6, 4]], [2, t.red, 1.5, []], [4, t.purple, 1.5, []], [3, t.green, 2.2, []]].forEach(([ix, c, lw, dash]) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath(); s.hist.forEach((h, i) => { const x = tx(h[0]), y = vy(h[ix]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }); ctx.setLineDash([]);
      const n = s.stats.n || 1, e = k => Math.round(s.stats[k] / n * 1000);
      info.innerHTML = `Sunucudaki nesne (sarı) sağa sola gidiyor; sunucu konumunu saniyede <b>${s.tick} kez</b> paketleyip yolluyor (uçan küçük kareler), paketler <b>${Math.round(s.lat * 1000)} ms</b> sonra varıyor${s.loss ? `, %${Math.round(s.loss * 100)}’i yolda kayboluyor` : ''}. İstemci aynı paketlerle üç şey yapabilir. <b class="c-red">Ham:</b> son paketi göster; nesne ${s.tick} FPS’lik bir film gibi <b>zıplar</b>. <b class="c-green">Ara değerleme:</b> bilerek ${Math.round(s.idelay * 1000)} ms geride kal, eldeki iki paketin arasını doldur: pürüzsüz ama geçmiş. <b class="c-purple">Dış değerleme:</b> son hızla ileriye tahmin et: güncel ama nesne dönünce <b>taşar</b>. Ortalama hata (1000 birimlik şeritte): ham ${e('raw')}, ara ${e('interp')}, dış ${e('extra')} birim.`;
    };
    const run = () => { if (timer) return; timer = setInterval(() => { for (let k = 0; k < 4; k++) s.step(1 / 240); draw(); }, 1000 / 60); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('paket hızı (Hz)', 4, 60, s.tick, 1, v => { s.tick = v; s.stats = { raw: 0, interp: 0, extra: 0, n: 0 }; }), slider('gecikme (ms)', 0, 300, s.lat * 1000, 10, v => { s.lat = v / 1000; s.stats = { raw: 0, interp: 0, extra: 0, n: 0 }; }), slider('kayıp (%)', 0, 40, 0, 5, v => { s.loss = v / 100; s.stats = { raw: 0, interp: 0, extra: 0, n: 0 }; }), slider('ara değerleme tamponu (ms)', 0, 400, s.idelay * 1000, 10, v => { s.idelay = v / 1000; s.stats = { raw: 0, interp: 0, extra: 0, n: 0 }; })), C, info);
    draw(); SL.onTheme(draw); SL._snap = s;
    return { start: run, stop };
  };

  /* ================= 2) istemci tahmini ve sunucu uzlaştırması ================= */
  function makePredict(o = {}) {
    const SPEED = 0.42, st = { lat: 0.15, predict: true, reconcile: true, rate: 10, dir: 0, up: mkLink(), down: mkLink(), sound: !!o.sound };
    st.reset = () => { st.simT = 0; st.server = { x: 0.5, last: 0 }; st.cx = 0.5; st.seq = 0; st.pending = []; st.up.clear(); st.down.clear(); st.nextState = 0; st.acc = 0; st.snaps = 0; st.snapMax = 0; st.lastSrv = 0.5; st.trail = []; st.flash = 0; };
    const cstep = h => {                                   // istemcinin bir karesi (60 Hz)
      if (st.dir) { const inp = { seq: ++st.seq, dx: st.dir * SPEED * h }; st.up.send(inp, st.simT, st.lat); if (st.predict) { st.cx = clamp(st.cx + inp.dx, 0.03, 0.97); st.pending.push(inp); } }
    };
    st.step = dt => {
      st.simT += dt; const now = st.simT;
      st.acc += dt; while (st.acc >= 1 / 60) { st.acc -= 1 / 60; cstep(1 / 60); }
      st.up.poll(now).forEach(inp => { st.server.x = clamp(st.server.x + inp.dx, 0.03, 0.97); st.server.last = inp.seq; });                 // sunucu girdiyi uygular
      while (now >= st.nextState) { st.down.send({ x: st.server.x, last: st.server.last }, now, st.lat); st.nextState += 1 / st.rate; }      // sunucu durumu yollar
      st.down.poll(now).forEach(m => {
        const before = st.cx; st.lastSrv = m.x;
        if (!st.predict) st.cx = m.x;
        else if (!st.reconcile) { st.cx = m.x; st.pending = []; }
        else { st.pending = st.pending.filter(p => p.seq > m.last); let x = m.x; st.pending.forEach(p => { x = clamp(x + p.dx, 0.03, 0.97); }); st.cx = x; }
        const jump = Math.abs(st.cx - before); if (st.predict && jump > 0.004) { st.snaps++; st.snapMax = Math.max(st.snapMax, jump); st.flash = 0.25; if (st.sound) SL.sfx('knock'); }
      });
      st.flash = Math.max(0, st.flash - dt);
      st.trail.push([now, st.server.x, st.cx]); while (st.trail.length && st.trail[0][0] < now - 4) st.trail.shift();
    };
    st.push = () => { st.server.x = clamp(st.server.x + (st.server.x < 0.5 ? 0.18 : -0.18), 0.03, 0.97); };
    st.reset(); return st;
  }
  SL.makePredict = makePredict;
  D.predict = function (root) {
    const W = 720, H = 340, s = makePredict({ sound: true }); let timer = null, last = 0, kk = {};
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const X = v => 50 + v * 620;
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const lane = (y, name, c) => { ctx.fillStyle = t.dark ? '#33374a' : '#e8e9ef'; ctx.fillRect(X(0), y - 22, 620, 44); SL.drawLabel(ctx, name, X(0) + 4, y - 32, c, { size: 11, align: 'left', bold: true }); };
      lane(60, 'SUNUCU: yetkili (gerçek) konum', t.amber); lane(150, `OYUNCUNUN EKRANI${s.predict ? '' : ' (sunucudan geleni gösterir)'}`, t.green);
      ctx.fillStyle = t.amber; ctx.fillRect(X(s.server.x) - 14, 60 - 16, 28, 32);
      ctx.strokeStyle = t.amber; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.strokeRect(X(s.lastSrv) - 14, 150 - 16, 28, 32); ctx.setLineDash([]);
      ctx.fillStyle = s.flash > 0 ? t.red : t.green; ctx.fillRect(X(s.cx) - 14, 150 - 16, 28, 32);
      s.up.inFlight().forEach(m => { const f = clamp((m.at - s.simT) / (s.lat || 1e-6), 0, 1); ctx.fillStyle = t.green; ctx.fillRect(X(s.cx) + (m.msg.seq % 5) * 5 - 12, lerp(84, 128, f), 4, 4); });
      s.down.inFlight().forEach(m => { const f = clamp((m.at - s.simT) / (s.lat || 1e-6), 0, 1); ctx.fillStyle = t.amber; ctx.fillRect(X(m.msg.x) - 4, lerp(124, 84, f), 8, 8); });
      const gy0 = 328, gh = 130, gx0 = 50, gw = 620, tx = tt => gx0 + ((tt - (s.simT - 4)) / 4) * gw, vy = v => gy0 - 6 - v * (gh - 12);
      ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.strokeRect(gx0, gy0 - gh, gw, gh); SL.drawLabel(ctx, 'konum – zaman (son 4 sn): sarı = sunucu, yeşil = ekran', gx0 + 6, gy0 - gh + 10, t.muted, { size: 10, align: 'left' });
      [[1, t.amber, 2, [5, 4]], [2, t.green, 2, []]].forEach(([ix, c, lw, dash]) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath(); s.trail.forEach((h, i) => { const x = tx(h[0]), y = vy(h[ix]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }); ctx.setLineDash([]);
      SL.drawLabel(ctx, `gidiş-dönüş ${Math.round(s.lat * 2000)} ms · onay bekleyen girdi: ${s.pending.length} · geri sıçrama: ${s.snaps}${s.snaps ? ' (en büyüğü ' + Math.round(s.snapMax * 1000) + ' birim)' : ''}`, X(0), 198 - 4, s.snaps ? t.red : t.ink, { size: 11, align: 'left' });
      info.innerHTML = `<b>A / D</b> ile yeşil kutuyu yürütün. Tuş basışlarınız (küçük yeşil noktalar) sunucuya <b>${Math.round(s.lat * 1000)} ms</b>’de gider; sunucu sarı kutuyu oynatır ve saniyede 10 kez durumu geri yollar (sarı kareler). Kesikli sarı çerçeve: sunucudan gelen son haber. ${!s.predict ? '<b>Tahmin kapalı:</b> ekran yalnızca sunucudan geleni gösteriyor; tuşa basıyorsunuz, kutu ' + Math.round(s.lat * 2000) + ' ms sonra ve kesik kesik kıpırdıyor.' : !s.reconcile ? '<b>Tahmin açık, uzlaştırma kapalı:</b> kutu hemen kıpırdıyor ama sunucudan her haber geldiğinde <b>geçmişteki</b> yerine geri çekiliyor (kırmızı yanıp sönme: lastik bant etkisi).' : '<b>Tahmin + uzlaştırma:</b> kutu hemen kıpırdıyor; sunucudan haber gelince istemci o habere, henüz onaylanmamış girdilerini <b>yeniden uyguluyor</b>. Sıçrama yok. “Sunucu itmesi”ne basın: sunucunun beklenmedik kararı ekrana tek bir düzeltme olarak yansır.'}`;
    };
    const loop = now => { if (!timer) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; s.dir = (kk.d ? 1 : 0) - (kk.a ? 1 : 0); let r = dt; while (r > 0) { const h = Math.min(r, 1 / 240); s.step(h); r -= h; } draw(); timer = requestAnimationFrame(loop); };
    const start = () => { if (timer) return; last = 0; timer = requestAnimationFrame(loop); }, stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; kk = {}; };
    keys(() => !!timer, ['a', 'd'], k => { kk[k] = true; }, k => { kk[k] = false; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('tek yön gecikme (ms)', 0, 400, s.lat * 1000, 10, v => { s.lat = v / 1000; }), chk('istemci tahmini', true, v => { s.predict = v; s.pending = []; s.snaps = 0; s.snapMax = 0; }), chk('uzlaştırma', true, v => { s.reconcile = v; s.snaps = 0; s.snapMax = 0; }), btn('👊 sunucu itmesi', () => s.push()), btn('↺ baştan', () => s.reset())), C, info);
    draw(); SL.onTheme(draw); SL._predict = s;
    return { start, stop };
  };

  /* ================= 3) gecikme telafisi: sunucu zamanı geri sarar ================= */
  function makeLag(o = {}) {
    const HALF = 0.03, COVER = 0.84, INTERP = 0.1;
    const st = { lat: 0.1, comp: true, simT: 0, up: mkLink(), shots: 0, seen: 0, granted: 0, behind: 0, marks: [], sound: !!o.sound, HALF, COVER };
    st.target = t => { const u = (t / 3.6) % 1, tri = u < 0.5 ? u * 2 : 2 - u * 2; return 0.1 + 0.85 * tri; };              // rakip: sipere girip çıkar
    st.viewT = () => st.simT - st.lat - INTERP;                                                                              // nişancının ekranındaki an
    st.fire = aim => { const vt = st.viewT(), seenHit = Math.abs(aim - st.target(vt)) <= HALF; st.shots++; if (seenHit) st.seen++; st.up.send({ aim, vt, seenHit }, st.simT, st.lat); if (st.sound) SL.sfx('shot'); return seenHit; };
    st.step = dt => {
      st.simT += dt;
      st.up.poll(st.simT).forEach(m => {
        const nowX = st.target(st.simT), thenX = st.target(m.vt), testX = st.comp ? thenX : nowX, hit = Math.abs(m.aim - testX) <= HALF;
        if (hit) { st.granted++; if (nowX > COVER) st.behind++; if (st.sound) SL.sfx('alert'); }
        st.marks.push({ t: st.simT, aim: m.aim, hit, nowX, thenX, seenHit: m.seenHit, cover: hit && nowX > COVER }); if (st.marks.length > 6) st.marks.shift();
      });
    };
    st.reset = () => { st.simT = 0; st.up.clear(); st.shots = st.seen = st.granted = st.behind = 0; st.marks = []; };
    return st;
  }
  SL.makeLag = makeLag;
  D.lagcomp = function (root) {
    const W = 720, H = 330, s = makeLag({ sound: true }); let timer = null, last = 0, mx = 0.5;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const X = v => 40 + v * 640;
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const lane = (y, name, c) => { ctx.fillStyle = t.dark ? '#33374a' : '#e8e9ef'; ctx.fillRect(X(0), y - 34, 640, 68); ctx.fillStyle = t.dark ? '#5a5f78' : '#8a8fa6'; ctx.fillRect(X(s.COVER), y - 34, X(1) - X(s.COVER), 68); ctx.fillStyle = '#fff'; ctx.font = '600 10px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SİPER', X((s.COVER + 1) / 2), y - 24); SL.drawLabel(ctx, name, X(0) + 4, y - 44, c, { size: 11, align: 'left', bold: true }); };
      const tgt = (x, y, c, ghost) => { ctx.fillStyle = c; ctx.globalAlpha = ghost ? 0.35 : 1; ctx.fillRect(X(x - s.HALF), y - 22, X(s.HALF * 2) - X(0), 44); ctx.globalAlpha = 1; };
      const vt = s.viewT();
      lane(70, `NİŞANCININ EKRANI: rakibin ${Math.round((s.lat + 0.1) * 1000)} ms önceki hâli`, t.green); tgt(s.target(vt), 70, t.blue);
      ctx.strokeStyle = t.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(mx), 36); ctx.lineTo(X(mx), 104); ctx.moveTo(X(mx) - 10, 70); ctx.lineTo(X(mx) + 10, 70); ctx.stroke();
      lane(200, 'SUNUCU: rakip şu an gerçekte burada', t.amber); tgt(s.target(vt), 200, t.blue, true); tgt(s.target(s.simT), 200, t.blue);
      s.up.inFlight().forEach(m => { const f = clamp((m.at - s.simT) / (s.lat || 1e-6), 0, 1); ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(X(m.msg.aim), lerp(166, 104, f), 4, 0, 7); ctx.fill(); });
      s.marks.forEach(m => { const age = s.simT - m.t; if (age > 1.6) return; ctx.globalAlpha = clamp(1.6 - age, 0, 1); ctx.strokeStyle = m.hit ? t.green : t.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(m.aim) - 8, 192); ctx.lineTo(X(m.aim) + 8, 208); ctx.moveTo(X(m.aim) + 8, 192); ctx.lineTo(X(m.aim) - 8, 208); ctx.stroke(); SL.drawLabel(ctx, m.hit ? (m.cover ? 'İSABET (rakip siperdeydi!)' : 'İSABET') : (m.seenHit ? 'ISKA (ekranda vurmuştu)' : 'ıska'), X(m.aim), 244, m.hit ? t.green : t.red, { size: 11, bold: true }); ctx.globalAlpha = 1; });
      SL.drawLabel(ctx, `atış ${s.shots} · nişancının ekranında isabet ${s.seen} · sunucunun saydığı isabet ${s.granted} · siperdeyken vurulan ${s.behind}`, X(0), 286, t.ink, { size: 11, align: 'left' });
      SL.drawLabel(ctx, 'soluk mavi: nişancının o an gördüğü yer (sunucu bunu ancak zamanı geri sararak bilebilir)', X(0), 304, t.muted, { size: 10, align: 'left' });
      info.innerHTML = `Üst şerit sizin ekranınız: fareyle nişan alın, <b>tıklayın</b> (ya da <b>boşluk</b>). Mavi rakip sağa sola koşup sipere giriyor. Gördüğünüz, rakibin <b>geçmişteki</b> hâli: gecikme + 100 ms ara değerleme tamponu. Atışınız sunucuya ${Math.round(s.lat * 1000)} ms sonra varıyor; alt şeritte sunucunun o anki dünyası. ${s.comp ? '<b>Telafi açık:</b> sunucu rakibi, sizin tetiğe bastığınız andaki yerine <b>geri sarıp</b> öyle sınıyor: ekranda vurduysanız vurmuşsunuzdur. Bedeli: rakip sipere girdikten sonra vurulabilir.' : '<b>Telafi kapalı:</b> sunucu atışı rakibin <b>şu anki</b> yerine göre sınıyor. Rakip o arada yürüdü: tam üstüne nişan alan ıskalar; vurmak için önüne nişan almanız gerekir.'}`;
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousemove', e => { mx = clamp((mp(e).x - 40) / 640, 0, 1); });
    C.addEventListener('mousedown', e => { mx = clamp((mp(e).x - 40) / 640, 0, 1); if (timer) s.fire(mx); });
    C.style.cursor = 'crosshair';
    const loop = now => { if (!timer) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; s.step(dt); draw(); timer = requestAnimationFrame(loop); };
    const start = () => { if (timer) return; last = 0; timer = requestAnimationFrame(loop); }, stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; };
    keys(() => !!timer, ['space'], () => s.fire(mx));
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('tek yön gecikme (ms)', 0, 300, s.lat * 1000, 10, v => { s.lat = v / 1000; }), chk('gecikme telafisi (sunucu geri sarar)', true, v => { s.comp = v; }), btn('↺ sayaçları sıfırla', () => s.reset())), C, info);
    draw(); SL.onTheme(draw); SL._lag = s;
    return { start, stop };
  };

  /* ================= 4) girdi gecikmesi mi, geri sarma mı? ================= */
  function makeRoll(o = {}) {
    const SP = 6, LO = 20, HI = 700;
    const st = { L: 6, mode: 'rollback', f: 0, loc: [], rem: [], localDir: 0, rollbacks: 0, resim: 0, maxFix: 0, flash: 0, marks: [], sound: !!o.sound };
    const rnd = rng(42); let botDir = 1, botLeft = 0;
    const botInput = () => { if (botLeft-- <= 0) { botDir = [-1, 0, 1, 1, -1][Math.floor(rnd() * 5)]; botLeft = 18 + Math.floor(rnd() * 50); } return botDir; };
    const sim = (s, a, b) => ({ x1: clamp(s.x1 + a * SP, LO, HI), x2: clamp(s.x2 + b * SP, LO, HI) });
    st.reset = () => { st.f = 0; st.loc = []; st.rem = []; st.conf = { x1: 180, x2: 540 }; st.confF = 0; st.shown = { x1: 180, x2: 540 }; st.truth = { x1: 180, x2: 540 }; st.rollbacks = st.resim = st.maxFix = 0; st.marks = []; st.pred = []; };
    st.frame = () => {                                                // yerel makinede bir kare
      const f = st.f; st.loc[f] = st.localDir; st.rem[f] = botInput();              // rem[f]: uzaktaki oyuncunun f karesindeki GERÇEK girdisi (L kare sonra elimize ulaşır)
      st.truth = sim(st.truth, st.loc[f], st.rem[f]);                               // gecikmesiz bir dünyada olacak olan
      const known = f - st.L;                                                        // bu kareye kadar uzak girdiler elimizde
      if (st.mode === 'delay') { if (known >= 0) st.shown = sim(st.shown, st.loc[known], st.rem[known]); st.marks.push(0); }
      else {
        let miss = false;
        if (known >= 0) { if (st.pred[known] !== undefined && st.pred[known] !== st.rem[known]) miss = true; st.conf = sim(st.conf, st.loc[known], st.rem[known]); st.confF = known + 1; }
        const guess = known >= 0 ? st.rem[known] : 0;                                // tahmin: "en son ne yapıyorsa onu yapmaya devam ediyor"
        let s = { ...st.conf }; for (let k = Math.max(0, known + 1); k <= f; k++) { s = sim(s, st.loc[k], guess); st.pred[k] = guess; }
        if (miss) { st.rollbacks++; st.resim += st.L; const fix = Math.abs(s.x2 - (st.shown.x2 + guess * SP)); st.maxFix = Math.max(st.maxFix, fix); st.flash = 8; if (st.sound) SL.sfx('knock'); }
        st.shown = s; st.marks.push(miss ? 2 : 1);
      }
      if (st.marks.length > 60) st.marks.shift(); st.flash = Math.max(0, st.flash - 1); st.f++;
    };
    st.reset(); return st;
  }
  SL.makeRoll = makeRoll;
  D.rollback = function (root) {
    const W = 720, H = 320, s = makeRoll({ sound: true }); let timer = null, kk = {};
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = t.dark ? '#33374a' : '#e8e9ef'; ctx.fillRect(10, 60, 700, 120); ctx.fillStyle = t.dark ? '#4a4f63' : '#5b6078'; ctx.fillRect(10, 180, 700, 6);
      const fig = (x, c, name, ghost) => { ctx.globalAlpha = ghost ? 0.3 : 1; ctx.fillStyle = c; ctx.fillRect(x - 14, 120, 28, 60); ctx.beginPath(); ctx.arc(x, 106, 13, 0, 7); ctx.fill(); ctx.globalAlpha = 1; if (!ghost) SL.drawLabel(ctx, name, clamp(x, 64, 656), 82, c, { size: 11, bold: true }); };
      fig(s.truth.x1, t.green, '', true); fig(s.truth.x2, t.red, '', true);
      fig(s.shown.x1, t.green, 'SİZ (A / D)'); fig(s.shown.x2, s.flash > 0 ? t.amber : t.red, 'RAKİP (uzakta)');
      SL.drawLabel(ctx, 'soluk gölgeler: gecikme hiç olmasaydı görecekleriniz', 14, 50, t.muted, { size: 10, align: 'left' });
      const ms = Math.round(s.L * 1000 / 60);
      SL.drawLabel(ctx, s.mode === 'delay' ? `GİRDİ GECİKMESİ: tuşunuz ${s.L} kare (${ms} ms) sonra işleniyor` : `GERİ SARMA: tuşunuz hemen işleniyor; rakibin son ${s.L} karesi tahmin`, 14, 20, t.ink, { size: 12, align: 'left', bold: true });
      const bx = 14, by = 222, bw = 11.5; SL.drawLabel(ctx, 'son 60 kare:', bx, by - 12, t.muted, { size: 10, align: 'left' });
      s.marks.forEach((m, i) => { ctx.fillStyle = m === 0 ? (t.dark ? '#6c7391' : '#b9bdd0') : m === 2 ? t.red : (i >= s.marks.length - s.L ? t.amber : t.green); ctx.fillRect(bx + i * bw, by, bw - 2, 18); });
      SL.drawLabel(ctx, s.mode === 'delay' ? 'gri: her kare, iki oyuncunun da girdisi elimize ulaşana kadar bekletilmiş' : 'yeşil: kesinleşmiş · sarı: rakibin girdisi henüz tahmin · kırmızı: tahmin tutmadı, geri sarıldı', bx, by + 34, t.muted, { size: 10, align: 'left' });
      SL.drawLabel(ctx, s.mode === 'delay' ? `sizin gecikmeniz: ${ms} ms · geri sarma: yok` : `sizin gecikmeniz: 0 ms · geri sarma ${s.rollbacks} kez · yeniden simüle edilen ${s.resim} kare · en büyük düzeltme ${Math.round(s.maxFix)} piksel`, bx, by + 58, t.ink, { size: 11, align: 'left' });
      info.innerHTML = `İki oyunculu bir dövüş oyununun <b>sizin makinenizdeki</b> görüntüsü. Rakibin tuşları size <b>${s.L} kare</b> (${ms} ms) geç ulaşıyor. ${s.mode === 'delay' ? '<b>Girdi gecikmesi</b> yönteminde oyun, iki tarafın girdisi de elde olmadan kareyi ilerletmez: çözüm, <b>herkesin</b> tuşunu ' + s.L + ' kare geciktirmek. Tutarlı ama A / D’ye basınca karakterinizin geç kıpırdadığını hissedersiniz; gecikmeyi 12’ye çıkarın.' : '<b>Geri sarma</b> yönteminde oyun beklemez: rakibin “en son ne yapıyorsa onu sürdürdüğünü” varsayıp kareyi hemen çizer. Gerçek girdi gelip tahmini yalanlarsa (kırmızı kare) oyun o kareye <b>geri sarar</b>, doğru girdiyle ' + s.L + ' kareyi yeniden simüle eder ve rakibi doğru yere koyar (sarı yanıp sönme). Sizin karakteriniz her zaman anında tepki verir.'}`;
    };
    const run = () => { if (timer) return; timer = setInterval(() => { s.localDir = (kk.d ? 1 : 0) - (kk.a ? 1 : 0); s.frame(); draw(); }, 1000 / 60); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } kk = {}; };
    keys(() => !!timer, ['a', 'd'], k => { kk[k] = true; }, k => { kk[k] = false; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Yöntem: ', select({ rollback: 'geri sarma (rollback)', delay: 'girdi gecikmesi (delay)' }, s.mode, v => { s.mode = v; s.reset(); })), slider('ağ gecikmesi (kare)', 0, 14, s.L, 1, v => { s.L = v; s.reset(); }), btn('↺ baştan', () => s.reset())), C, info);
    draw(); SL.onTheme(draw); SL._roll = s;
    return { start: run, stop };
  };

  /* ---------- simlab: uzlaştırma ---------- */
  SL.SIMLABS.reconcile = function (box, api) {
    const W = 520, H = 280, LAT = 0.18, SP = 0.32;
    let fn = null, err = null, S, jumps = 0;
    const ref = (sx, last, pend) => { const rest = pend.filter(p => p.seq > last); let x = sx; rest.forEach(p => { x += p.dx; }); return [x, rest]; };
    const mk = g => ({ g, x: 0.5, pending: [], down: mkLink() });
    const fresh = () => { S = { t: 0, acc: 0, seq: 0, server: { x: 0.5, last: 0 }, up: mkLink(), nextState: 0, me: mk(null), good: mk(ref) }; jumps = 0; err = null; };
    fresh();
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt) {
        if (!fn || err) return; dt = Math.min(dt, 0.05); S.t += dt; S.acc += dt; S.me.g = fn;
        const dir = Math.floor(S.t / 1.5) % 4 === 0 ? 1 : Math.floor(S.t / 1.5) % 4 === 2 ? -1 : 0;
        while (S.acc >= 1 / 60) { S.acc -= 1 / 60; if (dir) { const inp = { seq: ++S.seq, dx: dir * SP / 60 }; S.up.send(inp, S.t, LAT); [S.me, S.good].forEach(c => { c.x += inp.dx; c.pending.push({ ...inp }); }); } }
        S.up.poll(S.t).forEach(i => { S.server.x += i.dx; S.server.last = i.seq; });
        while (S.t >= S.nextState) { [S.me, S.good].forEach(c => c.down.send({ x: S.server.x, last: S.server.last }, S.t, LAT)); S.nextState += 0.1; }
        for (const c of [S.me, S.good]) for (const m of c.down.poll(S.t)) {
          let out; try { out = c.g(m.x, m.last, c.pending.map(p => ({ ...p }))); } catch (e) { err = SL.jsErrorText(e); return; }
          if (!Array.isArray(out) || out.length !== 2 || !Number.isFinite(out[0]) || !Array.isArray(out[1])) { err = 'reconcile [x, yeniBekleyen] döndürmeli'; return; }
          if (c === S.me && Math.abs(out[0] - c.x) > 0.004) jumps++;
          c.x = out[0]; c.pending = out[1];
        }
      },
      render(ctx, w, t) {
        const X = v => 30 + v * (W - 60);
        [['SUNUCU', S.server.x, t.amber, 70], ['sizin kodunuz', S.me.x, t.blue, 140], ['doğrusu', S.good.x, t.green, 210]].forEach(([n, x, c, y]) => { ctx.fillStyle = t.dark ? '#33374a' : '#e8e9ef'; ctx.fillRect(X(0), y - 18, W - 60, 36); ctx.fillStyle = c; ctx.fillRect(X(x) - 12, y - 14, 24, 28); SL.drawLabel(ctx, n, X(0) + 4, y - 27, c, { size: 10, align: 'left' }); });
        SL.drawLabel(ctx, err ? '⚠️ ' + err : fn ? `bekleyen girdi: ${S.me.pending.length} · geri sıçrama: ${jumps} ${jumps ? '— lastik bant!' : '✔'}` : 'Kodu çalıştırın', 8, 14, err ? t.red : jumps ? t.red : t.muted, { size: 11, align: 'left' });
      },
      reset() { fresh(); }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w,
      setFns(f) { fn = f.reconcile; fresh(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try {
          const P = (...a) => a.map(([seq, dx]) => ({ seq, dx }));
          for (const [sx, last, pend] of [[11, 1, P([1, 1], [2, 1])], [10, 0, P([1, 1], [2, 1], [3, 1])], [13, 3, P([1, 1], [2, 1], [3, 1])], [5, 7, P([6, -2], [7, -2], [8, -2], [9, 1])], [0, 0, []], [2.5, 4, P([5, 0.5], [6, 0.25])]]) {
            const got = mod.reconcile(sx, last, pend.map(p => ({ ...p }))), want = ref(sx, last, pend);
            if (!Array.isArray(got) || Math.abs(got[0] - want[0]) > 1e-9 || !Array.isArray(got[1]) || got[1].length !== want[1].length || got[1].some((p, i) => p.seq !== want[1][i].seq)) return { ok: false, msg: `❌ reconcile(sunucuX ${sx}, sonİşlenen ${last}, bekleyen [${pend.map(p => '#' + p.seq + ':' + p.dx).join(', ')}]) → ${JSON.stringify(got && [got[0], (got[1] || []).map(p => p.seq)])}; beklenen x = ${want[0]}, kalan girdiler [${want[1].map(p => '#' + p.seq).join(', ')}]. Önce seq ≤ sonİşlenen olanları at; sonra sunucuX’ten başlayıp kalanların dx’lerini sırayla ekle.` };
          }
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Uzlaştırma doğru: mavi kutu yeşille birlikte, hiç geri sıçramadan ilerliyor. Sunucu (sarı) hep 180 ms geriden geliyor ama oyuncu bunu hissetmiyor.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  const rn = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
  SL.AILABS.snaplerp = {
    fn: 'interpolate', jsFn: 'interpolate', tol: 1e-9, ref: (t0, x0, t1, x1, t) => x0 + (x1 - x0) * ((t - t0) / (t1 - t0)),
    cases: () => { const cs = [[1050, 110, 1100, 130, 1075], [1000, 100, 1050, 110, 1000], [1000, 100, 1050, 110, 1050], [0, 0, 100, 50, 25], [200, 80, 250, 20, 240], [1000, 5, 1050, 5, 1020]]; for (let i = 0; i < 6; i++) { const t0 = Math.round(rn(0, 900)); cs.push([t0, rn(0, 500), t0 + 50, rn(0, 500), t0 + Math.round(rn(0, 50))]); } return cs; },
    show: (t0, x0, t1, x1, t) => `paket A: zaman ${t0}, konum ${x0} · paket B: zaman ${t1}, konum ${x1} · çizilecek an: ${t}`,
    hint: (t0, x0, t1, x1, t) => `Önce ters lerp: f = (t − t0) / (t1 − t0) = ${Math.round(((t - t0) / (t1 - t0)) * 1000) / 1000}. Sonra lerp: x0 + (x1 − x0) · f.`
  };
  SL.AILABS.framesbehind = {
    fn: 'frames_behind', jsFn: 'framesBehind', tol: 0, ref: (ms, fps) => Math.ceil(ms * fps / 1000 - 1e-9),
    cases: () => [[100, 60], [50, 60], [16, 60], [17, 60], [0, 60], [100, 30], [133, 60], [250, 20], [33, 30], [34, 30]],
    show: (ms, fps) => `gecikme ${ms} ms, oyun ${fps} FPS`,
    hint: (ms, fps) => `Bir kare ${Math.round(1000 / fps * 10) / 10} ms sürer. ${ms} ms kaç kare eder? ${ms} · ${fps} / 1000 = ${Math.round(ms * fps / 10) / 100}; yukarı yuvarla (Math.ceil): yarım kare gecikme diye bir şey yok.`
  };
  SL.AILABS.rewind = {
    fn: 'rewind', jsFn: 'rewind', tol: 1e-9,
    ref: (h, t) => { if (t <= h[0][0]) return h[0][1]; if (t >= h[h.length - 1][0]) return h[h.length - 1][1]; let i = 0; while (h[i + 1][0] < t) i++; const [t0, x0] = h[i], [t1, x1] = h[i + 1]; return x0 + (x1 - x0) * ((t - t0) / (t1 - t0)); },
    cases: () => { const H = [[1000, 100], [1050, 110], [1100, 130], [1150, 130], [1200, 90]]; return [[H, 1075], [H, 1000], [H, 1200], [H, 1125], [H, 1190], [H, 900], [H, 1300], [H, 1050], [[[0, 0], [10, 10]], 5], [[[0, 4], [100, 8], [200, 0]], 150]]; },
    show: (h, t) => `kayıt: ${h.map(p => `(${p[0]}: ${p[1]})`).join(' ')} · istenen an: ${t}`,
    hint: (h, t) => `Kayıt zamana göre sıralı. t’yi içine alan iki komşu satırı bul (önceki.zaman ≤ t ≤ sonraki.zaman), aralarında lerp et. t kayıttan eskiyse ilk satırı, yeniyse son satırı döndür.`
  };
  SL.AILABS.desync = {
    fn: 'first_desync', jsFn: 'firstDesync', tol: 0,
    ref: (a, b) => { const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i; return -1; },
    cases: () => [[[5, 9, 2, 7], [5, 9, 2, 7]], [[5, 9, 2, 7], [5, 9, 3, 7]], [[1, 2, 3], [9, 2, 3]], [[1, 2, 3, 4, 5], [1, 2, 3]], [[1, 2, 3], [1, 2, 4, 4]], [[], []], [[7], [8]], [[4, 4, 4, 4, 4, 1], [4, 4, 4, 4, 4, 2]]],
    show: (a, b) => `A makinesinin sağlamaları ${JSON.stringify(a)} · B makinesinin ${JSON.stringify(b)}`,
    hint: () => `İki listeyi baştan birlikte gez (kısa olanın boyu kadar); ilk farklı indisi döndür. Hiç fark yoksa −1.`
  };

  /* ---------- başlık ---------- */
  D.titlegeo7 = function (root) {
    const W = 1280, H = 230, cv = el('canvas'); root.append(cv);
    const ctx = SL.setupCanvas(cv, W, H); let timer, running = false, t = 0; const N = [[760, 60], [1000, 180], [1200, 70], [900, 110]], P = [];
    const tick = () => { if (!running) return; t++; if (t % 9 === 0) { const a = 3, b = Math.floor(Math.random() * 3), up = Math.random() < 0.5; P.push({ a: up ? b : a, b: up ? a : b, f: 0, up }); }
      ctx.clearRect(0, 0, W, H); ctx.strokeStyle = 'rgba(160,200,255,0.25)'; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(N[3][0], N[3][1]); ctx.lineTo(N[i][0], N[i][1]); ctx.stroke(); }
      for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.f += 0.03; if (p.f >= 1) { P.splice(i, 1); continue; } ctx.fillStyle = p.up ? 'rgba(120,230,160,0.9)' : 'rgba(255,211,107,0.9)'; ctx.fillRect(lerp(N[p.a][0], N[p.b][0], p.f) - 3, lerp(N[p.a][1], N[p.b][1], p.f) - 3, 6, 6); }
      N.forEach((n, i) => { ctx.fillStyle = i === 3 ? '#ffd36b' : 'rgba(160,200,255,0.9)'; ctx.beginPath(); ctx.arc(n[0], n[1], i === 3 ? 13 : 9, 0, 7); ctx.fill(); });
      timer = setTimeout(tick, 33); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
