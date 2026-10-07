/* =====================================================================
   yigin.js — Yığın ve kuyruk görselleştirmeleri (core.js'e ihtiyaç duyar)
   Demolar: sqviz, floodfill, brackets, twostack, ring, callstack, qbench
   Bileşen: .fnlab (fonksiyon testli kod laboratuvarı: brackets, postfix)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);

  /* Ortak: yığın paneli (dikey tabaklar) ve kuyruk şeridi */
  function stackHTML(items, title, o = {}) {
    const top = items.length - 1;
    return `<div class="sq-stack"><div class="sp-title">${title}</div>` +
      (items.length ? items.slice().reverse().map((x, k) => `<div class="sq-plate${k === 0 ? ' top' : ''}${o.hiTop && k === 0 ? ' hi' : ''}">${x}${k === 0 ? '<i>← tepe (top)</i>' : ''}</div>`).join('') : '<div class="sp-empty">(boş)</div>') +
      `<div class="sp-floor">taban</div></div>`;
  }
  function queueHTML(items, title, o = {}) {
    return `<div class="sq-queue"><div class="sp-title">${title}</div><div class="sq-lane"><span class="sq-end">çıkış ⟵</span>` +
      (items.length ? items.map((x, k) => `<span class="sq-item${k === 0 ? ' front' : ''}${o.hiBack && k === items.length - 1 ? ' hi' : ''}">${x}</span>`).join('') : '<span class="sp-empty">(boş)</span>') +
      `<span class="sq-end">⟵ giriş</span></div><div class="mini">baş (front) solda · son (back) sağda</div></div>`;
  }
  SL.stackHTML = stackHTML; SL.queueHTML = queueHTML;

  /* ---------- 1) Yığın ve kuyruk yan yana: LIFO vs FIFO ---------- */
  D.sqviz = function (root) {
    const pool = ['🗡️', '🛡️', '🧪', '🏹', '💍', '🪄', '🍖', '🗝️', '💣', '📜'];
    let st = [], q = [], k = 0, outS = [], outQ = [], last = '';
    const view = el('div', { class: 'sq-view' });
    const draw = (hi) => {
      view.innerHTML = `<div class="sq-col">${stackHTML(st, '📚 Yığın (stack) — LIFO', { hiTop: hi === 'push' })}<div class="sq-out">Çıkanlar: <b>${outS.join(' ') || '—'}</b></div></div>` +
        `<div class="sq-col">${queueHTML(q, '🎟️ Kuyruk (queue) — FIFO', { hiBack: hi === 'push' })}<div class="sq-out">Çıkanlar: <b>${outQ.join(' ') || '—'}</b></div><div class="sv-note">${last}</div></div>`;
    };
    const push = () => { const x = pool[k++ % pool.length]; st.push(x); q.push(x); last = `${x} ikisine de eklendi: yığında TEPEYE, kuyrukta SONA.`; draw('push'); };
    const pop = () => {
      if (!st.length) { last = 'İkisi de boş! (boş yapıdan çıkarmaya “underflow” denir)'; draw(); return; }
      const a = st.pop(), b = q.shift(); outS.push(a); outQ.push(b);
      last = `Yığından ${a} çıktı (EN SON giren) · kuyruktan ${b} çıktı (EN ÖNCE giren).`; draw();
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('➕ Ekle (push / enqueue)', push, 'primary'), btn('➖ Çıkar (pop / dequeue)', pop),
      btn('↺', () => { st = []; q = []; k = 0; outS = []; outQ = []; last = ''; draw(); })), view);
    push(); push(); push();
    last = 'Üç eşya eklendi. Şimdi “Çıkar”a basın: hangisi çıkacak?'; draw();
  };

  /* ---------- 2) Boya kovası: yığın (DFS) vs kuyruk (BFS) ---------- */
  D.floodfill = function (root) {
    const C = 32, R = 16, S = 24, W = C * S, H = R * S;
    const c = el('canvas', { style: 'cursor:pointer' }); const ctx = SL.setupCanvas(c, W, H);
    const stat = el('div', { class: 'sv-counters' });
    const note = el('div', { class: 'sv-note' });
    let wall, start = { x: 3, y: 3 }, mode = root.dataset.mode || 'stack', order = [], sizes = [];
    const makeMap = () => {
      wall = Array.from({ length: R }, (_, y) => Array.from({ length: C }, (_, x) => x === 0 || y === 0 || x === C - 1 || y === R - 1));
      // odalar: birkaç duvar çizgisi, kapılı
      const v = [8, 16, 24], h = [8];
      v.forEach(x => { for (let y = 1; y < R - 1; y++) wall[y][x] = true; const d = [2 + rint(4), 10 + rint(4)]; d.forEach(y => (wall[y][x] = false)); });
      h.forEach(y => { for (let x = 1; x < C - 1; x++) if (!v.includes(x)) wall[y][x] = true; [4, 12, 20, 28].forEach(x => (wall[y][x] = false)); });
      for (let k = 0; k < 18; k++) { const x = 1 + rint(C - 2), y = 1 + rint(R - 2); if (!(x === start.x && y === start.y)) wall[y][x] = true; }
    };
    const plan = () => {
      const seen = Array.from({ length: R }, () => Array(C).fill(false));
      const box = [[start.x, start.y]]; order = []; sizes = [];
      while (box.length) {
        const [x, y] = mode === 'stack' ? box.pop() : box.shift();
        if (wall[y][x] || seen[y][x]) continue;
        seen[y][x] = true; order.push([x, y]); sizes.push(box.length);
        [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (!wall[ny][nx] && !seen[ny][nx]) box.push([nx, ny]); });
      }
      fp.load(Array.from({ length: order.length + 1 }, (_, k) => k));
    };
    const draw = k => {
      const t = T(), n = order.length;
      ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (wall[y][x]) { ctx.fillStyle = t.dark ? '#4a4a5a' : '#5a5a66'; ctx.fillRect(x * S, y * S, S, S); }
      for (let i = 0; i < k; i++) {
        const [x, y] = order[i];
        ctx.fillStyle = `hsl(${mode === 'stack' ? 280 - (i / n) * 200 : 190 - (i / n) * 150},80%,${t.dark ? 50 : 62}%)`;
        ctx.fillRect(x * S + 1, y * S + 1, S - 2, S - 2);
      }
      if (k > 0 && k <= n) { const [x, y] = order[k - 1]; ctx.strokeStyle = t.red; ctx.lineWidth = 3; ctx.strokeRect(x * S + 2, y * S + 2, S - 4, S - 4); }
      ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🪣', start.x * S + S / 2, start.y * S + S / 2 + 1);
      stat.innerHTML = `<span class="cnt">boyanan <b>${k}</b> / ${n}</span><span class="cnt cmp">${mode === 'stack' ? 'yığında' : 'kuyrukta'} bekleyen: <b>${k > 0 ? sizes[k - 1] : 1}</b></span>`;
      note.textContent = mode === 'stack' ? 'Yığın (DFS): hep EN SON eklenen komşuya devam → uzun, kıvrımlı koridorlar boyunca “derine” dalar.' : 'Kuyruk (BFS): hep EN ÖNCE eklenene devam → başlangıçtan dalga dalga, halka halka yayılır. Her hücreye EN KISA yoldan ulaşır!';
    };
    const fp = new SL.FramePlayer(f => draw(f), { speed: 60 });
    c.addEventListener('click', e => {
      const b = c.getBoundingClientRect(); const x = Math.floor(((e.clientX - b.left) / b.width) * C), y = Math.floor(((e.clientY - b.top) / b.height) * R);
      if (!wall[y][x]) { start = { x, y }; plan(); fp.play(); }
    });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Bekleyenleri tut: ', select({ stack: '📚 Yığın (stack) → DFS', queue: '🎟️ Kuyruk (queue) → BFS' }, mode, v => { mode = v; plan(); fp.play(); })),
      btn('🗺 Yeni harita', () => { makeMap(); plan(); fp.play(); }), el('span', { class: 'mini' }, 'Haritaya tıklayarak kovayı taşıyın')),
    c, SL.transport(fp, { min: 2, max: 400, unit: 'hücre/sn' }), stat, note);
    SL.onTheme(() => fp.render());
    makeMap(); plan();
    return { stop: () => fp.pause() };
  };

  /* ---------- 3) Parantez dengesi ---------- */
  D.brackets = function (root) {
    const input = el('input', { type: 'text', class: 'keys-in', value: root.dataset.text || '{ [ ( ) ] ( ) }' });
    const view = el('div', { class: 'br-view' });
    const note = el('div', { class: 'sv-note' });
    const pairs = { ')': '(', ']': '[', '}': '{' };
    const draw = f => {
      const chars = [...f.s];
      view.innerHTML = `<div class="br-str">${chars.map((ch, i) => `<span class="${i === f.i ? 'cur' : i < f.i ? 'done' : ''}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</div>` + stackHTML(f.st, 'Yığın');
      note.innerHTML = f.note;
    };
    const fp = new SL.FramePlayer(draw, { speed: 1.5 });
    const plan = () => {
      const s = input.value, st = [], frames = [{ s, i: -1, st: [], note: 'Soldan sağa oku. Açılan → yığına it. Kapanan → yığının tepesiyle eşleşmeli.' }];
      let ok = true;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if ('([{'.includes(ch)) { st.push(ch); frames.push({ s, i, st: st.slice(), note: `<b>${ch}</b> açılıyor → push` }); }
        else if (pairs[ch]) {
          if (!st.length) { frames.push({ s, i, st: [], note: `<b>${ch}</b> kapanıyor ama yığın BOŞ → <b class="c-red">dengesiz ✘</b>` }); ok = false; break; }
          const top = st.pop();
          if (top !== pairs[ch]) { frames.push({ s, i, st: st.slice(), note: `<b>${ch}</b> kapanıyor ama tepedeki <b>${top}</b> → eşleşmiyor: <b class="c-red">dengesiz ✘</b>` }); ok = false; break; }
          frames.push({ s, i, st: st.slice(), note: `<b>${ch}</b> kapanıyor, tepedeki <b>${top}</b> ile eşleşti → pop ✔` });
        }
      }
      if (ok) frames.push({ s, i: s.length, st: st.slice(), note: st.length ? `Metin bitti ama yığında <b>${st.length}</b> açık parantez kaldı → <b class="c-red">dengesiz ✘</b>` : 'Metin bitti, yığın boş → <b class="c-green">dengeli ✔</b>' });
      fp.load(frames);
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); plan(); fp.play(); } });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Metin ', input), btn('▶ Kontrol et', () => { plan(); fp.play(); }, 'primary'),
      select({ '': 'örnekler…', a: '{ [ ( ) ] ( ) }', b: '( [ ) ]', c: '( ( ( )', d: 'if (a[i] > 0) { f(x); }' }, '', v => { if (v) { input.value = { a: '{ [ ( ) ] ( ) }', b: '( [ ) ]', c: '( ( ( )', d: 'if (a[i] > 0) { f(x); }' }[v]; plan(); fp.play(); } })),
    view, SL.transport(fp, { min: 0.3, max: 8 }), note);
    plan();
    return { stop: () => fp.pause() };
  };

  /* ---------- 4) Dijkstra'nın iki yığınlı ifade değerlendirmesi ---------- */
  D.twostack = function (root) {
    const input = el('input', { type: 'text', class: 'keys-in', style: 'width:420px', value: root.dataset.expr || '( 1 + ( ( 2 + 3 ) * ( 4 * 5 ) ) )' });
    const view = el('div', { class: 'ts-view' });
    const note = el('div', { class: 'sv-note' });
    const draw = f => {
      view.innerHTML = `<div class="br-str">${f.toks.map((t, i) => `<span class="${i === f.i ? 'cur' : i < f.i ? 'done' : ''}">${t}</span>`).join(' ')}</div>` +
        `<div class="ts-stacks">${stackHTML(f.vals, '🔢 Değer yığını')}${stackHTML(f.ops, '➕ İşlem yığını')}</div>`;
      note.innerHTML = f.note;
    };
    const fp = new SL.FramePlayer(draw, { speed: 1.2 });
    const plan = () => {
      const toks = input.value.replace(/([()+\-*/])/g, ' $1 ').trim().split(/\s+/);
      const vals = [], ops = [], frames = [{ toks, i: -1, vals: [], ops: [], note: 'Kurallar: sayı → değer yığınına · işlem → işlem yığınına · “(” → yok say · “)” → bir işlem ve iki değer çek, sonucu değer yığınına it.' }];
      const F = (i, note) => frames.push({ toks, i, vals: vals.slice(), ops: ops.slice(), note });
      try {
        toks.forEach((t, i) => {
          if (t === '(') F(i, '“(” → yok say');
          else if ('+-*/'.includes(t)) { ops.push(t); F(i, `<b>${t}</b> → işlem yığınına push`); }
          else if (t === ')') {
            const op = ops.pop(), b = vals.pop(), a = vals.pop();
            if (op === undefined || a === undefined) throw new Error('İfade tam parantezli değil');
            const r = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b;
            vals.push(r); F(i, `“)” → pop <b>${op}</b>, pop <b>${b}</b> ve <b>${a}</b> → ${a} ${op} ${b} = <b>${r}</b> → değer yığınına push`);
          } else { const v = parseFloat(t); if (isNaN(v)) throw new Error('Tanınmayan simge: ' + t); vals.push(v); F(i, `<b>${t}</b> sayı → değer yığınına push`); }
        });
        F(toks.length, vals.length === 1 && !ops.length ? `Sonuç: <b class="c-green">${vals[0]}</b>` : '⚠️ İfade tam parantezli değil (her işlem parantez içinde olmalı)');
      } catch (e) { F(-1, '⚠️ ' + e.message); }
      fp.load(frames);
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); plan(); fp.play(); } });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'İfade ', input), btn('▶ Hesapla', () => { plan(); fp.play(); }, 'primary')),
      view, SL.transport(fp, { min: 0.3, max: 8 }), note);
    plan();
    return { stop: () => fp.pause() };
  };

  /* ---------- 5) Dairesel tampon (ring buffer) + kombo girdisi ---------- */
  D.ring = function (root) {
    const N = 8, combo = 'combo' in root.dataset;
    let buf = Array(N).fill(null), head = 0, count = 0, msg = '', serial = 0;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', '0 0 420 300'); svg.setAttribute('class', 'ring-svg');
    const side = el('div', { class: 'ring-side' });
    const COMBOS = [['🔥 Hadouken', ['↓', '↘', '→', '👊']], ['🐉 Shoryuken', ['→', '↓', '↘', '👊']], ['🌀 Tatsumaki', ['↓', '↙', '←', '🦶']]];
    const draw = () => {
      const t = T(), cx = 210, cy = 150, R = 105;
      const tail = (head + count) % N;
      let s = '';
      for (let i = 0; i < N; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / N, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
        const used = (i - head + N) % N < count;
        s += `<circle cx="${x}" cy="${y}" r="27" fill="${used ? (t.dark ? '#22324a' : '#e3ecfb') : t.card}" stroke="${i === head && count ? t.green : i === tail ? t.amber : t['ink-2']}" stroke-width="${i === head || i === tail ? 4 : 2}"/>`;
        s += `<text x="${x}" y="${y + 9}" text-anchor="middle" font-size="24">${buf[i] && used ? buf[i].v : ''}</text>`;
        s += `<text x="${cx + (R + 44) * Math.cos(a)}" y="${cy + (R + 44) * Math.sin(a) + 5}" text-anchor="middle" font-size="13" fill="${t.muted}" font-family="JetBrains Mono">${i}</text>`;
      }
      s += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="15" fill="${t.green}" font-weight="700" font-family="JetBrains Mono">head = ${head}</text>`;
      s += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="15" fill="${t.amber}" font-weight="700" font-family="JetBrains Mono">tail = ${tail}</text>`;
      svg.innerHTML = s;
      const seq = Array.from({ length: count }, (_, k) => buf[(head + k) % N].v);
      side.innerHTML = `<div class="mini">Tampondaki girdiler (en eski → en yeni):</div><div class="ll-chips">${seq.map(v => `<span class="ll-chip">${v}</span>`).join('') || '—'}</div>` +
        `<div class="sv-note">${msg}</div>` + (combo ? `<div class="mini">Kombolar:</div>${COMBOS.map(([n, c]) => `<div class="combo-row">${n}: ${c.join(' ')}</div>`).join('')}` : '') +
        `<div class="mini" style="margin-top:8px">Sonraki yazma yeri: <code>(head + count) % ${N}</code> = ${(head + count) % N}</div>`;
    };
    const put = v => {
      const tail = (head + count) % N;
      buf[tail] = { v, n: ++serial };
      if (count < N) { count++; msg = `${v} → kutu ${tail}`; }
      else { head = (head + 1) % N; msg = `Tampon doluydu: EN ESKİ girdinin üzerine yazıldı (kutu ${tail}), head bir ilerledi → ${head}`; }
      if (combo) {
        const seq = Array.from({ length: count }, (_, k) => buf[(head + k) % N].v);
        const hit = COMBOS.find(([, c]) => seq.slice(-c.length).join() === c.join());
        if (hit) msg = `<b class="big c-green">${hit[0]}!</b> Son ${hit[1].length} girdi kombo ile eşleşti.`;
      }
      draw();
    };
    const take = () => { if (!count) { msg = 'Tampon boş.'; draw(); return; } const v = buf[head].v; head = (head + 1) % N; count--; msg = `dequeue → ${v} çıktı, head = ${head}`; draw(); };
    root.setAttribute('data-prevent-swipe', '');
    const pad = el('div', { class: 'sv-controls' });
    if (combo) ['←', '↙', '↓', '↘', '→', '👊', '🦶'].forEach(k => pad.append(btn(k, () => put(k), 'pad')));
    else { let n = 1; pad.append(btn('➕ enqueue', () => put(String(n++)), 'primary'), btn('➖ dequeue', take)); }
    pad.append(btn('↺', () => { buf = Array(N).fill(null); head = 0; count = 0; msg = ''; draw(); }));
    root.append(pad, el('div', { class: 'ring-wrap' }, svg, side));
    SL.onTheme(draw); draw();
  };

  /* ---------- 6) Çağrı yığını: özyinelemeli faktöriyel ---------- */
  D.callstack = function (root) {
    const view = el('div', { class: 'cs-view' });
    const code = el('pre', { class: 'mini-code' });
    const note = el('div', { class: 'sv-note' });
    const lines = ['def fakt(n):', '    if n <= 1:', '        return 1', '    return n * fakt(n - 1)'];
    const draw = f => {
      code.innerHTML = lines.map((l, k) => `<div class="${f.line === k + 1 ? 'next' : ''}">${k + 1}  ${l}</div>`).join('');
      view.innerHTML = stackHTML(f.st, 'Çağrı yığını (call stack)', { hiTop: true });
      note.innerHTML = f.note;
    };
    const fp = new SL.FramePlayer(draw, { speed: 1.2 });
    let N = 4;
    const plan = () => {
      const st = [], frames = [{ st: ['main()'], line: 0, note: `main(): fakt(${N}) çağrılıyor` }];
      st.push('main()');
      const go = n => {
        st.push(`fakt(n=${n})`); frames.push({ st: st.slice(), line: 1, note: `fakt(${n}) çağrıldı → yığına yeni bir <b>kare</b> (n=${n}) eklendi` });
        if (n <= 1) { frames.push({ st: st.slice(), line: 3, note: `n = ${n} ≤ 1 → temel durum: 1 döndür` }); st.pop(); frames.push({ st: st.slice(), line: 4, note: `fakt(${n}) bitti → karesi yığından ÇIKTI, 1 değeri çağırana döndü` }); return 1; }
        frames.push({ st: st.slice(), line: 4, note: `${n} * fakt(${n - 1}) hesaplanacak → önce fakt(${n - 1}) bekleniyor` });
        const r = n * go(n - 1);
        frames.push({ st: st.slice(), line: 4, note: `fakt(${n - 1}) döndü → ${n} * … = <b>${r}</b>` });
        st.pop(); frames.push({ st: st.slice(), line: 4, note: `fakt(${n}) bitti → ${r} döndürüldü, karesi yığından çıktı` });
        return r;
      };
      const r = go(N);
      frames.push({ st: st.slice(), line: 0, note: `main(): sonuç <b>${r}</b>. En derin anda yığında ${N + 1} kare vardı.` });
      fp.load(frames);
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('n =', 1, 7, N, 1, v => { N = v; plan(); }), btn('▶ Oynat', () => fp.play(), 'primary')),
      el('div', { class: 'cs-wrap' }, code, view), SL.transport(fp, { min: 0.3, max: 6 }), note);
    plan();
    return { stop: () => fp.pause() };
  };

  /* ---------- 7) Canlı ölçüm: kuyruk gerçeklemeleri ---------- */
  D.qbench = function (root) {
    const tbl = el('table', { class: 'dbl-t' });
    let busy = false;
    const time = f => { const t0 = performance.now(); f(); return performance.now() - t0; };
    const run = async () => {
      if (busy) return; busy = true;
      tbl.innerHTML = '<tr><th>N</th><th>dizi + shift()</th><th>dizi + baş indeksi</th><th>dairesel tampon</th></tr>';
      for (const N of [10000, 40000, 160000]) {
        await new Promise(r => setTimeout(r, 30));
        // her test: N eleman ekle, sonra hepsini çıkar, araya karışık işlemler
        const t1 = time(() => { const q = []; for (let i = 0; i < N; i++) q.push(i); let s = 0; while (q.length) s += q.shift(); return s; });
        const t2 = time(() => { const q = []; let h = 0; for (let i = 0; i < N; i++) q.push(i); let s = 0; while (h < q.length) s += q[h++]; return s; });
        const t3 = time(() => { const cap = 1 << Math.ceil(Math.log2(N + 1)); const b = new Int32Array(cap); let h = 0, n = 0; for (let i = 0; i < N; i++) { b[(h + n) & (cap - 1)] = i; n++; } let s = 0; while (n) { s += b[h]; h = (h + 1) & (cap - 1); n--; } return s; });
        tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(N)}</td><td>${t1.toFixed(1)} ms</td><td>${t2.toFixed(1)} ms</td><td>${t3.toFixed(1)} ms</td></tr>`);
      }
      busy = false;
    };
    root.append(el('div', { class: 'sv-controls' }, btn('🧪 Ölçümü başlat', run, 'primary'), el('span', { class: 'mini' }, 'N eleman ekle, sonra hepsini baştan çıkar. JavaScript motorları shift()’i bazen optimize eder; yine de büyük N’de fark görülür.')), tbl);
    tbl.innerHTML = '<tr><td class="mini">“Ölçümü başlat”a basın.</td></tr>';
  };

  /* ---------- .fnlab — fonksiyon testli laboratuvar ---------- */
  const FN = {
    brackets: {
      fn: 'is_balanced', jsfn: 'isBalanced',
      cases: () => {
        const base = ['', '()', '([]){}', '(]', '((', '))', '{[()()]}', '{[(])}', 'a(b)c', 'if (x[0] > 1) { y(); }', ')(', '[[[]]]]'];
        for (let k = 0; k < 40; k++) { const n = 1 + rint(8); let s = ''; for (let i = 0; i < n; i++) s += '()[]{}'[rint(6)]; base.push(s); }
        return base;
      },
      exp: s => { const st = [], p = { ')': '(', ']': '[', '}': '{' }; for (const ch of s) { if ('([{'.includes(ch)) st.push(ch); else if (p[ch]) { if (st.pop() !== p[ch]) return false; } } return st.length === 0; }
    },
    postfix: {
      fn: 'eval_postfix', jsfn: 'evalPostfix',
      cases: () => ['3 4 +', '5 1 2 + 4 * + 3 -', '2 3 4 * +', '10 2 /', '7', '6 2 - 3 *', '1 2 3 4 5 + + + +'],
      exp: s => { const st = []; s.trim().split(/\s+/).forEach(t => { if ('+-*/'.includes(t) && t.length === 1) { const b = st.pop(), a = st.pop(); st.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : a / b); } else st.push(parseFloat(t)); }); return st.pop(); }
    }
  };
  const PY_FN = `
import json
def _run(fname, cases):
    f = globals()[fname]
    out = []
    for c in cases:
        try:
            out.append([f(c), None])
        except BaseException as e:
            out.append([None, type(e).__name__ + ": " + str(e)])
    return json.dumps(out)
`;
  SL.FnLab = function (root) {
    const task = FN[root.dataset.task || 'brackets'];
    const shell = SL.labShell(root);
    const name = shell.lang === 'python' ? task.fn : task.jsfn;
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const report = (cs, res) => {
      view.innerHTML = '<table class="dbl-t" style="font-size:15px"><tr><th>girdi</th><th>senin cevabın</th><th>beklenen</th></tr>' +
        cs.slice(0, 9).map((c, i) => { const [r, e] = res[i], ex = task.exp(c), ok = !e && r === ex; return `<tr><td><code>${c === '' ? '(boş)' : c}</code></td><td class="${ok ? 'yes' : 'no'}">${e ? '⚠️ ' + e : JSON.stringify(r)}</td><td>${JSON.stringify(ex)}</td></tr>`; }).join('') + '</table>';
      const bad = cs.findIndex((c, i) => res[i][1] || res[i][0] !== task.exp(c));
      if (bad >= 0) shell.setMsg('err', `❌ Test başarısız: girdi <code>${cs[bad] || '(boş)'}</code> → ${res[bad][1] ? 'hata: ' + res[bad][1] : 'senin cevabın ' + JSON.stringify(res[bad][0]) + ', beklenen ' + JSON.stringify(task.exp(cs[bad]))}`);
      else shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
    };
    shell.onRun = async () => {
      shell.clearOut();
      const cs = task.cases(), code = shell.cm.getValue();
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_FN); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_cases', py.toPy(cs));
        let res;
        try { res = JSON.parse(py.runPython(`_run(${JSON.stringify(name)}, _cases)`)); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        report(cs, res.map(([r, e]) => [r, e && SL.pyErrorText(e)]));
        return;
      }
      let fn;
      try { fn = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + `\n;if (typeof ${name} !== 'function') throw new Error("Kodda '${name}' fonksiyonu bulunamadı."); return ${name};`)(shell.print, SL.makeGuard(200000)); }
      catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      report(cs, cs.map(c => { try { return [fn(c), null]; } catch (e) { return [null, SL.jsErrorText(e)]; } }));
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.fnlab', SL.FnLab);
})();
