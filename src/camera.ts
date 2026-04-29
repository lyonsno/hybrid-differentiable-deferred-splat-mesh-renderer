import { mat4, vec3 } from "./math.js";

export const ORBIT_RADIANS_PER_PIXEL = 0.005;
export const MAX_ORBIT_ELEVATION = Math.PI * 0.44;

export interface Camera {
  position: vec3;
  target: vec3;
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
  mouse: { down: boolean; lastX: number; lastY: number };
}

export function createCamera(): Camera {
  return {
    position: [0, 1, 3],
    target: [0, 0, 0],
    up: [0, 1, 0],
    fovY: Math.PI / 3,
    near: 0.01,
    far: 100,
    navigationScale: 1,
    azimuth: 0,
    elevation: 0.3,
    distance: 3,
    keys: new Set(),
    mouse: { down: false, lastX: 0, lastY: 0 },
  };
}

export function bindCameraControls(cam: Camera, canvas: HTMLCanvasElement) {
  canvas.addEventListener("mousedown", (e) => {
    cam.mouse.down = true;
    cam.mouse.lastX = e.clientX;
    cam.mouse.lastY = e.clientY;
  });

  window.addEventListener("mouseup", () => {
    cam.mouse.down = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!cam.mouse.down) return;
    const dx = e.clientX - cam.mouse.lastX;
    const dy = e.clientY - cam.mouse.lastY;
    cam.mouse.lastX = e.clientX;
    cam.mouse.lastY = e.clientY;
    rotateCameraView(cam, dx, dy);
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.clientWidth || 1;
    const height = rect.height || canvas.clientHeight || 1;
    const ndcX = ((e.clientX - rect.left) / width) * 2 - 1;
    const ndcY = 1 - ((e.clientY - rect.top) / height) * 2;
    zoomCameraToCursorProjection(cam, ndcX, ndcY, width / height, e.deltaY);
  }, { passive: false });

  window.addEventListener("keydown", (e) => cam.keys.add(e.key.toLowerCase()));
  window.addEventListener("keyup", (e) => cam.keys.delete(e.key.toLowerCase()));
}

export function updateCamera(cam: Camera, dt: number) {
  const speed = cameraMoveSpeed(cam) * dt;
  const { forward, right, trueUp } = cameraBasis(cam);
  const movement: vec3 = [0, 0, 0];

  // Free-fly navigation keeps the camera eye authoritative. The target is only
  // the current look point, so loaded scans cannot impose a hostile pivot.
  if (cam.keys.has("w")) {
    movement[0] += forward[0] * speed;
    movement[1] += forward[1] * speed;
    movement[2] += forward[2] * speed;
  }
  if (cam.keys.has("s")) {
    movement[0] -= forward[0] * speed;
    movement[1] -= forward[1] * speed;
    movement[2] -= forward[2] * speed;
  }
  if (cam.keys.has("a")) {
    movement[0] -= right[0] * speed;
    movement[1] -= right[1] * speed;
    movement[2] -= right[2] * speed;
  }
  if (cam.keys.has("d")) {
    movement[0] += right[0] * speed;
    movement[1] += right[1] * speed;
    movement[2] += right[2] * speed;
  }
  if (cam.keys.has("q")) {
    movement[0] -= trueUp[0] * speed;
    movement[1] -= trueUp[1] * speed;
    movement[2] -= trueUp[2] * speed;
  }
  if (cam.keys.has("e")) {
    movement[0] += trueUp[0] * speed;
    movement[1] += trueUp[1] * speed;
    movement[2] += trueUp[2] * speed;
  }

  cam.position[0] += movement[0];
  cam.position[1] += movement[1];
  cam.position[2] += movement[2];
  syncCameraTargetFromPosition(cam);
}

export function positionCameraFromTarget(cam: Camera): void {
  const back = cameraBackVector(cam);
  cam.position = [
    cam.target[0] + back[0] * cam.distance,
    cam.target[1] + back[1] * cam.distance,
    cam.target[2] + back[2] * cam.distance,
  ];
}

export function rotateCameraView(cam: Camera, dx: number, dy: number): void {
  cam.azimuth -= dx * ORBIT_RADIANS_PER_PIXEL;
  cam.elevation = clamp(
    cam.elevation + dy * ORBIT_RADIANS_PER_PIXEL,
    -MAX_ORBIT_ELEVATION,
    MAX_ORBIT_ELEVATION
  );
}

export function zoomCameraToCursorProjection(
  cam: Camera,
  ndcX: number,
  ndcY: number,
  aspect: number,
  deltaY: number
): void {
  const oldDistance = cam.distance;
  const newDistance = computeWheelZoomDistance(
    oldDistance,
    deltaY,
    cam.navigationScale
  );
  if (newDistance === oldDistance) {
    return;
  }

  const oldOffset = screenPlaneOffset(cam, ndcX, ndcY, aspect, oldDistance);
  const newOffset = screenPlaneOffset(cam, ndcX, ndcY, aspect, newDistance);
  const { forward } = cameraBasis(cam);
  const cursorPoint: vec3 = [
    cam.position[0] + forward[0] * oldDistance + oldOffset[0],
    cam.position[1] + forward[1] * oldDistance + oldOffset[1],
    cam.position[2] + forward[2] * oldDistance + oldOffset[2],
  ];
  const nextTarget: vec3 = [
    cursorPoint[0] - newOffset[0],
    cursorPoint[1] - newOffset[1],
    cursorPoint[2] - newOffset[2],
  ];
  cam.distance = newDistance;
  cam.position = [
    nextTarget[0] - forward[0] * newDistance,
    nextTarget[1] - forward[1] * newDistance,
    nextTarget[2] - forward[2] * newDistance,
  ];
  cam.target = nextTarget;
  updateCamera(cam, 0);
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

  const scale = Math.max(navigationScale, 0.001);
  const wheelUnits = Math.max(-5, Math.min(5, deltaY / 100));
  const signedStep =
    Math.sign(wheelUnits) *
    Math.abs(wheelUnits) *
    (distance * 0.16 + scale * 0.025);
  const minDistance = Math.max(0.01, scale * 0.004);
  return Math.max(minDistance, distance + signedStep);
}

export function cameraMoveSpeed(cam: Camera): number {
  return Math.max(0.05, cam.distance * 0.65, cam.navigationScale * 0.35);
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

function syncCameraTargetFromPosition(cam: Camera): void {
  const { forward } = cameraBasis(cam);
  cam.target = [
    cam.position[0] + forward[0] * cam.distance,
    cam.position[1] + forward[1] * cam.distance,
    cam.position[2] + forward[2] * cam.distance,
  ];
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
