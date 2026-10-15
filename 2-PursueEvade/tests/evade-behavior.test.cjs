const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vector(this.x, this.y); }
  add(value) { this.x += value.x; this.y += value.y; return this; }
  sub(value) { this.x -= value.x; this.y -= value.y; return this; }
  mult(value) { this.x *= value; this.y *= value; return this; }
  setMag(value) { const length = this.mag(); return length ? this.mult(value / length) : this; }
  limit(value) { if (this.mag() > value) this.setMag(value); return this; }
  mag() { return Math.hypot(this.x, this.y); }
  magSq() { return this.x * this.x + this.y * this.y; }
}
Vector.sub = (a, b) => new Vector(a.x - b.x, a.y - b.y);
Vector.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
Vector.dot = (a, b) => a.x * b.x + a.y * b.y;

const context = {
  createVector: (x, y) => new Vector(x, y),
  p5: { Vector },
  constrain: (value, min, max) => Math.min(max, Math.max(min, value)),
  Vehicle: undefined,
  console
};
vm.createContext(context);
vm.runInContext(`${fs.readFileSync(require.resolve('../vehicle.js'), 'utf8')}\nthis.Vehicle = Vehicle;`, context);

test('evade avoids a zero-direction prediction at the collision point', () => {
  const vehicle = new context.Vehicle(100, 0);
  vehicle.maxSpeed = 10;
  vehicle.maxForce = 10;
  const threat = { pos: new Vector(150, 0), vel: new Vector(-10, 0) };

  const predicted = vehicle.predictThreatPosition(threat, 20);
  assert.equal(predicted.x, 150);
  const force = vehicle.evade(threat, 20, false);
  assert.ok(force.x < 0, 'the vehicle must flee left, away from the current threat');
});

test('evade falls back to the current threat at the collision point', () => {
  const vehicle = new context.Vehicle(0, 0);
  vehicle.maxSpeed = 10;
  vehicle.maxForce = 10;
  const threat = { pos: new Vector(10, 0), vel: new Vector(-10, 0) };
  const force = vehicle.evade(threat, 20, false);
  assert.ok(force.x < 0);
});
