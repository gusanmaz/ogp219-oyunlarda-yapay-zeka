/* "Davranış Ağaçları" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();

  /* ================= küçük bir davranış ağacı motoru =================
     Düğüm: { type: 'sel'|'seq'|'cond'|'act'|'not', name, kids, key, action }
     tick → 'SUCCESS' | 'FAILURE' | 'RUNNING';  ctx.action: çalışan eylem */
  let nid = 0;
  const mk = (type, name, extra) => Object.assign({ id: ++nid, type, name }, extra);
  const sel = (name, ...kids) => mk('sel', name, { kids });
  const seq = (name, ...kids) => mk('seq', name, { kids });
  const cond = (name, key) => mk('cond', name, { key });
  const act = (name, action) => mk('act', name, { action });
  const not = (name, kid) => mk('not', name, { kids: [kid] });
  SL.BT = { sel, seq, cond, act, not };

  function tick(n, s, ctx, trace) {
    let r;
    if (n.type === 'cond') r = s[n.key] ? 'SUCCESS' : 'FAILURE';
    else if (n.type === 'act' && n.ok !== undefined) r = n.ok === true || s[n.ok] ? 'SUCCESS' : 'FAILURE';   // anında biten eylem
    else if (n.type === 'act') { r = 'RUNNING'; ctx.action = n.action; }
    else if (n.type === 'not') { const c = tick(n.kids[0], s, ctx, trace); r = c === 'SUCCESS' ? 'FAILURE' : c === 'FAILURE' ? 'SUCCESS' : c; }
    else if (n.type === 'seq') { r = 'SUCCESS'; for (const k of n.kids) { const c = tick(k, s, ctx, trace); if (c !== 'SUCCESS') { r = c; break; } } }
    else { r = 'FAILURE'; for (const k of n.kids) { const c = tick(k, s, ctx, trace); if (c !== 'FAILURE') { r = c; break; } } }
    if (trace) trace.push([n.id, r]);
    return r;
  }
  SL.btTick = tick;

  /* ---------- nöbetçi ağacı ---------- */
  const makeGuardTree = () => {
    nid = 0;
    return sel('Kök',
      seq('Kaç', cond('can az mı?', 'lowHp'), act('Kaç, iyileş', 'KAC')),
      seq('Saldır', cond('görüyor mu?', 'sees'), cond('yakın mı?', 'close'), act('Ateş et', 'SALDIR')),
      seq('Kovala', cond('görüyor mu?', 'sees'), act('Koş', 'KOVALA')),
      seq('Araştır', cond('iz var mı?', 'clue'), act('İze git', 'SUPHE')),
      act('Devriye gez', 'DEVRIYE'));
  };
  /* algıdan ağacın koşullarına: biraz HAFIZA ile (histerezis + iz) */
  const makeBrain = (tree, onTick) => {
    const mem = { clueUntil: -1, t: 0 };
    return (prev, s) => {
      mem.t += 1 / 60;
      if (s.heardNoise) mem.clueUntil = mem.t + 4;
      if ((prev === 'KOVALA' || prev === 'SALDIR') && !s.seesPlayer) mem.clueUntil = mem.t + 4;   // son görülen yer
      const c = {
        lowHp: s.hp < (prev === 'KAC' ? 70 : 30),           // kaçarken 70’e kadar kaç
        sees: s.seesPlayer,
        close: s.dist < (prev === 'SALDIR' ? 90 : 60),      // histerezis
        clue: mem.t < mem.clueUntil
      };
      const ctx = { action: null }, trace = [];
      tick(tree, c, ctx, trace);
      if (onTick) onTick(trace, c, ctx.action);
      return ctx.action || 'DEVRIYE';
    };
  };

  /* ---------- ağacı SVG olarak çiz ---------- */
  function layout(tree) {
    const pos = {}; let leaf = 0, maxD = 0;
    const walk = (n, d) => { maxD = Math.max(maxD, d); if (!n.kids || !n.kids.length) { pos[n.id] = [leaf++, d]; return; } n.kids.forEach(k => walk(k, d + 1)); const xs = n.kids.map(k => pos[k.id][0]); pos[n.id] = [(Math.min(...xs) + Math.max(...xs)) / 2, d]; };
    walk(tree, 0);
    return { pos, leaves: leaf, depth: maxD };
  }
  const colOf = (st, t) => (st === 'SUCCESS' ? t.green : st === 'FAILURE' ? t.red : st === 'RUNNING' ? t.amber : st === 'ENTER' ? t.blue : t.rule);
  const STXT = { SUCCESS: '✓ başarılı', FAILURE: '✗ başarısız', RUNNING: '⏳ çalışıyor', ENTER: '…' };
  const ICON = { sel: '?', seq: '→', not: '!', cond: '◆', act: '▶' };
  /* dar alanlar için girintili (dikey) görünüm */
  function treeOutline(tree, st) {
    const t = T(); let h = '';
    const row = (n, d) => {
      const s = st[n.id], c = s ? colOf(s, t) : null;
      const sty = s ? `background:${c};border-color:${c};color:${s === 'RUNNING' ? '#111' : '#fff'}` : '';
      h += `<div class="bto-row" style="padding-left:${d * 22}px"><span class="bto-pill ${n.type}" style="${sty}">${ICON[n.type]} ${n.name}</span>${s ? `<span class="bto-st" style="color:${c}">${STXT[s]}</span>` : ''}</div>`;
      (n.kids || []).forEach(k => row(k, d + 1));
    };
    row(tree, 0);
    return `<div class="bt-outline">${h}</div>`;
  }
  /* tek satır: bu tick’te ziyaret edilen düğümler, sırayla */
  function pathLine(tree, st) {
    const t = T(), out = [];
    const walk = n => { if (!(n.id in st)) return; if (n.type === 'cond' || n.type === 'act') out.push(`<span style="background:${colOf(st[n.id], t)};${st[n.id] === 'RUNNING' ? 'color:#111' : ''}">${ICON[n.type]} ${n.name}</span>`); (n.kids || []).forEach(walk); };
    walk(tree);
    return `<div class="bt-path"><b>bu tick:</b> ${out.join(' ')}</div>`;
  }
  function treeSVG(tree, statuses, o = {}) {
    const t = T(), L = layout(tree), W = o.W || 1160, H = o.H || 300, mx = 70;
    const X = i => mx + (L.leaves > 1 ? (i * (W - 2 * mx)) / (L.leaves - 1) : (W - 2 * mx) / 2), Y = d => 34 + (d * (H - 70)) / Math.max(1, L.depth);
    let s = '';
    const edges = n => (n.kids || []).forEach(k => { const [x1, d1] = L.pos[n.id], [x2, d2] = L.pos[k.id], on = statuses[k.id]; s += `<line x1="${X(x1)}" y1="${Y(d1) + 16}" x2="${X(x2)}" y2="${Y(d2) - 16}" stroke="${on ? colOf(on, t) : t.rule}" stroke-width="${on ? 3 : 1.5}"/>`; edges(k); });
    edges(tree);
    const nodes = n => {
      const [xi, d] = L.pos[n.id], x = X(xi), y = Y(d), st = statuses[n.id], col = colOf(st, t), fill = st ? col : t.card, ink = st ? (st === 'RUNNING' ? '#111' : '#fff') : t.ink;
      if (n.type === 'sel' || n.type === 'seq') { s += `<rect x="${x - 22}" y="${y - 16}" width="44" height="32" rx="6" fill="${fill}" stroke="${st ? col : t['ink-2']}" stroke-width="2.5"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-size="19" font-weight="900" fill="${ink}">${n.type === 'sel' ? '?' : '→'}</text><text x="${x}" y="${y - 22}" text-anchor="middle" font-size="12" font-weight="700" fill="${t.muted}">${n.name}</text>`; }
      else if (n.type === 'not') { s += `<polygon points="${x},${y - 18} ${x + 20},${y} ${x},${y + 18} ${x - 20},${y}" fill="${fill}" stroke="${st ? col : t['ink-2']}" stroke-width="2.5"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="900" fill="${ink}">!</text>`; }
      else { const w = Math.max(70, n.name.length * 7 + 14); const r = n.type === 'cond' ? 16 : 6; s += `<rect x="${x - w / 2}" y="${y - 16}" width="${w}" height="32" rx="${r}" fill="${fill}" stroke="${st ? col : n.type === 'cond' ? t.blue : t.purple}" stroke-width="2.5"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="12" font-weight="700" fill="${ink}">${n.name}</text>`; }
      (n.kids || []).forEach(nodes);
    };
    nodes(tree);
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%" font-family="Source Sans 3">${s}</svg>`;
  }
  SL.btTreeSVG = treeSVG;
  const LEGEND_HTML = '<div class="bt-legend"><span style="--c:var(--green)">başarılı (SUCCESS)</span><span style="--c:var(--red)">başarısız (FAILURE)</span><span style="--c:var(--amber)">çalışıyor (RUNNING)</span><span style="--c:var(--rule)">bu tick’te ziyaret edilmedi</span><span>? = selector · → = sequence · yuvarlak = koşul · köşeli = eylem</span></div>';
  const legend = (extra = '') => { const d = el('div'); d.innerHTML = LEGEND_HTML.replace('<span style="--c:var(--rule)">', extra + '<span style="--c:var(--rule)">'); return d.firstChild; };

  /* ---------- canlı: davranış ağaçlı nöbetçi ---------- */
  D.btguard = function (root) {
    const tree = makeGuardTree();
    const diag = el('div', { class: 'gv-side' }), info = el('div', { class: 'sv-counters' });
    let last = {};
    const brain = makeBrain(tree, (trace, c) => {
      last = Object.fromEntries(trace);
      info.innerHTML = Object.entries({ 'can az': c.lowHp, 'görüyor': c.sees, 'yakın': c.close, 'iz var': c.clue }).map(([k, v]) => `<span class="cnt">${k}: <b class="${v ? 'c-green' : 'c-red'}">${v ? 'evet' : 'hayır'}</b></span>`).join('');
    });
    const sim = SL.makeGuardArena({ decide: brain, displayW: 660, onDraw: () => { diag.innerHTML = treeOutline(tree, last); } });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('🔫 Nöbetçiye ateş et (−25 can)', () => sim.shoot(), 'primary'), el('span', { class: 'mini' }, 'Fare = oyuncu · tıkla = ses çıkar · ağaç her karede KÖKTEN yeniden değerlendiriliyor')),
      el('div', { class: 'gv-row' }, el('div', { style: 'flex:none' }, sim.world.canvas, info), diag), sim.world.controls());
    sim.world.reset();
    return { start: () => sim.world.start(), stop: () => sim.world.stop() };
  };

  /* ---------- adım adım tick izleyici ---------- */
  D.bttrace = function (root) {
    const tree = makeGuardTree();
    const senses = { lowHp: false, sees: true, close: false, clue: false };
    const diag = el('div', { class: 'bt-diag' }), note = el('div', { class: 'sv-note tree-note' });
    const NAMES = { lowHp: 'canım az', sees: 'oyuncuyu görüyorum', close: 'yakın', clue: 'iz var' };
    const DESC = { sel: 'Selector: çocuklarını soldan dener; biri BAŞARISIZ değilse durur', seq: 'Sequence: çocuklarını soldan çalıştırır; biri BAŞARILI değilse durur', cond: 'Koşul', act: 'Eylem', not: 'Ters çevirici' };
    const build = () => {
      const ctx = { action: null };
      // ziyaret sırasını “giriş” anlarıyla birlikte kaydetmek için ikinci bir yürüyüş
      const order = [];
      const visit = (n) => { order.push(['enter', n]); let r; if (n.type === 'cond') r = senses[n.key] ? 'SUCCESS' : 'FAILURE'; else if (n.type === 'act') { r = 'RUNNING'; ctx.action = n.action; } else if (n.type === 'seq') { r = 'SUCCESS'; for (const k of n.kids) { const c = visit(k); if (c !== 'SUCCESS') { r = c; break; } } } else if (n.type === 'sel') { r = 'FAILURE'; for (const k of n.kids) { const c = visit(k); if (c !== 'FAILURE') { r = c; break; } } } else { const c = visit(n.kids[0]); r = c === 'SUCCESS' ? 'FAILURE' : c === 'FAILURE' ? 'SUCCESS' : c; } order.push(['exit', n, r]); return r; };
      visit(tree);
      const F = [], st = {};
      F.push({ st: {}, note: 'Tick başlıyor: kökten başla.' });
      order.forEach(([k, n, r]) => {
        if (k === 'enter') { st[n.id] = 'ENTER'; F.push({ st: Object.assign({}, st), cur: n.id, note: `▶ “${n.name}” (${DESC[n.type]}${n.type === 'cond' ? ': ' + NAMES[n.key] + '?' : ''})` }); }
        else { st[n.id] = r; F.push({ st: Object.assign({}, st), cur: n.id, note: `◀ “${n.name}” → ${r === 'SUCCESS' ? 'BAŞARILI' : r === 'FAILURE' ? 'BAŞARISIZ' : 'ÇALIŞIYOR'}` }); }
      });
      F.push({ st: Object.assign({}, st), note: `Tick bitti. Seçilen eylem: ${SL.GUARD_NAMES[ctx.action] || ctx.action}. (Bir sonraki karede her şey yeniden, kökten.)` });
      fp.load(F);
    };
    const fp = new SL.FramePlayer(f => { diag.innerHTML = treeSVG(tree, f.st, { H: 250 }); note.textContent = f.note; }, { speed: 2 });
    const boxes = Object.keys(senses).map(k => el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { senses[k] = e.target.checked; build(); } }); cb.checked = senses[k]; return cb; })(), ' ' + NAMES[k]));
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('b', null, 'Algı: '), ...boxes), diag, legend('<span style="--c:var(--blue)">şu an değerlendiriliyor</span>'), SL.transport(fp, { min: 0.5, max: 8 }), note);
    build(); SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  /* ---------- kapı örneği: selector = B planı, sequence = tarif ---------- */
  D.btdoor = function (root) {
    nid = 500;
    const okAct = (name, ok) => mk('act', name, { action: name, ok });
    const tree = sel('Odaya gir',
      seq('Kapıdan gir', cond('kapı açık mı?', 'open'), okAct('İçeri yürü', true)),
      seq('Anahtarla', cond('anahtar var mı?', 'key'), okAct('Kilidi aç', true), okAct('İçeri yürü', true)),
      seq('Kır', okAct('Kapıyı tekmele', 'weak'), okAct('İçeri yürü', true)));
    const s = { open: false, key: false, weak: true };
    const NAMES = { open: 'kapı açık', key: 'anahtar cebimde', weak: 'kapı çürük (tekme işe yarar)' };
    const diag = el('div', { class: 'bt-diag' }), out = el('div', { class: 'sv-note' });
    const run = () => {
      const tr = []; const r = tick(tree, s, { action: null }, tr);
      diag.innerHTML = treeSVG(tree, Object.fromEntries(tr), { H: 230 });
      out.innerHTML = r === 'SUCCESS' ? '✅ Kök BAŞARILI: karakter odaya girdi. Yeşil yol hangi planın işe yaradığını gösteriyor.' : '❌ Kök BAŞARISIZ: üç planın üçü de başarısız oldu — üst düğüm (ör. “Kaç”) başka bir şey denemeli.';
    };
    const boxes = Object.keys(s).map(k => el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { s[k] = e.target.checked; run(); } }); cb.checked = s[k]; return cb; })(), ' ' + NAMES[k]));
    root.append(el('div', { class: 'sv-controls' }, el('b', null, 'Dünya: '), ...boxes), diag, legend(), out);
    run(); SL.onTheme(run);
  };

  /* ---------- statik görünüm: FSM’deki nöbetçinin ağaç hâli ---------- */
  D.btstatic = function (root) {
    const tree = makeGuardTree(), d = el('div', { class: 'bt-diag' });
    root.append(d);
    const draw = () => { d.innerHTML = treeSVG(tree, {}, { H: 240 }); };
    draw(); SL.onTheme(draw);
  };

  /* ---------- başlık ---------- */
  D.titlebt = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const pts = []; const add = (x, y, d, p) => { pts.push({ x, y, d, p }); };
    // basit ikili/üçlü ağaç
    const build = (x, y, d, w, p) => { const i = pts.length; add(x, y, d, p); if (d < 3) { const n = d === 0 ? 3 : 2; for (let k = 0; k < n; k++) build(x - w / 2 + (w * (k + 0.5)) / n, y + 52, d + 1, w / n, i); } };
    build(980, 22, 0, 560, -1);
    let t = 0, timer, running = false, path = [];
    const pick = () => { path = [0]; let cur = 0; for (;;) { const kids = pts.map((p, i) => [p, i]).filter(([p]) => p.p === cur); if (!kids.length) break; cur = kids[Math.floor(Math.random() * kids.length)][1]; path.push(cur); } };
    pick();
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach((p, i) => { if (p.p >= 0) { const q = pts[p.p], on = path.indexOf(i) >= 0 && path.indexOf(i) <= t / 8; ctx.strokeStyle = on ? 'rgba(120,255,180,0.9)' : 'rgba(170,170,230,0.3)'; ctx.lineWidth = on ? 3 : 1.5; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke(); } });
      pts.forEach((p, i) => { const k = path.indexOf(i), on = k >= 0 && k <= t / 8; ctx.fillStyle = on ? (k === path.length - 1 ? '#ffd27a' : '#6dffb0') : 'rgba(170,170,230,0.6)'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = on ? 12 : 0; ctx.beginPath(); ctx.arc(p.x, p.y, p.d === 3 ? 6 : 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0; });
    };
    const tick2 = () => { if (!running) return; t++; if (t > 60) { t = 0; pick(); } draw(); timer = setTimeout(tick2, 40); };
    return { start() { if (!running) { running = true; tick2(); } }, stop() { running = false; clearTimeout(timer); } };
  };

  /* ---------- simlab: ağacı sen kur ---------- */
  SL.SIMLABS.bt = function (box, api) {
    let tree = makeGuardTree();
    const diag = el('div');
    let last = {};
    const sim = SL.makeGuardArena({ decide: (p, s) => 'DEVRIYE', displayW: 540, onBad: v => api.setMsg('err', '⚠️ Ağaç geçerli bir eylem seçmedi: ' + JSON.stringify(v)), onDraw: () => { diag.innerHTML = pathLine(tree, last); } });
    box.append(sim.world.canvas, diag, sim.world.controls({ speed: false }));
    sim.world.reset();
    const scope = {
      sel: (name, ...kids) => { if (typeof name !== 'string') { kids.unshift(name); name = 'seçici'; } return mk('sel', name, { kids }); },
      seq: (name, ...kids) => { if (typeof name !== 'string') { kids.unshift(name); name = 'sıra'; } return mk('seq', name, { kids }); },
      cond: key => mk('cond', key + '?', { key }),
      act: action => mk('act', action, { action }),
      not: kid => mk('not', 'değil', { kids: [kid] })
    };
    return {
      world: sim.world, scope,
      setFns(f) {
        nid = 1000;
        try { tree = f.buildTree(); } catch (e) { return; }
        sim.setDecide(makeBrain(tree, trace => { last = Object.fromEntries(trace); }));
        sim.world.reset(); sim.world.playing = true; sim.world.syncBtn && sim.world.syncBtn();
      },
      check(mod) {
        let t; nid = 2000;
        try { t = mod.buildTree(); } catch (e) { return { ok: false, msg: '⚠️ buildTree hata verdi: ' + SL.jsErrorText(e) }; }
        if (!t || !t.type) return { ok: false, msg: '⚠️ buildTree bir ağaç (sel/seq/... ile kurulmuş düğüm) döndürmeli.' };
        const ref = makeGuardTree();
        for (const lowHp of [false, true]) for (const sees of [false, true]) for (const close of [false, true]) for (const clue of [false, true]) {
          const c = { lowHp, sees, close, clue }, a = { action: null }, b = { action: null };
          tick(t, c, a); tick(ref, c, b);
          if (a.action !== b.action) return { ok: false, msg: `❌ Algı ${JSON.stringify(c)} için beklenen eylem ${b.action}, senin ağacın ${a.action}. (Öncelik sırasını kontrol edin.)` };
        }
        return { ok: true, msg: '✅ 16/16 algı birleşiminde doğru eylem — simülasyonda izleyin!' };
      }
    };
  };

  /* ---------- ailab: tick fonksiyonunu yaz (Python/JS) ---------- */
  const refTick = (node, s) => {
    const [ty] = node;
    if (ty === 'cond') return [s[node[1]] ? 'SUCCESS' : 'FAILURE', null];
    if (ty === 'act') return ['RUNNING', node[1]];
    if (ty === 'not') { const r = refTick(node[1], s); return [r[0] === 'SUCCESS' ? 'FAILURE' : r[0] === 'FAILURE' ? 'SUCCESS' : r[0], r[1]]; }
    if (ty === 'seq') { for (const k of node[1]) { const r = refTick(k, s); if (r[0] !== 'SUCCESS') return r; } return ['SUCCESS', null]; }
    for (const k of node[1]) { const r = refTick(k, s); if (r[0] !== 'FAILURE') return r; } return ['FAILURE', null];
  };
  const GT = ['sel', [['seq', [['cond', 'low_hp'], ['act', 'KAC']]], ['seq', [['cond', 'sees'], ['cond', 'close'], ['act', 'SALDIR']]], ['seq', [['cond', 'sees'], ['act', 'KOVALA']]], ['seq', [['cond', 'clue'], ['act', 'SUPHE']]], ['act', 'DEVRIYE']]];
  SL.AILABS.bttick = {
    fn: 'tick', jsFn: 'tick', ref: refTick,
    cases: () => {
      const cs = [];
      const rnd = () => ({ low_hp: Math.random() < 0.3, sees: Math.random() < 0.5, close: Math.random() < 0.5, clue: Math.random() < 0.5 });
      for (let i = 0; i < 16; i++) cs.push([GT, { low_hp: !!(i & 1), sees: !!(i & 2), close: !!(i & 4), clue: !!(i & 8) }]);
      cs.push([['not', ['cond', 'sees']], { sees: true }], [['seq', [['cond', 'sees'], ['not', ['cond', 'close']], ['act', 'KOVALA']]], { sees: true, close: false }], [['sel', [['cond', 'sees'], ['act', 'DEVRIYE']]], { sees: true }], [['seq', []], {}], [['sel', []], {}]);
      for (let i = 0; i < 10; i++) cs.push([GT, rnd()]);
      return cs;
    },
    show: (n, s) => `ağaç ${n === GT ? '(nöbetçi ağacı)' : JSON.stringify(n)}, algı ${JSON.stringify(s)}`,
    hint: n => (n[0] === 'not' ? 'Ters çevirici: SUCCESS↔FAILURE, RUNNING aynen kalır.' : 'Sequence: SUCCESS olmayan ilk çocukta dur. Selector: FAILURE olmayan ilk çocukta dur. Boş sequence = SUCCESS, boş selector = FAILURE.')
  };
})();
