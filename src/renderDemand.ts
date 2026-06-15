export interface RenderDemandState {
  framePending: boolean;
}

export interface RenderDemandSignals {
  readonly activeInput: boolean;
  readonly pendingGpuSort: boolean;
  readonly pendingAlphaDensity: boolean;
  readonly pendingTileLocalCompositor?: boolean;
  readonly pendingTemporalResolve?: boolean;
  readonly pendingTimings?: boolean;
}

export interface TileLocalCompositorDispatchSignals {
  readonly needsDispatch: boolean;
  readonly activeInput: boolean;
  readonly allowActiveInputDispatch?: boolean;
  readonly pendingGpuSort: boolean;
  readonly pendingAlphaDensity: boolean;
}

export interface TileLocalRebuildDeferralSignals {
  readonly arenaBackend?: string | null;
  readonly activeInput: boolean;
  readonly presentationStaleForCurrentView: boolean;
  readonly frameStartMs: number;
  readonly lastSignatureChangeMs: number;
  readonly settleMs: number;
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
    signals.pendingTemporalResolve === true ||
    signals.pendingTimings === true
  );
}

export function shouldDispatchTileLocalCompositor(signals: TileLocalCompositorDispatchSignals): boolean {
  if (signals.allowActiveInputDispatch === true) {
    return signals.needsDispatch;
  }
  return (
    signals.needsDispatch &&
    !signals.activeInput &&
    !signals.pendingGpuSort &&
    !signals.pendingAlphaDensity
  );
}

export function shouldDeferTileLocalRebuildForActiveInput(signals: TileLocalRebuildDeferralSignals): boolean {
  return Boolean(
    signals.arenaBackend === "gpu" &&
    signals.presentationStaleForCurrentView &&
    (
      signals.activeInput ||
      signals.frameStartMs - signals.lastSignatureChangeMs < signals.settleMs
    )
  );
}
