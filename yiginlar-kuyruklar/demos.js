/* =====================================================================
   demos.js — "Yığınlar ve Kuyruklar" destesine özel demolar
   (Ortak yığın/kuyruk demoları ../ortak/yigin.js içinde)
   ===================================================================== */
(function () {
  'use strict';
  const { el, btn } = SL;
  const D = window.DEMOS;
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);

  /* ---------- Başlık: neon tabak yığını ---------- */
  D.titlestack = function (root) {
    const W = 1280, H = 220;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let st = [], timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      st.forEach((v, i) => {
        const y = 160 - i * 26, w = 220, x = W - 330;
        const col = `hsl(${280 - i * 25},90%,62%)`;
        ctx.shadowColor = col; ctx.shadowBlur = i === st.length - 1 ? 18 : 6;
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w, 20); ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = '700 14px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText(v, x + w / 2, y + 15);
      });
      ctx.fillStyle = '#ffd84d'; ctx.font = '11px "Press Start 2P"'; ctx.textAlign = 'left';
      if (st.length) ctx.fillText('← TOP', W - 100, 175 - (st.length - 1) * 26);
    };
    const tick = () => {
      if (!running) return;
      if (st.length < 3 || (st.length < 6 && Math.random() < 0.55)) st.push(['push', 'undo', 'call', 'menu', 'ctrl+z', 'f(x)'][rint(6)]);
      else st.pop();
      draw(); timer = setTimeout(tick, 700);
    };
    draw();
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };

  /* ---------- Geri al / yinele: iki yığın ---------- */
  D.undo = function (root) {
    const C = 10, R = 6, S = 46;
    const board = el('div', { class: 'undo-board', style: `grid-template-columns:repeat(${C},${S}px)` });
    const stacks = el('div', { class: 'undo-stacks' });
    const note = el('div', { class: 'sv-note' });
    let p, coins, undoS, redoS;
    const arrow = { '1,0': '→', '-1,0': '←', '0,1': '↓', '0,-1': '↑' };
    const reset = () => { p = { x: 1, y: 1 }; coins = new Set(['4,1', '7,2', '3,4', '8,4', '5,3']); undoS = []; redoS = []; note.textContent = 'Yön tuşlarıyla (düğmelerle) hareket edin, altınları toplayın. Sonra ↶ Geri al.'; draw(); };
    const draw = () => {
      board.innerHTML = '';
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
        const k = `${x},${y}`;
        board.append(el('div', { class: 'undo-cell' }, p.x === x && p.y === y ? '🧙' : coins.has(k) ? '🪙' : ''));
      }
      stacks.innerHTML = SL.stackHTML(undoS.map(m => arrow[m.d] + (m.coin ? ' 🪙' : '')), '↶ Geri al yığını', { hiTop: true }) + SL.stackHTML(redoS.map(m => arrow[m.d] + (m.coin ? ' 🪙' : '')), '↷ Yinele yığını');
    };
    const apply = (m, sign) => {
      const [dx, dy] = m.d.split(',').map(Number);
      p = { x: p.x + sign * dx, y: p.y + sign * dy };
      if (m.coin) { if (sign > 0) coins.delete(m.coin); else coins.add(m.coin); }
    };
    const move = (dx, dy) => {
      const nx = p.x + dx, ny = p.y + dy;
      if (nx < 0 || ny < 0 || nx >= C || ny >= R) return;
      const k = `${nx},${ny}`, m = { d: `${dx},${dy}`, coin: coins.has(k) ? k : null };
      apply(m, 1); undoS.push(m);
      const lost = redoS.length; redoS = [];
      note.textContent = `Hamle ${arrow[m.d]} geri al yığınına push edildi.` + (lost ? ` Yeni hamle yapıldığı için yinele yığını (${lost} hamle) silindi!` : '');
      draw();
    };
    const undo = () => { if (!undoS.length) { note.textContent = 'Geri alınacak hamle yok.'; return; } const m = undoS.pop(); apply(m, -1); redoS.push(m); note.textContent = `↶ ${arrow[m.d]} geri alındı (ters yönde hareket${m.coin ? ', altın geri kondu' : ''}) → yinele yığınına push`; draw(); };
    const redo = () => { if (!redoS.length) { note.textContent = 'Yinelenecek hamle yok.'; return; } const m = redoS.pop(); apply(m, 1); undoS.push(m); note.textContent = `↷ ${arrow[m.d]} yinelendi → geri al yığınına push`; draw(); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('←', () => move(-1, 0), 'pad'), btn('↑', () => move(0, -1), 'pad'), btn('↓', () => move(0, 1), 'pad'), btn('→', () => move(1, 0), 'pad'),
      btn('↶ Geri al (Ctrl+Z)', undo, 'primary'), btn('↷ Yinele (Ctrl+Y)', redo), btn('↺', reset)),
    el('div', { class: 'undo-wrap' }, board, stacks), note);
    reset();
  };

  /* ---------- RTS: waypoint kuyruğu ---------- */
  D.rts = function (root) {
    const W = 760, H = 380;
    const c = el('canvas', { style: 'cursor:crosshair' }); const ctx = SL.setupCanvas(c, W, H);
    const side = el('div', { class: 'rts-side' });
    let u, q, running = false, raf, trail;
    const reset = () => { u = { x: 80, y: 300 }; q = []; trail = []; draw(); };
    const draw = () => {
      const t = T();
      ctx.fillStyle = t.dark ? '#1c2617' : '#e8f0dc'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = t.muted; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(u.x, u.y); q.forEach(w => ctx.lineTo(w.x, w.y)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = t.dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)'; trail.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 7); ctx.fill(); });
      q.forEach((w, i) => {
        ctx.fillStyle = i === 0 ? t.green : t.blue; ctx.beginPath(); ctx.arc(w.x, w.y, 12, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 12px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i + 1, w.x, w.y + 1);
      });
      ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.font = '30px serif'; ctx.fillText('🪖', u.x, u.y);
      side.innerHTML = SL.queueHTML(q.map((w, i) => `${i + 1}`), '🎟️ Hedef kuyruğu') + `<p class="mini">Haritaya tıklayın → hedef kuyruğun <b>sonuna</b> eklenir (enqueue). Birim hep kuyruğun <b>başındaki</b> hedefe gider; varınca o hedef çıkar (dequeue).</p>`;
    };
    const step = () => {
      if (q.length) {
        const w = q[0], dx = w.x - u.x, dy = w.y - u.y, d = Math.hypot(dx, dy);
        if (d < 3) q.shift(); else { u.x += (dx / d) * Math.min(3, d); u.y += (dy / d) * Math.min(3, d); if (trail.length > 400) trail.shift(); trail.push({ x: u.x, y: u.y }); }
      }
      draw();
    };
    const loop = () => { if (!running) return; step(); raf = requestAnimationFrame(loop); };
    c.addEventListener('click', e => { const b = c.getBoundingClientRect(); q.push({ x: ((e.clientX - b.left) / b.width) * W, y: ((e.clientY - b.top) / b.height) * H }); draw(); });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      btn('🎲 3 rastgele hedef ekle', () => { for (let i = 0; i < 3; i++) q.push({ x: 60 + rint(W - 120), y: 40 + rint(H - 80) }); draw(); }, 'primary'),
      btn('🧹 Kuyruğu temizle', () => { q = []; draw(); }), btn('⏯ Oynat/Durdur', () => (running ? api.stop() : api.start())), btn('▶| Tek kare', () => { api.stop(); for (let i = 0; i < 10; i++) step(); }), btn('↺', reset)),
    el('div', { class: 'rts-wrap' }, c, side));
    SL.onTheme(draw); reset();
    const api = { start() { if (!running) { running = true; loop(); } }, stop() { running = false; cancelAnimationFrame(raf); } };
    return api;
  };
})();
