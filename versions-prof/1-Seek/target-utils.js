const TargetScene = (() => {
  const MODES = Object.freeze({
    MOUSE: "mouse",
    AUTONOMOUS: "autonomous",
    FLEE: "flee",
  });
  const MOUSE_TARGET_RADIUS = 16;
  const DEFAULT_RESPAWN_ATTEMPTS = 100;

  function normalizeMode(value) {
    if (value === MODES.AUTONOMOUS || value === MODES.FLEE) return value;
    return MODES.MOUSE;
  }

  function createTargetSelector(mousePosition, autonomousTarget) {
    let currentMode = MODES.MOUSE;

    return Object.freeze({
      setMode(value) {
        currentMode = normalizeMode(value);
        return currentMode;
      },

      getMode() {
        return currentMode;
      },

      getAutonomousTarget() {
        return autonomousTarget;
      },

      getActiveTarget() {
        if (currentMode === MODES.AUTONOMOUS || currentMode === MODES.FLEE) {
          return asActiveTarget(autonomousTarget, currentMode);
        }

        return {
          mode: currentMode,
          position: mousePosition,
          radius: MOUSE_TARGET_RADIUS,
        };
      },
    });
  }

  function asActiveTarget(target, mode = MODES.FLEE) {
    return { mode, position: target.pos, radius: target.r };
  }

  function squaredDistance(firstPosition, secondPosition) {
    const deltaX = firstPosition.x - secondPosition.x;
    const deltaY = firstPosition.y - secondPosition.y;
    return deltaX * deltaX + deltaY * deltaY;
  }

  function hasReachedTarget(vehicle, activeTarget) {
    const combinedRadius = vehicle.r + activeTarget.radius;
    return squaredDistance(vehicle.pos, activeTarget.position) <= combinedRadius * combinedRadius;
  }

  function coordinateBounds(extent, radius) {
    const safeExtent = Math.max(0, Number(extent) || 0);
    const safeRadius = Math.max(0, Number(radius) || 0);

    if (safeExtent <= safeRadius * 2) {
      const center = safeExtent / 2;
      return { minimum: center, maximum: center };
    }

    return { minimum: safeRadius, maximum: safeExtent - safeRadius };
  }

  function randomBetween(minimum, maximum, randomValue) {
    const sampledValue = Number(randomValue());
    const unitValue = Number.isFinite(sampledValue)
      ? Math.min(1, Math.max(0, sampledValue))
      : 0.5;
    return minimum + unitValue * (maximum - minimum);
  }

  function isOutsideTarget(position, vehicleRadius, activeTarget) {
    const combinedRadius = vehicleRadius + activeTarget.radius;
    return squaredDistance(position, activeTarget.position) > combinedRadius * combinedRadius;
  }

  function farthestCorner(xBounds, yBounds, targetPosition) {
    const corners = [
      { x: xBounds.minimum, y: yBounds.minimum },
      { x: xBounds.maximum, y: yBounds.minimum },
      { x: xBounds.minimum, y: yBounds.maximum },
      { x: xBounds.maximum, y: yBounds.maximum },
    ];

    return corners.reduce((farthest, candidate) => (
      squaredDistance(candidate, targetPosition) > squaredDistance(farthest, targetPosition)
        ? candidate
        : farthest
    ));
  }

  function findRespawnPosition(
    canvasWidth,
    canvasHeight,
    vehicleRadius,
    activeTarget,
    randomValue = Math.random,
    maximumAttempts = DEFAULT_RESPAWN_ATTEMPTS
  ) {
    const xBounds = coordinateBounds(canvasWidth, vehicleRadius);
    const yBounds = coordinateBounds(canvasHeight, vehicleRadius);
    const attemptCount = Math.max(0, Math.floor(maximumAttempts));

    for (let attempt = 0; attempt < attemptCount; attempt += 1) {
      const candidate = {
        x: randomBetween(xBounds.minimum, xBounds.maximum, randomValue),
        y: randomBetween(yBounds.minimum, yBounds.maximum, randomValue),
      };

      if (isOutsideTarget(candidate, vehicleRadius, activeTarget)) {
        return candidate;
      }
    }

    return farthestCorner(xBounds, yBounds, activeTarget.position);
  }

  function respawnVehicle(
    vehicle,
    canvasWidth,
    canvasHeight,
    activeTarget,
    randomValue = Math.random
  ) {
    const nextPosition = findRespawnPosition(
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

  return Object.freeze({
    DEFAULT_RESPAWN_ATTEMPTS,
    MODES,
    MOUSE_TARGET_RADIUS,
    createTargetSelector,
    asActiveTarget,
    findRespawnPosition,
    hasReachedTarget,
    isOutsideTarget,
    normalizeMode,
    respawnVehicle,
  });
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = TargetScene;
}
