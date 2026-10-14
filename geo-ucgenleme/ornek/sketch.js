// OGP219 · G10 Üçgenleme ve Voronoi — eksiksiz p5.js örneği
// Tıkla = nokta ekle · D = Delaunay · V = Voronoi · C = çevrel çemberler · L = 1 Lloyd adımı · R = rastgele 25 nokta

let noktalar = [], ucgenler = [];
let goster = { D: true, V: true, C: false };

function setup() {
  createCanvas(720, 420);
  rastgele(25);
}

function rastgele(n) {
  noktalar = [];
  for (let i = 0; i < n; i++) noktalar.push({ x: random(20, width - 20), y: random(20, height - 20) });
  ucgenler = delaunay(noktalar);
}

// ---------- Bowyer–Watson (sunumdaki kodun aynısı) ----------
function cevrel(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  return { x, y, r2: (a.x - x) ** 2 + (a.y - y) ** 2 };
}

function delaunay(nk) {
  const M = 1e5, P = [{ x: -M, y: -M }, { x: 2 * M, y: -M }, { x: -M, y: 2 * M }, ...nk];
  const yap = (i, j, k) => ({ v: [i, j, k], c: cevrel(P[i], P[j], P[k]) });
  let t = [yap(0, 1, 2)];
  for (let n = 3; n < P.length; n++) {
    const p = P[n];
    const kotu = t.filter(u => (p.x - u.c.x) ** 2 + (p.y - u.c.y) ** 2 < u.c.r2);
    const kenar = [];
    for (const u of kotu) for (let e = 0; e < 3; e++) {
      const a = u.v[e], b = u.v[(e + 1) % 3];
      const k = kenar.findIndex(([q, w]) => (q === b && w === a) || (q === a && w === b));
      if (k >= 0) kenar.splice(k, 1); else kenar.push([a, b]);
    }
    t = t.filter(u => !kotu.includes(u)).concat(kenar.map(([a, b]) => yap(a, b, n)));
  }
  return t.filter(u => u.v.every(i => i >= 3)).map(u => u.v.map(i => i - 3));
}

// ---------- Voronoi: her 6 × 6 piksellik kare en yakın noktanın rengini alır ----------
function enYakin(x, y) {
  let b = 0, bd = Infinity;
  for (let i = 0; i < noktalar.length; i++) {
    const d = (x - noktalar[i].x) ** 2 + (y - noktalar[i].y) ** 2;
    if (d < bd) { bd = d; b = i; }
  }
  return b;
}

// ---------- Lloyd: her noktayı kendi bölgesinin ağırlık merkezine taşı ----------
function lloyd() {
  const sx = noktalar.map(() => 0), sy = noktalar.map(() => 0), n = noktalar.map(() => 0);
  for (let y = 3; y < height; y += 6) for (let x = 3; x < width; x += 6) {
    const i = enYakin(x, y); sx[i] += x; sy[i] += y; n[i]++;
  }
  noktalar = noktalar.map((p, i) => (n[i] ? { x: sx[i] / n[i], y: sy[i] / n[i] } : p));
  ucgenler = delaunay(noktalar);
}

function draw() {
  background(250);
  noStroke(); colorMode(HSB, 360, 60, 100);
  if (goster.V) for (let y = 0; y < height; y += 6) for (let x = 0; x < width; x += 6) {
    fill((enYakin(x + 3, y + 3) * 47) % 360, 25, 98); rect(x, y, 6, 6);
  }
  colorMode(RGB);
  noFill();
  if (goster.C) { stroke(70, 120, 255, 70); for (const [a, b, c] of ucgenler) { const k = cevrel(noktalar[a], noktalar[b], noktalar[c]); circle(k.x, k.y, 2 * sqrt(k.r2)); } }
  if (goster.D) { stroke(40); strokeWeight(1.5); for (const [a, b, c] of ucgenler) triangle(noktalar[a].x, noktalar[a].y, noktalar[b].x, noktalar[b].y, noktalar[c].x, noktalar[c].y); }
  noStroke(); fill(20); for (const p of noktalar) circle(p.x, p.y, 7);
  fill(0); textSize(13);
  text(`${noktalar.length} nokta · ${ucgenler.length} üçgen   [D] Delaunay ${goster.D ? '✓' : '✗'}  [V] Voronoi ${goster.V ? '✓' : '✗'}  [C] çemberler ${goster.C ? '✓' : '✗'}  [L] Lloyd  [R] rastgele`, 10, height - 10);
}

function mousePressed() {
  if (mouseX < 0 || mouseY < 0 || mouseX > width || mouseY > height) return;
  noktalar.push({ x: mouseX, y: mouseY }); ucgenler = delaunay(noktalar);
}

function keyPressed() {
  const k = key.toUpperCase();
  if (k in goster) goster[k] = !goster[k];
  if (k === 'L') lloyd();
  if (k === 'R') rastgele(25);
}
