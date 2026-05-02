import type { GpuTileCoverageBridge, TileLocalContributorArena } from "../gpuTileCoverageBridge.js";

export interface CapPressureRetentionBandCounter {
  readonly total: number;
  readonly coverageHigh: number;
  readonly coverageMedium: number;
  readonly coverageLow: number;
}

export interface CapPressureRetentionSummary {
  readonly version: 1;
  readonly classification: "within-cap" | "at-cap" | "over-cap";
  readonly refs: {
    readonly projected: number;
    readonly retained: number;
    readonly dropped: number;
    readonly maxRefsPerTile: number;
    readonly tileCount: number;
  };
  readonly retainedBands: {
    readonly front: CapPressureRetentionBandCounter;
    readonly middle: CapPressureRetentionBandCounter;
    readonly back: CapPressureRetentionBandCounter;
  };
  readonly droppedBands: {
    readonly front: CapPressureRetentionBandCounter;
    readonly middle: CapPressureRetentionBandCounter;
    readonly back: CapPressureRetentionBandCounter;
  };
  readonly overflowReasons: Readonly<Record<string, number>>;
  readonly lossSignals: {
    readonly foregroundDroppedRefs: number;
    readonly behindSurfaceDroppedRefs: number;
    readonly policyReserveDisplacedRefs: number;
    readonly highCoverageDroppedRefs: number;
    readonly highRetentionDroppedRefs: number;
    readonly highOcclusionDroppedRefs: number;
  };
  readonly policyHooks: readonly {
    readonly kind: "tile-local-lod" | "tile-local-aggregation";
    readonly reason: string;
    readonly raisesCap: false;
  }[];
}

export function summarizeCapPressureRetention(
  bridgeOrArena: GpuTileCoverageBridge | TileLocalContributorArena,
): CapPressureRetentionSummary;
