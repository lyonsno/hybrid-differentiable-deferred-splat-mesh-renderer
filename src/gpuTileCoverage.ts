export const GPU_TILE_COVERAGE_WORKGROUP_SIZE = 64;
export const GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_WIDTH = 8;
export const GPU_TILE_COVERAGE_COMPOSITE_WORKGROUP_HEIGHT = 8;

export const GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES = 96;
export const GPU_TILE_COVERAGE_PROJECTED_BOUNDS_BYTES = 16;
export const GPU_TILE_COVERAGE_TILE_HEADER_BYTES = 16;
export const GPU_TILE_COVERAGE_TILE_REF_BYTES = 16;

export const GPU_TILE_COVERAGE_BINDINGS = {
  frame: 0,
  positions: 1,
  scales: 2,
  rotations: 3,
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
    alphaParamBytes: Math.max(16, maxTileRefs * 4 * Float32Array.BYTES_PER_ELEMENT),
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

export function writeGpuTileCoverageFrameUniforms(
  target: Float32Array,
  viewProj: Float32Array,
  plan: GpuTileCoveragePlan,
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
  target[19] = 0;
  target[20] = plan.tileColumns;
  target[21] = plan.tileRows;
  target[22] = plan.splatCount;
  target[23] = plan.maxTileRefs;
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
