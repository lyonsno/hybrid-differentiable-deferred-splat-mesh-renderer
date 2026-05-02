export interface TileRefCustodySummary {
  readonly projectedTileEntryCount: number;
  readonly retainedTileEntryCount: number;
  readonly evictedTileEntryCount: number;
  readonly cappedTileCount: number;
  readonly saturatedRetainedTileCount: number;
  readonly maxProjectedRefsPerTile: number;
  readonly maxRetainedRefsPerTile: number;
  readonly headerRefCount: number;
  readonly headerAccountingMatches: boolean;
}

export interface TileRetentionAuditSample {
  readonly tileIndex: number;
  readonly tileX: number;
  readonly tileY: number;
  readonly splatIndex: number;
  readonly originalId: number;
  readonly coverageWeight: number;
  readonly retentionWeight: number;
  readonly occlusionWeight: number;
  readonly occlusionDensity: number;
  readonly viewRank: number | null;
}

export interface TileRetentionAuditSummary {
  readonly region: string;
  readonly tileCount: number;
  readonly cappedTileCount: number;
  readonly projectedTileEntryCount: number;
  readonly currentRetainedEntryCount: number;
  readonly legacyRetainedEntryCount: number;
  readonly addedByPolicyCount: number;
  readonly droppedByPolicyCount: number;
  readonly addedRetentionWeightSum: number;
  readonly droppedRetentionWeightSum: number;
  readonly addedOcclusionWeightSum: number;
  readonly droppedOcclusionWeightSum: number;
  readonly addedByPolicySamples: readonly TileRetentionAuditSample[];
  readonly droppedByPolicySamples: readonly TileRetentionAuditSample[];
}

export interface TileRetentionAudit {
  readonly fullFrame: TileRetentionAuditSummary;
  readonly regions: {
    readonly centerLeakBand: TileRetentionAuditSummary;
  };
}

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
  readonly tileRefOrderingKeys: Uint32Array;
  readonly tileRefSourceOpacities: Float32Array;
  readonly tileRefShapeParams: Float32Array;
  readonly maxRefsPerTile: number;
  readonly retainedTileEntryCount: number;
  readonly tileRefCustody: TileRefCustodySummary;
  readonly retentionAudit: TileRetentionAudit;
}

export function buildGpuTileCoverageBridge(
  coverage: unknown,
  options?: { readonly maxRefsPerTile?: number },
): GpuTileCoverageBridge;

export interface GpuTileCoverageAlphaParamSource {
  readonly tileRefs?: Uint32Array;
  readonly tileRefSplatIds?: Uint32Array;
  readonly tileRefSourceOpacities?: Float32Array;
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
