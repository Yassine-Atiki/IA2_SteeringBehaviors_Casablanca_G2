const VehiclePopulation = (() => {
  const LIMITS = Object.freeze({
    count: Object.freeze({ min: 1, max: 200, defaultValue: 20 }),
    maxSpeed: Object.freeze({ min: 0, max: 40, defaultValue: 4 }),
    maxForce: Object.freeze({ min: 0, max: 10, defaultValue: 0.1 }),
  });

  function clampNumber(value, minimum, maximum, fallback) {
    const number = Number(value);
    const safeValue = Number.isFinite(number) ? number : fallback;
    return Math.min(maximum, Math.max(minimum, safeValue));
  }

  function normalizeCount(value) {
    const limits = LIMITS.count;
    const count = clampNumber(value, limits.min, limits.max, limits.defaultValue);
    return Math.round(count);
  }

  function normalizeMaxSpeed(value) {
    const limits = LIMITS.maxSpeed;
    return clampNumber(value, limits.min, limits.max, limits.defaultValue);
  }

  function normalizeMaxForce(value) {
    const limits = LIMITS.maxForce;
    return clampNumber(value, limits.min, limits.max, limits.defaultValue);
  }

  function setPopulationSize(vehicles, requestedCount, createVehicle) {
    const count = normalizeCount(requestedCount);

    if (count < vehicles.length) {
      vehicles.splice(count);
    }

    while (vehicles.length < count) {
      vehicles.push(createVehicle());
    }

    return count;
  }

  function setMaxSpeed(vehicles, requestedSpeed) {
    const maxSpeed = normalizeMaxSpeed(requestedSpeed);

    for (const vehicle of vehicles) {
      vehicle.maxSpeed = maxSpeed;
      vehicle.vel.limit(maxSpeed);
    }

    return maxSpeed;
  }

  function setMaxForce(vehicles, requestedForce) {
    const maxForce = normalizeMaxForce(requestedForce);

    for (const vehicle of vehicles) {
      vehicle.maxForce = maxForce;
    }

    return maxForce;
  }

  function configureVehicle(vehicle, requestedSpeed, requestedForce) {
    vehicle.maxSpeed = normalizeMaxSpeed(requestedSpeed);
    vehicle.maxForce = normalizeMaxForce(requestedForce);
    vehicle.vel.limit(vehicle.maxSpeed);
    return vehicle;
  }

  function randomCoordinate(extent, radius, randomValue = Math.random) {
    const safeExtent = Math.max(0, Number(extent) || 0);
    const safeRadius = Math.max(0, Number(radius) || 0);

    if (safeExtent <= safeRadius * 2) {
      return safeExtent / 2;
    }

    const unitValue = clampNumber(randomValue(), 0, 1, 0.5);
    return safeRadius + unitValue * (safeExtent - safeRadius * 2);
  }

  function updateOutput(output, value, formatValue) {
    const displayedValue = formatValue(value);
    output.value = displayedValue;
    output.textContent = displayedValue;
  }

  function bindRangeControl(input, output, applyValue, formatValue = String) {
    const handleInput = () => {
      const appliedValue = applyValue(input.value);
      updateOutput(output, appliedValue, formatValue);
    };

    input.addEventListener("input", handleInput);
    handleInput();

    return () => input.removeEventListener("input", handleInput);
  }

  return Object.freeze({
    LIMITS,
    bindRangeControl,
    configureVehicle,
    normalizeCount,
    normalizeMaxForce,
    normalizeMaxSpeed,
    randomCoordinate,
    setMaxForce,
    setMaxSpeed,
    setPopulationSize,
  });
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = VehiclePopulation;
}
