// Zıplama laboratuvarı — sabit zaman adımı, tasarımcı dostu zıplama, çakal süresi, zıplama tamponu (p5.js)
const KARO = 32;
const HARITA = ['........................', '........................', '........................', '....................###.',
                '........................', '...............###......', '........................', '.........###............',
                '........................', '#####..........#####..##', '#####..........#####..##'];

// --- tasarımcının sayıları: "kaç karo yükseğe" ve "tepeye kaç saniyede" ---
const YUKSEKLIK = 3.2 * KARO, TEPE_SURESI = 0.38;
const G  = 2 * YUKSEKLIK / (TEPE_SURESI * TEPE_SURESI);   // yerçekimi (piksel/sn²)
const V0 = 2 * YUKSEKLIK / TEPE_SURESI;                   // zıplama hızı (piksel/sn)
const DUSUS_CARPANI = 1.8, CAKAL = 0.1, TAMPON = 0.12, YURUME = 7.5 * KARO;

const DT = 1 / 120;                                       // fizik adımı: her makinede aynı
let biriken = 0, cakal = 0, tampon = 0, iz = [];
let o = { x: 40, y: 9 * KARO - 28, w: 18, h: 28, vx: 0, vy: 0, yerde: false, zipliyor: false };
let ayar = { cakal: true, tampon: true, degisken: true }, kurtarma = 0, dusme = 0, ses;

function setup() {
  createCanvas(HARITA[0].length * KARO, HARITA.length * KARO); textFont('monospace', 13);
}

function bip(frekans) {                                   // küçük bir zıplama sesi (Web Audio)
  ses = ses || new AudioContext();
  const osc = ses.createOscillator(), kazanc = ses.createGain();
  osc.type = 'square'; osc.frequency.value = frekans; kazanc.gain.setValueAtTime(0.08, ses.currentTime);
  kazanc.gain.exponentialRampToValueAtTime(0.001, ses.currentTime + 0.12);
  osc.connect(kazanc).connect(ses.destination); osc.start(); osc.stop(ses.currentTime + 0.12);
}

function kati(x, y) { const s = HARITA[floor(y / KARO)]; return !!s && s[floor(x / KARO)] === '#'; }
function carpiyor(k) {                                    // kutunun köşeleri ve kenar ortaları katı bir karoda mı?
  const sag = k.x + k.w - 0.001, alt = k.y + k.h - 0.001, orta = k.y + k.h / 2;
  return kati(k.x, k.y) || kati(sag, k.y) || kati(k.x, alt) || kati(sag, alt) || kati(k.x, orta) || kati(sag, orta);
}

function keyPressed() {
  if (key === 'w' || key === 'W' || key === ' ') { tampon = TAMPON; return false; }   // basışı HATIRLA
  if (key === '1') ayar.cakal = !ayar.cakal;
  if (key === '2') ayar.tampon = !ayar.tampon;
  if (key === '3') ayar.degisken = !ayar.degisken;
}
const ziplaTusu = () => keyIsDown(87) || keyIsDown(32);

function fizikAdimi(dt) {
  o.vx = ((keyIsDown(68) ? 1 : 0) - (keyIsDown(65) ? 1 : 0)) * YURUME;

  // --- zıplama kararı ---
  cakal  = o.yerde ? CAKAL : cakal - dt;                  // yerden ayrılınca geri sayım başlar
  tampon -= dt;
  const basildi  = ayar.tampon ? tampon > 0 : tampon > TAMPON - 1.5 * dt;   // tampon kapalıysa yalnızca "tam şimdi"
  const izinli   = o.yerde || (ayar.cakal && cakal > 0 && !o.zipliyor);
  if (basildi && izinli) {
    if (!o.yerde) kurtarma++;
    o.vy = -V0; o.yerde = false; o.zipliyor = true; cakal = 0; tampon = 0; iz = [];
    bip(520);
  }
  if (ayar.degisken && o.zipliyor && o.vy < 0 && !ziplaTusu()) { o.vy *= 0.5; o.zipliyor = false; }   // tuş erken bırakıldı

  // --- hareket: yarı-örtük Euler (önce hız, sonra konum), eksen eksen çarpışma (G3) ---
  o.vy += G * (o.vy > 0 ? DUSUS_CARPANI : 1) * dt;        // düşerken daha ağır
  o.x += o.vx * dt;
  if (carpiyor(o)) o.x = o.vx > 0 ? floor((o.x + o.w) / KARO) * KARO - o.w : (floor(o.x / KARO) + 1) * KARO;
  o.y += o.vy * dt; o.yerde = false;
  if (carpiyor(o)) {
    if (o.vy > 0) { o.y = floor((o.y + o.h) / KARO) * KARO - o.h; o.yerde = true; o.zipliyor = false; }
    else o.y = (floor(o.y / KARO) + 1) * KARO;
    o.vy = 0;
  }
  o.x = constrain(o.x, 0, width - o.w);
  if (o.y > height + 80) { o.x = 40; o.y = 9 * KARO - 28; o.vy = 0; dusme++; }
  if (!o.yerde) iz.push([o.x + o.w / 2, o.y + o.h]);
}

function draw() {
  // --- sabit zaman adımı: kare ne kadar sürerse sürsün fizik hep DT'lik adımlarla ilerler ---
  biriken += min(deltaTime / 1000, 0.25);                 // dev kareleri kırp ("ölüm sarmalı"na karşı)
  while (biriken >= DT) { fizikAdimi(DT); biriken -= DT; }

  background(246, 244, 238); noStroke();
  for (let y = 0; y < HARITA.length; y++) for (let x = 0; x < HARITA[0].length; x++)
    if (HARITA[y][x] === '#') { fill(91, 96, 120); rect(x * KARO, y * KARO, KARO - 1, KARO - 1); }
  fill(150, 90, 210); for (let i = 0; i < iz.length; i += 4) circle(iz[i][0], iz[i][1], 4);
  fill(!o.yerde && cakal > 0 && !o.zipliyor ? color(240, 170, 40) : color(40, 170, 110)); rect(o.x, o.y, o.w, o.h, 3);
  fill(40); text(`g = 2h/t² = ${G.toFixed(0)} px/sn²   v0 = 2h/t = ${V0.toFixed(0)} px/sn   fizik adımı 1/120 sn   ${frameRate().toFixed(0)} FPS`, 10, 18);
  text(`[1] çakal süresi: ${ayar.cakal ? 'AÇIK' : 'kapalı'}   [2] tampon: ${ayar.tampon ? 'AÇIK' : 'kapalı'}   [3] değişken yükseklik: ${ayar.degisken ? 'AÇIK' : 'kapalı'}   kenardan kurtarma: ${kurtarma}   düşme: ${dusme}`, 10, 36);
}
