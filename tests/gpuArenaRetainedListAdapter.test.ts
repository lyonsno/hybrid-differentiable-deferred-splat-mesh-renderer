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

test("GPU arena retained-list adapter consumes projected contributors through projection-retention custody", () => {
  const adapted = adaptGpuArenaRetainedContributors({
    tileEntryCount: 3,
    retainedTileEntryCount: 3,
    maxRefsPerTile: 3,
    tileRefCustody: {
      projectedTileEntryCount: 5,
      retainedTileEntryCount: 3,
      evictedTileEntryCount: 2,
      cappedTileCount: 1,
      saturatedRetainedTileCount: 1,
      maxProjectedRefsPerTile: 5,
      maxRetainedRefsPerTile: 3,
      headerRefCount: 3,
      headerAccountingMatches: true,
    },
    contributorArena: {
      version: 1,
      tileHeaders: [],
      contributors: [
        contributor({ splatIndex: 0, originalId: 100, viewRank: 0, coverageWeight: 0.95 }),
        contributor({ splatIndex: 1, originalId: 101, viewRank: 1, coverageWeight: 0.9 }),
        contributor({ splatIndex: 2, originalId: 102, viewRank: 2, coverageWeight: 0.85 }),
      ],
      projectedContributors: [
        contributor({ splatIndex: 0, originalId: 100, viewRank: 0, coverageWeight: 0.95, retentionStatus: "retained" }),
        contributor({ splatIndex: 1, originalId: 101, viewRank: 1, coverageWeight: 0.9, retentionStatus: "retained" }),
        contributor({ splatIndex: 2, originalId: 102, viewRank: 2, coverageWeight: 0.85, retentionStatus: "retained" }),
        contributor({ splatIndex: 3, originalId: 103, viewRank: 3, coverageWeight: 0.05, occlusionWeight: 3, retentionStatus: "dropped" }),
        contributor({ splatIndex: 4, originalId: 104, viewRank: 4, coverageWeight: 0.04, retentionStatus: "dropped" }),
      ],
      overflowReasons: {},
      overflowReasonNames: {},
    },
  }, new Float32Array(5), buildProjectionRetentionArenaStub);

  assert.equal(adapted.projectedContributorCount, 5);
  assert.equal(adapted.retainedContributorCount, 3);
  assert.equal(adapted.droppedContributorCount, 2);
  assert.deepEqual(adapted.contributors.map((entry) => entry.originalId), [101, 102, 103]);
});

function buildProjectionRetentionArenaStub(input: {
  tileCount: number;
  contributors: readonly ReturnType<typeof contributor>[];
}) {
  const retainedRecords = input.contributors.filter((entry) => [101, 102, 103].includes(entry.originalId as number));
  const droppedRecords = input.contributors.filter((entry) => ![101, 102, 103].includes(entry.originalId as number));
  return {
    projectedCounts: Uint32Array.of(input.contributors.length),
    prefixCounts: Uint32Array.of(0),
    retainedCounts: Uint32Array.of(retainedRecords.length),
    tileHeaderU32: Uint32Array.of(0, retainedRecords.length, input.contributors.length, droppedRecords.length),
    tileHeaderF32: new Float32Array(Math.max(0, input.tileCount * 4)),
    contributorRecordU32: new Uint32Array(0),
    contributorRecordF32: new Float32Array(0),
    scatteredRecords: retainedRecords,
    retainedRecords,
    droppedRecords,
    projectedContributorCount: input.contributors.length,
    retainedContributorCount: retainedRecords.length,
    droppedContributorCount: droppedRecords.length,
  };
}

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
