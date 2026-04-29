export const TILE_ORDERING_REQUIRED_SHAPE = "per-tile-radix-lists";
export const TILE_ORDERING_CONSUMER = "tile-local-compositor";

export function describeTileOrderingContract() {
  return {
    nextShape: TILE_ORDERING_REQUIRED_SHAPE,
    compositorConsumes: "tile-local-back-to-front-contributions",
    globalRadixRole: "staging-or-diagnostic-only",
    bucketRole: "bounded-approximation-only",
    mustCarry: ["tileId", "splatId", "viewDepth", "stableTieId"],
    consumedSiblingContracts: ["tile-coverage-builder:data-shape", "alpha-transfer:source-over-policy"],
    forbiddenClaims: ["coverage-truth", "alpha-transfer-policy", "live-renderer-integration"],
  };
}

export function createGlobalRadixStagingOrder(contributions, options = {}) {
  const normalized = normalizeContributions(contributions, options);
  return normalized.sort(compareContributions);
}

export function buildPerTileOrdering(contributions, options = {}) {
  const normalized = normalizeContributions(contributions, options);
  const tileIds = [...new Set(normalized.map((entry) => entry.tileId))].sort((a, b) => a - b);
  const tiles = new Map();

  for (const tileId of tileIds) {
    const entries = normalized
      .filter((entry) => entry.tileId === tileId)
      .sort(compareContributions)
      .map((entry) => ({
        ...entry,
        orderKey: {
          quantizedDepth: entry.quantizedDepth,
          splatId: entry.splatId,
          tileId: entry.tileId,
        },
      }));

    tiles.set(tileId, {
      tileId,
      entries,
      drawSplatIds: entries.map((entry) => entry.splatId),
    });
  }

  return {
    requiredShape: TILE_ORDERING_REQUIRED_SHAPE,
    consumedBy: TILE_ORDERING_CONSUMER,
    tileIds,
    tiles,
  };
}

export function classifyBucketApproximation({
  bucketWidth,
  crossingDepthSeparation,
  maxAlpha,
}) {
  validateNonNegativeFinite(bucketWidth, "bucketWidth");
  validatePositiveFinite(crossingDepthSeparation, "crossingDepthSeparation");
  validateUnitInterval(maxAlpha, "maxAlpha");

  const visibleCrossingTolerance = crossingDepthSeparation * maxAlpha;
  const acceptable = bucketWidth <= visibleCrossingTolerance;

  return {
    classification: acceptable ? "bounded-approximation" : "ordering-blocker",
    acceptable,
    reason: acceptable
      ? "bucket-width-below-visible-crossing-tolerance"
      : "bucket-can-hide-alpha-visible-crossing",
    maxOrderError: bucketWidth,
  };
}

function normalizeContributions(contributions, { depthPrecision = 1e-6 } = {}) {
  if (!Array.isArray(contributions)) {
    throw new TypeError("tile ordering contributions must be an array");
  }
  validatePositiveFinite(depthPrecision, "depthPrecision");

  return contributions.map((contribution, index) => normalizeContribution(contribution, index, depthPrecision));
}

function normalizeContribution(contribution, index, depthPrecision) {
  if (!contribution || typeof contribution !== "object") {
    throw new TypeError(`tile ordering contribution ${index} must be an object`);
  }

  validateNonNegativeInteger(contribution.tileId, `contribution ${index} tileId`);
  validateNonNegativeInteger(contribution.splatId, `contribution ${index} splatId`);
  validateFinite(contribution.depth, `contribution ${index} depth`);
  if ("coverageWeight" in contribution) {
    validateNonNegativeFinite(contribution.coverageWeight, `contribution ${index} coverageWeight`);
  }

  const quantizedDepth = quantizeDepth(contribution.depth, depthPrecision);
  return {
    tileId: contribution.tileId,
    splatId: contribution.splatId,
    depth: contribution.depth,
    quantizedDepth,
    coverageWeight: contribution.coverageWeight,
  };
}

function compareContributions(left, right) {
  return (
    left.quantizedDepth - right.quantizedDepth ||
    left.splatId - right.splatId ||
    left.tileId - right.tileId
  );
}

function quantizeDepth(depth, precision) {
  return Math.round(depth / precision) * precision;
}

function validateFinite(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`);
  }
}

function validatePositiveFinite(value, label) {
  validateFinite(value, label);
  if (value <= 0) {
    throw new RangeError(`${label} must be positive`);
  }
}

function validateNonNegativeFinite(value, label) {
  validateFinite(value, label);
  if (value < 0) {
    throw new RangeError(`${label} must be non-negative`);
  }
}

function validateUnitInterval(value, label) {
  validateFinite(value, label);
  if (value < 0 || value > 1) {
    throw new RangeError(`${label} must be in [0, 1]`);
  }
}

function validateNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
}
