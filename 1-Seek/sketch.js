let mouseTarget;
let autonomousTarget;
let targetSelector;
let canvas;
let plasmaSurface;
let plasmaState;
let music;
let fleeController;
let musicBlend = 0;
const vehicles = [];

let currentMaxSpeed = VehiclePopulation.LIMITS.maxSpeed.defaultValue;
let currentMaxForce = VehiclePopulation.LIMITS.maxForce.defaultValue;


// la fonction setup est appelée une fois au démarrage du programme par p5.js
function setup() {
  // on crée un canvas de la taille de l'écran
  canvas = createCanvas(windowWidth, windowHeight);

  // La cible est un vecteur avec une position aléatoire dans le canvas
  // dirigée par la souris ensuite dans draw()
  mouseTarget = createVector(random(width), random(height));
  autonomousTarget = new Target(random(width), random(height));
  fleeController = FleeScene.createController(autonomousTarget, vehicles);
  targetSelector = TargetScene.createTargetSelector(mouseTarget, autonomousTarget);
  plasmaState = PsychedelicPlasma.createState();
  music = new InteractiveAudio.Engine();
  ensurePlasmaSurface();

  initializeControls();
  trackPointerInsideCanvas();

  describe(
    "Plusieurs véhicules bleus utilisent le comportement Seek. Ils peuvent suivre la souris " +
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
  for (const vehicle of vehicles) {
    vehicle.applyBehaviors(activeTarget.position);
    vehicle.update();

    if (TargetScene.hasReachedTarget(vehicle, activeTarget)) {
      TargetScene.respawnVehicle(vehicle, width, height, activeTarget);
    }

    vehicle.show();
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
  ];

  targetModeSelect.addEventListener("change", () => {
    targetSelector.setMode(targetModeSelect.value);
    if (targetSelector.getMode() !== TargetScene.MODES.FLEE) fleeController.reset();
  });

  for (const [inputId, outputId, parameter, format] of fleeControls) {
    VehiclePopulation.bindRangeControl(
      document.querySelector(`#${inputId}`),
      document.querySelector(`#${outputId}`),
      value => fleeController.setSettings({ [parameter]: Number(value) })[parameter],
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
  const vehicle = new Vehicle(0, 0);
  const x = VehiclePopulation.randomCoordinate(width, vehicle.r);
  const y = VehiclePopulation.randomCoordinate(height, vehicle.r);

  vehicle.pos.set(x, y);

  return VehiclePopulation.configureVehicle(
    vehicle,
    currentMaxSpeed,
    currentMaxForce
  );
}

function trackPointerInsideCanvas() {
  canvas.elt.addEventListener("pointermove", (event) => {
    const bounds = canvas.elt.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * width / bounds.width;
    const y = (event.clientY - bounds.top) * height / bounds.height;

    if (x >= 0 && x <= width && y >= 0 && y <= height) {
      mouseTarget.set(x, y);
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
    if (activeTarget.mode === TargetScene.MODES.FLEE) fleeController.step(deltaTime);
    autonomousTarget.update();
    autonomousTarget.edges();

    push();
    fill(0, 150);
    noStroke();
    circle(
      autonomousTarget.pos.x,
      autonomousTarget.pos.y,
      autonomousTarget.r * 2 + 8
    );
    pop();

    autonomousTarget.show();
    if (activeTarget.mode === TargetScene.MODES.FLEE && fleeController.isFleeing()) {
      drawEnduranceBar(autonomousTarget);
    }
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

  return targetSelector.getActiveTarget();
}

function drawEnduranceBar(target) {
  const widthInPixels = Math.max(60, target.r * 2);
  const heightInPixels = 7;
  const left = target.pos.x - widthInPixels / 2;
  const top = target.pos.y - target.r - 18;
  const endurance = fleeController.getEndurance();
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
