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
  createGpuAlphaDensityCompensationRuntime,
  createGpuAlphaDensityCompensationRuntimeEvidence,
  createGpuAlphaDensityCompensationSubstrateEvidence,
  dispatchGpuAlphaDensityCompensation,
  gpuAlphaDensityCompensationAlphaMassCapForTileSize,
  type GpuAlphaDensityCompensationRuntime,
  type GpuAlphaDensityCompensationRuntimeEvidence,
  type GpuAlphaDensityCompensationSubstrateEvidence,
} from "./gpuAlphaDensityCompensation.js";
import {
  buildDeterministicGpuTileProjectionRetentionArena,
  buildGpuProjectionRetentionCandidateSourceInputs,
  buildGpuProjectionRetentionCandidateSourceElectionTable,
  createGpuTileCoveragePlan,
  GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS,
  GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF,
  GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
  GPU_TILE_COVERAGE_TILE_HEADER_BYTES,
  GPU_TILE_COVERAGE_TILE_REF_BYTES,
  gpuProjectionRetentionCandidateSourceBufferUnavailableReason,
  writeGpuTileCoverageFrameUniforms,
  writeGpuTileCoverageSourceIndexTable,
  type GpuProjectionRetentionCandidateSourceInputs,
  type GpuProjectionRetentionCandidateSourceProductionElection,
  type GpuProjectionRetentionCandidateSources,
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
import { type GpuProductionElectionConsumerContract } from "./gpuProductionElectionConsumer.js";
import {
  GPU_PRODUCTION_ELECTION_PREFIX_SCATTER_WITNESS_WORDS,
  type GpuProductionElectionPrefixScatterContract,
} from "./gpuProductionElectionPrefixScatter.js";
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
  shouldDeferTileLocalRebuildForActiveInput,
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
import { sourceFrontierProjectedSupportFallbackByAnchorId } from "./rendererFidelityProbes/sourceFrontierEvidence.js";
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
const COMPACT_SOURCE_FULL_SCENE_MAX_TILES_PER_SPLAT = 81;
const COMPACT_SOURCE_ANCHOR_PREFILTER_MIN_MARGIN_PX = 96;
const COMPACT_SOURCE_ANCHOR_PREFILTER_MAX_MARGIN_PX = 384;
const SOURCE_FRONTIER_ALPHA_CLASS_MASK_SENTINEL = -1024;
const SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_MASK =
  GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS.retention |
  GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS.support;
const SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE = 8;
const SOURCE_FRONTIER_SUPPORT_FALLOFF_SCALE = 0.5;
const SOURCE_FRONTIER_COLOR_OCCLUSION_GAP_SCALE = 0.5;
const COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS = 4;
const COMPACT_SOURCE_EPSILON = 1e-9;
const TILE_LOCAL_UNSAFE = selectedTileLocalUnsafeMode();
const GPU_LIVE_POINT_SIGMA_PX = 10;
const GPU_LIVE_POINT_SUPPORT_RADIUS_PX = GPU_LIVE_POINT_SIGMA_PX * 3;

interface CandidateSourceInputBuffers {
  readonly candidateSourceInputs: GpuProjectionRetentionCandidateSourceInputs;
  readonly candidateSourceRecordsBuffer: GPUBuffer;
  readonly candidateSourceGroupsBuffer: GPUBuffer;
}

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

interface AlphaDensityRouteEvidence {
  readonly requestedBackend: "alpha-density-gpu-accounting-carrier";
  readonly effectiveBackend:
    | "cpu-reference-alpha-param-upload"
    | "gpu-arena-legacy-alpha-param-buffer"
    | "wgsl-source-frontier-alpha-param-carrier"
    | "gpu-alpha-density-compensation-runtime";
  readonly compensatedOpacitySource: "cpu-reference-opacity-buffer" | "gpu-compensated-opacity-buffer";
  readonly cpuReferenceCompensationSource?: "cpu-reference-opacity-buffer";
  readonly alphaParamSource:
    | "cpu-alpha-param-upload"
    | "gpu-arena-legacy-alpha-param-buffer"
    | "shader-built-source-frontier-alpha-params";
  readonly runtimeConsumerBackend: "tile-local-visible-gaussian-compositor";
  readonly falseClosureGuard:
    | "gpu-alpha-param-carrier-does-not-imply-gpu-opacity-compensation"
    | "gpu-alpha-density-runtime-preserves-cpu-reference-witness";
  readonly nextGpuOffloadStage:
    | "gpu-alpha-density-compensation"
    | "coverage-aware-gpu-alpha-density-compensation";
  readonly gpuCompensationSubstrate?: GpuAlphaDensityCompensationSubstrateEvidence;
  readonly gpuCompensationRuntime?: GpuAlphaDensityCompensationRuntimeEvidence;
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
  candidateSourceRecordsBuffer?: GPUBuffer;
  candidateSourceGroupsBuffer?: GPUBuffer;
  productionElectionComputeConsumer?: GpuProductionElectionConsumerContract;
  productionElectionPrefixScatter?: GpuProductionElectionPrefixScatterContract;
  alphaParamData: Float32Array;
  candidateSourceInputs?: GpuProjectionRetentionCandidateSourceInputs;
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
  gpuAlphaDensityCompensation?: GpuAlphaDensityCompensationRuntime;
  alphaDensityRoute: AlphaDensityRouteEvidence;
  tileRefSplatIds: Uint32Array;
  prepassSignature: string;
  debugMode: GpuTileCoverageDebugMode;
  diagnostics: TileLocalDiagnosticSummary;
  arenaBackend: "cpu" | "gpu";
  gpuArenaRuntime: GpuTileContributorArenaRuntime | null;
  gpuArenaProjectedContributors: readonly GpuTileContributorArenaProjectedContributor[];
  gpuArenaProjectedConicSources?: RuntimeCompactTileCoverage["splats"];
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
  prefixScatterReadback?: ProductionElectionPrefixScatterReadback;
  pendingPrefixScatterReadback?: PendingProductionElectionPrefixScatterReadback;
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

function createCpuAlphaDensityRouteEvidence(): AlphaDensityRouteEvidence {
  return {
    requestedBackend: "alpha-density-gpu-accounting-carrier",
    effectiveBackend: "cpu-reference-alpha-param-upload",
    compensatedOpacitySource: "cpu-reference-opacity-buffer",
    alphaParamSource: "cpu-alpha-param-upload",
    runtimeConsumerBackend: "tile-local-visible-gaussian-compositor",
    falseClosureGuard: "gpu-alpha-param-carrier-does-not-imply-gpu-opacity-compensation",
    nextGpuOffloadStage: "gpu-alpha-density-compensation",
  };
}

function createGpuArenaAlphaDensityRouteEvidence(): AlphaDensityRouteEvidence {
  return {
    requestedBackend: "alpha-density-gpu-accounting-carrier",
    effectiveBackend: "gpu-arena-legacy-alpha-param-buffer",
    compensatedOpacitySource: "cpu-reference-opacity-buffer",
    alphaParamSource: "gpu-arena-legacy-alpha-param-buffer",
    runtimeConsumerBackend: "tile-local-visible-gaussian-compositor",
    falseClosureGuard: "gpu-alpha-param-carrier-does-not-imply-gpu-opacity-compensation",
    nextGpuOffloadStage: "gpu-alpha-density-compensation",
  };
}

function createSourceFrontierAlphaDensityRouteEvidence(input: { readonly tileSizePx: number }): AlphaDensityRouteEvidence {
  const alphaMassCap = gpuAlphaDensityCompensationAlphaMassCapForTileSize(input.tileSizePx);
  return {
    requestedBackend: "alpha-density-gpu-accounting-carrier",
    effectiveBackend: "gpu-alpha-density-compensation-runtime",
    compensatedOpacitySource: "gpu-compensated-opacity-buffer",
    cpuReferenceCompensationSource: "cpu-reference-opacity-buffer",
    alphaParamSource: "shader-built-source-frontier-alpha-params",
    runtimeConsumerBackend: "tile-local-visible-gaussian-compositor",
    falseClosureGuard: "gpu-alpha-density-runtime-preserves-cpu-reference-witness",
    nextGpuOffloadStage: "coverage-aware-gpu-alpha-density-compensation",
    gpuCompensationSubstrate: createGpuAlphaDensityCompensationSubstrateEvidence(),
    gpuCompensationRuntime: createGpuAlphaDensityCompensationRuntimeEvidence({
      tileSizePx: input.tileSizePx,
      alphaMassCap,
    }),
  };
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
  readonly sourceRole: "diagnostic-sidecar-not-retention-source" | "visible-source-frontier-gpu-retention-election";
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
  readonly sourceRole: "diagnostic-sidecar-not-retention-source" | "visible-source-frontier-gpu-retention-election";
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
  readonly tileRefPayloadEncoding?: "legacy-identity" | "source-frontier-score";
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
      readonly retentionScore?: number;
      readonly candidateSourceClassMask?: number;
      readonly sourceRole?: string;
      readonly role?: string;
      readonly roleClass?: string;
      readonly retentionBand?: string;
      readonly viewDepth: number;
      readonly alphaParamIndex: number;
      readonly centerPx: readonly [number, number];
      readonly inverseConic: readonly [number, number, number];
      readonly coverageWeight: number;
      readonly tileCoverageWeight: number;
      readonly tileLocalSupportWeight: number;
      readonly pixelCoverageWeight: number;
      readonly sourceFrontierSupportPixelWeight: number;
      readonly sourceOpacity: number;
      readonly opacity?: number;
      readonly alphaTransferWeight: number;
      readonly colorTransferWeight: number;
      readonly coverageAlpha: number;
      readonly colorAlpha: number;
      readonly colorOcclusionAlpha: number;
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
  readonly tileRefPayloadEncoding: "legacy-identity" | "source-frontier-score";
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
  readonly source: "gpu-tile-header-and-scatter-readback";
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
  readonly tileHeaderBuffer: GPUBuffer;
  readonly tileScatterCursorBuffer: GPUBuffer;
  mapStarted: boolean;
  cancelled: boolean;
}

interface ProductionElectionPrefixScatterReadback {
  readonly status: "pending" | "present" | "blocked";
  readonly source: "wgsl-production-election-prefix-scatter-readback";
  readonly frameId: number;
  readonly recordCount: number;
  readonly groupCount: number;
  readonly retainedRecordCount: number;
  readonly tileCount: number;
  readonly witnessSentinel: number;
  readonly witnessRecordCount: number;
  readonly witnessGroupCount: number;
  readonly witnessRetainedRecordCount: number;
  readonly witnessTileCount: number;
  readonly firstRecordWord: number;
  readonly firstGroupWord: number;
  readonly firstRetainedTileIndex: number;
  readonly retainedRows: number;
  readonly nonEmptyTiles: number;
  readonly maxRowsPerTile: number;
  readonly firstRetainedRecordIndex: number;
  readonly outputBuffers: readonly string[];
  readonly falseClosureGuard: "prefix-scatter-readback-is-not-current-compositor-consumption";
  readonly blockedReason?: string;
}

interface PendingProductionElectionPrefixScatterReadback {
  readonly frameId: number;
  readonly contract: GpuProductionElectionPrefixScatterContract;
  readonly witnessBuffer: GPUBuffer;
  readonly prefixCountsBuffer: GPUBuffer;
  readonly retainedRecordIndicesBuffer: GPUBuffer;
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

interface WgslSourceFrontierCandidateSourceSubstrate {
  readonly candidateSources: GpuProjectionRetentionCandidateSources;
  readonly projectedCandidateRecords: readonly GpuTileContributorArenaProjectedContributor[];
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
  readonly nextGpuOffloadStage:
    | "wgsl-projected-ref-stream"
    | "production-candidate-source-pool-identity"
    | "production-candidate-source-election-consumption"
    | "live-wgsl-production-candidate-source-election"
    | "live-wgsl-production-election-prefix-scatter"
    | "live-wgsl-production-election-retained-payload-materialization"
    | "live-wgsl-production-election-compositor-consumption"
    | "live-wgsl-production-election-candidate-source-bindings"
    | "live-wgsl-production-candidate-source-identity";
  readonly accountingSource?:
    | "cpu-compact-source"
    | "gpu-ref-stats-readback-pending"
    | "gpu-ref-stats-readback-present"
    | "gpu-ref-stats-readback-blocked"
    | "gpu-compositor-input-readback-present";
  readonly frontierBlockedStages?: readonly string[];
  readonly currentCompositorBinding?:
    | "production-election-prefix-scatter-materialized-current-compositor-source"
    | "wgsl-projected-ref-stream-shader-built-current-compositor-source"
    | "forbidden-current-compositor-bind-group-full";
  readonly projectedRefs: number;
  readonly retainedRefs: number;
  readonly droppedRefs: number;
  readonly retainedBudgetRefs?: number;
  readonly maxRefsPerTile?: number;
  readonly retainedRows?: SourceFrontierRetainedRowsEvidence;
  readonly candidateSourceIdentity?: SourceFrontierCandidateSourceIdentityEvidence;
  readonly candidateSourceRuntimeBuffers?: SourceFrontierCandidateSourceRuntimeBufferEvidence;
  readonly productionElectionConsumer?: SourceFrontierProductionElectionConsumerEvidence;
  readonly productionElectionPrefixScatter?: SourceFrontierProductionElectionPrefixScatterEvidence;
}

interface SourceFrontierCandidateSourceIdentityEvidence {
  readonly status:
    | "blocked-missing-wgsl-candidate-source-inputs"
    | "class-mask-consumed-record-groups-not-yet-consumed"
    | "record-group-election-sidecar-consumed"
    | "production-election-contract-consumed";
  readonly source: "wgsl-source-frontier-candidate-source-identity-contract";
  readonly availableIdentity:
    | "selected-slot-pool-only"
    | "source-index-table-class-mask"
    | "class-tagged-wgsl-candidate-source-inputs"
    | "record-group-production-election-contract";
  readonly consumptionPath?:
    | "source-index-table-class-mask"
    | "candidate-source-record-group-election-sidecar"
    | "candidate-source-record-group-production-election-contract";
  readonly requiredWgslInputs: readonly string[];
  readonly presentWgslInputs?: readonly string[];
  readonly sourceInputConsumption?: readonly string[];
  readonly fallbackIdentityPath?: "selected-pool-derived-class-mask";
  readonly sourceIndexTableClassMaskSource?:
    | "source-index-table-class-mask"
    | "blocked-missing-wgsl-candidate-source-inputs";
  readonly retirementBlocker?: "live-wgsl-production-candidate-source-identity";
  readonly recordCount?: number;
  readonly groupCount?: number;
  readonly retainedRecordCount?: number;
  readonly crossPoolDuplicateSuppressedCount?: number;
  readonly classesPresent?: readonly string[];
  readonly falseClosureGuard:
    | "bounded-pool-seats-are-not-production-candidate-source-identity"
    | "source-index-class-masks-do-not-consume-full-candidate-record-groups"
    | "candidate-source-sidecar-is-not-production-retention-election"
    | "packed-production-election-contract-is-not-live-wgsl-compositor-consumption";
}

interface SourceFrontierCandidateSourceRuntimeBufferEvidence {
  readonly status: "runtime-state-buffers-present" | "blocked-missing-runtime-state-buffers";
  readonly source: "wgsl-source-frontier-candidate-source-runtime-buffers";
  readonly recordCount: number;
  readonly groupCount: number;
  readonly presentRuntimeBuffers: readonly string[];
  readonly currentCompositorBinding:
    | "forbidden-current-compositor-bind-group-full"
    | "blocked-missing-runtime-state-buffers";
  readonly nextConsumer:
    | "narrow-production-election-consumer"
    | "candidate-source-runtime-buffer-allocation";
  readonly falseClosureGuard:
    | "candidate-source-runtime-buffers-do-not-imply-current-compositor-bind-group-consumption"
    | "missing-candidate-source-runtime-buffers-block-production-election-consumer";
}

interface SourceFrontierProductionElectionConsumerEvidence {
  readonly status:
    | "narrow-consumer-contract-present"
    | "compute-consumer-contract-present"
    | "blocked-missing-production-election-consumer-input";
  readonly source: "wgsl-source-frontier-production-election-consumer" | "wgsl-production-election-compute-consumer";
  readonly productionElectionStatus?: "production-election-contract-consumed";
  readonly runtimeBufferSource:
    | "candidate-source-runtime-state-buffers"
    | "missing-candidate-source-runtime-state-buffers";
  readonly recordCount: number;
  readonly groupCount: number;
  readonly retainedRecordCount: number;
  readonly crossPoolDuplicateSuppressedCount: number;
  readonly sourceInputConsumption: readonly string[];
  readonly consumedRuntimeBuffers?: readonly string[];
  readonly outputWitness?: "production-election-consumer-witness-buffer";
  readonly currentCompositorBinding:
    | "forbidden-current-compositor-bind-group-full"
    | "blocked-missing-production-election-consumer-input";
  readonly nextConsumerBoundary:
    | "wgsl-production-election-compute-consumer"
    | "wgsl-production-election-prefix-scatter"
    | "candidate-source-runtime-buffer-allocation";
  readonly falseClosureGuard:
    | "production-election-consumer-contract-is-not-current-compositor-bind-group-consumption"
    | "wgsl-production-election-compute-consumer-is-not-current-compositor-bind-group-consumption"
    | "missing-production-election-consumer-input-blocks-narrow-consumer-claim";
}

interface SourceFrontierProductionElectionPrefixScatterEvidence {
  readonly status:
    | "prefix-scatter-contract-present"
    | "blocked-missing-production-election-prefix-scatter-input";
  readonly source: "wgsl-production-election-prefix-scatter";
  readonly computeConsumerSource?:
    | "wgsl-production-election-compute-consumer"
    | "missing-production-election-compute-consumer";
  readonly recordCount: number;
  readonly groupCount: number;
  readonly retainedRecordCount: number;
  readonly tileCount: number;
  readonly consumedComputeConsumer?: "wgsl-production-election-compute-consumer";
  readonly consumedRuntimeBuffers?: readonly string[];
  readonly outputBuffers?: readonly string[];
  readonly outputWitness?: "production-election-prefix-scatter-witness-buffer";
  readonly readback?: ProductionElectionPrefixScatterReadback;
  readonly currentCompositorBinding:
    | "forbidden-current-compositor-bind-group-full"
    | "production-election-prefix-scatter-materialized-current-compositor-source"
    | "blocked-missing-production-election-prefix-scatter-input";
  readonly nextConsumerBoundary:
    | "current-compositor-bind-group-consumption"
    | "wgsl-production-election-prefix-scatter";
  readonly falseClosureGuard:
    | "wgsl-production-election-prefix-scatter-is-not-current-compositor-bind-group-consumption"
    | "production-election-compositor-consumption-is-not-visual-quality-or-performance-closure"
    | "missing-production-election-prefix-scatter-input-blocks-compositor-consumption-claim";
}

interface SourceFrontierRetainedRowsEvidence {
  readonly status: "pending" | "present" | "blocked";
  readonly source: "gpu-compositor-input-readback" | "gpu-ref-stats-readback";
  readonly payloadEncoding: "source-frontier-score";
  readonly falseClosureGuard:
    | "source-frontier-retained-row-readback-is-production-gpu-prefix-scatter-not-production-retention-election"
    | "source-frontier-ref-stats-readback-is-row-accounting-not-payload-readback";
  readonly rowFields: readonly string[];
  readonly tileCount: number;
  readonly retainedBudgetRefs: number;
  readonly maxRefsPerTile: number;
  readonly frameId?: number;
  readonly projectedRows: number;
  readonly retainedRows: number;
  readonly droppedRows: number;
  readonly nonEmptyTiles: number;
  readonly saturatedTiles: number;
  readonly maxRowsPerTile: number;
  readonly scorePackedRows: number;
  readonly maxRetentionScore: number;
  readonly blockedReason?: string;
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
  readonly detail?: Readonly<Record<string, number | string | boolean | null>>;
}

interface FrameTimingDraft {
  readonly startedAtMs: number;
  readonly stages: FrameTimingStage[];
}

interface FrameTimingSummary {
  readonly totalMs: number;
  readonly stages: readonly FrameTimingStage[];
}

const FRAME_TIMING_OVERLAY_RETAIN_THRESHOLD_MS = 50;
const FRAME_TIMING_OVERLAY_RECENT_SLOW_TTL_MS = 10_000;

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

function recordOptionalFrameStageDetail(
  timing: FrameTimingDraft | undefined,
  name: string,
  detail: Readonly<Record<string, number | string | boolean | null>>
): void {
  if (!timing) {
    return;
  }
  timing.stages.push({
    name,
    elapsedMs: 0,
    detail,
  });
}

function finishFrameTiming(timing: FrameTimingDraft): FrameTimingSummary {
  return {
    totalMs: roundRuntimeMetric(performance.now() - timing.startedAtMs),
    stages: timing.stages,
  };
}

function formatFrameTimingOverlay(timing: FrameTimingDraft): string {
  let slowestStage: FrameTimingStage | null = null;
  let sourceFrontierPackMs = 0;
  let tileLocalSceneRefreshMs = 0;
  for (const stage of timing.stages) {
    if (!slowestStage || stage.elapsedMs > slowestStage.elapsedMs) {
      slowestStage = stage;
    }
    if (stage.name.startsWith("wgsl-source-frontier-pack")) {
      sourceFrontierPackMs = Math.max(sourceFrontierPackMs, stage.elapsedMs);
    }
    if (stage.name === "tile-local-scene-state-refresh") {
      tileLocalSceneRefreshMs = Math.max(tileLocalSceneRefreshMs, stage.elapsedMs);
    }
  }
  const parts = [`app frame: ${roundRuntimeMetric(performance.now() - timing.startedAtMs)}ms`];
  if (slowestStage) {
    parts.push(`slowest app stage: ${slowestStage.name} ${slowestStage.elapsedMs}ms`);
  }
  if (tileLocalSceneRefreshMs > 0) {
    parts.push(`tile-local rebuild: ${roundRuntimeMetric(tileLocalSceneRefreshMs)}ms`);
  }
  if (sourceFrontierPackMs > 0) {
    parts.push(`source-frontier pack: ${roundRuntimeMetric(sourceFrontierPackMs)}ms`);
  }
  return parts.join(" | ");
}

function shouldRetainFrameTimingOverlay(timing: FrameTimingDraft): boolean {
  if (performance.now() - timing.startedAtMs >= FRAME_TIMING_OVERLAY_RETAIN_THRESHOLD_MS) {
    return true;
  }
  return timing.stages.some((stage) => stage.name.startsWith("wgsl-source-frontier-pack"));
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
  let recentSlowFrameTimingOverlay: { readonly text: string; readonly observedAtMs: number; } | null = null;
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
        if (scene.tileLocalState?.gpuAlphaDensityCompensation) {
          scene.tileLocalState.needsDispatch = true;
          return;
        }
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
    const deferTileLocalRebuildForActiveInput = shouldDeferTileLocalRebuildForActiveInput({
      arenaBackend: scene.tileLocalState?.arenaBackend,
      activeInput,
      presentationStaleForCurrentView: tileLocalPresentationStaleForCurrentView,
      frameStartMs: now,
      lastSignatureChangeMs: scene.tileLocalLastSignatureChangeMs,
      settleMs: TILE_LOCAL_REBUILD_SETTLE_MS,
    });

    if (scene.tileLocalState && shouldDispatchTileLocalCompositor({
      needsDispatch: scene.tileLocalState.needsDispatch,
      activeInput,
      allowActiveInputDispatch: scene.tileLocalState.arenaBackend === "gpu" && !deferTileLocalRebuildForActiveInput,
      pendingGpuSort,
      pendingAlphaDensity,
    })) {
      try {
        const tileLocalState = timeFrameStage(
          frameTiming,
          "tile-local-scene-state-refresh",
          () => ensureTileLocalSceneState(
            gpu.device,
            scene,
            scene.tileLocalState!,
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
          )
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
          if (tileLocalState.gpuAlphaDensityCompensation) {
            dispatchGpuAlphaDensityCompensation(
              tileLocalState.gpuAlphaDensityCompensation,
              {
                queue: gpu.device.queue,
                pass: tileLocalComputePass,
                viewProj,
                viewportWidth: width,
                viewportHeight: height,
              }
            );
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
          enqueueProductionElectionPrefixScatterReadback(gpu.device, encoder, tileLocalState, frameSerial);
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

    timeFrameStage(frameTiming, "queue-submit", () => {
      gpu.device.queue.submit([encoder.finish()]);
    });
    if (scene.tileLocalState) {
      timeFrameStage(frameTiming, "tile-local-readback-resolve", () => {
        resolveTileLocalOutputTextureReadback(scene.tileLocalState!);
        resolveTileLocalCompositorInputReadback(scene.tileLocalState!);
        resolveTileLocalRefStatsReadback(scene.tileLocalState!);
        resolveWgslProjectedRefStreamReadback(scene.tileLocalState!);
        resolveProductionElectionPrefixScatterReadback(scene.tileLocalState!);
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
      const runtimeWindow = window as unknown as { __MESH_SPLAT_SMOKE__?: Record<string, unknown> };
      const overlayRefStatsReadback = overlayTileLocalRefStatsReadback(scene.tileLocalState, runtimeWindow.__MESH_SPLAT_SMOKE__);
      const refAccounting = tileLocalRefAccounting(scene.tileLocalState, scene.tileLocalState.diagnostics, overlayRefStatsReadback);
      statsText += ` | tile-local: ${scene.tileLocalState.plan.tileColumns}x${scene.tileLocalState.plan.tileRows} tiles/${refAccounting.retainedRefs} refs`;
      if (refAccounting.source === "gpu-tile-header-and-scatter-readback") {
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
      statsText += ` | alpha-density route: ${scene.tileLocalState.alphaDensityRoute.compensatedOpacitySource}->${scene.tileLocalState.alphaDensityRoute.effectiveBackend}`;
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
    const frameTimingOverlay = formatFrameTimingOverlay(frameTiming);
    statsText += ` | ${frameTimingOverlay}`;
    if (shouldRetainFrameTimingOverlay(frameTiming)) {
      recentSlowFrameTimingOverlay = { text: frameTimingOverlay, observedAtMs: now };
    } else if (
      recentSlowFrameTimingOverlay &&
      now - recentSlowFrameTimingOverlay.observedAtMs <= FRAME_TIMING_OVERLAY_RECENT_SLOW_TTL_MS
    ) {
      statsText += ` | recent slow app frame: ${recentSlowFrameTimingOverlay.text} (${Math.round(now - recentSlowFrameTimingOverlay.observedAtMs)}ms ago)`;
    } else if (recentSlowFrameTimingOverlay) {
      recentSlowFrameTimingOverlay = null;
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
  const compactSource = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/gpu-arena/build-compact-source",
    () => buildCompactRetainedSourceForRuntime({
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
    })
  );
  const gpuArenaProjectedContributors = compactSource.retainedRecords;
  const plan = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/gpu-arena/create-plan",
    () => createGpuTileCoveragePlan({
      viewportWidth,
      viewportHeight,
      tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
      splatCount: attributes.count,
      maxTileRefs: Math.max(gpuArenaProjectedContributors.length, attributes.count, 1),
    })
  );
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
  const gpuArenaRuntime = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/gpu-arena/create-runtime",
    () => createGpuTileContributorArenaRuntime(device, plan, gpuArenaProjectedContributors)
  );
  const legacyProjection = gpuArenaRuntime.legacyProjection;
  const sourceDepthEvidence = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/gpu-arena/source-depth-evidence",
    () => compactSourceBackToFrontDepthEvidence(attributes, viewMatrix)
  );
  const pipeline = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/gpu-arena/create-pipeline",
    () => createGpuTileCoveragePipelineSkeleton(device, "rgba16float")
  );
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
  const wgslProjectedRefStreamResult = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/gpu-arena/create-ref-stream-state",
    () => createWgslProjectedRefStreamState({
      device,
      pipeline,
      buffers,
      outputView,
      viewportWidth,
      viewportHeight,
      tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
      splatCount: attributes.count,
      compactSource,
    })
  );
  const wgslProjectedRefStream = wgslProjectedRefStreamResult.state;
  const alphaParamData = new Float32Array(Math.max(plan.alphaParamBytes / Float32Array.BYTES_PER_ELEMENT, 8));
  alphaParamData.set(legacyProjection.alphaParamData.slice(0, alphaParamData.length));
  const bindGroup = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/gpu-arena/create-bind-group",
    () => pipeline.createBindGroup({
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
    })
  );
  const retentionAudit = estimatedGpuLiveRetentionAudit(compactSource.tileRefCustody, plan.tileCount);
  const budgetDiagnostics = compactRetainedSourceBudgetDiagnostics(plan, compactSource);
  const diagnostics = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/gpu-arena/diagnostics",
    () => summarizeTileLocalDiagnostics({
      debugMode: TILE_LOCAL_DEBUG_MODE,
      plan,
      tileEntryCount: gpuArenaProjectedContributors.length,
      tileHeaders: legacyProjection.tileHeaders,
      tileRefCustody: compactSource.tileRefCustody,
      retentionAudit,
      tileCoverageWeights: legacyProjection.tileCoverageWeights,
      alphaParamData,
      sourceOpacities: effectiveOpacities,
    })
  );
  const retainedSourceConstruction = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/gpu-arena/retained-source-evidence",
    () => buildGpuArenaRetainedSourceConstructionEvidence(compactSource)
  );
  const wgslProjectedRefStreamEvidence = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/gpu-arena/ref-stream-evidence",
    () => buildWgslProjectedRefStreamEvidence(
      compactSource,
      wgslProjectedRefStream,
      wgslProjectedRefStreamResult.unavailableReason
    )
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
    alphaDensityRoute: createGpuArenaAlphaDensityRouteEvidence(),
    tileRefSplatIds: legacyProjection.tileRefSplatIds,
    prepassSignature,
    debugMode: TILE_LOCAL_DEBUG_MODE,
    diagnostics,
    arenaBackend: "gpu",
    gpuArenaRuntime,
    gpuArenaProjectedContributors,
    gpuArenaProjectedConicSources: undefined,
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
  const splats = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/project-splats",
    () => timeOptionalFrameStage(frameTiming, "wgsl-source-frontier-project-splats", () => projectRuntimeSplatsForCompactSource({
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
    }))
  );
  const projectedRefEstimate = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/estimate-ref-budget",
    () => timeOptionalFrameStage(frameTiming, "wgsl-source-frontier-estimate-ref-budget", () => estimateCompactProjectedTileRefCount({
      splats,
      viewportWidth,
      viewportHeight,
      tileSizePx,
      maxTileEntries: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
      maxTilesPerSplat,
    }))
  );
  const frontierSource: WgslProjectedSourceFrontierSource = {
    splats,
    candidateSplatIndexes: new Uint32Array(splats.map((splat) => splat.splatIndex)),
    projectedRefEstimate,
    maxTilesPerSplat,
    tileCount,
  };
  const plan = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/create-plan",
    () => {
      const sourceFrontierTileRefCapacity = gpuLiveMaxTileRefs(
        device,
        frontierSource.tileCount,
        Math.max(
          frontierSource.projectedRefEstimate,
          frontierSource.candidateSplatIndexes.length,
          1,
        ),
      );
      return createGpuTileCoveragePlan({
        viewportWidth,
        viewportHeight,
        tileSizePx,
        splatCount: attributes.count,
        sourceSplatCount: frontierSource.candidateSplatIndexes.length,
        maxTileRefs: sourceFrontierTileRefCapacity,
        maxTilesPerSplat: frontierSource.maxTilesPerSplat,
      });
    }
  );
  const bufferBlocker = gpuTileCoverageBufferUnavailableReason(device, plan);
  if (bufferBlocker) {
    throw new Error(bufferBlocker);
  }
  const pipeline = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/create-pipeline",
    () => createGpuTileCoveragePipelineSkeleton(device, "rgba16float")
  );
  const frameUniformBuffer = createUniformBuffer(
    device,
    GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
    "wgsl_source_frontier_frame_uniforms"
  );
  const frameUniformData = new Float32Array(GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);
  const tileHeaderBuffer = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/create-tile-headers",
    () => createTileHeaderStorageBuffer(
      device,
      plan,
      frontierSource.candidateSplatIndexes,
      "wgsl_source_frontier_tile_headers",
    )
  );
  const {
    tileRefBuffer,
    tileCoverageWeightBuffer,
    tileBuildCountBuffer,
    tileScatterCursorBuffer,
    alphaParamBuffer,
    outputTexture,
  } = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/create-ref-buffers",
    () => ({
      tileRefBuffer: createEmptyStorageBuffer(device, plan.tileRefBytes, "wgsl_source_frontier_tile_refs"),
      tileCoverageWeightBuffer: createEmptyStorageBuffer(
        device,
        plan.tileCoverageWeightBytes,
        "wgsl_source_frontier_tile_coverage_weights"
      ),
      tileBuildCountBuffer: createEmptyStorageBuffer(
        device,
        Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT),
        "wgsl_source_frontier_tile_build_counts"
      ),
      tileScatterCursorBuffer: createEmptyStorageBuffer(
        device,
        Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT),
        "wgsl_source_frontier_scatter_cursors"
      ),
      alphaParamBuffer: createEmptyStorageBuffer(device, plan.alphaParamBytes, "wgsl_source_frontier_alpha_params"),
      outputTexture: createTexture2D(
        device,
        viewportWidth,
        viewportHeight,
        "rgba16float",
        GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
        "tile_local_output"
      ),
    })
  );
  const outputView = outputTexture.createView();
  const gpuAlphaDensityCompensation = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/create-alpha-density-runtime",
    () => createGpuAlphaDensityCompensationRuntime({
      device,
      positionBuffer: buffers.positionBuffer,
      scaleBuffer: buffers.scaleBuffer,
      rotationBuffer: buffers.rotationBuffer,
      rawOpacities: attributes.opacities,
      splatCount: attributes.count,
      tileColumns,
      tileRows,
      tileSizePx,
      splatScale: footprintParams.splatScale,
      minRadiusPx: footprintParams.minRadiusPx,
    })
  );
  const compactSourceConstruction = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/compact-source-construction",
    () => buildWgslProjectedSourceFrontierCompactSourceConstruction(
      frontierSource,
      plan
    )
  );
  const compactSource = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/compact-source-shell",
    () => compactRetainedSourceForWgslProjectedSourceFrontierShaderBuilt(
      frontierSource,
      compactSourceConstruction,
      plan,
    )
  );
  const bindGroup = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/create-bind-group",
    () => pipeline.createBindGroup({
      frameUniformBuffer,
      positionBuffer: buffers.positionBuffer,
      colorBuffer: buffers.colorBuffer,
      opacityBuffer: gpuAlphaDensityCompensation.compensatedOpacityBuffer,
      scaleBuffer: buffers.scaleBuffer,
      rotationBuffer: buffers.rotationBuffer,
      tileHeaderBuffer,
      tileRefBuffer,
      tileCoverageWeightBuffer,
      tileScatterCursorBuffer,
      alphaParamBuffer,
      outputColorView: outputView,
    })
  );
  const tileRefCustody = compactSource.tileRefCustody;
  const retentionAudit = estimatedGpuLiveRetentionAudit(tileRefCustody, plan.tileCount);
  const budgetDiagnostics = compactRetainedSourceBudgetDiagnostics(plan, compactSource);
  const alphaParamData = new Float32Array(Math.max(plan.alphaParamBytes / Float32Array.BYTES_PER_ELEMENT, 8));
  const tileRefData = new Uint32Array(Math.max(plan.maxTileRefs * 4, 4));
  const tileCoverageWeightData = new Float32Array(Math.max(plan.maxTileRefs, 1));
  const tileRefShapeParams = new Float32Array(Math.max(plan.maxTileRefs * 8, 8));
  const tileRefSplatIds = new Uint32Array(Math.max(plan.maxTileRefs, 1));
  const sourceDepthEvidence = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence",
    () => compactSourceBackToFrontDepthEvidence(attributes, viewMatrix)
  );
  const diagnostics = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/diagnostics",
    () => summarizeTileLocalDiagnostics({
      debugMode: TILE_LOCAL_DEBUG_MODE,
      plan,
      tileEntryCount: 0,
      tileHeaders: new Uint32Array(Math.max(plan.tileCount * 4, 4)),
      tileRefCustody,
      retentionAudit,
      tileCoverageWeights: tileCoverageWeightData,
      alphaParamData,
      sourceOpacities: effectiveOpacities,
      runtimeContributors: [],
      runtimeConicSources: splats,
    })
  );
  const retainedSourceConstruction = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/retained-source-evidence",
    () => buildWgslProjectedSourceFrontierConstructionEvidence(
      frontierSource,
      plan,
    )
  );
  const wgslProjectedRefStreamEvidence = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state/source-frontier/ref-stream-evidence",
    () => buildWgslProjectedRefStreamEvidence(compactSource, null)
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
    tileHeaderBuffer,
    tileHeaderData: new Uint32Array(Math.max(plan.tileCount * 4, 4)),
    tileRefBuffer,
    tileRefData,
    tileCoverageWeightBuffer,
    tileCoverageWeightData,
    tileBuildCountBuffer,
    tileScatterCursorBuffer,
    alphaParamBuffer,
    candidateSourceRecordsBuffer: undefined,
    candidateSourceGroupsBuffer: undefined,
    productionElectionComputeConsumer: undefined,
    productionElectionPrefixScatter: undefined,
    alphaParamData,
    candidateSourceInputs: undefined,
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
    gpuAlphaDensityCompensation,
    alphaDensityRoute: createSourceFrontierAlphaDensityRouteEvidence({ tileSizePx: plan.tileSizePx }),
    tileRefSplatIds,
    prepassSignature,
    debugMode: TILE_LOCAL_DEBUG_MODE,
    diagnostics,
    arenaBackend: "gpu",
    gpuArenaRuntime: null,
    gpuArenaProjectedContributors: [],
    gpuArenaProjectedConicSources: splats,
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
  projectedCandidateRecords: readonly GpuTileContributorArenaProjectedContributor[],
  productionElection: GpuProjectionRetentionCandidateSourceProductionElection,
): CompactRetainedSourceForRuntime {
  const retainedRecords = [...productionElection.retainedRecords].sort(compareCompactProjectionRetentionCompositorOrder);
  const droppedRecords = productionElection.droppedRecords;
  const projectedContributorCount = productionElection.projectedContributorCount;
  const droppedContributorCount = productionElection.droppedContributorCount;
  const effectiveMaxRefsPerTile = gpuLiveEffectiveRefsPerTile(plan);
  const projectedCountsByTile = productionElection.projectedCountsByTile;
  const retainedCountsByTile = productionElection.retainedCountsByTile;
  let cappedTileCount = 0;
  let saturatedRetainedTileCount = 0;
  let maxProjectedRefsPerTile = 0;
  let maxRetainedRefsPerTile = 0;
  for (let tileIndex = 0; tileIndex < retainedCountsByTile.length; tileIndex += 1) {
    const projectedCount = projectedCountsByTile[tileIndex] ?? 0;
    const retainedCount = retainedCountsByTile[tileIndex] ?? 0;
    maxProjectedRefsPerTile = Math.max(maxProjectedRefsPerTile, projectedCount);
    maxRetainedRefsPerTile = Math.max(maxRetainedRefsPerTile, retainedCount);
    if (projectedCount > retainedCount) {
      cappedTileCount += 1;
    }
    if (retainedCount >= effectiveMaxRefsPerTile) {
      saturatedRetainedTileCount += 1;
    }
  }
  return {
    projectedRecords: projectedCandidateRecords,
    retainedRecords,
    droppedRecords,
    candidateSplatIndexes: frontierSource.candidateSplatIndexes,
    projectedContributorCount,
    retainedContributorCount: retainedRecords.length,
    droppedContributorCount,
    projectedRefBudgetOverflow: frontierSource.projectedRefEstimate > TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES
      ? {
          projectedRefs: frontierSource.projectedRefEstimate,
          maxProjectedRefs: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
          mode: "wgsl-projected-source-frontier",
        }
      : null,
    compactSourceConstruction,
    tileRefCustody: {
      projectedTileEntryCount: projectedContributorCount,
      retainedTileEntryCount: retainedRecords.length,
      evictedTileEntryCount: droppedContributorCount,
      cappedTileCount,
      saturatedRetainedTileCount,
      maxProjectedRefsPerTile,
      maxRetainedRefsPerTile,
      headerRefCount: retainedRecords.length,
      headerAccountingMatches: true,
    },
    perPixelProjectedContributors: [],
    perPixelRetainedContributors: [],
  };
}

function compactRetainedSourceForWgslProjectedSourceFrontierShaderBuilt(
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
      maxProjectedRefsPerTile: 0,
      maxRetainedRefsPerTile: gpuLiveEffectiveRefsPerTile(plan),
      headerRefCount: 0,
      headerAccountingMatches: true,
    },
    perPixelProjectedContributors: [],
    perPixelRetainedContributors: [],
  };
}

function buildWgslSourceFrontierCandidateSources({
  frontierSource,
  attributes,
  effectiveOpacities,
  viewMatrix,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  maxRefsPerTile,
  frameTiming,
}: {
  readonly frontierSource: WgslProjectedSourceFrontierSource;
  readonly attributes: SplatAttributes;
  readonly effectiveOpacities: Float32Array;
  readonly viewMatrix: Float32Array;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly maxRefsPerTile: number;
  readonly frameTiming?: FrameTimingDraft;
}): WgslSourceFrontierCandidateSourceSubstrate {
  const buckets = compactStreamingTileBucketStore(frontierSource.tileCount);
  const { ranks, depths } = compactSourceBackToFrontDepthEvidence(attributes, viewMatrix);
  const contributorTemplates = frontierSource.splats.map((splat) => compactRuntimeContributorTemplateForSplat({
    splat,
    ranks,
    depths,
    attributes,
    effectiveOpacities,
  }));
  const streamLedger = compactSourceFrontierStreamLedger();
  let projectedIndex = 0;

  timeOptionalFrameStage(frameTiming, "wgsl-source-frontier-pack/stream-projected-tile-refs", () => {
    streamCompactProjectedTileRefs({
      splats: frontierSource.splats,
      viewportWidth,
      viewportHeight,
      tileSizePx,
      tileColumns,
      samplesPerAxis: TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES,
      maxTilesPerSplat: frontierSource.maxTilesPerSplat,
      ledger: streamLedger,
      onEntry({ splatOrdinal, tileIndex, tileX, tileY, coverageWeight, localSupportWeight }) {
        const template = contributorTemplates[splatOrdinal];
        const bucket = compactStreamingTileBucket(buckets, tileIndex);
        const candidateProjectedIndex = projectedIndex;
        projectedIndex += 1;
        const admission = compactSourceFrontierCandidateAdmission({
          bucket,
          template,
          tileIndex,
          coverageWeight,
          localSupportWeight: finiteOrZero(localSupportWeight),
          maxRefsPerTile,
        });
        if (!admission.needsMaterialization) {
          streamLedger.materializationSkipCount += 1;
          return;
        }
        const record = compactRuntimeContributorFromTemplate({
          template,
          projectedIndex: candidateProjectedIndex,
          tileIndex,
          tileX,
          tileY,
          coverageWeight,
          localSupportWeight,
        });

        if (compactRetainTopRecord(bucket.coverageRecords, record, maxRefsPerTile, compareCompactProjectionRetentionCoverageOrder)) {
          streamLedger.coverageRetainCount += 1;
        }
        if (compactRetainTopRecord(bucket.retentionRecords, record, Math.max(1, Math.floor(maxRefsPerTile / 2)), compareCompactProjectionRetentionPriority)) {
          streamLedger.retentionRetainCount += 1;
        }
        if (compactRetainTopRecord(bucket.occlusionRecords, record, Math.max(1, Math.floor(maxRefsPerTile / 2)), compareCompactProjectionOcclusionPriority)) {
          streamLedger.occlusionRetainCount += 1;
        }
        if (admission.needsSupportSamples) {
          compactRetainSupportSampleRecords({
            bucket,
            record,
            localSupportWeight: finiteOrZero(localSupportWeight),
            tileMinX: tileX * tileSizePx,
            tileMinY: tileY * tileSizePx,
            tileMaxX: Math.min(viewportWidth, (tileX + 1) * tileSizePx),
            tileMaxY: Math.min(viewportHeight, (tileY + 1) * tileSizePx),
            maxRefsPerTile,
            ledger: streamLedger,
          });
        } else {
          streamLedger.supportSampleCandidateSkipCount += 1;
          streamLedger.supportSampleCandidateSkippedEvaluationCount += COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS * COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS;
        }
      },
    });
  });

  const coverageRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const retentionRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const occlusionRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const supportSampleRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const supportSampleRecordGroups: (readonly GpuTileContributorArenaProjectedContributor[])[] = [];
  const projectedCandidateRecords: GpuTileContributorArenaProjectedContributor[] = [];

  timeOptionalFrameStage(frameTiming, "wgsl-source-frontier-pack/finalize-candidate-lists", () => {
    for (const bucket of compactStreamingTileBucketValues(buckets)) {
      const bucketSupportSampleRecordGroups = compactSupportSampleCandidateRecordGroups(bucket);
      const bucketSupportSampleRecords = compactSupportSampleCandidateRecords(bucketSupportSampleRecordGroups);
      projectedCandidateRecords.push(
        ...compactMergedTileCandidateRecords(bucket, bucketSupportSampleRecords).sort(compareCompactProjectionRetentionCoverageOrder),
      );
      coverageRecords.push(...bucket.coverageRecords.records);
      retentionRecords.push(...bucket.retentionRecords.records);
      occlusionRecords.push(...bucket.occlusionRecords.records);
      supportSampleRecords.push(...bucketSupportSampleRecords);
      supportSampleRecordGroups.push(...bucketSupportSampleRecordGroups);
    }
  });

  recordOptionalFrameStageDetail(frameTiming, "wgsl-source-frontier-pack/counts", {
    bucketCount: compactStreamingTileBucketCount(buckets),
    projectedTileRefs: projectedIndex,
    streamSplatCount: streamLedger.splatCount,
    streamDenseRowCount: streamLedger.denseRowCount,
    streamSparseRowCount: streamLedger.sparseRowCount,
    streamTileCandidateCount: streamLedger.tileCandidateCount,
    streamCoverageRejectCount: streamLedger.coverageRejectCount,
    streamPositiveCoverageCount: streamLedger.positiveCoverageCount,
    coverageRetainCount: streamLedger.coverageRetainCount,
    retentionRetainCount: streamLedger.retentionRetainCount,
    occlusionRetainCount: streamLedger.occlusionRetainCount,
    materializationSkipCount: streamLedger.materializationSkipCount,
    candidateRecordCount: projectedCandidateRecords.length,
    coverageRecordCount: coverageRecords.length,
    retentionRecordCount: retentionRecords.length,
    occlusionRecordCount: occlusionRecords.length,
    supportSampleEvaluationCount: streamLedger.supportSampleEvaluationCount,
    supportSampleCandidateSkipCount: streamLedger.supportSampleCandidateSkipCount,
    supportSampleCandidateSkippedEvaluationCount: streamLedger.supportSampleCandidateSkippedEvaluationCount,
    supportSampleSkipCount: streamLedger.supportSampleSkipCount,
    supportSampleSkippedEvaluationCount: streamLedger.supportSampleSkippedEvaluationCount,
    supportSamplePositiveWeightCount: streamLedger.supportSamplePositiveWeightCount,
    supportSampleRetainCount: streamLedger.supportSampleRetainCount,
    supportSampleInsertCount: streamLedger.supportSampleInsertCount,
    supportSampleReplaceCount: streamLedger.supportSampleReplaceCount,
    supportSampleRecordCount: supportSampleRecords.length,
    supportSampleGroupCount: supportSampleRecordGroups.length,
  });

  return {
    candidateSources: {
      coverageRecords,
      retentionRecords,
      occlusionRecords,
      supportSampleRecords,
      supportSampleRecordGroups,
    },
    projectedCandidateRecords,
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
  const contributorTemplates = timeOptionalFrameStage(
    frameTiming,
    "compact-source-stream-retention/build-contributor-templates",
    () => splats.map((splat) => compactRuntimeContributorTemplateForSplat({
      splat,
      ranks,
      depths,
      attributes,
      effectiveOpacities,
    }))
  );
  const compactSourceCandidateSplatIndexes = new Uint32Array(splats.map((splat) => splat.splatIndex));
  const buckets = new Map<number, CompactStreamingTileBucket>();
  const anchorProjectedRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const tileHeaderU32 = new Uint32Array(Math.max(0, tileCount * 8));
  const streamLedger = compactSourceFrontierStreamLedger();
  let projectedIndex = 0;

  timeOptionalFrameStage(frameTiming, "compact-source-stream-retention", () => {
    timeOptionalFrameStage(frameTiming, "compact-source-stream-retention/stream-projected-tile-refs", () => {
      streamCompactProjectedTileRefs({
        splats,
        viewportWidth,
        viewportHeight,
        tileSizePx,
        tileColumns,
        samplesPerAxis,
        onlyTileIndexes: retainOnlyAnchorTiles ? sourceTileIndexes : null,
        maxTilesPerSplat,
        ledger: streamLedger,
        onEntry({ splatOrdinal, tileIndex, tileX, tileY, coverageWeight, localSupportWeight }) {
          const currentProjectedIndex = projectedIndex;
          projectedIndex += 1;
          projectedCounts[tileIndex] += 1;
          const shouldRetainTile = !retainOnlyAnchorTiles || sourceTileIndexes.has(tileIndex);
          const shouldTraceTile = traceTileIndexes.has(tileIndex);
          if (!shouldRetainTile && !shouldTraceTile) {
            return;
          }
          const template = contributorTemplates[splatOrdinal];
          const bucket = shouldRetainTile ? compactStreamingTileBucket(buckets, tileIndex) : null;
          const admission = bucket
            ? compactSourceFrontierCandidateAdmission({
                bucket,
                template,
                tileIndex,
                coverageWeight,
                localSupportWeight: finiteOrZero(localSupportWeight),
                maxRefsPerTile,
              })
            : null;
          if (admission && !admission.needsMaterialization && !shouldTraceTile) {
            streamLedger.materializationSkipCount += 1;
            return;
          }
          const record = compactRuntimeContributorFromTemplate({
            template,
            projectedIndex: currentProjectedIndex,
            tileIndex,
            tileX,
            tileY,
            coverageWeight,
            localSupportWeight,
          });
          if (shouldTraceTile) {
            anchorProjectedRecords.push(record);
          }
          if (!bucket || (admission && !admission.needsMaterialization)) {
            return;
          }
          if (compactRetainTopRecord(bucket.coverageRecords, record, maxRefsPerTile, compareCompactProjectionRetentionCoverageOrder)) {
            streamLedger.coverageRetainCount += 1;
          }
          if (compactRetainTopRecord(bucket.retentionRecords, record, Math.max(1, Math.floor(maxRefsPerTile / 2)), compareCompactProjectionRetentionPriority)) {
            streamLedger.retentionRetainCount += 1;
          }
          if (compactRetainTopRecord(bucket.occlusionRecords, record, Math.max(1, Math.floor(maxRefsPerTile / 2)), compareCompactProjectionOcclusionPriority)) {
            streamLedger.occlusionRetainCount += 1;
          }
          if (admission?.needsSupportSamples) {
            compactRetainSupportSampleRecords({
              bucket,
              record,
              localSupportWeight: finiteOrZero(localSupportWeight),
              tileMinX: tileX * tileSizePx,
              tileMinY: tileY * tileSizePx,
              tileMaxX: Math.min(viewportWidth, (tileX + 1) * tileSizePx),
              tileMaxY: Math.min(viewportHeight, (tileY + 1) * tileSizePx),
              maxRefsPerTile,
              ledger: streamLedger,
            });
          } else {
            streamLedger.supportSampleCandidateSkipCount += 1;
            streamLedger.supportSampleCandidateSkippedEvaluationCount += COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS * COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS;
          }
        },
      });
    });
  });
  recordOptionalFrameStageDetail(frameTiming, "compact-source-stream-retention/counts", {
    bucketCount: compactStreamingTileBucketCount(buckets),
    projectedTileRefs: projectedIndex,
    streamSplatCount: streamLedger.splatCount,
    streamDenseRowCount: streamLedger.denseRowCount,
    streamSparseRowCount: streamLedger.sparseRowCount,
    streamTileCandidateCount: streamLedger.tileCandidateCount,
    streamCoverageRejectCount: streamLedger.coverageRejectCount,
    streamPositiveCoverageCount: streamLedger.positiveCoverageCount,
    coverageRetainCount: streamLedger.coverageRetainCount,
    retentionRetainCount: streamLedger.retentionRetainCount,
    occlusionRetainCount: streamLedger.occlusionRetainCount,
    streamMaterializationSkipCount: streamLedger.materializationSkipCount,
    supportSampleEvaluationCount: streamLedger.supportSampleEvaluationCount,
    supportSampleCandidateSkipCount: streamLedger.supportSampleCandidateSkipCount,
    supportSampleCandidateSkippedEvaluationCount: streamLedger.supportSampleCandidateSkippedEvaluationCount,
    supportSampleSkipCount: streamLedger.supportSampleSkipCount,
    supportSampleSkippedEvaluationCount: streamLedger.supportSampleSkippedEvaluationCount,
    supportSamplePositiveWeightCount: streamLedger.supportSamplePositiveWeightCount,
    supportSampleRetainCount: streamLedger.supportSampleRetainCount,
    supportSampleInsertCount: streamLedger.supportSampleInsertCount,
    supportSampleReplaceCount: streamLedger.supportSampleReplaceCount,
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
    accountingSource: "cpu-compact-source",
    projectedRefs: compactSource.projectedContributorCount,
    retainedRefs: compactSource.retainedContributorCount,
    droppedRefs: compactSource.droppedContributorCount,
  };
}

function buildWgslProjectedSourceFrontierConstructionEvidence(
  frontierSource: WgslProjectedSourceFrontierSource,
  plan: GpuTileCoveragePlan,
): RetainedSourceConstructionEvidence {
  const nextGpuOffloadStage = "live-wgsl-production-candidate-source-identity";
  return {
    requestedSourceBackend: "gpu-retained-source-substrate",
    effectiveSourceBackend: "wgsl-projected-ref-stream-source-frontier",
    oracleBackend: "cpu-reference",
    runtimeConsumerBackend: "tile-local-visible-gaussian-compositor",
    sourceHandoff: "wgsl-projected-ref-stream-gpu-buffers",
    falseClosureGuard: "shader-built-source-frontier-is-not-production-pool-seat-election-or-visual-quality-closure",
    cpuOwnedStages: [
      "wgsl-source-frontier-project-splats",
      "wgsl-source-frontier-estimate-ref-budget",
    ],
    gpuReadyStages: [
      "wgsl-projected-ref-stream-source-table",
      "wgsl-projected-ref-stream-build-tile-refs",
      "wgsl-source-frontier-depth-aware-retention-election",
      "wgsl-source-frontier-production-weighted-retention-score",
      "wgsl-source-frontier-occlusion-density-retention-score",
      "wgsl-source-frontier-bounded-pool-seat-election",
      "wgsl-source-frontier-depth-bucket-compositor-order",
      "wgsl-source-frontier-retained-row-prefix-scatter",
      "tile-local-visible-gaussian-compositor",
    ],
    nextGpuOffloadStage,
    accountingSource: "gpu-ref-stats-readback-pending",
    projectedRefs: frontierSource.projectedRefEstimate,
    retainedRefs: 0,
    droppedRefs: 0,
    retainedBudgetRefs: plan.maxTileRefs,
    maxRefsPerTile: gpuLiveEffectiveRefsPerTile(plan),
    currentCompositorBinding: "wgsl-projected-ref-stream-shader-built-current-compositor-source",
    retainedRows: pendingWgslSourceFrontierRetainedRowsEvidence(plan),
    candidateSourceIdentity: sourceFrontierCandidateSourceIdentityEvidence(),
    candidateSourceRuntimeBuffers: sourceFrontierCandidateSourceRuntimeBufferEvidence({}),
    productionElectionConsumer: sourceFrontierProductionElectionConsumerEvidence(
      undefined,
      sourceFrontierCandidateSourceRuntimeBufferEvidence({}),
      undefined,
    ),
    productionElectionPrefixScatter: sourceFrontierProductionElectionPrefixScatterEvidence(
      undefined,
      undefined,
    ),
    frontierBlockedStages: [
      nextGpuOffloadStage,
    ],
  };
}

function sourceFrontierProductionElectionPrefixScatterEvidence(
  productionElectionComputeConsumer: GpuProductionElectionConsumerContract | undefined,
  productionElectionPrefixScatter: GpuProductionElectionPrefixScatterContract | undefined,
): SourceFrontierProductionElectionPrefixScatterEvidence {
  if (productionElectionComputeConsumer && productionElectionPrefixScatter) {
    return {
      status: productionElectionPrefixScatter.status,
      source: productionElectionPrefixScatter.source,
      computeConsumerSource: productionElectionComputeConsumer.source,
      recordCount: productionElectionPrefixScatter.recordCount,
      groupCount: productionElectionPrefixScatter.groupCount,
      retainedRecordCount: productionElectionPrefixScatter.retainedRecordCount,
      tileCount: productionElectionPrefixScatter.tileCount,
      consumedComputeConsumer: productionElectionPrefixScatter.consumedComputeConsumer,
      consumedRuntimeBuffers: productionElectionPrefixScatter.consumedRuntimeBuffers,
      outputBuffers: productionElectionPrefixScatter.outputBuffers,
      outputWitness: productionElectionPrefixScatter.outputWitness,
      currentCompositorBinding: productionElectionPrefixScatter.currentCompositorBinding,
      nextConsumerBoundary: productionElectionPrefixScatter.nextConsumerBoundary,
      falseClosureGuard: productionElectionPrefixScatter.falseClosureGuard,
    };
  }
  return {
    status: "blocked-missing-production-election-prefix-scatter-input",
    source: "wgsl-production-election-prefix-scatter",
    computeConsumerSource: productionElectionComputeConsumer?.source ?? "missing-production-election-compute-consumer",
    recordCount: productionElectionComputeConsumer?.recordCount ?? 0,
    groupCount: productionElectionComputeConsumer?.groupCount ?? 0,
    retainedRecordCount: productionElectionComputeConsumer?.retainedRecordCount ?? 0,
    tileCount: 0,
    currentCompositorBinding: "blocked-missing-production-election-prefix-scatter-input",
    nextConsumerBoundary: "wgsl-production-election-prefix-scatter",
    falseClosureGuard: "missing-production-election-prefix-scatter-input-blocks-compositor-consumption-claim",
  };
}

function sourceFrontierProductionElectionConsumerEvidence(
  productionElection: GpuProjectionRetentionCandidateSourceProductionElection | undefined,
  runtimeBuffers: SourceFrontierCandidateSourceRuntimeBufferEvidence,
  productionElectionComputeConsumer?: GpuProductionElectionConsumerContract,
): SourceFrontierProductionElectionConsumerEvidence {
  if (
    productionElection &&
    runtimeBuffers.status === "runtime-state-buffers-present" &&
    productionElectionComputeConsumer
  ) {
    return {
      status: productionElectionComputeConsumer.status,
      source: productionElectionComputeConsumer.source,
      productionElectionStatus: productionElection.status,
      runtimeBufferSource: "candidate-source-runtime-state-buffers",
      recordCount: productionElectionComputeConsumer.recordCount,
      groupCount: productionElectionComputeConsumer.groupCount,
      retainedRecordCount: productionElectionComputeConsumer.retainedRecordCount,
      crossPoolDuplicateSuppressedCount:
        productionElectionComputeConsumer.crossPoolDuplicateSuppressedCount,
      sourceInputConsumption: productionElection.sourceInputConsumption,
      consumedRuntimeBuffers: productionElectionComputeConsumer.consumedRuntimeBuffers,
      outputWitness: productionElectionComputeConsumer.outputWitness,
      currentCompositorBinding: productionElectionComputeConsumer.currentCompositorBinding,
      nextConsumerBoundary: productionElectionComputeConsumer.nextConsumerBoundary,
      falseClosureGuard: productionElectionComputeConsumer.falseClosureGuard,
    };
  }
  if (productionElection && runtimeBuffers.status === "runtime-state-buffers-present") {
    return {
      status: "narrow-consumer-contract-present",
      source: "wgsl-source-frontier-production-election-consumer",
      productionElectionStatus: productionElection.status,
      runtimeBufferSource: "candidate-source-runtime-state-buffers",
      recordCount: productionElection.recordCount,
      groupCount: productionElection.groupCount,
      retainedRecordCount: productionElection.retainedRecords.length,
      crossPoolDuplicateSuppressedCount: productionElection.crossPoolDuplicateSuppressedCount,
      sourceInputConsumption: productionElection.sourceInputConsumption,
      currentCompositorBinding: "forbidden-current-compositor-bind-group-full",
      nextConsumerBoundary: "wgsl-production-election-compute-consumer",
      falseClosureGuard: "production-election-consumer-contract-is-not-current-compositor-bind-group-consumption",
    };
  }
  return {
    status: "blocked-missing-production-election-consumer-input",
    source: "wgsl-source-frontier-production-election-consumer",
    runtimeBufferSource: "missing-candidate-source-runtime-state-buffers",
    recordCount: productionElection?.recordCount ?? runtimeBuffers.recordCount,
    groupCount: productionElection?.groupCount ?? runtimeBuffers.groupCount,
    retainedRecordCount: productionElection?.retainedRecords.length ?? 0,
    crossPoolDuplicateSuppressedCount: productionElection?.crossPoolDuplicateSuppressedCount ?? 0,
    sourceInputConsumption: productionElection?.sourceInputConsumption ?? [],
    currentCompositorBinding: "blocked-missing-production-election-consumer-input",
    nextConsumerBoundary: "candidate-source-runtime-buffer-allocation",
    falseClosureGuard: "missing-production-election-consumer-input-blocks-narrow-consumer-claim",
  };
}

function sourceFrontierCandidateSourceRuntimeBufferEvidence(
  source: {
    readonly candidateSourceInputs?: GpuProjectionRetentionCandidateSourceInputs;
    readonly candidateSourceRecordsBuffer?: GPUBuffer;
    readonly candidateSourceGroupsBuffer?: GPUBuffer;
  },
): SourceFrontierCandidateSourceRuntimeBufferEvidence {
  const candidateSourceInputs = source.candidateSourceInputs;
  if (
    candidateSourceInputs &&
    candidateSourceInputs.recordCount > 0 &&
    source.candidateSourceRecordsBuffer &&
    source.candidateSourceGroupsBuffer
  ) {
    return {
      status: "runtime-state-buffers-present",
      source: "wgsl-source-frontier-candidate-source-runtime-buffers",
      recordCount: candidateSourceInputs.recordCount,
      groupCount: candidateSourceInputs.groupCount,
      presentRuntimeBuffers: [
        "candidate-source-records-storage-buffer",
        "candidate-source-groups-storage-buffer",
      ],
      currentCompositorBinding: "forbidden-current-compositor-bind-group-full",
      nextConsumer: "narrow-production-election-consumer",
      falseClosureGuard: "candidate-source-runtime-buffers-do-not-imply-current-compositor-bind-group-consumption",
    };
  }
  return {
    status: "blocked-missing-runtime-state-buffers",
    source: "wgsl-source-frontier-candidate-source-runtime-buffers",
    recordCount: candidateSourceInputs?.recordCount ?? 0,
    groupCount: candidateSourceInputs?.groupCount ?? 0,
    presentRuntimeBuffers: [],
    currentCompositorBinding: "blocked-missing-runtime-state-buffers",
    nextConsumer: "candidate-source-runtime-buffer-allocation",
    falseClosureGuard: "missing-candidate-source-runtime-buffers-block-production-election-consumer",
  };
}

function sourceFrontierCandidateSourceIdentityEvidence(
  candidateSourceInputs?: GpuProjectionRetentionCandidateSourceInputs,
  productionElection?: GpuProjectionRetentionCandidateSourceProductionElection,
  candidateSourceClassMasks?: Uint32Array | null,
): SourceFrontierCandidateSourceIdentityEvidence {
  if (candidateSourceInputs && productionElection && candidateSourceInputs.recordCount > 0) {
    return {
      status: "production-election-contract-consumed",
      source: "wgsl-source-frontier-candidate-source-identity-contract",
      availableIdentity: "record-group-production-election-contract",
      consumptionPath: "candidate-source-record-group-production-election-contract",
      requiredWgslInputs: ["live-wgsl-production-election-prefix-scatter"],
      presentWgslInputs: [
        "retention-candidate-records",
        "occlusion-candidate-records",
        "coverage-candidate-records",
        "support-sample-record-groups",
        "projected-contributor-score-table",
      ],
      sourceInputConsumption: productionElection.sourceInputConsumption,
      recordCount: productionElection.recordCount,
      groupCount: productionElection.groupCount,
      retainedRecordCount: productionElection.retainedRecords.length,
      crossPoolDuplicateSuppressedCount: productionElection.crossPoolDuplicateSuppressedCount,
      classesPresent: candidateSourceInputs.classesPresent,
      falseClosureGuard: "packed-production-election-contract-is-not-live-wgsl-compositor-consumption",
    };
  }
  if (candidateSourceClassMasks?.some((mask) => mask !== 0)) {
    return {
      status: "class-mask-consumed-record-groups-not-yet-consumed",
      source: "wgsl-source-frontier-candidate-source-identity-contract",
      availableIdentity: "source-index-table-class-mask",
      consumptionPath: "source-index-table-class-mask",
      requiredWgslInputs: ["candidate-source-record-group-election-sidecar"],
      presentWgslInputs: ["source-index-table-class-masks"],
      sourceIndexTableClassMaskSource: "source-index-table-class-mask",
      recordCount: candidateSourceClassMasks.length,
      falseClosureGuard: "source-index-class-masks-do-not-consume-full-candidate-record-groups",
    };
  }
  if (candidateSourceInputs && candidateSourceInputs.recordCount > 0) {
    return {
      status: "record-group-election-sidecar-consumed",
      source: "wgsl-source-frontier-candidate-source-identity-contract",
      availableIdentity: "class-tagged-wgsl-candidate-source-inputs",
      consumptionPath: "candidate-source-record-group-election-sidecar",
      requiredWgslInputs: ["live-wgsl-production-election-consumer"],
      presentWgslInputs: [
        "retention-candidate-records",
        "occlusion-candidate-records",
        "coverage-candidate-records",
        "support-sample-record-groups",
      ],
      recordCount: candidateSourceInputs.recordCount,
      groupCount: candidateSourceInputs.groupCount,
      classesPresent: candidateSourceInputs.classesPresent,
      falseClosureGuard: "candidate-source-sidecar-is-not-production-retention-election",
    };
  }
  return {
    status: "blocked-missing-wgsl-candidate-source-inputs",
    source: "wgsl-source-frontier-candidate-source-identity-contract",
    availableIdentity: "selected-slot-pool-only",
    fallbackIdentityPath: "selected-pool-derived-class-mask",
    sourceIndexTableClassMaskSource: "blocked-missing-wgsl-candidate-source-inputs",
    retirementBlocker: "live-wgsl-production-candidate-source-identity",
    requiredWgslInputs: [
      "retention-candidate-records",
      "occlusion-candidate-records",
      "coverage-candidate-records",
      "support-sample-record-groups",
    ],
    falseClosureGuard: "bounded-pool-seats-are-not-production-candidate-source-identity",
  };
}

function pendingWgslSourceFrontierRetainedRowsEvidence(
  plan: GpuTileCoveragePlan,
): SourceFrontierRetainedRowsEvidence {
  return {
    status: "pending",
    source: "gpu-compositor-input-readback",
    payloadEncoding: "source-frontier-score",
    falseClosureGuard: "source-frontier-retained-row-readback-is-production-gpu-prefix-scatter-not-production-retention-election",
    rowFields: sourceFrontierRetainedRowFields(),
    tileCount: plan.tileCount,
    retainedBudgetRefs: plan.maxTileRefs,
    maxRefsPerTile: gpuLiveEffectiveRefsPerTile(plan),
    projectedRows: 0,
    retainedRows: 0,
    droppedRows: 0,
    nonEmptyTiles: 0,
    saturatedTiles: 0,
    maxRowsPerTile: 0,
    scorePackedRows: 0,
    maxRetentionScore: 0,
  };
}

function blockedWgslSourceFrontierRetainedRowsEvidence({
  frameId,
  plan,
  blockedReason,
}: {
  readonly frameId: number;
  readonly plan: GpuTileCoveragePlan;
  readonly blockedReason: string;
}): SourceFrontierRetainedRowsEvidence {
  return {
    ...pendingWgslSourceFrontierRetainedRowsEvidence(plan),
    status: "blocked",
    frameId,
    blockedReason,
  };
}

function sourceFrontierCompositorReadLimit({
  headerRefCount,
  gpuScatterCount,
  tileCapacity,
}: {
  readonly headerRefCount: number;
  readonly gpuScatterCount: number;
  readonly tileCapacity: number;
}): number {
  if (headerRefCount > 0) {
    return headerRefCount;
  }
  if (gpuScatterCount > 0) {
    return Math.min(gpuScatterCount, tileCapacity);
  }
  return 0;
}

function summarizeWgslSourceFrontierRetainedRowsFromCompositorInputReadback({
  frameId,
  plan,
  tileHeaders,
  tileRefs,
  tileCoverageWeights,
  tileScatterCursors,
}: {
  readonly frameId: number;
  readonly plan: GpuTileCoveragePlan;
  readonly tileHeaders: Uint32Array;
  readonly tileRefs: Uint32Array;
  readonly tileCoverageWeights: Float32Array;
  readonly tileScatterCursors: Uint32Array;
}): SourceFrontierRetainedRowsEvidence {
  const tileCapacity = gpuLiveEffectiveRefsPerTile(plan);
  const headerStride = GPU_TILE_COVERAGE_TILE_HEADER_BYTES / Uint32Array.BYTES_PER_ELEMENT;
  const refStride = GPU_TILE_COVERAGE_TILE_REF_BYTES / Uint32Array.BYTES_PER_ELEMENT;
  let projectedRows = 0;
  let retainedRows = 0;
  let droppedRows = 0;
  let nonEmptyTiles = 0;
  let saturatedTiles = 0;
  let maxRowsPerTile = 0;
  let scorePackedRows = 0;
  let maxRetentionScore = 0;

  for (let tileIndex = 0; tileIndex < plan.tileCount; tileIndex += 1) {
    const headerBase = tileIndex * headerStride;
    const firstRefIndex = tileHeaders[headerBase] ?? tileIndex * tileCapacity;
    const headerRefCount = tileHeaders[headerBase + 1] ?? 0;
    const projectedTileRows = tileScatterCursors[tileIndex] ?? 0;
    const scanTileRows = Math.min(
      sourceFrontierCompositorReadLimit({
        headerRefCount,
        gpuScatterCount: projectedTileRows,
        tileCapacity,
      }),
      Math.max(0, plan.maxTileRefs - firstRefIndex),
    );
    let scorePackedTileRows = 0;
    projectedRows += projectedTileRows;
    if (projectedTileRows > 0) {
      nonEmptyTiles += 1;
    }
    if (projectedTileRows >= tileCapacity) {
      saturatedTiles += 1;
    }
    for (let layer = 0; layer < scanTileRows; layer += 1) {
      const refIndex = firstRefIndex + layer;
      if (refIndex >= plan.maxTileRefs) {
        break;
      }
      const refBase = refIndex * refStride;
      const splatIndex = tileRefs[refBase] ?? plan.splatCount;
      const retentionScore = tileRefs[refBase + 1] ?? 0;
      const tileCoverageWeight = tileCoverageWeights[refIndex] ?? 0;
      if (splatIndex < plan.splatCount && (retentionScore > 0 || tileCoverageWeight > 0)) {
        scorePackedTileRows += 1;
        scorePackedRows += 1;
        maxRetentionScore = Math.max(maxRetentionScore, retentionScore);
      }
    }
    retainedRows += scorePackedTileRows;
    droppedRows += Math.max(0, projectedTileRows - scorePackedTileRows);
    maxRowsPerTile = Math.max(maxRowsPerTile, scorePackedTileRows);
  }

  return {
    status: "present",
    source: "gpu-compositor-input-readback",
    payloadEncoding: "source-frontier-score",
    falseClosureGuard: "source-frontier-retained-row-readback-is-production-gpu-prefix-scatter-not-production-retention-election",
    rowFields: sourceFrontierRetainedRowFields(),
    frameId,
    tileCount: plan.tileCount,
    retainedBudgetRefs: plan.maxTileRefs,
    maxRefsPerTile: tileCapacity,
    projectedRows,
    retainedRows,
    droppedRows,
    nonEmptyTiles,
    saturatedTiles,
    maxRowsPerTile,
    scorePackedRows,
    maxRetentionScore,
  };
}

function sourceFrontierRetainedRowsFromRefStatsReadback(
  readback: TileLocalRefStatsReadback,
): SourceFrontierRetainedRowsEvidence {
  return {
    status: readback.status,
    source: "gpu-ref-stats-readback",
    payloadEncoding: "source-frontier-score",
    falseClosureGuard: "source-frontier-ref-stats-readback-is-row-accounting-not-payload-readback",
    rowFields: [],
    frameId: readback.frameId,
    tileCount: readback.tileCount,
    retainedBudgetRefs: readback.allocatedRefs,
    maxRefsPerTile: readback.tileCapacity,
    projectedRows: readback.status === "present" ? readback.projectedScatterRefs : 0,
    retainedRows: readback.status === "present" ? readback.retainedRefs : 0,
    droppedRows: readback.status === "present" ? readback.droppedRefs : 0,
    nonEmptyTiles: readback.status === "present" ? readback.nonEmptyTiles : 0,
    saturatedTiles: readback.status === "present" ? readback.saturatedTiles : 0,
    maxRowsPerTile: readback.status === "present" ? readback.maxRefsPerTile : 0,
    scorePackedRows: 0,
    maxRetentionScore: 0,
    blockedReason: readback.blockedReason,
  };
}

function sourceFrontierRetainedRowFields(): readonly string[] {
  return [
    "splatIndex",
    "retentionScore",
    "tileIndex",
    "alphaParamIndex",
    "coverageWeight",
  ];
}

function refreshWgslSourceFrontierRetainedSourceConstructionEvidence(
  state: TileLocalSceneState,
  readback: TileLocalRefStatsReadback
): void {
  const retainedSourceConstruction = state.retainedSourceConstruction;
  if (
    !retainedSourceConstruction ||
    retainedSourceConstruction.effectiveSourceBackend !== "wgsl-projected-ref-stream-source-frontier"
  ) {
    return;
  }
  if (
    retainedSourceConstruction.accountingSource === "gpu-compositor-input-readback-present" &&
    retainedSourceConstruction.retainedRows?.status === "present" &&
    retainedSourceConstruction.retainedRows.frameId === readback.frameId
  ) {
    return;
  }
  if (readback.status === "blocked") {
    state.retainedSourceConstruction = {
      ...retainedSourceConstruction,
      accountingSource: "gpu-ref-stats-readback-blocked",
      retainedBudgetRefs: readback.allocatedRefs,
      maxRefsPerTile: readback.tileCapacity,
    };
    return;
  }
  if (readback.status !== "present") {
    state.retainedSourceConstruction = {
      ...retainedSourceConstruction,
      accountingSource: "gpu-ref-stats-readback-pending",
      retainedBudgetRefs: readback.allocatedRefs,
      maxRefsPerTile: readback.tileCapacity,
    };
    return;
  }
  state.retainedSourceConstruction = {
    ...retainedSourceConstruction,
    accountingSource: "gpu-ref-stats-readback-present",
    projectedRefs: readback.projectedScatterRefs,
    retainedRefs: readback.retainedRefs,
    droppedRefs: readback.droppedRefs,
    retainedBudgetRefs: readback.allocatedRefs,
    maxRefsPerTile: readback.tileCapacity,
    retainedRows: sourceFrontierRetainedRowsFromRefStatsReadback(readback),
  };
}

function refreshWgslSourceFrontierRetainedRowsEvidence(
  state: TileLocalSceneState,
  retainedRowsReadback: SourceFrontierRetainedRowsEvidence,
): void {
  const retainedSourceConstruction = state.retainedSourceConstruction;
  if (
    !retainedSourceConstruction ||
    retainedSourceConstruction.effectiveSourceBackend !== "wgsl-projected-ref-stream-source-frontier"
  ) {
    return;
  }
  if (retainedRowsReadback.status === "present") {
    const candidateSourceRuntimeBuffers = sourceFrontierCandidateSourceRuntimeBufferEvidence(state);
    const nextGpuOffloadStage = state.productionElectionPrefixScatter
      ? "live-wgsl-production-election-compositor-consumption"
      : state.productionElectionComputeConsumer
      ? "live-wgsl-production-election-prefix-scatter"
      : candidateSourceRuntimeBuffers.status === "runtime-state-buffers-present"
        ? "live-wgsl-production-candidate-source-election"
        : "live-wgsl-production-candidate-source-identity";
    const nextBlockedStage = nextGpuOffloadStage;
    state.retainedSourceConstruction = {
      ...retainedSourceConstruction,
      accountingSource: "gpu-compositor-input-readback-present",
      retainedRows: retainedRowsReadback,
      retainedRefs: retainedRowsReadback.retainedRows,
      droppedRefs: retainedRowsReadback.droppedRows,
      retainedBudgetRefs: retainedRowsReadback.retainedBudgetRefs,
      maxRefsPerTile: retainedRowsReadback.maxRefsPerTile,
      candidateSourceRuntimeBuffers,
      nextGpuOffloadStage,
      currentCompositorBinding: "wgsl-projected-ref-stream-shader-built-current-compositor-source",
      frontierBlockedStages: [
        nextBlockedStage,
      ],
    };
    return;
  }
  state.retainedSourceConstruction = {
    ...retainedSourceConstruction,
    retainedRows: retainedRowsReadback,
    nextGpuOffloadStage: "live-wgsl-production-candidate-source-identity",
    currentCompositorBinding: "wgsl-projected-ref-stream-shader-built-current-compositor-source",
    frontierBlockedStages: [
      "live-wgsl-production-candidate-source-identity",
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
      sourceRole: "visible-source-frontier-gpu-retention-election",
      runtimeConsumerBackend: "tile-local-visible-gaussian-compositor",
      falseClosureGuard: "wgsl-source-frontier-gpu-retention-election-is-score-bucketed-not-exact-parity-or-production-retention",
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

type CompactStreamingTileBucketStore =
  | Map<number, CompactStreamingTileBucket>
  | (CompactStreamingTileBucket | undefined)[];

interface CompactRetainedRecordList {
  readonly records: GpuTileContributorArenaProjectedContributor[];
  worstIndex: number;
}

type MutableGpuTileContributorArenaProjectedContributor = {
  -readonly [K in keyof GpuTileContributorArenaProjectedContributor]: GpuTileContributorArenaProjectedContributor[K];
};

type CompactSupportSampleRetainResult = "none" | "insert" | "replace";

interface CompactSourceFrontierStreamLedger {
  splatCount: number;
  denseRowCount: number;
  sparseRowCount: number;
  tileCandidateCount: number;
  coverageRejectCount: number;
  positiveCoverageCount: number;
  coverageRetainCount: number;
  retentionRetainCount: number;
  occlusionRetainCount: number;
  materializationSkipCount: number;
  supportSampleEvaluationCount: number;
  supportSampleCandidateSkipCount: number;
  supportSampleCandidateSkippedEvaluationCount: number;
  supportSampleSkipCount: number;
  supportSampleSkippedEvaluationCount: number;
  supportSamplePositiveWeightCount: number;
  supportSampleRetainCount: number;
  supportSampleInsertCount: number;
  supportSampleReplaceCount: number;
}

interface CompactSourceFrontierCandidateAdmission {
  readonly needsMaterialization: boolean;
  readonly needsSupportSamples: boolean;
}

function compactSourceFrontierStreamLedger(): CompactSourceFrontierStreamLedger {
  return {
    splatCount: 0,
    denseRowCount: 0,
    sparseRowCount: 0,
    tileCandidateCount: 0,
    coverageRejectCount: 0,
    positiveCoverageCount: 0,
    coverageRetainCount: 0,
    retentionRetainCount: 0,
    occlusionRetainCount: 0,
    materializationSkipCount: 0,
    supportSampleEvaluationCount: 0,
    supportSampleCandidateSkipCount: 0,
    supportSampleCandidateSkippedEvaluationCount: 0,
    supportSampleSkipCount: 0,
    supportSampleSkippedEvaluationCount: 0,
    supportSamplePositiveWeightCount: 0,
    supportSampleRetainCount: 0,
    supportSampleInsertCount: 0,
    supportSampleReplaceCount: 0,
  };
}

function compactRetainedRecordList(): CompactRetainedRecordList {
  return {
    records: [],
    worstIndex: 0,
  };
}

function compactStreamingTileBucketStore(tileCount: number): CompactStreamingTileBucketStore {
  return new Array(Math.max(0, Math.floor(tileCount)));
}

function* compactStreamingTileBucketValues(
  buckets: CompactStreamingTileBucketStore,
): Iterable<CompactStreamingTileBucket> {
  if (Array.isArray(buckets)) {
    for (const bucket of buckets) {
      if (bucket) {
        yield bucket;
      }
    }
    return;
  }
  yield* buckets.values();
}

function compactStreamingTileBucketCount(buckets: CompactStreamingTileBucketStore): number {
  if (!Array.isArray(buckets)) {
    return buckets.size;
  }
  let count = 0;
  for (const bucket of buckets) {
    if (bucket) {
      count += 1;
    }
  }
  return count;
}

function compactStreamingTileBucket(
  buckets: CompactStreamingTileBucketStore,
  tileIndex: number,
): CompactStreamingTileBucket {
  if (Array.isArray(buckets)) {
    let bucket = buckets[tileIndex];
    if (!bucket) {
      bucket = {
        coverageRecords: compactRetainedRecordList(),
        retentionRecords: compactRetainedRecordList(),
        occlusionRecords: compactRetainedRecordList(),
        supportSampleRecords: compactSupportSampleRecordLists(),
      };
      buckets[tileIndex] = bucket;
    }
    return bucket;
  }
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
): boolean {
  const records = recordList.records;
  if (records.length < limit) {
    records.push(record);
    if (records.length === 1 || compareRecords(record, records[recordList.worstIndex]) > 0) {
      recordList.worstIndex = records.length - 1;
    }
    return true;
  }

  if (compareRecords(record, records[recordList.worstIndex]) >= 0) {
    return false;
  }

  records[recordList.worstIndex] = record;
  recordList.worstIndex = compactRetainedRecordListWorstIndex(records, compareRecords);
  return true;
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

function compactSourceFrontierCandidateAdmission({
  bucket,
  template,
  tileIndex,
  coverageWeight,
  localSupportWeight,
  maxRefsPerTile,
}: {
  readonly bucket: CompactStreamingTileBucket;
  readonly template: CompactRuntimeContributorTemplate;
  readonly tileIndex: number;
  readonly coverageWeight: number;
  readonly localSupportWeight: number;
  readonly maxRefsPerTile: number;
}): CompactSourceFrontierCandidateAdmission {
  const safeCoverageWeight = Math.max(0, finiteOrZero(coverageWeight));
  const safeLocalSupportWeight = Math.max(0, finiteOrZero(localSupportWeight));
  const retentionSupportWeight = Math.max(safeCoverageWeight, safeLocalSupportWeight);
  const opacity = Math.max(0, finiteOrZero(template.opacity));
  const luminance = Math.max(0, finiteOrZero(template.luminance));
  const retentionWeight = retentionSupportWeight * opacity * luminance;
  const occlusionWeight = retentionSupportWeight * opacity;
  const needsCoverageRecord = compactCandidateCanEnterCoverageRecordList({
    recordList: bucket.coverageRecords,
    limit: maxRefsPerTile,
    tileIndex,
    coverageWeight: safeCoverageWeight,
    template,
  });
  const needsRetentionRecord = compactCandidateCanEnterRetentionRecordList({
    recordList: bucket.retentionRecords,
    limit: Math.max(1, Math.floor(maxRefsPerTile / 2)),
    coverageWeight: safeCoverageWeight,
    retentionWeight,
    template,
  });
  const needsOcclusionRecord = compactCandidateCanEnterOcclusionRecordList({
    recordList: bucket.occlusionRecords,
    limit: Math.max(1, Math.floor(maxRefsPerTile / 2)),
    coverageWeight: safeCoverageWeight,
    occlusionWeight,
    occlusionDensity: opacity,
    template,
  });
  if (needsCoverageRecord || needsRetentionRecord || needsOcclusionRecord) {
    return {
      needsMaterialization: true,
      needsSupportSamples: true,
    };
  }

  const samplesPerAxis = COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS;
  const sampleLimit = Math.max(1, Math.ceil(maxRefsPerTile / (samplesPerAxis * samplesPerAxis * 2)));
  const supportSampleWeightUpperBound = safeLocalSupportWeight * opacity;
  const supportSampleRetentionWeightUpperBound = supportSampleWeightUpperBound * luminance;
  const needsSupportSamples = !compactCanSkipSupportSampleCandidate({
    bucket,
    supportSampleWeightUpperBound,
    supportSampleRetentionWeightUpperBound,
    retentionWeight,
    occlusionWeight,
    viewRank: template.viewRank,
    splatIndex: template.splatIndex,
    originalId: template.originalId,
    limit: sampleLimit,
  });
  return {
    needsMaterialization: needsCoverageRecord || needsRetentionRecord || needsOcclusionRecord || needsSupportSamples,
    needsSupportSamples: needsSupportSamples,
  };
}

function compactCandidateCanEnterCoverageRecordList({
  recordList,
  limit,
  tileIndex,
  coverageWeight,
  template,
}: {
  readonly recordList: CompactRetainedRecordList;
  readonly limit: number;
  readonly tileIndex: number;
  readonly coverageWeight: number;
  readonly template: CompactRuntimeContributorTemplate;
}): boolean {
  return compactCandidateCanEnterRecordList(recordList, limit, (record) => (
    tileIndex - record.tileIndex ||
    record.coverageWeight - coverageWeight ||
    template.viewRank - record.viewRank ||
    template.splatIndex - record.splatIndex ||
    template.originalId - record.originalId
  ));
}

function compactCandidateCanEnterRetentionRecordList({
  recordList,
  limit,
  coverageWeight,
  retentionWeight,
  template,
}: {
  readonly recordList: CompactRetainedRecordList;
  readonly limit: number;
  readonly coverageWeight: number;
  readonly retentionWeight: number;
  readonly template: CompactRuntimeContributorTemplate;
}): boolean {
  return compactCandidateCanEnterRecordList(recordList, limit, (record) => (
    record.retentionWeight - retentionWeight ||
    record.coverageWeight - coverageWeight ||
    template.viewRank - record.viewRank ||
    template.splatIndex - record.splatIndex ||
    template.originalId - record.originalId
  ));
}

function compactCandidateCanEnterOcclusionRecordList({
  recordList,
  limit,
  coverageWeight,
  occlusionWeight,
  occlusionDensity,
  template,
}: {
  readonly recordList: CompactRetainedRecordList;
  readonly limit: number;
  readonly coverageWeight: number;
  readonly occlusionWeight: number;
  readonly occlusionDensity: number;
  readonly template: CompactRuntimeContributorTemplate;
}): boolean {
  return compactCandidateCanEnterRecordList(recordList, limit, (record) => {
    const recordDensity = finiteOrZero(record.occlusionDensity);
    return (
      recordDensity - occlusionDensity ||
      record.occlusionWeight - occlusionWeight ||
      record.coverageWeight - coverageWeight ||
      template.viewRank - record.viewRank ||
      template.splatIndex - record.splatIndex ||
      template.originalId - record.originalId
    );
  });
}

function compactCandidateCanEnterRecordList(
  recordList: CompactRetainedRecordList,
  limit: number,
  compareCandidateToRecord: (record: GpuTileContributorArenaProjectedContributor) => number,
): boolean {
  const records = recordList.records;
  if (records.length < limit) {
    return true;
  }
  return compareCandidateToRecord(records[recordList.worstIndex]) < 0;
}

function compactRetainSupportSampleRecords({
  bucket,
  record,
  localSupportWeight,
  tileMinX,
  tileMinY,
  tileMaxX,
  tileMaxY,
  maxRefsPerTile,
  ledger,
}: {
  readonly bucket: CompactStreamingTileBucket;
  readonly record: GpuTileContributorArenaProjectedContributor;
  readonly localSupportWeight: number;
  readonly tileMinX: number;
  readonly tileMinY: number;
  readonly tileMaxX: number;
  readonly tileMaxY: number;
  readonly maxRefsPerTile: number;
  readonly ledger?: CompactSourceFrontierStreamLedger;
}): void {
  const width = tileMaxX - tileMinX;
  const height = tileMaxY - tileMinY;
  if (width <= 0 || height <= 0) {
    return;
  }
  const samplesPerAxis = COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS;
  const sampleLimit = Math.max(1, Math.ceil(maxRefsPerTile / (samplesPerAxis * samplesPerAxis * 2)));
  const supportLuminance = record.occlusionWeight > 0 ? record.retentionWeight / record.occlusionWeight : 0;
  const safeSupportLuminance = Math.max(0, finiteOrZero(supportLuminance));
  const supportSampleWeightUpperBound = Math.max(0, finiteOrZero(localSupportWeight)) * record.opacity;
  const supportSampleRetentionWeightUpperBound = supportSampleWeightUpperBound * safeSupportLuminance;
  if (compactCanSkipSupportSampleRecords({
    bucket,
    record,
    supportSampleWeightUpperBound,
    supportSampleRetentionWeightUpperBound,
    limit: sampleLimit,
  })) {
    if (ledger) {
      ledger.supportSampleSkipCount += 1;
      ledger.supportSampleSkippedEvaluationCount += samplesPerAxis * samplesPerAxis;
    }
    return;
  }
  for (let sampleY = 0; sampleY < samplesPerAxis; sampleY += 1) {
    const y = tileMinY + ((sampleY + 0.5) / samplesPerAxis) * height;
    for (let sampleX = 0; sampleX < samplesPerAxis; sampleX += 1) {
      const x = tileMinX + ((sampleX + 0.5) / samplesPerAxis) * width;
      if (ledger) {
        ledger.supportSampleEvaluationCount += 1;
      }
      const supportSampleWeight = compactSourceConicPixelWeightAt(record, x, y) * record.opacity;
      if (supportSampleWeight <= 1e-8) {
        continue;
      }
      if (ledger) {
        ledger.supportSamplePositiveWeightCount += 1;
      }
      const supportSampleRetentionWeight = supportSampleWeight * safeSupportLuminance;
      const sampleIndex = sampleY * samplesPerAxis + sampleX;
      const supportSampleRetainResult = compactRetainSupportSampleRecord({
        recordList: bucket.supportSampleRecords[sampleIndex],
        record,
        supportSampleWeight,
        supportSampleRetentionWeight,
        limit: sampleLimit,
      });
      if (supportSampleRetainResult !== "none" && ledger) {
        ledger.supportSampleRetainCount += 1;
        if (supportSampleRetainResult === "insert") {
          ledger.supportSampleInsertCount += 1;
        } else if (supportSampleRetainResult === "replace") {
          ledger.supportSampleReplaceCount += 1;
        }
      }
    }
  }
}

function compactCanSkipSupportSampleRecords({
  bucket,
  record,
  supportSampleWeightUpperBound,
  supportSampleRetentionWeightUpperBound,
  limit,
}: {
  readonly bucket: CompactStreamingTileBucket;
  readonly record: GpuTileContributorArenaProjectedContributor;
  readonly supportSampleWeightUpperBound: number;
  readonly supportSampleRetentionWeightUpperBound: number;
  readonly limit: number;
}): boolean {
  for (const recordList of bucket.supportSampleRecords) {
    const records = recordList.records;
    if (records.length < limit) {
      return false;
    }
  }
  if (supportSampleWeightUpperBound <= 1e-8) {
    return true;
  }
  for (const recordList of bucket.supportSampleRecords) {
    const records = recordList.records;
    if (
      compactCompareSupportSampleCandidateToRecord(
        record,
        supportSampleWeightUpperBound,
        supportSampleRetentionWeightUpperBound,
        records[recordList.worstIndex],
      ) < 0
    ) {
      return false;
    }
  }
  return true;
}

function compactCanSkipSupportSampleCandidate({
  bucket,
  supportSampleWeightUpperBound,
  supportSampleRetentionWeightUpperBound,
  retentionWeight,
  occlusionWeight,
  viewRank,
  splatIndex,
  originalId,
  limit,
}: {
  readonly bucket: CompactStreamingTileBucket;
  readonly supportSampleWeightUpperBound: number;
  readonly supportSampleRetentionWeightUpperBound: number;
  readonly retentionWeight: number;
  readonly occlusionWeight: number;
  readonly viewRank: number;
  readonly splatIndex: number;
  readonly originalId: number;
  readonly limit: number;
}): boolean {
  for (const recordList of bucket.supportSampleRecords) {
    const records = recordList.records;
    if (records.length < limit) {
      return false;
    }
  }
  if (supportSampleWeightUpperBound <= 1e-8) {
    return true;
  }
  for (const recordList of bucket.supportSampleRecords) {
    const records = recordList.records;
    if (
      compactCompareSupportSampleCandidateScoresToRecord(
        supportSampleWeightUpperBound,
        supportSampleRetentionWeightUpperBound,
        retentionWeight,
        occlusionWeight,
        viewRank,
        splatIndex,
        originalId,
        records[recordList.worstIndex],
      ) < 0
    ) {
      return false;
    }
  }
  return true;
}

function compactRetainSupportSampleRecord({
  recordList,
  record,
  supportSampleWeight,
  supportSampleRetentionWeight,
  limit,
}: {
  readonly recordList: CompactRetainedRecordList;
  readonly record: GpuTileContributorArenaProjectedContributor;
  readonly supportSampleWeight: number;
  readonly supportSampleRetentionWeight: number;
  readonly limit: number;
}): CompactSupportSampleRetainResult {
  const records = recordList.records;
  if (
    records.length >= limit &&
    compactCompareSupportSampleCandidateToRecord(
      record,
      supportSampleWeight,
      supportSampleRetentionWeight,
      records[recordList.worstIndex],
    ) >= 0
  ) {
    return "none";
  }

  if (records.length < limit) {
    const supportRecord = compactSupportSampleRecordFrom(record, supportSampleWeight, supportSampleRetentionWeight);
    records.push(supportRecord);
    if (
      records.length === 1 ||
      compareCompactProjectionSupportSamplePriority(supportRecord, records[recordList.worstIndex]) > 0
    ) {
      recordList.worstIndex = records.length - 1;
    }
    return "insert";
  }

  compactOverwriteSupportSampleRecord(
    records[recordList.worstIndex],
    record,
    supportSampleWeight,
    supportSampleRetentionWeight,
  );
  recordList.worstIndex = compactRetainedRecordListWorstIndex(records, compareCompactProjectionSupportSamplePriority);
  return "replace";
}

function compactSupportSampleRecordFrom(
  record: GpuTileContributorArenaProjectedContributor,
  supportSampleWeight: number,
  supportSampleRetentionWeight: number,
): GpuTileContributorArenaProjectedContributor {
  return { ...record, supportSampleWeight, supportSampleRetentionWeight };
}

function compactOverwriteSupportSampleRecord(
  target: GpuTileContributorArenaProjectedContributor,
  record: GpuTileContributorArenaProjectedContributor,
  supportSampleWeight: number,
  supportSampleRetentionWeight: number,
): void {
  const mutable = target as MutableGpuTileContributorArenaProjectedContributor & Record<string, unknown>;
  for (const key of Object.keys(mutable)) {
    if (!(key in record)) {
      delete mutable[key];
    }
  }
  Object.assign(mutable, record, {
    supportSampleWeight,
    supportSampleRetentionWeight,
  });
}

function compactCompareSupportSampleCandidateToRecord(
  record: GpuTileContributorArenaProjectedContributor,
  supportSampleWeight: number,
  supportSampleRetentionWeight: number,
  retainedRecord: GpuTileContributorArenaProjectedContributor,
): number {
  return compactCompareSupportSampleCandidateScoresToRecord(
    supportSampleWeight,
    supportSampleRetentionWeight,
    record.retentionWeight,
    record.occlusionWeight,
    record.viewRank,
    record.splatIndex,
    record.originalId,
    retainedRecord,
  );
}

function compactCompareSupportSampleCandidateScoresToRecord(
  supportSampleWeight: number,
  supportSampleRetentionWeight: number,
  retentionWeight: number,
  occlusionWeight: number,
  viewRank: number,
  splatIndex: number,
  originalId: number,
  retainedRecord: GpuTileContributorArenaProjectedContributor,
): number {
  return (
    finiteOrZero(retainedRecord.supportSampleRetentionWeight) - finiteOrZero(supportSampleRetentionWeight) ||
    finiteOrZero(retainedRecord.supportSampleWeight) - finiteOrZero(supportSampleWeight) ||
    retainedRecord.retentionWeight - retentionWeight ||
    retainedRecord.occlusionWeight - occlusionWeight ||
    viewRank - retainedRecord.viewRank ||
    splatIndex - retainedRecord.splatIndex ||
    originalId - retainedRecord.originalId
  );
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
    const bucketSupportSampleRecordGroups = compactSupportSampleCandidateRecordGroups(bucket);
    const bucketSupportSampleRecords = compactSupportSampleCandidateRecords(bucketSupportSampleRecordGroups);
    projectedCandidateRecords.push(
      ...compactMergedTileCandidateRecords(bucket, bucketSupportSampleRecords).sort(compareCompactProjectionRetentionCoverageOrder),
    );
    coverageRecords.push(...bucket.coverageRecords.records);
    retentionRecords.push(...bucket.retentionRecords.records);
    occlusionRecords.push(...bucket.occlusionRecords.records);
    supportSampleRecords.push(...bucketSupportSampleRecords);
    supportSampleRecordGroups.push(...bucketSupportSampleRecordGroups);
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
  supportSampleRecords: readonly GpuTileContributorArenaProjectedContributor[],
): GpuTileContributorArenaProjectedContributor[] {
  const records: GpuTileContributorArenaProjectedContributor[] = [];
  const seen = new Set<bigint>();
  const pushRecord = (record: GpuTileContributorArenaProjectedContributor) => {
    const key = compactProjectionRetentionRecordKey(record);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    records.push(record);
  };
  for (const record of bucket.coverageRecords.records) {
    pushRecord(record);
  }
  for (const record of bucket.retentionRecords.records) {
    pushRecord(record);
  }
  for (const record of bucket.occlusionRecords.records) {
    pushRecord(record);
  }
  for (const record of supportSampleRecords) {
    pushRecord(record);
  }
  return records;
}

function compactSupportSampleCandidateRecords(
  recordGroups: readonly (readonly GpuTileContributorArenaProjectedContributor[])[],
): GpuTileContributorArenaProjectedContributor[] {
  const records: GpuTileContributorArenaProjectedContributor[] = [];
  for (const recordGroup of recordGroups) {
    records.push(...recordGroup);
  }
  return records;
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
  ledger,
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
  readonly ledger?: CompactSourceFrontierStreamLedger;
  readonly onEntry: (entry: {
    readonly splatOrdinal: number;
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
  if (ledger) {
    ledger.splatCount += splats.length;
  }
  for (let splatOrdinal = 0; splatOrdinal < splats.length; splatOrdinal += 1) {
    const splat = splats[splatOrdinal];
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
      if (ledger) {
        ledger.tileCandidateCount += 1;
      }
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
        if (ledger) {
          ledger.coverageRejectCount += 1;
        }
        return;
      }
      if (ledger) {
        ledger.positiveCoverageCount += 1;
      }
      const localSupportWeight = compactSourceTileLocalSupportWeight({
        centerPx: splat.centerPx,
        densityParams,
        tileMinX,
        tileMinY,
        tileMaxX,
        tileMaxY,
      });
      onEntry({ splatOrdinal, splat, tileIndex, tileX, tileY, coverageWeight, localSupportWeight });
    };
    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      const rowTileXs = selectedTileRows?.tileXsByRow.get(tileY);
      if (rowTileXs) {
        if (ledger) {
          ledger.sparseRowCount += 1;
        }
        compactStreamSparseTileXRow(rowTileXs, minTileX, maxTileX, tileY, emitTileEntry);
      } else {
        if (ledger) {
          ledger.denseRowCount += 1;
        }
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
  const mahalanobis2 = compactSourceMinimumMahalanobis2InRect({
    centerPx,
    densityParams,
    minX: tileMinX,
    minY: tileMinY,
    maxX: tileMaxX,
    maxY: tileMaxY,
  });
  return Math.exp(-2 * Math.max(mahalanobis2, 0));
}

function compactSourceMinimumMahalanobis2InRect({
  centerPx,
  densityParams,
  minX,
  minY,
  maxX,
  maxY,
}: {
  readonly centerPx: readonly [number, number];
  readonly densityParams: CompactSourceCovarianceDensityParams;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}): number {
  const minDx = minX - centerPx[0];
  const maxDx = maxX - centerPx[0];
  const minDy = minY - centerPx[1];
  const maxDy = maxY - centerPx[1];
  if (minDx <= 0 && maxDx >= 0 && minDy <= 0 && maxDy >= 0) {
    return 0;
  }
  let best = Number.POSITIVE_INFINITY;
  const testOffset = (dx: number, dy: number): void => {
    const mahalanobis2 =
      densityParams.invXx * dx * dx +
      2 * densityParams.invXy * dx * dy +
      densityParams.invYy * dy * dy;
    if (mahalanobis2 < best) {
      best = mahalanobis2;
    }
  };
  const testVerticalEdge = (dx: number): void => {
    const dy = compactClamp(
      densityParams.invYy !== 0 ? -(densityParams.invXy * dx) / densityParams.invYy : 0,
      minDy,
      maxDy,
    );
    testOffset(dx, dy);
  };
  const testHorizontalEdge = (dy: number): void => {
    const dx = compactClamp(
      densityParams.invXx !== 0 ? -(densityParams.invXy * dy) / densityParams.invXx : 0,
      minDx,
      maxDx,
    );
    testOffset(dx, dy);
  };
  testVerticalEdge(minDx);
  testVerticalEdge(maxDx);
  testHorizontalEdge(minDy);
  testHorizontalEdge(maxDy);
  return best;
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

interface CompactRuntimeContributorTemplateSource {
  readonly splatIndex: number;
  readonly originalId: number;
  readonly centerPx: readonly [number, number];
  readonly covariancePx?: RuntimeCompactTileCoverage["splats"][number]["covariancePx"];
}

interface CompactRuntimeContributorTemplate {
  readonly splatIndex: number;
  readonly originalId: number;
  readonly viewRank: number;
  readonly viewDepth: number;
  readonly centerPx: readonly [number, number];
  readonly inverseConic: readonly [number, number, number];
  readonly opacity: number;
  readonly luminance: number;
}

function compactRuntimeContributorTemplateForSplat({
  splat,
  ranks,
  depths,
  attributes,
  effectiveOpacities,
}: {
  readonly splat: CompactRuntimeContributorTemplateSource;
  readonly ranks: ArrayLike<number>;
  readonly depths: ArrayLike<number>;
  readonly attributes: SplatAttributes;
  readonly effectiveOpacities: Float32Array;
}): CompactRuntimeContributorTemplate {
  const inverseConic = invertCompactSourceCovariance(splat.covariancePx);
  return {
    splatIndex: splat.splatIndex,
    originalId: splat.originalId,
    viewRank: ranks[splat.splatIndex] ?? splat.splatIndex,
    viewDepth: depths[splat.splatIndex] ?? 0,
    centerPx: splat.centerPx,
    inverseConic,
    opacity: readCompactSourceOpacity(attributes, effectiveOpacities, splat.splatIndex),
    luminance: readCompactSourceLuminance(attributes, splat.splatIndex),
  };
}

function compactRuntimeContributorFromTemplate({
  template,
  projectedIndex,
  tileIndex,
  tileX,
  tileY,
  coverageWeight,
  localSupportWeight,
}: {
  readonly template: CompactRuntimeContributorTemplate;
  readonly projectedIndex: number;
  readonly tileIndex: number;
  readonly tileX: number;
  readonly tileY: number;
  readonly coverageWeight: number;
  readonly localSupportWeight?: number;
}): GpuTileContributorArenaProjectedContributor {
  const safeCoverageWeight = Math.max(0, finiteOrZero(coverageWeight));
  const safeLocalSupportWeight = Math.max(0, finiteOrZero(localSupportWeight));
  const retentionSupportWeight = Math.max(safeCoverageWeight, safeLocalSupportWeight);
  return {
    splatIndex: template.splatIndex,
    originalId: template.originalId,
    tileIndex,
    tileX,
    tileY,
    projectedIndex,
    viewRank: template.viewRank,
    viewDepth: template.viewDepth,
    depthBand: 0,
    coverageWeight: safeCoverageWeight,
    centerPx: template.centerPx,
    inverseConic: template.inverseConic,
    opacity: template.opacity,
    coverageAlpha: transferCompactSourceCoverageAlpha(template.opacity, safeCoverageWeight),
    transmittanceBefore: 1,
    retentionWeight: retentionSupportWeight * template.opacity * template.luminance,
    occlusionWeight: retentionSupportWeight * template.opacity,
    occlusionDensity: template.opacity,
  };
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
  const template = compactRuntimeContributorTemplateForSplat({
    splat: {
      splatIndex: entry.splatIndex,
      originalId: entry.originalId,
      centerPx: splat?.centerPx ?? [0, 0],
      covariancePx: splat?.covariancePx,
    },
    ranks,
    depths,
    attributes,
    effectiveOpacities,
  });
  return compactRuntimeContributorFromTemplate({
    template,
    projectedIndex,
    tileIndex: entry.tileIndex,
    tileX: entry.tileX,
    tileY: entry.tileY,
    coverageWeight: entry.coverageWeight,
    localSupportWeight: entry.localSupportWeight,
  });
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
  return compactSourceConicPixelWeightAt(contributor, pixelCenter[0], pixelCenter[1]);
}

function compactSourceConicPixelWeightAt(
  contributor: GpuTileContributorArenaProjectedContributor,
  pixelX: number,
  pixelY: number,
): number {
  const dx = pixelX - contributor.centerPx[0];
  const dy = pixelY - contributor.centerPx[1];
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
    alphaDensityRoute: gpuArenaRuntime
      ? createGpuArenaAlphaDensityRouteEvidence()
      : createCpuAlphaDensityRouteEvidence(),
    arenaBackend: gpuArenaRuntime ? "gpu" : "cpu",
    gpuArenaRuntime,
    gpuArenaProjectedContributors,
    gpuArenaProjectedConicSources: undefined,
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
    tileRefPayloadEncoding: tileRefPayloadEncodingForState(state),
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
        tileHeaders,
        tileScatterCursors
      );
      const retainedRowsReadback = pending.tileRefPayloadEncoding === "source-frontier-score"
        ? summarizeWgslSourceFrontierRetainedRowsFromCompositorInputReadback({
            frameId: pending.frameId,
            plan: pending.plan,
            tileHeaders,
            tileRefs,
            tileCoverageWeights,
            tileScatterCursors,
          })
        : undefined;
      const compositorInputReadback: TileLocalCompositorInputReadback = {
        status: "present",
        source: "gpu-buffer-readback",
        frameId: pending.frameId,
        tileRefPayloadEncoding: pending.tileRefPayloadEncoding,
        anchors: pending.anchors.map((anchor) => readCompositorInputAnchor({
          anchor,
          plan: pending.plan,
          tileRefPayloadEncoding: pending.tileRefPayloadEncoding,
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
        if (retainedRowsReadback) {
          refreshWgslSourceFrontierRetainedRowsEvidence(state, retainedRowsReadback);
        }
        publishTileLocalRefStatsReadback(state, refStatsReadback);
        publishTileLocalCompositorInputReadback(
          state,
          compositorInputReadback,
          pending.sourceColors,
          pending.tileRefPayloadEncoding,
        );
      }
      destroyMappedReadbackBuffers(buffers);
    })
    .catch((error) => {
      const compositorInputReadback: TileLocalCompositorInputReadback = {
        status: "blocked",
        source: "gpu-buffer-readback",
        frameId: pending.frameId,
        tileRefPayloadEncoding: pending.tileRefPayloadEncoding,
        anchors: [],
        blockedReason: errorMessage(error),
      };
      if (tileLocalCompositorInputReadbackCanPublish(state, pending)) {
        state.compositorInputReadback = compositorInputReadback;
        if (pending.tileRefPayloadEncoding === "source-frontier-score") {
          refreshWgslSourceFrontierRetainedRowsEvidence(state, blockedWgslSourceFrontierRetainedRowsEvidence({
            frameId: pending.frameId,
            plan: pending.plan,
            blockedReason: errorMessage(error),
          }));
        }
        publishTileLocalCompositorInputReadback(
          state,
          compositorInputReadback,
          undefined,
          pending.tileRefPayloadEncoding,
        );
      }
      destroyReadbackBuffers(buffers);
    });
}

function tileRefPayloadEncodingForState(
  state: TileLocalSceneState,
): "legacy-identity" | "source-frontier-score" {
  if (state.wgslProjectedRefStream?.sourceRole === "visible-source-frontier-gpu-retention-election") {
    return "source-frontier-score";
  }
  if (state.retainedSourceConstruction?.effectiveSourceBackend === "wgsl-projected-ref-stream-source-frontier") {
    return "source-frontier-score";
  }
  return "legacy-identity";
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

function publishTileLocalCompositorInputReadback(
  state: TileLocalSceneState,
  readback: TileLocalCompositorInputReadback,
  sourceColors?: Float32Array,
  tileRefPayloadEncoding: "legacy-identity" | "source-frontier-score" = readback.tileRefPayloadEncoding ?? "legacy-identity",
): void {
  const runtimeWindow = window as unknown as { __MESH_SPLAT_SMOKE__?: Record<string, unknown> };
  const smoke = runtimeWindow.__MESH_SPLAT_SMOKE__;
  if (!smoke || typeof smoke !== "object") {
    return;
  }
  const tileLocal = smoke.tileLocal && typeof smoke.tileLocal === "object"
    ? smoke.tileLocal as Record<string, unknown>
    : {};
  const arenaRuntime = smoke.arenaRuntime && typeof smoke.arenaRuntime === "object"
    ? smoke.arenaRuntime as Record<string, unknown>
    : null;
  const sourceFrontierContributorsByAnchorId = compositorInputContributorListByAnchorId(readback);
  const perPixelFinalColorAccumulation = readback.status === "present" && sourceColors
    ? buildPerPixelFinalColorAccumulationTraces({
        contributors: state.gpuArenaProjectedContributors,
        contributorsByAnchorId: sourceFrontierContributorsByAnchorId,
        sourceColors,
        projectedContributorsByAnchorId: sourceFrontierProjectedSupportFallbackByAnchorId(
          traceContributorListByAnchorId(
            state.perPixelProjectedContributors,
            "projectedContributors",
          ),
          sourceFrontierContributorsByAnchorId,
          tileRefPayloadEncoding,
        ),
        retainedContributorsByAnchorId: mergeAnchorContributorLists(
          traceContributorListByAnchorId(
            state.perPixelRetainedContributors,
            "retainedContributors",
          ),
          sourceFrontierContributorsByAnchorId,
        ),
        orderedContributorsByAnchorId: sourceFrontierContributorsByAnchorId,
        dispatchCache: state.bandDispatchCacheTrace,
        rendererMetadata: {
          requestedRenderer: "tile-local-visible",
          effectiveRenderer: "tile-local-visible-gaussian-compositor",
          requestedArenaBackend: REQUESTED_ARENA_BACKEND,
          effectiveArenaBackend: state.arenaBackend,
          tileSizePx: state.plan.tileSizePx,
          maxRefsPerTile: TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE,
          viewport: {
            width: state.viewportWidth,
            height: state.viewportHeight,
          },
        },
        tileSizePx: state.plan.tileSizePx,
        tileColumns: state.plan.tileColumns,
        anchors: state.traceAnchors ?? TILE_LOCAL_TRACE_ANCHORS ?? [],
      })
    : undefined;
  const perPixelRetainedToOrderedSurvivalLedger = perPixelFinalColorAccumulation
    ? buildRetainedToOrderedSurvivalLedger(
        perPixelFinalColorAccumulation.map((trace) =>
          (trace.traceRecord ?? trace) as Record<string, unknown>
        )
      )
    : undefined;
  smoke.tileLocal = {
    ...tileLocal,
    compositorInputReadback: readback,
    ...(perPixelFinalColorAccumulation ? { perPixelFinalColorAccumulation } : {}),
    ...(perPixelRetainedToOrderedSurvivalLedger ? { perPixelRetainedToOrderedSurvivalLedger } : {}),
    retainedSourceConstruction: state.retainedSourceConstruction,
  };
  if (arenaRuntime) {
    smoke.arenaRuntime = {
      ...arenaRuntime,
      retainedSourceConstruction: state.retainedSourceConstruction,
    };
  }
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
    tileRefPayloadEncoding: "legacy-identity",
    anchors: anchors.map((anchor) => readCompositorInputAnchor({
      anchor,
      plan: state.plan,
      tileRefPayloadEncoding: "legacy-identity",
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
  if (state.arenaBackend !== "gpu" || state.gpuArenaRuntime) {
    return;
  }
  if (state.pendingRefStatsReadback || state.refStatsReadback?.frameId === frameId) {
    return;
  }
  const tileCapacity = state.gpuArenaRuntime
    ? TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE
    : gpuLiveEffectiveRefsPerTile(state.plan);
  const tileHeaderBuffer = createReadbackBuffer(device, state.plan.tileHeaderBytes, "tile_local_live_ref_stats_tile_headers_readback");
  const scatterCursorBytes = Math.max(16, state.plan.tileCount * Uint32Array.BYTES_PER_ELEMENT);
  const tileScatterCursorBuffer = createReadbackBuffer(device, scatterCursorBytes, "tile_local_live_ref_stats_scatter_cursors_readback");
  encoder.copyBufferToBuffer(state.tileHeaderBuffer, 0, tileHeaderBuffer, 0, state.plan.tileHeaderBytes);
  encoder.copyBufferToBuffer(tileLocalRefStatsReadbackSourceBuffer(state), 0, tileScatterCursorBuffer, 0, scatterCursorBytes);
  state.pendingRefStatsReadback = {
    frameId,
    tileCount: state.plan.tileCount,
    tileCapacity,
    allocatedRefs: state.plan.maxTileRefs,
    tileHeaderBuffer,
    tileScatterCursorBuffer,
    mapStarted: false,
    cancelled: false,
  };
  state.refStatsReadback = {
    status: "pending",
    source: "gpu-tile-header-and-scatter-readback",
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
  void Promise.all([
    pending.tileHeaderBuffer.mapAsync(GPUMapMode.READ),
    pending.tileScatterCursorBuffer.mapAsync(GPUMapMode.READ),
  ])
    .then(() => {
      const tileHeaders = new Uint32Array(pending.tileHeaderBuffer.getMappedRange());
      const scatterCursors = new Uint32Array(pending.tileScatterCursorBuffer.getMappedRange());
      const readback = summarizeTileLocalRefStatsReadback(pending, tileHeaders, scatterCursors);
      if (tileLocalRefStatsReadbackCanPublish(state, pending)) {
        state.refStatsReadback = readback;
        publishTileLocalRefStatsReadback(state, readback);
      }
      pending.tileHeaderBuffer.unmap();
      pending.tileScatterCursorBuffer.unmap();
      pending.tileHeaderBuffer.destroy();
      pending.tileScatterCursorBuffer.destroy();
    })
    .catch((error) => {
      const readback: TileLocalRefStatsReadback = {
        status: "blocked",
        source: "gpu-tile-header-and-scatter-readback",
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
      pending.tileHeaderBuffer.destroy();
      pending.tileScatterCursorBuffer.destroy();
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
  tileHeaders: Uint32Array,
  scatterCursors: Uint32Array
): TileLocalRefStatsReadback {
  const headerStride = GPU_TILE_COVERAGE_TILE_HEADER_BYTES / Uint32Array.BYTES_PER_ELEMENT;
  let projectedScatterRefs = 0;
  let retainedRefs = 0;
  let droppedRefs = 0;
  let nonEmptyTiles = 0;
  let saturatedTiles = 0;
  let maxRefsPerTile = 0;
  for (let tileIndex = 0; tileIndex < pending.tileCount; tileIndex += 1) {
    const headerBase = tileIndex * headerStride;
    const projectedRefs = scatterCursors[tileIndex] ?? 0;
    const headerRetainedRefs = Math.min(tileHeaders[headerBase + 1] ?? 0, pending.tileCapacity);
    const headerProjectedRefs = tileHeaders[headerBase + 2] ?? projectedRefs;
    const headerDroppedRefs = tileHeaders[headerBase + 3] ?? Math.max(0, headerProjectedRefs - headerRetainedRefs);
    projectedScatterRefs += headerProjectedRefs;
    retainedRefs += headerRetainedRefs;
    droppedRefs += headerDroppedRefs;
    maxRefsPerTile = Math.max(maxRefsPerTile, headerRetainedRefs);
    if (headerProjectedRefs > 0) {
      nonEmptyTiles += 1;
    }
    if (headerRetainedRefs >= pending.tileCapacity) {
      saturatedTiles += 1;
    }
  }
  return {
    status: "present",
    source: "gpu-tile-header-and-scatter-readback",
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
  const arenaRuntime = smoke.arenaRuntime && typeof smoke.arenaRuntime === "object"
    ? smoke.arenaRuntime as Record<string, unknown>
    : null;
  const budgetDiagnostics = runtimeBudgetDiagnosticsForRefStatsReadback(state.budgetDiagnostics, state.plan, readback);
  state.budgetDiagnostics = budgetDiagnostics;
  refreshWgslSourceFrontierRetainedSourceConstructionEvidence(state, readback);
  const diagnostics = refreshTileLocalDiagnostics(state, [], readback);
  const refAccounting = tileLocalRefAccounting(state, diagnostics, readback);
  refreshStatsOverlayTileLocalRefAccounting(state, refAccounting);
  smoke.tileLocal = {
    ...tileLocal,
    refs: refAccounting.retainedRefs,
    allocatedRefs: refAccounting.allocatedRefs,
    refAccounting,
    refStatsReadback: readback,
    budgetDiagnostics,
    diagnostics,
    retainedSourceConstruction: state.retainedSourceConstruction,
  };
  if (arenaRuntime) {
    smoke.arenaRuntime = {
      ...arenaRuntime,
      retainedSourceConstruction: state.retainedSourceConstruction,
    };
  }
  runtimeWindow.__MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__ = diagnostics;
}

function enqueueWgslProjectedRefStreamReadback(
  device: GPUDevice,
  encoder: GPUCommandEncoder,
  state: TileLocalSceneState,
  frameId: number
): void {
  const stream = state.wgslProjectedRefStream;
  if (!stream || frameId < 0 || state.disposed) {
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

function enqueueProductionElectionPrefixScatterReadback(
  device: GPUDevice,
  encoder: GPUCommandEncoder,
  state: TileLocalSceneState,
  frameId: number
): void {
  if (!state.productionElectionPrefixScatter || frameId < 0 || state.disposed) {
    return;
  }
  if (state.pendingPrefixScatterReadback || state.prefixScatterReadback?.frameId === frameId) {
    return;
  }
  const witnessBytes = GPU_PRODUCTION_ELECTION_PREFIX_SCATTER_WITNESS_WORDS * Uint32Array.BYTES_PER_ELEMENT;
  const prefixCountsBytes = Math.max(
    16,
    state.productionElectionPrefixScatter.tileCount * Uint32Array.BYTES_PER_ELEMENT
  );
  const retainedRecordIndicesBytes = Math.max(
    16,
    Math.max(state.productionElectionPrefixScatter.retainedRecordCount, 1) * Uint32Array.BYTES_PER_ELEMENT
  );
  const witnessBuffer = createReadbackBuffer(
    device,
    witnessBytes,
    "production_election_prefix_scatter_witness_readback"
  );
  const prefixCountsBuffer = createReadbackBuffer(
    device,
    prefixCountsBytes,
    "production_election_prefix_scatter_prefix_counts_readback"
  );
  const retainedRecordIndicesBuffer = createReadbackBuffer(
    device,
    retainedRecordIndicesBytes,
    "production_election_prefix_scatter_retained_indices_readback"
  );
  encoder.copyBufferToBuffer(state.productionElectionPrefixScatter.witnessBuffer, 0, witnessBuffer, 0, witnessBytes);
  encoder.copyBufferToBuffer(state.productionElectionPrefixScatter.prefixCountsBuffer, 0, prefixCountsBuffer, 0, prefixCountsBytes);
  encoder.copyBufferToBuffer(state.productionElectionPrefixScatter.retainedRecordIndicesBuffer, 0, retainedRecordIndicesBuffer, 0, retainedRecordIndicesBytes);
  const contract = state.productionElectionPrefixScatter;
  state.pendingPrefixScatterReadback = {
    frameId,
    contract,
    witnessBuffer,
    prefixCountsBuffer,
    retainedRecordIndicesBuffer,
    mapStarted: false,
    cancelled: false,
  };
  state.prefixScatterReadback = {
    status: "pending",
    source: "wgsl-production-election-prefix-scatter-readback",
    frameId,
    recordCount: contract.recordCount,
    groupCount: contract.groupCount,
    retainedRecordCount: contract.retainedRecordCount,
    tileCount: contract.tileCount,
    witnessSentinel: 0,
    witnessRecordCount: 0,
    witnessGroupCount: 0,
    witnessRetainedRecordCount: 0,
    witnessTileCount: 0,
    firstRecordWord: 0,
    firstGroupWord: 0,
    firstRetainedTileIndex: 0,
    retainedRows: 0,
    nonEmptyTiles: 0,
    maxRowsPerTile: 0,
    firstRetainedRecordIndex: 0,
    outputBuffers: contract.outputBuffers,
    falseClosureGuard: "prefix-scatter-readback-is-not-current-compositor-consumption",
  };
  refreshProductionElectionPrefixScatterReadbackEvidence(state, state.prefixScatterReadback);
}

function resolveProductionElectionPrefixScatterReadback(state: TileLocalSceneState): void {
  const pending = state.pendingPrefixScatterReadback;
  if (!pending || pending.mapStarted) {
    return;
  }
  pending.mapStarted = true;
  state.pendingPrefixScatterReadback = undefined;
  const buffers = [
    pending.witnessBuffer,
    pending.prefixCountsBuffer,
    pending.retainedRecordIndicesBuffer,
  ];
  void Promise.all(buffers.map((buffer) => buffer.mapAsync(GPUMapMode.READ)))
    .then(() => {
      const witness = new Uint32Array(pending.witnessBuffer.getMappedRange());
      const prefixCounts = new Uint32Array(pending.prefixCountsBuffer.getMappedRange());
      const retainedRecordIndices = new Uint32Array(pending.retainedRecordIndicesBuffer.getMappedRange());
      const readback = summarizeProductionElectionPrefixScatterReadback(
        pending,
        witness,
        prefixCounts,
        retainedRecordIndices
      );
      if (productionElectionPrefixScatterReadbackCanPublish(state, pending)) {
        state.prefixScatterReadback = readback;
        refreshProductionElectionPrefixScatterReadbackEvidence(state, readback);
        publishProductionElectionPrefixScatterReadback(state, readback);
      }
      destroyMappedReadbackBuffers(buffers);
    })
    .catch((error) => {
      const readback = blockedProductionElectionPrefixScatterReadback(pending, error);
      if (productionElectionPrefixScatterReadbackCanPublish(state, pending)) {
        state.prefixScatterReadback = readback;
        refreshProductionElectionPrefixScatterReadbackEvidence(state, readback);
        publishProductionElectionPrefixScatterReadback(state, readback);
      }
      destroyReadbackBuffers(buffers);
    });
}

function summarizeProductionElectionPrefixScatterReadback(
  pending: PendingProductionElectionPrefixScatterReadback,
  witness: Uint32Array,
  prefixCounts: Uint32Array,
  retainedRecordIndices: Uint32Array,
): ProductionElectionPrefixScatterReadback {
  let retainedRows = 0;
  let nonEmptyTiles = 0;
  let maxRowsPerTile = 0;
  for (let tileIndex = 0; tileIndex < pending.contract.tileCount; tileIndex += 1) {
    const rows = prefixCounts[tileIndex] ?? 0;
    retainedRows += rows;
    maxRowsPerTile = Math.max(maxRowsPerTile, rows);
    if (rows > 0) {
      nonEmptyTiles += 1;
    }
  }
  return {
    status: "present",
    source: "wgsl-production-election-prefix-scatter-readback",
    frameId: pending.frameId,
    recordCount: pending.contract.recordCount,
    groupCount: pending.contract.groupCount,
    retainedRecordCount: pending.contract.retainedRecordCount,
    tileCount: pending.contract.tileCount,
    witnessSentinel: witness[7] ?? 0,
    witnessRecordCount: witness[0] ?? 0,
    witnessGroupCount: witness[1] ?? 0,
    witnessRetainedRecordCount: witness[2] ?? 0,
    witnessTileCount: witness[3] ?? 0,
    firstRecordWord: witness[4] ?? 0,
    firstGroupWord: witness[5] ?? 0,
    firstRetainedTileIndex: witness[6] ?? 0,
    retainedRows,
    nonEmptyTiles,
    maxRowsPerTile,
    firstRetainedRecordIndex: pending.contract.retainedRecordCount > 0
      ? retainedRecordIndices[0] ?? 0
      : 0,
    outputBuffers: pending.contract.outputBuffers,
    falseClosureGuard: "prefix-scatter-readback-is-not-current-compositor-consumption",
  };
}

function blockedProductionElectionPrefixScatterReadback(
  pending: PendingProductionElectionPrefixScatterReadback,
  error: unknown
): ProductionElectionPrefixScatterReadback {
  return {
    status: "blocked",
    source: "wgsl-production-election-prefix-scatter-readback",
    frameId: pending.frameId,
    recordCount: pending.contract.recordCount,
    groupCount: pending.contract.groupCount,
    retainedRecordCount: pending.contract.retainedRecordCount,
    tileCount: pending.contract.tileCount,
    witnessSentinel: 0,
    witnessRecordCount: 0,
    witnessGroupCount: 0,
    witnessRetainedRecordCount: 0,
    witnessTileCount: 0,
    firstRecordWord: 0,
    firstGroupWord: 0,
    firstRetainedTileIndex: 0,
    retainedRows: 0,
    nonEmptyTiles: 0,
    maxRowsPerTile: 0,
    firstRetainedRecordIndex: 0,
    outputBuffers: pending.contract.outputBuffers,
    falseClosureGuard: "prefix-scatter-readback-is-not-current-compositor-consumption",
    blockedReason: errorMessage(error),
  };
}

function productionElectionPrefixScatterReadbackCanPublish(
  state: TileLocalSceneState,
  pending: PendingProductionElectionPrefixScatterReadback
): boolean {
  return (
    !state.disposed &&
    !pending.cancelled &&
    pending.frameId === state.lastCompositedFrame &&
    state.productionElectionPrefixScatter === pending.contract
  );
}

function refreshProductionElectionPrefixScatterReadbackEvidence(
  state: TileLocalSceneState,
  readback: ProductionElectionPrefixScatterReadback
): void {
  const retainedSourceConstruction = state.retainedSourceConstruction;
  if (
    !retainedSourceConstruction ||
    retainedSourceConstruction.effectiveSourceBackend !== "wgsl-projected-ref-stream-source-frontier" ||
    !retainedSourceConstruction.productionElectionPrefixScatter
  ) {
    return;
  }
  const productionElectionPrefixScatter = retainedSourceConstruction.productionElectionPrefixScatter;
  state.retainedSourceConstruction = {
    ...retainedSourceConstruction,
    productionElectionPrefixScatter: {
      ...productionElectionPrefixScatter,
      readback,
    },
  };
}

function publishProductionElectionPrefixScatterReadback(
  state: TileLocalSceneState,
  readback: ProductionElectionPrefixScatterReadback
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
    prefixScatterReadback: readback,
    retainedSourceConstruction: state.retainedSourceConstruction,
  };
  const arenaRuntime = smoke.arenaRuntime && typeof smoke.arenaRuntime === "object"
    ? smoke.arenaRuntime as Record<string, unknown>
    : undefined;
  if (arenaRuntime) {
    smoke.arenaRuntime = {
      ...arenaRuntime,
      retainedSourceConstruction: state.retainedSourceConstruction,
    };
  }
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
    readback?.source === "gpu-tile-header-and-scatter-readback" &&
    readback.status === "present" &&
    readback.frameId === frameId
  ) {
    return readback as TileLocalRefStatsReadback;
  }
  return undefined;
}

function latestPublishedTileLocalRefStatsReadback(
  smoke: Record<string, unknown> | undefined
): TileLocalRefStatsReadback | undefined {
  if (!smoke || typeof smoke !== "object") {
    return undefined;
  }
  const tileLocal = smoke.tileLocal && typeof smoke.tileLocal === "object"
    ? smoke.tileLocal as Record<string, unknown>
    : undefined;
  const readback = tileLocal?.refStatsReadback && typeof tileLocal.refStatsReadback === "object"
    ? tileLocal.refStatsReadback as Partial<TileLocalRefStatsReadback>
    : undefined;
  if (readback?.source === "gpu-tile-header-and-scatter-readback" && readback.status === "present") {
    return readback as TileLocalRefStatsReadback;
  }
  return undefined;
}

function overlayTileLocalRefStatsReadback(
  state: TileLocalSceneState,
  smoke: Record<string, unknown> | undefined
): TileLocalRefStatsReadback | undefined {
  if (state.refStatsReadback?.status === "present") {
    return state.refStatsReadback;
  }
  return latestPublishedTileLocalRefStatsReadback(smoke);
}

function readCompositorInputAnchor({
  anchor,
  plan,
  tileRefPayloadEncoding,
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
  readonly tileRefPayloadEncoding: "legacy-identity" | "source-frontier-score";
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
  const liveRefCount = sourceFrontierCompositorReadLimit({
    headerRefCount: refCount,
    gpuScatterCount,
    tileCapacity,
  });
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
    const tileRefAux = tileRefs[tileRefBase + 1] ?? splatIndex;
    const originalId = tileRefPayloadEncoding === "source-frontier-score" ? splatIndex : tileRefAux;
    const tileIndex = tileRefs[tileRefBase + 2] ?? tileAddress.tileIndex;
    const alphaParamIndex = Math.min(tileRefs[tileRefBase + 3] ?? refIndex, plan.maxTileRefs - 1);
    const alphaParam = readVec4(alphaParams, alphaParamIndex);
    const alphaViewRank = Number.isFinite(alphaParam[3]) ? Math.trunc(alphaParam[3]) : -1;
    const viewRank = tileRefPayloadEncoding === "source-frontier-score" ? splatIndex : alphaViewRank;
    const retentionScore = tileRefPayloadEncoding === "source-frontier-score" ? tileRefAux : undefined;
    const encodedCandidateSourceClassMask = sourceFrontierAlphaClassMaskFromAlphaParam(alphaParam);
    const candidateSourceClassMask = tileRefPayloadEncoding === "source-frontier-score"
      ? encodedCandidateSourceClassMask !== 0
        ? encodedCandidateSourceClassMask
        : candidateSourceClassMaskForSplatId(plan, tileHeaders, splatIndex)
      : 0;
    const sourceRole = sourceRoleForCandidateSourceClassMask(candidateSourceClassMask);
    const roleClass = roleClassForSourceRole(sourceRole);
    const retentionBand = retentionBandForSourceRole(sourceRole);
    const viewDepth = sourceViewDepths[splatIndex] ?? 0;
    if (splatIndex >= plan.splatCount) {
      contributors.push({
        layer,
        refIndex,
        splatIndex,
        originalId,
        tileIndex,
        viewRank,
        retentionScore,
        candidateSourceClassMask,
        sourceRole,
        role: sourceRole,
        roleClass,
        retentionBand,
        viewDepth: roundColorChannel(viewDepth),
        alphaParamIndex,
        centerPx: [0, 0],
        inverseConic: [0, 0, 0],
        coverageWeight: 0,
        tileCoverageWeight: 0,
        tileLocalSupportWeight: 0,
        pixelCoverageWeight: 0,
        sourceFrontierSupportPixelWeight: 0,
        sourceOpacity: 0,
        opacity: 0,
        alphaTransferWeight: 0,
        colorTransferWeight: 0,
        coverageAlpha: 0,
        colorAlpha: 0,
        colorOcclusionAlpha: 0,
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
    const conicParam = readVec4(alphaParams, alphaParamIndex + plan.maxTileRefs);
    const tileLocalSupportWeight = Math.max(tileCoverageWeight, conicParam[3] ?? 0);
    if (tileCoverageWeight <= 0 && tileLocalSupportWeight <= 0) {
      const sourceOpacity = Math.min(clamp01(alphaParam[0]), 0.999);
      contributors.push({
        layer,
        refIndex,
        splatIndex,
        originalId,
        tileIndex,
        viewRank,
        retentionScore,
        candidateSourceClassMask,
        sourceRole,
        role: sourceRole,
        roleClass,
        retentionBand,
        viewDepth: roundColorChannel(viewDepth),
        alphaParamIndex,
        centerPx: [roundColorChannel(alphaParam[1]), roundColorChannel(alphaParam[2])],
        inverseConic: [roundColorChannel(conicParam[0]), roundColorChannel(conicParam[1]), roundColorChannel(conicParam[2])],
        coverageWeight: 0,
        tileCoverageWeight: 0,
        tileLocalSupportWeight: roundColorChannel(tileLocalSupportWeight),
        pixelCoverageWeight: 0,
        sourceFrontierSupportPixelWeight: 0,
        sourceOpacity: roundColorChannel(sourceOpacity),
        opacity: roundColorChannel(sourceOpacity),
        alphaTransferWeight: 0,
        colorTransferWeight: 0,
        coverageAlpha: 0,
        colorAlpha: 0,
        colorOcclusionAlpha: 0,
        transmittanceBefore: roundColorChannel(remainingTransmission),
        transmittanceAfter: roundColorChannel(remainingTransmission),
        sourceColor: readSourceColor(sourceColors, splatIndex),
        runningColor: runningColor.map(roundColorChannel) as [number, number, number],
        remainingTransmission: roundColorChannel(remainingTransmission),
        status: "skipped-zero-tile-coverage",
      });
      continue;
    }
    const sourceOpacity = Math.min(clamp01(alphaParam[0]), 0.999);
    const pixelCoverageWeight = conicPixelWeightFromParams(alphaParam, conicParam, pixelCenter);
    const sourceFrontierSupportPixelWeight = sourceFrontierSupportPixelWeightFromParams(alphaParam, conicParam, pixelCenter);
    const alphaTransferWeight = sourceFrontierAlphaTransferWeight(
      pixelCoverageWeight,
      tileCoverageWeight,
      tileLocalSupportWeight,
      sourceFrontierSupportPixelWeight,
      candidateSourceClassMask,
    );
    const coverageAlpha = clamp01(1 - Math.pow(1 - sourceOpacity, alphaTransferWeight));
    const colorTransferWeight = sourceFrontierColorTransferWeight(
      pixelCoverageWeight,
      sourceFrontierSupportPixelWeight,
      alphaTransferWeight,
      candidateSourceClassMask,
    );
    const colorAlpha = clamp01(1 - Math.pow(1 - sourceOpacity, colorTransferWeight));
    const colorOcclusionAlpha = sourceFrontierColorOcclusionAlpha(colorAlpha, coverageAlpha);
    const sourceColor = readSourceColor(sourceColors, splatIndex);
    const transmittanceBefore = remainingTransmission;
    runningColor = sourceColor.map((channel, index) =>
      channel * colorAlpha + runningColor[index] * (1 - colorOcclusionAlpha)
    ) as [number, number, number];
    remainingTransmission *= 1 - coverageAlpha;
    contributors.push({
      layer,
      refIndex,
      splatIndex,
      originalId,
      tileIndex,
      viewRank,
      retentionScore,
      candidateSourceClassMask,
      sourceRole,
      role: sourceRole,
      roleClass,
      retentionBand,
      viewDepth: roundColorChannel(viewDepth),
      alphaParamIndex,
      centerPx: [roundColorChannel(alphaParam[1]), roundColorChannel(alphaParam[2])],
      inverseConic: [roundColorChannel(conicParam[0]), roundColorChannel(conicParam[1]), roundColorChannel(conicParam[2])],
      coverageWeight: roundColorChannel(tileCoverageWeight),
      tileCoverageWeight: roundColorChannel(tileCoverageWeight),
      tileLocalSupportWeight: roundColorChannel(tileLocalSupportWeight),
      pixelCoverageWeight: roundColorChannel(pixelCoverageWeight),
      sourceFrontierSupportPixelWeight: roundColorChannel(sourceFrontierSupportPixelWeight),
      sourceOpacity: roundColorChannel(sourceOpacity),
      opacity: roundColorChannel(sourceOpacity),
      alphaTransferWeight: roundColorChannel(alphaTransferWeight),
      colorTransferWeight: roundColorChannel(colorTransferWeight),
      coverageAlpha: roundColorChannel(coverageAlpha),
      colorAlpha: roundColorChannel(colorAlpha),
      colorOcclusionAlpha: roundColorChannel(colorOcclusionAlpha),
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

function candidateSourceClassMaskForSplatId(
  plan: GpuTileCoveragePlan,
  tileHeaders: Uint32Array,
  splatIndex: number,
): number {
  if (splatIndex >= plan.splatCount || plan.sourceSplatCount <= 0) {
    return 0;
  }
  const headerStride = GPU_TILE_COVERAGE_TILE_HEADER_BYTES / Uint32Array.BYTES_PER_ELEMENT;
  const sourceIndexTableOffset = plan.tileCount * headerStride;
  for (let sourceOrdinal = 0; sourceOrdinal < plan.sourceSplatCount; sourceOrdinal += 1) {
    const sourceBase = sourceIndexTableOffset + sourceOrdinal * headerStride;
    if ((tileHeaders[sourceBase] ?? plan.splatCount) === splatIndex) {
      return tileHeaders[sourceBase + 1] ?? 0;
    }
  }
  return 0;
}

function sourceFrontierAlphaClassMaskFromAlphaParam(
  alphaParam: readonly [number, number, number, number],
): number {
  if (alphaParam[3] > SOURCE_FRONTIER_ALPHA_CLASS_MASK_SENTINEL) {
    return 0;
  }
  const decodedMask = SOURCE_FRONTIER_ALPHA_CLASS_MASK_SENTINEL - alphaParam[3];
  if (!Number.isFinite(decodedMask) || decodedMask <= 0) {
    return 0;
  }
  return Math.trunc(decodedMask);
}

function sourceRoleForCandidateSourceClassMask(candidateSourceClassMask: number): string {
  if ((candidateSourceClassMask & GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS.support) !== 0) {
    return "foreground-sealing";
  }
  if ((candidateSourceClassMask & GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS.retention) !== 0) {
    return "foreground-sealing";
  }
  if ((candidateSourceClassMask & GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS.coverage) !== 0) {
    return "porous-surface";
  }
  if ((candidateSourceClassMask & GPU_PROJECTION_RETENTION_CANDIDATE_SOURCE_CLASS_MASKS.occlusion) !== 0) {
    return "behind-surface";
  }
  return "unclassified";
}

function roleClassForSourceRole(sourceRole: string): string {
  if (sourceRole === "behind-surface") {
    return "behindOrBackground";
  }
  if (sourceRole === "unclassified") {
    return "unknown";
  }
  return "foreground";
}

function retentionBandForSourceRole(sourceRole: string): string {
  if (sourceRole === "behind-surface") {
    return "behind";
  }
  if (sourceRole === "unclassified") {
    return "unknown";
  }
  return "foreground";
}

function conicPixelWeightWithFalloffScaleFromParams(
  alphaParam: readonly [number, number, number, number],
  conicParam: readonly [number, number, number, number],
  pixelCenter: readonly [number, number],
  falloffScale: number,
): number {
  const dx = pixelCenter[0] - alphaParam[1];
  const dy = pixelCenter[1] - alphaParam[2];
  const mahalanobis2 = conicParam[0] * dx * dx + 2 * conicParam[1] * dx * dy + conicParam[2] * dy * dy;
  return Math.exp(-falloffScale * mahalanobis2);
}

function conicPixelWeightFromParams(
  alphaParam: readonly [number, number, number, number],
  conicParam: readonly [number, number, number, number],
  pixelCenter: readonly [number, number]
): number {
  return conicPixelWeightWithFalloffScaleFromParams(alphaParam, conicParam, pixelCenter, 2);
}

function sourceFrontierSupportPixelWeightFromParams(
  alphaParam: readonly [number, number, number, number],
  conicParam: readonly [number, number, number, number],
  pixelCenter: readonly [number, number]
): number {
  return conicPixelWeightWithFalloffScaleFromParams(
    alphaParam,
    conicParam,
    pixelCenter,
    SOURCE_FRONTIER_SUPPORT_FALLOFF_SCALE,
  );
}

function sourceFrontierAlphaTransferWeight(
  pixelCoverageWeight: number,
  tileCoverageWeight: number,
  tileLocalSupportWeight: number,
  sourceFrontierSupportPixelWeight: number,
  candidateSourceClassMask: number,
): number {
  const normalizedPixelWeight = Math.max(Number.isFinite(pixelCoverageWeight) ? pixelCoverageWeight : 0, 0);
  if ((candidateSourceClassMask & SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_MASK) === 0) {
    return normalizedPixelWeight;
  }
  const normalizedTileSupportWeight = Math.max(
    Math.max(Number.isFinite(tileCoverageWeight) ? tileCoverageWeight : 0, 0),
    Math.max(Number.isFinite(tileLocalSupportWeight) ? tileLocalSupportWeight : 0, 0),
  );
  const supportWeight =
    normalizedTileSupportWeight *
    SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE *
    Math.max(Number.isFinite(sourceFrontierSupportPixelWeight) ? sourceFrontierSupportPixelWeight : 0, 0);
  return Math.max(normalizedPixelWeight, supportWeight);
}

function sourceFrontierColorTransferWeight(
  pixelCoverageWeight: number,
  sourceFrontierSupportPixelWeight: number,
  alphaTransferWeight: number,
  candidateSourceClassMask: number,
): number {
  if ((candidateSourceClassMask & SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_MASK) === 0) {
    return Math.max(Number.isFinite(alphaTransferWeight) ? alphaTransferWeight : 0, 0);
  }
  const normalizedAlphaTransferWeight = Math.max(Number.isFinite(alphaTransferWeight) ? alphaTransferWeight : 0, 0);
  const supportColorWeight = Math.max(
    Math.max(Number.isFinite(pixelCoverageWeight) ? pixelCoverageWeight : 0, 0),
    Math.max(Number.isFinite(sourceFrontierSupportPixelWeight) ? sourceFrontierSupportPixelWeight : 0, 0),
  );
  return Math.min(normalizedAlphaTransferWeight, supportColorWeight);
}

function sourceFrontierColorOcclusionAlpha(colorAlpha: number, coverageAlpha: number): number {
  const normalizedColorAlpha = clamp01(colorAlpha);
  const normalizedCoverageAlpha = clamp01(coverageAlpha);
  const alphaColorGap = Math.max(normalizedCoverageAlpha - normalizedColorAlpha, 0);
  return clamp01(normalizedColorAlpha + alphaColorGap * SOURCE_FRONTIER_COLOR_OCCLUSION_GAP_SCALE);
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

function createCandidateSourceInputBuffers(
  device: GPUDevice,
  candidateSources: GpuProjectionRetentionCandidateSources | undefined,
  labelPrefix: string,
  preparedInputs?: GpuProjectionRetentionCandidateSourceInputs,
): CandidateSourceInputBuffers {
  const candidateSourceInputs = preparedInputs ?? buildGpuProjectionRetentionCandidateSourceInputs(candidateSources);
  const bufferBlocker = gpuProjectionRetentionCandidateSourceBufferUnavailableReason(
    candidateSourceInputs,
    device.limits.maxStorageBufferBindingSize,
  );
  if (bufferBlocker) {
    throw new Error(bufferBlocker);
  }
  return {
    candidateSourceInputs,
    candidateSourceRecordsBuffer: createInitializedReadableStorageBuffer(
      device,
      gpuBufferSourceFromU32(candidateSourceInputs.recordU32),
      `${labelPrefix}_candidate_source_records`,
    ),
    candidateSourceGroupsBuffer: createInitializedReadableStorageBuffer(
      device,
      gpuBufferSourceFromU32(candidateSourceInputs.groupU32),
      `${labelPrefix}_candidate_source_groups`,
    ),
  };
}

function gpuBufferSourceFromU32(data: Uint32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint32Array(buffer).set(data);
  return buffer;
}

function createTileHeaderStorageBuffer(
  device: GPUDevice,
  plan: GpuTileCoveragePlan,
  candidateSplatIndexes: Uint32Array | null,
  label: string,
  candidateSourceClassMasks?: Uint32Array | null,
): GPUBuffer {
  if (!candidateSplatIndexes || candidateSplatIndexes.length === 0) {
    return createEmptyStorageBuffer(device, plan.tileHeaderBytes, label);
  }
  const headerU32 = new Uint32Array(plan.tileHeaderBytes / Uint32Array.BYTES_PER_ELEMENT);
  writeGpuTileCoverageSourceIndexTable(headerU32, plan, candidateSplatIndexes, candidateSourceClassMasks ?? undefined);
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

function runtimeBudgetDiagnosticsForRefStatsReadback(
  base: TileLocalPrepassBudgetDiagnostics,
  plan: GpuTileCoveragePlan,
  readback: TileLocalRefStatsReadback
): TileLocalPrepassBudgetDiagnostics {
  if (readback.status !== "present") {
    return base;
  }
  const projectedRefs = readback.projectedScatterRefs;
  const retainedRefs = readback.retainedRefs;
  const droppedRefs = readback.droppedRefs;
  const saturatedTileCount = readback.saturatedTiles;
  const maxRefsPerTile = readback.maxRefsPerTile;
  const overflowReasons = droppedRefs > 0
    ? [
        ...base.overflowReasons.filter((reason) => reason.reason !== "per-tile-ref-cap"),
        {
          reason: "per-tile-ref-cap" as const,
          projectedRefs,
          retainedRefs,
          droppedRefs,
          cappedTileCount: saturatedTileCount,
          maxRefsPerTile,
        },
      ]
    : base.overflowReasons.filter((reason) => reason.reason !== "per-tile-ref-cap");
  return {
    ...base,
    arenaRefs: {
      ...base.arenaRefs,
      projected: projectedRefs,
      retained: retainedRefs,
      dropped: droppedRefs,
      cappedTileCount: saturatedTileCount,
      saturatedRetainedTileCount: saturatedTileCount,
      maxProjectedRefsPerTile: maxRefsPerTile,
      maxRetainedRefsPerTile: maxRefsPerTile,
    },
    overflowReasons,
    capPressure: {
      ...base.capPressure,
      classification: droppedRefs > 0 ? "over-cap" : "within-cap",
      refs: {
        projected: projectedRefs,
        retained: retainedRefs,
        dropped: droppedRefs,
        maxRefsPerTile,
        tileCount: readback.tileCount,
      },
      overflowReasons: droppedRefs > 0
        ? {
            ...omitPerTileRetainedCapOverflowReason(base.capPressure.overflowReasons),
            perTileRetainedCap: droppedRefs,
          }
        : omitPerTileRetainedCapOverflowReason(base.capPressure.overflowReasons),
      policyHooks: droppedRefs > 0 && base.capPressure.policyHooks.length === 0
        ? [
            {
              kind: "tile-local-lod",
              reason: "compress dense same-tile contributors before the retained-ref cap rather than raising it",
              raisesCap: false,
            },
            {
              kind: "tile-local-aggregation",
              reason: "aggregate low-priority dropped contributors into explicit evidence instead of hiding loss",
              raisesCap: false,
            },
          ]
        : base.capPressure.policyHooks,
    },
    heat: {
      cpu: {
        ...base.heat.cpu,
        projectedRefs,
        projectedRefsPerTile: plan.tileCount > 0 ? projectedRefs / plan.tileCount : 0,
        projectedToRetainedRatio: retainedRefs > 0 ? projectedRefs / retainedRefs : 0,
      },
      gpu: {
        ...base.heat.gpu,
        retainedRefs,
      },
    },
  };
}

function omitPerTileRetainedCapOverflowReason(
  overflowReasons: Readonly<Record<string, number>>
): Readonly<Record<string, number>> {
  const { perTileRetainedCap: _perTileRetainedCap, ...remainingOverflowReasons } = overflowReasons;
  return remainingOverflowReasons;
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
  const bridgeStillFresh = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/signature-check",
    () => !tileLocalPrepassBridgeSignatureChanged(state.prepassSignature, bridgeInput)
  );
  if (viewportMatches && (bridgeStillFresh || !allowViewRebuild)) {
    return state;
  }
  const nextState = timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/create-state",
    () => createTileLocalSceneState(
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
    )
  );
  timeOptionalFrameStage(
    frameTiming,
    "tile-local-scene-state-refresh/destroy-previous-state",
    () => destroyTileLocalSceneState(state)
  );
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
    destroyReadbackBuffers([
      state.pendingRefStatsReadback.tileHeaderBuffer,
      state.pendingRefStatsReadback.tileScatterCursorBuffer,
    ]);
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
  state.candidateSourceRecordsBuffer?.destroy();
  state.candidateSourceGroupsBuffer?.destroy();
  state.productionElectionComputeConsumer?.paramsBuffer.destroy();
  state.productionElectionComputeConsumer?.witnessBuffer.destroy();
  if (state.pendingPrefixScatterReadback) {
    state.pendingPrefixScatterReadback.cancelled = true;
    destroyReadbackBuffers([
      state.pendingPrefixScatterReadback.witnessBuffer,
      state.pendingPrefixScatterReadback.prefixCountsBuffer,
      state.pendingPrefixScatterReadback.retainedRecordIndicesBuffer,
    ]);
    state.pendingPrefixScatterReadback = undefined;
  }
  state.productionElectionPrefixScatter?.paramsBuffer.destroy();
  state.productionElectionPrefixScatter?.materializeParamsBuffer.destroy();
  state.productionElectionPrefixScatter?.retainedRecordTileIndexesBuffer.destroy();
  state.productionElectionPrefixScatter?.projectedContributorU32Buffer.destroy();
  state.productionElectionPrefixScatter?.projectedContributorF32Buffer.destroy();
  state.productionElectionPrefixScatter?.prefixCountsBuffer.destroy();
  state.productionElectionPrefixScatter?.prefixOffsetsBuffer.destroy();
  state.productionElectionPrefixScatter?.retainedRecordIndicesBuffer.destroy();
  state.productionElectionPrefixScatter?.witnessBuffer.destroy();
  state.gpuAlphaDensityCompensation?.destroy();
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
  if (!requested) {
    return "source-frontier";
  }
  if (requested === "source-frontier" || requested === "source" || requested === "frontier") {
    return "source-frontier";
  }
  if (requested === "disabled" || requested === "off" || requested === "0") {
    return "disabled";
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
    runtimeConicSources: state.gpuArenaProjectedConicSources,
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
      source: "gpu-tile-header-and-scatter-readback-pending",
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

function refreshStatsOverlayTileLocalRefAccounting(
  state: TileLocalSceneState,
  refAccounting: ReturnType<typeof tileLocalRefAccounting>
): void {
  const currentText = statsEl.textContent ?? "";
  if (!currentText.includes("tile-local:")) {
    return;
  }
  const liveTileRefText = `tile-local: ${state.plan.tileColumns}x${state.plan.tileRows} tiles/${refAccounting.retainedRefs.toLocaleString()} refs`;
  const updatedText = currentText.replace(/tile-local: \d+x\d+ tiles\/[\d,]+ refs/, liveTileRefText);
  statsEl.textContent = updatedText.includes("tile-local live refs:")
    ? updatedText
    : `${updatedText} | tile-local live refs: ${refAccounting.source}`;
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
  const compositorInputContributorsByAnchorId = compositorInputReadback?.status === "present"
    ? compositorInputContributorListByAnchorId(compositorInputReadback)
    : new Map<string, readonly unknown[]>();
  const compositorInputProjectedSupportEncoding =
    compositorInputReadback?.source === "gpu-buffer-readback" &&
    compositorInputReadback.tileRefPayloadEncoding === "source-frontier-score"
      ? "source-frontier-score"
      : "legacy-identity";
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
        contributorsByAnchorId: compositorInputContributorsByAnchorId,
        projectedContributorsByAnchorId: sourceFrontierProjectedSupportFallbackByAnchorId(
          traceContributorListByAnchorId(
            tileLocalState.perPixelProjectedContributors,
            "projectedContributors",
          ),
          compositorInputContributorsByAnchorId,
          compositorInputProjectedSupportEncoding,
        ),
        retainedContributorsByAnchorId: mergeAnchorContributorLists(
          traceContributorListByAnchorId(
            tileLocalState.perPixelRetainedContributors,
            "retainedContributors",
          ),
          compositorInputContributorsByAnchorId,
        ),
        orderedContributorsByAnchorId: mergeAnchorContributorLists(
          pixelOrderTrace
            ? new Map([[pixelOrderTrace.anchorPixel.id, pixelOrderTrace.orderedContributors]])
            : new Map(),
          compositorInputContributorsByAnchorId,
        ),
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
          alphaDensityRoute: tileLocalState.alphaDensityRoute,
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

function compositorInputContributorListByAnchorId(
  readback: TileLocalCompositorInputReadback | undefined,
): Map<string, readonly unknown[]> {
  const byAnchorId = new Map<string, readonly unknown[]>();
  if (readback?.status !== "present") {
    return byAnchorId;
  }
  for (const anchor of readback.anchors) {
    byAnchorId.set(
      anchor.id,
      anchor.contributors.filter((contributor) => contributor.status !== "skipped-invalid-splat"),
    );
  }
  return byAnchorId;
}

function mergeAnchorContributorLists(
  primary: Map<string, readonly unknown[]>,
  fallback: Map<string, readonly unknown[]>,
): Map<string, readonly unknown[]> {
  if (fallback.size === 0) {
    return primary;
  }
  const merged = new Map(primary);
  for (const [anchorId, contributors] of fallback) {
    const primaryContributors = merged.get(anchorId);
    if (!primaryContributors || primaryContributors.length === 0) {
      merged.set(anchorId, contributors);
    }
  }
  return merged;
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
