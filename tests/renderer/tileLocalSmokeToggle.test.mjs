import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("main wires a smoke-toggleable tile-local prepass beside the plate fallback", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /selectedRendererMode/);
  assert.match(source, /params\.get\("renderer"\)\s*===\s*"tile-local"/);
  assert.match(source, /createGpuTileCoveragePipelineSkeleton/);
  assert.match(source, /buildTileLocalPrepassBridge/);
  assert.match(source, /tileCoverageWeightBuffer/);
  assert.match(source, /TILE_LOCAL_PROVISIONAL_MAX_SPLATS/);
  assert.match(source, /TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES/);
  assert.match(source, /tileLocalUnsafe/);
  assert.match(source, /tileLocalDisabledReason/);
  assert.match(source, /maxTileEntries/);
  assert.match(source, /plate\+tile-local-prepass/);
  assert.match(source, /createSplatPlateRenderer/);
  assert.doesNotMatch(source, /tileCoverageWeightData\[splatId\]\s*=\s*1/);
  assert.doesNotMatch(source, /renderer: \$\{scene\.rendererMode\}/);
});

test("main labels skipped tile-local rebuilds as stale cached presentations", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /tileLocalPresentationFreshness/);
  assert.match(source, /stale-cache/);
  assert.match(source, /cachedFrameAgeMs/);
  assert.match(source, /currentFrameSignature/);
  assert.match(source, /cachedFrameSignature/);
  assert.match(source, /skippedProjectedRefs/);
  assert.match(source, /maxProjectedRefs/);
  assert.match(
    source,
    /tileLocalCurrentSignature !== scene\.tileLocalState\.lastCompositedSignature[\s\S]*scene\.tileLocalState\.needsDispatch = true/
  );
});
