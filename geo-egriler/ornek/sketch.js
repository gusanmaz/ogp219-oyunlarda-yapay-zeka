// Pist, araba ve kamera — Catmull–Rom eğrisi, yay uzunluğu tablosu, kare hızından bağımsız kamera, yumuşatma (p5.js)
const NOKTALAR = [[200, 300], [260, 120], [620, 90], [760, 330], [1080, 140], [1420, 220], [1380, 620], [1040, 760],
                  [820, 560], [520, 780], [220, 700]];             // pistin geçtiği noktalar (dünya koordinatı)
const DUNYA_W = 1600, DUNYA_H = 900, ORNEK = 24;                   // her parçada 24 örnek
let tablo = [0], toplam = 0;                                       // yay uzunluğu tablosu
let yol = 0, hiz = 260, tur = 0, turAni = -9;                      // araba: pist boyunca gidilen mesafe (piksel)
let kamera = { x: 200, y: 300 }, yumusakKamera = true, sabitHiz = true;

// ---------- temel taşlar ----------
const lerpS = (a, b, t) => a + (b - a) * t;
function catmull(p0, p1, p2, p3, t) {                              // p1 ile p2 arasında; p0 ve p3 komşular
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}
function pistNoktasi(u) {                                          // u: 0 .. nokta sayısı (kapalı pist)
  const n = NOKTALAR.length, i = floor(u) % n, t = u - floor(u), al = k => NOKTALAR[((i + k) % n + n) % n];
  return [catmull(al(-1)[0], al(0)[0], al(1)[0], al(2)[0], t), catmull(al(-1)[1], al(0)[1], al(1)[1], al(2)[1], t)];
}
function tabloyuKur() {                                            // eğriyi küçük doğrulara böl, uzunlukları biriktir
  const N = NOKTALAR.length * ORNEK; let onceki = pistNoktasi(0);
  for (let k = 1; k <= N; k++) {
    const p = pistNoktasi(k / ORNEK);
    tablo.push(tablo[k - 1] + dist(p[0], p[1], onceki[0], onceki[1])); onceki = p;
  }
  toplam = tablo[N];
}
function mesafedenU(s) {                                           // "pistin s'inci pikseli hangi u?" → ikili arama
  let alt = 0, ust = tablo.length - 1;
  while (ust - alt > 1) { const orta = (alt + ust) >> 1; if (tablo[orta] <= s) alt = orta; else ust = orta; }
  return (alt + (s - tablo[alt]) / (tablo[ust] - tablo[alt])) / ORNEK;
}
const yaklas = (x, hedef, yariOmur, dt) => lerpS(x, hedef, 1 - pow(2, -dt / yariOmur));   // kare hızından bağımsız
const tasipDon = t => 1 + 2.70158 * pow(t - 1, 3) + 1.70158 * pow(t - 1, 2);              // "back" yumuşatması

function setup() { createCanvas(720, 420); textFont('monospace', 13); tabloyuKur(); }

function keyPressed() {
  if (key === 'k' || key === 'K') yumusakKamera = !yumusakKamera;
  if (key === 'h' || key === 'H') sabitHiz = !sabitHiz;
}

function draw() {
  const dt = min(deltaTime / 1000, 0.05);
  hiz = constrain(hiz + ((keyIsDown(87) ? 1 : 0) - (keyIsDown(83) ? 1 : 0)) * 300 * dt, 60, 700);
  yol += hiz * dt;
  if (yol >= toplam) { yol -= toplam; tur++; turAni = millis(); }

  // arabanın yeri: sabit hızda tablo üzerinden; değilse u doğrudan mesafeyle orantılı (hız dalgalanır)
  const u = sabitHiz ? mesafedenU(yol) : yol / toplam * NOKTALAR.length;
  const [ax, ay] = pistNoktasi(u), [bx, by] = pistNoktasi(u + 0.02);

  // kamera: arabaya doğru yumuşakça yaklaş (ya da sert yapış)
  kamera.x = yumusakKamera ? yaklas(kamera.x, ax, 0.18, dt) : ax;
  kamera.y = yumusakKamera ? yaklas(kamera.y, ay, 0.18, dt) : ay;

  background(238, 240, 232);
  push(); translate(width / 2 - kamera.x, height / 2 - kamera.y);  // dünyayı kameraya göre kaydır
  stroke(200, 202, 214); strokeWeight(46); noFill(); beginShape();
  for (let k = 0; k <= NOKTALAR.length * ORNEK; k++) vertex(...pistNoktasi(k / ORNEK)); endShape();
  stroke(255); strokeWeight(2); for (let s = 0; s < toplam; s += 40) point(...pistNoktasi(mesafedenU(s)));   // eşit aralıklı şerit
  noStroke(); fill(60); NOKTALAR.forEach(p => circle(p[0], p[1], 8));
  translate(ax, ay); rotate(atan2(by - ay, bx - ax)); fill(214, 60, 60); rect(-16, -9, 32, 18, 4); fill(255); rect(4, -6, 7, 12);
  pop();

  // tur yazısı: 0,5 saniyede "taşıp dönerek" büyür
  const gecen = (millis() - turAni) / 1000;
  if (gecen < 1.6) { const o = tasipDon(constrain(gecen / 0.5, 0, 1)); push(); translate(width / 2, 90); scale(o); textAlign(CENTER, CENTER); textSize(40); fill(40, 120, 220); noStroke(); text('TUR ' + tur, 0, 0); pop(); }
  fill(40); noStroke(); textSize(13); textAlign(LEFT, BASELINE);
  text(`hız ${hiz.toFixed(0)} piksel/sn   pist ${toplam.toFixed(0)} piksel   [K] kamera: ${yumusakKamera ? 'yumuşak' : 'sert'}   [H] sabit hız: ${sabitHiz ? 'AÇIK' : 'kapalı'}`, 10, 20);
}
