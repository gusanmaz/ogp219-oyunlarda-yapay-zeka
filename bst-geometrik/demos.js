/* "BST'nin Geometrik Uygulamaları" destesine özel demolar (ortak: ../ortak/geometri.js) */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;
  /* Başlık: noktalar gelir, 2d-ağacı düzlemi dikey/yatay çizgilerle böler */
  D.titlekd = function (root) {
    const W = 1280, H = 250;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let kd, timer, running = false, pause = 0;
    const reset = () => { kd = new SL.KD(W, H); };
    reset();
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      kd.nodes.forEach((nd, i) => {
        const r = nd.rect, fresh = i === kd.nodes.length - 1;
        ctx.strokeStyle = nd.vert ? 'rgba(255,92,122,0.85)' : 'rgba(110,168,255,0.85)'; ctx.lineWidth = fresh ? 3 : 1.5;
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = fresh ? 12 : 0;
        ctx.beginPath(); if (nd.vert) { ctx.moveTo(nd.x, r[1]); ctx.lineTo(nd.x, r[3]); } else { ctx.moveTo(r[0], nd.y); ctx.lineTo(r[2], nd.y); } ctx.stroke();
      });
      ctx.shadowBlur = 0;
      kd.nodes.forEach(nd => { ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(nd.x, nd.y, 4, 0, 7); ctx.fill(); });
    };
    const tick = () => {
      if (!running) return;
      if (pause > 0) { pause--; if (!pause) reset(); }
      else if (kd.nodes.length >= 34) pause = 8;
      else kd.insertSilent(10 + Math.random() * (W - 20), 8 + Math.random() * (H - 16));
      draw();
      timer = setTimeout(tick, 330);
    };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
