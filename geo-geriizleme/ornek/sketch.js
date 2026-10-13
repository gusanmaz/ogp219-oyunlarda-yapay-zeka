// Çanta düzenleyici — ızgara envanter + geri izlemeyle "otomatik yerleştir" (p5.js)
const GEN = 8, YUK = 5, KARE = 56;                       // çanta: 8 × 5 kare
const KATALOG = [['tüfek', 6, 2], ['pompalı', 5, 2], ['tabanca', 2, 2], ['ilk yardım', 2, 2], ['bomba', 1, 2],
                 ['mermi', 2, 1], ['bıçak', 1, 3], ['ot', 1, 1], ['dürbün', 3, 1], ['zırh', 3, 3]];
const RENK = ['#4c78d9', '#d9534c', '#3aa76d', '#e0a030', '#9159c9', '#2aa3a3', '#c9598f', '#7a8296', '#5b8f3a', '#b0703a'];
let esyalar = [], eldeki = null, mesaj = '', deneme = 0;

function yeniGanimet() {                                 // rastgele 6–9 eşya; hepsi çantanın dışında başlar
  esyalar = [];
  const adet = floor(random(6, 10));
  for (let i = 0; i < adet; i++) { const k = floor(random(KATALOG.length)); esyalar.push({ ad: KATALOG[k][0], w: KATALOG[k][1], h: KATALOG[k][2], renk: RENK[k], x: -1, y: -1 }); }
  mesaj = 'Eşyaya tıklayıp alın, çantaya tıklayıp bırakın. R: döndür · O: otomatik yerleştir · N: yeni ganimet'; eldeki = null;
}

// ---------- ızgara yardımcıları ----------
function izgara(haric) {                                 // dolu kareler: izgara[y][x] = eşya indisi ya da -1
  const g = Array.from({ length: YUK }, () => Array(GEN).fill(-1));
  esyalar.forEach((e, i) => { if (e.x >= 0 && e !== haric) for (let yy = 0; yy < e.h; yy++) for (let xx = 0; xx < e.w; xx++) g[e.y + yy][e.x + xx] = i; });
  return g;
}
function sigarMi(g, w, h, x, y) {                        // w×h eşya, sol üst köşesi (x, y)'de: taşmıyor ve boş mu?
  if (x < 0 || y < 0 || x + w > GEN || y + h > YUK) return false;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g[yy][xx] !== -1) return false;
  return true;
}

// ---------- GERİ İZLEME: bütün eşyaları yerleştir ----------
function yerlestir(sira, i, g) {
  if (i === sira.length) return true;                    // hepsi yerleşti: BAŞARI
  const e = sira[i];
  const yonler = e.w === e.h ? [[e.w, e.h]] : [[e.w, e.h], [e.h, e.w]];     // kare değilse 90° döndürmeyi de dene
  for (const [w, h] of yonler)
    for (let y = 0; y < YUK; y++) for (let x = 0; x < GEN; x++) {
      if (!sigarMi(g, w, h, x, y)) continue;
      deneme++;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = i;     // SEÇ: yerleştir
      if (yerlestir(sira, i + 1, g)) { e.w = w; e.h = h; e.x = x; e.y = y; return true; }      // DENE: kalanlar sığıyor mu?
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = -1;    // GERİ AL
      if (deneme > 200000) return false;                 // sigorta
    }
  return false;                                          // bu eşya hiçbir yere sığmadı: bir üst düzey geri alacak
}
function otomatikYerlestir() {
  const alan = esyalar.reduce((t, e) => t + e.w * e.h, 0);
  if (alan > GEN * YUK) { mesaj = `SIĞMAZ: eşyalar ${alan} kare, çanta ${GEN * YUK} kare (hiç denemeye gerek yok)`; return; }
  const sira = esyalar.slice().sort((a, b) => b.w * b.h - a.w * a.h);        // büyükten küçüğe
  const g = Array.from({ length: YUK }, () => Array(GEN).fill(-1));
  deneme = 0;
  const oldu = yerlestir(sira, 0, g);
  if (!oldu) esyalar.forEach(e => { e.x = e.y = -1; });
  mesaj = oldu ? `SIĞDI: ${deneme} yerleştirme denemesi` : `SIĞMIYOR: ${deneme} denemede bütün yollar tükendi`;
}

// ---------- oyun ----------
function setup() { createCanvas(GEN * KARE + 260, YUK * KARE + 60); textFont('monospace', 13); yeniGanimet(); }

function keyPressed() {
  if (key === 'n' || key === 'N') yeniGanimet();
  if (key === 'o' || key === 'O') { eldeki = null; otomatikYerlestir(); }
  if ((key === 'r' || key === 'R') && eldeki) [eldeki.w, eldeki.h] = [eldeki.h, eldeki.w];
}

function mousePressed() {
  const gx = floor(mouseX / KARE), gy = floor(mouseY / KARE);
  if (eldeki) {                                          // bırak: sığıyorsa çantaya, çanta dışına tıklandıysa yere
    if (mouseX > GEN * KARE) { eldeki.x = eldeki.y = -1; eldeki = null; }
    else if (sigarMi(izgara(eldeki), eldeki.w, eldeki.h, gx, gy)) { eldeki.x = gx; eldeki.y = gy; eldeki = null; }
    else mesaj = 'Buraya sığmıyor (R ile döndürmeyi deneyin)';
    return;
  }
  if (mouseX < GEN * KARE && gy < YUK) { const i = izgara()[gy][gx]; if (i >= 0) { eldeki = esyalar[i]; eldeki.x = eldeki.y = -1; } }
  else { const disarida = esyalar.filter(e => e.x < 0); const k = floor((mouseY - 30) / 22); if (mouseX > GEN * KARE + 10 && k >= 0 && k < disarida.length) eldeki = disarida[k]; }
}

function draw() {
  background(246, 244, 238); stroke(210); 
  for (let y = 0; y < YUK; y++) for (let x = 0; x < GEN; x++) { fill(236, 238, 244); rect(x * KARE, y * KARE, KARE, KARE); }
  noStroke();
  for (const e of esyalar) if (e.x >= 0) { fill(e.renk); rect(e.x * KARE + 2, e.y * KARE + 2, e.w * KARE - 4, e.h * KARE - 4, 6); fill(255); textAlign(CENTER, CENTER); text(e.ad, (e.x + e.w / 2) * KARE, (e.y + e.h / 2) * KARE); }
  textAlign(LEFT, CENTER); fill(40); text('yerdeki eşyalar:', GEN * KARE + 14, 14);
  esyalar.filter(e => e.x < 0).forEach((e, k) => { fill(e.renk); rect(GEN * KARE + 14, 32 + k * 22, 14, 14, 3); fill(e === eldeki ? color(200, 40, 40) : 40); text(`${e.ad} ${e.w}×${e.h}${e === eldeki ? '  ← elinizde' : ''}`, GEN * KARE + 36, 39 + k * 22); });
  if (eldeki && mouseX < GEN * KARE) {                   // elde tutulan eşyanın gölgesi: yeşil = sığar, kırmızı = sığmaz
    const gx = floor(mouseX / KARE), gy = floor(mouseY / KARE), ok = sigarMi(izgara(eldeki), eldeki.w, eldeki.h, gx, gy);
    fill(ok ? color(60, 170, 110, 120) : color(220, 80, 70, 120)); rect(gx * KARE, gy * KARE, eldeki.w * KARE, eldeki.h * KARE, 6);
  }
  fill(40); textAlign(LEFT, CENTER); text(mesaj, 8, YUK * KARE + 30);
}
