/* "Algılama" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const DEG = Math.PI / 180;

  // doğru parçası – dikdörtgen kesişimi (slab)
  const segRect = (a, b, r) => {
    let t0 = 0, t1 = 1; const d = V.sub(b, a);
    for (const [p, dd, lo, hi] of [[a.x, d.x, r.x, r.x + r.w], [a.y, d.y, r.y, r.y + r.h]]) {
      if (Math.abs(dd) < 1e-9) { if (p < lo || p > hi) return false; continue; }
      let ta = (lo - p) / dd, tb = (hi - p) / dd; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false;
    }
    return true;
  };
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  /* ================= görüş modelleri =================
     yerel koordinat: f = ileri mesafe, l = yanal mesafe; dönüş: kesinlik 0..1 */
  const MODELS = {
    bool: { ad: 'evet/hayır koni (mesafe + açı + ışın)', cert: (f, l, d, ang) => (ang <= 45 * DEG && d <= 300 ? 1 : 0) },
    zones: {
      ad: 'görüş bölgeleri (Rabin / Splinter Cell)',
      cert: (f, l, d, ang) => {
        if (f > 0 && f <= 300) { const hw = f < 140 ? 15 + (f / 140) * 55 : 70 - ((f - 140) / 160) * 50; if (Math.abs(l) <= hw) return 1; }   // tabut biçimli tatlı nokta
        if (ang <= 45 * DEG && d <= 330) return 0.5;    // ana koni
        if (ang <= 100 * DEG && d <= 130) return 0.25;  // çevresel görüş
        if (d <= 45) return 0.35;                         // çok yakın: arkadan bile hissedilir
        return 0;
      }
    }
  };
  SL.VISION = MODELS;
  const LEVELS = [[0.3, 'habersiz', 'blue', ''], [0.7, 'şüpheli', 'amber', '?'], [1.0, 'arıyor', 'amber', '??'], [9, 'ALARM', 'red', '!']];
  const levelOf = a => LEVELS.findIndex(l => a < l[0] || l[0] === 9);

  D.vision = function (root) {
    const W = 720, H = 380;
    const cfg = { model: 'zones', light: true, crouch: false, rise: 1.2, decay: 0.2, showZones: true };
    const WALLS = [{ x: 300, y: 165, w: 24, h: 110 }, { x: 470, y: 225, w: 120, h: 24 }];   // devriye yolunun içinde, yolu kesmez
    const SHADOW = [{ x: 380, y: 0, w: 160, h: 170 }, { x: 60, y: 250, w: 200, h: 130 }];
    const PATROL = [V.v(120, 120), V.v(620, 120), V.v(620, 320), V.v(120, 320)];
    let G, aw = 0, lkp = null, mouseHist = [], info = {};
    const reset = () => { G = { p: V.v(120, 120), h: 0, wp: 1, look: null }; aw = 0; lkp = null; };
    reset();
    const certOf = (P) => {
      const to = V.sub(P, G.p), d = V.len(to), fwd = V.fromAngle(G.h), f = V.dot(to, fwd), l = V.cross(fwd, to), ang = Math.acos(SL.clamp(f / (d || 1), -1, 1));
      let c = MODELS[cfg.model].cert(f, l, d, ang);
      const blocked = WALLS.some(r => segRect(G.p, P, r));
      if (blocked) c = 0;
      const dark = cfg.light && SHADOW.some(r => inRect(P, r));
      if (c > 0 && cfg.model !== 'bool') { if (dark) c *= 0.3; if (cfg.crouch) c *= 0.6; }
      return { c, blocked, dark };
    };
    const w = new SL.World({
      W, H, reset,
      update(dt, w) {
        const P = w.mouse.inside ? V.v(w.mouse.x, w.mouse.y) : V.v(500, 60);
        const s = certOf(P); info = s;
        // farkındalık: görülüyorsa kesinlikle orantılı yüksel, görülmüyorsa yavaşça düş (“kapasitör”)
        if (s.c > 0) { aw = Math.min(1.05, aw + (s.c / cfg.rise) * dt); lkp = V.copy(P); }
        else aw = Math.max(0, aw - cfg.decay * dt);
        const lv = levelOf(aw);
        // davranış: devriye → bak → son görülen yere git → kovala
        let tgt = null, sp = 60, turn = 3;
        if (lv === 0) { tgt = PATROL[G.wp]; if (V.dist(G.p, tgt) < 8) G.wp = (G.wp + 1) % PATROL.length; }
        else if (lv === 1) { tgt = null; if (lkp) G.h += SL.clamp(SL.angDiff(G.h, V.angle(V.sub(lkp, G.p))), -turn * dt, turn * dt); }
        else if (lv === 2) { tgt = lkp; sp = 80; }
        else { tgt = s.c > 0 ? P : lkp; sp = 130; turn = 6; }
        if (tgt && V.dist(G.p, tgt) > 6) { const dir = V.norm(V.sub(tgt, G.p)); G.h += SL.clamp(SL.angDiff(G.h, V.angle(dir)), -turn * dt, turn * dt); const n = V.add(G.p, V.mul(V.fromAngle(G.h), sp * dt)); if (!WALLS.some(r => inRect(n, { x: r.x - 10, y: r.y - 10, w: r.w + 20, h: r.h + 20 }))) G.p = n; else G.h += 1.5 * dt; }
        else if (lv === 2 && lkp) G.h += 2 * dt;   // vardı: etrafa bak
      },
      render(ctx, w, t) {
        ctx.fillStyle = t.dark ? '#1a1d28' : '#eef0f4'; ctx.fillRect(0, 0, W, H);
        if (cfg.light) SHADOW.forEach(r => { ctx.fillStyle = t.dark ? 'rgba(0,0,0,0.55)' : 'rgba(20,24,40,0.35)'; ctx.fillRect(r.x, r.y, r.w, r.h); });
        // görüş bölgelerini örnekleyerek çiz
        if (cfg.showZones) { const fwd = V.fromAngle(G.h); for (let y = 0; y < H; y += 8) for (let x = 0; x < W; x += 8) { const P = V.v(x + 4, y + 4), to = V.sub(P, G.p), d = V.len(to); if (d > 340) continue; const f = V.dot(to, fwd), l = V.cross(fwd, to), ang = Math.acos(SL.clamp(f / (d || 1), -1, 1)); const c = MODELS[cfg.model].cert(f, l, d, ang); if (c <= 0 || WALLS.some(r => segRect(G.p, P, r))) continue; ctx.fillStyle = c >= 1 ? 'rgba(255,92,122,0.22)' : c >= 0.5 ? 'rgba(245,165,36,0.18)' : 'rgba(79,140,255,0.16)'; ctx.fillRect(x, y, 8, 8); } }
        WALLS.forEach(r => { ctx.fillStyle = t.dark ? '#4a4f63' : '#3d4255'; ctx.fillRect(r.x, r.y, r.w, r.h); });
        ctx.strokeStyle = t.rule; ctx.setLineDash([4, 6]); ctx.beginPath(); PATROL.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
        if (lkp && levelOf(aw) >= 1) { ctx.globalAlpha = 0.6; ctx.strokeStyle = t.red; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(lkp.x, lkp.y, 11, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; SL.drawLabel(ctx, 'son bilinen konum', lkp.x, lkp.y + 22, t.red, { size: 10 }); }
        const P = w.mouse.inside ? w.mouse : V.v(500, 60);
        ctx.fillStyle = t.green; ctx.globalAlpha = info.dark ? 0.5 : 1; ctx.beginPath(); ctx.arc(P.x, P.y, cfg.crouch ? 7 : 10, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        const lv = levelOf(aw), L = LEVELS[lv];
        SL.drawAgent(ctx, G.p, G.h, t[L[2]], 14);
        if (L[3]) SL.drawLabel(ctx, L[3], G.p.x, G.p.y - 28, t[L[2]], { size: 16 });
        // farkındalık çubuğu
        ctx.fillStyle = t.rule; ctx.fillRect(G.p.x - 25, G.p.y + 20, 50, 6); ctx.fillStyle = t[L[2]]; ctx.fillRect(G.p.x - 25, G.p.y + 20, 50 * Math.min(1, aw), 6);
        SL.drawLabel(ctx, `kesinlik ${info.c ? info.c.toFixed(2) : '0'}${info.blocked ? ' (duvar)' : ''}${info.dark ? ' · gölgede' : ''} · farkındalık ${Math.min(1, aw).toFixed(2)} → ${L[1]}`, 250, 16, t.ink, { size: 12 });
      }
    });
    const cb = (lab, key) => el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg[key] = e.target.checked; } }); x.checked = cfg[key]; return x; })(), ' ' + lab);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Görüş modeli: ', select({ zones: MODELS.zones.ad, bool: MODELS.bool.ad }, cfg.model, v => { cfg.model = v; })),
      cb('ışık/gölge', 'light'), cb('çömel', 'crouch'), cb('bölgeleri göster', 'showZones')),
      el('div', { class: 'sv-controls' }, slider('fark etme süresi (sn)', 0.3, 4, cfg.rise, 0.1, v => { cfg.rise = v; }), slider('unutma hızı (/sn)', 0.05, 1, cfg.decay, 0.05, v => { cfg.decay = v; }), el('span', { class: 'mini' }, 'Fare = oyuncu (yeşil). Kırmızı bölge: kesinlik 1 · turuncu: 0,5 · mavi: 0,25.')),
      w.canvas, w.controls());
    w.reset();
    return { start: () => w.start(), stop: () => w.stop() };
  };

  /* ================= duyma: ses hangi yoldan gelir? ================= */
  D.hearing = function (root) {
    const W = 720, H = 380;
    // iki oda, ortada duvar, iki açıklık: kapı ve pencere
    const WALL_X = 360, OPEN = [{ ad: 'kapı', y0: 300, y1: 350 }, { ad: 'pencere', y0: 60, y1: 90, damp: 0.5 }];
    const cfg = { mode: 'path', loud: 300 };
    let G, noises = [], heard = null, mem = [], lastM = null;
    const reset = () => { G = { p: V.v(470, 200), h: Math.PI }; noises = []; heard = null; mem = []; };
    reset();
    const sideOf = p => (p.x < WALL_X ? 0 : 1);
    const hearDist = (src) => {
      if (cfg.mode === 'euclid' || sideOf(src) === sideOf(G.p)) return { d: V.dist(src, G.p), via: null };
      // farklı odalarda: en kısa açıklık üzerinden (Splinter Cell: Blacklist TEAS fikri)
      let best = null;
      OPEN.forEach(o => { const c = V.v(WALL_X, (o.y0 + o.y1) / 2), d = (V.dist(src, c) + V.dist(c, G.p)) / (o.damp || 1); if (!best || d < best.d) best = { d, via: c, ad: o.ad }; });
      return best;
    };
    const emit = (p, loud) => {
      noises.push({ p: V.copy(p), r: 0, max: loud });
      const h = hearDist(p);
      if (h.d <= loud) { heard = { p: V.copy(p), via: h.via, d: h.d, t: 3 }; mem.unshift({ p: V.copy(p), age: 0, conf: 1 - h.d / loud }); mem.length = Math.min(mem.length, 5); }
    };
    const w = new SL.World({
      W, H, reset,
      onClick(m) { emit(V.v(m.x, m.y), cfg.loud); },
      update(dt, w) {
        // hızlı fare hareketi = koşma = ayak sesi
        if (w.mouse.inside) { const m = V.v(w.mouse.x, w.mouse.y); if (lastM) { const sp = V.dist(m, lastM) / dt; if (sp > 500 && Math.random() < 0.15) emit(m, cfg.loud * 0.5); } lastM = m; } else lastM = null;
        noises.forEach(n => { n.r += 320 * dt; }); noises = noises.filter(n => n.r < n.max);
        mem.forEach(m => { m.age += dt; }); mem = mem.filter(m => m.age < 8);
        if (heard) { heard.t -= dt; const tgt = heard.via && sideOf(heard.p) !== sideOf(G.p) ? heard.via : heard.p; const o = V.sub(tgt, G.p); if (V.len(o) > 8) { G.h += SL.clamp(SL.angDiff(G.h, V.angle(o)), -4 * dt, 4 * dt); G.p = V.add(G.p, V.mul(V.fromAngle(G.h), 70 * dt)); } if (heard.t <= 0) heard = null; }
        if (G.p.x < WALL_X + 12 && G.p.x > WALL_X - 12 && !OPEN.some(o => G.p.y > o.y0 && G.p.y < o.y1)) G.p.x = G.p.x > WALL_X ? WALL_X + 12 : WALL_X - 12;
      },
      render(ctx, w, t) {
        ctx.fillStyle = t.dark ? '#1a1d28' : '#eef0f4'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = t.dark ? '#4a4f63' : '#3d4255';
        let y = 0; OPEN.slice().sort((a, b) => a.y0 - b.y0).forEach(o => { ctx.fillRect(WALL_X - 8, y, 16, o.y0 - y); y = o.y1; }); ctx.fillRect(WALL_X - 8, y, 16, H - y);
        OPEN.forEach(o => SL.drawLabel(ctx, o.ad + (o.damp ? ' (sesi yarıya indirir)' : ''), WALL_X, (o.y0 + o.y1) / 2, t.blue, { size: 10 }));
        SL.drawLabel(ctx, 'A odası', 180, 370, t.muted, { size: 12, bg: false }); SL.drawLabel(ctx, 'B odası', 540, 370, t.muted, { size: 12, bg: false });
        noises.forEach(n => { ctx.strokeStyle = t.amber; ctx.globalAlpha = 1 - n.r / n.max; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(n.p.x, n.p.y, n.r, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; });
        mem.forEach((m, i) => { ctx.globalAlpha = Math.max(0.15, 1 - m.age / 8); ctx.fillStyle = t.purple; ctx.beginPath(); ctx.arc(m.p.x, m.p.y, 6, 0, 7); ctx.fill(); ctx.globalAlpha = 1; if (i === 0) SL.drawLabel(ctx, `hafıza: güven ${m.conf.toFixed(2)}`, m.p.x, m.p.y - 14, t.purple, { size: 10 }); });
        if (heard) { ctx.strokeStyle = t.red; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(heard.p.x, heard.p.y); if (heard.via) ctx.lineTo(heard.via.x, heard.via.y); ctx.lineTo(G.p.x, G.p.y); ctx.stroke(); ctx.setLineDash([]); }
        SL.drawAgent(ctx, G.p, G.h, heard ? t.amber : t.blue, 14); if (heard) SL.drawLabel(ctx, '?', G.p.x, G.p.y - 26, t.amber, { size: 16 });
        if (w.mouse.inside) { ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(w.mouse.x, w.mouse.y, 8, 0, 7); ctx.fill(); }
        SL.drawLabel(ctx, heard ? `duydu: ses mesafesi ${Math.round(heard.d)} ≤ ${cfg.loud}` : 'tıkla = gürültü · fareyi hızlı gezdir = koşma sesi', 250, 16, t.ink, { size: 12 });
      }
    });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Ses mesafesi: ', select({ path: 'açıklıklar üzerinden (Splinter Cell TEAS)', euclid: 'düz çizgi (duvardan geçer!)' }, cfg.mode, v => { cfg.mode = v; })),
      slider('gürültü yarıçapı', 80, 450, cfg.loud, 10, v => { cfg.loud = v; })), w.canvas, w.controls());
    w.reset();
    return { start: () => w.start(), stop: () => w.stop() };
  };

  /* ================= ADSR zarfı (Crytek) ================= */
  D.adsr = function (root) {
    const W = 720, H = 260;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H);
    const P = { a: 0.4, peak: 1, d: 0.6, s: 0.6, r: 1.5 };
    let on = false, t = 0, val = 0, phase = 'boşta', hist = [], tOn = 0, relFrom = 0, tOff = 0, timer = null, running = false;
    const step = dt => {
      t += dt;
      if (on) { const k = t - tOn; if (k < P.a) { val = (k / P.a) * P.peak; phase = 'attack (yüksel)'; } else if (k < P.a + P.d) { val = P.peak - ((k - P.a) / P.d) * (P.peak - P.s); phase = 'decay (otur)'; } else { val = P.s; phase = 'sustain (sürdür)'; } }
      else if (phase !== 'boşta') { const k = t - tOff; val = Math.max(0, relFrom * (1 - k / P.r)); phase = val > 0 ? 'release (söndür)' : 'boşta'; }
      hist.push(val); if (hist.length > 360) hist.shift();
    };
    const draw = () => {
      const th = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = th.card; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = th.rule; ctx.beginPath(); ctx.moveTo(40, 20); ctx.lineTo(40, 220); ctx.lineTo(700, 220); ctx.stroke();
      ctx.strokeStyle = th.blue; ctx.lineWidth = 3; ctx.beginPath(); hist.forEach((v, i) => { const x = 40 + i * (660 / 360), y = 220 - v * 180; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      SL.drawLabel(ctx, `algı değeri ${val.toFixed(2)} · ${phase}`, 160, 14, th.ink, { size: 12 });
      ctx.fillStyle = th.muted; ctx.font = '11px "JetBrains Mono"'; ctx.fillText('1', 28, 44); ctx.fillText('0', 28, 222);
    };
    const loop = () => { if (!running) return; step(1 / 30); draw(); timer = setTimeout(loop, 33); };
    const press = () => { if (on) return; on = true; tOn = t; };
    const release = () => { if (!on) return; on = false; tOff = t; relFrom = val; };
    const hold = btn('👁 uyaran (basılı tutun)', () => {}, 'primary');
    hold.addEventListener('mousedown', press); hold.addEventListener('mouseup', release); hold.addEventListener('mouseleave', release);
    hold.addEventListener('touchstart', e => { e.preventDefault(); press(); }); hold.addEventListener('touchend', release);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, hold,
      slider('attack (sn)', 0.05, 2, P.a, 0.05, v => { P.a = v; }), slider('decay (sn)', 0.05, 2, P.d, 0.05, v => { P.d = v; }), slider('sustain', 0, 1, P.s, 0.05, v => { P.s = v; }), slider('release (sn)', 0.1, 4, P.r, 0.1, v => { P.r = v; })), C);
    draw(); SL.onTheme(draw);
    return { start() { if (!running) { running = true; loop(); } }, stop() { running = false; clearTimeout(timer); } };
  };

  /* ---------- simlab: canSee ---------- */
  SL.SIMLABS.cansee = function (box, api) {
    const W = 560, H = 300;
    const WALLS = [{ x: 250, y: 60, w: 24, h: 110 }];
    let fn = null, g = { p: V.v(120, 150), h: 0, t: 0 }, seen = false;
    const blocked = (a, b) => WALLS.some(r => segRect(V.v(a[0], a[1]), V.v(b[0], b[1]), r));
    const w = new SL.World({
      W, H, autoplay: true,
      reset() { g = { p: V.v(120, 150), h: 0, t: 0 }; },
      update(dt, w) {
        g.t += dt; g.h = Math.sin(g.t * 0.6) * 0.9;
        if (!fn) return; const P = w.mouse.inside ? [w.mouse.x, w.mouse.y] : [400, 150];
        try { seen = fn([g.p.x, g.p.y], [Math.cos(g.h), Math.sin(g.h)], P) === true; } catch (e) { w.pause(); api.setMsg('err', '⚠️ canSee hata verdi: ' + SL.jsErrorText(e)); }
      },
      render(ctx, w, t) {
        SL.drawCone(ctx, g.p, g.h, 90 * DEG, 250, seen ? t.red : t.amber, 0.14);
        WALLS.forEach(r => { ctx.fillStyle = t.dark ? '#4a4f63' : '#3d4255'; ctx.fillRect(r.x, r.y, r.w, r.h); });
        const P = w.mouse.inside ? w.mouse : V.v(400, 150);
        ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(P.x, P.y, 8, 0, 7); ctx.fill();
        SL.drawAgent(ctx, g.p, g.h, seen ? t.red : t.blue, 13);
        SL.drawLabel(ctx, seen ? 'GÖRÜYOR' : 'görmüyor', 280, 14, seen ? t.red : t.ink, { size: 12 });
      }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    const ref = (p, f, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy); if (d > 250) return false; if (d > 0 && (dx * f[0] + dy * f[1]) / d < Math.cos(45 * DEG)) return false; return !blocked(p, q); };
    return {
      world: w, scope: { blocked },
      setFns(f) { fn = f.canSee; w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        const cs = [[[0, 0], [1, 0], [100, 0]], [[0, 0], [1, 0], [300, 0]], [[0, 0], [1, 0], [-50, 0]], [[0, 0], [1, 0], [100, 90]], [[0, 0], [1, 0], [100, 110]], [[120, 150], [1, 0], [350, 120]], [[120, 150], [1, 0], [230, 150]], [[200, 100], [1, 0], [320, 100]], [[0, 0], [0, 1], [0, 200]]];
        for (const [p, f, q] of cs) { let r; try { r = mod.canSee(p, f, q); } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; } const want = ref(p, f, q); if (r !== want) return { ok: false, msg: `❌ canSee(göz ${JSON.stringify(p)}, yön ${JSON.stringify(f)}, hedef ${JSON.stringify(q)}) → ${want} olmalı, seninki ${JSON.stringify(r)}. Sıra: mesafe (≤ 250), açı (≤ 45°, kosinüs ile), sonra blocked(göz, hedef).` }; }
        return { ok: true, msg: '✅ 9/9: klasik üç kontrol doğru. Fareyi koninin içinde, dışında ve duvarın arkasında gezdirin.' };
      }
    };
  };

  /* ---------- ailab’lar ---------- */
  SL.AILABS.aware = {
    fn: 'awareness_step', jsFn: 'awarenessStep', tol: 1e-9,
    ref: (a, c, dt, rise, decay) => (c > 0 ? Math.min(1, a + (c / rise) * dt) : Math.max(0, a - decay * dt)),
    cases: () => { const cs = [[0, 1, 0.1, 1, 0.2], [0.5, 0.5, 0.5, 2, 0.2], [0.95, 1, 0.5, 1, 0.2], [0.3, 0, 1, 1, 0.2], [0.05, 0, 1, 1, 0.2], [0, 0, 1, 1, 0.2], [1, 0.25, 0.1, 1.5, 0.1]]; for (let i = 0; i < 12; i++) cs.push([Math.round(Math.random() * 100) / 100, [0, 0.25, 0.5, 1][i % 4], [0.016, 0.1, 0.5][i % 3], [0.5, 1, 2][i % 3], [0.1, 0.2, 0.5][i % 3]]); return cs; },
    show: (a, c, dt, r, d) => `farkındalık ${a}, kesinlik ${c}, dt ${dt}, fark etme süresi ${r}, unutma hızı ${d}`,
    hint: (a, c) => (c > 0 ? 'Görülüyorsa: a + (c / rise) · dt, ama en fazla 1.' : 'Görülmüyorsa: a − decay · dt, ama en az 0.')
  };
  SL.AILABS.sounddist = {
    fn: 'sound_distance', jsFn: 'soundDistance', tol: 1e-6,
    ref: (src, dst, wallX, doors) => { const side = p => p[0] < wallX; if (side(src) === side(dst)) return Math.hypot(dst[0] - src[0], dst[1] - src[1]); let b = Infinity; doors.forEach(d => { b = Math.min(b, Math.hypot(d[0] - src[0], d[1] - src[1]) + Math.hypot(dst[0] - d[0], dst[1] - d[1])); }); return isFinite(b) ? b : null; },
    cases: () => { const cs = [[[0, 0], [3, 4], 10, [[10, 0]]], [[0, 0], [20, 0], 10, [[10, 5]]], [[0, 0], [20, 0], 10, [[10, 5], [10, -1]]], [[0, 0], [20, 0], 10, []], [[12, 3], [15, 7], 10, [[10, 0]]]]; for (let i = 0; i < 10; i++) { const wx = 50; cs.push([[Math.round(Math.random() * 45), Math.round(Math.random() * 60)], [55 + Math.round(Math.random() * 45), Math.round(Math.random() * 60)], wx, Array.from({ length: 1 + (i % 3) }, () => [wx, Math.round(Math.random() * 60)])]); } return cs; },
    show: (s, d, wx, doors) => `kaynak ${JSON.stringify(s)}, dinleyici ${JSON.stringify(d)}, duvar x = ${wx}, açıklıklar ${JSON.stringify(doors)}`,
    hint: (s, d, wx, doors) => (!doors.length ? 'Farklı odalar ve hiç açıklık yok → None.' : 'Aynı tarafsa düz mesafe; değilse her açıklık için |kaynak − açıklık| + |açıklık − dinleyici| hesaplayıp en küçüğünü alın.')
  };

  /* ---------- başlık ---------- */
  D.titleperc = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let t = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const g = V.v(930, 120), h = Math.sin(t * 0.03) * 0.8;
      for (let k = 0; k < 3; k++) { const r = ((t * 2 + k * 70) % 210); ctx.strokeStyle = `rgba(255,210,122,${1 - r / 210})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(1180, 60, r, 0, 7); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,92,122,0.18)'; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.arc(g.x, g.y, 260, h - 0.6, h + 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,92,122,0.10)'; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.arc(g.x, g.y, 120, h - 1.6, h + 1.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.arc(g.x, g.y, 10, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd27a'; ctx.font = '800 26px "Source Sans 3"'; ctx.textAlign = 'center'; ctx.fillText(Math.sin(t * 0.05) > 0.6 ? '!' : '?', g.x, g.y - 22);
    };
    const tick = () => { if (!running) return; t++; draw(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
