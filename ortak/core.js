/* =====================================================================
   core.js — Tüm desteler için ortak çekirdek
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
      value: original, mode: lang === 'python' ? 'python' : 'javascript', lineNumbers: true,
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

  /* ---------------- .tabs (Python / C# / JS) — seçim tüm destede hatırlanır ---------------- */
  const tabGroups = [];
  let prefLang = null;
  try { prefLang = localStorage.getItem('deck-lang'); } catch (e) {}
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
      Reveal.sync(); // sonradan eklenen fragment'ler (iz tablosu satırları) için
      activate(Reveal.getCurrentSlide());
    }
    const each = (slide, fn) => slide && insts.forEach((inst, root) => { if (slide.contains(root)) fn(inst); });
    const activate = s => each(s, i => { i.refresh && i.refresh(); i.start && i.start(); });
    const deactivate = s => each(s, i => i.stop && i.stop());
    Reveal.on('slidechanged', e => { deactivate(e.previousSlide); activate(e.currentSlide); });

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
