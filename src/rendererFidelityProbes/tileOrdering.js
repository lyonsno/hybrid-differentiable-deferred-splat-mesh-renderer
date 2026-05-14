export const TILE_ORDERING_REQUIRED_SHAPE = "per-tile-radix-lists";
export const TILE_ORDERING_CONSUMER = "tile-local-compositor";
export const BAND_DROPOUT_DIAGNOSTIC_FIELDS = [
  "pixelId",
  "pixel",
  "crop",
  "tileAddress",
  "effectiveArenaBackend",
  "orderingBackend",
  "freshnessStatus",
  "frameProjectedRefs",
  "frameRetainedRefs",
  "frameDroppedRefs",
  "visibleCompositedRefLimit",
  "tileLocal.perPixelProjectedContributors",
  "tileLocal.perPixelRetainedContributors",
  "tileLocal.perPixelOrderedContributors",
  "tileLocal.perPixelFinalColorAccumulation",
];

export const REAL_SCENE_BLACK_BAND_DROPOUT_ANCHOR = {
  pixelId: "black-band-dropout-2300-1055",
  pixel: { x: 2300, y: 1055 },
  crop: { x: 2232, y: 1024, w: 160, h: 48 },
  finalRgb: [5, 5, 10],
  plateRgb: [80, 43, 28],
  frame: {
    viewportWidth: 3456,
    viewportHeight: 1804,
    tileSizePx: 16,
    tileGridColumns: 216,
    tileGridRows: 113,
    effectiveArenaBackend: "gpu",
    orderingBackend: "gpu-sorted-index-rank-inversion",
    freshnessStatus: "unknown",
    frameProjectedRefs: 2360150,
    frameRetainedRefs: 2360150,
    frameDroppedRefs: 0,
    visibleCompositedRefLimit: 256,
  },
};

export function describeTileOrderingContract() {
  return {
    nextShape: TILE_ORDERING_REQUIRED_SHAPE,
    compositorConsumes: "tile-local-back-to-front-contributions",
    globalStagingRole: "staging-or-diagnostic-only",
    bucketRole: "bounded-approximation-only",
    mustCarry: ["tileId", "splatId", "viewDepth", "stableTieId"],
    bandDropoutDiagnostics: BAND_DROPOUT_DIAGNOSTIC_FIELDS,
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
    const orderedRefs = normalized
      .filter((entry) => entry.tileId === tileId)
      .sort(compareContributions)
      .map((entry) => ({
        ...entry,
        viewDepth: entry.depth,
        orderKey: {
          quantizedDepth: entry.quantizedDepth,
          stableTieId: entry.stableTieId,
          tileId: entry.tileId,
        },
      }));

    tiles.set(tileId, {
      tileId,
      orderedRefs,
      entries: orderedRefs,
      drawSplatIds: orderedRefs.map((entry) => entry.splatId),
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

export function classifyBandDropoutMechanism(evidence) {
  const normalized = normalizeBandDropoutEvidence(evidence);
  const missingDiagnostics = missingBandDropoutDiagnostics(normalized);
  const tileAddress = pixelTileAddress(normalized.pixel, normalized.frame);
  const cropTileSpan = cropTileSpanFor(normalized.crop, normalized.frame);
  const context = bandDropoutContext(normalized.frame);
  const orderEvidence = summarizeOrderEvidence(normalized.perPixelOrderedContributors);

  if (missingDiagnostics.length > 0) {
    return bandDropoutSummary(normalized, {
      classification: "underdetermined",
      canClaimRealSceneCause: false,
      blockedMechanisms: ["order/rank", "dispatch/cache", "compositor-policy", "source-sparsity"],
      missingDiagnostics,
      tileAddress,
      cropTileSpan,
      context,
      orderEvidence,
      reason: "missing-per-pixel-band-contributor-order-and-accumulation-ledger",
    });
  }

  if (normalized.frame.freshnessStatus === "stale-cache" || normalized.frame.dispatchComplete === false) {
    return bandDropoutSummary(normalized, {
      classification: "dispatch/cache",
      canClaimRealSceneCause: true,
      blockedMechanisms: [],
      missingDiagnostics: [],
      tileAddress,
      cropTileSpan,
      context,
      orderEvidence,
      reason: "stale-or-incomplete-dispatch-at-band-pixel",
    });
  }

  if (normalized.perPixelProjectedContributors.length === 0) {
    return bandDropoutSummary(normalized, {
      classification: "source-sparsity",
      canClaimRealSceneCause: true,
      blockedMechanisms: [],
      missingDiagnostics: [],
      tileAddress,
      cropTileSpan,
      context,
      orderEvidence,
      reason: "no-projected-contributors-at-band-pixel",
    });
  }

  if (orderEvidence.inversionPairs.length > 0) {
    return bandDropoutSummary(normalized, {
      classification: "order/rank",
      canClaimRealSceneCause: true,
      blockedMechanisms: [],
      missingDiagnostics: [],
      tileAddress,
      cropTileSpan,
      context,
      orderEvidence,
      reason: "per-pixel-ordered-contributor-ranks-invert",
    });
  }

  if (normalized.perPixelFinalColorAccumulation.length === 0) {
    return bandDropoutSummary(normalized, {
      classification: "compositor-policy",
      canClaimRealSceneCause: true,
      blockedMechanisms: [],
      missingDiagnostics: [],
      tileAddress,
      cropTileSpan,
      context,
      orderEvidence,
      reason: "retained-and-ordered-contributors-do-not-enter-final-color-accumulation",
    });
  }

  return bandDropoutSummary(normalized, {
    classification: "underdetermined",
    canClaimRealSceneCause: false,
    blockedMechanisms: ["order/rank", "dispatch/cache", "compositor-policy", "source-sparsity"],
    missingDiagnostics: [],
    tileAddress,
    cropTileSpan,
    context,
    orderEvidence,
    reason: "available-per-pixel-band-fields-do-not-select-a-mechanism",
  });
}

export function pixelTileAddress(pixel, frame) {
  const normalizedFrame = normalizeFrameContext(frame);
  validatePixel(pixel, "pixel");
  const tileSizePx = normalizedFrame.tileSizePx;
  const tileX = clampInteger(Math.floor(pixel.x / tileSizePx), 0, normalizedFrame.tileGridColumns - 1);
  const tileY = clampInteger(Math.floor(pixel.y / tileSizePx), 0, normalizedFrame.tileGridRows - 1);
  return {
    tileX,
    tileY,
    tileIndex: tileY * normalizedFrame.tileGridColumns + tileX,
    localX: pixel.x - tileX * tileSizePx,
    localY: pixel.y - tileY * tileSizePx,
  };
}

export function cropTileSpanFor(crop, frame) {
  const normalizedFrame = normalizeFrameContext(frame);
  validateCrop(crop);
  const tileSizePx = normalizedFrame.tileSizePx;
  return {
    minTileX: clampInteger(Math.floor(crop.x / tileSizePx), 0, normalizedFrame.tileGridColumns - 1),
    maxTileX: clampInteger(Math.floor((crop.x + crop.w - 1) / tileSizePx), 0, normalizedFrame.tileGridColumns - 1),
    minTileY: clampInteger(Math.floor(crop.y / tileSizePx), 0, normalizedFrame.tileGridRows - 1),
    maxTileY: clampInteger(Math.floor((crop.y + crop.h - 1) / tileSizePx), 0, normalizedFrame.tileGridRows - 1),
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
  const stableTieId = "stableTieId" in contribution ? contribution.stableTieId : contribution.splatId;
  validateNonNegativeInteger(stableTieId, `contribution ${index} stableTieId`);
  if ("coverageWeight" in contribution) {
    validateNonNegativeFinite(contribution.coverageWeight, `contribution ${index} coverageWeight`);
  }

  const quantizedDepth = quantizeDepth(contribution.depth, depthPrecision);
  return {
    tileId: contribution.tileId,
    splatId: contribution.splatId,
    stableTieId,
    depth: contribution.depth,
    viewDepth: contribution.depth,
    quantizedDepth,
    coverageWeight: contribution.coverageWeight,
  };
}

function compareContributions(left, right) {
  return (
    left.quantizedDepth - right.quantizedDepth ||
    left.stableTieId - right.stableTieId ||
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

function normalizeBandDropoutEvidence(evidence) {
  if (!evidence || typeof evidence !== "object") {
    throw new TypeError("band dropout evidence must be an object");
  }
  if (typeof evidence.pixelId !== "string" || evidence.pixelId.length === 0) {
    throw new TypeError("band dropout evidence pixelId is required");
  }
  validatePixel(evidence.pixel, "pixel");
  validateCrop(evidence.crop);
  const frame = normalizeFrameContext(evidence.frame);
  return {
    ...evidence,
    frame,
  };
}

function missingBandDropoutDiagnostics(evidence) {
  const missing = [];
  if (!Array.isArray(evidence.perPixelProjectedContributors)) {
    missing.push("tileLocal.perPixelProjectedContributors");
  }
  if (!Array.isArray(evidence.perPixelRetainedContributors)) {
    missing.push("tileLocal.perPixelRetainedContributors");
  }
  if (!Array.isArray(evidence.perPixelOrderedContributors)) {
    missing.push("tileLocal.perPixelOrderedContributors");
  }
  if (!Array.isArray(evidence.perPixelFinalColorAccumulation)) {
    missing.push("tileLocal.perPixelFinalColorAccumulation");
  }
  return missing;
}

function bandDropoutContext(frame) {
  return {
    effectiveArenaBackend: frame.effectiveArenaBackend,
    orderingBackend: frame.orderingBackend,
    freshnessStatus: frame.freshnessStatus,
    frameProjectedRefs: frame.frameProjectedRefs,
    frameRetainedRefs: frame.frameRetainedRefs,
    frameDroppedRefs: frame.frameDroppedRefs,
    visibleCompositedRefLimit: frame.visibleCompositedRefLimit,
  };
}

function summarizeOrderEvidence(contributors) {
  if (!Array.isArray(contributors)) {
    return {
      rankSequence: [],
      inversionPairs: [],
    };
  }
  const rankSequence = contributors.map((contributor, index) => {
    const rank = contributor?.viewRank;
    if (!Number.isFinite(rank)) {
      throw new TypeError(`perPixelOrderedContributors[${index}].viewRank must be finite`);
    }
    return rank;
  });
  const inversionPairs = [];
  for (let index = 1; index < rankSequence.length; index += 1) {
    const previousRank = rankSequence[index - 1];
    const rank = rankSequence[index];
    if (rank < previousRank) {
      inversionPairs.push({
        leftIndex: index - 1,
        rightIndex: index,
        leftRank: previousRank,
        rightRank: rank,
      });
    }
  }
  return {
    rankSequence,
    inversionPairs,
  };
}

function bandDropoutSummary(evidence, summary) {
  return {
    pixelId: evidence.pixelId,
    pixel: evidence.pixel,
    crop: evidence.crop,
    finalRgb: evidence.finalRgb,
    plateRgb: evidence.plateRgb,
    ...summary,
  };
}

function normalizeFrameContext(frame) {
  if (!frame || typeof frame !== "object") {
    throw new TypeError("band dropout frame context is required");
  }
  validatePositiveInteger(frame.viewportWidth, "frame.viewportWidth");
  validatePositiveInteger(frame.viewportHeight, "frame.viewportHeight");
  validatePositiveInteger(frame.tileSizePx, "frame.tileSizePx");
  validatePositiveInteger(frame.tileGridColumns, "frame.tileGridColumns");
  validatePositiveInteger(frame.tileGridRows, "frame.tileGridRows");
  validateNonNegativeInteger(frame.frameProjectedRefs, "frame.frameProjectedRefs");
  validateNonNegativeInteger(frame.frameRetainedRefs, "frame.frameRetainedRefs");
  validateNonNegativeInteger(frame.frameDroppedRefs, "frame.frameDroppedRefs");
  validatePositiveInteger(frame.visibleCompositedRefLimit, "frame.visibleCompositedRefLimit");
  return {
    ...frame,
    freshnessStatus: frame.freshnessStatus ?? "unknown",
  };
}

function validatePixel(pixel, label) {
  if (!pixel || typeof pixel !== "object") {
    throw new TypeError(`${label} must be an object`);
  }
  validateNonNegativeInteger(pixel.x, `${label}.x`);
  validateNonNegativeInteger(pixel.y, `${label}.y`);
}

function validateCrop(crop) {
  if (!crop || typeof crop !== "object") {
    throw new TypeError("crop must be an object");
  }
  validateNonNegativeInteger(crop.x, "crop.x");
  validateNonNegativeInteger(crop.y, "crop.y");
  validatePositiveInteger(crop.w, "crop.w");
  validatePositiveInteger(crop.h, "crop.h");
}

function validatePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer`);
  }
}

function clampInteger(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
