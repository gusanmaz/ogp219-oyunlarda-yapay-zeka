/* =====================================================================
   geometri.js — BST'nin geometrik uygulamaları (core.js + agac.js gerekir)
   Demolar: sweep (dik doğru parçası kesişimi), kdtree (2d-ağacı: ekleme,
            aralık arama, en yakın komşu), nnbench, interval (aralık arama
            ağacı), sap (sweep and prune geniş faz çarpışma)
   Bileşen: .geolab (intersects / overlaps yaz)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);
  const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn'.split('');
  const canvasXY = (c, e, W, H) => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; };

  /* ================= Dik doğru parçası kesişimi: süpürme doğrusu ================= */
  D.sweep = function (root) {
    const W = 780, H = 360, pad = 24;
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    const side = el('div', { class: 'geo-side' });
    const note = el('div', { class: 'sv-note tree-note' });
    let segs = [];
    const sx = v => pad + (v / 100) * (W - 2 * pad), sy = v => pad + (v / 100) * (H - 2 * pad);
    const gen = () => {
      const xs = SL.shuffle(Array.from({ length: 97 }, (_, i) => i + 2)), ys = SL.shuffle(Array.from({ length: 30 }, (_, i) => 3 + i * 3));
      segs = []; let id = 0;
      for (let i = 0; i < 7; i++) { const a = xs.pop(), b = xs.pop(); segs.push({ id: id++, h: true, y: ys.pop(), x1: Math.min(a, b), x2: Math.max(a, b), name: 'y' + (i + 1) }); }
      for (let i = 0; i < 6; i++) { const y1 = 3 + rint(60), len = 15 + rint(45); segs.push({ id: id++, h: false, x: xs.pop(), y1, y2: Math.min(97, y1 + len), name: 'd' + (i + 1) }); }
      segs.forEach(s => { if (!s.h) { s.y1 = Math.max(1, s.y1); } });
      build();
    };
    const build = () => {
      const ev = [];
      segs.forEach(s => { if (s.h) { ev.push({ x: s.x1, t: 'L', s }); ev.push({ x: s.x2, t: 'R', s }); } else ev.push({ x: s.x, t: 'V', s }); });
      ev.sort((a, b) => a.x - b.x);
      const F = [], active = new Map(), found = [];
      let tests = 0;
      const P = (x, note, cur, range) => F.push({ x, note, cur, range, active: [...active.values()].sort((a, b) => a.y - b.y).map(s => s.id), found: found.slice(), tests });
      P(-1, `Olaylar x’e göre sıralandı (${ev.length} olay). Süpürme doğrusu soldan sağa ilerleyecek.`);
      ev.forEach(e => {
        if (e.t === 'L') { active.set(e.s.id, e.s); P(e.x, `${e.s.name} yatay parçasının SOL ucu → y = ${e.s.y} BST’ye EKLENİR`, e.s.id); }
        else if (e.t === 'R') { active.delete(e.s.id); P(e.x, `${e.s.name} yatay parçasının SAĞ ucu → y = ${e.s.y} BST’den SİLİNİR`, e.s.id); }
        else {
          const hits = [...active.values()].filter(h => h.y >= e.s.y1 && h.y <= e.s.y2);
          tests += 1;
          hits.forEach(h => found.push([e.s.x, h.y]));
          P(e.x, `${e.s.name} dikey parçası → BST’de ARALIK ARAMA [${e.s.y1}, ${e.s.y2}] → ${hits.length} kesişim${hits.length ? ' (' + hits.map(h => 'y = ' + h.y).join(', ') + ')' : ''}`, e.s.id, [e.s.y1, e.s.y2]);
        }
      });
      P(101, `Bitti: ${found.length} kesişim, ${ev.length} olay. Kaba kuvvet ${segs.filter(s => s.h).length} × ${segs.filter(s => !s.h).length} = ${segs.filter(s => s.h).length * segs.filter(s => !s.h).length} çifti tek tek denerdi.`);
      fp.load(F);
    };
    const draw = f => {
      const t = T();
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.strokeRect(pad, pad, W - 2 * pad, H - 2 * pad);
      const act = new Set(f.active);
      segs.forEach(s => {
        const on = s.id === f.cur, isAct = s.h && act.has(s.id), done = s.h ? s.x2 < f.x : s.x < f.x;
        ctx.lineCap = 'round';
        ctx.strokeStyle = on ? t.amber : isAct ? t.blue : s.h ? t.blue : t.green;
        ctx.globalAlpha = on || isAct ? 1 : done ? 0.25 : 0.55;
        ctx.lineWidth = on ? 6 : isAct ? 5 : 3;
        ctx.beginPath();
        if (s.h) { ctx.moveTo(sx(s.x1), sy(s.y)); ctx.lineTo(sx(s.x2), sy(s.y)); } else { ctx.moveTo(sx(s.x), sy(s.y1)); ctx.lineTo(sx(s.x), sy(s.y2)); }
        ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = t.muted; ctx.font = '600 12px "JetBrains Mono"'; ctx.textAlign = 'left';
        if (s.h) ctx.fillText(s.name, sx(s.x1) - 4, sy(s.y) - 7); else ctx.fillText(s.name, sx(s.x) + 5, sy(s.y1) + 4);
      });
      if (f.range) { ctx.fillStyle = t.dark ? 'rgba(255,190,80,0.15)' : 'rgba(230,150,20,0.15)'; ctx.fillRect(pad, sy(f.range[0]), W - 2 * pad, sy(f.range[1]) - sy(f.range[0])); }
      if (f.x >= 0 && f.x <= 100) { ctx.strokeStyle = t.red; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx(f.x), 6); ctx.lineTo(sx(f.x), H - 6); ctx.stroke(); ctx.setLineDash([]); }
      f.found.forEach(([x, y]) => { ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(sx(x), sy(y), 7, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); });
      note.textContent = f.note;
      side.innerHTML = `<div class="mini"><b>BST</b> (aktif yatay parçaların y’leri, sıralı):</div><div class="ll-chips">${f.active.map(id => { const s = segs[id]; return `<span class="ll-chip${f.range && s.y >= f.range[0] && s.y <= f.range[1] ? ' hit' : ''}">${s.y}</span>`; }).join('') || '<span class="mini">(boş)</span>'}</div>` +
        `<div class="sv-counters" style="margin-top:8px"><span class="cnt">kesişim <b>${f.found.length}</b></span><span class="cnt">aralık araması <b>${f.tests}</b></span></div>`;
    };
    const fp = new SL.FramePlayer(draw, { speed: 1.5 });
    SL.onTheme(() => fp.render());
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('🎲 Yeni parçalar', gen)), el('div', { class: 'geo-row' }, c, side), SL.transport(fp, { min: 0.3, max: 8 }), note);
    gen();
    return { stop: () => fp.pause() };
  };

  /* ================= 2d-ağacı ================= */
  class KD {
    constructor(W, H) { this.W = W; this.H = H; this.nodes = []; this.root = null; }
    snap(x = this.root) { return x ? { id: x.id, key: x.label, l: this.snap(x.l), r: this.snap(x.r) } : null; }
    insertSilent(px, py) { this.insert(px, py, null); }
    insert(px, py, F, extra) {
      const nd = { id: this.nodes.length + 1, x: px, y: py, label: LABELS[this.nodes.length] || '?', l: null, r: null };
      const P = (note, hl) => F && F.push(Object.assign({ n: this.nodes.length, tree: this.snap(), hl, note }, extra || {}));
      if (!this.root) { nd.vert = true; nd.rect = [0, 0, this.W, this.H]; this.root = nd; this.nodes.push(nd); P(`${nd.label} kök oldu: DİKEY çizgi, düzlemi sol ve sağ olarak ikiye böler`, { [nd.id]: 'new' }); return nd; }
      let x = this.root; const path = {};
      for (;;) {
        path[x.id] = 'path';
        const goLeft = x.vert ? px < x.x : py < x.y;
        P(`${nd.label} ile ${x.label} karşılaştır: ${x.vert ? `x = ${Math.round(px)} ${goLeft ? '<' : '≥'} ${Math.round(x.x)} → çizginin ${goLeft ? 'SOLU' : 'SAĞI'}` : `y = ${Math.round(py)} ${goLeft ? '<' : '≥'} ${Math.round(x.y)} → çizginin ${goLeft ? 'ÜSTÜ' : 'ALTI'}`} → ${goLeft ? 'sol' : 'sağ'} alt ağaç`, Object.assign({}, path, { [x.id]: 'cur' }));
        const next = goLeft ? x.l : x.r;
        if (!next) {
          const [a, b, c2, d] = x.rect;
          nd.vert = !x.vert;
          nd.rect = x.vert ? (goLeft ? [a, b, x.x, d] : [x.x, b, c2, d]) : (goLeft ? [a, b, c2, x.y] : [a, x.y, c2, d]);
          if (goLeft) x.l = nd; else x.r = nd;
          this.nodes.push(nd);
          P(`${nd.label} eklendi. Derinliği ${nd.vert ? 'çift' : 'tek'} → ${nd.vert ? 'DİKEY' : 'YATAY'} çizgi; sadece kendi bölgesini ikiye böler`, Object.assign({}, path, { [nd.id]: 'new' }));
          return nd;
        }
        x = next;
      }
    }
  }
  SL.KD = KD;
  const rectHit = (r, q) => r[0] <= q[2] && q[0] <= r[2] && r[1] <= q[3] && q[1] <= r[3];
  const distRect = (r, px, py) => { const dx = Math.max(r[0] - px, 0, px - r[2]), dy = Math.max(r[1] - py, 0, py - r[3]); return Math.hypot(dx, dy); };
  const subIds = (x, out = []) => { if (x) { out.push(x.id); subIds(x.l, out); subIds(x.r, out); } return out; };

  D.kdtree = function (root) {
    const d = root.dataset;
    const PW = 520, PH = 380;
    const pc = el('canvas'), pctx = SL.setupCanvas(pc, PW, PH);
    const tc = el('canvas');
    const tv = new SL.TreeView(tc, 620, PH, { maxSp: 46, maxR: 16 });
    const note = el('div', { class: 'sv-note tree-note' });
    const stat = el('div', { class: 'sv-counters' });
    let kd = new KD(PW, PH), mode = d.mode || 'insert', drag = null;
    const fp = new SL.FramePlayer(f => render(f), { speed: 2 });
    const render = f => {
      const t = T();
      pctx.clearRect(0, 0, PW, PH);
      const nodes = kd.nodes.slice(0, f.n), hl = f.hl || {};
      (f.pruned || []).forEach(r => { pctx.fillStyle = t.dark ? 'rgba(140,140,160,0.18)' : 'rgba(120,120,140,0.14)'; pctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]); });
      nodes.forEach(nd => {
        const r = nd.rect; pctx.lineWidth = hl[nd.id] === 'cur' || hl[nd.id] === 'new' ? 3 : 1.6;
        pctx.strokeStyle = nd.vert ? t.red : t.blue; pctx.globalAlpha = hl[nd.id] === 'dim' ? 0.3 : 0.85;
        pctx.beginPath(); if (nd.vert) { pctx.moveTo(nd.x, r[1]); pctx.lineTo(nd.x, r[3]); } else { pctx.moveTo(r[0], nd.y); pctx.lineTo(r[2], nd.y); } pctx.stroke(); pctx.globalAlpha = 1;
      });
      if (f.q && f.q.rect) { const r = f.q.rect; pctx.fillStyle = t.dark ? 'rgba(95,240,160,0.13)' : 'rgba(30,160,90,0.12)'; pctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]); pctx.strokeStyle = t.green; pctx.lineWidth = 2; pctx.setLineDash([6, 4]); pctx.strokeRect(r[0], r[1], r[2] - r[0], r[3] - r[1]); pctx.setLineDash([]); }
      if (f.q && f.q.pt) {
        const [qx, qy] = f.q.pt;
        if (f.q.bestD < Infinity) { pctx.strokeStyle = t.purple; pctx.lineWidth = 2; pctx.setLineDash([5, 4]); pctx.beginPath(); pctx.arc(qx, qy, f.q.bestD, 0, 7); pctx.stroke(); pctx.setLineDash([]); }
        if (f.q.best) { const b = kd.nodes[f.q.best - 1]; pctx.strokeStyle = t.purple; pctx.lineWidth = 2; pctx.beginPath(); pctx.moveTo(qx, qy); pctx.lineTo(b.x, b.y); pctx.stroke(); }
        pctx.fillStyle = t.green; pctx.beginPath(); pctx.moveTo(qx, qy - 10); pctx.lineTo(qx + 9, qy + 6); pctx.lineTo(qx - 9, qy + 6); pctx.closePath(); pctx.fill();
      }
      const col = { found: t.green, visited: t.blue, cur: t.amber, new: t.green, succ: t.purple, path: t.amber };
      nodes.forEach(nd => {
        const s = hl[nd.id];
        pctx.globalAlpha = s === 'dim' ? 0.35 : 1;
        pctx.fillStyle = col[s] || t.ink; pctx.beginPath(); pctx.arc(nd.x, nd.y, s ? 7 : 5, 0, 7); pctx.fill();
        pctx.fillStyle = t.ink; pctx.font = '700 13px "JetBrains Mono"'; pctx.textAlign = 'left'; pctx.fillText(nd.label, nd.x + 7, nd.y - 6);
        pctx.globalAlpha = 1;
      });
      pctx.strokeStyle = t.rule; pctx.lineWidth = 1; pctx.strokeRect(0.5, 0.5, PW - 1, PH - 1);
      tv.show({ root: f.tree, hl });
      note.textContent = f.note;
      const c = f.cnt;
      stat.innerHTML = `<span class="cnt">N = <b>${f.n}</b></span>` + (c ? `<span class="cnt">ziyaret edilen düğüm <b>${c.v}</b></span>` + (c.d != null ? `<span class="cnt">mesafe hesabı <b>${c.d}</b> (kaba kuvvet: ${f.n})</span>` : '') + (c.found != null ? `<span class="cnt">bulunan <b>${c.found}</b> (kaba kuvvet ${f.n} noktaya bakar)</span>` : '') : '');
    };
    const base = note2 => ({ n: kd.nodes.length, tree: kd.snap(), hl: {}, note: note2 });
    const addPoint = (x, y) => { if (kd.nodes.length >= LABELS.length) return; const F = []; kd.insert(x, y, F); fp.load(F); fp.play(); };
    const randomPts = n => { kd = new KD(PW, PH); for (let i = 0; i < n; i++) kd.insertSilent(20 + Math.random() * (PW - 40), 20 + Math.random() * (PH - 40)); fp.load([base(`${n} rastgele nokta eklendi. Kırmızı = dikey bölme (x’e göre), mavi = yatay bölme (y’ye göre).`)]); };
    const rangeSearch = q => {
      const F = [], hl = {}, pruned = [], cnt = { v: 0, found: 0 };
      const P = note => F.push({ n: kd.nodes.length, tree: kd.snap(), hl: Object.assign({}, hl), note, q: { rect: q }, pruned: pruned.slice(), cnt: Object.assign({}, cnt) });
      P('Aralık araması: yeşil dikdörtgenin içindeki noktalar hangileri? Kökten başla.');
      const rs = x => {
        if (!x) return;
        if (!rectHit(x.rect, q)) { subIds(x).forEach(id => (hl[id] = 'dim')); pruned.push(x.rect); P(`${x.label} düğümünün bölgesi dikdörtgenle KESİŞMİYOR → bu alt ağacın tamamı BUDANDI ✂️ (${subIds(x).length} nokta hiç incelenmeyecek)`); return; }
        cnt.v++;
        const inside = x.x >= q[0] && x.x <= q[2] && x.y >= q[1] && x.y <= q[3];
        if (inside) { cnt.found++; hl[x.id] = 'found'; } else hl[x.id] = 'visited';
        P(`${x.label}: bölgesi dikdörtgenle kesişiyor → noktaya bak: ${inside ? 'İÇERİDE ✔' : 'dışarıda'}. Sonra iki alt ağaca da (gerekirse) in.`);
        rs(x.l); rs(x.r);
      };
      rs(kd.root);
      P(`Bitti: ${cnt.found} nokta bulundu, ${cnt.v} düğüm ziyaret edildi (toplam ${kd.nodes.length}).`);
      fp.load(F); fp.play();
    };
    const nearest = (qx, qy) => {
      if (!kd.root) return;
      const F = [], hl = {}, pruned = [], cnt = { v: 0, d: 0 };
      let best = null, bestD = Infinity;
      const P = note => F.push({ n: kd.nodes.length, tree: kd.snap(), hl: Object.assign({}, hl, best ? { [best.id]: 'succ' } : {}), note, q: { pt: [qx, qy], best: best && best.id, bestD }, pruned: pruned.slice(), cnt: Object.assign({}, cnt) });
      P('En yakın komşu: yeşil üçgene en yakın nokta hangisi? Kökten başla.');
      const nn = x => {
        if (!x) return;
        const dr = distRect(x.rect, qx, qy);
        if (dr >= bestD) { subIds(x).forEach(id => (hl[id] = 'dim')); pruned.push(x.rect); P(`${x.label} bölgesinin sorguya en kısa uzaklığı ${Math.round(dr)} ≥ en iyi ${Math.round(bestD)} → içinde daha yakın nokta OLAMAZ → BUDA ✂️`); return; }
        cnt.v++; cnt.d++;
        const dd = Math.hypot(x.x - qx, x.y - qy);
        hl[x.id] = 'visited';
        if (dd < bestD) { best = x; bestD = dd; P(`${x.label}: uzaklık ${Math.round(dd)} → YENİ EN İYİ 🟣 (mor çember = arama yarıçapı küçüldü)`); }
        else P(`${x.label}: uzaklık ${Math.round(dd)} ≥ en iyi ${Math.round(bestD)} → aday değil`);
        const first = x.vert ? qx < x.x : qy < x.y;
        P(`Önce sorgunun bulunduğu taraf (${first ? (x.vert ? 'sol' : 'üst') : (x.vert ? 'sağ' : 'alt')}) → orada yakın nokta bulma ihtimali yüksek`);
        if (first) { nn(x.l); nn(x.r); } else { nn(x.r); nn(x.l); }
      };
      nn(kd.root);
      P(`Bitti: en yakın nokta ${best.label} (uzaklık ${Math.round(bestD)}). ${cnt.d} mesafe hesaplandı — kaba kuvvet ${kd.nodes.length} hesaplardı.`);
      fp.load(F); fp.play();
    };
    pc.addEventListener('mousedown', e => {
      const [x, y] = canvasXY(pc, e, PW, PH);
      if (mode === 'insert') addPoint(x, y);
      else if (mode === 'nearest') nearest(x, y);
      else drag = [x, y];
    });
    pc.addEventListener('mousemove', e => { if (mode !== 'range' || !drag) return; const [x, y] = canvasXY(pc, e, PW, PH); const f = Object.assign({}, fp.frame || base(''), { q: { rect: [Math.min(drag[0], x), Math.min(drag[1], y), Math.max(drag[0], x), Math.max(drag[1], y)] }, hl: {}, pruned: [], cnt: null, note: 'Bırakınca arama başlar…' }); render(f); });
    window.addEventListener('mouseup', e => { if (mode !== 'range' || !drag) return; const [x, y] = canvasXY(pc, e, PW, PH); const q = [Math.min(drag[0], x), Math.min(drag[1], y), Math.max(drag[0], x), Math.max(drag[1], y)]; drag = null; if (q[2] - q[0] > 4 && q[3] - q[1] > 4) rangeSearch(q.map(v => Math.max(0, v))); });
    const modeSel = select({ insert: '➕ Nokta ekle (tıkla)', range: '▭ Aralık arama (sürükle)', nearest: '🎯 En yakın komşu (tıkla)' }, mode, v => { mode = v; hint.textContent = hints[v]; });
    const hints = { insert: 'Sol tarafa tıklayarak nokta ekleyin.', range: 'Sol tarafta fareyle bir dikdörtgen çizin.', nearest: 'Sol tarafta bir yere tıklayın: oraya en yakın nokta aranır.' };
    const hint = el('span', { class: 'mini' }, hints[mode]);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Mod ', modeSel), btn('🎲 20 nokta', () => randomPts(20)), btn('🧹', () => { kd = new KD(PW, PH); fp.load([base('Boş düzlem. Tıklayarak nokta ekleyin.')]); }),
      btn('▶ Örnek sorgu', () => { if (mode === 'range') rangeSearch([PW * 0.3, PH * 0.25, PW * 0.7, PH * 0.7]); else if (mode === 'nearest') nearest(PW * 0.62, PH * 0.4); else addPoint(30 + Math.random() * (PW - 60), 30 + Math.random() * (PH - 60)); }), hint),
    el('div', { class: 'geo-row' }, pc, tc), SL.transport(fp, { min: 0.3, max: 10 }), note, stat);
    const n0 = d.n != null ? +d.n : 12;
    if (n0) randomPts(n0); else fp.load([base('Boş düzlem. Tıklayarak nokta ekleyin.')]);
    SL.onTheme(() => fp.render());
    return { stop: () => fp.pause() };
  };

  /* ================= En yakın komşu: kaba kuvvet vs 2d-ağacı ================= */
  D.nnbench = function (root) {
    const tbl = el('table', { class: 'dbl-t' });
    let busy = false;
    const run = async () => {
      if (busy) return; busy = true;
      tbl.innerHTML = '<tr><th>N (düşman)</th><th>Q (sorgu)</th><th>kaba kuvvet: mesafe hesabı</th><th>süre</th><th>2d-ağacı: mesafe hesabı</th><th>süre</th></tr>';
      const Q = 1000;
      for (const N of [1000, 10000, 100000]) {
        await new Promise(r => setTimeout(r, 40));
        const xs = new Float64Array(N), ys = new Float64Array(N);
        for (let i = 0; i < N; i++) { xs[i] = Math.random(); ys[i] = Math.random(); }
        const qx = Array.from({ length: Q }, Math.random), qy = Array.from({ length: Q }, Math.random);
        let t0 = performance.now(), bd = 0, sink = 0;
        for (let q = 0; q < Q; q++) { let b = Infinity; for (let i = 0; i < N; i++) { const dx = xs[i] - qx[q], dy = ys[i] - qy[q], d2 = dx * dx + dy * dy; if (d2 < b) b = d2; } bd += N; sink += b; }
        const tb = performance.now() - t0;
        // 2d-ağacı (dizi tabanlı)
        const L = new Int32Array(N).fill(-1), R = new Int32Array(N).fill(-1), V = new Uint8Array(N);
        for (let i = 1; i < N; i++) { let x = 0; for (;;) { const left = V[x] ? ys[i] < ys[x] : xs[i] < xs[x]; const nx = left ? L[x] : R[x]; if (nx < 0) { if (left) L[x] = i; else R[x] = i; V[i] = V[x] ^ 1; break; } x = nx; } }
        t0 = performance.now(); let kdd = 0;
        for (let q = 0; q < Q; q++) {
          const px = qx[q], py = qy[q]; let b = Infinity;
          const st = [[0, 0, 0, 1, 1]];
          while (st.length) {
            const [x, x0, y0, x1, y1] = st.pop();
            const dx0 = Math.max(x0 - px, 0, px - x1), dy0 = Math.max(y0 - py, 0, py - y1);
            if (dx0 * dx0 + dy0 * dy0 >= b) continue;
            kdd++; const dx = xs[x] - px, dy = ys[x] - py, d2 = dx * dx + dy * dy; if (d2 < b) b = d2;
            let a, c;
            if (V[x]) { a = L[x] >= 0 ? [L[x], x0, y0, x1, ys[x]] : null; c = R[x] >= 0 ? [R[x], x0, ys[x], x1, y1] : null; if (py >= ys[x]) [a, c] = [c, a]; }
            else { a = L[x] >= 0 ? [L[x], x0, y0, xs[x], y1] : null; c = R[x] >= 0 ? [R[x], xs[x], y0, x1, y1] : null; if (px >= xs[x]) [a, c] = [c, a]; }
            if (c) st.push(c); if (a) st.push(a);
          }
          sink -= b;
        }
        const tk = performance.now() - t0;
        tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(N)}</td><td>${fmt(Q)}</td><td class="c-red">${fmt(bd)}</td><td>${tb.toFixed(1)} ms</td><td class="c-green"><b>${fmt(kdd)}</b></td><td><b>${tk.toFixed(1)} ms</b></td></tr>`);
        if (sink === 12345) console.log(sink);
      }
      busy = false;
    };
    root.append(el('div', { class: 'sv-controls' }, btn('🧪 Ölçümü başlat', run, 'primary'), el('span', { class: 'mini' }, 'N rastgele düşman, 1000 sorgu: “her soruya en yakın düşman kim?”')), tbl);
    tbl.innerHTML = '<tr><td class="mini">“Ölçümü başlat”a basın.</td></tr>';
  };

  /* ================= Aralık arama ağacı ================= */
  class IST {
    constructor() { this.root = null; this.nid = 0; this.all = []; }
    snap(x = this.root) { return x ? { id: x.id, key: `${x.lo}–${x.hi}`, n: x.max, l: this.snap(x.l), r: this.snap(x.r) } : null; }
    insert(lo, hi, F) {
      const nd = { id: ++this.nid, lo, hi, max: hi, l: null, r: null };
      const P = (note, hl) => F && F.push({ tree: this.snap(), hl, note, n: this.all.length });
      if (!this.root) { this.root = nd; this.all.push(nd); P(`[${lo}, ${hi}] kök oldu`, { [nd.id]: 'new' }); return; }
      let x = this.root; const path = {};
      for (;;) {
        path[x.id] = 'path';
        if (hi > x.max) x.max = hi;
        const left = lo < x.lo;
        const nx = left ? x.l : x.r;
        if (!nx) { if (left) x.l = nd; else x.r = nd; this.all.push(nd); P(`[${lo}, ${hi}] eklendi (anahtar = sol uç ${lo}). Yol üstündeki düğümlerin max değerleri güncellendi (max, bitiş ${hi} değerinden küçükse ona yükseltilir).`, Object.assign({}, path, { [nd.id]: 'new' })); return; }
        x = nx;
      }
    }
  }
  D.interval = function (root) {
    const d = root.dataset;
    const TW = 1180, TH = 120;
    const tl = el('canvas'), tctx = SL.setupCanvas(tl, TW, TH);
    const tc = el('canvas');
    const tv = new SL.TreeView(tc, 1180, +(d.h || 230), { maxSp: 90, maxR: 26, sizes: true });
    const note = el('div', { class: 'sv-note tree-note' });
    let m = new IST();
    const SPAN = 30;
    const draw = f => {
      const t = T(); tctx.clearRect(0, 0, TW, TH);
      const X = v => 30 + (v / SPAN) * (TW - 60);
      tctx.strokeStyle = t.rule; tctx.fillStyle = t.muted; tctx.font = '600 11px "JetBrains Mono"'; tctx.textAlign = 'center';
      for (let v = 0; v <= SPAN; v += 2) { tctx.beginPath(); tctx.moveTo(X(v), TH - 16); tctx.lineTo(X(v), TH - 10); tctx.stroke(); tctx.fillText(v, X(v), TH - 1); }
      if (f.q) { tctx.fillStyle = t.dark ? 'rgba(95,240,160,0.18)' : 'rgba(30,160,90,0.15)'; tctx.fillRect(X(f.q[0]), 0, X(f.q[1]) - X(f.q[0]), TH - 18); tctx.strokeStyle = t.green; tctx.lineWidth = 2; tctx.strokeRect(X(f.q[0]), 0.5, X(f.q[1]) - X(f.q[0]), TH - 19); }
      const rows = [];
      m.all.slice(0, f.n).slice().sort((a, b) => a.lo - b.lo).forEach(nd => {
        let r = rows.findIndex(end => end < nd.lo); if (r < 0) { r = rows.length; rows.push(-1); } rows[r] = nd.hi + 0.6;
        const s = (f.hl || {})[nd.id], col = s === 'found' || s === 'new' ? t.green : s === 'cur' ? t.amber : s === 'visited' || s === 'path' ? t.blue : t['ink-2'];
        const y = 8 + r * 22;
        tctx.fillStyle = col; tctx.globalAlpha = s ? 1 : 0.55; tctx.fillRect(X(nd.lo), y, Math.max(4, X(nd.hi) - X(nd.lo)), 14); tctx.globalAlpha = 1;
        tctx.fillStyle = t.ink; tctx.font = '700 11px "JetBrains Mono"'; tctx.textAlign = 'left'; tctx.fillText(`${nd.lo}–${nd.hi}`, X(nd.hi) + 4, y + 11);
      });
      tv.show({ root: f.tree, hl: f.hl || {} });
      note.textContent = f.note;
    };
    const fp = new SL.FramePlayer(draw, { speed: 1.2 });
    const BOOK = [[17, 19], [5, 8], [21, 24], [4, 8], [15, 18], [7, 10], [16, 22]];
    const load = list => { m = new IST(); const F = [{ tree: null, hl: {}, note: 'Boş ağaç. Aralıklar sol uçlarına göre BST’ye eklenecek: ' + list.map(a => `[${a[0]}, ${a[1]}]`).join(' '), n: 0 }]; list.forEach(([a, b]) => m.insert(a, b, F)); fp.load(F); fp.play(); };
    const search = (lo, hi) => {
      const F = [], hl = {};
      const P = note => F.push({ tree: m.snap(), hl: Object.assign({}, hl), note, q: [lo, hi], n: m.all.length });
      P(`Sorgu [${lo}, ${hi}]: bununla kesişen BİR aralık bul. Kökten başla.`);
      let x = m.root;
      while (x) {
        const hit = x.lo <= hi && lo <= x.hi;
        if (hit) { hl[x.id] = 'found'; P(`[${x.lo}, ${x.hi}] sorguyla KESİŞİYOR ✔ Bulundu!`); return fp.load(F), fp.play(); }
        hl[x.id] = 'visited';
        if (!x.l) { P(`[${x.lo}, ${x.hi}] kesişmiyor. Sol alt ağaç boş → SAĞA git`); x = x.r; }
        else if (x.l.max < lo) { P(`[${x.lo}, ${x.hi}] kesişmiyor. Sol alt ağacın max’ı ${x.l.max} < ${lo} → soldaki aralıkların hepsi sorgudan önce bitiyor → SAĞA git`); x = x.r; }
        else { P(`[${x.lo}, ${x.hi}] kesişmiyor. Sol alt ağacın max’ı ${x.l.max} ≥ ${lo} → SOLA git (solda yoksa sağda da yoktur!)`); x = x.l; }
      }
      P(`null’a ulaştık → [${lo}, ${hi}] ile kesişen aralık YOK.`);
      fp.load(F); fp.play();
    };
    const qin = el('input', { type: 'text', class: 'key-in', size: 6, value: d.q || '23 25' });
    const ain = el('input', { type: 'text', class: 'key-in', size: 6, value: '11 13' });
    const parse = s => { const v = s.trim().split(/[\s,–-]+/).map(Number); return v.length === 2 && v.every(Number.isFinite) && v[0] <= v[1] && v[0] >= 0 && v[1] <= SPAN ? v : null; };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('▶ Kitaptaki örnek', () => load(BOOK)),
      el('label', { class: 'ctl' }, 'Sorgu ', qin), btn('🔍 Ara', () => { const v = parse(qin.value); if (v) search(v[0], v[1]); }, 'primary'),
      el('label', { class: 'ctl' }, 'Aralık ', ain), btn('➕ Ekle', () => { const v = parse(ain.value); if (v) { const F = []; m.insert(v[0], v[1], F); fp.load(F); fp.play(); } }),
      btn('🧹', () => { m = new IST(); fp.load([{ tree: null, hl: {}, note: 'Boş ağaç', n: 0 }]); })),
    tl, tc, SL.transport(fp, { min: 0.3, max: 8 }), note);
    SL.onTheme(() => fp.render());
    m = new IST(); BOOK.forEach(([a, b]) => m.insert(a, b));
    fp.load([{ tree: m.snap(), hl: {}, note: 'Kitaptaki 7 aralık. Düğümde “sol–sağ uç”; sağ üstteki küçük sayı = alt ağaçtaki EN BÜYÜK bitiş (max).', n: m.all.length }]);
    return { stop: () => fp.pause() };
  };

  /* ================= Sweep and prune (geniş faz çarpışma) ================= */
  D.sap = function (root) {
    const W = 1180, H = 330, AX = 26;
    const c = el('canvas'), ctx = SL.setupCanvas(c, W, H);
    const stat = el('div', { class: 'sv-counters' });
    let N = 80, boxes = [], order = [], raf = 0, playing = true, running = false, method = 'sap', last = null;
    const make = () => { boxes = Array.from({ length: N }, () => { const w = 10 + Math.random() * 26, h = 10 + Math.random() * 26; return { x: Math.random() * (W - w), y: Math.random() * (H - AX - h), w, h, vx: (Math.random() - 0.5) * 2.4, vy: (Math.random() - 0.5) * 2.4, hit: false }; }); order = boxes.map((_, i) => i); };
    const step = () => {
      boxes.forEach(b => { b.x += b.vx; b.y += b.vy; if (b.x < 0 || b.x + b.w > W) b.vx *= -1; if (b.y < 0 || b.y + b.h > H - AX) b.vy *= -1; b.x = Math.max(0, Math.min(W - b.w, b.x)); b.y = Math.max(0, Math.min(H - AX - b.h, b.y)); b.hit = false; });
      const ov = (a, b) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
      let tests = 0, pairs = 0, swaps = 0;
      const t0 = performance.now();
      if (method === 'brute') {
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { tests++; if (ov(boxes[i], boxes[j])) { pairs++; boxes[i].hit = boxes[j].hit = true; } }
      } else {
        // 1) x'e göre sırala: önceki kareden NEREDEYSE sıralı → insertion sort!
        for (let i = 1; i < order.length; i++) { const k = order[i]; let j = i - 1; while (j >= 0 && boxes[order[j]].x > boxes[k].x) { order[j + 1] = order[j]; j--; swaps++; } order[j + 1] = k; }
        // 2) süpür: aktif listede x aralığı çakışanlar
        const active = [];
        for (const k of order) {
          const b = boxes[k];
          for (let a = active.length - 1; a >= 0; a--) { const o = boxes[active[a]]; if (o.x + o.w < b.x) { active[a] = active[active.length - 1]; active.pop(); } }
          for (const a of active) { tests++; const o = boxes[a]; if (o.y <= b.y + b.h && b.y <= o.y + o.h) { pairs++; o.hit = b.hit = true; } }
          active.push(k);
        }
      }
      last = { tests, pairs, swaps, ms: performance.now() - t0 };
    };
    const draw = () => {
      const t = T(); ctx.clearRect(0, 0, W, H);
      boxes.forEach(b => {
        ctx.fillStyle = b.hit ? (t.dark ? 'rgba(255,92,122,0.45)' : 'rgba(220,40,70,0.35)') : 'transparent';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = b.hit ? t.red : t['ink-2']; ctx.lineWidth = b.hit ? 2 : 1.2; ctx.strokeRect(b.x, b.y, b.w, b.h);
        if (method === 'sap') { ctx.fillStyle = b.hit ? t.red : t.blue; ctx.globalAlpha = 0.35; ctx.fillRect(b.x, H - AX + 6 + (b.y % 14), b.w, 3); ctx.globalAlpha = 1; }
      });
      ctx.strokeStyle = t.rule; ctx.beginPath(); ctx.moveTo(0, H - AX + 2); ctx.lineTo(W, H - AX + 2); ctx.stroke();
      ctx.fillStyle = t.muted; ctx.font = '600 11px "JetBrains Mono"'; ctx.textAlign = 'right'; ctx.fillText(method === 'sap' ? 'x eksenine izdüşümler (aralıklar)' : '', W - 6, H - 4);
      if (last) stat.innerHTML = `<span class="cnt">kutu <b>${N}</b></span><span class="cnt">çift testi <b>${fmt(last.tests)}</b></span><span class="cnt">kaba kuvvet olsaydı <b>${fmt((N * (N - 1)) / 2)}</b></span><span class="cnt">çakışan çift <b>${last.pairs}</b></span>` + (method === 'sap' ? `<span class="cnt">insertion sort kaydırma <b>${last.swaps}</b></span>` : '');
    };
    const loop = () => { if (!running) return; if (playing) { step(); draw(); } raf = requestAnimationFrame(loop); };
    const playBtn = btn('⏸ Durdur', () => { playing = !playing; playBtn.textContent = playing ? '⏸ Durdur' : '▶ Oynat'; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Yöntem ', select({ sap: 'Sweep and prune', brute: 'Kaba kuvvet (her çift)' }, method, v => { method = v; step(); draw(); })),
      slider('Kutu', 10, 600, N, 10, v => { N = v; make(); step(); draw(); }),
      playBtn, btn('İleri ▶| (1 kare)', () => { playing = false; playBtn.textContent = '▶ Oynat'; step(); draw(); })), c, stat);
    make(); step(); draw();
    SL.onTheme(draw);
    return { start() { if (!running) { running = true; loop(); } }, stop() { running = false; cancelAnimationFrame(raf); } };
  };

  /* ================= .geolab ================= */
  const PY_G = `
import json
class Rect:
    def __init__(self, xmin, ymin, xmax, ymax):
        self.xmin = xmin; self.ymin = ymin; self.xmax = xmax; self.ymax = ymax
    def __repr__(self):
        return "Rect(%d, %d, %d, %d)" % (self.xmin, self.ymin, self.xmax, self.ymax)
def _run(task, cases):
    res = []
    for c in cases:
        try:
            if task == "interval":
                r = intersects(tuple(c[0]), tuple(c[1]))
            else:
                r = overlaps(Rect(*c[0]), Rect(*c[1]))
            res.append([r if isinstance(r, bool) else None, None if isinstance(r, bool) else "True/False yerine " + repr(r) + " döndü"])
        except BaseException as e:
            res.append([None, type(e).__name__ + ": " + str(e)])
    return json.dumps(res)
`;
  SL.GeoLab = function (root) {
    const task = root.dataset.task || 'interval';
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const ivHit = (a, b) => a[0] <= b[1] && b[0] <= a[1];
    const expect = c => task === 'interval' ? ivHit(c[0], c[1]) : ivHit([c[0][0], c[0][2]], [c[1][0], c[1][2]]) && ivHit([c[0][1], c[0][3]], [c[1][1], c[1][3]]);
    const cases = () => {
      const cs = [];
      const iv = () => { const a = rint(10), b = a + rint(6); return [a, b]; };
      if (task === 'interval') { cs.push([[1, 3], [3, 5]], [[3, 5], [1, 3]], [[1, 2], [4, 5]], [[4, 5], [1, 2]], [[1, 9], [3, 4]], [[3, 4], [1, 9]], [[2, 2], [2, 2]]); for (let i = 0; i < 200; i++) cs.push([iv(), iv()]); }
      else { const rc = () => { const [x0, x1] = iv(), [y0, y1] = iv(); return [x0, y0, x1, y1]; }; cs.push([[0, 0, 4, 4], [4, 4, 6, 6]], [[0, 0, 4, 4], [5, 0, 6, 4]], [[0, 0, 10, 10], [2, 2, 3, 3]], [[2, 2, 3, 3], [0, 0, 10, 10]], [[0, 0, 4, 2], [1, 3, 2, 5]], [[0, 0, 10, 1], [3, -2, 4, 5]]); for (let i = 0; i < 300; i++) cs.push([rc(), rc()]); }
      return cs;
    };
    const show = c => task === 'interval' ? `a = [${c[0]}], b = [${c[1]}]` : `a = (${c[0].join(', ')}), b = (${c[1].join(', ')})`;
    const report = (cs, res) => {
      const bad = cs.findIndex((c, i) => res[i][1] || res[i][0] !== expect(c));
      const ok = cs.length - cs.filter((c, i) => res[i][1] || res[i][0] !== expect(c)).length;
      if (bad >= 0) {
        view.innerHTML = `<div class="mini">Başarısız test:</div><div class="ll-chips"><span class="ll-chip">${show(cs[bad])}</span></div><div class="mini">beklenen: <b>${expect(cs[bad])}</b> · seninki: <b class="c-red">${res[bad][1] ? '⚠️ ' + res[bad][1] : res[bad][0]}</b></div>` + (task === 'interval' && cs[bad][0][1] === cs[bad][1][0] || task !== 'interval' && (cs[bad][0][2] === cs[bad][1][0] || cs[bad][0][3] === cs[bad][1][1]) ? '<div class="mini">💡 Uçlar <b>değiyor</b>. Kapalı aralık: değmek = kesişmek sayılır.</div>' : '');
        shell.setMsg('err', `❌ ${ok}/${cs.length} test geçti.`);
      } else { view.innerHTML = `<div class="mini">Örnek: ${show(cs[0])} → ${expect(cs[0])}</div>`; shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`); }
    };
    const fname = task === 'interval' ? 'intersects' : 'overlaps';
    shell.onRun = async () => {
      shell.clearOut();
      const cs = cases(), code = shell.cm.getValue();
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_G); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_cases', py.toPy(cs)); py.globals.set('_task', task);
        let res; try { res = JSON.parse(py.runPython('_run(_task, _cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        report(cs, res.map(([r, e]) => [r, e && SL.pyErrorText(e)]));
        return;
      }
      let fn;
      try { fn = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + `\n;if (typeof ${fname} !== 'function') throw new Error("Kodda '${fname}(a, b)' fonksiyonu bulunamadı."); return ${fname};`)(shell.print, SL.makeGuard(100000)); }
      catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      const toR = a => ({ xmin: a[0], ymin: a[1], xmax: a[2], ymax: a[3] });
      report(cs, cs.map(c => { try { const r = task === 'interval' ? fn(c[0].slice(), c[1].slice()) : fn(toR(c[0]), toR(c[1])); return typeof r === 'boolean' ? [r, null] : [null, 'true/false yerine ' + JSON.stringify(r) + ' döndü']; } catch (e) { return [null, SL.jsErrorText(e)]; } }));
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.geolab', SL.GeoLab);
})();
