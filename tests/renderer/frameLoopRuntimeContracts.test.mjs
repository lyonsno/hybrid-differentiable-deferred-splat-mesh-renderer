import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

function frameLoopSource() {
  const start = mainSource.indexOf("async function frame()");
  const end = mainSource.indexOf("\n  requestFrame();\n}", start);
  assert.notEqual(start, -1, "frame loop must remain visible to renderer contract tests");
  assert.notEqual(end, -1, "frame loop end must remain visible to renderer contract tests");
  return mainSource.slice(start, end);
}

test("frame loop exposes operator witness frame identity to the smoke harness", () => {
  const frameSource = frameLoopSource();

  assert.match(mainSource, /function exposeOperatorWitnessFrameState/);
  assert.match(frameSource, /exposeOperatorWitnessFrameState\(\{\s*frameSerial,/);
  assert.match(frameSource, /witnessView:\s*operatorWitnessViewMode/);
  assert.match(frameSource, /revision:\s*operatorWitnessRevision/);
});

test("frame loop resizes compute compositor resources to the current canvas viewport", () => {
  const frameSource = frameLoopSource();

  assert.match(mainSource, /function createComputeCompositorState/);
  assert.match(mainSource, /function resizeComputeCompositorForViewport/);
  assert.match(frameSource, /resizeComputeCompositorForViewport\(scene,\s*gpu,\s*width,\s*height\)/);
});

test("frame loop refreshes alpha density after camera or viewport changes settle", () => {
  const frameSource = frameLoopSource();

  assert.match(frameSource, /shouldRefreshAlphaDensity\(\s*scene\.alphaDensityState\.refreshState,\s*view,\s*width,\s*height,\s*now,\s*ALPHA_DENSITY_SETTLE_MS,?\s*\)/);
  assert.match(frameSource, /writeAlphaDensityCompensatedOpacities\(/);
  assert.match(frameSource, /gpu\.device\.queue\.writeBuffer\(scene\.buffers\.opacityBuffer/);
});
