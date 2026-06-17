import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("compute post-process pipeline exists with FXAA, CAS, and DOF entry points", () => {
  const postProcessSource = readFileSync(new URL("../../src/computePostProcess.ts", import.meta.url), "utf8");
  const shader = readFileSync(new URL("../../src/shaders/compute_post_process.wgsl", import.meta.url), "utf8");

  assert.match(postProcessSource, /createFxaaCasPostProcess/);
  assert.match(postProcessSource, /storageTexture:\s*\{\s*access:\s*"write-only",\s*format:\s*"rgba16float"\s*\}/);
  assert.match(postProcessSource, /texture:\s*\{\s*sampleType:\s*"unfilterable-float"\s*\}/);
  assert.match(postProcessSource, /dispatchWorkgroups\(\s*Math\.ceil\(width \/ 8\),\s*Math\.ceil\(height \/ 8\)\s*\)/);
  assert.match(postProcessSource, /export type FxaaCasDebugView/);
  assert.match(postProcessSource, /export interface FxaaCasPostProcessSettings/);
  assert.match(postProcessSource, /writeSettings\(/);

  assert.match(shader, /fn fxaa_cas_post_process/);
  assert.match(shader, /texture_storage_2d<rgba16float,\s*write>/);
  assert.match(shader, /fn luma/);
  assert.match(shader, /fn fxaa_filter/);
  assert.match(shader, /fn cas_sharpen/);
});

test("post-process is wired into main.ts between deferred lighting and presentation", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(mainSource, /createFxaaCasPostProcess/);
  assert.match(mainSource, /postProcessedTexture/);
  assert.match(mainSource, /postProcessedView/);
  assert.match(mainSource, /createPostProcessOutputTexture/);
  assert.match(mainSource, /cc\.postProcess\.writeSettings\(gpu\.device\.queue,\s*postProcessSettings\)/);
  assert.match(mainSource, /cc\.postProcess\.encode\(/);
  assert.match(mainSource, /cc\.postProcessedView/);
  assert.match(mainSource, /cc\.auxView/);
  assert.match(mainSource, /cc\.dofLowResView/);
  assert.match(mainSource, /cc\.dofBlurScratchView/);
  assert.match(mainSource, /cc\.dofQuarterResView/);
  assert.match(mainSource, /cc\.dofQuarterScratchView/);
  assert.match(mainSource, /createPostProcessDofTexture/);
  assert.match(mainSource, /createPostProcessDofQuarterTexture/);
  assert.match(mainSource, /dofEnabled/);
  assert.match(mainSource, /dofFocusDepth/);
  assert.match(mainSource, /dofAperture/);
});

test("compositor carries coverage confidence in output alpha and deferred lighting preserves it", () => {
  const compositorShader = readFileSync(new URL("../../src/shaders/gpu_tile_splat_composite.wgsl", import.meta.url), "utf8");
  const lightingShader = readFileSync(new URL("../../src/shaders/gpu_deferred_lighting.wgsl", import.meta.url), "utf8");

  assert.match(compositorShader, /coverageConfidence/);
  assert.match(compositorShader, /coverageConfidence\.x\)/);
  assert.match(lightingShader, /coverageAlpha/);
  assert.match(lightingShader, /vec4f\(mapped,\s*coverageAlpha\)/);
});

test("aperture-based DOF with dynamic kernel, quarter-res, and depth linearization", () => {
  const postProcessSource = readFileSync(new URL("../../src/computePostProcess.ts", import.meta.url), "utf8");
  const postProcessShader = readFileSync(new URL("../../src/shaders/compute_post_process.wgsl", import.meta.url), "utf8");

  // Simple aperture-based settings, no near/far plane sliders
  assert.match(postProcessSource, /dofAperture:\s*number/);
  assert.match(postProcessSource, /cameraNear:\s*number/);
  assert.match(postProcessSource, /cameraFar:\s*number/);
  assert.doesNotMatch(postProcessSource, /dofNearEnabled/);
  assert.doesNotMatch(postProcessSource, /dofFarEnabled/);
  assert.doesNotMatch(postProcessSource, /dofNearPlaneDepth/);
  assert.doesNotMatch(postProcessSource, /dofMidEnabled/);

  // Shader: aperture-based CoC, linearized depth, dynamic kernel, quarter-res
  assert.match(postProcessShader, /fn linearize_depth/);
  assert.match(postProcessShader, /fn dof_coc_at/);
  assert.match(postProcessShader, /dofAperture/);
  assert.match(postProcessShader, /cameraNear/);
  assert.match(postProcessShader, /cameraFar/);
  assert.match(postProcessShader, /fn dof_circle_of_confusion/);
  assert.doesNotMatch(postProcessShader, /fn dof_signed_coc/);
  assert.match(postProcessShader, /fn dof_near_weight/);
  assert.match(postProcessShader, /fn dof_far_weight/);
  assert.match(postProcessShader, /fn dof_blur_radius_for_pixel/);
  assert.match(postProcessShader, /fn dof_blur_sample_dynamic/);
  assert.match(postProcessShader, /sparseThreshold/);
  assert.match(postProcessShader, /postProcessDofQuarterBlur/);
  assert.match(postProcessShader, /fn dof_quarter_downsample/);
  assert.match(postProcessShader, /fn dof_quarter_blur_horizontal/);
  assert.match(postProcessShader, /fn dof_quarter_blur_vertical/);
  assert.match(postProcessShader, /nearHaloInfluence/);
  assert.doesNotMatch(postProcessShader, /dofMidEnabled/);

  // Quarter-res pipelines
  assert.match(postProcessSource, /dofQuarterDownsamplePipeline/);
  assert.match(postProcessSource, /createPostProcessDofQuarterTexture/);
  assert.match(postProcessSource, /Math\.ceil\(width \/ 4\)/);
});
