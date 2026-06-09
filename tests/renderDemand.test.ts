import assert from "node:assert/strict";
import test from "node:test";

import {
  createRenderDemandState,
  markRenderFrameFinished,
  requestRenderFrame,
  shouldDeferTileLocalRebuildForActiveInput,
  shouldDispatchTileLocalCompositor,
  shouldContinueRendering,
} from "../src/renderDemand.ts";

test("demand renderer keeps frames alive only while live work remains", () => {
  assert.equal(shouldContinueRendering({ activeInput: false, pendingGpuSort: false, pendingAlphaDensity: false }), false);
  assert.equal(shouldContinueRendering({ activeInput: true, pendingGpuSort: false, pendingAlphaDensity: false }), true);
  assert.equal(shouldContinueRendering({ activeInput: false, pendingGpuSort: true, pendingAlphaDensity: false }), true);
  assert.equal(shouldContinueRendering({ activeInput: false, pendingGpuSort: false, pendingAlphaDensity: true }), true);
  assert.equal(
    shouldContinueRendering({
      activeInput: false,
      pendingGpuSort: false,
      pendingAlphaDensity: false,
      pendingTileLocalCompositor: true,
    }),
    true
  );
});

test("demand renderer coalesces wake requests until the current frame runs", () => {
  const state = createRenderDemandState();

  assert.equal(requestRenderFrame(state), true);
  assert.equal(requestRenderFrame(state), false);
  markRenderFrameFinished(state);
  assert.equal(requestRenderFrame(state), true);
});

test("tile-local compositor dispatch waits until camera-dependent work has settled", () => {
  const settled = {
    needsDispatch: true,
    activeInput: false,
    pendingGpuSort: false,
    pendingAlphaDensity: false,
  };

  assert.equal(shouldDispatchTileLocalCompositor(settled), true);
  assert.equal(shouldDispatchTileLocalCompositor({ ...settled, needsDispatch: false }), false);
  assert.equal(shouldDispatchTileLocalCompositor({ ...settled, activeInput: true }), false);
  assert.equal(shouldDispatchTileLocalCompositor({ ...settled, pendingGpuSort: true }), false);
  assert.equal(shouldDispatchTileLocalCompositor({ ...settled, pendingAlphaDensity: true }), false);
});

test("GPU-backed tile-local compositor may refresh during active camera input", () => {
  const activeGpuInput = {
    needsDispatch: true,
    activeInput: true,
    pendingGpuSort: false,
    pendingAlphaDensity: false,
    allowActiveInputDispatch: true,
  };

  assert.equal(shouldDispatchTileLocalCompositor(activeGpuInput), true);
  assert.equal(shouldDispatchTileLocalCompositor({ ...activeGpuInput, needsDispatch: false }), false);
  assert.equal(shouldDispatchTileLocalCompositor({ ...activeGpuInput, pendingGpuSort: true }), true);
  assert.equal(shouldDispatchTileLocalCompositor({ ...activeGpuInput, pendingAlphaDensity: true }), true);
});

test("tile-local rebuild deferral uses frame-start time rather than a post-alpha-density timestamp", () => {
  const staleGpuPresentation = {
    arenaBackend: "gpu",
    activeInput: false,
    presentationStaleForCurrentView: true,
    frameStartMs: 1000,
    lastSignatureChangeMs: 1000,
    settleMs: 260,
  };

  assert.equal(shouldDeferTileLocalRebuildForActiveInput(staleGpuPresentation), true);
  assert.equal(
    shouldDeferTileLocalRebuildForActiveInput({
      ...staleGpuPresentation,
      frameStartMs: 1261,
    }),
    false,
  );
  assert.equal(
    shouldDeferTileLocalRebuildForActiveInput({
      ...staleGpuPresentation,
      arenaBackend: "cpu",
    }),
    false,
  );
  assert.equal(
    shouldDeferTileLocalRebuildForActiveInput({
      ...staleGpuPresentation,
      presentationStaleForCurrentView: false,
    }),
    false,
  );
});
