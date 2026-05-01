export interface GpuTileCoverageBridge {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly tileCount: number;
  readonly splatCount: number;
  readonly tileEntryCount: number;
  readonly projectedBounds: Uint32Array;
  readonly tileHeaders: Uint32Array;
  readonly tileRefs: Uint32Array;
  readonly tileCoverageWeights: Float32Array;
  readonly tileRefShapeParams: Float32Array;
}

export function buildGpuTileCoverageBridge(coverage: unknown): GpuTileCoverageBridge;

export interface GpuTileCoverageAlphaParamSource {
  readonly tileRefs?: Uint32Array;
  readonly tileRefSplatIds?: Uint32Array;
  readonly tileRefShapeParams: Float32Array;
  readonly tileEntryCount?: number;
}

export function writeGpuTileCoverageAlphaParams(
  target: Float32Array,
  bridge: GpuTileCoverageAlphaParamSource,
  effectiveOpacities: Float32Array,
  maxTileRefs?: number,
): void;

export function createGpuTileCoverageBridgeBuffers(device: GPUDevice, bridge: GpuTileCoverageBridge): {
  readonly projectedBoundsBuffer: GPUBuffer;
  readonly tileHeaderBuffer: GPUBuffer;
  readonly tileRefBuffer: GPUBuffer;
  readonly tileCoverageWeightBuffer: GPUBuffer;
};
