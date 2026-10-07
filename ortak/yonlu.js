/* =====================================================================
   yonlu.js — Yönlü graflar (core.js + graf.js gerekir)
   Demolar: topo (teknoloji ağacı topolojik sıralama), dcycle (görev
            döngüsü), scc (Kosaraju–Sharir), gcviz (mark-and-sweep)
   Bileşen: .dglab (topoSort / has_cycle yaz)
   ===================================================================== */
(function () {
  'use strict';
  const { el, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const rint = n => Math.floor(Math.random() * n);

  Object.assign(SL.GRAPHS, {
    tinyDG: () => SL.Graph(13, SL.parseEdges('4-2 2-3 3-2 6-0 0-1 2-0 11-12 12-9 9-10 9-11 7-9 10-12 11-4 4-3 3-5 6-8 8-6 5-4 0-5 6-4 6-9 7-6'),
      [[160, 90], [55, 170], [290, 70], [350, 175], [280, 260], [160, 260], [440, 110], [570, 170], [540, 45], [455, 230], [470, 315], [345, 312], [570, 290]], { directed: true }),
    tech: () => SL.Graph(11, SL.parseEdges('0-2 0-3 1-5 1-4 3-5 3-6 2-6 4-7 5-8 8-10 6-9 4-9'),
      [[70, 100], [70, 260], [230, 40], [230, 150], [230, 290], [400, 228], [400, 75], [400, 312], [570, 228], [570, 40], [720, 228]],
      { directed: true, labels: ['Taş Alet', 'Ateş', 'Avcılık', 'Tarım', 'Bronz', 'Çömlek', 'Tekerlek', 'Demir', 'Yazı', 'Savaş Arabası', 'Matematik'] }),
    quests: () => SL.Graph(6, SL.parseEdges('0-1 1-3 3-2 2-1 3-4 4-5'),
      [[80, 170], [250, 80], [420, 170], [250, 260], [560, 260], [720, 260]],
      { directed: true, labels: ['Köye gir', 'Demirciyle konuş', 'Madeni temizle', 'Kılıcı bul', 'Ejderhayı yen', 'Hazine'] })
  });

  /* ---------- topolojik sıralama (DFS ters sonsıra) ---------- */
  SL.topoFrames = function (G) {
    const V = G.V, marked = new Array(V).fill(false), done = new Array(V).fill(false), post = [], F = [], stack = [];
    const P = (note, cur, chk) => {
      const ns = {}, es = {};
      for (let v = 0; v < V; v++) if (done[v]) ns[v] = 'done'; else if (marked[v]) ns[v] = 'marked';
      if (cur != null) ns[cur] = 'cur';
      if (chk != null) es[chk] = 'check';
      F.push({ ns, es, note, post: post.slice(), stack: stack.slice() });
    };
    const dfs = v => {
      marked[v] = true; stack.push(v);
      P(`dfs(${G.name(v)})`, v);
      for (const a of G.adj[v]) { if (!marked[a.w]) { P(`${G.name(v)} → ${G.name(a.w)}: işaretsiz, in`, v, a.id); dfs(a.w); } else P(`${G.name(v)} → ${G.name(a.w)}: zaten işaretli`, v, a.id); }
      done[v] = true; stack.pop(); post.push(v);
      P(`${G.name(v)} BİTTİ → sonsıra listesine ekle. (Ona bağlı her şey zaten listede.)`, stack.length ? stack[stack.length - 1] : null);
    };
    P('Her işaretsiz düğümden DFS. Bir düğüm “bitince” sonsıra (postorder) listesine eklenir.');
    for (let v = 0; v < V; v++) if (!marked[v]) dfs(v);
    const order = post.slice().reverse();
    F.push({ ns: Object.fromEntries(order.map((v, i) => [v, 'k' + (i % 8)])), es: {}, note: `Sonsırayı TERS çevir → topolojik sıra: ${order.map(v => G.name(v)).join(' → ')}`, post: post.slice(), order, stack: [] });
    return F;
  };
  D.topo = function (root) {
    const d = root.dataset, G = SL.GRAPHS[d.graph || 'tech']();
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    left.style.flex = '3'; right.style.flex = '1';
    const gv = new SL.GraphView(left, { W: +(d.w || 790), H: +(d.h || 340) }); gv.setGraph(G);
    const note = el('div', { class: 'sv-note tree-note' });
    const fp = new SL.FramePlayer(f => {
      gv.render(f);
      right.innerHTML = `<div class="mini">Çağrı yığını:</div><div class="g-dq">${f.stack.map(v => `<span>${G.name(v)}</span>`).join('') || '<i>boş</i>'}</div><div class="mini">Sonsıra <span class="en">postorder</span>:</div><div class="g-dq post">${f.post.map(v => `<span>${G.name(v)}</span>`).join('') || '<i>boş</i>'}</div>` +
        (f.order ? `<div class="mini">Topolojik sıra (araştırma sırası):</div><ol class="g-order">${f.order.map(v => `<li>${G.name(v)}</li>`).join('')}</ol>` : '');
      note.textContent = f.note;
    }, { speed: 2 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, left, right), SL.transport(fp, { min: 0.3, max: 10 }), note);
    fp.load(SL.topoFrames(G));
    return { stop: () => fp.pause() };
  };

  /* ---------- yönlü döngü bulma ---------- */
  D.dcycle = function (root) {
    const d = root.dataset;
    let G = SL.GRAPHS[d.graph || 'quests']();
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    left.style.flex = '3'; right.style.flex = '1';
    const gv = new SL.GraphView(left, { W: 790, H: 340 }); gv.setGraph(G);
    const note = el('div', { class: 'sv-note tree-note' });
    const frames = () => {
      const V = G.V, marked = new Array(V).fill(false), onStack = new Array(V).fill(false), edgeTo = new Array(V).fill(-1), F = [], stack = [];
      let cycle = null;
      const P = (note, cur, chk, cyc) => {
        const ns = {}, es = {};
        for (let v = 0; v < V; v++) if (onStack[v]) ns[v] = 'marked'; else if (marked[v]) ns[v] = 'done';
        if (cur != null) ns[cur] = 'cur';
        for (let v = 0; v < V; v++) if (edgeTo[v] >= 0 && onStack[v]) es[G.eid(edgeTo[v], v)] = 'tree';
        if (chk != null) es[chk] = 'check';
        if (cyc) { cyc.forEach(v => (ns[v] = 'src')); for (let i = 0; i + 1 < cyc.length; i++) es[G.eid(cyc[i], cyc[i + 1])] = 'path'; }
        F.push({ ns, es, note, stack: stack.slice() });
      };
      const dfs = v => {
        marked[v] = true; onStack[v] = true; stack.push(v);
        P(`dfs(${G.name(v)}): yığına girdi (mavi = şu an yığında)`, v);
        for (const a of G.adj[v]) {
          if (cycle) return;
          const w = a.w;
          if (!marked[w]) { edgeTo[w] = v; P(`${G.name(v)} → ${G.name(w)}: yeni, in`, v, a.id); dfs(w); }
          else if (onStack[w]) {
            cycle = []; for (let x = v; x !== w; x = edgeTo[x]) cycle.push(x); cycle.push(w); cycle.reverse(); cycle.push(w);
            P(`${G.name(v)} → ${G.name(w)}: ${G.name(w)} ŞU AN YIĞINDA! → DÖNGÜ: ${cycle.map(x => G.name(x)).join(' → ')}`, v, null, cycle);
            return;
          } else P(`${G.name(v)} → ${G.name(w)}: işaretli ama yığında değil (bitmiş) → döngü değil`, v, a.id);
        }
        if (!cycle) { onStack[v] = false; stack.pop(); P(`${G.name(v)} bitti → yığından çıktı (yeşil)`, stack.length ? stack[stack.length - 1] : null); }
      };
      P('DFS ile ara: yığındaki bir düğüme geri dönen kenar (geri kenar) = döngü.');
      for (let v = 0; v < G.V && !cycle; v++) if (!marked[v]) dfs(v);
      if (!cycle) P('Döngü yok: graf bir DAG (yönlü döngüsüz graf) → topolojik sıralanabilir ✔');
      return F;
    };
    const fp = new SL.FramePlayer(f => { gv.render(f); right.innerHTML = `<div class="mini">DFS yığını (yol):</div><div class="g-dq">${f.stack.map(v => `<span>${G.name(v)}</span>`).join('') || '<i>boş</i>'}</div>`; note.textContent = f.note; }, { speed: 1.5 });
    const load = name => { G = SL.GRAPHS[name](); gv.setGraph(G); fp.load(frames()); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Graf ', select({ quests: 'Görev zinciri (hatalı)', tech: 'Teknoloji ağacı' }, d.graph || 'quests', load))), el('div', { class: 'gv-row' }, left, right), SL.transport(fp, { min: 0.3, max: 10 }), note);
    fp.load(frames());
    return { stop: () => fp.pause() };
  };

  /* ---------- güçlü bağlı bileşenler: Kosaraju–Sharir ---------- */
  D.scc = function (root) {
    const G = SL.GRAPHS.tinyDG(), V = G.V;
    const GR = SL.Graph(V, G.edges.map(e => [e.w, e.v]), G.pos, { directed: true });
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    const gv = new SL.GraphView(left, { W: 620, H: 340 });
    const note = el('div', { class: 'sv-note tree-note' });
    const F = [];
    // 1. aşama: ters grafta DFS sonsırası
    const mk = new Array(V).fill(false), post = [];
    const d1 = v => { mk[v] = true; for (const a of GR.adj[v]) if (!mk[a.w]) d1(a.w); post.push(v); };
    F.push({ rev: true, ns: {}, es: {}, note: '1. aşama: grafın TERSİNİ al (bütün okları çevir). Ekranda şu an ters graf var.', order: [] });
    for (let v = 0; v < V; v++) if (!mk[v]) d1(v);
    const order = post.slice().reverse();
    F.push({ rev: true, ns: {}, es: {}, note: `Ters grafta DFS yap, ters sonsırayı yaz: ${order.join(' ')}`, order });
    // 2. aşama
    const id = new Array(V).fill(-1); let count = 0;
    F.push({ rev: false, ns: {}, es: {}, note: '2. aşama: ASIL grafta, bu sırayla gez; işaretsiz her düğümden bir DFS = bir güçlü bileşen.', order, idv: id.slice() });
    for (const s of order) {
      if (id[s] >= 0) continue;
      const st = [s]; id[s] = count; const members = [s];
      while (st.length) { const v = st.pop(); for (const a of G.adj[v]) if (id[a.w] < 0) { id[a.w] = count; st.push(a.w); members.push(a.w); } }
      const ns = {}; id.forEach((c, v) => { if (c >= 0) ns[v] = 'k' + c; });
      F.push({ rev: false, ns, es: {}, note: `dfs(${s}) → bileşen #${count + 1}: {${members.sort((a, b) => a - b).join(', ')}} — birbirine karşılıklı ulaşabilenler`, order, idv: id.slice(), cur: s });
      count++;
    }
    const ns = {}; id.forEach((c, v) => (ns[v] = 'k' + c));
    F.push({ rev: false, ns, es: {}, note: `Bitti: ${count} güçlü bileşen. Aynı renktekiler aynı “bölge”: birinden ötekine gidip geri dönülebilir.`, order, idv: id.slice() });
    const fp = new SL.FramePlayer(f => {
      gv.setGraph(f.rev ? GR : G); gv.render(f);
      right.innerHTML = `<div class="mini">${f.rev ? '<b class="c-red">TERS graf gösteriliyor</b>' : 'Asıl graf'}</div>` + (f.order.length ? `<div class="mini">Ters sonsıra (ters graftan):</div><div class="g-dq">${f.order.map(v => `<span class="${v === f.cur ? 'on' : ''}">${v}</span>`).join('')}</div>` : '') + (f.idv ? SL.traceTable(V, [{ name: 'id[]', vals: f.idv.map(x => (x < 0 ? null : x)) }]) : '');
      note.textContent = f.note;
    }, { speed: 1 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, left, right), SL.transport(fp, { min: 0.3, max: 6 }), note);
    fp.load(F);
    return { stop: () => fp.pause() };
  };

  /* ---------- çöp toplayıcı: mark-and-sweep ---------- */
  D.gcviz = function (root) {
    const labels = ['Oyuncu', 'Sahne', 'Silah', 'Envanter', 'İksir', 'Mermi', 'Kamera', 'Ölü Düşman', 'Partikül', 'Ses', 'Eski Görev', 'UI'];
    const roots = [0, 1];
    const pos = [[80, 80], [80, 260], [250, 50], [250, 140], [420, 140], [420, 40], [250, 260], [600, 110], [740, 60], [740, 170], [600, 280], [420, 300]];
    const E = SL.parseEdges('0-2 0-3 3-4 2-5 1-6 1-11 6-0 7-8 8-7 7-9 10-7 11-3');
    const G = SL.Graph(12, E, pos, { directed: true, labels });
    const left = el('div', { class: 'gv-wrap' }), right = el('div', { class: 'gv-side' });
    left.style.flex = '3'; right.style.flex = '1';
    const gv = new SL.GraphView(left, { W: 820, H: 340 }); gv.setGraph(G);
    const note = el('div', { class: 'sv-note tree-note' });
    const F = [], marked = new Array(12).fill(false), freed = new Array(12).fill(false);
    const P = (note, cur, chk, phase) => {
      const ns = {}, es = {};
      for (let v = 0; v < 12; v++) ns[v] = freed[v] ? 'dim' : marked[v] ? 'marked' : '';
      roots.forEach(r => { if (!marked[r]) ns[r] = 'src'; });
      if (cur != null) ns[cur] = 'cur';
      if (chk != null) es[chk] = 'check';
      G.edges.forEach(e => { if (freed[e.v]) es[e.id] = 'dim'; });
      F.push({ ns, es, note, phase, marked: marked.slice(), freed: freed.slice() });
    };
    P('Bellekteki nesneler ve birbirlerine referansları (oklar). Kırmızı = KÖKLER (global değişkenler, yığındaki yerel değişkenler).', null, null, 'başlangıç');
    const dfs = v => { marked[v] = true; P(`İşaretle: ${labels[v]} (kökten ulaşılabiliyor → canlı)`, v, null, 'işaretleme'); for (const a of G.adj[v]) if (!marked[a.w]) { P(`${labels[v]} → ${labels[a.w]} referansını izle`, v, a.id, 'işaretleme'); dfs(a.w); } };
    roots.forEach(r => { if (!marked[r]) dfs(r); });
    P('İşaretleme bitti. Mavi = canlı. İşaretsiz kalanlara HİÇBİR kökten ulaşılamıyor.', null, null, 'işaretleme');
    for (let v = 0; v < 12; v++) if (!marked[v]) { freed[v] = true; P(`Süpür: ${labels[v]} işaretsiz → belleği geri ver 🗑️`, v, null, 'süpürme'); }
    P('Bitti! Dikkat: Ölü Düşman ↔ Partikül birbirini gösteriyor (döngü) ama ikisi de silindi. Basit “referans sayma” bunu yakalayamazdı.', null, null, 'süpürme');
    const fp = new SL.FramePlayer(f => {
      gv.render(f);
      right.innerHTML = `<div class="mini">Aşama: <b>${f.phase}</b></div><div class="mini">Canlı: ${f.marked.filter(Boolean).length} · Silinen: ${f.freed.filter(Boolean).length}</div>`;
      note.textContent = f.note;
    }, { speed: 1.5 });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'gv-row' }, left, right), SL.transport(fp, { min: 0.3, max: 8 }), note);
    fp.load(F);
    return { stop: () => fp.pause() };
  };

  /* ---------- .dglab ---------- */
  const PY_D = `
import json, sys
sys.setrecursionlimit(5000)
def _run(cases):
    res = []
    for adj in cases:
        try:
            r = has_cycle([a[:] for a in adj])
            res.append([r if isinstance(r, bool) else None, None if isinstance(r, bool) else "True/False yerine " + repr(r) + " döndü"])
        except BaseException as e:
            res.append([None, type(e).__name__ + ": " + str(e)])
    return json.dumps(res)
`;
  SL.DGLab = function (root) {
    const task = root.dataset.task || 'topo';
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const randDAG = () => { const V = 2 + rint(9), perm = SL.shuffle(Array.from({ length: V }, (_, i) => i)), adj = Array.from({ length: V }, () => []); for (let i = 0; i < V; i++) for (let j = i + 1; j < V; j++) if (Math.random() < 0.3) adj[perm[i]].push(perm[j]); return adj; };
    const withCycle = () => { const adj = randDAG(), V = adj.length; if (V < 2) return adj; const a = rint(V); let b = rint(V); if (b === a) b = (a + 1) % V; adj[a].push(b); adj[b].push(a); return adj; };
    const hasCycle = adj => { const V = adj.length, st = new Array(V).fill(0); const dfs = v => { st[v] = 1; for (const w of adj[v]) { if (st[w] === 1) return true; if (st[w] === 0 && dfs(w)) return true; } st[v] = 2; return false; }; for (let v = 0; v < V; v++) if (st[v] === 0 && dfs(v)) return true; return false; };
    shell.onRun = async () => {
      shell.clearOut();
      const code = shell.cm.getValue();
      if (task === 'topo') {
        let fn;
        try { fn = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof topoSort !== 'function') throw new Error(\"Kodda 'topoSort(adj)' fonksiyonu bulunamadı.\"); return topoSort;")(shell.print, SL.makeGuard(200000)); }
        catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        const cs = [[[]], [[1], []], [[], [0]], [[1, 2], [3], [3], []]]; for (let t = 0; t < 40; t++) cs.push(randDAG());
        for (const adj of cs) {
          let got; try { got = fn(adj.map(a => a.slice())); } catch (e) { view.innerHTML = `<div class="mini">adj = ${JSON.stringify(adj)}</div>`; shell.setMsg('err', '⚠️ ' + SL.jsErrorText(e)); return; }
          const V = adj.length, pos = new Array(V).fill(-1); let ok = Array.isArray(got) && got.length === V;
          if (ok) got.forEach((v, i) => { if (pos[v] !== -1 || v < 0 || v >= V) ok = false; else pos[v] = i; });
          let badE = null;
          if (ok) for (let v = 0; v < V && !badE; v++) for (const w of adj[v]) if (pos[v] > pos[w]) { badE = [v, w]; ok = false; break; }
          if (!ok) { view.innerHTML = `<div class="mini">adj = <b>${JSON.stringify(adj)}</b></div><div class="mini c-red">seninki: ${JSON.stringify(got)}</div>${badE ? `<div class="mini">${badE[0]} → ${badE[1]} kenarı var ama ${badE[1]}, ${badE[0]}’dan önce geliyor.</div>` : '<div class="mini">Her düğüm tam bir kez yer almalı.</div>'}`; shell.setMsg('err', '❌ Test başarısız.'); return; }
        }
        view.innerHTML = `<div class="mini">Örnek: adj = ${JSON.stringify(cs[3])} → ${JSON.stringify(fn(cs[3].map(a => a.slice())))}</div>`;
        shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
        return;
      }
      const cs = [[[]], [[0]], [[1], [0]], [[1], [2], []], [[1], [2], [0]], [[1, 2], [3], [3], []]]; for (let t = 0; t < 30; t++) cs.push(Math.random() < 0.5 ? randDAG() : withCycle());
      shell.setMsg('', '…');
      let py;
      try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
      py.setStdout({ batched: s => shell.print(s) });
      try { py.runPython(PY_D); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
      py.globals.set('_cases', py.toPy(cs));
      let res; try { res = JSON.parse(py.runPython('_run(_cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
      for (let i = 0; i < cs.length; i++) {
        const want = hasCycle(cs[i]);
        if (res[i][1] || res[i][0] !== want) { view.innerHTML = `<div class="mini">adj = <b>${JSON.stringify(cs[i])}</b></div><div class="mini">beklenen: <b>${want ? 'True' : 'False'}</b> · seninki: <b class="c-red">${res[i][1] ? '⚠️ ' + SL.pyErrorText(res[i][1]) : res[i][0] ? 'True' : 'False'}</b></div>`; shell.setMsg('err', '❌ Test başarısız.'); return; }
      }
      view.innerHTML = '<div class="mini">36 graf: DAG’ler ve döngülüler karışık.</div>';
      shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.dglab', SL.DGLab);
})();
