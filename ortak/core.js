/* =====================================================================
   core.js — Tüm sunumlar için ortak çekirdek
   - Tema (açık/koyu), yardımcılar (el, select, slider, btn)
   - Adım adım oynatıcı (FramePlayer) + kontrol çubuğu (transport)
   - Quiz, sekmeler (tabs), kod büyüteci (zoom), satır numaraları
   - Canlı kod laboratuvarı iskeleti (labShell), Pyodide yükleyici
   - Bileşen kaydı ve Reveal başlatma: SL.register(), SL.boot()
   ===================================================================== */
(function () {
  'use strict';
  const SL = (window.SL = window.SL || {});

  /* ---------------- tema ---------------- */
  let themeCache = null;
  SL.css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  SL.theme = function () {
    if (themeCache) return themeCache;
    const names = ['bg', 'card', 'card-2', 'ink', 'ink-2', 'muted', 'rule', 'red', 'blue', 'green', 'amber',
      'purple', 'teal', 'pink', 'bar', 'bar-final', 'bar-sorted', 'bar-cmp', 'bar-swap', 'bar-min',
      's1', 's2', 's3', 's4'];
    themeCache = {};
    names.forEach(n => (themeCache[n] = SL.css('--' + n)));
    themeCache.dark = document.documentElement.dataset.theme === 'dark';
    return themeCache;
  };
  const redrawers = new Set();
  SL.onTheme = fn => redrawers.add(fn);
  SL.themeChanged = function () {
    themeCache = null;
    redrawers.forEach(fn => { try { fn(); } catch (e) { console.warn(e); } });
  };

  /* ---------------- küçük yardımcılar ---------------- */
  SL.setupCanvas = function (canvas, w, h) {
    const r = 2;
    canvas.width = w * r; canvas.height = h * r;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(r, 0, 0, r, 0, 0);
    return ctx;
  };
  SL.el = function (tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    kids.forEach(k => k != null && e.append(k));
    return e;
  };
  const el = SL.el;
  SL.fmt = n => n.toLocaleString('tr-TR');
  SL.shuffle = function (a, rng = Math.random) {
    for (let i = a.length - 1; i > 0; i--) { const r = Math.floor(rng() * (i + 1)); [a[i], a[r]] = [a[r], a[i]]; }
    return a;
  };
  SL.select = function (options, value, onchange) {
    const s = el('select');
    for (const k in options) s.append(el('option', { value: k }, options[k]));
    s.value = value; s.addEventListener('change', () => onchange(s.value));
    return s;
  };
  SL.slider = function (label, min, max, val, step, onInput, fmtFn) {
    const r = el('input', { type: 'range', min, max, step: step || 1, value: val });   // step, value’dan önce: yoksa değer eski adıma yuvarlanır
    const v = el('b', null, fmtFn ? fmtFn(val) : val);
    r.addEventListener('input', () => { v.textContent = fmtFn ? fmtFn(+r.value) : r.value; onInput(+r.value); });
    return el('label', { class: 'ctl' }, label, ' ', v, r);
  };
  SL.btn = (txt, fn, cls, title) => el('button', { class: 'btn ' + (cls || ''), onclick: fn, title: title || '' }, txt);
  SL.parseValues = function (str) {
    if (!str) return null;
    const parts = str.includes(',') ? str.split(',') : /\s/.test(str.trim()) ? str.trim().split(/\s+/) : [...str];
    return parts.map(s => s.trim()).filter(Boolean).map(s => (/^-?\d+(\.\d+)?$/.test(s) ? +s : s));
  };

  /* ---------------- adım adım oynatıcı ----------------
     Önceden hesaplanmış "kare" (frame) listesini oynatır.
     render(frame, player) her adımda çağrılır.                       */
  class FramePlayer {
    constructor(render, opts = {}) {
      this.renderFn = render; this.frames = []; this.idx = 0;
      this.speed = opts.speed || 2; this.playing = false; this.listeners = [];
    }
    load(frames, at) { this.pause(); this.frames = frames || []; this.idx = at === 'end' ? Math.max(0, this.frames.length - 1) : 0; this.render(); }
    get done() { return this.idx >= this.frames.length - 1; }
    get active() { return this.idx; }
    get frame() { return this.frames[this.idx]; }
    render() { if (this.frames.length) this.renderFn(this.frames[this.idx], this); this.emit(); }
    reset() { this.pause(); this.idx = 0; this.render(); }
    step() { if (this.idx < this.frames.length - 1) { this.idx++; this.render(); return true; } this.pause(); return false; }
    back() { this.pause(); if (this.idx > 0) { this.idx--; this.render(); } }
    toEnd() { this.pause(); this.idx = Math.max(0, this.frames.length - 1); this.render(); }
    play() {
      if (this.done) { this.idx = 0; this.render(); }
      if (this.playing) return;
      this.playing = true; this.emit();
      const tick = () => { if (!this.playing) return; if (this.step()) this.timer = setTimeout(tick, 1000 / this.speed); else { this.playing = false; this.emit(); } };
      this.timer = setTimeout(tick, 1000 / this.speed);
    }
    pause() { if (this.playing) { this.playing = false; clearTimeout(this.timer); this.emit(); } }
    toggle() { this.playing ? this.pause() : this.play(); }
    onChange(fn) { this.listeners.push(fn); }
    emit() { this.listeners.forEach(f => f(this)); }
  }
  SL.FramePlayer = FramePlayer;

  /* Kontrol çubuğu: ⏮ ◀ ▶ ▶| ⏭ + hız. p: reset/back/step/toEnd/toggle/playing/speed/onChange */
  SL.transport = function (p, o = {}) {
    const min = o.min || 1, max = o.max || 10000, unit = o.unit || 'adım/sn';
    const toVal = s => Math.round((100 * Math.log(s / min)) / Math.log(max / min));
    const toSpeed = v => { const s = min * Math.pow(max / min, v / 100); return s < 10 ? Math.round(s * 10) / 10 : Math.round(s); };
    const playBtn = el('button', { class: 'btn primary', title: 'Oynat / Duraklat' }, '▶ Oynat');
    const bar = el('div', { class: 'sv-transport' },
      el('button', { class: 'btn', title: 'Başa sar', onclick: () => p.reset() }, '⏮'),
      el('button', { class: 'btn', title: 'Bir adım geri', onclick: () => { p.pause(); p.back(); } }, '◀ Geri'),
      playBtn,
      el('button', { class: 'btn', title: 'Bir adım ileri', onclick: () => { p.pause(); p.step(); } }, 'İleri ▶|'),
      el('button', { class: 'btn', title: 'Sona git', onclick: () => p.toEnd() }, '⏭'));
    playBtn.addEventListener('click', () => p.toggle());
    p.onChange(() => { playBtn.textContent = p.playing ? '⏸ Durdur' : '▶ Oynat'; });
    if (o.speed !== false) {
      const sp = el('input', { type: 'range', min: 0, max: 100, value: toVal(p.speed) });
      const lab = el('span', { class: 'mini' });
      const upd = () => { p.speed = toSpeed(+sp.value); lab.textContent = p.speed + ' ' + unit; };
      sp.addEventListener('input', upd); upd();
      bar.append(el('label', { class: 'ctl' }, 'Hız ', sp, lab));
    }
    return bar;
  };

  /* ---------------- döngü bekçisi (sonsuz döngü koruması) ---------------- */
  function splitTop(s, ch) {
    const out = []; let depth = 0, cur = '';
    for (const c of s) {
      if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) depth--;
      if (c === ch && depth === 0) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); return out;
  }
  function guardLoops(src) {
    let out = '', i = 0; const n = src.length;
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); const end = e < 0 ? n : e; out += src.slice(i, end); i = end; continue; }
      if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; out += src.slice(i, end); i = end; continue; }
      if (c === '"' || c === "'" || c === '`') { let j = i + 1; while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; } out += src.slice(i, j + 1); i = j + 1; continue; }
      if (/[A-Za-z_$]/.test(c)) {
        let j = i; while (j < n && /[\w$]/.test(src[j])) j++;
        const w = src.slice(i, j);
        if ((w === 'for' || w === 'while') && !/[\w$.]/.test(src[i - 1] || '')) {
          let k = j; while (k < n && /\s/.test(src[k])) k++;
          if (src[k] === '(') {
            let depth = 0, m = k;
            for (; m < n; m++) { if (src[m] === '(') depth++; else if (src[m] === ')') { depth--; if (depth === 0) break; } }
            const inner = src.slice(k + 1, m);
            let ni;
            if (w === 'while') ni = '__g() && (' + guardLoops(inner) + ')';
            else {
              const parts = splitTop(inner, ';');
              if (parts.length === 3) { parts[1] = '__g()' + (parts[1].trim() ? ' && (' + guardLoops(parts[1]) + ')' : ''); ni = [guardLoops(parts[0]), parts[1], guardLoops(parts[2])].join(';'); }
              else ni = guardLoops(inner);
            }
            out += w + '(' + ni + ')'; i = m + 1; continue;
          }
        }
        out += w; i = j; continue;
      }
      out += c; i++;
    }
    return out;
  }
  SL.guardLoops = guardLoops;
  SL.makeGuard = function (limit = 3000000) {
    let g = 0;
    const f = () => { if (++g > limit) throw new Error('Döngü ' + SL.fmt(limit) + ' turu geçti — sonsuz döngü olabilir mi?'); return true; };
    f.reset = () => { g = 0; };   // her yeni dış çağrıda sayaç sıfırlanabilsin
    return f;
  };
  SL.jsErrorText = function (e) {
    if (e instanceof RangeError && /call stack/i.test(e.message)) return 'Yığın taşması (stack overflow): özyineleme çok derin ya da hiç bitmiyor!';
    return e.message;
  };

  /* ---------------- Pyodide (Python) — sadece gerekirse yüklenir ---------------- */
  let pyPromise = null;
  SL.loadPython = function (status) {
    if (pyPromise) return pyPromise;
    pyPromise = new Promise((resolve, reject) => {
      status && status('🐍 Python yükleniyor… (ilk seferde 5–15 sn sürebilir, internet gerekir)');
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
      s.onload = () => window.loadPyodide().then(resolve, reject);
      s.onerror = () => { pyPromise = null; reject(new Error('Pyodide yüklenemedi (internet bağlantısını kontrol edin).')); };
      document.head.append(s);
    });
    return pyPromise;
  };
  SL.pyErrorText = function (msg) {
    const last = String(msg).trim().split('\n').filter(Boolean).slice(-1)[0] || String(msg);
    if (/RecursionError/.test(last)) return 'Yığın taşması: Python’un özyineleme sınırı (≈1000) aşıldı — ağaç/özyineleme çok derin!';
    return last;
  };

  /* ---------------- canlı kod laboratuvarı iskeleti ----------------
     Sol: editör + araç çubuğu. Sağ: bileşene özel alan (shell.right).
     shell.onRun = async () => {...} atanır.                            */
  SL.labShell = function (root, o = {}) {
    const d = root.dataset;
    const lang = d.lang || 'js';
    const ta = root.querySelector('textarea');
    const original = ta.value.replace(/^\n/, '').replace(/\s+$/, '') + '\n';
    ta.remove();
    root.classList.add('codelab'); root.setAttribute('data-prevent-swipe', '');
    const tasks = root.querySelector('.lab-tasks');
    const shell = { lang, original, onRun: null };
    const runBtn = el('button', { class: 'btn primary', title: 'Çalıştır (Ctrl+Enter)' }, '▶ Çalıştır');
    const fsBtn = el('button', { class: 'btn', title: 'Tam ekran (kodu büyüt)' }, '⛶');
    const plus = el('button', { class: 'btn', title: 'Yazıyı büyüt' }, 'A+');
    const minus = el('button', { class: 'btn', title: 'Yazıyı küçült' }, 'A−');
    const resetBtn = el('button', { class: 'btn', title: 'Kodu ilk haline döndür' }, '↺ Sıfırla');
    const bar = el('div', { class: 'lab-bar' }, runBtn, resetBtn, minus, plus, fsBtn,
      el('span', { class: 'lab-lang' }, lang === 'python' ? '🐍 Python' : 'JavaScript'));
    const edHost = el('div', { class: 'lab-editor' });
    const left = el('div', { class: 'lab-left' }, bar, edHost);
    const right = el('div', { class: 'lab-right' });
    root.prepend(el('div', { class: 'lab-body' }, left, right));
    if (tasks) root.append(tasks);
    const baseFont = +(d.font || 19);
    let fontSize = baseFont;
    const run = () => shell.onRun && shell.onRun();
    const cm = window.CodeMirror(edHost, {
      value: original, mode: lang === 'python' ? 'python' : 'javascript', lineNumbers: true, lineWrapping: true,
      indentUnit: lang === 'python' ? 4 : 2, tabSize: 4, theme: 'lab', viewportMargin: Infinity,
      extraKeys: { 'Ctrl-Enter': run, 'Cmd-Enter': run, Tab: c => c.replaceSelection(' '.repeat(c.getOption('indentUnit'))) }
    });
    const applyFont = () => { cm.getWrapperElement().style.fontSize = fontSize + 'px'; cm.refresh(); };
    plus.onclick = () => { fontSize = Math.min(44, fontSize + 2); applyFont(); };
    minus.onclick = () => { fontSize = Math.max(11, fontSize - 2); applyFont(); };
    resetBtn.onclick = () => { cm.setValue(original); run(); };
    runBtn.onclick = run;
    applyFont();
    // Tam ekran: bileşeni geçici olarak <body>'ye taşı (reveal ölçeklemesinden kurtulmak için)
    let ph = null;
    const toggleFs = () => {
      if (!ph) {
        ph = document.createComment('codelab'); root.replaceWith(ph);
        document.body.append(root); root.classList.add('fullscreen');
        fontSize = Math.max(fontSize, 24); window.Reveal && Reveal.configure({ keyboard: false });
        fsBtn.textContent = '✕ Kapat';
      } else {
        root.classList.remove('fullscreen'); ph.replaceWith(root); ph = null;
        fontSize = baseFont; window.Reveal && Reveal.configure({ keyboard: true });
        fsBtn.textContent = '⛶';
      }
      applyFont();
    };
    fsBtn.onclick = toggleFs;
    root.addEventListener('keydown', e => { if (e.key === 'Escape' && ph) toggleFs(); });
    const msg = el('div', { class: 'lab-msg' });
    const out = el('pre', { class: 'lab-out' });
    Object.assign(shell, {
      cm, right, msg, out, run,
      print: (...args) => { out.textContent += args.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ') + '\n'; out.style.display = 'block'; },
      clearOut: () => { out.textContent = ''; out.style.display = 'none'; },
      setMsg: (cls, html) => { msg.className = 'lab-msg ' + (cls || ''); msg.innerHTML = html; },
      refresh: () => cm.refresh()
    });
    return shell;
  };

  /* ---------------- .quiz ---------------- */
  SL.Quiz = function (root) {
    const ans = root.dataset.answer;
    const ex = root.querySelector('.explain');
    root.querySelectorAll('[data-opt]').forEach(b => {
      b.addEventListener('click', () => {
        const ok = b.dataset.opt === ans;
        b.classList.remove('wrong', 'right'); void b.offsetWidth;
        b.classList.add(ok ? 'right' : 'wrong');
        if (ok && ex) ex.classList.add('show');
      });
    });
    const show = el('button', { class: 'btn ghost reveal-ans' }, 'Cevabı göster');
    show.onclick = () => { root.querySelector(`[data-opt="${ans}"]`).classList.add('right'); ex && ex.classList.add('show'); };
    root.append(show);
  };

  /* ---------------- .tabs (Python / C# / JS) — seçim tüm sunumda hatırlanır ---------------- */
  const tabGroups = [];
  let prefLang = null;
  try { prefLang = localStorage.getItem('deck-lang'); } catch (e) {}
  if (!prefLang) prefLang = 'JavaScript';   // varsayılan sekme: JavaScript (p5.js); öğrenci başka dil seçerse o hatırlanır
  SL.Tabs = function (root) {
    const panes = [...root.querySelectorAll(':scope > .tab')];
    const head = el('div', { class: 'tab-head' });
    const pick = label => {
      const k = panes.findIndex(p => p.dataset.label.split(' ')[0] === label.split(' ')[0]);
      if (k < 0) return false;
      panes.forEach((x, q) => x.classList.toggle('on', q === k));
      [...head.children].forEach((x, q) => x.classList.toggle('on', q === k));
      return true;
    };
    panes.forEach(p => {
      const b = el('button', { class: 'tab-btn' }, p.dataset.label);
      b.onclick = () => {
        prefLang = p.dataset.label;
        try { localStorage.setItem('deck-lang', prefLang); } catch (e) {}
        tabGroups.forEach(g => g(prefLang) || null);
      };
      head.append(b);
    });
    root.prepend(head);
    tabGroups.push(pick);
    if (!(prefLang && pick(prefLang))) pick(panes[0].dataset.label);
  };

  /* ---------------- kod büyüteci (zoom modal) ---------------- */
  SL.CodeZoom = (function () {
    let modal, body, size = 30, lastFocus = null;
    function ensure() {
      if (modal) return;
      body = el('div', { class: 'cz-body' });
      const sizeLab = el('span', { class: 'mini' });
      const set = s => { size = Math.max(14, Math.min(64, s)); body.style.fontSize = size + 'px'; sizeLab.textContent = size + 'px'; };
      modal = el('div', { class: 'cz-modal', tabindex: '-1' },
        el('div', { class: 'cz-bar' },
          el('b', null, '🔍 Kod büyüteci'),
          el('span', { class: 'mini' }, '  + / − : yazı boyutu · Esc: kapat'),
          el('span', { class: 'cz-sp' }),
          el('button', { class: 'btn', onclick: () => set(size - 4) }, 'A−'), sizeLab,
          el('button', { class: 'btn', onclick: () => set(size + 4) }, 'A+'),
          el('button', { class: 'btn primary', onclick: close }, '✕ Kapat')),
        body);
      modal.addEventListener('keydown', e => {
        if (e.key === 'Escape') { close(); e.stopPropagation(); }
        if (e.key === '+' || e.key === '=') { set(size + 4); e.preventDefault(); }
        if (e.key === '-') { set(size - 4); e.preventDefault(); }
      });
      modal.addEventListener('click', e => { if (e.target === modal) close(); });
      document.body.append(modal);
      set(size);
    }
    function open(codeEl) {
      ensure();
      const raw = codeEl.dataset.raw != null ? codeEl.dataset.raw : codeEl.textContent;
      const langCls = [...codeEl.classList].find(c => c.startsWith('language-'));
      const lang = langCls ? langCls.slice(9) : 'plaintext';
      const hl = window.Reveal && Reveal.getPlugin('highlight') && Reveal.getPlugin('highlight').hljs;
      const lines = raw.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
      const ind = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length));
      const rows = lines.map((ln, k) => {
        ln = ln.slice(ind);
        let html = ln.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        if (hl && hl.getLanguage(lang)) html = hl.highlight(ln, { language: lang, ignoreIllegals: true }).value;
        return `<tr><td class="cz-ln">${k + 1}</td><td class="cz-code">${html || ' '}</td></tr>`;
      });
      body.innerHTML = `<table class="cz-table hljs">${rows.join('')}</table>`;
      modal.classList.add('open');
      lastFocus = document.activeElement;
      window.Reveal && Reveal.configure({ keyboard: false });
      modal.focus();
    }
    function close() {
      modal.classList.remove('open');
      window.Reveal && Reveal.configure({ keyboard: true });
      lastFocus && lastFocus.blur && lastFocus.blur();
    }
    return { open, close };
  })();

  /* Her <pre><code> bloğuna satır numarası + büyüteç düğmesi ekle (highlight'tan ÖNCE çağrılır) */
  SL.prepareCode = function () {
    document.querySelectorAll('.reveal pre > code').forEach(code => {
      const tpl = code.querySelector('script[type="text/template"]');
      code.dataset.raw = tpl ? tpl.textContent : code.textContent;
      if (!code.hasAttribute('data-line-numbers')) code.setAttribute('data-line-numbers', '');
      const pre = code.parentElement;
      const b = el('button', { class: 'zoom-btn', title: 'Kodu büyüt (Z tuşu)' }, '🔍');
      b.addEventListener('click', e => { e.stopPropagation(); SL.CodeZoom.open(code); });
      pre.classList.add('has-zoom');
      pre.append(b);
    });
  };
  SL.zoomCurrent = function () {
    const s = window.Reveal && Reveal.getCurrentSlide();
    if (!s) return;
    const codes = [...s.querySelectorAll('pre > code')].filter(c => c.offsetParent !== null);
    if (codes.length) SL.CodeZoom.open(codes[0]);
  };

  /* ---------------- bileşen kaydı + Reveal başlatma ---------------- */
  const registry = [];
  SL.register = (selector, factory) => registry.push([selector, factory]);
  window.DEMOS = window.DEMOS || {};
  SL.register('.demo', root => {
    const f = window.DEMOS[root.dataset.demo];
    if (!f) throw new Error('Bilinmeyen demo: ' + root.dataset.demo);
    return f(root);
  });

  SL.boot = function () {
    const btn = document.getElementById('themeBtn');
    const syncBtn = () => { btn.textContent = document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙'; };
    const toggleTheme = () => {
      const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = t;
      try { localStorage.setItem('deck-theme', t); } catch (e) {}
      syncBtn(); SL.themeChanged();
    };
    btn.addEventListener('click', toggleTheme);
    syncBtn();
    // Web fontları yüklenince canvas çizimlerini yenile (ilk çizim yedek fontla yapılmış olabilir)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(SL.themeChanged, 50));

    if (window.renderMathInElement) {
      renderMathInElement(document.querySelector('.reveal'), {
        delimiters: [{ left: '\\(', right: '\\)', display: false }, { left: '$$', right: '$$', display: true }],
        throwOnError: false
      });
    }
    SL.prepareCode();

    Reveal.initialize({
      width: 1280, height: 720, margin: 0.05,
      hash: true, center: false, slideNumber: 'c/t', showSlideNumber: 'all',
      transition: 'slide', backgroundTransition: 'fade',
      plugins: [RevealHighlight, RevealNotes]
    }).then(init);
    Reveal.addKeyBinding({ keyCode: 84, key: 'T', description: 'Açık / koyu tema' }, toggleTheme);
    Reveal.addKeyBinding({ keyCode: 90, key: 'Z', description: 'Slayttaki kodu büyüt' }, () => SL.zoomCurrent());

    const insts = new Map();
    function make(root, factory) {
      try { insts.set(root, factory(root) || {}); }
      catch (e) { console.error('Bileşen başlatılamadı:', root, e); root.insertAdjacentHTML('beforeend', `<div class="lab-msg err">⚠️ ${e.message}</div>`); }
    }
    function init() {
      document.querySelectorAll('.tabs').forEach(r => SL.Tabs(r));
      document.querySelectorAll('.quiz').forEach(r => SL.Quiz(r));
      registry.forEach(([sel, f]) => document.querySelectorAll(sel).forEach(r => make(r, f)));
      // ortak yardım metinleri (ortak/yardim.js): bileşen türüne ve algoritmasına göre panel ekle
      if (SL.HELP) document.querySelectorAll('.demo[data-demo], .sortviz, .ufviz, .bstviz').forEach(r => {
        if (r.dataset.helpDone) return; r.dataset.helpDone = 1;
        const cls = ['sortviz', 'ufviz', 'bstviz'].find(c => r.classList.contains(c));
        const deck = location.pathname.split('/').filter(Boolean).filter(x => !x.endsWith('.html')).slice(-1)[0] || '';
        const keys = cls ? [cls + ':' + (r.dataset.alg || ''), cls] : ['demo:' + deck + ':' + r.dataset.demo, 'demo:' + r.dataset.demo];   // önce sunuma özgü anahtar
        const pick = f => { for (const k of keys) if (SL.HELP[k] && SL.HELP[k][f]) return SL.HELP[k][f]; return null; };
        let at = r; while (at.nextElementSibling && at.nextElementSibling.classList.contains('demo-help')) at = at.nextElementSibling;
        const have = [...r.parentNode.querySelectorAll(':scope > .demo-help')].map(x => x.dataset.title || '');
        [['ui', 'ℹ️ Düğmeler ne yapar?'], ['alg', '🧠 Algoritma adım adım']].forEach(([f, title]) => {
          const t = pick(f); if (!t || have.some(h => h.startsWith(title.slice(0, 2)))) return;
          const d = document.createElement('div'); d.className = 'demo-help'; d.dataset.title = title; d.innerHTML = t; at.after(d); at = d;
        });
      });
      // Açılır yardım panelleri: bir demonun hemen ardından gelen <div class="demo-help" data-title="…">…</div> öğeleri
      // demonun sağ üstüne birer düğme olur; tıklayınca demonun üstünde bir panel açılır (ekran kalabalıklaşmaz).
      document.querySelectorAll('.demo-help').forEach(h => {
        if (h.dataset.done) return; h.dataset.done = 1;
        let host = h.previousElementSibling; while (host && host.classList.contains('demo-help')) host = host.previousElementSibling;
        if (!host) return;
        let bar = host.previousElementSibling && host.previousElementSibling.classList.contains('dh-bar') ? host.previousElementSibling : null;
        if (!bar) bar = host.querySelector(':scope .sv-transport > .dh-bar');
        const tr = !bar && host.querySelector('.sv-transport');
        if (tr) { bar = document.createElement('div'); bar.className = 'dh-bar in-tr'; tr.appendChild(bar); }
        const sec = host.closest('section'), h2 = sec && sec.querySelector(':scope > h2');
        // aynı demonun ikinci düğmesi: başlık satırında bu demoya açılmış çubuk varsa ona eklensin (ayrı satır açmasın)
        if (!bar && sec) { const hb = sec.querySelector(':scope > .dh-bar.in-h2'); if (hb && hb.dataset.host === String([...sec.querySelectorAll('.demo, .sortviz, .ufviz, .bstviz')].indexOf(host))) bar = hb; }
        if (!bar && h2 && h2.textContent.trim().length <= 44 && !sec.querySelector(':scope > .dh-bar.in-h2')) {   // kısa başlıkta düğmeler başlık satırının sağına
          bar = document.createElement('div'); bar.className = 'dh-bar in-h2'; bar.dataset.host = String([...sec.querySelectorAll('.demo, .sortviz, .ufviz, .bstviz')].indexOf(host)); sec.appendChild(bar);
        }
        if (!bar) {
          bar = document.createElement('div'); bar.className = 'dh-bar';
          const pd = getComputedStyle(host.parentNode).display;
          if (pd === 'grid' || pd === 'flex' || pd === 'inline-grid') {   // sütunlu düzende demoyla aynı hücrede kalsın
            const w = document.createElement('div'); w.className = 'dh-wrap'; host.before(w); w.append(bar, host);
            let n = w.nextElementSibling; while (n && n.classList.contains('demo-help')) { const nx = n.nextElementSibling; w.append(n); n = nx; }
          } else host.parentNode.insertBefore(bar, host);
        }
        const wrap = document.createElement('div'); wrap.className = 'dh-panel'; wrap.hidden = true;
        wrap.innerHTML = `<button class="dh-x" title="Kapat">✕</button><div class="dh-h">${h.dataset.title || 'Açıklama'}</div>` + h.innerHTML;
        bar.appendChild(wrap);
        const b = document.createElement('button'); b.className = 'btn dh-btn'; b.textContent = h.dataset.title || 'ℹ️ Açıklama';
        b.onclick = e => { e.stopPropagation(); const open = wrap.hidden; bar.querySelectorAll('.dh-panel').forEach(x => (x.hidden = true)); bar.querySelectorAll('.dh-btn').forEach(x => x.classList.remove('primary')); wrap.hidden = !open; if (open) b.classList.add('primary'); };
        wrap.querySelector('.dh-x').onclick = e => { e.stopPropagation(); wrap.hidden = true; b.classList.remove('primary'); };
        bar.insertBefore(b, bar.querySelector('.dh-panel'));
      });
      Reveal.sync(); // sonradan eklenen fragment'ler (iz tablosu satırları) için
      activate(Reveal.getCurrentSlide());
    }
    const each = (slide, fn) => slide && insts.forEach((inst, root) => { if (slide.contains(root)) fn(inst); });
    const activate = s => each(s, i => { i.refresh && i.refresh(); i.start && i.start(); });
    const deactivate = s => each(s, i => i.stop && i.stop());
    Reveal.on('slidechanged', e => { deactivate(e.previousSlide); activate(e.currentSlide); });

    // Emniyet: içerik 720 piksellik slayt alanına sığmazsa (farklı çözünürlük/yazı tipi, büyüyen demo çıktısı) slaydı küçült
    const fit = () => {
      const sl = Reveal.getCurrentSlide(); if (!sl || sl.classList.contains('level')) return;
      sl.querySelectorAll('[data-grown]').forEach(e => { e.style.zoom = ''; delete e.dataset.grown; });
      sl.style.zoom = ''; sl.classList.remove('tight'); radFix(sl); codeFit(sl); mathFit(sl);
      if (bottomR(sl) > 652) sl.classList.add('tight');   // önce kutuların satır aralığını daralt
      const h = sl.scrollHeight, room = 700;
      const used0 = bottomR(sl);
      if ((h > room + 4 && used0 > room - 40) || used0 > room - 12) {
        let z = Math.max(0.6, (room - 8) / Math.max(h, used0)); sl.style.zoom = z.toFixed(3);
        // gerçek ekran konumuyla doğrula: içerik slayt alanının altını aşıyorsa biraz daha küçült
        const top = document.querySelector('.reveal .slides').getBoundingClientRect().top, lim = top + 708 * Reveal.getScale();
        const low = () => Math.max(...[...sl.children].filter(c => c.offsetHeight && getComputedStyle(c).position !== 'absolute').map(c => c.getBoundingClientRect().bottom));
        for (let k = 0; k < 8 && low() > lim && z > 0.6; k++) { z *= 0.97; sl.style.zoom = z.toFixed(3); }
        return;
      }
      grow(sl); growText(sl); mathFit(sl);
    };
    // zoom uygulanmış öğelerde offsetHeight yanıltır; ekrandaki dikdörtgenden ölç
    const bottomR = sl => { const r0 = sl.getBoundingClientRect(), sc = r0.width / sl.offsetWidth || 1; let b = 0; for (const c of sl.children) { if (!c.offsetHeight || getComputedStyle(c).position === 'absolute') continue; b = Math.max(b, (c.getBoundingClientRect().bottom - r0.top) / sc); } return b; };
    // Tablo ya da kod içeren, çizimsiz bir slaytta sayfanın altı boş kalıyorsa içeriği büyüt (küçük tablo + boş sayfa olmasın).
    const growText = sl => {
      const kids = [...sl.children].filter(c => !c.matches('h1, h2, aside, .abbr-foot, script, style'));
      kids.forEach(c => { if (c.dataset.gz) { c.style.zoom = ''; delete c.dataset.gz; } });
      if (sl.classList.contains('no-grow') || sl.classList.contains('title') || !sl.querySelector('table, pre')) return;
      if (sl.querySelector('canvas, svg, iframe, video, img, .CodeMirror, textarea, [data-demo], [data-sim], [data-lab]') || (demoSel && sl.querySelector(demoSel))) return;
      if (kids.some(c => c.style.zoom)) return;
      const h2 = sl.querySelector(':scope > h2'), top = h2 ? h2.offsetTop + h2.offsetHeight : 0, ch = bottom(sl) - top;
      if (ch < 40) return;
      let z = Math.min(1.34, (610 - top) / ch); if (z < 1.1) return;
      const wide = () => { const R = sl.getBoundingClientRect().right + 2; return kids.some(c => c.scrollWidth > c.clientWidth + 3 || c.getBoundingClientRect().right > R || [...c.querySelectorAll('table, td, pre')].some(e => e.getBoundingClientRect().right > R)); };
      for (let k = 0; k < 8; k++) {
        kids.forEach(c => { c.style.zoom = z.toFixed(3); c.dataset.gz = 1; }); codeFit(sl);
        if (bottomR(sl) <= 640 && !wide()) return;
        z *= 0.95; if (z < 1.08) break;
      }
      kids.forEach(c => { c.style.zoom = ''; delete c.dataset.gz; }); codeFit(sl);
    };
    // Düz metindeki √(…) ve √N yazımlarını üstü çizgili köke çevir (kod, formül, svg, canvas hariç).
    const RAD1 = /√\(((?:[^()]|\([^()]*\))*)\)/g, RAD2 = /√([0-9A-Za-zπ]+(?:[.,][0-9]+)?)/g;
    const radFix = root => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.nodeValue.includes('√') && !n.parentElement.closest('pre, code, script, style, svg, canvas, .katex, .rad, textarea, .CodeMirror') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
      const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
      // demo çıktılarında ondalık nokta → virgül (23.9 → 23,9); binlik ayırıcıya (1.000) ve kod/sürüm metinlerine dokunmaz
      const w2 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (/\d\.\d/.test(n.nodeValue) && n.parentElement.closest('.demo, .sv-counters, .sv-note, .btd-log, .btd-moral, .ah-open, .sh-tbl, .ev-side, .lf-info') && !n.parentElement.closest('pre, code, script, style, .katex, textarea, .CodeMirror, kbd') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
      const dn = []; while (w2.nextNode()) dn.push(w2.currentNode);
      dn.forEach(n => { const v = n.nodeValue.replace(/(^|[^\w.,])(\d+)\.(\d{1,2})(?![\d.])/g, '$1$2,$3'); if (v !== n.nodeValue) n.nodeValue = v; });
      nodes.forEach(n => {
        const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        const html = esc(n.nodeValue).replace(RAD1, (m, x) => `<span class="rad">√<span>${x}</span></span>`).replace(RAD2, (m, x) => `<span class="rad">√<span>${x}</span></span>`);
        if (html === esc(n.nodeValue)) return;
        const t = document.createElement('span'); t.innerHTML = html; n.replaceWith(...t.childNodes);
      });
    };
    // Formül (KaTeX) sütununa sığmıyorsa yazı boyutunu sığana kadar küçült (en az %60).
    const mathFit = sl => sl.querySelectorAll('.katex').forEach(k => {
      if (k.parentElement.closest('.katex')) return;
      const t = k.closest('.katex-display') || k; t.style.fontSize = '';
      const box = (k.closest('.katex-display') || k).parentElement.closest('p, div, li, td, th'); if (!box || !box.clientWidth) return;
      const br = box.getBoundingClientRect(), kr = k.getBoundingClientRect(), cs = getComputedStyle(box);
      const sc = br.width / box.offsetWidth || 1, cw = br.width - (parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) * sc;
      const room = k.closest('.katex-display') ? cw : br.right - parseFloat(cs.paddingRight) * sc - kr.left;
      if (kr.width > room + 1) t.style.fontSize = Math.max(55, Math.floor(room / kr.width * 97)) + '%';
    });
    // Kod bloğu yatayda taşıyorsa (yorumlar sağda kesiliyorsa) ya da dikeyde kutusuna sığmayıp kaydırma çubuğuna
    // düşüyorsa (alttaki satırlar görünmüyorsa) yazıyı sığana kadar küçült. Yatayda %72'nin, dikeyde %62'nin altına inmez.
    // Adım adım vurgulu kodda (data-line-numbers="1-4|10-17") reveal her adım için kodun bir kopyasını üst üste koyar;
    // yalnızca ilkini ölçüp aynı boyutu kopyalara da veririz.
    const codeFit = sl => { codeFit1(sl); sl.querySelectorAll('pre').forEach(p => { const cs = p.querySelectorAll(':scope > code'); for (let i = 1; i < cs.length; i++) { cs[i].style.fontSize = cs[0].style.fontSize; cs[i].style.maxHeight = cs[0].style.maxHeight; } }); };
    const codeFit1 = sl => sl.querySelectorAll('pre > code:first-of-type').forEach(c => {
      if (!c.clientWidth) return;
      c.style.fontSize = ''; c.style.maxHeight = '';
      // dikeyde sığmıyorsa önce slaydın altındaki boş yeri kullan (kutu uzasın), kalanı yazı küçülterek çöz
      if (c.scrollHeight > c.clientHeight + 4) {
        const z = parseFloat((c.closest('[data-gz]') || {}).style?.zoom) || 1, free = (690 - bottomR(sl)) / z;
        if (free > 8) c.style.maxHeight = Math.min(c.scrollHeight + 2, c.clientHeight + free) + 'px';
      }
      const wideBy = c.scrollWidth > c.clientWidth + 2, tallBy = c.scrollHeight > c.clientHeight + 4;
      if (!wideBy && !tallBy) return;
      const px = parseFloat(getComputedStyle(c).fontSize), pad = 30;
      let f = 1;
      if (wideBy) f = Math.min(f, Math.max(0.72, (c.clientWidth - pad) / (c.scrollWidth - pad) * 0.985));
      if (tallBy) f = Math.min(f, Math.max(0.62, (c.clientHeight - 26) / (c.scrollHeight - 26) * 0.98));
      c.style.fontSize = (px * f).toFixed(2) + 'px';
    });
    // içeriğin gerçek alt kenarı (mutlak konumlu ve gizli öğeler hariç)
    const bottom = sl => { let b = 0; for (const c of sl.children) { if (!c.offsetHeight || getComputedStyle(c).position === 'absolute') continue; b = Math.max(b, c.offsetTop + c.offsetHeight); } return b; };
    // Tersi: slaytta tek bir demo var ve altı boş kalıyorsa demoyu büyüt (sıkışık görünmesin).
    // zoom yerleşimi yeniden akıtır; yatayda ya da dikeyde taşarsa oran azaltılır.
    const demoSel = ['.demo[data-demo]'].concat(registry.map(r => r[0])).join(',');
    let grownFor = null, grownMax = 9;
    const grow = sl => {
      if (sl.classList.contains('no-grow') || !demoSel) return;
      const cand = [...sl.children].filter(c => c.matches(demoSel));
      if (cand.length !== 1) return;
      const d = cand[0]; if (d.querySelector('.CodeMirror, iframe, textarea')) return;
      if (grownFor !== sl) { grownFor = sl; grownMax = 9; }
      d.style.zoom = '';
      const dh = d.offsetHeight, other = bottom(sl) - dh; if (dh < 40) return;
      let z = Math.min(1.42, grownMax, (640 - other) / dh);
      if (z < 1.1) return;
      const wide = () => { if (d.scrollWidth > d.clientWidth + 2) return true; const R = d.getBoundingClientRect().right + 1; for (const e of d.querySelectorAll('*')) { if (e.offsetWidth && e.getBoundingClientRect().right > R) return true; } return false; };
      for (let k = 0; k < 10; k++) { d.style.zoom = z.toFixed(3); d.dataset.grown = 1; if (bottomR(sl) <= 650 && !wide()) break; z *= 0.95; if (z < 1.08) { d.style.zoom = ''; return; } }
      grownMax = z;
    };
    // Kısaltma sözlüğü: slaytta geçen kısaltmaların açılımı, yer varsa slaytın altında küçük bir satırda gösterilir.
    const ABBR = { BT: 'davranış ağacı (behavior tree)', GDC: 'Game Developers Conference: oyun geliştiricilerin yıllık konferansı', RL: 'pekiştirmeli öğrenme (reinforcement learning)', ML: 'makine öğrenmesi (machine learning)', BSP: 'ikili uzay bölümleme (binary space partitioning)', EQS: 'Unreal’ın ortam sorgu sistemi (Environment Query System): aday noktaları puanlar', JSON: 'metin tabanlı veri biçimi: { "anahtar": değer }', WFC: 'dalga fonksiyonu çöküşü (wave function collapse): komşuluk kurallarıyla içerik üretimi', JPS: 'atlama noktası araması (jump point search): ızgarada hızlandırılmış A*', RVO: 'karşılıklı hız engeli (reciprocal velocity obstacles): birbirinden kaçınan hareket', ECS: 'varlık-bileşen-sistem (entity-component-system) mimarisi', GC: 'çöp toplayıcı (garbage collector): kullanılmayan nesneleri bellekten kendiliğinden silen mekanizma', MMO: 'çok sayıda oyuncunun aynı çevrimiçi dünyada oynadığı oyun', RTS: 'gerçek zamanlı strateji oyunu', NPC: 'oyuncunun yönetmediği karakter', RPG: 'rol yapma oyunu', FOV: 'görüş alanı', RNG: 'rastgele sayı üreteci', HUD: 'ekrandaki gösterge katmanı (can, harita, mermi)', UI: 'kullanıcı arayüzü', API: 'bir yapının dışarıya sunduğu işlemler listesi', CPU: 'işlemci', GPU: 'grafik işlemcisi (ekran kartı)', LIFO: 'son giren ilk çıkar', FIFO: 'ilk giren ilk çıkar', BFS: 'genişlik öncelikli arama', DFS: 'derinlik öncelikli arama', MST: 'en küçük kapsayan ağaç', PQ: 'öncelik kuyruğu', BST: 'ikili arama ağacı', DAG: 'yönlü döngüsüz graf', AABB: 'eksenlere hizalı sınır kutusu', BVH: 'sınır kutuları hiyerarşisi', FSM: 'sonlu durum makinesi', HFSM: 'hiyerarşik durum makinesi', GOAP: 'hedef odaklı eylem planlama', HTN: 'hiyerarşik görev ağı', MCTS: 'Monte Carlo ağaç araması', PCG: 'prosedürel içerik üretimi', LOD: 'ayrıntı düzeyi (uzaktakini sade işle)', XP: 'deneyim puanı', HP: 'can puanı', DPS: 'saniyedeki hasar', FPS: 'saniyedeki kare sayısı (ya da birinci şahıs nişancı oyunu)', LLM: 'büyük dil modeli', SAT: 'ayıran eksen teoremi', CCD: 'sürekli çarpışma tespiti' };
    const abbrRe = new RegExp('(^|[^A-Za-zÇĞİÖŞÜçğıöşü0-9_])(' + Object.keys(ABBR).join('|') + ')(?![A-Za-zÇĞİÖŞÜçğıöşü0-9_])', 'g');
    const abbrFoot = sl => {
      const old = sl.querySelector(':scope > .abbr-foot'); if (old) old.remove();
      if (sl.classList.contains('level') || sl.classList.contains('title') || sl.querySelector('.CodeMirror')) return;
      const clone = sl.cloneNode(true); clone.querySelectorAll('pre, code, .notes, aside, script, style, .abbr-foot, canvas, svg').forEach(e => e.remove());
      const text = clone.textContent || '', seen = []; let m; abbrRe.lastIndex = 0;
      while ((m = abbrRe.exec(text)) && seen.length < 4) { const k = m[2]; if (!seen.includes(k) && !new RegExp(k + '\\s*[(:=]').test(text.slice(m.index, m.index + k.length + 4))) seen.push(k); }
      if (!seen.length || bottom(sl) > 628) return;
      const d = document.createElement('div'); d.className = 'abbr-foot';
      d.innerHTML = '📖 ' + seen.map(k => `<b>${k}</b>: ${ABBR[k]}`).join(' · ');
      sl.appendChild(d);
    };
    let fitT; const fitSoon = () => { clearTimeout(fitT); fitT = setTimeout(() => { fit(); const sl = Reveal.getCurrentSlide(); if (sl) abbrFoot(sl); }, 250); };
    Reveal.on('slidechanged', fitSoon); Reveal.on('slidechanged', () => setTimeout(fitSoon, 900)); Reveal.on('ready', fitSoon); Reveal.on('resize', fitSoon); Reveal.on('fragmentshown', fitSoon);
    document.addEventListener('click', fitSoon); document.addEventListener('keyup', fitSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);

    // Kaydırıcı / seçim kutusu değişince odağı bırak → ok tuşları yine slayt değiştirsin
    document.addEventListener('change', e => {
      if (e.target.matches('.reveal input[type=range], .reveal select, .reveal input[type=checkbox]')) e.target.blur();
    });
    document.addEventListener('mouseup', e => {
      const b = e.target.closest('.reveal button');
      if (b) setTimeout(() => b.blur(), 0);
    });
  };
})();

/* 🎮 Oyun kartlarındaki “▶ video”: sunumdan çıkmadan, slaytın üstünde açılan bir oynatıcı (araclar/oyunref.py).
   Ctrl/⌘ ile tıklanırsa bağlantı her zamanki gibi yeni sekmede açılır. */
(function () {
  let kutu = null;
  const kapat = () => { if (kutu) { kutu.remove(); kutu = null; } };
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a.oy-vid');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault(); kapat();
    kutu = document.createElement('div');
    kutu.className = 'oy-vid-kutu';
    kutu.innerHTML = '<div class="ovk-ic"><button class="ovk-x" title="Kapat (Esc)">✕</button>' +
      '<iframe src="https://www.youtube-nocookie.com/embed/' + a.dataset.yt + '?autoplay=1" title="' + (a.title || 'video').replace(/"/g, '&quot;') +
      '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
      '<div class="ovk-alt">' + (a.title || '') + ' · <a href="' + a.href + '" target="_blank" rel="noopener">YouTube’da aç ↗</a></div></div>';
    kutu.addEventListener('click', ev => { if (ev.target === kutu || ev.target.classList.contains('ovk-x')) kapat(); });
    document.body.appendChild(kutu);
  });
  document.addEventListener('keydown', e => { if (kutu && e.key === 'Escape') { e.stopPropagation(); kapat(); } }, true);
})();
