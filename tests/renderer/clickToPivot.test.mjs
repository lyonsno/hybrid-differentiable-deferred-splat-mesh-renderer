import assert from "node:assert/strict";
import test from "node:test";

import {
  findClickToPivotCandidate,
  reanchorOrbitTarget,
  handleDoubleClickPivot,
} from "../../node_modules/.cache/renderer-tests/src/clickToPivot.js";
import {
  createCamera,
  positionCameraFromTarget,
} from "../../node_modules/.cache/renderer-tests/src/camera.js";

function makeSplatAttributes(splats) {
  const count = splats.length;
  const positions = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const radii = new Float32Array(count);
  const scales = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 4);
  const colors = new Float32Array(count * 3);
  const originalIds = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    const s = splats[i];
    positions[i * 3] = s.x;
    positions[i * 3 + 1] = s.y;
    positions[i * 3 + 2] = s.z;
    opacities[i] = s.opacity ?? 0.9;
    radii[i] = s.radius ?? 0.01;
    originalIds[i] = i;
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
    bounds: { center: [0, 0, 0], min: [-1, -1, -1], max: [1, 1, 1], radius: 1 },
    layout: { kind: "interleaved", stride: 0, fields: [] },
  };
}

import { getViewMatrix, getProjectionMatrix } from "../../node_modules/.cache/renderer-tests/src/camera.js";

function multiplyMat4(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

function buildViewProj(cam, aspect) {
  const view = getViewMatrix(cam);
  const proj = getProjectionMatrix(cam, aspect);
  return multiplyMat4(proj, view);
}

test("selects a splat projected near the click coordinate", () => {
  const cam = createCamera();
  cam.target = [0, 0, 0];
  cam.azimuth = 0;
  cam.elevation = 0;
  cam.distance = 5;
  positionCameraFromTarget(cam);

  const viewportWidth = 800;
  const viewportHeight = 600;
  const viewProj = buildViewProj(cam, viewportWidth / viewportHeight);

  // Place a splat at the origin — should project to screen center
  const attributes = makeSplatAttributes([
    { x: 0, y: 0, z: 0, opacity: 0.9 },
  ]);

  const result = findClickToPivotCandidate(
    attributes,
    viewProj,
    viewportWidth,
    viewportHeight,
    { clickX: viewportWidth / 2, clickY: viewportHeight / 2, viewportWidth, viewportHeight }
  );

  assert.ok(result.candidate !== null, "should find a candidate");
  assert.equal(result.candidate.splatIndex, 0);
  assert.ok(result.candidate.screenDistancePx < 2, "should be very close to center");
});

test("rejects when no splat is within search radius", () => {
  const cam = createCamera();
  cam.target = [0, 0, 0];
  cam.azimuth = 0;
  cam.elevation = 0;
  cam.distance = 5;
  positionCameraFromTarget(cam);

  const viewportWidth = 800;
  const viewportHeight = 600;
  const viewProj = buildViewProj(cam, viewportWidth / viewportHeight);

  // Place splat far off to the side
  const attributes = makeSplatAttributes([
    { x: 100, y: 0, z: 0, opacity: 0.9 },
  ]);

  const result = findClickToPivotCandidate(
    attributes,
    viewProj,
    viewportWidth,
    viewportHeight,
    { clickX: viewportWidth / 2, clickY: viewportHeight / 2, viewportWidth, viewportHeight }
  );

  assert.equal(result.candidate, null, "should not find a candidate when splat is off-screen");
});

test("rejects splats below minimum opacity threshold", () => {
  const cam = createCamera();
  cam.target = [0, 0, 0];
  cam.azimuth = 0;
  cam.elevation = 0;
  cam.distance = 5;
  positionCameraFromTarget(cam);

  const viewportWidth = 800;
  const viewportHeight = 600;
  const viewProj = buildViewProj(cam, viewportWidth / viewportHeight);

  const attributes = makeSplatAttributes([
    { x: 0, y: 0, z: 0, opacity: 0.01 },
  ]);

  const result = findClickToPivotCandidate(
    attributes,
    viewProj,
    viewportWidth,
    viewportHeight,
    { clickX: viewportWidth / 2, clickY: viewportHeight / 2, viewportWidth, viewportHeight }
  );

  assert.equal(result.candidate, null, "should reject near-transparent splat");
});

test("prefers nearer and more opaque splat under overlap", () => {
  const cam = createCamera();
  cam.target = [0, 0, 0];
  cam.azimuth = 0;
  cam.elevation = 0;
  cam.distance = 5;
  positionCameraFromTarget(cam);

  const viewportWidth = 800;
  const viewportHeight = 600;
  const viewProj = buildViewProj(cam, viewportWidth / viewportHeight);

  // Two splats at same screen position: one near+opaque, one far+dim
  const attributes = makeSplatAttributes([
    { x: 0, y: 0, z: -1, opacity: 0.95 },  // nearer to camera (cam is at z=5 looking -z)
    { x: 0, y: 0, z: 1, opacity: 0.3 },    // farther
  ]);

  const result = findClickToPivotCandidate(
    attributes,
    viewProj,
    viewportWidth,
    viewportHeight,
    { clickX: viewportWidth / 2, clickY: viewportHeight / 2, viewportWidth, viewportHeight }
  );

  assert.ok(result.candidate !== null);
  assert.equal(result.candidate.splatIndex, 0, "should prefer the nearer, more opaque splat");
});

test("reanchorOrbitTarget sets target and clears panOffset", () => {
  const cam = createCamera();
  cam.target = [1, 2, 3];
  cam.panOffset = [0.5, -0.3, 0.1];
  cam.azimuth = 0.5;
  cam.elevation = 0.2;
  cam.distance = 4;
  positionCameraFromTarget(cam);

  const newTarget = [5, 6, 7];
  reanchorOrbitTarget(cam, newTarget);

  assert.deepEqual(cam.target, [5, 6, 7]);
  assert.deepEqual(cam.panOffset, [0, 0, 0]);
  // Distance and angles preserved
  assert.equal(cam.distance, 4);
  assert.equal(cam.azimuth, 0.5);
  assert.equal(cam.elevation, 0.2);
});

test("handleDoubleClickPivot reanchors camera when candidate found", () => {
  const cam = createCamera();
  cam.target = [0, 0, 0];
  cam.panOffset = [0.2, -0.1, 0.05];
  cam.azimuth = 0;
  cam.elevation = 0;
  cam.distance = 5;
  positionCameraFromTarget(cam);

  const viewportWidth = 800;
  const viewportHeight = 600;

  const attributes = makeSplatAttributes([
    { x: 0, y: 0, z: 0, opacity: 0.9 },
  ]);

  const result = handleDoubleClickPivot(
    cam,
    attributes,
    viewportWidth / 2,
    viewportHeight / 2,
    viewportWidth,
    viewportHeight
  );

  assert.ok(result.candidate !== null);
  assert.deepEqual(cam.target, [0, 0, 0]);
  assert.deepEqual(cam.panOffset, [0, 0, 0], "panOffset should be cleared after reanchor");
});

test("handleDoubleClickPivot does not mutate camera on miss", () => {
  const cam = createCamera();
  cam.target = [1, 2, 3];
  cam.panOffset = [0.5, -0.3, 0.1];
  cam.azimuth = 0.7;
  cam.elevation = 0.2;
  cam.distance = 8;
  positionCameraFromTarget(cam);
  const beforeTarget = [...cam.target];
  const beforePan = [...cam.panOffset];
  const beforeDistance = cam.distance;

  const viewportWidth = 800;
  const viewportHeight = 600;

  // No splats anywhere near the click
  const attributes = makeSplatAttributes([
    { x: 500, y: 500, z: 500, opacity: 0.9 },
  ]);

  const result = handleDoubleClickPivot(
    cam,
    attributes,
    viewportWidth / 2,
    viewportHeight / 2,
    viewportWidth,
    viewportHeight
  );

  assert.equal(result.candidate, null);
  assert.deepEqual(cam.target, beforeTarget);
  assert.deepEqual([...cam.panOffset], beforePan);
  assert.equal(cam.distance, beforeDistance);
});
