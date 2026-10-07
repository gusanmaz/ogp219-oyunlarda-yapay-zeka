/* =====================================================================
   oncelik.js — Öncelik kuyrukları ve ikili yığın (core.js + agac.js gerekir;
   heapsort çubukları için siralama.js)
   Demolar: heapviz (ikili yığın: ekle/çıkar/yığın kur + heapsort),
            topk (akıştan en iyi k), timers (olay zamanlayıcısı), pqbench
   Bileşen: .heaplab (swim / sink yaz)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, btn } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);

  /* ---------- heapsort (SortViz / Race için) ---------- */
  if (SL.ALGS) {
    SL.ALGS.heap = function (a, o) {
      let n = a.length;
      const sink = (k, n) => {
        while (2 * k <= n) {
          let j = 2 * k;
          o.mark('j', j - 1);
          if (j < n && o.less(a, j - 1, j)) { j++; o.mark('j', j - 1); }
          if (!o.less(a, k - 1, j - 1)) break;
          o.exch(a, k - 1, j - 1); k = j; o.mark('i', k - 1);
        }
      };
      o.note('1) Yığın kurma: sağdan sola her alt ağacı batır (sink)');
      for (let k = n >> 1; k >= 1; k--) { o.mark('i', k - 1); sink(k, n); }
      o.note('2) Sıralama: en büyüğü (a[0]) sona at, kökü batır, tekrarla');
      while (n > 1) { o.mark('i', 0); o.exch(a, 0, n - 1); n--; o.region('final', n, a.length); sink(1, n); }
      o.mark('i', -1); o.mark('j', -1); o.region('final', 0, a.length); o.note('Bitti!');
    };
    if (SL.ALG_NAMES) SL.ALG_NAMES.heap = 'Heapsort';
  }

  /* ---------- yığın modeli: kareler üretir ---------- */
  class HeapModel {
    constructor(min) { this.min = !!min; this.a = [null]; this.n = 0; this.nid = 0; this.F = null; this.extra = {}; this.out = []; }
    get word() { return this.min ? 'küçük' : 'büyük'; }
    get bestOf() { return this.min ? 'küçüğü' : 'büyüğü'; }
    better(i, j) { const x = this.a[i].key, y = this.a[j].key; return this.min ? x < y : x > y; }
    item(key) { return { id: ++this.nid, key }; }
    snap(i = 1) { return i <= this.n ? { id: this.a[i].id, key: this.a[i].key, l: this.snap(2 * i), r: this.snap(2 * i + 1) } : null; }
    P(note, hl = {}) { if (this.F) this.F.push(Object.assign({ tree: this.snap(), a: this.a.slice(), n: this.n, hl: Object.assign({}, hl), note, out: this.out.slice() }, this.extra)); }
    id(i) { return this.a[i].id; }
    exch(i, j) { const t = this.a[i]; this.a[i] = this.a[j]; this.a[j] = t; }
    swim(k) {
      while (k > 1) {
        const p = k >> 1;
        if (!this.better(k, p)) { this.P(`${this.a[k].key}, ebeveyninden (${this.a[p].key}) daha ${this.word} değil → yerinde ✔`, { [this.id(k)]: 'found', [this.id(p)]: 'cur' }); return; }
        this.P(`${this.a[k].key} (a[${k}]) ebeveyninden (${this.a[p].key}, a[${p}]) daha ${this.word} → takas, YUKARI yüzer`, { [this.id(k)]: 'new', [this.id(p)]: 'del' });
        this.exch(k, p); k = p;
      }
      this.P(`${this.a[1].key} köke ulaştı ✔`, { [this.id(1)]: 'found' });
    }
    sink(k, n = this.n, silentEnd) {
      while (2 * k <= n) {
        let j = 2 * k;
        if (j < n && this.better(j + 1, j)) j++;
        const kids = { [this.id(2 * k)]: 'cand' }; if (2 * k + 1 <= n) kids[this.id(2 * k + 1)] = 'cand';
        if (!this.better(j, k)) { this.P(`${this.a[k].key} (a[${k}]), çocuklarının ${this.bestOf} olan ${this.a[j].key} ile karşılaştırıldı: çocuk daha ${this.word} değil → yerinde ✔`, Object.assign(kids, { [this.id(k)]: 'found' })); return; }
        this.P(`${this.a[k].key} (a[${k}]): çocuklarının ${this.bestOf} olan ${this.a[j].key} (a[${j}]) daha ${this.word} → takas, AŞAĞI batar`, Object.assign(kids, { [this.id(k)]: 'del', [this.id(j)]: 'new' }));
        this.exch(k, j); k = j;
      }
      if (!silentEnd) this.P(`${this.a[k].key} yaprağa ulaştı ✔`, { [this.id(k)]: 'found' });
    }
    insert(key) {
      this.a[++this.n] = this.item(key);
      this.a.length = this.n + 1;
      this.P(`insert(${key}): yığının SONUNA (a[${this.n}]) ekle — ağaçta en alt satırın ilk boş yeri`, { [this.id(this.n)]: 'new' });
      this.swim(this.n);
    }
    delTop() {
      if (!this.n) { this.P('Yığın boş!'); return null; }
      const top = this.a[1];
      this.P(`del${this.min ? 'Min' : 'Max'}(): en ${this.word} her zaman KÖKTE: ${top.key}`, { [top.id]: 'cur' });
      this.exch(1, this.n);
      this.P(`Kökü SON eleman (${this.a[1].key}) ile takas et`, { [top.id]: 'del', [this.id(1)]: 'new' });
      this.n--; this.a.length = this.n + 1; this.out.push(top.key);
      this.P(`${top.key} çıkarıldı. Yeni kök ${this.n ? this.a[1].key : '—'} yanlış yerde olabilir → batır (sink)`, this.n ? { [this.id(1)]: 'del' } : {});
      if (this.n) this.sink(1);
      return top.key;
    }
    heapify(keys) {
      this.a = [null, ...keys.map(k => this.item(k))]; this.n = keys.length;
      this.P(`Yığın kurma: ${keys.join(' ')} dizisi. Sağdan sola, yaprak olmayan her düğümü (a[${this.n >> 1}]…a[1]) batır.`);
      for (let k = this.n >> 1; k >= 1; k--) { this.P(`sink(${k}): ${this.a[k].key} alt ağacını yığın yap`, { [this.id(k)]: 'cur' }); this.sink(k, this.n, true); }
      this.P(`Yığın hazır! En ${this.word} (${this.a[1].key}) kökte. Toplam ≤ 2N karşılaştırma.`, { [this.id(1)]: 'found' });
    }
    sortdown() {
      const N = this.n;
      while (this.n > 1) {
        this.P(`Kök (${this.a[1].key}) = kalanların en ${this.bestOf} → a[${this.n}] ile takas: son yerine gider`, { [this.id(1)]: 'cur', [this.id(this.n)]: 'cand' });
        this.exch(1, this.n); this.n--;
        this.P(`a[${this.n + 1}] = ${this.a[this.n + 1].key} son yerinde (yeşil). Yığın ${this.n} elemana küçüldü → kökü batır`, { [this.id(1)]: 'del' });
        this.sink(1, this.n, true);
      }
      this.n = 0;
      this.P(`Sıralandı: ${this.a.slice(1, N + 1).map(x => x.key).join(' ')} — ek dizi kullanmadan!`);
    }
  }
  SL.HeapModel = HeapModel;

  const arrRow = (f, hl) => {
    const cells = [];
    for (let i = 1; i < f.a.length; i++) {
      const it = f.a[i], s = hl[it.id], sorted = i > f.n;
      cells.push(`<div class="hp-cell ${sorted ? 'sorted' : s || ''}"><i>${i}</i><b>${it.key}</b></div>`);
    }
    return `<div class="hp-arr"><div class="hp-cell zero"><i>0</i><b>–</b></div>${cells.join('')}</div>`;
  };

  D.heapviz = function (root) {
    const d = root.dataset, min = d.min != null, ops = (d.ops != null ? d.ops : 'insert,del,book').split(',');
    const canvas = el('canvas');
    const tv = new SL.TreeView(canvas, 1180, +(d.h || 250), { maxSp: 66, maxR: 19 });
    const arr = el('div'), note = el('div', { class: 'sv-note tree-note' }), outEl = el('div', { class: 'mini' });
    let m = new HeapModel(min);
    const fp = new SL.FramePlayer(f => {
      tv.show({ root: f.tree, hl: f.hl });
      arr.innerHTML = arrRow(f, f.hl);
      note.textContent = f.note;
      outEl.innerHTML = f.out && f.out.length ? `Çıkarılanlar: <b>${f.out.join(' ')}</b>` : '';
    }, { speed: 1.5 });
    const run = fn => { m.F = []; fn(); const F = m.F; m.F = null; fp.load(F); fp.play(); };
    const val = () => { const k = input.value.trim().toUpperCase(); return /^\d+$/.test(k) ? +k : k; };
    const input = el('input', { type: 'text', class: 'key-in', size: 4, value: d.default || 'S' });
    const ctl = el('div', { class: 'sv-controls' });
    if (ops.includes('insert')) ctl.append(el('label', { class: 'ctl' }, 'Anahtar ', input), btn('➕ insert', () => { const k = val(); if (k !== '') run(() => m.insert(k)); }, 'primary'));
    if (ops.includes('del')) ctl.append(btn(min ? '⬇ delMin' : '⬆ delMax', () => run(() => m.delTop())));
    if (ops.includes('book')) ctl.append(btn('▶ P Q E * X A M * P L E *', () => { m = new HeapModel(min); run(() => { m.P('Boş yığın. * = delMax'); 'P Q E * X A M * P L E *'.split(' ').forEach(k => (k === '*' ? m.delTop() : m.insert(k))); }); }));
    if (ops.includes('heapify')) ctl.append(btn('🏗 Yığın kur: S O R T E X A M P L E', () => { m = new HeapModel(min); run(() => m.heapify('S O R T E X A M P L E'.split(' '))); }, 'primary'));
    if (ops.includes('sort')) ctl.append(btn('🔢 Heapsort (kur + sırala)', () => { m = new HeapModel(min); run(() => { m.heapify('S O R T E X A M P L E'.split(' ')); m.sortdown(); }); }));
    if (ops.includes('random')) ctl.append(btn('🎲 15 rastgele', () => { m = new HeapModel(min); run(() => { m.P('Boş yığın'); for (let i = 0; i < 15; i++) m.insert(10 + rint(90)); }); }));
    ctl.append(btn('🧹', () => { m = new HeapModel(min); m.F = []; m.P('Boş yığın'); const F = m.F; m.F = null; fp.load(F); }));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const k = val(); if (k !== '') run(() => m.insert(k)); } });
    root.setAttribute('data-prevent-swipe', '');
    root.append(ctl, canvas, arr, SL.transport(fp, { min: 0.3, max: 10 }), note, outEl);
    // başlangıç
    const init = d.init ? d.init.split(' ') : 'T S R P N O A E I H G'.split(' ');
    m.a = [null, ...init.map(k => m.item(/^\d+$/.test(k) ? +k : k))]; m.n = init.length;
    if (d.empty != null) { m = new HeapModel(min); }
    m.F = []; m.P(d.note ? d.note : d.empty != null ? 'Boş yığın' : 'Kitaptaki yığın: her düğüm çocuklarından ' + (min ? 'küçük' : 'büyük') + ' ya da eşit. Altta aynı yığının DİZİ hâli.'); const F0 = m.F; m.F = null; fp.load(F0);
    return { stop: () => fp.pause() };
  };

  /* ---------- akıştan en iyi k ---------- */
  D.topk = function (root) {
    const d = root.dataset, K = +(d.k || 5), N = +(d.n || 24);
    const canvas = el('canvas');
    const tv = new SL.TreeView(canvas, 560, 210, { maxSp: 60, maxR: 20 });
    const arr = el('div'), stream = el('div', { class: 'hp-stream' }), note = el('div', { class: 'sv-note tree-note' }), stat = el('div', { class: 'sv-counters' });
    let scores = [];
    const fp = new SL.FramePlayer(f => {
      tv.show({ root: f.tree, hl: f.hl });
      arr.innerHTML = arrRow(f, f.hl);
      stream.innerHTML = scores.map((s, i) => `<span class="ll-chip ${i === f.si ? 'cur' : i < f.si ? 'past' : ''}">${s}</span>`).join('');
      note.textContent = f.note;
      stat.innerHTML = `<span class="cnt">okunan skor <b>${Math.min(N, Math.max(0, f.si + 1))}</b></span><span class="cnt">bellekte tutulan <b>${f.n}</b> (k = ${K})</span>`;
    }, { speed: 2 });
    const build = () => {
      scores = Array.from({ length: N }, () => 100 + rint(900));
      const m = new HeapModel(true); m.F = [];
      m.extra = { si: -1 }; m.P(`Skorlar tek tek geliyor (akış). Hepsini saklamadan en yüksek ${K} skoru bulacağız: ${K} elemanlı bir MIN-yığın tut.`);
      scores.forEach((s, i) => {
        m.extra = { si: i };
        if (m.n < K) { m.P(`${s} geldi. Yığında ${m.n} < ${K} eleman var → ekle`); m.insert(s); }
        else if (s > m.a[1].key) { m.P(`${s} geldi. Yığının en küçüğü (kök) ${m.a[1].key} → ${s} daha iyi! Kökü çıkar, ${s} değerini ekle`, { [m.id(1)]: 'del' }); m.delTop(); m.insert(s); }
        else m.P(`${s} geldi. Kökteki değerden (${m.a[1].key}) büyük değil → en iyi ${K} listesine giremez, at 🗑️`, { [m.id(1)]: 'cur' });
      });
      m.extra = { si: N };
      const top = m.a.slice(1, m.n + 1).map(x => x.key).sort((a, b) => b - a);
      m.P(`Bitti! En yüksek ${K} skor: ${top.join(', ')}. ${N} skor okundu ama bellekte hiçbir zaman ${K} taneden fazla skor olmadı.`);
      fp.load(m.F); fp.play();
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('🎲 Yeni skor akışı', build, 'primary')), stream, el('div', { class: 'geo-row' }, canvas, el('div', { style: 'flex:1;min-width:0' }, arr, stat)), SL.transport(fp, { min: 0.3, max: 10 }), note);
    build(); fp.pause(); fp.reset();
    return { stop: () => fp.pause() };
  };

  /* ---------- olay zamanlayıcısı ---------- */
  D.timers = function (root) {
    const W = 1180, H = 96, SPAN = 20;
    const tl = el('canvas'), tctx = SL.setupCanvas(tl, W, H);
    const canvas = el('canvas');
    const tv = new SL.TreeView(canvas, 640, 220, { maxSp: 62, maxR: 21 });
    const log = el('div', { class: 'tm-log' }), note = el('div', { class: 'sv-note tree-note' });
    const KINDS = [['👾', 'düşman doğar'], ['💣', 'bomba patlar'], ['🛡️', 'kalkan biter'], ['🔥', 'yanma hasarı'], ['🎵', 'müzik değişir'], ['🪙', 'altın düşer'], ['⚡', 'yetenek hazır']];
    let m, clock = 0, info = {}, fired = [];
    const fp = new SL.FramePlayer(f => draw(f), { speed: 2 });
    const draw = f => {
      const t = T(); tctx.clearRect(0, 0, W, H);
      const X = v => 20 + (v / SPAN) * (W - 40);
      tctx.strokeStyle = t.rule; tctx.beginPath(); tctx.moveTo(20, H - 22); tctx.lineTo(W - 20, H - 22); tctx.stroke();
      tctx.fillStyle = t.muted; tctx.font = '600 11px "JetBrains Mono"'; tctx.textAlign = 'center';
      for (let s = 0; s <= SPAN; s += 2) tctx.fillText(s + ' sn', X(s), H - 6);
      const pend = new Set(f.a.slice(1, f.n + 1).map(x => x.id));
      Object.values(info).forEach(ev => {
        const on = pend.has(ev.id);
        tctx.globalAlpha = on ? 1 : 0.25; tctx.font = '22px sans-serif'; tctx.fillText(ev.icon, X(ev.time), H - 34 - (ev.id % 2) * 24); tctx.globalAlpha = 1;
      });
      tctx.strokeStyle = t.red; tctx.lineWidth = 2.5; tctx.beginPath(); tctx.moveTo(X(f.clock), 4); tctx.lineTo(X(f.clock), H - 18); tctx.stroke();
      tctx.fillStyle = t.red; tctx.font = '700 12px "JetBrains Mono"'; tctx.fillText('şimdi ' + f.clock.toFixed(1), X(f.clock), 12);
      tv.show({ root: f.tree, hl: f.hl });
      log.innerHTML = '<div class="mini"><b>Gerçekleşen olaylar</b></div>' + (f.fired.length ? f.fired.slice(-7).reverse().map(e => `<div>${e}</div>`).join('') : '<div class="mini">(henüz yok)</div>');
      note.textContent = f.note;
    };
    const fresh = () => {
      m = new HeapModel(true); clock = 0; info = {}; fired = [];
      m.F = []; m.extra = { clock: 0, fired: [] };
      for (let i = 0; i < 8; i++) add(true);
      m.P('8 zamanlanmış olay MIN-yığında (anahtar = olayın zamanı). Kökte her zaman EN YAKIN olay var.');
      const F = m.F.slice(-1); m.F = null; fp.load(F);
    };
    const add = silent => {
      const time = Math.round((clock + 0.5 + Math.random() * (SPAN - clock - 1)) * 10) / 10;
      if (time > SPAN) return;
      const [icon, txt] = KINDS[rint(KINDS.length)];
      const F = m.F; if (silent) m.F = null;
      m.a[++m.n] = m.item(time); m.a.length = m.n + 1; info[m.nid] = { id: m.nid, time, icon, txt };
      if (!silent) m.P(`Yeni olay: ${icon} ${txt}, t = ${time} → yığına ekle`, { [m.id(m.n)]: 'new' });
      m.swim(m.n);
      if (silent) m.F = F;
    };
    const next = () => {
      if (!m.n) return;
      m.F = []; m.extra = { clock, fired: fired.slice() };
      const ev = info[m.a[1].id];
      clock = ev.time; m.extra = { clock, fired: fired.slice() };
      m.P(`Saat ilerledi, şimdi ${clock.toFixed(1)} sn: kökteki olayın zamanı geldi → ${ev.icon} ${ev.txt}!`, { [ev.id]: 'cur' });
      fired.push(`${clock.toFixed(1)} sn · ${ev.icon} ${ev.txt}`);
      m.extra = { clock, fired: fired.slice() };
      m.delTop();
      fp.load(m.F); m.F = null; fp.play();
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      btn('⏭ Sıradaki olay', next, 'primary'),
      btn('➕ Rastgele olay ekle', () => { m.F = []; m.extra = { clock, fired: fired.slice() }; add(false); fp.load(m.F); m.F = null; fp.play(); }),
      btn('↺ Baştan', fresh)), tl, el('div', { class: 'geo-row' }, canvas, log), SL.transport(fp, { min: 0.3, max: 10 }), note);
    fresh();
    SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  /* ---------- ölçüm: sırasız dizi / sıralı dizi / yığın ---------- */
  D.pqbench = function (root) {
    const tbl = el('table', { class: 'dbl-t' });
    let busy = false;
    const unordered = keys => { const a = []; let s = 0; for (const k of keys) a.push(k); while (a.length) { let m = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[m]) m = i; s += a[m]; a[m] = a[a.length - 1]; a.pop(); } return s; };
    const ordered = keys => { const a = []; let s = 0; for (const k of keys) { let i = a.length; a.push(k); while (i > 0 && a[i - 1] > k) { a[i] = a[i - 1]; i--; } a[i] = k; } while (a.length) s += a.pop(); return s; };
    const heap = keys => {
      const a = new Float64Array(keys.length + 1); let n = 0, s = 0;
      for (const k of keys) { a[++n] = k; let i = n; while (i > 1 && a[i >> 1] < a[i]) { const t = a[i]; a[i] = a[i >> 1]; a[i >> 1] = t; i >>= 1; } }
      while (n) { s += a[1]; a[1] = a[n--]; let k = 1; while (2 * k <= n) { let j = 2 * k; if (j < n && a[j] < a[j + 1]) j++; if (a[k] >= a[j]) break; const t = a[k]; a[k] = a[j]; a[j] = t; k = j; } }
      return s;
    };
    const time = (fn, keys) => { const t0 = performance.now(); fn(keys); return performance.now() - t0; };
    const run = async () => {
      if (busy) return; busy = true;
      tbl.innerHTML = '<tr><th>N (ekle + çıkar)</th><th>sırasız dizi</th><th>sıralı dizi</th><th>ikili yığın</th></tr>';
      heap(Array.from({ length: 5000 }, Math.random)); unordered(Array.from({ length: 2000 }, Math.random)); ordered(Array.from({ length: 2000 }, Math.random));
      for (const N of [1000, 10000, 40000, 1000000]) {
        await new Promise(r => setTimeout(r, 40));
        const keys = Array.from({ length: N }, Math.random);
        const big = N > 100000;
        const tu = big ? null : time(unordered, keys), to = big ? null : time(ordered, keys), th = time(heap, keys);
        const c = v => (v == null ? '<span class="mini">(çok uzun — denemiyoruz)</span>' : v.toFixed(1) + ' ms');
        tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(N)}</td><td class="c-red">${c(tu)}</td><td class="c-red">${c(to)}</td><td class="c-green"><b>${c(th)}</b></td></tr>`);
      }
      busy = false;
    };
    root.append(el('div', { class: 'sv-controls' }, btn('🧪 Ölçümü başlat', run, 'primary'), el('span', { class: 'mini' }, 'N rastgele anahtar ekle, sonra hepsini delMax ile çıkar.')), tbl);
    tbl.innerHTML = '<tr><td class="mini">“Ölçümü başlat”a basın.</td></tr>';
  };

  /* ---------- .heaplab ---------- */
  const PY_H = `
import json, sys
def _guard(limit=3000000):
    cnt = [0]
    def tr(frame, event, arg):
        cnt[0] += 1
        if cnt[0] > limit:
            raise RuntimeError("çok fazla adım — sonsuz döngü olabilir (k güncelleniyor mu?)")
        return tr
    sys.settrace(tr)
def _isheap(a, n):
    return all(a[k // 2] >= a[k] for k in range(2, n + 1))
def _run(cases):
    res = []
    for c in cases:
        a = [None] + list(c); n = len(c)
        try:
            _guard()
            for k in range(n // 2, 0, -1):
                sink(a, k, n)
            sys.settrace(None)
            if not _isheap(a, n):
                res.append([False, "yığın kurulduktan sonra yığın düzeni bozuk", a[1:]]); continue
            _guard()
            m = n
            while m > 1:
                a[1], a[m] = a[m], a[1]
                m -= 1
                sink(a, 1, m)
            sys.settrace(None)
            res.append([a[1:] == sorted(c), None, a[1:]])
        except BaseException as e:
            sys.settrace(None)
            res.append([False, type(e).__name__ + ": " + str(e), None])
    return json.dumps(res)
`;
  SL.HeapLab = function (root) {
    const task = root.dataset.task || 'swim';
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const cases = () => { const cs = [[1], [2, 1], [1, 2], [3, 3, 3], [1, 2, 3, 4, 5, 6, 7], [7, 6, 5, 4, 3, 2, 1]]; for (let t = 0; t < 40; t++) cs.push(Array.from({ length: 1 + rint(25) }, () => rint(50))); return cs; };
    const chips = xs => (xs || []).map(x => `<span class="ll-chip">${x}</span>`).join('') || '(boş)';
    const report = (cs, res) => {
      const bad = res.findIndex(r => !r[0]);
      const k = bad >= 0 ? bad : cs.length - 1;
      view.innerHTML = `<div class="mini">${bad >= 0 ? 'Başarısız test' : 'Örnek test'} girdisi:</div><div class="ll-chips">${chips(cs[k])}</div><div class="mini">${task === 'swim' ? 'Senin swim’inle yığına ekleyip sırayla delMax:' : 'Senin sink’inle heapsort sonucu:'}</div><div class="ll-chips">${res[k][1] ? '<span class="c-red">⚠️ ' + res[k][1] + '</span>' : chips(res[k][2])}</div>`;
      if (bad >= 0) shell.setMsg('err', `❌ ${bad + 1}. test başarısız.`);
      else shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
    };
    const fname = task === 'swim' ? 'swim' : 'sink';
    shell.onRun = async () => {
      shell.clearOut();
      const cs = cases(), code = shell.cm.getValue();
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_H); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_cases', py.toPy(cs));
        let res; try { res = JSON.parse(py.runPython('_run(_cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        report(cs, res.map(([ok, e, a]) => [ok, e && SL.pyErrorText(e), a]));
        return;
      }
      let fn;
      try { fn = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + `\n;if (typeof ${fname} !== 'function') throw new Error("Kodda '${fname}' fonksiyonu bulunamadı."); return ${fname};`)(shell.print, SL.makeGuard(200000)); }
      catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      const sinkOK = (a, k, n) => { while (2 * k <= n) { let j = 2 * k; if (j < n && a[j] < a[j + 1]) j++; if (a[k] >= a[j]) break; [a[k], a[j]] = [a[j], a[k]]; k = j; } };
      const isHeap = (a, n) => { for (let k = 2; k <= n; k++) if (a[k >> 1] < a[k]) return false; return true; };
      report(cs, cs.map(c => {
        try {
          const a = [null];
          if (task === 'swim') {
            for (const x of c) { a.push(x); fn(a, a.length - 1); if (a.length - 1 !== a.filter(v => v !== null).length) throw new Error('dizinin boyu değişti'); }
            if (!isHeap(a, a.length - 1)) return [false, 'eklemelerden sonra yığın düzeni bozuk (bir ebeveyn çocuğundan küçük)', a.slice(1)];
            const out = []; let n = a.length - 1;
            while (n) { out.push(a[1]); a[1] = a[n]; a.pop(); n--; sinkOK(a, 1, n); }
            const want = c.slice().sort((x, y) => y - x);
            return [JSON.stringify(out) === JSON.stringify(want), null, out];
          }
          a.push(...c); const n = c.length;
          for (let k = n >> 1; k >= 1; k--) fn(a, k, n);
          if (!isHeap(a, n)) return [false, 'yığın kurulduktan sonra yığın düzeni bozuk', a.slice(1)];
          for (let m = n; m > 1;) { [a[1], a[m]] = [a[m], a[1]]; m--; fn(a, 1, m); }
          return [JSON.stringify(a.slice(1)) === JSON.stringify(c.slice().sort((x, y) => x - y)), null, a.slice(1)];
        } catch (e) { return [false, SL.jsErrorText(e), null]; }
      }));
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.heaplab', SL.HeapLab);
})();
