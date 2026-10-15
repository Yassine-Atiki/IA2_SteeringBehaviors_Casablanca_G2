const test = require("node:test");
const assert = require("node:assert/strict");

const TargetScene = require("../target-utils.js");

function createVector(x, y) {
  return {
    x,
    y,
    set(nextX, nextY) {
      this.x = nextX;
      this.y = nextY;
    },
  };
}

function createVehicle(x, y, radius = 16) {
  return {
    pos: createVector(x, y),
    vel: createVector(5, -3),
    acc: createVector(0.2, 0.4),
    r: radius,
    maxSpeed: 12,
    maxForce: 0.8,
  };
}

function sequenceRandom(values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

test("sélectionne la souris par défaut et conserve une cible autonome unique", () => {
  const mousePosition = createVector(10, 20);
  const autonomousTarget = { pos: createVector(80, 90), r: 25 };
  const selector = TargetScene.createTargetSelector(mousePosition, autonomousTarget);

  const mouseTarget = selector.getActiveTarget();
  assert.equal(selector.getMode(), TargetScene.MODES.MOUSE);
  assert.strictEqual(mouseTarget.position, mousePosition);
  assert.equal(mouseTarget.radius, 16);

  selector.setMode(TargetScene.MODES.AUTONOMOUS);
  assert.strictEqual(selector.getAutonomousTarget(), autonomousTarget);
  assert.strictEqual(selector.getActiveTarget().position, autonomousTarget.pos);

  selector.setMode(TargetScene.MODES.FLEE);
  assert.equal(selector.getMode(), TargetScene.MODES.FLEE);
  assert.strictEqual(selector.getActiveTarget().position, autonomousTarget.pos);

  autonomousTarget.r = 47;
  assert.equal(selector.getActiveTarget().radius, 47);

  selector.setMode(TargetScene.MODES.MOUSE);
  selector.setMode(TargetScene.MODES.AUTONOMOUS);
  assert.strictEqual(selector.getAutonomousTarget(), autonomousTarget);
});

test("retombe sur le mode souris pour une valeur de menu inconnue", () => {
  assert.equal(TargetScene.normalizeMode("inconnu"), TargetScene.MODES.MOUSE);
});

test("adapte une Target en descripteur avec une position p5.Vector", () => {
  const target = { pos: createVector(12, 24), r: 30 };
  const activeTarget = TargetScene.asActiveTarget(target, TargetScene.MODES.FLEE);
  assert.strictEqual(activeTarget.position, target.pos);
  assert.equal(activeTarget.radius, 30);
});

test("détecte le contact avec la somme des rayons, seuil inclus", () => {
  const activeTarget = { position: createVector(50, 50), radius: 20 };

  assert.equal(TargetScene.hasReachedTarget(createVehicle(50, 50), activeTarget), true);
  assert.equal(TargetScene.hasReachedTarget(createVehicle(86, 50), activeTarget), true);
  assert.equal(TargetScene.hasReachedTarget(createVehicle(86.01, 50), activeTarget), false);
});

test("utilise le rayon courant de la cible", () => {
  const vehicle = createVehicle(90, 50, 10);
  const activeTarget = { position: createVector(50, 50), radius: 20 };

  assert.equal(TargetScene.hasReachedTarget(vehicle, activeTarget), false);
  activeTarget.radius = 30;
  assert.equal(TargetScene.hasReachedTarget(vehicle, activeTarget), true);
});

test("rejette une position dans la cible puis choisit une position valide", () => {
  const activeTarget = { position: createVector(50, 50), radius: 20 };
  const randomValue = sequenceRandom([0.5, 0.5, 0, 0]);

  const position = TargetScene.findRespawnPosition(
    100,
    100,
    10,
    activeTarget,
    randomValue,
    2
  );

  assert.deepEqual(position, { x: 10, y: 10 });
  assert.equal(TargetScene.isOutsideTarget(position, 10, activeTarget), true);
});

test("la stratégie de repli choisit le coin valide le plus éloigné", () => {
  const activeTarget = { position: createVector(10, 10), radius: 5 };

  const position = TargetScene.findRespawnPosition(
    100,
    80,
    10,
    activeTarget,
    () => 0,
    0
  );

  assert.deepEqual(position, { x: 90, y: 70 });
});

test("fait réapparaître la même instance sans modifier ses paramètres", () => {
  const vehicle = createVehicle(50, 50, 10);
  const vehicles = [vehicle];
  const activeTarget = { position: createVector(50, 50), radius: 20 };

  const respawned = TargetScene.respawnVehicle(
    vehicle,
    100,
    100,
    activeTarget,
    sequenceRandom([0.5, 0.5, 0, 0])
  );

  assert.strictEqual(respawned, vehicle);
  assert.strictEqual(vehicles[0], vehicle);
  assert.equal(vehicles.length, 1);
  assert.deepEqual({ x: vehicle.pos.x, y: vehicle.pos.y }, { x: 10, y: 10 });
  assert.deepEqual({ x: vehicle.vel.x, y: vehicle.vel.y }, { x: 0, y: 0 });
  assert.deepEqual({ x: vehicle.acc.x, y: vehicle.acc.y }, { x: 0, y: 0 });
  assert.equal(vehicle.maxSpeed, 12);
  assert.equal(vehicle.maxForce, 0.8);
});
