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
