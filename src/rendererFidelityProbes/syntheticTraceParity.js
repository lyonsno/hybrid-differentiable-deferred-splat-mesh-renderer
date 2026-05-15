import { DEFAULT_CLEAR_COLOR, composeOrderedAlphaTransfer } from "./alphaTransfer.js";

const TRACE_SCHEMA = "projected-retained-ordered-final-accumulation";

const SCENE_IDS = Object.freeze({
  denseForegroundOcclusion: "dense-foreground-occlusion",
  rowBandDropout: "row-band-dropout",
});

const BEHAVIORS = Object.freeze({
  reference: "reference",
  dropProjected: "dropProjected",
  dropRetained: "dropRetained",
  dropOrdered: "dropOrdered",
  dropAccumulation: "dropAccumulation",
});

export function describeSyntheticTraceParityContract() {
  return {
    consumes: [
      `trace-schema:${TRACE_SCHEMA}`,
      "final-color:ordered-alpha-transfer",
      "final-color:foreground-suppression-mask",
      "final-color:row-band-continuity",
    ],
    scenes: [
      "dense-foreground-occlusion",
      "row-band-dropout",
    ],
    assertions: [
      "projected, retained, ordered, and final-color accumulation evidence are all present on the same trace record",
      "the dense foreground scene still suppresses the bright plate in both pixels that remain covered",
      "the middle row band stays continuous instead of turning into a trace that only explains the pretty pixels",
    ],
    doesNotClaim: [
      "real-scene-capture-harness",
      "Urmina-backend-construction",
      "production-visual-tuning",
    ],
  };
}

export function makeSyntheticTraceParityScenes() {
  return {
    denseForegroundOcclusion: createDenseForegroundOcclusionScene(),
    rowBandDropout: createRowBandDropoutScene(),
  };
}

export function renderSyntheticTraceParityScene(scene, options = {}) {
  const normalizedScene = normalizeScene(scene);
  const behavior = options.behavior ?? BEHAVIORS.reference;
  validateBehavior(behavior);

  const pixels = new Map();
  for (const pixel of normalizedScene.pixels) {
    const projectedLayers = selectLayers(pixel, behavior).map((layer, projectedIndex) => createContributor(layer, projectedIndex));
    const retainedLayers = projectedLayers.map((layer, retainedIndex) => ({
      ...layer,
      retainedIndex,
    }));
    const orderedLayers = [...retainedLayers].sort(compareTraceLayers);
    const finalColorAccumulation = composeOrderedAlphaTransfer(
      orderedLayers.map((layer) => ({
        id: layer.id,
        color: layer.color,
        depth: layer.depth,
        opacity: layer.opacity,
        coverageWeight: layer.coverageWeight,
      })),
      { clearColor: pixel.clearColor ?? DEFAULT_CLEAR_COLOR },
    );
    const trace = {
      schema: TRACE_SCHEMA,
      projectedContributors: behavior === BEHAVIORS.dropProjected ? null : projectedLayers,
      retainedContributors: behavior === BEHAVIORS.dropRetained ? null : retainedLayers,
      orderedContributors: behavior === BEHAVIORS.dropOrdered ? null : orderedLayers,
      finalColorAccumulation: behavior === BEHAVIORS.dropAccumulation
        ? null
        : {
            ...finalColorAccumulation,
            clearColor: pixel.clearColor ?? DEFAULT_CLEAR_COLOR,
          },
    };

    pixels.set(pixel.id, {
      id: pixel.id,
      role: pixel.role,
      color: finalColorAccumulation.color,
      alpha: finalColorAccumulation.alpha,
      remainingTransmission: finalColorAccumulation.remainingTransmission,
      drawIds: finalColorAccumulation.drawIds,
      transferWeights: finalColorAccumulation.transferWeights,
      trace,
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

export function validateSyntheticTraceParityScene(result) {
  const issues = [];

  if (!result || typeof result !== "object") {
    throw new TypeError("synthetic trace parity result must be an object");
  }
  if (!(result.pixels instanceof Map)) {
    throw new TypeError("synthetic trace parity result.pixels must be a Map");
  }

  for (const [pixelId, pixel] of result.pixels.entries()) {
    const trace = pixel?.trace;
    if (!trace || typeof trace !== "object") {
      issues.push(`${pixelId}: trace is missing`);
      continue;
    }
    if (trace.schema !== TRACE_SCHEMA) {
      issues.push(`${pixelId}: trace.schema must be ${TRACE_SCHEMA}`);
    }

    assertTraceArray(issues, pixelId, "projectedContributors", trace.projectedContributors);
    assertTraceArray(issues, pixelId, "retainedContributors", trace.retainedContributors);
    assertTraceArray(issues, pixelId, "orderedContributors", trace.orderedContributors);
    assertFinalAccumulation(issues, pixelId, pixel, trace.finalColorAccumulation);
  }

  if (issues.length > 0) {
    throw new Error(`Synthetic trace parity validation failed: ${issues.join("; ")}`);
  }

  return issues;
}

function selectLayers(pixel, behavior) {
  if (behavior === BEHAVIORS.reference) {
    return pixel.layers;
  }
  if (behavior === BEHAVIORS.dropProjected) {
    return pixel.layers;
  }
  if (behavior === BEHAVIORS.dropRetained) {
    return pixel.layers;
  }
  if (behavior === BEHAVIORS.dropOrdered) {
    return pixel.layers;
  }
  if (behavior === BEHAVIORS.dropAccumulation) {
    return pixel.layers;
  }
  return pixel.layers;
}

function createContributor(layer, projectedIndex) {
  return {
    id: layer.id,
    projectedIndex,
    retainedIndex: projectedIndex,
    orderIndex: projectedIndex,
    depth: layer.depth,
    color: [...layer.color],
    opacity: layer.opacity,
    coverageWeight: layer.coverageWeight,
    coverageAlpha: layer.opacity === 0
      ? 0
      : layer.opacity === 1
        ? 1
        : 1 - Math.pow(1 - layer.opacity, layer.coverageWeight),
  };
}

function compareTraceLayers(left, right) {
  return left.depth - right.depth || left.id.localeCompare(right.id);
}

function summarizeSceneMetrics(scene, pixels) {
  const pixelEntries = [...pixels.values()];
  const foregroundPixels = pixelEntries.filter((pixel) => pixel.role === "foreground");
  const rowPixels = pixelEntries.filter((pixel) => pixel.role === "row" || pixel.role === "band");
  const hole = pixels.get("hole-center") ?? null;
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
  if (!Object.values(BEHAVIORS).includes(behavior)) {
    throw new RangeError(`behavior must be one of ${Object.values(BEHAVIORS).join(", ")}`);
  }
}

function assertTraceArray(issues, pixelId, fieldName, value) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${pixelId}: trace.${fieldName} is missing`);
  }
}

function assertFinalAccumulation(issues, pixelId, pixel, value) {
  if (!value || typeof value !== "object") {
    issues.push(`${pixelId}: trace.finalColorAccumulation is missing`);
    return;
  }
  if (!Array.isArray(value.color) || value.color.length !== 3) {
    issues.push(`${pixelId}: trace.finalColorAccumulation.color is missing`);
  }
  if (!Array.isArray(value.drawIds) || value.drawIds.length === 0) {
    issues.push(`${pixelId}: trace.finalColorAccumulation.drawIds is missing`);
  }
  if (!Number.isFinite(value.alpha)) {
    issues.push(`${pixelId}: trace.finalColorAccumulation.alpha is missing`);
  }
  if (!Number.isFinite(value.remainingTransmission)) {
    issues.push(`${pixelId}: trace.finalColorAccumulation.remainingTransmission is missing`);
  }
  if (Array.isArray(value.color)) {
    assertColorClose(value.color, pixel.color, 5e-3, `${pixelId}: trace.finalColorAccumulation.color`);
  }
  if (Number.isFinite(value.alpha)) {
    assertClose(value.alpha, pixel.alpha, 5e-3, `${pixelId}: trace.finalColorAccumulation.alpha`);
  }
  if (Array.isArray(value.drawIds)) {
    if (!sameArray(value.drawIds, pixel.drawIds)) {
      throw new Error(`${pixelId}: trace.finalColorAccumulation.drawIds does not explain the rendered draw order`);
    }
  }
}

function assertClose(actual, expected, tolerance, label) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertColorClose(actual, expected, tolerance, label) {
  if (actual.length !== expected.length) {
    throw new Error(`${label}: channel count mismatch`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    assertClose(actual[index], expected[index], tolerance, `${label} channel ${index}`);
  }
}

function sameArray(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
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

function validateColor(color, label) {
  if (!Array.isArray(color) || color.length !== 3 || !color.every(Number.isFinite)) {
    throw new TypeError(`${label} must be a finite rgb array`);
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
