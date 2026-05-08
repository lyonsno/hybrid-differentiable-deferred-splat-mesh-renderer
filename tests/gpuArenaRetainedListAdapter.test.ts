import assert from "node:assert/strict";
import test from "node:test";

import { adaptGpuArenaRetainedContributors } from "../src/gpuArenaRetainedListAdapter.ts";

test("GPU arena retained-list adapter feeds only CPU-retained contributors in bridge order", () => {
  const adapted = adaptGpuArenaRetainedContributors({
    tileEntryCount: 2,
    retainedTileEntryCount: 2,
    tileRefCustody: {
      projectedTileEntryCount: 3,
      retainedTileEntryCount: 2,
      evictedTileEntryCount: 1,
      cappedTileCount: 1,
      saturatedRetainedTileCount: 1,
      maxProjectedRefsPerTile: 3,
      maxRetainedRefsPerTile: 2,
      headerRefCount: 2,
      headerAccountingMatches: true,
    },
    contributorArena: {
      version: 1,
      tileHeaders: [],
      contributors: [
        contributor({ splatIndex: 7, originalId: 70, tileIndex: 2, viewRank: 4, opacity: 0.25 }),
        contributor({ splatIndex: 3, originalId: 30, tileIndex: 2, viewRank: 8, opacity: 0.5 }),
      ],
      projectedContributors: [
        contributor({ splatIndex: 7, originalId: 70, tileIndex: 2, viewRank: 4, retentionStatus: "retained", opacity: 0.25 }),
        contributor({ splatIndex: 99, originalId: 990, tileIndex: 2, viewRank: 6, retentionStatus: "dropped", opacity: 0.9 }),
        contributor({ splatIndex: 3, originalId: 30, tileIndex: 2, viewRank: 8, retentionStatus: "retained", opacity: 0.5 }),
      ],
      overflowReasons: {},
      overflowReasonNames: {},
    },
  }, Float32Array.from({ length: 100 }, (_, index) => (index === 3 ? 0.125 : Number.NaN)));

  assert.equal(adapted.projectedContributorCount, 3);
  assert.equal(adapted.retainedContributorCount, 2);
  assert.equal(adapted.droppedContributorCount, 1);
  assert.deepEqual(adapted.contributors.map((entry) => entry.originalId), [70, 30]);
  assert.deepEqual(adapted.contributors.map((entry) => entry.tileIndex), [2, 2]);
  assert.deepEqual(adapted.contributors.map((entry) => entry.viewRank), [4, 8]);
  assert.deepEqual(adapted.contributors.map((entry) => entry.opacity), [0.25, 0.125]);
  assert.equal(adapted.contributors.some((entry) => entry.originalId === 990), false);
});

function contributor(overrides: Record<string, unknown>) {
  return {
    splatIndex: 0,
    originalId: 0,
    tileIndex: 0,
    contributorIndex: 0,
    viewRank: 0,
    viewDepth: 0,
    depthBand: 0,
    coverageWeight: 0.5,
    centerPx: [11, 12],
    inverseConic: [0.25, 0, 0.25],
    opacity: 0.2,
    coverageAlpha: 0.1,
    transmittanceBefore: 0.9,
    retentionWeight: 0.7,
    occlusionWeight: 0.6,
    retentionStatus: "retained",
    retentionBand: "middle",
    overflowReason: "none",
    overflowReasonDetail: "none",
    deferredSurface: null,
    ...overrides,
  };
}
