const test = require("node:test");
const assert = require("node:assert/strict");
const FleeScene = require("../flee-scene.js");

function vector(x, y) {
  return { x, y };
}

function createTarget() {
  return {
    pos: vector(0, 0),
    maxSpeed: 4,
    maxForce: 0.1,
    applied: 0,
    flee(position) {
      this.lastThreat = position;
      return { x: -1, y: 0 };
    },
    applyForce(force) {
      this.applied += 1;
      this.lastForce = force;
    },
  };
}

function vehicle(x, y) {
  return { pos: vector(x, y) };
}

test("normalise le rayon, la sortie et la durée", () => {
  const settings = FleeScene.normalizeSettings({ detectionRadius: 20, exitDistance: 30, maxDuration: 99 });
  assert.equal(settings.detectionRadius, 50);
  assert.equal(settings.exitDistance, 100);
  assert.equal(settings.maxDuration, 5);
  assert.equal(FleeScene.normalizeSettings({ detectionRadius: 250, exitDistance: 100 }).exitDistance, 250);
});

test("sélectionne la menace la plus proche dans le rayon, seuil inclus", () => {
  const nearest = FleeScene.nearestVehicle(vector(0, 0), [vehicle(150, 0), vehicle(50, 0), vehicle(200, 0)], 200);
  assert.equal(nearest.vehicle.pos.x, 50);
  assert.equal(FleeScene.nearestVehicle(vector(0, 0), [vehicle(201, 0)], 200), null);
});

test("fuit, augmente les limites puis les restaure à la sortie", () => {
  const target = createTarget();
  const threat = vehicle(100, 0);
  const controller = FleeScene.createController(target, [threat]);

  controller.step(16);
  assert.equal(controller.getState(), FleeScene.STATES.FLEEING);
  assert.equal(target.maxSpeed, 8);
  assert.equal(target.maxForce, 0.2);
  controller.step(16);
  assert.equal(target.applied, 1);

  threat.pos.x = 300;
  controller.step(16);
  assert.equal(controller.getState(), FleeScene.STATES.NORMAL);
  assert.equal(target.maxSpeed, 4);
  assert.equal(target.maxForce, 0.1);
});

test("la durée maximale provoque l'épuisement et empêche le redémarrage immédiat", () => {
  const target = createTarget();
  const threat = vehicle(100, 0);
  const controller = FleeScene.createController(target, [threat], { maxDuration: 0.5 });
  controller.step(0);
  controller.step(500);
  assert.equal(controller.getState(), FleeScene.STATES.COOLDOWN);
  assert.equal(controller.getEndurance(), 0);
  controller.step(16);
  assert.equal(controller.getState(), FleeScene.STATES.COOLDOWN);
  threat.pos.x = 250;
  controller.step(16);
  assert.equal(controller.getState(), FleeScene.STATES.NORMAL);
});
