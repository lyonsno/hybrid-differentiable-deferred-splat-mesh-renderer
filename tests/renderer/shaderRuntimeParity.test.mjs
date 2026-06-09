import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SHADER_PATH = new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url);
const FINAL_ACCUMULATION_TRACE_PATH = new URL("../../src/rendererFidelityProbes/finalAccumulationTrace.js", import.meta.url);
const GPU_LIVE_ANCHOR_TRACE_PATH = new URL("../../src/rendererFidelityProbes/gpuLiveAnchorTrace.js", import.meta.url);

test("tile-local visible shader uses the same conic pixel transfer law as final accumulation trace", () => {
  const shader = readFileSync(SHADER_PATH, "utf8");
  const finalAccumulationTrace = readFileSync(FINAL_ACCUMULATION_TRACE_PATH, "utf8");
  const gpuLiveAnchorTrace = readFileSync(GPU_LIVE_ANCHOR_TRACE_PATH, "utf8");

  assert.match(
    finalAccumulationTrace,
    /function conicPixelWeight\(centerPx,\s*inverseConic,\s*pixelCenter\)\s*\{\s*return conicPixelWeightWithFalloffScale\(centerPx,\s*inverseConic,\s*pixelCenter,\s*2\);?\s*\}/,
    "final accumulation trace must continue to record the canonical exp(-2 * mahalanobis2) coverage transfer",
  );
  assert.match(
    finalAccumulationTrace,
    /Math\.exp\(-falloffScale \* Math\.max\(mahalanobis2, 0\)\)/,
    "final accumulation trace should route canonical and source-frontier support envelopes through the same conic math",
  );
  assert.match(
    gpuLiveAnchorTrace,
    /Math\.exp\(-2 \* Math\.max\(mahalanobis2, 0\)\)/,
    "GPU-live anchor trace must preserve the same coverage transfer as final accumulation trace",
  );
  assert.match(
    shader,
    /fn conic_falloff_scale\(\) -> f32\s*\{\s*return 2\.0;\s*\}/,
    "visible tile-local shader must not use a different final-color conic falloff than the trace path",
  );
  assert.doesNotMatch(
    shader,
    /frame\.tileSizePx\s*>=\s*16\.0[\s\S]*return 0\.5/,
    "canonical 16/256 trace-canvas witness must not receive a shader-only falloff override",
  );
});
