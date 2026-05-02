import assert from "node:assert/strict";
import test from "node:test";

import {
  TILE_LOCAL_CONTRIBUTOR_ARENA_CONTRACT,
  classifyTileLocalContributorFieldUse,
  summarizeTileLocalContributorArenaContract,
  validateTileLocalContributorArenaContract,
} from "../../src/rendererFidelityProbes/tileLocalContributorContract.js";

test("tile-local contributor arena contract pins header, record, and overflow fields", () => {
  const summary = summarizeTileLocalContributorArenaContract(TILE_LOCAL_CONTRIBUTOR_ARENA_CONTRACT);

  assert.equal(summary.version, 1);
  assert.deepEqual(summary.headerFields, [
    "contributorOffset",
    "retainedContributorCount",
    "projectedContributorCount",
    "droppedContributorCount",
    "overflowFlags",
    "maxRetainedViewRank",
    "minRetainedDepth",
    "maxRetainedDepth",
  ]);
  assert.deepEqual(summary.recordFields, [
    "splatIndex",
    "originalId",
    "tileIndex",
    "contributorIndex",
    "viewRank",
    "viewDepth",
    "depthBand",
    "coverageWeight",
    "centerPx",
    "inverseConic",
    "opacity",
    "coverageAlpha",
    "transmittanceBefore",
    "retentionWeight",
    "occlusionWeight",
    "deferredSurface",
  ]);
  assert.deepEqual(summary.overflowReasons, [
    "none",
    "perTileRetainedCap",
    "globalProjectedBudget",
    "invalidProjection",
    "nearPlaneSupport",
    "nonFiniteCoverage",
  ]);
  assert.equal(summary.legacyCompatibility.tileHeaders, "offset/count projection only");
  assert.equal(summary.legacyCompatibility.tileRefs, "splat/original/tile/ref index projection only");
});

test("tile-local contributor arena contract classifies current final-color and future deferred fields", () => {
  assert.equal(classifyTileLocalContributorFieldUse("coverageAlpha"), "current-final-color-only");
  assert.equal(classifyTileLocalContributorFieldUse("transmittanceBefore"), "current-final-color-only");
  assert.equal(classifyTileLocalContributorFieldUse("inverseConic"), "shared-current-and-deferred");
  assert.equal(classifyTileLocalContributorFieldUse("viewDepth"), "shared-current-and-deferred");
  assert.equal(classifyTileLocalContributorFieldUse("deferredSurface"), "future-deferred-surface-input");
  assert.equal(classifyTileLocalContributorFieldUse("meshPrimitiveId"), "future-deferred-surface-input");
  assert.equal(classifyTileLocalContributorFieldUse("notAField"), "unknown");
});

test("tile-local contributor arena validator rejects silent contract drift", () => {
  assert.deepEqual(validateTileLocalContributorArenaContract(TILE_LOCAL_CONTRIBUTOR_ARENA_CONTRACT), []);

  const drifted = {
    ...TILE_LOCAL_CONTRIBUTOR_ARENA_CONTRACT,
    tileHeader: {
      ...TILE_LOCAL_CONTRIBUTOR_ARENA_CONTRACT.tileHeader,
      fields: TILE_LOCAL_CONTRIBUTOR_ARENA_CONTRACT.tileHeader.fields.filter(
        (field) => field.name !== "droppedContributorCount",
      ),
    },
  };

  assert.deepEqual(validateTileLocalContributorArenaContract(drifted), [
    "tileHeader.fields missing required field droppedContributorCount",
  ]);
});
