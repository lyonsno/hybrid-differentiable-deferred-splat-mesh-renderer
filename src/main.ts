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
  panCamera,
  rotateCameraView,
  updateCamera,
} from "./camera.js";
import { handleDoubleClickPivot } from "./clickToPivot.js";
import { createStorageBuffer, createTexture2D, createUniformBuffer } from "./buffers.js";
import {
  buildDeterministicGpuTileProjectionRetentionArena,
  createGpuTileCoveragePlan,
  GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF,
  GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
  GPU_TILE_COVERAGE_TILE_HEADER_BYTES,
  GPU_TILE_COVERAGE_TILE_REF_BYTES,
  writeGpuTileCoverageFrameUniforms,
  writeGpuTileCoverageSourceIndexTable,
  type GpuTileContributorArenaProjectedContributor,
  type GpuTileCoverageDebugMode,
  type GpuTileCoveragePlan,
} from "./gpuTileCoverage.js";
import {
  compareCompactProjectionOcclusionPriority,
  compareCompactProjectionRetentionCompositorOrder,
  compareCompactProjectionRetentionCoverageOrder,
  compareCompactProjectionRetentionPriority,
  compareCompactProjectionSupportSamplePriority,
  compactProjectionRetentionRecordKey,
  selectCompactProjectionRetentionRecords,
} from "./compactRetentionElection.js";
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
  classifyCompactSourceConstructionBudget,
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
const TILE_LOCAL_REBUILD_SETTLE_MS = 260;
const ALPHA_DENSITY_MODE = selectedAlphaDensityMode();
const RENDERER_MODE = selectedRendererMode();
const TILE_LOCAL_DEBUG_MODE = selectedTileLocalDebugMode();
const REQUESTED_ARENA_BACKEND = selectedArenaBackend();
const REAL_SCANIVERSE_WITNESS_VIEW = selectedRealScaniverseWitnessViewMode();
const TILE_LOCAL_BUDGET_CONFIG = resolveTileLocalBudgetConfig(new URLSearchParams(window.location.search));
const TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX = TILE_LOCAL_BUDGET_CONFIG.tileSizePx;
const TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE = TILE_LOCAL_BUDGET_CONFIG.maxRefsPerTile;
const TILE_LOCAL_TRACE_ANCHORS = selectedTileLocalTraceAnchors();
const TILE_LOCAL_PRESENTATION_ANCHORS = selectedTileLocalPresentationAnchors();
const TILE_LOCAL_PRESENTATION_SCOPE = selectedTileLocalPresentationScope();
const TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES = 1;
const TILE_LOCAL_PROVISIONAL_MAX_SPLATS = 150_000;
const TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES = 20_000_000;
const WGSL_PROJECTED_REF_STREAM_MODE = selectedWgslProjectedRefStreamMode();
const WGSL_PROJECTED_REF_STREAM_ENABLED = WGSL_PROJECTED_REF_STREAM_MODE !== "disabled";
const COMPACT_SOURCE_SIGMA_RADIUS = 3;
const COMPACT_SOURCE_ANCHOR_TILE_NEIGHBORHOOD_RADIUS = 2;
const COMPACT_SOURCE_PRESENTATION_TILE_NEIGHBORHOOD_RADIUS = 5;
const COMPACT_SOURCE_FULL_SCENE_MAX_TILES_PER_SPLAT = 9;
const COMPACT_SOURCE_ANCHOR_PREFILTER_MIN_MARGIN_PX = 96;
const COMPACT_SOURCE_ANCHOR_PREFILTER_MAX_MARGIN_PX = 384;
const COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS = 4;
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
  tileLocalLastObservedSignature: string | null;
  tileLocalLastSignatureChangeMs: number;
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
  tileRefData?: Uint32Array;
  tileCoverageWeightBuffer: GPUBuffer;
  tileCoverageWeightData: Float32Array;
  tileBuildCountBuffer: GPUBuffer;
  tileScatterCursorBuffer: GPUBuffer;
  alphaParamBuffer: GPUBuffer;
  alphaParamData: Float32Array;
  sourceViewDepths: Float32Array;
  sourceOpacities: Float32Array;
  tileRefShapeParams: Float32Array;
  outputTexture: GPUTexture;
  outputView: GPUTextureView;
  tileEntryCount: number;
  tileRefCustody: TileRefCustodySummary;
  retentionAudit: TileRetentionAudit;
  budgetDiagnostics: TileLocalPrepassBudgetDiagnostics;
  compactSourceConstruction?: CompactSourceConstructionEvidence;
  retainedSourceConstruction?: RetainedSourceConstructionEvidence;
  wgslProjectedRefStream?: WgslProjectedRefStreamState | null;
  wgslProjectedRefStreamEvidence?: WgslProjectedRefStreamEvidence;
  tileRefSplatIds: Uint32Array;
  prepassSignature: string;
  debugMode: GpuTileCoverageDebugMode;
  diagnostics: TileLocalDiagnosticSummary;
  arenaBackend: "cpu" | "gpu";
  gpuArenaRuntime: GpuTileContributorArenaRuntime | null;
  gpuArenaProjectedContributors: readonly GpuTileContributorArenaProjectedContributor[];
  presentationAnchors?: readonly PixelTraceAnchor[];
  presentationScope: TileLocalPresentationScope;
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
  outputTextureReadback?: TileLocalOutputTextureReadback;
  pendingOutputTextureReadback?: PendingTileLocalOutputTextureReadback;
  compositorInputReadback?: TileLocalCompositorInputReadback;
  pendingCompositorInputReadback?: PendingTileLocalCompositorInputReadback;
  refStatsReadback?: TileLocalRefStatsReadback;
  pendingRefStatsReadback?: PendingTileLocalRefStatsReadback;
  disposed: boolean;
}

interface ArenaRuntimeEvidence {
  requestedArenaBackend: "cpu" | "gpu";
  effectiveArenaBackend: "cpu" | "gpu";
  retainedSourceConstruction?: RetainedSourceConstructionEvidence;
  wgslProjectedRefStream?: WgslProjectedRefStreamEvidence;
  cpuBuildDurationMs?: number;
  cpuBridgeBuildDurationMs?: number;
  gpuDispatchEnqueueDurationMs?: number;
  unavailableReason?: string;
  skippedReason?: string;
  fallbackReason?: string;
}

type RendererMode = "plate" | "tile-local" | "tile-local-visible";
type WgslProjectedRefStreamMode = "disabled" | "sidecar" | "source-frontier";

interface RuntimeFootprintParams {
  readonly splatScale: number;
  readonly minRadiusPx: number;
  readonly nearFadeEndNdc: number;
}

interface WgslProjectedRefStreamState {
  readonly requestedBackend: "wgsl-projected-ref-stream";
  readonly effectiveBackend: "wgsl-projected-ref-stream-sidecar" | "wgsl-projected-ref-stream-source-frontier";
  readonly sourceRole: "diagnostic-sidecar-not-retention-source" | "visible-source-frontier-not-retention-election";
  readonly plan: GpuTileCoveragePlan;
  readonly bindGroup: GPUBindGroup;
  readonly frameUniformBuffer: GPUBuffer;
  readonly frameUniformData: Float32Array;
  readonly tileHeaderBuffer: GPUBuffer;
  readonly tileRefBuffer: GPUBuffer;
  readonly tileCoverageWeightBuffer: GPUBuffer;
  readonly tileScatterCursorBuffer: GPUBuffer;
  readonly alphaParamBuffer: GPUBuffer;
  readonly compactSourceProjectedRefs: number;
  readonly compactSourceRetainedRefs: number;
  readonly sourceSplatCount: number;
  dispatchEnqueueDurationMs?: number;
  readback?: WgslProjectedRefStreamReadback;
  pendingReadback?: PendingWgslProjectedRefStreamReadback;
}

interface WgslProjectedRefStreamEvidence {
  readonly requestedBackend: "wgsl-projected-ref-stream";
  readonly effectiveBackend: "wgsl-projected-ref-stream-sidecar" | "wgsl-projected-ref-stream-source-frontier" | "disabled" | "unavailable";
  readonly sourceRole: "diagnostic-sidecar-not-retention-source" | "visible-source-frontier-not-retention-election";
  readonly runtimeConsumerBackend: "none" | "tile-local-visible-gaussian-compositor";
  readonly falseClosureGuard: string;
  readonly compactSourceProjectedRefs: number;
  readonly compactSourceRetainedRefs: number;
  readonly sourceSplatCount: number;
  readonly maxTilesPerSplat: number | null;
  readonly allocatedProjectedRefs: number;
  readonly tileCount: number;
  readonly maxRefsPerTile: number;
  readonly dispatchEnqueueDurationMs?: number;
  readonly readback?: WgslProjectedRefStreamReadback;
  readonly unavailableReason?: string;
}

type WgslProjectedRefStreamComparisonClass =
  | "matches-compact-projected-refs"
  | "compact-candidate-footprint-divergence"
  | "raw-gpu-projection-superset"
  | "underpopulated-vs-compact-projected-refs";

interface WgslProjectedRefStreamReadback {
  readonly status: "pending" | "present" | "blocked";
  readonly source: "wgsl-projected-ref-stream-readback";
  readonly frameId: number;
  readonly tileCount: number;
  readonly tileCapacity: number;
  readonly allocatedProjectedRefs: number;
  readonly compactSourceProjectedRefs: number;
  readonly compactSourceRetainedRefs: number;
  readonly sourceSplatCount: number;
  readonly maxTilesPerSplat: number | null;
  readonly projectedScatterRefs: number;
  readonly retainedRefs: number;
  readonly droppedRefs: number;
  readonly projectedRefDelta: number;
  readonly nonEmptyTiles: number;
  readonly saturatedTiles: number;
  readonly maxRefsPerTile: number;
  readonly headerRetainedRefs: number;
  readonly headerProjectedRefs: number;
  readonly headerCountClass: "headers-clear-only" | "headers-populated" | "headers-empty";
  readonly comparisonClass: WgslProjectedRefStreamComparisonClass;
  readonly blockedReason?: string;
}

interface PendingWgslProjectedRefStreamReadback {
  readonly frameId: number;
  readonly stream: WgslProjectedRefStreamState;
  readonly tileHeaderBuffer: GPUBuffer;
  readonly tileScatterCursorBuffer: GPUBuffer;
  mapStarted: boolean;
  cancelled: boolean;
}

type TileLocalPresentationScope = "full-scene" | "anchor-neighborhood";

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

interface TileLocalOutputTextureReadback {
  readonly status: "pending" | "present" | "blocked";
  readonly format: "rgba16float";
  readonly frameId: number;
  readonly width: number;
  readonly height: number;
  readonly anchors: readonly {
    readonly id: string;
    readonly pixel: { readonly x: number; readonly y: number };
    readonly outputTextureRgba: readonly [number, number, number, number];
    readonly outputTextureRgba8: readonly [number, number, number, number];
  }[];
  readonly blockedReason?: string;
}

interface PendingTileLocalOutputTextureReadback {
  readonly frameId: number;
  readonly width: number;
  readonly height: number;
  readonly bytesPerRow: number;
  readonly buffer: GPUBuffer;
  readonly anchors: readonly PixelTraceAnchor[];
}

interface TileLocalCompositorInputReadback {
  readonly status: "pending" | "present" | "blocked";
  readonly source?: "gpu-buffer-readback" | "cpu-reference-diagnostic-state";
  readonly frameId: number;
  readonly anchors: readonly {
    readonly id: string;
    readonly pixel: { readonly x: number; readonly y: number };
    readonly tileAddress: {
      readonly tileX: number;
      readonly tileY: number;
      readonly tileIndex: number;
      readonly localX: number;
      readonly localY: number;
    };
    readonly header: {
      readonly firstRefIndex: number;
      readonly refCount: number;
      readonly projectedCount: number;
      readonly droppedCount: number;
    };
    readonly gpuScatterCount: number;
    readonly tileCapacity: number;
    readonly refLimit: number;
    readonly liveCompositorRgba: readonly [number, number, number, number];
    readonly liveCompositorRgba8: readonly [number, number, number, number];
    readonly remainingTransmission: number;
    readonly contributors: readonly {
      readonly layer: number;
      readonly refIndex: number;
      readonly splatIndex: number;
      readonly originalId: number;
      readonly tileIndex: number;
      readonly viewRank: number;
      readonly viewDepth: number;
      readonly alphaParamIndex: number;
      readonly centerPx: readonly [number, number];
      readonly inverseConic: readonly [number, number, number];
      readonly coverageWeight: number;
      readonly tileCoverageWeight: number;
      readonly pixelCoverageWeight: number;
      readonly sourceOpacity: number;
      readonly coverageAlpha: number;
      readonly transmittanceBefore: number;
      readonly transmittanceAfter: number;
      readonly sourceColor: readonly [number, number, number];
      readonly runningColor: readonly [number, number, number];
      readonly remainingTransmission: number;
      readonly status: "accumulated" | "skipped-invalid-splat" | "skipped-zero-tile-coverage";
    }[];
  }[];
  readonly blockedReason?: string;
}

interface PendingTileLocalCompositorInputReadback {
  readonly frameId: number;
  readonly plan: GpuTileCoveragePlan;
  readonly sourceColors: Float32Array;
  readonly sourceViewDepths: Float32Array;
  readonly anchors: readonly PixelTraceAnchor[];
  readonly tileHeaderBuffer: GPUBuffer;
  readonly tileRefBuffer: GPUBuffer;
  readonly tileCoverageWeightBuffer: GPUBuffer;
  readonly alphaParamBuffer: GPUBuffer;
  readonly tileScatterCursorBuffer: GPUBuffer;
  cancelled: boolean;
}

interface TileLocalRefStatsReadback {
  readonly status: "pending" | "present" | "blocked";
  readonly source: "gpu-scatter-cursor-readback";
  readonly frameId: number;
  readonly tileCount: number;
  readonly tileCapacity: number;
  readonly allocatedRefs: number;
  readonly projectedScatterRefs: number;
  readonly retainedRefs: number;
  readonly droppedRefs: number;
  readonly nonEmptyTiles: number;
  readonly saturatedTiles: number;
  readonly maxRefsPerTile: number;
  readonly blockedReason?: string;
}

interface PendingTileLocalRefStatsReadback {
  readonly frameId: number;
  readonly tileCount: number;
  readonly tileCapacity: number;
  readonly allocatedRefs: number;
  readonly buffer: GPUBuffer;
  mapStarted: boolean;
  cancelled: boolean;
}

interface CompactRetainedSourceForRuntime {
  readonly projectedRecords: readonly GpuTileContributorArenaProjectedContributor[];
  readonly retainedRecords: readonly GpuTileContributorArenaProjectedContributor[];
  readonly droppedRecords: readonly GpuTileContributorArenaProjectedContributor[];
  readonly candidateSplatIndexes: Uint32Array;
  readonly projectedContributorCount: number;
  readonly retainedContributorCount: number;
  readonly droppedContributorCount: number;
  readonly projectedRefBudgetOverflow: {
    readonly projectedRefs: number;
    readonly maxProjectedRefs: number;
    readonly mode: string;
  } | null;
  readonly compactSourceConstruction?: CompactSourceConstructionEvidence;
  readonly tileRefCustody: TileRefCustodySummary;
  readonly perPixelProjectedContributors: TileLocalPrepassBridge["perPixelProjectedContributors"];
  readonly perPixelRetainedContributors: TileLocalPrepassBridge["perPixelRetainedContributors"];
}

interface WgslProjectedSourceFrontierSource {
  readonly splats: RuntimeCompactTileCoverage["splats"];
  readonly candidateSplatIndexes: Uint32Array;
  readonly projectedRefEstimate: number;
  readonly maxTilesPerSplat: number | null;
  readonly tileCount: number;
}

interface WgslProjectedSourceFrontierTileLocalSceneStateInput {
  readonly device: GPUDevice;
  readonly attributes: SplatAttributes;
  readonly buffers: SplatGpuBuffers;
  readonly effectiveOpacities: Float32Array;
  readonly viewMatrix: Float32Array;
  readonly viewProj: Float32Array;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly footprintParams: RuntimeFootprintParams;
  readonly prepassSignature: string;
  readonly frameTiming?: FrameTimingDraft;
}

interface CompactSourceConstructionEvidence {
  readonly classification: string;
  readonly prestreamClassification: string;
  readonly guardedQuantity: string;
  readonly presentationScope: TileLocalPresentationScope;
  readonly forceAnchorOnly: boolean;
  readonly allowAnchorOnlyBudgetFallback: boolean;
  readonly shouldRestrictToAnchorTiles: boolean;
  readonly shouldBoundSplatTileFootprints: boolean;
  readonly projectedOverflow: boolean | null;
  readonly retainedBudgetWithinProjectedLimit: boolean | null;
  readonly tileCount: number;
  readonly sourceTileCount: number;
  readonly traceTileCount: number;
  readonly candidateSplatCount: number;
  readonly projectedSplatCount: number;
  readonly fullSceneConstructionRefUpperBound: number;
  readonly projectedRefEstimate: number;
  readonly streamedProjectedRefs: number;
  readonly projectedRefs: number;
  readonly retainedRefs: number;
  readonly droppedRefs: number;
  readonly maxProjectedRefs: number;
  readonly retainedBudgetRefs: number;
  readonly maxRefsPerTile: number;
  readonly maxTilesPerSplat: number | null;
  readonly effectiveMaxTilesPerSplat: number | null;
  readonly footprintComparisonClass: string;
}

interface RetainedSourceConstructionEvidence {
  readonly requestedSourceBackend: "gpu-retained-source-substrate";
  readonly effectiveSourceBackend: "deterministic-gpu-retention-carrier" | "wgsl-projected-ref-stream-source-frontier";
  readonly oracleBackend: "cpu-reference";
  readonly runtimeConsumerBackend: "gpu-contributor-arena-runtime" | "tile-local-visible-gaussian-compositor";
  readonly sourceHandoff: "cpu-projected-candidate-records" | "wgsl-projected-ref-stream-gpu-buffers";
  readonly falseClosureGuard: string;
  readonly cpuOwnedStages: readonly string[];
  readonly gpuReadyStages: readonly string[];
  readonly nextGpuOffloadStage: "wgsl-projected-ref-stream" | "gpu-retention-election";
  readonly frontierBlockedStages?: readonly string[];
  readonly projectedRefs: number;
  readonly retainedRefs: number;
  readonly droppedRefs: number;
  readonly retainedBudgetRefs?: number;
  readonly maxRefsPerTile?: number;
}

interface SortSettleState {
  lastSortedViewDepthKey: Float32Array;
  observedViewDepthKey: Float32Array;
  lastViewDepthChangeMs: number;
  needsSort: boolean;
}

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

interface AlphaDensityState {
  refreshState: AlphaDensityRefreshState;
  summary: AlphaDensityCompensationSummary;
}

function startFrameTiming(startedAtMs = performance.now()): FrameTimingDraft {
  return { startedAtMs, stages: [] };
}

function timeFrameStage<T>(timing: FrameTimingDraft, name: string, fn: () => T): T {
  const startedAtMs = performance.now();
  try {
    return fn();
  } finally {
    timing.stages.push({
      name,
      elapsedMs: roundRuntimeMetric(performance.now() - startedAtMs),
    });
  }
}

function timeOptionalFrameStage<T>(timing: FrameTimingDraft | undefined, name: string, fn: () => T): T {
  return timing ? timeFrameStage(timing, name, fn) : fn();
}

function finishFrameTiming(timing: FrameTimingDraft): FrameTimingSummary {
  return {
    totalMs: roundRuntimeMetric(performance.now() - timing.startedAtMs),
    stages: timing.stages,
  };
}

function exposeOperatorWitnessFrameTimings(frameTimings: FrameTimingSummary): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: {
      operatorWitness?: Record<string, unknown>;
    };
  };
  const operatorWitness = runtimeWindow.__MESH_SPLAT_SMOKE__?.operatorWitness;
  if (!operatorWitness) {
    return;
  }
  operatorWitness.frameTimings = frameTimings;
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
  let operatorWitnessViewMode: RealScaniverseWitnessViewMode = REAL_SCANIVERSE_WITNESS_VIEW;
  let operatorWitnessRevision = 0;

  statsEl.textContent = "Loading real Scaniverse splats...";
  const assetPath = selectedSplatAssetPath();
  let activeScene: ActiveSplatScene | null = null;

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
    if (shapeWitnessFixtureId !== null) {
      return { applied: false, reason: "operator witness view switching is only available for real Scaniverse smoke" };
    }
    if (!activeScene) {
      return { applied: false, reason: "scene is not loaded" };
    }
    const nextMode = normalizeOperatorWitnessViewMode(mode);
    configureCameraForSplatBounds(cam, activeScene.attributes.bounds);
    applyRealScaniverseWitnessView(cam, activeScene.attributes.bounds, nextMode);
    updateCamera(cam, 0);
    activeScene.sortState.needsSort = true;
    if (activeScene.tileLocalState) {
      activeScene.tileLocalState.needsDispatch = true;
    }
    operatorWitnessViewMode = nextMode;
    operatorWitnessRevision++;
    requestFrame();
    return {
      applied: true,
      witnessView: operatorWitnessViewMode,
      revision: operatorWitnessRevision,
    };
  };
  runtimeWindow.__MESH_SPLAT_APPLY_WITNESS_INTERACTION__ = (interaction) => {
    if (shapeWitnessFixtureId !== null) {
      return { applied: false, reason: "operator witness interactions are only available for real Scaniverse smoke" };
    }
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
    if (activeScene.tileLocalState) {
      activeScene.tileLocalState.needsDispatch = true;
    }
    operatorWitnessRevision++;
    requestFrame();
    return {
      applied: true,
      witnessView: operatorWitnessViewMode,
      revision: operatorWitnessRevision,
    };
  };

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
      tileLocalLastObservedSignature: tileLocalState?.lastCompositedSignature ?? null,
      tileLocalLastSignatureChangeMs: Number.NEGATIVE_INFINITY,
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
    const frameTiming = startFrameTiming(now);
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
      timeFrameStage(frameTiming, "alpha-density", () => {
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
      });
    }
    const activeNearFadeStart = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_NEAR_FADE_START : REAL_SCANIVERSE_NEAR_FADE_START_NDC;
    const activeNearFadeEnd = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_NEAR_FADE_END : REAL_SCANIVERSE_NEAR_FADE_END_NDC;
    timeFrameStage(frameTiming, "frame-uniforms", () => writeSplatPlateFrameUniforms(
      uniformData,
      viewProj,
      width,
      height,
      activeSplatScale,
      activeMinRadiusPx,
      activeNearFadeStart,
      activeNearFadeEnd
    ));
    timeFrameStage(frameTiming, "uniform-upload", () => {
      gpu.device.queue.writeBuffer(uniformBuffer, 0, uniformData);
    });

    const encoder = gpu.device.createCommandEncoder();
    const gpuSortRefreshed = shouldRefreshGpuSort(scene.sortState, view, now);
    if (gpuSortRefreshed) {
      timeFrameStage(frameTiming, "gpu-sort-refresh", () => {
        writeViewDepthSortInput(gpu.device.queue, scene.gpuSort, scene.attributes.positions, view);
        encodeGpuSortPrototype(encoder, scene.gpuSort);
        if (scene.tileLocalState) {
          scene.tileLocalState.needsDispatch = true;
        }
      });
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
    if (tileLocalCurrentSignature && tileLocalCurrentSignature !== scene.tileLocalLastObservedSignature) {
      scene.tileLocalLastObservedSignature = tileLocalCurrentSignature;
      scene.tileLocalLastSignatureChangeMs = now;
    }
    const tileLocalPresentationStaleForCurrentView = Boolean(
      scene.tileLocalState &&
      tileLocalCurrentSignature &&
      tileLocalCurrentSignature !== scene.tileLocalState.lastCompositedSignature
    );
    if (
      scene.tileLocalState &&
      tileLocalPresentationStaleForCurrentView
    ) {
      scene.tileLocalState.needsDispatch = true;
    }
    const deferTileLocalRebuildForActiveInput = Boolean(
      scene.tileLocalState?.arenaBackend === "gpu" &&
      (activeInput || now - scene.tileLocalLastSignatureChangeMs < TILE_LOCAL_REBUILD_SETTLE_MS) &&
      tileLocalPresentationStaleForCurrentView
    );

    if (scene.tileLocalState && shouldDispatchTileLocalCompositor({
      needsDispatch: scene.tileLocalState.needsDispatch,
      activeInput,
      allowActiveInputDispatch: scene.tileLocalState.arenaBackend === "gpu" && !deferTileLocalRebuildForActiveInput,
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
          },
          frameTiming
        );
        scene.tileLocalState = tileLocalState;
        scene.tileLocalLastSkipReason = null;
        scene.tileLocalLastSkipSignature = null;
        scene.tileLocalLastObservedSignature = tileLocalCurrentSignature ?? tileLocalState.lastCompositedSignature;
        scene.tileLocalLastSignatureChangeMs = Number.NEGATIVE_INFINITY;
        timeFrameStage(frameTiming, "tile-local-dispatch-encode", () => {
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
          if (tileLocalState.wgslProjectedRefStream) {
            const streamDispatchStartedAtMs = performance.now();
            writeGpuTileCoverageFrameUniforms(
              tileLocalState.wgslProjectedRefStream.frameUniformData,
              viewProj,
              tileLocalState.wgslProjectedRefStream.plan,
              tileLocalState.debugMode,
              {
                splatScale: activeSplatScale,
                minRadiusPx: activeMinRadiusPx,
              }
            );
            gpu.device.queue.writeBuffer(
              tileLocalState.wgslProjectedRefStream.frameUniformBuffer,
              0,
              tileLocalState.wgslProjectedRefStream.frameUniformData
            );
            tileLocalState.pipeline.dispatchProjectedRefStream(
              tileLocalComputePass,
              tileLocalState.wgslProjectedRefStream.bindGroup,
              tileLocalState.wgslProjectedRefStream.plan
            );
            tileLocalState.wgslProjectedRefStream.dispatchEnqueueDurationMs = roundRuntimeMetric(
              performance.now() - streamDispatchStartedAtMs
            );
            refreshWgslProjectedRefStreamEvidence(tileLocalState);
          }
          if (tileLocalState.gpuArenaRuntime) {
            tileLocalState.gpuArenaRuntime.dispatch(tileLocalComputePass, tileLocalState.plan);
          }
          const compositePrebuiltCpuTileRefs = scene.rendererMode === "tile-local-visible" &&
            tileLocalState.arenaBackend === "cpu";
          if (tileLocalState.gpuArenaRuntime) {
            tileLocalState.pipeline.dispatchComposite(tileLocalComputePass, tileLocalState.bindGroup, tileLocalState.plan);
          } else if (compositePrebuiltCpuTileRefs) {
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
          enqueueTileLocalOutputTextureReadback(gpu.device, encoder, tileLocalState, frameSerial);
          enqueueTileLocalCompositorInputReadback(gpu.device, encoder, tileLocalState, frameSerial, scene.attributes.colors);
          enqueueTileLocalRefStatsReadback(gpu.device, encoder, tileLocalState, frameSerial);
          enqueueWgslProjectedRefStreamReadback(gpu.device, encoder, tileLocalState, frameSerial);
        });
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
        scene.tileLocalLastObservedSignature = tileLocalCurrentSignature ?? scene.tileLocalLastObservedSignature;
        scene.tileLocalLastSignatureChangeMs = Number.NEGATIVE_INFINITY;
        scene.tileLocalState.needsDispatch = false;
      }
    }
    if (scene.tileLocalState) {
      enqueueTileLocalRefStatsReadback(
        gpu.device,
        encoder,
        scene.tileLocalState,
        scene.tileLocalState.lastCompositedFrame
      );
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

    const useTileLocalInteractionPreview = scene.rendererMode === "tile-local-visible" &&
      Boolean(scene.tileLocalState) &&
      activeInput &&
      tileLocalPresentationStaleForCurrentView;
    if (scene.rendererMode === "tile-local-visible" && scene.tileLocalState && !useTileLocalInteractionPreview) {
      tileLocalPresenter.draw(renderPass, scene.tileLocalState.outputView);
    } else {
      renderPass.setBindGroup(0, bindGroup);
      splatRenderer.draw(renderPass, scene.splatBindGroup, scene.count);
    }
    renderPass.end();

    if (writeTimestamps) {
      resolveTimestamps(encoder, ts);
    }

    timeFrameStage(frameTiming, "queue-submit", () => {
      gpu.device.queue.submit([encoder.finish()]);
    });
    if (scene.tileLocalState) {
      timeFrameStage(frameTiming, "tile-local-readback-resolve", () => {
        resolveTileLocalOutputTextureReadback(scene.tileLocalState!);
        resolveTileLocalCompositorInputReadback(scene.tileLocalState!);
        resolveTileLocalRefStatsReadback(scene.tileLocalState!);
        resolveWgslProjectedRefStreamReadback(scene.tileLocalState!);
      });
    }

    // Read GPU timings (async, one frame behind)
    if (writeTimestamps) {
      readTimestamps(ts).then((t) => {
        gpuTimings = t;
      });
    }

    // Stats overlay
    const alphaSummary = scene.alphaDensityState.summary;
    const baseRendererLabel = useTileLocalInteractionPreview
      ? "tile-local-visible-interaction-preview-plate"
      : labelRendererMode(
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
      const refAccounting = tileLocalRefAccounting(scene.tileLocalState, scene.tileLocalState.diagnostics);
      statsText += ` | tile-local: ${scene.tileLocalState.plan.tileColumns}x${scene.tileLocalState.plan.tileRows} tiles/${refAccounting.retainedRefs} refs`;
      if (refAccounting.source === "gpu-scatter-cursor-readback") {
        statsText += ` | tile-local live refs: ${refAccounting.source}`;
      }
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
        now,
        tileLocalCurrentSignature
      );
      if (freshness.status === "stale-cache" || freshness.status === "pending-dispatch") {
        statsText += ` | tile-local ${freshness.status}: ${Math.round(freshness.cachedFrameAgeMs ?? 0)}ms old`;
        statsText += ` | tile-local current-grid: ${tileColumnsForViewport(width)}x${tileRowsForViewport(height)} tiles`;
      }
      if (scene.tileLocalState.debugMode !== "final-color") {
        statsText += ` | tile-debug: ${scene.tileLocalState.debugMode}`;
      }
      if (scene.tileLocalState.retainedSourceConstruction) {
        const sourceConstruction = scene.tileLocalState.retainedSourceConstruction;
        statsText += ` | retained-source: ${sourceConstruction.effectiveSourceBackend}->${sourceConstruction.runtimeConsumerBackend}`;
      }
      if (scene.tileLocalState.wgslProjectedRefStreamEvidence) {
        const projectedStream = scene.tileLocalState.wgslProjectedRefStreamEvidence;
        statsText += ` | projected-stream: ${projectedStream.effectiveBackend}`;
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
    timeFrameStage(frameTiming, "evidence-exposure", () => exposeTileLocalRuntimeEvidence(
        rendererLabel,
        displayFps,
        scene.tileLocalState,
        scene.tileLocalDisabledReason,
        scene.tileLocalLastSkipReason,
        scene.tileLocalLastSkipSignature,
        now,
        width,
        height,
        scene.attributes.colors,
        tileLocalCurrentSignature,
        {
          witnessView: operatorWitnessViewMode,
          revision: operatorWitnessRevision,
          frameSerial,
        }
      )
    );
    exposeOperatorWitnessFrameTimings(finishFrameTiming(frameTiming));

    if (shouldContinueRendering({
      activeInput,
      pendingGpuSort,
      pendingAlphaDensity,
      pendingTileLocalCompositor: deferTileLocalRebuildForActiveInput || shouldDispatchTileLocalCompositor({
        needsDispatch: scene.tileLocalState?.needsDispatch === true,
        activeInput,
        allowActiveInputDispatch: scene.tileLocalState?.arenaBackend === "gpu" && !deferTileLocalRebuildForActiveInput,
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
  footprintParams: RuntimeFootprintParams,
  frameTiming?: FrameTimingDraft
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
      footprintParams,
      frameTiming
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
  footprintParams: RuntimeFootprintParams,
  frameTiming?: FrameTimingDraft
): TileLocalSceneState {
  const tileColumns = tileColumnsForViewport(viewportWidth);
  const tileRows = tileRowsForViewport(viewportHeight);
  const tileCount = tileColumns * tileRows;
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
  if (WGSL_PROJECTED_REF_STREAM_MODE === "source-frontier") {
    return createWgslProjectedSourceFrontierTileLocalSceneState({
      device,
      attributes,
      buffers,
      effectiveOpacities,
      viewMatrix,
      viewProj,
      viewportWidth,
      viewportHeight,
      footprintParams,
      prepassSignature,
      frameTiming,
    });
  }
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
    traceAnchors: TILE_LOCAL_TRACE_ANCHORS ?? [],
    presentationAnchors: TILE_LOCAL_PRESENTATION_ANCHORS ?? [],
    presentationScope: TILE_LOCAL_PRESENTATION_SCOPE,
    frameTiming,
  });
  const gpuArenaProjectedContributors = compactSource.retainedRecords;
  const plan = createGpuTileCoveragePlan({
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    splatCount: attributes.count,
    maxTileRefs: Math.max(gpuArenaProjectedContributors.length, attributes.count, 1),
  });
  const bufferBlocker = gpuTileCoverageBufferUnavailableReason(device, plan);
  if (bufferBlocker) {
    throw new Error(bufferBlocker);
  }
  const gpuArenaRuntimeBlocker = gpuArenaProjectedContributors.length > 0
    ? gpuArenaRuntimeUnavailableReason(device, plan, gpuArenaProjectedContributors.length)
    : "compact retained source produced no retained contributors for gpu arena runtime";
  if (gpuArenaRuntimeBlocker) {
    throw new Error(gpuArenaRuntimeBlocker);
  }
  const gpuArenaRuntime = createGpuTileContributorArenaRuntime(device, plan, gpuArenaProjectedContributors);
  const legacyProjection = gpuArenaRuntime.legacyProjection;
  const sourceDepthEvidence = compactSourceBackToFrontDepthEvidence(attributes, viewMatrix);
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
  const wgslProjectedRefStreamResult = createWgslProjectedRefStreamState({
    device,
    pipeline,
    buffers,
    outputView,
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    splatCount: attributes.count,
    compactSource,
  });
  const wgslProjectedRefStream = wgslProjectedRefStreamResult.state;
  const alphaParamData = new Float32Array(Math.max(plan.alphaParamBytes / Float32Array.BYTES_PER_ELEMENT, 8));
  alphaParamData.set(legacyProjection.alphaParamData.slice(0, alphaParamData.length));
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
  const retentionAudit = estimatedGpuLiveRetentionAudit(compactSource.tileRefCustody, plan.tileCount);
  const budgetDiagnostics = compactRetainedSourceBudgetDiagnostics(plan, compactSource);
  const diagnostics = summarizeTileLocalDiagnostics({
    debugMode: TILE_LOCAL_DEBUG_MODE,
    plan,
    tileEntryCount: gpuArenaProjectedContributors.length,
    tileHeaders: legacyProjection.tileHeaders,
    tileRefCustody: compactSource.tileRefCustody,
    retentionAudit,
    tileCoverageWeights: legacyProjection.tileCoverageWeights,
    alphaParamData,
    sourceOpacities: effectiveOpacities,
  });
  const retainedSourceConstruction = buildGpuArenaRetainedSourceConstructionEvidence(compactSource);
  const wgslProjectedRefStreamEvidence = buildWgslProjectedRefStreamEvidence(
    compactSource,
    wgslProjectedRefStream,
    wgslProjectedRefStreamResult.unavailableReason
  );

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
    tileRefData: legacyProjection.tileRefs,
    tileCoverageWeightBuffer: gpuArenaRuntime.buffers.legacyTileCoverageWeightBuffer,
    tileCoverageWeightData: legacyProjection.tileCoverageWeights,
    tileBuildCountBuffer,
    tileScatterCursorBuffer,
    alphaParamBuffer: gpuArenaRuntime.buffers.legacyAlphaParamBuffer,
    alphaParamData,
    sourceViewDepths: sourceDepthEvidence.depths,
    sourceOpacities: effectiveOpacities,
    tileRefShapeParams: legacyProjection.tileRefShapeParams,
    outputTexture,
    outputView,
    tileEntryCount: gpuArenaProjectedContributors.length,
    tileRefCustody: compactSource.tileRefCustody,
    retentionAudit,
    budgetDiagnostics,
    compactSourceConstruction: compactSource.compactSourceConstruction,
    retainedSourceConstruction,
    wgslProjectedRefStream,
    wgslProjectedRefStreamEvidence,
    tileRefSplatIds: legacyProjection.tileRefSplatIds,
    prepassSignature,
    debugMode: TILE_LOCAL_DEBUG_MODE,
    diagnostics,
    arenaBackend: "gpu",
    gpuArenaRuntime,
    gpuArenaProjectedContributors,
    presentationAnchors: TILE_LOCAL_PRESENTATION_ANCHORS,
    presentationScope: TILE_LOCAL_PRESENTATION_SCOPE,
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
    disposed: false,
  };
}

function createWgslProjectedSourceFrontierTileLocalSceneState(
  input: WgslProjectedSourceFrontierTileLocalSceneStateInput,
): TileLocalSceneState {
  const {
    device,
    attributes,
    buffers,
    effectiveOpacities,
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    footprintParams,
    prepassSignature,
    frameTiming,
  } = input;
  const tileSizePx = TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX;
  const tileColumns = tileColumnsForViewport(viewportWidth);
  const tileRows = tileRowsForViewport(viewportHeight);
  const tileCount = tileColumns * tileRows;
  const maxTilesPerSplat = COMPACT_SOURCE_FULL_SCENE_MAX_TILES_PER_SPLAT;
  const splats = timeOptionalFrameStage(frameTiming, "wgsl-source-frontier-project-splats", () => projectRuntimeSplatsForCompactSource({
    attributes,
    viewProj,
    viewportWidth,
    viewportHeight,
    splatScale: footprintParams.splatScale,
    minRadiusPx: footprintParams.minRadiusPx,
    nearFadeEndNdc: footprintParams.nearFadeEndNdc,
    tileSizePx,
    tileColumns,
    tileRows,
  }));
  const projectedRefEstimate = timeOptionalFrameStage(frameTiming, "wgsl-source-frontier-estimate-ref-budget", () => estimateCompactProjectedTileRefCount({
    splats,
    viewportWidth,
    viewportHeight,
    tileSizePx,
    maxTileEntries: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    maxTilesPerSplat,
  }));
  const frontierSource: WgslProjectedSourceFrontierSource = {
    splats,
    candidateSplatIndexes: new Uint32Array(splats.map((splat) => splat.splatIndex)),
    projectedRefEstimate,
    maxTilesPerSplat,
    tileCount,
  };
  const sourceFrontierTileRefCapacity = gpuLiveMaxTileRefs(
    device,
    frontierSource.tileCount,
    Math.max(
      frontierSource.projectedRefEstimate,
      frontierSource.candidateSplatIndexes.length,
      1,
    ),
  );
  const plan = createGpuTileCoveragePlan({
    viewportWidth,
    viewportHeight,
    tileSizePx,
    splatCount: attributes.count,
    sourceSplatCount: frontierSource.candidateSplatIndexes.length,
    maxTileRefs: sourceFrontierTileRefCapacity,
    maxTilesPerSplat: frontierSource.maxTilesPerSplat,
  });
  const bufferBlocker = gpuTileCoverageBufferUnavailableReason(device, plan);
  if (bufferBlocker) {
    throw new Error(bufferBlocker);
  }
  const pipeline = createGpuTileCoveragePipelineSkeleton(device, "rgba16float");
  const frameUniformBuffer = createUniformBuffer(
    device,
    GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
    "wgsl_source_frontier_frame_uniforms"
  );
  const frameUniformData = new Float32Array(GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);
  const tileHeaderBuffer = createTileHeaderStorageBuffer(
    device,
    plan,
    frontierSource.candidateSplatIndexes,
    "wgsl_source_frontier_tile_headers"
  );
  const tileRefBuffer = createEmptyStorageBuffer(device, plan.tileRefBytes, "wgsl_source_frontier_tile_refs");
  const tileCoverageWeightBuffer = createEmptyStorageBuffer(
    device,
    plan.tileCoverageWeightBytes,
    "wgsl_source_frontier_tile_coverage_weights"
  );
  const tileBuildCountBuffer = createEmptyStorageBuffer(
    device,
    Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT),
    "wgsl_source_frontier_tile_build_counts"
  );
  const tileScatterCursorBuffer = createEmptyStorageBuffer(
    device,
    Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT),
    "wgsl_source_frontier_scatter_cursors"
  );
  const alphaParamBuffer = createEmptyStorageBuffer(device, plan.alphaParamBytes, "wgsl_source_frontier_alpha_params");
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
  const compactSourceConstruction = buildWgslProjectedSourceFrontierCompactSourceConstruction(
    frontierSource,
    plan
  );
  const compactSource = compactRetainedSourceForWgslProjectedSourceFrontier(
    frontierSource,
    compactSourceConstruction,
    plan
  );
  const tileRefCustody = compactSource.tileRefCustody;
  const retentionAudit = estimatedGpuLiveRetentionAudit(tileRefCustody, plan.tileCount);
  const budgetDiagnostics = compactRetainedSourceBudgetDiagnostics(plan, compactSource);
  const alphaParamData = new Float32Array(Math.max(plan.alphaParamBytes / Float32Array.BYTES_PER_ELEMENT, 8));
  const tileRefData = new Uint32Array(Math.max(plan.maxTileRefs * 4, 4));
  const tileCoverageWeightData = new Float32Array(Math.max(plan.maxTileRefs, 1));
  const tileRefShapeParams = new Float32Array(Math.max(plan.maxTileRefs * 8, 8));
  const tileRefSplatIds = new Uint32Array(Math.max(plan.maxTileRefs, 1));
  const sourceDepthEvidence = compactSourceBackToFrontDepthEvidence(attributes, viewMatrix);
  const diagnostics = summarizeTileLocalDiagnostics({
    debugMode: TILE_LOCAL_DEBUG_MODE,
    plan,
    tileEntryCount: 0,
    tileHeaders: new Uint32Array(Math.max(plan.tileCount * 4, 4)),
    tileRefCustody,
    retentionAudit,
    tileCoverageWeights: tileCoverageWeightData,
    alphaParamData,
    sourceOpacities: effectiveOpacities,
  });
  const retainedSourceConstruction = buildWgslProjectedSourceFrontierConstructionEvidence(frontierSource, plan);
  const wgslProjectedRefStreamEvidence = buildWgslProjectedRefStreamEvidence(compactSource, null);

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
    tileHeaderData: new Uint32Array(Math.max(plan.tileCount * 4, 4)),
    tileRefBuffer,
    tileRefData,
    tileCoverageWeightBuffer,
    tileCoverageWeightData,
    tileBuildCountBuffer,
    tileScatterCursorBuffer,
    alphaParamBuffer,
    alphaParamData,
    sourceViewDepths: sourceDepthEvidence.depths,
    sourceOpacities: effectiveOpacities,
    tileRefShapeParams,
    outputTexture,
    outputView,
    tileEntryCount: 0,
    tileRefCustody,
    retentionAudit,
    budgetDiagnostics,
    compactSourceConstruction,
    retainedSourceConstruction,
    wgslProjectedRefStream: null,
    wgslProjectedRefStreamEvidence,
    tileRefSplatIds,
    prepassSignature,
    debugMode: TILE_LOCAL_DEBUG_MODE,
    diagnostics,
    arenaBackend: "gpu",
    gpuArenaRuntime: null,
    gpuArenaProjectedContributors: [],
    presentationAnchors: TILE_LOCAL_PRESENTATION_ANCHORS,
    presentationScope: TILE_LOCAL_PRESENTATION_SCOPE,
    traceAnchors: TILE_LOCAL_TRACE_ANCHORS,
    perPixelProjectedContributors: [],
    perPixelRetainedContributors: [],
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
    disposed: false,
  };
}

function buildWgslProjectedSourceFrontierCompactSourceConstruction(
  frontierSource: WgslProjectedSourceFrontierSource,
  plan: GpuTileCoveragePlan,
): CompactSourceConstructionEvidence {
  return {
    classification: "wgsl-projected-source-frontier",
    prestreamClassification: "wgsl-projected-source-frontier",
    guardedQuantity: "wgsl-projected-source-frontier",
    presentationScope: TILE_LOCAL_PRESENTATION_SCOPE,
    forceAnchorOnly: false,
    allowAnchorOnlyBudgetFallback: false,
    shouldRestrictToAnchorTiles: false,
    shouldBoundSplatTileFootprints: true,
    projectedOverflow: frontierSource.projectedRefEstimate > TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    retainedBudgetWithinProjectedLimit: null,
    tileCount: frontierSource.tileCount,
    sourceTileCount: frontierSource.tileCount,
    traceTileCount: 0,
    candidateSplatCount: frontierSource.candidateSplatIndexes.length,
    projectedSplatCount: frontierSource.splats.length,
    fullSceneConstructionRefUpperBound: frontierSource.splats.length * frontierSource.tileCount,
    projectedRefEstimate: frontierSource.projectedRefEstimate,
    streamedProjectedRefs: 0,
    projectedRefs: frontierSource.projectedRefEstimate,
    retainedRefs: 0,
    droppedRefs: 0,
    maxProjectedRefs: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    retainedBudgetRefs: plan.maxTileRefs,
    maxRefsPerTile: gpuLiveEffectiveRefsPerTile(plan),
    maxTilesPerSplat: frontierSource.maxTilesPerSplat,
    effectiveMaxTilesPerSplat: frontierSource.maxTilesPerSplat,
    footprintComparisonClass: "wgsl-source-frontier-bounded-full-scene",
  };
}

function compactRetainedSourceForWgslProjectedSourceFrontier(
  frontierSource: WgslProjectedSourceFrontierSource,
  compactSourceConstruction: CompactSourceConstructionEvidence,
  plan: GpuTileCoveragePlan,
): CompactRetainedSourceForRuntime {
  return {
    projectedRecords: [],
    retainedRecords: [],
    droppedRecords: [],
    candidateSplatIndexes: frontierSource.candidateSplatIndexes,
    projectedContributorCount: frontierSource.projectedRefEstimate,
    retainedContributorCount: 0,
    droppedContributorCount: 0,
    projectedRefBudgetOverflow: frontierSource.projectedRefEstimate > TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES
      ? {
          projectedRefs: frontierSource.projectedRefEstimate,
          maxProjectedRefs: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
          mode: "wgsl-projected-source-frontier",
        }
      : null,
    compactSourceConstruction,
    tileRefCustody: {
      projectedTileEntryCount: frontierSource.projectedRefEstimate,
      retainedTileEntryCount: 0,
      evictedTileEntryCount: 0,
      cappedTileCount: 0,
      saturatedRetainedTileCount: 0,
      maxProjectedRefsPerTile: gpuLiveEffectiveRefsPerTile(plan),
      maxRetainedRefsPerTile: 0,
      headerRefCount: 0,
      headerAccountingMatches: true,
    },
    perPixelProjectedContributors: [],
    perPixelRetainedContributors: [],
  };
}

function createWgslProjectedRefStreamState({
  device,
  pipeline,
  buffers,
  outputView,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  splatCount,
  compactSource,
}: {
  readonly device: GPUDevice;
  readonly pipeline: GpuTileCoveragePipelineSkeleton;
  readonly buffers: SplatGpuBuffers;
  readonly outputView: GPUTextureView;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly splatCount: number;
  readonly compactSource: CompactRetainedSourceForRuntime;
}): { readonly state: WgslProjectedRefStreamState | null; readonly unavailableReason?: string } {
  if (!WGSL_PROJECTED_REF_STREAM_ENABLED) {
    return { state: null };
  }
  const plan = createGpuTileCoveragePlan({
    viewportWidth,
    viewportHeight,
    tileSizePx,
    splatCount,
    sourceSplatCount: compactSource.candidateSplatIndexes.length,
    maxTileRefs: Math.max(
      compactSource.projectedContributorCount,
      compactSource.retainedContributorCount,
      compactSource.candidateSplatIndexes.length,
      1,
    ),
    maxTilesPerSplat: compactSource.compactSourceConstruction?.effectiveMaxTilesPerSplat ?? null,
  });
  const bufferBlocker = gpuTileCoverageBufferUnavailableReason(device, plan);
  if (bufferBlocker) {
    return { state: null, unavailableReason: bufferBlocker };
  }
  const frameUniformBuffer = createUniformBuffer(
    device,
    GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
    "wgsl_projected_ref_stream_frame_uniforms"
  );
  const frameUniformData = new Float32Array(GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);
  const tileHeaderBuffer = createTileHeaderStorageBuffer(
    device,
    plan,
    compactSource.candidateSplatIndexes,
    "wgsl_projected_ref_stream_tile_headers"
  );
  const tileRefBuffer = createEmptyStorageBuffer(device, plan.tileRefBytes, "wgsl_projected_ref_stream_tile_refs");
  const tileCoverageWeightBuffer = createEmptyStorageBuffer(
    device,
    plan.tileCoverageWeightBytes,
    "wgsl_projected_ref_stream_tile_coverage_weights"
  );
  const tileScatterCursorBuffer = createEmptyStorageBuffer(
    device,
    Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT),
    "wgsl_projected_ref_stream_scatter_cursors"
  );
  const alphaParamBuffer = createEmptyStorageBuffer(device, plan.alphaParamBytes, "wgsl_projected_ref_stream_alpha_params");
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
  return {
    state: {
      requestedBackend: "wgsl-projected-ref-stream",
      effectiveBackend: "wgsl-projected-ref-stream-sidecar",
      sourceRole: "diagnostic-sidecar-not-retention-source",
      plan,
      bindGroup,
      frameUniformBuffer,
      frameUniformData,
      tileHeaderBuffer,
      tileRefBuffer,
      tileCoverageWeightBuffer,
      tileScatterCursorBuffer,
      alphaParamBuffer,
      compactSourceProjectedRefs: compactSource.projectedContributorCount,
      compactSourceRetainedRefs: compactSource.retainedContributorCount,
      sourceSplatCount: compactSource.candidateSplatIndexes.length,
    },
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
  traceAnchors,
  presentationAnchors,
  presentationScope,
  frameTiming,
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
  readonly traceAnchors: readonly PixelTraceAnchor[];
  readonly presentationAnchors: readonly PixelTraceAnchor[];
  readonly presentationScope: TileLocalPresentationScope;
  readonly frameTiming?: FrameTimingDraft;
}): CompactRetainedSourceForRuntime {
  const tileCount = tileColumns * tileRows;
  const traceAnchorTileIndexes = compactSourceAnchorTileNeighborhoodIndexes({
    anchors: traceAnchors,
    tileSizePx,
    tileColumns,
    tileRows,
    radiusTiles: COMPACT_SOURCE_ANCHOR_TILE_NEIGHBORHOOD_RADIUS,
  });
  const presentationSelectorAnchors = presentationAnchors.length > 0 ? presentationAnchors : traceAnchors;
  const presentationTileIndexes = compactSourceAnchorTileNeighborhoodIndexes({
    anchors: presentationSelectorAnchors,
    tileSizePx,
    tileColumns,
    tileRows,
    radiusTiles: COMPACT_SOURCE_PRESENTATION_TILE_NEIGHBORHOOD_RADIUS,
  });
  const retainedCapacity = tileCount * maxRefsPerTile;
  const useAnchorPrefilter = presentationScope === "anchor-neighborhood" &&
    presentationTileIndexes.size > 0 &&
    retainedCapacity <= maxTileEntries &&
    tileCount > 10_000;
  const retainedTileIndexes = useAnchorPrefilter ? presentationTileIndexes : traceAnchorTileIndexes;
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
        anchorTileIndexes: retainedTileIndexes,
      })
    : null;
  const fullSceneConstructionRefUpperBound = presentationScope === "full-scene" && !useAnchorPrefilter
    ? attributes.count * tileCount
    : 0;
  const fullSceneConstructionBudget = classifyCompactSourceConstructionBudget({
    projectedRefs: fullSceneConstructionRefUpperBound,
    maxProjectedRefs: maxTileEntries,
    retainedBudgetRefs: retainedCapacity,
    presentationScope,
    forceAnchorOnly: false,
    allowAnchorOnlyBudgetFallback: false,
    anchorTileCount: 0,
    maxTilesPerSplat: COMPACT_SOURCE_FULL_SCENE_MAX_TILES_PER_SPLAT,
  });
  if (fullSceneConstructionBudget.shouldThrowProjectedRefBudgetError) {
    throw new Error(
      `projected tile refs exceed budget: ${fullSceneConstructionRefUpperBound.toLocaleString()} > ${maxTileEntries.toLocaleString()} (compact source construction remains unbounded; bounded presentation source unavailable before retained handoff)`
    );
  }
  const fullSceneConstructionMaxTilesPerSplat = fullSceneConstructionBudget.shouldBoundSplatTileFootprints
    ? COMPACT_SOURCE_FULL_SCENE_MAX_TILES_PER_SPLAT
    : null;
  const splats = timeOptionalFrameStage(frameTiming, "compact-source-project-splats", () => projectRuntimeSplatsForCompactSource({
    attributes,
    viewProj,
    viewportWidth,
    viewportHeight,
    splatScale,
    minRadiusPx,
    nearFadeEndNdc,
    onlyTileIndexes: useAnchorPrefilter ? retainedTileIndexes : null,
    tileSizePx,
    tileColumns,
    tileRows,
    candidateSplatIndexes: anchorCandidateSplatIndexes,
  }));
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
    anchors: traceAnchors,
    anchorTileIndexes: retainedTileIndexes,
    traceAnchorTileIndexes: traceAnchorTileIndexes,
    forceAnchorOnly: useAnchorPrefilter,
    allowAnchorOnlyBudgetFallback: presentationScope === "anchor-neighborhood",
    maxTilesPerSplat: fullSceneConstructionMaxTilesPerSplat,
    fullSceneConstructionRefUpperBound,
    prestreamConstructionBudget: fullSceneConstructionBudget,
    buildProjectionRetentionArena,
    rendererMetadata,
    frameTiming,
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
  traceAnchorTileIndexes,
  forceAnchorOnly,
  allowAnchorOnlyBudgetFallback,
  maxTilesPerSplat,
  fullSceneConstructionRefUpperBound,
  prestreamConstructionBudget,
  buildProjectionRetentionArena,
  rendererMetadata,
  frameTiming,
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
  readonly traceAnchorTileIndexes?: ReadonlySet<number> | null;
  readonly forceAnchorOnly?: boolean;
  readonly allowAnchorOnlyBudgetFallback?: boolean;
  readonly maxTilesPerSplat?: number | null;
  readonly fullSceneConstructionRefUpperBound?: number;
  readonly prestreamConstructionBudget?: ReturnType<typeof classifyCompactSourceConstructionBudget>;
  readonly buildProjectionRetentionArena: typeof buildDeterministicGpuTileProjectionRetentionArena;
  readonly rendererMetadata: Record<string, unknown>;
  readonly frameTiming?: FrameTimingDraft;
}): CompactRetainedSourceForRuntime {
  const tileCount = tileColumns * tileRows;
  const projectedCounts = new Uint32Array(Math.max(0, tileCount));
  const sourceTileIndexes = anchorTileIndexes ?? compactSourceAnchorTileIndexes({ anchors, tileSizePx, tileColumns, tileRows });
  const traceTileIndexes = traceAnchorTileIndexes ?? sourceTileIndexes;
  const retainedCapacity = tileCount * maxRefsPerTile;
  const projectedTileRefEstimate = timeOptionalFrameStage(frameTiming, "compact-source-estimate-ref-budget", () => estimateCompactProjectedTileRefCount({
    splats,
    viewportWidth,
    viewportHeight,
    tileSizePx,
    maxTileEntries,
    maxTilesPerSplat,
  }));
  const compactSourceBudget = classifyCompactSourceConstructionBudget({
    projectedRefs: projectedTileRefEstimate,
    maxProjectedRefs: maxTileEntries,
    retainedBudgetRefs: retainedCapacity,
    presentationScope: allowAnchorOnlyBudgetFallback ? "anchor-neighborhood" : "full-scene",
    forceAnchorOnly: Boolean(forceAnchorOnly),
    allowAnchorOnlyBudgetFallback: Boolean(allowAnchorOnlyBudgetFallback),
    anchorTileCount: sourceTileIndexes.size,
    // The estimate above already applied the per-splat tile cap. If that
    // bounded estimate still overflows, the route is genuinely too large for
    // this projected-ref budget and must not be reclassified as bounded-safe.
  });
  if (compactSourceBudget.shouldThrowProjectedRefBudgetError) {
    throw new Error(
      `projected tile refs exceed budget: ${projectedTileRefEstimate.toLocaleString()} > ${maxTileEntries.toLocaleString()} (compact source construction requires bounded presentation source before retained handoff)`
    );
  }
  const retainOnlyAnchorTiles = compactSourceBudget.shouldRestrictToAnchorTiles;
  const projectedRefBudgetOverflow: CompactRetainedSourceForRuntime["projectedRefBudgetOverflow"] =
    compactSourceBudget.projectedRefBudgetOverflow;
  const { ranks, depths } = compactSourceBackToFrontDepthEvidence(attributes, viewMatrix);
  const splatsByIndex = new Map(splats.map((splat) => [splat.splatIndex, splat]));
  const compactSourceCandidateSplatIndexes = new Uint32Array(splats.map((splat) => splat.splatIndex));
  const buckets = new Map<number, CompactStreamingTileBucket>();
  const anchorProjectedRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const tileHeaderU32 = new Uint32Array(Math.max(0, tileCount * 8));
  let projectedIndex = 0;

  timeOptionalFrameStage(frameTiming, "compact-source-stream-retention", () => {
    streamCompactProjectedTileRefs({
      splats,
      viewportWidth,
      viewportHeight,
      tileSizePx,
      tileColumns,
      samplesPerAxis,
      onlyTileIndexes: retainOnlyAnchorTiles ? sourceTileIndexes : null,
      maxTilesPerSplat,
      onEntry({ splat, tileIndex, tileX, tileY, coverageWeight, localSupportWeight }) {
        const currentProjectedIndex = projectedIndex;
        projectedIndex += 1;
        projectedCounts[tileIndex] += 1;
        const shouldRetainTile = !retainOnlyAnchorTiles || sourceTileIndexes.has(tileIndex);
        const shouldTraceTile = traceTileIndexes.has(tileIndex);
        if (!shouldRetainTile && !shouldTraceTile) {
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
            localSupportWeight,
          },
          projectedIndex: currentProjectedIndex,
          splatsByIndex,
          ranks,
          depths,
          attributes,
          effectiveOpacities,
        });
        if (shouldTraceTile) {
          anchorProjectedRecords.push(record);
        }
        if (shouldRetainTile) {
          const bucket = compactStreamingTileBucket(buckets, tileIndex);
          compactRetainTopRecord(bucket.coverageRecords, record, maxRefsPerTile, compareCompactProjectionRetentionCoverageOrder);
          compactRetainTopRecord(bucket.retentionRecords, record, Math.max(1, Math.floor(maxRefsPerTile / 2)), compareCompactProjectionRetentionPriority);
          compactRetainTopRecord(bucket.occlusionRecords, record, Math.max(1, Math.floor(maxRefsPerTile / 2)), compareCompactProjectionOcclusionPriority);
          compactRetainSupportSampleRecords({
            bucket,
            record,
            tileMinX: tileX * tileSizePx,
            tileMinY: tileY * tileSizePx,
            tileMaxX: Math.min(viewportWidth, (tileX + 1) * tileSizePx),
            tileMaxY: Math.min(viewportHeight, (tileY + 1) * tileSizePx),
            maxRefsPerTile,
          });
        }
      },
    });
  });

  const retainedRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const retainedRecordsByTile = timeOptionalFrameStage(frameTiming, "compact-source-finalize-retained", () =>
    buildCompactRetainedRecordsWithGpuCarrier({
      tileCount,
      maxRefsPerTile,
      buckets,
      buildProjectionRetentionArena,
    })
  );
  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    const projectedCount = projectedCounts[tileIndex] ?? 0;
    const retainedOffset = retainedRecords.length;
    const retainedTileRecords = retainedRecordsByTile.get(tileIndex) ?? [];
    retainedRecords.push(...retainedTileRecords);

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
  const projectedContributorCount = streamedProjectedContributorCount;
  const droppedContributorCount = Math.max(0, projectedContributorCount - retainedRecords.length);
  const sourceTileCount = retainOnlyAnchorTiles ? sourceTileIndexes.size : tileCount;
  const compactSourceConstruction = buildCompactSourceConstructionEvidence({
    compactSourceBudget,
    prestreamConstructionBudget,
    presentationScope: allowAnchorOnlyBudgetFallback ? "anchor-neighborhood" : "full-scene",
    forceAnchorOnly: Boolean(forceAnchorOnly),
    allowAnchorOnlyBudgetFallback: Boolean(allowAnchorOnlyBudgetFallback),
    tileCount,
    sourceTileCount,
    traceTileCount: traceTileIndexes.size,
    candidateSplatCount: splats.length,
    projectedSplatCount: splats.length,
    fullSceneConstructionRefUpperBound: fullSceneConstructionRefUpperBound ?? 0,
    projectedRefEstimate: projectedTileRefEstimate,
    streamedProjectedRefs: streamedProjectedContributorCount,
    projectedRefs: projectedContributorCount,
    retainedRefs: retainedRecords.length,
    droppedRefs: droppedContributorCount,
    maxProjectedRefs: maxTileEntries,
    retainedBudgetRefs: retainedCapacity,
    maxRefsPerTile,
    maxTilesPerSplat: maxTilesPerSplat ?? null,
  });
  const tileRefCustody = compactTileRefCustody({
    tileCount,
    tileHeaders: tileHeaderU32,
    projectedContributorCount,
    retainedContributorCount: retainedRecords.length,
    droppedContributorCount,
    maxRefsPerTile,
  });

  const perPixelTraces = timeOptionalFrameStage(frameTiming, "compact-source-pixel-traces", () => ({
    projected: compactPerPixelContributorTraces({
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
    retained: compactPerPixelContributorTraces({
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
  }));

  return {
    projectedRecords: anchorProjectedRecords,
    retainedRecords,
    droppedRecords: [],
    candidateSplatIndexes: compactSourceCandidateSplatIndexes,
    projectedContributorCount,
    retainedContributorCount: retainedRecords.length,
    droppedContributorCount,
    projectedRefBudgetOverflow,
    compactSourceConstruction,
    tileRefCustody,
    perPixelProjectedContributors: perPixelTraces.projected,
    perPixelRetainedContributors: perPixelTraces.retained,
  };
}

function buildCompactSourceConstructionEvidence({
  compactSourceBudget,
  prestreamConstructionBudget,
  presentationScope,
  forceAnchorOnly,
  allowAnchorOnlyBudgetFallback,
  tileCount,
  sourceTileCount,
  traceTileCount,
  candidateSplatCount,
  projectedSplatCount,
  fullSceneConstructionRefUpperBound,
  projectedRefEstimate,
  streamedProjectedRefs,
  projectedRefs,
  retainedRefs,
  droppedRefs,
  maxProjectedRefs,
  retainedBudgetRefs,
  maxRefsPerTile,
  maxTilesPerSplat,
}: {
  readonly compactSourceBudget: ReturnType<typeof classifyCompactSourceConstructionBudget>;
  readonly prestreamConstructionBudget?: ReturnType<typeof classifyCompactSourceConstructionBudget>;
  readonly presentationScope: TileLocalPresentationScope;
  readonly forceAnchorOnly: boolean;
  readonly allowAnchorOnlyBudgetFallback: boolean;
  readonly tileCount: number;
  readonly sourceTileCount: number;
  readonly traceTileCount: number;
  readonly candidateSplatCount: number;
  readonly projectedSplatCount: number;
  readonly fullSceneConstructionRefUpperBound: number;
  readonly projectedRefEstimate: number;
  readonly streamedProjectedRefs: number;
  readonly projectedRefs: number;
  readonly retainedRefs: number;
  readonly droppedRefs: number;
  readonly maxProjectedRefs: number;
  readonly retainedBudgetRefs: number;
  readonly maxRefsPerTile: number;
  readonly maxTilesPerSplat: number | null;
}): CompactSourceConstructionEvidence {
  const classification = String(compactSourceBudget.classification ?? "compact-source-underinstrumented");
  const prestreamClassification = String(
    prestreamConstructionBudget?.classification ?? classification
  );
  const shouldRestrictToAnchorTiles = Boolean(compactSourceBudget.shouldRestrictToAnchorTiles);
  const shouldBoundSplatTileFootprints =
    Boolean(compactSourceBudget.shouldBoundSplatTileFootprints) ||
    Boolean(prestreamConstructionBudget?.shouldBoundSplatTileFootprints);
  const effectiveMaxTilesPerSplat = shouldBoundSplatTileFootprints ? maxTilesPerSplat : null;
  return {
    classification,
    prestreamClassification,
    guardedQuantity: String(compactSourceBudget.guardedQuantity ?? "compact-source-dense-projected-tile-refs"),
    presentationScope,
    forceAnchorOnly,
    allowAnchorOnlyBudgetFallback,
    shouldRestrictToAnchorTiles,
    shouldBoundSplatTileFootprints,
    projectedOverflow: compactSourceBudget.projectedOverflow,
    retainedBudgetWithinProjectedLimit: compactSourceBudget.retainedBudgetWithinProjectedLimit,
    tileCount,
    sourceTileCount,
    traceTileCount,
    candidateSplatCount,
    projectedSplatCount,
    fullSceneConstructionRefUpperBound,
    projectedRefEstimate,
    streamedProjectedRefs,
    projectedRefs,
    retainedRefs,
    droppedRefs,
    maxProjectedRefs,
    retainedBudgetRefs,
    maxRefsPerTile,
    maxTilesPerSplat,
    effectiveMaxTilesPerSplat,
    footprintComparisonClass: classifyCompactSourceFootprintComparison({
      presentationScope,
      shouldRestrictToAnchorTiles,
      shouldBoundSplatTileFootprints,
      effectiveMaxTilesPerSplat,
    }),
  };
}

function buildGpuArenaRetainedSourceConstructionEvidence(
  compactSource: CompactRetainedSourceForRuntime,
): RetainedSourceConstructionEvidence {
  return {
    requestedSourceBackend: "gpu-retained-source-substrate",
    effectiveSourceBackend: "deterministic-gpu-retention-carrier",
    oracleBackend: "cpu-reference",
    runtimeConsumerBackend: "gpu-contributor-arena-runtime",
    sourceHandoff: "cpu-projected-candidate-records",
    falseClosureGuard: "gpu-retention-carrier-does-not-imply-wgsl-source-construction",
    cpuOwnedStages: [
      "compact-source-project-splats",
      "compact-source-estimate-ref-budget",
      "compact-source-stream-retention",
      "compact-source-pixel-traces",
    ],
    gpuReadyStages: [
      "gpu-projection-retention-election-carrier",
      "gpu-contributor-arena-count-prefix-scatter",
      "gpu-contributor-arena-legacy-compositor-consumer",
    ],
    nextGpuOffloadStage: "wgsl-projected-ref-stream",
    projectedRefs: compactSource.projectedContributorCount,
    retainedRefs: compactSource.retainedContributorCount,
    droppedRefs: compactSource.droppedContributorCount,
  };
}

function buildWgslProjectedSourceFrontierConstructionEvidence(
  frontierSource: WgslProjectedSourceFrontierSource,
  plan: GpuTileCoveragePlan,
): RetainedSourceConstructionEvidence {
  const compactSourceStreamRetentionBlockedStage = "compact-source-stream-retention";
  return {
    requestedSourceBackend: "gpu-retained-source-substrate",
    effectiveSourceBackend: "wgsl-projected-ref-stream-source-frontier",
    oracleBackend: "cpu-reference",
    runtimeConsumerBackend: "tile-local-visible-gaussian-compositor",
    sourceHandoff: "wgsl-projected-ref-stream-gpu-buffers",
    falseClosureGuard: "wgsl-source-frontier-feeds-visible-compositor-but-does-not-perform-retention-election",
    cpuOwnedStages: [
      "wgsl-source-frontier-project-splats",
      "wgsl-source-frontier-estimate-ref-budget",
    ],
    gpuReadyStages: [
      "wgsl-projected-ref-stream-source-table",
      "wgsl-projected-ref-stream-build-tile-refs",
      "tile-local-visible-gaussian-compositor",
    ],
    nextGpuOffloadStage: "gpu-retention-election",
    projectedRefs: frontierSource.projectedRefEstimate,
    retainedRefs: 0,
    droppedRefs: 0,
    retainedBudgetRefs: plan.maxTileRefs,
    maxRefsPerTile: gpuLiveEffectiveRefsPerTile(plan),
    frontierBlockedStages: [
      compactSourceStreamRetentionBlockedStage,
      "compact-source-pixel-traces",
      "gpu-retention-election",
    ],
  };
}

function buildWgslProjectedRefStreamEvidence(
  compactSource: CompactRetainedSourceForRuntime,
  stream: WgslProjectedRefStreamState | null | undefined,
  unavailableReason?: string,
): WgslProjectedRefStreamEvidence {
  if (WGSL_PROJECTED_REF_STREAM_MODE === "source-frontier") {
    return {
      requestedBackend: "wgsl-projected-ref-stream",
      effectiveBackend: "wgsl-projected-ref-stream-source-frontier",
      sourceRole: "visible-source-frontier-not-retention-election",
      runtimeConsumerBackend: "tile-local-visible-gaussian-compositor",
      falseClosureGuard: "wgsl-source-frontier-feeds-compositor-but-is-not-exact-parity-or-production-retention",
      compactSourceProjectedRefs: compactSource.projectedContributorCount,
      compactSourceRetainedRefs: compactSource.retainedContributorCount,
      sourceSplatCount: compactSource.candidateSplatIndexes.length,
      maxTilesPerSplat: compactSource.compactSourceConstruction?.effectiveMaxTilesPerSplat ?? null,
      allocatedProjectedRefs: compactSource.compactSourceConstruction?.retainedBudgetRefs ?? compactSource.projectedContributorCount,
      tileCount: compactSource.compactSourceConstruction?.tileCount ?? 0,
      maxRefsPerTile: compactSource.compactSourceConstruction?.maxRefsPerTile ?? 0,
      dispatchEnqueueDurationMs: stream?.dispatchEnqueueDurationMs,
      readback: stream?.readback,
      unavailableReason,
    };
  }
  return {
    requestedBackend: "wgsl-projected-ref-stream",
    effectiveBackend: stream
      ? "wgsl-projected-ref-stream-sidecar"
      : unavailableReason
        ? "unavailable"
        : "disabled",
    sourceRole: "diagnostic-sidecar-not-retention-source",
    runtimeConsumerBackend: "none",
    falseClosureGuard: "wgsl-projected-ref-stream-sidecar-does-not-feed-retention-or-compositor",
    compactSourceProjectedRefs: compactSource.projectedContributorCount,
    compactSourceRetainedRefs: compactSource.retainedContributorCount,
    sourceSplatCount: stream?.plan.sourceSplatCount ?? compactSource.candidateSplatIndexes.length,
    maxTilesPerSplat: stream?.plan.maxTilesPerSplat ?? null,
    allocatedProjectedRefs: stream?.plan.maxTileRefs ?? 0,
    tileCount: stream?.plan.tileCount ?? 0,
    maxRefsPerTile: stream ? gpuLiveEffectiveRefsPerTile(stream.plan) : 0,
    dispatchEnqueueDurationMs: stream?.dispatchEnqueueDurationMs,
    readback: stream?.readback,
    unavailableReason,
  };
}

function refreshWgslProjectedRefStreamEvidence(state: TileLocalSceneState): void {
  if (!state.wgslProjectedRefStreamEvidence || !state.wgslProjectedRefStream) {
    return;
  }
  state.wgslProjectedRefStreamEvidence = {
    ...state.wgslProjectedRefStreamEvidence,
    allocatedProjectedRefs: state.wgslProjectedRefStream.plan.maxTileRefs,
    tileCount: state.wgslProjectedRefStream.plan.tileCount,
    sourceSplatCount: state.wgslProjectedRefStream.plan.sourceSplatCount,
    maxTilesPerSplat: state.wgslProjectedRefStream.plan.maxTilesPerSplat ?? null,
    maxRefsPerTile: gpuLiveEffectiveRefsPerTile(state.wgslProjectedRefStream.plan),
    dispatchEnqueueDurationMs: state.wgslProjectedRefStream.dispatchEnqueueDurationMs,
    readback: state.wgslProjectedRefStream.readback,
  };
}

function classifyWgslProjectedRefStreamComparison(
  projectedScatterRefs: number,
  compactSourceProjectedRefs: number,
  stream: WgslProjectedRefStreamState,
): WgslProjectedRefStreamComparisonClass {
  if (projectedScatterRefs === compactSourceProjectedRefs) {
    return "matches-compact-projected-refs";
  }
  if (projectedScatterRefs > compactSourceProjectedRefs) {
    if (
      stream.plan.sourceSplatCount !== stream.plan.splatCount ||
      (stream.plan.maxTilesPerSplat ?? 0) > 0
    ) {
      return "compact-candidate-footprint-divergence";
    }
    return "raw-gpu-projection-superset";
  }
  return "underpopulated-vs-compact-projected-refs";
}

function classifyCompactSourceFootprintComparison({
  presentationScope,
  shouldRestrictToAnchorTiles,
  shouldBoundSplatTileFootprints,
  effectiveMaxTilesPerSplat,
}: {
  readonly presentationScope: TileLocalPresentationScope;
  readonly shouldRestrictToAnchorTiles: boolean;
  readonly shouldBoundSplatTileFootprints: boolean;
  readonly effectiveMaxTilesPerSplat: number | null;
}): string {
  if (shouldRestrictToAnchorTiles) return "anchor-neighborhood-source";
  if (presentationScope === "full-scene" && shouldBoundSplatTileFootprints && effectiveMaxTilesPerSplat) {
    return "bounded-full-scene-source";
  }
  if (presentationScope === "full-scene") return "unbounded-full-scene-source";
  return "anchor-neighborhood-source";
}

function estimateCompactProjectedTileRefCount({
  splats,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  maxTileEntries,
  maxTilesPerSplat,
}: {
  readonly splats: RuntimeCompactTileCoverage["splats"];
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly maxTileEntries: number;
  readonly maxTilesPerSplat?: number | null;
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
    projectedTileRefs += compactSourceBoundedTileRefCount({
      tileBounds,
      centerPx: splat.centerPx,
      tileSizePx,
      maxTilesPerSplat,
    });
    if (projectedTileRefs > maxTileEntries) {
      return projectedTileRefs;
    }
  }
  return projectedTileRefs;
}

interface CompactStreamingTileBucket {
  readonly coverageRecords: CompactRetainedRecordList;
  readonly retentionRecords: CompactRetainedRecordList;
  readonly occlusionRecords: CompactRetainedRecordList;
  readonly supportSampleRecords: readonly CompactRetainedRecordList[];
}

interface CompactRetainedRecordList {
  readonly records: GpuTileContributorArenaProjectedContributor[];
  worstIndex: number;
}

function compactRetainedRecordList(): CompactRetainedRecordList {
  return {
    records: [],
    worstIndex: 0,
  };
}

function compactStreamingTileBucket(
  buckets: Map<number, CompactStreamingTileBucket>,
  tileIndex: number,
): CompactStreamingTileBucket {
  let bucket = buckets.get(tileIndex);
  if (!bucket) {
    bucket = {
      coverageRecords: compactRetainedRecordList(),
      retentionRecords: compactRetainedRecordList(),
      occlusionRecords: compactRetainedRecordList(),
      supportSampleRecords: compactSupportSampleRecordLists(),
    };
    buckets.set(tileIndex, bucket);
  }
  return bucket;
}

function compactSupportSampleRecordLists(): readonly CompactRetainedRecordList[] {
  const sampleCount =
    COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS *
    COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS;
  return Array.from({ length: sampleCount }, compactRetainedRecordList);
}

function compactRetainTopRecord(
  recordList: CompactRetainedRecordList,
  record: GpuTileContributorArenaProjectedContributor,
  limit: number,
  compareRecords: typeof compareCompactProjectionRetentionCoverageOrder,
): void {
  const records = recordList.records;
  if (records.length < limit) {
    records.push(record);
    if (records.length === 1 || compareRecords(record, records[recordList.worstIndex]) > 0) {
      recordList.worstIndex = records.length - 1;
    }
    return;
  }

  if (compareRecords(record, records[recordList.worstIndex]) >= 0) {
    return;
  }

  records[recordList.worstIndex] = record;
  recordList.worstIndex = compactRetainedRecordListWorstIndex(records, compareRecords);
}

function compactRetainedRecordListWorstIndex(
  records: readonly GpuTileContributorArenaProjectedContributor[],
  compareRecords: typeof compareCompactProjectionRetentionCoverageOrder,
): number {
  let worstIndex = 0;
  for (let index = 1; index < records.length; index += 1) {
    if (compareRecords(records[index], records[worstIndex]) > 0) {
      worstIndex = index;
    }
  }
  return worstIndex;
}

function compactRetainSupportSampleRecords({
  bucket,
  record,
  tileMinX,
  tileMinY,
  tileMaxX,
  tileMaxY,
  maxRefsPerTile,
}: {
  readonly bucket: CompactStreamingTileBucket;
  readonly record: GpuTileContributorArenaProjectedContributor;
  readonly tileMinX: number;
  readonly tileMinY: number;
  readonly tileMaxX: number;
  readonly tileMaxY: number;
  readonly maxRefsPerTile: number;
}): void {
  const width = tileMaxX - tileMinX;
  const height = tileMaxY - tileMinY;
  if (width <= 0 || height <= 0) {
    return;
  }
  const samplesPerAxis = COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS;
  const sampleLimit = Math.max(1, Math.ceil(maxRefsPerTile / (samplesPerAxis * samplesPerAxis * 2)));
  for (let sampleY = 0; sampleY < samplesPerAxis; sampleY += 1) {
    const y = tileMinY + ((sampleY + 0.5) / samplesPerAxis) * height;
    for (let sampleX = 0; sampleX < samplesPerAxis; sampleX += 1) {
      const x = tileMinX + ((sampleX + 0.5) / samplesPerAxis) * width;
      const supportSampleWeight = compactSourceConicPixelWeight(record, [x, y]) * record.opacity;
      if (supportSampleWeight <= 1e-8) {
        continue;
      }
      const supportLuminance = record.occlusionWeight > 0 ? record.retentionWeight / record.occlusionWeight : 0;
      const supportSampleRetentionWeight = supportSampleWeight * Math.max(0, finiteOrZero(supportLuminance));
      const sampleIndex = sampleY * samplesPerAxis + sampleX;
      compactRetainTopRecord(
        bucket.supportSampleRecords[sampleIndex],
        { ...record, supportSampleWeight, supportSampleRetentionWeight },
        sampleLimit,
        compareCompactProjectionSupportSamplePriority,
      );
    }
  }
}

function buildCompactRetainedRecordsWithGpuCarrier({
  tileCount,
  maxRefsPerTile,
  buckets,
  buildProjectionRetentionArena,
}: {
  readonly tileCount: number;
  readonly maxRefsPerTile: number;
  readonly buckets: ReadonlyMap<number, CompactStreamingTileBucket>;
  readonly buildProjectionRetentionArena: typeof buildDeterministicGpuTileProjectionRetentionArena;
}): Map<number, GpuTileContributorArenaProjectedContributor[]> {
  const projectedCandidateRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const coverageRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const retentionRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const occlusionRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const supportSampleRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const supportSampleRecordGroups: (readonly GpuTileContributorArenaProjectedContributor[])[] = [];

  for (const bucket of buckets.values()) {
    projectedCandidateRecords.push(...compactMergedTileCandidateRecords(bucket).sort(compareCompactProjectionRetentionCoverageOrder));
    coverageRecords.push(...bucket.coverageRecords.records);
    retentionRecords.push(...bucket.retentionRecords.records);
    occlusionRecords.push(...bucket.occlusionRecords.records);
    supportSampleRecords.push(...compactSupportSampleCandidateRecords(bucket));
    supportSampleRecordGroups.push(...compactSupportSampleCandidateRecordGroups(bucket));
  }

  const retentionArena = buildProjectionRetentionArena({
    tileCount,
    maxContributors: projectedCandidateRecords.length,
    maxRefsPerTile,
    contributors: projectedCandidateRecords,
    candidateSources: {
      coverageRecords,
      retentionRecords,
      occlusionRecords,
      supportSampleRecords,
      supportSampleRecordGroups,
    },
  });
  const retainedRecordsByTile = new Map<number, GpuTileContributorArenaProjectedContributor[]>();
  for (const record of retentionArena.retainedRecords) {
    const records = retainedRecordsByTile.get(record.tileIndex);
    if (records) {
      records.push(record);
    } else {
      retainedRecordsByTile.set(record.tileIndex, [record]);
    }
  }
  for (const records of retainedRecordsByTile.values()) {
    records.sort(compareCompactProjectionRetentionCompositorOrder);
  }
  return retainedRecordsByTile;
}

function compactMergedTileCandidateRecords(
  bucket: CompactStreamingTileBucket,
): GpuTileContributorArenaProjectedContributor[] {
  const records = [];
  const seen = new Set<bigint>();
  for (const record of [
    ...bucket.coverageRecords.records,
    ...bucket.retentionRecords.records,
    ...bucket.occlusionRecords.records,
    ...compactSupportSampleCandidateRecords(bucket),
  ]) {
    const key = compactProjectionRetentionRecordKey(record);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    records.push(record);
  }
  return records;
}

function compactSupportSampleCandidateRecords(bucket: CompactStreamingTileBucket): GpuTileContributorArenaProjectedContributor[] {
  return bucket.supportSampleRecords.flatMap((recordList) => recordList.records);
}

function compactSupportSampleCandidateRecordGroups(
  bucket: CompactStreamingTileBucket,
): readonly (readonly GpuTileContributorArenaProjectedContributor[])[] {
  return bucket.supportSampleRecords.map((recordList) => recordList.records);
}

function streamCompactProjectedTileRefs({
  splats,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  samplesPerAxis,
  onlyTileIndexes,
  maxTilesPerSplat,
  onEntry,
}: {
  readonly splats: RuntimeCompactTileCoverage["splats"];
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly samplesPerAxis: number;
  readonly onlyTileIndexes?: ReadonlySet<number> | null;
  readonly maxTilesPerSplat?: number | null;
  readonly onEntry: (entry: {
    readonly splat: RuntimeCompactTileCoverage["splats"][number];
    readonly tileIndex: number;
    readonly tileX: number;
    readonly tileY: number;
    readonly coverageWeight: number;
    readonly localSupportWeight?: number;
  }) => void;
}): void {
  const selectedTileRows = onlyTileIndexes ? compactSourceSelectedTileRows(onlyTileIndexes, tileColumns) : null;
  if (onlyTileIndexes && !selectedTileRows) {
    return;
  }
  for (const splat of splats) {
    const covariance = compactSourceCovariance(splat.covariancePx);
    const densityParams = compactSourceCovarianceDensityParams(covariance);
    const tileBounds = compactSourceTileBoundsForSplat({
      centerPx: splat.centerPx,
      covariance,
      viewportWidth,
      viewportHeight,
      tileSizePx,
    });
    const boundedTileBounds = compactSourceBoundedTileBounds({
      tileBounds,
      centerPx: splat.centerPx,
      tileSizePx,
      maxTilesPerSplat,
    });
    const minTileX = selectedTileRows ? Math.max(boundedTileBounds.minTileX, selectedTileRows.minTileX) : boundedTileBounds.minTileX;
    const maxTileX = selectedTileRows ? Math.min(boundedTileBounds.maxTileX, selectedTileRows.maxTileX) : boundedTileBounds.maxTileX;
    const minTileY = selectedTileRows ? Math.max(boundedTileBounds.minTileY, selectedTileRows.minTileY) : boundedTileBounds.minTileY;
    const maxTileY = selectedTileRows ? Math.min(boundedTileBounds.maxTileY, selectedTileRows.maxTileY) : boundedTileBounds.maxTileY;
    const emitTileEntry = (tileX: number, tileY: number): void => {
      const tileIndex = tileY * tileColumns + tileX;
      const tileMinX = tileX * tileSizePx;
      const tileMinY = tileY * tileSizePx;
      const tileMaxX = Math.min(viewportWidth, tileMinX + tileSizePx);
      const tileMaxY = Math.min(viewportHeight, tileMinY + tileSizePx);
      const coverageWeight = compactSourceTileCoverageWeight({
        centerPx: splat.centerPx,
        densityParams,
        tileMinX,
        tileMinY,
        tileMaxX,
        tileMaxY,
        samplesPerAxis,
      });
      if (coverageWeight <= 0) {
        return;
      }
      const localSupportWeight = compactSourceTileLocalSupportWeight({
        centerPx: splat.centerPx,
        densityParams,
        tileMinX,
        tileMinY,
        tileMaxX,
        tileMaxY,
      });
      onEntry({ splat, tileIndex, tileX, tileY, coverageWeight, localSupportWeight });
    };
    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      const rowTileXs = selectedTileRows?.tileXsByRow.get(tileY);
      if (rowTileXs) {
        compactStreamSparseTileXRow(rowTileXs, minTileX, maxTileX, tileY, emitTileEntry);
      } else {
        compactStreamDenseTileXRange(minTileX, maxTileX, tileY, emitTileEntry);
      }
    }
  }
}

function compactStreamDenseTileXRange(
  minTileX: number,
  maxTileX: number,
  tileY: number,
  emitTileEntry: (tileX: number, tileY: number) => void,
): void {
  for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
    emitTileEntry(tileX, tileY);
  }
}

function compactStreamSparseTileXRow(
  tileXs: readonly number[],
  minTileX: number,
  maxTileX: number,
  tileY: number,
  emitTileEntry: (tileX: number, tileY: number) => void,
): void {
  for (const tileX of tileXs) {
    if (tileX < minTileX || tileX > maxTileX) {
      continue;
    }
    emitTileEntry(tileX, tileY);
  }
}

function compactSourceBoundedTileRefCount({
  tileBounds,
  centerPx,
  tileSizePx,
  maxTilesPerSplat,
}: {
  readonly tileBounds: {
    readonly minTileX: number;
    readonly minTileY: number;
    readonly maxTileX: number;
    readonly maxTileY: number;
  };
  readonly centerPx: readonly [number, number];
  readonly tileSizePx: number;
  readonly maxTilesPerSplat?: number | null;
}): number {
  const boundedTileBounds = compactSourceBoundedTileBounds({
    tileBounds,
    centerPx,
    tileSizePx,
    maxTilesPerSplat,
  });
  return (boundedTileBounds.maxTileX - boundedTileBounds.minTileX + 1) *
    (boundedTileBounds.maxTileY - boundedTileBounds.minTileY + 1);
}

function compactSourceBoundedTileBounds({
  tileBounds,
  centerPx,
  tileSizePx,
  maxTilesPerSplat,
}: {
  readonly tileBounds: {
    readonly minTileX: number;
    readonly minTileY: number;
    readonly maxTileX: number;
    readonly maxTileY: number;
  };
  readonly centerPx: readonly [number, number];
  readonly tileSizePx: number;
  readonly maxTilesPerSplat?: number | null;
}): typeof tileBounds {
  const tileLimit = Math.floor(Number(maxTilesPerSplat ?? 0));
  if (!Number.isFinite(tileLimit) || tileLimit <= 0) {
    return tileBounds;
  }
  const radiusTiles = Math.max(0, Math.floor((Math.sqrt(tileLimit) - 1) / 2));
  const centerTileX = compactClamp(Math.floor(centerPx[0] / tileSizePx), tileBounds.minTileX, tileBounds.maxTileX);
  const centerTileY = compactClamp(Math.floor(centerPx[1] / tileSizePx), tileBounds.minTileY, tileBounds.maxTileY);
  return {
    minTileX: Math.max(tileBounds.minTileX, centerTileX - radiusTiles),
    minTileY: Math.max(tileBounds.minTileY, centerTileY - radiusTiles),
    maxTileX: Math.min(tileBounds.maxTileX, centerTileX + radiusTiles),
    maxTileY: Math.min(tileBounds.maxTileY, centerTileY + radiusTiles),
  };
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
  densityParams,
  tileMinX,
  tileMinY,
  tileMaxX,
  tileMaxY,
  samplesPerAxis,
}: {
  readonly centerPx: readonly [number, number];
  readonly densityParams: CompactSourceCovarianceDensityParams;
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
      densitySum += compactSourceCovarianceDensity(x, y, centerPx, densityParams);
    }
  }
  return (densitySum / (samplesPerAxis * samplesPerAxis)) * width * height;
}

function compactSourceTileLocalSupportWeight({
  centerPx,
  densityParams,
  tileMinX,
  tileMinY,
  tileMaxX,
  tileMaxY,
}: {
  readonly centerPx: readonly [number, number];
  readonly densityParams: CompactSourceCovarianceDensityParams;
  readonly tileMinX: number;
  readonly tileMinY: number;
  readonly tileMaxX: number;
  readonly tileMaxY: number;
}): number {
  const closestX = compactClamp(centerPx[0], tileMinX, tileMaxX);
  const closestY = compactClamp(centerPx[1], tileMinY, tileMaxY);
  return compactSourceConicPixelWeightFromDensityParams(closestX, closestY, centerPx, densityParams);
}

interface CompactSourceCovarianceDensityParams {
  readonly invXx: number;
  readonly invXy: number;
  readonly invYy: number;
  readonly normalization: number;
}

function compactSourceCovarianceDensityParams(
  covariance: { readonly xx: number; readonly xy: number; readonly yy: number; readonly determinant: number },
): CompactSourceCovarianceDensityParams {
  return {
    invXx: covariance.yy / covariance.determinant,
    invXy: -covariance.xy / covariance.determinant,
    invYy: covariance.xx / covariance.determinant,
    normalization: 1 / (2 * Math.PI * Math.sqrt(covariance.determinant)),
  };
}

function compactSourceCovarianceDensity(
  x: number,
  y: number,
  centerPx: readonly [number, number],
  densityParams: CompactSourceCovarianceDensityParams,
): number {
  const dx = x - centerPx[0];
  const dy = y - centerPx[1];
  const mahalanobis2 =
    densityParams.invXx * dx * dx +
    2 * densityParams.invXy * dx * dy +
    densityParams.invYy * dy * dy;
  return densityParams.normalization * Math.exp(-0.5 * mahalanobis2);
}

function compactSourceConicPixelWeightFromDensityParams(
  x: number,
  y: number,
  centerPx: readonly [number, number],
  densityParams: CompactSourceCovarianceDensityParams,
): number {
  const dx = x - centerPx[0];
  const dy = y - centerPx[1];
  const mahalanobis2 =
    densityParams.invXx * dx * dx +
    2 * densityParams.invXy * dx * dy +
    densityParams.invYy * dy * dy;
  return Math.exp(-2 * Math.max(mahalanobis2, 0));
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
  const candidateSplatIndexes = new Uint32Array(coverage.splats.map((splat) => splat.splatIndex));
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
    candidateSplatIndexes,
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
}): Set<number> {
  const selectionBounds = compactSourceSelectedTileBounds(anchorTileIndexes, tileColumns, tileRows, tileSizePx);
  if (!selectionBounds) {
    return new Set();
  }
  const selected = new Set<number>();
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
    if (
      centerPx[0] + marginPx < selectionBounds.minX ||
      centerPx[0] - marginPx > selectionBounds.maxX ||
      centerPx[1] + marginPx < selectionBounds.minY ||
      centerPx[1] - marginPx > selectionBounds.maxY
    ) {
      continue;
    }
    selected.add(splatIndex);
  }
  return selected;
}

function compactSourceSelectedTileBounds(
  tileIndexes: ReadonlySet<number>,
  tileColumns: number,
  tileRows: number,
  tileSizePx: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const tileBounds = compactSourceSelectedTileGridBounds(tileIndexes, tileColumns, tileRows);
  if (!tileBounds) {
    return null;
  }
  return {
    minX: tileBounds.minTileX * tileSizePx,
    minY: tileBounds.minTileY * tileSizePx,
    maxX: compactClamp(tileBounds.maxTileX + 1, 0, tileColumns) * tileSizePx,
    maxY: compactClamp(tileBounds.maxTileY + 1, 0, tileRows) * tileSizePx,
  };
}

function compactSourceSelectedTileGridBounds(
  tileIndexes: ReadonlySet<number>,
  tileColumns: number,
  tileRows = Number.POSITIVE_INFINITY,
): { minTileX: number; minTileY: number; maxTileX: number; maxTileY: number } | null {
  let minTileX = Number.POSITIVE_INFINITY;
  let minTileY = Number.POSITIVE_INFINITY;
  let maxTileX = Number.NEGATIVE_INFINITY;
  let maxTileY = Number.NEGATIVE_INFINITY;
  for (const tileIndex of tileIndexes) {
    if (tileIndex < 0 || tileIndex >= tileColumns * tileRows) {
      continue;
    }
    const tileX = tileIndex % tileColumns;
    const tileY = Math.floor(tileIndex / tileColumns);
    minTileX = Math.min(minTileX, tileX);
    minTileY = Math.min(minTileY, tileY);
    maxTileX = Math.max(maxTileX, tileX);
    maxTileY = Math.max(maxTileY, tileY);
  }
  if (!Number.isFinite(minTileX) || !Number.isFinite(minTileY) || !Number.isFinite(maxTileX) || !Number.isFinite(maxTileY)) {
    return null;
  }
  return {
    minTileX: compactClamp(minTileX, 0, Math.max(0, tileColumns - 1)),
    minTileY: compactClamp(minTileY, 0, Math.max(0, tileRows - 1)),
    maxTileX: compactClamp(maxTileX, 0, Math.max(0, tileColumns - 1)),
    maxTileY: compactClamp(maxTileY, 0, Math.max(0, tileRows - 1)),
  };
}

function compactSourceSelectedTileRows(
  tileIndexes: ReadonlySet<number>,
  tileColumns: number,
): {
  readonly minTileX: number;
  readonly minTileY: number;
  readonly maxTileX: number;
  readonly maxTileY: number;
  readonly tileXsByRow: ReadonlyMap<number, readonly number[]>;
} | null {
  const bounds = compactSourceSelectedTileGridBounds(tileIndexes, tileColumns);
  if (!bounds) {
    return null;
  }
  const tileXsByRow = new Map<number, number[]>();
  for (const tileIndex of tileIndexes) {
    const tileX = tileIndex % tileColumns;
    const tileY = Math.floor(tileIndex / tileColumns);
    const row = tileXsByRow.get(tileY);
    if (row) {
      row.push(tileX);
    } else {
      tileXsByRow.set(tileY, [tileX]);
    }
  }
  for (const row of tileXsByRow.values()) {
    row.sort((left, right) => left - right);
  }
  return { ...bounds, tileXsByRow };
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
  const selectedTileBounds = onlyTileIndexes &&
      tileSizePx !== undefined &&
      tileColumns !== undefined &&
      tileRows !== undefined
    ? compactSourceSelectedTileBounds(onlyTileIndexes, tileColumns, tileRows, tileSizePx)
    : null;
  if (onlyTileIndexes && !selectedTileBounds) {
    return splats;
  }
  for (let cursor = 0; cursor < splatIndexCount; cursor += 1) {
    const index = splatIndexes?.[cursor] ?? cursor;
    const centerPx = projectCompactSourceSplatCenterPx(attributes, viewProj, index, viewportWidth, viewportHeight);
    if (!centerPx) {
      continue;
    }
    if (
      onlyTileIndexes &&
      selectedTileBounds &&
      !compactSourceProjectedCenterMayReachTileBounds({
        attributes,
        viewProj,
        index,
        centerPx,
        viewportWidth,
        viewportHeight,
        splatScale,
        minRadiusPx,
        selectedTileBounds,
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

function compactSourceProjectedCenterMayReachTileBounds({
  attributes,
  viewProj,
  index,
  centerPx,
  viewportWidth,
  viewportHeight,
  splatScale,
  minRadiusPx,
  selectedTileBounds,
}: {
  readonly attributes: SplatAttributes;
  readonly viewProj: Float32Array;
  readonly index: number;
  readonly centerPx: readonly [number, number];
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly splatScale: number;
  readonly minRadiusPx: number;
  readonly selectedTileBounds: { minX: number; minY: number; maxX: number; maxY: number };
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
  return !(
    centerPx[0] + marginPx < selectedTileBounds.minX ||
    centerPx[0] - marginPx > selectedTileBounds.maxX ||
    centerPx[1] + marginPx < selectedTileBounds.minY ||
    centerPx[1] - marginPx > selectedTileBounds.maxY
  );
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
  readonly entry: RuntimeCompactTileCoverage["tileEntries"][number] & { readonly localSupportWeight?: number };
  readonly projectedIndex: number;
  readonly splatsByIndex: ReadonlyMap<number, RuntimeCompactTileCoverage["splats"][number]>;
  readonly ranks: ArrayLike<number>;
  readonly depths: ArrayLike<number>;
  readonly attributes: SplatAttributes;
  readonly effectiveOpacities: Float32Array;
}): GpuTileContributorArenaProjectedContributor {
  const splat = splatsByIndex.get(entry.splatIndex);
  const inverseConic = invertCompactSourceCovariance(splat?.covariancePx);
  const opacity = readCompactSourceOpacity(attributes, effectiveOpacities, entry.splatIndex);
  const coverageWeight = Math.max(0, finiteOrZero(entry.coverageWeight));
  const localSupportWeight = Math.max(0, finiteOrZero(entry.localSupportWeight));
  const retentionSupportWeight = Math.max(coverageWeight, localSupportWeight);
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
    retentionWeight: retentionSupportWeight * opacity * luminance,
    occlusionWeight: retentionSupportWeight * opacity,
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
    if (typeof canonicalTileIndex === "number" && Number.isInteger(canonicalTileIndex) && canonicalTileIndex >= 0) {
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
  const overflowReasons: Array<TileLocalPrepassBudgetDiagnostics["overflowReasons"][number]> = [];
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
  const sourceDepthEvidence = compactSourceBackToFrontDepthEvidence(attributes, viewMatrix);
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
    tileRefData: legacyProjection?.tileRefs ?? bridge.tileRefs,
    tileCoverageWeightBuffer: bridgeBuffers.tileCoverageWeightBuffer,
    tileCoverageWeightData: legacyProjection?.tileCoverageWeights ?? bridge.tileCoverageWeights,
    tileBuildCountBuffer,
    tileScatterCursorBuffer,
    alphaParamBuffer,
    alphaParamData,
    sourceViewDepths: sourceDepthEvidence.depths,
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
    presentationScope: TILE_LOCAL_PRESENTATION_SCOPE,
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
    disposed: false,
  };
}

function roundRuntimeMetric(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
}

function enqueueTileLocalOutputTextureReadback(
  device: GPUDevice,
  encoder: GPUCommandEncoder,
  state: TileLocalSceneState,
  frameId: number
): void {
  const anchors = state.traceAnchors ?? [];
  if (state.debugMode !== "final-color" || anchors.length === 0) {
    return;
  }
  if (state.pendingOutputTextureReadback || state.outputTextureReadback?.frameId === frameId) {
    return;
  }
  const bytesPerPixel = 8;
  const bytesPerRow = alignTo(state.viewportWidth * bytesPerPixel, 256);
  const buffer = device.createBuffer({
    label: "tile_local_output_texture_anchor_readback",
    size: Math.max(16, bytesPerRow * state.viewportHeight),
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  encoder.copyTextureToBuffer(
    { texture: state.outputTexture },
    { buffer, bytesPerRow, rowsPerImage: state.viewportHeight },
    { width: state.viewportWidth, height: state.viewportHeight, depthOrArrayLayers: 1 },
  );
  state.pendingOutputTextureReadback = {
    frameId,
    width: state.viewportWidth,
    height: state.viewportHeight,
    bytesPerRow,
    buffer,
    anchors,
  };
  state.outputTextureReadback = {
    status: "pending",
    format: "rgba16float",
    frameId,
    width: state.viewportWidth,
    height: state.viewportHeight,
    anchors: [],
  };
}

function resolveTileLocalOutputTextureReadback(state: TileLocalSceneState): void {
  const pending = state.pendingOutputTextureReadback;
  if (!pending) {
    return;
  }
  state.pendingOutputTextureReadback = undefined;
  void pending.buffer.mapAsync(GPUMapMode.READ)
    .then(() => {
      const view = new DataView(pending.buffer.getMappedRange());
      state.outputTextureReadback = {
        status: "present",
        format: "rgba16float",
        frameId: pending.frameId,
        width: pending.width,
        height: pending.height,
        anchors: pending.anchors.map((anchor) => readOutputTextureAnchor(view, pending, anchor)),
      };
      publishTileLocalOutputTextureReadback(state.outputTextureReadback);
      pending.buffer.unmap();
      pending.buffer.destroy();
    })
    .catch((error) => {
      state.outputTextureReadback = {
        status: "blocked",
        format: "rgba16float",
        frameId: pending.frameId,
        width: pending.width,
        height: pending.height,
        anchors: [],
        blockedReason: errorMessage(error),
      };
      publishTileLocalOutputTextureReadback(state.outputTextureReadback);
      pending.buffer.destroy();
    });
}

function publishTileLocalOutputTextureReadback(readback: TileLocalOutputTextureReadback): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: Record<string, unknown>;
    __MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__?: TileLocalDiagnosticSummary;
  };
  const smoke = runtimeWindow.__MESH_SPLAT_SMOKE__;
  if (!smoke || typeof smoke !== "object") {
    return;
  }
  const tileLocal = smoke.tileLocal && typeof smoke.tileLocal === "object"
    ? smoke.tileLocal as Record<string, unknown>
    : {};
  smoke.tileLocal = {
    ...tileLocal,
    outputTextureReadback: readback,
  };
}

function enqueueTileLocalCompositorInputReadback(
  device: GPUDevice,
  encoder: GPUCommandEncoder,
  state: TileLocalSceneState,
  frameId: number,
  sourceColors: Float32Array
): void {
  if (state.arenaBackend !== "gpu") {
    state.pendingCompositorInputReadback = undefined;
    return;
  }
  const anchors = state.traceAnchors ?? [];
  if (state.debugMode !== "final-color" || anchors.length === 0) {
    return;
  }
  if (state.pendingCompositorInputReadback || state.compositorInputReadback?.frameId === frameId) {
    return;
  }

  const tileHeaderBuffer = createReadbackBuffer(device, state.plan.tileHeaderBytes, "tile_local_compositor_tile_headers_readback");
  const tileRefBuffer = createReadbackBuffer(device, state.plan.tileRefBytes, "tile_local_compositor_tile_refs_readback");
  const tileCoverageWeightBuffer = createReadbackBuffer(device, state.plan.tileCoverageWeightBytes, "tile_local_compositor_tile_weights_readback");
  const alphaParamBuffer = createReadbackBuffer(device, state.plan.alphaParamBytes, "tile_local_compositor_alpha_params_readback");
  const scatterCursorBytes = Math.max(16, state.plan.tileCount * Uint32Array.BYTES_PER_ELEMENT);
  const tileScatterCursorBuffer = createReadbackBuffer(device, scatterCursorBytes, "tile_local_compositor_scatter_cursors_readback");

  encoder.copyBufferToBuffer(state.tileHeaderBuffer, 0, tileHeaderBuffer, 0, state.plan.tileHeaderBytes);
  encoder.copyBufferToBuffer(state.tileRefBuffer, 0, tileRefBuffer, 0, state.plan.tileRefBytes);
  encoder.copyBufferToBuffer(state.tileCoverageWeightBuffer, 0, tileCoverageWeightBuffer, 0, state.plan.tileCoverageWeightBytes);
  encoder.copyBufferToBuffer(state.alphaParamBuffer, 0, alphaParamBuffer, 0, state.plan.alphaParamBytes);
  encoder.copyBufferToBuffer(tileLocalRefStatsReadbackSourceBuffer(state), 0, tileScatterCursorBuffer, 0, scatterCursorBytes);

  state.pendingCompositorInputReadback = {
    frameId,
    plan: state.plan,
    sourceColors,
    sourceViewDepths: state.sourceViewDepths,
    anchors,
    tileHeaderBuffer,
    tileRefBuffer,
    tileCoverageWeightBuffer,
    alphaParamBuffer,
    tileScatterCursorBuffer,
    cancelled: false,
  };
  state.compositorInputReadback = {
    status: "pending",
    source: "gpu-buffer-readback",
    frameId,
    anchors: [],
  };
}

function resolveTileLocalCompositorInputReadback(state: TileLocalSceneState): void {
  const pending = state.pendingCompositorInputReadback;
  if (!pending) {
    return;
  }
  state.pendingCompositorInputReadback = undefined;
  const buffers = [
    pending.tileHeaderBuffer,
    pending.tileRefBuffer,
    pending.tileCoverageWeightBuffer,
    pending.alphaParamBuffer,
    pending.tileScatterCursorBuffer,
  ];
  if (state.arenaBackend !== "gpu") {
    destroyReadbackBuffers(buffers);
    return;
  }
  void Promise.all(buffers.map((buffer) => buffer.mapAsync(GPUMapMode.READ)))
    .then(() => {
      const tileHeaders = new Uint32Array(pending.tileHeaderBuffer.getMappedRange());
      const tileRefs = new Uint32Array(pending.tileRefBuffer.getMappedRange());
      const tileCoverageWeights = new Float32Array(pending.tileCoverageWeightBuffer.getMappedRange());
      const alphaParams = new Float32Array(pending.alphaParamBuffer.getMappedRange());
      const tileScatterCursors = new Uint32Array(pending.tileScatterCursorBuffer.getMappedRange());
      const refStatsReadback = summarizeTileLocalRefStatsReadback(
        {
          frameId: pending.frameId,
          tileCount: pending.plan.tileCount,
          tileCapacity: gpuLiveEffectiveRefsPerTile(pending.plan),
          allocatedRefs: pending.plan.maxTileRefs,
        },
        tileScatterCursors
      );
      const compositorInputReadback: TileLocalCompositorInputReadback = {
        status: "present",
        source: "gpu-buffer-readback",
        frameId: pending.frameId,
        anchors: pending.anchors.map((anchor) => readCompositorInputAnchor({
          anchor,
          plan: pending.plan,
          sourceColors: pending.sourceColors,
          sourceViewDepths: pending.sourceViewDepths,
          tileHeaders,
          tileRefs,
          tileCoverageWeights,
          alphaParams,
          tileScatterCursors,
        })),
      };
      if (tileLocalCompositorInputReadbackCanPublish(state, pending)) {
        state.refStatsReadback = refStatsReadback;
        state.compositorInputReadback = compositorInputReadback;
        publishTileLocalRefStatsReadback(state, refStatsReadback);
        publishTileLocalCompositorInputReadback(compositorInputReadback);
      }
      destroyMappedReadbackBuffers(buffers);
    })
    .catch((error) => {
      const compositorInputReadback: TileLocalCompositorInputReadback = {
        status: "blocked",
        source: "gpu-buffer-readback",
        frameId: pending.frameId,
        anchors: [],
        blockedReason: errorMessage(error),
      };
      if (tileLocalCompositorInputReadbackCanPublish(state, pending)) {
        state.compositorInputReadback = compositorInputReadback;
        publishTileLocalCompositorInputReadback(compositorInputReadback);
      }
      destroyReadbackBuffers(buffers);
    });
}

function tileLocalCompositorInputReadbackCanPublish(
  state: TileLocalSceneState,
  pending: PendingTileLocalCompositorInputReadback
): boolean {
  return (
    !state.disposed &&
    !pending.cancelled &&
    pending.frameId === state.lastCompositedFrame
  );
}

function publishTileLocalCompositorInputReadback(readback: TileLocalCompositorInputReadback): void {
  const runtimeWindow = window as unknown as { __MESH_SPLAT_SMOKE__?: Record<string, unknown> };
  const smoke = runtimeWindow.__MESH_SPLAT_SMOKE__;
  if (!smoke || typeof smoke !== "object") {
    return;
  }
  const tileLocal = smoke.tileLocal && typeof smoke.tileLocal === "object"
    ? smoke.tileLocal as Record<string, unknown>
    : {};
  smoke.tileLocal = {
    ...tileLocal,
    compositorInputReadback: readback,
  };
}

function ensureCpuReferenceCompositorInputReadback(
  state: TileLocalSceneState,
  sourceColors: Float32Array,
  frameId: number,
  anchors: readonly PixelTraceAnchor[],
): TileLocalCompositorInputReadback | undefined {
  if (
    state.debugMode !== "final-color" ||
    state.arenaBackend !== "cpu" ||
    anchors.length === 0 ||
    !state.tileRefData
  ) {
    return state.compositorInputReadback;
  }
  if (
    state.compositorInputReadback?.source === "cpu-reference-diagnostic-state" &&
    state.compositorInputReadback.frameId === frameId
  ) {
    return state.compositorInputReadback;
  }

  const tileScatterCursors = new Uint32Array(Math.max(0, state.plan.tileCount));
  const headerStride = GPU_TILE_COVERAGE_TILE_HEADER_BYTES / Uint32Array.BYTES_PER_ELEMENT;
  for (let tileIndex = 0; tileIndex < state.plan.tileCount; tileIndex += 1) {
    const headerBase = tileIndex * headerStride;
    tileScatterCursors[tileIndex] = state.tileHeaderData[headerBase + 2] ??
      state.tileHeaderData[headerBase + 1] ??
      0;
  }

  state.compositorInputReadback = {
    status: "present",
    source: "cpu-reference-diagnostic-state",
    frameId,
    anchors: anchors.map((anchor) => readCompositorInputAnchor({
      anchor,
      plan: state.plan,
      sourceColors,
      sourceViewDepths: state.sourceViewDepths,
      tileHeaders: state.tileHeaderData,
      tileRefs: state.tileRefData!,
      tileCoverageWeights: state.tileCoverageWeightData,
      alphaParams: state.alphaParamData,
      tileScatterCursors,
    })),
  };
  return state.compositorInputReadback;
}

function enqueueTileLocalRefStatsReadback(
  device: GPUDevice,
  encoder: GPUCommandEncoder,
  state: TileLocalSceneState,
  frameId: number
): void {
  if (frameId < 0 || state.disposed) {
    return;
  }
  if (state.debugMode !== "final-color") {
    return;
  }
  if (state.arenaBackend !== "gpu" || state.gpuArenaRuntime) {
    return;
  }
  if (state.pendingRefStatsReadback || state.refStatsReadback?.frameId === frameId) {
    return;
  }
  const tileCapacity = state.gpuArenaRuntime
    ? TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE
    : gpuLiveEffectiveRefsPerTile(state.plan);
  const scatterCursorBytes = Math.max(16, state.plan.tileCount * Uint32Array.BYTES_PER_ELEMENT);
  const buffer = createReadbackBuffer(device, scatterCursorBytes, "tile_local_live_ref_stats_scatter_cursors_readback");
  encoder.copyBufferToBuffer(tileLocalRefStatsReadbackSourceBuffer(state), 0, buffer, 0, scatterCursorBytes);
  state.pendingRefStatsReadback = {
    frameId,
    tileCount: state.plan.tileCount,
    tileCapacity,
    allocatedRefs: state.plan.maxTileRefs,
    buffer,
    mapStarted: false,
    cancelled: false,
  };
  state.refStatsReadback = {
    status: "pending",
    source: "gpu-scatter-cursor-readback",
    frameId,
    tileCount: state.plan.tileCount,
    tileCapacity,
    allocatedRefs: state.plan.maxTileRefs,
    projectedScatterRefs: 0,
    retainedRefs: 0,
    droppedRefs: 0,
    nonEmptyTiles: 0,
    saturatedTiles: 0,
    maxRefsPerTile: 0,
  };
}

function resolveTileLocalRefStatsReadback(state: TileLocalSceneState): void {
  const pending = state.pendingRefStatsReadback;
  if (!pending) {
    return;
  }
  if (pending.mapStarted) {
    return;
  }
  pending.mapStarted = true;
  state.pendingRefStatsReadback = undefined;
  void pending.buffer.mapAsync(GPUMapMode.READ)
    .then(() => {
      const scatterCursors = new Uint32Array(pending.buffer.getMappedRange());
      const readback = summarizeTileLocalRefStatsReadback(pending, scatterCursors);
      if (tileLocalRefStatsReadbackCanPublish(state, pending)) {
        state.refStatsReadback = readback;
        publishTileLocalRefStatsReadback(state, readback);
      }
      pending.buffer.unmap();
      pending.buffer.destroy();
    })
    .catch((error) => {
      const readback: TileLocalRefStatsReadback = {
        status: "blocked",
        source: "gpu-scatter-cursor-readback",
        frameId: pending.frameId,
        tileCount: pending.tileCount,
        tileCapacity: pending.tileCapacity,
        allocatedRefs: pending.allocatedRefs,
        projectedScatterRefs: 0,
        retainedRefs: 0,
        droppedRefs: 0,
        nonEmptyTiles: 0,
        saturatedTiles: 0,
        maxRefsPerTile: 0,
        blockedReason: errorMessage(error),
      };
      if (tileLocalRefStatsReadbackCanPublish(state, pending)) {
        state.refStatsReadback = readback;
        publishTileLocalRefStatsReadback(state, readback);
      }
      pending.buffer.destroy();
    });
}

function tileLocalRefStatsReadbackSourceBuffer(state: TileLocalSceneState): GPUBuffer {
  return state.gpuArenaRuntime?.buffers.scatterCursorBuffer ?? state.tileScatterCursorBuffer;
}

function tileLocalRefStatsReadbackCanPublish(
  state: TileLocalSceneState,
  pending: PendingTileLocalRefStatsReadback
): boolean {
  return (
    !state.disposed &&
    !pending.cancelled &&
    pending.frameId === state.lastCompositedFrame
  );
}

function summarizeTileLocalRefStatsReadback(
  pending: {
    readonly frameId: number;
    readonly tileCount: number;
    readonly tileCapacity: number;
    readonly allocatedRefs: number;
  },
  scatterCursors: Uint32Array
): TileLocalRefStatsReadback {
  let projectedScatterRefs = 0;
  let retainedRefs = 0;
  let droppedRefs = 0;
  let nonEmptyTiles = 0;
  let saturatedTiles = 0;
  let maxRefsPerTile = 0;
  for (let tileIndex = 0; tileIndex < pending.tileCount; tileIndex += 1) {
    const projectedRefs = scatterCursors[tileIndex] ?? 0;
    const tileRetainedRefs = Math.min(projectedRefs, pending.tileCapacity);
    projectedScatterRefs += projectedRefs;
    retainedRefs += tileRetainedRefs;
    droppedRefs += Math.max(0, projectedRefs - pending.tileCapacity);
    maxRefsPerTile = Math.max(maxRefsPerTile, tileRetainedRefs);
    if (projectedRefs > 0) {
      nonEmptyTiles += 1;
    }
    if (projectedRefs >= pending.tileCapacity) {
      saturatedTiles += 1;
    }
  }
  return {
    status: "present",
    source: "gpu-scatter-cursor-readback",
    frameId: pending.frameId,
    tileCount: pending.tileCount,
    tileCapacity: pending.tileCapacity,
    allocatedRefs: pending.allocatedRefs,
    projectedScatterRefs,
    retainedRefs,
    droppedRefs,
    nonEmptyTiles,
    saturatedTiles,
    maxRefsPerTile,
  };
}

function publishTileLocalRefStatsReadback(
  state: TileLocalSceneState,
  readback: TileLocalRefStatsReadback
): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: Record<string, unknown>;
    __MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__?: TileLocalDiagnosticSummary;
  };
  const smoke = runtimeWindow.__MESH_SPLAT_SMOKE__;
  if (!smoke || typeof smoke !== "object") {
    return;
  }
  const tileLocal = smoke.tileLocal && typeof smoke.tileLocal === "object"
    ? smoke.tileLocal as Record<string, unknown>
    : {};
  const diagnostics = refreshTileLocalDiagnostics(state);
  const refAccounting = tileLocalRefAccounting(state, diagnostics, readback);
  smoke.tileLocal = {
    ...tileLocal,
    refs: refAccounting.retainedRefs,
    allocatedRefs: refAccounting.allocatedRefs,
    refAccounting,
    refStatsReadback: readback,
    diagnostics,
  };
  runtimeWindow.__MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__ = diagnostics;
}

function enqueueWgslProjectedRefStreamReadback(
  device: GPUDevice,
  encoder: GPUCommandEncoder,
  state: TileLocalSceneState,
  frameId: number
): void {
  const stream = state.wgslProjectedRefStream;
  if (!stream || frameId < 0 || state.disposed || state.debugMode !== "final-color") {
    return;
  }
  if (stream.pendingReadback || stream.readback?.frameId === frameId) {
    return;
  }
  const tileHeaderBuffer = createReadbackBuffer(
    device,
    stream.plan.tileHeaderBytes,
    "wgsl_projected_ref_stream_tile_headers_readback"
  );
  const scatterCursorBytes = Math.max(16, stream.plan.tileCount * Uint32Array.BYTES_PER_ELEMENT);
  const tileScatterCursorBuffer = createReadbackBuffer(
    device,
    scatterCursorBytes,
    "wgsl_projected_ref_stream_scatter_cursors_readback"
  );
  encoder.copyBufferToBuffer(stream.tileHeaderBuffer, 0, tileHeaderBuffer, 0, stream.plan.tileHeaderBytes);
  encoder.copyBufferToBuffer(stream.tileScatterCursorBuffer, 0, tileScatterCursorBuffer, 0, scatterCursorBytes);
  stream.pendingReadback = {
    frameId,
    stream,
    tileHeaderBuffer,
    tileScatterCursorBuffer,
    mapStarted: false,
    cancelled: false,
  };
  stream.readback = {
    status: "pending",
    source: "wgsl-projected-ref-stream-readback",
    frameId,
    tileCount: stream.plan.tileCount,
    tileCapacity: gpuLiveEffectiveRefsPerTile(stream.plan),
    allocatedProjectedRefs: stream.plan.maxTileRefs,
    compactSourceProjectedRefs: stream.compactSourceProjectedRefs,
    compactSourceRetainedRefs: stream.compactSourceRetainedRefs,
    sourceSplatCount: stream.plan.sourceSplatCount,
    maxTilesPerSplat: stream.plan.maxTilesPerSplat ?? null,
    projectedScatterRefs: 0,
    retainedRefs: 0,
    droppedRefs: 0,
    projectedRefDelta: -stream.compactSourceProjectedRefs,
    nonEmptyTiles: 0,
    saturatedTiles: 0,
    maxRefsPerTile: 0,
    headerRetainedRefs: 0,
    headerProjectedRefs: 0,
    headerCountClass: "headers-empty",
    comparisonClass: classifyWgslProjectedRefStreamComparison(0, stream.compactSourceProjectedRefs, stream),
  };
  refreshWgslProjectedRefStreamEvidence(state);
}

function resolveWgslProjectedRefStreamReadback(state: TileLocalSceneState): void {
  const stream = state.wgslProjectedRefStream;
  const pending = stream?.pendingReadback;
  if (!stream || !pending || pending.mapStarted) {
    return;
  }
  pending.mapStarted = true;
  stream.pendingReadback = undefined;
  const buffers = [pending.tileHeaderBuffer, pending.tileScatterCursorBuffer];
  void Promise.all(buffers.map((buffer) => buffer.mapAsync(GPUMapMode.READ)))
    .then(() => {
      const tileHeaders = new Uint32Array(pending.tileHeaderBuffer.getMappedRange());
      const scatterCursors = new Uint32Array(pending.tileScatterCursorBuffer.getMappedRange());
      const readback = summarizeWgslProjectedRefStreamReadback(pending.stream, pending.frameId, tileHeaders, scatterCursors);
      if (wgslProjectedRefStreamReadbackCanPublish(state, pending)) {
        pending.stream.readback = readback;
        refreshWgslProjectedRefStreamEvidence(state);
        publishWgslProjectedRefStreamReadback(state, readback);
      }
      destroyMappedReadbackBuffers(buffers);
    })
    .catch((error) => {
      const readback: WgslProjectedRefStreamReadback = {
        status: "blocked",
        source: "wgsl-projected-ref-stream-readback",
        frameId: pending.frameId,
        tileCount: pending.stream.plan.tileCount,
        tileCapacity: gpuLiveEffectiveRefsPerTile(pending.stream.plan),
        allocatedProjectedRefs: pending.stream.plan.maxTileRefs,
        compactSourceProjectedRefs: pending.stream.compactSourceProjectedRefs,
        compactSourceRetainedRefs: pending.stream.compactSourceRetainedRefs,
        sourceSplatCount: pending.stream.plan.sourceSplatCount,
        maxTilesPerSplat: pending.stream.plan.maxTilesPerSplat ?? null,
        projectedScatterRefs: 0,
        retainedRefs: 0,
        droppedRefs: 0,
        projectedRefDelta: -pending.stream.compactSourceProjectedRefs,
        nonEmptyTiles: 0,
        saturatedTiles: 0,
        maxRefsPerTile: 0,
        headerRetainedRefs: 0,
        headerProjectedRefs: 0,
        headerCountClass: "headers-empty",
        comparisonClass: classifyWgslProjectedRefStreamComparison(0, pending.stream.compactSourceProjectedRefs, pending.stream),
        blockedReason: errorMessage(error),
      };
      if (wgslProjectedRefStreamReadbackCanPublish(state, pending)) {
        pending.stream.readback = readback;
        refreshWgslProjectedRefStreamEvidence(state);
        publishWgslProjectedRefStreamReadback(state, readback);
      }
      destroyReadbackBuffers(buffers);
    });
}

function summarizeWgslProjectedRefStreamReadback(
  stream: WgslProjectedRefStreamState,
  frameId: number,
  tileHeaders: Uint32Array,
  scatterCursors: Uint32Array,
): WgslProjectedRefStreamReadback {
  const tileCapacity = gpuLiveEffectiveRefsPerTile(stream.plan);
  let projectedScatterRefs = 0;
  let retainedRefs = 0;
  let droppedRefs = 0;
  let nonEmptyTiles = 0;
  let saturatedTiles = 0;
  let maxRefsPerTile = 0;
  let headerRetainedRefs = 0;
  let headerProjectedRefs = 0;
  const headerStride = GPU_TILE_COVERAGE_TILE_HEADER_BYTES / Uint32Array.BYTES_PER_ELEMENT;
  for (let tileIndex = 0; tileIndex < stream.plan.tileCount; tileIndex += 1) {
    const projectedRefs = scatterCursors[tileIndex] ?? 0;
    const tileRetainedRefs = Math.min(projectedRefs, tileCapacity);
    projectedScatterRefs += projectedRefs;
    retainedRefs += tileRetainedRefs;
    droppedRefs += Math.max(0, projectedRefs - tileCapacity);
    maxRefsPerTile = Math.max(maxRefsPerTile, tileRetainedRefs);
    if (projectedRefs > 0) {
      nonEmptyTiles += 1;
    }
    if (projectedRefs >= tileCapacity) {
      saturatedTiles += 1;
    }
    const headerBase = tileIndex * headerStride;
    headerRetainedRefs += tileHeaders[headerBase + 1] ?? 0;
    headerProjectedRefs += tileHeaders[headerBase + 2] ?? 0;
  }
  const projectedRefDelta = projectedScatterRefs - stream.compactSourceProjectedRefs;
  return {
    status: "present",
    source: "wgsl-projected-ref-stream-readback",
    frameId,
    tileCount: stream.plan.tileCount,
    tileCapacity,
    allocatedProjectedRefs: stream.plan.maxTileRefs,
    compactSourceProjectedRefs: stream.compactSourceProjectedRefs,
    compactSourceRetainedRefs: stream.compactSourceRetainedRefs,
    sourceSplatCount: stream.plan.sourceSplatCount,
    maxTilesPerSplat: stream.plan.maxTilesPerSplat ?? null,
    projectedScatterRefs,
    retainedRefs,
    droppedRefs,
    projectedRefDelta,
    nonEmptyTiles,
    saturatedTiles,
    maxRefsPerTile,
    headerRetainedRefs,
    headerProjectedRefs,
    headerCountClass: headerRetainedRefs > 0 || headerProjectedRefs > 0
      ? "headers-populated"
      : projectedScatterRefs > 0
        ? "headers-clear-only"
        : "headers-empty",
    comparisonClass: classifyWgslProjectedRefStreamComparison(projectedScatterRefs, stream.compactSourceProjectedRefs, stream),
  };
}

function wgslProjectedRefStreamReadbackCanPublish(
  state: TileLocalSceneState,
  pending: PendingWgslProjectedRefStreamReadback
): boolean {
  return (
    !state.disposed &&
    !pending.cancelled &&
    pending.frameId === state.lastCompositedFrame &&
    state.wgslProjectedRefStream === pending.stream
  );
}

function publishWgslProjectedRefStreamReadback(
  state: TileLocalSceneState,
  readback: WgslProjectedRefStreamReadback
): void {
  const runtimeWindow = window as unknown as { __MESH_SPLAT_SMOKE__?: Record<string, unknown> };
  const smoke = runtimeWindow.__MESH_SPLAT_SMOKE__;
  if (!smoke || typeof smoke !== "object") {
    return;
  }
  const tileLocal = smoke.tileLocal && typeof smoke.tileLocal === "object"
    ? smoke.tileLocal as Record<string, unknown>
    : {};
  smoke.tileLocal = {
    ...tileLocal,
    wgslProjectedRefStream: state.wgslProjectedRefStreamEvidence,
    wgslProjectedRefStreamReadback: readback,
  };
}

function sameFramePublishedTileLocalRefStatsReadback(
  smoke: Record<string, unknown> | undefined,
  frameId: number
): TileLocalRefStatsReadback | undefined {
  if (!smoke || typeof smoke !== "object" || frameId < 0) {
    return undefined;
  }
  const tileLocal = smoke.tileLocal && typeof smoke.tileLocal === "object"
    ? smoke.tileLocal as Record<string, unknown>
    : undefined;
  const readback = tileLocal?.refStatsReadback && typeof tileLocal.refStatsReadback === "object"
    ? tileLocal.refStatsReadback as Partial<TileLocalRefStatsReadback>
    : undefined;
  if (
    readback?.source === "gpu-scatter-cursor-readback" &&
    readback.status === "present" &&
    readback.frameId === frameId
  ) {
    return readback as TileLocalRefStatsReadback;
  }
  return undefined;
}

function readCompositorInputAnchor({
  anchor,
  plan,
  sourceColors,
  sourceViewDepths,
  tileHeaders,
  tileRefs,
  tileCoverageWeights,
  alphaParams,
  tileScatterCursors,
}: {
  readonly anchor: PixelTraceAnchor;
  readonly plan: GpuTileCoveragePlan;
  readonly sourceColors: Float32Array;
  readonly sourceViewDepths: Float32Array;
  readonly tileHeaders: Uint32Array;
  readonly tileRefs: Uint32Array;
  readonly tileCoverageWeights: Float32Array;
  readonly alphaParams: Float32Array;
  readonly tileScatterCursors: Uint32Array;
}): TileLocalCompositorInputReadback["anchors"][number] {
  const tileAddress = tileAddressForPixel(anchor, plan);
  const headerBase = tileAddress.tileIndex * (GPU_TILE_COVERAGE_TILE_HEADER_BYTES / Uint32Array.BYTES_PER_ELEMENT);
  const firstRefIndex = tileHeaders[headerBase] ?? 0;
  const refCount = tileHeaders[headerBase + 1] ?? 0;
  const projectedCount = tileHeaders[headerBase + 2] ?? refCount;
  const droppedCount = tileHeaders[headerBase + 3] ?? Math.max(0, projectedCount - refCount);
  const gpuScatterCount = tileScatterCursors[tileAddress.tileIndex] ?? 0;
  const tileCapacity = Math.max(Math.floor(plan.maxTileRefs / Math.max(plan.tileCount, 1)), 1);
  const liveRefCount = refCount > 0 ? refCount : Math.min(gpuScatterCount, tileCapacity);
  const refLimit = Math.min(liveRefCount, Math.max(0, plan.maxTileRefs - firstRefIndex));
  const pixelCenter = [Math.floor(anchor.x) + 0.5, Math.floor(anchor.y) + 0.5] as const;
  let runningColor = [0.02, 0.02, 0.04] as [number, number, number];
  let remainingTransmission = 1;
  const contributors: Array<TileLocalCompositorInputReadback["anchors"][number]["contributors"][number]> = [];

  for (let layer = 0; layer < refLimit; layer += 1) {
    const refIndex = firstRefIndex + layer;
    if (refIndex >= plan.maxTileRefs) {
      break;
    }
    const tileRefBase = refIndex * (GPU_TILE_COVERAGE_TILE_REF_BYTES / Uint32Array.BYTES_PER_ELEMENT);
    const splatIndex = tileRefs[tileRefBase] ?? plan.splatCount;
    const originalId = tileRefs[tileRefBase + 1] ?? splatIndex;
    const tileIndex = tileRefs[tileRefBase + 2] ?? tileAddress.tileIndex;
    const alphaParamIndex = Math.min(tileRefs[tileRefBase + 3] ?? refIndex, plan.maxTileRefs - 1);
    const alphaParam = readVec4(alphaParams, alphaParamIndex);
    const viewRank = Number.isFinite(alphaParam[3]) ? Math.trunc(alphaParam[3]) : -1;
    const viewDepth = sourceViewDepths[splatIndex] ?? 0;
    if (splatIndex >= plan.splatCount) {
      contributors.push({
        layer,
        refIndex,
        splatIndex,
        originalId,
        tileIndex,
        viewRank,
        viewDepth: roundColorChannel(viewDepth),
        alphaParamIndex,
        centerPx: [0, 0],
        inverseConic: [0, 0, 0],
        coverageWeight: 0,
        tileCoverageWeight: 0,
        pixelCoverageWeight: 0,
        sourceOpacity: 0,
        coverageAlpha: 0,
        transmittanceBefore: roundColorChannel(remainingTransmission),
        transmittanceAfter: roundColorChannel(remainingTransmission),
        sourceColor: [0, 0, 0],
        runningColor: runningColor.map(roundColorChannel) as [number, number, number],
        remainingTransmission: roundColorChannel(remainingTransmission),
        status: "skipped-invalid-splat",
      });
      continue;
    }
    const tileCoverageWeight = Math.max(tileCoverageWeights[refIndex] ?? 0, 0);
    if (tileCoverageWeight <= 0) {
      const conicParam = readVec4(alphaParams, alphaParamIndex + plan.maxTileRefs);
      const sourceOpacity = Math.min(clamp01(alphaParam[0]), 0.999);
      contributors.push({
        layer,
        refIndex,
        splatIndex,
        originalId,
        tileIndex,
        viewRank,
        viewDepth: roundColorChannel(viewDepth),
        alphaParamIndex,
        centerPx: [roundColorChannel(alphaParam[1]), roundColorChannel(alphaParam[2])],
        inverseConic: [roundColorChannel(conicParam[0]), roundColorChannel(conicParam[1]), roundColorChannel(conicParam[2])],
        coverageWeight: 0,
        tileCoverageWeight: 0,
        pixelCoverageWeight: 0,
        sourceOpacity: roundColorChannel(sourceOpacity),
        coverageAlpha: 0,
        transmittanceBefore: roundColorChannel(remainingTransmission),
        transmittanceAfter: roundColorChannel(remainingTransmission),
        sourceColor: readSourceColor(sourceColors, splatIndex),
        runningColor: runningColor.map(roundColorChannel) as [number, number, number],
        remainingTransmission: roundColorChannel(remainingTransmission),
        status: "skipped-zero-tile-coverage",
      });
      continue;
    }
    const conicParam = readVec4(alphaParams, alphaParamIndex + plan.maxTileRefs);
    const sourceOpacity = Math.min(clamp01(alphaParam[0]), 0.999);
    const pixelCoverageWeight = conicPixelWeightFromParams(alphaParam, conicParam, pixelCenter);
    const coverageAlpha = clamp01(1 - Math.pow(1 - sourceOpacity, pixelCoverageWeight));
    const sourceColor = readSourceColor(sourceColors, splatIndex);
    const transmittanceBefore = remainingTransmission;
    runningColor = sourceColor.map((channel, index) =>
      channel * coverageAlpha + runningColor[index] * (1 - coverageAlpha)
    ) as [number, number, number];
    remainingTransmission *= 1 - coverageAlpha;
    contributors.push({
      layer,
      refIndex,
      splatIndex,
      originalId,
      tileIndex,
      viewRank,
      viewDepth: roundColorChannel(viewDepth),
      alphaParamIndex,
      centerPx: [roundColorChannel(alphaParam[1]), roundColorChannel(alphaParam[2])],
      inverseConic: [roundColorChannel(conicParam[0]), roundColorChannel(conicParam[1]), roundColorChannel(conicParam[2])],
      coverageWeight: roundColorChannel(tileCoverageWeight),
      tileCoverageWeight: roundColorChannel(tileCoverageWeight),
      pixelCoverageWeight: roundColorChannel(pixelCoverageWeight),
      sourceOpacity: roundColorChannel(sourceOpacity),
      coverageAlpha: roundColorChannel(coverageAlpha),
      transmittanceBefore: roundColorChannel(transmittanceBefore),
      transmittanceAfter: roundColorChannel(remainingTransmission),
      sourceColor: sourceColor.map(roundColorChannel) as [number, number, number],
      runningColor: runningColor.map(roundColorChannel) as [number, number, number],
      remainingTransmission: roundColorChannel(remainingTransmission),
      status: "accumulated",
    });
  }

  const liveCompositorRgba = [
    roundColorChannel(runningColor[0]),
    roundColorChannel(runningColor[1]),
    roundColorChannel(runningColor[2]),
    roundColorChannel(1 - remainingTransmission),
  ] as const;
  return {
    id: anchor.id,
    pixel: { x: Math.floor(anchor.x), y: Math.floor(anchor.y) },
    tileAddress,
    header: {
      firstRefIndex,
      refCount,
      projectedCount,
      droppedCount,
    },
    gpuScatterCount,
    tileCapacity,
    refLimit,
    liveCompositorRgba,
    liveCompositorRgba8: liveCompositorRgba.map(floatColorToByte) as [number, number, number, number],
    remainingTransmission: roundColorChannel(remainingTransmission),
    contributors,
  };
}

function createReadbackBuffer(device: GPUDevice, size: number, label: string): GPUBuffer {
  return device.createBuffer({
    label,
    size: Math.max(16, size),
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
}

function destroyMappedReadbackBuffers(buffers: readonly GPUBuffer[]): void {
  for (const buffer of buffers) {
    buffer.unmap();
    buffer.destroy();
  }
}

function destroyReadbackBuffers(buffers: readonly GPUBuffer[]): void {
  for (const buffer of buffers) {
    buffer.destroy();
  }
}

function tileAddressForPixel(anchor: PixelTraceAnchor, plan: GpuTileCoveragePlan): TileLocalCompositorInputReadback["anchors"][number]["tileAddress"] {
  const x = clampInteger(Math.floor(anchor.x), 0, plan.viewportWidth - 1);
  const y = clampInteger(Math.floor(anchor.y), 0, plan.viewportHeight - 1);
  const tileX = clampInteger(Math.floor(x / plan.tileSizePx), 0, plan.tileColumns - 1);
  const tileY = clampInteger(Math.floor(y / plan.tileSizePx), 0, plan.tileRows - 1);
  return {
    tileX,
    tileY,
    tileIndex: tileY * plan.tileColumns + tileX,
    localX: x - tileX * plan.tileSizePx,
    localY: y - tileY * plan.tileSizePx,
  };
}

function readVec4(values: Float32Array, vec4Index: number): readonly [number, number, number, number] {
  const base = vec4Index * 4;
  return [
    values[base] ?? 0,
    values[base + 1] ?? 0,
    values[base + 2] ?? 0,
    values[base + 3] ?? 0,
  ];
}

function readSourceColor(sourceColors: Float32Array, splatIndex: number): [number, number, number] {
  const base = splatIndex * 3;
  return [
    sourceColors[base] ?? 0,
    sourceColors[base + 1] ?? 0,
    sourceColors[base + 2] ?? 0,
  ];
}

function conicPixelWeightFromParams(
  alphaParam: readonly [number, number, number, number],
  conicParam: readonly [number, number, number, number],
  pixelCenter: readonly [number, number]
): number {
  const dx = pixelCenter[0] - alphaParam[1];
  const dy = pixelCenter[1] - alphaParam[2];
  const mahalanobis2 = conicParam[0] * dx * dx + 2 * conicParam[1] * dx * dy + conicParam[2] * dy * dy;
  return Math.exp(-2 * mahalanobis2);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function readOutputTextureAnchor(
  view: DataView,
  pending: PendingTileLocalOutputTextureReadback,
  anchor: PixelTraceAnchor
): TileLocalOutputTextureReadback["anchors"][number] {
  const x = clampInteger(Math.floor(anchor.x), 0, pending.width - 1);
  const y = clampInteger(Math.floor(anchor.y), 0, pending.height - 1);
  const offset = y * pending.bytesPerRow + x * 8;
  const rgba = [
    halfFloatToNumber(view.getUint16(offset, true)),
    halfFloatToNumber(view.getUint16(offset + 2, true)),
    halfFloatToNumber(view.getUint16(offset + 4, true)),
    halfFloatToNumber(view.getUint16(offset + 6, true)),
  ] as const;
  return {
    id: anchor.id,
    pixel: { x, y },
    outputTextureRgba: rgba.map(roundColorChannel) as [number, number, number, number],
    outputTextureRgba8: rgba.map(floatColorToByte) as [number, number, number, number],
  };
}

function alignTo(value: number, alignment: number): number {
  return Math.ceil(value / alignment) * alignment;
}

function halfFloatToNumber(bits: number): number {
  const sign = (bits & 0x8000) ? -1 : 1;
  const exponent = (bits >> 10) & 0x1f;
  const fraction = bits & 0x03ff;
  if (exponent === 0) {
    return sign * Math.pow(2, -14) * (fraction / 1024);
  }
  if (exponent === 0x1f) {
    return fraction === 0 ? sign * Number.POSITIVE_INFINITY : Number.NaN;
  }
  return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
}

function roundColorChannel(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(6)) : 0;
}

function floatColorToByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createEmptyStorageBuffer(device: GPUDevice, size: number, label: string): GPUBuffer {
  return device.createBuffer({
    label,
    size: Math.max(16, size),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
}

function createTileHeaderStorageBuffer(
  device: GPUDevice,
  plan: GpuTileCoveragePlan,
  candidateSplatIndexes: Uint32Array | null,
  label: string,
): GPUBuffer {
  if (!candidateSplatIndexes || candidateSplatIndexes.length === 0) {
    return createEmptyStorageBuffer(device, plan.tileHeaderBytes, label);
  }
  const headerU32 = new Uint32Array(plan.tileHeaderBytes / Uint32Array.BYTES_PER_ELEMENT);
  writeGpuTileCoverageSourceIndexTable(headerU32, plan, candidateSplatIndexes);
  return createInitializedReadableStorageBuffer(device, headerU32.buffer, label);
}

function createInitializedReadableStorageBuffer(device: GPUDevice, data: ArrayBuffer, label: string): GPUBuffer {
  const buffer = device.createBuffer({
    label,
    size: Math.max(16, data.byteLength),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  });
  new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data));
  buffer.unmap();
  return buffer;
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

function estimatedGpuLiveRetentionAudit(
  tileRefCustody: TileRefCustodySummary,
  tileCount: number
): TileRetentionAudit {
  return {
    fullFrame: estimatedGpuLiveRetentionAuditSummary("gpu-live-custody-estimate", tileRefCustody, tileCount),
    regions: {
      porousBody: unavailableGpuLiveRetentionAuditSummary("gpu-live-region-unavailable:porous-body"),
      centerLeakBand: unavailableGpuLiveRetentionAuditSummary("gpu-live-region-unavailable:center-leak-band"),
    },
  };
}

function estimatedGpuLiveRetentionAuditSummary(
  region: string,
  tileRefCustody: TileRefCustodySummary,
  tileCount: number
) {
  return {
    region,
    tileCount: Math.max(0, Math.trunc(tileCount)),
    cappedTileCount: tileRefCustody.cappedTileCount,
    projectedTileEntryCount: tileRefCustody.projectedTileEntryCount,
    currentRetainedEntryCount: tileRefCustody.retainedTileEntryCount,
    legacyRetainedEntryCount: tileRefCustody.retainedTileEntryCount,
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

function unavailableGpuLiveRetentionAuditSummary(region: string) {
  return {
    region,
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
  footprintParams: RuntimeFootprintParams,
  frameTiming?: FrameTimingDraft
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
    footprintParams,
    frameTiming
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
  state.disposed = true;
  state.pendingOutputTextureReadback?.buffer.destroy();
  if (state.pendingCompositorInputReadback) {
    state.pendingCompositorInputReadback.cancelled = true;
    destroyReadbackBuffers([
      state.pendingCompositorInputReadback.tileHeaderBuffer,
      state.pendingCompositorInputReadback.tileRefBuffer,
      state.pendingCompositorInputReadback.tileCoverageWeightBuffer,
      state.pendingCompositorInputReadback.alphaParamBuffer,
      state.pendingCompositorInputReadback.tileScatterCursorBuffer,
    ]);
  }
  if (state.pendingRefStatsReadback) {
    state.pendingRefStatsReadback.cancelled = true;
    state.pendingRefStatsReadback.buffer.destroy();
    state.pendingRefStatsReadback = undefined;
  }
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
  if (state.wgslProjectedRefStream) {
    if (state.wgslProjectedRefStream.pendingReadback) {
      state.wgslProjectedRefStream.pendingReadback.cancelled = true;
      destroyReadbackBuffers([
        state.wgslProjectedRefStream.pendingReadback.tileHeaderBuffer,
        state.wgslProjectedRefStream.pendingReadback.tileScatterCursorBuffer,
      ]);
      state.wgslProjectedRefStream.pendingReadback = undefined;
    }
    state.wgslProjectedRefStream.frameUniformBuffer.destroy();
    state.wgslProjectedRefStream.tileHeaderBuffer.destroy();
    state.wgslProjectedRefStream.tileRefBuffer.destroy();
    state.wgslProjectedRefStream.tileCoverageWeightBuffer.destroy();
    state.wgslProjectedRefStream.tileScatterCursorBuffer.destroy();
    state.wgslProjectedRefStream.alphaParamBuffer.destroy();
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

function normalizeOperatorWitnessViewMode(mode: string): RealScaniverseWitnessViewMode {
  if (mode === "dessert-close" || mode === "dessert-porous-close") {
    return mode;
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
  return parseTileLocalTraceAnchorList(raw);
}

function selectedTileLocalPresentationAnchors(): readonly PixelTraceAnchor[] | undefined {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("presentationAnchors") ??
    params.get("presentationAnchor") ??
    params.get("tileLocalPresentationAnchors") ??
    params.get("tileLocalPresentationAnchor");
  return parseTileLocalTraceAnchorList(raw);
}

function selectedTileLocalPresentationScope(): TileLocalPresentationScope {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("presentationScope") ??
    params.get("presentationMode") ??
    params.get("tileLocalPresentationScope") ??
    params.get("tileLocalPresentationMode");
  if (raw === "anchor-neighborhood" || raw === "anchor" || raw === "anchors") {
    return "anchor-neighborhood";
  }
  return "full-scene";
}

function parseTileLocalTraceAnchorList(raw: string | null): readonly PixelTraceAnchor[] | undefined {
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

function selectedWgslProjectedRefStreamMode(): WgslProjectedRefStreamMode {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("wgslProjectedRefStream") ?? params.get("projectedRefStream");
  if (requested === "source-frontier" || requested === "source" || requested === "frontier") {
    return "source-frontier";
  }
  if (requested === "on" || requested === "enabled" || requested === "1" || requested === "sidecar") {
    return "sidecar";
  }
  return "disabled";
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
  runtimeRefStatsReadback: TileLocalRefStatsReadback | undefined = state.refStatsReadback,
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
    runtimeRefStatsReadback,
    traceCapacityEvidence: traceCapacityEvidenceFromState(state, perPixelFinalColorAccumulation),
  });
  return state.diagnostics;
}

function tileLocalRefAccounting(
  state: TileLocalSceneState,
  diagnostics: TileLocalDiagnosticSummary,
  refStatsReadback: TileLocalRefStatsReadback | undefined = state.refStatsReadback,
): Record<string, unknown> & {
  source: string;
  retainedRefs: number;
  allocatedRefs: number;
  estimatedRetainedRefs: number;
  projectedRefs: number;
  droppedRefs: number;
  tileCapacity: number;
} {
  const tileCapacity = gpuLiveEffectiveRefsPerTile(state.plan);
  const liveRefStats = refStatsReadback?.status === "present" ? refStatsReadback : null;
  if (liveRefStats) {
    return {
      status: "present",
      source: liveRefStats.source,
      retainedRefs: liveRefStats.retainedRefs,
      allocatedRefs: liveRefStats.allocatedRefs,
      estimatedRetainedRefs: state.tileRefCustody.retainedTileEntryCount,
      projectedRefs: liveRefStats.projectedScatterRefs,
      droppedRefs: liveRefStats.droppedRefs,
      nonEmptyTiles: liveRefStats.nonEmptyTiles,
      saturatedTiles: liveRefStats.saturatedTiles,
      maxRefsPerTile: liveRefStats.maxRefsPerTile,
      tileCount: liveRefStats.tileCount,
      tileCapacity: liveRefStats.tileCapacity,
      frameId: liveRefStats.frameId,
    };
  }
  if (state.arenaBackend === "gpu" && !state.gpuArenaRuntime) {
    return {
      status: state.refStatsReadback?.status ?? "pending",
      source: "gpu-scatter-cursor-readback-pending",
      retainedRefs: 0,
      allocatedRefs: state.plan.maxTileRefs,
      estimatedRetainedRefs: state.tileRefCustody.retainedTileEntryCount,
      projectedRefs: state.tileRefCustody.projectedTileEntryCount,
      droppedRefs: state.tileRefCustody.evictedTileEntryCount,
      nonEmptyTiles: 0,
      saturatedTiles: 0,
      maxRefsPerTile: 0,
      tileCount: state.plan.tileCount,
      tileCapacity,
      frameId: state.refStatsReadback?.frameId ?? null,
      blockedReason: state.refStatsReadback?.blockedReason,
    };
  }
  return {
    status: "diagnostic-summary",
    source: "tile-header-diagnostics",
    retainedRefs: diagnostics.tileRefs.total,
    allocatedRefs: state.tileEntryCount,
    estimatedRetainedRefs: state.tileRefCustody.retainedTileEntryCount,
    projectedRefs: state.tileRefCustody.projectedTileEntryCount,
    droppedRefs: state.tileRefCustody.evictedTileEntryCount,
    nonEmptyTiles: diagnostics.tileRefs.nonEmptyTiles,
    saturatedTiles: state.tileRefCustody.saturatedRetainedTileCount,
    maxRefsPerTile: diagnostics.tileRefs.maxPerTile,
    tileCount: state.plan.tileCount,
    tileCapacity,
  };
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
  const finalIdentitiesByAnchorId = new Map(
    perPixelFinalColorAccumulation.map((trace) => {
      const anchorPixel = trace.anchorPixel as { id?: string } | undefined;
      const traceRecord = (trace.traceRecord ?? trace) as {
        finalColorAccumulation?: { steps?: unknown[] };
      };
      const steps = Array.isArray(traceRecord.finalColorAccumulation?.steps)
        ? traceRecord.finalColorAccumulation.steps
        : [];
      return [
        String(anchorPixel?.id ?? ""),
        steps.map(contributorIdentity),
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
        finalIdentities: finalIdentitiesByAnchorId.get(record.anchorPixel.id) ?? [],
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
  sourceColors: Float32Array,
  tileLocalCurrentSignature: string | null,
  operatorWitness?: {
    readonly witnessView: RealScaniverseWitnessViewMode;
    readonly revision: number;
    readonly frameSerial: number;
  }
): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: Record<string, unknown>;
    __MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__?: TileLocalDiagnosticSummary;
    __MESH_SPLAT_PIXEL_CONTRIBUTOR_TRACE__?: PixelFinalAccumulationTraceRecord | BandPixelOrderTraceRecord;
  };
  const freshness = tileLocalState
    ? tileLocalPresentationFreshness(
        tileLocalState,
        tileLocalLastSkipReason,
        tileLocalLastSkipSignature,
        nowMs,
        tileLocalCurrentSignature
      )
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
  const traceAnchors: readonly PixelTraceAnchor[] = tileLocalState
    ? tileLocalState.traceAnchors ?? TILE_LOCAL_TRACE_ANCHORS ?? []
    : [];
  const evidenceFrameId = tileLocalState?.lastCompositedFrame ?? operatorWitness?.frameSerial ?? -1;
  const publishedRefStatsReadback = sameFramePublishedTileLocalRefStatsReadback(
    runtimeWindow.__MESH_SPLAT_SMOKE__,
    evidenceFrameId
  );
  const stateRefStatsReadback = tileLocalState?.refStatsReadback?.frameId === evidenceFrameId
    ? tileLocalState.refStatsReadback
    : undefined;
  const refStatsReadback = stateRefStatsReadback ?? publishedRefStatsReadback;
  const compositorInputReadback = tileLocalState
    ? ensureCpuReferenceCompositorInputReadback(tileLocalState, sourceColors, evidenceFrameId, traceAnchors) ??
      tileLocalState.compositorInputReadback
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
        anchors: traceAnchors,
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
    ? refreshTileLocalDiagnostics(tileLocalState, perPixelFinalColorAccumulation, refStatsReadback)
    : undefined;
  const refAccounting = tileLocalState && diagnostics
    ? tileLocalRefAccounting(tileLocalState, diagnostics, refStatsReadback)
    : undefined;
  runtimeWindow.__MESH_SPLAT_SMOKE__ = {
    ...(runtimeWindow.__MESH_SPLAT_SMOKE__ ?? {}),
    rendererLabel,
    fps,
    tileLocalStatus,
    tileLocalDisabledReason,
    tileLocalLastSkipReason,
    arenaRuntime,
    operatorWitness,
    tileLocal: tileLocalState && diagnostics
      ? {
          status: tileLocalStatus,
          refs: refAccounting?.retainedRefs ?? diagnostics.tileRefs.total,
          allocatedRefs: refAccounting?.allocatedRefs ?? tileLocalState.tileEntryCount,
          refAccounting,
          refStatsReadback,
          tileColumns: tileLocalState.plan.tileColumns,
          tileRows: tileLocalState.plan.tileRows,
          perPixelProjectedContributors: tileLocalState.perPixelProjectedContributors,
          perPixelRetainedContributors: tileLocalState.perPixelRetainedContributors,
          perPixelFinalColorAccumulation,
          presentationAnchors: tileLocalState.presentationAnchors,
          presentationScope: tileLocalState.presentationScope,
          traceAnchors,
          outputTextureReadback: tileLocalState.outputTextureReadback,
          compositorInputReadback,
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
          compactSourceConstruction: tileLocalState.compactSourceConstruction,
          retainedSourceConstruction: tileLocalState.retainedSourceConstruction,
          wgslProjectedRefStream: tileLocalState.wgslProjectedRefStreamEvidence,
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
    retainedSourceConstruction: tileLocalState?.retainedSourceConstruction,
    wgslProjectedRefStream: tileLocalState?.wgslProjectedRefStreamEvidence,
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
  if (freshness?.status === "pending-dispatch") return "pending-dispatch";
  if (tileLocalState) return freshness?.status === "current" ? "current" : "current";
  return "not-applicable";
}

function tileLocalPresentationFreshness(
  state: TileLocalSceneState,
  tileLocalLastSkipReason: string | null,
  tileLocalLastSkipSignature: string | null,
  nowMs: number,
  tileLocalCurrentSignature: string | null = null
) {
  const currentFrameSignature = shortTileLocalSignature(
    tileLocalCurrentSignature ?? tileLocalLastSkipSignature ?? state.lastCompositedSignature
  );
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
  if (tileLocalCurrentSignature && tileLocalCurrentSignature !== state.lastCompositedSignature) {
    return {
      status: "pending-dispatch",
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
