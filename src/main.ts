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
import { handleDoubleClickPivot } from "./clickToPivot.js";
import { createStorageBuffer, createTexture2D, createUniformBuffer } from "./buffers.js";
import {
  buildDeterministicGpuTileProjectionRetentionArena,
  createGpuTileCoveragePlan,
  GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF,
  GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
  writeGpuTileCoverageFrameUniforms,
  type GpuTileContributorArenaProjectedContributor,
  type GpuTileCoverageDebugMode,
  type GpuTileCoveragePlan,
} from "./gpuTileCoverage.js";
import {
  createGpuTileContributorArenaRuntime,
  packGpuArenaProjectedContributors,
  projectGpuArenaToLegacyCompositorBuffers,
  type GpuTileContributorArenaRuntime,
} from "./gpuTileContributorArenaRuntime.js";
import { adaptGpuArenaRetainedContributors } from "./gpuArenaRetainedListAdapter.js";
import {
  createGpuTileCoveragePipelineSkeleton,
  type GpuTileCoveragePipelineSkeleton,
} from "./gpuTileCoverageRenderer.js";
import {
  createGpuTileCoverageBridgeBuffers,
  writeGpuTileCoverageAlphaParams,
  type TileRefCustodySummary,
  type TileRetentionAudit,
} from "./gpuTileCoverageBridge.js";
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
  shouldDispatchTileLocalCompositor,
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
  summarizeTileLocalDiagnostics,
  type TileLocalDiagnosticSummary,
} from "./rendererFidelityProbes/tileLocalDiagnostics.js";
import {
  buildBandDispatchCacheTrace,
  buildBandPixelOrderTraceRecord,
  type BandDispatchCacheTrace,
  type BandPixelOrderTraceRecord,
} from "./rendererFidelityProbes/bandOrderTrace.js";
import {
  buildFinalColorAccumulationTraceRecord,
  buildPerPixelFinalColorAccumulationTrace,
  buildPerPixelFinalColorAccumulationTraces,
  type PixelFinalAccumulationTraceRecord,
} from "./rendererFidelityProbes/finalAccumulationTrace.js";
import { buildDeadSplatElectorLedger } from "./rendererFidelityProbes/deadSplatElectorLedger.js";
import { buildRetainedToOrderedSurvivalLedger } from "./rendererFidelityProbes/retainedToOrderedSurvivalLedger.js";
import { buildGpuLiveAnchorContributorTraces } from "./rendererFidelityProbes/gpuLiveAnchorTrace.js";
import {
  formatTileLocalBudgetPair,
  resolveTileLocalBudgetConfig,
} from "./tileLocalBudgetConfig.js";
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
import {
  buildTileLocalPrepassBridge,
  captureTileLocalPrepassBridgeSignature,
  tileLocalPrepassBridgeSignatureChanged,
  type TileLocalPrepassBridge,
  type TileLocalPrepassBudgetDiagnostics,
} from "./tileLocalPrepassBridge.js";
import { createTileLocalTexturePresenter } from "./tileLocalTexturePresenter.js";
import {
  splatAttributesFromFixture,
  configureCameraForFixture,
  SHAPE_WITNESS_SPLAT_SCALE,
  SHAPE_WITNESS_MIN_RADIUS_PX,
  SHAPE_WITNESS_NEAR_FADE_START_NDC as SHAPE_WITNESS_NEAR_FADE_START,
  SHAPE_WITNESS_NEAR_FADE_END_NDC as SHAPE_WITNESS_NEAR_FADE_END,
} from "./rendererFidelityProbes/syntheticShapeLoader.js";
import { getShapeFixture } from "./syntheticShapeFixtures.js";

const statsEl = document.getElementById("stats")!;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const SORT_BACKEND = "gpu-bitonic-cpu-depth-keys";
const TILE_LOCAL_ORDERING_BACKEND = "gpu-sorted-index-rank-inversion";
const GPU_SORT_SETTLE_MS = 160;
const ALPHA_DENSITY_SETTLE_MS = 160;
const ALPHA_DENSITY_MODE = selectedAlphaDensityMode();
const RENDERER_MODE = selectedRendererMode();
const TILE_LOCAL_DEBUG_MODE = selectedTileLocalDebugMode();
const REQUESTED_ARENA_BACKEND = selectedArenaBackend();
const REAL_SCANIVERSE_WITNESS_VIEW = selectedRealScaniverseWitnessViewMode();
const TILE_LOCAL_BUDGET_CONFIG = resolveTileLocalBudgetConfig(new URLSearchParams(window.location.search));
const TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX = TILE_LOCAL_BUDGET_CONFIG.tileSizePx;
const TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE = TILE_LOCAL_BUDGET_CONFIG.maxRefsPerTile;
const TILE_LOCAL_TRACE_ANCHORS = selectedTileLocalTraceAnchors();
const TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES = 1;
const TILE_LOCAL_PROVISIONAL_MAX_SPLATS = 150_000;
const TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES = 20_000_000;
const TILE_LOCAL_UNSAFE = selectedTileLocalUnsafeMode();
const GPU_LIVE_POINT_SIGMA_PX = 10;
const GPU_LIVE_POINT_SUPPORT_RADIUS_PX = GPU_LIVE_POINT_SIGMA_PX * 3;

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
  tileLocalDisabledReason: string | null;
  tileLocalLastSkipReason: string | null;
  tileLocalLastSkipSignature: string | null;
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
  projectedBoundsBuffer: GPUBuffer | null;
  tileHeaderBuffer: GPUBuffer;
  tileHeaderData: Uint32Array;
  tileRefBuffer: GPUBuffer;
  tileCoverageWeightBuffer: GPUBuffer;
  tileCoverageWeightData: Float32Array;
  tileBuildCountBuffer: GPUBuffer;
  tileScatterCursorBuffer: GPUBuffer;
  alphaParamBuffer: GPUBuffer;
  alphaParamData: Float32Array;
  sourceOpacities: Float32Array;
  tileRefShapeParams: Float32Array;
  outputTexture: GPUTexture;
  outputView: GPUTextureView;
  tileEntryCount: number;
  tileRefCustody: TileRefCustodySummary;
  retentionAudit: TileRetentionAudit;
  budgetDiagnostics: TileLocalPrepassBudgetDiagnostics;
  tileRefSplatIds: Uint32Array;
  prepassSignature: string;
  debugMode: GpuTileCoverageDebugMode;
  diagnostics: TileLocalDiagnosticSummary;
  arenaBackend: "cpu" | "gpu";
  gpuArenaRuntime: GpuTileContributorArenaRuntime | null;
  gpuArenaProjectedContributors: readonly GpuTileContributorArenaProjectedContributor[];
  traceAnchors?: readonly PixelTraceAnchor[];
  perPixelProjectedContributors: TileLocalPrepassBridge["perPixelProjectedContributors"];
  perPixelRetainedContributors: TileLocalPrepassBridge["perPixelRetainedContributors"];
  arenaUnavailableReason?: string;
  gpuDispatchEnqueueDurationMs?: number;
  needsDispatch: boolean;
  lastCompositedAtMs: number;
  lastCompositedFrame: number;
  lastCompositedSignature: string;
  bandDispatchCacheTrace: BandDispatchCacheTrace;
}

interface ArenaRuntimeEvidence {
  requestedArenaBackend: "cpu" | "gpu";
  effectiveArenaBackend: "cpu" | "gpu";
  cpuBuildDurationMs?: number;
  cpuBridgeBuildDurationMs?: number;
  gpuDispatchEnqueueDurationMs?: number;
  unavailableReason?: string;
  skippedReason?: string;
  fallbackReason?: string;
}

type RendererMode = "plate" | "tile-local" | "tile-local-visible";

interface RuntimeFootprintParams {
  readonly splatScale: number;
  readonly minRadiusPx: number;
  readonly nearFadeEndNdc: number;
}

interface PixelTraceAnchor {
  readonly id: string;
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  readonly description: string;
  readonly canonicalTileAddress: null;
}

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
  bindCameraControls(cam, canvas, {
    requestRender: requestFrame,
    onDoubleClick(clickX, clickY, viewportWidth, viewportHeight) {
      if (!activeScene) return;
      handleDoubleClickPivot(cam, activeScene.attributes, clickX, clickY, viewportWidth, viewportHeight);
    },
  });
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
  const tileLocalPresenter = createTileLocalTexturePresenter(gpu.device, gpu.format);

  // shape-witness: detect ?synthetic=shape-witness-<id> and load the real synthetic fixture
  // through the real WebGPU renderer path. This is the renderer-path-integration lane wiring.
  // The fixture data replaces the real Scaniverse asset; the real compositor and plate
  // renderer process the synthetic splats exactly as they would real splat data.
  const shapeWitnessFixtureId = selectedShapeWitnessFixtureId();

  let depthTexture: GPUTexture | null = null;
  let lastTime = performance.now();
  let frameCount = 0;
  let frameSerial = 0;
  let fpsAccum = 0;
  let displayFps = 0;
  let gpuTimings: Map<string, number> = new Map();

  statsEl.textContent = "Loading real Scaniverse splats...";
  const assetPath = selectedSplatAssetPath();
  let activeScene: ActiveSplatScene | null = null;

  function replaceSplatScene(attributes: SplatAttributes, sceneAssetPath: string): void {
    const previous = activeScene;
    configureCameraForSplatBounds(cam, attributes.bounds);
    if (shapeWitnessFixtureId === null) {
      applyRealScaniverseWitnessView(cam, attributes.bounds, REAL_SCANIVERSE_WITNESS_VIEW);
    }
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
    const initialSplatScale = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_SPLAT_SCALE : REAL_SCANIVERSE_SPLAT_SCALE;
    const initialMinRadiusPx = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_MIN_RADIUS_PX : REAL_SCANIVERSE_MIN_RADIUS_PX;
    const alphaDensitySummary = writeAlphaDensityCompensatedOpacities(
      effectiveOpacities,
      attributes,
      initialViewProj,
      initialViewportWidth,
      initialViewportHeight,
      initialSplatScale,
      initialMinRadiusPx,
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
    const provisionalTileLocalDisabledReason = tileLocalDisabledReasonForAttributes(attributes);
    let tileLocalDisabledReason = provisionalTileLocalDisabledReason;
    let tileLocalState: TileLocalSceneState | null = null;
    if (usesTileLocalPrepass(RENDERER_MODE) && !tileLocalDisabledReason) {
      try {
        tileLocalState = createTileLocalSceneState(
          gpu.device,
          attributes,
          buffers,
          sortedIndexBuffer,
          effectiveOpacities,
          initialView,
          initialViewProj,
          initialViewportWidth,
          initialViewportHeight,
          {
            splatScale: initialSplatScale,
            minRadiusPx: initialMinRadiusPx,
            nearFadeEndNdc: shapeWitnessFixtureId !== null ? SHAPE_WITNESS_NEAR_FADE_END : REAL_SCANIVERSE_NEAR_FADE_END_NDC,
          }
        );
      } catch (err) {
        if (!isTileLocalBudgetError(err)) {
          throw err;
        }
        tileLocalDisabledReason = errorMessage(err);
      }
    }
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
      tileLocalDisabledReason,
      tileLocalLastSkipReason: null,
      tileLocalLastSkipSignature: null,
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

  if (shapeWitnessFixtureId !== null) {
    // Load and render the synthetic fixture through the REAL renderer path.
    // No CPU-only fake, no alternate renderer — the same WebGPU tile-local compositor
    // and plate renderer that processes real Scaniverse splats processes the fixture data.
    const fullFixtureId = `shape-witness-${shapeWitnessFixtureId}`;
    const fixture = getShapeFixture(fullFixtureId);
    if (fixture === undefined) {
      console.error(
        `[shape-witness] Unrecognized fixture ID: "${fullFixtureId}". ` +
        `Valid IDs: shape-witness-{isotropic-circle,edge-on-ribbon,rotated-ellipse,near-plane-slab,dense-foreground}`
      );
      // Fall back to real Scaniverse so the page is not blank.
      replaceSplatScene(await fetchFirstSmokeSplatPayload(assetPath), assetPath);
    } else {
      statsEl.textContent = `Loading shape-witness fixture: ${shapeWitnessFixtureId}...`;
      const fixtureAttributes = splatAttributesFromFixture(fixture);
      // replaceSplatScene uses the bounds-based camera internally; we will override
      // the camera immediately after with the fixture's exact camera specification.
      replaceSplatScene(fixtureAttributes, `shape-witness:${fullFixtureId}`);
      // Override camera to fixture specification (replaces the bounds-based camera set above).
      configureCameraForFixture(cam, fixture.camera, fixtureAttributes.bounds);
      // Expose shape-witness smoke evidence with ready: true so the capture harness can proceed.
      // This overwrites the replaceSplatScene evidence with shape-witness-specific metadata.
      exposeShapeWitnessSmokeEvidence(shapeWitnessFixtureId, fixtureAttributes.count);
      statsEl.textContent = `shape-witness: ${shapeWitnessFixtureId} | renderer: shape-witness | splats: ${fixtureAttributes.count}`;
    }
  } else {
    replaceSplatScene(await fetchFirstSmokeSplatPayload(assetPath), assetPath);
  }
  bindDroppedSplatLoading(canvas, async (file) => {
    statsEl.textContent = `Loading ${file.name}...`;
    try {
      replaceSplatScene(await loadDroppedSplatFile(file), `local-file:${file.name}`);
    } catch (err) {
      statsEl.textContent = err instanceof Error ? err.message : String(err);
      requestFrame();
    }
  });

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
    const alphaRefreshed = shouldRefreshAlphaDensity(
      scene.alphaDensityState.refreshState,
      view,
      width,
      height,
      now,
      ALPHA_DENSITY_SETTLE_MS
    );
    // Use shape-witness rendering parameters when rendering synthetic fixtures.
    // Shape-witness fixtures are defined in world-space units compatible with splatScale=600.
    // Real Scaniverse uses splatScale=3000 for its own unit system.
    const activeSplatScale = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_SPLAT_SCALE : REAL_SCANIVERSE_SPLAT_SCALE;
    const activeMinRadiusPx = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_MIN_RADIUS_PX : REAL_SCANIVERSE_MIN_RADIUS_PX;
    if (alphaRefreshed) {
      scene.alphaDensityState.summary = writeAlphaDensityCompensatedOpacities(
        scene.effectiveOpacities,
        scene.attributes,
        viewProj,
        width,
        height,
        activeSplatScale,
        activeMinRadiusPx,
        ALPHA_DENSITY_MODE
      );
      gpu.device.queue.writeBuffer(scene.buffers.opacityBuffer, 0, scene.effectiveOpacities);
      if (scene.tileLocalState) {
        syncTileLocalAlphaParams(gpu.device.queue, scene.tileLocalState, scene.effectiveOpacities);
        scene.tileLocalState.needsDispatch = true;
      }
    }
    const activeNearFadeStart = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_NEAR_FADE_START : REAL_SCANIVERSE_NEAR_FADE_START_NDC;
    const activeNearFadeEnd = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_NEAR_FADE_END : REAL_SCANIVERSE_NEAR_FADE_END_NDC;
    writeSplatPlateFrameUniforms(
      uniformData,
      viewProj,
      width,
      height,
      activeSplatScale,
      activeMinRadiusPx,
      activeNearFadeStart,
      activeNearFadeEnd
    );
    gpu.device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const encoder = gpu.device.createCommandEncoder();
    const gpuSortRefreshed = shouldRefreshGpuSort(scene.sortState, view, now);
    if (gpuSortRefreshed) {
      writeViewDepthSortInput(gpu.device.queue, scene.gpuSort, scene.attributes.positions, view);
      encodeGpuSortPrototype(encoder, scene.gpuSort);
      if (scene.tileLocalState) {
        scene.tileLocalState.needsDispatch = true;
      }
    }
    const pendingGpuSort = gpuSortRefreshPending(scene.sortState, view);
    const pendingAlphaDensity = scene.alphaDensityState.refreshState.needsRefresh;
    const tileLocalCurrentSignature = scene.tileLocalState
      ? captureCurrentTileLocalSignature(view, viewProj, width, height, {
        splatScale: activeSplatScale,
        minRadiusPx: activeMinRadiusPx,
        nearFadeEndNdc: activeNearFadeEnd,
      })
      : null;
    if (
      scene.tileLocalState &&
      tileLocalCurrentSignature !== scene.tileLocalState.lastCompositedSignature
    ) {
      scene.tileLocalState.needsDispatch = true;
    }

    if (scene.tileLocalState && shouldDispatchTileLocalCompositor({
      needsDispatch: scene.tileLocalState.needsDispatch,
      activeInput,
      allowActiveInputDispatch: scene.tileLocalState.arenaBackend === "gpu",
      pendingGpuSort,
      pendingAlphaDensity,
    })) {
      try {
        const tileLocalState = ensureTileLocalSceneState(
          gpu.device,
          scene,
          scene.tileLocalState,
          view,
          viewProj,
          width,
          height,
          true,
          {
            splatScale: activeSplatScale,
            minRadiusPx: activeMinRadiusPx,
            nearFadeEndNdc: activeNearFadeEnd,
          }
        );
        scene.tileLocalState = tileLocalState;
        scene.tileLocalLastSkipReason = null;
        scene.tileLocalLastSkipSignature = null;
        writeGpuTileCoverageFrameUniforms(
          tileLocalState.frameUniformData,
          viewProj,
          tileLocalState.plan,
          tileLocalState.debugMode,
          {
            splatScale: activeSplatScale,
            minRadiusPx: activeMinRadiusPx,
          }
        );
        gpu.device.queue.writeBuffer(tileLocalState.frameUniformBuffer, 0, tileLocalState.frameUniformData);
        const tileLocalComputePass = encoder.beginComputePass();
        const gpuDispatchEnqueueStartedAtMs = tileLocalState.arenaBackend === "gpu"
          ? performance.now()
          : undefined;
        if (tileLocalState.gpuArenaRuntime) {
          tileLocalState.gpuArenaRuntime.dispatch(tileLocalComputePass, tileLocalState.plan);
        }
        if (scene.rendererMode === "tile-local-visible" && tileLocalState.arenaBackend !== "gpu") {
          tileLocalState.pipeline.dispatchComposite(tileLocalComputePass, tileLocalState.bindGroup, tileLocalState.plan);
        } else {
          tileLocalState.pipeline.dispatch(tileLocalComputePass, tileLocalState.bindGroup, tileLocalState.plan);
        }
        if (gpuDispatchEnqueueStartedAtMs !== undefined) {
          tileLocalState.gpuDispatchEnqueueDurationMs = roundRuntimeMetric(
            performance.now() - gpuDispatchEnqueueStartedAtMs
          );
        }
        tileLocalComputePass.end();
        tileLocalState.bandDispatchCacheTrace = buildBandDispatchCacheTrace({
          tileColumns: tileLocalState.plan.tileColumns,
          tileRows: tileLocalState.plan.tileRows,
          tileSizePx: tileLocalState.plan.tileSizePx,
          viewportWidth: width,
          viewportHeight: height,
          currentFrameId: frameSerial,
          clearFrameId: frameSerial,
          buildFrameId: frameSerial,
          compositeFrameId: frameSerial,
          cacheState: "current",
        });
        tileLocalState.needsDispatch = false;
        tileLocalState.lastCompositedAtMs = now;
        tileLocalState.lastCompositedFrame = frameSerial;
        tileLocalState.lastCompositedSignature = tileLocalCurrentSignature ?? tileLocalState.prepassSignature;
      } catch (err) {
        if (!isTileLocalBudgetError(err)) {
          throw err;
        }
        scene.tileLocalLastSkipReason = errorMessage(err);
        scene.tileLocalLastSkipSignature = tileLocalCurrentSignature;
        scene.tileLocalState.needsDispatch = false;
      }
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

    if (scene.rendererMode === "tile-local-visible" && scene.tileLocalState) {
      tileLocalPresenter.draw(renderPass, scene.tileLocalState.outputView);
    } else {
      renderPass.setBindGroup(0, bindGroup);
      splatRenderer.draw(renderPass, scene.splatBindGroup, scene.count);
    }
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
    const baseRendererLabel = labelRendererMode(
      scene.rendererMode,
      scene.tileLocalState,
      scene.tileLocalDisabledReason,
      scene.tileLocalLastSkipReason
    );
    // In shape-witness mode, prefix the renderer label so the capture harness sees "shape-witness".
    const rendererLabel = shapeWitnessFixtureId !== null
      ? `shape-witness`
      : baseRendererLabel;
    const splatKindLabel = shapeWitnessFixtureId !== null
      ? `shape-witness (${shapeWitnessFixtureId})`
      : "real Scaniverse splats";
    let statsText = `${width}×${height} | ${displayFps} fps | ${scene.count.toLocaleString()} ${splatKindLabel} | renderer: ${rendererLabel} | sort: ${SORT_BACKEND} | alpha: ${alphaSummary.accountingMode} density ${alphaSummary.compensatedSplatCount.toLocaleString()} splats/${alphaSummary.hotTileCount} tiles`;
    if (scene.tileLocalState) {
      statsText += ` | tile-local: ${scene.tileLocalState.plan.tileColumns}x${scene.tileLocalState.plan.tileRows} tiles/${scene.tileLocalState.tileEntryCount} refs`;
      const budgetText = formatTileLocalBudgetLabel(tileLocalBudgetEvidence(scene.tileLocalLastSkipReason, width, height));
      if (budgetText) {
        statsText += ` | tile-local budget: ${budgetText}`;
      }
      statsText += ` | tile-budget: ${formatTileLocalBudgetPair(TILE_LOCAL_BUDGET_CONFIG)}`;
      if (TILE_LOCAL_BUDGET_CONFIG.invalidReason) {
        statsText += ` | tile-budget invalid: ${TILE_LOCAL_BUDGET_CONFIG.invalidReason}`;
      }
      if (scene.tileLocalState.debugMode === "final-color") {
        statsText += ` | visible-compositor cap: ${TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE} refs`;
      }
      statsText += ` | tile-order: ${TILE_LOCAL_ORDERING_BACKEND}`;
      const freshness = tileLocalPresentationFreshness(
        scene.tileLocalState,
        scene.tileLocalLastSkipReason,
        scene.tileLocalLastSkipSignature,
        now
      );
      if (freshness.status === "stale-cache") {
        statsText += ` | tile-local stale-cache: ${Math.round(freshness.cachedFrameAgeMs ?? 0)}ms old`;
        statsText += ` | tile-local current-grid: ${tileColumnsForViewport(width)}x${tileRowsForViewport(height)} tiles`;
      }
      if (scene.tileLocalState.debugMode !== "final-color") {
        statsText += ` | tile-debug: ${scene.tileLocalState.debugMode}`;
      }
    }
    const arenaRuntime = buildArenaRuntimeEvidence(
      REQUESTED_ARENA_BACKEND,
      scene.tileLocalState,
      scene.tileLocalDisabledReason,
      scene.tileLocalLastSkipReason
    );
    statsText += ` | arena requested: ${arenaRuntime.requestedArenaBackend}`;
    statsText += ` | arena effective: ${arenaRuntime.effectiveArenaBackend}`;
    if (arenaRuntime.cpuBuildDurationMs !== undefined) {
      statsText += ` | arena CPU bridge build: ${arenaRuntime.cpuBuildDurationMs.toFixed(3)}ms`;
    }
    if (arenaRuntime.gpuDispatchEnqueueDurationMs !== undefined) {
      statsText += ` | arena GPU dispatch enqueue: ${arenaRuntime.gpuDispatchEnqueueDurationMs.toFixed(3)}ms`;
    }
    if (arenaRuntime.unavailableReason) {
      statsText += ` | arena unavailable: ${arenaRuntime.unavailableReason}`;
    }
    if (arenaRuntime.skippedReason) {
      statsText += ` | arena skipped: ${arenaRuntime.skippedReason}`;
    }
    if (arenaRuntime.fallbackReason) {
      statsText += ` | arena fallback: ${arenaRuntime.fallbackReason}`;
    }
    if (scene.tileLocalDisabledReason) {
      statsText += ` | ${scene.tileLocalDisabledReason}`;
    }
    if (scene.tileLocalLastSkipReason) {
      statsText += ` | tile-local skipped: ${scene.tileLocalLastSkipReason}`;
    }
    if (gpuTimings.size > 0) {
      for (const [label, ms] of gpuTimings) {
        statsText += ` | ${label}: ${ms.toFixed(2)}ms`;
      }
    }
    statsEl.textContent = statsText;
    exposeTileLocalRuntimeEvidence(
      rendererLabel,
      displayFps,
      scene.tileLocalState,
      scene.tileLocalDisabledReason,
      scene.tileLocalLastSkipReason,
      scene.tileLocalLastSkipSignature,
      now,
      width,
      height,
      scene.attributes.colors
    );

    if (shouldContinueRendering({
      activeInput,
      pendingGpuSort,
      pendingAlphaDensity,
      pendingTileLocalCompositor: shouldDispatchTileLocalCompositor({
        needsDispatch: scene.tileLocalState?.needsDispatch === true,
        activeInput,
        allowActiveInputDispatch: scene.tileLocalState?.arenaBackend === "gpu",
        pendingGpuSort,
        pendingAlphaDensity,
      }),
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
  attributes: SplatAttributes,
  buffers: SplatGpuBuffers,
  sortedIndexBuffer: GPUBuffer,
  effectiveOpacities: Float32Array,
  viewMatrix: Float32Array,
  viewProj: Float32Array,
  viewportWidth: number,
  viewportHeight: number,
  footprintParams: RuntimeFootprintParams
): TileLocalSceneState {
  if (REQUESTED_ARENA_BACKEND === "gpu") {
    return createGpuArenaTileLocalSceneState(
      device,
      attributes,
      buffers,
      effectiveOpacities,
      viewMatrix,
      viewProj,
      viewportWidth,
      viewportHeight,
      footprintParams
    );
  }
  return createCpuTileLocalSceneState(
    device,
    attributes,
    buffers,
    sortedIndexBuffer,
    effectiveOpacities,
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    footprintParams
  );
}

function createGpuArenaTileLocalSceneState(
  device: GPUDevice,
  attributes: SplatAttributes,
  buffers: SplatGpuBuffers,
  effectiveOpacities: Float32Array,
  viewMatrix: Float32Array,
  viewProj: Float32Array,
  viewportWidth: number,
  viewportHeight: number,
  footprintParams: RuntimeFootprintParams
): TileLocalSceneState {
  const tileColumns = tileColumnsForViewport(viewportWidth);
  const tileRows = tileRowsForViewport(viewportHeight);
  const tileCount = tileColumns * tileRows;
  const maxTileRefs = gpuLiveMaxTileRefs(device, tileCount, attributes.count);
  const plan = createGpuTileCoveragePlan({
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    splatCount: attributes.count,
    maxTileRefs,
  });
  const prepassSignature = captureTileLocalPrepassBridgeSignature({
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    samplesPerAxis: TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES,
    splatScale: footprintParams.splatScale,
    minRadiusPx: footprintParams.minRadiusPx,
    maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
    maxTileEntries: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    nearFadeEndNdc: footprintParams.nearFadeEndNdc,
  });
  const bufferBlocker = gpuTileCoverageBufferUnavailableReason(device, plan);
  if (bufferBlocker) {
    throw new Error(bufferBlocker);
  }
  const pipeline = createGpuTileCoveragePipelineSkeleton(device, "rgba16float");
  const frameUniformBuffer = createUniformBuffer(
    device,
    GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
    "tile_local_frame_uniforms"
  );
  const frameUniformData = new Float32Array(GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);
  const tileHeaderBuffer = createEmptyStorageBuffer(device, plan.tileHeaderBytes, "gpu_live_tile_headers");
  const tileRefBuffer = createEmptyStorageBuffer(device, plan.tileRefBytes, "gpu_live_tile_refs");
  const tileCoverageWeightBuffer = createEmptyStorageBuffer(
    device,
    plan.tileCoverageWeightBytes,
    "gpu_live_tile_coverage_weights"
  );
  const tileBuildCountBuffer = createEmptyStorageBuffer(
    device,
    Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT),
    "gpu_live_tile_build_counts"
  );
  const tileScatterCursorBuffer = createEmptyStorageBuffer(
    device,
    Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT),
    "gpu_live_tile_scatter_cursors"
  );
  const alphaParamBuffer = createEmptyStorageBuffer(device, plan.alphaParamBytes, "gpu_live_alpha_params");
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
    colorBuffer: buffers.colorBuffer,
    opacityBuffer: buffers.opacityBuffer,
    scaleBuffer: buffers.scaleBuffer,
    rotationBuffer: buffers.rotationBuffer,
    tileHeaderBuffer,
    tileRefBuffer,
    tileCoverageWeightBuffer,
    tileScatterCursorBuffer,
    alphaParamBuffer,
    outputColorView: outputView,
  });
  const tileRefCustody = estimatedGpuLiveTileRefCustody(plan, attributes.count);
  const retentionAudit = emptyTileRetentionAudit();
  const budgetDiagnostics = estimatedGpuLiveBudgetDiagnostics(plan, attributes.count);
  const tileHeaderData = new Uint32Array(Math.max(0, plan.tileCount * 4));
  const tileCoverageWeightData = new Float32Array(0);
  const alphaParamData = new Float32Array(8);
  const diagnostics = summarizeTileLocalDiagnostics({
    debugMode: TILE_LOCAL_DEBUG_MODE,
    plan,
    tileEntryCount: tileRefCustody.retainedTileEntryCount,
    tileHeaders: tileHeaderData,
    tileRefCustody,
    retentionAudit,
    tileCoverageWeights: tileCoverageWeightData,
    alphaParamData,
    sourceOpacities: effectiveOpacities,
  });
  const anchorContributorTraces = buildGpuLiveAnchorContributorTraces({
    attributes,
    viewMatrix,
    viewProj,
    effectiveOpacities,
    viewportWidth,
    viewportHeight,
    tileSizePx: plan.tileSizePx,
    tileColumns: plan.tileColumns,
    tileRows: plan.tileRows,
    splatScale: footprintParams.splatScale,
    minRadiusPx: footprintParams.minRadiusPx,
    maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
    nearFadeEndNdc: footprintParams.nearFadeEndNdc,
    anchors: TILE_LOCAL_TRACE_ANCHORS,
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible-gaussian-compositor",
      requestedArenaBackend: REQUESTED_ARENA_BACKEND,
      effectiveArenaBackend: "gpu",
      tileSizePx: plan.tileSizePx,
      maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
      },
      traceExtractionBackend: "gpu-live-anchor-mirror",
    },
  });

  return {
    viewportWidth,
    viewportHeight,
    plan,
    pipeline,
    bindGroup,
    frameUniformBuffer,
    frameUniformData,
    projectedBoundsBuffer: null,
    tileHeaderBuffer,
    tileHeaderData,
    tileRefBuffer,
    tileCoverageWeightBuffer,
    tileCoverageWeightData,
    tileBuildCountBuffer,
    tileScatterCursorBuffer,
    alphaParamBuffer,
    alphaParamData,
    sourceOpacities: effectiveOpacities,
    tileRefShapeParams: new Float32Array(0),
    outputTexture,
    outputView,
    tileEntryCount: tileRefCustody.retainedTileEntryCount,
    tileRefCustody,
    retentionAudit,
    budgetDiagnostics,
    tileRefSplatIds: new Uint32Array(0),
    prepassSignature,
    debugMode: TILE_LOCAL_DEBUG_MODE,
    diagnostics,
    arenaBackend: "gpu",
    gpuArenaRuntime: null,
    gpuArenaProjectedContributors: anchorContributorTraces.retainedContributors,
    traceAnchors: TILE_LOCAL_TRACE_ANCHORS,
    perPixelProjectedContributors: anchorContributorTraces.perPixelProjectedContributors,
    perPixelRetainedContributors: anchorContributorTraces.perPixelRetainedContributors,
    arenaUnavailableReason: undefined,
    gpuDispatchEnqueueDurationMs: undefined,
    needsDispatch: true,
    lastCompositedAtMs: 0,
    lastCompositedFrame: -1,
    lastCompositedSignature: prepassSignature,
    bandDispatchCacheTrace: buildBandDispatchCacheTrace({
      tileColumns: plan.tileColumns,
      tileRows: plan.tileRows,
      tileSizePx: plan.tileSizePx,
      viewportWidth,
      viewportHeight,
    }),
  };
}

function createCpuTileLocalSceneState(
  device: GPUDevice,
  attributes: SplatAttributes,
  buffers: SplatGpuBuffers,
  sortedIndexBuffer: GPUBuffer,
  effectiveOpacities: Float32Array,
  viewMatrix: Float32Array,
  viewProj: Float32Array,
  viewportWidth: number,
  viewportHeight: number,
  footprintParams: RuntimeFootprintParams
): TileLocalSceneState {
  const bridgeInput = {
    attributes,
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    samplesPerAxis: TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES,
    splatScale: footprintParams.splatScale,
    minRadiusPx: footprintParams.minRadiusPx,
    maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
    maxTileEntries: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    nearFadeEndNdc: footprintParams.nearFadeEndNdc,
  };
  const bridgeBuildStartedAtMs = performance.now();
  const bridge = buildTileLocalPrepassBridge(bridgeInput);
  const bridgeBuildDurationMs = Math.max(0, performance.now() - bridgeBuildStartedAtMs);
  const prepassSignature = captureTileLocalPrepassBridgeSignature(bridgeInput);
  const gpuArenaRetainedAdapter = REQUESTED_ARENA_BACKEND === "gpu"
    ? adaptGpuArenaRetainedContributors(bridge, effectiveOpacities, buildDeterministicGpuTileProjectionRetentionArena)
    : null;
  const gpuArenaProjectedContributors = gpuArenaRetainedAdapter?.contributors ?? [];
  const requestedGpuArenaRuntime = gpuArenaProjectedContributors.length > 0;
  const plan = createGpuTileCoveragePlan({
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    splatCount: attributes.count,
    maxTileRefs: Math.max(requestedGpuArenaRuntime ? gpuArenaProjectedContributors.length : bridge.tileEntryCount, attributes.count, 1),
  });
  const gpuArenaRuntimeBlocker = requestedGpuArenaRuntime
    ? gpuArenaRuntimeUnavailableReason(device, plan, gpuArenaProjectedContributors.length)
    : REQUESTED_ARENA_BACKEND === "gpu"
      ? "no retained contributors for gpu arena runtime"
      : undefined;
  const gpuArenaRuntime = requestedGpuArenaRuntime && !gpuArenaRuntimeBlocker
    ? createGpuTileContributorArenaRuntime(device, plan, gpuArenaProjectedContributors)
    : null;
  const legacyProjection = gpuArenaRuntime?.legacyProjection;
  const budgetDiagnostics: TileLocalPrepassBudgetDiagnostics = {
    ...bridge.budgetDiagnostics,
    arenaRefs: legacyProjection
      ? {
          ...bridge.budgetDiagnostics.arenaRefs,
          projected: gpuArenaRetainedAdapter?.projectedContributorCount ?? bridge.budgetDiagnostics.arenaRefs.projected,
          retained: gpuArenaRetainedAdapter?.retainedContributorCount ?? gpuArenaProjectedContributors.length,
          dropped: gpuArenaRetainedAdapter?.droppedContributorCount ?? 0,
        }
      : bridge.budgetDiagnostics.arenaRefs,
    heat: {
      cpu: {
        ...bridge.budgetDiagnostics.heat.cpu,
        buildDurationMs: roundRuntimeMetric(bridgeBuildDurationMs),
      },
      gpu: {
        ...bridge.budgetDiagnostics.heat.gpu,
        alphaParamBufferBytes: plan.alphaParamBytes,
      },
    },
  };
  const pipeline = createGpuTileCoveragePipelineSkeleton(device, "rgba16float");
  const frameUniformBuffer = createUniformBuffer(
    device,
    GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
    "tile_local_frame_uniforms"
  );
  const frameUniformData = new Float32Array(GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);
  const alphaParamData = new Float32Array(Math.max(plan.alphaParamBytes / Float32Array.BYTES_PER_ELEMENT, 8));
  if (legacyProjection) {
    alphaParamData.set(legacyProjection.alphaParamData.slice(0, alphaParamData.length));
  }
  const tileRefSplatIds = new Uint32Array(plan.maxTileRefs);
  for (let refIndex = 0; refIndex < plan.maxTileRefs; refIndex++) {
    const splatId = legacyProjection?.tileRefSplatIds[refIndex] ?? bridge.tileRefs[refIndex * 4] ?? 0;
    tileRefSplatIds[refIndex] = splatId;
  }
  if (!legacyProjection) {
    writeGpuTileCoverageAlphaParams(alphaParamData, bridge, effectiveOpacities, plan.maxTileRefs);
  }

  const bridgeBuffers = gpuArenaRuntime
    ? {
        projectedBoundsBuffer: createStorageBuffer(
          device,
          new Uint32Array(bridge.projectedBounds).buffer,
          "gpu_arena_cpu_projected_bounds"
        ),
        tileHeaderBuffer: gpuArenaRuntime.buffers.legacyTileHeaderBuffer,
        tileRefBuffer: gpuArenaRuntime.buffers.legacyTileRefBuffer,
        tileCoverageWeightBuffer: gpuArenaRuntime.buffers.legacyTileCoverageWeightBuffer,
      }
    : createGpuTileCoverageBridgeBuffers(device, bridge);
  const tileBuildCountBuffer = createEmptyStorageBuffer(
    device,
    Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT),
    "tile_local_tile_build_counts"
  );
  const tileScatterCursorBuffer = createEmptyStorageBuffer(
    device,
    Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT),
    "tile_local_tile_scatter_cursors"
  );
  const alphaParamBuffer = gpuArenaRuntime?.buffers.legacyAlphaParamBuffer
    ?? createStorageBuffer(device, alphaParamData.buffer, "tile_local_alpha_params");
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
    colorBuffer: buffers.colorBuffer,
    opacityBuffer: buffers.opacityBuffer,
    scaleBuffer: buffers.scaleBuffer,
    rotationBuffer: buffers.rotationBuffer,
    tileHeaderBuffer: bridgeBuffers.tileHeaderBuffer,
    tileRefBuffer: bridgeBuffers.tileRefBuffer,
    tileCoverageWeightBuffer: bridgeBuffers.tileCoverageWeightBuffer,
    tileScatterCursorBuffer,
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
    projectedBoundsBuffer: bridgeBuffers.projectedBoundsBuffer,
    tileHeaderBuffer: bridgeBuffers.tileHeaderBuffer,
    tileHeaderData: legacyProjection?.tileHeaders ?? bridge.tileHeaders,
    tileRefBuffer: bridgeBuffers.tileRefBuffer,
    tileCoverageWeightBuffer: bridgeBuffers.tileCoverageWeightBuffer,
    tileCoverageWeightData: legacyProjection?.tileCoverageWeights ?? bridge.tileCoverageWeights,
    tileBuildCountBuffer,
    tileScatterCursorBuffer,
    alphaParamBuffer,
    alphaParamData,
    sourceOpacities: effectiveOpacities,
    tileRefShapeParams: legacyProjection?.tileRefShapeParams ?? bridge.tileRefShapeParams,
    outputTexture,
    outputView,
    tileEntryCount: legacyProjection ? gpuArenaProjectedContributors.length : bridge.tileEntryCount,
    tileRefCustody: bridge.tileRefCustody,
    retentionAudit: bridge.retentionAudit,
    budgetDiagnostics,
    tileRefSplatIds,
    prepassSignature,
    debugMode: TILE_LOCAL_DEBUG_MODE,
    diagnostics: summarizeTileLocalDiagnostics({
      debugMode: TILE_LOCAL_DEBUG_MODE,
      plan,
      tileEntryCount: legacyProjection ? gpuArenaProjectedContributors.length : bridge.tileEntryCount,
      tileHeaders: legacyProjection?.tileHeaders ?? bridge.tileHeaders,
      tileRefCustody: bridge.tileRefCustody,
      retentionAudit: bridge.retentionAudit,
      tileCoverageWeights: legacyProjection?.tileCoverageWeights ?? bridge.tileCoverageWeights,
      alphaParamData,
      sourceOpacities: effectiveOpacities,
    }),
    arenaBackend: gpuArenaRuntime ? "gpu" : "cpu",
    gpuArenaRuntime,
    gpuArenaProjectedContributors,
    perPixelProjectedContributors: bridge.perPixelProjectedContributors,
    perPixelRetainedContributors: bridge.perPixelRetainedContributors,
    arenaUnavailableReason: gpuArenaRuntime ? undefined : gpuArenaRuntimeBlocker,
    gpuDispatchEnqueueDurationMs: undefined,
    needsDispatch: true,
    lastCompositedAtMs: 0,
    lastCompositedFrame: -1,
    lastCompositedSignature: prepassSignature,
    bandDispatchCacheTrace: buildBandDispatchCacheTrace({
      tileColumns: plan.tileColumns,
      tileRows: plan.tileRows,
      tileSizePx: plan.tileSizePx,
      viewportWidth,
      viewportHeight,
    }),
  };
}

function roundRuntimeMetric(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
}

function createEmptyStorageBuffer(device: GPUDevice, size: number, label: string): GPUBuffer {
  return device.createBuffer({
    label,
    size: Math.max(16, size),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
}

function gpuTileCoverageBufferUnavailableReason(device: GPUDevice, plan: GpuTileCoveragePlan): string | undefined {
  const maxStorageBindingBytes = device.limits.maxStorageBufferBindingSize;
  const largestBindingBytes = Math.max(
    plan.projectedBoundsBytes,
    plan.tileHeaderBytes,
    plan.tileRefBytes,
    plan.tileCoverageWeightBytes,
    plan.alphaParamBytes,
  );
  if (largestBindingBytes > maxStorageBindingBytes) {
    return `gpu tile coverage buffers exceed max storage binding: ${largestBindingBytes} > ${maxStorageBindingBytes}`;
  }
  return undefined;
}

function gpuLiveMaxTileRefs(device: GPUDevice, tileCount: number, splatCount: number): number {
  const requestedTileRefs = Math.max(tileCount * TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE, splatCount, 1);
  const alphaParamBytesPerRef = GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF * Float32Array.BYTES_PER_ELEMENT;
  const hardwareRefLimit = Math.max(1, Math.floor(device.limits.maxStorageBufferBindingSize / alphaParamBytesPerRef));
  return Math.min(requestedTileRefs, hardwareRefLimit);
}

function gpuLiveEffectiveRefsPerTile(plan: GpuTileCoveragePlan): number {
  return Math.max(1, Math.floor(plan.maxTileRefs / Math.max(plan.tileCount, 1)));
}

function estimatedGpuLiveProjectedTileRefs(plan: GpuTileCoveragePlan, splatCount: number): number {
  const tileSizePx = Math.max(1, plan.tileSizePx);
  const footprintWidthPx = GPU_LIVE_POINT_SUPPORT_RADIUS_PX * 2;
  const tilesPerAxis = Math.max(1, Math.ceil(footprintWidthPx / tileSizePx) + 1);
  const tilesPerSplat = Math.min(plan.tileCount, tilesPerAxis * tilesPerAxis);
  return Math.max(0, Math.trunc(splatCount * tilesPerSplat));
}

function estimatedGpuLiveTileRefCustody(
  plan: GpuTileCoveragePlan,
  splatCount: number
): TileRefCustodySummary {
  const effectiveRefsPerTile = gpuLiveEffectiveRefsPerTile(plan);
  const projectedRefs = estimatedGpuLiveProjectedTileRefs(plan, splatCount);
  const retainedRefs = Math.min(projectedRefs, plan.maxTileRefs);
  const droppedRefs = Math.max(0, projectedRefs - retainedRefs);
  const capTouchedTileCount = droppedRefs > 0 ? plan.tileCount : 0;
  return {
    projectedTileEntryCount: projectedRefs,
    retainedTileEntryCount: retainedRefs,
    evictedTileEntryCount: droppedRefs,
    cappedTileCount: capTouchedTileCount,
    saturatedRetainedTileCount: capTouchedTileCount,
    maxProjectedRefsPerTile: Math.min(projectedRefs, splatCount),
    maxRetainedRefsPerTile: effectiveRefsPerTile,
    headerRefCount: retainedRefs,
    headerAccountingMatches: true,
  };
}

function estimatedGpuLiveBudgetDiagnostics(
  plan: GpuTileCoveragePlan,
  splatCount: number
): TileLocalPrepassBudgetDiagnostics {
  const bandCounter = emptyTileLocalBudgetBandCounter();
  const projectedRefs = estimatedGpuLiveProjectedTileRefs(plan, splatCount);
  const retainedRefs = Math.min(projectedRefs, plan.maxTileRefs);
  const droppedRefs = Math.max(0, projectedRefs - retainedRefs);
  const effectiveRefsPerTile = gpuLiveEffectiveRefsPerTile(plan);
  const capTouchedTileCount = droppedRefs > 0 ? plan.tileCount : 0;
  return {
    version: 1,
    arenaRefs: {
      projected: projectedRefs,
      retained: retainedRefs,
      dropped: droppedRefs,
      cappedTileCount: capTouchedTileCount,
      saturatedRetainedTileCount: capTouchedTileCount,
      maxProjectedRefsPerTile: Math.min(projectedRefs, splatCount),
      maxRetainedRefsPerTile: effectiveRefsPerTile,
    },
    overflowReasons: droppedRefs > 0
      ? [{
          reason: "projected-ref-budget",
          projectedRefs,
          retainedRefs,
          droppedRefs,
          maxProjectedRefs: plan.maxTileRefs,
        }]
      : [],
    capPressure: {
      version: 1,
      classification: droppedRefs > 0 ? "over-cap" : "within-cap",
      refs: {
        projected: projectedRefs,
        retained: retainedRefs,
        dropped: droppedRefs,
        maxRefsPerTile: effectiveRefsPerTile,
        tileCount: plan.tileCount,
      },
      retainedBands: { front: bandCounter, middle: bandCounter, back: bandCounter },
      droppedBands: { front: bandCounter, middle: bandCounter, back: bandCounter },
      overflowReasons: {},
      lossSignals: {
        foregroundDroppedRefs: 0,
        behindSurfaceDroppedRefs: 0,
        policyReserveDisplacedRefs: 0,
        highCoverageDroppedRefs: 0,
        highRetentionDroppedRefs: 0,
        highOcclusionDroppedRefs: 0,
      },
      policyHooks: [],
    },
    retainedBands: { front: bandCounter, middle: bandCounter, back: bandCounter },
    droppedBands: { front: bandCounter, middle: bandCounter, back: bandCounter },
    heat: {
      cpu: {
        projectedRefs,
        projectedRefsPerTile: plan.tileCount > 0 ? projectedRefs / plan.tileCount : 0,
        projectedToRetainedRatio: retainedRefs > 0 ? projectedRefs / retainedRefs : 0,
        buildDurationMs: 0,
      },
      gpu: {
        retainedRefs,
        retainedRefBufferBytes: plan.tileRefBytes,
        coverageWeightBufferBytes: plan.tileCoverageWeightBytes,
        alphaParamBufferBytes: plan.alphaParamBytes,
      },
    },
  };
}

function emptyTileLocalBudgetBandCounter() {
  return {
    total: 0,
    coverageHigh: 0,
    coverageMedium: 0,
    coverageLow: 0,
  };
}

function emptyTileRetentionAudit(): TileRetentionAudit {
  const summary = emptyTileRetentionAuditSummary();
  return {
    fullFrame: summary,
    regions: {
      porousBody: summary,
      centerLeakBand: summary,
    },
  };
}

function emptyTileRetentionAuditSummary() {
  return {
    region: "gpu-live-estimate",
    tileCount: 0,
    cappedTileCount: 0,
    projectedTileEntryCount: 0,
    currentRetainedEntryCount: 0,
    legacyRetainedEntryCount: 0,
    addedByPolicyCount: 0,
    droppedByPolicyCount: 0,
    addedRetentionWeightSum: 0,
    droppedRetentionWeightSum: 0,
    addedOcclusionWeightSum: 0,
    droppedOcclusionWeightSum: 0,
    addedByPolicySamples: [],
    droppedByPolicySamples: [],
  };
}

function ensureTileLocalSceneState(
  device: GPUDevice,
  scene: ActiveSplatScene,
  state: TileLocalSceneState,
  viewMatrix: Float32Array,
  viewProj: Float32Array,
  viewportWidth: number,
  viewportHeight: number,
  allowViewRebuild: boolean,
  footprintParams: RuntimeFootprintParams
): TileLocalSceneState {
  const bridgeInput = {
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    samplesPerAxis: TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES,
    splatScale: footprintParams.splatScale,
    minRadiusPx: footprintParams.minRadiusPx,
    maxTileEntries: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    nearFadeEndNdc: footprintParams.nearFadeEndNdc,
  };
  const viewportMatches = state.viewportWidth === viewportWidth && state.viewportHeight === viewportHeight;
  const bridgeStillFresh = !tileLocalPrepassBridgeSignatureChanged(state.prepassSignature, bridgeInput);
  if (viewportMatches && (bridgeStillFresh || !allowViewRebuild)) {
    return state;
  }
  const nextState = createTileLocalSceneState(
    device,
    scene.attributes,
    scene.buffers,
    scene.sortedIndexBuffer,
    scene.effectiveOpacities,
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    footprintParams
  );
  destroyTileLocalSceneState(state);
  return nextState;
}

function captureCurrentTileLocalSignature(
  viewMatrix: Float32Array,
  viewProj: Float32Array,
  viewportWidth: number,
  viewportHeight: number,
  footprintParams: RuntimeFootprintParams
): string {
  return captureTileLocalPrepassBridgeSignature({
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    samplesPerAxis: TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES,
    splatScale: footprintParams.splatScale,
    minRadiusPx: footprintParams.minRadiusPx,
    maxTileEntries: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    nearFadeEndNdc: footprintParams.nearFadeEndNdc,
  });
}

function syncTileLocalAlphaParams(
  queue: GPUQueue,
  state: TileLocalSceneState,
  effectiveOpacities: Float32Array
): void {
  if (state.arenaBackend === "gpu" && !state.gpuArenaRuntime) {
    return;
  }
  if (state.gpuArenaRuntime) {
    const contributors = projectedContributorsWithEffectiveOpacity(state.gpuArenaProjectedContributors, effectiveOpacities);
    const packed = packGpuArenaProjectedContributors(contributors);
    const projection = projectGpuArenaToLegacyCompositorBuffers(state.plan, contributors);
    state.alphaParamData.set(projection.alphaParamData.slice(0, state.alphaParamData.length));
    queue.writeBuffer(state.gpuArenaRuntime.buffers.projectedContributorU32Buffer, 0, packed.u32);
    queue.writeBuffer(state.gpuArenaRuntime.buffers.projectedContributorF32Buffer, 0, packed.f32);
    queue.writeBuffer(state.gpuArenaRuntime.buffers.legacyAlphaParamBuffer, 0, state.alphaParamData);
    refreshTileLocalDiagnostics(state);
    return;
  }
  const alphaParamData = new Float32Array(Math.max(state.plan.alphaParamBytes / Float32Array.BYTES_PER_ELEMENT, 8));
  writeGpuTileCoverageAlphaParams(alphaParamData, state, effectiveOpacities, state.plan.maxTileRefs);
  state.alphaParamData.set(alphaParamData);
  queue.writeBuffer(state.alphaParamBuffer, 0, alphaParamData);
  refreshTileLocalDiagnostics(state);
}

function destroyTileLocalSceneState(state: TileLocalSceneState): void {
  state.frameUniformBuffer.destroy();
  state.projectedBoundsBuffer?.destroy();
  if (state.gpuArenaRuntime) {
    state.gpuArenaRuntime.destroy();
  } else {
    state.tileHeaderBuffer.destroy();
    state.tileRefBuffer.destroy();
    state.tileCoverageWeightBuffer.destroy();
    state.alphaParamBuffer.destroy();
  }
  state.tileBuildCountBuffer.destroy();
  state.tileScatterCursorBuffer.destroy();
  state.outputTexture.destroy();
}

function projectedContributorsWithEffectiveOpacity(
  contributors: readonly GpuTileContributorArenaProjectedContributor[],
  effectiveOpacities: Float32Array
): readonly GpuTileContributorArenaProjectedContributor[] {
  return contributors.map((contributor) => ({
    ...contributor,
    opacity: effectiveOpacities[contributor.splatIndex] ?? contributor.opacity,
  }));
}

function gpuArenaRuntimeUnavailableReason(
  device: GPUDevice,
  plan: GpuTileCoveragePlan,
  projectedContributorCount: number
): string | undefined {
  const maxStorageBindingBytes = device.limits.maxStorageBufferBindingSize;
  const largestBindingBytes = Math.max(
    Math.max(1, projectedContributorCount) * 16 * Float32Array.BYTES_PER_ELEMENT,
    Math.max(1, plan.maxTileRefs) * 16 * Float32Array.BYTES_PER_ELEMENT,
    Math.max(8, plan.maxTileRefs * 8) * Float32Array.BYTES_PER_ELEMENT,
  );
  if (largestBindingBytes > maxStorageBindingBytes) {
    return `gpu arena projected contributor buffers exceed max storage binding: ${largestBindingBytes} > ${maxStorageBindingBytes}`;
  }
  return undefined;
}

function selectedSplatAssetPath(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("asset") || REAL_SCANIVERSE_SMOKE_ASSET_PATH;
}

function selectedAlphaDensityMode(): AlphaDensityAccountingMode {
  const params = new URLSearchParams(window.location.search);
  return params.get("alpha") === "center-tile" ? "center-tile" : "coverage-aware";
}

function selectedTileLocalDebugMode(): GpuTileCoverageDebugMode {
  const params = new URLSearchParams(window.location.search);
  switch (params.get("tileDebug") ?? params.get("debug")) {
    case "coverage":
    case "coverage-weight":
      return "coverage-weight";
    case "alpha":
    case "accumulated-alpha":
      return "accumulated-alpha";
    case "transmission":
    case "transmittance":
      return "transmittance";
    case "refs":
    case "tile-refs":
    case "tile-ref-count":
      return "tile-ref-count";
    case "conic":
    case "conic-shape":
      return "conic-shape";
    default:
      return "final-color";
  }
}

function selectedRealScaniverseWitnessViewMode(): RealScaniverseWitnessViewMode {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("witnessView") ?? params.get("view");
  if (requested === "dessert-close" || requested === "dessert-porous-close") {
    return requested;
  }
  return "default";
}

function selectedTileLocalUnsafeMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has("tileLocalUnsafe") || params.get("tileLocalBudget") === "unsafe";
}

function selectedTileLocalTraceAnchors(): readonly PixelTraceAnchor[] | undefined {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("traceAnchors") ?? params.get("traceAnchor");
  if (!raw) {
    return undefined;
  }
  const anchors = raw
    .split(";")
    .map((entry, index) => parseTileLocalTraceAnchor(entry, index))
    .filter((anchor): anchor is PixelTraceAnchor => anchor !== null);
  return anchors.length > 0 ? anchors : undefined;
}

function parseTileLocalTraceAnchor(rawEntry: string, index: number): PixelTraceAnchor | null {
  const entry = rawEntry.trim();
  if (!entry) {
    return null;
  }
  const [head, requestedKind] = entry.split(":");
  const [maybeId, maybeCoords] = head.includes("@") ? head.split("@") : [`fresh-anchor-${index + 1}`, head];
  const [xValue, yValue] = maybeCoords.split(",").map((value) => Number(value));
  if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) {
    return null;
  }
  const id = sanitizeTraceAnchorId(maybeId || `fresh-anchor-${index + 1}`, index);
  const kind = sanitizeTraceAnchorId(requestedKind || "fresh-lacunar-hole", index);
  const x = Math.max(0, Math.floor(xValue));
  const y = Math.max(0, Math.floor(yValue));
  return {
    id,
    kind,
    x,
    y,
    description: `Ad hoc current-frame trace anchor ${id} at ${x},${y}.`,
    canonicalTileAddress: null,
  };
}

function sanitizeTraceAnchorId(value: string, index: number): string {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || `fresh-anchor-${index + 1}`;
}

function selectedArenaBackend(): "cpu" | "gpu" {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("arenaBackend") ?? params.get("requestedArenaBackend");
  return requested === "gpu" ? "gpu" : "cpu";
}

function selectedRendererMode(): RendererMode {
  const params = new URLSearchParams(window.location.search);
  if (params.get("renderer") === "tile-local-visible") {
    return "tile-local-visible";
  }
  return params.get("renderer") === "tile-local" ? "tile-local" : "plate";
}

function usesTileLocalPrepass(mode: RendererMode): boolean {
  return mode === "tile-local" || mode === "tile-local-visible";
}

// ---------------------------------------------------------------------------
// shape-witness helpers (renderer-path-integration lane)
//
// These functions support real synthetic fixture loading via ?synthetic=shape-witness-<id>.
// The fixture data is loaded through the real WebGPU renderer path (not a CPU fake).
// ---------------------------------------------------------------------------

/**
 * Returns the fixture ID suffix from ?synthetic=shape-witness-<id>, or null if absent.
 * Example: ?synthetic=shape-witness-isotropic-circle → "isotropic-circle"
 */
function selectedShapeWitnessFixtureId(): string | null {
  const params = new URLSearchParams(window.location.search);
  const synthetic = params.get("synthetic");
  if (!synthetic || !synthetic.startsWith("shape-witness-")) {
    return null;
  }
  return synthetic.slice("shape-witness-".length);
}

/**
 * Exposes shape-witness smoke evidence after the real fixture has been loaded and rendered.
 * Sets ready: true and rendererLabel: "shape-witness" so the pixel-shape-gate capture
 * harness knows the fixture rendered through the real WebGPU path.
 *
 * This is called AFTER replaceSplatScene() to layer shape-witness-specific fields
 * on top of the base scene evidence. Each render frame, exposeTileLocalRuntimeEvidence()
 * will merge into __MESH_SPLAT_SMOKE__ with rendererLabel = "shape-witness".
 */
function exposeShapeWitnessSmokeEvidence(fixtureId: string, splatCount: number): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: Record<string, unknown>;
  };
  runtimeWindow.__MESH_SPLAT_SMOKE__ = {
    ...(runtimeWindow.__MESH_SPLAT_SMOKE__ ?? {}),
    ready: true,
    rendererLabel: "shape-witness",
    synthetic: true,
    realSplatEvidence: false,
    sourceKind: `shape-witness-real-renderer`,
    shapeWitnessFixtureId: fixtureId,
    shapeWitnessSplatCount: splatCount,
    shapeWitnessRealRenderer: true,
    // rendererLabel stays "shape-witness" each frame via the frame() closure override
  };
}

function tileLocalDisabledReasonForAttributes(attributes: SplatAttributes): string | null {
  if (!usesTileLocalPrepass(RENDERER_MODE) || TILE_LOCAL_UNSAFE) {
    return null;
  }
  if (attributes.count > TILE_LOCAL_PROVISIONAL_MAX_SPLATS) {
    return `tile-local disabled: ${attributes.count.toLocaleString()} splats exceeds provisional budget ${TILE_LOCAL_PROVISIONAL_MAX_SPLATS.toLocaleString()}`;
  }
  return null;
}

function isTileLocalBudgetError(err: unknown): boolean {
  return err instanceof Error && /(projected tile refs exceed budget|gpu tile coverage buffers exceed max storage binding)/.test(err.message);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function labelRendererMode(
  mode: RendererMode,
  tileLocalState: TileLocalSceneState | null,
  tileLocalDisabledReason: string | null = null,
  tileLocalLastSkipReason: string | null = null
): string {
  if (mode === "tile-local-visible" && tileLocalState) {
    const staleSuffix = tileLocalLastSkipReason ? "-stale-cache" : "";
    if (tileLocalState.debugMode !== "final-color") {
      return `tile-local-visible-debug-${tileLocalState.debugMode}${staleSuffix}`;
    }
    return `tile-local-visible-gaussian-compositor${staleSuffix}`;
  }
  if (mode === "tile-local-visible" && tileLocalDisabledReason) {
    return "tile-local-visible-budget-disabled-plate";
  }
  if (mode === "tile-local" && tileLocalState) {
    return tileLocalLastSkipReason ? "plate+tile-local-prepass-stale-cache" : "plate+tile-local-prepass";
  }
  if (mode === "tile-local" && tileLocalDisabledReason) {
    return "plate+tile-local-prepass-budget-disabled";
  }
  return mode;
}

function refreshTileLocalDiagnostics(
  state: TileLocalSceneState,
  perPixelFinalColorAccumulation: readonly Record<string, unknown>[] = [],
): TileLocalDiagnosticSummary {
  state.diagnostics = summarizeTileLocalDiagnostics({
    debugMode: state.debugMode,
    plan: state.plan,
    tileEntryCount: state.tileEntryCount,
    tileHeaders: state.tileHeaderData,
    tileRefCustody: state.tileRefCustody,
    retentionAudit: state.retentionAudit,
    tileCoverageWeights: state.tileCoverageWeightData,
    alphaParamData: state.alphaParamData,
    sourceOpacities: state.sourceOpacities,
    traceCapacityEvidence: traceCapacityEvidenceFromState(state, perPixelFinalColorAccumulation),
  });
  return state.diagnostics;
}

function traceCapacityEvidenceFromState(
  state: TileLocalSceneState,
  perPixelFinalColorAccumulation: readonly Record<string, unknown>[] = [],
): {
  anchors: {
    id: string;
    projectedCount: number;
    retainedCount: number;
    finalStepCount: number;
  }[];
} {
  const finalStepCountByAnchorId = new Map(
    perPixelFinalColorAccumulation.map((trace) => {
      const anchorPixel = trace.anchorPixel as { id?: string } | undefined;
      const traceRecord = (trace.traceRecord ?? trace) as {
        finalColorAccumulation?: { steps?: unknown[] };
      };
      return [
        String(anchorPixel?.id ?? ""),
        Array.isArray(traceRecord.finalColorAccumulation?.steps)
          ? traceRecord.finalColorAccumulation.steps.length
          : 0,
      ] as const;
    }),
  );

  return {
    anchors: state.perPixelRetainedContributors.map((record) => {
      const traceRecord = record.traceRecord ?? record;
      const finalColorAccumulation = (traceRecord as {
        finalColorAccumulation?: { steps?: unknown[] };
      }).finalColorAccumulation;
      return {
        id: record.anchorPixel.id,
        projectedCount: Array.isArray(traceRecord.projectedContributors)
          ? traceRecord.projectedContributors.length
          : 0,
        retainedCount: Array.isArray(traceRecord.retainedContributors)
          ? traceRecord.retainedContributors.length
          : 0,
        finalStepCount: finalStepCountByAnchorId.get(record.anchorPixel.id) ??
          (Array.isArray(finalColorAccumulation?.steps) ? finalColorAccumulation.steps.length : 0),
      };
    }),
  };
}

function exposeTileLocalRuntimeEvidence(
  rendererLabel: string,
  fps: number,
  tileLocalState: TileLocalSceneState | null,
  tileLocalDisabledReason: string | null,
  tileLocalLastSkipReason: string | null,
  tileLocalLastSkipSignature: string | null,
  nowMs: number,
  viewportWidth: number,
  viewportHeight: number,
  sourceColors: Float32Array
): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: Record<string, unknown>;
    __MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__?: TileLocalDiagnosticSummary;
    __MESH_SPLAT_PIXEL_CONTRIBUTOR_TRACE__?: PixelFinalAccumulationTraceRecord | BandPixelOrderTraceRecord;
  };
  const freshness = tileLocalState
    ? tileLocalPresentationFreshness(tileLocalState, tileLocalLastSkipReason, tileLocalLastSkipSignature, nowMs)
    : undefined;
  const budget = tileLocalBudgetEvidence(tileLocalLastSkipReason, viewportWidth, viewportHeight);
  const tileLocalStatus = tileLocalRuntimeStatus({
    tileLocalState,
    tileLocalDisabledReason,
    tileLocalLastSkipReason,
    freshness,
  });
  const arenaRuntime = buildArenaRuntimeEvidence(
    REQUESTED_ARENA_BACKEND,
    tileLocalState,
    tileLocalDisabledReason,
    tileLocalLastSkipReason
  );
  const bandDispatchCache = tileLocalState
    ? tileLocalLastSkipReason
      ? buildBandDispatchCacheTrace({
          tileColumns: tileLocalState.plan.tileColumns,
          tileRows: tileLocalState.plan.tileRows,
          tileSizePx: tileLocalState.plan.tileSizePx,
          viewportWidth,
          viewportHeight,
          currentFrameId: tileLocalState.lastCompositedFrame + 1,
          clearFrameId: tileLocalState.bandDispatchCacheTrace.clearFrameId,
          buildFrameId: tileLocalState.bandDispatchCacheTrace.buildFrameId,
          compositeFrameId: tileLocalState.bandDispatchCacheTrace.compositeFrameId,
          cacheState: "stale-cache",
        })
      : tileLocalState.bandDispatchCacheTrace
    : undefined;
  const pixelOrderTrace = tileLocalState && bandDispatchCache
    ? buildBandPixelOrderTraceRecord({
        contributors: tileLocalState.gpuArenaProjectedContributors,
        dispatchCache: bandDispatchCache,
        rendererMetadata: {
          requestedRenderer: "tile-local-visible",
          effectiveRenderer: rendererLabel,
          requestedArenaBackend: REQUESTED_ARENA_BACKEND,
          effectiveArenaBackend: arenaRuntime.effectiveArenaBackend,
          tileSizePx: tileLocalState.plan.tileSizePx,
          maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
          viewport: {
            width: viewportWidth,
            height: viewportHeight,
          },
        },
      })
    : undefined;
  const projectedTrace = tileLocalState?.perPixelProjectedContributors?.find(
    (trace) => trace?.anchorPixel?.id === "black-band-dropout-2300-1055",
  );
  const retainedTrace = tileLocalState?.perPixelRetainedContributors?.find(
    (trace) => trace?.anchorPixel?.id === "black-band-dropout-2300-1055",
  );
  const pixelContributorTrace = tileLocalState && bandDispatchCache && pixelOrderTrace
    ? buildFinalColorAccumulationTraceRecord({
        contributors: tileLocalState.gpuArenaProjectedContributors,
        sourceColors,
        projectedContributors: projectedTrace?.traceRecord?.projectedContributors ?? [],
        retainedContributors: retainedTrace?.traceRecord?.retainedContributors ?? [],
        orderedContributors: pixelOrderTrace.orderedContributors,
        dispatchCache: bandDispatchCache,
        rendererMetadata: pixelOrderTrace.rendererMetadata,
        deferredFields: pixelOrderTrace.deferredFields,
      })
    : undefined;
  const perPixelFinalColorAccumulation = tileLocalState && bandDispatchCache
    ? buildPerPixelFinalColorAccumulationTraces({
        contributors: tileLocalState.gpuArenaProjectedContributors,
        sourceColors,
        projectedContributorsByAnchorId: traceContributorListByAnchorId(
          tileLocalState.perPixelProjectedContributors,
          "projectedContributors",
        ),
        retainedContributorsByAnchorId: traceContributorListByAnchorId(
          tileLocalState.perPixelRetainedContributors,
          "retainedContributors",
        ),
        orderedContributorsByAnchorId: pixelOrderTrace
          ? new Map([[pixelOrderTrace.anchorPixel.id, pixelOrderTrace.orderedContributors]])
          : new Map(),
        dispatchCache: bandDispatchCache,
        rendererMetadata: pixelOrderTrace?.rendererMetadata ?? {
          requestedRenderer: "tile-local-visible",
          effectiveRenderer: rendererLabel,
          requestedArenaBackend: REQUESTED_ARENA_BACKEND,
          effectiveArenaBackend: arenaRuntime.effectiveArenaBackend,
          tileSizePx: tileLocalState.plan.tileSizePx,
          maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
          viewport: {
            width: viewportWidth,
            height: viewportHeight,
          },
        },
        deferredFields: pixelOrderTrace?.deferredFields,
        tileSizePx: tileLocalState.plan.tileSizePx,
        tileColumns: tileLocalState.plan.tileColumns,
        anchors: tileLocalState.traceAnchors,
      })
    : buildPerPixelFinalColorAccumulationTrace(pixelContributorTrace);
  const perPixelDeadSplatElectorLedger = tileLocalState
    ? buildDeadSplatElectorLedger(tileLocalState.perPixelRetainedContributors)
    : undefined;
  const perPixelRetainedToOrderedSurvivalLedger = tileLocalState
    ? buildRetainedToOrderedSurvivalLedger(
        perPixelFinalColorAccumulation.map((trace) =>
          (trace.traceRecord ?? trace) as Record<string, unknown>
        )
      )
    : undefined;
  const diagnostics = tileLocalState
    ? refreshTileLocalDiagnostics(tileLocalState, perPixelFinalColorAccumulation)
    : undefined;
  runtimeWindow.__MESH_SPLAT_SMOKE__ = {
    ...(runtimeWindow.__MESH_SPLAT_SMOKE__ ?? {}),
    rendererLabel,
    fps,
    tileLocalStatus,
    tileLocalDisabledReason,
    tileLocalLastSkipReason,
    arenaRuntime,
    tileLocal: tileLocalState && diagnostics
      ? {
          status: tileLocalStatus,
          refs: diagnostics.tileRefs.total,
          allocatedRefs: tileLocalState.tileEntryCount,
          tileColumns: tileLocalState.plan.tileColumns,
          tileRows: tileLocalState.plan.tileRows,
          perPixelProjectedContributors: tileLocalState.perPixelProjectedContributors,
          perPixelRetainedContributors: tileLocalState.perPixelRetainedContributors,
          perPixelFinalColorAccumulation,
          perPixelDeadSplatElectorLedger,
          perPixelRetainedToOrderedSurvivalLedger,
          orderingBackend: TILE_LOCAL_ORDERING_BACKEND,
          debugMode: tileLocalState.debugMode,
          visibleCompositedRefLimit: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
          freshness,
          budget: {
            ...budget,
            status: tileLocalStatus,
          },
          budgetDiagnostics: tileLocalState.budgetDiagnostics,
          diagnostics,
          pixelContributorTrace,
        }
      : undefined,
  };
  if (diagnostics) {
    runtimeWindow.__MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__ = diagnostics;
  } else {
    delete runtimeWindow.__MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__;
  }
  if (pixelContributorTrace) {
    runtimeWindow.__MESH_SPLAT_PIXEL_CONTRIBUTOR_TRACE__ = pixelContributorTrace;
  } else {
    delete runtimeWindow.__MESH_SPLAT_PIXEL_CONTRIBUTOR_TRACE__;
  }
}

function traceContributorListByAnchorId(
  traces: readonly { anchorPixel?: { id?: string }; traceRecord?: Record<string, unknown> }[] | undefined,
  listName: string,
): Map<string, readonly unknown[]> {
  const byAnchorId = new Map<string, readonly unknown[]>();
  for (const trace of traces ?? []) {
    const anchorId = trace?.anchorPixel?.id;
    const list = trace?.traceRecord?.[listName];
    if (typeof anchorId === "string" && Array.isArray(list)) {
      byAnchorId.set(anchorId, list);
    }
  }
  return byAnchorId;
}

function buildArenaRuntimeEvidence(
  requestedArenaBackend: "cpu" | "gpu",
  tileLocalState: TileLocalSceneState | null,
  tileLocalDisabledReason: string | null,
  tileLocalLastSkipReason: string | null
): ArenaRuntimeEvidence {
  const cpuBuildDurationMs = tileLocalState?.budgetDiagnostics.heat.cpu.buildDurationMs;
  const effectiveArenaBackend = tileLocalState?.arenaBackend ?? "cpu";
  return {
    requestedArenaBackend,
    effectiveArenaBackend,
    cpuBuildDurationMs: typeof cpuBuildDurationMs === "number" && Number.isFinite(cpuBuildDurationMs)
      ? cpuBuildDurationMs
      : undefined,
    cpuBridgeBuildDurationMs: typeof cpuBuildDurationMs === "number" && Number.isFinite(cpuBuildDurationMs)
      ? cpuBuildDurationMs
      : undefined,
    gpuDispatchEnqueueDurationMs: effectiveArenaBackend === "gpu"
      ? tileLocalState?.gpuDispatchEnqueueDurationMs
      : undefined,
    unavailableReason: requestedArenaBackend === "gpu" && effectiveArenaBackend !== "gpu"
      ? tileLocalState?.arenaUnavailableReason ?? "gpu contributor arena runtime unavailable"
      : undefined,
    skippedReason: tileLocalLastSkipReason ?? tileLocalDisabledReason ?? undefined,
    fallbackReason:
      requestedArenaBackend === "gpu" && effectiveArenaBackend !== "gpu"
        ? "requested gpu arena backend fell back to the CPU bridge"
        : undefined,
  };
}

function tileLocalRuntimeStatus({
  tileLocalState,
  tileLocalDisabledReason,
  tileLocalLastSkipReason,
  freshness,
}: {
  tileLocalState: TileLocalSceneState | null;
  tileLocalDisabledReason: string | null;
  tileLocalLastSkipReason: string | null;
  freshness?: { status?: string };
}): string {
  if (tileLocalDisabledReason) return "budget-disabled";
  if (tileLocalLastSkipReason) return "stale-cache";
  if (tileLocalState) return freshness?.status === "current" ? "current" : "current";
  return "not-applicable";
}

function tileLocalPresentationFreshness(
  state: TileLocalSceneState,
  tileLocalLastSkipReason: string | null,
  tileLocalLastSkipSignature: string | null,
  nowMs: number
) {
  const currentFrameSignature = shortTileLocalSignature(tileLocalLastSkipSignature ?? state.lastCompositedSignature);
  const cachedFrameSignature = shortTileLocalSignature(state.lastCompositedSignature);
  if (tileLocalLastSkipReason) {
    return {
      status: "stale-cache",
      cachedFrameAgeMs: Math.max(0, Math.round(nowMs - state.lastCompositedAtMs)),
      cachedFrame: state.lastCompositedFrame,
      currentFrameSignature,
      cachedFrameSignature,
    };
  }
  return {
    status: "current",
    cachedFrameAgeMs: 0,
    cachedFrame: state.lastCompositedFrame,
    currentFrameSignature: cachedFrameSignature,
    cachedFrameSignature,
  };
}

function tileLocalBudgetEvidence(
  tileLocalLastSkipReason: string | null,
  viewportWidth: number,
  viewportHeight: number
) {
  const parsed = parseTileLocalBudgetSkipReason(tileLocalLastSkipReason);
  return {
    status: parsed ? "skipped" : "current",
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
    currentViewportWidth: viewportWidth,
    currentViewportHeight: viewportHeight,
    currentTileColumns: tileColumnsForViewport(viewportWidth),
    currentTileRows: tileRowsForViewport(viewportHeight),
    maxProjectedRefs: parsed?.maxProjectedRefs ?? TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    skippedProjectedRefs: parsed?.skippedProjectedRefs ?? null,
    skipReason: tileLocalLastSkipReason,
    overflowReasons: parsed ? ["projected-ref-budget"] : [],
  };
}

function formatTileLocalBudgetLabel(budget: ReturnType<typeof tileLocalBudgetEvidence>): string {
  if (budget.skippedProjectedRefs !== null && budget.maxProjectedRefs !== null) {
    return `skipped ${budget.skippedProjectedRefs.toLocaleString()} projected refs | cap ${budget.maxProjectedRefs.toLocaleString()} | per-tile cap ${budget.maxRefsPerTile.toLocaleString()}${budget.skipReason ? ` | skip ${budget.skipReason}` : ""}`;
  }
  return `cap ${budget.maxProjectedRefs.toLocaleString()} | per-tile cap ${budget.maxRefsPerTile.toLocaleString()}`;
}

function parseTileLocalBudgetSkipReason(reason: string | null): { skippedProjectedRefs: number; maxProjectedRefs: number } | null {
  const match = /projected tile refs exceed budget:\s*([\d,]+)\s*>\s*([\d,]+)/i.exec(reason ?? "");
  if (!match) {
    return null;
  }
  return {
    skippedProjectedRefs: Number(match[1].replaceAll(",", "")),
    maxProjectedRefs: Number(match[2].replaceAll(",", "")),
  };
}

function tileColumnsForViewport(viewportWidth: number): number {
  return Math.ceil(Math.max(viewportWidth, 1) / TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX);
}

function tileRowsForViewport(viewportHeight: number): number {
  return Math.ceil(Math.max(viewportHeight, 1) / TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX);
}

function shortTileLocalSignature(signature: string): string {
  let hash = 2166136261;
  for (let index = 0; index < signature.length; index++) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `tile-local@${(hash >>> 0).toString(16).padStart(8, "0")}`;
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
