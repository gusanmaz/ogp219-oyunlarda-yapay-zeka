/* "Taktik YZ" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const segRect = (a, b, r) => {
    let t0 = 0, t1 = 1; const d = V.sub(b, a);
    for (const [p, dd, lo, hi] of [[a.x, d.x, r.x, r.x + r.w], [a.y, d.y, r.y, r.y + r.h]]) {
      if (Math.abs(dd) < 1e-9) { if (p < lo || p > hi) return false; continue; }
      let ta = (lo - p) / dd, tb = (hi - p) / dd; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false;
    }
    return true;
  };
  // "bitişik siper": tehdit yönünde, noktaya en fazla `reach` uzaklıkta bir engel var mı?
  const nearCover = (p, threat, covers, reach = 60) => { const d = V.sub(threat, p), L = V.len(d); if (L < 1) return false; const q = V.add(p, V.mul(d, Math.min(1, reach / L))); return covers.some(r => segRect(p, q, r)); };

  /* ================= etki haritası ================= */
  const fall = { linear: (d, r) => Math.max(0, 1 - d / r), exp: (d, r) => Math.exp(-3 * d / r) * (d < r * 1.5 ? 1 : 0), step: (d, r) => (d < r ? 1 : 0) };
  SL.IMAP_FALLOFF = fall;
  D.influence = function (root) {
    const W = 720, H = 380, cs = 20, GW = W / cs, GH = H / cs;
    const cfg = { view: 'diff', falloff: 'linear', r: 200 };
    let units = [{ s: 'b', p: V.v(150, 120), str: 1 }, { s: 'b', p: V.v(170, 260), str: 1 }, { s: 'b', p: V.v(240, 190), str: 1 }, { s: 'r', p: V.v(560, 110), str: 1 }, { s: 'r', p: V.v(590, 280), str: 1.5 }];
    let drag = null;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const compute = () => {
      const B = new Float32Array(GW * GH), R = new Float32Array(GW * GH);
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const c = V.v((i + 0.5) * cs, (j + 0.5) * cs); units.forEach(u => { const v = u.str * fall[cfg.falloff](V.dist(c, u.p), cfg.r); if (u.s === 'b') B[j * GW + i] += v; else R[j * GW + i] += v; }); }
      return { B, R };
    };
    const draw = () => {
      const t = T(), { B, R } = compute(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      let weak = null, weakV = Infinity;
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const k = j * GW + i, b = B[k], r = R[k];
        let col = null;
        if (cfg.view === 'blue') col = `rgba(79,140,255,${Math.min(0.85, b * 0.6)})`;
        else if (cfg.view === 'red') col = `rgba(255,92,122,${Math.min(0.85, r * 0.6)})`;
        else if (cfg.view === 'diff') { const d = b - r; col = d >= 0 ? `rgba(79,140,255,${Math.min(0.85, d * 0.6)})` : `rgba(255,92,122,${Math.min(0.85, -d * 0.6)})`; }
        else if (cfg.view === 'tension') col = `rgba(245,165,36,${Math.min(0.9, Math.min(b, r) * 1.2)})`;
        else if (cfg.view === 'vuln') { const v = (b + r) > 0.05 ? Math.max(0, (b + r) - 2 * Math.abs(b - r)) : 0; col = `rgba(169,112,255,${Math.min(0.9, v * 0.7)})`; }
        ctx.fillStyle = col; ctx.fillRect(i * cs, j * cs, cs, cs);
        // kırmızının en zayıf olduğu ama mavinin ulaşabildiği yer: saldırı noktası adayı
        if (b > 0.15 && r > 0.02 && r - b * 0.3 < weakV) { weakV = r - b * 0.3; weak = V.v((i + 0.5) * cs, (j + 0.5) * cs); }
      }
      if (cfg.view === 'diff') { // sıfır çizgisi: cephe
        ctx.fillStyle = t.ink; for (let j = 0; j < GH; j++) for (let i = 0; i < GW - 1; i++) { const a = B[j * GW + i] - R[j * GW + i], c = B[j * GW + i + 1] - R[j * GW + i + 1]; if ((a > 0) !== (c > 0) && (B[j * GW + i] + R[j * GW + i]) > 0.05) ctx.fillRect((i + 1) * cs - 1.5, j * cs, 3, cs); }
        for (let j = 0; j < GH - 1; j++) for (let i = 0; i < GW; i++) { const a = B[j * GW + i] - R[j * GW + i], c = B[(j + 1) * GW + i] - R[(j + 1) * GW + i]; if ((a > 0) !== (c > 0) && (B[j * GW + i] + R[j * GW + i]) > 0.05) ctx.fillRect(i * cs, (j + 1) * cs - 1.5, cs, 3); }
      }
      units.forEach(u => { ctx.fillStyle = u.s === 'b' ? t.blue : t.red; ctx.beginPath(); ctx.arc(u.p.x, u.p.y, 8 + u.str * 3, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); });
      if (weak && cfg.view === 'diff') { ctx.strokeStyle = t.green; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(weak.x, weak.y, 14, 0, 7); ctx.stroke(); SL.drawLabel(ctx, 'mavinin saldırı adayı (kırmızı zayıf)', weak.x, weak.y - 22, t.green, { size: 10 }); }
      info.innerHTML = { blue: 'Mavi etki: her birim, gücü kadar etki yayar; uzaklaştıkça azalır.', red: 'Kırmızı etki.', diff: 'Fark (mavi − kırmızı): kim neyi kontrol ediyor? Siyah çizgiler: <b>cephe hattı</b> (fark sıfır).', tension: 'Gerilim (min(mavi, kırmızı)): iki tarafın da güçlü olduğu yer — çatışma bölgesi.', vuln: 'Kırılganlık: toplam etki yüksek ama fark küçük — dengenin hassas olduğu, takviye gereken yerler.' }[cfg.view];
    };
    const pos = e => { const r = C.getBoundingClientRect(); return V.v(((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height); };
    C.addEventListener('mousedown', e => { const p = pos(e); const u = units.find(q => V.dist(q.p, p) < 16); if (u) { drag = u; return; } units.push({ s: e.shiftKey ? 'r' : 'b', p, str: 1 }); draw(); });
    C.addEventListener('mousemove', e => { if (!drag) return; drag.p = pos(e); draw(); });
    window.addEventListener('mouseup', () => { drag = null; });
    C.addEventListener('dblclick', e => { const p = pos(e); units = units.filter(q => V.dist(q.p, p) >= 16); draw(); });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Görünüm: ', select({ diff: 'kontrol (mavi − kırmızı)', blue: 'mavi etki', red: 'kırmızı etki', tension: 'gerilim', vuln: 'kırılganlık' }, cfg.view, v => { cfg.view = v; draw(); })),
      el('label', { class: 'ctl' }, 'Azalma: ', select({ linear: 'doğrusal', exp: 'üstel', step: 'basamak' }, cfg.falloff, v => { cfg.falloff = v; draw(); })),
      slider('etki yarıçapı', 40, 260, cfg.r, 10, v => { cfg.r = v; draw(); }),
      btn('temizle', () => { units = []; draw(); })),
      C, el('div', { class: 'mini' }, 'Tıkla = mavi birim · Shift+tıkla = kırmızı · sürükle = taşı · çift tık = sil'), info);
    draw(); SL.onTheme(draw);
  };

  /* ================= konum seçimi (Killzone / Crysis TPS / EQS) ================= */
  const COVERS = [{ x: 260, y: 90, w: 30, h: 70 }, { x: 420, y: 230, w: 80, h: 26 }, { x: 180, y: 250, w: 70, h: 26 }, { x: 520, y: 80, w: 26, h: 80 }, { x: 350, y: 150, w: 40, h: 30 }];
  function candidates() {
    const P = [];
    COVERS.forEach(r => { for (let k = 0; k <= 4; k++) { const t = k / 4; P.push(V.v(r.x - 16, r.y + r.h * t), V.v(r.x + r.w + 16, r.y + r.h * t), V.v(r.x + r.w * t, r.y - 16), V.v(r.x + r.w * t, r.y + r.h + 16)); } });
    for (let y = 40; y < 380; y += 60) for (let x = 60; x < 700; x += 60) P.push(V.v(x, y));
    return P.filter(p => !COVERS.some(r => p.x > r.x - 8 && p.x < r.x + r.w + 8 && p.y > r.y - 8 && p.y < r.y + r.h + 8));
  }
  const CANDS = candidates();
  SL.TAC_COVERS = COVERS;
  D.position = function (root) {
    const W = 720, H = 380;
    const cfg = { wProx: 20, wCover: 40, wRange: 10, range: 180, minDist: 40, needCover: true };
    let agent = V.v(110, 190), threat = V.v(600, 200), drag = null, best = null;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const evalP = p => {
      const covered = nearCover(p, threat, COVERS);
      const dAgent = V.dist(p, agent), dThreat = V.dist(p, threat);
      // koşullar (filtre)
      if (dThreat < cfg.minDist) return null;
      if (cfg.needCover && !covered) return null;
      // ağırlıklar (Killzone tarzı toplam)
      const prox = Math.max(0, 1 - dAgent / 500), inRange = Math.abs(dThreat - cfg.range) < 60 ? 1 : 0;
      return { s: cfg.wProx * prox + cfg.wCover * (covered ? 1 : 0) + cfg.wRange * inRange, covered };
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = t.amber; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(threat.x, threat.y, cfg.range, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      COVERS.forEach(r => { ctx.fillStyle = t.dark ? '#4a4f63' : '#3d4255'; ctx.fillRect(r.x, r.y, r.w, r.h); });
      const scored = CANDS.map(p => ({ p, e: evalP(p) }));
      const ok = scored.filter(x => x.e); const mx = Math.max(1e-6, ...ok.map(x => x.e.s));
      best = ok.reduce((a, x) => (!a || x.e.s > a.e.s ? x : a), null);
      scored.forEach(x => { if (!x.e) { ctx.fillStyle = t.rule; ctx.beginPath(); ctx.arc(x.p.x, x.p.y, 3, 0, 7); ctx.fill(); return; } const k = x.e.s / mx; ctx.fillStyle = `hsl(${120 * k}, 70%, ${t.dark ? 55 : 45}%)`; ctx.beginPath(); ctx.arc(x.p.x, x.p.y, 5, 0, 7); ctx.fill(); });
      if (best) { ctx.strokeStyle = t.green; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(best.p.x, best.p.y, 11, 0, 7); ctx.stroke(); ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(agent.x, agent.y); ctx.lineTo(best.p.x, best.p.y); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(agent.x, agent.y, 11, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'asker', agent.x, agent.y + 22, t.blue, { size: 11 });
      ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(threat.x, threat.y, 11, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'tehdit', threat.x, threat.y + 22, t.red, { size: 11 });
      info.innerHTML = `${CANDS.length} aday → koşullardan geçen <b>${ok.length}</b> → en iyi puan <b>${best ? best.e.s.toFixed(1) : '—'}</b>. Gri = elenen, kırmızıdan yeşile = puan. Siper = tehdit yönünde, 60 birim içinde bir engel (sırtını dayayabileceği kutu).`;
    };
    const pos = e => { const r = C.getBoundingClientRect(); return V.v(((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height); };
    C.addEventListener('mousedown', e => { const p = pos(e); drag = V.dist(p, agent) < 18 ? 'a' : V.dist(p, threat) < 18 ? 't' : null; });
    C.addEventListener('mousemove', e => { if (!drag) return; const p = pos(e); if (drag === 'a') agent = p; else threat = p; draw(); });
    window.addEventListener('mouseup', () => { drag = null; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      slider('yakınlık ağırlığı', 0, 40, cfg.wProx, 5, v => { cfg.wProx = v; draw(); }), slider('siper ağırlığı', 0, 60, cfg.wCover, 5, v => { cfg.wCover = v; draw(); }), slider('menzil ağırlığı', 0, 40, cfg.wRange, 5, v => { cfg.wRange = v; draw(); })),
      el('div', { class: 'sv-controls' }, slider('tercih edilen menzil', 60, 360, cfg.range, 10, v => { cfg.range = v; draw(); }),
        el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.needCover = e.target.checked; draw(); } }); x.checked = true; return x; })(), ' koşul: siper şart'),
        el('span', { class: 'mini' }, 'Asker ve tehdidi sürükleyin.')),
      C, info);
    draw(); SL.onTheme(draw);
  };

  /* ================= taktik yol bulma ================= */
  D.tacpath = function (root) {
    const W = 720, H = 380, cs = 20, GW = W / cs, GH = H / cs;
    // uzun duvarın altı tehdidin görüşünden saklı: en kısa yol açıktan, taktik yol duvarın gölgesinden
    const WALLS = [{ x: 120, y: 220, w: 480, h: 24 }, { x: 240, y: 70, w: 26, h: 60 }, { x: 470, y: 100, w: 60, h: 26 }, { x: 330, y: 300, w: 60, h: 26 }];
    let threat = V.v(360, 30), start = V.v(40, 110), goal = V.v(680, 150), cfg = { danger: 30 }, drag = null;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), info = el('div', { class: 'sv-note' });
    const blocked = i => { const c = V.v((i % GW + 0.5) * cs, (Math.floor(i / GW) + 0.5) * cs); return WALLS.some(r => c.x > r.x && c.x < r.x + r.w && c.y > r.y && c.y < r.y + r.h); };
    const visible = i => { const c = V.v((i % GW + 0.5) * cs, (Math.floor(i / GW) + 0.5) * cs); return V.dist(c, threat) < 420 && !WALLS.some(r => segRect(c, threat, r)); };
    const astar = (danger) => {
      const N = GW * GH, g = new Float64Array(N).fill(Infinity), par = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
      const idx = p => Math.floor(p.y / cs) * GW + Math.floor(p.x / cs), s = idx(start), t = idx(goal);
      const vis = Array.from({ length: N }, (_, i) => visible(i)), blk = Array.from({ length: N }, (_, i) => blocked(i));
      const open = [[0, s]]; g[s] = 0;
      while (open.length) {
        open.sort((a, b) => a[0] - b[0]); const [, cur] = open.shift(); if (closed[cur]) continue; closed[cur] = 1; if (cur === t) break;
        const cx = cur % GW, cy = Math.floor(cur / GW);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const ni = ny * GW + nx; if (blk[ni] || closed[ni]) continue;
          if (dx && dy && (blk[cy * GW + nx] || blk[ny * GW + cx])) continue;
          const step = (dx && dy ? Math.SQRT2 : 1) * (1 + (vis[ni] ? danger / 10 : 0));
          const ng = g[cur] + step; if (ng < g[ni]) { g[ni] = ng; par[ni] = cur; const h = Math.hypot(nx - t % GW, ny - Math.floor(t / GW)); open.push([ng + h, ni]); }
        }
      }
      const path = []; for (let x = t; x >= 0; x = par[x]) { path.unshift(x); if (x === s) break; }
      const exposed = path.filter(i => vis[i]).length;
      return { path, exposed, vis };
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      const a = astar(0), b = astar(cfg.danger);
      a.vis.forEach((v, i) => { if (v && !blocked(i)) { ctx.fillStyle = t.dark ? 'rgba(255,92,122,0.13)' : 'rgba(255,92,122,0.16)'; ctx.fillRect((i % GW) * cs, Math.floor(i / GW) * cs, cs, cs); } });
      WALLS.forEach(r => { ctx.fillStyle = t.dark ? '#4a4f63' : '#3d4255'; ctx.fillRect(r.x, r.y, r.w, r.h); });
      const line = (p, col, dash) => { ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.setLineDash(dash || []); ctx.beginPath(); p.forEach((i, k) => { const x = (i % GW + 0.5) * cs, y = (Math.floor(i / GW) + 0.5) * cs; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); };
      line(a.path, t.muted, [6, 5]); line(b.path, t.green);
      ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(threat.x, threat.y, 11, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'tehdit (sürükle)', threat.x, threat.y + (threat.y < 50 ? 24 : -20), t.red, { size: 11 });
      ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(start.x, start.y, 9, 0, 7); ctx.fill(); ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(goal.x, goal.y, 9, 0, 7); ctx.fill();
      info.innerHTML = `Kesikli gri: en kısa yol — <b>${a.exposed}</b> hücre tehdidin görüşünde, ${a.path.length} adım. Yeşil: taktik yol (görünen hücre maliyeti ×${(1 + cfg.danger / 10).toFixed(1)}) — <b>${b.exposed}</b> hücre görünür, ${b.path.length} adım.`;
    };
    const pos = e => { const r = C.getBoundingClientRect(); return V.v(((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height); };
    C.addEventListener('mousedown', e => { const p = pos(e); drag = V.dist(p, threat) < 18 ? 't' : V.dist(p, start) < 18 ? 's' : V.dist(p, goal) < 18 ? 'g' : null; });
    C.addEventListener('mousemove', e => { if (!drag) return; const p = pos(e); if (drag === 't') threat = p; else if (drag === 's') start = p; else goal = p; draw(); });
    window.addEventListener('mouseup', () => { drag = null; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('tehlike maliyeti', 0, 80, cfg.danger, 5, v => { cfg.danger = v; draw(); }), el('span', { class: 'mini' }, 'Kırmızımsı hücreler tehdidin görüşünde. Tehdidi, başlangıcı (mavi) ve hedefi (yeşil) sürükleyin.')), C, info);
    draw(); SL.onTheme(draw);
  };

  /* ---------- simlab: konum puanı ---------- */
  SL.SIMLABS.posscore = function (box, api) {
    const W = 560, H = 300;
    let fn = null, best = null, t = 0;
    const COV = [{ x: 200, y: 70, w: 26, h: 70 }, { x: 330, y: 170, w: 70, h: 24 }];
    const C2 = []; COV.forEach(r => { for (let k = 0; k <= 3; k++) { const q = k / 3; C2.push(V.v(r.x - 14, r.y + r.h * q), V.v(r.x + r.w + 14, r.y + r.h * q), V.v(r.x + r.w * q, r.y - 14), V.v(r.x + r.w * q, r.y + r.h + 14)); } }); for (let y = 40; y < 300; y += 55) for (let x = 50; x < 540; x += 55) C2.push(V.v(x, y));
    const P = C2.filter(p => !COV.some(r => p.x > r.x - 6 && p.x < r.x + r.w + 6 && p.y > r.y - 6 && p.y < r.y + r.h + 6));
    const agent = V.v(70, 150);
    let threat = V.v(480, 150);
    const w = new SL.World({
      W, H, autoplay: true,
      update(dt, w) {
        t += dt; threat = w.mouse.inside ? V.v(w.mouse.x, w.mouse.y) : V.v(470 + Math.cos(t * 0.5) * 40, 150 + Math.sin(t * 0.7) * 100);
        if (!fn) return; best = null; let bs = -Infinity;
        for (const p of P) { const covered = nearCover(p, threat, COV, 50); let s; try { s = fn(V.dist(p, agent), V.dist(p, threat), covered); } catch (e) { w.pause(); api.setMsg('err', '⚠️ scorePosition hata verdi: ' + SL.jsErrorText(e)); return; } if (typeof s === 'number' && s > bs) { bs = s; best = p; } }
      },
      render(ctx, w, th) {
        COV.forEach(r => { ctx.fillStyle = th.dark ? '#4a4f63' : '#3d4255'; ctx.fillRect(r.x, r.y, r.w, r.h); });
        P.forEach(p => { ctx.fillStyle = th.rule; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); });
        if (best) { ctx.strokeStyle = th.green; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(best.x, best.y, 10, 0, 7); ctx.stroke(); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(agent.x, agent.y); ctx.lineTo(best.x, best.y); ctx.stroke(); ctx.setLineDash([]); }
        ctx.fillStyle = th.blue; ctx.beginPath(); ctx.arc(agent.x, agent.y, 9, 0, 7); ctx.fill();
        ctx.fillStyle = th.red; ctx.beginPath(); ctx.arc(threat.x, threat.y, 9, 0, 7); ctx.fill();
      }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    return {
      world: w,
      setFns(f) { fn = f.scorePosition; w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        try {
          const s = (a, b, c) => mod.scorePosition(a, b, c);
          if (!(s(100, 200, true) > s(100, 200, false))) return { ok: false, msg: '❌ Aynı mesafelerde siperli konum, siperliden daha yüksek puan almalı.' };
          if (!(s(50, 200, true) > s(300, 200, true))) return { ok: false, msg: '❌ Diğer her şey eşitken askere yakın konum daha iyi olmalı.' };
          if (!(s(100, 180, true) > s(100, 40, true))) return { ok: false, msg: '❌ Tehdide çok yakın (40) konum, tercih edilen menzildeki (180) konumdan kötü olmalı.' };
          if (!(s(100, 40, true) < s(100, 300, true))) return { ok: false, msg: '❌ Tehdide 50’den yakın konumlar (koşul!) en düşük puanı almalı.' };
          if ([s(10, 10, false), s(500, 500, true)].some(v => typeof v !== 'number' || Number.isNaN(v))) return { ok: false, msg: '⚠️ scorePosition her zaman bir sayı döndürmeli (elemek için -Infinity kullanabilirsiniz).' };
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ 4 tasarım kuralı sağlandı. Fareyle tehdidi gezdirin: asker hep tehdide göre siperli, yakın ve uygun menzilde bir yer seçmeli.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  SL.AILABS.imap = {
    fn: 'influence', jsFn: 'influence', tol: 1e-9,
    ref: (units, cell, r) => units.reduce((a, [x, y, s]) => a + s * Math.max(0, 1 - Math.hypot(cell[0] - x, cell[1] - y) / r), 0),
    cases: () => { const cs = [[[[0, 0, 1]], [0, 0], 10], [[[0, 0, 1]], [5, 0], 10], [[[0, 0, 1]], [20, 0], 10], [[[0, 0, 2], [10, 0, 1]], [5, 0], 10], [[], [3, 3], 5], [[[3, 4, 1]], [0, 0], 5]]; for (let i = 0; i < 10; i++) cs.push([Array.from({ length: 1 + Math.floor(Math.random() * 4) }, () => [Math.round(Math.random() * 40), Math.round(Math.random() * 40), [0.5, 1, 2][Math.floor(Math.random() * 3)]]), [Math.round(Math.random() * 40), Math.round(Math.random() * 40)], [10, 20, 30][i % 3]]); return cs; },
    show: (u, c, r) => `birimler [x, y, güç] ${JSON.stringify(u)}, hücre ${JSON.stringify(c)}, yarıçap ${r}`,
    hint: () => 'Her birim için güç × max(0, 1 − mesafe / yarıçap) ekleyin. Yarıçap dışındakiler 0 katkı yapar.'
  };
  SL.AILABS.tps = {
    fn: 'pick_position', jsFn: 'pickPosition',
    ref: (cands, minDist, wProx, wCover) => { let best = null, bs = -Infinity; cands.forEach((c, i) => { if (c.d_threat < minDist) return; const s = wProx * Math.max(0, 1 - c.d_agent / 100) + wCover * (c.covered ? 1 : 0); if (s > bs) { bs = s; best = i; } }); return best; },
    cases: () => { const mk = () => ({ d_agent: Math.round(Math.random() * 100), d_threat: Math.round(Math.random() * 100), covered: Math.random() < 0.5 }); const cs = [[[{ d_agent: 10, d_threat: 50, covered: false }, { d_agent: 30, d_threat: 50, covered: true }], 20, 20, 40], [[{ d_agent: 10, d_threat: 50, covered: false }, { d_agent: 30, d_threat: 50, covered: true }], 20, 60, 10], [[{ d_agent: 5, d_threat: 5, covered: true }], 20, 20, 40], [[], 10, 1, 1]]; for (let i = 0; i < 10; i++) cs.push([Array.from({ length: 2 + Math.floor(Math.random() * 6) }, mk), [10, 20, 30][i % 3], [10, 20, 40][i % 3], [10, 40, 20][i % 3]]); return cs; },
    show: (c, m, a, b) => `adaylar ${JSON.stringify(c)}, en az tehdit mesafesi ${m}, ağırlıklar yakınlık ${a} / siper ${b}`,
    hint: () => 'Önce koşul: d_threat < min_dist olanı ele. Puan = w_prox · max(0, 1 − d_agent/100) + w_cover · (siperliyse 1). En yüksek puanlı adayın İNDİSİ; aday kalmadıysa None. Eşitlikte ilki.'
  };

  /* ---------- başlık ---------- */
  D.titletac = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let t = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const B = [V.v(700 + Math.sin(t * 0.02) * 30, 70), V.v(720, 170)], R = [V.v(1150, 90 + Math.cos(t * 0.025) * 40), V.v(1100, 190)];
      for (let y = 0; y < H; y += 14) for (let x = 600; x < W; x += 14) { const p = V.v(x, y); let b = 0, r = 0; B.forEach(q => { b += Math.max(0, 1 - V.dist(p, q) / 260); }); R.forEach(q => { r += Math.max(0, 1 - V.dist(p, q) / 260); }); const d = b - r; ctx.fillStyle = d > 0 ? `rgba(122,200,255,${Math.min(0.6, d)})` : `rgba(255,122,138,${Math.min(0.6, -d)})`; ctx.fillRect(x, y, 13, 13); }
      [...B, ...R].forEach((q, i) => { ctx.fillStyle = i < 2 ? '#7ac8ff' : '#ff7a8a'; ctx.beginPath(); ctx.arc(q.x, q.y, 9, 0, 7); ctx.fill(); });
    };
    const tick = () => { if (!running) return; t++; draw(); timer = setTimeout(tick, 60); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
