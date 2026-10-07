/* =====================================================================
   mst.js — Minimum yayılan ağaçlar (core.js + graf.js gerekir)
   Demolar: cut (kesme özelliği), kruskal, prim (tembel Prim), dungeon
            (MST ile prosedürel zindan koridorları)
   Bileşen: .mstlab (kruskal / prim yaz)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);

  class UF { constructor(n) { this.p = Array.from({ length: n }, (_, i) => i); this.sz = new Array(n).fill(1); } find(x) { while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; } return x; } union(a, b) { a = this.find(a); b = this.find(b); if (a === b) return false; if (this.sz[a] < this.sz[b]) [a, b] = [b, a]; this.p[b] = a; this.sz[a] += this.sz[b]; return true; } }
  SL.MiniUF = UF;

  const EWG = '4-5-.35 4-7-.37 5-7-.28 0-7-.16 1-5-.32 0-4-.38 2-3-.17 1-7-.19 0-2-.26 1-2-.36 1-3-.29 2-7-.34 6-2-.40 3-6-.52 6-0-.58 6-4-.93';
  SL.GRAPHS.tinyEWG = () => SL.Graph(8, EWG.split(' ').map(s => { const [a, b, w] = s.split('-'); return [+a, +b, +w]; }),
    [[250, 250], [470, 95], [390, 285], [560, 230], [80, 120], [290, 50], [180, 320], [360, 155]], { weighted: true });
  const fmtW = w => (Number.isInteger(w) ? String(w) : w.toFixed(2).replace(/^0/, ''));

  /* ---------- kesme özelliği ---------- */
  D.cut = function (root) {
    const G = SL.GRAPHS.tinyEWG(), side = new Array(G.V).fill(false);
    [0, 2, 6].forEach(v => (side[v] = true));
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    const gv = new SL.GraphView(left, { W: 640, H: 360 }); gv.setGraph(G);
    const draw = () => {
      const ns = {}, es = {};
      for (let v = 0; v < G.V; v++) ns[v] = side[v] ? 'src' : '';
      const cross = G.edges.filter(e => side[e.v] !== side[e.w]);
      G.edges.forEach(e => { es[e.id] = side[e.v] !== side[e.w] ? 'check' : 'dim'; });
      let min = null; cross.forEach(e => { if (!min || e.wt < min.wt) min = e; });
      if (min) es[min.id] = 'mst';
      gv.render({ ns, es });
      right.innerHTML = cross.length ? `<div class="mini">Kesişen kenarlar <span class="en">crossing edges</span> (${cross.length}):</div><div class="g-adj">${cross.slice().sort((a, b) => a.wt - b.wt).map(e => `<div class="${e === min ? 'on' : ''}">${e.v}–${e.w} &nbsp; ${fmtW(e.wt)}${e === min ? ' ← en hafif: MST’de!' : ''}</div>`).join('')}</div>` : '<div class="mini">Bütün düğümler aynı tarafta: kesme yok. Birkaç düğüme tıklayın.</div>';
    };
    gv.click = v => { side[v] = !side[v]; draw(); };
    root.append(el('div', { class: 'sv-controls' }, el('span', { class: 'mini' }, 'Düğümlere tıklayarak iki gruba ayırın (kırmızı / beyaz). Kesikli = kesişen kenar, yeşil = en hafif kesişen kenar.'), btn('🎲 Rastgele kesme', () => { for (let v = 0; v < G.V; v++) side[v] = Math.random() < 0.5; draw(); })), el('div', { class: 'gv-row' }, left, right));
    draw();
  };

  /* ---------- Kruskal ---------- */
  D.kruskal = function (root) {
    const G = SL.GRAPHS.tinyEWG();
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    const gv = new SL.GraphView(left, { W: 640, H: 360 }); gv.setGraph(G);
    const note = el('div', { class: 'sv-note tree-note' });
    const sorted = G.edges.slice().sort((a, b) => a.wt - b.wt);
    const F = [], uf = new UF(G.V), inT = new Set(), rej = new Set();
    let total = 0;
    const P = (note, cur, ok) => {
      const es = {}; inT.forEach(id => (es[id] = 'mst')); rej.forEach(id => (es[id] = 'dim'));
      if (cur != null) es[cur] = ok === false ? 'path' : 'cur';
      const roots = {}; let k = 0; const ns = {};
      for (let v = 0; v < G.V; v++) { const r = uf.find(v); if (!(r in roots)) roots[r] = k++; ns[v] = 'k' + roots[r]; }
      F.push({ es, ns, note, cur, total, rows: sorted.map(e => ({ e, st: inT.has(e.id) ? 'in' : rej.has(e.id) ? 'out' : e.id === cur ? 'cur' : '' })) });
    };
    P('Kenarları ağırlığa göre SIRALA. Her düğüm başta kendi başına bir bileşen (her renk bir bileşen).');
    for (const e of sorted) {
      if (inT.size === G.V - 1) break;
      if (uf.find(e.v) === uf.find(e.w)) { P(`${e.v}–${e.w} (${fmtW(e.wt)}): ${e.v} ve ${e.w} zaten aynı bileşende → eklersek DÖNGÜ olur → reddet`, e.id, false); rej.add(e.id); }
      else { P(`${e.v}–${e.w} (${fmtW(e.wt)}): farklı bileşenleri birleştiriyor → MST’ye EKLE`, e.id); uf.union(e.v, e.w); inT.add(e.id); total += e.wt; P(`Eklendi. MST’de ${inT.size} kenar, toplam ağırlık ${total.toFixed(2)}`, null); }
    }
    P(`Bitti: V − 1 = ${G.V - 1} kenar. Toplam ağırlık ${total.toFixed(2)}. (Kalan kenarlara bakmaya gerek yok.)`);
    const fp = new SL.FramePlayer(f => {
      gv.render(f);
      right.innerHTML = `<div class="mini">Sıralı kenarlar:</div><div class="g-adj mst-list">${f.rows.map(r => `<div class="${r.st}">${r.e.v}–${r.e.w} &nbsp; ${fmtW(r.e.wt)} ${r.st === 'in' ? '✔' : r.st === 'out' ? '✘' : r.st === 'cur' ? '◀' : ''}</div>`).join('')}</div><div class="sv-counters"><span class="cnt">toplam <b>${f.total.toFixed(2)}</b></span></div>`;
      note.textContent = f.note;
    }, { speed: 1.2 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, left, right), SL.transport(fp, { min: 0.3, max: 8 }), note);
    fp.load(F);
    return { stop: () => fp.pause() };
  };

  /* ---------- tembel Prim ---------- */
  D.prim = function (root) {
    const G = SL.GRAPHS.tinyEWG();
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    const gv = new SL.GraphView(left, { W: 640, H: 360 }); gv.setGraph(G);
    const note = el('div', { class: 'sv-note tree-note' });
    const F = [], marked = new Array(G.V).fill(false), inT = new Set(), pq = [];
    let total = 0;
    const P = (note, cur, bad) => {
      const ns = {}, es = {};
      for (let v = 0; v < G.V; v++) ns[v] = marked[v] ? 'marked' : '';
      pq.forEach(e => (es[e.id] = 'check')); inT.forEach(id => (es[id] = 'mst'));
      if (cur != null) es[cur] = bad ? 'path' : 'cur';
      F.push({ ns, es, note, total, pq: pq.slice().sort((a, b) => a.wt - b.wt) });
    };
    const visit = v => { marked[v] = true; for (const a of G.adj[v]) if (!marked[a.w]) pq.push(G.edges[a.id]); };
    visit(0);
    P('0’dan başla: ağaca ekle, kesişen kenarlarını öncelik kuyruğuna (PQ) koy. Kesikli = PQ’dakiler.');
    while (pq.length && inT.size < G.V - 1) {
      pq.sort((a, b) => a.wt - b.wt);
      const e = pq.shift();
      if (marked[e.v] && marked[e.w]) { P(`PQ’dan en hafif: ${e.v}–${e.w} (${fmtW(e.wt)}) — ama iki ucu da artık ağaçta → bayat kenar, at`, e.id, true); continue; }
      const w = marked[e.v] ? e.w : e.v;
      P(`PQ’dan en hafif: ${e.v}–${e.w} (${fmtW(e.wt)}) → yeni düğüm ${w} ağaca katılıyor`, e.id);
      inT.add(e.id); total += e.wt; visit(w);
      P(`${w} eklendi; onun ağaç dışına giden kenarları PQ’ya girdi. Toplam ${total.toFixed(2)}`);
    }
    P(`Bitti: aynı MST (toplam ${total.toFixed(2)}). Prim ağacı tek bir düğümden BÜYÜTÜR; Kruskal ormanları BİRLEŞTİRİR.`);
    const fp = new SL.FramePlayer(f => {
      gv.render(f);
      right.innerHTML = `<div class="mini">Öncelik kuyruğu (en hafif üstte):</div><div class="g-adj mst-list">${f.pq.map((e, i) => `<div class="${i === 0 ? 'on' : ''}">${e.v}–${e.w} &nbsp; ${fmtW(e.wt)}</div>`).join('') || '<i>boş</i>'}</div><div class="sv-counters"><span class="cnt">toplam <b>${f.total.toFixed(2)}</b></span></div>`;
      note.textContent = f.note;
    }, { speed: 1.2 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, left, right), SL.transport(fp, { min: 0.3, max: 8 }), note);
    fp.load(F);
    return { stop: () => fp.pause() };
  };

  /* ---------- prosedürel zindan ---------- */
  SL.makeDungeon = function (W, H, n) {
    const rooms = [];
    for (let tries = 0; rooms.length < n && tries < 600; tries++) {
      const w = 40 + rint(70), h = 30 + rint(50), x = 10 + rint(W - w - 20), y = 10 + rint(H - h - 20);
      if (rooms.every(r => x > r.x + r.w + 18 || x + w + 18 < r.x || y > r.y + r.h + 18 || y + h + 18 < r.y)) rooms.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
    }
    const cand = [];
    rooms.forEach((a, i) => { rooms.map((b, j) => [Math.hypot(a.cx - b.cx, a.cy - b.cy), j]).filter(x => x[1] !== i).sort((p, q) => p[0] - q[0]).slice(0, 4).forEach(([d, j]) => { if (!cand.some(e => (e.a === i && e.b === j) || (e.a === j && e.b === i))) cand.push({ a: i, b: j, d }); }); });
    // aday graf bağlı değilse en yakın iki bileşeni birleştir
    const uf = new UF(rooms.length); cand.forEach(e => uf.union(e.a, e.b));
    for (;;) {
      let best = null;
      rooms.forEach((a, i) => rooms.forEach((b, j) => { if (i < j && uf.find(i) !== uf.find(j)) { const d = Math.hypot(a.cx - b.cx, a.cy - b.cy); if (!best || d < best.d) best = { a: i, b: j, d }; } }));
      if (!best) break;
      cand.push(best); uf.union(best.a, best.b);
    }
    cand.sort((p, q) => p.d - q.d);
    return { rooms, cand };
  };
  D.dungeon = function (root) {
    const W = 1180, H = 330;
    const c = el('canvas'), ctx = SL.setupCanvas(c, W, H);
    const note = el('div', { class: 'sv-note tree-note' }), stat = el('div', { class: 'sv-counters' });
    let dg, loops = 0.15, showCand = true;
    const build = () => {
      dg = SL.makeDungeon(W, H, 14 + rint(5));
      const uf = new UF(dg.rooms.length), F = [], tree = [], extra = [];
      F.push({ tree: [], extra: [], cur: null, note: `${dg.rooms.length} oda rastgele yerleşti. İnce çizgiler = aday koridorlar (her odanın en yakın 4 komşusu). Ağırlık = uzunluk.` });
      for (const e of dg.cand) {
        if (uf.union(e.a, e.b)) { tree.push(e); F.push({ tree: tree.slice(), extra: [], cur: e, note: `Kruskal: en kısa aday koridor iki ayrı oda grubunu birleştiriyor → kaz (${tree.length}/${dg.rooms.length - 1})` }); }
      }
      const rest = dg.cand.filter(e => !tree.includes(e));
      SL.shuffle(rest).slice(0, Math.round(rest.length * loops)).forEach(e => extra.push(e));
      F.push({ tree: tree.slice(), extra: [], cur: null, note: 'MST hazır: her odaya ulaşılır, en az toplam koridor. Ama tek yollu (ağaç) zindan sıkıcı: çıkmazlar, geri dönüşler…' });
      F.push({ tree: tree.slice(), extra: extra.slice(), cur: null, note: `Oyun tasarımı hilesi: MST dışındaki adaylardan %${Math.round(loops * 100)} kadarını geri ekle → döngüler, alternatif rotalar (mor). Tarif: TinyKeep oyununun zindan üreticisi.` });
      fp.load(F); fp.play();
    };
    const corridor = (a, b, col, w) => { const A = dg.rooms[a], B = dg.rooms[b]; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(A.cx, A.cy); ctx.lineTo(B.cx, A.cy); ctx.lineTo(B.cx, B.cy); ctx.stroke(); };
    const draw = f => {
      const t = T(); ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = t.dark ? '#14121c' : '#e9e4d8'; ctx.fillRect(0, 0, W, H);
      if (showCand) dg.cand.forEach(e => { const A = dg.rooms[e.a], B = dg.rooms[e.b]; ctx.strokeStyle = t.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(A.cx, A.cy); ctx.lineTo(B.cx, B.cy); ctx.stroke(); });
      f.extra.forEach(e => corridor(e.a, e.b, t.purple, 8));
      f.tree.forEach(e => corridor(e.a, e.b, t.dark ? '#c9a46a' : '#9a7444', 8));
      if (f.cur) corridor(f.cur.a, f.cur.b, t.amber, 10);
      dg.rooms.forEach((r, i) => { ctx.fillStyle = t.dark ? '#3b3550' : '#bfb3a0'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = t.dark ? '#7a6fa0' : '#6d5f4b'; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.fillStyle = t.dark ? '#e8e2ff' : '#2a2318'; ctx.font = '700 13px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i === 0 ? '🚪' : i === dg.rooms.length - 1 ? '🐉' : i, r.cx, r.cy); });
      note.textContent = f.note;
      stat.innerHTML = `<span class="cnt">oda <b>${dg.rooms.length}</b></span><span class="cnt">aday koridor <b>${dg.cand.length}</b></span><span class="cnt">MST koridoru <b>${f.tree.length}</b></span><span class="cnt">ek (döngü) <b>${f.extra.length}</b></span>`;
    };
    const fp = new SL.FramePlayer(draw, { speed: 3 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('🎲 Yeni zindan', build, 'primary'), slider('Ek koridor %', 0, 60, loops * 100, 5, v => { loops = v / 100; }), el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => { showCand = e.target.checked; fp.render(); } }); cb.checked = true; return cb; })(), ' adayları göster')), c, SL.transport(fp, { min: 0.5, max: 20 }), note, stat);
    SL.onTheme(() => fp.render());
    build(); fp.pause(); fp.toEnd();
    return { stop: () => fp.pause() };
  };

  /* ---------- .mstlab ---------- */
  const PY_M = `
import json, heapq
def _run(cases):
    res = []
    for V, edges in cases:
        adj = [[] for _ in range(V)]
        for v, w, wt in edges:
            adj[v].append((w, wt))
            adj[w].append((v, wt))
        try:
            r = prim(V, adj)
            res.append([r, None])
        except BaseException as e:
            res.append([None, type(e).__name__ + ": " + str(e)])
    return json.dumps(res)
`;
  SL.MSTLab = function (root) {
    const task = root.dataset.task || 'kruskal';
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const randConn = () => { const V = 2 + rint(9), E = []; for (let v = 1; v < V; v++) E.push([rint(v), v, 1 + rint(20)]); const extra = rint(2 * V); for (let i = 0; i < extra; i++) { const a = rint(V), b = rint(V); if (a !== b) E.push([a, b, 1 + rint(20)]); } return [V, SL.shuffle(E)]; };
    const refMST = (V, E) => { const uf = new UF(V); let s = 0; E.slice().sort((a, b) => a[2] - b[2]).forEach(([a, b, w]) => { if (uf.union(a, b)) s += w; }); return s; };
    shell.onRun = async () => {
      shell.clearOut();
      const code = shell.cm.getValue();
      const cs = [[2, [[0, 1, 5]]], [3, [[0, 1, 1], [1, 2, 2], [0, 2, 3]]], [4, [[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4], [0, 2, 1]]]]; for (let t = 0; t < 40; t++) cs.push(randConn());
      let res;
      if (task === 'kruskal') {
        let fn;
        try { fn = new Function('print', '__g', 'UF', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof kruskal !== 'function') throw new Error(\"Kodda 'kruskal(V, edges)' fonksiyonu bulunamadı.\"); return kruskal;")(shell.print, SL.makeGuard(200000), UF); }
        catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        res = cs.map(([V, E]) => { try { return [fn(V, E.map(e => e.slice())), null]; } catch (e) { return [null, SL.jsErrorText(e)]; } });
      } else {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_M); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_cases', py.toPy(cs));
        try { res = JSON.parse(py.runPython('_run(_cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        res = res.map(([r, e]) => [r, e && SL.pyErrorText(e)]);
      }
      for (let i = 0; i < cs.length; i++) {
        const want = refMST(cs[i][0], cs[i][1]);
        if (res[i][1] || res[i][0] !== want) { view.innerHTML = `<div class="mini">V = ${cs[i][0]}, kenarlar (v, w, ağırlık): <b>${JSON.stringify(cs[i][1])}</b></div><div class="mini">beklenen MST ağırlığı: <b>${want}</b> · seninki: <b class="c-red">${res[i][1] ? '⚠️ ' + res[i][1] : res[i][0]}</b></div>`; shell.setMsg('err', '❌ Test başarısız.'); return; }
      }
      view.innerHTML = `<div class="mini">Örnek: V = 4, ${JSON.stringify(cs[2][1])} → MST ağırlığı ${refMST(4, cs[2][1])}</div>`;
      shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.mstlab', SL.MSTLab);
})();
