import assert from "node:assert/strict";
import test from "node:test";

import { buildGpuTileCoverageBridge } from "../../src/gpuTileCoverageBridge.js";
import {
  diagnoseTileCellArtifact,
  summarizeRetainedSetBoundaryDiscontinuity,
} from "../../src/rendererFidelityProbes/tileCellArtifactDiagnosis.js";

function makeSplat(splatIndex, centerPx = [32, 32]) {
  return {
    splatIndex,
    originalId: splatIndex,
    centerPx,
    covariancePx: { xx: 16, xy: 0, yy: 16 },
    tileBounds: { minTileX: 0, minTileY: 0, maxTileX: 1, maxTileY: 0 },
  };
}

function makeEntry(tileIndex, splatIndex, overrides = {}) {
  return {
    tileIndex,
    tileX: tileIndex,
    tileY: 0,
    splatIndex,
    originalId: splatIndex,
    coverageWeight: 1,
    retentionWeight: 0.2,
    occlusionWeight: 0.2,
    opacity: 0.7,
    viewRank: splatIndex,
    ...overrides,
  };
}

function buildBoundaryBridge({ capped }) {
  const sharedSurface = [0, 1, 2, 3].flatMap((splatIndex) => [
    makeEntry(0, splatIndex),
    makeEntry(1, splatIndex),
  ]);
  const leftPressure = capped
    ? [10, 11].map((splatIndex) => makeEntry(0, splatIndex, {
      coverageWeight: 0.01,
      retentionWeight: 4,
      occlusionWeight: 3,
      opacity: 0.7,
    }))
    : [];
  const rightPressure = capped
    ? [20, 21].map((splatIndex) => makeEntry(1, splatIndex, {
      coverageWeight: 0.01,
      retentionWeight: 4,
      occlusionWeight: 3,
      opacity: 0.7,
    }))
    : [];
  const allIds = [...new Set([...sharedSurface, ...leftPressure, ...rightPressure].map((entry) => entry.splatIndex))];

  return buildGpuTileCoverageBridge({
    viewportWidth: 64,
    viewportHeight: 32,
    tileSizePx: 32,
    tileColumns: 2,
    tileRows: 1,
    sourceSplatCount: Math.max(...allIds) + 1,
    splats: allIds.map((splatIndex) => makeSplat(splatIndex, splatIndex < 20 ? [31.5, 16] : [32.5, 16])),
    tileEntries: [...sharedSurface, ...leftPressure, ...rightPressure],
    maxRefsPerTile: 4,
  });
}

test("diagnosis pins a smooth tile-boundary artifact to retained-ref cap discontinuity", () => {
  const bridge = buildBoundaryBridge({ capped: true });
  const boundary = summarizeRetainedSetBoundaryDiscontinuity({
    tileHeaders: bridge.tileHeaders,
    tileRefs: bridge.tileRefs,
    tileColumns: bridge.tileColumns,
    tileRows: bridge.tileRows,
    maxRefsPerTile: bridge.maxRefsPerTile,
  });

  assert.equal(boundary.maxDiscontinuity.kind, "vertical");
  assert.deepEqual(boundary.maxDiscontinuity.leftOnlyOriginalIds, [10, 11]);
  assert.deepEqual(boundary.maxDiscontinuity.rightOnlyOriginalIds, [20, 21]);
  assert.ok(Math.abs(boundary.maxDiscontinuity.retainedJaccard - 1 / 3) < 1e-6);

  const diagnosis = diagnoseTileCellArtifact({
    tileLocalStatus: "current",
    currentFrameSignature: "tile-local@same",
    cachedFrameSignature: "tile-local@same",
    tileRefCustody: bridge.tileRefCustody,
    retentionAudit: bridge.retentionAudit,
    boundary,
    alpha: {
      estimatedMaxAccumulatedAlpha: 1,
      estimatedMinTransmittance: 0,
    },
    conicShape: {
      maxAnisotropyRatio: 1,
    },
  });

  assert.equal(diagnosis.primaryCause, "retained-ref-cap-tile-boundary-discontinuity");
  assert.equal(diagnosis.excludes.staleState, true);
  assert.equal(diagnosis.excludes.alphaUnderAccumulation, true);
  assert.equal(diagnosis.excludes.conicCoverageSampling, true);
  assert.equal(diagnosis.evidence.cap.saturatedRetainedTileCount, 2);
});

test("diagnosis does not blame tile-boundary cap discontinuity when adjacent retained sets match", () => {
  const bridge = buildBoundaryBridge({ capped: false });
  const boundary = summarizeRetainedSetBoundaryDiscontinuity({
    tileHeaders: bridge.tileHeaders,
    tileRefs: bridge.tileRefs,
    tileColumns: bridge.tileColumns,
    tileRows: bridge.tileRows,
    maxRefsPerTile: bridge.maxRefsPerTile,
  });
  const diagnosis = diagnoseTileCellArtifact({
    tileLocalStatus: "current",
    currentFrameSignature: "tile-local@same",
    cachedFrameSignature: "tile-local@same",
    tileRefCustody: bridge.tileRefCustody,
    retentionAudit: bridge.retentionAudit,
    boundary,
    alpha: {
      estimatedMaxAccumulatedAlpha: 1,
      estimatedMinTransmittance: 0,
    },
    conicShape: {
      maxAnisotropyRatio: 1,
    },
  });

  assert.equal(boundary.maxDiscontinuity.retainedJaccard, 1);
  assert.notEqual(diagnosis.primaryCause, "retained-ref-cap-tile-boundary-discontinuity");
});

test("diagnosis keeps stale diagnostic mismatch separate from retained-ref evidence", () => {
  const diagnosis = diagnoseTileCellArtifact({
    tileLocalStatus: "stale",
    currentFrameSignature: "tile-local@current",
    cachedFrameSignature: "tile-local@old",
    tileRefCustody: {
      retainedTileEntryCount: 0,
      evictedTileEntryCount: 0,
      cappedTileCount: 0,
      saturatedRetainedTileCount: 0,
      maxProjectedRefsPerTile: 0,
      maxRetainedRefsPerTile: 0,
    },
    boundary: {
      maxRetainedSetDiscontinuity: 0,
      maxDiscontinuity: null,
    },
  });

  assert.equal(diagnosis.primaryCause, "stale-diagnostic-state");
  assert.equal(diagnosis.excludes.staleState, false);
});
