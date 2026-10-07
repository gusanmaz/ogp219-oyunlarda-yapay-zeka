/* =====================================================================
   quicksort.js — Quicksort görselleştirmeleri (core.js + siralama.js gerekir)
   - SL.ALGS'e: quick, quicknosh, quick3, partition1, select
   Demolar: parttrace, qtrace, alive, lowfps, qexp
   Bileşen: .quicklab (partition fonksiyonunu yaz)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);

  /* ---------- SL.ALGS eklentileri (yerinde: less / exch) ---------- */
  function partition(a, o, lo, hi) {
    let i = lo, j = hi + 1;
    o.mark('min', lo); o.note(`partition(${lo}, ${hi}): pivot = a[${lo}] (kırmızı). i soldan, j sağdan ilerliyor`);
    for (;;) {
      while (o.less(a, ++i, lo)) { o.mark('i', i); if (i === hi) break; }
      o.mark('i', i);
      while (o.less(a, lo, --j)) { o.mark('j', j); if (j === lo) break; }
      o.mark('j', j);
      if (i >= j) break;
      o.note(`a[${i}] ≥ pivot ve a[${j}] ≤ pivot → yer değiştir`);
      o.exch(a, i, j);
    }
    o.note(`i ve j kesişti → pivotu j = ${j} konumuna koy: artık SON yerinde`);
    o.exch(a, lo, j);
    o.mark('min', -1);
    return j;
  }
  SL.qsPartition = partition;
  SL.ALGS.quick = function (a, o, opts = {}) {
    const n = a.length;
    if (!opts.noshuffle) { o.note('Önce diziyi KARIŞTIR (performans garantisi için)'); for (let i = 0; i < n; i++) { const r = rint(i + 1); if (r !== i) o.exch(a, i, r); } }
    const sort = (lo, hi) => { if (hi <= lo) return; o.region('sorted', lo, hi + 1); const j = partition(a, o, lo, hi); sort(lo, j - 1); sort(j + 1, hi); };
    sort(0, n - 1); o.mark('i', -1); o.mark('j', -1); o.region('sorted', 0, 0); o.region('final', 0, n); o.note('Bitti!');
  };
  SL.ALGS.quicknosh = (a, o) => SL.ALGS.quick(a, o, { noshuffle: true });
  SL.ALGS.quick3 = function (a, o) {
    const n = a.length;
    for (let i = 0; i < n; i++) { const r = rint(i + 1); if (r !== i) o.exch(a, i, r); }
    const sort = (lo, hi) => {
      if (hi <= lo) return;
      o.region('sorted', lo, hi + 1);
      let lt = lo, i = lo + 1, gt = hi; const v = a[lo];
      o.note(`3 yollu bölümleme a[${lo}…${hi}], pivot değeri ${v}: [ < v | = v | ? | > v ]`);
      while (i <= gt) {
        o.mark('min', lt); o.mark('i', i); o.mark('j', gt);
        if (o.cmpv(a[i], v, i, lt)) { o.exch(a, lt, i); lt++; i++; }
        else if (o.cmpv(v, a[i], i, gt)) { o.exch(a, i, gt); gt--; }
        else i++;
      }
      o.note(`a[${lt}…${gt}] = ${v} → hepsi son yerinde, bir daha dokunulmaz`);
      sort(lo, lt - 1); sort(gt + 1, hi);
    };
    sort(0, n - 1); o.mark('i', -1); o.mark('j', -1); o.mark('min', -1); o.region('sorted', 0, 0); o.region('final', 0, n); o.note('Bitti!');
  };
  SL.ALGS.partition1 = function (a, o) { const j = partition(a, o, 0, a.length - 1); o.mark('min', j); o.region('final', j, j + 1); o.note(`Bitti: pivot ${a[j]} indeks ${j}’de. Solundakiler ≤, sağındakiler ≥.`); };
  SL.ALGS.select = function (a, o, opts = {}) {
    const n = a.length, k = opts.k != null ? Math.min(n - 1, Math.max(0, opts.k)) : n >> 1;
    for (let i = 0; i < n; i++) { const r = rint(i + 1); if (r !== i) o.exch(a, i, r); }
    let lo = 0, hi = n - 1;
    o.note(`Aranan: sıralanınca ${k}. indekse (0’dan) gelecek eleman`);
    while (hi > lo) {
      o.region('sorted', lo, hi + 1);
      const j = partition(a, o, lo, hi);
      if (j < k) { lo = j + 1; o.note(`pivot ${j}’de < ${k} → sadece SAĞ tarafla devam`); }
      else if (j > k) { hi = j - 1; o.note(`pivot ${j}’de > ${k} → sadece SOL tarafla devam`); }
      else break;
    }
    o.region('sorted', 0, 0); o.mark('i', -1); o.mark('j', -1); o.mark('min', k); o.region('final', k, k + 1);
    o.note(`Bulundu: a[${k}] = ${a[k]}. Tamamen sıralamadık — ortalama ~2N karşılaştırma!`);
  };
  Object.assign(SL.ALG_NAMES, { quick: 'Quicksort', quicknosh: 'Quicksort (karıştırmasız)', quick3: 'Quicksort (3 yollu)' });

  /* ---------- Princeton tarzı bölümleme izi ---------- */
  D.parttrace = function (root) {
    const a = SL.parseValues(root.dataset.values || 'K R A T E L E P U I M Q C X O S');
    const n = a.length, lo = 0, hi = n - 1, rows = [];
    const row = (i, j, cls, label) => `<tr class="${label === 'init' ? 'init' : 'fragment'}"><td>${i ?? ''}</td><td>${j ?? ''}</td>${a.map((v, k) => `<td class="${cls(k)}">${v}</td>`).join('')}</tr>`;
    rows.push(row('', '', () => 'blk', 'init'));
    let i = lo, j = hi + 1;
    for (;;) {
      while (a[++i] < a[lo]) if (i === hi) break;
      while (a[lo] < a[--j]) if (j === lo) break;
      if (i >= j) break;
      [a[i], a[j]] = [a[j], a[i]];
      rows.push(row(i, j, k => (k === lo ? 'red' : k === i || k === j ? 'blk ex' : 'gry'), ''));
    }
    [a[lo], a[j]] = [a[j], a[lo]];
    rows.push(row(i, j, k => (k === j ? 'red' : k < j ? 'blk' : 'blk'), ''));
    root.innerHTML = `<table class="trace-t pt"><thead><tr><th>i</th><th>j</th><th colspan="${n}" class="arr-h">a[ ] — pivot v = a[0] = ${a[j]}</th></tr><tr class="idx"><th></th><th></th>${a.map((_, k) => `<th>${k}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  };

  /* ---------- Princeton tarzı quicksort izi (lo j hi) ---------- */
  D.qtrace = function (root) {
    const a = SL.parseValues(root.dataset.values || 'K R A T E L E P U I M Q C X O S');
    const n = a.length, rows = [], fin = new Set();
    const part = (lo, hi) => { let i = lo, j = hi + 1; for (;;) { while (a[++i] < a[lo]) if (i === hi) break; while (a[lo] < a[--j]) if (j === lo) break; if (i >= j) break; [a[i], a[j]] = [a[j], a[i]]; } [a[lo], a[j]] = [a[j], a[lo]]; return j; };
    rows.push(`<tr class="init"><td></td><td></td><td></td>${a.map(v => `<td class="blk">${v}</td>`).join('')}</tr>`);
    const sort = (lo, hi) => {
      if (hi < lo) return;
      if (hi === lo) { fin.add(lo); rows.push(`<tr class="fragment"><td>${lo}</td><td></td><td>${hi}</td>${a.map((v, k) => `<td class="${k === lo ? 'red' : fin.has(k) ? 'gry' : 'blk'}">${v}</td>`).join('')}</tr>`); return; }
      const j = part(lo, hi); fin.add(j);
      rows.push(`<tr class="fragment"><td>${lo}</td><td>${j}</td><td>${hi}</td>${a.map((v, k) => `<td class="${k === j ? 'red' : k < lo || k > hi ? 'gry' : 'blk'}">${v}</td>`).join('')}</tr>`);
      sort(lo, j - 1); sort(j + 1, hi);
    };
    sort(0, n - 1);
    root.innerHTML = `<table class="trace-t bt3 qt"><thead><tr><th>lo</th><th>j</th><th>hi</th><th colspan="${n}" class="arr-h">a[ ]</th></tr><tr class="idx"><th></th><th></th><th></th>${a.map((_, k) => `<th>${k}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  };

  /* ---------- Oyun: canlıları başa, ölüleri sona (yerinde bölümleme) ---------- */
  D.alive = function (root) {
    const faces = ['👹', '👺', '🐉', '🧟', '🕷️', '💀', '👻', '🐺', '🦇', '🐍', '🦂', '🐗'];
    let ents;
    const row = el('div', { class: 'bs-row al-row' });
    const note = el('div', { class: 'sv-note' });
    const stat = el('div', { class: 'sv-counters' });
    const gen = () => { ents = faces.map(f => ({ f, alive: Math.random() < 0.55 })); plan(); };
    const draw = fr => {
      row.innerHTML = fr.arr.map((e, k) => `<div class="bs-cell al ${e.alive ? 'on' : 'off'}${k === fr.i ? ' mid' : ''}${k === fr.j ? ' jj' : ''}"><b>${e.f}</b><i>${k}</i><u>${k === fr.i ? 'i' : ''}${k === fr.j ? ' j' : ''}</u></div>`).join('');
      note.textContent = fr.note;
      stat.innerHTML = `<span class="cnt swp"><b>${fr.sw}</b> yer değiştirme</span><span class="cnt">canlı ${fr.arr.filter(e => e.alive).length} / ${fr.arr.length}</span>`;
    };
    const fp = new SL.FramePlayer(draw, { speed: 2 });
    const plan = () => {
      const a = ents.slice(), F = []; let i = 0, j = a.length - 1, sw = 0;
      F.push({ arr: a.slice(), sw, note: 'Hedef: canlılar (yeşil) başta, ölüler (gri) sonda. Yeni dizi yok, sadece yer değiştirme. i soldan ölü arar, j sağdan canlı arar.' });
      for (;;) {
        while (i <= j && a[i].alive) { i++; F.push({ arr: a.slice(), i, j, sw, note: `a[${i - 1}] canlı → i ilerler` }); }
        while (i <= j && !a[j].alive) { j--; F.push({ arr: a.slice(), i, j, sw, note: `a[${j + 1}] ölü → j geriler` }); }
        if (i >= j) break;
        [a[i], a[j]] = [a[j], a[i]]; sw++;
        F.push({ arr: a.slice(), i, j, sw, note: `a[${i}] ölü, a[${j}] canlı → yer değiştir` });
      }
      F.push({ arr: a.slice(), sw, note: `Bitti: ilk ${i} eleman canlı. Sadece ${sw} yer değiştirme, tek geçiş (O(N)). Oyun döngüsü artık sadece a[0…${i - 1}]’i günceller.` });
      fp.load(F);
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('▶ Bölümle', () => fp.play(), 'primary'), btn('🎲 Yeni dalga', gen)), row, SL.transport(fp, { min: 0.3, max: 8 }), note, stat);
    gen();
    return { stop: () => fp.pause() };
  };

  /* ---------- Oyun: “%1 low FPS” — yüzdelik = seçim problemi ---------- */
  D.lowfps = function (root) {
    let spikes = 3;
    const W = 760, H = 260;
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    const info = el('div', { class: 'lf-info' });
    const quickselect = (arr, k) => {
      const a = arr.slice(); let lo = 0, hi = a.length - 1, cmp = 0;
      while (hi > lo) {
        const p = lo + rint(hi - lo + 1); [a[lo], a[p]] = [a[p], a[lo]];
        let i = lo, j = hi + 1;
        for (;;) { while (a[++i] < a[lo]) { cmp++; if (i === hi) break; } cmp++; while (a[lo] < a[--j]) { cmp++; if (j === lo) break; } cmp++; if (i >= j) break; [a[i], a[j]] = [a[j], a[i]]; }
        [a[lo], a[j]] = [a[j], a[lo]];
        if (j < k) lo = j + 1; else if (j > k) hi = j - 1; else break;
      }
      return [a[k], cmp];
    };
    const run = () => {
      const t = T(), N = 1000;
      const ft = Array.from({ length: N }, () => 14 + Math.random() * 4);           // ~60 FPS
      for (let s = 0; s < spikes * 4; s++) { const at = rint(N); for (let q = 0; q < 1 + rint(3); q++) if (at + q < N) ft[at + q] = 40 + Math.random() * 60; }   // takılmalar
      const avg = ft.reduce((x, y) => x + y) / N;
      const [p50, c1] = quickselect(ft, N >> 1), [p99, c2] = quickselect(ft, Math.floor(N * 0.99));
      ctx.clearRect(0, 0, W, H);
      const maxT = Math.max(...ft), bw = W / N;
      ft.forEach((v, i) => { ctx.fillStyle = v > 33 ? t.s2 : t.s1; const h = (v / maxT) * (H - 30); ctx.fillRect(i * bw, H - h, Math.max(bw, 1), h); });
      const line = (v, col, lab) => { const y = H - (v / maxT) * (H - 30); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = col; ctx.font = '700 13px "Source Sans 3"'; ctx.fillText(lab, W - 150, y - 4); };
      line(avg, t.ink, `ortalama ${avg.toFixed(1)} ms`); line(p99, t.red, `%99’luk ${p99.toFixed(1)} ms`);
      info.innerHTML = `<div class="big">Ortalama FPS: <b>${(1000 / avg).toFixed(0)}</b></div><div class="big">Medyan FPS: <b>${(1000 / p50).toFixed(0)}</b></div><div class="big c-red">%1 low FPS: <b>${(1000 / p99).toFixed(0)}</b></div>` +
        `<p class="mini">1000 karenin süresi (ms). Turuncu = takılma. Ortalama “60 FPS” gösterir ama oyuncu takılmaları hisseder: <b>%1 low</b> (en kötü %1’lik karelerin eşiği) bunu yakalar.</p>` +
        `<p class="mini">Medyan ve %99’luk değer <b>quickselect</b> ile bulundu: ${fmt(c1)} + ${fmt(c2)} karşılaştırma (tam sıralama ~${fmt(Math.round(N * Math.log2(N)))}).</p>`;
    };
    root.append(el('div', { class: 'sv-controls' }, slider('Takılma sıklığı', 0, 8, spikes, 1, v => { spikes = v; run(); }), btn('🎲 Yeni ölçüm', run, 'primary')), el('div', { class: 'lf-wrap' }, c, info));
    SL.onTheme(run); run();
  };

  /* ---------- Canlı ölçüm ---------- */
  D.qexp = function (root) {
    const tbl = el('table', { class: 'dbl-t' });
    let busy = false;
    const qs = (a, shuffle) => {
      const n = a.length;
      if (shuffle) for (let i = n - 1; i > 0; i--) { const r = rint(i + 1); const t = a[i]; a[i] = a[r]; a[r] = t; }
      const st = [[0, n - 1]];   // açık yığın: derin özyineleme taşmasın
      while (st.length) {
        const [lo, hi] = st.pop(); if (hi <= lo) continue;
        let i = lo, j = hi + 1; const v = a[lo];
        for (;;) { while (a[++i] < v) if (i === hi) break; while (v < a[--j]) if (j === lo) break; if (i >= j) break; const t = a[i]; a[i] = a[j]; a[j] = t; }
        a[lo] = a[j]; a[j] = v; st.push([lo, j - 1], [j + 1, hi]);
      }
    };
    const ms = a => { const aux = new Float64Array(a.length); const sort = (lo, hi) => { if (hi <= lo) return; const mid = (lo + hi) >> 1; sort(lo, mid); sort(mid + 1, hi); for (let k = lo; k <= hi; k++) aux[k] = a[k]; let i = lo, j = mid + 1; for (let k = lo; k <= hi; k++) { if (i > mid) a[k] = aux[j++]; else if (j > hi) a[k] = aux[i++]; else if (aux[j] < aux[i]) a[k] = aux[j++]; else a[k] = aux[i++]; } }; sort(0, a.length - 1); };
    const run = async kind => {
      if (busy) return; busy = true;
      if (kind === 'worst') {
        tbl.innerHTML = '<tr><th>N (SIRALI girdi)</th><th>quicksort, karıştırmasız</th><th>quicksort, karıştırmalı</th></tr>';
        for (const N of [2000, 4000, 8000, 16000]) {
          await new Promise(r => setTimeout(r, 30));
          const base = Float64Array.from({ length: N }, (_, i) => i);
          const t = f => { const a = base.slice(); const t0 = performance.now(); f(a); return performance.now() - t0; };
          tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(N)}</td><td class="c-red"><b>${t(a => qs(a, false)).toFixed(1)} ms</b></td><td>${t(a => qs(a, true)).toFixed(1)} ms</td></tr>`);
        }
      } else {
        tbl.innerHTML = '<tr><th>N (rastgele)</th><th>mergesort</th><th>quicksort</th><th>hazır sort()</th></tr>';
        const w = Float64Array.from({ length: 50000 }, Math.random); ms(w.slice()); qs(w.slice(), true); w.slice().sort();
        for (const N of [100000, 400000, 1600000]) {
          await new Promise(r => setTimeout(r, 30));
          const base = Float64Array.from({ length: N }, Math.random);
          const t = f => { const a = base.slice(); const t0 = performance.now(); f(a); return performance.now() - t0; };
          tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(N)}</td><td>${t(ms).toFixed(1)} ms</td><td>${t(a => qs(a, true)).toFixed(1)} ms</td><td>${t(a => a.sort()).toFixed(1)} ms</td></tr>`);
        }
      }
      busy = false;
    };
    root.append(el('div', { class: 'sv-controls' }, btn('🏁 Rastgele girdide yarış', () => run('race'), 'primary'), btn('😈 Sıralı girdi: karıştırma olmadan', () => run('worst'))), tbl);
    tbl.innerHTML = '<tr><td class="mini">Bir deney seçin (bu bilgisayarda ölçülür).</td></tr>';
  };

  /* ---------- .quicklab ---------- */
  const PY_Q = `
import json, random
def _qs(a, lo, hi, depth=0):
    while hi > lo:
        j = partition(a, lo, hi)
        if not isinstance(j, int) or j < lo or j > hi:
            raise RuntimeError("partition geçerli bir indeks döndürmedi: " + repr(j))
        _qs(a, lo, j - 1, depth + 1)
        lo = j + 1
def _run(cases):
    out = []
    for c in cases:
        a = list(c)
        try:
            random.shuffle(a)
            _qs(a, 0, len(a) - 1)
            out.append([a, None])
        except BaseException as e:
            out.append([None, type(e).__name__ + ": " + str(e)])
    return json.dumps(out)
`;
  SL.QuickLab = function (root) {
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const cases = () => { const cs = [[], [1], [2, 1], [1, 2], [3, 3, 3], [5, 1, 4, 2, 3]]; for (let t = 0; t < 40; t++) cs.push(Array.from({ length: 1 + rint(30) }, () => rint(20))); return cs; };
    const report = (cs, res) => {
      const bad = cs.findIndex((c, i) => res[i][1] || JSON.stringify(res[i][0]) !== JSON.stringify(c.slice().sort((x, y) => x - y)));
      const k = bad >= 0 ? bad : cs.length - 1;
      view.innerHTML = `<div class="mini">${bad >= 0 ? 'Başarısız test' : 'Örnek test'} girdisi:</div><div class="ll-chips">${cs[k].map(x => `<span class="ll-chip">${x}</span>`).join('') || '(boş)'}</div><div class="mini">Senin partition’ınla quicksort sonucu:</div><div class="ll-chips">${res[k][1] ? '<span class="c-red">⚠️ ' + res[k][1] + '</span>' : (res[k][0] || []).map(x => `<span class="ll-chip">${x}</span>`).join('') || '(boş)'}</div>`;
      if (bad >= 0) shell.setMsg('err', `❌ Test başarısız (${bad + 1}. test). ${res[bad][1] ? 'Hata: ' + res[bad][1] : 'Dizi doğru sıralanmadı.'}`);
      else shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti! Senin partition’ın ile quicksort çalışıyor.`);
    };
    shell.onRun = async () => {
      shell.clearOut();
      const cs = cases(), code = shell.cm.getValue();
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_Q); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_cases', py.toPy(cs));
        let res; try { res = JSON.parse(py.runPython('_run(_cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        report(cs, res.map(([r, e]) => [r, e && SL.pyErrorText(e)]));
        return;
      }
      let part;
      try { part = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof partition !== 'function') throw new Error(\"Kodda 'partition(a, lo, hi)' fonksiyonu bulunamadı.\"); return partition;")(shell.print, SL.makeGuard(500000)); }
      catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      const res = cs.map(c => {
        const a = SL.shuffle(c.slice());
        const qs = (lo, hi) => { while (hi > lo) { const j = part(a, lo, hi); if (!Number.isInteger(j) || j < lo || j > hi) throw new Error('partition geçerli bir indeks döndürmedi: ' + j); qs(lo, j - 1); lo = j + 1; } };
        try { qs(0, a.length - 1); return [a, null]; } catch (e) { return [null, SL.jsErrorText(e)]; }
      });
      report(cs, res);
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.quicklab', SL.QuickLab);
})();
