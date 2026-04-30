export interface RenderDemandState {
  framePending: boolean;
}

export interface RenderDemandSignals {
  readonly activeInput: boolean;
  readonly pendingGpuSort: boolean;
  readonly pendingAlphaDensity: boolean;
  readonly pendingTileLocalCompositor?: boolean;
  readonly pendingTimings?: boolean;
}

export function createRenderDemandState(): RenderDemandState {
  return { framePending: false };
}

export function requestRenderFrame(state: RenderDemandState): boolean {
  if (state.framePending) {
    return false;
  }
  state.framePending = true;
  return true;
}

export function markRenderFrameFinished(state: RenderDemandState): void {
  state.framePending = false;
}

export function shouldContinueRendering(signals: RenderDemandSignals): boolean {
  return (
    signals.activeInput ||
    signals.pendingGpuSort ||
    signals.pendingAlphaDensity ||
    signals.pendingTileLocalCompositor === true ||
    signals.pendingTimings === true
  );
}
