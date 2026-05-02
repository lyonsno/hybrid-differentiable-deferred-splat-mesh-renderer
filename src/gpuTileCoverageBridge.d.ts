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

export type TileLocalContributorOverflowFlag =
  | "none"
  | "perTileRetainedCap"
  | "globalProjectedBudget"
  | "invalidProjection"
  | "nearPlaneSupport"
  | "nonFiniteCoverage";

export type TileLocalContributorOverflowDetail =
  | "perTileRetainedCapPolicyReserve"
  | "perTileRetainedCapForegroundBand"
  | "perTileRetainedCapMiddleBand"
  | "perTileRetainedCapBehindSurfaceBand";

export type TileLocalContributorOverflowReason =
  | TileLocalContributorOverflowFlag
  | TileLocalContributorOverflowDetail;

export type TileLocalContributorRetentionStatus = "retained" | "dropped";
export type TileLocalContributorRetentionBand = "front" | "middle" | "back";

export interface TileLocalContributorDeferredSurfaceEvidence {
  readonly surfaceKind: "splat" | "mesh" | "unknown";
  readonly surfaceId: number | null;
  readonly meshPrimitiveId: number | null;
  readonly gbufferVoteWeight: number;
  readonly normalConfidence: number;
  readonly albedoConfidence: number;
  readonly materialConfidence: number;
}

export interface TileLocalContributorTileHeader {
  readonly contributorOffset: number;
  readonly retainedContributorCount: number;
  readonly projectedContributorCount: number;
  readonly droppedContributorCount: number;
  readonly overflowFlags: number;
  readonly maxRetainedViewRank: number;
  readonly minRetainedDepth: number;
  readonly maxRetainedDepth: number;
}

export interface TileLocalContributorRecord {
  readonly splatIndex: number;
  readonly originalId: number;
  readonly tileIndex: number;
  readonly contributorIndex: number;
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
  readonly retentionStatus: TileLocalContributorRetentionStatus;
  readonly retentionBand: TileLocalContributorRetentionBand;
  readonly overflowReason: TileLocalContributorOverflowFlag;
  readonly overflowReasonDetail: TileLocalContributorOverflowDetail | "none";
  readonly deferredSurface: TileLocalContributorDeferredSurfaceEvidence | null;
}

export interface TileLocalProjectedContributorRecord extends TileLocalContributorRecord {
  readonly tileX: number;
  readonly tileY: number;
  readonly projectedIndex: number;
  readonly occlusionDensity: number;
  readonly transmittanceAfter: number;
  /** Backward-compatible alias for retentionStatus === "retained". */
  readonly retained: boolean;
}

export interface TileLocalContributorArena {
  readonly version: 1;
  readonly tileHeaders: readonly TileLocalContributorTileHeader[];
  readonly contributors: readonly TileLocalContributorRecord[];
  readonly projectedContributors: readonly TileLocalProjectedContributorRecord[];
  readonly overflowReasons: Readonly<Record<TileLocalContributorOverflowFlag, number>>;
  readonly overflowReasonNames: Readonly<Record<string, TileLocalContributorOverflowReason>>;
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
  readonly contributorArena?: TileLocalContributorArena;
}

export function buildTileLocalContributorArena(
  coverage: unknown,
  options?: {
    readonly maxRefsPerTile?: number;
    readonly depthBandCount?: number;
  },
): TileLocalContributorArena;

export function buildGpuTileCoverageBridge(
  coverage: unknown,
  options?: {
    readonly maxRefsPerTile?: number;
    readonly depthBandCount?: number;
  },
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
