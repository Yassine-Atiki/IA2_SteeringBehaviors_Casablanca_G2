class TargetFuyante extends Target {
  static DUPLICATION_ANIMATION_DURATION = 0.7;
  static STATES = Object.freeze({ NORMAL: "normal", FLEEING: "fleeing", COOLDOWN: "cooldown" });
  static LIMITS = Object.freeze({
    detectionRadius: Object.freeze({ min: 50, max: 500, defaultValue: 200 }),
    exitDistance: Object.freeze({ min: 100, max: 800, defaultValue: 300 }),
    maxDuration: Object.freeze({ min: 0.5, max: 5, defaultValue: 2 }),
    duplicationDuration: Object.freeze({ min: 1, max: 10, defaultValue: 4 }),
  });

  constructor(x, y) {
    super(x, y);
    this.fleeSettings = { detectionRadius: 200, exitDistance: 300, maxDuration: 2,
      duplicationDuration: 4, speedMultiplier: 2, forceMultiplier: 2 };
    this.fleeState = TargetFuyante.STATES.NORMAL;
    this.fleeThreat = null;
    this.fleeElapsed = 0;
    this.endurance = 1;
    this.normalMaxSpeed = null;
    this.normalMaxForce = null;
    this.survivalElapsed = 0;
    this.hasDuplicated = false;
    this.duplicationProgress = 0;
    this.duplicating = false;
  }

  static clamp(value, limits) {
    const number = Number(value);
    const safeValue = Number.isFinite(number) ? number : limits.defaultValue;
    return Math.min(limits.max, Math.max(limits.min, safeValue));
  }

  setFleeSettings(settings = {}) {
    const detectionRadius = TargetFuyante.clamp(settings.detectionRadius ?? this.fleeSettings.detectionRadius,
      TargetFuyante.LIMITS.detectionRadius);
    this.fleeSettings = { ...this.fleeSettings, detectionRadius,
      exitDistance: Math.max(detectionRadius, TargetFuyante.clamp(
        settings.exitDistance ?? this.fleeSettings.exitDistance, TargetFuyante.LIMITS.exitDistance)),
      maxDuration: TargetFuyante.clamp(settings.maxDuration ?? this.fleeSettings.maxDuration,
        TargetFuyante.LIMITS.maxDuration) };
    if (this.isFleeing()) {
      this.maxSpeed = this.normalMaxSpeed * this.fleeSettings.speedMultiplier;
      this.maxForce = this.normalMaxForce * this.fleeSettings.forceMultiplier;
    }
    return { ...this.fleeSettings };
  }

  getFleeSettings() { return { ...this.fleeSettings }; }

  setDuplicationDuration(value) {
    this.fleeSettings.duplicationDuration = TargetFuyante.clamp(
      value,
      TargetFuyante.LIMITS.duplicationDuration
    );
    return this.fleeSettings.duplicationDuration;
  }

  advanceSurvival(deltaMilliseconds = 0) {
    if (this.hasDuplicated || this.duplicating) return false;
    this.survivalElapsed += Math.max(0, Number(deltaMilliseconds) || 0) / 1000;
    if (this.survivalElapsed < this.fleeSettings.duplicationDuration) return false;
    this.hasDuplicated = true;
    this.duplicating = true;
    this.duplicationProgress = 0;
    return true;
  }

  advanceDuplication(deltaMilliseconds = 0) {
    if (!this.duplicating) return false;
    this.duplicationProgress = Math.min(
      1,
      this.duplicationProgress
        + Math.max(0, Number(deltaMilliseconds) || 0) / 1000 / TargetFuyante.DUPLICATION_ANIMATION_DURATION
    );
    return this.duplicationProgress >= 1;
  }

  isDuplicating() { return this.duplicating; }
  getDuplicationProgress() { return this.duplicationProgress; }

  resetDuplication() {
    this.survivalElapsed = 0;
    this.hasDuplicated = false;
    this.duplicationProgress = 0;
    this.duplicating = false;
  }

  findNearestThreat(vehicles) {
    const radiusSquared = this.fleeSettings.detectionRadius ** 2;
    return vehicles.reduce((nearest, vehicle) => {
      const distanceSquared = p5.Vector.sub(this.pos, vehicle.pos).magSq();
      if (distanceSquared > radiusSquared || (nearest && distanceSquared >= nearest.distanceSquared)) return nearest;
      return { vehicle, distanceSquared };
    }, null);
  }

  beginFlee(threat) {
    this.fleeState = TargetFuyante.STATES.FLEEING;
    this.fleeThreat = threat.vehicle;
    this.fleeElapsed = 0;
    this.endurance = 1;
    this.normalMaxSpeed = this.maxSpeed;
    this.normalMaxForce = this.maxForce;
    this.maxSpeed = this.normalMaxSpeed * this.fleeSettings.speedMultiplier;
    this.maxForce = this.normalMaxForce * this.fleeSettings.forceMultiplier;
  }

  restoreNormalLimits() {
    if (this.normalMaxSpeed !== null) this.maxSpeed = this.normalMaxSpeed;
    if (this.normalMaxForce !== null) this.maxForce = this.normalMaxForce;
    this.normalMaxSpeed = null;
    this.normalMaxForce = null;
  }

  endFlee(nextState) {
    this.restoreNormalLimits();
    this.fleeState = nextState;
    this.fleeThreat = null;
    this.endurance = 0;
  }

  updateFlee(vehicles, deltaMilliseconds = 0) {
    const deltaSeconds = Math.max(0, Number(deltaMilliseconds) || 0) / 1000;
    const nearest = this.findNearestThreat(vehicles);
    if (this.fleeState === TargetFuyante.STATES.COOLDOWN) {
      if (!nearest) { this.fleeState = TargetFuyante.STATES.NORMAL; this.endurance = 1; }
      return;
    }
    if (this.fleeState === TargetFuyante.STATES.NORMAL) {
      if (nearest) this.beginFlee(nearest);
      return;
    }
    this.fleeElapsed += deltaSeconds;
    this.endurance = Math.max(0, 1 - this.fleeElapsed / this.fleeSettings.maxDuration);
    const distance = nearest ? Math.sqrt(nearest.distanceSquared) : Infinity;
    if (distance >= this.fleeSettings.exitDistance || this.fleeElapsed >= this.fleeSettings.maxDuration) {
      this.endFlee(nearest ? TargetFuyante.STATES.COOLDOWN : TargetFuyante.STATES.NORMAL);
      return;
    }
    if (nearest) this.fleeThreat = nearest.vehicle;
    if (this.fleeThreat) this.applyForce(this.flee(this.fleeThreat.pos));
  }

  isFleeing() { return this.fleeState === TargetFuyante.STATES.FLEEING; }
  getFleeState() { return this.fleeState; }
  getEndurance() { return this.endurance; }
  resetFlee() {
    this.restoreNormalLimits();
    this.fleeState = TargetFuyante.STATES.NORMAL;
    this.fleeThreat = null;
    this.fleeElapsed = 0;
    this.endurance = 1;
  }
}

if (typeof globalThis !== "undefined") globalThis.TargetFuyante = TargetFuyante;

if (typeof module !== "undefined" && module.exports) module.exports = { TargetFuyante };
