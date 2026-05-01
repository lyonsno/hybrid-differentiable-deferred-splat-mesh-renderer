import {
  DEFAULT_CLEAR_COLOR,
  composeOrderedAlphaTransfer,
} from "./alphaTransfer.js";

const DEFAULT_DEPTH_PRECISION = 1e-6;
export const TILE_LOCAL_MAX_SOURCE_OPACITY = 0.999;

export function describeTileLocalCompositorAcceptanceContract() {
  return {
    consumes: [
      "tile-list-bridge:tile-local-refs",
      "tile-coverage-builder:coverageWeight",
      "tile-ordering:stable-back-to-front-order",
      "alpha-transfer:optical-depth-source-over",
    ],
    requiredCases: ["dense-overlap", "equal-depth-stable-tie", "sparse-empty-tile"],
    visiblyDifferentFromBridgeDiagnostic: [
      "accumulates splat color and opacity from refs",
      "uses raw coverage weights as optical depth",
      "returns clear output for empty tiles instead of tile-block witness colors",
    ],
    forbiddenClaims: [
      "final-gpu-tile-ref-builder",
      "spherical-harmonics-shading",
      "pbr-relighting",
      "deferred-g-buffer-output",
      "beauty-threshold",
    ],
  };
}

export function composeTileLocalGaussianTile({
  tileId,
  tileRefs,
  splats,
  clearColor = DEFAULT_CLEAR_COLOR,
  depthPrecision = DEFAULT_DEPTH_PRECISION,
} = {}) {
  validateNonNegativeInteger(tileId, "tileId");
  validateColor(clearColor, "clearColor");
  validatePositiveFinite(depthPrecision, "depthPrecision");
  if (!Array.isArray(tileRefs)) {
    throw new TypeError("tileRefs must be an array");
  }

  const splatsById = normalizeSplats(splats);
  const orderedRefs = tileRefs
    .map((tileRef, index) => normalizeTileRef(tileRef, index, tileId, depthPrecision))
    .sort(compareTileRefs)
    .map((tileRef) => ({
      ...tileRef,
      orderKey: {
        quantizedDepth: tileRef.quantizedDepth,
        stableTieId: tileRef.stableTieId,
        tileId,
      },
    }));

  if (orderedRefs.length === 0) {
    return {
      tileId,
      status: "empty-tile-clear",
      color: [...clearColor],
      alpha: 0,
      remainingTransmission: 1,
      orderedRefs,
      drawSplatIds: [],
      coverageAlphas: [],
      transferWeights: [{ id: "clear", weight: 1 }],
      normalization: {
        policy: "coverage-is-optical-depth-do-not-normalize",
        totalCoverageWeight: 0,
        normalizedForTransfer: false,
      },
      bridgeDiagnosticBoundary: describeBridgeDiagnosticBoundary(),
    };
  }

  const contributions = orderedRefs.map((tileRef) => {
    const splat = splatsById.get(tileRef.splatId);
    if (!splat) {
      throw new Error(`tileRef ${tileRef.splatId} has no matching splat payload`);
    }
    return {
      id: String(tileRef.splatId),
      depth: tileRef.viewDepth,
      color: splat.color,
      opacity: resolveTileLocalSourceOpacity(splat.opacity),
      coverageWeight: tileRef.coverageWeight,
    };
  });
  const transfer = composeOrderedAlphaTransfer(contributions, { clearColor });

  return {
    tileId,
    status: "tile-local-gaussian-composited",
    color: transfer.color,
    alpha: transfer.alpha,
    remainingTransmission: transfer.remainingTransmission,
    orderedRefs,
    drawSplatIds: orderedRefs.map((tileRef) => tileRef.splatId),
    coverageAlphas: transfer.coverageAlphas,
    transferWeights: transfer.transferWeights,
    normalization: transfer.normalization,
    bridgeDiagnosticBoundary: describeBridgeDiagnosticBoundary(),
  };
}

export function describeBridgeDiagnosticBoundary() {
  return {
    bridgeDiagnosticRole: "buffer-visibility-witness-only",
    realCompositorMinimum: "ordered-gaussian-alpha-accumulation",
    blockWitnessColorsAllowed: false,
    finalRendererClaimsAllowed: false,
  };
}

export function resolveTileLocalSourceOpacity(opacity) {
  return Math.min(opacity, TILE_LOCAL_MAX_SOURCE_OPACITY);
}

function normalizeSplats(splats) {
  if (!Array.isArray(splats)) {
    throw new TypeError("splats must be an array");
  }

  const splatsById = new Map();
  for (const [index, splat] of splats.entries()) {
    if (!splat || typeof splat !== "object") {
      throw new TypeError(`splat ${index} must be an object`);
    }
    validateNonNegativeInteger(splat.splatId, `splat ${index} splatId`);
    validateColor(splat.color, `splat ${index} color`);
    validateUnitInterval(splat.opacity, `splat ${index} opacity`);
    if (splatsById.has(splat.splatId)) {
      throw new Error(`duplicate splat payload for splatId ${splat.splatId}`);
    }
    splatsById.set(splat.splatId, {
      splatId: splat.splatId,
      color: [...splat.color],
      opacity: splat.opacity,
    });
  }
  return splatsById;
}

function normalizeTileRef(tileRef, index, fallbackTileId, depthPrecision) {
  if (!tileRef || typeof tileRef !== "object") {
    throw new TypeError(`tileRef ${index} must be an object`);
  }
  const tileId = "tileId" in tileRef ? tileRef.tileId : fallbackTileId;
  validateNonNegativeInteger(tileId, `tileRef ${index} tileId`);
  if (tileId !== fallbackTileId) {
    throw new Error(`tileRef ${index} belongs to tile ${tileId}, not tile ${fallbackTileId}`);
  }
  validateNonNegativeInteger(tileRef.splatId, `tileRef ${index} splatId`);
  validateFinite(tileRef.viewDepth, `tileRef ${index} viewDepth`);
  const stableTieId = "stableTieId" in tileRef ? tileRef.stableTieId : tileRef.splatId;
  validateNonNegativeInteger(stableTieId, `tileRef ${index} stableTieId`);
  validateNonNegativeFinite(tileRef.coverageWeight, `tileRef ${index} coverageWeight`);

  return {
    tileId,
    splatId: tileRef.splatId,
    stableTieId,
    viewDepth: tileRef.viewDepth,
    coverageWeight: tileRef.coverageWeight,
    quantizedDepth: quantizeDepth(tileRef.viewDepth, depthPrecision),
  };
}

function compareTileRefs(left, right) {
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

function validateColor(color, label) {
  if (!Array.isArray(color) || color.length !== 3 || !color.every(Number.isFinite)) {
    throw new TypeError(`${label} must be a finite rgb array`);
  }
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
