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
  assert.match(shader, /let sourceFrontierSupportWeight = conic_pixel_weight_with_falloff_scale\(alphaParam,\s*conicParam,\s*pixelCenter,\s*SOURCE_FRONTIER_SUPPORT_FALLOFF_SCALE\)/);
  assert.match(shader, /let alphaTransferWeight = source_frontier_alpha_transfer_weight\(pixelCoverageWeight,\s*tileCoverageWeight,\s*tileLocalSupportWeight,\s*sourceFrontierSupportWeight,\s*sourceFrontierClassMask\)/);
  assert.match(shader, /pow\(1\.0\s*-\s*sourceOpacity,\s*alphaTransferWeight\)/);
  assert.doesNotMatch(
    shader,
    /tileCoverageWeights\[selectedRefIndex\][^;]*\*\s*conic_pixel_weight/,
    "per-tile integral weights must not attenuate the sample-local conic response",
  );
});

test("tile-local visible conic coverage keeps adaptive anisotropic falloff without scalar-radius overcoverage", () => {
  const shader = shaderSource();

  assert.match(shader, /fn conic_falloff_scale\(\) -> f32/);
  assert.match(shader, /fn conic_falloff_scale\(\) -> f32\s*\{\s*return 2\.0;\s*\}/);
  assert.doesNotMatch(shader, /frame\.tileSizePx >= 16\.0 && frame\.maxTileRefs >= 256u/);
  assert.match(shader, /fn conic_pixel_weight\(alphaParam: vec4f, conicParam: vec4f, pixelCenter: vec2f\) -> f32/);
  assert.match(shader, /2\.0 \* conicParam\.y \* delta\.x \* delta\.y/);
  assert.match(shader, /return conic_pixel_weight_with_falloff_scale\(alphaParam,\s*conicParam,\s*pixelCenter,\s*conic_falloff_scale\(\)\)/);
  assert.match(shader, /const SOURCE_FRONTIER_SUPPORT_FALLOFF_SCALE = 0\.5/);
  assert.match(shader, /fn gpu_live_projected_conic/);
  assert.match(shader, /fn gpu_live_compact_footprint_bounds\(conic: GpuLiveConic, centerPx: vec2f, tileSizePx: u32\) -> vec4u/);
});

test("source-frontier alpha support carries tile-local conic support beyond the tile-center sample", () => {
  const shader = shaderSource();

  assert.match(
    shader,
    /fn gpu_live_tile_local_support_weight\(conic: GpuLiveConic,\s*tileMinPx: vec2f,\s*tileMaxPx: vec2f\) -> f32/,
    "GPU source-frontier refs should compute a tile-local support bound for anisotropic footprints",
  );
  assert.match(
    shader,
    /let tileLocalSupportWeight = gpu_live_tile_local_support_weight\(/,
    "build_tile_refs should compute tile-local support separately from tile-center coverage",
  );
  assert.match(
    shader,
    /alphaParams\[refIndex \+ frame\.maxTileRefs\] = vec4f\(inverseConic,\s*tileLocalSupportWeight\)/,
    "the otherwise-unused conic payload lane should carry tile-local support into the compositor",
  );
  assert.match(
    shader,
    /let tileLocalSupportWeight = max\(tileCoverageWeight,\s*conicParam\.w\)/,
    "composite_tiles should recover the tile-local support bound for alpha transfer",
  );
  assert.match(
    shader,
    /source_frontier_alpha_transfer_weight\(pixelCoverageWeight,\s*tileCoverageWeight,\s*tileLocalSupportWeight,\s*sourceFrontierSupportWeight,\s*sourceFrontierClassMask\)/,
    "source-frontier alpha transfer should use tile-local support rather than only tile-center coverage",
  );
});
