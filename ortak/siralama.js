/* =====================================================================
   siralama.js — Sıralama görselleştirmeleri (core.js'e ihtiyaç duyar)
   - Kaydedici (record): algoritmayı çalıştırır, her karşılaştırma /
     yer değiştirme / yazmayı bir "olay" olarak kaydeder.
   - Oynatıcı (Player): olayları canvas üzerinde adım adım oynatır.
   - Bileşenler: .sortviz, .race, .trace, .codelab (sıralama laboratuvarı)
   ===================================================================== */
(function () {
  'use strict';
  const { el, select } = SL;
  const transport = p => SL.transport(p, { min: 1, max: 10000 });
  function speedToStep(v) { return Math.round(Math.pow(10, v / 25)); } // 0..100 → 1..10000
  function stepToSpeed(s) { return Math.round(25 * Math.log10(s)); }
  const parseValues = SL.parseValues;

  SL.INPUTS = {
    random: 'Rastgele',
    sorted: 'Sıralı',
    reversed: 'Ters sıralı',
    nearly: 'Neredeyse sıralı',
    few: 'Az farklı değer'
  };
  SL.makeInput = function (kind, n) {
    let a = Array.from({ length: n }, (_, i) => i + 1);
    switch (kind) {
      case 'sorted': break;
      case 'reversed': a.reverse(); break;
      case 'nearly': {
        const k = Math.max(1, Math.round(n / 8));
        for (let t = 0; t < k; t++) {
          const i = Math.floor(Math.random() * (n - 1));
          [a[i], a[i + 1]] = [a[i + 1], a[i]];
        }
        break;
      }
      case 'few': {
        const step = Math.ceil(n / 4);
        a = a.map(() => step * (1 + Math.floor(Math.random() * 4)));
        break;
      }
      case 'lastsmall': a = a.slice(1).concat([1]); break;
      default: SL.shuffle(a);
    }
    return a;
  };

  /* ---------------- hazır algoritmalar ----------------
     API: less(a,i,j), exch(a,i,j), mark(ad, i), region(ad, lo, hi), setH(h), note(metin)
  */
  SL.ALGS = {
    selection(a, o) {
      const n = a.length;
      for (let i = 0; i < n; i++) {
        o.region('final', 0, i);
        let min = i;
        o.mark('i', i); o.mark('min', min);
        o.note(`i = ${i}: a[${i}…${n - 1}] içinde en küçüğü arıyorum`);
        for (let j = i + 1; j < n; j++) {
          o.mark('j', j);
          if (o.less(a, j, min)) { min = j; o.mark('min', min); }
        }
        o.mark('j', -1);
        o.note(`En küçük a[${min}] → a[${i}] ile yer değiştir`);
        o.exch(a, i, min);
      }
      o.region('final', 0, n); o.mark('i', -1); o.mark('min', -1);
      o.note('Bitti! Her eleman son yerinde.');
    },
    insertion(a, o) {
      const n = a.length;
      for (let i = 1; i < n; i++) {
        o.region('sorted', 0, i);
        o.mark('i', i);
        o.note(`i = ${i}: a[${i}] elemanını soldaki sıralı kısma ekle`);
        for (let j = i; j > 0; j--) {
          o.mark('j', j);
          if (!o.less(a, j, j - 1)) break;
          o.exch(a, j, j - 1);
        }
        o.mark('j', -1);
      }
      o.region('sorted', 0, 0); o.region('final', 0, n); o.mark('i', -1);
      o.note('Bitti!');
    },
    shell(a, o, opts = {}) {
      const n = a.length;
      const seq = SL.hSequence(opts.hseq || 'knuth', n);
      for (const h of seq) {
        o.setH(h);
        o.note(`h = ${h}: diziyi ${h}-sıralıyorum (aralarında ${h} adım olan elemanlar)`);
        for (let i = h; i < n; i++) {
          o.mark('i', i);
          for (let j = i; j >= h; j -= h) {
            o.mark('j', j);
            if (!o.less(a, j, j - h)) break;
            o.exch(a, j, j - h);
          }
        }
      }
      o.setH(0); o.mark('i', -1); o.mark('j', -1); o.region('final', 0, n);
      o.note('Bitti!');
    },
    bubble(a, o) {
      const n = a.length;
      for (let i = 0; i < n - 1; i++) {
        o.region('final', n - i, n);
        let swapped = false;
        for (let j = 0; j < n - 1 - i; j++) {
          o.mark('j', j);
          if (o.less(a, j + 1, j)) { o.exch(a, j, j + 1); swapped = true; }
        }
        if (!swapped) break;
      }
      o.mark('j', -1); o.region('final', 0, n);
      o.note('Bitti!');
    }
  };
  SL.ALG_NAMES = { selection: 'Selection', insertion: 'Insertion', shell: 'Shellsort', bubble: 'Bubble' };

  SL.hSequence = function (kind, n) {
    const seq = [];
    if (kind === 'one') return [1];
    if (kind === 'shell') { for (let h = Math.floor(n / 2); h >= 1; h = Math.floor(h / 2)) seq.push(h); return seq; }
    if (kind === 'pow2') { let h = 1; while (h * 2 < n) h *= 2; for (; h >= 1; h /= 2) seq.push(h); return seq; }
    let h = 1;
    while (h < Math.floor(n / 3)) h = 3 * h + 1;
    for (; h >= 1; h = Math.floor(h / 3)) seq.push(h);
    return seq;
  };

  /* ---------------- kaydedici ---------------- */
  class LimitError extends Error {}
  SL.LimitError = LimitError;
  const isIdx = p => typeof p === 'string' && /^\d+$/.test(p);

  SL.record = function (algFn, input, opts = {}) {
    const raw = input.slice();
    const ev = [];
    const st = { cmp: 0, exch: 0, writes: 0, reads: 0 };
    const limit = opts.limit || 400000;
    const push = e => { if (ev.length >= limit) throw new LimitError('limit'); ev.push(e); };
    const chk = (fn, i) => {
      if (!Number.isInteger(i) || i < 0 || i >= raw.length)
        throw new Error(`${fn}(): indeks ${i} dizinin dışında! (geçerli aralık 0…${raw.length - 1})`);
    };
    const api = {
      less(a, i, j) { chk('less', i); chk('less', j); st.cmp++; st.reads += 2; push({ t: 'c', i, j }); return raw[i] < raw[j]; },
      exch(a, i, j) { chk('exch', i); chk('exch', j); st.exch++; st.reads += 2; st.writes += 2; push({ t: 'x', i, j }); const t = raw[i]; raw[i] = raw[j]; raw[j] = t; },
      cmpv(vx, vy, i, j) { st.cmp++; push({ t: 'c', i, j }); return vx < vy; },   // değerleri karşılaştır (aux dizileri için)
      mark: (k, i) => push({ t: 'm', k, i }),
      region: (k, lo, hi) => push({ t: 'r', k, lo, hi }),
      setH: h => push({ t: 'h', h }),
      note: s => push({ t: 'n', s })
    };
    const proxy = new Proxy(raw, {
      get(t, p) { if (isIdx(p)) st.reads++; return t[p]; },
      set(t, p, v) {
        if (isIdx(p)) { if (+p >= t.length) throw new Error(`a[${p}] = …: dizinin dışına yazmaya çalıştın!`); st.writes++; push({ t: 'w', i: +p, v }); }
        t[p] = v; return true;
      }
    });
    let error = null;
    try { algFn(proxy, api, opts); } catch (e) { error = e; }
    return { input: input.slice(), events: ev, stats: st, output: raw, error };
  };

  SL.checkOrder = function (arr) {
    let asc = true, desc = true;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < arr[i - 1]) asc = false;
      if (arr[i] > arr[i - 1]) desc = false;
    }
    return asc ? 'asc' : desc ? 'desc' : 'none';
  };

  /* ---------------- oynatıcı (canvas) ---------------- */
  class Player {
    constructor(canvas, w, h, opts = {}) {
      this.canvas = canvas; this.W = w; this.H = h; this.opts = opts;
      this.ctx = SL.setupCanvas(canvas, w, h);
      this.speed = opts.speed || 20; // adım / saniye
      this.playing = false; this.listeners = [];
      this.cnt = { c: 0, x: 0, w: 0 }; this.active = 0; this.marks = {}; this.regions = {}; this.h = 0;
      SL.onTheme(() => this.draw());
    }
    load(rec) {
      this.rec = rec;
      const vals = [...new Set(rec.input)].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
      this.rank = new Map(vals.map((v, i) => [v, i + 1]));
      this.maxRank = vals.length;
      this.reset();
    }
    reset() {
      this.pause();
      this.arr = this.rec.input.slice(); this.pos = 0; this.active = 0;
      this.hl = null; this.marks = {}; this.regions = {}; this.h = 0; this.noteText = '';
      this.cnt = { c: 0, x: 0, w: 0 }; this.done = false;
      this.draw(); this.emit();
    }
    applyOne() {
      const ev = this.rec.events;
      while (this.pos < ev.length) {
        const e = ev[this.pos++];
        switch (e.t) {
          case 'c': this.hl = e; this.cnt.c++; this.active++; return true;
          case 'x': { const t = this.arr[e.i]; this.arr[e.i] = this.arr[e.j]; this.arr[e.j] = t; this.hl = e; this.cnt.x++; this.active++; return true; }
          case 'w': this.arr[e.i] = e.v; this.hl = e; this.cnt.w++; this.active++; return true;
          case 'm': this.marks[e.k] = e.i; break;
          case 'r': this.regions[e.k] = [e.lo, e.hi]; break;
          case 'h': this.h = e.h; break;
          case 'n': this.noteText = e.s; break;
        }
      }
      this.hl = null; this.done = true; return false;
    }
    step() { const r = this.applyOne(); this.draw(); this.emit(); return r; }
    back() {
      const target = Math.max(0, this.active - 1);
      const sp = this.speed; this.reset(); this.speed = sp;
      while (this.active < target && this.applyOne());
      this.draw(); this.emit();
    }
    toEnd() { this.pause(); while (this.applyOne()); this.draw(); this.emit(); }
    play() {
      if (this.done) this.reset();
      if (this.playing) return;
      this.playing = true; let last = performance.now(), acc = 0;
      const loop = now => {
        if (!this.playing) return;
        acc += ((now - last) / 1000) * this.speed; last = now;
        let k = Math.floor(acc); acc -= k;
        while (k-- > 0) if (!this.applyOne()) { this.playing = false; break; }
        this.draw(); this.emit();
        if (this.playing) this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
      this.emit();
    }
    pause() { this.playing = false; cancelAnimationFrame(this.raf); this.emit(); }
    toggle() { this.playing ? this.pause() : this.play(); }
    onChange(fn) { this.listeners.push(fn); }
    emit() { this.listeners.forEach(f => f(this)); }

    barColor(i, T) {
      const hl = this.hl;
      if (hl) {
        if (hl.t === 'x' && (i === hl.i || i === hl.j)) return T['bar-swap'];
        if (hl.t === 'w' && i === hl.i) return T['bar-swap'];
        if (hl.t === 'c' && (i === hl.i || i === hl.j)) return T['bar-cmp'];
      }
      if (this.marks.min === i) return T['bar-min'];
      const f = this.regions.final; if (f && i >= f[0] && i < f[1]) return T['bar-final'];
      const s = this.regions.sorted; if (s && i >= s[0] && i < s[1]) return T['bar-sorted'];
      return T.bar;
    }
    draw() {
      if (!this.rec) return;
      const ctx = this.ctx, W = this.W, H = this.H, T = SL.theme();
      const n = this.arr.length;
      ctx.clearRect(0, 0, W, H);
      const top = 22, bottom = this.opts.markers === false ? 6 : 30;
      const gap = n <= 40 ? 3 : n <= 100 ? 1 : 0;
      const bw = W / n;
      const labels = n <= 26;
      // h grupları için ince renk şeridi
      if (this.h > 1 && this.h <= 16 && n <= 100) {
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = `hsla(${(i % this.h) * (360 / this.h)},70%,55%,0.85)`;
          ctx.fillRect(i * bw + gap / 2, H - bottom + 2, bw - gap, 4);
        }
      }
      for (let i = 0; i < n; i++) {
        const v = this.arr[i];
        const bh = Math.max(3, (this.rank.get(v) / this.maxRank) * (H - top - bottom));
        const x = i * bw + gap / 2, y = H - bottom - bh;
        ctx.fillStyle = this.barColor(i, T);
        const r = Math.min(4, (bw - gap) / 2);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, Math.max(1, bw - gap), bh, [r, r, 0, 0]); else ctx.rect(x, y, bw - gap, bh);
        ctx.fill();
        if (labels) {
          ctx.fillStyle = T.ink;
          ctx.font = `600 ${n <= 16 ? 15 : 12}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(String(v), x + (bw - gap) / 2, y - 5);
        }
      }
      // işaretçiler (i, j, min)
      if (this.opts.markers !== false) {
        const mk = { i: T.blue, j: T['ink-2'], min: T.red };
        ctx.font = '700 13px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        const at = {};
        for (const k of ['i', 'min', 'j']) {
          const idx = this.marks[k];
          if (idx == null || idx < 0 || idx >= n) continue;
          (at[idx] = at[idx] || []).push(k);
        }
        for (const idx in at) {
          const ks = at[idx], cx = idx * bw + bw / 2, cy = H - bottom + 20;
          ctx.fillStyle = mk[ks[0]];
          ctx.fillText('▲', cx, cy - 9 > H - bottom + 6 ? cy - 9 : H - bottom + 9);
          ctx.fillStyle = ks.includes('min') ? T.red : mk[ks[0]];
          ctx.fillText(ks.join(','), cx, cy + 8);
        }
      }
      if (this.h > 0) {
        ctx.fillStyle = T.purple; ctx.font = '700 16px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
        ctx.fillText('h = ' + this.h, 6, 16);
      }
    }
  }
  SL.Player = Player;

  function counterRow(p, extra) {
    const row = el('div', { class: 'sv-counters' });
    const upd = () => {
      const tot = p.rec ? p.rec.events.filter(e => 'cxw'.includes(e.t)).length : 0;
      row.innerHTML =
        `<span class="cnt cmp"><b>${SL.fmt(p.cnt.c)}</b> karşılaştırma <i>compare</i></span>` +
        `<span class="cnt swp"><b>${SL.fmt(p.cnt.x)}</b> yer değiştirme <i>exchange</i></span>` +
        (p.cnt.w ? `<span class="cnt wr"><b>${SL.fmt(p.cnt.w)}</b> yazma <i>write</i></span>` : '') +
        `<span class="cnt prog">${SL.fmt(p.active)} / ${SL.fmt(tot)}</span>` + (extra ? extra(p) : '');
    };
    p.onChange(upd); upd();
    return row;
  }
  SL.counterRow = counterRow;

  /* ---------------- .sortviz bileşeni ---------------- */
  SL.SortViz = function (root) {
    const d = root.dataset;
    const state = {
      alg: d.alg || 'selection', n: +(d.n || 16), input: d.input || 'random',
      hseq: d.hseq || 'knuth', fixed: parseValues(d.values)
    };
    const w = +(d.w || 1180), h = +(d.h || 330);
    const canvas = el('canvas', { class: 'sv-canvas' });
    const p = new Player(canvas, w, h, { speed: +(d.speed || 8) });
    root.classList.add('sv');
    root.setAttribute('data-prevent-swipe', '');
    const note = el('div', { class: 'sv-note' });
    p.onChange(() => { note.textContent = p.noteText || ' '; });

    const build = () => {
      const input = state.fixed ? state.fixed.slice() : SL.makeInput(state.input, state.n);
      const rec = SL.record((a, o) => SL.ALGS[state.alg](a, o, { hseq: state.hseq, k: d.k != null ? +d.k : undefined }), input);
      p.load(rec);
    };
    const ctls = el('div', { class: 'sv-controls' });
    const want = (d.controls || 'alg,n,input').split(',');
    if (want.includes('alg')) ctls.append(el('label', { class: 'ctl' }, 'Algoritma ', select(SL.ALG_NAMES, state.alg, v => { state.alg = v; build(); })));
    if (!state.fixed && want.includes('n')) {
      const r = el('input', { type: 'range', min: 4, max: +(d.max || 120), value: state.n });
      const lab = el('b', null, state.n);
      r.addEventListener('input', () => { lab.textContent = r.value; });
      r.addEventListener('change', () => { state.n = +r.value; build(); });
      ctls.append(el('label', { class: 'ctl' }, 'N = ', lab, r));
    }
    if (!state.fixed && want.includes('input')) ctls.append(el('label', { class: 'ctl' }, 'Girdi ', select(SL.INPUTS, state.input, v => { state.input = v; build(); })));
    if (want.includes('hseq')) ctls.append(el('label', { class: 'ctl' }, 'h dizisi ', select({ knuth: '3x+1 (Knuth): …13, 4, 1', shell: 'N/2, N/4, … 1 (Shell)', pow2: '2ᵏ: …8, 4, 2, 1', one: 'sadece 1 (= insertion)' }, state.hseq, v => { state.hseq = v; build(); })));
    if (!state.fixed) ctls.append(el('button', { class: 'btn', onclick: build }, '🎲 Yeni dizi'));
    else ctls.append(el('button', { class: 'btn', onclick: () => { state.fixed = SL.shuffle(state.fixed.slice()); build(); } }, '🎲 Karıştır'));

    root.append(ctls, canvas, transport(p), counterRow(p));
    if (d.note !== 'off') root.append(note);
    build();
    return { player: p, stop: () => p.pause() };
  };

  /* ---------------- .race bileşeni ---------------- */
  SL.Race = function (root) {
    const d = root.dataset;
    const algs = (d.algs || 'selection,insertion,shell').split(',');
    const state = { n: +(d.n || 40), input: d.input || 'random' };
    root.classList.add('race'); root.setAttribute('data-prevent-swipe', '');
    const ctls = el('div', { class: 'sv-controls' });
    const grid = el('div', { class: 'race-grid' });
    const players = [];
    let finished = [];
    algs.forEach(a => {
      const c = el('canvas');
      const p = new Player(c, 390, 240, { speed: 60, markers: false });
      const medal = el('span', { class: 'medal' });
      const cell = el('div', { class: 'race-cell' }, el('div', { class: 'race-title' }, SL.ALG_NAMES[a], medal), c, counterRow(p));
      p.onChange(() => {
        if (p.done && !finished.includes(p)) { finished.push(p); medal.textContent = ['🥇', '🥈', '🥉', '4.'][finished.length - 1]; }
        if (!p.done && p.active === 0) medal.textContent = '';
      });
      players.push({ alg: a, p });
      grid.append(cell);
    });
    const build = () => {
      finished = [];
      const input = SL.makeInput(state.input, state.n);
      players.forEach(({ alg, p }) => p.load(SL.record((x, o) => SL.ALGS[alg](x, o), input)));
    };
    const r = el('input', { type: 'range', min: 8, max: 200, value: state.n });
    const lab = el('b', null, state.n);
    r.addEventListener('input', () => (lab.textContent = r.value));
    r.addEventListener('change', () => { state.n = +r.value; build(); });
    const sp = el('input', { type: 'range', min: 0, max: 100, value: stepToSpeed(60) });
    const spl = el('span', { class: 'mini' });
    const updSp = () => { const s = speedToStep(+sp.value); players.forEach(x => (x.p.speed = s)); spl.textContent = s + ' adım/sn'; };
    sp.addEventListener('input', updSp);
    const go = el('button', { class: 'btn primary' }, '🏁 Başlat');
    go.addEventListener('click', () => { const any = players.some(x => x.p.playing); players.forEach(x => (any ? x.p.pause() : x.p.play())); });
    ctls.append(el('label', { class: 'ctl' }, 'N = ', lab, r),
      el('label', { class: 'ctl' }, 'Girdi ', select(SL.INPUTS, state.input, v => { state.input = v; build(); })),
      el('label', { class: 'ctl' }, 'Hız ', sp, spl),
      el('button', { class: 'btn', onclick: build }, '🎲 Yeni dizi'), go);
    root.append(ctls, grid);
    updSp(); build();
    return { stop: () => players.forEach(x => x.p.pause()) };
  };

  /* ---------------- .trace (Princeton tarzı iz tablosu) ---------------- */
  SL.Trace = function (root) {
    const d = root.dataset;
    const a = parseValues(d.values || 'S O R T E X A M P L E');
    const n = a.length;
    const rows = [];
    const cellsOf = (arr, cls) => arr.map((v, k) => `<td class="${cls(k)}">${v}</td>`).join('');
    let head = '';
    if (d.alg === 'selection') {
      head = '<th>i</th><th>min</th>';
      rows.push(`<tr class="init"><td></td><td></td>${cellsOf(a, () => 'blk')}</tr>`);
      for (let i = 0; i < n; i++) {
        let min = i;
        for (let j = i + 1; j < n; j++) if (a[j] < a[min]) min = j;
        rows.push(`<tr class="fragment"><td>${i}</td><td>${min}</td>${cellsOf(a, k => (k < i ? 'gry' : k === min ? 'red' : 'blk'))}</tr>`);
        [a[i], a[min]] = [a[min], a[i]];
      }
    } else if (d.alg === 'insertion') {
      head = '<th>i</th><th>j</th>';
      rows.push(`<tr class="init"><td></td><td></td>${cellsOf(a, () => 'blk')}</tr>`);
      for (let i = 1; i < n; i++) {
        let j = i;
        while (j > 0 && a[j] < a[j - 1]) { [a[j], a[j - 1]] = [a[j - 1], a[j]]; j--; }
        rows.push(`<tr class="fragment"><td>${i}</td><td>${j}</td>${cellsOf(a, k => (k === j ? 'red' : k > j && k <= i ? 'blk' : 'gry'))}</tr>`);
      }
    } else if (d.alg === 'shell') {
      head = '<th>h</th>';
      rows.push(`<tr class="init"><td>girdi</td>${cellsOf(a, () => 'blk')}</tr>`);
      for (const h of SL.hSequence('knuth', n)) {
        const before = a.slice();
        for (let i = h; i < n; i++) for (let j = i; j >= h && a[j] < a[j - h]; j -= h) [a[j], a[j - h]] = [a[j - h], a[j]];
        rows.push(`<tr class="fragment"><td>${h}-sıralı</td>${cellsOf(a, k => (a[k] !== before[k] ? 'red' : 'blk'))}</tr>`);
      }
    }
    rows.push(`<tr class="fragment final"><td colspan="${d.alg === 'shell' ? 1 : 2}"></td>${cellsOf(a, () => 'blk')}</tr>`);
    const idx = Array.from({ length: n }, (_, k) => `<th>${k}</th>`).join('');
    root.innerHTML = `<table class="trace-t"><thead><tr>${head}<th colspan="${n}" class="arr-h">a[ ]</th></tr>` +
      `<tr class="idx">${d.alg === 'shell' ? '<th></th>' : '<th></th><th></th>'}${idx}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  };


  const PY_PRELUDE = `
_ev = []
_LIMIT = 300000
def _push(e):
    if len(_ev) >= _LIMIT:
        raise RuntimeError("Çok fazla adım (300.000+) — sonsuz döngü olabilir mi?")
    _ev.append(e)
class _Dizi(list):
    def __setitem__(self, i, v):
        if isinstance(i, int):
            if i < 0: i += len(self)
            _push(('w', i, v))
        list.__setitem__(self, i, v)
def _chk(fn, i, n):
    if not isinstance(i, int) or i < 0 or i >= n:
        raise IndexError(f"{fn}(): indeks {i} dizinin dışında! (geçerli aralık 0…{n-1})")
def less(a, i, j):
    _chk('less', i, len(a)); _chk('less', j, len(a))
    _push(('c', i, j))
    return list.__getitem__(a, i) < list.__getitem__(a, j)
def exch(a, i, j):
    _chk('exch', i, len(a)); _chk('exch', j, len(a))
    _push(('x', i, j))
    t = list.__getitem__(a, i)
    list.__setitem__(a, i, list.__getitem__(a, j))
    list.__setitem__(a, j, t)
a = _Dizi(_input)
`;


  /* ---------------- .codelab: canlı sıralama laboratuvarı ---------------- */
  SL.SortLab = function (root) {
    const d = root.dataset;
    const shell = SL.labShell(root);
    const lang = shell.lang;
    const state = { n: +(d.n || 12), input: d.input || 'random', fixed: parseValues(d.values) };
    const canvas = el('canvas');
    const p = new Player(canvas, +(d.cw || 540), +(d.ch || 250), { speed: +(d.speed || 10) });
    const ctls = el('div', { class: 'sv-controls' });
    if (!state.fixed) {
      ctls.append(el('label', { class: 'ctl' }, 'N ', select({ 6: '6', 8: '8', 12: '12', 20: '20', 40: '40', 80: '80' }, String(state.n), v => { state.n = +v; shell.run(); })));
      ctls.append(el('label', { class: 'ctl' }, 'Girdi ', select(SL.INPUTS, state.input, v => { state.input = v; shell.run(); })));
    }
    shell.right.append(ctls, canvas, transport(p), counterRow(p), shell.msg, shell.out);
    const report = rec => {
      p.load(rec);
      const s = rec.stats;
      if (rec.error) {
        const m = rec.error instanceof LimitError ? 'Çok fazla adım (400.000+) — sonsuz döngü olabilir mi?' : SL.jsErrorText(rec.error);
        shell.setMsg('err', '⚠️ Hata: ' + m);
        return;
      }
      const ord = SL.checkOrder(rec.output);
      shell.setMsg(ord === 'asc' ? 'ok' : 'err',
        (ord === 'asc' ? '✅ Dizi küçükten büyüğe sıralandı.' : ord === 'desc' ? '🙃 Dizi <b>büyükten küçüğe</b> sıralandı!' : '❌ Dizi sıralı DEĞİL: ' + rec.output.join(' ')) +
        (s && s.reads != null ? ` <span class="mini">(dizi erişimi: ${SL.fmt(s.reads + s.writes)})</span>` : ''));
    };
    const newInput = () => (state.fixed ? state.fixed.slice() : SL.makeInput(state.input, state.n));
    shell.onRun = async () => {
      p.pause(); shell.clearOut();
      const input = newInput();
      const code = shell.cm.getValue();
      if (lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        py.globals.set('_input', py.toPy(input));
        let error = null;
        try { py.runPython(PY_PRELUDE); py.runPython(code); py.runPython('sort(a)'); }
        catch (e) { error = new Error(SL.pyErrorText(e.message)); }
        const evs = py.globals.get('_ev').toJs().map(e => (e[0] === 'w' ? { t: 'w', i: e[1], v: e[2] } : { t: e[0], i: e[1], j: e[2] }));
        const output = py.globals.get('a').toJs();
        report({ input, events: evs, output, error, stats: {} });
        return;
      }
      let fn;
      try {
        fn = new Function('less', 'exch', 'print', '__g', '"use strict";\n' + SL.guardLoops(code) +
          "\n;if (typeof sort !== 'function') throw new Error(\"Kodda 'sort(a)' adında bir fonksiyon bulunamadı.\"); return sort;");
      } catch (e) {
        shell.setMsg('err', '⚠️ Sözdizimi hatası (syntax error): ' + e.message); p.load({ input, events: [] }); return;
      }
      const guard = SL.makeGuard();
      report(SL.record((a, o) => fn(o.less, o.exch, shell.print, guard)(a), input));
    };
    if (lang !== 'python') shell.run();
    else { p.load({ input: newInput(), events: [] }); shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).'); }
    return { stop: () => p.pause(), refresh: shell.refresh };
  };

  SL.register('.sortviz', SL.SortViz);
  SL.register('.race', SL.Race);
  SL.register('.trace', SL.Trace);
  SL.register('.codelab:not(.treelab):not(.searchlab):not(.lllab):not(.fnlab):not(.uflab):not(.growthlab):not(.mergelab):not(.quicklab):not(.rotlab):not(.geolab):not(.heaplab)', SL.SortLab);
})();
