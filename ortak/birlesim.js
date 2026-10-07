/* =====================================================================
   birlesim.js — Union–Find görselleştirmeleri (core.js'e ihtiyaç duyar)
   Bileşenler: .ufviz (adım adım id[] dizisi + orman), .uflab (kod lab)
   Demolar: connect, maze (Kruskal labirenti), percolation, ufexp
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);

  /* Hızlı, sayaçsız WQUPC — demolar ve deneyler için */
  class UF {
    constructor(n) { this.p = new Int32Array(n); this.s = new Int32Array(n).fill(1); this.count = n; for (let i = 0; i < n; i++) this.p[i] = i; }
    find(x) { const p = this.p; while (x !== p[x]) { p[x] = p[p[x]]; x = p[x]; } return x; }
    union(a, b) { let i = this.find(a), j = this.find(b); if (i === j) return false; if (this.s[i] < this.s[j]) { const t = i; i = j; j = t; } this.p[j] = i; this.s[i] += this.s[j]; this.count--; return true; }
    connected(a, b) { return this.find(a) === this.find(b); }
  }
  SL.UF = UF;

  /* Bileşen renkleri: kök indeksinden sabit bir renk */
  const hueOf = r => (r * 137.508) % 360;
  SL.ufColor = (r, dark) => `hsl(${hueOf(r)},70%,${dark ? 55 : 62}%)`;

  /* ---------------- .ufviz ---------------- */
  const SAMPLE = [[4, 3], [3, 8], [6, 5], [9, 4], [2, 1], [8, 9], [5, 0], [7, 2], [6, 1], [1, 0], [6, 7]];
  function depthOf(id, i) { let d = 0; while (id[i] !== i && d < 999) { i = id[i]; d++; } return d; }
  function forestSVG(f, o) {
    const t = T(), n = f.id.length, W = o.W || 700, H = o.H || 260;
    const kids = Array.from({ length: n }, () => []);
    const roots = [];
    for (let i = 0; i < n; i++) { if (f.id[i] === i) roots.push(i); else kids[f.id[i]].push(i); }
    const pos = {}; let leaf = 0, maxD = 0;
    const lay = (x, d) => { maxD = Math.max(maxD, d); if (!kids[x].length) { pos[x] = { i: leaf++, d }; return; } kids[x].forEach(k => lay(k, d + 1)); const a = pos[kids[x][0]].i, b = pos[kids[x][kids[x].length - 1]].i; pos[x] = { i: (a + b) / 2, d }; };
    roots.forEach(r => { lay(r, 0); leaf += 0.6; });
    const sx = (W - 60) / Math.max(1, leaf - 1), dy = Math.min(62, (H - 50) / Math.max(1, maxD));
    const P = i => ({ x: 30 + pos[i].i * sx, y: 28 + pos[i].d * dy });
    let s = '';
    for (let i = 0; i < n; i++) if (f.id[i] !== i) { const a = P(i), b = P(f.id[i]); const hot = f.hl && (f.hl[i] === 'link' || f.hl[i] === 'path'); s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${hot ? t.amber : t['ink-2']}" stroke-width="${hot ? 3.5 : 2}"/>`; }
    for (let i = 0; i < n; i++) {
      const a = P(i), r = depthOf(f.id, i) >= 0 ? (() => { let x = i; while (f.id[x] !== x) x = f.id[x]; return x; })() : i;
      const st = f.hl && f.hl[i];
      const ring = st === 'p' ? t.blue : st === 'q' ? t.pink : st === 'root' ? t.green : st === 'path' ? t.amber : st === 'link' ? t.amber : null;
      s += `<circle cx="${a.x}" cy="${a.y}" r="17" fill="${SL.ufColor(r, t.dark)}" stroke="${ring || t['ink-2']}" stroke-width="${ring ? 4 : 1.5}"/>`;
      s += `<text x="${a.x}" y="${a.y + 6}" text-anchor="middle" font-size="16" font-weight="700" font-family="JetBrains Mono" fill="#111">${i}</text>`;
      if (o.sz && f.sz && f.id[i] === i) s += `<text x="${a.x + 20}" y="${a.y - 12}" font-size="11" fill="${t.muted}" font-family="JetBrains Mono">sz=${f.sz[i]}</text>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" class="uf-forest">${s}</svg>`;
  }
  SL.UFViz = function (root) {
    const d = root.dataset, alg = d.alg || 'quickunion', N = +(d.n || 10);
    let id, sz, acc, si;
    const arrRow = el('div', { class: 'uf-arr' });
    const forest = el('div', { class: 'uf-forest-wrap' });
    const note = el('div', { class: 'sv-note' });
    const stat = el('div', { class: 'sv-counters' });
    const pIn = el('input', { type: 'text', class: 'key-in', size: 2, value: '4' }), qIn = el('input', { type: 'text', class: 'key-in', size: 2, value: '3' });
    const reset = () => { id = Array.from({ length: N }, (_, i) => i); sz = Array(N).fill(1); acc = 0; si = 0; fp.load([F('Başlangıç: herkes kendi bileşeninde (id[i] = i). ' + (alg === 'quickfind' ? 'id[i] = bileşen numarası.' : 'id[i] = ebeveyn; kök kendini gösterir.'))]); };
    const F = (note, hl = {}) => ({ id: id.slice(), sz: sz.slice(), hl, note, acc });
    const draw = f => {
      const t = T();
      arrRow.innerHTML = '<span class="uf-lab">i</span>' + f.id.map((_, i) => `<span class="uf-idx">${i}</span>`).join('') + '<br><span class="uf-lab">id[i]</span>' +
        f.id.map((v, i) => { const st = f.hl[i]; return `<span class="uf-cell${st ? ' ' + st : ''}">${v}</span>`; }).join('') +
        (alg.startsWith('weighted') ? '<br><span class="uf-lab">sz[i]</span>' + f.sz.map((v, i) => `<span class="uf-cell sz">${f.id[i] === i ? v : ''}</span>`).join('') : '');
      forest.innerHTML = forestSVG(f, { sz: alg.startsWith('weighted') });
      note.innerHTML = f.note;
      let h = 0; for (let i = 0; i < N; i++) h = Math.max(h, depthOf(f.id, i));
      const comps = f.id.filter((v, i) => v === i).length;
      stat.innerHTML = `<span class="cnt cmp"><b>${f.acc}</b> dizi erişimi (toplam)</span><span class="cnt">bileşen sayısı <b>${alg === 'quickfind' ? new Set(f.id).size : comps}</b></span>` + (alg !== 'quickfind' ? `<span class="cnt swp">en derin ağaç <b>${h}</b></span>` : '');
    };
    const fp = new SL.FramePlayer(draw, { speed: 2 });
    const find = (p, frames, who) => {
      const path = [p];
      if (alg === 'quickfind') { acc++; return id[p]; }
      while (true) {
        acc++;
        if (id[p] === p) break;
        if (alg === 'weighted-pc') { acc += 2; const old = id[p]; id[p] = id[id[p]]; if (id[p] !== old) frames.push(F(`yol sıkıştırma: id[${p}] = id[id[${p}]] = ${id[p]} (dedesine bağlandı)`, Object.fromEntries(path.map(x => [x, 'path']).concat([[p, 'link']])))); }
        p = id[p]; path.push(p); acc++;
        frames.push(F(`find(${who}): ebeveyne çık → ${p}`, Object.fromEntries(path.map(x => [x, 'path']))));
      }
      return p;
    };
    const union = (p, q) => {
      const frames = [];
      if (alg === 'quickfind') {
        const pid = id[p], qid = id[q]; acc += 2;
        frames.push(F(`union(${p}, ${q}): id[${p}] = ${pid}, id[${q}] = ${qid}. ${pid === qid ? 'Zaten aynı bileşen!' : `id’si ${pid} olan HERKES ${qid} olacak → tüm diziyi tara`}`, { [p]: 'p', [q]: 'q' }));
        if (pid !== qid) for (let i = 0; i < N; i++) { acc++; if (id[i] === pid) { id[i] = qid; acc++; frames.push(F(`id[${i}] = ${pid} → ${qid}`, { [i]: 'link' })); } }
        frames.push(F(`Bitti. Tek bir union için diziyi baştan sona taradık: ~N erişim.`));
        return frames;
      }
      frames.push(F(`union(${p}, ${q}): önce iki kökü bul`, { [p]: 'p', [q]: 'q' }));
      const i = find(p, frames, p), j = find(q, frames, q);
      if (i === j) { frames.push(F(`Kökler aynı (${i}) → zaten bağlı, bir şey yapma.`, { [i]: 'root' })); return frames; }
      if (alg === 'quickunion') { id[i] = j; acc++; frames.push(F(`Kök ${i}, kök ${j}’nin çocuğu oldu: id[${i}] = ${j}. Tek bir dizi değeri değişti!`, { [i]: 'link', [j]: 'root' })); }
      else {
        const [small, big] = sz[i] < sz[j] ? [i, j] : [j, i];
        id[small] = big; sz[big] += sz[small]; acc++;
        frames.push(F(`Ağırlıklı: KÜÇÜK ağaç (kök ${small}, sz=${sz[small]}) BÜYÜĞÜN (kök ${big}) altına → id[${small}] = ${big}, sz[${big}] = ${sz[big]}`, { [small]: 'link', [big]: 'root' }));
      }
      return frames;
    };
    const connected = (p, q) => {
      const frames = [F(`connected(${p}, ${q})?`, { [p]: 'p', [q]: 'q' })];
      const i = find(p, frames, p), j = find(q, frames, q);
      frames.push(F(alg === 'quickfind' ? `id[${p}] = ${i}, id[${q}] = ${j} → ${i === j ? '<b class="c-green">BAĞLI ✔</b>' : '<b class="c-red">bağlı değil</b>'} (sadece 2 erişim!)` : `kökler ${i} ve ${j} → ${i === j ? '<b class="c-green">BAĞLI ✔</b>' : '<b class="c-red">bağlı değil</b>'}`, { [i]: 'root', [j]: 'root' }));
      return frames;
    };
    const num = x => { const v = parseInt(x.value, 10); return v >= 0 && v < N ? v : null; };
    const go = frames => { fp.load(frames); fp.play(); };
    const worst = () => { id = Array.from({ length: N }, (_, i) => i); sz = Array(N).fill(1); acc = 0; let fr = [F('Kötü sıra: union(0,1), union(0,2), union(0,3)…')]; for (let k = 1; k < N; k++) fr = fr.concat(union(0, k).slice(-1)); go(fr); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'p ', pIn), el('label', { class: 'ctl' }, 'q ', qIn),
      btn('🔗 union(p, q)', () => { const p = num(pIn), q = num(qIn); if (p != null && q != null) go(union(p, q)); }, 'primary'),
      btn('❓ connected?', () => { const p = num(pIn), q = num(qIn); if (p != null && q != null) go(connected(p, q)); }),
      btn('▶ Kitaptaki sıradaki', () => { if (si >= SAMPLE.length) { note.textContent = 'Örnek dizi bitti (↺ ile baştan).'; return; } const [p, q] = SAMPLE[si++]; pIn.value = p; qIn.value = q; go(union(p, q)); }),
      d.worst ? btn('😈 Kötü sıra', worst) : null,
      btn('↺', reset)),
    arrRow, forest, SL.transport(fp, { min: 0.3, max: 8 }), note, stat);
    SL.onTheme(() => fp.render());
    reset();
    return { stop: () => fp.pause() };
  };
  SL.register('.ufviz', SL.UFViz);

  /* ---------------- Demo: tıklayarak bağla ---------------- */
  D.connect = function (root) {
    const P = [[60, 60], [150, 60], [240, 60], [330, 60], [420, 60], [60, 160], [150, 160], [240, 160], [330, 160], [420, 160]];
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', '0 0 480 220'); svg.setAttribute('class', 'cn-svg');
    const note = el('div', { class: 'sv-note' });
    let uf, edges, sel = null, mode = 'union';
    const reset = () => { uf = new UF(10); edges = []; sel = null; note.textContent = 'İki noktaya tıklayın → union. 10 nesne, 10 bileşen.'; draw(); };
    const draw = () => {
      const t = T();
      let s = edges.map(([a, b]) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="${t['ink-2']}" stroke-width="3"/>`).join('');
      P.forEach(([x, y], i) => { s += `<g data-i="${i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="22" fill="${SL.ufColor(uf.find(i), t.dark)}" stroke="${sel === i ? t.red : t['ink-2']}" stroke-width="${sel === i ? 5 : 2}"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-size="20" font-weight="700" fill="#111" font-family="JetBrains Mono">${i}</text></g>`; });
      svg.innerHTML = s;
    };
    svg.addEventListener('click', e => {
      const g = e.target.closest('g'); if (!g) return; const i = +g.dataset.i;
      if (sel === null) { sel = i; draw(); return; }
      if (sel === i) { sel = null; draw(); return; }
      const a = sel; sel = null;
      if (mode === 'union') {
        const was = uf.connected(a, i);
        if (!was) { uf.union(a, i); edges.push([a, i]); }
        note.innerHTML = was ? `${a} ve ${i} zaten bağlıydı (dolaylı yoldan bile olsa). Bileşen sayısı: <b>${uf.count}</b>` : `union(${a}, ${i}) → bileşen sayısı: <b>${uf.count}</b>`;
      } else note.innerHTML = `connected(${a}, ${i})? → ${uf.connected(a, i) ? '<b class="c-green">EVET</b> (aynı renk)' : '<b class="c-red">HAYIR</b>'}`;
      draw();
    });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Tıklama modu ', select({ union: '🔗 union (bağla)', conn: '❓ connected (sor)' }, mode, v => (mode = v))), btn('↺', reset)), svg, note);
    SL.onTheme(draw); reset();
  };

  /* ---------------- Demo: Kruskal ile labirent ---------------- */
  D.maze = function (root) {
    const C = +(root.dataset.c || 30), R = +(root.dataset.r || 15), S = 24, W = C * S, H = R * S;
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W + 2, H + 2);
    const stat = el('div', { class: 'sv-counters' });
    const note = el('div', { class: 'sv-note' });
    let walls, steps, showColor = true;
    const plan = () => {
      walls = [];
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { if (x < C - 1) walls.push([y * C + x, y * C + x + 1]); if (y < R - 1) walls.push([y * C + x, (y + 1) * C + x]); }
      SL.shuffle(walls);
      const uf = new UF(C * R); steps = [];
      walls.forEach(([a, b], k) => { const removed = uf.union(a, b); steps.push({ k, removed, comps: uf.count, parent: removed ? Int32Array.from(uf.p) : null }); });
      fp.load(Array.from({ length: walls.length + 1 }, (_, k) => k));
    };
    let lastParent = null;
    const draw = k => {
      const t = T();
      ctx.fillStyle = t.card; ctx.fillRect(0, 0, W + 2, H + 2);
      const open = new Set(); let comps = C * R, parent = null;
      for (let i = 0; i < k; i++) if (steps[i].removed) { open.add(i); comps = steps[i].comps; parent = steps[i].parent; }
      if (showColor && parent) {
        const root = x => { while (parent[x] !== x) x = parent[x]; return x; };
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { ctx.fillStyle = SL.ufColor(root(y * C + x), t.dark); ctx.globalAlpha = 0.45; ctx.fillRect(1 + x * S, 1 + y * S, S, S); }
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.lineCap = 'square';
      ctx.strokeRect(1, 1, W, H);
      walls.forEach(([a, b], i) => {
        if (open.has(i)) return;
        const ax = a % C, ay = Math.floor(a / C);
        ctx.beginPath();
        if (b === a + 1) { ctx.moveTo(1 + (ax + 1) * S, 1 + ay * S); ctx.lineTo(1 + (ax + 1) * S, 1 + (ay + 1) * S); }
        else { ctx.moveTo(1 + ax * S, 1 + (ay + 1) * S); ctx.lineTo(1 + (ax + 1) * S, 1 + (ay + 1) * S); }
        ctx.stroke();
      });
      if (k > 0 && k <= walls.length) {
        const [a, b] = walls[k - 1], ax = a % C, ay = Math.floor(a / C), bx = b % C, by = Math.floor(b / C);
        ctx.strokeStyle = steps[k - 1].removed ? t.green : t.red; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(1 + (ax + 0.5) * S, 1 + (ay + 0.5) * S); ctx.lineTo(1 + (bx + 0.5) * S, 1 + (by + 0.5) * S); ctx.stroke();
        note.innerHTML = steps[k - 1].removed ? `Duvar ${k}: iki taraf FARKLI bileşenlerde → duvarı yık, <b>union</b> ✔` : `Duvar ${k}: iki taraf zaten BAĞLI (find aynı kökü verdi) → yıkarsak döngü oluşur, duvar KALSIN ✘`;
      } else note.textContent = k === 0 ? 'Her hücre kendi bileşeni. Duvarlar rastgele sırayla ele alınacak.' : 'Bitti: tek bileşen → her hücreden her hücreye TAM BİR yol var (mükemmel labirent).';
      stat.innerHTML = `<span class="cnt">duvar ${Math.min(k, walls.length)} / ${walls.length}</span><span class="cnt cmp">yıkılan <b>${open.size}</b></span><span class="cnt swp">bileşen sayısı <b>${comps}</b></span>`;
    };
    const fp = new SL.FramePlayer(f => draw(f), { speed: 40 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('🎲 Yeni labirent', () => { plan(); fp.play(); }, 'primary'),
      el('label', { class: 'ctl' }, el('input', { type: 'checkbox', checked: '', onchange: e => { showColor = e.target.checked; fp.render(); } }), ' bileşenleri renklendir')),
    c, SL.transport(fp, { min: 2, max: 600, unit: 'duvar/sn' }), stat, note);
    SL.onTheme(() => fp.render());
    plan();
    return { stop: () => fp.pause() };
  };

  /* ---------------- Demo: perkolasyon ---------------- */
  D.percolation = function (root) {
    let N = 20, open, order, k, perc;
    const S = 18;
    const c = el('canvas'); let ctx;
    const stat = el('div', { class: 'sv-counters' });
    const mc = el('div', { class: 'sv-note' });
    const setup = () => {
      ctx = SL.setupCanvas(c, N * S, N * S);
      order = SL.shuffle(Array.from({ length: N * N }, (_, i) => i));
      open = new Uint8Array(N * N); k = 0; perc = -1;
      // ne zaman sızdığını önceden bul
      const uf = new UF(N * N + 2), TOP = N * N, BOT = N * N + 1, o = new Uint8Array(N * N);
      for (let s = 0; s < order.length; s++) {
        const i = order[s]; o[i] = 1; const x = i % N, y = Math.floor(i / N);
        if (y === 0) uf.union(i, TOP); if (y === N - 1) uf.union(i, BOT);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N && o[ny * N + nx]) uf.union(i, ny * N + nx); });
        if (uf.connected(TOP, BOT)) { perc = s + 1; break; }
      }
      fp.load(Array.from({ length: perc + 1 }, (_, s) => s));
    };
    const draw = s => {
      const t = T();
      const uf = new UF(N * N + 1), TOP = N * N; open.fill(0);
      for (let q = 0; q < s; q++) { const i = order[q]; open[i] = 1; const x = i % N, y = Math.floor(i / N); if (y === 0) uf.union(i, TOP); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N && open[ny * N + nx]) uf.union(i, ny * N + nx); }); }
      for (let i = 0; i < N * N; i++) {
        const x = i % N, y = Math.floor(i / N);
        ctx.fillStyle = !open[i] ? (t.dark ? '#2a2a36' : '#3c3c48') : uf.connected(i, TOP) ? '#3a8ee6' : (t.dark ? '#cfd3dc' : '#ffffff');
        ctx.fillRect(x * S, y * S, S - 1, S - 1);
      }
      const p = s / (N * N);
      stat.innerHTML = `<span class="cnt">açık hücre <b>${s}</b> / ${N * N}</span><span class="cnt cmp">açıklık oranı p = <b>${p.toFixed(3)}</b></span>` + (s === perc ? '<span class="cnt ok">💧 SIZDI! Üstten alta açık bir yol var.</span>' : '');
    };
    const fp = new SL.FramePlayer(f => draw(f), { speed: 60 });
    const monte = () => {
      const T_ = 300, n = 60, res = [];
      for (let t = 0; t < T_; t++) {
        const uf = new UF(n * n + 2), TOP = n * n, BOT = n * n + 1, o = new Uint8Array(n * n), ord = SL.shuffle(Array.from({ length: n * n }, (_, i) => i));
        for (let s = 0; s < ord.length; s++) {
          const i = ord[s]; o[i] = 1; const x = i % n, y = Math.floor(i / n);
          if (y === 0) uf.union(i, TOP); if (y === n - 1) uf.union(i, BOT);
          if (x > 0 && o[i - 1]) uf.union(i, i - 1); if (x < n - 1 && o[i + 1]) uf.union(i, i + 1);
          if (y > 0 && o[i - n]) uf.union(i, i - n); if (y < n - 1 && o[i + n]) uf.union(i, i + n);
          if (uf.connected(TOP, BOT)) { res.push((s + 1) / (n * n)); break; }
        }
      }
      const mean = res.reduce((a, b) => a + b, 0) / res.length, sd = Math.sqrt(res.reduce((a, b) => a + (b - mean) ** 2, 0) / (res.length - 1));
      mc.innerHTML = `🎲 Monte Carlo: ${T_} deneme, ${n}×${n} ızgara → ortalama eşik <b>p* ≈ ${mean.toFixed(4)}</b> (std ${sd.toFixed(3)}). Fizikçilerin büyük ızgaralarla bulduğu değer: <b>0,592746…</b>`;
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'N ', select({ 10: '10×10', 20: '20×20', 30: '30×30' }, '20', v => { N = +v; setup(); })),
      btn('🎲 Yeni deney', () => { setup(); fp.play(); }, 'primary'), btn('📊 Monte Carlo (300 deney)', monte)),
    el('div', { class: 'perc-wrap' }, c, el('div', { class: 'perc-side' }, stat, mc,
      el('p', { class: 'mini' }, 'Koyu = kapalı · beyaz = açık · mavi = üst sıraya bağlı (su ulaştı). Hücreler rastgele sırayla açılıyor; her açılışta komşu açık hücrelerle union. Sızma: üst ve alt sanal düğümler bağlı mı?'))),
    SL.transport(fp, { min: 2, max: 400, unit: 'hücre/sn' }));
    SL.onTheme(() => fp.render());
    setup();
    return { stop: () => fp.pause() };
  };

  /* ---------------- Demo: canlı deney ---------------- */
  D.ufexp = function (root) {
    const tbl = el('table', { class: 'dbl-t' });
    let busy = false;
    const algs = {
      qf: N => { const id = new Int32Array(N); for (let i = 0; i < N; i++) id[i] = i; return { find: p => id[p], union: (p, q) => { const a = id[p], b = id[q]; if (a === b) return; for (let i = 0; i < N; i++) if (id[i] === a) id[i] = b; }, h: () => 1 }; },
      qu: N => { const id = new Int32Array(N); for (let i = 0; i < N; i++) id[i] = i; const f = p => { while (p !== id[p]) p = id[p]; return p; }; return { find: f, union: (p, q) => { const a = f(p), b = f(q); if (a !== b) id[a] = b; }, h: () => { let m = 0; for (let i = 0; i < N; i++) { let d = 0, x = i; while (x !== id[x]) { x = id[x]; d++; } if (d > m) m = d; } return m; } }; },
      wqu: N => { const id = new Int32Array(N), sz = new Int32Array(N).fill(1); for (let i = 0; i < N; i++) id[i] = i; const f = p => { while (p !== id[p]) p = id[p]; return p; }; return { find: f, union: (p, q) => { let a = f(p), b = f(q); if (a === b) return; if (sz[a] < sz[b]) { const t = a; a = b; b = t; } id[b] = a; sz[a] += sz[b]; }, h: () => { let m = 0; for (let i = 0; i < N; i++) { let d = 0, x = i; while (x !== id[x]) { x = id[x]; d++; } if (d > m) m = d; } return m; } }; },
      wqupc: N => { const u = new UF(N); return { find: p => u.find(p), union: (p, q) => u.union(p, q), h: () => { let m = 0; for (let i = 0; i < N; i++) { let d = 0, x = i; while (x !== u.p[x]) { x = u.p[x]; d++; } if (d > m) m = d; } return m; } }; }
    };
    const names = { qf: 'quick-find', qu: 'quick-union', wqu: 'ağırlıklı', wqupc: 'ağırlıklı + yol sıkıştırma' };
    const run = async () => {
      if (busy) return; busy = true;
      tbl.innerHTML = '<tr><th>N</th><th>M = 2N rastgele işlem</th>' + Object.values(names).map(n => `<th>${n}</th>`).join('') + '</tr>';
      for (const N of [1000, 4000, 16000, 64000]) {
        await new Promise(r => setTimeout(r, 30));
        const ops = Array.from({ length: 2 * N }, () => [rint(N), rint(N)]);
        const cells = Object.keys(algs).map(k => {
          if (k === 'qf' && N > 16000) return '<td class="mini">çok yavaş</td>';
          if (k === 'qu' && N > 64000) return '<td class="mini">—</td>';
          const a = algs[k](N); const t0 = performance.now();
          ops.forEach(([p, q], i) => (i % 2 ? a.find(p) === a.find(q) : a.union(p, q)));
          const ms = performance.now() - t0;
          return `<td>${ms.toFixed(1)} ms<br><span class="mini">yükseklik ${a.h()}</span></td>`;
        });
        tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(N)}</td><td class="mini">union + connected</td>${cells.join('')}</tr>`);
      }
      busy = false;
    };
    root.append(el('div', { class: 'sv-controls' }, btn('🧪 Deneyi başlat', run, 'primary'), el('span', { class: 'mini' }, 'N nesne, 2N rastgele işlem (yarısı union, yarısı connected). Bu bilgisayarda ölçülür.')), tbl);
    tbl.innerHTML = '<tr><td class="mini">“Deneyi başlat”a basın.</td></tr>';
  };

  /* ---------------- .uflab ---------------- */
  const PY_UF = `
import json, random
def _height(parent):
    m = 0
    for i in range(len(parent)):
        d, x = 0, i
        while x != parent[x] and d < 10000:
            x = parent[x]; d += 1
        m = max(m, d)
    return m
def _ref_root(ref, x):
    while ref[x] != x: x = ref[x]
    return x
def _run(task, seqs):
    out = []
    for N, ops in seqs:
        parent = list(range(N)); size = [1] * N; ref = list(range(N)); err = None; wrong = None
        try:
            for (p, q) in ops:
                if task == 'find':
                    a, b = find(parent, p), find(parent, q)
                    if a != b: parent[a] = b
                elif task == 'weighted':
                    union(parent, size, p, q)
                else:
                    a, b = find(parent, p), find(parent, q)
                    if a != b:
                        if size[a] < size[b]: a, b = b, a
                        parent[b] = a; size[a] += size[b]
                ra, rb = _ref_root(ref, p), _ref_root(ref, q)
                if ra != rb: ref[ra] = rb
            for _ in range(60):
                x, y = random.randrange(N), random.randrange(N)
                truth = _ref_root(ref, x) == _ref_root(ref, y)
                got = find(parent, x) == find(parent, y) if task != 'weighted' else _root(parent, x) == _root(parent, y)
                if truth != got:
                    wrong = [x, y, truth]; break
        except BaseException as e:
            err = type(e).__name__ + ": " + str(e)
        out.append({'err': err, 'wrong': wrong, 'h': _height(parent) if err is None else None, 'N': N})
    return json.dumps(out)
def _chain(n):
    parent = [max(i - 1, 0) for i in range(n)]   # 0 <- 1 <- 2 <- ... zincir (elle kuruldu)
    find(parent, n - 1)
    d, x = 0, n - 1
    while parent[x] != x:
        x = parent[x]; d += 1
    return d
def _root(parent, x):
    d = 0
    while parent[x] != x and d < 100000:
        x = parent[x]; d += 1
    return x
`;
  SL.UFLab = function (root) {
    const task = root.dataset.task || 'find';
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const seqs = () => {
      const out = [];
      const N1 = 32; out.push([N1, Array.from({ length: N1 - 1 }, (_, i) => [0, i + 1])]);   // kötü sıra
      const N2 = 32; out.push([N2, Array.from({ length: N2 - 1 }, (_, i) => [i, i + 1])]);
      for (let t = 0; t < 6; t++) { const N = 20 + rint(40); out.push([N, Array.from({ length: N }, () => [rint(N), rint(N)])]); }
      return out;
    };
    const report = (res, chain) => {
      const lg = n => Math.floor(Math.log2(n));
      view.innerHTML = '<table class="dbl-t" style="font-size:15px"><tr><th>test</th><th>N</th><th>sonuç</th><th>en derin ağaç</th><th>lg N</th></tr>' +
        res.map((r, i) => `<tr><td>${i < 2 ? ['kötü sıra: (0,k)', 'zincir: (i,i+1)'][i] : 'rastgele ' + (i - 1)}</td><td>${r.N}</td><td class="${r.err || r.wrong ? 'no' : 'yes'}">${r.err ? '⚠️ ' + r.err : r.wrong ? `✘ connected(${r.wrong[0]}, ${r.wrong[1]}) yanlış` : '✔'}</td><td>${r.h ?? '—'}</td><td>${lg(r.N)}</td></tr>`).join('') + '</table>';
      const bad = res.find(r => r.err || r.wrong);
      if (bad) return shell.setMsg('err', '❌ ' + (bad.err ? 'Hata: ' + bad.err : `Bağlantı cevabı yanlış: connected(${bad.wrong[0]}, ${bad.wrong[1]}) aslında ${bad.wrong[2] ? 'BAĞLI' : 'bağlı DEĞİL'}`));
      const maxH = Math.max(...res.map(r => r.h)), worstLg = Math.max(...res.map(r => Math.floor(Math.log2(r.N))));
      if (task !== 'find' && maxH > worstLg) return shell.setMsg('err', `⚠️ Cevaplar doğru ama bir ağacın yüksekliği ${maxH} > lg N. Küçük ağaç büyüğün altına mı gidiyor? (size kullan!)`);
      if (task === 'compress' && chain != null && chain >= 63) return shell.setMsg('err', `⚠️ Cevaplar doğru ama find yol sıkıştırma YAPMIYOR: 64 düğümlük bir zincirde find(63) çağrıldıktan sonra 63’ün derinliği hâlâ ${chain}.`);
      shell.setMsg('ok', `✅ Tüm testler geçti. En derin ağaç: ${maxH}${task === 'find' ? ' (quick-union kötü sırada çok derinleşebilir — normal!)' : ' ≤ lg N 👍'}` + (chain != null ? ` · Zincir testi: find(63) sonrası derinlik ${chain} (sıkıştırma çalışıyor ✔)` : ''));
    };
    shell.onRun = async () => {
      shell.clearOut();
      const ss = seqs(), code = shell.cm.getValue();
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_UF); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_seqs', py.toPy(ss));
        let res;
        try { res = JSON.parse(py.runPython(`_run(${JSON.stringify(task)}, _seqs)`)); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        let chain = null;
        if (task === 'compress') { try { chain = py.runPython('_chain(64)'); } catch (e) { chain = null; } }
        report(res.map(r => Object.assign(r, { err: r.err && SL.pyErrorText(r.err) })), chain);
        return;
      }
      let api;
      try { api = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + '\n;return { find: typeof find === "function" ? find : null, union: typeof union === "function" ? union : null };')(shell.print, SL.makeGuard(2000000)); }
      catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      if (!api.find) { shell.setMsg('err', '⚠️ Kodda find(parent, p) fonksiyonu yok.'); return; }
      if (task === 'weighted' && !api.union) { shell.setMsg('err', '⚠️ Kodda union(parent, size, p, q) fonksiyonu yok.'); return; }
      const rootOf = (par, x) => { let d = 0; while (par[x] !== x && d++ < 100000) x = par[x]; return x; };
      const height = par => { let m = 0; for (let i = 0; i < par.length; i++) { let d = 0, x = i; while (x !== par[x] && d < 10000) { x = par[x]; d++; } m = Math.max(m, d); } return m; };
      const res = ss.map(([N, ops]) => {
        const parent = Array.from({ length: N }, (_, i) => i), size = Array(N).fill(1), ref = new UF(N);
        try {
          ops.forEach(([p, q]) => {
            if (task === 'find') { const a = api.find(parent, p), b = api.find(parent, q); if (a !== b) parent[a] = b; }
            else if (task === 'weighted') api.union(parent, size, p, q);
            else { let a = api.find(parent, p), b = api.find(parent, q); if (a !== b) { if (size[a] < size[b]) { const t = a; a = b; b = t; } parent[b] = a; size[a] += size[b]; } }
            ref.union(p, q);
          });
          for (let k = 0; k < 60; k++) {
            const x = rint(N), y = rint(N), truth = ref.connected(x, y);
            const got = task === 'weighted' ? rootOf(parent, x) === rootOf(parent, y) : api.find(parent, x) === api.find(parent, y);
            if (got !== truth) return { N, wrong: [x, y, truth], h: height(parent) };
          }
          return { N, h: height(parent) };
        } catch (e) { return { N, err: SL.jsErrorText(e) }; }
      });
      report(res);
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.uflab', SL.UFLab);
})();
