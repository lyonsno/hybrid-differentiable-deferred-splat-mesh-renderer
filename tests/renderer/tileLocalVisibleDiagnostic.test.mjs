import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("main exposes a visible tile-local Gaussian compositor without replacing the prepass smoke mode", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /"tile-local-visible"/);
  assert.match(source, /tile-local-visible-gaussian-compositor/);
  assert.match(source, /createTileLocalTexturePresenter/);
  assert.match(source, /dispatchComposite/);
  assert.doesNotMatch(source, /dispatchBridgeDiagnosticComposite/);
  assert.match(source, /tileLocalPresenter\.draw/);
  assert.match(source, /params\.get\("renderer"\)\s*===\s*"tile-local-visible"/);
  assert.match(source, /params\.get\("renderer"\)\s*===\s*"tile-local"/);
});

test("tile-local visible shader composites ordered tile refs with sample-local conic coverage, alpha, and real colors", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(shader, /fn composite_tiles/);
  assert.match(shader, /textureDimensions\(outputColor\)/);
  assert.match(shader, /var<storage, read> colors/);
  assert.match(shader, /tileHeaders\[tileId\]/);
  assert.match(shader, /tileRefs\[refIndex\]/);
  assert.match(shader, /let alphaParam = alphaParams\[alphaParamIndex\]/);
  assert.match(shader, /let conicParam = alphaParams\[alphaParamIndex \+ frame\.maxTileRefs\]/);
  assert.match(shader, /alphaParam\.yz/);
  assert.match(shader, /conicParam\.x/);
  assert.match(shader, /conicParam\.y/);
  assert.match(shader, /conicParam\.z/);
  assert.match(shader, /let pixelCoverageWeight = conic_pixel_weight\(alphaParam, conicParam, pixelCenter\)/);
  assert.match(shader, /1\.0\s*-\s*pow\(1\.0\s*-\s*sourceOpacity,\s*pixelCoverageWeight\)/);
  assert.match(shader, /orderingKeys\[tileRef\.x\]/);
  assert.match(shader, /conic_pixel_weight/);
  assert.match(shader, /mahalanobis2/);
  assert.match(shader, /exp\(-0\.5 \* mahalanobis2\)/);
  assert.doesNotMatch(shader, /tileCoverageWeights\[selectedRefIndex\][^;]*\*\s*conic_pixel_weight/);
  assert.doesNotMatch(shader, /radiusPx/);
  assert.doesNotMatch(shader, /\balphaParam\.w\b/);
  assert.match(shader, /remainingTransmission/);
  assert.doesNotMatch(shader, /identityTint/);
  assert.doesNotMatch(shader, /occupancyWitness/);
  assert.doesNotMatch(shader, /alphaScale \* 0\.0/);
});

test("tile-local texture presenter samples the offscreen tile-local output", () => {
  const source = readFileSync(new URL("../../src/tileLocalTexturePresenter.ts", import.meta.url), "utf8");
  const shader = readFileSync(new URL("../../src/shaders/tile_local_present.wgsl", import.meta.url), "utf8");

  assert.match(source, /createTileLocalTexturePresenter/);
  assert.match(source, /GPUTextureView/);
  assert.match(source, /magFilter:\s*"nearest"/);
  assert.match(source, /minFilter:\s*"nearest"/);
  assert.match(source, /texture:\s*\{\s*sampleType:\s*"float"\s*\}/);
  assert.match(shader, /textureSample/);
  assert.match(shader, /@vertex/);
  assert.match(shader, /@fragment/);
});
