/* "Fizik Simülasyonunun Temeli" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const big = C => { C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%'; };
  const mpos = (C, W, H) => e => { const b = C.getBoundingClientRect(); return V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height); };
  const clamp = SL.clamp;
  const keys = (isOn, list, onDown, onUp) => {
    const h = (e, down) => { if (!isOn()) return; const k = e.key === ' ' ? 'space' : e.key.toLowerCase(); if (!list.includes(k) || e.ctrlKey || e.metaKey || e.altKey) return; if (e.target && e.target.closest && e.target.closest('.CodeMirror, input, textarea, select')) return; if (down && e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); return; } (down ? onDown : onUp || (() => {}))(k); e.preventDefault(); e.stopImmediatePropagation(); };
    window.addEventListener('keydown', e => h(e, true), true); window.addEventListener('keyup', e => h(e, false), true);
  };
  const chk = (label, val, fn) => el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => fn(e.target.checked) }); x.checked = val; return x; })(), ' ' + label);

  /* ================= 1) üç integratör, bir yörünge ================= */
  D.integr = function (root) {
    const W = 720, H = 330, SC = 78;
    let dt = 0.05, timer = null, bodies, t = 0;
    const acc = p => { const r = Math.hypot(p.x, p.y), k = -1 / (r * r * r); return V.v(p.x * k, p.y * k); };
    const E = b => 0.5 * (b.v.x * b.v.x + b.v.y * b.v.y) - 1 / Math.hypot(b.p.x, b.p.y);
    const reset = () => { t = 0; bodies = ['euler', 'semi', 'verlet'].map(m => ({ m, p: V.v(1, 0), v: V.v(0, 1), prev: null, trail: [], gone: false })); bodies[2].prev = V.sub(V.v(1, 0), V.add(V.mul(V.v(0, 1), dt), V.mul(acc(V.v(1, 0)), -0.5 * dt * dt))); };
    const step = () => {
      t += dt;
      bodies.forEach(b => {
        if (b.gone) return; const a = acc(b.p);
        if (b.m === 'euler') { b.p = V.add(b.p, V.mul(b.v, dt)); b.v = V.add(b.v, V.mul(a, dt)); }             // önce konum (ESKİ hızla), sonra hız
        else if (b.m === 'semi') { b.v = V.add(b.v, V.mul(a, dt)); b.p = V.add(b.p, V.mul(b.v, dt)); }         // önce hız, sonra konum (YENİ hızla)
        else { const np = V.add(V.sub(V.mul(b.p, 2), b.prev), V.mul(a, dt * dt)); b.v = V.mul(V.sub(np, b.prev), 1 / (2 * dt)); b.prev = b.p; b.p = np; }
        b.trail.push(V.copy(b.p)); if (b.trail.length > 900) b.trail.shift();
        if (Math.hypot(b.p.x, b.p.y) > 6) b.gone = true;
      });
    };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const th = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = th.card; ctx.fillRect(0, 0, W, H);
      const cx = 215, cy = H / 2, cols = { euler: th.red, semi: th.green, verlet: th.blue }, names = { euler: 'açık Euler', semi: 'yarı-örtük Euler', verlet: 'Verlet' };
      ctx.strokeStyle = th.rule; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(cx, cy, SC, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = th.amber; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 7); ctx.fill();
      bodies.forEach(b => { ctx.strokeStyle = cols[b.m]; ctx.lineWidth = 1.6; ctx.beginPath(); b.trail.forEach((p, i) => { const x = cx + p.x * SC, y = cy - p.y * SC; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); if (!b.gone) { ctx.fillStyle = cols[b.m]; ctx.beginPath(); ctx.arc(cx + b.p.x * SC, cy - b.p.y * SC, 6, 0, 7); ctx.fill(); } });
      const bx = 450; SL.drawLabel(ctx, `adım dt = ${dt.toFixed(3)} · süre ${t.toFixed(1)}`, bx, 20, th.ink, { size: 12, align: 'left' });
      SL.drawLabel(ctx, 'toplam enerji (başlangıç −0,500)', bx, 46, th.muted, { size: 10, align: 'left' });
      bodies.forEach((b, i) => { const e = E(b), drift = (e + 0.5) / 0.5 * 100; SL.drawLabel(ctx, `${names[b.m]}: ${b.gone ? 'uçtu gitti' : e.toFixed(3) + '  (' + (drift >= 0 ? '+' : '') + drift.toFixed(1) + '%)'}`, bx, 70 + i * 24, cols[b.m], { size: 12, align: 'left' }); });
      SL.drawLabel(ctx, 'kesikli çember: gerçek yörünge', bx, 160, th.muted, { size: 10, align: 'left' });
      info.innerHTML = 'Üç gezegen aynı yerden, aynı hızla başlıyor; doğru cevap kesikli çember. Tek fark, her adımda konum ve hızın <b>hangi sırayla</b> güncellendiği. <b class="c-red">Açık Euler</b> her adımda biraz enerji <b>kazanır</b>: sarmal çizerek uzaklaşır. <b class="c-green">Yarı-örtük Euler</b> (iki satırın yeri değişik!) ve <b class="c-blue">Verlet</b> yörüngede kalır; hataları birikmez, salınır. dt’yi büyütün: hepsi kabalaşır ama yalnızca kırmızı patlar.';
    };
    const run = () => { if (timer) return; timer = setInterval(() => { for (let k = 0; k < 2; k++) step(); draw(); }, 33); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('zaman adımı dt', 0.005, 0.2, dt, 0.005, v => { dt = v; reset(); draw(); }), btn('▶ / ⏸', () => (timer ? stop() : run())), btn('↺ baştan', () => { reset(); draw(); })), C, info);
    reset(); draw(); SL.onTheme(draw);
    return { start: run, stop };
  };

  /* ================= 2) değişken dt mi, sabit adım mı? ================= */
  D.timestep = function (root) {
    const W = 720, H = 320, SC = 88, GY = H - 46, G = 20, V0 = 10, DT = 1 / 120, PLAT = 2.4;
    let fps = 60, timer = null, A, B, acc = 0, mode = 'semi';
    const mk = () => ({ y: 0, v: 0, wait: 0.4, apex: 0, last: null, apexes: [], trail: [] });
    const reset = () => { A = mk(); B = mk(); acc = 0; };
    const phys = (b, h) => {
      if (b.wait > 0) { b.wait -= h; if (b.wait <= 0) { b.v = V0; b.apex = 0; } return; }
      if (mode === 'semi') { b.v -= G * h; b.y += b.v * h; } else { b.y += b.v * h; b.v -= G * h; }
      if (b.y > b.apex) b.apex = b.y;
      if (b.y <= 0 && b.v < 0) { b.y = 0; b.v = 0; b.wait = 0.5; b.last = b.apex; b.apexes.push(b.apex); if (b.apexes.length > 6) b.apexes.shift(); }
    };
    const frame = dtF => {
      phys(A, dtF);                                         // değişken: tek adım, kare ne kadar sürdüyse
      acc += dtF; let n = 0; while (acc >= DT && n < 240) { phys(B, DT); acc -= DT; n++; }   // sabit: 1/120'lik adımlar
      [A, B].forEach(b => { b.trail.push(b.y); if (b.trail.length > 46) b.trail.shift(); });
    };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const col = (b, x, name, c) => {
        ctx.fillStyle = t.dark ? '#4a4f63' : '#5b6078'; ctx.fillRect(x - 120, GY, 240, 8);
        ctx.strokeStyle = t.amber; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x - 120, GY - PLAT * SC); ctx.lineTo(x + 120, GY - PLAT * SC); ctx.stroke(); ctx.setLineDash([]);
        SL.drawLabel(ctx, `platform: ${PLAT} m`, x + 118, GY - PLAT * SC - 10, t.amber, { size: 10, align: 'right' });
        ctx.strokeStyle = t.rule; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(x - 120, GY - 2.5 * SC); ctx.lineTo(x + 120, GY - 2.5 * SC); ctx.stroke(); ctx.setLineDash([]); SL.drawLabel(ctx, 'gerçek tepe 2,50', x - 118, GY - 2.5 * SC - 9, t.muted, { size: 9, align: 'left' });
        b.trail.forEach((y, i) => { ctx.fillStyle = c; ctx.globalAlpha = 0.15 + 0.5 * i / b.trail.length; ctx.beginPath(); ctx.arc(x - 60 + i * 1.6, GY - y * SC - 10, 3, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 20, GY - b.y * SC - 12, 12, 0, 7); ctx.fill();
        SL.drawLabel(ctx, name, x, 16, c, { size: 12 });
        const ok = b.last !== null && b.last >= PLAT;
        SL.drawLabel(ctx, b.last === null ? 'ilk zıplama…' : `son tepe: ${b.last.toFixed(2)} m ${ok ? '✔ platforma çıkar' : '✘ platforma ÇIKAMAZ'}`, x, GY + 24, b.last === null ? t.muted : ok ? t.green : t.red, { size: 12 });
      };
      col(A, 180, `değişken dt: kare başına tek adım (${(1000 / fps).toFixed(1)} ms)`, t.red);
      col(B, 540, 'sabit adım: 1/120 sn + biriktirici', t.green);
      info.innerHTML = `İki top aynı hızla (10 m/sn) zıplıyor; yerçekimi 20 m/sn². Gerçek tepe 2,50 m. <b>Soldaki</b> her karede, kare ne kadar sürdüyse o kadarlık <b>tek adım</b> atıyor: tepe yüksekliği <b>kare hızına bağlı</b>. Kare hızını 30’a indirin: 2,4 metrelik platforma artık çıkamıyor (10’da iyice kısalır). <b>Sağdaki</b> zamanı biriktirip hep 1/120 saniyelik eşit adımlar atıyor: kare hızı ne olursa olsun aynı tepe. ` + (mode === 'semi' ? 'Yarı-örtük Euler yavaş makinede <b>alçak</b> zıplar.' : 'Açık Euler yavaş makinede <b>yüksek</b> zıplar.');
    };
    const run = () => { if (timer) clearInterval(timer); timer = setInterval(() => { frame(1 / fps); draw(); }, 1000 / fps); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('kare hızı (FPS)', 8, 144, fps, 2, v => { fps = v; if (timer) run(); }),
      el('label', { class: 'ctl' }, 'Yöntem: ', select({ semi: 'yarı-örtük Euler', euler: 'açık Euler' }, mode, v => { mode = v; reset(); })),
      btn('⚡ takılma (300 ms’lik kare)', () => { frame(0.3); draw(); }), btn('↺ baştan', () => { reset(); draw(); })), C, info);
    reset(); draw(); SL.onTheme(draw);
    return { start: run, stop };
  };

  /* ================= 3) zıplama laboratuvarı ================= */
  const JMAP = ['........................', '........................', '........................', '....................###.', '........................', '...............###......', '........................', '.........###............', '........................', '#####..........#####..##', '#####..........#####..##'];
  function makeJump(o = {}) {
    const TS = 30, GW = 24, GH = 11, W = GW * TS, H = GH * TS, DT = 1 / 120;
    const st = { h: 3.2, t: 0.38, fall: 1.8, variable: true, coyote: true, buffer: true, k: {}, sound: !!o.sound, acc: 0 };
    const solids = []; JMAP.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') solids.push({ x: x * TS, y: y * TS, w: TS, h: TS }); }));
    const hit = p => solids.find(s => p.x < s.x + s.w && s.x < p.x + p.w && p.y < s.y + s.h && s.y < p.y + p.h);
    const reset = () => { st.p = { x: 40, y: 9 * TS - 26, w: 18, h: 26, vx: 0, vy: 0, ground: false, coy: 0, buf: 0, jumping: false }; st.trail = []; st.falls = 0; st.jumps = 0; st.saved = { coy: 0, buf: 0 }; st.acc = 0; };
    reset(); st.reset = reset; st.W = W; st.H = H; st.TS = TS;
    st.params = () => ({ g: 2 * st.h / (st.t * st.t), v0: 2 * st.h / st.t });   // karo/sn² ve karo/sn
    st.press = () => { st.p.buf = 0.12; };
    const step = h => {
      const p = st.p, k = st.k, { g, v0 } = st.params();
      p.vx = ((k.d ? 1 : 0) - (k.a ? 1 : 0)) * 7.5 * TS;
      p.coy = p.ground ? 0.1 : Math.max(0, p.coy - h); p.buf = Math.max(0, p.buf - h);
      const canJump = p.ground || (st.coyote && p.coy > 0 && !p.jumping), want = st.buffer ? p.buf > 0 : p.buf > 0.12 - h * 1.5;
      if (want && canJump) { if (!p.ground) st.saved.coy++; else if (p.buf < 0.12 - h * 1.5) st.saved.buf++; p.vy = -v0 * TS; p.ground = false; p.jumping = true; p.coy = 0; p.buf = 0; st.jumps++; st.trail = []; if (st.sound) SL.sfx('knock'); }
      if (st.variable && p.jumping && p.vy < 0 && !(k.w || k.space)) p.vy *= 0.5, p.jumping = false;        // tuş bırakıldı: yükselişi kes
      const gg = g * TS * (p.vy > 0 ? st.fall : 1);                                                           // düşerken daha ağır
      p.vy += gg * h;
      p.x += p.vx * h; let s = hit(p); if (s) { p.x = p.vx > 0 ? s.x - p.w : s.x + s.w; }
      p.y += p.vy * h; s = hit(p); p.ground = false;
      if (s) { if (p.vy > 0) { p.y = s.y - p.h; p.ground = true; p.jumping = false; } else p.y = s.y + s.h; p.vy = 0; }
      p.x = clamp(p.x, 0, W - p.w);
      if (p.y > H + 60) { st.falls++; p.x = 40; p.y = 9 * TS - 26; p.vy = 0; if (st.sound) SL.sfx('lose'); }
      if (!p.ground) { st.trail.push([p.x + p.w / 2, p.y + p.h]); if (st.trail.length > 400) st.trail.shift(); }
    };
    st.frame = dtF => { st.acc += Math.min(dtF, 0.1); while (st.acc >= DT) { step(DT); st.acc -= DT; } };
    st.draw = (ctx, t) => {
      ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      solids.forEach(s => { ctx.fillStyle = t.dark ? '#4a4f63' : '#5b6078'; ctx.fillRect(s.x, s.y, s.w - 1, s.h - 1); });
      ctx.fillStyle = t.purple; st.trail.forEach(([x, y], i) => { if (i % 4 === 0) { ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); } });
      const p = st.p; ctx.fillStyle = p.coy > 0 && !p.ground ? t.amber : t.green; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(p.x, p.y, p.w, p.h);
      const { g, v0 } = st.params();
      SL.drawLabel(ctx, `yerçekimi g = 2h/t² = ${g.toFixed(1)} karo/sn² · ilk hız v₀ = 2h/t = ${v0.toFixed(1)} karo/sn`, 8, 12, t.ink, { size: 11, align: 'left' });
      SL.drawLabel(ctx, `zıplama ${st.jumps} · düşme ${st.falls} · “çakal süresi” kurtardı: ${st.saved.coy} · tampon kurtardı: ${st.saved.buf}`, 8, 30, t.muted, { size: 11, align: 'left' });
    };
    return st;
  }
  SL.makeJump = makeJump;
  D.jump = function (root) {
    const g = makeJump({ sound: true }), W = g.W, H = g.H; SL._jump = g;
    let timer = null, last = 0;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => { g.draw(ctx, T()); };
    const loop = now => { if (!timer) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; g.frame(dt); draw(); timer = requestAnimationFrame(loop); };
    const start = () => { if (timer) return; last = 0; timer = requestAnimationFrame(loop); }, stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; g.k = {}; };
    keys(() => !!timer, ['a', 'd', 'w', 'space'], k => { g.k[k] = true; if (k === 'w' || k === 'space') g.press(); }, k => { g.k[k] = false; });
    info.innerHTML = '<b>A / D</b> yürü, <b>W</b> (ya da boşluk) zıpla. Mor noktalar son zıplamanın yayı. Tasarımcı iki sayı seçer: <b>ne kadar yükseğe</b> ve <b>tepeye kaç saniyede</b>; yerçekimi ve ilk hız bunlardan hesaplanır (üst satır). Karakter sarıya dönünce <b>çakal süresindesiniz</b>: kenardan çıktınız ama 0,1 saniye boyunca hâlâ zıplayabilirsiniz. Kutucukları kapatıp aynı boşlukları deneyin.';
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('yükseklik h (karo)', 1, 5, g.h, 0.1, v => { g.h = v; }), slider('tepeye süre t (sn)', 0.15, 0.8, g.t, 0.01, v => { g.t = v; }), slider('düşüş çarpanı', 1, 4, g.fall, 0.1, v => { g.fall = v; })),
      el('div', { class: 'sv-controls' }, chk('değişken yükseklik (tuşu erken bırak)', true, v => { g.variable = v; }), chk('çakal süresi (0,1 sn)', true, v => { g.coyote = v; }), chk('zıplama tamponu (0,12 sn)', true, v => { g.buffer = v; }), btn('↺ baştan', () => g.reset())), C, info);
    draw(); SL.onTheme(draw);
    return { start, stop };
  };

  /* ================= 4) Verlet: ip ve kumaş ================= */
  function makeCloth(kind, W) {
    const pts = [], links = [];
    const link = (a, b) => links.push({ a, b, rest: Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y) });
    if (kind === 'rope') { const n = 22; for (let i = 0; i < n; i++) pts.push({ x: 200 + i * 14, y: 40, px: 200 + i * 14, py: 40, pin: i === 0 }); for (let i = 0; i < n - 1; i++) link(i, i + 1); }
    else { const cw = 17, ch = 9, sp = 20, ox = (W - (cw - 1) * sp) / 2; for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) pts.push({ x: ox + x * sp, y: 30 + y * sp, px: ox + x * sp, py: 30 + y * sp, pin: y === 0 && x % 4 === 0 }); for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { if (x < cw - 1) link(y * cw + x, y * cw + x + 1); if (y < ch - 1) link(y * cw + x, (y + 1) * cw + x); } }
    return { pts, links };
  }
  function verletStep(c, dt, iters, grab, W, H) {
    for (const p of c.pts) { if (p.pin || p === (grab && grab.p)) continue; const vx = (p.x - p.px) * 0.995, vy = (p.y - p.py) * 0.995; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + 900 * dt * dt; }
    if (grab && grab.p) { grab.p.px = grab.p.x; grab.p.py = grab.p.y; grab.p.x = grab.x; grab.p.y = grab.y; }
    for (let k = 0; k < iters; k++) for (const l of c.links) {
      const a = c.pts[l.a], b = c.pts[l.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, diff = (d - l.rest) / d;
      const wa = a.pin || a === (grab && grab.p) ? 0 : 1, wb = b.pin || b === (grab && grab.p) ? 0 : 1, ws = wa + wb; if (!ws) continue;
      a.x += dx * diff * wa / ws; a.y += dy * diff * wa / ws; b.x -= dx * diff * wb / ws; b.y -= dy * diff * wb / ws;
    }
    for (const p of c.pts) { if (p.y > H - 6) p.y = H - 6; if (p.x < 4) p.x = 4; if (p.x > W - 4) p.x = W - 4; }
  }
  SL.PHY = { makeCloth, verletStep };
  D.rope = function (root) {
    const W = 720, H = 330;
    let kind = 'rope', c = makeCloth(kind, W), iters = 8, timer = null, grab = null;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      let stretch = 0; c.links.forEach(l => { const a = c.pts[l.a], b = c.pts[l.b], d = Math.hypot(a.x - b.x, a.y - b.y); stretch = Math.max(stretch, d / l.rest); const s = clamp((d / l.rest - 1) * 4, 0, 1); ctx.strokeStyle = s > 0.05 ? `rgb(${Math.round(120 + 135 * s)},${Math.round(120 - 80 * s)},${Math.round(160 - 110 * s)})` : (t.dark ? '#9aa3c7' : '#5b6078'); ctx.lineWidth = kind === 'rope' ? 3 : 1.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
      c.pts.forEach(p => { if (p.pin || kind === 'rope') { ctx.fillStyle = p.pin ? t.red : t.ink; ctx.beginPath(); ctx.arc(p.x, p.y, p.pin ? 5 : 3, 0, 7); ctx.fill(); } });
      SL.drawLabel(ctx, `${c.pts.length} nokta · ${c.links.length} bağ · en çok gerilen bağ: boyunun %${Math.round(stretch * 100)}’i`, 8, H - 12, stretch > 1.15 ? t.red : t.muted, { size: 11, align: 'left' });
      info.innerHTML = `Her nokta yalnızca <b>şimdiki</b> ve <b>bir önceki</b> konumunu bilir; hız = ikisinin farkı (Verlet). Her bağ “iki ucum arasındaki uzaklık şu kadar olmalı” diyen bir <b>kısıt</b>: bağ uzamışsa iki ucu birbirine doğru, kısalmışsa dışarı doğru itilir. Bu düzeltme her kare <b>${iters} kez</b> tekrarlanır. Tekrar sayısını 1 yapın: ${kind === 'rope' ? 'ip' : 'kumaş'} lastik gibi uzar (kırmızı bağlar). Noktaları fareyle <b>tutup sürükleyin</b>; kırmızı noktalar çivili.`;
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousedown', e => { const m = mp(e); let best = 40, bp = null; c.pts.forEach(p => { const d = Math.hypot(p.x - m.x, p.y - m.y); if (d < best) { best = d; bp = p; } }); if (bp) grab = { p: bp, x: m.x, y: m.y }; });
    C.addEventListener('mousemove', e => { if (grab) { const m = mp(e); grab.x = m.x; grab.y = m.y; } });
    window.addEventListener('mouseup', () => { grab = null; });
    C.style.cursor = 'grab';
    const run = () => { if (timer) return; timer = setInterval(() => { verletStep(c, 1 / 60, iters, grab, W, H); draw(); }, 1000 / 60); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Nesne: ', select({ rope: 'ip (22 nokta)', cloth: 'kumaş (17 × 9)' }, kind, v => { kind = v; c = makeCloth(kind, W); })), slider('kısıt tekrarı', 1, 30, iters, 1, v => { iters = v; }), btn('💨 rüzgâr', () => { c.pts.forEach(p => { if (!p.pin) p.px -= 6 + Math.random() * 4; }); SL.sfx && SL.sfx('knock'); }), btn('↺ baştan', () => { c = makeCloth(kind, W); })), C, info);
    draw(); SL.onTheme(draw);
    return { start: run, stop };
  };

  /* ================= 5) itme (impuls): sekme ve kütle ================= */
  D.bounce = function (root) {
    const W = 720, H = 300;
    let e = 0.9, timer = null, balls = [], hits = 0, t0E = 0;
    const reset = () => { balls = []; hits = 0; const R = [14, 14, 14, 22, 22, 32]; R.forEach((r, i) => balls.push({ p: V.v(70 + i * 110, 70 + (i % 2) * 130), v: V.v((i % 2 ? -1 : 1) * (150 - r * 2), 60 - i * 25), r, m: r * r / 196 })); t0E = en(); };
    const en = () => balls.reduce((s, b) => s + 0.5 * b.m * (b.v.x * b.v.x + b.v.y * b.v.y), 0);
    const mom = () => balls.reduce((s, b) => V.add(s, V.mul(b.v, b.m)), V.v(0, 0));
    const step = h => {
      balls.forEach(b => { b.p = V.add(b.p, V.mul(b.v, h)); if (b.p.x < b.r) { b.p.x = b.r; b.v.x = Math.abs(b.v.x) * e; } if (b.p.x > W - b.r) { b.p.x = W - b.r; b.v.x = -Math.abs(b.v.x) * e; } if (b.p.y < b.r) { b.p.y = b.r; b.v.y = Math.abs(b.v.y) * e; } if (b.p.y > H - b.r) { b.p.y = H - b.r; b.v.y = -Math.abs(b.v.y) * e; } });
      for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j], d = V.sub(b.p, a.p), dist = Math.hypot(d.x, d.y), pen = a.r + b.r - dist; if (pen <= 0) continue;
        const n = V.mul(d, 1 / (dist || 1)), ia = 1 / a.m, ib = 1 / b.m;
        a.p = V.sub(a.p, V.mul(n, pen * ia / (ia + ib))); b.p = V.add(b.p, V.mul(n, pen * ib / (ia + ib)));    // iç içe geçmeyi ayır (kütleyle ters orantılı)
        const vn = (b.v.x - a.v.x) * n.x + (b.v.y - a.v.y) * n.y; if (vn >= 0) continue;                         // zaten uzaklaşıyorlar
        const jj = -(1 + e) * vn / (ia + ib);                                                                    // itmenin büyüklüğü
        a.v = V.sub(a.v, V.mul(n, jj * ia)); b.v = V.add(b.v, V.mul(n, jj * ib)); a.flash = b.flash = 8; hits++; SL.sfx && Math.abs(vn) > 60 && SL.sfx('knock');
      }
    };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      balls.forEach(b => { ctx.fillStyle = b.flash > 0 ? t.amber : t.blue; if (b.flash > 0) b.flash--; ctx.beginPath(); ctx.arc(b.p.x, b.p.y, b.r, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '600 10px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.m.toFixed(1).replace('.', ',') + ' kg', b.p.x, b.p.y - (b.r < 16 ? b.r + 8 : 0)); if (b.r < 16) { ctx.fillStyle = t.muted; ctx.fillText(b.m.toFixed(1).replace('.', ',') + ' kg', b.p.x, b.p.y - b.r - 8); } ctx.strokeStyle = t.green; ctx.lineWidth = 2; ctx.beginPath(); { const sp = Math.hypot(b.v.x, b.v.y) || 1, ux = b.v.x / sp, uy = b.v.y / sp; ctx.moveTo(b.p.x + ux * b.r, b.p.y + uy * b.r); ctx.lineTo(b.p.x + ux * (b.r + sp * 0.12), b.p.y + uy * (b.r + sp * 0.12)); } ctx.stroke(); });
      const m = mom(), E = en();
      SL.drawLabel(ctx, `çarpışma ${hits} · toplam enerji: başlangıcın %${Math.round(E / t0E * 100)}’i · toplam momentum (${m.x.toFixed(0)}, ${m.y.toFixed(0)})`, 8, 14, t.ink, { size: 11, align: 'left' });
      info.innerHTML = `Altı top; üstlerinde kütleleri, yeşil çizgi hızları. İki top çarpışınca ikisine de <b>aynı büyüklükte, zıt yönlü</b> bir itme uygulanır; hafif olanın hızı daha çok değişir (itme ÷ kütle). <b>Sekme katsayısı e</b> = ${e.toFixed(2)}: çarpışmadan sonra ayrılma hızı, yaklaşma hızının e katı. e = 1’de enerji korunur (bilardo); e = 0’da toplar çarpışma doğrultusunda birbirine yapışır (çamur). Duvarlar momentumu değiştirir; top–top çarpışmaları değiştirmez.`;
    };
    const run = () => { if (timer) return; timer = setInterval(() => { for (let k = 0; k < 2; k++) step(1 / 120); draw(); }, 1000 / 60); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('sekme katsayısı e', 0, 1, e, 0.05, v => { e = v; }), btn('💥 karıştır', () => { balls.forEach(b => { b.v = V.v((Math.random() - 0.5) * 500, (Math.random() - 0.5) * 500); }); t0E = en(); }), btn('↺ baştan', () => { reset(); draw(); })), C, info);
    reset(); draw(); SL.onTheme(draw);
    SL._bounce = { balls: () => balls, mom, en, step };
    return { start: run, stop };
  };

  /* ---------- simlab: sabit adım biriktiricisi ---------- */
  SL.SIMLABS.accum = function (box, api) {
    const W = 520, H = 280, DT = 20, G = 20, V0 = 10, SC = 80, GY = H - 40;
    let fn = null, acc = 0, b, r, frames = [], err = null, tt = 0;
    const ref = (a, f, d) => { a += f; const n = Math.floor(a / d); return [n, a - n * d]; };
    const mk = () => ({ y: 0, v: V0, apex: 0, last: null });
    const phys = (o, h) => { o.v -= G * h; o.y += o.v * h; if (o.y > o.apex) o.apex = o.y; if (o.y <= 0) { o.y = 0; o.v = V0; o.last = o.apex; o.apex = 0; } };
    const fresh = () => { acc = 0; b = mk(); r = mk(); r.acc = 0; frames = []; err = null; tt = 0; };
    fresh();
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt) {
        if (!fn || err) return; tt += dt; if (tt < 0.05) return; tt = 0;
        const f = [10, 16, 16, 33, 50, 16, 7, 100, 16, 25][frames.length % 10]; frames.push(f); if (frames.length > 60) frames.shift();
        let out; try { out = fn(acc, f, DT); } catch (e) { err = SL.jsErrorText(e); return; }
        if (!Array.isArray(out) || out.length !== 2 || !Number.isFinite(out[0]) || !Number.isFinite(out[1])) { err = 'fixedSteps [adımSayısı, yeniBiriken] döndürmeli'; return; }
        const n = Math.max(0, Math.min(50, Math.round(out[0]))); acc = out[1]; for (let i = 0; i < n; i++) phys(b, DT / 1000);
        const q = ref(r.acc, f, DT); r.acc = q[1]; for (let i = 0; i < q[0]; i++) phys(r, DT / 1000);
      },
      render(ctx, w, t) {
        ctx.fillStyle = t.dark ? '#4a4f63' : '#5b6078'; ctx.fillRect(40, GY, W - 80, 6);
        ctx.strokeStyle = t.rule; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(40, GY - 2.5 * SC); ctx.lineTo(W - 40, GY - 2.5 * SC); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = t.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2 - 60, GY - r.y * SC - 12, 12, 0, 7); ctx.stroke(); SL.drawLabel(ctx, 'doğrusu', W / 2 - 60, GY + 18, t.green, { size: 10 });
        ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(W / 2 + 60, GY - b.y * SC - 12, 12, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'sizinki', W / 2 + 60, GY + 18, t.blue, { size: 10 });
        SL.drawLabel(ctx, err ? '⚠️ ' + err : fn ? `kare süreleri (ms): … ${frames.slice(-8).join(', ')} · biriken: ${Math.round(acc)} ms · son tepe: ${b.last === null ? '—' : b.last.toFixed(2)} m` : 'Kodu çalıştırın', 8, 14, err ? t.red : t.muted, { size: 10, align: 'left' });
      },
      reset() { fresh(); }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w,
      setFns(f) { fn = f.fixedSteps; fresh(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try { for (const [a, f, d] of [[0, 20, 20], [0, 16, 20], [16, 16, 20], [12, 16, 20], [8, 100, 20], [19, 1, 20], [0, 7, 20], [5, 55, 20], [0, 33, 10], [3, 250, 20]]) { const got = mod.fixedSteps(a, f, d), want = ref(a, f, d); if (!Array.isArray(got) || got[0] !== want[0] || Math.abs(got[1] - want[1]) > 1e-9) return { ok: false, msg: `❌ fixedSteps(biriken ${a}, kare ${f}, adım ${d}) → ${JSON.stringify(got)}; beklenen [${want}]. Önce kare süresini birikene ekleyin (${a} + ${f} = ${a + f}); içinde kaç tam adım var (${Math.floor((a + f) / d)}); kalan (${(a + f) % d}) bir sonraki kareye devreder.` }; } }
        catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Biriktirici doğru. Sağda kareler düzensiz sürelerle geliyor (7 ms’den 100 ms’ye) ama mavi top yeşil halkayla aynı yüksekliğe zıplıyor.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  const rn = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
  SL.AILABS.eulerstep = {
    fn: 'euler_step', jsFn: 'eulerStep', tol: 1e-9,
    ref: (x, v, a, dt) => { const v2 = v + a * dt; return [x + v2 * dt, v2]; },
    cases: () => { const cs = [[0, 0, 10, 0.1], [0.1, 1, 10, 0.1], [1, 0, -1, 0.5], [0.75, -0.5, -0.75, 0.5], [5, 3, 0, 0.25], [0, 10, -20, 1 / 30]]; for (let i = 0; i < 8; i++) cs.push([rn(-5, 5), rn(-5, 5), rn(-20, 20), [0.1, 0.02, 0.5][i % 3]]); return cs; },
    show: (x, v, a, dt) => `konum ${x}, hız ${v}, ivme ${a}, dt ${typeof dt === 'number' ? Math.round(dt * 10000) / 10000 : dt}`,
    hint: (x, v, a, dt) => `ÖNCE hız: v' = v + a·dt = ${Math.round((v + a * dt) * 1000) / 1000}. SONRA konum, YENİ hızla: x' = x + v'·dt. [x', v'] döndürün. Konumu eski hızla güncellerseniz açık Euler olur.`
  };
  SL.AILABS.jumpparams = {
    fn: 'jump_params', jsFn: 'jumpParams', tol: 1e-9,
    ref: (h, t) => [2 * h / (t * t), 2 * h / t],
    cases: () => [[4, 0.4], [3, 0.5], [2.5, 0.5], [1, 0.2], [5, 1], [3.2, 0.38], [6, 0.6], [2, 0.25]],
    show: (h, t) => `istenen yükseklik h = ${h}, tepeye varış süresi t = ${t}`,
    hint: (h, t) => `g = 2h / t² = 2·${h} / ${Math.round(t * t * 10000) / 10000}; v₀ = 2h / t = 2·${h} / ${t}. [g, v0] döndürün.`
  };
  SL.AILABS.verlet = {
    fn: 'verlet_step', jsFn: 'verletStep', tol: 1e-9,
    ref: (x, xp, a, dt) => [2 * x - xp + a * dt * dt, x],
    cases: () => { const cs = [[1, 0, -10, 0.1], [1.9, 1, -10, 0.1], [5, 5, 0, 0.5], [0, 0, 9.8, 1], [2, 3, 4, 0.5]]; for (let i = 0; i < 8; i++) cs.push([rn(-5, 5), rn(-5, 5), rn(-20, 20), [0.1, 0.02, 0.5][i % 3]]); return cs; },
    show: (x, xp, a, dt) => `şimdiki konum ${x}, önceki konum ${xp}, ivme ${a}, dt ${dt}`,
    hint: (x, xp, a, dt) => `yeni = 2·x − önceki + a·dt² = 2·${x} − ${xp} + ${a}·${Math.round(dt * dt * 10000) / 10000}. Döndür: [yeni, x] (şimdiki konum bir sonraki adımın “önceki”si olur).`
  };
  SL.AILABS.satisfy = {
    fn: 'satisfy', jsFn: 'satisfy', tol: 1e-9,
    ref: (p, q, rest) => { const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy), k = (d - rest) / d / 2; return [[p[0] + dx * k, p[1] + dy * k], [q[0] - dx * k, q[1] - dy * k]]; },
    cases: () => [[[0, 0], [3, 4], 3], [[0, 0], [3, 4], 5], [[0, 0], [3, 4], 7], [[1, 1], [1, 5], 2], [[2, 0], [-4, 0], 10], [[0, 0], [6, 8], 5], [[-1, -1], [2, 3], 4]],
    show: (p, q, r) => `p1 = ${JSON.stringify(p)}, p2 = ${JSON.stringify(q)}, olması gereken uzaklık ${r}`,
    hint: (p, q, r) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); return `Şimdiki uzaklık d = ${Math.round(d * 100) / 100}; hata = d − ${r} = ${Math.round((d - r) * 100) / 100}. Her uç hatanın YARISI kadar, öbürüne doğru (hata eksi ise uzağa) kayar: k = (d − rest) / d / 2; p1 += (p2 − p1)·k; p2 −= (p2 − p1)·k (eski farkla).`; }
  };

  /* ---------- başlık ---------- */
  D.titlegeo5 = function (root) {
    const W = 1280, H = 230, cv = el('canvas'); root.append(cv);
    const ctx = SL.setupCanvas(cv, W, H); let c = makeCloth('rope', 1900), timer, running = false, t = 0;
    c.pts.forEach((p, i) => { p.x = p.px = 980 + i * 12; p.y = p.py = 20; });
    const tick = () => { if (!running) return; t++; if (t % 120 === 1) c.pts.forEach(p => { if (!p.pin) p.px -= 4 * Math.sin(t / 60); }); verletStep(c, 1 / 60, 10, null, 1270, 225); ctx.clearRect(0, 0, W, H); ctx.strokeStyle = 'rgba(255,190,120,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); c.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); const e = c.pts[c.pts.length - 1]; ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(e.x, e.y, 9, 0, 7); ctx.fill(); timer = setTimeout(tick, 33); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
