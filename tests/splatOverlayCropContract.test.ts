import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("overlay advertises renderer-applied crop support and telemetry", async () => {
  const source = await readFile(new URL("../src/splatOverlay.ts", import.meta.url), "utf8");

  assert.match(source, /cropAppliedByRenderer:\s*true/);
  assert.match(source, /cropStatus/);
  assert.match(source, /correctionApplication/);
  assert.match(source, /get cropAppliedByRenderer\(\)/);
  assert.match(source, /setCorrectionIdentity[\s\S]*applySplatCorrectionToAttributes/);
  assert.doesNotMatch(source, /does not filter vertices/);
});

test("overlay exposes proxy-geometry depth composition without claiming shared canvas", async () => {
  const source = await readFile(new URL("../src/splatOverlay.ts", import.meta.url), "utf8");

  assert.match(source, /meshDepthOcclusion:\s*"proxy-geometry"/);
  assert.match(source, /readonly depthCompositionTelemetry/);
  assert.match(source, /setSceneContext[\s\S]*normalizeProxyDepthPlanes/);
  assert.match(source, /depthProxyPresenter\.draw/);
  assert.match(source, /scene\.gbufferDepthView/);
  assert.match(source, /sharedCanvasComposite:\s*false/);
  assert.match(source, /sharedCommandEncoder:\s*false/);
});

test("proxy-depth presenter accepts the renderer's unfilterable G-buffer depth texture", async () => {
  const source = await readFile(new URL("../src/tileLocalTexturePresenter.ts", import.meta.url), "utf8");

  assert.match(
    source,
    /binding:\s*2,\s*visibility:\s*GPUShaderStage\.FRAGMENT,\s*texture:\s*\{\s*sampleType:\s*"unfilterable-float"\s*\}/,
  );
});
