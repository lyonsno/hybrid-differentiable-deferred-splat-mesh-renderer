import { PIXEL_CONTRIBUTOR_TRACE_SCHEMA } from "./pixelContributorTraceSchema.js";

export const BAND_ORDER_BACKEND = "gpu-sorted-index-rank-inversion";
export const BLACK_BAND_TRACE_ANCHOR = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.find(
  (anchor) => anchor.id === "black-band-dropout-2300-1055",
);

const DEFAULT_TILE_SPAN = Object.freeze({
  minTileX: 139,
  maxTileX: 149,
  minTileY: 64,
  maxTileY: 66,
});

export function buildBandPixelOrderTraceRecord({
  contributors = [],
  dispatchCache,
  rendererMetadata = {},
  tileSizePx = BLACK_BAND_TRACE_ANCHOR.canonicalTileAddress.tileSizePx ?? 16,
} = {}) {
  if (!BLACK_BAND_TRACE_ANCHOR) {
    throw new Error("black-band-dropout-2300-1055 anchor is missing from the pixel contributor trace schema");
  }
  const tileAddress = tileAddressForAnchor(tileSizePx);
  const orderedContributors = selectBandPixelOrderedContributors(contributors, tileAddress);
  const blockers = [];
  if (orderedContributors.length === 0) {
    blockers.push({
      field: "orderedContributors",
      reason: "tileLocal.perPixelOrderedContributors missing for black-band-dropout-2300-1055",
    });
  }

  return {
    schemaVersion: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.schemaVersion,
    anchorPixel: {
      id: BLACK_BAND_TRACE_ANCHOR.id,
      kind: BLACK_BAND_TRACE_ANCHOR.kind,
      x: BLACK_BAND_TRACE_ANCHOR.x,
      y: BLACK_BAND_TRACE_ANCHOR.y,
    },
    tileAddress,
    projectedContributors: [],
    retainedContributors: [],
    orderedContributors,
    finalColorAccumulation: {
      steps: [],
      outputColor: [0, 0, 0, 0],
    },
    dispatchCache: dispatchCache ?? buildBandDispatchCacheTrace({ tileSizePx }),
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible",
      ...rendererMetadata,
    },
    deferredFields: {
      preserved: true,
      deferredSurface: null,
      missingReason: "production deferred G-buffer voting is outside the trace packet scope",
    },
    blockers,
  };
}

export function selectBandPixelOrderedContributors(contributors, tileAddress = tileAddressForAnchor(16)) {
  if (!Array.isArray(contributors)) {
    throw new TypeError("band order contributors must be an array");
  }
  return contributors
    .filter((contributor) => contributorCoversBandPixel(contributor, tileAddress))
    .sort(compareOrderContributors)
    .map((contributor, orderIndex) => ({
      splatIndex: nonNegativeInteger(contributor.splatIndex, "contributor.splatIndex"),
      originalId: nonNegativeInteger(contributor.originalId ?? contributor.splatIndex, "contributor.originalId"),
      orderIndex,
      viewRank: nonNegativeInteger(contributor.viewRank, "contributor.viewRank"),
      viewDepth: finiteNumber(contributor.viewDepth, "contributor.viewDepth"),
      tieBreakKey: tieBreakKey(contributor),
      orderBackend: BAND_ORDER_BACKEND,
    }));
}

export function buildBandDispatchCacheTrace({
  tileColumns = 216,
  tileRows = 113,
  tileSizePx = 16,
  viewportWidth = tileColumns * tileSizePx,
  viewportHeight = tileRows * tileSizePx,
  currentFrameId = -1,
  clearFrameId = -1,
  buildFrameId = -1,
  compositeFrameId = -1,
  cacheState = "not-dispatched",
  tileSpan = DEFAULT_TILE_SPAN,
} = {}) {
  const tileAddress = tileAddressForAnchor(tileSizePx, tileColumns);
  const tileInGrid = tileAddress.tileX < tileColumns && tileAddress.tileY < tileRows;
  const pixelInViewport = BLACK_BAND_TRACE_ANCHOR.x < viewportWidth && BLACK_BAND_TRACE_ANCHOR.y < viewportHeight;
  const current = cacheState === "current";
  const tileCoveredByClear = current && clearFrameId === currentFrameId && tileInGrid;
  const tileCoveredByBuild = current && buildFrameId === currentFrameId && tileInGrid;
  const tileCoveredByComposite = current && compositeFrameId === currentFrameId && tileInGrid && pixelInViewport;
  const rowCoveredByComposite = current && compositeFrameId === currentFrameId && tileAddress.tileY < tileRows && BLACK_BAND_TRACE_ANCHOR.y < viewportHeight;

  return {
    tileIndex: tileAddress.tileIndex,
    clearFrameId,
    buildFrameId,
    compositeFrameId,
    tileY: tileAddress.tileY,
    tileSpan: { ...tileSpan },
    cacheState,
    presentationFrameId: compositeFrameId,
    rowDispatchState: {
      tileCoveredByClear,
      tileCoveredByBuild,
      tileCoveredByComposite,
      rowCoveredByComposite,
      currentFrameComplete: tileCoveredByClear && tileCoveredByBuild && tileCoveredByComposite,
    },
  };
}

export function classifyBandDropoutMechanism({
  anchorPixel = BLACK_BAND_TRACE_ANCHOR,
  tileAddress = tileAddressForAnchor(16),
  dispatchCache,
  orderedContributors = [],
  finalColorAccumulation = {},
  traceSource = "synthetic-band-witness",
  gpuLiveTraceAvailable = true,
} = {}) {
  if (!anchorPixel || anchorPixel.id !== BLACK_BAND_TRACE_ANCHOR.id) {
    throw new Error("band dropout classifier only owns black-band-dropout-2300-1055");
  }
  const normalizedTileAddress = normalizeTileAddress(tileAddress);
  const affectedRows = [normalizedTileAddress.tileY];
  const affectedTiles = [normalizedTileAddress.tileIndex];
  const finalSteps = Array.isArray(finalColorAccumulation.steps) ? finalColorAccumulation.steps : [];
  const outputAlpha = outputAlphaFor(finalColorAccumulation.outputColor);
  const maxCoverageAlpha = maxStepField(finalSteps, "coverageAlpha");
  const maxCoverageWeight = maxStepField(finalSteps, "coverageWeight");
  const currentFrameComplete = Boolean(dispatchCache?.rowDispatchState?.currentFrameComplete);
  const baseEvidence = {
    orderedCount: orderedContributors.length,
    finalStepCount: finalSteps.length,
    outputAlpha,
    maxCoverageAlpha,
    dispatchCurrentFrameComplete: currentFrameComplete,
  };

  if (!currentFrameComplete) {
    return {
      classification: "dispatch-cache",
      provisional: false,
      reason: `band tile ${normalizedTileAddress.tileIndex} or row ${normalizedTileAddress.tileY} was not cleared/built/composited for the current frame`,
      affectedRows,
      affectedTiles,
      evidence: baseEvidence,
    };
  }

  const orderDivergence = classifyOrderDivergence(orderedContributors, finalSteps);
  if (orderDivergence.diverged) {
    return {
      classification: "order-rank",
      provisional: false,
      reason: "band final accumulation order diverges from ordered contributor ranks",
      affectedRows,
      affectedTiles,
      evidence: {
        ...baseEvidence,
        orderedSplatIds: orderDivergence.orderedSplatIds,
        accumulatedSplatIds: orderDivergence.accumulatedSplatIds,
      },
    };
  }

  if (orderedContributors.length > 0 && finalSteps.length === 0) {
    return {
      classification: "final-accumulation",
      provisional: false,
      reason: "band ordered contributors are present but no final accumulation steps were emitted",
      affectedRows,
      affectedTiles,
      evidence: baseEvidence,
    };
  }

  if (finalSteps.length > 0 && outputAlpha <= 0.001 && maxCoverageAlpha <= 0.001) {
    return {
      classification: "conic-alpha-side-effect",
      provisional: !gpuLiveTraceAvailable,
      reason: `band contributors reached current-frame accumulation, but max coverage alpha ${maxCoverageAlpha} leaves output alpha ${outputAlpha}`,
      affectedRows,
      affectedTiles,
      ...(gpuLiveTraceAvailable ? {} : { blocker: "gpu-live-trace-extraction" }),
      evidence: {
        ...baseEvidence,
        maxCoverageWeight,
        traceSource,
      },
    };
  }

  return {
    classification: "narrower-blocker",
    provisional: !gpuLiveTraceAvailable,
    reason: "band evidence does not isolate dispatch/cache, order/rank, final accumulation, or conic/alpha under-accumulation",
    affectedRows,
    affectedTiles,
    ...(gpuLiveTraceAvailable ? {} : { blocker: "gpu-live-trace-extraction" }),
    evidence: {
      ...baseEvidence,
      maxCoverageWeight,
      traceSource,
    },
  };
}

function tileAddressForAnchor(tileSizePx, tileColumns = 216) {
  const tileX = Math.floor(BLACK_BAND_TRACE_ANCHOR.x / tileSizePx);
  const tileY = Math.floor(BLACK_BAND_TRACE_ANCHOR.y / tileSizePx);
  return {
    tileSizePx,
    tileX,
    tileY,
    tileIndex: tileY * tileColumns + tileX,
    localX: BLACK_BAND_TRACE_ANCHOR.x - tileX * tileSizePx,
    localY: BLACK_BAND_TRACE_ANCHOR.y - tileY * tileSizePx,
  };
}

function normalizeTileAddress(tileAddress) {
  if (!tileAddress || typeof tileAddress !== "object") {
    throw new TypeError("band tile address must be an object");
  }
  return {
    tileSizePx: nonNegativeInteger(tileAddress.tileSizePx, "tileAddress.tileSizePx"),
    tileX: nonNegativeInteger(tileAddress.tileX, "tileAddress.tileX"),
    tileY: nonNegativeInteger(tileAddress.tileY, "tileAddress.tileY"),
    tileIndex: nonNegativeInteger(tileAddress.tileIndex, "tileAddress.tileIndex"),
    localX: nonNegativeInteger(tileAddress.localX, "tileAddress.localX"),
    localY: nonNegativeInteger(tileAddress.localY, "tileAddress.localY"),
  };
}

function classifyOrderDivergence(orderedContributors, finalSteps) {
  const orderedSplatIds = orderedContributors.map((entry) => nonNegativeInteger(entry.splatIndex, "orderedContributors.splatIndex"));
  const accumulatedSplatIds = finalSteps.map((entry) => nonNegativeInteger(entry.splatIndex, "finalColorAccumulation.steps.splatIndex"));
  if (orderedSplatIds.length === 0 || accumulatedSplatIds.length === 0) {
    return { diverged: false, orderedSplatIds, accumulatedSplatIds };
  }
  if (orderedSplatIds.length !== accumulatedSplatIds.length) {
    return { diverged: true, orderedSplatIds, accumulatedSplatIds };
  }
  const diverged = orderedSplatIds.some((splatId, index) => splatId !== accumulatedSplatIds[index]);
  return { diverged, orderedSplatIds, accumulatedSplatIds };
}

function outputAlphaFor(outputColor) {
  if (!Array.isArray(outputColor) || outputColor.length < 4) {
    return 0;
  }
  return finiteNumber(outputColor[3], "finalColorAccumulation.outputColor.alpha");
}

function maxStepField(steps, field) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return 0;
  }
  return Math.max(...steps.map((step) => finiteNumber(step[field] ?? 0, `finalColorAccumulation.steps.${field}`)));
}

function contributorCoversBandPixel(contributor, tileAddress) {
  if (!contributor || typeof contributor !== "object") return false;
  if (contributor.retained === false || contributor.retentionStatus === "dropped" || contributor.contributorIndex === -1) {
    return false;
  }
  if (contributor.tileIndex !== tileAddress.tileIndex) {
    return false;
  }
  const center = contributor.centerPx;
  const inverseConic = contributor.inverseConic;
  if (!Array.isArray(center) || !Array.isArray(inverseConic)) {
    return false;
  }
  return conicPixelWeight(center, inverseConic, [BLACK_BAND_TRACE_ANCHOR.x + 0.5, BLACK_BAND_TRACE_ANCHOR.y + 0.5]) > 1e-8;
}

function conicPixelWeight(centerPx, inverseConic, pixelCenter) {
  const dx = pixelCenter[0] - finiteNumber(centerPx[0], "centerPx.x");
  const dy = pixelCenter[1] - finiteNumber(centerPx[1], "centerPx.y");
  const a = finiteNumber(inverseConic[0], "inverseConic.a");
  const b = finiteNumber(inverseConic[1], "inverseConic.b");
  const c = finiteNumber(inverseConic[2], "inverseConic.c");
  const mahalanobis2 = Math.max(0, a * dx * dx + 2 * b * dx * dy + c * dy * dy);
  return Math.exp(-0.5 * mahalanobis2);
}

function compareOrderContributors(left, right) {
  return (
    nonNegativeInteger(left.viewRank, "left.viewRank") - nonNegativeInteger(right.viewRank, "right.viewRank") ||
    finiteNumber(left.viewDepth, "left.viewDepth") - finiteNumber(right.viewDepth, "right.viewDepth") ||
    nonNegativeInteger(left.originalId ?? left.splatIndex, "left.originalId") -
      nonNegativeInteger(right.originalId ?? right.splatIndex, "right.originalId") ||
    nonNegativeInteger(left.splatIndex, "left.splatIndex") - nonNegativeInteger(right.splatIndex, "right.splatIndex")
  );
}

function tieBreakKey(contributor) {
  return [
    `rank:${nonNegativeInteger(contributor.viewRank, "contributor.viewRank")}`,
    `depth:${finiteNumber(contributor.viewDepth, "contributor.viewDepth")}`,
    `original:${nonNegativeInteger(contributor.originalId ?? contributor.splatIndex, "contributor.originalId")}`,
    `splat:${nonNegativeInteger(contributor.splatIndex, "contributor.splatIndex")}`,
  ].join("|");
}

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`);
  }
  return value;
}

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
  return value;
}
