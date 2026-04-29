export const DEFAULT_CLEAR_COLOR = Object.freeze([0.02, 0.02, 0.04]);

export function alphaFromCoverageOpacity(opacity, coverageWeight) {
  validateNonNegativeFinite(coverageWeight, "coverageWeight");
  const sourceOpacity = clamp01(opacity);
  if (coverageWeight === 0 || sourceOpacity === 0) return 0;
  if (sourceOpacity === 1) return 1;
  return 1 - Math.pow(1 - sourceOpacity, coverageWeight);
}

export function composeOrderedAlphaTransfer(contributions, {
  clearColor = DEFAULT_CLEAR_COLOR,
  normalizedForTransfer = false,
} = {}) {
  if (!Array.isArray(contributions)) {
    throw new TypeError("alpha transfer contributions must be an array");
  }
  validateColor(clearColor, "clearColor");

  const layers = contributions.map((contribution) => {
    validateContribution(contribution);
    return {
      ...contribution,
      coverageAlpha: alphaFromCoverageOpacity(contribution.opacity, contribution.coverageWeight),
    };
  });
  const transferWeights = computeTransferWeights(layers);
  const remainingTransmission = transferWeights.at(-1).weight;
  const color = [
    clearColor[0] * remainingTransmission,
    clearColor[1] * remainingTransmission,
    clearColor[2] * remainingTransmission,
  ];

  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers[index];
    const weight = transferWeights[index].weight;
    color[0] += layer.color[0] * weight;
    color[1] += layer.color[1] * weight;
    color[2] += layer.color[2] * weight;
  }

  return {
    color,
    alpha: 1 - remainingTransmission,
    remainingTransmission,
    drawIds: layers.map((layer) => layer.id),
    coverageAlphas: layers.map((layer) => ({
      id: layer.id,
      coverageAlpha: layer.coverageAlpha,
    })),
    transferWeights,
    normalization: classifyAlphaTransferNormalization({
      coverageWeights: layers.map((layer) => layer.coverageWeight),
      normalizedForTransfer,
    }),
  };
}

export function classifyAlphaTransferNormalization({ coverageWeights, normalizedForTransfer = false } = {}) {
  if (!Array.isArray(coverageWeights)) {
    throw new TypeError("coverageWeights must be an array");
  }
  let totalCoverageWeight = 0;
  for (const coverageWeight of coverageWeights) {
    validateNonNegativeFinite(coverageWeight, "coverageWeight");
    totalCoverageWeight += coverageWeight;
  }
  return {
    policy: normalizedForTransfer
      ? "diagnostic-only-normalized-coverage"
      : "coverage-is-optical-depth-do-not-normalize",
    totalCoverageWeight,
    normalizedForTransfer,
  };
}

function computeTransferWeights(layers) {
  const weights = new Array(layers.length);
  let nearerTransmission = 1;
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    const transmission = 1 - layer.coverageAlpha;
    weights[index] = {
      id: layer.id,
      weight: layer.coverageAlpha * nearerTransmission,
      coverageWeight: layer.coverageWeight,
      coverageAlpha: layer.coverageAlpha,
    };
    nearerTransmission *= transmission;
  }
  weights.push({ id: "clear", weight: nearerTransmission });
  return weights;
}

function validateContribution(contribution) {
  if (!contribution || typeof contribution !== "object") {
    throw new TypeError("alpha transfer contribution must be an object");
  }
  if (!("id" in contribution)) {
    throw new TypeError("alpha transfer contribution id is required");
  }
  validateColor(contribution.color, "contribution.color");
  if (!Number.isFinite(contribution.depth)) {
    throw new TypeError("contribution.depth must be finite");
  }
  if (!Number.isFinite(contribution.opacity)) {
    throw new TypeError("contribution.opacity must be finite");
  }
  validateNonNegativeFinite(contribution.coverageWeight, "contribution.coverageWeight");
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

function clamp01(value) {
  if (!Number.isFinite(value)) return value === Number.POSITIVE_INFINITY ? 1 : 0;
  return Math.min(Math.max(value, 0), 1);
}
