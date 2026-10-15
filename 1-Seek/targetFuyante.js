// ============================================================
// targetFuyante.js — Cible Fuyante Spatiale 🌀💨
// Sous-classe de Target (qui hérite de Vehicle).
// Tout objet graphique qui bouge à l'écran DOIT être un Vehicle
// et DOIT utiliser les steering behaviors (Craig Reynolds).
// ============================================================

// Résolution de la classe parente Target (navigateur ou environnement Node de test)
const ParentTarget = (() => {
  if (typeof Target !== "undefined") return Target;
  if (typeof Vehicle !== "undefined") return class extends Vehicle {};
  // Fallback universel pour tests unitaires découplés
  return class MockVehicleTarget {
    constructor(x = 0, y = 0) {
      this.pos = (typeof createVector === "function") ? createVector(x, y) : {
        x,
        y,
        set(nx, ny) { this.x = nx; this.y = ny; },
      };
      this.vel = (typeof createVector === "function") ? createVector(0, 0) : {
        x: 0,
        y: 0,
        set(nx, ny) { this.x = nx; this.y = ny; },
        mag() { return Math.hypot(this.x, this.y); },
        heading() { return Math.atan2(this.y, this.x); },
        limit(m) {
          const mag = Math.hypot(this.x, this.y);
          if (mag > m && mag > 0) { this.x = (this.x / mag) * m; this.y = (this.y / mag) * m; }
        },
      };
      this.acc = (typeof createVector === "function") ? createVector(0, 0) : {
        x: 0,
        y: 0,
        set(nx, ny) { this.x = nx; this.y = ny; },
        add(f) { this.x += f.x; this.y += f.y; },
      };
      this.r = 45;
      this.maxSpeed = 4;
      this.maxForce = 0.1;
    }
    applyForce(f) {
      if (this.acc && typeof this.acc.add === "function") {
        this.acc.add(f);
      } else {
        this.acc.x += f.x;
        this.acc.y += f.y;
      }
    }
    seek(targetPos) {
      const tv = targetPos.pos || targetPos;
      const dx = tv.x - this.pos.x;
      const dy = tv.y - this.pos.y;
      const dist = Math.hypot(dx, dy) || 1;
      const desiredX = (dx / dist) * this.maxSpeed;
      const desiredY = (dy / dist) * this.maxSpeed;
      let steerX = desiredX - this.vel.x;
      let steerY = desiredY - this.vel.y;
      const sMag = Math.hypot(steerX, steerY);
      if (sMag > this.maxForce && sMag > 0) {
        steerX = (steerX / sMag) * this.maxForce;
        steerY = (steerY / sMag) * this.maxForce;
      }
      return {
        x: steerX,
        y: steerY,
        mult(n) {
          this.x *= n;
          this.y *= n;
          return this;
        },
      };
    }
    flee(targetPos) {
      const steer = this.seek(targetPos);
      return steer.mult(-1);
    }
    update() {
      if (typeof this.vel.add === "function") {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.set(0, 0);
      } else {
        this.vel.x += this.acc.x;
        this.vel.y += this.acc.y;
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        this.acc.x = 0;
        this.acc.y = 0;
      }
    }
    edges() {}
    show() {}
  };
})();

/**
 * TargetFuyante — Sous-classe de Target.
 * Tout objet mobile à l'écran est un Vehicle utilisant les steering behaviors.
 * Cette cible spécialisée calcule sa force de fuite (flee) lorsqu'un véhicule
 * entre dans son rayon de détection et l'applique via applyForce().
 */
class TargetFuyante extends ParentTarget {
  constructor(x, y, initialSettings = {}) {
    super(x, y);

    // Sauvegarde des limites normales pour restauration après fuite
    this.baseMaxSpeed = this.maxSpeed;
    this.baseMaxForce = this.maxForce;

    this.settings = TargetFuyante.normalizeSettings(initialSettings);
    this.status = TargetFuyante.STATES.NORMAL;
    this.threat = null;
    this.elapsed = 0;
    this.endurance = 1.0;
  }

  // ── STEERING BEHAVIORS : CALCUL ET APPLICATION DE LA FORCE DE FUITE ──
  applyBehaviors(vehicles, dt = 0) {
    if (!vehicles || vehicles.length === 0) return;
    const deltaSeconds = Math.max(0, Number(dt) || 0) / 1000;
    const nearest = TargetFuyante.nearestVehicle(this.pos, vehicles, this.settings.detectionRadius);

    if (this.status === TargetFuyante.STATES.COOLDOWN) {
      if (!nearest) {
        this.status = TargetFuyante.STATES.NORMAL;
      }
      return;
    }

    if (this.status === TargetFuyante.STATES.NORMAL) {
      if (nearest) {
        this.enterFlee(nearest.vehicle);
      } else {
        return;
      }
    }

    if (this.status === TargetFuyante.STATES.FLEEING) {
      this.elapsed += deltaSeconds;
      this.endurance = Math.max(0, 1 - this.elapsed / this.settings.maxDuration);
      const dist = nearest ? Math.sqrt(nearest.distanceSquared) : Infinity;
      const escaped = dist >= this.settings.exitDistance;
      const exhausted = this.elapsed >= this.settings.maxDuration;

      if (escaped || exhausted) {
        this.leaveFlee(nearest ? TargetFuyante.STATES.COOLDOWN : TargetFuyante.STATES.NORMAL);
        return;
      }

      if (nearest) {
        this.threat = nearest.vehicle;
      }

      // Steering Behavior de Reynolds : calculer la force de fuite et l'appliquer
      if (this.threat) {
        const threatPos = this.threat.pos || this.threat;
        const fleeForce = this.flee(threatPos);
        this.applyForce(fleeForce);
      }
    }
  }

  enterFlee(threatVehicle) {
    this.status = TargetFuyante.STATES.FLEEING;
    this.threat = threatVehicle;
    this.elapsed = 0;
    this.endurance = 1;
    if (this.baseMaxSpeed === null || this.baseMaxSpeed === undefined) {
      this.baseMaxSpeed = this.maxSpeed;
    }
    if (this.baseMaxForce === null || this.baseMaxForce === undefined) {
      this.baseMaxForce = this.maxForce;
    }
    this.maxSpeed = this.baseMaxSpeed * this.settings.speedMultiplier;
    this.maxForce = this.baseMaxForce * this.settings.forceMultiplier;
  }

  leaveFlee(nextStatus) {
    this.restoreLimits();
    this.status = nextStatus;
    this.threat = null;
    this.endurance = 0;
  }

  restoreLimits() {
    if (this.baseMaxSpeed !== null && this.baseMaxSpeed !== undefined) {
      this.maxSpeed = this.baseMaxSpeed;
    }
    if (this.baseMaxForce !== null && this.baseMaxForce !== undefined) {
      this.maxForce = this.baseMaxForce;
    }
  }

  reset() {
    this.restoreLimits();
    this.status = TargetFuyante.STATES.NORMAL;
    this.threat = null;
    this.elapsed = 0;
    this.endurance = 1;
  }

  getState() {
    return this.status;
  }

  isFleeing() {
    return this.status === TargetFuyante.STATES.FLEEING;
  }

  getThreat() {
    return this.threat;
  }

  getEndurance() {
    return this.endurance;
  }

  getSettings() {
    return { ...this.settings };
  }

  setSettings(nextSettings) {
    this.settings = TargetFuyante.normalizeSettings({ ...this.settings, ...nextSettings });
    if (this.status === TargetFuyante.STATES.FLEEING) {
      this.maxSpeed = this.baseMaxSpeed * this.settings.speedMultiplier;
      this.maxForce = this.baseMaxForce * this.settings.forceMultiplier;
    }
    return { ...this.settings };
  }

  // ── VISUALISATION DEBUG POUR LA CIBLE FUYANTE ──
  show(showDebug = false) {
    if (typeof super.show === "function") {
      super.show();
    }

    if (showDebug && typeof push === "function") {
      push();
      translate(this.pos.x, this.pos.y);

      noFill();
      const hasDash = typeof drawingContext !== "undefined" && drawingContext.setLineDash;

      // 1) Rayon de détection IA (Orange pointillé)
      stroke(35, 95, 100, 65);
      strokeWeight(1.6);
      if (hasDash) drawingContext.setLineDash([6, 6]);
      circle(0, 0, this.settings.detectionRadius * 2);

      // 2) Distance de sortie / fin d'alerte (Vert pointillé)
      stroke(120, 80, 95, 45);
      strokeWeight(1.2);
      circle(0, 0, this.settings.exitDistance * 2);
      if (hasDash) drawingContext.setLineDash([]);

      // 3) Ligne rouge pointillée vers la menace poursuivante
      if (this.threat && this.status === TargetFuyante.STATES.FLEEING) {
        const threatPos = this.threat.pos || this.threat;
        stroke(0, 95, 100, 80);
        strokeWeight(2);
        if (hasDash) drawingContext.setLineDash([4, 4]);
        line(0, 0, threatPos.x - this.pos.x, threatPos.y - this.pos.y);
        if (hasDash) drawingContext.setLineDash([]);
      }

      pop();
    }
  }

  // ── CONSTANTES STATIQUES ──
  static get STATES() {
    return Object.freeze({ NORMAL: "normal", FLEEING: "fleeing", COOLDOWN: "cooldown" });
  }

  static get LIMITS() {
    return Object.freeze({
      detectionRadius: Object.freeze({ min: 50, max: 500, defaultValue: 200 }),
      exitDistance: Object.freeze({ min: 100, max: 800, defaultValue: 300 }),
      maxDuration: Object.freeze({ min: 0.5, max: 5, defaultValue: 2 }),
    });
  }

  static get MODES() {
    return Object.freeze({
      MOUSE: "mouse",
      AUTONOMOUS: "autonomous",
      FLEE: "flee",
    });
  }

  static get MOUSE_TARGET_RADIUS() {
    return 16;
  }

  static get DEFAULT_RESPAWN_ATTEMPTS() {
    return 100;
  }

  // ── UTILITAIRES DE CONFIGURATION ET GÉOMÉTRIE ──
  static clamp(value, limits) {
    const number = Number(value);
    const safe = Number.isFinite(number) ? number : limits.defaultValue;
    return Math.min(limits.max, Math.max(limits.min, safe));
  }

  static normalizeSettings(settings = {}) {
    const detectionRadius = TargetFuyante.clamp(settings.detectionRadius, TargetFuyante.LIMITS.detectionRadius);
    return {
      detectionRadius,
      exitDistance: Math.max(detectionRadius, TargetFuyante.clamp(settings.exitDistance, TargetFuyante.LIMITS.exitDistance)),
      maxDuration: TargetFuyante.clamp(settings.maxDuration, TargetFuyante.LIMITS.maxDuration),
      speedMultiplier: Number.isFinite(Number(settings.speedMultiplier)) ? Number(settings.speedMultiplier) : 2,
      forceMultiplier: Number.isFinite(Number(settings.forceMultiplier)) ? Number(settings.forceMultiplier) : 2,
    };
  }

  static distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  static nearestVehicle(position, vehicles, radius) {
    const limitSquared = radius * radius;
    return vehicles.reduce((nearest, vehicle) => {
      const squared = TargetFuyante.distanceSquared(position, vehicle.pos);
      if (squared > limitSquared || (nearest && squared >= nearest.distanceSquared)) return nearest;
      return { vehicle, distanceSquared: squared };
    }, null);
  }

  static normalizeMode(value) {
    if (value === TargetFuyante.MODES.AUTONOMOUS || value === TargetFuyante.MODES.FLEE) return value;
    return TargetFuyante.MODES.MOUSE;
  }

  static createTargetSelector(mousePosition, autonomousTarget) {
    let currentMode = TargetFuyante.MODES.MOUSE;

    return Object.freeze({
      setMode(value) {
        currentMode = TargetFuyante.normalizeMode(value);
        return currentMode;
      },

      getMode() {
        return currentMode;
      },

      getAutonomousTarget() {
        return autonomousTarget;
      },

      getActiveTarget() {
        if (currentMode === TargetFuyante.MODES.AUTONOMOUS || currentMode === TargetFuyante.MODES.FLEE) {
          return {
            mode: currentMode,
            position: autonomousTarget.pos,
            radius: autonomousTarget.r,
          };
        }

        return {
          mode: currentMode,
          position: mousePosition,
          radius: TargetFuyante.MOUSE_TARGET_RADIUS,
        };
      },
    });
  }

  static hasReachedTarget(vehicle, activeTarget) {
    const combinedRadius = vehicle.r + activeTarget.radius;
    return TargetFuyante.distanceSquared(vehicle.pos, activeTarget.position) <= combinedRadius * combinedRadius;
  }

  static coordinateBounds(extent, radius) {
    const safeExtent = Math.max(0, Number(extent) || 0);
    const safeRadius = Math.max(0, Number(radius) || 0);

    if (safeExtent <= safeRadius * 2) {
      const center = safeExtent / 2;
      return { minimum: center, maximum: center };
    }

    return { minimum: safeRadius, maximum: safeExtent - safeRadius };
  }

  static randomBetween(minimum, maximum, randomValue) {
    const sampledValue = Number(randomValue());
    const unitValue = Number.isFinite(sampledValue)
      ? Math.min(1, Math.max(0, sampledValue))
      : 0.5;
    return minimum + unitValue * (maximum - minimum);
  }

  static isOutsideTarget(position, vehicleRadius, activeTarget) {
    const combinedRadius = vehicleRadius + activeTarget.radius;
    return TargetFuyante.distanceSquared(position, activeTarget.position) > combinedRadius * combinedRadius;
  }

  static farthestCorner(xBounds, yBounds, targetPosition) {
    const corners = [
      { x: xBounds.minimum, y: yBounds.minimum },
      { x: xBounds.maximum, y: yBounds.minimum },
      { x: xBounds.minimum, y: yBounds.maximum },
      { x: xBounds.maximum, y: yBounds.maximum },
    ];

    return corners.reduce((farthest, candidate) => (
      TargetFuyante.distanceSquared(candidate, targetPosition) > TargetFuyante.distanceSquared(farthest, targetPosition)
        ? candidate
        : farthest
    ));
  }

  static findRespawnPosition(
    canvasWidth,
    canvasHeight,
    vehicleRadius,
    activeTarget,
    randomValue = Math.random,
    maximumAttempts = TargetFuyante.DEFAULT_RESPAWN_ATTEMPTS
  ) {
    const xBounds = TargetFuyante.coordinateBounds(canvasWidth, vehicleRadius);
    const yBounds = TargetFuyante.coordinateBounds(canvasHeight, vehicleRadius);
    const attemptCount = Math.max(0, Math.floor(maximumAttempts));

    for (let attempt = 0; attempt < attemptCount; attempt += 1) {
      const candidate = {
        x: TargetFuyante.randomBetween(xBounds.minimum, xBounds.maximum, randomValue),
        y: TargetFuyante.randomBetween(yBounds.minimum, yBounds.maximum, randomValue),
      };

      if (TargetFuyante.isOutsideTarget(candidate, vehicleRadius, activeTarget)) {
        return candidate;
      }
    }

    return TargetFuyante.farthestCorner(xBounds, yBounds, activeTarget.position);
  }

  static respawnVehicle(
    vehicle,
    canvasWidth,
    canvasHeight,
    activeTarget,
    randomValue = Math.random
  ) {
    const nextPosition = TargetFuyante.findRespawnPosition(
      canvasWidth,
      canvasHeight,
      vehicle.r,
      activeTarget,
      randomValue
    );

    vehicle.pos.set(nextPosition.x, nextPosition.y);
    vehicle.vel.set(0, 0);
    vehicle.acc.set(0, 0);
    return vehicle;
  }

  // Adaptateur contrôleur pour compatibilité avec le code de scène existant
  static createController(target, vehicles, initialSettings = {}) {
    if (target instanceof TargetFuyante) {
      if (initialSettings && Object.keys(initialSettings).length > 0) {
        target.setSettings(initialSettings);
      }
      return {
        getState: () => target.getState(),
        isFleeing: () => target.isFleeing(),
        getThreat: () => target.getThreat(),
        getEndurance: () => target.getEndurance(),
        getSettings: () => target.getSettings(),
        setSettings: (s) => target.setSettings(s),
        step: (dt) => {
          target.applyBehaviors(vehicles, dt);
          return {
            status: target.getState(),
            threat: target.getThreat(),
            endurance: target.getEndurance(),
          };
        },
        reset: () => target.reset(),
      };
    }

    // Si cible générique passée en paramètre
    const state = {
      settings: TargetFuyante.normalizeSettings(initialSettings),
      status: TargetFuyante.STATES.NORMAL,
      threat: null,
      elapsed: 0,
      endurance: 1,
      normalMaxSpeed: null,
      normalMaxForce: null,
    };

    function restoreLimits() {
      if (state.normalMaxSpeed !== null) target.maxSpeed = state.normalMaxSpeed;
      if (state.normalMaxForce !== null) target.maxForce = state.normalMaxForce;
      state.normalMaxSpeed = null;
      state.normalMaxForce = null;
    }

    return {
      getState: () => state.status,
      isFleeing: () => state.status === TargetFuyante.STATES.FLEEING,
      getThreat: () => state.threat,
      getEndurance: () => state.endurance,
      getSettings: () => ({ ...state.settings }),
      setSettings(nextSettings) {
        state.settings = TargetFuyante.normalizeSettings({ ...state.settings, ...nextSettings });
        if (state.status === TargetFuyante.STATES.FLEEING) {
          target.maxSpeed = state.normalMaxSpeed * state.settings.speedMultiplier;
          target.maxForce = state.normalMaxForce * state.settings.forceMultiplier;
        }
        return { ...state.settings };
      },
      step(deltaMilliseconds = 0) {
        const deltaSeconds = Math.max(0, Number(deltaMilliseconds) || 0) / 1000;
        const nearest = TargetFuyante.nearestVehicle(target.pos, vehicles, state.settings.detectionRadius);

        if (state.status === TargetFuyante.STATES.COOLDOWN) {
          if (!nearest) state.status = TargetFuyante.STATES.NORMAL;
          return { ...state };
        }

        if (state.status === TargetFuyante.STATES.NORMAL) {
          if (nearest) {
            state.status = TargetFuyante.STATES.FLEEING;
            state.threat = nearest.vehicle;
            state.elapsed = 0;
            state.endurance = 1;
            state.normalMaxSpeed = target.maxSpeed;
            state.normalMaxForce = target.maxForce;
            target.maxSpeed = state.normalMaxSpeed * state.settings.speedMultiplier;
            target.maxForce = state.normalMaxForce * state.settings.forceMultiplier;
          }
          return { ...state };
        }

        state.elapsed += deltaSeconds;
        state.endurance = Math.max(0, 1 - state.elapsed / state.settings.maxDuration);
        const distance = nearest ? Math.sqrt(nearest.distanceSquared) : Infinity;
        const escaped = distance >= state.settings.exitDistance;
        const exhausted = state.elapsed >= state.settings.maxDuration;

        if (escaped || exhausted) {
          restoreLimits();
          state.status = nearest ? TargetFuyante.STATES.COOLDOWN : TargetFuyante.STATES.NORMAL;
          state.threat = null;
          state.endurance = 0;
          return { ...state };
        }

        if (nearest) state.threat = nearest.vehicle;
        if (state.threat && typeof target.applyForce === "function" && typeof target.flee === "function") {
          target.applyForce(target.flee(state.threat.pos));
        }
        return { ...state };
      },
      reset() {
        restoreLimits();
        state.status = TargetFuyante.STATES.NORMAL;
        state.threat = null;
        state.elapsed = 0;
        state.endurance = 1;
      },
    };
  }
}

// Alias pour compatibilité
const TargetScene = TargetFuyante;

if (typeof window !== "undefined") {
  window.TargetFuyante = TargetFuyante;
  window.TargetScene = TargetFuyante;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TargetFuyante;
  TargetFuyante.TargetFuyante = TargetFuyante;
  TargetFuyante.TargetScene = TargetFuyante;
}
