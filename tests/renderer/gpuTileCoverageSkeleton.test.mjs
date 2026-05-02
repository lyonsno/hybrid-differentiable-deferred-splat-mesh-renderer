import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GPU_TILE_COVERAGE_BINDINGS,
  GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
  GPU_TILE_COVERAGE_PROJECTED_BOUNDS_BYTES,
  GPU_TILE_COVERAGE_TILE_HEADER_BYTES,
  GPU_TILE_COVERAGE_TILE_REF_BYTES,
  GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF,
  GPU_TILE_COVERAGE_WORKGROUP_SIZE,
  createGpuTileCoveragePlan,
  createGpuTileContributorArenaLayout,
  getGpuTileContributorArenaDispatchPlan,
  assertGpuTileContributorArenaCompatibility,
  getGpuTileCoverageDispatchPlan,
  writeGpuTileCoverageFrameUniforms,
} from "../../node_modules/.cache/renderer-tests/src/gpuTileCoverage.js";

test("GPU tile coverage plan derives a parameterized tile grid without hard-coding the smoke bridge tile size", () => {
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 130,
    viewportHeight: 65,
    tileSizePx: 32,
    splatCount: 17,
    maxTileRefs: 96,
  });

  assert.equal(plan.tileColumns, 5);
  assert.equal(plan.tileRows, 3);
  assert.equal(plan.tileCount, 15);
  assert.equal(plan.tileSizePx, 32);
  assert.equal(plan.splatCount, 17);
  assert.equal(plan.maxTileRefs, 96);
  assert.equal(plan.projectedBoundsBytes, 17 * GPU_TILE_COVERAGE_PROJECTED_BOUNDS_BYTES);
  assert.equal(plan.tileHeaderBytes, 15 * GPU_TILE_COVERAGE_TILE_HEADER_BYTES);
  assert.equal(plan.tileRefBytes, 96 * GPU_TILE_COVERAGE_TILE_REF_BYTES);
  assert.throws(() => createGpuTileCoveragePlan({ viewportWidth: 1, viewportHeight: 1, tileSizePx: 48, splatCount: 1, maxTileRefs: 0 }), /max tile refs/i);
});

test("GPU tile coverage plan reserves primary and inverse-conic alpha params per tile ref", () => {
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 16,
    splatCount: 2,
    maxTileRefs: 5,
  });

  assert.equal(GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF, 8);
  assert.equal(plan.alphaParamBytes, 5 * GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF * Float32Array.BYTES_PER_ELEMENT);
});

test("GPU tile coverage frame uniforms expose viewport, tile grid, and counts at stable WGSL offsets", () => {
  const viewProj = Float32Array.from({ length: 16 }, (_, index) => index + 0.5);
  const target = new Float32Array(GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 640,
    viewportHeight: 480,
    tileSizePx: 20,
    splatCount: 9,
    maxTileRefs: 40,
  });

  writeGpuTileCoverageFrameUniforms(target, viewProj, plan);

  const targetU32 = new Uint32Array(target.buffer, target.byteOffset, target.length);
  assert.deepEqual([...target.slice(0, 16)], [...viewProj]);
  assert.equal(target[16], 640);
  assert.equal(target[17], 480);
  assert.equal(target[18], 20);
  assert.equal(target[19], 0);
  assert.equal(targetU32[20], 32);
  assert.equal(targetU32[21], 24);
  assert.equal(targetU32[22], 9);
  assert.equal(targetU32[23], 40);
  assert.throws(() => writeGpuTileCoverageFrameUniforms(new Float32Array(4), viewProj, plan), /too small/i);
});

test("GPU tile coverage dispatch plan separates bounds, list construction, and tile compositing phases", () => {
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 1920,
    viewportHeight: 1080,
    tileSizePx: 24,
    splatCount: GPU_TILE_COVERAGE_WORKGROUP_SIZE + 1,
    maxTileRefs: 4096,
  });
  const dispatch = getGpuTileCoverageDispatchPlan(plan);

  assert.deepEqual(dispatch, {
    projectBounds: { x: 2, y: 1, z: 1 },
    clearTiles: { x: Math.ceil(plan.tileCount / GPU_TILE_COVERAGE_WORKGROUP_SIZE), y: 1, z: 1 },
    buildTileRefs: { x: 2, y: 1, z: 1 },
    compositeTiles: { x: plan.tileColumns, y: plan.tileRows, z: 1 },
  });
});

test("GPU tile coverage bindings consume provisional coverage, alpha, and ordering buffers separately", () => {
  assert.deepEqual(GPU_TILE_COVERAGE_BINDINGS, {
    frame: 0,
    positions: 1,
    colors: 2,
    projectedBounds: 4,
    tileHeaders: 5,
    tileRefs: 6,
    tileCoverageWeights: 7,
    orderingKeys: 8,
    alphaParams: 9,
    outputColor: 10,
  });
});

test("GPU contributor arena layout extends the legacy flat tile-ref buffers without replacing them", () => {
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 320,
    viewportHeight: 96,
    tileSizePx: 32,
    splatCount: 12,
    maxTileRefs: 128,
  });
  const arena = createGpuTileContributorArenaLayout(plan);

  assert.equal(arena.tileCount, plan.tileCount);
  assert.equal(arena.maxContributors, plan.maxTileRefs);
  assert.equal(arena.headerBytes, plan.tileHeaderBytes);
  assert.equal(arena.legacyTileRefBytes, plan.tileRefBytes);
  assert.equal(arena.prefixCountBytes, Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT));
  assert.equal(arena.contributorRecordBytes, Math.max(16, plan.maxTileRefs * 64));
  assert.equal(arena.recordStrideBytes, 64);
  assert.equal(arena.forcesFirstSmokeGpuArena, false);
});

test("GPU contributor arena dispatch skeleton separates count, prefix, and scatter stages", () => {
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 512,
    viewportHeight: 384,
    tileSizePx: 24,
    splatCount: GPU_TILE_COVERAGE_WORKGROUP_SIZE * 2 + 3,
    maxTileRefs: 1024,
  });

  assert.deepEqual(getGpuTileContributorArenaDispatchPlan(plan), {
    clearArena: { x: Math.ceil(plan.tileCount / GPU_TILE_COVERAGE_WORKGROUP_SIZE), y: 1, z: 1 },
    countContributors: { x: 3, y: 1, z: 1 },
    prefixCounts: { x: Math.ceil(plan.tileCount / GPU_TILE_COVERAGE_WORKGROUP_SIZE), y: 1, z: 1 },
    scatterContributors: { x: 3, y: 1, z: 1 },
  });
});

test("GPU contributor arena compatibility check keeps CPU/reference ownership explicit", () => {
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 128,
    viewportHeight: 128,
    tileSizePx: 16,
    splatCount: 8,
    maxTileRefs: 32,
  });
  const arena = createGpuTileContributorArenaLayout(plan);

  assert.deepEqual(assertGpuTileContributorArenaCompatibility(plan, arena), {
    compatible: true,
    consumesAnchorContract: true,
    ownsCpuReferenceSemantics: false,
    routesFirstSmokeThroughGpuArena: false,
    legacyTileHeaderBytes: plan.tileHeaderBytes,
    legacyTileRefBytes: plan.tileRefBytes,
  });
  assert.throws(
    () => assertGpuTileContributorArenaCompatibility(plan, { ...arena, legacyTileRefBytes: plan.tileRefBytes - 16 }),
    /legacy tile-ref/i,
  );
});

test("GPU tile coverage WGSL is a separate skeleton and does not mutate the live plate bridge", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn project_bounds/);
  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn clear_tiles/);
  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn build_tile_refs/);
  assert.match(shader, /@compute @workgroup_size\(8,\s*8,\s*1\)\s+fn composite_tiles/);
  assert.match(shader, /var<storage, read_write> tileCoverageWeights/);
  assert.match(shader, /var<storage, read> orderingKeys/);
  assert.match(shader, /var<storage, read> alphaParams/);
  assert.match(shader, /fn conic_pixel_weight/);
  assert.match(shader, /alphaParams\[alphaParamIndex \+ frame\.maxTileRefs\]/);
  assert.doesNotMatch(shader, /var<storage, read> scales/);
  assert.doesNotMatch(shader, /var<storage, read> rotations/);
  assert.doesNotMatch(shader, /splat_plate/);
  assert.doesNotMatch(shader, /alphaDensity|centerTile|48px/);
});

test("GPU contributor arena WGSL is a nonblocking count-prefix-scatter skeleton", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_contributor_arena.wgsl", import.meta.url), "utf8");

  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn clear_contributor_arena/);
  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn count_tile_contributors/);
  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn prefix_tile_contributor_counts/);
  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn scatter_tile_contributors/);
  assert.match(shader, /TODO\(contributor-arena-contract\)/);
  assert.match(shader, /does not route first smoke through this GPU arena/);
  assert.doesNotMatch(shader, /@fragment|textureStore|globalOpacity|brightness/);
});
