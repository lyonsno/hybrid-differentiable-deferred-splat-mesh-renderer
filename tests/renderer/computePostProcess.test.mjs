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
  assert.match(mainSource, /postProcess\.encode\(\s*activeEncoder,\s*cc\.outputView,\s*cc\.auxView,\s*cc\.postProcessedView,\s*cc\.dofLowResView,\s*cc\.dofBlurScratchView,\s*width,\s*height\s*\)/);
  assert.match(mainSource, /tileLocalPresenter\.draw\(renderPass,\s*computePresentView \?\? scene\.computeCompositor\.postProcessedView\)/);
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

test("compute renderer exposes idle temporal resolve controls and evidence", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const temporalSource = readFileSync(new URL("../../src/temporalResolve.ts", import.meta.url), "utf8");
  const shader = readFileSync(new URL("../../src/shaders/temporal_resolve.wgsl", import.meta.url), "utf8");

  assert.match(html, /id="postprocess-temporal-mode"/);
  assert.match(html, /value="idle" selected/);
  assert.match(html, /id="postprocess-temporal-frames"/);
  assert.match(html, /id="postprocess-temporal-view"/);

  assert.match(mainSource, /interface TemporalResolveControls/);
  assert.match(mainSource, /readTemporalResolveSettings/);
  assert.match(mainSource, /applyTemporalJitterToViewProjection/);
  assert.match(mainSource, /temporalJitterOffsetForFrame/);
  assert.match(mainSource, /resetTemporalResolveHistory/);
  assert.match(mainSource, /pendingTemporalResolve/);
  assert.match(mainSource, /temporalResolve:\s*temporalResolveEvidence/);

  assert.match(temporalSource, /export type TemporalResolveMode = "off" \| "idle" \| "always"/);
  assert.match(temporalSource, /export type TemporalResolveDebugView = "final" \| "history-weight" \| "difference"/);
  assert.match(temporalSource, /createTemporalResolve/);
  assert.match(temporalSource, /createTemporalResolveTexture/);
  assert.match(temporalSource, /writeSettings/);
  assert.match(temporalSource, /historyFrameCount/);

  assert.match(shader, /fn temporal_resolve/);
  assert.match(shader, /texture_storage_2d<rgba16float,\s*write>/);
  assert.match(shader, /historyFrameCount:\s*u32/);
  assert.match(shader, /maxHistoryFrames:\s*u32/);
  assert.match(shader, /DEBUG_VIEW_HISTORY_WEIGHT/);
  assert.match(shader, /DEBUG_VIEW_DIFFERENCE/);
  assert.match(shader, /textureLoad\(currentFrame/);
  assert.match(shader, /textureLoad\(historyFrame/);
});

test("compute renderer exposes two-layer near/far DOF with dynamic kernel radius", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const compositorSource = readFileSync(new URL("../../src/gpuTileSplatCompositor.ts", import.meta.url), "utf8");
  const compositorShader = readFileSync(new URL("../../src/shaders/gpu_tile_splat_composite.wgsl", import.meta.url), "utf8");
  const postProcessSource = readFileSync(new URL("../../src/computePostProcess.ts", import.meta.url), "utf8");
  const postProcessShader = readFileSync(new URL("../../src/shaders/compute_post_process.wgsl", import.meta.url), "utf8");

  // HTML controls: near/far only, no mid, no local/wide
  assert.match(html, /id="postprocess-dof-enabled"/);
  assert.match(html, /id="postprocess-dof-near-enabled"/);
  assert.match(html, /id="postprocess-dof-far-enabled"/);
  assert.doesNotMatch(html, /id="postprocess-dof-mid-enabled"/);
  assert.doesNotMatch(html, /id="postprocess-dof-local-enabled"/);
  assert.doesNotMatch(html, /id="postprocess-dof-wide-enabled"/);
  assert.match(html, /id="postprocess-dof-near-plane"/);
  assert.match(html, /id="postprocess-dof-focus"/);
  assert.match(html, /<span>Focus<\/span>/);
  assert.match(html, /id="postprocess-dof-far-plane"/);
  assert.match(html, /id="postprocess-dof-strength"/);
  assert.match(html, /id="postprocess-dof-near-blur"/);
  assert.doesNotMatch(html, /id="postprocess-dof-mid-blur"/);
  assert.match(html, /id="postprocess-dof-far-blur"/);
  assert.match(html, /id="postprocess-dof-radius"/);
  assert.match(html, /<option value="64">64 px<\/option>/);
  assert.match(html, /<option value="96">96 px<\/option>/);
  assert.match(html, /<option value="128">128 px<\/option>/);
  assert.match(html, /value="depth"/);
  assert.match(html, /value="confidence"/);
  assert.match(html, /value="dof-mask"/);
  assert.match(html, /value="dof-layers"/);
  assert.match(html, /value="dof-near-mask"/);
  assert.doesNotMatch(html, /value="dof-mid-mask"/);
  assert.match(html, /value="dof-far-mask"/);
  assert.match(html, /value="dof-downsample"/);
  assert.match(html, /value="dof-blur-h"/);
  assert.match(html, /value="dof-blur-v-only"/);
  assert.match(html, /value="dof-blur-hv"/);

  // main.ts: aux/dof textures and settings
  assert.match(mainSource, /auxTexture:\s*GPUTexture/);
  assert.match(mainSource, /auxView:\s*GPUTextureView/);
  assert.match(mainSource, /dofLowResTexture:\s*GPUTexture/);
  assert.match(mainSource, /dofLowResView:\s*GPUTextureView/);
  assert.match(mainSource, /dofBlurScratchTexture:\s*GPUTexture/);
  assert.match(mainSource, /dofBlurScratchView:\s*GPUTextureView/);
  assert.match(mainSource, /label:\s*"compute_compositor_aux_depth_confidence"/);
  assert.match(mainSource, /createPostProcessDofTexture\([\s\S]*"compute_compositor_dof_low_res"/);
  assert.match(mainSource, /createPostProcessDofTexture\([\s\S]*"compute_compositor_dof_blur_scratch"/);
  assert.match(mainSource, /computeAuxTexture/);
  assert.match(mainSource, /cc\.postProcess\.encode\(\s*activeEncoder,\s*cc\.outputView,\s*cc\.auxView,\s*cc\.postProcessedView,\s*cc\.dofLowResView,\s*cc\.dofBlurScratchView/);
  assert.match(mainSource, /postProcessDofFocusFromPercent/);
  assert.match(mainSource, /POST_PROCESS_DOF_PLANE_PERCENT_MIN\s*=\s*90/);
  assert.match(mainSource, /POST_PROCESS_DOF_PLANE_PERCENT_MAX\s*=\s*100/);
  assert.match(mainSource, /clampNumber\(percent,\s*POST_PROCESS_DOF_PLANE_PERCENT_MIN,\s*POST_PROCESS_DOF_PLANE_PERCENT_MAX\) \/ 100/);
  assert.match(mainSource, /postProcessDofStrengthFromPercent/);
  assert.match(mainSource, /dofEnabled:\s*controls\.dofEnabled/);
  assert.match(mainSource, /dofNearEnabled:\s*controls\.dofNearEnabled/);
  assert.match(mainSource, /dofFarEnabled:\s*controls\.dofFarEnabled/);
  assert.doesNotMatch(mainSource, /dofMidEnabled/);
  assert.doesNotMatch(mainSource, /dofLocalEnabled/);
  assert.doesNotMatch(mainSource, /dofWideEnabled/);
  assert.match(mainSource, /dofNearPlaneDepth:\s*postProcessDofPlaneFromPercent\(Number\(controls\.dofNearPlane/);
  assert.match(mainSource, /dofFocusDepth:\s*postProcessDofFocusFromPercent/);
  assert.match(mainSource, /dofFarPlaneDepth:\s*postProcessDofPlaneFromPercent\(Number\(controls\.dofFarPlane/);
  assert.match(mainSource, /dofStrength:\s*postProcessDofStrengthFromPercent/);
  assert.match(mainSource, /dofNearBlur:\s*postProcessDofLayerBlurFromPercent\(Number\(controls\.dofNearBlur/);
  assert.match(mainSource, /dofFarBlur:\s*postProcessDofLayerBlurFromPercent\(Number\(controls\.dofFarBlur/);
  assert.match(mainSource, /dofRadius:\s*clampInteger\(Number\(controls\.dofRadius\?\.value \?\? 8\),\s*1,\s*128\)/);
  assert.match(mainSource, /postProcessSettings\.dofEnabled \? 1 : 0/);
  assert.match(mainSource, /postProcessSettings\.dofFocusDepth\.toFixed\(5\)/);
  assert.match(mainSource, /depthConfidence:\s*"rgba16float"/);

  // Compositor: aux output
  assert.match(compositorSource, /outputAuxTexture:\s*GPUTexture/);
  assert.match(compositorSource, /binding:\s*4[\s\S]*storageTexture:\s*\{\s*access:\s*"write-only",\s*format:\s*"rgba16float"\s*\}/);
  assert.match(compositorSource, /outputAuxTexture\.createView\(\)/);
  assert.match(compositorShader, /var outputAux:\s*texture_storage_2d<rgba16float,\s*write>/);
  assert.match(compositorShader, /accumulatedDepth/);
  assert.match(compositorShader, /coverageConfidence/);
  assert.match(compositorShader, /textureStore\(outputAux/);

  // PostProcess TS: two-layer settings, no mid
  assert.match(postProcessSource, /dofEnabled:\s*boolean/);
  assert.match(postProcessSource, /dofFocusDepth:\s*number/);
  assert.match(postProcessSource, /dofStrength:\s*number/);
  assert.match(postProcessSource, /dofRadius:\s*number/);
  assert.match(postProcessSource, /dofNearEnabled:\s*boolean/);
  assert.match(postProcessSource, /dofFarEnabled:\s*boolean/);
  assert.doesNotMatch(postProcessSource, /dofMidEnabled/);
  assert.doesNotMatch(postProcessSource, /dofLocalEnabled/);
  assert.doesNotMatch(postProcessSource, /dofWideEnabled/);
  assert.match(postProcessSource, /dofNearPlaneDepth:\s*number/);
  assert.match(postProcessSource, /dofFarPlaneDepth:\s*number/);
  assert.match(postProcessSource, /dofNearBlur:\s*number/);
  assert.match(postProcessSource, /dofFarBlur:\s*number/);
  assert.doesNotMatch(postProcessSource, /dofMidBlur/);
  assert.match(postProcessSource, /clampInteger\(settings\.dofRadius,\s*1,\s*128\)/);
  assert.match(postProcessSource, /lastSettings:\s*FxaaCasPostProcessSettings/);
  assert.match(postProcessSource, /debugView === "dof-downsample"/);
  assert.match(postProcessSource, /debugView === "dof-blur-h"/);
  assert.match(postProcessSource, /debugView === "dof-blur-v-only"/);
  assert.match(postProcessSource, /debugView === "dof-blur-hv"/);
  assert.match(postProcessSource, /compute_dof_blur_vertical_only_bg/);
  assert.match(postProcessSource, /resource:\s*finalDofBlurView/);
  assert.match(postProcessSource, /inputAuxView:\s*GPUTextureView/);
  assert.match(postProcessSource, /dofLowResView:\s*GPUTextureView/);
  assert.match(postProcessSource, /dofBlurScratchView:\s*GPUTextureView/);
  assert.match(postProcessSource, /dofDownsamplePipeline:\s*GPUComputePipeline/);
  assert.match(postProcessSource, /dofBlurHorizontalPipeline:\s*GPUComputePipeline/);
  assert.match(postProcessSource, /dofBlurVerticalPipeline:\s*GPUComputePipeline/);
  assert.match(postProcessSource, /createPostProcessDofTexture/);
  assert.match(postProcessSource, /Math\.ceil\(width \/ 2\)/);
  assert.match(postProcessSource, /entryPoint:\s*"dof_downsample"/);
  assert.match(postProcessSource, /entryPoint:\s*"dof_blur_horizontal"/);
  assert.match(postProcessSource, /entryPoint:\s*"dof_blur_vertical"/);
  assert.match(postProcessSource, /dispatchWorkgroups\(\s*Math\.ceil\(Math\.ceil\(width \/ 2\) \/ 8\)/);
  assert.match(postProcessSource, /binding:\s*3[\s\S]*texture:\s*\{\s*sampleType:\s*"unfilterable-float"\s*\}/);
  assert.match(postProcessSource, /binding:\s*4[\s\S]*texture:\s*\{\s*sampleType:\s*"unfilterable-float"\s*\}/);
  assert.match(postProcessSource, /size:\s*128/);

  // WGSL shader: two-layer DOF with dynamic kernel
  assert.match(postProcessShader, /@group\(0\) @binding\(3\) var postProcessAux/);
  assert.match(postProcessShader, /@group\(0\) @binding\(4\) var postProcessDofBlur/);
  assert.match(postProcessShader, /textureLoad\(postProcessInput/);
  assert.match(postProcessShader, /textureStore\(postProcessOutput/);
  assert.match(postProcessShader, /dofEnabled:\s*u32/);
  assert.match(postProcessShader, /dofFocusDepth:\s*f32/);
  assert.match(postProcessShader, /dofStrength:\s*f32/);
  assert.match(postProcessShader, /dofRadius:\s*u32/);
  assert.match(postProcessShader, /dofNearEnabled:\s*u32/);
  assert.match(postProcessShader, /dofFarEnabled:\s*u32/);
  assert.doesNotMatch(postProcessShader, /dofMidEnabled/);
  assert.doesNotMatch(postProcessShader, /dofLocalEnabled/);
  assert.doesNotMatch(postProcessShader, /dofWideEnabled/);
  assert.match(postProcessShader, /dofNearPlaneDepth:\s*f32/);
  assert.match(postProcessShader, /dofFarPlaneDepth:\s*f32/);
  assert.match(postProcessShader, /dofNearBlur:\s*f32/);
  assert.match(postProcessShader, /dofFarBlur:\s*f32/);
  assert.doesNotMatch(postProcessShader, /dofMidBlur/);
  assert.match(postProcessShader, /DEBUG_VIEW_DEPTH/);
  assert.match(postProcessShader, /DEBUG_VIEW_CONFIDENCE/);
  assert.match(postProcessShader, /DEBUG_VIEW_DOF_MASK/);
  assert.match(postProcessShader, /DEBUG_VIEW_DOF_LAYERS/);
  assert.match(postProcessShader, /DEBUG_VIEW_DOF_NEAR_MASK/);
  assert.doesNotMatch(postProcessShader, /DEBUG_VIEW_DOF_MID_MASK/);
  assert.match(postProcessShader, /DEBUG_VIEW_DOF_FAR_MASK/);
  assert.match(postProcessShader, /DEBUG_VIEW_DOF_DOWNSAMPLE/);
  assert.match(postProcessShader, /DEBUG_VIEW_DOF_BLUR_H/);
  assert.match(postProcessShader, /DEBUG_VIEW_DOF_BLUR_V_ONLY/);
  assert.match(postProcessShader, /DEBUG_VIEW_DOF_BLUR_HV/);
  assert.match(postProcessShader, /fn dof_circle_of_confusion/);
  assert.match(postProcessShader, /fn dof_signed_coc/);
  assert.match(postProcessShader, /fn dof_near_weight/);
  assert.match(postProcessShader, /fn dof_far_weight/);
  assert.match(postProcessShader, /POST_PROCESS_DOF_DEBUG_MASK_GAMMA\s*=\s*0\.5/);
  assert.match(postProcessShader, /clamp\(settings\.dofRadius,\s*1u,\s*128u\)/);
  assert.match(postProcessShader, /fn dof_debug_mask/);
  assert.match(postProcessShader, /fn load_dof_wide_blur_bilinear/);
  assert.match(postProcessShader, /c00\.rgb \* c00\.a \* w00/);
  assert.match(postProcessShader, /1\.0 - smooth_ramp\(nearPlane,\s*focusDepth,\s*depth\)/);
  assert.match(postProcessShader, /smooth_ramp\(focusDepth,\s*farPlane,\s*depth\)/);
  assert.match(postProcessShader, /settings\.dofNearEnabled != 0u/);
  assert.match(postProcessShader, /settings\.dofFarEnabled != 0u/);
  assert.match(postProcessShader, /settings\.dofNearBlur/);
  assert.match(postProcessShader, /settings\.dofFarBlur/);
  assert.match(postProcessShader, /fn depth_confidence_guided_dof/);
  assert.match(postProcessShader, /fn load_dof_wide_blur/);
  assert.match(postProcessShader, /fn dof_downsample/);
  assert.match(postProcessShader, /fn dof_blur_horizontal/);
  assert.match(postProcessShader, /fn dof_blur_vertical/);
  // Dynamic kernel: per-pixel radius function and dynamic blur sample
  assert.match(postProcessShader, /fn dof_blur_radius_for_pixel/);
  assert.match(postProcessShader, /fn dof_blur_sample_dynamic/);
  assert.match(postProcessShader, /POST_PROCESS_DOF_BLUR_MAX_TAPS\s*=\s*17i/);
  assert.match(postProcessShader, /POST_PROCESS_DOF_BLUR_MAX_HALF_TAPS\s*=\s*8i/);
  // No blend-with-sharp: uses smooth_ramp transition, not mix(sharp, blurred, cocNormalized)
  assert.match(postProcessShader, /smooth_ramp\(transitionStart,\s*transitionEnd,\s*coc\)/);
  assert.doesNotMatch(postProcessShader, /mix\(color,\s*blurred,\s*dofBlend\)/);
  assert.match(postProcessShader, /settings\.debugView == DEBUG_VIEW_DOF_DOWNSAMPLE/);
  assert.match(postProcessShader, /settings\.debugView == DEBUG_VIEW_DOF_BLUR_V_ONLY/);
});

test("DOF controls use occupied-depth plane precision and settings persist", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const postProcessShader = readFileSync(new URL("../../src/shaders/compute_post_process.wgsl", import.meta.url), "utf8");

  for (const id of ["near-plane", "focus", "far-plane"]) {
    assert.match(
      html,
      new RegExp(`id="postprocess-dof-${id}"[^>]*min="90"[^>]*max="100"[^>]*step="0\\.1"`)
    );
  }
  assert.match(mainSource, /const POST_PROCESS_DOF_PLANE_PERCENT_MIN = 90/);
  assert.match(mainSource, /const POST_PROCESS_DOF_PLANE_PERCENT_MAX = 100/);
  assert.match(mainSource, /clampNumber\(percent,\s*POST_PROCESS_DOF_PLANE_PERCENT_MIN,\s*POST_PROCESS_DOF_PLANE_PERCENT_MAX\) \/ 100/);
  assert.match(mainSource, /function formatPostProcessControlPercent/);
  assert.match(mainSource, /toFixed\(1\)\.replace\("\.0",\s*""\)/);

  assert.match(mainSource, /const POST_PROCESS_SETTINGS_STORAGE_KEY/);
  assert.match(mainSource, /function restorePostProcessControlState/);
  assert.match(mainSource, /function persistPostProcessControlState/);
  assert.match(mainSource, /window\.localStorage\.getItem\(POST_PROCESS_SETTINGS_STORAGE_KEY\)/);
  assert.match(mainSource, /window\.localStorage\.setItem\(POST_PROCESS_SETTINGS_STORAGE_KEY/);
  assert.match(mainSource, /restorePostProcessControlState\(controls\)/);
  assert.match(mainSource, /persistPostProcessControlState\(controls\)/);

  // Two-layer near/far blur architecture
  assert.match(postProcessShader, /fn smooth_ramp/);
  assert.match(postProcessShader, /1\.0 - smooth_ramp\(nearPlane,\s*focusDepth,\s*depth\)/);
  assert.match(postProcessShader, /smooth_ramp\(focusDepth,\s*farPlane,\s*depth\)/);
  assert.match(postProcessShader, /fn dof_downsample_tap/);
  assert.match(postProcessShader, /fn dof_blur_sample_dynamic/);
  assert.match(postProcessShader, /fn load_dof_wide_blur\(coord: vec2i,\s*size: vec2u\) -> vec4f/);
  assert.match(postProcessShader, /fn dof_blur_radius_for_pixel/);
});
