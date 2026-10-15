const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Adaptateur minimal p5/DOM pour tester l'état ; le navigateur utilise p5 réel.
class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vector(this.x, this.y); }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  set(x, y) { this.x = x; this.y = y; return this; }
  mag() { return Math.hypot(this.x, this.y); }
  setMag(n) { const m = this.mag(); if (m) { this.x *= n / m; this.y *= n / m; } return this; }
  limit(n) { if (this.mag() > n) this.setMag(n); return this; }
  heading() { return Math.atan2(this.y, this.x); }
  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
}
function fixture() {
  const elements = [];
  function element() {
    const el = { children: [], events: {}, value: '', textContent: '',
      append(...children) { this.children.push(...children); },
      setAttribute() {}, addEventListener(name, fn) { this.events[name] = fn; } };
    elements.push(el);
    return el;
  }
  const context = vm.createContext({
    document: { createElement: element, createTextNode: text => text, body: element() },
    createVector: (x, y) => new Vector(x, y), p5: { Vector },
    random: (a, b) => b === undefined ? a * 0.6 : a + (b - a) * 0.6,
    width: 800, height: 600, windowWidth: 800, windowHeight: 600, frameCount: 5,
    createCanvas() {}, describe() {}, background() {}, push() {}, pop() {},
    cos: Math.cos, sin: Math.sin
  });
  for (const file of ['vehicle.js', 'wanderVehicle.js', 'sketch.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  vm.runInContext('setup()', context);
  return { run: code => vm.runInContext(code, context), elements };
}

test('initialisation et événements input synchronisent les vrais vaisseaux', () => {
  const { run } = fixture();
  assert.equal(run('vehicles.length'), 20);
  assert.equal(run('vehicles.every(v => v.maxSpeed === 10 && v.maxForce === 0.1)'), true);
  run('controls.displaceRange.input.value = 0.73; controls.displaceRange.input.events.input()');
  assert.equal(run('vehicles.every(v => v.displaceRange === 0.73)'), true);
  assert.equal(run('controls.displaceRange.output.textContent'), '0.73');
});

test('effectif : conserver identités et réglages, réduire, zéro, puis recréer', () => {
  const { run } = fixture();
  run('const first = vehicles[0]; reglerParametre("displaceRange", 0.81); reglerNombreVehicules(35)');
  assert.equal(run('vehicles.length'), 35);
  assert.equal(run('vehicles[0] === first && vehicles.every(v => v.displaceRange === 0.81)'), true);
  run('reglerNombreVehicules(3)');
  assert.equal(run('vehicles.length'), 3);
  assert.equal(run('vehicles[0] === first'), true);
  run('reglerNombreVehicules(0); muterVehicules(); reglerNombreVehicules(1)');
  assert.equal(run('vehicles[0].displaceRange'), 0.81);
  run('reglerNombreVehicules(999)');
  assert.equal(run('vehicles.length'), 200);
  run('reglerNombreVehicules(NaN)');
  assert.equal(run('vehicles.length'), 20);
});

test('réduction immédiate de traînée et mise à jour héritée, y compris zéro', () => {
  const { run } = fixture();
  run('const v = vehicles[0]; v.path = Array.from({length: 100}, (_, i) => createVector(i, 0)); reglerParametre("pathLength", 3)');
  assert.equal(run('v.path.length'), 3);
  assert.equal(run('v.path[0].x'), 97);
  run('reglerParametre("pathLength", 0); v.update()');
  assert.equal(run('v.path.length'), 0);
  run('reglerParametre("pathLength", 2); v.update(); v.update(); v.update()');
  assert.equal(run('v.path.length'), 2);
});

test('mutations additives positives/négatives, bornées et alignées sur les pas', () => {
  const { run } = fixture();
  run('muterVehicules(() => 1)');
  assert.equal(run('vehicles[0].displaceRange'), 0.5);
  assert.equal(run('vehicles[0].pathLength'), 50);
  run('muterVehicules(() => 0)');
  assert.equal(run('vehicles[0].displaceRange'), 0.3);
  for (const direction of [0, 1]) {
    run(`for (let i = 0; i < 100; i++) muterVehicules(() => ${direction})`);
    assert.equal(run(`vehicles.every(v => Object.entries(parameterSpecs).every(([p,s]) =>
      v[p] >= s.min && v[p] <= s.max && Math.abs((v[p] - s.min) / s.step - Math.round((v[p] - s.min) / s.step)) < 1e-8))`), true);
    assert.equal(run('vehicles.every(v => v.path.length <= v.pathLength && v.vel.mag() <= v.maxSpeed)'), true);
  }
});

test('mutation indépendante, affichage min–max et reprise du contrôle collectif', () => {
  const { run } = fixture();
  run('let n = 0; muterVehicules(() => (Math.floor(n++ / 6) % 2 ? 1 : 0))');
  assert.equal(run('vehicles[0].displaceRange'), 0.1);
  assert.equal(run('vehicles[1].displaceRange'), 0.5);
  assert.equal(run('controls.displaceRange.output.textContent'), '0.10 – 0.50');
  run('reglerParametre("displaceRange", 0.47)');
  assert.equal(run('vehicles.every(v => v.displaceRange === 0.47)'), true);
});

test('wander : force appliquée, une seule intégration, vitesse bornée et angle persistant', () => {
  const { run } = fixture();
  run('reglerNombreVehicules(1); const v = vehicles[0]; v.show = () => {}; const x = v.pos.x; const theta = v.wanderTheta; draw()');
  assert.ok(run('v.pos.x > x + 1'));
  assert.ok(run('v.wanderTheta > theta'));
  assert.equal(run('v.acc.mag()'), 0);
  run('reglerParametre("displaceRange", 0); const stableTheta = v.wanderTheta; const force = v.wander()');
  assert.ok(Math.abs(run('force.mag()') - run('v.maxForce')) < 1e-9);
  assert.equal(run('v.wanderTheta === stableTheta'), true);
  run('for (let i = 0; i < 100; i++) draw()');
  assert.ok(run('v.vel.mag() <= v.maxSpeed + 1e-9'));
});

test('normalisation des entrées invalides et des bornes exactes', () => {
  const { run } = fixture();
  assert.equal(run('normaliserParametre(NaN, parameterSpecs.displaceRange)'), 0.3);
  assert.equal(run('normaliserParametre(-10, parameterSpecs.displaceRange)'), 0);
  assert.equal(run('normaliserParametre(10, parameterSpecs.displaceRange)'), 1);
  assert.equal(run('normaliserParametre(0.736, parameterSpecs.displaceRange)'), 0.74);
});
