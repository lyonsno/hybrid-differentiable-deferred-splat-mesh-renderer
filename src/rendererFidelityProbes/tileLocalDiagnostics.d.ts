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
  readonly traceCapacityEvidence?: {
    readonly anchors?: readonly {
      readonly id?: string;
      readonly projectedCount?: number;
      readonly retainedCount?: number;
      readonly finalStepCount?: number;
    }[];
  };
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
    readonly blockingAnchors: readonly {
      readonly id: string;
      readonly projectedCount: number;
      readonly retainedCount: number;
      readonly finalStepCount: number;
    }[];
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
