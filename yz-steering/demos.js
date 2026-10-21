/* "Steering Davranışları" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();

  /* ================= çekirdek davranışlar (Reynolds 1999) =================
     ajan: { p (konum), v (hız), maxSpeed, maxForce }
     her davranış bir "istenen hız" üretir; direksiyon = istenen − mevcut hız (maxForce ile sınırlı) */
  const B = {
    seek: (a, t) => V.setLen(V.sub(t, a.p), a.maxSpeed),
    flee: (a, t) => V.setLen(V.sub(a.p, t), a.maxSpeed),
    arrive: (a, t, slow = 120) => { const off = V.sub(t, a.p), d = V.len(off); if (d < 1e-6) return V.v(); const sp = d < slow ? (a.maxSpeed * d) / slow : a.maxSpeed; return V.setLen(off, sp); },
    pursue: (a, q) => { const T0 = V.dist(a.p, q.p) / (a.maxSpeed + 1e-6); const fut = V.add(q.p, V.mul(q.v, Math.min(T0, 1.5))); return { des: B.seek(a, fut), fut }; },
    evade: (a, q) => { const T0 = V.dist(a.p, q.p) / (a.maxSpeed + 1e-6); const fut = V.add(q.p, V.mul(q.v, Math.min(T0, 1.5))); return { des: B.flee(a, fut), fut }; }
  };
  const steerTo = (a, desired) => V.limit(V.sub(desired, a.v), a.maxForce);
  // Tek ajanlı demolar için: (istenen − hız) bir HIZ farkıdır; onu ivmeye çevirmek için bir kazançla çarpıyoruz
  // (≈ "istenen hıza 0,2 sn'de ulaşmaya çalış"). Kazanç olmazsa düzeltme çok yavaş kalır ve azami kuvvet kaydırıcısı
  // 2 × azami hızın üstünde hiçbir şeyi değiştirmez.
  const STEER_GAIN = 5;
  const steerSharp = (a, desired) => V.limit(V.mul(V.sub(desired, a.v), STEER_GAIN), a.maxForce);
  const integrate = (a, force, dt, W, H, wrap) => {
    a.v = V.limit(V.add(a.v, V.mul(force, dt)), a.maxSpeed);
    a.p = V.add(a.p, V.mul(a.v, dt));
    if (wrap) { if (a.p.x < 0) a.p.x += W; if (a.p.x > W) a.p.x -= W; if (a.p.y < 0) a.p.y += H; if (a.p.y > H) a.p.y -= H; }
    else { const cx = SL.clamp(a.p.x, 8, W - 8), cy = SL.clamp(a.p.y, 8, H - 8); if (cx !== a.p.x) a.v.x = 0; if (cy !== a.p.y) a.v.y = 0; a.p.x = cx; a.p.y = cy; }   // duvar: o yöndeki hız sıfırlanır (hız etiketi gerçeği göstersin)
    if (V.len(a.v) > 2) a.h = V.angle(a.v);
  };
  SL.STEER = { B, steerTo, integrate };

  /* ---------- tek ajan: davranış seçici, vektörler görünür ---------- */
  const OBST = [{ x: 330, y: 150, r: 42 }, { x: 470, y: 260, r: 34 }, { x: 230, y: 290, r: 30 }];
  const PATH = [V.v(70, 300), V.v(220, 90), V.v(420, 120), V.v(560, 300), V.v(680, 110)];
  /* ================= elle seek: kare kare, sayılarla =================
     Her karede: istenen = hedef yönü × azami hız · direksiyon = istenen − hız (azami kuvvetle kırpılır) · hız += direksiyon · konum += hız */
  D.seekhand = function (root) {
    const MS = 1.5, N = 24, f1 = x => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',').replace('-0,0', '0,0').replace('-', '−');
    const SC = [
      ['🎯 Hedef tam önde', [3, 6], [1.5, 0], [21, 6], 0.25, 'Karakter zaten hedefe doğru tam hızla gidiyor.', 'İstenen hız ile şimdiki hız aynı: fark (direksiyon) sıfır. Düzeltilecek bir şey yoksa kuvvet de yok.'],
      ['↗️ Hedef yanda', [3, 9], [1.5, 0], [17, 2], 0.25, 'Karakter sağa gidiyor; hedef sağ üstte.', 'Her karede küçük bir düzeltme: hız oku yavaş yavaş hedefe döndü ve iz <b>kavisli</b> çıktı. Kavisi biz çizmedik; kırpılmış kuvvetten kendiliğinden doğdu.'],
      ['↩️ Hedef arkada', [9, 7], [1.5, 0], [2, 4], 0.25, 'Karakter sağa gidiyor; hedef arkasında, sol üstte.', 'Önce yavaşladı, sonra geri döndü: bir araba gibi, olduğu yerde dönemedi. Dönüş birkaç kare sürdü.'],
      ['👻 Sınırsız kuvvet', [3, 9], [1.5, 0], [17, 2], 99, 'Aynı “hedef yanda” durumu, ama azami kuvvet sınırsız (Pac-Man hayaleti).', 'İlk karede hız doğrudan istenen hıza eşitlendi: köşeli, anında dönüş. Kuvveti kırpmazsak steering, Y0’daki “hedefe düz git”e döner.'],
      ['🚛 Ağır kamyon', [3, 9], [1.5, 0], [17, 2], 0.07, 'Aynı durum, azami kuvvet çok küçük.', 'Dönüş çok geniş; hedefin yanından geçip geri dönmesi gerekebilir. Azami kuvvet karakterin “ağırlığını” belirleyen tek sayıdır.']];
    let F = [], tgt = [0, 0], moralTxt = '';
    const build = i => {
      const [, p0, v0, t0, mf] = SC[i]; let p = p0.slice(), v = v0.slice(); tgt = t0; F = [];
      const trail = [p.slice()];
      for (let k = 0; k <= N; k++) {
        const dx = tgt[0] - p[0], dy = tgt[1] - p[1], d = Math.hypot(dx, dy) || 1e-9;
        const des = [dx / d * MS, dy / d * MS]; let st = [des[0] - v[0], des[1] - v[1]]; const raw = Math.hypot(st[0], st[1]);
        const clipped = raw > mf; if (clipped) st = [st[0] / raw * mf, st[1] / raw * mf];
        F.push({ k, p: p.slice(), v: v.slice(), des, st, raw, clipped, mf, d, trail: trail.map(x => x.slice()), arrived: d < MS });
        if (d < MS) break;
        v = [v[0] + st[0], v[1] + st[1]]; const sp = Math.hypot(v[0], v[1]); if (sp > MS) v = [v[0] / sp * MS, v[1] / sp * MS];
        p = [p[0] + v[0], p[1] + v[1]]; trail.push(p.slice());
      }
    };
    const diag = el('div'), tbl = el('div', { class: 'sh-tbl' }), story = el('div', { class: 'btd-story' }), moral = el('div', { class: 'btd-moral' });
    const draw = (f, pl) => {
      const t = T(), S = 34, X = x => x * S, Y = y => y * S, A = 5.5;
      let g = `<defs>${[['v', t.blue], ['d', t.green], ['s', t.red]].map(([n, c]) => `<marker id="sh-${n}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`).join('')}</defs>`;
      for (let x = 0; x <= 24; x += 2) g += `<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${Y(11)}" stroke="${t.rule}" stroke-width="1"/>`;
      for (let y = 0; y <= 11; y += 2) g += `<line x1="0" y1="${Y(y)}" x2="${X(24)}" y2="${Y(y)}" stroke="${t.rule}" stroke-width="1"/>`;
      g += `<polyline points="${f.trail.map(p => X(p[0]) + ',' + Y(p[1])).join(' ')}" fill="none" stroke="${t.muted}" stroke-width="2.5" stroke-dasharray="3 6" stroke-linecap="round"/>`;
      f.trail.forEach(p => (g += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.5" fill="${t.muted}"/>`));
      g += `<text x="${X(tgt[0])}" y="${Y(tgt[1]) + 10}" text-anchor="middle" font-size="30">🎯</text>`;
      const arrow = (v, c, id, w) => { const L = Math.hypot(v[0], v[1]); if (L < 0.02) return ''; return `<line x1="${X(f.p[0])}" y1="${Y(f.p[1])}" x2="${X(f.p[0] + v[0] * A / MS)}" y2="${Y(f.p[1] + v[1] * A / MS)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" marker-end="url(#sh-${id})"/>`; };
      g += arrow(f.des, t.green, 'd', 4) + arrow(f.v, t.blue, 'v', 5);
      // direksiyon: hız okunun ucundan istenen okun ucuna doğru (kırpılmış)
      const hx = f.p[0] + f.v[0] * A / MS, hy = f.p[1] + f.v[1] * A / MS;
      if (Math.hypot(f.st[0], f.st[1]) > 0.02) g += `<line x1="${X(hx)}" y1="${Y(hy)}" x2="${X(hx + f.st[0] * A / MS)}" y2="${Y(hy + f.st[1] * A / MS)}" stroke="${t.red}" stroke-width="5" stroke-linecap="round" marker-end="url(#sh-s)"/>`;
      g += `<circle cx="${X(f.p[0])}" cy="${Y(f.p[1])}" r="11" fill="${t.amber}" stroke="${t.ink}" stroke-width="2.5"/>`;
      diag.innerHTML = `<svg viewBox="0 0 ${X(24)} ${Y(11)}" style="width:100%;border:1px solid ${t.rule};border-radius:10px;background:${t.card}" font-family="Source Sans 3">${g}</svg>`;
      const vec = v => `(${f1(v[0])}, ${f1(v[1])})`;
      tbl.innerHTML = `<div class="sh-k">kare ${f.k}</div>` +
        `<div><i style="background:${t.amber}"></i><b>konum</b> ${vec(f.p)} · hedefe uzaklık ${f1(f.d)}</div>` +
        `<div><i style="background:${t.blue}"></i><b>şimdiki hız</b> ${vec(f.v)}</div>` +
        `<div><i style="background:${t.green}"></i><b>istenen hız</b> ${vec(f.des)} <span>= hedef yönü × azami hız (${f1(MS)})</span></div>` +
        `<div><i style="background:${t.red}"></i><b>direksiyon</b> ${vec(f.st)} <span>= istenen − şimdiki${f.clipped ? `; boyu ${f1(f.raw)} idi, azami kuvvete (${f.mf < 1 ? String(f.mf).replace('.', ',') : '∞'}) kırpıldı` : f.raw < 0.02 ? '; fark yok' : ''}</span></div>` +
        `<div class="sh-next">${f.arrived ? '🎯 Hedefe vardı.' : 'Sonraki kare: hız += direksiyon, konum += hız.'}</div>`;
      moral.innerHTML = pl.done && moralTxt ? '💡 ' + moralTxt : '';
    };
    const fp = new SL.FramePlayer(draw, { speed: 2 });
    const load = (i, play) => { build(i); story.innerHTML = '📖 ' + SC[i][5]; moralTxt = SC[i][6]; fp.load(F); if (play) fp.play(); };
    const bs = SC.map((sc, i) => { const b = btn(sc[0], () => { bs.forEach(x => x.classList.remove('primary')); b.classList.add('primary'); load(i, true); }); return b; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls btd-sc' }, ...bs), story, el('div', { class: 'btd-wrap sh' }, diag, el('div', {}, tbl, moral)), SL.transport(fp, { min: 0.5, max: 8 }));
    bs[1].classList.add('primary'); load(1, false);
    SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  D.steer = function (root) {
    const W = 720, H = 380;
    const pathMode = root.dataset.mode === 'path';   // yol izleme slaytı: keskin köşeleri dönebilsin diye daha yavaş ve daha çevik başlar
    const cfg = { mode: root.dataset.mode || 'seek', maxSpeed: pathMode ? 130 : 180, maxForce: pathMode ? 420 : 260, vecs: true, obst: false, slow: 120 };
    let a, bot, wanderTh = 0, trail = [], info = {};
    const reset = () => { a = cfg.mode === 'path' ? { p: V.copy(PATH[0]), v: V.setLen(V.sub(PATH[1], PATH[0]), 60), maxSpeed: cfg.maxSpeed, maxForce: cfg.maxForce, h: 0 } : { p: V.v(120, 190), v: V.v(0, -150), maxSpeed: cfg.maxSpeed, maxForce: cfg.maxForce, h: 0 }; bot = { p: V.v(560, 120), v: V.v(-90, 40), t: 0 }; trail = []; wanderTh = 0; };
    reset();
    const avoid = () => {   // ileri bakan “anten”: en yakın engele çarpacaksa yana it
      const ahead = V.add(a.p, V.mul(V.norm(a.v), 90 * (V.len(a.v) / a.maxSpeed) + 20));
      let hit = null, best = Infinity;
      for (const o of OBST) { const d = V.dist(ahead, o), d2 = V.dist(V.lerp(a.p, ahead, 0.5), o); const m = Math.min(d, d2); if (m < o.r + 14 && V.dist(a.p, o) < best) { best = V.dist(a.p, o); hit = o; } }
      info.ahead = ahead; info.hit = hit;
      return hit ? V.setLen(V.sub(ahead, hit), a.maxSpeed) : null;
    };
    const w = new SL.World({
      W, H, reset,
      update(dt, w) {
        a.maxSpeed = cfg.maxSpeed; a.maxForce = cfg.maxForce;
        const m = w.mouse.inside ? V.v(w.mouse.x, w.mouse.y) : V.v(560, 190);
        // hedef bot: sekerek dolaşır
        bot.t += dt; bot.v = V.rot(bot.v, Math.sin(bot.t * 0.9) * 0.02); bot.p = V.add(bot.p, V.mul(bot.v, dt));
        if (bot.p.x < 30 || bot.p.x > W - 30) bot.v.x *= -1; if (bot.p.y < 30 || bot.p.y > H - 30) bot.v.y *= -1;
        let des; info = { target: m };
        switch (cfg.mode) {
          case 'seek': des = B.seek(a, m); break;
          case 'flee': des = V.dist(a.p, m) < 220 ? B.flee(a, m) : V.mul(a.v, 0.98); info.panic = 220; break;
          case 'arrive': des = B.arrive(a, m, cfg.slow); info.slow = cfg.slow; break;
          case 'pursue': { const r = B.pursue(a, bot); des = r.des; info.fut = r.fut; info.target = bot.p; break; }
          case 'evade': { const r = B.evade(a, bot); des = V.dist(a.p, bot.p) < 260 ? r.des : V.mul(a.v, 0.98); info.fut = r.fut; info.target = bot.p; break; }
          case 'wander': {
            wanderTh += SL.rand(-0.35, 0.35);
            const c = V.add(a.p, V.mul(V.norm(V.len(a.v) > 1 ? a.v : V.v(1, 0)), 70));
            const tgt = V.add(c, V.fromAngle(wanderTh + V.angle(a.v), 35));
            info.wc = c; info.wt = tgt; info.target = null; des = B.seek(a, tgt);
            // duvarlardan uzak dur
            if (a.p.x < 60 || a.p.x > W - 60 || a.p.y < 60 || a.p.y > H - 60) des = B.seek(a, V.v(W / 2, H / 2));
            break;
          }
          case 'path': {
            // Reynolds: biraz ilerideki konumu tahmin et, yola izdüşür, yoldan uzaksa yolda biraz ilerideki noktayı ara
            const sp = V.len(a.v), fut = V.add(a.p, V.mul(V.norm(a.v), Math.max(15, sp * 0.25)));   // ~0,25 sn sonraki konum
            let best = null, bd = Infinity, seg = 0;
            for (let i = 0; i < PATH.length - 1; i++) { const A2 = PATH[i], B2 = PATH[i + 1], ab = V.sub(B2, A2); let t = V.dot(V.sub(fut, A2), ab) / V.len2(ab); t = SL.clamp(t, 0, 1); const q = V.add(A2, V.mul(ab, t)); const d = V.dist(fut, q); if (d < bd) { bd = d; best = q; seg = i; } }
            // hedef: izdüşümden itibaren YOL BOYUNCA biraz ileri (köşeyi dönerek; düz uzatırsak köşede yolun dışına çıkar)
            let tgt = best, left = Math.max(30, sp * 0.3), k = seg;
            while (left > 0 && k < PATH.length - 1) { const toEnd = V.dist(tgt, PATH[k + 1]); if (toEnd >= left) { tgt = V.add(tgt, V.setLen(V.sub(PATH[k + 1], tgt), left)); left = 0; } else { tgt = V.copy(PATH[k + 1]); left -= toEnd; k++; } }
            if (V.dist(a.p, PATH[PATH.length - 1]) < 24) { a.p = V.copy(PATH[0]); a.v = V.setLen(V.sub(PATH[1], PATH[0]), 60); trail = []; }   // sona vardı: baştan
            info.fut = fut; info.proj = best; info.target = tgt; info.off = bd;
            des = bd > 14 ? B.seek(a, tgt) : V.setLen(a.v, a.maxSpeed);   // yolun içindeyse düzeltme yok: düz devam
            break;
          }
        }
        if (cfg.obst) { const av = avoid(); if (av) { des = V.add(V.mul(des, 0.3), V.mul(av, 1.2)); info.av = true; } }
        info.des = des;
        const f = steerSharp(a, des); info.force = f;
        integrate(a, f, dt, W, H, false);
        if (w.frame % 3 === 0) { trail.push(V.copy(a.p)); if (trail.length > 140) trail.shift(); }
      },
      render(ctx, w, t) {
        if (cfg.mode === 'path') { ctx.strokeStyle = t.rule; ctx.lineWidth = 36; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); PATH.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.strokeStyle = t.muted; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]); }
        if (cfg.obst) OBST.forEach(o => { ctx.fillStyle = info.hit === o ? t.red : t.dark ? '#3a3f55' : '#9aa0b4'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.fill(); });
        ctx.fillStyle = t.muted; trail.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 7); ctx.fill(); });
        if (info.slow && info.target) { ctx.strokeStyle = t.amber; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(info.target.x, info.target.y, info.slow, 0, 7); ctx.stroke(); ctx.setLineDash([]); SL.drawLabel(ctx, 'yavaşlama yarıçapı', info.target.x, info.target.y - info.slow - 10, t.amber, { size: 11 }); }
        if (info.panic && info.target) { ctx.strokeStyle = t.red; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(info.target.x, info.target.y, info.panic, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        if (cfg.mode === 'pursue' || cfg.mode === 'evade') { ctx.fillStyle = t.purple; ctx.beginPath(); ctx.arc(bot.p.x, bot.p.y, 10, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'hedef (bot)', bot.p.x, bot.p.y + 20, t.purple, { size: 11 }); if (info.fut) { ctx.strokeStyle = t.purple; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(bot.p.x, bot.p.y); ctx.lineTo(info.fut.x, info.fut.y); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(info.fut.x, info.fut.y, 6, 0, 7); ctx.stroke(); SL.drawLabel(ctx, 'tahmini konum', info.fut.x, info.fut.y - 14, t.purple, { size: 11 }); } }
        else if (info.target && cfg.mode !== 'path') { ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(info.target.x, info.target.y, 7, 0, 7); ctx.fill(); }
        if (cfg.mode === 'wander' && info.wc) { ctx.strokeStyle = t.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(info.wc.x, info.wc.y, 35, 0, 7); ctx.stroke(); ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(info.wt.x, info.wt.y, 5, 0, 7); ctx.fill(); }
        if (cfg.mode === 'path' && info.proj) { ctx.fillStyle = t.purple; ctx.beginPath(); ctx.arc(info.fut.x, info.fut.y, 4, 0, 7); ctx.fill(); ctx.strokeStyle = t.purple; ctx.beginPath(); ctx.moveTo(info.fut.x, info.fut.y); ctx.lineTo(info.proj.x, info.proj.y); ctx.stroke(); ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(info.target.x, info.target.y, 5, 0, 7); ctx.fill(); }
        if (cfg.obst && info.ahead) { ctx.strokeStyle = info.hit ? t.red : t.muted; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(a.p.x, a.p.y); ctx.lineTo(info.ahead.x, info.ahead.y); ctx.stroke(); ctx.setLineDash([]); }
        SL.drawAgent(ctx, a.p, a.h || 0, t.blue, 13);
        if (cfg.vecs && info.des) {
          // etiketler okun ucunun ötesinde; oklar aynı doğrultudayken etiketler üst üste binmesin diye çakışan alt satıra iner
          const placed = [];
          const arrowL = (from, vec, col, lab, o) => {
            SL.drawArrow(ctx, from, vec, col, o);
            const L = V.len(vec); if (L < 1) return;
            const u = V.mul(vec, 1 / L), to = V.add(from, vec), align = u.x > 0.35 ? 'left' : u.x < -0.35 ? 'right' : 'center';
            ctx.save(); ctx.font = '700 12px "JetBrains Mono"'; const wd = ctx.measureText(lab).width + 10; ctx.restore();
            const x = to.x + u.x * 20, x0 = align === 'left' ? x - 5 : align === 'right' ? x - wd + 5 : x - wd / 2;
            let y = to.y + u.y * 20 + (align === 'center' ? (u.y > 0 ? 8 : -8) : 0);
            for (let k = 0; k < 4 && placed.some(q => x0 < q[2] && q[0] < x0 + wd && y - 9 < q[3] && q[1] < y + 9); k++) y += 19;
            placed.push([x0, y - 9, x0 + wd, y + 9]); SL.drawLabel(ctx, lab, x, y, col, { align });
          };
          arrowL(a.p, V.mul(a.v, 0.5), t.blue, 'hız', { w: 2.5 });
          arrowL(a.p, V.mul(info.des, 0.5), t.green, 'istenen', { w: 2.5, dash: [6, 4] });
          arrowL(V.add(a.p, V.mul(a.v, 0.5)), V.mul(info.force, 0.25), t.red, 'direksiyon', { w: 3 });
        }
        SL.drawLabel(ctx, `hız ${Math.round(V.len(a.v))} / ${cfg.maxSpeed}`, 70, 16, t.muted, { size: 11 });
      }
    });
    const modes = { seek: 'Seek (ara)', flee: 'Flee (kaç)', arrive: 'Arrive (yavaşlayarak var)', pursue: 'Pursue (önünü kes)', evade: 'Evade (tahminle kaç)', wander: 'Wander (dolaş)', path: 'Path following (yol izle)' };
    const DESC = {
      seek: ['istenen = (hedef − konum) yönünde, azami hızla', 'Fare hedeftir. Hedefin üstünden geçip yörüngeye girer.'],
      flee: ['istenen = (konum − tehdit) yönünde, azami hızla', 'Kırmızı çember panik yarıçapı: dışındaysa sakinleşir.'],
      arrive: ['yarıçap içinde hız = azami × mesafe / yarıçap', 'Sarı çemberin içinde yavaşlar, hedefte durur.'],
      pursue: ['T = mesafe / azami hız · hedef = bot.konum + bot.hız × T', 'Botun arkasından değil, gideceği yere koşar.'],
      evade: ['aynı tahmin, ama oradan kaç', 'Bot yaklaşırken erkenden kenara çekilir.'],
      wander: ['önde bir çember; çember üstündeki nokta her karede biraz kayar', 'Rastgele ama yumuşak; kenarlara gelince merkeze döner.'],
      path: ['ilerideki konumu yola izdüşür; yoldan çıkarsa yolda biraz ileriyi ara', 'Mor nokta: tahmin · kırmızı: yoldaki hedef. Sona varınca baştan başlar.']
    };
    const side = el('div', { class: 'gv-side' });
    const drawSide = () => { side.innerHTML = `<div class="box story"><span class="bt">${modes[cfg.mode]}</span><code style="font-size:15px">${DESC[cfg.mode][0]}</code><p style="font-size:18px;line-height:1.35;margin:.5em 0 0">${DESC[cfg.mode][1]}</p></div><div style="font-size:16px;margin-top:10px;line-height:1.5"><b>Oklar:</b> 🔵 mevcut hız · 🟢 istenen hız · 🔴 direksiyon = istenen − hız (azami kuvvetle kırpılır)<br><b>Noktalı iz:</b> ajanın son birkaç saniyede geçtiği yol.</div>`; };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Davranış: ', select(modes, cfg.mode, v => { const was = cfg.mode; cfg.mode = v; trail = []; drawSide(); if (v === 'path' || was === 'path') reset(); })),
      slider('azami hız', 40, 320, cfg.maxSpeed, 10, v => { cfg.maxSpeed = v; }),
      slider('azami kuvvet', 40, 800, cfg.maxForce, 20, v => { cfg.maxForce = v; }),
      el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.vecs = e.target.checked; } }); x.checked = true; return x; })(), ' vektörler'),
      el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.obst = e.target.checked; } }); x.checked = cfg.obst; return x; })(), ' engeller + kaçınma')),
      el('div', { class: 'gv-row' }, el('div', { style: 'flex:none' }, w.canvas), side), w.controls());
    w.canvas.style.width = '760px'; drawSide();
    w.reset();
    return { start: () => w.start(), stop: () => w.stop() };
  };

  /* ---------- boids ---------- */
  D.boids = function (root) {
    const W = 720, H = 380;
    const cfg = { n: 120, sep: 1.6, ali: 1.0, coh: 0.9, r: 55, grid: true, predator: true, showR: true };
    const SEP_R = 25;   // kişisel alan (px)
    let boids = [], checks = 0;
    const mk = () => ({ p: V.v(SL.rand(0, W), SL.rand(0, H)), v: V.fromAngle(SL.rand(0, 7), 90), maxSpeed: 140, maxForce: 300, h: 0 });
    const reset = () => { boids = Array.from({ length: cfg.n }, mk); };
    const w = new SL.World({
      W, H, reset,
      update(dt, w) {
        while (boids.length < cfg.n) boids.push(mk()); if (boids.length > cfg.n) boids.length = cfg.n;
        checks = 0;
        const cell = cfg.r, grid = new Map();
        if (cfg.grid) boids.forEach(b => { const k = Math.floor(b.p.x / cell) + ',' + Math.floor(b.p.y / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(b); });
        const near = b => { if (!cfg.grid) return boids; const cx = Math.floor(b.p.x / cell), cy = Math.floor(b.p.y / cell), out = []; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const g = grid.get(cx + dx + ',' + (cy + dy)); if (g) out.push(...g); } return out; };
        const m = w.mouse.inside && cfg.predator ? V.v(w.mouse.x, w.mouse.y) : null;
        const forces = boids.map(b => {
          let sep = V.v(), ali = V.v(), coh = V.v(), k = 0;
          for (const o of near(b)) {
            if (o === b) continue; checks++;
            const d = V.dist(b.p, o.p); if (d > cfg.r || d < 1e-6) continue;
            k++; ali = V.add(ali, o.v); coh = V.add(coh, o.p);
            // ayrılma yalnızca kişisel alandaki (SEP_R) komşulardan: görüş yarıçapının tamamından itilen boidler
            // ekrana eşit aralıklarla yayılır, sürü oluşmaz (Reynolds/Shiffman'da da ayrılma yarıçapı görüşten küçüktür)
            if (d < Math.min(SEP_R, cfg.r)) sep = V.add(sep, V.mul(V.sub(b.p, o.p), 1 / (d * d)));
          }
          let f = V.v();
          if (k) {
            if (sep.x || sep.y) f = V.add(f, V.mul(steerTo(b, V.setLen(sep, b.maxSpeed)), cfg.sep));
            f = V.add(f, V.mul(steerTo(b, V.setLen(ali, b.maxSpeed)), cfg.ali));
            f = V.add(f, V.mul(steerTo(b, B.seek(b, V.mul(coh, 1 / k))), cfg.coh));
          }
          if (m && V.dist(b.p, m) < 110) f = V.add(f, V.mul(steerTo(b, B.flee(b, m)), 3));
          return f;
        });
        boids.forEach((b, i) => { b.v = V.limit(V.add(b.v, V.mul(forces[i], dt)), b.maxSpeed); if (V.len(b.v) < 50) b.v = V.setLen(b.v, 50); b.p = V.add(b.p, V.mul(b.v, dt)); if (b.p.x < 0) b.p.x += W; if (b.p.x > W) b.p.x -= W; if (b.p.y < 0) b.p.y += H; if (b.p.y > H) b.p.y -= H; b.h = V.angle(b.v); });
      },
      render(ctx, w, t) {
        if (cfg.showR && boids[0]) { const b = boids[0]; ctx.fillStyle = t.dark ? 'rgba(255,210,122,0.08)' : 'rgba(245,165,36,0.12)'; ctx.beginPath(); ctx.arc(b.p.x, b.p.y, cfg.r, 0, 7); ctx.fill(); ctx.strokeStyle = t.amber; ctx.stroke(); }
        boids.forEach((b, i) => SL.drawAgent(ctx, b.p, b.h, i === 0 && cfg.showR ? t.amber : t.blue, 7));
        if (w.mouse.inside && cfg.predator) { ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(w.mouse.x, w.mouse.y, 9, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'yırtıcı', w.mouse.x, w.mouse.y + 18, t.red, { size: 11 }); }
        SL.drawLabel(ctx, `bu karede komşu kontrolü: ${checks.toLocaleString('tr-TR')} ${cfg.grid ? '(ızgara)' : '(herkes herkesle: n²)'}`, 200, 16, t.ink, { size: 12 });
      }
    });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      slider('ayrılma', 0, 4, cfg.sep, 0.1, v => { cfg.sep = v; }), slider('hizalanma', 0, 4, cfg.ali, 0.1, v => { cfg.ali = v; }), slider('bütünleşme', 0, 4, cfg.coh, 0.1, v => { cfg.coh = v; }),
      slider('görüş yarıçapı', 15, 120, cfg.r, 5, v => { cfg.r = v; }), slider('boid sayısı', 10, 400, cfg.n, 10, v => { cfg.n = v; })),
      el('div', { class: 'sv-controls' },
        el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.grid = e.target.checked; } }); x.checked = true; return x; })(), ' uzamsal ızgara'),
        el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.predator = e.target.checked; } }); x.checked = true; return x; })(), ' fare = yırtıcı'),
        el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg.showR = e.target.checked; } }); x.checked = true; return x; })(), ' bir boid’in görüşünü göster')),
      w.canvas, w.controls());
    w.reset();
    return { start: () => w.start(), stop: () => w.stop() };
  };

  /* ---------- context steering (Fray, F1 2011) ---------- */
  D.context = function (root) {
    const W = 720, H = 380, N = 16, LOOK = 150, RAD = 16;
    const TG = [{ p: V.v(620, 200), name: 'A' }];
    const OB = [{ x: 420, y: 200, r: 60 }];
    let mode = 'context', a, maps = null, stuck = 0, done = false;
    const reset = () => { a = { p: V.v(110, 200), v: V.v(80, 0), maxSpeed: 150, maxForce: 300, h: 0 }; stuck = 0; done = false; };
    reset();
    const dirs = [...Array(N)].map((_, i) => V.fromAngle((i / N) * Math.PI * 2));
    // ışın (p + t·d) ile genişletilmiş çemberin kesişme mesafesi; yoksa Infinity
    const rayHit = (p, d, o) => { const m = V.sub(p, o), b = V.dot(m, d), c = V.len2(m) - (o.r + RAD) ** 2; if (c < 0) return 0; const disc = b * b - c; if (disc < 0) return Infinity; const t = -b - Math.sqrt(disc); return t >= 0 ? t : Infinity; };
    const w = new SL.World({
      W, H, reset,
      update(dt) {
        const tg = TG[0];
        if (V.dist(a.p, tg.p) < 18) { done = true; a.v = V.mul(a.v, 0.85); return; }
        let des;
        if (mode === 'sum') {
          // klasik: seek(hedef) + kaçınma(engelden uzağa), ağırlıklı toplam
          des = B.seek(a, tg.p);
          OB.forEach(o => { const d = V.dist(a.p, o) - o.r; if (d < 110) des = V.add(des, V.mul(B.flee(a, o), (110 - d) / 50)); });
          des = V.limit(des, a.maxSpeed); maps = null;
        } else {
          // context: her yön için ilgi (hedefe ne kadar dönük) ve tehlike (o yönde ne kadar yakında engel var)
          const toT = V.norm(V.sub(tg.p, a.p));
          const interest = dirs.map(dd => Math.max(0, (V.dot(dd, toT) + 0.3) / 1.3));
          const danger = dirs.map(dd => { let s = 0; OB.forEach(o => { const t = rayHit(a.p, dd, o); if (t < LOOK) s = Math.max(s, 1 - t / LOOK); }); return s; });
          const minD = Math.min(...danger);
          const masked = interest.map((v, i) => (danger[i] > minD + 0.05 ? 0 : v));
          let bi = 0; masked.forEach((v, i) => { if (v > masked[bi]) bi = i; });
          des = V.mul(dirs[bi], a.maxSpeed);
          maps = { interest, danger, masked, bi };
        }
        const f = steerSharp(a, des);
        const before = V.copy(a.p);
        integrate(a, f, dt, W, H, false);
        OB.forEach(o => { const d = V.dist(a.p, o); if (d < o.r + 10) a.p = V.add(o, V.setLen(V.sub(a.p, o), o.r + 10)); });   // engelin içine girme
        stuck = V.dist(before, a.p) < 0.5 ? stuck + dt : 0;
      },
      render(ctx, w, t) {
        OB.forEach(o => { ctx.fillStyle = t.dark ? '#3a3f55' : '#9aa0b4'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.fill(); });
        TG.forEach(tg => { ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(tg.p.x, tg.p.y, 10, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'hedef', tg.p.x, tg.p.y - 20, t.green, { size: 12 }); });
        if (maps) for (let i = 0; i < N; i++) {
          const dd = dirs[i], base = V.add(a.p, V.mul(dd, 20));
          ctx.globalAlpha = maps.masked[i] > 0 ? 0.9 : 0.25;
          ctx.strokeStyle = t.green; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(base.x, base.y); const e1 = V.add(base, V.mul(dd, 60 * maps.interest[i])); ctx.lineTo(e1.x, e1.y); ctx.stroke();
          ctx.globalAlpha = 0.9;
          if (maps.danger[i] > 0.01) { ctx.strokeStyle = t.red; ctx.lineWidth = 3; const b2 = V.add(base, V.mul(V.perp(dd), 4)); const e2 = V.add(b2, V.mul(dd, 60 * maps.danger[i])); ctx.beginPath(); ctx.moveTo(b2.x, b2.y); ctx.lineTo(e2.x, e2.y); ctx.stroke(); }
          ctx.globalAlpha = 1;
          if (i === maps.bi) { ctx.strokeStyle = t.amber; ctx.lineWidth = 2; const e3 = V.add(a.p, V.mul(dd, 100)); ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(a.p.x, a.p.y); ctx.lineTo(e3.x, e3.y); ctx.stroke(); ctx.setLineDash([]); }
        }
        SL.drawAgent(ctx, a.p, a.h || 0, t.blue, 13);
        SL.drawLabel(ctx, mode === 'sum' ? 'ağırlıklı toplam: seek + kaçınma' : 'context steering: 🟢 ilgi · 🔴 tehlike · soluk = maskelendi · 🟠 seçilen yön', 330, 16, t.ink, { size: 12 });
        if (done) SL.drawLabel(ctx, '✅ hedefe ulaştı', a.p.x, a.p.y + 30, t.green, { size: 12 });
        else if (stuck > 1) SL.drawLabel(ctx, '⚠️ takıldı! seek ve kaçınma birbirini götürüyor', a.p.x + 40, a.p.y + 34, t.red, { size: 12 });
      }
    });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Yöntem: ', select({ context: 'context steering (Fray)', sum: 'ağırlıklı toplam (klasik)' }, mode, v => { mode = v; w.reset(); }))), w.canvas, w.controls());
    w.reset();
    return { start: () => w.start(), stop: () => w.stop() };
  };

  /* ---------- simlab: seek ve arrive’ı sen yaz ---------- */
  SL.SIMLABS.steer = function (box, api) {
    let fns = null, a, trail = [];
    const W = 560, H = 300;
    const reset = () => { a = { p: V.v(80, 150), v: V.v(0, 0), h: 0 }; trail = []; };
    const w = new SL.World({
      W, H, reset,
      update(dt, w) {
        if (!fns) return;
        const tgt = w.mouse.inside ? V.v(w.mouse.x, w.mouse.y) : V.v(460, 120);
        const r = fns.arrive([a.p.x, a.p.y], [a.v.x, a.v.y], [tgt.x, tgt.y], 160, 100);
        if (!Array.isArray(r) || r.length !== 2 || !r.every(Number.isFinite)) { w.pause(); api.setMsg('err', '⚠️ arrive bir [x, y] dizisi (istenen hız) döndürmeli. Döndürülen: ' + JSON.stringify(r)); return; }
        const f = V.limit(V.mul(V.sub(V.v(r[0], r[1]), a.v), STEER_GAIN), 300);
        a.v = V.limit(V.add(a.v, V.mul(f, dt)), 160); a.p = V.add(a.p, V.mul(a.v, dt)); if (V.len(a.v) > 2) a.h = V.angle(a.v);
        if (w.frame % 3 === 0) { trail.push(V.copy(a.p)); if (trail.length > 120) trail.shift(); }
      },
      render(ctx, w, t) {
        const tgt = w.mouse.inside ? w.mouse : V.v(460, 120);
        ctx.strokeStyle = t.amber; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 100, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 7, 0, 7); ctx.fill();
        ctx.fillStyle = t.muted; trail.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, 7); ctx.fill(); });
        SL.drawAgent(ctx, a.p, a.h, t.blue, 13);
        SL.drawLabel(ctx, `hız ${Math.round(V.len(a.v))}`, 50, 14, t.muted, { size: 11 });
      }
    });
    box.append(w.canvas, w.controls({ speed: false }));
    w.reset();
    const near = (u, v2) => Array.isArray(u) && u.length === 2 && Math.abs(u[0] - v2[0]) < 1e-3 && Math.abs(u[1] - v2[1]) < 1e-3;
    return {
      world: w,
      setFns(f) { fns = f; w.reset(); w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        const ref = (p, t, ms) => { const dx = t[0] - p[0], dy = t[1] - p[1], L = Math.hypot(dx, dy); return L < 1e-9 ? [0, 0] : [dx / L * ms, dy / L * ms]; };
        const refA = (p, t, ms, sr) => { const dx = t[0] - p[0], dy = t[1] - p[1], L = Math.hypot(dx, dy); if (L < 1e-9) return [0, 0]; const sp = L < sr ? ms * L / sr : ms; return [dx / L * sp, dy / L * sp]; };
        const cs = [[[0, 0], [100, 0], 50], [[10, 10], [10, 70], 20], [[5, 5], [5, 5], 30], [[0, 0], [3, 4], 10], [[100, 50], [40, -30], 120]];
        try {
          for (const [p, t, ms] of cs) { const r = mod.seek(p, [0, 0], t, ms); const want = ref(p, t, ms); if (!near(r, want)) return { ok: false, msg: `❌ seek(${JSON.stringify(p)}, hız, ${JSON.stringify(t)}, ${ms}) → ${JSON.stringify(want.map(x => +x.toFixed(3)))} olmalı. Seninki: ${JSON.stringify(r)}` }; }
          const ca = [[[0, 0], [200, 0], 50, 100], [[0, 0], [50, 0], 50, 100], [[0, 0], [0, 20], 80, 100], [[0, 0], [6, 8], 100, 100], [[1, 1], [1, 1], 100, 100]];
          for (const [p, t, ms, sr] of ca) { const r = mod.arrive(p, [0, 0], t, ms, sr); const want = refA(p, t, ms, sr); if (!near(r, want)) return { ok: false, msg: `❌ arrive(${JSON.stringify(p)}, hız, ${JSON.stringify(t)}, ${ms}, ${sr}) → ${JSON.stringify(want.map(x => +x.toFixed(3)))} olmalı. Seninki: ${JSON.stringify(r)}` }; }
        } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
        return { ok: true, msg: '✅ seek ve arrive 10/10 testten geçti. Fareyi gezdirin: ajan hedefe yaklaşınca yumuşakça yavaşlamalı.' };
      }
    };
  };

  /* ---------- ailab: ayrılma kuvveti ---------- */
  SL.AILABS.separation = {
    fn: 'separation', jsFn: 'separation', tol: 1e-6,
    ref: (me, others, r) => { let sx = 0, sy = 0; for (const o of others) { const dx = me[0] - o[0], dy = me[1] - o[1], d = Math.hypot(dx, dy); if (d > 0 && d < r) { sx += dx / (d * d); sy += dy / (d * d); } } return [sx, sy]; },
    cases: () => {
      const cs = [[[0, 0], [[1, 0]], 5], [[0, 0], [[3, 4]], 10], [[0, 0], [[3, 4]], 5], [[0, 0], [[0, 0]], 5], [[0, 0], [[2, 0], [-2, 0]], 5], [[1, 1], [], 5], [[0, 0], [[1, 1], [10, 10]], 3]];
      for (let i = 0; i < 12; i++) { const me = [Math.round(Math.random() * 100), Math.round(Math.random() * 100)]; const k = 1 + Math.floor(Math.random() * 6); cs.push([me, Array.from({ length: k }, () => [me[0] + Math.round(SL.rand(-30, 30)), me[1] + Math.round(SL.rand(-30, 30))]), 25]); }
      return cs;
    },
    show: (me, o, r) => `ben ${JSON.stringify(me)}, komşular ${JSON.stringify(o)}, yarıçap ${r}`,
    hint: (me, o) => (o.some(q => q[0] === me[0] && q[1] === me[1]) ? 'Mesafesi 0 olan komşuyu atlayın (sıfıra bölme!).' : 'Her yakın komşu için (ben − komşu) / d² ekleyin; d ≥ yarıçap olanları atlayın.')
  };
  SL.AILABS.alignment = {
    fn: 'alignment', jsFn: 'alignment', tol: 1e-6,
    ref: (vels, maxSpeed) => { if (!vels.length) return [0, 0]; let sx = 0, sy = 0; vels.forEach(v => { sx += v[0]; sy += v[1]; }); sx /= vels.length; sy /= vels.length; const L = Math.hypot(sx, sy); return L < 1e-9 ? [0, 0] : [(sx / L) * maxSpeed, (sy / L) * maxSpeed]; },
    cases: () => { const cs = [[[[1, 0], [0, 1]], 10], [[[3, 4]], 5], [[], 5], [[[1, 0], [-1, 0]], 3], [[[2, 0], [4, 0], [0, 6]], 2]]; for (let i = 0; i < 10; i++) cs.push([Array.from({ length: 1 + Math.floor(Math.random() * 5) }, () => [Math.round(SL.rand(-50, 50)), Math.round(SL.rand(-50, 50))]), [50, 100, 150][i % 3]]); return cs; },
    show: (v, m) => `komşu hızları ${JSON.stringify(v)}, azami hız ${m}`,
    hint: v => (!v.length ? 'Komşu yoksa [0, 0].' : 'Ortalama hızı bulun, sonra uzunluğunu azami hıza ayarlayın (normalize × maxSpeed). Ortalama sıfırsa [0, 0].')
  };

  /* ---------- başlık ---------- */
  D.titlesteer = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const bs = Array.from({ length: 70 }, () => ({ p: V.v(SL.rand(620, 1260), SL.rand(10, 220)), v: V.fromAngle(SL.rand(-0.4, 0.4), 120), maxSpeed: 140, maxForce: 200 }));
    let timer, running = false, t = 0;
    const step = () => {
      t += 0.04;
      const goal = V.v(940 + Math.cos(t * 0.6) * 250, 115 + Math.sin(t * 1.1) * 70);
      bs.forEach(b => {
        let sep = V.v(), ali = V.v(), coh = V.v(), k = 0;
        bs.forEach(o => { if (o === b) return; const d = V.dist(b.p, o.p); if (d < 45 && d > 0) { k++; sep = V.add(sep, V.mul(V.sub(b.p, o.p), 1 / (d * d))); ali = V.add(ali, o.v); coh = V.add(coh, o.p); } });
        let f = steerTo(b, B.seek(b, goal));
        if (k) { f = V.add(f, V.mul(steerTo(b, V.setLen(sep, b.maxSpeed)), 1.8)); f = V.add(f, steerTo(b, V.setLen(ali, b.maxSpeed))); f = V.add(f, V.mul(steerTo(b, B.seek(b, V.mul(coh, 1 / k))), 0.6)); }
        b.v = V.limit(V.add(b.v, V.mul(f, 0.04)), b.maxSpeed); b.p = V.add(b.p, V.mul(b.v, 0.04));
      });
      ctx.clearRect(0, 0, W, H);
      bs.forEach(b => { const a = V.angle(b.v); ctx.save(); ctx.translate(b.p.x, b.p.y); ctx.rotate(a); ctx.fillStyle = 'rgba(140,220,255,0.85)'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, 4); ctx.lineTo(-6, -4); ctx.fill(); ctx.restore(); });
    };
    const tick = () => { if (!running) return; step(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();

/* EK:BAŞLA — ısınma laboratuvarları */
(function () {
  'use strict';

  const rv = () => [Math.round(SL.rand(-200, 200)), Math.round(SL.rand(-200, 200))];
  SL.AILABS.steerdiff = {
    fn: 'steering', jsFn: 'steering',
    ref: (d, v) => [d[0] - v[0], d[1] - v[1]],
    cases: () => { const cs = [[[-180, 0], [180, 0]], [[100, 0], [100, 0]], [[0, 160], [160, 0]], [[0, 0], [50, -20]]]; for (let i = 0; i < 16; i++) cs.push([rv(), rv()]); return cs; },
    show: (d, v) => `istenen hız ${JSON.stringify(d)}, mevcut hız ${JSON.stringify(v)}`,
    hint: () => 'Reynolds’ın formülü: direksiyon = istenen − mevcut. Bileşen bileşen çıkarın: [dx − vx, dy − vy].'
  };
  SL.AILABS.limitvec = {
    fn: 'limit', jsFn: 'limit', tol: 1e-6,
    ref: (v, m) => { const L = Math.hypot(v[0], v[1]); return L > m ? [v[0] / L * m, v[1] / L * m] : [v[0], v[1]]; },
    cases: () => { const cs = [[[300, 400], 100], [[3, 4], 100], [[0, 0], 50], [[-360, 0], 260], [[0, 10], 10]]; for (let i = 0; i < 16; i++) cs.push([rv(), Math.round(SL.rand(20, 300))]); return cs; },
    show: (v, m) => `vektör ${JSON.stringify(v)}, azami uzunluk ${m}`,
    hint: (v, m) => { const L = Math.hypot(v[0], v[1]); return L > m ? `Uzunluk ${L.toFixed(1)} > ${m}: yönü koruyup uzunluğu ${m} yapın → her bileşeni (${m} / uzunluk) ile çarpın.` : `Uzunluk ${L.toFixed(1)} ≤ ${m}: vektör aynen dönmeli.`; }
  };
})();
/* EK:BİTİŞ */
