export type FinalAccumulationTribunalCategory =
  | "ordered-skipped-in-accumulation"
  | "near-zero-alpha-transfer"
  | "accumulation-support-sufficient"
  | "trace-blocked"
  | "narrower-blocker";

export interface FinalAccumulationTribunalVerdict {
  readonly status: "classified" | "blocked";
  readonly category: FinalAccumulationTribunalCategory;
  readonly mechanism: string;
  readonly provisional: boolean;
  readonly anchorPixel: Record<string, unknown> | null;
  readonly tileAddress: Record<string, unknown> | null;
  readonly outputRgba: readonly number[];
  readonly blockers: readonly Record<string, unknown>[];
  readonly ids: Record<string, readonly string[]>;
  readonly counts: Record<string, number>;
  readonly metrics: Record<string, number>;
  readonly foregroundContributors: readonly Record<string, unknown>[];
}

export declare const FINAL_ACCUMULATION_TRIBUNAL_CATEGORIES: readonly FinalAccumulationTribunalCategory[];

export declare function describeFinalAccumulationTribunalContract(): Record<string, readonly string[]>;

export declare function classifyFinalAccumulationVerdict(
  trace?: Record<string, unknown>,
  options?: Record<string, unknown>,
): FinalAccumulationTribunalVerdict;

export declare function buildFinalAccumulationTribunalLedger(
  anchorTraces?: readonly Record<string, unknown>[],
  options?: Record<string, unknown>,
): Record<string, unknown>;
