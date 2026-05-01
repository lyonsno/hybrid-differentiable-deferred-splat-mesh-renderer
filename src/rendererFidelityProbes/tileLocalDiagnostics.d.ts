import type { GpuTileCoverageDebugMode, GpuTileCoveragePlan } from "../gpuTileCoverage.js";
import type { TileRefCustodySummary } from "../gpuTileCoverageBridge.js";

export interface TileLocalDiagnosticSummaryInput {
  readonly debugMode?: GpuTileCoverageDebugMode;
  readonly plan: Pick<GpuTileCoveragePlan, "tileColumns" | "tileRows" | "tileSizePx" | "maxTileRefs">;
  readonly tileEntryCount: number;
  readonly tileHeaders: Uint32Array;
  readonly tileRefCustody?: TileRefCustodySummary;
  readonly tileCoverageWeights: Float32Array;
  readonly alphaParamData: Float32Array;
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
