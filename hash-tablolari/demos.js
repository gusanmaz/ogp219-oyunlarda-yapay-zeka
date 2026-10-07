/* "Hash Tabloları" destesine özel demolar (ortak: ../ortak/hash.js) */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;
  /* Başlık: kelimeler yağıyor, hash’lerine göre kovalarına düşüp zincir oluşturuyor */
  D.titlehash = function (root) {
    const W = 1280, H = 240, M = 16, words = 'kılıç kalkan iksir ok yay balta mızrak asa yüzük kolye miğfer zırh çizme harita anahtar meşale bomba tuzak kristal altın elmas yakut ejder goblin ork trol zombi golem hayalet büyücü'.split(' ');
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let fall = [], piles, timer, running = false, k = 0;
    const colW = W / M;
    const reset = () => { piles = Array.from({ length: M }, () => 0); fall = []; };
    reset();
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < M; i++) { ctx.fillStyle = 'rgba(120,200,255,0.10)'; ctx.fillRect(i * colW + 3, H - 16, colW - 6, 14); ctx.fillStyle = 'rgba(160,220,255,0.7)'; ctx.font = '600 11px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText(i, i * colW + colW / 2, H - 5); }
      fall.forEach(f => {
        const x = f.b * colW + colW / 2;
        ctx.fillStyle = `hsla(${190 + f.b * 9},90%,${f.done ? 62 : 72}%,${f.done ? 0.8 : 1})`;
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = f.done ? 0 : 10;
        ctx.font = '700 15px "JetBrains Mono"'; ctx.fillText(f.w, x, f.y); ctx.shadowBlur = 0;
      });
    };
    const tick = () => {
      if (!running) return;
      if (k % 4 === 0) { const w = words[(k / 4) % words.length | 0]; const b = SL.hashIdx(w, M); fall.push({ w, b, y: -10, target: H - 24 - piles[b] * 18, done: false }); piles[b]++; }
      k++;
      fall.forEach(f => { if (!f.done) { f.y += 12; if (f.y >= f.target) { f.y = f.target; f.done = true; } } });
      if (Math.max(...piles) > 11) reset();
      draw(); timer = setTimeout(tick, 70);
    };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
