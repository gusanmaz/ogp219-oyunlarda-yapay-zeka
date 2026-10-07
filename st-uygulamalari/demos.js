/* "Sembol Tablosu Uygulamaları" destesine özel demolar (ortak: ../ortak/st.js) */
(function () {
  'use strict';
  const { el } = SL;
  const D = window.DEMOS;
  /* Başlık: yerelleştirme tablosu — anahtarlar sabit, değerler dil dil değişiyor */
  D.titlest = function (root) {
    const W = 1280, H = 200;
    const rows = [['menu.play', 'Oyna', 'Play', 'Spielen', 'Jouer'], ['hud.health', 'Can', 'Health', 'Leben', 'Vie'], ['item.sword', 'Kılıç', 'Sword', 'Schwert', 'Épée'], ['npc.greet', 'Merhaba yolcu!', 'Hello traveler!', 'Hallo Reisender!', 'Bonjour voyageur !'], ['quest.dragon', 'Ejderhayı yen', 'Defeat the dragon', 'Besiege den Drachen', 'Vaincs le dragon']];
    const langs = ['TR', 'EN', 'DE', 'FR'];
    const c = el('canvas'); root.append(c);
    const ctx = SL.setupCanvas(c, W, H);
    let li = 0, t0 = 0, timer, running = false;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const ph = Math.min(1, t0 / 6);
      ctx.font = '700 15px "JetBrains Mono"'; ctx.textBaseline = 'middle';
      rows.forEach((r, i) => {
        const y = 22 + i * 30, x0 = 620;
        ctx.fillStyle = 'rgba(255,210,120,0.95)'; ctx.textAlign = 'right'; ctx.fillText(r[0], x0, y);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'center'; ctx.fillText('→', x0 + 26, y);
        ctx.globalAlpha = ph; ctx.fillStyle = 'rgba(120,230,170,1)'; ctx.textAlign = 'left'; ctx.fillText(r[1 + li], x0 + 50, y); ctx.globalAlpha = 1;
      });
      ctx.fillStyle = 'rgba(160,200,255,0.9)'; ctx.font = '700 13px "Press Start 2P"'; ctx.textAlign = 'left'; ctx.fillText(langs[li], 1180, 30);
    };
    const tick = () => { if (!running) return; t0++; if (t0 > 26) { t0 = 0; li = (li + 1) % langs.length; } draw(); timer = setTimeout(tick, 90); };
    return { start() { if (!running) { running = true; tick(); } }, stop() { running = false; clearTimeout(timer); } };
  };
})();
