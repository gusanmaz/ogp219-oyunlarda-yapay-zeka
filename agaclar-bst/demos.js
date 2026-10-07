/* =====================================================================
   demos.js — "Ağaçlar ve İkili Arama Ağaçları" destesine özel demolar
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = window.DEMOS;
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);
  // Not: binsearch, guess ve log2 demoları ../ortak/arama.js dosyasında (arama destesiyle ortak)

  /* n-ary ağaç yerleşimi: yapraklar sırayla, iç düğümler çocuklarının ortasında */
  function layoutNary(root, W, H, o = {}) {
    let leaf = 0, maxD = 0; const all = [];
    const walk = (x, d, p) => {
      x._d = d; x._p = p; all.push(x); if (d > maxD) maxD = d;
      if (!x.kids || !x.kids.length) x._i = leaf++;
      else { x.kids.forEach(k => walk(k, d + 1, x)); x._i = (x.kids[0]._i + x.kids[x.kids.length - 1]._i) / 2; }
    };
    walk(root, 0, null);
    const mx = o.mx || 70, top = o.top || 30, bottom = o.bottom || 30;
    const sp = leaf > 1 ? (W - 2 * mx) / (leaf - 1) : 0, dy = maxD ? (H - top - bottom) / maxD : 0;
    all.forEach(x => { x._x = leaf > 1 ? mx + x._i * sp : W / 2; x._y = top + x._d * dy; });
    return all;
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

  /* ---------- 1) Başlık: neon ağaç büyüyor ---------- */
  D.titletree = function (root) {
    const W = 1280, H = 270;
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let m, timer, running = false, pause = 0;
    const reset = () => { m = new SL.BSTModel(); };
    reset();
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const snap = m.snap(); if (!snap) return;
      const L = SL.layoutBinary(snap, W, H, { maxSp: 40, maxDy: 46, top: 20, bottom: 18, maxR: 12 });
      const st = [snap];
      ctx.lineWidth = 2;
      while (st.length) {
        const x = st.pop(), p = L.pos.get(x.id);
        [x.l, x.r].forEach(k => { if (!k) return; const q = L.pos.get(k.id); ctx.strokeStyle = 'rgba(180,150,255,0.55)'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); st.push(k); });
      }
      L.pos.forEach(p => {
        const hue = 280 - p.d * 38;
        ctx.shadowColor = `hsl(${hue},95%,60%)`; ctx.shadowBlur = 14;
        ctx.fillStyle = `hsl(${hue},95%,62%)`; ctx.beginPath(); ctx.arc(p.x, p.y, L.r, 0, 7); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#0d0820'; ctx.font = `700 ${Math.round(L.r * 0.9)}px "JetBrains Mono"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.key, p.x, p.y + 1);
      });
    };
    const tick = () => {
      if (!running) return;
      if (pause > 0) { pause--; if (!pause) reset(); }
      else if (m.sz(m.root) >= 28) pause = 6;
      else { let k; do { k = 1 + rint(99); } while (SL.inorderKeys(m.snap() || null).includes(k)); m.insertSilent(k); }
      draw();
      timer = setTimeout(tick, 420);
    };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };

  /* ---------- 2) Terimler: sahne hiyerarşisi ---------- */
  D.terms = function (root) {
    const scene = { name: 'Sahne', kids: [
      { name: 'Oyuncu', kids: [{ name: 'Kamera' }, { name: 'Silah', kids: [{ name: 'Namlu' }] }] },
      { name: 'Düşmanlar', kids: [{ name: 'Ork 1' }, { name: 'Ork 2' }] },
      { name: 'Arazi', kids: [{ name: 'Ağaç' }, { name: 'Kaya' }, { name: 'Nehir' }] }] };
    const W = 700, H = 330, BW = 82, BH = 32;
    const c = el('canvas', { style: 'cursor:pointer' }); const ctx = SL.setupCanvas(c, W, H);
    const all = layoutNary(scene, W, H, { mx: 50, top: 24, bottom: 24 });
    const hier = el('div', { class: 'hier' });
    const info = el('div', { class: 'term-info' });
    let sel = all[1];
    const sub = x => { const s = [x]; (x.kids || []).forEach(k => s.push(...sub(k))); return s; };
    const height = x => (x.kids && x.kids.length ? 1 + Math.max(...x.kids.map(height)) : 0);
    const draw = () => {
      const t = T();
      ctx.clearRect(0, 0, W, H);
      const subs = new Set(sub(sel));
      all.forEach(x => (x.kids || []).forEach(k => {
        ctx.strokeStyle = subs.has(k) && subs.has(x) ? t.blue : t['ink-2']; ctx.lineWidth = subs.has(k) ? 2.5 : 1.5;
        ctx.beginPath(); ctx.moveTo(x._x, x._y + BH / 2); ctx.lineTo(k._x, k._y - BH / 2); ctx.stroke();
      }));
      all.forEach(x => {
        let fill = t.card, stroke = t['ink-2'], ink = t.ink, lw = 1.5;
        if (subs.has(x)) { fill = t.dark ? '#1f2c46' : '#e6eefb'; }
        if (x === sel._p) { stroke = t.blue; lw = 3.5; }
        if ((sel.kids || []).includes(x)) { stroke = t.green; lw = 3.5; }
        if (x === sel) { fill = t.amber; stroke = t.amber; ink = '#111'; }
        ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = lw;
        rrect(ctx, x._x - BW / 2, x._y - BH / 2, BW, BH, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.font = '600 14px "Source Sans 3"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(x.name, x._x, x._y + 1);
      });
      hier.innerHTML = '<div class="hier-title">☰ Hierarchy</div>' + all.map(x =>
        `<div class="hier-row${x === sel ? ' on' : ''}" data-n="${x.name}" style="padding-left:${10 + x._d * 18}px">${x.kids ? '▾' : '&nbsp;&nbsp;'} ${x.kids ? '📁' : '🧊'} ${x.name}</div>`).join('');
      const p = sel._p, kids = sel.kids || [], sibs = p ? p.kids.filter(k => k !== sel) : [];
      info.innerHTML =
        `<div><b>${sel.name}</b> ${sel === scene ? '<span class="en">root</span> = kök' : ''}${!kids.length ? ' 🍃 <span class="en">leaf</span> = yaprak' : ''}</div>` +
        `<div>Ebeveyn <span class="en">parent</span>: <b class="c-blue">${p ? p.name : '— (kökün ebeveyni yok)'}</b></div>` +
        `<div>Çocuklar <span class="en">children</span>: <b class="c-green">${kids.map(k => k.name).join(', ') || '—'}</b></div>` +
        `<div>Kardeşler <span class="en">siblings</span>: ${sibs.map(k => k.name).join(', ') || '—'}</div>` +
        `<div>Derinlik <span class="en">depth</span> = <b>${sel._d}</b> <span class="mini">(köke kaç kenar uzakta)</span></div>` +
        `<div>Yükseklik <span class="en">height</span> = <b>${height(sel)}</b> <span class="mini">(en uzak yaprağa kaç kenar)</span></div>` +
        `<div>Alt ağaç boyutu <span class="en">subtree size</span> = <b>${sub(sel).length}</b></div>`;
    };
    hier.addEventListener('click', e => { const r = e.target.closest('.hier-row'); if (r) { sel = all.find(x => x.name === r.dataset.n); draw(); } });
    c.addEventListener('click', e => {
      const b = c.getBoundingClientRect(); const x = ((e.clientX - b.left) / b.width) * W, y = ((e.clientY - b.top) / b.height) * H;
      const hit = all.find(n => Math.abs(n._x - x) < BW / 2 && Math.abs(n._y - y) < BH / 2); if (hit) { sel = hit; draw(); }
    });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'terms' }, hier, c, info));
    SL.onTheme(draw); draw();
  };

  /* ---------- 3) Tank: ebeveyn–çocuk dönüşümleri (sahne grafiği) ---------- */
  D.tank = function (root) {
    const W = 640, H = 380;
    const c = el('canvas', { style: 'cursor:crosshair' }); const ctx = SL.setupCanvas(c, W, H);
    const s = { bx: 220, ba: 20, ta: 30, child: true, aim: false, tx: 560, ty: 70 };
    const info = el('div', { class: 'tank-info' });
    const rad = a => (a * Math.PI) / 180;
    const draw = () => {
      const t = T();
      if (s.aim) { // hedefe kilitlen: yerel açı = dünya açısı − ebeveyn açısı
        const px = s.child ? s.bx : 320, py = s.child ? 210 : 210;
        const world = (Math.atan2(s.ty - py, s.tx - px) * 180) / Math.PI;
        s.ta = Math.round(((world - (s.child ? s.ba : 0) + 540) % 360) - 180);
        taSlider.querySelector('input').value = s.ta; taSlider.querySelector('b').textContent = s.ta;
      }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = t.dark ? '#1d2b1d' : '#e3efd5'; ctx.fillRect(0, 0, W, H);
      ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎯', s.tx, s.ty);
      // gövde
      ctx.save(); ctx.translate(s.bx, 210); ctx.rotate(rad(s.ba));
      ctx.fillStyle = '#4a5a2a'; ctx.fillRect(-66, -44, 132, 14); ctx.fillRect(-66, 30, 132, 14);
      ctx.fillStyle = '#7b8f3e'; rrect(ctx, -60, -34, 120, 68, 10); ctx.fill(); ctx.strokeStyle = '#3b4720'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 12px "Source Sans 3"'; ctx.fillText('GÖVDE', -30, 0);
      if (s.child) drawTurret();
      ctx.restore();
      if (!s.child) { ctx.save(); ctx.translate(320, 210); drawTurret(); ctx.restore(); }
      function drawTurret() {
        ctx.save(); ctx.rotate(rad(s.ta));
        ctx.fillStyle = '#5c6e2c'; ctx.fillRect(10, -6, 74, 12); ctx.strokeStyle = '#2d3816'; ctx.strokeRect(10, -6, 74, 12);
        ctx.fillStyle = '#93a94c'; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '700 10px "Source Sans 3"'; ctx.fillText('TARET', 0, 0);
        ctx.restore();
      }
      const world = s.child ? s.ba + s.ta : s.ta;
      info.innerHTML = `<div class="hier-title">☰ Hierarchy</div>
        <div class="hier-row on">📁 Tank (Gövde) <span class="mini">konum x=${s.bx}, açı ${s.ba}°</span></div>
        <div class="hier-row" style="padding-left:${s.child ? 28 : 10}px">${s.child ? '└ ' : ''}📁 Taret <span class="mini">yerel açı ${s.ta}°</span></div>
        <div class="hier-row" style="padding-left:${s.child ? 46 : 28}px">└ 🧊 Namlu</div>
        <p style="margin-top:10px">Namlunun <b>dünya açısı</b> <span class="en">world rotation</span> =<br>${s.child ? `gövde ${s.ba}° + taret ${s.ta}° = ` : `taret ${s.ta}° = `}<b class="c-red">${world}°</b></p>
        <p class="mini">${s.child ? 'Taret, gövdenin çocuğu: gövde dönünce/ilerleyince taret de onunla gelir.' : '⚠️ Taret artık gövdenin çocuğu değil: gövde gidiyor, taret yerinde kalıyor!'}</p>`;
    };
    const taSlider = slider('Taret açısı (yerel)', -180, 180, s.ta, 1, v => { s.ta = v; s.aim = false; aimBox.checked = false; draw(); });
    const aimBox = el('input', { type: 'checkbox', onchange: e => { s.aim = e.target.checked; draw(); } });
    c.addEventListener('click', e => { const b = c.getBoundingClientRect(); s.tx = ((e.clientX - b.left) / b.width) * W; s.ty = ((e.clientY - b.top) / b.height) * H; draw(); });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      slider('Gövde x', 90, 550, s.bx, 1, v => { s.bx = v; draw(); }),
      slider('Gövde açısı', -180, 180, s.ba, 1, v => { s.ba = v; draw(); }), taSlider),
    el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, el('input', { type: 'checkbox', checked: '', onchange: e => { s.child = e.target.checked; draw(); } }), ' Taret, Gövde’nin çocuğu'),
      el('label', { class: 'ctl' }, aimBox, ' 🎯 Hedefe kilitlen (tıklayarak hedefi taşı)')),
    el('div', { class: 'tank' }, c, info));
    SL.onTheme(draw); draw();
  };

  /* ---------- 4) Davranış ağacı (behavior tree) ---------- */
  D.bt = function (root) {
    const W = 1180, H = 300, BW = 150, BH = 46;
    const tree = { t: 'sel', name: 'Ne yapayım?', kids: [
      { t: 'seq', name: 'Saldır', kids: [
        { t: 'cond', name: 'Düşman görünüyor?', f: s => s.enemy },
        { t: 'cond', name: 'Can > %30?', f: s => s.hp > 30 },
        { t: 'cond', name: 'Mermi var?', f: s => s.ammo },
        { t: 'act', name: 'Ateş et! 🔫' }] },
      { t: 'seq', name: 'Kaç', kids: [
        { t: 'cond', name: 'Düşman görünüyor?', f: s => s.enemy },
        { t: 'act', name: 'Siper al 🛡️' }] },
      { t: 'act', name: 'Devriye gez 🚶' }] };
    const all = layoutNary(tree, W, H, { mx: 90, top: 30, bottom: 30 });
    all.forEach((x, i) => (x.id = i));
    const c = el('canvas'); const ctx = SL.setupCanvas(c, W, H);
    const st = { enemy: true, hp: 70, ammo: true };
    const note = el('div', { class: 'sv-note tree-note' });
    const bubble = el('div', { class: 'bt-bubble' });
    const draw = f => {
      const t = T();
      ctx.clearRect(0, 0, W, H);
      all.forEach(x => (x.kids || []).forEach(k => {
        const on = f.state[k.id] && f.state[x.id];
        ctx.strokeStyle = on ? t.amber : t['ink-2']; ctx.lineWidth = on ? 3 : 1.5; ctx.globalAlpha = on ? 1 : 0.6;
        ctx.beginPath(); ctx.moveTo(x._x, x._y + BH / 2); ctx.lineTo(k._x, k._y - BH / 2); ctx.stroke(); ctx.globalAlpha = 1;
      }));
      all.forEach(x => {
        const s = f.state[x.id];
        const col = s === 'run' ? t.amber : s === 'ok' ? t.green : s === 'fail' ? t.red : null;
        ctx.fillStyle = col || t.card; ctx.strokeStyle = col || t['ink-2']; ctx.lineWidth = 2;
        const w = x.t === 'cond' || x.t === 'act' ? BW - 10 : BW;
        rrect(ctx, x._x - w / 2, x._y - BH / 2, w, BH, x.t === 'cond' ? 22 : 8); ctx.fill(); ctx.stroke();
        const icon = { sel: '? ', seq: '→ ', cond: '◇ ', act: '' }[x.t];
        ctx.fillStyle = col ? (s === 'run' ? '#111' : '#fff') : t.ink;
        ctx.font = `${x.t === 'cond' ? 'italic ' : ''}700 ${x.t === 'sel' || x.t === 'seq' ? 16 : 14}px "Source Sans 3"`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(icon + x.name, x._x, x._y + 1);
        if (x.t === 'sel' || x.t === 'seq') { ctx.fillStyle = t.muted; ctx.font = '600 11px "JetBrains Mono"'; ctx.fillText(x.t === 'sel' ? 'Selector (Seçici)' : 'Sequence (Dizi)', x._x, x._y - BH / 2 - 9); }
      });
      note.textContent = f.note;
      bubble.innerHTML = f.decision ? `💂 NPC: <b>${f.decision}</b>` : '💂 NPC: <i>düşünüyor…</i>';
    };
    const fp = new SL.FramePlayer(draw, { speed: 2 });
    const tick = () => {
      const frames = [], state = {};
      const F = (note, decision) => frames.push({ state: Object.assign({}, state), note, decision });
      F('TICK! Ağaç, kökten başlayarak derinlik öncelikli (preorder) gezilir.');
      let decision = null;
      const ev = x => {
        state[x.id] = 'run';
        if (x.t === 'cond') { const ok = x.f(st); F(`Koşul “${x.name}” → ${ok ? 'EVET (başarılı)' : 'HAYIR (başarısız)'}`); state[x.id] = ok ? 'ok' : 'fail'; F(`“${x.name}” ${ok ? 'başarılı ✔' : 'başarısız ✘'}`); return ok; }
        if (x.t === 'act') { decision = x.name; state[x.id] = 'ok'; F(`Eylem “${x.name}” çalıştırıldı ✔`, decision); return true; }
        F(x.t === 'sel' ? `Seçici “${x.name}”: çocukları SOLDAN SAĞA dene, biri başarılı olunca DUR` : `Dizi “${x.name}”: çocukları sırayla çalıştır, biri başarısız olunca DUR`);
        for (const k of x.kids) {
          const ok = ev(k);
          if (x.t === 'sel' && ok) { state[x.id] = 'ok'; F(`Seçici: “${k.name}” başarılı → kalan çocuklara bakılmaz ✔`, decision); return true; }
          if (x.t === 'seq' && !ok) { state[x.id] = 'fail'; F(`Dizi “${x.name}”: bir adım başarısız → dizi BAŞARISIZ ✘`); return false; }
        }
        state[x.id] = x.t === 'seq' ? 'ok' : 'fail';
        F(x.t === 'seq' ? `Dizi “${x.name}”: tüm adımlar başarılı ✔` : `Seçici: hiçbir çocuk başarılı olmadı ✘`, decision);
        return x.t === 'seq';
      };
      ev(tree);
      F(`Karar: ${decision}. (Oyun bunu her karede ya da birkaç karede bir tekrarlar.)`, decision);
      fp.load(frames); fp.play();
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      el('label', { class: 'ctl' }, el('input', { type: 'checkbox', checked: '', onchange: e => { st.enemy = e.target.checked; tick(); } }), ' 👀 Düşman görünüyor'),
      slider('❤️ Can %', 0, 100, st.hp, 5, v => { st.hp = v; }),
      el('label', { class: 'ctl' }, el('input', { type: 'checkbox', checked: '', onchange: e => { st.ammo = e.target.checked; tick(); } }), ' 🔫 Mermi var'),
      btn('⚡ Tick!', tick, 'primary'), bubble),
    c, SL.transport(fp, { min: 0.3, max: 8 }), note);
    root.querySelector('input[type=range]').addEventListener('change', tick);
    SL.onTheme(() => fp.render());
    fp.load([{ state: {}, note: '⚡ Tick! ile NPC’nin bu karedeki kararını adım adım izleyin.', decision: null }]);
    return { stop: () => fp.pause() };
  };




  /* ---------- 8) Ekleme sırası → ağacın şekli ---------- */
  D.bstshape = function (root) {
    let N = 15, rightKind = 'sorted', randOrder = [];
    const mk = () => { const c = el('canvas'); const tv = new SL.TreeView(c, 570, 300, { maxSp: 40, maxR: 15 }); return { c, tv, info: el('div', { class: 'mini shape-info' }) }; };
    const L = mk(), R = mk();
    const orderOf = kind => {
      const a = Array.from({ length: N }, (_, i) => i + 1);
      if (kind === 'sorted') return a;
      if (kind === 'reversed') return a.reverse();
      if (kind === 'zigzag') { const o = []; let lo = 1, hi = N; while (lo <= hi) { o.push(lo++); if (lo <= hi) o.push(hi--); } return o; }
      if (kind === 'balanced') { const o = [], q = [[1, N]]; while (q.length) { const [l, h] = q.shift(); if (l > h) continue; const m = (l + h) >> 1; o.push(m); q.push([l, m - 1], [m + 1, h]); } return o; }
      return randOrder;
    };
    const build = (side, order) => {
      const m = new SL.BSTModel(); order.forEach(k => m.insertSilent(k));
      const snap = m.snap(); side.tv.show({ root: snap, hl: {} }, false);
      const s = SL.treeStats(snap);
      side.info.innerHTML = `Ekleme sırası: <b>${order.slice(0, 18).join(' ')}${order.length > 18 ? ' …' : ''}</b><br>yükseklik = <b>${s.h}</b> · ortalama derinlik = <b>${s.avg.toFixed(2)}</b> · en iyi olası yükseklik ⌊lg N⌋ = ${Math.floor(Math.log2(N))}`;
    };
    const all = () => { if (randOrder.length !== N) randOrder = SL.shuffle(Array.from({ length: N }, (_, i) => i + 1)); build(L, randOrder); build(R, orderOf(rightKind)); };
    root.append(el('div', { class: 'sv-controls' },
      slider('N =', 3, 63, N, 1, v => { N = v; randOrder = []; all(); }),
      btn('🎲 Yeni rastgele sıra', () => { randOrder = []; all(); }),
      el('label', { class: 'ctl' }, 'Sağdaki sıra ', select({ sorted: 'sıralı 1, 2, 3, …', reversed: 'ters N, …, 2, 1', zigzag: 'zikzak 1, N, 2, N−1…', balanced: 'dengeli (ortanca önce)' }, rightKind, v => { rightKind = v; all(); }))),
    el('div', { class: 'shape-grid' },
      el('div', null, el('div', { class: 'race-title' }, '🎲 Rastgele sıra'), L.c, L.info),
      el('div', null, el('div', { class: 'race-title' }, '⚠️ Seçilen sıra'), R.c, R.info)));
    all();
  };

  /* ---------- 9) Deney: rastgele BST'de ortalama derinlik ---------- */
  D.depthexp = function (root) {
    const tbl = el('table', { class: 'dbl-t' });
    let busy = false;
    const build = N => {
      const keys = new Int32Array(N); for (let i = 0; i < N; i++) keys[i] = i;
      for (let i = N - 1; i > 0; i--) { const r = rint(i + 1); const t = keys[i]; keys[i] = keys[r]; keys[r] = t; }
      const left = new Int32Array(N).fill(-1), right = new Int32Array(N).fill(-1);
      let sum = 0, h = 0;
      for (let i = 1; i < N; i++) {
        let x = 0, d = 1; const k = keys[i];
        for (;;) {
          if (k < keys[x]) { if (left[x] < 0) { left[x] = i; break; } x = left[x]; }
          else { if (right[x] < 0) { right[x] = i; break; } x = right[x]; }
          d++;
        }
        sum += d; if (d > h) h = d;
      }
      return { avg: (sum + 0) / N + 1, h };   // ortalama karşılaştırma = ortalama derinlik + 1
    };
    const run = async () => {
      if (busy) return; busy = true;
      tbl.innerHTML = '<tr><th>N</th><th>lg N<br><span class="mini">mükemmel dengeli</span></th><th>ölçülen ort.<br>karşılaştırma</th><th>formül<br>~2 ln N</th><th>ölçülen<br>yükseklik</th><th>sıralı eklemede<br>yükseklik</th></tr>';
      for (const N of [100, 1000, 10000, 100000, 1000000]) {
        await new Promise(r => setTimeout(r, 30));
        const trials = N <= 10000 ? 20 : N <= 100000 ? 4 : 1;
        let a = 0, h = 0;
        for (let t = 0; t < trials; t++) { const r = build(N); a += r.avg; h += r.h; }
        tbl.insertAdjacentHTML('beforeend', `<tr><td>${fmt(N)}</td><td>${Math.log2(N).toFixed(1)}</td><td><b>${(a / trials).toFixed(1)}</b></td><td>${(2 * Math.log(N)).toFixed(1)}</td><td><b>${(h / trials).toFixed(0)}</b></td><td class="c-red">${fmt(N - 1)}</td></tr>`);
      }
      busy = false;
    };
    root.append(el('div', { class: 'sv-controls' }, btn('🧪 Deneyi başlat', run, 'primary'), el('span', { class: 'mini' }, 'Rastgele sırayla N anahtar ekleyip ağacı ölçer (bu bilgisayarda, şimdi).')), tbl);
  };

  /* ---------- 10) Quadtree: uzaysal arama ---------- */
  D.quadtree = function (root) {
    const W = 1180, H = 430;
    const c = el('canvas', { style: 'cursor:none' }); const ctx = SL.setupCanvas(c, W, H);
    let N = 400, R = 80, showGrid = true, pts = [], qt, running = false, raf, t0 = 0, mouse = null;
    const stat = el('div', { class: 'sv-counters' });
    class QT {
      constructor(x, y, w, h, d) { this.x = x; this.y = y; this.w = w; this.h = h; this.d = d; this.p = []; this.k = null; }
      add(pt) {
        if (pt.x < this.x || pt.x >= this.x + this.w || pt.y < this.y || pt.y >= this.y + this.h) return false;
        if (!this.k && (this.p.length < 4 || this.d > 9)) { this.p.push(pt); return true; }
        if (!this.k) { const hw = this.w / 2, hh = this.h / 2; this.k = [new QT(this.x, this.y, hw, hh, this.d + 1), new QT(this.x + hw, this.y, hw, hh, this.d + 1), new QT(this.x, this.y + hh, hw, hh, this.d + 1), new QT(this.x + hw, this.y + hh, hw, hh, this.d + 1)]; const old = this.p; this.p = []; old.forEach(q => this.k.some(k => k.add(q))); }
        return this.k.some(k => k.add(pt));
      }
      query(cx, cy, r, res) {
        const nx = Math.max(this.x, Math.min(cx, this.x + this.w)), ny = Math.max(this.y, Math.min(cy, this.y + this.h));
        if ((nx - cx) ** 2 + (ny - cy) ** 2 > r * r) return;
        res.nodes++;
        this.p.forEach(q => { res.checked.push(q); if ((q.x - cx) ** 2 + (q.y - cy) ** 2 <= r * r) res.hit.push(q); });
        if (this.k) this.k.forEach(k => k.query(cx, cy, r, res));
      }
      draw(ctx) { ctx.strokeRect(this.x, this.y, this.w, this.h); if (this.k) this.k.forEach(k => k.draw(ctx)); }
    }
    const build = () => {
      pts = [];
      for (let i = 0; i < N; i++) { // kümeli dağılım: köyler + dağınık
        const cl = Math.random() < 0.6; const cx = cl ? [250, 800, 1000][i % 3] : 0;
        pts.push(cl ? { x: Math.max(1, Math.min(W - 2, cx + (Math.random() - 0.5) * 260)), y: Math.max(1, Math.min(H - 2, [120, 300, 160][i % 3] + (Math.random() - 0.5) * 200)) } : { x: Math.random() * W, y: Math.random() * H });
      }
      qt = new QT(0, 0, W, H, 0); pts.forEach(p => qt.add(p));
    };
    const frame = () => {
      const t = T();
      const q = mouse || { x: W / 2 + Math.cos(t0 * 0.7) * 420, y: H / 2 + Math.sin(t0 * 1.3) * 150 };
      ctx.clearRect(0, 0, W, H);
      if (showGrid) { ctx.strokeStyle = t.rule; ctx.lineWidth = 1; qt.draw(ctx); }
      const res = { nodes: 0, checked: [], hit: [] };
      qt.query(q.x, q.y, R, res);
      const chk = new Set(res.checked), hit = new Set(res.hit);
      pts.forEach(p => { ctx.fillStyle = hit.has(p) ? t.red : chk.has(p) ? t.amber : t.muted; ctx.beginPath(); ctx.arc(p.x, p.y, hit.has(p) ? 4.5 : 3, 0, 7); ctx.fill(); });
      ctx.strokeStyle = t.blue; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(q.x, q.y, R, 0, 7); ctx.stroke();
      ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🧙', q.x, q.y);
      stat.innerHTML = `<span class="cnt swp"><b>${res.hit.length}</b> düşman menzilde</span>` +
        `<span class="cnt cmp">quadtree: <b>${res.checked.length}</b> mesafe kontrolü (${res.nodes} kutu)</span>` +
        `<span class="cnt">kaba kuvvet: <b>${N}</b> mesafe kontrolü</span>`;
    };
    const loop = () => { if (!running) return; t0 += 0.016; frame(); raf = requestAnimationFrame(loop); };
    c.addEventListener('mousemove', e => { const b = c.getBoundingClientRect(); mouse = { x: ((e.clientX - b.left) / b.width) * W, y: ((e.clientY - b.top) / b.height) * H }; if (!running) frame(); });
    c.addEventListener('mouseleave', () => { mouse = null; });
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' },
      slider('Düşman N =', 50, 3000, N, 50, v => { N = v; build(); frame(); }),
      slider('Menzil', 30, 200, R, 5, v => { R = v; frame(); }),
      el('label', { class: 'ctl' }, el('input', { type: 'checkbox', checked: '', onchange: e => { showGrid = e.target.checked; frame(); } }), ' quadtree kutularını göster'),
      btn('⏯ Oynat/Durdur', () => (running ? api.stop() : api.start())), btn('▶| Tek kare', () => { api.stop(); t0 += 0.1; frame(); })),
    c, stat);
    build(); frame();
    const api = { start() { if (!running) { running = true; loop(); } }, stop() { running = false; cancelAnimationFrame(raf); } };
    return api;
  };
})();
