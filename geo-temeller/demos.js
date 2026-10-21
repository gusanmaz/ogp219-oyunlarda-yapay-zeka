/* "Geometri Temelleri" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const RNG = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* ---------- ortak geometri ---------- */
  const cross3 = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const onSeg = (a, b, p) => Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y);
  const segHit = (a, b, c, d) => {
    const d1 = cross3(a, b, c), d2 = cross3(a, b, d), d3 = cross3(c, d, a), d4 = cross3(c, d, b);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    return (d1 === 0 && onSeg(a, b, c)) || (d2 === 0 && onSeg(a, b, d)) || (d3 === 0 && onSeg(c, d, a)) || (d4 === 0 && onSeg(c, d, b));
  };
  const inPoly = (p, poly) => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < a.x + ((p.y - a.y) * (b.x - a.x)) / (b.y - a.y)) inside = !inside; } return inside; };
  SL.GEO = { cross3, segHit, inPoly };

  // sürüklenebilir noktalar: en yakın noktayı tut, bırakana kadar taşı
  function draggable(C, W, H, pts, redraw, pad = 14) {
    let cur = null;
    const pos = e => { const b = C.getBoundingClientRect(); return V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height); };
    C.addEventListener('mousedown', e => { const p = pos(e); let best = 22, bi = null; pts().forEach(q => { const d = V.dist(p, q); if (d < best) { best = d; bi = q; } }); cur = bi; });
    C.addEventListener('mousemove', e => { if (!cur) return; const p = pos(e); cur.x = SL.clamp(p.x, pad, W - pad); cur.y = SL.clamp(p.y, pad, H - pad); redraw(); });
    window.addEventListener('mouseup', () => { cur = null; });
    C.style.cursor = 'grab';
    return pos;
  }
  const dot = (ctx, p, col, r = 7, label, t) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); if (label) SL.drawLabel(ctx, label, p.x, p.y - 17, col, { size: 13 }); };
  const arrow = (ctx, a, b, col, w = 3) => { ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); const d = V.norm(V.sub(b, a)), n = V.perp(d), tip = b, base = V.sub(b, V.mul(d, 13)); ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(base.x + n.x * 6, base.y + n.y * 6); ctx.lineTo(base.x - n.x * 6, base.y - n.y * 6); ctx.closePath(); ctx.fill(); };

  /* ================= 1) yön testi ================= */
  D.orient = function (root) {
    const W = 720, H = 340;
    const A = V.v(180, 250), B = V.v(470, 150), Cp = V.v(330, 90);
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%';
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const d = V.norm(V.sub(B, A)), far = 1200, P0 = V.sub(A, V.mul(d, far)), P1 = V.add(A, V.mul(d, far)), n = V.perp(d);
      // iki yarı düzlem: çapraz > 0 tarafı ve < 0 tarafı
      [[1, t.dark ? 'rgba(79,140,255,0.13)' : 'rgba(79,140,255,0.10)'], [-1, t.dark ? 'rgba(255,170,60,0.13)' : 'rgba(255,170,60,0.12)']].forEach(([s, col]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(P0.x, P0.y); ctx.lineTo(P1.x, P1.y); ctx.lineTo(P1.x + n.x * far * s, P1.y + n.y * far * s); ctx.lineTo(P0.x + n.x * far * s, P0.y + n.y * far * s); ctx.closePath(); ctx.fill(); });
      ctx.strokeStyle = t.rule; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(P0.x, P0.y); ctx.lineTo(P1.x, P1.y); ctx.stroke(); ctx.setLineDash([]);
      const cr = cross3(A, B, Cp), near = Math.abs(cr) < 900;
      arrow(ctx, A, B, t.ink, 3.5);
      ctx.strokeStyle = near ? t.muted : cr > 0 ? t.blue : t.amber; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(Cp.x, Cp.y); ctx.stroke(); ctx.setLineDash([]);
      dot(ctx, A, t.ink, 7, 'A'); dot(ctx, B, t.ink, 7, 'B'); dot(ctx, Cp, near ? t.muted : cr > 0 ? t.blue : t.amber, 9, 'C');
      SL.drawLabel(ctx, 'çapraz > 0  (ekranda: A→B’ye bakınca SAĞ)', 12, H - 14, t.blue, { size: 11, align: 'left' });
      SL.drawLabel(ctx, 'çapraz < 0  (ekranda: SOL)', W - 12, 16, t.amber, { size: 11, align: 'right' });
      const f = x => Math.round(x);
      info.innerHTML = `<code>çapraz = (B.x − A.x)·(C.y − A.y) − (B.y − A.y)·(C.x − A.x) = (${f(B.x - A.x)})·(${f(Cp.y - A.y)}) − (${f(B.y - A.y)})·(${f(Cp.x - A.x)}) = <b>${f(cr)}</b></code> → ` +
        (near ? '<b>neredeyse doğrusal</b>: üç nokta aynı doğru üzerinde sayılır (küçük bir eşik payı bırakıyoruz).' : cr > 0 ? 'C, A→B yönüne göre <b class="c-blue">sağda</b>: A→B→C saat yönünde döner.' : 'C, A→B yönüne göre <b class="c-amber">solda</b>: A→B→C saat yönünün tersine döner.') +
        ' <span class="mini">Sayının büyüklüğü = ABC üçgeninin alanının 2 katı.</span>';
    };
    draggable(C, W, H, () => [Cp, A, B], draw);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('span', { class: 'mini' }, 'A, B ve C noktalarını fareyle sürükleyin.')), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= 2) iki doğru parçası kesişiyor mu? ================= */
  D.segint = function (root) {
    const W = 720, H = 330;
    const P = { A: V.v(110, 250), B: V.v(430, 90), C: V.v(150, 100), D: V.v(420, 270) };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%';
    const sgn = x => (Math.abs(x) < 400 ? '0' : x > 0 ? '+' : '−');
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const { A, B, C: Cc, D: Dd } = P, hit = segHit(A, B, Cc, Dd);
      ctx.lineCap = 'round';
      ctx.strokeStyle = t.blue; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      ctx.strokeStyle = t.amber; ctx.beginPath(); ctx.moveTo(Cc.x, Cc.y); ctx.lineTo(Dd.x, Dd.y); ctx.stroke();
      // kesişim noktası: A + t·(B − A)
      const r = V.sub(B, A), s = V.sub(Dd, Cc), den = V.cross(r, s);
      let tt = null; if (Math.abs(den) > 1e-9) { tt = V.cross(V.sub(Cc, A), s) / den; }
      if (hit && tt !== null) { const X = V.add(A, V.mul(r, tt)); ctx.strokeStyle = t.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X.x, X.y, 12, 0, 7); ctx.stroke(); SL.drawLabel(ctx, `kesişim: t = ${tt.toFixed(2)}`, X.x, X.y + 26, t.red, { size: 11 }); }
      dot(ctx, A, t.blue, 7, 'A'); dot(ctx, B, t.blue, 7, 'B'); dot(ctx, Cc, t.amber, 7, 'C'); dot(ctx, Dd, t.amber, 7, 'D');
      const o = [cross3(A, B, Cc), cross3(A, B, Dd), cross3(Cc, Dd, A), cross3(Cc, Dd, B)].map(sgn);
      const rows = [['AB’ye göre C', o[0]], ['AB’ye göre D', o[1]], ['CD’ye göre A', o[2]], ['CD’ye göre B', o[3]]];
      const bx = 500, by = 28; SL.drawLabel(ctx, 'dört yön testi (çaprazın işareti)', bx, by - 12, t.muted, { size: 11, align: 'left' });
      rows.forEach(([n, v], i) => { SL.drawLabel(ctx, n, bx, by + 14 + i * 24, t.ink, { size: 12, align: 'left', bg: false }); SL.drawLabel(ctx, v, bx + 170, by + 14 + i * 24, v === '+' ? t.blue : v === '−' ? t.amber : t.muted, { size: 18, bg: false }); });
      const ok1 = o[0] !== o[1] && o[0] !== '0' && o[1] !== '0', ok2 = o[2] !== o[3] && o[2] !== '0' && o[3] !== '0';
      SL.drawLabel(ctx, `C ve D, AB’nin ${ok1 ? 'FARKLI' : 'aynı'} tarafında ${ok1 ? '✔' : '✘'}`, bx, by + 124, ok1 ? t.green : t.red, { size: 11, align: 'left' });
      SL.drawLabel(ctx, `A ve B, CD’nin ${ok2 ? 'FARKLI' : 'aynı'} tarafında ${ok2 ? '✔' : '✘'}`, bx, by + 146, ok2 ? t.green : t.red, { size: 11, align: 'left' });
      SL.drawLabel(ctx, hit ? 'KESİŞİYOR' : 'kesişmiyor', bx + 90, by + 190, hit ? t.red : t.muted, { size: 18 });
      info.innerHTML = 'İki parça ancak <b>ikisi de birbirini ikiye ayırıyorsa</b> kesişir: C ile D, AB doğrusunun farklı taraflarında <b>ve</b> A ile B, CD doğrusunun farklı taraflarında. Dört çarpma-çıkarma; bölme yok, açı yok. Kesişim <i>noktası</i> gerekirse: <code>A + t·(B − A)</code>, <code>t = ((C − A) × (D − C)) / ((B − A) × (D − C))</code>. Mermi için: <code>t</code> = “yolun yüzde kaçında çarptı?”';
    };
    draggable(C, W, H, () => Object.values(P), draw);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('span', { class: 'mini' }, 'Uçları sürükleyin: mavi AB (mermi yolu), sarı CD (duvar).'), btn('⇄ paralel yap', () => { const r = V.sub(P.B, P.A); P.D = V.add(P.C, r); P.D.x = SL.clamp(P.D.x, 14, W - 14); P.D.y = SL.clamp(P.D.y, 14, H - 14); draw(); })), C, info);
    draw(); SL.onTheme(draw);
  };


  /* ================= 2b) DOOM usulü isabet: bütün kesişimleri bul, en küçük t'den başla ================= */
  D.raysort = function (root) {
    const W = 720, H = 330;
    const walls = [[V.v(250, 40), V.v(250, 200)], [V.v(360, 110), V.v(360, 200)], [V.v(470, 30), V.v(560, 150)], [V.v(600, 180), V.v(640, 320)], [V.v(160, 250), V.v(330, 300)]];
    const mons = [{ p: V.v(310, 150), r: 16, name: 'imp' }, { p: V.v(430, 215), r: 18, name: 'şeytan' }, { p: V.v(545, 240), r: 16, name: 'asker' }];
    const O = V.v(70, 190); let aim = V.v(660, 215), pierce = false;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%';
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const B = V.add(O, V.setLen(V.sub(aim, O), 760)), r = V.sub(B, O), hits = [];
      walls.forEach((w, i) => { const s = V.sub(w[1], w[0]), den = V.cross(r, s); if (Math.abs(den) < 1e-9) return; const tt = V.cross(V.sub(w[0], O), s) / den, u = V.cross(V.sub(w[0], O), r) / den; if (tt >= 0 && tt <= 1 && u >= 0 && u <= 1) hits.push({ t: tt, kind: 'duvar', i }); });
      mons.forEach((m, i) => { const d = V.norm(r), L = V.len(r), mo = V.sub(O, m.p), b = V.dot(mo, d), k = V.dot(mo, mo) - m.r * m.r, disc = b * b - k; if (disc < 0) return; const dist = -b - Math.sqrt(disc); if (dist >= 0 && dist <= L) hits.push({ t: dist / L, kind: m.name, i, mon: true }); });
      hits.sort((a, b) => a.t - b.t);
      const firstStop = hits.findIndex(h => !h.mon || !pierce), stopIdx = firstStop >= 0 ? firstStop : hits.length, stopT = firstStop >= 0 ? hits[firstStop].t : 1;   // durduran yoksa hepsi geçildi
      walls.forEach((w, i) => { const hit = hits.find((h, k) => !h.mon && h.i === i && k <= stopIdx); ctx.strokeStyle = hit ? t.red : (t.dark ? '#8a90ad' : '#4a4f63'); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(w[0].x, w[0].y); ctx.lineTo(w[1].x, w[1].y); ctx.stroke(); });
      mons.forEach((m, i) => { const k = hits.findIndex(h => h.mon && h.i === i), hit = k >= 0 && k <= stopIdx; ctx.fillStyle = hit ? t.red : t.purple; ctx.beginPath(); ctx.arc(m.p.x, m.p.y, m.r, 0, 7); ctx.fill(); SL.drawLabel(ctx, m.name, m.p.x, m.p.y + m.r + 11, hit ? t.red : t.muted, { size: 10 }); });
      const E = V.add(O, V.mul(r, stopT));
      ctx.strokeStyle = t.amber; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(E.x, E.y); ctx.stroke();
      ctx.strokeStyle = t.rule; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(E.x, E.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.setLineDash([]);
      hits.forEach((h, k) => { const q = V.add(O, V.mul(r, h.t)), done = k <= stopIdx; ctx.fillStyle = done ? t.ink : t.muted; ctx.globalAlpha = done ? 1 : 0.5; ctx.beginPath(); ctx.arc(q.x, q.y, 9, 0, 7); ctx.fill(); ctx.fillStyle = t.card; ctx.font = 'bold 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(k + 1), q.x, q.y + 0.5); ctx.globalAlpha = 1; });
      ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(O.x, O.y, 10, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'oyuncu', O.x, O.y + 22, t.green, { size: 10 });
      SL.drawLabel(ctx, 'kesişim listesi (t’ye göre sıralı)', W - 12, 14, t.muted, { size: 10, align: 'right' });
      hits.forEach((h, k) => SL.drawLabel(ctx, `${k + 1}. t = ${h.t.toFixed(2)}  ${h.kind}${k === stopIdx ? '  ← DURDU' : k < stopIdx ? '  ✔ vuruldu' : '  (ulaşmadı)'}`, W - 12, 32 + k * 16, k === stopIdx ? t.red : k < stopIdx ? t.ink : t.muted, { size: 10, align: 'right', bg: k === stopIdx }));
      info.innerHTML = 'Mermi yolu oyuncudan nişan yönüne tek bir doğru parçası. Yol üzerindeki <b>her</b> duvar ve canavar için kesişim parametresi <b>t</b> hesaplanır; sonra <b>en küçük t’den</b> başlanır: ilk engelde mermi durur, arkadakiler “ulaşmadı” olarak kalır. DOOM’un tabancası ve pompalısı tam olarak böyle çalışır. ' + (pierce ? '“Delici mermi” açık: canavarlardan geçer, ilk <b>duvarda</b> durur (DOOM’da bir mermi tek hedefte durur; delme sonraki oyunların eklentisi).' : 'Fareyle nişan alın.');
    };
    C.addEventListener('mousemove', e => { const b = C.getBoundingClientRect(); aim = V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height); draw(); });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('span', { class: 'mini' }, 'Fare: nişan al.'), el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { pierce = e.target.checked; draw(); } }); return x; })(), ' delici mermi (canavarlardan geçer)')), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= 3) nokta çokgenin içinde mi? ================= */
  D.pip = function (root) {
    const W = 720, H = 340;
    const poly = [[120, 90], [300, 50], [380, 150], [520, 70], [600, 250], [430, 300], [340, 220], [200, 300], [90, 220], [210, 170]].map(([x, y]) => V.v(x, y));
    let p = V.v(330, 130), follow = true;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%';
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const hits = [];
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y)) { const x = a.x + ((p.y - a.y) * (b.x - a.x)) / (b.y - a.y); if (x > p.x) hits.push(x); } }
      const inside = hits.length % 2 === 1;
      ctx.fillStyle = inside ? (t.dark ? 'rgba(46,170,90,0.28)' : 'rgba(46,170,90,0.20)') : (t.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)');
      ctx.beginPath(); poly.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.fill(); ctx.strokeStyle = t.ink; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = t.purple; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(W, p.y); ctx.stroke(); ctx.setLineDash([]);
      hits.sort((a, b) => a - b).forEach((x, k) => { ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(x, p.y, 6, 0, 7); ctx.fill(); SL.drawLabel(ctx, String(k + 1), x, p.y - 15, t.red, { size: 12 }); });
      poly.forEach(q => { ctx.fillStyle = t.ink; ctx.beginPath(); ctx.arc(q.x, q.y, 4, 0, 7); ctx.fill(); });
      dot(ctx, p, inside ? t.green : t.muted, 9);
      SL.drawLabel(ctx, `${hits.length} kesişim → ${hits.length % 2 ? 'TEK → İÇERİDE' : 'ÇİFT → DIŞARIDA'}`, W / 2, H - 14, inside ? t.green : t.ink, { size: 14 });
      info.innerHTML = 'Noktadan sağa doğru sonsuz bir <b>ışın</b> gönderin ve çokgenin kenarlarını kaç kez kestiğini sayın. <b>Tek</b> sayıysa içeridesiniz, <b>çift</b> ise dışarıdasınız: sınırı her geçişinizde iç ↔ dış değişir. Çokgen içbükey olsa da çalışır. ' + (follow ? 'Nokta fareyi izliyor; <b>tıklayınca sabitlenir</b> (yine tıklayın: izler). Köşeleri sürüklemek için önce noktayı sabitleyin.' : 'Nokta sabit. Köşeleri sürükleyip şekli bozun; boş yere tıklayınca nokta yine fareyi izler.');
    };
    let grabbed = false;
    const pos = draggable(C, W, H, () => (follow ? [] : poly), draw);
    C.addEventListener('mousemove', e => { if (follow) { p = pos(e); draw(); } });
    C.addEventListener('mousedown', e => { const q = pos(e); grabbed = !follow && poly.some(v => V.dist(v, q) < 22); if (!grabbed) { follow = !follow; if (follow) p = q; draw(); } });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('span', { class: 'mini' }, 'Fareyi şeklin üzerinde gezdirin. Tıkla: noktayı sabitle / serbest bırak.')), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= 4) dışbükey zarf: monoton zincir, adım adım ================= */
  function hullSteps(pts) {
    const P = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y), steps = [];
    const run = (order, pass, base) => {
      const st = [];
      for (const p of order) {
        while (st.length >= 2 && cross3(st[st.length - 2], st[st.length - 1], p) <= 0) {
          steps.push({ pass, base: base.slice(), st: st.slice(), p, pop: true, msg: `<b>${pass}. tur.</b> Sıradaki nokta (sarı) için son iki noktaya bakıyorum: yol <b>içe doğru</b> kıvrılıyor. Ortadaki nokta (kırmızı) zarfta olamaz → <b>yığından at</b>.` });
          st.pop();
        }
        st.push(p);
        steps.push({ pass, base: base.slice(), st: st.slice(), p, pop: false, msg: `<b>${pass}. tur.</b> Dönüş doğru yönde (ya da yığında henüz 2 nokta yok) → noktayı <b>yığına koy</b>. Yığında ${st.length} nokta.` });
      }
      return st;
    };
    const lo = run(P, 1, []); const up = run(P.slice().reverse(), 2, lo);
    const hull = lo.slice(0, -1).concat(up.slice(0, -1));
    steps.push({ pass: 3, base: hull, st: [], p: null, pop: false, done: true, msg: `<b>Bitti.</b> İki turun zincirleri birleşti: ${pts.length} noktanın dışbükey zarfı <b>${hull.length} köşeli</b>. İçeride kalan ${pts.length - hull.length} nokta zarfa hiç girmedi ya da girip atıldı.` });
    return { steps, sorted: P };
  }
  SL.GEO.hull = pts => { const { steps } = hullSteps(pts); return steps[steps.length - 1].base; };
  D.hull = function (root) {
    const W = 720, H = 330;
    let n = 14, seed = 4, pts = [], steps = [], sorted = [], k = 0, timer = null;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%';
    const gen = () => { const r = RNG(seed); pts = Array.from({ length: n }, () => V.v(60 + r() * (W - 120), 40 + r() * (H - 90))); build(); };
    const build = () => { const o = hullSteps(pts); steps = o.steps; sorted = o.sorted; k = 0; };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const s = k > 0 ? steps[k - 1] : null;
      const line = (arr, col, w, close, dash) => { if (arr.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); arr.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); if (close) ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); };
      if (s) {
        if (s.done) { ctx.fillStyle = t.dark ? 'rgba(46,170,90,0.2)' : 'rgba(46,170,90,0.14)'; ctx.beginPath(); s.base.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.fill(); line(s.base, t.green, 3.5, true); }
        else { line(s.base, t.green, 3, false); line(s.st, t.blue, 3.5, false); if (s.pop && s.st.length >= 2) line([s.st[s.st.length - 1], s.p], t.red, 2, false, [5, 4]); }
      }
      sorted.forEach((q, i) => { const inSt = s && (s.st.includes(q) || s.base.includes(q)); ctx.fillStyle = s && s.p === q ? t.amber : s && s.pop && s.st[s.st.length - 1] === q ? t.red : inSt ? (s.done || s.base.includes(q) ? t.green : t.blue) : t.muted; ctx.beginPath(); ctx.arc(q.x, q.y, s && s.p === q ? 8 : 5.5, 0, 7); ctx.fill(); SL.drawLabel(ctx, String(i + 1), q.x, q.y - 13, t.muted, { size: 9, bg: false }); });
      SL.drawLabel(ctx, `adım ${k} / ${steps.length}`, W - 10, 14, t.muted, { size: 11, align: 'right' });
      info.innerHTML = s ? s.msg : 'Noktalar soldan sağa <b>sıralandı</b> (üstlerindeki sayılar sıra numarası). “1 adım”a basın: soldan sağa giderken bir <b>yığın</b> tutacağız; içe kıvrılan noktalar yığından atılacak. Mavi: şu anki zincir · yeşil: bitmiş zincir · sarı: sıradaki nokta · kırmızı: atılan nokta.';
    };
    const step = () => { if (k < steps.length) { k++; draw(); return true; } return false; };
    const play = () => { if (timer) { clearInterval(timer); timer = null; return; } if (k >= steps.length) k = 0; timer = setInterval(() => { if (!step()) { clearInterval(timer); timer = null; } }, 260); };
    C.addEventListener('mousedown', e => { const b = C.getBoundingClientRect(); pts.push(V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height)); build(); k = steps.length; draw(); });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      btn('⏮', () => { k = 0; draw(); }), btn('◀', () => { if (k > 0) k--; draw(); }), btn('1 adım ▶', step), btn('▶ / ⏸ oynat', play), btn('⏭ sonuç', () => { k = steps.length; draw(); }),
      slider('nokta', 5, 40, n, 1, v => { n = v; gen(); draw(); }), btn('🎲 yeni', () => { seed++; gen(); draw(); }), el('span', { class: 'mini' }, 'Tıkla: nokta ekle')), C, info);
    gen(); draw(); SL.onTheme(draw);
    return { stop() { if (timer) { clearInterval(timer); timer = null; } } };
  };

  /* ---------- simlab: nokta çokgenin içinde mi? ---------- */
  SL.SIMLABS.inside = function (box, api) {
    const W = 520, H = 300;
    const POLYS = [
      [[90, 60], [250, 30], [300, 120], [430, 50], [470, 230], [330, 270], [260, 190], [150, 270], [60, 190], [170, 140]],
      [[80, 40], [440, 40], [440, 260], [80, 260], [80, 200], [380, 200], [380, 100], [80, 100]]
    ];
    let fn = null, pi = 0, dots = [], acc = 0, seed = 1;
    const ref = (p, poly) => inPoly({ x: p[0], y: p[1] }, poly.map(q => ({ x: q[0], y: q[1] })));
    const farFromEdge = (p, poly) => poly.every((a, i) => { const b = poly[(i + 1) % poly.length], ab = [b[0] - a[0], b[1] - a[1]], t = SL.clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] * ab[0] + ab[1] * ab[1]), 0, 1); return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t) > 2 && Math.abs(p[1] - a[1]) > 0.5; });
    const sample = (poly, r, n) => { const out = []; while (out.length < n) { const p = [Math.round(r() * W * 10) / 10, Math.round(r() * H * 10) / 10]; if (farFromEdge(p, poly)) out.push(p); } return out; };
    const fresh = () => { const poly = POLYS[pi % 2]; dots = sample(poly, RNG(seed++), 260).map(p => { let got = null; if (fn) { try { got = !!fn(p.slice(), poly.map(q => q.slice())); } catch (e) { got = null; } } return { p, got, want: ref(p, poly) }; }); };
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt, w) { if (!fn) return; acc += dt; if (acc > 2.2) { acc = 0; pi++; fresh(); } },
      render(ctx, w, t) {
        const poly = POLYS[pi % 2];
        ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; ctx.beginPath(); poly.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.stroke();
        dots.forEach(d => { ctx.fillStyle = d.got === null ? t.muted : d.got ? t.green : (t.dark ? '#6b7088' : '#a9a6b8'); ctx.beginPath(); ctx.arc(d.p[0], d.p[1], 3.2, 0, 7); ctx.fill(); if (d.got !== null && d.got !== d.want) { ctx.strokeStyle = t.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.p[0], d.p[1], 6.5, 0, 7); ctx.stroke(); } });
        const bad = dots.filter(d => d.got !== null && d.got !== d.want).length;
        SL.drawLabel(ctx, fn ? `yeşil: “içeride” dediğiniz · gri: “dışarıda” · kırmızı halka: YANLIŞ (${bad})` : 'Kodu çalıştırın', 8, H - 10, bad ? t.red : t.muted, { size: 10, align: 'left' });
      },
      reset() { pi = 0; fresh(); }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w,
      setFns(f) { fn = f.inside; acc = 0; fresh(); w.playing = true; w.syncBtn && w.syncBtn(); w.draw(); },
      check(mod) {
        try {
          const r = RNG(77);
          for (const poly of POLYS) for (const p of sample(poly, r, 400)) { const got = mod.inside(p.slice(), poly.map(q => q.slice())), want = ref(p, poly); if (!!got !== want) return { ok: false, msg: `❌ inside([${p}], …) = ${got}, beklenen ${want}. Işın sağa gidiyor: yalnızca noktanın y’si kenarın iki ucunun ARASINDAYSA ve kesişimin x’i noktanın SAĞINDAYSA sayın.` }; }
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ 800 noktanın hepsi doğru. Sağda iki içbükey şekil sırayla sınanıyor; kırmızı halka yok.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  SL.AILABS.cross = {
    fn: 'cross', jsFn: 'cross',
    ref: (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
    cases: () => { const cs = [[[0, 0], [4, 0], [2, 3]], [[0, 0], [4, 0], [2, -3]], [[0, 0], [4, 0], [9, 0]], [[1, 1], [3, 3], [5, 5]], [[2, 5], [7, 1], [4, 4]]]; for (let i = 0; i < 15; i++) cs.push([[rint(-9, 9), rint(-9, 9)], [rint(-9, 9), rint(-9, 9)], [rint(-9, 9), rint(-9, 9)]]); return cs; },
    show: (a, b, c) => `A = ${JSON.stringify(a)}, B = ${JSON.stringify(b)}, C = ${JSON.stringify(c)}`,
    hint: (a, b, c) => `(B.x − A.x)·(C.y − A.y) − (B.y − A.y)·(C.x − A.x) = (${b[0] - a[0]})·(${c[1] - a[1]}) − (${b[1] - a[1]})·(${c[0] - a[0]}). Diziler [x, y]: A[0] x’tir, A[1] y’dir.`
  };
  SL.AILABS.area = {
    fn: 'polygon_area', jsFn: 'polygonArea', tol: 1e-9,
    ref: pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; },
    cases: () => { const cs = [[[[0, 0], [4, 0], [4, 3], [0, 3]]], [[[0, 0], [4, 0], [0, 3]]], [[[0, 3], [4, 3], [4, 0], [0, 0]]], [[[0, 0], [2, 0], [2, 2], [4, 2], [4, 4], [0, 4]]], [[[1, 1], [5, 2], [3, 6]]]]; for (let i = 0; i < 8; i++) { const n = 3 + rint(0, 4), c = []; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, r = rint(2, 9); c.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)]); } cs.push([c]); } return cs; },
    show: p => `köşeler: ${JSON.stringify(p)}`,
    hint: () => 'Ayakkabı bağı: her kenar (a → b) için a.x·b.y − b.x·a.y topla; son köşeden ilk köşeye dönmeyi unutma ((i + 1) % n). Sonuç = |toplam| / 2 (köşeler ters sırada verilirse toplam eksi çıkar).'
  };
  const SEG = (a, b, c, d) => segHit({ x: a[0], y: a[1] }, { x: b[0], y: b[1] }, { x: c[0], y: c[1] }, { x: d[0], y: d[1] });
  SL.AILABS.segx = {
    fn: 'segments_intersect', jsFn: 'segmentsIntersect',
    ref: SEG,
    cases: () => { const cs = [[[0, 0], [4, 4], [0, 4], [4, 0]], [[0, 0], [2, 2], [3, 3], [5, 5]], [[0, 0], [4, 0], [2, 0], [2, 5]], [[0, 0], [4, 0], [5, 1], [5, -1]], [[0, 0], [4, 0], [1, 1], [3, 1]], [[0, 0], [4, 0], [2, 0], [6, 0]], [[0, 0], [4, 4], [4, 4], [8, 0]], [[1, 1], [1, 5], [0, 3], [2, 3]], [[0, 0], [1, 1], [3, 0], [0, 3]]]; for (let i = 0; i < 20; i++) cs.push([[rint(0, 8), rint(0, 8)], [rint(0, 8), rint(0, 8)], [rint(0, 8), rint(0, 8)], [rint(0, 8), rint(0, 8)]]); return cs; },
    show: (a, b, c, d) => `AB: ${JSON.stringify(a)}–${JSON.stringify(b)}, CD: ${JSON.stringify(c)}–${JSON.stringify(d)}`,
    hint: () => 'd1 = cross(A,B,C), d2 = cross(A,B,D), d3 = cross(C,D,A), d4 = cross(C,D,B). d1 ile d2 ZIT işaretli VE d3 ile d4 zıt işaretliyse True. Özel durum: bir çapraz 0 ise o uç öbür parçanın doğrusundadır; parçanın kutusunun (min–max x ve y) içindeyse dokunuyorlar → True.'
  };
  SL.AILABS.hull = {
    fn: 'convex_hull', jsFn: 'convexHull',
    ref: pts => { const P = [...new Map(pts.map(p => [p[0] + ',' + p[1], p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (P.length < 3) return P; const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const build = arr => { const h = []; for (const p of arr) { while (h.length >= 2 && cr(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); } return h; }; const lo = build(P), up = build(P.slice().reverse()); return lo.slice(0, -1).concat(up.slice(0, -1)).sort((a, b) => a[0] - b[0] || a[1] - b[1]); },
    cases: () => { const cs = [[[[0, 0], [4, 0], [4, 4], [0, 4], [2, 2]]], [[[0, 0], [2, 0], [4, 0], [4, 4], [0, 4]]], [[[0, 0], [1, 1], [2, 2], [3, 3]]], [[[1, 1], [5, 1], [3, 4]]], [[[0, 0], [5, 0], [5, 5], [0, 5], [1, 1], [2, 3], [4, 1], [3, 3]]]]; for (let i = 0; i < 8; i++) { const n = rint(5, 12), c = []; for (let k = 0; k < n; k++) c.push([rint(0, 9), rint(0, 9)]); cs.push([c]); } return cs; },
    show: p => `noktalar: ${JSON.stringify(p)}`,
    hint: () => 'Noktaları (x, sonra y) sırala. Soldan sağa git: yığında en az 2 nokta varken cross(sondan önceki, son, yeni) ≤ 0 ise son noktayı at; sonra yeniyi ekle. Aynısını sağdan sola yap. İki zinciri (son elemanları hariç) birleştir. Sonucu yine (x, y) sıralı döndür. Doğrusal (aynı kenar üzerindeki ara) noktalar zarfa girmez.'
  };

  /* ---------- başlık ---------- */
  D.titlegeo1 = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H), r = RNG(8);
    const pts = Array.from({ length: 16 }, () => ({ x: 700 + r() * 520, y: 30 + r() * 170, vx: (r() - 0.5) * 1.4, vy: (r() - 0.5) * 1.1 }));
    let timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const h = SL.GEO.hull(pts);
      ctx.fillStyle = 'rgba(122,215,255,0.10)'; ctx.strokeStyle = 'rgba(122,215,255,0.85)'; ctx.lineWidth = 2.5; ctx.beginPath(); h.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.fill(); ctx.stroke();
      pts.forEach(q => { ctx.fillStyle = h.includes(q) ? '#7ad7ff' : 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(q.x, q.y, h.includes(q) ? 5 : 3.5, 0, 7); ctx.fill(); });
    };
    const tick = () => { if (!running) return; pts.forEach(q => { q.x += q.vx; q.y += q.vy; if (q.x < 690 || q.x > 1250) q.vx *= -1; if (q.y < 20 || q.y > 210) q.vy *= -1; }); draw(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
