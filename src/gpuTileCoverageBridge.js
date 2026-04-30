export function buildGpuTileCoverageBridge(coverage) {
  const tileCount = coverage.tileColumns * coverage.tileRows;
  const splatCount = coverage.splats.length;
  const tileEntryCount = coverage.tileEntries.length;
  const projectedBounds = new Uint32Array(Math.max(0, splatCount * 4));
  const tileHeaders = new Uint32Array(Math.max(0, tileCount * 4));
  const tileRefs = new Uint32Array(Math.max(0, tileEntryCount * 4));
  const tileCoverageWeights = new Float32Array(Math.max(0, tileEntryCount));

  for (const splat of coverage.splats) {
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
  };
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
