/* "En Kısa Yollar" destesine özel demolar (ortak: ../ortak/graf.js + yonlu.js + sp.js) */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;
  /* Başlık: arazili haritada Dijkstra dalgası, sonra en ucuz yol */
  D.titlesp = function (root) {
    const W = 1280, H = 230, S = 16, C = Math.floor(W / S), R = Math.floor(H / S);
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let cost, dist, prev, thr, maxD, s, t, timer, running = false, hold = 0;
    const reset = () => {
      cost = new Float32Array(C * R); const cx = Math.random() * C, cy = Math.random() * R;
      for (let r = 0; r < R; r++) for (let q = 0; q < C; q++) { const n = Math.sin(q * 0.23 + cx) + Math.cos(r * 0.41 + cy) + Math.sin((q + r) * 0.11); cost[r * C + q] = n > 1.2 ? 8 : n > 0.4 ? 3 : 1; }
      s = Math.floor(R / 2) * C + 2; t = Math.floor(R / 2) * C + C - 3;
      dist = new Float64Array(C * R).fill(Infinity); prev = new Int32Array(C * R).fill(-1); dist[s] = 0;
      const h = new SL.MinHeap(); h.push([0, s]);
      while (h.size) { const [d, v] = h.pop(); if (d > dist[v]) continue; const q = v % C, r = (v - q) / C; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const x = q + a, y = r + b; if (x < 0 || y < 0 || x >= C || y >= R) return; const w = y * C + x, nd = d + cost[w]; if (nd < dist[w]) { dist[w] = nd; prev[w] = v; h.push([nd, w]); } }); }
      maxD = Math.max(...dist.filter(x => x < Infinity)); thr = 0; hold = 0;
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < C * R; i++) {
        const q = i % C, r = (i - q) / C;
        const base = cost[i] === 8 ? 'rgba(40,90,70,0.55)' : cost[i] === 3 ? 'rgba(110,100,50,0.45)' : 'rgba(60,70,110,0.25)';
        ctx.fillStyle = base; ctx.fillRect(q * S, r * S, S - 1, S - 1);
        if (dist[i] <= thr) { ctx.fillStyle = `hsla(${190 - (dist[i] / maxD) * 150},90%,60%,0.55)`; ctx.fillRect(q * S, r * S, S - 1, S - 1); }
      }
      if (thr >= dist[t]) { ctx.strokeStyle = '#ff5c7a'; ctx.lineWidth = 4; ctx.shadowColor = '#ff5c7a'; ctx.shadowBlur = 10; ctx.beginPath(); for (let x = t, k = 0; x !== -1; x = prev[x], k++) { const q = x % C, r = (x - q) / C; if (k) ctx.lineTo(q * S + S / 2, r * S + S / 2); else ctx.moveTo(q * S + S / 2, r * S + S / 2); } ctx.stroke(); ctx.shadowBlur = 0; }
    };
    const tick = () => { if (!running) return; if (thr < maxD) thr += maxD / 60; else if (++hold > 25) reset(); draw(); timer = setTimeout(tick, 60); };
    reset();
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
