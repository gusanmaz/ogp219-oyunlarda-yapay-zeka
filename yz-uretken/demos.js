/* "Üretken YZ" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS;
  const T = () => SL.theme();
  const RNG = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  /* ================= oyuncak difüzyon: 2B nokta bulutları ================= */
  // “veri kümesi”: birkaç şeklin noktaları (yıldız, kalp, halka) — koordinatlar yaklaşık [-1, 1]
  const SHAPES = (() => {
    const star = [], heart = [], ring = [];
    for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2, k = Math.floor((i / 120) * 10), r = k % 2 ? 0.42 : 0.95; const a0 = (k / 10) * Math.PI * 2, a1 = ((k + 1) / 10) * Math.PI * 2, t = (a - a0) / (a1 - a0), r1 = (k + 1) % 2 ? 0.42 : 0.95; const rr = r + (r1 - r) * t; star.push([Math.cos(a - Math.PI / 2) * rr * 0.9, Math.sin(a - Math.PI / 2) * rr * 0.9]); }
    for (let i = 0; i < 120; i++) { const t = (i / 120) * Math.PI * 2; heart.push([0.055 * 16 * Math.pow(Math.sin(t), 3), -0.055 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 0.05]); }
    for (let i = 0; i < 120; i++) { const t = (i / 120) * Math.PI * 2, r = i % 2 ? 0.85 : 0.55; ring.push([Math.cos(t) * r, Math.sin(t) * r]); }
    return { star, heart, ring };
  })();
  SL.GEN_SHAPES = SHAPES;
  // ideal (en iyi) gürültü giderici: x_t verildiğinde E[x_0 | x_t] — veri noktalarının Gauss ağırlıklı ortalaması
  const idealDenoise = (x, y, sigma, data) => { let sw = 0, sx = 0, sy = 0; const s2 = 2 * sigma * sigma; let mn = Infinity; const ds = data.map(([a, b]) => { const d = ((x - a) ** 2 + (y - b) ** 2) / s2; if (d < mn) mn = d; return d; }); data.forEach(([a, b], i) => { const w = Math.exp(-(ds[i] - mn)); sw += w; sx += w * a; sy += w * b; }); return [sx / sw, sy / sw]; };
  SL.GEN_idealDenoise = idealDenoise;
  const SIG = k => 0.02 * Math.pow(60, k);   // k ∈ [0,1] → σ ∈ [0.02, 1.2]
  D.diffusion = function (root) {
    const W = 720, H = 330, N = 260, STEPS = 40;
    let prompt = 'star', mode = 'gen', pts = [], step = 0, timer = null, seed = 1, show = true;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const data = () => prompt === 'all' ? [...SHAPES.star, ...SHAPES.heart, ...SHAPES.ring] : SHAPES[prompt];
    const reset = () => { const r = RNG(seed); step = 0; if (mode === 'gen') pts = Array.from({ length: N }, () => [gauss(r) * SIG(1), gauss(r) * SIG(1)]); else { const d = data(); pts = Array.from({ length: N }, (_, i) => d[i % d.length].slice()); } };
    const tick = () => {
      const r = RNG(seed * 977 + step);
      if (mode === 'gen') {   // ters süreç: σ büyükten küçüğe; her adımda tahmini temiz noktaya doğru yürü, biraz gürültü ekle
        if (step >= STEPS) return false;
        const s = SIG(1 - step / STEPS), sn = SIG(1 - (step + 1) / STEPS), d = data();
        // deterministik (DDIM benzeri) adım: tahmini temiz noktaya, gürültü oranı σ'/σ kadar yaklaş
        const k = sn / s;
        pts = pts.map(([x, y]) => { const [mx, my] = idealDenoise(x, y, s, d); return [mx + (x - mx) * k, my + (y - my) * k]; });
      } else {               // ileri süreç: her adımda biraz daha gürültü
        if (step >= STEPS) return false;
        const s = SIG(step / STEPS), sn = SIG((step + 1) / STEPS), add = Math.sqrt(Math.max(0, sn * sn - s * s));
        pts = pts.map(([x, y]) => [x + gauss(r) * add, y + gauss(r) * add]);
      }
      step++; return true;
    };
    const P = ([x, y]) => [W / 2 - 120 + x * 130, H / 2 + y * 130];
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      if (show) { ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'; data().forEach(p => { const [x, y] = P(p); ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); }); }
      ctx.fillStyle = mode === 'gen' ? t.purple : t.red; pts.forEach(p => { const [x, y] = P(p); if (x < -5 || x > W + 5 || y < -5 || y > H + 5) return; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); });
      const s = mode === 'gen' ? SIG(1 - step / STEPS) : SIG(step / STEPS);
      const bx = W - 220; ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; ctx.fillRect(bx, 20, 200, 20);
      ctx.fillStyle = t.amber; ctx.fillRect(bx, 20, 200 * (step / STEPS), 20);
      SL.drawLabel(ctx, `adım ${step}/${STEPS}`, bx + 100, 30, t.ink, { size: 11 });
      SL.drawLabel(ctx, `gürültü seviyesi σ ≈ ${s.toFixed(2)}`, bx + 100, 56, t.muted, { size: 11 });
      SL.drawLabel(ctx, mode === 'gen' ? 'ÜRETİM: gürültü → şekil' : 'EĞİTİM VERİSİ BOZULUYOR: şekil → gürültü', bx + 100, 84, mode === 'gen' ? t.purple : t.red, { size: 11 });
      info.innerHTML = mode === 'gen'
        ? `Her nokta saf gürültüyle başlıyor. Her adımda “gürültü giderici”, noktanın <b>temiz hâlini tahmin ediyor</b> ve noktayı o yöne biraz kaydırıyor; gürültü seviyesi azaldıkça şekil beliriyor. “İstem” (${({ star: 'yıldız', heart: 'kalp', ring: 'halka', all: 'hepsi' })[prompt]}) hangi veriye göre tahmin yapılacağını belirliyor: koşullu üretim.`
        : 'İleri süreç: eğitim verisine adım adım gürültü eklenir. Model, her gürültü seviyesinde “orijinal neydi?” sorusunu cevaplamayı öğrenir. Üretim bunun tersidir.';
    };
    const play = () => { if (timer) { clearInterval(timer); timer = null; return; } timer = setInterval(() => { if (!tick()) { clearInterval(timer); timer = null; } draw(); }, 90); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yön: ', select({ gen: 'üret (gürültü → şekil)', fwd: 'boz (şekil → gürültü)' }, mode, v => { mode = v; reset(); draw(); })),
      el('label', { class: 'ctl' }, '“İstem”: ', select({ star: 'yıldız', heart: 'kalp', ring: 'halka', all: 'hepsi (koşulsuz)' }, prompt, v => { prompt = v; reset(); draw(); })),
      btn('1 adım', () => { tick(); draw(); }), btn('▶ / ⏸ oynat', play), btn('↺ yeni gürültü', () => { seed++; reset(); draw(); }),
      el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { show = e.target.checked; draw(); } }); x.checked = true; return x; })(), ' veriyi göster')), C, info);
    reset(); draw(); SL.onTheme(draw);
    return { stop() { if (timer) { clearInterval(timer); timer = null; } } };
  };

  /* ================= oyuncak dünya modeli ================= */
  const MAZE = ['############', '#....#.....#', '#.##.#.###.#', '#.#........#', '#.#.####.#.#', '#...#..#.#.#', '###.#..#...#', '#.......##.#', '############'];
  const ACTS = [[0, -1, '↑'], [1, 0, '→'], [0, 1, '↓'], [-1, 0, '←']];
  const realStep = ([x, y], a) => { const nx = x + ACTS[a][0], ny = y + ACTS[a][1]; return MAZE[ny][nx] === '#' ? [x, y] : [nx, ny]; };
  D.worldmodel = function (root) {
    const W = 720, H = 300, cs = 26;
    let nData = 300, model, real = [1, 1], dream = [1, 1], hist = [], errs = 0, seed = 3;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const train = () => {   // rastgele oyun kayıtlarından (durum, eylem) → sonraki durum tablosu
      const r = RNG(seed); model = new Map(); let s = [1, 1];
      for (let i = 0; i < nData; i++) { const a = Math.floor(r() * 4), ns = realStep(s, a); model.set(s + '|' + a, ns); s = ns; if (r() < 0.02) s = [1, 1]; }
    };
    // model: gördüğü (durum, eylem) için ezberlediğini söyler; görmediyse “genelde ne olur?” diye tahmin eder: o yöne bir kare git (duvarı bilmez!)
    const dreamStep = (s, a) => model.get(s + '|' + a) || [s[0] + ACTS[a][0], s[1] + ACTS[a][1]];
    const act = a => { real = realStep(real, a); dream = dreamStep(dream, a); hist.push(a); if (real[0] !== dream[0] || real[1] !== dream[1]) errs++; draw(); };
    const drawMaze = (ox, pos, label, col, t, isDream) => {
      MAZE.forEach((row, y) => [...row].forEach((ch, x) => { ctx.fillStyle = ch === '#' ? (t.dark ? '#4a4f63' : '#3d4255') : (t.dark ? '#2b2f40' : '#efe9dc'); ctx.fillRect(ox + x * cs, 30 + y * cs, cs - 1, cs - 1); }));
      const inWall = MAZE[pos[1]] && MAZE[pos[1]][pos[0]] === '#';
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ox + pos[0] * cs + cs / 2, 30 + pos[1] * cs + cs / 2, 9, 0, 7); ctx.fill();
      if (isDream && inWall) { ctx.strokeStyle = t.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ox + pos[0] * cs + cs / 2, 30 + pos[1] * cs + cs / 2, 13, 0, 7); ctx.stroke(); }
      SL.drawLabel(ctx, label, ox + 6 * cs, 14, col, { size: 12 });
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      drawMaze(20, real, 'GERÇEK OYUN (kurallı motor)', t.blue, t, false);
      drawMaze(380, dream, 'DÜNYA MODELİ (öğrenilmiş “rüya”)', t.purple, t, true);
      const inWall = MAZE[dream[1]] && MAZE[dream[1]][dream[0]] === '#';
      info.innerHTML = `Model ${nData} adımlık rastgele oyun kaydıyla eğitildi ve ${model.size} farklı (durum, eylem) çifti gördü. Ok tuşlarıyla (aşağıdaki düğmeler) iki dünyayı aynı anda oynatın. Hamle sayısı ${hist.length}, ayrışma ${errs}. ${inWall ? '<b>Model duvarın içinden geçti!</b> Bu durumu hiç görmediği için “genelde bir kare ilerlenir” diye genelledi: halüsinasyon.' : ''} Ayrışınca hata <b>birikir</b>: model artık kendi hatalı tahmininin üzerine tahmin yürütüyor.`;
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      ...ACTS.map((a, i) => btn(a[2], () => act(i))),
      slider('eğitim verisi (adım)', 50, 5000, nData, 50, v => { nData = v; train(); real = [1, 1]; dream = [1, 1]; hist = []; errs = 0; draw(); }),
      btn('🎲 rastgele 20 hamle', () => { const r = RNG(Date.now() & 0xffff); for (let i = 0; i < 20; i++) act(Math.floor(r() * 4)); }),
      btn('↺ baştan', () => { real = [1, 1]; dream = [1, 1]; hist = []; errs = 0; draw(); })), C, info);
    train(); draw(); SL.onTheme(draw);
  };

  /* ================= Markov melodi üreteci (Web Audio) ================= */
  const NOTES = { Do: 261.63, Re: 293.66, Mi: 329.63, Fa: 349.23, Sol: 392.0, La: 440.0, Si: 493.88, 'Do²': 523.25 };
  const SONG = 'Do Do Sol Sol La La Sol Fa Fa Mi Mi Re Re Do Sol Sol Fa Fa Mi Mi Re Sol Sol Fa Fa Mi Mi Re Do Do Sol Sol La La Sol Fa Fa Mi Mi Re Re Do'.split(' ');
  const SONG2 = 'Mi Re Do Re Mi Mi Mi Re Re Re Mi Sol Sol Mi Re Do Re Mi Mi Mi Mi Re Re Mi Re Do'.split(' ');
  D.markov = function (root) {
    let corpus = 'both', temp = 1, out = [], ac = null;
    const view = el('div', { class: 'mk-out' }), table = el('div', { class: 'mk-t' }), info = el('div', { class: 'sv-note' });
    const seqs = () => corpus === 'a' ? [SONG] : corpus === 'b' ? [SONG2] : [SONG, SONG2];
    const counts = () => { const c = {}; seqs().forEach(s => { for (let i = 0; i + 1 < s.length; i++) { (c[s[i]] = c[s[i]] || {})[s[i + 1]] = (c[s[i]][s[i + 1]] || 0) + 1; } }); return c; };
    const gen = () => { const c = counts(); let cur = 'Do'; out = [cur]; for (let i = 0; i < 15; i++) { const nx = c[cur]; if (!nx) break; const ks = Object.keys(nx), ws = ks.map(k => Math.pow(nx[k], 1 / temp)), tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot, k = 0; while (k < ks.length - 1 && r > ws[k]) { r -= ws[k]; k++; } cur = ks[k]; out.push(cur); } draw(); };
    const play = () => {
      try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      const t0 = ac.currentTime + 0.05;
      out.forEach((n, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = NOTES[n]; g.gain.setValueAtTime(0, t0 + i * 0.3); g.gain.linearRampToValueAtTime(0.25, t0 + i * 0.3 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.3 + 0.28); o.connect(g).connect(ac.destination); o.start(t0 + i * 0.3); o.stop(t0 + i * 0.3 + 0.3); });
    };
    const draw = () => {
      view.innerHTML = out.length ? out.map(n => `<span class="mk-n">${n}</span>`).join('') : '<i>“üret”e basın</i>';
      const c = counts();
      table.innerHTML = '<table class="mk-tab"><tr><th>şu nota</th><th>sonra gelenler (kaç kez)</th></tr>' + Object.keys(c).map(k => `<tr><td><b>${k}</b></td><td>${Object.entries(c[k]).sort((a, b) => b[1] - a[1]).map(([n, v]) => `${n} ×${v}`).join(' · ')}</td></tr>`).join('') + '</table>';
      info.innerHTML = 'Model, eğitim melodilerinde hangi notadan sonra hangisinin kaç kez geldiğini biliyor (Y14’teki minicik dil modeliyle aynı fikir, kelime yerine nota). Müzik üreten büyük modeller (Suno, MusicGen, Stable Audio) ses dalgasını ya da onun sıkıştırılmış kodlarını aynı “sıradakini tahmin et” ya da difüzyon mantığıyla üretir.';
    };
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Eğitim: ', select({ a: 'melodi A (Twinkle)', b: 'melodi B (Mary)', both: 'ikisi birden' }, corpus, v => { corpus = v; out = []; draw(); })),
      slider('sıcaklık', 0.2, 3, temp, 0.1, v => { temp = v; }), btn('🎼 üret', gen), btn('🔊 çal', play), btn('▶ eğitim melodisini çal', () => { out = seqs()[0].slice(0, 16); draw(); play(); })),
      el('div', { class: 'cols' }, view, table), info);
    draw();
  };

  /* ================= gömme benzerliği: istemle varlık arama ================= */
  // elle verilmiş küçük “anlam vektörleri”: [ateş, buz, orman, metal, sevimli, karanlık]
  const ASSETS = [['kızgın lav taşı', [0.9, 0, 0.1, 0.2, 0, 0.5]], ['buz kılıcı', [0, 0.9, 0, 0.8, 0.1, 0.2]], ['yosunlu kütük', [0, 0, 0.9, 0, 0.3, 0.2]], ['ejderha zırhı', [0.6, 0, 0, 0.9, 0, 0.6]], ['kardan adam', [0, 0.8, 0, 0, 0.9, 0]], ['peri mantarı', [0, 0, 0.7, 0, 0.8, 0.1]], ['lanetli fener', [0.4, 0, 0, 0.5, 0, 0.9]], ['buzul mağarası', [0, 0.9, 0, 0, 0, 0.6]]];
  const AX = ['ateş', 'buz', 'orman', 'metal', 'sevimli', 'karanlık'];
  const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return na && nb ? d / Math.sqrt(na * nb) : 0; };
  D.embed = function (root) {
    const q = [0.2, 0.1, 0.1, 0.8, 0, 0.7];
    const list = el('div', { class: 'em-list' }), info = el('div', { class: 'sv-note' });
    const draw = () => {
      const sc = ASSETS.map(([n, v]) => [n, cos(q, v), v]).sort((a, b) => b[1] - a[1]);
      list.innerHTML = sc.map(([n, s, v], i) => `<div class="em-row ${i < 2 ? 'em-top' : ''}"><span class="em-n">${n}</span><span class="lm-bar"><span style="width:${Math.max(0, s) * 100}%"></span></span><span class="em-s">${s.toFixed(2)}</span></div>`).join('');
      info.innerHTML = `İstem vektörü: [${q.map((x, i) => AX[i] + ' ' + x.toFixed(1)).join(', ')}]. Her varlık bir vektör; benzerlik = aradaki açının kosinüsü. Gerçek sistemlerde (CLIP gibi) bu vektörleri bir model üretir ve yüzlerce boyutu vardır; görüntü üretiminde istem metni, difüzyon modeline böyle bir vektör olarak verilir.`;
    };
    root.append(el('div', { class: 'sv-controls' }, ...AX.map((ax, i) => slider(ax, 0, 1, q[i], 0.1, v => { q[i] = v; draw(); }))), list, info);
    draw();
  };

  /* ---------- simlab: gürültü giderici ---------- */
  SL.SIMLABS.denoise = function (box, api) {
    const W = 520, H = 300, N = 220, STEPS = 40, DATA = SHAPES.heart;
    let fn = null, pts = [], step = 0, seed = 1, hold = 0;
    const fresh = () => { const r = RNG(seed++); pts = Array.from({ length: N }, () => [gauss(r) * SIG(1), gauss(r) * SIG(1)]); step = 0; hold = 0; };
    fresh();
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt, w) {
        if (!fn) return;
        if (step >= STEPS) { hold += dt; if (hold > 1.5) fresh(); return; }
        if ((w.frame % 3) !== 0) return;
        const s = SIG(1 - step / STEPS), sn = SIG(1 - (step + 1) / STEPS), k = sn / s;
        for (let i = 0; i < pts.length; i++) {
          let m; try { m = fn(pts[i][0], pts[i][1], s); } catch (e) { w.pause(); api.setMsg('err', '⚠️ denoise hata verdi: ' + SL.jsErrorText(e)); return; }
          if (!Array.isArray(m) || m.length !== 2 || !m.every(Number.isFinite)) { w.pause(); api.setMsg('err', '⚠️ denoise [x, y] biçiminde iki sayı döndürmeli.'); return; }
          pts[i] = [m[0] + (pts[i][0] - m[0]) * k, m[1] + (pts[i][1] - m[1]) * k];
        }
        step++;
      },
      render(ctx, w, t) {
        const P = ([x, y]) => [W / 2 + x * 120, H / 2 + y * 120];
        ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'; DATA.forEach(p => { const [x, y] = P(p); ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); });
        ctx.fillStyle = t.purple; pts.forEach(p => { const [x, y] = P(p); ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); });
        SL.drawLabel(ctx, `adım ${step}/${STEPS}`, 10, 14, t.muted, { size: 11, align: 'left' });
      },
      reset() { fresh(); }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w, scope: { DATA },
      setFns(f) { fn = f.denoise; fresh(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try {
          for (const [x, y, s] of [[0, 0, 0.5], [0.3, -0.2, 0.1], [1.5, 1.5, 1], [-0.4, 0.6, 0.05], [0.1, 0.1, 0.02]]) {
            const got = mod.denoise(x, y, s), exp = idealDenoise(x, y, s, DATA);
            if (!Array.isArray(got) || Math.abs(got[0] - exp[0]) > 1e-6 || Math.abs(got[1] - exp[1]) > 1e-6) return { ok: false, msg: `❌ denoise(${x}, ${y}, ${s}) → ${JSON.stringify(got)}; beklenen [${exp[0].toFixed(4)}, ${exp[1].toFixed(4)}]. Küçük σ’da exp(...) sıfıra yuvarlanıyorsa: en küçük uzaklığı çıkarın.` };
          }
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Gürültü giderici doğru. Sağda saf gürültü, sizin fonksiyonunuzla adım adım kalbe dönüşüyor.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  SL.AILABS.addnoise = {
    fn: 'add_noise', jsFn: 'addNoise', tol: 1e-9,
    ref: (x0, eps, ab) => x0.map((v, i) => Math.sqrt(ab) * v + Math.sqrt(1 - ab) * eps[i]),
    cases: () => { const cs = [[[1, 0], [0, 1], 1], [[1, 0], [0, 1], 0], [[1, 2, 3], [0.5, -0.5, 1], 0.25], [[], [], 0.5]]; for (let i = 0; i < 8; i++) { const n = 1 + Math.floor(Math.random() * 5); cs.push([Array.from({ length: n }, () => Math.round((Math.random() * 2 - 1) * 100) / 100), Array.from({ length: n }, () => Math.round((Math.random() * 2 - 1) * 100) / 100), [0.1, 0.5, 0.9][i % 3]]); } return cs; },
    show: (x, e, a) => `x0 = ${JSON.stringify(x)}, ε = ${JSON.stringify(e)}, ᾱ = ${a}`,
    hint: () => 'Her eleman için: √ᾱ · x0[i] + √(1 − ᾱ) · ε[i]. ᾱ = 1: hiç gürültü yok; ᾱ = 0: tamamen gürültü.'
  };
  SL.AILABS.cosine = {
    fn: 'cosine', jsFn: 'cosine', tol: 1e-9,
    ref: (a, b) => cos(a, b),
    cases: () => { const cs = [[[1, 0], [0, 1]], [[1, 2, 3], [2, 4, 6]], [[1, 0], [-1, 0]], [[0, 0], [1, 1]], [[3, 4], [4, 3]]]; for (let i = 0; i < 8; i++) { const n = 2 + Math.floor(Math.random() * 5); cs.push([Array.from({ length: n }, () => Math.round((Math.random() * 2 - 1) * 10) / 10), Array.from({ length: n }, () => Math.round((Math.random() * 2 - 1) * 10) / 10)]); } return cs; },
    show: (a, b) => `a = ${JSON.stringify(a)}, b = ${JSON.stringify(b)}`,
    hint: () => 'cos = (a · b) / (|a| · |b|). Vektörlerden biri sıfırsa 0 döndürün (sıfıra bölme!).'
  };
  SL.AILABS.nextnote = {
    fn: 'most_likely_next', jsFn: 'mostLikelyNext',
    ref: (seq, note) => { const c = new Map(); for (let i = 0; i + 1 < seq.length; i++) if (seq[i] === note) c.set(seq[i + 1], (c.get(seq[i + 1]) || 0) + 1); let best = null, bv = 0; for (const [k, v] of c) if (v > bv) { bv = v; best = k; } return best; },
    cases: () => [[SONG, 'Do'], [SONG, 'Sol'], [SONG, 'Re'], [SONG2, 'Mi'], [SONG2, 'Sol'], [['A', 'B', 'A', 'C', 'A', 'B'], 'A'], [['A', 'B'], 'B'], [['X', 'Y', 'X', 'Z'], 'X'], [[], 'Do']],
    show: (s, n) => `dizi ${JSON.stringify(s.length > 12 ? s.slice(0, 12).concat(['…']) : s)} (${s.length} nota), nota “${n}”`,
    hint: () => 'Dizide note’un her geçtiği yerde bir sonraki elemanı sayın. En çok sayılanı döndürün; eşitlikte İLK karşılaşılanı (sözlük ekleme sırası). Hiç yoksa None.'
  };

  /* ---------- başlık ---------- */
  D.titlegen = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const data = SHAPES.star; let pts, step, timer, running = false, phase = 0;
    const fresh = () => { const r = RNG(Math.floor(Math.random() * 1e6)); pts = Array.from({ length: 220 }, () => [gauss(r) * 1.2, gauss(r) * 1.2]); step = 0; };
    fresh();
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#d79bff'; pts.forEach(([x, y]) => { const px = 980 + x * 90, py = 115 + y * 90; if (py < -5 || py > H + 5) return; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 7); ctx.fill(); });
    };
    const tick = () => {
      if (!running) return;
      if (step < 40) { const s = SIG(1 - step / 40), sn = SIG(1 - (step + 1) / 40), k = sn / s; pts = pts.map(([x, y]) => { const [mx, my] = idealDenoise(x, y, s, data); return [mx + (x - mx) * k, my + (y - my) * k]; }); step++; }
      else if (++phase > 25) { phase = 0; fresh(); }
      draw(); timer = setTimeout(tick, 80);
    };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
