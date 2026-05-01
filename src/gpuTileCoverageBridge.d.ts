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
  readonly maxRefsPerTile: number;
  readonly retainedTileEntryCount: number;
}

export function buildGpuTileCoverageBridge(
  coverage: unknown,
  options?: { readonly maxRefsPerTile?: number },
): GpuTileCoverageBridge;

export function createGpuTileCoverageBridgeBuffers(device: GPUDevice, bridge: GpuTileCoverageBridge): {
  readonly projectedBoundsBuffer: GPUBuffer;
  readonly tileHeaderBuffer: GPUBuffer;
  readonly tileRefBuffer: GPUBuffer;
  readonly tileCoverageWeightBuffer: GPUBuffer;
};
