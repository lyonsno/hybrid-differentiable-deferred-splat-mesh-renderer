import {
  createGpuSortPrototype,
  encodeGpuSortPrototype,
  writeViewDepthSortInput,
  type GpuSortPrototype,
} from "./gpuSortPrototype.js";
import {
  createAlphaDensityRefreshState,
  type AlphaDensityRefreshState,
} from "./alphaDensityRefresh.js";
import { captureViewDepthKey, viewDepthKeyChanged } from "./splatSort.js";
import {
  uploadSplatAttributeBuffers,
  type SplatAttributes,
  type SplatGpuBuffers,
} from "./splats.js";
import {
  planTileSplatCompositor,
  createTileSplatCompositor,
  createTileSplatBindGroups,
  writeTileSplatFrameUniforms,
  encodeFullComputeCompositorPipeline,
  encodeCompositeOnly,
  TILE_SPLAT_FRAME_UNIFORM_BYTES,
  type TileSplatCompositorResources,
  type TileSplatCompositorBindGroups,
} from "./gpuTileSplatCompositor.js";
import { createTileLocalTexturePresenter, type TileLocalTexturePresenter } from "./tileLocalTexturePresenter.js";
import {
  REAL_SCANIVERSE_SPLAT_SCALE,
  REAL_SCANIVERSE_MIN_RADIUS_PX,
  writeAlphaDensityCompensatedOpacities,
  composeFirstSmokeViewProjection,
  type AlphaDensityCompensationSummary,
} from "./realSmokeScene.js";
import gbufferDebugPresentShader from "./shaders/gbuffer_debug_present.wgsl?raw";
import screenSpaceNormalsShader from "./shaders/gpu_screen_space_normals.wgsl?raw";
import deferredLightingShader from "./shaders/gpu_deferred_lighting.wgsl?raw";
import { createGTAO, DEFAULT_GTAO_PARAMS, type GTAOResources, type GTAOParams } from "./gtao.js";
import { createIBL, type IBLResources } from "./ibl.js";
import bilateralNormalFilterShader from "./shaders/bilateral_normal_filter.wgsl?raw";
import { createBloom, DEFAULT_BLOOM_PARAMS, type BloomResources, type BloomParams } from "./bloom.js";
import { createMaterialCurves, DEFAULT_CURVE, type MaterialCurves, type MaterialCurveParams } from "./materialCurves.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SplatRendererConfig {
  device: GPUDevice;
  format: GPUTextureFormat;
  f16Supported: boolean;
  timestampsSupported: boolean;
}

export interface SplatScene {
  readonly attributes: SplatAttributes;
  readonly buffers: SplatGpuBuffers;
  readonly count: number;
  readonly hasPerSplatNormals: boolean;
  readonly splatScale: number;
  readonly shDegree: number;
  readonly outputView: GPUTextureView;
  readonly litView: GPUTextureView;
  readonly gbufferDepthView: GPUTextureView;
  readonly gbufferNormalView: GPUTextureView;
  readonly gbufferMaterialView: GPUTextureView;
  readonly aoView: GPUTextureView;
  readonly bloomView: GPUTextureView;
  /** @internal */
  readonly _internal: ActiveSceneInternal;
}

export interface RenderFrameParams {
  viewProj: Float32Array;
  viewMatrix: Float32Array;
  projMatrix: Float32Array;
  cameraPosition: Float32Array;
  lightingViewMatrix?: Float32Array;
  lightingViewProj?: Float32Array;
  lightingCameraPosition?: Float32Array;
  normalMatrix?: Float32Array;
  viewportWidth: number;
  viewportHeight: number;
  lightDirection: [number, number, number];
  lightIntensity: number;
  ambientIntensity: number;
  specularOnly?: boolean;
  forceScreenSpaceNormals?: boolean;
  emissiveIntensity?: number;
  emissiveThreshold?: number;
  near?: number;
  far?: number;
  aoRadius?: number;
  aoIntensity?: number;
  aoFalloff?: number;
  aoSlices?: number;
  aoSteps?: number;
  aoThickness?: number;
  exposure?: number;
  envIntensity?: number;
  envRotation?: number;
  bloomThreshold?: number;
  bloomSoftKnee?: number;
  bloomIntensity?: number;
  roughnessCurve?: MaterialCurveParams;
  metalnessCurve?: MaterialCurveParams;
  albedoCurve?: MaterialCurveParams;
}

export interface SplatRenderer {
  loadScene(
    attributes: SplatAttributes,
    initialViewMatrix: Float32Array,
    initialViewProj: Float32Array,
    viewportWidth: number,
    viewportHeight: number,
  ): SplatScene;
  shouldRefreshSort(scene: SplatScene, viewMatrix: Float32Array, nowMs: number): boolean;
  sortRefreshPending(scene: SplatScene, viewMatrix: Float32Array): boolean;
  encodeSort(scene: SplatScene, encoder: GPUCommandEncoder, viewMatrix: Float32Array): void;
  renderFrame(scene: SplatScene, params: RenderFrameParams, encoder: GPUCommandEncoder): void;
  presentTexture(renderPass: GPURenderPassEncoder, textureView: GPUTextureView): void;
  presentBloom(renderPass: GPURenderPassEncoder, bloomView: GPUTextureView, intensity: number): void;
  readonly gbufferDebugPresenter: GBufferDebugPresenter;
  updateEmissive(scene: SplatScene, emissive: Float32Array): void;
  destroyScene(scene: SplatScene): void;
  readonly alphaDensityState: (scene: SplatScene) => AlphaDensityState;
  readonly ibl: IBLResources;
}

export interface GBufferDebugPresenter {
  drawDepth(pass: GPURenderPassEncoder, depthView: GPUTextureView): void;
  drawNormal(pass: GPURenderPassEncoder, depthView: GPUTextureView, normalView: GPUTextureView, materialView: GPUTextureView): void;
  drawRoughness(pass: GPURenderPassEncoder, depthView: GPUTextureView, normalView: GPUTextureView, materialView: GPUTextureView): void;
  drawMetalness(pass: GPURenderPassEncoder, depthView: GPUTextureView, normalView: GPUTextureView, materialView: GPUTextureView): void;
}

export interface AlphaDensityState {
  refreshState: AlphaDensityRefreshState;
  summary: AlphaDensityCompensationSummary;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function mat4Inverse(m: Float32Array): Float32Array | null {
  const o = new Float32Array(16);
  const a00=m[0],a01=m[1],a02=m[2],a03=m[3],a10=m[4],a11=m[5],a12=m[6],a13=m[7];
  const a20=m[8],a21=m[9],a22=m[10],a23=m[11],a30=m[12],a31=m[13],a32=m[14],a33=m[15];
  const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10;
  const b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12;
  const b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30;
  const b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
  let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
  if (Math.abs(det)<1e-10) return null;
  det=1/det;
  o[0]=(a11*b11-a12*b10+a13*b09)*det; o[1]=(a02*b10-a01*b11-a03*b09)*det;
  o[2]=(a31*b05-a32*b04+a33*b03)*det; o[3]=(a22*b04-a21*b05-a23*b03)*det;
  o[4]=(a12*b08-a10*b11-a13*b07)*det; o[5]=(a00*b11-a02*b08+a03*b07)*det;
  o[6]=(a32*b02-a30*b05-a33*b01)*det; o[7]=(a20*b05-a22*b02+a23*b01)*det;
  o[8]=(a10*b10-a11*b08+a13*b06)*det; o[9]=(a01*b08-a00*b10-a03*b06)*det;
  o[10]=(a30*b04-a31*b02+a33*b00)*det; o[11]=(a21*b02-a20*b04-a23*b00)*det;
  o[12]=(a11*b07-a10*b09-a12*b06)*det; o[13]=(a00*b09-a01*b07+a02*b06)*det;
  o[14]=(a31*b01-a30*b03-a32*b00)*det; o[15]=(a20*b03-a21*b01+a22*b00)*det;
  return o;
}

export function roundRuntimeMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GPU_SORT_SETTLE_MS = 160;

// ---------------------------------------------------------------------------
// Sort settle state
// ---------------------------------------------------------------------------

export interface SortSettleState {
  lastSortedViewDepthKey: Float32Array;
  observedViewDepthKey: Float32Array;
  lastViewDepthChangeMs: number;
  needsSort: boolean;
}

export function createSortSettleState(viewMatrix: Float32Array): SortSettleState {
  const key = captureViewDepthKey(viewMatrix);
  return {
    lastSortedViewDepthKey: key,
    observedViewDepthKey: key,
    lastViewDepthChangeMs: Number.NEGATIVE_INFINITY,
    needsSort: true,
  };
}

export function shouldRefreshGpuSort(state: SortSettleState, viewMatrix: Float32Array, nowMs: number): boolean {
  if (viewDepthKeyChanged(state.observedViewDepthKey, viewMatrix)) {
    state.observedViewDepthKey = captureViewDepthKey(viewMatrix);
    state.lastViewDepthChangeMs = nowMs;
  }
  if (!state.needsSort && !viewDepthKeyChanged(state.lastSortedViewDepthKey, viewMatrix)) {
    return false;
  }
  if (!state.needsSort && nowMs - state.lastViewDepthChangeMs < GPU_SORT_SETTLE_MS) {
    return false;
  }
  state.lastSortedViewDepthKey = captureViewDepthKey(viewMatrix);
  state.observedViewDepthKey = state.lastSortedViewDepthKey;
  state.needsSort = false;
  return true;
}

export function gpuSortRefreshPending(state: SortSettleState, viewMatrix: Float32Array): boolean {
  return state.needsSort || viewDepthKeyChanged(state.lastSortedViewDepthKey, viewMatrix);
}

// ---------------------------------------------------------------------------
// Frame timing
// ---------------------------------------------------------------------------

export interface FrameTimingStage {
  readonly name: string;
  readonly elapsedMs: number;
}

export interface FrameTimingDraft {
  readonly startedAtMs: number;
  readonly stages: FrameTimingStage[];
}

export interface FrameTimingSummary {
  readonly totalMs: number;
  readonly stages: readonly FrameTimingStage[];
}

export function startFrameTiming(startedAtMs = performance.now()): FrameTimingDraft {
  return { startedAtMs, stages: [] };
}

export function timeFrameStage<T>(timing: FrameTimingDraft, name: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    timing.stages.push({ name, elapsedMs: roundRuntimeMetric(performance.now() - start) });
  }
}

export function finishFrameTiming(timing: FrameTimingDraft): FrameTimingSummary {
  return {
    totalMs: roundRuntimeMetric(performance.now() - timing.startedAtMs),
    stages: timing.stages,
  };
}

export function formatFrameTimingOverlay(timing: FrameTimingDraft): string {
  let slowest: FrameTimingStage | null = null;
  for (const stage of timing.stages) {
    if (!slowest || stage.elapsedMs > slowest.elapsedMs) {
      slowest = stage;
    }
  }
  const parts = [`app frame: ${roundRuntimeMetric(performance.now() - timing.startedAtMs)}ms`];
  if (slowest) {
    parts.push(`slowest app stage: ${slowest.name} ${slowest.elapsedMs}ms`);
  }
  return parts.join(" | ");
}

export function exposeOperatorWitnessFrameTimings(frameTimings: FrameTimingSummary): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: { operatorWitness?: Record<string, unknown> };
  };
  const operatorWitness = runtimeWindow.__MESH_SPLAT_SMOKE__?.operatorWitness;
  if (operatorWitness) {
    operatorWitness.frameTimings = frameTimings;
  }
}

// ---------------------------------------------------------------------------
// Internal scene state (not part of the public SplatScene interface)
// ---------------------------------------------------------------------------

interface ActiveSceneInternal {
  sortedIndexBuffer: GPUBuffer;
  gpuSort: GpuSortPrototype;
  sortState: SortSettleState;
  effectiveOpacities: Float32Array;
  alphaDensityState: AlphaDensityState;
  computeCompositor: {
    resources: TileSplatCompositorResources;
    bindGroups: TileSplatCompositorBindGroups;
    outputTexture: GPUTexture;
    gbufferDepthTexture: GPUTexture;
    gbufferNormalTexture: GPUTexture;
    gbufferMaterialTexture: GPUTexture;
    filteredNormalTexture: GPUTexture;
    litTexture: GPUTexture;
    gtao: GTAOResources;
    gtaoFrameCounter: number;
    bloom: BloomResources;
    frameUniformData: Float32Array;
    lastSortedViewProj: Float32Array | null;
    hasSortedRefs: boolean;
  };
}

// ---------------------------------------------------------------------------
// Screen-space normals compute pass
// ---------------------------------------------------------------------------

function createScreenSpaceNormalsPass(device: GPUDevice) {
  const mod = device.createShaderModule({
    label: "screen_space_normals_shader",
    code: screenSpaceNormalsShader,
  });
  const bgl = device.createBindGroupLayout({
    label: "screen_space_normals_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "r32uint" } },
    ],
  });
  const pipeline = device.createComputePipeline({
    label: "screen_space_normals_pipeline",
    layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
    compute: { module: mod, entryPoint: "main" },
  });
  const paramsBuffer = device.createBuffer({
    label: "screen_space_normals_params",
    size: 80,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  return {
    encode(
      encoder: GPUCommandEncoder,
      depthView: GPUTextureView,
      normalTexture: GPUTexture,
      viewport: [number, number],
      viewProjInverse: Float32Array,
    ) {
      const params = new Float32Array(20);
      params[0] = viewport[0];
      params[1] = viewport[1];
      params[2] = 0.1;
      params[3] = 100.0;
      params.set(viewProjInverse, 4);
      device.queue.writeBuffer(paramsBuffer, 0, params);
      const bg = device.createBindGroup({
        layout: bgl,
        entries: [
          { binding: 0, resource: { buffer: paramsBuffer } },
          { binding: 1, resource: depthView },
          { binding: 2, resource: normalTexture.createView() },
        ],
      });
      const pass = encoder.beginComputePass({ label: "screen_space_normals" });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil(viewport[0] / 8), Math.ceil(viewport[1] / 8));
      pass.end();
    },
  };
}

// ---------------------------------------------------------------------------
// Bilateral normal filter
// ---------------------------------------------------------------------------

function createBilateralNormalFilter(device: GPUDevice) {
  const mod = device.createShaderModule({ label: "bilateral_normal_filter", code: bilateralNormalFilterShader });
  const bgl = device.createBindGroupLayout({
    label: "bilateral_normal_filter_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "uint" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "r32uint" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
    ],
  });
  const pipeline = device.createComputePipeline({
    label: "bilateral_normal_filter_pipeline",
    layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
    compute: { module: mod, entryPoint: "main" },
  });
  const paramsBuffer = device.createBuffer({
    label: "bilateral_normal_filter_params",
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  return {
    encode(
      encoder: GPUCommandEncoder,
      inputNormalView: GPUTextureView,
      depthView: GPUTextureView,
      outputNormalTexture: GPUTexture,
      viewport: [number, number],
    ) {
      const params = new Float32Array(8);
      params[0] = viewport[0];
      params[1] = viewport[1];
      params[2] = 2.0;  // spatialSigma
      params[3] = 0.05; // depthSigma
      params[4] = 0.3;  // normalSigma
      params[5] = 2.0;  // kernelRadius
      device.queue.writeBuffer(paramsBuffer, 0, params);
      const bg = device.createBindGroup({
        layout: bgl,
        entries: [
          { binding: 0, resource: inputNormalView },
          { binding: 1, resource: depthView },
          { binding: 2, resource: outputNormalTexture.createView() },
          { binding: 3, resource: { buffer: paramsBuffer } },
        ],
      });
      const pass = encoder.beginComputePass({ label: "bilateral_normal_filter" });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil(viewport[0] / 8), Math.ceil(viewport[1] / 8));
      pass.end();
    },
  };
}

// ---------------------------------------------------------------------------
// Deferred lighting compute pass
// ---------------------------------------------------------------------------

function createDeferredLightingPass(device: GPUDevice) {
  const mod = device.createShaderModule({
    label: "deferred_lighting_shader",
    code: deferredLightingShader,
  });
  const bgl = device.createBindGroupLayout({
    label: "deferred_lighting_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "float" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "uint" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "uint" } }, // material+emissive (rgba32uint)
      { binding: 5, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba16float" } },
      { binding: 6, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "float" } }, // AO + bent normal (rgba16float)
      { binding: 7, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "float" } }, // env map (equirect, rgba16float)
      { binding: 8, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } }, // BRDF LUT (rgba16float, textureLoad)
      { binding: 9, visibility: GPUShaderStage.COMPUTE, sampler: { type: "filtering" } }, // env sampler
      { binding: 10, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "float" } }, // bloom (half-res)
      { binding: 11, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "float", viewDimension: "1d" } }, // roughness LUT
      { binding: 12, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "float", viewDimension: "1d" } }, // metalness LUT
      { binding: 13, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "float", viewDimension: "1d" } }, // albedo LUT
    ],
  });
  const pipeline = device.createComputePipeline({
    label: "deferred_lighting_pipeline",
    layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
    compute: { module: mod, entryPoint: "main" },
  });
  const paramsBuffer = device.createBuffer({
    label: "deferred_lighting_params",
    size: 176,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  return {
    encode(
      encoder: GPUCommandEncoder,
      colorView: GPUTextureView,
      depthView: GPUTextureView,
      normalView: GPUTextureView,
      materialView: GPUTextureView,
      aoView: GPUTextureView,
      ibl: IBLResources,
      bloomView: GPUTextureView,
      curves: MaterialCurves,
      litTexture: GPUTexture,
      viewport: [number, number],
      viewProjInverse: Float32Array,
      cameraPos: Float32Array,
      lightDirection: [number, number, number],
      lightIntensity: number,
      ambientIntensity: number,
      specularOnly: boolean = false,
      emissiveIntensity: number = 3.0,
      emissiveThreshold: number = 0.05,
      envIntensity: number = 1.0,
      envRotation: number = 0.0,
      exposure: number = 1.0,
    ) {
      const params = new Float32Array(44);
      params[0] = viewport[0];
      params[1] = viewport[1];
      params[2] = 0.65; // roughness (fallback, G-buffer material overrides)
      params[3] = 0.0;  // metallic (fallback)
      params.set(viewProjInverse, 4);
      params[20] = cameraPos[0]; params[21] = cameraPos[1]; params[22] = cameraPos[2];

      params[24] = lightDirection[0]; params[25] = lightDirection[1]; params[26] = lightDirection[2];
      params[28] = 1.0; params[29] = 0.95; params[30] = 0.9; // lightColor (warm white)
      params[31] = lightIntensity;
      params[32] = ambientIntensity; params[33] = ambientIntensity; params[34] = ambientIntensity * 1.1; // ambient (slightly blue)
      params[35] = specularOnly ? 1.0 : 0.0;
      params[36] = emissiveIntensity;
      params[37] = emissiveThreshold;
      params[38] = envIntensity;
      params[39] = envRotation;
      params[40] = exposure;
      device.queue.writeBuffer(paramsBuffer, 0, params);
      const bg = device.createBindGroup({
        layout: bgl,
        entries: [
          { binding: 0, resource: { buffer: paramsBuffer } },
          { binding: 1, resource: colorView },
          { binding: 2, resource: depthView },
          { binding: 3, resource: normalView },
          { binding: 4, resource: materialView },
          { binding: 5, resource: litTexture.createView() },
          { binding: 6, resource: aoView },
          { binding: 7, resource: ibl.envTextureView },
          { binding: 8, resource: ibl.brdfLUTView },
          { binding: 9, resource: ibl.envSampler },
          { binding: 10, resource: bloomView },
          { binding: 11, resource: curves.roughnessLUTView },
          { binding: 12, resource: curves.metalnessLUTView },
          { binding: 13, resource: curves.albedoLUTView },
        ],
      });
      const pass = encoder.beginComputePass({ label: "deferred_lighting" });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil(viewport[0] / 8), Math.ceil(viewport[1] / 8));
      pass.end();
    },
  };
}

// ---------------------------------------------------------------------------
// G-buffer debug presenter
// ---------------------------------------------------------------------------

function createGBufferDebugPresenter(device: GPUDevice, format: GPUTextureFormat): GBufferDebugPresenter {
  const mod = device.createShaderModule({
    label: "gbuffer_debug_present_shader",
    code: gbufferDebugPresentShader,
  });
  const sampler = device.createSampler({ magFilter: "nearest", minFilter: "nearest" });
  const depthBgl = device.createBindGroupLayout({
    label: "gbuffer_debug_depth_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "non-filtering" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "unfilterable-float" } },
    ],
  });
  const normalBgl = device.createBindGroupLayout({
    label: "gbuffer_debug_normal_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "uint" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "uint" } },
    ],
  });
  const depthStencil = { format: "depth32float" as const, depthWriteEnabled: false, depthCompare: "always" as const };
  const depthPipeline = device.createRenderPipeline({
    label: "gbuffer_debug_depth_pipeline",
    layout: device.createPipelineLayout({ bindGroupLayouts: [depthBgl] }),
    vertex: { module: mod, entryPoint: "vs" },
    fragment: { module: mod, entryPoint: "fs_depth", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
    depthStencil,
  });
  const normalPipeline = device.createRenderPipeline({
    label: "gbuffer_debug_normal_pipeline",
    layout: device.createPipelineLayout({ bindGroupLayouts: [depthBgl, normalBgl] }),
    vertex: { module: mod, entryPoint: "vs" },
    fragment: { module: mod, entryPoint: "fs_normal", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
    depthStencil,
  });
  const roughnessPipeline = device.createRenderPipeline({
    label: "gbuffer_debug_roughness_pipeline",
    layout: device.createPipelineLayout({ bindGroupLayouts: [depthBgl, normalBgl] }),
    vertex: { module: mod, entryPoint: "vs" },
    fragment: { module: mod, entryPoint: "fs_roughness", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
    depthStencil,
  });
  const metalnessPipeline = device.createRenderPipeline({
    label: "gbuffer_debug_metalness_pipeline",
    layout: device.createPipelineLayout({ bindGroupLayouts: [depthBgl, normalBgl] }),
    vertex: { module: mod, entryPoint: "vs" },
    fragment: { module: mod, entryPoint: "fs_metalness", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
    depthStencil,
  });

  return {
    drawDepth(pass: GPURenderPassEncoder, depthView: GPUTextureView) {
      const bg = device.createBindGroup({
        layout: depthBgl,
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: depthView },
        ],
      });
      pass.setPipeline(depthPipeline);
      pass.setBindGroup(0, bg);
      pass.draw(3);
    },
    drawNormal(pass: GPURenderPassEncoder, depthView: GPUTextureView, normalView: GPUTextureView, materialView: GPUTextureView) {
      const bg0 = device.createBindGroup({
        layout: depthBgl,
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: depthView },
        ],
      });
      const bg1 = device.createBindGroup({
        layout: normalBgl,
        entries: [
          { binding: 0, resource: normalView },
          { binding: 1, resource: materialView },
        ],
      });
      pass.setPipeline(normalPipeline);
      pass.setBindGroup(0, bg0);
      pass.setBindGroup(1, bg1);
      pass.draw(3);
    },
    drawRoughness(pass: GPURenderPassEncoder, depthView: GPUTextureView, normalView: GPUTextureView, materialView: GPUTextureView) {
      const bg0 = device.createBindGroup({
        layout: depthBgl,
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: depthView },
        ],
      });
      const bg1 = device.createBindGroup({
        layout: normalBgl,
        entries: [
          { binding: 0, resource: normalView },
          { binding: 1, resource: materialView },
        ],
      });
      pass.setPipeline(roughnessPipeline);
      pass.setBindGroup(0, bg0);
      pass.setBindGroup(1, bg1);
      pass.draw(3);
    },
    drawMetalness(pass: GPURenderPassEncoder, depthView: GPUTextureView, normalView: GPUTextureView, materialView: GPUTextureView) {
      const bg0 = device.createBindGroup({
        layout: depthBgl,
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: depthView },
        ],
      });
      const bg1 = device.createBindGroup({
        layout: normalBgl,
        entries: [
          { binding: 0, resource: normalView },
          { binding: 1, resource: materialView },
        ],
      });
      pass.setPipeline(metalnessPipeline);
      pass.setBindGroup(0, bg0);
      pass.setBindGroup(1, bg1);
      pass.draw(3);
    },
  };
}

// ---------------------------------------------------------------------------
// Scene destroy
// ---------------------------------------------------------------------------

function destroySceneInternal(scene: SplatScene): void {
  const internal = scene._internal;
  const cc = internal.computeCompositor;
  cc.resources.destroy();
  cc.outputTexture.destroy();
  cc.gbufferDepthTexture.destroy();
  cc.gbufferNormalTexture.destroy();
  cc.gbufferMaterialTexture.destroy();
  cc.filteredNormalTexture.destroy();
  cc.litTexture.destroy();
  cc.gtao.destroy();
  cc.bloom.destroy();
  scene.buffers.positionBuffer.destroy();
  scene.buffers.opacityBuffer.destroy();
  scene.buffers.scaleBuffer.destroy();
  scene.buffers.rotationBuffer.destroy();
  scene.buffers.materialBuffer.destroy();
  scene.buffers.normalBuffer?.destroy();
  scene.buffers.shDataBuffer.destroy();
  scene.buffers.originalIdBuffer.destroy();
  internal.gpuSort.keyBuffer.destroy();
  internal.sortedIndexBuffer.destroy();
}

// ---------------------------------------------------------------------------
// CPU SH evaluation
// ---------------------------------------------------------------------------

// Real SH basis constants (matches 3DGS reference implementation)
const SH_C1 = 0.4886025119029199;
const SH_C2_0 = 1.0925484305920792;
const SH_C2_1 = 1.0925484305920792;
const SH_C2_2 = 0.31539156525252005;
const SH_C2_3 = 1.0925484305920792;
const SH_C2_4 = 0.5462742152960396;
const SH_C3_0 = 0.5900435899266435;
const SH_C3_1 = 2.890611442640554;
const SH_C3_2 = 0.4570457994644658;
const SH_C3_3 = 0.3731763325901154;
const SH_C3_4 = 0.4570457994644658;
const SH_C3_5 = 1.445305721320277;
const SH_C3_6 = 0.5900435899266435;

function evaluateSHColors(
  output: Float32Array,
  positions: Float32Array,
  dcColors: Float32Array,
  shCoefficients: Float32Array,
  coefficientCount: number,
  count: number,
  cameraPos: Float32Array | readonly number[],
): void {
  const camX = cameraPos[0], camY = cameraPos[1], camZ = cameraPos[2];
  const stride = coefficientCount * 3; // floats per splat in SH buffer
  // Coefficients are stored as [c0_r, c0_g, c0_b, c1_r, c1_g, c1_b, ...]
  // Degree 1: coefficients 0-2 (3 basis functions)
  // Degree 2: coefficients 3-7 (5 basis functions)
  // Degree 3: coefficients 8-14 (7 basis functions)
  const hasDeg2 = coefficientCount >= 8;
  const hasDeg3 = coefficientCount >= 15;

  for (let i = 0; i < count; i++) {
    const p = i * 3;
    // View direction: camera - splatPos, normalized
    let x = camX - positions[p];
    let y = camY - positions[p + 1];
    let z = camZ - positions[p + 2];
    const invLen = 1 / (Math.sqrt(x * x + y * y + z * z) || 1);
    x *= invLen; y *= invLen; z *= invLen;

    const b = i * stride;
    // Degree 1: Y_1^{-1}=y, Y_1^0=z, Y_1^1=x
    let sr = SH_C1 * (shCoefficients[b + 0] * y + shCoefficients[b + 3] * z + shCoefficients[b + 6] * x);
    let sg = SH_C1 * (shCoefficients[b + 1] * y + shCoefficients[b + 4] * z + shCoefficients[b + 7] * x);
    let sb = SH_C1 * (shCoefficients[b + 2] * y + shCoefficients[b + 5] * z + shCoefficients[b + 8] * x);

    if (hasDeg2) {
      // Degree 2 basis: xy, yz, (2zz-xx-yy), xz, (xx-yy)
      const xx = x * x, yy = y * y, zz = z * z, xy = x * y, yz = y * z, xz = x * z;
      const b2_0 = SH_C2_0 * xy;
      const b2_1 = SH_C2_1 * yz;
      const b2_2 = SH_C2_2 * (2 * zz - xx - yy);
      const b2_3 = SH_C2_3 * xz;
      const b2_4 = SH_C2_4 * (xx - yy);
      sr += shCoefficients[b +  9] * b2_0 + shCoefficients[b + 12] * b2_1 + shCoefficients[b + 15] * b2_2 + shCoefficients[b + 18] * b2_3 + shCoefficients[b + 21] * b2_4;
      sg += shCoefficients[b + 10] * b2_0 + shCoefficients[b + 13] * b2_1 + shCoefficients[b + 16] * b2_2 + shCoefficients[b + 19] * b2_3 + shCoefficients[b + 22] * b2_4;
      sb += shCoefficients[b + 11] * b2_0 + shCoefficients[b + 14] * b2_1 + shCoefficients[b + 17] * b2_2 + shCoefficients[b + 20] * b2_3 + shCoefficients[b + 23] * b2_4;
    }

    if (hasDeg3) {
      // Degree 3 basis functions
      const xx = x * x, yy = y * y, zz = z * z;
      const b3_0 = SH_C3_0 * y * (3 * xx - yy);
      const b3_1 = SH_C3_1 * x * y * z;
      const b3_2 = SH_C3_2 * y * (4 * zz - xx - yy);
      const b3_3 = SH_C3_3 * z * (2 * zz - 3 * xx - 3 * yy);
      const b3_4 = SH_C3_4 * x * (4 * zz - xx - yy);
      const b3_5 = SH_C3_5 * z * (xx - yy);
      const b3_6 = SH_C3_6 * x * (xx - 3 * yy);
      sr += shCoefficients[b + 24] * b3_0 + shCoefficients[b + 27] * b3_1 + shCoefficients[b + 30] * b3_2 + shCoefficients[b + 33] * b3_3 + shCoefficients[b + 36] * b3_4 + shCoefficients[b + 39] * b3_5 + shCoefficients[b + 42] * b3_6;
      sg += shCoefficients[b + 25] * b3_0 + shCoefficients[b + 28] * b3_1 + shCoefficients[b + 31] * b3_2 + shCoefficients[b + 34] * b3_3 + shCoefficients[b + 37] * b3_4 + shCoefficients[b + 40] * b3_5 + shCoefficients[b + 43] * b3_6;
      sb += shCoefficients[b + 26] * b3_0 + shCoefficients[b + 29] * b3_1 + shCoefficients[b + 32] * b3_2 + shCoefficients[b + 35] * b3_3 + shCoefficients[b + 38] * b3_4 + shCoefficients[b + 41] * b3_5 + shCoefficients[b + 44] * b3_6;
    }

    output[p]     = Math.max(0, Math.min(1, dcColors[p]     + sr));
    output[p + 1] = Math.max(0, Math.min(1, dcColors[p + 1] + sg));
    output[p + 2] = Math.max(0, Math.min(1, dcColors[p + 2] + sb));
  }
}

// ---------------------------------------------------------------------------
// createSplatRenderer
// ---------------------------------------------------------------------------

export function createSplatRenderer(config: SplatRendererConfig): SplatRenderer {
  const { device, format, f16Supported } = config;

  const texturePresenter: TileLocalTexturePresenter = createTileLocalTexturePresenter(device, format);
  const gbufferDebug = createGBufferDebugPresenter(device, format);
  const screenSpaceNormals = createScreenSpaceNormalsPass(device);
  const deferredLighting = createDeferredLightingPass(device);
  const bilateralFilter = createBilateralNormalFilter(device);
  const ibl = createIBL(device);
  const materialCurves = createMaterialCurves(device);

  // Bloom additive composite presenter (uses linear sampler for upscale from half-res)
  const bloomPresenter = (() => {
    const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
    const bgl = device.createBindGroupLayout({
      label: "bloom_composite_bgl",
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      ],
    });
    const bloomCompShader = `
      @group(0) @binding(0) var samp: sampler;
      @group(0) @binding(1) var tex: texture_2d<f32>;
      struct Params { intensity: f32, };
      @group(0) @binding(2) var<uniform> params: Params;
      struct V { @builtin(position) p: vec4f, @location(0) uv: vec2f, };
      @vertex fn vs(@builtin(vertex_index) vi: u32) -> V {
        var pos = array<vec2f,3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
        var uv = array<vec2f,3>(vec2f(0,1), vec2f(2,1), vec2f(0,-1));
        return V(vec4f(pos[vi], 0, 1), uv[vi]);
      }
      @fragment fn fs(v: V) -> @location(0) vec4f {
        let bloom = textureSample(tex, samp, v.uv).rgb * params.intensity;
        return vec4f(bloom, 0.0);
      }
    `;
    const mod = device.createShaderModule({ label: "bloom_composite", code: bloomCompShader });
    const pipeline = device.createRenderPipeline({
      label: "bloom_composite",
      layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
      vertex: { module: mod, entryPoint: "vs" },
      fragment: {
        module: mod, entryPoint: "fs",
        targets: [{
          format,
          blend: {
            color: { srcFactor: "one", dstFactor: "one", operation: "add" },
            alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" },
          },
        }],
      },
      primitive: { topology: "triangle-list" },
      depthStencil: { format: "depth32float", depthWriteEnabled: false, depthCompare: "always" },
    });
    const intensityBuf = device.createBuffer({ label: "bloom_intensity", size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    return { pipeline, bgl, sampler, intensityBuf };
  })();

  return {
    loadScene(
      attributes: SplatAttributes,
      initialViewMatrix: Float32Array,
      initialViewProj: Float32Array,
      viewportWidth: number,
      viewportHeight: number,
    ): SplatScene {
      const gpuSort = createGpuSortPrototype(device, attributes.count, "first_smoke_gpu_bitonic_sort");
      const sortState = createSortSettleState(initialViewMatrix);
      const buffers = uploadSplatAttributeBuffers(device, attributes);
      const effectiveOpacities = new Float32Array(attributes.count);

      // Use raw opacities — no alpha density compensation.
      // Alpha density comp was over-reducing opacity in dense foliage, causing
      // coverage gaps vs PlayCanvas (which doesn't do this compensation).
      for (let i = 0; i < attributes.count; i++) {
        effectiveOpacities[i] = Math.min(Math.max(attributes.opacities[i], 0), 1);
      }
      const alphaDensitySummary: AlphaDensityCompensationSummary = {
        accountingMode: "coverage-aware",
        tileSizePx: 16,
        alphaMassCap: 0,
        maxTileAlphaMass: 0,
        maxTileSplatCount: 0,
        hotTileCount: 0,
        tileEntryCount: 0,
        maxSplatCoveredTileCount: 0,
        maxCenterTileDroppedCoverageFraction: 0,
        sampleOriginalIds: [],
        compensatedSplatCount: 0,
        minCompensationExponent: 1,
      };
      device.queue.writeBuffer(buffers.opacityBuffer, 0, effectiveOpacities);
      const sortedIndexBuffer = gpuSort.indexBuffer;

      const computePlan = planTileSplatCompositor({
        viewportWidth,
        viewportHeight,
        tileSizePx: 16,
        splatCount: attributes.count,
      });
      const computeResources = createTileSplatCompositor(device, computePlan, { f16: f16Supported });
      const computeOutputTexture = device.createTexture({
        label: "compute_compositor_output",
        size: [viewportWidth, viewportHeight],
        format: "rgba16float",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const gbufferDepthTexture = device.createTexture({
        label: "gbuffer_depth",
        size: [viewportWidth, viewportHeight],
        format: "r32float",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const gbufferNormalTexture = device.createTexture({
        label: "gbuffer_normal",
        size: [viewportWidth, viewportHeight],
        format: "r32uint",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const gbufferMaterialTexture = device.createTexture({
        label: "gbuffer_material",
        size: [viewportWidth, viewportHeight],
        format: "rgba32uint",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const filteredNormalTexture = device.createTexture({
        label: "gbuffer_normal_filtered",
        size: [viewportWidth, viewportHeight],
        format: "r32uint",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const litTexture = device.createTexture({
        label: "deferred_lit_output",
        size: [viewportWidth, viewportHeight],
        format: "rgba16float",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const gtao = createGTAO(device, viewportWidth, viewportHeight);
      const bloom = createBloom(device, viewportWidth, viewportHeight);
      const computeBindGroups = createTileSplatBindGroups(
        device,
        computeResources,
        {
          positionBuffer: buffers.positionBuffer,
          scaleBuffer: buffers.scaleBuffer,
          rotationBuffer: buffers.rotationBuffer,
          opacityBuffer: buffers.opacityBuffer,
          materialBuffer: buffers.materialBuffer,
          normalBuffer: buffers.normalBuffer,
          shDataBuffer: buffers.shDataBuffer,
          sortedIndexBuffer,
        },
        computeOutputTexture,
        { depth: gbufferDepthTexture, normal: gbufferNormalTexture, material: gbufferMaterialTexture },
      );

      const hasPerSplatNormals = attributes.normals !== undefined;

      const internal: ActiveSceneInternal = {
        sortedIndexBuffer,
        gpuSort,
        sortState,
        effectiveOpacities,
        alphaDensityState: {
          refreshState: createAlphaDensityRefreshState(initialViewMatrix, viewportWidth, viewportHeight),
          summary: alphaDensitySummary,
        },
        computeCompositor: {
          resources: computeResources,
          bindGroups: computeBindGroups,
          outputTexture: computeOutputTexture,
          gbufferDepthTexture,
          gbufferNormalTexture,
          gbufferMaterialTexture,
          filteredNormalTexture,
          litTexture,
          gtao,
          gtaoFrameCounter: 0,
          bloom,
          frameUniformData: new Float32Array(TILE_SPLAT_FRAME_UNIFORM_BYTES / 4),
          lastSortedViewProj: null,
          hasSortedRefs: false,
        },
      };

      return {
        attributes,
        buffers,
        count: attributes.count,
        hasPerSplatNormals,
        splatScale: attributes.splatScale ?? 1.0,
        shDegree: buffers.shDegree,
        outputView: computeOutputTexture.createView(),
        litView: litTexture.createView(),
        gbufferDepthView: gbufferDepthTexture.createView(),
        gbufferNormalView: gbufferNormalTexture.createView(),
        gbufferMaterialView: gbufferMaterialTexture.createView(),
        aoView: gtao.aoView,
        bloomView: bloom.bloomView,
        _internal: internal,
      };
    },

    shouldRefreshSort(scene: SplatScene, viewMatrix: Float32Array, nowMs: number): boolean {
      return shouldRefreshGpuSort(scene._internal.sortState, viewMatrix, nowMs);
    },

    sortRefreshPending(scene: SplatScene, viewMatrix: Float32Array): boolean {
      return gpuSortRefreshPending(scene._internal.sortState, viewMatrix);
    },

    encodeSort(scene: SplatScene, encoder: GPUCommandEncoder, viewMatrix: Float32Array): void {
      const internal = scene._internal;
      writeViewDepthSortInput(device.queue, internal.gpuSort, scene.attributes.positions, viewMatrix);
      encodeGpuSortPrototype(encoder, internal.gpuSort);
    },

    renderFrame(scene: SplatScene, params: RenderFrameParams, encoder: GPUCommandEncoder): void {
      const internal = scene._internal;
      const cc = internal.computeCompositor;

      // Upload frame uniforms (SH evaluation happens on GPU in the projection shader)
      writeTileSplatFrameUniforms(cc.frameUniformData, params.viewProj, cc.resources.plan, scene.splatScale, scene.shDegree, params.cameraPosition, params.viewMatrix, params.projMatrix, params.normalMatrix);
      device.queue.writeBuffer(cc.resources.frameUniformBuffer, 0, cc.frameUniformData);

      // Full compositor pipeline or composite-only
      const viewChanged = true; // TODO: re-enable static camera skip after debugging
      if (viewChanged || !cc.hasSortedRefs) {
        encodeFullComputeCompositorPipeline(encoder, cc.resources, cc.bindGroups);
        cc.lastSortedViewProj = new Float32Array(params.viewProj);
        cc.hasSortedRefs = true;
      } else {
        encodeCompositeOnly(encoder, cc.resources, cc.bindGroups);
      }

      // Screen-space normal reconstruction + GTAO + deferred lighting
      const lightingViewMatrix = params.lightingViewMatrix ?? params.viewMatrix;
      const lightingViewProj = params.lightingViewProj ?? params.viewProj;
      const lightingCameraPosition = params.lightingCameraPosition ?? params.cameraPosition;
      const vpInv = mat4Inverse(lightingViewProj);
      if (vpInv) {
        if (!scene.hasPerSplatNormals || params.forceScreenSpaceNormals) {
          screenSpaceNormals.encode(
            encoder,
            scene.gbufferDepthView,
            cc.gbufferNormalTexture,
            [cc.resources.plan.viewportWidth, cc.resources.plan.viewportHeight],
            vpInv,
          );
        }

        // Bilateral normal filter: smooth normals using depth as edge guide
        bilateralFilter.encode(
          encoder,
          scene.gbufferNormalView,
          scene.gbufferDepthView,
          cc.filteredNormalTexture,
          [cc.resources.plan.viewportWidth, cc.resources.plan.viewportHeight],
        );
        const filteredNormalView = cc.filteredNormalTexture.createView();

        // GTAO: compute ambient occlusion from G-buffer depth
        cc.gtao.encode(
          encoder,
          scene.gbufferDepthView,
          filteredNormalView,
          [cc.resources.plan.viewportWidth, cc.resources.plan.viewportHeight],
          params.near ?? 0.01,
          params.far ?? 100,
          params.projMatrix,
          lightingViewMatrix,
          {
            ...DEFAULT_GTAO_PARAMS,
            radiusWorld: params.aoRadius ?? DEFAULT_GTAO_PARAMS.radiusWorld,
            intensity: params.aoIntensity ?? DEFAULT_GTAO_PARAMS.intensity,
            thickness: params.aoThickness ?? DEFAULT_GTAO_PARAMS.thickness,
            falloffEnd: params.aoFalloff ?? DEFAULT_GTAO_PARAMS.falloffEnd,
            sliceCount: params.aoSlices ?? DEFAULT_GTAO_PARAMS.sliceCount,
            stepsPerSlice: params.aoSteps ?? DEFAULT_GTAO_PARAMS.stepsPerSlice,
          },
          cc.gtaoFrameCounter++,
        );

        // Bloom: extract+blur from compositor output (has emissive in color channel)
        // Runs before deferred lighting so bloom can feed into AO erasure
        cc.bloom.encode(
          encoder,
          scene.gbufferMaterialView,
          [cc.resources.plan.viewportWidth, cc.resources.plan.viewportHeight],
          {
            threshold: params.bloomThreshold ?? DEFAULT_BLOOM_PARAMS.threshold,
            softKnee: params.bloomSoftKnee ?? DEFAULT_BLOOM_PARAMS.softKnee,
            intensity: params.bloomIntensity ?? DEFAULT_BLOOM_PARAMS.intensity,
          },
          params.emissiveIntensity ?? 3.0,
        );

        // Update material curve LUTs
        materialCurves.update(
          params.roughnessCurve ?? DEFAULT_CURVE,
          params.metalnessCurve ?? DEFAULT_CURVE,
          params.albedoCurve ?? DEFAULT_CURVE,
        );

        deferredLighting.encode(
          encoder,
          scene.outputView,
          scene.gbufferDepthView,
          filteredNormalView,
          scene.gbufferMaterialView,
          cc.gtao.aoView,
          ibl,
          cc.bloom.bloomView,
          materialCurves,
          cc.litTexture,
          [cc.resources.plan.viewportWidth, cc.resources.plan.viewportHeight],
          vpInv,
          lightingCameraPosition,
          params.lightDirection,
          params.lightIntensity,
          params.ambientIntensity,
          params.specularOnly ?? false,
          params.emissiveIntensity ?? 3.0,
          params.emissiveThreshold ?? 0.05,
          params.envIntensity ?? 1.0,
          params.envRotation ?? 0.0,
          params.exposure ?? 1.0,
        );
      }
    },

    presentTexture(renderPass: GPURenderPassEncoder, textureView: GPUTextureView): void {
      texturePresenter.draw(renderPass, textureView);
    },

    presentBloom(renderPass: GPURenderPassEncoder, bloomView: GPUTextureView, intensity: number): void {
      device.queue.writeBuffer(bloomPresenter.intensityBuf, 0, new Float32Array([intensity, 0, 0, 0]));
      const bg = device.createBindGroup({
        layout: bloomPresenter.bgl,
        entries: [
          { binding: 0, resource: bloomPresenter.sampler },
          { binding: 1, resource: bloomView },
          { binding: 2, resource: { buffer: bloomPresenter.intensityBuf } },
        ],
      });
      renderPass.setPipeline(bloomPresenter.pipeline);
      renderPass.setBindGroup(0, bg);
      renderPass.draw(3);
    },

    get gbufferDebugPresenter(): GBufferDebugPresenter {
      return gbufferDebug;
    },

    get ibl(): IBLResources {
      return ibl;
    },

    updateEmissive(scene: SplatScene, emissive: Float32Array): void {
      // Emissive lives at the tail of each splat's shData stride:
      // [dc_r, dc_g, dc_b, sh..., emissive_r, emissive_g, emissive_b]
      const shCoeffCount = scene.shDegree > 0 ? (scene.shDegree + 1) ** 2 - 1 : 0;
      const stride = 3 + shCoeffCount * 3 + 3; // floats per splat
      const emissiveOffset = 3 + shCoeffCount * 3; // offset to emissive within stride
      const count = scene.count;

      if (emissive.length !== count * 3) {
        console.warn(`updateEmissive: expected ${count * 3} floats, got ${emissive.length}`);
        return;
      }

      // Build a sparse update: write just the emissive floats at their stride offsets
      const fullData = new Float32Array(count * stride);
      // Read back current shData (we only want to update emissive, keep DC+SH intact)
      // Since we can't readback from GPU efficiently, rebuild the full buffer
      // from the scene attributes
      const dcColors = scene.attributes.colors;
      const shCoeffs = scene.attributes.sh?.coefficients;
      const shStride = shCoeffCount * 3;
      for (let i = 0; i < count; i++) {
        const outBase = i * stride;
        const dcBase = i * 3;
        fullData[outBase] = dcColors[dcBase];
        fullData[outBase + 1] = dcColors[dcBase + 1];
        fullData[outBase + 2] = dcColors[dcBase + 2];
        if (shCoeffs) {
          const shBase = i * shStride;
          for (let j = 0; j < shStride; j++) {
            fullData[outBase + 3 + j] = shCoeffs[shBase + j];
          }
        }
        const emBase = outBase + emissiveOffset;
        fullData[emBase] = emissive[dcBase];
        fullData[emBase + 1] = emissive[dcBase + 1];
        fullData[emBase + 2] = emissive[dcBase + 2];
      }
      device.queue.writeBuffer(scene.buffers.shDataBuffer, 0, fullData);
    },

    destroyScene(scene: SplatScene): void {
      destroySceneInternal(scene);
    },

    alphaDensityState(scene: SplatScene): AlphaDensityState {
      return scene._internal.alphaDensityState;
    },
  };
}
