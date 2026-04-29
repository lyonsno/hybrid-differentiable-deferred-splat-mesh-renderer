import assert from "node:assert/strict";
import test from "node:test";

import {
  createAlphaDensityRefreshState,
  shouldRefreshAlphaDensity,
} from "../src/alphaDensityRefresh.ts";

function viewWithTranslation(x: number): Float32Array {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, 0, 0, 1,
  ]);
}

test("alpha density refresh waits for camera motion to settle", () => {
  const state = createAlphaDensityRefreshState(viewWithTranslation(0), 1280, 720);

  assert.equal(shouldRefreshAlphaDensity(state, viewWithTranslation(0.1), 1280, 720, 10, 160), false);
  assert.equal(shouldRefreshAlphaDensity(state, viewWithTranslation(0.2), 1280, 720, 90, 160), false);
  assert.equal(shouldRefreshAlphaDensity(state, viewWithTranslation(0.2), 1280, 720, 249, 160), false);
  assert.equal(shouldRefreshAlphaDensity(state, viewWithTranslation(0.2), 1280, 720, 250, 160), true);
  assert.equal(shouldRefreshAlphaDensity(state, viewWithTranslation(0.2), 1280, 720, 260, 160), false);
});

test("alpha density refresh treats viewport changes as settled work, not a per-frame loop", () => {
  const state = createAlphaDensityRefreshState(viewWithTranslation(0), 1280, 720);

  assert.equal(shouldRefreshAlphaDensity(state, viewWithTranslation(0), 1600, 900, 20, 160), false);
  assert.equal(shouldRefreshAlphaDensity(state, viewWithTranslation(0), 1600, 900, 179, 160), false);
  assert.equal(shouldRefreshAlphaDensity(state, viewWithTranslation(0), 1600, 900, 180, 160), true);
  assert.equal(shouldRefreshAlphaDensity(state, viewWithTranslation(0), 1600, 900, 190, 160), false);
});
