import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

const modulePath = process.env.GPU_SORT_MODULE || "/tmp/meshsplat-gpu-sort-prototype-test/gpuSortPrototype.js";
const gpuSort = await import(pathToFileURL(modulePath).href);

test("synthetic depth input pads to a power of two and preserves original IDs", () => {
  const input = gpuSort.createSyntheticDepthSortInput([0.25, 4.0, -1.0, 4.0, 2.5]);

  assert.deepEqual([...input.keys], [0.25, 4.0, -1.0, 4.0, 2.5, -Infinity, -Infinity, -Infinity]);
  assert.deepEqual([...input.indices], [0, 1, 2, 3, 4, 0xffffffff, 0xffffffff, 0xffffffff]);
});

test("prototype pass plan covers the padded bitonic network", () => {
  const plan = gpuSort.createGpuSortPrototypePlan(5);

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
  const sortedIds = gpuSort.simulateGpuSortPrototype([0.25, 4.0, -1.0, 4.0, 2.5]);

  assert.deepEqual([...sortedIds], [1, 3, 4, 0, 2]);
});

test("WGSL prototype sorts key/index storage pairs in compute", () => {
  assert.match(gpuSort.GPU_SORT_SHADER_WGSL, /@compute/);
  assert.match(gpuSort.GPU_SORT_SHADER_WGSL, /var<storage,\s*read_write>\s+keys/);
  assert.match(gpuSort.GPU_SORT_SHADER_WGSL, /var<storage,\s*read_write>\s+indices/);
  assert.match(gpuSort.GPU_SORT_SHADER_WGSL, /\^\s*params\.j/);
});
