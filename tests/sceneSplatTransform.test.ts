import assert from "node:assert/strict";
import test from "node:test";

import { transformSceneSplatAttributes, rotateAxisByQuaternionWxyz } from "../src/sceneSplatTransform.ts";
import type { SplatAttributes } from "../src/splats.ts";

test("scene splat transform applies model scale and rotation to Gaussian axes", () => {
  const attrs = fixtureAttributes({
    positions: [1, 2, 3],
    scales: [Math.log(2), Math.log(3), Math.log(4)],
    rotations: [1, 0, 0, 0],
    normals: [1, 0, 0],
  });
  const transform = new Float32Array([
    0, 0.5, 0, 0,
    -0.5, 0, 0, 0,
    0, 0, 0.5, 0,
    10, 20, 30, 1,
  ]);

  const transformed = transformSceneSplatAttributes(attrs, transform);

  assertVecAlmost(Array.from(transformed.positions), [9, 20.5, 31.5]);
  assertVecAlmost(Array.from(transformed.normals ?? []), [0, 1, 0]);
  assertVecAlmost(
    Array.from(transformed.scales).map(Math.exp),
    [1, 1.5, 2],
  );
  const rotatedX = rotateAxisByQuaternionWxyz(Array.from(transformed.rotations), [1, 0, 0]);
  assertVecAlmost(rotatedX, [0, 1, 0]);
});

function fixtureAttributes(fields: {
  positions: number[];
  scales: number[];
  rotations: number[];
  normals?: number[];
}): SplatAttributes {
  return {
    count: 1,
    sourceKind: "test",
    positions: new Float32Array(fields.positions),
    colors: new Float32Array([0, 0, 0]),
    opacities: new Float32Array([1]),
    radii: new Float32Array([1]),
    scales: new Float32Array(fields.scales),
    rotations: new Float32Array(fields.rotations),
    normals: fields.normals ? new Float32Array(fields.normals) : undefined,
    originalIds: new Uint32Array([0]),
    bounds: {
      min: [fields.positions[0], fields.positions[1], fields.positions[2]],
      max: [fields.positions[0], fields.positions[1], fields.positions[2]],
      center: [fields.positions[0], fields.positions[1], fields.positions[2]],
      radius: 0,
    },
    layout: { strideBytes: 0, fields: [] },
  };
}

function assertVecAlmost(actual: readonly number[], expected: readonly number[], epsilon = 1e-5) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    assert.ok(
      Math.abs(actual[index] - expected[index]) <= epsilon,
      `index ${index}: expected ${expected[index]}, got ${actual[index]}`,
    );
  }
}
