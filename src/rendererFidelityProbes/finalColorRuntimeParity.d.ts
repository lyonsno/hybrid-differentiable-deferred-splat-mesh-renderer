export interface FinalColorRuntimeTraceStepSummary {
  readonly splatIndex: number | null;
  readonly originalId: number | null;
  readonly coverageWeight: number | null;
  readonly tileCoverageWeight: number | null;
  readonly opacity: number | null;
  readonly coverageAlpha: number | null;
  readonly transmittanceBefore: number | null;
  readonly transmittanceAfter: number | null;
  readonly sourceColor: readonly [number, number, number] | null;
  readonly contributionColor: readonly [number, number, number] | null;
  readonly runningColor: readonly [number, number, number] | null;
  readonly accumulationStatus: string | null;
}

export interface FinalColorRuntimeParityRow {
  readonly anchorId: string;
  readonly anchorPixel: {
    readonly id: string;
    readonly x: number | null;
    readonly y: number | null;
  };
  readonly status: "runtime-final-color-missing" | "runtime-final-color-match" | "trace-runtime-final-color-divergence";
  readonly traceRgba: readonly [number, number, number, number];
  readonly traceRgba8: readonly [number, number, number, number];
  readonly runtimeRgba: readonly [number, number, number, number] | null;
  readonly runtimeRgba8: readonly [number, number, number, number] | null;
  readonly maxChannelDelta: number | null;
  readonly maxChannelDelta8: number | null;
  readonly runtimeOutputFormat: {
    readonly textureFormat: string;
    readonly sampleSpace: string;
    readonly transferStage: string;
  } | null;
  readonly finalStepCount: number;
  readonly firstStep: FinalColorRuntimeTraceStepSummary | null;
  readonly lastStep: FinalColorRuntimeTraceStepSummary | null;
  readonly skipReasons: readonly {
    readonly splatIndex: number | null;
    readonly originalId: number | null;
    readonly accumulationStatus: string;
  }[];
  readonly blendReason: string;
  readonly clampReason: string | null;
}

export interface FinalColorRuntimeParityVerdict {
  readonly classification: "trace-runtime-final-color-divergence" | "runtime-final-color-matches-trace" | "runtime-final-color-underinstrumented";
  readonly tolerance: number;
  readonly rows: readonly FinalColorRuntimeParityRow[];
}

export function compareTraceToRuntimeFinalColor(input?: {
  readonly traceAccumulation?: readonly unknown[];
  readonly runtimeFinalColor?: readonly unknown[];
  readonly tolerance?: number;
}): FinalColorRuntimeParityVerdict;
