import assert from "node:assert/strict";
import test from "node:test";

import {
  REAL_SCANIVERSE_SMOKE_ASSET_PATH,
  composeFirstSmokeViewProjection,
  configureCameraForSplatBounds,
  createMeshSplatSmokeEvidence,
} from "../../node_modules/.cache/renderer-tests/src/realSmokeScene.js";

const attributes = {
  count: 3,
  sourceKind: "real_scaniverse_ply",
  positions: new Float32Array(9),
  colors: new Float32Array(9),
  opacities: new Float32Array(3),
  radii: new Float32Array(3),
  scales: new Float32Array(9),
  rotations: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
  originalIds: new Uint32Array([0, 1, 2]),
  bounds: {
    min: [-1, -2, -3],
    max: [3, 2, 1],
    center: [1, 0, -1],
    radius: 4,
  },
  layout: {
    strideBytes: 32,
    fields: [
      { name: "position", type: "float32", components: 3, byteOffset: 0 },
      { name: "color", type: "float32", components: 3, byteOffset: 12 },
      { name: "opacity", type: "float32", components: 1, byteOffset: 24 },
      { name: "radius", type: "float32", components: 1, byteOffset: 28 },
    ],
  },
};

test("real smoke evidence is closeable Scaniverse evidence, not synthetic harness evidence", () => {
  const evidence = createMeshSplatSmokeEvidence(attributes, new Uint32Array([2, 1, 0]));

  assert.equal(evidence.ready, true);
  assert.equal(evidence.sourceKind, "real_scaniverse_ply");
  assert.equal(evidence.realScaniverse, true);
  assert.equal(evidence.realSplatEvidence, true);
  assert.equal(evidence.synthetic, false);
  assert.equal(evidence.assetPath, REAL_SCANIVERSE_SMOKE_ASSET_PATH);
  assert.equal(evidence.splatCount, 3);
  assert.equal(evidence.sortedIdCount, 3);
});

test("real smoke camera framing targets the Scaniverse bounds", () => {
  const camera = {
    position: [0, 1, 3],
    target: [0, 0, 0],
    up: [0, 1, 0],
    fovY: Math.PI / 3,
    near: 0.01,
    far: 100,
    navigationScale: 1,
    azimuth: 1,
    elevation: 1,
    distance: 3,
    keys: new Set(),
    mouse: { down: false, lastX: 0, lastY: 0 },
  };

  configureCameraForSplatBounds(camera, attributes.bounds);

  assert.deepEqual(camera.target, attributes.bounds.center);
  assert.ok(camera.distance > attributes.bounds.radius);
  assert.equal(camera.navigationScale, attributes.bounds.radius);
  assert.ok(camera.near > 0);
  assert.ok(camera.far > camera.distance);
});

test("first-smoke presentation flips the viewer vertical axis", () => {
  const identity = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);

  assert.deepEqual(Array.from(composeFirstSmokeViewProjection(identity, identity)), [
    1, 0, 0, 0,
    0, -1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
});
