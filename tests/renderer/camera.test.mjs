import assert from "node:assert/strict";
import test from "node:test";

import {
  cameraMoveSpeed,
  computeWheelZoomDistance,
  createCamera,
  getViewMatrix,
  MAX_ORBIT_ELEVATION,
  panCamera,
  positionCameraFromTarget,
  rotateCameraView,
  screenPlaneOffset,
  updateCamera,
  zoomCameraExponential,
} from "../../node_modules/.cache/renderer-tests/src/camera.js";

test("exponential zoom feels uniform regardless of distance", () => {
  const cam = createCamera();
  cam.distance = 0.1;
  cam.navigationScale = 3;
  positionCameraFromTarget(cam);
  const nearBefore = cam.distance;
  zoomCameraExponential(cam, -100);
  const nearRatio = nearBefore / cam.distance;

  cam.distance = 50;
  positionCameraFromTarget(cam);
  const farBefore = cam.distance;
  zoomCameraExponential(cam, -100);
  const farRatio = farBefore / cam.distance;

  // Ratios should be identical for exponential zoom
  assert.ok(Math.abs(nearRatio - farRatio) < 0.001);
});

test("exponential zoom does not go below minimum distance", () => {
  const cam = createCamera();
  cam.distance = 0.01;
  cam.navigationScale = 1;
  positionCameraFromTarget(cam);

  for (let i = 0; i < 100; i++) {
    zoomCameraExponential(cam, 100);
  }
  assert.ok(cam.distance > 0);
  assert.ok(cam.distance >= 0.001);
});

test("computeWheelZoomDistance uses exponential scaling", () => {
  const near = computeWheelZoomDistance(0.05, -100, 3);
  const far = computeWheelZoomDistance(50, -100, 3);

  // Both should shrink by the same ratio
  const nearRatio = 0.05 / near;
  const farRatio = 50 / far;
  assert.ok(Math.abs(nearRatio - farRatio) < 0.001);
  assert.ok(near < 0.05);
  assert.ok(far < 50);
});

test("keyboard move speed scales with both scene scale and camera distance", () => {
  const cam = createCamera();
  cam.distance = 0.1;
  cam.navigationScale = 4;
  const slowSpeed = cameraMoveSpeed(cam);

  cam.distance = 10;
  const fastSpeed = cameraMoveSpeed(cam);

  assert.ok(fastSpeed > slowSpeed);
  assert.ok(slowSpeed >= 0.05);
});

test("view rotation stays away from the vertical pole singularity", () => {
  const cam = createCamera();
  cam.target = [0, 0, 0];
  cam.distance = 5;
  positionCameraFromTarget(cam);

  rotateCameraView(cam, 0, 100000);
  assert.equal(cam.elevation, MAX_ORBIT_ELEVATION);

  rotateCameraView(cam, 0, -200000);
  assert.equal(cam.elevation, -MAX_ORBIT_ELEVATION);
  assert.ok(MAX_ORBIT_ELEVATION < Math.PI / 2 - 0.01);
});

test("drag rotation orbits around the target (target stays fixed, position moves)", () => {
  const cam = createCamera();
  cam.target = [10, 2, -4];
  cam.azimuth = 0;
  cam.elevation = 0.2;
  cam.distance = 3;
  positionCameraFromTarget(cam);
  const beforeTarget = [...cam.target];
  const beforePosition = [...cam.position];

  rotateCameraView(cam, 120, -40);

  // Target stays fixed
  assert.deepEqual(
    cam.target.map((v) => Number(v.toFixed(6))),
    beforeTarget.map((v) => Number(v.toFixed(6)))
  );
  // Position changes
  assert.notDeepEqual(
    cam.position.map((v) => Number(v.toFixed(6))),
    beforePosition.map((v) => Number(v.toFixed(6)))
  );
});

test("pan translates both target and position equally", () => {
  const cam = createCamera();
  cam.target = [5, 1, -2];
  cam.azimuth = 0;
  cam.elevation = 0;
  cam.distance = 4;
  positionCameraFromTarget(cam);
  const beforeTarget = [...cam.target];
  const beforePosition = [...cam.position];
  const beforeDistance = cam.distance;

  panCamera(cam, 50, 30, 16 / 9);

  // Distance unchanged
  assert.equal(cam.distance, beforeDistance);
  // Both moved
  assert.notDeepEqual(
    cam.target.map((v) => Number(v.toFixed(4))),
    beforeTarget.map((v) => Number(v.toFixed(4)))
  );
  assert.notDeepEqual(
    cam.position.map((v) => Number(v.toFixed(4))),
    beforePosition.map((v) => Number(v.toFixed(4)))
  );
});

test("WASD moves the orbit pivot (target), keeping distance constant", () => {
  const cam = createCamera();
  cam.target = [0, 0, 0];
  cam.azimuth = 0;
  cam.elevation = 0;
  cam.distance = 5;
  cam.navigationScale = 1;
  positionCameraFromTarget(cam);
  const beforeTarget = [...cam.target];
  const beforeDistance = cam.distance;

  cam.keys.add("w");
  updateCamera(cam, 1);

  assert.equal(cam.distance, beforeDistance);
  assert.notDeepEqual(
    cam.target.map((v) => Number(v.toFixed(4))),
    beforeTarget.map((v) => Number(v.toFixed(4)))
  );
});

test("view matrix changes with azimuth rotation", () => {
  const cam = createCamera();
  cam.target = [0, 0, 0];
  cam.distance = 5;
  positionCameraFromTarget(cam);
  const before = Array.from(getViewMatrix(cam));

  rotateCameraView(cam, 100, 0);
  const after = Array.from(getViewMatrix(cam));

  assert.notDeepEqual(
    after.map((v) => Number(v.toFixed(4))),
    before.map((v) => Number(v.toFixed(4)))
  );
});
