const test = require("node:test");
const assert = require("node:assert/strict");

function vector(x, y) {
  return {
    x, y,
    copy() { return vector(this.x, this.y); },
    add(other) { this.x += other.x; this.y += other.y; return this; },
    sub(other) { this.x -= other.x; this.y -= other.y; return this; },
    mult(value) { this.x *= value; this.y *= value; return this; },
    magSq() { return this.x * this.x + this.y * this.y; },
    mag() { return Math.sqrt(this.magSq()); },
    setMag(value) { const length = this.mag(); if (length) this.mult(value / length); return this; },
    limit(value) { if (this.mag() > value) this.setMag(value); return this; },
    set(nextX, nextY) { this.x = nextX; this.y = nextY; },
  };
}

global.createVector = vector;
global.p5 = { Vector: {
  sub(first, second) { return vector(first.x - second.x, first.y - second.y); },
} };
global.Target = class {
  constructor(x, y) {
    this.pos = vector(x, y); this.vel = vector(0, 0); this.acc = vector(0, 0);
    this.maxSpeed = 4; this.maxForce = 0.1; this.r = 50;
  }
  applyForce(force) { this.acc.add(force); }
  flee(position) {
    const desired = global.p5.Vector.sub(this.pos, position);
    if (desired.magSq() === 0) return vector(0, 0);
    desired.setMag(this.maxSpeed);
    return global.p5.Vector.sub(desired, this.vel).limit(this.maxForce);
  }
};

const { TargetFuyante } = require("../targetFuyante.js");

function vehicle(x, y) { return { pos: vector(x, y) }; }

test("TargetFuyante est une sous-classe de Target", () => {
  const target = new TargetFuyante(0, 0);
  assert.equal(target instanceof global.Target, true);
});

test("borne les paramètres et conserve la sortie au moins au rayon de détection", () => {
  const target = new TargetFuyante(0, 0);
  assert.deepEqual(target.setFleeSettings({ detectionRadius: 20, exitDistance: 30, maxDuration: 99 }), {
    detectionRadius: 50, exitDistance: 100, maxDuration: 5, duplicationDuration: 4,
    speedMultiplier: 2, forceMultiplier: 2,
  });
  assert.equal(target.setFleeSettings({ detectionRadius: 250, exitDistance: 100 }).exitDistance, 250);
});

test("signale une duplication après la durée de survie, une seule fois", () => {
  const target = new TargetFuyante(0, 0);
  target.setDuplicationDuration(4);
  assert.equal(target.advanceSurvival(3999), false);
  assert.equal(target.advanceSurvival(1), true);
  assert.equal(target.isDuplicating(), true);
  assert.equal(target.getDuplicationProgress(), 0);
  assert.equal(target.advanceDuplication(350), false);
  assert.equal(target.getDuplicationProgress(), 0.5);
  assert.equal(target.advanceDuplication(350), true);
  assert.equal(target.getDuplicationProgress(), 1);
  assert.equal(target.advanceSurvival(1000), false);
});

test("sélectionne le véhicule le plus proche dans le rayon, seuil inclus", () => {
  const target = new TargetFuyante(0, 0);
  const nearest = target.findNearestThreat([vehicle(150, 0), vehicle(50, 0), vehicle(200, 0)]);
  assert.equal(nearest.vehicle.pos.x, 50);
  assert.equal(target.findNearestThreat([vehicle(201, 0)]), null);
});

test("applique le steering flee et restaure vitesse et force à la sortie", () => {
  const target = new TargetFuyante(0, 0);
  const threat = vehicle(100, 0);
  target.updateFlee([threat], 0);
  assert.equal(target.isFleeing(), true);
  assert.equal(target.maxSpeed, 8);
  assert.equal(target.maxForce, 0.2);
  target.updateFlee([threat], 16);
  assert.ok(target.acc.x < 0);
  threat.pos.x = 300;
  target.updateFlee([threat], 16);
  assert.equal(target.getFleeState(), TargetFuyante.STATES.NORMAL);
  assert.equal(target.maxSpeed, 4);
  assert.equal(target.maxForce, 0.1);
});

test("la durée maximale épuise la cible et active le cooldown", () => {
  const target = new TargetFuyante(0, 0);
  const threat = vehicle(100, 0);
  target.setFleeSettings({ maxDuration: 0.5 });
  target.updateFlee([threat], 0);
  target.updateFlee([threat], 500);
  assert.equal(target.getFleeState(), TargetFuyante.STATES.COOLDOWN);
  assert.equal(target.getEndurance(), 0);
  target.updateFlee([threat], 16);
  assert.equal(target.getFleeState(), TargetFuyante.STATES.COOLDOWN);
  threat.pos.x = 250;
  target.updateFlee([threat], 16);
  assert.equal(target.getFleeState(), TargetFuyante.STATES.NORMAL);
});
