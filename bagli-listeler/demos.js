/* =====================================================================
   demos.js — "Bağlı Listeler" destesine özel demolar
   (Ortak dizi/liste bileşenleri ../ortak/liste.js içinde)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = window.DEMOS;
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);

  /* ---------- Başlık: neon düğüm zinciri (baştan ekle, sondan çıkar) ---------- */
  D.titlelist = function (root) {
    const W = 1280, H = 160;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let list = [], k = 0, timer, running = false, phase = 0;
    for (let i = 0; i < 7; i++) list.push(10 + rint(90));
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const BW = 96, GAP = 54, n = list.length, x0 = (W - (n * BW + (n - 1) * GAP)) / 2;
      ctx.font = '700 18px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      list.forEach((v, i) => {
        const x = x0 + i * (BW + GAP), y = 50;
        const hue = 180 + i * 18;
        const col = i === 0 && phase === 1 ? '#5ff0a0' : `hsl(${hue},90%,62%)`;
        ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.strokeStyle = col; ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y - 22, BW, 44); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.moveTo(x + BW - 26, y - 22); ctx.lineTo(x + BW - 26, y + 22); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillText(v, x + (BW - 26) / 2, y);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + BW - 13, y, 4, 0, 7); ctx.fill();
        if (i < n - 1) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(x + BW - 13, y); ctx.lineTo(x + BW + GAP - 6, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + BW + GAP - 6, y); ctx.lineTo(x + BW + GAP - 14, y - 5); ctx.lineTo(x + BW + GAP - 14, y + 5); ctx.fill(); }
        else { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '600 14px "JetBrains Mono"'; ctx.fillText('null', x + BW + 30, y); ctx.font = '700 18px "JetBrains Mono"'; }
      });
      ctx.fillStyle = '#ffd84d'; ctx.font = '12px "Press Start 2P"'; ctx.fillText('HEAD', x0 + (BW - 26) / 2, 98);
    };
    const tick = () => {
      if (!running) return;
      if (phase === 0) { list.unshift(10 + rint(90)); phase = 1; }
      else { list.pop(); phase = 0; }
      draw(); timer = setTimeout(tick, 900);
    };
    draw();
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };

  /* ---------- Yılan oyunu: gövde = bağlı liste ---------- */
  D.snake = function (root) {
    const CW = 28, COLS = 26, ROWS = 12, W = COLS * CW, H = ROWS * CW;
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    const chips = el('div', { class: 'll-chips snake-chips' });
    const stat = el('div', { class: 'sv-counters' });
    const note = el('div', { class: 'sv-note' });
    let body, food, timer, running = false, speed = 6, steps = 0, ops = 0, last = '';
    const reset = () => { body = [{ x: 5, y: 6 }, { x: 4, y: 6 }, { x: 3, y: 6 }]; placeFood(); steps = 0; ops = 0; last = 'Başlangıç: 3 düğümlü yılan'; draw(); };
    const free = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !body.slice(0, -1).some(p => p.x === x && p.y === y);
    const placeFood = () => { do { food = { x: rint(COLS), y: rint(ROWS) }; } while (body.some(p => p.x === food.x && p.y === food.y)); };
    const step = () => {
      const h = body[0];
      // basit YZ: yemeğe yaklaştıran, güvenli bir yön seç (açgözlü / greedy)
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: h.x + dx, y: h.y + dy }))
        .filter(p => free(p.x, p.y))
        .sort((p, q) => (Math.abs(p.x - food.x) + Math.abs(p.y - food.y)) - (Math.abs(q.x - food.x) + Math.abs(q.y - food.y)));
      if (!dirs.length) { last = '💀 Yılan sıkıştı! Yeniden başlıyor…'; draw(); setTimeout(reset, 800); return; }
      const nh = dirs[0];
      body.unshift(nh); ops++;                       // başa yeni düğüm: O(1)
      if (nh.x === food.x && nh.y === food.y) { placeFood(); last = `🍎 Yedi! Başa yeni düğüm eklendi, kuyruk SİLİNMEDİ → uzunluk ${body.length}`; }
      else { body.pop(); ops++; last = 'Başa yeni düğüm (yeni baş) + sondan bir düğüm sil (kuyruk) → yılan ilerledi'; }
      steps++; draw();
    };
    const draw = () => {
      const t = T();
      ctx.fillStyle = t.dark ? '#16241a' : '#e7f3df'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = t.dark ? '#1f3324' : '#d6e8cb'; ctx.lineWidth = 1;
      for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i * CW, 0); ctx.lineTo(i * CW, H); ctx.stroke(); }
      for (let j = 0; j <= ROWS; j++) { ctx.beginPath(); ctx.moveTo(0, j * CW); ctx.lineTo(W, j * CW); ctx.stroke(); }
      ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍎', food.x * CW + CW / 2, food.y * CW + CW / 2 + 1);
      for (let i = body.length - 1; i >= 0; i--) {
        const p = body[i];
        ctx.fillStyle = i === 0 ? '#2b8a3e' : `hsl(${130 - i * 2},55%,${45 + (i % 2) * 6}%)`;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x * CW + 2, p.y * CW + 2, CW - 4, CW - 4, 7) : ctx.rect(p.x * CW + 2, p.y * CW + 2, CW - 4, CW - 4); ctx.fill();
        if (i > 0) { const q = body[i - 1]; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x * CW + CW / 2, q.y * CW + CW / 2); ctx.lineTo(p.x * CW + CW / 2, p.y * CW + CW / 2); ctx.stroke(); }
      }
      ctx.fillStyle = '#fff'; ctx.font = '700 12px "JetBrains Mono"'; ctx.fillText('H', body[0].x * CW + CW / 2, body[0].y * CW + CW / 2 + 1);
      const show = body.slice(0, 9).map((p, i) => `<span class="ll-chip${i === 0 ? ' head' : ''}">(${p.x},${p.y})</span>`).join('<i>→</i>');
      chips.innerHTML = '<b class="mini">head</b> ' + show + (body.length > 9 ? '<i>→ …</i>' : '') + '<i>→</i><span class="ll-null">null</span>';
      stat.innerHTML = `<span class="cnt">uzunluk <b>${body.length}</b></span><span class="cnt">adım <b>${steps}</b></span><span class="cnt cmp">her adımda sabit iş: <b>1</b> ekleme + <b>1</b> silme</span>`;
      note.textContent = last;
    };
    const loop = () => { if (!running) return; step(); timer = setTimeout(loop, 1000 / speed); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('⏯ Oynat/Durdur', () => (running ? api.stop() : api.start()), 'primary'), btn('▶| Tek adım', () => { api.stop(); step(); }), btn('↺ Yeniden', reset), slider('Hız', 1, 20, speed, 1, v => (speed = v))),
      c, chips, stat, note);
    SL.onTheme(draw); reset();
    const api = { start() { if (!running) { running = true; loop(); } }, stop() { running = false; clearTimeout(timer); } };
    return { stop: api.stop };
  };

  /* ---------- Uno: dairesel çift yönlü liste ile tur sırası ---------- */
  D.uno = function (root) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', '0 0 620 360'); svg.setAttribute('class', 'uno-svg');
    const note = el('div', { class: 'sv-note' });
    const faces = ['🦊', '🐼', '🐸', '🐯', '🐙', '🦄', '🐵', '🐧'];
    let nid = 0, cur, dir = 1;
    const mk = f => ({ id: ++nid, f, next: null, prev: null });
    const ring = () => { const out = []; let x = cur; do { out.push(x); x = x.next; } while (x !== cur); return out; };
    const reset = () => {
      const ps = faces.slice(0, 5).map(mk);
      ps.forEach((p, i) => { p.next = ps[(i + 1) % ps.length]; p.prev = ps[(i - 1 + ps.length) % ps.length]; });
      cur = ps[0]; dir = 1; nid = ps.length; note.textContent = 'Sıra 🦊’da. Yön: saat yönü (next).'; draw();
    };
    const draw = () => {
      const t = T(), r = ring(), n = r.length, cx = 310, cy = 180, R = 130;
      const P = r.map((p, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return { p, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
      let s = `<defs><marker id="unoA" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${t.blue}"/></marker><marker id="unoB" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${t.pink}"/></marker></defs>`;
      P.forEach((a, i) => {
        const b = P[(i + 1) % n];
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy * 8, ny = ux * 8;
        s += `<line x1="${a.x + ux * 34 + nx}" y1="${a.y + uy * 34 + ny}" x2="${b.x - ux * 34 + nx}" y2="${b.y - uy * 34 + ny}" stroke="${t.blue}" stroke-width="2.5" marker-end="url(#unoA)" opacity="${dir > 0 ? 1 : 0.35}"/>`;
        s += `<line x1="${b.x - ux * 34 - nx}" y1="${b.y - uy * 34 - ny}" x2="${a.x + ux * 34 - nx}" y2="${a.y + uy * 34 - ny}" stroke="${t.pink}" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#unoB)" opacity="${dir < 0 ? 1 : 0.35}"/>`;
      });
      P.forEach(({ p, x, y }) => {
        const on = p === cur;
        s += `<circle cx="${x}" cy="${y}" r="30" fill="${on ? t.amber : t.card}" stroke="${on ? t.amber : t['ink-2']}" stroke-width="3"/><text x="${x}" y="${y + 11}" text-anchor="middle" font-size="30">${p.f}</text>`;
      });
      s += `<text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="16" font-weight="700" fill="${t.ink}" font-family="Source Sans 3">yön: ${dir > 0 ? 'next →' : '← prev'}</text>`;
      s += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="13" fill="${t.muted}" font-family="Source Sans 3">mavi = next · pembe = prev</text>`;
      svg.innerHTML = s;
    };
    const mv = () => (cur = dir > 0 ? cur.next : cur.prev);
    const acts = {
      next: () => { mv(); note.textContent = `Sıra ${cur.f}’da: cur = cur.${dir > 0 ? 'next' : 'prev'} — O(1)`; },
      rev: () => { dir = -dir; note.textContent = `🔄 Yön değişti! Artık ${dir > 0 ? 'next' : 'prev'} bağlantıları izleniyor. Çift yönlü liste sayesinde hiçbir şeyi yeniden düzenlemedik — O(1)`; },
      skip: () => { mv(); const s = cur.f; mv(); note.textContent = `⛔ ${s} atlandı. Sıra ${cur.f}’da (iki adım ilerledik)`; },
      out: () => {
        if (ring().length <= 2) { note.textContent = 'En az 2 oyuncu kalmalı.'; return; }
        const x = cur; x.prev.next = x.next; x.next.prev = x.prev; cur = dir > 0 ? x.next : x.prev;
        note.textContent = `💀 ${x.f} elendi: prev.next = next; next.prev = prev — sadece 2 bağlantı değişti (O(1)). Sıra ${cur.f}’da.`;
      },
      join: () => {
        if (ring().length >= faces.length) { note.textContent = 'Masa dolu!'; return; }
        const used = new Set(ring().map(p => p.f)); const f = faces.find(x => !used.has(x)); const p = mk(f);
        p.prev = cur; p.next = cur.next; cur.next.prev = p; cur.next = p;
        note.textContent = `➕ ${f} masaya katıldı, ${cur.f}’dan hemen sonra oturdu: 4 bağlantı değişti (O(1)).`;
      }
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      btn('▶ Sonraki oyuncu', () => { acts.next(); draw(); }, 'primary'), btn('🔄 Yön değiştir', () => { acts.rev(); draw(); }),
      btn('⛔ Atla', () => { acts.skip(); draw(); }), btn('💀 Sıradaki elensin', () => { acts.out(); draw(); }), btn('➕ Oyuncu katılsın', () => { acts.join(); draw(); }), btn('↺', reset)),
    svg, note);
    SL.onTheme(draw); reset();
  };

  /* ---------- Nesne havuzu + boş liste (free list) ---------- */
  D.pool = function (root) {
    const N = 10;
    let slot, freeHead, made = 0, reused = 0;
    const row = el('div', { class: 'pool-row' });
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('class', 'pool-svg'); svg.setAttribute('viewBox', '0 0 1000 70');
    const note = el('div', { class: 'sv-note' });
    const stat = el('div', { class: 'sv-counters' });
    const reset = () => {
      slot = Array.from({ length: N }, (_, i) => ({ active: false, nextFree: i + 1 < N ? i + 1 : -1 }));
      freeHead = 0; made = N; reused = 0; note.textContent = `Oyun başında ${N} mermi nesnesi BİR KEZ oluşturuldu. Hepsi boş listede: freeHead = 0.`; draw();
    };
    const draw = () => {
      const t = T();
      row.innerHTML = slot.map((s, i) => `<div class="pool-cell ${s.active ? 'on' : ''}${i === freeHead ? ' head' : ''}"><span>${s.active ? '🔫' : '·'}</span><i>${i}</i><u>${s.active ? 'aktif' : 'next: ' + s.nextFree}</u></div>`).join('');
      // boş liste okları
      let s = `<defs><marker id="pA" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${t.teal}"/></marker></defs>`;
      let i = freeHead, guard = 0; const cx = k => 50 + k * 100;
      s += `<text x="4" y="58" font-size="13" fill="${t.teal}" font-family="JetBrains Mono" font-weight="700">freeHead=${freeHead}</text>`;
      while (i !== -1 && guard++ < N) { const j = slot[i].nextFree; if (j !== -1) { const a = cx(i), b = cx(j), up = Math.min(30, 10 + Math.abs(b - a) / 12); s += `<path d="M${a},8 C${a},${8 + up * 1.5} ${b},${8 + up * 1.5} ${b},10" fill="none" stroke="${t.teal}" stroke-width="2" marker-end="url(#pA)"/>`; } i = j; }
      svg.innerHTML = s;
      stat.innerHTML = `<span class="cnt">aktif mermi <b>${slot.filter(x => x.active).length}</b></span><span class="cnt ok">yeni nesne oluşturma (new) <b>${made}</b> — hep aynı!</span><span class="cnt cmp">yeniden kullanım <b>${reused}</b></span>`;
    };
    const spawn = () => {
      if (freeHead === -1) { note.textContent = '⚠️ Havuz boş! (Seçenekler: havuzu büyüt, en eski mermiyi geri al, ya da ateş etme.)'; return; }
      const i = freeHead; freeHead = slot[i].nextFree; slot[i].active = true; reused++;
      note.textContent = `🔫 Ateş! Boş listenin başından ${i}. kutu alındı: freeHead = ${freeHead} — O(1), new YOK.`; draw();
    };
    const despawn = () => {
      const act = slot.map((s, i) => (s.active ? i : -1)).filter(i => i >= 0);
      if (!act.length) { note.textContent = 'Aktif mermi yok.'; return; }
      const i = act[rint(act.length)]; slot[i].active = false; slot[i].nextFree = freeHead; freeHead = i;
      note.textContent = `💥 ${i}. mermi çarptı ve yok oldu: kutu boş listenin BAŞINA eklendi (freeHead = ${i}). Nesne silinmedi → çöp yok!`; draw();
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('🔫 Ateş et (spawn)', spawn, 'primary'), btn('💥 Rastgele bir mermi yok olsun', despawn), btn('↺', reset)), row, svg, note, stat);
    SL.onTheme(draw); reset();
  };

  /* ---------- Düşman silme: kaydırarak vs swap & pop ---------- */
  D.swapremove = function (root) {
    const names = ['👹 Ork', '👺 Goblin', '🐉 Ejder', '🧟 Zombi', '🕷️ Örümcek', '💀 İskelet', '👻 Hayalet', '🐺 Kurt', '🦇 Yarasa', '🐍 Yılan'];
    let a = names.slice(), idx = 2, mode = 'shift';
    const row = el('div', { class: 'bs-row sr-row' });
    const note = el('div', { class: 'sv-note' });
    const stat = el('div', { class: 'sv-counters' });
    const draw = f => {
      row.innerHTML = f.arr.map((v, i) => `<div class="bs-cell${i === f.mv ? ' mid' : ''}${i === f.del ? ' del' : ''}${i === f.ins ? ' found' : ''}"><b>${v.split(' ')[0]}</b><i>${i}</i><u>${v.split(' ')[1] || ''}</u></div>`).join('');
      note.textContent = f.note;
      stat.innerHTML = `<span class="cnt swp"><b>${f.moves}</b> taşıma</span><span class="cnt">${f.arr.length} düşman</span>`;
    };
    const fp = new SL.FramePlayer(draw, { speed: 2 });
    const plan = () => {
      const arr = a.slice(), frames = []; let moves = 0;
      if (idx >= arr.length) idx = arr.length - 1;
      frames.push({ arr: arr.slice(), del: idx, moves, note: `${arr[idx]} öldü (indeks ${idx}). Listeden çıkarılmalı.` });
      if (mode === 'shift') {
        for (let i = idx; i < arr.length - 1; i++) { arr[i] = arr[i + 1]; moves++; frames.push({ arr: arr.slice(), mv: i, moves, note: `list.RemoveAt(${idx}): a[${i}] = a[${i + 1}] (sıra korunuyor)` }); }
        arr.pop(); frames.push({ arr: arr.slice(), moves, note: `Bitti: ${moves} taşıma. Baştaki bir düşman ölseydi N taşıma!` });
      } else {
        const last = arr.length - 1;
        frames.push({ arr: arr.slice(), del: idx, mv: last, moves, note: `Swap & pop: ölen düşmanın yerine SONDAKİNİ koy` });
        arr[idx] = arr[last]; moves++;
        frames.push({ arr: arr.slice(), ins: idx, moves, note: `a[${idx}] = a[${last}] (1 taşıma)` });
        arr.pop(); frames.push({ arr: arr.slice(), ins: idx, moves, note: `Son kutuyu at (pop). Toplam 1 taşıma — konum ne olursa olsun O(1)! Ama sıra değişti.` });
      }
      a = arr; fp.load(frames); fp.play();
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yöntem ', select({ shift: 'RemoveAt (kaydırarak, sıra korunur)', swap: 'Swap & pop (sona taşı, sil)' }, mode, v => (mode = v))),
      slider('ölen düşman indeksi', 0, 9, idx, 1, v => (idx = v)), btn('💀 Öldür', plan, 'primary'), btn('↺', () => { a = names.slice(); fp.load([{ arr: a.slice(), moves: 0, note: 'Başlangıç' }]); })),
    row, SL.transport(fp, { min: 0.5, max: 10 }), note, stat);
    fp.load([{ arr: a.slice(), moves: 0, note: 'Bir yöntem ve ölecek düşmanı seçip “Öldür”e basın.' }]);
    return { stop: () => fp.pause() };
  };
})();
