// Gizlilik mini oyunu — dönemin katmanları tek dosyada (p5.js)
// ALGILA (Y11) → HATIRLA (kara tahta, Y3) → KARAR VER (Y2/Y3) → DAVRAN (A*, Y8)
// Tıkla: oraya yürü · X: farenin olduğu yere taş at (ses) · R: baştan

const HARITA = [
  '########################',
  '#S.....#.........#.....#',
  '#.####.#.#######.#.###.#',
  '#.#..C.#.#.....#...#C..#',
  '#.#.####.#.###.#####.#.#',
  '#...#....#..C#.......#.#',
  '###.#.####.###.#####.#.#',
  '#...#......#...#...#...#',
  '#.#####.##.#.###.#.###.#',
  '#..C..#..#...#...#...C.#',
  '#.###.##.#####.#####.#.#',
  '#.........#.........#.E#',
  '########################'
];
const GW = 24, GH = 13, CS = 32;
const GORUS = 200, YARIM_ACI = 35;          // görüş menzili (piksel) ve koninin yarı açısı (derece)
const DEVRIYELER = [                        // her muhafızın devriye noktaları (hücre koordinatı)
  [[3, 7], [1, 7], [1, 11], [8, 11], [8, 9], [7, 7]],
  [[10, 7], [14, 7], [14, 9], [10, 9]],
  [[20, 1], [22, 1], [22, 7], [17, 7], [17, 5], [20, 5]]
];

let oyuncu, yol, altinlar, cikis, muhafizlar, ses, tas, yakalanma, kazandin;

/* ---------- 1) DÜNYA ---------- */
function duvar(x, y) { return x < 0 || y < 0 || x >= GW || y >= GH || HARITA[y][x] === '#'; }
function hucre(p) { return [floor(p.x / CS), floor(p.y / CS)]; }
function merkez(x, y) { return createVector(x * CS + CS / 2, y * CS + CS / 2); }

function bastan() {
  oyuncu = merkez(1, 1); yol = []; altinlar = []; ses = null; tas = 3; yakalanma = 0; kazandin = false;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (HARITA[y][x] === 'C') altinlar.push([x, y]);
    if (HARITA[y][x] === 'E') cikis = [x, y];
  }
  muhafizlar = DEVRIYELER.map(noktalar => ({
    p: merkez(...noktalar[0]), yon: createVector(1, 0), devriye: noktalar, sira: 1, yol: [], hedef: null,
    kt: { durum: 'devriye', farkindalik: 0, goruyor: false, sesDuydu: false, sonGorulen: null, aramaSuresi: 0 }   // KARA TAHTA
  }));
}

/* ---------- 2) YOL BULMA (Y8): 4 yönlü ızgarada A* ---------- */
function astar(sx, sy, tx, ty) {
  if (duvar(tx, ty)) return [];
  const anahtar = (x, y) => y * GW + x;
  const g = new Map([[anahtar(sx, sy), 0]]), nereden = new Map(), acik = [[0, sx, sy]], kapali = new Set();
  while (acik.length) {
    acik.sort((a, b) => a[0] - b[0]);                       // en küçük f = g + h öne
    const [, x, y] = acik.shift(), k = anahtar(x, y);
    if (kapali.has(k)) continue;
    kapali.add(k);
    if (x === tx && y === ty) {                             // hedef: geriye doğru yolu kur
      const p = [];
      for (let c = k; c !== undefined; c = nereden.get(c)) p.unshift(merkez(c % GW, floor(c / GW)));
      return p.slice(1);                                    // ilk nokta zaten bulunduğumuz hücre
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (duvar(nx, ny)) continue;
      const nk = anahtar(nx, ny), ng = g.get(k) + 1;
      if (ng < (g.has(nk) ? g.get(nk) : Infinity)) {
        g.set(nk, ng); nereden.set(nk, k);
        acik.push([ng + abs(nx - tx) + abs(ny - ty), nx, ny]);   // sezgi: Manhattan uzaklığı
      }
    }
  }
  return [];
}

/* ---------- 3) ALGILAMA (Y11): menzil + koni + görüş hattı ---------- */
function gorusHatti(a, b) {                                 // a ile b arasında duvar var mı?
  const n = ceil(p5.Vector.dist(a, b) / 6);
  for (let i = 1; i < n; i++) if (duvar(...hucre(p5.Vector.lerp(a, b, i / n)))) return false;
  return true;
}
function goruyorMu(m) {
  const fark = p5.Vector.sub(oyuncu, m.p);
  if (fark.mag() > GORUS) return false;                                   // 1. uzak mı?   (en ucuz test önce)
  if (abs(m.yon.angleBetween(fark)) > radians(YARIM_ACI)) return false;   // 2. koninin dışında mı?
  return gorusHatti(m.p, oyuncu);                                         // 3. arada duvar var mı? (en pahalı test sonda)
}

/* ---------- 4) KARAR: saf fonksiyon — yalnızca kara tahtaya bakar, tek başına test edilebilir ---------- */
function kararVer(kt) {
  if (kt.goruyor && kt.farkindalik >= 1) return 'kovala';
  if (kt.farkindalik >= 0.4 || kt.sesDuydu) return 'incele';
  return 'devriye';
}

/* ---------- 5) DAVRANIŞ ---------- */
function git(m, h) { const [sx, sy] = hucre(m.p); m.yol = astar(sx, sy, h[0], h[1]); m.hedef = h; }
function yuru(m, hiz, dt) {                                 // yol bittiyse true döndürür
  if (!m.yol.length) return true;
  const fark = p5.Vector.sub(m.yol[0], m.p), d = fark.mag();
  if (d < 3) { m.yol.shift(); return !m.yol.length; }
  fark.normalize();
  m.p.add(p5.Vector.mult(fark, min(hiz * dt, d)));
  m.yon.lerp(fark, 0.25).normalize();                       // yumuşak dönüş
  return false;
}

function muhafizGuncelle(m, dt) {
  const kt = m.kt;
  // ALGILA
  kt.goruyor = goruyorMu(m);
  if (ses && ses.yeni && p5.Vector.dist(ses.p, m.p) < ses.r) {
    kt.sesDuydu = true; kt.sonGorulen = hucre(ses.p); kt.aramaSuresi = 0; m.hedef = null;
  }
  // HATIRLA: farkındalık görünce dolar, görmeyince yavaşça boşalır
  if (kt.goruyor) {
    const d = p5.Vector.dist(m.p, oyuncu);
    kt.farkindalik = min(1.5, kt.farkindalik + dt * (1.6 - d / GORUS));   // yakındaysa hızlı dolar
    kt.sonGorulen = hucre(oyuncu);
  } else {
    const taban = kt.sonGorulen && kt.farkindalik >= 0.4 ? 0.4 : 0;       // şüphelendiyse, bakmadan unutmaz
    kt.farkindalik = max(taban, kt.farkindalik - dt * 0.12);
  }
  // KARAR VER
  const yeni = kararVer(kt);
  if (yeni !== kt.durum) { kt.durum = yeni; m.yol = []; m.hedef = null; kt.aramaSuresi = 0; }
  // DAVRAN
  if (kt.durum === 'devriye') {
    if (!m.yol.length) { git(m, m.devriye[m.sira]); m.sira = (m.sira + 1) % m.devriye.length; }
    yuru(m, 70, dt);
  } else if (kt.durum === 'incele') {
    const h = kt.sonGorulen;
    if (h && (!m.hedef || m.hedef[0] !== h[0] || m.hedef[1] !== h[1])) git(m, h);
    if (yuru(m, 100, dt)) {                                 // vardı: 3 saniye etrafına bak, sonra vazgeç
      kt.aramaSuresi += dt; m.yon.rotate(dt * 2);
      if (kt.aramaSuresi > 3) { kt.sonGorulen = null; kt.sesDuydu = false; kt.farkindalik = min(kt.farkindalik, 0.3); }
    }
  } else {                                                  // kovala: oyuncunun hücresi değiştikçe yolu yenile
    const h = hucre(oyuncu);
    if (!m.hedef || m.hedef[0] !== h[0] || m.hedef[1] !== h[1] || !m.yol.length) git(m, h);
    yuru(m, 125, dt);
  }
}

/* ---------- 6) OYUN DÖNGÜSÜ ---------- */
function tasAt(x, y) {
  const h = [floor(x / CS), floor(y / CS)];
  if (kazandin || tas <= 0 || duvar(h[0], h[1])) return false;
  tas--; ses = { p: merkez(h[0], h[1]), r: 220, t: 0, yeni: true };
  return true;
}

function guncelle(dt) {
  if (kazandin) return;
  if (yol.length) {                                         // oyuncu A* yolunu izler
    const fark = p5.Vector.sub(yol[0], oyuncu), d = fark.mag();
    if (d < 3) yol.shift(); else oyuncu.add(fark.normalize().mult(min(135 * dt, d)));
  }
  const [px, py] = hucre(oyuncu);
  const i = altinlar.findIndex(([x, y]) => x === px && y === py);
  if (i >= 0) { altinlar.splice(i, 1); ses = { p: oyuncu.copy(), r: 220, t: 0, yeni: true }; }   // altın şıngırdar!
  if (!altinlar.length && px === cikis[0] && py === cikis[1]) kazandin = true;

  for (const m of muhafizlar) muhafizGuncelle(m, dt);
  if (ses) { ses.yeni = false; ses.t += dt; if (ses.t > 0.6) ses = null; }

  if (muhafizlar.some(m => p5.Vector.dist(m.p, oyuncu) < 16)) {             // yakalandın: herkes başa
    yakalanma++; oyuncu = merkez(1, 1); yol = [];
    for (const m of muhafizlar) { Object.assign(m.kt, { durum: 'devriye', farkindalik: 0, sesDuydu: false, sonGorulen: null }); m.yol = []; m.hedef = null; }
  }
}

/* ---------- 7) p5.js: kurulum, girdi, çizim ---------- */
function setup() { createCanvas(GW * CS, GH * CS + 34).parent(document.querySelector('main') || document.body); bastan(); }
function mousePressed() { if (mouseY < GH * CS && mouseX >= 0 && mouseX < width) { const [sx, sy] = hucre(oyuncu); yol = astar(sx, sy, floor(mouseX / CS), floor(mouseY / CS)); } }
function keyPressed() { if (key === 'x' || key === 'X') tasAt(mouseX, mouseY); if (key === 'r' || key === 'R') bastan(); }

const RENK = { devriye: [70, 120, 230], incele: [235, 170, 40], kovala: [225, 60, 70] };

function draw() {
  guncelle(min(0.05, deltaTime / 1000));
  background(250); noStroke();
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { fill(HARITA[y][x] === '#' ? 74 : 239, HARITA[y][x] === '#' ? 79 : 233, HARITA[y][x] === '#' ? 99 : 220); rect(x * CS, y * CS, CS - 1, CS - 1); }
  fill(altinlar.length ? color(200, 217, 196) : color(60, 180, 90)); rect(cikis[0] * CS + 4, cikis[1] * CS + 4, CS - 9, CS - 9);
  fill(240, 180, 30); for (const [x, y] of altinlar) circle(x * CS + CS / 2, y * CS + CS / 2, 14);
  if (ses) { noFill(); stroke(240, 180, 30); strokeWeight(2); circle(ses.p.x, ses.p.y, 2 * ses.r * min(1, ses.t / 0.3)); noStroke(); }

  for (const m of muhafizlar) {
    const c = RENK[m.kt.durum], a = m.yon.heading();
    fill(c[0], c[1], c[2], 34); arc(m.p.x, m.p.y, 2 * GORUS, 2 * GORUS, a - radians(YARIM_ACI), a + radians(YARIM_ACI), PIE);   // görüş konisi
    if (m.yol.length) { stroke(c); strokeWeight(1.5); noFill(); drawingContext.setLineDash([4, 4]); beginShape(); vertex(m.p.x, m.p.y); for (const q of m.yol) vertex(q.x, q.y); endShape(); drawingContext.setLineDash([]); }
    if (m.kt.sonGorulen) { const q = merkez(...m.kt.sonGorulen); stroke(c); strokeWeight(2); line(q.x - 6, q.y - 6, q.x + 6, q.y + 6); line(q.x + 6, q.y - 6, q.x - 6, q.y + 6); }   // son görülen/duyulan yer
    stroke(255); strokeWeight(2); fill(c); circle(m.p.x, m.p.y, 20); noStroke();
    fill(0, 40); rect(m.p.x - 14, m.p.y - 24, 28, 5);                                                                       // farkındalık çubuğu
    fill(m.kt.farkindalik >= 1 ? RENK.kovala : m.kt.farkindalik >= 0.4 ? RENK.incele : [60, 180, 90]); rect(m.p.x - 14, m.p.y - 24, 28 * min(1, m.kt.farkindalik), 5);
    fill(c); textAlign(CENTER); textSize(11); text(m.kt.durum, m.p.x, m.p.y + 24);
  }
  if (yol.length) { stroke(60, 180, 90); strokeWeight(2); noFill(); beginShape(); vertex(oyuncu.x, oyuncu.y); for (const q of yol) vertex(q.x, q.y); endShape(); }
  stroke(255); strokeWeight(2); fill(60, 180, 90); circle(oyuncu.x, oyuncu.y, 18); noStroke();

  fill(40); textAlign(LEFT); textSize(14);
  text(`altın ${5 - altinlar.length}/5   taş (X) ${tas}   yakalanma ${yakalanma}   ` + (kazandin ? '🎉 KAÇTIN!  (R: baştan)' : altinlar.length ? 'tıkla: yürü · X: taş at' : 'şimdi ÇIKIŞ’a!'), 10, GH * CS + 22);
}
