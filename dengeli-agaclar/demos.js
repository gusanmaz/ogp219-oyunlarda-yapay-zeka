/* "Dengeli Arama Ağaçları" destesine özel demolar (ortak: ../ortak/dengeli.js) */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;
  /* Başlık: SIRALI anahtarlar eklense bile dengede kalan kırmızı-siyah ağaç */
  D.titlerb = function (root) {
    const W = 1280, H = 250;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let m, k, timer, running = false, pause = 0;
    const reset = () => { m = new SL.LLRB(); k = 1; };
    reset();
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const snap = m.snap(); if (!snap) return;
      const L = SL.layoutBinary(snap, W, H, { maxSp: 38, maxDy: 50, top: 22, bottom: 18, maxR: 12 });
      const st = [snap];
      while (st.length) {
        const x = st.pop(), p = L.pos.get(x.id);
        [x.l, x.r].forEach(q => {
          if (!q) return; const r = L.pos.get(q.id);
          ctx.lineWidth = q.red ? 4 : 2; ctx.strokeStyle = q.red ? 'rgba(255,80,110,0.95)' : 'rgba(180,170,230,0.55)';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(r.x, r.y); ctx.stroke(); st.push(q);
        });
      }
      L.pos.forEach(p => {
        ctx.shadowColor = '#ff5c7a'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#1a1424'; ctx.strokeStyle = '#ff9db0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, L.r, 0, 7); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(L.r * 0.85)}px "JetBrains Mono"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.key, p.x, p.y + 1);
      });
    };
    const tick = () => {
      if (!running) return;
      if (pause > 0) { pause--; if (!pause) reset(); }
      else if (k > 31) pause = 8;
      else m.insert(k++);
      draw();
      timer = setTimeout(tick, 380);
    };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
