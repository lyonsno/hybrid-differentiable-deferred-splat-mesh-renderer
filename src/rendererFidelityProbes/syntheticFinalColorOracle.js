import { DEFAULT_CLEAR_COLOR, composeOrderedAlphaTransfer } from "./alphaTransfer.js";

const SCENE_IDS = Object.freeze({
  denseForegroundOcclusion: "dense-foreground-occlusion",
  rowBandDropout: "row-band-dropout",
});

const FAILURE_MODES = Object.freeze({
  reference: "reference",
  foregroundLeak: "foreground-leak",
  rowDropout: "row-dropout",
});

export function describeSyntheticFinalColorOracleContract() {
  return {
    consumes: [
      "final-color:ordered-alpha-transfer",
      "final-color:foreground-suppression-mask",
      "final-color:row-band-continuity",
    ],
    scenes: [SCENE_IDS.denseForegroundOcclusion, SCENE_IDS.rowBandDropout],
    assertions: [
      "foreground pixels stay dark while the hidden bright plate remains suppressed",
      "the middle band stays continuous instead of dropping rows",
      "alpha stays concrete rather than becoming a beauty-only score",
    ],
    doesNotClaim: [
      "real-scene-capture-harness",
      "Urmina-backend-construction",
      "production-visual-tuning",
    ],
  };
}

export function makeSyntheticFinalColorScenes() {
  return {
    denseForegroundOcclusion: createDenseForegroundOcclusionScene(),
    rowBandDropout: createRowBandDropoutScene(),
  };
}

export function renderSyntheticFinalColorScene(scene, options = {}) {
  const normalizedScene = normalizeScene(scene);
  const behavior = options.behavior ?? FAILURE_MODES.reference;
  validateBehavior(behavior);

  const pixels = new Map();
  for (const pixel of normalizedScene.pixels) {
    const layers = selectLayers(pixel, behavior);
    const transfer = composeOrderedAlphaTransfer(layers, {
      clearColor: pixel.clearColor ?? DEFAULT_CLEAR_COLOR,
    });
    pixels.set(pixel.id, {
      id: pixel.id,
      role: pixel.role,
      color: transfer.color,
      alpha: transfer.alpha,
      remainingTransmission: transfer.remainingTransmission,
      drawIds: transfer.drawIds,
      transferWeights: transfer.transferWeights,
    });
  }

  const metrics = summarizeSceneMetrics(normalizedScene, pixels);
  return {
    id: normalizedScene.id,
    label: normalizedScene.label,
    pixels,
    metrics,
  };
}

function createDenseForegroundOcclusionScene() {
  const brightPlate = {
    id: "plate-behind",
    depth: -10,
    color: [0.94, 0.86, 0.76],
    opacity: 1,
    coverageWeight: 1,
  };
  const occluder = {
    id: "dense-foreground",
    depth: -1,
    color: [0.082, 0.058, 0.046],
    opacity: 1,
    coverageWeight: 1,
  };

  return {
    id: SCENE_IDS.denseForegroundOcclusion,
    label: "dense foreground over bright plate with one explicit hole",
    pixels: [
      {
        id: "foreground-left",
        role: "foreground",
        layers: [brightPlate, occluder],
      },
      {
        id: "foreground-right",
        role: "foreground",
        layers: [brightPlate, occluder],
      },
      {
        id: "hole-center",
        role: "hole",
        layers: [brightPlate],
      },
    ],
  };
}

function createRowBandDropoutScene() {
  const brightRow = {
    id: "bright-row",
    depth: -10,
    color: [0.905, 0.82, 0.705],
    opacity: 1,
    coverageWeight: 1,
  };
  const darkBand = {
    id: "dark-band",
    depth: -1,
    color: [0.055, 0.04, 0.035],
    opacity: 1,
    coverageWeight: 1,
  };

  return {
    id: SCENE_IDS.rowBandDropout,
    label: "bright top and bottom rows with a continuous dark middle band",
    pixels: [
      {
        id: "row-top",
        role: "row",
        rowIndex: 0,
        layers: [brightRow],
      },
      {
        id: "row-middle",
        role: "band",
        rowIndex: 1,
        layers: [brightRow, darkBand],
      },
      {
        id: "row-bottom",
        role: "row",
        rowIndex: 2,
        layers: [brightRow],
      },
    ],
  };
}

function summarizeSceneMetrics(scene, pixels) {
  const pixelEntries = [...pixels.values()];
  const hole = pixels.get("hole-center") ?? null;
  const foregroundPixels = pixelEntries.filter((pixel) => pixel.role === "foreground");
  const rowPixels = pixelEntries.filter((pixel) => pixel.role === "row" || pixel.role === "band");
  const foregroundSuppressionRatio = hole && foregroundPixels.length > 0
    ? averageBrightness(foregroundPixels.map((pixel) => pixel.color)) / Math.max(brightness(hole.color), 1e-9)
    : 0;
  const brightLeakPixelIds = foregroundPixels
    .filter((pixel) => brightness(pixel.color) > 0.5 * brightness(hole?.color ?? [0, 0, 0]))
    .map((pixel) => pixel.id);
  const bandMask = scene.id === SCENE_IDS.rowBandDropout
    ? rowPixels.map((pixel) => pixel.id === "row-middle")
    : [];
  const bandContrastRatio = scene.id === SCENE_IDS.rowBandDropout && rowPixels.length === 3
    ? brightness(pixels.get("row-middle").color) / Math.max(
      (brightness(pixels.get("row-top").color) + brightness(pixels.get("row-bottom").color)) / 2,
      1e-9,
    )
    : 0;

  return {
    foregroundSuppressionRatio,
    brightLeakPixelIds,
    bandMask,
    bandContrastRatio,
  };
}

function selectLayers(pixel, behavior) {
  if (behavior === FAILURE_MODES.reference) {
    return pixel.layers;
  }
  if (behavior === FAILURE_MODES.foregroundLeak) {
    if (pixel.role === "foreground") {
      return pixel.layers.filter((layer) => layer.id !== "dense-foreground");
    }
    return pixel.layers;
  }
  if (behavior === FAILURE_MODES.rowDropout) {
    if (pixel.id === "row-middle") {
      return pixel.layers.filter((layer) => layer.id !== "dark-band");
    }
    return pixel.layers;
  }
  return pixel.layers;
}

function normalizeScene(scene) {
  if (!scene || typeof scene !== "object") {
    throw new TypeError("scene must be an object");
  }
  if (typeof scene.id !== "string" || scene.id.length === 0) {
    throw new TypeError("scene.id must be a non-empty string");
  }
  if (!Array.isArray(scene.pixels) || scene.pixels.length === 0) {
    throw new TypeError("scene.pixels must be a non-empty array");
  }
  return {
    id: scene.id,
    label: typeof scene.label === "string" ? scene.label : scene.id,
    pixels: scene.pixels.map(normalizePixel),
  };
}

function normalizePixel(pixel, index) {
  if (!pixel || typeof pixel !== "object") {
    throw new TypeError(`pixel ${index} must be an object`);
  }
  if (typeof pixel.id !== "string" || pixel.id.length === 0) {
    throw new TypeError(`pixel ${index} id must be a non-empty string`);
  }
  const role = typeof pixel.role === "string" ? pixel.role : "unclassified";
  if (!Array.isArray(pixel.layers) || pixel.layers.length === 0) {
    throw new TypeError(`pixel ${pixel.id} layers must be a non-empty array`);
  }
  return {
    id: pixel.id,
    role,
    rowIndex: Number.isInteger(pixel.rowIndex) ? pixel.rowIndex : null,
    clearColor: Array.isArray(pixel.clearColor) ? [...pixel.clearColor] : DEFAULT_CLEAR_COLOR,
    layers: pixel.layers.map(normalizeLayer),
  };
}

function normalizeLayer(layer, index) {
  if (!layer || typeof layer !== "object") {
    throw new TypeError(`layer ${index} must be an object`);
  }
  if (typeof layer.id !== "string" || layer.id.length === 0) {
    throw new TypeError(`layer ${index} id must be a non-empty string`);
  }
  validateFiniteNumber(layer.depth, `layer ${layer.id} depth`);
  validateColor(layer.color, `layer ${layer.id} color`);
  validateUnitInterval(layer.opacity, `layer ${layer.id} opacity`);
  validateNonNegativeFinite(layer.coverageWeight, `layer ${layer.id} coverageWeight`);
  return {
    id: layer.id,
    depth: layer.depth,
    color: [...layer.color],
    opacity: layer.opacity,
    coverageWeight: layer.coverageWeight,
  };
}

function validateBehavior(behavior) {
  if (!Object.values(FAILURE_MODES).includes(behavior)) {
    throw new RangeError(`behavior must be one of ${Object.values(FAILURE_MODES).join(", ")}`);
  }
}

function validateColor(color, label) {
  if (!Array.isArray(color) || color.length !== 3 || !color.every(Number.isFinite)) {
    throw new TypeError(`${label} must be a finite rgb array`);
  }
}

function validateFiniteNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`);
  }
}

function validateNonNegativeFinite(value, label) {
  validateFiniteNumber(value, label);
  if (value < 0) {
    throw new RangeError(`${label} must be non-negative`);
  }
}

function validateUnitInterval(value, label) {
  validateFiniteNumber(value, label);
  if (value < 0 || value > 1) {
    throw new RangeError(`${label} must be in [0, 1]`);
  }
}

function brightness(color) {
  return (color[0] + color[1] + color[2]) / 3;
}

function averageBrightness(colors) {
  if (colors.length === 0) {
    return 0;
  }
  return colors.reduce((sum, color) => sum + brightness(color), 0) / colors.length;
}
