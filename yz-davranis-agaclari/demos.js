/* "Davranış Ağaçları" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
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
  const dec = (name, icon, kid) => mk('dec', name, { icon, kids: [kid] });
  const par = (name, ...kids) => mk('par', name, { kids });
  SL.BT = { sel, seq, cond, act, not, dec, par };

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
    const t = T(), L = layout(tree), W = o.W || 1160, H = o.H || 300;
    const leaves = []; (function lw(n) { if (!n.kids || !n.kids.length) leaves.push(n); else n.kids.forEach(lw); })(tree);
    const half = n => (n.type === 'cond' || n.type === 'act' ? Math.max(70, n.name.length * 7 + 14) / 2 : 24) + 6, mx = Math.max(70, half(leaves[0]), half(leaves[leaves.length - 1]));   // kenardaki yaprak etiketi tuvale yapışmasın
    const X = i => mx + (L.leaves > 1 ? (i * (W - 2 * mx)) / (L.leaves - 1) : (W - 2 * mx) / 2), Y = d => 34 + (d * (H - 70)) / Math.max(1, L.depth);
    let s = '';
    const edges = n => (n.kids || []).forEach(k => { const [x1, d1] = L.pos[n.id], [x2, d2] = L.pos[k.id], on = statuses[k.id]; s += `<line x1="${X(x1)}" y1="${Y(d1) + 16}" x2="${X(x2)}" y2="${Y(d2) - 16}" stroke="${on ? colOf(on, t) : t.rule}" stroke-width="${on ? 3 : 1.5}"/>`; edges(k); });
    edges(tree);
    const nodes = n => {
      const [xi, d] = L.pos[n.id], x = X(xi), y = Y(d), st = statuses[n.id], col = colOf(st, t), fill = st ? col : t.card, ink = st ? (st === 'RUNNING' ? '#111' : '#fff') : t.ink;
      if (o.badges && o.badges[n.id]) s += `<circle cx="${x - 30}" cy="${y - 20}" r="11" fill="${t.ink}"/><text x="${x - 30}" y="${y - 16}" text-anchor="middle" font-size="12" font-weight="800" fill="${t.card}">${o.badges[n.id]}</text>`;
      if (o.notes && o.notes[n.id]) s += `<text x="${x}" y="${y + 34}" text-anchor="middle" font-size="12" fill="${t['ink-2']}" stroke="${t.bg || t.card}" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${o.notes[n.id]}</text>`;
      if (n.type === 'par') { s += `<rect x="${x - 22}" y="${y - 16}" width="44" height="32" rx="6" fill="${fill}" stroke="${st ? col : t['ink-2']}" stroke-width="2.5"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-size="19" font-weight="900" fill="${ink}">⇉</text><text x="${x}" y="${y - 22}" text-anchor="middle" font-size="12" font-weight="700" fill="${t.muted}" stroke="${t.bg || t.card}" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${n.name}</text>`; }
      else if (n.type === 'dec') { s += `<polygon points="${x},${y - 18} ${x + 24},${y} ${x},${y + 18} ${x - 24},${y}" fill="${fill}" stroke="${st ? col : t['ink-2']}" stroke-width="2.5"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="900" fill="${ink}">${n.icon || '◇'}</text><text x="${x + 30}" y="${y + 4}" font-size="12" font-weight="700" fill="${t.muted}">${n.name}</text>`; }
      else if (n.type === 'sel' || n.type === 'seq') { s += `<rect x="${x - 22}" y="${y - 16}" width="44" height="32" rx="6" fill="${fill}" stroke="${st ? col : t['ink-2']}" stroke-width="2.5"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-size="19" font-weight="900" fill="${ink}">${n.type === 'sel' ? '?' : '→'}</text><text x="${x}" y="${y - 22}" text-anchor="middle" font-size="12" font-weight="700" fill="${t.muted}" stroke="${t.bg || t.card}" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${n.name}</text>`; }
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


  /* ---------- sunumdaki “Çizimle” slaytları: aynı gösterimle sabit ağaç resimleri ---------- */
  D.btfig = function (root) {
    const B = SL.BT, kind = root.dataset.fig, box = el('div', { class: 'btfig' });
    const panel = (title, tree, st, o = {}) => { const d = el('div', { class: 'btfig-p' }); d.innerHTML = `<div class="btfig-t">${title}</div>` + treeSVG(tree, st, Object.assign({ W: o.W || 420, H: o.H || 230 }, o)) + (o.cap ? `<div class="btfig-c">${o.cap}</div>` : ''); return d; };
    const draw = () => {
      box.innerHTML = '';
      if (kind === 'dekorator') {
        let c1, n1, a1, q1; const t1 = q1 = B.seq('', n1 = B.not('', c1 = B.cond('oyuncu görünüyor?', 'x')), a1 = B.act('devriye gez', 'x'));
        let c2, d2, a2, q2; const t2 = q2 = B.seq('', c2 = B.cond('mesafe < 20?', 'x'), d2 = B.dec('8 sn', '⏱️', a2 = B.act('el bombası at', 'x')));
        let d3, a3; const t3 = d3 = B.dec('mermi bitene dek', '🔁', a3 = B.act('ateş et', 'x'));
        box.append(panel('Inverter (!): cevabı ters çevirir', t1, { [c1.id]: 'FAILURE', [n1.id]: 'SUCCESS', [a1.id]: 'RUNNING', [q1.id]: 'RUNNING' }, { W: 330, H: 250, cap: 'oyuncu görünmüyor (✗) → ! onu ✓ yapar → devriye çalışır' }),
          panel('Cooldown (⏱️): yakın zamanda çalıştıysa kapalı', t2, { [c2.id]: 'SUCCESS', [d2.id]: 'FAILURE', [q2.id]: 'FAILURE' }, { W: 330, H: 250, cap: 'son bomba 3 sn önce: ⏱️ 8 sn dolmadı → ✗, el bombası atılmaz' }),
          panel('Repeat (🔁): çocuğu tekrar tekrar çalıştırır', t3, { [a3.id]: 'RUNNING', [d3.id]: 'RUNNING' }, { W: 330, H: 250, cap: 'ateş et her bitişte yeniden başlar; mermi bitince 🔁 durur' }));
      } else if (kind === 'paralel') {
        let p, a, b; const t = p = B.par('Parallel', a = B.act('hedefe yürü', 'x'), b = B.act('etrafı tara', 'x'));
        let s1, c1, e1; const u = s1 = B.seq('', c1 = B.cond('mermim var mı?', 'x'), e1 = B.act('ateş et', 'x'));
        box.append(panel('Parallel (⇉): çocukların hepsi aynı karede', t, { [p.id]: 'RUNNING', [a.id]: 'RUNNING', [b.id]: 'RUNNING' }, { cap: 'yürürken bir yandan tarar; kural: “biri bitince ben de bittim”' }),
          panel('Yaprak türleri', u, { [c1.id]: 'SUCCESS', [e1.id]: 'RUNNING', [s1.id]: 'RUNNING' }, { cap: 'mavi yuvarlak = koşul (anında ✓/✗) · mor köşeli = eylem (birkaç kare ⏳)' }));
      } else if (kind === 'tick') {
        let r, q1, c1, a1, q2, c2, a2, a3;
        const t = r = B.sel('kök', q1 = B.seq('', c1 = B.cond('canım az mı?', 'x'), a1 = B.act('kaç', 'x')), q2 = B.seq('', c2 = B.cond('oyuncuyu görüyor mu?', 'x'), a2 = B.act('kovala', 'x')), a3 = B.act('devriye', 'x'));
        box.append(panel('Bir tick: kökten başla, soldan sağa, derinlik öncelikli', t, { [r.id]: 'RUNNING', [q1.id]: 'FAILURE', [c1.id]: 'FAILURE', [q2.id]: 'RUNNING', [c2.id]: 'SUCCESS', [a2.id]: 'RUNNING' },
          { W: 1060, H: 250, badges: { [r.id]: 1, [q1.id]: 2, [c1.id]: 3, [q2.id]: 4, [c2.id]: 5, [a2.id]: 6 }, notes: { [a1.id]: 'atlandı', [a3.id]: 'sorulmadı' }, cap: '① kök → ② ilk sequence → ③ “canım az mı?” ✗ → sequence ✗, selector sonraki çocuğa → ④ ikinci sequence → ⑤ “görüyor mu?” ✓ → ⑥ “kovala” ⏳: bu karenin işi kovalamak; “devriye”ye hiç bakılmadı' }));
      } else if (kind === 'running') {
        const mkT = () => { let q, a, b, c; const t = q = B.seq('', a = B.act('nişan al', 'x'), b = B.act('ateş et', 'x'), c = B.act('şarjör değiştir', 'x')); return { t, q, a, b, c }; };
        const R = mkT(), M = mkT();
        box.append(panel('Reaktif: her tick baştan', R.t, { [R.q.id]: 'RUNNING', [R.a.id]: 'RUNNING' }, { W: 520, cap: '“nişan al” geçen tick bitmişti ama yine baştan çalışıyor: koşullar tazelenir, ama iş tekrar edilir' }),
          panel('Hafızalı: kaldığı yerden', M.t, { [M.q.id]: 'RUNNING', [M.a.id]: 'SUCCESS', [M.b.id]: 'RUNNING' }, { W: 520, notes: { [M.a.id]: 'hatırlandı' }, cap: '“nişan al” hatırlanıyor, sıra “ateş et”te: verimli, ama arada hedef kaybolduysa fark edilmez' }));
      }
      box.append(legend());
    };
    root.append(box); draw(); SL.onTheme(draw);
  };
  /* ---------- canlı: davranış ağaçlı nöbetçi ---------- */
  D.btguard = function (root) {
    const tree = makeGuardTree();
    const diag = el('div', { class: 'gv-side' }), info = el('div', { class: 'sv-counters' });
    let last = {};
    const sayac = c => Object.entries({ 'can az': c.lowHp, 'görüyor': c.sees, 'yakın': c.close, 'iz var': c.clue }).map(([k, v]) => `<span class="cnt">${k}: <b class="${v ? 'c-green' : 'c-red'}">${v ? 'evet' : 'hayır'}</b></span>`).join('');
    const brain = makeBrain(tree, (trace, c) => {
      last = Object.fromEntries(trace);
      info.innerHTML = sayac(c);
    });
    // iki görünüm: "ağaç" (alan küçülür, altta tam genişlikte ağaç) ve "liste" (alan büyük, sağda girintili liste)
    let view = 'tree';
    const treeBox = el('div', { class: 'bt-diag' }), hint = el('div', { class: 'gv-side' });
    const sim = SL.makeGuardArena({ decide: brain, displayW: 660, onDraw: () => { if (view === 'tree') treeBox.innerHTML = treeSVG(tree, last, { H: 200 }); else diag.innerHTML = treeOutline(tree, last); } });
    hint.innerHTML = '<div class="box" style="margin:0;font-size:.82em"><span class="bt">Nasıl okunur?</span><ul><li>Alttaki ağaçta <b>renkli yol</b> = nöbetçinin bu karedeki kararı.</li><li><span class="c-green"><b>yeşil</b></span> koşul tuttu · <span class="c-red"><b>kırmızı</b></span> tutmadı · <span class="c-amber"><b>turuncu</b></span> çalışan eylem · soluk = hiç sorulmadı.</li><li>Soldaki dal = yüksek öncelik. Canı azalt (X): karar en sola kayar.</li></ul></div>';
    const apply = () => {
      const tr = view === 'tree';
      sim.world.canvas.style.width = (tr ? 470 : 660) + 'px';
      treeBox.style.display = tr ? '' : 'none'; hint.style.display = tr ? '' : 'none'; diag.style.display = tr ? 'none' : '';
      toggle.textContent = tr ? '☰ Liste görünümü' : '🌳 Ağaç görünümü';
      if (!sim.world.playing) sim.world.draw();
    };
    const toggle = btn('', () => { view = view === 'tree' ? 'list' : 'tree'; apply(); });
    root.setAttribute('data-prevent-swipe', '');
    const tasima = sim.world.controls(), oynat = tasima.querySelector('button');
    const satir = el('div', { class: 'gv-row' }, el('div', { style: 'flex:none' }, sim.world.canvas, info), diag, hint), alt = el('div', {}, treeBox);
    root.append(el('div', { class: 'sv-controls' }, btn('🔫 Ateş et (−25 can) · X tuşu', () => sim.shoot(), 'primary'), toggle, el('span', { class: 'mini' }, 'Fare = oyuncu · tıkla = ses · X = ateş · ağaç her karede KÖKTEN yeniden değerlendiriliyor')),
      satir, tasima, alt);
    apply();
    // Kaymaz: iki görünümün (ağaç / liste) büyüğü kadar yer; liste her düğümde her durum yazısıyla ölçülür
    // her durum yazısı (SÜRÜYOR / BAŞARISIZ / BAŞARILI) ayrı ayrı denenir; en uzunu satır kırdırabilir
    const durumlar = Object.keys(STXT).map(d => { const h = {}; (function w(n) { h[n.id] = d; (n.kids || []).forEach(w); })(tree); return h; });
    const yerAyir = () => {
      if (!root.clientWidth) return;
      const eskiV = view, eskiD = diag.innerHTML, eskiT = treeBox.innerHTML, eskiI = info.innerHTML;
      info.innerHTML = sayac({});   // sayaçlar ilk karede henüz boş olabilir: en uzun hâliyle (hepsi "hayır") ölç
      satir.style.minHeight = ''; alt.style.minHeight = '';
      // ▶ Oynat / ⏸ Durdur yazısı değişince arkadaki düğmeler yana kaymasın: düğme iki yazının genişi kadar
      if (oynat) { const y = oynat.textContent; oynat.style.minWidth = ''; let w = 0; for (const t of ['▶ Oynat', '⏸ Durdur']) { oynat.textContent = t; w = Math.max(w, oynat.getBoundingClientRect().width); } oynat.textContent = y; oynat.style.minWidth = Math.ceil(w) + 'px'; }
      let hS = 0, hA = 0;
      for (const v of ['list', 'tree']) {
        view = v; apply();
        for (const hepsi of durumlar) {
          if (v === 'list') diag.innerHTML = treeOutline(tree, hepsi); else treeBox.innerHTML = treeSVG(tree, hepsi, { H: 200 });
          hS = Math.max(hS, satir.getBoundingClientRect().height); hA = Math.max(hA, alt.getBoundingClientRect().height);
        }
      }
      view = eskiV; apply(); diag.innerHTML = eskiD; treeBox.innerHTML = eskiT; info.innerHTML = eskiI;
      satir.style.minHeight = Math.ceil(hS) + 'px'; alt.style.minHeight = Math.ceil(hA) + 'px';
    };
    let sonW = 0;
    const izle = () => { const w = root.clientWidth; if (w && w !== sonW) { sonW = w; yerAyir(); } };
    if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(izle)).observe(root);
    window.addEventListener('resize', izle); setTimeout(izle, 0);
    // yazı tipi ölçüm sırasında yükleniyor olabilir (ölçülen metin yeni bir yazı tipi ister): her yükleme bitince yeniden ölç
    if (document.fonts) { if (document.fonts.ready) document.fonts.ready.then(() => { sonW = 0; izle(); }); if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { sonW = 0; izle(); }); }
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
    const build = at => {   // at = 'end': algı kutusu değişince sonucu hemen göster (▶ ile baştan izlenebilir)
      const ctx = { action: null };
      // ziyaret sırasını “giriş” anlarıyla birlikte kaydetmek için ikinci bir yürüyüş
      const order = [];
      const visit = (n) => { order.push(['enter', n]); let r; if (n.type === 'cond') r = senses[n.key] ? 'SUCCESS' : 'FAILURE'; else if (n.type === 'act') { r = 'RUNNING'; ctx.action = n.action; } else if (n.type === 'seq') { r = 'SUCCESS'; for (const k of n.kids) { const c = visit(k); if (c !== 'SUCCESS') { r = c; break; } } } else if (n.type === 'sel') { r = 'FAILURE'; for (const k of n.kids) { const c = visit(k); if (c !== 'FAILURE') { r = c; break; } } } else { const c = visit(n.kids[0]); r = c === 'SUCCESS' ? 'FAILURE' : c === 'FAILURE' ? 'SUCCESS' : c; } order.push(['exit', n, r]); return r; };
      visit(tree);
      // her adımı düz Türkçeyle anlat: ne soruldu, cevap ne, bundan sonra ne olacak
      const par = {}; (function walk(n) { (n.kids || []).forEach(k => { par[k.id] = n; walk(k); }); })(tree);
      const evet = Object.keys(senses).map(k => `${NAMES[k]}: <b>${senses[k] ? 'evet' : 'hayır'}</b>`).join(' · ');
      const F = [], st = {};
      F.push({ st: {}, note: `<b>Soru:</b> algı şöyleyken (${evet}) nöbetçi ne yapmalı? Ağaç bunu <b>kökten</b> başlayıp dalları <b>soldan sağa</b> deneyerek bulur. “İleri ▶|” ile adım adım izleyin.` });
      order.forEach(([k, n, r]) => {
        const root0 = !par[n.id], underRoot = par[n.id] === tree;
        let t;
        if (k === 'enter') {
          st[n.id] = 'ENTER';
          if (n.type === 'sel') t = `<b>“${n.name}”</b> bir seçici (<b>?</b>): dallarını soldan sağa dener, işe yarayan <b>ilk</b> dalda durur.`;
          else if (n.type === 'seq') t = `Sıradaki dal: <b>“${n.name}”</b>. Bu bir dizi (<b>→</b>): önce koşullarını sorar; hepsi tutarsa eylemini yapar.`;
          else if (n.type === 'cond') t = `Soru: <b>“${n.name}”</b>`;
          else t = underRoot ? `Öndeki dalların hiçbiri tutmadı → son çare: <b>“${n.name}”</b>.` : `Koşulların hepsi tuttu → eylem: <b>“${n.name}”</b>.`;
        } else {
          st[n.id] = r;
          if (n.type === 'cond') t = r === 'SUCCESS' ? `“${n.name}” → <b class="c-green">EVET ✓</b>. Dizi bir sonraki adımına geçer.` : `“${n.name}” → <b class="c-red">HAYIR ✗</b>. Dizi burada durur; kalan adımlarına hiç bakmaz.`;
          else if (n.type === 'act') t = `“${n.name}” <b class="c-amber">çalışıyor ⏳</b> — nöbetçinin bu karedeki işi bu.`;
          else if (n.type === 'seq') t = r === 'FAILURE' ? `<b>“${n.name}” dalı tutmadı ✗</b> → kök sıradaki (bir sağdaki) dala geçer.` : `<b>“${n.name}” dalı çalışıyor ⏳</b> → kök burada durur; sağdaki dallara <b>hiç bakılmaz</b> (gri kalırlar).`;
          else t = root0 ? `Kök de yukarıya “${r === 'RUNNING' ? 'çalışıyor' : r === 'SUCCESS' ? 'başarılı' : 'başarısız'}” der: karar verildi.` : `“${n.name}” → ${r === 'SUCCESS' ? 'başarılı' : r === 'FAILURE' ? 'başarısız' : 'çalışıyor'}.`;
        }
        F.push({ st: Object.assign({}, st), cur: n.id, note: t });
      });
      F.push({ st: Object.assign({}, st), note: `<b>Sonuç:</b> nöbetçi bu karede <b>${SL.GUARD_NAMES[ctx.action] || ctx.action}</b> yapıyor. Renkli yol = verilen karar; gri düğümlere hiç bakılmadı. Sonraki karede her şey <b>yeniden kökten</b> sorulur — algı değiştiyse cevap da değişir.` });
      F.forEach((f, q) => { f.note = `<span style="opacity:.6">Adım ${q}/${F.length - 1} ·</span> ` + f.note; });
      fp.load(F, at);
    };
    const fp = new SL.FramePlayer(f => { diag.innerHTML = treeSVG(tree, f.st, { H: 250 }); note.innerHTML = f.note; }, { speed: 1 });
    const boxes = Object.keys(senses).map(k => el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { senses[k] = e.target.checked; build('end'); } }); cb.checked = senses[k]; return cb; })(), ' ' + NAMES[k]));
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('b', null, 'Algı: '), ...boxes), diag, legend('<span style="--c:var(--blue)">şu an değerlendiriliyor</span>'), SL.transport(fp, { min: 0.5, max: 8 }), note);
    build(); SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  /* ---------- kapı örneği: selector = B planı, sequence = tarif ---------- */
  /* ---------- senaryolu ağaç: aynı ağaç, farklı dünya → farklı yol ----------
     Düğümlere yes/no cümleleri eklenir; her senaryo bir dünya durumudur. */
  const C = (name, key, yes, no) => mk('cond', name, { key, yes, no });
  const A = (name, ok, yes, no) => mk('act', name, { action: name, ok, yes, no });
  function scenario(root, o) {
    const tree = o.tree, s = Object.assign({}, o.SC[o.start || 0][1]);
    const byId = {}; (function w(n) { byId[n.id] = n; (n.kids || []).forEach(w); })(tree);
    const say = (n, r) => {
      const ok = r === 'SUCCESS';
      if (n === tree) return ok ? o.win : o.fail;
      if (n.type === 'seq') return ok ? `<b>“${n.name}” planı tuttu.</b>` : `<b>“${n.name}” planı tutmadı</b> → sıradakine geç.`;
      return (ok ? n.yes : n.no) || n.name;
    };
    const story = el('div', { class: 'btd-story' }), diag = el('div', { class: 'bt-diag' }), log = el('div', { class: 'btd-log' }), moral = el('div', { class: 'btd-moral' });
    let trace = [], cur = 0;
    // günlük ve ders cümlesi: verilen iz ve adım için HTML (yer ayırma ölçümünde de kullanılır)
    const logHTML = (tr, k) => { const part = tr.slice(0, k); return part.length ? part.map(([id, r], i) => `<div class="${r === 'SUCCESS' ? 'l-ok' : 'l-no'}${i === k - 1 ? ' now' : ''}"><span>${r === 'SUCCESS' ? '✓' : '✗'}</span>${say(byId[id], r)}</div>`).join('') : '<div class="hint">▶ Oynat’a basın: ağaç yukarıdan aşağı, soldan sağa adım adım gezilecek.</div>'; };
    const moralHTML = (tr, k, st) => {
      if (k !== tr.length) return '';
      const visited = new Set(tr.map(x => x[0])), skipped = Object.values(byId).filter(n => !visited.has(n.id) && (n.type === 'cond' || n.type === 'act')).length;
      return '💡 ' + (o.moral ? o.moral(st, skipped, tr[tr.length - 1][1] === 'SUCCESS') : (skipped ? `Gri kalan <b>${skipped}</b> yaprağa sıra hiç gelmedi.` : 'Hiç gri düğüm yok: her şey denendi.'));
    };
    const draw = k => {
      const part = trace.slice(0, k);
      diag.innerHTML = treeSVG(tree, Object.fromEntries(part), { W: o.W || 800, H: o.H || 250 });
      log.innerHTML = logHTML(trace, k);
      const done = k === trace.length;
      moral.innerHTML = moralHTML(trace, k, s);
      if (k > 0 && k !== cur && SL.sfx) { const r = trace[k - 1][1] === 'SUCCESS'; try { SL.sfx(done ? (r ? 'alert' : 'lose') : r ? 'waka' : 'tak'); } catch (e) {} }
      cur = k;
    };
    const fp = new SL.FramePlayer(k => draw(k), { speed: 1.4 });
    const keys = Object.keys(o.NAMES), boxes = {};
    const load = (txt, play) => {
      trace = []; tick(tree, s, { action: null }, trace);
      story.innerHTML = '📖 ' + (txt || 'Kendi senaryonuz: ' + keys.map(k => (s[k] ? '✔ ' : '✘ ') + o.NAMES[k]).join(' · '));
      keys.forEach(k => (boxes[k].checked = !!s[k]));
      cur = 0; fp.load(Array.from({ length: trace.length + 1 }, (_, i) => i)); if (play) fp.play();
    };
    const scBtns = o.SC.map(([name, st, txt]) => { const b = btn(name, () => { Object.assign(s, st); scBtns.forEach(x => x.classList.remove('primary')); b.classList.add('primary'); load(txt, true); }); return b; });
    keys.forEach(k => { boxes[k] = el('input', { type: 'checkbox', onchange: e => { s[k] = e.target.checked; scBtns.forEach(x => x.classList.remove('primary')); load(null, true); } }); });
    // oynatıcı ve kutucuklar ayrı satırlarda; hız yazısının genişliği sabit (değer değişince satır kırılıp kaymasın)
    const tasima = SL.transport(fp, { min: 0.4, max: 6 }), hizYazi = tasima.querySelector('.ctl .mini');
    if (hizYazi) Object.assign(hizYazi.style, { display: 'inline-block', minWidth: '6.5em', fontVariantNumeric: 'tabular-nums' });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls btd-sc' }, ...scBtns), story,
      el('div', { class: 'btd-wrap' }, el('div', {}, diag, o.simple ? (() => { const d = el('div', { class: 'bt-legend' }); d.innerHTML = '<span style="--c:var(--green)">denendi, oldu</span><span style="--c:var(--red)">denendi, olmadı</span><span style="--c:var(--rule)">sıra ona hiç gelmedi</span>'; return d; })() : legend()), el('div', {}, log, moral)),
      el('div', { class: 'sv-controls' }, tasima), el('div', { class: 'sv-controls' }, el('span', { class: 'btd-own' }, 'Kendi senaryonuz: ', ...keys.map(k => el('label', { class: 'ctl' }, boxes[k], ' ' + o.NAMES[k])))));
    // Kaymaz: günlük + ders sütununa ve hikâye satırına, bütün dünya durumlarının (hazır senaryolar ve kutucukların
    // 2^n birleşimi) bütün adımlarındaki EN UZUN içerik kadar yer ayır; gerçek sütunun genişliği ve biçemleriyle ölçülür.
    const sutun = log.parentElement;
    const yerAyir = () => {
      const w = sutun.clientWidth; if (!w) return;
      if (getComputedStyle(sutun).position === 'static') sutun.style.position = 'relative';
      const olc = el('div', { style: `position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:${w}px` });
      const l2 = el('div', { class: 'btd-log' }), m2 = el('div', { class: 'btd-moral' }); olc.append(l2, m2); sutun.append(olc);
      let hL = 0, hM = 0;
      for (let b = 0; b < (1 << keys.length); b++) {
        const st = {}; keys.forEach((kk, i) => { st[kk] = !!(b & (1 << i)); });
        const tr = []; tick(tree, st, { action: null }, tr);
        for (let k = 0; k <= tr.length; k++) { l2.innerHTML = logHTML(tr, k); m2.innerHTML = moralHTML(tr, k, st); hL = Math.max(hL, l2.getBoundingClientRect().height); hM = Math.max(hM, m2.getBoundingClientRect().height); }
      }
      olc.remove(); log.style.minHeight = Math.ceil(hL) + 'px'; moral.style.minHeight = Math.ceil(hM) + 'px';
      const sw = story.clientWidth; if (sw) {
        const kap = story.parentElement; if (getComputedStyle(kap).position === 'static') kap.style.position = 'relative';
        const o2 = el('div', { class: 'btd-story', style: `position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:${sw}px` }); kap.append(o2);
        const metinler = o.SC.map(x => x[2]);
        for (let b = 0; b < (1 << keys.length); b++) metinler.push('Kendi senaryonuz: ' + keys.map((kk, i) => ((b & (1 << i)) ? '✔ ' : '✘ ') + o.NAMES[kk]).join(' · '));
        let h2 = 0; for (const t of metinler) { o2.innerHTML = '📖 ' + t; h2 = Math.max(h2, o2.getBoundingClientRect().height); }
        o2.remove(); story.style.minHeight = Math.ceil(h2) + 'px';
      }
    };
    let sonW = 0;
    const izle = () => { const w = sutun.clientWidth + story.clientWidth * 1000; if (sutun.clientWidth && w !== sonW) { sonW = w; yerAyir(); } };
    if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(izle)).observe(root);
    window.addEventListener('resize', izle); setTimeout(izle, 0);
    // yazı tipi ölçüm sırasında yükleniyor olabilir (ölçülen metin yeni bir yazı tipi ister): her yükleme bitince yeniden ölç
    if (document.fonts) { if (document.fonts.ready) document.fonts.ready.then(() => { sonW = 0; izle(); }); if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { sonW = 0; izle(); }); }
    const st = o.start || 0; scBtns[st].classList.add('primary'); load(o.SC[st][2], false);
    SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  }

  /* 1) yalnızca selector: acıkınca B planı listesi */
  D.btfood1 = function (root) {
    nid = 600;
    return scenario(root, {
      H: 230, W: 760, simple: true, start: 0,
      tree: sel('Karnını doyur',
        A('Dolaptakini ye', 'fridge', 'Dolabı açtı: dünden kalan makarna var, yedi.', 'Dolabı açtı: bomboş.'),
        A('Sipariş ver', 'phone', 'Telefondan pizza söyledi.', 'Telefona uzandı: şarjı bitmiş.'),
        A('Bakkala git', 'shop', 'Bakkala indi, ekmek peynir aldı.', 'Bakkala indi: kepenk kapalı.')),
      NAMES: { fridge: 'dolapta yemek var', phone: 'telefon şarjlı', shop: 'bakkal açık' },
      SC: [
        ['🍝 Dolap dolu', { fridge: true, phone: true, shop: true }, 'Akşam eve geldiniz, acıktınız. Dolapta dünden kalan makarna var.'],
        ['📱 Dolap boş', { fridge: false, phone: true, shop: true }, 'Dolap boş. Telefonunuz şarjlı.'],
        ['🏪 Dolap boş, şarj bitik', { fridge: false, phone: false, shop: true }, 'Dolap boş, telefonun şarjı bitmiş. Bakkal açık.'],
        ['😭 Gece 3', { fridge: false, phone: false, shop: false }, 'Gece 3: dolap boş, şarj bitik, bakkal kapalı.']],
      win: '<b>“Karnını doyur” BAŞARILI:</b> bir çare tuttu 🎉', fail: '<b>“Karnını doyur” BAŞARISIZ:</b> hiçbir çare tutmadı. Aç yatılacak 😭',
      moral: (s, skip, ok) => ok ? (skip ? `İlk tutan çarede <b>durdu</b>; sağdaki ${skip} çareye bakmadı bile. Selector (?) budur: “olmazsa sıradaki”.` : 'Son çare tuttu: önce soldakilerin hepsi denendi.') : 'Selector ancak <b>bütün</b> çocukları başarısız olursa başarısız olur.'
    });
  };
  /* 2) yalnızca sequence: bir plan = adım adım tarif */
  D.btfood2 = function (root) {
    nid = 620;
    return scenario(root, {
      H: 230, W: 760, simple: true, start: 0,
      tree: seq('Sipariş ver',
        C('telefon şarjlı mı?', 'phone', 'Telefona baktı: şarj var.', 'Telefona baktı: şarj bitmiş.'),
        A('Uygulamayı aç', true, 'Yemek uygulamasını açtı.'),
        C('para yetiyor mu?', 'money', 'Bakiyeye baktı: yetiyor.', 'Bakiyeye baktı: yetmiyor.'),
        A('Siparişi onayla', true, 'Siparişi onayladı. Pizza yolda!')),
      NAMES: { phone: 'telefon şarjlı', money: 'para yetiyor' },
      SC: [
        ['🍕 Her şey yolunda', { phone: true, money: true }, 'Telefon şarjlı, hesapta para var.'],
        ['💸 Para yok', { phone: true, money: false }, 'Telefon şarjlı ama ay sonu: hesapta para yok.'],
        ['🪫 Şarj bitik', { phone: false, money: true }, 'Para var ama telefonun şarjı bitmiş.']],
      win: '<b>“Sipariş ver” BAŞARILI:</b> bütün adımlar tamam 🎉', fail: '<b>“Sipariş ver” BAŞARISIZ:</b> bir adım olmadı, tarif yarıda kaldı.',
      moral: (s, skip, ok) => ok ? 'Sequence (→) ancak <b>bütün</b> adımlar olursa başarılıdır.' : `İlk olmayan adımda <b>durdu</b>${skip ? `; sağdaki ${skip} adıma hiç geçmedi` : ''}. Sequence (→) budur: “bir adım olmazsa tarif çöker”.`
    });
  };
  /* 3) ikisi birlikte: ilk davranış ağacı */
  D.btfood = function (root) {
    nid = 640;
    return scenario(root, {
      H: 250, W: 860, simple: true, start: 1,
      tree: sel('Karnını doyur',
        seq('Evde ye', C('dolap dolu mu?', 'fridge', 'Dolabı açtı: makarna var.', 'Dolabı açtı: bomboş.'), A('Isıt, ye', true, 'Isıttı, yedi.')),
        seq('Sipariş ver', C('şarj var mı?', 'phone', 'Telefona baktı: şarj var.', 'Telefona baktı: şarj bitmiş.'), C('para var mı?', 'money', 'Bakiyeye baktı: yetiyor.', 'Bakiyeye baktı: yetmiyor.'), A('Onayla', true, 'Siparişi onayladı. Pizza yolda!')),
        seq('Bakkala git', C('bakkal açık mı?', 'shop', 'Camdan baktı: bakkalın ışığı yanıyor.', 'Camdan baktı: kepenk kapalı.'), A('Alışveriş yap', true, 'İndi, ekmek peynir aldı.'))),
      NAMES: { fridge: 'dolapta yemek', phone: 'şarj var', money: 'para var', shop: 'bakkal açık' },
      SC: [
        ['🍝 Dolap dolu', { fridge: true, phone: true, money: true, shop: true }, 'Dolapta makarna var. Telefon, para, bakkal: hepsi hazır ama gerek kalacak mı?'],
        ['🍕 Dolap boş', { fridge: false, phone: true, money: true, shop: true }, 'Dolap boş. Telefon şarjlı, hesapta para var.'],
        ['💸 Dolap boş, para yok', { fridge: false, phone: true, money: false, shop: true }, 'Dolap boş, telefon şarjlı ama para yok. Bakkal açık (veresiye yazar).'],
        ['🪫 Dolap boş, şarj bitik', { fridge: false, phone: false, money: true, shop: true }, 'Dolap boş, şarj bitik. Bakkal açık.'],
        ['😭 Gece 3', { fridge: false, phone: false, money: false, shop: false }, 'Gece 3: dolap boş, şarj bitik, para yok, bakkal kapalı.']],
      win: '<b>Kök BAŞARILI:</b> bir plan tuttu, karın doydu 🎉', fail: '<b>Kök BAŞARISIZ:</b> üç plan da tutmadı. Aç yatılacak 😭',
      moral: (s, skip, ok) => ok ? (skip ? `Gri kalan <b>${skip}</b> yaprağa sıra hiç gelmedi. Üstte “?” plan seçer, altta “→” seçilen planı adım adım yürütür.` : 'En sağdaki plan tuttu: soldakilerin hepsi önce denendi ve olmadı.') : 'Her planın ilk sorusu “hayır” dedi; hiçbir eyleme sıra gelmedi.'
    });
  };
  /* 4) aynı kalıp, oyun örneği: odaya gir */
  D.btdoor = function (root) {
    nid = 500;
    return scenario(root, {
      H: 250, W: 860, start: 1,
      tree: sel('Odaya gir',
        seq('Kapıdan gir', C('kapı açık mı?', 'open', 'Kapı koluna bastı: kapı açık.', 'Kapı koluna bastı: kilitli.'), A('İçeri yürü', true, 'İçeri yürüdü.')),
        seq('Anahtarla', C('anahtar var mı?', 'key', 'Cebini yokladı: anahtar var.', 'Cebini yokladı: anahtar yok.'), A('Kilidi aç', true, 'Anahtarı çevirdi, kilit açıldı.'), A('İçeri yürü', true, 'İçeri yürüdü.')),
        seq('Kır', A('Kapıyı tekmele', 'weak', 'Tekmeyi bastı: çürük tahta kırıldı.', 'Tekmeyi bastı: çelik kapı kımıldamadı (ayağı acıdı).'), A('İçeri yürü', true, 'İçeri yürüdü.'))),
      NAMES: { open: 'kapı açık', key: 'anahtar cebimde', weak: 'kapı çürük' },
      SC: [
        ['🚪 Kapı aralık', { open: true, key: false, weak: false }, 'Nöbetçi koridorun sonundaki odaya girmek istiyor. Kapı zaten aralık duruyor.'],
        ['🔑 Kilitli, anahtar cepte', { open: false, key: true, weak: false }, 'Kapı kilitli ve sağlam bir çelik kapı. Ama nöbetçinin cebinde anahtar var.'],
        ['🦶 Anahtar yok, kapı çürük', { open: false, key: false, weak: true }, 'Kapı kilitli, anahtar yok. Kapı eski, çürük bir tahta kapı.'],
        ['🧱 Anahtar yok, kapı çelik', { open: false, key: false, weak: false }, 'Kapı kilitli, anahtar yok, kapı çelik. Elde hiçbir çare kalmadı.'],
        ['🤔 Anahtar var, kapı da çürük', { open: false, key: true, weak: true }, 'İki çare birden var: anahtar cepte, kapı da çürük. Hangisini seçer?']],
      win: '<b>Kök BAŞARILI:</b> bir plan tuttu, karakter odada 🎉', fail: '<b>Kök BAŞARISIZ:</b> üç plan da tutmadı. Üstteki düğüm başka bir şey denemeli (pencere?).',
      moral: (s, skip, ok) => !ok ? `Üç plan da denendi, hiçbiri tutmadı. Gri kalan <b>${skip}</b> yaprak, ilk adımı tutmayan planların sonraki adımları.` : (s.key && s.weak && !s.open ? 'Anahtar varken kapıyı tekmelemedi: “Anahtarla” planı solda, yani <b>daha öncelikli</b>.' : `Gri kalan <b>${skip}</b> yaprak hiç çalışmadı: daha öncelikli bir plan tutunca selector durur.`)
    });
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

/* EK:BAŞLA — ısınma laboratuvarları */
(function () {
  'use strict';

  const ST = ['SUCCESS', 'FAILURE', 'RUNNING'];
  const rndList = () => { const n = Math.floor(Math.random() * 5); return Array.from({ length: n }, () => ST[Math.floor(Math.random() * 3)]); };
  SL.AILABS.selres = {
    fn: 'selector', jsFn: 'selector',
    ref: rs => { for (const r of rs) if (r !== 'FAILURE') return r; return 'FAILURE'; },
    cases: () => { const cs = [[['FAILURE', 'SUCCESS', 'FAILURE']], [['FAILURE', 'FAILURE']], [['FAILURE', 'RUNNING', 'SUCCESS']], [['SUCCESS']], [[]]]; for (let i = 0; i < 20; i++) cs.push([rndList()]); return cs; },
    show: rs => `çocukların cevapları: ${JSON.stringify(rs)}`,
    hint: () => 'Selector = “B planı”: FAILURE olmayan İLK cevabı döndür (SUCCESS de olabilir, RUNNING de). Hepsi FAILURE ise (ya da liste boşsa) FAILURE.'
  };
  SL.AILABS.seqres = {
    fn: 'sequence', jsFn: 'sequence',
    ref: rs => { for (const r of rs) if (r !== 'SUCCESS') return r; return 'SUCCESS'; },
    cases: () => { const cs = [[['SUCCESS', 'FAILURE', 'SUCCESS']], [['SUCCESS', 'SUCCESS']], [['SUCCESS', 'RUNNING', 'FAILURE']], [['FAILURE']], [[]]]; for (let i = 0; i < 20; i++) cs.push([rndList()]); return cs; },
    show: rs => `çocukların cevapları: ${JSON.stringify(rs)}`,
    hint: () => 'Sequence = “tarif”: SUCCESS olmayan İLK cevabı döndür. Hepsi SUCCESS ise (ya da liste boşsa) SUCCESS.'
  };
})();
/* EK:BİTİŞ */
