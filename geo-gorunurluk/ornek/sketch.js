// Zindan, görüş alanı ve savaş sisi (p5.js)
// W / A / S / D: yürü · F: sisi aç/kapa (hata ayıklama) · R: baştan
// Canavarlar (kırmızı) yalnızca ŞU AN gördüğünüz hücrelerdeyse çizilir.

const KARO = 24;
const HARITA = [
  '##############################',
  '#......#...........#.........#',
  '#......#....###....#....#....#',
  '#...........#......#....#....#',
  '#......#....#...........#....#',
  '####.###....#..##..#######.###',
  '#......#...........#.........#',
  '#......######..##..#....##...#',
  '#..................#....##...#',
  '#......#...........#.........#',
  '#......#....#...........#....#',
  '##############################'
];
const GW = HARITA[0].length, GH = HARITA.length;
const BILINMIYOR = 0, HATIRLANIYOR = 1, GORUNUYOR = 2;
let oyuncu, sis, canavarlar, R = 7, sisAcik = true, bakilan = 0;

function duvarMi(x, y) { return y < 0 || y >= GH || x < 0 || x >= GW || HARITA[y][x] === '#'; }

/* ---------- görüş alanı: özyinelemeli gölge dökümü ---------- */
const DILIM = [[1, 0, 0, -1, -1, 0, 0, 1], [0, 1, -1, 0, 0, -1, 1, 0],
               [0, 1, 1, 0, 0, -1, -1, 0], [1, 0, 0, 1, -1, 0, 0, -1]];   // 8 dilim için koordinat çevirisi

function gorusAlani(px, py, yaricap, gorunur) {
  gorunur(px, py);
  for (let d = 0; d < 8; d++) tara(1, 1.0, 0.0, DILIM[0][d], DILIM[1][d], DILIM[2][d], DILIM[3][d]);

  function tara(satir, bas, son, xx, xy, yx, yy) {       // [son, bas] eğim aralığı hâlâ aydınlık
    if (bas < son) return;
    let yeniBas = 0, kapali = false;
    for (let uzak = satir; uzak <= yaricap && !kapali; uzak++) {
      const dy = -uzak;
      for (let dx = -uzak; dx <= 0; dx++) {
        const X = px + dx * xx + dy * xy, Y = py + dx * yx + dy * yy;       // dilimden haritaya
        const solEgim = (dx - 0.5) / (dy + 0.5), sagEgim = (dx + 0.5) / (dy - 0.5);
        if (bas < sagEgim) continue;                     // henüz aydınlık aralığa girmedik
        if (son > solEgim) break;                        // aydınlık aralığı geçtik
        bakilan++;
        if (dx * dx + dy * dy <= yaricap * yaricap) gorunur(X, Y);
        if (kapali) {                                    // bir duvar dizisinin içindeyiz
          if (duvarMi(X, Y)) { yeniBas = sagEgim; continue; }
          kapali = false; bas = yeniBas;                 // duvar bitti: aralık daraldı
        } else if (duvarMi(X, Y) && uzak < yaricap) {    // duvar başladı: gölge
          kapali = true;
          tara(uzak + 1, bas, solEgim, xx, xy, yx, yy);  // duvarın solunda kalan aralığı alt satırlarda sürdür
          yeniBas = sagEgim;
        }
      }
    }
  }
}

/* ---------- savaş sisi: üç durum ---------- */
function sisGuncelle() {
  bakilan = 0;
  for (const satir of sis)
    for (let x = 0; x < GW; x++) if (satir[x] === GORUNUYOR) satir[x] = HATIRLANIYOR;
  gorusAlani(oyuncu.x, oyuncu.y, R, (x, y) => { if (y >= 0 && y < GH && x >= 0 && x < GW) sis[y][x] = GORUNUYOR; });
}

function bastan() {
  oyuncu = { x: 2, y: 2 };
  sis = HARITA.map(satir => [...satir].map(() => BILINMIYOR));
  canavarlar = [{ x: 15, y: 3 }, { x: 26, y: 2 }, { x: 4, y: 8 }, { x: 22, y: 9 }, { x: 10, y: 10 }];
  sisGuncelle();
}

/* ---------- p5.js ---------- */
function setup() {
  createCanvas(GW * KARO, GH * KARO + 30).parent(document.querySelector('main') || document.body);
  noStroke(); bastan();
}

function keyPressed() {
  const k = key.toLowerCase();
  if (k === 'f') sisAcik = !sisAcik;
  if (k === 'r') bastan();
  const dx = (k === 'd') - (k === 'a'), dy = (k === 's') - (k === 'w');
  if ((dx || dy) && !duvarMi(oyuncu.x + dx, oyuncu.y + dy)) {
    oyuncu.x += dx; oyuncu.y += dy;
    sisGuncelle();                                       // yalnızca oyuncu kıpırdayınca yeniden hesapla
  }
}

function draw() {
  background(15);
  let gorunen = 0, kesfedilen = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const d = sisAcik ? sis[y][x] : GORUNUYOR;
    if (sis[y][x] === GORUNUYOR) gorunen++;
    if (sis[y][x] !== BILINMIYOR) kesfedilen++;
    if (d === BILINMIYOR) continue;                      // hiç görülmedi: siyah
    const parlak = d === GORUNUYOR;
    fill(duvarMi(x, y) ? (parlak ? 150 : 70) : (parlak ? 235 : 95));
    rect(x * KARO, y * KARO, KARO - 1, KARO - 1);
  }
  fill(225, 60, 70);
  for (const c of canavarlar)                            // canavar yalnızca ŞU AN görünen hücredeyse çizilir
    if (!sisAcik || sis[c.y][c.x] === GORUNUYOR) circle(c.x * KARO + KARO / 2, c.y * KARO + KARO / 2, KARO * 0.55);
  fill(60, 200, 100); circle(oyuncu.x * KARO + KARO / 2, oyuncu.y * KARO + KARO / 2, KARO * 0.6);

  fill(255); textSize(14);
  text('görünen ' + gorunen + ' · keşfedilen ' + kesfedilen + '/' + GW * GH + ' · bakılan hücre ' + bakilan +
       '   (W/A/S/D yürü · F sis ' + (sisAcik ? 'açık' : 'KAPALI') + ' · R baştan)', 8, GH * KARO + 20);
}
