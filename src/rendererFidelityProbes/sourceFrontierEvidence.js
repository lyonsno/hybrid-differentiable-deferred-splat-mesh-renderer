export function sourceFrontierProjectedSupportFallbackByAnchorId(
  primary,
  fallback,
  tileRefPayloadEncoding,
) {
  if (tileRefPayloadEncoding !== "source-frontier-score") {
    return primary;
  }
  return backfillAnchorContributorLists(primary, fallback);
}

export function backfillAnchorContributorLists(primary, fallback) {
  if (fallback.size === 0) {
    return primary;
  }
  const merged = new Map(primary);
  for (const [anchorId, contributors] of fallback) {
    const primaryContributors = merged.get(anchorId);
    if (!primaryContributors || primaryContributors.length === 0) {
      merged.set(anchorId, contributors);
    }
  }
  return merged;
}
