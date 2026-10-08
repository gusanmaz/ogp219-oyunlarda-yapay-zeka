/* =====================================================================
   oyunai.js — Oyun YZ’si destelerinin ortak simülasyon motoru (core.js gerekir)
   - SL.V: 2B vektör yardımcıları ({x, y} nesneleri)
   - SL.World: sabit adımlı (60 Hz) dünya; ⏸/▶, 1 kare ileri, hız, ↺ kontrolleri
   - Çizim: SL.drawAgent, SL.drawCone, SL.drawArrow, SL.drawLabel
   - .simlab: öğrencinin yazdığı JS fonksiyonu canlı simülasyona bağlanır
   ===================================================================== */
(function () {
  'use strict';
  const { el, btn, slider } = SL;
  const T = () => SL.theme();

  /* ---------------- 2B vektörler ---------------- */
  const V = (SL.V = {
    v: (x = 0, y = 0) => ({ x, y }),
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
    mul: (a, k) => ({ x: a.x * k, y: a.y * k }),
    dot: (a, b) => a.x * b.x + a.y * b.y,
    cross: (a, b) => a.x * b.y - a.y * b.x,
    len: a => Math.hypot(a.x, a.y),
    len2: a => a.x * a.x + a.y * a.y,
    dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    norm: a => { const l = Math.hypot(a.x, a.y); return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 }; },
    limit: (a, m) => { const l = Math.hypot(a.x, a.y); return l > m ? { x: (a.x / l) * m, y: (a.y / l) * m } : { x: a.x, y: a.y }; },
    setLen: (a, m) => { const l = Math.hypot(a.x, a.y); return l > 1e-9 ? { x: (a.x / l) * m, y: (a.y / l) * m } : { x: 0, y: 0 }; },
    lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }),
    angle: a => Math.atan2(a.y, a.x),
    fromAngle: (r, m = 1) => ({ x: Math.cos(r) * m, y: Math.sin(r) * m }),
    rot: (a, r) => ({ x: a.x * Math.cos(r) - a.y * Math.sin(r), y: a.x * Math.sin(r) + a.y * Math.cos(r) }),
    perp: a => ({ x: -a.y, y: a.x }),
    copy: a => ({ x: a.x, y: a.y })
  });
  SL.rand = (a, b) => a + Math.random() * (b - a);
  SL.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  SL.angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  /* ---------------- çizim yardımcıları ---------------- */
  SL.drawAgent = function (ctx, p, heading, col, size = 11, o = {}) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(heading);
    ctx.fillStyle = col; ctx.strokeStyle = o.stroke || 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * 0.75, size * 0.62); ctx.lineTo(-size * 0.45, 0); ctx.lineTo(-size * 0.75, -size * 0.62); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (o.label) SL.drawLabel(ctx, o.label, p.x, p.y - size - 8, o.labelCol);
  };
  SL.drawCone = function (ctx, p, heading, fov, range, col, alpha = 0.16) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, range, heading - fov / 2, heading + fov / 2); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = Math.min(1, alpha * 3); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  };
  SL.drawArrow = function (ctx, from, vec, col, o = {}) {
    const to = V.add(from, vec), L = V.len(vec); if (L < 1) return;
    const u = V.mul(vec, 1 / L), h = Math.min(10, L * 0.4);
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = o.w || 2.5; if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x - u.x * h * 0.6, to.y - u.y * h * 0.6); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(to.x, to.y); ctx.lineTo(to.x - u.x * h - u.y * h * 0.5, to.y - u.y * h + u.x * h * 0.5); ctx.lineTo(to.x - u.x * h + u.y * h * 0.5, to.y - u.y * h - u.x * h * 0.5); ctx.closePath(); ctx.fill();
    if (o.label) {   // etiketi okun yönünde ucun ÖTESİNE, yöne göre hizalayarak koy
      const gap = o.labelGap || 20, lx = to.x + u.x * gap, ly = to.y + u.y * gap;
      const align = u.x > 0.35 ? 'left' : u.x < -0.35 ? 'right' : 'center';
      SL.drawLabel(ctx, o.label, lx, ly + (align === 'center' ? (u.y > 0 ? 8 : -8) : 0), col, { align });
    }
    ctx.restore();
  };
  SL.drawLabel = function (ctx, txt, x, y, col, o = {}) {
    const t = T(); ctx.save(); ctx.font = `${o.weight || 700} ${o.size || 12}px "${o.font || 'JetBrains Mono'}"`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    if (o.bg !== false) { const w = ctx.measureText(txt).width + 8; ctx.fillStyle = t.dark ? 'rgba(10,10,20,0.72)' : 'rgba(255,255,255,0.82)'; const x0 = o.align === 'left' ? x - 4 : o.align === 'right' ? x - w + 4 : x - w / 2; ctx.fillRect(x0, y - 9, w, 18); }
    ctx.fillStyle = col || t.ink; ctx.fillText(txt, x, y + 1); ctx.restore();
  };
  SL.drawGrid = function (ctx, W, H, step, col) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1; for (let x = 0; x <= W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y <= H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } ctx.restore(); };

  /* ---------------- dünya (sabit adımlı simülasyon) ---------------- */
  SL.World = class {
    constructor(o = {}) {
      this.W = o.W || 1180; this.H = o.H || 360; this.dt = 1 / 60;
      this.canvas = el('canvas', { class: 'world-canvas' }); this.ctx = SL.setupCanvas(this.canvas, this.W, this.H);
      this.speed = o.speed || 1; this.playing = o.autoplay !== false; this.running = false; this.time = 0; this.frame = 0;
      this.update = o.update || (() => {}); this.render = o.render || (() => {}); this.resetFn = o.reset || (() => {});
      this.mouse = { x: this.W / 2, y: this.H / 2, inside: false, down: false };
      const pos = e => { const r = this.canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) * this.W) / r.width, y: ((e.clientY - r.top) * this.H) / r.height }; };
      this.canvas.addEventListener('mousemove', e => { Object.assign(this.mouse, pos(e), { inside: true }); if (o.onMove) o.onMove(this.mouse, e); if (!this.playing) this.draw(); });
      this.canvas.addEventListener('mouseleave', () => { this.mouse.inside = false; this.mouse.down = false; });
      this.canvas.addEventListener('mousedown', e => { Object.assign(this.mouse, pos(e), { down: true }); if (o.onClick) o.onClick(this.mouse, e); if (!this.playing) this.draw(); });
      window.addEventListener('mouseup', () => { this.mouse.down = false; });
      this.acc = 0; this.last = 0;
      SL.onTheme(() => this.draw());
    }
    reset() { this.time = 0; this.frame = 0; this.resetFn(this); this.draw(); }
    tick() { this.update(this.dt, this); this.time += this.dt; this.frame++; }
    draw() { const t = T(), ctx = this.ctx; ctx.clearRect(0, 0, this.W, this.H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, this.W, this.H); this.render(ctx, this, t); if (this.hud) this.hud(this); }
    loop(now) {
      if (!this.running) return;
      if (this.playing) {
        const el = Math.min(0.1, (now - (this.last || now)) / 1000); this.acc += el * this.speed;
        let n = 0; while (this.acc >= this.dt && n < 12) { this.tick(); this.acc -= this.dt; n++; }
        this.draw();
      }
      this.last = now; this.raf = requestAnimationFrame(t => this.loop(t));
    }
    start() { if (this.running) return; this.running = true; this.last = 0; this.raf = requestAnimationFrame(t => this.loop(t)); }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
    controls(o = {}) {
      const play = btn(this.playing ? '⏸ Durdur' : '▶ Oynat', () => { this.playing = !this.playing; sync(); });
      const sync = () => { play.textContent = this.playing ? '⏸ Durdur' : '▶ Oynat'; };
      this.syncBtn = sync;
      const bar = el('div', { class: 'sv-transport' }, play,
        el('button', { class: 'btn', title: 'Bir kare ilerlet', onclick: () => { this.playing = false; sync(); this.tick(); this.draw(); } }, 'İleri ▶| 1 kare'),
        el('button', { class: 'btn', title: '10 kare ilerlet', onclick: () => { this.playing = false; sync(); for (let i = 0; i < 10; i++) this.tick(); this.draw(); } }, '▶▶ 10 kare'),
        el('button', { class: 'btn', title: 'Baştan başlat', onclick: () => this.reset() }, '↺ Baştan'));
      if (o.speed !== false) bar.append(slider('Hız ×', 0.25, 4, this.speed, 0.25, v => { this.speed = v; }));
      return bar;
    }
    pause() { this.playing = false; if (this.syncBtn) this.syncBtn(); }
  };

  /* ---------------- .simlab: öğrenci kodu → canlı simülasyon ---------------- */
  SL.SIMLABS = SL.SIMLABS || {};
  SL.SimLab = function (root) {
    const d = root.dataset, fns = (d.fns || '').split(',').filter(Boolean);
    const shell = SL.labShell(root);
    const box = el('div', { class: 'simlab-world' });
    shell.right.append(box, shell.msg, shell.out);
    const sim = SL.SIMLABS[d.sim](box, { setMsg: shell.setMsg, print: shell.print });
    shell.onRun = async () => {
      shell.clearOut();
      let mod;
      try {
        const scope = sim.scope || {}, keys = Object.keys(scope);   // simülasyonun öğrenciye verdiği hazır yardımcılar
        mod = new Function('print', '__g', 'V', ...keys, '"use strict";\n' + SL.guardLoops(shell.cm.getValue()) + `\n;return { ${fns.map(f => `${f}: typeof ${f} === 'function' ? ${f} : null`).join(', ')} };`)(shell.print, SL.makeGuard(200000), SL.V, ...keys.map(k => scope[k]));
      } catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      const missing = fns.filter(f => !mod[f]);
      if (missing.length) { shell.setMsg('err', '⚠️ Kodda şu fonksiyon(lar) bulunamadı: ' + missing.join(', ')); return; }
      // her çağrıyı korumaya al: hata olursa simülasyonu durdur
      const safe = {};
      fns.forEach(f => { safe[f] = (...a) => { try { return mod[f](...a); } catch (e) { sim.world && sim.world.pause(); shell.setMsg('err', `⚠️ ${f}() içinde hata: ${SL.jsErrorText(e)}`); throw e; } }; });
      sim.setFns(safe);
      const r = sim.check ? sim.check(mod) : null;
      if (r) shell.setMsg(r.ok ? 'ok' : 'err', r.msg); else shell.setMsg('ok', '✅ Kod yüklendi — simülasyonu izleyin.');
    };
    shell.run();
    return { start: () => sim.world && sim.world.start(), stop: () => sim.world && sim.world.stop(), refresh: shell.refresh };
  };
  SL.register('.simlab', SL.SimLab);


  /* ---------------- .ailab: JS + Python için ortak test laboratuvarı ----------------
     SL.AILABS[ad] = { fn: 'in_fov' (Python adı), jsFn: 'inFov', cases: () => [[arg1, arg2..], ...],
                       ref: (...args) => beklenen, show: args => 'açıklama', tol: 1e-6 } */
  SL.AILABS = SL.AILABS || {};
  const PY_AI = `
import json, sys, math
def _guard(limit=2000000):
    cnt = [0]
    def tr(frame, event, arg):
        cnt[0] += 1
        if cnt[0] > limit:
            raise RuntimeError("çok fazla adım — sonsuz döngü olabilir")
        return tr
    sys.settrace(tr)
def _run(fname, cases):
    f = globals().get(fname)
    if f is None:
        return json.dumps({"missing": True})
    res = []
    for c in cases:
        try:
            _guard()
            r = f(*c)
            sys.settrace(None)
            if isinstance(r, tuple): r = list(r)
            res.append([r, None])
        except BaseException as e:
            sys.settrace(None)
            res.append([None, type(e).__name__ + ": " + str(e)])
    return json.dumps(res)
`;
  const same = (a, b, tol) => {
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i], tol));
    if (a && b && typeof a === 'object' && typeof b === 'object') { const ka = Object.keys(a).sort(), kb = Object.keys(b).sort(); return same(ka, kb, tol) && ka.every(k => same(a[k], b[k], tol)); }
    return a === b;
  };
  const fmtv = x => JSON.stringify(x, (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v));
  SL.AILab = function (root) {
    const L = SL.AILABS[root.dataset.lab];
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    shell.onRun = async () => {
      shell.clearOut();
      const cs = L.cases(), code = shell.cm.getValue(), tol = L.tol || 1e-6;
      let res;
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_AI); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_cases', py.toPy(cs)); py.globals.set('_fname', L.fn);
        let out; try { out = JSON.parse(py.runPython('_run(_fname, _cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        if (out.missing) { shell.setMsg('err', `⚠️ Kodda '${L.fn}' fonksiyonu bulunamadı.`); return; }
        res = out.map(([r, e]) => [r, e && SL.pyErrorText(e)]);
      } else {
        const name = L.jsFn || L.fn;
        let fn;
        try { fn = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + `\n;if (typeof ${name} !== 'function') throw new Error("Kodda '${name}' fonksiyonu bulunamadı."); return ${name};`)(shell.print, SL.makeGuard(300000)); }
        catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
        res = cs.map(c => { try { return [fn(...JSON.parse(JSON.stringify(c))), null]; } catch (e) { return [null, SL.jsErrorText(e)]; } });
      }
      let ok = 0, bad = -1;
      cs.forEach((c, i) => { const want = L.ref(...JSON.parse(JSON.stringify(c))); if (!res[i][1] && same(res[i][0], want, tol)) ok++; else if (bad < 0) bad = i; });
      const k = bad >= 0 ? bad : 0, want = L.ref(...JSON.parse(JSON.stringify(cs[k])));
      view.innerHTML = `<div class="mini">${bad >= 0 ? 'Başarısız test' : 'Örnek test'}: ${L.show ? L.show(...cs[k]) : fmtv(cs[k])}</div><div class="mini">beklenen: <b>${fmtv(want)}</b> · seninki: <b class="${bad >= 0 ? 'c-red' : 'c-green'}">${res[k][1] ? '⚠️ ' + res[k][1] : fmtv(res[k][0])}</b></div>` + (bad >= 0 && L.hint ? `<div class="mini">💡 ${L.hint(...cs[k])}</div>` : '');
      if (bad >= 0) shell.setMsg('err', `❌ ${ok}/${cs.length} test geçti.`); else shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.ailab', SL.AILab);

  /* ---------- nöbetçi arenası (FSM ve davranış ağacı desteleri ortak kullanır) ----------
     decide(öncekiEylem, algı) → yeni eylem adı: DEVRIYE | SUPHE | KOVALA | SALDIR | KAC */
  const GNAMES = (SL.GUARD_NAMES = { DEVRIYE: 'DEVRİYE', SUPHE: 'ŞÜPHE', KOVALA: 'KOVALA', SALDIR: 'SALDIR', KAC: 'KAÇ' });
  const GCOLS = (SL.GUARD_COLS = t => ({ DEVRIYE: t.blue, SUPHE: t.amber, KOVALA: t.red, SALDIR: t.purple, KAC: t.green }));
  const WALLS = [{ x: 300, y: 90, w: 30, h: 150 }, { x: 470, y: 230, w: 150, h: 26 }];
  const PATROL = [V.v(80, 70), V.v(640, 70), V.v(640, 320), V.v(80, 320)];
  const segRect = (a, b, r) => {   // doğru parçası dikdörtgeni kesiyor mu? (slab yöntemi)
    let t0 = 0, t1 = 1; const d = V.sub(b, a);
    for (const [p, dd, lo, hi] of [[a.x, d.x, r.x, r.x + r.w], [a.y, d.y, r.y, r.y + r.h]]) {
      if (Math.abs(dd) < 1e-9) { if (p < lo || p > hi) return false; continue; }
      let ta = (lo - p) / dd, tb = (hi - p) / dd; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false;
    }
    return true;
  };
  const inWall = p => WALLS.some(r => p.x > r.x - 8 && p.x < r.x + r.w + 8 && p.y > r.y - 8 && p.y < r.y + r.h + 8);
  SL.makeGuardArena = function (o = {}) {
    const W = 720, H = 380;   // dünya koordinatları sabit (devriye noktaları buna göre); o.displayW yalnızca ekrandaki genişlik
    let decide = o.decide;
    const st = {};
    const resetState = () => Object.assign(st, { g: V.v(80, 70), heading: 0, state: 'DEVRIYE', tIn: 0, wp: 1, hp: 100, noise: null, heard: false, lastSeen: -99, flash: null, flashT: 0, log: [], switches: [], shotT: 0, muzzle: 0, botT: 0, memory: o.memory !== false });
    resetState();
    const move = (dir, sp, dt) => {
      const try1 = d => { const before = V.copy(st.g), n = V.add(st.g, V.mul(d, sp * dt)); if (!inWall(V.v(n.x, st.g.y))) st.g.x = n.x; if (!inWall(V.v(st.g.x, n.y))) st.g.y = n.y; st.g.x = SL.clamp(st.g.x, 15, W - 15); st.g.y = SL.clamp(st.g.y, 15, H - 15); return V.dist(before, st.g); };
      if (try1(dir) < sp * dt * 0.2) { if (try1(V.perp(dir)) < sp * dt * 0.2) try1(V.mul(V.perp(dir), -1)); }   // sıkıştıysa yana kay
    };
    const turnTo = (a, dt, sp = 4) => { st.heading += SL.clamp(SL.angDiff(st.heading, a), -sp * dt, sp * dt); };
    const w = new SL.World({
      W, H,
      reset() { resetState(); },
      onClick(m) { st.noise = V.v(m.x, m.y); st.heard = true; st.noiseT = 0; },
      update(dt, w) {
        st.botT += dt;
        const p = w.mouse.inside ? V.v(w.mouse.x, w.mouse.y) : V.v(500 + Math.cos(st.botT * 0.4) * 160, 170 + Math.sin(st.botT * 0.7) * 50);
        st.player = p;
        // ALGILA
        const to = V.sub(p, st.g), d = V.len(to), fwd = V.fromAngle(st.heading);
        const raw = d < 260 && V.dot(fwd, V.norm(to)) > Math.cos((55 * Math.PI) / 180) && !WALLS.some(r => segRect(st.g, p, r));
        if (raw) st.lastSeen = w.time;
        const sees = raw || (st.memory && w.time - st.lastSeen < 1.2 && d < 340);
        const sense = { seesPlayer: sees, dist: Math.round(d), hp: Math.round(st.hp), heardNoise: st.heard, timeInState: Math.round(st.tIn * 10) / 10 };
        st.sense = sense;
        // DÜŞÜN
        const next = decide(st.state, Object.assign({}, sense));
        if (typeof next !== 'string' || !GNAMES[next]) { w.pause(); if (o.onBad) o.onBad(next); return; }
        if (next !== st.state) {
          st.flash = [st.state, next]; st.flashT = 1;
          st.log.unshift(`${w.time.toFixed(1)} sn: ${GNAMES[st.state]} → ${GNAMES[next]}`); st.log.length = Math.min(st.log.length, 6);
          st.switches.push(w.time);
          if (next === 'SUPHE' && st.state !== 'DEVRIYE') { st.noise = V.copy(p); }   // son görülen yer
          st.state = next; st.tIn = 0; st.heard = false;
        }
        st.tIn += dt; st.flashT -= dt; st.switches = st.switches.filter(x => x > w.time - 5);
        // DAVRAN
        const s = st.state;
        if (s === 'DEVRIYE') { const tg = PATROL[st.wp], dir = V.norm(V.sub(tg, st.g)); turnTo(V.angle(dir), dt); move(dir, 70, dt); if (V.dist(st.g, tg) < 10) st.wp = (st.wp + 1) % PATROL.length; }
        else if (s === 'SUPHE') { const tg = st.noise || st.g; if (V.dist(st.g, tg) > 12) { const dir = V.norm(V.sub(tg, st.g)); turnTo(V.angle(dir), dt); move(dir, 95, dt); } else st.heading += dt * 2.2; }
        else if (s === 'KOVALA') { const dir = V.norm(to); turnTo(V.angle(dir), dt, 6); move(dir, 125, dt); }
        else if (s === 'SALDIR') { turnTo(V.angle(to), dt, 8); st.shotT -= dt; if (st.shotT <= 0) { st.shotT = 0.6; st.muzzle = 0.1; } }
        else if (s === 'KAC') { const dir = V.norm(V.mul(to, -1)); turnTo(V.angle(dir), dt, 6); move(dir, 115, dt); st.hp = Math.min(100, st.hp + 9 * dt); }
        st.muzzle -= dt;
      },
      render(ctx, w, t) {
        const col = GCOLS(t)[st.state];
        WALLS.forEach(r => { ctx.fillStyle = t.dark ? '#3a3f55' : '#4a4f63'; ctx.fillRect(r.x, r.y, r.w, r.h); });
        ctx.save(); ctx.strokeStyle = t.rule; ctx.setLineDash([4, 6]); ctx.beginPath(); PATROL.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke(); ctx.restore();
        SL.drawCone(ctx, st.g, st.heading, (110 * Math.PI) / 180, 260, st.sense && st.sense.seesPlayer ? t.red : t.amber, 0.12);
        if (st.noise && (st.state === 'SUPHE' || st.heard)) { ctx.strokeStyle = t.amber; ctx.lineWidth = 2; [10, 18].forEach(r => { ctx.beginPath(); ctx.arc(st.noise.x, st.noise.y, r, 0, 7); ctx.stroke(); }); }
        const p = st.player || V.v(0, 0);
        if (st.muzzle > 0) { ctx.strokeStyle = t.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(st.g.x, st.g.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 7); ctx.fill();
        SL.drawLabel(ctx, w.mouse.inside ? 'oyuncu (sen)' : 'oyuncu (bot)', p.x, p.y + 20, t.green, { size: 11 });
        SL.drawAgent(ctx, st.g, st.heading, col, 14);
        SL.drawLabel(ctx, GNAMES[st.state], st.g.x, st.g.y - 26, col);
        ctx.fillStyle = t.rule; ctx.fillRect(st.g.x - 20, st.g.y + 18, 40, 5); ctx.fillStyle = st.hp < 30 ? t.red : t.green; ctx.fillRect(st.g.x - 20, st.g.y + 18, 40 * st.hp / 100, 5);
        if (o.onDraw) o.onDraw(st);
      }
    });
    if (o.displayW) w.canvas.style.width = o.displayW + 'px';
    return { world: w, st, setDecide: f => { decide = f; }, shoot: () => { st.hp = Math.max(0, st.hp - 25); }, setMemory: m => { st.memory = m; } };
  };

  /* ---------------- demo kaydı: world tabanlı demolar için kısayol ---------------- */
  SL.worldDemo = function (root, world, top, bottom) {
    root.setAttribute('data-prevent-swipe', '');
    if (top) root.append(top);
    root.append(world.canvas, world.controls());
    if (bottom) root.append(bottom);
    world.reset();
    return { start: () => world.start(), stop: () => world.stop() };
  };
})();
