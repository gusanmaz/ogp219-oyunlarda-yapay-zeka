/* =====================================================================
   liste.js — Dizi ve bağlı liste görselleştirmeleri (core.js'e ihtiyaç duyar)
   Bileşenler: .llviz (bağlı liste işlemleri adım adım), .lllab (kod lab)
   Demolar: memory, arrinsert, memlayout, dynarray, bench
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);

  /* ---------------- Bağlı liste modeli + kare kaydı ---------------- */
  class LLModel {
    constructor(keys, o = {}) { this.nodes = new Map(); this.nid = 0; this.head = null; this.tail = null; this.useTail = !!o.tail; (keys || []).forEach(k => this.appendSilent(k)); }
    mk(key) { const n = { id: ++this.nid, key, next: null }; this.nodes.set(n.id, n); return n; }
    appendSilent(key) { const n = this.mk(key); if (!this.head) this.head = n; else { let x = this.head; while (x.next) x = x.next; x.next = n; } this.tail = n; }
    order() { const o = [], seen = new Set(); let x = this.head; while (x && !seen.has(x.id)) { seen.add(x.id); o.push(x.id); x = x.next; } return o; }
    cleanup() { const live = new Set(this.order()); [...this.nodes.keys()].forEach(id => { if (!live.has(id)) this.nodes.delete(id); }); }
    recorder() {
      const R = { frames: [], cmps: 0 };
      R.F = (note, o = {}) => R.frames.push({
        nodes: [...this.nodes.values()].map(n => ({ id: n.id, key: n.key, next: n.next ? n.next.id : null })),
        order: o.order || this.order(), float: o.float || {}, ptrs: Object.assign({ head: this.head ? this.head.id : null }, this.useTail ? { tail: this.tail ? this.tail.id : null } : {}, o.ptrs || {}),
        hl: o.hl || {}, note, cmps: R.cmps, code: o.code
      });
      return R;
    }
    opPushFront(k) {
      const R = this.recorder(); const ord = this.order();
      R.F(`Başa ${k} ekle: şu anki liste`);
      const old = this.head;
      R.F('1) oldFirst = head  (eski ilk düğümü kaybetmemek için tut)', { ptrs: { oldFirst: old ? old.id : null }, code: 1 });
      const n = this.mk(k);
      R.F(`2) head = new Node(${k})  — yeni düğüm, next’i henüz null`, { order: [n.id].concat(ord), float: { [n.id]: 'up' }, ptrs: { oldFirst: old ? old.id : null }, hl: { [n.id]: 'new' }, code: 2 });
      this.head = n; if (!old && this.useTail) this.tail = n;
      R.F('   head artık yeni düğümü gösteriyor', { order: [n.id].concat(ord), float: { [n.id]: 'up' }, ptrs: { oldFirst: old ? old.id : null }, hl: { [n.id]: 'new' }, code: 2 });
      n.next = old;
      R.F('3) head.next = oldFirst  → bağlandı! Sadece 3 adım: liste ne kadar uzun olursa olsun', { ptrs: { oldFirst: old ? old.id : null }, hl: { [n.id]: 'new' }, code: 3 });
      R.F(`Bitti ✔ (O(1): sabit sayıda adım)`, { hl: { [n.id]: 'new' } });
      return R.frames;
    }
    opPopFront() {
      const R = this.recorder();
      if (!this.head) { R.F('Liste boş!'); return R.frames; }
      const old = this.head;
      R.F(`1) item = head.key  → ${old.key}`, { hl: { [old.id]: 'cur' }, code: 1 });
      this.head = old.next; if (!this.head && this.useTail) this.tail = null;
      R.F('2) head = head.next  → eski ilk düğüme artık kimse bağlı değil', { order: [old.id].concat(this.order()), float: { [old.id]: 'garbage' }, hl: { [old.id]: 'del' }, code: 2 });
      R.F(`Ulaşılamayan düğüm = çöp 🗑 → çöp toplayıcı (GC) onu sonra siler. Dönen değer: ${old.key}`, { order: [old.id].concat(this.order()), float: { [old.id]: 'garbage' }, hl: { [old.id]: 'del' } });
      this.cleanup();
      R.F('Bitti ✔ (O(1))');
      return R.frames;
    }
    opPushBack(k) {
      const R = this.recorder();
      const n = this.mk(k);
      if (this.useTail) {
        const old = this.tail;
        R.F(`Sona ${k} ekle — tail sayesinde sonu biliyoruz`, { order: this.order().concat([n.id]), float: { [n.id]: 'up' }, hl: { [n.id]: 'new' }, ptrs: { oldLast: old ? old.id : null }, code: 1 });
        if (old) old.next = n; else this.head = n;
        R.F('oldLast.next = yeni düğüm', { hl: { [n.id]: 'new' }, ptrs: { oldLast: old ? old.id : null }, code: 2 });
        this.tail = n;
        R.F('tail = yeni düğüm ✔ — O(1), yürümeye gerek yok', { hl: { [n.id]: 'new' }, code: 3 });
        return R.frames;
      }
      if (!this.head) { this.head = n; R.F('Liste boştu: head = yeni düğüm', { hl: { [n.id]: 'new' } }); return R.frames; }
      let x = this.head;
      const ord = () => this.order().concat([n.id]);
      R.F(`Sona ${k} ekle — ama son düğüm nerede? Baştan yürümek zorundayız (tail yok)`, { order: ord(), float: { [n.id]: 'up' }, ptrs: { x: x.id }, hl: { [n.id]: 'new' } });
      let steps = 0;
      while (x.next) { x = x.next; steps++; R.cmps++; R.F(`x = x.next  (${steps}. adım)`, { order: ord(), float: { [n.id]: 'up' }, ptrs: { x: x.id }, hl: { [x.id]: 'cur', [n.id]: 'new' } }); }
      x.next = n;
      R.F(`x.next null → son düğüm bulundu. x.next = yeni düğüm ✔ (${steps} adım yürüdük: O(N))`, { ptrs: { x: x.id }, hl: { [n.id]: 'new' } });
      return R.frames;
    }
    opFind(k) {
      const R = this.recorder();
      let x = this.head, i = 0;
      R.F(`${k} aranıyor: x = head`, { ptrs: { x: x ? x.id : null } });
      while (x) {
        R.cmps++;
        if (x.key === k) { R.F(`x.key = ${k} → BULUNDU (${i}. düğüm, ${R.cmps} karşılaştırma)`, { ptrs: { x: x.id }, hl: { [x.id]: 'found' } }); return R.frames; }
        R.F(`x.key = ${x.key} ≠ ${k} → x = x.next`, { ptrs: { x: x.id }, hl: { [x.id]: 'cur' } });
        x = x.next; i++;
      }
      R.F(`x = null → ${k} listede YOK (${R.cmps} karşılaştırma). İkili arama yapamayız: ortaya atlayamıyoruz!`, { ptrs: { x: null } });
      return R.frames;
    }
    opRemove(k) {
      const R = this.recorder();
      let prev = null, x = this.head;
      R.F(`${k} silinecek: önce bul (önceki düğümü de takip et!)`, { ptrs: { prev: null, x: x ? x.id : null } });
      while (x && x.key !== k) { R.cmps++; prev = x; x = x.next; R.F('prev = x;  x = x.next', { ptrs: { prev: prev.id, x: x ? x.id : null }, hl: x ? { [x.id]: 'cur' } : {} }); }
      if (!x) { R.F(`${k} listede yok.`, { ptrs: { prev: prev ? prev.id : null, x: null } }); return R.frames; }
      R.cmps++;
      R.F(`Bulundu. Şimdi ${k} düğümünün “üzerinden atlayan” bağlantıyı kur`, { ptrs: { prev: prev ? prev.id : null, x: x.id }, hl: { [x.id]: 'del' } });
      const ordBefore = this.order();
      if (prev) prev.next = x.next; else this.head = x.next;
      if (this.useTail && this.tail === x) this.tail = prev;
      R.F(prev ? 'prev.next = x.next  → x artık listede değil' : 'head = x.next (ilk düğüm siliniyordu)', { order: ordBefore, float: { [x.id]: 'garbage' }, ptrs: { prev: prev ? prev.id : null, x: x.id }, hl: { [x.id]: 'del' } });
      this.cleanup();
      R.F('Bitti ✔ Aradaki elemanları KAYDIRMADIK — sadece bir bağlantı değişti. (Ama bulmak O(N) sürdü.)');
      return R.frames;
    }
    opReverse() {
      const R = this.recorder();
      const ord = this.order();
      let prev = null, cur = this.head;
      R.F('Tersine çevir: prev = null, cur = head', { order: ord, ptrs: { prev: null, cur: cur ? cur.id : null }, code: 1 });
      while (cur) {
        const nxt = cur.next;
        R.F('1) nxt = cur.next  (devamını kaybetme!)', { order: ord, ptrs: { prev: prev ? prev.id : null, cur: cur.id, nxt: nxt ? nxt.id : null }, hl: { [cur.id]: 'cur' }, code: 2 });
        cur.next = prev;
        R.F('2) cur.next = prev  (oku ters çevir)', { order: ord, ptrs: { prev: prev ? prev.id : null, cur: cur.id, nxt: nxt ? nxt.id : null }, hl: { [cur.id]: 'cur' }, code: 3 });
        prev = cur; cur = nxt;
        R.F('3) prev = cur;  cur = nxt  (bir adım ilerle)', { order: ord, ptrs: { prev: prev.id, cur: cur ? cur.id : null }, code: 4 });
      }
      this.head = prev;
      R.F('cur = null → bitti. head = prev', { order: ord, ptrs: { prev: prev ? prev.id : null }, code: 5 });
      R.F('Liste ters döndü ✔ Hiçbir düğüm taşınmadı, sadece oklar çevrildi.');
      return R.frames;
    }
  }
  SL.LLModel = LLModel;

  /* SVG çizici */
  function renderLL(svg, f, o = {}) {
    const t = T();
    const W = o.W || 1180, H = o.H || 250, BW = 104, BH = 50, GAP = 48;
    const n = f.order.length;
    const total = n * BW + (n - 1) * GAP;
    const x0 = Math.max(110, (W - total) / 2 + 40), y0 = 90;
    const pos = {};
    f.order.forEach((id, i) => { pos[id] = { x: x0 + i * (BW + GAP), y: y0 }; });
    Object.entries(f.float || {}).forEach(([id, how]) => { if (pos[id] && how === 'up') pos[id].y = y0 - 72; });
    const byId = new Map(f.nodes.map(nd => [nd.id, nd]));
    let s = `<defs><marker id="ah${o.uid}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${t['ink-2']}"/></marker>
      <marker id="ahp${o.uid}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${t.purple}"/></marker></defs>`;
    // bağlantı okları
    f.order.forEach(id => {
      const nd = byId.get(id), p = pos[id]; if (!nd || !p) return;
      const sx = p.x + BW - 14, sy = p.y + BH / 2;
      if (nd.next == null) {
        s += `<text x="${sx + 22}" y="${sy + 5}" font-size="15" fill="${t.muted}" font-family="JetBrains Mono">null</text>`;
        s += `<line x1="${sx}" y1="${sy}" x2="${sx + 18}" y2="${sy}" stroke="${t.muted}" stroke-width="2"/>`;
        return;
      }
      const q = pos[nd.next]; if (!q) return;
      const tx = q.x, ty = q.y + BH / 2;
      const garbage = f.float && f.float[id] === 'garbage';
      const col = garbage ? t.muted : t['ink-2'];
      if (tx > sx && Math.abs(ty - sy) < 1 && tx - sx < BW + GAP + 30) s += `<line x1="${sx}" y1="${sy}" x2="${tx - 2}" y2="${ty}" stroke="${col}" stroke-width="2.4" marker-end="url(#ah${o.uid})" ${garbage ? 'stroke-dasharray="5 4"' : ''}/>`;
      else {
        const bend = tx < sx ? 70 : -40, my = Math.min(sy, ty) + (tx < sx ? BH / 2 + bend : bend);
        s += `<path d="M${sx},${sy} C${sx + 40},${my} ${tx - 40},${my} ${tx - 2},${ty}" fill="none" stroke="${col}" stroke-width="2.4" marker-end="url(#ah${o.uid})" ${garbage ? 'stroke-dasharray="5 4"' : ''}/>`;
      }
    });
    // düğümler
    const styles = { new: [t.green, '#fff'], cur: [t.amber, '#111'], found: [t.green, '#fff'], del: [t.red, '#fff'] };
    f.order.forEach(id => {
      const nd = byId.get(id), p = pos[id]; if (!nd) return;
      const st = styles[(f.hl || {})[id]];
      const garbage = f.float && f.float[id] === 'garbage';
      s += `<g opacity="${garbage ? 0.4 : 1}">`;
      s += `<rect x="${p.x}" y="${p.y}" width="${BW}" height="${BH}" rx="8" fill="${st ? st[0] : t.card}" stroke="${st ? st[0] : t['ink-2']}" stroke-width="2.2"/>`;
      s += `<line x1="${p.x + BW - 28}" y1="${p.y}" x2="${p.x + BW - 28}" y2="${p.y + BH}" stroke="${st ? st[1] : t['ink-2']}" stroke-width="1.5" opacity=".6"/>`;
      s += `<circle cx="${p.x + BW - 14}" cy="${p.y + BH / 2}" r="4" fill="${st ? st[1] : t['ink-2']}"/>`;
      s += `<text x="${p.x + (BW - 28) / 2}" y="${p.y + BH / 2 + 7}" text-anchor="middle" font-size="${String(nd.key).length > 3 ? 15 : 20}" font-weight="700" font-family="JetBrains Mono" fill="${st ? st[1] : t.ink}">${nd.key}</text>`;
      s += `<text x="${p.x + 4}" y="${p.y - 6}" font-size="11" font-family="JetBrains Mono" fill="${t.muted}">key │ next</text>`;
      if (garbage) s += `<text x="${p.x + BW / 2}" y="${p.y + BH + 18}" text-anchor="middle" font-size="13" fill="${t.red}">🗑 çöp</text>`;
      s += `</g>`;
    });
    // işaretçi değişkenleri (head, tail, cur…)
    const ptrs = Object.entries(f.ptrs || {});
    const stack = {};
    const pc = { head: t.blue, tail: t.teal, cur: t.amber, x: t.amber, prev: t.purple, nxt: t.pink, oldFirst: t.muted, oldLast: t.muted };
    ptrs.forEach(([name, id], k) => {
      const col = pc[name] || t.ink;
      if (id == null || !pos[id]) {
        s += `<text x="${20}" y="${H - 52 + (k % 3) * 17}" font-size="14" font-family="JetBrains Mono" fill="${col}" font-weight="700">${name} = null</text>`;
        return;
      }
      const p = pos[id];
      const lvl = (stack[id] = (stack[id] || 0) + 1) - 1;
      const bx = p.x + (BW - 28) / 2, by = p.y + BH + 34 + lvl * 26;
      s += `<line x1="${bx}" y1="${by - 14}" x2="${bx}" y2="${p.y + BH + 4}" stroke="${col}" stroke-width="2.4" marker-end="url(#ahp${o.uid})"/>`;
      s += `<text x="${bx}" y="${by + 2}" text-anchor="middle" font-size="15" font-weight="700" font-family="JetBrains Mono" fill="${col}">${name}</text>`;
    });
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = s;
  }
  SL.renderLL = renderLL;

  let uidc = 0;
  SL.LLViz = function (root) {
    const d = root.dataset, uid = ++uidc;
    const keys = SL.parseValues(d.keys || 'to be or not') || [];
    const useTail = 'tail' in d;
    let m = new LLModel(keys, { tail: useTail });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'll-svg');
    const note = el('div', { class: 'sv-note tree-note' });
    const info = el('div', { class: 'sv-counters' });
    const codeBox = d.code ? el('pre', { class: 'mini-code ll-code' }) : null;
    const codeLines = d.code ? d.code.split('|') : [];
    const fp = new SL.FramePlayer(f => {
      renderLL(svg, f, { uid, H: +(d.h || 250) });
      note.textContent = f.note || ' ';
      info.innerHTML = `<span class="cnt">N = <b>${f.order.filter(id => !(f.float && f.float[id])).length}</b></span><span class="cnt cmp"><b>${f.cmps || 0}</b> adım/karşılaştırma</span>`;
      if (codeBox) codeBox.innerHTML = codeLines.map((l, k) => `<div class="${f.code === k + 1 ? 'next' : f.code > k + 1 ? 'done' : ''}">${k + 1}  ${l}</div>`).join('');
    }, { speed: 1 });
    const idle = () => { const R = m.recorder(); R.F(d.hint || 'Bir işlem seçin.'); fp.load(R.frames); };
    const input = el('input', { type: 'text', class: 'key-in', value: d.default || 'yeni', size: 6 });
    const val = () => { const v = input.value.trim(); return /^-?\d+$/.test(v) ? +v : v || '?'; };
    const run = op => {
      let fr;
      switch (op) {
        case 'pushfront': fr = m.opPushFront(val()); break;
        case 'popfront': fr = m.opPopFront(); break;
        case 'pushback': fr = m.opPushBack(val()); break;
        case 'find': fr = m.opFind(val()); break;
        case 'remove': fr = m.opRemove(val()); break;
        case 'reverse': fr = m.opReverse(); break;
        case 'reset': m = new LLModel(keys, { tail: useTail }); idle(); return;
      }
      fp.load(fr); fp.play();
    };
    const OPS = { pushfront: '➕ Başa ekle', popfront: '➖ Baştan sil', pushback: '➕ Sona ekle', find: '🔍 Ara', remove: '🗑 Sil', reverse: '🔄 Tersine çevir', reset: '↺ Başlangıç' };
    const ops = (d.ops || 'pushfront,popfront,reset').split(',');
    const ctl = el('div', { class: 'sv-controls' });
    if (ops.some(o => ['pushfront', 'pushback', 'find', 'remove'].includes(o))) ctl.append(el('label', { class: 'ctl' }, 'Değer ', input));
    ops.forEach((o, k) => ctl.append(btn(OPS[o], () => run(o), k === 0 ? 'primary' : '')));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(ops[0]); } });
    root.setAttribute('data-prevent-swipe', '');
    const main = codeBox ? el('div', { class: 'll-main' }, svg, codeBox) : svg;
    root.append(ctl, main, SL.transport(fp, { min: 0.3, max: 6 }), note, info);
    SL.onTheme(() => fp.render());
    idle();
    return { stop: () => fp.pause() };
  };
  SL.register('.llviz', SL.LLViz);

  /* ---------------- .lllab — bağlı liste kod laboratuvarı ---------------- */
  const TASKS = {
    length: { fn: 'length', ret: 'num', exp: a => a.length, desc: 'düğüm sayısı' },
    sum: { fn: 'total', ret: 'num', exp: a => a.reduce((s, x) => s + x, 0), desc: 'değerlerin toplamı' },
    contains: { fn: 'contains', ret: 'bool', arg: true, exp: (a, k) => a.includes(k), desc: 'var mı?' },
    pushback: { fn: 'pushBack', ret: 'list', arg: true, exp: (a, k) => a.concat([k]), desc: 'sona ekle' },
    reverse: { fn: 'reverse', ret: 'list', exp: a => a.slice().reverse(), desc: 'tersine çevir' },
    removefirst: { fn: 'removeFirst', ret: 'list', arg: true, exp: (a, k) => { const i = a.indexOf(k); return i < 0 ? a.slice() : a.slice(0, i).concat(a.slice(i + 1)); }, desc: 'ilk eşleşeni sil' }
  };
  const pyName = s => s.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
  const PY_LL = `
import json
class Node:
    def __init__(self, key, next=None):
        self.key = key
        self.next = next
    def __repr__(self):
        return f"Node({self.key!r})"
def _build(arr):
    head = None
    for k in reversed(arr):
        head = Node(k, head)
    return head
def _to_list(head):
    out, seen, x = [], set(), head
    while x is not None:
        if not isinstance(x, Node):
            raise TypeError("next bir Node ya da None olmalı, " + type(x).__name__ + " bulundu")
        if id(x) in seen:
            raise RuntimeError("Döngü oluştu: liste kendi üzerine dönüyor!")
        seen.add(id(x)); out.append(x.key); x = x.next
    return out
def _run(fname, ret, cases):
    f = globals()[fname]
    res = []
    for arr, k in cases:
        try:
            h = _build(arr)
            r = f(h, k) if k is not None else f(h)
            res.append([_to_list(r) if ret == 'list' else r, None])
        except BaseException as e:
            res.append([None, type(e).__name__ + ": " + str(e)])
    return json.dumps(res)
`;
  SL.LLLab = function (root) {
    const d = root.dataset, task = TASKS[d.task || 'length'];
    const shell = SL.labShell(root);
    const fname = shell.lang === 'python' ? pyName(task.fn) : task.fn;
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const chips = arr => arr.length ? arr.map(x => `<span class="ll-chip">${x}</span>`).join('<i>→</i>') + '<i>→</i><span class="ll-null">null</span>' : '<span class="ll-null">head = null (boş liste)</span>';
    const cases = () => {
      const out = [[[], 5], [[7], 7], [[7], 3], [[1, 2], 2]];
      for (let t = 0; t < 60; t++) { const n = rint(9), arr = Array.from({ length: n }, () => rint(20)); out.push([arr, Math.random() < 0.6 && n ? arr[rint(n)] : rint(20)]); }
      return out.map(([a, k]) => [a, task.arg ? k : null]);
    };
    const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
    const report = (cs, res) => {
      const demo = cs[cs.length - 1];
      const [r0, e0] = res[res.length - 1];
      view.innerHTML = `<div class="mini">Örnek girdi${task.arg ? ` (değer = <b>${demo[1]}</b>)` : ''}:</div><div class="ll-chips">${chips(demo[0])}</div>` +
        `<div class="mini">Senin fonksiyonunun sonucu:</div><div class="ll-chips">${e0 ? '<span class="c-red">⚠️ ' + e0 + '</span>' : task.ret === 'list' ? chips(r0 || []) : `<b class="big">${JSON.stringify(r0)}</b>`}</div>` +
        `<div class="mini">Beklenen: ${task.ret === 'list' ? '' : '<b>' + JSON.stringify(task.exp(demo[0], demo[1])) + '</b>'}</div>${task.ret === 'list' ? `<div class="ll-chips">${chips(task.exp(demo[0], demo[1]))}</div>` : ''}`;
      for (let i = 0; i < cs.length; i++) {
        const [a, k] = cs[i], [r, e] = res[i], ex = task.exp(a, k);
        if (e || !same(r, ex)) return shell.setMsg('err', `❌ Test başarısız: liste [${a.join(' → ')}]${task.arg ? ', değer ' + k : ''} → ${e ? 'hata: ' + e : 'senin sonucun ' + JSON.stringify(r) + ', beklenen ' + JSON.stringify(ex)}`);
      }
      shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
    };
    shell.onRun = async () => {
      shell.clearOut();
      const cs = cases(); cs.push([[3, 8, 1, 6, 4], task.arg ? 1 : null]);
      const code = shell.cm.getValue();
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_LL); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_cases', py.toPy(cs));
        let res;
        try { res = JSON.parse(py.runPython(`_run(${JSON.stringify(fname)}, ${JSON.stringify(task.ret)}, _cases)`)); }
        catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        report(cs, res.map(([r, e]) => [r, e && SL.pyErrorText(e)]));
        return;
      }
      class Node { constructor(key, next = null) { this.key = key; this.next = next; } }
      let fn;
      try {
        fn = new Function('Node', 'print', '__g', '"use strict";\n' + SL.guardLoops(code) + `\n;if (typeof ${fname} !== 'function') throw new Error("Kodda '${fname}' fonksiyonu bulunamadı."); return ${fname};`)(Node, shell.print, SL.makeGuard(100000));
      } catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      const build = arr => { let h = null; for (let i = arr.length - 1; i >= 0; i--) h = new Node(arr[i], h); return h; };
      const toList = h => { const out = [], seen = new Set(); let x = h; while (x != null) { if (typeof x !== 'object') throw new Error('next bir Node ya da null olmalı'); if (seen.has(x)) throw new Error('Döngü oluştu: liste kendi üzerine dönüyor!'); seen.add(x); out.push(x.key); x = x.next; } return out; };
      const res = cs.map(([a, k]) => { try { const r = task.arg ? fn(build(a), k) : fn(build(a)); return [task.ret === 'list' ? toList(r) : r, null]; } catch (e) { return [null, SL.jsErrorText(e)]; } });
      report(cs, res);
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.lllab', SL.LLLab);

  /* ---------------- Demolar ---------------- */
  /* Dizi bellekte: adres hesabı */
  D.memory = function (root) {
    const vals = [120, 45, 300, 80, 15, 210, 60, 95];
    const types = { int: ['int', 4], double: ['double', 8], vec3: ['Vector3 (3 float)', 12], ref: ['referans / işaretçi (64-bit)', 8] };
    let t = 'int', idx = 3;
    const row = el('div', { class: 'mem-row' });
    const formula = el('div', { class: 'mem-formula' });
    const hex = n => '0x' + n.toString(16).toUpperCase();
    const draw = () => {
      const sz = types[t][1];
      row.innerHTML = '';
      vals.forEach((v, k) => {
        row.append(el('div', { class: 'mem-cell' + (k === idx ? ' on' : ''), style: `flex:${sz}` },
          el('div', { class: 'mem-val' }, t === 'ref' ? '→ 👾' : String(v)),
          el('div', { class: 'mem-idx' }, `a[${k}]`),
          el('div', { class: 'mem-addr' }, hex(0x1000 + k * sz))));
      });
      formula.innerHTML = `adres(a[<b class="c-blue">${idx}</b>]) = başlangıç + <b class="c-blue">${idx}</b> × <b class="c-red">${sz}</b> bayt = ` +
        `${hex(0x1000)} + ${idx * sz} = <b class="c-green">${hex(0x1000 + idx * sz)}</b>`;
    };
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Eleman türü ', select(Object.fromEntries(Object.entries(types).map(([k, v]) => [k, v[0]])), t, v => { t = v; draw(); })),
      slider('i =', 0, 7, idx, 1, v => { idx = v; draw(); })), row, formula);
    draw();
  };

  /* Diziye araya ekleme: kaydırma */
  D.arrinsert = function (root) {
    const CAP = 12;
    let a = [5, 12, 19, 27, 33, 41, 58, 64], pos = 2, val = 15;
    const row = el('div', { class: 'bs-row' });
    const note = el('div', { class: 'sv-note' });
    const stat = el('div', { class: 'sv-counters' });
    const draw = f => {
      row.innerHTML = Array.from({ length: CAP }, (_, i) => {
        const v = f.arr[i];
        let cls = 'bs-cell' + (v === undefined ? ' empty' : '');
        if (i === f.mv) cls += ' mid'; if (i === f.ins) cls += ' found';
        return `<div class="${cls}"><b>${v === undefined ? '' : v}</b><i>${i}</i></div>`;
      }).join('');
      note.textContent = f.note;
      stat.innerHTML = `<span class="cnt swp"><b>${f.moves}</b> taşıma</span><span class="cnt">eleman sayısı ${f.arr.filter(x => x !== undefined).length} / kapasite ${CAP}</span>`;
    };
    const fp = new SL.FramePlayer(draw, { speed: 2 });
    const plan = mode => {
      const arr = a.slice(); const frames = [];
      let moves = 0;
      if (mode === 'del') {
        frames.push({ arr: arr.slice(), mv: pos, moves, note: `a[${pos}] = ${arr[pos]} silinecek: sağındakiler bir SOLA kaymalı` });
        for (let i = pos; i < arr.length - 1; i++) { arr[i] = arr[i + 1]; moves++; frames.push({ arr: arr.slice(), mv: i, moves, note: `a[${i}] = a[${i + 1}]` }); }
        arr.pop(); a = arr;
        frames.push({ arr: arr.slice(), moves, note: `Bitti: ${moves} taşıma. Silinen elemanın sağında kaç eleman varsa o kadar iş.` });
      } else {
        if (arr.length >= CAP) { fp.load([{ arr, moves: 0, note: 'Dizi dolu! Sabit boyutlu dizide yer yok → daha büyük bir dizi gerekir (dinamik dizi bölümü).' }]); return; }
        frames.push({ arr: arr.slice(), moves, note: `${val} değerini ${pos}. indekse ekle: önce yer aç (sağdakiler bir SAĞA kaysın — sondan başlayarak!)` });
        for (let i = arr.length; i > pos; i--) { arr[i] = arr[i - 1]; moves++; frames.push({ arr: arr.slice(), mv: i, moves, note: `a[${i}] = a[${i - 1}]` }); }
        arr[pos] = val; a = arr;
        frames.push({ arr: arr.slice(), ins: pos, moves, note: `a[${pos}] = ${val} ✔ — ${moves} taşıma yaptık. Başa ekleseydik N taşıma!` });
      }
      fp.load(frames); fp.play();
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      slider('konum', 0, 8, pos, 1, v => (pos = v)), slider('değer', 1, 99, val, 1, v => (val = v)),
      btn('➕ Araya ekle', () => plan('ins'), 'primary'), btn('🗑 Sil', () => plan('del')),
      btn('↺', () => { a = [5, 12, 19, 27, 33, 41, 58, 64]; fp.load([{ arr: a.slice(), moves: 0, note: 'Başlangıç' }]); })),
    row, SL.transport(fp, { min: 0.5, max: 12 }), note, stat);
    fp.load([{ arr: a.slice(), moves: 0, note: 'Bir konum ve değer seçip “Araya ekle”ye basın.' }]);
    return { stop: () => fp.pause() };
  };

  /* Bellekte dizi vs bağlı liste + önbellek simülasyonu */
  D.memlayout = function (root) {
    const CELLS = 64, LINE = 8, CACHE = 3, N = 12;
    const grid = el('div', { class: 'mem-grid' });
    const cacheEl = el('div', { class: 'cache-box' });
    const stat = el('div', { class: 'sv-counters' });
    const note = el('div', { class: 'sv-note' });
    let arrCells, listCells, mode = 'arr';
    const draw = f => {
      grid.innerHTML = '';
      const cells = mode === 'arr' ? arrCells : listCells;
      for (let k = 0; k < CELLS; k++) {
        const line = Math.floor(k / LINE);
        let label = '', used = false;
        if (mode === 'arr') { const p = cells.indexOf(k); if (p >= 0) { label = `a[${p}]`; used = true; } }
        else {
          const p = cells.indexOf(k), pn = cells.indexOf(k - 1);
          if (p >= 0) { label = `n${p}.key`; used = true; }
          else if (pn >= 0) { label = pn < N - 1 ? `→${cells[pn + 1]}` : '→null'; used = true; }
        }
        const cls = ['mcell'];
        if (used) cls.push('used');
        if (f.cache.includes(line)) cls.push('cached');
        if (k === f.cur) cls.push('cur');
        grid.append(el('div', { class: cls.join(' '), title: `adres ${k}, satır ${line}` }, label));
      }
      cacheEl.innerHTML = `<b>CPU önbelleği</b> (${CACHE} satır × ${LINE} hücre)<br>` + Array.from({ length: CACHE }, (_, k) => `<span class="cline">${f.cache[k] != null ? 'satır ' + f.cache[k] : '—'}</span>`).join('');
      stat.innerHTML = `<span class="cnt ok"><b>${f.hits}</b> isabet · ~1 ns</span><span class="cnt swp"><b>${f.miss}</b> ıska · ~100 ns</span><span class="cnt cmp">toplam ≈ <b>${fmt(f.ns)}</b> ns</span>`;
      note.textContent = f.note;
    };
    const fp = new SL.FramePlayer(draw, { speed: 3 });
    const plan = () => {
      const cells = mode === 'arr' ? arrCells : listCells;
      let cache = [], hits = 0, miss = 0, ns = 0;
      const frames = [{ cur: -1, cache: [], hits, miss, ns, note: mode === 'arr' ? 'Dizi: elemanlar bellekte YAN YANA (hücre 4…15).' : 'Bağlı liste: her düğüm 2 hücre (değer + sonraki düğümün adresi), belleğe DAĞILMIŞ.' }];
      cells.forEach((cur, k) => {
        const line = Math.floor(cur / LINE);
        const name = mode === 'arr' ? `a[${k}]` : `n${k}`;
        let txt;
        if (cache.includes(line)) { hits++; ns += 1; cache = cache.filter(x => x !== line).concat([line]); txt = `${name}: satır ${line} önbellekte → İSABET (1 ns)`; }
        else { miss++; ns += 100; cache.push(line); if (cache.length > CACHE) cache.shift(); txt = `${name}: satır ${line} önbellekte yok → ISKA, RAM’den 8 hücrelik satır getirildi (100 ns)`; }
        frames.push({ cur, cache: cache.slice(), hits, miss, ns, note: txt });
      });
      frames.push({ cur: -1, cache: cache.slice(), hits, miss, ns, note: `Bitti: ${hits} isabet, ${miss} ıska → ~${fmt(ns)} ns. ${mode === 'arr' ? 'Bir satır getirildiğinde sonraki 7 eleman bedavaya geldi!' : 'Neredeyse her adım yeni bir satır istedi.'}` });
      fp.load(frames);
    };
    const setup = () => {
      arrCells = Array.from({ length: N }, (_, k) => 4 + k);
      const free = SL.shuffle(Array.from({ length: CELLS / 2 }, (_, k) => 2 * k).filter(c => c < 4 || c >= 4 + N + 2)).slice(0, N);
      listCells = free;
      plan();
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Gezilecek yapı ', select({ arr: 'Dizi (a[0] … a[11])', list: 'Bağlı liste (n0 → n1 → …)' }, mode, v => { mode = v; plan(); })),
      btn('🎲 Listeyi yeniden dağıt', setup)),
    el('div', { class: 'cache-wrap' }, grid, cacheEl), SL.transport(fp, { min: 0.5, max: 20 }), stat, note);
    setup();
    return { stop: () => fp.pause() };
  };

  /* Dinamik dizi: kapasite iki katına çıkar */
  D.dynarray = function (root) {
    let growth = 'x2';
    const boxes = el('div', { class: 'dyn-boxes' });
    const note = el('div', { class: 'sv-note' });
    const stat = el('div', { class: 'sv-counters' });
    const draw = f => {
      boxes.innerHTML = Array.from({ length: f.cap }, (_, i) => `<div class="dyn-cell${i < f.n ? ' full' : ''}${i === f.n - 1 ? ' last' : ''}${f.copying && i < f.n - 1 ? ' copy' : ''}">${i < f.n ? i + 1 : ''}</div>`).join('');
      note.textContent = f.note;
      stat.innerHTML = `<span class="cnt">eleman <b>${f.n}</b></span><span class="cnt">kapasite <b>${f.cap}</b></span>` +
        `<span class="cnt swp"><b>${fmt(f.copies)}</b> kopyalama (toplam)</span><span class="cnt cmp">eleman başına <b>${f.n ? (f.copies / f.n).toFixed(2) : 0}</b> kopya</span>`;
    };
    const fp = new SL.FramePlayer(draw, { speed: 3 });
    const plan = () => {
      const frames = [{ n: 0, cap: 1, copies: 0, note: 'Boş dinamik dizi, kapasite 1. Sırayla 64 eleman ekleyeceğiz.' }];
      let n = 0, cap = 1, copies = 0;
      for (let k = 0; k < 64; k++) {
        if (n === cap) {
          const nc = growth === 'x2' ? cap * 2 : growth === 'x15' ? Math.ceil(cap * 1.5) : cap + 1;
          copies += n;
          frames.push({ n, cap: nc, copies, copying: true, note: `Dolu! Kapasite ${cap} → ${nc}: YENİ dizi ayır, ${n} elemanı kopyala (toplam kopya: ${copies})` });
          cap = nc;
        }
        n++;
        frames.push({ n, cap, copies, note: `push(${n}) — boş yer var, sona yaz (1 iş)` });
      }
      frames.push({ n, cap, copies, note: `64 elemanda toplam ${copies} kopya → eleman başına ${(copies / n).toFixed(2)}. ${growth === 'x2' ? 'İki katına çıkarmak: toplam kopya < 2N → ortalama SABİT (amortize O(1)).' : growth === 'x1' ? '+1 büyütmek: toplam ~N²/2 kopya → çok yavaş!' : '1,5 kat: biraz daha çok kopya, ama daha az boş yer.'}` });
      fp.load(frames, 'end');
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Büyüme kuralı ', select({ x2: 'kapasite × 2 (iki katı)', x15: 'kapasite × 1,5', x1: 'kapasite + 1 (yeterince)' }, growth, v => { growth = v; plan(); }))),
    boxes, SL.transport(fp, { min: 1, max: 60 }), note, stat);
    plan();
    return { stop: () => fp.pause() };
  };

  /* Canlı ölçüm: dizi vs bağlı liste (bu tarayıcıda) */
  D.bench = function (root) {
    const tbl = el('table', { class: 'dbl-t' });
    let busy = false;
    const time = f => { const t0 = performance.now(); const r = f(); return [performance.now() - t0, r]; };
    const run = async which => {
      if (busy) return; busy = true;
      tbl.innerHTML = '<tr><th>N</th><th>dizi</th><th>bağlı liste</th><th>hangisi kaç kat hızlı?</th></tr>';
      const sizes = which === 'front' ? [1000, 4000, 16000, 64000] : [100000, 1000000, 4000000];
      for (const N of sizes) {
        await new Promise(r => setTimeout(r, 30));
        let ta, tl;
        if (which === 'front') {
          [ta] = time(() => { const a = []; for (let i = 0; i < N; i++) a.unshift(i); return a.length; });
          [tl] = time(() => { let h = null; for (let i = 0; i < N; i++) h = { key: i, next: h }; return h; });
        } else if (which === 'back') {
          [ta] = time(() => { const a = []; for (let i = 0; i < N; i++) a.push(i); return a.length; });
          [tl] = time(() => { let h = null, t = null; for (let i = 0; i < N; i++) { const n = { key: i, next: null }; if (t) t.next = n; else h = n; t = n; } return h; });
        } else {
          const a = new Array(N); for (let i = 0; i < N; i++) a[i] = i;
          // listeyi rastgele sırada ayrılmış düğümlerle kur (gerçek programlardaki dağınıklığı taklit eder)
          const nodes = new Array(N); for (let i = 0; i < N; i++) nodes[i] = { key: i, next: null };
          const perm = SL.shuffle(Array.from({ length: N }, (_, i) => i));
          for (let i = 0; i < N - 1; i++) nodes[perm[i]].next = nodes[perm[i + 1]];
          const head = nodes[perm[0]];
          [ta] = time(() => { let s = 0; for (let i = 0; i < N; i++) s += a[i]; return s; });
          [tl] = time(() => { let s = 0; for (let x = head; x; x = x.next) s += x.key; return s; });
        }
        const faster = ta < tl ? `dizi ${(tl / Math.max(ta, 0.01)).toFixed(1)}×` : `liste ${(ta / Math.max(tl, 0.01)).toFixed(1)}×`;
        tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(N)}</td><td>${ta.toFixed(1)} ms</td><td>${tl.toFixed(1)} ms</td><td><b>${faster}</b></td></tr>`);
      }
      busy = false;
    };
    root.append(el('div', { class: 'sv-controls' },
      btn('⬅ N kez BAŞA ekle', () => run('front'), 'primary'), btn('➡ N kez SONA ekle', () => run('back')), btn('🔁 Tümünü gez (topla)', () => run('scan'))), tbl);
    tbl.innerHTML = '<tr><td class="mini">Bir deney seçin. Ölçüm <b>bu bilgisayarda, şu anda</b> yapılır; sonuçlar makineden makineye değişir.</td></tr>';
  };
})();
