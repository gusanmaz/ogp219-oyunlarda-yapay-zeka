/* =====================================================================
   agac.js — Ağaç görselleştirmeleri (core.js'e ihtiyaç duyar)
   - TreeView: ikili ağacı canvas'ta çizer, kareler arasında düğümleri kaydırır
   - BSTModel: BST işlemlerini adım adım "kare" (frame) olarak kaydeder
   - Bileşenler: .bstviz (BST oyun alanı), .travviz (gezinme), .treelab (kod lab)
   Kare biçimi: { root: {id,key,n,l,r}, hl: {id: stil}, note, stack, out, cmps, sub }
   ===================================================================== */
(function () {
  'use strict';
  const { el, select, btn } = SL;
  const T = () => SL.theme();
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  SL.keyCmp = cmp;

  /* ---------------- yerleşim ---------------- */
  SL.layoutBinary = function (root, W, H, o = {}) {
    const order = [];
    let height = -1;
    // özyinelemesiz inorder (derin ağaçlarda yığın taşmasın)
    const st = []; let x = root, d = 0;
    while (x || st.length) {
      while (x) { st.push([x, d]); x = x.l; d++; }
      const [y, dy] = st.pop(); order.push([y, dy]); if (dy > height) height = dy;
      x = y.r; d = dy + 1;
    }
    const n = order.length;
    const mx = o.mx != null ? o.mx : 26, top = o.top != null ? o.top : 28, bottom = o.bottom != null ? o.bottom : 26;
    const sp = n > 1 ? Math.min(o.maxSp || 66, (W - 2 * mx) / (n - 1)) : 0;
    const x0 = (W - sp * (n - 1)) / 2;
    const dy = height > 0 ? Math.min(o.maxDy || 74, (H - top - bottom) / height) : 0;
    const pos = new Map();
    order.forEach(([nd, dd], i) => pos.set(nd.id, { x: x0 + i * sp, y: top + dd * dy, key: nd.key, n: nd.n, d: dd }));
    const r = Math.max(3, Math.min(o.maxR || 19, n > 1 ? sp * 0.44 : 19, height > 0 ? dy * 0.36 : 19));
    return { pos, r, sp, dy, height, n };
  };
  SL.treeStats = function (root) {
    let n = 0, h = -1, ipl = 0;
    const st = root ? [[root, 0]] : [];
    while (st.length) { const [x, d] = st.pop(); n++; ipl += d; if (d > h) h = d; if (x.l) st.push([x.l, d + 1]); if (x.r) st.push([x.r, d + 1]); }
    return { n, h, avg: n ? ipl / n : 0 };
  };
  SL.inorderKeys = function (root) {
    const out = [], st = []; let x = root;
    while (x || st.length) { while (x) { st.push(x); x = x.l; } x = st.pop(); out.push(x.key); x = x.r; }
    return out;
  };
  const subtreeIds = (x, set = new Set()) => { const st = x ? [x] : []; while (st.length) { const y = st.pop(); set.add(y.id); if (y.l) st.push(y.l); if (y.r) st.push(y.r); } return set; };
  const findSnap = (root, id) => { const st = root ? [root] : []; while (st.length) { const y = st.pop(); if (y.id === id) return y; if (y.l) st.push(y.l); if (y.r) st.push(y.r); } return null; };

  /* ---------------- TreeView (canvas) ---------------- */
  class TreeView {
    constructor(canvas, W, H, o = {}) {
      this.c = canvas; this.W = W; this.H = H; this.o = o;
      this.ctx = SL.setupCanvas(canvas, W, H);
      this.cur = new Map(); this.frame = null;
      SL.onTheme(() => this.frame && this.draw());
    }
    show(frame, animate = true) {
      this.frame = frame;
      const L = SL.layoutBinary(frame.root, this.W, this.H, this.o);
      this.L = L;
      cancelAnimationFrame(this.raf);
      const from = this.cur;
      if (!animate || !from.size || L.n > 150) {
        this.cur = new Map([...L.pos].map(([k, v]) => [k, { x: v.x, y: v.y }]));
        this.draw(); return;
      }
      const t0 = performance.now(), dur = 380;
      const tick = now => {
        const t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        this.cur = new Map();
        L.pos.forEach((v, k) => { const f = from.get(k) || { x: v.x, y: v.y - 24 }; this.cur.set(k, { x: f.x + (v.x - f.x) * e, y: f.y + (v.y - f.y) * e }); });
        this.draw(t);
        if (t < 1) this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
    draw(fadeIn = 1) {
      const ctx = this.ctx, t = T(), f = this.frame, L = this.L, r = L.r;
      ctx.clearRect(0, 0, this.W, this.H);
      if (!f.root) {
        ctx.fillStyle = t.muted; ctx.font = '600 18px "JetBrains Mono"'; ctx.textAlign = 'center';
        ctx.fillText('boş ağaç (root = null)', this.W / 2, this.H / 2); return;
      }
      const hl = f.hl || {};
      const P = id => this.cur.get(id);
      const hot = s => s === 'cur' || s === 'path' || s === 'found' || s === 'new' || s === 'cand' || s === 'visited';
      // alt ağaç vurgusu
      if (f.sub && f.sub.length) {
        const ids = new Set(); f.sub.forEach(id => { const s = findSnap(f.root, id); if (s) subtreeIds(s, ids); });
        ctx.fillStyle = t.dark ? 'rgba(110,168,255,0.18)' : 'rgba(31,95,191,0.12)';
        ids.forEach(id => { const p = P(id); if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, r + 8, 0, 7); ctx.fill(); } });
      }
      // kenarlar + null bağlantıları
      const st = [f.root];
      ctx.lineCap = 'round';
      while (st.length) {
        const x = st.pop(), p = P(x.id);
        for (const [c, side] of [[x.l, -1], [x.r, 1]]) {
          if (c) {
            const q = P(c.id);
            const on = hot(hl[x.id]) && hot(hl[c.id]);
            ctx.strokeStyle = on ? t.amber : t['ink-2']; ctx.lineWidth = on ? 3.5 : 1.6; ctx.globalAlpha = on ? 1 : 0.7;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.globalAlpha = 1;
            st.push(c);
          } else if (this.o.nulls && r >= 8) {
            const nx = p.x + side * Math.max(10, Math.min(L.sp * 0.4, 26)), ny = p.y + Math.min(L.dy || 50, 50) * 0.55;
            ctx.strokeStyle = t.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
            ctx.fillStyle = t.muted; ctx.beginPath(); ctx.arc(nx, ny, 2.5, 0, 7); ctx.fill();
          }
        }
      }
      // düğümler
      const styles = {
        cur: [t.amber, t.amber, '#111'], path: [t.card, t.amber, t.ink], found: [t.green, t.green, '#fff'],
        new: [t.green, t.green, '#fff'], del: [t.red, t.red, '#fff'], succ: [t.purple, t.purple, '#fff'],
        cand: [t.card, t.purple, t.purple], visited: [t.blue, t.blue, '#fff'], out: [t.card, t.blue, t.blue]
      };
      const font = Math.max(9, Math.round(r * 0.95));
      L.pos.forEach((v, id) => {
        const p = P(id); if (!p) return;
        const s = hl[id];
        const [fill, stroke, ink] = styles[s] || [t.card, t['ink-2'], t.ink];
        if (s === 'dim') ctx.globalAlpha = 0.3;
        if (s === 'new' || s === 'found' || s === 'cur') { ctx.fillStyle = stroke; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(p.x, p.y, r + 7, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = s && s !== 'dim' ? 3 : 2;
        if (s === 'cand') ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
        if (r >= 8) {
          const len = String(v.key).length, fs = Math.min(font, Math.floor((2 * r - 3) / (len * 0.62)));
          ctx.fillStyle = ink; ctx.font = `700 ${fs}px "JetBrains Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(v.key), p.x, p.y + 1);
        }
        if (this.o.sizes && r >= 10) {
          ctx.fillStyle = t.muted; ctx.font = '600 11px "JetBrains Mono"'; ctx.textAlign = 'left';
          ctx.fillText(v.n, p.x + r + 2, p.y - r + 4);
        }
        ctx.globalAlpha = 1;
      });
    }
  }
  SL.TreeView = TreeView;

  /* ---------------- BST modeli + adım kaydı ---------------- */
  class BSTModel {
    constructor() { this.root = null; this.nid = 0; }
    mk(key) { return { id: ++this.nid, key, left: null, right: null, size: 1 }; }
    sz(x) { return x ? x.size : 0; }
    fix(x = this.root) { if (!x) return 0; x.size = 1 + this.fix(x.left) + this.fix(x.right); return x.size; }
    snap(x = this.root) { return x ? { id: x.id, key: x.key, n: x.size, l: this.snap(x.left), r: this.snap(x.right) } : null; }
    clear() { this.root = null; }
    insertSilent(key) {
      if (!this.root) { this.root = this.mk(key); return; }
      let x = this.root;
      for (;;) {
        const c = cmp(key, x.key);
        if (c === 0) return;
        const side = c < 0 ? 'left' : 'right';
        if (!x[side]) { x[side] = this.mk(key); break; }
        x = x[side];
      }
      this.fix();
    }
    recorder() {
      const R = { frames: [], stack: [], cmps: 0, stackTitle: 'Çağrı yığını (call stack)' };
      R.F = (hl, note, extra = {}) => R.frames.push(Object.assign({ root: this.snap(), hl: Object.assign({}, hl), note, stack: R.stack.slice(), stackTitle: R.stackTitle, cmps: R.cmps }, extra));
      return R;
    }
    static pathHl(path, cur, curStyle = 'cur') { const h = {}; path.forEach(id => (h[id] = 'path')); if (cur != null) h[cur] = curStyle; return h; }

    opPut(key, o = {}) {
      const R = this.recorder(), path = [];
      R.F({}, `put(${key}): kökten başla`);
      const go = (x, parent, dir) => {
        R.stack.push(`put(${x ? x.key : 'null'}, ${key})`);
        if (!x) {
          const nx = this.mk(key);
          if (!parent) this.root = nx; else parent[dir] = nx;
          this.fix();
          R.F(Object.assign(BSTModel.pathHl(path), { [nx.id]: 'new' }), `null bağlantıya ulaştık → yeni düğüm ${key} oluştur ve döndür`);
          R.stack.pop(); return nx;
        }
        R.cmps++; path.push(x.id);
        const c = cmp(key, x.key);
        if (c === 0) { R.F(Object.assign(BSTModel.pathHl(path), { [x.id]: 'found' }), `${key} = ${x.key} → anahtar zaten var: değerini güncelle`); R.stack.pop(); return x; }
        R.F(BSTModel.pathHl(path, x.id), `${key} ${c < 0 ? '<' : '>'} ${x.key} → ${c < 0 ? 'SOLA' : 'SAĞA'} git`);
        if (c < 0) x.left = go(x.left, x, 'left'); else x.right = go(x.right, x, 'right');
        x.size = 1 + this.sz(x.left) + this.sz(x.right);
        if (o.unwind) R.F(BSTModel.pathHl(path, x.id), `dönüş: put(${x.key}) bağlantısını yeniden kurar, size = ${x.size}`);
        R.stack.pop(); path.pop();
        return x;
      };
      this.root = go(this.root, null, null);
      return R.frames;
    }
    opGet(key) {
      const R = this.recorder(), path = [];
      R.F({}, `get(${key}): kökten başla`);
      let found = null;
      const go = x => {
        R.stack.push(`get(${x ? x.key : 'null'}, ${key})`);
        if (!x) { R.F(BSTModel.pathHl(path), `null → ${key} ağaçta YOK (bulunamadı / search miss)`); R.stack.pop(); return; }
        R.cmps++; path.push(x.id);
        const c = cmp(key, x.key);
        if (c === 0) { found = x; R.F(Object.assign(BSTModel.pathHl(path), { [x.id]: 'found' }), `${key} = ${x.key} → BULUNDU (search hit)`); R.stack.pop(); return; }
        R.F(BSTModel.pathHl(path, x.id), `${key} ${c < 0 ? '<' : '>'} ${x.key} → ${c < 0 ? 'SOL' : 'SAĞ'} alt ağaçta ara`);
        go(c < 0 ? x.left : x.right); R.stack.pop();
      };
      go(this.root);
      R.F(found ? Object.assign(BSTModel.pathHl(path), { [found.id]: 'found' }) : BSTModel.pathHl(path),
        found ? `Sonuç: ${key} bulundu — ${R.cmps} karşılaştırma` : `Sonuç: ${key} yok — ${R.cmps} karşılaştırma`);
      return R.frames;
    }
    opMinMax(isMin) {
      const R = this.recorder(), path = [];
      let x = this.root;
      if (!x) { R.F({}, 'Ağaç boş'); return R.frames; }
      while (x) {
        path.push(x.id);
        const nxt = isMin ? x.left : x.right;
        if (!nxt) { R.F(Object.assign(BSTModel.pathHl(path), { [x.id]: 'found' }), `${isMin ? 'Sol' : 'Sağ'} bağlantı null → ${isMin ? 'min' : 'max'} = ${x.key}`); break; }
        R.F(BSTModel.pathHl(path, x.id), `${x.key}: ${isMin ? 'solda daha küçük var → sola' : 'sağda daha büyük var → sağa'}`);
        x = nxt;
      }
      return R.frames;
    }
    opFloorCeil(key, isFloor) {
      const R = this.recorder(), path = [], cands = [];
      const name = isFloor ? 'floor' : 'ceiling';
      R.F({}, `${name}(${key}): ${isFloor ? '≤' : '≥'} ${key} olan ${isFloor ? 'EN BÜYÜK' : 'EN KÜÇÜK'} anahtar`);
      const hl = cur => { const h = BSTModel.pathHl(path, cur); cands.forEach(id => (h[id] = 'cand')); if (cur != null) h[cur] = 'cur'; return h; };
      const go = x => {
        R.stack.push(`${name}(${x ? x.key : 'null'}, ${key})`);
        if (!x) { R.F(hl(), 'null → bu yolda aday yok, geri dön'); R.stack.pop(); return null; }
        R.cmps++; path.push(x.id);
        const c = cmp(key, x.key);
        if (c === 0) { R.F(Object.assign(hl(), { [x.id]: 'found' }), `${key} = ${x.key} → ${name} = ${x.key}`); R.stack.pop(); return x; }
        const away = isFloor ? c < 0 : c > 0;   // aday olamaz, yalnızca bir tarafa bak
        if (away) {
          R.F(hl(x.id), `${key} ${c < 0 ? '<' : '>'} ${x.key} → ${x.key} aday olamaz; ${name} ${isFloor ? 'SOL' : 'SAĞ'} alt ağaçta`);
          const t = go(isFloor ? x.left : x.right); R.stack.pop(); return t;
        }
        cands.push(x.id);
        R.F(hl(x.id), `${key} ${c < 0 ? '<' : '>'} ${x.key} → ${x.key} bir ADAY; ${isFloor ? 'sağda' : 'solda'} daha iyi aday var mı?`);
        const t = go(isFloor ? x.right : x.left);
        R.stack.pop();
        if (t) return t;
        R.F(Object.assign(hl(), { [x.id]: 'found' }), `${isFloor ? 'sağda' : 'solda'} aday çıkmadı → ${name} = ${x.key}`);
        return x;
      };
      const res = go(this.root);
      R.F(res ? Object.assign(BSTModel.pathHl(path), { [res.id]: 'found' }) : BSTModel.pathHl(path),
        res ? `Sonuç: ${name}(${key}) = ${res.key}` : `Sonuç: ${name}(${key}) yok (ağaçta ${isFloor ? '≤' : '≥'} ${key} anahtar yok)`);
      return R.frames;
    }
    opRank(key) {
      const R = this.recorder(), path = [], counted = [], sub = [];
      let x = this.root, total = 0;
      R.F({}, `rank(${key}): ağaçta ${key} anahtarından KÜÇÜK kaç anahtar var?`);
      const hl = cur => { const h = BSTModel.pathHl(path, cur); counted.forEach(id => (h[id] = 'out')); if (cur != null) h[cur] = 'cur'; return h; };
      while (x) {
        R.cmps++; path.push(x.id);
        const c = cmp(key, x.key), ls = this.sz(x.left);
        if (c < 0) { R.F(hl(x.id), `${key} < ${x.key} → ${x.key} ve sağı daha büyük; sola git (sayma yok)`, { sub: sub.slice() }); x = x.left; }
        else if (c > 0) {
          total += 1 + ls; counted.push(x.id); if (x.left) sub.push(x.left.id);
          R.F(hl(x.id), `${key} > ${x.key} → ${x.key} ve sol alt ağacındaki ${ls} anahtar küçük: +${1 + ls} → toplam ${total}`, { sub: sub.slice() });
          x = x.right;
        } else {
          total += ls; if (x.left) sub.push(x.left.id);
          R.F(Object.assign(hl(), { [x.id]: 'found' }), `${key} = ${x.key} → sol alt ağacı (${ls} anahtar) ekle → rank = ${total}`, { sub: sub.slice() });
          break;
        }
      }
      R.F(hl(), `Sonuç: rank(${key}) = ${total}  (sıralı listede ${total}. indekste / ${total + 1}. sırada)`, { sub: sub.slice() });
      return R.frames;
    }
    opSelect(k) {
      const R = this.recorder(), path = [];
      let x = this.root, kk = k;
      R.F({}, `select(${k}): sıralı listede ${k}. indeksteki (0'dan sayarak) anahtar`);
      if (k < 0 || k >= this.sz(this.root)) { R.F({}, `k = ${k} geçersiz (0…${this.sz(this.root) - 1})`); return R.frames; }
      while (x) {
        R.cmps++; path.push(x.id);
        const t = this.sz(x.left);
        if (t > kk) { R.F(BSTModel.pathHl(path, x.id), `sol alt ağaçta ${t} anahtar > ${kk} → aranan SOLDA`, { sub: x.left ? [x.left.id] : [] }); x = x.left; }
        else if (t < kk) { R.F(BSTModel.pathHl(path, x.id), `sol alt ağaçta ${t} anahtar < ${kk} → SAĞA git, k = ${kk} − ${t} − 1 = ${kk - t - 1}`, { sub: x.left ? [x.left.id] : [] }); kk = kk - t - 1; x = x.right; }
        else { R.F(Object.assign(BSTModel.pathHl(path), { [x.id]: 'found' }), `sol alt ağaçta tam ${t} anahtar → select(${k}) = ${x.key}`, { sub: x.left ? [x.left.id] : [] }); break; }
      }
      return R.frames;
    }
    opRange(lo, hi) {
      const R = this.recorder(), seen = [], got = [], out = [];
      R.stackTitle = 'Çağrı yığını (call stack)';
      R.F({}, `keys(${lo}, ${hi}): [${lo}, ${hi}] aralığındaki anahtarlar, sıralı`, { out: [] });
      const hl = cur => { const h = {}; seen.forEach(id => (h[id] = 'path')); got.forEach(id => (h[id] = 'found')); if (cur != null) h[cur] = 'cur'; return h; };
      const go = x => {
        if (!x) return;
        R.stack.push(`keys(${x.key})`);
        seen.push(x.id); R.cmps++;
        const c1 = cmp(lo, x.key), c2 = cmp(hi, x.key);
        R.F(hl(x.id), `${x.key}: ` + (c1 < 0 ? `${lo} < ${x.key} → solda da aralıkta anahtar olabilir` : `${lo} ≥ ${x.key} → SOL alt ağacı atla ✂`), { out: out.slice() });
        if (c1 < 0) go(x.left);
        if (c1 <= 0 && c2 >= 0) { out.push(x.key); got.push(x.id); R.F(hl(x.id), `${lo} ≤ ${x.key} ≤ ${hi} → ${x.key} çıktıya eklendi`, { out: out.slice() }); }
        if (c2 > 0) go(x.right); else R.F(hl(x.id), `${hi} ≤ ${x.key} → SAĞ alt ağacı atla ✂`, { out: out.slice() });
        R.stack.pop();
      };
      go(this.root);
      R.F(hl(), `Sonuç: ${out.join(' ') || '(boş)'} — ${seen.length} düğüme bakıldı, ağaçta ${this.sz(this.root)} düğüm var`, { out: out.slice() });
      return R.frames;
    }
    opDelMin() {
      const R = this.recorder(), path = [];
      if (!this.root) { R.F({}, 'Ağaç boş'); return R.frames; }
      let parent = null, x = this.root;
      while (x.left) { path.push(x.id); R.F(BSTModel.pathHl(path, x.id), `${x.key}: solu dolu → sola`); parent = x; x = x.left; }
      path.push(x.id);
      R.F(Object.assign(BSTModel.pathHl(path), { [x.id]: 'del' }), `${x.key}: solu null → en küçük bu. Yerine SAĞ çocuğu (${x.right ? x.right.key : 'null'}) geçecek`);
      if (!parent) this.root = x.right; else parent.left = x.right;
      this.fix();
      R.F(x.right ? { [x.right.id]: 'found' } : {}, `deleteMin tamam: ${x.key} silindi`);
      return R.frames;
    }
    opDelete(key) {
      const R = this.recorder(), path = [];
      R.F({}, `delete(${key}): önce düğümü bul`);
      let parent = null, dir = null, x = this.root;
      while (x) {
        R.cmps++; path.push(x.id);
        const c = cmp(key, x.key);
        if (c === 0) break;
        R.F(BSTModel.pathHl(path, x.id), `${key} ${c < 0 ? '<' : '>'} ${x.key} → ${c < 0 ? 'sola' : 'sağa'}`);
        parent = x; dir = c < 0 ? 'left' : 'right'; x = x[dir];
      }
      if (!x) { R.F(BSTModel.pathHl(path), `${key} ağaçta yok — silinecek bir şey yok`); return R.frames; }
      const link = child => { if (!parent) this.root = child; else parent[dir] = child; };
      if (!x.left || !x.right) {
        const child = x.left || x.right;
        R.F(Object.assign(BSTModel.pathHl(path), { [x.id]: 'del' }), !child
          ? `Durum 1: ${key} bir YAPRAK (çocuğu yok) → ebeveynin bağlantısını null yap`
          : `Durum 2: ${key} düğümünün TEK çocuğu var (${child.key}) → çocuğu ebeveyne bağla`);
        link(child); this.fix();
        R.F(child ? { [child.id]: 'found' } : {}, `${key} silindi ✔`);
        return R.frames;
      }
      R.F(Object.assign(BSTModel.pathHl(path), { [x.id]: 'del' }), `Durum 3: ${key} düğümünün İKİ çocuğu var → yerine ARDIL (successor) geçecek: sağ alt ağacın en küçüğü`);
      let sp = x, s = x.right;
      const sp2 = [s.id];
      R.F(Object.assign({ [x.id]: 'del' }, BSTModel.pathHl(sp2, s.id)), `sağ alt ağaca geç: ${s.key}`);
      while (s.left) { sp = s; s = s.left; sp2.push(s.id); R.F(Object.assign({ [x.id]: 'del' }, BSTModel.pathHl(sp2, s.id)), `solu dolu → sola: ${s.key}`); }
      R.F({ [x.id]: 'del', [s.id]: 'succ' }, `ardıl = ${s.key} (solu null). ${s.key} düğümünün yerini sağ çocuğu (${s.right ? s.right.key : 'null'}) alacak`);
      if (sp === x) x.right = s.right; else sp.left = s.right;
      s.left = x.left; s.right = x.right; link(s); this.fix();
      R.F({ [s.id]: 'succ' }, `${s.key}, silinen ${key} düğümünün yerine geçti (Hibbard silmesi) ✔`);
      return R.frames;
    }
  }
  SL.BSTModel = BSTModel;

  /* ---------------- gezinme (traversal) kareleri ---------------- */
  SL.travFrames = function (root, kind) {
    const frames = [], out = [], vis = new Set(), stack = [];
    const names = { pre: 'preorder', in: 'inorder', post: 'postorder', level: 'levelorder' };
    const hl = cur => { const h = {}; vis.forEach(id => (h[id] = 'visited')); if (cur != null && !vis.has(cur)) h[cur] = 'cur'; return h; };
    const F = (cur, note, extra = {}) => frames.push(Object.assign({ root, hl: hl(cur), note, stack: stack.slice(), out: out.slice(), stackTitle: 'Çağrı yığını (stack)' }, extra));
    const visit = (x, why) => { vis.add(x.id); out.push(x.key); F(x.id, `ZİYARET: ${x.key} ${why}`); };
    if (!root) return [{ root, hl: {}, note: 'Ağaç boş', stack: [], out: [] }];
    if (kind === 'level') {
      const q = [root];
      const qF = (cur, note) => frames.push({ root, hl: hl(cur), note, stack: q.map(n => n.key), out: out.slice(), stackTitle: 'Kuyruk (queue) — ön → arka', queue: true });
      qF(null, 'Kökü kuyruğa ekle (enqueue)');
      while (q.length) {
        const x = q.shift();
        vis.add(x.id); out.push(x.key);
        qF(x.id, `Kuyruğun önünden çıkar (dequeue): ${x.key} → ziyaret et`);
        const kids = [x.l, x.r].filter(Boolean);
        if (kids.length) { kids.forEach(k => q.push(k)); qF(x.id, `${x.key} düğümünün çocuklarını kuyruğun sonuna ekle: ${kids.map(k => k.key).join(', ')}`); }
      }
      qF(null, `Bitti! Seviye seviye: ${out.join(' ')}`);
      return frames;
    }
    F(null, `${names[kind]}(kök) çağrılıyor`);
    const go = x => {
      if (!x) return;
      stack.push(`${names[kind]}(${x.key})`);
      F(x.id, `${names[kind]}(${x.key}) çağrıldı`);
      if (kind === 'pre') visit(x, '(önce kök)');
      go(x.l);
      if (kind === 'in') visit(x, '(sol bitti, şimdi kök)');
      go(x.r);
      if (kind === 'post') visit(x, '(iki çocuk da bitti, en son kök)');
      stack.pop();
    };
    go(root);
    F(null, `Bitti! ${names[kind]}: ${out.join(' ')}`);
    return frames;
  };

  /* ---------------- ortak paneller ---------------- */
  function sidePanel() {
    const box = el('div', { class: 'stack-panel' });
    box.renderFrame = f => {
      const items = (f.stack || []);
      const isQ = f.queue;
      box.innerHTML = `<div class="sp-title">${f.stackTitle || 'Çağrı yığını (call stack)'}</div>` +
        (items.length
          ? (isQ ? `<div class="sp-queue">${items.map(s => `<span>${s}</span>`).join('')}</div>`
                 : items.slice().reverse().map((s, k) => `<div class="sp-item${k === 0 ? ' top' : ''}">${s}</div>`).join(''))
          : '<div class="sp-empty">(boş)</div>') +
        (isQ ? '' : '<div class="sp-floor">yığının tabanı</div>');
    };
    return box;
  }
  SL.sidePanel = sidePanel;

  function parseKey(s, type) {
    s = String(s).trim();
    if (!s) return null;
    if (type === 'num') { const v = parseInt(s, 10); return isNaN(v) ? null : v; }
    return s.toUpperCase();
  }

  /* ---------------- .bstviz — BST oyun alanı ---------------- */
  const OPS = {
    put: ['➕ Ekle', 'put'], get: ['🔍 Ara', 'get'], del: ['🗑 Sil', 'delete'], delmin: ['deleteMin', ''],
    min: ['min', ''], max: ['max', ''], floor: ['floor ≤', ''], ceil: ['ceiling ≥', ''], rank: ['rank', ''], select: ['select(k)', ''],
    range: ['aralık [lo hi]', 'keys'], seq: ['▶ Sırayla ekle', ''], rand: ['🎲 Rastgele ağaç', ''], sorted: ['📈 Sıralı ekle', ''], clear: ['🧹 Temizle', ''], reset: ['↺ Başlangıç', '']
  };
  SL.BSTViz = function (root) {
    const d = root.dataset, type = d.type || 'str';
    const model = new BSTModel();
    const init = SL.parseValues(d.keys || '') || [];
    const load0 = () => { model.clear(); model.nid = 0; init.forEach(k => model.insertSilent(type === 'num' ? +k : String(k).toUpperCase())); };
    load0();
    const withStack = 'stack' in d;
    const W = +(d.w || (withStack ? 900 : 1180)), H = +(d.h || 360);
    const canvas = el('canvas');
    const tv = new TreeView(canvas, W, H, { nulls: 'nulls' in d, sizes: 'sizes' in d });
    const note = el('div', { class: 'sv-note tree-note' });
    const info = el('div', { class: 'sv-counters' });
    const outBox = el('div', { class: 'tree-out' });
    const panel = withStack ? sidePanel() : null;
    const fp = new SL.FramePlayer(f => {
      tv.show(f); note.textContent = f.note || ' ';
      const s = SL.treeStats(f.root);
      info.innerHTML = `<span class="cnt">N = <b>${s.n}</b></span><span class="cnt">yükseklik <i>height</i> = <b>${s.h < 0 ? '—' : s.h}</b></span>` +
        `<span class="cnt">ort. derinlik = <b>${s.avg.toFixed(2)}</b></span><span class="cnt cmp"><b>${f.cmps || 0}</b> karşılaştırma</span>`;
      outBox.innerHTML = f.out ? `Çıktı: <b>${f.out.join(' ') || '…'}</b>` : '';
      panel && panel.renderFrame(f);
    }, { speed: +(d.speed || 1.5) });
    const show = frames => { fp.load(frames); if (frames.length > 1) fp.play(); };
    const idle = () => fp.load([{ root: model.snap(), hl: {}, note: d.hint || 'Bir anahtar yazıp bir işlem seçin.', stack: [], cmps: 0 }]);
    const input = el('input', { type: 'text', class: 'key-in', value: d.default || '', placeholder: type === 'num' ? 'sayı' : 'harf', size: 6 });
    const need = () => { const k = parseKey(input.value.split(/\s+/)[0], type); if (k == null) { note.textContent = '⚠️ Önce kutuya bir anahtar yazın.'; input.focus(); } return k; };
    const run = op => {
      let k;
      switch (op) {
        case 'put': if ((k = need()) != null) show(model.opPut(k, { unwind: withStack })); break;
        case 'get': if ((k = need()) != null) show(model.opGet(k)); break;
        case 'del': if ((k = need()) != null) show(model.opDelete(k)); break;
        case 'delmin': show(model.opDelMin()); break;
        case 'min': show(model.opMinMax(true)); break;
        case 'max': show(model.opMinMax(false)); break;
        case 'floor': if ((k = need()) != null) show(model.opFloorCeil(k, true)); break;
        case 'ceil': if ((k = need()) != null) show(model.opFloorCeil(k, false)); break;
        case 'rank': if ((k = need()) != null) show(model.opRank(k)); break;
        case 'select': { const v = parseInt(input.value, 10); if (isNaN(v)) { note.textContent = '⚠️ select için bir sayı (k) yazın, ör. 3'; break; } show(model.opSelect(v)); break; }
        case 'range': {
          const [a, b] = input.value.trim().split(/[\s,–-]+/).map(s => parseKey(s, type));
          if (a == null || b == null) { note.textContent = '⚠️ İki anahtar yazın, ör. ' + (type === 'num' ? '1400 1600' : 'E P'); break; }
          show(model.opRange(a, b)); break;
        }
        case 'seq': {
          model.clear(); model.nid = 0;
          const seq = (SL.parseValues(d.seq || 'S E A R C H E X A M P L E') || []).map(k => (type === 'num' ? +k : String(k).toUpperCase()));
          let frames = [{ root: null, hl: {}, note: 'Boş ağaç. Anahtarlar sırayla eklenecek: ' + seq.join(' '), stack: [], cmps: 0 }];
          seq.forEach(k => { frames = frames.concat(model.opPut(k, { unwind: false }).slice(1)); });
          show(frames); break;
        }
        case 'rand': {
          model.clear(); model.nid = 0;
          const n = +(d.randn || 15);
          const pool = type === 'num' ? Array.from({ length: 99 }, (_, i) => i + 1) : 'ABCDEFGHIJKLMNOPRSTUVYZ'.split('');
          SL.shuffle(pool).slice(0, n).forEach(k => model.insertSilent(k)); idle(); break;
        }
        case 'sorted': {
          model.clear(); model.nid = 0;
          const keys = type === 'num' ? Array.from({ length: 10 }, (_, i) => (i + 1) * 10) : 'ABCDEFGHIJ'.split('');
          let frames = [{ root: null, hl: {}, note: 'Sıralı ekleme: ' + keys.join(' '), stack: [], cmps: 0 }];
          keys.forEach(k => { frames = frames.concat(model.opPut(k).slice(-1)); });
          show(frames); break;
        }
        case 'clear': model.clear(); idle(); break;
        case 'reset': load0(); idle(); break;
      }
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run((d.ops || 'put').split(',')[0]); } });
    const ctls = el('div', { class: 'sv-controls' });
    const ops = (d.ops || 'put,get,del,reset').split(',');
    if (ops.some(o => OPS[o] && !['seq', 'rand', 'sorted', 'clear', 'reset', 'min', 'max', 'delmin'].includes(o))) ctls.append(el('label', { class: 'ctl' }, 'Anahtar ', input));
    ops.forEach(o => { if (!OPS[o]) return; const [lab, en] = OPS[o]; ctls.append(btn(lab, () => run(o), o === ops[0] ? 'primary' : '', en)); });
    const main = el('div', { class: 'bst-main' }, canvas);
    if (panel) main.append(panel);
    root.setAttribute('data-prevent-swipe', '');
    root.append(ctls, main, SL.transport(fp, { min: 0.3, max: 8 }), note, outBox, info);
    idle();
    return { stop: () => fp.pause() };
  };

  /* ---------------- .travviz — gezinme animasyonu ---------------- */
  SL.TravViz = function (root) {
    const d = root.dataset;
    const trees = { bal: 'H D L B F J N A C E G I K M O', sea: 'S E A R C H X M P L', small: 'D B F A C E G' };
    let tkey = d.tree || 'bal', kind = d.kind || 'pre';
    const model = new BSTModel();
    const canvas = el('canvas');
    const tv = new TreeView(canvas, 860, +(d.h || 330), {});
    const panel = sidePanel();
    const note = el('div', { class: 'sv-note tree-note' });
    const outBox = el('div', { class: 'tree-out' });
    const fp = new SL.FramePlayer(f => { tv.show(f, false); note.textContent = f.note; outBox.innerHTML = `Çıktı: <b>${(f.out || []).join(' ') || '…'}</b>`; panel.renderFrame(f); }, { speed: 1.5 });
    const build = () => { model.clear(); SL.parseValues(trees[tkey]).forEach(k => model.insertSilent(k)); fp.load(SL.travFrames(model.snap(), kind)); };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, 'Gezinme ', select({ pre: 'preorder (kök–sol–sağ)', in: 'inorder (sol–kök–sağ)', post: 'postorder (sol–sağ–kök)', level: 'level-order (seviye seviye)' }, kind, v => { kind = v; build(); })),
      el('label', { class: 'ctl' }, 'Ağaç ', select({ bal: 'dengeli (15)', sea: 'S E A R C H X M P L', small: 'küçük (7)' }, tkey, v => { tkey = v; build(); }))),
    el('div', { class: 'bst-main' }, canvas, panel), SL.transport(fp, { min: 0.3, max: 8 }), note, outBox);
    build();
    return { stop: () => fp.pause() };
  };

  /* ---------------- .treelab — ağaç kod laboratuvarı ---------------- */
  const PY_TREE = `
import json
_visits = []
_nid = [0]
class Node:
    def __init__(self, key):
        _nid[0] += 1
        self._id = _nid[0]
        self._key = key
        self.left = None
        self.right = None
    @property
    def key(self):
        _visits.append(self._id)
        return self._key
    @key.setter
    def key(self, v):
        self._key = v
    def __repr__(self):
        return f"Node({self._key!r})"

def _flat(root):
    if root is None:
        return []
    out, st, seen = [], [root], set()
    while st:
        x = st.pop()
        if not isinstance(x, Node):
            raise TypeError("left/right bir Node ya da None olmalı, ama " + type(x).__name__ + " bulundu")
        if id(x) in seen:
            raise RuntimeError("Döngü (cycle) oluştu: bir düğüm iki kez bağlanmış!")
        seen.add(id(x))
        l, r = x.left, x.right
        out.append([x._id, x._key, l._id if isinstance(l, Node) else None, r._id if isinstance(r, Node) else None])
        if l is not None: st.append(l)
        if r is not None: st.append(r)
    return out

def _rid(r):
    return r._id if isinstance(r, Node) else None

def _run_put(keys, keep):
    frames, err, root = [], None, None
    try:
        for i, k in enumerate(keys):
            _visits.clear()
            before = _nid[0]
            root = put(root, k)
            if keep or i == len(keys) - 1:
                frames.append({'visits': list(_visits), 'nodes': _flat(root), 'root': _rid(root), 'key': k, 'new': _nid[0] if _nid[0] > before else None})
    except BaseException as e:
        err = type(e).__name__ + ": " + str(e)
        try:
            frames.append({'visits': list(_visits), 'nodes': _flat(root), 'root': _rid(root), 'key': None, 'new': None})
        except BaseException:
            pass
    return json.dumps({'frames': frames, 'error': err})

def _build(keys):
    root = None
    for k in keys:
        if root is None:
            root = Node(k); continue
        x = root
        while True:
            if k < x._key:
                if x.left is None: x.left = Node(k); break
                x = x.left
            elif k > x._key:
                if x.right is None: x.right = Node(k); break
                x = x.right
            else:
                break
    return root

def _run_trav(keys):
    root = _build(keys)
    out, err = [], None
    def visit(k):
        if isinstance(k, Node): k = k._key
        out.append(k)
    try:
        inorder(root, visit)
    except BaseException as e:
        err = type(e).__name__ + ": " + str(e)
    return json.dumps({'nodes': _flat(root), 'root': _rid(root), 'out': out, 'error': err})
`;
  function fromFlat(nodes, rootId) {
    if (rootId == null) return null;
    const m = new Map(nodes.map(([id, key]) => [id, { id, key, n: 1, l: null, r: null }]));
    nodes.forEach(([id, , l, r]) => { const x = m.get(id); x.l = l != null ? m.get(l) : null; x.r = r != null ? m.get(r) : null; });
    return m.get(rootId) || null;
  }
  function snapJS(rootNode) {
    if (rootNode == null) return null;
    if (typeof rootNode !== 'object') throw new Error('put bir düğüm (Node) döndürmeli, ama ' + typeof rootNode + ' döndürdü');
    const seen = new Set();
    const mk = x => ({ id: x._id, key: x._key, n: 1, l: null, r: null });
    const top = mk(rootNode); seen.add(rootNode);
    const st = [[rootNode, top]]; let count = 0;
    while (st.length) {
      const [x, s] = st.pop();
      if (++count > 5000) throw new Error('Çok fazla düğüm (5000+)');
      for (const [f, g] of [['left', 'l'], ['right', 'r']]) {
        const c = x[f];
        if (c == null) continue;
        if (typeof c !== 'object' || !('_id' in c)) throw new Error(`node.${f} bir Node değil (${typeof c})`);
        if (seen.has(c)) throw new Error('Döngü (cycle) oluştu: bir düğüm iki kez bağlanmış!');
        seen.add(c); const cs = mk(c); s[g] = cs; st.push([c, cs]);
      }
    }
    return top;
  }
  function parseKeys(str) {
    const m = str.trim().match(/^(-?\d+)\s*\.\.\s*(-?\d+)$/);
    if (m) { const a = +m[1], b = +m[2]; const out = []; for (let i = a; a <= b ? i <= b : i >= b; i += a <= b ? 1 : -1) out.push(i); return out; }
    const v = SL.parseValues(str) || [];
    const allNum = v.every(x => typeof x === 'number');
    return allNum ? v : v.map(x => String(x).toUpperCase());
  }
  function orders(root) {
    const pre = [], ino = [], post = [], lvl = [];
    const go = x => { if (!x) return; pre.push(x.key); go(x.l); ino.push(x.key); go(x.r); post.push(x.key); };
    go(root);
    const q = root ? [root] : []; while (q.length) { const x = q.shift(); lvl.push(x.key); if (x.l) q.push(x.l); if (x.r) q.push(x.r); }
    return { pre, in: ino, post, level: lvl };
  }

  SL.TreeLab = function (root) {
    const d = root.dataset, task = d.task || 'put';
    const shell = SL.labShell(root);
    const presets = { sea: 'S E A R C H E X A M P L E', sorted: 'A B C D E F G H I J', bal: 'H D L B F J N A C E G I K M O', nums: '50 30 70 20 40 60 80', deep: '1..1200' };
    const keysIn = el('input', { type: 'text', class: 'keys-in', value: d.keys || presets.sea });
    const pre = select({ '': 'hazır…', sea: 'S E A R C H E X A M P L E', sorted: 'sıralı A…J', bal: 'dengeli 15', nums: 'sayılar', deep: '1..1200 (çok derin!)' }, '', v => { if (v) { keysIn.value = presets[v]; shell.run(); } });
    const canvas = el('canvas');
    const tv = new TreeView(canvas, +(d.cw || 540), +(d.ch || 270), { maxSp: 46 });
    const note = el('div', { class: 'sv-note tree-note' });
    const outBox = el('div', { class: 'tree-out' });
    const fp = new SL.FramePlayer(f => { tv.show(f); note.textContent = f.note || ' '; outBox.innerHTML = f.out ? `Çıktı: <b>${f.out.join(' ')}</b>` : ''; }, { speed: 2 });
    keysIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); shell.run(); } });
    shell.right.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Anahtarlar ', keysIn), pre), canvas,
      SL.transport(fp, { min: 0.3, max: 12 }), note, outBox, shell.msg, shell.out);

    const verdictPut = (frames, keys, error) => {
      const last = frames[frames.length - 1];
      if (error) return shell.setMsg('err', '⚠️ Hata: ' + error);
      if (keys.length && last && !last.root) return shell.setMsg('err', '❌ Ağaç boş kaldı! <code>put</code> bir şey döndürmüyor olabilir — <code>return node</code> satırını unuttun mu?');
      const st = SL.treeStats(last.root), ino = SL.inorderKeys(last.root);
      const distinct = new Set(keys).size;
      const asc = ino.every((k, i) => i === 0 || ino[i - 1] < k), desc = ino.every((k, i) => i === 0 || ino[i - 1] > k);
      if (st.n < distinct) return shell.setMsg('err', `❌ ${distinct} farklı anahtar eklendi ama ağaçta ${st.n} düğüm var — bazı düğümler kayboldu! (bağlantı yeniden kurulmuyor mu?)`);
      if (st.n > distinct) return shell.setMsg('err', `❌ Ağaçta ${st.n} düğüm var ama ${distinct} farklı anahtar eklendi — aynı anahtar iki kez eklenmiş.`);
      if (asc) return shell.setMsg('ok', `✅ Geçerli BST: ${st.n} düğüm, yükseklik ${st.h}, ortalama derinlik ${st.avg.toFixed(2)}`);
      if (desc) return shell.setMsg('err', `🙃 Ayna BST: büyükler solda, küçükler sağda! Tutarlı ama bizim tanımımıza göre ters.`);
      return shell.setMsg('err', `❌ BST özelliği bozuk — inorder sırası: ${ino.slice(0, 20).join(' ')}${ino.length > 20 ? ' …' : ''}`);
    };
    const verdictTrav = (rootSnap, out, error) => {
      if (error) return shell.setMsg('err', '⚠️ Hata: ' + error);
      const o = orders(rootSnap), s = out.join(' ');
      const names = { in: 'inorder', pre: 'preorder (kök–sol–sağ)', post: 'postorder (sol–sağ–kök)', level: 'level-order (seviye seviye)' };
      for (const k of ['in', 'pre', 'post', 'level']) if (o[k].join(' ') === s) return shell.setMsg(k === 'in' ? 'ok' : '', `Bu bir <b>${names[k]}</b> gezinmesi.` + (k === 'in' ? ' Anahtarlar SIRALI çıktı ✅' : ''));
      if (out.length < o.in.length) return shell.setMsg('err', `❌ ${o.in.length} düğümden sadece ${out.length} tanesi ziyaret edildi.`);
      shell.setMsg('err', '❓ Bilinen bir gezinme sırasına benzemiyor.');
    };
    const travFramesFrom = (rootSnap, out) => {
      const byKey = new Map(); const st = rootSnap ? [rootSnap] : [];
      while (st.length) { const x = st.pop(); byKey.set(x.key, x.id); if (x.l) st.push(x.l); if (x.r) st.push(x.r); }
      const frames = [{ root: rootSnap, hl: {}, note: 'Ağaç hazır. Ziyaret sırası adım adım:', out: [] }];
      const vis = {};
      out.forEach((k, i) => { const id = byKey.get(k); if (id != null) vis[id] = 'visited'; const hl = Object.assign({}, vis); if (id != null) hl[id] = 'cur'; frames.push({ root: rootSnap, hl, note: `${i + 1}. ziyaret: ${k}`, out: out.slice(0, i + 1) }); });
      return frames;
    };

    shell.onRun = async () => {
      fp.pause(); shell.clearOut();
      const keys = parseKeys(keysIn.value);
      const keep = keys.length <= 80;
      const code = shell.cm.getValue();
      if (shell.lang === 'python') {
        shell.setMsg('', '…');
        let py;
        try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        py.setStdout({ batched: s => shell.print(s) });
        try { py.runPython(PY_TREE); py.runPython(code); }
        catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        py.globals.set('_keys', py.toPy(keys));
        let res;
        try { res = JSON.parse(py.runPython(task === 'put' ? `_run_put(_keys, ${keep ? 'True' : 'False'})` : '_run_trav(_keys)')); }
        catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
        const err = res.error ? SL.pyErrorText(res.error) : null;
        if (task === 'put') {
          const frames = res.frames.map(f => {
            const rs = fromFlat(f.nodes, f.root);
            const hl = {}; f.visits.forEach(id => (hl[id] = 'path')); if (f.new) hl[f.new] = 'new';
            return { root: rs, hl, note: f.key != null ? `put(${f.key}): ${f.visits.length} karşılaştırma` : 'hata anındaki ağaç' };
          });
          fp.load(frames.length ? frames : [{ root: null, hl: {}, note: '' }], 'end');
          verdictPut(frames, keys, err);
        } else {
          const rs = fromFlat(res.nodes, res.root);
          fp.load(travFramesFrom(rs, res.out), 'end'); verdictTrav(rs, res.out, err);
        }
        return;
      }
      // JavaScript
      let nid = 0, visits = [];
      class Node {
        constructor(key) { this._key = key; this.left = null; this.right = null; this._id = ++nid; }
        get key() { visits.push(this._id); return this._key; }
        set key(v) { this._key = v; }
      }
      const fname = task === 'put' ? 'put' : 'inorder';
      let fn;
      try {
        fn = new Function('Node', 'print', '__g', '"use strict";\n' + SL.guardLoops(code) +
          `\n;if (typeof ${fname} !== 'function') throw new Error("Kodda '${fname}' adında bir fonksiyon bulunamadı."); return ${fname};`)(Node, shell.print, SL.makeGuard());
      } catch (e) { shell.setMsg('err', '⚠️ ' + (e instanceof SyntaxError ? 'Sözdizimi hatası (syntax error): ' : 'Hata: ') + e.message); return; }
      if (task === 'put') {
        const frames = []; let rootNode = null, error = null;
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i]; visits = []; const before = nid;
          try { rootNode = fn(rootNode, k); } catch (e) { error = SL.jsErrorText(e); break; }
          if (rootNode === undefined) { error = "put(...) undefined döndürdü — 'return node;' satırını unuttun mu?"; rootNode = null; break; }
          if (keep || i === keys.length - 1) {
            let rs;
            try { rs = snapJS(rootNode); } catch (e) { error = e.message; break; }
            const hl = {}; visits.forEach(id => (hl[id] = 'path')); if (nid > before) hl[nid] = 'new';
            frames.push({ root: rs, hl, note: `put(${k}): ${new Set(visits).size} düğüme bakıldı` });
          }
        }
        if (error && !frames.length) frames.push({ root: null, hl: {}, note: '' });
        fp.load(frames, 'end');
        verdictPut(frames, keys, error);
      } else {
        // doğru bir BST kur, öğrencinin inorder fonksiyonunu çağır
        let rootNode = null;
        keys.forEach(k => {
          if (!rootNode) { rootNode = new Node(k); return; }
          let x = rootNode;
          for (;;) { if (k === x._key) break; const s = k < x._key ? 'left' : 'right'; if (!x[s]) { x[s] = new Node(k); break; } x = x[s]; }
        });
        const rs = snapJS(rootNode), out = [];
        let error = null;
        try { fn(rootNode, k => out.push(k && typeof k === 'object' ? k._key : k)); } catch (e) { error = SL.jsErrorText(e); }
        fp.load(travFramesFrom(rs, out), 'end');
        verdictTrav(rs, out, error);
      }
    };
    if (shell.lang !== 'python') shell.run();
    else { fp.load([{ root: null, hl: {}, note: 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).' }]); }
    return { stop: () => fp.pause(), refresh: shell.refresh };
  };

  SL.register('.bstviz', SL.BSTViz);
  SL.register('.travviz', SL.TravViz);
  SL.register('.treelab', SL.TreeLab);
})();
