import { mat4, vec3 } from "./math.js";

export const ORBIT_RADIANS_PER_PIXEL = 0.005;
export const MAX_ORBIT_ELEVATION = Math.PI * 0.48;
export const ZOOM_FACTOR_PER_WHEEL_UNIT = 0.12;
export const MIN_DISTANCE_FRACTION = 0.002;

export interface Camera {
  position: vec3;
  target: vec3;
  panOffset: vec3;
  up: vec3;
  fovY: number;
  near: number;
  far: number;
  navigationScale: number;
  // Orbit state
  azimuth: number;
  elevation: number;
  distance: number;
  // Input state
  keys: Set<string>;
  mouse: { down: boolean; button: number; lastX: number; lastY: number; shiftKey: boolean };
}

export function createCamera(): Camera {
  return {
    position: [0, 1, 3],
    target: [0, 0, 0],
    panOffset: [0, 0, 0],
    up: [0, 1, 0],
    fovY: Math.PI / 3,
    near: 0.01,
    far: 100,
    navigationScale: 1,
    azimuth: 0,
    elevation: 0.3,
    distance: 3,
    keys: new Set(),
    mouse: { down: false, button: 0, lastX: 0, lastY: 0, shiftKey: false },
  };
}

export function bindCameraControls(
  cam: Camera,
  canvas: HTMLCanvasElement,
  requestRender: () => void = () => {}
) {
  canvas.addEventListener("mousedown", (e) => {
    cam.mouse.down = true;
    cam.mouse.button = e.button;
    cam.mouse.lastX = e.clientX;
    cam.mouse.lastY = e.clientY;
    cam.mouse.shiftKey = e.shiftKey;
    requestRender();
  });

  window.addEventListener("mouseup", () => {
    cam.mouse.down = false;
    requestRender();
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!cam.mouse.down) return;
    const dx = e.clientX - cam.mouse.lastX;
    const dy = e.clientY - cam.mouse.lastY;
    cam.mouse.lastX = e.clientX;
    cam.mouse.lastY = e.clientY;
    const isPan = cam.mouse.button === 1 || cam.mouse.shiftKey || e.shiftKey;
    if (isPan) {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || canvas.clientWidth || 1;
      const height = rect.height || canvas.clientHeight || 1;
      panCamera(cam, dx, dy, width, height);
    } else {
      rotateCameraView(cam, dx, dy);
    }
    requestRender();
  });

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || canvas.clientWidth || 1;
      const height = rect.height || canvas.clientHeight || 1;
      const ndcX = ((e.clientX - rect.left) / width) * 2 - 1;
      const ndcY = 1 - ((e.clientY - rect.top) / height) * 2;
      zoomCameraToCursorProjection(cam, ndcX, ndcY, width / height, e.deltaY);
      requestRender();
    },
    { passive: false }
  );

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  window.addEventListener("keydown", (e) => {
    cam.keys.add(e.key.toLowerCase());
    requestRender();
  });
  window.addEventListener("keyup", (e) => {
    cam.keys.delete(e.key.toLowerCase());
    requestRender();
  });
}

export function updateCamera(cam: Camera, dt: number) {
  const speed = cameraMoveSpeed(cam) * dt;
  const { right, trueUp, forward } = cameraBasis(cam);
  let moved = false;

  // WASD/QE translate the target (orbit pivot) so orbit stays coherent
  if (cam.keys.has("w")) {
    translateTarget(cam, forward, speed);
    moved = true;
  }
  if (cam.keys.has("s")) {
    translateTarget(cam, forward, -speed);
    moved = true;
  }
  if (cam.keys.has("a")) {
    translateTarget(cam, right, -speed);
    moved = true;
  }
  if (cam.keys.has("d")) {
    translateTarget(cam, right, speed);
    moved = true;
  }
  if (cam.keys.has("q")) {
    translateTarget(cam, trueUp, -speed);
    moved = true;
  }
  if (cam.keys.has("e")) {
    translateTarget(cam, trueUp, speed);
    moved = true;
  }

  if (moved) {
    positionCameraFromTarget(cam);
  }
}

export function cameraHasActiveInput(cam: Camera): boolean {
  return cam.mouse.down || cam.keys.size > 0;
}

export function positionCameraFromTarget(cam: Camera): void {
  const panOffset = ensurePanOffset(cam);
  const back = cameraBackVector(cam);
  cam.position = [
    cam.target[0] + panOffset[0] + back[0] * cam.distance,
    cam.target[1] + panOffset[1] + back[1] * cam.distance,
    cam.target[2] + panOffset[2] + back[2] * cam.distance,
  ];
}

export function rotateCameraView(cam: Camera, dx: number, dy: number): void {
  cam.azimuth -= dx * ORBIT_RADIANS_PER_PIXEL;
  cam.elevation = clamp(
    cam.elevation + dy * ORBIT_RADIANS_PER_PIXEL,
    -MAX_ORBIT_ELEVATION,
    MAX_ORBIT_ELEVATION
  );
  positionCameraFromTarget(cam);
}

export function panCamera(cam: Camera, dx: number, dy: number, viewportWidth: number, viewportHeight: number): void {
  const { right, trueUp } = cameraBasis(cam);
  const width = Math.max(Number.isFinite(viewportWidth) ? viewportWidth : 1, 1);
  const height = Math.max(Number.isFinite(viewportHeight) ? viewportHeight : 1, 1);
  const aspect = width / height;
  const halfHeight = cam.distance * Math.tan(cam.fovY / 2);
  const halfWidth = halfHeight * aspect;
  const panX = -(dx / width) * halfWidth * 2;
  const panY = (dy / height) * halfHeight * 2;
  const panOffset = ensurePanOffset(cam);
  panOffset[0] += right[0] * panX + trueUp[0] * panY;
  panOffset[1] += right[1] * panX + trueUp[1] * panY;
  panOffset[2] += right[2] * panX + trueUp[2] * panY;
  positionCameraFromTarget(cam);
}

export function zoomCameraExponential(cam: Camera, deltaY: number): void {
  if (!Number.isFinite(deltaY) || deltaY === 0) return;
  const wheelUnits = clamp(deltaY / 100, -5, 5);
  const factor = Math.exp(wheelUnits * ZOOM_FACTOR_PER_WHEEL_UNIT);
  const minDistance = Math.max(0.001, cam.navigationScale * MIN_DISTANCE_FRACTION);
  cam.distance = Math.max(minDistance, cam.distance * factor);
  positionCameraFromTarget(cam);
}

export function zoomCameraToCursorProjection(
  cam: Camera,
  ndcX: number,
  ndcY: number,
  aspect: number,
  deltaY: number
): void {
  if (!Number.isFinite(deltaY) || deltaY === 0) return;
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new RangeError("camera aspect must be a positive finite number");
  }

  const oldDistance = cam.distance;
  const newDistance = computeWheelZoomDistance(cam.distance, deltaY, cam.navigationScale);
  if (newDistance === oldDistance) return;

  const oldCursorOffset = screenPlaneOffset(cam, ndcX, ndcY, aspect, oldDistance);
  const newCursorOffset = screenPlaneOffset(cam, ndcX, ndcY, aspect, newDistance);
  const panOffset = ensurePanOffset(cam);
  panOffset[0] += oldCursorOffset[0] - newCursorOffset[0];
  panOffset[1] += oldCursorOffset[1] - newCursorOffset[1];
  panOffset[2] += oldCursorOffset[2] - newCursorOffset[2];
  cam.distance = newDistance;
  positionCameraFromTarget(cam);
}

export function computeWheelZoomDistance(
  distance: number,
  deltaY: number,
  navigationScale = 1
): number {
  if (!Number.isFinite(distance) || distance <= 0) {
    throw new RangeError("camera distance must be a positive finite number");
  }
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return distance;
  }
  const wheelUnits = clamp(deltaY / 100, -5, 5);
  const factor = Math.exp(wheelUnits * ZOOM_FACTOR_PER_WHEEL_UNIT);
  const minDistance = Math.max(0.001, Math.max(navigationScale, 0.001) * MIN_DISTANCE_FRACTION);
  return Math.max(minDistance, distance * factor);
}

export function cameraMoveSpeed(cam: Camera): number {
  return Math.max(0.05, cam.distance * 0.5, cam.navigationScale * 0.25);
}

export function screenPlaneOffset(
  cam: Camera,
  ndcX: number,
  ndcY: number,
  aspect: number,
  distance = cam.distance
): vec3 {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new RangeError("camera aspect must be a positive finite number");
  }

  const { right, trueUp } = cameraBasis(cam);
  const halfHeight = distance * Math.tan(cam.fovY / 2);
  const halfWidth = halfHeight * aspect;
  const x = ndcX * halfWidth;
  const y = ndcY * halfHeight;
  return [
    right[0] * x + trueUp[0] * y,
    right[1] * x + trueUp[1] * y,
    right[2] * x + trueUp[2] * y,
  ];
}

export function cameraBasis(cam: Camera): { forward: vec3; right: vec3; trueUp: vec3 } {
  const back = cameraBackVector(cam);
  const forward: vec3 = [-back[0], -back[1], -back[2]];
  const right: vec3 = [Math.cos(cam.azimuth), 0, -Math.sin(cam.azimuth)];
  const trueUp: vec3 = [
    back[1] * right[2] - back[2] * right[1],
    back[2] * right[0] - back[0] * right[2],
    back[0] * right[1] - back[1] * right[0],
  ];
  return { forward, right, trueUp };
}

function translateTarget(cam: Camera, axis: vec3, amount: number): void {
  cam.target[0] += axis[0] * amount;
  cam.target[1] += axis[1] * amount;
  cam.target[2] += axis[2] * amount;
}

function ensurePanOffset(cam: Camera): vec3 {
  if (!cam.panOffset) {
    cam.panOffset = [0, 0, 0];
  }
  return cam.panOffset;
}

function cameraBackVector(cam: Camera): vec3 {
  const cosEl = Math.cos(cam.elevation);
  return [
    cosEl * Math.sin(cam.azimuth),
    Math.sin(cam.elevation),
    cosEl * Math.cos(cam.azimuth),
  ];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getViewMatrix(cam: Camera): mat4 {
  return viewMatrixFromPose(cam);
}

export function getProjectionMatrix(
  cam: Camera,
  aspect: number
): mat4 {
  return perspective(cam.fovY, aspect, cam.near, cam.far);
}

function viewMatrixFromPose(cam: Camera): mat4 {
  const eye = cam.position;
  const { right, trueUp } = cameraBasis(cam);
  const fz = cameraBackVector(cam);

  return new Float32Array([
    right[0], trueUp[0], fz[0], 0,
    right[1], trueUp[1], fz[1], 0,
    right[2], trueUp[2], fz[2], 0,
    -(right[0] * eye[0] + right[1] * eye[1] + right[2] * eye[2]),
    -(trueUp[0] * eye[0] + trueUp[1] * eye[1] + trueUp[2] * eye[2]),
    -(fz[0] * eye[0] + fz[1] * eye[1] + fz[2] * eye[2]),
    1,
  ]);
}

// Minimal mat4 helpers — no dependency

function perspective(fovY: number, aspect: number, near: number, far: number): mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const rangeInv = 1 / (near - far);
  // Column-major, depth [0,1] (WebGPU convention)
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, far * rangeInv, -1,
    0, 0, near * far * rangeInv, 0,
  ]);
}
