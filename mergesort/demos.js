/* "Mergesort" destesine özel demolar (ortak: ../ortak/mergesort.js) */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;
  /* Başlık: aşağıdan yukarı mergesort sonsuz döngüde */
  D.titlemerge = function (root) {
    const W = 1280, H = 220, N = 64;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let a, steps, k, timer, running = false;
    const reset = () => {
      a = SL.shuffle(Array.from({ length: N }, (_, i) => i + 1)); steps = []; const b = a.slice(), aux = new Array(N);
      for (let sz = 1; sz < N; sz *= 2) for (let lo = 0; lo < N - sz; lo += 2 * sz) {
        const mid = lo + sz - 1, hi = Math.min(lo + 2 * sz - 1, N - 1);
        for (let q = lo; q <= hi; q++) aux[q] = b[q];
        let i = lo, j = mid + 1;
        for (let q = lo; q <= hi; q++) { if (i > mid) b[q] = aux[j++]; else if (j > hi) b[q] = aux[i++]; else if (aux[j] < aux[i]) b[q] = aux[j++]; else b[q] = aux[i++]; }
        steps.push({ arr: b.slice(), lo, hi });
      }
      k = -8;
    };
    const draw = s => {
      ctx.clearRect(0, 0, W, H);
      const arr = s ? s.arr : a, bw = W / N;
      arr.forEach((v, i) => {
        const inR = s && i >= s.lo && i <= s.hi, h = (v / N) * (H - 40);
        ctx.fillStyle = `hsla(${200 + (v / N) * 120},90%,${inR ? 70 : 58}%,${inR ? 1 : 0.5})`;
        ctx.fillRect(i * bw + 2, H - h, bw - 4, h);
      });
    };
    const tick = () => { if (!running) return; k++; if (k >= steps.length + 10) reset(); draw(k >= 0 && k < steps.length ? steps[k] : k >= steps.length ? steps[steps.length - 1] : null); timer = setTimeout(tick, 220); };
    reset(); draw(null);
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
