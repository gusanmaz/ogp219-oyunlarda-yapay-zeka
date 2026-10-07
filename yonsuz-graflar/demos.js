/* "Yönsüz Graflar" destesine özel demolar (ortak: ../ortak/graf.js) */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;
  /* Başlık: rastgele bir graf; bir BFS dalgası kaynaktan yayılıyor */
  D.titlegraph = function (root) {
    const W = 1280, H = 240, N = 46;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let P, adj, dist, frontier, step, timer, running = false;
    const reset = () => {
      P = Array.from({ length: N }, () => [20 + Math.random() * (W - 40), 15 + Math.random() * (H - 30)]);
      adj = P.map(() => []);
      P.forEach((p, i) => { const near = P.map((q, j) => [Math.hypot(p[0] - q[0], p[1] - q[1]), j]).filter(x => x[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, 3); near.forEach(([, j]) => { if (!adj[i].includes(j)) { adj[i].push(j); adj[j].push(i); } }); });
      dist = new Array(N).fill(-1); const s = Math.floor(Math.random() * N); dist[s] = 0; frontier = [s]; step = 0;
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      adj.forEach((l, i) => l.forEach(j => { if (j < i) return; const on = dist[i] >= 0 && dist[j] >= 0 && Math.abs(dist[i] - dist[j]) === 1; ctx.strokeStyle = on ? 'rgba(120,255,190,0.7)' : 'rgba(160,170,220,0.25)'; ctx.lineWidth = on ? 2.5 : 1.2; ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke(); }));
      P.forEach((p, i) => { const d = dist[i]; ctx.fillStyle = d < 0 ? 'rgba(180,190,230,0.5)' : `hsl(${150 - d * 16},90%,60%)`; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = d >= 0 ? 10 : 0; ctx.beginPath(); ctx.arc(p[0], p[1], d === 0 ? 8 : 5.5, 0, 7); ctx.fill(); ctx.shadowBlur = 0; });
    };
    const tick = () => {
      if (!running) return;
      if (frontier.length) { const nf = []; frontier.forEach(v => adj[v].forEach(w => { if (dist[w] < 0) { dist[w] = dist[v] + 1; nf.push(w); } })); frontier = nf; }
      else if (++step > 6) reset();
      draw(); timer = setTimeout(tick, 420);
    };
    reset();
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
