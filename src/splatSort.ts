export type NumericArray = ArrayLike<number>;

interface DepthKey {
  id: number;
  depth: number;
}

export function sortSplatIdsBackToFront(
  positions: NumericArray,
  viewMatrix: NumericArray
): Uint32Array {
  const splatCount = validatePackedPositions(positions);
  validateViewMatrix(viewMatrix);

  const keys: DepthKey[] = new Array(splatCount);
  for (let id = 0; id < splatCount; id++) {
    const depth = viewSpaceDepthUnchecked(positions, id, viewMatrix);
    if (!Number.isFinite(depth)) {
      throw new RangeError(`splat ${id} produced a non-finite view-space depth`);
    }
    keys[id] = { id, depth };
  }

  keys.sort((a, b) => a.depth - b.depth || a.id - b.id);

  const order = new Uint32Array(splatCount);
  for (let i = 0; i < splatCount; i++) {
    order[i] = keys[i].id;
  }
  return order;
}

export function computeViewSpaceDepth(
  positions: NumericArray,
  splatId: number,
  viewMatrix: NumericArray
): number {
  const splatCount = validatePackedPositions(positions);
  validateViewMatrix(viewMatrix);
  if (!Number.isInteger(splatId) || splatId < 0 || splatId >= splatCount) {
    throw new RangeError(`splat id ${splatId} is outside 0..${splatCount - 1}`);
  }
  return viewSpaceDepthUnchecked(positions, splatId, viewMatrix);
}

function validatePackedPositions(positions: NumericArray): number {
  if (positions.length % 3 !== 0) {
    throw new RangeError("positions length must be a multiple of 3");
  }
  const splatCount = positions.length / 3;
  if (splatCount > 0xffffffff) {
    throw new RangeError("splat count exceeds Uint32 original-id capacity");
  }
  return splatCount;
}

function validateViewMatrix(viewMatrix: NumericArray) {
  if (viewMatrix.length !== 16) {
    throw new RangeError("view matrix must contain 16 values");
  }
}

function viewSpaceDepthUnchecked(
  positions: NumericArray,
  splatId: number,
  viewMatrix: NumericArray
): number {
  const offset = splatId * 3;
  const x = positions[offset];
  const y = positions[offset + 1];
  const z = positions[offset + 2];

  // Column-major mat4 transform, z row only.
  return (
    viewMatrix[2] * x +
    viewMatrix[6] * y +
    viewMatrix[10] * z +
    viewMatrix[14]
  );
}
