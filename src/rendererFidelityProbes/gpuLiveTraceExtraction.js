import { buildFinalColorAccumulationTraceRecord } from "./finalAccumulationTrace.js";
import { PIXEL_CONTRIBUTOR_TRACE_SCHEMA } from "./pixelContributorTraceSchema.js";

export const GPU_LIVE_TRACE_ORDER_BACKEND = "gpu-live-tile-ref-readback";
export const GPU_LIVE_TRACE_PROJECTION_STATUS = "gpu-live-readback-retained";

const DEFAULT_RENDERER_METADATA = Object.freeze({
  requestedRenderer: "tile-local-visible",
  effectiveRenderer: "tile-local-visible",
  requestedArenaBackend: "gpu",
  effectiveArenaBackend: "gpu",
});

const DEFAULT_DEFERRED_FIELDS = Object.freeze({
  preserved: true,
  deferredSurface: null,
  missingReason: "production deferred G-buffer voting is outside the GPU-live trace extraction scope",
});

const DEFAULT_CLEAR_COLOR = Object.freeze([0.02, 0.02, 0.04]);

export function buildGpuLivePerAnchorTraceRecords({
  tileHeaders,
  tileRefs,
  tileCoverageWeights,
  alphaParams,
  maxTileRefs,
  tileSizePx = 16,
  tileColumns,
  tileRows,
  viewportWidth,
  viewportHeight,
  sourceColors,
  viewDepthBySplatIndex,
  rendererMetadata = DEFAULT_RENDERER_METADATA,
  dispatchCache = {},
  deferredFields = DEFAULT_DEFERRED_FIELDS,
  clearColor = DEFAULT_CLEAR_COLOR,
  anchors = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors,
} = {}) {
  const snapshot = normalizeGpuLiveSnapshot({
    tileHeaders,
    tileRefs,
    tileCoverageWeights,
    alphaParams,
    maxTileRefs,
  });

  return anchors.map((anchorPixel) => {
    const tileAddress = tileAddressForAnchor(anchorPixel, {
      tileSizePx,
      tileColumns,
      tileRows,
      viewportWidth,
      viewportHeight,
    });
    const decoded = decodeTileContributorsForAnchor(snapshot, tileAddress, {
      sourceColors,
      viewDepthBySplatIndex,
    });
    if (decoded.blockers.length > 0) {
      return blockedGpuLiveTrace({
        anchorPixel,
        tileAddress,
        blockers: decoded.blockers,
        rendererMetadata,
        dispatchCache,
        deferredFields,
        clearColor,
      });
    }

    const orderedContributors = decoded.contributors
      .map((contributor, orderIndex) => orderedContributorTraceEntry(contributor, orderIndex));
    const projectedContributors = decoded.contributors.map(projectedContributorTraceEntry);
    const retainedContributors = decoded.contributors.map(retainedContributorTraceEntry);
    const traceRecord = buildFinalColorAccumulationTraceRecord({
      anchorPixel,
      contributors: decoded.contributors,
      sourceColors,
      projectedContributors,
      retainedContributors,
      orderedContributors,
      dispatchCache: {
        tileIndex: tileAddress.tileIndex,
        ...dispatchCache,
      },
      rendererMetadata: {
        ...DEFAULT_RENDERER_METADATA,
        ...rendererMetadata,
      },
      deferredFields: {
        ...DEFAULT_DEFERRED_FIELDS,
        ...(deferredFields && typeof deferredFields === "object" ? deferredFields : {}),
      },
      clearColor,
      tileSizePx: tileAddress.tileSizePx,
      tileColumns,
    });

    return {
      status: "present",
      anchorPixel: traceAnchor(anchorPixel),
      tileAddress,
      projectedContributors,
      retainedContributors,
      orderedContributors,
      finalColorAccumulation: traceRecord.finalColorAccumulation,
      blockers: Array.isArray(traceRecord.blockers) ? traceRecord.blockers : [],
      traceRecord,
    };
  });
}

function normalizeGpuLiveSnapshot({
  tileHeaders,
  tileRefs,
  tileCoverageWeights,
  alphaParams,
  maxTileRefs,
}) {
  if (!(tileHeaders instanceof Uint32Array)) {
    throw new TypeError("gpu-live trace tileHeaders must be a Uint32Array readback");
  }
  if (!(tileRefs instanceof Uint32Array)) {
    throw new TypeError("gpu-live trace tileRefs must be a Uint32Array readback");
  }
  if (!(tileCoverageWeights instanceof Float32Array)) {
    throw new TypeError("gpu-live trace tileCoverageWeights must be a Float32Array readback");
  }
  if (!(alphaParams instanceof Float32Array)) {
    throw new TypeError("gpu-live trace alphaParams must be a Float32Array readback");
  }
  const safeMaxTileRefs = positiveInteger(maxTileRefs, "maxTileRefs");
  if (tileRefs.length < safeMaxTileRefs * 4) {
    throw new RangeError("gpu-live trace tileRefs readback is shorter than maxTileRefs");
  }
  if (tileCoverageWeights.length < safeMaxTileRefs) {
    throw new RangeError("gpu-live trace tileCoverageWeights readback is shorter than maxTileRefs");
  }
  if (alphaParams.length < safeMaxTileRefs * 8) {
    throw new RangeError("gpu-live trace alphaParams readback must include primary and conic vec4 sections");
  }
  return {
    tileHeaders,
    tileRefs,
    tileCoverageWeights,
    alphaParams,
    maxTileRefs: safeMaxTileRefs,
  };
}

function decodeTileContributorsForAnchor(snapshot, tileAddress, {
  sourceColors,
  viewDepthBySplatIndex,
}) {
  const blockers = [];
  const headerBase = tileAddress.tileIndex * 4;
  if (headerBase + 3 >= snapshot.tileHeaders.length) {
    return {
      contributors: [],
      blockers: [{
        field: "tileAddress.tileIndex",
        reason: `gpu-live readback tile ${tileAddress.tileIndex} exceeds tile header readback`,
      }],
    };
  }

  const offset = snapshot.tileHeaders[headerBase];
  const retainedCount = snapshot.tileHeaders[headerBase + 1];
  if (retainedCount === 0) {
    return {
      contributors: [],
      blockers: [{
        field: "projectedContributors",
        reason: `gpu-live readback has no retained contributors for ${tileAddress.tileIndex}`,
      }],
    };
  }

  const contributors = [];
  for (let slot = 0; slot < retainedCount; slot += 1) {
    const refIndex = offset + slot;
    const refBase = refIndex * 4;
    if (refIndex >= snapshot.maxTileRefs || refBase + 3 >= snapshot.tileRefs.length) {
      blockers.push({
        field: "tileRefs",
        reason: `gpu-live readback ref ${refIndex} exceeds maxTileRefs`,
      });
      continue;
    }
    const splatIndex = snapshot.tileRefs[refBase];
    const originalId = snapshot.tileRefs[refBase + 1];
    const tileIndex = snapshot.tileRefs[refBase + 2];
    if (tileIndex !== tileAddress.tileIndex) {
      blockers.push({
        field: "tileRefs.tileIndex",
        reason: `gpu-live readback ref ${refIndex} points at tile ${tileIndex}, expected ${tileAddress.tileIndex}`,
      });
      continue;
    }

    const viewDepth = lookupFiniteSideEvidence(viewDepthBySplatIndex, splatIndex);
    if (!Number.isFinite(viewDepth)) {
      blockers.push({
        field: "viewDepth",
        reason: `gpu-live readback is missing viewDepth for splat ${splatIndex}`,
      });
      continue;
    }
    if (!hasSourceColor(sourceColors, splatIndex)) {
      blockers.push({
        field: "sourceColor",
        reason: `gpu-live readback is missing source color for splat ${splatIndex}`,
      });
      continue;
    }

    const alphaBase = refIndex * 4;
    const conicBase = (snapshot.maxTileRefs + refIndex) * 4;
    const opacity = finiteOrBlock(snapshot.alphaParams[alphaBase], "opacity", blockers, refIndex);
    const centerPx = [
      finiteOrBlock(snapshot.alphaParams[alphaBase + 1], "centerPx.x", blockers, refIndex),
      finiteOrBlock(snapshot.alphaParams[alphaBase + 2], "centerPx.y", blockers, refIndex),
    ];
    const viewRank = integerOrBlock(snapshot.alphaParams[alphaBase + 3], "viewRank", blockers, refIndex);
    const inverseConic = [
      finiteOrBlock(snapshot.alphaParams[conicBase], "inverseConic.x", blockers, refIndex),
      finiteOrBlock(snapshot.alphaParams[conicBase + 1], "inverseConic.y", blockers, refIndex),
      finiteOrBlock(snapshot.alphaParams[conicBase + 2], "inverseConic.z", blockers, refIndex),
    ];
    const coverageWeight = finiteOrBlock(snapshot.tileCoverageWeights[refIndex], "coverageWeight", blockers, refIndex);
    if (blockers.length > 0) {
      continue;
    }

    contributors.push({
      splatIndex,
      originalId,
      tileIndex,
      contributorIndex: refIndex,
      viewRank,
      viewDepth,
      depthBand: 0,
      coverageWeight,
      centerPx,
      inverseConic,
      opacity: clamp01(opacity),
      coverageAlpha: 0,
      transmittanceBefore: 1,
      retentionWeight: coverageWeight,
      occlusionWeight: coverageWeight,
      retentionStatus: "retained",
      retentionBand: "middle",
      overflowReason: "none",
      retained: true,
      gpuLiveRefIndex: refIndex,
    });
  }

  return {
    contributors: blockers.length > 0 ? [] : contributors.sort(compareGpuLiveContributorOrder),
    blockers,
  };
}

function blockedGpuLiveTrace({
  anchorPixel,
  tileAddress,
  blockers,
  rendererMetadata,
  dispatchCache,
  deferredFields,
  clearColor,
}) {
  const traceRecord = {
    schemaVersion: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.schemaVersion,
    anchorPixel: traceAnchor(anchorPixel),
    tileAddress,
    projectedContributors: [],
    retainedContributors: [],
    orderedContributors: [],
    finalColorAccumulation: {
      steps: [],
      outputColor: [clearColor[0], clearColor[1], clearColor[2], 0],
      clearColor: [clearColor[0], clearColor[1], clearColor[2]],
      remainingTransmittance: 1,
    },
    dispatchCache: {
      tileIndex: tileAddress.tileIndex,
      clearFrameId: 0,
      buildFrameId: 0,
      compositeFrameId: 0,
      ...dispatchCache,
    },
    rendererMetadata: {
      ...DEFAULT_RENDERER_METADATA,
      ...rendererMetadata,
    },
    deferredFields: {
      ...DEFAULT_DEFERRED_FIELDS,
      ...(deferredFields && typeof deferredFields === "object" ? deferredFields : {}),
    },
    blockers,
  };
  return {
    status: "blocked",
    anchorPixel: traceRecord.anchorPixel,
    tileAddress,
    projectedContributors: [],
    retainedContributors: [],
    orderedContributors: [],
    finalColorAccumulation: traceRecord.finalColorAccumulation,
    blockers,
    traceRecord,
  };
}

function projectedContributorTraceEntry(contributor) {
  const inverseConic = normalizeTriple(contributor.inverseConic);
  return {
    splatIndex: contributor.splatIndex,
    originalId: contributor.originalId,
    projectionStatus: GPU_LIVE_TRACE_PROJECTION_STATUS,
    centerPx: normalizePair(contributor.centerPx),
    footprintPx: inverseConicFootprint(inverseConic),
    coverageWeight: round(contributor.coverageWeight),
    inverseConic,
    viewDepth: contributor.viewDepth,
    opacity: round(contributor.opacity),
    tileIndex: contributor.tileIndex,
    refIndex: contributor.gpuLiveRefIndex,
  };
}

function retainedContributorTraceEntry(contributor) {
  return {
    splatIndex: contributor.splatIndex,
    originalId: contributor.originalId,
    retentionStatus: "retained",
    retentionWeight: round(contributor.retentionWeight),
    occlusionWeight: round(contributor.occlusionWeight),
    overflowReason: "none",
    retentionBand: "middle",
    tileIndex: contributor.tileIndex,
    refIndex: contributor.gpuLiveRefIndex,
  };
}

function orderedContributorTraceEntry(contributor, orderIndex) {
  return {
    splatIndex: contributor.splatIndex,
    originalId: contributor.originalId,
    orderIndex,
    viewRank: contributor.viewRank,
    viewDepth: contributor.viewDepth,
    tieBreakKey: [
      `rank:${contributor.viewRank}`,
      `depth:${contributor.viewDepth}`,
      `original:${contributor.originalId}`,
      `splat:${contributor.splatIndex}`,
    ].join("|"),
    orderBackend: GPU_LIVE_TRACE_ORDER_BACKEND,
    refIndex: contributor.gpuLiveRefIndex,
  };
}

function tileAddressForAnchor(anchorPixel, {
  tileSizePx,
  tileColumns,
  tileRows,
  viewportWidth,
  viewportHeight,
}) {
  if (anchorPixel?.canonicalTileAddress) {
    return {
      tileSizePx,
      ...anchorPixel.canonicalTileAddress,
    };
  }
  const safeTileSizePx = positiveInteger(tileSizePx, "tileSizePx");
  const safeTileColumns = positiveInteger(
    tileColumns ?? Math.max(1, Math.ceil((viewportWidth ?? 1) / safeTileSizePx)),
    "tileColumns",
  );
  const safeTileRows = positiveInteger(
    tileRows ?? Math.max(1, Math.ceil((viewportHeight ?? 1) / safeTileSizePx)),
    "tileRows",
  );
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

function inverseConicFootprint([xx, xy, yy]) {
  const trace = xx + yy;
  const discriminant = Math.sqrt(Math.max((xx - yy) * (xx - yy) + 4 * xy * xy, 0));
  const lambdaSmall = 0.5 * (trace - discriminant);
  const lambdaLarge = 0.5 * (trace + discriminant);
  if (lambdaSmall <= 0 || lambdaLarge <= 0) {
    return {
      majorRadiusPx: 0,
      minorRadiusPx: 0,
      areaPx: 0,
    };
  }
  const major = 1 / Math.sqrt(lambdaSmall);
  const minor = 1 / Math.sqrt(lambdaLarge);
  return {
    majorRadiusPx: round(major),
    minorRadiusPx: round(minor),
    areaPx: round(Math.PI * major * minor),
  };
}

function lookupFiniteSideEvidence(source, splatIndex) {
  if (source instanceof Map) {
    return source.get(splatIndex);
  }
  if (typeof source === "function") {
    return source(splatIndex);
  }
  if (Array.isArray(source) || source instanceof Float32Array) {
    return source[splatIndex];
  }
  if (source && typeof source === "object") {
    return source[splatIndex];
  }
  return undefined;
}

function hasSourceColor(sourceColors, splatIndex) {
  const value = sourceColors instanceof Map
    ? sourceColors.get(splatIndex)
    : typeof sourceColors === "function"
      ? sourceColors(splatIndex)
      : Array.isArray(sourceColors) || sourceColors instanceof Float32Array
        ? sourceColors.slice(splatIndex * 3, splatIndex * 3 + 3)
        : sourceColors && typeof sourceColors === "object"
          ? sourceColors[splatIndex]
          : null;
  return (Array.isArray(value) || value instanceof Float32Array) &&
    value.length >= 3 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Number.isFinite(value[2]);
}

function compareGpuLiveContributorOrder(left, right) {
  return (
    left.viewRank - right.viewRank ||
    left.viewDepth - right.viewDepth ||
    left.originalId - right.originalId ||
    left.splatIndex - right.splatIndex ||
    left.gpuLiveRefIndex - right.gpuLiveRefIndex
  );
}

function finiteOrBlock(value, field, blockers, refIndex) {
  if (Number.isFinite(value)) {
    return value;
  }
  blockers.push({
    field,
    reason: `gpu-live readback ref ${refIndex} has non-finite ${field}`,
  });
  return 0;
}

function integerOrBlock(value, field, blockers, refIndex) {
  if (Number.isInteger(value) && value >= 0) {
    return value;
  }
  blockers.push({
    field,
    reason: `gpu-live readback ref ${refIndex} has non-integer ${field}`,
  });
  return 0;
}

function traceAnchor(anchorPixel) {
  return {
    id: anchorPixel.id,
    kind: anchorPixel.kind,
    x: anchorPixel.x,
    y: anchorPixel.y,
  };
}

function normalizePair(value) {
  return [value[0], value[1]];
}

function normalizeTriple(value) {
  return [value[0], value[1], value[2]];
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive integer`);
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
  return Number(value.toFixed(12));
}
