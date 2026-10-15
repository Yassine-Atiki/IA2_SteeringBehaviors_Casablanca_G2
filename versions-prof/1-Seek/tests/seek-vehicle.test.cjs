const test = require("node:test");
const assert = require("node:assert/strict");

global.Vehicle = class {
  constructor() { this.vectorCalls = 0; }
  drawVelocityVector() { this.vectorCalls += 1; }
};

const SeekVehicle = require("../seek-vehicle.js");

test("masque le vecteur de vitesse hors mode debug", () => {
  const vehicle = new SeekVehicle();
  SeekVehicle.debug = false;
  vehicle.drawVelocityVector();
  assert.equal(vehicle.vectorCalls, 0);
  SeekVehicle.debug = true;
  vehicle.drawVelocityVector();
  assert.equal(vehicle.vectorCalls, 1);
});
