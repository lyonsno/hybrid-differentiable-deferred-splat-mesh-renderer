export type NumericArray = ArrayLike<number>;

interface DepthKey {
  id: number;
  depth: number;
}

export interface SplatSortRefreshState {
  sortedIds: Uint32Array;
  viewDepthKey: Float32Array;
  lastRefreshMs: number;
}

export interface SplatSortRefreshOptions {
  epsilon?: number;
  minIntervalMs?: number;
  nowMs?: number;
}

type NormalizedSplatSortRefreshOptions = {
  epsilon: number;
  minIntervalMs?: number;
  nowMs?: number;
};

const VIEW_DEPTH_DIRECTION_INDICES = [2, 6, 10] as const;

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

export function createSplatSortRefreshState(
  positions: NumericArray,
  viewMatrix: NumericArray
): SplatSortRefreshState {
  return {
    sortedIds: sortSplatIdsBackToFront(positions, viewMatrix),
    viewDepthKey: captureViewDepthKey(viewMatrix),
    lastRefreshMs: Number.NEGATIVE_INFINITY,
  };
}

export function refreshSplatSortForView(
  positions: NumericArray,
  viewMatrix: NumericArray,
  state: SplatSortRefreshState,
  options: SplatSortRefreshOptions | number = {}
): boolean {
  const { epsilon, minIntervalMs, nowMs } = normalizeRefreshOptions(options);
  if (!viewDepthKeyChanged(state.viewDepthKey, viewMatrix, epsilon)) {
    return false;
  }
  if (
    minIntervalMs !== undefined &&
    nowMs !== undefined &&
    nowMs - state.lastRefreshMs < minIntervalMs
  ) {
    return false;
  }

  state.sortedIds = sortSplatIdsBackToFront(positions, viewMatrix);
  state.viewDepthKey = captureViewDepthKey(viewMatrix);
  if (nowMs !== undefined) {
    state.lastRefreshMs = nowMs;
  }
  return true;
}

function normalizeRefreshOptions(
  options: SplatSortRefreshOptions | number
): NormalizedSplatSortRefreshOptions {
  if (typeof options === "number") {
    return { epsilon: options };
  }
  return {
    epsilon: options.epsilon ?? 1e-6,
    minIntervalMs: options.minIntervalMs,
    nowMs: options.nowMs,
  };
}

export function captureViewDepthKey(viewMatrix: NumericArray): Float32Array {
  validateViewMatrix(viewMatrix);
  return Float32Array.from(VIEW_DEPTH_DIRECTION_INDICES, (index) => viewMatrix[index]);
}

export function viewDepthKeyChanged(
  previousKey: NumericArray,
  viewMatrix: NumericArray,
  epsilon = 1e-6
): boolean {
  if (previousKey.length !== VIEW_DEPTH_DIRECTION_INDICES.length) {
    throw new RangeError(`view depth key must contain ${VIEW_DEPTH_DIRECTION_INDICES.length} values`);
  }
  validateViewMatrix(viewMatrix);

  for (let i = 0; i < VIEW_DEPTH_DIRECTION_INDICES.length; i += 1) {
    if (Math.abs(previousKey[i] - viewMatrix[VIEW_DEPTH_DIRECTION_INDICES[i]]) > epsilon) {
      return true;
    }
  }
  return false;
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
