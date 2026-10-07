/* =====================================================================
   demos.js — Slaytlara özel etkileşimli demolar
   Her demo: <div class="demo" data-demo="ad"></div>
   Demo fonksiyonu { start(), stop() } döndürebilir (slayt görünürken çalışır).
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt } = SL;
  const D = (window.DEMOS = {});
  const T = () => SL.theme();
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rint = n => Math.floor(Math.random() * n);

  function slider(label, min, max, val, step, onInput, fmtFn) {
    const r = el('input', { type: 'range', min, max, value: val, step: step || 1 });
    const v = el('b', null, fmtFn ? fmtFn(val) : val);
    r.addEventListener('input', () => { v.textContent = fmtFn ? fmtFn(+r.value) : r.value; onInput(+r.value); });
    return el('label', { class: 'ctl' }, label, ' ', v, r);
  }
  function btn(txt, fn, cls) { return el('button', { class: 'btn ' + (cls || ''), onclick: fn }, txt); }

  /* ---------- 1) Başlık arka planı: sonsuz insertion sort ---------- */
  D.titlebars = function (root) {
    const W = 1280, H = 250, N = 64;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let a, i, j, raf, pause = 0, running = false;
    const reset = () => { a = SL.shuffle(Array.from({ length: N }, (_, k) => k + 1)); i = 1; j = 1; };
    reset();
    const draw = (hi) => {
      ctx.clearRect(0, 0, W, H);
      const bw = W / N;
      for (let k = 0; k < N; k++) {
        const h = (a[k] / N) * (H - 10);
        const hue = 260 - (a[k] / N) * 120;
        ctx.fillStyle = k === hi ? '#ffffff' : `hsla(${hue},95%,62%,${k < i ? 0.9 : 0.45})`;
        ctx.fillRect(k * bw + 2, H - h, bw - 4, h);
      }
    };
    const tick = () => {
      if (!running) return;
      if (pause > 0) { pause--; }
      else {
        for (let s = 0; s < 2; s++) {
          if (i >= N) { pause = 90; reset(); break; }
          if (j > 0 && a[j] < a[j - 1]) { [a[j], a[j - 1]] = [a[j - 1], a[j]]; j--; }
          else { i++; j = i; }
        }
      }
      draw(j);
      raf = requestAnimationFrame(tick);
    };
    draw(-1);
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; cancelAnimationFrame(raf); } };
  };

  /* ---------- 2) Dizi bellekte: adres hesabı ---------- */
  D.memory = function (root) {
    const vals = [120, 45, 300, 80, 15, 210, 60, 95];
    const types = { int: ['int', 4], double: ['double', 8], vec3: ['Vector3 (3 float)', 12], ref: ['referans / işaretçi (64-bit)', 8] };
    let t = 'int', idx = 3;
    const row = el('div', { class: 'mem-row' });
    const formula = el('div', { class: 'mem-formula' });
    const hex = n => '0x' + n.toString(16).toUpperCase();
    const draw = () => {
      const sz = types[t][1];
      row.innerHTML = '';
      vals.forEach((v, k) => {
        row.append(el('div', { class: 'mem-cell' + (k === idx ? ' on' : ''), style: `flex:${sz}` },
          el('div', { class: 'mem-val' }, t === 'ref' ? '→ 👾' : String(v)),
          el('div', { class: 'mem-idx' }, `a[${k}]`),
          el('div', { class: 'mem-addr' }, hex(0x1000 + k * sz))));
      });
      formula.innerHTML = `adres(a[<b class="c-blue">${idx}</b>]) = başlangıç + <b class="c-blue">${idx}</b> × <b class="c-red">${sz}</b> bayt = ` +
        `${hex(0x1000)} + ${idx * sz} = <b class="c-green">${hex(0x1000 + idx * sz)}</b>`;
    };
    root.append(
      el('div', { class: 'sv-controls' },
        el('label', { class: 'ctl' }, 'Eleman türü ', SL.select(Object.fromEntries(Object.entries(types).map(([k, v]) => [k, v[0]])), t, v => { t = v; draw(); })),
        slider('i =', 0, 7, idx, 1, v => { idx = v; draw(); })),
      row, formula);
    draw();
  };

  /* ---------- 3) Bardaklarla swap ---------- */
  D.swapcups = function (root) {
    const cupA = el('div', { class: 'cup' }), cupB = el('div', { class: 'cup' }), cupT = el('div', { class: 'cup temp' });
    const mk = (cup, name) => el('div', { class: 'cup-wrap' }, cup, el('div', { class: 'cup-name' }, name));
    const code = el('pre', { class: 'mini-code' });
    const lines = ['temp = a', 'a = b', 'b = temp'];
    const wrong = ['a = b', 'b = a'];
    let s = 0, mode = 'right';
    const C = { kola: '#5a2a12', ayran: '#f4f1e6', bos: 'transparent' };
    let st;
    const set = (cup, v) => { cup.dataset.v = v; cup.style.setProperty('--liq', C[v]); cup.title = v; cup.querySelector('span') ? null : cup.append(el('span')); cup.querySelector('span').textContent = v === 'bos' ? '' : v; };
    const render = () => {
      set(cupA, st.a); set(cupB, st.b); set(cupT, st.t);
      const L = mode === 'right' ? lines : wrong;
      code.innerHTML = L.map((l, k) => `<div class="${k < s ? 'done' : k === s ? 'next' : ''}">${k + 1}  ${l}</div>`).join('');
    };
    const reset = m => { mode = m; s = 0; st = { a: 'kola', b: 'ayran', t: 'bos' }; render(); };
    const step = () => {
      const L = mode === 'right' ? lines : wrong;
      if (s >= L.length) return reset(mode);
      const [dst, , src] = L[s].split(' ');
      const key = x => (x === 'temp' ? 't' : x);
      st[key(dst)] = st[key(src)];
      s++; render();
    };
    root.append(el('div', { class: 'cups' }, mk(cupA, 'a'), mk(cupB, 'b'), mk(cupT, 'temp')), code,
      el('div', { class: 'sv-controls' }, btn('Adım ▶', step, 'primary'), btn('Doğru yöntem', () => reset('right')), btn('Yanlış yöntem (temp yok)', () => reset('wrong'))));
    reset('right');
  };

  /* ---------- 4) Gauss üçgeni: N(N-1)/2 ---------- */
  D.gauss = function (root) {
    const W = 470, H = 340;
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    let N = 8, mirror = false;
    const info = el('div', { class: 'gauss-info' });
    const draw = () => {
      const t = T();
      ctx.clearRect(0, 0, W, H);
      const s = Math.min((W - 60) / N, (H - 40) / N);
      const ox = 50, oy = 10;
      ctx.font = `600 ${Math.min(14, s * 0.5)}px "JetBrains Mono"`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let i = 0; i < N; i++) {
        ctx.fillStyle = t.muted; ctx.fillText('i=' + i, ox - 6, oy + i * s + s / 2);
        for (let j = 0; j < N; j++) {
          const x = ox + j * s, y = oy + i * s;
          let fill = null;
          if (j > i) fill = t.blue;
          else if (mirror && j < i) fill = t.amber;
          ctx.fillStyle = fill || 'transparent';
          if (fill) ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
          ctx.strokeStyle = t.rule; ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
        }
      }
      const tri = (N * (N - 1)) / 2;
      info.innerHTML = `<div><span class="sw" style="background:${t.blue}"></span> Karşılaştırma (tur i'de <b>N−1−i</b> tane): <b>${fmt(tri)}</b></div>` +
        `<div class="k">${Array.from({ length: N - 1 }, (_, k) => N - 1 - k).join(' + ')} = <b>${fmt(tri)}</b></div>` +
        `<div>Formül: N(N−1)/2 = ${N}·${N - 1}/2 = <b>${fmt(tri)}</b></div>` +
        `<div>Tüm kare N² = ${fmt(N * N)} → üçgen ≈ yarısı ≈ <b>N²/2</b></div>` +
        (mirror ? `<div class="c-amber"><b>Gauss hilesi:</b> İki üçgen yan yana = N × (N−1) dikdörtgen!</div>` : '');
    };
    root.append(el('div', { class: 'sv-controls' }, slider('N =', 2, 24, N, 1, v => { N = v; draw(); }), btn('Gauss hilesi 🔁', () => { mirror = !mirror; draw(); })),
      el('div', { class: 'gauss' }, c, info));
    SL.onTheme(draw); draw();
  };

  /* ---------- 5) En yakın düşman = selection sort'un iç döngüsü ---------- */
  D.nearest = function (root) {
    const W = 1180, H = 430;
    const c = el('canvas', { style: 'cursor:crosshair' }); const ctx = SL.setupCanvas(c, W, H);
    let N = 14, K = 1, enemies = [], P = { x: W / 2, y: H / 2 };
    const stat = el('div', { class: 'sv-counters' });
    const note = el('div', { class: 'sv-note' });
    const dist = e => Math.hypot(e.x - P.x, e.y - P.y);
    // Her kare: {cur, best, ranks, cmps, note} — kısmi selection sort'un adımları
    const plan = () => {
      const frames = [{ cur: null, best: null, ranks: [], cmps: 0, note: '▶ Oynat ya da İleri ▶| ile adım adım tarayın.' }];
      const idx = enemies.map((_, k) => k), ranks = [];
      let cmps = 0;
      for (let i = 0; i < Math.min(K, N); i++) {
        let min = i;
        frames.push({ cur: null, best: idx[min], ranks: ranks.slice(), cmps, note: `Tur ${i + 1}: şimdilik en yakın = ${min + 1}. düşman (ilk bakılan)` });
        for (let j = i + 1; j < N; j++) {
          cmps++;
          const closer = dist(enemies[idx[j]]) < dist(enemies[idx[min]]);
          frames.push({ cur: idx[j], best: idx[min], ranks: ranks.slice(), cmps,
            note: `${Math.round(dist(enemies[idx[j]]))} < ${Math.round(dist(enemies[idx[min]]))} ? ${closer ? 'EVET → yeni en yakın!' : 'hayır'}` });
          if (closer) min = j;
        }
        [idx[i], idx[min]] = [idx[min], idx[i]];
        ranks.push(idx[i]);
        frames.push({ cur: null, best: null, ranks: ranks.slice(), cmps, note: `Tur ${i + 1} bitti: ${i + 1}. en yakın düşman bulundu (${N - 1 - i} karşılaştırma)` });
      }
      fp.load(frames);
    };
    const draw = f => {
      const t = T();
      ctx.clearRect(0, 0, W, H);
      if (f.cur != null) {
        ctx.strokeStyle = t.amber; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(enemies[f.cur].x, enemies[f.cur].y); ctx.stroke(); ctx.setLineDash([]);
      }
      if (f.best != null) {
        ctx.strokeStyle = t.red; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(enemies[f.best].x, enemies[f.best].y); ctx.stroke();
      }
      enemies.forEach((e, k) => {
        const r = f.ranks.indexOf(k);
        ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = r >= 0 || k === f.cur || k === f.best || fp.idx === 0 ? 1 : 0.55;
        ctx.fillText('👾', e.x, e.y);
        ctx.globalAlpha = 1;
        if (k === f.cur || k === f.best) { ctx.strokeStyle = k === f.best ? t.red : t.amber; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x, e.y, 19, 0, 7); ctx.stroke(); }
        if (r >= 0) {
          ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(e.x + 16, e.y - 16, 11, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '700 13px "Source Sans 3"'; ctx.fillText(r + 1, e.x + 16, e.y - 15);
        }
      });
      ctx.font = '30px serif'; ctx.fillText('🧙', P.x, P.y);
      stat.innerHTML = `<span class="cnt cmp"><b>${f.cmps}</b> mesafe karşılaştırması</span>` +
        `<span class="cnt">en yakın ${K} düşman ≈ K·N = <b>${K}×${N}</b></span>` +
        `<span class="cnt swp">tam sıralama: N²/2 ≈ <b>${fmt((N * (N - 1)) / 2)}</b></span>`;
      note.textContent = f.note;
    };
    const fp = new SL.FramePlayer(draw, { speed: 6 });
    const gen = () => { enemies = Array.from({ length: N }, () => ({ x: rnd(30, W - 30), y: rnd(30, H - 30) })); plan(); };
    c.addEventListener('click', ev => {
      const r = c.getBoundingClientRect();
      P = { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
      plan();
    });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      slider('Düşman N =', 3, 40, N, 1, v => { N = v; gen(); }),
      slider('En yakın K =', 1, 5, K, 1, v => { K = v; plan(); }),
      btn('🗺 Yeni harita', gen)),
    c, SL.transport(fp, { min: 0.5, max: 40 }), stat, note);
    SL.onTheme(() => fp.render()); gen();
    return { stop() { fp.pause(); } };
  };

  /* ---------- 6) Ters çiftler (inversions) ---------- */
  D.inversions = function (root) {
    const N = +(root.dataset.n || 8);
    let a, swaps = 0, start = 0, timer = null;
    const svgNS = 'http://www.w3.org/2000/svg';
    const W = 900, BOX = 76, H = 260;
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'inv-svg');
    const info = el('div', { class: 'sv-counters' });
    const inv = arr => { const r = []; for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) if (arr[i] > arr[j]) r.push([i, j]); return r; };
    const x0 = (W - N * BOX) / 2;
    const draw = () => {
      const t = T();
      const pairs = inv(a);
      let s = '';
      pairs.forEach(([i, j]) => {
        const xi = x0 + i * BOX + BOX / 2, xj = x0 + j * BOX + BOX / 2, hgt = 14 + (j - i) * 18;
        s += `<path d="M${xi},150 Q${(xi + xj) / 2},${150 - hgt * 1.6} ${xj},150" fill="none" stroke="${t.red}" stroke-width="2" opacity="0.65"/>`;
      });
      a.forEach((v, k) => {
        const x = x0 + k * BOX;
        s += `<g class="inv-box" data-k="${k}" style="cursor:pointer"><rect x="${x + 4}" y="155" width="${BOX - 8}" height="${BOX - 8}" rx="10" fill="${t.card}" stroke="${t.blue}" stroke-width="2.5"/>` +
          `<text x="${x + BOX / 2}" y="${155 + BOX / 2}" text-anchor="middle" dominant-baseline="central" font-size="30" font-weight="700" fill="${t.ink}" font-family="JetBrains Mono">${v}</text>` +
          `<text x="${x + BOX / 2}" y="${H - 6}" text-anchor="middle" font-size="14" fill="${t.muted}" font-family="JetBrains Mono">${k}</text></g>`;
      });
      svg.innerHTML = s;
      const sorted = pairs.length === 0;
      info.innerHTML = `<span class="cnt swp"><b>${pairs.length}</b> ters çift (inversion)</span>` +
        `<span class="cnt cmp"><b>${swaps}</b> komşu takası yaptın</span>` +
        (sorted ? `<span class="cnt ok">🎉 Sıralandı! Takas sayısı = başlangıçtaki ters çift sayısı (${start})</span>` : '<span class="cnt mini">Bir kutuya tıkla → solundakiyle yer değiştirsin</span>');
    };
    svg.addEventListener('click', ev => {
      const g = ev.target.closest('.inv-box'); if (!g) return;
      const k = +g.dataset.k; if (k === 0) return;
      [a[k], a[k - 1]] = [a[k - 1], a[k]]; swaps++; draw();
    });
    const load = arr => { clearInterval(timer); a = arr; swaps = 0; start = inv(a).length; draw(); };
    // Insertion sort'un sıradaki takası = soldan ilk "ters komşu" çift
    // (solundaki kısım hep sıralı olduğu için hareket eden eleman tam orada)
    const stepOnce = () => {
      clearInterval(timer);
      let k = 1; while (k < N && a[k] >= a[k - 1]) k++;
      if (k >= N) return;
      [a[k], a[k - 1]] = [a[k - 1], a[k]]; swaps++; draw();
    };
    const auto = () => {
      clearInterval(timer);
      let i = 1, j = 1;
      timer = setInterval(() => {
        while (i < N && !(j > 0 && a[j] < a[j - 1])) { i++; j = i; }
        if (i >= N) { clearInterval(timer); return; }
        [a[j], a[j - 1]] = [a[j - 1], a[j]]; j--; swaps++; draw();
      }, 450);
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      btn('🎲 Rastgele', () => load(SL.makeInput('random', N))),
      btn('Neredeyse sıralı', () => load([1, 2, 4, 3, 5, 6, 8, 7].slice(0, N))),
      btn('Ters', () => load(SL.makeInput('reversed', N))),
      btn('▶| Tek adım', stepOnce), btn('🤖 Insertion sort yapsın', auto, 'primary')), svg, info);
    SL.onTheme(draw);
    load(SL.makeInput('random', N));
    return { stop() { clearInterval(timer); } };
  };

  /* ---------- 7) İskambil eli ile insertion sort ---------- */
  D.cards = function (root) {
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suits = ['♠', '♥', '♦', '♣'];
    const N = 7, CW = 110, GAP = 18;
    const table = el('div', { class: 'card-table', style: `width:${N * (CW + GAP)}px` });
    const msg = el('div', { class: 'card-msg' });
    let hand, steps, si, timer;
    const pos = () => hand.forEach((c, k) => { c.el.style.left = k * (CW + GAP) + 'px'; });
    const deal = () => {
      clearInterval(timer); table.innerHTML = '';
      const deck = SL.shuffle(Array.from({ length: 52 }, (_, k) => ({ r: k % 13, s: Math.floor(k / 13) }))).slice(0, N);
      hand = deck.map(c => {
        const red = c.s === 1 || c.s === 2;
        c.el = el('div', { class: 'pcard' + (red ? ' red' : '') }, el('span', { class: 'tl' }, ranks[c.r] + suits[c.s]), el('span', { class: 'mid' }, suits[c.s]), el('span', { class: 'br' }, ranks[c.r] + suits[c.s]));
        table.append(c.el); return c;
      });
      pos();
      // adımları önceden hesapla
      const a = hand.slice(); steps = [];
      for (let i = 1; i < N; i++) {
        steps.push({ t: 'pick', i, card: a[i] });
        let j = i;
        while (j > 0 && a[j].r < a[j - 1].r) { steps.push({ t: 'sw', j, card: a[j], over: a[j - 1] }); [a[j], a[j - 1]] = [a[j - 1], a[j]]; j--; }
        steps.push({ t: 'drop', card: a[j], j });
      }
      si = 0; msg.innerHTML = 'Elinizdeki kartlar karışık. <b>Adım</b>’a basın.';
    };
    const name = c => ranks[c.r] + suits[c.s];
    const step = () => {
      if (si >= steps.length) { msg.innerHTML = '🎉 El sıralandı! Her kartı <b>soldaki sıralı kısma</b> ekledik.'; return false; }
      const s = steps[si++];
      hand.forEach(c => c.el.classList.remove('lift'));
      if (s.t === 'pick') { s.card.el.classList.add('lift'); msg.innerHTML = `<b>${name(s.card)}</b> kartını al (i = ${s.i}). Solundakiler zaten sıralı.`; }
      else if (s.t === 'sw') {
        s.card.el.classList.add('lift');
        const k = hand.indexOf(s.card); [hand[k], hand[k - 1]] = [hand[k - 1], hand[k]]; pos();
        msg.innerHTML = `${name(s.over)} &gt; ${name(s.card)} → <b>${name(s.card)}</b> bir sola kayar.`;
      } else msg.innerHTML = `<b>${name(s.card)}</b> yerine oturdu (j = ${s.j}). Solu yine sıralı ✔`;
      return true;
    };
    root.append(table, msg, el('div', { class: 'sv-controls' }, btn('Adım ▶', step, 'primary'),
      btn('Otomatik ⏩', () => { clearInterval(timer); timer = setInterval(() => { if (!step()) clearInterval(timer); }, 700); }),
      btn('🃏 Yeni el', deal)));
    deal();
    return { stop() { clearInterval(timer); } };
  };

  /* ---------- 8) Y-sıralama (çizim sırası) oyun demosu ---------- */
  D.ysort = function (root) {
    const W = 1180, H = 480;
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    let N = 40, speed = 1, mode = 'keep', showIdx = false, running = false, raf;
    let ents = [], order = [];
    const hist = [];
    const stat = el('div', { class: 'sv-counters' });
    const make = () => {
      ents = [];
      const trees = Math.round(N * 0.35);
      for (let k = 0; k < N; k++) {
        const tree = k < trees;
        ents.push({ tree, x: rnd(20, W - 20), y: rnd(70, H - 10), vx: tree ? 0 : rnd(-1, 1), vy: tree ? 0 : rnd(-1, 1), hue: rint(360) });
      }
      order = ents.map((_, k) => k); hist.length = 0;
    };
    const sortOrder = () => {
      let cmp = 0, ex = 0;
      const less = (i, j) => { cmp++; return ents[order[i]].y < ents[order[j]].y; };
      const exch = (i, j) => { ex++; const t = order[i]; order[i] = order[j]; order[j] = t; };
      if (mode === 'none') { order = ents.map((_, k) => k); return [0, 0]; }
      if (mode === 'selection' || mode === 'fresh') order = ents.map((_, k) => k);
      const n = order.length;
      if (mode === 'selection') {
        for (let i = 0; i < n; i++) { let m = i; for (let j = i + 1; j < n; j++) if (less(j, m)) m = j; exch(i, m); }
      } else {
        for (let i = 1; i < n; i++) for (let j = i; j > 0 && less(j, j - 1); j--) exch(j, j - 1);
      }
      return [cmp, ex];
    };
    const drawEnt = (e, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(e.x, e.y, e.tree ? 22 : 14, 6, 0, 0, 7); ctx.fill();
      if (e.tree) {
        ctx.fillStyle = '#7a4a22'; ctx.fillRect(e.x - 6, e.y - 34, 12, 34);
        ctx.fillStyle = '#2f9e44'; ctx.strokeStyle = '#1e6b2e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y - 52, 30, 0, 7); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = `hsl(${e.hue},70%,55%)`; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(e.x - 11, e.y - 30, 22, 30, 7) : ctx.rect(e.x - 11, e.y - 30, 22, 30); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd9b3'; ctx.beginPath(); ctx.arc(e.x, e.y - 40, 11, 0, 7); ctx.fill(); ctx.stroke();
      }
    };
    const frame = () => {
      const t = T();
      ents.forEach(e => {
        if (e.tree) return;
        e.vx += rnd(-0.15, 0.15); e.vy += rnd(-0.15, 0.15);
        e.vx = Math.max(-1.5, Math.min(1.5, e.vx)); e.vy = Math.max(-1.5, Math.min(1.5, e.vy));
        e.x += e.vx * speed; e.y += e.vy * speed;
        if (e.x < 15 || e.x > W - 15) e.vx *= -1;
        if (e.y < 60 || e.y > H - 8) e.vy *= -1;
        e.x = Math.max(15, Math.min(W - 15, e.x)); e.y = Math.max(60, Math.min(H - 8, e.y));
      });
      const [cmp, ex] = sortOrder();
      hist.push(cmp); if (hist.length > 60) hist.shift();
      ctx.fillStyle = t['card-2']; ctx.fillRect(0, 0, W, H);
      order.forEach((k, rank) => {
        drawEnt(ents[k], t);
        if (showIdx) { ctx.fillStyle = t.ink; ctx.font = '700 12px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText(rank, ents[k].x, ents[k].y + 14); }
      });
      const avg = Math.round(hist.reduce((s, v) => s + v, 0) / hist.length);
      stat.innerHTML = `<span class="cnt cmp"><b>${fmt(avg)}</b> karşılaştırma / kare</span>` +
        `<span class="cnt swp"><b>${fmt(ex)}</b> yer değiştirme (son kare)</span>` +
        `<span class="cnt">N²/2 = ${fmt(Math.round(N * N / 2))}</span><span class="cnt">N = ${N}</span>`;
    };
    const loop = () => { if (!running) return; frame(); raf = requestAnimationFrame(loop); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yöntem ', SL.select({ none: '❌ Sıralama yok', selection: 'Selection (her karede sıfırdan)', fresh: 'Insertion (her karede sıfırdan)', keep: '✅ Insertion (önceki karenin sırası)' }, mode, v => { mode = v; hist.length = 0; if (v === 'keep') order = ents.map((_, k) => k); })),
      slider('N =', 5, 400, N, 1, v => { N = v; make(); }),
      slider('Hareket hızı', 0, 8, speed, 0.5, v => (speed = v)),
      el('label', { class: 'ctl' }, el('input', { type: 'checkbox', onchange: e => (showIdx = e.target.checked) }), ' çizim sırası no'),
      btn('⏯ Oynat/Durdur', () => (running ? api.stop() : api.start())), btn('▶| Tek kare', () => { api.stop(); frame(); })), c, stat);
    make(); frame();
    const api = { start() { if (!running) { running = true; loop(); } }, stop() { running = false; cancelAnimationFrame(raf); } };
    return api;
  };

  /* ---------- 9) h-sıralama ---------- */
  D.hsort = function (root) {
    let a = SL.parseValues('S H E L L S O R T E X A M P L E'), h = 4;
    const seq = [13, 4, 1]; let si = 0;
    const view = el('div', { class: 'hs-view' });
    const groupsEl = el('div', { class: 'hs-groups' });
    const status = el('div', { class: 'sv-counters' });
    const color = k => `hsl(${(k % h) * (360 / h)},70%,${document.documentElement.dataset.theme === 'dark' ? 60 : 45}%)`;
    const isHSorted = () => { for (let i = h; i < a.length; i++) if (a[i] < a[i - h]) return false; return true; };
    const draw = () => {
      view.innerHTML = a.map((v, k) => `<div class="hs-cell" style="border-color:${color(k)};color:${color(k)}"><b>${v}</b><i>${k}</i></div>`).join('');
      let g = '';
      for (let r = 0; r < Math.min(h, 8); r++) {
        const items = []; for (let k = r; k < a.length; k += h) items.push(a[k]);
        const ok = items.every((v, k) => k === 0 || items[k - 1] <= v);
        g += `<div class="hs-grp" style="color:${color(r)}">grup ${r}: <b>${items.join(' ')}</b> ${ok ? '✔' : ''}</div>`;
      }
      if (h > 8) g += `<div class="hs-grp mini">… (${h} grup)</div>`;
      groupsEl.innerHTML = g;
      status.innerHTML = `<span class="cnt ${isHSorted() ? 'ok' : 'swp'}">${isHSorted() ? '✔ dizi ' + h + '-sıralı' : '✘ dizi henüz ' + h + '-sıralı değil'}</span>` +
        `<span class="cnt mini">h-sıralı: aralarında h adım olan her alt dizi sıralı</span>`;
    };
    const hsort = () => { for (let i = h; i < a.length; i++) for (let j = i; j >= h && a[j] < a[j - h]; j -= h) [a[j], a[j - h]] = [a[j - h], a[j]]; draw(); };
    const hsSel = SL.select({ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 7: '7', 13: '13' }, '4', v => { h = +v; draw(); });
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'h = ', hsSel),
      btn('h-sırala ✨', hsort, 'primary'), btn('🎲 Karıştır', () => { SL.shuffle(a); draw(); }),
      btn('Shellsort adımı: 13 → 4 → 1', () => { h = seq[si]; si = (si + 1) % seq.length; hsSel.value = String(h); hsort(); })),
      view, groupsEl, status);
    SL.onTheme(draw); draw();
  };

  /* ---------- 10) Büyüme grafiği ---------- */
  D.growth = function (root) {
    const W = 760, H = 380, M = { l: 70, r: 120, t: 16, b: 40 };
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    const series = [
      { k: 's1', name: 'Selection ~N²/2', f: n => n * n / 2 },
      { k: 's2', name: 'Insertion (ort.) ~N²/4', f: n => n * n / 4 },
      { k: 's3', name: 'Shellsort ~N^1.5', f: n => Math.pow(n, 1.5) },
      { k: 's4', name: 'Gelecek ders: N log N', f: n => n * Math.log2(Math.max(n, 2)), dash: true }
    ];
    let Nmax = 1000, logY = false, hover = null;
    const tbl = el('table', { class: 'growth-t' });
    const tip = el('div', { class: 'chart-tip' });
    const fmtTime = ops => {
      const s = ops / 1e9;
      if (s < 1e-3) return (s * 1e6).toFixed(1) + ' µs';
      if (s < 1) return (s * 1e3).toFixed(1) + ' ms';
      if (s < 120) return s.toFixed(1) + ' sn';
      if (s < 7200) return (s / 60).toFixed(1) + ' dk';
      if (s < 172800) return (s / 3600).toFixed(1) + ' saat';
      if (s < 3.15e7 * 2) return (s / 86400).toFixed(1) + ' gün';
      return fmt(Math.round(s / 3.15e7)) + ' yıl';
    };
    const ymax = () => series[0].f(Nmax);
    const X = n => M.l + (n / Nmax) * (W - M.l - M.r);
    const Y = v => {
      const top = ymax();
      if (logY) { const lo = 1; return H - M.b - (Math.log10(Math.max(v, lo)) / Math.log10(top)) * (H - M.t - M.b); }
      return H - M.b - (v / top) * (H - M.t - M.b);
    };
    const short = v => (v >= 1e12 ? (v / 1e12).toFixed(1) + ' trilyon' : v >= 1e9 ? (v / 1e9).toFixed(1) + ' milyar' : v >= 1e6 ? (v / 1e6).toFixed(1) + ' milyon' : v >= 1e3 ? (v / 1e3).toFixed(1) + ' bin' : Math.round(v) + '');
    const draw = () => {
      const t = T();
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.fillStyle = t.muted; ctx.font = '12px "Source Sans 3"';
      for (let g = 0; g <= 4; g++) {
        const v = logY ? Math.pow(10, (Math.log10(ymax()) * g) / 4) : (ymax() * g) / 4;
        const y = Y(v); ctx.beginPath(); ctx.moveTo(M.l, y); ctx.lineTo(W - M.r, y); ctx.stroke();
        ctx.textAlign = 'right'; ctx.fillText(short(v), M.l - 8, y + 4);
      }
      for (let g = 0; g <= 4; g++) { const n = (Nmax * g) / 4; ctx.textAlign = 'center'; ctx.fillText(short(n), X(n), H - M.b + 18); }
      ctx.fillText('N (eleman sayısı)', (M.l + W - M.r) / 2, H - 6);
      series.forEach(s => {
        ctx.strokeStyle = t[s.k]; ctx.lineWidth = 2; ctx.setLineDash(s.dash ? [6, 5] : []);
        ctx.beginPath();
        for (let px = 0; px <= 200; px++) { const n = (Nmax * px) / 200; const y = Y(s.f(n)); px ? ctx.lineTo(X(n), y) : ctx.moveTo(X(n), y); }
        ctx.stroke(); ctx.setLineDash([]);
      });
      // doğrudan etiketler (çakışmasın diye en az 16px aralık)
      const labs = series.map(s => ({ s, y: Math.max(M.t + 8, Y(s.f(Nmax))) })).sort((p, q) => p.y - q.y);
      for (let k = 1; k < labs.length; k++) labs[k].y = Math.max(labs[k].y, labs[k - 1].y + 16);
      ctx.textAlign = 'left'; ctx.font = '600 13px "Source Sans 3"';
      labs.forEach(({ s, y }) => {
        ctx.fillStyle = t[s.k]; ctx.fillRect(W - M.r + 6, y - 2, 10, 3);
        ctx.fillStyle = t.ink; ctx.fillText(s.name.split(' ')[0], W - M.r + 20, y + 3);
      });
      if (hover != null) {
        const x = X(hover);
        ctx.strokeStyle = t.muted; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, M.t); ctx.lineTo(x, H - M.b); ctx.stroke(); ctx.setLineDash([]);
        series.forEach(s => { ctx.fillStyle = t[s.k]; ctx.strokeStyle = t.card; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, Y(s.f(hover)), 5, 0, 7); ctx.fill(); ctx.stroke(); });
      }
      const n = hover != null ? Math.round(hover) : Nmax;
      tbl.innerHTML = `<tr><th>N = ${fmt(n)}</th><th>işlem</th><th>1 milyar işlem/sn ile</th></tr>` +
        series.map(s => `<tr><td><span class="sw" style="background:${t[s.k]}"></span>${s.name}</td><td>${short(s.f(n))}</td><td><b>${fmtTime(s.f(n))}</b></td></tr>`).join('');
    };
    c.addEventListener('mousemove', ev => {
      const r = c.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * W;
      if (px < M.l || px > W - M.r) { hover = null; tip.style.display = 'none'; draw(); return; }
      hover = ((px - M.l) / (W - M.l - M.r)) * Nmax; draw();
    });
    c.addEventListener('mouseleave', () => { hover = null; draw(); });
    const Ns = [100, 1000, 10000, 100000, 1000000, 1000000000];
    root.append(el('div', { class: 'sv-controls' },
      slider('N en fazla =', 0, Ns.length - 1, 1, 1, v => { Nmax = Ns[v]; draw(); }, v => fmt(Ns[v])),
      el('label', { class: 'ctl' }, el('input', { type: 'checkbox', onchange: e => { logY = e.target.checked; draw(); } }), ' logaritmik y ekseni')),
    el('div', { class: 'growth' }, c, tbl));
    SL.onTheme(draw); draw();
  };

  /* ---------- 11) Tilde: küçük terimler ---------- */
  D.tilde = function (root) {
    const out = el('div', { class: 'tilde' });
    const upd = e => {
      const N = Math.round(Math.pow(10, e));
      const big = (N * N) / 2, small = N / 2, tot = big - small;
      const pct = (small / big) * 100;
      out.innerHTML = `<div class="tilde-row"><span>N = <b>${fmt(N)}</b></span></div>` +
        `<div class="tilde-row">N(N−1)/2 = N²/2 − N/2 = <b>${fmt(big)}</b> − <b class="c-red">${fmt(small)}</b> = <b>${fmt(tot)}</b></div>` +
        `<div class="tilde-bar"><div style="width:${100 - Math.min(pct, 100) / 2}%" class="b1">N²/2</div><div style="width:${Math.max(Math.min(pct, 100) / 2, 0.3)}%" class="b2"></div></div>` +
        `<div class="tilde-row big">Küçük terim N/2, büyük terimin <b class="c-red">%${pct < 0.001 ? pct.toExponential(1) : pct.toFixed(pct < 1 ? 4 : 1)}</b>'i kadar</div>`;
    };
    root.append(el('div', { class: 'sv-controls' }, slider('N (10ⁿ): n =', 1, 6, 1, 0.25, upd, v => fmt(Math.round(Math.pow(10, v))))), out);
    upd(1);
  };

  /* ---------- 12) İki katına çıkarma deneyi (gerçek ölçüm) ---------- */
  D.doubling = function (root) {
    let alg = 'insertion';
    const tbl = el('table', { class: 'dbl-t' });
    const sorts = {
      insertion(a) { for (let i = 1; i < a.length; i++) for (let j = i; j > 0 && a[j] < a[j - 1]; j--) { const t = a[j]; a[j] = a[j - 1]; a[j - 1] = t; } },
      selection(a) { const n = a.length; for (let i = 0; i < n; i++) { let m = i; for (let j = i + 1; j < n; j++) if (a[j] < a[m]) m = j; const t = a[i]; a[i] = a[m]; a[m] = t; } },
      shell(a) { const n = a.length; let h = 1; while (h < n / 3) h = 3 * h + 1; for (; h >= 1; h = Math.floor(h / 3)) for (let i = h; i < n; i++) for (let j = i; j >= h && a[j] < a[j - h]; j -= h) { const t = a[j]; a[j] = a[j - h]; a[j - h] = t; } },
      builtin(a) { a.sort(); }
    };
    let busy = false;
    const run = async () => {
      if (busy) return; busy = true;
      tbl.innerHTML = '<tr><th>N</th><th>süre</th><th>oran T(2N)/T(N)</th><th>tahmini üs b = log₂(oran)</th></tr>';
      let prev = null;
      const sizes = alg === 'selection' || alg === 'insertion' ? [1000, 2000, 4000, 8000, 16000, 32000] : [16000, 32000, 64000, 128000, 256000, 512000, 1024000];
      for (const n of sizes) {
        await new Promise(r => setTimeout(r, 40));
        let best = Infinity;
        const reps = n <= 4000 ? 5 : 2;
        for (let r = 0; r < reps; r++) {
          const a = new Float64Array(n); for (let k = 0; k < n; k++) a[k] = Math.random();
          const t0 = performance.now(); sorts[alg](a); best = Math.min(best, performance.now() - t0);
        }
        const ratio = prev ? best / prev : null;
        tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(n)}</td><td>${best.toFixed(1)} ms</td><td>${ratio ? '<b>' + ratio.toFixed(2) + '</b>' : '—'}</td><td>${ratio ? Math.log2(ratio).toFixed(2) : '—'}</td></tr>`);
        prev = best;
        if (best > 2500) break;
      }
      busy = false;
    };
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Algoritma ', SL.select({ insertion: 'Insertion', selection: 'Selection', shell: 'Shellsort', builtin: 'Hazır sort() (TypedArray)' }, alg, v => (alg = v))),
      btn('🧪 Deneyi başlat', run, 'primary')), tbl);
    tbl.innerHTML = '<tr><td class="mini">Algoritmayı seçip “Deneyi başlat”a basın. Ölçüm <b>bu bilgisayarda, şu anda</b> yapılır.</td></tr>';
  };

  /* ---------- 13) Kararlılık: envanter ---------- */
  D.stability = function (root) {
    const RAR = [['Sıradan', 'common'], ['Nadir', 'rare'], ['Epik', 'epic'], ['Efsanevi', 'legend']];
    const icons = { Balta: '🪓', Kalkan: '🛡️', İksir: '🧪', Yay: '🏹', Kılıç: '🗡️', Asa: '🪄', Miğfer: '⛑️', Çekiç: '🔨', Bot: '🥾', Yüzük: '💍', Anahtar: '🗝️', Harita: '🗺️' };
    const base = [['Yüzük', 1], ['Kılıç', 3], ['Balta', 0], ['Asa', 2], ['Harita', 1], ['İksir', 0], ['Çekiç', 3], ['Kalkan', 1], ['Yay', 2], ['Anahtar', 0], ['Bot', 1], ['Miğfer', 3]];
    let items = base.map(([name, r]) => ({ name, r }));
    const grid = el('div', { class: 'inv-grid' });
    const msg = el('div', { class: 'sv-counters' });
    const COLS = 6, CW = 150, CH = 120;
    items.forEach(it => {
      it.el = el('div', { class: 'item ' + RAR[it.r][1] }, el('div', { class: 'ic' }, icons[it.name]), el('div', { class: 'nm' }, it.name), el('div', { class: 'rr' }, RAR[it.r][0]));
      grid.append(it.el);
    });
    grid.style.height = Math.ceil(items.length / COLS) * CH + 'px';
    const place = () => items.forEach((it, k) => { it.el.style.left = (k % COLS) * CW + 'px'; it.el.style.top = Math.floor(k / COLS) * CH + 'px'; });
    const byName = (x, y) => x.name.localeCompare(y.name, 'tr');
    const check = () => {
      const res = [];
      for (let r = 3; r >= 0; r--) {
        const g = items.filter(it => it.r === r);
        const ok = g.every((it, k) => k === 0 || byName(g[k - 1], it) <= 0);
        res.push(`<span class="cnt ${ok ? 'ok' : 'swp'}">${RAR[r][0]}: ${ok ? '✔ A→Z' : '✘ isim sırası bozuldu'}</span>`);
      }
      return res.join('');
    };
    const rarLess = (x, y) => x.r > y.r; // nadir olan önce
    const doSort = kind => {
      const a = items;
      if (kind === 'name') {
        for (let i = 1; i < a.length; i++) for (let j = i; j > 0 && byName(a[j], a[j - 1]) < 0; j--) [a[j], a[j - 1]] = [a[j - 1], a[j]];
        msg.innerHTML = '<span class="cnt">1. adım: isme göre sıralandı (A→Z)</span>';
      } else if (kind === 'ins') {
        for (let i = 1; i < a.length; i++) for (let j = i; j > 0 && rarLess(a[j], a[j - 1]); j--) [a[j], a[j - 1]] = [a[j - 1], a[j]];
        msg.innerHTML = '<span class="cnt">Insertion (kararlı) ile nadirliğe göre:</span>' + check();
      } else if (kind === 'sel') {
        for (let i = 0; i < a.length; i++) { let m = i; for (let j = i + 1; j < a.length; j++) if (rarLess(a[j], a[m])) m = j; [a[i], a[m]] = [a[m], a[i]]; }
        msg.innerHTML = '<span class="cnt">Selection (kararsız) ile nadirliğe göre:</span>' + check();
      } else {
        items = base.map(([name, r]) => items.find(it => it.name === name));
        msg.innerHTML = '<span class="cnt mini">Başlangıç düzeni</span>';
      }
      place();
    };
    root.append(el('div', { class: 'sv-controls' },
      btn('↺ Başlangıç', () => doSort('reset')),
      btn('1 · İsme göre', () => doSort('name'), 'primary'),
      btn('2 · Nadirliğe göre: Insertion', () => doSort('ins')),
      btn('2 · Nadirliğe göre: Selection', () => doSort('sel'))), grid, msg);
    place(); msg.innerHTML = '<span class="cnt mini">Önce “İsme göre”, sonra iki seçenekten birini deneyin. Her denemeden önce ↺ yapın.</span>';
  };

  /* ---------- 14) Karıştırma yanlılığı ---------- */
  D.shuffle = function (root) {
    let n = 3, trials = 60000;
    const methods = [
      { name: 'Knuth (Fisher–Yates)', f: a => { for (let i = 0; i < a.length; i++) { const r = rint(i + 1); const t = a[i]; a[i] = a[r]; a[r] = t; } } },
      { name: 'Saf: her i için rastgele [0, N)', f: a => { for (let i = 0; i < a.length; i++) { const r = rint(a.length); const t = a[i]; a[i] = a[r]; a[r] = t; } } },
      { name: 'sort(() => Math.random() − 0.5)', f: a => { a.sort(() => Math.random() - 0.5); } }
    ];
    const wrap = el('div', { class: 'shuf-grid' });
    const perms = arr => arr.length <= 1 ? [arr] : arr.flatMap((x, k) => perms(arr.filter((_, q) => q !== k)).map(p => [x, ...p]));
    const run = () => {
      const t = T();
      wrap.innerHTML = '';
      const P = perms(Array.from({ length: n }, (_, k) => k + 1)).map(p => p.join(''));
      const exp = trials / P.length;
      methods.forEach(m => {
        const cnt = Object.fromEntries(P.map(p => [p, 0]));
        for (let r = 0; r < trials; r++) { const a = Array.from({ length: n }, (_, k) => k + 1); m.f(a); cnt[a.join('')]++; }
        const vals = P.map(p => cnt[p]);
        const max = Math.max(...vals, exp * 1.6);
        const dev = Math.max(...vals.map(v => Math.abs(v - exp) / exp)) * 100;
        const W = 360, H = 190, bw = (W - 20) / P.length;
        let s = `<svg viewBox="0 0 ${W} ${H + 30}" class="shuf-svg">`;
        P.forEach((p, k) => {
          const h = (cnt[p] / max) * H;
          s += `<rect x="${10 + k * bw + 1}" y="${H - h}" width="${bw - 2}" height="${h}" rx="3" fill="${t.s1}"><title>${p}: ${fmt(cnt[p])} kez (beklenen ${fmt(Math.round(exp))})</title></rect>`;
          if (P.length <= 6) s += `<text x="${10 + k * bw + bw / 2}" y="${H + 18}" text-anchor="middle" font-size="13" fill="${t.ink}" font-family="JetBrains Mono">${p}</text>`;
        });
        const ey = H - (exp / max) * H;
        s += `<line x1="6" x2="${W - 6}" y1="${ey}" y2="${ey}" stroke="${t.ink}" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${W - 8}" y="${ey - 5}" text-anchor="end" font-size="12" fill="${t.ink}">beklenen</text></svg>`;
        wrap.append(el('div', { class: 'shuf-cell' }, el('div', { class: 'race-title' }, m.name), el('div', { html: s }),
          el('div', { class: 'mini' }, `En büyük sapma: `, el('b', { class: dev > 10 ? 'c-red' : 'c-green' }, '%' + dev.toFixed(1)))));
      });
    };
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Eleman sayısı ', SL.select({ 3: '3 (6 permütasyon)', 4: '4 (24 permütasyon)' }, '3', v => { n = +v; run(); })),
      el('label', { class: 'ctl' }, 'Deneme ', SL.select({ 6000: '6.000', 60000: '60.000', 300000: '300.000' }, '60000', v => { trials = +v; run(); })),
      btn('🎲 Tekrar çalıştır', run, 'primary')), wrap);
    SL.onTheme(run); run();
  };

  /* ---------- 15) Tetris 7-torba ---------- */
  D.tetris = function (root) {
    const P = 'IOTSZJL'.split('');
    const COL = { I: '#22c7e6', O: '#f2c400', T: '#9b4fd9', S: '#3cbf4a', Z: '#e5383b', J: '#2f6fe0', L: '#f08a24' };
    const seqEl = el('div', { class: 'tet-wrap' });
    const gen = (kind, len) => {
      const out = [];
      while (out.length < len) {
        if (kind === 'bag') out.push(...SL.shuffle(P.slice()));
        else out.push(P[rint(7)]);
      }
      return out.slice(0, len);
    };
    const drought = s => { let best = 0, cur = 0; s.forEach(p => { if (p === 'I') { best = Math.max(best, cur); cur = 0; } else cur++; }); return Math.max(best, cur); };
    const run = () => {
      seqEl.innerHTML = '';
      [['rnd', 'Tamamen rastgele'], ['bag', '7-torba (shuffle)']].forEach(([k, name]) => {
        const s = gen(k, 63), big = gen(k, 100000);
        const row = el('div', { class: 'tet-row' });
        s.forEach((p, i) => row.append(el('span', { class: 'tet' + (k === 'bag' && i % 7 === 0 ? ' bag' : ''), style: `background:${COL[p]}` }, p)));
        seqEl.append(el('div', { class: 'race-title' }, name), row,
          el('div', { class: 'mini' }, '100.000 parçada en uzun “I” kuraklığı: ', el('b', { class: k === 'bag' ? 'c-green' : 'c-red' }, drought(big) + ' parça')));
      });
    };
    root.append(el('div', { class: 'sv-controls' }, btn('🎲 Yeniden üret', run, 'primary')), seqEl);
    run();
  };

  /* ---------- 16) Önbellek: dizi vs bağlı liste ---------- */
  D.cache = function (root) {
    const CELLS = 64, LINE = 8, CACHE = 3, N = 16;
    const grid = el('div', { class: 'mem-grid' });
    const cacheEl = el('div', { class: 'cache-box' });
    const stat = el('div', { class: 'sv-counters' });
    const note = el('div', { class: 'sv-note' });
    let arrCells, listCells, mode = 'arr';
    const draw = f => {
      grid.innerHTML = '';
      const cells = mode === 'arr' ? arrCells : listCells;
      for (let k = 0; k < CELLS; k++) {
        const line = Math.floor(k / LINE);
        const pos = cells.indexOf(k);
        const cls = ['mcell'];
        if (pos >= 0) cls.push('used');
        if (f.cache.includes(line)) cls.push('cached');
        if (k === f.cur) cls.push('cur');
        grid.append(el('div', { class: cls.join(' '), title: `adres ${k}, satır ${line}` }, pos >= 0 ? (mode === 'arr' ? `a[${pos}]` : `n${pos}`) : ''));
      }
      cacheEl.innerHTML = `<b>CPU önbelleği</b> (${CACHE} satır × ${LINE} hücre)<br>` + Array.from({ length: CACHE }, (_, k) => `<span class="cline">${f.cache[k] != null ? 'satır ' + f.cache[k] : '—'}</span>`).join('');
      stat.innerHTML = `<span class="cnt ok"><b>${f.hits}</b> isabet (hit) · ~1 ns</span><span class="cnt swp"><b>${f.miss}</b> ıska (miss) · ~100 ns</span><span class="cnt cmp">toplam ≈ <b>${fmt(f.ns)}</b> ns</span>`;
      note.textContent = f.note;
    };
    const fp = new SL.FramePlayer(draw, { speed: 3 });
    const plan = () => {
      const cells = mode === 'arr' ? arrCells : listCells;
      let cache = [], hits = 0, miss = 0, ns = 0;
      const frames = [{ cur: -1, cache: [], hits, miss, ns, note: mode === 'arr' ? 'Dizi: elemanlar bellekte yan yana. ▶ ile gezmeye başla.' : 'Bağlı liste: düğümler belleğe dağılmış. ▶ ile gezmeye başla.' }];
      cells.forEach((cur, k) => {
        const line = Math.floor(cur / LINE);
        const name = mode === 'arr' ? `a[${k}]` : `n${k}`;
        let txt;
        if (cache.includes(line)) { hits++; ns += 1; cache = cache.filter(x => x !== line).concat([line]); txt = `${name}: satır ${line} zaten önbellekte → İSABET (1 ns)`; }
        else { miss++; ns += 100; cache.push(line); if (cache.length > CACHE) cache.shift(); txt = `${name}: satır ${line} önbellekte yok → ISKA, RAM'den 8 hücrelik satır getirildi (100 ns)`; }
        frames.push({ cur, cache: cache.slice(), hits, miss, ns, note: txt });
      });
      fp.load(frames);
    };
    const setup = () => {
      arrCells = Array.from({ length: N }, (_, k) => 4 + k);
      listCells = SL.shuffle(Array.from({ length: CELLS }, (_, k) => k).filter(k => k < 4 || k >= 4 + N)).slice(0, N);
      plan();
    };
    const modeSel = SL.select({ arr: 'Dizi (a[0] … a[15])', list: 'Bağlı liste (n0 → n1 → …)' }, mode, v => { mode = v; plan(); });
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Gezilecek yapı ', modeSel),
      btn('🎲 Listeyi yeniden dağıt', setup)),
    el('div', { class: 'cache-wrap' }, grid, cacheEl), SL.transport(fp, { min: 0.5, max: 20 }), stat, note);
    setup();
    return { stop() { fp.pause(); } };
  };

  /* ---------- 17) Insertion: en iyi / ortalama / en kötü ölçümü ---------- */
  D.insertcases = function (root) {
    let N = 100;
    const tbl = el('table', { class: 'dbl-t' });
    const count = kind => {
      const a = SL.makeInput(kind, N); let c = 0, x = 0;
      for (let i = 1; i < N; i++) for (let j = i; j > 0; j--) { c++; if (!(a[j] < a[j - 1])) break; [a[j], a[j - 1]] = [a[j - 1], a[j]]; x++; }
      return [c, x];
    };
    const upd = () => {
      const rows = [['sorted', 'Sıralı (en iyi)', `N−1 = ${fmt(N - 1)}`, '0'],
        ['random', 'Rastgele (ortalama)', `~N²/4 = ${fmt(Math.round(N * N / 4))}`, `~N²/4 = ${fmt(Math.round(N * N / 4))}`],
        ['reversed', 'Ters (en kötü)', `~N²/2 = ${fmt(Math.round(N * N / 2))}`, `~N²/2 = ${fmt(Math.round(N * N / 2))}`]];
      tbl.innerHTML = '<tr><th>Girdi</th><th>ölçülen karşılaştırma</th><th>formül</th><th>ölçülen yer değiştirme</th><th>formül</th></tr>' +
        rows.map(([k, name, fc, fx]) => { const [c, x] = count(k); return `<tr><td>${name}</td><td><b>${fmt(c)}</b></td><td>${fc}</td><td><b>${fmt(x)}</b></td><td>${fx}</td></tr>`; }).join('');
    };
    root.append(el('div', { class: 'sv-controls' }, slider('N =', 10, 2000, N, 10, v => { N = v; upd(); }), btn('🎲 Tekrar ölç', upd)), tbl);
    upd();
  };
})();
