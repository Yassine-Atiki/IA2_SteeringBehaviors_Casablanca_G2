const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function vector(x, y) {
  return {
    x, y,
    sub(value) { this.x -= value.x; this.y -= value.y; return this; },
    mult(value) { this.x *= value; this.y *= value; return this; },
    magSq() { return this.x ** 2 + this.y ** 2; },
    mag() { return Math.sqrt(this.magSq()); },
    setMag(value) { const length = this.mag(); if (length) { this.x *= value / length; this.y *= value / length; } return this; },
    limit(value) { if (this.mag() > value) this.setMag(value); return this; },
  };
}

function loadVehicle(file) {
  const context = {
    createVector: vector,
    p5: { Vector: {
      sub(a, b) { return vector(a.x - b.x, a.y - b.y); },
      dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); },
    } },
    map: () => 0,
    random: () => 0,
    width: 1000,
    height: 1000,
    console,
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  vm.runInContext(`${source}\n globalThis.Vehicle = Vehicle;`, context);
  return context.Vehicle;
}

for (const file of [
  // Les exercices personnalises gardent leur propre contrat de locomotion.
  // Cette suite du cours valide les copies intactes du professeur.
  "versions-prof/1-Seek/vehicle.js",
  "2-PursueEvade/vehicle.js",
  "2-PursueEvade_correction/vehicle.js",
  "versions-prof/3-Arrival/vehicle.js",
  "3-Arrival_correction/vehicle.js",
  "versions-prof/4-Wander/vehicle.js",
]) {
  test(`${file} calcule un flee opposé à la menace avec correction de vitesse`, () => {
    const Vehicle = loadVehicle(file);
    const vehicle = Object.create(Vehicle.prototype);
    vehicle.pos = vector(0, 0);
    vehicle.vel = vector(0, 2);
    vehicle.maxSpeed = 4;
    vehicle.maxForce = 0.1;
    const force = vehicle.flee(vector(100, 0));
    assert.ok(force.x < 0);
    assert.ok(force.y < 0);
    assert.ok(Math.abs(Math.hypot(force.x, force.y) - 0.1) < 1e-9);
  });
}
