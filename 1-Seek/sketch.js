// ============================================================
// sketch.js — Essaim de Lucioles Spatiales 🌌✨
// Boucle principale p5.js : fond étoilé, lucioles, portail,
// particules et mode prédateur.
// Le cœur IA (seek/flee) reste IDENTIQUE au code du prof.
// ============================================================

let mouseTarget;
let autonomousTarget;
let targetSelector;
let canvas;
let music;
let fleeController;
let musicBlend = 0;
const vehicles = [];

// Prédateur & Debug
let predator = null;
let predatorEnabled = false;
let debugMode = false;

let currentMaxSpeed = VehiclePopulation.LIMITS.maxSpeed.defaultValue;
let currentMaxForce = VehiclePopulation.LIMITS.maxForce.defaultValue;

// ── SETUP ────────────────────────────────────────────────────
function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  // Mode HSB pour des couleurs dynamiques basées sur la teinte
  colorMode(HSB, 360, 100, 100, 100);

  // Initialiser le fond étoilé
  SpaceBackground.init(width, height);

  // Cibles (tout ce qui bouge est un Vehicle utilisant les steering behaviors)
  mouseTarget = createVector(random(width), random(height));
  autonomousTarget = new TargetFuyante(random(width), random(height));
  targetSelector = TargetFuyante.createTargetSelector(mouseTarget, autonomousTarget);

  // Musique interactive (conservée telle quelle)
  music = new InteractiveAudio.Engine();

  initializeControls();
  trackPointerInsideCanvas();

  describe(
    "Un essaim de lucioles spatiales utilise le comportement Seek pour poursuivre " +
    "un portail dimensionnel, dans un champ d'étoiles avec parallaxe. " +
    "Un mode prédateur ajoute une luciole rouge qui chasse les autres."
  );
}

// ── DRAW — boucle principale ─────────────────────────────────
function draw() {
  // 1) Fond spatial
  drawSpaceBackground();

  // 2) Étoiles filantes
  SpaceBackground.maybeSpawnShootingStar(width, height);
  SpaceBackground.updateShootingStars();
  drawShootingStars();

  // 3) Particules d'explosion
  ParticleSystem.update();
  drawParticles();

  // 4) Cible (portail)
  const activeTarget = updateAndDrawTarget();

  // 5) Toutes les lucioles
  for (const vehicle of vehicles) {
    // Si le prédateur est actif, les lucioles fuient quand il est proche
    if (predatorEnabled && predator && vehicle !== predator) {
      let distToPred = p5.Vector.dist(vehicle.pos, predator.pos);
      if (distToPred < 160) {
        let fleeForce = vehicle.flee(predator.pos);
        fleeForce.mult(0.4);
        vehicle.applyForce(fleeForce);
      }
    }

    // Comportement seek vers la cible (IDENTIQUE au prof)
    vehicle.applyBehaviors(activeTarget.position);
    vehicle.update();

    // Quand la luciole atteint la cible → explosion de particules + respawn
    if (TargetFuyante.hasReachedTarget(vehicle, activeTarget)) {
      let speedRatio = constrain(vehicle.vel.mag() / max(vehicle.maxSpeed, 0.01), 0, 1);
      let hue = lerp(180, 320, speedRatio);
      ParticleSystem.emit(vehicle.pos.x, vehicle.pos.y, 18, hue);
      ParticleSystem.emitSparks(vehicle.pos.x, vehicle.pos.y, 8, hue + 30);
      TargetFuyante.respawnVehicle(vehicle, width, height, activeTarget);
    }

    vehicle.show(debugMode);
  }

  // 6) Prédateur & Mitrailleuse d'avion
  if (predatorEnabled && predator) {
    updatePredator(activeTarget);
  }
  PredatorWeapons.draw();

  // 7) Indicateur Debug IA
  if (debugMode) {
    drawDebugHUD();
  }
}

// ── PREDATEUR ────────────────────────────────────────────────
function updatePredator(activeTarget) {
  // Le prédateur cherche le vaisseau le plus proche
  let nearest = null;
  let nearestDist = Infinity;
  for (const v of vehicles) {
    if (v === predator) continue;
    let d = p5.Vector.dist(predator.pos, v.pos);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = v;
    }
  }

  if (nearest) {
    predator.applyBehaviors(nearest.pos);
  }

  predator.update();
  predator.edges();

  // Armes d'avion de chasse du prédateur (canons à balles traçantes)
  PredatorWeapons.update(predator, vehicles, activeTarget, width, height);

  // Le prédateur percute un vaisseau au corps-à-corps → explosion rouge + respawn
  for (const v of vehicles) {
    if (v === predator) continue;
    if (p5.Vector.dist(predator.pos, v.pos) < predator.r * 1.3 + v.r) {
      ParticleSystem.emit(v.pos.x, v.pos.y, 25, 0); // explosion rouge
      ParticleSystem.emitSparks(v.pos.x, v.pos.y, 12, 30);
      TargetFuyante.respawnVehicle(v, width, height, activeTarget);
    }
  }

  predator.show(debugMode);
}

function spawnPredator() {
  predator = new Vehicle(random(width), random(height));
  predator.isPredator = true;
  predator.r = 28;
  predator.maxSpeed = currentMaxSpeed * 0.85;
  predator.maxForce = currentMaxForce * 1.5;
  predator.trailMax = 30;
  PredatorWeapons.initAudio();
}

function destroyPredator() {
  if (predator) {
    ParticleSystem.emit(predator.pos.x, predator.pos.y, 30, 15);
  }
  PredatorWeapons.reset();
  predator = null;
}

// ── FOND SPATIAL ─────────────────────────────────────────────
function drawSpaceBackground() {
  // Fond profond
  background(235, 50, 5);

  noStroke();

  // Nébuleuse
  const nebula = SpaceBackground.getNebula();
  for (const blob of nebula) {
    blob.x += blob.driftX;
    blob.y += blob.driftY;
    // wrap
    if (blob.x < -blob.size) blob.x = width + blob.size;
    if (blob.x > width + blob.size) blob.x = -blob.size;
    if (blob.y < -blob.size) blob.y = height + blob.size;
    if (blob.y > height + blob.size) blob.y = -blob.size;

    fill(blob.hue, 45, 35, blob.alpha);
    ellipse(blob.x, blob.y, blob.size, blob.size * blob.ratio);
  }

  // Étoiles avec parallaxe
  const stars = SpaceBackground.getStars();
  let mx = (mouseX / width - 0.5);
  let my = (mouseY / height - 0.5);

  for (const star of stars) {
    let parallax = (star.layer + 1) * 3.5;
    let sx = star.x - mx * parallax;
    let sy = star.y - my * parallax;

    let twinkle = Math.sin(frameCount * star.twinkleSpeed + star.twinklePhase);
    let brightness = star.baseBrightness + twinkle * 20;
    let size = star.baseSize + twinkle * 0.4;

    fill(star.hue, star.saturation, brightness, 88);
    noStroke();
    circle(sx, sy, size);
  }
}

// ── ETOILES FILANTES ─────────────────────────────────────────
function drawShootingStars() {
  const shootStars = SpaceBackground.getShootingStars();
  for (const s of shootStars) {
    let tailX = s.x - Math.cos(s.angle) * s.length * s.life;
    let tailY = s.y - Math.sin(s.angle) * s.length * s.life;

    stroke(50, 15, 100, s.life * 75);
    strokeWeight(2.5 * s.life);
    line(tailX, tailY, s.x, s.y);

    // Tête brillante
    noStroke();
    fill(0, 0, 100, s.life * 85);
    circle(s.x, s.y, 4 * s.life);
  }
}

// ── PARTICULES ───────────────────────────────────────────────
function drawParticles() {
  const parts = ParticleSystem.getParticles();
  noStroke();
  for (const p of parts) {
    let alpha = p.life * 85;
    let size = p.size * p.life;

    // Glow
    fill(p.hue, 45, 100, alpha * 0.25);
    circle(p.x, p.y, size * 3);
    // Core
    fill(p.hue, 75, 100, alpha);
    circle(p.x, p.y, size);
  }
}

// ── CIBLE — dessin et mise à jour ────────────────────────────
function updateAndDrawTarget() {
  const activeTarget = targetSelector.getActiveTarget();

  if (activeTarget.mode === TargetFuyante.MODES.AUTONOMOUS || activeTarget.mode === TargetFuyante.MODES.FLEE) {
    if (activeTarget.mode === TargetFuyante.MODES.FLEE) {
      autonomousTarget.applyBehaviors(vehicles, deltaTime);
    }
    autonomousTarget.update();
    autonomousTarget.edges();

    // Ombre sous le portail
    push();
    noStroke();
    fill(0, 0, 0, 12);
    circle(
      autonomousTarget.pos.x,
      autonomousTarget.pos.y,
      autonomousTarget.r * 2 + 10
    );
    pop();

    autonomousTarget.show(debugMode);
    if (activeTarget.mode === TargetFuyante.MODES.FLEE && autonomousTarget.isFleeing()) {
      drawEnduranceBar(autonomousTarget);
    }
  } else {
    // Mode souris — curseur lumineux
    push();
    noStroke();

    // Glow
    for (let i = 4; i > 0; i--) {
      fill(40, 80, 100, 8 / i);
      circle(
        activeTarget.position.x,
        activeTarget.position.y,
        activeTarget.radius * 2 * i * 0.8
      );
    }

    // Core
    fill(40, 90, 100, 70);
    circle(
      activeTarget.position.x,
      activeTarget.position.y,
      activeTarget.radius * 2
    );

    // Centre brillant
    fill(0, 0, 100, 60);
    circle(
      activeTarget.position.x,
      activeTarget.position.y,
      activeTarget.radius * 0.6
    );
    pop();
  }

  return targetSelector.getActiveTarget();
}

// ── BARRE D'ENDURANCE ────────────────────────────────────────
function drawEnduranceBar(target) {
  const widthPx = Math.max(60, target.r * 2);
  const heightPx = 7;
  const leftEdge = target.pos.x - widthPx / 2;
  const topEdge = target.pos.y - target.r - 22;
  const endurance = fleeController.getEndurance();

  push();
  noStroke();

  // Fond
  fill(0, 0, 0, 50);
  rect(leftEdge, topEdge, widthPx, heightPx, 3);

  // Barre colorée selon l'endurance
  if (endurance > 0.5) {
    fill(140, 80, 85, 80); // vert
  } else if (endurance > 0.2) {
    fill(50, 85, 95, 80);  // jaune
  } else {
    fill(0, 85, 100, 80);  // rouge
  }
  rect(leftEdge, topEdge, widthPx * endurance, heightPx, 3);

  pop();
}

// ── CONTRÔLES UI ─────────────────────────────────────────────
function initializeControls() {
  // Toggle du panneau
  const uiButton = document.querySelector('#ui-toggle');
  const panel = document.querySelector('#controls-panel');
  uiButton.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    uiButton.setAttribute('aria-expanded', String(!panel.hidden));
    uiButton.textContent = panel.hidden ? '⚙ Panneau' : '✕ Fermer';
  });

  // Sélecteur de mode cible
  const targetModeSelect = document.querySelector("#target-mode");
  targetModeSelect.addEventListener("change", () => {
    targetSelector.setMode(targetModeSelect.value);
    if (targetSelector.getMode() !== TargetFuyante.MODES.FLEE) autonomousTarget.reset();
  });

  // Contrôles de fuite
  const fleeControls = [
    ["flee-detection-slider", "flee-detection-value", "detectionRadius", value => `${Math.round(value)} px`],
    ["flee-exit-slider", "flee-exit-value", "exitDistance", value => `${Math.round(value)} px`],
    ["flee-duration-slider", "flee-duration-value", "maxDuration", value => `${value.toFixed(1).replace(".", ",")} s`],
  ];
  for (const [inputId, outputId, parameter, format] of fleeControls) {
    VehiclePopulation.bindRangeControl(
      document.querySelector(`#${inputId}`),
      document.querySelector(`#${outputId}`),
      value => autonomousTarget.setSettings({ [parameter]: Number(value) })[parameter],
      format
    );
  }

  // Population
  const populationInput = document.querySelector("#population-slider");
  const populationOutput = document.querySelector("#population-value");
  VehiclePopulation.bindRangeControl(
    populationInput,
    populationOutput,
    (value) => VehiclePopulation.setPopulationSize(
      vehicles,
      value,
      createVehicleAtRandomPosition
    )
  );

  // Vitesse max
  const speedInput = document.querySelector("#speed-slider");
  const speedOutput = document.querySelector("#speed-value");
  VehiclePopulation.bindRangeControl(
    speedInput,
    speedOutput,
    (value) => {
      currentMaxSpeed = VehiclePopulation.setMaxSpeed(vehicles, value);
      if (predator) predator.maxSpeed = currentMaxSpeed * 0.85;
      return currentMaxSpeed;
    },
    (value) => value.toFixed(1).replace(".", ",")
  );

  // Force max
  const forceInput = document.querySelector("#force-slider");
  const forceOutput = document.querySelector("#force-value");
  VehiclePopulation.bindRangeControl(
    forceInput,
    forceOutput,
    (value) => {
      currentMaxForce = VehiclePopulation.setMaxForce(vehicles, value);
      if (predator) predator.maxForce = currentMaxForce * 1.5;
      return currentMaxForce;
    },
    (value) => value.toFixed(2).replace(".", ",")
  );

  // Longueur de la traînée
  const trailInput = document.querySelector("#trail-slider");
  const trailOutput = document.querySelector("#trail-value");
  if (trailInput && trailOutput) {
    VehiclePopulation.bindRangeControl(
      trailInput,
      trailOutput,
      (value) => {
        const len = Math.round(Number(value));
        for (const v of vehicles) v.trailMax = len;
        if (predator) predator.trailMax = Math.round(len * 1.3);
        return len;
      }
    );
  }

  // Mode Debug IA
  const debugToggle = document.querySelector("#debug-toggle");
  if (debugToggle) {
    debugToggle.addEventListener("click", () => {
      debugMode = !debugMode;
      debugToggle.textContent = debugMode ? "🔍 Masquer Debug IA (Touche D)" : "🔍 Mode Debug IA (Touche D)";
      debugToggle.classList.toggle("active", debugMode);
      debugToggle.setAttribute('aria-pressed', String(debugMode));
    });
  }

  // Prédateur
  const predatorToggle = document.querySelector("#predator-toggle");
  if (predatorToggle) {
    predatorToggle.addEventListener("click", () => {
      predatorEnabled = !predatorEnabled;
      if (predatorEnabled) {
        spawnPredator();
        predatorToggle.textContent = "🦈 Désactiver le prédateur";
        predatorToggle.classList.add("active");
      } else {
        destroyPredator();
        predatorToggle.textContent = "🦈 Activer le prédateur";
        predatorToggle.classList.remove("active");
      }
      predatorToggle.setAttribute('aria-pressed', String(predatorEnabled));
    });
  }

  // Musique
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
      button.textContent = music.running ? '🔇 Couper la musique' : '🎵 Activer la musique';
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

// ── UTILITAIRES ──────────────────────────────────────────────
function createVehicleAtRandomPosition() {
  const vehicle = new Vehicle(0, 0);
  const x = VehiclePopulation.randomCoordinate(width, vehicle.r);
  const y = VehiclePopulation.randomCoordinate(height, vehicle.r);
  vehicle.pos.set(x, y);
  return VehiclePopulation.configureVehicle(vehicle, currentMaxSpeed, currentMaxForce);
}

function trackPointerInsideCanvas() {
  canvas.elt.addEventListener("pointermove", (event) => {
    const bounds = canvas.elt.getBoundingClientRect();
    let x = (event.clientX - bounds.left) * width / bounds.width;
    let y = (event.clientY - bounds.top) * height / bounds.height;

    // Toujours maintenir la cible dans l'écran avec une marge de sécurité
    x = constrain(x, 26, width - 26);
    y = constrain(y, 26, height - 26);

    mouseTarget.set(x, y);
    music.setPointer(x / width, y / height);
  });

  canvas.elt.addEventListener("pointerdown", () => {
    PredatorWeapons.initAudio();
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  SpaceBackground.resize(width, height);
}

// ── AFFICHAGE DEBUG IA ───────────────────────────────────────
function drawDebugHUD() {
  push();
  resetMatrix();
  const boxW = 340;
  const boxH = 92;
  const margin = 16;
  const x = width - boxW - margin;
  const y = height - boxH - margin;

  // Panneau verre
  noStroke();
  fill(225, 40, 10, 85);
  rect(x, y, boxW, boxH, 8);
  stroke(195, 90, 100, 60);
  strokeWeight(1);
  noFill();
  rect(x, y, boxW, boxH, 8);

  // Titre
  noStroke();
  fill(0, 0, 100);
  textSize(13);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("🔍 MODE DEBUG IA — Craig Reynolds", x + 12, y + 10);

  // Légende des 3 vecteurs
  textSize(11);
  textStyle(NORMAL);

  // 1) Vert : Vitesse désirée
  fill(120, 90, 100);
  circle(x + 18, y + 36, 8);
  fill(0, 0, 95);
  text("Vitesse désirée (vers la cible)", x + 28, y + 31);

  // 2) Bleu : Vitesse actuelle
  fill(210, 90, 100);
  circle(x + 18, y + 54, 8);
  fill(0, 0, 95);
  text("Vitesse actuelle du vaisseau", x + 28, y + 49);

  // 3) Rouge : Force de pilotage
  fill(0, 90, 100);
  circle(x + 18, y + 72, 8);
  fill(0, 0, 95);
  text("Force de braquage (Steering force = Vd - Va)", x + 28, y + 67);

  pop();
}

// ── CLAVIER ──────────────────────────────────────────────────
function keyPressed() {
  if (key === 'd' || key === 'D') {
    debugMode = !debugMode;
    const debugToggle = document.querySelector("#debug-toggle");
    if (debugToggle) {
      debugToggle.textContent = debugMode ? "🔍 Masquer Debug IA (Touche D)" : "🔍 Mode Debug IA (Touche D)";
      debugToggle.classList.toggle("active", debugMode);
      debugToggle.setAttribute('aria-pressed', String(debugMode));
    }
  } else if (key === 'p' || key === 'P') {
    predatorEnabled = !predatorEnabled;
    const predatorToggle = document.querySelector("#predator-toggle");
    if (predatorEnabled) {
      spawnPredator();
      if (predatorToggle) {
        predatorToggle.textContent = "🦈 Désactiver le prédateur";
        predatorToggle.classList.add("active");
        predatorToggle.setAttribute('aria-pressed', 'true');
      }
    } else {
      destroyPredator();
      if (predatorToggle) {
        predatorToggle.textContent = "🦈 Activer le prédateur";
        predatorToggle.classList.remove("active");
        predatorToggle.setAttribute('aria-pressed', 'false');
      }
    }
  }
}

