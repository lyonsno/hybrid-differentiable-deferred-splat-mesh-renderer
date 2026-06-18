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
  readTileRefCounters,
  type TileSplatCompositorResources,
  type TileSplatCompositorBindGroups,
} from "./gpuTileSplatCompositor.js";
import { createTileLocalTexturePresenter, type TileLocalTexturePresenter } from "./tileLocalTexturePresenter.js";
import {
  REAL_SCANIVERSE_SPLAT_SCALE,
  REAL_SCANIVERSE_MIN_RADIUS_PX,
  writeAlphaDensityCompensatedOpacities,
  composeFirstSmokeViewProjection,
  type AlphaDensityAccountingMode,
  type AlphaDensityCompensationSummary,
} from "./realSmokeScene.js";
import gbufferDebugPresentShader from "./shaders/gbuffer_debug_present.wgsl?raw";
import screenSpaceNormalsShader from "./shaders/gpu_screen_space_normals.wgsl?raw";
import deferredLightingShader from "./shaders/gpu_deferred_lighting.wgsl?raw";

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
  readonly outputView: GPUTextureView;
  readonly litView: GPUTextureView;
  readonly gbufferDepthView: GPUTextureView;
  readonly gbufferNormalView: GPUTextureView;
  readonly gbufferMaterialView: GPUTextureView;
  /** @internal */
  readonly _internal: ActiveSceneInternal;
}

export interface RenderFrameParams {
  viewProj: Float32Array;
  viewMatrix: Float32Array;
  cameraPosition: Float32Array;
  viewportWidth: number;
  viewportHeight: number;
  lightDirection: [number, number, number];
  lightIntensity: number;
  ambientIntensity: number;
  /** When true, compositor writes transparent background for overlay compositing. */
  transparentBackground?: boolean;
}

export interface SplatRenderer {
  loadScene(
    attributes: SplatAttributes,
    alphaDensityMode: AlphaDensityAccountingMode,
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
  readonly gbufferDebugPresenter: GBufferDebugPresenter;
  /** Call after queue.submit to schedule async counter readback for budget adaptation. */
  scheduleReadback(scene: SplatScene): void;
  resizeViewport(scene: SplatScene, width: number, height: number): SplatScene;
  refreshAlphaDensity(
    scene: SplatScene, viewProj: Float32Array, width: number, height: number,
    alphaDensityMode: AlphaDensityAccountingMode,
  ): void;
  destroyScene(scene: SplatScene): void;
  readonly alphaDensityState: (scene: SplatScene) => AlphaDensityState;
}

export interface GBufferDebugPresenter {
  drawDepth(pass: GPURenderPassEncoder, depthView: GPUTextureView): void;
  drawNormal(pass: GPURenderPassEncoder, depthView: GPUTextureView, normalView: GPUTextureView, materialView: GPUTextureView): void;
  drawRoughness(pass: GPURenderPassEncoder, depthView: GPUTextureView, normalView: GPUTextureView, materialView: GPUTextureView): void;
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

export interface TileBudgetTelemetry {
  multiplier: number;
  budget: number;
  refsWritten: number;
  overflowCount: number;
  utilization: number;
}

export function exposeTileBudgetTelemetry(telemetry: TileBudgetTelemetry): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: { operatorWitness?: Record<string, unknown> };
  };
  const operatorWitness = runtimeWindow.__MESH_SPLAT_SMOKE__?.operatorWitness;
  if (operatorWitness) {
    operatorWitness.tileBudget = telemetry;
  }
  // Post to local telemetry sink (fire-and-forget)
  try {
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ts: Date.now(), ...telemetry }),
    }).catch(() => {});
  } catch { /* dev server may not be running */ }
}

export function exposeOperatorWitnessFrameState(state: {
  frameSerial: number;
  witnessView: string;
  revision: number;
}): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: { operatorWitness?: Record<string, unknown> };
  };
  const operatorWitness = runtimeWindow.__MESH_SPLAT_SMOKE__?.operatorWitness;
  if (operatorWitness) {
    operatorWitness.frameSerial = state.frameSerial;
    operatorWitness.witnessView = state.witnessView;
    operatorWitness.revision = state.revision;
  }
}

// ---------------------------------------------------------------------------
// Internal scene state (not part of the public SplatScene interface)
// ---------------------------------------------------------------------------

const INITIAL_TILE_ENTRY_MULTIPLIER = 2.5;
const ENTRY_HEADROOM_MULTIPLIER = 2.0;
const MAX_TILE_ENTRY_MULTIPLIER = 64; // Hard cap — beyond this, accept tearing
const BUDGET_SHRINK_THRESHOLD_FRAMES = 200;

interface ActiveSceneInternal {
  sortedIndexBuffer: GPUBuffer;
  gpuSort: GpuSortPrototype;
  sortState: SortSettleState;
  effectiveOpacities: Float32Array;
  alphaDensityState: AlphaDensityState;
  tileEntryMultiplier: number;
  budgetShrinkFrameCount: number;
  pendingReadback: boolean;
  needsBudgetRebuild: boolean;
  computeCompositor: {
    resources: TileSplatCompositorResources;
    bindGroups: TileSplatCompositorBindGroups;
    outputTexture: GPUTexture;
    gbufferDepthTexture: GPUTexture;
    gbufferNormalTexture: GPUTexture;
    gbufferMaterialTexture: GPUTexture;
    litTexture: GPUTexture;
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
      { binding: 4, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "uint" } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba16float" } },
    ],
  });
  const pipeline = device.createComputePipeline({
    label: "deferred_lighting_pipeline",
    layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
    compute: { module: mod, entryPoint: "main" },
  });
  const paramsBuffer = device.createBuffer({
    label: "deferred_lighting_params",
    size: 144,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  return {
    encode(
      encoder: GPUCommandEncoder,
      colorView: GPUTextureView,
      depthView: GPUTextureView,
      normalView: GPUTextureView,
      materialView: GPUTextureView,
      litTexture: GPUTexture,
      viewport: [number, number],
      viewProjInverse: Float32Array,
      cameraPos: Float32Array,
      lightDirection: [number, number, number],
      lightIntensity: number,
      ambientIntensity: number,
    ) {
      const params = new Float32Array(36);
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
  cc.litTexture.destroy();
  scene.buffers.positionBuffer.destroy();
  scene.buffers.colorBuffer.destroy();
  scene.buffers.opacityBuffer.destroy();
  scene.buffers.scaleBuffer.destroy();
  scene.buffers.rotationBuffer.destroy();
  scene.buffers.normalBuffer?.destroy();
  scene.buffers.roughnessBuffer?.destroy();
  scene.buffers.metalnessBuffer?.destroy();
  scene.buffers.originalIdBuffer.destroy();
  internal.gpuSort.keyBuffer.destroy();
  internal.sortedIndexBuffer.destroy();
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

  return {
    loadScene(
      attributes: SplatAttributes,
      alphaDensityMode: AlphaDensityAccountingMode,
      initialViewMatrix: Float32Array,
      initialViewProj: Float32Array,
      viewportWidth: number,
      viewportHeight: number,
    ): SplatScene {
      const gpuSort = createGpuSortPrototype(device, attributes.count, "first_smoke_gpu_bitonic_sort");
      const sortState = createSortSettleState(initialViewMatrix);
      const buffers = uploadSplatAttributeBuffers(device, attributes);
      const effectiveOpacities = new Float32Array(attributes.count);

      const alphaDensitySummary = writeAlphaDensityCompensatedOpacities(
        effectiveOpacities,
        attributes,
        initialViewProj,
        viewportWidth,
        viewportHeight,
        REAL_SCANIVERSE_SPLAT_SCALE,
        REAL_SCANIVERSE_MIN_RADIUS_PX,
        alphaDensityMode,
      );
      device.queue.writeBuffer(buffers.opacityBuffer, 0, effectiveOpacities);
      const sortedIndexBuffer = gpuSort.indexBuffer;

      const computePlan = planTileSplatCompositor({
        viewportWidth,
        viewportHeight,
        tileSizePx: 16,
        splatCount: attributes.count,
        tileEntryMultiplier: INITIAL_TILE_ENTRY_MULTIPLIER,
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
        format: "r32uint",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const litTexture = device.createTexture({
        label: "deferred_lit_output",
        size: [viewportWidth, viewportHeight],
        format: "rgba16float",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const computeBindGroups = createTileSplatBindGroups(
        device,
        computeResources,
        {
          positionBuffer: buffers.positionBuffer,
          colorBuffer: buffers.colorBuffer,
          scaleBuffer: buffers.scaleBuffer,
          rotationBuffer: buffers.rotationBuffer,
          opacityBuffer: buffers.opacityBuffer,
          normalBuffer: buffers.normalBuffer,
          roughnessBuffer: buffers.roughnessBuffer,
          metalnessBuffer: buffers.metalnessBuffer,
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
        tileEntryMultiplier: INITIAL_TILE_ENTRY_MULTIPLIER,
        budgetShrinkFrameCount: 0,
        pendingReadback: false,
        needsBudgetRebuild: false,
        computeCompositor: {
          resources: computeResources,
          bindGroups: computeBindGroups,
          outputTexture: computeOutputTexture,
          gbufferDepthTexture,
          gbufferNormalTexture,
          gbufferMaterialTexture,
          litTexture,
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
        outputView: computeOutputTexture.createView(),
        litView: litTexture.createView(),
        gbufferDepthView: gbufferDepthTexture.createView(),
        gbufferNormalView: gbufferNormalTexture.createView(),
        gbufferMaterialView: gbufferMaterialTexture.createView(),
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

      // Upload frame uniforms
      writeTileSplatFrameUniforms(cc.frameUniformData, params.viewProj, cc.resources.plan, {
        transparentBackground: params.transparentBackground,
      });
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

      // Screen-space normal reconstruction + deferred lighting
      const vpInv = mat4Inverse(params.viewProj);
      if (vpInv) {
        if (!scene.hasPerSplatNormals) {
          screenSpaceNormals.encode(
            encoder,
            scene.gbufferDepthView,
            cc.gbufferNormalTexture,
            [cc.resources.plan.viewportWidth, cc.resources.plan.viewportHeight],
            vpInv,
          );
        }
        deferredLighting.encode(
          encoder,
          scene.outputView,
          scene.gbufferDepthView,
          scene.gbufferNormalView,
          scene.gbufferMaterialView,
          cc.litTexture,
          [cc.resources.plan.viewportWidth, cc.resources.plan.viewportHeight],
          vpInv,
          params.cameraPosition,
          params.lightDirection,
          params.lightIntensity,
          params.ambientIntensity,
        );
      }

      // Encode copy of counters to readback buffer (only when not already pending)
      if (!internal.pendingReadback) {
        encoder.copyBufferToBuffer(cc.resources.countersBuffer, 0, cc.resources.countersReadbackBuffer, 0, 16);
      }
    },

    presentTexture(renderPass: GPURenderPassEncoder, textureView: GPUTextureView): void {
      texturePresenter.draw(renderPass, textureView);
    },

    scheduleReadback(scene: SplatScene): void {
      const internal = scene._internal;
      const cc = internal.computeCompositor;
      if (internal.pendingReadback) return;

      internal.pendingReadback = true;
      readTileRefCounters(cc.resources).then((result) => {
        internal.pendingReadback = false;
        const { overflowCount, refsWritten } = result;
        const totalNeeded = refsWritten + overflowCount;
        const splatCount = scene.count;

        // Expose telemetry to smoke harness
        exposeTileBudgetTelemetry({
          multiplier: internal.tileEntryMultiplier,
          budget: cc.resources.plan.maxTotalTileRefs,
          refsWritten,
          overflowCount,
          utilization: cc.resources.plan.maxTotalTileRefs > 0
            ? refsWritten / cc.resources.plan.maxTotalTileRefs
            : 0,
        });

        if (overflowCount > 0 && splatCount > 0) {
          const needed = Math.min(
            (totalNeeded / splatCount) * ENTRY_HEADROOM_MULTIPLIER,
            MAX_TILE_ENTRY_MULTIPLIER,
          );
          if (needed > internal.tileEntryMultiplier) {
            console.log(`[tile-budget] overflow: ${overflowCount} refs dropped, growing ${internal.tileEntryMultiplier.toFixed(1)}x → ${needed.toFixed(1)}x (${totalNeeded} needed, ${cc.resources.plan.maxTotalTileRefs} budget)`);
            internal.tileEntryMultiplier = needed;
            internal.budgetShrinkFrameCount = 0;
            internal.needsBudgetRebuild = true;
          }
        } else if (splatCount > 0 && refsWritten > 0) {
          const utilization = refsWritten / cc.resources.plan.maxTotalTileRefs;
          if (utilization < 0.5) {
            internal.budgetShrinkFrameCount++;
            if (internal.budgetShrinkFrameCount >= BUDGET_SHRINK_THRESHOLD_FRAMES) {
              const target = Math.max(
                INITIAL_TILE_ENTRY_MULTIPLIER,
                (refsWritten / splatCount) * ENTRY_HEADROOM_MULTIPLIER,
              );
              internal.tileEntryMultiplier = Math.max(target, internal.tileEntryMultiplier * 0.9);
              internal.budgetShrinkFrameCount = 0;
              internal.needsBudgetRebuild = true;
            }
          } else {
            internal.budgetShrinkFrameCount = 0;
          }
        }
      }).catch(() => {
        internal.pendingReadback = false;
      });
    },

    get gbufferDebugPresenter(): GBufferDebugPresenter {
      return gbufferDebug;
    },

    resizeViewport(scene: SplatScene, width: number, height: number): SplatScene {
      const internal = scene._internal;
      const cc = internal.computeCompositor;
      const sameSize = cc.resources.plan.viewportWidth === width && cc.resources.plan.viewportHeight === height;
      if (sameSize && !internal.needsBudgetRebuild) {
        return scene;
      }
      internal.needsBudgetRebuild = false;
      // Destroy old compositor textures
      cc.resources.destroy();
      cc.outputTexture.destroy();
      cc.gbufferDepthTexture.destroy();
      cc.gbufferNormalTexture.destroy();
      cc.gbufferMaterialTexture.destroy();
      cc.litTexture.destroy();

      // Recreate at new size
      const computePlan = planTileSplatCompositor({
        viewportWidth: width,
        viewportHeight: height,
        tileSizePx: 16,
        splatCount: scene.count,
        tileEntryMultiplier: internal.tileEntryMultiplier,
      });
      const computeResources = createTileSplatCompositor(device, computePlan, { f16: f16Supported });
      const computeOutputTexture = device.createTexture({
        label: "compute_compositor_output",
        size: [width, height],
        format: "rgba16float",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const gbufferDepthTexture = device.createTexture({
        label: "gbuffer_depth",
        size: [width, height],
        format: "r32float",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const gbufferNormalTexture = device.createTexture({
        label: "gbuffer_normal",
        size: [width, height],
        format: "r32uint",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const gbufferMaterialTexture = device.createTexture({
        label: "gbuffer_material",
        size: [width, height],
        format: "r32uint",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const litTexture = device.createTexture({
        label: "deferred_lit_output",
        size: [width, height],
        format: "rgba16float",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
      const computeBindGroups = createTileSplatBindGroups(
        device,
        computeResources,
        {
          positionBuffer: scene.buffers.positionBuffer,
          colorBuffer: scene.buffers.colorBuffer,
          scaleBuffer: scene.buffers.scaleBuffer,
          rotationBuffer: scene.buffers.rotationBuffer,
          opacityBuffer: scene.buffers.opacityBuffer,
          normalBuffer: scene.buffers.normalBuffer,
          roughnessBuffer: scene.buffers.roughnessBuffer,
          metalnessBuffer: scene.buffers.metalnessBuffer,
          sortedIndexBuffer: internal.sortedIndexBuffer,
        },
        computeOutputTexture,
        { depth: gbufferDepthTexture, normal: gbufferNormalTexture, material: gbufferMaterialTexture },
      );

      internal.computeCompositor = {
        resources: computeResources,
        bindGroups: computeBindGroups,
        outputTexture: computeOutputTexture,
        gbufferDepthTexture,
        gbufferNormalTexture,
        gbufferMaterialTexture,
        litTexture,
        frameUniformData: new Float32Array(TILE_SPLAT_FRAME_UNIFORM_BYTES / 4),
        lastSortedViewProj: null,
        hasSortedRefs: false,
      };

      return {
        attributes: scene.attributes,
        buffers: scene.buffers,
        count: scene.count,
        hasPerSplatNormals: scene.hasPerSplatNormals,
        outputView: computeOutputTexture.createView(),
        litView: litTexture.createView(),
        gbufferDepthView: gbufferDepthTexture.createView(),
        gbufferNormalView: gbufferNormalTexture.createView(),
        gbufferMaterialView: gbufferMaterialTexture.createView(),
        _internal: internal,
      };
    },

    refreshAlphaDensity(
      scene: SplatScene, viewProj: Float32Array, width: number, height: number,
      alphaDensityMode: AlphaDensityAccountingMode,
    ): void {
      const internal = scene._internal;
      internal.alphaDensityState.summary = writeAlphaDensityCompensatedOpacities(
        internal.effectiveOpacities,
        scene.attributes,
        viewProj,
        width,
        height,
        REAL_SCANIVERSE_SPLAT_SCALE,
        REAL_SCANIVERSE_MIN_RADIUS_PX,
        alphaDensityMode,
      );
      device.queue.writeBuffer(scene.buffers.opacityBuffer, 0, internal.effectiveOpacities);
    },

    destroyScene(scene: SplatScene): void {
      destroySceneInternal(scene);
    },

    alphaDensityState(scene: SplatScene): AlphaDensityState {
      return scene._internal.alphaDensityState;
    },
  };
}
