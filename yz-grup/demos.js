/* "Grup Yapay Zekâsı" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();

  /* ================= formasyonlar ================= */
  // ofsetler liderin yerel çerçevesinde: x = ileri, y = sağ
  const SHAPES = {
    line: (i, n, s) => V.v(-s, (i - (n - 1) / 2) * s),
    column: (i, n, s) => V.v(-(i + 1) * s, 0),
    wedge: (i, n, s) => { const r = Math.ceil((i + 1) / 2), side = i % 2 ? 1 : -1; return V.v(-r * s, side * r * s); },
    box: (i, n, s) => { const k = Math.ceil(Math.sqrt(n)); return V.v(-(Math.floor(i / k) + 1) * s, ((i % k) - (k - 1) / 2) * s); },
    circle: (i, n, s) => V.fromAngle((i / n) * Math.PI * 2, s * Math.max(1.2, n / 6))
  };
  SL.FORMATIONS = SHAPES;
  const toWorld = (leader, h, off) => V.add(leader, V.rot(off, h));

  D.formation = function (root) {
    const W = 720, H = 380;
    const cfg = { shape: 'wedge', n: 8, s: 34, assign: 'nearest', wait: true, wall: false };
    let L, units = [], slots = [], target;
    const mkU = () => ({ p: V.v(SL.rand(60, 160), SL.rand(120, 260)), v: V.v(), h: 0, slot: -1 });
    const reset = () => { L = { p: V.v(140, 190), v: V.v(), h: 0, maxSpeed: 110 }; units = Array.from({ length: cfg.n }, mkU); target = V.v(560, 190); };
    reset();
    const GAP = { x: 380, y0: 140, y1: 240 };   // duvardaki geçit
    const assign = () => {
      // slotlara birim ata: sabit sıra ya da açgözlü en yakın
      units.forEach(u => (u.slot = -1));
      if (cfg.assign === 'fixed') { units.forEach((u, i) => (u.slot = i)); return; }
      const free = new Set(units.map((_, i) => i));
      slots.forEach((sp, k) => { let best = -1, bd = Infinity; free.forEach(i => { const d = V.dist(units[i].p, sp); if (d < bd) { bd = d; best = i; } }); if (best >= 0) { units[best].slot = k; free.delete(best); } });
    };
    let assignT = 0;
    const w = new SL.World({
      W, H, reset,
      onClick(m) { target = V.v(m.x, m.y); },
      update(dt, w) {
        while (units.length < cfg.n) units.push(mkU()); if (units.length > cfg.n) units.length = cfg.n;
        // lider: hedefe arrive; geride kalan varsa yavaşla (formasyon hızı = en yavaş üye)
        const lag = units.reduce((m, u) => (u.slot >= 0 ? Math.max(m, V.dist(u.p, slots[u.slot] || u.p)) : m), 0);
        const sp = cfg.wait ? L.maxSpeed * SL.clamp(1.4 - lag / 60, 0.15, 1) : L.maxSpeed;
        const off = V.sub(target, L.p), d = V.len(off);
        const des = d > 2 ? V.setLen(off, Math.min(sp, d * 1.5)) : V.v();
        L.v = V.add(L.v, V.limit(V.sub(des, L.v), 200 * dt)); L.p = V.add(L.p, V.mul(L.v, dt)); if (V.len(L.v) > 5) L.h = V.angle(L.v);
        // duvar: geçitten başka yerden geçme
        if (cfg.wall) [L, ...units].forEach(a => { if (Math.abs(a.p.x - GAP.x) < 10 && (a.p.y < GAP.y0 || a.p.y > GAP.y1)) { a.p.x = a.p.x < GAP.x ? GAP.x - 10 : GAP.x + 10; a.v.x = 0; } });
        // slotlar: lider çerçevesinde; dar geçitte sütuna geç
        let shape = cfg.shape;
        const nearGap = cfg.wall && Math.abs(L.p.x - GAP.x) < 140;
        if (nearGap) shape = 'column';
        slots = units.map((_, i) => toWorld(L.p, L.h, SHAPES[shape](i, units.length, cfg.s)));
        assignT -= dt; if (assignT <= 0) { assign(); assignT = 0.5; }
        units.forEach((u, i) => {
          const sp2 = slots[u.slot] || L.p;
          const o = V.sub(sp2, u.p), dd = V.len(o);
          let desU = dd > 1 ? V.setLen(o, Math.min(150, dd * 2.5)) : V.v();
          units.forEach(q => { if (q === u) return; const k = V.dist(u.p, q.p); if (k < 18 && k > 0) desU = V.add(desU, V.mul(V.sub(u.p, q.p), 40 / k)); });
          u.v = V.add(u.v, V.limit(V.sub(desU, u.v), 400 * dt)); u.p = V.add(u.p, V.mul(u.v, dt)); if (V.len(u.v) > 5) u.h = V.angle(u.v);
        });
        w.nearGap = nearGap; w.lag = lag;
      },
      render(ctx, w, t) {
        if (cfg.wall) { ctx.fillStyle = t.dark ? '#4a4f63' : '#3d4255'; ctx.fillRect(GAP.x - 8, 0, 16, GAP.y0); ctx.fillRect(GAP.x - 8, GAP.y1, 16, H - GAP.y1); }
        ctx.strokeStyle = t.green; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(target.x, target.y, 10, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        slots.forEach((s, k) => { ctx.strokeStyle = t.muted; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, 7); ctx.stroke(); });
        units.forEach(u => { const s = slots[u.slot]; if (!s) return; ctx.strokeStyle = t.dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.moveTo(u.p.x, u.p.y); ctx.lineTo(s.x, s.y); ctx.stroke(); });
        units.forEach(u => SL.drawAgent(ctx, u.p, u.h, t.blue, 9));
        SL.drawAgent(ctx, L.p, L.h, t.red, 13); SL.drawLabel(ctx, 'lider', L.p.x, L.p.y - 22, t.red, { size: 11 });
        SL.drawLabel(ctx, `${w.nearGap ? 'dar geçit: sütun düzenine geçildi · ' : ''}en geride kalan: ${Math.round(w.lag || 0)} px`, 200, 16, t.ink, { size: 12 });
      }
    });
    const cb = (lab, key) => el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg[key] = e.target.checked; } }); x.checked = cfg[key]; return x; })(), ' ' + lab);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Biçim: ', select({ wedge: 'kama (V)', line: 'hat', column: 'sütun', box: 'kare', circle: 'çember' }, cfg.shape, v => { cfg.shape = v; })),
      el('label', { class: 'ctl' }, 'Slot ataması: ', select({ nearest: 'en yakın (açgözlü)', fixed: 'sabit sıra' }, cfg.assign, v => { cfg.assign = v; })),
      slider('üye', 2, 16, cfg.n, 1, v => { cfg.n = v; }), slider('aralık', 20, 60, cfg.s, 2, v => { cfg.s = v; })),
      el('div', { class: 'sv-controls' }, cb('lider geride kalanı bekler', 'wait'), cb('ortada dar geçitli duvar', 'wall'), el('span', { class: 'mini' }, 'Tıkla = yeni hedef (lider oraya gider).')),
      w.canvas, w.controls());
    w.reset();
    return { start: () => w.start(), stop: () => w.stop() };
  };

  /* ================= saldırı yönetimi: kung-fu çemberi ve “Belçika YZ” ================= */
  D.kungfu = function (root) {
    const W = 720, H = 380, P = V.v(360, 190);
    const cfg = { mode: 'belgian', gridCap: 12, atkCap: 10 };
    const TYPES = { soldier: { ad: 'asker', w: 4, col: 'blue', attacks: [['hamle', 5], ['kılıç', 3]], r: 11 }, troll: { ad: 'trol', w: 8, col: 'purple', attacks: [['hücum', 6], ['sopa', 4]], r: 17 } };
    let E = [], gridUsed = 0, atkUsed = 0, dmg = 0, time = 0, log = [];
    const reset = () => { E = []; const add = (type, k) => E.push({ type, p: V.add(P, V.fromAngle(k, 200)), state: 'wait', slot: null, t: SL.rand(0, 1), atk: null, flash: 0 }); [0.2, 1.1, 2.0, 2.9, 3.8, 4.7].forEach((k, i) => add(i % 3 === 2 ? 'troll' : 'soldier', k)); gridUsed = 0; atkUsed = 0; dmg = 0; time = 0; log = []; };
    reset();
    const L = m => { log.unshift(`${time.toFixed(1)} sn: ${m}`); log.length = Math.min(log.length, 5); };
    const w = new SL.World({
      W, H, reset,
      update(dt) {
        time += dt;
        const holders = E.filter(e => e.state !== 'wait');
        // 1) izin dağıt (sahne yöneticisi)
        E.forEach(e => {
          if (e.state !== 'wait') return;
          e.t -= dt; if (e.t > 0) return; e.t = 0.6;
          const ty = TYPES[e.type];
          const ok = cfg.mode === 'kungfu' ? holders.length === 0 && !E.some(o => o.state !== 'wait') : cfg.mode === 'all' ? true : gridUsed + ty.w <= cfg.gridCap;
          if (ok) { e.state = 'approach'; e.slot = V.angle(V.sub(e.p, P)); if (cfg.mode === 'belgian') gridUsed += ty.w; L(`${ty.ad} izin aldı${cfg.mode === 'belgian' ? ` (ızgara ${gridUsed}/${cfg.gridCap})` : ''}`); }
        });
        // 2) hareket ve saldırı
        E.forEach(e => {
          const ty = TYPES[e.type];
          const ring = e.state === 'wait' ? 165 : e.state === 'retreat' ? 140 : 62;
          const tgt = V.add(P, V.fromAngle(e.slot !== null ? e.slot : V.angle(V.sub(e.p, P)), ring));
          const o = V.sub(tgt, e.p), d = V.len(o);
          if (d > 2) e.p = V.add(e.p, V.mul(V.norm(o), Math.min(d, (e.state === 'wait' ? 50 : 120) * dt)));
          // bekleyenler çemberin etrafında yavaşça döner
          if (e.state === 'wait') { const a = V.angle(V.sub(e.p, P)) + 0.15 * dt; e.p = V.add(P, V.fromAngle(a, V.dist(e.p, P))); }
          e.flash -= dt;
          if (e.state === 'approach' && d < 6) {
            // saldırı seç: kapasiteye sığan en güçlü saldırı
            const cap = cfg.mode === 'belgian' ? cfg.atkCap - atkUsed : Infinity;
            const opts = ty.attacks.filter(([, c]) => c <= cap).sort((a, b) => b[1] - a[1]);
            if (opts.length) { e.atk = opts[0]; if (cfg.mode === 'belgian') atkUsed += e.atk[1]; e.state = 'attack'; e.t = 0.9; e.flash = 0.25; dmg += e.atk[1]; L(`${ty.ad}: ${e.atk[0]} (güç ${e.atk[1]})`); }
            else { e.t -= dt; }
          } else if (e.state === 'attack') { e.t -= dt; if (e.t <= 0) { if (cfg.mode === 'belgian') atkUsed -= e.atk[1]; e.state = 'retreat'; e.t = 0.8; } }
          else if (e.state === 'retreat') { e.t -= dt; if (e.t <= 0) { if (cfg.mode === 'belgian') gridUsed -= ty.w; e.state = 'wait'; e.slot = null; e.t = SL.rand(0.5, 1.5); } }
        });
      },
      render(ctx, w, t) {
        ctx.strokeStyle = t.rule; ctx.setLineDash([4, 6]); [62, 165].forEach(r => { ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, 7); ctx.stroke(); }); ctx.setLineDash([]);
        SL.drawLabel(ctx, 'saldırı çemberi', P.x, P.y - 74, t.muted, { size: 10 }); SL.drawLabel(ctx, 'bekleme çemberi', P.x, P.y - 177, t.muted, { size: 10 });
        ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(P.x, P.y, 14, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'oyuncu', P.x, P.y + 26, t.green, { size: 11 });
        E.forEach(e => { const ty = TYPES[e.type]; ctx.fillStyle = e.flash > 0 ? t.red : t[ty.col]; ctx.globalAlpha = e.state === 'wait' ? 0.55 : 1; ctx.beginPath(); ctx.arc(e.p.x, e.p.y, ty.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; if (e.state === 'attack') { ctx.strokeStyle = t.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.p.x, e.p.y); ctx.lineTo(P.x, P.y); ctx.stroke(); } SL.drawLabel(ctx, `${ty.ad} ${ty.w}`, e.p.x, e.p.y - ty.r - 9, t.ink, { size: 10 }); });
        const dps = time > 0 ? (dmg / time) * 60 : 0;
        SL.drawLabel(ctx, `oyuncuya dakikada hasar ≈ ${Math.round(dps)}`, 120, 16, t.ink, { size: 12 });
        if (cfg.mode === 'belgian') SL.drawLabel(ctx, `ızgara ${gridUsed}/${cfg.gridCap} · saldırı ${atkUsed}/${cfg.atkCap}`, 600, 16, t.ink, { size: 12 });
        log.forEach((l, i) => SL.drawLabel(ctx, l, 712, 290 + i * 16, t.muted, { size: 10, align: 'right' }));
      }
    });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Sistem: ', select({ belgian: 'Belçika YZ (ızgara + saldırı kapasitesi)', kungfu: 'kung-fu çemberi (tek tek)', all: 'yönetim yok (herkes saldırır)' }, cfg.mode, v => { cfg.mode = v; w.reset(); })),
      slider('ızgara kapasitesi (zorluk)', 4, 24, cfg.gridCap, 4, v => { cfg.gridCap = v; }), slider('saldırı kapasitesi', 3, 20, cfg.atkCap, 1, v => { cfg.atkCap = v; })),
      w.canvas, w.controls());
    w.reset();
    return { start: () => w.start(), stop: () => w.stop() };
  };

  /* ================= tim: güven ve cephe hattı (Days Gone fikri) ================= */
  const LEVELS = [['panicked', 'panik', 0.5], ['worried', 'endişeli', 0.8], ['neutral', 'nötr', 1.25], ['confident', 'kendinden emin', 2], ['heroic', 'kahraman', Infinity]];
  const confLevel = ratio => LEVELS.findIndex(l => ratio < l[2]);
  SL.confLevel = confLevel;
  D.squad = function (root) {
    const W = 720, H = 380;
    let blue = [], red = [], log = '';
    const mk = (x, y, side) => ({ p: V.v(x, y), hp: 100, side, str: 1 });
    const reset = () => { blue = [mk(140, 140, 'b'), mk(130, 200, 'b'), mk(150, 260, 'b'), mk(110, 300, 'b')]; red = [mk(580, 170, 'r'), mk(600, 230, 'r'), mk(570, 290, 'r')]; };
    reset();
    const w = new SL.World({
      W, H, reset,
      update(dt) {
        const strB = blue.reduce((a, u) => a + u.hp / 100, 0), strR = red.reduce((a, u) => a + u.hp / 100, 0);
        const ratio = strR > 0 ? strB / strR : 9, lv = confLevel(ratio);
        const cB = blue.length ? blue.reduce((a, u) => V.add(a, u.p), V.v()) : V.v(150, 190), cR = red.length ? red.reduce((a, u) => V.add(a, u.p), V.v()) : V.v(600, 190);
        const cb = blue.length ? V.mul(cB, 1 / blue.length) : cB, cr = red.length ? V.mul(cR, 1 / red.length) : cR;
        const dir = V.norm(V.sub(cr, cb)), mid = V.lerp(cb, cr, 0.5), perp = V.perp(dir);
        // cephe hattı: düşmana belli bir mesafe; güvene göre ileri/geri kayar
        const push = [-160, -70, 0, 60, 110][lv];
        const front = V.add(mid, V.mul(dir, push - 40));
        const state = lv <= 1 ? 'geri çekil' : lv === 2 ? 'mevzi tut' : 'baskı yap';
        blue.forEach((u, i) => {
          const k = blue.length > 1 ? i / (blue.length - 1) - 0.5 : 0;
          const want = V.add(V.add(front, V.mul(perp, k * 200)), V.mul(dir, -20 - (i % 2) * 25));
          const o = V.sub(want, u.p), d = V.len(o); if (d > 2) u.p = V.add(u.p, V.mul(V.norm(o), Math.min(d, 70 * dt)));
          u.p.x = SL.clamp(u.p.x, 15, W - 15); u.p.y = SL.clamp(u.p.y, 15, H - 15);
        });
        // ateşleşme: yakın olanlar birbirine hasar verir
        blue.forEach(u => red.forEach(r => { const d = V.dist(u.p, r.p); if (d < 300) { r.hp -= (6 + (lv >= 3 ? 4 : 0)) * dt * (1 - d / 300); u.hp -= 6 * dt * (1 - d / 300); } }));
        blue = blue.filter(u => u.hp > 0); red = red.filter(u => u.hp > 0);
        w.view = { ratio, lv, front, dir, perp, state, strB, strR };
      },
      render(ctx, w, t) {
        const v = w.view; if (!v) return;
        // düşman bölgesi ve tampon
        ctx.save(); ctx.translate(v.front.x, v.front.y); ctx.rotate(V.angle(v.dir));
        ctx.fillStyle = t.dark ? 'rgba(255,92,122,0.10)' : 'rgba(255,92,122,0.12)'; ctx.fillRect(40, -400, 800, 800);
        ctx.fillStyle = t.dark ? 'rgba(245,165,36,0.10)' : 'rgba(245,165,36,0.14)'; ctx.fillRect(0, -400, 40, 800);
        ctx.strokeStyle = t.blue; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(0, -170); ctx.lineTo(0, 170); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
        SL.drawLabel(ctx, 'cephe hattı', v.front.x, v.front.y - 175, t.blue, { size: 11 });
        blue.forEach(u => { ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(u.p.x, u.p.y, 11, 0, 7); ctx.fill(); ctx.fillStyle = t.rule; ctx.fillRect(u.p.x - 12, u.p.y + 14, 24, 4); ctx.fillStyle = t.green; ctx.fillRect(u.p.x - 12, u.p.y + 14, 24 * u.hp / 100, 4); });
        red.forEach(u => { ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(u.p.x, u.p.y, 11, 0, 7); ctx.fill(); ctx.fillStyle = t.rule; ctx.fillRect(u.p.x - 12, u.p.y + 14, 24, 4); ctx.fillStyle = t.green; ctx.fillRect(u.p.x - 12, u.p.y + 14, 24 * u.hp / 100, 4); });
        const lvName = LEVELS[v.lv][1];
        SL.drawLabel(ctx, `mavi tim güveni: ${lvName} (güç oranı ${v.ratio > 8 ? '∞' : v.ratio.toFixed(2)}) → ${v.state}`, 230, 16, t.ink, { size: 12 });
      }
    });
    w.canvas.addEventListener('contextmenu', e => e.preventDefault());
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      btn('+ düşman', () => red.push(mk(SL.rand(560, 680), SL.rand(60, 320), 'r'))), btn('− düşman', () => red.pop()),
      btn('+ müttefik', () => blue.push(mk(SL.rand(40, 120), SL.rand(60, 320), 'b'))), btn('− müttefik', () => blue.pop()),
      el('span', { class: 'mini' }, 'Güç oranı = mavi toplam can / kırmızı toplam can.')), w.canvas, w.controls());
    w.reset();
    return { start: () => w.start(), stop: () => w.stop() };
  };

  /* ---------- simlab: kama formasyonu ---------- */
  SL.SIMLABS.wedge = function (box, api) {
    const W = 560, H = 300;
    let fn = null, L, units = [];
    const reset = () => { L = { p: V.v(100, 150), h: 0, t: 0 }; units = Array.from({ length: 7 }, () => ({ p: V.v(SL.rand(40, 120), SL.rand(80, 220)) })); };
    const w = new SL.World({
      W, H, reset,
      update(dt, w) {
        if (!fn) return;
        L.t += dt; const tg = w.mouse.inside ? V.v(w.mouse.x, w.mouse.y) : V.v(280 + Math.cos(L.t * 0.5) * 180, 150 + Math.sin(L.t) * 80);
        const o = V.sub(tg, L.p), d = V.len(o); if (d > 3) { L.p = V.add(L.p, V.mul(V.norm(o), Math.min(d, 80 * dt))); L.h = V.angle(o); }
        units.forEach((u, i) => { let off; try { off = fn(i, 30); } catch (e) { w.pause(); api.setMsg('err', '⚠️ wedgeSlot hata verdi: ' + SL.jsErrorText(e)); return; } if (!Array.isArray(off) || off.length !== 2 || !off.every(Number.isFinite)) { w.pause(); api.setMsg('err', '⚠️ wedgeSlot [ileri, sağ] dizisi döndürmeli: ' + JSON.stringify(off)); return; } u.s = toWorld(L.p, L.h, V.v(off[0], off[1])); const q = V.sub(u.s, u.p), k = V.len(q); if (k > 1) u.p = V.add(u.p, V.mul(V.norm(q), Math.min(k, 140 * dt))); });
      },
      render(ctx, w, t) { units.forEach(u => { if (u.s) { ctx.strokeStyle = t.muted; ctx.beginPath(); ctx.arc(u.s.x, u.s.y, 8, 0, 7); ctx.stroke(); } ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(u.p.x, u.p.y, 7, 0, 7); ctx.fill(); }); SL.drawAgent(ctx, L.p, L.h, t.red, 12); }
    });
    box.append(w.canvas, w.controls({ speed: false })); w.reset();
    const ref = (i, s) => { const r = Math.ceil((i + 1) / 2), side = i % 2 ? 1 : -1; return [-r * s, side * r * s]; };
    return {
      world: w,
      setFns(f) { fn = f.wedgeSlot; w.reset(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) { for (const [i, s] of [[0, 30], [1, 30], [2, 30], [3, 30], [4, 10], [5, 10], [6, 25]]) { let r; try { r = mod.wedgeSlot(i, s); } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; } const want = ref(i, s); if (!Array.isArray(r) || Math.abs(r[0] - want[0]) > 1e-9 || Math.abs(r[1] - want[1]) > 1e-9) return { ok: false, msg: `❌ wedgeSlot(${i}, ${s}) → [${want}] olmalı. Seninki: ${JSON.stringify(r)}` }; } return { ok: true, msg: '✅ 7/7: kama doğru. Fareyi gezdirin; lider döndükçe slotlar da onunla dönüyor (yerel çerçeve → dünya).' }; }
    };
  };

  /* ---------- ailab’lar ---------- */
  SL.AILABS.belgian = {
    fn: 'grant', jsFn: 'grant',
    ref: (reqs, cap) => { const out = []; let left = cap; for (const [n, wgt] of reqs) if (wgt <= left) { out.push(n); left -= wgt; } return out; },
    cases: () => { const cs = [[[['asker1', 4], ['trol', 8], ['asker2', 4]], 12], [[['trol', 8], ['asker1', 4], ['asker2', 4]], 12], [[['a', 5], ['b', 5]], 4], [[], 10], [[['a', 3], ['b', 9], ['c', 3]], 7]]; for (let i = 0; i < 10; i++) { const k = 1 + Math.floor(Math.random() * 6); cs.push([Array.from({ length: k }, (_, j) => ['d' + j, [2, 3, 4, 8][Math.floor(Math.random() * 4)]]), [6, 8, 12, 16][i % 4]]); } return cs; },
    show: (r, c) => `istekler ${JSON.stringify(r)}, kapasite ${c}`,
    hint: () => 'İstekleri sırayla işleyin; ağırlık kalan kapasiteye sığıyorsa izin verin ve kapasiteden düşün, sığmıyorsa atlayın (sonraki küçük istekler yine sığabilir!).'
  };
  SL.AILABS.confidence = {
    fn: 'confidence', jsFn: 'confidence',
    ref: (a, e) => { const sa = a.reduce((x, y) => x + y, 0), se = e.reduce((x, y) => x + y, 0); if (se === 0) return 'heroic'; return LEVELS[confLevel(sa / se)][0]; },
    cases: () => { const cs = [[[1, 1], [1, 1]], [[1], [1, 1, 1]], [[1, 1, 1, 1], [1]], [[1, 1], []], [[], [1]], [[0.5, 0.5], [1]], [[1, 1, 1], [1, 1]], [[1, 1, 1, 1], [1, 1]]]; for (let i = 0; i < 10; i++) cs.push([Array.from({ length: 1 + Math.floor(Math.random() * 5) }, () => Math.round(Math.random() * 10) / 10 + 0.1), Array.from({ length: 1 + Math.floor(Math.random() * 5) }, () => Math.round(Math.random() * 10) / 10 + 0.1)]); return cs; },
    show: (a, e) => `müttefik güçleri ${JSON.stringify(a)}, düşman güçleri ${JSON.stringify(e)}`,
    hint: () => 'oran = toplam(müttefik) / toplam(düşman); düşman yoksa "heroic". oran < 0.5 panicked, < 0.8 worried, < 1.25 neutral, < 2 confident, aksi hâlde heroic.'
  };

  /* ---------- başlık ---------- */
  D.titlegroup = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let t = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const shapes = ['wedge', 'line', 'box', 'circle'], sh = shapes[Math.floor(t / 90) % 4], k = (t % 90) / 90;
      const L = V.v(700 + k * 480, 115 + Math.sin(t * 0.04) * 30), h = Math.cos(t * 0.04) * 0.3;
      for (let i = 0; i < 12; i++) { const p = toWorld(L, h, SHAPES[sh](i, 12, 24)); ctx.fillStyle = 'rgba(122,200,255,0.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#ffd27a'; ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(L.x, L.y, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    };
    const tick = () => { if (!running) return; t++; draw(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
