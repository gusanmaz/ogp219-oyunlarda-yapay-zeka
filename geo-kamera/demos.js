/* "Kamera Algoritmaları" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const big = C => { C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%'; };
  const clamp = SL.clamp, lerp = (a, b, t) => a + (b - a) * t;
  const damp = (x, target, half, dt) => lerp(x, target, 1 - Math.pow(2, -dt / half));
  const keys = (isOn, list, onDown, onUp) => {
    const h = (e, down) => { if (!isOn()) return; const k = e.key === ' ' ? 'space' : e.key.toLowerCase(); if (!list.includes(k) || e.ctrlKey || e.metaKey || e.altKey) return; if (e.target && e.target.closest && e.target.closest('.CodeMirror, input, textarea, select')) return; if (down && e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); return; } (down ? onDown : onUp || (() => {}))(k); e.preventDefault(); e.stopImmediatePropagation(); };
    window.addEventListener('keydown', e => h(e, true), true); window.addEventListener('keyup', e => h(e, false), true);
  };
  const chk = (label, val, fn) => el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => fn(e.target.checked) }); x.checked = val; return x; })(), ' ' + label);
  const txt = (ctx, str, x, y, color, size, o = {}) => { ctx.fillStyle = color; ctx.font = `${o.bold ? '700' : '500'} ${size}px ui-monospace, monospace`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(str, x, y); };
  /* 1B değer gürültüsü (Perlin'in sade akrabası): yumuşak, tekrarlanabilir */
  const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  const noise1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
  SL.CAM = { damp, noise1 };

  /* ================= 1) 2B takip kamerası: beş kural ================= */
  const LEVEL = { W: 2600, H: 620, plats: [[0, 560, 2600, 60], [260, 470, 160, 16], [470, 390, 150, 16], [700, 310, 170, 16], [960, 420, 150, 16], [1180, 500, 120, 16], [1380, 400, 150, 16], [1600, 300, 150, 16], [1820, 210, 170, 16], [2080, 330, 150, 16], [2300, 450, 160, 16]], coins: [[340, 440], [545, 360], [785, 280], [1035, 390], [1455, 370], [1675, 270], [1905, 180], [2155, 300], [2380, 420], [1240, 470]] };
  function makeCam2D(o = {}) {
    const VW = 720, VH = 320, G = 2100, JUMP = 760, RUN = 300;
    const st = { smooth: true, window: true, ahead: true, snap: true, limits: true, k: {}, sound: !!o.sound, VW, VH };
    st.reset = () => { st.p = { x: 120, y: 520, w: 22, h: 40, vx: 0, vy: 0, ground: true, face: 1 }; st.cam = { x: 360, y: 460 }; st.focusY = 520; st.aheadX = 0; st.travel = 0; st.flips = 0; st.lastDir = 0; st.t = 0; st.coins = LEVEL.coins.map(c => ({ x: c[0], y: c[1], got: false })); st.score = 0; };
    const hit = p => LEVEL.plats.find(s => p.x < s[0] + s[2] && s[0] < p.x + p.w && p.y < s[1] + s[3] && s[1] < p.y + p.h);
    st.step = dt => {
      const p = st.p, k = st.k; st.t += dt;
      p.vx = ((k.d ? 1 : 0) - (k.a ? 1 : 0)) * RUN; if (p.vx) p.face = Math.sign(p.vx);
      if ((k.w || k.space) && p.ground) { p.vy = -JUMP; p.ground = false; if (st.sound) SL.sfx('knock'); }
      p.vy += G * dt; p.x = clamp(p.x + p.vx * dt, 0, LEVEL.W - p.w);
      const oy = p.y; p.y += p.vy * dt; p.ground = false; const s = hit(p);
      if (s) { if (p.vy > 0 && oy + p.h <= s[1] + 1) { p.y = s[1] - p.h; p.vy = 0; p.ground = true; } else if (p.vy < 0 && s[3] > 30) { p.y = s[1] + s[3]; p.vy = 0; } }
      st.coins.forEach(c => { if (!c.got && Math.abs(c.x - (p.x + p.w / 2)) < 20 && Math.abs(c.y - (p.y + p.h / 2)) < 30) { c.got = true; st.score++; if (st.sound) SL.sfx('alert'); } });
      // ---------- KAMERA ----------
      const px = p.x + p.w / 2, py = p.y + p.h / 2; let tx = st.cam.x, ty = st.cam.y;
      if (st.ahead) st.aheadX = damp(st.aheadX, p.vx ? p.face * 170 : st.aheadX * 0.999, 0.25, dt); else st.aheadX = 0;      // 3) ileri bakma
      const fx = px + st.aheadX;
      if (st.window) { const hw = 60; if (fx > tx + hw) tx = fx - hw; else if (fx < tx - hw) tx = fx + hw; } else tx = fx;   // 2) kamera penceresi (yatay)
      if (st.snap) { if (p.ground) st.focusY = py; else if (py > st.focusY + 90) st.focusY = py - 90; else if (py < st.focusY - 170) st.focusY = py + 170; ty = st.focusY - 50; }   // 4) platforma oturma
      else ty = py - 50;
      if (st.limits) { tx = clamp(tx, VW / 2, LEVEL.W - VW / 2); ty = clamp(ty, VH / 2, LEVEL.H - VH / 2); }                // 5) seviye sınırları
      const ox = st.cam.x, oyc = st.cam.y;
      if (st.smooth) { st.cam.x = damp(st.cam.x, tx, st.window ? 0.06 : 0.12, dt); st.cam.y = damp(st.cam.y, ty, 0.14, dt); } else { st.cam.x = tx; st.cam.y = ty; }   // 1) yumuşatma
      if (st.limits) { st.cam.x = clamp(st.cam.x, VW / 2, LEVEL.W - VW / 2); st.cam.y = clamp(st.cam.y, VH / 2, LEVEL.H - VH / 2); }
      const dx = st.cam.x - ox, dy = st.cam.y - oyc; st.travel += Math.abs(dx) + Math.abs(dy); const dir = Math.abs(dy) > 0.05 ? Math.sign(dy) : 0; if (dir && st.lastDir && dir !== st.lastDir) st.flips++; if (dir) st.lastDir = dir;
      st.tx = tx; st.ty = ty; st.fx = fx;
    };
    st.reset(); return st;
  }
  SL.makeCam2D = makeCam2D; SL.CAM.LEVEL = LEVEL;
  D.cam2d = function (root) {
    const g = makeCam2D({ sound: true }), VW = g.VW, VH = g.VH, W = 720, H = 372; let timer = null, last = 0, dbg = true;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.dark ? '#1d2030' : '#dfe9f5'; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip(); ctx.translate(Math.round(VW / 2 - g.cam.x), Math.round(VH / 2 - g.cam.y));
      for (let x = 0; x < LEVEL.W; x += 130) { ctx.fillStyle = t.dark ? '#262a3d' : '#cfdcec'; ctx.fillRect(x + 20, 560 - 60 - (x * 7 % 90), 46, 60 + (x * 7 % 90)); }
      if (!g.limits) { ctx.fillStyle = '#111'; ctx.fillRect(-800, -400, 800, 1600); ctx.fillRect(LEVEL.W, -400, 800, 1600); ctx.fillRect(-800, LEVEL.H, LEVEL.W + 1600, 600); }
      LEVEL.plats.forEach(s => { ctx.fillStyle = t.dark ? '#5a5f78' : '#5b6078'; ctx.fillRect(s[0], s[1], s[2], s[3]); });
      g.coins.forEach(c => { if (!c.got) { ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, 7); ctx.fill(); } });
      const p = g.p; ctx.fillStyle = t.green; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = '#fff'; ctx.fillRect(p.x + (p.face > 0 ? 13 : 3), p.y + 8, 6, 6);
      if (dbg) { if (g.window) { ctx.strokeStyle = t.blue; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(g.cam.x - 60, g.cam.y - 140, 120, 280); ctx.setLineDash([]); } if (g.ahead) { ctx.strokeStyle = t.purple; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x + p.w / 2, p.y - 10); ctx.lineTo(g.fx, p.y - 10); ctx.stroke(); ctx.fillStyle = t.purple; ctx.beginPath(); ctx.arc(g.fx, p.y - 10, 5, 0, 7); ctx.fill(); } if (g.snap) { ctx.strokeStyle = t.amber; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(g.cam.x - 300, g.focusY); ctx.lineTo(g.cam.x + 300, g.focusY); ctx.stroke(); ctx.setLineDash([]); } }
      ctx.restore();
      if (dbg) { ctx.strokeStyle = t.red; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(VW / 2 - 9, VH / 2); ctx.lineTo(VW / 2 + 9, VH / 2); ctx.moveTo(VW / 2, VH / 2 - 9); ctx.lineTo(VW / 2, VH / 2 + 9); ctx.stroke(); }
      // mini harita
      const my = VH + 8, mh = 40, sc = W / LEVEL.W; ctx.fillStyle = t.card; ctx.fillRect(0, VH, W, H - VH); ctx.fillStyle = t.dark ? '#33374a' : '#e8e9ef'; ctx.fillRect(0, my, W, mh);
      LEVEL.plats.forEach(s => { ctx.fillStyle = t.dark ? '#6c7391' : '#8a8fa6'; ctx.fillRect(s[0] * sc, my + s[1] * mh / LEVEL.H, Math.max(2, s[2] * sc), Math.max(1.5, s[3] * mh / LEVEL.H)); });
      ctx.fillStyle = t.green; ctx.fillRect(g.p.x * sc - 1, my + g.p.y * mh / LEVEL.H - 1, 4, 5); ctx.strokeStyle = t.red; ctx.lineWidth = 2; ctx.strokeRect((g.cam.x - VW / 2) * sc, my + (g.cam.y - VH / 2) * mh / LEVEL.H, VW * sc, VH * mh / LEVEL.H);
      txt(ctx, `altın ${g.score}/${g.coins.length} · kameranın kat ettiği yol ${Math.round(g.travel)} piksel · dikey yön değiştirme ${g.flips}`, 8, 12, t.ink, 11);
      info.innerHTML = `<b>A / D</b> yürü, <b>W</b> zıpla; altınları toplayın. Üstte oyuncunun gördüğü; altta bütün seviye ve kırmızı çerçeveyle <b>kameranın gördüğü kısım</b>. Kırmızı artı ekranın ortası. <b class="c-blue">Mavi kesikli kutu</b> kamera penceresi: karakter içinde kaldıkça kamera kıpırdamaz. <b class="c-purple">Mor nokta</b> kameranın asıl baktığı yer (karakterin gidiş yönünde, önünde). <b class="c-amber">Sarı kesikli çizgi</b> kameranın oturduğu zemin: zıplayınca çizgi (ve kamera) yerinde kalır. Kutucukları tek tek kapatıp aynı parkuru yeniden koşun; üstteki “dikey yön değiştirme” sayısını karşılaştırın.`;
    };
    const loop = now => { if (!timer) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; let r = dt; while (r > 1e-6) { const h = Math.min(r, 1 / 120); g.step(h); r -= h; } draw(); timer = requestAnimationFrame(loop); };
    const start = () => { if (timer) return; last = 0; timer = requestAnimationFrame(loop); }, stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; g.k = {}; };
    keys(() => !!timer, ['a', 'd', 'w', 'space'], k => { g.k[k] = true; }, k => { g.k[k] = false; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, chk('yumuşatma', true, v => { g.smooth = v; }), chk('kamera penceresi', true, v => { g.window = v; }), chk('ileri bakma', true, v => { g.ahead = v; }), chk('platforma oturma', true, v => { g.snap = v; }), chk('seviye sınırları', true, v => { g.limits = v; }), chk('yardımcı çizgiler', true, v => { dbg = v; }), btn('↺ baştan', () => g.reset())), C, info);
    draw(); SL.onTheme(draw); SL._cam2d = g;
    return { start, stop };
  };

  /* ================= 2) ekran sarsıntısı: travma modeli ================= */
  function makeShake() {
    const st = { trauma: 0, decay: 0.9, power: 2, noise: 'perlin', rot: true, maxOff: 26, maxRot: 0.07, t: 0, off: { x: 0, y: 0, r: 0 }, hist: [], seed: 1 };
    st.add = v => { st.trauma = Math.min(1, st.trauma + v); };
    st.step = dt => {
      st.t += dt; st.trauma = Math.max(0, st.trauma - st.decay * dt);
      const s = Math.pow(st.trauma, st.power), n = st.noise === 'perlin' ? (k => noise1(st.t * 22 + k * 100)) : (() => Math.random() * 2 - 1);
      st.off = { x: st.maxOff * s * n(1), y: st.maxOff * s * n(2), r: st.rot ? st.maxRot * s * n(3) : 0 }; st.shake = s;
      st.hist.push([st.t, st.trauma, s, st.off.x / st.maxOff]); while (st.hist.length && st.hist[0][0] < st.t - 4) st.hist.shift();
    };
    return st;
  }
  SL.makeShake = makeShake;
  D.shake = function (root) {
    const W = 720, H = 350, s = makeShake(); let timer = null, last = 0, booms = [];
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const hitIt = (v, x) => { s.add(v); booms.push({ x, t: 0, v }); SL.sfx && SL.sfx(v > 0.7 ? 'lose' : v > 0.4 ? 'shot' : 'knock'); };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const VW = 720, VH = 210;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip(); ctx.fillStyle = t.dark ? '#1d2030' : '#dfe9f5'; ctx.fillRect(0, 0, VW, VH);
      ctx.translate(VW / 2 + s.off.x, VH / 2 + s.off.y); ctx.rotate(s.off.r); ctx.translate(-VW / 2, -VH / 2);
      ctx.fillStyle = t.dark ? '#262a3d' : '#cfdcec'; for (let i = -1; i < 9; i++) ctx.fillRect(i * 100 + 20, 60 + (i * 37 % 50), 60, 130);
      ctx.fillStyle = t.dark ? '#5a5f78' : '#5b6078'; ctx.fillRect(-60, 170, VW + 120, 80);
      ctx.fillStyle = t.green; ctx.fillRect(340, 130, 22, 40); ctx.fillStyle = t.red; [[120, 140], [560, 140], [230, 150]].forEach(([x, y]) => ctx.fillRect(x, y, 26, 30));
      booms.forEach(b => { ctx.globalAlpha = clamp(1 - b.t * 2, 0, 1); ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(b.x, 150, 20 + b.t * 220 * b.v, 0, 7); ctx.fill(); ctx.globalAlpha = 1; });
      ctx.restore();
      // travma çubuğu + grafik
      const by = VH + 22; txt(ctx, 'travma', 8, by, t.ink, 11); ctx.fillStyle = t.dark ? '#33374a' : '#e8e9ef'; ctx.fillRect(70, by - 8, 200, 16); ctx.fillStyle = t.red; ctx.fillRect(70, by - 8, 200 * s.trauma, 16);
      txt(ctx, `${s.trauma.toFixed(2)}   sarsıntı = travma^${s.power} = ${(s.shake || 0).toFixed(2)}`, 280, by, t.ink, 11);
      const gy0 = H - 8, gh = 92, gx0 = 8, gw = W - 16, tx = tt => gx0 + ((tt - (s.t - 4)) / 4) * gw; ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.strokeRect(gx0, gy0 - gh, gw, gh);
      [[1, t.red, 1.5, v => gy0 - v * (gh - 6) - 3], [2, t.amber, 2, v => gy0 - v * (gh - 6) - 3], [3, t.blue, 1.2, v => gy0 - gh / 2 - v * gh * 0.45]].forEach(([ix, c, lw, fy]) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); s.hist.forEach((h, i) => { const x = tx(h[0]), y = fy(h[ix]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); });
      txt(ctx, 'kırmızı: travma · sarı: sarsıntı (travmanın kuvveti) · mavi: kameranın yatay kayması (son 4 sn)', gx0 + 6, gy0 - gh + 10, t.muted, 10);
      info.innerHTML = `<b>1 / 2 / 3</b> tuşları: küçük, orta, büyük patlama. Her darbe bir sayaca (<b>travma</b>, 0–1) ekleme yapar; travma kendiliğinden, sabit hızla sıfıra iner. Kameranın kayması travmanın kendisiyle değil <b>kuvvetiyle</b> (şu an ${s.power}.) orantılı: küçük darbe neredeyse hiç sarsmaz, darbeler <b>birikince</b> sarsıntı katlanır ve sonu yumuşak söner. Kayma yönü ${s.noise === 'perlin' ? '<b>yumuşak gürültüden</b> gelir: kamera titremez, <b>sallanır</b>.' : 'her kare <b>rastgele</b>: kamera sinek gibi titrer (mavi eğri diken diken).'} Art arda <b>1</b>’e basın; sonra tek bir <b>3</b>.`;
    };
    const loop = now => { if (!timer) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; s.step(dt); booms.forEach(b => { b.t += dt; }); booms = booms.filter(b => b.t < 0.6); draw(); timer = requestAnimationFrame(loop); };
    const start = () => { if (timer) return; last = 0; timer = requestAnimationFrame(loop); }, stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; };
    keys(() => !!timer, ['1', '2', '3'], k => hitIt({ 1: 0.25, 2: 0.5, 3: 1 }[k], { 1: 133, 2: 243, 3: 573 }[k]));
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Kayma yönü: ', select({ perlin: 'yumuşak gürültü', random: 'her kare rastgele' }, s.noise, v => { s.noise = v; })), slider('kuvvet (üs)', 1, 3, s.power, 1, v => { s.power = v; }), slider('sönme hızı (1/sn)', 0.3, 3, s.decay, 0.1, v => { s.decay = v; }), chk('dönme de ekle', true, v => { s.rot = v; }), btn('💥 1', () => hitIt(0.25, 133)), btn('💥💥 2', () => hitIt(0.5, 243)), btn('💥💥💥 3', () => hitIt(1, 573))), C, info);
    draw(); SL.onTheme(draw); SL._shake = s;
    return { start, stop };
  };

  /* ================= 3) çok hedef: herkesi kadraja sığdır ================= */
  function fitView(pts, VW, VH, margin, zmin, zmax) {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const zoom = clamp(Math.min(VW / (x1 - x0 + 2 * margin), VH / (y1 - y0 + 2 * margin)), zmin, zmax);
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, zoom };
  }
  SL.CAM.fitView = fitView;
  function makeGroup(o = {}) {
    const AW = 1600, AH = 900, st = { AW, AH, VW: 720, VH: 300, zoomOn: true, margin: 90, zmin: 0.35, zmax: 1.3, n: 3, k: {}, t: 0 };
    st.reset = () => { st.t = 0; st.f = [{ x: 700, y: 450, c: 0 }, { x: 900, y: 450, c: 1 }, { x: 800, y: 300, c: 2 }, { x: 800, y: 600, c: 3 }]; st.cam = { x: 800, y: 450, zoom: 1 }; st.lost = 0; };
    st.step = dt => {
      st.t += dt; const p = st.f[0], sp = 330; p.x = clamp(p.x + ((st.k.d ? 1 : 0) - (st.k.a ? 1 : 0)) * sp * dt, 30, AW - 30); p.y = clamp(p.y + ((st.k.s ? 1 : 0) - (st.k.w ? 1 : 0)) * sp * dt, 30, AH - 30);
      for (let i = 1; i < st.n; i++) { const b = st.f[i]; b.x = clamp(800 + Math.sin(st.t * (0.31 + i * 0.13) + i * 2) * (300 + i * 130) + Math.sin(st.t * 0.9 + i) * 60, 30, AW - 30); b.y = clamp(450 + Math.cos(st.t * (0.27 + i * 0.11) + i) * (150 + i * 70), 30, AH - 30); }
      const act = st.f.slice(0, st.n), tgt = st.zoomOn ? fitView(act, st.VW, st.VH, st.margin, st.zmin, st.zmax) : { x: act.reduce((s, q) => s + q.x, 0) / act.length, y: act.reduce((s, q) => s + q.y, 0) / act.length, zoom: 1 };
      st.cam.x = damp(st.cam.x, tgt.x, 0.12, dt); st.cam.y = damp(st.cam.y, tgt.y, 0.12, dt); st.cam.zoom = damp(st.cam.zoom, tgt.zoom, tgt.zoom < st.cam.zoom ? 0.1 : 0.35, dt); st.tgt = tgt;
      const hw = st.VW / 2 / st.cam.zoom, hh = st.VH / 2 / st.cam.zoom; st.out = act.filter(q => Math.abs(q.x - st.cam.x) > hw || Math.abs(q.y - st.cam.y) > hh).length; if (st.out) st.lost += dt;
    };
    st.reset(); return st;
  }
  SL.makeGroup = makeGroup;
  D.group = function (root) {
    const g = makeGroup(), W = 720, H = 370; let timer = null, last = 0;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const COL = t => [t.green, t.red, t.blue, t.purple];
    const draw = () => {
      const t = T(), VW = g.VW, VH = g.VH, z = g.cam.zoom; ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip(); ctx.fillStyle = '#111'; ctx.fillRect(0, 0, VW, VH);
      ctx.translate(VW / 2, VH / 2); ctx.scale(z, z); ctx.translate(-g.cam.x, -g.cam.y);
      ctx.fillStyle = t.dark ? '#1d2030' : '#dfe9f5'; ctx.fillRect(0, 0, g.AW, g.AH); ctx.strokeStyle = t.dark ? '#2b3046' : '#c5d3e6'; ctx.lineWidth = 2; for (let x = 0; x <= g.AW; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, g.AH); ctx.stroke(); } for (let y = 0; y <= g.AH; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.AW, y); ctx.stroke(); }
      const act = g.f.slice(0, g.n), xs = act.map(q => q.x), ys = act.map(q => q.y);
      ctx.strokeStyle = t.amber; ctx.lineWidth = 2 / z; ctx.setLineDash([8 / z, 6 / z]); ctx.strokeRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); ctx.setLineDash([]);
      act.forEach((q, i) => { ctx.fillStyle = COL(t)[q.c]; ctx.beginPath(); ctx.arc(q.x, q.y, 22, 0, 7); ctx.fill(); if (i === 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); } });
      ctx.restore();
      const my = VH + 8, sc = 0.066, mw = g.AW * sc, mh = g.AH * sc; ctx.fillStyle = t.dark ? '#33374a' : '#e8e9ef'; ctx.fillRect(8, my, mw, mh); act.forEach(q => { ctx.fillStyle = COL(t)[q.c]; ctx.fillRect(8 + q.x * sc - 2, my + q.y * sc - 2, 5, 5); });
      ctx.strokeStyle = t.red; ctx.lineWidth = 2; ctx.strokeRect(8 + (g.cam.x - VW / 2 / z) * sc, my + (g.cam.y - VH / 2 / z) * sc, VW / z * sc, VH / z * sc);
      txt(ctx, `yakınlaştırma ${z.toFixed(2)}× (hedef ${g.tgt ? g.tgt.zoom.toFixed(2) : '—'})`, 130, my + 10, t.ink, 11); txt(ctx, `kadraj dışında kalan dövüşçü: ${g.out || 0} · toplam kayıp süre ${g.lost.toFixed(1)} sn`, 130, my + 28, g.out ? t.red : t.ink, 11); txt(ctx, 'sarı kesikli kutu: dövüşçülerin sınır kutusu · sol altta: arena ve kameranın gördüğü', 130, my + 46, t.muted, 10);
      info.innerHTML = `Beyaz çerçeveli yeşil daire sizsiniz (<b>W / A / S / D</b>); öbürleri kendi başına dolaşıyor. Kamera her kare dövüşçülerin <b>sınır kutusunu</b> (sarı) bulur, <b>ortasına</b> bakar ve kutu ${g.margin} piksellik payla ekrana sığacak kadar <b>yakınlaşır ya da uzaklaşır</b>. ${g.zoomOn ? 'Köşeye kaçın: kamera uzaklaşır, herkes küçülür. Yanlarına dönün: yakınlaşır. Uzaklaşma hızlı, yakınlaşma yavaştır.' : '<b>Yakınlaştırma kapalı:</b> kamera yalnızca ortalamaya bakıyor; uzaklaşan dövüşçü kadrajdan çıkıyor (sayaç).'}`;
    };
    const loop = now => { if (!timer) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; g.step(dt); draw(); timer = requestAnimationFrame(loop); };
    const start = () => { if (timer) return; last = 0; timer = requestAnimationFrame(loop); }, stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; g.k = {}; };
    keys(() => !!timer, ['w', 'a', 's', 'd'], k => { g.k[k] = true; }, k => { g.k[k] = false; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('dövüşçü sayısı', 2, 4, g.n, 1, v => { g.n = v; }), chk('sığdırmak için yakınlaştır / uzaklaş', true, v => { g.zoomOn = v; }), slider('kenar payı (piksel)', 0, 200, g.margin, 10, v => { g.margin = v; }), slider('en uzak (en küçük ölçek)', 0.2, 1, g.zmin, 0.05, v => { g.zmin = v; }), btn('↺ baştan', () => g.reset())), C, info);
    draw(); SL.onTheme(draw); SL._group = g;
    return { start, stop };
  };

  /* ================= 4) üçüncü şahıs kamera kolu: duvara çarpınca kısal ================= */
  const ROOM = { W: 720, H: 330, walls: [[0, 0, 720, 14], [0, 316, 720, 14], [0, 0, 14, 330], [706, 0, 14, 330], [200, 14, 16, 150], [200, 230, 16, 86], [430, 110, 150, 16], [430, 110, 16, 120], [560, 250, 16, 66]] };
  const rayBoxes = (ox, oy, dx, dy, maxT) => { let best = maxT; for (const [x, y, w, h] of ROOM.walls) { let t0 = 0, t1 = best, ok = true; for (const [o, d, lo, hi] of [[ox, dx, x, x + w], [oy, dy, y, y + h]]) { if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { ok = false; break; } } else { let a = (lo - o) / d, b = (hi - o) / d; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) { ok = false; break; } } } if (ok && t0 < best) best = t0; } return best; };
  SL.CAM.rayBoxes = rayBoxes; SL.CAM.ROOM = ROOM;
  function makeBoom() {
    const st = { arm: 120, collide: true, pad: 8, k: {} };
    st.reset = () => { st.p = { x: 110, y: 250, a: -0.4 }; st.len = st.arm; st.inWall = 0; };
    const solid = (x, y) => ROOM.walls.some(([wx, wy, w, h]) => x > wx - 9 && x < wx + w + 9 && y > wy - 9 && y < wy + h + 9);
    st.step = dt => {
      const p = st.p, k = st.k; p.a += ((k.d ? 1 : 0) - (k.a ? 1 : 0)) * 2.6 * dt; const mv = ((k.w ? 1 : 0) - (k.s ? 1 : 0)) * 150 * dt, nx = p.x + Math.cos(p.a) * mv, ny = p.y + Math.sin(p.a) * mv; if (!solid(nx, p.y)) p.x = nx; if (!solid(p.x, ny)) p.y = ny;
      const bx = -Math.cos(p.a), by = -Math.sin(p.a); st.free = rayBoxes(p.x, p.y, bx, by, st.arm); st.blocked = st.free < st.arm - 1e-6;
      const want = st.collide ? Math.max(12, st.free - (st.blocked ? st.pad : 0)) : st.arm;
      st.len = want < st.len ? damp(st.len, want, 0.02, dt) : damp(st.len, want, 0.25, dt);          // hızlı kısal, yavaş uza
      if (st.collide) st.len = Math.min(st.len, Math.max(12, st.free - (st.blocked ? 1 : 0)));
      st.cx = p.x + bx * st.len; st.cy = p.y + by * st.len; st.bad = !st.collide && st.blocked; if (st.bad) st.inWall += dt;
    };
    st.reset(); return st;
  }
  SL.makeBoom = makeBoom;
  D.boom = function (root) {
    const g = makeBoom(), W = 720, H = 330; let timer = null, last = 0;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(), p = g.p; ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.dark ? '#1d2030' : '#f2f3f8'; ctx.fillRect(0, 0, W, H);
      // kameranın gördüğü alan (ışın yelpazesi)
      ctx.fillStyle = g.bad ? 'rgba(217,83,76,0.18)' : 'rgba(76,120,217,0.16)'; ctx.beginPath(); ctx.moveTo(g.cx, g.cy); for (let i = 0; i <= 40; i++) { const a = p.a - 0.6 + 1.2 * i / 40, d = rayBoxes(g.cx, g.cy, Math.cos(a), Math.sin(a), 420); ctx.lineTo(g.cx + Math.cos(a) * d, g.cy + Math.sin(a) * d); } ctx.closePath(); ctx.fill();
      ROOM.walls.forEach(([x, y, w, h]) => { ctx.fillStyle = t.dark ? '#5a5f78' : '#5b6078'; ctx.fillRect(x, y, w, h); });
      const bx = -Math.cos(p.a), by = -Math.sin(p.a); ctx.strokeStyle = t.muted; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + bx * g.arm, p.y + by * g.arm); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = g.bad ? t.red : t.blue; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(g.cx, g.cy); ctx.stroke();
      if (g.blocked) { const hx = p.x + bx * g.free, hy = p.y + by * g.free; ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(hx, hy, 5, 0, 7); ctx.fill(); }
      ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(p.a) * 14, p.y + Math.sin(p.a) * 14); ctx.stroke();
      ctx.save(); ctx.translate(g.cx, g.cy); ctx.rotate(p.a); ctx.fillStyle = g.bad ? t.red : t.blue; ctx.fillRect(-8, -6, 14, 12); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(13, -6); ctx.lineTo(13, 6); ctx.fill(); ctx.restore();
      ctx.fillStyle = t.card; ctx.globalAlpha = 0.88; ctx.fillRect(18, 18, 360, 40); ctx.globalAlpha = 1;
      txt(ctx, `kol: istenen ${g.arm} · engele kadar ${Math.round(g.free)} · şu anki ${Math.round(g.len)} piksel`, 24, 30, t.ink, 11); txt(ctx, g.bad ? `⚠ kamera duvarın arkasında: karakter görünmüyor (${g.inWall.toFixed(1)} sn)` : g.blocked ? 'ışın duvara çarptı: kol kısaldı' : 'arkası boş: kol tam boyunda', 24, 48, g.bad ? t.red : g.blocked ? t.amber : t.muted, 11);
      info.innerHTML = `Odaya <b>yukarıdan</b> bakıyoruz. Yeşil daire karakter (<b>W / S</b> ileri-geri, <b>A / D</b> dön); mavi kutu, karakterin arkasında duran <b>kamera</b>; açık mavi alan kameranın gördüğü. Kamera karaktere görünmez bir <b>kol</b> ile bağlı (kesikli çizgi: istenen boy). Her kare karakterden geriye bir <b>ışın</b> atılır (G3): duvara çarparsa (sarı nokta) kamera çarpma noktasının biraz önüne çekilir. Sırtınızı duvara verin: kamera omzunuza yapışır. Duvardan uzaklaşın: kol <b>yavaşça</b> geri uzar. ${g.collide ? '' : '<b>Çarpışma kapalı:</b> kamera duvarın öbür tarafına geçiyor; ekranda karakter yerine duvarın arkası olurdu.'}`;
    };
    const loop = now => { if (!timer) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; g.step(dt); draw(); timer = requestAnimationFrame(loop); };
    const start = () => { if (timer) return; last = 0; timer = requestAnimationFrame(loop); }, stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; g.k = {}; };
    keys(() => !!timer, ['w', 'a', 's', 'd'], k => { g.k[k] = true; }, k => { g.k[k] = false; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, chk('kamera çarpışması (ışınla kolu kısalt)', true, v => { g.collide = v; }), slider('kol boyu (piksel)', 40, 220, g.arm, 10, v => { g.arm = v; }), btn('↺ baştan', () => g.reset())), C, info);
    g.step(0.016); draw(); SL.onTheme(draw); SL._boom = g;
    return { start, stop };
  };

  /* ---------- simlab: kamera penceresi ---------- */
  SL.SIMLABS.camwin = function (box, api) {
    const W = 520, H = 280, HALF = 60, LW = 1500;
    let fn = null, err = null, S;
    const ref = (c, p, h) => (p > c + h ? p - h : p < c - h ? p + h : c);
    const pAt = t => 260 + 480 * (1 - Math.cos(t * 0.55)) + 46 * Math.sin(t * 5.2);
    const fresh = () => { S = { t: 0, me: 260, good: 260, moved: 0, gmoved: 0 }; err = null; };
    fresh();
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt) { if (!fn || err) return; dt = Math.min(dt, 0.05); S.t += dt; const p = pAt(S.t); let out; try { out = fn(S.me, p, HALF); } catch (e) { err = SL.jsErrorText(e); return; } if (!Number.isFinite(out)) { err = 'cameraWindow bir sayı döndürmeli'; return; } S.moved += Math.abs(out - S.me); S.me = out; const g = ref(S.good, p, HALF); S.gmoved += Math.abs(g - S.good); S.good = g; },
      render(ctx, w, t) {
        const p = pAt(S.t), view = (cam, y, name, c) => { ctx.save(); ctx.beginPath(); ctx.rect(20, y, W - 40, 90); ctx.clip(); ctx.fillStyle = t.dark ? '#1d2030' : '#dfe9f5'; ctx.fillRect(20, y, W - 40, 90); const ox = W / 2 - cam; for (let x = 0; x < LW; x += 90) { ctx.fillStyle = t.dark ? '#262a3d' : '#cfdcec'; ctx.fillRect(ox + x, y + 30 - (x * 7 % 22), 40, 60); } ctx.fillStyle = t.dark ? '#5a5f78' : '#5b6078'; ctx.fillRect(20, y + 76, W - 40, 14); ctx.fillStyle = t.green; ctx.fillRect(ox + p - 8, y + 48, 16, 28); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.strokeRect(W / 2 - HALF, y + 6, HALF * 2, 78); ctx.setLineDash([]); ctx.restore(); txt(ctx, name, 24, y - 9, c, 10); };
        view(S.me, 44, `sizin kameranız — kat ettiği yol ${Math.round(S.moved)} piksel`, t.blue); view(S.good, 168, `doğrusu — kat ettiği yol ${Math.round(S.gmoved)} piksel`, t.green);
        txt(ctx, err ? '⚠️ ' + err : fn ? 'karakter titreyerek sağa sola gidiyor; pencere içindeki titreme kamerayı oynatmamalı' : 'Kodu çalıştırın', 8, 12, err ? t.red : t.muted, 10);
      },
      reset() { fresh(); }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w,
      setFns(f) { fn = f.cameraWindow; fresh(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try { for (const [c, p, h] of [[100, 100, 60], [100, 150, 60], [100, 160, 60], [100, 161, 60], [100, 200, 60], [100, 40, 60], [100, 39, 60], [100, 0, 60], [500, 620, 50], [500, 380, 50], [0, -10, 5], [0, 4, 5]]) { const got = mod.cameraWindow(c, p, h), want = ref(c, p, h); if (typeof got !== 'number' || Math.abs(got - want) > 1e-9) return { ok: false, msg: `❌ cameraWindow(kamera ${c}, karakter ${p}, yarı genişlik ${h}) → ${got}; beklenen ${want}. Pencere ${c - h} ile ${c + h} arası. ${want === c ? 'Karakter pencerenin içinde: kamera kıpırdamamalı.' : p > c ? 'Karakter sağ kenarı aştı: kamerayı, karakter tam sağ kenarda kalacak kadar kaydırın (karakter − yarı genişlik).' : 'Karakter sol kenarı aştı: kamera = karakter + yarı genişlik.'}` }; } }
        catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Kamera penceresi doğru: üstteki kamera alttakiyle aynı. Karakterin küçük titremeleri görüntüyü oynatmıyor; kamera yalnızca karakter kenarı ittiğinde kayıyor.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  const rn = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
  SL.AILABS.w2s = {
    fn: 'world_to_screen', jsFn: 'worldToScreen', tol: 1e-9, ref: (wx, cam, zoom, sw) => (wx - cam) * zoom + sw / 2,
    cases: () => { const cs = [[500, 500, 1, 800], [600, 500, 1, 800], [600, 500, 2, 800], [300, 500, 0.5, 800], [0, 400, 1, 800], [1000, 400, 1, 800]]; for (let i = 0; i < 6; i++) cs.push([Math.round(rn(0, 2000)), Math.round(rn(0, 2000)), [0.5, 1, 2][i % 3], 720]); return cs; },
    show: (wx, cam, zoom, sw) => `dünyadaki x ${wx} · kamera ${cam} noktasına bakıyor · ölçek ${zoom} · ekran genişliği ${sw}`,
    hint: (wx, cam, zoom, sw) => `Üç adım: (1) kameraya göre konum: ${wx} − ${cam} = ${wx - cam}. (2) ölçekle: × ${zoom}. (3) ekranın ortasına taşı: + ${sw} / 2.`
  };
  SL.AILABS.s2w = {
    fn: 'screen_to_world', jsFn: 'screenToWorld', tol: 1e-9, ref: (sx, cam, zoom, sw) => (sx - sw / 2) / zoom + cam,
    cases: () => { const cs = [[400, 500, 1, 800], [500, 500, 1, 800], [600, 500, 2, 800], [300, 500, 0.5, 800], [0, 400, 1, 800], [800, 400, 1, 800]]; for (let i = 0; i < 6; i++) cs.push([Math.round(rn(0, 720)), Math.round(rn(0, 2000)), [0.5, 1, 2][i % 3], 720]); return cs; },
    show: (sx, cam, zoom, sw) => `ekrandaki x (fare) ${sx} · kamera ${cam} noktasına bakıyor · ölçek ${zoom} · ekran genişliği ${sw}`,
    hint: (sx, cam, zoom, sw) => `worldToScreen’in tersi; adımları ters sırayla geri alın: (1) ortadan çıkar: ${sx} − ${sw / 2} = ${sx - sw / 2}. (2) ölçeğe BÖL: / ${zoom}. (3) kamerayı ekle: + ${cam}.`
  };
  SL.AILABS.clampcam = {
    fn: 'clamp_camera', jsFn: 'clampCamera', tol: 1e-9, ref: (cam, vw, lw) => (lw <= vw ? lw / 2 : Math.max(vw / 2, Math.min(lw - vw / 2, cam))),
    cases: () => [[1000, 800, 3000], [100, 800, 3000], [400, 800, 3000], [2900, 800, 3000], [2600, 800, 3000], [-50, 800, 3000], [300, 800, 600], [0, 800, 800], [1234, 720, 2600]],
    show: (cam, vw, lw) => `kameranın bakmak istediği x ${cam} · görüntü genişliği ${vw} · seviye genişliği ${lw}`,
    hint: (cam, vw, lw) => (lw <= vw ? `Seviye (${lw}) ekrandan (${vw}) dar: kamerayı seviyenin ortasına sabitleyin (${lw / 2}).` : `Kameranın sol kenarı (cam − ${vw / 2}) 0’dan küçük, sağ kenarı (cam + ${vw / 2}) ${lw}’den büyük olamaz: cam, ${vw / 2} ile ${lw - vw / 2} arasına sıkıştırılır.`)
  };
  SL.AILABS.fitzoom = {
    fn: 'fit_zoom', jsFn: 'fitZoom', tol: 1e-9,
    ref: (xs, sw, m, zmin, zmax) => { const a = Math.min(...xs), b = Math.max(...xs); return [(a + b) / 2, Math.max(zmin, Math.min(zmax, sw / (b - a + 2 * m)))]; },
    cases: () => [[[300, 700], 800, 100, 0.25, 1.5], [[0, 1600], 800, 100, 0.25, 1.5], [[400, 500], 800, 100, 0.25, 1.5], [[0, 5000], 800, 100, 0.25, 1.5], [[100, 900, 500], 800, 0, 0.5, 2], [[250], 800, 50, 0.5, 2], [[900, 100, 300, 1300], 720, 90, 0.35, 1.3]],
    show: (xs, sw, m, zmin, zmax) => `dövüşçülerin x’leri ${JSON.stringify(xs)} · ekran ${sw} · kenar payı ${m} · ölçek sınırları ${zmin}–${zmax}`,
    hint: (xs, sw, m, zmin, zmax) => { const a = Math.min(...xs), b = Math.max(...xs); return `En soldaki ${a}, en sağdaki ${b}. Merkez = (${a} + ${b}) / 2. Sığması gereken genişlik = (${b} − ${a}) + 2 · ${m} = ${b - a + 2 * m}. Ölçek = ekran / genişlik = ${Math.round(sw / (b - a + 2 * m) * 1000) / 1000}; sonra [${zmin}, ${zmax}] aralığına sıkıştırın. [merkez, ölçek] döndürün.`; }
  };
  SL.AILABS.trauma = {
    fn: 'shake_step', jsFn: 'shakeStep', tol: 1e-9,
    ref: (tr, decay, dt, maxOff, noise) => { const t2 = Math.max(0, tr - decay * dt); return [t2, maxOff * t2 * t2 * noise]; },
    cases: () => [[1, 1, 0.1, 30, 1], [0.5, 1, 0.1, 30, 1], [0.5, 1, 0.1, 30, -0.5], [0.05, 1, 0.1, 30, 1], [0, 1, 0.1, 30, 1], [0.8, 0.5, 0.2, 20, 0.25], [1, 2, 0.016, 24, -1]],
    show: (tr, decay, dt, maxOff, noise) => `travma ${tr} · sönme ${decay}/sn · dt ${dt} · en büyük kayma ${maxOff} piksel · gürültü ${noise}`,
    hint: (tr, decay, dt) => `(1) Travmayı söndür: ${tr} − ${decay} · ${dt} = ${Math.round((tr - decay * dt) * 1000) / 1000}; sıfırın altına inmesin (max(0, …)). (2) Sarsıntı = yeni travmanın KARESİ. (3) Kayma = en büyük kayma × sarsıntı × gürültü. [yeniTravma, kayma] döndürün.`
  };

  /* ---------- başlık ---------- */
  D.titlegeo9 = function (root) {
    const W = 1280, H = 230, cv = el('canvas'); root.append(cv);
    const ctx = SL.setupCanvas(cv, W, H); let timer, running = false, t = 0, cx = 900;
    const tick = () => { if (!running) return; t += 0.033; const px = 1000 + Math.sin(t * 0.7) * 190, py = 150 - Math.abs(Math.sin(t * 2.1)) * 50; cx = damp(cx, px, 0.5, 0.033);
      ctx.clearRect(0, 0, W, H); ctx.strokeStyle = 'rgba(160,200,255,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.strokeRect(cx - 130, 30, 260, 170); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(160,200,255,0.9)'; ctx.beginPath(); ctx.moveTo(cx - 8, 115); ctx.lineTo(cx + 8, 115); ctx.moveTo(cx, 107); ctx.lineTo(cx, 123); ctx.stroke();
      ctx.fillStyle = 'rgba(160,200,255,0.3)'; ctx.fillRect(720, 190, 540, 6); ctx.fillStyle = '#ffd36b'; ctx.fillRect(px - 8, py, 16, 30);
      timer = setTimeout(tick, 33); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
