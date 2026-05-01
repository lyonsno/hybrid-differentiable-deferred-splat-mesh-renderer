export function buildGpuTileCoverageBridge(coverage) {
  const tileCount = coverage.tileColumns * coverage.tileRows;
  const splatCount = resolveSplatCount(coverage);
  const tileEntryCount = coverage.tileEntries.length;
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

  for (let refIndex = 0; refIndex < tileEntryCount; refIndex++) {
    const entry = coverage.tileEntries[refIndex];
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
  };
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
