/* "Quicksort" destesine özel demolar (ortak: ../ortak/quicksort.js) */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;
  /* Başlık: pivot etrafında bölümleme, sonsuz döngüde */
  D.titlequick = function (root) {
    const W = 1280, H = 220, N = 56;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let a, stack, timer, running = false, hl = null, pause = 0;
    const reset = () => { a = SL.shuffle(Array.from({ length: N }, (_, i) => i + 1)); stack = [[0, N - 1]]; hl = null; };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const bw = W / N;
      a.forEach((v, i) => {
        const inR = hl && i >= hl[0] && i <= hl[1], piv = hl && i === hl[2];
        ctx.fillStyle = piv ? '#ff5c7a' : `hsla(${30 + (v / N) * 60},95%,${inR ? 65 : 55}%,${inR ? 1 : 0.45})`;
        const h = (v / N) * (H - 40); ctx.fillRect(i * bw + 2, H - h, bw - 4, h);
      });
    };
    const tick = () => {
      if (!running) return;
      if (pause > 0) { pause--; if (!pause) reset(); }
      else if (!stack.length) { hl = null; pause = 8; }
      else {
        const [lo, hi] = stack.pop();
        if (hi > lo) {
          let i = lo, j = hi + 1; const v = a[lo];
          for (;;) { while (a[++i] < v) if (i === hi) break; while (v < a[--j]) if (j === lo) break; if (i >= j) break; [a[i], a[j]] = [a[j], a[i]]; }
          [a[lo], a[j]] = [a[j], a[lo]]; hl = [lo, hi, j]; stack.push([j + 1, hi], [lo, j - 1]);
        }
      }
      draw(); timer = setTimeout(tick, 260);
    };
    reset(); draw();
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
