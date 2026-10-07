/* =====================================================================
   dengeli.js — Dengeli arama ağaçları (core.js + agac.js gerekir)
   Demolar: t23 (2-3 ağacı), llrb (sola yatık kırmızı-siyah), rotate,
            heightexp (yükseklik deneyi), btree (B-ağacı hesaplayıcı)
   Bileşen: .rotlab (rotateLeft yaz)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  /* ================= 2-3 ağacı ================= */
  class T23 {
    constructor() { this.root = null; this.nid = 0; }
    mk(keys, kids) { return { id: ++this.nid, keys, kids: kids || [] }; }
    snap(x = this.root) { return x ? { id: x.id, keys: x.keys.slice(), kids: x.kids.map(k => this.snap(k)) } : null; }
    height() { let h = 0, x = this.root; while (x && x.kids.length) { x = x.kids[0]; h++; } return x ? h : -1; }
    insertSilent(k) { this.opInsert(k, true); }
    opInsert(key, silent) {
      const F = [], path = [];
      const P = (note, hl = {}) => { if (!silent) F.push({ root: this.snap(), hl: Object.assign({}, hl), note }); };
      if (!this.root) { this.root = this.mk([key]); P(`Ağaç boştu: ${key} kök oldu`, { [this.root.id]: 'new' }); return F; }
      P(`insert(${key}): arama gibi aşağı in`);
      // yukarıya “taşan” orta anahtarı ve iki parçayı döndürür
      const ins = x => {
        path.push(x.id);
        if (x.keys.includes(key)) { P(`${key} zaten var`, Object.fromEntries(path.map(i => [i, 'path']))); return null; }
        if (!x.kids.length) {
          x.keys.push(key); x.keys.sort((a, b) => cmp(a, b));
          P(x.keys.length === 2 ? `Yaprak ${x.keys.length - 1} anahtarlıydı → ${key} eklendi: artık 3-düğüm (2 anahtar) ✔` : `Yaprak zaten 2 anahtarlıydı → geçici 4-düğüm (3 anahtar) oluştu ⚠️`, Object.assign(Object.fromEntries(path.map(i => [i, 'path'])), { [x.id]: x.keys.length === 3 ? 'bad' : 'new' }));
        } else {
          let i = 0; while (i < x.keys.length && cmp(key, x.keys[i]) > 0) i++;
          P(`${key} → ${['sol', 'orta', 'sağ'][x.keys.length === 1 ? (i === 0 ? 0 : 2) : i]} bağlantıdan aşağı`, Object.assign(Object.fromEntries(path.map(q => [q, 'path'])), { [x.id]: 'cur' }));
          const up = ins(x.kids[i]);
          if (up) {
            const [mid, L, R] = up;
            x.keys.splice(i, 0, mid); x.kids.splice(i, 1, L, R);
            P(`Orta anahtar ${mid} ebeveyne çıktı` + (x.keys.length === 3 ? ' → ebeveyn de 4-düğüm oldu ⚠️' : ' ✔'), { [x.id]: x.keys.length === 3 ? 'bad' : 'new' });
          }
        }
        if (x.keys.length === 3) {
          const [a, m, b] = x.keys;
          const L = this.mk([a], x.kids.slice(0, 2)), R = this.mk([b], x.kids.slice(2));
          if (x === this.root) {
            this.root = this.mk([m], [L, R]);
            P(`Kök 4-düğümdü → böl: ${m} YENİ KÖK oldu. Ağacın yüksekliği 1 arttı — ama TÜM yapraklar hâlâ aynı derinlikte!`, { [this.root.id]: 'new', [L.id]: 'split', [R.id]: 'split' });
            return null;
          }
          return [m, L, R];
        }
        return null;
      };
      ins(this.root);
      P(`Bitti. Yükseklik ${this.height()} — mükemmel denge: her yaprak kökten aynı uzaklıkta.`);
      return F;
    }
  }
  function render23(svg, f, W, H) {
    const t = T();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    if (!f.root) { svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="${t.muted}" font-family="JetBrains Mono">boş ağaç</text>`; return; }
    let leafX = 0, maxD = 0; const pos = {};
    const kw = 28, pad = 10, gap = 16;
    const width = n => n.keys.length * kw + pad;
    const lay = (n, d) => { maxD = Math.max(maxD, d); if (!n.kids.length) { const w = width(n); pos[n.id] = { x: leafX + w / 2, d, w }; leafX += w + gap; return; } n.kids.forEach(k => lay(k, d + 1)); const a = pos[n.kids[0].id].x, b = pos[n.kids[n.kids.length - 1].id].x; pos[n.id] = { x: (a + b) / 2, d, w: width(n) }; };
    lay(f.root, 0);
    const scale = Math.min(1.6, (W - 20) / Math.max(leafX, 1)), ox = (W - leafX * scale) / 2, dy = Math.min(80, (H - 50) / Math.max(1, maxD));
    const X = id => ox + pos[id].x * scale, Y = id => 24 + pos[id].d * dy;
    let s = '';
    const edges = n => n.kids.forEach((k, i) => { const p = pos[n.id], w = p.w * scale; const sx = X(n.id) - w / 2 + (n.kids.length === 1 ? w / 2 : (i * w) / (n.kids.length - 1)); s += `<line x1="${sx}" y1="${Y(n.id) + 15}" x2="${X(k.id)}" y2="${Y(k.id) - 15}" stroke="${t['ink-2']}" stroke-width="2"/>`; edges(k); });
    edges(f.root);
    const nodes = n => {
      const p = pos[n.id], w = p.w * scale, st = f.hl[n.id];
      const fill = st === 'new' ? t.green : st === 'bad' ? t.red : st === 'cur' ? t.amber : st === 'split' ? t.purple : t.card;
      const ink = st && st !== 'path' ? (st === 'cur' ? '#111' : '#fff') : t.ink;
      s += `<rect x="${X(n.id) - w / 2}" y="${Y(n.id) - 15}" width="${w}" height="30" rx="8" fill="${fill}" stroke="${st === 'path' ? t.amber : st ? fill : t['ink-2']}" stroke-width="${st === 'path' ? 3 : 2}"/>`;
      n.keys.forEach((k, i) => { s += `<text x="${X(n.id) - w / 2 + (pad / 2 + kw * i + kw / 2) * scale}" y="${Y(n.id) + 6}" text-anchor="middle" font-size="${Math.max(11, 15 * Math.min(scale, 1.2))}" font-weight="700" font-family="JetBrains Mono" fill="${ink}">${k}</text>`; if (i) s += `<line x1="${X(n.id) - w / 2 + (pad / 2 + kw * i) * scale}" y1="${Y(n.id) - 12}" x2="${X(n.id) - w / 2 + (pad / 2 + kw * i) * scale}" y2="${Y(n.id) + 12}" stroke="${ink}" opacity=".4"/>`; });
      n.kids.forEach(nodes);
    };
    nodes(f.root);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = s;
  }
  D.t23 = function (root) {
    const d = root.dataset, W = 1180, H = +(d.h || 300);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 't23-svg');
    const note = el('div', { class: 'sv-note tree-note' });
    const stat = el('div', { class: 'sv-counters' });
    let m = new T23();
    const fp = new SL.FramePlayer(f => { render23(svg, f, W, H); note.textContent = f.note; }, { speed: 1.2 });
    const input = el('input', { type: 'text', class: 'key-in', size: 4, value: 'K' });
    const info = () => { stat.innerHTML = `<span class="cnt">yükseklik <b>${m.height() < 0 ? '—' : m.height()}</b></span>`; };
    const run = frames => { fp.load(frames); fp.play(); info(); };
    const seq = keys => { m = new T23(); let F = [{ root: null, hl: {}, note: 'Boş ağaç. Sırayla eklenecek: ' + keys.join(' ') }]; keys.forEach(k => { F = F.concat(m.opInsert(k)); }); run(F); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Anahtar ', input),
      btn('➕ Ekle', () => { const k = input.value.trim().toUpperCase(); if (k) run(m.opInsert(isNaN(+k) ? k : +k)); }, 'primary'),
      btn('▶ S E A R C H X M P L', () => seq('S E A R C H X M P L'.split(' '))),
      btn('📈 Sıralı: A C E H L M P R S X', () => seq('A C E H L M P R S X'.split(' '))),
      btn('🧹 Temizle', () => { m = new T23(); fp.load([{ root: null, hl: {}, note: 'Boş ağaç' }]); info(); })),
    svg, SL.transport(fp, { min: 0.3, max: 8 }), note, stat);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const k = input.value.trim().toUpperCase(); if (k) run(m.opInsert(isNaN(+k) ? k : +k)); } });
    SL.onTheme(() => fp.render());
    fp.load([{ root: null, hl: {}, note: 'Bir anahtar ekleyin ya da hazır diziyi oynatın.' }]); info();
    return { stop: () => fp.pause() };
  };

  /* ================= Sola yatık kırmızı-siyah BST ================= */
  class LLRB {
    constructor() { this.root = null; this.nid = 0; }
    mk(key) { return { id: ++this.nid, key, left: null, right: null, red: true, size: 1 }; }
    isRed(x) { return !!x && x.red; }
    snap(x = this.root) { return x ? { id: x.id, key: x.key, red: x.red, n: x.size, l: this.snap(x.left), r: this.snap(x.right) } : null; }
    height(x = this.root) { return x ? 1 + Math.max(this.height(x.left), this.height(x.right)) : -1; }
    blackHeight() { let h = 0, x = this.root; while (x) { if (!x.red) h++; x = x.left; } return h; }
    sz(x) { return x ? x.size : 0; }
    rotL(h) { const x = h.right; h.right = x.left; x.left = h; x.red = h.red; h.red = true; x.size = h.size; h.size = 1 + this.sz(h.left) + this.sz(h.right); return x; }
    rotR(h) { const x = h.left; h.left = x.right; x.right = h; x.red = h.red; h.red = true; x.size = h.size; h.size = 1 + this.sz(h.left) + this.sz(h.right); return x; }
    flip(h) { h.red = true; h.left.red = false; h.right.red = false; }
    insert(key, frames) {
      const P = (note, hl = {}) => frames && frames.push({ root: this.snap(), hl: Object.assign({}, hl), note });
      const put = (h, parent, side) => {
        if (!h) { const n = this.mk(key); if (parent) parent[side] = n; else this.root = n; P(`Yeni düğüm ${key} her zaman KIRMIZI bağlantıyla eklenir (bir 2-3 düğümüne anahtar eklemek gibi)`, { [n.id]: 'new' }); return n; }
        const c = cmp(key, h.key);
        if (c === 0) return h;
        P(`${key} ${c < 0 ? '<' : '>'} ${h.key} → ${c < 0 ? 'sola' : 'sağa'}`, { [h.id]: 'cur' });
        if (c < 0) h.left = put(h.left, h, 'left'); else h.right = put(h.right, h, 'right');
        h.size = 1 + this.sz(h.left) + this.sz(h.right);
        const fix = (newH, note, hl) => { if (parent) parent[side] = newH; else this.root = newH; P(note, hl); return newH; };
        if (this.isRed(h.right) && !this.isRed(h.left)) { const msg = `Sağa yatık kırmızı bağlantı (${h.key}–${h.right.key}) → rotateLeft(${h.key}): ${h.right.key} yukarı çıkar`; const x = this.rotL(h); h = fix(x, msg, { [x.id]: 'cur', [x.left.id]: 'cur' }); }
        if (this.isRed(h.left) && this.isRed(h.left.left)) { const msg = `Art arda iki kırmızı sol bağlantı (${h.left.left.key}–${h.left.key}–${h.key}) → rotateRight(${h.key}): ${h.left.key} yukarı çıkar`; const x = this.rotR(h); h = fix(x, msg, { [x.id]: 'cur', [x.right.id]: 'cur' }); }
        if (this.isRed(h.left) && this.isRed(h.right)) { this.flip(h); if (parent) parent[side] = h; else this.root = h; P(`İki çocuk da kırmızı (geçici 4-düğüm) → RENK ÇEVİR: ${h.key} yukarı “çıkar”`, { [h.id]: 'new' }); }
        return h;
      };
      this.root = put(this.root, null, null);
      if (this.root.red) { this.root.red = false; P('Kök her zaman siyah'); }
    }
  }
  SL.LLRB = LLRB;
  D.llrb = function (root) {
    const d = root.dataset;
    const canvas = el('canvas');
    let flat = false;
    const tv = new SL.TreeView(canvas, 1180, +(d.h || 300), { maxSp: 60 });
    const note = el('div', { class: 'sv-note tree-note' });
    const stat = el('div', { class: 'sv-counters' });
    let m = new LLRB();
    const fp = new SL.FramePlayer(f => { tv.o.flatRed = flat; tv.show(f); note.textContent = f.note; const s = SL.treeStats(f.root); let bh = -1; for (let y = f.root; y; y = y.l) if (!y.red) bh++; stat.innerHTML = `<span class="cnt">N = <b>${s.n}</b></span><span class="cnt">yükseklik <b>${s.h < 0 ? '—' : s.h}</b></span><span class="cnt">siyah yükseklik <b>${bh < 0 ? '—' : bh}</b></span><span class="cnt">lg N = ${s.n ? Math.log2(s.n).toFixed(1) : 0}</span>`; }, { speed: 1.5 });
    const input = el('input', { type: 'text', class: 'key-in', size: 4, value: 'K' });
    const go = keys => { const F = [{ root: m.snap(), hl: {}, note: 'Ekleniyor: ' + keys.join(' ') }]; keys.forEach(k => m.insert(k, F)); fp.load(F); fp.play(); };
    const val = () => { const k = input.value.trim().toUpperCase(); return /^\d+$/.test(k) ? +k : k; };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Anahtar ', input),
      btn('➕ Ekle', () => { const k = val(); if (k !== '') go([k]); }, 'primary'),
      btn('▶ S E A R C H X M P L', () => { m = new LLRB(); go('S E A R C H X M P L'.split(' ')); }),
      btn('📈 Sıralı A…O', () => { m = new LLRB(); go('A B C D E F G H I J K L M N O'.split(' ')); }),
      el('label', { class: 'ctl' }, el('input', { type: 'checkbox', onchange: e => { flat = e.target.checked; fp.render(); } }), ' 2-3 görünümü (kırmızıları yatay çiz)'),
      btn('🧹', () => { m = new LLRB(); fp.load([{ root: null, hl: {}, note: 'Boş ağaç' }]); })),
    canvas, SL.transport(fp, { min: 0.3, max: 8 }), note, stat);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const k = val(); if (k !== '') go([k]); } });
    fp.load([{ root: null, hl: {}, note: 'Anahtar ekleyin ya da hazır diziyi oynatın.' }]);
    return { stop: () => fp.pause() };
  };

  /* ================= Döndürme demosu ================= */
  D.rotate = function (root) {
    const canvas = el('canvas');
    const tv = new SL.TreeView(canvas, 760, 280, { maxSp: 70 });
    const note = el('div', { class: 'sv-note tree-note' });
    const mk = (key, l, r, red) => ({ key, left: l, right: r, red: !!red });
    let id = 0;
    const snap = x => (x ? { id: x.uid || (x.uid = ++id), key: x.key, red: x.red, l: snap(x.left), r: snap(x.right) } : null);
    let rootN;
    const reset = () => { id = 0; rootN = mk('E', mk('A'), mk('S', mk('M'), mk('X')), false); rootN.right.red = true; draw('E ile S arasındaki bağlantı kırmızı ve SAĞA yatık. A: E’den küçükler · M: E ile S arasındakiler · X: S’den büyükler. rotateLeft(E) ne yapar?'); };
    const draw = msg => { tv.show({ root: snap(rootN), hl: {} }); note.textContent = msg; };
    const rotL = () => { const h = rootN, x = h.right; if (!x) return draw('Sağ çocuk yok'); h.right = x.left; x.left = h; x.red = h.red; h.red = true; rootN = x; draw(`rotateLeft(${h.key}): ${x.key} yukarı çıktı, ${h.key} onun sol çocuğu oldu. Ortadaki alt ağaç (${h.right ? h.right.key : 'null'}) artık ${h.key} düğümünün sağında. Simetrik sıra korundu ✔`); };
    const rotR = () => { const h = rootN, x = h.left; if (!x) return draw('Sol çocuk yok'); h.left = x.right; x.right = h; x.red = h.red; h.red = true; rootN = x; draw(`rotateRight(${h.key}): ${x.key} yukarı çıktı, ${h.key} onun sağ çocuğu oldu. Ortadaki alt ağaç (${h.left ? h.left.key : 'null'}) artık ${h.key} düğümünün solunda. Simetrik sıra korundu ✔`); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('↶ rotateLeft(kök)', rotL, 'primary'), btn('↷ rotateRight(kök)', rotR), btn('↺', reset)), canvas, note);
    reset();
  };

  /* ================= Yükseklik deneyi ================= */
  D.heightexp = function (root) {
    const tbl = el('table', { class: 'dbl-t' });
    let busy = false;
    const bstH = keys => { const n = keys.length, L = new Int32Array(n).fill(-1), R = new Int32Array(n).fill(-1); let h = 0; for (let i = 1; i < n; i++) { let x = 0, d = 1; for (;;) { if (keys[i] < keys[x]) { if (L[x] < 0) { L[x] = i; break; } x = L[x]; } else { if (R[x] < 0) { R[x] = i; break; } x = R[x]; } d++; } if (d > h) h = d; } return h; };
    const rbH = keys => { const m = new LLRB(); keys.forEach(k => m.insert(k)); return m.height(); };
    const run = async () => {
      if (busy) return; busy = true;
      tbl.innerHTML = '<tr><th>N</th><th>lg N</th><th>BST rastgele</th><th>BST sıralı</th><th>kırmızı-siyah rastgele</th><th>kırmızı-siyah sıralı</th></tr>';
      for (const N of [1000, 10000, 100000]) {
        await new Promise(r => setTimeout(r, 30));
        const rnd = SL.shuffle(Array.from({ length: N }, (_, i) => i)), srt = Array.from({ length: N }, (_, i) => i);
        tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(N)}</td><td>${Math.log2(N).toFixed(1)}</td><td>${bstH(rnd)}</td><td class="c-red"><b>${fmt(N - 1)}</b></td><td class="c-green"><b>${rbH(rnd)}</b></td><td class="c-green"><b>${rbH(srt)}</b></td></tr>`);
      }
      busy = false;
    };
    root.append(el('div', { class: 'sv-controls' }, btn('🧪 Deneyi başlat', run, 'primary'), el('span', { class: 'mini' }, 'N anahtarı ekleyip ağacın yüksekliğini ölçer. Kırmızı-siyah ağaçta yükseklik ≤ 2 lg N garantili.')), tbl);
    tbl.innerHTML = '<tr><td class="mini">“Deneyi başlat”a basın.</td></tr>';
  };

  /* ================= B-ağacı hesaplayıcı ================= */
  D.btree = function (root) {
    let e = 9, M = 1000;
    const out = el('div');
    const upd = () => {
      const N = Math.pow(10, e), hB = Math.ceil(Math.log(N) / Math.log(M / 2)), hBest = Math.ceil(Math.log(N) / Math.log(M)), hBin = Math.ceil(Math.log2(N));
      out.innerHTML = `<table class="sum-t" style="font-size:22px"><tr><th>yapı</th><th>düğüm başına anahtar</th><th>yükseklik (≈ okuma sayısı)</th><th>diskten okuma süresi*</th></tr>` +
        `<tr><td>dengeli ikili ağaç</td><td>1</td><td><b>${hBin}</b></td><td>${hBin * 10} ms</td></tr>` +
        `<tr><td><b>B-ağacı</b> (M = ${fmt(M)})</td><td>${fmt(M / 2)} – ${fmt(M - 1)}</td><td><b class="c-green">${hBest} – ${hB}</b></td><td>${hBest * 10} – ${hB * 10} ms</td></tr></table>` +
        `<p class="mini">N = ${SL.short ? SL.short(N) : fmt(N)} kayıt. * Her düğüm bir disk sayfası; mekanik diskte bir okuma ~10 ms varsayımıyla. Kök (ve çoğu zaman ikinci seviye) zaten bellekte tutulur → pratikte 1–2 disk okuması!</p>`;
    };
    root.append(el('div', { class: 'sv-controls' }, slider('N = 10ⁿ, n =', 3, 12, e, 1, v => { e = v; upd(); }), el('label', { class: 'ctl' }, 'M (sayfa başına bağlantı) ', select({ 4: '4 (2-3-4 ağacı)', 100: '100', 1000: '1000', 10000: '10.000' }, '1000', v => { M = +v; upd(); }))), out);
    upd();
  };

  /* ================= .rotlab ================= */
  const PY_R = `
import json, random
class Node:
    def __init__(self, key, red=False):
        self.key = key; self.left = None; self.right = None; self.red = red
def _build(keys):
    root = None
    def put(h, k):
        if h is None: return Node(k)
        if k < h.key: h.left = put(h.left, k)
        elif k > h.key: h.right = put(h.right, k)
        return h
    for k in keys: root = put(root, k)
    return root
def _ino(x, out):
    if x is None: return
    _ino(x.left, out); out.append(x.key); _ino(x.right, out)
def _run(cases):
    res = []
    for keys, hred in cases:
        h = _build(keys)
        h.red = hred
        h.right.red = True
        old_r, old_rl = h.right.key, (h.right.left.key if h.right.left else None)
        before = []; _ino(h, before)
        try:
            x = rotate_left(h)
            after = []; _ino(x, after)
            ok = (x is not None and x.key == old_r and x.left is h and (h.right.key if h.right else None) == old_rl and after == before and x.red == hred and h.red == True)
            res.append([ok, None, after])
        except BaseException as e:
            res.append([False, type(e).__name__ + ": " + str(e), None])
    return json.dumps(res)
`;
  SL.RotLab = function (root) {
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const cases = () => { const cs = []; for (let t = 0; t < 30; t++) { const n = 3 + rint(8); let keys; do { keys = SL.shuffle(Array.from({ length: 20 }, (_, i) => i)).slice(0, n); } while (keys.every(k => k <= keys[0])); cs.push([keys, Math.random() < 0.5]); } return cs; };
    const report = res => {
      const bad = res.findIndex(r => !r[0]);
      view.innerHTML = `<div class="mini">Test: rastgele bir BST’nin kökünde rotateLeft. Kontrol edilenler: yeni kök = eski sağ çocuk · eski kök onun solunda · eski kökün sağı = yeni kökün eski solu · inorder sırası aynı · renkler (x.red = h.red, h.red = true).</div>`;
      if (bad >= 0) shell.setMsg('err', `❌ ${bad + 1}. test başarısız${res[bad][1] ? ': ' + res[bad][1] : ' (bağlantılardan ya da renklerden biri yanlış)'}`);
      else shell.setMsg('ok', `✅ ${res.length}/${res.length} test geçti! Döndürme doğru.`);
    };
    shell.onRun = async () => {
      shell.clearOut();
      const cs = cases(), code = shell.cm.getValue();
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_R); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_cases', py.toPy(cs));
        let res; try { res = JSON.parse(py.runPython('_run(_cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        report(res.map(([ok, e, a]) => [ok, e && SL.pyErrorText(e), a]));
        return;
      }
      let rot;
      try { rot = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof rotateLeft !== 'function') throw new Error(\"Kodda 'rotateLeft(h)' fonksiyonu bulunamadı.\"); return rotateLeft;")(shell.print, SL.makeGuard(100000)); }
      catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası: ' : 'Hata: ') + e.message); return; }
      const build = keys => { let r = null; const put = (h, k) => { if (!h) return { key: k, left: null, right: null, red: false }; if (k < h.key) h.left = put(h.left, k); else if (k > h.key) h.right = put(h.right, k); return h; }; keys.forEach(k => (r = put(r, k))); return r; };
      const ino = (x, out) => { if (!x) return out; ino(x.left, out); out.push(x.key); ino(x.right, out); return out; };
      report(cs.map(([keys, hred]) => {
        const h = build(keys); h.red = hred; h.right.red = true;
        const oldR = h.right, oldRL = h.right.left, before = ino(h, []);
        try { const x = rot(h); const after = ino(x, []); return [x === oldR && x.left === h && h.right === oldRL && JSON.stringify(after) === JSON.stringify(before) && x.red === hred && h.red === true, null]; }
        catch (e) { return [false, SL.jsErrorText(e)]; }
      }));
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.rotlab', SL.RotLab);
})();
