// 1.500 topu çarpıştırmak: uzaysal hash ızgarası (p5.js)
// G: ızgarayı aç/kapa (kapalıyken kaba kuvvet) · fareyle tıkla: o noktadaki topları it

const R = 4, HUCRE = 16, N = 1500;
let toplar = [], izgara, testSayisi = 0, kullan = true;

class Izgara {
  constructor(hucreBoyu) { this.s = hucreBoyu; this.hucreler = new Map(); }
  temizle() { this.hucreler.clear(); }
  ekle(nesne) {
    const k = floor(nesne.x / this.s) + ',' + floor(nesne.y / this.s);     // hangi hücre?
    if (!this.hucreler.has(k)) this.hucreler.set(k, []);
    this.hucreler.get(k).push(nesne);
  }
  yakindakiler(x, y, r) {                                                  // ADAYLAR: belki yakın
    const sonuc = [];
    for (let cx = floor((x - r) / this.s); cx <= floor((x + r) / this.s); cx++)
      for (let cy = floor((y - r) / this.s); cy <= floor((y + r) / this.s); cy++) {
        const liste = this.hucreler.get(cx + ',' + cy);
        if (liste) for (const n of liste) sonuc.push(n);
      }
    return sonuc;
  }
}

function setup() {
  createCanvas(720, 420).parent(document.querySelector('main') || document.body);
  izgara = new Izgara(HUCRE);
  randomSeed(1);
  for (let i = 0; i < N; i++)
    toplar.push({ x: random(R, width - R), y: random(R, height - R), vx: random(-1.5, 1.5), vy: random(-1.5, 1.5), carpti: false });
}

function keyPressed() { if (key === 'g' || key === 'G') kullan = !kullan; }

function mousePressed() {                                  // patlama: yalnızca yakındaki hücrelere bakılır
  for (const t of izgara.yakindakiler(mouseX, mouseY, 60)) {
    const dx = t.x - mouseX, dy = t.y - mouseY, d = max(1, sqrt(dx * dx + dy * dy));
    if (d < 60) { t.vx += (dx / d) * 4; t.vy += (dy / d) * 4; }
  }
}

function adim() {
  testSayisi = 0;
  for (const t of toplar) {
    t.x += t.vx; t.y += t.vy; t.carpti = false;
    t.vx *= 0.995; t.vy *= 0.995;
    if (t.x < R) { t.x = R; t.vx *= -1; } else if (t.x > width - R) { t.x = width - R; t.vx *= -1; }
    if (t.y < R) { t.y = R; t.vy *= -1; } else if (t.y > height - R) { t.y = height - R; t.vy *= -1; }
  }
  izgara.temizle();
  for (const t of toplar) izgara.ekle(t);                  // her kare baştan kur: N ekleme
  let carpisan = 0;
  for (const t of toplar) {
    const adaylar = kullan ? izgara.yakindakiler(t.x, t.y, 2 * R) : toplar;
    for (const u of adaylar) {
      if (u === t) continue;
      testSayisi++;
      if ((t.x - u.x) ** 2 + (t.y - u.y) ** 2 < 4 * R * R) t.carpti = true;   // kesin test (dar aşama)
    }
    if (t.carpti) carpisan++;
  }
  return carpisan;
}

function draw() {
  const carpisan = adim();
  background(250); noStroke();
  for (const t of toplar) { fill(t.carpti ? 'crimson' : 90); circle(t.x, t.y, 2 * R); }
  fill(255, 230); rect(0, 0, width, 30);
  fill(0); textSize(14);
  text((kullan ? 'IZGARA' : 'KABA KUVVET') + '  ·  bu kare ' + testSayisi.toLocaleString('tr') + ' test  ·  çarpışan ' + carpisan +
       '  ·  FPS ' + round(frameRate()) + '   (G: değiştir, tıkla: patlat)', 10, 20);
}
