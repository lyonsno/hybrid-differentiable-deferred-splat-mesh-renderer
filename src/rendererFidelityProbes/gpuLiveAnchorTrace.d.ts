import type { GpuTileContributorArenaProjectedContributor } from "../gpuTileCoverage.js";
import type {
  TileLocalProjectedPixelContributorTrace,
  TileLocalRetainedPixelContributorTrace,
} from "../gpuTileCoverageBridge.js";
import type { SplatAttributes } from "../splats.js";

export interface GpuLiveAnchorContributorTraceResult {
  readonly projectedContributors: readonly GpuTileContributorArenaProjectedContributor[];
  readonly retainedContributors: readonly GpuTileContributorArenaProjectedContributor[];
  readonly perPixelProjectedContributors: readonly TileLocalProjectedPixelContributorTrace[];
  readonly perPixelRetainedContributors: readonly TileLocalRetainedPixelContributorTrace[];
}

export function buildGpuLiveAnchorContributorTraces(input?: {
  readonly attributes?: SplatAttributes;
  readonly viewMatrix?: Float32Array | readonly number[];
  readonly viewProj?: Float32Array | readonly number[];
  readonly effectiveOpacities?: Float32Array | readonly number[];
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly tileSizePx?: number;
  readonly tileColumns?: number;
  readonly tileRows?: number;
  readonly splatScale?: number;
  readonly minRadiusPx?: number;
  readonly maxRefsPerTile?: number;
  readonly nearFadeEndNdc?: number;
  readonly rendererMetadata?: Record<string, unknown>;
  readonly anchors?: readonly Record<string, unknown>[];
}): GpuLiveAnchorContributorTraceResult;
