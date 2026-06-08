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
  assert.match(source, /pending-dispatch/);
  assert.match(source, /cachedFrameAgeMs/);
  assert.match(source, /currentFrameSignature/);
  assert.match(source, /cachedFrameSignature/);
  assert.match(source, /skippedProjectedRefs/);
  assert.match(source, /maxProjectedRefs/);
  assert.match(
    source,
    /tileLocalCurrentSignature !== scene\.tileLocalState\.lastCompositedSignature[\s\S]*scene\.tileLocalState\.needsDispatch = true/
  );
  assert.match(
    source,
    /tileLocalPresentationFreshness\([\s\S]*tileLocalCurrentSignature[\s\S]*\)/
  );
});

test("main defers compact GPU retained-source rebuilds during active input and presents a plate preview", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /const\s+tileLocalPresentationStaleForCurrentView\s*=\s*Boolean/);
  assert.match(source, /const\s+deferTileLocalRebuildForActiveInput\s*=\s*Boolean/);
  assert.match(source, /const\s+TILE_LOCAL_REBUILD_SETTLE_MS\s*=\s*260/);
  assert.match(source, /tileLocalLastObservedSignature:\s*tileLocalState\?\.lastCompositedSignature \?\? null/);
  assert.match(source, /tileLocalCurrentSignature !== scene\.tileLocalLastObservedSignature[\s\S]*scene\.tileLocalLastSignatureChangeMs = now/);
  const alphaDensityIndex = source.indexOf('timeFrameStage(frameTiming, "alpha-density"');
  const tileLocalDecisionNowIndex = source.indexOf("const tileLocalRebuildDecisionNow = performance.now()", alphaDensityIndex);
  const deferIndex = source.indexOf("const deferTileLocalRebuildForActiveInput", tileLocalDecisionNowIndex);
  assert.notEqual(alphaDensityIndex, -1);
  assert.ok(tileLocalDecisionNowIndex > alphaDensityIndex);
  assert.ok(deferIndex > tileLocalDecisionNowIndex);
  assert.match(source.slice(deferIndex), /scene\.tileLocalState\?\.arenaBackend === "gpu"[\s\S]*activeInput\s*\|\|\s*tileLocalRebuildDecisionNow - scene\.tileLocalLastSignatureChangeMs < TILE_LOCAL_REBUILD_SETTLE_MS[\s\S]*tileLocalPresentationStaleForCurrentView/);
  assert.match(
    source,
    /allowActiveInputDispatch:\s*scene\.tileLocalState\.arenaBackend === "gpu" && !deferTileLocalRebuildForActiveInput/,
  );
  assert.match(source, /const\s+useTileLocalInteractionPreview\s*=/);
  assert.match(source, /tile-local-visible-interaction-preview-plate/);
  assert.match(
    source,
    /scene\.rendererMode === "tile-local-visible" && scene\.tileLocalState && !useTileLocalInteractionPreview[\s\S]*tileLocalPresenter\.draw/,
  );
  assert.match(
    source,
    /else \{\s*renderPass\.setBindGroup\(0,\s*bindGroup\);\s*splatRenderer\.draw\(renderPass,\s*scene\.splatBindGroup,\s*scene\.count\);/,
  );
  assert.match(
    source,
    /pendingTileLocalCompositor:\s*deferTileLocalRebuildForActiveInput \|\| shouldDispatchTileLocalCompositor/,
  );
});

test("main leaves tile-local ordering to the retained ref and alpha-param contracts", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /writeGpuTileCoverageAlphaParams/);
  assert.match(source, /tileRefSplatIds/);
  assert.doesNotMatch(source, /encodeGpuOrderingRanks/);
  assert.doesNotMatch(source, /orderingRanksNeedDispatch/);
});
