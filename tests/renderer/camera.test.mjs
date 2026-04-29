import assert from "node:assert/strict";
import test from "node:test";

import {
  cameraMoveSpeed,
  computeWheelZoomDistance,
  createCamera,
  MAX_ORBIT_ELEVATION,
  rotateCameraView,
  screenPlaneOffset,
  updateCamera,
  zoomCameraToCursorProjection,
} from "../../node_modules/.cache/renderer-tests/src/camera.js";

test("wheel zoom keeps the cursor-projected target-plane point fixed", () => {
  const cam = createCamera();
  cam.target = [10, 2, -4];
  cam.azimuth = 0;
  cam.elevation = 0;
  cam.distance = 10;
  updateCamera(cam, 0);

  const ndcX = 0.5;
  const ndcY = -0.25;
  const aspect = 16 / 9;
  const beforeOffset = screenPlaneOffset(cam, ndcX, ndcY, aspect);
  const beforePoint = [
    cam.target[0] + beforeOffset[0],
    cam.target[1] + beforeOffset[1],
    cam.target[2] + beforeOffset[2],
  ];

  zoomCameraToCursorProjection(cam, ndcX, ndcY, aspect, -100);

  const afterOffset = screenPlaneOffset(cam, ndcX, ndcY, aspect);
  const afterPoint = [
    cam.target[0] + afterOffset[0],
    cam.target[1] + afterOffset[1],
    cam.target[2] + afterOffset[2],
  ];
  assert.ok(cam.distance < 10);
  assert.deepEqual(
    afterPoint.map((value) => Number(value.toFixed(6))),
    beforePoint.map((value) => Number(value.toFixed(6)))
  );
});

test("wheel zoom has an additive floor so close range does not turn sludgy", () => {
  const near = computeWheelZoomDistance(0.05, -100, 3);
  const nearStep = 0.05 - near;
  const far = computeWheelZoomDistance(50, -100, 3);
  const farStep = 50 - far;

  assert.ok(nearStep > 0.05 * 0.5);
  assert.ok(farStep > nearStep);
});

test("keyboard move speed scales with both scene scale and camera distance", () => {
  const cam = createCamera();
  cam.distance = 0.1;
  cam.navigationScale = 4;
  assert.equal(cameraMoveSpeed(cam), 1.4);

  cam.distance = 10;
  assert.equal(cameraMoveSpeed(cam), 6.5);
});

test("view rotation stays away from the vertical pole singularity", () => {
  const cam = createCamera();

  rotateCameraView(cam, 0, 100000);
  assert.equal(cam.elevation, MAX_ORBIT_ELEVATION);

  rotateCameraView(cam, 0, -200000);
  assert.equal(cam.elevation, -MAX_ORBIT_ELEVATION);
  assert.ok(MAX_ORBIT_ELEVATION < Math.PI / 2 - 0.1);
});

test("drag rotation pivots the view around the camera position, not a scene target", () => {
  const cam = createCamera();
  cam.target = [10, 2, -4];
  cam.azimuth = 0;
  cam.elevation = 0.2;
  cam.distance = 3;
  updateCamera(cam, 0);
  const beforePosition = [...cam.position];
  const beforeTarget = [...cam.target];

  rotateCameraView(cam, 120, -40);
  updateCamera(cam, 0);

  assert.deepEqual(
    cam.position.map((value) => Number(value.toFixed(6))),
    beforePosition.map((value) => Number(value.toFixed(6)))
  );
  assert.notDeepEqual(
    cam.target.map((value) => Number(value.toFixed(6))),
    beforeTarget.map((value) => Number(value.toFixed(6)))
  );
});

test("keyboard movement moves the camera through its own frame", () => {
  const cam = createCamera();
  cam.azimuth = 0;
  cam.elevation = Math.PI / 4;
  cam.distance = 2;
  cam.navigationScale = 1;
  updateCamera(cam, 0);
  const beforePosition = [...cam.position];
  cam.keys.add("w");

  updateCamera(cam, 1);

  assert.ok(cam.position[1] < beforePosition[1] - 0.45);
  assert.ok(cam.position[2] < beforePosition[2] - 0.45);
});
