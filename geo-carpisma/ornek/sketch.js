// Mini platform oyunu: çarpışma TESPİTİ + ÇÖZÜMÜ (p5.js)
// A / D: yürü · W: zıpla · X: atıl (çok hızlı) · C: sürekli tespiti aç/kapa · H: çarpışma kutularını göster

const KARO = 32;
const HARITA = [
  '......................',
  '..........o...........',
  '........#####......o..',
  '......................',
  '...o.###.........###..',
  '......................',
  '##############..######'
];
let oyuncu, duvarlar = [], altinlar = [], puan = 0, surekli = true, kutular = false, tunel = 0;

function setup() {
  createCanvas(HARITA[0].length * KARO, HARITA.length * KARO).parent(document.querySelector('main') || document.body);
  HARITA.forEach((satir, y) => [...satir].forEach((ch, x) => {
    if (ch === '#') duvarlar.push({ x: x * KARO, y: y * KARO, w: KARO, h: KARO });
    if (ch === 'o') altinlar.push({ x: x * KARO + 16, y: y * KARO + 16, r: 8 });
  }));
  duvarlar.push({ x: 12 * KARO + 13, y: 3 * KARO, w: 6, h: 3 * KARO, ince: true });   // ince duvar: tünelleme deneyi
  oyuncu = { x: 40, y: 100, w: 20, h: 28, vx: 0, vy: 0, yerde: false, atilma: 0, yon: 1 };
}

/* ---------- TESPİT: kutu–kutu ve daire–kutu ---------- */
function carpan(o) {                                   // o'nun çakıştığı ilk duvar
  return duvarlar.find(d => o.x < d.x + d.w && d.x < o.x + o.w && o.y < d.y + d.h && d.y < o.y + o.h);
}
function daireKutu(c, b) {                             // merkezi kutuya kıstır; en yakın nokta dairede mi?
  const px = constrain(c.x, b.x, b.x + b.w), py = constrain(c.y, b.y, b.y + b.h);
  return (px - c.x) ** 2 + (py - c.y) ** 2 < c.r * c.r;
}

/* ---------- ÇÖZÜM: önce x'te ilerle ve çöz, sonra y'de ---------- */
function hareket(o, dt) {
  if (o.atilma > 0) { o.atilma -= dt; o.vx = o.yon * 6000; o.vy = 0; }      // atılma: karede 100 piksel!
  else o.vy += 900 * dt;                                                    // yerçekimi
  let dx = o.vx * dt, dy = o.vy * dt;

  // SÜREKLİ TESPİT: hareketi en çok 4 piksellik alt adımlara böl (kapalıysa tek adım)
  const adim = surekli ? max(1, ceil(max(abs(dx), abs(dy)) / 4)) : 1;
  dx /= adim; dy /= adim;
  o.yerde = false;
  for (let i = 0; i < adim; i++) {
    o.x += dx;                                                              // 1) yalnızca x
    let d = carpan(o);
    if (d) { o.x = dx > 0 ? d.x - o.w : d.x + d.w; o.vx = 0; o.atilma = 0; }
    o.y += dy;                                                              // 2) yalnızca y
    d = carpan(o);
    if (d) {
      if (dy > 0) { o.y = d.y - o.h; o.yerde = true; } else o.y = d.y + d.h;
      o.vy = 0;
    }
  }
  o.x = constrain(o.x, 0, width - o.w);
}

function keyPressed() {
  if (key === 'x' || key === 'X') { if (oyuncu.atilma <= 0) oyuncu.atilma = 0.05; }
  if (key === 'c' || key === 'C') surekli = !surekli;
  if (key === 'h' || key === 'H') kutular = !kutular;
}

function guncelle(dt) {
  const yon = (keyIsDown(68) ? 1 : 0) - (keyIsDown(65) ? 1 : 0);            // D ve A
  if (yon) oyuncu.yon = yon;
  if (oyuncu.atilma <= 0) oyuncu.vx = yon * 180;
  if (keyIsDown(87) && oyuncu.yerde) oyuncu.vy = -430;                      // W: zıpla
  const ince = duvarlar[duvarlar.length - 1], solda = oyuncu.x + oyuncu.w <= ince.x;
  hareket(oyuncu, dt);
  if (solda && oyuncu.x >= ince.x + ince.w && oyuncu.y + oyuncu.h > ince.y) tunel++;   // duvarın içinden geçti!
  if (oyuncu.y > height) { oyuncu.x = 40; oyuncu.y = 100; oyuncu.vy = 0; }  // düştü: baştan
  altinlar = altinlar.filter(a => { const aldi = daireKutu(a, oyuncu); if (aldi) puan++; return !aldi; });
}

function draw() {
  guncelle(min(deltaTime / 1000, 1 / 30));
  background(245); noStroke();
  for (const d of duvarlar) { fill(d.ince ? color(150, 90, 220) : 90); rect(d.x, d.y, d.w, d.h); }
  fill(240, 180, 30); for (const a of altinlar) circle(a.x, a.y, 2 * a.r);
  fill(oyuncu.atilma > 0 ? color(225, 60, 70) : color(60, 180, 90)); rect(oyuncu.x, oyuncu.y, oyuncu.w, oyuncu.h);
  if (kutular) {                                                            // hata ayıklama: çarpışma kutuları
    noFill(); stroke(255, 0, 0); strokeWeight(1);
    for (const d of duvarlar) rect(d.x, d.y, d.w, d.h);
    for (const a of altinlar) circle(a.x, a.y, 2 * a.r);
    rect(oyuncu.x, oyuncu.y, oyuncu.w, oyuncu.h); noStroke();
  }
  fill(0); textSize(14);
  text('altın ' + puan + '/4 · tünelleme ' + tunel + ' · sürekli tespit: ' + (surekli ? 'AÇIK' : 'KAPALI') +
       '   (A/D yürü · W zıpla · X atıl · C sürekli tespit · H kutular)', 10, 20);
}
