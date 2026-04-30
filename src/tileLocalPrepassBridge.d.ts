import type { GpuTileCoverageBridge } from "./gpuTileCoverageBridge.js";
import type { SplatAttributes } from "./splats.js";

export function buildTileLocalPrepassBridge(input: {
  readonly attributes: SplatAttributes;
  readonly viewMatrix: Float32Array;
  readonly viewProj: Float32Array;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly samplesPerAxis: number;
  readonly splatScale: number;
  readonly minRadiusPx: number;
}): GpuTileCoverageBridge;
