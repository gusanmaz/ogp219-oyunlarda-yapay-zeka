// OGP219 · Q-öğrenme — eksiksiz p5.js örneği
// Ajan (mavi) hazineyi (sarı) bulmayı DENEYEREK öğrenir; lav (kırmızı) −10, hazine +10, her adım −0,1.
// Tıkla = duvar ekle/sil · BOŞLUK = hızlı/yavaş · R = her şeyi unut
// editor.p5js.org'a yapıştırıp çalıştırabilirsiniz.

const COLS = 9, ROWS = 6, S = 70;
const ALPHA = 0.5, GAMMA = 0.9, EPSILON = 0.2;       // öğrenme hızı, indirim, keşif oranı
const MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]];    // yukarı, sağ, aşağı, sol
const START = [0, 5], GOAL = [8, 0], LAVA = [[3, 3], [4, 3], [5, 3], [6, 1]];

let Q;                      // Q[y][x][eylem] = "bu karede bu eylemi yaparsam toplam ne kazanırım?"
let wall, agent, episode = 0, steps = 0, fast = false, lastReturns = [], ret = 0;

function setup() {
  createCanvas(COLS * S, ROWS * S + 30);
  wall = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  forget();
}
function forget() {
  Q = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [0, 0, 0, 0]));
  agent = [...START]; episode = 0; lastReturns = []; ret = 0;
}

function draw() {
  for (let i = 0; i < (fast ? 200 : 1); i++) if (fast || frameCount % 6 === 0) step();
  render();
}

/* ---------- Q-öğrenmenin tamamı: seç → dene → güncelle ---------- */
function step() {
  const [x, y] = agent;
  // 1) EYLEM SEÇ (ε-açgözlü): bazen rastgele (keşif), çoğunlukla bildiğinin en iyisi (sömürü)
  const a = random() < EPSILON ? floor(random(4)) : argmax(Q[y][x]);
  // 2) DENE: dünyanın cevabı (yeni kare, ödül, bitti mi?)
  let nx = x + MOVES[a][0], ny = y + MOVES[a][1];
  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || wall[ny][nx]) { nx = x; ny = y; }   // duvara çarptı: yerinde kal
  let r = -0.1, done = false;
  if (nx === GOAL[0] && ny === GOAL[1]) { r = 10; done = true; }
  if (LAVA.some(l => l[0] === nx && l[1] === ny)) { r = -10; done = true; }
  // 3) GÜNCELLE (Bellman): hedef = ödül + indirimli en iyi gelecek
  const target = r + (done ? 0 : GAMMA * max(Q[ny][nx]));
  Q[y][x][a] += ALPHA * (target - Q[y][x][a]);

  ret += r; steps++;
  if (done || steps > 200) {                        // bölüm bitti: başa dön
    lastReturns.push(ret); if (lastReturns.length > 20) lastReturns.shift();
    agent = [...START]; episode++; steps = 0; ret = 0;
  } else agent = [nx, ny];
}
function argmax(arr) { let b = 0; for (let i = 1; i < arr.length; i++) if (arr[i] > arr[b]) b = i; return b; }

/* ---------- çizim ---------- */
function render() {
  background(250);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const cx = x * S + S / 2, cy = y * S + S / 2;
    stroke(220); fill(255);
    if (wall[y][x]) fill(60, 65, 85);
    else if (x === GOAL[0] && y === GOAL[1]) fill("#f5c542");
    else if (LAVA.some(l => l[0] === x && l[1] === y)) fill("#e5484d");
    else { const v = max(Q[y][x]); fill(v > 0 ? color(47, 191, 113, min(220, v * 25)) : color(229, 72, 77, min(200, -v * 25))); }
    rect(x * S, y * S, S, S);
    if (!wall[y][x] && max(Q[y][x].map(abs)) > 0.01 && !(x === GOAL[0] && y === GOAL[1])) {   // en iyi yönü okla göster
      const m = MOVES[argmax(Q[y][x])];
      stroke(40); strokeWeight(2); line(cx - m[0] * 14, cy - m[1] * 14, cx + m[0] * 14, cy + m[1] * 14);
      noStroke(); fill(40); circle(cx + m[0] * 14, cy + m[1] * 14, 7); strokeWeight(1);
    }
  }
  noStroke(); fill("#2f5fd0"); circle(agent[0] * S + S / 2, agent[1] * S + S / 2, S * 0.45);
  const avg = lastReturns.length ? lastReturns.reduce((a, b) => a + b, 0) / lastReturns.length : 0;
  fill(60); textSize(14); textAlign(LEFT);
  text(`bölüm: ${episode}   son 20 bölümün ortalama getirisi: ${avg.toFixed(1)}   ${fast ? "HIZLI" : "yavaş"} (BOŞLUK)   tıkla = duvar   R = unut`, 8, ROWS * S + 20);
}

/* ---------- girdi ---------- */
function keyPressed() { if (key === " ") fast = !fast; if (key === "r" || key === "R") forget(); return false; }
function mousePressed() {
  const x = floor(mouseX / S), y = floor(mouseY / S);
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
  if ((x === START[0] && y === START[1]) || (x === GOAL[0] && y === GOAL[1])) return;
  wall[y][x] = !wall[y][x];
}
