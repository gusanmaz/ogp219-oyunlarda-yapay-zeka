/* "Sonlu Durum Makineleri" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const NAMES = { DEVRIYE: 'DEVRİYE', SUPHE: 'ŞÜPHE', KOVALA: 'KOVALA', SALDIR: 'SALDIR', KAC: 'KAÇ' };
  const COLS = t => ({ DEVRIYE: t.blue, SUPHE: t.amber, KOVALA: t.red, SALDIR: t.purple, KAC: t.green });

  /* referans geçiş fonksiyonu (laboratuvarlarda da beklenen davranış) */
  const refNext = (state, s) => {
    if (s.hp < 30 && state !== 'KAC') return 'KAC';                 // her durumdan
    switch (state) {
      case 'DEVRIYE': return s.seesPlayer ? 'KOVALA' : s.heardNoise ? 'SUPHE' : 'DEVRIYE';
      case 'SUPHE': return s.seesPlayer ? 'KOVALA' : s.timeInState > 4 ? 'DEVRIYE' : 'SUPHE';
      case 'KOVALA': return !s.seesPlayer ? 'SUPHE' : s.dist < 60 ? 'SALDIR' : 'KOVALA';
      case 'SALDIR': return !s.seesPlayer ? 'SUPHE' : s.dist > 90 ? 'KOVALA' : 'SALDIR';   // histerezis: 60'ta gir, 90'da çık
      case 'KAC': return s.hp > 70 ? 'DEVRIYE' : 'KAC';
    }
    return state;
  };
  SL.guardRefNext = refNext;

  /* ---------- FSM diyagramı (SVG) ---------- */
  const NODES = { DEVRIYE: [90, 60], SUPHE: [90, 215], KOVALA: [280, 135], SALDIR: [440, 60], KAC: [300, 290] };
  const EDGES = [['DEVRIYE', 'KOVALA', 'görüyor'], ['DEVRIYE', 'SUPHE', 'ses'], ['SUPHE', 'KOVALA', 'görüyor'], ['SUPHE', 'DEVRIYE', '4 sn'], ['KOVALA', 'SUPHE', 'kaybetti'], ['KOVALA', 'SALDIR', '< 60'], ['SALDIR', 'KOVALA', '> 90'], ['KAC', 'DEVRIYE', 'can > 70', [[248, 296], [15, 300], [10, 95], [42, 72]]]];
  function fsmSVG(active, flash) {
    const t = T(), col = COLS(t);
    let s = `<defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>`;
    EDGES.forEach(([a, b, lab, curve]) => {
      if (curve) {   // eğri ok (diğer okların arasından geçmesin)
        const on = flash && flash[0] === a && flash[1] === b, [p0, c1, c2, p1] = curve;
        s += `<path d="M${p0[0]},${p0[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p1[0]},${p1[1]}" fill="none" stroke="${on ? t.red : t['ink-2']}" stroke-width="${on ? 4 : 1.8}" marker-end="url(#fa)"/>`;
        const lw = lab.length * 6.4 + 10;
        s += `<rect x="${32 - lw / 2}" y="${262}" width="${lw}" height="16" rx="4" fill="${t.card}" opacity=".92"/><text x="32" y="274" text-anchor="middle" font-size="11" fill="${on ? t.red : t.muted}" font-weight="${on ? 700 : 600}">${lab}</text>`;
        return;
      }
      const [x1, y1] = NODES[a], [x2, y2] = NODES[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const twin = EDGES.some(e => e[0] === b && e[1] === a), off = twin ? 9 : 0, px = -uy * off, py = ux * off;
      const on = flash && flash[0] === a && flash[1] === b;
      const sx = x1 + ux * 46 + px, sy = y1 + uy * 26 + py, ex = x2 - ux * 50 + px, ey = y2 - uy * 30 + py;
      s += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${on ? t.red : t['ink-2']}" stroke-width="${on ? 4 : 1.8}" marker-end="url(#fa)"/>`;
      const lx = (sx + ex) / 2 + px * 2.2, ly = (sy + ey) / 2 + py * 2.2, lw = lab.length * 6.4 + 10;
      s += `<rect x="${lx - lw / 2}" y="${ly - 10}" width="${lw}" height="16" rx="4" fill="${t.card}" opacity=".92"/><text x="${lx}" y="${ly + 2}" text-anchor="middle" font-size="11" fill="${on ? t.red : t.muted}" font-weight="${on ? 700 : 600}">${lab}</text>`;
    });
    s += `<text x="470" y="300" text-anchor="middle" font-size="12" font-weight="700" fill="${t.green}">her durumdan:</text><text x="470" y="316" text-anchor="middle" font-size="12" font-weight="700" fill="${t.green}">can &lt; 30 → KAÇ</text>`;
    Object.entries(NODES).forEach(([k, [x, y]]) => {
      const on = k === active;
      s += `<rect x="${x - 50}" y="${y - 22}" width="100" height="44" rx="22" fill="${on ? col[k] : t.card}" stroke="${col[k]}" stroke-width="${on ? 4 : 2.5}"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="15" font-weight="700" fill="${on ? '#fff' : t.ink}">${NAMES[k]}</text>`;
    });
    return `<svg viewBox="0 0 530 330" style="width:100%" font-family="Source Sans 3">${s}</svg>`;
  }

  D.guardfsm = function (root) {
    const sim = SL.makeGuardArena({ decide: refNext, memory: root.dataset.memory != null ? root.dataset.memory === '1' : true, onDraw: st => {
      diag.innerHTML = fsmSVG(st.state, st.flashT > 0 ? st.flash : null);
      const s = st.sense || {};
      info.innerHTML = `<div class="sv-counters"><span class="cnt">can <b>${Math.round(st.hp)}</b></span><span class="cnt">mesafe <b>${s.dist}</b></span><span class="cnt">görüyor <b>${s.seesPlayer ? 'evet' : 'hayır'}</b></span><span class="cnt">son 5 sn’de geçiş <b class="${st.switches.length > 6 ? 'c-red' : ''}">${st.switches.length}</b></span></div><div class="fsm-log">${st.log.map(l => `<div>${l}</div>`).join('') || '<i>henüz geçiş yok</i>'}</div>`;
    } });
    const diag = el('div', { class: 'fsm-diag' }), info = el('div');
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('🔫 Nöbetçiye ateş et (−25 can)', () => sim.shoot(), 'primary'),
      el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => sim.setMemory(e.target.checked) }); cb.checked = sim.st.memory; return cb; })(), ' algı hafızası (1,2 sn)'),
      el('span', { class: 'mini' }, 'Fare = oyuncu · tıkla = ses çıkar')),
    el('div', { class: 'gv-row' }, el('div', { style: 'flex:none' }, sim.world.canvas), el('div', { class: 'gv-side' }, diag, info)), sim.world.controls());
    sim.world.reset();
    return { start: () => sim.world.start(), stop: () => sim.world.stop() };
  };

  /* ---------- başlık: dolaşan durum jetonu ---------- */
  D.titlefsm = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const N = [['DEVRİYE', 700, 60, '#4f8cff'], ['ŞÜPHE', 880, 170, '#f5a524'], ['KOVALA', 1060, 60, '#ff5c7a'], ['SALDIR', 1180, 170, '#a970ff']];
    let k = 0, tt = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < N.length; i++) { const a = N[i], b = N[(i + 1) % N.length]; ctx.strokeStyle = 'rgba(200,200,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[1], a[2]); ctx.lineTo(b[1], b[2]); ctx.stroke(); }
      N.forEach(([n, x, y, col], i) => { const on = i === k; ctx.shadowColor = col; ctx.shadowBlur = on ? 24 : 0; ctx.fillStyle = on ? col : 'rgba(30,30,50,0.8)'; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 70, 26, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '700 15px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, x, y + 1); });
      const a = N[k], b = N[(k + 1) % N.length], f = Math.min(1, tt / 30);
      if (tt > 50) { const x = a[1] + (b[1] - a[1]) * ((tt - 50) / 20), y = a[2] + (b[2] - a[2]) * ((tt - 50) / 20); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); }
      void f;
    };
    const tick = () => { if (!running) return; tt++; if (tt >= 70) { tt = 0; k = (k + 1) % N.length; } draw(); timer = setTimeout(tick, 33); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };

  /* ---------- yığınlı durum makinesi (pushdown) ---------- */
  D.pushdown = function (root) {
    let stack = ['DEVRİYE'], plain = 'DEVRİYE', log = [];
    const view = el('div', { class: 'cols' });
    const draw = () => {
      view.innerHTML = `<div><div class="mini"><b>Yığınlı FSM</b> (en üstteki = şu anki durum):</div><div class="pd-stack">${stack.slice().reverse().map((s, i) => `<div class="${i === 0 ? 'top' : ''}">${s}</div>`).join('')}</div></div>` +
        `<div><div class="mini"><b>Düz FSM</b> (tek değişken):</div><div class="pd-stack"><div class="top">${plain}</div></div><div class="mini" style="margin-top:8px">${log.slice(-4).map(l => `<div>${l}</div>`).join('')}</div></div>`;
    };
    const ev = (name, fn) => btn(name, () => { fn(); draw(); });
    root.append(el('div', { class: 'sv-controls' },
      ev('📞 Telefon çaldı', () => { stack.push('TELEFONDA'); plain = 'TELEFONDA'; log.push('Telefon: düz FSM önceki durumu unuttu!'); }),
      ev('🔫 Silah sesi', () => { stack.push('ALARM'); plain = 'ALARM'; log.push('Alarm üste eklendi'); }),
      ev('✔ Bitti / tehlike geçti (pop)', () => { if (stack.length > 1) stack.pop(); plain = '??? (nereye dönmeli?)'; log.push('Yığın: bir öncekine dön. Düz FSM: bilmiyor.'); }),
      ev('↺', () => { stack = ['DEVRİYE']; plain = 'DEVRİYE'; log = []; })), view);
    draw();
  };

  /* ---------- simlab: kendi geçiş fonksiyonunu yaz ---------- */
  SL.SIMLABS.guard = function (box, api) {
    let bad = false;
    const sim = SL.makeGuardArena({ decide: refNext, displayW: 540, onBad: v => { api.setMsg('err', '⚠️ nextState geçerli bir durum adı döndürmeli (DEVRIYE, SUPHE, KOVALA, SALDIR, KAC). Döndürülen: ' + JSON.stringify(v)); }, onDraw: st => { lbl.textContent = `durum: ${NAMES[st.state]} · can ${Math.round(st.hp)}`; } });
    const lbl = el('div', { class: 'mini' });
    box.append(sim.world.canvas, el('div', { class: 'sv-controls' }, btn('🔫 ateş et (−25)', () => sim.shoot())), lbl, sim.world.controls({ speed: false }));
    sim.world.reset();
    return {
      world: sim.world,
      setFns(f) { sim.setDecide(f.nextState); sim.world.reset(); sim.world.playing = true; sim.world.syncBtn && sim.world.syncBtn(); void bad; },
      check(mod) {
        const cs = SL.AILABS.guardfsm.cases();
        for (const [state, s] of cs) {
          const js = { seesPlayer: s.sees_player, dist: s.dist, hp: s.hp, heardNoise: s.heard_noise, timeInState: s.time_in_state };
          let got; try { got = mod.nextState(state, Object.assign({}, js)); } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
          const want = refNext(state, js);
          if (got !== want) return { ok: false, msg: `❌ Durum ${state}, algı ${JSON.stringify(js)} → beklenen ${want}, seninki ${JSON.stringify(got)}` };
        }
        return { ok: true, msg: `✅ ${cs.length}/${cs.length} durum testi geçti — simülasyonda izleyin!` };
      }
    };
  };

  /* ---------- ailab (Python + JS) ---------- */
  SL.AILABS.guardfsm = {
    fn: 'next_state', jsFn: 'nextState',
    ref: (state, s) => refNext(state, { seesPlayer: s.sees_player, dist: s.dist, hp: s.hp, heardNoise: s.heard_noise, timeInState: s.time_in_state }),
    cases: () => {
      const states = ['DEVRIYE', 'SUPHE', 'KOVALA', 'SALDIR', 'KAC'], cs = [];
      const base = { sees_player: false, dist: 200, hp: 100, heard_noise: false, time_in_state: 0 };
      states.forEach(st => { cs.push([st, Object.assign({}, base)]); cs.push([st, Object.assign({}, base, { sees_player: true })]); cs.push([st, Object.assign({}, base, { sees_player: true, dist: 40 })]); cs.push([st, Object.assign({}, base, { sees_player: true, dist: 75 })]); cs.push([st, Object.assign({}, base, { hp: 20 })]); cs.push([st, Object.assign({}, base, { heard_noise: true })]); cs.push([st, Object.assign({}, base, { time_in_state: 5 })]); cs.push([st, Object.assign({}, base, { hp: 80 })]); });
      for (let i = 0; i < 25; i++) cs.push([states[Math.floor(Math.random() * 5)], { sees_player: Math.random() < 0.5, dist: Math.floor(Math.random() * 300), hp: Math.floor(Math.random() * 100), heard_noise: Math.random() < 0.4, time_in_state: Math.floor(Math.random() * 8) }]);
      return cs;
    },
    show: (st, s) => `durum ${st}, algı ${JSON.stringify(s)}`,
    hint: (st, s) => (s.hp < 30 && st !== 'KAC' ? 'Can 30’un altındaysa HER durumdan KAC’a geçilir (önce bunu kontrol edin).' : 'Kurallar tablosunu durum durum kontrol edin.')
  };
})();
