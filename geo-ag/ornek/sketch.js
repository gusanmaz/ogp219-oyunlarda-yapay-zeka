// Tek sayfada sahte ağ: yetkili sunucu, istemci tahmini + uzlaştırma, rakip için ara değerleme (p5.js)
// Gerçek ağ yok: "gönderilen" her mesaj bir kuyruğa konur ve GECIKME kadar sonra teslim edilir.
let GECIKME = 0.15;                       // tek yön (saniye)
const SUNUCU_HZ = 10, TAMPON = 0.15, HIZ = 220;
let tahmin = true, uzlastirma = true, araDegerleme = true;

let zaman = 0, sunucuyaGiden = [], istemciyeGelen = [];
let sunucu = { ben: 200, sonIslenen: 0, rakip: 500, sonrakiYayin: 0 };
let ben = 200, sira = 0, bekleyen = [], rakipPaketleri = [], sicrama = 0;

const uygula = (x, dx) => constrain(x + dx, 20, 700);       // hareket kuralı: istemci ve sunucu AYNI fonksiyonu kullanır
const gonder = (kuyruk, mesaj) => kuyruk.push({ varis: zaman + GECIKME, mesaj });
function teslimAl(kuyruk) {                                // vakti gelen mesajları kuyruktan çıkar
  const gelen = kuyruk.filter(k => k.varis <= zaman).map(k => k.mesaj);
  for (let i = kuyruk.length - 1; i >= 0; i--) if (kuyruk[i].varis <= zaman) kuyruk.splice(i, 1);
  return gelen;
}

function setup() { createCanvas(720, 400); textFont('monospace', 13); }

function keyPressed() {
  if (key === '1') tahmin = !tahmin;
  if (key === '2') uzlastirma = !uzlastirma;
  if (key === '3') araDegerleme = !araDegerleme;
  if (key === '+' || key === '=') GECIKME = min(0.5, GECIKME + 0.05);
  if (key === '-') GECIKME = max(0, GECIKME - 0.05);
}

function draw() {
  const dt = min(deltaTime / 1000, 0.05); zaman += dt;

  // ---------- İSTEMCİ: girdiyi oku, numarala, yolla; beklemeden kendi üzerinde uygula ----------
  const yon = (keyIsDown(68) ? 1 : 0) - (keyIsDown(65) ? 1 : 0);
  if (yon !== 0) {
    const girdi = { sira: ++sira, dx: yon * HIZ * dt };
    gonder(sunucuyaGiden, girdi);
    if (tahmin) { ben = uygula(ben, girdi.dx); bekleyen.push(girdi); }           // TAHMİN
  }

  // ---------- SUNUCU: girdileri uygula (tek yetkili), rakibi yürüt, saniyede 10 kez durum yayınla ----------
  for (const g of teslimAl(sunucuyaGiden)) { sunucu.ben = uygula(sunucu.ben, g.dx); sunucu.sonIslenen = g.sira; }
  sunucu.rakip = 360 + 250 * sin(zaman * 1.3);
  if (zaman >= sunucu.sonrakiYayin) {
    gonder(istemciyeGelen, { t: zaman, ben: sunucu.ben, sonIslenen: sunucu.sonIslenen, rakip: sunucu.rakip });
    sunucu.sonrakiYayin += 1 / SUNUCU_HZ;
  }

  // ---------- İSTEMCİ: sunucudan gelen durumu işle ----------
  for (const d of teslimAl(istemciyeGelen)) {
    rakipPaketleri.push({ t: d.t, x: d.rakip }); if (rakipPaketleri.length > 30) rakipPaketleri.shift();
    const once = ben;
    if (!tahmin) ben = d.ben;
    else if (!uzlastirma) { ben = d.ben; bekleyen = []; }
    else {                                                            // UZLAŞTIRMA
      bekleyen = bekleyen.filter(g => g.sira > d.sonIslenen);         // onaylananları at
      ben = d.ben; for (const g of bekleyen) ben = uygula(ben, g.dx);             // kalanları yeniden uygula
    }
    if (tahmin && abs(ben - once) > 2) sicrama++;
  }

  // ---------- İSTEMCİ: rakibi çiz (ARA DEĞERLEME: biraz geçmişi göster) ----------
  let rakipX = rakipPaketleri.length ? rakipPaketleri[rakipPaketleri.length - 1].x : 500;
  if (araDegerleme && rakipPaketleri.length > 1) {
    const cizimAni = zaman - GECIKME - TAMPON;
    for (let i = 1; i < rakipPaketleri.length; i++) {
      const a = rakipPaketleri[i - 1], b = rakipPaketleri[i];
      if (a.t <= cizimAni && cizimAni <= b.t) rakipX = lerp(a.x, b.x, (cizimAni - a.t) / (b.t - a.t));
    }
  }

  // ---------- çizim ----------
  background(246, 244, 238); noStroke();
  fill(232, 233, 239); rect(10, 70, 700, 90, 8); rect(10, 230, 700, 90, 8);
  fill(40); text('SUNUCU (gerçek)', 18, 62); text('SİZİN EKRANINIZ', 18, 222);
  fill(240, 170, 40); rect(sunucu.ben - 14, 90, 28, 50, 4); fill(214, 60, 60); rect(sunucu.rakip - 14, 90, 28, 50, 4);
  fill(40, 170, 110); rect(ben - 14, 250, 28, 50, 4);          fill(214, 60, 60); rect(rakipX - 14, 250, 28, 50, 4);
  fill(40);
  text(`A / D yürü   gecikme ${(GECIKME * 1000).toFixed(0)} ms (+ / -)   onay bekleyen girdi ${bekleyen.length}   geri sıçrama ${sicrama}`, 10, 20);
  text(`[1] tahmin: ${tahmin ? 'AÇIK' : 'kapalı'}   [2] uzlaştırma: ${uzlastirma ? 'AÇIK' : 'kapalı'}   [3] ara değerleme: ${araDegerleme ? 'AÇIK' : 'kapalı'}`, 10, 38);
  text('yeşil: siz (tahmin edilen)   sarı: sunucudaki siz   kırmızı: rakip', 10, 350);
}
