import assert from "node:assert/strict";
import test from "node:test";

import {
  GPU_SORT_PADDED_INDEX_SENTINEL,
  GPU_SORT_SHADER_WGSL,
  createGpuSortPrototypePlan,
  createSyntheticDepthSortInput,
  createViewDepthSortInput,
  simulateGpuSortPrototype,
  simulateGpuViewDepthSortPrototype,
} from "../src/gpuSortPrototype.ts";

test("synthetic depth input pads to a power of two and preserves original IDs", () => {
  const input = createSyntheticDepthSortInput([0.25, 4.0, -1.0, 4.0, 2.5]);

  assert.deepEqual([...input.keys], [0.25, 4.0, -1.0, 4.0, 2.5, -Infinity, -Infinity, -Infinity]);
  assert.deepEqual([...input.indices], [0, 1, 2, 3, 4, GPU_SORT_PADDED_INDEX_SENTINEL, GPU_SORT_PADDED_INDEX_SENTINEL, GPU_SORT_PADDED_INDEX_SENTINEL]);
});

test("prototype pass plan covers the padded bitonic network", () => {
  const plan = createGpuSortPrototypePlan(5);

  assert.equal(plan.count, 5);
  assert.equal(plan.paddedCount, 8);
  assert.equal(plan.dispatchWorkgroups, 1);
  assert.deepEqual(
    plan.passes.map((pass) => [pass.k, pass.j]),
    [
      [2, 1],
      [4, 2],
      [4, 1],
      [8, 4],
      [8, 2],
      [8, 1],
    ],
  );
});

test("simulated GPU network returns original IDs back-to-front with stable ties", () => {
  const sortedIds = simulateGpuSortPrototype([0.25, 4.0, -1.0, 4.0, 2.5]);

  assert.deepEqual([...sortedIds], [1, 3, 4, 0, 2]);
});

test("view-depth adapter matches CPU back-to-front order for column-major view matrices", () => {
  const translatedView = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -5, 1,
  ]);
  const positions = new Float32Array([
    0, 0, 0,
    3, 2, 2,
    -1, 1, -4,
  ]);

  const input = createViewDepthSortInput(positions, translatedView);

  assert.deepEqual([...input.keys], [5, 3, 9, -Infinity]);
  assert.deepEqual([...simulateGpuViewDepthSortPrototype(positions, translatedView)], [2, 0, 1]);
});

test("WGSL prototype sorts key/index storage pairs in compute", () => {
  assert.match(GPU_SORT_SHADER_WGSL, /@compute/);
  assert.match(GPU_SORT_SHADER_WGSL, /var<storage,\s*read_write>\s+keys/);
  assert.match(GPU_SORT_SHADER_WGSL, /var<storage,\s*read_write>\s+indices/);
  assert.match(GPU_SORT_SHADER_WGSL, /\^\s*params\.j/);
});
