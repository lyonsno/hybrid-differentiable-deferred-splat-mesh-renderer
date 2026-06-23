import assert from "node:assert/strict";
import test from "node:test";

import { composeOverlayFrameMatrices } from "../src/splatOverlayFrame.ts";

function mat4(values: number[]) {
  return new Float32Array(values);
}

function assertCloseArray(actual: Float32Array, expected: number[], epsilon = 1e-5) {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++) {
    assert.ok(
      Math.abs(actual[i] - expected[i]) <= epsilon,
      `value ${i}: expected ${expected[i]}, got ${actual[i]}`,
    );
  }
}

test("overlay frame applies the host model matrix to renderer view and camera space", () => {
  const hostView = mat4([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -10, 1,
  ]);
  const projection = mat4([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
  const model = mat4([
    2, 0, 0, 0,
    0, 3, 0, 0,
    0, 0, 4, 0,
    5, 6, 7, 1,
  ]);
  const cameraWorld = new Float32Array([5, 9, 15]);

  const frame = composeOverlayFrameMatrices(hostView, projection, cameraWorld, model);

  assert.deepEqual(Array.from(frame.viewMatrix), [
    2, 0, 0, 0,
    0, 3, 0, 0,
    0, 0, 4, 0,
    5, 6, -3, 1,
  ]);
  assertCloseArray(frame.cameraPosition, [0, 1, 2]);
  assert.notDeepEqual(Array.from(frame.viewMatrix), Array.from(hostView));
});
