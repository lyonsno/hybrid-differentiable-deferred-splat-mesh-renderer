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
} from "../../node_modules/.cache/renderer-tests/src/gpuTileCoverage.js";
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

test("GPU-owned projection retention selects the CPU reference retained records under cap pressure", () => {
  const cpuArena = buildTileLocalContributorArena(denseTileCoverage(), {
    maxRefsPerTile: 4,
    depthBandCount: 4,
  });
  const arena = buildDeterministicGpuTileProjectionRetentionArena({
    tileCount: 1,
    maxContributors: 8,
    maxRefsPerTile: 4,
    contributors: cpuArena.projectedContributors,
  });
  const cpuRetainedIds = cpuArena.contributors
    .sort((left, right) => left.contributorIndex - right.contributorIndex)
    .map((record) => record.originalId);
  const cpuDroppedIds = cpuArena.projectedContributors
    .filter((record) => !record.retained)
    .map((record) => record.originalId);

  assert.equal(arena.projectedContributorCount, 8);
  assert.equal(arena.retainedContributorCount, 4);
  assert.equal(arena.droppedContributorCount, 4);
  assert.deepEqual(arena.retainedRecords.map((record) => record.originalId), cpuRetainedIds);
  assert.deepEqual(arena.droppedRecords.map((record) => record.originalId), cpuDroppedIds);
  assert.deepEqual([...arena.tileHeaderU32.slice(0, GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE)], [
    0, 4, 8, 4, 1, 7, 0, 0,
  ]);
  assert.deepEqual([...arena.projectedCounts], [8]);
  assert.deepEqual([...arena.retainedCounts], [4]);
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
  assert.match(shader, /legacyTileRefs\[recordIndex\]\s*=\s*vec4u\(splatIndex,\s*originalId,\s*tileIndex,\s*recordIndex\)/);
  assert.doesNotMatch(shader, /@binding\(8\)|@binding\(9\)|@binding\(10\)|@binding\(11\)|@binding\(12\)/);
  assert.doesNotMatch(shader, /TODO\(contributor-arena-contract\)|intentionally inert|does not route first smoke/);
});

test("GPU contributor arena runtime writes legacy compositor buffers for live consumption", () => {
  const runtimeSource = readFileSync(
    new URL("../../src/gpuTileContributorArenaRuntime.ts", import.meta.url),
    "utf8",
  );
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_contributor_arena.wgsl", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(runtimeSource, /createGpuTileContributorArenaRuntime/);
  assert.match(runtimeSource, /projectGpuArenaToLegacyCompositorBuffers/);
  assert.match(runtimeSource, /orderedContributors = \[\.\.\.contributors\]\.sort\(compareGpuArenaContributorStorageOrder\)/);
  assert.match(runtimeSource, /left\.tileIndex - right\.tileIndex/);
  assert.match(runtimeSource, /left\.viewRank - right\.viewRank/);
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
