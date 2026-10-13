// Geometri oyun alanı (p5.js): dört fonksiyon, hepsi çapraz çarpım
// Tıkla: nokta ekle · C: temizle · fareyi zarfın içine sokun

let noktalar = [];

/* ---------- 1) yön testi ---------- */
function cross(a, b, c) {                       // a → b yönüne göre c nerede?
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/* ---------- 2) iki doğru parçası kesişiyor mu? ---------- */
function onSegment(a, b, p) {
  return min(a.x, b.x) <= p.x && p.x <= max(a.x, b.x) && min(a.y, b.y) <= p.y && p.y <= max(a.y, b.y);
}
function segmentsIntersect(a, b, c, d) {
  const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b);
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  return (d1 === 0 && onSegment(a, b, c)) || (d2 === 0 && onSegment(a, b, d)) ||
         (d3 === 0 && onSegment(c, d, a)) || (d4 === 0 && onSegment(c, d, b));
}

/* ---------- 3) nokta çokgenin içinde mi? (ışın atma) ---------- */
function inside(p, poly) {
  let ic = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < a.x + (p.y - a.y) * (b.x - a.x) / (b.y - a.y)) ic = !ic;
  }
  return ic;
}

/* ---------- 4) alan (ayakkabı bağı) ---------- */
function polygonArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a.x * b.y - b.x * a.y; }
  return abs(s) / 2;
}

/* ---------- 5) dışbükey zarf (monoton zincir) ---------- */
function convexHull(points) {
  const P = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (P.length < 3) return P;
  const zincir = dizi => {
    const h = [];
    for (const p of dizi) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();   // içe kıvrılanı at
      h.push(p);
    }
    h.pop();
    return h;
  };
  return zincir(P).concat(zincir(P.slice().reverse()));
}

/* ---------- p5.js ---------- */
function setup() {
  createCanvas(720, 420).parent(document.querySelector('main') || document.body);
  randomSeed(3);
  for (let i = 0; i < 12; i++) noktalar.push({ x: random(120, 600), y: random(70, 350) });
}
function mousePressed() { if (mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height) noktalar.push({ x: mouseX, y: mouseY }); }
function keyPressed() { if (key === 'c' || key === 'C') noktalar = []; }

function draw() {
  background(250);
  const zarf = convexHull(noktalar), fare = { x: mouseX, y: mouseY };
  const icerde = zarf.length >= 3 && inside(fare, zarf);

  fill(icerde ? color(60, 180, 90, 60) : color(0, 12)); stroke(40); strokeWeight(2);
  beginShape(); for (const p of zarf) vertex(p.x, p.y); endShape(CLOSE);

  // fareden sağa giden ışın, zarfın hangi kenarlarını kesiyor?
  const uzak = { x: width + 10, y: fare.y }; let kesisim = 0;
  for (let i = 0; i < zarf.length; i++) {
    const a = zarf[i], b = zarf[(i + 1) % zarf.length];
    if (zarf.length >= 3 && segmentsIntersect(fare, uzak, a, b)) { kesisim++; stroke(220, 40, 60); strokeWeight(5); line(a.x, a.y, b.x, b.y); }
  }
  stroke(150, 90, 220); strokeWeight(1.5); drawingContext.setLineDash([6, 5]); line(fare.x, fare.y, uzak.x, uzak.y); drawingContext.setLineDash([]);

  noStroke();
  for (const p of noktalar) { fill(zarf.includes(p) ? 'crimson' : 130); circle(p.x, p.y, 10); }
  fill(40); textSize(14);
  text('nokta ' + noktalar.length + ' · zarf köşesi ' + zarf.length + ' · alan ' + round(polygonArea(zarf)) +
       ' · ışın ' + kesisim + ' kenar kesiyor → ' + (icerde ? 'İÇERİDE' : 'dışarıda'), 10, 22);
}
