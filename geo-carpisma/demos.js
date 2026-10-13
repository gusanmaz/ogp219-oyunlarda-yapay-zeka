/* "Çarpışma Tespiti" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const RNG = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const big = C => { C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%'; };
  const mpos = (C, W, H) => e => { const b = C.getBoundingClientRect(); return V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height); };
  const clamp = SL.clamp;

  /* ---------- ortak testler ---------- */
  const circleBox = (cx, cy, r, bx, by, bw, bh) => { const px = clamp(cx, bx, bx + bw), py = clamp(cy, by, by + bh); return (px - cx) ** 2 + (py - cy) ** 2 < r * r; };
  function sat(A, B) {   // dışbükey çokgenler: [{x,y}]; dönen: { hit, axes: [{n, a:[min,max], b:[min,max], overlap}], best }
    const axes = [];
    for (const P of [A, B]) for (let i = 0; i < P.length; i++) { const e = V.sub(P[(i + 1) % P.length], P[i]), n = V.norm(V.perp(e)); if (!axes.some(q => Math.abs(V.cross(q.n, n)) < 1e-6)) axes.push({ n }); }
    const proj = (P, n) => { let mn = Infinity, mx = -Infinity; for (const p of P) { const s = V.dot(p, n); if (s < mn) mn = s; if (s > mx) mx = s; } return [mn, mx]; };
    let best = null, hit = true;
    for (const ax of axes) { ax.a = proj(A, ax.n); ax.b = proj(B, ax.n); ax.overlap = Math.min(ax.a[1], ax.b[1]) - Math.max(ax.a[0], ax.b[0]); if (ax.overlap <= 0) hit = false; if (!best || ax.overlap < best.overlap) best = ax; }
    const cA = A.reduce((s, p) => V.add(s, p), V.v()), cB = B.reduce((s, p) => V.add(s, p), V.v());
    const dir = V.sub(V.mul(cA, 1 / A.length), V.mul(cB, 1 / B.length));
    const mtv = hit ? V.mul(V.dot(dir, best.n) < 0 ? V.mul(best.n, -1) : best.n, best.overlap) : null;
    return { hit, axes, best, mtv };
  }
  SL.COL = { circleBox, sat };

  /* ================= 1) temel testler: daire–daire, kutu–kutu, daire–kutu ================= */
  D.shapes = function (root) {
    const W = 720, H = 330;
    let kind = 'cb', m = V.v(250, 150);
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      let hit = false, txt = '';
      if (kind === 'cc') {
        const B = { x: 430, y: 170, r: 62 }, A = { x: m.x, y: m.y, r: 40 }, d = Math.hypot(A.x - B.x, A.y - B.y); hit = d < A.r + B.r;
        ctx.fillStyle = hit ? 'rgba(230,60,80,0.25)' : (t.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'); [A, B].forEach(c => { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.fill(); ctx.strokeStyle = hit ? t.red : t.ink; ctx.lineWidth = 2; ctx.stroke(); });
        ctx.strokeStyle = t.purple; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        SL.drawLabel(ctx, `d = ${d.toFixed(0)}`, (A.x + B.x) / 2, (A.y + B.y) / 2 - 12, t.purple, { size: 12 });
        txt = `<b>Daire–daire:</b> merkezler arası uzaklık <b>d = ${d.toFixed(0)}</b>, yarıçaplar toplamı <b>${A.r} + ${B.r} = ${A.r + B.r}</b>. d &lt; toplam → çakışıyor. Kodda karekök almayın: <code>dx·dx + dy·dy &lt; (r1 + r2)²</code> (${Math.round(d * d)} ${hit ? '&lt;' : '≥'} ${(A.r + B.r) ** 2}).`;
      } else if (kind === 'bb') {
        const B = { x: 360, y: 110, w: 150, h: 110 }, A = { x: m.x - 55, y: m.y - 35, w: 110, h: 70 };
        const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x), oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y); hit = ox > 0 && oy > 0;
        [A, B].forEach(b => { ctx.fillStyle = hit ? 'rgba(230,60,80,0.22)' : (t.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'); ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = hit ? t.red : t.ink; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h); });
        // eksenlerdeki gölgeler
        const bar = (a0, a1, col, yy, horiz) => { ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); if (horiz) { ctx.moveTo(a0, yy); ctx.lineTo(a1, yy); } else { ctx.moveTo(yy, a0); ctx.lineTo(yy, a1); } ctx.stroke(); };
        bar(A.x, A.x + A.w, t.blue, H - 22, true); bar(B.x, B.x + B.w, t.amber, H - 12, true); bar(A.y, A.y + A.h, t.blue, 12, false); bar(B.y, B.y + B.h, t.amber, 22, false);
        SL.drawLabel(ctx, `x ekseninde ${ox > 0 ? 'ÖRTÜŞÜYOR (' + ox.toFixed(0) + ')' : 'AYRIK'}`, W / 2 + 120, H - 38, ox > 0 ? t.red : t.green, { size: 11 });
        SL.drawLabel(ctx, `y ekseninde ${oy > 0 ? 'ÖRTÜŞÜYOR (' + oy.toFixed(0) + ')' : 'AYRIK'}`, 100, 40, oy > 0 ? t.red : t.green, { size: 11 });
        txt = '<b>Kutu–kutu (AABB):</b> altta ve solda iki kutunun eksenlerdeki <b>gölgeleri</b> (mavi ve sarı çubuklar). Kutular ancak <b>iki eksende de</b> gölgeler örtüşüyorsa çakışır; tek bir eksende ayrıklarsa ayrıktırlar. Bu, birazdan göreceğimiz “ayıran eksen” fikrinin en basit hâli.';
      } else {
        const B = { x: 380, y: 120, w: 170, h: 100 }, A = { x: m.x, y: m.y, r: 42 }, px = clamp(A.x, B.x, B.x + B.w), py = clamp(A.y, B.y, B.y + B.h), d = Math.hypot(px - A.x, py - A.y); hit = d < A.r;
        ctx.fillStyle = hit ? 'rgba(230,60,80,0.22)' : (t.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'); ctx.fillRect(B.x, B.y, B.w, B.h); ctx.strokeStyle = hit ? t.red : t.ink; ctx.lineWidth = 2; ctx.strokeRect(B.x, B.y, B.w, B.h);
        ctx.beginPath(); ctx.arc(A.x, A.y, A.r, 0, 7); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = t.purple; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(px, py); ctx.stroke(); ctx.fillStyle = t.purple; ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill();
        SL.drawLabel(ctx, 'kutunun daireye en yakın noktası', px, py + 20, t.purple, { size: 11 });
        txt = `<b>Daire–kutu:</b> dairenin merkezini kutunun içine <b>kıstırın</b> (<code>clamp</code>): mor nokta, kutunun merkeze en yakın noktası. O noktaya uzaklık <b>${d.toFixed(0)}</b>, yarıçap <b>${A.r}</b> → ${hit ? 'çakışıyor' : 'çakışmıyor'}. Daireyi kutunun <b>köşesine</b> yaklaştırın: kutuları büyütüp test etmek köşede yanlış alarm verirdi; bu yöntem vermez.`;
      }
      SL.drawLabel(ctx, hit ? 'ÇAKIŞIYOR' : 'çakışmıyor', W - 80, 22, hit ? t.red : t.muted, { size: 15 });
      info.innerHTML = txt;
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousemove', e => { m = mp(e); draw(); });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Test: ', select({ cc: 'daire – daire', bb: 'kutu – kutu (AABB)', cb: 'daire – kutu' }, kind, v => { kind = v; draw(); })), el('span', { class: 'mini' }, 'Soldaki şekil fareyi izler.')), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= 2) ayıran eksen teoremi (SAT) ================= */
  D.sat = function (root) {
    const W = 720, H = 340;
    const baseA = [[-55, -30], [10, -52], [62, -8], [38, 46], [-40, 40]], baseB = [[-70, -45], [75, -30], [50, 55], [-55, 40]];
    let pA = V.v(210, 170), rot = 0.3, pick = -1, drag = false;
    const B = baseB.map(([x, y]) => V.v(470 + x, 160 + y));
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const polyA = () => baseA.map(([x, y]) => V.add(pA, V.rot(V.v(x, y), rot)));
    const path = P => { ctx.beginPath(); P.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); };
    let last = null;
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const A = polyA(), r = sat(A, B); last = r;
      const sepIdx = r.axes.findIndex(a => a.overlap <= 0), auto = sepIdx >= 0 ? sepIdx : r.axes.indexOf(r.best), k = pick >= 0 ? pick % r.axes.length : auto, ax = r.axes[k];
      path(A); ctx.fillStyle = r.hit ? 'rgba(230,60,80,0.22)' : 'rgba(79,140,255,0.16)'; ctx.fill(); ctx.strokeStyle = t.blue; ctx.lineWidth = 2.5; ctx.stroke();
      path(B); ctx.fillStyle = r.hit ? 'rgba(230,60,80,0.22)' : 'rgba(255,190,60,0.16)'; ctx.fill(); ctx.strokeStyle = t.amber; ctx.stroke();
      // seçili eksen: şekillerin altından geçen bir doğru üzerine gölgeler
      const n = ax.n, pp = V.perp(n), mid = V.v(W / 2, H / 2), off = (V.dot(mid, pp)) + (Math.abs(pp.y) > 0.5 ? (pp.y > 0 ? 1 : -1) : (pp.x > 0 ? 1 : -1)) * 150;
      const at = s => V.add(V.mul(n, s), V.mul(pp, off));
      const c0 = V.dot(mid, n), L0 = at(c0 - 420), L1 = at(c0 + 420);
      ctx.strokeStyle = t.rule; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(L0.x, L0.y); ctx.lineTo(L1.x, L1.y); ctx.stroke(); ctx.setLineDash([]);
      const shadow = (iv, col, P, w) => { const a = at(iv[0]), b = at(iv[1]); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 0.45; ctx.setLineDash([3, 4]); for (const s of iv) { const v = P.find(q => Math.abs(V.dot(q, n) - s) < 1e-6), e = at(s); ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.lineTo(e.x, e.y); ctx.stroke(); } ctx.setLineDash([]); ctx.globalAlpha = 1; };
      shadow(ax.a, t.blue, A, 9); shadow(ax.b, t.amber, B, 5);
      if (ax.overlap > 0) { const o0 = Math.max(ax.a[0], ax.b[0]), o1 = Math.min(ax.a[1], ax.b[1]), a = at(o0), b = at(o1); ctx.strokeStyle = t.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      if (r.hit && r.mtv) { const cA = A.reduce((s, p) => V.add(s, p), V.v()), c = V.mul(cA, 1 / A.length), e = V.add(c, r.mtv); ctx.strokeStyle = t.green; ctx.fillStyle = t.green; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.beginPath(); ctx.arc(e.x, e.y, 5, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'en kısa çıkış', e.x, e.y - 14, t.green, { size: 10 }); }
      // eksen listesi
      r.axes.forEach((a, i) => { const y = 16 + i * 17, sep = a.overlap <= 0; SL.drawLabel(ctx, `${i === k ? '▶' : ' '} eksen ${i + 1}: ${sep ? 'AYRIK (boşluk ' + (-a.overlap).toFixed(0) + ')' : 'örtüşme ' + a.overlap.toFixed(0)}${r.hit && a === r.best ? '  ← en küçük' : ''}`, W - 12, y, sep ? t.green : i === k ? t.ink : t.muted, { size: 10, align: 'right', bg: i === k }); });
      SL.drawLabel(ctx, r.hit ? 'ÇAKIŞIYOR: hiçbir eksende boşluk yok' : 'AYRIK: gölgelerin örtüşmediği bir eksen var', 12, 16, r.hit ? t.red : t.green, { size: 13, align: 'left' });
      info.innerHTML = `Mavi şekli <b>sürükleyin</b>, kaydırıcıyla <b>döndürün</b>. Kesikli doğru seçili <b>eksen</b>; üzerindeki kalın mavi ve sarı çizgiler iki şeklin o eksendeki <b>gölgeleri</b> (izdüşümleri). ` + (r.hit ? `Gölgeler <b>bütün</b> eksenlerde örtüşüyor (kırmızı kısım) → çakışma var. En küçük örtüşmeli eksen boyunca <b>${r.best.overlap.toFixed(0)}</b> piksel iterseniz ayrılırlar (yeşil ok): “↔ ayır”.` : `Gölgelerin örtüşmediği <b>tek bir eksen</b> bulmak yeter: şekiller ayrıktır. Sınanan eksenler: her kenarın dikmesi (${r.axes.length} eksen).`);
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousedown', e => { drag = true; pA = mp(e); draw(); }); C.addEventListener('mousemove', e => { if (drag) { const p = mp(e); pA = V.v(clamp(p.x, 40, W - 40), clamp(p.y, 40, H - 40)); draw(); } });
    window.addEventListener('mouseup', () => { drag = false; });
    C.style.cursor = 'grab';
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('mavi şekli döndür', 0, 6.28, rot, 0.02, v => { rot = v; draw(); }), btn('eksen: sıradaki ▶', () => { pick = (pick < 0 ? 0 : pick + 1); draw(); }), btn('eksen: otomatik', () => { pick = -1; draw(); }),
      btn('↔ ayır (en kısa çıkış)', () => { if (last && last.hit) { pA = V.add(pA, V.mul(last.mtv, 1.02)); draw(); } }), btn('↺', () => { pA = V.v(210, 170); rot = 0.3; pick = -1; draw(); })), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= 3) platform: tespit yetmez, çözmek gerek ================= */
  const MAP = ['..............................', '..............................', '..............................', '.............o................', '...........#####..........o...', '..............................', '......###..............####...', '..............................', '....o.......................o.', '###################...########', '###################...########'];
  function makePlatform(o = {}) {
    const TS = 24, GW = MAP[0].length, GH = MAP.length, W = GW * TS, H = GH * TS;
    const st = { mode: 'axis', ccd: false, keys: {}, sound: !!o.sound };
    const solids = [], coins0 = [];
    MAP.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') solids.push({ x: x * TS, y: y * TS, w: TS, h: TS }); if (ch === 'o') coins0.push({ x: x * TS + TS / 2, y: y * TS + TS / 2 }); }));
    solids.push({ x: 15 * TS + 9, y: 5 * TS, w: 6, h: 4 * TS, thin: true });   // ince duvar: tünelleme deneyi
    const reset = () => { st.p = { x: 40, y: 150, w: 16, h: 22, vx: 0, vy: 0, ground: false, dash: 0, face: 1 }; st.coins = coins0.map(c => ({ ...c })); st.got = 0; st.tunnels = 0; st.falls = 0; st.msg = ''; };
    reset(); st.reset = reset; st.W = W; st.H = H; st.solids = solids;
    const hitAny = p => solids.find(s => p.x < s.x + s.w && s.x < p.x + p.w && p.y < s.y + s.h && s.y < p.y + p.h);
    const moveAxis = (p, dx, dy) => {   // eksen eksen: önce x, çöz; sonra y, çöz
      p.x += dx; let s = hitAny(p); if (s) { if (dx > 0) p.x = s.x - p.w; else if (dx < 0) p.x = s.x + s.w; p.vx = 0; p.dash = 0; }
      p.y += dy; s = hitAny(p); if (s) { if (dy > 0) { p.y = s.y - p.h; p.ground = true; } else if (dy < 0) p.y = s.y + s.h; p.vy = 0; }
    };
    st.step = dt => {
      const p = st.p, k = st.keys;
      const ax = (k.d ? 1 : 0) - (k.a ? 1 : 0); if (ax) p.face = ax;
      if (p.dash > 0) { p.dash -= dt; p.vx = p.face * 6000; p.vy = 0; } else { p.vx = ax * 150; p.vy += 900 * dt; }
      if (k.w && p.ground) { p.vy = -380; p.ground = false; }
      if (k.x && p.dash <= 0 && !st.dashLock) { p.dash = 0.05; st.dashLock = true; if (st.sound) SL.sfx('shot'); }
      if (!k.x) st.dashLock = false;
      const dx = p.vx * dt, dy = p.vy * dt, wasLeft = p.x + p.w <= 15 * TS + 9, wasRight = p.x >= 15 * TS + 15;
      if (st.mode === 'none') { p.x += dx; p.y += dy; }
      else if (st.mode === 'stop') { const ox = p.x, oy = p.y; p.x += dx; p.y += dy; if (hitAny(p)) { p.x = ox; p.y = oy; p.vy = 0; p.ground = true; } }
      else { p.ground = false; const n = st.ccd ? Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4)) : 1; for (let i = 0; i < n; i++) moveAxis(p, dx / n, dy / n); }
      if ((wasLeft && p.x >= 15 * TS + 15 || wasRight && p.x + p.w <= 15 * TS + 9) && p.y + p.h > 5 * TS && p.y < 9 * TS) { st.tunnels++; st.msg = 'DUVARIN İÇİNDEN GEÇTİ! (tünelleme)'; st.msgT = 2; }
      p.x = clamp(p.x, 0, W - p.w);
      if (p.y > H + 40) { st.falls++; p.x = 40; p.y = 150; p.vy = 0; st.msg = 'zeminden düştü'; st.msgT = 1.5; }
      st.coins = st.coins.filter(c => { const hit = circleBox(c.x, c.y, 7, p.x, p.y, p.w, p.h); if (hit) { st.got++; if (st.sound) SL.sfx('waka'); } return !hit; });
      if (st.msgT > 0) st.msgT -= dt; else st.msg = '';
    };
    st.draw = (ctx, t) => {
      ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      solids.forEach(s => { ctx.fillStyle = s.thin ? t.purple : (t.dark ? '#4a4f63' : '#5b6078'); ctx.fillRect(s.x, s.y, s.w, s.h); });
      SL.drawLabel(ctx, 'ince duvar', 15 * TS + 12, 5 * TS - 10, t.purple, { size: 10 });
      st.coins.forEach(c => { ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, 7); ctx.fill(); });
      const p = st.p; ctx.fillStyle = p.dash > 0 ? t.red : t.green; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(p.x, p.y, p.w, p.h);
      SL.drawLabel(ctx, `altın ${st.got}/${coins0.length} · tünelleme ${st.tunnels} · düşme ${st.falls}`, 8, 12, t.ink, { size: 11, align: 'left' });
      if (st.msg) SL.drawLabel(ctx, st.msg, W / 2, 34, t.red, { size: 14 });
    };
    return st;
  }
  SL.makePlatform = makePlatform;
  D.platform = function (root) {
    const g = makePlatform({ sound: true }), W = g.W, H = g.H; SL._platform = g;
    let timer = null, focus = false;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const TXT = { none: '<b>Çarpışma yok:</b> karakter yerçekimiyle düşer ve zeminin içinden geçer. Tespit bile yok.', stop: '<b>Yalnızca tespit:</b> çakışma olursa hareketi <b>iptal et</b>. Zeminden düşmüyor ama duvara ya da zemine değince <b>yapışıyor</b>: yürürken zıplayamıyor, duvar boyunca kayamıyor. Tespit etmek yetmez; <b>çözmek</b> gerek.', axis: '<b>Eksen eksen çözüm:</b> önce yalnızca x’te ilerle; çakıştıysa duvarın kenarına yasla. Sonra yalnızca y’de ilerle; çakıştıysa zemine/tavana yasla. Duvar boyunca kayma ve zeminde yürüme kendiliğinden çalışır. Platform oyunlarının standart yöntemi.' };
    const draw = () => { g.draw(ctx, T()); info.innerHTML = TXT[g.mode] + ` <b>X ile atılın</b> (karede 100 piksel; mor duvar yalnızca 6 piksel): ${g.ccd ? 'alt adımlar açık, duvar <b>her seferinde</b> durduruyor.' : 'karakter çoğu denemede duvarı <b>atlıyor</b>; ara sıra tam denk gelip duruyor (bu hatayı sinsi yapan da bu). “sürekli tespit”i açıp tekrar deneyin.'}`; };
    const loop = () => { g.step(1 / 60); draw(); };
    const start = () => { if (!timer) timer = setInterval(loop, 1000 / 60); }, stop = () => { if (timer) { clearInterval(timer); timer = null; } g.keys = {}; };
    const key = (e, down) => { if (!timer) return; const k = e.key.toLowerCase(); if (!['a', 'd', 'w', 'x'].includes(k) || e.ctrlKey || e.metaKey || e.altKey) return; if (e.target && e.target.closest && e.target.closest('.CodeMirror, input, textarea, select')) return; g.keys[k] = down; e.preventDefault(); e.stopImmediatePropagation(); };
    window.addEventListener('keydown', e => key(e, true), true); window.addEventListener('keyup', e => key(e, false), true);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Çarpışma: ', select({ none: '1) yok', stop: '2) yalnızca tespit (iptal et)', axis: '3) eksen eksen çözüm' }, g.mode, v => { g.mode = v; g.reset(); })),
      el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { g.ccd = e.target.checked; } }); return x; })(), ' sürekli tespit (alt adımlar)'),
      btn('↺ baştan', () => g.reset()), el('span', { class: 'mini' }, 'A / D: yürü · W: zıpla · X: atıl')), C, info);
    draw(); SL.onTheme(draw);
    return { start, stop };
  };

  /* ---------- simlab: daire–kutu ---------- */
  SL.SIMLABS.circbox = function (box, api) {
    const W = 520, H = 300;
    const BOX = [[60, 40, 90, 60], [220, 30, 60, 110], [360, 60, 110, 50], [80, 180, 120, 70], [270, 190, 70, 70], [400, 170, 80, 100]];
    let fn = null, tt = 0;
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt) { tt += dt; },
      render(ctx, w, t) {
        const c = [W / 2 + Math.cos(tt * 0.7) * 200, H / 2 + Math.sin(tt * 1.1) * 110, 34];
        BOX.forEach(b => { const want = circleBox(c[0], c[1], c[2], b[0], b[1], b[2], b[3]); let got = null; if (fn) { try { got = !!fn(c.slice(), b.slice()); } catch (e) { got = null; } } ctx.fillStyle = got ? 'rgba(230,60,80,0.45)' : (t.dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'); ctx.fillRect(b[0], b[1], b[2], b[3]); ctx.strokeStyle = got !== null && got !== want ? t.amber : t.ink; ctx.lineWidth = got !== null && got !== want ? 4 : 1.5; ctx.strokeRect(b[0], b[1], b[2], b[3]); if (got !== null && got !== want) SL.drawLabel(ctx, 'YANLIŞ', b[0] + b[2] / 2, b[1] + b[3] / 2, t.amber, { size: 11 }); });
        ctx.strokeStyle = t.blue; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, 7); ctx.stroke();
        SL.drawLabel(ctx, fn ? 'kırmızı: “çakışıyor” dediğiniz kutular · kalın sarı çerçeve: yanlış cevap' : 'Kodu çalıştırın', 8, H - 10, t.muted, { size: 10, align: 'left' });
      },
      reset() { tt = 0; }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w,
      setFns(f) { fn = f.circleBoxOverlap; w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try {
          const r = RNG(12);
          const cs = [[[50, 50, 10], [100, 0, 50, 100]], [[95, 50, 10], [100, 0, 50, 100]], [[92, -6, 10], [100, 0, 50, 100]], [[94, -4, 10], [100, 0, 50, 100]], [[125, 50, 5], [100, 0, 50, 100]], [[125, 120, 25], [100, 0, 50, 100]]];
          for (let i = 0; i < 300; i++) cs.push([[Math.round(r() * 300), Math.round(r() * 300), 5 + Math.round(r() * 40)], [Math.round(r() * 200), Math.round(r() * 200), 20 + Math.round(r() * 100), 20 + Math.round(r() * 100)]]);
          for (const [c, b] of cs) { const d = Math.hypot(clamp(c[0], b[0], b[0] + b[2]) - c[0], clamp(c[1], b[1], b[1] + b[3]) - c[1]); if (Math.abs(d - c[2]) < 0.01) continue; const got = !!mod.circleBoxOverlap(c.slice(), b.slice()), want = circleBox(c[0], c[1], c[2], b[0], b[1], b[2], b[3]); if (got !== want) return { ok: false, msg: `❌ daire [x, y, r] = [${c}], kutu [x, y, w, h] = [${b}] → ${got}, beklenen ${want}. Kutunun daireye en yakın noktası (${clamp(c[0], b[0], b[0] + b[2])}, ${clamp(c[1], b[1], b[1] + b[3])}); merkeze uzaklığı ${d.toFixed(1)}, yarıçap ${c[2]}.` }; }
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Köşe durumları dahil hepsi doğru. Sağda daire kutuların arasında dolaşıyor; sarı çerçeve yok.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  SL.AILABS.circles = {
    fn: 'circles_overlap', jsFn: 'circlesOverlap',
    ref: (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 < (a[2] + b[2]) ** 2,
    cases: () => { const cs = [[[0, 0, 5], [8, 0, 5]], [[0, 0, 5], [12, 0, 5]], [[0, 0, 5], [10, 0, 5]], [[0, 0, 2], [3, 4, 2]], [[0, 0, 2], [3, 4, 4]], [[5, 5, 10], [6, 6, 1]], [[0, 0, 1], [0, 30, 28]]]; for (let i = 0; i < 15; i++) cs.push([[ri(0, 40), ri(0, 40), ri(1, 12)], [ri(0, 40), ri(0, 40), ri(1, 12)]]); return cs; },
    show: (a, b) => `A = [x, y, r] = ${JSON.stringify(a)}, B = ${JSON.stringify(b)}`,
    hint: (a, b) => `İki yarıçapın TOPLAMI ile karşılaştırın: dx² + dy² < (r1 + r2)². Burada ${(a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2} ile ${(a[2] + b[2]) ** 2}. Yalnızca değen (eşit) daireler çakışmış sayılmaz.`
  };
  SL.AILABS.closest = {
    fn: 'closest_point', jsFn: 'closestPoint',
    ref: (p, b) => [clamp(p[0], b[0], b[0] + b[2]), clamp(p[1], b[1], b[1] + b[3])],
    cases: () => { const B = [10, 20, 40, 30], cs = [[[0, 0], B], [[30, 0], B], [[100, 100], B], [[25, 35], B], [[0, 30], B], [[60, 60], B], [[10, 20], B], [[49, 80], B]]; for (let i = 0; i < 10; i++) cs.push([[ri(-20, 90), ri(-20, 90)], [ri(0, 30), ri(0, 30), ri(10, 40), ri(10, 40)]]); return cs; },
    show: (p, b) => `nokta ${JSON.stringify(p)}, kutu [x, y, w, h] = ${JSON.stringify(b)}`,
    hint: () => 'Her ekseni ayrı ayrı kıstırın: x → min(max(p.x, kutu.sol), kutu.sağ), y → min(max(p.y, kutu.üst), kutu.alt). Nokta kutunun içindeyse kendisi döner.'
  };
  SL.AILABS.project = {
    fn: 'project', jsFn: 'project', tol: 1e-9,
    ref: (P, n) => { const s = P.map(p => p[0] * n[0] + p[1] * n[1]); return [Math.min(...s), Math.max(...s)]; },
    cases: () => { const sq = [[0, 0], [4, 0], [4, 4], [0, 4]], tri = [[1, 1], [5, 2], [3, 6]]; return [[sq, [1, 0]], [sq, [0, 1]], [sq, [0.6, 0.8]], [tri, [1, 0]], [tri, [0, 1]], [tri, [-0.6, 0.8]], [tri, [0.8, -0.6]], [[[2, 3]], [0.6, 0.8]], [[[-3, 1], [2, -4], [5, 5], [-1, 6]], [0.28, 0.96]]]; },
    show: (P, n) => `çokgen ${JSON.stringify(P)}, eksen ${JSON.stringify(n)}`,
    hint: () => 'Her köşe için nokta çarpım: p.x·n.x + p.y·n.y. Bu sayıların en küçüğü ve en büyüğü gölgenin iki ucu: [min, max].'
  };
  SL.AILABS.overlap1 = {
    fn: 'overlap', jsFn: 'overlap', tol: 1e-9,
    ref: (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)),
    cases: () => { const cs = [[0, 5, 3, 9], [0, 5, 5, 9], [0, 5, 7, 9], [3, 9, 0, 5], [0, 10, 2, 4], [2, 4, 0, 10], [-5, -1, -3, 2], [1, 1, 0, 2]]; for (let i = 0; i < 10; i++) { const a = ri(-10, 10), b = ri(-10, 10); cs.push([a, a + ri(0, 9), b, b + ri(0, 9)]); } return cs; },
    show: (a0, a1, b0, b1) => `A gölgesi [${a0}, ${a1}], B gölgesi [${b0}, ${b1}]`,
    hint: () => 'Ortak kısım: başlangıcı iki başlangıcın BÜYÜĞÜ, bitişi iki bitişin KÜÇÜĞÜ. Uzunluk = min(aMax, bMax) − max(aMin, bMin). Eksi çıkarsa gölgeler ayrık: 0 döndür.'
  };

  /* ---------- başlık ---------- */
  D.titlegeo3 = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H), r = RNG(6);
    const sh = Array.from({ length: 7 }, (_, i) => ({ p: V.v(720 + r() * 500, 40 + r() * 150), v: V.v((r() - 0.5) * 2.4, (r() - 0.5) * 2), a: r() * 6, w: (r() - 0.5) * 0.03, n: 3 + (i % 4), R: 26 + r() * 20 }));
    const poly = s => Array.from({ length: s.n }, (_, k) => V.add(s.p, V.fromAngle(s.a + (k / s.n) * Math.PI * 2, s.R)));
    let timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); const P = sh.map(poly), hit = sh.map(() => false);
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) if (sat(P[i], P[j]).hit) hit[i] = hit[j] = true;
      P.forEach((q, i) => { ctx.beginPath(); q.forEach((v, k) => (k ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y))); ctx.closePath(); ctx.fillStyle = hit[i] ? 'rgba(255,110,130,0.35)' : 'rgba(122,215,255,0.12)'; ctx.fill(); ctx.strokeStyle = hit[i] ? '#ff7a8a' : '#7ad7ff'; ctx.lineWidth = 2; ctx.stroke(); });
    };
    const tick = () => { if (!running) return; sh.forEach(s => { s.p = V.add(s.p, s.v); s.a += s.w; if (s.p.x < 700 || s.p.x > 1240) s.v.x *= -1; if (s.p.y < 30 || s.p.y > 200) s.v.y *= -1; }); draw(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
