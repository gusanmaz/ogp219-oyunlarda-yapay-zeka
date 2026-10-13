/* "Eğriler ve Ara Değerleme" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const big = C => { C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%'; };
  const mpos = (C, W, H) => e => { const b = C.getBoundingClientRect(); return V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height); };
  const clamp = SL.clamp, lerp = (a, b, t) => a + (b - a) * t, lerpV = (a, b, t) => V.v(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
  const keys = (isOn, list, onDown, onUp) => {
    const h = (e, down) => { if (!isOn()) return; const k = e.key === ' ' ? 'space' : e.key.toLowerCase(); if (!list.includes(k) || e.ctrlKey || e.metaKey || e.altKey) return; if (e.target && e.target.closest && e.target.closest('.CodeMirror, input, textarea, select')) return; if (down && e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); return; } (down ? onDown : onUp || (() => {}))(k); e.preventDefault(); e.stopImmediatePropagation(); };
    window.addEventListener('keydown', e => h(e, true), true); window.addEventListener('keyup', e => h(e, false), true);
  };
  const chk = (label, val, fn) => el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => fn(e.target.checked) }); x.checked = val; return x; })(), ' ' + label);
  const fmt = (x, n = 2) => x.toFixed(n).replace('.', ',');

  /* ---------- yumuşatma fonksiyonları ---------- */
  const EASE = {
    linear: { ad: 'doğrusal: t', f: t => t },
    inQuad: { ad: 'yavaş başla: t²', f: t => t * t },
    outQuad: { ad: 'yavaş bitir: 1 − (1 − t)²', f: t => 1 - (1 - t) * (1 - t) },
    smooth: { ad: 'smoothstep: 3t² − 2t³', f: t => t * t * (3 - 2 * t) },
    outBack: { ad: 'taşıp dön (back)', f: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } },
    outElastic: { ad: 'yay gibi (elastic)', f: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1) },
    outBounce: { ad: 'sekerek (bounce)', f: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; } }
  };
  SL.EASE = EASE;

  /* ================= 1) yumuşatma yarışı ================= */
  D.ease = function (root) {
    const W = 720, H = 340, ids = Object.keys(EASE);
    let sel = 'smooth', dur = 1.0, t = 0, timer = null, hold = 0, last = 0;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const th = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = th.card; ctx.fillRect(0, 0, W, H);
      const u = clamp(t / dur, 0, 1);
      // sol: grafik
      const gx = 40, gy = 250, gs = 190;
      ctx.strokeStyle = th.rule; ctx.lineWidth = 1; ctx.strokeRect(gx, gy - gs, gs, gs);
      SL.drawLabel(ctx, 't (geçen sürenin oranı) →', gx + gs / 2, gy + 16, th.muted, { size: 10 }); SL.drawLabel(ctx, '0', gx - 8, gy, th.muted, { size: 10 }); SL.drawLabel(ctx, '1', gx - 8, gy - gs, th.muted, { size: 10 }); SL.drawLabel(ctx, '1', gx + gs, gy + 16, th.muted, { size: 10 });
      SL.drawLabel(ctx, 'ilerleme', gx + 4, gy - gs - 12, th.muted, { size: 10, align: 'left' });
      ctx.strokeStyle = th.rule; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gs, gy - gs); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = th.blue; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 100; i++) { const x = i / 100, y = EASE[sel].f(x); i ? ctx.lineTo(gx + x * gs, gy - y * gs) : ctx.moveTo(gx + x * gs, gy - y * gs); } ctx.stroke();
      const ey = EASE[sel].f(u); ctx.fillStyle = th.red; ctx.beginPath(); ctx.arc(gx + u * gs, gy - ey * gs, 6, 0, 7); ctx.fill();
      ctx.strokeStyle = th.red; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(gx + u * gs, gy); ctx.lineTo(gx + u * gs, gy - ey * gs); ctx.lineTo(gx, gy - ey * gs); ctx.stroke(); ctx.setLineDash([]);
      SL.drawLabel(ctx, `t = ${fmt(u)} → ilerleme = ${fmt(ey)}`, gx + gs / 2, gy + 40, th.ink, { size: 12 });
      // sağ: şeritler
      const x0 = 300, x1 = 680, ly = i => 34 + i * 40;
      ctx.strokeStyle = th.rule; ctx.setLineDash([3, 4]); [x0, x1].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, ly(ids.length - 1) + 20); ctx.stroke(); }); ctx.setLineDash([]);
      ids.forEach((id, i) => {
        const y = ly(i), p = EASE[id].f(u), x = lerp(x0, x1, p), on = id === sel;
        SL.drawLabel(ctx, EASE[id].ad, x0 - 4, y - 15, on ? th.blue : th.muted, { size: 10, align: 'left', bold: on });
        ctx.fillStyle = on ? th.blue : (th.dark ? '#6c7391' : '#9aa0b8'); ctx.fillRect(x - 12, y - 6, 24, 20); if (on) { ctx.strokeStyle = th.red; ctx.lineWidth = 2; ctx.strokeRect(x - 12, y - 6, 24, 20); }
      });
      SL.drawLabel(ctx, 'A', x0, ly(ids.length - 1) + 30, th.muted, { size: 11 }); SL.drawLabel(ctx, 'B', x1, ly(ids.length - 1) + 30, th.muted, { size: 11 });
      info.innerHTML = `Yedi kutu aynı anda A’dan çıkar ve hepsi tam <b>${fmt(dur, 1)} saniye</b> sonra B’ye varır. Aradaki tek fark: ilerleme, sürenin <b>hangi fonksiyonu</b>? Solda seçili fonksiyonun grafiği: yatay eksen geçen sürenin oranı (t), dikey eksen yolun ne kadarının gidildiği. Eğri dikse kutu hızlı, yataysa yavaştır. Kesikli köşegen doğrusal harekettir. Grafiğin 1’in <b>üstüne</b> çıktığı yerde kutu hedefi geçip geri döner.`;
    };
    const tick = now => { if (!timer) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; if (t < dur) t += dt; else { hold += dt; if (hold > 0.9) { t = 0; hold = 0; } } draw(); timer = requestAnimationFrame(tick); };
    const start = () => { if (timer) return; last = 0; timer = requestAnimationFrame(tick); }, stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Grafikte: ', select(Object.fromEntries(ids.map(i => [i, EASE[i].ad])), sel, v => { sel = v; draw(); })), slider('süre (sn)', 0.2, 3, dur, 0.1, v => { dur = v; t = 0; hold = 0; }), btn('↺ yeniden', () => { t = 0; hold = 0; })), C, info);
    draw(); SL.onTheme(draw);
    return { start, stop };
  };

  /* ================= 2) takip: kare başına oran mı, zamana bağlı oran mı? ================= */
  function smoothDamp(cur, target, vel, smoothTime, dt) {      // Unity Mathf.SmoothDamp ile aynı aritmetik (hız sınırı olmadan)
    const omega = 2 / Math.max(0.0001, smoothTime), x = omega * dt, exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = cur - target, temp = (vel + omega * change) * dt;
    const nv = (vel - omega * temp) * exp; let out = target + (change + temp) * exp;
    if ((target - cur > 0) === (out > target)) return [target, 0];
    return [out, nv];
  }
  SL.smoothDamp = smoothDamp;
  D.follow = function (root) {
    const W = 720, H = 340, HL = 0.11, K = 0.1;
    let fps = 30, timer = null, simT = 0, target = 0, auto = true, mx = null, F, hist = [];
    const mk = (rate, kind) => ({ rate, kind, x: 0, v: 0, acc: 0 });
    const reset = () => { simT = 0; target = 0; hist = []; F = { naive: mk(fps, 'naive'), ref: mk(60, 'naive'), exp: mk(fps, 'exp'), damp: mk(fps, 'damp') }; };
    const upd = (f, dt) => { f.rate = f === F.ref ? 60 : fps; f.acc += dt; const h = 1 / f.rate; while (f.acc >= h) { f.acc -= h; if (f.kind === 'naive') f.x += (target - f.x) * K; else if (f.kind === 'exp') f.x = lerp(f.x, target, 1 - Math.pow(2, -h / HL)); else { const r = smoothDamp(f.x, target, f.v, 0.22, h); f.x = r[0]; f.v = r[1]; } } };
    const step = dt => { simT += dt; if (auto) target = Math.floor(simT / 1.6) % 2 ? 1 : 0; else if (mx !== null) target = mx; Object.values(F).forEach(f => upd(f, dt)); hist.push([simT, target, F.naive.x, F.ref.x, F.exp.x, F.damp.x]); while (hist.length && hist[0][0] < simT - 4.8) hist.shift(); };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const X = v => 70 + v * 580;
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const rows = [['naive', t.red, `kare başına %10 — bu makine (${fps} FPS)`], ['ref', t.muted, 'kare başına %10 — 60 FPS’lik makine'], ['exp', t.green, `zamana bağlı oran (${fps} FPS)`], ['damp', t.purple, `SmoothDamp (${fps} FPS)`]];
      ctx.strokeStyle = t.amber; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(target), 8); ctx.lineTo(X(target), 132); ctx.stroke(); ctx.setLineDash([]); SL.drawLabel(ctx, 'hedef', X(target), 140, t.amber, { size: 10 });
      rows.forEach(([k, c, name], i) => { const y = 26 + i * 30; ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(0), y); ctx.lineTo(X(1), y); ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(F[k].x), y, 9, 0, 7); ctx.fill(); SL.drawLabel(ctx, name, X(0) - 4, y - 14, c, { size: 10, align: 'left' }); });
      // grafik: son 4,8 sn
      const gy0 = 318, gh = 150, gx0 = 40, gw = 660, tx = tt => gx0 + ((tt - (simT - 4.8)) / 4.8) * gw, vy = v => gy0 - v * gh * 0.8 - gh * 0.08;
      ctx.strokeStyle = t.rule; ctx.strokeRect(gx0, gy0 - gh, gw, gh); SL.drawLabel(ctx, 'konum – zaman (son 4,8 sn)', gx0 + 6, gy0 - gh + 10, t.muted, { size: 10, align: 'left' });
      [[1, t.amber, 2, [5, 4]], [3, t.muted, 1.5, [2, 3]], [2, t.red, 2, []], [4, t.green, 2, []], [5, t.purple, 1.5, []]].forEach(([ix, c, lw, dash]) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath(); hist.forEach((h, i) => { const x = tx(h[0]), y = vy(h[ix]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }); ctx.setLineDash([]);
      info.innerHTML = `Dört top aynı sarı hedefi kovalıyor. <b class="c-red">Kırmızı</b> ve gri aynı kodu çalıştırıyor: <code>x += (hedef − x) * 0.1</code>, her karede bir kez. Fark yalnızca kare hızı: kırmızı ${fps} FPS’lik, gri 60 FPS’lik makinede. ${fps === 60 ? 'Şu an ikisi üst üste.' : fps < 60 ? '<b>Kırmızı geride kalıyor</b>: aynı kod yavaş makinede daha tembel bir kamera demek.' : '<b>Kırmızı öne geçiyor</b>: hızlı makinede kamera sertleşiyor.'} <b class="c-green">Yeşil</b> oranı geçen süreden hesaplıyor (1 − 2<sup>−dt / yarı ömür</sup>): kare hızı ne olursa olsun griyle aynı eğri. <b class="c-purple">Mor</b> Unity’nin SmoothDamp’i: yumuşak kalkar, yumuşak durur.`;
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousemove', e => { if (!auto) mx = clamp((mp(e).x - 70) / 580, 0, 1); });
    const run = () => { if (timer) return; timer = setInterval(() => { for (let k = 0; k < 4; k++) step(1 / 240); draw(); }, 1000 / 60); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('bu makinenin kare hızı (FPS)', 10, 144, fps, 2, v => { fps = v; }), el('label', { class: 'ctl' }, 'Hedef: ', select({ auto: 'kendiliğinden (sağ–sol)', mouse: 'fareyi izlesin' }, 'auto', v => { auto = v === 'auto'; })), btn('↺ baştan', () => { reset(); draw(); })), C, info);
    reset(); draw(); SL.onTheme(draw);
    SL._follow = { step, F: () => F, setFps: v => { fps = v; }, reset };
    return { start: run, stop };
  };

  /* ================= 3) Bézier ve De Casteljau ================= */
  const bez = (P, t) => { let pts = P.slice(); const lv = [pts]; while (pts.length > 1) { pts = pts.slice(0, -1).map((p, i) => lerpV(p, pts[i + 1], t)); lv.push(pts); } return lv; };
  D.bezier = function (root) {
    const W = 720, H = 340;
    let P, t = 0.35, play = false, timer = null, scaf = true, dots = false, drag = -1, deg = 3, dir = 1;
    const init = () => { P = deg === 3 ? [V.v(90, 290), V.v(170, 90), V.v(520, 80), V.v(630, 290)] : [V.v(90, 290), V.v(360, 80), V.v(630, 290)]; };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const th = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = th.card; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = th.ink; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 80; i++) { const p = bez(P, i / 80).pop()[0]; i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke();
      if (dots) { ctx.fillStyle = th.purple; for (let i = 0; i <= 20; i++) { const p = bez(P, i / 20).pop()[0]; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill(); } }
      const lv = bez(P, t), cols = [th.muted, th.blue, th.green, th.red];
      if (scaf) lv.forEach((pts, L) => { if (L === lv.length - 1) return; ctx.strokeStyle = cols[L]; ctx.lineWidth = L ? 2 : 1.5; ctx.setLineDash(L ? [] : [5, 4]); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.setLineDash([]); if (L) pts.forEach(p => { ctx.fillStyle = cols[L]; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fill(); }); });
      P.forEach((p, i) => { ctx.fillStyle = th.card; ctx.strokeStyle = th.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 7); ctx.fill(); ctx.stroke(); SL.drawLabel(ctx, 'P' + i, p.x, p.y - 18, th.ink, { size: 11, bold: true }); });
      const b = lv[lv.length - 1][0]; ctx.fillStyle = th.red; ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, 7); ctx.fill();
      SL.drawLabel(ctx, `t = ${fmt(t)}  →  eğri üzerindeki nokta (${Math.round(b.x)}, ${Math.round(b.y)})`, 10, 14, th.ink, { size: 12, align: 'left' });
      const n = deg; SL.drawLabel(ctx, `${n + 1} kontrol noktası · ${n * (n + 1) / 2} lerp (${Array.from({ length: n }, (_, i) => n - i).join(' + ')})`, 10, 32, th.muted, { size: 11, align: 'left' });
      info.innerHTML = `Siyah eğri, ${deg === 3 ? 'dört' : 'üç'} <b>kontrol noktasının</b> tarif ettiği Bézier eğrisi; noktaları fareyle <b>sürükleyin</b>. Eğri yalnızca ilk ve son noktadan geçer; aradakiler onu kendine doğru “çeker”. <b class="c-red">Kırmızı nokta</b> eğrinin t anındaki yeri ve yalnızca lerp ile bulunur: gri kesikli çizgilerin her biri üzerinde t kadar ilerle (<b class="c-blue">mavi</b> noktalar); mavileri birleştir, yine t kadar ilerle (<b class="c-green">yeşil</b>); ${deg === 3 ? 'yeşilleri birleştir, bir daha: kırmızı.' : 'yeşil nokta eğrinin üstündedir (kırmızı).'} ${dots ? 'Mor noktalar t = 0, 0,05, 0,10 … için eğri üzerindeki yerler: <b>eşit t aralıkları eşit yol demek değil</b>.' : ''}`;
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousedown', e => { const m = mp(e); drag = P.findIndex(p => Math.hypot(p.x - m.x, p.y - m.y) < 22); });
    C.addEventListener('mousemove', e => { if (drag < 0) return; const m = mp(e); P[drag] = V.v(clamp(m.x, 10, W - 10), clamp(m.y, 10, H - 10)); if (!timer) draw(); });
    window.addEventListener('mouseup', () => { drag = -1; });
    C.style.cursor = 'grab';
    let tS;
    const run = () => { if (timer) return; timer = setInterval(() => { if (play) { t += dir * 0.006; if (t >= 1) { t = 1; dir = -1; } if (t <= 0) { t = 0; dir = 1; } tS && tS.set && tS.set(t); } draw(); }, 33); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('t', 0, 1, t, 0.01, v => { t = v; play = false; }), btn('▶ / ⏸ t’yi oynat', () => { play = !play; }), el('label', { class: 'ctl' }, 'Derece: ', select({ 3: 'kübik (4 nokta)', 2: 'karesel (3 nokta)' }, '3', v => { deg = +v; init(); })), chk('iskeleyi göster', true, v => { scaf = v; }), chk('eşit t adımları', false, v => { dots = v; })), C, info);
    init(); draw(); SL.onTheme(draw);
    return { start: run, stop };
  };

  /* ================= 4) noktalardan geçen yol: Catmull–Rom + sabit hız ================= */
  const cr1 = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  const crV = (a, b, c, d, t) => V.v(cr1(a.x, b.x, c.x, d.x, t), cr1(a.y, b.y, c.y, d.y, t));
  function makePath(pts, mode, closed = true) {
    const n = pts.length, at = (i) => pts[((i % n) + n) % n], segs = closed ? n : n - 1;
    const pos = u => { u = closed ? ((u % segs) + segs) % segs : clamp(u, 0, segs - 1e-9); const i = Math.floor(u), t = u - i; return mode === 'linear' ? lerpV(at(i), at(i + 1), t) : crV(at(i - 1), at(i), at(i + 1), at(i + 2), t); };
    const N = segs * 64, tab = [0]; let prev = pos(0);                      // yay uzunluğu tablosu
    for (let k = 1; k <= N; k++) { const p = pos((k / N) * segs); tab.push(tab[k - 1] + Math.hypot(p.x - prev.x, p.y - prev.y)); prev = p; }
    const total = tab[N];
    const uAt = s => { s = ((s % total) + total) % total; let lo = 0, hi = N; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tab[mid] <= s) lo = mid; else hi = mid; } const f = (s - tab[lo]) / ((tab[hi] - tab[lo]) || 1); return ((lo + f) / N) * segs; };
    return { pos, uAt, total, segs, tab, N };
  }
  SL.CRV = { cr1, makePath, bez };
  D.spline = function (root) {
    const W = 720, H = 340;
    let pts, mode = 'cr', constSpeed = true, path, u = 0, s = 0, speed = 170, timer = null, last = 0, drag = -1, moved = false, laps = 0, kk = {}, vHist = [], lastP = null;
    const preset = () => { pts = [V.v(110, 250), V.v(120, 90), V.v(300, 60), V.v(380, 170), V.v(520, 70), V.v(630, 150), V.v(590, 280), V.v(350, 290)]; };
    const rebuild = () => { path = makePath(pts, mode === 'cr' ? 'cr' : 'linear'); };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = t.dark ? '#4a4f63' : '#c9cbd6'; ctx.lineWidth = 22; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); for (let k = 0; k <= path.N; k++) { const p = path.pos((k / path.N) * path.segs); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke();
      ctx.fillStyle = t.purple; for (let k = 0; k < path.segs * 6; k++) { const p = constSpeed ? path.pos(path.uAt((k / (path.segs * 6)) * path.total)) : path.pos(k / 6); ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill(); }
      pts.forEach((p, i) => { ctx.fillStyle = t.card; ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 7); ctx.fill(); ctx.stroke(); SL.drawLabel(ctx, String(i), p.x, p.y - 15, t.muted, { size: 10 }); });
      const uu = constSpeed ? path.uAt(s) : u, p = path.pos(uu), q = path.pos(uu + 0.02), ang = Math.atan2(q.y - p.y, q.x - p.x);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); ctx.fillStyle = t.red; ctx.fillRect(-11, -6, 22, 12); ctx.fillStyle = '#fff'; ctx.fillRect(3, -4, 5, 8); ctx.restore();
      const vNow = vHist.length ? vHist[vHist.length - 1] : 0, vMin = Math.min(...vHist, 1e9), vMax = Math.max(...vHist, 0);
      SL.drawLabel(ctx, `${pts.length} nokta · yol ${Math.round(path.total)} piksel · tur ${laps} · anlık hız ${Math.round(vNow)} piksel/sn (son turda en az ${vHist.length ? Math.round(vMin) : '—'}, en çok ${vHist.length ? Math.round(vMax) : '—'})`, 8, H - 10, t.ink, { size: 11, align: 'left' });
      info.innerHTML = `Siyah halkalar <b>yol noktaları</b>: sürükleyin; boş yere tıklayıp yeni nokta ekleyin. ${mode === 'cr' ? '<b>Catmull–Rom</b> eğrisi her noktanın <b>içinden</b> geçer ve köşe yapmaz.' : '<b>Doğrusal</b> yolda araba her noktada aniden döner.'} Mor noktalar ${constSpeed ? 'yol boyunca <b>eşit mesafelerle</b> dizili: araba sabit hızla gider (yay uzunluğu tablosu).' : '<b>eşit t adımlarıyla</b> dizili: noktalar arası uzaksa seyrek (araba hızlı), yakınsa sık (araba yavaş). Alttaki en az / en çok hıza bakın.'} <b>W</b> gaz, <b>S</b> fren.`;
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousedown', e => { const m = mp(e); drag = pts.findIndex(p => Math.hypot(p.x - m.x, p.y - m.y) < 18); moved = false; if (drag < 0 && pts.length < 16) { let bi = 0, bd = 1e9; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], d = Math.hypot((a.x + b.x) / 2 - m.x, (a.y + b.y) / 2 - m.y); if (d < bd) { bd = d; bi = i; } } pts.splice(bi + 1, 0, m); rebuild(); SL.sfx && SL.sfx('knock'); } });
    C.addEventListener('mousemove', e => { if (drag < 0) return; const m = mp(e); pts[drag] = V.v(clamp(m.x, 14, W - 14), clamp(m.y, 14, H - 30)); moved = true; rebuild(); });
    window.addEventListener('mouseup', () => { drag = -1; });
    C.style.cursor = 'crosshair';
    const tick = now => {
      if (!timer) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      speed = clamp(speed + ((kk.w ? 1 : 0) - (kk.s ? 1 : 0)) * 260 * dt, 40, 420);
      const before = constSpeed ? s : u;
      if (constSpeed) { s += speed * dt; if (s >= path.total) { s -= path.total; laps++; vHist = []; } }
      else { u += (speed / (path.total / path.segs)) * dt; if (u >= path.segs) { u -= path.segs; laps++; vHist = []; } }
      const p = path.pos(constSpeed ? path.uAt(s) : u); if (lastP && dt > 0) { vHist.push(Math.hypot(p.x - lastP.x, p.y - lastP.y) / dt); if (vHist.length > 2000) vHist.shift(); } lastP = p;
      draw(); timer = requestAnimationFrame(tick);
    };
    const start = () => { if (timer) return; last = 0; lastP = null; timer = requestAnimationFrame(tick); }, stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; kk = {}; };
    keys(() => !!timer, ['w', 's'], k => { kk[k] = true; }, k => { kk[k] = false; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Yol: ', select({ cr: 'Catmull–Rom', linear: 'doğrusal (lerp)' }, mode, v => { mode = v; rebuild(); vHist = []; })), chk('sabit hız (yay uzunluğu tablosu)', true, v => { constSpeed = v; vHist = []; lastP = null; if (v) s = (path.tab[Math.round((u / path.segs) * path.N)] || 0); else u = path.uAt(s); }), btn('↺ pisti sıfırla', () => { preset(); rebuild(); s = u = 0; laps = 0; vHist = []; })), C, info);
    preset(); rebuild(); draw(); SL.onTheme(draw);
    return { start, stop };
  };

  /* ---------- simlab: kare hızından bağımsız takip ---------- */
  SL.SIMLABS.damp = function (box, api) {
    const W = 520, H = 280, HL = 0.15;
    let fn = null, err = null, simT = 0, target = 0.2, F;
    const ref = (x, hedef, h, dt) => x + (hedef - x) * (1 - Math.pow(2, -dt / h));
    const mk = rate => ({ rate, x: 0.2, acc: 0 });
    const fresh = () => { simT = 0; target = 0.2; err = null; F = { slow: mk(20), fast: mk(144), good: mk(60) }; };
    fresh();
    const upd = (f, dt, g) => { f.acc += dt; const h = 1 / f.rate; while (f.acc >= h) { f.acc -= h; f.x = g(f.x, target, HL, h); } };
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt) {
        if (!fn || err) return; dt = Math.min(dt, 0.05); simT += dt; target = Math.floor(simT / 1.4) % 2 ? 0.85 : 0.15;
        try { upd(F.slow, dt, fn); upd(F.fast, dt, fn); } catch (e) { err = SL.jsErrorText(e); return; }
        if (!Number.isFinite(F.slow.x) || !Number.isFinite(F.fast.x)) { err = 'damp bir sayı döndürmeli'; return; }
        upd(F.good, dt, ref);
      },
      render(ctx, w, t) {
        const X = v => 30 + v * (W - 60);
        ctx.strokeStyle = t.amber; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(target), 30); ctx.lineTo(X(target), H - 30); ctx.stroke(); ctx.setLineDash([]); SL.drawLabel(ctx, 'hedef', X(target), H - 18, t.amber, { size: 10 });
        [['slow', t.red, 'sizin kodunuz, 20 FPS', 80], ['fast', t.blue, 'sizin kodunuz, 144 FPS', 140], ['good', t.green, 'doğrusu (her kare hızında aynı)', 200]].forEach(([k, c, name, y]) => { ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(0), y); ctx.lineTo(X(1), y); ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(F[k].x), y, 10, 0, 7); ctx.fill(); SL.drawLabel(ctx, name, X(0), y - 18, c, { size: 10, align: 'left' }); });
        const gap = Math.abs(F.slow.x - F.fast.x);
        SL.drawLabel(ctx, err ? '⚠️ ' + err : fn ? `iki makine arasındaki fark: ${(gap * 100).toFixed(1)} birim ${gap < 0.02 ? '✔' : '— aynı kod, farklı kamera!'}` : 'Kodu çalıştırın', 8, 14, err ? t.red : gap < 0.02 ? t.green : t.muted, { size: 11, align: 'left' });
      },
      reset() { fresh(); }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w,
      setFns(f) { fn = f.damp; fresh(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try {
          for (const [x, h, yo, dt] of [[0, 10, 0.1, 0.1], [0, 10, 0.1, 0.2], [5, 5, 0.3, 0.016], [2, 8, 0.15, 1 / 60], [2, 8, 0.15, 1 / 20], [10, 0, 0.5, 0.25], [-3, 4, 0.05, 0.01]]) { const got = mod.damp(x, h, yo, dt), want = ref(x, h, yo, dt); if (typeof got !== 'number' || Math.abs(got - want) > 1e-6) return { ok: false, msg: `❌ damp(x ${x}, hedef ${h}, yarı ömür ${yo}, dt ${Math.round(dt * 1000) / 1000}) → ${typeof got === 'number' ? Math.round(got * 1e4) / 1e4 : got}; beklenen ${Math.round(want * 1e4) / 1e4}. Oran dt’ye bağlı olmalı: oran = 1 − 2^(−dt / yarıÖmür); sonuç = x + (hedef − x) · oran. Kontrol: dt = yarı ömür ise oran tam 0,5.` }; }
          let a = 0, b = 0; for (let i = 0; i < 20; i++) a = mod.damp(a, 1, 0.2, 1 / 20); for (let i = 0; i < 144; i++) b = mod.damp(b, 1, 0.2, 1 / 144);
          if (Math.abs(a - b) > 1e-6) return { ok: false, msg: `❌ 1 saniye sonra: 20 FPS’te ${a.toFixed(4)}, 144 FPS’te ${b.toFixed(4)}. Sonuç kare hızına bağlı olmamalı.` };
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Kare hızından bağımsız: kırmızı (20 FPS) ve mavi (144 FPS) top yeşille aynı anda aynı yerde. Kırmızının hareketi kesik kesik ama geride kalmıyor.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  const rn = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
  SL.AILABS.lerp = {
    fn: 'lerp', jsFn: 'lerp', tol: 1e-9, ref: (a, b, t) => a + (b - a) * t,
    cases: () => { const cs = [[100, 300, 0.25], [0, 10, 0], [0, 10, 1], [0, 10, 0.5], [50, 20, 0.5], [-4, 4, 0.75], [0, 1, 1.5], [5, 5, 0.3]]; for (let i = 0; i < 6; i++) cs.push([rn(-50, 50), rn(-50, 50), rn(0, 1)]); return cs; },
    show: (a, b, t) => `a = ${a}, b = ${b}, t = ${t}`,
    hint: (a, b, t) => `a’dan başla; (b − a) farkının t kadarını ekle: ${a} + (${b} − ${a}) · ${t} = ${Math.round((a + (b - a) * t) * 1000) / 1000}. t’yi 0–1’e sıkıştırmayın (t = 1,5 için b’nin ötesine geçmeli).`
  };
  SL.AILABS.remap = {
    fn: 'remap', jsFn: 'remap', tol: 1e-9, ref: (v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a)),
    cases: () => [[30, 0, 100, 0, 200], [50, 0, 100, 0, 1], [15, 10, 20, 0, 100], [0, -1, 1, 0, 255], [300, 200, 600, 1, 0], [75, 50, 100, 10, 20], [5, 0, 10, 100, 50], [2, 0, 8, -4, 4]],
    show: (v, a, b, c, d) => `değer ${v}; kaynak aralık [${a}, ${b}] → hedef aralık [${c}, ${d}]`,
    hint: (v, a, b, c, d) => `İki adım. (1) Ters lerp: değer kaynak aralığın yüzde kaçında? t = (v − a) / (b − a) = ${Math.round(((v - a) / (b - a)) * 1000) / 1000}. (2) Lerp: hedef aralıkta aynı oran: c + (d − c) · t.`
  };
  SL.AILABS.smooth = {
    fn: 'smoothstep', jsFn: 'smoothstep', tol: 1e-9, ref: t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); },
    cases: () => [[0], [1], [0.5], [0.25], [0.75], [0.1], [0.9], [-0.5], [1.7], [0.333]],
    show: t => `t = ${t}`,
    hint: t => `Önce t’yi 0–1 arasına sıkıştırın (t < 0 → 0, t > 1 → 1), sonra 3t² − 2t³ (ya da t·t·(3 − 2t)). t = 0,25 → 0,15625.`
  };
  SL.AILABS.bezier = {
    fn: 'bezier', jsFn: 'bezier', tol: 1e-9,
    ref: (p0, p1, p2, p3, t) => { const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; const a = L(p0, p1), b = L(p1, p2), c = L(p2, p3), d = L(a, b), e = L(b, c); return L(d, e); },
    cases: () => { const sq = [[0, 0], [0, 4], [4, 4], [4, 0]]; const cs = [[...sq, 0.5], [...sq, 0.25], [...sq, 0], [...sq, 1], [[0, 0], [1, 1], [2, 2], [3, 3], 0.4], [[10, 0], [10, 30], [-20, 5], [0, 0], 0.7]]; for (let i = 0; i < 4; i++) cs.push([[rn(0, 9), rn(0, 9)], [rn(0, 9), rn(0, 9)], [rn(0, 9), rn(0, 9)], [rn(0, 9), rn(0, 9)], rn(0, 1)]); return cs; },
    show: (p0, p1, p2, p3, t) => `P0 ${JSON.stringify(p0)}, P1 ${JSON.stringify(p1)}, P2 ${JSON.stringify(p2)}, P3 ${JSON.stringify(p3)}, t = ${t}`,
    hint: () => `De Casteljau: önce komşu noktalar arasında üç lerp (A, B, C); sonra A–B ve B–C arasında iki lerp (D, E); en son D–E arasında bir lerp. Her lerp hem x’e hem y’ye uygulanır. Örnek: (0,0) (0,4) (4,4) (4,0), t = 0,5 → [2, 3].`
  };
  SL.AILABS.catmull = {
    fn: 'catmull', jsFn: 'catmull', tol: 1e-9, ref: cr1,
    cases: () => { const cs = [[0, 1, 3, 4, 0.5], [0, 1, 3, 4, 0], [0, 1, 3, 4, 1], [0, 0, 10, 10, 0.5], [5, 5, 5, 5, 0.3], [0, 10, 0, 10, 0.25], [1, 2, 4, 8, 0.75]]; for (let i = 0; i < 5; i++) cs.push([rn(-9, 9), rn(-9, 9), rn(-9, 9), rn(-9, 9), rn(0, 1)]); return cs; },
    show: (a, b, c, d, t) => `p0 = ${a}, p1 = ${b}, p2 = ${c}, p3 = ${d}, t = ${t}`,
    hint: () => `0,5 · ( 2·p1 + (−p0 + p2)·t + (2·p0 − 5·p1 + 4·p2 − p3)·t² + (−p0 + 3·p1 − 3·p2 + p3)·t³ ). Kontrol: t = 0 → p1; t = 1 → p2. Örnek: 0, 1, 3, 4 ve t = 0,5 → 2.`
  };

  /* ---------- başlık ---------- */
  D.titlegeo6 = function (root) {
    const W = 1280, H = 230, cv = el('canvas'); root.append(cv);
    const ctx = SL.setupCanvas(cv, W, H); let timer, running = false, t = 0;
    const P = [V.v(700, 200), V.v(820, 20), V.v(1040, 230), V.v(1240, 40)];
    const tick = () => { if (!running) return; t += 0.012; const u = (Math.sin(t) + 1) / 2, e = u * u * (3 - 2 * u); P[1].y = 30 + 40 * Math.sin(t * 0.7); P[2].y = 200 + 30 * Math.cos(t * 0.5);
      ctx.clearRect(0, 0, W, H); ctx.strokeStyle = 'rgba(160,200,255,0.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(160,200,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 60; i++) { const p = bez(P, i / 60).pop()[0]; i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke();
      const b = bez(P, e).pop()[0]; ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, 7); ctx.fill(); P.forEach(p => { ctx.fillStyle = 'rgba(160,200,255,0.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fill(); });
      timer = setTimeout(tick, 33); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
