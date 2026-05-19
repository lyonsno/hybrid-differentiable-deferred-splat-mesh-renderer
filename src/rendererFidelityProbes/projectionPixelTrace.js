import { PIXEL_CONTRIBUTOR_TRACE_SCHEMA } from "./pixelContributorTraceSchema.js";

const DEFAULT_RENDERER_METADATA = Object.freeze({
  requestedRenderer: "tile-local-visible",
  effectiveRenderer: "tile-local-visible",
});

const DEFAULT_DISPATCH_CACHE = Object.freeze({
  clearFrameId: 0,
  buildFrameId: 0,
  compositeFrameId: 0,
});

const DEFAULT_DEFERRED_FIELDS = Object.freeze({
  preserved: true,
  deferredSurface: null,
  normalSum: null,
  albedoSum: null,
  matSum: null,
  weightSum: null,
  provisionalDepth: null,
  confidence: null,
  lossEvidence: null,
});

export function buildPerPixelProjectedContributorTraces({
  projectedContributors,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  tileRows,
  rendererMetadata = DEFAULT_RENDERER_METADATA,
  dispatchCache = DEFAULT_DISPATCH_CACHE,
  deferredFields = DEFAULT_DEFERRED_FIELDS,
  anchors = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors,
} = {}) {
  const contributorsByTileIndex = Array.isArray(projectedContributors)
    ? groupProjectedContributorsByTileIndex(projectedContributors)
    : null;

  return anchors.map((anchorPixel) => {
    const tileAddress = canonicalTileAddressForAnchor(anchorPixel, {
      viewportWidth,
      viewportHeight,
      tileSizePx,
      tileColumns,
      tileRows,
    });
    const tileContributors = contributorsByTileIndex?.get(tileAddress.tileIndex) ?? [];
    const status = !contributorsByTileIndex
      ? "uninstrumented"
      : tileContributors.length > 0
        ? "present"
        : "absent";

    return {
      status,
      anchorPixel: cloneAnchorPixel(anchorPixel),
      tileAddress,
      traceRecord: {
        schemaVersion: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.schemaVersion,
        anchorPixel: cloneAnchorPixel(anchorPixel),
        tileAddress,
        projectedContributors: tileContributors.map(projectedContributorToTraceEntry),
        retainedContributors: [],
        orderedContributors: [],
        finalColorAccumulation: {
          steps: [],
          outputColor: [0, 0, 0, 0],
        },
        dispatchCache: {
          tileIndex: tileAddress.tileIndex,
          clearFrameId: dispatchCache.clearFrameId ?? 0,
          buildFrameId: dispatchCache.buildFrameId ?? 0,
          compositeFrameId: dispatchCache.compositeFrameId ?? 0,
        },
        rendererMetadata: {
          ...DEFAULT_RENDERER_METADATA,
          ...rendererMetadata,
          tileSizePx: tileSizePx ?? rendererMetadata.tileSizePx ?? null,
          viewport: viewportWidth && viewportHeight
            ? { width: viewportWidth, height: viewportHeight }
            : rendererMetadata.viewport ?? null,
        },
        deferredFields: normalizeDeferredFields(deferredFields),
      },
    };
  });
}

function groupProjectedContributorsByTileIndex(projectedContributors) {
  const grouped = new Map();
  for (const contributor of projectedContributors) {
    const tileIndex = Number.isInteger(contributor?.tileIndex) ? contributor.tileIndex : null;
    if (tileIndex == null) continue;
    if (!grouped.has(tileIndex)) {
      grouped.set(tileIndex, []);
    }
    grouped.get(tileIndex).push(contributor);
  }
  return grouped;
}

function canonicalTileAddressForAnchor(anchorPixel, {
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  tileRows,
} = {}) {
  if (anchorPixel?.canonicalTileAddress) {
    return {
      tileSizePx: tileSizePx ?? deriveTileSize(anchorPixel.canonicalTileAddress, viewportWidth, viewportHeight, tileColumns, tileRows),
      ...anchorPixel.canonicalTileAddress,
    };
  }

  const safeTileSizePx = positiveInteger(tileSizePx, "tileSizePx");
  const safeTileColumns = positiveInteger(tileColumns ?? Math.max(1, Math.ceil((viewportWidth ?? 1) / safeTileSizePx)), "tileColumns");
  const safeTileRows = positiveInteger(tileRows ?? Math.max(1, Math.ceil((viewportHeight ?? 1) / safeTileSizePx)), "tileRows");
  const tileX = clamp(Math.floor(anchorPixel.x / safeTileSizePx), 0, safeTileColumns - 1);
  const tileY = clamp(Math.floor(anchorPixel.y / safeTileSizePx), 0, safeTileRows - 1);
  return {
    tileSizePx: safeTileSizePx,
    tileX,
    tileY,
    tileIndex: tileY * safeTileColumns + tileX,
    localX: anchorPixel.x - tileX * safeTileSizePx,
    localY: anchorPixel.y - tileY * safeTileSizePx,
  };
}

function deriveTileSize(canonicalTileAddress, viewportWidth, viewportHeight, tileColumns, tileRows) {
  if (Number.isInteger(canonicalTileAddress?.tileSizePx) && canonicalTileAddress.tileSizePx > 0) {
    return canonicalTileAddress.tileSizePx;
  }
  if (Number.isInteger(tileColumns) && tileColumns > 0 && Number.isFinite(viewportWidth) && viewportWidth > 0) {
    return Math.max(1, Math.floor(viewportWidth / tileColumns));
  }
  if (Number.isInteger(tileRows) && tileRows > 0 && Number.isFinite(viewportHeight) && viewportHeight > 0) {
    return Math.max(1, Math.floor(viewportHeight / tileRows));
  }
  return 1;
}

function projectedContributorToTraceEntry(contributor) {
  const inverseConic = normalizeTriple(contributor?.inverseConic);
  return {
    splatIndex: positiveInteger(contributor?.splatIndex ?? 0, "splatIndex"),
    originalId: positiveInteger(contributor?.originalId ?? 0, "originalId"),
    projectionStatus: "projected",
    centerPx: normalizePair(contributor?.centerPx),
    footprintPx: inverseConicFootprint(inverseConic),
    coverageWeight: finiteNumber(contributor?.coverageWeight, 0),
    inverseConic,
    viewDepth: finiteNumber(contributor?.viewDepth, 0),
    opacity: clamp01(contributor?.opacity ?? 0),
    tileIndex: positiveInteger(contributor?.tileIndex ?? 0, "tileIndex"),
    tileX: positiveInteger(contributor?.tileX ?? 0, "tileX"),
    tileY: positiveInteger(contributor?.tileY ?? 0, "tileY"),
    projectedIndex: positiveInteger(contributor?.projectedIndex ?? 0, "projectedIndex"),
    deferredSurface: null,
  };
}

function inverseConicFootprint([xx, xy, yy]) {
  const radii = inverseConicRadii(xx, xy, yy);
  if (!radii) {
    return {
      majorRadiusPx: 0,
      minorRadiusPx: 0,
      areaPx: 0,
    };
  }
  return {
    majorRadiusPx: round(radii.major),
    minorRadiusPx: round(radii.minor),
    areaPx: round(Math.PI * radii.major * radii.minor),
  };
}

function inverseConicRadii(xx, xy, yy) {
  if (![xx, xy, yy].every(Number.isFinite)) return null;
  const trace = xx + yy;
  const discriminant = Math.sqrt(Math.max((xx - yy) * (xx - yy) + 4 * xy * xy, 0));
  const lambdaSmall = 0.5 * (trace - discriminant);
  const lambdaLarge = 0.5 * (trace + discriminant);
  if (lambdaSmall <= 0 || lambdaLarge <= 0) return null;
  return {
    major: 1 / Math.sqrt(lambdaSmall),
    minor: 1 / Math.sqrt(lambdaLarge),
  };
}

function normalizeDeferredFields(deferredFields) {
  return {
    ...DEFAULT_DEFERRED_FIELDS,
    ...(deferredFields && typeof deferredFields === "object" ? deferredFields : {}),
  };
}

function cloneAnchorPixel(anchorPixel) {
  return {
    ...anchorPixel,
    canonicalTileAddress: anchorPixel.canonicalTileAddress
      ? { ...anchorPixel.canonicalTileAddress }
      : null,
  };
}

function normalizePair(value) {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isFinite)) {
    return [0, 0];
  }
  return [value[0], value[1]];
}

function normalizeTriple(value) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    return [1, 0, 1];
  }
  return [value[0], value[1], value[2]];
}

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
  return value;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Number(value.toFixed(6));
}
