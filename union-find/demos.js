/* =====================================================================
   demos.js — "Union–Find" destesine özel demolar
   (Ortak union–find bileşenleri ../ortak/birlesim.js içinde)
   ===================================================================== */
(function () {
  'use strict';
  const { el, btn } = SL;
  const D = window.DEMOS;
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);

  /* Başlık: noktalar birleşerek renk grupları oluşturuyor */
  D.titleuf = function (root) {
    const W = 1280, H = 230, N = 46;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let pts, uf, edges, timer, running = false, pause = 0;
    const reset = () => { pts = Array.from({ length: N }, () => ({ x: 40 + Math.random() * (W - 80), y: 20 + Math.random() * (H - 70) })); uf = new SL.UF(N); edges = []; };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      edges.forEach(([a, b]) => { ctx.strokeStyle = SL.ufColor(uf.find(a), true); ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke(); });
      ctx.globalAlpha = 1;
      pts.forEach((p, i) => { const col = SL.ufColor(uf.find(i), true); ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 7); ctx.fill(); });
      ctx.shadowBlur = 0; ctx.fillStyle = '#ffd84d'; ctx.font = '11px "Press Start 2P"'; ctx.textAlign = 'right'; ctx.fillText('BİLEŞEN: ' + uf.count, W - 20, H - 52);
    };
    const tick = () => {
      if (!running) return;
      if (pause > 0) { pause--; if (!pause) reset(); }
      else if (uf.count === 1) pause = 5;
      else {
        // yakın iki noktayı bağla (doğal görünsün)
        const a = rint(N); let best = -1, bd = 1e9;
        for (let b = 0; b < N; b++) if (b !== a && !uf.connected(a, b)) { const d = (pts[a].x - pts[b].x) ** 2 + (pts[a].y - pts[b].y) ** 2; if (d < bd) { bd = d; best = b; } }
        if (best >= 0) { uf.union(a, best); edges.push([a, best]); }
      }
      draw(); timer = setTimeout(tick, 380);
    };
    reset(); draw();
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };

  /* Go tahtası: taş grupları = bileşenler */
  D.go = function (root) {
    const N = 9, S = 44, W = N * S, H = N * S;
    const c = el('canvas', { style: 'cursor:pointer' }); const ctx = SL.setupCanvas(c, W, H);
    const info = el('div', { class: 'go-side' });
    let board, turn, caps, last;
    const reset = () => { board = Array(N * N).fill(0); turn = 1; caps = [0, 0, 0]; last = 'Kesişimlere tıklayarak sırayla siyah ve beyaz taş koyun.'; draw(); };
    const nb = i => { const x = i % N, y = Math.floor(i / N), r = []; if (x > 0) r.push(i - 1); if (x < N - 1) r.push(i + 1); if (y > 0) r.push(i - N); if (y < N - 1) r.push(i + N); return r; };
    const groups = () => {   // her hamlede union–find'ı baştan kur (UF silmeyi desteklemez!)
      const uf = new SL.UF(N * N);
      for (let i = 0; i < N * N; i++) if (board[i]) nb(i).forEach(j => { if (board[j] === board[i]) uf.union(i, j); });
      return uf;
    };
    const libs = (uf, r) => { const L = new Set(); for (let i = 0; i < N * N; i++) if (board[i] && uf.find(i) === r) nb(i).forEach(j => { if (!board[j]) L.add(j); }); return L.size; };
    const draw = () => {
      const t = T(), uf = groups();
      ctx.fillStyle = t.dark ? '#7a5a2a' : '#dcb36a'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#3b2a12'; ctx.lineWidth = 1.2;
      for (let i = 0; i < N; i++) { ctx.beginPath(); ctx.moveTo(S / 2, S / 2 + i * S); ctx.lineTo(W - S / 2, S / 2 + i * S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(S / 2 + i * S, S / 2); ctx.lineTo(S / 2 + i * S, H - S / 2); ctx.stroke(); }
      const roots = new Map();
      for (let i = 0; i < N * N; i++) if (board[i]) {
        const x = S / 2 + (i % N) * S, y = S / 2 + Math.floor(i / N) * S, r = uf.find(i);
        if (!roots.has(r)) roots.set(r, roots.size);
        ctx.fillStyle = board[i] === 1 ? '#111' : '#f5f5f5'; ctx.beginPath(); ctx.arc(x, y, S * 0.42, 0, 7); ctx.fill();
        ctx.strokeStyle = SL.ufColor(r, false); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, S * 0.42, 0, 7); ctx.stroke();
      }
      const list = [...roots.keys()].map(r => { let n = 0; for (let i = 0; i < N * N; i++) if (board[i] && uf.find(i) === r) n++; return { r, n, col: board[r], l: libs(uf, r) }; });
      info.innerHTML = `<div><b>Sıra:</b> ${turn === 1 ? '⚫ siyah' : '⚪ beyaz'} · esir: ⚫ ${caps[1]} · ⚪ ${caps[2]}</div><div class="mini">Gruplar (union–find bileşenleri) ve <b>özgürlükleri</b> (boş komşu sayısı):</div>` +
        list.map(g => `<div class="go-grp" style="border-color:${SL.ufColor(g.r, false)}">${g.col === 1 ? '⚫' : '⚪'} ${g.n} taş · özgürlük ${g.l}${g.l === 1 ? ' ⚠️ atari!' : ''}</div>`).join('') + `<div class="sv-note">${last}</div>`;
    };
    c.addEventListener('click', e => {
      const b = c.getBoundingClientRect(); const x = Math.floor(((e.clientX - b.left) / b.width) * N), y = Math.floor(((e.clientY - b.top) / b.height) * N), i = y * N + x;
      if (board[i]) return;
      board[i] = turn;
      let uf = groups(), captured = 0;
      nb(i).forEach(j => { if (board[j] && board[j] !== turn) { const r = uf.find(j); if (libs(uf, r) === 0) { for (let k = 0; k < N * N; k++) if (board[k] && uf.find(k) === r) { board[k] = 0; captured++; } uf = groups(); } } });
      uf = groups();
      if (libs(uf, uf.find(i)) === 0) { board[i] = 0; last = '🚫 İntihar hamlesi: kendi grubunun son özgürlüğünü dolduramazsın.'; draw(); return; }
      caps[turn] += captured;
      last = captured ? `💥 ${captured} taş esir alındı! (Grubun özgürlüğü 0’a düştü)` : `Taş kondu; aynı renkli komşularla <b>union</b> edildi.`;
      turn = 3 - turn; draw();
    });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('↺ Yeni oyun', reset, 'primary')), el('div', { class: 'go-wrap' }, c, info));
    SL.onTheme(draw); reset();
  };
})();
