/* =====================================================================
   arama.js — Arama görselleştirmeleri (core.js'e ihtiyaç duyar)
   Demolar: binsearch, bintrace, guess, log2, versus, loot, xp, bisect
   Bileşen: .searchlab (ikili arama kod laboratuvarı + otomatik testler)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);
  const sortedDistinct = (n, max = 99) => { const s = new Set(); while (s.size < n) s.add(1 + rint(max)); return [...s].sort((x, y) => x - y); };

  /* Kutu dizisi çizici: frame alanları → lo, hi, mid, found, seen[], sent, out[] */
  function boxRow(row, a, f) {
    row.innerHTML = a.map((v, i) => {
      let cls = 'bs-cell';
      if (f.lo != null && (i < f.lo || i > f.hi)) cls += ' out';
      if (f.seen && f.seen.includes(i)) cls += ' seen';
      if (i === f.mid) cls += ' mid';
      if (i === f.found) cls += ' found';
      if (f.sent != null && i === f.sent) cls += ' sent';
      const tags = [];
      if (f.lo === i) tags.push('lo'); if (f.mid === i) tags.push(f.midName || 'mid'); if (f.hi === i) tags.push('hi');
      return `<div class="${cls}"><b>${v}</b><i>${i}</i><u>${tags.join(' ')}</u></div>`;
    }).join('');
  }
  SL.boxRow = boxRow;

  /* ---------- 1) Sıralı arama / nöbetçili sıralı arama / ikili arama ---------- */
  D.binsearch = function (root) {
    const N = +(root.dataset.n || 15);
    let a = [], mode = root.dataset.mode || 'bin';
    const sorted = root.dataset.sorted !== 'no';
    const row = el('div', { class: 'bs-row' });
    const note = el('div', { class: 'sv-note' });
    const stat = el('div', { class: 'sv-counters' });
    const input = el('input', { type: 'text', class: 'key-in', size: 4 });
    const gen = () => {
      a = sortedDistinct(N);
      if (!sorted) SL.shuffle(a);
      input.value = a[rint(N)]; plan();
    };
    const draw = f => {
      const arr = f.arr || a;
      boxRow(row, arr, f);
      note.textContent = f.note;
      stat.innerHTML = `<span class="cnt cmp"><b>${f.cmps}</b> karşılaştırma <i>a[i] = key?</i></span>` +
        (f.bounds != null ? `<span class="cnt swp"><b>${f.bounds}</b> sınır kontrolü <i>i &lt; N?</i></span>` : '') +
        `<span class="cnt">N = ${N}</span>` +
        `<span class="cnt">en kötü: sıralı ${N} · ikili ${Math.floor(Math.log2(N)) + 1}</span>`;
    };
    const fp = new SL.FramePlayer(draw, { speed: 1.2 });
    const plan = () => {
      const key = parseInt(input.value, 10);
      const frames = [];
      if (isNaN(key)) { fp.load([{ cmps: 0, note: 'Aranacak bir sayı yazın.' }]); return; }
      if (mode === 'seq') {
        const seen = []; let b = 0;
        frames.push({ seen: [], cmps: 0, bounds: 0, note: `Sıralı arama: ${key} için baştan sona tek tek bak` });
        let i = 0;
        for (; ; i++) {
          b++;
          if (!(i < N)) { frames.push({ seen: seen.slice(), cmps: i, bounds: b, note: `i = ${N}: dizi bitti → ${key} YOK (−1)` }); break; }
          seen.push(i);
          if (a[i] === key) { frames.push({ seen: seen.slice(), found: i, cmps: i + 1, bounds: b, note: `a[${i}] = ${key} → BULUNDU, ${i} döndür` }); break; }
          frames.push({ seen: seen.slice(), mid: i, midName: 'i', cmps: i + 1, bounds: b, note: `a[${i}] = ${a[i]} ≠ ${key} → sonrakine geç` });
        }
      } else if (mode === 'sent') {
        const arr = a.concat([key]);
        const seen = [];
        frames.push({ arr, sent: N, seen: [], cmps: 0, bounds: 0, note: `Nöbetçi: aranan ${key} dizinin SONUNA eklendi → döngü mutlaka durur, i < N kontrolüne gerek yok` });
        let i = 0;
        for (; ; i++) {
          seen.push(i);
          if (arr[i] === key) break;
          frames.push({ arr, sent: N, seen: seen.slice(), mid: i, midName: 'i', cmps: i + 1, bounds: 0, note: `a[${i}] = ${arr[i]} ≠ ${key} → devam (sınır kontrolü YOK)` });
        }
        frames.push({ arr, sent: N, seen: seen.slice(), found: i, cmps: i + 1, bounds: 1,
          note: i < N ? `a[${i}] = ${key} → durduk. i < N mi? Evet → BULUNDU (${i})` : `Nöbetçide durduk (i = N). Tek bir son kontrol: i = N → ${key} YOK (−1)` });
      } else {
        let lo = 0, hi = N - 1, k = 0;
        frames.push({ lo, hi, cmps: 0, note: `İkili arama: aralık a[${lo}…${hi}] (tüm dizi)` });
        while (lo <= hi) {
          const mid = lo + Math.floor((hi - lo) / 2); k++;
          if (key < a[mid]) { frames.push({ lo, hi, mid, cmps: k, note: `mid = ${mid}: ${key} < ${a[mid]} → SOL yarı: hi = ${mid - 1}` }); hi = mid - 1; }
          else if (key > a[mid]) { frames.push({ lo, hi, mid, cmps: k, note: `mid = ${mid}: ${key} > ${a[mid]} → SAĞ yarı: lo = ${mid + 1}` }); lo = mid + 1; }
          else { frames.push({ lo, hi, mid, found: mid, cmps: k, note: `mid = ${mid}: a[${mid}] = ${key} → BULUNDU (${k} karşılaştırma)` }); break; }
          if (lo > hi) frames.push({ lo, hi, cmps: k, note: `lo > hi → aralık boşaldı: ${key} YOK (${k} karşılaştırma)` });
          else frames.push({ lo, hi, cmps: k, note: `yeni aralık a[${lo}…${hi}] — ${hi - lo + 1} eleman kaldı` });
        }
      }
      fp.load(frames);
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); plan(); fp.play(); } });
    const modes = sorted ? { bin: 'İkili arama (binary search)', seq: 'Sıralı arama (sequential search)', sent: 'Sıralı arama + nöbetçi (sentinel)' }
      : { seq: 'Sıralı arama (sequential search)', sent: 'Sıralı arama + nöbetçi (sentinel)' };
    if (!modes[mode]) mode = Object.keys(modes)[0];
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yöntem ', select(modes, mode, v => { mode = v; plan(); })),
      el('label', { class: 'ctl' }, 'Aranan ', input), btn('🔍 Ara', () => { plan(); fp.play(); }, 'primary'), btn('🎲 Yeni dizi', gen)),
    row, SL.transport(fp, { min: 0.3, max: 8 }), note, stat);
    gen();
    return { stop: () => fp.pause() };
  };

  /* ---------- 2) Princeton tarzı ikili arama izi ---------- */
  D.bintrace = function (root) {
    const a = SL.parseValues(root.dataset.values || 'A C E H L M P R S X');
    const key = root.dataset.key || 'P';
    const rows = [];
    const cells = f => a.map((v, i) => `<td class="${i < f.lo || i > f.hi ? 'gry' : i === f.mid ? 'red' : 'blk'}">${v}</td>`).join('');
    let lo = 0, hi = a.length - 1, res = -1;
    rows.push(`<tr class="init"><td>${lo}</td><td>${hi}</td><td></td>${cells({ lo, hi })}</tr>`);
    while (lo <= hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      rows.push(`<tr class="fragment"><td>${lo}</td><td>${hi}</td><td>${mid}</td>${cells({ lo, hi, mid })}</tr>`);
      if (key < a[mid]) hi = mid - 1; else if (key > a[mid]) lo = mid + 1; else { res = mid; break; }
    }
    const idx = a.map((_, i) => `<th>${i}</th>`).join('');
    root.innerHTML = `<table class="trace-t bt3"><thead><tr><th>lo</th><th>hi</th><th>mid</th><th colspan="${a.length}" class="arr-h">a[ ] — aranan: <b class="c-red">${key}</b></th></tr>` +
      `<tr class="idx"><th></th><th></th><th></th>${idx}</tr></thead><tbody>${rows.join('')}` +
      `<tr class="fragment final"><td colspan="3"></td><td colspan="${a.length}" style="text-align:left;font-size:18px">${res >= 0 ? `✔ bulundu: indeks ${res}` : `✘ lo (${lo}) &gt; hi (${hi}) → yok. Ama lo = ${lo}: “${key} buraya eklenirdi” (rank)`}</td></tr></tbody></table>`;
  };

  /* ---------- 3) Sayı tahmin oyunu ---------- */
  D.guess = function (root) {
    let mode = 'pc', lo, hi, cnt, g, secret, hist;
    const bar = el('div', { class: 'guess-bar' });
    const msg = el('div', { class: 'guess-msg' });
    const ctl = el('div', { class: 'sv-controls' });
    const input = el('input', { type: 'text', class: 'key-in', size: 4 });
    const drawBar = () => {
      bar.innerHTML = `<div class="gb-range" style="left:${lo - 1}%;width:${Math.max(0, hi - lo + 1)}%"></div>` +
        hist.map(h => `<div class="gb-mark" style="left:${h - 0.5}%"></div>`).join('') +
        '<span class="gb-l">1</span><span class="gb-r">100</span>';
    };
    const reset = () => {
      lo = 1; hi = 100; cnt = 0; hist = []; secret = 1 + rint(100);
      ctl.innerHTML = '';
      ctl.append(el('label', { class: 'ctl' }, 'Mod ', select({ pc: '🤖 Bilgisayar tahmin etsin', you: '🙋 Sen tahmin et' }, mode, v => { mode = v; reset(); })));
      if (mode === 'pc') {
        ctl.append(btn('⬇ Daha küçük', () => answer(-1)), btn('⬆ Daha büyük', () => answer(1)), btn('✅ Bildin!', () => answer(0), 'primary'), btn('↺', reset));
        ask();
      } else {
        ctl.append(input, btn('Tahmin et', you, 'primary'), btn('↺ Yeni sayı', reset));
        msg.innerHTML = '1 ile 100 arasında bir sayı tuttum. Bul bakalım! 🤔';
      }
      drawBar();
    };
    const ask = () => {
      if (lo > hi) { msg.innerHTML = 'Aralık boşaldı… Hile mi yaptın? 😄'; return; }
      g = Math.floor((lo + hi) / 2); cnt++; hist.push(g);
      msg.innerHTML = `${cnt}. tahmin: <b class="big">${g}</b> mi? <span class="mini">(aralık ${lo}–${hi}, ${hi - lo + 1} aday)</span>`;
      drawBar();
    };
    const answer = d => {
      if (d === 0) { msg.innerHTML = `🎉 ${cnt} tahminde buldum! İkili arama ile 1–100 arasında en fazla <b>7</b> tahmin yeter, çünkü 2⁷ = 128 ≥ 100.`; return; }
      if (d < 0) hi = g - 1; else lo = g + 1;
      ask();
    };
    const you = () => {
      const v = parseInt(input.value, 10); if (isNaN(v)) return;
      cnt++; hist.push(v);
      if (v === secret) msg.innerHTML = `🎉 ${cnt} tahminde buldun! ${cnt <= 7 ? 'İkili arama gibi düşündün 💪' : 'İkili arama ile en fazla 7 tahmin yeterdi.'}`;
      else { if (v < secret) lo = Math.max(lo, v + 1); else hi = Math.min(hi, v - 1); msg.innerHTML = `${v} → daha <b>${v < secret ? 'BÜYÜK ⬆' : 'KÜÇÜK ⬇'}</b> <span class="mini">(${cnt}. tahmin)</span>`; }
      input.value = ''; input.focus(); drawBar();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); you(); } });
    root.setAttribute('data-prevent-swipe', '');
    root.append(ctl, msg, bar);
    reset();
  };

  /* ---------- 4) log₂ N ---------- */
  const short = v => (v >= 1e12 ? +(v / 1e12).toFixed(1) + ' trilyon' : v >= 1e9 ? +(v / 1e9).toFixed(1) + ' milyar' : v >= 1e6 ? +(v / 1e6).toFixed(1) + ' milyon' : v >= 1e4 ? +(v / 1e3).toFixed(1) + ' bin' : fmt(Math.ceil(v)));
  D.log2 = function (root) {
    const Ns = [[8, ''], [16, ''], [100, '1–100 tahmin oyunu'], [1000, ''], [1e6, '1 milyon oyuncu'], [1e9, '1 milyar'], [8e9, 'Dünya nüfusu 🌍'], [1e12, '1 trilyon']];
    const out = el('div', { class: 'log-out' });
    const upd = i => {
      const [N, lab] = Ns[i];
      const chain = []; let v = N; while (v > 1) { chain.push(v); v = Math.ceil(v / 2); } chain.push(1);
      out.innerHTML = `<div class="big">N = ${short(N)} ${lab ? '<span class="mini">' + lab + '</span>' : ''}</div>` +
        `<div class="log-chain">${chain.map((x, k) => `<span>${short(x)}</span>${k < chain.length - 1 ? '<i>÷2</i>' : ''}`).join('')}</div>` +
        `<div class="big">${chain.length - 1} kez yarıya böldük → <span class="c-red">log₂ N ≈ ${Math.log2(N).toFixed(1)}</span></div>`;
    };
    root.append(el('div', { class: 'sv-controls' }, slider('N', 0, Ns.length - 1, 2, 1, upd, i => short(Ns[i][0]))), out);
    upd(2);
  };

  /* ---------- 5) Sıralı vs ikili: N büyüdükçe ---------- */
  D.versus = function (root) {
    const out = el('div', { class: 'vs-out' });
    const time = n => { const s = n * 1e-6; return s < 1e-3 ? (s * 1e6).toFixed(0) + ' µs' : s < 1 ? (s * 1e3).toFixed(1) + ' ms' : s < 120 ? s.toFixed(1) + ' sn' : (s / 60).toFixed(1) + ' dk'; };
    const upd = e => {
      const N = Math.round(Math.pow(10, e));
      const lin = N, bin = Math.floor(Math.log2(N)) + 1, maxL = Math.log10(1e9) + 0.3;
      const w = v => Math.max(1.5, (Math.log10(v + 1) / maxL) * 100);
      out.innerHTML = `<div class="big">N = ${short(N)}</div>
        <div class="vs-row"><span>Sıralı arama (en kötü)</span><div class="vs-bar" style="width:${w(lin)}%;background:var(--s2)"></div><b>${short(lin)}</b><i>${time(lin)}</i></div>
        <div class="vs-row"><span>İkili arama (en kötü)</span><div class="vs-bar" style="width:${w(bin)}%;background:var(--s1)"></div><b>${bin}</b><i>${time(bin)}</i></div>
        <p class="mini">Çubuklar logaritmik ölçekte. Süreler: karşılaştırma başına 1 µs varsayımıyla. Oran: ikili arama <b>${short(Math.round(lin / bin))}</b> kat daha az karşılaştırma yapıyor.</p>`;
    };
    root.append(el('div', { class: 'sv-controls' }, slider('N (10ⁿ): n =', 1, 9, 3, 0.5, upd, v => short(Math.round(Math.pow(10, v))))), out);
    upd(3);
  };

  /* ---------- 6) Loot tablosu: ağırlıklı rastgele seçim + ikili arama ---------- */
  D.loot = function (root) {
    const R = [{ n: 'Sıradan', c: '#9a9a9a', w: 60 }, { n: 'Nadir', c: '#2f7bf5', w: 28 }, { n: 'Epik', c: '#a335ee', w: 10 }, { n: 'Efsanevi', c: '#ff8000', w: 2 }];
    const bar = el('div', { class: 'loot-bar' });
    const row = el('div', { class: 'bs-row' });
    const note = el('div', { class: 'sv-note' });
    const hist = el('div', { class: 'loot-hist' });
    let cum = [], total = 0, r = null;
    const recompute = () => { cum = []; total = 0; R.forEach(x => { total += x.w; cum.push(total); }); };
    const drawBar = () => {
      bar.innerHTML = R.map(x => `<div style="flex:${Math.max(x.w, 0.0001)};background:${x.c}" title="${x.n}: ${x.w}">${x.w >= 6 ? x.n : ''}</div>`).join('') +
        (r != null ? `<div class="loot-r" style="left:${(r / total) * 100}%"><span>r = ${r.toFixed(1)}</span></div>` : '');
    };
    const draw = f => { drawBar(); boxRow(row, cum.map(v => +v.toFixed(1)), f); note.textContent = f.note; };
    const fp = new SL.FramePlayer(draw, { speed: 1.2 });
    const roll = () => {
      r = Math.random() * total;
      // ilk cum[i] > r olan i (üst sınır / upper bound)
      let lo = 0, hi = cum.length - 1; const frames = [{ lo, hi, note: `r = ${r.toFixed(1)} (0…${total} arası rastgele). Kümülatif dizide r'den BÜYÜK ilk değeri arıyoruz.` }];
      while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (cum[mid] > r) { frames.push({ lo, hi, mid, note: `cum[${mid}] = ${cum[mid]} > ${r.toFixed(1)} → cevap mid ya da solunda: hi = ${mid}` }); hi = mid; }
        else { frames.push({ lo, hi, mid, note: `cum[${mid}] = ${cum[mid]} ≤ ${r.toFixed(1)} → cevap sağda: lo = ${mid + 1}` }); lo = mid + 1; }
      }
      frames.push({ found: lo, note: `🎁 Sandıktan çıkan: ${R[lo].n.toUpperCase()}! (indeks ${lo})` });
      fp.load(frames); fp.play();
    };
    const many = n => {
      const cnt = R.map(() => 0);
      for (let k = 0; k < n; k++) {
        const x = Math.random() * total; let lo = 0, hi = cum.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] > x) hi = mid; else lo = mid + 1; }
        cnt[lo]++;
      }
      hist.innerHTML = `<div class="mini">${fmt(n)} sandık açıldı:</div>` + R.map((x, i) => `<div class="lh-row"><span style="color:${x.c}">■</span> ${x.n}<div class="lh-bar"><div style="width:${(cnt[i] / n) * 100}%;background:${x.c}"></div></div><b>%${((cnt[i] / n) * 100).toFixed(1)}</b> <i>beklenen %${((x.w / total) * 100).toFixed(1)}</i></div>`).join('');
    };
    const sliders = el('div', { class: 'sv-controls' });
    R.forEach(x => sliders.append(slider(x.n, 0, 100, x.w, 1, v => { x.w = v; recompute(); r = null; fp.load([{ note: 'Ağırlıklar değişti. Kümülatif dizi yeniden hesaplandı.' }]); })));
    root.setAttribute('data-prevent-swipe', '');
    root.append(sliders, el('div', { class: 'sv-controls' }, btn('🎁 Bir sandık aç (adım adım)', roll, 'primary'), btn('📦 10.000 sandık aç', () => many(10000))),
      bar, row, SL.transport(fp, { min: 0.3, max: 8 }), note, hist);
    recompute(); fp.load([{ note: 'Kümülatif (birikimli) ağırlıklar: her kutu = o nadirliğe kadar olan toplam. “Bir sandık aç”a basın.' }]);
    return { stop: () => fp.pause() };
  };

  /* ---------- 7) XP → seviye tablosu ---------- */
  D.xp = function (root) {
    const th = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200, 11000];
    let xp = 2700;
    const row = el('div', { class: 'bs-row xp-row' });
    const note = el('div', { class: 'sv-note' });
    const big = el('div', { class: 'big' });
    const draw = f => { boxRow(row, th, f); note.textContent = f.note; };
    const fp = new SL.FramePlayer(draw, { speed: 1.2 });
    const plan = () => {
      // floor: th[i] <= xp olan EN BÜYÜK i
      let lo = 0, hi = th.length - 1, ans = 0;
      const frames = [{ lo, hi, note: `XP = ${xp}: eşiği ${xp}'i geçmeyen EN BÜYÜK seviyeyi arıyoruz (floor)` }];
      while (lo <= hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (th[mid] <= xp) { ans = mid; frames.push({ lo, hi, mid, note: `eşik[${mid}] = ${th[mid]} ≤ ${xp} → seviye ${mid + 1} olabilir, daha yükseğine bak: lo = ${mid + 1}` }); lo = mid + 1; }
        else { frames.push({ lo, hi, mid, note: `eşik[${mid}] = ${th[mid]} > ${xp} → çok yüksek: hi = ${mid - 1}` }); hi = mid - 1; }
      }
      frames.push({ found: ans, note: `Sonuç: seviye ${ans + 1} (eşik ${th[ans]}). Bir sonraki seviyeye ${ans + 1 < th.length ? th[ans + 1] - xp + ' XP' : '— (maks seviye)'} kaldı.` });
      big.innerHTML = `XP = <b>${fmt(xp)}</b> → <span class="c-green">Seviye ${ans + 1}</span>`;
      fp.load(frames);
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('XP', 0, 12000, xp, 50, v => { xp = v; plan(); }, v => fmt(v)), btn('▶ Adım adım göster', () => fp.play(), 'primary')),
      big, row, SL.transport(fp, { min: 0.3, max: 8 }), note);
    plan();
    return { stop: () => fp.pause() };
  };

  /* ---------- 8) Tünelleme ve ikiye bölme (bisection) ile çarpışma anı ---------- */
  D.bisect = function (root) {
    const W = 1180, H = 260, WALL = 700, WW = 10, X0 = 60;
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    let v = 230;
    const note = el('div', { class: 'sv-note' });
    const draw = f => {
      const t = T();
      ctx.clearRect(0, 0, W, H);
      // zaman ekseni
      ctx.fillStyle = t.ink; ctx.font = '600 13px "JetBrains Mono"'; ctx.textAlign = 'center';
      ctx.fillStyle = t.dark ? '#3a2a1a' : '#c9a27a'; ctx.fillRect(WALL, 30, WW, 150);
      ctx.fillStyle = t.muted; ctx.fillText('duvar', WALL + WW / 2, 22);
      const xAt = tt => X0 + v * tt;
      // kare kare konumlar
      for (let k = 0; k <= 5; k++) {
        const x = xAt(k); if (x > W - 10) break;
        const passed = x + 10 >= WALL;
        ctx.globalAlpha = f.frames ? 1 : 0.3;
        ctx.fillStyle = passed ? t.red : t.blue; ctx.beginPath(); ctx.arc(x, 105, 10, 0, 7); ctx.fill();
        ctx.fillStyle = t.ink; ctx.fillText('kare ' + k, x, 140);
        ctx.globalAlpha = 1;
      }
      // ikiye bölme aralığı
      if (f.lo != null) {
        const xl = xAt(f.lo), xh = xAt(f.hi);
        ctx.fillStyle = t.dark ? 'rgba(255,194,74,0.18)' : 'rgba(194,124,0,0.14)'; ctx.fillRect(xl, 60, xh - xl, 90);
        ctx.strokeStyle = t.amber; ctx.lineWidth = 2; ctx.strokeRect(xl, 60, xh - xl, 90);
        if (f.mid != null) {
          const xm = xAt(f.mid); ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(xm, 105, 10, 0, 7); ctx.fill();
          ctx.fillStyle = t.ink; ctx.fillText('t=' + f.mid.toFixed(4), xm, 185);
        }
      }
      if (f.hit != null) { const xh = xAt(f.hit); ctx.strokeStyle = t.green; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(xh, 105, 13, 0, 7); ctx.stroke(); ctx.fillStyle = t.green; ctx.fillText('çarpışma t ≈ ' + f.hit.toFixed(4), xh, 215); }
      // zaman çizgisi
      ctx.strokeStyle = t.rule; ctx.beginPath(); ctx.moveTo(X0, 240); ctx.lineTo(W - 20, 240); ctx.stroke();
      ctx.fillStyle = t.muted; ctx.textAlign = 'left'; ctx.fillText(`hız: ${v} piksel/kare · duvar kalınlığı: ${WW} piksel`, X0, 255);
      note.textContent = f.note;
    };
    const fp = new SL.FramePlayer(draw, { speed: 1 });
    const plan = () => {
      const xAt = tt => X0 + v * tt;
      const touches = tt => xAt(tt) + 10 >= WALL;   // mermi ön kenarı duvara ulaştı mı?
      let k = 0; while (!touches(k + 1)) k++;
      const inside = x => x + 10 >= WALL && x - 10 <= WALL + WW;
      const frames = [{ frames: true, note: `Kare kare hareket: mermi her karede ${v} piksel ilerliyor.` }];
      frames.push({ frames: true, note: `Kare ${k}: duvarın solunda. Kare ${k + 1}: ${inside(xAt(k + 1)) ? 'duvarın içinde → çarpışma görüldü.' : 'duvarın SAĞINDA! Hiçbir karede duvarla çakışmadı → TÜNELLEME 😱'}` });
      let lo = k, hi = k + 1;
      frames.push({ frames: true, lo, hi, note: `Çözüm: çarpışma anı [${lo}, ${hi}] arasında. İkiye bölme (bisection) ile daraltalım.` });
      for (let s = 0; s < 10; s++) {
        const mid = (lo + hi) / 2;
        const tch = touches(mid);
        frames.push({ frames: true, lo, hi, mid, note: `adım ${s + 1}: t = ${mid.toFixed(4)} anında mermi duvara ${tch ? 'DEĞMİŞ → çarpışma daha önce: hi = mid' : 'henüz değmemiş → çarpışma daha sonra: lo = mid'}` });
        if (tch) hi = mid; else lo = mid;
      }
      frames.push({ frames: true, hit: hi, note: `10 adımda çarpışma anı 1/1024 kare hassasiyetle bulundu: t ≈ ${hi.toFixed(4)}. Fizik motorları buna “sürekli çarpışma tespiti” der.` });
      fp.load(frames);
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('Mermi hızı (piksel/kare)', 60, 400, v, 10, x => { v = x; plan(); })), c, SL.transport(fp, { min: 0.3, max: 6 }), note);
    SL.onTheme(() => fp.render()); plan();
    return { stop: () => fp.pause() };
  };

  /* ---------- .searchlab — ikili arama kod laboratuvarı ---------- */
  const PY_SEARCH = `
import json
_probes = []
class _Dizi(list):
    def __getitem__(self, i):
        if isinstance(i, int):
            if len(_probes) > 5000:
                raise RuntimeError("Dizi 5000'den fazla kez okundu — sonsuz döngü olabilir mi?")
            _probes.append(i if i >= 0 else len(self) + i)
        return list.__getitem__(self, i)
def _run_one(arr, key):
    _probes.clear()
    try:
        r = search(_Dizi(arr), key)
        return [r, list(_probes), None]
    except BaseException as e:
        return [None, list(_probes), type(e).__name__ + ": " + str(e)]
def _run_all(cases):
    return json.dumps([_run_one(a, k) for a, k in cases])
`;
  SL.SearchLab = function (root) {
    const d = root.dataset, task = d.task || 'find';
    const shell = SL.labShell(root);
    let N = +(d.n || 15), a = [], key = null;
    const row = el('div', { class: 'bs-row lab-row' });
    const note = el('div', { class: 'sv-note' });
    const keyIn = el('input', { type: 'text', class: 'key-in', size: 4 });
    const fp = new SL.FramePlayer(f => { boxRow(row, a, f); note.textContent = f.note; }, { speed: 2 });
    const gen = () => { a = sortedDistinct(N); keyIn.value = Math.random() < 0.7 ? a[rint(N)] : 1 + rint(99); };
    const expected = (arr, k) => {
      if (task === 'lower') { let i = 0; while (i < arr.length && arr[i] < k) i++; return i; }
      return arr.indexOf(k);
    };
    const correct = (arr, k, r) => {
      if (task === 'lower') return r === expected(arr, k);
      const e = expected(arr, k);
      return e < 0 ? r === -1 : (Number.isInteger(r) && arr[r] === k);
    };
    const cases = () => {
      const out = [[[], 5], [[7], 7], [[7], 3], [[7], 9], [[1, 3], 3], [[1, 3], 1], [[1, 3], 2]];
      for (let t = 0; t < 250; t++) {
        const n = 1 + rint(40), arr = sortedDistinct(n, 120);
        out.push([arr, Math.random() < 0.6 ? arr[rint(n)] : rint(122)]);
      }
      return out;
    };
    const framesFor = (probes, r, err) => {
      const fr = [{ note: `Aranan: ${key}. Kodun dizinin hangi elemanlarına baktığını adım adım izleyin.` }];
      probes.forEach((i, k) => fr.push({ mid: i, midName: '👀', seen: probes.slice(0, k), note: `${k + 1}. okuma: a[${i}] = ${a[i] !== undefined ? a[i] : '— (dizi dışı!)'}` }));
      fr.push({ seen: probes, found: Number.isInteger(r) && r >= 0 && r < a.length ? r : undefined,
        note: err ? '⚠️ ' + err : `Sonuç: ${r} — ${probes.length} okuma (beklenen ${expected(a, key)})` });
      return fr;
    };
    const report = (results, cs) => {
      let fail = null, maxRatio = 0;
      results.forEach(([r, probes, err], i) => {
        const [arr, k] = cs[i];
        if (!fail && (err || !correct(arr, k, r))) fail = { arr, k, r, err };
        if (arr.length > 8) maxRatio = Math.max(maxRatio, probes.length / (Math.floor(Math.log2(arr.length)) + 1));
      });
      const show = r => (r === null || r === undefined ? (shell.lang === 'python' ? 'None' : String(r)) : r);
      if (fail) return shell.setMsg('err', `❌ Test başarısız: a = [${fail.arr.join(', ')}], aranan ${fail.k} → ${fail.err ? 'hata: ' + fail.err : 'senin cevabın ' + show(fail.r) + ', beklenen ' + expected(fail.arr, fail.k)}`);
      shell.setMsg(maxRatio > 2.5 ? '' : 'ok', `✅ ${cs.length}/${cs.length} test geçti.` + (maxRatio > 2.5 ? ` Ama ⚠️ bazı aramalar lg N’in ${maxRatio.toFixed(0)} katı kadar okuma yaptı — bu gerçekten ikili arama mı?` : ' Okuma sayıları ~lg N: gerçek bir ikili arama 👍'));
    };
    shell.onRun = async () => {
      fp.pause(); shell.clearOut();
      key = parseInt(keyIn.value, 10); if (isNaN(key)) key = a[0];
      const code = shell.cm.getValue();
      const cs = cases();
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_SEARCH); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_cases', py.toPy([[a, key]].concat(cs)));
        let res;
        try { res = JSON.parse(py.runPython('_run_all(_cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        const [r0, p0, e0] = res[0];
        fp.load(framesFor(p0, r0, e0 && SL.pyErrorText(e0)));
        report(res.slice(1).map(([r, p, e]) => [r, p, e && SL.pyErrorText(e)]), cs);
        return;
      }
      let fn;
      try {
        fn = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof search !== 'function') throw new Error(\"Kodda 'search(a, key)' fonksiyonu bulunamadı.\"); return search;")(shell.print, SL.makeGuard(200000));
      } catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      const runOne = (arr, k) => {
        const probes = [];
        const prox = new Proxy(arr.slice(), { get(t, p) { if (typeof p === 'string' && /^-?\d+$/.test(p)) { probes.push(+p); if (probes.length > 5000) throw new Error('Dizi 5000’den fazla kez okundu — sonsuz döngü olabilir mi?'); } return t[p]; } });
        try { return [fn(prox, k), probes, null]; } catch (e) { return [null, probes, SL.jsErrorText(e)]; }
      };
      const [r0, p0, e0] = runOne(a, key);
      fp.load(framesFor(p0, r0, e0));
      report(cs.map(([arr, k]) => runOne(arr, k)), cs);
    };
    keyIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); shell.run(); } });
    shell.right.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Aranan ', keyIn), btn('🎲 Yeni dizi', () => { gen(); shell.run(); })),
    row, SL.transport(fp, { min: 0.3, max: 8 }), note, shell.msg, shell.out);
    gen();
    if (shell.lang !== 'python') shell.run();
    else { fp.load([{ note: 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).' }]); }
    return { stop: () => fp.pause(), refresh: shell.refresh };
  };
  SL.register('.searchlab', SL.SearchLab);
})();
