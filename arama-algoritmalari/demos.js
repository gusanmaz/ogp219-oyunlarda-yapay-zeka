/* =====================================================================
   demos.js — "Arama Algoritmaları" destesine özel demolar
   (Ortak arama demoları ../ortak/arama.js içinde)
   ===================================================================== */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;

  /* Başlık arka planı: sonsuz döngüde ikili arama */
  D.titlesearch = function (root) {
    const W = 1280, H = 200, N = 31;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let a, key, lo, hi, mid, found, timer, running = false, pause = 0;
    const reset = () => {
      const s = new Set(); while (s.size < N) s.add(1 + Math.floor(Math.random() * 99));
      a = [...s].sort((x, y) => x - y); key = a[Math.floor(Math.random() * N)];
      lo = 0; hi = N - 1; mid = -1; found = -1;
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const bw = (W - 80) / N;
      ctx.font = '700 15px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd84d'; ctx.fillText('aranan: ' + key, W / 2, 30);
      for (let i = 0; i < N; i++) {
        const x = 40 + i * bw, inR = i >= lo && i <= hi;
        const col = i === found ? '#5ff0a0' : i === mid ? '#ffd84d' : inR ? '#b58cff' : 'rgba(255,255,255,0.12)';
        ctx.shadowColor = col; ctx.shadowBlur = inR || i === found ? 12 : 0;
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(x + 3, 80, bw - 6, 52);
        ctx.shadowBlur = 0; ctx.fillStyle = inR || i === found ? '#fff' : 'rgba(255,255,255,0.3)';
        ctx.fillText(a[i], x + bw / 2, 107);
      }
    };
    const tick = () => {
      if (!running) return;
      if (pause > 0) { pause--; if (!pause) reset(); }
      else if (found >= 0) pause = 4;
      else {
        mid = lo + Math.floor((hi - lo) / 2);
        if (a[mid] === key) found = mid; else if (key < a[mid]) hi = mid - 1; else lo = mid + 1;
      }
      draw();
      timer = setTimeout(tick, 700);
    };
    reset(); draw();
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
