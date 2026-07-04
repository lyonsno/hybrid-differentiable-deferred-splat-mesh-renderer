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

test("overlay exposes host-depth texture composition on a shared WebGPU device", async () => {
  const overlaySource = await readFile(new URL("../src/splatOverlay.ts", import.meta.url), "utf8");
  const gpuSource = await readFile(new URL("../src/gpu.ts", import.meta.url), "utf8");
  const presenterSource = await readFile(new URL("../src/tileLocalTexturePresenter.ts", import.meta.url), "utf8");
  const shaderSource = await readFile(new URL("../src/shaders/tile_local_present_host_depth_alpha.wgsl", import.meta.url), "utf8");

  assert.match(overlaySource, /setHostDepthTexture/);
  assert.match(overlaySource, /meshDepthOcclusion:\s*activeHostDepthTexture\(\)\s*\?\s*"host-depth-texture"/);
  assert.match(overlaySource, /source\s*=\s*hostDepthActive\s*\?\s*"host-depth-texture"/);
  assert.match(overlaySource, /hostDepthPresenter\.draw/);
  assert.match(gpuSource, /externalDevice\?:\s*GPUDevice/);
  assert.match(gpuSource, /ownsDevice:\s*false/);
  assert.match(presenterSource, /createHostDepthAlphaTexturePresenter/);
  assert.match(
    presenterSource,
    /binding:\s*3,\s*visibility:\s*GPUShaderStage\.FRAGMENT,\s*texture:\s*\{\s*sampleType:\s*"depth"\s*\}/,
  );
  assert.match(shaderSource, /NDC depth/);
  assert.match(shaderSource, /reversedDepth/);
  assert.match(shaderSource, /hostDepthInSplatSpace\s*=\s*select\(hostDepth,\s*1\.0\s*-\s*hostDepth,\s*reversedDepth\)/);
  assert.match(shaderSource, /visible\s*=\s*splatDepthValid\s*&&\s*\(!hostDepthValid\s*\|\|\s*splatDepth\s*<=\s*hostDepthInSplatSpace\s*\+\s*depthBias\)/);
  assert.match(overlaySource, /renderError/);
});

test("proxy-depth presenter accepts the renderer's unfilterable G-buffer depth texture", async () => {
  const source = await readFile(new URL("../src/tileLocalTexturePresenter.ts", import.meta.url), "utf8");

  assert.match(
    source,
    /binding:\s*2,\s*visibility:\s*GPUShaderStage\.FRAGMENT,\s*texture:\s*\{\s*sampleType:\s*"unfilterable-float"\s*\}/,
  );
});

test("overlay exposes a scene-level splat load path", async () => {
  const source = await readFile(new URL("../src/splatOverlay.ts", import.meta.url), "utf8");

  assert.match(source, /loadSceneSplats/);
  assert.match(source, /loadMethod:\s*"scene-splats"/);
  assert.match(source, /sceneSplatIds/);
});
