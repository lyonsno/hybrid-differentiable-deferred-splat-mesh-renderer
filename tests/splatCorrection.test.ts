import assert from "node:assert/strict";
import test from "node:test";

import { applySplatCorrectionToAttributes } from "../src/splatCorrection.ts";
import type { SplatAttributes } from "../src/splats.ts";

function attrsForPositions(positions: number[]): SplatAttributes {
  const count = positions.length / 3;
  return {
    sourceKind: "test",
    count,
    positions: new Float32Array(positions),
    colors: new Float32Array(count * 3),
    opacities: new Float32Array(count),
    radii: new Float32Array(count),
    scales: new Float32Array(count * 3),
    rotations: new Float32Array(count * 4),
    originalIds: new Uint32Array(Array.from({ length: count }, (_, index) => index)),
    bounds: {
      min: [0, 0, 0],
      max: [10, 10, 10],
      center: [5, 5, 5],
      radius: 10,
    },
  };
}

test("crop coordinate matrix filters raw overlay attributes into visual-root crop space", () => {
  const result = applySplatCorrectionToAttributes(attrsForPositions([
    0, 0, 0,
    5, 5, 5,
    10, 10, 10,
  ]), {
    crop: {
      enabled: true,
      min: [-0.1, -0.1, -0.1],
      max: [0.1, 0.1, 0.1],
      frame: "visual-root-local",
      sourceToCropMatrix: [
        0.2, 0, 0, 0,
        0, 0.2, 0, 0,
        0, 0, 0.2, 0,
        -1, -1, -1, 1,
      ],
    },
  });

  assert.equal(result.cropApplied, true);
  assert.equal(result.cropFrame, "visual-root-local");
  assert.equal(result.sourceCount, 3);
  assert.equal(result.keptCount, 1);
  assert.deepEqual(Array.from(result.attributes.originalIds), [1]);
});
