const FleeScene = (() => {
  const STATES = Object.freeze({ NORMAL: "normal", FLEEING: "fleeing", COOLDOWN: "cooldown" });
  const LIMITS = Object.freeze({
    detectionRadius: Object.freeze({ min: 50, max: 500, defaultValue: 200 }),
    exitDistance: Object.freeze({ min: 100, max: 800, defaultValue: 300 }),
    maxDuration: Object.freeze({ min: 0.5, max: 5, defaultValue: 2 }),
  });

  function clamp(value, limits) {
    const number = Number(value);
    const safe = Number.isFinite(number) ? number : limits.defaultValue;
    return Math.min(limits.max, Math.max(limits.min, safe));
  }

  function normalizeSettings(settings = {}) {
    const detectionRadius = clamp(settings.detectionRadius, LIMITS.detectionRadius);
    return {
      detectionRadius,
      exitDistance: Math.max(detectionRadius, clamp(settings.exitDistance, LIMITS.exitDistance)),
      maxDuration: clamp(settings.maxDuration, LIMITS.maxDuration),
      speedMultiplier: Number.isFinite(Number(settings.speedMultiplier)) ? Number(settings.speedMultiplier) : 2,
      forceMultiplier: Number.isFinite(Number(settings.forceMultiplier)) ? Number(settings.forceMultiplier) : 2,
    };
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function nearestVehicle(position, vehicles, radius) {
    const limitSquared = radius * radius;
    return vehicles.reduce((nearest, vehicle) => {
      const squared = distanceSquared(position, vehicle.pos);
      if (squared > limitSquared || (nearest && squared >= nearest.distanceSquared)) return nearest;
      return { vehicle, distanceSquared: squared };
    }, null);
  }

  function createController(target, vehicles, initialSettings = {}) {
    const state = {
      settings: normalizeSettings(initialSettings),
      status: STATES.NORMAL,
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

    function enterFlee(threat) {
      state.status = STATES.FLEEING;
      state.threat = threat.vehicle;
      state.elapsed = 0;
      state.endurance = 1;
      state.normalMaxSpeed = target.maxSpeed;
      state.normalMaxForce = target.maxForce;
      target.maxSpeed = state.normalMaxSpeed * state.settings.speedMultiplier;
      target.maxForce = state.normalMaxForce * state.settings.forceMultiplier;
    }

    function leaveFlee(nextStatus) {
      restoreLimits();
      state.status = nextStatus;
      state.threat = null;
      state.endurance = 0;
    }

    return {
      getState: () => state.status,
      isFleeing: () => state.status === STATES.FLEEING,
      getThreat: () => state.threat,
      getEndurance: () => state.endurance,
      getSettings: () => ({ ...state.settings }),
      setSettings(nextSettings) {
        state.settings = normalizeSettings({ ...state.settings, ...nextSettings });
        if (state.status === STATES.FLEEING) {
          target.maxSpeed = state.normalMaxSpeed * state.settings.speedMultiplier;
          target.maxForce = state.normalMaxForce * state.settings.forceMultiplier;
        }
        return { ...state.settings };
      },
      step(deltaMilliseconds = 0) {
        const deltaSeconds = Math.max(0, Number(deltaMilliseconds) || 0) / 1000;
        const nearest = nearestVehicle(target.pos, vehicles, state.settings.detectionRadius);

        if (state.status === STATES.COOLDOWN) {
          if (!nearest) state.status = STATES.NORMAL;
          return { ...state };
        }

        if (state.status === STATES.NORMAL) {
          if (nearest) enterFlee(nearest);
          return { ...state };
        }

        state.elapsed += deltaSeconds;
        state.endurance = Math.max(0, 1 - state.elapsed / state.settings.maxDuration);
        const distance = nearest ? Math.sqrt(nearest.distanceSquared) : Infinity;
        const escaped = distance >= state.settings.exitDistance;
        const exhausted = state.elapsed >= state.settings.maxDuration;

        if (escaped || exhausted) {
          leaveFlee(nearest ? STATES.COOLDOWN : STATES.NORMAL);
          return { ...state };
        }

        if (nearest) state.threat = nearest.vehicle;
        if (state.threat) target.applyForce(target.flee(state.threat.pos));
        return { ...state };
      },
      reset() {
        restoreLimits();
        state.status = STATES.NORMAL;
        state.threat = null;
        state.elapsed = 0;
        state.endurance = 1;
      },
    };
  }

  return Object.freeze({ LIMITS, STATES, createController, distanceSquared, nearestVehicle, normalizeSettings });
})();

if (typeof module !== "undefined" && module.exports) module.exports = FleeScene;
