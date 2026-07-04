import type { SplatAttributes } from "./splats.js";

const IDENTITY_MAT4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

export function transformSceneSplatAttributes(attributes: SplatAttributes, matrixLike?: readonly number[]): SplatAttributes {
  const matrix = normalizeMat4(matrixLike);
  const normalMatrix = normalMatrixFromMat4(matrix);
  const positions = new Float32Array(attributes.positions);
  const scales = new Float32Array(attributes.scales);
  const rotations = new Float32Array(attributes.rotations);
  const normals = attributes.normals ? new Float32Array(attributes.normals) : undefined;
  const detailNormals = attributes.detailNormals ? new Float32Array(attributes.detailNormals) : undefined;

  for (let index = 0; index < attributes.count; index += 1) {
    const vecBase = index * 3;
    const quatBase = index * 4;
    const position = transformPoint(matrix, positions[vecBase], positions[vecBase + 1], positions[vecBase + 2]);
    positions[vecBase] = position[0];
    positions[vecBase + 1] = position[1];
    positions[vecBase + 2] = position[2];

    if (normals) {
      const normal = transformDirection(normalMatrix, normals[vecBase], normals[vecBase + 1], normals[vecBase + 2]);
      normals[vecBase] = normal[0];
      normals[vecBase + 1] = normal[1];
      normals[vecBase + 2] = normal[2];
    }
    if (detailNormals) {
      const detail = transformDirection(normalMatrix, detailNormals[vecBase], detailNormals[vecBase + 1], detailNormals[vecBase + 2]);
      detailNormals[vecBase] = detail[0];
      detailNormals[vecBase + 1] = detail[1];
      detailNormals[vecBase + 2] = detail[2];
    }

    const q = normalizeQuaternion([
      rotations[quatBase],
      rotations[quatBase + 1],
      rotations[quatBase + 2],
      rotations[quatBase + 3],
    ]);
    const axis0 = transformLinear(matrix, ...scaleVector(rotateAxisByQuaternionWxyz(q, [1, 0, 0]), Math.exp(scales[vecBase])));
    const axis1 = transformLinear(matrix, ...scaleVector(rotateAxisByQuaternionWxyz(q, [0, 1, 0]), Math.exp(scales[vecBase + 1])));
    const axis2 = transformLinear(matrix, ...scaleVector(rotateAxisByQuaternionWxyz(q, [0, 0, 1]), Math.exp(scales[vecBase + 2])));
    const decomposed = decomposeOrthogonalAxes(axis0, axis1, axis2);
    scales[vecBase] = Math.log(Math.max(decomposed.scales[0], 1e-12));
    scales[vecBase + 1] = Math.log(Math.max(decomposed.scales[1], 1e-12));
    scales[vecBase + 2] = Math.log(Math.max(decomposed.scales[2], 1e-12));
    rotations[quatBase] = decomposed.rotation[0];
    rotations[quatBase + 1] = decomposed.rotation[1];
    rotations[quatBase + 2] = decomposed.rotation[2];
    rotations[quatBase + 3] = decomposed.rotation[3];
  }

  return {
    ...attributes,
    positions,
    scales,
    rotations,
    normals,
    detailNormals,
    bounds: recomputeSplatBounds(positions, attributes.count),
  };
}

export function rotateAxisByQuaternionWxyz(rotation: readonly number[], axis: readonly [number, number, number]): [number, number, number] {
  const q = normalizeQuaternion(rotation);
  const u: [number, number, number] = [q[1], q[2], q[3]];
  const uv = cross(u, axis);
  const uuv = cross(u, uv);
  return [
    axis[0] + 2 * (q[0] * uv[0] + uuv[0]),
    axis[1] + 2 * (q[0] * uv[1] + uuv[1]),
    axis[2] + 2 * (q[0] * uv[2] + uuv[2]),
  ];
}

function normalizeMat4(value: readonly number[] | undefined): Float32Array {
  if (!value || value.length !== 16) return new Float32Array(IDENTITY_MAT4);
  const out = new Float32Array(16);
  for (let index = 0; index < 16; index += 1) {
    const next = Number(value[index]);
    out[index] = Number.isFinite(next) ? next : IDENTITY_MAT4[index];
  }
  return out;
}

function transformPoint(matrix: Float32Array, x: number, y: number, z: number): [number, number, number] {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

function transformLinear(matrix: Float32Array, x: number, y: number, z: number): [number, number, number] {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z,
    matrix[1] * x + matrix[5] * y + matrix[9] * z,
    matrix[2] * x + matrix[6] * y + matrix[10] * z,
  ];
}

function transformDirection(matrix: Float32Array, x: number, y: number, z: number): [number, number, number] {
  return normalizeVec3(transformLinear(matrix, x, y, z));
}

function normalMatrixFromMat4(matrix: Float32Array): Float32Array {
  const m00 = matrix[0], m01 = matrix[4], m02 = matrix[8];
  const m10 = matrix[1], m11 = matrix[5], m12 = matrix[9];
  const m20 = matrix[2], m21 = matrix[6], m22 = matrix[10];
  const c00 = m11 * m22 - m12 * m21;
  const c01 = -(m10 * m22 - m12 * m20);
  const c02 = m10 * m21 - m11 * m20;
  const c10 = -(m01 * m22 - m02 * m21);
  const c11 = m00 * m22 - m02 * m20;
  const c12 = -(m00 * m21 - m01 * m20);
  const c20 = m01 * m12 - m02 * m11;
  const c21 = -(m00 * m12 - m02 * m10);
  const c22 = m00 * m11 - m01 * m10;
  const det = m00 * c00 + m01 * c01 + m02 * c02;
  if (Math.abs(det) < 1e-12) return new Float32Array(IDENTITY_MAT4);
  const invDet = 1 / det;
  return new Float32Array([
    c00 * invDet, c10 * invDet, c20 * invDet, 0,
    c01 * invDet, c11 * invDet, c21 * invDet, 0,
    c02 * invDet, c12 * invDet, c22 * invDet, 0,
    0, 0, 0, 1,
  ]);
}

function recomputeSplatBounds(positions: Float32Array, count: number): SplatAttributes["bounds"] {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < count; index += 1) {
    const base = index * 3;
    const x = positions[base];
    const y = positions[base + 1];
    const z = positions[base + 2];
    min[0] = Math.min(min[0], x); min[1] = Math.min(min[1], y); min[2] = Math.min(min[2], z);
    max[0] = Math.max(max[0], x); max[1] = Math.max(max[1], y); max[2] = Math.max(max[2], z);
  }
  if (count === 0) {
    min[0] = min[1] = min[2] = 0;
    max[0] = max[1] = max[2] = 0;
  }
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  const size: [number, number, number] = [
    max[0] - min[0],
    max[1] - min[1],
    max[2] - min[2],
  ];
  const radius = Math.max(...size) / 2;
  return { min, max, center, radius };
}

function decomposeOrthogonalAxes(axis0: [number, number, number], axis1: [number, number, number], axis2: [number, number, number]): {
  scales: [number, number, number];
  rotation: [number, number, number, number];
} {
  const scale0 = lengthVec3(axis0);
  const scale1 = lengthVec3(axis1);
  const scale2 = lengthVec3(axis2);
  const xAxis = normalizeVec3(axis0);
  let yAxis = subtractVec3(normalizeVec3(axis1), scaleVector(xAxis, dotVec3(xAxis, normalizeVec3(axis1))));
  yAxis = normalizeVec3(yAxis);
  let zAxis = cross(xAxis, yAxis);
  if (dotVec3(zAxis, axis2) < 0) {
    zAxis = scaleVector(zAxis, -1);
    yAxis = scaleVector(yAxis, -1);
  }
  return {
    scales: [scale0, scale1, scale2],
    rotation: quaternionFromColumns(xAxis, yAxis, zAxis),
  };
}

function quaternionFromColumns(xAxis: [number, number, number], yAxis: [number, number, number], zAxis: [number, number, number]): [number, number, number, number] {
  const m00 = xAxis[0], m01 = yAxis[0], m02 = zAxis[0];
  const m10 = xAxis[1], m11 = yAxis[1], m12 = zAxis[1];
  const m20 = xAxis[2], m21 = yAxis[2], m22 = zAxis[2];
  const trace = m00 + m11 + m22;
  let w: number;
  let x: number;
  let y: number;
  let z: number;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    w = 0.25 * s;
    x = (m21 - m12) / s;
    y = (m02 - m20) / s;
    z = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    w = (m21 - m12) / s;
    x = 0.25 * s;
    y = (m01 + m10) / s;
    z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    w = (m02 - m20) / s;
    x = (m01 + m10) / s;
    y = 0.25 * s;
    z = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    w = (m10 - m01) / s;
    x = (m02 + m20) / s;
    y = (m12 + m21) / s;
    z = 0.25 * s;
  }
  return normalizeQuaternion([w, x, y, z]);
}

function normalizeQuaternion(value: readonly number[]): [number, number, number, number] {
  const w = Number(value[0]);
  const x = Number(value[1]);
  const y = Number(value[2]);
  const z = Number(value[3]);
  const length = Math.hypot(w, x, y, z) || 1;
  const sign = w < 0 ? -1 : 1;
  return [sign * w / length, sign * x / length, sign * y / length, sign * z / length];
}

function cross(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dotVec3(a: readonly number[], b: readonly number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function lengthVec3(v: readonly number[]): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalizeVec3(v: readonly number[]): [number, number, number] {
  const length = lengthVec3(v) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function scaleVector(v: readonly number[], scale: number): [number, number, number] {
  return [v[0] * scale, v[1] * scale, v[2] * scale];
}

function subtractVec3(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
