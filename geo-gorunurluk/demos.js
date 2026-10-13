/* "Görünürlük ve Işık" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const big = C => { C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%'; };
  const mpos = (C, W, H) => e => { const b = C.getBoundingClientRect(); return V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height); };
  const clamp = SL.clamp;
  // demo klavyesi: slayt görünürken verilen tuşları yakala (reveal'e gitmesin)
  const keys = (isOn, list, onDown, onUp) => {
    const h = (e, down) => { if (!isOn()) return; const k = e.key.toLowerCase(); if (!list.includes(k) || e.ctrlKey || e.metaKey || e.altKey) return; if (e.target && e.target.closest && e.target.closest('.CodeMirror, input, textarea, select')) return; (down ? onDown : onUp || (() => {}))(k); e.preventDefault(); e.stopImmediatePropagation(); };
    window.addEventListener('keydown', e => h(e, true), true); window.addEventListener('keyup', e => h(e, false), true);
  };

  /* ---------- ortak: ızgarada ışın (DDA) ---------- */
  // (ox, oy) hücre biriminde başlangıç; (dx, dy) yön. Dönen: geçilen hücreler ve ilk duvar.
  function dda(isWall, ox, oy, dx, dy, maxT = 1e9, maxSteps = 400) {
    let cx = Math.floor(ox), cy = Math.floor(oy); const cells = [[cx, cy, 0, -1]];
    const sx = Math.sign(dx), sy = Math.sign(dy), tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity;
    let tmx = dx > 0 ? (cx + 1 - ox) / dx : dx < 0 ? (cx - ox) / dx : Infinity, tmy = dy > 0 ? (cy + 1 - oy) / dy : dy < 0 ? (cy - oy) / dy : Infinity;
    for (let i = 0; i < maxSteps; i++) {
      let t, side; if (tmx < tmy) { cx += sx; t = tmx; tmx += tdx; side = 0; } else { cy += sy; t = tmy; tmy += tdy; side = 1; }
      if (t > maxT) return { cells, hit: null, t: maxT };
      cells.push([cx, cy, t, side]);
      if (isWall(cx, cy)) return { cells, hit: [cx, cy], t, side };
    }
    return { cells, hit: null, t: maxT };
  }
  function bres(x0, y0, x1, y1) { const out = []; let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy; for (;;) { out.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } } return out; }
  SL.VIS = { dda, bres };

  /* ================= 1) ızgarada görüş hattı: örnekleme mi, DDA mı? ================= */
  const GMAP = ['........................', '....##..........#.......', '....##.....#....#.......', '...........#....#..###..', '..#........#............', '..#...###...........#...', '..#.................#...', '........#....####...#...', '........#...............', '...##...#........#......', '...##............#......', '........................'];
  D.dda = function (root) {
    const GW = 24, GH = 12, cs = 28, W = 720, H = GH * cs;
    const wall = (x, y) => x < 0 || y < 0 || x >= GW || y >= GH || GMAP[y][x] === '#';
    let O = V.v(5.5, 6.5), M = V.v(20.5, 2.5), mode = 'dda', step = 0.5;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const d = V.sub(M, O), L = V.len(d) || 1, dn = V.mul(d, 1 / L);
      let visited = [], hit = null, tests = 0, missed = false;
      if (mode === 'dda') { const r = dda(wall, O.x, O.y, dn.x, dn.y, L); visited = r.cells; hit = r.hit ? V.add(O, V.mul(dn, r.t)) : null; tests = r.cells.length - 1; }
      else { const seen = new Set(); for (let s = step; s < L; s += step) { tests++; const p = V.add(O, V.mul(dn, s)), cx = Math.floor(p.x), cy = Math.floor(p.y), k = cx + ',' + cy; if (!seen.has(k)) { seen.add(k); visited.push([cx, cy, s, 0]); } if (wall(cx, cy)) { hit = p; break; } } const truth = dda(wall, O.x, O.y, dn.x, dn.y, L); missed = !hit && !!truth.hit; }
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { ctx.fillStyle = wall(x, y) ? (t.dark ? '#4a4f63' : '#5b6078') : (t.dark ? '#262a38' : '#efe9dc'); ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1); }
      visited.forEach(([x, y], i) => { ctx.fillStyle = wall(x, y) ? 'rgba(230,60,80,0.75)' : 'rgba(255,190,60,0.5)'; ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1); if (mode === 'dda' && i > 0 && i < 40) SL.drawLabel(ctx, String(i), x * cs + cs / 2, y * cs + cs / 2, t.ink, { size: 10, bg: false }); });
      const E = hit || M;
      ctx.strokeStyle = missed ? t.red : t.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(O.x * cs, O.y * cs); ctx.lineTo(E.x * cs, E.y * cs); ctx.stroke();
      if (mode === 'sample') for (let s = step; s < V.dist(O, E) + 1e-6; s += step) { const p = V.add(O, V.mul(dn, s)); ctx.fillStyle = t.purple; ctx.beginPath(); ctx.arc(p.x * cs, p.y * cs, 2.5, 0, 7); ctx.fill(); }
      ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(O.x * cs, O.y * cs, 8, 0, 7); ctx.fill(); ctx.fillStyle = hit ? t.muted : t.blue; ctx.beginPath(); ctx.arc(M.x * cs, M.y * cs, 7, 0, 7); ctx.fill();
      if (hit) { ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(hit.x * cs, hit.y * cs, 5, 0, 7); ctx.fill(); }
      SL.drawLabel(ctx, hit ? 'GÖRMÜYOR: arada duvar var' : missed ? 'HATA: “görüyor” dedi ama arada duvar var!' : 'GÖRÜYOR', 10, 14, hit ? t.red : missed ? t.red : t.green, { size: 13, align: 'left' });
      SL.drawLabel(ctx, mode === 'dda' ? `${tests} hücre sınırı geçildi` : `${tests} örnek noktası`, W - 10, 14, t.ink, { size: 12, align: 'right' });
      info.innerHTML = mode === 'dda'
        ? '<b>DDA:</b> ışın, geçtiği <b>her hücreyi tam bir kez</b> ve sırayla ziyaret eder (sarı kareler, numaralı). Her adımda tek soru: “sıradaki dikey çizgi mi daha yakın, yatay çizgi mi?” Hiçbir hücre atlanmaz, hiçbirine iki kez bakılmaz.'
        : `<b>Örnekleme:</b> ışın boyunca her ${step} hücrede bir nokta alınır (mor noktalar) ve o noktanın hücresine bakılır. Adım küçükse aynı hücre defalarca sınanır; adım büyükse ışın bir duvarın <b>köşesinden atlayabilir</b>. Adımı 1,5 yapıp hedefi duvar köşelerinin arkasında gezdirin: kırmızı “HATA” yazısını yakalayın.`;
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousemove', e => { const p = mp(e); M = V.v(clamp(p.x / cs, 0.2, GW - 0.2), clamp(p.y / cs, 0.2, GH - 0.2)); draw(); });
    C.addEventListener('mousedown', e => { const p = mp(e), q = V.v(p.x / cs, p.y / cs); if (!wall(Math.floor(q.x), Math.floor(q.y))) { O = q; draw(); } });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Yöntem: ', select({ dda: 'DDA (hücre hücre)', sample: 'örnekleme (sabit adım)' }, mode, v => { mode = v; draw(); })), slider('örnekleme adımı (hücre)', 0.1, 2, step, 0.1, v => { step = v; draw(); }), el('span', { class: 'mini' }, 'Fare: hedef · tıkla: gözcüyü taşı')), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= 2) Wolfenstein usulü ışın dökümü ================= */
  const WMAP = ['############', '#..........#', '#..##...#..#', '#..#....#..#', '#.......#..#', '#..#.......#', '#..####....#', '############'];
  D.wolf = function (root) {
    const W = 720, H = 300, cs = 26, MW = 12 * cs, VX = MW + 14, VW = W - VX - 6, VH = 230, COLS = 100;
    const wall = (x, y) => x < 0 || y < 0 || x >= 12 || y >= 8 || WMAP[y][x] === '#';
    const st = { p: V.v(5.5, 4.5), a: -0.6, fov: 1.05, fish: false, k: {} };
    let timer = null;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const step = dt => {
      const k = st.k; st.a += ((k.d ? 1 : 0) - (k.a ? 1 : 0)) * 2.2 * dt;
      const mv = ((k.w ? 1 : 0) - (k.s ? 1 : 0)) * 2.6 * dt, nx = st.p.x + Math.cos(st.a) * mv, ny = st.p.y + Math.sin(st.a) * mv;
      if (!wall(Math.floor(nx + Math.sign(Math.cos(st.a) * mv) * 0.2), Math.floor(st.p.y))) st.p.x = nx;
      if (!wall(Math.floor(st.p.x), Math.floor(ny + Math.sign(Math.sin(st.a) * mv) * 0.2))) st.p.y = ny;
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) { ctx.fillStyle = wall(x, y) ? (t.dark ? '#4a4f63' : '#5b6078') : (t.dark ? '#262a38' : '#efe9dc'); ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1); }
      ctx.fillStyle = t.dark ? '#1b2030' : '#cfe3f5'; ctx.fillRect(VX, 0, VW, VH / 2); ctx.fillStyle = t.dark ? '#2b2620' : '#b9ad98'; ctx.fillRect(VX, VH / 2, VW, VH / 2);
      const cw = VW / COLS;
      for (let c = 0; c < COLS; c++) {
        const ra = st.a - st.fov / 2 + st.fov * (c + 0.5) / COLS, r = dda(wall, st.p.x, st.p.y, Math.cos(ra), Math.sin(ra));
        const dist = r.t, perp = st.fish ? dist : dist * Math.cos(ra - st.a), h = Math.min(VH, VH / Math.max(0.05, perp) * 0.9);
        const sh = Math.max(0.25, 1 - perp / 9) * (r.side ? 1 : 0.72), base = t.dark ? [120, 150, 220] : [70, 110, 200];
        ctx.fillStyle = `rgb(${base.map(v => Math.round(v * sh)).join(',')})`; ctx.fillRect(VX + c * cw, VH / 2 - h / 2, cw + 0.6, h);
        if (c % 5 === 2 || c === 0 || c === COLS - 1) { ctx.strokeStyle = c === Math.floor(COLS / 2) ? t.red : 'rgba(255,190,60,0.55)'; ctx.lineWidth = c === Math.floor(COLS / 2) ? 2 : 1; ctx.beginPath(); ctx.moveTo(st.p.x * cs, st.p.y * cs); ctx.lineTo((st.p.x + Math.cos(ra) * dist) * cs, (st.p.y + Math.sin(ra) * dist) * cs); ctx.stroke(); }
      }
      ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(st.p.x * cs, st.p.y * cs, 6, 0, 7); ctx.fill();
      SL.drawLabel(ctx, 'yukarıdan görünüm (harita)', 6, 8 * cs + 14, t.muted, { size: 10, align: 'left' }); SL.drawLabel(ctx, `oyuncunun gördüğü: ${COLS} sütun = ${COLS} ışın`, VX + 4, VH + 14, t.muted, { size: 10, align: 'left' });
      SL.drawLabel(ctx, 'W / S: ileri-geri · A / D: dön', VX + 4, VH + 32, t.ink, { size: 11, align: 'left' });
      info.innerHTML = 'Harita <b>2B bir ızgara</b>; “3B” görüntü bir yanılsama: ekranın her <b>sütunu</b> için oyuncudan bir ışın gönderilir (soldaki sarı çizgiler; kırmızı = tam orta), ışının duvara uzaklığı ölçülür ve o sütuna <b>yüksekliği 1 / uzaklık</b> olan bir çubuk çizilir. Yakın duvar uzun, uzak duvar kısa. ' + (st.fish ? '<b>Balık gözü açık:</b> düz bir duvara bakın; kenarlara doğru eğiliyor, çünkü yandaki ışınlar daha uzun yol alıyor.' : 'Düzeltme: uzaklık, bakış yönüne <b>izdüşürülür</b> (× cos açı farkı); yoksa düz duvarlar bombeli görünür. Kutucuğu işaretleyip görün.');
    };
    const loop = () => { step(1 / 60); draw(); };
    const start = () => { if (!timer) timer = setInterval(loop, 1000 / 60); }, stop = () => { if (timer) { clearInterval(timer); timer = null; } st.k = {}; };
    keys(() => !!timer, ['w', 'a', 's', 'd'], k => { st.k[k] = true; }, k => { st.k[k] = false; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('görüş açısı (rad)', 0.5, 2, st.fov, 0.05, v => { st.fov = v; }), el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { st.fish = e.target.checked; } }); return x; })(), ' balık gözü (düzeltmeyi kapat)'), el('span', { class: 'mini' }, 'W / S / A / D ile yürüyün')), C, info);
    draw(); SL.onTheme(draw);
    return { start, stop };
  };

  /* ================= 3) roguelike görüş alanı ve savaş sisi ================= */
  const FMAP = ['####################################', '#........#.............#...........#', '#........#.............#...........#', '#...............####...#.....##....#', '#........#.........#.........##....#', '#####.####.........#...#...........#', '#..........#####...#####.....#######', '#....#.........#.............#.....#', '#....#.........#.............#.....#', '#....#....#....#######.####..#.....#', '#....######....#......#............#', '#..............#......#......#.....#', '#..............#.............#.....#', '####################################'];
  function shadowcast(isWall, px, py, R, mark) {
    const MULT = [[1, 0, 0, -1, -1, 0, 0, 1], [0, 1, -1, 0, 0, -1, 1, 0], [0, 1, 1, 0, 0, -1, -1, 0], [1, 0, 0, 1, -1, 0, 0, -1]];
    let checked = 0;
    const cast = (row, start, end, xx, xy, yx, yy) => {
      if (start < end) return; let newStart = 0, blocked = false;
      for (let dist = row; dist <= R && !blocked; dist++) {
        const dy = -dist;
        for (let dx = -dist; dx <= 0; dx++) {
          const X = px + dx * xx + dy * xy, Y = py + dx * yx + dy * yy, lS = (dx - 0.5) / (dy + 0.5), rS = (dx + 0.5) / (dy - 0.5);
          if (start < rS) continue; else if (end > lS) break;
          checked++; if (dx * dx + dy * dy <= R * R) mark(X, Y);
          if (blocked) { if (isWall(X, Y)) { newStart = rS; continue; } else { blocked = false; start = newStart; } }
          else if (isWall(X, Y) && dist < R) { blocked = true; cast(dist + 1, start, lS, xx, xy, yx, yy); newStart = rS; }
        }
      }
    };
    mark(px, py); for (let o = 0; o < 8; o++) cast(1, 1.0, 0.0, MULT[0][o], MULT[1][o], MULT[2][o], MULT[3][o]);
    return checked;
  }
  SL.VIS.shadowcast = shadowcast;
  D.fov = function (root) {
    const GW = 36, GH = 14, cs = 20, W = 720, H = GH * cs + 22;
    const wall = (x, y) => x < 0 || y < 0 || x >= GW || y >= GH || FMAP[y][x] === '#';
    const st = { x: 4, y: 3, R: 9, mode: 'shadow', rays: 90, fog: true, on: false };
    let vis = new Set(), seen = new Set(), work = 0;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const compute = () => {
      vis = new Set(); const mark = (x, y) => { if (x >= 0 && y >= 0 && x < GW && y < GH) vis.add(y * GW + x); };
      if (st.mode === 'shadow') work = shadowcast(wall, st.x, st.y, st.R, mark);
      else if (st.mode === 'rays') { work = 0; mark(st.x, st.y); for (let i = 0; i < st.rays; i++) { const a = (i / st.rays) * Math.PI * 2, r = dda(wall, st.x + 0.5, st.y + 0.5, Math.cos(a), Math.sin(a), st.R); r.cells.forEach(([x, y]) => { work++; mark(x, y); }); } }
      else { work = 0; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) vis.add(y * GW + x); }
      vis.forEach(k => seen.add(k));
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.dark ? '#0d0f16' : '#1a1c26'; ctx.fillRect(0, 0, W, GH * cs);
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const k = y * GW + x, v = vis.has(k), s = seen.has(k); if (!v && !(st.fog && s)) continue;
        const w = wall(x, y); ctx.fillStyle = v ? (w ? '#8a90ad' : '#efe9dc') : (w ? '#3d4154' : '#55586a'); ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1);
      }
      ctx.strokeStyle = 'rgba(255,190,60,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(st.x * cs + cs / 2, st.y * cs + cs / 2, st.R * cs, 0, 7); ctx.stroke();
      ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(st.x * cs + cs / 2, st.y * cs + cs / 2, 7, 0, 7); ctx.fill();
      const total = GW * GH; ctx.fillStyle = t.card; ctx.fillRect(0, GH * cs, W, 22);
      SL.drawLabel(ctx, `şu an görünen ${vis.size} hücre · keşfedilen ${seen.size}/${total} · ${st.mode === 'none' ? 'görünürlük hesabı yok' : 'bakılan hücre ' + work}`, 8, GH * cs + 11, t.ink, { size: 11, align: 'left', bg: false });
      SL.drawLabel(ctx, st.on ? 'W / A / S / D: yürü' : '', W - 8, GH * cs + 11, t.muted, { size: 11, align: 'right', bg: false });
      info.innerHTML = { shadow: '<b>Gölge dökümü:</b> oyuncudan dışarı doğru, sekiz dilimde <b>satır satır</b> taranır. Bir duvara rastlanınca arkasında kalan açı aralığı “gölge” olarak işaretlenir ve o aralık bir daha taranmaz. Her görünen hücreye yaklaşık <b>bir kez</b> bakılır; boşluk ya da delik kalmaz.', rays: `<b>Işın yelpazesi:</b> oyuncudan ${st.rays} yöne ışın (DDA). Işın sayısını 40’a indirin: uzaktaki hücrelerde <b>delikler</b> kalır (iki ışının arasına düşenler). 720 yapın: delik yok ama yakındaki hücrelere onlarca kez bakılıyor (“bakılan hücre” sayısına dikkat).`, none: 'Görünürlük hesabı kapalı: bütün harita görünüyor. Roguelike’ın ve strateji oyununun gerilimi tam olarak bu bilginin <b>saklanmasından</b> gelir.' }[st.mode] + (st.fog ? ' Koyu gri: <b>daha önce görülmüş</b> ama şu an görünmeyen yerler (savaş sisi). Siyah: hiç görülmemiş.' : '');
    };
    const move = (dx, dy) => { if (!wall(st.x + dx, st.y + dy)) { st.x += dx; st.y += dy; compute(); draw(); } };
    keys(() => st.on, ['w', 'a', 's', 'd'], k => move(k === 'a' ? -1 : k === 'd' ? 1 : 0, k === 'w' ? -1 : k === 's' ? 1 : 0));
    const mp = mpos(C, W, H);
    C.addEventListener('mousedown', e => { const p = mp(e), x = Math.floor(p.x / cs), y = Math.floor(p.y / cs); if (!wall(x, y) && y < GH) { st.x = x; st.y = y; compute(); draw(); } });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Yöntem: ', select({ shadow: 'gölge dökümü (shadowcasting)', rays: 'ışın yelpazesi', none: 'yok (her şey görünür)' }, st.mode, v => { st.mode = v; compute(); draw(); })),
      slider('görüş yarıçapı', 3, 16, st.R, 1, v => { st.R = v; compute(); draw(); }), slider('ışın sayısı', 20, 720, st.rays, 10, v => { st.rays = v; if (st.mode === 'rays') { compute(); draw(); } }),
      el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { st.fog = e.target.checked; draw(); } }); x.checked = true; return x; })(), ' savaş sisi (hatırla)'), btn('↺ unut', () => { seen = new Set(); compute(); draw(); })), C, info);
    compute(); draw(); SL.onTheme(draw);
    return { start() { st.on = true; draw(); }, stop() { st.on = false; } };
  };

  /* ================= 4) sürekli dünyada görüş çokgeni ================= */
  const VW = 720, VH = 330;
  const WALLS = [[80, 60, 200, 60], [200, 60, 200, 130], [200, 130, 80, 130], [80, 130, 80, 60], [300, 200, 420, 180], [420, 180, 440, 260], [440, 260, 320, 280], [320, 280, 300, 200], [520, 50, 640, 90], [640, 90, 560, 150], [560, 150, 520, 50], [120, 220, 220, 300], [470, 300, 610, 250]];
  const BORDER = [[0, 0, VW, 0], [VW, 0, VW, VH], [VW, VH, 0, VH], [0, VH, 0, 0]];
  function castTo(o, ang, segs, st) { const d = V.fromAngle(ang); let best = 1e9; for (const s of segs) { st.tests++; const sx = s[2] - s[0], sy = s[3] - s[1], den = d.x * sy - d.y * sx; if (Math.abs(den) < 1e-9) continue; const t = ((s[0] - o.x) * sy - (s[1] - o.y) * sx) / den, u = ((s[0] - o.x) * d.y - (s[1] - o.y) * d.x) / den; if (t > 0 && u >= 0 && u <= 1 && t < best) best = t; } return V.add(o, V.mul(d, best)); }
  function visPoly(o, segs, mode, n, st) {
    let angs = [];
    if (mode === 'corners') { const seen = new Set(); for (const s of segs) for (const [x, y] of [[s[0], s[1]], [s[2], s[3]]]) { const k = x + ',' + y; if (seen.has(k)) continue; seen.add(k); const a = Math.atan2(y - o.y, x - o.x); angs.push(a - 1e-4, a, a + 1e-4); } }
    else for (let i = 0; i < n; i++) angs.push(-Math.PI + (i / n) * 2 * Math.PI);
    angs.sort((a, b) => a - b); st.rays = angs.length;
    return angs.map(a => castTo(o, a, segs, st));
  }
  SL.VIS.visPoly = visPoly;
  D.vispoly = function (root) {
    const W = VW, H = VH, segs = WALLS.concat(BORDER);
    let o = V.v(360, 110), mode = 'corners', n = 60, showRays = true, cone = false;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(), st = { tests: 0, rays: 0 }, P = visPoly(o, segs, mode, n, st);
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.dark ? '#10121a' : '#2a2d3a'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = t.dark ? 'rgba(255,236,170,0.30)' : 'rgba(255,240,190,0.88)'; ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill();
      if (showRays) { ctx.strokeStyle = 'rgba(230,60,80,0.45)'; ctx.lineWidth = 1; P.forEach(p => { ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }); }
      ctx.strokeStyle = t.dark ? '#aab0cc' : '#11131c'; ctx.lineWidth = 3; WALLS.forEach(s => { ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); });
      ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(o.x, o.y, 7, 0, 7); ctx.fill();
      SL.drawLabel(ctx, `${st.rays} ışın · ${st.tests} ışın–duvar testi · çokgen ${P.length} köşe`, 10, 14, '#fff', { size: 12, align: 'left', bg: false });
      info.innerHTML = mode === 'corners'
        ? 'Açık renk alan fenerin (sarı nokta) <b>gördüğü her yer</b>: görüş çokgeni. Işınlar yalnızca duvar <b>köşelerine</b> gidiyor; her köşe için üç ışın: tam köşeye ve çok az sağına-soluna (köşeyi sıyırıp arkadaki duvara ulaşan ışın gölgenin kenarını verir). Sonra uç noktalar <b>açıya göre sıralanır</b> ve birleştirilir. Gölgelerin kenarı her zaman keskin ve doğru.'
        : `${n} yöne eşit aralıklı ışın. Köşelere tam denk gelen ışın olmadığı için gölge kenarları <b>tırtıklı</b> ve fareyi oynattıkça <b>titrek</b>. Işın sayısını 720’ye çıkarın: düzelir ama test sayısı katlanır. Köşe ışınlarıyla karşılaştırın.`;
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousemove', e => { const p = mp(e); o = V.v(clamp(p.x, 4, W - 4), clamp(p.y, 4, H - 4)); draw(); });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Işınlar: ', select({ corners: 'yalnızca köşelere (±ε)', uniform: 'eşit aralıklı' }, mode, v => { mode = v; draw(); })), slider('eşit aralıklı ışın sayısı', 20, 720, n, 10, v => { n = v; draw(); }),
      el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { showRays = e.target.checked; draw(); } }); x.checked = true; return x; })(), ' ışınları göster'), el('span', { class: 'mini' }, 'Fare: fener')), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= 5) BSP: önden arkaya çizim sırası ================= */
  function buildBSP(segs) {
    if (!segs.length) return null;
    const [sp, ...rest] = segs, a = V.v(sp[0], sp[1]), b = V.v(sp[2], sp[3]), front = [], back = [];
    const side = p => { const c = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x); return Math.abs(c) < 1e-6 ? 0 : c > 0 ? 1 : -1; };
    for (const s of rest) {
      const p = V.v(s[0], s[1]), q = V.v(s[2], s[3]), sp1 = side(p), sq = side(q);
      if (sp1 >= 0 && sq >= 0) front.push(s); else if (sp1 <= 0 && sq <= 0) back.push(s);
      else { const r = V.sub(b, a), d = V.sub(q, p), tt = V.cross(V.sub(a, p), r) / V.cross(d, r), m = V.add(p, V.mul(d, tt)), s1 = [p.x, p.y, m.x, m.y, s[4]], s2 = [m.x, m.y, q.x, q.y, s[4]]; (sp1 > 0 ? front : back).push(s1); (sp1 > 0 ? back : front).push(s2); }
    }
    return { seg: sp, a, b, front: buildBSP(front), back: buildBSP(back) };
  }
  function orderBSP(n, eye, out) { if (!n) return; const c = (n.b.x - n.a.x) * (eye.y - n.a.y) - (n.b.y - n.a.y) * (eye.x - n.a.x), near = c >= 0 ? n.front : n.back, far = c >= 0 ? n.back : n.front; orderBSP(near, eye, out); out.push(n.seg); orderBSP(far, eye, out); }
  SL.VIS.buildBSP = buildBSP; SL.VIS.orderBSP = orderBSP;
  D.bsp = function (root) {
    const W = 720, H = 330;
    const segs = [[120, 60, 300, 90], [300, 90, 330, 200], [420, 40, 600, 70], [520, 150, 650, 260], [200, 230, 380, 290], [90, 150, 180, 250], [440, 200, 470, 300], [350, 130, 470, 120]].map((s, i) => s.concat([i]));
    const tree = buildBSP(segs); let eye = V.v(360, 320), showSplit = true;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      if (showSplit) (function sp(n, d) { if (!n) return; const dir = V.norm(V.sub(n.b, n.a)), p0 = V.sub(n.a, V.mul(dir, 1200)), p1 = V.add(n.a, V.mul(dir, 1200)); ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.setLineDash([3, 6]); ctx.globalAlpha = Math.max(0.25, 1 - d * 0.25); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; sp(n.front, d + 1); sp(n.back, d + 1); })(tree, 0);
      const ord = []; orderBSP(tree, eye, ord);
      ord.forEach((s, i) => { const f = i / Math.max(1, ord.length - 1); ctx.strokeStyle = `hsl(${140 - 140 * f}, 70%, ${t.dark ? 60 : 42}%)`; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); SL.drawLabel(ctx, String(i + 1), (s[0] + s[2]) / 2, (s[1] + s[3]) / 2 - 13, t.ink, { size: 12 }); });
      ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(eye.x, eye.y, 8, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'göz', eye.x, eye.y + 18, t.blue, { size: 10 });
      SL.drawLabel(ctx, `${segs.length} duvar → ağaçta ${ord.length} parça (bölünenler dahil)`, 10, 14, t.muted, { size: 11, align: 'left' });
      info.innerHTML = 'Duvarların üstündeki sayı <b>çizim sırası</b>: 1 göze en yakın (yeşil), sonuncu en uzak (kırmızı). Fareyi (göz) gezdirin: sıra anında değişir, ama <b>hiçbir sıralama algoritması çalışmaz</b>. Ağaç bir kez, oyun başlamadan kurulur; her karede yalnızca gezilir: “göz bu bölme çizgisinin hangi tarafında? (G1’in yön testi) → <b>önce o taraf</b>, sonra çizgideki duvar, sonra öbür taraf.” Kesikli çizgiler bölme doğruları; bir duvar bir bölme doğrusunu kesiyorsa <b>ikiye bölünür</b>.';
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousemove', e => { eye = mp(e); draw(); });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { showSplit = e.target.checked; draw(); } }); x.checked = true; return x; })(), ' bölme doğrularını göster'), el('span', { class: 'mini' }, 'Fare: göz (kamera)')), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ---------- simlab: ızgarada görüş hattı ---------- */
  SL.SIMLABS.los = function (box, api) {
    const GW = 20, GH = 11, cs = 26, W = GW * cs, H = GH * cs + 20;
    const MAPS = ['....................', '....#.......#.......', '....#.......#..##...', '....#...............', '.........###........', '....................', '..##.........#......', '.............#..#...', '......#......#..#...', '......#.............', '....................'];
    const grid = MAPS.map(r => [...r].map(c => (c === '#' ? 1 : 0)));
    let fn = null, tt = 0; const G = [10, 5];
    const ref = (g, x0, y0, x1, y1) => bres(x0, y0, x1, y1).slice(1, -1).every(([x, y]) => g[y][x] === 0);
    const target = () => { const x = Math.round(10 + Math.cos(tt * 0.5) * 9), y = Math.round(5 + Math.sin(tt * 0.83) * 5); return [clamp(x, 0, GW - 1), clamp(y, 0, GH - 1)]; };
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt) { tt += dt; },
      render(ctx, w, t) {
        const [tx, ty] = target(), cells = bres(G[0], G[1], tx, ty), want = ref(grid, G[0], G[1], tx, ty); let got = null;
        if (fn) { try { got = !!fn(grid.map(r => r.slice()), G[0], G[1], tx, ty); } catch (e) { got = null; } }
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { ctx.fillStyle = grid[y][x] ? (t.dark ? '#4a4f63' : '#5b6078') : (t.dark ? '#262a38' : '#efe9dc'); ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1); }
        cells.forEach(([x, y]) => { ctx.fillStyle = grid[y][x] ? 'rgba(230,60,80,0.7)' : 'rgba(255,190,60,0.45)'; ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1); });
        ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(G[0] * cs + cs / 2, G[1] * cs + cs / 2, 9, 0, 7); ctx.fill(); ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(tx * cs + cs / 2, ty * cs + cs / 2, 8, 0, 7); ctx.fill();
        const ok = got === want;
        SL.drawLabel(ctx, got === null ? 'Kodu çalıştırın' : `sizin cevap: ${got ? 'GÖRÜYOR' : 'görmüyor'} · doğrusu: ${want ? 'GÖRÜYOR' : 'görmüyor'} ${ok ? '✔' : '✘ YANLIŞ'}`, 8, H - 10, got === null ? t.muted : ok ? t.green : t.red, { size: 11, align: 'left' });
      },
      reset() { tt = 0; }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w, scope: { line: bres },
      setFns(f) { fn = f.canSee; w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try { for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { if (grid[y][x]) continue; const got = !!mod.canSee(grid.map(r => r.slice()), G[0], G[1], x, y), want = ref(grid, G[0], G[1], x, y); if (got !== want) return { ok: false, msg: `❌ gözcü (${G}) → hedef (${x}, ${y}): ${got ? 'GÖRÜYOR' : 'görmüyor'} dediniz, doğrusu ${want ? 'GÖRÜYOR' : 'görmüyor'}. line(…) şu hücreleri veriyor: ${JSON.stringify(bres(G[0], G[1], x, y))}. İlk ve son hücre hariç, aradakilerden biri duvarsa (grid[y][x] === 1) görmez.` }; } }
        catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Haritadaki her boş hücre için doğru. Sağda mavi hedef dolaşıyor; sarı hücreler görüş hattı, kırmızı hücre hattı kesen duvar.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  SL.AILABS.fogstate = {
    fn: 'fog_state', jsFn: 'fogState',
    ref: (vis, seen) => (vis ? 'görünüyor' : seen ? 'hatırlanıyor' : 'bilinmiyor'),
    cases: () => [[true, true], [true, false], [false, true], [false, false]],
    show: (v, s) => `şu an görüş alanında mı: ${v}, daha önce görüldü mü: ${s}`,
    hint: () => 'Üç durum, öncelik sırasıyla: şu an görünüyorsa "görünüyor"; görünmüyor ama daha önce görüldüyse "hatırlanıyor"; hiçbiri değilse "bilinmiyor".'
  };
  SL.AILABS.colh = {
    fn: 'column_height', jsFn: 'columnHeight', tol: 1e-6,
    ref: (d, ra, pa, h) => h / (d * Math.cos(ra - pa)),
    cases: () => [[2, 0, 0, 200], [4, 0, 0, 200], [2, 0.5, 0, 200], [5, 1.2, 1.0, 240], [1, -0.4, 0, 300], [3.5, 2.0, 2.3, 200], [8, 0.1, 0.1, 480]],
    show: (d, ra, pa, h) => `ışının duvara uzaklığı ${d}, ışın açısı ${ra}, bakış açısı ${pa}, ekran yüksekliği ${h}`,
    hint: () => 'Önce düzeltme: dik = uzaklık × cos(ışın açısı − bakış açısı). Sonra yükseklik = ekran yüksekliği / dik. Düzeltmeyi unutursanız ekranın kenarındaki duvarlar kısa çıkar (balık gözü).'
  };
  SL.AILABS.bres = {
    fn: 'line_cells', jsFn: 'lineCells',
    ref: (x0, y0, x1, y1) => bres(x0, y0, x1, y1),
    cases: () => [[0, 0, 5, 0], [0, 0, 0, 4], [0, 0, 4, 4], [0, 0, 6, 2], [0, 0, 2, 6], [5, 3, 0, 1], [3, 7, 3, 7], [2, 2, 7, 0], [6, 1, 1, 4], [0, 5, 9, 1]],
    show: (a, b, c, d) => `(${a}, ${b}) → (${c}, ${d})`,
    hint: () => 'dx = |x1 − x0|, dy = −|y1 − y0|, sx = x0 < x1 ise 1 değilse −1 (sy aynı), err = dx + dy. Döngü: hücreyi ekle; hedefe vardıysan çık; e2 = 2·err; e2 ≥ dy ise err += dy, x0 += sx; e2 ≤ dx ise err += dx, y0 += sy.'
  };

  /* ---------- başlık ---------- */
  D.titlegeo4 = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const segs = [[760, 50, 840, 50], [840, 50, 840, 110], [840, 110, 760, 110], [760, 110, 760, 50], [960, 130, 1040, 110], [1040, 110, 1060, 180], [1060, 180, 980, 200], [980, 200, 960, 130], [1120, 40, 1200, 80], [1200, 80, 1140, 120], [1140, 120, 1120, 40], [690, 0, 1270, 0], [1270, 0, 1270, 230], [1270, 230, 690, 230], [690, 230, 690, 0]];
    let t = 0, timer, running = false;
    const draw = () => { ctx.clearRect(0, 0, W, H); const o = V.v(980 + Math.cos(t * 0.02) * 190, 110 + Math.sin(t * 0.031) * 70), P = visPoly(o, segs, 'corners', 0, { tests: 0, rays: 0 }); ctx.fillStyle = 'rgba(255,236,170,0.22)'; ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; segs.slice(0, 11).forEach(s => { ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); }); ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(o.x, o.y, 5, 0, 7); ctx.fill(); };
    const tick = () => { if (!running) return; t++; draw(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
