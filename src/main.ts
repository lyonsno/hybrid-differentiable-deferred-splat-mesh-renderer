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
import {
  classifyTileLocalProjectedRefGuard,
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
const COMPACT_SOURCE_SIGMA_RADIUS = 3;
const COMPACT_SOURCE_ANCHOR_TILE_NEIGHBORHOOD_RADIUS = 2;
const COMPACT_SOURCE_ANCHOR_PREFILTER_MIN_MARGIN_PX = 96;
const COMPACT_SOURCE_ANCHOR_PREFILTER_MAX_MARGIN_PX = 384;
const COMPACT_SOURCE_EPSILON = 1e-9;
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
  readonly canonicalTileAddress: {
    readonly tileX: number;
    readonly tileY: number;
    readonly tileIndex: number;
    readonly localX: number;
    readonly localY: number;
  } | null;
}

interface CompactRetainedSourceForRuntime {
  readonly projectedRecords: readonly GpuTileContributorArenaProjectedContributor[];
  readonly retainedRecords: readonly GpuTileContributorArenaProjectedContributor[];
  readonly droppedRecords: readonly GpuTileContributorArenaProjectedContributor[];
  readonly projectedContributorCount: number;
  readonly retainedContributorCount: number;
  readonly droppedContributorCount: number;
  readonly projectedRefBudgetOverflow: {
    readonly projectedRefs: number;
    readonly maxProjectedRefs: number;
    readonly mode: string;
  } | null;
  readonly tileRefCustody: TileRefCustodySummary;
  readonly perPixelProjectedContributors: TileLocalPrepassBridge["perPixelProjectedContributors"];
  readonly perPixelRetainedContributors: TileLocalPrepassBridge["perPixelRetainedContributors"];
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

  async function updateSceneLoadStage(label: string): Promise<void> {
    statsEl.textContent = label;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  async function replaceSplatScene(attributes: SplatAttributes, sceneAssetPath: string): Promise<void> {
    const previous = activeScene;
    await updateSceneLoadStage(`Preparing ${attributes.count.toLocaleString()} splats...`);
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
    await updateSceneLoadStage(`Creating GPU buffers for ${attributes.count.toLocaleString()} splats...`);
    const gpuSort = createGpuSortPrototype(gpu.device, attributes.count, "first_smoke_gpu_bitonic_sort");
    const sortState = createSortSettleState(initialView);
    const buffers = uploadSplatAttributeBuffers(gpu.device, attributes);
    const effectiveOpacities = new Float32Array(attributes.count);
    const initialSplatScale = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_SPLAT_SCALE : REAL_SCANIVERSE_SPLAT_SCALE;
    const initialMinRadiusPx = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_MIN_RADIUS_PX : REAL_SCANIVERSE_MIN_RADIUS_PX;
    await updateSceneLoadStage(`Computing alpha density for ${attributes.count.toLocaleString()} splats...`);
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
        await updateSceneLoadStage(`Building compact tile-local source for ${attributes.count.toLocaleString()} splats...`);
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
      await replaceSplatScene(await fetchFirstSmokeSplatPayload(assetPath), assetPath);
    } else {
      statsEl.textContent = `Loading shape-witness fixture: ${shapeWitnessFixtureId}...`;
      const fixtureAttributes = splatAttributesFromFixture(fixture);
      // replaceSplatScene uses the bounds-based camera internally; we will override
      // the camera immediately after with the fixture's exact camera specification.
      await replaceSplatScene(fixtureAttributes, `shape-witness:${fullFixtureId}`);
      // Override camera to fixture specification (replaces the bounds-based camera set above).
      configureCameraForFixture(cam, fixture.camera, fixtureAttributes.bounds);
      // Expose shape-witness smoke evidence with ready: true so the capture harness can proceed.
      // This overwrites the replaceSplatScene evidence with shape-witness-specific metadata.
      exposeShapeWitnessSmokeEvidence(shapeWitnessFixtureId, fixtureAttributes.count);
      statsEl.textContent = `shape-witness: ${shapeWitnessFixtureId} | renderer: shape-witness | splats: ${fixtureAttributes.count}`;
    }
  } else {
    await replaceSplatScene(await fetchFirstSmokeSplatPayload(assetPath), assetPath);
  }
  bindDroppedSplatLoading(canvas, async (file) => {
    statsEl.textContent = `Loading ${file.name}...`;
    try {
      await replaceSplatScene(await loadDroppedSplatFile(file), `local-file:${file.name}`);
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
        if (tileLocalState.gpuArenaRuntime || (scene.rendererMode === "tile-local-visible" && tileLocalState.arenaBackend !== "gpu")) {
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
  const compactSource = buildCompactRetainedSourceForRuntime({
    attributes,
    effectiveOpacities,
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    tileColumns,
    tileRows,
    splatScale: footprintParams.splatScale,
    minRadiusPx: footprintParams.minRadiusPx,
    maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
    maxTileEntries: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    nearFadeEndNdc: footprintParams.nearFadeEndNdc,
    buildProjectionRetentionArena: buildDeterministicGpuTileProjectionRetentionArena,
    anchors: TILE_LOCAL_TRACE_ANCHORS ?? [],
  });
  if (compactSource.retainedRecords.length === 0) {
    throw new Error("compact retained source produced no retained contributors for gpu arena runtime");
  }
  const maxTileRefs = Math.max(compactSource.retainedRecords.length, attributes.count, 1);
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
  const gpuArenaRuntimeBlocker = gpuArenaRuntimeUnavailableReason(device, plan, compactSource.retainedRecords.length);
  if (gpuArenaRuntimeBlocker) {
    throw new Error(gpuArenaRuntimeBlocker);
  }
  const gpuArenaRuntime = createGpuTileContributorArenaRuntime(device, plan, compactSource.retainedRecords);
  const legacyProjection = gpuArenaRuntime.legacyProjection;
  const pipeline = createGpuTileCoveragePipelineSkeleton(device, "rgba16float");
  const frameUniformBuffer = createUniformBuffer(
    device,
    GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
    "tile_local_frame_uniforms"
  );
  const frameUniformData = new Float32Array(GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);
  const tileBuildCountBuffer = createEmptyStorageBuffer(
    device,
    Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT),
    "gpu_compact_source_tile_build_counts"
  );
  const tileScatterCursorBuffer = createEmptyStorageBuffer(
    device,
    Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT),
    "gpu_compact_source_tile_scatter_cursors"
  );
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
    tileHeaderBuffer: gpuArenaRuntime.buffers.legacyTileHeaderBuffer,
    tileRefBuffer: gpuArenaRuntime.buffers.legacyTileRefBuffer,
    tileCoverageWeightBuffer: gpuArenaRuntime.buffers.legacyTileCoverageWeightBuffer,
    tileScatterCursorBuffer,
    alphaParamBuffer: gpuArenaRuntime.buffers.legacyAlphaParamBuffer,
    outputColorView: outputView,
  });
  const tileRefCustody = compactSource.tileRefCustody;
  const retentionAudit = emptyTileRetentionAudit();
  const budgetDiagnostics = compactRetainedSourceBudgetDiagnostics(plan, compactSource);
  const alphaParamData = new Float32Array(Math.max(plan.alphaParamBytes / Float32Array.BYTES_PER_ELEMENT, 8));
  alphaParamData.set(legacyProjection.alphaParamData.slice(0, alphaParamData.length));
  const diagnostics = summarizeTileLocalDiagnostics({
    debugMode: TILE_LOCAL_DEBUG_MODE,
    plan,
    tileEntryCount: compactSource.retainedRecords.length,
    tileHeaders: legacyProjection.tileHeaders,
    tileRefCustody,
    retentionAudit,
    tileCoverageWeights: legacyProjection.tileCoverageWeights,
    alphaParamData,
    sourceOpacities: effectiveOpacities,
    runtimeContributors: compactSource.retainedRecords,
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
    tileHeaderBuffer: gpuArenaRuntime.buffers.legacyTileHeaderBuffer,
    tileHeaderData: legacyProjection.tileHeaders,
    tileRefBuffer: gpuArenaRuntime.buffers.legacyTileRefBuffer,
    tileCoverageWeightBuffer: gpuArenaRuntime.buffers.legacyTileCoverageWeightBuffer,
    tileCoverageWeightData: legacyProjection.tileCoverageWeights,
    tileBuildCountBuffer,
    tileScatterCursorBuffer,
    alphaParamBuffer: gpuArenaRuntime.buffers.legacyAlphaParamBuffer,
    alphaParamData,
    sourceOpacities: effectiveOpacities,
    tileRefShapeParams: legacyProjection.tileRefShapeParams,
    outputTexture,
    outputView,
    tileEntryCount: compactSource.retainedRecords.length,
    tileRefCustody,
    retentionAudit,
    budgetDiagnostics,
    tileRefSplatIds: legacyProjection.tileRefSplatIds,
    prepassSignature,
    debugMode: TILE_LOCAL_DEBUG_MODE,
    diagnostics,
    arenaBackend: "gpu",
    gpuArenaRuntime,
    gpuArenaProjectedContributors: compactSource.retainedRecords,
    traceAnchors: TILE_LOCAL_TRACE_ANCHORS,
    perPixelProjectedContributors: compactSource.perPixelProjectedContributors,
    perPixelRetainedContributors: compactSource.perPixelRetainedContributors,
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

function buildCompactRetainedSourceForRuntime({
  attributes,
  effectiveOpacities,
  viewMatrix,
  viewProj,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  tileRows,
  splatScale,
  minRadiusPx,
  maxRefsPerTile,
  maxTileEntries,
  nearFadeEndNdc,
  buildProjectionRetentionArena,
  anchors,
}: {
  readonly attributes: SplatAttributes;
  readonly effectiveOpacities: Float32Array;
  readonly viewMatrix: Float32Array;
  readonly viewProj: Float32Array;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly splatScale: number;
  readonly minRadiusPx: number;
  readonly maxRefsPerTile: number;
  readonly maxTileEntries: number;
  readonly nearFadeEndNdc: number;
  readonly buildProjectionRetentionArena: typeof buildDeterministicGpuTileProjectionRetentionArena;
  readonly anchors: readonly PixelTraceAnchor[];
}): CompactRetainedSourceForRuntime {
  const tileCount = tileColumns * tileRows;
  const anchorTileIndexes = compactSourceAnchorTileNeighborhoodIndexes({
    anchors,
    tileSizePx,
    tileColumns,
    tileRows,
    radiusTiles: COMPACT_SOURCE_ANCHOR_TILE_NEIGHBORHOOD_RADIUS,
  });
  const retainedCapacity = tileCount * maxRefsPerTile;
  const useAnchorPrefilter = anchorTileIndexes.size > 0 && retainedCapacity <= maxTileEntries && tileCount > 10_000;
  const anchorCandidateSplatIndexes = useAnchorPrefilter
    ? selectCompactAnchorCandidateSplatIndexes({
        attributes,
        viewProj,
        viewportWidth,
        viewportHeight,
        splatScale,
        minRadiusPx,
        tileSizePx,
        tileColumns,
        tileRows,
        anchorTileIndexes,
        maxCandidatesPerTile: maxRefsPerTile * 4,
      })
    : null;
  const splats = projectRuntimeSplatsForCompactSource({
    attributes,
    viewProj,
    viewportWidth,
    viewportHeight,
    splatScale,
    minRadiusPx,
    nearFadeEndNdc,
    onlyTileIndexes: useAnchorPrefilter ? anchorTileIndexes : null,
    tileSizePx,
    tileColumns,
    tileRows,
    candidateSplatIndexes: anchorCandidateSplatIndexes,
  });
  const rendererMetadata = {
    requestedRenderer: "tile-local-visible",
    effectiveRenderer: "tile-local-visible-gaussian-compositor",
    requestedArenaBackend: REQUESTED_ARENA_BACKEND,
    effectiveArenaBackend: "gpu",
    tileSizePx,
    maxRefsPerTile,
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
    },
    traceExtractionBackend: "compact-retained-source-runtime",
  };
  return buildStreamingCompactRetainedSourceForRuntime({
    splats,
    attributes,
    effectiveOpacities,
    viewMatrix,
    viewportWidth,
    viewportHeight,
    tileSizePx,
    tileColumns,
    tileRows,
    maxRefsPerTile,
    maxTileEntries,
    samplesPerAxis: TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES,
    anchors,
    anchorTileIndexes,
    forceAnchorOnly: useAnchorPrefilter,
    rendererMetadata,
  });
}

function buildStreamingCompactRetainedSourceForRuntime({
  splats,
  attributes,
  effectiveOpacities,
  viewMatrix,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  tileRows,
  maxRefsPerTile,
  maxTileEntries,
  samplesPerAxis,
  anchors,
  anchorTileIndexes,
  forceAnchorOnly,
  rendererMetadata,
}: {
  readonly splats: RuntimeCompactTileCoverage["splats"];
  readonly attributes: SplatAttributes;
  readonly effectiveOpacities: Float32Array;
  readonly viewMatrix: Float32Array;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly maxRefsPerTile: number;
  readonly maxTileEntries: number;
  readonly samplesPerAxis: number;
  readonly anchors: readonly PixelTraceAnchor[];
  readonly anchorTileIndexes?: ReadonlySet<number> | null;
  readonly forceAnchorOnly?: boolean;
  readonly rendererMetadata: Record<string, unknown>;
}): CompactRetainedSourceForRuntime {
  const tileCount = tileColumns * tileRows;
  const projectedCounts = new Uint32Array(Math.max(0, tileCount));
  const effectiveAnchorTileIndexes = anchorTileIndexes ?? compactSourceAnchorTileIndexes({ anchors, tileSizePx, tileColumns, tileRows });
  const retainedCapacity = tileCount * maxRefsPerTile;
  const projectedTileRefEstimate = estimateCompactProjectedTileRefCount({
    splats,
    viewportWidth,
    viewportHeight,
    tileSizePx,
    maxTileEntries,
  });
  const retainOnlyAnchorTiles = Boolean(forceAnchorOnly) || (projectedTileRefEstimate > maxTileEntries && retainedCapacity <= maxTileEntries);
  const projectedRefBudgetOverflow: CompactRetainedSourceForRuntime["projectedRefBudgetOverflow"] = retainOnlyAnchorTiles
    ? {
        projectedRefs: maxTileEntries + 1,
        maxProjectedRefs: maxTileEntries,
        mode: "diagnostic-retained-handoff",
      }
    : null;
  const { ranks, depths } = compactSourceBackToFrontDepthEvidence(attributes, viewMatrix);
  const splatsByIndex = new Map(splats.map((splat) => [splat.splatIndex, splat]));
  const buckets = new Map<number, CompactStreamingTileBucket>();
  const anchorProjectedRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const tileHeaderU32 = new Uint32Array(Math.max(0, tileCount * 8));
  let projectedIndex = 0;

  streamCompactProjectedTileRefs({
    splats,
    viewportWidth,
    viewportHeight,
    tileSizePx,
    tileColumns,
    samplesPerAxis,
    onlyTileIndexes: retainOnlyAnchorTiles ? effectiveAnchorTileIndexes : null,
    onEntry({ splat, tileIndex, tileX, tileY, coverageWeight }) {
      const currentProjectedIndex = projectedIndex;
      projectedIndex += 1;
      projectedCounts[tileIndex] += 1;
      const shouldRetainTile = !retainOnlyAnchorTiles || effectiveAnchorTileIndexes.has(tileIndex);
      if (!shouldRetainTile && !effectiveAnchorTileIndexes.has(tileIndex)) {
        return;
      }
      const record = compactCoverageEntryToRuntimeContributor({
        entry: {
          tileIndex,
          tileX,
          tileY,
          splatIndex: splat.splatIndex,
          originalId: splat.originalId,
          coverageWeight,
        },
        projectedIndex: currentProjectedIndex,
        splatsByIndex,
        ranks,
        depths,
        attributes,
        effectiveOpacities,
      });
      if (effectiveAnchorTileIndexes.has(tileIndex)) {
        anchorProjectedRecords.push(record);
      }
      if (shouldRetainTile) {
        const bucket = compactStreamingTileBucket(buckets, tileIndex);
        compactRetainTopRecord(bucket.coverageRecords, record, maxRefsPerTile, compareCompactProjectionRetentionCoverageOrder);
        compactRetainTopRecord(bucket.retentionRecords, record, Math.max(1, Math.floor(maxRefsPerTile / 2)), compareCompactProjectionRetentionPriority);
        compactRetainTopRecord(bucket.occlusionRecords, record, Math.max(1, Math.floor(maxRefsPerTile / 2)), compareCompactProjectionOcclusionPriority);
      }
    },
  });

  const retainedRecords: GpuTileContributorArenaProjectedContributor[] = [];
  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    const bucket = buckets.get(tileIndex);
    const projectedCount = projectedCounts[tileIndex] ?? 0;
    const retainedOffset = retainedRecords.length;
    let retainedTileRecords: GpuTileContributorArenaProjectedContributor[] = [];
    if (bucket) {
      const projectedTileRecords = compactMergedTileCandidateRecords(bucket)
        .sort(compareCompactProjectionRetentionCoverageOrder);
      retainedTileRecords = selectCompactProjectionRetentionRecords(
        projectedTileRecords,
        maxRefsPerTile,
        projectedCount,
      ).sort(compareCompactProjectionRetentionCompositorOrder);
      retainedRecords.push(...retainedTileRecords);
    }

    const retainedCount = retainedTileRecords.length;
    const droppedCount = Math.max(0, projectedCount - retainedCount);
    const headerBase = tileIndex * 8;
    tileHeaderU32[headerBase] = retainedOffset;
    tileHeaderU32[headerBase + 1] = retainedCount;
    tileHeaderU32[headerBase + 2] = projectedCount;
    tileHeaderU32[headerBase + 3] = droppedCount;
    tileHeaderU32[headerBase + 4] = droppedCount > 0 ? 1 : 0;
    tileHeaderU32[headerBase + 5] = retainedCount === 0 ? 0xffffffff : compactMaxRetainedViewRank(retainedTileRecords);
  }

  const streamedProjectedContributorCount = projectedIndex;
  const projectedContributorCount = Math.max(projectedRefBudgetOverflow?.projectedRefs ?? 0, streamedProjectedContributorCount);
  const droppedContributorCount = Math.max(0, projectedContributorCount - retainedRecords.length);
  const tileRefCustody = compactTileRefCustody({
    tileCount,
    tileHeaders: tileHeaderU32,
    projectedContributorCount,
    retainedContributorCount: retainedRecords.length,
    droppedContributorCount,
    maxRefsPerTile,
  });

  return {
    projectedRecords: anchorProjectedRecords,
    retainedRecords,
    droppedRecords: [],
    projectedContributorCount,
    retainedContributorCount: retainedRecords.length,
    droppedContributorCount,
    projectedRefBudgetOverflow,
    tileRefCustody,
    perPixelProjectedContributors: compactPerPixelContributorTraces({
      contributors: anchorProjectedRecords,
      listName: "projectedContributors",
      viewportWidth,
      viewportHeight,
      tileSizePx,
      tileColumns,
      tileRows,
      anchors,
      rendererMetadata,
    }) as unknown as TileLocalPrepassBridge["perPixelProjectedContributors"],
    perPixelRetainedContributors: compactPerPixelContributorTraces({
      contributors: retainedRecords,
      projectedContributors: anchorProjectedRecords,
      listName: "retainedContributors",
      viewportWidth,
      viewportHeight,
      tileSizePx,
      tileColumns,
      tileRows,
      anchors,
      rendererMetadata,
    }) as unknown as TileLocalPrepassBridge["perPixelRetainedContributors"],
  };
}

function estimateCompactProjectedTileRefCount({
  splats,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  maxTileEntries,
}: {
  readonly splats: RuntimeCompactTileCoverage["splats"];
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly maxTileEntries: number;
}): number {
  let projectedTileRefs = 0;
  for (const splat of splats) {
    const covariance = compactSourceCovariance(splat.covariancePx);
    const tileBounds = compactSourceTileBoundsForSplat({
      centerPx: splat.centerPx,
      covariance,
      viewportWidth,
      viewportHeight,
      tileSizePx,
    });
    projectedTileRefs += (tileBounds.maxTileX - tileBounds.minTileX + 1) * (tileBounds.maxTileY - tileBounds.minTileY + 1);
    if (projectedTileRefs > maxTileEntries) {
      return projectedTileRefs;
    }
  }
  return projectedTileRefs;
}

interface CompactStreamingTileBucket {
  readonly coverageRecords: GpuTileContributorArenaProjectedContributor[];
  readonly retentionRecords: GpuTileContributorArenaProjectedContributor[];
  readonly occlusionRecords: GpuTileContributorArenaProjectedContributor[];
}

function compactStreamingTileBucket(
  buckets: Map<number, CompactStreamingTileBucket>,
  tileIndex: number,
): CompactStreamingTileBucket {
  let bucket = buckets.get(tileIndex);
  if (!bucket) {
    bucket = {
      coverageRecords: [],
      retentionRecords: [],
      occlusionRecords: [],
    };
    buckets.set(tileIndex, bucket);
  }
  return bucket;
}

function compactRetainTopRecord(
  records: GpuTileContributorArenaProjectedContributor[],
  record: GpuTileContributorArenaProjectedContributor,
  limit: number,
  compareRecords: typeof compareCompactProjectionRetentionCoverageOrder,
): void {
  const key = compactProjectionRetentionRecordKey(record);
  if (records.some((candidate) => compactProjectionRetentionRecordKey(candidate) === key)) {
    return;
  }
  if (records.length < limit) {
    records.push(record);
    return;
  }

  let worstIndex = 0;
  for (let index = 1; index < records.length; index += 1) {
    if (compareRecords(records[index], records[worstIndex]) > 0) {
      worstIndex = index;
    }
  }
  if (compareRecords(record, records[worstIndex]) < 0) {
    records[worstIndex] = record;
  }
}

function compactMergedTileCandidateRecords(
  bucket: CompactStreamingTileBucket,
): GpuTileContributorArenaProjectedContributor[] {
  const records = [];
  const seen = new Set<string>();
  for (const record of [...bucket.coverageRecords, ...bucket.retentionRecords, ...bucket.occlusionRecords]) {
    const key = compactProjectionRetentionRecordKey(record);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    records.push(record);
  }
  return records;
}

function streamCompactProjectedTileRefs({
  splats,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  samplesPerAxis,
  onlyTileIndexes,
  onEntry,
}: {
  readonly splats: RuntimeCompactTileCoverage["splats"];
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly samplesPerAxis: number;
  readonly onlyTileIndexes?: ReadonlySet<number> | null;
  readonly onEntry: (entry: {
    readonly splat: RuntimeCompactTileCoverage["splats"][number];
    readonly tileIndex: number;
    readonly tileX: number;
    readonly tileY: number;
    readonly coverageWeight: number;
  }) => void;
}): void {
  for (const splat of splats) {
    const covariance = compactSourceCovariance(splat.covariancePx);
    const tileBounds = compactSourceTileBoundsForSplat({
      centerPx: splat.centerPx,
      covariance,
      viewportWidth,
      viewportHeight,
      tileSizePx,
    });
    if (onlyTileIndexes) {
      for (const tileIndex of onlyTileIndexes) {
        const tileX = tileIndex % tileColumns;
        const tileY = Math.floor(tileIndex / tileColumns);
        if (
          tileX < tileBounds.minTileX ||
          tileX > tileBounds.maxTileX ||
          tileY < tileBounds.minTileY ||
          tileY > tileBounds.maxTileY
        ) {
          continue;
        }
        const tileMinX = tileX * tileSizePx;
        const tileMinY = tileY * tileSizePx;
        const tileMaxX = Math.min(viewportWidth, tileMinX + tileSizePx);
        const tileMaxY = Math.min(viewportHeight, tileMinY + tileSizePx);
        const coverageWeight = compactSourceTileCoverageWeight({
          centerPx: splat.centerPx,
          covariance,
          tileMinX,
          tileMinY,
          tileMaxX,
          tileMaxY,
          samplesPerAxis,
        });
        if (coverageWeight <= 0) {
          continue;
        }
        onEntry({ splat, tileIndex, tileX, tileY, coverageWeight });
      }
      continue;
    }

    for (let tileY = tileBounds.minTileY; tileY <= tileBounds.maxTileY; tileY += 1) {
      for (let tileX = tileBounds.minTileX; tileX <= tileBounds.maxTileX; tileX += 1) {
        const tileMinX = tileX * tileSizePx;
        const tileMinY = tileY * tileSizePx;
        const tileMaxX = Math.min(viewportWidth, tileMinX + tileSizePx);
        const tileMaxY = Math.min(viewportHeight, tileMinY + tileSizePx);
        const coverageWeight = compactSourceTileCoverageWeight({
          centerPx: splat.centerPx,
          covariance,
          tileMinX,
          tileMinY,
          tileMaxX,
          tileMaxY,
          samplesPerAxis,
        });
        if (coverageWeight <= 0) {
          continue;
        }
        const tileIndex = tileY * tileColumns + tileX;
        onEntry({ splat, tileIndex, tileX, tileY, coverageWeight });
      }
    }
  }
}

function compactSourceCovariance(covariancePx: RuntimeCompactTileCoverage["splats"][number]["covariancePx"]): {
  readonly xx: number;
  readonly xy: number;
  readonly yy: number;
  readonly determinant: number;
} {
  const xx = finiteOrZero(covariancePx.xx);
  const xy = finiteOrZero(covariancePx.xy ?? 0);
  const yy = finiteOrZero(covariancePx.yy);
  const determinant = xx * yy - xy * xy;
  if (xx <= 0 || yy <= 0 || determinant <= 0) {
    return { xx: 1, xy: 0, yy: 1, determinant: 1 };
  }
  return { xx, xy, yy, determinant };
}

function compactSourceTileBoundsForSplat({
  centerPx,
  covariance,
  viewportWidth,
  viewportHeight,
  tileSizePx,
}: {
  readonly centerPx: readonly [number, number];
  readonly covariance: { readonly xx: number; readonly yy: number };
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
}): {
  readonly minTileX: number;
  readonly minTileY: number;
  readonly maxTileX: number;
  readonly maxTileY: number;
} {
  const radiusX = COMPACT_SOURCE_SIGMA_RADIUS * Math.sqrt(Math.max(covariance.xx, 0));
  const radiusY = COMPACT_SOURCE_SIGMA_RADIUS * Math.sqrt(Math.max(covariance.yy, 0));
  const minX = compactClamp(centerPx[0] - radiusX, 0, viewportWidth);
  const maxX = compactClamp(centerPx[0] + radiusX, 0, viewportWidth);
  const minY = compactClamp(centerPx[1] - radiusY, 0, viewportHeight);
  const maxY = compactClamp(centerPx[1] + radiusY, 0, viewportHeight);
  const maxTileXLimit = Math.max(0, Math.ceil(viewportWidth / tileSizePx) - 1);
  const maxTileYLimit = Math.max(0, Math.ceil(viewportHeight / tileSizePx) - 1);
  return {
    minTileX: compactClamp(Math.floor(minX / tileSizePx), 0, maxTileXLimit),
    minTileY: compactClamp(Math.floor(minY / tileSizePx), 0, maxTileYLimit),
    maxTileX: compactClamp(Math.floor((maxX - COMPACT_SOURCE_EPSILON) / tileSizePx), 0, maxTileXLimit),
    maxTileY: compactClamp(Math.floor((maxY - COMPACT_SOURCE_EPSILON) / tileSizePx), 0, maxTileYLimit),
  };
}

function compactSourceTileCoverageWeight({
  centerPx,
  covariance,
  tileMinX,
  tileMinY,
  tileMaxX,
  tileMaxY,
  samplesPerAxis,
}: {
  readonly centerPx: readonly [number, number];
  readonly covariance: { readonly xx: number; readonly xy: number; readonly yy: number; readonly determinant: number };
  readonly tileMinX: number;
  readonly tileMinY: number;
  readonly tileMaxX: number;
  readonly tileMaxY: number;
  readonly samplesPerAxis: number;
}): number {
  const width = tileMaxX - tileMinX;
  const height = tileMaxY - tileMinY;
  if (width <= 0 || height <= 0) {
    return 0;
  }
  let densitySum = 0;
  for (let yIndex = 0; yIndex < samplesPerAxis; yIndex += 1) {
    const y = tileMinY + ((yIndex + 0.5) / samplesPerAxis) * height;
    for (let xIndex = 0; xIndex < samplesPerAxis; xIndex += 1) {
      const x = tileMinX + ((xIndex + 0.5) / samplesPerAxis) * width;
      densitySum += compactSourceCovarianceDensity(x, y, centerPx, covariance);
    }
  }
  return (densitySum / (samplesPerAxis * samplesPerAxis)) * width * height;
}

function compactSourceCovarianceDensity(
  x: number,
  y: number,
  centerPx: readonly [number, number],
  covariance: { readonly xx: number; readonly xy: number; readonly yy: number; readonly determinant: number },
): number {
  const dx = x - centerPx[0];
  const dy = y - centerPx[1];
  const invXx = covariance.yy / covariance.determinant;
  const invXy = -covariance.xy / covariance.determinant;
  const invYy = covariance.xx / covariance.determinant;
  const mahalanobis2 = invXx * dx * dx + 2 * invXy * dx * dy + invYy * dy * dy;
  const normalization = 1 / (2 * Math.PI * Math.sqrt(covariance.determinant));
  return normalization * Math.exp(-0.5 * mahalanobis2);
}

function compactClamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildBoundedCompactRetainedSourceForRuntime({
  coverage,
  attributes,
  effectiveOpacities,
  viewMatrix,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  tileRows,
  maxRefsPerTile,
  anchors,
  rendererMetadata,
}: {
  readonly coverage: RuntimeCompactTileCoverage;
  readonly attributes: SplatAttributes;
  readonly effectiveOpacities: Float32Array;
  readonly viewMatrix: Float32Array;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly maxRefsPerTile: number;
  readonly anchors: readonly PixelTraceAnchor[];
  readonly rendererMetadata: Record<string, unknown>;
}): CompactRetainedSourceForRuntime {
  const tileCount = tileColumns * tileRows;
  const { ranks, depths } = compactSourceBackToFrontDepthEvidence(attributes, viewMatrix);
  const splatsByIndex = new Map(coverage.splats.map((splat) => [splat.splatIndex, splat]));
  const anchorTileIndexes = compactSourceAnchorTileIndexes({ anchors, tileSizePx, tileColumns, tileRows });
  const retainedRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const anchorProjectedRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const tileHeaderU32 = new Uint32Array(Math.max(0, tileCount * 8));
  const entries = coverage.tileEntries;
  let cursor = 0;
  let droppedContributorCount = 0;

  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    while (cursor < entries.length && entries[cursor].tileIndex < tileIndex) {
      cursor += 1;
    }
    const start = cursor;
    while (cursor < entries.length && entries[cursor].tileIndex === tileIndex) {
      cursor += 1;
    }
    if (cursor === start) {
      continue;
    }

    const projectedTileRecords: GpuTileContributorArenaProjectedContributor[] = [];
    for (let entryIndex = start; entryIndex < cursor; entryIndex += 1) {
      projectedTileRecords.push(compactCoverageEntryToRuntimeContributor({
        entry: entries[entryIndex],
        projectedIndex: entryIndex,
        splatsByIndex,
        ranks,
        depths,
        attributes,
        effectiveOpacities,
      }));
    }
    projectedTileRecords.sort(compareCompactProjectionRetentionCoverageOrder);
    if (anchorTileIndexes.has(tileIndex)) {
      anchorProjectedRecords.push(...projectedTileRecords);
    }

    const retainedTileRecords = selectCompactProjectionRetentionRecords(projectedTileRecords, maxRefsPerTile)
      .sort(compareCompactProjectionRetentionCompositorOrder);
    const retainedOffset = retainedRecords.length;
    retainedRecords.push(...retainedTileRecords);
    const projectedCount = projectedTileRecords.length;
    const retainedCount = retainedTileRecords.length;
    const droppedCount = Math.max(0, projectedCount - retainedCount);
    droppedContributorCount += droppedCount;

    const headerBase = tileIndex * 8;
    tileHeaderU32[headerBase] = retainedOffset;
    tileHeaderU32[headerBase + 1] = retainedCount;
    tileHeaderU32[headerBase + 2] = projectedCount;
    tileHeaderU32[headerBase + 3] = droppedCount;
    tileHeaderU32[headerBase + 4] = droppedCount > 0 ? 1 : 0;
    tileHeaderU32[headerBase + 5] = retainedCount === 0 ? 0xffffffff : compactMaxRetainedViewRank(retainedTileRecords);
  }

  const projectedContributorCount = entries.length;
  const tileRefCustody = compactTileRefCustody({
    tileCount,
    tileHeaders: tileHeaderU32,
    projectedContributorCount,
    retainedContributorCount: retainedRecords.length,
    droppedContributorCount,
    maxRefsPerTile,
  });

  return {
    projectedRecords: anchorProjectedRecords,
    retainedRecords,
    droppedRecords: [],
    projectedContributorCount,
    retainedContributorCount: retainedRecords.length,
    droppedContributorCount,
    projectedRefBudgetOverflow: coverage.projectedRefBudgetOverflow ?? null,
    tileRefCustody,
    perPixelProjectedContributors: compactPerPixelContributorTraces({
      contributors: anchorProjectedRecords,
      listName: "projectedContributors",
      viewportWidth,
      viewportHeight,
      tileSizePx,
      tileColumns,
      tileRows,
      anchors,
      rendererMetadata,
    }) as unknown as TileLocalPrepassBridge["perPixelProjectedContributors"],
    perPixelRetainedContributors: compactPerPixelContributorTraces({
      contributors: retainedRecords,
      projectedContributors: anchorProjectedRecords,
      listName: "retainedContributors",
      viewportWidth,
      viewportHeight,
      tileSizePx,
      tileColumns,
      tileRows,
      anchors,
      rendererMetadata,
    }) as unknown as TileLocalPrepassBridge["perPixelRetainedContributors"],
  };
}

interface RuntimeCompactTileCoverage {
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly splats: readonly {
    readonly splatIndex: number;
    readonly originalId: number;
    readonly centerPx: readonly [number, number];
    readonly covariancePx: {
      readonly xx: number;
      readonly xy?: number;
      readonly yy: number;
    };
  }[];
  readonly tileEntries: readonly {
    readonly tileIndex: number;
    readonly tileX: number;
    readonly tileY: number;
    readonly splatIndex: number;
    readonly originalId: number;
    readonly coverageWeight: number;
  }[];
  readonly projectedRefBudgetOverflow?: {
    readonly projectedRefs: number;
    readonly maxProjectedRefs: number;
    readonly mode: string;
  } | null;
}

function selectCompactAnchorCandidateSplatIndexes({
  attributes,
  viewProj,
  viewportWidth,
  viewportHeight,
  splatScale,
  minRadiusPx,
  tileSizePx,
  tileColumns,
  tileRows,
  anchorTileIndexes,
  maxCandidatesPerTile,
}: {
  readonly attributes: SplatAttributes;
  readonly viewProj: Float32Array;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly splatScale: number;
  readonly minRadiusPx: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly anchorTileIndexes: ReadonlySet<number>;
  readonly maxCandidatesPerTile: number;
}): Set<number> {
  const candidateBuckets = new Map<number, { splatIndex: number; priority: number }[]>();
  const anchorTiles = [...anchorTileIndexes].filter((tileIndex) => tileIndex >= 0 && tileIndex < tileColumns * tileRows);
  for (let splatIndex = 0; splatIndex < attributes.count; splatIndex += 1) {
    const centerPx = projectCompactSourceSplatCenterPx(attributes, viewProj, splatIndex, viewportWidth, viewportHeight);
    if (!centerPx) {
      continue;
    }
    const marginPx = compactSourceApproximateSupportMarginPx({
      attributes,
      viewProj,
      index: splatIndex,
      viewportWidth,
      viewportHeight,
      splatScale,
      minRadiusPx,
    });
    for (const tileIndex of anchorTiles) {
      const tileX = tileIndex % tileColumns;
      const tileY = Math.floor(tileIndex / tileColumns);
      const minX = tileX * tileSizePx - marginPx;
      const minY = tileY * tileSizePx - marginPx;
      const maxX = (tileX + 1) * tileSizePx + marginPx;
      const maxY = (tileY + 1) * tileSizePx + marginPx;
      if (centerPx[0] < minX || centerPx[0] > maxX || centerPx[1] < minY || centerPx[1] > maxY) {
        continue;
      }
      const tileCenterX = tileX * tileSizePx + tileSizePx * 0.5;
      const tileCenterY = tileY * tileSizePx + tileSizePx * 0.5;
      const dx = centerPx[0] - tileCenterX;
      const dy = centerPx[1] - tileCenterY;
      const opacity = clampCompactSource(attributes.opacities?.[splatIndex] ?? 1, 0, 0.999);
      const priority = dx * dx + dy * dy - opacity * marginPx * marginPx;
      const bucket = compactAnchorCandidateBucket(candidateBuckets, tileIndex);
      compactRetainAnchorCandidate(bucket, { splatIndex, priority }, maxCandidatesPerTile);
    }
  }

  const selected = new Set<number>();
  for (const bucket of candidateBuckets.values()) {
    for (const candidate of bucket) {
      selected.add(candidate.splatIndex);
    }
  }
  return selected;
}

function compactAnchorCandidateBucket(
  buckets: Map<number, { splatIndex: number; priority: number }[]>,
  tileIndex: number,
): { splatIndex: number; priority: number }[] {
  let bucket = buckets.get(tileIndex);
  if (!bucket) {
    bucket = [];
    buckets.set(tileIndex, bucket);
  }
  return bucket;
}

function compactRetainAnchorCandidate(
  bucket: { splatIndex: number; priority: number }[],
  candidate: { splatIndex: number; priority: number },
  limit: number,
): void {
  if (bucket.some((existing) => existing.splatIndex === candidate.splatIndex)) {
    return;
  }
  if (bucket.length < limit) {
    bucket.push(candidate);
    return;
  }
  let worstIndex = 0;
  for (let index = 1; index < bucket.length; index += 1) {
    if (bucket[index].priority > bucket[worstIndex].priority) {
      worstIndex = index;
    }
  }
  if (candidate.priority < bucket[worstIndex].priority) {
    bucket[worstIndex] = candidate;
  }
}

function projectRuntimeSplatsForCompactSource({
  attributes,
  viewProj,
  viewportWidth,
  viewportHeight,
  splatScale,
  minRadiusPx,
  nearFadeEndNdc,
  onlyTileIndexes,
  tileSizePx,
  tileColumns,
  tileRows,
  candidateSplatIndexes,
}: {
  readonly attributes: SplatAttributes;
  readonly viewProj: Float32Array;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly splatScale: number;
  readonly minRadiusPx: number;
  readonly nearFadeEndNdc: number;
  readonly onlyTileIndexes?: ReadonlySet<number> | null;
  readonly tileSizePx?: number;
  readonly tileColumns?: number;
  readonly tileRows?: number;
  readonly candidateSplatIndexes?: ReadonlySet<number> | null;
}): RuntimeCompactTileCoverage["splats"] {
  const splats: RuntimeCompactTileCoverage["splats"][number][] = [];
  const splatIndexes = candidateSplatIndexes ? [...candidateSplatIndexes].sort((left, right) => left - right) : null;
  const splatIndexCount = splatIndexes?.length ?? attributes.count;
  for (let cursor = 0; cursor < splatIndexCount; cursor += 1) {
    const index = splatIndexes?.[cursor] ?? cursor;
    const centerPx = projectCompactSourceSplatCenterPx(attributes, viewProj, index, viewportWidth, viewportHeight);
    if (!centerPx) {
      continue;
    }
    if (
      onlyTileIndexes &&
      tileSizePx !== undefined &&
      tileColumns !== undefined &&
      tileRows !== undefined &&
      !compactSourceProjectedCenterMayReachTiles({
        attributes,
        viewProj,
        index,
        centerPx,
        viewportWidth,
        viewportHeight,
        splatScale,
        minRadiusPx,
        tileSizePx,
        tileColumns,
        tileRows,
        onlyTileIndexes,
      })
    ) {
      continue;
    }
    const covariancePx = projectedCompactSourceCovariancePx({
      attributes,
      viewProj,
      index,
      viewportWidth,
      viewportHeight,
      splatScale,
      minRadiusPx,
      nearFadeEndNdc,
    });
    if (!covariancePx) {
      continue;
    }
    splats.push({
      splatIndex: index,
      originalId: attributes.originalIds[index] ?? index,
      centerPx,
      covariancePx,
    });
  }
  return splats;
}

function compactSourceProjectedCenterMayReachTiles({
  attributes,
  viewProj,
  index,
  centerPx,
  viewportWidth,
  viewportHeight,
  splatScale,
  minRadiusPx,
  tileSizePx,
  tileColumns,
  tileRows,
  onlyTileIndexes,
}: {
  readonly attributes: SplatAttributes;
  readonly viewProj: Float32Array;
  readonly index: number;
  readonly centerPx: readonly [number, number];
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly splatScale: number;
  readonly minRadiusPx: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly onlyTileIndexes: ReadonlySet<number>;
}): boolean {
  const marginPx = compactSourceApproximateSupportMarginPx({
    attributes,
    viewProj,
    index,
    viewportWidth,
    viewportHeight,
    splatScale,
    minRadiusPx,
  });
  for (const tileIndex of onlyTileIndexes) {
    if (tileIndex < 0 || tileIndex >= tileColumns * tileRows) {
      continue;
    }
    const tileX = tileIndex % tileColumns;
    const tileY = Math.floor(tileIndex / tileColumns);
    const minX = tileX * tileSizePx - marginPx;
    const minY = tileY * tileSizePx - marginPx;
    const maxX = (tileX + 1) * tileSizePx + marginPx;
    const maxY = (tileY + 1) * tileSizePx + marginPx;
    if (centerPx[0] >= minX && centerPx[0] <= maxX && centerPx[1] >= minY && centerPx[1] <= maxY) {
      return true;
    }
  }
  return false;
}

function compactSourceApproximateSupportMarginPx({
  attributes,
  viewProj,
  index,
  viewportWidth,
  viewportHeight,
  splatScale,
  minRadiusPx,
}: {
  readonly attributes: SplatAttributes;
  readonly viewProj: Float32Array;
  readonly index: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly splatScale: number;
  readonly minRadiusPx: number;
}): number {
  const positionBase = index * 3;
  const x = attributes.positions[positionBase];
  const y = attributes.positions[positionBase + 1];
  const z = attributes.positions[positionBase + 2];
  const clipW = viewProj[3] * x + viewProj[7] * y + viewProj[11] * z + viewProj[15];
  const scaleX = Math.exp(attributes.scales?.[positionBase] ?? 0);
  const scaleY = Math.exp(attributes.scales?.[positionBase + 1] ?? 0);
  const scaleZ = Math.exp(attributes.scales?.[positionBase + 2] ?? 0);
  const sourceRadius = Math.max(scaleX, scaleY, scaleZ, 0);
  const viewportScale = Math.max(viewportWidth, viewportHeight) / Math.max(Math.abs(clipW), 0.0001);
  const projectedRadius = sourceRadius * (splatScale / 600) * viewportScale;
  const margin = COMPACT_SOURCE_SIGMA_RADIUS * Math.max(minRadiusPx, projectedRadius);
  return compactClamp(
    Math.max(COMPACT_SOURCE_ANCHOR_PREFILTER_MIN_MARGIN_PX, margin),
    COMPACT_SOURCE_ANCHOR_PREFILTER_MIN_MARGIN_PX,
    COMPACT_SOURCE_ANCHOR_PREFILTER_MAX_MARGIN_PX,
  );
}

function projectedCoverageToRuntimeContributors({
  coverage,
  attributes,
  effectiveOpacities,
  viewMatrix,
}: {
  readonly coverage: RuntimeCompactTileCoverage;
  readonly attributes: SplatAttributes;
  readonly effectiveOpacities: Float32Array;
  readonly viewMatrix: Float32Array;
}): readonly GpuTileContributorArenaProjectedContributor[] {
  const { ranks, depths } = compactSourceBackToFrontDepthEvidence(attributes, viewMatrix);
  const splatsByIndex = new Map(coverage.splats.map((splat) => [splat.splatIndex, splat]));

  return coverage.tileEntries.map((entry, projectedIndex) => compactCoverageEntryToRuntimeContributor({
    entry,
    projectedIndex,
    splatsByIndex,
    ranks,
    depths,
    attributes,
    effectiveOpacities,
  }));
}

function compactCoverageEntryToRuntimeContributor({
  entry,
  projectedIndex,
  splatsByIndex,
  ranks,
  depths,
  attributes,
  effectiveOpacities,
}: {
  readonly entry: RuntimeCompactTileCoverage["tileEntries"][number];
  readonly projectedIndex: number;
  readonly splatsByIndex: ReadonlyMap<number, RuntimeCompactTileCoverage["splats"][number]>;
  readonly ranks: readonly number[];
  readonly depths: readonly number[];
  readonly attributes: SplatAttributes;
  readonly effectiveOpacities: Float32Array;
}): GpuTileContributorArenaProjectedContributor {
  const splat = splatsByIndex.get(entry.splatIndex);
  const inverseConic = invertCompactSourceCovariance(splat?.covariancePx);
  const opacity = readCompactSourceOpacity(attributes, effectiveOpacities, entry.splatIndex);
  const coverageWeight = Math.max(0, finiteOrZero(entry.coverageWeight));
  const luminance = readCompactSourceLuminance(attributes, entry.splatIndex);
  return {
    splatIndex: entry.splatIndex,
    originalId: entry.originalId,
    tileIndex: entry.tileIndex,
    tileX: entry.tileX,
    tileY: entry.tileY,
    projectedIndex,
    viewRank: ranks[entry.splatIndex] ?? entry.splatIndex,
    viewDepth: depths[entry.splatIndex] ?? 0,
    depthBand: 0,
    coverageWeight,
    centerPx: splat?.centerPx ?? [0, 0],
    inverseConic,
    opacity,
    coverageAlpha: transferCompactSourceCoverageAlpha(opacity, coverageWeight),
    transmittanceBefore: 1,
    retentionWeight: coverageWeight * opacity * luminance,
    occlusionWeight: coverageWeight * opacity,
    occlusionDensity: opacity,
  };
}

function compactSourceAnchorTileIndexes({
  anchors,
  tileSizePx,
  tileColumns,
  tileRows,
}: {
  readonly anchors: readonly PixelTraceAnchor[];
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly tileRows: number;
}): Set<number> {
  const tileIndexes = new Set<number>();
  for (const anchor of anchors) {
    const canonicalTileIndex = anchor.canonicalTileAddress?.tileIndex;
    if (Number.isInteger(canonicalTileIndex) && canonicalTileIndex >= 0) {
      tileIndexes.add(canonicalTileIndex);
      continue;
    }
    const tileX = Math.max(0, Math.min(tileColumns - 1, Math.floor(anchor.x / tileSizePx)));
    const tileY = Math.max(0, Math.min(tileRows - 1, Math.floor(anchor.y / tileSizePx)));
    tileIndexes.add(tileY * tileColumns + tileX);
  }
  return tileIndexes;
}

function compactSourceAnchorTileNeighborhoodIndexes({
  anchors,
  tileSizePx,
  tileColumns,
  tileRows,
  radiusTiles,
}: {
  readonly anchors: readonly PixelTraceAnchor[];
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly radiusTiles: number;
}): Set<number> {
  const centers = compactSourceAnchorTileIndexes({ anchors, tileSizePx, tileColumns, tileRows });
  const tileIndexes = new Set<number>();
  const radius = Math.max(0, Math.floor(radiusTiles));
  for (const centerTileIndex of centers) {
    const centerTileX = centerTileIndex % tileColumns;
    const centerTileY = Math.floor(centerTileIndex / tileColumns);
    for (let tileY = Math.max(0, centerTileY - radius); tileY <= Math.min(tileRows - 1, centerTileY + radius); tileY += 1) {
      for (let tileX = Math.max(0, centerTileX - radius); tileX <= Math.min(tileColumns - 1, centerTileX + radius); tileX += 1) {
        tileIndexes.add(tileY * tileColumns + tileX);
      }
    }
  }
  return tileIndexes;
}

function selectCompactProjectionRetentionRecords(
  records: readonly GpuTileContributorArenaProjectedContributor[],
  maxRefsPerTile: number,
): GpuTileContributorArenaProjectedContributor[] {
  if (records.length <= maxRefsPerTile) {
    return [...records];
  }
  const selected = records.slice(0, maxRefsPerTile);
  const reserveCount = compactProjectionRetentionReserveCount(records.length, maxRefsPerTile);
  const selectedKeys = new Set(selected.map(compactProjectionRetentionRecordKey));
  const candidates = compactProjectionRetentionCandidates(records, selectedKeys, reserveCount);
  const reservedKeys = new Set(candidates.map(({ record }) => compactProjectionRetentionRecordKey(record)));

  for (const { record: candidate, comparePriority } of candidates) {
    const candidateKey = compactProjectionRetentionRecordKey(candidate);
    if (selectedKeys.has(candidateKey)) {
      continue;
    }
    const replacementIndex = compactProjectionRetentionReplacementIndex(selected, reservedKeys, comparePriority);
    if (comparePriority(candidate, selected[replacementIndex]) > 0) {
      continue;
    }
    const removedKey = compactProjectionRetentionRecordKey(selected[replacementIndex]);
    selected[replacementIndex] = candidate;
    selectedKeys.delete(removedKey);
    selectedKeys.add(candidateKey);
  }

  return selected;
}

function compactProjectionRetentionReserveCount(projectedRefCount: number, maxRefsPerTile: number): number {
  const baseReserveCount = Math.min(maxRefsPerTile, Math.min(4, Math.max(2, Math.floor(maxRefsPerTile / 8))));
  if (projectedRefCount <= maxRefsPerTile) {
    return 0;
  }
  const overflowFraction = (projectedRefCount - maxRefsPerTile) / projectedRefCount;
  const pressureReserveCount = Math.floor(maxRefsPerTile * Math.min(0.5, overflowFraction));
  return Math.min(maxRefsPerTile, Math.max(baseReserveCount, pressureReserveCount));
}

function compactProjectionRetentionCandidates(
  records: readonly GpuTileContributorArenaProjectedContributor[],
  selectedKeys: ReadonlySet<string>,
  reserveCount: number,
): readonly {
  readonly record: GpuTileContributorArenaProjectedContributor;
  readonly comparePriority: typeof compareCompactProjectionRetentionPriority;
}[] {
  const pools = [
    { records: [...records].sort(compareCompactProjectionRetentionPriority), comparePriority: compareCompactProjectionRetentionPriority },
    { records: [...records].sort(compareCompactProjectionOcclusionPriority), comparePriority: compareCompactProjectionOcclusionPriority },
  ];
  const candidates: {
    readonly record: GpuTileContributorArenaProjectedContributor;
    readonly comparePriority: typeof compareCompactProjectionRetentionPriority;
  }[] = [];
  const candidatePriorityKeys = new Set<string>();
  const cursors = new Array(pools.length).fill(0);

  while (candidates.length < reserveCount) {
    let added = false;
    for (let poolIndex = 0; poolIndex < pools.length && candidates.length < reserveCount; poolIndex += 1) {
      const pool = pools[poolIndex].records;
      while (cursors[poolIndex] < pool.length) {
        const record = pool[cursors[poolIndex]];
        cursors[poolIndex] += 1;
        const key = compactProjectionRetentionRecordKey(record);
        const priorityKey = `${poolIndex}:${key}`;
        if (selectedKeys.has(key) || candidatePriorityKeys.has(priorityKey)) {
          continue;
        }
        candidates.push({ record, comparePriority: pools[poolIndex].comparePriority });
        candidatePriorityKeys.add(priorityKey);
        added = true;
        break;
      }
    }
    if (!added) {
      break;
    }
  }

  return candidates;
}

function compactProjectionRetentionReplacementIndex(
  selected: readonly GpuTileContributorArenaProjectedContributor[],
  reservedKeys: ReadonlySet<string>,
  comparePriority: typeof compareCompactProjectionRetentionPriority,
): number {
  let replacementIndex = -1;
  for (let index = 0; index < selected.length; index += 1) {
    if (reservedKeys.has(compactProjectionRetentionRecordKey(selected[index]))) {
      continue;
    }
    if (replacementIndex === -1 || comparePriority(selected[index], selected[replacementIndex]) > 0) {
      replacementIndex = index;
    }
  }
  return replacementIndex === -1 ? selected.length - 1 : replacementIndex;
}

function compareCompactProjectionRetentionCoverageOrder(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number {
  return (
    left.tileIndex - right.tileIndex ||
    right.coverageWeight - left.coverageWeight ||
    left.viewRank - right.viewRank ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

function compareCompactProjectionRetentionCompositorOrder(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number {
  return (
    left.tileIndex - right.tileIndex ||
    left.viewRank - right.viewRank ||
    left.viewDepth - right.viewDepth ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

function compareCompactProjectionRetentionPriority(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number {
  return (
    right.retentionWeight - left.retentionWeight ||
    right.coverageWeight - left.coverageWeight ||
    left.viewRank - right.viewRank ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

function compareCompactProjectionOcclusionPriority(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number {
  const leftDensity = finiteOrZero(left.occlusionDensity);
  const rightDensity = finiteOrZero(right.occlusionDensity);
  return (
    rightDensity - leftDensity ||
    right.occlusionWeight - left.occlusionWeight ||
    right.coverageWeight - left.coverageWeight ||
    left.viewRank - right.viewRank ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

function compactProjectionRetentionRecordKey(contributor: GpuTileContributorArenaProjectedContributor): string {
  return `${contributor.tileIndex}:${contributor.splatIndex}:${contributor.originalId}`;
}

function compactMaxRetainedViewRank(records: readonly GpuTileContributorArenaProjectedContributor[]): number {
  return records.reduce((maximum, record) => Math.max(maximum, record.viewRank), 0);
}

function compactTileRefCustody({
  tileCount,
  tileHeaders,
  projectedContributorCount,
  retainedContributorCount,
  droppedContributorCount,
  maxRefsPerTile,
}: {
  readonly tileCount: number;
  readonly tileHeaders: Uint32Array;
  readonly projectedContributorCount: number;
  readonly retainedContributorCount: number;
  readonly droppedContributorCount: number;
  readonly maxRefsPerTile: number;
}): TileRefCustodySummary {
  let cappedTileCount = 0;
  let saturatedRetainedTileCount = 0;
  let maxProjectedRefsPerTile = 0;
  let maxRetainedRefsPerTile = 0;
  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    const base = tileIndex * 8;
    const retained = tileHeaders[base + 1] ?? 0;
    const projected = tileHeaders[base + 2] ?? 0;
    const dropped = tileHeaders[base + 3] ?? 0;
    if (dropped > 0) {
      cappedTileCount += 1;
    }
    if (retained >= maxRefsPerTile && projected > retained) {
      saturatedRetainedTileCount += 1;
    }
    maxProjectedRefsPerTile = Math.max(maxProjectedRefsPerTile, projected);
    maxRetainedRefsPerTile = Math.max(maxRetainedRefsPerTile, retained);
  }
  return {
    projectedTileEntryCount: projectedContributorCount,
    retainedTileEntryCount: retainedContributorCount,
    evictedTileEntryCount: droppedContributorCount,
    cappedTileCount,
    saturatedRetainedTileCount,
    maxProjectedRefsPerTile,
    maxRetainedRefsPerTile,
    headerRefCount: retainedContributorCount,
    headerAccountingMatches: true,
  };
}

function compactRetainedSourceBudgetDiagnostics(
  plan: GpuTileCoveragePlan,
  compactSource: CompactRetainedSourceForRuntime
): TileLocalPrepassBudgetDiagnostics {
  const bandCounter = emptyTileLocalBudgetBandCounter();
  const projectedRefs = compactSource.projectedContributorCount;
  const retainedRefs = compactSource.retainedContributorCount;
  const droppedRefs = compactSource.droppedContributorCount;
  const overflowReasons = [];
  if (compactSource.projectedRefBudgetOverflow) {
    overflowReasons.push({
      reason: "projected-ref-budget",
      projectedRefs: compactSource.projectedRefBudgetOverflow.projectedRefs,
      maxProjectedRefs: compactSource.projectedRefBudgetOverflow.maxProjectedRefs,
    });
  }
  if (droppedRefs > 0) {
    overflowReasons.push({
      reason: "per-tile-ref-cap",
      projectedRefs,
      retainedRefs,
      droppedRefs,
      cappedTileCount: compactSource.tileRefCustody.cappedTileCount,
      maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
    });
  }
  return {
    version: 1,
    arenaRefs: {
      projected: projectedRefs,
      retained: retainedRefs,
      dropped: droppedRefs,
      cappedTileCount: compactSource.tileRefCustody.cappedTileCount,
      saturatedRetainedTileCount: compactSource.tileRefCustody.saturatedRetainedTileCount,
      maxProjectedRefsPerTile: compactSource.tileRefCustody.maxProjectedRefsPerTile,
      maxRetainedRefsPerTile: compactSource.tileRefCustody.maxRetainedRefsPerTile,
    },
    overflowReasons,
    capPressure: {
      version: 1,
      classification: droppedRefs > 0 ? "over-cap" : "within-cap",
      refs: {
        projected: projectedRefs,
        retained: retainedRefs,
        dropped: droppedRefs,
        maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
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

function compactPerPixelContributorTraces({
  contributors,
  projectedContributors = contributors,
  listName,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  tileRows,
  anchors,
  rendererMetadata,
}: {
  readonly contributors: readonly GpuTileContributorArenaProjectedContributor[];
  readonly projectedContributors?: readonly GpuTileContributorArenaProjectedContributor[];
  readonly listName: "projectedContributors" | "retainedContributors";
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly anchors: readonly PixelTraceAnchor[];
  readonly rendererMetadata: Record<string, unknown>;
}): readonly Record<string, unknown>[] {
  return anchors.map((anchor) => {
    const tileAddress = compactSourceTileAddress(anchor, { tileSizePx, tileColumns, tileRows });
    const tileContributors = contributors
      .filter((contributor) => contributor.tileIndex === tileAddress.tileIndex)
      .filter((contributor) => compactSourceConicPixelWeight(contributor, [anchor.x + 0.5, anchor.y + 0.5]) > 1e-8)
      .map((contributor) => ({
        ...contributor,
        coverageWeight: compactSourceConicPixelWeight(contributor, [anchor.x + 0.5, anchor.y + 0.5]),
        projectionStatus: "projected",
        retentionStatus: listName === "retainedContributors" ? "retained" : "projected",
        retained: listName === "retainedContributors" ? true : undefined,
      }));
    const projectedTileContributors = projectedContributors
      .filter((contributor) => contributor.tileIndex === tileAddress.tileIndex)
      .filter((contributor) => compactSourceConicPixelWeight(contributor, [anchor.x + 0.5, anchor.y + 0.5]) > 1e-8);
    const status = tileContributors.length > 0 ? "present" : "absent";
    const traceRecord = {
      status,
      anchorPixel: anchor,
      tileAddress,
      rendererMetadata,
      projectedContributors: listName === "projectedContributors" ? tileContributors : projectedTileContributors,
      [listName]: tileContributors,
    };
    return {
      status,
      anchorPixel: anchor,
      tileAddress,
      rendererMetadata,
      traceRecord,
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
      },
    };
  });
}

function compactSourceTileAddress(
  anchor: PixelTraceAnchor,
  { tileSizePx, tileColumns, tileRows }: { readonly tileSizePx: number; readonly tileColumns: number; readonly tileRows: number }
) {
  if (anchor.canonicalTileAddress) {
    return {
      tileSizePx,
      ...anchor.canonicalTileAddress,
    };
  }
  const tileX = clampCompactSource(Math.floor(anchor.x / tileSizePx), 0, tileColumns - 1);
  const tileY = clampCompactSource(Math.floor(anchor.y / tileSizePx), 0, tileRows - 1);
  return {
    tileSizePx,
    tileX,
    tileY,
    tileIndex: tileY * tileColumns + tileX,
    localX: anchor.x - tileX * tileSizePx,
    localY: anchor.y - tileY * tileSizePx,
  };
}

function compactSourceConicPixelWeight(
  contributor: GpuTileContributorArenaProjectedContributor,
  pixelCenter: readonly [number, number]
): number {
  const dx = pixelCenter[0] - contributor.centerPx[0];
  const dy = pixelCenter[1] - contributor.centerPx[1];
  const inverseConic = contributor.inverseConic;
  const mahalanobis2 = inverseConic[0] * dx * dx + 2 * inverseConic[1] * dx * dy + inverseConic[2] * dy * dy;
  return Math.exp(-2 * Math.max(mahalanobis2, 0));
}

function projectCompactSourceSplatCenterPx(
  attributes: SplatAttributes,
  viewProj: Float32Array,
  index: number,
  viewportWidth: number,
  viewportHeight: number
): readonly [number, number] | null {
  const base = index * 3;
  const x = attributes.positions[base];
  const y = attributes.positions[base + 1];
  const z = attributes.positions[base + 2];
  const clipX = viewProj[0] * x + viewProj[4] * y + viewProj[8] * z + viewProj[12];
  const clipY = viewProj[1] * x + viewProj[5] * y + viewProj[9] * z + viewProj[13];
  const clipZ = viewProj[2] * x + viewProj[6] * y + viewProj[10] * z + viewProj[14];
  const clipW = viewProj[3] * x + viewProj[7] * y + viewProj[11] * z + viewProj[15];
  if (!Number.isFinite(clipW) || clipW <= 0 || clipZ < 0 || clipZ > clipW) {
    return null;
  }
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  if (ndcX < -1 || ndcX > 1 || ndcY < -1 || ndcY > 1) {
    return null;
  }
  return [(ndcX * 0.5 + 0.5) * viewportWidth, (0.5 - ndcY * 0.5) * viewportHeight];
}

function projectedCompactSourceCovariancePx({
  attributes,
  viewProj,
  index,
  viewportWidth,
  viewportHeight,
  splatScale,
  minRadiusPx,
  nearFadeEndNdc,
}: {
  readonly attributes: SplatAttributes;
  readonly viewProj: Float32Array;
  readonly index: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly splatScale: number;
  readonly minRadiusPx: number;
  readonly nearFadeEndNdc: number;
}): { readonly xx: number; readonly xy: number; readonly yy: number } | null {
  const positionBase = index * 3;
  const center: readonly [number, number, number] = [
    attributes.positions[positionBase],
    attributes.positions[positionBase + 1],
    attributes.positions[positionBase + 2],
  ];
  const centerClip = multiplyCompactSourceMat4Vec4(viewProj, [center[0], center[1], center[2], 1]);
  if (!Number.isFinite(centerClip[3]) || Math.abs(centerClip[3]) <= 0.0001) {
    return null;
  }

  const scale = [
    Math.exp(attributes.scales?.[positionBase] ?? 0),
    Math.exp(attributes.scales?.[positionBase + 1] ?? 0),
    Math.exp(attributes.scales?.[positionBase + 2] ?? 0),
  ];
  const rotationBase = index * 4;
  const rotation = normalizeCompactSourceQuat([
    attributes.rotations?.[rotationBase] ?? 1,
    attributes.rotations?.[rotationBase + 1] ?? 0,
    attributes.rotations?.[rotationBase + 2] ?? 0,
    attributes.rotations?.[rotationBase + 3] ?? 0,
  ]);
  const axes = [
    scaleCompactSourceVector(rotateCompactSourceAxis(rotation, [1, 0, 0]), scale[0]),
    scaleCompactSourceVector(rotateCompactSourceAxis(rotation, [0, 1, 0]), scale[1]),
    scaleCompactSourceVector(rotateCompactSourceAxis(rotation, [0, 0, 1]), scale[2]),
  ];
  if (compactSourceNearPlaneSupportCrossesClip({ viewProj, center, centerClip, axes, nearFadeEndNdc })) {
    return null;
  }

  const axisScale = splatScale / 600;
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const axis of axes) {
    const projected = projectCompactSourceAxisJacobianPx(viewProj, axis, centerClip, viewportWidth, viewportHeight);
    const ax = projected[0] * axisScale;
    const ay = projected[1] * axisScale;
    xx += ax * ax;
    xy += ax * ay;
    yy += ay * ay;
  }
  return floorCompactSourceCovariancePrincipalRadii({ xx, xy, yy }, minRadiusPx);
}

function floorCompactSourceCovariancePrincipalRadii(
  covariance: { readonly xx: number; readonly xy: number; readonly yy: number },
  minRadiusPx: number
): { readonly xx: number; readonly xy: number; readonly yy: number } {
  const minVariance = minRadiusPx * minRadiusPx;
  const determinant = covariance.xx * covariance.yy - covariance.xy * covariance.xy;
  if (covariance.xx <= 0 || covariance.yy <= 0 || determinant <= 0) {
    return { xx: minVariance, xy: 0, yy: minVariance };
  }
  const trace = covariance.xx + covariance.yy;
  const discriminant = Math.sqrt(Math.max((covariance.xx - covariance.yy) ** 2 + 4 * covariance.xy * covariance.xy, 0));
  const majorVariance = 0.5 * (trace + discriminant);
  const minorVariance = 0.5 * (trace - discriminant);
  const flooredMajorVariance = Math.max(majorVariance, minVariance);
  const flooredMinorVariance = Math.max(minorVariance, minVariance);
  if (flooredMajorVariance === majorVariance && flooredMinorVariance === minorVariance) {
    return covariance;
  }
  const theta = 0.5 * Math.atan2(2 * covariance.xy, covariance.xx - covariance.yy);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cos2 = cosTheta * cosTheta;
  const sin2 = sinTheta * sinTheta;
  return {
    xx: flooredMajorVariance * cos2 + flooredMinorVariance * sin2,
    xy: (flooredMajorVariance - flooredMinorVariance) * cosTheta * sinTheta,
    yy: flooredMajorVariance * sin2 + flooredMinorVariance * cos2,
  };
}

function compactSourceNearPlaneSupportCrossesClip({
  viewProj,
  center,
  centerClip,
  axes,
  nearFadeEndNdc,
}: {
  readonly viewProj: Float32Array;
  readonly center: readonly [number, number, number];
  readonly centerClip: readonly number[];
  readonly axes: readonly (readonly [number, number, number])[];
  readonly nearFadeEndNdc: number;
}): boolean {
  if (!Number.isFinite(nearFadeEndNdc) || nearFadeEndNdc <= 0) {
    return false;
  }
  const safeW = Math.max(centerClip[3], 0.0001);
  const centerNdcDepth = centerClip[2] / safeW;
  if (centerNdcDepth > nearFadeEndNdc) {
    return false;
  }
  for (const axis of axes) {
    const positiveClip = multiplyCompactSourceMat4Vec4(viewProj, [center[0] + axis[0], center[1] + axis[1], center[2] + axis[2], 1]);
    const negativeClip = multiplyCompactSourceMat4Vec4(viewProj, [center[0] - axis[0], center[1] - axis[1], center[2] - axis[2], 1]);
    if (!compactSourceClipInside(positiveClip) || !compactSourceClipInside(negativeClip)) {
      return true;
    }
  }
  return false;
}

function compactSourceClipInside(clip: readonly number[]): boolean {
  return Number.isFinite(clip[3]) && clip[3] > 0.0001 && clip[2] >= 0 && clip[2] <= clip[3];
}

function multiplyCompactSourceMat4Vec4(matrix: Float32Array, vector: readonly [number, number, number, number]): readonly [number, number, number, number] {
  return [
    matrix[0] * vector[0] + matrix[4] * vector[1] + matrix[8] * vector[2] + matrix[12] * vector[3],
    matrix[1] * vector[0] + matrix[5] * vector[1] + matrix[9] * vector[2] + matrix[13] * vector[3],
    matrix[2] * vector[0] + matrix[6] * vector[1] + matrix[10] * vector[2] + matrix[14] * vector[3],
    matrix[3] * vector[0] + matrix[7] * vector[1] + matrix[11] * vector[2] + matrix[15] * vector[3],
  ];
}

function projectCompactSourceAxisJacobianPx(
  viewProj: Float32Array,
  axis: readonly [number, number, number],
  centerClip: readonly number[],
  viewportWidth: number,
  viewportHeight: number
): readonly [number, number] {
  const safeW = Math.max(Math.abs(centerClip[3]), 0.0001);
  const clipW2 = safeW * safeW;
  const row0: readonly [number, number, number] = [viewProj[0], viewProj[4], viewProj[8]];
  const row1: readonly [number, number, number] = [viewProj[1], viewProj[5], viewProj[9]];
  const row3: readonly [number, number, number] = [viewProj[3], viewProj[7], viewProj[11]];
  const jacobianX: readonly [number, number, number] = [
    (centerClip[3] * row0[0] - centerClip[0] * row3[0]) / clipW2,
    (centerClip[3] * row0[1] - centerClip[0] * row3[1]) / clipW2,
    (centerClip[3] * row0[2] - centerClip[0] * row3[2]) / clipW2,
  ];
  const jacobianY: readonly [number, number, number] = [
    (centerClip[3] * row1[0] - centerClip[1] * row3[0]) / clipW2,
    (centerClip[3] * row1[1] - centerClip[1] * row3[1]) / clipW2,
    (centerClip[3] * row1[2] - centerClip[1] * row3[2]) / clipW2,
  ];
  return [
    dotCompactSource(jacobianX, axis) * viewportWidth * 0.5,
    dotCompactSource(jacobianY, axis) * viewportHeight * 0.5,
  ];
}

function normalizeCompactSourceQuat(quat: readonly [number, number, number, number]): readonly [number, number, number, number] {
  const length = Math.hypot(quat[0], quat[1], quat[2], quat[3]);
  if (!Number.isFinite(length) || length <= 0.000001) {
    return [1, 0, 0, 0];
  }
  return [quat[0] / length, quat[1] / length, quat[2] / length, quat[3] / length];
}

function rotateCompactSourceAxis(
  quat: readonly [number, number, number, number],
  axis: readonly [number, number, number]
): readonly [number, number, number] {
  const u: readonly [number, number, number] = [quat[1], quat[2], quat[3]];
  const uv = crossCompactSource(u, axis);
  const uuv = crossCompactSource(u, uv);
  return [
    axis[0] + 2 * (quat[0] * uv[0] + uuv[0]),
    axis[1] + 2 * (quat[0] * uv[1] + uuv[1]),
    axis[2] + 2 * (quat[0] * uv[2] + uuv[2]),
  ];
}

function crossCompactSource(
  left: readonly [number, number, number],
  right: readonly [number, number, number]
): readonly [number, number, number] {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function scaleCompactSourceVector(
  vector: readonly [number, number, number],
  scale: number
): readonly [number, number, number] {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function dotCompactSource(
  left: readonly [number, number, number],
  right: readonly [number, number, number]
): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function invertCompactSourceCovariance(
  covariance: RuntimeCompactTileCoverage["splats"][number]["covariancePx"] | undefined
): readonly [number, number, number] {
  const xx = finiteOrZero(covariance?.xx);
  const xy = finiteOrZero(covariance?.xy);
  const yy = finiteOrZero(covariance?.yy);
  const det = xx * yy - xy * xy;
  if (!Number.isFinite(det) || det <= 1e-12) {
    return [1, 0, 1];
  }
  return [yy / det, -xy / det, xx / det];
}

function compactSourceBackToFrontDepthEvidence(attributes: SplatAttributes, viewMatrix: Float32Array) {
  const sortedIds = Array.from({ length: attributes.count }, (_, splatIndex) => ({
    splatIndex,
    depth:
      viewMatrix[2] * attributes.positions[splatIndex * 3] +
      viewMatrix[6] * attributes.positions[splatIndex * 3 + 1] +
      viewMatrix[10] * attributes.positions[splatIndex * 3 + 2] +
      viewMatrix[14],
  })).sort((left, right) => left.depth - right.depth || left.splatIndex - right.splatIndex);
  const ranks = new Uint32Array(Math.max(attributes.count, 1));
  const depths = new Float32Array(Math.max(attributes.count, 1));
  ranks.fill(0xffffffff);
  for (const { splatIndex, depth } of sortedIds) {
    depths[splatIndex] = depth;
  }
  for (let rank = 0; rank < sortedIds.length; rank += 1) {
    ranks[sortedIds[rank].splatIndex] = rank;
  }
  return { ranks, depths };
}

function readCompactSourceOpacity(
  attributes: SplatAttributes,
  effectiveOpacities: Float32Array,
  splatIndex: number
): number {
  const source = effectiveOpacities[splatIndex] ?? attributes.opacities?.[splatIndex] ?? 1;
  return clampCompactSource(source, 0, 0.999);
}

function readCompactSourceLuminance(attributes: SplatAttributes, splatIndex: number): number {
  const base = splatIndex * 3;
  const red = Math.max(0, finiteOrFallback(attributes.colors?.[base], 1));
  const green = Math.max(0, finiteOrFallback(attributes.colors?.[base + 1], 1));
  const blue = Math.max(0, finiteOrFallback(attributes.colors?.[base + 2], 1));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function transferCompactSourceCoverageAlpha(opacity: number, coverageWeight: number): number {
  if (opacity <= 0 || coverageWeight <= 0) {
    return 0;
  }
  return clampCompactSource(1 - Math.pow(1 - opacity, coverageWeight), 0, 1);
}

function finiteOrZero(value: number | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function finiteOrFallback(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function clampCompactSource(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
  return err instanceof Error && /(projected tile refs exceed budget|gpu tile coverage buffers exceed max storage binding|gpu arena projected contributor buffers exceed max storage binding|compact retained source produced no retained contributors)/.test(err.message);
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
    runtimeContributors: state.gpuArenaProjectedContributors,
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
    x: number;
    y: number;
    tileAddress: {
      tileSizePx: number;
      tileX: number;
      tileY: number;
      tileIndex: number;
      localX: number;
      localY: number;
    };
    projectedCount: number;
    retainedCount: number;
    finalStepCount: number;
    retainedIdentities: {
      splatIndex: number;
      originalId: number;
    }[];
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
      const retainedContributors = Array.isArray(traceRecord.retainedContributors)
        ? traceRecord.retainedContributors
        : [];
      const finalColorAccumulation = (traceRecord as {
        finalColorAccumulation?: { steps?: unknown[] };
      }).finalColorAccumulation;
      return {
        id: record.anchorPixel.id,
        x: record.anchorPixel.x,
        y: record.anchorPixel.y,
        tileAddress: record.tileAddress,
        projectedCount: Array.isArray(traceRecord.projectedContributors)
          ? traceRecord.projectedContributors.length
          : 0,
        retainedCount: retainedContributors.length,
        finalStepCount: finalStepCountByAnchorId.get(record.anchorPixel.id) ??
          (Array.isArray(finalColorAccumulation?.steps) ? finalColorAccumulation.steps.length : 0),
        retainedIdentities: retainedContributors.map(contributorIdentity),
      };
    }),
  };
}

function contributorIdentity(contributor: unknown): { splatIndex: number; originalId: number } {
  const record = contributor as { splatIndex?: unknown; originalId?: unknown } | null;
  return {
    splatIndex: Number.isInteger(record?.splatIndex) && Number(record?.splatIndex) >= 0
      ? Number(record?.splatIndex)
      : 0,
    originalId: Number.isInteger(record?.originalId) && Number(record?.originalId) >= 0
      ? Number(record?.originalId)
      : 0,
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
  const guardPolicy = parsed
    ? classifyTileLocalProjectedRefGuard({
        requestedArenaBackend: REQUESTED_ARENA_BACKEND,
        projectedRefs: parsed.skippedProjectedRefs,
        maxProjectedRefs: parsed.maxProjectedRefs,
        viewportWidth,
        viewportHeight,
        tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
        maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
      })
    : null;
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
    guardPolicy,
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
