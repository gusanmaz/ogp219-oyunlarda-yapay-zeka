/* =====================================================================
   mergesort.js — Mergesort görselleştirmeleri (core.js + siralama.js gerekir)
   - SL.ALGS'e merge (yukarıdan aşağı) ve mergebu (aşağıdan yukarı) ekler
   Demolar: mergeviz, mergetrace, mergepiles, rectree, lowerbound, sortexp
   Bileşen: .mergelab (merge fonksiyonunu yaz, otomatik test)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);

  /* ---------- Yarış/animasyon için SL.ALGS eklentileri ---------- */
  function mergeInto(a, aux, o, lo, mid, hi) {
    for (let k = lo; k <= hi; k++) aux[k] = a[k];
    let i = lo, j = mid + 1;
    for (let k = lo; k <= hi; k++) {
      if (i > mid) a[k] = aux[j++];
      else if (j > hi) a[k] = aux[i++];
      else if (o.cmpv(aux[j], aux[i], k, k)) a[k] = aux[j++];
      else a[k] = aux[i++];
    }
  }
  SL.ALGS.merge = function (a, o) {
    const n = a.length, aux = new Array(n);
    const sort = (lo, hi) => { if (hi <= lo) return; const mid = lo + ((hi - lo) >> 1); sort(lo, mid); sort(mid + 1, hi); o.note(`merge(${lo}, ${mid}, ${hi})`); mergeInto(a, aux, o, lo, mid, hi); o.region('sorted', lo, hi + 1); };
    sort(0, n - 1); o.region('sorted', 0, 0); o.region('final', 0, n); o.note('Bitti!');
  };
  SL.ALGS.mergebu = function (a, o) {
    const n = a.length, aux = new Array(n);
    for (let sz = 1; sz < n; sz *= 2) for (let lo = 0; lo < n - sz; lo += 2 * sz) { const hi = Math.min(lo + 2 * sz - 1, n - 1); o.note(`sz = ${sz}: merge(${lo}, ${lo + sz - 1}, ${hi})`); mergeInto(a, aux, o, lo, lo + sz - 1, hi); }
    o.region('final', 0, n); o.note('Bitti!');
  };
  SL.ALG_NAMES.merge = 'Mergesort';
  SL.ALG_NAMES.mergebu = 'Mergesort (aşağıdan yukarı)';

  /* ---------- Kare üretici: a ve aux dizileriyle mergesort ---------- */
  function mergeFrames(a0, mode, cutoff) {
    const a = a0.slice(), n = a.length, aux = new Array(n).fill(null), F = [], st = { c: 0, w: 0 };
    const sortedR = [];
    const P = o => F.push(Object.assign({ a: a.slice(), aux: aux.slice(), c: st.c, w: st.w, sorted: sortedR.slice() }, o));
    const merge = (lo, mid, hi, label) => {
      if (mode !== 'naive' && a[mid] <= a[mid + 1]) { st.c++; P({ lo, mid, hi, note: `${label}: a[mid] = ${a[mid]} ≤ a[mid+1] = ${a[mid + 1]} → zaten sıralı, birleştirmeyi ATLA ✂` }); sortedR.push([lo, hi]); return; }
      for (let k = lo; k <= hi; k++) { aux[k] = a[k]; st.w++; }
      P({ lo, mid, hi, note: `${label}: a[${lo}…${hi}] → aux’a kopyalandı (sol yarı ${lo}…${mid}, sağ yarı ${mid + 1}…${hi})`, phase: 'copy' });
      let i = lo, j = mid + 1;
      for (let k = lo; k <= hi; k++) {
        let note;
        if (i > mid) { a[k] = aux[j]; note = `sol yarı bitti → sağdan al: a[${k}] = ${aux[j]}`; j++; }
        else if (j > hi) { a[k] = aux[i]; note = `sağ yarı bitti → soldan al: a[${k}] = ${aux[i]}`; i++; }
        else {
          st.c++;
          if (aux[j] < aux[i]) { a[k] = aux[j]; note = `${aux[j]} &lt; ${aux[i]} → SAĞDAN al: a[${k}] = ${aux[j]}`; j++; }
          else { a[k] = aux[i]; note = `${aux[i]} ≤ ${aux[j]} → SOLDAN al: a[${k}] = ${aux[i]}` + (aux[i] === aux[j] ? ' (eşitse sol: kararlılık!)' : ''); i++; }
        }
        st.w++;
        P({ lo, mid, hi, i, j, k, note });
      }
      for (let k = lo; k <= hi; k++) aux[k] = null;
      sortedR.push([lo, hi]);
      P({ lo, mid, hi, note: `a[${lo}…${hi}] sıralı ✔` });
    };
    const ins = (lo, hi) => { for (let x = lo + 1; x <= hi; x++) for (let y = x; y > lo; y--) { st.c++; if (a[y] < a[y - 1]) { const t = a[y]; a[y] = a[y - 1]; a[y - 1] = t; st.w += 2; } else break; } sortedR.push([lo, hi]); P({ lo, hi, note: `küçük parça (${hi - lo + 1} eleman) → insertion sort ile sıralandı` }); };
    P({ note: mode === 'bu' ? 'Aşağıdan yukarı: önce 1’lik parçaları ikişer ikişer birleştir, sonra 2’likleri, 4’lükleri…' : 'Yukarıdan aşağı: diziyi ikiye böl, her yarıyı (özyinelemeyle) sırala, sonra birleştir.' });
    if (mode === 'bu') {
      for (let sz = 1; sz < n; sz *= 2) for (let lo = 0; lo < n - sz; lo += 2 * sz) merge(lo, lo + sz - 1, Math.min(lo + 2 * sz - 1, n - 1), `sz = ${sz}`);
    } else {
      const sort = (lo, hi) => {
        if (hi <= lo) return;
        if (cutoff && hi - lo + 1 <= cutoff) { ins(lo, hi); return; }
        const mid = lo + ((hi - lo) >> 1);
        P({ lo, mid, hi, note: `sort(${lo}, ${hi}): ikiye böl → sort(${lo}, ${mid}) ve sort(${mid + 1}, ${hi})`, phase: 'split' });
        sort(lo, mid); sort(mid + 1, hi); merge(lo, mid, hi, `merge(${lo}, ${mid}, ${hi})`);
      };
      sort(0, n - 1);
    }
    P({ note: `Bitti! ${st.c} karşılaştırma, ${st.w} dizi yazması.`, done: true });
    return F;
  }
  SL.mergeFrames = mergeFrames;

  /* ---------- 1) Animasyon: üstte a[], altta aux[] ---------- */
  D.mergeviz = function (root) {
    const d = root.dataset;
    let N = +(d.n || 16), mode = d.mode || 'td', input = d.input || 'random';
    const W = 1180, H = 330;
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    const note = el('div', { class: 'sv-note' });
    const stat = el('div', { class: 'sv-counters' });
    let maxV = 1;
    const draw = f => {
      const t = T(), n = f.a.length, bw = W / n, gap = n <= 40 ? 3 : 1;
      ctx.clearRect(0, 0, W, H);
      const row = (arr, y0, h, isAux) => {
        for (let x = 0; x < n; x++) {
          const v = arr[x]; if (v == null) continue;
          const bh = Math.max(3, (v / maxV) * h), X = x * bw + gap / 2;
          let col = t.bar;
          if (!isAux && f.sorted.some(([l, r]) => x >= l && x <= r)) col = t['bar-sorted'];
          if (f.lo != null && (x < f.lo || x > f.hi)) col = isAux ? t['bar-final'] : (f.sorted.some(([l, r]) => x >= l && x <= r) ? t['bar-sorted'] : t['bar-final']);
          if (isAux && x === f.i) col = t.amber; if (isAux && x === f.j) col = t.pink;
          if (!isAux && x === f.k) col = t.red;
          if (f.done) col = t.green;
          ctx.fillStyle = col; ctx.globalAlpha = isAux ? 0.85 : 1;
          ctx.fillRect(X, y0 + h - bh, bw - gap, bh);
          if (n <= 24) { ctx.fillStyle = t.ink; ctx.font = '600 12px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText(v, X + (bw - gap) / 2, y0 + h - bh - 4); }
          ctx.globalAlpha = 1;
        }
      };
      ctx.fillStyle = t.muted; ctx.font = '600 13px "JetBrains Mono"'; ctx.textAlign = 'left';
      ctx.fillText('a[]', 4, 14); ctx.fillText('aux[]', 4, 214);
      row(f.a, 18, 170, false);
      row(f.aux, 222, 95, true);
      if (f.lo != null) { ctx.strokeStyle = t.blue; ctx.lineWidth = 2; ctx.strokeRect(f.lo * bw + 1, 16, (f.hi - f.lo + 1) * bw - 2, 176); if (f.mid != null && f.mid < f.hi) { ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo((f.mid + 1) * bw, 16); ctx.lineTo((f.mid + 1) * bw, 192); ctx.stroke(); ctx.setLineDash([]); } }
      ctx.font = '700 12px "JetBrains Mono"'; ctx.textAlign = 'center';
      if (f.i != null && f.i <= f.mid) { ctx.fillStyle = t.amber; ctx.fillText('i', f.i * bw + bw / 2, H - 2); }
      if (f.j != null && f.j <= f.hi) { ctx.fillStyle = t.pink; ctx.fillText('j', f.j * bw + bw / 2, H - 2); }
      if (f.k != null) { ctx.fillStyle = t.red; ctx.fillText('k', f.k * bw + bw / 2, 205); }
      note.innerHTML = f.note;
      stat.innerHTML = `<span class="cnt cmp"><b>${f.c}</b> karşılaştırma</span><span class="cnt wr"><b>${f.w}</b> dizi yazması</span><span class="cnt">N = ${n} · ½N lg N = ${Math.round(n * Math.log2(n) / 2)} · N lg N = ${Math.round(n * Math.log2(n))}</span>`;
    };
    const fp = new SL.FramePlayer(draw, { speed: +(d.speed || 4) });
    const build = () => { const a = SL.makeInput(input, N); maxV = Math.max(...a); fp.load(mergeFrames(a, mode, +(d.cutoff || 0))); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yöntem ', select({ td: 'Yukarıdan aşağı (özyinelemeli)', bu: 'Aşağıdan yukarı (döngülü)', naive: 'Yukarıdan aşağı, “zaten sıralı” kontrolü yok' }, mode, v => { mode = v; build(); })),
      el('label', { class: 'ctl' }, 'N ', select({ 8: '8', 16: '16', 24: '24', 32: '32', 64: '64' }, String(N), v => { N = +v; build(); })),
      el('label', { class: 'ctl' }, 'Girdi ', select(SL.INPUTS, input, v => { input = v; build(); })), btn('🎲 Yeni dizi', build)),
    c, SL.transport(fp, { min: 0.5, max: 60 }), note, stat);
    SL.onTheme(() => fp.render()); build();
    return { stop: () => fp.pause() };
  };

  /* ---------- 2) Princeton tarzı iz tablosu ---------- */
  D.mergetrace = function (root) {
    const a = SL.parseValues(root.dataset.values || 'M E R G E S O R T E X A M P L E');
    const n = a.length, rows = [];
    const cells = (lo, hi) => a.map((v, i) => `<td class="${i >= lo && i <= hi ? 'red' : 'gry'}">${v}</td>`).join('');
    rows.push(`<tr class="init"><td></td><td></td><td></td>${a.map(v => `<td class="blk">${v}</td>`).join('')}</tr>`);
    const aux = a.slice();
    const merge = (lo, mid, hi) => {
      for (let k = lo; k <= hi; k++) aux[k] = a[k];
      let i = lo, j = mid + 1;
      for (let k = lo; k <= hi; k++) { if (i > mid) a[k] = aux[j++]; else if (j > hi) a[k] = aux[i++]; else if (aux[j] < aux[i]) a[k] = aux[j++]; else a[k] = aux[i++]; }
      rows.push(`<tr class="fragment"><td>${lo}</td><td>${mid}</td><td>${hi}</td>${cells(lo, hi)}</tr>`);
    };
    const sort = (lo, hi) => { if (hi <= lo) return; const mid = lo + ((hi - lo) >> 1); sort(lo, mid); sort(mid + 1, hi); merge(lo, mid, hi); };
    sort(0, n - 1);
    root.innerHTML = `<table class="trace-t bt3 mt"><thead><tr><th>lo</th><th>mid</th><th>hi</th><th colspan="${n}" class="arr-h">a[ ] — merge(a, lo, mid, hi) sonrası</th></tr><tr class="idx"><th></th><th></th><th></th>${a.map((_, i) => `<th>${i}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  };

  /* ---------- 3) İki sıralı skor tablosunu birleştir ---------- */
  D.mergepiles = function (root) {
    const EU = [['Ayşe', 980], ['Lukas', 940], ['Emma', 870], ['Mert', 820], ['Noah', 610]];
    const AS = [['Yuki', 990], ['Wei', 900], ['Arjun', 870], ['Sora', 700]];
    const view = el('div', { class: 'mp-view' });
    const note = el('div', { class: 'sv-note' });
    const col = (title, list, from, cls) => `<div class="mp-col ${cls}"><div class="race-title">${title}</div>${list.map(([n, s], k) => `<div class="mp-row${k < from ? ' used' : k === from ? ' top' : ''}">${n} <b>${s}</b></div>`).join('')}</div>`;
    const draw = f => {
      view.innerHTML = col('🇪🇺 Avrupa sunucusu', EU, f.i, 'eu') + col('🌏 Asya sunucusu', AS, f.j, 'as') +
        `<div class="mp-col out"><div class="race-title">🌍 Küresel skor tablosu</div>${f.out.map(([n, s, r], k) => `<div class="mp-row ${r}${k === f.out.length - 1 && f.out.length ? ' new' : ''}">${k + 1}. ${n} <b>${s}</b></div>`).join('')}</div>`;
      note.innerHTML = f.note;
    };
    const fp = new SL.FramePlayer(draw, { speed: 1.2 });
    const frames = [{ i: 0, j: 0, out: [], note: 'İki liste de ayrı ayrı SIRALI (büyükten küçüğe). Her adımda iki listenin TEPESİNİ karşılaştır, büyüğü al.' }];
    let i = 0, j = 0; const out = [];
    while (i < EU.length || j < AS.length) {
      let note;
      if (i >= EU.length) { out.push(AS[j].concat('as')); note = `Avrupa bitti → kalanlar Asya’dan: ${AS[j][0]}`; j++; }
      else if (j >= AS.length) { out.push(EU[i].concat('eu')); note = `Asya bitti → kalanlar Avrupa’dan: ${EU[i][0]}`; i++; }
      else if (AS[j][1] > EU[i][1]) { note = `${AS[j][0]} ${AS[j][1]} &gt; ${EU[i][0]} ${EU[i][1]} → ${AS[j][0]} alındı`; out.push(AS[j].concat('as')); j++; }
      else { note = `${EU[i][0]} ${EU[i][1]} ≥ ${AS[j][0]} ${AS[j][1]} → ${EU[i][0]} alındı` + (EU[i][1] === AS[j][1] ? ' (eşitlikte SOL liste: kararlı)' : ''); out.push(EU[i].concat('eu')); i++; }
      frames.push({ i, j, out: out.slice(), note });
    }
    frames.push({ i, j, out: out.slice(), note: `Bitti: ${out.length} oyuncu, en fazla ${out.length - 1} karşılaştırma. Birleştirme <b>doğrusal</b> zaman!` });
    root.setAttribute('data-prevent-swipe', '');
    root.append(view, SL.transport(fp, { min: 0.3, max: 6 }), note);
    fp.load(frames);
    return { stop: () => fp.pause() };
  };

  /* ---------- 4) Özyineleme ağacı: her seviye N, lg N seviye ---------- */
  D.rectree = function (root) {
    const W = 760, H = 330;
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    const info = el('div', { class: 'rt-info' });
    let N = 16;
    const draw = () => {
      const t = T(), L = Math.log2(N), rowH = Math.min(52, (H - 20) / (L + 1));
      ctx.clearRect(0, 0, W, H);
      for (let d = 0; d <= L; d++) {
        const parts = 1 << d, sz = N / parts, w = (W - 140) / parts;
        for (let p = 0; p < parts; p++) {
          ctx.fillStyle = `hsl(${210 + d * 25},65%,${t.dark ? 45 : 70}%)`; ctx.fillRect(p * w + 2, 10 + d * rowH, w - 4, rowH - 10);
          if (w > 26) { ctx.fillStyle = t.dark ? '#fff' : '#111'; ctx.font = '600 12px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText(sz, p * w + w / 2, 10 + d * rowH + (rowH - 10) / 2 + 4); }
        }
        ctx.fillStyle = t.ink; ctx.font = '700 14px "Source Sans 3"'; ctx.textAlign = 'left';
        ctx.fillText(`${parts} × ${sz} = ${N}`, W - 130, 10 + d * rowH + (rowH - 10) / 2 + 5);
      }
      info.innerHTML = `<div class="big">N = ${N}</div><p>Her seviyede birleştirmenin toplam maliyeti ≈ <b>N</b> (${N}).</p><p>Seviye sayısı = kaç kez ikiye bölebiliriz = <b>lg N</b> (${L}).</p><p class="big c-blue">Toplam ≈ N × lg N = ${N * L}</p>`;
    };
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'N ', select({ 8: '8', 16: '16', 32: '32', 64: '64' }, '16', v => { N = +v; draw(); }))), el('div', { class: 'rt-wrap' }, c, info));
    SL.onTheme(draw); draw();
  };

  /* ---------- 5) Alt sınır tablosu: lg N! ≈ N lg N ---------- */
  D.lowerbound = function (root) {
    const out = el('div');
    const lgfact = n => { let s = 0; for (let k = 2; k <= n; k++) s += Math.log2(k); return s; };
    const upd = e => {
      const N = Math.round(Math.pow(10, e));
      const lf = N <= 1e6 ? lgfact(N) : N * Math.log2(N) - N * Math.log2(Math.E);
      out.innerHTML = `<table class="sum-t" style="font-size:20px"><tr><th>N</th><th>olası sıralanış N!</th><th>gereken soru lg N!</th><th>N lg N</th><th>mergesort (en kötü)</th></tr>` +
        `<tr><td>${fmt(N)}</td><td>${N <= 20 ? fmt(Array.from({ length: N }, (_, k) => k + 1).reduce((a, b) => a * b, 1)) : '≈ 2^' + fmt(Math.round(lf))}</td><td><b>${fmt(Math.ceil(lf))}</b></td><td>${fmt(Math.round(N * Math.log2(N)))}</td><td>≤ ${fmt(Math.round(N * Math.ceil(Math.log2(N))))}</td></tr></table>`;
    };
    root.append(el('div', { class: 'sv-controls' }, slider('N = 10ⁿ, n =', 0.5, 6, 1, 0.5, upd, v => fmt(Math.round(Math.pow(10, v))))), out);
    upd(1);
  };

  /* ---------- 6) Canlı ölçüm: insertion vs merge vs hazır ---------- */
  D.sortexp = function (root) {
    const tbl = el('table', { class: 'dbl-t' });
    let busy = false;
    const ins = a => { for (let i = 1; i < a.length; i++) { const v = a[i]; let j = i; while (j > 0 && a[j - 1] > v) { a[j] = a[j - 1]; j--; } a[j] = v; } };
    const msort = a => { const aux = new Float64Array(a.length); const sort = (lo, hi) => { if (hi - lo < 12) { for (let i = lo + 1; i <= hi; i++) { const v = a[i]; let j = i; while (j > lo && a[j - 1] > v) { a[j] = a[j - 1]; j--; } a[j] = v; } return; } const mid = (lo + hi) >> 1; sort(lo, mid); sort(mid + 1, hi); if (a[mid] <= a[mid + 1]) return; for (let k = lo; k <= hi; k++) aux[k] = a[k]; let i = lo, j = mid + 1; for (let k = lo; k <= hi; k++) { if (i > mid) a[k] = aux[j++]; else if (j > hi) a[k] = aux[i++]; else if (aux[j] < aux[i]) a[k] = aux[j++]; else a[k] = aux[i++]; } }; sort(0, a.length - 1); };
    const run = async () => {
      if (busy) return; busy = true;
      tbl.innerHTML = '<tr><th>N</th><th>insertion sort</th><th>mergesort (bizimki)</th><th>hazır sort()</th></tr>';
      const warm = new Float64Array(20000).map(Math.random); msort(warm.slice()); ins(warm.slice(0, 2000)); warm.slice().sort();
      for (const N of [4000, 16000, 64000, 256000, 1000000]) {
        await new Promise(r => setTimeout(r, 30));
        const base = new Float64Array(N); for (let i = 0; i < N; i++) base[i] = Math.random();
        const time = f => { const a = base.slice(); const t0 = performance.now(); f(a); return performance.now() - t0; };
        const ti = N <= 64000 ? time(ins).toFixed(1) + ' ms' : '<span class="mini">çok uzun</span>';
        tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(N)}</td><td>${ti}</td><td>${time(msort).toFixed(1)} ms</td><td>${time(a => a.sort()).toFixed(1)} ms</td></tr>`);
      }
      busy = false;
    };
    root.append(el('div', { class: 'sv-controls' }, btn('🧪 Ölçümü başlat', run, 'primary'), el('span', { class: 'mini' }, 'Rastgele ondalıklı sayılar, bu bilgisayarda.')), tbl);
    tbl.innerHTML = '<tr><td class="mini">“Ölçümü başlat”a basın. N 4 katına çıkınca insertion ~16 kat, mergesort ~4,5 kat yavaşlamalı.</td></tr>';
  };

  /* ---------- .mergelab ---------- */
  const PY_M = `
import json, random
def _sort(a):
    aux = [None] * len(a)
    def rec(lo, hi):
        if hi <= lo: return
        mid = lo + (hi - lo) // 2
        rec(lo, mid); rec(mid + 1, hi)
        merge(a, aux, lo, mid, hi)
    rec(0, len(a) - 1)
def _run(cases):
    out = []
    for c in cases:
        a = list(c)
        try:
            _sort(a)
            out.append([a, None])
        except BaseException as e:
            out.append([None, type(e).__name__ + ": " + str(e)])
    return json.dumps(out)
`;
  SL.MergeLab = function (root) {
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const cases = () => { const cs = [[], [1], [2, 1], [3, 1, 2], [5, 5, 5], [1, 2, 3, 4], [4, 3, 2, 1]]; for (let t = 0; t < 40; t++) cs.push(Array.from({ length: 1 + rint(30) }, () => rint(20))); return cs; };
    const report = (cs, res) => {
      const bad = cs.findIndex((c, i) => res[i][1] || JSON.stringify(res[i][0]) !== JSON.stringify(c.slice().sort((x, y) => x - y)));
      const k = bad >= 0 ? bad : cs.length - 1;
      view.innerHTML = `<div class="mini">${bad >= 0 ? 'Başarısız test' : 'Örnek test'} girdisi:</div><div class="ll-chips">${cs[k].map(x => `<span class="ll-chip">${x}</span>`).join('') || '(boş)'}</div><div class="mini">Senin mergesort’unun sonucu:</div><div class="ll-chips">${res[k][1] ? '<span class="c-red">⚠️ ' + res[k][1] + '</span>' : (res[k][0] || []).map(x => `<span class="ll-chip">${x}</span>`).join('') || '(boş)'}</div>`;
      if (bad >= 0) shell.setMsg('err', `❌ Test başarısız (${bad + 1}. test). ${res[bad][1] ? 'Hata: ' + res[bad][1] : 'Dizi doğru sıralanmadı.'}`);
      else shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti! Senin merge’ün ile mergesort çalışıyor.`);
    };
    shell.onRun = async () => {
      shell.clearOut();
      const cs = cases(), code = shell.cm.getValue();
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_M); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_cases', py.toPy(cs));
        let res; try { res = JSON.parse(py.runPython('_run(_cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        report(cs, res.map(([r, e]) => [r, e && SL.pyErrorText(e)]));
        return;
      }
      let merge;
      try { merge = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof merge !== 'function') throw new Error(\"Kodda 'merge(a, aux, lo, mid, hi)' fonksiyonu bulunamadı.\"); return merge;")(shell.print, SL.makeGuard(500000)); }
      catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      const res = cs.map(c => {
        const a = c.slice(), aux = new Array(a.length);
        const rec = (lo, hi) => { if (hi <= lo) return; const mid = lo + ((hi - lo) >> 1); rec(lo, mid); rec(mid + 1, hi); merge(a, aux, lo, mid, hi); };
        try { rec(0, a.length - 1); return [a, null]; } catch (e) { return [null, SL.jsErrorText(e)]; }
      });
      report(cs, res);
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.mergelab', SL.MergeLab);
})();
