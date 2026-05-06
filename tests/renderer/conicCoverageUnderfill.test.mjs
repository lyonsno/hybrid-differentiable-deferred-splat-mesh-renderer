import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildProjectedGaussianTileCoverage } from "../../src/rendererFidelityProbes/tileCoverage.js";

const shaderSource = () =>
  readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

test("tile-local visible conic coverage feeds sample-local Gaussian weight to alpha transfer", () => {
  const coverage = buildProjectedGaussianTileCoverage({
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 32,
    samplesPerAxis: 5,
    splats: [
      {
        splatIndex: 0,
        originalId: 1,
        centerPx: [32, 32],
        covariancePx: { xx: 8 * 8, xy: 0, yy: 8 * 8 },
      },
    ],
  });
  const centerTile = coverage.tileEntries.find((entry) => entry.tileX === 1 && entry.tileY === 1);

  assert.ok(centerTile.coverageWeight > 0);
  assert.ok(
    centerTile.coverageWeight < 0.5,
    `test fixture should expose the old underfill multiplier, got ${centerTile.coverageWeight}`,
  );

  const shader = shaderSource();
  assert.match(shader, /let pixelCoverageWeight = conic_pixel_weight\(alphaParam, conicParam, pixelCenter\)/);
  assert.match(shader, /pow\(1\.0\s*-\s*sourceOpacity,\s*pixelCoverageWeight\)/);
  assert.doesNotMatch(
    shader,
    /tileCoverageWeights\[selectedRefIndex\][^;]*\*\s*conic_pixel_weight/,
    "per-tile integral weights must not attenuate the sample-local conic response",
  );
});

test("tile-local visible conic coverage keeps plate-rate anisotropic falloff without scalar-radius overcoverage", () => {
  const shader = shaderSource();

  assert.match(shader, /fn conic_pixel_weight\(alphaParam: vec4f, conicParam: vec4f, pixelCenter: vec2f\) -> f32/);
  assert.match(shader, /2\.0 \* conicParam\.y \* delta\.x \* delta\.y/);
  assert.match(shader, /exp\(-2\.0 \* mahalanobis2\)/);
  assert.doesNotMatch(shader, /exp\(-0\.5 \* mahalanobis2\)/);
  assert.doesNotMatch(shader, /radiusPx/);
});
