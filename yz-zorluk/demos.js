/* "Zorluk ve Oyuncu Modelleme" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS;
  const T = () => SL.theme();
  const RNG = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const sig = x => 1 / (1 + Math.exp(-x));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------- simüle oyuncu: beceri zamanla artar; başarı olasılığı = σ(beceri − zorluk) ---------- */
  function simulate(policy, opts) {
    const r = RNG(opts.seed || 1), N = opts.n || 120;
    let skill = opts.skill0 ?? 2, diff = opts.d0 ?? 3; const hist = [];
    const recent = [];
    for (let i = 0; i < N; i++) {
      const p = sig((skill - diff) * 1.2), win = r() < p ? 1 : 0;
      recent.push(win); if (recent.length > 5) recent.shift();
      hist.push({ skill, diff, p, win });
      skill += opts.learn * (0.4 + 0.6 * (1 - Math.abs(p - 0.5) * 2)) * 0.06;   // en çok “dengeli” maçlarda öğrenir
      diff = policy(diff, recent.slice(), i);
      diff = clamp(diff, 0, 10);
    }
    return hist;
  }
  SL.DDA_simulate = simulate;
  const POLICIES = {
    fixed: () => d => d,
    steps: () => (d, rec, i) => (i > 0 && i % 30 === 0 ? d + 1.5 : d),
    dda: (target) => (d, rec) => { if (rec.length < 3) return d; const wr = rec.reduce((a, b) => a + b, 0) / rec.length; return d + (wr - target) * 0.6; }
  };
  D.flow = function (root) {
    const W = 720, H = 330;
    const c = { policy: 'dda', learn: 1, target: 0.7, skill0: 2, seed: 4 };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const pol = c.policy === 'dda' ? POLICIES.dda(c.target) : POLICIES[c.policy]();
      const h = simulate(pol, { seed: c.seed, learn: c.learn, skill0: c.skill0, d0: 3, n: 120 });
      // sol: beceri–zorluk düzlemi ve akış kanalı
      const ox = 40, oy = 20, S = 270, X = v => ox + v / 10 * S, Y = v => oy + S - v / 10 * S;
      ctx.fillStyle = t.dark ? 'rgba(255,92,122,0.12)' : 'rgba(255,92,122,0.12)'; ctx.beginPath(); ctx.moveTo(X(0), Y(1.5)); ctx.lineTo(X(8.5), Y(10)); ctx.lineTo(X(0), Y(10)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = t.dark ? 'rgba(79,140,255,0.12)' : 'rgba(79,140,255,0.12)'; ctx.beginPath(); ctx.moveTo(X(1.5), Y(0)); ctx.lineTo(X(10), Y(8.5)); ctx.lineTo(X(10), Y(0)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = t.dark ? 'rgba(46,170,90,0.16)' : 'rgba(46,170,90,0.14)'; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1.5), Y(0)); ctx.lineTo(X(10), Y(8.5)); ctx.lineTo(X(10), Y(10)); ctx.lineTo(X(8.5), Y(10)); ctx.lineTo(X(0), Y(1.5)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = t.rule; ctx.strokeRect(X(0), Y(10), S, S);
      SL.drawLabel(ctx, 'KAYGI (çok zor)', X(2.2), Y(8.6), t.red, { size: 11 }); SL.drawLabel(ctx, 'SIKINTI (çok kolay)', X(7.8), Y(1.4), t.blue, { size: 11 }); SL.drawLabel(ctx, 'AKIŞ', X(6.2), Y(6.6), t.green, { size: 12 });
      SL.drawLabel(ctx, 'beceri →', X(5), Y(0) + 14, t.muted, { size: 10, bg: false }); ctx.save(); ctx.translate(X(0) - 16, Y(5)); ctx.rotate(-Math.PI / 2); SL.drawLabel(ctx, 'zorluk →', 0, 0, t.muted, { size: 10, bg: false }); ctx.restore();
      ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.beginPath(); h.forEach((s, i) => { const x = X(s.skill), y = Y(s.diff); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      const last = h[h.length - 1]; ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(X(last.skill), Y(last.diff), 6, 0, 7); ctx.fill();
      // sağ: zamanla kazanma olasılığı
      const px = 360, pw = 340, py = 30, ph = 120;
      ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)'; ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = t.dark ? 'rgba(46,170,90,0.18)' : 'rgba(46,170,90,0.16)'; ctx.fillRect(px, py + ph * (1 - 0.8), pw, ph * 0.3);
      ctx.strokeStyle = t.purple; ctx.lineWidth = 2; ctx.beginPath(); h.forEach((s, i) => { const x = px + (i / (h.length - 1)) * pw, y = py + ph * (1 - s.p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      h.forEach((s, i) => { ctx.fillStyle = s.win ? t.green : t.red; ctx.fillRect(px + (i / h.length) * pw, py + ph + 6, pw / h.length - 0.5, 8); });
      SL.drawLabel(ctx, 'mor: kazanma olasılığı · yeşil: %50–80 · şerit: kazandı/kaybetti', px, py - 10, t.muted, { size: 10, align: 'left' });
      const anx = h.filter(s => s.p < 0.35).length, bor = h.filter(s => s.p > 0.9).length, flow = h.length - anx - bor;
      const sx = px, sy = 200;
      [['akışta', flow, t.green], ['kaygıda (p < 0,35)', anx, t.red], ['sıkıntıda (p > 0,9)', bor, t.blue]].forEach(([n, v, col], i) => { ctx.fillStyle = col; ctx.fillRect(sx, sy + i * 30, (v / h.length) * 170, 20); SL.drawLabel(ctx, `${n}: %${Math.round(v / h.length * 100)}`, sx + 178, sy + i * 30 + 10, t.ink, { size: 11, align: 'left', bg: false }); });
      SL.drawLabel(ctx, `son beceri ${last.skill.toFixed(1)} · son zorluk ${last.diff.toFixed(1)} · galibiyet %${Math.round(h.reduce((a, s) => a + s.win, 0) / h.length * 100)}`, sx, sy + 100, t.ink, { size: 11, align: 'left' });
      info.innerHTML = { fixed: 'Sabit zorluk: oyuncu öğrendikçe oyun kolaylaşır; çizgi sağa kayıp <b>sıkıntı</b> bölgesine girer. Yavaş öğrenen bir oyuncu ise kaygıda takılır.', steps: 'Basamaklı zorluk (tasarımcının seviye eğrisi): her 30 karşılaşmada bir zorluk artar. Ortalama oyuncu için iyi; hızlı ya da yavaş öğrenenler için değil.', dda: `Dinamik zorluk: son 5 sonucun kazanma oranı hedefin (%${Math.round(c.target * 100)}) üstündeyse zorluk artar, altındaysa azalır. Çizgi akış kanalının içinde kalmaya çalışır.` }[c.policy];
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Zorluk politikası: ', select({ fixed: 'sabit', steps: 'basamaklı (elle eğri)', dda: 'dinamik (DDA)' }, c.policy, v => { c.policy = v; draw(); })),
      slider('öğrenme hızı', 0, 3, c.learn, 0.25, v => { c.learn = v; draw(); }), slider('başlangıç becerisi', 0, 6, c.skill0, 0.5, v => { c.skill0 = v; draw(); }),
      slider('DDA hedef galibiyet', 0.3, 0.95, c.target, 0.05, v => { c.target = v; draw(); }), btn('🎲 başka oyuncu', () => { c.seed++; draw(); })), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= Left 4 Dead tarzı YZ Yönetmeni ================= */
  D.director = function (root) {
    const W = 720, H = 300, HIST = 360;
    const c = { peak: 0.8, relax: 12, sustain: 4, decay: 0.08, skill: 0.5 };
    let I = 0, phase = 'build', tPhase = 0, enemies = 0, hist = [], timer = null, t = 0, r = RNG(7);
    const COLS = () => { const th = T(); return { build: th.red, sustain: th.amber, fade: th.purple, relax: th.green }; };
    const NAMES = { build: 'BUILD UP (tam tehdit)', sustain: 'SUSTAIN PEAK (zirveyi koru)', fade: 'PEAK FADE (azalt, savaşın bitmesini bekle)', relax: 'RELAX (dinlen)' };
    const step = (dt) => {
      t += dt; tPhase += dt;
      // nüfus: build/sustain'de düşman doğar; fade/relax'te doğmaz
      if ((phase === 'build' || phase === 'sustain') && r() < 1.6 * dt) enemies++;
      // oyuncu düşman öldürür (beceriye bağlı); düşman varsa hasar alır
      if (enemies > 0 && r() < (0.6 + c.skill) * dt) { enemies--; I += 0.04; }
      if (enemies > 0 && r() < enemies * 0.35 * (1.2 - c.skill) * dt) I += 0.07 + r() * 0.06;
      if (enemies === 0) I -= c.decay * dt;           // L4D: düşman yoksa yoğunluk sıfıra doğru azalır
      I = clamp(I, 0, 1);
      if (phase === 'build' && I >= c.peak) { phase = 'sustain'; tPhase = 0; }
      else if (phase === 'sustain' && tPhase >= c.sustain) { phase = 'fade'; tPhase = 0; }
      else if (phase === 'fade' && I < c.peak * 0.5 && enemies === 0) { phase = 'relax'; tPhase = 0; }
      else if (phase === 'relax' && tPhase >= c.relax) { phase = 'build'; tPhase = 0; }
      hist.push({ I, phase, enemies }); if (hist.length > HIST) hist.shift();
    };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const draw = () => {
      const th = T(), col = COLS(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = th.card; ctx.fillRect(0, 0, W, H);
      const ox = 20, ow = W - 40, oy = 40, oh = 170;
      hist.forEach((hh, i) => { ctx.fillStyle = col[hh.phase]; ctx.globalAlpha = 0.16; ctx.fillRect(ox + (i / HIST) * ow, oy, ow / HIST + 0.5, oh); });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = th.ink; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(ox, oy + oh * (1 - c.peak)); ctx.lineTo(ox + ow, oy + oh * (1 - c.peak)); ctx.stroke(); ctx.setLineDash([]);
      SL.drawLabel(ctx, 'zirve eşiği', ox + ow - 4, oy + oh * (1 - c.peak) - 9, th.muted, { size: 10, align: 'right' });
      ctx.strokeStyle = th.red; ctx.lineWidth = 2.5; ctx.beginPath(); hist.forEach((hh, i) => { const x = ox + (i / HIST) * ow, y = oy + oh * (1 - hh.I); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      ctx.strokeStyle = th.blue; ctx.lineWidth = 1.5; ctx.beginPath(); hist.forEach((hh, i) => { const x = ox + (i / HIST) * ow, y = oy + oh * (1 - Math.min(1, hh.enemies / 12)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      SL.drawLabel(ctx, '— oyuncunun “duygusal yoğunluğu”', ox, 14, th.red, { size: 11, align: 'left' }); SL.drawLabel(ctx, '— aktif düşman sayısı', ox + 250, 14, th.blue, { size: 11, align: 'left' });
      SL.drawLabel(ctx, 'Yönetmen durumu: ' + NAMES[phase], W / 2, oy + oh + 26, col[phase], { size: 13 });
      Object.entries(NAMES).forEach(([k, n], i) => { ctx.fillStyle = col[k]; ctx.fillRect(ox + i * 175, H - 30, 12, 12); SL.drawLabel(ctx, n.split(' (')[0], ox + 16 + i * 175, H - 24, th.ink, { size: 10, align: 'left', bg: false }); });
      info.innerHTML = 'Valve’in Left 4 Dead “YZ Yönetmeni” mantığı: yoğunluk; hasar alınca, yakında düşman ölünce artar, ortada düşman yoksa azalır. Yoğunluk zirveyi geçince yönetmen birkaç saniye daha bastırır, sonra düşman göndermeyi keser, çatışmanın doğal olarak bitmesini bekler ve oyunculara nefes aldırır. Sonuç: <b>gerilim–rahatlama dalgası</b>.';
    };
    const run = () => { if (timer) return; timer = setInterval(() => { for (let k = 0; k < 3; k++) step(0.1); draw(); }, 50); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      btn('▶ / ⏸', () => (timer ? stop() : run())), btn('💥 pusu! (+0,3)', () => { I = clamp(I + 0.3, 0, 1); draw(); }), btn('↺ baştan', () => { I = 0; phase = 'build'; tPhase = 0; enemies = 0; hist = []; r = RNG(7); draw(); }),
      slider('oyuncu becerisi', 0, 1, c.skill, 0.1, v => { c.skill = v; }), slider('zirve eşiği', 0.4, 1, c.peak, 0.05, v => { c.peak = v; }),
      slider('dinlenme (sn)', 2, 40, c.relax, 1, v => { c.relax = v; })), C, info);
    draw(); SL.onTheme(draw);
    return { start: run, stop };
  };

  /* ================= yarış: lastik bant ================= */
  D.rubber = function (root) {
    const W = 720, H = 300, LAP = 3000, N = 5;
    const c = { band: 0.6, dead: 120, maxB: 0.25, player: 1.0 };
    let cars, timer = null, done = false, res = [];
    const reset = () => { const r = RNG(11); cars = Array.from({ length: N }, (_, i) => ({ me: i === 0, x: 0, base: i === 0 ? 0 : [0.86, 0.95, 1.12, 1.22][i - 1], col: i })); done = false; res = []; };
    const mult = gap => { const a = Math.abs(gap); if (a < c.dead) return 1; const s = clamp((a - c.dead) / 600, 0, 1) * c.maxB * c.band * 4; return gap > 0 ? 1 - Math.min(c.maxB, s) : 1 + Math.min(c.maxB, s); };
    const step = () => {
      const me = cars[0];
      cars.forEach(k => { if (k.fin) return; const v = k.me ? 3 * c.player : 3 * k.base * mult(k.x - me.x); k.x += v; if (k.x >= LAP) { k.fin = true; res.push(k); } });
      if (cars.every(k => k.fin)) done = true;
    };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const cols = [t.blue, t.red, t.amber, t.purple, t.green], me = cars[0], CX = 330, SC = 0.42;
      // görünüm oyuncuya göre: yatay konum = YZ ile oyuncu arasındaki fark (±700 birim)
      const dz = c.dead * SC;
      ctx.fillStyle = t.dark ? 'rgba(46,170,90,0.15)' : 'rgba(46,170,90,0.12)'; ctx.fillRect(CX - dz, 24, 2 * dz, 214);
      ctx.strokeStyle = t.rule; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(CX, 20); ctx.lineTo(CX, 240); ctx.stroke(); ctx.setLineDash([]);
      SL.drawLabel(ctx, '← geride', CX - 290, 14, t.muted, { size: 10 }); SL.drawLabel(ctx, 'önde →', CX + 290, 14, t.muted, { size: 10 });
      cars.forEach((k, i) => {
        const y = 44 + i * 42, gap = k.x - me.x, x = CX + clamp(gap, -700, 700) * SC;
        ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; ctx.fillRect(CX - 700 * SC, y - 12, 1400 * SC, 24);
        ctx.fillStyle = cols[i]; ctx.fillRect(x - 12, y - 8, 24, 16);
        const m = k.me ? 1 : mult(gap);
        SL.drawLabel(ctx, k.me ? 'SİZ' : `YZ ${i} ×${m.toFixed(2)}`, 640, y, k.me ? t.blue : m > 1.001 ? t.green : m < 0.999 ? t.red : t.muted, { size: 11, align: 'left', bg: false });
      });
      SL.drawLabel(ctx, 'ölü bölge (lastik bant yok)', CX, 252, t.green, { size: 10 });
      ctx.fillStyle = t.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; ctx.fillRect(20, 266, 520, 8); ctx.fillStyle = t.blue; ctx.fillRect(20, 266, 520 * Math.min(1, me.x / LAP), 8);
      SL.drawLabel(ctx, 'yarışın ilerlemesi', 550, 270, t.muted, { size: 10, align: 'left', bg: false });
      if (done) SL.drawLabel(ctx, 'Sıralama: ' + res.map(k => (k.me ? 'SİZ' : 'YZ ' + cars.indexOf(k))).join(' › '), W / 2, H - 10, t.ink, { size: 12 });
      info.innerHTML = 'Görünüm <b>size göre</b>: her araba, sizden ne kadar önde ya da geride olduğuna göre çiziliyor. Nic Melder’in (Game AI Pro) eğrisi: yakınınızda (yeşil ölü bölge) hiçbir değişiklik yok, böylece yan yana yarışırken “hile” görünmez. Öndeki YZ uzaklaştıkça yavaşlar (kırmızı çarpan), arkadaki hızlanır (yeşil). Lastik bant gücünü 0 yapıp yarışı yeniden başlatın: araçlar dağılır. Tercihen önce YZ’nin <b>sürüş becerisi</b> düşürülür, yetmezse aracın gücü.';
    };
    const run = () => { if (timer) return; timer = setInterval(() => { for (let k = 0; k < 2; k++) step(); draw(); if (done) { clearInterval(timer); timer = null; } }, 30); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      btn('🏁 yarışı başlat', () => { reset(); run(); }), slider('lastik bant gücü', 0, 1, c.band, 0.1, v => { c.band = v; }), slider('ölü bölge', 0, 400, c.dead, 20, v => { c.dead = v; }),
      slider('sizin hızınız', 0.8, 1.3, c.player, 0.02, v => { c.player = v; })), C, info);
    reset(); draw(); SL.onTheme(draw);
    return { stop() { if (timer) { clearInterval(timer); timer = null; } } };
  };

  /* ================= adil hissettiren rastgelelik: PRD ve “yalancı yüzdeler” ================= */
  D.prd = function (root) {
    const W = 720, H = 300;
    let mode = 'true', p = 0.25, seq = [], seed = 5;
    const C_PRD = { 0.25: 0.084744, 0.15: 0.032221, 0.4: 0.201547 };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const gen = () => { const r = RNG(seed); seq = []; let n = 0; const Cc = C_PRD[p]; for (let i = 0; i < 400; i++) { n++; const pr = mode === 'true' ? p : Math.min(1, Cc * n); const hit = r() < pr; seq.push(hit); if (hit) n = 0; } };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      seq.slice(0, 200).forEach((hit, i) => { ctx.fillStyle = hit ? t.amber : (t.dark ? '#33384a' : '#dad6e6'); ctx.fillRect(20 + (i % 50) * 13.6, 20 + Math.floor(i / 50) * 18, 12, 14); });
      // kaç vuruşta bir kritik? aralık histogramı
      const gaps = []; let g = 0; seq.forEach(h => { g++; if (h) { gaps.push(g); g = 0; } });
      const bins = Array(16).fill(0); gaps.forEach(x => bins[Math.min(15, x - 1)]++); const mx = Math.max(1, ...bins);
      const bx = 20, by = 120, bw = 680, bh = 130;
      bins.forEach((v, i) => { ctx.fillStyle = t.purple; const hh = (v / mx) * bh; ctx.fillRect(bx + i * (bw / 16) + 4, by + bh - hh, bw / 16 - 8, hh); SL.drawLabel(ctx, i === 15 ? '16+' : String(i + 1), bx + i * (bw / 16) + bw / 32, by + bh + 10, t.muted, { size: 10, bg: false }); });
      const longest = Math.max(0, ...gaps), rate = seq.filter(Boolean).length / seq.length;
      SL.drawLabel(ctx, `iki kritik arasındaki vuruş sayısı · gerçekleşen oran %${(rate * 100).toFixed(1)} · en uzun kuraklık ${longest} vuruş`, W / 2, by - 10, t.ink, { size: 11 });
      info.innerHTML = mode === 'true' ? `Gerçek rastgele: her vuruşta %${p * 100} şans. Ortalama doğru, ama arka arkaya 10+ ıska ya da 3 kritik üst üste olabilir: oyuncu bunu “bozuk” hisseder.` : `Sözde rastgele dağılım (PRD, Dota 2 ve Warcraft III): n’inci denemede şans C·n (C ≈ ${C_PRD[p]}); kritik gelince n sıfırlanır. Ortalama yine %${p * 100}, ama uzun kuraklıklar ve üst üste kritikler neredeyse yok: daha <b>adil hissettirir</b>.`;
    };
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yöntem: ', select({ true: 'gerçek rastgele', prd: 'PRD (sözde rastgele dağılım)' }, mode, v => { mode = v; gen(); draw(); })),
      el('label', { class: 'ctl' }, 'Kritik şansı: ', select({ 0.15: '%15', 0.25: '%25', 0.4: '%40' }, String(p), v => { p = +v; gen(); draw(); })),
      btn('🎲 yeniden', () => { seed++; gen(); draw(); })), C, info);
    gen(); draw(); SL.onTheme(draw);
  };

  /* ---------- simlab: kendi DDA kuralın ---------- */
  SL.SIMLABS.dda = function (box, api) {
    const W = 520, H = 280;
    let fn = null, hist = [], seed = 1;
    const run = f => { const pol = (d, rec, i) => { const v = f(d, rec.slice()); return typeof v === 'number' && isFinite(v) ? v : NaN; }; return simulate(pol, { seed, learn: 1.5, skill0: 1, d0: 5, n: 150 }); };
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt, w) { },
      render(ctx, w, t) {
        const ox = 30, ow = W - 50, oy = 20, oh = 200;
        ctx.fillStyle = t.dark ? 'rgba(46,170,90,0.16)' : 'rgba(46,170,90,0.14)'; ctx.fillRect(ox, oy + oh * (1 - 0.85), ow, oh * 0.35);
        ctx.strokeStyle = t.rule; ctx.strokeRect(ox, oy, ow, oh);
        if (!hist.length) { SL.drawLabel(ctx, 'Kodu çalıştırın', W / 2, H / 2, t.muted, { size: 13 }); return; }
        const line = (key, col, sc) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); hist.forEach((s, i) => { const x = ox + (i / (hist.length - 1)) * ow, y = oy + oh * (1 - sc(s[key])); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); };
        line('p', t.purple, v => v); line('diff', t.red, v => v / 10); line('skill', t.blue, v => clamp(v / 10, 0, 1));
        SL.drawLabel(ctx, 'mor: kazanma olasılığı · kırmızı: zorluk/10 · mavi: beceri/10 · yeşil bant: %50–85', 10, H - 30, t.muted, { size: 10, align: 'left' });
      },
      reset() { }
    });
    box.append(w.canvas);
    const evalF = f => { const h = run(f); const late = h.slice(30); const inBand = late.filter(s => s.p >= 0.5 && s.p <= 0.85).length / late.length; let maxJump = 0; for (let i = 1; i < h.length; i++) maxJump = Math.max(maxJump, Math.abs(h[i].diff - h[i - 1].diff)); return { h, inBand, maxJump, bad: h.some(s => Number.isNaN(s.diff)) }; };
    return {
      world: w,
      setFns(f) { fn = f.adjust; try { hist = run(fn); } catch (e) { api.setMsg('err', '⚠️ adjust hata verdi: ' + SL.jsErrorText(e)); } w.draw(); },
      check(mod) {
        try {
          const ok = [1, 2, 3].map(s => { seed = s; return evalF(mod.adjust); }); seed = 1;
          if (ok.some(o => o.bad)) return { ok: false, msg: '⚠️ adjust her zaman bir sayı döndürmeli.' };
          const worst = Math.min(...ok.map(o => o.inBand)), jump = Math.max(...ok.map(o => o.maxJump));
          if (jump > 1.5) return { ok: false, msg: `❌ Zorluk bir adımda ${jump.toFixed(2)} kadar zıplıyor: oyuncu fark eder. Değişimi küçük tutun (≤ 1,5).` };
          if (worst < 0.6) return { ok: false, msg: `❌ 30. karşılaşmadan sonra zamanın sadece %${Math.round(worst * 100)}’i akış bandında (%50–85 kazanma şansı). Hedef: en az %60. Oyuncu hızla gelişiyor: kazandıkça zorluğu artırın.` };
          return { ok: true, msg: `✅ Üç farklı oyuncuda zamanın en az %${Math.round(worst * 100)}’i akış bandında; en büyük zorluk sıçraması ${jump.toFixed(2)}. Grafiğe bakın: zorluk becerinin peşinden gidiyor mu?` };
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  SL.AILABS.elo = {
    fn: 'elo_update', jsFn: 'eloUpdate', tol: 1e-6,
    ref: (ra, rb, sa, k) => { const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400)); return [ra + k * (sa - ea), rb + k * ((1 - sa) - (1 - ea))]; },
    cases: () => { const cs = [[1500, 1500, 1, 32], [1500, 1500, 0.5, 32], [1600, 1400, 0, 32], [1200, 1800, 1, 24], [2000, 1990, 1, 16]]; for (let i = 0; i < 8; i++) cs.push([1000 + Math.round(Math.random() * 1200), 1000 + Math.round(Math.random() * 1200), [0, 0.5, 1][i % 3], [16, 24, 32][i % 3]]); return cs; },
    show: (a, b, s, k) => `A = ${a}, B = ${b}, A’nın sonucu ${s} (1 kazandı, 0,5 berabere, 0 kaybetti), K = ${k}`,
    hint: () => 'Beklenen skor E_A = 1 / (1 + 10^((R_B − R_A)/400)). Yeni R_A = R_A + K·(S_A − E_A); B için aynısı (S_B = 1 − S_A, E_B = 1 − E_A). [yeni_A, yeni_B] döndürün.'
  };
  SL.AILABS.band = {
    fn: 'rubber_band', jsFn: 'rubberBand', tol: 1e-9,
    ref: (gap, dead, full, maxb) => { const a = Math.abs(gap); if (a <= dead) return 1; const s = Math.min(1, (a - dead) / (full - dead)) * maxb; return gap > 0 ? 1 - s : 1 + s; },
    cases: () => [[0, 100, 500, 0.2], [50, 100, 500, 0.2], [100, 100, 500, 0.2], [300, 100, 500, 0.2], [-300, 100, 500, 0.2], [900, 100, 500, 0.2], [-900, 100, 500, 0.3], [250, 50, 450, 0.1], [-60, 50, 450, 0.1]],
    show: (g, d, f, m) => `fark ${g} (pozitif: YZ önde), ölü bölge ${d}, tam etki ${f}, en çok ±${m}`,
    hint: () => '|fark| ≤ ölü bölge → 1. Değilse etki = min(1, (|fark| − ölü) / (tam − ölü)) · max. YZ öndeyse (fark > 0) 1 − etki, arkadaysa 1 + etki.'
  };
  SL.AILABS.director = {
    fn: 'next_phase', jsFn: 'nextPhase',
    ref: (ph, I, t, enemies, peak, sustain, relax) => { if (ph === 'build' && I >= peak) return 'sustain'; if (ph === 'sustain' && t >= sustain) return 'fade'; if (ph === 'fade' && I < peak / 2 && enemies === 0) return 'relax'; if (ph === 'relax' && t >= relax) return 'build'; return ph; },
    cases: () => [['build', 0.5, 3, 4, 0.8, 4, 30], ['build', 0.85, 3, 4, 0.8, 4, 30], ['sustain', 0.9, 2, 3, 0.8, 4, 30], ['sustain', 0.9, 4.5, 3, 0.8, 4, 30], ['fade', 0.3, 1, 2, 0.8, 4, 30], ['fade', 0.3, 1, 0, 0.8, 4, 30], ['fade', 0.5, 9, 0, 0.8, 4, 30], ['relax', 0.1, 10, 0, 0.8, 4, 30], ['relax', 0, 31, 0, 0.8, 4, 30], ['relax', 0.9, 5, 6, 0.8, 4, 30]],
    show: (ph, I, t, e, p, s, r) => `durum “${ph}”, yoğunluk ${I}, bu durumda geçen süre ${t} sn, düşman ${e}, zirve ${p}, koru ${s} sn, dinlen ${r} sn`,
    hint: () => 'build: yoğunluk ≥ zirve → sustain. sustain: süre ≥ koru → fade. fade: yoğunluk < zirve/2 VE düşman yok → relax. relax: süre ≥ dinlen → build. Hiçbiri değilse aynı durumda kal.'
  };

  /* ---------- başlık ---------- */
  D.titlediff = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let t = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,211,107,0.85)'; ctx.lineWidth = 3; ctx.beginPath();
      for (let x = 660; x < W - 20; x += 4) { const u = (x + t) / 70; const y = 150 - (Math.max(0, Math.sin(u)) ** 3 * 90 + Math.sin(u * 0.37) * 10); x === 660 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '12px "JetBrains Mono", monospace'; ctx.fillText('gerilim → zirve → rahatlama → …', 680, 200);
    };
    const tick = () => { if (!running) return; t += 3; draw(); timer = setTimeout(tick, 50); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
