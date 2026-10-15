const test = require("node:test");
const assert = require("node:assert/strict");

const VehiclePopulation = require("../population.js");

function createVelocity(magnitude = 0) {
  return {
    magnitude,
    limit(maximum) {
      this.magnitude = Math.min(this.magnitude, maximum);
    },
  };
}

function createVehicle(id, speed = 4, force = 0.1, velocity = 0) {
  return {
    id,
    maxSpeed: speed,
    maxForce: force,
    vel: createVelocity(velocity),
  };
}

test("normalise et borne le nombre de véhicules", () => {
  assert.equal(VehiclePopulation.normalizeCount("42"), 42);
  assert.equal(VehiclePopulation.normalizeCount(12.6), 13);
  assert.equal(VehiclePopulation.normalizeCount(-5), 1);
  assert.equal(VehiclePopulation.normalizeCount(500), 200);
  assert.equal(VehiclePopulation.normalizeCount("invalide"), 20);
});

test("ajoute seulement les véhicules manquants et conserve les instances", () => {
  const first = createVehicle("premier");
  const vehicles = [first];
  let nextId = 1;

  const count = VehiclePopulation.setPopulationSize(
    vehicles,
    4,
    () => createVehicle(`nouveau-${nextId++}`)
  );

  assert.equal(count, 4);
  assert.equal(vehicles.length, 4);
  assert.strictEqual(vehicles[0], first);
  assert.deepEqual(
    vehicles.map((vehicle) => vehicle.id),
    ["premier", "nouveau-1", "nouveau-2", "nouveau-3"]
  );
});

test("retire seulement le surplus et conserve l'état des véhicules restants", () => {
  const vehicles = [
    createVehicle("a"),
    createVehicle("b"),
    createVehicle("c"),
  ];
  vehicles[1].customState = "conservé";

  VehiclePopulation.setPopulationSize(vehicles, 2, () => {
    throw new Error("aucun véhicule ne doit être créé");
  });

  assert.equal(vehicles.length, 2);
  assert.equal(vehicles[1].customState, "conservé");
  assert.equal(vehicles[1].id, "b");
});

test("applique et borne la vitesse maximale de tous les véhicules", () => {
  const vehicles = [
    createVehicle("a", 4, 0.1, 12),
    createVehicle("b", 4, 0.1, 3),
  ];

  const appliedSpeed = VehiclePopulation.setMaxSpeed(vehicles, "5.5");

  assert.equal(appliedSpeed, 5.5);
  assert.deepEqual(vehicles.map((vehicle) => vehicle.maxSpeed), [5.5, 5.5]);
  assert.deepEqual(vehicles.map((vehicle) => vehicle.vel.magnitude), [5.5, 3]);
  assert.equal(VehiclePopulation.setMaxSpeed(vehicles, 50), 40);
  assert.equal(VehiclePopulation.setMaxSpeed(vehicles, -1), 0);
  assert.deepEqual(vehicles.map((vehicle) => vehicle.vel.magnitude), [0, 0]);
});

test("applique et borne la force maximale de tous les véhicules", () => {
  const vehicles = [createVehicle("a"), createVehicle("b")];

  assert.equal(VehiclePopulation.setMaxForce(vehicles, "2.25"), 2.25);
  assert.deepEqual(vehicles.map((vehicle) => vehicle.maxForce), [2.25, 2.25]);
  assert.equal(VehiclePopulation.setMaxForce(vehicles, 12), 10);
  assert.equal(VehiclePopulation.setMaxForce(vehicles, -2), 0);
});

test("un nouveau véhicule hérite des limites courantes", () => {
  const vehicle = createVehicle("nouveau", 4, 0.1, 18);

  const configured = VehiclePopulation.configureVehicle(vehicle, 7.5, 0.35);

  assert.strictEqual(configured, vehicle);
  assert.equal(vehicle.maxSpeed, 7.5);
  assert.equal(vehicle.maxForce, 0.35);
  assert.equal(vehicle.vel.magnitude, 7.5);
});

test("calcule une coordonnée qui garde le véhicule dans le canvas", () => {
  assert.equal(VehiclePopulation.randomCoordinate(100, 10, () => 0), 10);
  assert.equal(VehiclePopulation.randomCoordinate(100, 10, () => 1), 90);
  assert.equal(VehiclePopulation.randomCoordinate(100, 10, () => 0.5), 50);
  assert.equal(VehiclePopulation.randomCoordinate(20, 16, () => 0), 10);
});

test("réagit à chaque événement input et actualise la valeur affichée", () => {
  const input = new EventTarget();
  const output = { value: "", textContent: "" };
  const receivedValues = [];
  input.value = "4";

  const unbind = VehiclePopulation.bindRangeControl(
    input,
    output,
    (value) => {
      const number = Number(value);
      receivedValues.push(number);
      return number;
    },
    (value) => value.toFixed(1)
  );

  input.value = "6.5";
  input.dispatchEvent(new Event("input"));
  input.value = "8";
  input.dispatchEvent(new Event("input"));

  assert.deepEqual(receivedValues, [4, 6.5, 8]);
  assert.equal(output.value, "8.0");
  assert.equal(output.textContent, "8.0");

  unbind();
  input.value = "9";
  input.dispatchEvent(new Event("input"));
  assert.deepEqual(receivedValues, [4, 6.5, 8]);
});
