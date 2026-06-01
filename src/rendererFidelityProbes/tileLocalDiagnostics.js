export function summarizeTileLocalDiagnostics({
  debugMode = "final-color",
  plan,
  tileEntryCount = 0,
  tileHeaders,
  tileRefCustody,
  retentionAudit,
  tileCoverageWeights,
  alphaParamData,
  sourceOpacities,
  runtimeContributors,
  runtimeRefStatsReadback,
  traceCapacityEvidence,
} = {}) {
  const maxTileRefs = positiveInteger(plan?.maxTileRefs, "plan.maxTileRefs");
  const tileCount = positiveInteger(plan?.tileColumns, "plan.tileColumns") *
    positiveInteger(plan?.tileRows, "plan.tileRows");
  const refLimit = Math.min(nonNegativeInteger(tileEntryCount, "tileEntryCount"), maxTileRefs);
  const runtimeRefStats = normalizeRuntimeRefStatsReadback(runtimeRefStatsReadback);
  const observedTileRefs = summarizeTileRefs(tileHeaders, tileCount);
  const tileRefs = observedTileRefs.total > 0
    ? observedTileRefs
    : runtimeRefStats
      ? summarizeTileRefsFromRuntimeRefStats(runtimeRefStats, tileCount)
      : summarizeEstimatedTileRefs(tileRefCustody, tileCount);
  const normalizedTileRefCustody = normalizeTileRefCustody(tileRefCustody, tileRefs, runtimeRefStats);
  const coverageWeight = summarizeFloatRange(tileCoverageWeights, refLimit);
  const alpha = summarizeAlpha({
    alphaParamData,
    sourceOpacities,
    tileHeaders,
    tileCount,
    refLimit,
    maxTileRefs,
    tileCoverageWeights,
    tileRefs,
  });
  const conicShape = summarizeConicShape(alphaParamData, refLimit, maxTileRefs);
  const runtimeRefBudget = summarizeRuntimeRefBudget({
    plan,
    tileHeaders,
    tileRefs,
    tileRefCustody: normalizedTileRefCustody,
    runtimeContributors,
    runtimeRefStats,
    traceCapacityEvidence,
  });

  return {
    version: 1,
    debugMode,
    tileGrid: {
      columns: plan.tileColumns,
      rows: plan.tileRows,
      tileSizePx: plan.tileSizePx,
    },
    tileRefs,
    tileRefCustody: normalizedTileRefCustody,
    runtimeRefBudget,
    presentationFootprint: summarizePresentationFootprint({
      tileCount,
      tileRefs,
      runtimeRefBudget,
    }),
    retentionAudit: normalizeRetentionAudit(retentionAudit),
    coverageWeight,
    alpha,
    conicShape,
  };
}

function summarizePresentationFootprint({ tileCount, tileRefs, runtimeRefBudget }) {
  const frameTileCount = nonNegativeFiniteInteger(tileCount);
  const nonEmptyTileCount = nonNegativeFiniteInteger(tileRefs?.nonEmptyTiles);
  const retainedRefCount = nonNegativeFiniteInteger(tileRefs?.total);
  const nonEmptyTileRatio = frameTileCount > 0 ? round(nonEmptyTileCount / frameTileCount) : 0;
  const anchorEvidence = Array.isArray(runtimeRefBudget?.anchorTileEvidence)
    ? runtimeRefBudget.anchorTileEvidence
    : [];
  const anchorFinalRowsPresent = anchorEvidence.some((anchor) =>
    nonNegativeFiniteInteger(anchor?.traceFinalStepCount) > 0
  );
  const sparseFootprint = frameTileCount > 0 && nonEmptyTileRatio > 0 && nonEmptyTileRatio < 0.01;

  let classification = "telemetry-insufficient";
  let blocker = "";
  if (retainedRefCount <= 0 || nonEmptyTileCount <= 0) {
    classification = "no-retained-output";
    blocker = "No retained runtime tile refs are present for final-color presentation.";
  } else if (anchorFinalRowsPresent && sparseFootprint) {
    classification = "anchor-neighborhood-only-output";
    blocker = "Compact rows are present at traced anchors, but retained tiles cover less than 1% of the frame, so the global final-color canvas can remain below the nonblank threshold.";
  } else {
    classification = "frame-footprint-present";
  }

  return {
    classification,
    frameTileCount,
    nonEmptyTileCount,
    nonEmptyTileRatio,
    retainedRefCount,
    anchorFinalRowsPresent,
    blocker,
  };
}

function summarizeRuntimeRefBudget({
  plan,
  tileHeaders,
  tileRefs,
  tileRefCustody,
  runtimeContributors,
  runtimeRefStats,
  traceCapacityEvidence,
}) {
  const tileCount = positiveInteger(plan?.tileColumns, "plan.tileColumns") *
    positiveInteger(plan?.tileRows, "plan.tileRows");
  const retainedRuntimeRefs = nonNegativeFiniteInteger(
    runtimeRefStats?.retainedRefs ??
      tileRefCustody?.retainedTileEntryCount ??
      tileRefCustody?.headerRefCount ??
      tileRefs?.total
  );
  const effectiveRefsPerTile = tileCount > 0 ? round(retainedRuntimeRefs / tileCount) : 0;
  const anchors = normalizeTraceCapacityAnchors(traceCapacityEvidence?.anchors);
  const maxTraceRetainedContributors = anchors.reduce(
    (max, anchor) => Math.max(max, anchor.retainedCount),
    0,
  );
  const maxTraceFinalSteps = anchors.reduce(
    (max, anchor) => Math.max(max, anchor.finalStepCount),
    0,
  );
  const anchorTileEvidence = summarizeAnchorTileEvidence({
    plan,
    tileHeaders,
    runtimeContributors,
    anchors,
  });
  const anchorEvidenceById = new Map(anchorTileEvidence.map((anchor) => [anchor.id, anchor]));
  const resolvedBlockingAnchors = anchors.filter((anchor) => {
    const evidence = anchorEvidenceById.get(anchor.id);
    if (evidence?.traceComparisonIdentitySource === "final" && anchor.finalStepCount > 0) {
      return evidence.runtimeConsumedCount < anchor.finalStepCount || evidence.identityMatch !== true;
    }
    return anchor.retainedCount > 0 && effectiveRefsPerTile < anchor.retainedCount;
  });

  let classification = "telemetry-insufficient";
  if (anchors.length > 0) {
    classification = resolvedBlockingAnchors.length > 0
      ? "runtime-capacity-loss"
      : "no-capacity-discrepancy";
  }

  return {
    classification,
    tileCount,
    runtimeRetainedRefs: retainedRuntimeRefs,
    effectiveRefsPerTile,
    maxTraceRetainedContributors,
    maxTraceFinalSteps,
    blockingAnchors: resolvedBlockingAnchors,
    frameHeaderAccounting: normalizeFrameHeaderAccounting(tileRefCustody, runtimeRefStats),
    anchorTileEvidence,
  };
}

function normalizeTraceCapacityAnchors(anchors) {
  if (!Array.isArray(anchors)) {
    return [];
  }
  return anchors
    .filter((anchor) => anchor && typeof anchor === "object")
    .map((anchor) => ({
      id: typeof anchor.id === "string" ? anchor.id : "",
      x: finiteNumberOrNull(anchor.x),
      y: finiteNumberOrNull(anchor.y),
      tileAddress: normalizeTileAddress(anchor.tileAddress),
      projectedCount: nonNegativeFiniteInteger(anchor.projectedCount),
      retainedCount: nonNegativeFiniteInteger(anchor.retainedCount),
      finalStepCount: nonNegativeFiniteInteger(anchor.finalStepCount),
      retainedIdentities: normalizeIdentityList(anchor.retainedIdentities),
      finalIdentities: normalizeIdentityList(anchor.finalIdentities),
    }));
}

function normalizeFrameHeaderAccounting(tileRefCustody, runtimeRefStats) {
  const runtimeProjectedRefs = runtimePreferredStat(runtimeRefStats?.projectedScatterRefs, tileRefCustody?.projectedTileEntryCount);
  const runtimeRetainedRefs = runtimePreferredStat(runtimeRefStats?.retainedRefs, tileRefCustody?.retainedTileEntryCount);
  const runtimeDroppedRefs = runtimePreferredStat(runtimeRefStats?.droppedRefs, tileRefCustody?.evictedTileEntryCount);
  const runtimeSaturatedTiles = runtimePreferredStat(runtimeRefStats?.saturatedTiles, tileRefCustody?.saturatedRetainedTileCount);
  const runtimeMaxRefsPerTile = runtimePreferredStat(runtimeRefStats?.maxRefsPerTile, tileRefCustody?.maxRetainedRefsPerTile);
  return {
    projectedTileEntryCount: runtimeProjectedRefs,
    retainedTileEntryCount: runtimeRetainedRefs,
    evictedTileEntryCount: runtimeDroppedRefs,
    cappedTileCount: runtimePreferredStat(runtimeRefStats?.saturatedTiles, tileRefCustody?.cappedTileCount),
    saturatedRetainedTileCount: runtimeSaturatedTiles,
    maxProjectedRefsPerTile: runtimePreferredStat(runtimeRefStats?.maxRefsPerTile, tileRefCustody?.maxProjectedRefsPerTile),
    maxRetainedRefsPerTile: runtimeMaxRefsPerTile,
    headerRefCount: runtimePreferredStat(runtimeRefStats?.retainedRefs, tileRefCustody?.headerRefCount),
    headerAccountingMatches: tileRefCustody?.headerAccountingMatches === true || Boolean(runtimeRefStats),
  };
}

function runtimePreferredStat(runtimeValue, fallbackValue) {
  const runtime = nonNegativeFiniteInteger(runtimeValue);
  return runtime > 0 ? runtime : nonNegativeFiniteInteger(fallbackValue);
}

function summarizeAnchorTileEvidence({
  plan,
  tileHeaders,
  runtimeContributors,
  anchors,
}) {
  if (!Array.isArray(anchors) || anchors.length === 0) {
    return [];
  }
  const runtimeRecords = Array.isArray(runtimeContributors) ? runtimeContributors : [];
  return anchors.map((anchor) => {
    const tileAddress = normalizeAnchorTileAddress(anchor, plan);
    const runtimeTileRecords = runtimeRecords.filter((record) => record?.tileIndex === tileAddress.tileIndex);
    const runtimeTileHeader = completeRuntimeTileHeader({
      header: readRuntimeTileHeader(tileHeaders, tileAddress.tileIndex),
      runtimeTileRecords,
      traceProjectedCount: anchor.projectedCount,
    });
    const runtimeIdentities = normalizeIdentityList(runtimeConsumedRecords({
      runtimeRecords,
      runtimeTileHeader,
      tileIndex: tileAddress.tileIndex,
    }));
    const traceRetainedIdentities = normalizeIdentityList(anchor.retainedIdentities);
    const traceFinalIdentities = normalizeIdentityList(anchor.finalIdentities);
    const traceComparisonIdentitySource = traceFinalIdentities.length > 0 ? "final" : "retained";
    const traceComparisonIdentities = traceComparisonIdentitySource === "final"
      ? traceFinalIdentities
      : traceRetainedIdentities;
    const traceRetainedIdentityHash = identityHash(traceRetainedIdentities);
    const traceFinalIdentityHash = identityHash(traceFinalIdentities);
    const traceComparisonIdentityHash = identityHash(traceComparisonIdentities);
    const runtimeConsumedIdentityHash = identityHash(runtimeIdentities);
    const missingTraceIdentitySample = identityDifference(traceComparisonIdentities, runtimeIdentities);
    const extraRuntimeIdentitySample = identityDifference(runtimeIdentities, traceComparisonIdentities);

    return {
      id: anchor.id,
      anchorPixel: {
        x: anchor.x ?? 0,
        y: anchor.y ?? 0,
      },
      tileAddress,
      traceProjectedCount: anchor.projectedCount,
      traceRetainedCount: anchor.retainedCount,
      traceFinalStepCount: anchor.finalStepCount,
      runtimeTileHeader,
      runtimeConsumedCount: runtimeIdentities.length,
      traceRetainedIdentityHash,
      traceFinalIdentityHash,
      traceComparisonIdentitySource,
      traceComparisonIdentityHash,
      runtimeConsumedIdentityHash,
      traceRetainedIdentitySample: identitySample(traceRetainedIdentities),
      traceFinalIdentitySample: identitySample(traceFinalIdentities),
      traceComparisonIdentitySample: identitySample(traceComparisonIdentities),
      runtimeConsumedIdentitySample: identitySample(runtimeIdentities),
      missingTraceIdentitySample,
      extraRuntimeIdentitySample,
      identityMatch: traceComparisonIdentities.length === runtimeIdentities.length &&
        traceComparisonIdentityHash === runtimeConsumedIdentityHash,
    };
  });
}

function normalizeAnchorTileAddress(anchor, plan) {
  const explicit = normalizeTileAddress(anchor.tileAddress);
  if (explicit) {
    return explicit;
  }
  const tileSizePx = positiveInteger(plan?.tileSizePx, "plan.tileSizePx");
  const tileColumns = positiveInteger(plan?.tileColumns, "plan.tileColumns");
  const tileRows = positiveInteger(plan?.tileRows, "plan.tileRows");
  const x = Number.isFinite(anchor.x) ? anchor.x : 0;
  const y = Number.isFinite(anchor.y) ? anchor.y : 0;
  const tileX = clampInteger(Math.floor(x / tileSizePx), 0, tileColumns - 1);
  const tileY = clampInteger(Math.floor(y / tileSizePx), 0, tileRows - 1);
  return {
    tileSizePx,
    tileX,
    tileY,
    tileIndex: tileY * tileColumns + tileX,
    localX: x - tileX * tileSizePx,
    localY: y - tileY * tileSizePx,
  };
}

function normalizeTileAddress(tileAddress) {
  if (!tileAddress || typeof tileAddress !== "object") {
    return null;
  }
  return {
    tileSizePx: nonNegativeFiniteInteger(tileAddress.tileSizePx),
    tileX: nonNegativeFiniteInteger(tileAddress.tileX),
    tileY: nonNegativeFiniteInteger(tileAddress.tileY),
    tileIndex: nonNegativeFiniteInteger(tileAddress.tileIndex),
    localX: nonNegativeFiniteInteger(tileAddress.localX),
    localY: nonNegativeFiniteInteger(tileAddress.localY),
  };
}

function readRuntimeTileHeader(tileHeaders, tileIndex) {
  const base = nonNegativeFiniteInteger(tileIndex) * 4;
  const contributorOffset = nonNegativeFiniteInteger(tileHeaders?.[base]);
  const retainedContributorCount = nonNegativeFiniteInteger(tileHeaders?.[base + 1]);
  const projectedContributorCount = nonNegativeFiniteInteger(tileHeaders?.[base + 2] ?? retainedContributorCount);
  const droppedContributorCount = Math.max(0, projectedContributorCount - retainedContributorCount);
  const overflowFlags = nonNegativeFiniteInteger(tileHeaders?.[base + 3] ?? (droppedContributorCount > 0 ? 1 : 0));
  return {
    contributorOffset,
    retainedContributorCount,
    projectedContributorCount,
    droppedContributorCount,
    overflowFlags,
  };
}

function completeRuntimeTileHeader({ header, runtimeTileRecords, traceProjectedCount }) {
  const retainedContributorCount = header.retainedContributorCount > 0
    ? header.retainedContributorCount
    : runtimeTileRecords.length;
  if (retainedContributorCount === 0 && runtimeTileRecords.length === 0) {
    return header;
  }
  const projectedContributorCount = Math.max(nonNegativeFiniteInteger(traceProjectedCount), retainedContributorCount);
  const droppedContributorCount = Math.max(0, projectedContributorCount - retainedContributorCount);
  return {
    contributorOffset: header.retainedContributorCount > 0 ? header.contributorOffset : 0,
    retainedContributorCount,
    projectedContributorCount,
    droppedContributorCount,
    overflowFlags: Math.max(header.overflowFlags, droppedContributorCount > 0 ? 1 : 0),
  };
}

function runtimeConsumedRecords({ runtimeRecords, runtimeTileHeader, tileIndex }) {
  const start = runtimeTileHeader.contributorOffset;
  const end = start + runtimeTileHeader.retainedContributorCount;
  const headerSlice = runtimeRecords
    .slice(start, end)
    .filter((record) => !Number.isInteger(record?.tileIndex) || record.tileIndex === tileIndex);
  if (headerSlice.length === runtimeTileHeader.retainedContributorCount) {
    return headerSlice;
  }
  return runtimeRecords
    .filter((record) => record?.tileIndex === tileIndex)
    .slice(0, runtimeTileHeader.retainedContributorCount);
}

function normalizeIdentityList(identities) {
  if (!Array.isArray(identities)) {
    return [];
  }
  return identities
    .map((identity) => ({
      splatIndex: nonNegativeFiniteInteger(identity?.splatIndex),
      originalId: nonNegativeFiniteInteger(identity?.originalId),
    }))
    .sort(compareIdentities);
}

function compareIdentities(left, right) {
  return left.splatIndex - right.splatIndex || left.originalId - right.originalId;
}

function identitySample(identities, maxSamples = 12) {
  return normalizeIdentityList(identities).slice(0, maxSamples);
}

function identityDifference(left, right, maxSamples = 12) {
  const rightKeys = new Set(normalizeIdentityList(right).map(identityKey));
  return normalizeIdentityList(left)
    .filter((identity) => !rightKeys.has(identityKey(identity)))
    .slice(0, maxSamples);
}

function identityHash(identities) {
  const normalized = normalizeIdentityList(identities);
  let hash = 0x811c9dc5;
  for (const identity of normalized) {
    const token = `${identity.splatIndex}:${identity.originalId};`;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

function identityKey(identity) {
  return `${identity.splatIndex}:${identity.originalId}`;
}

function normalizeRetentionAudit(retentionAudit) {
  if (!retentionAudit || typeof retentionAudit !== "object") {
    return null;
  }
  return {
    fullFrame: normalizeRetentionAuditSummary(retentionAudit.fullFrame),
    regions: {
      porousBody: normalizeRetentionAuditSummary(retentionAudit.regions?.porousBody),
      centerLeakBand: normalizeRetentionAuditSummary(retentionAudit.regions?.centerLeakBand),
    },
  };
}

function normalizeRetentionAuditSummary(summary = {}) {
  return {
    region: typeof summary.region === "string" ? summary.region : "",
    tileCount: nonNegativeFiniteInteger(summary.tileCount),
    cappedTileCount: nonNegativeFiniteInteger(summary.cappedTileCount),
    projectedTileEntryCount: nonNegativeFiniteInteger(summary.projectedTileEntryCount),
    currentRetainedEntryCount: nonNegativeFiniteInteger(summary.currentRetainedEntryCount),
    legacyRetainedEntryCount: nonNegativeFiniteInteger(summary.legacyRetainedEntryCount),
    addedByPolicyCount: nonNegativeFiniteInteger(summary.addedByPolicyCount),
    droppedByPolicyCount: nonNegativeFiniteInteger(summary.droppedByPolicyCount),
    addedRetentionWeightSum: nonNegativeFiniteNumber(summary.addedRetentionWeightSum),
    droppedRetentionWeightSum: nonNegativeFiniteNumber(summary.droppedRetentionWeightSum),
    addedOcclusionWeightSum: nonNegativeFiniteNumber(summary.addedOcclusionWeightSum),
    droppedOcclusionWeightSum: nonNegativeFiniteNumber(summary.droppedOcclusionWeightSum),
    addedByPolicySamples: normalizeRetentionAuditSamples(summary.addedByPolicySamples),
    droppedByPolicySamples: normalizeRetentionAuditSamples(summary.droppedByPolicySamples),
  };
}

function normalizeRetentionAuditSamples(samples) {
  if (!Array.isArray(samples)) {
    return [];
  }
  return samples.slice(0, 12).map((sample) => ({
    tileIndex: nonNegativeFiniteInteger(sample.tileIndex),
    tileX: nonNegativeFiniteInteger(sample.tileX),
    tileY: nonNegativeFiniteInteger(sample.tileY),
    splatIndex: nonNegativeFiniteInteger(sample.splatIndex),
    originalId: nonNegativeFiniteInteger(sample.originalId),
    coverageWeight: nonNegativeFiniteNumber(sample.coverageWeight),
    retentionWeight: nonNegativeFiniteNumber(sample.retentionWeight),
    occlusionWeight: nonNegativeFiniteNumber(sample.occlusionWeight),
    occlusionDensity: nonNegativeFiniteNumber(sample.occlusionDensity),
    viewRank: Number.isInteger(sample.viewRank) && sample.viewRank >= 0 ? sample.viewRank : null,
  }));
}

function normalizeTileRefCustody(tileRefCustody, tileRefs, runtimeRefStats) {
  if (tileRefCustody && typeof tileRefCustody === "object") {
    return {
      projectedTileEntryCount: runtimePreferredStat(runtimeRefStats?.projectedScatterRefs, tileRefCustody.projectedTileEntryCount),
      retainedTileEntryCount: runtimePreferredStat(runtimeRefStats?.retainedRefs, tileRefCustody.retainedTileEntryCount),
      evictedTileEntryCount: runtimePreferredStat(runtimeRefStats?.droppedRefs, tileRefCustody.evictedTileEntryCount),
      cappedTileCount: runtimePreferredStat(runtimeRefStats?.saturatedTiles, tileRefCustody.cappedTileCount),
      saturatedRetainedTileCount: runtimePreferredStat(runtimeRefStats?.saturatedTiles, tileRefCustody.saturatedRetainedTileCount),
      maxProjectedRefsPerTile: runtimePreferredStat(runtimeRefStats?.maxRefsPerTile, tileRefCustody.maxProjectedRefsPerTile),
      maxRetainedRefsPerTile: runtimePreferredStat(runtimeRefStats?.maxRefsPerTile, tileRefCustody.maxRetainedRefsPerTile),
      headerRefCount: runtimePreferredStat(runtimeRefStats?.retainedRefs, tileRefCustody.headerRefCount),
      headerAccountingMatches: tileRefCustody.headerAccountingMatches === true || Boolean(runtimeRefStats),
    };
  }
  return {
    projectedTileEntryCount: tileRefs.total,
    retainedTileEntryCount: tileRefs.total,
    evictedTileEntryCount: 0,
    cappedTileCount: 0,
    saturatedRetainedTileCount: 0,
    maxProjectedRefsPerTile: tileRefs.maxPerTile,
    maxRetainedRefsPerTile: tileRefs.maxPerTile,
    headerRefCount: tileRefs.total,
    headerAccountingMatches: true,
  };
}

function normalizeRuntimeRefStatsReadback(readback) {
  if (!readback || readback.status !== "present") {
    return null;
  }
  return {
    tileCount: nonNegativeFiniteInteger(readback.tileCount),
    tileCapacity: nonNegativeFiniteInteger(readback.tileCapacity),
    allocatedRefs: nonNegativeFiniteInteger(readback.allocatedRefs),
    projectedScatterRefs: nonNegativeFiniteInteger(readback.projectedScatterRefs),
    retainedRefs: nonNegativeFiniteInteger(readback.retainedRefs),
    droppedRefs: nonNegativeFiniteInteger(readback.droppedRefs),
    nonEmptyTiles: nonNegativeFiniteInteger(readback.nonEmptyTiles),
    saturatedTiles: nonNegativeFiniteInteger(readback.saturatedTiles),
    maxRefsPerTile: nonNegativeFiniteInteger(readback.maxRefsPerTile),
  };
}

function summarizeTileRefsFromRuntimeRefStats(readback, tileCount) {
  const total = nonNegativeFiniteInteger(readback?.retainedRefs);
  const nonEmptyTiles = Math.min(
    nonNegativeFiniteInteger(tileCount),
    nonNegativeFiniteInteger(readback?.nonEmptyTiles)
  );
  const maxPerTile = nonNegativeFiniteInteger(readback?.maxRefsPerTile);
  return {
    total,
    nonEmptyTiles,
    maxPerTile,
    averagePerNonEmptyTile: nonEmptyTiles > 0 ? round(total / nonEmptyTiles) : 0,
    density: tileCount > 0 ? round(nonEmptyTiles / tileCount) : 0,
  };
}

function summarizeTileRefs(tileHeaders, tileCount) {
  let total = 0;
  let nonEmptyTiles = 0;
  let maxPerTile = 0;
  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    const count = tileHeaders?.[tileIndex * 4 + 1] ?? 0;
    total += count;
    if (count > 0) {
      nonEmptyTiles += 1;
      maxPerTile = Math.max(maxPerTile, count);
    }
  }

  return {
    total,
    nonEmptyTiles,
    maxPerTile,
    averagePerNonEmptyTile: nonEmptyTiles > 0 ? round(total / nonEmptyTiles) : 0,
    density: tileCount > 0 ? round(nonEmptyTiles / tileCount) : 0,
  };
}

function summarizeEstimatedTileRefs(tileRefCustody, tileCount) {
  const total = nonNegativeFiniteInteger(tileRefCustody?.headerRefCount ?? tileRefCustody?.retainedTileEntryCount);
  const maxPerTile = nonNegativeFiniteInteger(
    tileRefCustody?.maxRetainedRefsPerTile ?? tileRefCustody?.maxProjectedRefsPerTile
  );
  if (total <= 0 || maxPerTile <= 0) {
    return {
      total: 0,
      nonEmptyTiles: 0,
      maxPerTile: 0,
      averagePerNonEmptyTile: 0,
      density: 0,
    };
  }
  const nonEmptyTiles = Math.min(tileCount, Math.max(1, Math.ceil(total / maxPerTile)));
  return {
    total,
    nonEmptyTiles,
    maxPerTile,
    averagePerNonEmptyTile: round(total / nonEmptyTiles),
    density: tileCount > 0 ? round(nonEmptyTiles / tileCount) : 0,
  };
}

function summarizeFloatRange(values, count) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let observed = 0;
  for (let index = 0; index < count; index += 1) {
    const value = values?.[index];
    if (!Number.isFinite(value)) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
    sum += value;
    observed += 1;
  }

  return {
    min: observed > 0 ? round(min) : 0,
    max: observed > 0 ? round(max) : 0,
    mean: observed > 0 ? round(sum / observed) : 0,
  };
}

function nonNegativeFiniteNumber(value) {
  return Number.isFinite(value) && value >= 0 ? round(value) : 0;
}

function summarizeAlpha({
  alphaParamData,
  sourceOpacities,
  tileHeaders,
  tileCount,
  refLimit,
  maxTileRefs,
  tileCoverageWeights,
  tileRefs,
}) {
  let maxSourceOpacity = 0;
  let sourceOpacitySum = 0;
  let sourceOpacityCount = 0;
  for (let refIndex = 0; refIndex < refLimit; refIndex += 1) {
    const opacity = clamp01(alphaParamData?.[refIndex * 4] ?? 0);
    maxSourceOpacity = Math.max(maxSourceOpacity, opacity);
    sourceOpacitySum += opacity;
    sourceOpacityCount += 1;
  }
  if (maxSourceOpacity <= 0 && (sourceOpacities?.length ?? 0) > 0) {
    maxSourceOpacity = 0;
    sourceOpacitySum = 0;
    sourceOpacityCount = 0;
    for (let index = 0; index < sourceOpacities.length; index += 1) {
      const opacity = clamp01(sourceOpacities[index] ?? 0);
      maxSourceOpacity = Math.max(maxSourceOpacity, opacity);
      sourceOpacitySum += opacity;
      sourceOpacityCount += 1;
    }
  }

  let estimatedMaxAccumulatedAlpha = 0;
  let estimatedMinTransmittance = 1;
  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    const first = tileHeaders?.[tileIndex * 4] ?? 0;
    const count = tileHeaders?.[tileIndex * 4 + 1] ?? 0;
    let transmittance = 1;
    for (let offset = 0; offset < count; offset += 1) {
      const refIndex = first + offset;
      if (refIndex >= refLimit) break;
      const opacity = clamp01(alphaParamData?.[refIndex * 4] ?? 0);
      const coverage = Math.max(tileCoverageWeights?.[refIndex] ?? 0, 0);
      const coverageAlpha = clamp01(1 - Math.pow(1 - opacity, coverage));
      transmittance *= 1 - coverageAlpha;
    }
    estimatedMinTransmittance = Math.min(estimatedMinTransmittance, transmittance);
    estimatedMaxAccumulatedAlpha = Math.max(estimatedMaxAccumulatedAlpha, 1 - transmittance);
  }
  if (estimatedMaxAccumulatedAlpha <= 0 && tileRefs.total > 0 && maxSourceOpacity > 0) {
    estimatedMaxAccumulatedAlpha = maxSourceOpacity;
    estimatedMinTransmittance = 1 - maxSourceOpacity;
  }

  return {
    maxSourceOpacity: round(maxSourceOpacity),
    meanSourceOpacity: sourceOpacityCount > 0 ? round(sourceOpacitySum / sourceOpacityCount) : 0,
    estimatedMaxAccumulatedAlpha: round(estimatedMaxAccumulatedAlpha),
    estimatedMinTransmittance: round(estimatedMinTransmittance),
    alphaParamRefs: maxTileRefs,
  };
}

function summarizeConicShape(alphaParamData, refLimit, maxTileRefs) {
  let maxMajorRadiusPx = 0;
  let minMinorRadiusPx = Number.POSITIVE_INFINITY;
  let maxAnisotropyRatio = 0;
  let observed = 0;
  for (let refIndex = 0; refIndex < refLimit; refIndex += 1) {
    const conicBase = (maxTileRefs + refIndex) * 4;
    const radii = inverseConicRadii(
      alphaParamData?.[conicBase] ?? 1,
      alphaParamData?.[conicBase + 1] ?? 0,
      alphaParamData?.[conicBase + 2] ?? 1,
    );
    if (!radii) continue;
    maxMajorRadiusPx = Math.max(maxMajorRadiusPx, radii.major);
    minMinorRadiusPx = Math.min(minMinorRadiusPx, radii.minor);
    maxAnisotropyRatio = Math.max(maxAnisotropyRatio, radii.major / Math.max(radii.minor, 1e-6));
    observed += 1;
  }

  return {
    maxMajorRadiusPx: round(maxMajorRadiusPx),
    minMinorRadiusPx: observed > 0 ? round(minMinorRadiusPx) : 0,
    maxAnisotropyRatio: round(maxAnisotropyRatio),
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

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function nonNegativeFiniteInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function finiteNumberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function clampInteger(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Number(value.toFixed(6));
}
