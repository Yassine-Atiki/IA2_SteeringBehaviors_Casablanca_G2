(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.ParametresWander = api;
})(globalThis, function () {
  const definitions = {
    maxSpeed: { min: 1, max: 20, step: 1 },
    maxForce: { min: 0.05, max: 2, step: 0.05 },
    wanderRadius: { min: 5, max: 100, step: 5 },
    distanceCercle: { min: 10, max: 300, step: 10 },
    wanderWeight: { min: 0, max: 5, step: 0.1 },
    arriveWeight: { min: 0, max: 5, step: 0.1 },
    displaceRange: { min: 0, max: 1, step: 0.01 },
    pathLength: { min: 0, max: 100, step: 1 }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function mutateValue(value, definition, random = Math.random) {
    const direction = random() < 0.5 ? -1 : 1;
    const maxSteps = Math.max(1, Math.round((definition.max - definition.min) * 0.1 / definition.step));
    const steps = 1 + Math.floor(random() * maxSteps);
    const next = clamp(value + direction * steps * definition.step, definition.min, definition.max);
    const decimals = definition.step < 1 ? 2 : 0;
    return Number((Math.round((next - definition.min) / definition.step) * definition.step + definition.min).toFixed(decimals));
  }

  function mutateVehicle(vehicle, random = Math.random) {
    for (const [name, definition] of Object.entries(definitions)) {
      vehicle[name] = mutateValue(vehicle[name], definition, random);
    }
    if (Array.isArray(vehicle.path) && vehicle.path.length > vehicle.pathLength) {
      vehicle.path.splice(0, vehicle.path.length - vehicle.pathLength);
    }
    return vehicle;
  }

  function resizePopulation(vehicles, count, createVehicle) {
    while (vehicles.length < count) {
      vehicles.push(createVehicle());
    }
    vehicles.length = count;
    return vehicles;
  }

  return { definitions, mutateValue, mutateVehicle, resizePopulation };
});
