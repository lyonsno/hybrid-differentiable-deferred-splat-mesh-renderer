import assert from "node:assert/strict";
import test from "node:test";

import { buildProjectedGaussianTileCoverage } from "../../src/rendererFidelityProbes/tileCoverage.js";
import { buildGpuTileCoverageBridge } from "../../src/gpuTileCoverageBridge.js";

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
  assert.deepEqual(Array.from(bridge.tileRefShapeParams), [4, 4, 7, 0]);
});
