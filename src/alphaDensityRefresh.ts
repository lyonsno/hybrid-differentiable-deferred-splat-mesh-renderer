export interface AlphaDensityRefreshState {
  readonly observedViewMatrix: Float32Array;
  readonly refreshedViewMatrix: Float32Array;
  lastViewChangeMs: number;
  needsRefresh: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export function createAlphaDensityRefreshState(
  viewMatrix: Float32Array,
  viewportWidth: number,
  viewportHeight: number
): AlphaDensityRefreshState {
  return {
    observedViewMatrix: new Float32Array(viewMatrix),
    refreshedViewMatrix: new Float32Array(viewMatrix),
    lastViewChangeMs: Number.NEGATIVE_INFINITY,
    needsRefresh: false,
    viewportWidth,
    viewportHeight,
  };
}

export function shouldRefreshAlphaDensity(
  state: AlphaDensityRefreshState,
  viewMatrix: Float32Array,
  viewportWidth: number,
  viewportHeight: number,
  nowMs: number,
  settleMs: number
): boolean {
  if (state.viewportWidth !== viewportWidth || state.viewportHeight !== viewportHeight) {
    state.viewportWidth = viewportWidth;
    state.viewportHeight = viewportHeight;
    state.lastViewChangeMs = nowMs;
    state.needsRefresh = true;
  }

  if (matrixChanged(state.observedViewMatrix, viewMatrix)) {
    state.observedViewMatrix.set(viewMatrix);
    state.lastViewChangeMs = nowMs;
    state.needsRefresh = true;
  }

  if (!state.needsRefresh || nowMs - state.lastViewChangeMs < settleMs) {
    return false;
  }

  state.refreshedViewMatrix.set(viewMatrix);
  state.needsRefresh = false;
  return true;
}

function matrixChanged(a: Float32Array, b: Float32Array): boolean {
  if (a.length !== b.length) {
    return true;
  }
  for (let index = 0; index < a.length; index++) {
    if (Math.abs(a[index] - b[index]) > 1e-6) {
      return true;
    }
  }
  return false;
}
