import assert from "node:assert/strict";
import test from "node:test";

import { composeOverlayFrameMatrices } from "../src/splatOverlayFrame.ts";

const IDENTITY = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

const VERTICAL_FLIP = new Float32Array([
  1, 0, 0, 0,
  0, -1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

test("overlay composes host model matrix into renderer frame matrices", () => {
  const view = new Float32Array(IDENTITY);
  const projection = new Float32Array(IDENTITY);
  const model = new Float32Array([
    2, 0, 0, 0,
    0, 2, 0, 0,
    0, 0, 2, 0,
    10, 20, 30, 1,
  ]);
  const cameraWorld = new Float32Array([12, 24, 36]);

  const frame = composeOverlayFrameMatrices(view, projection, model, cameraWorld);

  assert.deepEqual(Array.from(frame.viewMatrix), Array.from(model));
  assert.deepEqual(Array.from(frame.lightingViewMatrix), Array.from(view));
  assert.deepEqual(Array.from(frame.viewProj), Array.from(multiplyMat4(VERTICAL_FLIP, model)));
  assert.deepEqual(Array.from(frame.lightingViewProj), Array.from(VERTICAL_FLIP));
  assert.deepEqual(Array.from(frame.cameraPosition), [1, 2, 3]);
  assert.deepEqual(Array.from(frame.lightingCameraPosition), [12, 24, 36]);
  assert.deepEqual(Array.from(frame.normalMatrix), [
    0.5, 0, 0,
    0, 0.5, 0,
    0, 0, 0.5,
  ]);
});

function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      out[column * 4 + row] =
        a[0 * 4 + row] * b[column * 4 + 0] +
        a[1 * 4 + row] * b[column * 4 + 1] +
        a[2 * 4 + row] * b[column * 4 + 2] +
        a[3 * 4 + row] * b[column * 4 + 3];
    }
  }
  return out;
}
