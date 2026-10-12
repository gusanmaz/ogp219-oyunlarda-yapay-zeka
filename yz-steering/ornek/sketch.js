// OGP219 · Steering davranışları — eksiksiz p5.js örneği
// Sarı araç fareye ARRIVE ile gelir. Balıklar (boids) üç kuralla sürü olur ve sarı araçtan KAÇAR.
// Tıkla = sürüye 10 balık ekle.   editor.p5js.org'a yapıştırıp çalıştırabilirsiniz.

let hunter, boids = [];

function setup() {
  createCanvas(720, 400);
  hunter = new Vehicle(width / 2, height / 2, 260, 420);
  for (let i = 0; i < 70; i++) boids.push(new Vehicle(random(width), random(height), 150, 300));
}

function draw() {
  background(245);
  const dt = min(deltaTime / 1000, 0.05);                       // saniye

  hunter.applyDesired(hunter.arrive(createVector(mouseX, mouseY), 120));
  hunter.update(dt);
  hunter.show(color("#f5a524"), 14);

  for (const b of boids) {
    b.flock(boids, 55);                                         // ayrılma + hizalanma + bütünleşme
    if (b.pos.dist(hunter.pos) < 110) b.applyDesired(b.flee(hunter.pos), 3);   // yırtıcıdan kaç (3 kat ağırlık)
    b.update(dt);
    b.wrap();
    b.show(color("#2f5fd0"), 7);
  }
  noStroke(); fill(80); textSize(13);
  text("fare = avcı (arrive) · tıkla = balık ekle · balık sayısı: " + boids.length, 10, height - 10);
}

function mousePressed() { for (let i = 0; i < 10; i++) boids.push(new Vehicle(mouseX + random(-20, 20), mouseY + random(-20, 20), 150, 300)); }

class Vehicle {
  constructor(x, y, maxSpeed, maxForce) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(maxSpeed / 2);
    this.acc = createVector(0, 0);
    this.maxSpeed = maxSpeed;                                   // piksel / saniye
    this.maxForce = maxForce;                                   // piksel / saniye² (kütle = 1)
  }

  // ---- davranışlar: her biri bir İSTENEN HIZ döndürür ----
  seek(target) { return p5.Vector.sub(target, this.pos).setMag(this.maxSpeed); }
  flee(threat) { return p5.Vector.sub(this.pos, threat).setMag(this.maxSpeed); }
  arrive(target, slowRadius) {
    const offset = p5.Vector.sub(target, this.pos), d = offset.mag();
    const speed = d < slowRadius ? this.maxSpeed * d / slowRadius : this.maxSpeed;   // yaklaşınca yavaşla
    return offset.setMag(speed);
  }

  // ---- Reynolds: direksiyon = istenen − mevcut hız (azami kuvvetle kırpılır) ----
  applyDesired(desired, weight = 1) {
    const steer = p5.Vector.sub(desired, this.vel).mult(5).limit(this.maxForce);     // ×5: hız farkını ~0,2 sn'de kapat
    this.acc.add(steer.mult(weight));
  }

  flock(others, radius) {
    const sep = createVector(), ali = createVector(), coh = createVector();
    let n = 0;
    for (const o of others) {
      const d = this.pos.dist(o.pos);
      if (o === this || d === 0 || d > radius) continue;
      sep.add(p5.Vector.sub(this.pos, o.pos).div(d * d));       // yakın komşu daha güçlü iter
      ali.add(o.vel);                                           // komşuların yönü
      coh.add(o.pos);                                           // komşuların konumu
      n++;
    }
    if (n === 0) return;
    this.applyDesired(sep.setMag(this.maxSpeed), 1.6);          // AYRILMA
    this.applyDesired(ali.setMag(this.maxSpeed), 1.0);          // HİZALANMA
    this.applyDesired(this.seek(coh.div(n)), 0.9);              // BÜTÜNLEŞME
  }

  update(dt) {
    this.vel.add(p5.Vector.mult(this.acc, dt)).limit(this.maxSpeed);   // ivme → hız
    this.pos.add(p5.Vector.mult(this.vel, dt));                        // hız → konum
    this.acc.mult(0);                                                  // kuvvetleri sıfırla
  }

  wrap() {                                                      // ekranın bir kenarından çıkan öbüründen girer
    this.pos.x = (this.pos.x + width) % width;
    this.pos.y = (this.pos.y + height) % height;
  }

  show(c, size) {
    push(); translate(this.pos.x, this.pos.y); rotate(this.vel.heading());
    fill(c); noStroke(); triangle(size, 0, -size * 0.7, size * 0.6, -size * 0.7, -size * 0.6);
    pop();
  }
}
