import { mat4, vec3 } from "./math.js";

export interface Camera {
  position: vec3;
  target: vec3;
  up: vec3;
  fovY: number;
  near: number;
  far: number;
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
    cam.azimuth -= dx * 0.005;
    cam.elevation = Math.max(
      -Math.PI / 2 + 0.01,
      Math.min(Math.PI / 2 - 0.01, cam.elevation + dy * 0.005)
    );
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    cam.distance = Math.max(0.1, cam.distance * (1 + e.deltaY * 0.001));
  }, { passive: false });

  window.addEventListener("keydown", (e) => cam.keys.add(e.key.toLowerCase()));
  window.addEventListener("keyup", (e) => cam.keys.delete(e.key.toLowerCase()));
}

export function updateCamera(cam: Camera, dt: number) {
  const speed = 3.0 * dt;

  // WASD moves the orbit target
  const forward: vec3 = [
    -Math.sin(cam.azimuth),
    0,
    -Math.cos(cam.azimuth),
  ];
  const right: vec3 = [forward[2], 0, -forward[0]];

  if (cam.keys.has("w")) {
    cam.target[0] += forward[0] * speed;
    cam.target[1] += forward[1] * speed;
    cam.target[2] += forward[2] * speed;
  }
  if (cam.keys.has("s")) {
    cam.target[0] -= forward[0] * speed;
    cam.target[1] -= forward[1] * speed;
    cam.target[2] -= forward[2] * speed;
  }
  if (cam.keys.has("a")) {
    cam.target[0] -= right[0] * speed;
    cam.target[2] -= right[2] * speed;
  }
  if (cam.keys.has("d")) {
    cam.target[0] += right[0] * speed;
    cam.target[2] += right[2] * speed;
  }
  if (cam.keys.has("q")) cam.target[1] -= speed;
  if (cam.keys.has("e")) cam.target[1] += speed;

  // Compute eye position from orbit
  const cosEl = Math.cos(cam.elevation);
  cam.position = [
    cam.target[0] + cam.distance * cosEl * Math.sin(cam.azimuth),
    cam.target[1] + cam.distance * Math.sin(cam.elevation),
    cam.target[2] + cam.distance * cosEl * Math.cos(cam.azimuth),
  ];
}

export function getViewMatrix(cam: Camera): mat4 {
  return lookAt(cam.position, cam.target, cam.up);
}

export function getProjectionMatrix(
  cam: Camera,
  aspect: number
): mat4 {
  return perspective(cam.fovY, aspect, cam.near, cam.far);
}

// Minimal mat4 helpers — no dependency

function lookAt(eye: vec3, target: vec3, up: vec3): mat4 {
  const zx = eye[0] - target[0];
  const zy = eye[1] - target[1];
  const zz = eye[2] - target[2];
  const zlen = Math.hypot(zx, zy, zz) || 1;
  const fz: vec3 = [zx / zlen, zy / zlen, zz / zlen];

  // right = up × forward
  let rx = up[1] * fz[2] - up[2] * fz[1];
  let ry = up[2] * fz[0] - up[0] * fz[2];
  let rz = up[0] * fz[1] - up[1] * fz[0];
  const rlen = Math.hypot(rx, ry, rz) || 1;
  rx /= rlen; ry /= rlen; rz /= rlen;

  // true up = forward × right
  const ux = fz[1] * rz - fz[2] * ry;
  const uy = fz[2] * rx - fz[0] * rz;
  const uz = fz[0] * ry - fz[1] * rx;

  // Column-major for WebGPU
  return new Float32Array([
    rx, ux, fz[0], 0,
    ry, uy, fz[1], 0,
    rz, uz, fz[2], 0,
    -(rx * eye[0] + ry * eye[1] + rz * eye[2]),
    -(ux * eye[0] + uy * eye[1] + uz * eye[2]),
    -(fz[0] * eye[0] + fz[1] * eye[1] + fz[2] * eye[2]),
    1,
  ]);
}

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
