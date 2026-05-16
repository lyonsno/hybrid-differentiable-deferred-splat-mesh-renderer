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
  traceCapacityEvidence,
} = {}) {
  const maxTileRefs = positiveInteger(plan?.maxTileRefs, "plan.maxTileRefs");
  const tileCount = positiveInteger(plan?.tileColumns, "plan.tileColumns") *
    positiveInteger(plan?.tileRows, "plan.tileRows");
  const refLimit = Math.min(nonNegativeInteger(tileEntryCount, "tileEntryCount"), maxTileRefs);
  const observedTileRefs = summarizeTileRefs(tileHeaders, tileCount);
  const tileRefs = observedTileRefs.total > 0
    ? observedTileRefs
    : summarizeEstimatedTileRefs(tileRefCustody, tileCount);
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

  return {
    version: 1,
    debugMode,
    tileGrid: {
      columns: plan.tileColumns,
      rows: plan.tileRows,
      tileSizePx: plan.tileSizePx,
    },
    tileRefs,
    tileRefCustody: normalizeTileRefCustody(tileRefCustody, tileRefs),
    runtimeRefBudget: summarizeRuntimeRefBudget({
      plan,
      tileRefs,
      tileRefCustody,
      traceCapacityEvidence,
    }),
    retentionAudit: normalizeRetentionAudit(retentionAudit),
    coverageWeight,
    alpha,
    conicShape,
  };
}

function summarizeRuntimeRefBudget({
  plan,
  tileRefs,
  tileRefCustody,
  traceCapacityEvidence,
}) {
  const tileCount = positiveInteger(plan?.tileColumns, "plan.tileColumns") *
    positiveInteger(plan?.tileRows, "plan.tileRows");
  const retainedRuntimeRefs = nonNegativeFiniteInteger(
    tileRefCustody?.retainedTileEntryCount ?? tileRefCustody?.headerRefCount ?? tileRefs?.total
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
  const blockingAnchors = anchors.filter(
    (anchor) => anchor.retainedCount > 0 && effectiveRefsPerTile < anchor.retainedCount,
  );

  let classification = "telemetry-insufficient";
  if (anchors.length > 0) {
    classification = blockingAnchors.length > 0
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
    blockingAnchors,
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
      projectedCount: nonNegativeFiniteInteger(anchor.projectedCount),
      retainedCount: nonNegativeFiniteInteger(anchor.retainedCount),
      finalStepCount: nonNegativeFiniteInteger(anchor.finalStepCount),
    }));
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

function normalizeTileRefCustody(tileRefCustody, tileRefs) {
  if (tileRefCustody && typeof tileRefCustody === "object") {
    return {
      projectedTileEntryCount: nonNegativeFiniteInteger(tileRefCustody.projectedTileEntryCount),
      retainedTileEntryCount: nonNegativeFiniteInteger(tileRefCustody.retainedTileEntryCount),
      evictedTileEntryCount: nonNegativeFiniteInteger(tileRefCustody.evictedTileEntryCount),
      cappedTileCount: nonNegativeFiniteInteger(tileRefCustody.cappedTileCount),
      saturatedRetainedTileCount: nonNegativeFiniteInteger(tileRefCustody.saturatedRetainedTileCount),
      maxProjectedRefsPerTile: nonNegativeFiniteInteger(tileRefCustody.maxProjectedRefsPerTile),
      maxRetainedRefsPerTile: nonNegativeFiniteInteger(tileRefCustody.maxRetainedRefsPerTile),
      headerRefCount: nonNegativeFiniteInteger(tileRefCustody.headerRefCount),
      headerAccountingMatches: tileRefCustody.headerAccountingMatches === true,
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

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function round(value) {
  return Number(value.toFixed(6));
}
