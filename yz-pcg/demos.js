/* "Prosedürel İçerik Üretimi" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS;
  const T = () => SL.theme();

  /* ---------- tohumlu rastgele sayı üreteci (mulberry32) ---------- */
  const RNG = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  SL.PCG_RNG = RNG;
  const seedBox = (val, onChange) => { const i = el('input', { type: 'number', value: val, class: 'seed-in', onchange: e => onChange(+e.target.value | 0) }); return el('label', { class: 'ctl' }, 'tohum: ', i); };

  /* ================= Perlin gürültüsü ================= */
  function makePerlin(seed) {
    const r = RNG(seed), p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    const P = p.concat(p);
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const grad = (h, x, y) => { switch (h & 7) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } };
    return (x, y) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y), a = P[X] + Y, b = P[X + 1] + Y;
      const l1 = grad(P[a], x, y) + u * (grad(P[b], x - 1, y) - grad(P[a], x, y));
      const l2 = grad(P[a + 1], x, y - 1) + u * (grad(P[b + 1], x - 1, y - 1) - grad(P[a + 1], x, y - 1));
      return (l1 + v * (l2 - l1)) * 0.7;   // ≈ [-1, 1]
    };
  }
  SL.makePerlin = makePerlin;
  const BIOMES = [[-1, '#2a5d9f', 'derin su'], [0, '#3f86c9', 'sığ su'], [0.04, '#e6d49a', 'kum'], [0.22, '#6fb35a', 'çimen'], [0.42, '#3c7f3a', 'orman'], [0.58, '#8a7f74', 'kaya'], [0.72, '#f2f2f2', 'kar']];
  D.noise = function (root) {
    const W = 720, H = 300, cell = 4, GW = W / cell, GH = 230 / cell;
    const c = { seed: 7, scale: 60, oct: 5, pers: 0.5, lac: 2, water: -0.1, view: 'biome' };
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    let noise = makePerlin(c.seed);
    const fbm = (x, y) => { let amp = 1, f = 1, s = 0, norm = 0; for (let o = 0; o < c.oct; o++) { s += amp * noise(x * f, y * f); norm += amp; amp *= c.pers; f *= c.lac; } return s / norm; };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const h = fbm(i * cell / c.scale, j * cell / c.scale) * 1.6 - c.water;
        if (c.view === 'gray') { const g = Math.round(255 * Math.min(1, Math.max(0, (h + 1) / 2))); ctx.fillStyle = `rgb(${g},${g},${g})`; }
        else { let col = BIOMES[0][1]; for (const [th, cc] of BIOMES) if (h >= th) col = cc; ctx.fillStyle = col; }
        ctx.fillRect(i * cell, j * cell, cell, cell);
      }
      // kesit: ortadaki satırın yükseklik profili
      const y0 = 236, hh = 60, row = Math.floor(GH / 2);
      ctx.strokeStyle = t.amber; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, row * cell); ctx.lineTo(W, row * cell); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = t.dark ? 'rgba(63,134,201,0.35)' : 'rgba(63,134,201,0.25)'; ctx.fillRect(0, y0 + hh / 2, W, hh / 2);
      ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= W; x += 2) { const h = fbm(x / c.scale, row * cell / c.scale) * 1.6 - c.water; const y = y0 + hh / 2 - h * hh / 2; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); SL.drawLabel(ctx, 'kesit (sarı çizgi) — mavi: deniz seviyesi', 8, y0 + 8, t.muted, { size: 10, align: 'left' });
      info.innerHTML = `${c.oct} oktav: her oktav bir öncekinin ${c.lac}× frekansında ve ${c.pers}× genliğinde (fBm). Aynı tohum = aynı dünya: tohumu not edin, yeniden yazın, harita birebir geri gelir.`;
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      seedBox(c.seed, v => { c.seed = v; noise = makePerlin(v); draw(); }), btn('🎲', () => { c.seed = Math.floor(Math.random() * 99999); noise = makePerlin(c.seed); root.querySelector('.seed-in').value = c.seed; draw(); }),
      slider('ölçek', 10, 160, c.scale, 5, v => { c.scale = v; draw(); }), slider('oktav', 1, 8, c.oct, 1, v => { c.oct = v; draw(); }),
      slider('kalıcılık', 0.1, 0.9, c.pers, 0.05, v => { c.pers = v; draw(); })),
      el('div', { class: 'sv-controls' }, slider('boşluk (lacunarity)', 1.5, 3, c.lac, 0.1, v => { c.lac = v; draw(); }), slider('deniz seviyesi', -0.5, 0.5, c.water, 0.05, v => { c.water = v; draw(); }),
        el('label', { class: 'ctl' }, 'görünüm: ', select({ biome: 'biyom renkleri', gray: 'gri yükseklik' }, c.view, v => { c.view = v; draw(); }))), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= zindan üreteçleri ================= */
  function floodRegions(g, W, H) {
    const lab = new Int32Array(W * H).fill(-1); let n = 0; const sizes = [];
    for (let s = 0; s < W * H; s++) {
      if (g[s] || lab[s] >= 0) continue; let size = 0; const st = [s]; lab[s] = n;
      while (st.length) { const k = st.pop(); size++; const x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const q = ny * W + nx; if (!g[q] && lab[q] < 0) { lab[q] = n; st.push(q); } } }
      sizes.push(size); n++;
    }
    return { lab, sizes };
  }
  SL.floodRegions = floodRegions;
  const caStep = (g, W, H) => { const ng = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || g[ny * W + nx]) n++; } const i = y * W + x; ng[i] = n >= 5 || (g[i] && n >= 4) ? 1 : 0; } return ng; };
  function genBSP(W, H, r) {
    const g = new Uint8Array(W * H).fill(1), rooms = [], leaves = [];
    const split = (x, y, w, h, d) => {
      if (d === 0 || (w < 16 && h < 12)) { leaves.push({ x, y, w, h }); return; }
      // en-boy oranına göre böl: geniş parçayı dikey, uzun parçayı yatay kes; kareye yakınsa yazı tura
      const canV = w >= 16, canH = h >= 12;
      if (!canV && !canH) { leaves.push({ x, y, w, h }); return; }
      const horiz = !canV ? true : !canH ? false : w / h > 2.2 ? false : r() < 0.4;
      if (horiz) { const s = 5 + Math.floor(r() * (h - 10)); split(x, y, w, s, d - 1); split(x, y + s, w, h - s, d - 1); }
      else { const s = 7 + Math.floor(r() * (w - 14)); split(x, y, s, h, d - 1); split(x + s, y, w - s, h, d - 1); }
    };
    split(0, 0, W, H, 4);
    leaves.forEach(L => { const rw = Math.max(3, Math.floor(L.w * (0.5 + r() * 0.35))), rh = Math.max(3, Math.floor(L.h * (0.5 + r() * 0.35))); const rx = L.x + 1 + Math.floor(r() * Math.max(1, L.w - rw - 1)), ry = L.y + 1 + Math.floor(r() * Math.max(1, L.h - rh - 1)); rooms.push({ x: rx, y: ry, w: Math.min(rw, W - rx - 1), h: Math.min(rh, H - ry - 1) }); });
    rooms.forEach(R => { for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) g[y * W + x] = 0; });
    const ctr = R => [R.x + (R.w >> 1), R.y + (R.h >> 1)];
    for (let i = 1; i < rooms.length; i++) { const [ax, ay] = ctr(rooms[i - 1]), [bx, by] = ctr(rooms[i]); for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) g[ay * W + x] = 0; for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) g[y * W + bx] = 0; }
    return { g, rooms, leaves };
  }
  function genWalk(W, H, r, fill) {
    const g = new Uint8Array(W * H).fill(1); let x = W >> 1, y = H >> 1, open = 0, steps = 0;
    while (open < W * H * fill && steps++ < 200000) { if (g[y * W + x]) { g[y * W + x] = 0; open++; } const d = Math.floor(r() * 4); x = Math.min(W - 2, Math.max(1, x + [1, -1, 0, 0][d])); y = Math.min(H - 2, Math.max(1, y + [0, 0, 1, -1][d])); }
    return g;
  }
  D.dungeon = function (root) {
    const W = 720, H = 330, GW = 60, GH = 26, cs = 12;
    const c = { algo: 'ca', seed: 3, fill: 0.45, iters: 4, walk: 0.35, showRegions: true };
    let g, extra = null, iter = 0;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const gen = () => {
      const r = RNG(c.seed); extra = null;
      if (c.algo === 'ca') { g = new Uint8Array(GW * GH); for (let i = 0; i < GW * GH; i++) g[i] = r() < c.fill ? 1 : 0; iter = 0; for (let k = 0; k < c.iters; k++) { g = caStep(g, GW, GH); iter++; } }
      else if (c.algo === 'bsp') { const o = genBSP(GW, GH, r); g = o.g; extra = o; }
      else g = genWalk(GW, GH, r, c.walk);
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const { lab, sizes } = floodRegions(g, GW, GH); const big = sizes.indexOf(Math.max(...sizes, 0));
      for (let i = 0; i < GW * GH; i++) {
        const x = (i % GW) * cs, y = ((i / GW) | 0) * cs;
        if (g[i]) ctx.fillStyle = t.dark ? '#3a3f55' : '#4a4f63';
        else ctx.fillStyle = c.showRegions && lab[i] !== big ? (t.dark ? '#7a3434' : '#f1b3a8') : (t.dark ? '#2b2f40' : '#efe9dc');
        ctx.fillRect(x, y, cs, cs);
      }
      if (extra && c.algo === 'bsp') { ctx.strokeStyle = t.amber; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); extra.leaves.forEach(L => ctx.strokeRect(L.x * cs + 0.5, L.y * cs + 0.5, L.w * cs, L.h * cs)); ctx.setLineDash([]); }
      const open = g.reduce((a, v) => a + (v ? 0 : 1), 0), lost = open - (sizes[big] || 0);
      SL.drawLabel(ctx, `açık hücre ${open} · bölge ${sizes.length} · ana bölgeye bağlı olmayan ${lost}`, W / 2, H - 9, lost ? t.red : t.green, { size: 11 });
      info.innerHTML = { ca: `Hücresel otomat: rastgele doldur (%${Math.round(c.fill * 100)} duvar), sonra her adımda “8 komşudan en az 5’i duvarsa duvar ol” kuralı. Adım: <b>${iter}</b>. Kırmızı: ana mağaraya bağlı olmayan cepler (flood fill ile bulundu).`, bsp: 'İkili alan bölme (BSP): alanı ikiye, sonra parçaları tekrar ikiye böl (sarı kesikli çizgiler); her yaprağa bir oda koy; sırayla komşu odaları L biçimli koridorlarla bağla. Hep bağlı ve “insan yapımı” görünür.', walk: `Sarhoş yürüyüşü: ortadan başla, rastgele yönde yürü, geçtiğin yeri kaz; alanın %${Math.round(c.walk * 100)}’i açılınca dur. Hep bağlıdır (tek bir yürüyüş!), organik ve dolambaçlıdır.` }[c.algo];
    };
    const regen = () => { gen(); draw(); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yöntem: ', select({ ca: 'hücresel otomat (mağara)', bsp: 'BSP (oda + koridor)', walk: 'sarhoş yürüyüşü' }, c.algo, v => { c.algo = v; regen(); })),
      seedBox(c.seed, v => { c.seed = v; regen(); }), btn('🎲', () => { c.seed = Math.floor(Math.random() * 99999); root.querySelector('.seed-in').value = c.seed; regen(); }),
      el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { c.showRegions = e.target.checked; draw(); } }); x.checked = true; return x; })(), ' kopuk bölgeleri göster')),
      el('div', { class: 'sv-controls' }, slider('ilk duvar oranı', 0.3, 0.6, c.fill, 0.01, v => { c.fill = v; if (c.algo === 'ca') regen(); }), slider('otomat adımı', 0, 10, c.iters, 1, v => { c.iters = v; if (c.algo === 'ca') regen(); }),
        slider('kazılacak oran', 0.1, 0.6, c.walk, 0.05, v => { c.walk = v; if (c.algo === 'walk') regen(); })), C, info);
    regen(); SL.onTheme(draw);
  };

  /* ================= dalga fonksiyonu çöküşü (basit karo modeli) ================= */
  const TILES = [{ n: 'derin su', col: '#2a5d9f' }, { n: 'su', col: '#3f86c9' }, { n: 'kum', col: '#e6d49a' }, { n: 'çimen', col: '#6fb35a' }, { n: 'orman', col: '#2f6e33' }, { n: 'dağ', col: '#8a7f74' }];
  // komşuluk kuralı: aynı karo ya da bir “yanındaki” karo (sıra boyunca) yan yana gelebilir
  const OK = (a, b) => Math.abs(a - b) <= 1;
  D.wfc = function (root) {
    const W = 720, H = 300, GW = 36, GH = 14, cs = 20;
    let opts, seed = 11, r, timer = null, steps = 0, fails = 0, weights = [1, 1, 1, 2, 1.5, 1];
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const reset = () => { r = RNG(seed + fails * 7919); opts = Array.from({ length: GW * GH }, () => TILES.map((_, i) => i)); steps = 0; };
    const propagate = start => {
      const st = [start];
      while (st.length) {
        const k = st.pop(), x = k % GW, y = (k / GW) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const q = ny * GW + nx;
          const before = opts[q].length; opts[q] = opts[q].filter(b => opts[k].some(a => OK(a, b)));
          if (opts[q].length === 0) return false;
          if (opts[q].length < before) st.push(q);
        }
      }
      return true;
    };
    const step = () => {
      let best = -1, bl = 99;
      for (let i = 0; i < opts.length; i++) { const l = opts[i].length; if (l > 1 && (l < bl || (l === bl && r() < 0.3))) { bl = l; best = i; } }
      if (best < 0) return 'done';
      const o = opts[best], tot = o.reduce((a, i) => a + weights[i], 0); let x = r() * tot, pick = o[0]; for (const i of o) { x -= weights[i]; if (x <= 0) { pick = i; break; } }
      opts[best] = [pick]; steps++;
      if (!propagate(best)) { fails++; reset(); return 'fail'; }
      return 'ok';
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < GW * GH; i++) {
        const x = (i % GW) * cs, y = ((i / GW) | 0) * cs, o = opts[i];
        if (o.length === 1) { ctx.fillStyle = TILES[o[0]].col; ctx.fillRect(x, y, cs - 1, cs - 1); }
        else { // olası karoların küçük şeritleri + seçenek sayısı (entropi)
          o.forEach((ti, k) => { ctx.fillStyle = TILES[ti].col; ctx.globalAlpha = o.length === TILES.length ? 0.18 : 0.45; ctx.fillRect(x + (k * (cs - 1)) / o.length, y, (cs - 1) / o.length, cs - 1); });
          ctx.globalAlpha = 1; if (o.length < TILES.length) SL.drawLabel(ctx, String(o.length), x + cs / 2, y + cs / 2, t.ink, { size: 10, bg: false });
        }
      }
      const done = opts.every(o => o.length === 1);
      TILES.forEach((tl, i) => { ctx.fillStyle = tl.col; ctx.fillRect(10 + i * 110, H - 18, 14, 14); SL.drawLabel(ctx, tl.n, 30 + i * 110, H - 11, t.ink, { size: 11, align: 'left', bg: false }); });
      info.innerHTML = `Adım ${steps}${fails ? ` · çelişki nedeniyle ${fails} kez baştan` : ''}${done ? ' · <b>bitti</b>' : ''}. Kural: bir karo sadece kendisiyle ya da “bir yanındakiyle” komşu olabilir (derin su–su–kum–çimen–orman–dağ). Sayı = o hücrede hâlâ mümkün olan karo sayısı; her adımda <b>en az seçeneği olan</b> hücre çöker, kısıtlar komşulara yayılır.`;
    };
    const run = () => { if (timer) { clearInterval(timer); timer = null; return; } timer = setInterval(() => { for (let k = 0; k < 4; k++) { if (step() === 'done') { clearInterval(timer); timer = null; break; } } draw(); }, 30); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      btn('1 adım', () => { step(); draw(); }), btn('▶ / ⏸ çalıştır', run), btn('⏭ hepsi', () => { let g = 0; while (step() !== 'done' && g++ < 5000); draw(); }),
      seedBox(seed, v => { seed = v; fails = 0; reset(); draw(); }), btn('↺ yeni', () => { seed = Math.floor(Math.random() * 99999); fails = 0; root.querySelector('.seed-in').value = seed; reset(); draw(); }),
      slider('çimen ağırlığı', 0.5, 5, weights[3], 0.5, v => { weights[3] = v; }), slider('su ağırlığı', 0.5, 5, weights[1], 0.5, v => { weights[1] = v; weights[0] = v; })), C, info);
    reset(); draw(); SL.onTheme(draw);
    return { stop() { if (timer) { clearInterval(timer); timer = null; } } };
  };

  /* ================= L-sistemleri ================= */
  const LSYS = {
    plant: { ax: 'X', rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' }, ang: 25, n: 5, start: -90, name: 'eğrelti benzeri bitki' },
    bush: { ax: 'F', rules: { F: 'FF+[+F-F-F]-[-F+F+F]' }, ang: 22.5, n: 4, start: -90, name: 'çalı' },
    koch: { ax: 'F', rules: { F: 'F+F-F-F+F' }, ang: 90, n: 4, start: 0, name: 'Koch eğrisi' },
    dragon: { ax: 'FX', rules: { X: 'X+YF+', Y: '-FX-Y' }, ang: 90, n: 11, start: 0, name: 'ejderha eğrisi' }
  };
  const expand = (ax, rules, n) => { let s = ax; for (let i = 0; i < n; i++) { let o = ''; for (const ch of s) o += rules[ch] !== undefined ? rules[ch] : ch; s = o; if (s.length > 400000) break; } return s; };
  SL.LSYS_expand = expand;
  D.lsystem = function (root) {
    const W = 720, H = 330;
    let key = 'plant', n = LSYS.plant.n, ang = LSYS.plant.ang, jitter = 0, seed = 1;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const draw = () => {
      const t = T(), L = LSYS[key], s = expand(L.ax, L.rules, n), r = RNG(seed);
      // önce sınırları bul, sonra ölçekle
      const walk = cb => { let x = 0, y = 0, a = L.start * Math.PI / 180; const st = []; for (const ch of s) { if (ch === 'F') { const nx = x + Math.cos(a), ny = y + Math.sin(a); cb(x, y, nx, ny, st.length); x = nx; y = ny; } else if (ch === '+') a += (ang + (r() - 0.5) * jitter) * Math.PI / 180; else if (ch === '-') a -= (ang + (r() - 0.5) * jitter) * Math.PI / 180; else if (ch === '[') st.push([x, y, a]); else if (ch === ']') [x, y, a] = st.pop(); } };
      let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9; walk((x, y, nx, ny) => { mnx = Math.min(mnx, x, nx); mny = Math.min(mny, y, ny); mxx = Math.max(mxx, x, nx); mxy = Math.max(mxy, y, ny); });
      const sc = Math.min((W - 30) / Math.max(1e-6, mxx - mnx), (H - 40) / Math.max(1e-6, mxy - mny)), ox = (W - (mxx - mnx) * sc) / 2 - mnx * sc, oy = (H - 20 - (mxy - mny) * sc) / 2 - mny * sc + 4;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1; ctx.lineCap = 'round';
      // ikinci geçiş: aynı tohumla yeniden yürüyüp çiz (sınır hesabıyla aynı açılar)
      (function () { let x = 0, y = 0, a = L.start * Math.PI / 180; const st = []; const rr = RNG(seed); for (const ch of s) { if (ch === 'F') { const nx = x + Math.cos(a), ny = y + Math.sin(a); const d = st.length; ctx.strokeStyle = key === 'koch' || key === 'dragon' ? t.blue : d > 3 ? t.green : (t.dark ? '#b08a5a' : '#7a5a32'); ctx.beginPath(); ctx.moveTo(ox + x * sc, oy + y * sc); ctx.lineTo(ox + nx * sc, oy + ny * sc); ctx.stroke(); x = nx; y = ny; } else if (ch === '+') a += (ang + (rr() - 0.5) * jitter) * Math.PI / 180; else if (ch === '-') a -= (ang + (rr() - 0.5) * jitter) * Math.PI / 180; else if (ch === '[') st.push([x, y, a]); else if (ch === ']') [x, y, a] = st.pop(); } })();
      SL.drawLabel(ctx, `${L.name} · aksiyom “${L.ax}” · ${n} yineleme · dize uzunluğu ${s.length.toLocaleString('tr')}`, W / 2, H - 10, t.muted, { size: 11 });
      info.innerHTML = `Kurallar: ${Object.entries(L.rules).map(([k, v]) => `<code>${k} → ${v}</code>`).join(' · ')}. Kaplumbağa: <code>F</code> ileri çiz, <code>+</code>/<code>−</code> ${ang}° dön, <code>[</code> konumu kaydet, <code>]</code> geri dön (dal!). ${jitter ? 'Açıya ±' + jitter / 2 + '° rastgelelik eklendi: her ağaç farklı.' : ''}`;
    };
    const setKey = k => { key = k; n = LSYS[k].n; ang = LSYS[k].ang; nS.querySelector('input').value = n; nS.querySelector('b').textContent = n; aS.querySelector('input').value = ang; aS.querySelector('b').textContent = ang; draw(); };
    const nS = slider('yineleme', 1, 12, n, 1, v => { n = v; draw(); }), aS = slider('açı', 5, 120, ang, 0.5, v => { ang = v; draw(); });
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Sistem: ', select(Object.fromEntries(Object.entries(LSYS).map(([k, v]) => [k, v.name])), key, setKey)), nS, aS,
      slider('rastgelelik', 0, 30, jitter, 1, v => { jitter = v; draw(); }), btn('🎲 başka ağaç', () => { seed = Math.floor(Math.random() * 9999); draw(); })), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= Spelunky: 4×4 oda ızgarası ve çözüm yolu ================= */
  D.spelunky = function (root) {
    const W = 720, H = 330, RW = 10, RH = 8, cs = 9, ox = 20, oy = 10;
    let seed = 5, rooms, path;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const gen = () => {
      const r = RNG(seed); rooms = Array.from({ length: 4 }, () => Array(4).fill(0)); path = [];
      let x = Math.floor(r() * 4), y = 0; rooms[y][x] = 1; path.push([x, y]);
      while (true) {
        const d = Math.floor(r() * 5);   // 0,1: sol · 2,3: sağ · 4: aşağı (Spelunky’deki gibi)
        let nx = x, down = false;
        if (d < 2) nx = x - 1; else if (d < 4) nx = x + 1; else down = true;
        if (!down && (nx < 0 || nx > 3)) down = true;
        if (down) { if (y === 3) break; rooms[y][x] = rooms[y][x] === 3 ? 4 : 2; y++; rooms[y][x] = 3; path.push([x, y]); }
        else { if (!rooms[y][nx]) rooms[y][nx] = 1; x = nx; path.push([x, y]); }
      }
      rooms.exit = [x, y]; rooms.start = path[0];
    };
    // her oda tipi için basit karo şablonu (# duvar, . boş); sonra rastgele süs
    const tmpl = (type, r) => {
      const g = Array.from({ length: RH }, (_, j) => Array.from({ length: RW }, (_, i) => (j === 0 || j === RH - 1 || i === 0 || i === RW - 1 ? '#' : '.')));
      if (type >= 1) { for (let j = 3; j < 6; j++) { g[j][0] = '.'; g[j][RW - 1] = '.'; } }               // sol-sağ açık
      if (type === 2 || type === 4) for (let i = 3; i < 7; i++) g[RH - 1][i] = '.';                      // alt açık
      if (type === 3 || type === 4) for (let i = 3; i < 7; i++) g[0][i] = '.';                           // üst açık
      for (let k = 0; k < 4; k++) { const i = 1 + Math.floor(r() * (RW - 2)), j = 2 + Math.floor(r() * (RH - 4)); if (type === 0 || r() < 0.5) g[j][i] = '#'; }
      if (type === 0 && r() < 0.5) for (let i = 1; i < RW - 1; i++) g[4][i] = '#';
      return g;
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const r = RNG(seed * 31 + 1), cols = ['#888', '#5aa9e6', '#e67e5a', '#9be37a', '#c79bff'];
      for (let ry = 0; ry < 4; ry++) for (let rx = 0; rx < 4; rx++) {
        const type = rooms[ry][rx], g = tmpl(type, r), bx = ox + rx * RW * cs, by = oy + ry * RH * cs;
        for (let j = 0; j < RH; j++) for (let i = 0; i < RW; i++) { ctx.fillStyle = g[j][i] === '#' ? (t.dark ? '#5b5145' : '#8a6f4e') : (t.dark ? '#22252f' : '#f3ede1'); ctx.fillRect(bx + i * cs, by + j * cs, cs, cs); }
        ctx.strokeStyle = cols[type]; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, RW * cs - 2, RH * cs - 2);
        SL.drawLabel(ctx, String(type), bx + 10, by + 10, cols[type], { size: 10 });
      }
      ctx.strokeStyle = t.green; ctx.lineWidth = 3; ctx.beginPath(); path.forEach(([x, y], i) => { const px = ox + x * RW * cs + RW * cs / 2, py = oy + y * RH * cs + RH * cs / 2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
      const [sx, sy] = rooms.start, [ex, ey] = rooms.exit;
      SL.drawLabel(ctx, 'GİRİŞ', ox + sx * RW * cs + RW * cs / 2, oy + sy * RH * cs + RH * cs / 2, t.blue, { size: 11 });
      SL.drawLabel(ctx, 'ÇIKIŞ', ox + ex * RW * cs + RW * cs / 2, oy + ey * RH * cs + RH * cs / 2, t.red, { size: 11 });
      const lx = ox + 4 * RW * cs + 30;
      [['0', 'yol dışı (kapalı olabilir)'], ['1', 'sol–sağ açık'], ['2', 'sol–sağ + ALT açık (buradan düşülür)'], ['3', 'sol–sağ + ÜST açık (buraya düşülür)'], ['4', 'hem üst hem alt açık']].forEach(([k, d], i) => { ctx.fillStyle = cols[i]; ctx.fillRect(lx, 30 + i * 26, 14, 14); SL.drawLabel(ctx, k + ': ' + d, lx + 22, 37 + i * 26, t.ink, { size: 11, align: 'left', bg: false }); });
      SL.drawLabel(ctx, 'yeşil: garantili çözüm yolu', lx, 30 + 5 * 26 + 8, t.green, { size: 11, align: 'left', bg: false });
      info.innerHTML = 'Önce <b>yol</b>, sonra <b>içerik</b>: üst sıradan rastgele bir odadan başla; rastgele sola, sağa ya da aşağı git; kenara çarpınca aşağı in; en alt sırada aşağı inmek isteyince orası çıkış. Yol üstündeki odalar açıklıklarına uygun el yapımı şablonlardan seçilir; şablonların içi de biraz rastgeledir.';
    };
    root.append(el('div', { class: 'sv-controls' }, seedBox(seed, v => { seed = v; gen(); draw(); }), btn('🎲 yeni seviye', () => { seed = Math.floor(Math.random() * 99999); root.querySelector('.seed-in').value = seed; gen(); draw(); })), C, info);
    gen(); draw(); SL.onTheme(draw);
  };

  /* ---------- simlab: mağara otomatı kuralı ---------- */
  SL.SIMLABS.cave = function (box, api) {
    const GW = 48, GH = 26, cs = 11, W = GW * cs, H = GH * cs + 24;
    let fn = null, g, it = 0, seed = 9, acc = 0;
    const fresh = () => { const r = RNG(seed); g = new Uint8Array(GW * GH); for (let i = 0; i < GW * GH; i++) g[i] = r() < 0.45 ? 1 : 0; it = 0; };
    fresh();
    const nb = (x, y) => { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || g[ny * GW + nx]) n++; } return n; };
    const w = new SL.World({
      W, H, autoplay: false,
      update(dt, w) {
        if (!fn) return; acc += dt; if (acc < 0.5) return; acc = 0;
        if (it >= 8) { seed++; fresh(); return; }
        const ng = new Uint8Array(GW * GH);
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let v; try { v = fn(!!g[y * GW + x], nb(x, y)); } catch (e) { w.pause(); api.setMsg('err', '⚠️ isWall hata verdi: ' + SL.jsErrorText(e)); return; } ng[y * GW + x] = v ? 1 : 0; }
        g = ng; it++;
      },
      render(ctx, w, t) {
        for (let i = 0; i < GW * GH; i++) { ctx.fillStyle = g[i] ? (t.dark ? '#3a3f55' : '#4a4f63') : (t.dark ? '#2b2f40' : '#efe9dc'); ctx.fillRect((i % GW) * cs, ((i / GW) | 0) * cs, cs, cs); }
        SL.drawLabel(ctx, `adım ${it}/8 (sonra yeni tohum)`, 8, H - 12, t.muted, { size: 11, align: 'left' });
      },
      reset() { fresh(); }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    const ref = (wall, n) => n >= 5 || (wall && n >= 4);
    return {
      world: w,
      setFns(f) { fn = f.isWall; fresh(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try { for (const wall of [false, true]) for (let n = 0; n <= 8; n++) { const got = !!mod.isWall(wall, n), exp = ref(wall, n); if (got !== exp) return { ok: false, msg: `❌ isWall(${wall}, ${n}) = ${got}, beklenen ${exp}. Kural: 8 komşudan en az 5’i duvarsa duvar; zaten duvarsa 4 de yeter.` }; } }
        catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ Kural doğru. Sağda gürültü birkaç adımda mağaraya dönüşüyor; 8 adımdan sonra yeni bir tohumla baştan başlıyor.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  SL.AILABS.lcg = {
    fn: 'lcg', jsFn: 'lcg',
    ref: (seed, n) => { const out = []; let x = seed; for (let i = 0; i < n; i++) { x = (1664525 * x + 1013904223) % 4294967296; out.push(x); } return out; },
    cases: () => { const cs = [[0, 3], [1, 2], [42, 5], [123456, 1], [7, 0]]; for (let i = 0; i < 8; i++) cs.push([Math.floor(Math.random() * 1e6), 1 + Math.floor(Math.random() * 6)]); return cs; },
    show: (s, n) => `tohum ${s}, n = ${n}`,
    hint: () => 'x = (1664525 · x + 1013904223) mod 2³² (= 4294967296). Her adımda yeni x’i listeye ekleyin; ilk x tohumun kendisi, listeye girmez.'
  };
  SL.AILABS.lsys = {
    fn: 'expand', jsFn: 'expand',
    ref: (ax, rules, n) => expand(ax, rules, n),
    cases: () => [['F', { F: 'F+F' }, 1], ['F', { F: 'F+F' }, 3], ['X', { X: 'F[+X]-X', F: 'FF' }, 2], ['A', { A: 'AB', B: 'A' }, 5], ['F', {}, 4], ['AB', { A: 'BA' }, 0], ['F-G', { F: 'F-G+F+G-F', G: 'GG' }, 2]],
    show: (a, r, n) => `aksiyom “${a}”, kurallar ${JSON.stringify(r)}, n = ${n}`,
    hint: () => 'n kez tekrarla: dizedeki HER karakter için, kuralı varsa kuralın sağ tarafını, yoksa karakterin kendisini yeni dizeye ekle. Bütün karakterler AYNI ANDA değişir (eski dizeden okuyup yeni dizeye yazın). A→AB, B→A ile Fibonacci uzunlukları çıkar.'
  };
  SL.AILABS.vnoise = {
    fn: 'value_noise', jsFn: 'valueNoise', tol: 1e-9,
    ref: (x, lat) => { const i = Math.floor(x), t = x - i, a = lat[i % lat.length], b = lat[(i + 1) % lat.length], s = t * t * (3 - 2 * t); return a + (b - a) * s; },
    cases: () => { const L = [0, 1, 0.5, 0.2, 0.9]; const cs = [[0, L], [1, L], [0.5, L], [1.25, L], [4.5, L], [7.3, L], [2.999, L]]; for (let i = 0; i < 7; i++) cs.push([Math.round(Math.random() * 1200) / 100, Array.from({ length: 4 + (i % 3) }, () => Math.round(Math.random() * 100) / 100)]); return cs; },
    show: (x, l) => `x = ${x}, kafes değerleri ${JSON.stringify(l)}`,
    hint: () => 'i = floor(x), t = x − i. a = lattice[i mod n], b = lattice[(i+1) mod n]. Yumuşatma: s = t·t·(3 − 2t). Sonuç: a + (b − a)·s.'
  };

  /* ---------- başlık ---------- */
  D.titlepcg = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const noise = makePerlin(4);
    let t = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const cell = 8;
      for (let y = 0; y < H; y += cell) for (let x = 640; x < W; x += cell) {
        let h = 0, amp = 1, f = 1; for (let o = 0; o < 4; o++) { h += amp * noise((x + t) / 90 * f, y / 90 * f); amp *= 0.5; f *= 2; } h /= 1.875;
        let col = '#2a5d9f'; for (const [th, cc] of BIOMES) if (h * 1.6 >= th) col = cc;
        ctx.globalAlpha = Math.min(1, (x - 640) / 200) * 0.85; ctx.fillStyle = col; ctx.fillRect(x, y, cell, cell);
      }
      ctx.globalAlpha = 1;
    };
    const tick = () => { if (!running) return; t += 2; draw(); timer = setTimeout(tick, 60); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
