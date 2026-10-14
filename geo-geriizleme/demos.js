/* "Geri İzleme: Envanter ve Bulmacalar" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS;
  const T = () => SL.theme();
  const big = C => { C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%'; };
  const clamp = SL.clamp;
  const keys = (isOn, list, onDown) => { window.addEventListener('keydown', e => { if (!isOn()) return; const k = e.key.toLowerCase(); if (!list.includes(k) || e.ctrlKey || e.metaKey || e.altKey) return; if (e.target && e.target.closest && e.target.closest('.CodeMirror, input, textarea, select')) return; e.preventDefault(); e.stopImmediatePropagation(); onDown(k); }, true); };
  const chk = (label, val, fn) => el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => fn(e.target.checked) }); x.checked = val; return x; })(), ' ' + label);
  const nf = n => n.toLocaleString('tr-TR');
  const txt = (ctx, str, x, y, color, size, bold) => { ctx.fillStyle = color; ctx.font = `${bold ? '700' : '500'} ${size}px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, x, y); };
  const PAL = ['#4c78d9', '#d9534c', '#3aa76d', '#e0a030', '#9159c9', '#2aa3a3', '#c9598f', '#7a8296'];

  /* ---------- çekirdek algoritmalar: her biri "olay" listesi üretir, demolar onu oynatır ---------- */
  const BT = {};
  BT.queens = (n, cap = 200000) => { const ev = [], q = []; let done = false; const ok = (r, c) => { for (let i = 0; i < r; i++) if (q[i] === c || Math.abs(q[i] - c) === r - i) return false; return true; };
    const go = r => { if (done || ev.length > cap) return; if (r === n) { ev.push(['solved']); done = true; return; } for (let c = 0; c < n && !done; c++) { if (ok(r, c)) { q[r] = c; ev.push(['place', r, c]); go(r + 1); if (!done) { ev.push(['remove', r, c]); q.length = r; } } else ev.push(['conflict', r, c]); } }; go(0); return ev; };
  BT.pack = (W, H, items, { rotate = true, cap = 300000 } = {}) => { const g = Array.from({ length: H }, () => Array(W).fill(-1)), ev = []; let done = false, nodes = 0;
    const cells = (it, rot) => rot ? it.cells.map(([x, y]) => [it.h - 1 - y, x]) : it.cells;
    const fits = (cs, ox, oy) => cs.every(([x, y]) => ox + x >= 0 && ox + x < W && oy + y >= 0 && oy + y < H && g[oy + y][ox + x] < 0);
    const put = (cs, ox, oy, v) => cs.forEach(([x, y]) => { g[oy + y][ox + x] = v; });
    const go = i => { if (done || nodes > cap) return; if (i === items.length) { done = true; ev.push(['solved']); return; } const it = items[i], rots = rotate && !it.sq ? [0, 1] : [0];
      for (const r of rots) { const cs = cells(it, r); for (let y = 0; y < H && !done; y++) for (let x = 0; x < W && !done; x++) if (fits(cs, x, y)) { nodes++; put(cs, x, y, i); ev.push(['place', i, x, y, r]); go(i + 1); if (!done) { put(cs, x, y, -1); ev.push(['remove', i, x, y, r]); } if (nodes > cap) return; } } };
    go(0); return { ev, ok: done, nodes }; };
  const rect = (name, w, h, col) => ({ name, w, h, col, sq: w === h, cells: Array.from({ length: w * h }, (_, k) => [k % w, Math.floor(k / w)]) });
  const shape = (name, rows, col) => { const cells = []; rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') cells.push([x, y]); })); return { name, w: rows[0].length, h: rows.length, col, cells }; };
  BT.sudoku = (str, mrv, cap = 400000) => { const g = [...str].map(ch => (ch === '.' ? 0 : +ch)), ev = []; let done = false, places = 0;
    const cand = i => { const r = Math.floor(i / 9), c = i % 9, used = new Set(); for (let k = 0; k < 9; k++) { used.add(g[r * 9 + k]); used.add(g[k * 9 + c]); } const br = r - r % 3, bc = c - c % 3; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) used.add(g[(br + y) * 9 + bc + x]); const out = []; for (let d = 1; d <= 9; d++) if (!used.has(d)) out.push(d); return out; };
    const pick = () => { let best = -1, bn = 10; for (let i = 0; i < 81; i++) if (!g[i]) { if (!mrv) return i; const n = cand(i).length; if (n < bn) { bn = n; best = i; } } return best; };
    const go = () => { if (done || places > cap) return; const i = pick(); if (i < 0) { done = true; ev.push(['solved']); return; } const cs = cand(i); if (!cs.length) { ev.push(['dead', i]); return; } for (const d of cs) { g[i] = d; places++; ev.push(['place', i, d]); go(); if (done) return; g[i] = 0; ev.push(['remove', i, d]); if (places > cap) return; } };
    go(); return { ev, ok: done, places, grid: g }; };
  BT.soko = (rows) => { const H = rows.length, W = rows[0].length, wall = [], goals = [], boxes = []; let player = 0; rows.forEach((r, y) => [...r].forEach((ch, x) => { const i = y * W + x; wall[i] = ch === '#'; if (ch === '.' || ch === '*' || ch === '+') goals.push(i); if (ch === '$' || ch === '*') boxes.push(i); if (ch === '@' || ch === '+') player = i; })); return { W, H, wall, goals, boxes: boxes.sort((a, b) => a - b), player }; };
  BT.sokoMove = (L, s, d) => { const dv = { w: -L.W, s: L.W, a: -1, d: 1 }[d], np = s.player + dv; if (L.wall[np]) return null; const bi = s.boxes.indexOf(np); if (bi < 0) return { player: np, boxes: s.boxes, pushed: false }; const nb = np + dv; if (L.wall[nb] || s.boxes.includes(nb)) return null; const boxes = s.boxes.slice(); boxes[bi] = nb; boxes.sort((a, b) => a - b); return { player: np, boxes, pushed: true, to: nb }; };
  BT.sokoSolved = (L, s) => s.boxes.every(b => L.goals.includes(b));
  BT.sokoSolve = (L, start, { prune = true, cap = 400000 } = {}) => { const key = s => s.player + '|' + s.boxes.join(','), dead = i => !L.goals.includes(i) && ((L.wall[i - 1] || L.wall[i + 1]) && (L.wall[i - L.W] || L.wall[i + L.W]));
    const seen = new Map([[key(start), null]]), q = [start]; let head = 0;
    while (head < q.length) { const s = q[head++]; if (BT.sokoSolved(L, s)) { const path = []; let k = key(s); while (seen.get(k)) { const [pk, d] = seen.get(k); path.push(d); k = pk; } return { ok: true, path: path.reverse(), explored: seen.size }; } if (seen.size > cap) break;
      for (const d of 'wasd') { const n = BT.sokoMove(L, s, d); if (!n) continue; if (prune && n.pushed && dead(n.to)) continue; const k = key(n); if (seen.has(k)) continue; seen.set(k, [key(s), d]); q.push(n); } }
    return { ok: false, path: [], explored: seen.size }; };
  SL.BT = BT; BT.rect = rect; BT.shape = shape;

  /* olay listesini oynatan ortak yürütücü */
  function player(getEv, apply, draw, o = {}) {
    const P = { i: 0, speed: o.speed || 8, timer: null, playing: false };
    P.reset = () => { P.i = 0; P.playing = false; };
    P.stepOne = () => { const ev = getEv(); if (P.i >= ev.length) return false; apply(ev[P.i++]); return true; };
    P.tick = () => { if (P.playing) { let n = P.speed >= 60 ? Math.ceil(P.speed * P.speed / 30) : 1, moved = false; P.frame = (P.frame || 0) + 1; if (P.speed < 60 && P.frame % Math.max(1, Math.round(60 / P.speed)) !== 0) n = 0; while (n-- > 0 && P.stepOne()) moved = true; if (P.i >= getEv().length) P.playing = false; } draw(); };
    P.start = () => { if (!P.timer) P.timer = setInterval(P.tick, 1000 / 60); };
    P.stop = () => { if (P.timer) { clearInterval(P.timer); P.timer = null; } };
    P.finish = () => { while (P.stepOne()); P.playing = false; };
    return P;
  }
  const speedSlider = P => slider('hız', 1, 240, P.speed, 1, v => { P.speed = v; });

  /* ================= 1) N vezir ================= */
  D.queens = function (root) {
    const W = 720, H = 340; let n = 6, ev = BT.queens(n), q = [], cur = null, cnt, solved;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const init = () => { q = []; cur = null; cnt = { place: 0, conflict: 0, remove: 0 }; solved = false; };
    const apply = e => { if (e[0] === 'solved') { solved = true; cur = null; SL.sfx && SL.sfx('alert'); return; } cnt[e[0]]++; cur = e; if (e[0] === 'place') q[e[1]] = e[2]; if (e[0] === 'remove') q.length = e[1]; };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const S = Math.floor(300 / n), ox = 20, oy = 20;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        let att = false; for (let i = 0; i < q.length; i++) if (i !== r && (q[i] === c || Math.abs(q[i] - c) === Math.abs(r - i))) att = true;
        ctx.fillStyle = (r + c) % 2 ? (t.dark ? '#3a3f55' : '#d9dbe6') : (t.dark ? '#2b2f42' : '#f2f3f8'); ctx.fillRect(ox + c * S, oy + r * S, S, S);
        if (att && r >= q.length) { ctx.fillStyle = 'rgba(217,83,76,0.22)'; ctx.fillRect(ox + c * S, oy + r * S, S, S); }
      }
      if (cur && cur[0] !== 'place') { ctx.strokeStyle = cur[0] === 'conflict' ? t.red : t.amber; ctx.lineWidth = 3; ctx.strokeRect(ox + cur[2] * S + 2, oy + cur[1] * S + 2, S - 4, S - 4); if (cur[0] === 'conflict') { ctx.beginPath(); ctx.moveTo(ox + cur[2] * S + 8, oy + cur[1] * S + 8); ctx.lineTo(ox + (cur[2] + 1) * S - 8, oy + (cur[1] + 1) * S - 8); ctx.stroke(); } }
      q.forEach((c, r) => { ctx.fillStyle = solved ? t.green : t.blue; ctx.beginPath(); ctx.arc(ox + c * S + S / 2, oy + r * S + S / 2, S * 0.32, 0, 7); ctx.fill(); txt(ctx, '♛', ox + c * S + S / 2, oy + r * S + S / 2 + 1, '#fff', Math.round(S * 0.42), true); });
      const bx = 350; let y = 30; const L = (s, c, o = {}) => { SL.drawLabel(ctx, s, bx, y, c || t.ink, { size: 12, align: 'left', ...o }); y += 22; };
      L(solved ? `✔ ${n} vezir yerleşti` : cur ? (cur[0] === 'place' ? `satır ${cur[1] + 1}: sütun ${cur[2] + 1} güvenli → yerleştir, alt satıra in` : cur[0] === 'conflict' ? `satır ${cur[1] + 1}: sütun ${cur[2] + 1} tehdit altında → atla` : `satır ${cur[1] + 2} çıkmaz sokak → satır ${cur[1] + 1}’deki veziri GERİ AL`) : 'başlamak için ▶', solved ? t.green : cur && cur[0] === 'remove' ? t.amber : t.ink, { bold: true });
      y += 6; L(`denenen kare: ${nf(cnt.place + cnt.conflict)}`); L(`   yerleştirilen: ${nf(cnt.place)}`, t.blue); L(`   tehdit altında bulunup atlanan: ${nf(cnt.conflict)}`, t.red); L(`geri alınan vezir: ${nf(cnt.remove)}`, t.amber);
      y += 6; L(`kaba kuvvet: ${n}^${n} = ${nf(Math.pow(n, n))} tahta`, t.muted); L('pembe kareler: şu anki vezirlerin tehdit ettiği yerler', t.muted, { size: 10 });
      info.innerHTML = `${n} × ${n} tahtaya ${n} veziri, hiçbiri öbürünü tehdit etmeyecek biçimde yerleştirin (aynı satır, sütun ve çapraz yasak). Algoritma satır satır iner: bulunduğu satırda soldan sağa ilk <b>güvenli</b> kareyi bulur, veziri koyar, alt satıra geçer. Bir satırda hiç güvenli kare kalmadıysa (<b>çıkmaz</b>) bir üst satıra döner, oradaki veziri <b>geri alır</b> ve bir sonraki sütunu dener. Hız sürgüsünü en sola çekip adım adım izleyin.`;
    };
    const P = player(() => ev, apply, draw, { speed: 6 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('N', 4, 10, n, 1, v => { n = v; ev = BT.queens(n); init(); P.reset(); }), speedSlider(P), btn('▶ / ⏸', () => { if (P.i >= ev.length) { init(); P.reset(); } P.playing = !P.playing; }), btn('⏭ tek adım', () => { P.playing = false; P.stepOne(); }), btn('↺ baştan', () => { init(); P.reset(); })), C, info);
    init(); draw(); SL.onTheme(draw);
    return { start: P.start, stop: P.stop };
  };

  /* ================= 2) çanta: eşyalar sığar mı? ================= */
  const BAGS = {
    silah: { ad: 'silah çantası (10 eşya, 40 kare)', items: () => [rect('tüfek', 6, 2, 0), rect('pompalı', 5, 2, 1), rect('tabanca', 2, 2, 2), rect('ilk yardım', 2, 2, 3), rect('bomba', 1, 2, 4), rect('bomba', 1, 2, 4), rect('mermi', 2, 1, 5), rect('mermi', 2, 1, 5), rect('ot', 1, 1, 6), rect('ot', 1, 1, 6)] },
    sekil: { ad: 'şekilli eşyalar (9 eşya, 39 kare)', items: () => [rect('pompalı', 5, 2, 1), rect('tüfek', 6, 1, 0), shape('anahtar', ['#.', '#.', '##'], 4), shape('kalkan', ['###', '.#.'], 3), shape('kanca', ['##.', '.##'], 6), rect('tabanca', 2, 2, 2), rect('ilk yardım', 2, 2, 5), rect('mermi', 2, 1, 7), rect('ot', 1, 1, 7)] },
    sigmaz: { ad: 'sığmayan (4 eşya, 37 kare)', items: () => [rect('tüfek', 6, 2, 0), rect('pompalı', 5, 2, 1), rect('roketatar', 7, 2, 4), rect('ot', 1, 1, 6)] }
  };
  BT.BAGS = BAGS;
  BT.order = (items, how) => { const it = items.slice(); if (how === 'small') it.sort((a, b) => a.cells.length - b.cells.length); if (how === 'big') it.sort((a, b) => b.cells.length - a.cells.length); return it; };
  D.bag = function (root) {
    const W = 720, H = 340, GW = 8, GH = 5, S = 48; let bag = 'silah', order = 'small', rot = true, items, res, grid, cnt, cur, state;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const cellsOf = (it, r) => (r ? it.cells.map(([x, y]) => [it.h - 1 - y, x]) : it.cells);
    const init = () => { items = BT.order(BAGS[bag].items(), order); res = BT.pack(GW, GH, items, { rotate: rot }); grid = Array.from({ length: GH }, () => Array(GW).fill(-1)); cnt = { place: 0, remove: 0 }; cur = null; state = 'idle'; };
    const apply = e => { if (e[0] === 'solved') { state = 'ok'; SL.sfx && SL.sfx('alert'); return; } cnt[e[0]]++; cur = e; const it = items[e[1]]; cellsOf(it, e[4]).forEach(([x, y]) => { grid[e[3] + y][e[2] + x] = e[0] === 'place' ? e[1] : -1; }); };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const ox = 16, oy = 16;
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const v = grid[y][x]; ctx.fillStyle = v < 0 ? (t.dark ? '#2b2f42' : '#eceef4') : PAL[items[v].col]; ctx.fillRect(ox + x * S + 1, oy + y * S + 1, S - 2, S - 2); if (v >= 0) { const same = (dx, dy) => y + dy >= 0 && y + dy < GH && x + dx >= 0 && x + dx < GW && grid[y + dy][x + dx] === v; ctx.fillStyle = PAL[items[v].col]; if (same(1, 0)) ctx.fillRect(ox + x * S + S - 2, oy + y * S + 1, 4, S - 2); if (same(0, 1)) ctx.fillRect(ox + x * S + 1, oy + y * S + S - 2, S - 2, 4); } }
      const placed = new Set(grid.flat().filter(v => v >= 0));
      placed.forEach(v => { let sx = 0, sy = 0, n = 0; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (grid[y][x] === v) { sx += x; sy += y; n++; } if (n >= 2) txt(ctx, items[v].name, ox + (sx / n + 0.5) * S, oy + (sy / n + 0.5) * S, '#fff', 10, true); });
      const bx = 420; let y = 26; SL.drawLabel(ctx, 'sıradaki eşyalar (bu sırayla denenir):', bx, y, t.muted, { size: 10, align: 'left' }); y += 16;
      items.forEach((it, i) => { const on = placed.has(i); ctx.fillStyle = PAL[it.col]; ctx.globalAlpha = on ? 0.3 : 1; ctx.fillRect(bx, y - 7, 14, 14); ctx.globalAlpha = 1; SL.drawLabel(ctx, `${i + 1}. ${it.name} (${it.cells.length} kare)${on ? ' ✓' : ''}`, bx + 22, y, on ? t.muted : t.ink, { size: 11, align: 'left', bold: cur && cur[1] === i }); y += 18; });
      y = Math.max(y + 10, 230); const L = (s, c, o = {}) => { SL.drawLabel(ctx, s, bx, y, c || t.ink, { size: 12, align: 'left', ...o }); y += 20; };
      L(state === 'ok' ? '✔ HEPSİ SIĞDI' : state === 'fail' ? '✘ SIĞMIYOR: bütün yerleşimler denendi' : state === 'cap' ? '… 300.000 denemede bulunamadı (durduruldu)' : cur ? (cur[0] === 'place' ? `“${items[cur[1]].name}” yerleştirildi` : `“${items[cur[1]].name}” geri alındı`) : 'başlamak için ▶', state === 'ok' ? t.green : state === 'idle' ? (cur && cur[0] === 'remove' ? t.amber : t.ink) : t.red, { bold: true });
      L(`yerleştirme denemesi: ${nf(cnt.place)} / ${nf(res.nodes)}`); L(`geri alma: ${nf(cnt.remove)}`, t.amber);
      info.innerHTML = `8 × 5’lik çanta ve bir yığın eşya: <b>hepsi sığar mı?</b> Algoritma eşyaları sırayla alır; her eşya için çantayı soldan sağa, yukarıdan aşağı tarar${rot ? ' (önce yatık, sonra 90° döndürülmüş)' : ''} ve sığdığı <b>ilk</b> yere koyar, sıradaki eşyaya geçer. Bir eşya hiçbir yere sığmıyorsa bir önceki eşyayı <b>geri alıp</b> onu bir sonraki uygun yere taşır. Sıra seçimi her şeyi değiştirir: bu çanta için <b>${order === 'big' ? 'büyükten küçüğe' : order === 'small' ? 'küçükten büyüğe' : 'verilen sırayla'}</b> ${nf(res.nodes)}${res.nodes > 300000 ? '+' : ''} deneme ${res.ok ? 'ile çözülüyor' : res.nodes > 300000 ? 'yetmiyor' : 'sonunda “sığmaz” deniyor'}.`;
    };
    const P = player(() => res.ev, apply, () => { if (P.i >= res.ev.length && state === 'idle' && P.i > 0) state = res.ok ? 'ok' : res.nodes > 300000 ? 'cap' : 'fail'; draw(); }, { speed: 10 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Çanta: ', select(Object.fromEntries(Object.entries(BAGS).map(([k, v]) => [k, v.ad])), bag, v => { bag = v; init(); P.reset(); })), el('label', { class: 'ctl' }, 'Sıra: ', select({ small: 'küçükten büyüğe', big: 'büyükten küçüğe', given: 'verilen sırayla' }, order, v => { order = v; init(); P.reset(); })), chk('döndürmek serbest', true, v => { rot = v; init(); P.reset(); })),
      el('div', { class: 'sv-controls' }, speedSlider(P), btn('▶ / ⏸', () => { if (P.i >= res.ev.length) { init(); P.reset(); } P.playing = !P.playing; }), btn('⏭ tek adım', () => { P.playing = false; P.stepOne(); }), btn('⏩ sonuna git', () => P.finish()), btn('↺ baştan', () => { init(); P.reset(); })), C, info);
    init(); draw(); SL.onTheme(draw);
    return { start: P.start, stop: P.stop };
  };

  /* ================= 3) sudoku: hangi hücreyle başlamalı? ================= */
  const SUD = { gazete: { ad: 'gazete bulmacası (30 ipucu)', s: '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79' }, zor: { ad: 'kaba kuvvete karşı tasarlanmış (17 ipucu)', s: '..............3.85..1.2.......5.7.....4...1...9.......5......73..2.1........4...9' } };
  BT.SUD = SUD;
  D.sudoku = function (root) {
    const W = 720, H = 340; let pz = 'gazete', mrv = false, res, g, given, cnt, cur, state;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const init = () => { const s = SUD[pz].s; res = BT.sudoku(s, mrv); g = [...s].map(ch => (ch === '.' ? 0 : +ch)); given = g.map(v => v > 0); cnt = { place: 0, remove: 0, dead: 0 }; cur = null; state = 'idle'; };
    const apply = e => { if (e[0] === 'solved') { state = 'ok'; SL.sfx && SL.sfx('alert'); return; } cnt[e[0]]++; cur = e; if (e[0] === 'place') g[e[1]] = e[2]; if (e[0] === 'remove') g[e[1]] = 0; };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const S = 34, ox = 16, oy = 16;
      for (let i = 0; i < 81; i++) { const r = Math.floor(i / 9), c = i % 9, x = ox + c * S, y = oy + r * S; ctx.fillStyle = cur && cur[1] === i && state === 'idle' ? (cur[0] === 'place' ? 'rgba(58,167,109,0.3)' : 'rgba(217,83,76,0.3)') : ((Math.floor(r / 3) + Math.floor(c / 3)) % 2 ? (t.dark ? '#33374a' : '#eceef4') : (t.dark ? '#2b2f42' : '#f7f8fb')); ctx.fillRect(x, y, S - 1, S - 1); if (g[i]) txt(ctx, String(g[i]), x + S / 2, y + S / 2 + 1, given[i] ? t.ink : (state === 'ok' ? t.green : t.blue), 16, given[i]); }
      ctx.strokeStyle = t.ink; ctx.lineWidth = 2; for (let k = 0; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(ox + k * 3 * S - 1, oy - 1); ctx.lineTo(ox + k * 3 * S - 1, oy + 9 * S - 1); ctx.moveTo(ox - 1, oy + k * 3 * S - 1); ctx.lineTo(ox + 9 * S - 1, oy + k * 3 * S - 1); ctx.stroke(); }
      const bx = 350; let y = 30; const L = (s, c, o = {}) => { SL.drawLabel(ctx, s, bx, y, c || t.ink, { size: 12, align: 'left', ...o }); y += 22; };
      L(mrv ? 'Sıradaki hücre: EN AZ SEÇENEĞİ olan boş hücre' : 'Sıradaki hücre: soldan sağa İLK boş hücre', t.ink, { bold: true });
      L(state === 'ok' ? '✔ çözüldü' : state === 'cap' ? '… 400.000 denemede çözemedi (durduruldu)' : cur ? (cur[0] === 'place' ? `satır ${Math.floor(cur[1] / 9) + 1}, sütun ${cur[1] % 9 + 1} ← ${cur[2]}` : cur[0] === 'remove' ? `satır ${Math.floor(cur[1] / 9) + 1}, sütun ${cur[1] % 9 + 1}: ${cur[2]} olmadı, geri al` : 'bu hücreye hiçbir rakam uymuyor: çıkmaz') : 'başlamak için ▶', state === 'ok' ? t.green : state === 'cap' ? t.red : t.ink);
      y += 6; L(`rakam yerleştirme: ${nf(cnt.place)} / ${nf(res.places)}${res.ok ? '' : '+'}`, t.blue); L(`geri alma: ${nf(cnt.remove)}`, t.amber); L(`çıkmaz: ${nf(cnt.dead)}`, t.red);
      y += 6; L('kalın siyah: verilen ipuçları · mavi: algoritmanın denediği', t.muted, { size: 10 });
      info.innerHTML = `Aynı geri izleme, tek fark: sıradaki boş hücre <b>nasıl seçiliyor</b>? “İlk boş hücre” soldan sağa gider; seçenekleri bol bir hücrede yanlış tahmin yapar ve hatayı satırlar sonra fark eder. “En az seçenekli hücre” önce <b>en dar boğazı</b> doldurur: tek seçeneği olan hücrede tahmin yoktur, yanlış dalın tamamı hiç açılmaz. Bu bulmacada ilk boş hücre <b>${nf(SUD[pz].s === SUD.gazete.s ? 4208 : 400000)}${pz === 'zor' ? '+' : ''}</b>, en az seçenekli <b>${pz === 'gazete' ? 51 : nf(45267)}</b> yerleştirme yapar.`;
    };
    const P = player(() => res.ev, apply, () => { if (P.i >= res.ev.length && state === 'idle' && P.i > 0 && !res.ok) state = 'cap'; draw(); }, { speed: 30 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Bulmaca: ', select(Object.fromEntries(Object.entries(SUD).map(([k, v]) => [k, v.ad])), pz, v => { pz = v; init(); P.reset(); })), el('label', { class: 'ctl' }, 'Hücre seçimi: ', select({ ilk: 'ilk boş hücre', mrv: 'en az seçenekli hücre' }, 'ilk', v => { mrv = v === 'mrv'; init(); P.reset(); }))),
      el('div', { class: 'sv-controls' }, speedSlider(P), btn('▶ / ⏸', () => { if (P.i >= res.ev.length) { init(); P.reset(); } P.playing = !P.playing; }), btn('⏭ tek adım', () => { P.playing = false; P.stepOne(); }), btn('⏩ sonuna git', () => P.finish()), btn('↺ baştan', () => { init(); P.reset(); })), C, info);
    init(); draw(); SL.onTheme(draw);
    return { start: P.start, stop: P.stop };
  };

  /* ================= 4) Sokoban: oyna, geri al, çözdür ================= */
  const SOKO = { orta: ['#########', '#   #   #', '# $   $ #', '#.#@#.# #', '# $   . #', '#   #   #', '#########'], kolay: ['########', '#  .   #', '# $$   #', '#  @ $.#', '#  .   #', '########'], zor: ['########', '#   #  #', '# $ $  #', '#.#@#. #', '#  $ . #', '#      #', '########'] };
  BT.SOKO = SOKO;
  function makeSoko(name, o = {}) {
    const G = { name, sound: !!o.sound };
    G.load = nm => { G.name = nm; G.L = BT.soko(SOKO[nm]); G.s = { player: G.L.player, boxes: G.L.boxes.slice() }; G.undo = []; G.moves = 0; G.sol = null; G.auto = null; G.hint = null; };
    G.move = d => { const n = BT.sokoMove(G.L, G.s, d); if (!n) return false; G.undo.push(G.s); G.s = { player: n.player, boxes: n.boxes }; G.moves++; G.hint = null; if (G.sound) SL.sfx(n.pushed ? 'knock' : 'waka'); if (G.sound && BT.sokoSolved(G.L, G.s)) SL.sfx('alert'); return true; };
    G.back = () => { if (!G.undo.length) return false; G.s = G.undo.pop(); G.moves++; G.hint = null; return true; };
    G.solve = prune => { G.sol = BT.sokoSolve(G.L, G.s, { prune }); return G.sol; };
    G.stuck = () => { const dead = i => !G.L.goals.includes(i) && ((G.L.wall[i - 1] || G.L.wall[i + 1]) && (G.L.wall[i - G.L.W] || G.L.wall[i + G.L.W])); return G.s.boxes.some(dead); };
    G.load(name); return G;
  }
  SL.makeSoko = makeSoko;
  D.sokoban = function (root) {
    const W = 720, H = 340, G = makeSoko('orta', { sound: true }); let timer = null, prune = true, autoT = 0, msg = '';
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(), L = G.L, S = Math.min(44, Math.floor(300 / L.H)), ox = 16, oy = 16; ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < L.W * L.H; i++) { const x = ox + (i % L.W) * S, y = oy + Math.floor(i / L.W) * S; ctx.fillStyle = L.wall[i] ? (t.dark ? '#5a5f78' : '#6b7190') : (t.dark ? '#2b2f42' : '#f2f3f8'); ctx.fillRect(x, y, S - 1, S - 1); if (L.goals.includes(i)) { ctx.strokeStyle = t.green; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + S / 2, y + S / 2, S * 0.2, 0, 7); ctx.stroke(); } }
      G.s.boxes.forEach(b => { const x = ox + (b % L.W) * S, y = oy + Math.floor(b / L.W) * S, on = L.goals.includes(b); ctx.fillStyle = on ? t.green : t.amber; ctx.fillRect(x + 5, y + 5, S - 11, S - 11); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(x + 5, y + 5, S - 11, S - 11); });
      { const p = G.s.player, x = ox + (p % L.W) * S, y = oy + Math.floor(p / L.W) * S; ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(x + S / 2, y + S / 2, S * 0.33, 0, 7); ctx.fill(); if (G.hint) { const dv = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[G.hint]; ctx.strokeStyle = t.red; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + S / 2, y + S / 2); ctx.lineTo(x + S / 2 + dv[0] * S * 0.8, y + S / 2 + dv[1] * S * 0.8); ctx.stroke(); } }
      const bx = ox + L.W * S + 24; let y = 28; const Ln = (s, c, o = {}) => { SL.drawLabel(ctx, s, bx, y, c || t.ink, { size: 12, align: 'left', ...o }); y += 21; };
      const done = BT.sokoSolved(L, G.s);
      Ln(done ? '✔ ÇÖZÜLDÜ!' : G.stuck() ? '⚠️ bir kutu köşeye sıkıştı: çözüm yok. Z ile geri alın.' : 'W / A / S / D: yürü, kutuyu it', done ? t.green : G.stuck() ? t.red : t.ink, { bold: true });
      Ln(`hamle: ${G.moves} · geri alma yığını: ${G.undo.length} durum`); Ln('Z: son hamleyi geri al · R: baştan', t.muted, { size: 11 });
      y += 8; if (G.sol) { Ln(G.sol.ok ? `çözücü: buradan en kısa çözüm ${G.sol.path.length} hamle` : 'çözücü: bu durumdan çözüm YOK', G.sol.ok ? t.green : t.red, { bold: true }); Ln(`taranan durum: ${nf(G.sol.explored)} (${prune ? 'köşe budamasıyla' : 'budamasız'})`); if (G.sol.ok) { const s = G.sol.path.join('').toUpperCase(); Ln(s.slice(0, 30), t.muted, { size: 11 }); if (s.length > 30) Ln(s.slice(30, 60), t.muted, { size: 11 }); } } else Ln('“çöz”e basın: bilgisayar bütün durumları tarasın', t.muted, { size: 11 });
      if (msg) Ln(msg, t.amber, { size: 11 });
      info.innerHTML = `Mavi daire sizsiniz; sarı kutuları yeşil halkalara itin (çekemezsiniz; iki kutuyu birden itemezsiniz). Her hamlenizde oyun önceki durumu bir <b>yığına</b> koyar: <b>Z</b> yığından geri alır. Bu, sizin elle yaptığınız geri izlemedir. <b>“🤖 çöz”</b> aynısını makineye yaptırır: bulunduğunuz durumdan ulaşılabilen bütün durumları (oyuncunun yeri + kutuların yeri) genişlik öncelikli tarar, gördüklerini bir kümede tutar ve en kısa çözümü bulur. Köşe budaması, hedef olmayan bir köşeye kutu iten hamleleri hiç denemez.`;
    };
    const tick = () => { if (G.auto && G.auto.length) { if (++autoT % 9 === 0) { G.move(G.auto.shift()); } } draw(); };
    const start = () => { if (!timer) timer = setInterval(tick, 1000 / 60); }, stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    keys(() => !!timer, ['w', 'a', 's', 'd', 'z', 'r'], k => { G.auto = null; msg = ''; if (k === 'z') { if (G.back()) { G.sol = null; SL.sfx && SL.sfx('knock'); } } else if (k === 'r') G.load(G.name); else if (G.move(k)) G.sol = null; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Seviye: ', select({ kolay: 'kolay (13 hamle)', orta: 'orta (25 hamle)', zor: 'zor (27 hamle)' }, 'orta', v => { G.load(v); msg = ''; })), chk('köşe budaması', true, v => { prune = v; G.sol = null; }), btn('🤖 çöz', () => { G.solve(prune); msg = ''; }), btn('💡 ipucu', () => { const r = G.solve(prune); G.hint = r.ok && r.path.length ? r.path[0] : null; msg = r.ok ? '' : 'buradan çözüm yok: geri alın'; }), btn('▶ çözümü oynat', () => { const r = G.solve(prune); if (r.ok) G.auto = r.path.slice(); })), C, info);
    draw(); SL.onTheme(draw); SL._soko = G;
    return { start, stop };
  };

  /* ---------- simlab: eşya buraya sığar mı? ---------- */
  SL.SIMLABS.fits = function (box, api) {
    const W = 520, H = 280, GW = 8, GH = 5, S = 40;
    let fn = null, err = null, items, grid, i, pos, t, bad, done;
    const ref = (g, w, h, x, y) => { if (x < 0 || y < 0 || x + w > g[0].length || y + h > g.length) return false; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g[yy][xx] !== 0) return false; return true; };
    const fresh = () => { items = [[6, 2], [5, 2], [2, 2], [2, 2], [2, 1], [2, 1], [1, 2], [1, 2], [1, 1], [1, 1]]; grid = Array.from({ length: GH }, () => Array(GW).fill(0)); i = 0; pos = 0; t = 0; bad = null; done = false; err = null; };
    fresh();
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt) {
        if (!fn || err || bad || done) return; t += dt; if (t < 0.03) return; t = 0;
        if (i >= items.length) { done = true; return; }
        const [iw, ih] = items[i]; if (pos >= GW * GH) { done = true; return; } const x = pos % GW, y = Math.floor(pos / GW);
        let got; try { got = !!fn(grid.map(r => r.slice()), iw, ih, x, y); } catch (e) { err = SL.jsErrorText(e); return; }
        const want = ref(grid, iw, ih, x, y);
        if (got !== want) { bad = { x, y, w: iw, h: ih, got }; return; }
        if (want) { for (let yy = y; yy < y + ih; yy++) for (let xx = x; xx < x + iw; xx++) grid[yy][xx] = i + 1; i++; pos = 0; } else pos++;
      },
      render(ctx, w, t) {
        const ox = 20, oy = 34;
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const v = grid[y][x]; ctx.fillStyle = v ? PAL[(v - 1) % 8] : (t.dark ? '#2b2f42' : '#eceef4'); ctx.fillRect(ox + x * S + 1, oy + y * S + 1, S - 2, S - 2); }
        if (fn && !done && i < items.length) { const [iw, ih] = items[i], x = pos % GW, y = Math.floor(pos / GW); ctx.strokeStyle = bad ? t.red : t.ink; ctx.lineWidth = 3; ctx.setLineDash(bad ? [] : [5, 4]); ctx.strokeRect(ox + x * S, oy + y * S, iw * S, ih * S); ctx.setLineDash([]); }
        SL.drawLabel(ctx, err ? '⚠️ ' + err : bad ? `❌ ${bad.w}×${bad.h} eşya (${bad.x}, ${bad.y})’ye: kodunuz “${bad.got ? 'sığar' : 'sığmaz'}” dedi; doğrusu tersi` : done ? `✔ ${i} eşya yerleşti` : fn ? `sıradaki eşya ${items[i][0]}×${items[i][1]}: uygun yer aranıyor…` : 'Kodu çalıştırın', 8, 14, err || bad ? t.red : done ? t.green : t.muted, { size: 11, align: 'left' });
        SL.drawLabel(ctx, 'kesikli çerçeve: şu an sınanan konum', ox + GW * S + 16, oy + 10, t.muted, { size: 10, align: 'left' });
      },
      reset() { fresh(); }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w,
      setFns(f) { fn = f.fits; fresh(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try {
          const g = [[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]];
          for (const [w2, h2, x, y] of [[1, 1, 0, 0], [1, 1, 1, 1], [2, 1, 0, 0], [2, 1, 0, 1], [4, 1, 0, 0], [4, 1, 0, 2], [5, 1, 0, 0], [1, 3, 0, 0], [1, 3, 3, 0], [1, 3, 1, 0], [1, 2, 3, 2], [2, 2, 2, 2], [1, 1, 4, 0], [1, 1, 0, 3], [1, 1, -1, 0], [2, 2, 2, 0]]) { const got = !!mod.fits(g.map(r => r.slice()), w2, h2, x, y), want = ref(g, w2, h2, x, y); if (got !== want) return { ok: false, msg: `❌ Izgara 4×3, (1,1) ve (2,1) dolu. ${w2}×${h2} eşya, sol üst köşesi (${x}, ${y}): beklenen ${want ? 'sığar' : 'sığmaz'}. ${want ? '' : (x < 0 || y < 0 || x + w2 > 4 || y + h2 > 3) ? 'Eşya ızgaranın dışına taşıyor: x + w ≤ genişlik ve y + h ≤ yükseklik olmalı.' : 'Kapladığı hücrelerden biri dolu: w × h hücrenin hepsine bakın.'}` }; }
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Doğru. Sağda aynı fonksiyon on eşyayı büyükten küçüğe çantaya diziyor: her eşya için sığdığı ilk yer.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  SL.AILABS.safe = {
    fn: 'safe', jsFn: 'safe', tol: 0, ref: (q, r, c) => q.every((qc, i) => qc !== c && Math.abs(qc - c) !== r - i),
    cases: () => [[[], 0, 0], [[0], 1, 0], [[0], 1, 1], [[0], 1, 2], [[1, 3], 2, 0], [[1, 3], 2, 2], [[1, 3], 2, 1], [[1, 3, 0], 3, 2], [[0, 2], 2, 4], [[0, 2], 2, 1], [[0, 2], 2, 3], [[3, 1], 2, 4], [[0, 4, 7, 5, 2, 6, 1], 7, 3]],
    show: (q, r, c) => `önceki satırlardaki vezirlerin sütunları ${JSON.stringify(q)} · yeni vezir: satır ${r}, sütun ${c}`,
    hint: (q, r, c) => `Her önceki vezir (satır i, sütun queens[i]) için iki sınama: aynı sütun mu (queens[i] === col)? Aynı çaprazda mı (sütun farkının mutlak değeri, satır farkına eşit mi: Math.abs(queens[i] − col) === row − i)? Biri bile tutarsa false.`
  };
  SL.AILABS.nqueens = {
    fn: 'count_queens', jsFn: 'countQueens', tol: 0,
    ref: n => { let cnt = 0; const q = []; const go = r => { if (r === n) { cnt++; return; } for (let c = 0; c < n; c++) if (q.every((qc, i) => qc !== c && Math.abs(qc - c) !== r - i)) { q.push(c); go(r + 1); q.pop(); } }; go(0); return cnt; },
    cases: () => [[1], [2], [3], [4], [5], [6], [7], [8]],
    show: n => `N = ${n}`,
    hint: n => `Bilinen cevaplar: N = 1 → 1, 2 → 0, 3 → 0, 4 → 2, 5 → 10, 6 → 4, 7 → 40, 8 → 92. Kalıp: yerleştir(satır): satır == n ise sayacı artır; değilse her sütun için güvenliyse → ekle, yerleştir(satır + 1), ÇIKAR (geri al).`
  };
  SL.AILABS.cands = {
    fn: 'candidates', jsFn: 'candidates', tol: 0,
    ref: (g, r, c) => { const used = new Set(); for (let k = 0; k < 9; k++) { used.add(g[r][k]); used.add(g[k][c]); } const br = r - r % 3, bc = c - c % 3; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) used.add(g[br + y][bc + x]); const out = []; for (let d = 1; d <= 9; d++) if (!used.has(d)) out.push(d); return out; },
    cases: () => { const s = SUD.gazete.s, g = []; for (let r = 0; r < 9; r++) g.push([...s.slice(r * 9, r * 9 + 9)].map(ch => (ch === '.' ? 0 : +ch))); return [[g, 0, 2], [g, 4, 4], [g, 0, 3], [g, 8, 0], [g, 6, 8], [g, 2, 0], [g, 4, 1], [g, 7, 7]]; },
    show: (g, r, c) => `klasik gazete bulmacası · hücre: satır ${r}, sütun ${c} (0’dan sayarak)`,
    hint: (g, r, c) => `Üç yere bakın: ${r}. satırın tamamı, ${c}. sütunun tamamı ve hücrenin 3×3 kutusu (sol üst köşesi satır ${r - r % 3}, sütun ${c - c % 3}). Buralarda geçen rakamları bir kümeye atın; 1–9 içinden kümede OLMAYANLARI küçükten büyüğe döndürün.`
  };
  SL.AILABS.knap = {
    fn: 'best_loot', jsFn: 'bestLoot', tol: 0,
    ref: (items, cap) => { let best = 0; const go = (i, w, v) => { if (w > cap) return; if (v > best) best = v; if (i === items.length) return; go(i + 1, w + items[i][0], v + items[i][1]); go(i + 1, w, v); }; go(0, 0, 0); return best; },
    cases: () => [[[[6, 30], [5, 20], [5, 20]], 10], [[[6, 30], [5, 20], [5, 20]], 9], [[[1, 1]], 0], [[], 10], [[[2, 3], [3, 4], [4, 5], [5, 6]], 5], [[[10, 60], [20, 100], [30, 120]], 50], [[[3, 4], [4, 5], [2, 3]], 7], [[[1, 10], [1, 10], [1, 10], [8, 5]], 3], [[[5, 10], [4, 40], [6, 30], [3, 50]], 10]],
    show: (items, cap) => `eşyalar [ağırlık, değer]: ${JSON.stringify(items)} · taşıma kapasitesi ${cap}`,
    hint: () => `Her eşya için iki dal: AL (ağırlık kapasiteyi aşmıyorsa) ya da ALMA. dene(i, kalan): i == eşya sayısı ise 0; almadan = dene(i + 1, kalan); alarak = (ağırlık ≤ kalan ise) değer + dene(i + 1, kalan − ağırlık); büyüğünü döndür.`
  };

  /* ---------- başlık ---------- */
  D.titlegeo8 = function (root) {
    const W = 1280, H = 230, cv = el('canvas'); root.append(cv);
    const ctx = SL.setupCanvas(cv, W, H); let timer, running = false, n = 6, ev = BT.queens(8), i = 0, q = [];
    const tick = () => { if (!running) return; const e = ev[i++]; if (!e || e[0] === 'solved') { if (i > ev.length + 40) { i = 0; q = []; } } else if (e[0] === 'place') q[e[1]] = e[2]; else if (e[0] === 'remove') q.length = e[1];
      ctx.clearRect(0, 0, W, H); const S = 24, ox = 1010, oy = 18; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { ctx.fillStyle = (r + c) % 2 ? 'rgba(160,200,255,0.16)' : 'rgba(160,200,255,0.06)'; ctx.fillRect(ox + c * S, oy + r * S, S, S); } q.forEach((c, r) => { ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(ox + c * S + S / 2, oy + r * S + S / 2, 8, 0, 7); ctx.fill(); });
      timer = setTimeout(tick, 60); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
