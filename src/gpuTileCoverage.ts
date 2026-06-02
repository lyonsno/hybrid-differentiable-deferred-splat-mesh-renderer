export const GPU_TILE_COVERAGE_WORKGROUP_SIZE = 64;
export const GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_WIDTH = 8;
export const GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_HEIGHT = 8;

export const GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES = 112;
export const GPU_TILE_COVERAGE_PROJECTED_BOUNDS_BYTES = 16;
export const GPU_TILE_COVERAGE_TILE_HEADER_BYTES = 16;
export const GPU_TILE_COVERAGE_TILE_REF_BYTES = 16;
export const GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF = 8;
export const GPU_TILE_COVERAGE_COMPACT_FOOTPRINT_SIGMA_RADIUS = 3;
export const GPU_TILE_COVERAGE_COMPACT_FOOTPRINT_EPSILON = 1e-9;
export const GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE = 8;
export const GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE = 4;
export const GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE = 8;
export const GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE = 16;
export const GPU_TILE_CONTRIBUTOR_ARENA_HEADER_BYTES =
  (GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE + GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE) *
  Uint32Array.BYTES_PER_ELEMENT;
export const GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES =
  (GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE + GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE) *
  Uint32Array.BYTES_PER_ELEMENT;

export type GpuTileCoverageDebugMode =
  | "final-color"
  | "coverage-weight"
  | "accumulated-alpha"
  | "transmittance"
  | "tile-ref-count"
  | "conic-shape";

export const GPU_TILE_COVERAGE_DEBUG_MODE_CODES: Record<GpuTileCoverageDebugMode, number> = {
  "final-color": 0,
  "coverage-weight": 1,
  "accumulated-alpha": 2,
  transmittance: 3,
  "tile-ref-count": 4,
  "conic-shape": 5,
};

export const GPU_TILE_COVERAGE_BINDINGS = {
  frame: 0,
  positions: 1,
  colors: 2,
  scales: 3,
  rotations: 4,
  tileHeaders: 5,
  tileRefs: 6,
  tileCoverageWeights: 7,
  alphaParams: 8,
  outputColor: 9,
  tileScatterCursors: 11,
  opacities: 12,
} as const;

export interface GpuTileCoveragePlanInput {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly splatCount: number;
  readonly sourceSplatCount?: number;
  readonly maxTileRefs: number;
  readonly maxTilesPerSplat?: number | null;
}

export interface GpuTileCoveragePlan extends GpuTileCoveragePlanInput {
  readonly sourceSplatCount: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly tileCount: number;
  readonly projectedBoundsBytes: number;
  readonly tileHeaderBytes: number;
  readonly tileRefBytes: number;
  readonly tileCoverageWeightBytes: number;
  readonly alphaParamBytes: number;
}

export interface GpuTileCoverageFootprintParams {
  readonly splatScale?: number;
  readonly minRadiusPx?: number;
}

export interface GpuLiveFootprintPolicyInput {
  readonly majorRadiusPx: number;
  readonly minorRadiusPx: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly minRadiusPx?: number;
}

export interface GpuLiveFootprintPolicyResult {
  readonly majorRadiusPx: number;
  readonly minorRadiusPx: number;
  readonly scale: number;
  readonly areaCapPx: number;
  readonly majorRadiusCapPx: number;
}

export interface GpuTileCoverageCompactFootprintBoundsInput {
  readonly centerPx: readonly [number, number];
  readonly covariancePx: {
    readonly xx: number;
    readonly xy?: number;
    readonly yy: number;
  };
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly maxTilesPerSplat?: number | null;
}

export interface GpuTileCoverageCompactFootprintTileBounds {
  readonly minTileX: number;
  readonly minTileY: number;
  readonly maxTileX: number;
  readonly maxTileY: number;
  readonly tileCount: number;
}

export interface GpuTileCoverageDispatch {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface GpuTileCoverageDispatchPlan {
  readonly clearTiles: GpuTileCoverageDispatch;
  readonly buildTileRefs: GpuTileCoverageDispatch;
  readonly compactRetainedRefs: GpuTileCoverageDispatch;
  readonly compositeTiles: GpuTileCoverageDispatch;
}

export interface GpuTileCoverageSourceIndexTableLayout {
  readonly offsetU32: number;
  readonly strideU32: number;
  readonly count: number;
}

export interface GpuTileContributorArenaLayout {
  readonly tileCount: number;
  readonly maxContributors: number;
  readonly headerBytes: number;
  readonly headerUint32Bytes: number;
  readonly headerFloat32Bytes: number;
  readonly legacyTileRefBytes: number;
  readonly prefixCountBytes: number;
  readonly projectedCountBytes: number;
  readonly scatterCursorBytes: number;
  readonly contributorRecordBytes: number;
  readonly contributorRecordUint32Bytes: number;
  readonly contributorRecordFloat32Bytes: number;
  readonly recordStrideBytes: number;
  readonly forcesFirstSmokeGpuArena: false;
}

export interface GpuTileContributorArenaDispatchPlan {
  readonly clearArena: GpuTileCoverageDispatch;
  readonly countContributors: GpuTileCoverageDispatch;
  readonly prefixCounts: GpuTileCoverageDispatch;
  readonly scatterContributors: GpuTileCoverageDispatch;
}

export interface GpuTileContributorArenaCompatibility {
  readonly compatible: true;
  readonly consumesAnchorContract: true;
  readonly ownsCpuReferenceSemantics: false;
  readonly routesFirstSmokeThroughGpuArena: false;
  readonly legacyTileHeaderBytes: number;
  readonly legacyTileRefBytes: number;
}

export interface GpuTileContributorArenaProjectedContributor {
  readonly splatIndex: number;
  readonly originalId: number;
  readonly tileIndex: number;
  readonly tileX?: number;
  readonly tileY?: number;
  readonly projectedIndex?: number;
  readonly viewRank: number;
  readonly viewDepth: number;
  readonly depthBand: number;
  readonly coverageWeight: number;
  readonly centerPx: readonly [number, number];
  readonly inverseConic: readonly [number, number, number];
  readonly opacity: number;
  readonly coverageAlpha: number;
  readonly transmittanceBefore: number;
  readonly retentionWeight: number;
  readonly occlusionWeight: number;
  readonly occlusionDensity?: number;
  readonly supportSampleWeight?: number;
  readonly supportSampleRetentionWeight?: number;
}

export interface GpuTileContributorArenaBuildInput {
  readonly tileCount: number;
  readonly maxContributors: number;
  readonly contributors: readonly GpuTileContributorArenaProjectedContributor[];
}

export interface GpuProjectionRetentionCandidateSources {
  readonly coverageRecords?: readonly GpuTileContributorArenaProjectedContributor[];
  readonly retentionRecords?: readonly GpuTileContributorArenaProjectedContributor[];
  readonly occlusionRecords?: readonly GpuTileContributorArenaProjectedContributor[];
  readonly supportSampleRecords?: readonly GpuTileContributorArenaProjectedContributor[];
  readonly supportSampleRecordGroups?: readonly (readonly GpuTileContributorArenaProjectedContributor[])[];
}

export interface GpuTileProjectionRetentionArenaBuildInput extends GpuTileContributorArenaBuildInput {
  readonly maxRefsPerTile: number;
  readonly candidateSources?: GpuProjectionRetentionCandidateSources;
}

export interface DeterministicGpuTileContributorArena {
  readonly projectedCounts: Uint32Array;
  readonly prefixCounts: Uint32Array;
  readonly tileHeaderU32: Uint32Array;
  readonly tileHeaderF32: Float32Array;
  readonly contributorRecordU32: Uint32Array;
  readonly contributorRecordF32: Float32Array;
  readonly scatteredRecords: readonly GpuTileContributorArenaProjectedContributor[];
}

export interface DeterministicGpuTileProjectionRetentionArena extends DeterministicGpuTileContributorArena {
  readonly retainedCounts: Uint32Array;
  readonly retainedRecords: readonly GpuTileContributorArenaProjectedContributor[];
  readonly droppedRecords: readonly GpuTileContributorArenaProjectedContributor[];
  readonly projectedContributorCount: number;
  readonly retainedContributorCount: number;
  readonly droppedContributorCount: number;
}

export interface WgslSourceFrontierProductionPoolSeatGapInput {
  readonly records: readonly GpuTileContributorArenaProjectedContributor[];
  readonly maxRefsPerTile: number;
  readonly candidateSources?: GpuProjectionRetentionCandidateSources;
}

export interface WgslSourceFrontierProductionPoolSeatGapWitness {
  readonly status: "structural-gap" | "not-cap-pressured";
  readonly wgslElectionShape: "single-score-slot-competition";
  readonly productionElectionShape: "round-robin-priority-pools-plus-support-quota";
  readonly missingStructures: readonly string[];
  readonly falseClosureGuard: "source-frontier-score-witness-is-not-production-pool-seat-election";
  readonly nextGpuOffloadStage: "production-retention-election-pool-seats";
  readonly projectedCount: number;
  readonly maxRefsPerTile: number;
  readonly supportTarget: number;
  readonly priorityTarget: number;
  readonly productionRetainedIds: readonly number[];
  readonly retainedPoolCounts: {
    readonly retention: number;
    readonly occlusion: number;
    readonly coverage: number;
    readonly support: number;
    readonly backfill: number;
  };
}

export function createGpuTileCoveragePlan(input: GpuTileCoveragePlanInput): GpuTileCoveragePlan {
  const viewportWidth = assertPositiveInteger(input.viewportWidth, "viewport width");
  const viewportHeight = assertPositiveInteger(input.viewportHeight, "viewport height");
  const tileSizePx = assertPositiveInteger(input.tileSizePx, "tile size");
  const splatCount = assertNonNegativeInteger(input.splatCount, "splat count");
  const sourceSplatCount = input.sourceSplatCount === undefined
    ? splatCount
    : assertNonNegativeInteger(input.sourceSplatCount, "source splat count");
  const maxTileRefs = assertPositiveInteger(input.maxTileRefs, "max tile refs");
  if (maxTileRefs < sourceSplatCount) {
    throw new Error("Max tile refs must be at least the source splat count for the skeleton buffer contract");
  }
  const maxTilesPerSplat = input.maxTilesPerSplat === undefined || input.maxTilesPerSplat === null
    ? null
    : assertNonNegativeInteger(input.maxTilesPerSplat, "max tiles per splat");

  const tileColumns = Math.ceil(viewportWidth / tileSizePx);
  const tileRows = Math.ceil(viewportHeight / tileSizePx);
  const tileCount = tileColumns * tileRows;
  const sourceIndexTableEntries = sourceSplatCount !== splatCount || (maxTilesPerSplat !== null && maxTilesPerSplat > 0)
    ? sourceSplatCount
    : 0;

  return {
    viewportWidth,
    viewportHeight,
    tileSizePx,
    splatCount,
    sourceSplatCount,
    maxTileRefs,
    maxTilesPerSplat,
    tileColumns,
    tileRows,
    tileCount,
    projectedBoundsBytes: Math.max(16, sourceSplatCount * GPU_TILE_COVERAGE_PROJECTED_BOUNDS_BYTES),
    tileHeaderBytes: Math.max(16, (tileCount + sourceIndexTableEntries) * GPU_TILE_COVERAGE_TILE_HEADER_BYTES),
    tileRefBytes: Math.max(16, maxTileRefs * GPU_TILE_COVERAGE_TILE_REF_BYTES),
    tileCoverageWeightBytes: Math.max(16, maxTileRefs * Float32Array.BYTES_PER_ELEMENT),
    alphaParamBytes: Math.max(16, maxTileRefs * GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF * Float32Array.BYTES_PER_ELEMENT),
  };
}

export function createGpuTileContributorArenaLayout(
  plan: Pick<GpuTileCoveragePlan, "tileCount" | "maxTileRefs" | "tileHeaderBytes" | "tileRefBytes">,
): GpuTileContributorArenaLayout {
  const tileCount = assertNonNegativeInteger(plan.tileCount, "arena tile count");
  const maxContributors = assertNonNegativeInteger(plan.maxTileRefs, "arena max contributors");
  const headerUint32Bytes = Math.max(
    16,
    tileCount * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE * Uint32Array.BYTES_PER_ELEMENT,
  );
  const headerFloat32Bytes = Math.max(
    16,
    tileCount * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE * Float32Array.BYTES_PER_ELEMENT,
  );
  const countBytes = Math.max(16, tileCount * Uint32Array.BYTES_PER_ELEMENT);
  const contributorRecordUint32Bytes = Math.max(
    16,
    maxContributors * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE * Uint32Array.BYTES_PER_ELEMENT,
  );
  const contributorRecordFloat32Bytes = Math.max(
    16,
    maxContributors * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE * Float32Array.BYTES_PER_ELEMENT,
  );
  return {
    tileCount,
    maxContributors,
    headerBytes: headerUint32Bytes + headerFloat32Bytes,
    headerUint32Bytes,
    headerFloat32Bytes,
    legacyTileRefBytes: assertStorageBytes(plan.tileRefBytes, "legacy tile-ref bytes"),
    prefixCountBytes: countBytes,
    projectedCountBytes: countBytes,
    scatterCursorBytes: countBytes,
    contributorRecordBytes: contributorRecordUint32Bytes + contributorRecordFloat32Bytes,
    contributorRecordUint32Bytes,
    contributorRecordFloat32Bytes,
    recordStrideBytes: GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES,
    forcesFirstSmokeGpuArena: false,
  };
}

export function buildDeterministicGpuTileContributorArena(
  input: GpuTileContributorArenaBuildInput,
): DeterministicGpuTileContributorArena {
  const tileCount = assertNonNegativeInteger(input.tileCount, "arena tile count");
  const maxContributors = assertNonNegativeInteger(input.maxContributors, "arena max contributors");
  const contributors = input.contributors.map(validateProjectedContributor);
  if (contributors.length > maxContributors) {
    throw new RangeError("GPU contributor arena max contributors must cover projected contributors");
  }

  const projectedCounts = new Uint32Array(tileCount);
  for (const contributor of contributors) {
    if (contributor.tileIndex >= tileCount) {
      throw new RangeError("GPU contributor arena contributor tileIndex exceeds tile count");
    }
    projectedCounts[contributor.tileIndex] += 1;
  }

  const prefixCounts = new Uint32Array(tileCount);
  let runningOffset = 0;
  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    prefixCounts[tileIndex] = runningOffset;
    runningOffset += projectedCounts[tileIndex];
  }

  const scatterCursors = new Uint32Array(tileCount);
  const tileHeaderU32 = new Uint32Array(Math.max(0, tileCount * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE));
  const tileHeaderF32 = new Float32Array(Math.max(0, tileCount * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE));
  const contributorRecordU32 = new Uint32Array(
    Math.max(0, maxContributors * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE),
  );
  const contributorRecordF32 = new Float32Array(
    Math.max(0, maxContributors * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE),
  );
  const scatteredRecords = new Array<GpuTileContributorArenaProjectedContributor>(contributors.length);
  const maxViewRank = new Uint32Array(tileCount);
  const minDepth = new Float32Array(tileCount);
  const maxDepth = new Float32Array(tileCount);
  minDepth.fill(Number.POSITIVE_INFINITY);
  maxDepth.fill(Number.NEGATIVE_INFINITY);
  maxViewRank.fill(0xffffffff);

  for (const contributor of contributors) {
    const tileIndex = contributor.tileIndex;
    const recordIndex = prefixCounts[tileIndex] + scatterCursors[tileIndex];
    scatterCursors[tileIndex] += 1;
    writeContributorRecord(contributorRecordU32, contributorRecordF32, recordIndex, contributor);
    scatteredRecords[recordIndex] = { ...contributor };
    maxViewRank[tileIndex] = maxViewRank[tileIndex] === 0xffffffff
      ? contributor.viewRank
      : Math.max(maxViewRank[tileIndex], contributor.viewRank);
    minDepth[tileIndex] = Math.min(minDepth[tileIndex], contributor.viewDepth);
    maxDepth[tileIndex] = Math.max(maxDepth[tileIndex], contributor.viewDepth);
  }

  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    const headerU32Base = tileIndex * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE;
    const headerF32Base = tileIndex * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE;
    const count = projectedCounts[tileIndex];
    tileHeaderU32[headerU32Base] = prefixCounts[tileIndex];
    tileHeaderU32[headerU32Base + 1] = count;
    tileHeaderU32[headerU32Base + 2] = count;
    tileHeaderU32[headerU32Base + 3] = 0;
    tileHeaderU32[headerU32Base + 4] = 0;
    tileHeaderU32[headerU32Base + 5] = count === 0 ? 0xffffffff : maxViewRank[tileIndex];
    tileHeaderF32[headerF32Base] = count === 0 ? Number.POSITIVE_INFINITY : minDepth[tileIndex];
    tileHeaderF32[headerF32Base + 1] = count === 0 ? Number.NEGATIVE_INFINITY : maxDepth[tileIndex];
  }

  return {
    projectedCounts,
    prefixCounts,
    tileHeaderU32,
    tileHeaderF32,
    contributorRecordU32,
    contributorRecordF32,
    scatteredRecords,
  };
}

export function buildDeterministicGpuTileProjectionRetentionArena(
  input: GpuTileProjectionRetentionArenaBuildInput,
): DeterministicGpuTileProjectionRetentionArena {
  const tileCount = assertNonNegativeInteger(input.tileCount, "arena tile count");
  const maxContributors = assertNonNegativeInteger(input.maxContributors, "arena max contributors");
  const maxRefsPerTile = assertPositiveInteger(input.maxRefsPerTile, "arena max refs per tile");
  const contributors = input.contributors.map(validateProjectedContributor);
  if (contributors.length > maxContributors) {
    throw new RangeError("GPU contributor arena max contributors must cover projected contributors");
  }

  const contributorsByTile = Array.from({ length: tileCount }, () => [] as GpuTileContributorArenaProjectedContributor[]);
  for (const contributor of contributors) {
    if (contributor.tileIndex >= tileCount) {
      throw new RangeError("GPU contributor arena contributor tileIndex exceeds tile count");
    }
    contributorsByTile[contributor.tileIndex].push(contributor);
  }

  const retainedRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const droppedRecords: GpuTileContributorArenaProjectedContributor[] = [];
  const projectedCounts = new Uint32Array(tileCount);
  const retainedCounts = new Uint32Array(tileCount);
  const tileHeaderU32 = new Uint32Array(Math.max(0, tileCount * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE));
  const tileHeaderF32 = new Float32Array(Math.max(0, tileCount * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE));
  const candidateSourcesByTile = indexGpuProjectionRetentionCandidateSourcesByTile(input.candidateSources, tileCount);

  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    const projectedTileRecords = contributorsByTile[tileIndex].sort(compareGpuProjectionRetentionCoverageOrder);
    const selected = selectGpuProjectionRetentionRecords(
      projectedTileRecords,
      maxRefsPerTile,
      candidateSourcesByTile[tileIndex],
    );
    const selectedKeys = new Set(selected.map(gpuProjectionRetentionRecordKey));
    const retainedTileRecords = selected.sort(compareGpuProjectionRetentionCompositorOrder);
    const retainedOffset = retainedRecords.length;
    retainedRecords.push(...retainedTileRecords);
    for (const record of projectedTileRecords) {
      if (!selectedKeys.has(gpuProjectionRetentionRecordKey(record))) {
        droppedRecords.push(record);
      }
    }

    const projectedCount = projectedTileRecords.length;
    const retainedCount = retainedTileRecords.length;
    const droppedCount = Math.max(0, projectedCount - retainedCount);
    projectedCounts[tileIndex] = projectedCount;
    retainedCounts[tileIndex] = retainedCount;

    const headerU32Base = tileIndex * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_UINT32_STRIDE;
    const headerF32Base = tileIndex * GPU_TILE_CONTRIBUTOR_ARENA_HEADER_FLOAT32_STRIDE;
    tileHeaderU32[headerU32Base] = retainedOffset;
    tileHeaderU32[headerU32Base + 1] = retainedCount;
    tileHeaderU32[headerU32Base + 2] = projectedCount;
    tileHeaderU32[headerU32Base + 3] = droppedCount;
    tileHeaderU32[headerU32Base + 4] = droppedCount > 0 ? 1 : 0;
    tileHeaderU32[headerU32Base + 5] = retainedCount === 0 ? 0xffffffff : maxRetainedViewRank(retainedTileRecords);
    tileHeaderF32[headerF32Base] = retainedCount === 0 ? Number.POSITIVE_INFINITY : minRetainedDepth(retainedTileRecords);
    tileHeaderF32[headerF32Base + 1] = retainedCount === 0 ? Number.NEGATIVE_INFINITY : maxRetainedDepth(retainedTileRecords);
  }

  const retainedArena = buildDeterministicGpuTileContributorArena({
    tileCount,
    maxContributors,
    contributors: retainedRecords,
  });

  return {
    ...retainedArena,
    projectedCounts,
    retainedCounts,
    tileHeaderU32,
    tileHeaderF32,
    retainedRecords,
    droppedRecords,
    projectedContributorCount: contributors.length,
    retainedContributorCount: retainedRecords.length,
    droppedContributorCount: droppedRecords.length,
  };
}

export function inspectWgslSourceFrontierProductionPoolSeatGap(
  input: WgslSourceFrontierProductionPoolSeatGapInput,
): WgslSourceFrontierProductionPoolSeatGapWitness {
  const maxRefsPerTile = assertPositiveInteger(input.maxRefsPerTile, "source-frontier pool-seat witness max refs per tile");
  const records = input.records.map(validateProjectedContributor);
  const supportGroups = gpuProjectionRetentionSupportSampleGroups(records, input.candidateSources);
  const supportTarget = records.length > maxRefsPerTile && supportGroups.length > 0
    ? Math.max(1, Math.floor(maxRefsPerTile * 0.25))
    : 0;
  const priorityTarget = maxRefsPerTile - supportTarget;
  const productionRetained = selectGpuProjectionRetentionRecords(records, maxRefsPerTile, input.candidateSources);

  return {
    status: records.length > maxRefsPerTile ? "structural-gap" : "not-cap-pressured",
    wgslElectionShape: "single-score-slot-competition",
    productionElectionShape: "round-robin-priority-pools-plus-support-quota",
    missingStructures: records.length > maxRefsPerTile
      ? [
          "retention-occlusion-coverage-round-robin",
          "support-sample-final-quota",
        ]
      : [],
    falseClosureGuard: "source-frontier-score-witness-is-not-production-pool-seat-election",
    nextGpuOffloadStage: "production-retention-election-pool-seats",
    projectedCount: records.length,
    maxRefsPerTile,
    supportTarget,
    priorityTarget,
    productionRetainedIds: productionRetained.map((record) => record.originalId),
    retainedPoolCounts: countGpuProjectionRetentionPoolSeats(
      productionRetained,
      records,
      input.candidateSources,
    ),
  };
}

export function getGpuTileCoverageDispatchPlan(plan: GpuTileCoveragePlan): GpuTileCoverageDispatchPlan {
  return {
    clearTiles: linearDispatch(plan.tileCount),
    buildTileRefs: linearDispatch(plan.sourceSplatCount),
    compactRetainedRefs: linearDispatch(plan.tileCount),
    compositeTiles: {
      x: Math.ceil(plan.viewportWidth / GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_WIDTH),
      y: Math.ceil(plan.viewportHeight / GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_HEIGHT),
      z: 1,
    },
  };
}

export function writeGpuTileCoverageSourceIndexTable(
  target: Uint32Array,
  plan: Pick<GpuTileCoveragePlan, "tileCount" | "tileHeaderBytes">,
  candidateSplatIndexes: ArrayLike<number>,
): GpuTileCoverageSourceIndexTableLayout {
  const tileCount = assertNonNegativeInteger(plan.tileCount, "source-index table tile count");
  const tileHeaderBytes = assertPositiveInteger(plan.tileHeaderBytes, "source-index table header bytes");
  const strideU32 = GPU_TILE_COVERAGE_TILE_HEADER_BYTES / Uint32Array.BYTES_PER_ELEMENT;
  const offsetU32 = tileCount * strideU32;
  const requiredLength = offsetU32 + candidateSplatIndexes.length * strideU32;
  if (target.length * Uint32Array.BYTES_PER_ELEMENT < tileHeaderBytes) {
    throw new Error("GPU tile coverage source-index table target is smaller than the tile-header plan");
  }
  if (target.length < requiredLength) {
    throw new Error("GPU tile coverage source-index table target is too small for compact source ids");
  }

  for (let index = 0; index < candidateSplatIndexes.length; index += 1) {
    target[offsetU32 + index * strideU32] = assertNonNegativeInteger(
      candidateSplatIndexes[index],
      "source-index table splat id",
    );
  }
  return { offsetU32, strideU32, count: candidateSplatIndexes.length };
}

export function getGpuTileContributorArenaDispatchPlan(plan: GpuTileCoveragePlan): GpuTileContributorArenaDispatchPlan {
  return {
    clearArena: linearDispatch(plan.tileCount),
    countContributors: linearDispatch(plan.splatCount),
    prefixCounts: linearDispatch(plan.tileCount),
    scatterContributors: linearDispatch(plan.splatCount),
  };
}

export function assertGpuTileContributorArenaCompatibility(
  plan: Pick<GpuTileCoveragePlan, "tileHeaderBytes" | "tileRefBytes">,
  arena: Partial<GpuTileContributorArenaLayout>,
): GpuTileContributorArenaCompatibility {
  if (typeof arena.headerBytes !== "number" || !Number.isInteger(arena.headerBytes) || arena.headerBytes < plan.tileHeaderBytes) {
    throw new Error("GPU contributor arena header storage must preserve the legacy tile-header capacity");
  }
  if (
    typeof arena.legacyTileRefBytes !== "number" ||
    !Number.isInteger(arena.legacyTileRefBytes) ||
    arena.legacyTileRefBytes < plan.tileRefBytes
  ) {
    throw new Error("GPU contributor arena legacy tile-ref storage must preserve the flat-list compatibility path");
  }
  if (arena.forcesFirstSmokeGpuArena !== false) {
    throw new Error("GPU contributor arena carrier must not route first smoke through the GPU path by default");
  }
  return {
    compatible: true,
    consumesAnchorContract: true,
    ownsCpuReferenceSemantics: false,
    routesFirstSmokeThroughGpuArena: false,
    legacyTileHeaderBytes: plan.tileHeaderBytes,
    legacyTileRefBytes: plan.tileRefBytes,
  };
}

export function writeGpuTileCoverageFrameUniforms(
  target: Float32Array,
  viewProj: Float32Array,
  plan: GpuTileCoveragePlan,
  debugMode: GpuTileCoverageDebugMode = "final-color",
  footprintParams: GpuTileCoverageFootprintParams = {},
): void {
  if (target.length < GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT) {
    throw new Error("GPU tile coverage frame uniform target is too small");
  }
  if (viewProj.length < 16) {
    throw new Error("GPU tile coverage view-projection matrix must contain at least 16 floats");
  }

  target.set(viewProj.slice(0, 16), 0);
  target[16] = plan.viewportWidth;
  target[17] = plan.viewportHeight;
  target[18] = plan.tileSizePx;
  target[19] = GPU_TILE_COVERAGE_DEBUG_MODE_CODES[debugMode];

  const targetU32 = new Uint32Array(target.buffer, target.byteOffset, target.length);
  targetU32[20] = plan.tileColumns;
  targetU32[21] = plan.tileRows;
  targetU32[22] = plan.splatCount;
  targetU32[23] = plan.maxTileRefs;
  target[24] = finiteNonNegativeOrDefault(footprintParams.splatScale, 1);
  target[25] = finiteNonNegativeOrDefault(footprintParams.minRadiusPx, 1.5);
  targetU32[26] = plan.sourceSplatCount;
  targetU32[27] = plan.maxTilesPerSplat ?? 0;
}

export function resolveGpuLiveFootprintPolicy(input: GpuLiveFootprintPolicyInput): GpuLiveFootprintPolicyResult {
  const viewportWidth = finitePositiveOrDefault(input.viewportWidth, 1);
  const viewportHeight = finitePositiveOrDefault(input.viewportHeight, 1);
  const minRadiusPx = finiteNonNegativeOrDefault(input.minRadiusPx, 1.5);
  const majorRadiusPx = Math.max(finiteNonNegativeOrDefault(input.majorRadiusPx, minRadiusPx), minRadiusPx);
  const minorRadiusPx = Math.max(finiteNonNegativeOrDefault(input.minorRadiusPx, minRadiusPx), minRadiusPx);
  const areaCapPx = viewportWidth * viewportHeight * 0.01;
  const majorRadiusCapPx = Math.max(Math.min(viewportWidth, viewportHeight) * 0.65, minRadiusPx);
  const footprintAreaPx = Math.PI * majorRadiusPx * minorRadiusPx;
  const areaScale = Math.sqrt(areaCapPx / Math.max(footprintAreaPx, areaCapPx));
  const majorScale = majorRadiusCapPx / Math.max(majorRadiusPx, majorRadiusCapPx);
  const scale = Math.min(areaScale, majorScale, 1);
  const cappedMinorRadiusPx = Math.max(minorRadiusPx * scale, minRadiusPx);
  return {
    majorRadiusPx: Math.max(majorRadiusPx * scale, cappedMinorRadiusPx),
    minorRadiusPx: cappedMinorRadiusPx,
    scale,
    areaCapPx,
    majorRadiusCapPx,
  };
}

export function resolveGpuTileCoverageCompactFootprintTileBounds(
  input: GpuTileCoverageCompactFootprintBoundsInput,
): GpuTileCoverageCompactFootprintTileBounds {
  const viewportWidth = finitePositiveOrDefault(input.viewportWidth, 1);
  const viewportHeight = finitePositiveOrDefault(input.viewportHeight, 1);
  const tileSizePx = finitePositiveOrDefault(input.tileSizePx, 1);
  const tileColumns = Math.max(1, Math.ceil(viewportWidth / tileSizePx));
  const tileRows = Math.max(1, Math.ceil(viewportHeight / tileSizePx));
  const centerX = finiteOrDefault(input.centerPx[0], 0);
  const centerY = finiteOrDefault(input.centerPx[1], 0);
  const covarianceXx = Math.max(finiteOrDefault(input.covariancePx.xx, 0), 0);
  const covarianceYy = Math.max(finiteOrDefault(input.covariancePx.yy, 0), 0);
  const radiusX = GPU_TILE_COVERAGE_COMPACT_FOOTPRINT_SIGMA_RADIUS * Math.sqrt(covarianceXx);
  const radiusY = GPU_TILE_COVERAGE_COMPACT_FOOTPRINT_SIGMA_RADIUS * Math.sqrt(covarianceYy);
  const minCenterX = clampNumber(centerX - radiusX, 0, viewportWidth);
  const minCenterY = clampNumber(centerY - radiusY, 0, viewportHeight);
  const maxCenterX = clampNumber(centerX + radiusX, 0, viewportWidth);
  const maxCenterY = clampNumber(centerY + radiusY, 0, viewportHeight);
  let minTileX = clampInteger(Math.floor(minCenterX / tileSizePx), 0, tileColumns - 1);
  let minTileY = clampInteger(Math.floor(minCenterY / tileSizePx), 0, tileRows - 1);
  let maxTileX = clampInteger(
    Math.floor(Math.max(maxCenterX - GPU_TILE_COVERAGE_COMPACT_FOOTPRINT_EPSILON, 0) / tileSizePx),
    0,
    tileColumns - 1,
  );
  let maxTileY = clampInteger(
    Math.floor(Math.max(maxCenterY - GPU_TILE_COVERAGE_COMPACT_FOOTPRINT_EPSILON, 0) / tileSizePx),
    0,
    tileRows - 1,
  );

  if (input.maxTilesPerSplat !== undefined && input.maxTilesPerSplat !== null && input.maxTilesPerSplat > 0) {
    const capped = resolveGpuTileCoverageMaxTilesPerSplatBounds({
      centerPx: [centerX, centerY],
      tileSizePx,
      minTileX,
      minTileY,
      maxTileX,
      maxTileY,
      maxTilesPerSplat: input.maxTilesPerSplat,
    });
    minTileX = capped.minTileX;
    minTileY = capped.minTileY;
    maxTileX = capped.maxTileX;
    maxTileY = capped.maxTileY;
  }

  return {
    minTileX,
    minTileY,
    maxTileX,
    maxTileY,
    tileCount: Math.max(0, maxTileX - minTileX + 1) * Math.max(0, maxTileY - minTileY + 1),
  };
}

function resolveGpuTileCoverageMaxTilesPerSplatBounds(input: {
  readonly centerPx: readonly [number, number];
  readonly tileSizePx: number;
  readonly minTileX: number;
  readonly minTileY: number;
  readonly maxTileX: number;
  readonly maxTileY: number;
  readonly maxTilesPerSplat: number;
}): GpuTileCoverageCompactFootprintTileBounds {
  const radiusTiles = Math.max(Math.floor((Math.sqrt(input.maxTilesPerSplat) - 1) / 2), 0);
  const footprintCapTileX = clampInteger(
    Math.floor(finiteOrDefault(input.centerPx[0], 0) / input.tileSizePx),
    input.minTileX,
    input.maxTileX,
  );
  const footprintCapTileY = clampInteger(
    Math.floor(finiteOrDefault(input.centerPx[1], 0) / input.tileSizePx),
    input.minTileY,
    input.maxTileY,
  );
  const minTileX = Math.max(input.minTileX, footprintCapTileX - Math.min(footprintCapTileX, radiusTiles));
  const minTileY = Math.max(input.minTileY, footprintCapTileY - Math.min(footprintCapTileY, radiusTiles));
  const maxTileX = Math.min(input.maxTileX, footprintCapTileX + radiusTiles);
  const maxTileY = Math.min(input.maxTileY, footprintCapTileY + radiusTiles);
  return {
    minTileX,
    minTileY,
    maxTileX,
    maxTileY,
    tileCount: Math.max(0, maxTileX - minTileX + 1) * Math.max(0, maxTileY - minTileY + 1),
  };
}

function finiteNonNegativeOrDefault(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function finiteOrDefault(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function finitePositiveOrDefault(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clampNumber(value: number, minValue: number, maxValue: number): number {
  return Math.min(Math.max(value, minValue), maxValue);
}

function clampInteger(value: number, minValue: number, maxValue: number): number {
  return Math.trunc(clampNumber(value, minValue, maxValue));
}

function linearDispatch(count: number): GpuTileCoverageDispatch {
  return {
    x: Math.ceil(count / GPU_TILE_COVERAGE_WORKGROUP_SIZE),
    y: 1,
    z: 1,
  };
}

function assertPositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`GPU tile coverage ${label} must be a positive integer`);
  }
  return value;
}

function assertNonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`GPU tile coverage ${label} must be a non-negative integer`);
  }
  return value;
}

function assertStorageBytes(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 16) {
    throw new Error(`GPU tile coverage ${label} must reserve at least one storage slot`);
  }
  return value;
}

function validateProjectedContributor(
  contributor: GpuTileContributorArenaProjectedContributor,
): GpuTileContributorArenaProjectedContributor {
  assertNonNegativeInteger(contributor.splatIndex, "arena contributor splatIndex");
  assertNonNegativeInteger(contributor.originalId, "arena contributor originalId");
  assertNonNegativeInteger(contributor.tileIndex, "arena contributor tileIndex");
  assertNonNegativeInteger(contributor.viewRank, "arena contributor viewRank");
  assertFiniteNumber(contributor.viewDepth, "arena contributor viewDepth");
  assertFiniteNumber(contributor.depthBand, "arena contributor depthBand");
  assertFiniteNumber(contributor.coverageWeight, "arena contributor coverageWeight");
  assertFiniteTuple(contributor.centerPx, 2, "arena contributor centerPx");
  assertFiniteTuple(contributor.inverseConic, 3, "arena contributor inverseConic");
  assertUnitInterval(contributor.opacity, "arena contributor opacity");
  assertUnitInterval(contributor.coverageAlpha, "arena contributor coverageAlpha");
  assertUnitInterval(contributor.transmittanceBefore, "arena contributor transmittanceBefore");
  assertFiniteNumber(contributor.retentionWeight, "arena contributor retentionWeight");
  assertFiniteNumber(contributor.occlusionWeight, "arena contributor occlusionWeight");
  if (contributor.occlusionDensity !== undefined) {
    assertFiniteNumber(contributor.occlusionDensity, "arena contributor occlusionDensity");
  }
  if (contributor.supportSampleWeight !== undefined) {
    assertFiniteNumber(contributor.supportSampleWeight, "arena contributor supportSampleWeight");
  }
  if (contributor.supportSampleRetentionWeight !== undefined) {
    assertFiniteNumber(contributor.supportSampleRetentionWeight, "arena contributor supportSampleRetentionWeight");
  }
  return {
    ...contributor,
    centerPx: [contributor.centerPx[0], contributor.centerPx[1]],
    inverseConic: [contributor.inverseConic[0], contributor.inverseConic[1], contributor.inverseConic[2]],
  };
}

function writeContributorRecord(
  targetU32: Uint32Array,
  targetF32: Float32Array,
  recordIndex: number,
  contributor: GpuTileContributorArenaProjectedContributor,
): void {
  const u32Base = recordIndex * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE;
  const f32Base = recordIndex * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE;
  targetU32[u32Base] = contributor.splatIndex;
  targetU32[u32Base + 1] = contributor.originalId;
  targetU32[u32Base + 2] = contributor.tileIndex;
  targetU32[u32Base + 3] = recordIndex;
  targetU32[u32Base + 4] = contributor.viewRank;
  targetF32[f32Base] = contributor.viewDepth;
  targetF32[f32Base + 1] = contributor.depthBand;
  targetF32[f32Base + 2] = contributor.coverageWeight;
  targetF32[f32Base + 3] = contributor.centerPx[0];
  targetF32[f32Base + 4] = contributor.centerPx[1];
  targetF32[f32Base + 5] = contributor.inverseConic[0];
  targetF32[f32Base + 6] = contributor.inverseConic[1];
  targetF32[f32Base + 7] = contributor.inverseConic[2];
  targetF32[f32Base + 8] = contributor.opacity;
  targetF32[f32Base + 9] = contributor.coverageAlpha;
  targetF32[f32Base + 10] = contributor.transmittanceBefore;
  targetF32[f32Base + 11] = contributor.retentionWeight;
  targetF32[f32Base + 12] = contributor.occlusionWeight;
}

function selectGpuProjectionRetentionRecords(
  records: readonly GpuTileContributorArenaProjectedContributor[],
  maxRefsPerTile: number,
  candidateSources: GpuProjectionRetentionCandidateSources | undefined,
): GpuTileContributorArenaProjectedContributor[] {
  if (records.length <= maxRefsPerTile) {
    return [...records];
  }
  const selected: GpuTileContributorArenaProjectedContributor[] = [];
  const selectedKeys = new Set<bigint>();
  const supportSampleGroups = gpuProjectionRetentionSupportSampleGroups(records, candidateSources);
  const supportTarget = supportSampleGroups.length > 0 ? Math.max(1, Math.floor(maxRefsPerTile * 0.25)) : 0;
  const priorityTarget = maxRefsPerTile - supportTarget;

  roundRobinSelectGpuProjectionRetentionRecords({
    selected,
    selectedKeys,
    maxSelected: priorityTarget,
    pools: gpuProjectionRetentionPriorityPools(records, candidateSources),
  });
  roundRobinSelectGpuProjectionRetentionRecords({
    selected,
    selectedKeys,
    maxSelected: maxRefsPerTile,
    pools: supportSampleGroups.map((group) => ({
      records: [...group].sort(compareGpuProjectionSupportSamplePriority),
    })),
  });
  if (selected.length >= maxRefsPerTile) {
    return selected;
  }

  return backfillGpuProjectionRetentionRecords(selected, records, maxRefsPerTile);
}

function gpuProjectionRetentionSupportSampleGroups(
  records: readonly GpuTileContributorArenaProjectedContributor[],
  candidateSources: GpuProjectionRetentionCandidateSources | undefined,
): readonly (readonly GpuTileContributorArenaProjectedContributor[])[] {
  const groups = candidateSources?.supportSampleRecordGroups;
  if (groups && groups.length > 0) {
    return groups;
  }
  const flatSupportRecords = candidateSources?.supportSampleRecords;
  return flatSupportRecords && flatSupportRecords.length > 0 ? [flatSupportRecords] : [];
}

function gpuProjectionRetentionPriorityPools(
  records: readonly GpuTileContributorArenaProjectedContributor[],
  candidateSources: GpuProjectionRetentionCandidateSources | undefined,
): readonly {
  readonly records: GpuTileContributorArenaProjectedContributor[];
}[] {
  const retentionRecords = candidateSources?.retentionRecords ?? records;
  const occlusionRecords = candidateSources?.occlusionRecords ?? records;
  const coverageRecords = candidateSources?.coverageRecords ?? records;
  return [
    { records: [...retentionRecords].sort(compareGpuProjectionRetentionPriority) },
    { records: [...occlusionRecords].sort(compareGpuProjectionOcclusionPriority) },
    { records: [...coverageRecords].sort(compareGpuProjectionRetentionCoverageOrder) },
  ];
}

function roundRobinSelectGpuProjectionRetentionRecords({
  selected,
  selectedKeys,
  maxSelected,
  pools,
}: {
  readonly selected: GpuTileContributorArenaProjectedContributor[];
  readonly selectedKeys: Set<bigint>;
  readonly maxSelected: number;
  readonly pools: readonly { readonly records: readonly GpuTileContributorArenaProjectedContributor[] }[];
}): void {
  if (maxSelected <= selected.length || pools.length === 0) {
    return;
  }
  const cursors = new Array(pools.length).fill(0);

  while (selected.length < maxSelected) {
    let added = false;
    for (let poolIndex = 0; poolIndex < pools.length && selected.length < maxSelected; poolIndex += 1) {
      const pool = pools[poolIndex].records;
      while (cursors[poolIndex] < pool.length) {
        const record = pool[cursors[poolIndex]];
        cursors[poolIndex] += 1;
        const key = gpuProjectionRetentionRecordKey(record);
        if (selectedKeys.has(key)) {
          continue;
        }
        selected.push(record);
        selectedKeys.add(key);
        added = true;
        break;
      }
    }
    if (!added) {
      break;
    }
  }
}

function backfillGpuProjectionRetentionRecords(
  selected: readonly GpuTileContributorArenaProjectedContributor[],
  records: readonly GpuTileContributorArenaProjectedContributor[],
  maxRefsPerTile: number,
): GpuTileContributorArenaProjectedContributor[] {
  const selectedRecords = [...selected];
  const selectedKeys = new Set(selectedRecords.map(gpuProjectionRetentionRecordKey));
  for (const record of records) {
    if (selectedRecords.length >= maxRefsPerTile) {
      break;
    }
    const key = gpuProjectionRetentionRecordKey(record);
    if (selectedKeys.has(key)) {
      continue;
    }
    selectedRecords.push(record);
    selectedKeys.add(key);
  }
  return selectedRecords;
}

function compareGpuProjectionRetentionCoverageOrder(
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

function compareGpuProjectionRetentionCompositorOrder(
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

function compareGpuProjectionRetentionPriority(
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

function compareGpuProjectionSupportSamplePriority(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number {
  return (
    finiteOrZero(right.supportSampleRetentionWeight) - finiteOrZero(left.supportSampleRetentionWeight) ||
    finiteOrZero(right.supportSampleWeight) - finiteOrZero(left.supportSampleWeight) ||
    right.retentionWeight - left.retentionWeight ||
    right.occlusionWeight - left.occlusionWeight ||
    left.viewRank - right.viewRank ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

function compareGpuProjectionOcclusionPriority(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number {
  const leftDensity = readGpuProjectionOcclusionDensity(left);
  const rightDensity = readGpuProjectionOcclusionDensity(right);
  return (
    rightDensity - leftDensity ||
    right.occlusionWeight - left.occlusionWeight ||
    right.coverageWeight - left.coverageWeight ||
    left.viewRank - right.viewRank ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

function readGpuProjectionOcclusionDensity(contributor: GpuTileContributorArenaProjectedContributor): number {
  const occlusionDensity = contributor.occlusionDensity;
  if (Number.isFinite(occlusionDensity) && occlusionDensity !== undefined) {
    return occlusionDensity;
  }
  return 0;
}

function countGpuProjectionRetentionPoolSeats(
  retainedRecords: readonly GpuTileContributorArenaProjectedContributor[],
  records: readonly GpuTileContributorArenaProjectedContributor[],
  candidateSources: GpuProjectionRetentionCandidateSources | undefined,
): WgslSourceFrontierProductionPoolSeatGapWitness["retainedPoolCounts"] {
  const supportKeys = new Set(
    gpuProjectionRetentionSupportSampleGroups(records, candidateSources)
      .flat()
      .map(gpuProjectionRetentionRecordKey),
  );
  const retentionKeys = new Set((candidateSources?.retentionRecords ?? records).map(gpuProjectionRetentionRecordKey));
  const occlusionKeys = new Set((candidateSources?.occlusionRecords ?? records).map(gpuProjectionRetentionRecordKey));
  const coverageKeys = new Set((candidateSources?.coverageRecords ?? records).map(gpuProjectionRetentionRecordKey));
  const counts = {
    retention: 0,
    occlusion: 0,
    coverage: 0,
    support: 0,
    backfill: 0,
  };

  for (const record of retainedRecords) {
    const key = gpuProjectionRetentionRecordKey(record);
    if (supportKeys.has(key)) {
      counts.support += 1;
    } else if (retentionKeys.has(key)) {
      counts.retention += 1;
    } else if (occlusionKeys.has(key)) {
      counts.occlusion += 1;
    } else if (coverageKeys.has(key)) {
      counts.coverage += 1;
    } else {
      counts.backfill += 1;
    }
  }
  return counts;
}

type MutableGpuProjectionRetentionCandidateSources = {
  coverageRecords?: GpuTileContributorArenaProjectedContributor[];
  retentionRecords?: GpuTileContributorArenaProjectedContributor[];
  occlusionRecords?: GpuTileContributorArenaProjectedContributor[];
  supportSampleRecords?: GpuTileContributorArenaProjectedContributor[];
  supportSampleRecordGroups?: GpuTileContributorArenaProjectedContributor[][];
};

function indexGpuProjectionRetentionCandidateSourcesByTile(
  candidateSources: GpuProjectionRetentionCandidateSources | undefined,
  tileCount: number,
): readonly (GpuProjectionRetentionCandidateSources | undefined)[] {
  const candidateSourcesByTile = Array.from(
    { length: tileCount },
    () => undefined as MutableGpuProjectionRetentionCandidateSources | undefined,
  );
  if (!candidateSources) {
    return candidateSourcesByTile;
  }

  appendGpuProjectionRetentionRecordsByTile(candidateSourcesByTile, "coverageRecords", candidateSources.coverageRecords);
  appendGpuProjectionRetentionRecordsByTile(candidateSourcesByTile, "retentionRecords", candidateSources.retentionRecords);
  appendGpuProjectionRetentionRecordsByTile(candidateSourcesByTile, "occlusionRecords", candidateSources.occlusionRecords);
  appendGpuProjectionRetentionRecordsByTile(candidateSourcesByTile, "supportSampleRecords", candidateSources.supportSampleRecords);
  appendGpuProjectionRetentionSupportSampleGroupsByTile(candidateSourcesByTile, candidateSources.supportSampleRecordGroups);
  return candidateSourcesByTile;
}

function appendGpuProjectionRetentionRecordsByTile(
  candidateSourcesByTile: (MutableGpuProjectionRetentionCandidateSources | undefined)[],
  key: "coverageRecords" | "retentionRecords" | "occlusionRecords" | "supportSampleRecords",
  records: readonly GpuTileContributorArenaProjectedContributor[] | undefined,
): void {
  if (!records) {
    return;
  }
  for (const record of records) {
    const source = mutableGpuProjectionRetentionCandidateSourceForTile(candidateSourcesByTile, record.tileIndex);
    if (!source) {
      continue;
    }
    (source[key] ??= []).push(record);
  }
}

function appendGpuProjectionRetentionSupportSampleGroupsByTile(
  candidateSourcesByTile: (MutableGpuProjectionRetentionCandidateSources | undefined)[],
  groups: readonly (readonly GpuTileContributorArenaProjectedContributor[])[] | undefined,
): void {
  if (!groups) {
    return;
  }
  for (const group of groups) {
    const recordsByTile = new Map<number, GpuTileContributorArenaProjectedContributor[]>();
    for (const record of group) {
      if (record.tileIndex < 0 || record.tileIndex >= candidateSourcesByTile.length) {
        continue;
      }
      const records = recordsByTile.get(record.tileIndex);
      if (records) {
        records.push(record);
      } else {
        recordsByTile.set(record.tileIndex, [record]);
      }
    }
    for (const [tileIndex, records] of recordsByTile) {
      const source = mutableGpuProjectionRetentionCandidateSourceForTile(candidateSourcesByTile, tileIndex);
      if (source) {
        (source.supportSampleRecordGroups ??= []).push(records);
      }
    }
  }
}

function mutableGpuProjectionRetentionCandidateSourceForTile(
  candidateSourcesByTile: (MutableGpuProjectionRetentionCandidateSources | undefined)[],
  tileIndex: number,
): MutableGpuProjectionRetentionCandidateSources | undefined {
  if (tileIndex < 0 || tileIndex >= candidateSourcesByTile.length) {
    return undefined;
  }
  return candidateSourcesByTile[tileIndex] ??= {};
}

function gpuProjectionRetentionRecordKey(contributor: GpuTileContributorArenaProjectedContributor): bigint {
  return (
    (BigInt(contributor.tileIndex) << 128n) |
    (BigInt(contributor.splatIndex) << 64n) |
    BigInt(contributor.originalId)
  );
}

function finiteOrZero(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? value : 0;
}

function maxRetainedViewRank(records: readonly GpuTileContributorArenaProjectedContributor[]): number {
  return records.reduce((maximum, record) => Math.max(maximum, record.viewRank), 0);
}

function minRetainedDepth(records: readonly GpuTileContributorArenaProjectedContributor[]): number {
  return records.reduce((minimum, record) => Math.min(minimum, record.viewDepth), Number.POSITIVE_INFINITY);
}

function maxRetainedDepth(records: readonly GpuTileContributorArenaProjectedContributor[]): number {
  return records.reduce((maximum, record) => Math.max(maximum, record.viewDepth), Number.NEGATIVE_INFINITY);
}

function assertFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`GPU tile coverage ${label} must be finite`);
  }
  return value;
}

function assertUnitInterval(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`GPU tile coverage ${label} must be in [0, 1]`);
  }
  return value;
}

function assertFiniteTuple(value: readonly number[], length: number, label: string): readonly number[] {
  if (!Array.isArray(value) || value.length !== length || !value.every(Number.isFinite)) {
    throw new Error(`GPU tile coverage ${label} must contain ${length} finite values`);
  }
  return value;
}
