/* "Minimum Yayılan Ağaçlar" destesine özel demolar (ortak: ../ortak/graf.js + mst.js) */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;
  /* Başlık: odalar ve aralarında tek tek kazılan MST koridorları */
  D.titlemst = function (root) {
    const W = 1280, H = 230;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let dg, tree, k, timer, running = false, hold = 0;
    const reset = () => { dg = SL.makeDungeon(W, H, 20); const uf = new SL.MiniUF(dg.rooms.length); tree = dg.cand.filter(e => uf.union(e.a, e.b)); k = 0; };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      tree.slice(0, k).forEach(e => { const A = dg.rooms[e.a], B = dg.rooms[e.b]; ctx.strokeStyle = 'rgba(255,200,110,0.85)'; ctx.lineWidth = 5; ctx.shadowColor = '#ffc86e'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(A.cx, A.cy); ctx.lineTo(B.cx, A.cy); ctx.lineTo(B.cx, B.cy); ctx.stroke(); });
      ctx.shadowBlur = 0;
      dg.rooms.forEach(r => { ctx.fillStyle = 'rgba(120,90,200,0.55)'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = 'rgba(200,180,255,0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(r.x, r.y, r.w, r.h); });
    };
    const tick = () => { if (!running) return; if (k < tree.length) k++; else if (++hold > 10) { hold = 0; reset(); } draw(); timer = setTimeout(tick, 300); };
    reset();
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
