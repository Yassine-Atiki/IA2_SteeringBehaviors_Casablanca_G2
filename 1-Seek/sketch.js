let mouseTarget;
let autonomousTarget;
const fleeTargets = [];
let targetSelector;
let canvas;
let plasmaSurface;
let plasmaState;
let music;
let musicBlend = 0;
let debugMode = false;
const vehicles = [];
const snakes = [];
const snakeColors = ['#5ee0af', '#ffcb6b', '#f78cba'];

let currentMaxSpeed = VehiclePopulation.LIMITS.maxSpeed.defaultValue;
let currentMaxForce = VehiclePopulation.LIMITS.maxForce.defaultValue;


// la fonction setup est appelée une fois au démarrage du programme par p5.js
function setup() {
  // on crée un canvas de la taille de l'écran
  canvas = createCanvas(windowWidth, windowHeight);

  // La cible est un vecteur avec une position aléatoire dans le canvas
  // dirigée par la souris ensuite dans draw()
  // Même le marqueur piloté par la souris est une entité Target/Vehicle.
  mouseTarget = new Target(random(width), random(height));
  autonomousTarget = new TargetFuyante(random(width), random(height));
  createWanderSnakes();
  setFleeTargetCount(3);
  targetSelector = TargetScene.createTargetSelector(mouseTarget.pos, autonomousTarget);
  plasmaState = PsychedelicPlasma.createState();
  music = new InteractiveAudio.Engine();
  ensurePlasmaSurface();

  initializeControls();
  trackPointerInsideCanvas();

  describe(
    "Plusieurs véhicules bleus utilisent le comportement Seek. Trois serpents colorés " +
    "utilisent le comportement Wander. Les véhicules bleus peuvent suivre la souris " +
    "ou une cible autonome, devant un plasma psychédélique interactif. Des curseurs règlent " +
    "les véhicules et l'animation du fond."
  );
}

// la fonction draw est appelée en boucle par p5.js, 60 fois par seconde par défaut
// Le canvas est effacé automatiquement avant chaque appel à draw
function draw() {
  drawPlasma();

  const activeTarget = updateAndDrawTarget();

  // Tous les véhicules suivent la même cible.
  const deadTargets = new Set();
  for (const vehicle of vehicles) {
    const nearestFleeTarget = activeTarget.mode === TargetScene.MODES.FLEE
      ? findNearestFleeTarget(vehicle)
      : null;
    const targetForVehicle = nearestFleeTarget
      ? TargetScene.asActiveTarget(nearestFleeTarget, TargetScene.MODES.FLEE)
      : activeTarget;
    if (targetForVehicle.position) vehicle.applyBehaviors(targetForVehicle.position);
    vehicle.update();

    if (nearestFleeTarget && TargetScene.hasReachedTarget(vehicle, targetForVehicle)) {
      deadTargets.add(nearestFleeTarget);
      TargetScene.respawnVehicle(vehicle, width, height, targetForVehicle);
    } else if (!nearestFleeTarget && activeTarget.mode !== TargetScene.MODES.FLEE
      && TargetScene.hasReachedTarget(vehicle, targetForVehicle)) {
      TargetScene.respawnVehicle(vehicle, width, height, targetForVehicle);
    }

    SeekVehicle.debug = debugMode;
    vehicle.show();
  }
  for (const snake of snakes) {
    snake.updateWander();
    snake.edges();
    snake.show();
  }
  if (deadTargets.size > 0) {
    for (const target of deadTargets) {
      const index = fleeTargets.indexOf(target);
      if (index >= 0) fleeTargets.splice(index, 1);
    }
  }
}

function initializeControls() {
  const uiButton = document.querySelector('#ui-toggle');
  const panel = document.querySelector('#controls-panel');
  uiButton.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    uiButton.setAttribute('aria-expanded', String(!panel.hidden));
    uiButton.textContent = panel.hidden ? 'UI on/off · afficher' : 'UI on/off · masquer';
  });
  const targetModeSelect = document.querySelector("#target-mode");
  const populationInput = document.querySelector("#population-slider");
  const populationOutput = document.querySelector("#population-value");
  const speedInput = document.querySelector("#speed-slider");
  const speedOutput = document.querySelector("#speed-value");
  const forceInput = document.querySelector("#force-slider");
  const forceOutput = document.querySelector("#force-value");
  const fleeControls = [
    ["flee-detection-slider", "flee-detection-value", "detectionRadius", value => `${Math.round(value)} px`],
    ["flee-exit-slider", "flee-exit-value", "exitDistance", value => `${Math.round(value)} px`],
    ["flee-duration-slider", "flee-duration-value", "maxDuration", value => `${value.toFixed(1).replace(".", ",")} s`],
    ["flee-duplication-slider", "flee-duplication-value", "duplicationDuration", value => `${value.toFixed(1).replace(".", ",")} s`],
  ];
  const fleeCountInput = document.querySelector("#flee-count-slider");
  const fleeCountOutput = document.querySelector("#flee-count-value");

  const debugInput = document.querySelector("#debug-toggle");
  debugInput.addEventListener("change", () => setDebugMode(debugInput.checked));
  window.addEventListener("keydown", (event) => {
    const tagName = event.target?.tagName;
    if (event.key.toLowerCase() === "d" && !["INPUT", "SELECT", "TEXTAREA"].includes(tagName)) {
      setDebugMode(!debugMode);
    }
  });

  targetModeSelect.addEventListener("change", () => {
    targetSelector.setMode(targetModeSelect.value);
    if (targetSelector.getMode() !== TargetScene.MODES.FLEE) {
      for (const target of fleeTargets) target.resetFlee();
    }
    updateFleeControlsVisibility();
  });

  VehiclePopulation.bindRangeControl(
    fleeCountInput,
    fleeCountOutput,
    value => setFleeTargetCount(value),
    value => String(value)
  );

  for (const [inputId, outputId, parameter, format] of fleeControls) {
    VehiclePopulation.bindRangeControl(
      document.querySelector(`#${inputId}`),
      document.querySelector(`#${outputId}`),
      value => {
        if (parameter === "duplicationDuration") autonomousTarget.setDuplicationDuration(Number(value));
        else autonomousTarget.setFleeSettings({ [parameter]: Number(value) });
        for (const target of fleeTargets) {
          if (parameter === "duplicationDuration") target.setDuplicationDuration(Number(value));
          else target.setFleeSettings({ [parameter]: Number(value) });
        }
        return autonomousTarget.getFleeSettings()[parameter];
      },
      format
    );
  }

  VehiclePopulation.bindRangeControl(
    speedInput,
    speedOutput,
    (value) => {
      currentMaxSpeed = VehiclePopulation.setMaxSpeed(vehicles, value);
      return currentMaxSpeed;
    },
    (value) => value.toFixed(1).replace(".", ",")
  );

  VehiclePopulation.bindRangeControl(
    forceInput,
    forceOutput,
    (value) => {
      currentMaxForce = VehiclePopulation.setMaxForce(vehicles, value);
      return currentMaxForce;
    },
    (value) => value.toFixed(2).replace(".", ",")
  );

  VehiclePopulation.bindRangeControl(
    populationInput,
    populationOutput,
    (value) => VehiclePopulation.setPopulationSize(
      vehicles,
      value,
      createVehicleAtRandomPosition
    )
  );

  bindPlasmaControl("plasma-speed", "speed", 2);
  bindPlasmaControl("plasma-complexity", "complexity", 0);
  bindPlasmaControl("plasma-size", "blobSize", 0);
  bindPlasmaControl("plasma-hue", "hue", 0, "°");
  bindPlasmaControl("plasma-saturation", "saturation", 0, " %");
  bindPlasmaControl("plasma-mouse", "mouseInfluence", 2);
  initializeMusicControls();
  updateFleeControlsVisibility();
}

function initializeMusicControls() {
  const button = document.querySelector('#music-toggle');
  const status = document.querySelector('#music-status');
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      if (music.running) await music.stop();
      else await music.start();
      status.textContent = music.running ? 'X : FM et filtre · Y : hauteur' : 'Musique coupée';
    } catch (error) {
      await music.stop();
      status.textContent = `Audio indisponible : ${error.message}`;
    } finally {
      button.textContent = music.running ? 'Couper la musique' : 'Activer la musique';
      button.setAttribute('aria-pressed', String(music.running));
      button.disabled = false;
    }
  });
  VehiclePopulation.bindRangeControl(
    document.querySelector('#music-volume'), document.querySelector('#music-volume-value'),
    value => music.setVolume(Number(value) / 100) * 100, value => `${Math.round(value)} %`
  );
  VehiclePopulation.bindRangeControl(
    document.querySelector('#music-tempo'), document.querySelector('#music-tempo-value'),
    value => music.setTempo(value), value => `${value} BPM`
  );
  window.addEventListener('pagehide', () => music.stop());
}

function bindPlasmaControl(idPrefix, parameterName, decimalCount, suffix = "") {
  const input = document.querySelector(`#${idPrefix}-slider`);
  const output = document.querySelector(`#${idPrefix}-value`);

  VehiclePopulation.bindRangeControl(
    input,
    output,
    (value) => PsychedelicPlasma.setParameter(plasmaState, parameterName, value),
    (value) => value.toFixed(decimalCount).replace(".", ",") + suffix
  );
}

function createVehicleAtRandomPosition() {
  const vehicle = new SeekVehicle(0, 0);
  const x = VehiclePopulation.randomCoordinate(width, vehicle.r);
  const y = VehiclePopulation.randomCoordinate(height, vehicle.r);

  vehicle.pos.set(x, y);

  return VehiclePopulation.configureVehicle(
    vehicle,
    currentMaxSpeed,
    currentMaxForce
  );
}

function createWanderSnakes() {
  const anchors = [
    { x: width * 0.25, y: height * 0.28 },
    { x: width * 0.75, y: height * 0.38 },
    { x: width * 0.5, y: height * 0.76 }
  ];
  for (let index = 0; index < anchors.length; index++) {
    const anchor = anchors[index];
    const angle = random(TWO_PI);
    const snake = new SnakeWander(anchor.x, anchor.y, {
      couleur: snakeColors[index],
      direction: createVector(cos(angle), sin(angle)),
      ringCount: 8,
      headSpeed: 2.5,
      headForce: 0.12,
      headBraking: 65,
      ringSpeed: 3,
      ringForce: 0.2,
      ringBraking: 45
    });
    snake.wanderTheta = random(-PI, PI);
    snakes.push(snake);
  }
}

function createFleeTargetAtRandomPosition() {
  return new TargetFuyante(random(width), random(height));
}

function setFleeTargetCount(requestedCount) {
  const count = Math.min(20, Math.max(1, Math.round(Number(requestedCount) || 1)));
  if (count < fleeTargets.length) fleeTargets.splice(count);
  while (fleeTargets.length < count) fleeTargets.push(createFleeTargetAtRandomPosition());
  const settings = autonomousTarget?.getFleeSettings();
  for (const target of fleeTargets) {
    if (settings) {
      target.setFleeSettings(settings);
      target.setDuplicationDuration(settings.duplicationDuration);
    }
  }
  return count;
}

function updateFleeControlsVisibility() {
  const controls = document.querySelector("#flee-controls");
  if (controls) controls.hidden = targetSelector.getMode() !== TargetScene.MODES.FLEE;
}

function findNearestFleeTarget(vehicle) {
  const nearest = fleeTargets.reduce((closest, target) => {
    const distance = p5.Vector.sub(vehicle.pos, target.pos).magSq();
    return !closest || distance < closest.distance ? { target, distance } : closest;
  }, null);
  return nearest ? nearest.target : null;
}

function trackPointerInsideCanvas() {
  canvas.elt.addEventListener("pointermove", (event) => {
    const bounds = canvas.elt.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * width / bounds.width;
    const y = (event.clientY - bounds.top) * height / bounds.height;

    if (x >= 0 && x <= width && y >= 0 && y <= height) {
      mouseTarget.pos.set(x, y);
      PsychedelicPlasma.setPointerTarget(plasmaState, x / width, y / height);
      music.setPointer(x / width, y / height);
    }
  });
}

function drawPlasma() {
  PsychedelicPlasma.updateState(plasmaState, deltaTime);
  const audioVisual = music.visualState();
  musicBlend += ((audioVisual.active ? 1 : 0) - musicBlend) * (1 - Math.exp(-deltaTime / 180));
  plasmaState.audio = { ...audioVisual, blend: musicBlend };
  plasmaSurface.loadPixels();
  PsychedelicPlasma.renderPixels(
    plasmaSurface.pixels,
    plasmaSurface.width,
    plasmaSurface.height,
    width,
    height,
    plasmaState
  );
  plasmaSurface.updatePixels();

  push();
  imageMode(CORNER);
  image(plasmaSurface, 0, 0, width, height);
  pop();
}

function ensurePlasmaSurface() {
  const renderSize = PsychedelicPlasma.calculateRenderSize(width, height);

  if (PsychedelicPlasma.shouldRecreateSurface(
    plasmaSurface,
    renderSize.width,
    renderSize.height
  )) {
    if (plasmaSurface) {
      plasmaSurface.remove();
    }

    plasmaSurface = createGraphics(renderSize.width, renderSize.height);
    plasmaSurface.pixelDensity(1);
  }
}

function updateAndDrawTarget() {
  const activeTarget = targetSelector.getActiveTarget();

  if (activeTarget.mode === TargetScene.MODES.AUTONOMOUS || activeTarget.mode === TargetScene.MODES.FLEE) {
    const targets = activeTarget.mode === TargetScene.MODES.FLEE ? fleeTargets : [autonomousTarget];
    const newTargets = [];
    const splitTargets = new Set();
    for (const target of targets) {
      if (activeTarget.mode === TargetScene.MODES.FLEE && target.advanceSurvival(deltaTime)) {
        // La cible reste présente pendant les 0,7 s de son animation de scission.
      }
      if (activeTarget.mode === TargetScene.MODES.FLEE) target.updateFlee(vehicles, deltaTime);
      target.update();
      target.edges();
      if (activeTarget.mode === TargetScene.MODES.FLEE && target.isDuplicating()) {
        if (target.advanceDuplication(deltaTime)) splitTargets.add(target);
        drawDuplicationAnimation(target);
      } else {
        drawTarget(target);
      }
      if (activeTarget.mode === TargetScene.MODES.FLEE && debugMode) drawDetectionRadius(target);
      if (activeTarget.mode === TargetScene.MODES.FLEE && target.isFleeing()) drawEnduranceBar(target);
    }
    for (const target of splitTargets) {
      const index = fleeTargets.indexOf(target);
      if (index >= 0) fleeTargets.splice(index, 1);
      newTargets.push(...createFleeChildren(target));
    }
    fleeTargets.push(...newTargets);
    if (activeTarget.mode === TargetScene.MODES.FLEE) drawFleeCount();
  } else {
    push();
    fill("red");
    stroke("black");
    strokeWeight(4);
    circle(
      activeTarget.position.x,
      activeTarget.position.y,
      activeTarget.radius * 2
    );
    pop();
  }

  if (activeTarget.mode === TargetScene.MODES.FLEE) {
    const firstTarget = fleeTargets[0];
    return firstTarget
      ? TargetScene.asActiveTarget(firstTarget, activeTarget.mode)
      : { mode: activeTarget.mode, position: null, radius: 0 };
  }
  return targetSelector.getActiveTarget();
}

function drawTarget(target) {
  push();
  fill(0, 150);
  noStroke();
  circle(target.pos.x, target.pos.y, target.r * 2 + 8);
  pop();
  target.show();
}

function createFleeTargetLike(source) {
  const target = createFleeTargetAtRandomPosition();
  target.setFleeSettings(source.getFleeSettings());
  target.setDuplicationDuration(source.getFleeSettings().duplicationDuration);
  return target;
}

function createFleeChildren(source) {
  const offset = Math.max(12, source.r * 0.9);
  return [-1, 1].map((side) => {
    const child = createFleeTargetLike(source);
    child.pos.set(source.pos.x + side * offset, source.pos.y);
    child.resetDuplication();
    return child;
  });
}

function drawDuplicationAnimation(target) {
  const progress = target.getDuplicationProgress();
  const separation = progress * target.r * 1.8;
  const diameter = target.r * 2;
  push();
  fill(target.color);
  stroke("black");
  strokeWeight(2);
  arc(target.pos.x - separation / 2, target.pos.y, diameter, diameter, HALF_PI, 3 * HALF_PI, PIE);
  arc(target.pos.x + separation / 2, target.pos.y, diameter, diameter, -HALF_PI, HALF_PI, PIE);
  pop();
}

function drawFleeCount() {
  push();
  fill(255);
  stroke(0, 160);
  strokeWeight(3);
  textSize(18);
  textAlign(RIGHT, TOP);
  text(`Cibles fuyantes : ${fleeTargets.length}`, width - 20, 20);
  pop();
}

function setDebugMode(enabled) {
  debugMode = Boolean(enabled);
  Vehicle.debug = debugMode;
  SeekVehicle.debug = debugMode;
  const input = document.querySelector("#debug-toggle");
  if (input) input.checked = debugMode;
}

function drawDetectionRadius(target) {
  const radius = target.getFleeSettings().detectionRadius;
  push();
  noFill();
  stroke(255, 235, 80, 210);
  strokeWeight(2);
  drawingContext.setLineDash([8, 6]);
  circle(target.pos.x, target.pos.y, radius * 2);
  drawingContext.setLineDash([]);
  pop();
}

function drawEnduranceBar(target) {
  const widthInPixels = Math.max(60, target.r * 2);
  const heightInPixels = 7;
  const left = target.pos.x - widthInPixels / 2;
  const top = target.pos.y - target.r - 18;
  const endurance = target.getEndurance();
  push();
  noStroke();
  fill(0, 190);
  rect(left, top, widthInPixels, heightInPixels, 3);
  fill(endurance > 0.5 ? "#43e06f" : endurance > 0.2 ? "#ffd447" : "#ff4e5b");
  rect(left, top, widthInPixels * endurance, heightInPixels, 3);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  ensurePlasmaSurface();

}
