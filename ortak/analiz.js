/* =====================================================================
   analiz.js — Algoritma analizi görselleştirmeleri (core.js'e ihtiyaç duyar)
   Demolar: stopwatch (iki katına çıkarma + log-log), freq (Knuth sıklıkları),
            pairs (tüm çiftler), budget (kare bütçesi), memcalc (bellek)
   Bileşen: .growthlab (kendi kodunun büyüme üssünü ölç)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const short = v => (v >= 1e15 ? v.toExponential(1) : v >= 1e12 ? +(v / 1e12).toFixed(1) + ' trilyon' : v >= 1e9 ? +(v / 1e9).toFixed(1) + ' milyar' : v >= 1e6 ? +(v / 1e6).toFixed(1) + ' milyon' : v >= 1e4 ? +(v / 1e3).toFixed(1) + ' bin' : fmt(Math.round(v)));
  SL.short = short;
  const timeStr = s => (s < 1e-6 ? (s * 1e9).toFixed(0) + ' ns' : s < 1e-3 ? (s * 1e6).toFixed(1) + ' µs' : s < 1 ? (s * 1e3).toFixed(1) + ' ms' : s < 120 ? s.toFixed(1) + ' sn' : s < 7200 ? (s / 60).toFixed(1) + ' dk' : s < 172800 ? (s / 3600).toFixed(1) + ' saat' : s < 6.3e7 ? (s / 86400).toFixed(0) + ' gün' : s < 3.15e13 ? short(s / 3.15e7) + ' yıl' : 'evrenin yaşından uzun');
  SL.timeStr = timeStr;

  /* ---------- 1) Kronometre: iki katına çıkarma deneyi + log-log grafiği ---------- */
  const WORK = {
    linear: { name: 'Hepsini topla (tek döngü)', f: a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; }, start: 1 << 18 },
    sort: { name: 'Hazır sort() (TypedArray)', f: a => { Float64Array.from(a).sort(); return 0; }, start: 1 << 15 },
    pairs: { name: 'Tüm çiftlerde çarpışma kontrolü', f: a => { let c = 0; const n = a.length; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.abs(a[i] - a[j]) < 1e-4) c++; return c; }, start: 1000 },
    three: { name: 'ThreeSum (üç iç içe döngü)', f: a => { let c = 0; const n = a.length; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) if (a[i] + a[j] + a[k] === 0) c++; return c; }, start: 128 }
  };
  D.stopwatch = function (root) {
    let alg = root.dataset.alg || 'pairs', busy = false, pts = [];
    const tbl = el('table', { class: 'dbl-t' });
    const W = 460, H = 300;
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    const pred = el('div', { class: 'sv-note' });
    const fit = () => {
      const P = pts.slice(-3); if (P.length < 2) return null;
      const xs = P.map(p => Math.log2(p.n)), ys = P.map(p => Math.log2(p.t));
      const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
      let num = 0, den = 0; xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
      const b = num / den, lga = my - b * mx; return { b, a: Math.pow(2, lga) };
    };
    const draw = () => {
      const t = T(), M = { l: 54, r: 14, t: 14, b: 40 };
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = t.rule; ctx.fillStyle = t.muted; ctx.font = '12px "Source Sans 3"'; ctx.lineWidth = 1;
      ctx.strokeRect(M.l, M.t, W - M.l - M.r, H - M.t - M.b);
      ctx.textAlign = 'center'; ctx.fillText('lg N  (N iki katına çıkınca bir sağa)', (M.l + W - M.r) / 2, H - 8);
      ctx.save(); ctx.translate(14, (M.t + H - M.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('lg (süre)', 0, 0); ctx.restore();
      if (!pts.length) { ctx.fillText('Deneyi başlatın', W / 2, H / 2); return; }
      const xs = pts.map(p => Math.log2(p.n)), ys = pts.map(p => Math.log2(p.t));
      const x0 = Math.min(...xs) - 0.5, x1 = Math.max(...xs) + 0.5, y0 = Math.min(...ys) - 0.5, y1 = Math.max(...ys) + 0.5;
      const X = x => M.l + ((x - x0) / (x1 - x0)) * (W - M.l - M.r), Y = y => H - M.b - ((y - y0) / (y1 - y0)) * (H - M.t - M.b);
      const f = fit();
      if (f) { ctx.strokeStyle = t.s2; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(X(x0), Y(Math.log2(f.a) + f.b * x0)); ctx.lineTo(X(x1), Y(Math.log2(f.a) + f.b * x1)); ctx.stroke(); ctx.setLineDash([]); }
      pts.forEach((p, i) => { ctx.fillStyle = t.s1; ctx.strokeStyle = t.card; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(xs[i]), Y(ys[i]), 6, 0, 7); ctx.fill(); ctx.stroke(); });
      ctx.fillStyle = t.ink; ctx.textAlign = 'left'; ctx.font = '600 14px "Source Sans 3"';
      if (f) ctx.fillText(`eğim b ≈ ${f.b.toFixed(2)}`, M.l + 10, M.t + 20);
    };
    const run = async () => {
      if (busy) return; busy = true; pts = [];
      const w = WORK[alg] || WORK.pairs;
      tbl.innerHTML = '<tr><th>N</th><th>süre</th><th>oran T(2N)/T(N)</th><th>lg oran = b</th></tr>';
      // JIT ısınması: deneyden önce orta boyutlu girdiyle birkaç kez çalıştır
      const warm = Array.from({ length: w.start * 2 }, () => Math.floor(Math.random() * 2e6) - 1e6);
      for (let r = 0; r < 3; r++) w.f(warm);
      let n = w.start, prev = null;
      for (let step = 0; step < 7; step++) {
        await new Promise(r => setTimeout(r, 30));
        const a = Array.from({ length: n }, () => Math.floor(Math.random() * 2e6) - 1e6);
        // ısınma (JIT) + en az 30 ms dolana kadar tekrar → ortalama
        w.f(a);
        let reps = 0; const t0 = performance.now(); let el = 0;
        do { w.f(a); reps++; el = performance.now() - t0; } while (el < 30 && reps < 200);
        let best = Math.max(el / reps, 0.001);
        pts.push({ n, t: best });
        const ratio = prev ? best / prev : null;
        tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(n)}</td><td>${best.toFixed(1)} ms</td><td>${ratio ? '<b>' + ratio.toFixed(2) + '</b>' : '—'}</td><td>${ratio ? Math.log2(ratio).toFixed(2) : '—'}</td></tr>`);
        draw(); prev = best;
        if (best > 900) break;
        n *= 2;
      }
      const f = fit();
      if (f) {
        const big = pts[pts.length - 1].n * 16;
        pred.innerHTML = `Hipotez: süre ≈ <b>${f.a.toExponential(2)} × N<sup>${f.b.toFixed(2)}</sup></b> ms. Tahmin: N = ${fmt(big)} için ≈ <b>${timeStr(f.a * Math.pow(big, f.b) / 1000)}</b>. (Doğrulamak ister misiniz? 😉)`;
      }
      busy = false;
    };
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Algoritma ', select(Object.fromEntries(Object.entries(WORK).map(([k, v]) => [k, v.name])), alg, v => (alg = v))), btn('⏱ Deneyi başlat', run, 'primary')),
      el('div', { class: 'sw-wrap' }, tbl, c), pred);
    SL.onTheme(draw); draw();
  };

  /* ---------- 2) Knuth: maliyet × sıklık (ThreeSum) ---------- */
  D.freq = function (root) {
    const out = el('div');
    const upd = N => {
      const C2 = N * (N - 1) / 2, C3 = N * (N - 1) * (N - 2) / 6;
      const rows = [
        ['def count(a):', '1', '1', ''], ['    n = len(a); cnt = 0', '1', '1', ''],
        ['    for i in range(n):', `N = ${fmt(N)}`, 'N', N],
        ['        for j in range(i + 1, n):', `N(N−1)/2 = ${fmt(C2)}`, '~N²/2', C2],
        ['            for k in range(j + 1, n):', `N(N−1)(N−2)/6 = ${fmt(C3)}`, '~N³/6', C3],
        ['                if a[i] + a[j] + a[k] == 0:', fmt(C3), '~N³/6', C3],
        ['                    cnt += 1', 'girdiye bağlı', '≤ N³/6', 0],
        ['    return cnt', '1', '1', '']];
      const max = C3 || 1;
      out.innerHTML = `<table class="freq-t"><tr><th>kod</th><th>kaç kez çalışır? (sıklık)</th><th>~</th><th></th></tr>` +
        rows.map(([code, f, tl, v]) => `<tr><td><code>${code.replace(/ /g, '&nbsp;')}</code></td><td>${f}</td><td><b>${tl}</b></td><td style="width:22%">${v !== '' ? `<div class="freq-bar" style="width:${Math.max(0.5, (v / max) * 100)}%"></div>` : ''}</td></tr>`).join('') + '</table>' +
        `<p class="mini">N = ${fmt(N)} için iç döngüdeki <code>if</code>, <code>for i</code> satırından <b>${short(C3 / N)}</b> kat daha sık çalışıyor. Toplam süreyi o satır belirler → <b>~N³/6</b> karşılaştırma.</p>`;
    };
    root.append(el('div', { class: 'sv-controls' }, slider('N =', 3, 2000, 10, 1, upd, v => fmt(v))), out);
    upd(10);
  };

  /* ---------- 3) Tüm çiftler: N(N−1)/2 ---------- */
  D.pairs = function (root) {
    const W = 420, H = 380;
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    const info = el('div', { class: 'pairs-info' });
    let N = 8;
    const draw = () => {
      const t = T(), cx = W / 2, cy = H / 2, R = 160;
      ctx.clearRect(0, 0, W, H);
      const P = Array.from({ length: N }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / N; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
      ctx.strokeStyle = t.s1; ctx.globalAlpha = N > 25 ? 0.25 : 0.55; ctx.lineWidth = 1.2;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      P.forEach(([x, y]) => ctx.fillText('👾', x, y));
      const p = N * (N - 1) / 2;
      info.innerHTML = `<div class="big">N = ${N} düşman</div><div class="big c-blue">${fmt(p)} çift</div><div>= N(N−1)/2 ≈ N²/2</div>` +
        `<p>Her çift için bir çarpışma kontrolü. N’i iki katına çıkarın → çiftler ~<b>4 katına</b> çıkar.</p>` +
        `<p class="mini">1000 düşman → ${fmt(1000 * 999 / 2)} kontrol, <b>her karede</b>. 10.000 düşman → ${short(10000 * 9999 / 2)}. (Çözüm: uzaysal bölümleme — quadtree, uzaysal hash.)</p>`;
    };
    root.append(el('div', { class: 'sv-controls' }, slider('N =', 2, 40, N, 1, v => { N = v; draw(); })), el('div', { class: 'pairs-wrap' }, c, info));
    SL.onTheme(draw); draw();
  };

  /* ---------- 4) Kare bütçesi: 60 FPS’te en fazla kaç N? ---------- */
  D.budget = function (root) {
    let fps = 60, speed = 1e9;
    const out = el('div');
    const lg = Math.log2;
    const classes = [
      ['1', 'sabit', 'a[i] okumak · bir değişkene yazmak', () => Infinity],
      ['lg N', 'logaritmik', 'ikili arama · BST’de arama', () => Infinity],
      ['N', 'doğrusal', 'tüm düşmanları güncelle · listede ara', B => B],
      ['N lg N', 'doğrusal-logaritmik', 'sıralama (mergesort, quicksort)', B => { let lo = 1, hi = B; while (hi - lo > 1) { const m = (lo + hi) / 2; if (m * lg(m) <= B) lo = m; else hi = m; } return lo; }],
      ['N²', 'karesel', 'tüm çiftlerde çarpışma kontrolü', B => Math.sqrt(B)],
      ['N³', 'kübik', 'üç iç içe döngü (ThreeSum)', B => Math.cbrt(B)],
      ['2ᴺ', 'üstel', 'tüm ekipman kombinasyonlarını dene', B => lg(B)],
      ['N!', 'faktöriyel', 'tüm rota sıralarını dene (gezgin satıcı)', B => { let n = 1, f = 1; while (f * (n + 1) <= B) { n++; f *= n; } return n; }]
    ];
    const upd = () => {
      const B = speed / fps;
      out.innerHTML = `<p>Bir kare: <b>${(1000 / fps).toFixed(1)} ms</b> · saniyede ${short(speed)} işlem → kare başına <b>${short(B)}</b> işlem (tamamı bu algoritmaya harcansa bile!)</p>` +
        `<table class="sum-t" style="font-size:18px"><tr><th>büyüme</th><th>adı</th><th>oyunda örnek</th><th>bir karede en fazla N</th></tr>` +
        classes.map(([f, n, ex, g]) => { const m = g(B); return `<tr><td><b>${f}</b></td><td>${n}</td><td style="text-align:left">${ex}</td><td><b class="${m < 100 ? 'c-red' : m === Infinity ? 'c-green' : ''}">${m === Infinity ? 'sınırsız' : fmt(Math.floor(m))}</b></td></tr>`; }).join('') + '</table>';
    };
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Hedef ', select({ 30: '30 FPS', 60: '60 FPS', 120: '120 FPS', 144: '144 FPS' }, '60', v => { fps = +v; upd(); })),
      el('label', { class: 'ctl' }, 'Makine ', select({ 1e8: 'yavaş (10⁸ işlem/sn, ör. eski telefon, Python)', 1e9: 'normal (10⁹ işlem/sn)', 1e10: 'hızlı (10¹⁰ işlem/sn)' }, '1000000000', v => { speed = +v; upd(); }))), out);
    upd();
  };

  /* ---------- 5) Bellek hesaplayıcı ---------- */
  D.memcalc = function (root) {
    let e = 6;
    const out = el('div');
    const layouts = [
      ['int[] (C#)', 'yan yana 4 baytlık tamsayılar', 4, 's1'],
      ['Vector3[] (struct dizisi)', '3 float = 12 bayt, yan yana', 12, 's1'],
      ['Enemy struct dizisi', 'konum + can + hız + ad referansı ≈ 32 bayt (hizalanmış)', 32, 's3'],
      ['List<Enemy> (class)', '8 bayt referans + ~48 baytlık nesne (başlık + alanlar)', 56, 's2'],
      ['LinkedList<Enemy>', 'her eleman için ~48 baytlık düğüm + nesne', 104, 's2'],
      ['Python list[int]', '8 bayt referans + 28 baytlık int nesnesi', 36, 's4']
    ];
    const upd = () => {
      const N = Math.round(Math.pow(10, e)), max = 104 * N;
      out.innerHTML = `<div class="big">N = ${short(N)} eleman</div>` + layouts.map(([n, d, b, col]) => {
        const tot = b * N;
        return `<div class="mem-l"><div><b>${n}</b><br><span class="mini">${d}</span></div><div class="mem-lbar"><div style="width:${(tot / max) * 100}%;background:var(--${col})"></div></div><b>${tot >= 1e9 ? (tot / 1e9).toFixed(1) + ' GB' : tot >= 1e6 ? (tot / 1e6).toFixed(1) + ' MB' : (tot / 1e3).toFixed(1) + ' KB'}</b></div>`;
      }).join('') + '<p class="mini">64-bit sistemler için yaklaşık değerler (nesne başlığı ~16 bayt, referans 8 bayt, 8 bayta hizalama). Gerçek değerler çalışma ortamına göre değişir.</p>';
    };
    root.append(el('div', { class: 'sv-controls' }, slider('N = 10ⁿ, n =', 3, 8, e, 1, v => { e = v; upd(); })), out);
    upd();
  };

  /* ---------- .growthlab ---------- */
  const PY_G = `
import json
_cnt = [0]
def tick():
    _cnt[0] += 1
    if _cnt[0] > 3000000:
        raise RuntimeError("çok fazla adım")
def _run(sizes):
    out = []
    for n in sizes:
        _cnt[0] = 0
        try:
            work(n)
            out.append([n, _cnt[0], None])
        except BaseException as e:
            out.append([n, _cnt[0], type(e).__name__ + ": " + str(e)])
            break
    return json.dumps(out)
`;
  SL.GrowthLab = function (root) {
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const classify = rows => {
      const ok = rows.filter(r => r[1] > 0);
      if (ok.length < 3) return 'Ölçmek için yeterli adım yok (iç döngüde tick() çağırıyor musun?).';
      const L = ok.slice(-3), b = Math.log2(L[2][1] / L[0][1]) / 2;
      const nlogn = L.map(([n, c]) => c / (n * Math.log2(n))), lin = L.map(([n, c]) => c / n);
      const flat = arr => Math.max(...arr) / Math.min(...arr) < 1.15;
      let name;
      if (b < 0.3) name = 'sabit ya da logaritmik (1, lg N)';
      else if (b < 1.35) name = flat(lin) ? 'doğrusal (N)' : flat(nlogn) ? 'doğrusal-logaritmik (N lg N)' : 'doğrusala yakın';
      else if (b < 2.4) name = 'karesel (N²)';
      else if (b < 3.4) name = 'kübik (N³)';
      else name = 'çok hızlı büyüyor (üstel olabilir!)';
      return `Tahmini üs b ≈ <b>${b.toFixed(2)}</b> → <b>${name}</b>`;
    };
    const report = rows => {
      view.innerHTML = '<table class="dbl-t" style="font-size:16px"><tr><th>N</th><th>adım sayısı</th><th>oran</th><th>b = lg oran</th></tr>' +
        rows.map(([n, c, e], i) => { const r = i && rows[i - 1][1] ? c / rows[i - 1][1] : null; return `<tr><td>${fmt(n)}</td><td>${e ? '⚠️ ' + e : fmt(c)}</td><td>${r ? r.toFixed(2) : '—'}</td><td>${r ? Math.log2(r).toFixed(2) : '—'}</td></tr>`; }).join('') + '</table>';
      shell.setMsg('ok', classify(rows));
    };
    shell.onRun = async () => {
      shell.clearOut();
      const sizes = [64, 128, 256, 512, 1024, 2048, 4096];
      const code = shell.cm.getValue();
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_G); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        let res; try { res = JSON.parse(py.runPython(`_run(${JSON.stringify(sizes)})`)); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        report(res);
        return;
      }
      let cnt = 0;
      const guard = () => { if (++cnt > 6e7) throw new Error('çok fazla adım'); return true; };
      const tick = () => { cnt++; };
      let fn;
      try { fn = new Function('print', '__g', 'tick', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof work !== 'function') throw new Error(\"Kodda 'work(N)' fonksiyonu bulunamadı.\"); return work;")(shell.print, guard, tick); }
      catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      const rows = [];
      for (const n of sizes) { cnt = 0; try { fn(n); rows.push([n, cnt, null]); } catch (e) { rows.push([n, cnt, SL.jsErrorText(e)]); break; } if (cnt > 2e7) break; }
      report(rows);
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.growthlab', SL.GrowthLab);
})();
