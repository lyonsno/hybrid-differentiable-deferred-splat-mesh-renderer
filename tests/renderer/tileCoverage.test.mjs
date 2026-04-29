import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProjectedGaussianTileCoverage,
  summarizeCenterTileCoverageFailure,
} from "../../src/rendererFidelityProbes/tileCoverage.js";

const assertClose = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
};

test("CPU coverage builder assigns one projected Gaussian to every overlapped tile", () => {
  const coverage = buildProjectedGaussianTileCoverage({
    viewportWidth: 96,
    viewportHeight: 96,
    tileSizePx: 32,
    splats: [
      {
        splatIndex: 0,
        originalId: 42,
        centerPx: [48, 48],
        covariancePx: { xx: 20 * 20, xy: 0, yy: 20 * 20 },
      },
    ],
  });

  assert.equal(coverage.tileColumns, 3);
  assert.equal(coverage.tileRows, 3);
  assert.equal(coverage.splats[0].centerTile.tileX, 1);
  assert.equal(coverage.splats[0].centerTile.tileY, 1);
  assert.equal(coverage.splats[0].tiles.length, 9);
  assert.deepEqual(
    coverage.tileEntries.map((entry) => [entry.tileX, entry.tileY]),
    [
      [0, 0], [1, 0], [2, 0],
      [0, 1], [1, 1], [2, 1],
      [0, 2], [1, 2], [2, 2],
    ]
  );
  assert.ok(coverage.splats[0].totalCoverageWeight > coverage.splats[0].centerTile.coverageWeight);
});

test("center-tile accounting drops most coverage for a tile-straddling Gaussian", () => {
  const coverage = buildProjectedGaussianTileCoverage({
    viewportWidth: 128,
    viewportHeight: 64,
    tileSizePx: 32,
    splats: [
      {
        splatIndex: 0,
        originalId: 7,
        centerPx: [31, 31],
        covariancePx: { xx: 18 * 18, xy: 0, yy: 18 * 18 },
      },
    ],
  });

  const failure = summarizeCenterTileCoverageFailure(coverage);

  assert.equal(failure.worstSplat.originalId, 7);
  assert.equal(failure.worstSplat.centerTile.tileX, 0);
  assert.equal(failure.worstSplat.centerTile.tileY, 0);
  assert.ok(failure.worstSplat.droppedCoverageWeight > 0.45);
  assert.ok(failure.worstSplat.droppedCoverageFraction > 0.55);
  assert.deepEqual(failure.worstSplat.coveredTileCount, coverage.splats[0].tiles.length);
});

test("anisotropic projected Gaussian produces a stable GPU-consumable tile-list shape", () => {
  const coverage = buildProjectedGaussianTileCoverage({
    viewportWidth: 160,
    viewportHeight: 96,
    tileSizePx: 32,
    splats: [
      {
        splatIndex: 3,
        originalId: 103,
        centerPx: [80, 48],
        covariancePx: { xx: 30 * 30, xy: 0, yy: 6 * 6 },
      },
    ],
  });

  assert.deepEqual(coverage.splats[0].tileBounds, {
    minTileX: 0,
    minTileY: 0,
    maxTileX: 4,
    maxTileY: 2,
  });
  assert.ok(coverage.splats[0].tiles.length >= 5);
  assert.ok(coverage.splats[0].tiles.every((entry) => entry.coverageWeight > 0));
  assert.deepEqual(
    Object.keys(coverage.tileEntries[0]),
    ["tileIndex", "tileX", "tileY", "splatIndex", "originalId", "coverageWeight"]
  );
  assert.deepEqual(
    coverage.tileEntries.map((entry) => entry.tileIndex),
    [...coverage.tileEntries.map((entry) => entry.tileIndex)].sort((a, b) => a - b)
  );
  assertClose(coverage.splats[0].tiles.reduce((sum, entry) => sum + entry.coverageWeight, 0), coverage.splats[0].totalCoverageWeight, 1e-12, "splat total coverage");
});

test("rotated covariance bounds use marginal support instead of dropping diagonal tiles", () => {
  const majorVariance = 30 * 30;
  const minorVariance = 6 * 6;
  const rotatedFortyFiveDegrees = {
    xx: 0.5 * (majorVariance + minorVariance),
    xy: 0.5 * (majorVariance - minorVariance),
    yy: 0.5 * (majorVariance + minorVariance),
  };

  const coverage = buildProjectedGaussianTileCoverage({
    viewportWidth: 160,
    viewportHeight: 128,
    tileSizePx: 32,
    splats: [
      {
        splatIndex: 1,
        originalId: 501,
        centerPx: [80, 48],
        covariancePx: rotatedFortyFiveDegrees,
      },
    ],
  });

  assert.deepEqual(coverage.splats[0].covariancePx, rotatedFortyFiveDegrees);
  assert.deepEqual(coverage.splats[0].tileBounds, {
    minTileX: 0,
    minTileY: 0,
    maxTileX: 4,
    maxTileY: 3,
  });
  assert.ok(coverage.splats[0].tiles.some((entry) => entry.tileX === 0 && entry.tileY === 0));
  assert.ok(coverage.splats[0].tiles.some((entry) => entry.tileX === 4 && entry.tileY === 3));
  assert.ok(coverage.splats[0].totalCoverageWeight > coverage.splats[0].centerTile.coverageWeight);
});

test("invalid coverage inputs fail before producing ambiguous tile data", () => {
  assert.throws(
    () => buildProjectedGaussianTileCoverage({
      viewportWidth: 64,
      viewportHeight: 64,
      tileSizePx: 0,
      splats: [],
    }),
    /tileSizePx must be a positive finite number/
  );
  assert.throws(
    () => buildProjectedGaussianTileCoverage({
      viewportWidth: 64,
      viewportHeight: 64,
      tileSizePx: 32,
      splats: [
        {
          splatIndex: 0,
          originalId: 1,
          centerPx: [32, 32],
          covariancePx: { xx: 1, xy: 0, yy: 0 },
        },
      ],
    }),
    /covariancePx must be positive definite/
  );
});
