export const DEFAULT_CLEAR_COLOR = Object.freeze([0.02, 0.02, 0.04]);
export const DEFAULT_CLEAR_ALPHA = 1;

export function clamp01(value) {
  if (!Number.isFinite(value)) {
    return value === Number.POSITIVE_INFINITY ? 1 : 0;
  }
  return Math.min(Math.max(value, 0), 1);
}

export function gaussianCoverageAlpha(opacity, radiusSquared) {
  const baseOpacity = clamp01(opacity);
  if (!Number.isFinite(radiusSquared)) {
    return radiusSquared === Number.POSITIVE_INFINITY ? 0 : baseOpacity;
  }
  return baseOpacity * Math.exp(-2 * Math.max(radiusSquared, 0));
}

export function sourceOverStraightAlpha(source, destination) {
  validateLayer(source);
  validateLayer(destination);
  const sourceAlpha = clamp01(source.alpha);
  const destinationAlpha = clamp01(destination.alpha);
  const inverseSourceAlpha = 1 - sourceAlpha;

  return {
    color: [
      source.color[0] * sourceAlpha + destination.color[0] * inverseSourceAlpha,
      source.color[1] * sourceAlpha + destination.color[1] * inverseSourceAlpha,
      source.color[2] * sourceAlpha + destination.color[2] * inverseSourceAlpha,
    ],
    alpha: sourceAlpha + destinationAlpha * inverseSourceAlpha,
  };
}

export function classifySplatOrder(layers) {
  const sorted = [...layers].sort((a, b) => a.depth - b.depth || a.id - b.id);
  return {
    drawIds: sorted.map((layer) => layer.id),
    sortedLayers: sorted,
  };
}

export function composeStraightAlphaBackToFront(
  layers,
  clearColor = DEFAULT_CLEAR_COLOR,
  clearAlpha = DEFAULT_CLEAR_ALPHA
) {
  validateColor(clearColor);
  const { sortedLayers } = classifySplatOrder(layers);
  let accumulator = { color: [...clearColor], alpha: clamp01(clearAlpha) };

  for (const layer of sortedLayers) {
    accumulator = sourceOverStraightAlpha(layer, accumulator);
  }

  return {
    ...accumulator,
    drawIds: sortedLayers.map((layer) => layer.id),
    transferWeights: computeTransferWeights(sortedLayers),
  };
}

function computeTransferWeights(sortedLayers) {
  const weights = [];
  let remaining = 1;
  for (let index = sortedLayers.length - 1; index >= 0; index -= 1) {
    const layer = sortedLayers[index];
    const alpha = clamp01(layer.alpha);
    weights.unshift({ id: layer.id, weight: alpha * remaining });
    remaining *= 1 - alpha;
  }
  weights.push({ id: "clear", weight: remaining });
  return weights;
}

function validateLayer(layer) {
  if (!layer || typeof layer !== "object") {
    throw new TypeError("alpha layer must be an object");
  }
  validateColor(layer.color);
  if (!Number.isFinite(layer.alpha)) {
    throw new TypeError("alpha layer alpha must be finite");
  }
}

function validateColor(color) {
  if (!Array.isArray(color) || color.length !== 3) {
    throw new TypeError("alpha layer color must be an rgb array");
  }
  for (const component of color) {
    if (!Number.isFinite(component)) {
      throw new TypeError("alpha layer color components must be finite");
    }
  }
}
