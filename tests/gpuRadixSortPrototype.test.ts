import assert from "node:assert/strict";
import test from "node:test";

import {
  GPU_RADIX_BUCKET_COUNT,
  GPU_RADIX_DEPTH_KEY_SPACE,
  GPU_RADIX_HISTOGRAM_SHADER_WGSL,
  GPU_RADIX_RANK_SHADER_WGSL,
  GPU_RADIX_SCATTER_SHADER_WGSL,
  createGpuRadixSortPrototypePlan,
  createRadixDepthSortInput,
  depthToDescendingRadixKey,
  simulateGpuRadixSortPrototype,
} from "../src/gpuRadixSortPrototype.ts";

test("descending radix keys preserve view-space depth order without screen-space state", () => {
  assert.equal(GPU_RADIX_DEPTH_KEY_SPACE, "view-space-f32-descending");
  assert.ok(depthToDescendingRadixKey(4.0) < depthToDescendingRadixKey(2.5));
  assert.ok(depthToDescendingRadixKey(2.5) < depthToDescendingRadixKey(0.25));
  assert.ok(depthToDescendingRadixKey(0.25) < depthToDescendingRadixKey(-1.0));
});

test("radix input keeps exact count and original file-order IDs", () => {
  const input = createRadixDepthSortInput([0.25, 4.0, -1.0, 4.0, 2.5]);

  assert.equal(input.keySpace, GPU_RADIX_DEPTH_KEY_SPACE);
  assert.equal(input.keys.length, 5);
  assert.deepEqual([...input.indices], [0, 1, 2, 3, 4]);
});

test("prototype plan uses eight four-bit LSD passes for u32 keys", () => {
  const plan = createGpuRadixSortPrototypePlan(94_406);

  assert.equal(plan.count, 94_406);
  assert.equal(plan.bucketCount, GPU_RADIX_BUCKET_COUNT);
  assert.equal(plan.workgroupCount, 369);
  assert.equal(plan.histogramBins, 369 * GPU_RADIX_BUCKET_COUNT);
  assert.deepEqual(
    plan.passes.map((pass) => [pass.passIndex, pass.bitShift, pass.bitMask]),
    [
      [0, 0, 0x0f],
      [1, 4, 0x0f],
      [2, 8, 0x0f],
      [3, 12, 0x0f],
      [4, 16, 0x0f],
      [5, 20, 0x0f],
      [6, 24, 0x0f],
      [7, 28, 0x0f],
    ],
  );
});

test("simulated radix prototype returns original IDs back-to-front with stable ties", () => {
  assert.deepEqual([...simulateGpuRadixSortPrototype([0.25, 4.0, -1.0, 4.0, 2.5])], [1, 3, 4, 0, 2]);
  assert.deepEqual([...simulateGpuRadixSortPrototype([1.0, 1.0 + Number.EPSILON, 1.0, 0.0])], [0, 1, 2, 3]);
});

test("WGSL surfaces expose histogram, stable-rank, and scatter kernels", () => {
  assert.match(GPU_RADIX_HISTOGRAM_SHADER_WGSL, /@compute/);
  assert.match(GPU_RADIX_HISTOGRAM_SHADER_WGSL, /atomicAdd/);
  assert.match(GPU_RADIX_HISTOGRAM_SHADER_WGSL, /workgroup_id/);
  assert.match(GPU_RADIX_RANK_SHADER_WGSL, /@compute/);
  assert.match(GPU_RADIX_RANK_SHADER_WGSL, /bucketRanks/);
  assert.match(GPU_RADIX_SCATTER_SHADER_WGSL, /@compute/);
  assert.match(GPU_RADIX_SCATTER_SHADER_WGSL, /bucketOffsets/);
  assert.match(GPU_RADIX_SCATTER_SHADER_WGSL, /bucketRanks/);
  assert.match(GPU_RADIX_SCATTER_SHADER_WGSL, /indicesOut/);
});
