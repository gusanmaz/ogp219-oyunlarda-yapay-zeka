/* "Oyun YZ’si İçin Hazırlık" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const f1 = x => (Math.round(x * 10) / 10).toFixed(1), f2 = x => (Math.round(x * 100) / 100).toFixed(2);
  const pf = x => (x < 0 ? `(${f1(x)})` : f1(x));   // negatifleri parantezle yaz

  /* ---------- Başlık: vektör okları uçuşan alan ---------- */
  D.titlevec = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let P, timer, running = false, t = 0;
    const reset = () => { P = Array.from({ length: 26 }, () => ({ p: V.v(Math.random() * W, Math.random() * H), v: V.fromAngle(Math.random() * 7, 1.5 + Math.random() * 2), hue: 160 + Math.random() * 120 })); };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const m = V.v(W / 2 + Math.cos(t / 60) * 400, H / 2 + Math.sin(t / 45) * 70);
      P.forEach(a => {
        const des = V.setLen(V.sub(m, a.p), 3), steer = V.limit(V.sub(des, a.v), 0.06);
        a.v = V.limit(V.add(a.v, steer), 3); a.p = V.add(a.p, a.v);
        ctx.strokeStyle = `hsla(${a.hue},90%,65%,0.9)`; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2;
        const tip = V.add(a.p, V.mul(a.v, 7)); ctx.beginPath(); ctx.moveTo(a.p.x, a.p.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
        const u = V.norm(a.v); ctx.beginPath(); ctx.moveTo(tip.x + u.x * 6, tip.y + u.y * 6); ctx.lineTo(tip.x - u.y * 4, tip.y + u.x * 4); ctx.lineTo(tip.x + u.y * 4, tip.y - u.x * 4); ctx.fill();
      });
      ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, 7); ctx.fill();
    };
    const tick = () => { if (!running) return; t++; draw(); timer = setTimeout(tick, 33); };
    reset();
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };

  /* ---------- vektör oyun alanı ---------- */
  D.vecplay = function (root) {
    const W = 620, H = 360, O = V.v(W / 2 - 60, H / 2 + 40), S = 30;   // 1 birim = 30 piksel
    const c = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(c, W, H);
    let A = V.v(4, -2), B = V.v(1, -4), mode = root.dataset.mode || 'add', drag = null;
    const info = el('div', { class: 'gv-side vec-info' });
    const toPx = v => V.v(O.x + v.x * S, O.y + v.y * S), toU = p => V.v(Math.round(((p.x - O.x) / S) * 2) / 2, Math.round(((p.y - O.y) / S) * 2) / 2);
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.strokeStyle = t.rule; ctx.lineWidth = 1;
      for (let x = O.x % S; x < W; x += S) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = O.y % S; y < H; y += S) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = t.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, O.y); ctx.lineTo(W, O.y); ctx.moveTo(O.x, 0); ctx.lineTo(O.x, H); ctx.stroke(); ctx.restore();
      SL.drawLabel(ctx, '+x →', W - 30, O.y + 14, t.muted, { bg: false, size: 11 }); SL.drawLabel(ctx, '+y ↓ (ekran)', O.x + 50, H - 10, t.muted, { bg: false, size: 11 });
      const pa = toPx(A), pb = toPx(B), arr = (from, to, col, lab, o = {}) => SL.drawArrow(ctx, from, V.sub(to, from), col, Object.assign({ label: lab, w: 3 }, o));
      let html = '';
      const vs = v => `(${f1(v.x)}, ${f1(v.y)})`;
      if (mode === 'add') {
        const s = V.add(A, B); arr(O, pa, t.blue, 'a'); arr(pa, toPx(s), t.green, 'b', { dash: [6, 4] }); arr(O, pb, t.green, 'b'); arr(O, toPx(s), t.purple, 'a + b');
        html = `<p><b class="c-blue">a</b> = ${vs(A)}<br><b class="c-green">b</b> = ${vs(B)}<br><b style="color:var(--purple)">a + b</b> = ${vs(s)}</p><p class="mini">Uç uca ekle: önce a kadar git, sonra b kadar. 🎮 konum = konum + hız</p>`;
      } else if (mode === 'sub') {
        const d = V.sub(B, A); arr(O, pa, t.blue, 'a (ben)'); arr(O, pb, t.green, 'b (hedef)'); arr(pa, pb, t.red, 'b − a');
        html = `<p><b class="c-red">b − a</b> = ${vs(d)}</p><p>Uzunluk |b − a| = √(${pf(d.x)}² + ${pf(d.y)}²) = <b>${f2(V.len(d))}</b></p><p class="mini">“Benden hedefe giden ok”. Uzunluğu = aradaki mesafe. 🎮 Her NPC’nin ilk sorusu!</p>`;
      } else if (mode === 'norm') {
        const n = V.norm(A); ctx.save(); ctx.strokeStyle = t.muted; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(O.x, O.y, S, 0, 7); ctx.stroke(); ctx.restore();
        arr(O, pa, t.blue, 'a'); arr(O, toPx(n), t.amber, 'â', { w: 5 });
        html = `<p>|a| = <b>${f2(V.len(A))}</b></p><p>â = a / |a| = <b>${vs(n)}</b> (uzunluğu 1)</p><p class="mini">Birim vektör <span class="en">normalized</span>: sadece YÖN, büyüklük yok. 🎮 yön × hız = hareket</p>`;
      } else if (mode === 'dot') {
        const d = V.dot(A, B), cos = d / (V.len(A) * V.len(B) || 1), ang = (Math.acos(SL.clamp(cos, -1, 1)) * 180) / Math.PI;
        const proj = V.mul(V.norm(A), d / (V.len(A) || 1));
        arr(O, pa, t.blue, 'a'); arr(O, pb, t.green, 'b');
        ctx.save(); ctx.strokeStyle = t.amber; ctx.lineWidth = 6; ctx.globalAlpha = 0.7; const pp = toPx(proj); ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(pp.x, pp.y); ctx.stroke(); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(pp.x, pp.y); ctx.stroke(); ctx.restore();
        html = `<p>a · b = ${pf(A.x)}·${pf(B.x)} + ${pf(A.y)}·${pf(B.y)} = <b>${f2(d)}</b></p><p>Aradaki açı: <b>${f1(ang)}°</b> (cos = ${f2(cos)})</p><p><b class="${d > 0 ? 'c-green' : d < 0 ? 'c-red' : ''}">${d > 0 ? 'Pozitif: aynı yöne bakıyorlar (önümde)' : d < 0 ? 'Negatif: zıt yönlerde (arkamda)' : 'Sıfır: dik (tam yanımda)'}</b></p><p class="mini">Sarı = b’nin a üzerindeki gölgesi (izdüşüm).</p>`;
      } else {
        const cr = V.cross(A, B); arr(O, pa, t.blue, 'a (bakış)'); arr(O, pb, t.green, 'b (hedef)');
        html = `<p>a × b = ${pf(A.x)}·${pf(B.y)} − ${pf(A.y)}·${pf(B.x)} = <b>${f2(cr)}</b></p><p><b>${cr > 0 ? 'Pozitif → b, a’nın SAĞINDA (ekran koordinatında y aşağı)' : cr < 0 ? 'Negatif → b, a’nın SOLUNDA' : 'Sıfır → aynı doğru üzerinde'}</b></p><p class="mini">2B çapraz çarpım tek bir sayı verir: işareti “sola mı sağa mı dönmeliyim?” sorusunun cevabı. (Unity’de y yukarı olduğu için işaretler ters!)</p>`;
      }
      [[pa, t.blue], [pb, t.green]].forEach(([p, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, 7); ctx.stroke(); ctx.setLineDash([]); });
      info.innerHTML = html + '<p class="mini">Ok uçlarını (noktaları) fareyle sürükleyin.</p>';
    };
    const pick = e => { const r = c.getBoundingClientRect(), p = V.v(((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height); return p; };
    c.addEventListener('mousedown', e => { const p = pick(e); drag = V.dist(p, toPx(A)) < 20 ? 'A' : V.dist(p, toPx(B)) < 20 ? 'B' : null; });
    c.addEventListener('mousemove', e => { if (!drag) return; const u = toU(pick(e)); if (drag === 'A') A = u; else B = u; draw(); });
    window.addEventListener('mouseup', () => (drag = null));
    root.setAttribute('data-prevent-swipe', '');
    const narrow = !!root.closest('.cols');   // iki sütunlu slaytta açıklamayı tuvalin altına koy
    if (narrow) info.classList.add('below');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'İşlem ', select({ add: 'toplama a + b', sub: 'çıkarma b − a (mesafe)', norm: 'normalize (yön)', dot: 'nokta çarpım a · b', cross: 'çapraz çarpım a × b' }, mode, v => { mode = v; draw(); }))), narrow ? el('div', null, c, info) : el('div', { class: 'gv-row' }, el('div', { style: 'flex:none' }, c), info));
    draw(); SL.onTheme(draw);
  };

  /* ---------- görüş konisi: nokta çarpım ---------- */
  D.fovdot = function (root) {
    let fov = 90, range = 220, heading = 0, auto = true, seenTime = 0;
    const guard = V.v(420, 180);
    const info = el('div', { class: 'sv-counters' });
    const w = new SL.World({
      W: 1180, H: 360,
      update(dt) { if (auto) heading += dt * 0.6; },
      render(ctx, w, t) {
        const fwd = V.fromAngle(heading), p = w.mouse.inside ? w.mouse : V.v(700, 120), to = V.sub(p, guard), d = V.len(to), dir = V.norm(to);
        const dot = V.dot(fwd, dir), cosHalf = Math.cos((fov / 2) * Math.PI / 180), inAng = dot >= cosHalf, inRange = d <= range, seen = inAng && inRange;
        const cr = V.cross(fwd, dir);
        SL.drawCone(ctx, guard, heading, (fov * Math.PI) / 180, range, seen ? t.red : t.amber, seen ? 0.25 : 0.14);
        SL.drawArrow(ctx, guard, V.mul(fwd, 80), t.blue, { label: 'ileri (forward)', w: 3 });
        SL.drawArrow(ctx, guard, V.mul(dir, Math.min(d, 260)), seen ? t.red : t.muted, { label: 'hedefe yön', w: 2, dash: [6, 4] });
        SL.drawAgent(ctx, guard, heading, t.purple, 15, { label: 'NÖBETÇİ' });
        ctx.fillStyle = seen ? t.red : t.green; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 7); ctx.fill(); SL.drawLabel(ctx, seen ? '!! GÖRÜLDÜ' : 'oyuncu', p.x, p.y - 20, seen ? t.red : t.green);
        info.innerHTML = `<span class="cnt">forward · yön = <b>${f2(dot)}</b></span><span class="cnt">cos(FOV/2) = <b>${f2(cosHalf)}</b></span><span class="cnt">açı içinde mi? <b class="${inAng ? 'c-green' : 'c-red'}">${inAng ? 'evet' : 'hayır'}</b></span><span class="cnt">mesafe <b>${Math.round(d)}</b> ≤ ${range}? <b class="${inRange ? 'c-green' : 'c-red'}">${inRange ? 'evet' : 'hayır'}</b></span><span class="cnt">çapraz çarpım: hedef <b>${cr > 0 ? 'sağda' : 'solda'}</b></span>`;
      }
    });
    return SL.worldDemo(root, w, el('div', { class: 'sv-controls' }, slider('Görüş açısı (FOV°)', 10, 360, fov, 5, v => { fov = v; }), slider('Menzil', 50, 500, range, 10, v => { range = v; }),
      el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { auto = e.target.checked; } }); cb.checked = true; return cb; })(), ' nöbetçi dönsün'), el('span', { class: 'mini' }, 'Fareyi “oyuncu” olarak gezdirin.')), info);
  };

  /* ---------- delta time: kare hızından bağımsız hareket ---------- */
  D.dtdemo = function (root) {
    let fpsA = 30, fpsB = 144, useDt = false;
    const speed = 150; // piksel / saniye
    const run = [{ x: 30, acc: 0, fps: () => fpsA, frames: 0 }, { x: 30, acc: 0, fps: () => fpsB, frames: 0 }];
    const code = el('pre', { class: 'mini-code' });
    const w = new SL.World({
      W: 1180, H: 230,
      reset() { run.forEach(r => { r.x = 30; r.acc = 0; r.frames = 0; }); },
      update(dt) {
        run.forEach(r => {
          r.acc += dt; const step = 1 / r.fps();
          while (r.acc >= step) { r.acc -= step; r.frames++; r.x += useDt ? speed * step : speed / 60; if (r.x > 1150) r.x = 30; }
        });
      },
      render(ctx, w, t) {
        run.forEach((r, i) => {
          const y = 70 + i * 95;
          ctx.strokeStyle = t.rule; ctx.beginPath(); ctx.moveTo(20, y + 22); ctx.lineTo(1160, y + 22); ctx.stroke();
          ctx.fillStyle = i ? t.green : t.blue; ctx.beginPath(); ctx.arc(r.x, y, 15, 0, 7); ctx.fill();
          SL.drawLabel(ctx, `${r.fps()} FPS bilgisayar`, 90, y - 30, i ? t.green : t.blue, { align: 'left' });
        });
        SL.drawLabel(ctx, `geçen süre: ${w.time.toFixed(1)} sn`, 1080, 20, t.ink);
      }
    });
    const upd = () => { code.textContent = useDt ? 'x += hız * deltaTime;   // piksel/SANİYE × saniye = piksel  ✔' : 'x += 2.5;   // her KAREDE 2.5 piksel → hızlı bilgisayar daha hızlı koşar ✘'; };
    upd();
    return SL.worldDemo(root, w, el('div', { class: 'sv-controls' }, slider('Bilgisayar A FPS', 10, 60, fpsA, 5, v => { fpsA = v; w.reset(); }), slider('Bilgisayar B FPS', 60, 240, fpsB, 10, v => { fpsB = v; w.reset(); }),
      el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { useDt = e.target.checked; upd(); w.reset(); } }); return cb; })(), ' deltaTime kullan')), code);
  };

  /* ---------- lerp ile yumuşatma: kare hızına bağlı mı? ---------- */
  D.lerpdemo = function (root) {
    let k = 0.1, fps = [20, 60, 144], useExp = false;
    const F = fps.map(f => ({ fps: f, x: 40, acc: 0 }));
    let target = 1100;
    const code = el('pre', { class: 'mini-code' });
    const w = new SL.World({
      W: 1180, H: 260,
      reset() { F.forEach(o => { o.x = 40; o.acc = 0; }); target = 1100; },
      update(dt, w) {
        if (w.frame % 180 === 0 && w.frame) target = target > 600 ? 80 : 1100;
        F.forEach(o => { o.acc += dt; const step = 1 / o.fps; while (o.acc >= step) { o.acc -= step; const a = useExp ? 1 - Math.exp(-k * 60 * step) : k; o.x += (target - o.x) * a; } });
      },
      render(ctx, w, t) {
        ctx.strokeStyle = t.red; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(target, 10); ctx.lineTo(target, 250); ctx.stroke(); ctx.setLineDash([]);
        SL.drawLabel(ctx, 'hedef', target, 18, t.red);
        F.forEach((o, i) => { const y = 70 + i * 70; ctx.fillStyle = [t.blue, t.green, t.purple][i]; ctx.beginPath(); ctx.arc(o.x, y, 14, 0, 7); ctx.fill(); SL.drawLabel(ctx, `${o.fps} FPS`, o.x, y - 24, [t.blue, t.green, t.purple][i]); });
      }
    });
    const upd = () => { code.textContent = useExp ? `x = lerp(x, hedef, 1 - exp(-${(k * 60).toFixed(1)} * dt));  // hepsi aynı hızda ✔` : `x = lerp(x, hedef, ${k});  // HER KAREDE %${Math.round(k * 100)} yaklaş → yüksek FPS daha hızlı ✘`; };
    upd();
    return SL.worldDemo(root, w, el('div', { class: 'sv-controls' }, slider('k', 0.02, 0.3, k, 0.01, v => { k = v; upd(); }), el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { useExp = e.target.checked; upd(); w.reset(); } }); return cb; })(), ' kare hızından bağımsız formül')), code);
  };

  /* ---------- simlab: hedefe doğru hareket ---------- */
  SL.SIMLABS.follow = function (box, api) {
    let fns = null, agent = { p: V.v(100, 160), heading: 0 }, trail = [];
    const w = new SL.World({
      W: 560, H: 320,
      reset() { agent = { p: V.v(100, 160), heading: 0 }; trail = []; },
      update(dt, w) {
        if (!fns) return;
        const tgt = w.mouse.inside ? V.v(w.mouse.x, w.mouse.y) : V.v(460, 120);
        const r = fns.moveToward([agent.p.x, agent.p.y], [tgt.x, tgt.y], 120, dt);
        if (!Array.isArray(r) || r.length !== 2 || !r.every(Number.isFinite)) { w.pause(); api.setMsg('err', '⚠️ moveToward bir [x, y] dizisi döndürmeli. Döndürülen: ' + JSON.stringify(r)); return; }
        const np = V.v(r[0], r[1]), mv = V.sub(np, agent.p);
        if (V.len(mv) > 1e-6) agent.heading = V.angle(mv);
        agent.p = np; if (w.frame % 3 === 0) { trail.push(V.copy(np)); if (trail.length > 120) trail.shift(); }
      },
      render(ctx, w, t) {
        const tgt = w.mouse.inside ? w.mouse : V.v(460, 120);
        ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 7, 0, 7); ctx.fill();
        ctx.fillStyle = t.muted; trail.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, 7); ctx.fill(); });
        SL.drawAgent(ctx, agent.p, agent.heading, t.blue, 13);
        SL.drawLabel(ctx, 'Fareyi kutunun içinde gezdirin', 280, 14, t.muted, { size: 11 });
      }
    });
    box.append(w.canvas, w.controls({ speed: false }));
    w.reset();
    return {
      world: w,
      setFns(f) { fns = f; w.reset(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        const f = mod.moveToward; let p;
        try {
          p = f([0, 0], [100, 0], 50, 0.5); if (!Array.isArray(p) || Math.abs(p[0] - 25) > 0.01 || Math.abs(p[1]) > 0.01) return { ok: false, msg: `❌ moveToward([0,0], [100,0], hız 50, dt 0.5) → [25, 0] olmalı. Seninki: ${JSON.stringify(p)}` };
          p = f([0, 0], [0, 300], 100, 0.1); if (Math.abs(p[1] - 10) > 0.01 || Math.abs(p[0]) > 0.01) return { ok: false, msg: `❌ Yön normalize edilmemiş olabilir: [0,0]→[0,300], hız 100, dt 0.1 → [0, 10] olmalı. Seninki: ${JSON.stringify(p)}` };
          p = f([0, 0], [3, 4], 100, 1); if (Math.abs(p[0] - 3) > 0.01 || Math.abs(p[1] - 4) > 0.01) return { ok: false, msg: `❌ Hedefi geçiyor (overshoot): [0,0]→[3,4] (mesafe 5), adım 100 → hedefte durmalı [3, 4]. Seninki: ${JSON.stringify(p)}` };
          p = f([5, 5], [5, 5], 100, 1); if (!p.every(Number.isFinite)) return { ok: false, msg: '❌ Hedefin tam üstündeyken NaN çıktı (0’a bölme!). Mesafe 0 ise olduğun yerde kal.' };
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ 4/4 test geçti: doğru yön, doğru hız, hedefi geçmiyor, NaN yok!' };
      }
    };
  };

  /* ---------- ailab: görüş konisinde mi? ---------- */
  const inFovRef = (g, fwd, tgt, fovDeg, range) => {
    const dx = tgt[0] - g[0], dy = tgt[1] - g[1], d = Math.hypot(dx, dy);
    if (d > range) return false; if (d === 0) return true;
    const fl = Math.hypot(fwd[0], fwd[1]);
    return (fwd[0] * dx + fwd[1] * dy) / (fl * d) >= Math.cos((fovDeg / 2) * Math.PI / 180) - 1e-12;
  };
  SL.AILABS.infov = {
    fn: 'in_fov', jsFn: 'inFov', ref: inFovRef,
    cases: () => {
      const cs = [[[0, 0], [1, 0], [5, 0], 90, 10], [[0, 0], [1, 0], [-5, 0], 90, 10], [[0, 0], [1, 0], [20, 0], 90, 10], [[0, 0], [2, 0], [3, 2.9], 90, 10], [[0, 0], [0, 1], [0, 3], 60, 10], [[0, 0], [1, 0], [1, 1.01], 90, 10]];
      while (cs.length < 46) {
        const c = [[Math.round(SL.rand(-5, 5)), Math.round(SL.rand(-5, 5))], [Math.round(SL.rand(-3, 3)) || 1, Math.round(SL.rand(-3, 3))], [Math.round(SL.rand(-10, 10)), Math.round(SL.rand(-10, 10))], [30, 60, 90, 120, 180, 270][Math.floor(Math.random() * 6)], Math.round(SL.rand(3, 15)) + 0.5];
        const dx = c[2][0] - c[0][0], dy = c[2][1] - c[0][1], d = Math.hypot(dx, dy), fl = Math.hypot(c[1][0], c[1][1]);
        if (d > 0 && Math.abs((c[1][0] * dx + c[1][1] * dy) / (fl * d) - Math.cos((c[3] / 2) * Math.PI / 180)) < 1e-6) continue;   // tam sınırdaki belirsiz durumları atla
        cs.push(c);
      }
      return cs;
    },
    show: (g, f, t, fov, r) => `nöbetçi ${JSON.stringify(g)}, ileri ${JSON.stringify(f)}, hedef ${JSON.stringify(t)}, FOV ${fov}°, menzil ${r}`,
    hint: (g, f) => (Math.hypot(f[0], f[1]) !== 1 ? 'İleri vektörü birim değil — onu da normalize ettin mi?' : 'Hem mesafeyi hem açıyı kontrol et; açıyı nokta çarpım ve cos(FOV/2) ile karşılaştır.')
  };
})();
