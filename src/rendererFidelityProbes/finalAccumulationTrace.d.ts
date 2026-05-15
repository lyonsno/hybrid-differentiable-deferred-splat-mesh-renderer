export interface FinalAccumulationTraceStep {
  readonly splatIndex: number;
  readonly originalId: number;
  readonly orderIndex: number;
  readonly coverageWeight: number;
  readonly opacity: number;
  readonly coverageAlpha: number;
  readonly transmittanceBefore: number;
  readonly transmittanceAfter: number;
  readonly sourceColor: readonly [number, number, number];
  readonly contributionColor: readonly [number, number, number];
  readonly runningColor: readonly [number, number, number];
  readonly accumulationStatus: "accumulated" | "skipped-zero-tile-coverage";
  readonly tileCoverageWeight: number;
  readonly viewRank: number;
  readonly viewDepth: number;
  readonly tileIndex: number;
}

export interface FinalColorAccumulationRecord {
  readonly steps: readonly FinalAccumulationTraceStep[];
  readonly outputColor: readonly [number, number, number, number];
  readonly clearColor: readonly [number, number, number];
  readonly remainingTransmittance: number;
}

export interface PixelFinalAccumulationTraceRecord {
  readonly schemaVersion: string;
  readonly anchorPixel: Record<string, unknown>;
  readonly tileAddress: Record<string, unknown>;
  readonly projectedContributors: readonly Record<string, unknown>[];
  readonly retainedContributors: readonly Record<string, unknown>[];
  readonly orderedContributors: readonly Record<string, unknown>[];
  readonly finalColorAccumulation: FinalColorAccumulationRecord;
  readonly dispatchCache: Record<string, unknown>;
  readonly rendererMetadata: Record<string, unknown>;
  readonly deferredFields: Record<string, unknown>;
  readonly blockers: readonly Record<string, unknown>[];
}

export declare const BLACK_BAND_FINAL_ACCUMULATION_ANCHOR: Record<string, unknown>;

export declare function buildFinalColorAccumulationTraceRecord(options?: Record<string, unknown>): PixelFinalAccumulationTraceRecord;

export declare function buildPerPixelFinalColorAccumulationTrace(
  record: PixelFinalAccumulationTraceRecord | null | undefined,
): readonly Record<string, unknown>[];
