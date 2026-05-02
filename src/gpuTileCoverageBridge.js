const DEFAULT_MAX_REFS_PER_TILE = 32;
const DEFAULT_DEPTH_BAND_COUNT = 4;
const CONTRIBUTOR_OVERFLOW_FLAGS = Object.freeze({
  none: 0,
  perTileRetainedCap: 1,
  globalProjectedBudget: 2,
  invalidProjection: 4,
  nearPlaneSupport: 8,
  nonFiniteCoverage: 16,
});
const CONTRIBUTOR_OVERFLOW_REASONS = Object.freeze({
  none: "none",
  perTileRetainedCap: "perTileRetainedCap",
  perTileRetainedCapPolicyReserve: "perTileRetainedCapPolicyReserve",
  perTileRetainedCapForegroundBand: "perTileRetainedCapForegroundBand",
  perTileRetainedCapMiddleBand: "perTileRetainedCapMiddleBand",
  perTileRetainedCapBehindSurfaceBand: "perTileRetainedCapBehindSurfaceBand",
});

export function buildGpuTileCoverageBridge(coverage, options = {}) {
  const tileCount = coverage.tileColumns * coverage.tileRows;
  const splatCount = resolveSplatCount(coverage);
  const maxRefsPerTile = resolveMaxRefsPerTile(options.maxRefsPerTile ?? coverage.maxRefsPerTile);
  const contributorArena = coverage.contributorArena ?? buildTileLocalContributorArena(coverage, {
    maxRefsPerTile,
    depthBandCount: options.depthBandCount ?? coverage.depthBandCount,
  });
  const normalizedContributorArena = normalizeContributorArena(contributorArena, coverage.tileColumns, tileCount);
  const retainedTileEntries = normalizedContributorArena
    ? normalizedContributorArena.records
    : retainTileEntries(coverage.tileEntries, maxRefsPerTile);
  const retainedTileEntryCount = retainedTileEntries.length;
  const tileEntryCount = Math.max(retainedTileEntryCount, splatCount);
  const projectedBounds = new Uint32Array(Math.max(0, splatCount * 4));
  const tileHeaders = new Uint32Array(Math.max(0, tileCount * 4));
  const tileRefs = new Uint32Array(Math.max(0, tileEntryCount * 4));
  const tileCoverageWeights = new Float32Array(Math.max(0, tileEntryCount));
  const tileRefOrderingKeys = new Uint32Array(Math.max(0, tileEntryCount));
  tileRefOrderingKeys.fill(0xffffffff);
  const tileRefSourceOpacities = new Float32Array(Math.max(0, tileEntryCount));
  tileRefSourceOpacities.fill(Number.NaN);
  const tileRefShapeParams = new Float32Array(Math.max(0, tileEntryCount * 8));
  const splatsByIndex = new Map();

  for (const splat of coverage.splats) {
    splatsByIndex.set(splat.splatIndex, splat);
    const base = splat.splatIndex * 4;
    if (base + 3 >= projectedBounds.length) {
      throw new Error("splat coverage index exceeds projected bounds storage");
    }
    projectedBounds[base] = splat.tileBounds.minTileX;
    projectedBounds[base + 1] = splat.tileBounds.minTileY;
    projectedBounds[base + 2] = splat.tileBounds.maxTileX;
    projectedBounds[base + 3] = splat.tileBounds.maxTileY;
  }

  let currentTileIndex = -1;
  let firstRefIndex = 0;
  let refCount = 0;

  for (let refIndex = 0; refIndex < retainedTileEntryCount; refIndex++) {
    const entry = retainedTileEntries[refIndex];
    if (entry.tileIndex !== currentTileIndex) {
      if (currentTileIndex >= 0) {
        writeTileHeader(tileHeaders, currentTileIndex, firstRefIndex, refCount);
      }
      currentTileIndex = entry.tileIndex;
      firstRefIndex = refIndex;
      refCount = 0;
    }

    tileRefs[refIndex * 4] = entry.splatIndex;
    tileRefs[refIndex * 4 + 1] = entry.originalId;
    tileRefs[refIndex * 4 + 2] = entry.tileIndex;
    tileRefs[refIndex * 4 + 3] = refIndex;
    tileCoverageWeights[refIndex] = entry.coverageWeight;
    if (entry.hasSourceViewRank !== false && Number.isInteger(entry.viewRank)) {
      tileRefOrderingKeys[refIndex] = entry.viewRank >>> 0;
    }
    if (entry.hasSourceOpacity !== false && Number.isFinite(entry.opacity)) {
      tileRefSourceOpacities[refIndex] = entry.opacity;
    }
    writeTileRefShapeParams(tileRefShapeParams, refIndex, splatsByIndex.get(entry.splatIndex), entry);
    refCount += 1;
  }

  if (currentTileIndex >= 0) {
    writeTileHeader(tileHeaders, currentTileIndex, firstRefIndex, refCount);
  }
  const sourceTileEntries = Array.isArray(contributorArena?.projectedContributors)
    ? contributorArena.projectedContributors
    : normalizedContributorArena ? normalizedContributorArena.records : coverage.tileEntries;
  const tileRefCustody = summarizeTileRefCustody({
    tileEntries: sourceTileEntries,
    retainedTileEntryCount,
    tileHeaders,
    tileCount,
    maxRefsPerTile,
  });
  const retentionAudit = summarizeRetentionAudit({
    tileEntries: sourceTileEntries,
    tileColumns: coverage.tileColumns,
    tileRows: coverage.tileRows,
    maxRefsPerTile,
  });

  return {
    viewportWidth: coverage.viewportWidth,
    viewportHeight: coverage.viewportHeight,
    tileSizePx: coverage.tileSizePx,
    tileColumns: coverage.tileColumns,
    tileRows: coverage.tileRows,
    tileCount,
    splatCount,
    tileEntryCount,
    projectedBounds,
    tileHeaders,
    tileRefs,
    tileCoverageWeights,
    tileRefOrderingKeys,
    tileRefSourceOpacities,
    tileRefShapeParams,
    maxRefsPerTile,
    retainedTileEntryCount,
    tileRefCustody,
    retentionAudit,
    contributorArena,
  };
}

export function buildTileLocalContributorArena(coverage, options = {}) {
  const tileCount = coverage.tileColumns * coverage.tileRows;
  const maxRefsPerTile = resolveMaxRefsPerTile(options.maxRefsPerTile ?? coverage.maxRefsPerTile);
  const depthBandCount = resolveDepthBandCount(options.depthBandCount);
  const entries = [...coverage.tileEntries].sort(compareTileEntryOrder);
  const tileHeaders = [];
  const contributors = [];
  const projectedContributors = [];
  const splatsByIndex = new Map();
  for (const splat of coverage.splats ?? []) {
    splatsByIndex.set(splat.splatIndex, splat);
  }
  let cursor = 0;
  let nextContributorIndex = 0;

  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    while (cursor < entries.length && entries[cursor].tileIndex < tileIndex) {
      cursor += 1;
    }
    const start = cursor;
    while (cursor < entries.length && entries[cursor].tileIndex === tileIndex) {
      cursor += 1;
    }
    const tileEntries = entries.slice(start, cursor);
    const projectedIndexByKey = new Map(
      tileEntries.map((entry, index) => [tileEntryKey(entry), start + index])
    );
    const selected = selectTileEntries(tileEntries, maxRefsPerTile);
    const legacySelectedKeys = new Set(tileEntries.slice(0, maxRefsPerTile).map(tileEntryKey));
    const selectedByKey = new Map();
    for (const entry of selected.sort(compareTileEntryOrder)) {
      selectedByKey.set(tileEntryKey(entry), nextContributorIndex + selectedByKey.size);
    }

    const contributorOffset = nextContributorIndex;
    const recordByKey = new Map();
    const depthRange = summarizeDepthRange(tileEntries);
    let maxRetainedViewRank = 0;
    let minRetainedDepth = Number.POSITIVE_INFINITY;
    let maxRetainedDepth = Number.NEGATIVE_INFINITY;
    let transmittance = 1;
    const orderedContributors = [...tileEntries].sort(compareContributorArenaOrder);

    for (let orderIndex = 0; orderIndex < orderedContributors.length; orderIndex += 1) {
      const entry = orderedContributors[orderIndex];
      const key = tileEntryKey(entry);
      const contributorIndex = selectedByKey.get(key) ?? -1;
      const retained = contributorIndex >= 0;
      const opacity = readOpacity(entry);
      const hasSourceOpacity = Number.isFinite(entry.opacity);
      const depth = readViewDepth(entry);
      const depthBand = assignDepthBand(depth, depthRange, depthBandCount);
      const transmittanceBefore = transmittance;
      const shape = contributorShapeEvidence(entry, splatsByIndex);
      const viewRank = readOrderRank(entry, orderIndex);
      const hasSourceViewRank = Number.isInteger(entry.viewRank);
      const coverageWeight = readCoverageWeight(entry);
      const retentionBand = retentionBandForDepthBand(depthBand, depthBandCount);
      const overflowReasonDetail = classifyProjectedContributorOverflowReason({
        retained,
        wasLegacySelected: legacySelectedKeys.has(key),
        retentionBand,
      });
      const record = {
        splatIndex: entry.splatIndex,
        originalId: entry.originalId,
        tileIndex,
        contributorIndex,
        viewRank,
        viewDepth: depth,
        depthBand,
        coverageWeight,
        centerPx: shape.centerPx,
        inverseConic: shape.inverseConic,
        opacity,
        hasSourceOpacity,
        hasSourceViewRank,
        coverageAlpha: transferCoverageAlpha(opacity, coverageWeight),
        transmittanceBefore,
        retentionWeight: readRetentionWeight(entry),
        occlusionWeight: readOcclusionWeight(entry),
        retentionStatus: retained ? "retained" : "dropped",
        retentionBand,
        overflowReason: retained ? CONTRIBUTOR_OVERFLOW_REASONS.none : CONTRIBUTOR_OVERFLOW_REASONS.perTileRetainedCap,
        overflowReasonDetail,
        deferredSurface: null,
      };
      transmittance *= 1 - opacity;
      if (retained) {
        maxRetainedViewRank = Math.max(maxRetainedViewRank, viewRank);
        minRetainedDepth = Math.min(minRetainedDepth, depth);
        maxRetainedDepth = Math.max(maxRetainedDepth, depth);
      } else {
        // Dropped records remain in this CPU-only reference list so diagnostics
        // can prove what the flat retained projection lost under cap pressure.
      }
      recordByKey.set(key, record);
      projectedContributors.push({
        ...record,
        tileX: entry.tileX,
        tileY: entry.tileY,
        projectedIndex: projectedIndexByKey.get(key) ?? start + orderIndex,
        occlusionDensity: readOcclusionDensity(entry),
        transmittanceAfter: transmittance,
        retained,
      });
    }

    for (const entry of selected.sort(compareTileEntryOrder)) {
      contributors.push(recordByKey.get(tileEntryKey(entry)));
    }
    nextContributorIndex += selected.length;
    const droppedContributorCount = Math.max(0, tileEntries.length - selected.length);
    tileHeaders.push({
      contributorOffset,
      retainedContributorCount: selected.length,
      projectedContributorCount: tileEntries.length,
      droppedContributorCount,
      overflowFlags: droppedContributorCount > 0 ? CONTRIBUTOR_OVERFLOW_FLAGS.perTileRetainedCap : CONTRIBUTOR_OVERFLOW_FLAGS.none,
      maxRetainedViewRank: selected.length === 0 ? 0xffffffff : maxRetainedViewRank,
      minRetainedDepth: selected.length === 0 ? Number.POSITIVE_INFINITY : minRetainedDepth,
      maxRetainedDepth: selected.length === 0 ? Number.NEGATIVE_INFINITY : maxRetainedDepth,
    });
  }

  return {
    version: 1,
    tileHeaders,
    contributors,
    overflowReasons: CONTRIBUTOR_OVERFLOW_FLAGS,
    overflowReasonNames: CONTRIBUTOR_OVERFLOW_REASONS,
    projectedContributors,
    metadata: {
      viewportWidth: coverage.viewportWidth,
      viewportHeight: coverage.viewportHeight,
      tileSizePx: coverage.tileSizePx,
      tileColumns: coverage.tileColumns,
      tileRows: coverage.tileRows,
      tileCount,
      maxRefsPerTile,
      depthBandCount,
      projectedContributorCount: projectedContributors.length,
      retainedContributorCount: contributors.length,
      droppedContributorCount: Math.max(0, projectedContributors.length - contributors.length),
    },
  };
}

function normalizeContributorArena(contributorArena, tileColumns, tileCount) {
  if (contributorArena == null) {
    return null;
  }
  const records = contributorArena.records ?? contributorArena.contributors;
  if (!Array.isArray(records)) {
    throw new TypeError("contributorArena.records must be an array");
  }
  return {
    records: records
      .map((record, index) => normalizeContributorArenaRecord(record, index, tileColumns, tileCount))
      .sort(compareContributorArenaStorageOrder),
  };
}

function normalizeContributorArenaRecord(record, index, tileColumns, tileCount) {
  if (!record || typeof record !== "object") {
    throw new TypeError(`contributor arena record ${index} must be an object`);
  }
  validateNonNegativeInteger(record.tileIndex, `contributor arena record ${index} tileIndex`);
  if (record.tileIndex >= tileCount) {
    throw new RangeError(`contributor arena record ${index} tileIndex exceeds tile count`);
  }
  validateNonNegativeInteger(record.splatIndex, `contributor arena record ${index} splatIndex`);
  const originalId = "originalId" in record ? record.originalId : record.splatIndex;
  validateNonNegativeInteger(originalId, `contributor arena record ${index} originalId`);
  validateNonNegativeFinite(record.coverageWeight, `contributor arena record ${index} coverageWeight`);
  validateUnitInterval(record.opacity, `contributor arena record ${index} opacity`);
  validateNonNegativeInteger(record.viewRank, `contributor arena record ${index} viewRank`);
  validateCenterPx(record.centerPx, `contributor arena record ${index} centerPx`);
  validateInverseConic(record.inverseConic, `contributor arena record ${index} inverseConic`);
  const inverseConic = normalizeInverseConic(record.inverseConic);

  return {
    ...record,
    tileIndex: record.tileIndex,
    tileX: record.tileIndex % tileColumns,
    tileY: Math.floor(record.tileIndex / tileColumns),
    splatIndex: record.splatIndex,
    originalId,
    coverageWeight: record.coverageWeight,
    opacity: record.opacity,
    viewRank: record.viewRank,
    inverseConic,
    arenaRecordIndex: index,
  };
}

function compareContributorArenaStorageOrder(left, right) {
  return (
    left.tileIndex - right.tileIndex ||
    left.arenaRecordIndex - right.arenaRecordIndex
  );
}

function summarizeTileRefCustody({
  tileEntries,
  retainedTileEntryCount,
  tileHeaders,
  tileCount,
  maxRefsPerTile,
}) {
  const projectedCounts = new Uint32Array(Math.max(0, tileCount));
  for (const entry of tileEntries) {
    if (Number.isInteger(entry.tileIndex) && entry.tileIndex >= 0 && entry.tileIndex < tileCount) {
      projectedCounts[entry.tileIndex] += 1;
    }
  }

  let projectedTileEntryCount = 0;
  let cappedTileCount = 0;
  let saturatedRetainedTileCount = 0;
  let maxProjectedRefsPerTile = 0;
  let maxRetainedRefsPerTile = 0;
  let headerRefCount = 0;
  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    const projectedCount = projectedCounts[tileIndex];
    const retainedCount = tileHeaders[tileIndex * 4 + 1] ?? 0;
    projectedTileEntryCount += projectedCount;
    headerRefCount += retainedCount;
    maxProjectedRefsPerTile = Math.max(maxProjectedRefsPerTile, projectedCount);
    maxRetainedRefsPerTile = Math.max(maxRetainedRefsPerTile, retainedCount);
    if (projectedCount > maxRefsPerTile) {
      cappedTileCount += 1;
    }
    if (retainedCount >= maxRefsPerTile) {
      saturatedRetainedTileCount += 1;
    }
  }

  return {
    projectedTileEntryCount,
    retainedTileEntryCount,
    evictedTileEntryCount: Math.max(0, projectedTileEntryCount - retainedTileEntryCount),
    cappedTileCount,
    saturatedRetainedTileCount,
    maxProjectedRefsPerTile,
    maxRetainedRefsPerTile,
    headerRefCount,
    headerAccountingMatches: headerRefCount === retainedTileEntryCount,
  };
}

function retainTileEntries(tileEntries, maxRefsPerTile) {
  const entries = [...tileEntries].sort(compareTileEntryOrder);
  const retained = [];
  let cursor = 0;
  while (cursor < entries.length) {
    const tileIndex = entries[cursor].tileIndex;
    let end = cursor + 1;
    while (end < entries.length && entries[end].tileIndex === tileIndex) {
      end += 1;
    }
    retained.push(...selectTileEntries(entries.slice(cursor, end), maxRefsPerTile));
    cursor = end;
  }
  return retained.sort(compareTileEntryOrder);
}

function summarizeRetentionAudit({ tileEntries, tileColumns, tileRows, maxRefsPerTile }) {
  const regions = {
    centerLeakBand: createTileRegion({
      name: "center-leak-band",
      tileColumns,
      tileRows,
      minX: 0.34,
      maxX: 0.68,
      minY: 0.42,
      maxY: 0.60,
    }),
  };
  const summaries = {
    fullFrame: createRetentionAuditSummary("full-frame"),
    regions: {
      centerLeakBand: createRetentionAuditSummary(regions.centerLeakBand.name),
    },
  };

  const entries = [...tileEntries].sort(compareTileEntryOrder);
  let cursor = 0;
  while (cursor < entries.length) {
    const tileIndex = entries[cursor].tileIndex;
    let end = cursor + 1;
    while (end < entries.length && entries[end].tileIndex === tileIndex) {
      end += 1;
    }
    const tileGroup = entries.slice(cursor, end);
    accumulateRetentionAudit(summaries.fullFrame, tileGroup, maxRefsPerTile);
    if (tileInRegion(tileIndex, tileColumns, regions.centerLeakBand)) {
      accumulateRetentionAudit(summaries.regions.centerLeakBand, tileGroup, maxRefsPerTile);
    }
    cursor = end;
  }

  return summaries;
}

function createTileRegion({ name, tileColumns, tileRows, minX, maxX, minY, maxY }) {
  return {
    name,
    minTileX: Math.max(0, Math.floor(tileColumns * minX)),
    maxTileX: Math.min(tileColumns - 1, Math.ceil(tileColumns * maxX) - 1),
    minTileY: Math.max(0, Math.floor(tileRows * minY)),
    maxTileY: Math.min(tileRows - 1, Math.ceil(tileRows * maxY) - 1),
  };
}

function tileInRegion(tileIndex, tileColumns, region) {
  const tileX = tileIndex % tileColumns;
  const tileY = Math.floor(tileIndex / tileColumns);
  return (
    tileX >= region.minTileX &&
    tileX <= region.maxTileX &&
    tileY >= region.minTileY &&
    tileY <= region.maxTileY
  );
}

function createRetentionAuditSummary(region) {
  return {
    region,
    tileCount: 0,
    cappedTileCount: 0,
    projectedTileEntryCount: 0,
    currentRetainedEntryCount: 0,
    legacyRetainedEntryCount: 0,
    addedByPolicyCount: 0,
    droppedByPolicyCount: 0,
    addedRetentionWeightSum: 0,
    droppedRetentionWeightSum: 0,
    addedOcclusionWeightSum: 0,
    droppedOcclusionWeightSum: 0,
    addedByPolicySamples: [],
    droppedByPolicySamples: [],
  };
}

function accumulateRetentionAudit(summary, tileEntries, maxRefsPerTile) {
  if (tileEntries.length === 0) {
    return;
  }
  summary.tileCount += 1;
  summary.projectedTileEntryCount += tileEntries.length;
  if (tileEntries.length > maxRefsPerTile) {
    summary.cappedTileCount += 1;
  }
  const legacyRetained = tileEntries.slice(0, maxRefsPerTile);
  const currentRetained = selectTileEntries(tileEntries, maxRefsPerTile);
  const legacyKeys = new Set(legacyRetained.map(tileEntryKey));
  const currentKeys = new Set(currentRetained.map(tileEntryKey));
  summary.currentRetainedEntryCount += currentRetained.length;
  summary.legacyRetainedEntryCount += legacyRetained.length;

  for (const entry of currentRetained) {
    if (!legacyKeys.has(tileEntryKey(entry))) {
      summary.addedByPolicyCount += 1;
      summary.addedRetentionWeightSum += readRetentionWeight(entry);
      summary.addedOcclusionWeightSum += readOcclusionWeight(entry);
      pushRetentionAuditSample(summary.addedByPolicySamples, entry);
    }
  }
  for (const entry of legacyRetained) {
    if (!currentKeys.has(tileEntryKey(entry))) {
      summary.droppedByPolicyCount += 1;
      summary.droppedRetentionWeightSum += readRetentionWeight(entry);
      summary.droppedOcclusionWeightSum += readOcclusionWeight(entry);
      pushRetentionAuditSample(summary.droppedByPolicySamples, entry);
    }
  }
}

function pushRetentionAuditSample(samples, entry, maxSamples = 12) {
  if (samples.length >= maxSamples) {
    return;
  }
  samples.push({
    tileIndex: entry.tileIndex,
    tileX: entry.tileX,
    tileY: entry.tileY,
    splatIndex: entry.splatIndex,
    originalId: entry.originalId,
    coverageWeight: roundAuditNumber(entry.coverageWeight),
    retentionWeight: roundAuditNumber(readRetentionWeight(entry)),
    occlusionWeight: roundAuditNumber(readOcclusionWeight(entry)),
    occlusionDensity: roundAuditNumber(readOcclusionDensity(entry)),
    viewRank: Number.isInteger(entry.viewRank) ? entry.viewRank : null,
  });
}

function roundAuditNumber(value) {
  return Number.isFinite(value) ? Number(value.toFixed(6)) : 0;
}

function selectTileEntries(tileEntries, maxRefsPerTile) {
  if (tileEntries.length <= maxRefsPerTile) {
    return tileEntries;
  }
  const selected = tileEntries.slice(0, maxRefsPerTile);
  const reserveCount = Math.min(maxRefsPerTile, Math.min(4, Math.max(2, Math.floor(maxRefsPerTile / 8))));
  const selectedKeys = new Set(selected.map(tileEntryKey));
  const retentionCandidates = selectRetentionCandidates(tileEntries, selectedKeys, reserveCount);
  const reservedKeys = new Set(retentionCandidates.map(({ entry }) => tileEntryKey(entry)));

  for (const { entry: candidate, comparePriority } of retentionCandidates) {
    const candidateKey = tileEntryKey(candidate);
    if (selectedKeys.has(candidateKey)) {
      continue;
    }
    const replacementIndex = findReplacementIndex(selected, reservedKeys, comparePriority);
    if (comparePriority(candidate, selected[replacementIndex]) > 0) {
      continue;
    }
    const removedKey = tileEntryKey(selected[replacementIndex]);
    selected[replacementIndex] = candidate;
    selectedKeys.delete(removedKey);
    selectedKeys.add(candidateKey);
  }

  return selected.sort(compareTileEntryOrder);
}

function selectRetentionCandidates(tileEntries, selectedKeys, reserveCount) {
  const pools = [
    { entries: [...tileEntries].sort(compareRetentionPriority), comparePriority: compareRetentionPriority },
    { entries: [...tileEntries].sort(compareOcclusionPriority), comparePriority: compareOcclusionPriority },
  ];
  const candidates = [];
  const candidateKeys = new Set();
  const cursors = new Array(pools.length).fill(0);

  while (candidates.length < reserveCount) {
    let added = false;
    for (let poolIndex = 0; poolIndex < pools.length && candidates.length < reserveCount; poolIndex += 1) {
      const pool = pools[poolIndex].entries;
      while (cursors[poolIndex] < pool.length) {
        const entry = pool[cursors[poolIndex]];
        cursors[poolIndex] += 1;
        const key = tileEntryKey(entry);
        if (selectedKeys.has(key) || candidateKeys.has(key)) {
          continue;
        }
        candidates.push({ entry, comparePriority: pools[poolIndex].comparePriority });
        candidateKeys.add(key);
        added = true;
        break;
      }
    }
    if (!added) {
      break;
    }
  }

  return candidates;
}

function findReplacementIndex(selected, reservedKeys, comparePriority) {
  let replacementIndex = -1;
  for (let index = 0; index < selected.length; index += 1) {
    if (reservedKeys.has(tileEntryKey(selected[index]))) {
      continue;
    }
    if (
      replacementIndex === -1 ||
      comparePriority(selected[index], selected[replacementIndex]) > 0
    ) {
      replacementIndex = index;
    }
  }
  return replacementIndex === -1 ? selected.length - 1 : replacementIndex;
}

function compareTileEntryOrder(left, right) {
  return (
    left.tileIndex - right.tileIndex ||
    right.coverageWeight - left.coverageWeight ||
    compareOptionalInteger(left.viewRank, right.viewRank) ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

function compareContributorArenaOrder(left, right) {
  return (
    left.tileIndex - right.tileIndex ||
    compareOptionalInteger(left.viewRank, right.viewRank) ||
    readViewDepth(left) - readViewDepth(right) ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

function compareRetentionPriority(left, right) {
  const leftWeight = readRetentionWeight(left);
  const rightWeight = readRetentionWeight(right);
  return (
    rightWeight - leftWeight ||
    right.coverageWeight - left.coverageWeight ||
    compareOptionalInteger(left.viewRank, right.viewRank) ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

function compareOcclusionPriority(left, right) {
  const leftDensity = readOcclusionDensity(left);
  const rightDensity = readOcclusionDensity(right);
  const leftWeight = readOcclusionWeight(left);
  const rightWeight = readOcclusionWeight(right);
  return (
    rightDensity - leftDensity ||
    rightWeight - leftWeight ||
    right.coverageWeight - left.coverageWeight ||
    compareOptionalInteger(left.viewRank, right.viewRank) ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

function compareOptionalInteger(left, right) {
  const leftRank = Number.isInteger(left) ? left : 0xffffffff;
  const rightRank = Number.isInteger(right) ? right : 0xffffffff;
  return leftRank - rightRank;
}

function readRetentionWeight(entry) {
  return Number.isFinite(entry.retentionWeight) && entry.retentionWeight >= 0
    ? entry.retentionWeight
    : entry.coverageWeight;
}

function readOcclusionWeight(entry) {
  return Number.isFinite(entry.occlusionWeight) && entry.occlusionWeight >= 0
    ? entry.occlusionWeight
    : readRetentionWeight(entry);
}

function readOcclusionDensity(entry) {
  if (Number.isFinite(entry.occlusionDensity) && entry.occlusionDensity >= 0) {
    return entry.occlusionDensity;
  }
  const coverageWeight = Number.isFinite(entry.coverageWeight) && entry.coverageWeight > 0
    ? entry.coverageWeight
    : 1;
  return readOcclusionWeight(entry) / coverageWeight;
}

function readCoverageWeight(entry) {
  return Number.isFinite(entry.coverageWeight) && entry.coverageWeight >= 0
    ? entry.coverageWeight
    : 0;
}

function readOpacity(entry) {
  if (Number.isFinite(entry.opacity)) {
    return Math.min(1, Math.max(0, entry.opacity));
  }
  return Math.min(1, Math.max(0, readOcclusionDensity(entry)));
}

function readViewDepth(entry) {
  if (Number.isFinite(entry.viewDepth)) {
    return entry.viewDepth;
  }
  if (Number.isFinite(entry.depth)) {
    return entry.depth;
  }
  return Number.isInteger(entry.viewRank) ? entry.viewRank : 0;
}

function readOrderRank(entry, fallback) {
  return Number.isInteger(entry.viewRank) ? entry.viewRank : fallback;
}

function summarizeDepthRange(tileEntries) {
  if (tileEntries.length === 0) {
    return { min: 0, max: 0 };
  }
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const entry of tileEntries) {
    const depth = readViewDepth(entry);
    min = Math.min(min, depth);
    max = Math.max(max, depth);
  }
  return { min, max };
}

function assignDepthBand(depth, range, depthBandCount) {
  if (depthBandCount <= 1 || range.max <= range.min) {
    return 0;
  }
  const scaled = ((depth - range.min) / (range.max - range.min)) * depthBandCount;
  return Math.min(depthBandCount - 1, Math.max(0, Math.floor(scaled)));
}

function retentionBandForDepthBand(depthBand, depthBandCount) {
  if (depthBand <= 0) {
    return "front";
  }
  if (depthBand >= depthBandCount - 1) {
    return "back";
  }
  return "middle";
}

function classifyProjectedContributorOverflowReason({
  retained,
  wasLegacySelected,
  retentionBand,
}) {
  if (retained) {
    return CONTRIBUTOR_OVERFLOW_REASONS.none;
  }
  if (wasLegacySelected) {
    return CONTRIBUTOR_OVERFLOW_REASONS.perTileRetainedCapPolicyReserve;
  }
  if (retentionBand === "front") {
    return CONTRIBUTOR_OVERFLOW_REASONS.perTileRetainedCapForegroundBand;
  }
  if (retentionBand === "back") {
    return CONTRIBUTOR_OVERFLOW_REASONS.perTileRetainedCapBehindSurfaceBand;
  }
  return CONTRIBUTOR_OVERFLOW_REASONS.perTileRetainedCapMiddleBand;
}

function transferCoverageAlpha(opacity, coverageWeight) {
  if (opacity <= 0 || coverageWeight <= 0) {
    return 0;
  }
  return 1 - Math.pow(1 - opacity, coverageWeight);
}

function contributorShapeEvidence(entry, splatsByIndex) {
  const splat = splatsByIndex.get(entry.splatIndex);
  if (!splat) {
    return {
      centerPx: [0, 0],
      inverseConic: [1, 0, 1],
    };
  }
  const inverseConic = invertCovariancePx(splat.covariancePx);
  return {
    centerPx: [splat.centerPx[0], splat.centerPx[1]],
    inverseConic: [inverseConic.xx, inverseConic.xy, inverseConic.yy],
  };
}

function tileEntryKey(entry) {
  return `${entry.tileIndex}:${entry.splatIndex}:${entry.originalId}`;
}

function resolveMaxRefsPerTile(value) {
  const maxRefsPerTile = value ?? DEFAULT_MAX_REFS_PER_TILE;
  if (!Number.isInteger(maxRefsPerTile) || maxRefsPerTile <= 0) {
    throw new Error("maxRefsPerTile must be a positive integer");
  }
  return maxRefsPerTile;
}

function resolveDepthBandCount(value) {
  const depthBandCount = value ?? DEFAULT_DEPTH_BAND_COUNT;
  if (!Number.isInteger(depthBandCount) || depthBandCount <= 0) {
    throw new Error("depthBandCount must be a positive integer");
  }
  return depthBandCount;
}

function writeTileRefShapeParams(target, refIndex, splat, tileEntry = null) {
  const base = refIndex * 8;
  if (tileEntry?.inverseConic) {
    const inverseConic = normalizeInverseConic(tileEntry.inverseConic);
    target[base] = tileEntry.centerPx[0];
    target[base + 1] = tileEntry.centerPx[1];
    target[base + 2] = inverseConic.xx;
    target[base + 3] = inverseConic.xy;
    target[base + 4] = inverseConic.yy;
    target[base + 5] = 0;
    target[base + 6] = 0;
    target[base + 7] = 0;
    return;
  }
  if (!splat) {
    target[base] = 0;
    target[base + 1] = 0;
    target[base + 2] = 1;
    target[base + 3] = 0;
    target[base + 4] = 1;
    target[base + 5] = 0;
    target[base + 6] = 0;
    target[base + 7] = 0;
    return;
  }
  const inverseConic = invertCovariancePx(splat.covariancePx);
  target[base] = splat.centerPx[0];
  target[base + 1] = splat.centerPx[1];
  target[base + 2] = inverseConic.xx;
  target[base + 3] = inverseConic.xy;
  target[base + 4] = inverseConic.yy;
  target[base + 5] = 0;
  target[base + 6] = 0;
  target[base + 7] = 0;
}

function normalizeInverseConic(inverseConic) {
  if (Array.isArray(inverseConic)) {
    return {
      xx: inverseConic[0],
      xy: inverseConic[1] ?? 0,
      yy: inverseConic[2],
    };
  }
  return {
    xx: inverseConic.xx,
    xy: inverseConic.xy ?? 0,
    yy: inverseConic.yy,
  };
}

export function writeGpuTileCoverageAlphaParams(target, bridge, effectiveOpacities, maxTileRefs = bridge.tileEntryCount) {
  const requiredLength = Math.max(1, maxTileRefs) * 8;
  if (target.length < requiredLength) {
    throw new Error("GPU tile coverage alpha-param target is too small for conic packing");
  }
  for (let refIndex = 0; refIndex < maxTileRefs; refIndex++) {
    const refBase = refIndex * 4;
    const splatId = bridge.tileRefs?.[refBase] ?? bridge.tileRefSplatIds?.[refIndex] ?? 0;
    const shapeBase = refIndex * 8;
    const primaryBase = refIndex * 4;
    const conicBase = (maxTileRefs + refIndex) * 4;
    const sourceOpacity = bridge.tileRefSourceOpacities?.[refIndex];
    target[primaryBase] = Number.isFinite(sourceOpacity) ? sourceOpacity : effectiveOpacities[splatId] ?? 0;
    target[primaryBase + 1] = bridge.tileRefShapeParams[shapeBase] ?? 0;
    target[primaryBase + 2] = bridge.tileRefShapeParams[shapeBase + 1] ?? 0;
    const orderingKey = bridge.tileRefOrderingKeys?.[refIndex];
    target[primaryBase + 3] = Number.isInteger(orderingKey) && orderingKey !== 0xffffffff ? orderingKey : -1;
    target[conicBase] = bridge.tileRefShapeParams[shapeBase + 2] ?? 1;
    target[conicBase + 1] = bridge.tileRefShapeParams[shapeBase + 3] ?? 0;
    target[conicBase + 2] = bridge.tileRefShapeParams[shapeBase + 4] ?? 1;
    target[conicBase + 3] = 0;
  }
}

function invertCovariancePx(covariancePx) {
  const xx = covariancePx?.xx;
  const xy = covariancePx?.xy ?? 0;
  const yy = covariancePx?.yy;
  if (![xx, xy, yy].every(Number.isFinite)) {
    throw new TypeError("splat covariancePx must contain finite xx, xy, and yy components");
  }
  const determinant = xx * yy - xy * xy;
  if (xx <= 0 || yy <= 0 || determinant <= 0) {
    throw new RangeError("splat covariancePx must be positive definite for inverse-conic packing");
  }
  return {
    xx: yy / determinant,
    xy: -xy / determinant,
    yy: xx / determinant,
  };
}

function resolveSplatCount(coverage) {
  if (Number.isInteger(coverage.sourceSplatCount) && coverage.sourceSplatCount >= 0) {
    return coverage.sourceSplatCount;
  }
  return coverage.splats.length;
}

export function createGpuTileCoverageBridgeBuffers(device, bridge) {
  return {
    projectedBoundsBuffer: createStorageBuffer(
      device,
      padUint32Storage(bridge.projectedBounds).buffer,
      "gpu_tile_coverage_projected_bounds"
    ),
    tileHeaderBuffer: createStorageBuffer(
      device,
      padUint32Storage(bridge.tileHeaders).buffer,
      "gpu_tile_coverage_tile_headers"
    ),
    tileRefBuffer: createStorageBuffer(
      device,
      padUint32Storage(bridge.tileRefs).buffer,
      "gpu_tile_coverage_tile_refs"
    ),
    tileCoverageWeightBuffer: createStorageBuffer(
      device,
      padFloat32Storage(bridge.tileCoverageWeights).buffer,
      "gpu_tile_coverage_tile_coverage_weights"
    ),
  };
}

function writeTileHeader(tileHeaders, tileIndex, firstRefIndex, refCount) {
  const base = tileIndex * 4;
  if (base + 3 >= tileHeaders.length) {
    throw new Error("tile index exceeds tile header storage");
  }
  tileHeaders[base] = firstRefIndex;
  tileHeaders[base + 1] = refCount;
  tileHeaders[base + 2] = 0;
  tileHeaders[base + 3] = 0;
}

function padUint32Storage(data) {
  if (data.length === 0 || data.length % 4 !== 0) {
    const padded = new Uint32Array(Math.max(4, Math.ceil(data.length / 4) * 4));
    padded.set(data);
    return padded;
  }
  return data;
}

function padFloat32Storage(data) {
  if (data.length === 0 || data.length % 4 !== 0) {
    const padded = new Float32Array(Math.max(4, Math.ceil(data.length / 4) * 4));
    padded.set(data);
    return padded;
  }
  return data;
}

function validateCenterPx(centerPx, label) {
  if (!Array.isArray(centerPx) || centerPx.length !== 2 || !centerPx.every(Number.isFinite)) {
    throw new TypeError(`${label} must be a finite [x, y] array`);
  }
}

function validateInverseConic(inverseConic, label) {
  if (!inverseConic || typeof inverseConic !== "object") {
    throw new TypeError(`${label} must be an object or tuple`);
  }
  const { xx, xy, yy } = normalizeInverseConic(inverseConic);
  if (![xx, xy, yy].every(Number.isFinite)) {
    throw new TypeError(`${label} must contain finite xx, xy, and yy components`);
  }
  if (xx <= 0 || yy <= 0 || xx * yy - xy * xy <= 0) {
    throw new RangeError(`${label} must be positive definite`);
  }
}

function validateNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
}

function validateNonNegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number`);
  }
}

function validateUnitInterval(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be in [0, 1]`);
  }
}

function createStorageBuffer(device, data, label) {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data));
  buffer.unmap();
  return buffer;
}
