/* "Uzaysal Bölümleme" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const RNG = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const big = C => { C.style.width = '900px'; C.style.height = 'auto'; C.style.maxWidth = '100%'; };
  const mpos = (C, W, H) => e => { const b = C.getBoundingClientRect(); return V.v(((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height); };

  /* ================= 1) kaba kuvvet vs ızgara (uzaysal hash) ================= */
  D.gridhash = function (root) {
    const W = 720, H = 340, R = 5;
    const c = { n: 300, cell: 40, mode: 'grid' };
    let balls = [], timer = null, mouse = null, stats = { checks: 0, hits: 0, maxCell: 0, cells: 0 };
    const make = () => { const r = RNG(5); balls = Array.from({ length: 1500 }, () => ({ x: R + r() * (W - 2 * R), y: R + r() * (H - 2 * R), vx: (r() - 0.5) * 2.2, vy: (r() - 0.5) * 2.2, hit: false })); };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    let grid = new Map();
    const key = (cx, cy) => cx * 1000 + cy;
    const tick = () => {
      const B = balls.slice(0, c.n); let checks = 0, hits = 0;
      B.forEach(b => { b.x += b.vx; b.y += b.vy; if (b.x < R || b.x > W - R) b.vx *= -1; if (b.y < R || b.y > H - R) b.vy *= -1; b.hit = false; });
      const test = (a, b) => { checks++; const dx = a.x - b.x, dy = a.y - b.y; if (dx * dx + dy * dy < 4 * R * R) { a.hit = b.hit = true; hits++; } };
      grid = new Map();
      B.forEach((b, i) => { const k = key(Math.floor(b.x / c.cell), Math.floor(b.y / c.cell)); let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(i); });
      if (c.mode === 'brute') { for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) test(B[i], B[j]); }
      else {
        B.forEach((b, i) => { const cx = Math.floor(b.x / c.cell), cy = Math.floor(b.y / c.cell); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const l = grid.get(key(cx + dx, cy + dy)); if (!l) continue; for (const j of l) if (j > i) test(b, B[j]); } });
      }
      let mx = 0; grid.forEach(l => { if (l.length > mx) mx = l.length; });
      stats = { checks, hits, maxCell: mx, cells: grid.size };
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const B = balls.slice(0, c.n);
      if (c.mode === 'grid') {
        grid.forEach((l, k) => { const cx = Math.floor(k / 1000), cy = k - cx * 1000; ctx.fillStyle = t.dark ? `rgba(79,140,255,${Math.min(0.5, 0.06 * l.length)})` : `rgba(79,140,255,${Math.min(0.45, 0.05 * l.length)})`; ctx.fillRect(cx * c.cell, cy * c.cell, c.cell, c.cell); });
        ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= W; x += c.cell) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = 0; y <= H; y += c.cell) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
      }
      let near = new Set();
      if (mouse && c.mode === 'grid') { const cx = Math.floor(mouse.x / c.cell), cy = Math.floor(mouse.y / c.cell); ctx.strokeStyle = t.amber; ctx.lineWidth = 2.5; ctx.strokeRect((cx - 1) * c.cell, (cy - 1) * c.cell, 3 * c.cell, 3 * c.cell); ctx.fillStyle = 'rgba(255,190,60,0.14)'; ctx.fillRect(cx * c.cell, cy * c.cell, c.cell, c.cell); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) (grid.get(key(cx + dx, cy + dy)) || []).forEach(i => near.add(i)); }
      B.forEach((b, i) => { ctx.fillStyle = b.hit ? t.red : near.has(i) ? t.amber : (t.dark ? '#9aa3c7' : '#5b6078'); ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, 7); ctx.fill(); });
      const brute = (c.n * (c.n - 1)) / 2;
      SL.drawLabel(ctx, `bu kare ${stats.checks.toLocaleString('tr')} çift test edildi`, 10, 14, t.ink, { size: 12, align: 'left' });
      SL.drawLabel(ctx, c.mode === 'grid' ? `kaba kuvvet olsaydı ${brute.toLocaleString('tr')} (${Math.round(brute / Math.max(1, stats.checks))} kat fazla)` : 'her top, her topla: N·(N−1)/2', 10, 32, c.mode === 'grid' ? t.green : t.red, { size: 11, align: 'left' });
      if (c.mode === 'grid') SL.drawLabel(ctx, `dolu hücre ${stats.cells} · en kalabalık hücre ${stats.maxCell} top${mouse ? ' · fare çevresi: ' + near.size + ' aday' : ''}`, 10, H - 12, t.muted, { size: 11, align: 'left' });
      info.innerHTML = c.mode === 'brute'
        ? `<b>Kaba kuvvet:</b> ${c.n} top için her kare ${brute.toLocaleString('tr')} uzaklık testi. Top sayısını iki katına çıkarın: iş <b>dört</b> katına çıkar (N²). Kırmızı: çarpışan toplar.`
        : `<b>Düzgün ızgara:</b> her top yalnızca kendi hücresi ve 8 komşu hücredeki toplarla test edilir. Hücre rengi doluluk. Fareyi gezdirin: sarı çerçeve “yakınımda kim var?” sorgusunun baktığı 3×3 hücre, sarı toplar adaylar. Hücre boyunu değiştirin: çok küçük → çok hücre, çok büyük → hücreler kalabalık.`;
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousemove', e => { mouse = mp(e); }); C.addEventListener('mouseleave', () => { mouse = null; });
    const run = () => { if (timer) return; timer = setInterval(() => { tick(); draw(); }, 33); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yöntem: ', select({ brute: 'kaba kuvvet (herkes herkesle)', grid: 'düzgün ızgara / uzaysal hash' }, c.mode, v => { c.mode = v; })),
      slider('top sayısı', 50, 1500, c.n, 50, v => { c.n = v; }), slider('hücre boyu', 10, 160, c.cell, 5, v => { c.cell = v; })), C, info);
    make(); tick(); draw(); SL.onTheme(draw);
    return { start: run, stop };
  };

  /* ================= 2) dörtlü ağaç (quadtree) ================= */
  function makeQT(x, y, w, h, cap, depth = 0) { return { x, y, w, h, cap, depth, pts: [], kids: null }; }
  function qtInsert(n, p) {
    if (p.x < n.x || p.x >= n.x + n.w || p.y < n.y || p.y >= n.y + n.h) return false;
    if (!n.kids) {
      if (n.pts.length < n.cap || n.depth >= 7) { n.pts.push(p); return true; }
      const hw = n.w / 2, hh = n.h / 2;
      n.kids = [makeQT(n.x, n.y, hw, hh, n.cap, n.depth + 1), makeQT(n.x + hw, n.y, hw, hh, n.cap, n.depth + 1), makeQT(n.x, n.y + hh, hw, hh, n.cap, n.depth + 1), makeQT(n.x + hw, n.y + hh, hw, hh, n.cap, n.depth + 1)];
      const old = n.pts; n.pts = []; old.forEach(q => n.kids.some(k => qtInsert(k, q)));
    }
    return n.kids.some(k => qtInsert(k, p));
  }
  function qtQuery(n, cx, cy, r, st) {   // daireyle kesişmeyen düğümü hiç açma
    const nx = SL.clamp(cx, n.x, n.x + n.w), ny = SL.clamp(cy, n.y, n.y + n.h);
    if ((nx - cx) ** 2 + (ny - cy) ** 2 > r * r) { st.pruned.push(n); return; }
    st.visited.push(n);
    n.pts.forEach(p => { st.checked.push(p); if ((p.x - cx) ** 2 + (p.y - cy) ** 2 <= r * r) st.found.push(p); });
    if (n.kids) n.kids.forEach(k => qtQuery(k, cx, cy, r, st));
  }
  SL.QT = { makeQT, qtInsert, qtQuery };
  D.quadtree = function (root) {
    const W = 720, H = 340;
    const c = { cap: 4, r: 55 };
    let pts = [], tree, mouse = V.v(260, 170), seed = 2, nodes = 0;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const rebuild = () => { tree = makeQT(0, 0, W, H, c.cap); pts.forEach(p => qtInsert(tree, p)); nodes = 0; (function cnt(n) { nodes++; if (n.kids) n.kids.forEach(cnt); })(tree); };
    const scatter = (n, cl) => { const r = RNG(seed++); for (let i = 0; i < n; i++) { if (cl) { const a = r() * 7, d = r() * r() * 90; pts.push(V.v(SL.clamp(520 + Math.cos(a) * d, 2, W - 2), SL.clamp(120 + Math.sin(a) * d, 2, H - 2))); } else pts.push(V.v(2 + r() * (W - 4), 2 + r() * (H - 4))); } rebuild(); };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const st = { visited: [], pruned: [], checked: [], found: [] }; qtQuery(tree, mouse.x, mouse.y, c.r, st);
      st.visited.forEach(n => { if (!n.kids) { ctx.fillStyle = t.dark ? 'rgba(255,190,60,0.16)' : 'rgba(255,190,60,0.18)'; ctx.fillRect(n.x, n.y, n.w, n.h); } });
      ctx.strokeStyle = t.rule; ctx.lineWidth = 1; (function dr(n) { ctx.strokeRect(n.x + 0.5, n.y + 0.5, n.w, n.h); if (n.kids) n.kids.forEach(dr); })(tree);
      const chk = new Set(st.checked), fnd = new Set(st.found);
      pts.forEach(p => { ctx.fillStyle = fnd.has(p) ? t.green : chk.has(p) ? t.amber : (t.dark ? '#7d84a3' : '#8d8aa0'); ctx.beginPath(); ctx.arc(p.x, p.y, fnd.has(p) ? 4.5 : 3, 0, 7); ctx.fill(); });
      ctx.strokeStyle = t.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, c.r, 0, 7); ctx.stroke();
      SL.drawLabel(ctx, `nokta ${pts.length} · düğüm ${nodes}`, 10, 14, t.ink, { size: 12, align: 'left' });
      SL.drawLabel(ctx, `sorgu: ${st.visited.length} düğüm açıldı, ${st.pruned.length} dal hiç açılmadı · ${st.checked.length} noktaya bakıldı (kaba kuvvet: ${pts.length}) · ${st.found.length} bulundu`, 10, H - 12, t.ink, { size: 11, align: 'left' });
      info.innerHTML = `Bir kare en çok <b>${c.cap}</b> nokta tutar; dolunca <b>dörde bölünür</b>. Kalabalık yerler ince, boş yerler kaba bölünür: yapı veriye uyum sağlar. Yeşil daire “yakınımda kim var?” sorgusu: daireye değmeyen kareler <b>hiç açılmaz</b> (budama). Sarı: bakılan noktalar · yeşil: daire içindekiler. <b>Tıklayın:</b> nokta ekleyin ve karenin bölünmesini izleyin.`;
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousemove', e => { mouse = mp(e); draw(); });
    C.addEventListener('mousedown', e => { const p = mp(e); pts.push(V.v(SL.clamp(p.x, 1, W - 1), SL.clamp(p.y, 1, H - 1))); rebuild(); draw(); });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      btn('🎲 +100 dağınık', () => { scatter(100, false); draw(); }), btn('🎯 +100 kümeli', () => { scatter(100, true); draw(); }), btn('↺ temizle', () => { pts = []; rebuild(); draw(); }),
      slider('kare kapasitesi', 1, 10, c.cap, 1, v => { c.cap = v; rebuild(); draw(); }), slider('sorgu yarıçapı', 15, 150, c.r, 5, v => { c.r = v; draw(); })), C, info);
    scatter(60, false); scatter(60, true); draw(); SL.onTheme(draw);
  };

  /* ================= 3) BVH: kutu hiyerarşisi ve ışın ================= */
  function buildBVH(items, depth = 0) {
    const box = items.reduce((b, it) => ({ x0: Math.min(b.x0, it.x), y0: Math.min(b.y0, it.y), x1: Math.max(b.x1, it.x + it.w), y1: Math.max(b.y1, it.y + it.h) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
    const node = { box, depth, items: null, kids: null };
    if (items.length <= 2) { node.items = items; return node; }
    const horiz = box.x1 - box.x0 >= box.y1 - box.y0;
    const s = items.slice().sort((a, b) => (horiz ? a.x + a.w / 2 - (b.x + b.w / 2) : a.y + a.h / 2 - (b.y + b.h / 2))), m = s.length >> 1;
    node.kids = [buildBVH(s.slice(0, m), depth + 1), buildBVH(s.slice(m), depth + 1)];
    return node;
  }
  function rayBox(o, d, x0, y0, x1, y1) {   // "dilim" testi: ışın kutuya hangi t'de girer? (yoksa null)
    let t0 = 0, t1 = 1;
    for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1]]) {
      if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) return null; continue; }
      let ta = (a - oo) / dd, tb = (b - oo) / dd; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return null;
    }
    return t0;
  }
  SL.BVH = { buildBVH, rayBox };
  D.bvh = function (root) {
    const W = 720, H = 340;
    let items = [], tree, O = V.v(60, 300), mouse = V.v(600, 60), seed = 9, show = 3, n = 36, dragO = false;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' }); big(C);
    const gen = () => { const r = RNG(seed); items = []; let guard = 0; while (items.length < n && guard++ < 4000) { const w = 16 + r() * 34, h = 16 + r() * 30, x = 110 + r() * (W - 130 - w), y = 8 + r() * (H - 50 - h); if (items.every(o => x + w + 6 < o.x || o.x + o.w + 6 < x || y + h + 6 < o.y || o.y + o.h + 6 < y)) items.push({ x, y, w, h, id: items.length }); } tree = buildBVH(items); };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const d = V.sub(mouse, O), st = { nodes: 0, skipped: 0, tests: 0, tested: new Set(), nodeHit: [], nodeMiss: [] }; let best = null;
      (function go(nd) {
        st.nodes++; const tb = rayBox(O, d, nd.box.x0, nd.box.y0, nd.box.x1, nd.box.y1);
        if (tb === null || (best && tb > best.t)) { st.nodeMiss.push(nd); (function cnt(q) { if (q.items) st.skipped += q.items.length; else q.kids.forEach(cnt); })(nd); return; }
        st.nodeHit.push(nd);
        if (nd.items) nd.items.forEach(it => { st.tests++; st.tested.add(it); const tt = rayBox(O, d, it.x, it.y, it.x + it.w, it.y + it.h); if (tt !== null && (!best || tt < best.t)) best = { t: tt, it }; });
        else { const ks = nd.kids.map(k => [rayBox(O, d, k.box.x0, k.box.y0, k.box.x1, k.box.y1), k]).sort((a, b) => (a[0] === null ? 9 : a[0]) - (b[0] === null ? 9 : b[0])); ks.forEach(([, k]) => go(k)); }
      })(tree);
      const cols = [t.purple, t.blue, t.green, t.amber, t.pink || t.red, t.red];
      (function dr(nd) { if (nd.depth > show) return; if (nd.depth > 0 || show === 0) { const hit = st.nodeHit.includes(nd); ctx.strokeStyle = cols[nd.depth % cols.length]; ctx.globalAlpha = hit ? 1 : 0.28; ctx.lineWidth = hit ? 2.5 : 1.2; ctx.setLineDash(hit ? [] : [4, 4]); const p = 3 + (5 - Math.min(5, nd.depth)) * 1.6; ctx.strokeRect(nd.box.x0 - p, nd.box.y0 - p, nd.box.x1 - nd.box.x0 + 2 * p, nd.box.y1 - nd.box.y0 + 2 * p); ctx.setLineDash([]); ctx.globalAlpha = 1; } if (nd.kids) nd.kids.forEach(dr); })(tree);
      items.forEach(it => { ctx.fillStyle = best && best.it === it ? t.red : st.tested.has(it) ? t.amber : (t.dark ? '#565c78' : '#b9b6c9'); ctx.fillRect(it.x, it.y, it.w, it.h); });
      const end = best ? V.add(O, V.mul(d, best.t)) : mouse;
      ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      if (best) { ctx.strokeStyle = t.rule; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(end.x, end.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(end.x, end.y, 5, 0, 7); ctx.fill(); }
      ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(O.x, O.y, 8, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'nişancı (sürükle)', O.x + 10, O.y + 18, t.blue, { size: 10, align: 'left' });
      SL.drawLabel(ctx, `kaba kuvvet: ${items.length} kutu testi`, 10, 14, t.red, { size: 12, align: 'left' });
      SL.drawLabel(ctx, `BVH: ${st.nodes} düğüm + ${st.tests} kutu testi · ${st.skipped} kutuya hiç bakılmadı`, 10, 32, t.green, { size: 12, align: 'left' });
      info.innerHTML = 'Her nesnenin kutusu daha büyük kutuların içinde: bir <b>kutu ağacı</b> (BVH). Işın büyük bir kutuyu ıskalıyorsa <b>içindeki her şeyi</b> ıskalar; o dal hiç açılmaz (soluk, kesikli kutular). Kalın kutular ışının girdiği düğümler; sarı: gerçekten test edilen nesneler; kırmızı: ilk vurulan. Fareyle nişan alın, mavi nişancıyı sürükleyin. “Gösterilen derinlik” ile ağacın katlarını tek tek açın.';
    };
    const mp = mpos(C, W, H);
    C.addEventListener('mousedown', e => { if (V.dist(mp(e), O) < 22) dragO = true; });
    C.addEventListener('mousemove', e => { const p = mp(e); if (dragO) { O = V.v(SL.clamp(p.x, 10, W - 10), SL.clamp(p.y, 10, H - 10)); } else mouse = p; draw(); });
    window.addEventListener('mouseup', () => { dragO = false; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('gösterilen derinlik', 0, 5, show, 1, v => { show = v; draw(); }), slider('nesne', 8, 60, n, 2, v => { n = v; gen(); draw(); }), btn('🎲 yeni sahne', () => { seed++; gen(); draw(); })), C, info);
    gen(); draw(); SL.onTheme(draw);
  };

  /* ---------- simlab: ızgarayı sen kur ---------- */
  SL.SIMLABS.grid = function (box, api) {
    const W = 520, H = 300, SIZE = 50, N = 70;
    let fn = null, pts = [], vel = [], grid = null, err = null;
    const fresh = () => { const r = RNG(4); pts = Array.from({ length: N }, () => [r() * W, r() * H]); vel = pts.map(() => [(r() - 0.5) * 60, (r() - 0.5) * 60]); };
    fresh();
    const ref = (P, s) => { const g = {}; P.forEach((p, i) => { const k = Math.floor(p[0] / s) + ',' + Math.floor(p[1] / s); (g[k] = g[k] || []).push(i); }); return g; };
    const same = (a, b) => { const ka = Object.keys(a).filter(k => a[k] && a[k].length).sort(), kb = Object.keys(b).sort(); if (ka.join('|') !== kb.join('|')) return `hücre anahtarları farklı. Beklenen örnek: "${kb[0]}"; sizinki: "${ka[0]}"`; for (const k of kb) { const x = a[k].slice().sort((p, q) => p - q), y = b[k]; if (x.length !== y.length || x.some((v, i) => v !== y[i])) return `"${k}" hücresinde [${y}] olmalı, sizde [${x}]`; } return null; };
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt) {
        pts.forEach((p, i) => { p[0] += vel[i][0] * dt; p[1] += vel[i][1] * dt; if (p[0] < 0 || p[0] >= W) { vel[i][0] *= -1; p[0] = SL.clamp(p[0], 0, W - 0.01); } if (p[1] < 0 || p[1] >= H) { vel[i][1] *= -1; p[1] = SL.clamp(p[1], 0, H - 0.01); } });
        if (fn) { try { grid = fn(pts.map(p => p.slice()), SIZE); err = grid && typeof grid === 'object' ? null : 'buildGrid bir nesne döndürmeli'; } catch (e) { err = SL.jsErrorText(e); grid = null; } }
      },
      render(ctx, w, t) {
        if (grid && !err) Object.keys(grid).forEach(k => { const [cx, cy] = k.split(',').map(Number), l = grid[k] || []; if (!Number.isFinite(cx) || !l.length) return; ctx.fillStyle = `rgba(79,140,255,${Math.min(0.55, 0.12 * l.length)})`; ctx.fillRect(cx * SIZE, cy * SIZE, SIZE, SIZE); SL.drawLabel(ctx, String(l.length), cx * SIZE + SIZE / 2, cy * SIZE + SIZE / 2, t.ink, { size: 12, bg: false }); });
        ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= W; x += SIZE) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = 0; y <= H; y += SIZE) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
        pts.forEach(p => { ctx.fillStyle = t.ink; ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 7); ctx.fill(); });
        SL.drawLabel(ctx, err ? '⚠️ ' + err : fn ? 'hücredeki sayı = sizin ızgaranıza göre o hücredeki nokta sayısı' : 'Kodu çalıştırın', 8, H - 10, err ? t.red : t.muted, { size: 10, align: 'left' });
      },
      reset() { fresh(); grid = null; }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w,
      setFns(f) { fn = f.buildGrid; w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try {
          const r = RNG(31);
          for (const s of [50, 20, 100]) { const P = Array.from({ length: 40 }, () => [Math.round(r() * 5000) / 10, Math.round(r() * 3000) / 10]); const got = mod.buildGrid(P.map(p => p.slice()), s); if (!got || typeof got !== 'object') return { ok: false, msg: '❌ buildGrid bir nesne ({ "cx,cy": [indisler] }) döndürmeli.' }; const d = same(got, ref(P, s)); if (d) return { ok: false, msg: `❌ Hücre boyu ${s}: ${d}. Anahtar "cx,cy" biçiminde, cx = Math.floor(x / size).` }; }
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Izgara doğru. Sağda her hücrede kaç nokta olduğu sizin ızgaranızdan okunuyor; noktalar hareket ettikçe sayılar güncelleniyor.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  const rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * 10) / 10;
  SL.AILABS.cellof = {
    fn: 'cell_of', jsFn: 'cellOf',
    ref: (x, y, s) => [Math.floor(x / s), Math.floor(y / s)],
    cases: () => { const cs = [[130, 75, 50], [0, 0, 50], [49.9, 50, 50], [-10, 20, 50], [-50, -0.1, 50], [199, 399, 100], [26, 24, 50]]; for (let i = 0; i < 12; i++) cs.push([rnd(-200, 600), rnd(-200, 400), [20, 32, 50, 64][i % 4]]); return cs; },
    show: (x, y, s) => `x = ${x}, y = ${y}, hücre boyu ${s}`,
    hint: (x, y, s) => (x < 0 || y < 0 ? 'Eksi koordinatta Math.round ve “| 0” yanlış yuvarlar: −10 / 50 = −0,2 → hücre −1 olmalı (Math.floor), 0 değil.' : `Hücre = aşağı yuvarla(koordinat / hücre boyu): [Math.floor(${x} / ${s}), Math.floor(${y} / ${s})]. Math.round 0,5’ten sonra bir sonraki hücreye atlar.`)
  };
  SL.AILABS.aabb = {
    fn: 'boxes_overlap', jsFn: 'boxesOverlap',
    ref: (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3],
    cases: () => { const cs = [[[0, 0, 10, 10], [5, 5, 10, 10]], [[0, 0, 10, 10], [20, 0, 5, 5]], [[0, 0, 10, 10], [5, 20, 10, 10]], [[0, 0, 10, 10], [10, 0, 5, 5]], [[2, 2, 3, 3], [0, 0, 10, 10]], [[0, 0, 10, 10], [-5, 3, 6, 2]], [[0, 0, 4, 4], [3, -8, 2, 9]]]; for (let i = 0; i < 15; i++) cs.push([[rnd(0, 30), rnd(0, 30), rnd(2, 15), rnd(2, 15)], [rnd(0, 30), rnd(0, 30), rnd(2, 15), rnd(2, 15)]]); return cs; },
    show: (a, b) => `A = [x, y, genişlik, yükseklik] = ${JSON.stringify(a)}, B = ${JSON.stringify(b)}`,
    hint: () => 'İki kutu ancak HEM x ekseninde HEM y ekseninde örtüşüyorsa çakışır. x’te örtüşme: a.sol < b.sağ VE b.sol < a.sağ. Aynısını y için yazıp && ile bağlayın. Yalnızca kenarı değen kutular çakışmış sayılmaz.'
  };
  SL.AILABS.cands = {
    fn: 'candidates', jsFn: 'candidates',
    ref: (g, s, x, y, r) => { const out = []; for (let cx = Math.floor((x - r) / s); cx <= Math.floor((x + r) / s); cx++) for (let cy = Math.floor((y - r) / s); cy <= Math.floor((y + r) / s); cy++) (g[cx + ',' + cy] || []).forEach(i => out.push(i)); return out.sort((a, b) => a - b); },
    cases: () => { const G = { '0,0': [0, 3], '1,0': [1], '2,0': [7], '0,1': [2], '1,1': [4, 5], '3,2': [6], '-1,0': [8] }; return [[G, 50, 60, 20, 5], [G, 50, 60, 20, 15], [G, 50, 75, 75, 30], [G, 50, 10, 10, 20], [G, 50, 175, 125, 10], [G, 50, 400, 400, 20], [G, 50, 60, 60, 100], [G, 50, 49, 49, 2]]; },
    show: (g, s, x, y, r) => `hücre boyu ${s}, sorgu merkezi (${x}, ${y}), yarıçap ${r}; ızgara ${JSON.stringify(g)}`,
    hint: () => 'Sorgunun kutusu x − r … x + r ve y − r … y + r. Bu kutunun değdiği hücreler: cx = floor((x − r)/size) … floor((x + r)/size), cy aynı şekilde. Her hücrenin listesini (yoksa boş) topla; sonucu küçükten büyüğe sırala. Anahtar biçimi "cx,cy".'
  };
  SL.AILABS.quad = {
    fn: 'quadrant', jsFn: 'quadrant',
    ref: (px, py, cx, cy) => (px >= cx ? 1 : 0) + (py >= cy ? 2 : 0),
    cases: () => { const cs = [[10, 10, 50, 50], [80, 10, 50, 50], [10, 80, 50, 50], [80, 80, 50, 50], [50, 50, 50, 50], [50, 10, 50, 50], [10, 50, 50, 50]]; for (let i = 0; i < 10; i++) cs.push([Math.round(Math.random() * 200), Math.round(Math.random() * 200), 100, 100]); return cs; },
    show: (px, py, cx, cy) => `nokta (${px}, ${py}), karenin merkezi (${cx}, ${cy})`,
    hint: () => '0 = sol üst, 1 = sağ üst, 2 = sol alt, 3 = sağ alt (ekranda y aşağı). Sağdaysa (px ≥ cx) +1, alttaysa (py ≥ cy) +2. Tam merkez çizgisindeki nokta sağa/alta sayılır.'
  };

  /* ---------- başlık ---------- */
  D.titlegeo2 = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H), r = RNG(3), S = 34;
    const bs = Array.from({ length: 46 }, () => ({ x: 690 + r() * 560, y: 10 + r() * 200, vx: (r() - 0.5) * 2, vy: (r() - 0.5) * 1.6 }));
    let timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); const cnt = new Map();
      bs.forEach(b => { const k = Math.floor(b.x / S) * 100 + Math.floor(b.y / S); cnt.set(k, (cnt.get(k) || 0) + 1); });
      cnt.forEach((v, k) => { const cx = Math.floor(k / 100), cy = k - cx * 100; ctx.fillStyle = `rgba(122,215,255,${Math.min(0.5, 0.14 * v)})`; ctx.fillRect(cx * S, cy * S, S - 1, S - 1); });
      bs.forEach(b => { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(b.x, b.y, 3.2, 0, 7); ctx.fill(); });
    };
    const tick = () => { if (!running) return; bs.forEach(b => { b.x += b.vx; b.y += b.vy; if (b.x < 690 || b.x > 1255) b.vx *= -1; if (b.y < 8 || b.y > 215) b.vy *= -1; }); draw(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
