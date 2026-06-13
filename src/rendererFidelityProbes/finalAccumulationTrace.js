import { BAND_ORDER_BACKEND } from "./bandOrderTrace.js";
import { PIXEL_CONTRIBUTOR_TRACE_SCHEMA } from "./pixelContributorTraceSchema.js";

export const BLACK_BAND_FINAL_ACCUMULATION_ANCHOR = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.find(
  (anchor) => anchor.id === "black-band-dropout-2300-1055",
);

const DEFAULT_CLEAR_COLOR = Object.freeze([0.02, 0.02, 0.04]);
const DEFAULT_DISPATCH_CACHE = Object.freeze({
  clearFrameId: 0,
  buildFrameId: 0,
  compositeFrameId: 0,
});
const DEFAULT_RENDERER_METADATA = Object.freeze({
  requestedRenderer: "tile-local-visible",
  effectiveRenderer: "tile-local-visible",
});
const DEFAULT_DEFERRED_FIELDS = Object.freeze({
  preserved: true,
  deferredSurface: null,
  missingReason: "production deferred G-buffer voting is outside the trace packet scope",
});
const SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_MASK = 1 | 8;
const SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE = 8;
const SOURCE_FRONTIER_SUPPORT_FALLOFF_SCALE = 0.5;
const SOURCE_FRONTIER_COLOR_TRANSFER_GAP_SCALE = 0.1;
const SOURCE_FRONTIER_COLOR_OCCLUSION_GAP_SCALE = 0.5;

export function buildFinalColorAccumulationTraceRecord({
  anchorPixel = BLACK_BAND_FINAL_ACCUMULATION_ANCHOR,
  contributors = [],
  sourceColors,
  projectedContributors = [],
  retainedContributors = null,
  orderedContributors = null,
  preserveContributorOrder = false,
  dispatchCache = DEFAULT_DISPATCH_CACHE,
  rendererMetadata = DEFAULT_RENDERER_METADATA,
  deferredFields = DEFAULT_DEFERRED_FIELDS,
  clearColor = DEFAULT_CLEAR_COLOR,
  tileSizePx = anchorPixel?.canonicalTileAddress?.tileSizePx ?? 16,
  tileColumns,
} = {}) {
  if (!anchorPixel) {
    throw new Error("black-band-dropout-2300-1055 anchor is missing from the pixel contributor trace schema");
  }
  const tileAddress = tileAddressForAnchor(anchorPixel, tileSizePx, tileColumns);
  const orderedRuntimeContributors = preserveContributorOrder
    ? selectAccumulationContributorsInInputOrder(contributors, anchorPixel, tileAddress)
    : selectAccumulationContributors(contributors, anchorPixel, tileAddress);
  const blockers = [];
  if (retainedContributors === null) {
    blockers.push({
      field: "retainedContributors",
      reason: "tileLocal.perPixelRetainedContributors not landed; accumulation uses ordered retained runtime contributors only",
    });
  }
  if (orderedRuntimeContributors.length === 0) {
    blockers.push({
      field: "finalColorAccumulation.steps",
      reason: `tileLocal.perPixelFinalColorAccumulation missing contributors for ${anchorPixel.id}`,
    });
  }

  const finalColorAccumulation = composeFinalColorAccumulationSteps({
    anchorPixel,
    tileAddress,
    contributors: orderedRuntimeContributors,
    sourceColors,
    clearColor,
    blockers,
  });

  return {
    schemaVersion: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.schemaVersion,
    anchorPixel: traceAnchor(anchorPixel),
    tileAddress,
    projectedContributors: Array.isArray(projectedContributors) ? projectedContributors : [],
    retainedContributors: Array.isArray(retainedContributors) ? retainedContributors : [],
    orderedContributors: Array.isArray(orderedContributors)
      ? orderedContributors
      : orderedRuntimeContributors.map(orderedContributorTraceEntry),
    finalColorAccumulation,
    dispatchCache: {
      tileIndex: tileAddress.tileIndex,
      clearFrameId: dispatchCache.clearFrameId ?? 0,
      buildFrameId: dispatchCache.buildFrameId ?? 0,
      compositeFrameId: dispatchCache.compositeFrameId ?? 0,
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
}

export function buildPerPixelFinalColorAccumulationTraces({
  contributors = [],
  contributorsByAnchorId = new Map(),
  sourceColors,
  projectedContributorsByAnchorId = new Map(),
  retainedContributorsByAnchorId = new Map(),
  orderedContributorsByAnchorId = new Map(),
  dispatchCache = DEFAULT_DISPATCH_CACHE,
  rendererMetadata = DEFAULT_RENDERER_METADATA,
  deferredFields = DEFAULT_DEFERRED_FIELDS,
  clearColor = DEFAULT_CLEAR_COLOR,
  tileSizePx = 16,
  tileColumns,
  anchors = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors,
} = {}) {
  return anchors.map((anchorPixel) => {
    const orderedContributors = lookupOptionalAnchorList(orderedContributorsByAnchorId, anchorPixel.id);
    const record = buildFinalColorAccumulationTraceRecord({
      anchorPixel,
      contributors: lookupOptionalAnchorList(contributorsByAnchorId, anchorPixel.id) ?? contributors,
      sourceColors,
      projectedContributors: lookupAnchorList(projectedContributorsByAnchorId, anchorPixel.id),
      retainedContributors: lookupAnchorList(retainedContributorsByAnchorId, anchorPixel.id),
      orderedContributors,
      preserveContributorOrder: orderedContributors !== null,
      dispatchCache,
      rendererMetadata,
      deferredFields,
      clearColor,
      tileSizePx,
      tileColumns,
    });

    return {
      status: record.finalColorAccumulation?.steps?.length > 0 ? "present" : "blocked",
      anchorPixel: record.anchorPixel,
      tileAddress: record.tileAddress,
      projectedContributors: record.projectedContributors,
      retainedContributors: record.retainedContributors,
      orderedContributors: record.orderedContributors,
      finalColorAccumulation: record.finalColorAccumulation,
      blockers: Array.isArray(record.blockers) ? record.blockers : [],
      traceRecord: record,
    };
  });
}

export function buildPerPixelFinalColorAccumulationTrace(record) {
  if (!record || typeof record !== "object") {
    return [];
  }
  return [{
    status: record.finalColorAccumulation?.steps?.length > 0 ? "present" : "blocked",
    anchorPixel: record.anchorPixel,
    tileAddress: record.tileAddress,
    finalColorAccumulation: record.finalColorAccumulation,
    blockers: Array.isArray(record.blockers) ? record.blockers : [],
  }];
}

function lookupAnchorList(byAnchorId, anchorId) {
  if (byAnchorId instanceof Map) {
    return Array.isArray(byAnchorId.get(anchorId)) ? byAnchorId.get(anchorId) : [];
  }
  if (byAnchorId && typeof byAnchorId === "object") {
    return Array.isArray(byAnchorId[anchorId]) ? byAnchorId[anchorId] : [];
  }
  return [];
}

function lookupOptionalAnchorList(byAnchorId, anchorId) {
  if (byAnchorId instanceof Map) {
    return byAnchorId.has(anchorId) && Array.isArray(byAnchorId.get(anchorId))
      ? byAnchorId.get(anchorId)
      : null;
  }
  if (byAnchorId && typeof byAnchorId === "object") {
    return Object.prototype.hasOwnProperty.call(byAnchorId, anchorId) && Array.isArray(byAnchorId[anchorId])
      ? byAnchorId[anchorId]
      : null;
  }
  return null;
}

function composeFinalColorAccumulationSteps({
  anchorPixel,
  tileAddress,
  contributors,
  sourceColors,
  clearColor,
  blockers,
}) {
  const pixelCenter = [anchorPixel.x + 0.5, anchorPixel.y + 0.5];
  let runningColor = normalizeColor(clearColor, "clearColor");
  let remainingTransmission = 1;
  const steps = [];

  for (let orderIndex = 0; orderIndex < contributors.length; orderIndex += 1) {
    const contributor = contributors[orderIndex];
    const sourceColor = resolveSourceColor(sourceColors, contributor.splatIndex, blockers);
    const tileCoverageWeight = Math.max(finiteNumber(contributor.coverageWeight, "contributor.coverageWeight"), 0);
    const rawTileLocalSupportWeight = contributor.tileLocalSupportWeight ?? contributor.conicSupportWeight ?? 0;
    const tileLocalSupportWeight = Math.max(
      tileCoverageWeight,
      Number.isFinite(rawTileLocalSupportWeight) ? rawTileLocalSupportWeight : 0,
    );
    const hasTileSupport = tileCoverageWeight > 0 || tileLocalSupportWeight > 0;
    const opacity = Math.min(Math.max(finiteNumber(contributor.opacity, "contributor.opacity"), 0), 0.999);
    const transmittanceBefore = remainingTransmission;
    const pixelCoverageWeight = hasTileSupport
      ? conicPixelWeight(contributor.centerPx, contributor.inverseConic, pixelCenter)
      : 0;
    const sourceFrontierSupportPixelWeight = hasTileSupport
      ? sourceFrontierSupportPixelWeightFromContributor(contributor, pixelCenter)
      : 0;
    const alphaTransfer = sourceFrontierAlphaTransferWeight({
      pixelCoverageWeight,
      tileCoverageWeight,
      tileLocalSupportWeight,
      sourceFrontierSupportPixelWeight,
      contributor,
    });
    const coverageAlpha = hasTileSupport
      ? clamp01(1 - Math.pow(1 - opacity, alphaTransfer.weight))
      : 0;
    const colorAlpha = hasTileSupport
      ? clamp01(1 - Math.pow(1 - opacity, alphaTransfer.colorWeight))
      : 0;
    const colorOcclusionAlpha = hasTileSupport
      ? sourceFrontierColorOcclusionAlpha(colorAlpha, coverageAlpha)
      : 0;
    const contributionColor = sourceColor.map((channel) => round(channel * colorAlpha));
    const nextRunningColor = hasTileSupport
      ? sourceColor.map((channel, index) => channel * colorAlpha + runningColor[index] * (1 - colorOcclusionAlpha))
      : runningColor;
    const transmittanceAfter = hasTileSupport
      ? remainingTransmission * (1 - coverageAlpha)
      : remainingTransmission;
    remainingTransmission = transmittanceAfter;
    runningColor = nextRunningColor;

    steps.push({
      splatIndex: nonNegativeInteger(contributor.splatIndex, "contributor.splatIndex"),
      originalId: nonNegativeInteger(contributor.originalId ?? contributor.splatIndex, "contributor.originalId"),
      orderIndex,
      coverageWeight: round(pixelCoverageWeight),
      sourceFrontierSupportPixelWeight: round(sourceFrontierSupportPixelWeight),
      tileLocalSupportWeight: round(tileLocalSupportWeight),
      alphaTransferWeight: round(alphaTransfer.weight),
      colorTransferWeight: round(alphaTransfer.colorWeight),
      sourceFrontierAlphaSupport: alphaTransfer.support,
      opacity: round(opacity),
      coverageAlpha: round(coverageAlpha),
      colorAlpha: round(colorAlpha),
      colorOcclusionAlpha: round(colorOcclusionAlpha),
      transmittanceBefore: round(transmittanceBefore),
      transmittanceAfter: round(transmittanceAfter),
      sourceColor: sourceColor.map(round),
      contributionColor,
      runningColor: runningColor.map(round),
      accumulationStatus: hasTileSupport ? "accumulated" : "skipped-zero-tile-coverage",
      tileCoverageWeight: round(tileCoverageWeight),
      viewRank: Number.isInteger(contributor.viewRank) ? contributor.viewRank : orderIndex,
      viewDepth: Number.isFinite(contributor.viewDepth) ? contributor.viewDepth : 0,
      tileIndex: tileAddress.tileIndex,
    });
  }

  return {
    steps,
    outputColor: [
      round(runningColor[0]),
      round(runningColor[1]),
      round(runningColor[2]),
      round(1 - remainingTransmission),
    ],
    clearColor: normalizeColor(clearColor, "clearColor").map(round),
    remainingTransmittance: round(remainingTransmission),
  };
}

function sourceFrontierColorOcclusionAlpha(colorAlpha, coverageAlpha) {
  const normalizedColorAlpha = clamp01(colorAlpha);
  const normalizedCoverageAlpha = clamp01(coverageAlpha);
  const alphaColorGap = Math.max(normalizedCoverageAlpha - normalizedColorAlpha, 0);
  return clamp01(normalizedColorAlpha + alphaColorGap * SOURCE_FRONTIER_COLOR_OCCLUSION_GAP_SCALE);
}

function sourceFrontierAlphaTransferWeight({
  pixelCoverageWeight,
  tileCoverageWeight,
  tileLocalSupportWeight,
  sourceFrontierSupportPixelWeight,
  contributor,
}) {
  const normalizedPixelWeight = Math.max(Number.isFinite(pixelCoverageWeight) ? pixelCoverageWeight : 0, 0);
  const candidateSourceClassMask = Number.isInteger(contributor?.candidateSourceClassMask)
    ? contributor.candidateSourceClassMask
    : 0;
  if ((candidateSourceClassMask & SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_MASK) === 0) {
    return { weight: normalizedPixelWeight, colorWeight: normalizedPixelWeight, support: "none" };
  }

  const normalizedTileSupportWeight = Math.max(
    Math.max(Number.isFinite(tileCoverageWeight) ? tileCoverageWeight : 0, 0),
    Math.max(Number.isFinite(tileLocalSupportWeight) ? tileLocalSupportWeight : 0, 0),
  );
  const supportWeight =
    normalizedTileSupportWeight *
    SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE *
    Math.max(Number.isFinite(sourceFrontierSupportPixelWeight) ? sourceFrontierSupportPixelWeight : 0, 0);
  if (supportWeight <= normalizedPixelWeight) {
    return { weight: normalizedPixelWeight, colorWeight: normalizedPixelWeight, support: "none" };
  }
  const supportColorWeight = Math.max(
    normalizedPixelWeight,
    Math.max(Number.isFinite(sourceFrontierSupportPixelWeight) ? sourceFrontierSupportPixelWeight : 0, 0),
  );
  const colorGap = Math.max(supportWeight - supportColorWeight, 0);
  const colorWeight = supportColorWeight + colorGap * SOURCE_FRONTIER_COLOR_TRANSFER_GAP_SCALE;
  return {
    weight: supportWeight,
    colorWeight: Math.min(supportWeight, colorWeight),
    support: "foreground-spatial-support",
  };
}

function selectAccumulationContributors(contributors, anchorPixel, tileAddress) {
  if (!Array.isArray(contributors)) {
    throw new TypeError("final accumulation contributors must be an array");
  }
  return contributors
    .filter((contributor) => contributorCanEnterFinalAccumulation(contributor, anchorPixel, tileAddress))
    .sort(compareAccumulationOrder);
}

function selectAccumulationContributorsInInputOrder(contributors, anchorPixel, tileAddress) {
  if (!Array.isArray(contributors)) {
    throw new TypeError("final accumulation contributors must be an array");
  }
  return contributors.filter((contributor) =>
    contributorCanEnterFinalAccumulation(contributor, anchorPixel, tileAddress)
  );
}

function contributorCanEnterFinalAccumulation(contributor, anchorPixel, tileAddress) {
  if (!contributor || typeof contributor !== "object") return false;
  if (contributor.retained === false || contributor.retentionStatus === "dropped" || contributor.contributorIndex === -1) {
    return false;
  }
  if (contributor.tileIndex !== tileAddress.tileIndex) {
    return false;
  }
  if (!Array.isArray(contributor.centerPx) || !Array.isArray(contributor.inverseConic)) {
    return false;
  }
  const tileCoverageWeight = Math.max(Number.isFinite(contributor.coverageWeight) ? contributor.coverageWeight : 0, 0);
  const rawTileLocalSupportWeight = Number.isFinite(contributor.tileLocalSupportWeight)
    ? contributor.tileLocalSupportWeight
    : Number.isFinite(contributor.conicSupportWeight)
      ? contributor.conicSupportWeight
      : 0;
  const tileLocalSupportWeight = Math.max(tileCoverageWeight, rawTileLocalSupportWeight, 0);
  if (tileCoverageWeight <= 0 && tileLocalSupportWeight <= 0) {
    return false;
  }
  return conicPixelWeight(contributor.centerPx, contributor.inverseConic, [anchorPixel.x + 0.5, anchorPixel.y + 0.5]) >= 0;
}

function orderedContributorTraceEntry(contributor, orderIndex) {
  return {
    splatIndex: nonNegativeInteger(contributor.splatIndex, "contributor.splatIndex"),
    originalId: nonNegativeInteger(contributor.originalId ?? contributor.splatIndex, "contributor.originalId"),
    orderIndex,
    viewRank: Number.isInteger(contributor.viewRank) ? contributor.viewRank : orderIndex,
    viewDepth: Number.isFinite(contributor.viewDepth) ? contributor.viewDepth : 0,
    tieBreakKey: [
      `rank:${Number.isInteger(contributor.viewRank) ? contributor.viewRank : orderIndex}`,
      `depth:${Number.isFinite(contributor.viewDepth) ? contributor.viewDepth : 0}`,
      `original:${nonNegativeInteger(contributor.originalId ?? contributor.splatIndex, "contributor.originalId")}`,
      `splat:${nonNegativeInteger(contributor.splatIndex, "contributor.splatIndex")}`,
    ].join("|"),
    orderBackend: BAND_ORDER_BACKEND,
    coverageWeight: Number.isFinite(contributor.coverageWeight) ? round(Math.max(contributor.coverageWeight, 0)) : 0,
    opacity: Number.isFinite(contributor.opacity) ? round(clamp01(contributor.opacity)) : 0,
    tileIndex: Number.isInteger(contributor.tileIndex) ? contributor.tileIndex : null,
  };
}

function compareAccumulationOrder(left, right) {
  return (
    compareOptionalInteger(left.viewRank, right.viewRank) ||
    finiteOrZero(left.viewDepth) - finiteOrZero(right.viewDepth) ||
    nonNegativeInteger(left.originalId ?? left.splatIndex, "left.originalId") -
      nonNegativeInteger(right.originalId ?? right.splatIndex, "right.originalId") ||
    nonNegativeInteger(left.splatIndex, "left.splatIndex") - nonNegativeInteger(right.splatIndex, "right.splatIndex")
  );
}

function conicPixelWeightWithFalloffScale(centerPx, inverseConic, pixelCenter, falloffScale) {
  const center = normalizePair(centerPx, "centerPx");
  const conic = normalizeTriple(inverseConic, "inverseConic");
  const dx = pixelCenter[0] - center[0];
  const dy = pixelCenter[1] - center[1];
  const mahalanobis2 = conic[0] * dx * dx + 2 * conic[1] * dx * dy + conic[2] * dy * dy;
  return Math.exp(-falloffScale * Math.max(mahalanobis2, 0));
}

function conicPixelWeight(centerPx, inverseConic, pixelCenter) {
  return conicPixelWeightWithFalloffScale(centerPx, inverseConic, pixelCenter, 2);
}

function sourceFrontierSupportPixelWeightFromContributor(contributor, pixelCenter) {
  return conicPixelWeightWithFalloffScale(
    contributor.centerPx,
    contributor.inverseConic,
    pixelCenter,
    SOURCE_FRONTIER_SUPPORT_FALLOFF_SCALE,
  );
}

function resolveSourceColor(sourceColors, splatIndex, blockers) {
  const color = sourceColorValue(sourceColors, splatIndex);
  if (color) {
    return color;
  }
  blockers.push({
    field: `finalColorAccumulation.steps.sourceColor[${splatIndex}]`,
    reason: "source color unavailable for final accumulation trace",
  });
  return [0, 0, 0];
}

function sourceColorValue(sourceColors, splatIndex) {
  if (sourceColors instanceof Map) {
    return normalizeColor(sourceColors.get(splatIndex), "sourceColor");
  }
  if (sourceColors instanceof Float32Array || Array.isArray(sourceColors)) {
    const base = splatIndex * 3;
    if (base + 2 < sourceColors.length) {
      return normalizeColor([sourceColors[base], sourceColors[base + 1], sourceColors[base + 2]], "sourceColor");
    }
  }
  if (typeof sourceColors === "function") {
    return normalizeColor(sourceColors(splatIndex), "sourceColor");
  }
  if (sourceColors && typeof sourceColors === "object") {
    return normalizeColor(sourceColors[splatIndex], "sourceColor");
  }
  return null;
}

function tileAddressForAnchor(anchorPixel, tileSizePx, tileColumns) {
  if (anchorPixel.canonicalTileAddress) {
    return {
      tileSizePx,
      ...anchorPixel.canonicalTileAddress,
    };
  }
  const safeTileSizePx = positiveInteger(tileSizePx, "tileSizePx");
  const safeTileColumns = positiveInteger(tileColumns, "tileColumns");
  const tileX = Math.floor(anchorPixel.x / safeTileSizePx);
  const tileY = Math.floor(anchorPixel.y / safeTileSizePx);
  return {
    tileSizePx: safeTileSizePx,
    tileX,
    tileY,
    tileIndex: tileY * safeTileColumns + tileX,
    localX: anchorPixel.x - tileX * safeTileSizePx,
    localY: anchorPixel.y - tileY * safeTileSizePx,
  };
}

function traceAnchor(anchorPixel) {
  return {
    id: anchorPixel.id,
    kind: anchorPixel.kind,
    x: anchorPixel.x,
    y: anchorPixel.y,
  };
}

function normalizeColor(value, label) {
  if (!Array.isArray(value) && !(value instanceof Float32Array)) {
    return null;
  }
  if (value.length < 3) {
    return null;
  }
  const color = [value[0], value[1], value[2]];
  if (!color.every(Number.isFinite)) {
    return null;
  }
  return color;
}

function normalizePair(value, label) {
  if (!Array.isArray(value) || value.length < 2 || !Number.isFinite(value[0]) || !Number.isFinite(value[1])) {
    throw new TypeError(`${label} must be a finite pair`);
  }
  return [value[0], value[1]];
}

function normalizeTriple(value, label) {
  if (!Array.isArray(value) || value.length < 3 || !Number.isFinite(value[0]) || !Number.isFinite(value[1]) || !Number.isFinite(value[2])) {
    throw new TypeError(`${label} must be a finite triple`);
  }
  return [value[0], value[1], value[2]];
}

function compareOptionalInteger(left, right) {
  const leftRank = Number.isInteger(left) ? left : Number.MAX_SAFE_INTEGER;
  const rightRank = Number.isInteger(right) ? right : Number.MAX_SAFE_INTEGER;
  return leftRank - rightRank;
}

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`);
  }
  return value;
}

function finiteOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
  return value;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round(value) {
  return Number(value.toFixed(12));
}
