import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
const rendererSource = readFileSync(new URL("../../src/splatRenderer.ts", import.meta.url), "utf8");

function frameLoopSource() {
  const start = mainSource.indexOf("async function frame()");
  // Find end of frame function — look for requestAnimationFrame near end
  let end = mainSource.indexOf("requestAnimationFrame(frame);\n  }", start);
  if (end === -1) end = mainSource.indexOf("requestFrame();\n}", start);
  if (end !== -1) end += 40; // include the line
  assert.notEqual(start, -1, "frame loop must remain visible to renderer contract tests");
  assert.notEqual(end, -1, "frame loop end must remain visible to renderer contract tests");
  return mainSource.slice(start, end);
}

test("frame loop exposes operator witness frame identity to the smoke harness", () => {
  const frameSource = frameLoopSource();

  assert.match(rendererSource, /function exposeOperatorWitnessFrameState/);
  assert.match(frameSource, /exposeOperatorWitnessFrameState\(\{/);
  assert.match(frameSource, /frameSerial/);
  assert.match(frameSource, /witnessView:\s*operatorWitnessViewMode/);
  assert.match(frameSource, /revision:\s*operatorWitnessRevision/);
});

test("frame loop resizes compute compositor resources on viewport change", () => {
  const frameSource = frameLoopSource();

  // Renderer must expose resizeViewport method
  assert.match(rendererSource, /resizeViewport\(/);
  // Frame loop must call it
  assert.match(frameSource, /renderer\.resizeViewport\(/);
});

test("frame loop refreshes alpha density after camera or viewport changes settle", () => {
  const frameSource = frameLoopSource();

  assert.match(frameSource, /shouldRefreshAlphaDensity\(/);
  assert.match(frameSource, /renderer\.refreshAlphaDensity\(/);
  assert.match(frameSource, /ALPHA_DENSITY_SETTLE_MS/);
});

test("splatRenderer destroys all compositor textures on scene destroy", () => {
  // All five textures must be destroyed
  assert.match(rendererSource, /cc\.outputTexture\.destroy\(\)/);
  assert.match(rendererSource, /cc\.gbufferDepthTexture\.destroy\(\)/);
  assert.match(rendererSource, /cc\.gbufferNormalTexture\.destroy\(\)/);
  assert.match(rendererSource, /cc\.gbufferMaterialTexture\.destroy\(\)/);
  assert.match(rendererSource, /cc\.litTexture\.destroy\(\)/);
});
