/* "GOAP ve HTN" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();

  /* ================= alan (domain): F.E.A.R. tarzı asker =================
     durum = { anahtar: bool } · ön koşul = istenen değerler · etki = atanan değerler
     Belirtilmeyen anahtar = false. */
  const FACTS = { inB: 'sağ odada', hasAmmo: 'yedek şarjör var', loaded: 'silah dolu', targetDead: 'hedef etkisiz', doorStuck: '🧠 kapı açılmıyor', kickFailed: '🧠 tekme işe yaramadı', armoryEmpty: '🧠 cephanelik boş' };
  const ACTIONS = [
    { name: 'Cephane al', pre: { inB: false, armoryEmpty: false }, eff: { hasAmmo: true }, cost: 1 },
    { name: 'Şarjör tak', pre: { hasAmmo: true }, eff: { loaded: true, hasAmmo: false }, cost: 1 },
    { name: 'Kapıdan geç', pre: { inB: false, doorStuck: false }, eff: { inB: true }, cost: 1 },
    { name: 'Kapıyı tekmele', pre: { inB: false, kickFailed: false }, eff: { inB: true }, cost: 3 },
    { name: 'Pencereden atla', pre: { inB: false }, eff: { inB: true }, cost: 5 },
    { name: 'Ateş et', pre: { inB: true, loaded: true }, eff: { targetDead: true }, cost: 1 },
    { name: 'Yumruk', pre: { inB: true }, eff: { targetDead: true }, cost: 6 }
  ];
  const GOAL = { targetDead: true };
  SL.GOAP_ACTIONS = ACTIONS;

  const val = (s, k) => !!s[k];
  const sat = (s, cond) => Object.keys(cond).every(k => val(s, k) === !!cond[k]);
  const apply = (s, eff) => Object.assign({}, s, eff);
  const key = s => Object.keys(s).filter(k => val(s, k)).sort().join(',');   // doğru olan bütün gerçekler
  const hCount = (s, goal) => Object.keys(goal).filter(k => val(s, k) !== !!goal[k]).length;

  /* A* ileri arama; iz (trace) her genişletmeyi kaydeder */
  function plan(start, goal, actions, o = {}) {
    const H = o.noH ? () => 0 : hCount;
    let id = 0;
    const nodes = [], order = [];
    const root = { id: id++, parent: null, act: null, s: start, g: 0, h: H(start, goal) };
    nodes.push(root);
    const open = [root], best = { [key(start)]: 0 }, closed = new Set();
    while (open.length && order.length < 200) {
      open.sort((a, b) => a.g + a.h - (b.g + b.h) || a.id - b.id);
      const n = open.shift();
      if (closed.has(key(n.s))) continue;
      closed.add(key(n.s));
      const kids = [];
      if (sat(n.s, goal)) { order.push({ n, kids, done: true }); const path = []; for (let x = n; x.parent; x = x.parent) path.unshift(x); return { plan: path.map(x => x.act), cost: n.g, nodes, order, goalNode: n }; }
      for (const a of actions) {
        if (!sat(n.s, a.pre)) continue;
        const s2 = apply(n.s, a.eff), g2 = n.g + a.cost, k = key(s2);
        if (closed.has(k) || (k in best && best[k] <= g2)) continue;
        best[k] = g2;
        const c = { id: id++, parent: n, act: a, s: s2, g: g2, h: H(s2, goal) };
        nodes.push(c); open.push(c); kids.push(c);
      }
      order.push({ n, kids, open: open.slice() });
    }
    return { plan: null, cost: Infinity, nodes, order };
  }
  SL.goapPlan = plan;

  /* ---------- arama ağacını çiz ---------- */
  function searchSVG(res, upto, o = {}) {
    const t = T(), W = o.W || 1160, H = o.H || 300;
    const shown = new Set([0]), expanded = new Set();
    res.order.slice(0, upto).forEach(e => { expanded.add(e.n.id); e.kids.forEach(k => shown.add(k.id)); });
    const cur = upto > 0 ? res.order[upto - 1].n : null;
    const pathIds = new Set();
    if (o.final && res.goalNode) for (let x = res.goalNode; x; x = x.parent) pathIds.add(x.id);
    const kidsOf = {}; res.nodes.forEach(n => { if (n.parent && shown.has(n.id)) (kidsOf[n.parent.id] = kidsOf[n.parent.id] || []).push(n); });
    const pos = {}; let leaf = 0, maxD = 0;
    const walk = (n, d) => { maxD = Math.max(maxD, d); const ks = kidsOf[n.id] || []; if (!ks.length) { pos[n.id] = [leaf++, d]; return; } ks.forEach(k => walk(k, d + 1)); const xs = ks.map(k => pos[k.id][0]); pos[n.id] = [(Math.min(...xs) + Math.max(...xs)) / 2, d]; };
    walk(res.nodes[0], 0);
    const X = i => 70 + (leaf > 1 ? (i * (W - 140)) / (leaf - 1) : (W - 140) / 2), Y = d => 28 + (d * (H - 60)) / Math.max(1, maxD);
    let s = '';
    res.nodes.forEach(n => { if (!shown.has(n.id) || !n.parent) return; const [x1, d1] = pos[n.parent.id], [x2, d2] = pos[n.id]; const on = pathIds.has(n.id); s += `<line x1="${X(x1)}" y1="${Y(d1) + 31}" x2="${X(x2)}" y2="${Y(d2) - 13}" stroke="${on ? t.green : t.rule}" stroke-width="${on ? 3.5 : 1.5}"/>`; });
    res.nodes.forEach(n => {
      if (!shown.has(n.id)) return;
      const [xi, d] = pos[n.id], x = X(xi), y = Y(d), lab = n.act ? n.act.name : 'BAŞLANGIÇ', w = Math.max(64, lab.length * 6.6 + 12);
      const isCur = cur && cur.id === n.id, isPath = pathIds.has(n.id), isExp = expanded.has(n.id);
      const stroke = isPath ? t.green : isCur ? t.amber : isExp ? t['ink-2'] : t.blue, fill = isCur ? t.amber : isPath ? t.green : t.card, ink = isCur ? '#111' : isPath ? '#fff' : t.ink;
      s += `<rect x="${x - w / 2}" y="${y - 13}" width="${w}" height="26" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${isCur || isPath ? 3 : 1.6}" ${isExp || isPath || isCur ? '' : 'stroke-dasharray="4 3"'}/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${ink}">${lab}</text><text x="${x}" y="${y + 25}" text-anchor="middle" font-size="10" fill="${t.muted}">g=${n.g} h=${n.h}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H + 10}" style="width:100%" font-family="Source Sans 3">${s}</svg>`;
  }
  const chips = s => Object.keys(FACTS).filter(k => val(s, k)).map(k => `<span class="gchip">${FACTS[k]}</span>`).join('') || '<span class="gchip off">(hiçbir şey doğru değil)</span>';
  const planCards = (p, cur, failed) => (p && p.length ? p.map((a, i) => `<span class="gcard ${i === cur ? 'on' : ''} ${i < cur ? 'done' : ''} ${i === cur && failed ? 'fail' : ''}">${i + 1}. ${a.name}<small>maliyet ${a.cost}</small></span>`).join('<span class="garrow">→</span>') : '<span class="gchip off">plan yok</span>');

  /* ---------- 1) plan arama izleyici ---------- */
  D.goapsearch = function (root) {
    const start = { loaded: false, hasAmmo: false, inB: false, doorStuck: false, kickFailed: false, armoryEmpty: false };
    let noH = false, res;
    const diag = el('div'), note = el('div', { class: 'sv-note' }), planBox = el('div', { class: 'gplan' });
    const fp = new SL.FramePlayer(f => {
      diag.innerHTML = searchSVG(res, f.k, { final: f.final, H: 270 });
      note.innerHTML = f.note;
      planBox.innerHTML = f.final ? `<b>Plan (toplam maliyet ${res.cost}):</b> ${planCards(res.plan, -1)}` : `<b>Açık liste (f = g + h sırasıyla):</b> ${f.open}`;
    }, { speed: 1.5 });
    const build = () => {
      res = plan(start, GOAL, ACTIONS, { noH });
      const F = [{ k: 0, note: 'Başlangıç durumu: ' + chips(start) + ' · Hedef: <b>hedef etkisiz</b>', open: 'BAŞLANGIÇ' }];
      res.order.forEach((e, i) => {
        const nm = e.n.act ? `“${e.n.act.name}” sonrası` : 'başlangıç';
        F.push({ k: i + 1, note: e.done ? `✅ ${nm} durumu hedefi sağlıyor: arama bitti.` : `${nm} durumu genişletiliyor (g=${e.n.g}, h=${e.n.h}). Ön koşulu tutan eylemler: ${e.kids.map(k => k.act.name).join(', ') || '— yok (çıkmaz)'}.<br>Durum: ${chips(e.n.s)}`, open: (e.open || []).slice().sort((a, b) => a.g + a.h - (b.g + b.h)).map(x => `${x.act ? x.act.name : '·'} (${x.g + x.h})`).join(' · ') || '—', final: false });
      });
      F.push({ k: res.order.length, final: true, note: res.plan ? `Toplam ${res.order.length} düğüm genişletildi. En ucuz plan yeşil yol.` : '❌ Hiçbir eylem dizisi hedefe ulaşmıyor.' });
      fp.load(F);
    };
    const boxes = Object.keys(start).map(k => el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { start[k] = e.target.checked; build(); } }); cb.checked = start[k]; return cb; })(), ' ' + FACTS[k]));
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls gfacts' }, el('b', null, 'Başlangıç: '), ...boxes, el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { noH = e.target.checked; build(); } }); return cb; })(), ' sezgiyi kapat (h = 0)')), diag, SL.transport(fp, { min: 0.5, max: 8 }), note, planBox);
    build(); SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  /* ---------- 2) canlı asker: planla, yürüt, başarısız olunca yeniden planla ---------- */
  const LOC = { start: V.v(110, 190), crate: V.v(90, 70), door: V.v(360, 120), window: V.v(360, 300), target: V.v(600, 200) };
  function makeSoldier(o = {}) {
    const W = 720, H = 380;
    let actions = o.actions || ACTIONS;
    const env = { holdDoor: false, emptyArmory: false };
    const st = {};
    const reset = () => Object.assign(st, { pos: V.copy(LOC.start), s: { loaded: false, hasAmmo: false, inB: false, targetDead: false, doorStuck: false, kickFailed: false, armoryEmpty: false }, plan: null, i: 0, t: 0, phase: 'plan', log: [], replans: 0, failed: false, flash: 0, dead: false });
    reset();
    const log = m => { st.log.unshift(m); st.log.length = Math.min(st.log.length, 7); };
    const doPlan = () => {
      let r; try { r = plan(st.s, GOAL, actions); } catch (e) { if (o.onErr) o.onErr(e); r = { plan: null }; }
      st.plan = r.plan; st.i = 0; st.t = 0; st.failed = false;
      st.phase = r.plan ? 'go' : 'stuck';
      log(r.plan ? `📝 Plan (${r.cost}): ${r.plan.map(a => a.name).join(' → ')}` : '❌ Plan bulunamadı!');
    };
    const where = a => ({ 'Cephane al': LOC.crate, 'Kapıdan geç': LOC.door, 'Kapıyı tekmele': LOC.door, 'Pencereden atla': LOC.window, 'Ateş et': V.v(470, 200), 'Yumruk': V.v(570, 200) }[a.name] || null);
    const DUR = { 'Cephane al': 0.8, 'Şarjör tak': 1.0, 'Kapıdan geç': 0.8, 'Kapıyı tekmele': 1.2, 'Pencereden atla': 1.0, 'Ateş et': 0.8, 'Yumruk': 1.2 };
    const fails = a => (a.name === 'Cephane al' && env.emptyArmory ? { armoryEmpty: true, msg: 'cephanelik boş!' } : a.name === 'Kapıdan geç' && env.holdDoor ? { doorStuck: true, msg: 'kapı açılmıyor (biri tutuyor)!' } : a.name === 'Kapıyı tekmele' && env.holdDoor ? { kickFailed: true, msg: 'tekme işe yaramadı!' } : null);
    const w = new SL.World({
      W, H, reset() { reset(); },
      update(dt) {
        st.flash -= dt;
        if (st.phase === 'plan') { doPlan(); return; }
        if (st.phase === 'done' || st.phase === 'stuck') return;
        const a = st.plan[st.i];
        if (!a) { st.phase = 'done'; return; }
        if (st.phase === 'go') {
          const to = where(a);
          if (to && V.dist(st.pos, to) > 6) { const d = V.sub(to, st.pos); st.pos = V.add(st.pos, V.mul(V.norm(d), Math.min(V.len(d), 150 * dt))); return; }
          st.phase = 'act'; st.t = 0;
        }
        if (st.phase === 'act') {
          st.t += dt;
          if (st.t < (DUR[a.name] || 1)) return;
          if (!sat(st.s, a.pre)) { log(`⚠️ “${a.name}”: ön koşul artık tutmuyor → yeniden planla`); st.replans++; st.phase = 'plan'; return; }
          const f = fails(a);
          if (f) { const m = Object.assign({}, f); delete m.msg; st.s = apply(st.s, m); st.failed = true; st.flash = 0.8; log(`💥 “${a.name}” başarısız: ${f.msg} Hafızaya yazıldı → yeniden planla`); st.replans++; st.phase = 'plan'; return; }
          st.s = apply(st.s, a.eff);
          if (a.name === 'Kapıdan geç' || a.name === 'Kapıyı tekmele') st.pos = V.v(400, 120);
          if (a.name === 'Pencereden atla') st.pos = V.v(405, 300);
          log(`✔ ${a.name}`);
          st.i++; st.phase = 'go';
          if (st.s.targetDead) { st.phase = 'done'; st.dead = true; log('🎯 Hedef etkisiz hâle getirildi.'); }
        }
      },
      render(ctx, w, t) {
        ctx.fillStyle = t.dark ? '#1c1f2b' : '#f1ede4'; ctx.fillRect(0, 0, W, H);
        // duvar: kapı (y 90–150) ve pencere (y 280–320) boşluklu
        ctx.fillStyle = t.dark ? '#3a3f55' : '#4a4f63';
        ctx.fillRect(350, 0, 20, 90); ctx.fillRect(350, 150, 20, 130); ctx.fillRect(350, 320, 20, 60);
        ctx.fillStyle = env.holdDoor ? t.red : '#b07a3a'; ctx.fillRect(353, 90, 14, 60);
        ctx.strokeStyle = t.blue; ctx.lineWidth = 3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(360, 280); ctx.lineTo(360, 320); ctx.stroke(); ctx.setLineDash([]);
        SL.drawLabel(ctx, env.holdDoor ? 'kapı (oyuncu tutuyor!)' : 'kapı', 300, 120, env.holdDoor ? t.red : t['ink-2'], { size: 11 });
        SL.drawLabel(ctx, 'pencere', 300, 300, t.blue, { size: 11 });
        ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(env.emptyArmory ? '📭' : '🧰', LOC.crate.x, LOC.crate.y); SL.drawLabel(ctx, env.emptyArmory ? 'cephanelik (boş)' : 'cephanelik', LOC.crate.x, LOC.crate.y + 26, t['ink-2'], { size: 11 });
        ctx.fillText(st.dead ? '💀' : '🎯', LOC.target.x, LOC.target.y); SL.drawLabel(ctx, 'hedef', LOC.target.x, LOC.target.y + 26, t['ink-2'], { size: 11 });
        SL.drawLabel(ctx, 'A odası', 60, 360, t.muted, { size: 12, bg: false }); SL.drawLabel(ctx, 'B odası', 680, 360, t.muted, { size: 12, bg: false });
        const a = st.plan && st.plan[st.i];
        if (a && st.phase === 'act' && (a.name === 'Ateş et')) { ctx.strokeStyle = t.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(st.pos.x, st.pos.y); ctx.lineTo(LOC.target.x, LOC.target.y); ctx.stroke(); }
        ctx.fillStyle = st.flash > 0 ? t.red : t.purple; ctx.beginPath(); ctx.arc(st.pos.x, st.pos.y, 13, 0, 7); ctx.fill();
        SL.drawLabel(ctx, st.phase === 'done' ? 'görev tamam' : st.phase === 'stuck' ? 'plan yok!' : a ? (st.phase === 'go' ? '→ ' : '') + a.name : '…', st.pos.x, st.pos.y - 25, st.flash > 0 ? t.red : t.ink, { size: 12 });
        if (o.onDraw) o.onDraw(st, env);
      }
    });
    return { world: w, st, env, setActions: a => { actions = a; }, replan: () => { st.phase = 'plan'; } };
  }

  D.goaplive = function (root) {
    const side = el('div', { class: 'gv-side' });
    const sol = makeSoldier({ onDraw: (st, env) => {
      side.innerHTML = `<div class="mini"><b>Çalışma belleği</b> (dünya durumu)</div><div class="gfacts-view">${chips(st.s)}</div><div class="mini" style="margin-top:6px"><b>Plan</b></div><div class="gplan">${planCards(st.plan, st.i, st.failed && st.flash > 0)}</div><div class="mini" style="margin-top:6px"><b>Günlük</b> · yeniden planlama: ${st.replans}</div><div class="fsm-log">${st.log.map(l => `<div>${l}</div>`).join('')}</div>`;
    } });
    const env = sol.env;
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { env.holdDoor = e.target.checked; } }); return cb; })(), ' 🚪 kapıyı bedeninle tut'),
      el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { env.emptyArmory = e.target.checked; } }); return cb; })(), ' 📭 cephanelik boş'),
      el('span', { class: 'mini' }, 'Kutuları seçip ↺ Baştan’a basın. Asker başarısızlıkları hafızasına yazar ve yeniden plan yapar.')),
      el('div', { class: 'gv-row' }, el('div', { style: 'flex:none' }, (sol.world.canvas.style.width = '640px', sol.world.canvas)), side), sol.world.controls());
    sol.world.reset();
    return { start: () => sol.world.start(), stop: () => sol.world.stop() };
  };

  /* ---------- simlab: eylemleri (veri olarak) sen yaz ---------- */
  SL.SIMLABS.goap = function (box, api) {
    const info = el('div', { class: 'mini' });
    const sol = makeSoldier({ onDraw: (st) => { info.innerHTML = `<div class="gplan">${planCards(st.plan, st.i, false)}</div><div>${st.log[0] || ''}</div>`; } });
    sol.env.holdDoor = true;
    sol.world.canvas.style.width = '540px';
    const envBar = el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { sol.env.holdDoor = e.target.checked; sol.world.reset(); } }); cb.checked = true; return cb; })(), ' kapıyı tut'),
      el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { sol.env.emptyArmory = e.target.checked; sol.world.reset(); } }); return cb; })(), ' cephanelik boş'));
    box.append(envBar, sol.world.canvas, info, sol.world.controls({ speed: false }));
    sol.world.reset();
    const NAMES = ACTIONS.map(a => a.name);
    const norm = list => list.map(a => ({ name: a.name, pre: a.pre || {}, eff: a.eff || {}, cost: +a.cost }));
    return {
      world: sol.world,
      setFns(f) { let L; try { L = norm(f.actions()); } catch (e) { return; } sol.setActions(L); sol.world.reset(); sol.world.playing = true; sol.world.syncBtn && sol.world.syncBtn(); },
      check(mod) {
        let L;
        try { L = mod.actions(); } catch (e) { return { ok: false, msg: '⚠️ actions() hata verdi: ' + SL.jsErrorText(e) }; }
        if (!Array.isArray(L)) return { ok: false, msg: '⚠️ actions() bir dizi döndürmeli.' };
        for (const a of L) { if (!NAMES.includes(a.name)) return { ok: false, msg: `⚠️ Bilinmeyen eylem adı: “${a.name}”. Kullanılabilenler: ${NAMES.join(', ')}` }; if (!(a.cost > 0)) return { ok: false, msg: `⚠️ “${a.name}” için pozitif bir cost verin.` }; }
        L = norm(L);
        const base = { loaded: false, hasAmmo: false, inB: false, targetDead: false, doorStuck: false, kickFailed: false, armoryEmpty: false };
        const SC = [['Normal başlangıç', {}, 4], ['Kapı açılmıyor (hafızada)', { doorStuck: true }, 6], ['Kapı açılmıyor + tekme başarısız', { doorStuck: true, kickFailed: true }, 8], ['Cephanelik boş', { armoryEmpty: true }, 7], ['Silah zaten dolu, B odasındayım', { loaded: true, inB: true }, 1]];
        for (const [ad, extra, want] of SC) {
          const r = plan(Object.assign({}, base, extra), GOAL, L);
          if (!r.plan) return { ok: false, msg: `❌ “${ad}” senaryosunda hiçbir plan bulunamadı. (Beklenen en ucuz maliyet: ${want})` };
          if (r.cost !== want) return { ok: false, msg: `❌ “${ad}”: bulunan en ucuz plan ${r.cost} maliyetli (${r.plan.map(a => a.name).join(' → ')}); beklenen ${want}.` };
        }
        return { ok: true, msg: '✅ 5/5 senaryoda doğru maliyetli plan. Kapıyı tutun / cephaneliği boşaltın ve askerin yeniden planlamasını izleyin.' };
      }
    };
  };

  /* ---------- ailab: en ucuz planın maliyeti ---------- */
  SL.AILABS.plancost = {
    fn: 'plan_cost', jsFn: 'planCost',
    ref: (start, goal, acts) => { const r = plan(start, goal, acts.map(a => ({ name: a[0], pre: a[1], eff: a[2], cost: a[3] })), { noH: true }); return r.plan ? r.cost : null; },
    cases: () => {
      const A = ACTIONS.map(a => [a.name, a.pre, a.eff, a.cost]);
      const base = { loaded: false, hasAmmo: false, inB: false, targetDead: false, doorStuck: false, kickFailed: false, armoryEmpty: false };
      const pizza = [['Pizza ısmarla', { para: true }, { tok: true }, 2], ['Pasta yap', { tarif: true }, { tok: true }, 8], ['Para çek', {}, { para: true }, 3], ['Tarif bul', {}, { tarif: true }, 1]];
      return [
        [base, { targetDead: true }, A],
        [Object.assign({}, base, { doorStuck: true }), { targetDead: true }, A],
        [Object.assign({}, base, { doorStuck: true, kickFailed: true }), { targetDead: true }, A],
        [Object.assign({}, base, { armoryEmpty: true }), { targetDead: true }, A],
        [Object.assign({}, base, { inB: true, loaded: true }), { targetDead: true }, A],
        [Object.assign({}, base, { targetDead: true }), { targetDead: true }, A],
        [{ tok: false }, { tok: true }, pizza],
        [{ para: true }, { tok: true }, pizza],
        [{ tarif: true }, { tok: true }, pizza],
        [{}, { tok: true }, pizza.slice(0, 2)],
        [{}, { tok: true, para: true }, pizza],
        [{}, { a: true, b: true }, [['X', {}, { a: true }, 1], ['Y', { a: true }, { b: true, a: false }, 1], ['Z', { b: true }, { a: true }, 1]]]
      ];
    },
    show: (s, g, a) => `başlangıç ${JSON.stringify(s)}, hedef ${JSON.stringify(g)}, ${a.length} eylem`,
    hint: () => 'Öncelik kuyruğundan en küçük g’li durumu çek; hedefi sağlıyorsa g’yi döndür. Ön koşulu tutan her eylem için yeni durumu (kopyala + etkileri yaz) kuyruğa koy. Belirtilmeyen anahtar = False. Plan yoksa None.'
  };

  /* ================= HTN: Trunk Thumper ayrıştırması ================= */
  // görev: { name, type: 'compound', methods: [{ cond: s => bool, label, subtasks: [...] }] } ya da { name, type: 'primitive', cond?, eff? }
  const P = (name, cond, eff, condTxt) => ({ name, type: 'primitive', cond, eff, condTxt });
  const DOMAIN = {
    BeTrunkThumper: { name: 'BeTrunkThumper', type: 'compound', methods: [
      { label: 'düşmanı görüyorsa', cond: s => s.canSeeEnemy, subtasks: ['AttackEnemy'] },
      { label: 'aksi hâlde', cond: () => true, subtasks: ['Patrol'] }] },
    AttackEnemy: { name: 'AttackEnemy', type: 'compound', methods: [
      { label: 'elinde kütük varsa', cond: s => s.hasTrunk, subtasks: ['NavigateToEnemy', 'DoTrunkSlam'] },
      { label: 'kütük yoksa', cond: () => true, subtasks: ['FindTree', 'UprootTrunk', 'NavigateToEnemy', 'DoTrunkSlam'] }] },
    Patrol: { name: 'Patrol', type: 'compound', methods: [
      { label: 'her zaman', cond: () => true, subtasks: ['ChooseBridge', 'NavigateToBridge', 'CheckBridge'] }] },
    NavigateToEnemy: P('NavigateToEnemy', s => s.pathToEnemy, null, 'düşmana yol var'),
    DoTrunkSlam: P('DoTrunkSlam', s => s.hasTrunk, { hasTrunk: false }, 'elinde kütük var'),
    FindTree: P('FindTree', s => s.treeNearby, null, 'yakında ağaç var'),
    UprootTrunk: P('UprootTrunk', null, { hasTrunk: true }),
    ChooseBridge: P('ChooseBridge'), NavigateToBridge: P('NavigateToBridge'), CheckBridge: P('CheckBridge')
  };
  const TR = { BeTrunkThumper: 'Trunk Thumper ol', AttackEnemy: 'Düşmana saldır', Patrol: 'Devriye', NavigateToEnemy: 'Düşmana git', DoTrunkSlam: 'Kütükle vur', FindTree: 'Ağaç bul', UprootTrunk: 'Ağacı sök', ChooseBridge: 'Köprü seç', NavigateToBridge: 'Köprüye git', CheckBridge: 'Köprüyü kontrol et' };
  /* derinlik öncelikli ayrıştırma + geri izleme (backtracking) */
  function htnFrames(world) {
    const F = [];
    const snap = (tasks, plan, note, cur) => F.push({ stack: tasks.slice(), plan: plan.slice(), note, cur });
    const solve = (tasks, s, plan) => {
      if (F.length > 80) return null;
      if (!tasks.length) return plan;
      const [task, ...rest] = tasks, d = DOMAIN[task];
      if (d.type === 'primitive') {
        if (d.cond && !d.cond(s)) { snap(tasks, plan, `✗ İlkel görev <b>${TR[task]}</b> uygulanamaz (koşul: ${d.condTxt}) → <b>geri izle</b>: son seçilen yöntemin yerine bir sonrakini dene.`, task); return null; }
        const s2 = d.eff ? Object.assign({}, s, d.eff) : s;
        snap(rest, plan.concat([task]), `✔ İlkel görev <b>${TR[task]}</b> plana eklendi${d.eff ? ' (planlama sırasındaki dünya durumu güncellendi: ' + Object.entries(d.eff).map(([k, v]) => `${k} = ${v}`).join(', ') + ')' : ''}.`, task);
        return solve(rest, s2, plan.concat([task]));
      }
      for (const m of d.methods) {
        if (!m.cond(s)) { snap(tasks, plan, `· ${TR[task]}: yöntem “${m.label}” koşulu tutmuyor, atla.`, task); continue; }
        const next = m.subtasks.concat(rest);
        snap(next, plan, `▶ Bileşik görev <b>${TR[task]}</b>: yöntem “${m.label}” seçildi → alt görevler yığının başına: ${m.subtasks.map(x => TR[x]).join(', ')}`, task);
        const r = solve(next, s, plan);
        if (r) return r;
        snap(tasks, plan, `↩ <b>${TR[task]}</b>: “${m.label}” yöntemi başarısız oldu; plan ve dünya durumu bu noktaya geri alındı.`, task);
      }
      snap(tasks, plan, `✗ <b>${TR[task]}</b>: denenecek yöntem kalmadı.`, task);
      return null;
    };
    snap(['BeTrunkThumper'], [], 'Başlangıç: kök görev yığında.', null);
    const r = solve(['BeTrunkThumper'], Object.assign({}, world), []);
    snap([], r || [], r ? `✅ Yığın boş: plan hazır → ${r.map(x => TR[x]).join(' → ')}` : '❌ Plan bulunamadı.', null);
    return { F, ok: !!r };
  }
  D.htn = function (root) {
    const world = { canSeeEnemy: true, hasTrunk: false, treeNearby: true, pathToEnemy: true };
    const NAMES = { canSeeEnemy: 'düşmanı görüyor', hasTrunk: 'elinde kütük var', treeNearby: 'yakında ağaç var', pathToEnemy: 'düşmana yol var' };
    const view = el('div', { class: 'cols' }), note = el('div', { class: 'sv-note' });
    const left = el('div'), right = el('div');
    view.append(left, right);
    const tree = (cur) => {
      const t = T();
      const node = (name, depth) => {
        const d = DOMAIN[name], on = cur === name;
        let h = `<div class="htn-row" style="padding-left:${depth * 18}px"><span class="htn-t ${d.type} ${on ? 'on' : ''}">${d.type === 'compound' ? '◆' : '▪'} ${TR[name]}</span></div>`;
        if (d.type === 'compound') d.methods.forEach(m => { h += `<div class="htn-row" style="padding-left:${depth * 18 + 18}px"><span class="htn-m">yöntem: ${m.label}</span></div>`; m.subtasks.forEach(sname => { if (DOMAIN[sname].type === 'compound' && depth < 1) h += node(sname, depth + 2); else h += `<div class="htn-row" style="padding-left:${depth * 18 + 36}px"><span class="htn-t ${DOMAIN[sname].type} ${cur === sname ? 'on' : ''}">${DOMAIN[sname].type === 'compound' ? '◆' : '▪'} ${TR[sname]}</span></div>`; }); });
        return h;
      };
      void t;
      return `<div class="mini"><b>Alan (domain)</b>: ◆ bileşik görev · ▪ ilkel görev</div>` + node('BeTrunkThumper', 0);
    };
    const fp = new SL.FramePlayer(f => {
      left.innerHTML = tree(f.cur);
      right.innerHTML = `<div class="mini"><b>Görev yığını</b> (en üstteki işlenir)</div><div class="pd-stack">${f.stack.map((x, i) => `<div class="${i === 0 ? 'top' : ''}">${TR[x]}</div>`).join('') || '<div>(boş)</div>'}</div><div class="mini"><b>Plan</b></div><div class="gplan">${f.plan.map((x, i) => `<span class="gcard">${i + 1}. ${TR[x]}</span>`).join('<span class="garrow">→</span>') || '<span class="gchip off">henüz boş</span>'}</div>`;
      note.innerHTML = f.note;
    }, { speed: 1 });
    const build = () => fp.load(htnFrames(world).F);
    const boxes = Object.keys(world).map(k => el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { world[k] = e.target.checked; build(); } }); cb.checked = world[k]; return cb; })(), ' ' + NAMES[k]));
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('b', null, 'Dünya: '), ...boxes), view, SL.transport(fp, { min: 0.5, max: 6 }), note);
    build();
    return { stop: () => fp.pause() };
  };

  /* ---------- başlık ---------- */
  D.titlegoap = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const steps = ['Cephane al', 'Şarjör tak', 'Kapıdan geç', 'Ateş et', '🎯'];
    let t = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const k = Math.floor(t / 22) % (steps.length + 2);
      steps.forEach((s, i) => {
        const x = 640 + i * 128, y = 120, on = i < k;
        ctx.fillStyle = on ? 'rgba(109,255,176,0.9)' : 'rgba(170,170,230,0.25)'; ctx.shadowColor = '#6dffb0'; ctx.shadowBlur = on ? 14 : 0;
        ctx.beginPath(); ctx.roundRect(x - 56, y - 22, 112, 44, 10); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = on ? '#08110c' : 'rgba(230,230,255,0.7)'; ctx.font = '700 15px "Source Sans 3"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y);
        if (i < steps.length - 1) { ctx.fillStyle = 'rgba(230,230,255,0.6)'; ctx.fillText('→', x + 64, y); }
      });
    };
    const tick = () => { if (!running) return; t++; draw(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
