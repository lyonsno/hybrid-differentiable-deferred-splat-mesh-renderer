import type { SplatAttributes } from "./splats.js";
import type { GpuTileContributorArenaProjectedContributor } from "./gpuTileCoverage.js";
import type { TileLocalPrepassBridge } from "./tileLocalPrepassBridge.js";

export interface GpuLivePixelContributorTraceResult {
  readonly projectedContributors: readonly GpuTileContributorArenaProjectedContributor[];
  readonly retainedContributors: readonly GpuTileContributorArenaProjectedContributor[];
  readonly perPixelProjectedContributors: TileLocalPrepassBridge["perPixelProjectedContributors"];
  readonly perPixelRetainedContributors: TileLocalPrepassBridge["perPixelRetainedContributors"];
  readonly perPixelFinalColorAccumulation: readonly unknown[];
}

export function buildGpuLivePixelContributorTraces(options: {
  readonly attributes: SplatAttributes;
  readonly effectiveOpacities?: Float32Array;
  readonly viewMatrix?: Float32Array;
  readonly viewProj: Float32Array;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly tileColumns?: number;
  readonly tileRows?: number;
  readonly maxTileRefs?: number;
  readonly splatScale?: number;
  readonly minRadiusPx?: number;
  readonly rendererMetadata?: Record<string, unknown>;
  readonly dispatchCache?: Record<string, unknown>;
  readonly anchors?: readonly unknown[];
}): GpuLivePixelContributorTraceResult;
