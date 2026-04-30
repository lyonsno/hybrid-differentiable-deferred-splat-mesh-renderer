import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("main exposes a visible tile-local diagnostic mode without replacing the prepass smoke mode", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /"tile-local-visible"/);
  assert.match(source, /tile-local-visible-bridge-diagnostic/);
  assert.match(source, /createTileLocalTexturePresenter/);
  assert.match(source, /dispatchBridgeDiagnosticComposite/);
  assert.match(source, /tileLocalPresenter\.draw/);
  assert.match(source, /params\.get\("renderer"\)\s*===\s*"tile-local-visible"/);
  assert.match(source, /params\.get\("renderer"\)\s*===\s*"tile-local"/);
});

test("tile-local diagnostic shader paints from tile headers, refs, coverage, and alpha", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(shader, /fn composite_tiles/);
  assert.match(shader, /textureDimensions\(outputColor\)/);
  assert.match(shader, /tileHeaders\[tileId\]/);
  assert.match(shader, /tileRefs\[refIndex\]/);
  assert.match(shader, /tileCoverageWeights\[refIndex\]/);
  assert.match(shader, /alphaParams\[alphaParamIndex\]\.x/);
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
