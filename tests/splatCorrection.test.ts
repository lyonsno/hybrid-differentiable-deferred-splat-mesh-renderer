import assert from "node:assert/strict";
import test from "node:test";

import { FIRST_SMOKE_SPLAT_LAYOUT, type SplatAttributes } from "../src/splats.ts";
import { applySplatCorrectionToAttributes } from "../src/splatCorrection.ts";

test("explicit crop matrix is authoritative and does not reapply axis flips", () => {
  const attrs = makeAttributes([
    [1, 0, 0],
    [-1, 0, 0],
    [2, 0, 0],
  ]);

  const result = applySplatCorrectionToAttributes(attrs, {
    axisFlips: [-1, 1, 1],
    crop: {
      enabled: true,
      frame: "visual-root-local",
      sourceToCropMatrix: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ],
      min: [0.5, -0.5, -0.5],
      max: [1.5, 0.5, 0.5],
    },
  });

  assert.equal(result.cropAppliedByRenderer, true);
  assert.equal(result.cropFrame, "visual-root-local");
  assert.equal(result.sourceCount, 3);
  assert.equal(result.keptCount, 1);
  assert.deepEqual(Array.from(result.attributes.originalIds), [0]);
  assert.deepEqual(Array.from(result.attributes.positions), [1, 0, 0]);
});

test("crop matrix telemetry reports zero-survivor crops without pretending success", () => {
  const attrs = makeAttributes([
    [1, 0, 0],
    [2, 0, 0],
  ]);

  const result = applySplatCorrectionToAttributes(attrs, {
    crop: {
      enabled: true,
      frame: "visual-root-local",
      sourceToCropMatrix: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ],
      min: [10, 10, 10],
      max: [11, 11, 11],
    },
  });

  assert.equal(result.cropAppliedByRenderer, false);
  assert.equal(result.cropFrame, "visual-root-local");
  assert.equal(result.sourceCount, 2);
  assert.equal(result.keptCount, 0);
  assert.equal(result.attributes.count, 2);
  assert.equal(result.warning, "crop-filtered-all-splats");
});

function makeAttributes(points: Array<[number, number, number]>): SplatAttributes {
  const count = points.length;
  const positions = new Float32Array(points.flat());
  const colors = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const radii = new Float32Array(count);
  const scales = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 4);
  const originalIds = new Uint32Array(count);
  for (let index = 0; index < count; index += 1) {
    colors[index * 3] = 1;
    opacities[index] = 1;
    radii[index] = 1;
    rotations[index * 4] = 1;
    originalIds[index] = index;
  }
  return {
    count,
    sourceKind: "test",
    positions,
    colors,
    opacities,
    radii,
    scales,
    rotations,
    originalIds,
    bounds: {
      min: [Math.min(...points.map((point) => point[0])), Math.min(...points.map((point) => point[1])), Math.min(...points.map((point) => point[2]))],
      max: [Math.max(...points.map((point) => point[0])), Math.max(...points.map((point) => point[1])), Math.max(...points.map((point) => point[2]))],
      center: [0, 0, 0],
      radius: 1,
    },
    layout: FIRST_SMOKE_SPLAT_LAYOUT,
  };
}
