/* "Üçgenleme ve Voronoi" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, select } = SL;
  const D = window.DEMOS;
  const T = () => SL.theme();
  const W = 720, H = 400;

  /* ---------------- ortak geometri ---------------- */
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  // çevrel çember: üç noktadan geçen çemberin merkezi ve yarıçapının karesi
  function circum(a, b, c) {
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    if (Math.abs(d) < 1e-9) return { x: 0, y: 0, r2: Infinity };
    const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
    const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
    const y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
    return { x, y, r2: (a.x - x) ** 2 + (a.y - y) ** 2 };
  }
  // Bowyer–Watson: her ekleme için {nokta, kötü üçgenler, oyuk kenarları, yeni üçgenler} kaydı tutar
  function bowyerWatson(pts) {
    const M = 1e5, sup = [{ x: -M, y: -M }, { x: M * 2, y: -M }, { x: -M, y: M * 2 }];
    const P = sup.concat(pts);
    const mk = (i, j, k) => { const c = circum(P[i], P[j], P[k]); return { v: [i, j, k], c }; };
    let tris = [mk(0, 1, 2)]; const steps = [];
    for (let n = 3; n < P.length; n++) {
      const p = P[n];
      const bad = tris.filter(t => (p.x - t.c.x) ** 2 + (p.y - t.c.y) ** 2 < t.c.r2 - 1e-7);
      const edges = [];
      bad.forEach(t => { for (let e = 0; e < 3; e++) { const a = t.v[e], b = t.v[(e + 1) % 3]; const i = edges.findIndex(q => (q[0] === b && q[1] === a) || (q[0] === a && q[1] === b)); if (i >= 0) edges.splice(i, 1); else edges.push([a, b]); } });
      tris = tris.filter(t => !bad.includes(t));
      const fresh = edges.map(([a, b]) => mk(a, b, n));
      tris = tris.concat(fresh);
      steps.push({ n: n - 3, bad: bad.map(t => t.v.map(i => i - 3)), hole: edges.map(e => e.map(i => i - 3)), fresh: fresh.map(t => t.v.map(i => i - 3)), tris: tris.map(t => t.v.map(i => i - 3)) });
    }
    const final = tris.filter(t => t.v.every(i => i >= 3)).map(t => t.v.map(i => i - 3));
    return { tris: final, steps };
  }
  const edgesOf = tris => { const s = new Map(); tris.forEach(t => { for (let e = 0; e < 3; e++) { const a = Math.min(t[e], t[(e + 1) % 3]), b = Math.max(t[e], t[(e + 1) % 3]); s.set(a + ',' + b, [a, b]); } }); return [...s.values()]; };
  function kruskal(n, edges, pts) {
    const par = [...Array(n).keys()], f = x => (par[x] === x ? x : (par[x] = f(par[x])));
    const w = ([a, b]) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
    const sorted = edges.slice().sort((p, q) => w(p) - w(q)), out = [];
    sorted.forEach(e => { const a = f(e[0]), b = f(e[1]); if (a !== b) { par[a] = b; out.push(e); } });
    return out;
  }
  const minAngle = (a, b, c) => { const ang = (p, q, r) => { const v1 = [q.x - p.x, q.y - p.y], v2 = [r.x - p.x, r.y - p.y]; return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2))))) * 180 / Math.PI; }; return Math.min(ang(a, b, c), ang(b, c, a), ang(c, a, b)); };
  // tekrarlanabilir rastgele
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const PAL = ['#4f8cff', '#ff5c7a', '#2fbf71', '#f5a524', '#a970ff', '#14b8a6', '#ec4899', '#84cc16', '#f97316', '#06b6d4', '#8b5cf6', '#ef4444', '#22c55e', '#eab308', '#3b82f6', '#d946ef'];
  SL.GEO10 = { circum, bowyerWatson, kruskal, edgesOf };

  /* ---------------- tuval + günlük iskeleti ---------------- */
  function scaffold(root, cls = '') {
    const cv = el('canvas'), ctx = SL.setupCanvas(cv, W, H); cv.style.maxWidth = '100%'; cv.style.height = 'auto';
    const log = el('div', { class: 'btd-log' }), story = el('div', { class: 'btd-story' }), moral = el('div', { class: 'btd-moral' }), ctrl = el('div', { class: 'sv-controls' });
    root.setAttribute('data-prevent-swipe', '');
    root.append(ctrl, story, el('div', { class: 'btd-wrap ' + cls }, cv, el('div', {}, log, moral)));
    const mpos = e => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width * W, y: (e.clientY - b.top) / b.height * H }; };
    return { cv, ctx, log, story, moral, ctrl, mpos };
  }
  const bg = (ctx, t) => { ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.card; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1); };
  const label = (ctx, s, x, y, col, size = 14, bold = true) => { ctx.font = `${bold ? 700 : 500} ${size}px "Source Sans 3", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = T().card; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); };
  const tri = (ctx, a, b, c) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath(); };

  /* ================= 1) kulak kesme ================= */
  const SHAPES = {     // bas: taramanın başladığı köşe (0’dan); reddedilen köşeler de görünsün diye iç köşeden başlıyor
    oda: { ad: 'L biçimli oda', bas: 2, p: [[80, 60], [420, 60], [420, 200], [640, 200], [640, 340], [80, 340]] },
    u: { ad: 'U biçimli oda', bas: 2, p: [[80, 60], [260, 60], [260, 250], [460, 250], [460, 60], [640, 60], [640, 340], [80, 340]] },
    yildiz: { ad: 'yıldız', bas: 1, p: Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 70 : 170; return [360 + r * Math.cos(a), 205 + r * Math.sin(a)]; }) }
  };
  D.ear = function (root) {
    const S = scaffold(root);
    let shape = 'oda', poly, idx, out, lines, cand, done;
    const reset = () => { scan = SHAPES[shape].bas; poly = SHAPES[shape].p.map(([x, y]) => ({ x, y })); idx = poly.map((_, i) => i); out = []; lines = []; cand = null; done = false; S.story.innerHTML = `📖 ${SHAPES[shape].ad}: ${poly.length} köşe. Kulak = komşularıyla birlikte, çokgenin <b>içinde kalan</b> ve içinde başka köşe bulunmayan bir üçgen. Onu kes, çokgen bir köşe küçülsün; tekrarla.`; draw(); };
    const isEar = k => {
      const n = idx.length, i0 = idx[(k + n - 1) % n], i1 = idx[k], i2 = idx[(k + 1) % n];
      const a = poly[i0], b = poly[i1], c = poly[i2];
      if (cross(a, b, c) <= 0) return { ok: false, why: 'içbükey köşe (iç açı 180°’den büyük)', v: [i0, i1, i2] };
      const inside = idx.find(j => j !== i0 && j !== i1 && j !== i2 && cross(a, b, poly[j]) >= 0 && cross(b, c, poly[j]) >= 0 && cross(c, a, poly[j]) >= 0);
      if (inside !== undefined) return { ok: false, why: `içinde başka köşe var (${inside + 1})`, v: [i0, i1, i2] };
      return { ok: true, why: 'dışbükey ve içi boş', v: [i0, i1, i2] };
    };
    let scan = 0;
    const step = () => {
      if (done) return;
      if (idx.length === 3) { out.push(idx.slice()); lines.push(`<div class="l-ok"><span>✓</span>son üç köşe (${idx.map(i => i + 1).join('-')}) son üçgen. <b>Bitti: ${out.length} üçgen</b> = köşe sayısı − 2.</div>`); idx = []; cand = null; done = true; draw(); return; }
      const n = idx.length; const r = isEar(scan % n); cand = r;
      if (r.ok) { out.push(r.v); lines.push(`<div class="l-ok"><span>✓</span>köşe ${r.v[1] + 1}: ${r.why} → <b>kulak, kes</b></div>`); idx.splice(scan % n, 1); scan = scan % Math.max(1, idx.length); if (SL.sfx) { try { SL.sfx('tak'); } catch (e) {} } }
      else { lines.push(`<div class="l-no"><span>✗</span>köşe ${r.v[1] + 1}: ${r.why}</div>`); scan = (scan + 1) % n; }
      draw();
    };
    const draw = () => {
      const t = T(), ctx = S.ctx; bg(ctx, t);
      const P = SHAPES[shape].p.map(([x, y]) => ({ x, y }));
      out.forEach((v, k) => { tri(ctx, P[v[0]], P[v[1]], P[v[2]]); ctx.fillStyle = PAL[k % PAL.length] + '55'; ctx.fill(); ctx.strokeStyle = t['ink-2']; ctx.lineWidth = 1.5; ctx.stroke(); });
      ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.strokeStyle = t.ink; ctx.lineWidth = 3; ctx.stroke();
      if (idx.length) { ctx.beginPath(); idx.forEach((i, k) => (k ? ctx.lineTo(P[i].x, P[i].y) : ctx.moveTo(P[i].x, P[i].y))); ctx.closePath(); ctx.setLineDash([7, 6]); ctx.strokeStyle = t.blue; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }
      if (cand && !done) { const [a, b, c] = cand.v.map(i => P[i]); tri(ctx, a, b, c); ctx.fillStyle = cand.ok ? t.green + '66' : t.red + '44'; ctx.fill(); ctx.strokeStyle = cand.ok ? t.green : t.red; ctx.lineWidth = 3; ctx.stroke(); }
      P.forEach((p, i) => { const alive = idx.includes(i); ctx.fillStyle = alive ? t.ink : t.muted; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fill(); label(ctx, String(i + 1), p.x + (p.x < 360 ? -14 : 14), p.y - 12, alive ? t.ink : t.muted, 13); });
      S.log.innerHTML = lines.slice(-9).join('') || '<div class="hint"><span>·</span>“▶ Sonraki köşe” her basışta bir köşeyi sınar. Basmadan tahmin edin: kulak mı?</div>';
      S.moral.innerHTML = done ? `💡 ${P.length} köşeli çokgen → ${out.length} üçgen. İçbükey köşeler (iç açısı 180°’den büyük) asla kulak olamaz; ama hep en az iki kulak vardır, bu yüzden yöntem takılmaz.` : '';
    };
    S.ctrl.append(el('label', { class: 'ctl' }, 'Çokgen: ', select(Object.fromEntries(Object.entries(SHAPES).map(([k, v]) => [k, v.ad])), shape, v => { shape = v; reset(); })),
      (() => { const b = btn('▶ Sonraki köşe', step); b.classList.add('primary'); return b; })(), btn('⏩ Sonuna kadar', () => { for (let k = 0; k < 200 && !done; k++) step(); }), btn('↺ Baştan', reset));
    reset(); SL.onTheme(draw);
  };

  /* ================= 2) Delaunay: Bowyer–Watson adım adım ================= */
  const DPTS = [[150, 110], [330, 70], [520, 120], [610, 260], [430, 230], [250, 250], [120, 300], [360, 340], [560, 360]];
  D.delaunay = function (root) {
    const S = scaffold(root);
    let pts, k, ph, res, circles = true;            // k: eklenen nokta sayısı; ph 1 = bozulanlar, ph 2 = yeni üçgenler
    const n = () => pts.length, real = v => v.every(i => i >= 0);
    const reset = (list, kk = 0, pp = 1) => { pts = (list || DPTS).map(([x, y]) => ({ x, y })); res = bowyerWatson(pts); k = kk; ph = pp; S.story.innerHTML = '📖 Noktaları teker teker ekliyoruz. Yeni nokta, <b>çevrel çemberinin içine düştüğü</b> bütün üçgenleri bozar (kırmızı); açılan oyuk, yeni noktaya bağlanarak yeniden üçgenlenir (yeşil). Alana tıklayarak kendi noktanızı ekleyin.'; draw(); };
    const next = () => { if (k === 0) { k = 1; ph = 1; } else if (ph === 1) ph = 2; else if (k < n()) { k++; ph = 1; } draw(); };
    const draw = () => {
      const t = T(), ctx = S.ctx; bg(ctx, t);
      const st = k ? res.steps[k - 1] : null, done = k === n() && ph === 2;
      const base = !st ? [] : ph === 1 ? (k >= 2 ? res.steps[k - 2].tris : []) : st.tris;
      base.filter(real).forEach(v => { tri(ctx, pts[v[0]], pts[v[1]], pts[v[2]]); ctx.strokeStyle = t['ink-2']; ctx.lineWidth = 1.6; ctx.stroke(); });
      if (st && ph === 1) st.bad.filter(real).forEach(v => { const [a, b, c] = v.map(i => pts[i]); tri(ctx, a, b, c); ctx.fillStyle = t.red + '33'; ctx.fill(); ctx.strokeStyle = t.red; ctx.lineWidth = 2.5; ctx.stroke(); if (circles) { const cc = circum(a, b, c); ctx.beginPath(); ctx.arc(cc.x, cc.y, Math.sqrt(cc.r2), 0, 7); ctx.setLineDash([6, 5]); ctx.strokeStyle = t.red; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); } });
      if (st && ph === 2 && !done) st.fresh.filter(real).forEach(v => { const [a, b, c] = v.map(i => pts[i]); tri(ctx, a, b, c); ctx.fillStyle = t.green + '33'; ctx.fill(); ctx.strokeStyle = t.green; ctx.lineWidth = 2.5; ctx.stroke(); });
      if (circles && done) res.tris.forEach(v => { const cc = circum(...v.map(i => pts[i])); ctx.beginPath(); ctx.arc(cc.x, cc.y, Math.sqrt(cc.r2), 0, 7); ctx.strokeStyle = t.blue + '66'; ctx.lineWidth = 1.2; ctx.stroke(); });
      pts.forEach((p, i) => { const on = i < k; ctx.fillStyle = i === k - 1 && !done ? t.amber : on ? t.ink : t.muted; ctx.beginPath(); ctx.arc(p.x, p.y, i === k - 1 && !done ? 8 : 5, 0, 7); ctx.fill(); label(ctx, String(i + 1), p.x + 12, p.y - 12, on ? t.ink : t.muted, 13); });
      const now = st ? (ph === 2 ? st.tris : base).filter(real) : [];
      const ma = now.length ? Math.min(...now.map(v => minAngle(...v.map(i => pts[i])))) : 0;
      const L = [];
      if (!st) L.push('<div class="hint"><span>·</span>“▶ Sonraki adım”a basın. Her nokta iki adımda eklenir: önce bozulan üçgenler, sonra yenileri.</div>');
      else {
        L.push(`<div class="now"><span>${k}</span><b>${k}. nokta</b> (toplam ${n()})</div>`);
        const nb = st.bad.filter(real).length;
        if (ph === 1) L.push(nb ? `<div class="l-no"><span>✗</span>çevrel çemberi yeni noktayı içine alan <b>${nb}</b> üçgen bozuluyor (kesikli kırmızı çemberler)</div>` : '<div class="hint"><span>·</span>henüz bozulacak gerçek üçgen yok (ilk noktalar yalnızca görünmeyen dev “başlangıç üçgeni”ni böler)</div>');
        else L.push(`<div class="l-ok"><span>✓</span>oyuğun ${st.hole.length} kenarı yeni noktaya bağlandı → ${st.fresh.filter(real).length} yeni üçgen</div>`);
        if (now.length) L.push(`<div class="hint"><span>·</span>şu an ${now.length} üçgen; en dar açı ${ma.toFixed(1).replace('.', ',')}°</div>`);
      }
      S.log.innerHTML = L.join('');
      S.moral.innerHTML = done ? '💡 Bitti. Mavi çemberlere bakın: hiçbir çemberin <b>içinde</b> başka nokta yok. Bu “boş çember” kuralı Delaunay üçgenlemesinin tanımıdır; aynı noktaların bütün üçgenlemeleri içinde en dar açıyı en büyük tutan da odur.' : '';
    };
    S.cv.addEventListener('click', e => { const p = S.mpos(e); const list = pts.map(q => [q.x, q.y]).concat([[p.x, p.y]]); reset(list, list.length, 1); });
    const b1 = btn('▶ Sonraki adım', next); b1.classList.add('primary');
    S.ctrl.append(b1, btn('⏩ Hepsini ekle', () => { k = n(); ph = 2; draw(); }), el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { circles = e.target.checked; draw(); } }); x.checked = circles; return x; })(), ' çevrel çemberler'),
      btn('🎲 Rastgele 12 nokta', () => { const r = rng(Date.now() & 0xffff); reset(Array.from({ length: 12 }, () => [50 + r() * 620, 40 + r() * 320])); }), btn('↺ Baştan', () => reset()));
    reset(); SL.onTheme(draw);
  };

  /* ================= 3) Voronoi: en yakın kuyu ================= */
  function voronoiImage(ctx, sites, metric, t, res = 4, alpha = 0.32) {
    const owner = new Int16Array(Math.ceil(W / res) * Math.ceil(H / res)), cw = Math.ceil(W / res);
    for (let y = 0; y < H; y += res) for (let x = 0; x < W; x += res) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < sites.length; i++) { const dx = x + res / 2 - sites[i].x, dy = y + res / 2 - sites[i].y, d = metric === 'man' ? Math.abs(dx) + Math.abs(dy) : dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
      owner[(y / res) * cw + x / res] = best;
      ctx.fillStyle = PAL[best % PAL.length]; ctx.globalAlpha = alpha; ctx.fillRect(x, y, res, res);
    }
    ctx.globalAlpha = 1; ctx.fillStyle = t.ink;
    for (let y = 0; y < H; y += res) for (let x = 0; x < W; x += res) { const o = owner[(y / res) * cw + x / res]; if ((x + res < W && owner[(y / res) * cw + x / res + 1] !== o) || (y + res < H && owner[(y / res + 1) * cw + x / res] !== o)) ctx.fillRect(x + res - 1, y + res - 1, 2, 2); }
    return owner;
  }
  D.voronoi = function (root) {
    const S = scaffold(root);
    const BASE = [[140, 110], [330, 80], [560, 120], [610, 300], [400, 240], [200, 290], [460, 360]];
    const NAMES = ['🏰', '⛲', '🌲', '⛏️', '🏠', '🐄', '⛪'];
    let sites, metric = 'euc', dual = false, drag = -1, mouse = null;
    const reset = () => { sites = BASE.map(([x, y]) => ({ x, y })); S.story.innerHTML = '📖 Haritada yedi kuyu var. Her karenin rengi, ona <b>en yakın</b> kuyunun rengi. Böylece harita kendiliğinden bölgelere ayrılır: Voronoi diyagramı. Kuyuları sürükleyin; fareyi gezdirip “buradan en yakın kuyu hangisi?” sorusunu okuyun.'; draw(); };
    const draw = () => {
      const t = T(), ctx = S.ctx; bg(ctx, t);
      voronoiImage(ctx, sites, metric, t);
      if (dual) { const r = bowyerWatson(sites); ctx.strokeStyle = t.ink; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); edgesOf(r.tris).forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(sites[a].x, sites[a].y); ctx.lineTo(sites[b].x, sites[b].y); ctx.stroke(); }); ctx.setLineDash([]); r.tris.forEach(v => { const c = circum(...v.map(i => sites[i])); if (c.x > 0 && c.x < W && c.y > 0 && c.y < H) { ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, 7); ctx.fill(); } }); }
      let lines = '';
      if (mouse) {
        const ds = sites.map((s, i) => ({ i, d: metric === 'man' ? Math.abs(s.x - mouse.x) + Math.abs(s.y - mouse.y) : Math.hypot(s.x - mouse.x, s.y - mouse.y) })).sort((a, b) => a.d - b.d);
        ctx.strokeStyle = t.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(sites[ds[0].i].x, sites[ds[0].i].y); ctx.stroke();
        ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(sites[ds[1].i].x, sites[ds[1].i].y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = t.ink; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 5, 0, 7); ctx.fill();
        lines = `<div class="now"><span>🧍</span>en yakın: <b>${NAMES[ds[0].i]}</b> (${Math.round(ds[0].d)}) · ikinci: ${NAMES[ds[1].i]} (${Math.round(ds[1].d)})</div><div class="hint"><span>·</span>fark ${Math.round(ds[1].d - ds[0].d)}: sınıra yaklaştıkça sıfıra iner; sınırın üstünde iki kuyu eşit uzaklıkta</div>`;
      } else lines = '<div class="hint"><span>·</span>fareyi haritada gezdirin</div>';
      sites.forEach((s, i) => { ctx.fillStyle = t.card; ctx.beginPath(); ctx.arc(s.x, s.y, 15, 0, 7); ctx.fill(); ctx.strokeStyle = PAL[i]; ctx.lineWidth = 3; ctx.stroke(); ctx.font = '18px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(NAMES[i], s.x, s.y + 1); });
      S.log.innerHTML = lines + (dual ? '<div class="hint"><span>·</span>kesikli çizgiler: Delaunay; kırmızı noktalar: Voronoi köşeleri = üçgenlerin çevrel çember merkezleri</div>' : '');
      S.moral.innerHTML = metric === 'man' ? '💡 Manhattan uzaklığında (yalnızca yatay + dikey yürüyüş, ızgara oyunları gibi) sınırlar 45° kırılır; bölgelerin biçimi uzaklığın tanımına bağlı.' : '💡 İki kuyu arasındaki sınır, onları birleştiren doğru parçasının <b>dik açıortayıdır</b>: sınırdaki her nokta ikisine eşit uzaklıkta.';
    };
    S.cv.addEventListener('pointerdown', e => { const p = S.mpos(e); drag = sites.findIndex(s => Math.hypot(s.x - p.x, s.y - p.y) < 20); });
    S.cv.addEventListener('pointermove', e => { const p = S.mpos(e); if (drag >= 0) { sites[drag].x = Math.max(10, Math.min(W - 10, p.x)); sites[drag].y = Math.max(10, Math.min(H - 10, p.y)); mouse = null; } else mouse = p; draw(); });
    window.addEventListener('pointerup', () => { drag = -1; });
    S.cv.addEventListener('pointerleave', () => { mouse = null; draw(); });
    S.ctrl.append(el('label', { class: 'ctl' }, 'Uzaklık: ', select({ euc: 'kuş uçuşu (Öklid)', man: 'ızgarada yürüme (Manhattan)' }, metric, v => { metric = v; draw(); })),
      el('label', { class: 'ctl' }, (() => { const x = el('input', { type: 'checkbox', onchange: e => { dual = e.target.checked; draw(); } }); return x; })(), ' Delaunay’i üstüne çiz'), btn('↺ Baştan', reset));
    reset(); SL.onTheme(draw);
  };

  /* ================= 4) Lloyd gevşetmesi ================= */
  D.lloyd = function (root) {
    const S = scaffold(root);
    let sites, it = 0, arrows = [];
    const nn = () => Math.min(...sites.map((s, i) => Math.min(...sites.filter((_, j) => j !== i).map(q => Math.hypot(q.x - s.x, q.y - s.y)))));
    const reset = () => { const r = rng(7); sites = Array.from({ length: 24 }, () => ({ x: 30 + r() * 660, y: 30 + r() * 340 })); it = 0; arrows = []; S.story.innerHTML = '📖 24 nokta tamamen rastgele: bazıları kümeleniyor, bazı yerler boş. Lloyd adımı: her noktayı kendi Voronoi bölgesinin <b>ağırlık merkezine</b> taşı. Birkaç adımda dağılım düzgünleşir ama düzenli ızgaraya dönmez.'; draw(); };
    const step = () => {
      const res = 4, cw = Math.ceil(W / res), sx = new Float64Array(sites.length), sy = new Float64Array(sites.length), cnt = new Float64Array(sites.length);
      for (let y = 0; y < H; y += res) for (let x = 0; x < W; x += res) { let b = 0, bd = Infinity; for (let i = 0; i < sites.length; i++) { const d = (x - sites[i].x) ** 2 + (y - sites[i].y) ** 2; if (d < bd) { bd = d; b = i; } } sx[b] += x + res / 2; sy[b] += y + res / 2; cnt[b]++; }
      arrows = sites.map((s, i) => ({ x0: s.x, y0: s.y, x1: sx[i] / cnt[i], y1: sy[i] / cnt[i] }));
      sites = arrows.map(a => ({ x: a.x1, y: a.y1 })); it++; draw();
    };
    const draw = () => {
      const t = T(), ctx = S.ctx; bg(ctx, t);
      voronoiImage(ctx, sites, 'euc', t, 4, 0.22);
      ctx.strokeStyle = t.red; ctx.lineWidth = 2; arrows.forEach(a => { ctx.beginPath(); ctx.moveTo(a.x0, a.y0); ctx.lineTo(a.x1, a.y1); ctx.stroke(); ctx.fillStyle = t.muted; ctx.beginPath(); ctx.arc(a.x0, a.y0, 3, 0, 7); ctx.fill(); });
      sites.forEach(s => { ctx.fillStyle = t.ink; ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, 7); ctx.fill(); });
      const d = nn();
      S.log.innerHTML = `<div class="now"><span>${it}</span><b>${it}. adım</b></div><div class="${it ? 'l-ok' : 'hint'}"><span>↔</span>en yakın iki nokta arası: <b>${d.toFixed(0)}</b> piksel</div><div class="hint"><span>·</span>kırmızı çizgi: noktanın bu adımda gittiği yol (eski yeri gri)</div>`;
      S.moral.innerHTML = it >= 5 ? '💡 En yakın iki nokta arası her adımda büyüdü: kümeler dağıldı. Oyunlarda bu, ağaçları, düşman kamplarını ya da harita bölgelerini “rastgele ama dengeli” serpiştirmek için kullanılır (Amit Patel’in harita üreticisi 2 adım uygular).' : '';
    };
    const b = btn('▶ 1 Lloyd adımı', step); b.classList.add('primary');
    S.ctrl.append(b, btn('⏩ 5 adım', () => { for (let k = 0; k < 5; k++) step(); }), btn('↺ Rastgele başa dön', reset));
    reset(); SL.onTheme(draw);
  };

  /* ================= 5) Poisson disk (Bridson) ================= */
  D.poisson = function (root) {
    const S = scaffold(root);
    const R = 46, K = 30, cell = R / Math.SQRT2, gw = Math.ceil(W / cell), gh = Math.ceil(H / cell);
    let pts, active, grid, tries, rnd, last, mode = 'pd', rej = 0;
    const reset = () => {
      rnd = rng(11); pts = []; active = []; grid = new Int32Array(gw * gh).fill(-1); tries = 0; rej = 0; last = null;
      if (mode === 'pd') add({ x: W / 2, y: H / 2 }); else { for (let k = 0; k < 120; k++) pts.push({ x: rnd() * W, y: rnd() * H }); }
      S.story.innerHTML = mode === 'pd' ? `📖 Kural: <b>hiçbir iki nokta ${R} pikselden yakın olmasın</b>. Aktif bir noktanın çevresindeki halkaya (R … 2R) aday atılır; aday ızgarada komşularına bakılıp ${R}’den yakın biri yoksa kabul edilir. ${K} aday üst üste reddedilirse o nokta pasif olur.` : '📖 Karşılaştırma: aynı alana 120 tamamen rastgele nokta. Bazıları üst üste biniyor, bazı yerler boş: ormana ağaç dikseydik iç içe geçen gövdeler ve çıplak alanlar olurdu.';
      draw();
    };
    function add(p) { pts.push(p); active.push(pts.length - 1); grid[Math.floor(p.y / cell) * gw + Math.floor(p.x / cell)] = pts.length - 1; }
    const ok = p => { if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) return false; const gx = Math.floor(p.x / cell), gy = Math.floor(p.y / cell); for (let y = Math.max(0, gy - 2); y <= Math.min(gh - 1, gy + 2); y++) for (let x = Math.max(0, gx - 2); x <= Math.min(gw - 1, gx + 2); x++) { const j = grid[y * gw + x]; if (j >= 0 && Math.hypot(pts[j].x - p.x, pts[j].y - p.y) < R) return false; } return true; };
    const step = () => {
      if (mode !== 'pd' || !active.length) return;
      const ai = Math.floor(rnd() * active.length), c = pts[active[ai]];
      for (let k = 0; k < K; k++) { const a = rnd() * Math.PI * 2, r = R * (1 + rnd()), p = { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }; tries++; if (ok(p)) { add(p); last = { c, p, ok: true }; draw(); return; } rej++; }
      active.splice(ai, 1); last = { c, ok: false }; draw();
    };
    const draw = () => {
      const t = T(), ctx = S.ctx; bg(ctx, t);
      if (mode === 'pd' && last) { ctx.beginPath(); ctx.arc(last.c.x, last.c.y, 2 * R, 0, 7); ctx.arc(last.c.x, last.c.y, R, 0, 7, true); ctx.fillStyle = t.amber + '22'; ctx.fill('evenodd'); }
      pts.forEach((p, i) => {
        if (mode === 'pd') { ctx.strokeStyle = active.includes(i) ? t.amber : t.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, R / 2, 0, 7); ctx.stroke(); }
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(p.x - 2, p.y + 2, 4, 9);                       // gövde
        ctx.fillStyle = mode === 'pd' && active.includes(i) ? '#3fbf6a' : '#2a8f4c';             // tepe (aktifler açık yeşil)
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 13); ctx.lineTo(p.x + 9, p.y + 4); ctx.lineTo(p.x - 9, p.y + 4); ctx.closePath(); ctx.fill();
      });
      if (last && last.p) { ctx.strokeStyle = t.green; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(last.c.x, last.c.y); ctx.lineTo(last.p.x, last.p.y); ctx.stroke(); }
      let close = 0; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < R) close++;
      S.log.innerHTML = mode === 'pd' ? `<div class="now"><span>🌲</span><b>${pts.length}</b> ağaç · aktif ${active.length}</div><div class="hint"><span>·</span>denenen aday ${tries}, reddedilen ${rej}</div><div class="l-ok"><span>✓</span>${R}’den yakın çift: <b>${close}</b></div>` : `<div class="now"><span>🌲</span><b>${pts.length}</b> ağaç</div><div class="l-no"><span>✗</span>${R}’den yakın çift: <b>${close}</b></div>`;
      S.moral.innerHTML = mode === 'pd' && !active.length ? `💡 Bitti: ${pts.length} ağaç, hiçbiri birbirine ${R}’den yakın değil ve boş kalan delik yok. Her yeni nokta yalnızca çevresindeki ${5 * 5} ızgara hücresine baktı: G2’deki ızgara burada da işe yaradı.` : '';
    };
    const b = btn('▶ Sonraki aktif nokta', step); b.classList.add('primary');
    S.ctrl.append(el('label', { class: 'ctl' }, 'Yöntem: ', select({ pd: 'Poisson disk (Bridson)', rnd: 'tamamen rastgele' }, mode, v => { mode = v; reset(); })), b,
      btn('⏩ Sonuna kadar', () => { for (let k = 0; k < 2000 && active.length; k++) step(); }), btn('↺ Baştan', reset));
    reset(); SL.onTheme(draw);
  };

  /* ================= 6) zindan: odalar → Delaunay → MST → geri ekle → koridor ================= */
  D.dungeon = function (root) {
    const S = scaffold(root);
    let seed = 5, rooms, stage, dt, mst, extra;
    const STAGES = ['1 · Odalar', '2 · Delaunay', '3 · En küçük yayılan ağaç', '4 · Birkaç kenarı geri ekle', '5 · Koridorlar'];
    const build = () => {
      const r = rng(seed); rooms = [];
      for (let k = 0; k < 60 && rooms.length < 11; k++) { const w = 50 + r() * 70, h = 36 + r() * 50, x = 20 + r() * (W - w - 40), y = 20 + r() * (H - h - 40); if (rooms.every(q => x > q.x + q.w + 18 || q.x > x + w + 18 || y > q.y + q.h + 18 || q.y > y + h + 18)) rooms.push({ x, y, w, h }); }
      const c = rooms.map(q => ({ x: q.x + q.w / 2, y: q.y + q.h / 2 }));
      dt = edgesOf(bowyerWatson(c).tris); mst = kruskal(c.length, dt, c);
      const rest = dt.filter(e => !mst.some(m => m[0] === e[0] && m[1] === e[1])); extra = rest.filter((_, i) => rng(seed * 7 + i)() < 0.15 || i % 6 === 0).slice(0, Math.max(1, Math.round(rest.length * 0.15)));
      stage = 0; draw();
    };
    const C = q => ({ x: q.x + q.w / 2, y: q.y + q.h / 2 });
    const draw = () => {
      const t = T(), ctx = S.ctx; bg(ctx, t);
      const line = (e, col, w, dash) => { const a = C(rooms[e[0]]), b = C(rooms[e[1]]); ctx.setLineDash(dash || []); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); };
      if (stage === 4) { ctx.strokeStyle = t.muted; ctx.lineWidth = 12; ctx.lineCap = 'square'; mst.concat(extra).forEach(e => { const a = C(rooms[e[0]]), b = C(rooms[e[1]]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }); ctx.lineCap = 'butt'; }
      rooms.forEach((q, i) => { ctx.fillStyle = stage === 4 ? t['card-2'] : t.blue + '22'; ctx.fillRect(q.x, q.y, q.w, q.h); ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.strokeRect(q.x, q.y, q.w, q.h); label(ctx, String(i + 1), q.x + q.w / 2, q.y + q.h / 2, t.ink, 15); });
      if (stage === 1) dt.forEach(e => line(e, t['ink-2'], 1.8));
      if (stage === 2) { dt.forEach(e => line(e, t.rule, 1.5, [5, 5])); mst.forEach(e => line(e, t.green, 4)); }
      if (stage === 3) { dt.forEach(e => line(e, t.rule, 1.5, [5, 5])); mst.forEach(e => line(e, t.green, 4)); extra.forEach(e => line(e, t.amber, 4)); }
      const L = [
        `<b>${rooms.length} oda</b> rastgele yerleşti (üst üste binenler atıldı). Henüz bağlantı yok.`,
        `Oda merkezlerinin Delaunay üçgenlemesi: <b>${dt.length}</b> kenar. Her oda yalnızca “doğal komşularına” bağlı; karşı uçtaki odaya giden uzun kenar yok.`,
        `Bu kenarlardan en kısa toplamla hepsini bağlayan ağaç (Kruskal): <b>${mst.length}</b> kenar = oda − 1. Her odaya ulaşılır ama döngü yok: oyuncu hep geri dönmek zorunda.`,
        `Ağaçta olmayan kenarlardan birkaçı (<b>${extra.length}</b>) geri eklendi (turuncu): artık kestirmeler ve döngüler var; keşif daha keyifli.`,
        `Her kenar L biçimli bir koridora çevrildi. Toplam ${mst.length + extra.length} koridor.`];
      S.log.innerHTML = STAGES.map((s, i) => `<div class="${i === stage ? 'now' : i < stage ? 'l-ok' : 'hint'}"><span>${i < stage ? '✓' : i === stage ? '▶' : '·'}</span>${i <= stage ? '<b>' + s + '</b>' + (i === stage ? ': ' + L[i] : '') : s}</div>`).join('');
      S.moral.innerHTML = stage === 4 ? '💡 TinyKeep (Phi Dinh) bu yöntemi 2013’te bir Reddit yazısıyla paylaştı; sonra pek çok roguelike benzerini kullandı. Delaunay “kime bağlanabilir?”, MST “en az koridorla herkesi bağla”, geri eklenen kenarlar “ama biraz da döngü olsun” sorusunun cevabı.' : '';
    };
    const b = btn('▶ Sonraki aşama', () => { if (stage < 4) { stage++; draw(); } }); b.classList.add('primary');
    S.ctrl.append(b, btn('◀ Geri', () => { if (stage > 0) { stage--; draw(); } }), btn('🎲 Yeni zindan', () => { seed = (seed * 31 + 7) % 9973; build(); }));
    S.story.innerHTML = '📖 Bir roguelike için zindan üretiyoruz: odalar hazır, şimdi koridorlar. Her oda erişilebilir olmalı, koridorlar birbirini kesmemeli, ama tek bir uzun zincir de sıkıcı olur. Beş aşamayı sırayla izleyin.';
    build(); SL.onTheme(draw);
  };

  /* ================= kapak: kayan Voronoi ================= */
  D.titlegeo10 = function (root) {
    const Wt = 1280, Ht = 230, cv = el('canvas'); root.append(cv);
    const ctx = SL.setupCanvas(cv, Wt, Ht); let timer, running = false, t = 0;
    const r = rng(3), S0 = Array.from({ length: 16 }, () => ({ x: 640 + r() * 640, y: r() * Ht, vx: (r() - .5) * 20, vy: (r() - .5) * 14 }));
    const tick = () => {
      if (!running) return; t += 0.05;
      S0.forEach(s => { s.x += s.vx * 0.05; s.y += s.vy * 0.05; if (s.x < 640 || s.x > Wt) s.vx *= -1; if (s.y < 0 || s.y > Ht) s.vy *= -1; });
      ctx.clearRect(0, 0, Wt, Ht);
      for (let y = 0; y < Ht; y += 6) for (let x = 640; x < Wt; x += 6) { let b = 0, bd = Infinity; S0.forEach((s, i) => { const d = (x - s.x) ** 2 + (y - s.y) ** 2; if (d < bd) { bd = d; b = i; } }); ctx.fillStyle = PAL[b % PAL.length]; ctx.globalAlpha = 0.18 + 0.12 * ((x - 640) / 640); ctx.fillRect(x, y, 6, 6); }
      ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.8)'; S0.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, 7); ctx.fill(); });
      timer = setTimeout(tick, 50);
    };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };

  /* ================= laboratuvarlar ================= */
  SL.AILABS = SL.AILABS || {};
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const cc = (a, b, c) => circum({ x: a[0], y: a[1] }, { x: b[0], y: b[1] }, { x: c[0], y: c[1] });
  const nondeg = () => { for (;;) { const a = [rint(-9, 9), rint(-9, 9)], b = [rint(-9, 9), rint(-9, 9)], c = [rint(-9, 9), rint(-9, 9)]; if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 4) return [a, b, c]; } };
  SL.AILABS.circum = {
    fn: 'cevrel_merkez', jsFn: 'cevrelMerkez', tol: 1e-6,
    ref: (a, b, c) => { const k = cc(a, b, c); return [k.x, k.y]; },
    cases: () => { const cs = [[[0, 0], [4, 0], [0, 4]], [[0, 0], [6, 0], [3, 3]], [[1, 1], [5, 1], [1, 7]], [[-2, 0], [2, 0], [0, 2]], [[0, 0], [8, 0], [4, 2]]]; for (let i = 0; i < 10; i++) cs.push(nondeg()); return cs; },
    show: (a, b, c) => `A = ${JSON.stringify(a)}, B = ${JSON.stringify(b)}, C = ${JSON.stringify(c)}`,
    hint: (a, b, c) => 'Merkez, AB ve AC kenarlarının dik açıortaylarının kesişimi. d = 2·(ax·(by − cy) + bx·(cy − ay) + cx·(ay − by)); x = (|A|²·(by − cy) + |B|²·(cy − ay) + |C|²·(ay − by)) / d; y için x’ler yer değiştirir (slayttaki formül). Diziler [x, y].'
  };
  SL.AILABS.incircle = {
    fn: 'cemberin_icinde', jsFn: 'cemberinIcinde',
    ref: (a, b, c, d) => { const k = cc(a, b, c); return (d[0] - k.x) ** 2 + (d[1] - k.y) ** 2 < k.r2 - 1e-9; },
    cases: () => { const cs = [[[0, 0], [4, 0], [0, 4], [1, 1]], [[0, 0], [4, 0], [0, 4], [5, 5]], [[0, 0], [4, 0], [0, 4], [4, 4]], [[0, 0], [6, 0], [3, 3], [3, -2]], [[0, 0], [6, 0], [3, 3], [3, -4]]]; for (let i = 0; i < 10; i++) { const t = nondeg(); cs.push(t.concat([[rint(-9, 9), rint(-9, 9)]])); } return cs; },
    show: (a, b, c, d) => `üçgen ${JSON.stringify([a, b, c])}, D = ${JSON.stringify(d)}`,
    hint: (a, b, c, d) => 'Önce cevrelMerkez ile merkezi bul; yarıçapın karesi = |A − merkez|². D’nin merkeze uzaklığının karesi bundan KÜÇÜKSE true. Tam çemberin üstündeki nokta (ör. kare köşesi [4, 4]) içeride sayılmaz: false.'
  };
})();
