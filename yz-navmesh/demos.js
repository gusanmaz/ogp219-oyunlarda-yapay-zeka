/* "NavMesh" destesine özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();

  /* ================= dikdörtgen çokgenli navmesh =================
     Her çokgen eksenlere hizalı bir dikdörtgen (dışbükey!). Komşu dikdörtgenlerin ortak kenar parçası = portal. */
  const RECTS = [
    [20, 20, 200, 120], [200, 50, 300, 90], [300, 20, 470, 160], [470, 60, 560, 100], [560, 20, 700, 200],
    [340, 160, 400, 250], [20, 120, 80, 300], [80, 250, 340, 300], [340, 250, 520, 360], [520, 290, 610, 330], [610, 200, 700, 360],
    [130, 160, 260, 220]   // ada: başlangıçta bağlantısız (atlama bağlantısı ile bağlanır)
  ].map(([x0, y0, x1, y1], id) => ({ id, x0, y0, x1, y1, c: V.v((x0 + x1) / 2, (y0 + y1) / 2) }));
  const portalsOf = (rects, closed) => {
    const P = [];
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      let seg = null;
      if (a.x1 === b.x0 || b.x1 === a.x0) { const x = a.x1 === b.x0 ? a.x1 : a.x0, y0 = Math.max(a.y0, b.y0), y1 = Math.min(a.y1, b.y1); if (y1 - y0 > 1) seg = [V.v(x, y0), V.v(x, y1)]; }
      if (a.y1 === b.y0 || b.y1 === a.y0) { const y = a.y1 === b.y0 ? a.y1 : a.y0, x0 = Math.max(a.x0, b.x0), x1 = Math.min(a.x1, b.x1); if (x1 - x0 > 1) seg = [V.v(x0, y), V.v(x1, y)]; }
      if (seg && !(closed && closed(i, j))) P.push({ a: i, b: j, seg });
    }
    return P;
  };
  const inRect = (r, p) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
  const tri2 = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);   // işaretli alan × 2
  // Simple Stupid Funnel (Mononen 2010): portallar [sol, sağ] sırasıyla
  function funnel(start, end, portals, trace) {
    const pts = [start], L = portals.map(p => p[0]).concat([end]), Rr = portals.map(p => p[1]).concat([end]);
    let apex = start, left = L[0], right = Rr[0], ai = 0, li = 0, ri = 0;
    for (let i = 1; i <= L.length; i++) {
      if (i === L.length) break;
      const nl = L[i], nr = Rr[i];
      // sağ kenarı daraltmayı dene
      if (tri2(apex, right, nr) <= 0) {
        if (V.dist(apex, right) < 1e-9 || tri2(apex, left, nr) > 0) { right = nr; ri = i; if (trace) trace.push({ apex, left, right, note: 'sağ kenar daraldı' }); }
        else { pts.push(left); apex = left; ai = li; left = apex; right = apex; li = ai; ri = ai; i = ai; if (trace) trace.push({ apex, left, right, note: 'sağ kenar sol kenarın üstünden geçti → sol köşe yeni tepe noktası' }); continue; }
      }
      // sol kenarı daraltmayı dene
      if (tri2(apex, left, nl) >= 0) {
        if (V.dist(apex, left) < 1e-9 || tri2(apex, right, nl) < 0) { left = nl; li = i; if (trace) trace.push({ apex, left, right, note: 'sol kenar daraldı' }); }
        else { pts.push(right); apex = right; ai = ri; left = apex; right = apex; li = ai; ri = ai; i = ai; if (trace) trace.push({ apex, left, right, note: 'sol kenar sağ kenarın üstünden geçti → sağ köşe yeni tepe noktası' }); continue; }
      }
    }
    if (V.dist(pts[pts.length - 1], end) > 1e-9) pts.push(end);
    return pts;
  }
  SL.funnel = funnel;
  // çokgen grafında A* (düğüm = dikdörtgen, maliyet = portal orta noktaları arası mesafe)
  function polyPath(rects, portals, sa, sb, start, end, links) {
    const adj = rects.map(() => []);
    portals.forEach(p => { const m = V.lerp(p.seg[0], p.seg[1], 0.5); adj[p.a].push({ to: p.b, p, m }); adj[p.b].push({ to: p.a, p, m }); });
    (links || []).forEach(l => { adj[l.a].push({ to: l.b, link: l, m: l.from }); });
    const g = rects.map(() => Infinity), from = rects.map(() => null), pos = rects.map(() => null), closed = new Set();
    g[sa] = 0; pos[sa] = start; const open = [sa]; let expanded = 0;
    while (open.length) {
      open.sort((x, y) => g[x] + V.dist(pos[x], end) - (g[y] + V.dist(pos[y], end)));
      const cur = open.shift(); if (closed.has(cur)) continue; closed.add(cur); expanded++;
      if (cur === sb) break;
      for (const e of adj[cur]) {
        const entry = e.link ? e.link.to : e.m, ng = g[cur] + V.dist(pos[cur], e.m) + (e.link ? e.link.cost : V.dist(e.m, entry));
        if (ng < g[e.to]) { g[e.to] = ng; from[e.to] = { prev: cur, e }; pos[e.to] = entry; open.push(e.to); }
      }
    }
    if (!isFinite(g[sb])) return null;
    const chain = []; for (let x = sb; from[x]; x = from[x].prev) chain.unshift({ poly: x, via: from[x].e, prev: from[x].prev });
    return { chain, polys: [sa].concat(chain.map(c => c.poly)), expanded };
  }
  // portalı, yürüyüş yönüne göre [sol, sağ] sırasına koy
  const orientPortal = (seg, fromC, toC) => {   // y aşağı ekran koordinatı: yürüyüş yönünün solu, d × (p − m) < 0 olan uç
    const d = V.sub(toC, fromC), m = V.lerp(seg[0], seg[1], 0.5), s0 = V.sub(seg[0], m);
    return d.x * s0.y - d.y * s0.x < 0 ? [seg[0], seg[1]] : [seg[1], seg[0]];
  };

  /* ---------- ana demo: tıkla, git ---------- */
  D.navmesh = function (root) {
    const W = 720, H = 380;
    const cfg = { showPolys: true, door: true, link: false, mode: 'funnel', way: false };
    let agent, goal, route = [], corridor = [], wp = 0, info = '', vel = V.v();
    const LINK = { a: 0, b: 11, from: V.v(170, 120), to: V.v(170, 162), cost: 60 };   // kenardan adaya atla
    const LINK2 = { a: 11, b: 7, from: V.v(200, 218), to: V.v(200, 262), cost: 60 };
    const portals = () => portalsOf(RECTS, (i, j) => !cfg.door && ((i === 2 && j === 5) || (i === 5 && j === 2)));
    const locate = p => RECTS.findIndex(r => inRect(r, p));
    const plan = () => {
      const sa = locate(agent), sb = locate(goal);
      if (sa < 0 || sb < 0) { route = []; info = 'Hedef yürünebilir alanın dışında.'; return; }
      const links = cfg.link ? [LINK, LINK2] : [];
      const r = polyPath(RECTS, portals(), sa, sb, agent, goal, links);
      if (!r) { route = []; corridor = []; info = '❌ Yol yok (ada bağlantısız: “atlama bağlantısı”nı açın).'; return; }
      corridor = r.polys;
      // portalları sırayla çıkar; atlama bağlantılarında yolu böl
      const segs = []; let cur = [], startP = agent;
      r.chain.forEach(c => {
        if (c.via.link) { segs.push({ start: startP, portals: cur, end: c.via.link.from }); segs.push({ jump: [c.via.link.from, c.via.link.to] }); startP = c.via.link.to; cur = []; }
        else cur.push(orientPortal(c.via.p.seg, RECTS[c.prev].c, RECTS[c.poly].c));
      });
      segs.push({ start: startP, portals: cur, end: goal });
      route = [];
      segs.forEach(s => {
        if (s.jump) { route.push(s.jump[1]); return; }
        const pts = cfg.mode === 'funnel' ? funnel(s.start, s.end, s.portals) : [s.start].concat(s.portals.map(p => V.lerp(p[0], p[1], 0.5))).concat([s.end]);
        if (!route.length) route.push(...pts); else route.push(...pts.slice(1));
      });
      let len = 0; for (let k = 1; k < route.length; k++) len += V.dist(route[k - 1], route[k]);
      wp = 1; info = `çokgen koridoru: ${corridor.length} çokgen · A* ${r.expanded} düğüm genişletti · yol uzunluğu ${Math.round(len)}`;
    };
    const w = new SL.World({
      W, H,
      reset() { agent = V.v(60, 60); goal = V.v(660, 330); vel = V.v(); plan(); },
      onClick(m) { const p = V.v(m.x, m.y); if (locate(p) >= 0) { goal = p; plan(); } },
      update(dt) {
        if (wp >= route.length) { vel = V.mul(vel, 0.8); return; }
        const tgt = route[wp], d = V.dist(agent, tgt), last = wp === route.length - 1;
        if (d < (last ? 2 : 6)) { wp++; return; }
        const des = V.setLen(V.sub(tgt, agent), last ? Math.min(150, d * 3) : 150);
        vel = V.add(vel, V.limit(V.sub(des, vel), 900 * dt)); agent = V.add(agent, V.mul(vel, dt));
      },
      render(ctx, w, t) {
        ctx.fillStyle = t.dark ? '#2b2f40' : '#3d4255'; ctx.fillRect(0, 0, W, H);
        RECTS.forEach((r, i) => { const inC = corridor.includes(i); ctx.fillStyle = inC ? (t.dark ? '#24405a' : '#cfe3ff') : t.card; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); if (cfg.showPolys) { ctx.strokeStyle = t.dark ? 'rgba(122,200,255,0.5)' : 'rgba(36,89,199,0.45)'; ctx.lineWidth = 1.5; ctx.strokeRect(r.x0 + 0.5, r.y0 + 0.5, r.x1 - r.x0 - 1, r.y1 - r.y0 - 1); } });
        if (cfg.showPolys) portals().forEach(p => { ctx.strokeStyle = t.green; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.seg[0].x, p.seg[0].y); ctx.lineTo(p.seg[1].x, p.seg[1].y); ctx.stroke(); });
        if (!cfg.door) { ctx.fillStyle = t.red; ctx.fillRect(340, 156, 60, 8); SL.drawLabel(ctx, 'kapı kapalı', 370, 148, t.red, { size: 11 }); }
        if (cfg.link) [LINK, LINK2].forEach(l => { ctx.strokeStyle = t.amber; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(l.from.x, l.from.y); ctx.quadraticCurveTo(l.from.x + 30, (l.from.y + l.to.y) / 2, l.to.x, l.to.y); ctx.stroke(); ctx.setLineDash([]); });
        if (cfg.link) SL.drawLabel(ctx, 'atlama bağlantısı', 245, 140, t.amber, { size: 11 });
        SL.drawLabel(ctx, 'ada', 195, 190, t.muted, { size: 11, bg: false });
        if (route.length) { ctx.strokeStyle = cfg.mode === 'funnel' ? t.purple : t.red; ctx.lineWidth = 3; ctx.beginPath(); route.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); route.forEach(p => { ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 7); ctx.fill(); }); }
        ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(goal.x, goal.y, 8, 0, 7); ctx.fill();
        ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(agent.x, agent.y, 10, 0, 7); ctx.fill();
        SL.drawLabel(ctx, info, 360, 372, t.ink, { size: 11 });
      }
    });
    const cb = (lab, key, f) => el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { cfg[key] = e.target.checked; if (f) f(); } }); x.checked = cfg[key]; return x; })(), ' ' + lab);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yol: ', select({ funnel: 'funnel (en kısa, köşeleri teğet)', mid: 'portal orta noktaları (zikzak)' }, cfg.mode, v => { cfg.mode = v; plan(); })),
      cb('çokgenler ve portallar', 'showPolys'), cb('kapı açık', 'door', () => plan()), cb('atlama bağlantısı (adaya)', 'link', () => plan())),
      w.canvas, w.controls(), el('div', { class: 'mini' }, 'Yürünebilir alana tıklayın: hedef. Mavi = A*’ın bulduğu çokgen koridoru, yeşil çizgiler = portallar, mor = funnel yolu.'));
    w.reset();
    return { start: () => w.start(), stop: () => w.stop() };
  };

  /* ---------- funnel adım adım ---------- */
  D.funnel = function (root) {
    const W = 720, H = 300;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), note = el('div', { class: 'sv-note' });
    // zikzaklı bir koridor: portallar [sol, sağ]
    const start = V.v(40, 150), end = V.v(690, 70);
    const P = [[V.v(130, 40), V.v(130, 120)], [V.v(230, 180), V.v(230, 270)], [V.v(330, 130), V.v(330, 230)], [V.v(430, 30), V.v(430, 120)], [V.v(530, 120), V.v(530, 260)], [V.v(620, 40), V.v(620, 140)]];
    const tr = []; const path = funnel(start, end, P, tr);
    const frames = [{ note: 'Başlangıç: tepe noktası (apex) = başlangıç. Huni ilk portalın iki ucuna açılır.', apex: start, left: P[0][0], right: P[0][1], k: 0 }];
    tr.forEach((s, i) => frames.push(Object.assign({ k: i + 1 }, s, { note: '• ' + s.note })));
    frames.push({ note: `Bitti: ${path.length - 2} köşe noktasıyla en kısa yol (mor). Huni her portaldan geçerken daralır; bir kenar diğerinin üstünden geçince köşe yolun parçası olur.`, done: true });
    const draw = f => {
      const t = T(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      P.forEach((p, i) => { ctx.strokeStyle = t.green; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); ctx.stroke(); SL.drawLabel(ctx, 'S', p[0].x, p[0].y - 10, t.blue, { size: 10 }); SL.drawLabel(ctx, 'Ğ', p[1].x, p[1].y + 10, t.red, { size: 10 }); });
      ctx.fillStyle = t.blue; ctx.beginPath(); ctx.arc(start.x, start.y, 7, 0, 7); ctx.fill(); ctx.fillStyle = t.green; ctx.beginPath(); ctx.arc(end.x, end.y, 7, 0, 7); ctx.fill();
      if (f.done) { ctx.strokeStyle = t.purple; ctx.lineWidth = 4; ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); }
      else if (f.apex) {
        ctx.fillStyle = t.dark ? 'rgba(245,165,36,0.18)' : 'rgba(245,165,36,0.22)'; ctx.beginPath(); ctx.moveTo(f.apex.x, f.apex.y); ctx.lineTo(f.left.x, f.left.y); ctx.lineTo(f.right.x, f.right.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = t.blue; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(f.apex.x, f.apex.y); ctx.lineTo(f.left.x, f.left.y); ctx.stroke();
        ctx.strokeStyle = t.red; ctx.beginPath(); ctx.moveTo(f.apex.x, f.apex.y); ctx.lineTo(f.right.x, f.right.y); ctx.stroke();
        ctx.fillStyle = t.amber; ctx.beginPath(); ctx.arc(f.apex.x, f.apex.y, 8, 0, 7); ctx.fill(); SL.drawLabel(ctx, 'tepe', f.apex.x, f.apex.y + 18, t.amber, { size: 11 });
      }
      note.textContent = f.note;
    };
    const fp = new SL.FramePlayer(draw, { speed: 1.5 });
    root.append(C, SL.transport(fp, { min: 0.5, max: 8 }), note, el('div', { class: 'mini' }, 'S = portalın sol ucu, Ğ = sağ ucu (yürüyüş yönüne göre). Mavi: huninin sol kenarı, kırmızı: sağ kenarı.'));
    fp.load(frames); SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  /* ---------- navmesh üretimi (Recast fikri, 2B): rasterleştir → aşındır → böl ---------- */
  D.navbuild = function (root) {
    const GW = 72, GH = 36, cs = 10, W = GW * cs, H = GH * cs;
    const C = el('canvas', { class: 'world-canvas' }), ctx = SL.setupCanvas(C, W, H), note = el('div', { class: 'sv-note' });
    const OB = [{ t: 'r', x: 150, y: 60, w: 120, h: 50 }, { t: 'c', x: 420, y: 200, r: 55 }, { t: 'r', x: 560, y: 40, w: 30, h: 210 }, { t: 'r', x: 60, y: 230, w: 220, h: 30 }, { t: 'c', x: 330, y: 80, r: 25 }];
    let radius = 2, step = 3;
    const blocked = (x, y) => x < 0 || y < 0 || x >= W || y >= H || OB.some(o => (o.t === 'r' ? x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h : Math.hypot(x - o.x, y - o.y) <= o.r));
    const compute = () => {
      const walk = new Uint8Array(GW * GH);
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) walk[j * GW + i] = blocked((i + 0.5) * cs, (j + 0.5) * cs) ? 0 : 1;
      // aşındırma: engele (ya da kenara) r hücreden yakın hücreleri çıkar (Chebyshev mesafe dönüşümü)
      const dist = new Float32Array(GW * GH).fill(1e9);
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) if (!walk[j * GW + i] || i === 0 || j === 0 || i === GW - 1 || j === GH - 1) dist[j * GW + i] = walk[j * GW + i] ? 1 : 0;
      for (let pass = 0; pass < 2; pass++) for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const jj = pass ? GH - 1 - j : j, ii = pass ? GW - 1 - i : i, k = jj * GW + ii; for (const [dx, dy] of [[-1, 0], [0, -1], [-1, -1], [1, -1]]) { const x = ii + (pass ? -dx : dx), y = jj + (pass ? -dy : dy); if (x < 0 || y < 0 || x >= GW || y >= GH) continue; dist[k] = Math.min(dist[k], dist[y * GW + x] + 1); } }
      const er = new Uint8Array(GW * GH); for (let k = 0; k < GW * GH; k++) er[k] = walk[k] && dist[k] > radius ? 1 : 0;
      // bölme: açgözlü en büyük dikdörtgenler (dışbükey çokgenler)
      const used = new Uint8Array(GW * GH), rects = [];
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const k = j * GW + i; if (!er[k] || used[k]) continue;
        let w2 = 0; while (i + w2 < GW && er[j * GW + i + w2] && !used[j * GW + i + w2]) w2++;
        let h2 = 1; outer: for (; j + h2 < GH; h2++) { for (let x = 0; x < w2; x++) { const q = (j + h2) * GW + i + x; if (!er[q] || used[q]) break outer; } }
        for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) used[(j + y) * GW + i + x] = 1;
        rects.push([i, j, w2, h2]);
      }
      return { walk, er, rects };
    };
    const NOTES = ['1) Geometri: seviyedeki engeller (duvarlar, kutular, sütunlar).', '2) Rasterleştirme (voxel): dünya küçük hücrelere bölünür; engel olmayan hücreler “yürünebilir” (yeşil). 3B’de ayrıca eğim ve tavan yüksekliği kontrol edilir.', '3) Aşındırma: ajan yarıçapı kadar engellerden uzaklaş. Kalan alan, ajanın <b>merkezinin</b> gidebileceği yerler. Yarıçapı değiştirin: dar geçitler kapanıyor mu?', '4) Bölgeler → çokgenler: kalan alan dışbükey parçalara (burada dikdörtgenlere) bölünür. Her parça navmesh’in bir düğümü.'];
    const draw = () => {
      const t = T(), r = compute(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H);
      if (step >= 1) for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const k = j * GW + i; if (!r.walk[k]) continue; if (step >= 2 && !r.er[k]) { ctx.fillStyle = t.dark ? 'rgba(255,180,80,0.25)' : 'rgba(245,165,36,0.35)'; } else ctx.fillStyle = t.dark ? 'rgba(80,200,120,0.35)' : 'rgba(46,194,126,0.35)'; ctx.fillRect(i * cs + 0.5, j * cs + 0.5, cs - 1, cs - 1); }
      if (step >= 3) r.rects.forEach(([i, j, w2, h2], q) => { ctx.fillStyle = `hsla(${(q * 67) % 360}, 65%, ${t.dark ? 45 : 70}%, 0.75)`; ctx.fillRect(i * cs, j * cs, w2 * cs, h2 * cs); ctx.strokeStyle = t.ink; ctx.lineWidth = 1; ctx.strokeRect(i * cs + 0.5, j * cs + 0.5, w2 * cs - 1, h2 * cs - 1); });
      ctx.fillStyle = t.dark ? '#5a6078' : '#3d4255';
      OB.forEach(o => { ctx.beginPath(); if (o.t === 'r') ctx.rect(o.x, o.y, o.w, o.h); else ctx.arc(o.x, o.y, o.r, 0, 7); ctx.fill(); });
      note.innerHTML = NOTES[step] + (step >= 3 ? ` <b>${r.rects.length}</b> çokgen.` : '');
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, ...[0, 1, 2, 3].map(s => btn(['1 geometri', '2 rasterleştir', '3 aşındır', '4 çokgenler'][s], () => { step = s; draw(); }, s === 3 ? 'primary' : '')), slider('ajan yarıçapı (hücre)', 0, 6, radius, 1, v => { radius = v; draw(); })), C, note);
    draw(); SL.onTheme(draw);
  };

  /* ---------- simlab: nokta hangi çokgende? ---------- */
  SL.SIMLABS.pip = function (box, api) {
    const W = 560, H = 300;
    const POLYS = [[[40, 40], [200, 30], [230, 140], [60, 160]], [[230, 140], [200, 30], [380, 60], [360, 170]], [[60, 160], [230, 140], [250, 270], [80, 260]], [[230, 140], [360, 170], [420, 270], [250, 270]], [[380, 60], [520, 50], [530, 200], [360, 170]], [[360, 170], [530, 200], [500, 280], [420, 270]]];
    let fn = null, hit = -1, mouse = null, err = '';
    const w = new SL.World({
      W, H, autoplay: true,
      update(dt, w) { mouse = w.mouse.inside ? [w.mouse.x, w.mouse.y] : null; hit = -1; if (!fn || !mouse) return; try { for (let i = 0; i < POLYS.length; i++) if (fn(POLYS[i], mouse) === true) { hit = i; break; } } catch (e) { w.pause(); api.setMsg('err', '⚠️ pointInConvex hata verdi: ' + SL.jsErrorText(e)); } },
      render(ctx, w, t) {
        POLYS.forEach((p, i) => { ctx.fillStyle = i === hit ? (t.dark ? '#2c5a3a' : '#bff0cf') : t.card; ctx.strokeStyle = t.blue; ctx.lineWidth = 2; ctx.beginPath(); p.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.stroke(); const c = p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]); SL.drawLabel(ctx, 'P' + i, c[0], c[1], t.muted, { size: 11 }); });
        if (mouse) { ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(mouse[0], mouse[1], 5, 0, 7); ctx.fill(); }
        SL.drawLabel(ctx, hit >= 0 ? `fare P${hit} çokgeninde` : 'fareyi çokgenlerin üstünde gezdirin', 280, 14, t.ink, { size: 12 });
      }
    });
    box.append(w.canvas, w.controls({ speed: false }));
    w.reset();
    const ref = (poly, p) => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if (Math.abs(c) < 1e-9) continue; const sg = Math.sign(c); if (s && sg !== s) return false; s = sg; } return true; };
    return {
      world: w,
      setFns(f) { fn = f.pointInConvex; w.playing = true; w.syncBtn && w.syncBtn(); },
      check(mod) {
        const sq = [[0, 0], [10, 0], [10, 10], [0, 10]], sqCW = sq.slice().reverse();
        const cs = [[sq, [5, 5]], [sq, [15, 5]], [sq, [-1, 5]], [sqCW, [5, 5]], [sqCW, [5, 11]], [[[0, 0], [10, 0], [5, 8]], [5, 3]], [[[0, 0], [10, 0], [5, 8]], [9, 7]], [POLYS[3], [300, 200]], [POLYS[3], [100, 100]]];
        for (const [poly, p] of cs) { let r; try { r = mod.pointInConvex(poly, p); } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; } if (r !== ref(poly, p)) return { ok: false, msg: `❌ pointInConvex(${JSON.stringify(poly)}, ${JSON.stringify(p)}) → ${ref(poly, p)} olmalı. Seninki: ${JSON.stringify(r)}. (Saat yönü ya da tersi sıralanmış olabilir: işaretlerin <b>aynı</b> olması yeter.)` }; }
        return { ok: true, msg: '✅ 9/9 test geçti. Fareyi gezdirin: bulunduğunuz çokgen yeşil yanmalı. Gerçek navmesh’lerde ajanın hangi çokgende olduğu tam böyle bulunur (hızlandırmak için bir uzamsal ızgara ile).' };
      }
    };
  };

  /* ---------- ailab: üçgen alanı işareti ve funnel testi ---------- */
  SL.AILABS.tri2 = {
    fn: 'side', jsFn: 'side',
    ref: (a, b, c) => { const v = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]); return v > 0 ? 1 : v < 0 ? -1 : 0; },
    cases: () => { const cs = [[[0, 0], [10, 0], [5, 5]], [[0, 0], [10, 0], [5, -5]], [[0, 0], [10, 0], [20, 0]], [[3, 3], [3, 3], [1, 2]], [[0, 0], [0, 10], [5, 5]]]; for (let i = 0; i < 12; i++) cs.push([0, 1, 2].map(() => [Math.round(SL.rand(-20, 20)), Math.round(SL.rand(-20, 20))])); return cs; },
    show: (a, b, c) => `a = ${JSON.stringify(a)}, b = ${JSON.stringify(b)}, c = ${JSON.stringify(c)}`,
    hint: () => '(b − a) × (c − a) = (bx − ax)(cy − ay) − (cx − ax)(by − ay). Pozitifse 1, negatifse −1, sıfırsa 0.'
  };
  SL.AILABS.polyarea = {
    fn: 'area', jsFn: 'area', tol: 1e-9,
    ref: poly => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; },
    cases: () => { const cs = [[[[0, 0], [4, 0], [4, 3], [0, 3]]], [[[0, 0], [4, 0], [0, 3]]], [[[0, 3], [4, 3], [4, 0], [0, 0]]], [[[1, 1], [5, 1], [6, 4], [3, 6], [0, 4]]]]; for (let i = 0; i < 8; i++) { const n = 3 + Math.floor(Math.random() * 5), cx = SL.rand(-10, 10), cy = SL.rand(-10, 10); cs.push([Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2, r = SL.rand(3, 9); return [Math.round((cx + Math.cos(a) * r) * 10) / 10, Math.round((cy + Math.sin(a) * r) * 10) / 10]; })]); } return cs; },
    show: p => `çokgen ${JSON.stringify(p)}`,
    hint: () => 'Ayakkabı bağı (shoelace) formülü: Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ) / 2, mutlak değer. Son köşeden ilk köşeye de dönmeyi unutmayın.'
  };

  /* ---------- başlık ---------- */
  D.titlenav = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    // rastgele üçgenleme benzeri bir ağ
    const pts = []; for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) pts.push(V.v(640 + i * 72 + (j % 2) * 36 + SL.rand(-10, 10), 25 + j * 60 + SL.rand(-8, 8)));
    const tris = []; for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) { const a = j * 1 + i * 4, b = a + 4, c2 = a + 1, d = b + 1; tris.push([a, b, c2], [b, d, c2]); }
    let t = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const k = Math.floor(t / 6) % (tris.length + 10);
      tris.forEach((tr, i) => { const on = i <= k && (i % 3 === 1 || i % 5 === 0); ctx.fillStyle = on ? 'rgba(122,200,255,0.30)' : 'rgba(170,170,230,0.06)'; ctx.strokeStyle = 'rgba(170,200,255,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); tr.forEach((q, j) => (j ? ctx.lineTo(pts[q].x, pts[q].y) : ctx.moveTo(pts[q].x, pts[q].y))); ctx.closePath(); ctx.fill(); ctx.stroke(); });
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 3; ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(660, 180); ctx.lineTo(820, 120); ctx.lineTo(1000, 140); ctx.lineTo(1230, 50); ctx.stroke(); ctx.shadowBlur = 0;
    };
    const tick = () => { if (!running) return; t++; draw(); timer = setTimeout(tick, 40); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
