const test = require('node:test');
const assert = require('node:assert/strict');
const scene = require('../pursue-scene.js');

test('clamp keeps settings within their declared interval', () => {
  assert.equal(scene.clamp(-1, 0, 10), 0);
  assert.equal(scene.clamp(4, 0, 10), 4);
  assert.equal(scene.clamp(20, 0, 10), 10);
});

test('setPopulationSize preserves existing instances and resizes live', () => {
  const original = { id: 1 };
  const items = [original];
  let nextId = 2;
  assert.equal(scene.setPopulationSize(items, 3, () => ({ id: nextId++ })), 3);
  assert.strictEqual(items[0], original);
  assert.deepEqual(items.map(item => item.id), [1, 2, 3]);
  assert.equal(scene.setPopulationSize(items, 1, () => ({})), 1);
  assert.strictEqual(items[0], original);
});

test('nearestByDistance returns the closest target and its distance', () => {
  const origin = { x: 0, y: 0 };
  const near = { pos: { x: 3, y: 4 } };
  const far = { pos: { x: 20, y: 0 } };
  const result = scene.nearestByDistance(origin, [far, near]);
  assert.strictEqual(result.entity, near);
  assert.equal(result.distance, 5);
  assert.equal(scene.nearestByDistance(origin, []), null);
});

test('limits expose the controls used by the UI', () => {
  assert.equal(scene.LIMITS.vehicleCount.max, 50);
  assert.equal(scene.LIMITS.targetCount.max, 50);
  assert.equal(scene.LIMITS.predictionDistance.defaultValue, 20);
  assert.equal(scene.LIMITS.detectionRadius.defaultValue, 100);
  assert.equal(scene.LIMITS.decoyLifetime.defaultValue, 1);
  assert.equal(scene.LIMITS.decoysPerDetection.defaultValue, 10);
  assert.equal(scene.LIMITS.decoysPerDetection.max, 25);
  assert.equal(scene.LIMITS.decoyCooldown.defaultValue, 3);
});
