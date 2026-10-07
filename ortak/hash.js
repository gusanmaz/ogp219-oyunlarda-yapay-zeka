/* =====================================================================
   hash.js — Hash tabloları (core.js gerekir)
   Demolar: hashfn (string hash adım adım), chainviz (ayrı zincirleme),
            probeviz (doğrusal yoklama + büyütme), clusters (kümelenme
            deneyi), birthday (doğum günü / kupon toplayıcı), spatialhash
            (uzaysal hash ızgarası)
   Bileşen: .hashlab (get / hash_str yaz)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);

  /* Java tarzı string hash: h = 31*h + c (32 bit taşma ile) */
  SL.strHash = s => { let h = 0; for (const ch of String(s)) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0; return h; };
  SL.hashIdx = (k, M) => (SL.strHash(k) & 0x7fffffff) % M;
  const WORDS = 'kılıç kalkan iksir ok yay balta mızrak asa yüzük kolye miğfer zırh çizme eldiven harita anahtar meşale halat bomba tuzak kristal altın gümüş elmas yakut zümrüt ejder goblin ork trol iskelet zombi vampir kurt örümcek yarasa slime golem hayalet büyücü şövalye okçu hırsız rahip ozan'.split(' ');

  /* ---------- string hash adım adım ---------- */
  D.hashfn = function (root) {
    const d = root.dataset;
    let M = +(d.m || 97);
    const input = el('input', { type: 'text', class: 'key-in', size: 12, value: d.default || 'iksir' });
    const out = el('div');
    const upd = () => {
      const s = input.value || '';
      let h = 0; const rows = [];
      for (const ch of s) {
        const c = ch.charCodeAt(0), prev = h;
        h = (Math.imul(31, h) + c) | 0;
        rows.push(`<tr><td><b>${ch === ' ' ? '␠' : ch}</b></td><td>${c}</td><td>31 × ${fmt(prev)} + ${c}</td><td><b>${fmt(h)}</b></td></tr>`);
      }
      const idx = (h & 0x7fffffff) % M;
      out.innerHTML = `<table class="sum-t" style="font-size:18px"><tr><th>karakter</th><th>kod</th><th>hesap</th><th>h</th></tr>${rows.join('')}</table>` +
        `<p class="lead" style="margin-top:8px">hash("${s.replace(/</g, '&lt;')}") = <b>${fmt(h)}</b> → indeks = (h &amp; 0x7fffffff) % ${M} = <b class="c-green">${idx}</b></p>` +
        (rows.length > 6 ? '<p class="mini">h çok büyüyünce 32 bite sığmaz: <b>taşar</b> ve negatif olabilir (C#/Java’da int, JS’te <code>Math.imul</code>). Önemli değil — işaret bitini <code>&amp; 0x7fffffff</code> ile silip mod alıyoruz.</p>' : '');
    };
    input.addEventListener('input', upd);
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Anahtar ', input), el('label', { class: 'ctl' }, 'M ', select({ 7: '7', 13: '13', 97: '97', 1024: '1024' }, String(M), v => { M = +v; upd(); }))), out);
    upd();
  };

  /* ---------- ayrı zincirleme ---------- */
  D.chainviz = function (root) {
    const d = root.dataset;
    let M = +(d.m || 7), B = [];
    const view = el('div', { class: 'ch-view' }), note = el('div', { class: 'sv-note tree-note' }), stat = el('div', { class: 'sv-counters' });
    const snap = (hl = {}, bk = -1) => ({ B: B.map(c => c.slice()), hl, bk, M });
    const fp = new SL.FramePlayer(f => {
      view.innerHTML = f.B.map((c, i) => `<div class="ch-row${i === f.bk ? ' on' : ''}"><span class="ch-idx">${i}</span><span class="ch-arrow">→</span>${c.map(k => `<span class="ll-chip ${f.hl[k] || ''}">${k}</span>`).join('<span class="ch-link">→</span>') || '<span class="mini">null</span>'}</div>`).join('');
      note.textContent = f.note;
      const N = f.B.reduce((s, c) => s + c.length, 0), mx = Math.max(0, ...f.B.map(c => c.length));
      stat.innerHTML = `<span class="cnt">N = <b>${N}</b></span><span class="cnt">M = <b>${f.M}</b></span><span class="cnt">doluluk α = N/M = <b>${(N / f.M).toFixed(2)}</b></span><span class="cnt">en uzun zincir <b>${mx}</b></span>` + (f.cmp != null ? `<span class="cnt">karşılaştırma <b>${f.cmp}</b></span>` : '');
    }, { speed: 1.5 });
    const P = (F, note, hl, bk, cmp) => F.push(Object.assign(snap(hl, bk), { note, cmp }));
    const put = (k, F) => {
      const i = SL.hashIdx(k, M);
      P(F, `put("${k}"): hash % ${M} = ${i} → ${i} numaralı zincir`, {}, i);
      let cmp = 0;
      for (const x of B[i]) { cmp++; if (x === k) { P(F, `"${k}" zincirde bulundu → değeri güncelle`, { [x]: 'cur' }, i, cmp); return; } P(F, `"${x}" ≠ "${k}" → zincirde ilerle`, { [x]: 'past' }, i, cmp); }
      B[i].unshift(k);
      P(F, `Zincirde yok → BAŞINA ekle (O(1))`, { [k]: 'cur' }, i, cmp);
    };
    const get = k => {
      const F = [], i = SL.hashIdx(k, M); let cmp = 0;
      P(F, `get("${k}"): hash % ${M} = ${i} → sadece ${i} numaralı zincire bak`, {}, i, 0);
      for (const x of B[i]) { cmp++; if (x === k) { P(F, `Bulundu ✔ (${cmp} karşılaştırma)`, { [x]: 'cur' }, i, cmp); fp.load(F); fp.play(); return; } P(F, `"${x}" ≠ "${k}"`, { [x]: 'past' }, i, cmp); }
      P(F, `Zincirin sonu (null) → "${k}" tabloda YOK (${cmp} karşılaştırma)`, {}, i, cmp);
      fp.load(F); fp.play();
    };
    const input = el('input', { type: 'text', class: 'key-in', size: 9, value: d.default || 'iksir' });
    const reset = () => { B = Array.from({ length: M }, () => []); };
    const fill = n => { reset(); SL.shuffle(WORDS.slice()).slice(0, n).forEach(k => B[SL.hashIdx(k, M)].unshift(k)); const F = []; P(F, `${n} eşya adı eklendi. Zincir uzunlukları ne kadar dengeli?`, {}, -1); fp.load(F); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Anahtar ', input),
      btn('➕ put', () => { const k = input.value.trim(); if (k) { const F = []; put(k, F); fp.load(F); fp.play(); } }, 'primary'),
      btn('🔍 get', () => { const k = input.value.trim(); if (k) get(k); }),
      btn('🎲 15 eşya', () => fill(15)), btn('🎲 40 eşya', () => fill(40)),
      el('label', { class: 'ctl' }, 'M ', select({ 5: '5', 7: '7', 11: '11', 13: '13' }, String(M), v => { M = +v; fill(15); }))),
    view, SL.transport(fp, { min: 0.3, max: 10 }), note, stat);
    fill(+(d.n || 10));
    return { stop: () => fp.pause() };
  };

  /* ---------- doğrusal yoklama ---------- */
  D.probeviz = function (root) {
    const d = root.dataset;
    let M = +(d.m || 16), K = new Array(M).fill(null), resize = d.resize != null;
    const view = el('div', { class: 'lp-view' }), note = el('div', { class: 'sv-note tree-note' }), stat = el('div', { class: 'sv-counters' });
    const fp = new SL.FramePlayer(f => {
      // kümeleri bul (dairesel)
      const cl = new Array(f.K.length).fill(-1); let c = 0;
      for (let i = 0; i < f.K.length; i++) if (f.K[i] != null) { cl[i] = i > 0 && f.K[i - 1] != null ? cl[i - 1] : c++; }
      view.innerHTML = f.K.map((k, i) => `<div class="lp-cell ${k == null ? 'empty' : 'cl' + (cl[i] % 3)} ${f.hl[i] || ''}"><i>${i}</i><b>${k == null ? '' : k}</b></div>`).join('');
      note.textContent = f.note;
      const N = f.K.filter(x => x != null).length;
      stat.innerHTML = `<span class="cnt">N = <b>${N}</b></span><span class="cnt">M = <b>${f.K.length}</b></span><span class="cnt">doluluk α = <b>${(N / f.K.length).toFixed(2)}</b></span>` + (f.probes != null ? `<span class="cnt">yoklama <b>${f.probes}</b></span>` : '') + `<span class="cnt">en uzun küme <b>${longest(f.K)}</b></span>`;
    }, { speed: 2 });
    const longest = A => { let best = 0, run = 0; for (const x of A.concat(A)) { run = x != null ? run + 1 : 0; best = Math.max(best, Math.min(run, A.length)); } return best; };
    const P = (F, note, hl = {}, probes) => F.push({ K: K.slice(), hl, note, probes });
    const put = (k, F, quiet) => {
      if (resize && (K.filter(x => x != null).length + 1) / M > 0.5) {
        const old = K.filter(x => x != null);
        if (!quiet) P(F, `Doluluk ½’yi geçecek → tabloyu 2 katına çıkar (M = ${M} → ${2 * M}) ve herkesi YENİDEN hash’le`);
        M *= 2; K = new Array(M).fill(null);
        old.forEach(x => put(x, F, true));
        if (!quiet) P(F, `Büyütme bitti: ${old.length} anahtar yeni yerlerinde. (Pahalı ama nadir: ortalamada eleman başına sabit)`);
      }
      let i = SL.hashIdx(k, M), probes = 1;
      if (!quiet) P(F, `put("${k}"): hash % ${M} = ${i}`, { [i]: 'cur' }, probes);
      while (K[i] != null) {
        if (K[i] === k) { if (!quiet) P(F, `"${k}" zaten burada → değeri güncelle`, { [i]: 'found' }, probes); return; }
        if (!quiet) P(F, `${i} dolu ("${K[i]}") → bir sağa bak${i === M - 1 ? ' (sondan başa sarar)' : ''}`, { [i]: 'past', [(i + 1) % M]: 'cur' }, probes);
        i = (i + 1) % M; probes++;
      }
      K[i] = k;
      if (!quiet) P(F, `${i} boş → "${k}" buraya yerleşti (${probes} yoklama)`, { [i]: 'found' }, probes);
    };
    const get = k => {
      const F = []; let i = SL.hashIdx(k, M), probes = 1;
      P(F, `get("${k}"): hash % ${M} = ${i}`, { [i]: 'cur' }, probes);
      while (K[i] != null) {
        if (K[i] === k) { P(F, `Bulundu ✔ (${probes} yoklama)`, { [i]: 'found' }, probes); fp.load(F); fp.play(); return; }
        P(F, `${i}: "${K[i]}" ≠ "${k}" → sağa`, { [i]: 'past', [(i + 1) % M]: 'cur' }, probes);
        i = (i + 1) % M; probes++;
      }
      P(F, `${i} BOŞ → "${k}" tabloda yok (boş hücreye kadar bakmak yeter) — ${probes} yoklama`, { [i]: 'miss' }, probes);
      fp.load(F); fp.play();
    };
    const input = el('input', { type: 'text', class: 'key-in', size: 9, value: d.default || 'iksir' });
    const fill = a => { M = +(d.m || 16); K = new Array(M).fill(null); const r = resize; resize = false; SL.shuffle(WORDS.slice()).slice(0, Math.round(a * M)).forEach(k => put(k, [], true)); resize = r; const F = []; P(F, `Doluluk ${a}: kümelere (renkli bloklar) dikkat — büyük kümeye düşen yeni anahtar uzun yürür ve kümeyi daha da büyütür.`); fp.load(F); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Anahtar ', input),
      btn('➕ put', () => { const k = input.value.trim(); if (k) { const F = []; put(k, F); fp.load(F); fp.play(); } }, 'primary'),
      btn('🔍 get', () => { const k = input.value.trim(); if (k) get(k); }),
      btn('🎲 ¼ dolu', () => fill(0.25)), btn('🎲 ½ dolu', () => fill(0.5)), btn('🎲 ⅞ dolu', () => fill(0.875)),
      el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { resize = e.target.checked; } }); cb.checked = resize; return cb; })(), ' α > ½ olunca büyüt')),
    view, SL.transport(fp, { min: 0.3, max: 10 }), note, stat);
    fill(+(d.alpha || 0.25));
    return { stop: () => fp.pause() };
  };

  /* ---------- kümelenme deneyi ---------- */
  D.clusters = function (root) {
    const tbl = el('table', { class: 'dbl-t' });
    const run = () => {
      const M = 1 << 15;
      tbl.innerHTML = '<tr><th>doluluk α</th><th>bulma: ölçülen</th><th>Knuth: ½(1 + 1/(1−α))</th><th>bulamama: ölçülen</th><th>Knuth: ½(1 + 1/(1−α)²)</th></tr>';
      for (const a of [0.1, 0.25, 0.5, 0.75, 0.9, 0.95]) {
        const A = new Uint8Array(M), N = Math.round(a * M); let hit = 0;
        for (let n = 0; n < N; n++) { let i = rint(M), p = 1; while (A[i]) { i = (i + 1) & (M - 1); p++; } A[i] = 1; hit += p; }
        let miss = 0; const Q = 20000;
        for (let q = 0; q < Q; q++) { let i = rint(M), p = 1; while (A[i]) { i = (i + 1) & (M - 1); p++; } miss += p; }
        const kh = 0.5 * (1 + 1 / (1 - a)), km = 0.5 * (1 + 1 / ((1 - a) * (1 - a)));
        tbl.insertAdjacentHTML('beforeend', `<tr><td>${a}</td><td><b>${(hit / N).toFixed(2)}</b></td><td>${kh.toFixed(2)}</td><td class="${a > 0.7 ? 'c-red' : ''}"><b>${(miss / Q).toFixed(2)}</b></td><td>${km.toFixed(2)}</td></tr>`);
      }
    };
    root.append(el('div', { class: 'sv-controls' }, btn('🧪 Deneyi başlat', run, 'primary'), el('span', { class: 'mini' }, 'M = 32.768 hücre; α·M anahtar rastgele yerlere doğrusal yoklamayla eklenir; ortalama yoklama sayısı ölçülür.')), tbl);
    tbl.innerHTML = '<tr><td class="mini">“Deneyi başlat”a basın.</td></tr>';
  };

  /* ---------- doğum günü / kupon toplayıcı ---------- */
  D.birthday = function (root) {
    let M = 365;
    const tbl = el('div');
    const run = () => {
      const R = 2000; let first = 0, all = 0, mx = 0;
      for (let r = 0; r < R; r++) {
        const seen = new Uint8Array(M); let n = 0;
        for (;;) { n++; const i = rint(M); if (seen[i]) break; seen[i] = 1; } first += n;
        if (r < 300) { const s2 = new Uint8Array(M); let cnt = 0, m = 0; while (cnt < M) { m++; const i = rint(M); if (!s2[i]) { s2[i] = 1; cnt++; } } all += m; }
        if (r < 300) { const c = new Uint16Array(M); let b = 0; for (let i = 0; i < M; i++) { const j = rint(M); c[j]++; if (c[j] > b) b = c[j]; } mx += b; }
      }
      const f = x => x.toFixed(1);
      tbl.innerHTML = `<table class="sum-t" style="font-size:20px"><tr><th>soru (M = ${fmt(M)} kova)</th><th>ölçülen (ortalama)</th><th>teori</th></tr>` +
        `<tr><td>🎂 İlk çakışmaya kadar kaç anahtar? <span class="mini">(doğum günü problemi)</span></td><td><b>${f(first / R)}</b></td><td>√(πM/2) ≈ ${f(Math.sqrt((Math.PI * M) / 2))}</td></tr>` +
        `<tr><td>🎟️ Her kova en az bir anahtar alana kadar kaç anahtar? <span class="mini">(kupon toplayıcı)</span></td><td><b>${f(all / 300)}</b></td><td>M (ln M + 0,58) ≈ ${f(M * (Math.log(M) + 0.5772))}</td></tr>` +
        `<tr><td>📦 M anahtar atınca en kalabalık kovada kaç anahtar?</td><td><b>${f(mx / 300)}</b></td><td>çok yavaş büyür (asimptotik olarak ~ ln M / ln ln M)</td></tr></table>`;
    };
    root.append(el('div', { class: 'sv-controls' }, slider('M (kova sayısı)', 50, 5000, M, 5, v => { M = v; }), btn('🎲 2000 kez dene', run, 'primary')), tbl);
    run();
  };

  /* ---------- uzaysal hash ızgarası ---------- */
  D.spatialhash = function (root) {
    const W = 1180, H = 330;
    const c = el('canvas'), ctx = SL.setupCanvas(c, W, H);
    const stat = el('div', { class: 'sv-counters' });
    let N = 400, CELL = 40, R = 5, pts = [], raf = 0, running = false, playing = true, method = 'grid', last = null, focus = 0;
    const make = () => { pts = Array.from({ length: N }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, hit: false })); };
    const step = () => {
      pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; p.hit = false; });
      let tests = 0, pairs = 0;
      const near = (a, b) => { tests++; const dx = a.x - b.x, dy = a.y - b.y; if (dx * dx + dy * dy < 4 * R * R) { pairs++; a.hit = b.hit = true; } };
      if (method === 'brute') { for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) near(pts[i], pts[j]); }
      else {
        const grid = new Map(), key = (cx, cy) => cx * 100003 + cy;   // (cx, cy) → tek bir sayı
        pts.forEach((p, i) => { const k = key(Math.floor(p.x / CELL), Math.floor(p.y / CELL)); let b = grid.get(k); if (!b) grid.set(k, (b = [])); b.push(i); });
        pts.forEach((p, i) => {
          const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
          for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const b = grid.get(key(cx + dx, cy + dy)); if (b) for (const j of b) if (j > i) near(p, pts[j]); }
        });
        last = { cells: grid.size };
      }
      last = Object.assign(last || {}, { tests, pairs });
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H);
      if (method === 'grid') {
        ctx.strokeStyle = t.rule; ctx.lineWidth = 1;
        for (let x = 0; x <= W; x += CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        const f = pts[focus];
        if (f) { const cx = Math.floor(f.x / CELL), cy = Math.floor(f.y / CELL); ctx.fillStyle = t.dark ? 'rgba(255,200,80,0.16)' : 'rgba(230,150,20,0.16)'; ctx.fillRect((cx - 1) * CELL, (cy - 1) * CELL, 3 * CELL, 3 * CELL); }
      }
      pts.forEach((p, i) => { ctx.fillStyle = i === focus && method === 'grid' ? t.amber : p.hit ? t.red : t.blue; ctx.beginPath(); ctx.arc(p.x, p.y, i === focus && method === 'grid' ? R + 2 : R, 0, 7); ctx.fill(); });
      if (last) stat.innerHTML = `<span class="cnt">nesne <b>${N}</b></span><span class="cnt">mesafe testi <b>${fmt(last.tests)}</b></span><span class="cnt">kaba kuvvet olsaydı <b>${fmt((N * (N - 1)) / 2)}</b></span><span class="cnt">çarpışan çift <b>${last.pairs}</b></span>` + (method === 'grid' ? `<span class="cnt">dolu hücre (hash tablosundaki anahtar) <b>${last.cells}</b></span>` : '');
    };
    const loop = () => { if (!running) return; if (playing) { step(); draw(); } raf = requestAnimationFrame(loop); };
    const playBtn = btn('⏸ Durdur', () => { playing = !playing; playBtn.textContent = playing ? '⏸ Durdur' : '▶ Oynat'; });
    c.addEventListener('mousemove', e => { const r = c.getBoundingClientRect(), x = ((e.clientX - r.left) * W) / r.width, y = ((e.clientY - r.top) * H) / r.height; let b = 0, bd = Infinity; pts.forEach((p, i) => { const dd = (p.x - x) ** 2 + (p.y - y) ** 2; if (dd < bd) { bd = dd; b = i; } }); focus = b; if (!playing) draw(); });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yöntem ', select({ grid: 'Uzaysal hash ızgarası', brute: 'Kaba kuvvet (her çift)' }, method, v => { method = v; step(); draw(); })),
      slider('Nesne', 50, 3000, N, 50, v => { N = v; make(); step(); draw(); }),
      slider('Hücre', 12, 120, CELL, 4, v => { CELL = v; step(); draw(); }),
      playBtn, btn('İleri ▶| (1 kare)', () => { playing = false; playBtn.textContent = '▶ Oynat'; step(); draw(); })), c, stat);
    make(); step(); draw();
    SL.onTheme(draw);
    return { start() { if (!running) { running = true; loop(); } }, stop() { running = false; cancelAnimationFrame(raf); } };
  };

  /* ---------- .hashlab ---------- */
  const PY_HS = `
import json
def _ref(s, M):
    h = 0
    for ch in s:
        h = (31 * h + ord(ch)) % M
    return h
def _run(cases):
    res = []
    for s, M in cases:
        try:
            r = hash_str(s, M)
            res.append([r, None, _ref(s, M)])
        except BaseException as e:
            res.append([None, type(e).__name__ + ": " + str(e), _ref(s, M)])
    return json.dumps(res)
`;
  SL.HashLab = function (root) {
    const task = root.dataset.task || 'get';
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const ref = (s, M) => { let h = 0; for (const ch of s) h = (31 * h + ch.charCodeAt(0)) % M; return h; };
    shell.onRun = async () => {
      shell.clearOut();
      const code = shell.cm.getValue();
      if (task === 'hash') {
        const cs = [['a', 97], ['ab', 97], ['iksir', 97], ['kılıç', 1009], ['', 13]];
        for (let t = 0; t < 40; t++) cs.push([SL.shuffle(WORDS.slice())[0] + (rint(3) ? '' : rint(100)), [7, 13, 97, 1009, 65536][rint(5)]]);
        let res;
        if (shell.lang === 'python') {
          shell.setMsg('', '…');
          let py;
          try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
          py.setStdout({ batched: s => shell.print(s) });
          try { py.runPython(PY_HS); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
          py.globals.set('_cases', py.toPy(cs));
          try { res = JSON.parse(py.runPython('_run(_cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        } else {
          let fn;
          try { fn = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof hashStr !== 'function') throw new Error(\"Kodda 'hashStr(s, M)' fonksiyonu bulunamadı.\"); return hashStr;")(shell.print, SL.makeGuard(100000)); }
          catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
          res = cs.map(([s, M]) => { try { return [fn(s, M), null, ref(s, M)]; } catch (e) { return [null, SL.jsErrorText(e), ref(s, M)]; } });
        }
        const bad = res.findIndex(r => r[1] || r[0] !== r[2]);
        const k = bad >= 0 ? bad : 2;
        view.innerHTML = `<div class="mini">${bad >= 0 ? 'Başarısız test' : 'Örnek'}: hash_str("${cs[k][0]}", ${cs[k][1]})</div><div class="mini">beklenen <b>${res[k][2]}</b> · seninki <b class="${bad >= 0 ? 'c-red' : 'c-green'}">${res[k][1] ? '⚠️ ' + res[k][1] : res[k][0]}</b></div>`;
        if (bad >= 0) shell.setMsg('err', `❌ ${res.filter(r => !r[1] && r[0] === r[2]).length}/${cs.length} test geçti.`); else shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
        return;
      }
      // task get (JS): doğrusal yoklamalı tabloda arama
      let fn;
      try { fn = new Function('print', '__g', 'hash', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof get !== 'function') throw new Error(\"Kodda 'get(keys, vals, key)' fonksiyonu bulunamadı.\"); return get;")(shell.print, SL.makeGuard(100000), SL.hashIdx); }
      catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      let ok = 0, total = 0, fail = null;
      for (let t = 0; t < 30 && !fail; t++) {
        const M = [8, 16, 32][rint(3)], keys = new Array(M).fill(null), vals = new Array(M).fill(null);
        const ins = SL.shuffle(WORDS.slice()).slice(0, Math.floor(M * (0.3 + Math.random() * 0.55)));
        ins.forEach((k, n) => { let i = SL.hashIdx(k, M); while (keys[i] != null) i = (i + 1) % M; keys[i] = k; vals[i] = n; });
        const absent = WORDS.filter(w => !ins.includes(w)).slice(0, 5);
        for (const q of ins.concat(absent)) {
          total++;
          const want = ins.includes(q) ? ins.indexOf(q) : null;
          let got; try { got = fn(keys.slice(), vals.slice(), q); } catch (e) { fail = { q, keys, want, got: '⚠️ ' + SL.jsErrorText(e) }; break; }
          if (got === undefined) got = null;
          if (got !== want) { fail = { q, keys, want, got }; break; }
          ok++;
        }
      }
      if (fail) {
        view.innerHTML = `<div class="mini">Tablo (M = ${fail.keys.length}):</div><div class="lp-view small">${fail.keys.map((k, i) => `<div class="lp-cell ${k == null ? 'empty' : ''}"><i>${i}</i><b>${k == null ? '' : k}</b></div>`).join('')}</div><div class="mini">get("${fail.q}") → beklenen <b>${fail.want}</b> · seninki <b class="c-red">${fail.got}</b> (hash % M = ${SL.hashIdx(fail.q, fail.keys.length)})</div>`;
        shell.setMsg('err', '❌ Test başarısız.');
      } else { view.innerHTML = '<div class="mini">30 rastgele tablo, her birinde var olan ve olmayan anahtarlar arandı.</div>'; shell.setMsg('ok', `✅ ${total}/${total} arama doğru!`); }
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.hashlab', SL.HashLab);
})();
