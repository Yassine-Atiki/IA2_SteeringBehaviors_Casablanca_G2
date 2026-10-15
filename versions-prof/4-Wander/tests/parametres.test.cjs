const test = require('node:test');
const assert = require('node:assert/strict');
const { definitions, mutateValue, mutateVehicle, resizePopulation } = require('../parametres.js');

test('population adjustment preserves existing ships and changes only the requested count', () => {
  const first = {};
  const second = {};
  const ships = [first, second];
  const expanded = resizePopulation(ships, 4, () => ({}));
  assert.equal(expanded, ships);
  assert.equal(ships.length, 4);
  assert.equal(ships[0], first);
  assert.equal(ships[1], second);

  resizePopulation(ships, 1, () => assert.fail('must not create ships while reducing population'));
  assert.deepEqual(ships, [first]);
});

test('mutateValue moves by at least one valid step and clamps at each bound', () => {
  const spec = definitions.displaceRange;
  assert.equal(mutateValue(0.5, spec, () => 0), 0.49);
  let calls = 0;
  assert.equal(mutateValue(0.3, spec, () => (++calls % 2 === 1 ? 0.99 : 0)), 0.31);
  assert.equal(mutateValue(0.1, spec, () => 0), 0.1);
  assert.equal(mutateValue(0.5, spec, () => 0.99), 0.5);
});

test('mutation changes every per-vessel setting within its supported range', () => {
  const vehicle = {
    maxSpeed: 10, maxForce: 0.1, wanderRadius: 50, distanceCercle: 150,
    wanderWeight: 2, arriveWeight: 0.5, displaceRange: 0.3, pathLength: 10,
    path: Array.from({ length: 12 }, () => ({}))
  };
  let call = 0;
  const deterministicRandom = () => (++call % 2 === 1 ? 0.99 : 0);
  const result = mutateVehicle(vehicle, deterministicRandom);

  assert.equal(result, vehicle);
  assert.equal(call, Object.keys(definitions).length * 2);
  for (const [name, spec] of Object.entries(definitions)) {
    assert.ok(vehicle[name] >= spec.min && vehicle[name] <= spec.max, `${name} outside limits`);
    const precision = spec.step < 1 ? 2 : 0;
    assert.equal(Number(((vehicle[name] - spec.min) / spec.step).toFixed(precision)) % 1, 0, `${name} off step`);
  }
  assert.equal(vehicle.path.length, vehicle.pathLength);
});

test('mutation handles empty trails and values already at a limit', () => {
  const vehicle = {
    maxSpeed: 1, maxForce: 2, wanderRadius: 5, distanceCercle: 10,
    wanderWeight: 0, arriveWeight: 5, displaceRange: 0.1, pathLength: 0, path: []
  };
  let calls = 0;
  mutateVehicle(vehicle, () => (++calls % 2 === 1 ? 0.99 : 0));
  for (const [name, spec] of Object.entries(definitions)) {
    assert.ok(vehicle[name] >= spec.min && vehicle[name] <= spec.max, `${name} outside limits`);
  }
  assert.deepEqual(vehicle.path, []);
});
