import type { TileLocalRetainedPixelContributorTrace } from "../gpuTileCoverageBridge.js";

export type DeadSplatElectorLedgerCategory =
  | "blocked-missing-retention-trace"
  | "source-sparse"
  | "wrong-retained-set"
  | "later-transfer-failure"
  | "narrower-blocker";

export interface DeadSplatElectorAnchorLedger {
  readonly status: "blocked" | "classified";
  readonly category: DeadSplatElectorLedgerCategory;
  readonly mechanism: string;
  readonly provisional: boolean;
  readonly anchorPixel: {
    readonly id: string;
    readonly kind: string;
    readonly x: number | null;
    readonly y: number | null;
    readonly description?: string | null;
    readonly canonicalTileAddress?: Record<string, unknown> | null;
  };
  readonly missingFields?: readonly string[];
  readonly ids?: Record<string, readonly string[]>;
  readonly counts?: Record<string, number>;
  readonly metrics?: Record<string, number>;
  readonly summaries?: Record<string, unknown>;
  readonly sourceStatus?: string | null;
}

export interface DeadSplatElectorLedger {
  readonly status: "blocked" | "classified";
  readonly anchorLedgers: readonly DeadSplatElectorAnchorLedger[];
  readonly summary: {
    readonly totalAnchors: number;
    readonly categoryCounts: Record<string, number>;
    readonly wrongRetainedSetAnchorIds: readonly string[];
    readonly laterTransferFailureAnchorIds: readonly string[];
  };
  readonly contract: ReturnType<typeof describeDeadSplatElectorLedgerContract>;
}

export function describeDeadSplatElectorLedgerContract(): {
  readonly consumes: readonly string[];
  readonly categories: readonly DeadSplatElectorLedgerCategory[];
  readonly owns: readonly string[];
  readonly separatesFrom: readonly string[];
};

export function classifyDeadSplatElection(
  record: Partial<TileLocalRetainedPixelContributorTrace> | Record<string, unknown>,
  options?: {
    readonly foregroundRoles?: readonly string[];
    readonly behindRoles?: readonly string[];
    readonly minSignificantOcclusionWeight?: number;
    readonly droppedForegroundDominanceRatio?: number;
    readonly retainedForegroundDominanceRatio?: number;
  },
): DeadSplatElectorAnchorLedger;

export function buildDeadSplatElectorLedger(
  records: readonly (Partial<TileLocalRetainedPixelContributorTrace> | Record<string, unknown>)[] | undefined,
  options?: Parameters<typeof classifyDeadSplatElection>[1],
): DeadSplatElectorLedger;
