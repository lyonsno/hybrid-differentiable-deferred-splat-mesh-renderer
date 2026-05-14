import assert from "node:assert/strict";
import test from "node:test";

import * as tileOrdering from "../../src/rendererFidelityProbes/tileOrdering.js";

test("ordering contract requires row/tile/address diagnostics before real band causality", () => {
  const contract = tileOrdering.describeTileOrderingContract();

  assert.deepEqual(contract.bandDropoutDiagnostics, [
    "pixelId",
    "pixel",
    "crop",
    "tileAddress",
    "effectiveArenaBackend",
    "orderingBackend",
    "freshnessStatus",
    "frameProjectedRefs",
    "frameRetainedRefs",
    "frameDroppedRefs",
    "visibleCompositedRefLimit",
    "tileLocal.perPixelProjectedContributors",
    "tileLocal.perPixelRetainedContributors",
    "tileLocal.perPixelOrderedContributors",
    "tileLocal.perPixelFinalColorAccumulation",
  ]);
});

test("real black-band anchor maps to a concrete row/tile address and remains underdetermined", () => {
  const summary = tileOrdering.classifyBandDropoutMechanism(
    tileOrdering.REAL_SCENE_BLACK_BAND_DROPOUT_ANCHOR
  );

  assert.equal(summary.pixelId, "black-band-dropout-2300-1055");
  assert.deepEqual(summary.tileAddress, {
    tileX: 143,
    tileY: 65,
    tileIndex: 14183,
    localX: 12,
    localY: 15,
  });
  assert.deepEqual(summary.cropTileSpan, {
    minTileX: 139,
    maxTileX: 149,
    minTileY: 64,
    maxTileY: 66,
  });
  assert.equal(summary.classification, "underdetermined");
  assert.equal(summary.canClaimRealSceneCause, false);
  assert.deepEqual(summary.blockedMechanisms, [
    "order/rank",
    "dispatch/cache",
    "compositor-policy",
    "source-sparsity",
  ]);
  assert.deepEqual(summary.missingDiagnostics, [
    "tileLocal.perPixelProjectedContributors",
    "tileLocal.perPixelRetainedContributors",
    "tileLocal.perPixelOrderedContributors",
    "tileLocal.perPixelFinalColorAccumulation",
  ]);
  assert.equal(summary.context.effectiveArenaBackend, "gpu");
  assert.equal(summary.context.orderingBackend, "gpu-sorted-index-rank-inversion");
  assert.equal(summary.context.frameProjectedRefs, 2360150);
  assert.equal(summary.context.frameRetainedRefs, 2360150);
  assert.equal(summary.context.frameDroppedRefs, 0);
  assert.equal(summary.context.visibleCompositedRefLimit, 256);
});

test("rank inversion evidence classifies as order/rank only when per-pixel order fields exist", () => {
  const summary = tileOrdering.classifyBandDropoutMechanism({
    ...tileOrdering.REAL_SCENE_BLACK_BAND_DROPOUT_ANCHOR,
    perPixelProjectedContributors: [{ originalId: 10, viewRank: 2 }],
    perPixelRetainedContributors: [{ originalId: 10, viewRank: 2 }],
    perPixelOrderedContributors: [
      { originalId: 10, viewRank: 2 },
      { originalId: 11, viewRank: 1 },
    ],
    perPixelFinalColorAccumulation: [
      { originalId: 10, viewRank: 2, coverageAlpha: 0.6, transmittanceBefore: 1 },
      { originalId: 11, viewRank: 1, coverageAlpha: 0.6, transmittanceBefore: 0.4 },
    ],
  });

  assert.equal(summary.classification, "order/rank");
  assert.equal(summary.canClaimRealSceneCause, true);
  assert.deepEqual(summary.orderEvidence.rankSequence, [2, 1]);
  assert.deepEqual(summary.orderEvidence.inversionPairs, [{ leftIndex: 0, rightIndex: 1, leftRank: 2, rightRank: 1 }]);
});
