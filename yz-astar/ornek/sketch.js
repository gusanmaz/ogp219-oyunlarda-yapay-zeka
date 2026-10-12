// OGP219 · A* ile yol bulma — eksiksiz p5.js örneği
// Tıkla/sürükle = duvar çiz/sil · fare = hedef · sarı ajan bulunan yolu yürür
// Tuşlar:  D = çapraz hareket aç/kapa   ·   H = sezgiyi aç/kapa (kapalı = Dijkstra)
// editor.p5js.org'a yapıştırıp çalıştırabilirsiniz.

const COLS = 30, ROWS = 18, S = 24;          // ızgara boyutu ve kare kenarı (piksel)
let wall = [];                                // wall[y][x] = true ise duvar
let agent, goal, path = [], visited = new Set();
let diagonal = true, useHeuristic = true, painting = null;

function setup() {
  createCanvas(COLS * S, ROWS * S + 26);
  for (let y = 0; y < ROWS; y++) wall.push(new Array(COLS).fill(false));
  for (let y = 3; y < 14; y++) wall[y][14] = true;          // başlangıçta bir duvar
  agent = { cell: [3, 9], pos: createVector(3.5 * S, 9.5 * S) };
  goal = [25, 9];
}

function draw() {
  background(250);
  const m = [floor(mouseX / S), floor(mouseY / S)];
  if (inside(m) && !wall[m[1]][m[0]] && (m[0] !== goal[0] || m[1] !== goal[1])) goal = m;   // fare = hedef

  path = astar(agent.cell, goal);                           // her kare yeniden ara (küçük ızgarada sorun değil)

  // çizim: bakılan kareler, duvarlar, yol
  noStroke();
  for (const k of visited) { const [x, y] = k.split(",").map(Number); fill(190, 225, 255); rect(x * S, y * S, S, S); }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (wall[y][x]) { fill(60, 65, 85); rect(x * S, y * S, S, S); }
  stroke(225); for (let x = 0; x <= COLS; x++) line(x * S, 0, x * S, ROWS * S); for (let y = 0; y <= ROWS; y++) line(0, y * S, COLS * S, y * S);
  if (path) { noFill(); stroke("#e5484d"); strokeWeight(3); beginShape(); for (const [x, y] of path) vertex((x + 0.5) * S, (y + 0.5) * S); endShape(); strokeWeight(1); }
  noStroke(); fill("#2fbf71"); circle((goal[0] + 0.5) * S, (goal[1] + 0.5) * S, S * 0.7);

  // ajan: yoldaki bir sonraki kareye doğru yürü
  if (path && path.length > 1) {
    const next = createVector((path[1][0] + 0.5) * S, (path[1][1] + 0.5) * S);
    const step = p5.Vector.sub(next, agent.pos).limit(140 * min(deltaTime / 1000, 0.05));
    agent.pos.add(step);
    if (agent.pos.dist(next) < 2) agent.cell = path[1];     // kareye vardı
  }
  fill("#f5a524"); circle(agent.pos.x, agent.pos.y, S * 0.75);

  fill(60); textSize(13);
  text(`bakılan kare: ${visited.size}   yol: ${path ? path.length - 1 + " adım" : "YOK"}   çapraz (D): ${diagonal ? "açık" : "kapalı"}   sezgi (H): ${useHeuristic ? "açık = A*" : "kapalı = Dijkstra"}`, 8, ROWS * S + 18);
}

/* ---------- A* ---------- */
function astar(start, target) {
  const key = c => c[0] + "," + c[1];
  const open = [{ cell: start, f: heuristic(start, target) }];     // açık liste (küçük ızgarada dizi yeter)
  const g = { [key(start)]: 0 };                                   // başlangıçtan buraya en ucuz maliyet
  const cameFrom = { [key(start)]: null };                         // buraya hangi kareden geldim?
  visited = new Set();
  while (open.length > 0) {
    let best = 0;                                                  // f'si en küçük olanı bul ve çıkar
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const cur = open.splice(best, 1)[0].cell;
    if (visited.has(key(cur))) continue;
    visited.add(key(cur));
    if (cur[0] === target[0] && cur[1] === target[1]) {            // hedef: yolu geriye doğru çıkar
      const out = [];
      for (let c = cur; c; c = cameFrom[key(c)]) out.push(c);
      return out.reverse();
    }
    for (const [n, cost] of neighbors(cur)) {
      const ng = g[key(cur)] + cost;
      if (ng < (g[key(n)] ?? Infinity)) {                          // daha ucuz bir yol buldum
        g[key(n)] = ng;
        cameFrom[key(n)] = cur;
        open.push({ cell: n, f: ng + heuristic(n, target) });      // f = g + h
      }
    }
  }
  return null;                                                     // yol yok
}

function heuristic(a, b) {
  if (!useHeuristic) return 0;                                     // h = 0 → Dijkstra
  const dx = abs(a[0] - b[0]), dy = abs(a[1] - b[1]);
  return diagonal ? max(dx, dy) + (Math.SQRT2 - 1) * min(dx, dy)   // octile (8 yön)
                  : dx + dy;                                       // Manhattan (4 yön)
}

function neighbors([x, y]) {
  const out = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    if (dx === 0 && dy === 0) continue;
    if (!diagonal && dx !== 0 && dy !== 0) continue;
    const n = [x + dx, y + dy];
    if (!inside(n) || wall[n[1]][n[0]]) continue;
    if (dx !== 0 && dy !== 0 && (wall[y][x + dx] || wall[y + dy][x])) continue;   // duvar köşesinden çapraz geçme
    out.push([n, dx !== 0 && dy !== 0 ? Math.SQRT2 : 1]);
  }
  return out;
}

function inside(c) { return c[0] >= 0 && c[0] < COLS && c[1] >= 0 && c[1] < ROWS; }

/* ---------- girdi ---------- */
function mousePressed() { const c = [floor(mouseX / S), floor(mouseY / S)]; if (inside(c)) { painting = !wall[c[1]][c[0]]; paint(c); } }
function mouseDragged() { const c = [floor(mouseX / S), floor(mouseY / S)]; if (inside(c) && painting !== null) paint(c); }
function mouseReleased() { painting = null; }
function paint(c) { if ((c[0] === agent.cell[0] && c[1] === agent.cell[1])) return; wall[c[1]][c[0]] = painting; }
function keyPressed() { if (key === "d" || key === "D") diagonal = !diagonal; if (key === "h" || key === "H") useHeuristic = !useHeuristic; }
