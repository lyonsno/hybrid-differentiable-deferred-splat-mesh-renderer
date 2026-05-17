const REQUIRED_FIELDS = Object.freeze([
  "legacyTileHeaders",
  "legacyTileRefs",
  "legacyTileCoverageWeights",
  "legacyAlphaParams",
  "sourceColorRows",
  "sourceOpacityRows",
]);

export function summarizeLiveCompositorBufferReadback({
  observation = {},
  anchors = [],
  legacyTileHeaders,
  legacyTileRefs,
  legacyTileCoverageWeights,
  legacyAlphaParams,
  legacyTileScatterCursors,
  sourceColors,
  sourceOpacities,
  frameId = null,
  readbackStage = "after-gpu-arena-dispatch-before-composite-tiles",
  alphaParamRefCapacity,
} = {}) {
  const normalizedAnchors = normalizeAnchors(anchors);
  const missingFields = missingReadbackFields({
    legacyTileHeaders,
    legacyTileRefs,
    legacyTileCoverageWeights,
    legacyAlphaParams,
    sourceColors,
    sourceOpacities,
  });
  const complete = missingFields.length === 0;
  const rows = normalizedAnchors.map((anchor) => complete
    ? summarizeAnchorSlice({
        anchor,
        legacyTileHeaders,
        legacyTileRefs,
        legacyTileCoverageWeights,
        legacyAlphaParams,
        legacyTileScatterCursors,
        sourceColors,
        sourceOpacities,
        alphaParamRefCapacity,
      })
    : missingAnchorSlice(anchor));

  return {
    classification: complete && rows.length > 0
      ? "buffer-readback-complete"
      : "buffer-readback-underinstrumented",
    observation: normalizeObservation(observation),
    readbackStage,
    frameId: finiteOrNull(frameId),
    missingFields,
    rows,
  };
}

function missingReadbackFields({
  legacyTileHeaders,
  legacyTileRefs,
  legacyTileCoverageWeights,
  legacyAlphaParams,
  legacyTileScatterCursors,
  sourceColors,
  sourceOpacities,
}) {
  const missing = [];
  if (!isTypedArrayLike(legacyTileHeaders)) missing.push("legacyTileHeaders");
  if (!isTypedArrayLike(legacyTileRefs)) missing.push("legacyTileRefs");
  if (!isTypedArrayLike(legacyTileCoverageWeights)) missing.push("legacyTileCoverageWeights");
  if (!isTypedArrayLike(legacyAlphaParams)) missing.push("legacyAlphaParams");
  if (!isTypedArrayLike(sourceColors)) missing.push("sourceColorRows");
  if (!isTypedArrayLike(sourceOpacities)) missing.push("sourceOpacityRows");
  return REQUIRED_FIELDS.filter((field) => missing.includes(field));
}

function summarizeAnchorSlice({
  anchor,
  legacyTileHeaders,
  legacyTileRefs,
  legacyTileCoverageWeights,
  legacyAlphaParams,
  legacyTileScatterCursors,
  sourceColors,
  sourceOpacities,
  alphaParamRefCapacity,
}) {
  const headerBase = anchor.tileAddress.tileIndex * 4;
  const headerRange = {
    tileIndex: anchor.tileAddress.tileIndex,
    offset: uintAt(legacyTileHeaders, headerBase),
    count: uintAt(legacyTileHeaders, headerBase + 1),
    projectedCount: uintAt(legacyTileHeaders, headerBase + 2),
    flags: uintAt(legacyTileHeaders, headerBase + 3),
  };
  const scatterCount = isTypedArrayLike(legacyTileScatterCursors)
    ? uintAt(legacyTileScatterCursors, anchor.tileAddress.tileIndex)
    : 0;
  const effectiveCount = Math.max(headerRange.count, scatterCount);
  const refCapacity = Number.isInteger(alphaParamRefCapacity) && alphaParamRefCapacity > 0
    ? alphaParamRefCapacity
    : Math.floor(legacyAlphaParams.length / 8);
  const liveRefCapacity = Math.min(
    Math.floor(legacyTileRefs.length / 4),
    legacyTileCoverageWeights.length,
    refCapacity,
  );
  const refs = [];
  const requestedEnd = headerRange.offset + effectiveCount;
  const end = Math.min(requestedEnd, liveRefCapacity);
  for (let refIndex = headerRange.offset; refIndex < end; refIndex += 1) {
    refs.push(summarizeRefRow({
      refIndex,
      legacyTileRefs,
      legacyTileCoverageWeights,
      legacyAlphaParams,
      sourceColors,
      sourceOpacities,
      refCapacity,
    }));
  }
  return {
    anchorId: anchor.id,
    anchorPixel: { id: anchor.id, x: anchor.x, y: anchor.y },
    tileAddress: anchor.tileAddress,
    status: "buffer-readback-present",
    headerRange: {
      ...headerRange,
      scatterCount,
      effectiveCount,
      liveRefCapacity,
      requestedEnd,
      refWindowStatus: refWindowStatus(headerRange.offset, requestedEnd, liveRefCapacity),
      truncatedCount: Math.max(0, requestedEnd - end),
    },
    refs,
    refCount: refs.length,
  };
}

function refWindowStatus(offset, requestedEnd, liveRefCapacity) {
  if (offset >= liveRefCapacity) {
    return "header-offset-outside-live-ref-buffer";
  }
  if (requestedEnd > liveRefCapacity) {
    return "header-range-truncated-by-live-ref-buffer";
  }
  return "header-range-contained";
}

function summarizeRefRow({
  refIndex,
  legacyTileRefs,
  legacyTileCoverageWeights,
  legacyAlphaParams,
  sourceColors,
  sourceOpacities,
  refCapacity,
}) {
  const refBase = refIndex * 4;
  const splatIndex = uintAt(legacyTileRefs, refBase);
  const primaryBase = refIndex * 4;
  const conicBase = (refCapacity + refIndex) * 4;
  return {
    refIndex,
    splatIndex,
    originalId: uintAt(legacyTileRefs, refBase + 1),
    tileIndex: uintAt(legacyTileRefs, refBase + 2),
    recordIndex: uintAt(legacyTileRefs, refBase + 3),
    coverageWeight: finiteOrNull(legacyTileCoverageWeights[refIndex]),
    alphaParams: {
      primary: {
        opacity: finiteOrNull(legacyAlphaParams[primaryBase]),
        centerPx: [
          finiteOrNull(legacyAlphaParams[primaryBase + 1]),
          finiteOrNull(legacyAlphaParams[primaryBase + 2]),
        ],
        viewRank: finiteOrNull(legacyAlphaParams[primaryBase + 3]),
      },
      inverseConic: [
        finiteOrNull(legacyAlphaParams[conicBase]),
        finiteOrNull(legacyAlphaParams[conicBase + 1]),
        finiteOrNull(legacyAlphaParams[conicBase + 2]),
      ],
    },
    sourceColor: sourceColorRow(sourceColors, splatIndex),
    sourceOpacity: finiteOrNull(sourceOpacities[splatIndex]),
  };
}

function missingAnchorSlice(anchor) {
  return {
    anchorId: anchor.id,
    anchorPixel: { id: anchor.id, x: anchor.x, y: anchor.y },
    tileAddress: anchor.tileAddress,
    status: "buffer-readback-missing",
    headerRange: null,
    refs: [],
    refCount: 0,
  };
}

function normalizeAnchors(anchors) {
  if (!Array.isArray(anchors)) {
    return [];
  }
  return anchors
    .map((anchor) => {
      const tileAddress = normalizeTileAddress(anchor?.tileAddress ?? anchor?.canonicalTileAddress);
      const id = typeof anchor?.id === "string" ? anchor.id : "";
      const x = finiteOrNull(anchor?.x);
      const y = finiteOrNull(anchor?.y);
      if (!id || !tileAddress || x === null || y === null) {
        return null;
      }
      return { id, x, y, tileAddress };
    })
    .filter(Boolean);
}

function normalizeTileAddress(tileAddress) {
  if (!tileAddress || typeof tileAddress !== "object") {
    return null;
  }
  const tileIndex = nonNegativeInteger(tileAddress.tileIndex);
  const tileX = nonNegativeInteger(tileAddress.tileX);
  const tileY = nonNegativeInteger(tileAddress.tileY);
  const tileSizePx = nonNegativeInteger(tileAddress.tileSizePx);
  const localX = finiteOrNull(tileAddress.localX);
  const localY = finiteOrNull(tileAddress.localY);
  if (tileIndex === null || tileX === null || tileY === null || tileSizePx === null) {
    return null;
  }
  return { tileSizePx, tileX, tileY, tileIndex, localX, localY };
}

function normalizeObservation(observation) {
  if (!observation || typeof observation !== "object") {
    return {};
  }
  return { ...observation };
}

function sourceColorRow(sourceColors, splatIndex) {
  const base = splatIndex * 3;
  return [
    finiteOrNull(sourceColors[base]),
    finiteOrNull(sourceColors[base + 1]),
    finiteOrNull(sourceColors[base + 2]),
  ];
}

function uintAt(values, index) {
  const value = values[index];
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(6)) : null;
}

function isTypedArrayLike(value) {
  return ArrayBuffer.isView(value) && typeof value.length === "number";
}
