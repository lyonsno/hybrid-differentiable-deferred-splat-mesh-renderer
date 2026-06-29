export interface OverlayFrameMatrices {
  readonly viewMatrix: Float32Array;
  readonly viewProj: Float32Array;
  readonly lightingViewMatrix: Float32Array;
  readonly lightingViewProj: Float32Array;
  readonly cameraPosition: Float32Array;
  readonly lightingCameraPosition: Float32Array;
  readonly normalMatrix: Float32Array;
}

const VERTICAL_FLIP = new Float32Array([
  1, 0, 0, 0,
  0, -1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

export function composeOverlayFrameMatrices(
  hostViewMatrix: Float32Array,
  hostProjectionMatrix: Float32Array,
  modelMatrix: Float32Array,
  cameraPositionWorld: Float32Array,
): OverlayFrameMatrices {
  const viewMatrix = multiplyMat4(hostViewMatrix, modelMatrix);
  const viewProj = multiplyMat4(VERTICAL_FLIP, multiplyMat4(hostProjectionMatrix, viewMatrix));
  const lightingViewProj = multiplyMat4(VERTICAL_FLIP, multiplyMat4(hostProjectionMatrix, hostViewMatrix));
  const modelInverse = invertAffineMat4(modelMatrix);
  const cameraPosition = modelInverse
    ? transformPoint(modelInverse, cameraPositionWorld)
    : new Float32Array(cameraPositionWorld);
  const normalMatrix = modelInverse ? transposeMat3FromMat4(modelInverse) : identityMat3();

  return {
    viewMatrix,
    viewProj,
    lightingViewMatrix: new Float32Array(hostViewMatrix),
    lightingViewProj,
    cameraPosition,
    lightingCameraPosition: new Float32Array(cameraPositionWorld),
    normalMatrix,
  };
}

function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      out[column * 4 + row] =
        a[0 * 4 + row] * b[column * 4 + 0] +
        a[1 * 4 + row] * b[column * 4 + 1] +
        a[2 * 4 + row] * b[column * 4 + 2] +
        a[3 * 4 + row] * b[column * 4 + 3];
    }
  }
  return out;
}

function transformPoint(matrix: Float32Array, point: Float32Array): Float32Array {
  const x = point[0];
  const y = point[1];
  const z = point[2];
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  const safeW = Math.abs(w) > 1e-8 ? w : 1;
  return new Float32Array([
    (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / safeW,
    (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / safeW,
    (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / safeW,
  ]);
}

function identityMat3(): Float32Array {
  return new Float32Array([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  ]);
}

function transposeMat3FromMat4(matrix: Float32Array): Float32Array {
  return new Float32Array([
    matrix[0], matrix[4], matrix[8],
    matrix[1], matrix[5], matrix[9],
    matrix[2], matrix[6], matrix[10],
  ]);
}

function invertAffineMat4(m: Float32Array): Float32Array | null {
  const o = new Float32Array(16);
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (Math.abs(det) < 1e-10) return null;
  det = 1 / det;
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return o;
}
