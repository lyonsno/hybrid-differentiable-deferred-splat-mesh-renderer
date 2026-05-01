import assert from "node:assert/strict";
import test from "node:test";

import { buildProjectedGaussianTileCoverage } from "../../src/rendererFidelityProbes/tileCoverage.js";
import {
  buildGpuTileCoverageBridge,
  writeGpuTileCoverageAlphaParams,
} from "../../src/gpuTileCoverageBridge.js";

const EPSILON = 1e-6;

function assertCloseArray(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label} length`);
  for (let index = 0; index < actual.length; index++) {
    assert.ok(Math.abs(actual[index] - expected[index]) < EPSILON, `${label}[${index}] expected ${expected[index]}, got ${actual[index]}`);
  }
}

test("tile-list bridge packs stable headers, refs, coverage weights, and projected bounds", () => {
  const coverage = buildProjectedGaussianTileCoverage({
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 32,
    sigmaRadius: 3,
    samplesPerAxis: 3,
    splats: [
      {
        splatIndex: 0,
        originalId: 4,
        centerPx: [4, 4],
        covariancePx: { xx: 49, xy: 0, yy: 49 },
      },
    ],
  });

  const bridge = buildGpuTileCoverageBridge(coverage);

  assert.equal(bridge.tileCount, 4);
  assert.equal(bridge.splatCount, 1);
  assert.equal(bridge.tileEntryCount, 1);
  assert.deepEqual(Array.from(bridge.projectedBounds), [0, 0, 0, 0]);
  assert.deepEqual(Array.from(bridge.tileHeaders), [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(Array.from(bridge.tileRefs), [0, 4, 0, 0]);
  assert.equal(bridge.tileCoverageWeights.length, 1);
  assert.ok(Math.abs(bridge.tileCoverageWeights[0] - coverage.tileEntries[0].coverageWeight) < 1e-6);
  assertCloseArray(Array.from(bridge.tileRefShapeParams), [4, 4, 1 / 49, 0, 1 / 49, 0, 0, 0], "shape params");
});

test("tile-list bridge packs inverse conic parameters instead of scalar radius", () => {
  const bridge = buildGpuTileCoverageBridge({
    viewportWidth: 96,
    viewportHeight: 96,
    tileSizePx: 32,
    tileColumns: 3,
    tileRows: 3,
    sourceSplatCount: 1,
    splats: [
      {
        splatIndex: 0,
        originalId: 9,
        centerPx: [48, 48],
        covariancePx: { xx: 64, xy: 0, yy: 0.04 },
        tileBounds: { minTileX: 0, minTileY: 1, maxTileX: 2, maxTileY: 1 },
      },
    ],
    tileEntries: [
      {
        tileIndex: 4,
        tileX: 1,
        tileY: 1,
        splatIndex: 0,
        originalId: 9,
        coverageWeight: 1,
      },
    ],
  });

  assertCloseArray(Array.from(bridge.tileRefShapeParams), [48, 48, 1 / 64, 0, 25, 0, 0, 0], "shape params");
  assert.notEqual(bridge.tileRefShapeParams[2], 8, "shape params must not collapse covariance to sqrt(max axis)");

  const alphaParams = new Float32Array(8);
  writeGpuTileCoverageAlphaParams(alphaParams, bridge, Float32Array.of(0.6), 1);

  assertCloseArray(Array.from(alphaParams), [0.6, 48, 48, 0, 1 / 64, 0, 25, 0], "alpha params");
});

test("tile-list bridge caps each tile while retaining visually important low-coverage refs", () => {
  const surfaceEntries = Array.from({ length: 36 }, (_, index) => ({
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: index,
    originalId: 100 + index,
    coverageWeight: 10,
    retentionWeight: 0.35,
  }));
  const brightBehind = {
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: 36,
    originalId: 900,
    coverageWeight: 0.25,
    retentionWeight: 1.05,
  };

  const bridge = buildGpuTileCoverageBridge({
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 64,
    tileColumns: 1,
    tileRows: 1,
    sourceSplatCount: 37,
    splats: Array.from({ length: 37 }, (_, index) => ({
      splatIndex: index,
      originalId: index === 36 ? 900 : 100 + index,
      centerPx: [32, 32],
      covariancePx: { xx: 16, xy: 0, yy: 16 },
      tileBounds: { minTileX: 0, minTileY: 0, maxTileX: 0, maxTileY: 0 },
    })),
    tileEntries: [...surfaceEntries, brightBehind],
    maxRefsPerTile: 32,
  });

  const retainedRefCount = bridge.tileHeaders[1];
  const retainedSplatIds = [];
  let brightRefIndex = -1;
  for (let index = 0; index < retainedRefCount; index += 1) {
    const splatIndex = bridge.tileRefs[index * 4];
    retainedSplatIds.push(splatIndex);
    if (splatIndex === 36) {
      brightRefIndex = index;
    }
  }

  assert.equal(retainedRefCount, 32);
  assert.equal(bridge.maxRefsPerTile, 32);
  assert.equal(bridge.retainedTileEntryCount, 32);
  assert.ok(bridge.tileEntryCount <= 37);
  assert.equal(retainedSplatIds.includes(36), true);
  assert.notEqual(brightRefIndex, -1);
  assert.equal(bridge.tileCoverageWeights[brightRefIndex], 0.25);
  assert.deepEqual(bridge.tileRefCustody, {
    projectedTileEntryCount: 37,
    retainedTileEntryCount: 32,
    evictedTileEntryCount: 5,
    cappedTileCount: 1,
    saturatedRetainedTileCount: 1,
    maxProjectedRefsPerTile: 37,
    maxRetainedRefsPerTile: 32,
    headerRefCount: 32,
    headerAccountingMatches: true,
  });
});
