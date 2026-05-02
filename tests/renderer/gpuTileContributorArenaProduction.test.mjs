import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES,
  createGpuTileCoveragePlan,
  createGpuTileContributorArenaLayout,
  buildDeterministicGpuTileContributorArena,
} from "../../node_modules/.cache/renderer-tests/src/gpuTileCoverage.js";

const expectedRecordBytes =
  (GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE + GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE) *
  Uint32Array.BYTES_PER_ELEMENT;

test("GPU contributor arena layout reserves padded buffers for the anchored CPU arena fields", () => {
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

  const record0u32 = arena.contributorRecordU32.slice(0, GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE);
  const record0f32 = arena.contributorRecordF32.slice(0, GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE);
  assert.deepEqual([...record0u32], [1, 10, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual([...record0f32], f32([0.1, 0, 0.5, 11, 12, 0.25, 0, 0.25, 0.2, 0.1, 0.9, 0.7, 0.6, 0, 0, 0]));
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

test("GPU contributor arena WGSL has production count, prefix, and scatter stages rather than inert TODOs", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_contributor_arena.wgsl", import.meta.url), "utf8");

  assert.match(shader, /struct ProjectedContributor/);
  assert.match(shader, /headerU32/);
  assert.match(shader, /recordF32/);
  assert.match(shader, /atomicAdd\(&projectedCounts\[tileIndex\],\s*1u\)/);
  assert.match(shader, /prefixCounts\[tileIndex\]\s*=\s*runningOffset/);
  assert.match(shader, /atomicAdd\(&scatterCursors\[tileIndex\],\s*1u\)/);
  assert.match(shader, /recordU32\[recordBaseU32 \+ 1u\]\s*=\s*projected\.originalId/);
  assert.doesNotMatch(shader, /TODO\(contributor-arena-contract\)|intentionally inert|does not route first smoke/);
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

function f32(values) {
  return [...Float32Array.from(values)];
}
