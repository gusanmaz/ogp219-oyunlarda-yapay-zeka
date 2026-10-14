/* ornek.js — örnek sayfalarda (…/ornek/ klasörleri) kod görünümü: satır numaraları, renklendirme, kopyala, yazı boyu, tam ekran, indir.
   Sayfada <div id="kod" data-src="sketch.js"></div> olması yeter. highlight.js yüklüyse renklendirir. */
(function () {
  const box = document.getElementById('kod'); if (!box) return;
  const src = box.dataset.src || 'sketch.js';
  const css = `#kod{border:1px solid #2c2e3e;border-radius:12px;overflow:hidden;background:#1e1f2b;margin:14px 0}
#kod .kbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px;background:#272939;border-bottom:1px solid #34374a}
#kod .kbar .tab{color:#e6e6f0;font:600 13px system-ui;padding:4px 10px;border-radius:6px;background:#1e1f2b}
#kod .kbar .sp{flex:1}
#kod .kbar button,#kod .kbar a{font:13px system-ui;color:#e6e6f0;background:#33364a;border:1px solid #44485f;border-radius:7px;padding:4px 10px;cursor:pointer;text-decoration:none}
#kod .kbar button:hover,#kod .kbar a:hover{background:#3d4160}
#kod .kbody{overflow:auto;max-height:70vh}
#kod table{border-collapse:collapse;width:100%;font:var(--kfs,14px)/1.55 "JetBrains Mono",ui-monospace,monospace;tab-size:2}
#kod td.n{color:#6b6f88;text-align:right;padding:0 12px 0 14px;user-select:none;vertical-align:top;border-right:1px solid #34374a;width:1%;white-space:nowrap}
#kod td.c{padding:0 16px;white-space:pre;color:#e6e6f0}
#kod tr:hover td{background:#25273a}
#kod.full{position:fixed;inset:12px;z-index:999;margin:0;display:flex;flex-direction:column} #kod.full .kbody{max-height:none;flex:1}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  let fs = 14, raw = '';
  box.innerHTML = `<div class="kbar"><span class="tab">JavaScript (p5.js) · ${src}</span><span class="sp"></span><button data-a="minus" title="Yazıyı küçült">A−</button><button data-a="plus" title="Yazıyı büyüt">A+</button><button data-a="copy">📋 Kopyala</button><a href="${src}" download>⬇ İndir</a><a href="https://editor.p5js.org/" target="_blank" rel="noopener">↗ p5.js editörü</a><button data-a="full" title="Tam ekran (Esc ile çık)">⛶ Tam ekran</button></div><div class="kbody">yükleniyor…</div>`;
  const body = box.querySelector('.kbody');
  const render = () => {
    let html = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    if (window.hljs) html = hljs.highlight(raw, { language: 'javascript' }).value;
    // satır satır böl; çok satırlı vurgulama etiketlerini her satırda kapatıp yeniden aç
    const lines = []; let open = [];
    html.split('\n').forEach(l => {
      const pre = open.join(''); let cur = open.slice();
      l.replace(/<span[^>]*>|<\/span>/g, t => { if (t === '</span>') cur.pop(); else cur.push(t); return t; });
      lines.push(pre + l + '</span>'.repeat(cur.length)); open = cur;
    });
    body.innerHTML = '<table>' + lines.map((l, i) => `<tr><td class="n">${i + 1}</td><td class="c hljs">${l || ' '}</td></tr>`).join('') + '</table>';
  };
  fetch(src).then(r => r.text()).then(t => { raw = t.replace(/\s+$/, ''); render(); });
  box.querySelector('.kbar').addEventListener('click', e => {
    const a = e.target.dataset.a; if (!a) return;
    if (a === 'plus' || a === 'minus') { fs = Math.max(10, Math.min(26, fs + (a === 'plus' ? 2 : -2))); box.style.setProperty('--kfs', fs + 'px'); }
    if (a === 'copy') navigator.clipboard.writeText(raw).then(() => { e.target.textContent = '✅ Kopyalandı'; setTimeout(() => (e.target.textContent = '📋 Kopyala'), 1500); });
    if (a === 'full') { box.classList.toggle('full'); e.target.textContent = box.classList.contains('full') ? '✕ Kapat' : '⛶ Tam ekran'; }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('full')) box.querySelector('[data-a="full"]').click(); });
})();
