export function sourceFrontierProjectedSupportFallbackByAnchorId(
  primary: Map<string, readonly unknown[]>,
  fallback: Map<string, readonly unknown[]>,
  tileRefPayloadEncoding: "legacy-identity" | "source-frontier-score",
): Map<string, readonly unknown[]>;

export function backfillAnchorContributorLists(
  primary: Map<string, readonly unknown[]>,
  fallback: Map<string, readonly unknown[]>,
): Map<string, readonly unknown[]>;
