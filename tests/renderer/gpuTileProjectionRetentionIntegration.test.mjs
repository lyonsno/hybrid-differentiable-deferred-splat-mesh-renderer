import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeterministicGpuTileProjectionRetentionArena,
} from "../../node_modules/.cache/renderer-tests/src/gpuTileCoverage.js";
import {
  selectCompactProjectionRetentionRecords,
} from "../../src/compactRetentionElection.js";

test("GPU projection/retention builder owns projected, retained, and dropped custody", () => {
  const projectedContributors = [
    contributor({ splatIndex: 0, originalId: 100, viewRank: 0, viewDepth: 0.1, coverageWeight: 0.95 }),
    contributor({ splatIndex: 1, originalId: 101, viewRank: 1, viewDepth: 0.2, coverageWeight: 0.9 }),
    contributor({ splatIndex: 2, originalId: 102, viewRank: 2, viewDepth: 0.3, coverageWeight: 0.85 }),
    contributor({ splatIndex: 3, originalId: 103, viewRank: 3, viewDepth: 0.4, coverageWeight: 0.05, occlusionWeight: 3 }),
    contributor({ splatIndex: 4, originalId: 104, viewRank: 4, viewDepth: 0.5, coverageWeight: 0.04 }),
  ];
  const expectedRetainedIds = new Set(
    selectCompactProjectionRetentionRecords(projectedContributors, 3).map((record) => record.originalId),
  );
  const expectedDroppedIds = projectedContributors
    .filter((record) => !expectedRetainedIds.has(record.originalId))
    .map((record) => record.originalId);
  const arena = buildDeterministicGpuTileProjectionRetentionArena({
    tileCount: 1,
    maxContributors: 5,
    maxRefsPerTile: 3,
    contributors: projectedContributors,
  });

  assert.deepEqual([...arena.projectedCounts], [5]);
  assert.deepEqual([...arena.retainedCounts], [3]);
  assert.equal(arena.projectedContributorCount, 5);
  assert.equal(arena.retainedContributorCount, 3);
  assert.equal(arena.droppedContributorCount, 2);
  assert.deepEqual(arena.retainedRecords.map((record) => record.originalId), [100, 101, 103]);
  assert.deepEqual(arena.droppedRecords.map((record) => record.originalId), expectedDroppedIds);
  assert.deepEqual(new Set(arena.retainedRecords.map((record) => record.originalId)), expectedRetainedIds);
  assert.deepEqual([...arena.tileHeaderU32.slice(0, 4)], [0, 3, 5, 2]);
  assert.deepEqual(arena.scatteredRecords.map((record) => record.originalId), [100, 101, 103]);
});

function contributor(overrides) {
  return {
    splatIndex: 0,
    originalId: 0,
    tileIndex: 0,
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
    ...overrides,
  };
}
