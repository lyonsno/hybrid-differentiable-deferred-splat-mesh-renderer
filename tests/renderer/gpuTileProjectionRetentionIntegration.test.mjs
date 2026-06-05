import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeterministicGpuTileProjectionRetentionArena,
  buildGpuProjectionRetentionCandidateSourceInputs,
  inspectWgslSourceFrontierProductionPoolSeatGap,
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

test("GPU projection/retention builder preserves source-frontier foreground support under cap pressure", () => {
  const maxRefsPerTile = 4;
  const retentionCandidate = contributor({
    originalId: 1000,
    splatIndex: 1000,
    retentionWeight: 120,
    coverageWeight: 0.1,
    occlusionWeight: 0.1,
    supportSampleWeight: 0.1,
  });
  const occlusionCandidate = contributor({
    originalId: 2000,
    splatIndex: 2000,
    retentionWeight: 0.1,
    coverageWeight: 0.1,
    occlusionWeight: 130,
    occlusionDensity: 130,
    supportSampleWeight: 0.1,
  });
  const coverageCandidate = contributor({
    originalId: 3000,
    splatIndex: 3000,
    retentionWeight: 0.1,
    coverageWeight: 140,
    occlusionWeight: 0.1,
    supportSampleWeight: 0.1,
  });
  const foregroundSupportCandidate = contributor({
    originalId: 4000,
    splatIndex: 4000,
    retentionWeight: 0.1,
    coverageWeight: 0.1,
    occlusionWeight: 0.1,
    supportSampleWeight: 150,
    supportSampleRetentionWeight: 150,
    retentionBand: "front",
  });
  const temptingCoverageOnlySupport = contributor({
    originalId: 5000,
    splatIndex: 5000,
    retentionWeight: 0.1,
    coverageWeight: 1000,
    occlusionWeight: 0.1,
    supportSampleWeight: 149,
    supportSampleRetentionWeight: 149,
    retentionBand: "front",
  });
  const slate = Array.from({ length: 8 }, (_, index) => contributor({
    originalId: 6000 + index,
    splatIndex: 6000 + index,
    retentionWeight: 80 - index,
    coverageWeight: 90 - index,
    occlusionWeight: 70 - index,
    supportSampleWeight: 60 - index,
  }));
  const projectedContributors = [
    retentionCandidate,
    occlusionCandidate,
    coverageCandidate,
    foregroundSupportCandidate,
    temptingCoverageOnlySupport,
    ...slate,
  ];
  const candidateSources = {
    retentionRecords: [retentionCandidate],
    occlusionRecords: [occlusionCandidate],
    coverageRecords: [coverageCandidate],
    supportSampleRecords: [foregroundSupportCandidate, temptingCoverageOnlySupport],
    supportSampleRecordGroups: [[foregroundSupportCandidate, temptingCoverageOnlySupport]],
  };

  const arena = buildDeterministicGpuTileProjectionRetentionArena({
    tileCount: 1,
    maxContributors: projectedContributors.length,
    maxRefsPerTile,
    contributors: projectedContributors,
    candidateSources,
  });
  const wgslGap = inspectWgslSourceFrontierProductionPoolSeatGap({
    records: projectedContributors,
    maxRefsPerTile,
    candidateSources,
    candidateSourceInputs: buildGpuProjectionRetentionCandidateSourceInputs(candidateSources),
  });

  const retainedIds = arena.retainedRecords.map((record) => record.originalId);
  const droppedIds = arena.droppedRecords.map((record) => record.originalId);

  assert.deepEqual(retainedIds, [1000, 2000, 3000, 4000]);
  assert.deepEqual(wgslGap.productionRetainedIds, retainedIds);
  assert.equal(wgslGap.status, "structural-gap");
  assert.equal(wgslGap.candidateSourceIdentityStatus, "production-election-contract-consumed");
  assert.equal(wgslGap.nextGpuOffloadStage, "live-wgsl-production-election-prefix-scatter");
  assert.equal(wgslGap.falseClosureGuard, "source-frontier-score-witness-is-not-production-pool-seat-election");
  assert.deepEqual(wgslGap.retainedPoolCounts, {
    retention: 1,
    occlusion: 1,
    coverage: 1,
    support: 1,
    backfill: 0,
  });
  assert.equal(arena.retainedContributorCount, maxRefsPerTile);
  assert.equal(arena.droppedContributorCount, projectedContributors.length - maxRefsPerTile);
  assert.ok(
    retainedIds.includes(foregroundSupportCandidate.originalId),
    "foreground support candidate must keep a retained seat under cap pressure",
  );
  assert.ok(
    droppedIds.includes(temptingCoverageOnlySupport.originalId),
    "support quota must elect by source-frontier support identity rather than coverage-only pressure",
  );
  assert.deepEqual([...arena.tileHeaderU32.slice(0, 4)], [0, maxRefsPerTile, projectedContributors.length, projectedContributors.length - maxRefsPerTile]);
  assert.deepEqual([...arena.retainedCounts], [maxRefsPerTile]);
  assert.deepEqual([...arena.projectedCounts], [projectedContributors.length]);
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
    supportSampleWeight: 0.5,
    supportSampleRetentionWeight: 0.5,
    ...overrides,
  };
}
