import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS,
  GPU_TILE_COVERAGE_BINDINGS,
  GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
  GPU_TILE_COVERAGE_PROJECTED_BOUNDS_BYTES,
  GPU_TILE_COVERAGE_TILE_HEADER_BYTES,
  GPU_TILE_COVERAGE_TILE_REF_BYTES,
  GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF,
  GPU_TILE_COVERAGE_WORKGROUP_SIZE,
  GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_WIDTH,
  GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_HEIGHT,
  createGpuTileCoveragePlan,
  createGpuTileContributorArenaLayout,
  buildGpuProjectionRetentionCandidateSourceClassMasks,
  resolveGpuLiveFootprintPolicy,
  resolveGpuTileCoverageCompactFootprintTileBounds,
  getGpuTileContributorArenaDispatchPlan,
  assertGpuTileContributorArenaCompatibility,
  GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES,
  GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE,
  getGpuTileCoverageDispatchPlan,
  writeGpuTileCoverageSourceIndexTable,
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
  assert.equal(target[24], 1);
  assert.equal(target[25], 1.5);
  assert.equal(targetU32[26], 9);
  assert.equal(targetU32[27], 0);
  writeGpuTileCoverageFrameUniforms(target, viewProj, plan, "final-color", { splatScale: 600, minRadiusPx: 4 });
  assert.equal(target[24], 600);
  assert.equal(target[25], 4);
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
    clearTiles: { x: Math.ceil(plan.tileCount / GPU_TILE_COVERAGE_WORKGROUP_SIZE), y: 1, z: 1 },
    buildTileRefs: { x: 2, y: 1, z: 1 },
    compactRetainedRefs: { x: Math.ceil(plan.tileCount / GPU_TILE_COVERAGE_WORKGROUP_SIZE), y: 1, z: 1 },
    compositeTiles: {
      x: Math.ceil(plan.viewportWidth / GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_WIDTH),
      y: Math.ceil(plan.viewportHeight / GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_HEIGHT),
      z: 1,
    },
  });
});

test("GPU tile coverage compact source table stores non-contiguous source ids after tile headers", () => {
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 32,
    splatCount: 4,
    sourceSplatCount: 2,
    maxTileRefs: 8,
  });
  const target = new Uint32Array(plan.tileHeaderBytes / Uint32Array.BYTES_PER_ELEMENT);
  target.fill(0xcafebabe, 0, plan.tileCount * 4);

  const layout = writeGpuTileCoverageSourceIndexTable(target, plan, Uint32Array.of(3, 1));

  assert.deepEqual(layout, { offsetU32: 16, strideU32: 4, count: 2 });
  assert.deepEqual(getGpuTileCoverageDispatchPlan(plan).buildTileRefs, { x: 1, y: 1, z: 1 });
  assert.equal(plan.sourceSplatCount, 2);
  assert.equal(plan.splatCount, 4);
  assert.equal(plan.tileHeaderBytes, (plan.tileCount + plan.sourceSplatCount) * GPU_TILE_COVERAGE_TILE_HEADER_BYTES);
  assert.deepEqual([...target.slice(0, 16)], Array.from({ length: 16 }, () => 0xcafebabe));
  assert.equal(target[16], 3);
  assert.equal(target[20], 1);
  assert.equal(target[17], 0);
  assert.equal(target[21], 0);
});

test("GPU tile coverage compact source table carries candidate source class masks without new bindings", () => {
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 32,
    splatCount: 6,
    sourceSplatCount: 3,
    maxTileRefs: 8,
  });
  const candidateSplatIndexes = Uint32Array.of(5, 3, 1);
  const classMasks = buildGpuProjectionRetentionCandidateSourceClassMasks(candidateSplatIndexes, {
    retentionRecords: [{ tileIndex: 0, splatIndex: 5, originalId: 50 }],
    occlusionRecords: [{ tileIndex: 1, splatIndex: 3, originalId: 30 }],
    coverageRecords: [
      { tileIndex: 2, splatIndex: 5, originalId: 51 },
      { tileIndex: 2, splatIndex: 1, originalId: 10 },
    ],
    supportSampleRecordGroups: [
      [
        { tileIndex: 3, splatIndex: 3, originalId: 31 },
      ],
    ],
  });
  const target = new Uint32Array(plan.tileHeaderBytes / Uint32Array.BYTES_PER_ELEMENT);

  const layout = writeGpuTileCoverageSourceIndexTable(target, plan, candidateSplatIndexes, classMasks);

  assert.deepEqual(layout, { offsetU32: 16, strideU32: 4, count: 3 });
  assert.equal(target[16], 5);
  assert.equal(target[17], GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS.retention | GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS.coverage);
  assert.equal(target[20], 3);
  assert.equal(target[21], GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS.occlusion | GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS.support);
  assert.equal(target[24], 1);
  assert.equal(target[25], GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS.coverage);
  assert.equal(target[18], 0);
  assert.equal(target[22], 0);
  assert.equal(target[26], 0);
});

test("GPU tile coverage bindings carry the live tile buffers inside WebGPU storage limits", () => {
  const renderer = readFileSync(new URL("../../src/gpuTileCoverageRenderer.ts", import.meta.url), "utf8");
  const storageBindings = [...renderer.matchAll(/storageEntry\(GPU_TILE_COVERAGE_BINDINGS\.(\w+)/g)].map((match) => match[1]);

  assert.deepEqual(GPU_TILE_COVERAGE_BINDINGS, {
    frame: 0,
    positions: 1,
    colors: 2,
    scales: 3,
    rotations: 4,
    tileHeaders: 5,
    tileRefs: 6,
    tileCoverageWeights: 7,
    alphaParams: 8,
    outputColor: 9,
    tileScatterCursors: 11,
    opacities: 12,
    candidateSourceRecords: 13,
    candidateSourceGroups: 14,
  });
  assert.equal(
    storageBindings.length,
    10,
    `current tile coverage compositor layout must not exceed WebGPU's common 10 storage-buffer compute-stage limit: ${storageBindings.join(", ")}`,
  );
  assert.doesNotMatch(
    renderer,
    /storageEntry\(GPU_TILE_COVERAGE_BINDINGS\.candidateSource/,
    "candidate-source inputs need a narrower future election consumer, not the already-full compositor bind group",
  );
});

test("WGSL source-frontier election consumes candidate class masks from the compact source table", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(shader, /const CANDIDATE_SOURCE_CLASS_RETENTION_MASK = 1u/);
  assert.match(shader, /const CANDIDATE_SOURCE_CLASS_OCCLUSION_MASK = 2u/);
  assert.match(shader, /const CANDIDATE_SOURCE_CLASS_COVERAGE_MASK = 4u/);
  assert.match(shader, /const CANDIDATE_SOURCE_CLASS_SUPPORT_MASK = 8u/);
  assert.match(shader, /let sourceMetadata = tileHeaders\[tile_count\(\) \+ sourceOrdinal\]/);
  assert.match(shader, /splatId = sourceMetadata\.x/);
  assert.match(shader, /candidateSourceClassMask = sourceMetadata\.y/);
  assert.match(shader, /fn gpu_live_candidate_source_pool\(/);
  assert.match(shader, /gpu_live_retention_pool_slot\([\s\S]*candidateSourceClassMask[\s\S]*tileCapacity/);
});

test("WGSL source-frontier foreground support carries class masks across the final alpha bulkhead", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(
    shader,
    /const SOURCE_FRONTIER_ALPHA_CLASS_MASK_SENTINEL = -1024\.0/,
    "source-frontier class-mask payloads need a sentinel namespace so legacy view-rank evidence cannot be mistaken for a class mask",
  );
  assert.match(
    shader,
    /let alphaPayload = select\(f32\(splatId\),\s*SOURCE_FRONTIER_ALPHA_CLASS_MASK_SENTINEL - f32\(candidateSourceClassMask\),\s*candidateSourceClassMask != 0u\)/,
    "source-frontier retained refs must preserve legacy splat/rank payloads unless a real class mask is present",
  );
  assert.match(
    shader,
    /alphaParams\[refIndex\] = vec4f\(sourceOpacity,\s*centerPx\.x,\s*centerPx\.y,\s*alphaPayload\)/,
    "source-frontier retained refs must write the tagged alpha payload instead of erasing sidecar evidence",
  );
  assert.match(
    shader,
    /fn gpu_live_try_commit_retained_ref\([\s\S]*candidateSourceClassMask:\s*u32[\s\S]*\)/,
    "the retained-ref write helper must receive the candidate class mask instead of relying on an out-of-scope build_tile_refs local",
  );
  assert.match(
    shader,
    /gpu_live_try_commit_retained_ref\([\s\S]*candidateSourceClassMask,\s*[\s\S]*conic\.inverseConic[\s\S]*\)/,
    "build_tile_refs must thread the candidate class mask into retained-ref writes",
  );
  assert.match(shader, /fn source_frontier_alpha_transfer_weight\(/);
  assert.match(
    shader,
    /if \(alphaParam\.w > SOURCE_FRONTIER_ALPHA_CLASS_MASK_SENTINEL\) \{\s*return 0u;\s*\}/,
    "source-frontier compositor must not decode legacy splat/rank payloads as class masks",
  );
  assert.match(
    shader,
    /let sourceFrontierClassMask = u32\(max\(SOURCE_FRONTIER_ALPHA_CLASS_MASK_SENTINEL - alphaParam\.w,\s*0\.0\)\)/,
    "source-frontier compositor must recover the carried candidate-source class mask from the sentinel-tagged payload",
  );
  assert.match(
    shader,
    /let sourceFrontierSupportWeight = conic_pixel_weight_with_falloff_scale\(alphaParam,\s*conicParam,\s*pixelCenter,\s*SOURCE_FRONTIER_SUPPORT_FALLOFF_SCALE\)[\s\S]*let alphaTransferWeight = source_frontier_alpha_transfer_weight\(pixelCoverageWeight,\s*tileCoverageWeight,\s*sourceFrontierSupportWeight,\s*sourceFrontierClassMask\)/,
    "source-frontier alpha transfer must use the role-aware support weight instead of raw conic pixel weight",
  );
  assert.match(
    shader,
    /pow\(1\.0\s*-\s*sourceOpacity,\s*alphaTransferWeight\)/,
    "the role-aware weight must drive final optical alpha",
  );
});

test("WGSL source-frontier overflow keeps retained slot and score pool coherent", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(
    shader,
    /fn gpu_live_retention_overflow_pool_slot\([\s\S]*compositorOrderSlot:\s*u32[\s\S]*candidateSourceClassMask:\s*u32[\s\S]*fallbackPool[\s\S]*requestedPool[\s\S]*gpu_live_depth_ordered_pool_slot\([\s\S]*compositorOrderSlot[\s\S]*requestedPool[\s\S]*RetentionPoolSlot\(orderedPoolSlot,\s*requestedPool\)/,
    "overflow candidate source masks must score as their requested pool while preserving depth-ordered compositor slots",
  );
  assert.doesNotMatch(
    shader,
    /RetentionPoolSlot\(overflowSlot,\s*gpu_live_candidate_source_pool\(candidateSourceClassMask,\s*fallbackPool\)\)/,
    "overflow must not hash into one pool's slot range while scoring as a different candidate-source pool",
  );
  assert.doesNotMatch(
    shader,
    /let poolSlot = poolStart \+ gpu_live_overflow_election_slot/,
    "overflow candidates must not let candidate-source pool bands become compositor draw order",
  );
});

test("WGSL source-frontier depth-ordered pool seats stay legal for tiny capacities", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const bucketCount = 16;
  const support = 3;
  const depthOrderedPoolSlot = ({ compositorOrderSlot, projectedSlot, tileId, splatId, pool, capacity }) => {
    const safeCapacity = Math.max(capacity, 1);
    const effectiveBucketCount = Math.min(bucketCount, safeCapacity);
    const orderedSlot = Math.min(compositorOrderSlot, safeCapacity - 1);
    const depthBucket = Math.min(
      Math.floor((orderedSlot * effectiveBucketCount) / safeCapacity),
      effectiveBucketCount - 1,
    );
    const bucketStart = Math.floor((depthBucket * safeCapacity) / effectiveBucketCount);
    const nextBucketStart = Math.floor(((depthBucket + 1) * safeCapacity) / effectiveBucketCount);
    const bucketWidth = Math.max(nextBucketStart - bucketStart, 1);
    const orderedLocalSlot = orderedSlot - bucketStart;
    const poolLane = Math.min(pool, support);
    const sparseOrdinal = Math.floor(projectedSlot / bucketWidth);
    const hashedOrdinal = ((splatId * 747796405 + tileId * 2891336453 + 277803737) >>> 0) % bucketWidth;
    const localSlot = (orderedLocalSlot + poolLane + sparseOrdinal + hashedOrdinal) % bucketWidth;
    return Math.min(bucketStart + localSlot, safeCapacity - 1);
  };

  const illegalSlots = [];
  for (let capacity = 1; capacity <= 4; capacity += 1) {
    for (let pool = 0; pool <= support; pool += 1) {
      for (let projectedSlot = 0; projectedSlot <= capacity + 2; projectedSlot += 1) {
        const slot = depthOrderedPoolSlot({
          compositorOrderSlot: projectedSlot,
          projectedSlot,
          tileId: 7,
          splatId: 13,
          pool,
          capacity,
        });
        if (slot < 0 || slot >= capacity) {
          illegalSlots.push(`${capacity}:${pool}:${projectedSlot}->${slot}`);
        }
      }
    }
  }

  assert.deepEqual(illegalSlots, [], "depth-ordered pool seats should stay legal even when old pool bands were impossible");
  assert.match(
    shader,
    /fn gpu_live_depth_ordered_pool_slot\([\s\S]*poolStart = min\(rawPoolStart,\s*safeCapacity - 1u\)[\s\S]*poolEnd = max\(min\(rawPoolEnd,\s*safeCapacity\),\s*poolStart \+ 1u\)[\s\S]*return min\(poolStart \+ bucketStart \+ localSlot,\s*poolEnd - 1u\)/,
    "depth-ordered pool slots must clamp into a legal requested-pool band even when old pool bands are empty",
  );
  assert.match(
    shader,
    /let orderedPoolSlot = gpu_live_depth_ordered_pool_slot\(\s*compositorOrderSlot,\s*projectedSlot,\s*tileId,\s*splatId,\s*pool,\s*safeCapacity,\s*\)/,
    "in-cap candidates must use the same legal depth-ordered slot helper as overflow candidates",
  );
});

test("WGSL source-frontier depth-ordered seats preserve retention pool hard bands", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const bucketCount = 16;
  const pools = {
    retention: 0,
    occlusion: 1,
    coverage: 2,
    support: 3,
  };
  const capacity = 16;
  const supportTarget = Math.max(Math.floor(capacity / 4), 1);
  const priorityTarget = Math.max(capacity - supportTarget, 1);
  const poolBand = (pool) => {
    if (pool === pools.support) {
      return [priorityTarget, capacity];
    }
    return [
      Math.floor((Math.min(pool, 2) * priorityTarget) / 3),
      Math.floor(((Math.min(pool, 2) + 1) * priorityTarget) / 3),
    ];
  };
  const overflowElectionSlot = ({ tileId, splatId, capacity }) => (
    ((splatId * 747796405 + tileId * 2891336453 + 277803737) >>> 0) % capacity
  );
  const depthOrderedPoolSlot = ({ compositorOrderSlot, projectedSlot, tileId, splatId, pool }) => {
    const [poolStart, poolEnd] = poolBand(pool);
    const poolWidth = Math.max(poolEnd - poolStart, 1);
    const effectiveBucketCount = Math.min(bucketCount, poolWidth);
    const orderedSlot = Math.min(compositorOrderSlot, poolWidth - 1);
    const depthBucket = Math.min(
      Math.floor((orderedSlot * effectiveBucketCount) / poolWidth),
      effectiveBucketCount - 1,
    );
    const bucketStart = Math.floor((depthBucket * poolWidth) / effectiveBucketCount);
    const nextBucketStart = Math.floor(((depthBucket + 1) * poolWidth) / effectiveBucketCount);
    const bucketWidth = Math.max(nextBucketStart - bucketStart, 1);
    const orderedLocalSlot = orderedSlot - bucketStart;
    const sparseOrdinal = Math.floor(projectedSlot / bucketWidth);
    const hashedOrdinal = overflowElectionSlot({ tileId, splatId, capacity: bucketWidth });
    const localSlot = (orderedLocalSlot + sparseOrdinal + hashedOrdinal) % bucketWidth;
    return Math.min(poolStart + bucketStart + localSlot, poolEnd - 1);
  };

  const leakedSlots = [];
  for (const [poolName, pool] of Object.entries(pools)) {
    const [poolStart, poolEnd] = poolBand(pool);
    for (let projectedSlot = 0; projectedSlot < capacity * 2; projectedSlot += 1) {
      const slot = depthOrderedPoolSlot({
        compositorOrderSlot: projectedSlot,
        projectedSlot,
        tileId: 11,
        splatId: 700 + projectedSlot,
        pool,
      });
      if (slot < poolStart || slot >= poolEnd) {
        leakedSlots.push(`${poolName}:${projectedSlot}->${slot} outside ${poolStart}..${poolEnd - 1}`);
      }
    }
  }

  assert.deepEqual(leakedSlots, [], "depth-ordered source-frontier slots must remain inside each pool's hard seats");
  assert.match(
    shader,
    /fn gpu_live_retention_pool_start\([\s\S]*RETENTION_POOL_SUPPORT[\s\S]*gpu_live_retention_priority_pool_start/,
    "depth-ordered slot allocation must share the same hard-seat pool starts as fallback pool classification",
  );
  assert.match(
    shader,
    /fn gpu_live_depth_ordered_pool_slot\([\s\S]*rawPoolStart = gpu_live_retention_pool_start\([\s\S]*rawPoolEnd = gpu_live_retention_pool_end\([\s\S]*poolStart = min\(rawPoolStart,\s*safeCapacity - 1u\)[\s\S]*poolEnd = max\(min\(rawPoolEnd,\s*safeCapacity\),\s*poolStart \+ 1u\)[\s\S]*return min\(poolStart \+ bucketStart \+ localSlot,\s*poolEnd - 1u\)/,
    "depth-ordered slots must bucket within a requested pool band, not across the whole tile capacity",
  );
});

test("GPU live footprint policy caps pathological projected conic energy without shrinking normal splats", () => {
  const normal = resolveGpuLiveFootprintPolicy({
    majorRadiusPx: 24,
    minorRadiusPx: 12,
    viewportWidth: 1280,
    viewportHeight: 720,
    minRadiusPx: 1.5,
  });
  assert.equal(normal.scale, 1);
  assert.equal(normal.majorRadiusPx, 24);
  assert.equal(normal.minorRadiusPx, 12);

  const pathological = resolveGpuLiveFootprintPolicy({
    majorRadiusPx: 14695.833284102126,
    minorRadiusPx: 958.8789017237548,
    viewportWidth: 1280,
    viewportHeight: 720,
    minRadiusPx: 1.5,
  });
  assert.ok(pathological.scale < 0.02, `expected strong cap scale, got ${pathological.scale}`);
  assert.ok(pathological.majorRadiusPx < 220, `expected bounded major radius, got ${pathological.majorRadiusPx}`);
  assert.ok(Math.PI * pathological.majorRadiusPx * pathological.minorRadiusPx <= pathological.areaCapPx + 1e-6);

  const longThin = resolveGpuLiveFootprintPolicy({
    majorRadiusPx: 900,
    minorRadiusPx: 2,
    viewportWidth: 1280,
    viewportHeight: 720,
    minRadiusPx: 1.5,
  });
  assert.ok(longThin.majorRadiusPx <= longThin.majorRadiusCapPx + 1e-6);
  assert.ok(longThin.minorRadiusPx >= 1.5);
});

test("WGSL compact candidate footprints use axis-aligned compact bounds before per-splat tile caps", () => {
  const small = resolveGpuTileCoverageCompactFootprintTileBounds({
    centerPx: [40, 40],
    covariancePx: { xx: 2.25, xy: 0, yy: 2.25 },
    viewportWidth: 128,
    viewportHeight: 128,
    tileSizePx: 16,
    maxTilesPerSplat: 9,
  });

  assert.deepEqual(small, {
    minTileX: 2,
    minTileY: 2,
    maxTileX: 2,
    maxTileY: 2,
    tileCount: 1,
  });

  const longThin = resolveGpuTileCoverageCompactFootprintTileBounds({
    centerPx: [40, 40],
    covariancePx: { xx: 100, xy: 0, yy: 4 },
    viewportWidth: 128,
    viewportHeight: 128,
    tileSizePx: 16,
    maxTilesPerSplat: 9,
  });

  assert.deepEqual(longThin, {
    minTileX: 1,
    minTileY: 2,
    maxTileX: 3,
    maxTileY: 2,
    tileCount: 3,
  });
});

test("WGSL compact candidate shader does not inflate footprint bounds through scalar support radius", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const buildTileRefs = shader.slice(shader.indexOf("fn build_tile_refs"), shader.indexOf("@compute @workgroup_size(8, 8, 1) fn composite_tiles"));

  assert.match(shader, /fn gpu_live_compact_footprint_bounds/);
  assert.doesNotMatch(shader, /fn gpu_live_support_radius_px/);
  assert.match(buildTileRefs, /let tileBounds = gpu_live_compact_footprint_bounds\(conic, centerPx, tileSizePx\)/);
  assert.doesNotMatch(buildTileRefs, /gpu_live_support_radius_px/);
  assert.match(buildTileRefs, /minTileX = tileBounds\.x/);
  assert.match(buildTileRefs, /maxTileY = tileBounds\.w/);
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
  assert.equal(arena.headerUint32Bytes, plan.tileCount * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE * Uint32Array.BYTES_PER_ELEMENT);
  assert.equal(arena.headerFloat32Bytes, plan.tileCount * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE * Float32Array.BYTES_PER_ELEMENT);
  assert.equal(arena.headerBytes, arena.headerUint32Bytes + arena.headerFloat32Bytes);
  assert.equal(arena.legacyTileRefBytes, plan.tileRefBytes);
  assert.equal(arena.prefixCountBytes, Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT));
  assert.equal(arena.projectedCountBytes, arena.prefixCountBytes);
  assert.equal(arena.scatterCursorBytes, arena.prefixCountBytes);
  assert.equal(arena.contributorRecordUint32Bytes, plan.maxTileRefs * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE * Uint32Array.BYTES_PER_ELEMENT);
  assert.equal(arena.contributorRecordFloat32Bytes, plan.maxTileRefs * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE * Float32Array.BYTES_PER_ELEMENT);
  assert.equal(arena.contributorRecordBytes, Math.max(16, plan.maxTileRefs * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES));
  assert.equal(arena.recordStrideBytes, GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES);
  assert.equal(arena.forcesFirstSmokeGpuArena, false);
});

test("GPU contributor arena dispatch plan separates count, prefix, and scatter stages", () => {
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

  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn clear_tiles/);
  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn build_tile_refs/);
  assert.match(shader, /@compute @workgroup_size\(8,\s*8,\s*1\)\s+fn composite_tiles/);
  assert.match(shader, /var<storage, read_write> tileCoverageWeights/);
  assert.match(shader, /var<storage, read_write> alphaParams/);
  assert.match(shader, /var<storage, read_write> tileScatterCursors: array<atomic<u32>>/);
  assert.match(shader, /var<storage, read_write> tileRefs: array<atomic<u32>>/);
  assert.match(shader, /atomicCompareExchangeWeak\(&tileRefs\[scoreIndex\]/);
  assert.match(shader, /fn conic_pixel_weight/);
  assert.match(shader, /alphaParams\[alphaParamIndex \+ frame\.maxTileRefs\]/);
  assert.match(shader, /var<storage, read> scales/);
  assert.match(shader, /var<storage, read> rotations/);
  assert.doesNotMatch(shader, /splat_plate/);
  assert.doesNotMatch(shader, /alphaDensity|centerTile|48px/);
});

test("GPU contributor arena WGSL is a nonblocking count-prefix-scatter carrier", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_contributor_arena.wgsl", import.meta.url), "utf8");

  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn clear_contributor_arena/);
  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn count_tile_contributors/);
  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn prefix_tile_contributor_counts/);
  assert.match(shader, /@compute @workgroup_size\(64\)\s+fn scatter_tile_contributors/);
  assert.match(shader, /struct ProjectedContributor/);
  assert.match(shader, /atomicAdd\(&projectedCounts\[tileIndex\],\s*1u\)/);
  assert.match(shader, /legacyTileHeaders\[tileIndex\]\s*=\s*vec4u\(runningOffset,\s*projectedCount,\s*projectedCount,\s*0u\)/);
  assert.doesNotMatch(shader, /@binding\(8\)|@binding\(9\)|@binding\(10\)|@binding\(11\)|@binding\(12\)/);
  assert.doesNotMatch(shader, /@fragment|textureStore|globalOpacity|brightness/);
});
