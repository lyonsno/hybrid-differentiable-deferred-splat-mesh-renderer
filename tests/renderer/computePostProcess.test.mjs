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
