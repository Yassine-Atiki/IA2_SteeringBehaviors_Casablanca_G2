const test = require("node:test");
const assert = require("node:assert/strict");

const TargetFuyante = require("../targetFuyante.js");

function createVector(x, y) {
  return {
    x,
    y,
    set(nextX, nextY) {
      this.x = nextX;
      this.y = nextY;
    },
    mag() {
      return Math.hypot(this.x, this.y);
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

test("TargetFuyante est une sous-classe de Target/Vehicle et possède les méthodes de steering", () => {
  const target = new TargetFuyante(100, 100);
  assert.ok(target.pos, "possède pos");
  assert.ok(target.vel, "possède vel");
  assert.ok(target.acc, "possède acc");
  assert.equal(typeof target.applyForce, "function");
  assert.equal(typeof target.seek, "function");
  assert.equal(typeof target.flee, "function");
  assert.equal(typeof target.applyBehaviors, "function");
  assert.equal(typeof target.update, "function");
});

test("TargetFuyante fuit un véhicule proche en utilisant les steering behaviors (flee)", () => {
  const target = new TargetFuyante(100, 100, { detectionRadius: 150 });
  const pursuer = createVehicle(120, 100); // à droite de la cible

  assert.equal(target.getState(), TargetFuyante.STATES.NORMAL);

  // Un pas de steering behavior avec un poursuivant à proximité
  target.applyBehaviors([pursuer], 16);

  // Doit être passé en état FLEEING
  assert.equal(target.getState(), TargetFuyante.STATES.FLEEING);
  assert.strictEqual(target.getThreat(), pursuer);

  // La force de fuite appliquée doit pousser vers la gauche (opposé de x = 120)
  assert.ok(target.acc.x < 0, "La force de fuite (flee) accélère à l'opposé de la menace");
});

test("TargetFuyante booste maxSpeed/maxForce pendant la fuite et les restaure après échappatoire", () => {
  const target = new TargetFuyante(100, 100, {
    detectionRadius: 150,
    exitDistance: 250,
    speedMultiplier: 2.5,
    forceMultiplier: 2,
  });
  const normalSpeed = target.maxSpeed;
  const normalForce = target.maxForce;

  const threat = createVehicle(140, 100);
  target.applyBehaviors([threat], 16);

  assert.equal(target.maxSpeed, normalSpeed * 2.5);
  assert.equal(target.maxForce, normalForce * 2);

  // La menace s'éloigne au-delà de exitDistance (350 px)
  threat.pos.x = 500;
  target.applyBehaviors([threat], 16);

  assert.equal(target.getState(), TargetFuyante.STATES.NORMAL);
  assert.equal(target.maxSpeed, normalSpeed);
  assert.equal(target.maxForce, normalForce);
});

test("TargetFuyante s'épuise après maxDuration et entre en cooldown", () => {
  const target = new TargetFuyante(100, 100, {
    detectionRadius: 150,
    maxDuration: 1.0,
  });
  const threat = createVehicle(120, 100);

  target.applyBehaviors([threat], 0);
  assert.equal(target.getState(), TargetFuyante.STATES.FLEEING);

  // Écoulement de 1000ms
  target.applyBehaviors([threat], 1000);
  assert.equal(target.getState(), TargetFuyante.STATES.COOLDOWN);
  assert.equal(target.getEndurance(), 0);
});

test("sélectionne la souris par défaut et conserve une cible autonome unique", () => {
  const mousePosition = createVector(10, 20);
  const autonomousTarget = new TargetFuyante(80, 90);
  const selector = TargetFuyante.createTargetSelector(mousePosition, autonomousTarget);

  const mouseTarget = selector.getActiveTarget();
  assert.equal(selector.getMode(), TargetFuyante.MODES.MOUSE);
  assert.strictEqual(mouseTarget.position, mousePosition);
  assert.equal(mouseTarget.radius, 16);

  selector.setMode(TargetFuyante.MODES.AUTONOMOUS);
  assert.strictEqual(selector.getAutonomousTarget(), autonomousTarget);
  assert.strictEqual(selector.getActiveTarget().position, autonomousTarget.pos);

  selector.setMode(TargetFuyante.MODES.FLEE);
  assert.equal(selector.getMode(), TargetFuyante.MODES.FLEE);
  assert.strictEqual(selector.getActiveTarget().position, autonomousTarget.pos);

  autonomousTarget.r = 47;
  assert.equal(selector.getActiveTarget().radius, 47);

  selector.setMode(TargetFuyante.MODES.MOUSE);
  selector.setMode(TargetFuyante.MODES.AUTONOMOUS);
  assert.strictEqual(selector.getAutonomousTarget(), autonomousTarget);
});

test("retombe sur le mode souris pour une valeur de menu inconnue", () => {
  assert.equal(TargetFuyante.normalizeMode("inconnu"), TargetFuyante.MODES.MOUSE);
});

test("détecte le contact avec la somme des rayons, seuil inclus", () => {
  const activeTarget = { position: createVector(50, 50), radius: 20 };

  assert.equal(TargetFuyante.hasReachedTarget(createVehicle(50, 50), activeTarget), true);
  assert.equal(TargetFuyante.hasReachedTarget(createVehicle(86, 50), activeTarget), true);
  assert.equal(TargetFuyante.hasReachedTarget(createVehicle(86.01, 50), activeTarget), false);
});

test("utilise le rayon courant de la cible", () => {
  const vehicle = createVehicle(90, 50, 10);
  const activeTarget = { position: createVector(50, 50), radius: 20 };

  assert.equal(TargetFuyante.hasReachedTarget(vehicle, activeTarget), false);
  activeTarget.radius = 30;
  assert.equal(TargetFuyante.hasReachedTarget(vehicle, activeTarget), true);
});

test("rejette une position dans la cible puis choisit une position valide", () => {
  const activeTarget = { position: createVector(50, 50), radius: 20 };
  const randomValue = sequenceRandom([0.5, 0.5, 0, 0]);

  const position = TargetFuyante.findRespawnPosition(
    100,
    100,
    10,
    activeTarget,
    randomValue,
    2
  );

  assert.deepEqual(position, { x: 10, y: 10 });
  assert.equal(TargetFuyante.isOutsideTarget(position, 10, activeTarget), true);
});

test("la stratégie de repli choisit le coin valide le plus éloigné", () => {
  const activeTarget = { position: createVector(10, 10), radius: 5 };

  const position = TargetFuyante.findRespawnPosition(
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

  const respawned = TargetFuyante.respawnVehicle(
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
