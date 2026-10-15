const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vector(this.x, this.y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  add(vector) { this.x += vector.x; this.y += vector.y; return this; }
  sub(vector) { this.x -= vector.x; this.y -= vector.y; return this; }
  mult(value) { this.x *= value; this.y *= value; return this; }
  magSq() { return this.x * this.x + this.y * this.y; }
  mag() { return Math.sqrt(this.magSq()); }
  heading() { return Math.atan2(this.y, this.x); }
  normalize() { const magnitude = this.mag(); if (magnitude) this.mult(1 / magnitude); return this; }
  setMag(value) { return this.normalize().mult(value); }
  limit(maximum) { if (this.magSq() > maximum * maximum) this.setMag(maximum); return this; }
  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
  static dist(a, b) { return Vector.sub(a, b).mag(); }
}

const drawnCircles = [];
const context = vm.createContext({
  createVector: (x, y) => new Vector(x, y),
  p5: { Vector },
  map: (value, start1, stop1, start2, stop2) => start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1)),
  push() {}, pop() {}, noStroke() {}, fill() {}, stroke() {}, strokeWeight() {}, translate() {}, rotate() {}, line() {},
  circle: (...args) => drawnCircles.push(args)
});
const folder = path.join(__dirname, "..");
vm.runInContext(`${fs.readFileSync(path.join(folder, "vehicle.js"), "utf8")}\nthis.Vehicle = Vehicle;`, context);
vm.runInContext(`${fs.readFileSync(path.join(folder, "snake.js"), "utf8")}\nthis.Snake = Snake;`, context);
vm.runInContext(`${fs.readFileSync(path.join(folder, "food.js"), "utf8")}\nthis.Food = Food;`, context);
const { Vehicle, Snake, Food } = context;

test("Snake extends Vehicle and creates Vehicle head and requested rings", () => {
  const snake = new Snake(100, 80, 3, 9, "#f00");
  assert.ok(snake instanceof Vehicle);
  assert.ok(snake.head instanceof Vehicle);
  assert.equal(snake.anneaux.length, 3);
  assert.ok(snake.anneaux.every((ring) => ring instanceof Vehicle));
  assert.equal(snake.taille, 9);
  assert.equal(snake.head.r, 9);
  assert.ok(snake.anneaux.every((ring) => ring.r === 9));
  assert.equal(snake.couleur, "#f00");
});

test("each ring targets the centre of the preceding vehicle", () => {
  const snake = new Snake(100, 100, 1, 10);
  snake.head.pos.set(100, 100);
  const target = snake.head.pos;
  assert.equal(target.x, 100);
  assert.equal(target.y, 100);
  assert.equal(snake.distanceDeSuivi, 20);
});

test("each ring arrives at the preceding centre with the configured spacing", () => {
  const snake = new Snake(100, 100, 2, 10);
  const appels = [];
  for (const anneau of snake.anneaux) {
    const arrive = anneau.arrive.bind(anneau);
    anneau.arrive = (cible, distance) => {
      appels.push({ anneau, cible, distance });
      return arrive(cible, distance);
    };
  }
  snake.update(createTestVector(300, 100));

  assert.equal(appels.length, 2);
  assert.equal(appels[0].cible, snake.head.pos);
  assert.equal(appels[1].cible, snake.anneaux[0].pos);
  assert.ok(appels.every((appel) => appel.distance === snake.distanceDeSuivi));
});

test("head and ring settings can be changed independently on existing parts", () => {
  const snake = new Snake(0, 0, 2, 8, "green", {
    maxSpeedTete: 3, maxForceTete: 0.15, maxSpeedAnneaux: 5, maxForceAnneaux: 0.3
  });
  snake.appliquerParametres({ maxSpeedTete: 7, maxForceTete: 0.4, maxSpeedAnneaux: 2, maxForceAnneaux: 0.08 });
  assert.equal(snake.head.maxSpeed, 7);
  assert.equal(snake.head.maxForce, 0.4);
  assert.ok(snake.anneaux.every((ring) => ring.maxSpeed === 2 && ring.maxForce === 0.08));
});

test("eating food can add a ring with the body's independent parameters", () => {
  const snake = new Snake(100, 100, 1, 8, "green", {
    maxSpeedAnneaux: 3, maxForceAnneaux: 0.12
  });
  snake.ajouterAnneau();
  const dernier = snake.anneaux.at(-1);
  assert.equal(snake.anneaux.length, 2);
  assert.equal(dernier.r, 8);
  assert.equal(dernier.maxSpeed, 3);
  assert.equal(dernier.maxForce, 0.12);
});

test("Food is an immobile Vehicle and resets its movement when repositioned", () => {
  const food = new Food(10, 20, 9);
  assert.ok(food instanceof Vehicle);
  food.vel.set(4, -2);
  food.acc.set(1, 1);
  food.repositionner(80, 60);
  assert.equal(food.pos.x, 80);
  assert.equal(food.pos.y, 60);
  assert.equal(food.vel.mag(), 0);
  assert.equal(food.acc.mag(), 0);
});

test("show draws shadows, detailed rings and an oriented head", () => {
  const snake = new Snake(20, 30, 2, 7, "orange");
  drawnCircles.length = 0;
  snake.show();
  assert.ok(drawnCircles.length > 9);
  assert.ok(drawnCircles.some((circle) => circle[2] === 14));
  assert.ok(drawnCircles.some((circle) => circle[2] === 7 * 2.35));
});

test("update applies steering and integrates every part once, respecting speed limits", () => {
  const snake = new Snake(0, 0, 2, 5, "blue", {
    maxSpeedTete: 1, maxForceTete: 0.1, maxSpeedAnneaux: 0.5, maxForceAnneaux: 0.05
  });
  const parts = [snake.head, ...snake.anneaux];
  const updates = new Map(parts.map((part) => [part, 0]));
  for (const part of parts) {
    const update = part.update.bind(part);
    part.update = () => { updates.set(part, updates.get(part) + 1); update(); };
  }

  snake.update(createTestVector(1000, 1000));
  assert.ok(parts.every((part) => updates.get(part) === 1));
  assert.ok(snake.head.vel.mag() <= 1 + 1e-9);
  assert.ok(snake.anneaux.every((ring) => ring.vel.mag() <= 0.5 + 1e-9));
  assert.ok(parts.every((part) => Number.isFinite(part.pos.x) && Number.isFinite(part.pos.y)));
});

test("a coincident, stationary follow target produces finite values", () => {
  const snake = new Snake(10, 10, 1, 10);
  snake.head.pos.set(10, 10);
  snake.head.vel.set(0, 0);
  snake.anneaux[0].pos.set(10, 10);
  snake.update(createTestVector(10, 10));
  assert.ok([snake.head, ...snake.anneaux].every((part) =>
    Number.isFinite(part.pos.x) && Number.isFinite(part.pos.y) && Number.isFinite(part.vel.x) && Number.isFinite(part.vel.y)
  ));
});

test("sketch.js parses as a browser script", () => {
  const source = fs.readFileSync(path.join(folder, "sketch.js"), "utf8");
  assert.doesNotThrow(() => new vm.Script(source));
});

function createTestVector(x, y) { return new Vector(x, y); }
