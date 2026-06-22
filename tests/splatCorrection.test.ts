import assert from "node:assert/strict";
import test from "node:test";

import { applySplatCorrectionToAttributes } from "../src/splatCorrection.ts";
import type { SplatAttributes } from "../src/splats.ts";

test("sidecar crop filters splats in axis-flipped asset coordinates without moving raw positions", () => {
  const source = makeAttributes([
    [1, 0, 0],
    [-1, 0, 0],
    [2, 0, 0],
  ]);

  const result = applySplatCorrectionToAttributes(source, {
    axisFlips: [true, false, false],
    centroidOffset: [10, 0, 0],
    crop: {
      enabled: true,
      min: [-1.2, -0.1, -0.1],
      max: [-0.8, 0.1, 0.1],
    },
  });

  assert.equal(result.cropApplied, true);
  assert.equal(result.cropFrame, "axis-flipped-asset");
  assert.equal(result.sourceCount, 3);
  assert.equal(result.attributes.count, 1);
  assert.deepEqual(Array.from(result.attributes.originalIds), [0]);
  assert.deepEqual(Array.from(result.attributes.positions), [1, 0, 0]);
  assert.deepEqual(Array.from(result.attributes.colors), [1, 0, 0]);
  assert.deepEqual(Array.from(result.attributes.opacities), [0.25]);
});

test("sidecar crop uses legacy pivot-local-minus-centroid fallback only when canonical crop is empty", () => {
  const source = makeAttributes([
    [0.5, 0, 0],
    [1.5, 0, 0],
  ]);

  const result = applySplatCorrectionToAttributes(source, {
    axisFlips: [false, false, false],
    centroidOffset: [0.5, 0, 0],
    crop: {
      enabled: true,
      min: [-0.1, -0.1, -0.1],
      max: [0.1, 0.1, 0.1],
    },
  });

  assert.equal(result.cropApplied, true);
  assert.equal(result.cropFrame, "pivot-local-minus-centroid");
  assert.equal(result.sourceCount, 2);
  assert.equal(result.attributes.count, 1);
  assert.deepEqual(Array.from(result.attributes.originalIds), [0]);
  assert.deepEqual(Array.from(result.attributes.positions), [0.5, 0, 0]);
});

test("sidecar crop can evaluate raw splats in a supplied preview-normalized crop frame", () => {
  const source = makeAttributes([
    [10, 0, 0],
    [20, 0, 0],
    [10, 3, 0],
  ]);

  const result = applySplatCorrectionToAttributes(source, {
    cropCoordinateMatrix: [
      0.1, 0, 0, 0,
      0, 0.1, 0, 0,
      0, 0, 0.1, 0,
      -0.5, 0, 0, 1,
    ],
    axisFlips: [false, false, false],
    crop: {
      enabled: true,
      min: [0.49, -0.01, -0.01],
      max: [0.51, 0.01, 0.01],
    },
  });

  assert.equal(result.cropApplied, true);
  assert.equal(result.cropFrame, "axis-flipped-asset");
  assert.equal(result.sourceCount, 3);
  assert.equal(result.keptCount, 1);
  assert.deepEqual(Array.from(result.attributes.originalIds), [0]);
  assert.deepEqual(Array.from(result.attributes.positions), [10, 0, 0]);
});

test("visual-root crop matrix is authoritative and does not reapply sidecar axis flips", () => {
  const source = makeAttributes([
    [10, 0, 1],
    [10, 0, -1],
  ]);

  const result = applySplatCorrectionToAttributes(source, {
    cropCoordinateFrame: "visual-root-local",
    cropCoordinateMatrix: [
      0.1, 0, 0, 0,
      0, 0.1, 0, 0,
      0, 0, 1, 0,
      -1, 0, 0, 1,
    ],
    axisFlips: [false, false, true],
    crop: {
      enabled: true,
      min: [-0.01, -0.01, 0.9],
      max: [0.01, 0.01, 1.1],
    },
  });

  assert.equal(result.cropApplied, true);
  assert.equal(result.cropFrame, "visual-root-local");
  assert.equal(result.sourceCount, 2);
  assert.equal(result.keptCount, 1);
  assert.deepEqual(Array.from(result.attributes.originalIds), [0]);
  assert.deepEqual(Array.from(result.attributes.positions), [10, 0, 1]);
});

function makeAttributes(positions: Array<[number, number, number]>): SplatAttributes {
  const count = positions.length;
  return {
    count,
    sourceKind: "test_splat",
    positions: new Float32Array(positions.flat()),
    colors: new Float32Array(positions.flatMap((_, index) => index === 0 ? [1, 0, 0] : [0, 1, 0])),
    opacities: new Float32Array(positions.map((_, index) => 0.25 + index * 0.25)),
    radii: new Float32Array(positions.map((_, index) => 0.1 + index * 0.1)),
    scales: new Float32Array(positions.flatMap((_, index) => [index, index + 0.1, index + 0.2])),
    rotations: new Float32Array(positions.flatMap(() => [1, 0, 0, 0])),
    normals: new Float32Array(positions.flatMap(() => [0, 1, 0])),
    roughness: new Float32Array(positions.map(() => 0.7)),
    metalness: new Float32Array(positions.map(() => 0.2)),
    originalIds: new Uint32Array(positions.map((_, index) => index)),
    bounds: boundsForPositions(positions),
    layout: {
      strideBytes: 32,
      fields: [
        { name: "position", type: "float32", components: 3, byteOffset: 0 },
        { name: "color", type: "float32", components: 3, byteOffset: 12 },
        { name: "opacity", type: "float32", components: 1, byteOffset: 24 },
        { name: "radius", type: "float32", components: 1, byteOffset: 28 },
      ],
    },
    splatScale: 1.25,
  };
}

function boundsForPositions(positions: Array<[number, number, number]>) {
  const min = [
    Math.min(...positions.map(position => position[0])),
    Math.min(...positions.map(position => position[1])),
    Math.min(...positions.map(position => position[2])),
  ] as [number, number, number];
  const max = [
    Math.max(...positions.map(position => position[0])),
    Math.max(...positions.map(position => position[1])),
    Math.max(...positions.map(position => position[2])),
  ] as [number, number, number];
  const center = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ] as [number, number, number];
  const radius = Math.max(
    ...positions.map(position => Math.hypot(position[0] - center[0], position[1] - center[1], position[2] - center[2])),
    1e-6,
  );
  return { min, max, center, radius };
}
