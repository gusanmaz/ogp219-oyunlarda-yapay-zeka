/* "Utility AI" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const f2 = x => (Math.round(x * 100) / 100).toFixed(2);

  /* ================= yanıt eğrileri ================= */
  const CURVES = {
    linear: { ad: 'doğrusal', f: (x, p) => p.m * (x - p.c) + p.b, txt: p => `y = ${p.m}·(x − ${p.c}) + ${p.b}` },
    power: { ad: 'üslü (karesel, kübik…)', f: (x, p) => Math.pow(clamp01(x - p.c), p.k) * p.m + p.b, txt: p => `y = ${p.m}·(x − ${p.c})^${p.k} + ${p.b}` },
    logistic: { ad: 'lojistik (S eğrisi)', f: (x, p) => 1 / (1 + Math.exp(-p.m * 10 * (x - p.c))) + p.b, txt: p => `y = 1 / (1 + e^(−${p.m * 10}·(x − ${p.c}))) + ${p.b}` },
    piecewise: { ad: 'parçalı doğrusal (elle)', f: (x, p) => { const P = p.pts; if (x <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1); } return P[P.length - 1][1]; }, txt: () => 'noktaları sürükleyin: aradaki değerler doğrusal enterpolasyon' }
  };
  SL.UCURVES = CURVES;
  const evalCurve = (type, x, p, inv) => { let y = clamp01(CURVES[type].f(x, p)); return inv ? 1 - y : y; };

  D.curves = function (root) {
    const W = 560, H = 360, M = 44;
    const c = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(c, W, H);
    const st = { type: 'logistic', inv: false, x: 0.35, p: { m: 1, k: 2, b: 0, c: 0.5, pts: [[0, 1], [0.15, 0.95], [0.4, 0.4], [0.6, 0.08], [1, 0]] } };
    const info = el('div', { class: 'sv-note' }), formula = el('div', { class: 'mini mono' });
    const X = x => M + x * (W - M - 16), Y = y => H - M - y * (H - M - 16), IX = px => (px - M) / (W - M - 16), IY = py => (H - M - py) / (H - M - 16);
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.font = '12px "JetBrains Mono"'; ctx.fillStyle = t.muted; ctx.textAlign = 'center';
      for (let i = 0; i <= 10; i++) { const v = i / 10; ctx.beginPath(); ctx.moveTo(X(v), Y(0)); ctx.lineTo(X(v), Y(1)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(X(0), Y(v)); ctx.lineTo(X(1), Y(v)); ctx.stroke(); if (i % 2 === 0) { ctx.fillText(v.toFixed(1), X(v), Y(0) + 16); ctx.textAlign = 'right'; ctx.fillText(v.toFixed(1), X(0) - 6, Y(v) + 4); ctx.textAlign = 'center'; } }
      ctx.fillStyle = t['ink-2']; ctx.font = '700 13px "Source Sans 3"'; ctx.fillText('girdi x (normalleştirilmiş)', X(0.5), H - 6);
      ctx.save(); ctx.translate(13, Y(0.5)); ctx.rotate(-Math.PI / 2); ctx.fillText('puan y', 0, 0); ctx.restore();
      ctx.strokeStyle = t.blue; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const x = i / 200, y = evalCurve(st.type, x, st.p, st.inv); i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
      ctx.stroke();
      if (st.type === 'piecewise') st.p.pts.forEach(([x, y]) => { const yy = st.inv ? 1 - y : y; ctx.strokeStyle = t.purple; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(X(x), Y(yy), 9, 0, 7); ctx.stroke(); ctx.setLineDash([]); });
      const y = evalCurve(st.type, st.x, st.p, st.inv);
      ctx.strokeStyle = t.red; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(st.x), Y(0)); ctx.lineTo(X(st.x), Y(y)); ctx.lineTo(X(0), Y(y)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(X(st.x), Y(y), 6, 0, 7); ctx.fill();
      SL.drawLabel(ctx, `x = ${f2(st.x)} → y = ${f2(y)}`, Math.min(X(st.x) + 70, W - 80), Math.max(Y(y) - 16, 14), t.red, { size: 12 });
      formula.textContent = (st.inv ? '1 − [ ' : '') + CURVES[st.type].txt(st.p) + (st.inv ? ' ]' : '') + '   (sonuç 0–1 aralığına kırpılır)';
    };
    let drag = -1;
    const pos = e => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; };
    c.addEventListener('mousedown', e => { if (st.type !== 'piecewise') return; const [px, py] = pos(e); drag = st.p.pts.findIndex(([x, y]) => Math.hypot(X(x) - px, Y(st.inv ? 1 - y : y) - py) < 14); });
    c.addEventListener('mousemove', e => { if (drag < 0) return; const [px, py] = pos(e); const P = st.p.pts; let x = clamp01(IX(px)); if (drag === 0) x = 0; else if (drag === P.length - 1) x = 1; else x = Math.max(P[drag - 1][0] + 0.02, Math.min(P[drag + 1][0] - 0.02, x)); let y = clamp01(IY(py)); if (st.inv) y = 1 - y; P[drag] = [x, y]; draw(); });
    window.addEventListener('mouseup', () => { drag = -1; });
    const ctl = el('div', { class: 'ctl-col' });
    const build = () => {
      ctl.innerHTML = '';
      ctl.append(el('label', { class: 'ctl' }, 'Eğri: ', select({ linear: CURVES.linear.ad, power: CURVES.power.ad, logistic: CURVES.logistic.ad, piecewise: CURVES.piecewise.ad }, st.type, v => { st.type = v; build(); draw(); })));
      const P = st.p, sl = (lab, key, a, b, s) => ctl.append(slider(lab, a, b, P[key], s, v => { P[key] = v; draw(); }));
      if (st.type !== 'piecewise') { sl('eğim m', 'm', -2, 2, 0.1); if (st.type === 'power') sl('üs k', 'k', 0.25, 6, 0.25); sl('x kaydırma c', 'c', -0.5, 1, 0.05); sl('y kaydırma b', 'b', -0.5, 0.5, 0.05); }
      ctl.append(el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { st.inv = e.target.checked; draw(); } }); cb.checked = st.inv; return cb; })(), ' ters çevir (1 − y)'));
      ctl.append(slider('girdi x', 0, 1, st.x, 0.01, v => { st.x = v; draw(); }));
      const presets = { 'Açlık (Sims tarzı)': () => { st.type = 'piecewise'; st.inv = false; st.p.pts = [[0, 1], [0.15, 0.95], [0.4, 0.4], [0.6, 0.08], [1, 0]]; }, 'Mesafe: yakın iyi': () => { st.type = 'power'; st.inv = true; Object.assign(st.p, { m: 1, k: 0.5, c: 0, b: 0 }); }, 'Can az → kaç': () => { st.type = 'logistic'; st.inv = true; Object.assign(st.p, { m: 1.5, c: 0.3, b: 0 }); }, 'Mermi: biraz yeter': () => { st.type = 'power'; st.inv = false; Object.assign(st.p, { m: 1, k: 0.35, c: 0, b: 0 }); } };
      ctl.append(el('div', { class: 'sv-controls' }, el('b', null, 'Hazır: '), ...Object.entries(presets).map(([k, f]) => btn(k, () => { f(); build(); draw(); }))));
    };
    build();
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, el('div', { style: 'flex:none' }, c), el('div', { class: 'gv-side' }, ctl, formula, info)));
    info.innerHTML = 'Girdiyi önce <b>0–1</b> aralığına getiriyoruz (normalleştirme), sonra eğri onu bir <b>puana</b> çeviriyor. Tasarımcının işi doğru eğriyi seçmek.';
    draw(); SL.onTheme(draw);
  };

  /* ================= IAUS tarzı asker: birden çok etken ================= */
  const COMBAT = [
    { ad: 'Ateş et', cons: [['mermi var', s => (s.ammo > 0 ? 0.35 + 0.65 * Math.pow(s.ammo / 30, 0.4) : 0)], ['hedef yakın', s => 1 - Math.pow(s.dist / 50, 2)], ['canım yerinde', s => 0.3 + 0.7 * (s.hp / 100)]] },
    { ad: 'Siper al', cons: [['düşman çok', s => s.enemies / 5], ['can düşük', s => 1 - Math.pow(s.hp / 100, 2) * 0.8], ['siper yakın', s => 1 - s.cover / 30]] },
    { ad: 'Şarjör değiştir', cons: [['mermi az', s => Math.pow(1 - s.ammo / 30, 3)], ['düşman uzak', s => 1 / (1 + Math.exp(-0.25 * (s.dist - 15)))]] },
    { ad: 'İyileş (medkit)', cons: [['can düşük', s => Math.pow(1 - s.hp / 100, 2)], ['medkit var', s => (s.medkit ? 1 : 0)], ['düşman uzak', s => 1 / (1 + Math.exp(-0.3 * (s.dist - 20)))]] },
    { ad: 'Kaç', cons: [['can çok düşük', s => 1 - 1 / (1 + Math.exp(-0.25 * (s.hp - 20)))], ['düşman çok', s => s.enemies / 5]] }
  ];
  const compensate = (score, n) => { if (n < 2 || score === 0) return score; const mod = 1 - 1 / n, makeUp = (1 - score) * mod; return score + makeUp * score; };
  SL.uCompensate = compensate;
  D.combat = function (root) {
    const s = { hp: 70, ammo: 12, dist: 18, enemies: 2, cover: 8, medkit: true, comp: true };
    const tbl = el('div'), verdict = el('div', { class: 'sv-note' });
    const bar = (v, col) => `<span class="ubar"><i style="width:${Math.round(clamp01(v) * 100)}%;background:${col}"></i></span><span class="unum">${f2(v)}</span>`;
    const draw = () => {
      const t = T();
      const rows = COMBAT.map(a => { const vals = a.cons.map(([n, f]) => [n, clamp01(f(s))]); const prod = vals.reduce((p, [, v]) => p * v, 1); return { a, vals, prod, fin: s.comp ? compensate(prod, vals.length) : prod }; });
      const best = rows.reduce((b, r) => (r.fin > b.fin ? r : b), rows[0]);
      tbl.innerHTML = `<table class="sum-t ut-table"><tr><th>eylem</th><th>etkenler (her biri 0–1)</th><th>çarpım</th><th>${s.comp ? 'telafili puan' : 'puan'}</th></tr>` +
        rows.map(r => `<tr class="${r === best ? 'ut-best' : ''}"><td><b>${r.a.ad}</b></td><td>${r.vals.map(([n, v]) => `<div class="ucons"><span class="ulab">${n}</span>${bar(v, v === 0 ? t.red : t.blue)}</div>`).join('')}</td><td>${bar(r.prod, t.purple)}</td><td>${bar(r.fin, r === best ? t.green : t['ink-2'])}</td></tr>`).join('') + '</table>';
      verdict.innerHTML = `Seçilen: <b class="c-green">${best.a.ad}</b>. ` + (rows.some(r => r.prod === 0) ? 'Puanı 0 olan bir etken bütün eylemi <b>veto</b> eder (kırmızı çubuk). ' : '') + (s.comp ? '' : '<b>Telafi kapalı</b>: 3 etkenli eylemler, 2 etkenlilere göre haksız biçimde düşük puan alıyor.');
    };
    const sl = (lab, key, a, b, st2) => slider(lab, a, b, s[key], st2, v => { s[key] = v; draw(); });
    const cb = (lab, key) => el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { s[key] = e.target.checked; draw(); } }); x.checked = s[key]; return x; })(), ' ' + lab);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, el('div', { class: 'ctl-col', style: 'flex:0 0 300px' }, el('b', null, 'Durum'), sl('can', 'hp', 0, 100, 1), sl('mermi', 'ammo', 0, 30, 1), sl('düşmana mesafe (m)', 'dist', 0, 50, 1), sl('düşman sayısı', 'enemies', 0, 5, 1), sl('en yakın siper (m)', 'cover', 0, 30, 1), cb('medkit var', 'medkit'), cb('telafi faktörü (Dave Mark)', 'comp')), el('div', { class: 'gv-side' }, tbl, verdict)));
    draw(); SL.onTheme(draw);
  };

  /* ================= Sims tarzı oda: ihtiyaçlar + akıllı nesneler ================= */
  const NEEDS = [['hunger', 'Açlık', '🍔'], ['energy', 'Enerji', '⚡'], ['fun', 'Eğlence', '🎮'], ['bladder', 'Tuvalet', '🚽'], ['social', 'Sosyal', '💬']];
  const DECAY = { hunger: 1.5, energy: 0.9, fun: 2.0, bladder: 1.8, social: 1.2 };
  const OBJS = [
    { id: 'fridge', ad: 'Buzdolabı', icon: '🧊', x: 70, y: 70, act: 'Yemek ye', ads: { hunger: 70 }, dur: 4 },
    { id: 'phone', ad: 'Telefon', icon: '📞', x: 370, y: 60, act: 'Arkadaşı ara', ads: { social: 60, fun: 10 }, dur: 4 },
    { id: 'bed', ad: 'Yatak', icon: '🛏️', x: 650, y: 80, act: 'Uyu', ads: { energy: 80 }, dur: 6 },
    { id: 'toilet', ad: 'Tuvalet', icon: '🚽', x: 70, y: 310, act: 'Tuvalete git', ads: { bladder: 90 }, dur: 2.5 },
    { id: 'tv', ad: 'Televizyon', icon: '📺', x: 370, y: 320, act: 'TV izle', ads: { fun: 55 }, dur: 4 },
    { id: 'joy', ad: 'Joy Booth', icon: '🎡', x: 650, y: 310, act: 'Joy Booth', ads: { fun: 100, social: 100 }, real: { fun: 30, social: 12 }, dur: 4, optional: true }
  ];
  const URG = [[0, 1], [20, 0.9], [40, 0.45], [60, 0.15], [80, 0.03], [100, 0]];
  const urgency = v => CURVES.piecewise.f(v, { pts: URG });
  const refScore = (needs, ads, dist) => { let u = 0; for (const k in ads) u += urgency(needs[k]) * (ads[k] / 100); return u / (1 + dist / 600); };
  SL.uRefScore = refScore;

  function makeRoom(o = {}) {
    const W = 720, H = 380;
    let scoreFn = o.score || refScore;
    const cfg = Object.assign({ mode: 'best', inertia: 'commit', atten: true, joy: false }, o.cfg || {});
    const st = {};
    const objs = () => OBJS.filter(b => !b.optional || cfg.joy);
    const reset = () => Object.assign(st, { pos: V.v(360, 190), needs: { hunger: 65, energy: 80, fun: 45, bladder: 70, social: 55 }, cur: null, phase: 'idle', t: 0, scores: [], crises: 0, low: {}, uses: {}, happySum: 0, n: 0, switches: 0, lastPick: null });
    reset();
    const scoreAll = () => {
      const res = objs().map(b => { const d = cfg.atten ? V.dist(st.pos, b) : 0; let s; try { s = scoreFn(Object.assign({}, st.needs), Object.assign({}, b.ads), d); } catch (e) { if (o.onErr) o.onErr(e); s = NaN; } if (typeof s !== 'number' || !isFinite(s)) { if (o.onBad) o.onBad(s); s = 0; } if (cfg.inertia === 'bonus' && st.cur === b) s *= 1.3; return { b, s }; });
      res.push({ b: null, s: 0.04 });   // boş dur
      return res;
    };
    const pick = res => {
      const valid = res.filter(r => r.s > 0);
      if (cfg.mode === 'best' || valid.length < 2) return res.reduce((a, r) => (r.s > a.s ? r : a), res[0]);
      let pool = valid;
      if (cfg.mode === 'top') { const mx = Math.max(...valid.map(r => r.s)); pool = valid.filter(r => r.s >= 0.75 * mx); }
      const tot = pool.reduce((a, r) => a + r.s, 0); let x = Math.random() * tot;
      for (const r of pool) { x -= r.s; if (x <= 0) return r; }
      return pool[pool.length - 1];
    };
    const decide = () => {
      const res = scoreAll(); st.scores = res;
      const ch = pick(res);
      if (ch.b !== st.cur) { st.switches++; st.cur = ch.b; st.phase = ch.b ? 'walk' : 'idle'; st.t = 0; }
      st.lastPick = ch;
    };
    const w = new SL.World({
      W, H, reset() { reset(); },
      onClick(m) { const b = objs().find(b => Math.hypot(b.x - m.x, b.y - m.y) < 40); if (b) { st.cur = b; st.phase = 'walk'; st.t = 0; st.forced = 2; } },
      update(dt) {
        for (const [k] of NEEDS) { st.needs[k] = Math.max(0, st.needs[k] - DECAY[k] * dt); if (st.needs[k] <= 0 && !st.low[k]) { st.low[k] = true; st.crises++; } if (st.needs[k] > 25) st.low[k] = false; }
        st.forced = (st.forced || 0) - dt;
        if (st.forced <= 0 && (cfg.inertia !== 'commit' || st.phase === 'idle')) decide();
        else if (st.forced <= 0) st.scores = scoreAll();
        const b = st.cur;
        if (b && st.phase === 'walk') { const d = V.sub(b, st.pos), L = V.len(d); if (L < 34) { st.phase = 'use'; st.t = 0; } else st.pos = V.add(st.pos, V.mul(V.norm(d), Math.min(L, 140 * dt))); }
        else if (b && st.phase === 'use') { st.t += dt; const eff = b.real || b.ads; for (const k in eff) st.needs[k] = Math.min(100, st.needs[k] + (eff[k] / b.dur) * dt); st.uses[b.id] = (st.uses[b.id] || 0) + dt; if (st.t >= b.dur) { st.phase = 'idle'; st.cur = null; } }
        else if (!b) { st.t += dt; if (st.t > 0.5) st.phase = 'idle'; }
        st.happySum += NEEDS.reduce((a, [k]) => a + st.needs[k], 0) / NEEDS.length; st.n++;
      },
      render(ctx, w, t) {
        ctx.fillStyle = t.dark ? '#1c1f2b' : '#f3eee4'; ctx.fillRect(0, 0, W, H);
        SL.drawGrid(ctx, W, H, 40, t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)');
        objs().forEach(b => {
          const on = st.cur === b;
          ctx.fillStyle = t.card; ctx.strokeStyle = on ? t.green : t.rule; ctx.lineWidth = on ? 3 : 1.5;
          ctx.beginPath(); ctx.roundRect(b.x - 38, b.y - 30, 76, 60, 10); ctx.fill(); ctx.stroke();
          ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.icon, b.x, b.y - 6);
          ctx.font = '700 11px "Source Sans 3"'; ctx.fillStyle = t['ink-2']; ctx.fillText(b.ad, b.x, b.y + 19);
        });
        if (st.cur && st.phase === 'walk') { ctx.strokeStyle = t.green; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(st.pos.x, st.pos.y); ctx.lineTo(st.cur.x, st.cur.y); ctx.stroke(); ctx.setLineDash([]); }
        ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(st.pos.x, st.pos.y, 13, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '15px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🙂', st.pos.x, st.pos.y + 1);
        const lab = st.cur ? (st.phase === 'walk' ? '→ ' : '') + st.cur.act + (st.phase === 'use' ? ` (${Math.max(0, st.cur.dur - st.t).toFixed(1)} sn)` : '') : 'boş duruyor';
        SL.drawLabel(ctx, lab, st.pos.x, st.pos.y - 26, t.ink, { size: 12 });
        if (o.onDraw) o.onDraw(st);
      }
    });
    return { world: w, st, cfg, setScore: f => { scoreFn = f; }, objs, NEEDS };
  }

  const needBars = st => NEEDS.map(([k, n, ic]) => { const v = st.needs[k]; const col = v < 20 ? 'var(--red)' : v < 45 ? 'var(--amber)' : 'var(--green)'; return `<div class="uneed"><span>${ic} ${n}</span><span class="ubar wide"><i style="width:${v}%;background:${col}"></i></span><b>${Math.round(v)}</b></div>`; }).join('');
  const scoreBars = st => { const rs = (st.scores || []).slice().sort((a, b) => b.s - a.s), mx = Math.max(0.01, ...rs.map(r => r.s)); return rs.map(r => `<div class="uscore ${st.lastPick && r.b === st.lastPick.b ? 'on' : ''}"><span>${r.b ? r.b.act : 'boş dur'}</span><span class="ubar wide"><i style="width:${(100 * r.s) / mx}%"></i></span><b>${r.s.toFixed(2)}</b></div>`).join(''); };

  D.simroom = function (root) {
    const side = el('div', { class: 'gv-side' }), stats = el('div', { class: 'sv-counters' });
    const room = makeRoom({ onDraw: st => {
      side.innerHTML = `<div class="mini"><b>İhtiyaçlar</b> (100 = tam dolu)</div>${needBars(st)}<div class="mini" style="margin-top:6px"><b>Eylem puanları</b> ${room && room.cfg.inertia === 'commit' ? '(karar: eylem bitince)' : '(karar: her kare)'}</div>${scoreBars(st)}`;
      stats.innerHTML = `<span class="cnt">kriz (ihtiyaç 0’a düştü) <b class="${st.crises ? 'c-red' : ''}">${st.crises}</b></span><span class="cnt">ort. mutluluk <b>${st.n ? Math.round(st.happySum / st.n) : '-'}</b></span><span class="cnt">fikir değiştirme <b>${st.switches}</b></span>${room && room.cfg.joy ? `<span class="cnt">Joy Booth süresi <b>${Math.round(st.uses.joy || 0)} sn</b></span>` : ''}`;
    } });
    const cfg = room.cfg;
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Seçim: ', select({ best: 'en yüksek puan', weighted: 'ağırlıklı rastgele (hepsi)', top: 'ağırlıklı rastgele (en iyinin %75’i üstü)' }, cfg.mode, v => { cfg.mode = v; })),
      el('label', { class: 'ctl' }, 'Atalet: ', select({ commit: 'eylemi bitir, sonra karar ver', bonus: 'her kare karar + mevcut eyleme ×1,3', none: 'her kare karar (atalet yok)' }, cfg.inertia, v => { cfg.inertia = v; })),
      el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.atten = e.target.checked; } }); x.checked = cfg.atten; return x; })(), ' mesafe zayıflatması'),
      el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.joy = e.target.checked; if (!e.target.checked && room.st.cur && room.st.cur.id === 'joy') room.st.cur = null; } }); x.checked = cfg.joy; return x; })(), ' 🎡 Joy Booth ekle')),
      el('div', { class: 'gv-row' }, el('div', { style: 'flex:none' }, room.world.canvas, stats), side), room.world.controls());
    room.world.reset();
    return { start: () => room.world.start(), stop: () => room.world.stop() };
  };

  /* ---------- simlab: puan fonksiyonunu sen yaz ---------- */
  SL.SIMLABS.sims = function (box, api) {
    const side = el('div', { class: 'mini' });
    const room = makeRoom({ onBad: v => api.setMsg('err', '⚠️ score bir sayı döndürmeli; döndürülen: ' + String(v)), onDraw: st => { side.innerHTML = `<div class="uneed-row">${NEEDS.map(([k, , ic]) => `<span>${ic} <b class="${st.needs[k] < 20 ? 'c-red' : ''}">${Math.round(st.needs[k])}</b></span>`).join(' ')}</div><div>kriz: <b class="${st.crises ? 'c-red' : ''}">${st.crises}</b> · ort. mutluluk ${st.n ? Math.round(st.happySum / st.n) : '-'} · şu an: ${st.cur ? st.cur.act : 'boş'}</div>`; } });
    room.world.canvas.style.width = '540px';
    box.append(room.world.canvas, side, room.world.controls({ speed: false }));
    room.world.reset();
    const SC = [
      ['Çok aç, diğerleri iyi', { hunger: 8, energy: 85, fun: 80, bladder: 85, social: 80 }, 'fridge'],
      ['Çok yorgun', { hunger: 70, energy: 6, fun: 70, bladder: 75, social: 70 }, 'bed'],
      ['Tuvalet acil, biraz aç', { hunger: 45, energy: 70, fun: 70, bladder: 10, social: 70 }, 'toilet'],
      ['Sıkılmış ve yalnız', { hunger: 85, energy: 85, fun: 20, bladder: 85, social: 20 }, 'phone'],
      ['Sadece sıkılmış', { hunger: 85, energy: 85, fun: 15, bladder: 85, social: 85 }, 'tv']
    ];
    return {
      world: room.world,
      setFns(f) { room.setScore(f.score); room.world.reset(); room.world.playing = true; room.world.syncBtn && room.world.syncBtn(); },
      check(mod) {
        const objs = OBJS.filter(b => !b.optional);
        for (const [ad, needs, want] of SC) {
          let best = null, bs = -Infinity;
          for (const b of objs) { let s; try { s = mod.score(Object.assign({}, needs), Object.assign({}, b.ads), 200); } catch (e) { return { ok: false, msg: '⚠️ score hata verdi: ' + SL.jsErrorText(e) }; } if (typeof s !== 'number' || !isFinite(s)) return { ok: false, msg: `⚠️ score sayı döndürmeli (senaryo “${ad}”, ${b.act}: ${String(s)})` }; if (s > bs) { bs = s; best = b; } }
          if (best.id !== want) return { ok: false, msg: `❌ Senaryo “${ad}” (${JSON.stringify(needs)}): en yüksek puanı “${best.act}” aldı, beklenen “${OBJS.find(b => b.id === want).act}”.` };
        }
        const a = mod.score({ hunger: 80, energy: 80, fun: 80, bladder: 80, social: 80 }, { hunger: 70 }, 200), b = mod.score({ hunger: 20, energy: 80, fun: 80, bladder: 80, social: 80 }, { hunger: 70 }, 200);
        if (!(b > a)) return { ok: false, msg: '❌ Açlık 20 iken “Yemek ye”nin puanı, açlık 80 iken olduğundan büyük olmalı.' };
        const n = mod.score({ hunger: 30, energy: 80, fun: 80, bladder: 80, social: 80 }, { hunger: 70 }, 50), fr = mod.score({ hunger: 30, energy: 80, fun: 80, bladder: 80, social: 80 }, { hunger: 70 }, 500);
        return { ok: true, msg: '✅ 5/5 senaryo ve tutarlılık testi geçti.' + (n > fr ? ' Mesafe de hesaba katılıyor 👍' : ' (İpucu: uzak nesnelerin puanını biraz düşürmeyi deneyin.)') + ' Simülasyonda kriz sayısını izleyin.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  SL.AILABS.dse = {
    fn: 'dse_score', jsFn: 'dseScore', tol: 1e-6,
    ref: scores => { if (!scores.length) return 0; let p = 1; for (const s of scores) { p *= s; if (p === 0) return 0; } return compensate(p, scores.length); },
    cases: () => {
      const cs = [[[0.5]], [[0.9, 0.9]], [[0.8, 0.5, 0.9]], [[1, 1, 1, 1]], [[0.6, 0, 0.9]], [[0, 0.5]], [[0.3, 0.3, 0.3, 0.3, 0.3]], [[]]];
      for (let i = 0; i < 14; i++) { const n = 1 + Math.floor(Math.random() * 6); cs.push([Array.from({ length: n }, () => (Math.random() < 0.08 ? 0 : Math.round(Math.random() * 1000) / 1000))]); }
      return cs;
    },
    show: s => `etken puanları ${JSON.stringify(s)}`,
    hint: s => (s.length === 0 ? 'Etken yoksa 0 döndürün.' : s.includes(0) ? 'Bir etken 0 ise sonuç 0 (veto).' : s.length === 1 ? 'Tek etkende telafi yok: mod = 1 − 1/1 = 0.' : 'çarpım p; mod = 1 − 1/n; telafi = (1 − p)·mod; sonuç = p + telafi·p')
  };
  SL.AILABS.dual = {
    fn: 'dual_candidates', jsFn: 'dualCandidates',
    ref: (opts, pct) => { let v = opts.filter(o => o[2] > 0); if (!v.length) return []; const r = Math.max(...v.map(o => o[1])); v = v.filter(o => o[1] === r); const mw = Math.max(...v.map(o => o[2])); return v.filter(o => o[2] >= pct * mw).map(o => o[0]).sort(); },
    cases: () => {
      const cs = [
        [[['yemek', 0, 5], ['uyu', 0, 3], ['tv', 0, 1]], 0.5],
        [[['ağaçta tırman', 5, 2], ['ağaçtan in', 5, 4], ['yemek', 0, 9]], 0.25],
        [[['öl', 1000000, 1], ['gösteri', 100, 8], ['yemek', 0, 9]], 0.5],
        [[['a', 0, 0], ['b', 0, 0]], 0.5],
        [[['a', 3, 0], ['b', 1, 2], ['c', 1, 1]], 0.5],
        [[], 0.3]
      ];
      const N = ['yemek', 'uyu', 'tv', 'oyna', 'dans', 'ara', 'yüz', 'koş'];
      for (let i = 0; i < 10; i++) { const k = 2 + Math.floor(Math.random() * 6); const names = N.slice().sort(() => Math.random() - 0.5).slice(0, k); cs.push([names.map(n => [n, Math.floor(Math.random() * 3), Math.floor(Math.random() * 10)]), [0.2, 0.5, 0.8][i % 3]]); }
      return cs;
    },
    show: (o, p) => `seçenekler ${JSON.stringify(o)}, oran ${p}`,
    hint: () => '1) ağırlığı 0 olanları at · 2) kalanlarda en yüksek rank’ı bul, diğer rank’leri at · 3) en büyük ağırlığın pct katından küçük olanları at · adları alfabetik sırala'
  };

  /* ---------- başlık ---------- */
  D.titleutil = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const cols = ['#ff7a8a', '#ffd27a', '#6dffb0', '#7ac8ff', '#c49bff'];
    let t = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const vals = cols.map((_, i) => 0.5 + 0.45 * Math.sin(t * 0.03 * (1 + i * 0.23) + i * 1.7));
      const best = vals.indexOf(Math.max(...vals));
      vals.forEach((v, i) => { const x = 760 + i * 92, h = v * 170; ctx.fillStyle = cols[i]; ctx.globalAlpha = i === best ? 1 : 0.45; ctx.shadowColor = cols[i]; ctx.shadowBlur = i === best ? 18 : 0; ctx.fillRect(x, 205 - h, 60, h); });
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '700 22px serif'; ctx.textAlign = 'center'; ctx.fillText('▼', 790 + best * 92, 205 - vals[best] * 170 - 12);
    };
    const tick = () => { if (!running) return; t++; draw(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
