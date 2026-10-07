/* =====================================================================
   graf.js — Graf görselleştirme çekirdeği (core.js gerekir)
   - SL.Graph: graf modeli (komşuluk listeleri “torba” düzeninde: kitaptaki gibi
     yeni kenar listenin BAŞINA eklenir)
   - SL.GraphView: SVG çizim (düğüm/kenar stilleri, rozetler, tıklama)
   - SL.GridMap / SL.GridView: ızgara (karo) haritası ve canvas çizimi
   - Demolar: gview (gösterimler), gsearch (DFS/BFS iz tablosu), gridsearch
     (haritada BFS/DFS), islands (bağlı bileşenler)
   - Bileşen: .graflab (bfs / adaları say)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------------- model ---------------- */
  SL.Graph = function (V, edges, pos, o = {}) {
    const G = { V, E: edges.length, directed: !!o.directed, weighted: !!o.weighted, pos: pos || [], labels: o.labels || null, edges: [], adj: Array.from({ length: V }, () => []) };
    edges.forEach((e, id) => {
      const [v, w, wt] = e;
      G.edges.push({ v, w, wt, id });
      G.adj[v].unshift({ w, id, wt });
      if (!G.directed) G.adj[w].unshift({ w: v, id, wt });
    });
    G.eid = (v, w) => { const a = G.adj[v].find(x => x.w === w); return a ? a.id : -1; };
    G.name = v => (G.labels ? G.labels[v] : String(v));
    G.degree = v => G.adj[v].length;
    return G;
  };
  SL.parseEdges = s => s.trim().split(/\s+/).map(p => p.split('-').map(Number));

  /* Princeton örnek grafları (düğüm konumları elle) */
  SL.GRAPHS = {
    tinyCG: () => SL.Graph(6, SL.parseEdges('0-5 2-4 2-3 1-2 0-1 3-4 3-5 0-2'), [[90, 70], [210, 160], [330, 70], [470, 120], [420, 250], [120, 270]]),
    tinyG: () => SL.Graph(13, SL.parseEdges('0-5 4-3 0-1 9-12 6-4 5-4 0-2 11-12 9-10 0-6 7-8 9-11 5-3'),
      [[110, 60], [230, 60], [40, 150], [250, 300], [200, 200], [110, 270], [140, 150], [360, 60], [500, 60], [410, 170], [330, 250], [520, 220], [460, 300]]),
    friends: () => SL.Graph(12, SL.parseEdges('0-1 0-2 1-3 2-3 3-4 4-5 4-6 6-7 5-8 8-9 7-9 9-10 10-11 2-6'),
      [[60, 170], [150, 80], [150, 260], [250, 170], [350, 170], [440, 80], [440, 260], [540, 260], [540, 80], [630, 170], [720, 170], [800, 170]],
      { labels: ['Sen', 'Ece', 'Can', 'Deniz', 'Mert', 'Ayşe', 'Ali', 'Zeynep', 'Kerem', 'Selin', 'Burak', 'Pro Oyuncu'] })
  };

  /* ---------------- SVG görünüm ---------------- */
  const KC = ['#ff5c7a', '#4f8cff', '#2ec27e', '#f5a524', '#a970ff', '#14b8a6', '#ec4899', '#84cc16'];
  SL.GraphView = class {
    constructor(parent, o = {}) {
      this.o = Object.assign({ W: 600, H: 340, r: 17 }, o);
      this.svg = document.createElementNS(NS, 'svg'); this.svg.setAttribute('class', 'gv-svg');
      this.svg.setAttribute('viewBox', `0 0 ${this.o.W} ${this.o.H}`);
      parent.append(this.svg);
      this.click = null;
      this.svg.addEventListener('click', e => { const g = e.target.closest('[data-v]'); if (g && this.click) this.click(+g.dataset.v); });
      SL.onTheme(() => this.last && this.render(this.last));
    }
    setGraph(G) { this.G = G; }
    render(f = {}) {
      this.last = f;
      const t = T(), G = this.G, r = this.o.r, ns = f.ns || {}, es = f.es || {}, badge = f.badge || {};
      let s = `<defs><marker id="gv-arr-${this.uid || (this.uid = Math.random().toString(36).slice(2, 7))}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>`;
      const mk = `url(#gv-arr-${this.uid})`;
      const ecol = st => ({ tree: t.green, cur: t.amber, path: t.red, check: t.amber, mst: t.green, cand: t.purple, back: t.red, cross: t.muted, relax: t.blue }[st] || t['ink-2']);
      G.edges.forEach(e => {
        const st = es[e.id], [x1, y1] = G.pos[e.v], [x2, y2] = G.pos[e.w];
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        const ax = x1 + ux * r, ay = y1 + uy * r, bx = x2 - ux * (r + (G.directed ? 3 : 0)), by = y2 - uy * (r + (G.directed ? 3 : 0));
        const w = st === 'path' || st === 'mst' || st === 'tree' ? 4.5 : st === 'cur' ? 4 : st ? 3 : 1.8;
        const op = st === 'dim' ? 0.18 : st === 'cross' ? 0.5 : 1;
        // ters yönlü kenar varsa biraz kavisli çiz
        const twin = G.directed && G.edges.some(o => o.v === e.w && o.w === e.v);
        if (twin) { const mx = (ax + bx) / 2 - uy * 14, my = (ay + by) / 2 + ux * 14; s += `<path d="M${ax},${ay} Q${mx},${my} ${bx},${by}" fill="none" stroke="${ecol(st)}" stroke-width="${w}" opacity="${op}" ${st === 'check' ? 'stroke-dasharray="6 4"' : ''} ${G.directed ? `marker-end="${mk}"` : ''}/>`; }
        else s += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${ecol(st)}" stroke-width="${w}" opacity="${op}" stroke-linecap="round" ${st === 'check' ? 'stroke-dasharray="6 4"' : ''} ${G.directed ? `marker-end="${mk}"` : ''}/>`;
        if (G.weighted && f.weights !== false) {
          const mx = (x1 + x2) / 2 + (twin ? -uy * 14 : 0), my = (y1 + y2) / 2 + (twin ? ux * 14 : 0);
          const lab = typeof e.wt === 'number' ? (Number.isInteger(e.wt) ? e.wt : e.wt.toFixed(2).replace(/^0/, '')) : e.wt;
          s += `<rect x="${mx - 15}" y="${my - 10}" width="30" height="19" rx="5" fill="${t.card}" stroke="${st ? ecol(st) : t.rule}" opacity="${st === 'dim' ? 0.4 : 1}"/><text x="${mx}" y="${my + 5}" text-anchor="middle" font-size="12" font-weight="700" font-family="JetBrains Mono" fill="${t.ink}" opacity="${st === 'dim' ? 0.4 : 1}">${lab}</text>`;
        }
      });
      for (let v = 0; v < G.V; v++) {
        const [x, y] = G.pos[v], st = ns[v] || '';
        let fill = t.card, stroke = t['ink-2'], ink = t.ink, dash = '', op = 1, sw = 2;
        if (st === 'cur') { fill = t.amber; stroke = t.amber; ink = '#111'; }
        else if (st === 'marked') { fill = t.blue; stroke = t.blue; ink = '#fff'; }
        else if (st === 'done') { fill = t.green; stroke = t.green; ink = '#fff'; }
        else if (st === 'queue') { stroke = t.purple; dash = 'stroke-dasharray="4 3"'; sw = 3; }
        else if (st === 'src') { fill = t.red; stroke = t.red; ink = '#fff'; }
        else if (st === 'dim') op = 0.3;
        else if (/^k\d$/.test(st)) { fill = KC[+st[1] % KC.length]; stroke = fill; ink = '#fff'; }
        const lab = G.name(v), wide = lab.length > 2;
        s += `<g data-v="${v}" style="cursor:pointer" opacity="${op}">` + (wide ? `<rect x="${x - lab.length * 4.6 - 8}" y="${y - r + 2}" width="${lab.length * 9.2 + 16}" height="${2 * r - 4}" rx="${r - 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash}/>` : `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash}/>`) +
          `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="${wide ? 14 : 15}" font-weight="700" font-family="${wide ? 'Source Sans 3' : 'JetBrains Mono'}" fill="${ink}">${lab}</text></g>`;
        if (badge[v] != null) s += `<g><rect x="${x + r - 6}" y="${y - r - 12}" width="${String(badge[v]).length * 8 + 10}" height="18" rx="9" fill="${t.purple}"/><text x="${x + r - 1 + String(badge[v]).length * 4}" y="${y - r + 1}" text-anchor="middle" font-size="12" font-weight="700" font-family="JetBrains Mono" fill="#fff">${badge[v]}</text></g>`;
      }
      this.svg.innerHTML = s;
    }
  };
  SL.KCOLORS = KC;

  /* iz tablosu: cols = [{name, vals}] */
  SL.traceTable = (V, cols, hiRow, nameOf) => `<table class="g-trace"><tr><th>v</th>${cols.map(c => `<th>${c.name}</th>`).join('')}</tr>` +
    Array.from({ length: V }, (_, v) => `<tr class="${v === hiRow ? 'on' : ''}"><td><b>${nameOf ? nameOf(v) : v}</b></td>${cols.map(c => `<td>${c.vals[v] == null || c.vals[v] === -1 || c.vals[v] === false ? '' : c.vals[v] === true ? '✔' : c.vals[v]}</td>`).join('')}</tr>`).join('') + '</table>';

  /* ---------------- DFS / BFS kareleri ---------------- */
  SL.dfsFrames = function (G, s) {
    const V = G.V, marked = new Array(V).fill(false), edgeTo = new Array(V).fill(-1), done = new Array(V).fill(false), order = [];
    const F = [], stack = [];
    const P = (note, cur, chk) => {
      const ns = {}, es = {};
      for (let v = 0; v < V; v++) if (done[v]) ns[v] = 'done'; else if (marked[v]) ns[v] = 'marked';
      if (cur != null) ns[cur] = 'cur';
      for (let v = 0; v < V; v++) if (edgeTo[v] >= 0) es[G.eid(edgeTo[v], v)] = 'tree';
      if (chk) es[chk] = 'check';
      F.push({ ns, es, note, stack: stack.slice(), order: order.slice(), cols: [{ name: 'marked[]', vals: marked.slice() }, { name: 'edgeTo[]', vals: edgeTo.map(x => (x < 0 ? null : G.name(x))) }], hi: cur });
    };
    const dfs = v => {
      marked[v] = true; order.push(v); stack.push(v);
      P(`dfs(${G.name(v)}): ${G.name(v)} işaretle. Komşuları: ${G.adj[v].map(a => G.name(a.w)).join(', ') || '(yok)'}`, v);
      for (const a of G.adj[v]) {
        if (!marked[a.w]) { P(`${G.name(a.w)} işaretli değil → edgeTo[${G.name(a.w)}] = ${G.name(v)}, dfs(${G.name(a.w)}) çağır`, v, a.id); edgeTo[a.w] = v; dfs(a.w); P(`dfs(${G.name(a.w)}) bitti → ${G.name(v)} düğümüne geri dön (geri izleme)`, v); }
        else P(`${G.name(a.w)} zaten işaretli → atla`, v, a.id);
      }
      done[v] = true; stack.pop();
      P(`${G.name(v)} bitti (bütün komşularına bakıldı)`, stack.length ? stack[stack.length - 1] : null);
    };
    P(`DFS, kaynak ${G.name(s)}. Çağrı yığını boş.`);
    dfs(s);
    P(`Bitti. ${order.length} düğüme ulaşıldı. Yeşil kenarlar = DFS ağacı (edgeTo[]).`);
    return F;
  };
  SL.bfsFrames = function (G, s) {
    const V = G.V, marked = new Array(V).fill(false), edgeTo = new Array(V).fill(-1), distTo = new Array(V).fill(null), done = new Array(V).fill(false);
    const F = [], q = [];
    const P = (note, cur, chk) => {
      const ns = {}, es = {};
      for (let v = 0; v < V; v++) if (done[v]) ns[v] = 'done'; else if (marked[v]) ns[v] = 'queue';
      if (cur != null) ns[cur] = 'cur';
      for (let v = 0; v < V; v++) if (edgeTo[v] >= 0) es[G.eid(edgeTo[v], v)] = 'tree';
      if (chk) es[chk] = 'check';
      const badge = {}; distTo.forEach((d, v) => { if (d != null) badge[v] = d; });
      F.push({ ns, es, badge, note, queue: q.slice(), cols: [{ name: 'marked[]', vals: marked.slice() }, { name: 'edgeTo[]', vals: edgeTo.map(x => (x < 0 ? null : G.name(x))) }, { name: 'distTo[]', vals: distTo.slice() }], hi: cur });
    };
    marked[s] = true; distTo[s] = 0; q.push(s);
    P(`BFS, kaynak ${G.name(s)}: işaretle, kuyruğa koy (uzaklık 0).`, s);
    while (q.length) {
      const v = q.shift();
      P(`Kuyruktan ${G.name(v)} çıktı (uzaklık ${distTo[v]}). Komşularına bak: ${G.adj[v].map(a => G.name(a.w)).join(', ')}`, v);
      for (const a of G.adj[v]) {
        if (!marked[a.w]) { marked[a.w] = true; edgeTo[a.w] = v; distTo[a.w] = distTo[v] + 1; q.push(a.w); P(`${G.name(a.w)} yeni → işaretle, edgeTo = ${G.name(v)}, uzaklık ${distTo[a.w]}, kuyruğun SONUNA`, v, a.id); }
        else P(`${G.name(a.w)} zaten işaretli → atla`, v, a.id);
      }
      done[v] = true;
    }
    P('Bitti. Her düğümün mor rozeti = kaynağa en az kaç kenarla ulaşılır. Yeşil = BFS ağacı (en kısa yollar).');
    return F;
  };

  /* ---------------- demo: gösterimler ---------------- */
  D.gview = function (root) {
    const d = root.dataset, G = SL.GRAPHS[d.graph || 'tinyG']();
    let mode = 'list', sel = d.sel != null ? +d.sel : 0;
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    const gv = new SL.GraphView(left, { W: 560, H: 340 }); gv.setGraph(G);
    const draw = () => {
      const ns = { [sel]: 'cur' }, es = {};
      G.adj[sel].forEach(a => { ns[a.w] = 'marked'; es[a.id] = 'cur'; });
      gv.render({ ns, es });
      if (mode === 'list') right.innerHTML = `<div class="mini">Komşuluk listeleri <span class="en">adjacency lists</span> — bellek ~ V + 2E</div><div class="g-adj">${G.adj.map((l, v) => `<div class="${v === sel ? 'on' : ''}"><b>${v}</b>: ${l.map(a => `<span class="${v === sel ? 'nb' : ''}">${a.w}</span>`).join(' → ') || '<i>—</i>'}</div>`).join('')}</div>`;
      else if (mode === 'matrix') right.innerHTML = `<div class="mini">Komşuluk matrisi <span class="en">adjacency matrix</span> — bellek V² = ${G.V * G.V}</div><table class="g-mat"><tr><th></th>${Array.from({ length: G.V }, (_, j) => `<th>${j}</th>`).join('')}</tr>${Array.from({ length: G.V }, (_, i) => `<tr class="${i === sel ? 'on' : ''}"><th>${i}</th>${Array.from({ length: G.V }, (_, j) => `<td class="${G.eid(i, j) >= 0 ? 'one' : ''}">${G.eid(i, j) >= 0 ? 1 : 0}</td>`).join('')}</tr>`).join('')}</table>`;
      else right.innerHTML = `<div class="mini">Kenar listesi <span class="en">edge list</span> — bellek E; “${sel}’in komşuları?” için hepsine bak</div><div class="g-adj">${G.edges.map(e => `<div class="${e.v === sel || e.w === sel ? 'on' : ''}">${e.v} – ${e.w}</div>`).join('')}</div>`;
    };
    gv.click = v => { sel = v; draw(); };
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Gösterim ', select({ list: 'Komşuluk listeleri', matrix: 'Komşuluk matrisi', edges: 'Kenar listesi' }, mode, v => { mode = v; draw(); })), el('span', { class: 'mini' }, 'Bir düğüme tıklayın: komşuları vurgulanır.')), el('div', { class: 'gv-row' }, left, right));
    draw();
  };

  /* ---------------- demo: DFS / BFS iz tablosu ---------------- */
  D.gsearch = function (root) {
    const d = root.dataset;
    let G = SL.GRAPHS[d.graph || 'tinyCG'](), alg = d.alg || 'dfs', src = d.src != null ? +d.src : 0;
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    const gv = new SL.GraphView(left, { W: +(d.w || 560), H: +(d.h || 330) }); gv.setGraph(G);
    const note = el('div', { class: 'sv-note tree-note' });
    const fp = new SL.FramePlayer(f => {
      gv.render(f);
      const extra = f.stack ? `<div class="mini">Çağrı yığını <span class="en">call stack</span> (en üst sağda):</div><div class="g-dq">${f.stack.map(v => `<span>dfs(${G.name(v)})</span>`).join('') || '<i>boş</i>'}</div>` :
        f.queue ? `<div class="mini">Kuyruk <span class="en">queue</span> (soldan çıkar, sağa girer):</div><div class="g-dq">${f.queue.map(v => `<span>${G.name(v)}</span>`).join('') || '<i>boş</i>'}</div>` : '';
      right.innerHTML = (d.notable != null ? '' : SL.traceTable(G.V, f.cols, f.hi, G.labels ? G.name : null)) + extra;
      note.textContent = f.note;
    }, { speed: +(d.speed || 1.5) });
    const build = () => { fp.load(alg === 'dfs' ? SL.dfsFrames(G, src) : SL.bfsFrames(G, src)); };
    gv.click = v => { src = v; build(); fp.play(); };
    root.setAttribute('data-prevent-swipe', '');
    const ctl = el('div', { class: 'sv-controls' });
    if (d.algsel != null) ctl.append(el('label', { class: 'ctl' }, 'Algoritma ', select({ dfs: 'DFS (derinlik öncelikli)', bfs: 'BFS (genişlik öncelikli)' }, alg, v => { alg = v; build(); })));
    ctl.append(el('span', { class: 'mini' }, 'Kaynağı değiştirmek için bir düğüme tıklayın.'));
    if (d.notable != null) { left.style.flex = '3'; right.style.flex = '0.6'; }
    root.append(ctl, el('div', { class: 'gv-row' }, left, right), SL.transport(fp, { min: 0.3, max: 10 }), note);
    build();
    return { stop: () => fp.pause() };
  };

  /* ---------------- ızgara haritası ---------------- */
  SL.GridMap = class {
    constructor(C, R) { this.C = C; this.R = R; this.wall = new Uint8Array(C * R); this.cost = new Float32Array(C * R).fill(1); }
    idx(c, r) { return r * this.C + c; }
    rc(i) { return [i % this.C, Math.floor(i / this.C)]; }
    nbrs(i, diag) {
      const [c, r] = this.rc(i), out = [];
      const dirs = diag ? [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]] : [[1, 0], [0, 1], [-1, 0], [0, -1]];
      for (const [dc, dr] of dirs) { const cc = c + dc, rr = r + dr; if (cc >= 0 && rr >= 0 && cc < this.C && rr < this.R && !this.wall[this.idx(cc, rr)]) out.push(this.idx(cc, rr)); }
      return out;
    }
    randomWalls(p) { for (let i = 0; i < this.wall.length; i++) this.wall[i] = Math.random() < p ? 1 : 0; }
    maze() { // rastgele DFS labirenti (tek hücreler oda)
      this.wall.fill(1); const C = this.C, R = this.R, seen = new Uint8Array(C * R), st = [[1, 1]]; seen[this.idx(1, 1)] = 1; this.wall[this.idx(1, 1)] = 0;
      while (st.length) { const [c, r] = st[st.length - 1]; const opts = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([a, b]) => [c + a, r + b, c + a / 2, r + b / 2]).filter(([x, y]) => x > 0 && y > 0 && x < C - 1 && y < R - 1 && !seen[this.idx(x, y)]); if (!opts.length) { st.pop(); continue; } const [x, y, mx, my] = opts[rint(opts.length)]; seen[this.idx(x, y)] = 1; this.wall[this.idx(x, y)] = 0; this.wall[this.idx(mx, my)] = 0; st.push([x, y]); }
    }
  };
  SL.GridView = class {
    constructor(canvas, map, cell) { this.c = canvas; this.m = map; this.cell = cell; this.W = map.C * cell; this.H = map.R * cell; this.ctx = SL.setupCanvas(canvas, this.W, this.H); SL.onTheme(() => this.f && this.draw(this.f)); }
    draw(f = {}) {
      this.f = f; const t = T(), ctx = this.ctx, m = this.m, s = this.cell;
      ctx.clearRect(0, 0, this.W, this.H);
      const maxD = f.dist ? Math.max(1, ...Array.from(f.dist).filter(x => x >= 0 && x < 1e8)) : 1;
      for (let i = 0; i < m.C * m.R; i++) {
        const [c, r] = m.rc(i), x = c * s, y = r * s;
        if (m.wall[i]) { ctx.fillStyle = t.dark ? '#3a3f55' : '#4a4f63'; ctx.fillRect(x, y, s, s); continue; }
        if (f.terrain && m.cost[i] > 1) { ctx.fillStyle = m.cost[i] >= 5 ? (t.dark ? '#1d4d3a' : '#9fd8b8') : (t.dark ? '#4d4320' : '#ead9a0'); ctx.fillRect(x, y, s, s); }
        else if (f.terrain && m.cost[i] < 1) { ctx.fillStyle = t.dark ? '#3b3b3b' : '#d8d8d8'; ctx.fillRect(x, y, s, s); }
        const st = f.state ? f.state[i] : 0;
        if (st === 2 && f.dist && f.dist[i] >= 0) { const h = 200 - (f.dist[i] / maxD) * 160; ctx.fillStyle = `hsla(${h},80%,${t.dark ? 45 : 60}%,${f.terrain ? 0.55 : 0.85})`; ctx.fillRect(x, y, s, s); }
        else if (st === 2) { ctx.fillStyle = f.comp ? KC[f.comp[i] % KC.length] : (t.dark ? 'rgba(80,140,255,0.55)' : 'rgba(60,120,240,0.45)'); ctx.fillRect(x, y, s, s); }
        else if (st === 1) { ctx.fillStyle = t.dark ? 'rgba(200,140,255,0.55)' : 'rgba(150,80,230,0.4)'; ctx.fillRect(x, y, s, s); }
      }
      ctx.strokeStyle = t.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1;
      for (let c = 0; c <= m.C; c++) { ctx.beginPath(); ctx.moveTo(c * s, 0); ctx.lineTo(c * s, this.H); ctx.stroke(); }
      for (let r = 0; r <= m.R; r++) { ctx.beginPath(); ctx.moveTo(0, r * s); ctx.lineTo(this.W, r * s); ctx.stroke(); }
      if (f.showDist && f.dist && s >= 22) { ctx.fillStyle = t.ink; ctx.font = `600 ${Math.floor(s * 0.42)}px "JetBrains Mono"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (let i = 0; i < f.dist.length; i++) if (f.dist[i] >= 0 && f.dist[i] < 1e8 && !m.wall[i]) { const [c, r] = m.rc(i); ctx.fillText(Math.round(f.dist[i]), c * s + s / 2, r * s + s / 2 + 1); } }
      if (f.path && f.path.length) { ctx.strokeStyle = t.red; ctx.lineWidth = Math.max(3, s * 0.22); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); f.path.forEach((i, k) => { const [c, r] = m.rc(i); const x = c * s + s / 2, y = r * s + s / 2; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); }
      if (f.cur != null && f.cur >= 0) { const [c, r] = m.rc(f.cur); ctx.strokeStyle = t.amber; ctx.lineWidth = 3; ctx.strokeRect(c * s + 1.5, r * s + 1.5, s - 3, s - 3); }
      const mark = (i, col, ch) => { if (i == null || i < 0) return; const [c, r] = m.rc(i); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(c * s + s / 2, r * s + s / 2, s * 0.42, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.floor(s * 0.5)}px "JetBrains Mono"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, c * s + s / 2, r * s + s / 2 + 1); };
      mark(f.src, t.green, 'S'); mark(f.dst, t.red, 'H');
    }
    cellAt(e) { const r = this.c.getBoundingClientRect(); const x = ((e.clientX - r.left) * this.W) / r.width, y = ((e.clientY - r.top) * this.H) / r.height; const c = Math.floor(x / this.cell), rr = Math.floor(y / this.cell); return c >= 0 && rr >= 0 && c < this.m.C && rr < this.m.R ? this.m.idx(c, rr) : -1; }
  };
  /* ızgarada BFS / DFS kareleri (her genişletme bir kare) */
  SL.gridFrames = function (m, s, t, alg, diag) {
    const N = m.C * m.R, state = new Uint8Array(N), dist = new Int32Array(N).fill(-1), edgeTo = new Int32Array(N).fill(-1), F = [];
    let expanded = 0;
    const path = () => { if (dist[t] < 0) return []; const p = []; for (let x = t; x !== -1; x = edgeTo[x]) p.push(x); return p; };
    const P = (note, cur, withPath) => F.push({ state: state.slice(), dist: dist.slice(), cur, note, path: withPath ? path() : null, src: s, dst: t, expanded });
    if (alg === 'bfs') {
      const q = [s]; state[s] = 1; dist[s] = 0;
      P('BFS: başlangıç kuyrukta. Mor = kuyrukta (sınır), renkli = ziyaret edildi (renk = uzaklık).', s);
      while (q.length) {
        const v = q.shift(); state[v] = 2; expanded++;
        if (v === t) { P(`Hedefe ulaşıldı! Uzaklık ${dist[t]} adım — BFS’nin bulduğu yol EN KISA yoldur.`, v, true); return F; }
        for (const w of m.nbrs(v, diag)) if (state[w] === 0) { state[w] = 1; dist[w] = dist[v] + 1; edgeTo[w] = v; q.push(w); }
        P(`Genişletilen kare uzaklığı ${dist[v]} · kuyrukta ${q.length} kare`, v);
      }
    } else {
      const st = [s]; dist[s] = 0; state[s] = 1;
      P('DFS: başlangıç yığında. Hep EN SON eklenen kareyi genişletir: dar bir koridorda ilerler gibi.', s);
      while (st.length) {
        const v = st.pop(); if (state[v] === 2) continue; state[v] = 2; expanded++;
        if (v === t) { P(`Hedefe ulaşıldı: yol uzunluğu ${path().length - 1} adım. DFS yolu genellikle EN KISA DEĞİL!`, v, true); return F; }
        for (const w of m.nbrs(v, diag).reverse()) if (state[w] !== 2) { edgeTo[w] = v; dist[w] = dist[v] + 1; state[w] = 1; st.push(w); }
        P(`Genişletilen kare · yığında ${st.length} kare`, v);
      }
    }
    P('Hedefe ulaşılamadı: duvarlarla kapalı!', null, false);
    return F;
  };

  /* ---------------- demo: haritada BFS / DFS ---------------- */
  D.gridsearch = function (root) {
    const d = root.dataset, C = +(d.c || 36), R = +(d.r || 14), cell = +(d.cell || 30);
    const m = new SL.GridMap(C, R);
    let src = m.idx(2, Math.floor(R / 2)), dst = m.idx(C - 3, Math.floor(R / 2)), alg = d.alg || 'bfs', tool = 'wall', painting = -1, showDist = d.dist != null;
    const c = el('canvas'); const gv = new SL.GridView(c, m, cell);
    const note = el('div', { class: 'sv-note tree-note' }), stat = el('div', { class: 'sv-counters' });
    const fp = new SL.FramePlayer(f => { gv.draw(Object.assign({ showDist }, f)); note.textContent = f.note; stat.innerHTML = `<span class="cnt">genişletilen kare <b>${f.expanded}</b></span>` + (f.path ? `<span class="cnt">yol uzunluğu <b>${f.path.length ? f.path.length - 1 : '—'}</b></span>` : ''); }, { speed: 30 });
    const run = (play = true) => { m.wall[src] = 0; m.wall[dst] = 0; fp.load(SL.gridFrames(m, src, dst, alg, false)); if (play) fp.play(); };
    const idle = () => { fp.pause(); fp.frames = []; gv.draw({ src, dst }); note.textContent = 'Duvar çizin ya da başlangıcı/hedefi taşıyın, sonra ▶ Ara.'; };
    c.addEventListener('mousedown', e => { const i = gv.cellAt(e); if (i < 0) return; if (tool === 'src') { src = i; m.wall[i] = 0; idle(); } else if (tool === 'dst') { dst = i; m.wall[i] = 0; idle(); } else { painting = m.wall[i] ? 0 : 1; if (i !== src && i !== dst) m.wall[i] = painting; idle(); } });
    c.addEventListener('mousemove', e => { if (painting < 0) return; const i = gv.cellAt(e); if (i >= 0 && i !== src && i !== dst) { m.wall[i] = painting; gv.draw({ src, dst }); } });
    window.addEventListener('mouseup', () => { painting = -1; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Algoritma ', select({ bfs: 'BFS (kuyruk)', dfs: 'DFS (yığın)' }, alg, v => { alg = v; run(); })),
      btn('▶ Ara', () => run(), 'primary'),
      el('label', { class: 'ctl' }, 'Fare ', select({ wall: '🧱 duvar çiz/sil', src: '🟢 başlangıç', dst: '🔴 hedef' }, tool, v => { tool = v; })),
      btn('🎲 Rastgele duvar', () => { m.randomWalls(0.25); idle(); }), btn('🌀 Labirent', () => { m.maze(); src = m.idx(1, 1); dst = m.idx(C % 2 ? C - 2 : C - 3, R % 2 ? R - 2 : R - 3); idle(); }), btn('🧹', () => { m.wall.fill(0); idle(); })),
    c, SL.transport(fp, { min: 2, max: 400, unit: 'kare/sn' }), note, stat);
    if (d.preset === 'walls') { for (let r = 2; r < R - 2; r++) m.wall[m.idx(Math.floor(C / 2), r)] = 1; for (let cc = 8; cc < C / 2; cc++) m.wall[m.idx(cc, 3)] = 1; }
    run(false); fp.toEnd();
    return { stop: () => fp.pause() };
  };

  /* ---------------- demo: adalar (bağlı bileşenler) ---------------- */
  D.islands = function (root) {
    const C = 36, R = 14, cell = 30, m = new SL.GridMap(C, R);
    const c = el('canvas'); const gv = new SL.GridView(c, m, cell);
    const note = el('div', { class: 'sv-note tree-note' }), stat = el('div', { class: 'sv-counters' });
    let painting = -1;
    // kara = wall=0, deniz = wall=1 (deniz geçilmez)
    const gen = () => { const n = new Float32Array(C * R).map(() => Math.random()); for (let k = 0; k < 2; k++) { const o = n.slice(); for (let i = 0; i < C * R; i++) { const [cc, r] = m.rc(i); let s = 0, q = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const x = cc + a, y = r + b; if (x >= 0 && y >= 0 && x < C && y < R) { s += o[m.idx(x, y)]; q++; } } n[i] = s / q; } } for (let i = 0; i < C * R; i++) m.wall[i] = n[i] < 0.53 ? 1 : 0; idle(); };
    const frames = () => {
      const N = C * R, state = new Uint8Array(N), comp = new Int32Array(N).fill(-1), F = []; let k = 0;
      F.push({ state: state.slice(), comp: comp.slice(), note: 'Her karaya bakılır; işaretsiz bir kara bulununca oradan DFS/flood fill ile bütün adayı işaretle.', count: 0 });
      for (let s = 0; s < N; s++) {
        if (m.wall[s] || state[s]) continue;
        const st = [s]; state[s] = 2; comp[s] = k; let size = 0;
        while (st.length) { const v = st.pop(); size++; for (const w of m.nbrs(v)) if (!state[w]) { state[w] = 2; comp[w] = k; st.push(w); } }
        k++;
        F.push({ state: state.slice(), comp: comp.slice(), cur: s, note: `Yeni ada #${k} bulundu (${size} kare) → DFS ile hepsi boyandı. id[] = ${k - 1}`, count: k });
      }
      F.push({ state: state.slice(), comp: comp.slice(), note: `Bitti: ${k} ada (bağlı bileşen). Her kareye sabit sayıda bakıldı → toplam V + E.`, count: k });
      return F;
    };
    const fp = new SL.FramePlayer(f => { gv.draw(f); note.textContent = f.note; stat.innerHTML = `<span class="cnt">bulunan ada <b>${f.count}</b></span>`; }, { speed: 3 });
    const idle = () => { fp.pause(); gv.draw({}); note.textContent = 'Koyu = deniz (geçilmez), açık = kara. Kaç ada var? ▶ Say.'; stat.innerHTML = ''; };
    c.addEventListener('mousedown', e => { const i = gv.cellAt(e); if (i < 0) return; painting = m.wall[i] ? 0 : 1; m.wall[i] = painting; idle(); });
    c.addEventListener('mousemove', e => { if (painting < 0) return; const i = gv.cellAt(e); if (i >= 0) { m.wall[i] = painting; gv.draw({}); } });
    window.addEventListener('mouseup', () => { painting = -1; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('▶ Adaları say', () => { fp.load(frames()); fp.play(); }, 'primary'), btn('🎲 Yeni harita', gen), el('span', { class: 'mini' }, 'Fareyle kara/deniz çizebilirsiniz.')), c, SL.transport(fp, { min: 0.5, max: 20 }), note, stat);
    gen();
    return { stop: () => fp.pause() };
  };

  /* ---------------- .graflab ---------------- */
  const PY_G = `
import json, sys
def _guard(limit=3000000):
    cnt = [0]
    def tr(frame, event, arg):
        cnt[0] += 1
        if cnt[0] > limit:
            raise RuntimeError("çok fazla adım — sonsuz döngü olabilir (kareleri işaretliyor musun?)")
        return tr
    sys.settrace(tr)
def _run(cases):
    res = []
    for g in cases:
        try:
            _guard()
            r = count_islands([row[:] for row in g])
            sys.settrace(None)
            res.append([r, None])
        except BaseException as e:
            sys.settrace(None)
            res.append([None, type(e).__name__ + ": " + str(e)])
    return json.dumps(res)
`;
  SL.GrafLab = function (root) {
    const task = root.dataset.task || 'bfs';
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const randGraph = () => { const V = 3 + rint(10), E = rint(2 * V), edges = []; for (let i = 0; i < E; i++) { const a = rint(V), b = rint(V); if (a !== b) edges.push([a, b]); } const adj = Array.from({ length: V }, () => []); edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); }); return adj; };
    const refBfs = (adj, s) => { const dist = new Array(adj.length).fill(-1); dist[s] = 0; const q = [s]; while (q.length) { const v = q.shift(); for (const w of adj[v]) if (dist[w] < 0) { dist[w] = dist[v] + 1; q.push(w); } } return dist; };
    const randGrid = () => { const R = 1 + rint(7), C = 1 + rint(9); return Array.from({ length: R }, () => Array.from({ length: C }, () => (Math.random() < 0.45 ? '#' : '.'))); };
    const refIslands = g => { const R = g.length, C = g[0].length, seen = g.map(r => r.map(() => false)); let k = 0; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (g[r][c] === '#' && !seen[r][c]) { k++; const st = [[r, c]]; seen[r][c] = true; while (st.length) { const [a, b] = st.pop(); for (const [x, y] of [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]) if (x >= 0 && y >= 0 && x < R && y < C && g[x][y] === '#' && !seen[x][y]) { seen[x][y] = true; st.push([x, y]); } } } return k; };
    shell.onRun = async () => {
      shell.clearOut();
      const code = shell.cm.getValue();
      if (task === 'bfs') {
        let fn;
        try { fn = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof bfs !== 'function') throw new Error(\"Kodda 'bfs(adj, s)' fonksiyonu bulunamadı.\"); return bfs;")(shell.print, SL.makeGuard(200000)); }
        catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        const cs = [[[1], [0, 2], [1]], [[1, 2], [0, 3], [0, 3], [1, 2, 4], [3]]]; for (let t = 0; t < 40; t++) cs.push(randGraph());
        for (const adj of cs) {
          const want = refBfs(adj, 0); let got;
          try { got = fn(adj.map(a => a.slice()), 0); } catch (e) { view.innerHTML = `<div class="mini">adj = ${JSON.stringify(adj)}</div>`; shell.setMsg('err', '⚠️ ' + SL.jsErrorText(e)); return; }
          if (JSON.stringify(Array.from(got || [])) !== JSON.stringify(want)) { view.innerHTML = `<div class="mini">adj = <b>${JSON.stringify(adj)}</b>, s = 0</div><div class="mini">beklenen dist: ${JSON.stringify(want)}</div><div class="mini c-red">seninki: ${JSON.stringify(got)}</div>`; shell.setMsg('err', '❌ Test başarısız.'); return; }
        }
        view.innerHTML = `<div class="mini">Örnek: adj = ${JSON.stringify(cs[1])} → dist = ${JSON.stringify(refBfs(cs[1], 0))}</div>`;
        shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
        return;
      }
      const cs = [[['#']], [['.']], [['#', '.', '#']], [['#', '#'], ['#', '.']], [['#', '.'], ['.', '#']]]; for (let t = 0; t < 30; t++) cs.push(randGrid());
      shell.setMsg('', '…');
      let py;
      try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
      py.setStdout({ batched: s => shell.print(s) });
      try { py.runPython(PY_G); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
      py.globals.set('_cases', py.toPy(cs));
      let res; try { res = JSON.parse(py.runPython('_run(_cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
      for (let i = 0; i < cs.length; i++) {
        const want = refIslands(cs[i]);
        if (res[i][1] || res[i][0] !== want) { view.innerHTML = `<pre class="g-grid">${cs[i].map(r => r.join('')).join('\n')}</pre><div class="mini">beklenen: <b>${want}</b> · seninki: <b class="c-red">${res[i][1] ? '⚠️ ' + SL.pyErrorText(res[i][1]) : res[i][0]}</b></div>`; shell.setMsg('err', '❌ Test başarısız.'); return; }
      }
      view.innerHTML = '<div class="mini">35 rastgele harita (# = kara, . = deniz).</div>';
      shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.graflab', SL.GrafLab);
})();
