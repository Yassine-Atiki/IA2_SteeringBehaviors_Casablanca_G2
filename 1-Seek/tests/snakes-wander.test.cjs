const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vector(this.x, this.y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  add(value) { this.x += value.x; this.y += value.y; return this; }
  sub(value) { this.x -= value.x; this.y -= value.y; return this; }
  mult(value) { this.x *= value; this.y *= value; return this; }
  mag() { return Math.hypot(this.x, this.y); }
  magSq() { return this.x * this.x + this.y * this.y; }
  normalize() { const length = this.mag(); if (length) this.mult(1 / length); return this; }
  setMag(length) { return this.normalize().mult(length); }
  limit(maximum) { if (this.mag() > maximum) this.setMag(maximum); return this; }
  heading() { return Math.atan2(this.y, this.x); }
  static sub(a, b) { return a.copy().sub(b); }
  static dist(a, b) { return Vector.sub(a, b).mag(); }
}

function loadClasses() {
  const context = vm.createContext({
    createVector: (x, y) => new Vector(x, y),
    p5: { Vector },
    map: (value, start, end, newStart, newEnd) =>
      newStart + (value - start) * (newEnd - newStart) / (end - start),
    random: (minimum, maximum) => maximum === undefined
      ? 0.75
      : minimum + (maximum - minimum) * 0.75,
    cos: Math.cos,
    sin: Math.sin,
    PI: Math.PI,
    width: 800,
    height: 600,
    push() {}, pop() {}, fill() {}, stroke() {}, strokeWeight() {},
    noFill() {}, noStroke() {}, circle() {}, line() {}, rect() {},
    drawingContext: { setLineDash() {} }
  });
  for (const filename of ['vehicle.js', 'snakeRing.js', 'snake.js', 'snakeWander.js']) {
    const source = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
    vm.runInContext(source, context, { filename });
  }
  return vm.runInContext('({ Vehicle, Snake, SnakeRing, SnakeWander })', context);
}

test('wander renvoie une force limitée et fait évoluer son état progressivement', () => {
  const { Vehicle } = loadClasses();
  const vehicle = new Vehicle(100, 100);
  const previousTheta = vehicle.wanderTheta;
  const force = vehicle.wander();

  assert.ok(force.mag() > 0);
  assert.ok(force.mag() <= vehicle.maxForce + 1e-10);
  assert.notEqual(vehicle.wanderTheta, previousTheta);
  assert.ok(vehicle.pos.x === 100 && vehicle.pos.y === 100, 'wander ne téléporte pas le véhicule');
});

test('boundaries ne freine pas au centre et dirige le véhicule vers l’intérieur près d’un bord', () => {
  const { Vehicle } = loadClasses();
  const vehicle = new Vehicle(200, 200);
  assert.equal(vehicle.boundaries(0, 0, 400, 400, 50).mag(), 0);
  vehicle.pos.set(10, 200);
  const force = vehicle.boundaries(0, 0, 400, 400, 50);
  assert.ok(force.x > 0);
  assert.ok(force.mag() <= vehicle.maxForce + 1e-10);
});

test('chaque SnakeWander est un Vehicle avec une chaîne de segments Vehicle', () => {
  const { Vehicle, Snake, SnakeRing, SnakeWander } = loadClasses();
  const snakes = [
    new SnakeWander(100, 100, { ringCount: 4, couleur: 'teal' }),
    new SnakeWander(300, 200, { ringCount: 4, couleur: 'orange' }),
    new SnakeWander(500, 300, { ringCount: 4, couleur: 'pink' })
  ];

  assert.equal(new Set(snakes).size, 3);
  for (const snake of snakes) {
    assert.ok(snake instanceof Vehicle);
    assert.ok(snake instanceof Snake);
    assert.equal(snake.head, snake);
    assert.equal(snake.rings.length, 4);
    snake.rings.forEach((ring, index) => {
      assert.ok(ring instanceof Vehicle && ring instanceof SnakeRing);
      assert.equal(ring.predecessor, index ? snake.rings[index - 1] : snake);
    });
  }
});

test('edges reboucle la tête et chacun des anneaux du serpent', () => {
  const { SnakeWander } = loadClasses();
  const snake = new SnakeWander(100, 100, { ringCount: 2 });
  snake.pos.set(830, 100);
  snake.rings[0].pos.set(100, -80);
  snake.rings[1].pos.set(-40, 100);

  snake.edges();

  assert.equal(snake.pos.x, -snake.r);
  assert.equal(snake.rings[0].pos.y, 600 + snake.r);
  assert.equal(snake.rings[1].pos.x, 800 + snake.r);
});

test('wander met à jour la tête une fois et fait suivre les anneaux sans dépasser les limites', () => {
  const { SnakeWander } = loadClasses();
  const snake = new SnakeWander(100, 100, {
    ringCount: 3,
    headSpeed: 2.5,
    headForce: 0.12,
    ringSpeed: 3,
    ringForce: 0.2
  });
  const startingX = snake.pos.x;

  for (let frame = 0; frame < 120; frame++) {
    snake.updateWander();
    assert.ok(snake.vel.mag() <= snake.maxSpeed + 1e-10);
    assert.equal(snake.acc.mag(), 0);
    for (const ring of snake.rings) {
      assert.ok(Number.isFinite(ring.pos.x) && Number.isFinite(ring.pos.y));
      assert.ok(ring.vel.mag() <= ring.maxSpeed + 1e-10);
      assert.equal(ring.acc.mag(), 0);
    }
  }
  assert.notEqual(snake.pos.x, startingX);
  assert.ok(snake.wanderTheta > -Math.PI / 2);
});

test('le seek existant garde sa force limitée et arrive ralentit à sa cible', () => {
  const { Vehicle } = loadClasses();
  const vehicle = new Vehicle(0, 0);
  const seekForce = vehicle.seek(new Vector(1000, 0));
  assert.ok(seekForce.x > 0);
  assert.ok(seekForce.mag() <= vehicle.maxForce + 1e-10);

  vehicle.pos.set(90, 0);
  const arrivalForce = vehicle.arrive(new Vector(100, 0));
  assert.ok(arrivalForce.x > 0);
  assert.ok(arrivalForce.mag() <= vehicle.maxForce + 1e-10);
});
