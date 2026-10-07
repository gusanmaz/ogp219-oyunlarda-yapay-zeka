/* "Öncelik Kuyrukları" destesine özel demolar (ortak: ../ortak/oncelik.js) */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;
  /* Başlık: sayılar yığına girip yukarı yüzüyor, kök arada bir çıkarılıyor */
  D.titleheap = function (root) {
    const W = 1280, H = 240;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let m = new SL.HeapModel(false), timer, running = false, tick = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const snap = m.snap(); if (!snap) return;
      const L = SL.layoutBinary(snap, W, H, { maxSp: 44, maxDy: 54, top: 24, bottom: 20, maxR: 16 });
      const st = [snap]; ctx.lineWidth = 2;
      while (st.length) { const x = st.pop(), p = L.pos.get(x.id); [x.l, x.r].forEach(q => { if (!q) return; const r = L.pos.get(q.id); ctx.strokeStyle = 'rgba(255,200,120,0.5)'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(r.x, r.y); ctx.stroke(); st.push(q); }); }
      L.pos.forEach(p => {
        const hue = 10 + (p.key / 99) * 50;
        ctx.shadowColor = `hsl(${hue},95%,60%)`; ctx.shadowBlur = p.d === 0 ? 22 : 8;
        ctx.fillStyle = `hsl(${hue},95%,${p.d === 0 ? 66 : 56}%)`; ctx.beginPath(); ctx.arc(p.x, p.y, L.r, 0, 7); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#1a0d05'; ctx.font = `700 ${Math.round(L.r * 0.9)}px "JetBrains Mono"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.key, p.x, p.y + 1);
      });
    };
    const step = () => {
      if (!running) return;
      tick++;
      if (m.n >= 25 || (m.n > 8 && tick % 3 === 0)) m.delTop(); else m.insert(1 + Math.floor(Math.random() * 99));
      draw(); timer = setTimeout(step, 420);
    };
    return { start() { if (!running) { running = true; step(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
