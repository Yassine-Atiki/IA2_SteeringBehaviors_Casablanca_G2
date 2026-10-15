const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Adaptateur vectoriel minimal. Le test navigateur utilise le vrai p5.js.
class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vector(this.x, this.y); }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  mag() { return Math.hypot(this.x, this.y); }
  normalize() { return this.mag() ? this.mult(1 / this.mag()) : this; }
  setMag(n) { return this.normalize().mult(n); }
  limit(n) { if (this.mag() > n) this.setMag(n); return this; }
  set(x, y) { this.x = x; this.y = y; return this; }
  heading() { return Math.atan2(this.y, this.x); }
  static sub(a, b) { return a.copy().sub(b); }
  static dist(a, b) { return Vector.sub(a, b).mag(); }
}
function load() {
  const circles = [];
  const context = vm.createContext({
    createVector: (x, y) => new Vector(x, y), p5: { Vector },
    map: (value, low, high, start, end) => start + (end - start) * (value - low) / (high - low),
    push() {}, pop() {}, fill() {}, stroke() {}, strokeWeight() {}, noFill() {}, noStroke() {}, line() {},
    circle: (...args) => circles.push(args)
  });
  for (const file of ['vehicle.js', 'snakeRing.js', 'snake.js', 'snake-controls.js', 'nourriture.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  const classes = vm.runInContext('({ Vehicle, Snake, SnakeRing, SnakeControls, Nourriture, FoodSpawner })', context);
  return { ...classes, circles };
}

test('Snake is its own Vehicle head and has a linked chain of Vehicle rings', () => {
  const { Snake, Vehicle, SnakeRing } = load();
  const snake = new Snake(300, 200);
  assert.ok(snake instanceof Vehicle);
  assert.equal(snake.head, snake);
  assert.equal(snake.rings.length, 12);
  assert.equal(snake.r, 12);
  snake.rings.forEach((ring, index) => {
    assert.ok(ring instanceof Vehicle && ring instanceof SnakeRing);
    assert.equal(ring.predecessor, index ? snake.rings[index - 1] : snake);
    assert.equal(ring.pos.x, 300 - 32 * (index + 1));
    assert.equal(ring.vel.mag(), 0);
  });
});

test('ring arrives at predecessor centre with a stopping distance, without mutation', () => {
  const { Snake } = load();
  const snake = new Snake(100, 100, { ringCount: 1 });
  const snapshot = { pos: new Vector(150, 100), direction: new Vector(1, 0), r: 12 };
  const force = snake.rings[0].follow(snapshot);
  assert.equal(snake.rings[0].followPoint.x, 150);
  assert.ok(force.x > 0 && force.mag() <= snake.ringForce + 1e-10);
  assert.equal(snapshot.pos.x, 150);
  assert.equal(snapshot.direction.x, 1);
});

test('rings follow updated predecessor positions in order, integrating only once', () => {
  const { Snake } = load();
  const snake = new Snake(100, 100, { headForce: 0, ringCount: 1 });
  snake.vel.set(2, 0);
  snake.updateSnake(new Vector(400, 100));
  assert.equal(snake.pos.x, 102);
  assert.equal(snake.rings[0].followPoint.x, 102);
  assert.ok(snake.rings[0].pos.x > 68 && snake.rings[0].pos.x <= 68.3);
  assert.equal(snake.acc.mag(), 0);
  assert.equal(snake.rings[0].acc.mag(), 0);
});

test('arrival brakes and converges without collapsing the stationary chain', () => {
  const { Snake } = load();
  const snake = new Snake(300, 200, { ringCount: 4 });
  const target = new Vector(450, 200);
  let farSpeed = 0;
  for (let frame = 0; frame < 1500; frame++) {
    snake.updateSnake(target);
    if (frame === 40) farSpeed = snake.vel.mag();
    for (const part of [snake, ...snake.rings]) {
      assert.ok(Number.isFinite(part.pos.x) && Number.isFinite(part.pos.y));
      assert.ok(part.vel.mag() <= part.maxSpeed + 1e-9);
    }
  }
  assert.ok(Vector.dist(snake.pos, target) < 1.2);
  assert.ok(snake.vel.mag() < farSpeed * 0.01);
  snake.rings.forEach(ring => {
    assert.ok(Math.abs(Vector.dist(ring.pos, ring.predecessor.pos) - 32) < 1.5);
  });
});

test('speed zero, force zero, coincident target and zero direction remain finite', () => {
  const { Snake } = load();
  const snake = new Snake(20, 30, { headSpeed: 0, ringSpeed: 0 });
  snake.vel.set(8, 0);
  snake.updateSnake(snake.pos.copy());
  assert.equal(snake.vel.mag(), 0);
  assert.equal(snake.pos.x, 20);
  assert.equal(snake.direction.x, 1);
  snake.configure({ headSpeed: 10, headForce: 0 });
  snake.vel.set(1, 0);
  snake.updateSnake(new Vector(0, 0));
  assert.equal(snake.vel.x, 1);
});

test('configuration separates head and rings; resizing preserves existing identities', () => {
  const { Snake } = load();
  const snake = new Snake(100, 100);
  const ring = snake.rings[0];
  snake.configure({ headSpeed: 20, headForce: 1, ringSpeed: 2, ringForce: 0.05, r: 20, couleur: '#ff0000' });
  assert.equal(snake.maxSpeed, 20);
  assert.equal(ring.maxSpeed, 2);
  assert.equal(ring.maxForce, 0.05);
  assert.equal(ring.r, 20);
  assert.equal(ring.couleur, '#ff0000');
  snake.setRingCount(16);
  assert.equal(snake.rings[0], ring);
  assert.equal(snake.rings[15].maxSpeed, 2);
  snake.setRingCount(2);
  assert.equal(snake.rings[0], ring);
  snake.configure({ headSpeed: NaN, ringForce: -10 });
  assert.equal(snake.maxSpeed, 20);
  assert.equal(ring.maxForce, 0);
  snake.setRingCount(Infinity);
  assert.equal(snake.rings.length, 2);
});

test('drawing uses circles of diameter 2r and independent snake colours', () => {
  const { Snake, circles } = load();
  const first = new Snake(100, 100, { r: 10, ringCount: 1, couleur: 'red' });
  const second = new Snake(200, 100, { couleur: 'blue' });
  first.show();
  assert.equal(circles[0][2], 20);
  assert.equal(circles[1][2], 20);
  assert.equal(second.couleur, 'blue');
});

test('population preserves snakes and creates new instances with current settings', () => {
  const { Snake, SnakeControls } = load();
  const snakes = [new Snake(100, 100)];
  const original = snakes[0];
  SnakeControls.resizePopulation(snakes, 3, () => new Snake(100, 100, { ringSpeed: 9 }));
  assert.equal(snakes[0], original);
  assert.equal(snakes[2].rings[0].maxSpeed, 9);
  SnakeControls.resizePopulation(snakes, 1, () => { throw new Error('unexpected creation'); });
  assert.equal(snakes.length, 1);
  assert.equal(snakes[0], original);
});

test('controls react on input and keep UI/debug states synchronized', () => {
  const { SnakeControls } = load();
  function element() {
    return { hidden: true, checked: false, listeners: {}, attrs: {},
      addEventListener(name, callback) { this.listeners[name] = callback; },
      setAttribute(name, value) { this.attrs[name] = value; } };
  }
  const elements = new Map();
  const doc = element();
  doc.querySelector = key => { if (!elements.has(key)) elements.set(key, element()); return elements.get(key); };
  const settings = { ...SnakeControls.DEFAULTS };
  const changes = [];
  let debug = false;
  SnakeControls.initialize(doc, settings, (...args) => changes.push(args), value => { debug = value; });
  const slider = doc.querySelector('#ringSpeed');
  slider.value = '18';
  slider.listeners.input();
  assert.equal(settings.ringSpeed, 18);
  assert.equal(changes[0][0], 'ringSpeed');
  assert.equal(doc.querySelector('#ringSpeed-value').textContent, '18');
  doc.querySelector('#ui-toggle').listeners.click();
  assert.equal(doc.querySelector('#controls-panel').hidden, false);
  assert.equal(doc.querySelector('#ui-toggle').attrs['aria-expanded'], 'true');
  doc.listeners.keydown({ key: 'd', target: { tagName: 'BODY' } });
  assert.equal(debug, true);
  assert.equal(doc.querySelector('#debug-toggle').checked, true);
  doc.listeners.keydown({ key: 'd', target: { tagName: 'INPUT' } });
  assert.equal(debug, true);
});

test('pointer coordinates account for scaled canvas and clamp to its bounds', () => {
  const { SnakeControls } = load();
  const bounds = { left: 100, top: 50, width: 400, height: 200 };
  const position = SnakeControls.pointerPosition({ clientX: 300, clientY: 150 }, bounds, 800, 400);
  assert.equal(position.x, 400);
  assert.equal(position.y, 200);
  assert.equal(SnakeControls.pointerPosition({ clientX: 0, clientY: 900 }, bounds, 800, 400).y, 400);
});

test('gap uses edge-to-edge spacing and changing it preserves positions and identities', () => {
  const { Snake } = load();
  const snake = new Snake(300, 200, { gap: 20, r: 10, ringCount: 2 });
  const ring = snake.rings[0];
  assert.equal(ring.pos.x, 260);
  const before = ring.pos.copy();
  snake.configure({ gap: 40 });
  assert.equal(ring.pos.x, before.x);
  snake.updateSnake(snake.pos.copy());
  assert.equal(ring.followPoint.x, 300);
  assert.equal(ring.desiredSpacing, 60);
  assert.equal(snake.rings[0], ring);
});

test('rest state rejects subpixel noise, brakes with maxForce and resumes beyond hysteresis', () => {
  const { Snake } = load();
  const snake = new Snake(100, 100, { ringCount: 1 });
  const ring = snake.rings[0];
  ring.vel.set(0.1, 0);
  let force = ring.arrive(ring.pos.copy().add(new Vector(0.2, 0)));
  assert.equal(ring.resting, true);
  assert.ok(force.x < 0 && force.mag() <= ring.maxForce);
  ring.applyForce(force); ring.update();
  assert.equal(ring.vel.mag(), 0);
  const before = ring.pos.copy();
  const direction = ring.direction.copy();
  for (let index = 0; index < 500; index++) {
    force = ring.arrive(before.copy().add(new Vector(index % 2 ? 0.7 : -0.7, 0)));
    ring.applyForce(force); ring.update();
  }
  assert.equal(ring.pos.x, before.x);
  assert.equal(ring.direction.x, direction.x);
  ring.arrive(before.copy().add(new Vector(3, 0)));
  assert.equal(ring.resting, false);
});

test('long stationary chain stops moving after a sharp turn', () => {
  const { Snake } = load();
  const snake = new Snake(400, 200, { gap: 16, ringCount: 12 });
  const destination = new Vector(260, 340);
  for (let i = 0; i < 4000; i++) snake.updateSnake(destination);
  const before = [snake, ...snake.rings].map(part => part.pos.copy());
  for (let i = 0; i < 300; i++) snake.updateSnake(destination);
  [snake, ...snake.rings].forEach((part, index) => {
    assert.ok(Vector.dist(part.pos, before[index]) < 0.01, 'visible jitter at rest');
  });
});

test('individual inputs change only their snake and stay synchronized after growth', () => {
  const { Snake, SnakeControls } = load();
  const first = new Snake(100, 100);
  const second = new Snake(200, 200);
  const input = { value: '', addEventListener(event, fn) { this[event] = fn; } };
  const output = {};
  SnakeControls.bindSnakeInput(input, output, first, 'r');
  input.value = '26'; input.input();
  assert.equal(first.r, 26);
  assert.equal(first.rings[0].r, 26);
  assert.equal(second.r, 12);
  const refresh = SnakeControls.bindSnakeInput(input, output, first, 'ringCount');
  first.grow(); refresh();
  assert.equal(Number(input.value), 13);
  assert.equal(Number(output.textContent), 13);
});

test('food stays stationary beyond 100px and arrives at the nearest head on the boundary', () => {
  const { Nourriture, Snake, Vehicle } = load();
  const food = new Nourriture(0, 0);
  const far = new Snake(101, 0);
  assert.ok(food instanceof Vehicle);
  for (let i = 0; i < 20; i++) food.advance([far]);
  assert.equal(food.pos.x, 0);
  assert.equal(food.target, null);
  const near = new Snake(100, 0);
  food.advance([far, near]);
  assert.equal(food.target, near);
  assert.ok(food.vel.x > 0 && food.vel.mag() <= food.maxSpeed);
  const headBefore = near.pos.copy();
  for (let i = 0; i < 100; i++) {
    food.advance([near]);
    if (food.tryConsume([near])) break;
  }
  assert.equal(food.consumed, true);
  assert.equal(near.rings.length, 13);
  assert.equal(near.pos.x, headBefore.x);
});

test('food uses sum of radii, grows only one snake once and ignores rings', () => {
  const { Nourriture, Snake } = load();
  const first = new Snake(100, 100, { r: 20 });
  const second = new Snake(100, 100);
  const food = new Nourriture(132, 100);
  assert.equal(food.tryConsume([first, second]), true);
  assert.equal(first.rings.length, 13);
  assert.equal(second.rings.length, 12);
  assert.equal(food.tryConsume([first]), false);
  assert.equal(first.rings.length, 13);
  const other = new Nourriture(first.rings.at(-1).pos.x, 100);
  assert.equal(other.tryConsume([first]), false);
  const edge = new Nourriture(132.01, 100);
  assert.equal(edge.tryConsume([first]), false);
});

test('food releases a removed snake and growth is not capped by the initial slider max', () => {
  const { Nourriture, Snake } = load();
  const snake = new Snake(100, 100, { ringCount: 100 });
  const food = new Nourriture(150, 100);
  food.advance([snake]);
  assert.equal(food.target, snake);
  food.advance([]);
  assert.equal(food.target, null);
  assert.ok(Number.isFinite(food.pos.x));
  snake.grow();
  assert.equal(snake.rings.length, 101);
});

test('spawn clock creates one food every five seconds and supports frequency changes', () => {
  const { FoodSpawner } = load();
  const clock = new FoodSpawner();
  let count = 0;
  const spawn = () => count++;
  clock.advance(4999, spawn); assert.equal(count, 0);
  clock.advance(1, spawn); assert.equal(count, 1);
  clock.advance(5000, spawn); assert.equal(count, 2);
  clock.setInterval(2);
  clock.advance(1999, spawn); assert.equal(count, 2);
  clock.advance(1, spawn); assert.equal(count, 3);
  clock.advance(Infinity, spawn); assert.equal(count, 3);
  clock.advance(100000, spawn); assert.equal(count, 4);
});

test('ring remembers its final slow orientation even when braking makes velocity zero', () => {
  const { Snake } = load();
  const snake = new Snake(200, 200, { ringCount: 2 });
  const predecessor = snake.rings[0];
  predecessor.vel.set(0, 0.04); // sous l'ancien seuil de 0,15
  predecessor.resting = true;
  predecessor.applyForce(predecessor.vel.copy().mult(-1));
  predecessor.update();
  assert.equal(predecessor.vel.mag(), 0);
  assert.equal(predecessor.direction.x, 0);
  assert.equal(predecessor.direction.y, 1);
  for (let i = 0; i < 20; i++) predecessor.update();
  assert.equal(predecessor.direction.y, 1);
  const follower = snake.rings[1];
  follower.follow({ pos: predecessor.pos, direction: predecessor.direction, r: predecessor.r });
  assert.equal(follower.followPoint.x, predecessor.pos.x);
  assert.equal(follower.followPoint.y, predecessor.pos.y);
  assert.equal(follower.desiredSpacing, 32);
});

test('head preserves its final orientation through a complete stop', () => {
  const { Snake } = load();
  const snake = new Snake(200, 200, { ringCount: 1 });
  snake.vel.set(-0.03, 0);
  snake.updateSnake(snake.pos.copy());
  assert.equal(snake.vel.mag(), 0);
  assert.equal(snake.direction.x, -1);
  assert.equal(snake.direction.y, 0);
  snake.updateSnake(snake.pos.copy());
  assert.equal(snake.rings[0].followPoint.x, snake.pos.x);
});

test('straight travel followed by stopping leaves every ring aligned behind the head', () => {
  const { Snake } = load();
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI / 4]) {
    const forward = new Vector(Math.cos(angle), Math.sin(angle));
    const snake = new Snake(500, 500, { ringCount: 12 });
    [snake, ...snake.rings].forEach((part, index) => {
      // Initialisation d'une chaîne droite dans chacune des directions testées.
      part.pos = snake.pos.copy().sub(forward.copy().mult(index * 32));
      part.direction = forward.copy();
    });
    const target = snake.pos.copy().add(forward.copy().mult(350));
    for (let i = 0; i < 2000; i++) snake.updateSnake(target);
    snake.rings.forEach((ring, index) => {
      const offset = Vector.sub(ring.pos, snake.pos);
      const cross = offset.x * forward.y - offset.y * forward.x;
      const along = offset.x * forward.x + offset.y * forward.y;
      assert.ok(Math.abs(cross) < 0.001, `ring ${index}: lateral deviation ${cross}`);
      assert.ok(along < 0, 'each ring must be behind the head');
      assert.equal(ring.vel.mag(), 0);
      assert.ok(Math.abs(Vector.dist(ring.pos, ring.predecessor.pos) - 32) < 1.5);
      const pointOffset = Vector.sub(ring.followPoint, ring.predecessor.pos);
      assert.ok(pointOffset.mag() < 0.000001, 'target is predecessor centre, not an oriented offset');
    });
    assert.equal(snake.vel.mag(), 0);
  }
});

test('orientation changes of a stationary predecessor cannot move the arrival target', () => {
  const { Snake } = load();
  const snake = new Snake(200, 200, { ringCount: 1 });
  const ring = snake.rings[0];
  const before = snake.pos.copy();
  for (const direction of [new Vector(1, 0), new Vector(0, 1), new Vector(-1, 0)]) {
    snake.direction = direction;
    const force = ring.follow();
    assert.equal(ring.followPoint.x, before.x);
    assert.equal(ring.followPoint.y, before.y);
    assert.equal(force.mag(), 0);
  }
});

test('radial arrival attracts outside spacing, repels inside and brakes at equilibrium', () => {
  const { Snake } = load();
  const snake = new Snake(100, 100, { ringCount: 1 });
  const ring = snake.rings[0];
  ring.pos.set(50, 100); // distance 50 > 32
  assert.ok(ring.follow().x > 0);
  ring.pos.set(80, 100); // distance 20 < 32
  assert.ok(ring.follow().x < 0);
  ring.pos.set(68, 100);
  ring.vel.set(0.1, 0);
  assert.ok(ring.follow().x < 0);
  for (const gap of [18, 80]) {
    snake.configure({ gap });
    ring.pos.set(100 - (24 + gap + 5), 100);
    ring.vel.set(0, 0);
    const force = ring.follow();
    assert.ok(Number.isFinite(force.x) && force.x > 0 && force.mag() <= ring.maxForce);
  }
});

test('repeated small mouse motions do not amplify into tail oscillations after stopping', () => {
  const { Snake } = load();
  for (const gap of [0, 8, 30, 80]) {
    const snake = new Snake(500, 300, { ringCount: 12, gap });
    for (let repetition = 0; repetition < 6; repetition++) {
      const target = new Vector(503 + repetition * 3, 300 + (repetition % 2 ? 4 : -4));
      for (let frame = 0; frame < 45; frame++) snake.updateSnake(target);
    }
    const stop = new Vector(518, 300);
    for (let frame = 0; frame < 1500; frame++) snake.updateSnake(stop);
    const positions = [snake, ...snake.rings].map(part => part.pos.copy());
    for (let frame = 0; frame < 300; frame++) snake.updateSnake(stop);
    snake.rings.forEach((ring, index) => {
      assert.ok(Math.abs(ring.pos.y - 300) < 8, 'small movement must not create large lateral waves');
      assert.ok(Vector.dist(ring.pos, positions[index + 1]) < 0.01, 'tail still oscillates after stop');
      assert.ok(Math.abs(Vector.dist(ring.pos, ring.predecessor.pos) - (24 + gap)) < 1.5);
    });
  }
});
