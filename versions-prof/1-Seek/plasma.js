const PsychedelicPlasma = (() => {
  const FULL_CIRCLE = Math.PI * 2;
  const MAX_RENDER_SIDE = 180;

  const PARAMETER_LIMITS = Object.freeze({
    speed: Object.freeze({ min: 0, max: 3, defaultValue: 1 }),
    complexity: Object.freeze({ min: 1, max: 8, defaultValue: 4, integer: true }),
    blobSize: Object.freeze({ min: 40, max: 400, defaultValue: 160 }),
    hue: Object.freeze({ min: 0, max: 360, defaultValue: 0 }),
    saturation: Object.freeze({ min: 40, max: 100, defaultValue: 90 }),
    mouseInfluence: Object.freeze({ min: 0, max: 2, defaultValue: 1 }),
  });

  const COMPONENTS = Object.freeze([
    Object.freeze({ phase: 0.17, speed: 0.53, orbitX: 0.37, orbitY: 0.29, frequency: 2.3 }),
    Object.freeze({ phase: 1.31, speed: 0.71, orbitX: 0.28, orbitY: 0.41, frequency: 2.8 }),
    Object.freeze({ phase: 2.46, speed: 0.43, orbitX: 0.44, orbitY: 0.24, frequency: 3.4 }),
    Object.freeze({ phase: 3.72, speed: 0.89, orbitX: 0.33, orbitY: 0.36, frequency: 2.6 }),
    Object.freeze({ phase: 4.58, speed: 0.61, orbitX: 0.40, orbitY: 0.31, frequency: 3.1 }),
    Object.freeze({ phase: 5.44, speed: 0.79, orbitX: 0.25, orbitY: 0.43, frequency: 3.7 }),
    Object.freeze({ phase: 0.92, speed: 0.97, orbitX: 0.46, orbitY: 0.22, frequency: 2.9 }),
    Object.freeze({ phase: 2.93, speed: 0.37, orbitX: 0.31, orbitY: 0.39, frequency: 3.5 }),
  ]);

  function clamp(value, minimum, maximum, fallback) {
    const number = Number(value);
    const safeValue = Number.isFinite(number) ? number : fallback;
    return Math.min(maximum, Math.max(minimum, safeValue));
  }

  function normalizeParameter(name, value) {
    const limits = PARAMETER_LIMITS[name];

    if (!limits) {
      throw new Error(`Paramètre de plasma inconnu : ${name}`);
    }

    const normalized = clamp(value, limits.min, limits.max, limits.defaultValue);
    return limits.integer ? Math.round(normalized) : normalized;
  }

  function createState(initialParameters = {}) {
    const parameters = {};

    for (const name of Object.keys(PARAMETER_LIMITS)) {
      parameters[name] = normalizeParameter(name, initialParameters[name]);
    }

    return {
      time: 0,
      pointer: { x: 0.5, y: 0.5 },
      pointerTarget: { x: 0.5, y: 0.5 },
      parameters,
    };
  }

  function setParameter(state, name, value) {
    const normalized = normalizeParameter(name, value);
    state.parameters[name] = normalized;
    return normalized;
  }

  function setPointerTarget(state, normalizedX, normalizedY) {
    state.pointerTarget.x = clamp(normalizedX, 0, 1, 0.5);
    state.pointerTarget.y = clamp(normalizedY, 0, 1, 0.5);
    return state.pointerTarget;
  }

  function updateState(state, elapsedMilliseconds) {
    const elapsed = Math.max(0, Number(elapsedMilliseconds) || 0);
    state.time += elapsed / 1000 * state.parameters.speed;

    const smoothing = 1 - Math.exp(-elapsed / 90);
    state.pointer.x += (state.pointerTarget.x - state.pointer.x) * smoothing;
    state.pointer.y += (state.pointerTarget.y - state.pointer.y) * smoothing;
    return state;
  }

  function wrapHue(value) {
    return ((value % 360) + 360) % 360;
  }

  function writeHsbPixel(pixels, index, hue, saturation, brightness) {
    const normalizedHue = wrapHue(hue) / 60;
    const normalizedSaturation = clamp(saturation, 0, 100, 100) / 100;
    const normalizedBrightness = clamp(brightness, 0, 100, 100) / 100;
    const chroma = normalizedBrightness * normalizedSaturation;
    const intermediate = chroma * (1 - Math.abs(normalizedHue % 2 - 1));
    const sector = Math.floor(normalizedHue) % 6;
    let red = 0;
    let green = 0;
    let blue = 0;

    if (sector === 0) {
      red = chroma;
      green = intermediate;
    } else if (sector === 1) {
      red = intermediate;
      green = chroma;
    } else if (sector === 2) {
      green = chroma;
      blue = intermediate;
    } else if (sector === 3) {
      green = intermediate;
      blue = chroma;
    } else if (sector === 4) {
      red = intermediate;
      blue = chroma;
    } else {
      red = chroma;
      blue = intermediate;
    }

    const minimum = normalizedBrightness - chroma;
    pixels[index] = Math.round((red + minimum) * 255);
    pixels[index + 1] = Math.round((green + minimum) * 255);
    pixels[index + 2] = Math.round((blue + minimum) * 255);
    pixels[index + 3] = 255;
  }

  function hsbToRgb(hue, saturation, brightness) {
    const pixels = new Uint8ClampedArray(4);
    writeHsbPixel(pixels, 0, hue, saturation, brightness);
    return Array.from(pixels.slice(0, 3));
  }

  function sampleField(normalizedX, normalizedY, canvasWidth, canvasHeight, state, result) {
    const parameters = state.parameters;
    const pointerDeltaX = normalizedX - state.pointer.x;
    const pointerDeltaY = normalizedY - state.pointer.y;
    const pointerDistanceSquared = pointerDeltaX * pointerDeltaX + pointerDeltaY * pointerDeltaY;
    const pointerFalloff = Math.exp(-pointerDistanceSquared * 11);
    const pointerStrength = parameters.mouseInfluence * pointerFalloff;
    const horizontalWarp = Math.sin(state.pointer.y * FULL_CIRCLE + state.time * 1.7);
    const verticalWarp = Math.cos(state.pointer.x * FULL_CIRCLE - state.time * 1.3);
    const warpedX = normalizedX + horizontalWarp * pointerStrength * 0.075;
    const warpedY = normalizedY + verticalWarp * pointerStrength * 0.075;
    const pixelX = warpedX * canvasWidth;
    const pixelY = warpedY * canvasHeight;
    let field = 0;

    for (let index = 0; index < parameters.complexity; index += 1) {
      const component = COMPONENTS[index];
      const centerX = canvasWidth * (
        0.5 + component.orbitX * Math.sin(state.time * component.speed + component.phase)
      );
      const centerY = canvasHeight * (
        0.5 + component.orbitY * Math.cos(state.time * (component.speed + 0.17) - component.phase)
      );
      const deltaX = (pixelX - centerX) / parameters.blobSize;
      const deltaY = (pixelY - centerY) / parameters.blobSize;
      const radialDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const radialWave = Math.sin(
        radialDistance * component.frequency - state.time * (0.8 + component.speed) + component.phase
      );
      const diagonalWave = Math.sin(
        (warpedX * (index + 1.3) + warpedY * (parameters.complexity - index + 0.7)) * Math.PI +
        state.time * component.speed + component.phase
      );
      field += radialWave + diagonalWave * 0.35;
    }

    field /= parameters.complexity * 1.35;
    if (state.audio && state.audio.blend > 0.001) {
      field += state.audio.blend * (0.22 * Math.sin(state.audio.phase + pointerDistanceSquared * 18) + state.audio.beat * 0.12);
    }
    field += pointerStrength * Math.sin(
      Math.sqrt(pointerDistanceSquared) * 34 - state.time * 3 + state.pointer.x * FULL_CIRCLE
    ) * 0.45;

    result.field = field;
    result.pointerFalloff = pointerFalloff;
  }

  function renderPixels(pixels, renderWidth, renderHeight, canvasWidth, canvasHeight, state) {
    const expectedLength = renderWidth * renderHeight * 4;

    if (pixels.length < expectedLength) {
      throw new Error("Le tampon de pixels est trop petit pour le plasma.");
    }

    let pixelIndex = 0;
    const sample = { field: 0, pointerFalloff: 0 };

    for (let y = 0; y < renderHeight; y += 1) {
      const normalizedY = renderHeight === 1 ? 0.5 : y / (renderHeight - 1);

      for (let x = 0; x < renderWidth; x += 1) {
        const normalizedX = renderWidth === 1 ? 0.5 : x / (renderWidth - 1);
        sampleField(
          normalizedX,
          normalizedY,
          canvasWidth,
          canvasHeight,
          state,
          sample
        );
        const hue = state.parameters.hue +
          (state.audio ? state.audio.blend * 32 * Math.sin(state.audio.phase) : 0) +
          sample.field * 210 +
          state.time * 24 +
          state.pointer.x * state.parameters.mouseInfluence * sample.pointerFalloff * 100;
        const brightness = 67 + 25 * (
          0.5 + 0.5 * Math.sin(
            sample.field * Math.PI * 1.7 +
            state.pointer.y * state.parameters.mouseInfluence * sample.pointerFalloff * Math.PI
          )
        );

        writeHsbPixel(
          pixels,
          pixelIndex,
          hue,
          state.parameters.saturation,
          brightness
        );
        pixelIndex += 4;
      }
    }

    return pixels;
  }

  function calculateRenderSize(canvasWidth, canvasHeight, maximumSide = MAX_RENDER_SIDE) {
    const safeWidth = Math.max(1, Math.round(Number(canvasWidth) || 1));
    const safeHeight = Math.max(1, Math.round(Number(canvasHeight) || 1));
    const safeMaximum = Math.max(1, Math.round(Number(maximumSide) || MAX_RENDER_SIDE));
    const scale = Math.max(1, Math.max(safeWidth, safeHeight) / safeMaximum);

    return {
      width: Math.max(1, Math.round(safeWidth / scale)),
      height: Math.max(1, Math.round(safeHeight / scale)),
    };
  }

  function shouldRecreateSurface(surface, requiredWidth, requiredHeight) {
    return !surface || surface.width !== requiredWidth || surface.height !== requiredHeight;
  }

  return Object.freeze({
    COMPONENTS,
    MAX_RENDER_SIDE,
    PARAMETER_LIMITS,
    calculateRenderSize,
    createState,
    hsbToRgb,
    normalizeParameter,
    renderPixels,
    setParameter,
    setPointerTarget,
    shouldRecreateSurface,
    updateState,
    wrapHue,
  });
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = PsychedelicPlasma;
}
