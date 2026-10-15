// Fonctions sans dépendance au canvas pour garder la gestion de la scène testable.
const PursueEvadeScene = (() => {
  const LIMITS = Object.freeze({
    vehicleCount: { min: 1, max: 50, defaultValue: 5 },
    targetCount: { min: 1, max: 50, defaultValue: 5 },
    detectionRadius: { min: 20, max: 400, defaultValue: 100 },
    predictionDistance: { min: 0, max: 60, defaultValue: 20 },
    vehicleSpeed: { min: 0.1, max: 30, defaultValue: 10 },
    vehicleForce: { min: 0.01, max: 2, defaultValue: 0.25 },
    targetSpeed: { min: 0.1, max: 15, defaultValue: 5 },
    targetForce: { min: 0.01, max: 2, defaultValue: 0.5 },
    evadeSpeed: { min: 0.1, max: 25, defaultValue: 12 },
    evadeForce: { min: 0.01, max: 3, defaultValue: 1 },
    decoyLifetime: { min: 0.2, max: 5, defaultValue: 1 },
    decoysPerDetection: { min: 1, max: 25, defaultValue: 10 },
    decoyCooldown: { min: 0.5, max: 10, defaultValue: 3 }
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
  }

  function setPopulationSize(items, count, createItem) {
    const desiredCount = Math.round(clamp(count, 0, Number.MAX_SAFE_INTEGER));
    while (items.length < desiredCount) items.push(createItem(items.length));
    items.length = desiredCount;
    return items.length;
  }

  function nearestByDistance(origin, entities) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const entity of entities) {
      if (!entity?.pos) continue;
      const distance = origin.dist ? origin.dist(entity.pos) : distanceBetween(origin, entity.pos);
      if (distance < nearestDistance) {
        nearest = entity;
        nearestDistance = distance;
      }
    }
    return nearest ? { entity: nearest, distance: nearestDistance } : null;
  }

  function distanceBetween(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  return { LIMITS, clamp, setPopulationSize, nearestByDistance, distanceBetween };
})();

if (typeof module !== "undefined") module.exports = PursueEvadeScene;
