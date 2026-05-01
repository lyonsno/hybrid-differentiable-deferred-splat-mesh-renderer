const DEFAULT_MAX_REFS_PER_TILE = 32;

export function buildGpuTileCoverageBridge(coverage, options = {}) {
  const tileCount = coverage.tileColumns * coverage.tileRows;
  const splatCount = resolveSplatCount(coverage);
  const maxRefsPerTile = resolveMaxRefsPerTile(options.maxRefsPerTile ?? coverage.maxRefsPerTile);
  const retainedTileEntries = retainTileEntries(coverage.tileEntries, maxRefsPerTile);
  const retainedTileEntryCount = retainedTileEntries.length;
  const tileEntryCount = Math.max(retainedTileEntryCount, splatCount);
  const projectedBounds = new Uint32Array(Math.max(0, splatCount * 4));
  const tileHeaders = new Uint32Array(Math.max(0, tileCount * 4));
  const tileRefs = new Uint32Array(Math.max(0, tileEntryCount * 4));
  const tileCoverageWeights = new Float32Array(Math.max(0, tileEntryCount));
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
    writeTileRefShapeParams(tileRefShapeParams, refIndex, splatsByIndex.get(entry.splatIndex));
    refCount += 1;
  }

  if (currentTileIndex >= 0) {
    writeTileHeader(tileHeaders, currentTileIndex, firstRefIndex, refCount);
  }
  const tileRefCustody = summarizeTileRefCustody({
    tileEntries: coverage.tileEntries,
    retainedTileEntryCount,
    tileHeaders,
    tileCount,
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
    tileRefShapeParams,
    maxRefsPerTile,
    retainedTileEntryCount,
    tileRefCustody,
  };
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

function writeTileRefShapeParams(target, refIndex, splat) {
  const base = refIndex * 8;
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
    target[primaryBase] = effectiveOpacities[splatId] ?? 0;
    target[primaryBase + 1] = bridge.tileRefShapeParams[shapeBase] ?? 0;
    target[primaryBase + 2] = bridge.tileRefShapeParams[shapeBase + 1] ?? 0;
    target[primaryBase + 3] = 0;
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
