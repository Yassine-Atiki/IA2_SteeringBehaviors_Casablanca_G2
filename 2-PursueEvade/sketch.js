let pursuers = [];
let targets = [];
let decoys = [];
let mode = "pursue";
let predictionDistance = PursueEvadeScene.LIMITS.predictionDistance.defaultValue;
let detectionRadius = PursueEvadeScene.LIMITS.detectionRadius.defaultValue;
let debugMode = false;
let decoyLifetime = PursueEvadeScene.LIMITS.decoyLifetime.defaultValue;
let decoysPerDetection = PursueEvadeScene.LIMITS.decoysPerDetection.defaultValue;
let decoyCooldown = PursueEvadeScene.LIMITS.decoyCooldown.defaultValue;
const FLEE_DURATION_MS = 1000;

const settings = {
  vehicleSpeed: PursueEvadeScene.LIMITS.vehicleSpeed.defaultValue,
  vehicleForce: PursueEvadeScene.LIMITS.vehicleForce.defaultValue,
  targetSpeed: PursueEvadeScene.LIMITS.targetSpeed.defaultValue,
  targetForce: PursueEvadeScene.LIMITS.targetForce.defaultValue,
  evadeSpeed: PursueEvadeScene.LIMITS.evadeSpeed.defaultValue,
  evadeForce: PursueEvadeScene.LIMITS.evadeForce.defaultValue
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  Vehicle.debug = debugMode;
  setPopulationSize("vehicles", 1);
  setPopulationSize("targets", PursueEvadeScene.LIMITS.targetCount.defaultValue);
  initializeControls();
  describe("Démonstration interactive des comportements Pursue, PursuePerfect et Evade.");
}

function draw() {
  background(12, 16, 28);
  Vehicle.debug = debugMode;
  const allTargets = targets.concat(decoys);
  for (const pursuer of pursuers) {
    const closest = PursueEvadeScene.nearestByDistance(pursuer.pos, allTargets);
    if (closest) {
      const force = mode === "pursuePerfect"
        ? pursuer.pursuePerfect(closest.entity, debugMode)
        : pursuer.pursue(closest.entity, predictionDistance, debugMode);
      pursuer.applyForce(force);
    }
    pursuer.update();
    pursuer.edges();
    pursuer.show(debugMode);
  }
  for (const target of targets) {
    target.decoyCooldownRemaining = Math.max(0, target.decoyCooldownRemaining - deltaTime);
    target.rayonDetection = detectionRadius;
    const closest = PursueEvadeScene.nearestByDistance(target.pos, pursuers);
    const isDetected = Boolean(closest && closest.distance <= detectionRadius);
    if (isDetected && !target.wasDetected) {
      PursueEvadeAudio.play("alarm", { volume: 0.3, duration: 0.5 });
    }
    if (isDetected && target.decoyCooldownRemaining <= 0 && target.decoysRemaining > 0) {
      target.fleeTimeRemaining = FLEE_DURATION_MS;
      target.evadeThreat = closest.entity;
      releaseDecoys(target);
    }
    target.wasDetected = isDetected;
    if (!isDetected && target.fleeTimeRemaining <= 0) target.evadeThreat = null;
    // La détection déclenche toujours une seconde de fuite. Le budget
    // concerne uniquement les contre-mesures : une cible épuisée fuit encore,
    // mais ne peut plus détourner le poursuiveur avec des leurres.
    const isFleeing = target.fleeTimeRemaining > 0 && target.evadeThreat;
    target.maxSpeed = isFleeing ? settings.evadeSpeed : settings.targetSpeed;
    target.maxForce = isFleeing ? settings.evadeForce : settings.targetForce;
    if (isFleeing) {
      PursueEvadeAudio.startFlee(target);
      PursueEvadeAudio.updateFlee(target);
      target.applyForce(target.evade(target.evadeThreat, predictionDistance, debugMode));
      target.fleeTimeRemaining = Math.max(0, target.fleeTimeRemaining - deltaTime);
    } else {
      PursueEvadeAudio.stopFlee(target);
    }
    target.update();
    target.show(debugMode);
  }

  for (const decoy of decoys) {
    decoy.update();
    decoy.show(debugMode);
  }

  removeCollidedTargets();
  decoys = decoys.filter(decoy => !decoy.isExpired());
  updatePopulationDisplay();
}

function createPursuer() {
  const pursuer = new Vehicle(random(width), random(height));
  pursuer.maxSpeed = settings.vehicleSpeed;
  pursuer.maxForce = settings.vehicleForce;
  pursuer.vel = p5.Vector.random2D().mult(random(1, 3));
  return pursuer;
}

function createTarget() {
  const target = new BouncingBall(random(width), random(height));
  target.maxSpeed = settings.targetSpeed;
  target.maxForce = settings.targetForce;
  target.rayonDetection = detectionRadius;
  return target;
}

function setPopulationSize(kind, count) {
  const collection = kind === "vehicles" ? pursuers : targets;
  const creator = kind === "vehicles" ? createPursuer : createTarget;
  return PursueEvadeScene.setPopulationSize(collection, count, creator);
}

function releaseDecoys(target) {
  const numberToRelease = Math.min(decoysPerDetection, target.decoysRemaining);
  if (numberToRelease <= 0) return;
  const direction = target.vel.magSq() > 0 ? target.vel.copy().normalize() : p5.Vector.random2D();
  const side = createVector(-direction.y, direction.x);
  for (let index = 0; index < numberToRelease; index += 1) {
    // Nuage aléatoire : chaque leurre reste derrière la cible, mais reçoit
    // une profondeur et un décalage latéral différents.
    const behindDistance = random(target.r * 2, target.r * 8);
    const lateralOffset = random(-target.r * 8, target.r * 8);
    const offset = direction.copy().mult(-behindDistance)
      .add(side.copy().mult(lateralOffset));
    const velocity = p5.Vector.random2D().mult(random(0.05, 0.35));
    const position = target.pos.copy().add(offset);
    decoys.push(new Leurres(position.x, position.y, decoyLifetime, velocity));
  }
  target.decoysRemaining -= numberToRelease;
  target.decoyCooldownRemaining = decoyCooldown * 1000;
  PursueEvadeAudio.play("decoy", { volume: 0.14, duration: 0.2 });
}

function removeCollidedTargets() {
  const deadTargets = new Set();
  const deadDecoys = new Set();
  for (const pursuer of pursuers) {
    for (const target of targets) {
      if (PursueEvadeScene.distanceBetween(pursuer.pos, target.pos) <= pursuer.r + target.r) {
        if (!deadTargets.has(target)) {
          deadTargets.add(target);
          PursueEvadeAudio.stopFlee(target);
          PursueEvadeAudio.play("explosion", { volume: 0.32, duration: 0.4 });
        }
      }
    }
    for (const decoy of decoys) {
      if (PursueEvadeScene.distanceBetween(pursuer.pos, decoy.pos) <= pursuer.r + decoy.r) {
        if (!deadDecoys.has(decoy)) {
          deadDecoys.add(decoy);
          PursueEvadeAudio.play("decoyHit", { volume: 0.22, duration: 0.4 });
        }
      }
    }
  }
  targets = targets.filter(target => !deadTargets.has(target));
  decoys = decoys.filter(decoy => !deadDecoys.has(decoy));
}

function updatePopulationDisplay() {
  const targetCount = document.querySelector("#target-count-display");
  const decoyCount = document.querySelector("#decoy-count-display");
  const budgetCount = document.querySelector("#decoy-budget-display");
  if (targetCount) targetCount.textContent = String(targets.length);
  if (decoyCount) decoyCount.textContent = String(decoys.length);
  if (budgetCount) budgetCount.textContent = String(targets.reduce((sum, target) => sum + target.decoysRemaining, 0));
}

function bindRange(id, callback, formatter = value => value) {
  const input = document.querySelector(`#${id}`);
  const output = document.querySelector(`#${id}-value`);
  const update = () => {
    const value = Number(input.value);
    output.textContent = formatter(value);
    callback(value);
  };
  input.addEventListener("input", update);
  update();
}

function initializeControls() {
  const panel = document.querySelector("#controls-panel");
  const toggle = document.querySelector("#ui-toggle");
  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
  });
  const audioToggle = document.querySelector("#audio-toggle");
  audioToggle.addEventListener("click", () => {
    const enabled = PursueEvadeAudio.toggle();
    audioToggle.textContent = enabled ? "Audio : on" : "Audio : off";
    audioToggle.setAttribute("aria-pressed", String(enabled));
  });
  bindRange("vehicle-count", value => setPopulationSize("vehicles", value), value => Math.round(value));
  bindRange("target-count", value => setPopulationSize("targets", value), value => Math.round(value));
  bindRange("detection", value => { detectionRadius = value; }, value => `${Math.round(value)} px`);
  bindRange("prediction", value => { predictionDistance = value; }, value => `${value.toFixed(1)} frames`);
  bindRange("vehicle-speed", value => { settings.vehicleSpeed = value; pursuers.forEach(v => v.maxSpeed = value); }, value => value.toFixed(1));
  bindRange("vehicle-force", value => { settings.vehicleForce = value; pursuers.forEach(v => v.maxForce = value); }, value => value.toFixed(2));
  bindRange("target-speed", value => { settings.targetSpeed = value; }, value => value.toFixed(1));
  bindRange("target-force", value => { settings.targetForce = value; }, value => value.toFixed(2));
  bindRange("evade-speed", value => { settings.evadeSpeed = value; }, value => value.toFixed(1));
  bindRange("evade-force", value => { settings.evadeForce = value; }, value => value.toFixed(2));
  bindRange("decoy-lifetime", value => { decoyLifetime = value; }, value => `${value.toFixed(1)} s`);
  bindRange("decoys-per-detection", value => { decoysPerDetection = Math.round(value); }, value => Math.round(value));
  bindRange("decoy-cooldown", value => { decoyCooldown = value; }, value => `${value.toFixed(1)} s`);
  const modeSelect = document.querySelector("#pursuit-mode");
  modeSelect.addEventListener("change", () => {
    mode = modeSelect.value;
    document.querySelector("#prediction-control").classList.toggle("is-muted", mode === "pursuePerfect");
  });
  const debug = document.querySelector("#debug-toggle");
  debug.addEventListener("change", () => { debugMode = debug.checked; });
  window.addEventListener("keydown", event => {
    if (event.key.toLowerCase() === "d" && !["INPUT", "SELECT"].includes(event.target.tagName)) {
      debug.checked = !debug.checked;
      debug.dispatchEvent(new Event("change"));
    }
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mouseClicked() {
  for (const pursuer of pursuers) pursuer.pos.set(mouseX, mouseY);
}
