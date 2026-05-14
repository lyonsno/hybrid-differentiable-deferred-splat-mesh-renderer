export interface RetentionOcclusionAccountantContract {
  readonly consumes: readonly string[];
  readonly verdicts: readonly ("sufficient" | "insufficient" | "misleadingly sufficient" | "undiagnosable")[];
  readonly forbiddenFixes: readonly string[];
}

export interface RetentionOcclusionAccountantClassification {
  readonly status: "sufficient" | "insufficient" | "misleadingly sufficient" | "undiagnosable";
  readonly reason: string;
  readonly pixel: {
    readonly label: string;
  };
  readonly coordinates: readonly [number, number];
  readonly crop: { readonly x: number; readonly y: number; readonly w: number; readonly h: number } | null;
  readonly colors: {
    readonly finalRgb: readonly [number, number, number];
    readonly plateRgb: readonly [number, number, number];
  };
  readonly support: {
    readonly cropProjectedSupportCount: number;
  };
  readonly backend: {
    readonly effectiveArenaBackend: string;
    readonly orderingBackend: string;
    readonly visibleCompositedRefLimit: number;
  };
  readonly missingFields?: readonly string[];
  readonly frameEvidence: unknown;
  readonly projectedContributors?: readonly unknown[];
  readonly retainedContributors?: readonly unknown[];
  readonly orderedContributors?: readonly unknown[];
  readonly finalColorAccumulation?: unknown;
  readonly missingForegroundContributorIds?: readonly string[];
  readonly leakingBehindContributorIds?: readonly string[];
  readonly repair: {
    readonly keepContributorIds: readonly string[];
    readonly displaceContributorIds: readonly string[];
    readonly reason: string;
  };
}

export function describeRetentionOcclusionAccountantContract(): RetentionOcclusionAccountantContract;

export function classifyRetentionOcclusionLedger(input?: unknown): RetentionOcclusionAccountantClassification;
