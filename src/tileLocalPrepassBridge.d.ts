import type {
  GpuTileCoverageBridge,
  TileLocalContributorArena,
  TileLocalContributorRecord,
  TileLocalContributorTileHeader,
} from "./gpuTileCoverageBridge.js";
import type { SplatAttributes } from "./splats.js";

export type {
  TileLocalContributorArena,
  TileLocalContributorRecord,
  TileLocalContributorTileHeader,
};

export interface TileLocalPrepassBudgetBandCounter {
  readonly total: number;
  readonly coverageHigh: number;
  readonly coverageMedium: number;
  readonly coverageLow: number;
}

export interface TileLocalPrepassBudgetDiagnostics {
  readonly version: 1;
  readonly arenaRefs: {
    readonly projected: number;
    readonly retained: number;
    readonly dropped: number;
    readonly cappedTileCount: number;
    readonly saturatedRetainedTileCount: number;
    readonly maxProjectedRefsPerTile: number;
    readonly maxRetainedRefsPerTile: number;
  };
  readonly overflowReasons: readonly {
    readonly reason: "per-tile-ref-cap" | "projected-ref-budget" | "header-accounting-mismatch";
    readonly projectedRefs?: number;
    readonly retainedRefs?: number;
    readonly droppedRefs?: number;
    readonly cappedTileCount?: number;
    readonly maxRefsPerTile?: number;
    readonly maxProjectedRefs?: number;
    readonly headerRefCount?: number;
  }[];
  readonly retainedBands: {
    readonly front: TileLocalPrepassBudgetBandCounter;
    readonly middle: TileLocalPrepassBudgetBandCounter;
    readonly back: TileLocalPrepassBudgetBandCounter;
  };
  readonly droppedBands: {
    readonly front: TileLocalPrepassBudgetBandCounter;
    readonly middle: TileLocalPrepassBudgetBandCounter;
    readonly back: TileLocalPrepassBudgetBandCounter;
  };
  readonly heat: {
    readonly cpu: {
      readonly projectedRefs: number;
      readonly projectedRefsPerTile: number;
      readonly projectedToRetainedRatio: number;
      readonly buildDurationMs?: number;
    };
    readonly gpu: {
      readonly retainedRefs: number;
      readonly retainedRefBufferBytes: number;
      readonly coverageWeightBufferBytes: number;
      readonly alphaParamBufferBytes?: number;
      readonly orderingKeyBufferBytes?: number;
      readonly renderDurationMs?: number;
    };
  };
}

export interface TileLocalPrepassBridge extends GpuTileCoverageBridge {
  readonly budgetDiagnostics: TileLocalPrepassBudgetDiagnostics;
}

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
  readonly maxRefsPerTile?: number;
  readonly maxTileEntries?: number;
  readonly nearFadeEndNdc?: number;
}): TileLocalPrepassBridge;

export function summarizeTileLocalPrepassBudgetDiagnostics(input: {
  readonly coverage: unknown;
  readonly bridge: GpuTileCoverageBridge;
  readonly maxRefsPerTile: number;
  readonly maxTileEntries?: number;
}): TileLocalPrepassBudgetDiagnostics;

export function captureTileLocalPrepassBridgeSignature(input: {
  readonly viewMatrix: Float32Array;
  readonly viewProj: Float32Array;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly samplesPerAxis: number;
  readonly splatScale: number;
  readonly minRadiusPx: number;
  readonly maxRefsPerTile?: number;
  readonly maxTileEntries?: number;
  readonly nearFadeEndNdc?: number;
}): string;

export function tileLocalPrepassBridgeSignatureChanged(
  previousSignature: string | null | undefined,
  input: {
    readonly viewMatrix: Float32Array;
    readonly viewProj: Float32Array;
    readonly viewportWidth: number;
    readonly viewportHeight: number;
    readonly tileSizePx: number;
    readonly samplesPerAxis: number;
    readonly splatScale: number;
    readonly minRadiusPx: number;
    readonly maxRefsPerTile?: number;
    readonly maxTileEntries?: number;
    readonly nearFadeEndNdc?: number;
  }
): boolean;
