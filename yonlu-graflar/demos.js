/* "Yönlü Graflar" destesine özel demolar (ortak: ../ortak/graf.js + yonlu.js) */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;
  /* Başlık: yönlü kenarlar boyunca akan ışık parçacıkları */
  D.titledigraph = function (root) {
    const W = 1280, H = 240, N = 34;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let P, E, sparks, timer, running = false, t = 0;
    const reset = () => {
      P = Array.from({ length: N }, (_, i) => [30 + (i % 17) * 74 + (Math.random() - 0.5) * 40, 50 + Math.floor(i / 17) * 120 + (Math.random() - 0.5) * 50]);
      E = []; P.forEach((p, i) => { const near = P.map((q, j) => [Math.hypot(p[0] - q[0], p[1] - q[1]), j]).filter(x => x[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, 2); near.forEach(([, j]) => E.push([i, j])); });
      sparks = E.map(() => Math.random());
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      E.forEach(([a, b], k) => {
        const [x1, y1] = P[a], [x2, y2] = P[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
        ctx.strokeStyle = 'rgba(170,180,240,0.28)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x1 + ux * 6, y1 + uy * 6); ctx.lineTo(x2 - ux * 8, y2 - uy * 8); ctx.stroke();
        const hx = x2 - ux * 8, hy = y2 - uy * 8; ctx.fillStyle = 'rgba(170,180,240,0.45)'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - ux * 7 - uy * 4, hy - uy * 7 + ux * 4); ctx.lineTo(hx - ux * 7 + uy * 4, hy - uy * 7 - ux * 4); ctx.fill();
        const s = (sparks[k] + t * 0.012) % 1; ctx.fillStyle = 'rgba(255,200,90,0.95)'; ctx.shadowColor = '#ffc85a'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x1 + dx * s, y1 + dy * s, 2.6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      });
      P.forEach(p => { ctx.fillStyle = 'rgba(200,210,255,0.8)'; ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, 7); ctx.fill(); });
    };
    const tick = () => { if (!running) return; t++; if (t % 600 === 0) reset(); draw(); timer = setTimeout(tick, 33); };
    reset();
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
