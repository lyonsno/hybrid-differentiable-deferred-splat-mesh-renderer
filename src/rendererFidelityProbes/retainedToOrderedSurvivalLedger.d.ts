export type RetainedToOrderedSurvivalLedgerCategory =
  | "ordered-present"
  | "retained-missing-from-order"
  | "ordered-present-final-alpha-weak"
  | "trace-blocked"
  | "narrower-role-source-blocker";

export interface RetainedToOrderedContributorEvidence {
  readonly originalId: string;
  readonly splatIndex: number | null;
  readonly role: string;
  readonly roleClass: string;
  readonly retentionBand?: string;
  readonly coverageWeight: number;
  readonly opacity: number;
  readonly occlusionWeight?: number;
  readonly viewRank?: number | null;
  readonly viewDepth?: number | null;
  readonly sourceColor: readonly number[] | null;
  readonly orderIndex?: number;
  readonly tieBreakKey?: string | null;
  readonly orderBackend?: string | null;
  readonly coverageAlpha?: number;
}

export interface RetainedToOrderedTraceBlocker {
  readonly field: "retainedContributors" | "orderedContributors" | "finalColorAccumulation";
  readonly reason: string;
}

export interface RetainedToOrderedSurvivalAnchorLedger {
  readonly status: "classified" | "blocked";
  readonly category: RetainedToOrderedSurvivalLedgerCategory;
  readonly mechanism: string;
  readonly provisional: boolean;
  readonly anchorPixel: Record<string, unknown> | null;
  readonly tileAddress: Record<string, number | null> | null;
  readonly ids: {
    readonly retainedForeground: readonly string[];
    readonly orderedForeground: readonly string[];
    readonly accumulatedForeground: readonly string[];
    readonly missingFromOrder: readonly string[];
    readonly retainedAll: readonly string[];
    readonly orderedAll: readonly string[];
  };
  readonly counts: {
    readonly retainedForeground: number;
    readonly orderedForeground: number;
    readonly accumulatedForeground: number;
    readonly missingFromOrder: number;
    readonly retainedAll: number;
    readonly orderedAll: number;
  };
  readonly metrics: {
    readonly missingForegroundOcclusionWeight: number;
    readonly retainedForegroundOcclusionWeight: number;
    readonly orderedForegroundOcclusionWeight: number;
    readonly finalForegroundAlpha: number;
  };
  readonly retainedForeground: readonly RetainedToOrderedContributorEvidence[];
  readonly orderedForeground: readonly RetainedToOrderedContributorEvidence[];
  readonly finalForeground: readonly RetainedToOrderedContributorEvidence[];
  readonly missingForeground: readonly RetainedToOrderedContributorEvidence[];
  readonly blockers?: readonly RetainedToOrderedTraceBlocker[];
}

export interface RetainedToOrderedSurvivalLedger {
  readonly status: "classified";
  readonly contract: ReturnType<typeof describeRetainedToOrderedSurvivalLedgerContract>;
  readonly anchorLedgers: readonly RetainedToOrderedSurvivalAnchorLedger[];
  readonly summary: {
    readonly anchorCount: number;
    readonly totalAnchors: number;
    readonly categoryCounts: Record<string, number>;
    readonly mechanismCounts: Record<string, number>;
    readonly retainedForegroundCount: number;
    readonly orderedForegroundCount: number;
    readonly missingFromOrderCount: number;
    readonly accumulatedForegroundCount: number;
  };
}

export declare function describeRetainedToOrderedSurvivalLedgerContract(): {
  readonly consumes: readonly string[];
  readonly categories: readonly RetainedToOrderedSurvivalLedgerCategory[];
  readonly owns: readonly string[];
  readonly separatesFrom: readonly string[];
};

export declare const describeRetainedToOrderedSurvivalContract: typeof describeRetainedToOrderedSurvivalLedgerContract;

export declare function classifyRetainedToOrderedSurvival(
  record?: Record<string, unknown>,
  options?: {
    readonly foregroundRoles?: readonly string[];
    readonly minFinalForegroundAlpha?: number;
  },
): RetainedToOrderedSurvivalAnchorLedger;

export declare function buildRetainedToOrderedSurvivalLedger(
  traceRecords?: readonly Record<string, unknown>[],
  options?: Parameters<typeof classifyRetainedToOrderedSurvival>[1],
): RetainedToOrderedSurvivalLedger;
