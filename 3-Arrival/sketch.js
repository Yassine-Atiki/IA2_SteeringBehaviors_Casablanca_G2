const serpents = [];
const couleursSerpents = ['#39FF88', '#00E5FF', '#8B5CFF', '#FFB547', '#F3F7FF', '#FF4268'];
const parametresSerpent = { maxSpeedTete: 4, maxForceTete: 0.2, maxSpeedAnneaux: 4, maxForceAnneaux: 0.2 };
let session, audio, effects, renderer, ui, nourriture, cibleSouris, menuSnake, menuTarget;
let arenaBounds, uiAccumulator = 0, visualOverdrive = 0, visualClock = 0, numeroCouleur = 0;
let lastPlayTick = 0;

function setup() {
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('arena');
  canvas.elt.tabIndex = 0;
  canvas.elt.setAttribute('aria-label', 'Suivez la souris ou faites glisser le doigt pour guider le serpent.');
  canvas.elt.setAttribute('aria-keyshortcuts', 'P R M H Space');
  frameRate(60);
  let storage = null;
  try { storage = window.localStorage; } catch {}
  session = new ArenaSession(storage);
  audio = new ArenaAudio();
  audio.setActive(true); // No context or audible playback until a user interaction.
  effects = new ArenaEffects();
  effects.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.toggle('reduced', effects.reduced);
  renderer = new ArenaRenderer();
  arenaBounds = getArenaBounds();
  renderer.resize(width, height, arenaBounds);
  effects.seed(arenaBounds);
  cibleSouris = createVector(width / 2, arenaBounds.y + arenaBounds.h / 2);
  menuTarget = createVector(width * 0.75, height * 0.53);
  createMenuSnake();
  nourriture = new NeonFood(width * 0.72, arenaBounds.y + arenaBounds.h / 2);
  ui = new ArenaUI({
    start: startGame, menu: returnToMenu, pause: pauseGame, resume: resumeGame,
    restart: () => { if (session.state !== 'MENU') startGame(); },
    togglePause: () => { if (session.state === 'PLAYING') pauseGame(); else if (session.state === 'PAUSED') resumeGame(); },
    overdrive: activateOverdrive, add: ajouterSerpent, isPlaying: () => session.state === 'PLAYING',
    isMenu: () => session.state === 'MENU',
    parameters: () => serpents.forEach(s => s.appliquerParametres(parametresSerpent)),
    effects: () => { effects.reset(); effects.seed(arenaBounds); serpents.forEach(s => { s.trail.length = 0; }); }
  }, audio, effects, parametresSerpent);
  canvas.elt.addEventListener('pointermove', pointerTarget);
  canvas.elt.addEventListener('pointerdown', event => {
    pointerTarget(event);
    if (event.pointerType !== 'mouse') canvas.elt.setPointerCapture(event.pointerId);
    canvas.elt.focus({ preventScroll: true });
    void audio.unlock();
  });
  ui.update(session, serpents);
  describe('Neon Serpent. La tête et les anneaux utilisent arrive. Souris ou toucher pour guider, P pour pause, H pour les réglages, M pour le son et espace pour Overdrive.');
}

function getArenaBounds() {
  // HUD and controls float above the world; they do not shrink its movement area.
  return { x: 0, y: 0, w: Math.max(1, width), h: Math.max(1, height) };
}

function createMenuSnake() {
  menuSnake = new NeonSnake(width * 0.82, height * (width < 600 ? 0.83 : 0.55), width < 600 ? 13 : 20, width < 600 ? 10 : 15, '#39FF88',
    { maxSpeedTete: 3, maxForceTete: 0.12, maxSpeedAnneaux: 3.5, maxForceAnneaux: 0.16 });
}

function pointerTarget(event) {
  if (session.state !== 'PLAYING') return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) * width / rect.width;
  const y = (event.clientY - rect.top) * height / rect.height;
  cibleSouris.set(constrain(x, arenaBounds.x + 14, arenaBounds.x + arenaBounds.w - 14),
    constrain(y, arenaBounds.y + 14, arenaBounds.y + arenaBounds.h - 14));
}

function startGame(mode = session.mode) {
  if (ui.dialog.open) { ui.resumeAfterSettings = false; ui.dialog.close(); }
  session.start(mode);
  lastPlayTick = performance.now();
  serpents.length = 0;
  numeroCouleur = 0;
  effects.reset();
  effects.seed(arenaBounds);
  audio.reset();
  audio.setAmbienceAllowed(true);
  audio.setActive(true);
  visualOverdrive = 0;
  visualClock = 0;
  uiAccumulator = 0;
  ui.clearFeedback();
  cibleSouris.set(arenaBounds.x + arenaBounds.w * 0.48, arenaBounds.y + arenaBounds.h * 0.5);
  ajouterSerpent();
  placerNourriture();
  ui.update(session, serpents);
  document.querySelector('#arena canvas').focus({ preventScroll: true });
  audio.play('ui');
  ui.toast(mode === 'sandbox' ? 'MODE LIBRE / EXPÉRIMENTEZ' : '90 SECONDES / OBJECTIF 3 000');
}

function ajouterSerpent() {
  if (serpents.length >= 6 || (session.mode === 'arcade' && serpents.length > 0)) return;
  const x = arenaBounds.x + arenaBounds.w * (serpents.length === 0 ? 0.48 : 0.6);
  const y = arenaBounds.y + arenaBounds.h * 0.5;
  const size = width < 600 ? 9 : 12;
  const rings = Math.max(4, Math.min(14, Math.floor((x - arenaBounds.x - 10) / (size * 2))));
  const snake = new NeonSnake(x, y, rings, size, couleursSerpents[numeroCouleur++ % couleursSerpents.length], parametresSerpent);
  serpents.push(snake);
  if (ui) ui.update(session, serpents);
}

function pauseGame() {
  if (session.state !== 'PLAYING') return;
  session.pause();
  audio.setActive(false);
  ui.update(session, serpents);
}

function resumeGame() {
  if (session.state !== 'PAUSED' || ui.dialog.open || document.hidden) return;
  session.resume();
  lastPlayTick = performance.now();
  audio.setActive(true);
  void audio.unlock();
  ui.update(session, serpents);
  document.querySelector('#arena canvas').focus({ preventScroll: true });
}

function returnToMenu() {
  if (ui.dialog.open) { ui.resumeAfterSettings = false; ui.dialog.close(); }
  session.menu();
  serpents.length = 0;
  effects.reset();
  audio.reset();
  audio.setAmbienceAllowed(true);
  audio.setActive(true);
  visualOverdrive = 0;
  ui.clearFeedback();
  createMenuSnake();
  ui.update(session, serpents);
}

function activateOverdrive() {
  if (!session.activateOverdrive()) return;
  effects.burst(serpents[0].head.pos.x, serpents[0].head.pos.y, '#39FF88', 1.5);
  audio.setOverdrive(true);
  audio.play('overdrive');
  ui.toast('OVERDRIVE / SCORE ×2 / 8 SECONDES');
  ui.update(session, serpents);
}

function placerNourriture() {
  const parts = serpents.flatMap(s => [s.head, ...s.anneaux]);
  // Avoid actual visible panels, instead of excluding full bands of the screen.
  const panels = Array.from(document.querySelectorAll('.wordmark, .header-actions, #hud > div, #game-toolbar > div'))
    .map(el => el.getBoundingClientRect())
    .filter(rect => rect.width > 0 && rect.height > 0)
    .map(rect => ({ x: rect.left, y: rect.top, w: rect.width, h: rect.height }));
  const position = findCorePosition(arenaBounds, parts, nourriture.r, Math.random, panels);
  nourriture.repositionner(position.x, position.y);
}

function verifierNourriture(serpent, generation) {
  if (p5.Vector.dist(serpent.head.pos, nourriture.pos) > serpent.head.r + nourriture.r) return false;
  const result = session.collect(generation);
  if (!result) return false;
  if (serpent.anneaux.length < 160) serpent.ajouterAnneau();
  const { x, y } = nourriture.pos;
  serpent.flare = 1;
  effects.burst(x, y, result.milestone ? '#39FF88' : '#00E5FF');
  ui.collection(result.points, x, y);
  audio.play(result.milestone ? 'combo' : 'collect');
  if (result.milestone) ui.toast('COMBO ×' + result.combo);
  if (session.charge === 100 && session.overdriveLeft === 0) ui.toast('OVERDRIVE PRÊT / ESPACE');
  placerNourriture();
  ui.update(session, serpents);
  if (result.won) endRound('victory');
  return true;
}

function endRound(sound) {
  audio.reset();
  audio.setAmbienceAllowed(false);
  audio.play(sound);
  ui.clearFeedback();
  ui.update(session, serpents);
}

function draw() {
  if (!session || document.hidden) return;
  const dt = Math.min(0.05, Math.max(0, deltaTime / 1000));
  const playing = session.state === 'PLAYING';
  const menu = session.state === 'MENU';
  const animated = playing || menu;
  if (animated) {
    visualClock += dt;
    effects.step(dt, arenaBounds);
    const desired = session.overdriveLeft > 0 ? 1 : 0;
    visualOverdrive += (desired - visualOverdrive) * Math.min(1, dt * 4);
    if (playing) {
      const previousOverdrive = session.overdriveLeft > 0;
      // Real active time for rules; visual lifetimes alone use a clamped step.
      const now = performance.now();
      const event = session.tick(Math.max(0, (now - lastPlayTick) / 1000));
      lastPlayTick = now;
      if (previousOverdrive && session.overdriveLeft === 0) audio.setOverdrive(false);
      if (event === 'warning') { audio.play('warning'); ui.toast('10 SECONDES / DERNIÈRE IMPULSION'); }
      if (event === 'victory' || event === 'gameover') endRound(event);
      if (session.state === 'PLAYING') {
        const generation = session.coreId;
        for (const serpent of serpents) { serpent.update(cibleSouris); serpent.recordTrail(dt, effects.reduced); }
        for (const serpent of serpents) if (verifierNourriture(serpent, generation)) break;
        nourriture.step(dt, visualClock);
      }
    } else if (!effects.reduced) {
      menuTarget.set(width * 0.75 + Math.cos(visualClock * 0.36) * width * 0.14,
        height * (width < 600 ? 0.83 : 0.53) + Math.sin(visualClock * 0.7) * Math.min(130, height * (width < 600 ? 0.05 : 0.17)));
      menuSnake.update(menuTarget);
      menuSnake.recordTrail(dt, effects.reduced);
    }
  }
  renderer.show(visualOverdrive, effects.flash);
  push();
  if (effects.shakeLeft > 0 && !effects.reduced && playing) {
    translate(Math.sin(visualClock * 100) * 1.4, Math.cos(visualClock * 93) * 1.4);
  }
  effects.show();
  if (menu) menuSnake.show(visualClock, 0, effects.reduced);
  else {
    nourriture.show(visualClock, effects.reduced);
    for (const serpent of serpents) serpent.show(visualClock, visualOverdrive, effects.reduced);
    renderer.cursor(cibleSouris, visualClock, effects.reduced);
  }
  pop();
  uiAccumulator += dt;
  if (uiAccumulator >= 0.1) { ui.update(session, serpents); uiAccumulator = 0; }
}

function windowResized() {
  if (!session) return;
  const old = arenaBounds;
  resizeCanvas(windowWidth, windowHeight);
  arenaBounds = getArenaBounds();
  // A resize remaps the world once. Continuous movement still uses steering only.
  for (const snake of serpents) {
    for (const part of [snake.head, ...snake.anneaux]) {
      part.pos.set(arenaBounds.x + (part.pos.x - old.x) / old.w * arenaBounds.w,
        arenaBounds.y + (part.pos.y - old.y) / old.h * arenaBounds.h);
    }
    snake.trail.length = 0;
  }
  cibleSouris.set(constrain(cibleSouris.x, arenaBounds.x + 14, arenaBounds.x + arenaBounds.w - 14),
    constrain(cibleSouris.y, arenaBounds.y + 14, arenaBounds.y + arenaBounds.h - 14));
  renderer.resize(width, height, arenaBounds);
  effects.reset(); effects.seed(arenaBounds);
  createMenuSnake();
  placerNourriture();
  ui.update(session, serpents);
}
