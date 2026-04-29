const DEFAULT_CONIC_AREA_BLOCK_RATIO = 2;
const DEFAULT_DENSE_TRANSMISSION_THRESHOLD = 0.05;

export function transmissionThroughAlphaLayers(layerCount, layerAlpha) {
  validateNonNegativeFinite(layerCount, "layerCount");
  const count = Math.floor(layerCount);
  if (count === 0) return 1;
  return Math.pow(1 - clamp01(layerAlpha), count);
}

export function compensateAlphaForLayerDensity({ layerAlpha, layerCount, referenceLayerCount }) {
  validateNonNegativeFinite(layerCount, "layerCount");
  validateNonNegativeFinite(referenceLayerCount, "referenceLayerCount");
  if (layerCount === 0 || referenceLayerCount === 0) return 0;
  return compensateOpticalDepth(layerAlpha, referenceLayerCount / layerCount);
}

export function compensateAlphaForProjectedArea({ layerAlpha, projectedAreaRatio }) {
  validatePositiveFinite(projectedAreaRatio, "projectedAreaRatio");
  return compensateOpticalDepth(layerAlpha, 1 / projectedAreaRatio);
}

export function composePathologicalReflectionWitness({
  surfaceLayerCount,
  surfaceAlpha,
  behindLayer,
  surfaceColor = [0.42, 0.42, 0.44],
  clearColor = [0.02, 0.02, 0.04],
  projectedAreaRatio = 1,
  sortInversions = 0,
  hasHigherOrderSh = false,
  handednessAnchor = DEFAULT_HANDEDNESS_ANCHOR,
} = {}) {
  validateLayer(behindLayer, "behindLayer");
  validateColor(surfaceColor, "surfaceColor");
  validateColor(clearColor, "clearColor");

  const surfaceTransmission = transmissionThroughAlphaLayers(surfaceLayerCount, surfaceAlpha);
  const behindLayerWeight = clamp01(behindLayer.alpha) * surfaceTransmission;
  const clearWeight = (1 - clamp01(behindLayer.alpha)) * surfaceTransmission;
  const surfaceWeight = 1 - surfaceTransmission;

  return {
    surfaceLayerCount: Math.floor(surfaceLayerCount),
    surfaceAlpha: clamp01(surfaceAlpha),
    surfaceTransmission,
    behindLayerWeight,
    clearWeight,
    surfaceWeight,
    color: [
      behindLayer.color[0] * behindLayerWeight + surfaceColor[0] * surfaceWeight + clearColor[0] * clearWeight,
      behindLayer.color[1] * behindLayerWeight + surfaceColor[1] * surfaceWeight + clearColor[1] * clearWeight,
      behindLayer.color[2] * behindLayerWeight + surfaceColor[2] * surfaceWeight + clearColor[2] * clearWeight,
    ],
    classification: classifyAlphaDensityWitness({
      surfaceLayerCount,
      surfaceAlpha,
      projectedAreaRatio,
      sortInversions,
      hasHigherOrderSh,
      handednessAnchor,
    }),
  };
}

export function classifyAlphaDensityWitness({
  surfaceLayerCount,
  surfaceAlpha,
  projectedAreaRatio = 1,
  sortInversions = 0,
  hasHigherOrderSh = false,
  handednessAnchor = DEFAULT_HANDEDNESS_ANCHOR,
  conicAreaBlockRatio = DEFAULT_CONIC_AREA_BLOCK_RATIO,
  denseTransmissionThreshold = DEFAULT_DENSE_TRANSMISSION_THRESHOLD,
} = {}) {
  validateNonNegativeFinite(surfaceLayerCount, "surfaceLayerCount");
  validatePositiveFinite(projectedAreaRatio, "projectedAreaRatio");
  validateNonNegativeFinite(sortInversions, "sortInversions");

  const surfaceTransmission = transmissionThroughAlphaLayers(surfaceLayerCount, surfaceAlpha);
  const rejectedExplanations = classifyRejectedCoordinateExplanations(handednessAnchor);
  const blockedBy = [];
  if (projectedAreaRatio >= conicAreaBlockRatio) blockedBy.push("conic-footprint-area");
  if (sortInversions > 0) blockedBy.push("sort-limits");
  if (!hasHigherOrderSh) blockedBy.push("missing-sh");

  const hardBlockers = blockedBy.filter((blocker) => blocker !== "missing-sh");
  if (hardBlockers.length > 0) {
    return {
      primaryCause: hardBlockers.length === 2 ? "blocked-by-conic-and-sort" : `blocked-by-${hardBlockers[0]}`,
      policy: "do-not-tune-alpha",
      blockedBy,
      surfaceTransmission,
      coordinateStatus: classifyCoordinateStatus(handednessAnchor),
      rejectedExplanations,
    };
  }

  if (surfaceTransmission <= denseTransmissionThreshold) {
    return {
      primaryCause: "density-occlusion",
      policy: "bounded-density-compensation-witness-only",
      blockedBy,
      surfaceTransmission,
      coordinateStatus: classifyCoordinateStatus(handednessAnchor),
      rejectedExplanations,
    };
  }

  return {
    primaryCause: "alpha-density-not-dominant",
    policy: "preserve-current-alpha-contract",
    blockedBy,
    surfaceTransmission,
    coordinateStatus: classifyCoordinateStatus(handednessAnchor),
    rejectedExplanations,
  };
}

const DEFAULT_HANDEDNESS_ANCHOR = Object.freeze({
  sourceXyzPreserved: true,
  sourceWxyzQuaternionPreserved: true,
  horizontalMirror: false,
  presentationFlipY: true,
});

function compensateOpticalDepth(layerAlpha, exponent) {
  return 1 - Math.pow(1 - clamp01(layerAlpha), exponent);
}

function classifyCoordinateStatus(anchor) {
  if (
    anchor?.sourceXyzPreserved === true &&
    anchor?.sourceWxyzQuaternionPreserved === true &&
    anchor?.horizontalMirror === false &&
    anchor?.presentationFlipY === true
  ) {
    return "handedness-anchor-consumed";
  }
  return "coordinate-anchor-unsettled";
}

function classifyRejectedCoordinateExplanations(anchor) {
  const rejected = [];
  if (anchor?.horizontalMirror === false) rejected.push("horizontal-presentation-mirror");
  if (anchor?.sourceXyzPreserved === true) rejected.push("loader-position-flip");
  if (anchor?.sourceWxyzQuaternionPreserved === true) rejected.push("unpaired-loader-quaternion-change");
  return rejected;
}

function validateLayer(layer, name) {
  if (!layer || typeof layer !== "object") {
    throw new TypeError(`${name} must be an object`);
  }
  validateColor(layer.color, `${name}.color`);
  if (!Number.isFinite(layer.alpha)) {
    throw new TypeError(`${name}.alpha must be finite`);
  }
}

function validateColor(color, name) {
  if (!Array.isArray(color) || color.length !== 3) {
    throw new TypeError(`${name} must be an rgb array`);
  }
  for (const component of color) {
    if (!Number.isFinite(component)) {
      throw new TypeError(`${name} components must be finite`);
    }
  }
}

function validateNonNegativeFinite(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative finite number`);
  }
}

function validatePositiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive finite number`);
  }
}

function clamp01(value) {
  if (!Number.isFinite(value)) return value === Number.POSITIVE_INFINITY ? 1 : 0;
  return Math.min(Math.max(value, 0), 1);
}
