const DEFAULT_DISCONTINUITY_THRESHOLD = 0.5;
const HIGH_ANISOTROPY_RATIO = 16;

export function summarizeRetainedSetBoundaryDiscontinuity({
  tileHeaders,
  tileRefs,
  tileColumns,
  tileRows,
  maxRefsPerTile,
} = {}) {
  const columns = positiveInteger(tileColumns, "tileColumns");
  const rows = positiveInteger(tileRows, "tileRows");
  const retainedCap = positiveInteger(maxRefsPerTile, "maxRefsPerTile");
  if (!tileHeaders || !tileRefs) {
    throw new TypeError("tileHeaders and tileRefs are required");
  }

  const discontinuities = [];
  for (let tileY = 0; tileY < rows; tileY += 1) {
    for (let tileX = 0; tileX + 1 < columns; tileX += 1) {
      discontinuities.push(compareAdjacentTiles({
        kind: "vertical",
        tileA: tileY * columns + tileX,
        tileB: tileY * columns + tileX + 1,
        tileHeaders,
        tileRefs,
        maxRefsPerTile: retainedCap,
      }));
    }
  }
  for (let tileY = 0; tileY + 1 < rows; tileY += 1) {
    for (let tileX = 0; tileX < columns; tileX += 1) {
      discontinuities.push(compareAdjacentTiles({
        kind: "horizontal",
        tileA: tileY * columns + tileX,
        tileB: (tileY + 1) * columns + tileX,
        tileHeaders,
        tileRefs,
        maxRefsPerTile: retainedCap,
      }));
    }
  }

  const maxDiscontinuity = discontinuities.reduce(
    (best, entry) => (!best || entry.retainedSetDiscontinuity > best.retainedSetDiscontinuity ? entry : best),
    null,
  );

  return {
    boundaryCount: discontinuities.length,
    maxRetainedSetDiscontinuity: maxDiscontinuity?.retainedSetDiscontinuity ?? 0,
    maxDiscontinuity,
    discontinuities,
  };
}

export function diagnoseTileCellArtifact({
  tileLocalStatus,
  currentFrameSignature = null,
  cachedFrameSignature = null,
  tileRefCustody = {},
  retentionAudit = null,
  boundary = null,
  alpha = {},
  conicShape = {},
  discontinuityThreshold = DEFAULT_DISCONTINUITY_THRESHOLD,
} = {}) {
  const staleState = isStaleState({ tileLocalStatus, currentFrameSignature, cachedFrameSignature });
  const cap = summarizeCapEvidence(tileRefCustody);
  const retainedBoundary = summarizeBoundaryEvidence(boundary);
  const alphaSaturated = alpha?.estimatedMaxAccumulatedAlpha >= 0.99 || alpha?.estimatedMinTransmittance <= 0.01;
  const conicSuspect = (conicShape?.maxAnisotropyRatio ?? 0) >= HIGH_ANISOTROPY_RATIO;

  let primaryCause = "underdetermined";
  const reasons = [];
  if (staleState) {
    primaryCause = "stale-diagnostic-state";
    reasons.push("current and cached tile-local frame state disagree");
  } else if (
    cap.hasCapPressure &&
    retainedBoundary.maxRetainedSetDiscontinuity >= discontinuityThreshold &&
    retainedBoundary.saturatedBoundary
  ) {
    primaryCause = "retained-ref-cap-tile-boundary-discontinuity";
    reasons.push("adjacent saturated tiles retain different contributor sets across a tile boundary");
  } else if (conicSuspect) {
    primaryCause = "coverage-conic-sampling-underdetermined";
    reasons.push("projection/conic anisotropy is high but retained-boundary evidence is not decisive");
  } else if (!alphaSaturated && alpha?.estimatedMaxAccumulatedAlpha != null) {
    primaryCause = "alpha-transmittance-underdetermined";
    reasons.push("alpha/transmittance is not saturated enough to exclude under-accumulation");
  }

  return {
    primaryCause,
    reasons,
    excludes: {
      staleState: !staleState,
      alphaUnderAccumulation: alphaSaturated,
      conicCoverageSampling: primaryCause === "retained-ref-cap-tile-boundary-discontinuity" && !conicSuspect,
      capSaturation: !cap.hasCapPressure,
    },
    evidence: {
      cap,
      retainedBoundary,
      retentionAudit: normalizeRetentionAuditEvidence(retentionAudit),
      alpha: {
        estimatedMaxAccumulatedAlpha: finiteOrNull(alpha?.estimatedMaxAccumulatedAlpha),
        estimatedMinTransmittance: finiteOrNull(alpha?.estimatedMinTransmittance),
        saturated: alphaSaturated,
      },
      conicShape: {
        maxAnisotropyRatio: finiteOrNull(conicShape?.maxAnisotropyRatio),
        suspect: conicSuspect,
      },
      staleState: {
        tileLocalStatus: typeof tileLocalStatus === "string" ? tileLocalStatus : null,
        currentFrameSignature,
        cachedFrameSignature,
        stale: staleState,
      },
    },
  };
}

function compareAdjacentTiles({ kind, tileA, tileB, tileHeaders, tileRefs, maxRefsPerTile }) {
  const leftIds = retainedOriginalIdsForTile(tileHeaders, tileRefs, tileA);
  const rightIds = retainedOriginalIdsForTile(tileHeaders, tileRefs, tileB);
  const leftSet = new Set(leftIds);
  const rightSet = new Set(rightIds);
  const intersection = [...leftSet].filter((id) => rightSet.has(id));
  const union = new Set([...leftSet, ...rightSet]);
  const retainedJaccard = union.size === 0 ? 1 : intersection.length / union.size;
  const leftOnlyOriginalIds = [...leftSet].filter((id) => !rightSet.has(id)).sort(compareNumbers);
  const rightOnlyOriginalIds = [...rightSet].filter((id) => !leftSet.has(id)).sort(compareNumbers);

  return {
    kind,
    tileA,
    tileB,
    retainedJaccard: round(retainedJaccard),
    retainedSetDiscontinuity: round(1 - retainedJaccard),
    retainedCountA: leftIds.length,
    retainedCountB: rightIds.length,
    saturatedA: leftIds.length >= maxRefsPerTile,
    saturatedB: rightIds.length >= maxRefsPerTile,
    leftOnlyOriginalIds,
    rightOnlyOriginalIds,
  };
}

function retainedOriginalIdsForTile(tileHeaders, tileRefs, tileIndex) {
  const headerBase = tileIndex * 4;
  const firstRef = tileHeaders[headerBase] ?? 0;
  const count = tileHeaders[headerBase + 1] ?? 0;
  const ids = [];
  for (let offset = 0; offset < count; offset += 1) {
    const refBase = (firstRef + offset) * 4;
    ids.push(tileRefs[refBase + 1] ?? tileRefs[refBase] ?? 0);
  }
  return ids;
}

function summarizeBoundaryEvidence(boundary) {
  const maxDiscontinuity = boundary?.maxDiscontinuity ?? null;
  return {
    boundaryCount: nonNegativeIntegerOrZero(boundary?.boundaryCount),
    maxRetainedSetDiscontinuity: finiteOrZero(boundary?.maxRetainedSetDiscontinuity),
    saturatedBoundary: Boolean(maxDiscontinuity?.saturatedA && maxDiscontinuity?.saturatedB),
    maxDiscontinuity,
  };
}

function summarizeCapEvidence(tileRefCustody) {
  const cappedTileCount = nonNegativeIntegerOrZero(tileRefCustody?.cappedTileCount);
  const saturatedRetainedTileCount = nonNegativeIntegerOrZero(tileRefCustody?.saturatedRetainedTileCount);
  const evictedTileEntryCount = nonNegativeIntegerOrZero(tileRefCustody?.evictedTileEntryCount);
  return {
    retainedTileEntryCount: nonNegativeIntegerOrZero(tileRefCustody?.retainedTileEntryCount),
    evictedTileEntryCount,
    cappedTileCount,
    saturatedRetainedTileCount,
    maxProjectedRefsPerTile: nonNegativeIntegerOrZero(tileRefCustody?.maxProjectedRefsPerTile),
    maxRetainedRefsPerTile: nonNegativeIntegerOrZero(tileRefCustody?.maxRetainedRefsPerTile),
    hasCapPressure: evictedTileEntryCount > 0 || cappedTileCount > 0 || saturatedRetainedTileCount > 0,
  };
}

function normalizeRetentionAuditEvidence(retentionAudit) {
  const fullFrame = retentionAudit?.fullFrame;
  if (!fullFrame) return null;
  return {
    addedByPolicyCount: nonNegativeIntegerOrZero(fullFrame.addedByPolicyCount),
    droppedByPolicyCount: nonNegativeIntegerOrZero(fullFrame.droppedByPolicyCount),
    addedRetentionWeightSum: finiteOrZero(fullFrame.addedRetentionWeightSum),
    droppedRetentionWeightSum: finiteOrZero(fullFrame.droppedRetentionWeightSum),
    addedOcclusionWeightSum: finiteOrZero(fullFrame.addedOcclusionWeightSum),
    droppedOcclusionWeightSum: finiteOrZero(fullFrame.droppedOcclusionWeightSum),
  };
}

function isStaleState({ tileLocalStatus, currentFrameSignature, cachedFrameSignature }) {
  if (tileLocalStatus === "stale") return true;
  return Boolean(currentFrameSignature && cachedFrameSignature && currentFrameSignature !== cachedFrameSignature);
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function nonNegativeIntegerOrZero(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function finiteOrZero(value) {
  return Number.isFinite(value) ? round(value) : 0;
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? round(value) : null;
}

function round(value) {
  return Number.isFinite(value) ? Number(value.toFixed(6)) : 0;
}

function compareNumbers(left, right) {
  return left - right;
}
