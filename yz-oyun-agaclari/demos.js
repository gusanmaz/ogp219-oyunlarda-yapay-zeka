/* "Oyun Ağaçları" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS;
  const T = () => SL.theme();

  /* ================= XOX (tic-tac-toe) ================= */
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const tWin = b => { for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]; return b.every(x => x) ? 'D' : null; };
  // değer: O (YZ, MAX) kazanırsa +10 − derinlik, X kazanırsa −10 + derinlik, beraberlik 0
  function tMinimax(b, turn, depth, ab, alpha, beta, cnt) {
    cnt.n++;
    const w = tWin(b);
    if (w === 'O') return 10 - depth; if (w === 'X') return depth - 10; if (w === 'D') return 0;
    let best = turn === 'O' ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = turn; const v = tMinimax(b, turn === 'O' ? 'X' : 'O', depth + 1, ab, alpha, beta, cnt); b[i] = null;
      if (turn === 'O') { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
      if (ab && beta <= alpha) break;
    }
    return best;
  }
  D.ttt = function (root) {
    let b = Array(9).fill(null), over = null, ab = true, mistake = 0, aiFirst = false, thinking = null, lastPos = null;   // thinking: YZ'nin bekleyen hamlesi (zamanlayıcı)
    const grid = el('div', { class: 'ttt' }), info = el('div', { class: 'sv-note' }), stats = el('div', { class: 'sv-counters' });
    const cells = [...Array(9)].map((_, i) => { const c = el('button', { class: 'ttt-c', 'aria-label': 'kare ' + (i + 1), onclick: () => human(i) }); grid.append(c); return c; });
    const analyze = () => {
      const vals = Array(9).fill(null), cnt = { n: 0 };
      if (!over) for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = 'O'; vals[i] = tMinimax(b, 'X', 1, ab, -Infinity, Infinity, cnt); b[i] = null; }
      return { vals, n: cnt.n };
    };
    const draw = (an) => {
      cells.forEach((c, i) => { c.textContent = b[i] || ''; c.className = 'ttt-c ' + (b[i] === 'X' ? 'x' : b[i] === 'O' ? 'o' : ''); c.dataset.v = ''; if (an && an.vals[i] !== null && !b[i]) { const v = an.vals[i]; c.dataset.v = v > 0 ? '+' + v : v; c.classList.add(v > 0 ? 'good' : v < 0 ? 'bad' : 'draw'); } });
    };
    const aiMove = () => {
      thinking = null;
      const an = analyze();
      let pick;
      const free = b.map((x, i) => (x ? -1 : i)).filter(i => i >= 0);
      if (Math.random() < mistake) pick = free[Math.floor(Math.random() * free.length)];
      else { const mx = Math.max(...free.map(i => an.vals[i])); const bests = free.filter(i => an.vals[i] === mx); pick = bests[Math.floor(Math.random() * bests.length)]; }
      lastPos = b.slice(); showStats(an.n);
      b[pick] = 'O'; over = tWin(b);
      draw(null); setTimeout(() => { if (!over) draw(analyze()); end(); }, 10);
    };
    // sayaç: YZ'nin son hamlesinde incelenen düğüm; alfa-beta kutusu değişince aynı konum yeniden sayılır (anında karşılaştırma)
    const showStats = n => { stats.innerHTML = `<span class="cnt">YZ bu hamlede <b style="display:inline-block;min-width:4em;text-align:right;font-variant-numeric:tabular-nums">${n == null ? '—' : n.toLocaleString('tr-TR')}</b> düğüm inceledi</span><span class="cnt">alfa-beta: <b style="display:inline-block;min-width:3.4em">${ab ? 'açık' : 'kapalı'}</b></span>`; };
    const recount = () => { if (!lastPos) { showStats(null); return; } const cur = b, o = over; b = lastPos.slice(); over = null; const n = analyze().n; b = cur; over = o; showStats(n); };
    const end = () => { info.textContent = over === 'O' ? '🤖 YZ kazandı.' : over === 'X' ? '🎉 Kazandınız! (YZ hata payı açık olmalı…)' : over === 'D' ? '🤝 Berabere — kusursuz iki oyuncu arasında XOX her zaman berabere biter.' : 'Sıra sizde (X). Boş karelerdeki sayılar: YZ oraya oynasaydı oyunun minimax değeri (+ = YZ kazanır, − = siz kazanırsınız, 0 = berabere).'; };
    const human = i => { if (over || b[i] || thinking) return; b[i] = 'X'; over = tWin(b); draw(null); end(); if (!over) { info.textContent = '🤖 YZ düşünüyor…'; thinking = setTimeout(aiMove, 150); } };   // YZ oynayana kadar ikinci tıklama yok sayılır
    const reset = () => { clearTimeout(thinking); thinking = null; b = Array(9).fill(null); over = null; lastPos = null; showStats(null); draw(null); end(); if (aiFirst) thinking = setTimeout(aiMove, 150); else draw(analyze()); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, grid, el('div', { class: 'gv-side' },
      el('div', { class: 'sv-controls' }, btn('↺ Yeni oyun', reset, 'primary'),
        el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { ab = e.target.checked; recount(); } }); x.checked = true; return x; })(), ' alfa-beta budaması'),
        el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { aiFirst = e.target.checked; reset(); } }); return x; })(), ' YZ başlasın')),
      slider('YZ hata payı (rastgele hamle olasılığı)', 0, 0.6, 0, 0.05, v => { mistake = v; }, v => '%' + Math.round(v * 100)),
      stats, info)));
    reset();
  };

  /* ================= minimax / alfa-beta ağaç izleyici ================= */
  const AIMA = [[3, 12, 8], [2, 4, 6], [14, 5, 2]];
  function buildTree(spec) { let id = 0; const mk = (x, d) => (Array.isArray(x) ? { id: id++, d, kids: x.map(k => mk(k, d + 1)) } : { id: id++, d, leaf: x }); return mk(spec, 0); }
  function abFrames(tree, useAB) {
    const F = [], st = {}; // st[id] = { v, a, b, state: 'visit'|'done'|'pruned' }
    const snap = (note, cur) => F.push({ st: structuredClone(st), note, cur, ab: useAB });   // structuredClone: ±∞ korunur
    let leaves = 0;
    const rec = (n, max, a, b) => {
      st[n.id] = { a, b, state: 'visit' };
      if (n.leaf !== undefined) { leaves++; st[n.id] = { v: n.leaf, state: 'done' }; snap(`Yaprak: değer <b>${n.leaf}</b>.`, n.id); return n.leaf; }
      let v = max ? -Infinity : Infinity;
      snap(`${max ? 'MAX' : 'MIN'} düğümüne in${useAB ? ` (α = ${fmt(a)}, β = ${fmt(b)})` : ''}.`, n.id);
      for (let i = 0; i < n.kids.length; i++) {
        const c = rec(n.kids[i], !max, a, b);
        v = max ? Math.max(v, c) : Math.min(v, c);
        if (useAB) { if (max) a = Math.max(a, v); else b = Math.min(b, v); }
        st[n.id] = { v, a, b, state: 'visit' };
        snap(`${max ? 'MAX' : 'MIN'} düğümü şimdiye kadarki en iyi: <b>${v}</b>${useAB ? ` (α = ${fmt(a)}, β = ${fmt(b)})` : ''}.`, n.id);
        if (useAB && a >= b && i < n.kids.length - 1) {
          const prune = x => { st[x.id] = { state: 'pruned' }; (x.kids || []).forEach(prune); };
          n.kids.slice(i + 1).forEach(prune);
          snap(`✂ <b>Budama!</b> α (${fmt(a)}) ≥ β (${fmt(b)}): ${max ? 'MIN rakip bu dala asla izin vermez' : 'MAX zaten başka yerde daha iyisini garantiledi'}; kalan ${n.kids.length - i - 1} çocuğa bakmaya gerek yok.`, n.id);
          break;
        }
      }
      st[n.id] = { v, state: 'done' };
      snap(`${max ? 'MAX' : 'MIN'} düğümünün değeri kesinleşti: <b>${v}</b>.`, n.id);
      return v;
    };
    const val = rec(tree, true, -Infinity, Infinity);
    F.push({ st: structuredClone(st), ab: useAB, note: `Kökün değeri <b>${val}</b>. İncelenen yaprak: <b>${leaves}</b>${useAB ? ' (budamasız olsaydı hepsi)' : ''}.`, cur: null, done: true });
    return F;
  }
  const fmt = x => (x === Infinity ? '+∞' : x === -Infinity ? '−∞' : x);
  // dar: telefon genişliğinde kutu. Daha dar bir viewBox ve büyük düğümler (z); kat adları solda değil altta tek satır
  function abSVG(tree, f, dar) {
    const W = dar ? 640 : 1160, H = dar ? 350 : 300, z = dar ? 1.3 : 1, L0 = dar ? 36 : 150, R0 = dar ? 36 : 50;
    const t = T(), pos = {}; let leaf = 0, maxD = 0, abYazi = '';
    const walk = n => { maxD = Math.max(maxD, n.d); if (!n.kids) { pos[n.id] = leaf++; return; } n.kids.forEach(walk); pos[n.id] = (pos[n.kids[0].id] + pos[n.kids[n.kids.length - 1].id]) / 2; };
    walk(tree);
    const X = i => L0 + (i * (W - L0 - R0)) / Math.max(1, leaf - 1), Y = d => (dar ? 62 : 40) + (d * (H - (dar ? 132 : 90))) / Math.max(1, maxD);   // geniş: solda 150 birim kat yazıları
    let s = '';
    const edges = n => (n.kids || []).forEach(k => { const pr = f.st[k.id] && f.st[k.id].state === 'pruned'; s += `<line x1="${X(pos[n.id])}" y1="${Y(n.d) + 20 * z}" x2="${X(pos[k.id])}" y2="${Y(k.d) - 20 * z}" stroke="${pr ? t.red : t.rule}" stroke-width="2" ${pr ? 'stroke-dasharray="5 4"' : ''}/>`; edges(k); });
    edges(tree);
    const nodes = n => {
      const x = X(pos[n.id]), y = Y(n.d), S = f.st[n.id], isMax = n.d % 2 === 0, cur = f.cur === n.id;
      const stroke = cur ? t.amber : S && S.state === 'pruned' ? t.red : S && S.state === 'done' ? t.green : S ? t.blue : t.rule;
      const fill = cur ? t.amber : S && S.state === 'pruned' ? (t.dark ? '#3a1820' : '#fde4e7') : t.card;
      const txt = S && S.v !== undefined && S.v !== Infinity && S.v !== -Infinity ? S.v : n.leaf !== undefined && !(S && S.state === 'pruned') ? (S ? n.leaf : '?') : S && S.state === 'pruned' ? '✂' : '';
      if (n.leaf !== undefined) s += `<rect x="${x - 18 * z}" y="${y - 18 * z}" width="${36 * z}" height="${36 * z}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
      else s += isMax ? `<polygon points="${x},${y - 22 * z} ${x + 24 * z},${y + 16 * z} ${x - 24 * z},${y + 16 * z}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>` : `<polygon points="${x},${y + 22 * z} ${x + 24 * z},${y - 16 * z} ${x - 24 * z},${y - 16 * z}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
      s += `<text x="${x}" y="${y + (n.leaf !== undefined ? 6 : isMax ? 10 : 2) * z}" text-anchor="middle" font-size="${15 * z}" font-weight="800" fill="${cur ? '#111' : t.ink}">${txt}</text>`;
      if (f.ab && cur && S && S.a !== undefined && n.leaf === undefined) abYazi = `bakılan düğüm: α = ${fmt(S.a)}, β = ${fmt(S.b)}`;
      (n.kids || []).forEach(nodes);
    };
    nodes(tree);
    if (dar) s += `<text x="${W / 2}" y="${H - 12}" text-anchor="middle" font-size="${16 * z}" fill="${t.muted}">▲ MAX (sen) · ▼ MIN (rakip)${maxD >= 3 ? ' · ▲ MAX' : ''} · □ yaprak</text>`;
    else s += `<text x="8" y="${Y(0) + 5}" font-size="13" fill="${t.muted}">MAX ▲ (sen)</text><text x="8" y="${Y(1) + 5}" font-size="13" fill="${t.muted}">MIN ▼ (rakip)</text>` + (maxD >= 2 ? `<text x="8" y="${Y(2) + 5}" font-size="12" fill="${t.muted}">${maxD === 2 ? 'yaprak' : 'MAX ▲'}</text>` : '') + (maxD >= 3 ? `<text x="8" y="${Y(3) + 5}" font-size="12" fill="${t.muted}">yaprak</text>` : '');
    if (f.ab) s += `<text x="${W - 8}" y="${18 * z}" text-anchor="end" font-size="${13 * z}" font-weight="700" fill="${t.purple}">${abYazi || '\u00a0'}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%" font-family="Source Sans 3">${s}</svg>`;
  }
  D.abtree = function (root) {
    let spec = AIMA, tree = buildTree(spec), useAB = root.dataset.ab === '1';
    const diag = el('div'), note = el('div', { class: 'sv-note' });
    const dar = () => root.clientWidth > 0 && root.clientWidth < 560;
    const fp = new SL.FramePlayer(f => { diag.innerHTML = abSVG(tree, f, dar()); note.innerHTML = f.note; }, { speed: 1.5 });
    let sonDar = null;   // kutu dar/geniş eşiğini geçince yeniden çiz
    if (window.ResizeObserver) new ResizeObserver(() => { const d = dar(); if (root.clientWidth && d !== sonDar) { sonDar = d; fp.render(); } }).observe(root);
    const build = () => { tree = buildTree(spec); fp.load(abFrames(tree, useAB)); };
    const rnd = () => { const r = () => Math.floor(Math.random() * 20); spec = [0, 1, 2].map(() => [0, 1].map(() => [r(), r()])); build(); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      // minimax slaydında (data-ab="0") α, β henüz anlatılmadı: budama kutusu yalnızca alfa-beta slaydında
      root.dataset.ab === '0' ? null : el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { useAB = e.target.checked; build(); } }); x.checked = useAB; return x; })(), ' alfa-beta budaması'),
      btn('🚪 Üç kapı örneği', () => { spec = AIMA; build(); }), btn('🎲 Rastgele 3 katlı ağaç', rnd)), diag, SL.transport(fp, { min: 0.5, max: 8 }), note);
    build(); SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  /* ================= hikâyeli giriş: üç kapı, cimri bekçi =================
     Sen bir kapı seçersin; bekçi o kapının ardındaki sandıklardan EN AZ altın olanı verir.
     prune=1: gereksiz sandıkları açmadan (alfa-beta fikri). */
  D.doors = function (root) {
    const prune = root.dataset.prune === '1', L = ['A', 'B', 'C'];
    const SC = prune ? [
      ['📦 Klasik', [[3, 12, 8], [2, 4, 6], [14, 5, 2]], 'Aynı üç kapı. Bu kez akıllıca açalım: bir sandık, kapının işe yaramayacağını gösterdiği an o kapıyı bırakalım.'],
      ['👍 İyi kapı başta', [[9, 8, 7], [6, 20, 30], [5, 40, 50]], 'En iyi kapı en başta. Sonraki kapılarda tek sandık yetecek mi?'],
      ['👎 İyi kapı sonda', [[5, 40, 50], [6, 20, 30], [9, 8, 7]], 'Aynı sandıklar, kapıların sırası ters: en iyi kapı en sonda. Kaç sandık açmak gerekecek?'],
      ['🎲 Rastgele', null, 'Rastgele sandıklar. Önce tahmin edin: hangi sandıklar hiç açılmayacak?']
    ] : [
      ['📦 Klasik', [[3, 12, 8], [2, 4, 6], [14, 5, 2]], 'Üç kapı var. Hangisini seçerseniz bekçi o kapının ardındaki üç sandıktan en az altın olanı verecek. Hangi kapı?'],
      ['🪤 Tuzak kapı', [[5, 6, 4], [100, 1, 50], [7, 3, 9]], 'B kapısının ardında 100 altınlık bir sandık var! Oraya mı girmeli?'],
      ['🤝 Hepsi benzer', [[6, 7, 8], [7, 7, 7], [9, 6, 9]], 'Sandıklar birbirine yakın. Fark yaratan ne olacak?'],
      ['🎲 Rastgele', null, 'Rastgele sandıklar. Oynatmadan önce cevabı kafanızdan bulun.']];
    let ch = SC[0][1], F = [];
    const frames = () => {
      const out = [], open = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], dv = [null, null, null], log = [];
      let best = -Infinity, bestD = -1, opened = 0;
      const snap = (o = {}) => out.push(Object.assign({ open: open.map(r => r.slice()), dv: dv.slice(), log: log.slice(), best, bestD, opened }, o));
      snap({ hint: true });
      for (let d = 0; d < 3; d++) {
        let m = Infinity, cut = false;
        for (let k = 0; k < 3; k++) {
          open[d][k] = 1; opened++; const v = ch[d][k], was = m; m = Math.min(m, v);
          let t = `<b>${L[d]} kapısı</b>, ${k + 1}. sandık: <b>${v}</b> altın. ` + (k === 0 ? `Bekçi buradan en fazla ${m} verir.` : v < was ? `Daha az! Bekçi artık en fazla <b>${m}</b> verir.` : `Bekçi yine azı verir: en fazla ${m}.`);
          if (prune && bestD >= 0 && m <= best && k < 2) {
            for (let q = k + 1; q < 3; q++) open[d][q] = 2;
            log.push(['x', t]); snap({ cur: [d, k] });
            log.push(['cut', `✂ ${L[bestD]} kapısı zaten <b>${best}</b> altın garanti ediyor; ${L[d]} en fazla ${m} verebilir. Kalan <b>${2 - k}</b> sandığı açmaya gerek yok.`]);
            cut = true; dv[d] = '≤' + m; snap({ cur: [d, k], cutD: d }); break;
          }
          log.push([prune && bestD >= 0 && k < 2 ? 'go' : 'x', t + (prune && bestD >= 0 && k < 2 ? ` Hâlâ ${best}’den iyi olabilir, devam.` : '')]); snap({ cur: [d, k] });
        }
        if (cut) continue;
        dv[d] = m;
        if (m > best) { best = m; bestD = d; log.push(['ok', `${L[d]} kapısını seçersen bekçi <b>${m}</b> altın verir. Şimdilik en iyi kapı bu.`]); }
        else log.push(['no', `${L[d]} kapısını seçersen bekçi <b>${m}</b> altın verir. ${L[bestD]} (${best}) daha iyi.`]);
        snap({ doorDone: d });
      }
      const maxAll = Math.max(...ch.flat()), md = ch.findIndex(r => r.includes(maxAll));
      log.push(['win', `🏆 <b>${L[bestD]} kapısını seç: ${best} altın garanti.</b>`]);
      const moral = prune ? (opened === 9 ? `Cevap aynı (${L[bestD]}, ${best}) ama <b>9 sandığın 9’u da</b> açıldı: hiç kazanç yok. İyi kapı sonda olunca hiçbir kapı erken elenemedi.` : `Cevap değişmedi (${L[bestD]}, ${best}) ama 9 sandıktan yalnızca <b>${opened}</b> tanesini açtık. İyi kapıya ne kadar erken bakarsak o kadar çok sandık elenir.`)
        : (md !== bestD ? `En büyük sandık (${maxAll}) ${L[md]} kapısında, ama oraya girersen bekçi ${dv[md]} verir. ` : '') + 'En iyi ihtimale değil, <b>en kötü ihtimali en iyi olan</b> kapıya bakılır. Bu kuralın adı <b>minimax</b>.';
      snap({ final: true, moral });
      return out;
    };
    const story = el('div', { class: 'btd-story' }), diag = el('div'), logEl = el('div', { class: 'btd-log' }), moral = el('div', { class: 'btd-moral' });
    const logHtml = (f, son7) => { const rows = son7 ? f.log.slice(-7) : f.log; return f.hint ? '<div class="hint">▶ Oynat’a basın: sandıklar soldan sağa tek tek açılacak.</div>' : rows.map(([k, tx], i) => `<div class="${k === 'no' ? 'l-no' : k === 'cut' ? 'l-no' : 'l-ok'}${i === rows.length - 1 ? ' now' : ''}"><span>${k === 'ok' ? '✓' : k === 'no' ? '✗' : k === 'cut' ? '' : k === 'win' ? '' : '·'}</span>${tx}</div>`).join(''); };
    const moralHtml = f => (f.final ? '💡 ' + f.moral : `açılan sandık: <b>${f.opened}</b> / 9`);
    let last = 0;
    const draw = (f, pl) => {
      const dar = root.clientWidth > 0 && root.clientWidth < 560;   // telefon: alttaki açıklama iki satır, büyük yazı
      const t = T(), W = 720, H = dar ? 362 : 330, DX = [125, 360, 595];
      let g = `<line x1="${W / 2}" y1="40" x2="${W / 2}" y2="76" stroke="${t.rule}" stroke-width="2"/>`;
      for (let d = 0; d < 3; d++) {
        const x = DX[d], isBest = f.bestD === d && f.dv[d] !== null, done = f.dv[d] !== null, cutD = typeof f.dv[d] === 'string';
        g += `<line x1="${W / 2}" y1="76" x2="${x}" y2="92" stroke="${f.final && isBest ? t.green : t.rule}" stroke-width="${f.final && isBest ? 5 : 2}"/>`;
        g += `<rect x="${x - 46}" y="92" width="92" height="74" rx="10" fill="${t.card}" stroke="${f.final && isBest ? t.green : cutD ? t.red : done ? t.blue : t['ink-2']}" stroke-width="${f.final && isBest ? 5 : 2.5}"/>`;
        g += `<text x="${x - 20}" y="138" text-anchor="middle" font-size="34">🚪</text><text x="${x + 20}" y="126" text-anchor="middle" font-size="22" font-weight="900" fill="${t.ink}">${L[d]}</text>`;
        g += `<text x="${x + 20}" y="148" text-anchor="middle" font-size="17" font-weight="800" fill="${cutD ? t.red : t.blue}">${done ? f.dv[d] : '?'}</text>`;
        g += `<line x1="${x}" y1="172" x2="${x}" y2="176" stroke="${t.rule}" stroke-width="2"/>`;
        const mn = Math.min(...ch[d]);
        for (let k = 0; k < 3; k++) {
          const cx = x + (k - 1) * 74, o = f.open[d][k], cur = f.cur && f.cur[0] === d && f.cur[1] === k, isMin = done && !cutD && ch[d][k] === mn && ch[d].indexOf(mn) === k;
          g += `<polyline points="${x},176 ${cx},176 ${cx},222" fill="none" stroke="${o === 2 ? t.red : t.rule}" stroke-width="2" ${o === 2 ? 'stroke-dasharray="5 4"' : ''}/>`;   // dik açılı dal: komşu sandığın köşesine yaklaşmasın
          g += `<rect x="${cx - 31}" y="222" width="62" height="70" rx="8" fill="${cur ? t.amber : o === 2 ? (t.dark ? '#3a1820' : '#fde4e7') : t.card}" stroke="${isMin ? t.blue : cur ? t.amber : o === 2 ? t.red : t.rule}" stroke-width="${isMin ? 4 : 2}" opacity="${o === 2 ? 0.75 : 1}"/>`;
          g += o === 1 ? `<text x="${cx}" y="252" text-anchor="middle" font-size="22">💰</text><text x="${cx}" y="281" text-anchor="middle" font-size="21" font-weight="900" fill="${cur ? '#111' : t.ink}">${ch[d][k]}</text>`
            : o === 2 ? `<text x="${cx}" y="254" text-anchor="middle" font-size="22">✂</text><text x="${cx}" y="280" text-anchor="middle" font-size="${dar ? 16 : 12}" fill="${t.red}">açılmadı</text>`
            : `<text x="${cx}" y="265" text-anchor="middle" font-size="20" font-weight="800" fill="${t.muted}">?</text>`;
        }
      }
      if (dar) g += `<text x="${W / 2}" y="322" text-anchor="middle" font-size="23" fill="${t.muted}">bekçi her kapıda en azı verir</text><text x="${W / 2}" y="352" text-anchor="middle" font-size="23" fill="${t.muted}">mavi çerçeve = vereceği sandık${prune ? ' · ✂ = açılmadı' : ''}</text>`;
      else g += `<text x="${W / 2}" y="320" text-anchor="middle" font-size="15.5" fill="${t.muted}">bekçi her kapıda en azı verir · mavi çerçeve = vereceği sandık${prune ? ' · ✂ = açmaya gerek kalmadı' : ''}</text>`;
      diag.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%" font-family="Source Sans 3">${g}</svg>`;
      logEl.innerHTML = logHtml(f);
      logEl.scrollTop = logEl.scrollHeight;   // bütün satırlar günlükte; en yenisi görünür, eskiler kaydırılarak okunur
      moral.innerHTML = moralHtml(f);
      if (pl.idx !== last && pl.idx > 0 && SL.sfx) { try { SL.sfx(f.final ? 'alert' : f.cutD !== undefined ? 'shot' : 'waka'); } catch (e) {} }
      last = pl.idx;
    };
    const fp = new SL.FramePlayer(draw, { speed: 1.3 });
    // günlük ve sonuç satırı için en uzun karenin boyunu baştan ayır (kaymaz): adımlar ilerledikçe kutu büyümesin.
    // Günlük kutusu son 7 satırın en uzun hâli kadar SABİT yükseklikte; daha eski satırlar kutunun içinde kaydırılarak okunur.
    logEl.style.overflowY = 'auto';
    const yerAyir = F => {
      logEl.style.height = ''; logEl.style.minHeight = moral.style.minHeight = '';
      let hl = 0, hm = 0;
      const eCh = ch, hepsi = [F];
      for (const sc of SC) if (sc[1]) { ch = sc[1]; hepsi.push(frames()); }
      ch = eCh;
      for (const G of hepsi) for (const f of G) { logEl.innerHTML = logHtml(f, true); moral.innerHTML = moralHtml(f); hl = Math.max(hl, logEl.offsetHeight); hm = Math.max(hm, moral.offsetHeight); }
      if (hl) { logEl.style.boxSizing = 'border-box'; logEl.style.height = hl + 'px'; }
      if (hm) moral.style.minHeight = hm + 'px';
    };
    const load = (i, play) => {
      if (SC[i][1]) ch = SC[i][1]; else { const r = () => 1 + Math.floor(Math.random() * 19); ch = [0, 1, 2].map(() => [r(), r(), r()]); }
      story.innerHTML = '📖 ' + SC[i][2]; last = 0; sonF = frames(); yerAyir(sonF); fp.load(sonF); if (play) fp.play();
    };
    let sonF = null, gen = 0;   // genişlik değişince (görünür olunca, dar ekran) yeniden ölç
    if (window.ResizeObserver) new ResizeObserver(() => { const w = root.clientWidth; if (sonF && w && Math.abs(w - gen) > 1) { gen = w; yerAyir(sonF); fp.render(); } }).observe(root);
    const bs = SC.map((sc, i) => { const b = btn(sc[0], () => { bs.forEach(x => x.classList.remove('primary')); b.classList.add('primary'); load(i, true); }); return b; });
    root.setAttribute('data-prevent-swipe', '');
    const baslik = el('div', { style: 'text-align:center;font-weight:700;font-size:17px;margin:2px 0 -4px' }, '🧑 SEN: en çok altını veren kapıyı seç');
    root.append(el('div', { class: 'sv-controls btd-sc' }, ...bs), story, el('div', { class: 'btd-wrap doors' }, el('div', {}, baslik, diag), el('div', {}, logEl, moral)), SL.transport(fp, { min: 0.4, max: 6 }));
    bs[0].classList.add('primary'); load(0, false);
    SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  /* ================= hikâyeli giriş: hangi lokanta? (keşif mi, bildiğin mi) ================= */
  D.bandit = function (root) {
    const P = [0.3, 0.8, 0.5], NM = ['🍜 Köşe', '🍛 Pasaj', '🥙 Meydan'], NIGHTS = 100;
    const ST = {
      greedy: ['😌 Hep bildiğine git', 'Her birini bir kez dene; sonra hep o ana kadar oranı en iyi olana git.'],
      random: ['🎲 Hep rastgele', 'Her akşam zar at. Hiçbir şey öğrenmiyormuş gibi davran.'],
      ucb: ['🧠 UCB1: iyiye git ama az denediğini unutma', 'Oranı iyi olana git; ama az denediğin lokantaya arada bir şans ver. Belirsizlik azaldıkça şans da azalır.']
    };
    let mode = 'ucb', F = [];
    const sim = () => {
      const n = [0, 0, 0], w = [0, 0, 0], out = []; let tot = 0;
      out.push({ n: n.slice(), w: w.slice(), tot, t: 0, note: 'Üç lokanta var. Hangisinin daha iyi olduğunu <b>bilmiyorsunuz</b>; ancak yiyerek öğrenebilirsiniz. ▶ Oynat.' });
      for (let t = 1; t <= NIGHTS; t++) {
        let k, why;
        const sc = [0, 1, 2].map(i => (n[i] === 0 ? Infinity : w[i] / n[i] + 0.7 * Math.sqrt(Math.log(t) / n[i])));
        if (mode === 'random') { k = Math.floor(Math.random() * 3); why = 'zar attı'; }
        else if (n.includes(0)) { k = n.indexOf(0); why = 'hiç denenmemişti'; }
        else if (mode === 'greedy') { k = [0, 1, 2].reduce((a, b) => (w[b] / n[b] > w[a] / n[a] ? b : a)); why = 'şimdiye kadarki oranı en iyi'; }
        else { k = sc.indexOf(Math.max(...sc)); const bestRate = [0, 1, 2].reduce((a, b) => (w[b] / n[b] > w[a] / n[a] ? b : a)); why = k === bestRate ? 'oranı en iyi' : 'oranı en iyi değil ama <b>az denenmiş</b>: bir şans daha'; }
        const ok = Math.random() < P[k]; n[k]++; if (ok) { w[k]++; tot++; }
        out.push({ n: n.slice(), w: w.slice(), tot, t, k, ok, sc: mode === 'ucb' ? sc : null, note: `<b>${t}. akşam:</b> ${NM[k]} (${why}) → ${ok ? 'beğendi 😋' : 'beğenmedi 😖'}` });
      }
      const fav = n.indexOf(Math.max(...n));
      out.push({ n: n.slice(), w: w.slice(), tot, t: NIGHTS, final: true, note: `<b>${NIGHTS} akşamın ${tot} tanesinde</b> memnun kaldı. En çok gidilen: ${NM[fav]} (${n[fav]} kez). Gerçekte en iyisi ${NM[1]} idi. ` + (mode === 'greedy' ? (fav === 1 ? 'Bu sefer şanslıydı. “Yeniden” ile birkaç kez deneyin: iyi lokanta ilk akşam kötü çıkarsa ona bir daha hiç uğramaz ve sonuç 40’ın altına düşer.' : 'İlk akşam şanssız geçen iyi lokantaya bir daha hiç uğramadı: <b>keşif yok</b>.') : mode === 'random' ? 'Hangisinin iyi olduğunu öğrendi ama bilgisini <b>kullanmadı</b>: akşamların üçte ikisi daha kötü lokantalarda geçti.' : 'Önce hepsini yokladı, sonra iyi olana yüklendi; ötekileri arada bir yeniden denedi. Her çalıştırmada sonuç birbirine yakın çıkar (çoğunlukla 68–80): <b>güvenilir</b>. MCTS her düğümde tam bunu yapar.') });
      return out;
    };
    const cards = el('div', { class: 'bd-cards', style: 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr))' }), note = el('div', { class: 'sv-note' }), stat = el('div', { class: 'sv-counters' }), how = el('div', { class: 'btd-story' });
    let last = 0;
    const draw = (f, pl) => {
      cards.innerHTML = [0, 1, 2].map(i => {
        const r = f.n[i] ? f.w[i] / f.n[i] : 0;
        return `<div class="bd-card${f.k === i ? ' now' : ''}"><div class="bd-nm">${NM[i]}</div><div class="bd-bar"><i style="width:${(f.n[i] / NIGHTS) * 100}%"></i></div><div>gidildi: <b>${f.n[i]}</b> · beğenildi: <b>${f.w[i]}</b></div><div>tahmin edilen oran: <b>${f.n[i] ? '%' + Math.round(r * 100) : '?'}</b></div>` +
          (f.sc ? `<div class="bd-ucb">UCB puanı: ${f.sc[i] === Infinity ? '∞ (hiç denenmedi)' : f.sc[i].toFixed(2)}</div>` : '') +
          `<div class="bd-true">${f.final ? 'gerçek oran: %' + P[i] * 100 : 'gerçek oran: gizli'}</div></div>`;
      }).join('');
      note.innerHTML = f.note;
      stat.innerHTML = `<span class="cnt">akşam <b>${f.t}</b> / ${NIGHTS}</span><span class="cnt ok">memnun kalınan akşam <b>${f.tot}</b></span><span class="cnt">her akşam en iyisine gidilseydi ≈ <b>${Math.round(f.t * 0.8)}</b></span>`;
      if (pl.idx !== last && f.k !== undefined && SL.sfx) { try { SL.sfx(f.ok ? 'waka' : 'tak'); } catch (e) {} }
      last = pl.idx;
    };
    const fp = new SL.FramePlayer(draw, { speed: 6 });
    // kaymaz: kartlar, not ve sayaçlar bütün kareler (üç strateji) içinde en uzun hâllerine göre baştan boylanır
    let sonF = null, gen = 0;
    const yerAyir = () => {
      if (!root.clientWidth || !sonF) return;
      for (const e of [cards, note, stat, how]) e.style.minHeight = '';
      const h = [0, 0, 0, 0], eM = mode;
      for (const k of Object.keys(ST)) {
        mode = k; how.innerHTML = '📖 ' + ST[k][1];
        const F = k === eM ? sonF : sim();
        for (const f of [F[0], F[1], F[F.length - 2], F[F.length - 1]]) { draw(f, { idx: 0 }); [cards, note, stat, how].forEach((e, i) => { h[i] = Math.max(h[i], e.offsetHeight); }); }
      }
      mode = eM; how.innerHTML = '📖 ' + ST[mode][1];
      [cards, note, stat, how].forEach((e, i) => { e.style.minHeight = h[i] + 'px'; });
      last = 0;
    };
    const go = play => { how.innerHTML = '📖 ' + ST[mode][1]; last = 0; sonF = sim(); fp.load(sonF); if (!gen) { yerAyir(); fp.render(); } if (play) fp.play(); };
    if (window.ResizeObserver) new ResizeObserver(() => { const w = root.clientWidth; if (sonF && w && Math.abs(w - gen) > 1) { gen = w; yerAyir(); fp.render(); } }).observe(root);
    const bs = Object.keys(ST).map(k => { const b = btn(ST[k][0], () => { mode = k; bs.forEach(x => x.classList.remove('primary')); b.classList.add('primary'); go(true); }); if (k === mode) b.classList.add('primary'); return b; });
    bs.forEach(x => { x.style.whiteSpace = 'normal'; x.style.maxWidth = '100%'; });   // dar kutuda uzun ad (UCB1) taşmasın, sarılsın
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls btd-sc' }, ...bs, btn('↺ Yeniden', () => go(true))), how, cards, SL.transport(fp, { min: 1, max: 40, unit: 'akşam/sn' }), note, stat);
    go(false); SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  /* ================= Dört Bir Arada (Connect Four) ================= */
  const R = 6, C = 7;
  const C4 = {
    empty: () => new Array(R * C).fill(0),
    drop(b, c, p) { for (let r = R - 1; r >= 0; r--) if (!b[r * C + c]) { b[r * C + c] = p; return r; } return -1; },
    undo(b, c) { for (let r = 0; r < R; r++) if (b[r * C + c]) { b[r * C + c] = 0; return; } },
    moves(b) { const m = []; for (const c of [3, 2, 4, 1, 5, 0, 6]) if (!b[c]) m.push(c); return m; },
    winAt(b, r, c) {
      const p = b[r * C + c]; if (!p) return false;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        let k = 1;
        for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < R && cc >= 0 && cc < C && b[rr * C + cc] === p) { k++; rr += dr * s; cc += dc * s; } }
        if (k >= 4) return true;
      }
      return false;
    },
    full: b => { for (let c = 0; c < C; c++) if (!b[c]) return false; return true; }
  };
  // klasik pencere puanlaması: oyuncu p açısından
  function c4eval(b, p) {
    const o = 3 - p; let s = 0;
    for (let r = 0; r < R; r++) if (b[r * C + 3] === p) s += 3; else if (b[r * C + 3] === o) s -= 3;
    const win = (cells) => { let mp = 0, mo = 0, e = 0; for (const v of cells) { if (v === p) mp++; else if (v === o) mo++; else e++; } if (mp && mo) return 0; if (mp === 3 && e === 1) return 5; if (mp === 2 && e === 2) return 2; if (mo === 3 && e === 1) return -4; if (mo === 2 && e === 2) return -1; return 0; };
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [-1, 1]]) {
      const r3 = r + 3 * dr, c3 = c + 3 * dc; if (r3 < 0 || r3 >= R || c3 >= C) continue;
      s += win([0, 1, 2, 3].map(k => b[(r + k * dr) * C + c + k * dc]));
    }
    return s;
  }
  SL.c4 = C4; SL.c4eval = c4eval;
  function negamax(b, depth, alpha, beta, p, evalFn, cnt, order) {
    cnt.n++;
    const ms = order ? C4.moves(b) : [0, 1, 2, 3, 4, 5, 6].filter(c => !b[c]);
    if (!ms.length) return 0;
    if (depth === 0) return evalFn(b, p);
    let best = -Infinity;
    for (const c of ms) {
      const r = C4.drop(b, c, p);
      let v;
      if (C4.winAt(b, r, c)) v = 100000 + depth;   // çabuk kazanmayı tercih et
      else v = -negamax(b, depth - 1, -beta, -alpha, 3 - p, evalFn, cnt, order);
      C4.undo(b, c);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
  function abChoose(b, p, depth, evalFn, order = true) {
    const cnt = { n: 0 }, scores = Array(C).fill(null);
    for (const c of C4.moves(b)) { const r = C4.drop(b, c, p); scores[c] = C4.winAt(b, r, c) ? 100000 + depth : -negamax(b, depth - 1, -Infinity, Infinity, 3 - p, evalFn, cnt, order); C4.undo(b, c); }
    let best = -Infinity, pick = 3; for (const c of C4.moves(b)) if (scores[c] > best) { best = scores[c]; pick = c; }
    return { pick, scores, n: cnt.n };
  }
  SL.c4ab = abChoose;
  // MCTS (UCT) — rastgele oyun sonu simülasyonları
  function mcts(b0, p, iters, cexp = 1.4) {
    const rootN = { kids: null, N: 0, W: 0, move: -1, player: 3 - p, parent: null };
    for (let it = 0; it < iters; it++) {
      const b = b0.slice(); let n = rootN, toMove = p, winner = 0, depthWin = false;
      // 1) seçim
      while (n.kids && n.kids.length && !n.terminal) {
        let best = null, bv = -Infinity;
        for (const k of n.kids) { const v = k.N === 0 ? Infinity : k.W / k.N + cexp * Math.sqrt(Math.log(n.N) / k.N); if (v > bv) { bv = v; best = k; } }
        n = best; const r = C4.drop(b, n.move, toMove); if (C4.winAt(b, r, n.move)) { winner = toMove; depthWin = true; } toMove = 3 - toMove;
        if (depthWin) break;
      }
      // 2) genişletme
      if (!depthWin && !n.kids) { n.kids = C4.moves(b).map(c => ({ kids: null, N: 0, W: 0, move: c, player: toMove, parent: n })); }
      if (!depthWin && n.kids && n.kids.length) {
        const fresh = n.kids.filter(k => k.N === 0); const k = fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : n.kids[Math.floor(Math.random() * n.kids.length)];
        n = k; const r = C4.drop(b, n.move, toMove); if (C4.winAt(b, r, n.move)) { winner = toMove; depthWin = true; n.terminal = true; } toMove = 3 - toMove;
      }
      // 3) simülasyon
      if (!depthWin) {
        for (;;) { const ms = C4.moves(b); if (!ms.length) break; const c = ms[Math.floor(Math.random() * ms.length)]; const r = C4.drop(b, c, toMove); if (C4.winAt(b, r, c)) { winner = toMove; break; } toMove = 3 - toMove; }
      }
      // 4) geri yayılım: her düğüm, o hamleyi yapan oyuncu açısından
      for (let x = n; x; x = x.parent) { x.N++; if (winner === x.player) x.W += 1; else if (!winner) x.W += 0.5; }
    }
    const stats = Array(C).fill(null); let pick = -1, bn = -1;
    (rootN.kids || []).forEach(k => { stats[k.move] = { N: k.N, w: k.W / Math.max(1, k.N) }; if (k.N > bn) { bn = k.N; pick = k.move; } });
    return { pick, stats, iters };
  }
  SL.c4mcts = mcts;

  function c4Board(onClick) {
    const W = 490, H = 420, cv = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(cv, W, H);
    let hover = -1;
    cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); hover = Math.floor(((e.clientX - r.left) * W) / r.width / 70); });
    cv.addEventListener('mouseleave', () => { hover = -1; });
    cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(); onClick(Math.floor(((e.clientX - r.left) * W) / r.width / 70)); });
    const draw = (b, last, overlay) => {
      const t = T(); ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = t.dark ? '#1d3a8a' : '#2459c7'; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 12); ctx.fill();
      if (hover >= 0) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(hover * 70, 0, 70, H); }
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const v = b[r * C + c]; ctx.fillStyle = v === 1 ? '#ff4d5e' : v === 2 ? '#ffd23f' : t.dark ? '#0d0f18' : '#f5f2ea';
        ctx.beginPath(); ctx.arc(35 + c * 70, 35 + r * 70, 27, 0, 7); ctx.fill();
        if (last && last[0] === r && last[1] === c) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
      }
      if (overlay) overlay.forEach((txt, c) => { if (txt === null) return; SL.drawLabel(ctx, txt, 35 + c * 70, 12, '#111', { size: 11, font: 'JetBrains Mono' }); });
    };
    return { canvas: cv, draw };
  }

  D.c4 = function (root) {
    let b = C4.empty(), over = 0, last = null, thinking = false, overlay = null, aiTimer = null;
    const cfg = { ai: root.dataset.ai || 'ab', depth: 5, iters: 3000, order: true, aiStarts: false };
    const info = el('div', { class: 'sv-note' }), stats = el('div', { class: 'c4stats' });
    const board = c4Board(c => human(c));
    const show = () => board.draw(b, last, overlay);
    const status = m => { info.innerHTML = m; };
    const finish = (r, c, who) => { if (C4.winAt(b, r, c)) { over = who; status(who === 1 ? '🎉 Kazandınız!' : '🤖 YZ kazandı.'); return true; } if (C4.full(b)) { over = 3; status('🤝 Berabere.'); return true; } return false; };
    const aiMove = () => {
      thinking = true; status('🤖 düşünüyor…');
      aiTimer = setTimeout(() => {
        const t0 = performance.now(); let res, txt;
        if (cfg.ai === 'ab') { res = abChoose(b, 2, cfg.depth, c4eval, cfg.order); overlay = res.scores.map(v => (v === null ? null : Math.abs(v) >= 100000 ? (v > 0 ? 'KAZAN' : 'KAYIP') : String(v))); txt = `Alfa-beta, derinlik ${cfg.depth}: <b>${res.n.toLocaleString('tr-TR')}</b> düğüm`; }
        else { res = mcts(b, 2, cfg.iters); overlay = res.stats.map(s => (s ? `%${Math.round(s.w * 100)}` : null)); txt = `MCTS, <b>${cfg.iters.toLocaleString('tr-TR')}</b> simülasyon`; stats.innerHTML = '<div class="mini">Her sütun: ziyaret sayısı (çubuk) ve kazanma oranı</div>' + res.stats.map((s, c) => `<div class="uscore"><span>sütun ${c + 1}</span><span class="ubar wide"><i style="width:${s ? (100 * s.N) / res.iters : 0}%"></i></span><b>${s ? s.N : '-'}</b></div>`).join(''); }
        if (cfg.ai === 'ab') stats.innerHTML = '<div class="mini">Üstteki sayılar: YZ açısından her sütunun alfa-beta değeri (büyük = iyi)</div>';
        const ms = (performance.now() - t0).toFixed(0);
        const r = C4.drop(b, res.pick, 2); last = [r, res.pick]; thinking = false;
        if (!finish(r, res.pick, 2)) status(`${txt}, ${ms} ms. Sıra sizde (kırmızı).`);
        show();
      }, 30);
    };
    const human = c => { if (over || thinking || c < 0 || c >= C || b[c]) return; const r = C4.drop(b, c, 1); last = [r, c]; overlay = null; show(); if (!finish(r, c, 1)) aiMove(); };
    const reset = () => { clearTimeout(aiTimer); thinking = false; b = C4.empty(); over = 0; last = null; overlay = null; stats.innerHTML = ''; show(); status('Sıra sizde: kırmızı taşınızı bırakmak için bir sütuna tıklayın.'); if (cfg.aiStarts) aiMove(); };
    // seçili YZ'ye ait olmayan ayarlar soluk ve pasif (gizlenmez: düzen kaymasın)
    const abDepth = slider('alfa-beta derinliği', 1, 7, cfg.depth, 1, v => { cfg.depth = v; }),
      mctsIters = slider('MCTS simülasyon sayısı', 100, 20000, cfg.iters, 100, v => { cfg.iters = v; }),
      abOrder = el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.order = e.target.checked; } }); x.checked = true; return x; })(), ' hamle sıralaması (önce orta sütun)');
    const syncCtl = () => [[abDepth, cfg.ai === 'ab'], [abOrder, cfg.ai === 'ab'], [mctsIters, cfg.ai === 'mcts']].forEach(([lb, on]) => { lb.style.opacity = on ? '' : '0.4'; lb.querySelector('input').disabled = !on; });
    const ctl = el('div', { class: 'ctl-col' },
      btn('↺ Yeni oyun', reset, 'primary'),
      el('label', { class: 'ctl' }, 'YZ: ', select({ ab: 'alfa-beta (minimax)', mcts: 'Monte Carlo ağaç araması' }, cfg.ai, v => { cfg.ai = v; syncCtl(); })),
      abDepth, mctsIters, abOrder,
      el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.aiStarts = e.target.checked; } }); return x; })(), ' YZ başlasın (yeni oyunda)'),
      info, stats);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, el('div', { style: 'flex:none;width:470px' }, board.canvas), el('div', { class: 'gv-side' }, ctl)));
    SL.onTheme(show);
    syncCtl(); reset();
    // kaymaz: durum satırı ve istatistik kutusu en uzun içeriklerine göre baştan boylanır (YZ oynayınca kutu büyümesin)
    const yerAyir = () => {
      if (!root.clientWidth) return;
      const eS = stats.innerHTML, eI = info.innerHTML;
      stats.style.minHeight = info.style.minHeight = '';
      stats.innerHTML = '<div class="mini">Her sütun: ziyaret sayısı (çubuk) ve kazanma oranı</div>' + [0, 1, 2, 3, 4, 5, 6].map(c => `<div class="uscore"><span>sütun ${c + 1}</span><span class="ubar wide"><i style="width:50%"></i></span><b>20000</b></div>`).join('');
      const hs = stats.offsetHeight;
      let hi = 0;
      for (const m of ['Sıra sizde: kırmızı taşınızı bırakmak için bir sütuna tıklayın.', 'Alfa-beta, derinlik 7: <b>999.999</b> düğüm, 99999 ms. Sıra sizde (kırmızı).', 'MCTS, <b>20.000</b> simülasyon, 99999 ms. Sıra sizde (kırmızı).', '🤖 düşünüyor…']) { info.innerHTML = m; hi = Math.max(hi, info.offsetHeight); }
      stats.innerHTML = eS; info.innerHTML = eI;
      stats.style.minHeight = hs + 'px'; info.style.minHeight = hi + 'px';
    };
    let gen = 0;
    yerAyir();
    if (window.ResizeObserver) new ResizeObserver(() => { const w = root.clientWidth; if (w && Math.abs(w - gen) > 1) { gen = w; yerAyir(); } }).observe(root);
  };

  /* ---------- simlab: değerlendirme fonksiyonunu sen yaz ---------- */
  SL.SIMLABS.c4eval = function (box, api) {
    let evalFn = null, score = { s: 0, b: 0, d: 0 }, b = C4.empty(), turn = 1, studentIs = 1, last = null, pause = 0;
    const info = el('div', { class: 'mini' });
    const board = c4Board(() => {});
    board.canvas.style.width = '380px';
    const baseline = (bb, p) => { let s = 0; for (let r = 0; r < R; r++) { if (bb[r * C + 3] === p) s += 1; else if (bb[r * C + 3] === 3 - p) s -= 1; } return s; };
    const w = new SL.World({
      W: 10, H: 10, autoplay: true,
      reset() { score = { s: 0, b: 0, d: 0 }; b = C4.empty(); turn = 1; studentIs = 1; last = null; pause = 0; },
      update(dt) {
        if (!evalFn) return;
        pause -= dt; if (pause > 0) return;
        const fn = turn === studentIs ? evalFn : baseline;
        let res; try { res = abChoose(b, turn, 3, fn, true); } catch (e) { w.pause(); api.setMsg('err', '⚠️ evaluate hata verdi: ' + SL.jsErrorText(e)); return; }
        const r = C4.drop(b, res.pick, turn); last = [r, res.pick];
        if (C4.winAt(b, r, res.pick) || C4.full(b)) {
          if (C4.full(b) && !C4.winAt(b, r, res.pick)) score.d++; else if (turn === studentIs) score.s++; else score.b++;
          b = C4.empty(); studentIs = 3 - studentIs; turn = 1; pause = 0.8; last = null;
        } else { turn = 3 - turn; pause = 0.12; }
      },
      render() { board.draw(b, last, null); info.innerHTML = `Sizin YZ’niz (${studentIs === 1 ? 'kırmızı' : 'sarı'}) vs taban YZ · skor <b class="c-green">${score.s}</b> – <b class="c-red">${score.b}</b> (beraberlik ${score.d}) · her ikisi de derinlik 3 alfa-beta`; }
    });
    w.canvas.style.display = 'none';
    box.append(board.canvas, info, w.controls({ speed: true }));
    w.reset();
    const tourney = fn => { let s = 0, o = 0, d = 0; for (let g = 0; g < 8; g++) { const bb = C4.empty(); let t = 1; const me = g % 2 ? 2 : 1; let moves = 0; for (;;) { const res = abChoose(bb, t, 3, t === me ? fn : baseline, true); const r = C4.drop(bb, res.pick, t); moves++; if (C4.winAt(bb, r, res.pick)) { if (t === me) s++; else o++; break; } if (C4.full(bb)) { d++; break; } t = 3 - t; if (moves > 60) break; } } return { s, o, d }; };
    return {
      world: w,
      setFns(f) { evalFn = (bb, p) => { const v = f.evaluate(bb.slice(), p); if (typeof v !== 'number' || !isFinite(v)) throw new Error('evaluate sayı döndürmeli, döndürülen: ' + String(v)); return v; }; w.reset(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        const fn = (bb, p) => { const v = mod.evaluate(bb.slice(), p); if (typeof v !== 'number' || !isFinite(v)) throw new Error('evaluate sayı döndürmeli, döndürülen: ' + String(v)); return v; };
        // simetri: p için değer, rakibin taşları yer değiştirince −değer olmalı mı? Bunu sadece öneriyoruz; asıl test: turnuva
        let r; try { r = tourney(fn); } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        if (r.s > r.o) return { ok: true, msg: `✅ 8 oyunluk turnuva: sizin YZ ${r.s} – ${r.o} taban YZ (${r.d} beraberlik). Değerlendirme fonksiyonunuz işe yarıyor!` };
        return { ok: false, msg: `❌ 8 oyunluk turnuva: sizin YZ ${r.s} – ${r.o} taban YZ (${r.d} beraberlik). Taban YZ sadece orta sütunu sayıyor; onu geçmek için 4’lük pencerelerdeki 2’li ve 3’lü dizileri de puanlayın.` };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  const refMinimax = (node, isMax) => { if (!Array.isArray(node)) return node; const vs = node.map(k => refMinimax(k, !isMax)); return isMax ? Math.max(...vs) : Math.min(...vs); };
  SL.AILABS.minimax = {
    fn: 'minimax', jsFn: 'minimax', ref: refMinimax,
    cases: () => {
      const r = () => Math.floor(Math.random() * 41) - 20;
      const gen = d => (d === 0 ? r() : Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => gen(d - 1)));
      const cs = [[AIMA, true], [AIMA, false], [7, true], [[1, 2, 3], true], [[1, 2, 3], false], [[[5, 6], [7, 4, 5]], true], [[[3, [9, 1]], 4], true]];
      for (let i = 0; i < 12; i++) cs.push([gen(1 + (i % 3) + 1), i % 4 !== 3]);
      return cs;
    },
    show: (n, m) => `ağaç ${JSON.stringify(n)}, kökte ${m ? 'MAX' : 'MIN'}`,
    hint: () => 'Sayıysa (yaprak) kendisini döndür. Listeyse her çocuk için minimax(çocuk, not is_max) hesapla; MAX ise en büyüğünü, MIN ise en küçüğünü döndür.'
  };
  SL.AILABS.ucb = {
    fn: 'ucb1', jsFn: 'ucb1', tol: 1e-6,
    ref: (w, n, N, c) => (n === 0 ? null : w / n + c * Math.sqrt(Math.log(N) / n)),
    cases: () => { const cs = [[3, 5, 20, 1.4], [0, 1, 1, 1.4], [10, 10, 100, 0], [7, 20, 40, 2], [0, 0, 10, 1.4], [1, 2, 3, 0.5]]; for (let i = 0; i < 12; i++) { const n = 1 + Math.floor(Math.random() * 50); const N = n + Math.floor(Math.random() * 200); cs.push([Math.round(Math.random() * n * 2) / 2, n, N, [0.7, 1.0, 1.41, 2][i % 4]]); } return cs; },
    show: (w, n, N, c) => `kazanç w=${w}, ziyaret n=${n}, ebeveyn ziyareti N=${N}, c=${c}`,
    hint: (w, n) => (n === 0 ? 'Hiç ziyaret edilmemiş çocuk: None döndürün (seçim kodu bunu “önce bunu dene” diye yorumlar).' : 'w/n + c·√(ln N / n) — math.log doğal logaritmadır.')
  };

  /* ---------- başlık ---------- */
  D.titletree = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let t = 0, timer, running = false, vals;
    const pts = []; const build = (x, y, d, w, p) => { const i = pts.length; pts.push({ x, y, d, p }); if (d < 3) for (let k = 0; k < 3; k++) build(x - w / 2 + (w * (k + 0.5)) / 3, y + 55, d + 1, w / 3, i); };
    build(960, 25, 0, 600, -1);
    const reroll = () => { vals = pts.map(p => (p.d === 3 ? Math.floor(Math.random() * 9) : null)); };
    reroll();
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const k = (t % 140) / 140;
      pts.forEach((p, i) => { if (p.p >= 0) { const q = pts[p.p]; const lit = k * 4 > 3 - p.d; ctx.strokeStyle = lit ? 'rgba(196,155,255,0.9)' : 'rgba(170,170,230,0.25)'; ctx.lineWidth = lit ? 2.5 : 1.2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke(); } });
      pts.forEach((p, i) => { const lit = k * 4 > 3 - p.d; ctx.fillStyle = lit ? (p.d % 2 ? '#ffd27a' : '#c49bff') : 'rgba(170,170,230,0.5)'; ctx.beginPath(); if (p.d === 3) ctx.arc(p.x, p.y, 4, 0, 7); else if (p.d % 2 === 0) { ctx.moveTo(p.x, p.y - 9); ctx.lineTo(p.x + 9, p.y + 7); ctx.lineTo(p.x - 9, p.y + 7); } else { ctx.moveTo(p.x, p.y + 9); ctx.lineTo(p.x + 9, p.y - 7); ctx.lineTo(p.x - 9, p.y - 7); } ctx.fill(); });
    };
    const tick = () => { if (!running) return; t++; if (t % 140 === 0) reroll(); draw(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();

/* EK:BAŞLA — ısınma laboratuvarları */
(function () {
  'use strict';

  SL.AILABS.pickval = {
    fn: 'node_value', jsFn: 'nodeValue',
    ref: (vals, isMax) => (isMax ? Math.max(...vals) : Math.min(...vals)),
    cases: () => { const cs = [[[3, 12, 8], false], [[2, 4, 6], false], [[14, 5, 2], false], [[3, 2, 2], true], [[7, 3, 9], false], [[-1], true]]; for (let i = 0; i < 18; i++) { const n = 1 + Math.floor(Math.random() * 5); cs.push([Array.from({ length: n }, () => Math.floor(Math.random() * 41) - 20), Math.random() < 0.5]); } return cs; },
    show: (v, m) => `çocukların değerleri ${JSON.stringify(v)}, sıra ${m ? 'MAX’ta (biz)' : 'MIN’de (rakip)'}`,
    hint: (v, m) => (m ? 'Sıra bizdeyse en BÜYÜK değeri seçeriz: Math.max(...values).' : 'Sıra rakipteyse bize en KÜÇÜK değeri bırakır: Math.min(...values).')
  };
  SL.AILABS.leafcount = {
    fn: 'leaf_count', jsFn: 'leafCount',
    ref: (b, d) => Math.pow(b, d),
    cases: () => [[30, 4], [3, 2], [9, 1], [2, 10], [7, 0], [35, 3], [10, 6], [250, 2], [5, 5], [4, 8]],
    show: (b, d) => `dallanma ${b}, derinlik ${d}`,
    hint: () => 'Her seviyede düğüm sayısı b ile çarpılır: b · b · … (d kez) = b üzeri d. Derinlik 0 ise tek bir yaprak vardır (kökün kendisi).'
  };
})();
/* EK:BİTİŞ */
