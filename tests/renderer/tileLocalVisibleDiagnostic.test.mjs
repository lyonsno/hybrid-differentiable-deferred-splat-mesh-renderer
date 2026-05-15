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
  assert.match(source, /gpu-sorted-index-rank-inversion/);
  assert.match(source, /orderingBackend:\s*TILE_LOCAL_ORDERING_BACKEND/);
  assert.doesNotMatch(source, /buildTileLocalOrderingRanks/);
  assert.doesNotMatch(source, /syncTileLocalOrderingKeys/);
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
  assert.match(shader, /let tileCoverageWeight = max\(tileCoverageWeights\[refIndex\], 0\.0\)/);
  assert.match(shader, /if\s*\(tileCoverageWeight <= 0\.0\)\s*\{\s*continue;\s*\}/);
  assert.match(shader, /let pixelCoverageWeight = conic_pixel_weight\(alphaParam, conicParam, pixelCenter\)/);
  assert.match(shader, /1\.0\s*-\s*pow\(1\.0\s*-\s*sourceOpacity,\s*pixelCoverageWeight\)/);
  assert.match(shader, /let orderingKey = splatId/);
  assert.match(shader, /conic_pixel_weight/);
  assert.match(shader, /conic_falloff_scale/);
  assert.match(shader, /frame\.tileSizePx >= 16\.0 && frame\.maxTileRefs >= 256u/);
  assert.match(shader, /mahalanobis2/);
  assert.match(shader, /exp\(-conic_falloff_scale\(\) \* mahalanobis2\)/);
  assert.doesNotMatch(shader, /exp\(-0\.5 \* mahalanobis2\)/);
  assert.doesNotMatch(shader, /exp\(-2\.0 \* mahalanobis2\)/);
  assert.doesNotMatch(shader, /tileCoverageWeights\[refIndex\][^;]*\*\s*conic_pixel_weight/);
  assert.doesNotMatch(shader, /radiusPx/);
  assert.doesNotMatch(shader, /for \(var candidate = 0u; candidate < refLimit/);
  assert.match(shader, /remainingTransmission/);
  assert.doesNotMatch(shader, /identityTint/);
  assert.doesNotMatch(shader, /occupancyWitness/);
  assert.doesNotMatch(shader, /alphaScale \* 0\.0/);
});

test("tile-local visible compositor consumes the retained tile header count without a hidden 32-ref cap", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.doesNotMatch(shader, /min\(header\.y,\s*32u\)/);
  assert.match(shader, /let tileCapacity = tile_ref_capacity_per_tile\(\)/);
  assert.match(shader, /let refLimit = min\(max\(header\.y,\s*gpuScatterCount\),\s*tileCapacity\)/);
  assert.match(source, /visible-compositor cap/);
  assert.match(source, /visibleCompositedRefLimit/);
});

test("GPU live tile-ref builder scatters a projected point footprint across every overlapped tile", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(shader, /fn gpu_live_support_radius_px/);
  assert.match(shader, /let minTileX =/);
  assert.match(shader, /let maxTileX =/);
  assert.match(shader, /let minTileY =/);
  assert.match(shader, /let maxTileY =/);
  assert.match(shader, /for\s*\(var tileY = minTileY; tileY <= maxTileY; tileY = tileY \+ 1u\)/);
  assert.match(shader, /for\s*\(var tileX = minTileX; tileX <= maxTileX; tileX = tileX \+ 1u\)/);
  assert.doesNotMatch(shader, /let firstTile = tileY \* frame\.tileGrid\.x \+ tileX;[\s\S]*tileRefs\[refIndex\] = vec4u\(splatId, splatId, firstTile, refIndex\);/);
  assert.match(source, /estimatedGpuLiveProjectedTileRefs/);
  assert.match(source, /projectedTileEntryCount: projectedRefs/);
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
