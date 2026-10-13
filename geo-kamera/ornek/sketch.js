// İyi bir 2B kamera — pencere, ileri bakma, platforma oturma, yumuşatma, sınırlar ve travma tabanlı sarsıntı (p5.js)
const SEVIYE_W = 2600, SEVIYE_H = 620;
const PLATFORMLAR = [[0, 560, 2600, 60], [260, 470, 160, 16], [470, 390, 150, 16], [700, 310, 170, 16], [960, 420, 150, 16],
                     [1180, 500, 120, 16], [1380, 400, 150, 16], [1600, 300, 150, 16], [1820, 210, 170, 16], [2080, 330, 150, 16], [2300, 450, 160, 16]];
let o = { x: 120, y: 520, w: 22, h: 40, vx: 0, vy: 0, yerde: true, yon: 1 };
let kamera = { x: 360, y: 400 }, zemin = 520, ileri = 0, travma = 0;
let ayar = { pencere: true, ileri: true, otur: true, yumusak: true, sinir: true };

const yaklas = (x, hedef, yariOmur, dt) => lerp(x, hedef, 1 - pow(2, -dt / yariOmur));     // G6: kare hızından bağımsız
const carpan = k => PLATFORMLAR.find(p => k.x < p[0] + p[2] && p[0] < k.x + k.w && k.y < p[1] + p[3] && p[1] < k.y + k.h);

function setup() { createCanvas(720, 400); textFont('monospace', 13); }

function keyPressed() {
  if (key >= '1' && key <= '5') { const ad = ['pencere', 'ileri', 'otur', 'yumusak', 'sinir'][key - 1]; ayar[ad] = !ayar[ad]; }
  if ((key === 'x' || key === 'X') && o.yerde) travma = min(1, travma + 0.5);              // yere vur: sarsıntı
}

function oyuncuyuGuncelle(dt) {
  o.vx = ((keyIsDown(68) ? 1 : 0) - (keyIsDown(65) ? 1 : 0)) * 300; if (o.vx) o.yon = Math.sign(o.vx);
  if (keyIsDown(87) && o.yerde) { o.vy = -760; o.yerde = false; }
  o.vy += 2100 * dt; o.x = constrain(o.x + o.vx * dt, 0, SEVIYE_W - o.w);
  const eskiY = o.y; o.y += o.vy * dt; o.yerde = false;
  const p = carpan(o);
  if (p && o.vy > 0 && eskiY + o.h <= p[1] + 1) { if (o.vy > 900) travma = min(1, travma + 0.25); o.y = p[1] - o.h; o.vy = 0; o.yerde = true; }   // sert iniş de sarsar
}

function kamerayiGuncelle(dt) {
  const ox = o.x + o.w / 2, oy = o.y + o.h / 2;
  let hx = kamera.x, hy;

  // 1) İLERİ BAKMA: odak, karakterin gidiş yönünde biraz önünde
  ileri = ayar.ileri ? (o.vx ? yaklas(ileri, o.yon * 170, 0.25, dt) : ileri) : 0;
  const odakX = ox + ileri;

  // 2) KAMERA PENCERESİ: odak pencerenin (±60) içindeyse kamera kıpırdamaz; kenarı iterse kayar
  if (ayar.pencere) { if (odakX > hx + 60) hx = odakX - 60; else if (odakX < hx - 60) hx = odakX + 60; }
  else hx = odakX;

  // 3) PLATFORMA OTURMA: dikeyde yalnızca karakter bir yere bastığında (ya da çok uzaklaştığında) izle
  if (ayar.otur) { if (o.yerde) zemin = oy; else if (oy > zemin + 90) zemin = oy - 90; else if (oy < zemin - 170) zemin = oy + 170; hy = zemin - 50; }
  else hy = oy - 50;

  // 4) YUMUŞATMA
  kamera.x = ayar.yumusak ? yaklas(kamera.x, hx, 0.06, dt) : hx;
  kamera.y = ayar.yumusak ? yaklas(kamera.y, hy, 0.14, dt) : hy;

  // 5) SEVİYE SINIRLARI: kamera seviyenin dışını göstermesin
  if (ayar.sinir) { kamera.x = constrain(kamera.x, width / 2, SEVIYE_W - width / 2); kamera.y = constrain(kamera.y, height / 2, SEVIYE_H - height / 2); }
}

function draw() {
  const dt = min(deltaTime / 1000, 0.033);
  oyuncuyuGuncelle(dt); kamerayiGuncelle(dt);

  // SARSINTI: travma sönüyor; kayma = en büyük kayma × travma² × yumuşak gürültü
  travma = max(0, travma - 0.9 * dt);
  const s = travma * travma, t = millis() / 1000;
  const kayX = 26 * s * (noise(t * 22) * 2 - 1), kayY = 26 * s * (noise(100 + t * 22) * 2 - 1), don = 0.07 * s * (noise(200 + t * 22) * 2 - 1);

  background(17);
  push();
  translate(width / 2 + kayX, height / 2 + kayY); rotate(don);            // sarsıntı EN SON eklenir; kameranın kendisini değiştirmez
  translate(-kamera.x, -kamera.y);                                        // dünya → ekran
  noStroke(); fill(223, 233, 245); rect(0, 0, SEVIYE_W, SEVIYE_H);
  fill(207, 220, 236); for (let x = 0; x < SEVIYE_W; x += 130) rect(x + 20, 500 - (x * 7 % 90), 46, 60 + (x * 7 % 90));
  fill(91, 96, 120); for (const p of PLATFORMLAR) rect(p[0], p[1], p[2], p[3]);
  fill(40, 170, 110); rect(o.x, o.y, o.w, o.h, 3); fill(255); rect(o.x + (o.yon > 0 ? 13 : 3), o.y + 8, 6, 6);
  pop();

  fill(255); noStroke();
  text(`A/D yürü  W zıpla  X yere vur   [1] pencere ${ayar.pencere ? '✔' : '—'}  [2] ileri bakma ${ayar.ileri ? '✔' : '—'}  [3] platforma oturma ${ayar.otur ? '✔' : '—'}`, 10, 18);
  text(`[4] yumuşatma ${ayar.yumusak ? '✔' : '—'}  [5] sınırlar ${ayar.sinir ? '✔' : '—'}   travma ${travma.toFixed(2)}`, 10, 36);
}
