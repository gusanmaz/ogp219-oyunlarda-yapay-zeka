/* =====================================================================
   demos.js — "Algoritma Analizi" destesine özel demolar
   (Ortak analiz demoları ../ortak/analiz.js içinde)
   ===================================================================== */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;

  /* Başlık: büyüme eğrileri yarışıyor */
  D.titlegrowth = function (root) {
    const W = 1280, H = 230;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const F = [['N', n => n, '#5ff0a0'], ['N lg N', n => n * Math.log2(n + 1), '#6ea8ff'], ['N²', n => n * n, '#ffd84d'], ['2ᴺ', n => Math.pow(2, n), '#ff6b9a']];
    let t = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const X0 = 760, X1 = W - 60, Y0 = H - 50, maxN = 4 + (t % 220) / 10, top = maxN * maxN;
      F.forEach(([name, f, col]) => {
        ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.lineWidth = 3; ctx.beginPath();
        let lx = X0, ly = Y0;
        for (let k = 0; k <= 100; k++) { const n = 1 + (k / 100) * (maxN - 1), y = Y0 - Math.min(1.2, f(n) / top) * (Y0 - 20), x = X0 + (k / 100) * (X1 - X0); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); lx = x; ly = y; }
        ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = col; ctx.font = '700 15px "JetBrains Mono"'; ctx.fillText(name, Math.min(lx + 6, W - 50), Math.max(ly, 24));
      });
      ctx.fillStyle = '#ffd84d'; ctx.font = '11px "Press Start 2P"'; ctx.fillText('N = ' + Math.floor(maxN), X0, H - 24);
    };
    const tick = () => { if (!running) return; t++; draw(); timer = setTimeout(tick, 60); };
    draw();
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
