/* "Sonlu Durum Makineleri" sunumuna özel demolar (ortak: ../ortak/oyunai.js) */
(function () {
  'use strict';
  const { el, btn, slider, select } = SL;
  const D = window.DEMOS, V = SL.V;
  const T = () => SL.theme();
  const NAMES = { DEVRIYE: 'DEVRİYE', SUPHE: 'ŞÜPHE', KOVALA: 'KOVALA', SALDIR: 'SALDIR', KAC: 'KAÇ' };
  const COLS = t => ({ DEVRIYE: t.blue, SUPHE: t.amber, KOVALA: t.red, SALDIR: t.purple, KAC: t.green });

  /* referans geçiş fonksiyonu (laboratuvarlarda da beklenen davranış) */
  const refNext = (state, s, exitDist = 90) => {
    if (s.hp < 30 && state !== 'KAC') return 'KAC';                 // her durumdan
    switch (state) {
      case 'DEVRIYE': return s.seesPlayer ? 'KOVALA' : s.heardNoise ? 'SUPHE' : 'DEVRIYE';
      case 'SUPHE': return s.seesPlayer ? 'KOVALA' : s.timeInState > 4 ? 'DEVRIYE' : 'SUPHE';
      case 'KOVALA': return !s.seesPlayer ? 'SUPHE' : s.dist < 60 ? 'SALDIR' : 'KOVALA';
      case 'SALDIR': return !s.seesPlayer ? 'SUPHE' : s.dist > exitDist ? 'KOVALA' : 'SALDIR';   // histerezis: 60'ta gir, 90'da çık
      case 'KAC': return s.hp > 70 ? 'DEVRIYE' : 'KAC';
    }
    return state;
  };
  SL.guardRefNext = refNext;

  /* ---------- ok geometrisi (fsmStory ve fsmSVG ortak) ----------
     Şema kuralları (sema-etiketleri): etiket okun ÜSTÜNDE (zemini çizgiyi keser) ya da dis = 'out' ise okun dış
     tarafında, ona bitişik; her ok bir kutudan çıkar ("her durumdan" kuralı kesik çerçeveli HER DURUM kutusundan).
     A, B: kutu merkezleri; hw, hh: kutunun yarı genişliği/yüksekliği; bow: bükülme (normal yönünde, + / −);
     lt: etiketin eğri üzerindeki yeri (0–1); dis: etiketi bükülme yönüne kaydır (sayı ya da 'out'); lw, lh: etiket kutusu.
     Etiketin yeri yalnızca geometriden hesaplanır (vurgu, kalınlık yeri değiştirmez). */
  const okYolu = (A, B, hw, hh, bow, lt, dis, lw, lh, r = 0, bosB = 3, bosS = 4) => {
    const [x1, y1] = A, [x2, y2] = B, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const kx = (x1 + x2) / 2 + nx * bow, ky = (y1 + y2) / 2 + ny * bow;
    // ok, merkezden merkeze giden eğrinin iki kutunun (yuvarlatılmış köşeli, r) DIŞINDA kalan parçası: başı kutudan
    // bosB, ucu bosS uzakta (köşeden çıkan/giren oklarda da uç kutuya değer)
    const P = t => [(1 - t) * (1 - t) * x1 + 2 * t * (1 - t) * kx + t * t * x2, (1 - t) * (1 - t) * y1 + 2 * t * (1 - t) * ky + t * t * y2];
    const sdf = ([px, py], [cx, cy]) => { const qx = Math.abs(px - cx) - (hw - r), qy = Math.abs(py - cy) - (hh - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
    const bul = (lo, hi, f) => { for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (f(m)) hi = m; else lo = m; } return (lo + hi) / 2; };
    const t0 = bul(0, 0.5, t => sdf(P(t), A) >= bosB), t1 = bul(0.5, 1, t => sdf(P(t), B) < bosS);
    // [t0, t1] parçasının kontrol noktası (kutupsal biçim): B(t0, t1)
    const kp = (u, v) => [(1 - u) * (1 - v) * x1 + ((1 - u) * v + u * (1 - v)) * kx + u * v * x2, (1 - u) * (1 - v) * y1 + ((1 - u) * v + u * (1 - v)) * ky + u * v * y2];
    const [sx, sy] = P(t0), [ex, ey] = P(t1), [cx, cy] = kp(t0, t1);
    const q = lt, bx = (1 - q) * (1 - q) * sx + 2 * q * (1 - q) * cx + q * q * ex, by = (1 - q) * (1 - q) * sy + 2 * q * (1 - q) * cy + q * q * ey;
    let ox = 0, oy = 0;
    if (dis) {
      const tx = 2 * (1 - q) * (cx - sx) + 2 * q * (ex - cx), ty = 2 * (1 - q) * (cy - sy) + 2 * q * (ey - cy), tl = Math.hypot(tx, ty) || 1;
      let mx = -ty / tl, my = tx / tl;
      if (bow && (cx - (sx + ex) / 2) * mx + (cy - (sy + ey) / 2) * my < 0) { mx = -mx; my = -my; }   // bükülme yönüne (dışa)
      const d = dis === 'out' ? Math.abs(mx) * lw / 2 + Math.abs(my) * lh / 2 + 1 : dis;
      ox = mx * d; oy = my * d;
    }
    const f = v => Math.round(v * 10) / 10;
    return { d: `M${f(sx)},${f(sy)} Q${f(cx)},${f(cy)} ${f(ex)},${f(ey)}`, lx: f(bx + ox), ly: f(by + oy) };
  };

  /* ---------- olay düğmeli hikâye FSM’si: “şu durumdayken şu olursa…” ----------
     cfg: { W, H, rw, rh, states: {id: [x, y, emoji, ad, renk, neYapar]}, edges: [[a, b, olay, bow, lt, dis]],
            events: {id: [ad, düğme]}, any: [olay, hedef, [x, y]] (kesik çerçeveli HER DURUM kutusu ve ondan çıkan ok),
            dar: { esik, W, H, pos: {id: [x, y]}, any: [x, y], edges: {i: {bow, lt, dis}} } (dar ekran yerleşimi),
            none: (durum, olay) => açıklama, SC: [[ad, hikâye, [olaylar], ders]], start } */
  function fsmStory(root, cfg, mid) {
    let cur = cfg.start, lastEdge = null, log = [], timer = null, sonDar = null;
    const diag = el('div'), logEl = el('div', { class: 'btd-log' }), story = el('div', { class: 'btd-story' }), now = el('div', { class: 'fs-now' });
    logEl.style.cssText = 'height:11.2em;overflow-y:auto;overscroll-behavior:contain';   // en az 6 satırlık sabit yer: günlük uzayınca altındaki düğmeler kaymaz, içi kendi içinde kayar
    const RW = cfg.rw || 150, RH = cfg.rh || 62, LH = 27, labW = tx => tx.length * 8.8 + 18;
    // dar yerleşim yalnızca genişliğe bağlı (kaymaz kural: genişlik değişince yeniden yerleşim serbest)
    const darMi = () => !!cfg.dar && diag.clientWidth > 0 && diag.clientWidth < (cfg.dar.esik || 480);
    const draw = () => {
      const t = T(), dar = darMi(), DZ = dar ? cfg.dar : null;
      sonDar = dar;
      const S = {};
      Object.entries(cfg.states).forEach(([id, v]) => { const p = DZ && DZ.pos && DZ.pos[id]; S[id] = p ? [p[0], p[1], ...v.slice(2)] : v; });
      let g = `<defs><marker id="${mid}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="19" markerHeight="19" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>`;
      const lab = [];
      const ok = (i, A, B, ev, bow, lt, dis, hot, fromCur) => {
        const tx = cfg.events[ev][0], w = labW(tx), o = okYolu(A, B, RW / 2, RH / 2, bow, lt, dis, w, LH, 16);
        g += `<path data-kenar="${i}" d="${o.d}" fill="none" stroke="${hot ? t.red : fromCur ? t['ink-2'] : t.muted}" stroke-opacity="${hot || fromCur ? 1 : 0.75}" stroke-width="${hot ? 5 : fromCur ? 2.8 : 2.2}" marker-end="url(#${mid})"/>`;
        lab.push([i, o.lx, o.ly, tx, w, hot, fromCur]);
      };
      cfg.edges.forEach(([a, b, ev, bow = 0, lt = 0.5, dis = 0], i) => {
        const de = (DZ && DZ.edges && DZ.edges[i]) || {};
        const hot = lastEdge && lastEdge[0] === a && lastEdge[1] === b;
        ok(i, S[a], S[b], ev, de.bow != null ? de.bow : bow, de.lt != null ? de.lt : lt, de.dis != null ? de.dis : dis, hot, a === cur);
      });
      let anyKutu = '';
      if (cfg.any) {   // "her durumdan" kuralı: kesik çerçeveli HER DURUM kutusundan hedefe giden normal bir ok
        const [ev, to] = cfg.any, at = (DZ && DZ.any) || cfg.any[2], hot = lastEdge && lastEdge[0] === '*', fc = cur !== to;
        ok(cfg.edges.length, at, S[to], ev, 0, 0.5, 0, hot, fc);
        anyKutu = `<g data-etiket-degil="1"><rect x="${at[0] - RW / 2}" y="${at[1] - RH / 2}" width="${RW}" height="${RH}" rx="16" fill="${t.card}" stroke="${hot ? t.red : t['ink-2']}" stroke-width="${hot ? 3.5 : 2.4}" stroke-dasharray="9 6"/><text x="${at[0]}" y="${at[1] - 2}" text-anchor="middle" font-size="18" font-weight="800" fill="${t.ink}">HER DURUM</text><text x="${at[0]}" y="${at[1] + 18}" text-anchor="middle" font-size="14" fill="${t.muted}">hangisinde olursa</text></g>`;
      }
      lab.forEach(([i, x, y, tx, w, hot, fc]) => { g += `<g data-kenar-etiket="${i}"><rect x="${x - w / 2}" y="${y - LH / 2}" width="${w}" height="${LH}" rx="13" fill="${t.bg || t.card}" stroke="${hot ? t.red : fc ? t['ink-2'] : t.rule}" stroke-width="${hot ? 2.5 : 1.2}"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="16.5" font-weight="${hot || fc ? 700 : 500}" fill="${hot ? t.red : fc ? t.ink : t.muted}">${tx}</text></g>`; });
      g += anyKutu;
      Object.entries(S).forEach(([id, [x, y, em, nm, colKey]]) => {
        const on = id === cur, c = t[colKey];
        g += `<g data-etiket-degil="1"><rect x="${x - RW / 2}" y="${y - RH / 2}" width="${RW}" height="${RH}" rx="16" fill="${on ? c : t.card}" stroke="${c}" stroke-width="${on ? 5 : 3}"/><text x="${x - RW / 2 + 30}" y="${y + 11}" text-anchor="middle" font-size="30">${em}</text><text x="${x - RW / 2 + 56}" y="${y + 7}" text-anchor="start" font-size="19" font-weight="800" fill="${on ? '#fff' : t.ink}">${nm}</text></g>`;
      });
      const W = DZ ? DZ.W : cfg.W, H = DZ ? DZ.H : cfg.H;
      diag.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%" font-family="Source Sans 3">${g}</svg>`;
      const st = S[cur];
      now.innerHTML = `Şu an: <b style="color:${t[st[4]]}">${st[2]} ${st[3]}</b> — ${st[5]}`;
      const rows = log.slice(-6);
      logEl.innerHTML = rows.length ? rows.map(([ok, tx], i) => `<div class="${ok ? 'l-ok' : ''}${i === rows.length - 1 ? ' now' : ''}"><span>${ok ? '→' : '·'}</span>${tx}</div>`).join('') : '<div class="hint">Bir senaryo seçin ya da olay düğmelerine kendiniz basın.</div>';
      logEl.scrollTop = logEl.scrollHeight;   // son satır görünür kalsın
    };
    const fire = ev => {
      const S = cfg.states, evName = cfg.events[ev][0];
      let to = null;
      if (cfg.any && cfg.any[0] === ev && cur !== cfg.any[1]) { to = cfg.any[1]; lastEdge = ['*', to]; }
      else { const e = cfg.edges.find(x => x[0] === cur && x[2] === ev); if (e) { to = e[1]; lastEdge = [e[0], e[1]]; } }
      if (to) { log.push([1, `<b>${S[cur][3]}</b> iken “${evName}” → <b>${S[to][3]}</b>`]); cur = to; if (SL.sfx) { try { SL.sfx('alert'); } catch (e) {} } }
      else { lastEdge = null; log.push([0, `<b>${S[cur][3]}</b> iken “${evName}” → değişmez. <i>${cfg.none(cur, ev)}</i>`]); if (SL.sfx) { try { SL.sfx('tak'); } catch (e) {} } }
      draw();
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const reset = () => { stop(); cur = cfg.start; lastEdge = null; log = []; draw(); };
    const play = i => { reset(); story.innerHTML = '📖 ' + cfg.SC[i][1]; const evs = cfg.SC[i][2].slice(); timer = setInterval(() => { if (!evs.length) { stop(); log.push([0, '💡 ' + cfg.SC[i][3]]); draw(); return; } fire(evs.shift()); }, 1500); };
    const scB = cfg.SC.map((sc, i) => { const b = btn(sc[0], () => { scB.forEach(x => x.classList.remove('primary')); b.classList.add('primary'); play(i); }); return b; });
    const evB = Object.keys(cfg.events).map(ev => btn(cfg.events[ev][1] || cfg.events[ev][0], () => { stop(); scB.forEach(x => x.classList.remove('primary')); story.innerHTML = '📖 Kendi senaryonuz: olay düğmelerine istediğiniz sırayla basın.'; fire(ev); }));
    root.setAttribute('data-prevent-swipe', '');
    story.innerHTML = '📖 ' + cfg.intro;
    root.append(el('div', { class: 'sv-controls btd-sc' }, el('b', { class: 'fs-lab' }, 'Senaryo:'), ...scB, btn('↺', () => { reset(); story.innerHTML = '📖 ' + cfg.intro; scB.forEach(x => x.classList.remove('primary')); })), story,
      el('div', { class: 'btd-wrap fs' }, diag, el('div', {}, now, logEl)),
      el('div', { class: 'sv-controls btd-sc fs-ev' }, el('b', { class: 'fs-lab' }, 'Olay:'), ...evB));
    draw(); SL.onTheme(draw);
    if (cfg.dar && window.ResizeObserver) new ResizeObserver(() => { if (darMi() !== sonDar) draw(); }).observe(diag);   // dar/geniş yerleşim yalnızca eşik geçilince değişir
    return { stop };
  }
  /* kedi: üç durum, dört olay */
  D.fsmcat = function (root) {
    return fsmStory(root, {
      W: 760, H: 340, rw: 236, start: 'UYU',
      states: { UYU: [140, 60, '😴', 'UYUYOR', 'blue', 'kıvrılmış uyuyor.'], MAMA: [620, 60, '😿', 'MAMA BEKLİYOR', 'amber', 'kabın başında miyavlıyor.'], OYUN: [380, 290, '😼', 'OYNUYOR', 'green', 'evin içinde koşturuyor.'] },
      edges: [['UYU', 'MAMA', 'sabah', 0], ['MAMA', 'OYUN', 'mama', 0], ['OYUN', 'UYU', 'yorul', -80, 0.42], ['UYU', 'OYUN', 'ip', -80, 0.42]],
      events: { sabah: ['sabah oldu', '⏰ sabah oldu'], mama: ['mama verildi', '🍗 mama verildi'], ip: ['ip sallandı', '🧶 ip sallandı'], yorul: ['yoruldu', '🥱 yoruldu'] },
      none: (st, ev) => ({ UYU: { mama: 'Uyuyan kedi mamayı fark etmez.', yorul: 'Zaten uyuyor.' }, MAMA: { sabah: 'Zaten kalkmış, mama bekliyor.', ip: 'Aç kedi oyun düşünmez!', yorul: 'Yorgun değil, aç.' }, OYUN: { sabah: 'Zaten ayakta.', mama: 'Karnı tok, oyuna devam.', ip: 'Zaten oynuyor.' } }[st][ev] || 'Bu durumdan bu olayla çıkan ok yok.'),
      intro: 'Kedinin üç hâli var ve aynı anda yalnızca birindedir. Oklar “ne olursa hangi hâle geçer”i söyler.',
      SC: [
        ['☀️ Sıradan bir gün', 'Sabah olur, mama gelir, kedi oynar, yorulur, uyur.', ['sabah', 'mama', 'yorul'], 'Üç olay, üç geçiş: kedi başladığı duruma döndü.'],
        ['🧶 Aynı olay, farklı tepki', 'İp üç kez sallanacak: kedi uyurken, açken ve oynarken. Tepkisi aynı mı?', ['ip', 'yorul', 'sabah', 'ip', 'mama', 'ip'], 'Aynı olay (“ip sallandı”) üç durumda üç ayrı tepki aldı: uyuyan kedi oyuna kalktı, aç kedi umursamadı, oynayan kedi zaten oynuyordu. Tepkiyi belirleyen olay değil, <b>olay + o anki durum</b>.'],
        ['🍗 Yanlış zamanda mama', 'Kedi uyurken mama veriyoruz. Sonra sabah oluyor.', ['mama', 'sabah', 'mama'], 'Uyurken verilen mama “kayboldu”: FSM yalnızca o anki durumdan çıkan oklara bakar.']]
    }, 'fsa1');
  };
  /* nöbetçi: beş durum, olaylar düğmeyle */
  D.fsmguardstory = function (root) {
    return fsmStory(root, {
      // Yerleşim (sema-etiketleri): üstte ŞÜPHE–DEVRİYE–KAÇ, altta SALDIR–KOVALA ve HER DURUM kutusu. Karşılıklı oklar
      // (ses/4 sn, yaklaştı/uzaklaştı) ayrı bükülür, etiketleri kendi eğrilerinin üstünde; çapraz çiftin (gördü/kaybetti)
      // etiketleri dış tarafta. Büyük yay yok; "canı azaldı" HER DURUM kutusundan çıkar. Dar ekranda iki sütun.
      W: 900, H: 420, rw: 164, start: 'DEV',
      states: { SUP: [110, 60, '❓', 'ŞÜPHE', 'amber', 'sesin geldiği yere gidip etrafa bakıyor.'], DEV: [450, 60, '🚶', 'DEVRİYE', 'blue', 'yol noktaları arasında sakin sakin yürüyor.'], KAC: [790, 60, '💨', 'KAÇ', 'green', 'oyuncudan uzaklaşıp iyileşiyor.'], SAL: [110, 360, '🔫', 'SALDIR', 'purple', 'durmuş, nişan alıp ateş ediyor.'], KOV: [450, 360, '🏃', 'KOVALA', 'red', 'oyuncuya doğru koşuyor.'] },
      edges: [['DEV', 'SUP', 'ses', -44], ['SUP', 'DEV', 'sure', -44], ['DEV', 'KOV', 'gor', 0, 0.5], ['SUP', 'KOV', 'gor', -40, 0.5, 'out'], ['KOV', 'SUP', 'kayip', -40, 0.5, 'out'], ['KOV', 'SAL', 'yakin', -44], ['SAL', 'KOV', 'uzak', -44], ['SAL', 'SUP', 'kayip', 0, 0.5], ['KAC', 'DEV', 'iyi', 0]],
      any: ['can', 'KAC', [790, 360]],
      dar: { esik: 480, W: 560, H: 525, pos: { SUP: [120, 200], DEV: [440, 200], KAC: [440, 45], SAL: [120, 475], KOV: [440, 475] }, any: [120, 45], edges: { 0: { lt: 0.36 }, 6: { lt: 0.36 } } },
      events: { ses: ['ses duydu', '🔊 ses duydu'], gor: ['oyuncuyu gördü', '👁️ oyuncuyu gördü'], kayip: ['gözden kaybetti', '🙈 gözden kaybetti'], yakin: ['yaklaştı', '📏 yaklaştı (mesafe < 60)'], uzak: ['uzaklaştı', '↔ uzaklaştı (mesafe > 90)'], sure: ['4 sn geçti', '⏱️ 4 sn geçti'], can: ['canı azaldı', '💔 canı azaldı (can < 30)'], iyi: ['iyileşti', '💚 iyileşti (can > 70)'] },
      none: (st, ev) => ({ DEV: { kayip: 'Zaten kimseyi görmüyordu.', yakin: 'Görmediği birine yaklaşmış sayılmaz.', sure: 'Devriyenin süresi yok.' }, SUP: { ses: 'Zaten araştırıyor.' }, KOV: { ses: 'Oyuncuyu görüyor; sese bakmaz.', gor: 'Zaten görüyor.', sure: 'Kovalamanın süresi yok.' }, SAL: { ses: 'Ateş ederken sese bakmaz.', yakin: 'Zaten menzilde.' }, KAC: { ses: 'Kaçarken sesle ilgilenmez.', gor: 'Görse de kaçmaya devam eder.', can: 'Zaten kaçıyor.' } }[st][ev] || 'Bu durumdan bu olayla çıkan ok yok.'),
      intro: 'Canlı demodan önce nöbetçiyi elle yönetelim: olayları siz verin, hangi oku izlediğini görün. Kırmızı ok = az önce kullanılan geçiş.',
      SC: [
        ['🔊 Yanlış alarm', 'Oyuncu bir taş atar, nöbetçi sesi duyar ama kimseyi bulamaz.', ['ses', 'sure'], 'Ses → ŞÜPHE, 4 sn sonra → DEVRİYE. Oyuncu hiç görülmedi.'],
        ['🏃 Yakalandın', 'Oyuncu koridorda görülür ve kaçamaz.', ['gor', 'yakin'], 'DEVRİYE → KOVALA → SALDIR: iki olay, iki geçiş.'],
        ['🙈 Köşeyi dönüp kurtul', 'Oyuncu görülür, köşeyi dönüp saklanır.', ['gor', 'kayip', 'sure'], 'Kaybedince doğrudan devriyeye dönmedi; önce ŞÜPHE’de son görülen yere baktı. Gizlilik oyunlarındaki “neredeydi o?” anı bu durumdur.'],
        ['💔 Yaralı nöbetçi', 'Nöbetçi saldırırken oyuncu karşılık verir.', ['gor', 'yakin', 'can', 'gor', 'iyi'], '“Canı azaldı” her durumdan KAÇ’a götürür (HER DURUM kutusundan çıkan ok). Kaçarken oyuncuyu görse de değişmez; iyileşince devriyeye döner.'],
        ['🔁 Aynı olay, farklı tepki', '“Ses duydu” olayı dört farklı durumda verilecek.', ['ses', 'ses', 'gor', 'ses', 'yakin', 'ses'], 'Ses yalnızca DEVRİYE’de işe yaradı. Tepkiyi belirleyen <b>olay + o anki durum</b>.']]
    }, 'fsa2');
  };

  /* ---------- FSM diyagramı (SVG) ----------
     Aynı nöbetçi, fsmguardstory ile aynı kurallarla: büyük yay yok, karşılıklı oklar ayrı bükülür, çapraz çiftin
     etiketleri dış tarafta ve çaprazın iki ayrı ucunda; "can < 30" kesik çerçeveli HER DURUM kutusundan çıkar.
     Renkler, yazı boyları, düğüm biçimi ve çizgi kalınlıkları sunumun özgün biçemi; değişen yalnızca yerleşim. */
  const GFSM = { W: 540, H: 346, nodes: { SUPHE: [58, 44], DEVRIYE: [270, 44], KAC: [482, 44], SALDIR: [58, 302], KOVALA: [270, 302] }, any: [482, 302] };
  const GEDGES = [['DEVRIYE', 'SUPHE', 'ses', -46], ['SUPHE', 'DEVRIYE', '4 sn', -46], ['DEVRIYE', 'KOVALA', 'görüyor', 0, 0.3], ['SUPHE', 'KOVALA', 'görüyor', -36, 0.35, 'out'], ['KOVALA', 'SUPHE', 'kaybetti', -36, 0.35, 'out'], ['KOVALA', 'SALDIR', '< 60', -46], ['SALDIR', 'KOVALA', '> 90', -46], ['SALDIR', 'SUPHE', 'kaybetti', 0, 0.5], ['KAC', 'DEVRIYE', 'can > 70', 0]];
  function fsmSVG(active, flash, exitDist = 90, mid = 'fa') {   // mid: bu diyagrama özel ok ucu kimliği (aynı kimlik iki slaytta olursa gizli olan seçilir, ok uçları kaybolur)
    const t = T(), col = COLS(t), Y = GFSM, N = Y.nodes, NW = 100, NH = 44, LH = 16, FS = 11, lw = s => s.length * 6.4 + 10;   // sunumun özgün biçemi: düğüm 100×44, etiket 11 px
    let s = `<defs><marker id="${mid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>`;
    const lab = [];
    const ok = (i, A, B, lab0, bow, lt, dis, on) => {
      const w = lw(lab0), o = okYolu(A, B, NW / 2, NH / 2, bow, lt, dis, w, LH, 22);
      s += `<path data-kenar="${i}" d="${o.d}" fill="none" stroke="${on ? t.red : t['ink-2']}" stroke-width="${on ? 4 : 1.8}" marker-end="url(#${mid})"/>`;
      lab.push([i, o.lx, o.ly, lab0, w, on]);
    };
    GEDGES.forEach(([a, b, lab0, bow, lt = 0.5, dis = 0], i) => ok(i, N[a], N[b], lab0 === '> 90' ? '> ' + exitDist : lab0, bow, lt, dis, !!(flash && flash[0] === a && flash[1] === b)));
    const kacOn = !!(flash && flash[1] === 'KAC');   // "her durumdan" girişi: KAÇ'a geçişte bu ok kırmızı
    ok(GEDGES.length, Y.any, N.KAC, 'can < 30', 0, 0.5, 0, kacOn);
    lab.forEach(([i, x, y, tx, w, on]) => { s += `<g data-kenar-etiket="${i}"><rect x="${x - w / 2}" y="${y - LH / 2}" width="${w}" height="${LH}" rx="4" fill="${t.card}" opacity=".92"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="${FS}" fill="${on ? t.red : t.muted}" font-weight="${on ? 700 : 600}">${tx}</text></g>`; });
    const [ax, ay] = Y.any;
    s += `<g data-etiket-degil="1"><rect x="${ax - NW / 2}" y="${ay - NH / 2}" width="${NW}" height="${NH}" rx="12" fill="${t.card}" stroke="${kacOn ? t.red : t['ink-2']}" stroke-width="${kacOn ? 3 : 2}" stroke-dasharray="6 4"/><text x="${ax}" y="${ay + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="${t.ink}">HER DURUM</text></g>`;
    Object.entries(N).forEach(([k, [x, y]]) => {
      const on = k === active;
      s += `<g data-etiket-degil="1"><rect x="${x - NW / 2}" y="${y - NH / 2}" width="${NW}" height="${NH}" rx="22" fill="${on ? col[k] : t.card}" stroke="${col[k]}" stroke-width="${on ? 4 : 2.5}"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="15" font-weight="700" fill="${on ? '#fff' : t.ink}">${NAMES[k]}</text></g>`;
    });
    // geniş yan sütunda (titreme slaytı) çizim aşırı büyüyüp düğmeleri ve alttaki metni aşağı itmesin: en çok 520 px
    return `<svg viewBox="0 0 ${Y.W} ${Y.H}" style="width:100%;max-width:520px;display:block;margin:0 auto" font-family="Source Sans 3">${s}</svg>`;
  }

  let fsmCount = 0;
  D.guardfsm = function (root) {
    // data-memory="0": "titreme" kopyası — histerezis ve algı hafızası kapalı başlar; bot oyuncu nöbetçiden yavaşça geri çekilir
    const mid = 'fa' + (++fsmCount);
    const flicker = root.dataset.memory === '0';
    let hyst = !flicker, bp = V.v(380, 70);
    const bot = (st, dt) => {   // nöbetçi 75 pikselden yakınsa ondan uzaklaş (40 px/sn): tek eşikte titremeyi tetikler
      const away = V.sub(bp, st.g);
      if (V.len(away) < 75) {
        const stepTo = d => V.v(SL.clamp(bp.x + d.x * 40 * dt, 20, 700), SL.clamp(bp.y + d.y * 40 * dt, 20, 360));
        let dir = V.norm(away), n = stepTo(dir);
        if (V.dist(n, bp) < 40 * dt * 0.5) n = stepTo(V.perp(dir));   // kenara sıkıştıysa kenar boyunca kay
        bp = n;
      }
      return bp;
    };
    const sim = SL.makeGuardArena({ decide: (state, s) => refNext(state, s, hyst ? 90 : 60), bot: flicker ? bot : null, onReset: () => { bp = V.v(380, 70); }, memory: root.dataset.memory != null ? root.dataset.memory === '1' : true, onDraw: st => {
      diag.innerHTML = fsmSVG(st.state, st.flashT > 0 ? st.flash : null, hyst ? 90 : 60, mid);
      const s = st.sense || {};
      const fx = n => `style="display:inline-block;min-width:${n}ch;font-variant-numeric:tabular-nums"`;   // sabit genişlik: sayaçlar yerinden oynamasın
      info.innerHTML = `<div class="sv-counters"><span class="cnt">can <b ${fx(3)}>${Math.round(st.hp)}</b></span><span class="cnt">mesafe <b ${fx(3)}>${s.dist}</b></span><span class="cnt">görüyor <b ${fx(9)}>${s.seesPlayer ? (st.rawSees ? 'evet' : 'hafızadan') : 'hayır'}</b></span><span class="cnt">son 5 sn’de geçiş <b ${fx(2)} class="${st.switches.length > 6 ? 'c-red' : ''}">${st.switches.length}</b></span></div><div class="fsm-log">${logSatirlari(st.log)}</div>`;
    } });
    // min-height:0: çizimin boyu yalnızca genişliğe bağlı (en-boy oranı); dar yan sütunda boş 200 px ayırıp düğmeleri aşağı itmesin
    const diag = el('div', { class: 'fsm-diag', style: 'min-height:0' }), info = el('div');
    // Günlük: makeGuardArena son 6 geçişi tutar (en yeni üstte); burada en yeni LOGN tanesi. Yer baştan ayrılır: hep LOGN satır çizilir
    // (boşları &nbsp;), satırlar kaymaz ve sarmaz; kutu zamanla büyümez, denetim düğmeleri aşağı itilmez.
    const LOGN = 4, logSatirlari = log => Array.from({ length: LOGN }, (_, i) => `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${log[i] != null ? log[i] : i === 0 ? '<i>henüz geçiş yok</i>' : '&nbsp;'}</div>`).join('');
    const check = (label, on, fn) => el('label', { class: 'ctl' }, (() => { const cb = el('input', { type: 'checkbox', onchange: e => fn(e.target.checked) }); cb.checked = on; return cb; })(), ' ' + label);
    root.setAttribute('data-prevent-swipe', '');
    root.append(el('div', { class: 'sv-controls' }, btn('🔫 Ateş et (−25 can) · X tuşu', () => sim.shoot(), 'primary'),
      flicker ? check('histerezis (60’ta gir, 90’da çık)', hyst, v => { hyst = v; }) : null,
      check('algı hafızası (1,2 sn)', sim.st.memory, v => sim.setMemory(v)),
      el('span', { class: 'mini' }, 'Fare = oyuncu · tıkla = ses çıkar · X = ateş et')),
    el('div', { class: 'gv-row' }, el('div', { style: 'flex:none' }, sim.world.canvas), el('div', { class: 'gv-side' }, diag, info)), sim.world.controls());
    sim.world.reset();
    return { start: () => sim.world.start(), stop: () => sim.world.stop() };
  };

  /* ---------- başlık: dolaşan durum jetonu ---------- */
  D.titlefsm = function (root) {
    const W = 1280, H = 230, c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    const N = [['DEVRİYE', 700, 60, '#4f8cff'], ['ŞÜPHE', 880, 170, '#f5a524'], ['KOVALA', 1060, 60, '#ff5c7a'], ['SALDIR', 1180, 170, '#a970ff']];
    let k = 0, tt = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < N.length; i++) { const a = N[i], b = N[(i + 1) % N.length]; ctx.strokeStyle = 'rgba(200,200,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[1], a[2]); ctx.lineTo(b[1], b[2]); ctx.stroke(); }
      N.forEach(([n, x, y, col], i) => { const on = i === k; ctx.shadowColor = col; ctx.shadowBlur = on ? 24 : 0; ctx.fillStyle = on ? col : 'rgba(30,30,50,0.8)'; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 70, 26, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '700 15px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, x, y + 1); });
      const a = N[k], b = N[(k + 1) % N.length], f = Math.min(1, tt / 30);
      if (tt > 50) { const x = a[1] + (b[1] - a[1]) * ((tt - 50) / 20), y = a[2] + (b[2] - a[2]) * ((tt - 50) / 20); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); }
      void f;
    };
    const tick = () => { if (!running) return; tt++; if (tt >= 70) { tt = 0; k = (k + 1) % N.length; } draw(); timer = setTimeout(tick, 33); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };

  /* ---------- yığınlı durum makinesi (pushdown) ---------- */
  D.pushdown = function (root) {
    let stack = ['DEVRİYE'], plain = 'DEVRİYE', log = [];
    const view = el('div', { class: 'cols' });
    const draw = () => {
      view.innerHTML = `<div><div class="mini" style="font-size:15px"><b>Yığınlı FSM</b> (en üstteki = şu anki durum):</div><div class="pd-stack">${stack.slice().reverse().map((s, i) => `<div class="${i === 0 ? 'top' : ''}">${s}</div>`).join('')}</div></div>` +
        `<div><div class="mini" style="font-size:15px"><b>Düz FSM</b> (tek değişken):</div><div class="pd-stack"><div class="top">${plain}</div></div><div class="mini" style="margin-top:8px;font-size:14px;line-height:1.35">${[0, 1, 2].map(k => `<div>${log[log.length - 3 + k] || '&nbsp;'}</div>`).join('')}</div></div>`;
    };
    // günlük: son 3 satır, yeri baştan ayrılır (boş satırlar &nbsp;); dizi de 3'te tutulur, kutu büyümez
    const ev = (name, fn) => btn(name, () => { fn(); log = log.slice(-3); draw(); });
    root.append(el('div', { class: 'sv-controls' },
      ev('📞 Telefon çaldı', () => { stack.push('TELEFONDA'); plain = 'TELEFONDA'; log.push('Telefon: düz FSM önceki durumu unuttu!'); }),
      ev('🔫 Silah sesi', () => { stack.push('ALARM'); plain = 'ALARM'; log.push('Alarm üste eklendi'); }),
      ev('✔ Bitti / tehlike geçti (pop)', () => { if (stack.length > 1) { stack.pop(); plain = '??? (nereye dönmeli?)'; log.push('Yığın: bir öncekine dön. Düz FSM: bilmiyor.'); } else log.push('Yığında tek durum var: dönülecek önceki durum yok, hiçbir şey değişmedi.'); }),
      ev('↺', () => { stack = ['DEVRİYE']; plain = 'DEVRİYE'; log = []; })), view);
    draw();
  };

  /* ---------- simlab: kendi geçiş fonksiyonunu yaz ---------- */
  SL.SIMLABS.guard = function (box, api) {
    let bad = false;
    const sim = SL.makeGuardArena({ decide: refNext, displayW: 540, onBad: v => { api.setMsg('err', '⚠️ nextState geçerli bir durum adı döndürmeli (DEVRIYE, SUPHE, KOVALA, SALDIR, KAC). Döndürülen: ' + JSON.stringify(v)); }, onDraw: st => { lbl.textContent = `durum: ${NAMES[st.state]} · can ${Math.round(st.hp)}`; } });
    const lbl = el('div', { class: 'mini' });
    box.append(sim.world.canvas, el('div', { class: 'sv-controls' }, btn('🔫 ateş et (−25) · X tuşu', () => sim.shoot())), lbl, sim.world.controls({ speed: false }));
    sim.world.reset();
    return {
      world: sim.world,
      setFns(f) { sim.setDecide(f.nextState); sim.world.reset(); sim.world.playing = true; sim.world.syncBtn && sim.world.syncBtn(); void bad; },
      check(mod) {
        const cs = SL.AILABS.guardfsm.cases();
        for (const [state, s] of cs) {
          const js = { seesPlayer: s.sees_player, dist: s.dist, hp: s.hp, heardNoise: s.heard_noise, timeInState: s.time_in_state };
          let got; try { got = mod.nextState(state, Object.assign({}, js)); } catch (e) { return { ok: false, msg: '⚠️ ' + SL.jsErrorText(e) }; }
          const want = refNext(state, js);
          if (got !== want) return { ok: false, msg: `❌ Durum ${state}, algı ${JSON.stringify(js)} → beklenen ${want}, seninki ${JSON.stringify(got)}` };
        }
        return { ok: true, msg: `✅ ${cs.length}/${cs.length} durum testi geçti — simülasyonda izleyin!` };
      }
    };
  };

  /* ---------- ailab (Python + JS) ---------- */
  SL.AILABS.guardfsm = {
    fn: 'next_state', jsFn: 'nextState',
    ref: (state, s) => refNext(state, { seesPlayer: s.sees_player, dist: s.dist, hp: s.hp, heardNoise: s.heard_noise, timeInState: s.time_in_state }),
    cases: () => {
      const states = ['DEVRIYE', 'SUPHE', 'KOVALA', 'SALDIR', 'KAC'], cs = [];
      const base = { sees_player: false, dist: 200, hp: 100, heard_noise: false, time_in_state: 0 };
      states.forEach(st => { cs.push([st, Object.assign({}, base)]); cs.push([st, Object.assign({}, base, { sees_player: true })]); cs.push([st, Object.assign({}, base, { sees_player: true, dist: 40 })]); cs.push([st, Object.assign({}, base, { sees_player: true, dist: 75 })]); cs.push([st, Object.assign({}, base, { hp: 20 })]); cs.push([st, Object.assign({}, base, { heard_noise: true })]); cs.push([st, Object.assign({}, base, { time_in_state: 5 })]); cs.push([st, Object.assign({}, base, { hp: 80 })]); });
      for (let i = 0; i < 25; i++) cs.push([states[Math.floor(Math.random() * 5)], { sees_player: Math.random() < 0.5, dist: Math.floor(Math.random() * 300), hp: Math.floor(Math.random() * 100), heard_noise: Math.random() < 0.4, time_in_state: Math.floor(Math.random() * 8) + 0.5 }]);   // tam 4 sn üretme: “4 sn geçti” hem > 4 hem >= 4 ile doğru okunabilir
      return cs;
    },
    show: (st, s) => `durum ${st}, algı ${JSON.stringify(s)}`,
    hint: (st, s) => (s.hp < 30 && st !== 'KAC' ? 'Can 30’un altındaysa HER durumdan KAC’a geçilir (önce bunu kontrol edin).' : 'Kurallar tablosunu durum durum kontrol edin.')
  };
})();

/* EK:BAŞLA — ısınma laboratuvarları */
(function () {
  'use strict';

  const LIGHT = { YESIL: 'SARI', SARI: 'KIRMIZI', KIRMIZI: 'YESIL' };
  SL.AILABS.light = {
    fn: 'next_light', jsFn: 'nextLight',
    ref: s => LIGHT[s],
    cases: () => [['YESIL'], ['SARI'], ['KIRMIZI']],
    show: s => `şu anki durum "${s}"`,
    hint: () => 'Üç durum, üç geçiş: YESIL → SARI → KIRMIZI → YESIL. Her durum için bir if (ya da bir nesne/tablo) yeter.'
  };
  const DOOR = { ACIK: { kapat: 'KAPALI' }, KAPALI: { ac: 'ACIK', kilitle: 'KILITLI' }, KILITLI: { kilidi_ac: 'KAPALI' } };
  SL.AILABS.door = {
    fn: 'next_door', jsFn: 'nextDoor',
    ref: (s, e) => (DOOR[s] && DOOR[s][e]) || s,
    cases: () => { const cs = []; for (const s of ['ACIK', 'KAPALI', 'KILITLI']) for (const e of ['ac', 'kapat', 'kilitle', 'kilidi_ac']) cs.push([s, e]); return cs; },
    show: (s, e) => `durum "${s}", olay "${e}"`,
    hint: (s, e) => (DOOR[s][e] ? `"${s}" durumunda "${e}" olayı kapıyı "${DOOR[s][e]}" yapar.` : `"${s}" durumunda "${e}" olayının anlamı yok: durum DEĞİŞMEMELİ (kilitli kapı açılmaz, açık kapı kilitlenmez).`)
  };
})();
/* EK:BİTİŞ */
