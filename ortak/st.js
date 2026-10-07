/* =====================================================================
   st.js — Sembol tablosu uygulamaları (core.js gerekir)
   Demolar: freq (kelime sıklığı + Zipf), lookup (CSV sözlük / yerelleştirme),
            invindex (ters dizin + küme kesişimi), sparse (seyrek matris),
            markov (Markov zinciriyle NPC repliği üretme)
   Bileşen: .stlab (kelime sayma / ters dizin kurma)
   ===================================================================== */
(function () {
  'use strict';
  const { el, fmt, slider, btn, select } = SL;
  const D = (window.DEMOS = window.DEMOS || {});
  const T = () => SL.theme();
  const rint = n => Math.floor(Math.random() * n);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const SAGA = `Ejderha dağın tepesinde uyuyordu. Köylüler ejderhadan korkuyordu ama genç şövalye korkmuyordu. Şövalye kılıcını aldı ve dağa yürüdü. Yolda bir büyücü gördü. Büyücü şövalyeye bir iksir verdi ve dedi ki iksir seni ateşten korur. Şövalye iksiri içti ve dağa tırmandı. Dağın tepesinde ejderha uyandı. Ejderha ateş püskürdü ama şövalye yanmadı çünkü iksir onu korudu. Şövalye kılıcını kaldırdı ve ejderhaya saldırdı. Ejderha kanatlarını açtı ve uçtu. Şövalye ejderhanın arkasından koştu ama ejderha çok hızlıydı. Köye dönen şövalye köylülere ejderhanın gittiğini söyledi. Köylüler sevindi ve şövalye için bir şölen verdi. Büyücü şölende şövalyeye yeni bir görev verdi. Görev çok zordu ama şövalye korkmuyordu. Şövalye yeni bir kılıç aldı ve yola çıktı.`;
  const words = (text, minLen) => text.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü\s]/g, ' ').split(/\s+/).filter(w => w.length >= minLen);

  /* ---------- kelime sıklığı ---------- */
  D.freq = function (root) {
    const ta = el('textarea', { class: 'st-text', rows: 5 }); ta.value = SAGA;
    let minLen = 1;
    const out = el('div', { class: 'cols', style: 'margin-top:6px' });
    const c = el('canvas'), ctx = SL.setupCanvas(c, 520, 220);
    const run = () => {
      const ws = words(ta.value, minLen), st = new Map();
      for (const w of ws) st.set(w, (st.get(w) || 0) + 1);
      const top = [...st.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      out.innerHTML = `<div><div class="sv-counters"><span class="cnt">kelime <b>${fmt(ws.length)}</b></span><span class="cnt">farklı kelime (tablodaki anahtar) <b>${fmt(st.size)}</b></span></div><table class="sum-t" style="font-size:18px"><tr><th>sıra</th><th>kelime</th><th>sayı</th></tr>${top.slice(0, 8).map(([w, n], i) => `<tr><td>${i + 1}</td><td><b>${esc(w)}</b></td><td>${n}</td></tr>`).join('')}</table></div>`;
      out.append(el('div', null, c, el('div', { class: 'mini' }, 'Sıklık (yükseklik) ve sıra: ilk birkaç kelime çok sık, sonra uzun bir “kuyruk” — Zipf yasası.')));
      const t = T(); ctx.clearRect(0, 0, 520, 220);
      const n = Math.min(40, top.length), mx = top.length ? top[0][1] : 1, bw = 500 / Math.max(1, n);
      for (let i = 0; i < n; i++) { const h = (top[i][1] / mx) * 190; ctx.fillStyle = i < 3 ? t.amber : t.blue; ctx.fillRect(10 + i * bw + 1, 205 - h, bw - 2, h); }
      ctx.strokeStyle = t.rule; ctx.beginPath(); ctx.moveTo(8, 206); ctx.lineTo(512, 206); ctx.stroke();
    };
    ta.addEventListener('input', run);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, slider('En az harf', 1, 8, minLen, 1, v => { minLen = v; run(); }), btn('↺ Hikâyeye dön', () => { ta.value = SAGA; run(); })), ta, out);
    run(); SL.onTheme(run);
  };

  /* ---------- CSV sözlük / yerelleştirme ---------- */
  const CSV = `anahtar,tr,en,de
menu.play,Oyna,Play,Spielen
menu.quit,Çıkış,Quit,Beenden
menu.options,Ayarlar,Options,Optionen
hud.health,Can,Health,Leben
hud.ammo,Mermi,Ammo,Munition
item.sword,Kılıç,Sword,Schwert
item.potion,İksir,Potion,Trank
item.shield,Kalkan,Shield,Schild
npc.greet,Merhaba yolcu!,Hello traveler!,Hallo Reisender!
npc.bye,Yolun açık olsun.,Safe travels.,Gute Reise.
quest.dragon,Ejderhayı yen,Defeat the dragon,Besiege den Drachen`;
  D.lookup = function (root) {
    const rows = CSV.split('\n').map(r => r.split(','));
    const headR = rows[0], data = rows.slice(1);
    let kc = 0, vc = 1;
    const out = el('div'), qin = el('input', { type: 'text', class: 'key-in', size: 14, value: 'npc.greet' });
    const table = () => `<table class="sum-t st-csv" style="font-size:16px"><tr>${headR.map((h, i) => `<th class="${i === kc ? 'k' : i === vc ? 'v' : ''}">${h}</th>`).join('')}</tr>${data.map(r => `<tr>${r.map((x, i) => `<td class="${i === kc ? 'k' : i === vc ? 'v' : ''}">${esc(x)}</td>`).join('')}</tr>`).join('')}</table>`;
    const run = () => {
      const st = new Map(); let dup = 0;
      data.forEach(r => { if (st.has(r[kc])) dup++; st.set(r[kc], r[vc]); });
      const q = qin.value.trim(), ans = st.has(q) ? st.get(q) : null;
      out.innerHTML = `<div class="cols" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)"><div>${table()}</div><div><p>Sembol tablosu: <b>${headR[kc]}</b> → <b>${headR[vc]}</b> (${st.size} anahtar)</p>` +
        `<p class="lead">get("${esc(q)}") → ${ans != null ? `<b class="c-green">${esc(ans)}</b>` : '<b class="c-red">null</b> (yok)'}</p>` +
        (dup ? `<div class="box warn"><span class="bt">⚠️ ${dup} anahtar tekrar etti!</span>Aynı anahtar ikinci kez <code>put</code> edilince eski değer <b>ezildi</b>. Anahtar sütunu <b>benzersiz</b> olmalı.</div>` : '') + '</div></div>';
    };
    qin.addEventListener('input', run);
    const opts = Object.fromEntries(headR.map((h, i) => [i, h]));
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Anahtar sütunu ', select(opts, '0', v => { kc = +v; run(); })), el('label', { class: 'ctl' }, 'Değer sütunu ', select(opts, '1', v => { vc = +v; run(); })), el('label', { class: 'ctl' }, 'Ara ', qin)), out);
    run();
  };

  /* ---------- ters dizin ---------- */
  const ITEMS = { 'Ateş Kılıcı': ['silah', 'ateş', 'efsanevi', 'yakın'], 'Buz Asası': ['silah', 'buz', 'büyü', 'uzak'], 'Ejder Kalkanı': ['zırh', 'ateş', 'efsanevi'], 'Gölge Hançeri': ['silah', 'gizlilik', 'yakın'], 'Alev Oku': ['silah', 'ateş', 'uzak'], 'Kar Botları': ['zırh', 'buz'], 'Can İksiri': ['iksir', 'iyileşme'], 'Ateşe Dayanıklılık İksiri': ['iksir', 'ateş', 'koruma'], 'Yıldırım Asası': ['silah', 'büyü', 'uzak', 'efsanevi'], 'Pelerin': ['zırh', 'gizlilik'] };
  D.invindex = function (root) {
    const idx = new Map();
    for (const [name, tags] of Object.entries(ITEMS)) for (const t of tags) { if (!idx.has(t)) idx.set(t, new Set()); idx.get(t).add(name); }
    const tags = [...idx.keys()].sort((a, b) => a.localeCompare(b, 'tr'));
    let A = 'ateş', B = 'silah';
    const out = el('div');
    const run = () => {
      const sa = idx.get(A), sb = B === '-' ? null : idx.get(B);
      const res = sb ? [...sa].filter(x => sb.has(x)) : [...sa];
      out.innerHTML = `<div class="cols" style="grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)"><div><div class="mini"><b>Ters dizin</b> (etiket → eşya kümesi):</div><table class="sum-t st-idx" style="font-size:15px">${tags.map(t => `<tr class="${t === A || t === B ? 'on' : ''}"><td><b>${t}</b></td><td>${[...idx.get(t)].join(', ')}</td></tr>`).join('')}</table></div>` +
        `<div><p class="lead">“${A}”${sb ? ` <b>VE</b> “${B}”` : ''} → <b class="c-green">${res.length}</b> eşya</p><div class="ll-chips">${res.map(x => `<span class="ll-chip">${x}</span>`).join('') || '<span class="mini">(yok)</span>'}</div>` +
        `<p class="mini" style="margin-top:10px">Dizinsiz: ${Object.keys(ITEMS).length} eşyanın hepsinin etiket listesine bakmak gerekirdi. Dizinle: iki küme al, <b>kesişimini</b> bul (küçük kümedeki her eleman için büyükte “var mı?” → hash ile O(1)).</p></div></div>`;
    };
    const o = Object.fromEntries(tags.map(t => [t, t]));
    root.append(el('div', { class: 'sv-controls' }, el('label', { class: 'ctl' }, 'Etiket 1 ', select(o, A, v => { A = v; run(); })), el('label', { class: 'ctl' }, 'VE etiket 2 ', select(Object.assign({ '-': '(yok)' }, o), B, v => { B = v; run(); }))), out);
    run();
  };

  /* ---------- seyrek matris ---------- */
  D.sparse = function (root) {
    const G = 48, W = 480;
    const c = el('canvas'), ctx = SL.setupCanvas(c, W, W);
    let dens = 0.03, cells = [];
    const info = el('div');
    const gen = () => { cells = []; for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) if (Math.random() < dens) cells.push([i, j, 1 + rint(9)]); draw(); };
    const draw = () => {
      const t = T(), s = W / G; ctx.clearRect(0, 0, W, W);
      ctx.strokeStyle = t.rule; ctx.lineWidth = 0.5;
      for (let i = 0; i <= G; i += 4) { ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, W); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(W, i * s); ctx.stroke(); }
      cells.forEach(([i, j, v]) => { ctx.fillStyle = `hsl(${30 + v * 12},85%,${t.dark ? 60 : 45}%)`; ctx.fillRect(j * s + 0.5, i * s + 0.5, s - 1, s - 1); });
      const N = G * G, nnz = cells.length;
      const big = 100000, bnnz = Math.round(big * 10);
      info.innerHTML = `<table class="sum-t" style="font-size:18px"><tr><th></th><th>yoğun (2B dizi)</th><th>seyrek (sembol tablosu)</th></tr>` +
        `<tr><td>bellek (${G}×${G})</td><td>${fmt(N)} hücre</td><td class="c-green"><b>${fmt(nnz)}</b> kayıt</td></tr>` +
        `<tr><td>matris × vektör (${G}×${G})</td><td>${fmt(N)} çarpma</td><td class="c-green"><b>${fmt(nnz)}</b> çarpma</td></tr>` +
        `<tr><td>100.000 × 100.000, satır başına ~10 dolu</td><td class="c-red">10 milyar hücre (~80 GB)</td><td class="c-green"><b>${fmt(bnnz)}</b> kayıt (~birkaç on MB)</td></tr></table>` +
        `<p class="mini">Doluluk %${(dens * 100).toFixed(1)}: ${fmt(N)} hücrenin sadece ${fmt(nnz)} tanesi sıfırdan farklı.</p>`;
    };
    root.append(el('div', { class: 'sv-controls' }, slider('Doluluk %', 1, 40, dens * 100, 1, v => { dens = v / 100; gen(); }), btn('🎲 Yeni harita', gen)), el('div', { class: 'geo-row' }, c, el('div', { style: 'flex:1;min-width:0' }, info)));
    gen(); SL.onTheme(draw);
  };

  /* ---------- Markov zinciri ---------- */
  const BARKS = `Hey sen! Burada ne arıyorsun? Burası benim bölgem. Git buradan yoksa pişman olursun. Hey yolcu! Kılıcın çok güzel görünüyor. Kılıcını bana ver yoksa pişman olursun. Burada ejderha var, dikkatli ol yolcu. Ejderha geceleri uyanır ve köye saldırır. Köye saldıran ejderha her şeyi yakar. Dikkatli ol, geceleri burası çok tehlikeli. Burası çok sessiz, bu hiç iyi değil. Bu kılıç benim babamındı. Babam ejderha avcısıydı. Ejderha avcısı olmak çok tehlikeli. Git ve ejderhayı bul. Ejderhayı bulursan köye dön.`;
  D.markov = function (root) {
    const ws = BARKS.split(/\s+/).filter(Boolean);
    let K = 1, st, out = [], frames;
    const view = el('div', { class: 'mk-out' }), table = el('div'), note = el('div', { class: 'sv-note tree-note' });
    const build = () => { st = new Map(); for (let i = 0; i + K < ws.length; i++) { const key = ws.slice(i, i + K).join(' '); if (!st.has(key)) st.set(key, []); st.get(key).push(ws[i + K]); } };
    const fp = new SL.FramePlayer(f => {
      view.innerHTML = f.out.map((w, i) => `<span class="${i >= f.out.length - K ? 'mk-key' : ''}${i === f.out.length - 1 && f.pick ? ' mk-new' : ''}">${esc(w)}</span>`).join(' ');
      table.innerHTML = f.key != null ? `<div class="mini">Sembol tablosu: <b>get("${esc(f.key)}")</b> → olası sonraki kelimeler:</div><div class="ll-chips">${(st.get(f.key) || []).map((w, i) => `<span class="ll-chip ${i === f.pi ? 'cur' : ''}">${esc(w)}</span>`).join('') || '<span class="mini">(yok — zincir bitti)</span>'}</div>` : '';
      note.textContent = f.note;
    }, { speed: 2 });
    const gen = () => {
      build();
      const starts = [...st.keys()].filter(k => /^[A-ZÇĞİÖŞÜ]/.test(k));
      let cur = starts[rint(starts.length)].split(' ');
      out = cur.slice(); frames = [{ out: out.slice(), key: null, note: `Başlangıç: “${cur.join(' ')}” (büyük harfle başlayan rastgele bir anahtar). Tabloda ${st.size} anahtar var.` }];
      for (let n = 0; n < 24; n++) {
        const key = out.slice(-K).join(' '), nexts = st.get(key);
        if (!nexts) { frames.push({ out: out.slice(), key, note: `“${key}” tabloda yok → metin bitti.` }); break; }
        const pi = rint(nexts.length), w = nexts[pi];
        frames.push({ out: out.slice(), key, pi: -1, note: `Son ${K} kelime “${key}” → tabloya sor: ${nexts.length} aday` });
        out.push(w);
        frames.push({ out: out.slice(), key, pi, pick: true, note: `Rastgele seçildi: “${w}”` + (nexts.filter(x => x === w).length > 1 ? ` (bu aday ${nexts.filter(x => x === w).length} kez geçiyor → seçilme şansı daha yüksek)` : '') });
        if (/[.!?]$/.test(w) && n > 6) break;
      }
      fp.load(frames); fp.play();
    };
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('🗣️ Yeni replik üret', gen, 'primary'), el('label', { class: 'ctl' }, 'Önek uzunluğu ', select({ 1: '1 kelime', 2: '2 kelime' }, '1', v => { K = +v; gen(); }))), view, table, SL.transport(fp, { min: 0.3, max: 10 }), note);
    gen(); fp.pause(); fp.toEnd();
    return { stop: () => fp.pause() };
  };

  /* ---------- .stlab ---------- */
  const PY_ST = `
import json
def _run(cases):
    res = []
    for items in cases:
        try:
            r = build_index(items)
            if not isinstance(r, dict):
                res.append([None, "dict yerine " + type(r).__name__ + " döndü"]); continue
            res.append([{k: sorted(v) for k, v in r.items()}, None])
        except BaseException as e:
            res.append([None, type(e).__name__ + ": " + str(e)])
    return json.dumps(res, ensure_ascii=False)
`;
  SL.STLab = function (root) {
    const task = root.dataset.task || 'count';
    const shell = SL.labShell(root);
    const view = el('div', { class: 'll-lab-view' });
    shell.right.append(view, shell.msg, shell.out);
    const pool = 'ork goblin trol ork ejder ork goblin slime trol ork golem slime'.split(' ');
    shell.onRun = async () => {
      shell.clearOut();
      const code = shell.cm.getValue();
      if (task === 'count') {
        let fn;
        try { fn = new Function('print', '__g', '"use strict";\n' + SL.guardLoops(code) + "\n;if (typeof countWords !== 'function') throw new Error(\"Kodda 'countWords(words)' fonksiyonu bulunamadı.\"); return countWords;")(shell.print, SL.makeGuard(200000)); }
        catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
        const cs = [[], ['ork'], pool.slice()]; for (let t = 0; t < 30; t++) cs.push(Array.from({ length: rint(30) }, () => pool[rint(pool.length)]));
        for (const c of cs) {
          const want = {}; c.forEach(w => (want[w] = (want[w] || 0) + 1));
          let got; try { got = fn(c.slice()); } catch (e) { view.innerHTML = `<div class="mini">Girdi: ${c.join(' ') || '(boş)'}</div>`; shell.setMsg('err', '⚠️ ' + SL.jsErrorText(e)); return; }
          if (got instanceof Map) got = Object.fromEntries(got);
          const norm = o => JSON.stringify(Object.keys(o || {}).sort().map(k => [k, o[k]]));
          if (norm(got) !== norm(want)) { view.innerHTML = `<div class="mini">Girdi: <b>${c.join(' ') || '(boş)'}</b></div><div class="mini">beklenen: ${esc(JSON.stringify(want))}</div><div class="mini c-red">seninki: ${esc(JSON.stringify(got, (k, v) => (Number.isNaN(v) ? 'NaN' : v)))}</div>`; shell.setMsg('err', '❌ Test başarısız.'); return; }
        }
        view.innerHTML = `<div class="mini">Örnek: ${pool.join(' ')} → ${esc(JSON.stringify(Object.fromEntries([...new Map(pool.map(w => [w, pool.filter(x => x === w).length]))])))}</div>`;
        shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
        return;
      }
      // build_index (Python)
      const names = Object.keys(ITEMS);
      const cs = [{}, { 'Kılıç': ['silah'] }, ITEMS];
      for (let t = 0; t < 15; t++) { const o = {}; SL.shuffle(names.slice()).slice(0, 1 + rint(6)).forEach(n => (o[n] = ITEMS[n].slice())); cs.push(o); }
      shell.setMsg('', '…');
      let py;
      try { py = await SL.loadPython(t => shell.setMsg('', t)); } catch (e) { shell.setMsg('err', '⚠️ ' + e.message); return; }
      py.setStdout({ batched: s => shell.print(s) });
      try { py.runPython(PY_ST); py.runPython(code); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
      py.globals.set('_cases', py.toPy(cs));
      let res; try { res = JSON.parse(py.runPython('_run(_cases)')); } catch (e) { shell.setMsg('err', '⚠️ Hata: ' + SL.pyErrorText(e.message)); return; }
      const wantOf = items => { const w = {}; for (const [n, tags] of Object.entries(items)) for (const t of tags) (w[t] = w[t] || []).push(n); for (const k in w) w[k].sort(); return w; };
      const norm = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
      for (let i = 0; i < cs.length; i++) {
        const want = wantOf(cs[i]);
        if (res[i][1] || norm(res[i][0]) !== norm(want)) {
          view.innerHTML = `<div class="mini">Girdi: ${esc(JSON.stringify(cs[i]))}</div><div class="mini">beklenen: ${esc(JSON.stringify(want))}</div><div class="mini c-red">seninki: ${res[i][1] ? '⚠️ ' + esc(SL.pyErrorText(res[i][1])) : esc(JSON.stringify(res[i][0]))}</div>`;
          shell.setMsg('err', '❌ Test başarısız.'); return;
        }
      }
      view.innerHTML = '<div class="mini">Örnek eşya listesi dahil 18 test.</div>';
      shell.setMsg('ok', `✅ ${cs.length}/${cs.length} test geçti!`);
    };
    if (shell.lang !== 'python') shell.run(); else shell.setMsg('', 'Python kodu için ▶ Çalıştır’a basın (Ctrl+Enter).');
    return { refresh: shell.refresh };
  };
  SL.register('.stlab', SL.STLab);
})();
