const test = require("node:test");
const assert = require("node:assert/strict");

const Plasma = require("../plasma.js");

test("la phase audio anime les couleurs même quand le temps autonome est figé", () => {
  const state = Plasma.createState({ speed: 0 });
  const first = new Uint8ClampedArray(12 * 8 * 4);
  const second = new Uint8ClampedArray(first.length);
  state.audio = { blend: 1, phase: 0, beat: 0 };
  Plasma.renderPixels(first, 12, 8, 600, 400, state);
  state.audio.phase = Math.PI / 2;
  Plasma.renderPixels(second, 12, 8, 600, 400, state);
  assert.notDeepEqual(first, second);
  assert.equal(state.time, 0);
});

test("la fin du fondu musical restitue exactement le plasma autonome", () => {
  const state = Plasma.createState();
  const first = new Uint8ClampedArray(12 * 8 * 4);
  const second = new Uint8ClampedArray(first.length);
  Plasma.renderPixels(first, 12, 8, 600, 400, state);
  state.audio = { blend: 0, phase: Math.PI / 2, beat: 1 };
  Plasma.renderPixels(second, 12, 8, 600, 400, state);
  assert.deepEqual(first, second);
});

test("normalise et borne tous les paramètres", () => {
  assert.equal(Plasma.normalizeParameter("speed", -2), 0);
  assert.equal(Plasma.normalizeParameter("speed", 8), 3);
  assert.equal(Plasma.normalizeParameter("complexity", 5.7), 6);
  assert.equal(Plasma.normalizeParameter("complexity", 20), 8);
  assert.equal(Plasma.normalizeParameter("blobSize", 10), 40);
  assert.equal(Plasma.normalizeParameter("hue", 500), 360);
  assert.equal(Plasma.normalizeParameter("saturation", 0), 40);
  assert.equal(Plasma.normalizeParameter("mouseInfluence", 5), 2);
  assert.throws(() => Plasma.normalizeParameter("inconnu", 1));
});

test("initialise le pointeur au centre et borne sa cible", () => {
  const state = Plasma.createState();
  assert.deepEqual(state.pointer, { x: 0.5, y: 0.5 });
  assert.deepEqual(state.pointerTarget, { x: 0.5, y: 0.5 });

  Plasma.setPointerTarget(state, -1, 4);
  assert.deepEqual(state.pointerTarget, { x: 0, y: 1 });
});

test("lisse le pointeur indépendamment de la vitesse du plasma", () => {
  const state = Plasma.createState({ speed: 0 });
  Plasma.setPointerTarget(state, 1, 0);
  Plasma.updateState(state, 16);

  assert.equal(state.time, 0);
  assert.ok(state.pointer.x > 0.5 && state.pointer.x < 1);
  assert.ok(state.pointer.y > 0 && state.pointer.y < 0.5);
});

test("fait progresser le temps selon la durée écoulée et la vitesse", () => {
  const state = Plasma.createState({ speed: 2 });
  Plasma.updateState(state, 250);
  assert.equal(state.time, 0.5);

  Plasma.setParameter(state, "speed", 0);
  Plasma.updateState(state, 500);
  assert.equal(state.time, 0.5);
});

test("boucle les teintes et produit les mêmes couleurs à 0 et 360 degrés", () => {
  assert.equal(Plasma.wrapHue(-30), 330);
  assert.equal(Plasma.wrapHue(390), 30);
  assert.deepEqual(Plasma.hsbToRgb(0, 100, 100), [255, 0, 0]);
  assert.deepEqual(Plasma.hsbToRgb(360, 100, 100), [255, 0, 0]);
});

test("conserve les mêmes composantes lorsque la complexité augmente", () => {
  const firstFour = Plasma.COMPONENTS.slice(0, 4);
  const firstSix = Plasma.COMPONENTS.slice(0, 6);
  assert.deepEqual(firstSix.slice(0, 4), firstFour);
  assert.equal(Object.isFrozen(Plasma.COMPONENTS), true);
});

test("calcule une surface proportionnelle dont le grand côté reste borné", () => {
  assert.deepEqual(Plasma.calculateRenderSize(1920, 1080), { width: 180, height: 101 });
  assert.deepEqual(Plasma.calculateRenderSize(100, 50), { width: 100, height: 50 });
});

test("réutilise une surface de bonne taille et recrée une surface incompatible", () => {
  const surface = { width: 180, height: 101 };
  assert.equal(Plasma.shouldRecreateSurface(surface, 180, 101), false);
  assert.equal(Plasma.shouldRecreateSurface(surface, 180, 100), true);
  assert.equal(Plasma.shouldRecreateSurface(undefined, 180, 101), true);
});

test("rend un tampon opaque avec des couleurs variées", () => {
  const state = Plasma.createState();
  const pixels = new Uint8ClampedArray(24 * 16 * 4);
  Plasma.renderPixels(pixels, 24, 16, 960, 640, state);

  const colors = new Set();
  for (let index = 0; index < pixels.length; index += 4) {
    assert.equal(pixels[index + 3], 255);
    colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`);
  }

  assert.ok(colors.size > 40);
});

test("une influence nulle rend l'image indépendante de la souris", () => {
  const firstState = Plasma.createState({ mouseInfluence: 0 });
  const secondState = Plasma.createState({ mouseInfluence: 0 });
  firstState.pointer = { x: 0, y: 0 };
  secondState.pointer = { x: 1, y: 1 };
  const firstPixels = new Uint8ClampedArray(12 * 8 * 4);
  const secondPixels = new Uint8ClampedArray(12 * 8 * 4);

  Plasma.renderPixels(firstPixels, 12, 8, 600, 400, firstState);
  Plasma.renderPixels(secondPixels, 12, 8, 600, 400, secondState);

  assert.deepEqual(firstPixels, secondPixels);
});

test("le déplacement de la souris modifie l'image lorsque son influence est active", () => {
  const firstState = Plasma.createState({ mouseInfluence: 1 });
  const secondState = Plasma.createState({ mouseInfluence: 1 });
  firstState.pointer = { x: 0.2, y: 0.3 };
  secondState.pointer = { x: 0.8, y: 0.7 };
  const firstPixels = new Uint8ClampedArray(12 * 8 * 4);
  const secondPixels = new Uint8ClampedArray(12 * 8 * 4);

  Plasma.renderPixels(firstPixels, 12, 8, 600, 400, firstState);
  Plasma.renderPixels(secondPixels, 12, 8, 600, 400, secondState);

  assert.notDeepEqual(firstPixels, secondPixels);
});
