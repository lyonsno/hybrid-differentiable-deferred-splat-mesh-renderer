import assert from "node:assert/strict";
import test from "node:test";

import { buildTileLocalContributorArena } from "../../src/gpuTileCoverageBridge.js";
import { buildPerPixelRetainedContributorTraces } from "../../src/rendererFidelityProbes/retentionPixelTrace.js";
import { buildDeterministicGpuTileProjectionRetentionArena } from "../../node_modules/.cache/renderer-tests/src/gpuTileCoverage.js";

test("compact retained-source parity preserves tile headers, row custody, and explicit deferred placeholders", () => {
  const coverage = denseTileCoverage();
  const cpuArena = buildTileLocalContributorArena(coverage, {
    maxRefsPerTile: 4,
    depthBandCount: 4,
  });
  const gpuArena = buildDeterministicGpuTileProjectionRetentionArena({
    tileCount: 1,
    maxContributors: 8,
    maxRefsPerTile: 4,
    contributors: cpuArena.projectedContributors,
  });
  const trace = buildPerPixelRetainedContributorTraces({
    projectedContributors: cpuArena.projectedContributors,
    retainedContributors: gpuArena.retainedRecords,
    viewportWidth: coverage.viewportWidth,
    viewportHeight: coverage.viewportHeight,
    tileSizePx: coverage.tileSizePx,
    tileColumns: coverage.tileColumns,
    tileRows: coverage.tileRows,
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible",
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
    },
  });
  const anchorTrace = trace.find((entry) => entry.tileAddress.tileIndex === 0);

  assert.ok(anchorTrace, "expected a canonical trace entry for the single tile");
  assert.deepEqual(cpuArena.tileHeaders[0], {
    contributorOffset: 0,
    retainedContributorCount: 4,
    projectedContributorCount: 8,
    droppedContributorCount: 4,
    overflowFlags: 1,
    maxRetainedViewRank: 7,
    minRetainedDepth: 0.18,
    maxRetainedDepth: 0.62,
  });
  assert.deepEqual([...gpuArena.projectedCounts], [8]);
  assert.deepEqual([...gpuArena.retainedCounts], [4]);
  assert.deepEqual([...gpuArena.tileHeaderU32.slice(0, 8)], [0, 4, 8, 4, 1, 7, 0, 0]);

  assert.deepEqual(
    gpuArena.retainedRecords.map(retainedRowSignature),
    cpuArena.contributors
      .slice()
      .sort((left, right) => left.contributorIndex - right.contributorIndex)
      .map(retainedRowSignature),
  );
  assert.deepEqual(
    gpuArena.droppedRecords.map(retainedRowSignature),
    cpuArena.projectedContributors
      .filter((record) => !record.retained)
      .map(retainedRowSignature),
  );

  assert.equal(
    cpuArena.projectedContributors.filter((record) => !record.retained).every((record) => record.overflowReason === "perTileRetainedCap"),
    true,
  );
  assert.equal(
    cpuArena.projectedContributors.filter((record) => !record.retained).every((record) => record.overflowReasonDetail !== "none"),
    true,
  );
  assert.equal(
    anchorTrace.traceRecord.projectedContributors.every((record) => record.deferredSurface === null),
    true,
  );
  assert.equal(
    anchorTrace.traceRecord.retainedContributors.every((record) => record.deferredSurface === null),
    true,
  );
  assert.equal(
    anchorTrace.droppedContributors.every((record) => record.deferredSurface === null),
    true,
  );
  assert.equal(anchorTrace.traceRecord.deferredFields.deferredSurface, null);
  assert.deepEqual(
    anchorTrace.traceRecord.retainedContributors.map(({ originalId, retentionStatus, overflowReason, retentionBand, retained, deferredSurface }) => ({
      originalId,
      retentionStatus,
      overflowReason,
      retentionBand,
      retained,
      deferredSurface,
    })),
    gpuArena.retainedRecords.map(({ originalId, retentionStatus, overflowReason, retentionBand, retained, deferredSurface }) => ({
      originalId,
      retentionStatus,
      overflowReason,
      retentionBand,
      retained,
      deferredSurface,
    })),
  );
  assert.deepEqual(
    anchorTrace.droppedContributors.map(({ originalId, retentionStatus, overflowReason, retentionBand, retained, deferredSurface }) => ({
      originalId,
      retentionStatus,
      overflowReason,
      retentionBand,
      retained,
      deferredSurface,
    })),
    gpuArena.droppedRecords.map(({ originalId, retentionStatus, overflowReason, retentionBand, retained, deferredSurface }) => ({
      originalId,
      retentionStatus,
      overflowReason,
      retentionBand,
      retained,
      deferredSurface,
    })),
  );
});

function retainedRowSignature(record) {
  return {
    splatIndex: record.splatIndex,
    originalId: record.originalId,
    tileIndex: record.tileIndex,
    contributorIndex: record.contributorIndex,
    viewRank: record.viewRank,
    viewDepth: record.viewDepth,
    depthBand: record.depthBand,
    coverageWeight: record.coverageWeight,
    centerPx: [...record.centerPx],
    inverseConic: [...record.inverseConic],
    opacity: record.opacity,
    coverageAlpha: record.coverageAlpha,
    transmittanceBefore: record.transmittanceBefore,
    retentionWeight: record.retentionWeight,
    occlusionWeight: record.occlusionWeight,
    retentionStatus: record.retentionStatus,
    retentionBand: record.retentionBand,
    overflowReason: record.overflowReason,
    overflowReasonDetail: record.overflowReasonDetail,
    deferredSurface: record.deferredSurface,
  };
}

function denseTileCoverage() {
  const surface = Array.from({ length: 6 }, (_, index) => ({
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: index,
    originalId: 100 + index,
    coverageWeight: 10 - index * 0.1,
    retentionWeight: 0.35,
    occlusionWeight: 0.35,
    occlusionDensity: 0.08,
    opacity: 0.08,
    viewDepth: 0.3 + index * 0.01,
    viewRank: 1 + index,
  }));
  const darkForeground = {
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: 6,
    originalId: 800,
    coverageWeight: 0.2,
    retentionWeight: 0.004,
    occlusionWeight: 0.19,
    occlusionDensity: 0.95,
    opacity: 0.95,
    viewDepth: 0.18,
    viewRank: 0,
  };
  const brightBehind = {
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: 7,
    originalId: 900,
    coverageWeight: 0.25,
    retentionWeight: 1.05,
    occlusionWeight: 0.15,
    occlusionDensity: 0.6,
    opacity: 0.6,
    viewDepth: 0.62,
    viewRank: 7,
  };

  return {
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 64,
    tileColumns: 1,
    tileRows: 1,
    sourceSplatCount: 8,
    splats: Array.from({ length: 8 }, (_, index) => ({
      splatIndex: index,
      originalId: index === 6 ? 800 : index === 7 ? 900 : 100 + index,
      centerPx: [32, 32],
      covariancePx: { xx: 16, xy: 0, yy: 16 },
      tileBounds: { minTileX: 0, minTileY: 0, maxTileX: 0, maxTileY: 0 },
    })),
    tileEntries: [...surface, darkForeground, brightBehind],
    maxRefsPerTile: 4,
  };
}
