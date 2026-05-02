export const GPU_TILE_COVERAGE_WORKGROUP_SIZE = 64;
export const GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_WIDTH = 8;
export const GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_HEIGHT = 8;

export const GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES = 96;
export const GPU_TILE_COVERAGE_PROJECTED_BOUNDS_BYTES = 16;
export const GPU_TILE_COVERAGE_TILE_HEADER_BYTES = 16;
export const GPU_TILE_COVERAGE_TILE_REF_BYTES = 16;
export const GPU_TILE_COVERAGE_ALPHA_PARAM_FLOATS_PER_REF = 8;
export const GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES = 64;

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
  readonly legacyTileRefBytes: number;
  readonly prefixCountBytes: number;
  readonly contributorRecordBytes: number;
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
  return {
    tileCount,
    maxContributors,
    headerBytes: assertStorageBytes(plan.tileHeaderBytes, "arena header bytes"),
    legacyTileRefBytes: assertStorageBytes(plan.tileRefBytes, "legacy tile-ref bytes"),
    prefixCountBytes: Math.max(16, tileCount * Uint32Array.BYTES_PER_ELEMENT),
    contributorRecordBytes: Math.max(16, maxContributors * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES),
    recordStrideBytes: GPU_TILE_CONTRIBUTOR_ARENA_RECORD_BYTES,
    forcesFirstSmokeGpuArena: false,
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
