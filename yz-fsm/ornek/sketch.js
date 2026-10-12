// OGP219 · Sonlu Durum Makinesi (FSM) — nöbetçi · eksiksiz p5.js örneği
// Kontroller:  fare = oyuncu   ·   tıkla = ses çıkar   ·   X = nöbetçiye ateş et (−25 can)
// editor.p5js.org'a yapıştırıp çalıştırabilirsiniz.

const WALLS = [{ x: 300, y: 90, w: 30, h: 150 }, { x: 470, y: 230, w: 150, h: 26 }];
const PATROL = [[80, 70], [640, 70], [640, 320], [80, 320]];             // devriye yol noktaları
const COLORS = { DEVRIYE: "#4f8cff", SUPHE: "#f5a524", KOVALA: "#ff5c7a", SALDIR: "#a970ff", KAC: "#2fbf71" };
const FOV = 110, RANGE = 260;                                            // görüş açısı (derece) ve menzili

let guard, player;
let noise = null;          // son duyulan sesin (ya da oyuncunun son görüldüğü yerin) konumu
let heardNoise = false;    // "az önce ses duydum" bayrağı

function setup() {
  createCanvas(720, 380);
  guard = { pos: createVector(80, 70), heading: 0, state: "DEVRIYE", timeInState: 0, hp: 100, wp: 1, shotTimer: 0 };
  player = createVector(500, 200);
}

function draw() {
  const dt = min(deltaTime / 1000, 0.05);                                // saniye (p5'te deltaTime milisaniyedir!)
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) player.set(mouseX, mouseY);

  const s = sense();                                                     // 1) ALGILA
  const next = nextState(guard.state, s);                                // 2) DÜŞÜN
  if (next !== guard.state) {
    if (next === "SUPHE" && guard.state !== "DEVRIYE") noise = player.copy();   // gözden kaybetti: son görülen yer
    guard.state = next;
    guard.timeInState = 0;                                               // duruma yeni girdik
    heardNoise = false;
  }
  guard.timeInState += dt;
  act(dt);                                                               // 3) DAVRAN
  render(s);
}

/* ---------- 1) ALGILA: nöbetçinin bildiği her şey bu nesnede ---------- */
function sense() {
  const toPlayer = p5.Vector.sub(player, guard.pos);
  const d = toPlayer.mag();
  const forward = p5.Vector.fromAngle(guard.heading);
  const inCone = d > 0 && forward.dot(toPlayer.copy().normalize()) > cos(radians(FOV / 2));
  const blocked = WALLS.some(w => segmentHitsRect(guard.pos, player, w));
  return { seesPlayer: d < RANGE && inCone && !blocked, dist: d, hp: guard.hp, heardNoise: heardNoise, timeInState: guard.timeInState };
}

/* ---------- 2) DÜŞÜN: geçiş tablosu (sunumdaki tablonun aynısı) ---------- */
function nextState(state, s) {
  if (s.hp < 30 && state !== "KAC") return "KAC";                        // her durumdan
  switch (state) {
    case "DEVRIYE":
      if (s.seesPlayer) return "KOVALA";
      if (s.heardNoise) return "SUPHE";
      break;
    case "SUPHE":
      if (s.seesPlayer) return "KOVALA";
      if (s.timeInState > 4) return "DEVRIYE";
      break;
    case "KOVALA":
      if (!s.seesPlayer) return "SUPHE";
      if (s.dist < 60) return "SALDIR";
      break;
    case "SALDIR":
      if (!s.seesPlayer) return "SUPHE";
      if (s.dist > 90) return "KOVALA";                                  // histerezis: 60'ta gir, 90'da çık
      break;
    case "KAC":
      if (s.hp > 70) return "DEVRIYE";
      break;
  }
  return state;                                                          // geçiş yok: aynı durumda kal
}

/* ---------- 3) DAVRAN: her durumda ne yapıyor? ---------- */
function act(dt) {
  switch (guard.state) {
    case "DEVRIYE": {
      const target = createVector(PATROL[guard.wp][0], PATROL[guard.wp][1]);
      moveToward(target, 70, dt);
      if (guard.pos.dist(target) < 10) guard.wp = (guard.wp + 1) % PATROL.length;   // sıradaki nokta
      break;
    }
    case "SUPHE":
      if (noise && guard.pos.dist(noise) > 12) moveToward(noise, 95, dt);
      else guard.heading += 2.2 * dt;                                    // vardı: etrafına bakın
      break;
    case "KOVALA":
      moveToward(player, 125, dt);
      break;
    case "SALDIR":
      turnToward(p5.Vector.sub(player, guard.pos).heading(), 8, dt);
      guard.shotTimer -= dt;
      if (guard.shotTimer <= 0) guard.shotTimer = 0.6;                   // 0,6 saniyede bir atış
      break;
    case "KAC": {
      const away = p5.Vector.sub(guard.pos, player).setMag(200).add(guard.pos);    // oyuncunun tersine bir nokta
      moveToward(away, 115, dt);
      guard.hp = min(100, guard.hp + 9 * dt);                            // kaçarken iyileş
      break;
    }
  }
}

function moveToward(target, speed, dt) {
  const dir = p5.Vector.sub(target, guard.pos);
  if (dir.mag() < 1) return;
  turnToward(dir.heading(), 5, dt);
  dir.setMag(speed * dt);                                                // hız (piksel/sn) × süre = bu karedeki adım
  const nx = constrain(guard.pos.x + dir.x, 15, width - 15), ny = constrain(guard.pos.y + dir.y, 15, height - 15);
  if (!insideWall(nx, guard.pos.y)) guard.pos.x = nx;                    // duvara girmeden, eksen eksen ilerle
  if (!insideWall(guard.pos.x, ny)) guard.pos.y = ny;
}

function turnToward(angle, turnSpeed, dt) {
  let diff = angle - guard.heading;
  while (diff > PI) diff -= TWO_PI;                                      // açı farkını −180°…180° aralığına sar
  while (diff < -PI) diff += TWO_PI;
  guard.heading += constrain(diff, -turnSpeed * dt, turnSpeed * dt);
}

/* ---------- girdi ---------- */
function mousePressed() { noise = createVector(mouseX, mouseY); heardNoise = true; }
function keyPressed() { if (key === "x" || key === "X") guard.hp = max(0, guard.hp - 25); }

/* ---------- yardımcılar ---------- */
function insideWall(x, y) { return WALLS.some(w => x > w.x - 8 && x < w.x + w.w + 8 && y > w.y - 8 && y < w.y + w.h + 8); }
function segmentHitsRect(a, b, r) {                                      // a→b doğru parçası dikdörtgene değiyor mu? (örnekleyerek)
  for (let i = 0; i <= 40; i++) {
    const p = p5.Vector.lerp(a, b, i / 40);
    if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) return true;
  }
  return false;
}

/* ---------- çizim ---------- */
function render(s) {
  background(250);
  noStroke(); fill(70, 75, 95); WALLS.forEach(w => rect(w.x, w.y, w.w, w.h));
  noFill(); stroke(200); drawingContext.setLineDash([4, 6]);
  beginShape(); PATROL.forEach(p => vertex(p[0], p[1])); endShape(CLOSE);
  drawingContext.setLineDash([]);

  const c = color(COLORS[guard.state]);
  noStroke(); fill(s.seesPlayer ? color(255, 92, 122, 50) : color(245, 165, 36, 40));       // görüş konisi
  arc(guard.pos.x, guard.pos.y, RANGE * 2, RANGE * 2, guard.heading - radians(FOV / 2), guard.heading + radians(FOV / 2), PIE);
  if (noise && (guard.state === "SUPHE" || heardNoise)) { noFill(); stroke("#f5a524"); strokeWeight(2); circle(noise.x, noise.y, 20); circle(noise.x, noise.y, 36); }
  if (guard.state === "SALDIR" && guard.shotTimer > 0.5) { stroke("#ff5c7a"); strokeWeight(2); line(guard.pos.x, guard.pos.y, player.x, player.y); }

  noStroke(); fill("#2fbf71"); circle(player.x, player.y, 20);                               // oyuncu
  push(); translate(guard.pos.x, guard.pos.y); rotate(guard.heading); fill(c); stroke(0, 110); strokeWeight(1.5);
  triangle(14, 0, -10, 9, -10, -9); pop();                                                   // nöbetçi

  noStroke(); fill(c); textAlign(CENTER); textSize(13); textStyle(BOLD);
  text(guard.state, guard.pos.x, guard.pos.y - 22);
  fill(220); rect(guard.pos.x - 20, guard.pos.y + 16, 40, 5);                                // can çubuğu
  fill(guard.hp < 30 ? "#ff5c7a" : "#2fbf71"); rect(guard.pos.x - 20, guard.pos.y + 16, 40 * guard.hp / 100, 5);

  fill(60); textAlign(LEFT); textStyle(NORMAL); textSize(12);
  text(`durum: ${guard.state}   can: ${round(guard.hp)}   mesafe: ${round(s.dist)}   görüyor: ${s.seesPlayer ? "evet" : "hayır"}   durumda: ${guard.timeInState.toFixed(1)} sn`, 10, height - 10);
}
