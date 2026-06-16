import { initGPU, resizeCanvas, GPU } from "./gpu.js";
import {
  bindCameraControls,
  cameraHasActiveInput,
  createCamera,
  getProjectionMatrix,
  getViewMatrix,
  panCamera,
  rotateCameraView,
  updateCamera,
  positionCameraFromTarget,
} from "./camera.js";
import { handleDoubleClickPivot } from "./clickToPivot.js";
import {
  createGpuSortPrototype,
  encodeGpuSortPrototype,
  writeViewDepthSortInput,
  type GpuSortPrototype,
} from "./gpuSortPrototype.js";
import { loadDroppedSplatFile } from "./localPly.js";
import {
  createRenderDemandState,
  markRenderFrameFinished,
  requestRenderFrame,
  shouldContinueRendering,
} from "./renderDemand.js";
import { createTimestamps, resolveTimestamps, readTimestamps, TimestampHelper } from "./timestamps.js";
import {
  REAL_SCANIVERSE_MIN_RADIUS_PX,
  REAL_SCANIVERSE_NEAR_FADE_END_NDC,
  REAL_SCANIVERSE_NEAR_FADE_START_NDC,
  REAL_SCANIVERSE_SMOKE_ASSET_PATH,
  REAL_SCANIVERSE_SPLAT_SCALE,
  applyRealScaniverseWitnessView,
  composeFirstSmokeViewProjection,
  configureCameraForSplatBounds,
  createMeshSplatSmokeEvidence,
  createMeshSplatRendererWitness,
  exposeMeshSplatSmokeEvidence,
  exposeMeshSplatRendererWitness,
  writeAlphaDensityCompensatedOpacities,
  type AlphaDensityAccountingMode,
  type AlphaDensityCompensationSummary,
  type RealScaniverseWitnessViewMode,
} from "./realSmokeScene.js";
import {
  createAlphaDensityRefreshState,
  shouldRefreshAlphaDensity,
  type AlphaDensityRefreshState,
} from "./alphaDensityRefresh.js";
import { captureViewDepthKey, viewDepthKeyChanged } from "./splatSort.js";
import {
  fetchFirstSmokeSplatPayload,
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
import { createTileLocalTexturePresenter } from "./tileLocalTexturePresenter.js";
import gbufferDebugPresentShader from "./shaders/gbuffer_debug_present.wgsl?raw";
import screenSpaceNormalsShader from "./shaders/gpu_screen_space_normals.wgsl?raw";
import deferredLightingShader from "./shaders/gpu_deferred_lighting.wgsl?raw";

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function mat4Inverse(m: Float32Array): Float32Array | null {
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

function roundRuntimeMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statsEl = document.getElementById("stats")!;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const SORT_BACKEND = "gpu-bitonic-cpu-depth-keys";
const GPU_SORT_SETTLE_MS = 160;
const ALPHA_DENSITY_SETTLE_MS = 160;

// ---------------------------------------------------------------------------
// URL param helpers
// ---------------------------------------------------------------------------

function selectedSplatAssetPath(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("splat") ?? REAL_SCANIVERSE_SMOKE_ASSET_PATH;
}

function selectedAlphaDensityMode(): AlphaDensityAccountingMode {
  const params = new URLSearchParams(window.location.search);
  return params.get("alpha-density") === "center-tile" ? "center-tile" : "coverage-aware";
}

function selectedRealScaniverseWitnessViewMode(): RealScaniverseWitnessViewMode {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("witness-view");
  if (raw === "dessert-close" || raw === "dessert-porous-close") {
    return raw;
  }
  return "default";
}

function normalizeOperatorWitnessViewMode(mode: string): RealScaniverseWitnessViewMode {
  if (mode === "dessert-close" || mode === "dessert-porous-close") {
    return mode;
  }
  return "default";
}

// ---------------------------------------------------------------------------
// Scene types
// ---------------------------------------------------------------------------

interface ActiveSplatScene {
  attributes: SplatAttributes;
  buffers: SplatGpuBuffers;
  sortedIndexBuffer: GPUBuffer;
  gpuSort: GpuSortPrototype;
  sortState: SortSettleState;
  effectiveOpacities: Float32Array;
  alphaDensityState: AlphaDensityState;
  count: number;
  assetPath: string;
  computeCompositor: {
    resources: TileSplatCompositorResources;
    bindGroups: TileSplatCompositorBindGroups;
    outputTexture: GPUTexture;
    outputView: GPUTextureView;
    gbufferDepthTexture: GPUTexture;
    gbufferDepthView: GPUTextureView;
    gbufferNormalTexture: GPUTexture;
    gbufferNormalView: GPUTextureView;
    gbufferMaterialTexture: GPUTexture;
    gbufferMaterialView: GPUTextureView;
    litTexture: GPUTexture;
    litView: GPUTextureView;
    frameUniformData: Float32Array;
    lastSortedViewProj: Float32Array | null;
    hasSortedRefs: boolean;
  };
}

interface AlphaDensityState {
  refreshState: AlphaDensityRefreshState;
  summary: AlphaDensityCompensationSummary;
}

interface SortSettleState {
  lastSortedViewDepthKey: Float32Array;
  observedViewDepthKey: Float32Array;
  lastViewDepthChangeMs: number;
  needsSort: boolean;
}

// ---------------------------------------------------------------------------
// Frame timing
// ---------------------------------------------------------------------------

interface FrameTimingStage {
  readonly name: string;
  readonly elapsedMs: number;
}

interface FrameTimingDraft {
  readonly startedAtMs: number;
  readonly stages: FrameTimingStage[];
}

interface FrameTimingSummary {
  readonly totalMs: number;
  readonly stages: readonly FrameTimingStage[];
}

function startFrameTiming(startedAtMs = performance.now()): FrameTimingDraft {
  return { startedAtMs, stages: [] };
}

function timeFrameStage<T>(timing: FrameTimingDraft, name: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    timing.stages.push({ name, elapsedMs: roundRuntimeMetric(performance.now() - start) });
  }
}

function finishFrameTiming(timing: FrameTimingDraft): FrameTimingSummary {
  return {
    totalMs: roundRuntimeMetric(performance.now() - timing.startedAtMs),
    stages: timing.stages,
  };
}

function formatFrameTimingOverlay(timing: FrameTimingDraft): string {
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

function exposeOperatorWitnessFrameTimings(frameTimings: FrameTimingSummary): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: { operatorWitness?: Record<string, unknown> };
  };
  const operatorWitness = runtimeWindow.__MESH_SPLAT_SMOKE__?.operatorWitness;
  if (operatorWitness) {
    operatorWitness.frameTimings = frameTimings;
  }
}

// ---------------------------------------------------------------------------
// Sort settle
// ---------------------------------------------------------------------------

function createSortSettleState(viewMatrix: Float32Array): SortSettleState {
  const key = captureViewDepthKey(viewMatrix);
  return {
    lastSortedViewDepthKey: key,
    observedViewDepthKey: key,
    lastViewDepthChangeMs: Number.NEGATIVE_INFINITY,
    needsSort: true,
  };
}

function shouldRefreshGpuSort(state: SortSettleState, viewMatrix: Float32Array, nowMs: number): boolean {
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

function gpuSortRefreshPending(state: SortSettleState, viewMatrix: Float32Array): boolean {
  return state.needsSort || viewDepthKeyChanged(state.lastSortedViewDepthKey, viewMatrix);
}

// ---------------------------------------------------------------------------
// Drag-drop PLY loading
// ---------------------------------------------------------------------------

function bindDroppedSplatLoading(
  canvas: HTMLCanvasElement,
  loadFile: (file: File) => Promise<void>,
): void {
  window.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  window.addEventListener("drop", (event) => {
    if (!event.dataTransfer?.files.length) return;
    event.preventDefault();
    void loadFile(event.dataTransfer.files[0]);
  });
  canvas.addEventListener("dragenter", () => { canvas.dataset.dropTarget = "true"; });
  canvas.addEventListener("dragleave", () => { delete canvas.dataset.dropTarget; });
  canvas.addEventListener("drop", () => { delete canvas.dataset.dropTarget; });
}

// ---------------------------------------------------------------------------
// Scene lifecycle
// ---------------------------------------------------------------------------

function destroySplatScene(scene: ActiveSplatScene | null): void {
  if (!scene) return;
  scene.computeCompositor.resources.destroy();
  scene.computeCompositor.outputTexture.destroy();
  scene.computeCompositor.gbufferDepthTexture.destroy();
  scene.computeCompositor.gbufferNormalTexture.destroy();
  scene.computeCompositor.gbufferMaterialTexture.destroy();
  scene.computeCompositor.litTexture.destroy();
  scene.buffers.positionBuffer.destroy();
  scene.buffers.colorBuffer.destroy();
  scene.buffers.opacityBuffer.destroy();
  scene.buffers.scaleBuffer.destroy();
  scene.buffers.rotationBuffer.destroy();
  scene.buffers.originalIdBuffer.destroy();
  scene.gpuSort.keyBuffer.destroy();
  scene.sortedIndexBuffer.destroy();
}

// ---------------------------------------------------------------------------
// main()
// ---------------------------------------------------------------------------

const ALPHA_DENSITY_MODE = selectedAlphaDensityMode();
const REAL_SCANIVERSE_WITNESS_VIEW = selectedRealScaniverseWitnessViewMode();

async function main() {
  const gpu = await initGPU(canvas);
  const cam = createCamera();

  // Expose camera control for harvest view capture
  (window as unknown as Record<string, unknown>).__MESH_SPLAT_SET_CAMERA__ = (params: {
    azimuth?: number; elevation?: number; distance?: number;
  }) => {
    if (params.azimuth !== undefined) cam.azimuth = params.azimuth;
    if (params.elevation !== undefined) cam.elevation = params.elevation;
    if (params.distance !== undefined) cam.distance = params.distance;
    positionCameraFromTarget(cam);
    requestFrame();
  };

  const renderDemand = createRenderDemandState();
  const requestFrame = () => {
    if (requestRenderFrame(renderDemand)) {
      requestAnimationFrame(frame);
    }
  };
  bindCameraControls(cam, canvas, {
    requestRender: requestFrame,
    onDoubleClick(clickX, clickY, viewportWidth, viewportHeight) {
      if (!activeScene) return;
      handleDoubleClickPivot(cam, activeScene.attributes, clickX, clickY, viewportWidth, viewportHeight);
    },
  });
  window.addEventListener("resize", requestFrame);

  const ts = createTimestamps(gpu.device, gpu.timestampsSupported);

  // ---- Fullscreen texture presenter (blit compute output to screen) ----
  const texturePresenter = createTileLocalTexturePresenter(gpu.device, gpu.format);

  // ---- G-buffer debug presenter (depth / normal / roughness views via G key) ----
  const gbufferDebugPresenter = (() => {
    const mod = gpu.device.createShaderModule({
      label: "gbuffer_debug_present_shader",
      code: gbufferDebugPresentShader,
    });
    const sampler = gpu.device.createSampler({ magFilter: "nearest", minFilter: "nearest" });
    const depthBgl = gpu.device.createBindGroupLayout({
      label: "gbuffer_debug_depth_bgl",
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "non-filtering" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "unfilterable-float" } },
      ],
    });
    const normalBgl = gpu.device.createBindGroupLayout({
      label: "gbuffer_debug_normal_bgl",
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "uint" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "uint" } },
      ],
    });
    const depthStencil = { format: "depth32float" as const, depthWriteEnabled: false, depthCompare: "always" as const };
    const depthPipeline = gpu.device.createRenderPipeline({
      label: "gbuffer_debug_depth_pipeline",
      layout: gpu.device.createPipelineLayout({ bindGroupLayouts: [depthBgl] }),
      vertex: { module: mod, entryPoint: "vs" },
      fragment: { module: mod, entryPoint: "fs_depth", targets: [{ format: gpu.format }] },
      primitive: { topology: "triangle-list" },
      depthStencil,
    });
    const normalPipeline = gpu.device.createRenderPipeline({
      label: "gbuffer_debug_normal_pipeline",
      layout: gpu.device.createPipelineLayout({ bindGroupLayouts: [depthBgl, normalBgl] }),
      vertex: { module: mod, entryPoint: "vs" },
      fragment: { module: mod, entryPoint: "fs_normal", targets: [{ format: gpu.format }] },
      primitive: { topology: "triangle-list" },
      depthStencil,
    });
    const roughnessPipeline = gpu.device.createRenderPipeline({
      label: "gbuffer_debug_roughness_pipeline",
      layout: gpu.device.createPipelineLayout({ bindGroupLayouts: [depthBgl, normalBgl] }),
      vertex: { module: mod, entryPoint: "vs" },
      fragment: { module: mod, entryPoint: "fs_roughness", targets: [{ format: gpu.format }] },
      primitive: { topology: "triangle-list" },
      depthStencil,
    });
    return {
      drawDepth(pass: GPURenderPassEncoder, depthView: GPUTextureView) {
        const bg = gpu.device.createBindGroup({
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
        const bg0 = gpu.device.createBindGroup({
          layout: depthBgl,
          entries: [
            { binding: 0, resource: sampler },
            { binding: 1, resource: depthView },
          ],
        });
        const bg1 = gpu.device.createBindGroup({
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
        const bg0 = gpu.device.createBindGroup({
          layout: depthBgl,
          entries: [
            { binding: 0, resource: sampler },
            { binding: 1, resource: depthView },
          ],
        });
        const bg1 = gpu.device.createBindGroup({
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
  })();

  // ---- G-buffer view mode: cycle with 'G' key ----
  type GBufferViewMode = "color" | "depth" | "normal" | "roughness" | "lit";
  let gbufferViewMode: GBufferViewMode = "color";
  window.addEventListener("keydown", (e) => {
    if (e.key === "g" || e.key === "G") {
      const modes: GBufferViewMode[] = ["color", "depth", "normal", "roughness", "lit"];
      const idx = modes.indexOf(gbufferViewMode);
      gbufferViewMode = modes[(idx + 1) % modes.length];
      console.log(`G-buffer view: ${gbufferViewMode}`);
    }
  });

  // ---- Screen-space normal reconstruction compute pass ----
  const screenSpaceNormals = (() => {
    const mod = gpu.device.createShaderModule({
      label: "screen_space_normals_shader",
      code: screenSpaceNormalsShader,
    });
    const bgl = gpu.device.createBindGroupLayout({
      label: "screen_space_normals_bgl",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "r32uint" } },
      ],
    });
    const pipeline = gpu.device.createComputePipeline({
      label: "screen_space_normals_pipeline",
      layout: gpu.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
      compute: { module: mod, entryPoint: "main" },
    });
    // Params: viewport(8) + nearFar(8) + viewProjInv(64) = 80 bytes
    const paramsBuffer = gpu.device.createBuffer({
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
        gpu.device.queue.writeBuffer(paramsBuffer, 0, params);
        const bg = gpu.device.createBindGroup({
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
  })();

  // ---- Deferred lighting compute pass ----
  const deferredLighting = (() => {
    const mod = gpu.device.createShaderModule({
      label: "deferred_lighting_shader",
      code: deferredLightingShader,
    });
    const bgl = gpu.device.createBindGroupLayout({
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
    const pipeline = gpu.device.createComputePipeline({
      label: "deferred_lighting_pipeline",
      layout: gpu.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
      compute: { module: mod, entryPoint: "main" },
    });
    // 144 bytes: viewport(8) + roughness(4) + metallic(4) + viewProjInv(64) +
    // cameraPos(12) + pad(4) + lightDir(12) + pad(4) + lightColor(12) +
    // lightIntensity(4) + ambientColor(12) + pad(4)
    const paramsBuffer = gpu.device.createBuffer({
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
      ) {
        const params = new Float32Array(36);
        params[0] = viewport[0];
        params[1] = viewport[1];
        params[2] = 0.65; // roughness
        params[3] = 0.0;  // metallic (dielectric)
        params.set(viewProjInverse, 4);
        params[20] = cameraPos[0]; params[21] = cameraPos[1]; params[22] = cameraPos[2];
        params[24] = -0.4; params[25] = -0.7; params[26] = -0.6; // lightDir
        params[28] = 1.0; params[29] = 0.95; params[30] = 0.9; // lightColor
        params[31] = 2.5; // lightIntensity
        params[32] = 0.15; params[33] = 0.15; params[34] = 0.18; // ambientColor
        gpu.device.queue.writeBuffer(paramsBuffer, 0, params);
        const bg = gpu.device.createBindGroup({
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
  })();

  // ---- Scene state ----
  let depthTexture: GPUTexture | null = null;
  let lastTime = performance.now();
  let frameCount = 0;
  let frameSerial = 0;
  let fpsAccum = 0;
  let displayFps = 0;
  let gpuTimings: Map<string, number> = new Map();
  let operatorWitnessViewMode: RealScaniverseWitnessViewMode = REAL_SCANIVERSE_WITNESS_VIEW;
  let operatorWitnessRevision = 0;

  statsEl.textContent = "Loading real Scaniverse splats...";
  const assetPath = selectedSplatAssetPath();
  let activeScene: ActiveSplatScene | null = null;

  // ---- Operator witness view switching ----
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SET_WITNESS_VIEW__?: (mode: string) => {
      applied: boolean;
      witnessView?: RealScaniverseWitnessViewMode;
      revision?: number;
      reason?: string;
    };
    __MESH_SPLAT_APPLY_WITNESS_INTERACTION__?: (interaction: {
      type?: string;
      button?: string;
      dx?: number;
      dy?: number;
    }) => {
      applied: boolean;
      witnessView?: RealScaniverseWitnessViewMode;
      revision?: number;
      reason?: string;
    };
  };
  runtimeWindow.__MESH_SPLAT_SET_WITNESS_VIEW__ = (mode: string) => {
    if (!activeScene) {
      return { applied: false, reason: "scene is not loaded" };
    }
    const nextMode = normalizeOperatorWitnessViewMode(mode);
    configureCameraForSplatBounds(cam, activeScene.attributes.bounds);
    applyRealScaniverseWitnessView(cam, activeScene.attributes.bounds, nextMode);
    updateCamera(cam, 0);
    activeScene.sortState.needsSort = true;
    operatorWitnessViewMode = nextMode;
    operatorWitnessRevision++;
    requestFrame();
    return { applied: true, witnessView: operatorWitnessViewMode, revision: operatorWitnessRevision };
  };
  runtimeWindow.__MESH_SPLAT_APPLY_WITNESS_INTERACTION__ = (interaction) => {
    if (!activeScene) {
      return { applied: false, reason: "scene is not loaded" };
    }
    if (!interaction || interaction.type !== "drag") {
      return { applied: false, reason: `unsupported operator witness interaction: ${interaction?.type ?? "unknown"}` };
    }
    const dx = Number(interaction.dx ?? 0);
    const dy = Number(interaction.dy ?? 0);
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      return { applied: false, reason: "operator witness drag delta must be finite" };
    }
    const button = interaction.button === "middle" || interaction.button === "right" ? interaction.button : "left";
    if (button === "middle" || button === "right") {
      panCamera(cam, dx, dy, canvas.clientWidth || canvas.width || 1, canvas.clientHeight || canvas.height || 1);
    } else {
      rotateCameraView(cam, dx, dy);
    }
    updateCamera(cam, 0);
    activeScene.sortState.needsSort = true;
    operatorWitnessRevision++;
    requestFrame();
    return { applied: true, witnessView: operatorWitnessViewMode, revision: operatorWitnessRevision };
  };

  // ---- Scene loading ----

  async function updateSceneLoadStage(label: string): Promise<void> {
    statsEl.textContent = label;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  async function replaceSplatScene(attributes: SplatAttributes, sceneAssetPath: string): Promise<void> {
    const previous = activeScene;
    await updateSceneLoadStage(`Preparing ${attributes.count.toLocaleString()} splats...`);
    configureCameraForSplatBounds(cam, attributes.bounds);
    applyRealScaniverseWitnessView(cam, attributes.bounds, REAL_SCANIVERSE_WITNESS_VIEW);
    updateCamera(cam, 0);
    const initialView = getViewMatrix(cam);
    const initialViewportWidth = Math.max(canvas.clientWidth || canvas.width || 1, 1);
    const initialViewportHeight = Math.max(canvas.clientHeight || canvas.height || 1, 1);
    const initialAspect = initialViewportWidth / initialViewportHeight;
    const initialViewProj = composeFirstSmokeViewProjection(
      getProjectionMatrix(cam, initialAspect),
      initialView,
    );

    await updateSceneLoadStage(`Creating GPU buffers for ${attributes.count.toLocaleString()} splats...`);
    const gpuSort = createGpuSortPrototype(gpu.device, attributes.count, "first_smoke_gpu_bitonic_sort");
    const sortState = createSortSettleState(initialView);
    const buffers = uploadSplatAttributeBuffers(gpu.device, attributes);
    const effectiveOpacities = new Float32Array(attributes.count);

    await updateSceneLoadStage(`Computing alpha density for ${attributes.count.toLocaleString()} splats...`);
    const alphaDensitySummary = writeAlphaDensityCompensatedOpacities(
      effectiveOpacities,
      attributes,
      initialViewProj,
      initialViewportWidth,
      initialViewportHeight,
      REAL_SCANIVERSE_SPLAT_SCALE,
      REAL_SCANIVERSE_MIN_RADIUS_PX,
      ALPHA_DENSITY_MODE,
    );
    gpu.device.queue.writeBuffer(buffers.opacityBuffer, 0, effectiveOpacities);
    const sortedIndexBuffer = gpuSort.indexBuffer;

    // ---- Create compute compositor ----
    const computePlan = planTileSplatCompositor({
      viewportWidth: initialViewportWidth,
      viewportHeight: initialViewportHeight,
      tileSizePx: 16,
      splatCount: attributes.count,
    });
    const computeResources = createTileSplatCompositor(gpu.device, computePlan, { f16: gpu.f16Supported });
    const computeOutputTexture = gpu.device.createTexture({
      label: "compute_compositor_output",
      size: [initialViewportWidth, initialViewportHeight],
      format: "rgba16float",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    const gbufferDepthTexture = gpu.device.createTexture({
      label: "gbuffer_depth",
      size: [initialViewportWidth, initialViewportHeight],
      format: "r32float",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    const gbufferNormalTexture = gpu.device.createTexture({
      label: "gbuffer_normal",
      size: [initialViewportWidth, initialViewportHeight],
      format: "r32uint",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    const gbufferMaterialTexture = gpu.device.createTexture({
      label: "gbuffer_material",
      size: [initialViewportWidth, initialViewportHeight],
      format: "r32uint",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    const litTexture = gpu.device.createTexture({
      label: "deferred_lit_output",
      size: [initialViewportWidth, initialViewportHeight],
      format: "rgba16float",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    const computeBindGroups = createTileSplatBindGroups(
      gpu.device,
      computeResources,
      {
        positionBuffer: buffers.positionBuffer,
        colorBuffer: buffers.colorBuffer,
        scaleBuffer: buffers.scaleBuffer,
        rotationBuffer: buffers.rotationBuffer,
        opacityBuffer: buffers.opacityBuffer,
        roughnessBuffer: buffers.roughnessBuffer,
        metalnessBuffer: buffers.metalnessBuffer,
        sortedIndexBuffer,
      },
      computeOutputTexture,
      { depth: gbufferDepthTexture, normal: gbufferNormalTexture, material: gbufferMaterialTexture },
    );

    activeScene = {
      attributes,
      buffers,
      sortedIndexBuffer,
      gpuSort,
      sortState,
      effectiveOpacities,
      alphaDensityState: {
        refreshState: createAlphaDensityRefreshState(initialView, initialViewportWidth, initialViewportHeight),
        summary: alphaDensitySummary,
      },
      count: attributes.count,
      assetPath: sceneAssetPath,
      computeCompositor: {
        resources: computeResources,
        bindGroups: computeBindGroups,
        outputTexture: computeOutputTexture,
        outputView: computeOutputTexture.createView(),
        gbufferDepthTexture,
        gbufferDepthView: gbufferDepthTexture.createView(),
        gbufferNormalTexture,
        gbufferNormalView: gbufferNormalTexture.createView(),
        gbufferMaterialTexture,
        gbufferMaterialView: gbufferMaterialTexture.createView(),
        litTexture,
        litView: litTexture.createView(),
        frameUniformData: new Float32Array(TILE_SPLAT_FRAME_UNIFORM_BYTES / 4),
        lastSortedViewProj: null,
        hasSortedRefs: false,
      },
    };
    exposeMeshSplatSmokeEvidence(
      createMeshSplatSmokeEvidence(attributes, attributes.count, sceneAssetPath, SORT_BACKEND),
      canvas,
    );
    exposeMeshSplatRendererWitness(
      createMeshSplatRendererWitness(attributes, attributes.count, sceneAssetPath, SORT_BACKEND, {
        viewProj: initialViewProj,
        viewportWidth: initialViewportWidth,
        viewportHeight: initialViewportHeight,
        splatScale: REAL_SCANIVERSE_SPLAT_SCALE,
        minRadiusPx: REAL_SCANIVERSE_MIN_RADIUS_PX,
      }),
      canvas,
    );
    destroySplatScene(previous);
    requestFrame();
  }

  // ---- Initial load ----
  await replaceSplatScene(await fetchFirstSmokeSplatPayload(assetPath), assetPath);

  bindDroppedSplatLoading(canvas, async (file) => {
    statsEl.textContent = `Loading ${file.name}...`;
    try {
      await replaceSplatScene(await loadDroppedSplatFile(file), `local-file:${file.name}`);
    } catch (err) {
      statsEl.textContent = err instanceof Error ? err.message : String(err);
      requestFrame();
    }
  });

  // ---- Render loop ----
  async function frame() {
    markRenderFrameFinished(renderDemand);
    const now = performance.now();
    const frameTiming = startFrameTiming(now);
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    const scene = activeScene;
    if (!scene) return;

    frameCount++;
    frameSerial++;
    fpsAccum += dt;
    if (fpsAccum >= 0.5) {
      displayFps = Math.round(frameCount / fpsAccum);
      frameCount = 0;
      fpsAccum = 0;
    }

    updateCamera(cam, dt);
    const activeInput = cameraHasActiveInput(cam);
    const { width, height } = resizeCanvas(gpu);
    const aspect = width / height;

    // Recreate depth texture on resize
    if (!depthTexture || depthTexture.width !== width || depthTexture.height !== height) {
      depthTexture?.destroy();
      depthTexture = gpu.device.createTexture({
        size: { width, height },
        format: "depth32float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }

    // Upload uniforms
    const view = getViewMatrix(cam);
    const proj = getProjectionMatrix(cam, aspect);
    const viewProj = composeFirstSmokeViewProjection(proj, view);

    const encoder = gpu.device.createCommandEncoder();

    // GPU sort
    const gpuSortRefreshed = shouldRefreshGpuSort(scene.sortState, view, now);
    if (gpuSortRefreshed) {
      timeFrameStage(frameTiming, "gpu-sort-refresh", () => {
        writeViewDepthSortInput(gpu.device.queue, scene.gpuSort, scene.attributes.positions, view);
        encodeGpuSortPrototype(encoder, scene.gpuSort);
      });
    }
    const pendingGpuSort = gpuSortRefreshPending(scene.sortState, view);

    // ---- Compute compositor pipeline ----
    const cc = scene.computeCompositor;
    writeTileSplatFrameUniforms(cc.frameUniformData, viewProj, cc.resources.plan);
    gpu.device.queue.writeBuffer(cc.resources.frameUniformBuffer, 0, cc.frameUniformData);

    const viewChanged = true; // TODO: re-enable static camera skip after debugging
    if (viewChanged || !cc.hasSortedRefs) {
      encodeFullComputeCompositorPipeline(encoder, cc.resources, cc.bindGroups);
      cc.lastSortedViewProj = new Float32Array(viewProj);
      cc.hasSortedRefs = true;
    } else {
      encodeCompositeOnly(encoder, cc.resources, cc.bindGroups);
    }

    // Screen-space normal reconstruction + deferred lighting
    const vpInv = mat4Inverse(viewProj);
    if (vpInv) {
      screenSpaceNormals.encode(
        encoder,
        cc.gbufferDepthView,
        cc.gbufferNormalTexture,
        [cc.resources.plan.viewportWidth, cc.resources.plan.viewportHeight],
        vpInv,
      );
      deferredLighting.encode(
        encoder,
        cc.outputView,
        cc.gbufferDepthView,
        cc.gbufferNormalView,
        cc.gbufferMaterialView,
        cc.litTexture,
        [cc.resources.plan.viewportWidth, cc.resources.plan.viewportHeight],
        vpInv,
        new Float32Array(cam.position),
      );
    }

    // ---- Present to screen ----
    const textureView = gpu.context.getCurrentTexture().createView();
    const writeTimestamps = ts && !ts.mapping;
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
      ...(writeTimestamps
        ? { timestampWrites: { querySet: ts.querySet, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } }
        : {}),
    });
    if (writeTimestamps) {
      ts.labels.push("render", "render_end");
    }

    // G-buffer debug views or final lit/color output
    if (gbufferViewMode === "depth") {
      gbufferDebugPresenter.drawDepth(renderPass, cc.gbufferDepthView);
    } else if (gbufferViewMode === "normal") {
      gbufferDebugPresenter.drawNormal(renderPass, cc.gbufferDepthView, cc.gbufferNormalView, cc.gbufferMaterialView);
    } else if (gbufferViewMode === "roughness") {
      gbufferDebugPresenter.drawRoughness(renderPass, cc.gbufferDepthView, cc.gbufferNormalView, cc.gbufferMaterialView);
    } else if (gbufferViewMode === "lit") {
      texturePresenter.draw(renderPass, cc.litView);
    } else {
      texturePresenter.draw(renderPass, cc.outputView);
    }
    renderPass.end();

    if (writeTimestamps) {
      resolveTimestamps(encoder, ts);
    }

    timeFrameStage(frameTiming, "queue-submit", () => {
      gpu.device.queue.submit([encoder.finish()]);
    });

    // Read GPU timings (async, one frame behind)
    if (writeTimestamps) {
      readTimestamps(ts).then((t) => { gpuTimings = t; });
    }

    // ---- Stats overlay ----
    const alphaSummary = scene.alphaDensityState.summary;
    let statsText = `${width}x${height} | ${displayFps} fps | ${scene.count.toLocaleString()} real Scaniverse splats | renderer: compute | sort: ${SORT_BACKEND} | alpha: ${alphaSummary.accountingMode} density ${alphaSummary.compensatedSplatCount.toLocaleString()} splats/${alphaSummary.hotTileCount} tiles`;
    const frameTimingOverlay = formatFrameTimingOverlay(frameTiming);
    statsText += ` | ${frameTimingOverlay}`;
    if (gpuTimings.size > 0) {
      for (const [label, ms] of gpuTimings) {
        statsText += ` | ${label}: ${ms.toFixed(2)}ms`;
      }
    }
    statsEl.textContent = statsText;
    exposeOperatorWitnessFrameTimings(finishFrameTiming(frameTiming));

    if (shouldContinueRendering({
      activeInput,
      pendingGpuSort,
      pendingAlphaDensity: scene.alphaDensityState.refreshState.needsRefresh,
    })) {
      requestFrame();
    }
  }

  requestFrame();
}

main().catch((err) => {
  document.body.innerHTML = `<pre style="color:red;padding:20px;font-size:16px">${err.message}\n\n${err.stack}</pre>`;
});
