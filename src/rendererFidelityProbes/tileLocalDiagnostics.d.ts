import type { GpuTileCoverageDebugMode, GpuTileCoveragePlan } from "../gpuTileCoverage.js";
import type { TileRefCustodySummary, TileRetentionAudit } from "../gpuTileCoverageBridge.js";

export interface TileLocalDiagnosticSummaryInput {
  readonly debugMode?: GpuTileCoverageDebugMode;
  readonly plan: Pick<GpuTileCoveragePlan, "tileColumns" | "tileRows" | "tileSizePx" | "maxTileRefs">;
  readonly tileEntryCount: number;
  readonly tileHeaders: Uint32Array;
  readonly tileRefCustody?: TileRefCustodySummary;
  readonly retentionAudit?: TileRetentionAudit;
  readonly tileCoverageWeights: Float32Array;
  readonly alphaParamData: Float32Array;
  readonly sourceOpacities?: Float32Array;
  readonly runtimeContributors?: readonly {
    readonly splatIndex?: number;
    readonly originalId?: number;
    readonly tileIndex?: number;
  }[];
  readonly runtimeRefStatsReadback?: {
    readonly status?: string;
    readonly tileCount?: number;
    readonly tileCapacity?: number;
    readonly allocatedRefs?: number;
    readonly projectedScatterRefs?: number;
    readonly retainedRefs?: number;
    readonly droppedRefs?: number;
    readonly nonEmptyTiles?: number;
    readonly saturatedTiles?: number;
    readonly maxRefsPerTile?: number;
  };
  readonly traceCapacityEvidence?: {
    readonly anchors?: readonly {
      readonly id?: string;
      readonly x?: number;
      readonly y?: number;
      readonly tileAddress?: TileLocalRuntimeAnchorTileAddress;
      readonly projectedCount?: number;
      readonly retainedCount?: number;
      readonly finalStepCount?: number;
      readonly retainedIdentities?: readonly TileLocalRuntimeIdentity[];
      readonly finalIdentities?: readonly TileLocalRuntimeIdentity[];
    }[];
  };
}

export interface TileLocalRuntimeIdentity {
  readonly splatIndex: number;
  readonly originalId: number;
}

export interface TileLocalRuntimeAnchorTileAddress {
  readonly tileSizePx: number;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileIndex: number;
  readonly localX: number;
  readonly localY: number;
}

export interface TileLocalRuntimeTileHeaderSummary {
  readonly contributorOffset: number;
  readonly retainedContributorCount: number;
  readonly projectedContributorCount: number;
  readonly droppedContributorCount: number;
  readonly overflowFlags: number;
}

export interface TileLocalRuntimeAnchorTileEvidence {
  readonly id: string;
  readonly anchorPixel: {
    readonly x: number;
    readonly y: number;
  };
  readonly tileAddress: TileLocalRuntimeAnchorTileAddress;
  readonly traceProjectedCount: number;
  readonly traceRetainedCount: number;
  readonly traceFinalStepCount: number;
  readonly runtimeTileHeader: TileLocalRuntimeTileHeaderSummary;
  readonly runtimeConsumedCount: number;
  readonly traceRetainedIdentityHash: string;
  readonly traceFinalIdentityHash: string;
  readonly traceComparisonIdentitySource: "final" | "retained";
  readonly traceComparisonIdentityHash: string;
  readonly runtimeConsumedIdentityHash: string;
  readonly traceRetainedIdentitySample: readonly TileLocalRuntimeIdentity[];
  readonly traceFinalIdentitySample: readonly TileLocalRuntimeIdentity[];
  readonly traceComparisonIdentitySample: readonly TileLocalRuntimeIdentity[];
  readonly runtimeConsumedIdentitySample: readonly TileLocalRuntimeIdentity[];
  readonly missingTraceIdentitySample: readonly TileLocalRuntimeIdentity[];
  readonly extraRuntimeIdentitySample: readonly TileLocalRuntimeIdentity[];
  readonly identityMatch: boolean;
}

export interface TileLocalDiagnosticSummary {
  readonly version: 1;
  readonly debugMode: GpuTileCoverageDebugMode;
  readonly tileGrid: {
    readonly columns: number;
    readonly rows: number;
    readonly tileSizePx: number;
  };
  readonly tileRefs: {
    readonly total: number;
    readonly nonEmptyTiles: number;
    readonly maxPerTile: number;
    readonly averagePerNonEmptyTile: number;
    readonly density: number;
  };
  readonly tileRefCustody: TileRefCustodySummary;
  readonly runtimeRefBudget: {
    readonly classification: "runtime-capacity-loss" | "no-capacity-discrepancy" | "telemetry-insufficient";
    readonly tileCount: number;
    readonly runtimeRetainedRefs: number;
    readonly effectiveRefsPerTile: number;
    readonly maxTraceRetainedContributors: number;
    readonly maxTraceFinalSteps: number;
    readonly frameHeaderAccounting: TileRefCustodySummary;
    readonly anchorTileEvidence: readonly TileLocalRuntimeAnchorTileEvidence[];
    readonly blockingAnchors: readonly {
      readonly id: string;
      readonly x: number | null;
      readonly y: number | null;
      readonly tileAddress: TileLocalRuntimeAnchorTileAddress | null;
      readonly projectedCount: number;
      readonly retainedCount: number;
      readonly finalStepCount: number;
      readonly retainedIdentities: readonly TileLocalRuntimeIdentity[];
      readonly finalIdentities: readonly TileLocalRuntimeIdentity[];
    }[];
  };
  readonly presentationFootprint: {
    readonly classification:
      | "anchor-neighborhood-only-output"
      | "frame-footprint-present"
      | "no-retained-output"
      | "telemetry-insufficient";
    readonly frameTileCount: number;
    readonly nonEmptyTileCount: number;
    readonly nonEmptyTileRatio: number;
    readonly retainedRefCount: number;
    readonly anchorFinalRowsPresent: boolean;
    readonly blocker: string;
  };
  readonly retentionAudit: TileRetentionAudit | null;
  readonly coverageWeight: {
    readonly min: number;
    readonly max: number;
    readonly mean: number;
  };
  readonly alpha: {
    readonly maxSourceOpacity: number;
    readonly meanSourceOpacity: number;
    readonly estimatedMaxAccumulatedAlpha: number;
    readonly estimatedMinTransmittance: number;
    readonly alphaParamRefs: number;
  };
  readonly conicShape: {
    readonly maxMajorRadiusPx: number;
    readonly minMinorRadiusPx: number;
    readonly maxAnisotropyRatio: number;
  };
}

export function summarizeTileLocalDiagnostics(
  input: TileLocalDiagnosticSummaryInput,
): TileLocalDiagnosticSummary;
