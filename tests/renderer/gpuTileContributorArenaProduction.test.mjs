import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES,
  buildDeterministicGpuTileContributorArena,
  buildDeterministicGpuTileProjectionRetentionArena,
  createGpuTileCoveragePlan,
  createGpuTileContributorArenaLayout,
  inspectWgslSourceFrontierProductionPoolSeatGap,
} from "../../node_modules/.cache/renderer-tests/src/gpuTileCoverage.js";
import {
  selectCompactProjectionRetentionRecords,
} from "../../src/compactRetentionElection.js";
import { buildTileLocalContributorArena } from "../../src/gpuTileCoverageBridge.js";

const expectedRecordBytes =
  (GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE + GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE) *
  Uint32Array.BYTES_PER_ELEMENT;

test("GPU contributor arena layout reserves typed buffers for the anchored CPU arena fields", () => {
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 64,
    viewportHeight: 32,
    tileSizePx: 32,
    splatCount: 3,
    maxTileRefs: 6,
  });
  const arena = createGpuTileContributorArenaLayout(plan);

  assert.equal(GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE, 8);
  assert.equal(GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE, 4);
  assert.equal(GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE, 8);
  assert.equal(GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE, 16);
  assert.equal(GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES, expectedRecordBytes);
  assert.equal(arena.headerUint32Bytes, plan.tileCount * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE * 4);
  assert.equal(arena.headerFloat32Bytes, plan.tileCount * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE * 4);
  assert.equal(arena.contributorRecordUint32Bytes, 6 * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE * 4);
  assert.equal(arena.contributorRecordFloat32Bytes, 6 * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE * 4);
  assert.equal(arena.contributorRecordBytes, 6 * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES);
  assert.equal(arena.recordStrideBytes, GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES);
});

test("GPU contributor arena deterministic count-prefix-scatter output matches the CPU arena field order", () => {
  const arena = buildDeterministicGpuTileContributorArena({
    tileCount: 3,
    maxContributors: 4,
    contributors: [
      contributor({ splatIndex: 4, originalId: 40, tileIndex: 2, viewRank: 3, viewDepth: 0.75 }),
      contributor({ splatIndex: 1, originalId: 10, tileIndex: 0, viewRank: 0, viewDepth: 0.1 }),
      contributor({ splatIndex: 2, originalId: 20, tileIndex: 0, viewRank: 2, viewDepth: 0.4 }),
      contributor({ splatIndex: 3, originalId: 30, tileIndex: 1, viewRank: 1, viewDepth: 0.25 }),
    ],
  });

  assert.deepEqual([...arena.projectedCounts], [2, 1, 1]);
  assert.deepEqual([...arena.prefixCounts], [0, 2, 3]);
  assert.deepEqual([...arena.tileHeaderU32.slice(0, 3 * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE)], [
    0, 2, 2, 0, 0, 2, 0, 0,
    2, 1, 1, 0, 0, 1, 0, 0,
    3, 1, 1, 0, 0, 3, 0, 0,
  ]);
  assert.deepEqual([...arena.tileHeaderF32.slice(0, 3 * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE)], f32([
    0.1, 0.4, 0, 0,
    0.25, 0.25, 0, 0,
    0.75, 0.75, 0, 0,
  ]));
  assert.deepEqual([...arena.contributorRecordU32.slice(0, GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE)], [
    1, 10, 0, 0, 0, 0, 0, 0,
  ]);
  assert.deepEqual(
    [...arena.contributorRecordF32.slice(0, GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE)],
    f32([0.1, 0, 0.5, 11, 12, 0.25, 0, 0.25, 0.2, 0.1, 0.9, 0.7, 0.6, 0, 0, 0]),
  );
  assert.deepEqual(arena.scatteredRecords.map((record) => record.originalId), [10, 20, 30, 40]);
});

test("GPU contributor arena builder fails loudly when projected contributors exceed the arena budget", () => {
  assert.throws(
    () =>
      buildDeterministicGpuTileContributorArena({
        tileCount: 1,
        maxContributors: 1,
        contributors: [
          contributor({ splatIndex: 1, originalId: 1, tileIndex: 0 }),
          contributor({ splatIndex: 2, originalId: 2, tileIndex: 0 }),
        ],
      }),
    /max contributors.*projected contributors/i,
  );
});

test("GPU-owned projection retention matches the compact retained-source election law under cap pressure", () => {
  const cpuArena = buildTileLocalContributorArena(denseTileCoverage(), {
    maxRefsPerTile: 4,
    depthBandCount: 4,
  });
  const expectedRetainedIds = selectedIdSet(
    selectCompactProjectionRetentionRecords(cpuArena.projectedContributors, 4),
  );
  const arena = buildDeterministicGpuTileProjectionRetentionArena({
    tileCount: 1,
    maxContributors: 8,
    maxRefsPerTile: 4,
    contributors: cpuArena.projectedContributors,
  });
  const expectedDroppedIds = cpuArena.projectedContributors
    .filter((record) => !expectedRetainedIds.has(record.originalId))
    .map((record) => record.originalId)
    .sort((left, right) => left - right);

  assert.equal(arena.projectedContributorCount, 8);
  assert.equal(arena.retainedContributorCount, 4);
  assert.equal(arena.droppedContributorCount, 4);
  assert.deepEqual(selectedIdList(arena.retainedRecords), [...expectedRetainedIds].sort((left, right) => left - right));
  assert.deepEqual(selectedIdList(arena.droppedRecords), expectedDroppedIds);
  assert.deepEqual([...arena.tileHeaderU32.slice(0, GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE)], [
    0, 4, 8, 4, 1, 7, 0, 0,
  ]);
  assert.deepEqual([...arena.projectedCounts], [8]);
  assert.deepEqual([...arena.retainedCounts], [4]);
});

test("GPU-owned projection retention honors compact support-sample quotas and candidate source pools", () => {
  const maxRefsPerTile = 16;
  const occluder = contributor({
    splatIndex: 9001,
    originalId: 9001,
    retentionWeight: 0.05,
    occlusionWeight: 100,
    occlusionDensity: 100,
    coverageWeight: 0.1,
  });
  const retentionRecords = Array.from({ length: 8 }, (_, index) => contributor({
    splatIndex: 100 + index,
    originalId: 100 + index,
    retentionWeight: 80 - index,
    occlusionWeight: 1,
    coverageWeight: 1,
  }));
  const occlusionRecords = [
    occluder,
    ...Array.from({ length: 7 }, (_, index) => contributor({
      splatIndex: 200 + index,
      originalId: 200 + index,
      retentionWeight: 1,
      occlusionWeight: 40 - index,
      occlusionDensity: 40 - index,
      coverageWeight: 1,
    })),
  ];
  const coverageRecords = Array.from({ length: 8 }, (_, index) => contributor({
    splatIndex: 300 + index,
    originalId: 300 + index,
    retentionWeight: 1,
    occlusionWeight: 1,
    coverageWeight: 60 - index,
  }));
  const supportRecords = Array.from({ length: 64 }, (_, index) => contributor({
    splatIndex: 1000 + index,
    originalId: 1000 + index,
    retentionWeight: 500,
    occlusionWeight: 1,
    coverageWeight: 500,
    supportSampleWeight: 1000 - index,
    supportSampleRetentionWeight: 1000 - index,
  }));
  const records = [
    ...retentionRecords,
    ...occlusionRecords,
    ...coverageRecords,
    ...supportRecords,
  ];
  const candidateSources = {
    coverageRecords,
    retentionRecords,
    occlusionRecords,
    supportSampleRecords: supportRecords,
    supportSampleRecordGroups: [supportRecords],
  };
  const arena = buildDeterministicGpuTileProjectionRetentionArena({
    tileCount: 1,
    maxContributors: records.length,
    maxRefsPerTile,
    contributors: records,
    candidateSources,
  });
  const expectedRetainedIds = selectedIdSet(
    selectCompactProjectionRetentionRecords(records, maxRefsPerTile, candidateSources),
  );
  const supportRetainedCount = arena.retainedRecords
    .filter((record) => record.originalId >= 1000 && record.originalId < 2000)
    .length;

  assert.equal(arena.retainedContributorCount, maxRefsPerTile);
  assert.deepEqual(selectedIdList(arena.retainedRecords), [...expectedRetainedIds].sort((left, right) => left - right));
  assert.ok(expectedRetainedIds.has(occluder.originalId), "top occlusion candidate must be in the shared election oracle");
  assert.ok(arena.retainedRecords.some((record) => record.originalId === occluder.originalId));
  assert.ok(supportRetainedCount <= 4, "support candidates must not exceed the 25% final support quota");
  assert.ok(arena.retainedRecords.some((record) => record.originalId >= 100 && record.originalId < 200));
  assert.ok(arena.retainedRecords.some((record) => record.originalId >= 300 && record.originalId < 400));
});

test("WGSL source-frontier witness names missing production pool seats without claiming exact plate parity", () => {
  const maxRefsPerTile = 16;
  const occluder = contributor({
    splatIndex: 9001,
    originalId: 9001,
    retentionWeight: 0.05,
    occlusionWeight: 100,
    occlusionDensity: 100,
    coverageWeight: 0.1,
  });
  const retentionRecords = Array.from({ length: 8 }, (_, index) => contributor({
    splatIndex: 100 + index,
    originalId: 100 + index,
    retentionWeight: 80 - index,
    occlusionWeight: 1,
    coverageWeight: 1,
  }));
  const occlusionRecords = [
    occluder,
    ...Array.from({ length: 7 }, (_, index) => contributor({
      splatIndex: 200 + index,
      originalId: 200 + index,
      retentionWeight: 1,
      occlusionWeight: 40 - index,
      occlusionDensity: 40 - index,
      coverageWeight: 1,
    })),
  ];
  const coverageRecords = Array.from({ length: 8 }, (_, index) => contributor({
    splatIndex: 300 + index,
    originalId: 300 + index,
    retentionWeight: 1,
    occlusionWeight: 1,
    coverageWeight: 60 - index,
  }));
  const supportRecords = Array.from({ length: 64 }, (_, index) => contributor({
    splatIndex: 1000 + index,
    originalId: 1000 + index,
    retentionWeight: 500,
    occlusionWeight: 1,
    coverageWeight: 500,
    supportSampleWeight: 1000 - index,
    supportSampleRetentionWeight: 1000 - index,
  }));
  const records = [
    ...retentionRecords,
    ...occlusionRecords,
    ...coverageRecords,
    ...supportRecords,
  ];
  const candidateSources = {
    coverageRecords,
    retentionRecords,
    occlusionRecords,
    supportSampleRecords: supportRecords,
    supportSampleRecordGroups: [supportRecords],
  };
  const witness = inspectWgslSourceFrontierProductionPoolSeatGap({
    records,
    maxRefsPerTile,
    candidateSources,
  });

  assert.equal(witness.status, "structural-gap");
  assert.equal(witness.wgslElectionShape, "bounded-priority-support-pool-slot-competition");
  assert.equal(witness.productionElectionShape, "round-robin-priority-pools-plus-support-quota");
  assert.equal(witness.supportTarget, 4);
  assert.equal(witness.priorityTarget, 12);
  assert.equal(witness.retainedPoolCounts.support, 4);
  assert.ok(witness.productionRetainedIds.includes(occluder.originalId));
  assert.ok(witness.productionRetainedIds.some((id) => id >= 100 && id < 200));
  assert.ok(witness.productionRetainedIds.some((id) => id >= 300 && id < 400));
  assert.deepEqual(witness.missingStructures, [
    "candidate-source-pool-identity",
    "cross-pool-duplicate-suppression",
  ]);
  assert.equal(witness.candidateSourceIdentityStatus, "blocked-missing-wgsl-candidate-source-inputs");
  assert.equal(witness.wgslAvailableIdentity, "selected-slot-pool-only");
  assert.deepEqual(witness.requiredWgslCandidateSourceInputs, [
    "retention-candidate-records",
    "occlusion-candidate-records",
    "coverage-candidate-records",
    "support-sample-record-groups",
  ]);
  assert.equal(witness.falseClosureGuard, "source-frontier-score-witness-is-not-production-pool-seat-election");
  assert.equal(witness.nextGpuOffloadStage, "production-candidate-source-pool-identity");
});

test("WGSL source-frontier retention election uses bounded priority and support pool slots", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(shader, /struct RetentionPoolSlot/);
  assert.match(shader, /const RETENTION_POOL_RETENTION = 0u/);
  assert.match(shader, /const RETENTION_POOL_OCCLUSION = 1u/);
  assert.match(shader, /const RETENTION_POOL_COVERAGE = 2u/);
  assert.match(shader, /const RETENTION_POOL_SUPPORT = 3u/);
  assert.match(shader, /fn gpu_live_retention_support_target/);
  assert.match(shader, /fn gpu_live_retention_priority_target/);
  assert.match(shader, /fn gpu_live_retention_pool_slot/);
  assert.match(shader, /fn gpu_live_retention_pool_score/);
  assert.match(shader, /let\s+poolSlot\s*=\s*gpu_live_retention_pool_slot/);
  assert.match(shader, /poolSlot\.slot/);
  assert.match(shader, /poolSlot\.pool/);
  assert.doesNotMatch(shader, /let\s+slot\s*=\s*gpu_live_retention_election_slot/);
});

test("WGSL source-frontier pool-seat witness attributes default overlapping priority pools by selected seat", () => {
  const maxRefsPerTile = 3;
  const records = [
    contributor({
      splatIndex: 1,
      originalId: 1,
      retentionWeight: 100,
      occlusionWeight: 1,
      occlusionDensity: 1,
      coverageWeight: 1,
    }),
    contributor({
      splatIndex: 2,
      originalId: 2,
      retentionWeight: 1,
      occlusionWeight: 100,
      occlusionDensity: 100,
      coverageWeight: 1,
    }),
    contributor({
      splatIndex: 3,
      originalId: 3,
      retentionWeight: 1,
      occlusionWeight: 1,
      occlusionDensity: 1,
      coverageWeight: 100,
    }),
    contributor({
      splatIndex: 4,
      originalId: 4,
      retentionWeight: 50,
      occlusionWeight: 50,
      occlusionDensity: 50,
      coverageWeight: 50,
    }),
  ];
  const witness = inspectWgslSourceFrontierProductionPoolSeatGap({
    records,
    maxRefsPerTile,
  });

  assert.equal(witness.status, "structural-gap");
  assert.deepEqual(witness.retainedPoolCounts, {
    retention: 1,
    occlusion: 1,
    coverage: 1,
    support: 0,
    backfill: 0,
  });
});

test("GPU-owned projection retention indexes candidate sources once instead of filtering global pools per tile", () => {
  const coverageRecords = Array.from({ length: 12 }, (_, tileIndex) => contributor({
    splatIndex: tileIndex,
    originalId: tileIndex,
    tileIndex,
    coverageWeight: 100 - tileIndex,
    retentionWeight: 100 - tileIndex,
  }));
  const supportSampleRecordGroups = [
    coverageRecords.map((record) => ({
      ...record,
      splatIndex: record.splatIndex + 100,
      originalId: record.originalId + 100,
      supportSampleWeight: 1000 - record.tileIndex,
      supportSampleRetentionWeight: 1000 - record.tileIndex,
    })),
  ];
  const records = [
    ...coverageRecords,
    ...supportSampleRecordGroups.flat(),
  ];
  const arena = buildDeterministicGpuTileProjectionRetentionArena({
    tileCount: 12,
    maxContributors: records.length,
    maxRefsPerTile: 2,
    contributors: records,
    candidateSources: {
      coverageRecords,
      retentionRecords: coverageRecords,
      supportSampleRecordGroups,
    },
  });

  assert.deepEqual([...arena.projectedCounts], new Array(12).fill(2));
  assert.deepEqual([...arena.retainedCounts], new Array(12).fill(2));
  for (let tileIndex = 0; tileIndex < 12; tileIndex += 1) {
    assert.deepEqual(
      selectedIdList(arena.retainedRecords.filter((record) => record.tileIndex === tileIndex)),
      [tileIndex, tileIndex + 100],
    );
  }

  const source = readFileSync(new URL("../../src/gpuTileCoverage.ts", import.meta.url), "utf8");
  assert.match(source, /const candidateSourcesByTile = indexGpuProjectionRetentionCandidateSourcesByTile/);
  assert.match(source, /candidateSourcesByTile\[tileIndex\]/);
  assert.doesNotMatch(source, /filterGpuProjectionRetentionCandidateSources/);
  assert.doesNotMatch(source, /filterGpuProjectionRetentionRecordsByTile/);
});

test("GPU-owned projection retention treats missing occlusion density like the compact oracle", () => {
  const records = [
    contributor({
      splatIndex: 1,
      originalId: 1,
      coverageWeight: 100,
      retentionWeight: 100,
      occlusionWeight: 1,
    }),
    contributor({
      splatIndex: 2,
      originalId: 2,
      coverageWeight: 20,
      retentionWeight: 1,
      occlusionWeight: 30,
    }),
    contributor({
      splatIndex: 3,
      originalId: 3,
      coverageWeight: 0.1,
      retentionWeight: 1,
      occlusionWeight: 5,
    }),
  ];
  const arena = buildDeterministicGpuTileProjectionRetentionArena({
    tileCount: 1,
    maxContributors: records.length,
    maxRefsPerTile: 2,
    contributors: records,
  });
  const expectedRetainedIds = selectedIdSet(selectCompactProjectionRetentionRecords(records, 2));

  assert.deepEqual(selectedIdList(arena.retainedRecords), [...expectedRetainedIds].sort((left, right) => left - right));
  assert.deepEqual(selectedIdList(arena.retainedRecords), [1, 2]);
  assert.equal(arena.droppedContributorCount, 1);
});

test("GPU-owned projection retention full-identity keys do not collide across wide original ids", () => {
  const records = [
    contributor({
      splatIndex: 0,
      originalId: 2 ** 32,
      coverageWeight: 100,
      retentionWeight: 100,
      occlusionWeight: 1,
    }),
    contributor({
      splatIndex: 1,
      originalId: 0,
      coverageWeight: 99,
      retentionWeight: 99,
      occlusionWeight: 1,
    }),
    contributor({
      splatIndex: 2,
      originalId: 12,
      coverageWeight: 1,
      retentionWeight: 1,
      occlusionWeight: 1,
    }),
  ];
  const arena = buildDeterministicGpuTileProjectionRetentionArena({
    tileCount: 1,
    maxContributors: records.length,
    maxRefsPerTile: 2,
    contributors: records,
  });

  assert.deepEqual(
    arena.retainedRecords.map((record) => [record.splatIndex, record.originalId]),
    [
      [0, 2 ** 32],
      [1, 0],
    ],
  );
  assert.deepEqual(arena.droppedRecords.map((record) => record.originalId), [12]);
  assert.equal(arena.droppedContributorCount, 1);
  assert.equal(arena.tileHeaderU32[3], 1);
});

test("GPU contributor arena WGSL has production count, prefix, and scatter stages rather than inert TODOs", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_contributor_arena.wgsl", import.meta.url), "utf8");

  assert.match(shader, /struct ProjectedContributor/);
  assert.match(shader, /projectedContributorU32/);
  assert.match(shader, /projectedContributorF32/);
  assert.match(shader, /legacyTileHeaders/);
  assert.match(shader, /legacyTileRefs/);
  assert.match(shader, /legacyAlphaParams/);
  assert.match(shader, /atomicAdd\(&projectedCounts\[tileIndex\],\s*1u\)/);
  assert.match(shader, /legacyTileHeaders\[tileIndex\]\s*=\s*vec4u\(runningOffset,\s*projectedCount,\s*projectedCount,\s*0u\)/);
  assert.match(shader, /atomicAdd\(&scatterCursors\[tileIndex\],\s*1u\)/);
  assert.match(shader, /let\s+recordIndex\s*=\s*projected_legacy_ref_index\(contributorIndex\)/);
  assert.match(shader, /legacyTileRefs\[recordIndex\]\s*=\s*vec4u\(splatIndex,\s*originalId,\s*tileIndex,\s*recordIndex\)/);
  assert.doesNotMatch(shader, /@binding\(8\)|@binding\(9\)|@binding\(10\)|@binding\(11\)|@binding\(12\)/);
  assert.doesNotMatch(shader, /TODO\(contributor-arena-contract\)|intentionally inert|does not route first smoke/);
});

test("GPU contributor arena runtime writes legacy compositor buffers for live consumption", () => {
  const runtimeSource = readFileSync(
    new URL("../../src/gpuTileContributorArenaRuntime.ts", import.meta.url),
    "utf8",
  );
  const packingSource = readFileSync(
    new URL("../../src/gpuTileContributorArenaPacking.ts", import.meta.url),
    "utf8",
  );
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_contributor_arena.wgsl", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(runtimeSource, /createGpuTileContributorArenaRuntime/);
  assert.match(runtimeSource, /projectGpuArenaToLegacyCompositorBuffers/);
  assert.match(runtimeSource, /orderGpuArenaContributorsForLegacyStorage/);
  assert.match(runtimeSource, /packGpuArenaProjectedContributors/);
  assert.match(packingSource, /const orderedContributors = orderGpuArenaContributorsForLegacyStorage\(contributors\)/);
  assert.match(packingSource, /orderedContributors\.forEach\(\(contributor,\s*index\) =>/);
  assert.match(packingSource, /u32\[u32Base \+ 3\]\s*=\s*index/);
  assert.match(packingSource, /left\.tileIndex - right\.tileIndex/);
  assert.match(packingSource, /left\.viewRank - right\.viewRank/);
  assert.match(shader, /legacyTileHeaders/);
  assert.match(shader, /legacyTileRefs/);
  assert.match(shader, /legacyTileCoverageWeights/);
  assert.match(shader, /legacyAlphaParams/);
  assert.match(mainSource, /REQUESTED_ARENA_BACKEND/);
  assert.match(mainSource, /gpuArenaRuntime\.dispatch/);
  assert.match(mainSource, /effectiveArenaBackend\s*=\s*tileLocalState\?\.arenaBackend/);
  assert.match(mainSource, /maxStorageBufferBindingSize/);
  assert.match(mainSource, /gpu arena projected contributor buffers exceed max storage binding/);
  assert.match(mainSource, /adaptGpuArenaRetainedContributors/);
});

test("requested GPU arena live path consumes compact retained source while retaining CPU reference builders", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const gpuFactorySource = extractFunctionSource(mainSource, "createGpuArenaTileLocalSceneState");
  const cpuFactorySource = extractFunctionSource(mainSource, "createCpuTileLocalSceneState");
  const compactSourceStart = mainSource.indexOf("function buildCompactRetainedSourceForRuntime");
  const compactSourceEnd = mainSource.indexOf("interface RuntimeCompactTileCoverage", compactSourceStart);
  const streamingStart = mainSource.indexOf("function buildStreamingCompactRetainedSourceForRuntime");
  const streamingEnd = mainSource.indexOf("function buildCompactSourceConstructionEvidence", streamingStart);
  assert.ok(compactSourceStart >= 0, "compact-source reference builder should exist");
  assert.ok(compactSourceEnd > compactSourceStart, "compact-source reference builder slice should be bounded");
  assert.ok(streamingStart >= 0, "streaming compact-source builder should exist");
  assert.ok(streamingEnd > streamingStart, "streaming compact-source builder slice should be bounded");
  const compactSourceSource = mainSource.slice(compactSourceStart, compactSourceEnd);
  const streamingSource = mainSource.slice(streamingStart, streamingEnd);

  assert.doesNotMatch(gpuFactorySource, /buildTileLocalPrepassBridge/);
  assert.doesNotMatch(gpuFactorySource, /adaptGpuArenaRetainedContributors/);
  assert.match(gpuFactorySource, /buildCompactRetainedSourceForRuntime/);
  assert.match(gpuFactorySource, /createWgslProjectedRefStreamState/);
  assert.match(streamingSource, /buildCompactRetainedRecordsWithGpuCarrier/);
  assert.match(compactSourceSource, /buildProjectionRetentionArena\(\{/);
  assert.match(compactSourceSource, /candidateSources:\s*\{/);
  assert.match(gpuFactorySource, /const\s+gpuArenaProjectedContributors\s*=\s*compactSource\.retainedRecords/);
  assert.match(gpuFactorySource, /buildGpuArenaRetainedSourceConstructionEvidence\(compactSource\)/);
  assert.match(gpuFactorySource, /buildWgslProjectedRefStreamEvidence\(/);
  assert.match(gpuFactorySource, /createGpuTileCoveragePipelineSkeleton/);
  assert.match(gpuFactorySource, /createGpuTileContributorArenaRuntime/);
  assert.match(gpuFactorySource, /compactRetainedSourceBudgetDiagnostics/);
  assert.match(gpuFactorySource, /retainedSourceConstruction,/);
  assert.doesNotMatch(gpuFactorySource, /gpuLiveMaxTileRefs/);
  assert.doesNotMatch(gpuFactorySource, /gpuArenaRuntime:\s*null/);
  assert.match(cpuFactorySource, /buildTileLocalPrepassBridge/);
  assert.match(cpuFactorySource, /adaptGpuArenaRetainedContributors/);
  assert.match(compactSourceSource, /buildStreamingCompactRetainedSourceForRuntime/);
  assert.match(mainSource, /maxStorageBufferBindingSize/);
  assert.match(mainSource, /REQUESTED_ARENA_BACKEND === "gpu"[\s\S]*createGpuArenaTileLocalSceneState/);
});

test("GPU arena runtime exposes retained-source construction custody without claiming WGSL source ownership", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const gpuFactorySource = extractFunctionSource(mainSource, "createGpuArenaTileLocalSceneState");
  const retainedSourceEvidence = extractFunctionSource(mainSource, "buildGpuArenaRetainedSourceConstructionEvidence");
  const arenaEvidenceSource = extractFunctionSource(mainSource, "buildArenaRuntimeEvidence");
  const streamReadbackSummarySource = extractFunctionSource(mainSource, "summarizeWgslProjectedRefStreamReadback");
  const exposeSource = mainSource.slice(
    mainSource.indexOf("function exposeTileLocalRuntimeEvidence"),
    mainSource.indexOf("function traceContributorListByAnchorId"),
  );
  const statsStart = mainSource.indexOf("// Stats overlay");
  const statsEnd = mainSource.indexOf("statsEl.textContent = statsText;", statsStart);
  const statsSource = mainSource.slice(statsStart, statsEnd);

  assert.match(gpuFactorySource, /const retainedSourceConstruction = buildGpuArenaRetainedSourceConstructionEvidence\(compactSource\)/);
  assert.match(retainedSourceEvidence, /requestedSourceBackend:\s*"gpu-retained-source-substrate"/);
  assert.match(retainedSourceEvidence, /effectiveSourceBackend:\s*"deterministic-gpu-retention-carrier"/);
  assert.match(retainedSourceEvidence, /oracleBackend:\s*"cpu-reference"/);
  assert.match(retainedSourceEvidence, /runtimeConsumerBackend:\s*"gpu-contributor-arena-runtime"/);
  assert.match(retainedSourceEvidence, /sourceHandoff:\s*"cpu-projected-candidate-records"/);
  assert.match(
    retainedSourceEvidence,
    /falseClosureGuard:\s*"gpu-retention-carrier-does-not-imply-wgsl-source-construction"/,
  );
  assert.match(retainedSourceEvidence, /"compact-source-stream-retention"/);
  assert.doesNotMatch(retainedSourceEvidence, /cpuOwnedStages:[\s\S]*"compact-source-finalize-retained"/);
  assert.match(retainedSourceEvidence, /"gpu-projection-retention-election-carrier"/);
  assert.match(retainedSourceEvidence, /nextGpuOffloadStage:\s*"wgsl-projected-ref-stream"/);
  assert.match(arenaEvidenceSource, /retainedSourceConstruction:\s*tileLocalState\?\.retainedSourceConstruction/);
  assert.match(arenaEvidenceSource, /wgslProjectedRefStream:\s*tileLocalState\?\.wgslProjectedRefStreamEvidence/);
  assert.match(streamReadbackSummarySource, /compactSourceProjectedRefs:\s*stream\.compactSourceProjectedRefs/);
  assert.match(streamReadbackSummarySource, /compactSourceRetainedRefs:\s*stream\.compactSourceRetainedRefs/);
  assert.match(streamReadbackSummarySource, /source:\s*"wgsl-projected-ref-stream-readback"/);
  assert.match(exposeSource, /retainedSourceConstruction:\s*tileLocalState\.retainedSourceConstruction/);
  assert.match(exposeSource, /wgslProjectedRefStream:\s*tileLocalState\.wgslProjectedRefStreamEvidence/);
  assert.match(statsSource, /retained-source:/);
  assert.match(statsSource, /projected-stream:/);
});

test("requested GPU arena live path declares compact source trace custody instead of fabricating CPU bridge traces", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const gpuFactorySource = extractFunctionSource(mainSource, "createGpuArenaTileLocalSceneState");
  const cpuFactorySource = extractFunctionSource(mainSource, "createCpuTileLocalSceneState");

  assert.doesNotMatch(gpuFactorySource, /buildGpuLiveAnchorContributorTraces/);
  assert.doesNotMatch(gpuFactorySource, /buildTileLocalPrepassBridge/);
  assert.match(gpuFactorySource, /compactSource\.perPixelProjectedContributors/);
  assert.match(gpuFactorySource, /compactSource\.perPixelRetainedContributors/);
  assert.match(gpuFactorySource, /gpuArenaProjectedContributors,/);
  assert.match(gpuFactorySource, /perPixelProjectedContributors:\s*compactSource\.perPixelProjectedContributors/);
  assert.match(gpuFactorySource, /perPixelRetainedContributors:\s*compactSource\.perPixelRetainedContributors/);
  assert.match(cpuFactorySource, /perPixelProjectedContributors:\s*bridge\.perPixelProjectedContributors/);
  assert.match(cpuFactorySource, /perPixelRetainedContributors:\s*bridge\.perPixelRetainedContributors/);
});

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} should exist`);
  const bodyStart = source.indexOf("{", start);
  assert.ok(bodyStart > start, `${name} should have a function body`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  assert.fail(`${name} function body was not closed`);
}

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

function selectedIdSet(records) {
  return new Set(records.map((record) => record.originalId));
}

function selectedIdList(records) {
  return records.map((record) => record.originalId).sort((left, right) => left - right);
}

function denseTileCoverage() {
  const surface = Array.from({ length: 6 }, (_, index) => ({
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: index,
    originalId: 100 + index,
    coverageWeight: 10 - index * 0.1,
    retentionWeight: 0.35,
    occlusionWeight: 0.35,
    occlusionDensity: 0.08,
    opacity: 0.08,
    viewDepth: 0.3 + index * 0.01,
    viewRank: 1 + index,
  }));
  const darkForeground = {
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: 6,
    originalId: 800,
    coverageWeight: 0.2,
    retentionWeight: 0.004,
    occlusionWeight: 0.19,
    occlusionDensity: 0.95,
    opacity: 0.95,
    viewDepth: 0.18,
    viewRank: 0,
  };
  const brightBehind = {
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: 7,
    originalId: 900,
    coverageWeight: 0.25,
    retentionWeight: 1.05,
    occlusionWeight: 0.15,
    occlusionDensity: 0.6,
    opacity: 0.6,
    viewDepth: 0.62,
    viewRank: 7,
  };

  return {
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 64,
    tileColumns: 1,
    tileRows: 1,
    sourceSplatCount: 8,
    splats: Array.from({ length: 8 }, (_, index) => ({
      splatIndex: index,
      originalId: index === 6 ? 800 : index === 7 ? 900 : 100 + index,
      centerPx: [32, 32],
      covariancePx: { xx: 16, xy: 0, yy: 16 },
      tileBounds: { minTileX: 0, minTileY: 0, maxTileX: 0, maxTileY: 0 },
    })),
    tileEntries: [...surface, darkForeground, brightBehind],
    maxRefsPerTile: 4,
  };
}

function f32(values) {
  return [...Float32Array.from(values)];
}
