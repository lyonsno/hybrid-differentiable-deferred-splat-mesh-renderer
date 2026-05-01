import assert from "node:assert/strict";
import test from "node:test";

import {
  GPU_ORDERING_RANKS_SHADER_WGSL,
  createGpuOrderingRanksPlan,
  simulateOrderingRanksFromSortedIndices,
} from "../src/gpuOrderingRanks.ts";

test("GPU ordering rank pass inverts sorted splat indices into per-splat ranks", () => {
  const ranks = simulateOrderingRanksFromSortedIndices(Uint32Array.of(4, 2, 0, 3, 1), 5);

  assert.deepEqual([...ranks], [2, 4, 1, 3, 0]);
});

test("GPU ordering rank pass ignores padded sentinel indices", () => {
  const ranks = simulateOrderingRanksFromSortedIndices(Uint32Array.of(2, 0, 0xffffffff, 1), 3);

  assert.deepEqual([...ranks], [1, 3, 0]);
});

test("GPU ordering rank pass dispatches one thread per padded sorted index", () => {
  const plan = createGpuOrderingRanksPlan({ splatCount: 5, sortedIndexCount: 257 });

  assert.deepEqual(plan, {
    splatCount: 5,
    sortedIndexCount: 257,
    dispatchWorkgroups: 3,
  });
});

test("GPU ordering rank shader writes ordering ranks without CPU depth sorting", () => {
  assert.match(GPU_ORDERING_RANKS_SHADER_WGSL, /var<storage,\s*read>\s+sortedIndices/);
  assert.match(GPU_ORDERING_RANKS_SHADER_WGSL, /var<storage,\s*read_write>\s+orderingRanks/);
  assert.match(GPU_ORDERING_RANKS_SHADER_WGSL, /orderingRanks\[splatId\]\s*=\s*rank/);
});
