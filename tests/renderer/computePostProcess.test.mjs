import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("compute renderer runs FXAA and CAS on an rgba16float texture before presentation", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const postProcessSource = readFileSync(new URL("../../src/computePostProcess.ts", import.meta.url), "utf8");
  const shader = readFileSync(new URL("../../src/shaders/compute_post_process.wgsl", import.meta.url), "utf8");

  assert.match(mainSource, /createFxaaCasPostProcess/);
  assert.match(mainSource, /postProcessedTexture:\s*GPUTexture/);
  assert.match(mainSource, /postProcessedView:\s*GPUTextureView/);
  assert.match(mainSource, /label:\s*"compute_compositor_output"[\s\S]*format:\s*"rgba16float"[\s\S]*GPUTextureUsage\.STORAGE_BINDING \| GPUTextureUsage\.TEXTURE_BINDING/);
  assert.match(mainSource, /createPostProcessOutputTexture\([\s\S]*"compute_compositor_post_process_output"/);
  assert.match(mainSource, /postProcess\.encode\(\s*activeEncoder,\s*cc\.outputView,\s*cc\.postProcessedView,\s*width,\s*height\s*\)/);
  assert.match(mainSource, /tileLocalPresenter\.draw\(renderPass,\s*scene\.computeCompositor\.postProcessedView\)/);
  assert.doesNotMatch(mainSource, /tileLocalPresenter\.draw\(renderPass,\s*scene\.computeCompositor\.outputView\)/);

  assert.match(postProcessSource, /createFxaaCasPostProcess/);
  assert.match(postProcessSource, /label,\s*size:\s*\[width,\s*height\],\s*format:\s*"rgba16float"[\s\S]*GPUTextureUsage\.STORAGE_BINDING \| GPUTextureUsage\.TEXTURE_BINDING/);
  assert.match(postProcessSource, /storageTexture:\s*\{\s*access:\s*"write-only",\s*format:\s*"rgba16float"\s*\}/);
  assert.match(postProcessSource, /texture:\s*\{\s*sampleType:\s*"unfilterable-float"\s*\}/);
  assert.match(postProcessSource, /dispatchWorkgroups\(\s*Math\.ceil\(width \/ 8\),\s*Math\.ceil\(height \/ 8\)\s*\)/);

  assert.match(shader, /fn fxaa_cas_post_process/);
  assert.match(shader, /texture_storage_2d<rgba16float,\s*write>/);
  assert.match(shader, /textureDimensions\(postProcessOutput\)/);
  assert.match(shader, /fn luma/);
  assert.match(shader, /fn fxaa_filter/);
  assert.match(shader, /fn cas_sharpen/);
  assert.match(shader, /textureLoad/);
});

test("compute post-process exposes live upper-right controls for toggles and sample settings", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const postProcessSource = readFileSync(new URL("../../src/computePostProcess.ts", import.meta.url), "utf8");
  const shader = readFileSync(new URL("../../src/shaders/compute_post_process.wgsl", import.meta.url), "utf8");

  assert.match(html, /id="postprocess-controls"/);
  assert.match(html, /data-visual-smoke-ignore/);
  assert.match(html, /id="postprocess-enabled"/);
  assert.match(html, /id="postprocess-fxaa-enabled"/);
  assert.match(html, /id="postprocess-cas-enabled"/);
  assert.match(html, /id="postprocess-samples"/);
  assert.match(html, /id="postprocess-radius"/);
  assert.match(html, /id="postprocess-debug-view"/);
  assert.match(html, /id="postprocess-sharpness"/);
  assert.match(html, /id="postprocess-sharpness"[^>]*max="100"/);
  assert.match(html, /#postprocess-controls[\s\S]*position:\s*fixed[\s\S]*right:\s*8px[\s\S]*top:\s*8px/);

  assert.match(mainSource, /const postProcessControls = createPostProcessControls\(requestFrame\)/);
  assert.match(mainSource, /postProcessSharpnessFromPercent/);
  assert.match(mainSource, /sampleCount:\s*clampInteger/);
  assert.match(mainSource, /sampleRadius:\s*clampInteger/);
  assert.match(mainSource, /postProcessDebugViewFromSelection/);
  assert.match(mainSource, /readPostProcessSettings\(postProcessControls\)/);
  assert.match(mainSource, /cc\.postProcess\.writeSettings\(gpu\.device\.queue,\s*postProcessSettings\)/);
  assert.match(mainSource, /postProcess:\s*postProcessSettings/);

  assert.match(postProcessSource, /FXAA_CAS_MAX_SHARPNESS\s*=\s*1\.5/);
  assert.match(postProcessSource, /export type FxaaCasDebugView/);
  assert.match(postProcessSource, /export interface FxaaCasPostProcessSettings/);
  assert.match(postProcessSource, /readonly sampleCount:\s*number/);
  assert.match(postProcessSource, /readonly debugView:\s*FxaaCasDebugView/);
  assert.match(postProcessSource, /settingsBuffer:\s*GPUBuffer/);
  assert.match(postProcessSource, /writeSettings\(/);
  assert.match(postProcessSource, /binding:\s*2[\s\S]*buffer:\s*\{\s*type:\s*"uniform"\s*\}/);

  assert.match(shader, /struct PostProcessSettings/);
  assert.match(shader, /enabled:\s*u32/);
  assert.match(shader, /fxaaEnabled:\s*u32/);
  assert.match(shader, /casEnabled:\s*u32/);
  assert.match(shader, /sampleRadius:\s*u32/);
  assert.match(shader, /sampleCount:\s*u32/);
  assert.match(shader, /debugView:\s*u32/);
  assert.match(shader, /casSharpness:\s*f32/);
  assert.match(shader, /settings\.enabled == 0u/);
  assert.match(shader, /settings\.fxaaEnabled != 0u/);
  assert.match(shader, /settings\.casEnabled != 0u/);
  assert.match(shader, /settings\.sampleRadius/);
  assert.match(shader, /settings\.sampleCount/);
  assert.match(shader, /fn cas_alias_risk/);
  assert.match(shader, /fn cas_detail_mask/);
  assert.match(shader, /fn fxaa_edge_mask/);
  assert.match(shader, /settings\.debugView/);
  assert.match(shader, /localRange/);
  assert.match(shader, /haloWindow/);
  assert.doesNotMatch(shader, /return clamp\(sharpened,\s*localMin,\s*localMax\)/);
});
