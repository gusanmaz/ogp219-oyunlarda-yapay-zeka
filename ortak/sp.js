/* =====================================================================
   sp.js — En kısa yollar (core.js + graf.js gerekir)
   Demolar: relax (gevşetme), dijkstra (iz tablosu + indeksli PQ),
            gridpath (arazi maliyetli harita: BFS / Dijkstra / Dijkstra
            haritası), cpm (DAG’de en uzun yol: kritik yol),
            arbitrage (Bellman–Ford ile negatif döngü)
   Bileşen: .splab (dijkstra yaz)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);
  const f2 = x => (x === Infinity ? '∞' : x === -Infinity ? '−∞' : (Math.round(x * 100) / 100).toFixed(2).replace(/^0\./, '.').replace(/^-0\./, '−.'));

  const EWD = '4-5-.35 5-4-.35 4-7-.37 5-7-.28 7-5-.28 5-1-.32 0-4-.38 0-2-.26 7-3-.39 1-3-.29 2-7-.34 6-2-.40 3-6-.52 6-0-.58 6-4-.93';
  SL.GRAPHS.tinyEWD = () => SL.Graph(8, EWD.split(' ').map(s => { const [a, b, w] = s.split('-'); return [+a, +b, +w]; }),
    [[300, 45], [300, 320], [440, 110], [480, 290], [170, 150], [130, 290], [580, 190], [300, 200]], { directed: true, weighted: true });

  /* ---------- min-yığın (grid ve lab için) ---------- */
  class Heap { constructor() { this.a = []; } get size() { return this.a.length; } push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } } pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } }
  SL.MinHeap = Heap;

  /* ---------- gevşetme ---------- */
  D.relax = function (root) {
    let dv = 3, dw = 10, wt = 4;
    const out = el('div');
    const draw = () => {
      const better = dv + wt < dw, t = T();
      out.innerHTML = `<svg viewBox="0 0 640 170" style="width:100%;max-width:640px" font-family="JetBrains Mono">
        <defs><marker id="rx-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${better ? t.green : t['ink-2']}"/></marker></defs>
        <circle cx="60" cy="85" r="24" fill="${t.card}" stroke="${t['ink-2']}" stroke-width="2"/><text x="60" y="91" text-anchor="middle" font-size="18" font-weight="700" fill="${t.ink}">s</text>
        <path d="M86,80 C150,20 230,20 280,70" fill="none" stroke="${t.muted}" stroke-width="2" stroke-dasharray="6 5"/><text x="185" y="30" text-anchor="middle" font-size="14" fill="${t.muted}">distTo[v] = ${dv}</text>
        <path d="M84,96 C220,175 440,175 556,100" fill="none" stroke="${better ? t.muted : t.amber}" stroke-width="${better ? 2 : 4}" stroke-dasharray="6 5"/><text x="330" y="166" text-anchor="middle" font-size="14" fill="${t.ink}">distTo[w] = ${dw} (şimdiki en iyi)</text>
        <circle cx="300" cy="85" r="24" fill="${t.blue}"/><text x="300" y="91" text-anchor="middle" font-size="18" font-weight="700" fill="#fff">v</text>
        <line x1="326" y1="85" x2="548" y2="85" stroke="${better ? t.green : t['ink-2']}" stroke-width="${better ? 5 : 2.5}" marker-end="url(#rx-a)"/><rect x="415" y="70" width="44" height="26" rx="6" fill="${t.card}" stroke="${t.rule}"/><text x="437" y="89" text-anchor="middle" font-size="15" font-weight="700" fill="${t.ink}">${wt}</text>
        <circle cx="580" cy="85" r="24" fill="${better ? t.green : t.card}" stroke="${better ? t.green : t['ink-2']}" stroke-width="2"/><text x="580" y="91" text-anchor="middle" font-size="18" font-weight="700" fill="${better ? '#fff' : t.ink}">w</text></svg>
        <p class="lead">distTo[v] + ağırlık = ${dv} + ${wt} = <b>${dv + wt}</b> ${better ? '&lt;' : '≥'} distTo[w] = ${dw} → ${better ? `<b class="c-green">GEVŞET: distTo[w] = ${dv + wt}, edgeTo[w] = v</b>` : '<b>değişiklik yok</b> (v üzerinden gitmek daha iyi değil)'}</p>`;
    };
    root.append(el('div', { class: 'sv-controls' }, slider('distTo[v]', 0, 15, dv, 1, v => { dv = v; draw(); }), slider('v→w ağırlığı', 0, 15, wt, 1, v => { wt = v; draw(); }), slider('distTo[w]', 0, 25, dw, 1, v => { dw = v; draw(); })), out);
    draw(); SL.onTheme(draw);
  };

  /* ---------- Dijkstra (iz tablosu) ---------- */
  SL.dijkstraFrames = function (G, s) {
    const V = G.V, distTo = new Array(V).fill(Infinity), edgeTo = new Array(V).fill(-1), done = new Array(V).fill(false), pq = new Map(), F = [];
    const P = (note, cur, eid, kind) => {
      const ns = {}, es = {};
      for (let v = 0; v < V; v++) ns[v] = done[v] ? 'done' : pq.has(v) ? 'queue' : '';
      if (cur != null) ns[cur] = 'cur';
      for (let v = 0; v < V; v++) if (edgeTo[v] >= 0) es[edgeTo[v]] = 'tree';
      if (eid != null) es[eid] = kind || 'check';
      const badge = {}; distTo.forEach((d, v) => { if (d < Infinity) badge[v] = f2(d); });
      F.push({ ns, es, badge, note, pq: [...pq.entries()].sort((a, b) => a[1] - b[1]), cols: [{ name: 'distTo[]', vals: distTo.map(d => (d === Infinity ? '∞' : f2(d))) }, { name: 'edgeTo[]', vals: edgeTo.map(id => (id < 0 ? null : `${G.edges[id].v}→${G.edges[id].w}`)) }], hi: cur });
    };
    distTo[s] = 0; pq.set(s, 0);
    P(`Başlangıç: distTo[${s}] = 0, diğerleri ∞. PQ = {${s}: 0}`, s);
    while (pq.size) {
      let v = -1, best = Infinity; pq.forEach((d, x) => { if (d < best) { best = d; v = x; } });
      pq.delete(v); done[v] = true;
      P(`PQ’dan en küçük: ${v} (uzaklık ${f2(distTo[v])}). Artık KESİN. Okları gevşet:`, v);
      for (const a of G.adj[v]) {
        const e = G.edges[a.id], w = e.w;
        if (distTo[v] + e.wt < distTo[w]) {
          const old = distTo[w]; distTo[w] = distTo[v] + e.wt; edgeTo[w] = a.id;
          const had = pq.has(w); pq.set(w, distTo[w]);
          P(`${v}→${w} (${f2(e.wt)}): ${f2(distTo[v])} + ${f2(e.wt)} = ${f2(distTo[w])} < ${f2(old)} → gevşet! ${had ? 'PQ’da önceliği düşür' : 'PQ’ya ekle'}`, v, a.id, 'relax');
        } else P(`${v}→${w} (${f2(e.wt)}): ${f2(distTo[v])} + ${f2(e.wt)} = ${f2(distTo[v] + e.wt)} ≥ ${f2(distTo[w])} → değişiklik yok`, v, a.id);
      }
    }
    P('Bitti: yeşil kenarlar = en kısa yollar ağacı (SPT). Rozetler = kaynaktan en kısa uzaklık.');
    return F;
  };
  D.dijkstra = function (root) {
    const d = root.dataset, G = SL.GRAPHS[d.graph || 'tinyEWD']();
    let src = d.src != null ? +d.src : 0;
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    const gv = new SL.GraphView(left, { W: 640, H: 360 }); gv.setGraph(G);
    const note = el('div', { class: 'sv-note tree-note' });
    const fp = new SL.FramePlayer(f => {
      gv.render(f);
      right.innerHTML = SL.traceTable(G.V, f.cols, f.hi) + `<div class="mini">İndeksli PQ (düğüm: uzaklık):</div><div class="g-dq">${f.pq.map(([v, dd], i) => `<span class="${i === 0 ? 'on' : ''}">${v}: ${f2(dd)}</span>`).join('') || '<i>boş</i>'}</div>`;
      note.textContent = f.note;
    }, { speed: 1.2 });
    gv.click = v => { src = v; fp.load(SL.dijkstraFrames(G, src)); fp.play(); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, left, right), SL.transport(fp, { min: 0.3, max: 8 }), note);
    fp.load(SL.dijkstraFrames(G, src));
    return { stop: () => fp.pause() };
  };

  /* ---------- arazi maliyetli harita ---------- */
  const TERR = { wall: [-1, '🧱 duvar'], grass: [1, '🌿 çimen (1)'], forest: [3, '🌲 orman (3)'], swamp: [6, '🐊 bataklık (6)'], road: [0.5, '🛣️ yol (0,5)'] };
  SL.gridDijkstraFrames = function (m, s, t, mode) {
    const N = m.C * m.R, dist = new Float64Array(N).fill(Infinity), state = new Uint8Array(N), edgeTo = new Int32Array(N).fill(-1), F = [];
    const h = new Heap(); dist[s] = 0; h.push([0, s]); state[s] = 1;
    let expanded = 0;
    const path = () => { if (t == null || dist[t] === Infinity) return null; const p = []; for (let x = t; x !== -1; x = edgeTo[x]) p.push(x); return p; };
    const P = (note, cur, withPath) => F.push({ state: state.slice(), dist: Array.from(dist, x => (x === Infinity ? -1 : x)), cur, note, path: withPath ? path() : null, expanded, terrain: true, cost: t != null && dist[t] < Infinity ? dist[t] : null });
    const bfs = mode === 'bfs';
    if (bfs) { const q = [s]; let hd = 0; const steps = new Int32Array(N).fill(-1); steps[s] = 0; dist[s] = 0;
      while (hd < q.length) { const v = q[hd++]; state[v] = 2; expanded++; if (v === t) break; for (const w of m.nbrs(v)) if (steps[w] < 0) { steps[w] = steps[v] + 1; edgeTo[w] = v; dist[w] = dist[v] + m.cost[w]; state[w] = 1; q.push(w); } if (expanded % 6 === 0) P('BFS: arazi maliyetini bilmez, sadece adım sayar.', v); }
      P(`BFS yolu: ${path() ? path().length - 1 : '—'} adım ama maliyeti ${t != null && dist[t] < Infinity ? dist[t].toFixed(1) : '—'} (bataklıktan geçebilir!)`, null, true); return F; }
    while (h.size) {
      const [d, v] = h.pop(); if (state[v] === 2) continue; state[v] = 2; expanded++;
      if (mode === 'path' && v === t) { P(`Hedef PQ’dan çıktı → yolu kesin. Toplam maliyet ${d.toFixed(1)}`, v, true); return F; }
      for (const w of m.nbrs(v)) { const nd = d + m.cost[w]; if (nd < dist[w]) { dist[w] = nd; edgeTo[w] = v; state[w] = 1; h.push([nd, w]); } }
      if (expanded % 4 === 0) P(`Dijkstra: en düşük maliyetli sınır karesi genişletiliyor (maliyet ${d.toFixed(1)})`, v);
    }
    P(mode === 'map' ? 'Dijkstra haritası hazır: her karede hedefe olan maliyet. Bir NPC sadece “komşularımdan en küçüğüne git” der — yol bulma bitti!' : 'Hedefe ulaşılamadı.', null, mode !== 'map');
    return F;
  };
  D.gridpath = function (root) {
    const d = root.dataset, C = +(d.c || 36), R = +(d.r || 13), cell = +(d.cell || 30);
    const m = new SL.GridMap(C, R);
    let src = m.idx(2, Math.floor(R / 2)), dst = m.idx(C - 3, Math.floor(R / 2)), mode = d.mode || 'path', tool = 'swamp', painting = false;
    const c = el('canvas'), gv = new SL.GridView(c, m, cell);
    const note = el('div', { class: 'sv-note tree-note' }), stat = el('div', { class: 'sv-counters' });
    const fp = new SL.FramePlayer(f => { gv.draw(Object.assign({ src: mode === 'map' ? null : src, dst, showDist: mode === 'map' }, f)); note.textContent = f.note; stat.innerHTML = `<span class="cnt">genişletilen kare <b>${f.expanded}</b></span>` + (f.path ? `<span class="cnt">yol uzunluğu <b>${f.path.length - 1}</b> adım</span>` : '') + (f.cost != null && mode !== 'map' ? `<span class="cnt">yol maliyeti <b>${f.cost.toFixed(1)}</b></span>` : ''); }, { speed: 40 });
    const run = (play = true) => { m.wall[src] = 0; m.wall[dst] = 0; fp.load(mode === 'map' ? SL.gridDijkstraFrames(m, dst, null, 'map') : SL.gridDijkstraFrames(m, src, dst, mode)); if (play) fp.play(); };
    const paint = i => { if (i < 0 || i === src || i === dst) return; if (tool === 'wall') { m.wall[i] = 1; } else { m.wall[i] = 0; m.cost[i] = TERR[tool][0]; } };
    const idle = () => { fp.pause(); fp.frames = []; gv.draw({ src: mode === 'map' ? null : src, dst, terrain: true }); note.textContent = 'Araziyi boyayın, sonra ▶ Ara.'; stat.innerHTML = ''; };
    c.addEventListener('mousedown', e => { const i = gv.cellAt(e); if (i < 0) return; if (tool === 'src') { src = i; idle(); return; } if (tool === 'dst') { dst = i; idle(); return; } painting = true; paint(i); idle(); });
    c.addEventListener('mousemove', e => { if (!painting) return; paint(gv.cellAt(e)); gv.draw({ src, dst, terrain: true }); });
    window.addEventListener('mouseup', () => { painting = false; });
    const preset = () => {
      m.wall.fill(0); m.cost.fill(1);
      for (let r = 1; r < R - 1; r++) for (let cc = 12; cc < 24; cc++) m.cost[m.idx(cc, r)] = 6;          // bataklık
      for (let cc = 4; cc < C - 4; cc++) m.cost[m.idx(cc, 1)] = 0.5;                                       // kuzey yolu
      for (let r = 1; r < Math.floor(R / 2); r++) { m.cost[m.idx(4, r)] = 0.5; m.cost[m.idx(C - 5, r)] = 0.5; }
      for (let r = 0; r < R; r++) for (let cc = 0; cc < C; cc++) if ((cc < 4 || cc > C - 5) && Math.random() < 0.12) m.cost[m.idx(cc, r)] = 3;
      for (let r = 3; r < R - 1; r++) m.wall[m.idx(26, r)] = 1;
    };
    const tools = Object.fromEntries(Object.entries(TERR).map(([k, v]) => [k, v[1]])); tools.src = '🟢 başlangıç'; tools.dst = '🔴 hedef';
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Algoritma ', select({ path: 'Dijkstra (maliyet)', bfs: 'BFS (adım sayısı)', map: 'Dijkstra haritası (hedeften)' }, mode, v => { mode = v; run(); })),
      btn('▶ Ara', () => run(), 'primary'),
      el('label', { class: 'ctl' }, 'Fırça ', select(tools, tool, v => { tool = v; })),
      btn('↺ Hazır harita', () => { preset(); idle(); }), btn('🧹', () => { m.wall.fill(0); m.cost.fill(1); idle(); })),
    c, SL.transport(fp, { min: 2, max: 500, unit: 'kare/sn' }), note, stat);
    preset(); run(false); fp.toEnd();
    return { stop: () => fp.pause() };
  };

  /* ---------- DAG’de en uzun yol: kritik yol ---------- */
  D.cpm = function (root) {
    const names = ['Başla', 'Odun', 'Maden', 'Ot', 'Demir', 'Kalkan', 'İksir', 'Kılıç', 'Zırh', 'Hazır!'];
    const dur = [0, 2, 4, 1, 3, 3, 2, 5, 4, 0];
    const E = SL.parseEdges('0-1 0-2 0-3 2-4 1-5 4-5 3-6 4-7 1-7 4-8 5-9 6-9 7-9 8-9');
    const pos = [[60, 170], [210, 70], [210, 190], [210, 300], [380, 190], [550, 70], [550, 300], [550, 190], [720, 120], [860, 190]];
    const G = SL.Graph(10, E.map(([a, b]) => [a, b, dur[a]]), pos, { directed: true, weighted: true, labels: names.map((n, i) => (dur[i] ? `${n} (${dur[i]})` : n)) });
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    left.style.flex = '3.2'; right.style.flex = '1';
    const gv = new SL.GraphView(left, { W: 930, H: 360, r: 17 }); gv.setGraph(G);
    const note = el('div', { class: 'sv-note tree-note' });
    const order = SL.topoFrames(G).slice(-1)[0].order;
    const dist = new Array(10).fill(-Infinity), edgeTo = new Array(10).fill(-1), F = [];
    dist[0] = 0;
    const P = (note, cur, eid, crit) => {
      const ns = {}, es = {}, badge = {};
      dist.forEach((x, v) => { if (x > -Infinity) badge[v] = x; });
      if (cur != null) ns[cur] = 'cur';
      for (let v = 0; v < 10; v++) if (edgeTo[v] >= 0) es[edgeTo[v]] = 'tree';
      if (eid != null) es[eid] = 'check';
      if (crit) { for (let x = 9; edgeTo[x] >= 0; x = G.edges[edgeTo[x]].v) { es[edgeTo[x]] = 'path'; ns[x] = 'src'; } ns[0] = 'src'; }
      F.push({ ns, es, badge, note });
    };
    P(`Topolojik sırayla işle: ${order.map(v => names[v]).join(' → ')}. Rozet = en erken başlama zamanı.`);
    for (const v of order) {
      P(`${names[v]}: en erken ${dist[v]}. sn başlayabilir, ${dur[v]} sn sürer → bittiğinde ${dist[v] + dur[v]}. sn`, v);
      for (const a of G.adj[v]) { const e = G.edges[a.id]; if (dist[v] + e.wt > dist[e.w]) { dist[e.w] = dist[v] + e.wt; edgeTo[e.w] = a.id; P(`${names[e.w]} en erken ${dist[e.w]}. sn’de başlayabilir (EN UZUN ön koşul zincirini bekler)`, v, a.id); } }
    }
    P(`Bitti: en hızlı hazırlık ${dist[9]} sn (sınırsız işçiyle). Kırmızı = KRİTİK YOL: bu işlerden biri gecikirse her şey gecikir.`, null, null, true);
    const fp = new SL.FramePlayer(f => { gv.render(f); right.innerHTML = '<div class="mini">Her iş: (süre). Ok: “önce bu bitmeli”. Ağırlık = önceki işin süresi.</div>'; note.textContent = f.note; }, { speed: 1.2 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, left, right), SL.transport(fp, { min: 0.3, max: 8 }), note);
    fp.load(F);
    return { stop: () => fp.pause() };
  };

  /* ---------- Bellman–Ford: oyun ekonomisinde arbitraj ---------- */
  D.arbitrage = function (root) {
    const names = ['Altın', 'Gümüş', 'Mücevher', 'Kürk'];
    const rates = [[0, 1, 10], [1, 0, 0.09], [1, 2, 0.25], [2, 1, 3.9], [2, 0, 0.43], [0, 3, 2], [3, 0, 0.48], [3, 2, 0.2]];
    const G = SL.Graph(4, rates, [[110, 180], [380, 60], [650, 180], [380, 300]], { directed: true, weighted: true, labels: names });
    const W = rates.map(r => -Math.log(r[2]));
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    const gv = new SL.GraphView(left, { W: 760, H: 360, r: 20 }); gv.setGraph(G);
    const note = el('div', { class: 'sv-note tree-note' });
    const dist = [0, Infinity, Infinity, Infinity], edgeTo = [-1, -1, -1, -1], F = [];
    const P = (note, eid, kind, cyc, pass) => {
      const ns = {}, es = {}, badge = {};
      dist.forEach((x, v) => { if (x < Infinity) badge[v] = f2(x); });
      edgeTo.forEach(id => { if (id >= 0) es[id] = 'tree'; });
      if (eid != null) es[eid] = kind || 'check';
      if (cyc) cyc.forEach(id => (es[id] = 'path'));
      F.push({ ns, es, badge, note, pass });
    };
    P('Kenar ağırlığı = −ln(kur). Kurları ÇARPMAK yerine −ln’leri TOPLARIZ; çarpım > 1 ⇔ toplam < 0. Rozet = Altın’dan uzaklık.', null, null, null, 0);
    for (let pass = 1; pass <= 3; pass++) {
      G.edges.forEach((e, i) => {
        if (dist[e.v] + W[i] < dist[e.w] - 1e-12) { dist[e.w] = dist[e.v] + W[i]; edgeTo[e.w] = i; P(`Tur ${pass}: ${names[e.v]}→${names[e.w]} gevşedi (−ln ${e.wt} = ${f2(W[i])})`, i, 'relax', null, pass); }
      });
      P(`Tur ${pass} bitti (Bellman–Ford: V − 1 = 3 tur bütün kenarları gevşetir).`, null, null, null, pass);
    }
    let found = null;
    G.edges.forEach((e, i) => { if (!found && dist[e.v] + W[i] < dist[e.w] - 1e-9) found = i; });
    if (found != null) {
      let x = G.edges[found].w; for (let k = 0; k < 4; k++) x = G.edges[edgeTo[x]].v;
      const cyc = []; let y = x; do { cyc.push(edgeTo[y]); y = G.edges[edgeTo[y]].v; } while (y !== x && cyc.length < 6);
      const prod = cyc.reduce((p, id) => p * G.edges[id].wt, 1);
      P(`4. turda hâlâ gevşeyen kenar var → NEGATİF DÖNGÜ! ${cyc.slice().reverse().map(id => names[G.edges[id].v]).join(' → ')} → ${names[x]}: kurların çarpımı ${prod.toFixed(3)} > 1. Her turda %${((prod - 1) * 100).toFixed(1)} bedava kâr: SONSUZ ALTIN 💰`, found, 'check', cyc, 4);
    }
    const fp = new SL.FramePlayer(f => { gv.render(f); right.innerHTML = `<div class="mini">Tur: <b>${f.pass}</b></div><div class="mini">Okların üstündeki sayı = 1 birim karşılığında alınan miktar.</div>`; note.textContent = f.note; }, { speed: 1 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, left, right), SL.transport(fp, { min: 0.3, max: 6 }), note);
    fp.load(F);
    return { stop: () => fp.pause() };
  };

  /* ---------- .splab ---------- */
  const PY_SP = `
import json, sys
def _guard(limit=2000000):
    cnt = [0]
    def tr(frame, event, arg):
        cnt[0] += 1
        if cnt[0] > limit:
            raise RuntimeError("çok fazla adım — PQ hiç boşalmıyor olabilir (sadece İYİLEŞENLERİ ekliyor musun?)")
        return tr
    sys.settrace(tr)
def _run(cases):
    res = []
    for V, edges, s in cases:
        adj = [[] for _ in range(V)]
        for v, w, wt in edges:
            adj[v].append((w, wt))
        try:
            _guard()
            r = dijkstra(V, adj, s)
            sys.settrace(None)
            res.append([[(-1 if x == float("inf") else x) for x in r], None])
        except BaseException as e:
            sys.settrace(None)
            res.append([None, type(e).__name__ + ": " + str(e)])
    return json.dumps(res)
`;
  SL.SPLab = function (root) {
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const randG = () => { const V = 2 + rint(9), E = []; const m = rint(3 * V); for (let i = 0; i < m; i++) { const a = rint(V), b = rint(V); if (a !== b) E.push([a, b, 1 + rint(15)]); } return [V, E, 0]; };
    const ref = (V, E, s) => { const dist = new Array(V).fill(Infinity); dist[s] = 0; for (let k = 0; k < V; k++) for (const [a, b, w] of E) if (dist[a] + w < dist[b]) dist[b] = dist[a] + w; return dist.map(x => (x === Infinity ? -1 : x)); };
    shell.onRun = async () => {
      shell.clearOut();
      const code = shell.cm.getValue();
      const cs = [[2, [[0, 1, 5]], 0], [3, [[0, 1, 1], [1, 2, 1], [0, 2, 5]], 0], [4, [[0, 1, 10], [0, 2, 1], [2, 1, 2], [1, 3, 1]], 0]]; for (let t = 0; t < 40; t++) cs.push(randG());
      let res;
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_SP); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_cases', py.toPy(cs));
        try { res = JSON.parse(py.runPython('_run(_cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        res = res.map(([r, e]) => [r, e && SL.pyErrorText(e)]);
      } else {
        let fn;
        try { fn = new Function('print', '__g', 'MinHeap', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof dijkstra !== 'function') throw new Error(\"Kodda 'dijkstra(V, adj, s)' fonksiyonu bulunamadı.\"); return dijkstra;")(shell.print, SL.makeGuard(300000), Heap); }
        catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        res = cs.map(([V, E, s]) => { const adj = Array.from({ length: V }, () => []); E.forEach(([a, b, w]) => adj[a].push([b, w])); try { return [Array.from(fn(V, adj, s) || []).map(x => (x === Infinity ? -1 : x)), null]; } catch (e) { return [null, SL.jsErrorText(e)]; } });
      }
      for (let i = 0; i < cs.length; i++) {
        const want = ref(...cs[i]);
        if (res[i][1] || JSON.stringify(res[i][0]) !== JSON.stringify(want)) { view.innerHTML = `<div class="mini">V = ${cs[i][0]}, kenarlar (v → w, ağırlık): <b>${JSON.stringify(cs[i][1])}</b>, s = 0</div><div class="mini">beklenen dist: ${JSON.stringify(want).replace(/-1/g, '∞')}</div><div class="mini c-red">seninki: ${res[i][1] ? '⚠️ ' + res[i][1] : JSON.stringify(res[i][0]).replace(/-1/g, '∞')}</div>`; shell.setMsg('err', '❌ Test başarısız.'); return; }
      }
      view.innerHTML = `<div class="mini">Örnek: ${JSON.stringify(cs[2][1])} → dist = ${JSON.stringify(ref(...cs[2])).replace(/-1/g, '∞')}</div>`;
      shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.splab', SL.SPLab);
})();
