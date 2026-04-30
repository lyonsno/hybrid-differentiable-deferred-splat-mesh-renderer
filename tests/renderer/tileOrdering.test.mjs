import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPerTileOrdering,
  classifyBucketApproximation,
  createGlobalRadixStagingOrder,
  describeTileOrderingContract,
} from "../../src/rendererFidelityProbes/tileOrdering.js";

test("tile compositor consumes per-tile back-to-front lists, not one global draw stream", () => {
  const contributions = [
    { tileId: 0, splatId: 10, depth: -6.0, coverageWeight: 0.25 },
    { tileId: 0, splatId: 11, depth: -2.0, coverageWeight: 0.75 },
    { tileId: 1, splatId: 10, depth: -6.0, coverageWeight: 0.40 },
    { tileId: 1, splatId: 12, depth: -8.0, coverageWeight: 0.35 },
    { tileId: 0, splatId: 12, depth: -8.0, coverageWeight: 0.10 },
  ];

  assert.deepEqual(
    createGlobalRadixStagingOrder(contributions).map((entry) => [entry.tileId, entry.splatId]),
    [
      [0, 12],
      [1, 12],
      [0, 10],
      [1, 10],
      [0, 11],
    ],
  );

  const ordering = buildPerTileOrdering(contributions);

  assert.deepEqual(ordering.tileIds, [0, 1]);
  assert.deepEqual(ordering.tiles.get(0).drawSplatIds, [12, 10, 11]);
  assert.deepEqual(ordering.tiles.get(1).drawSplatIds, [12, 10]);
  assert.equal(ordering.requiredShape, "per-tile-radix-lists");
  assert.equal(ordering.consumedBy, "tile-local-compositor");
});

test("equal-depth contributions are stable inside each tile by stable tie id fallback", () => {
  const ordering = buildPerTileOrdering([
    { tileId: 3, splatId: 7, depth: -4, coverageWeight: 0.2 },
    { tileId: 3, splatId: 5, depth: -4, coverageWeight: 0.3 },
    { tileId: 3, splatId: 6, depth: -4, coverageWeight: 0.4 },
  ]);

  assert.deepEqual(ordering.tiles.get(3).drawSplatIds, [5, 6, 7]);
  assert.deepEqual(
    ordering.tiles.get(3).entries.map((entry) => entry.orderKey),
    [
      { quantizedDepth: -4, stableTieId: 5, tileId: 3 },
      { quantizedDepth: -4, stableTieId: 6, tileId: 3 },
      { quantizedDepth: -4, stableTieId: 7, tileId: 3 },
    ],
  );
});

test("per-tile ordered refs preserve explicit stable tie ids even when splat ids differ", () => {
  const ordering = buildPerTileOrdering([
    { tileId: 9, splatId: 21, stableTieId: 102, depth: -3.5, coverageWeight: 0.2 },
    { tileId: 9, splatId: 18, stableTieId: 100, depth: -3.5, coverageWeight: 0.3 },
    { tileId: 9, splatId: 24, stableTieId: 101, depth: -3.5, coverageWeight: 0.4 },
  ]);

  assert.deepEqual(ordering.tiles.get(9).drawSplatIds, [18, 24, 21]);
  assert.deepEqual(
    ordering.tiles.get(9).orderedRefs.map((entry) => [entry.splatId, entry.stableTieId, entry.viewDepth]),
    [
      [18, 100, -3.5],
      [24, 101, -3.5],
      [21, 102, -3.5],
    ],
  );
  assert.deepEqual(
    ordering.tiles.get(9).orderedRefs.map((entry) => entry.orderKey),
    [
      { quantizedDepth: -3.5, stableTieId: 100, tileId: 9 },
      { quantizedDepth: -3.5, stableTieId: 101, tileId: 9 },
      { quantizedDepth: -3.5, stableTieId: 102, tileId: 9 },
    ],
  );
});

test("depth buckets are acceptable only when the bucket error stays below alpha-visible tolerance", () => {
  assert.deepEqual(
    classifyBucketApproximation({
      bucketWidth: 0.01,
      crossingDepthSeparation: 0.08,
      maxAlpha: 0.4,
    }),
    {
      classification: "bounded-approximation",
      acceptable: true,
      reason: "bucket-width-below-visible-crossing-tolerance",
      maxOrderError: 0.01,
    },
  );

  assert.deepEqual(
    classifyBucketApproximation({
      bucketWidth: 0.05,
      crossingDepthSeparation: 0.08,
      maxAlpha: 0.4,
    }),
    {
      classification: "ordering-blocker",
      acceptable: false,
      reason: "bucket-can-hide-alpha-visible-crossing",
      maxOrderError: 0.05,
    },
  );
});

test("contract exposes the next ordering decision without claiming coverage or alpha semantics", () => {
  assert.deepEqual(describeTileOrderingContract(), {
    nextShape: "per-tile-radix-lists",
    compositorConsumes: "tile-local-back-to-front-contributions",
    globalStagingRole: "staging-or-diagnostic-only",
    bucketRole: "bounded-approximation-only",
    mustCarry: ["tileId", "splatId", "viewDepth", "stableTieId"],
    consumedSiblingContracts: ["tile-coverage-builder:data-shape", "alpha-transfer:source-over-policy"],
    forbiddenClaims: ["coverage-truth", "alpha-transfer-policy", "live-renderer-integration"],
  });
});
