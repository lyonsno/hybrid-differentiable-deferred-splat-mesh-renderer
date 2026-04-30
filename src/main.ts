import {
  createAlphaDensityRefreshState,
  shouldRefreshAlphaDensity,
  type AlphaDensityRefreshState,
} from "./alphaDensityRefresh.js";
import { initGPU, resizeCanvas, GPU } from "./gpu.js";
import {
  bindCameraControls,
  cameraHasActiveInput,
  createCamera,
  getProjectionMatrix,
  getViewMatrix,
  updateCamera,
} from "./camera.js";
import { createStorageBuffer, createTexture2D, createUniformBuffer } from "./buffers.js";
import {
  createGpuTileCoveragePlan,
  GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
  writeGpuTileCoverageFrameUniforms,
  type GpuTileCoveragePlan,
} from "./gpuTileCoverage.js";
import {
  createGpuTileCoveragePipelineSkeleton,
  type GpuTileCoveragePipelineSkeleton,
} from "./gpuTileCoverageRenderer.js";
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
  composeFirstSmokeViewProjection,
  configureCameraForSplatBounds,
  createMeshSplatSmokeEvidence,
  createMeshSplatRendererWitness,
  exposeMeshSplatSmokeEvidence,
  exposeMeshSplatRendererWitness,
  writeAlphaDensityCompensatedOpacities,
  type AlphaDensityAccountingMode,
  type AlphaDensityCompensationSummary,
} from "./realSmokeScene.js";
import {
  createSplatPlateRenderer,
  SPLAT_PLATE_FRAME_UNIFORM_BYTES,
  writeSplatPlateFrameUniforms,
} from "./splatPlateRenderer.js";
import { captureViewDepthKey, viewDepthKeyChanged } from "./splatSort.js";
import {
  fetchFirstSmokeSplatPayload,
  uploadSplatAttributeBuffers,
  type SplatAttributes,
  type SplatGpuBuffers,
} from "./splats.js";

const statsEl = document.getElementById("stats")!;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const SORT_BACKEND = "gpu-bitonic-cpu-depth-keys";
const GPU_SORT_SETTLE_MS = 160;
const ALPHA_DENSITY_SETTLE_MS = 160;
const ALPHA_DENSITY_MODE = selectedAlphaDensityMode();
const RENDERER_MODE = selectedRendererMode();
const TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX = 48;

interface ActiveSplatScene {
  attributes: SplatAttributes;
  buffers: SplatGpuBuffers;
  sortedIndexBuffer: GPUBuffer;
  splatBindGroup: GPUBindGroup;
  gpuSort: GpuSortPrototype;
  sortState: SortSettleState;
  effectiveOpacities: Float32Array;
  alphaDensityState: AlphaDensityState;
  tileLocalState: TileLocalSceneState | null;
  rendererMode: RendererMode;
  count: number;
  assetPath: string;
}

interface TileLocalSceneState {
  viewportWidth: number;
  viewportHeight: number;
  plan: GpuTileCoveragePlan;
  pipeline: GpuTileCoveragePipelineSkeleton;
  bindGroup: GPUBindGroup;
  frameUniformBuffer: GPUBuffer;
  frameUniformData: Float32Array;
  projectedBoundsBuffer: GPUBuffer;
  tileHeaderBuffer: GPUBuffer;
  tileRefBuffer: GPUBuffer;
  tileCoverageWeightBuffer: GPUBuffer;
  orderingKeyBuffer: GPUBuffer;
  alphaParamBuffer: GPUBuffer;
  outputTexture: GPUTexture;
  outputView: GPUTextureView;
  needsDispatch: boolean;
}

type RendererMode = "plate" | "tile-local";

interface SortSettleState {
  lastSortedViewDepthKey: Float32Array;
  observedViewDepthKey: Float32Array;
  lastViewDepthChangeMs: number;
  needsSort: boolean;
}

interface AlphaDensityState {
  refreshState: AlphaDensityRefreshState;
  summary: AlphaDensityCompensationSummary;
}

async function main() {
  const gpu = await initGPU(canvas);
  const cam = createCamera();
  const renderDemand = createRenderDemandState();
  const requestFrame = () => {
    if (requestRenderFrame(renderDemand)) {
      requestAnimationFrame(frame);
    }
  };
  bindCameraControls(cam, canvas, requestFrame);
  window.addEventListener("resize", requestFrame);

  const ts = createTimestamps(gpu.device, gpu.timestampsSupported);

  const uniformBuffer = createUniformBuffer(gpu.device, SPLAT_PLATE_FRAME_UNIFORM_BYTES, "frame_uniforms");
  const uniformData = new Float32Array(SPLAT_PLATE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);

  // Bind group layout
  const bgl = gpu.device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });

  const bindGroup = gpu.device.createBindGroup({
    layout: bgl,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  const splatRenderer = createSplatPlateRenderer(gpu.device, gpu.format, bgl);
  statsEl.textContent = "Loading real Scaniverse splats...";
  const assetPath = selectedSplatAssetPath();
  let activeScene: ActiveSplatScene | null = null;

  function replaceSplatScene(attributes: SplatAttributes, sceneAssetPath: string): void {
    const previous = activeScene;
    configureCameraForSplatBounds(cam, attributes.bounds);
    updateCamera(cam, 0);
    const initialView = getViewMatrix(cam);
    const initialViewportWidth = Math.max(canvas.clientWidth || canvas.width || 1, 1);
    const initialViewportHeight = Math.max(canvas.clientHeight || canvas.height || 1, 1);
    const initialAspect = initialViewportWidth / initialViewportHeight;
    const initialViewProj = composeFirstSmokeViewProjection(
      getProjectionMatrix(cam, initialAspect),
      initialView
    );
    const gpuSort = createGpuSortPrototype(gpu.device, attributes.count, "first_smoke_gpu_bitonic_sort");
    const sortState = createSortSettleState(initialView);
    const buffers = uploadSplatAttributeBuffers(gpu.device, attributes);
    const effectiveOpacities = new Float32Array(attributes.count);
    const alphaDensitySummary = writeAlphaDensityCompensatedOpacities(
      effectiveOpacities,
      attributes,
      initialViewProj,
      initialViewportWidth,
      initialViewportHeight,
      REAL_SCANIVERSE_SPLAT_SCALE,
      REAL_SCANIVERSE_MIN_RADIUS_PX,
      ALPHA_DENSITY_MODE
    );
    gpu.device.queue.writeBuffer(buffers.opacityBuffer, 0, effectiveOpacities);
    const sortedIndexBuffer = gpuSort.indexBuffer;
    const splatBindGroup = splatRenderer.createBindGroup({
      positionBuffer: buffers.positionBuffer,
      colorBuffer: buffers.colorBuffer,
      opacityBuffer: buffers.opacityBuffer,
      scaleBuffer: buffers.scaleBuffer,
      rotationBuffer: buffers.rotationBuffer,
      sortedIndexBuffer,
    });
    const tileLocalState =
      RENDERER_MODE === "tile-local"
        ? createTileLocalSceneState(
            gpu.device,
            buffers,
            attributes.count,
            sortedIndexBuffer,
            effectiveOpacities,
            initialViewportWidth,
            initialViewportHeight,
            alphaDensitySummary.compensatedSplatCount
          )
        : null;
    activeScene = {
      attributes,
      buffers,
      sortedIndexBuffer,
      splatBindGroup,
      gpuSort,
      sortState,
      effectiveOpacities,
      alphaDensityState: {
        refreshState: createAlphaDensityRefreshState(
          initialView,
          initialViewportWidth,
          initialViewportHeight
        ),
        summary: alphaDensitySummary,
      },
      tileLocalState,
      rendererMode: RENDERER_MODE,
      count: attributes.count,
      assetPath: sceneAssetPath,
    };
    exposeMeshSplatSmokeEvidence(
      createMeshSplatSmokeEvidence(attributes, attributes.count, sceneAssetPath, SORT_BACKEND),
      canvas
    );
    exposeMeshSplatRendererWitness(
      createMeshSplatRendererWitness(
        attributes,
        attributes.count,
        sceneAssetPath,
        SORT_BACKEND,
        {
          viewProj: initialViewProj,
          viewportWidth: initialViewportWidth,
          viewportHeight: initialViewportHeight,
          splatScale: REAL_SCANIVERSE_SPLAT_SCALE,
          minRadiusPx: REAL_SCANIVERSE_MIN_RADIUS_PX,
        }
      ),
      canvas
    );
    destroySplatScene(previous);
    requestFrame();
  }

  replaceSplatScene(await fetchFirstSmokeSplatPayload(assetPath), assetPath);
  bindDroppedSplatLoading(canvas, async (file) => {
    statsEl.textContent = `Loading ${file.name}...`;
    try {
      replaceSplatScene(await loadDroppedSplatFile(file), `local-file:${file.name}`);
    } catch (err) {
      statsEl.textContent = err instanceof Error ? err.message : String(err);
      requestFrame();
    }
  });

  let depthTexture: GPUTexture | null = null;

  let lastTime = performance.now();
  let frameCount = 0;
  let fpsAccum = 0;
  let displayFps = 0;
  let gpuTimings: Map<string, number> = new Map();

  async function frame() {
    markRenderFrameFinished(renderDemand);
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    const scene = activeScene;
    if (!scene) {
      return;
    }

    frameCount++;
    fpsAccum += dt;
    if (fpsAccum >= 0.5) {
      displayFps = Math.round(frameCount / fpsAccum);
      frameCount = 0;
      fpsAccum = 0;
    }

    updateCamera(cam, dt);

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
    const alphaRefreshed = shouldRefreshAlphaDensity(
      scene.alphaDensityState.refreshState,
      view,
      width,
      height,
      now,
      ALPHA_DENSITY_SETTLE_MS
    );
    if (alphaRefreshed) {
      scene.alphaDensityState.summary = writeAlphaDensityCompensatedOpacities(
        scene.effectiveOpacities,
        scene.attributes,
        viewProj,
        width,
        height,
        REAL_SCANIVERSE_SPLAT_SCALE,
        REAL_SCANIVERSE_MIN_RADIUS_PX,
        ALPHA_DENSITY_MODE
      );
      gpu.device.queue.writeBuffer(scene.buffers.opacityBuffer, 0, scene.effectiveOpacities);
      if (scene.tileLocalState) {
        syncTileLocalAlphaParams(gpu.device.queue, scene.tileLocalState, scene.effectiveOpacities);
        scene.tileLocalState.needsDispatch = true;
      }
    }
    writeSplatPlateFrameUniforms(
      uniformData,
      viewProj,
      width,
      height,
      REAL_SCANIVERSE_SPLAT_SCALE,
      REAL_SCANIVERSE_MIN_RADIUS_PX,
      REAL_SCANIVERSE_NEAR_FADE_START_NDC,
      REAL_SCANIVERSE_NEAR_FADE_END_NDC
    );
    gpu.device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const encoder = gpu.device.createCommandEncoder();
    const gpuSortRefreshed = shouldRefreshGpuSort(scene.sortState, view, now);
    if (gpuSortRefreshed) {
      writeViewDepthSortInput(gpu.device.queue, scene.gpuSort, scene.attributes.positions, view);
      if (scene.tileLocalState) {
        scene.tileLocalState.needsDispatch = true;
      }
      encodeGpuSortPrototype(encoder, scene.gpuSort);
    }

    if (scene.tileLocalState) {
      const tileLocalState = ensureTileLocalSceneState(
        gpu.device,
        scene,
        scene.tileLocalState,
        width,
        height
      );
      scene.tileLocalState = tileLocalState;
      writeGpuTileCoverageFrameUniforms(tileLocalState.frameUniformData, viewProj, tileLocalState.plan);
      gpu.device.queue.writeBuffer(tileLocalState.frameUniformBuffer, 0, tileLocalState.frameUniformData);
      const tileLocalComputePass = encoder.beginComputePass();
      tileLocalState.pipeline.dispatch(tileLocalComputePass, tileLocalState.bindGroup, tileLocalState.plan);
      tileLocalComputePass.end();
      tileLocalState.needsDispatch = false;
    }

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
        ? {
            timestampWrites: {
              querySet: ts.querySet,
              beginningOfPassWriteIndex: 0,
              endOfPassWriteIndex: 1,
            },
          }
        : {}),
    });

    if (writeTimestamps) {
      ts.labels.push("render", "render_end");
    }

    renderPass.setBindGroup(0, bindGroup);
    splatRenderer.draw(renderPass, scene.splatBindGroup, scene.count);
    renderPass.end();

    if (writeTimestamps) {
      resolveTimestamps(encoder, ts);
    }

    gpu.device.queue.submit([encoder.finish()]);

    // Read GPU timings (async, one frame behind)
    if (writeTimestamps) {
      readTimestamps(ts).then((t) => {
        gpuTimings = t;
      });
    }

    // Stats overlay
    const alphaSummary = scene.alphaDensityState.summary;
    let statsText = `${width}×${height} | ${displayFps} fps | ${scene.count.toLocaleString()} real Scaniverse splats | renderer: ${scene.rendererMode} | sort: ${SORT_BACKEND} | alpha: ${alphaSummary.accountingMode} density ${alphaSummary.compensatedSplatCount.toLocaleString()} splats/${alphaSummary.hotTileCount} tiles`;
    if (scene.tileLocalState) {
      statsText += ` | tile-local: ${scene.tileLocalState.plan.tileColumns}x${scene.tileLocalState.plan.tileRows} tiles/${scene.tileLocalState.plan.maxTileRefs} refs`;
    }
    if (gpuTimings.size > 0) {
      for (const [label, ms] of gpuTimings) {
        statsText += ` | ${label}: ${ms.toFixed(2)}ms`;
      }
    }
    statsEl.textContent = statsText;

    if (shouldContinueRendering({
      activeInput: cameraHasActiveInput(cam),
      pendingGpuSort: gpuSortRefreshPending(scene.sortState, view),
      pendingAlphaDensity: scene.alphaDensityState.refreshState.needsRefresh,
      pendingTileLocalCompositor: scene.tileLocalState?.needsDispatch === true,
    })) {
      requestFrame();
    }
  }

  requestFrame();
}

function createSortSettleState(viewMatrix: Float32Array): SortSettleState {
  const viewDepthKey = captureViewDepthKey(viewMatrix);
  return {
    lastSortedViewDepthKey: viewDepthKey,
    observedViewDepthKey: viewDepthKey,
    lastViewDepthChangeMs: Number.NEGATIVE_INFINITY,
    needsSort: true,
  };
}

function shouldRefreshGpuSort(
  state: SortSettleState,
  viewMatrix: Float32Array,
  nowMs: number
): boolean {
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

function createTileLocalSceneState(
  device: GPUDevice,
  buffers: SplatGpuBuffers,
  splatCount: number,
  sortedIndexBuffer: GPUBuffer,
  effectiveOpacities: Float32Array,
  viewportWidth: number,
  viewportHeight: number,
  compensatedSplatCount: number
): TileLocalSceneState {
  const plan = createGpuTileCoveragePlan({
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    splatCount,
    maxTileRefs: Math.max(splatCount, 1),
  });
  const pipeline = createGpuTileCoveragePipelineSkeleton(device, "rgba16float");
  const frameUniformBuffer = createUniformBuffer(
    device,
    GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
    "tile_local_frame_uniforms"
  );
  const frameUniformData = new Float32Array(GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);
  const projectedBoundsData = new Uint32Array(Math.max(plan.splatCount * 4, 4));
  const tileHeaderData = new Uint32Array(Math.max(plan.tileCount * 4, 4));
  const tileRefData = new Uint32Array(Math.max(plan.maxTileRefs * 4, 4));
  const tileCoverageWeightData = new Float32Array(Math.max(plan.maxTileRefs, 4));
  const alphaParamData = new Float32Array(Math.max(plan.maxTileRefs * 4, 4));

  for (let splatId = 0; splatId < plan.splatCount; splatId++) {
    const base = splatId * 4;
    projectedBoundsData[base] = 0;
    projectedBoundsData[base + 1] = 0;
    projectedBoundsData[base + 2] = Math.max(0, plan.tileColumns - 1);
    projectedBoundsData[base + 3] = Math.max(0, plan.tileRows - 1);
    tileRefData[base] = splatId;
    tileRefData[base + 1] = splatId % Math.max(plan.tileCount, 1);
    tileRefData[base + 2] = splatId;
    tileRefData[base + 3] = splatId;
    tileCoverageWeightData[splatId] = 1;
    alphaParamData[base] = effectiveOpacities[splatId] ?? 0;
  }

  if (plan.tileCount > 0) {
    tileHeaderData[0] = splatCount;
    tileHeaderData[1] = plan.tileCount;
    tileHeaderData[2] = plan.tileColumns;
    tileHeaderData[3] = plan.tileRows;
    tileCoverageWeightData[0] = Math.max(1, compensatedSplatCount);
  }

  const projectedBoundsBuffer = createStorageBuffer(
    device,
    projectedBoundsData.buffer,
    "tile_local_projected_bounds"
  );
  const tileHeaderBuffer = createStorageBuffer(device, tileHeaderData.buffer, "tile_local_tile_headers");
  const tileRefBuffer = createStorageBuffer(device, tileRefData.buffer, "tile_local_tile_refs");
  const tileCoverageWeightBuffer = createStorageBuffer(
    device,
    tileCoverageWeightData.buffer,
    "tile_local_tile_coverage_weights"
  );
  const alphaParamBuffer = createStorageBuffer(device, alphaParamData.buffer, "tile_local_alpha_params");
  const outputTexture = createTexture2D(
    device,
    viewportWidth,
    viewportHeight,
    "rgba16float",
    GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
    "tile_local_output"
  );
  const outputView = outputTexture.createView();

  const bindGroup = pipeline.createBindGroup({
    frameUniformBuffer,
    positionBuffer: buffers.positionBuffer,
    projectedBoundsBuffer,
    tileHeaderBuffer,
    tileRefBuffer,
    tileCoverageWeightBuffer,
    orderingKeyBuffer: sortedIndexBuffer,
    alphaParamBuffer,
    outputColorView: outputView,
  });

  return {
    viewportWidth,
    viewportHeight,
    plan,
    pipeline,
    bindGroup,
    frameUniformBuffer,
    frameUniformData,
    projectedBoundsBuffer,
    tileHeaderBuffer,
    tileRefBuffer,
    tileCoverageWeightBuffer,
    orderingKeyBuffer: sortedIndexBuffer,
    alphaParamBuffer,
    outputTexture,
    outputView,
    needsDispatch: true,
  };
}

function ensureTileLocalSceneState(
  device: GPUDevice,
  scene: ActiveSplatScene,
  state: TileLocalSceneState,
  viewportWidth: number,
  viewportHeight: number
): TileLocalSceneState {
  if (state.viewportWidth === viewportWidth && state.viewportHeight === viewportHeight) {
    return state;
  }
  destroyTileLocalSceneState(state);
  return createTileLocalSceneState(
    device,
    scene.buffers,
    scene.count,
    scene.sortedIndexBuffer,
    scene.effectiveOpacities,
    viewportWidth,
    viewportHeight,
    scene.alphaDensityState.summary.compensatedSplatCount
  );
}

function syncTileLocalAlphaParams(
  queue: GPUQueue,
  state: TileLocalSceneState,
  effectiveOpacities: Float32Array
): void {
  const alphaParamData = new Float32Array(Math.max(state.plan.maxTileRefs * 4, 4));
  for (let splatId = 0; splatId < state.plan.splatCount; splatId++) {
    alphaParamData[splatId * 4] = effectiveOpacities[splatId] ?? 0;
  }
  queue.writeBuffer(state.alphaParamBuffer, 0, alphaParamData);
}

function destroyTileLocalSceneState(state: TileLocalSceneState): void {
  state.frameUniformBuffer.destroy();
  state.projectedBoundsBuffer.destroy();
  state.tileHeaderBuffer.destroy();
  state.tileRefBuffer.destroy();
  state.tileCoverageWeightBuffer.destroy();
  state.alphaParamBuffer.destroy();
  state.outputTexture.destroy();
}

function selectedSplatAssetPath(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("asset") || REAL_SCANIVERSE_SMOKE_ASSET_PATH;
}

function selectedAlphaDensityMode(): AlphaDensityAccountingMode {
  const params = new URLSearchParams(window.location.search);
  return params.get("alpha") === "center-tile" ? "center-tile" : "coverage-aware";
}

function selectedRendererMode(): RendererMode {
  const params = new URLSearchParams(window.location.search);
  return params.get("renderer") === "tile-local" ? "tile-local" : "plate";
}

function bindDroppedSplatLoading(
  canvas: HTMLCanvasElement,
  loadFile: (file: File) => Promise<void>
): void {
  window.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types.includes("Files")) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  window.addEventListener("drop", (event) => {
    if (!event.dataTransfer?.files.length) {
      return;
    }
    event.preventDefault();
    void loadFile(event.dataTransfer.files[0]);
  });
  canvas.addEventListener("dragenter", () => {
    canvas.dataset.dropTarget = "true";
  });
  canvas.addEventListener("dragleave", () => {
    delete canvas.dataset.dropTarget;
  });
  canvas.addEventListener("drop", () => {
    delete canvas.dataset.dropTarget;
  });
}

function destroySplatScene(scene: ActiveSplatScene | null): void {
  if (!scene) {
    return;
  }
  if (scene.tileLocalState) {
    destroyTileLocalSceneState(scene.tileLocalState);
  }
  scene.buffers.positionBuffer.destroy();
  scene.buffers.colorBuffer.destroy();
  scene.buffers.opacityBuffer.destroy();
  scene.buffers.scaleBuffer.destroy();
  scene.buffers.rotationBuffer.destroy();
  scene.buffers.originalIdBuffer.destroy();
  scene.gpuSort.keyBuffer.destroy();
  scene.sortedIndexBuffer.destroy();
}

main().catch((err) => {
  document.body.innerHTML = `<pre style="color:red;padding:20px;font-size:16px">${err.message}\n\n${err.stack}</pre>`;
});
