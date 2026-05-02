export const GPU_TILE_COVERAGE_WORKGROUP_SIZE = 64;
export const GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_WIDTH = 8;
export const GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_HEIGHT = 8;

export const GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES = 96;
export const GPU_TILE_COVERAGE_PROJECTED_BOUNDS_BYTES = 16;
export const GPU_TILE_COVERAGE_TILE_HEADER_BYTES = 16;
export const GPU_TILE_COVERAGE_TILE_REF_BYTES = 16;
export const GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF = 8;
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
  projectedBounds: 4,
  tileHeaders: 5,
  tileRefs: 6,
  tileCoverageWeights: 7,
  orderingKeys: 8,
  alphaParams: 9,
  outputColor: 10,
} as const;

export interface GpuTileCoveragePlanInput {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly splatCount: number;
  readonly maxTileRefs: number;
}

export interface GpuTileCoveragePlan extends GpuTileCoveragePlanInput {
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly tileCount: number;
  readonly projectedBoundsBytes: number;
  readonly tileHeaderBytes: number;
  readonly tileRefBytes: number;
  readonly tileCoverageWeightBytes: number;
  readonly orderingKeyBytes: number;
  readonly alphaParamBytes: number;
}

export interface GpuTileCoverageDispatch {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface GpuTileCoverageDispatchPlan {
  readonly projectBounds: GpuTileCoverageDispatch;
  readonly clearTiles: GpuTileCoverageDispatch;
  readonly buildTileRefs: GpuTileCoverageDispatch;
  readonly compositeTiles: GpuTileCoverageDispatch;
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
}

export interface GpuTileContributorArenaBuildInput {
  readonly tileCount: number;
  readonly maxContributors: number;
  readonly contributors: readonly GpuTileContributorArenaProjectedContributor[];
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

export function createGpuTileCoveragePlan(input: GpuTileCoveragePlanInput): GpuTileCoveragePlan {
  const viewportWidth = assertPositiveInteger(input.viewportWidth, "viewport width");
  const viewportHeight = assertPositiveInteger(input.viewportHeight, "viewport height");
  const tileSizePx = assertPositiveInteger(input.tileSizePx, "tile size");
  const splatCount = assertNonNegativeInteger(input.splatCount, "splat count");
  const maxTileRefs = assertPositiveInteger(input.maxTileRefs, "max tile refs");
  if (maxTileRefs < splatCount) {
    throw new Error("Max tile refs must be at least the splat count for the skeleton buffer contract");
  }

  const tileColumns = Math.ceil(viewportWidth / tileSizePx);
  const tileRows = Math.ceil(viewportHeight / tileSizePx);
  const tileCount = tileColumns * tileRows;

  return {
    viewportWidth,
    viewportHeight,
    tileSizePx,
    splatCount,
    maxTileRefs,
    tileColumns,
    tileRows,
    tileCount,
    projectedBoundsBytes: Math.max(16, splatCount * GPU_TILE_COVERAGE_PROJECTED_BOUNDS_BYTES),
    tileHeaderBytes: Math.max(16, tileCount * GPU_TILE_COVERAGE_TILE_HEADER_BYTES),
    tileRefBytes: Math.max(16, maxTileRefs * GPU_TILE_COVERAGE_TILE_REF_BYTES),
    tileCoverageWeightBytes: Math.max(16, maxTileRefs * Float32Array.BYTES_PER_ELEMENT),
    orderingKeyBytes: Math.max(16, maxTileRefs * Uint32Array.BYTES_PER_ELEMENT),
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

export function getGpuTileCoverageDispatchPlan(plan: GpuTileCoveragePlan): GpuTileCoverageDispatchPlan {
  return {
    projectBounds: linearDispatch(plan.splatCount),
    clearTiles: linearDispatch(plan.tileCount),
    buildTileRefs: linearDispatch(plan.splatCount),
    compositeTiles: {
      x: plan.tileColumns,
      y: plan.tileRows,
      z: 1,
    },
  };
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
    throw new Error("GPU contributor arena skeleton must not route first smoke through the incomplete GPU path");
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

  const targetU32 = new Uint32Array(target.buffer, target.byteOffset, target.length);
  targetU32[19] = GPU_TILE_COVERAGE_DEBUG_MODE_CODES[debugMode];
  targetU32[20] = plan.tileColumns;
  targetU32[21] = plan.tileRows;
  targetU32[22] = plan.splatCount;
  targetU32[23] = plan.maxTileRefs;
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
