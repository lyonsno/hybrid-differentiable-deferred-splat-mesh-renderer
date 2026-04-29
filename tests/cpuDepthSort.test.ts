import assert from "node:assert/strict";
import test from "node:test";

import {
  createSplatSortRefreshState,
  refreshSplatSortForView,
  computeViewSpaceDepth,
  sortSplatIdsBackToFront,
} from "../src/splatSort.ts";

const identityView = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

test("sorts packed xyz positions back-to-front by view-space z", () => {
  const positions = new Float32Array([
    0, 0, -2,  // id 0: near
    0, 0, -9,  // id 1: farthest
    0, 0, -5,  // id 2: middle
    0, 0, -0.5, // id 3: nearest
  ]);

  const order = sortSplatIdsBackToFront(positions, identityView);

  assert.ok(order instanceof Uint32Array);
  assert.deepEqual(Array.from(order), [1, 2, 0, 3]);
});

test("uses the full column-major view matrix instead of raw world z", () => {
  const translatedView = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -5, 1,
  ]);
  const positions = new Float32Array([
    0, 0, 0,  // id 0: view z -5
    3, 2, 2,  // id 1: view z -3
    -1, 1, -4, // id 2: view z -9
  ]);

  assert.equal(computeViewSpaceDepth(positions, 0, translatedView), -5);
  assert.equal(computeViewSpaceDepth(positions, 1, translatedView), -3);
  assert.equal(computeViewSpaceDepth(positions, 2, translatedView), -9);

  assert.deepEqual(
    Array.from(sortSplatIdsBackToFront(positions, translatedView)),
    [2, 0, 1]
  );

  const xDepthView = new Float32Array([
    1, 0, 1, 0,
    0, 1, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 1,
  ]);
  const sameWorldZ = new Float32Array([
    -4, 0, 0, // id 0
    -1, 0, 0, // id 1
    -6, 0, 0, // id 2
  ]);

  assert.deepEqual(
    Array.from(sortSplatIdsBackToFront(sameWorldZ, xDepthView)),
    [2, 0, 1]
  );
});

test("keeps equal-depth splats in original file-order id order", () => {
  const positions = new Float32Array([
    0, 0, -4, // id 0
    0, 0, -6, // id 1
    1, 0, -4, // id 2
    2, 0, -4, // id 3
  ]);

  assert.deepEqual(
    Array.from(sortSplatIdsBackToFront(positions, identityView)),
    [1, 0, 2, 3]
  );
});

test("refreshes sorted ids when the camera depth direction changes", () => {
  const positions = new Float32Array([
    -1, 0, 0, // id 0
    1, 0, 0, // id 1
  ]);
  const xDepthView = new Float32Array([
    1, 0, 1, 0,
    0, 1, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 1,
  ]);
  const negXDepthView = new Float32Array([
    1, 0, -1, 0,
    0, 1, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 1,
  ]);

  const state = createSplatSortRefreshState(positions, xDepthView);

  assert.deepEqual(Array.from(state.sortedIds), [0, 1]);
  assert.equal(refreshSplatSortForView(positions, xDepthView, state), false);
  assert.equal(refreshSplatSortForView(positions, negXDepthView, state), true);
  assert.deepEqual(Array.from(state.sortedIds), [1, 0]);
});

test("does not refresh when only camera depth translation changes", () => {
  const positions = new Float32Array([
    0, 0, -2, // id 0
    0, 0, -5, // id 1
  ]);
  const initialView = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -1, 1,
  ]);
  const translatedView = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -8, 1,
  ]);

  const state = createSplatSortRefreshState(positions, initialView);

  assert.deepEqual(Array.from(state.sortedIds), [1, 0]);
  assert.equal(refreshSplatSortForView(positions, translatedView, state), false);
  assert.deepEqual(Array.from(state.sortedIds), [1, 0]);
});

test("throttles repeated refreshes for interactive CPU sorting", () => {
  const positions = new Float32Array([
    -1, 0, 0, // id 0
    1, 0, 0, // id 1
  ]);
  const xDepthView = new Float32Array([
    1, 0, 1, 0,
    0, 1, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 1,
  ]);
  const negXDepthView = new Float32Array([
    1, 0, -1, 0,
    0, 1, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 1,
  ]);

  const state = createSplatSortRefreshState(positions, xDepthView);

  assert.equal(
    refreshSplatSortForView(positions, negXDepthView, state, {
      minIntervalMs: 100,
      nowMs: 0,
    }),
    true
  );
  assert.deepEqual(Array.from(state.sortedIds), [1, 0]);

  assert.equal(
    refreshSplatSortForView(positions, xDepthView, state, {
      minIntervalMs: 100,
      nowMs: 50,
    }),
    false
  );
  assert.deepEqual(Array.from(state.sortedIds), [1, 0]);

  assert.equal(
    refreshSplatSortForView(positions, xDepthView, state, {
      minIntervalMs: 100,
      nowMs: 100,
    }),
    true
  );
  assert.deepEqual(Array.from(state.sortedIds), [0, 1]);
});

test("defers refreshes while camera depth direction is still settling", () => {
  const positions = new Float32Array([
    -1, 0, 0, // id 0
    1, 0, 0, // id 1
  ]);
  const xDepthView = new Float32Array([
    1, 0, 1, 0,
    0, 1, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 1,
  ]);
  const negXDepthView = new Float32Array([
    1, 0, -1, 0,
    0, 1, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 1,
  ]);

  const state = createSplatSortRefreshState(positions, xDepthView);

  assert.equal(
    refreshSplatSortForView(positions, negXDepthView, state, {
      settleMs: 150,
      nowMs: 1000,
    }),
    false
  );
  assert.deepEqual(Array.from(state.sortedIds), [0, 1]);

  assert.equal(
    refreshSplatSortForView(positions, negXDepthView, state, {
      settleMs: 150,
      nowMs: 1149,
    }),
    false
  );
  assert.deepEqual(Array.from(state.sortedIds), [0, 1]);

  assert.equal(
    refreshSplatSortForView(positions, negXDepthView, state, {
      settleMs: 150,
      nowMs: 1150,
    }),
    true
  );
  assert.deepEqual(Array.from(state.sortedIds), [1, 0]);
});

test("rejects malformed position and matrix inputs", () => {
  assert.throws(
    () => sortSplatIdsBackToFront(new Float32Array([0, 1]), identityView),
    /positions length must be a multiple of 3/
  );
  assert.throws(
    () => sortSplatIdsBackToFront(new Float32Array([0, 0, 0]), new Float32Array(15)),
    /view matrix must contain 16 values/
  );
});
