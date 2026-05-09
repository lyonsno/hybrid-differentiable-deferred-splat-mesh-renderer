export function summarizeGpuArenaParity(bridgeOrArena, offloadContributors = null) {
  const arena = bridgeOrArena?.contributorArena ?? bridgeOrArena;
  const projectedContributors = normalizeContributorList(arena?.projectedContributors);
  const cpuRetainedContributors = normalizeContributorList(arena?.contributors);
  const gpuRetainedContributors = normalizeContributorList(offloadContributors ?? cpuRetainedContributors);

  const projectedContributorIds = projectedContributors.map(readOriginalId);
  const cpuRetainedContributorIds = cpuRetainedContributors.map(readOriginalId);
  const retainedContributorIds = gpuRetainedContributors.map(readOriginalId);
  const orderedContributorIds = [...gpuRetainedContributors]
    .sort(compareContributorOrder)
    .map(readOriginalId);
  const droppedContributorIds = projectedContributors
    .filter((contributor) => !readRetainedStatus(contributor))
    .map(readOriginalId);
  const counts = {
    projected: nonNegativeInteger(
      arena?.metadata?.projectedContributorCount ?? arena?.tileRefCustody?.projectedTileEntryCount,
      projectedContributorIds.length,
    ),
    retained: nonNegativeInteger(
      arena?.metadata?.retainedContributorCount ?? arena?.tileRefCustody?.retainedTileEntryCount,
      retainedContributorIds.length,
    ),
    dropped: nonNegativeInteger(
      arena?.metadata?.droppedContributorCount ?? arena?.tileRefCustody?.evictedTileEntryCount,
      droppedContributorIds.length,
    ),
  };
  const mismatchDiagnostics = [];

  if (!sameArray(cpuRetainedContributorIds, retainedContributorIds)) {
    mismatchDiagnostics.push(`retained-id-order-mismatch expected=${formatIdList(cpuRetainedContributorIds)} actual=${formatIdList(retainedContributorIds)}`);
  }
  if (!sameArray(retainedContributorIds, orderedContributorIds)) {
    mismatchDiagnostics.push(`offload-order-mismatch expected=${formatIdList(retainedContributorIds)} actual=${formatIdList(orderedContributorIds)}`);
  }
  if (counts.projected !== projectedContributorIds.length) {
    mismatchDiagnostics.push(`projected-count-mismatch expected=${counts.projected} actual=${projectedContributorIds.length}`);
  }
  if (counts.retained !== retainedContributorIds.length) {
    mismatchDiagnostics.push(`retained-count-mismatch expected=${counts.retained} actual=${retainedContributorIds.length}`);
  }
  if (counts.dropped !== droppedContributorIds.length) {
    mismatchDiagnostics.push(`dropped-count-mismatch expected=${counts.dropped} actual=${droppedContributorIds.length}`);
  }

  const droppedSet = new Set(droppedContributorIds);
  for (const contributorId of retainedContributorIds) {
    if (droppedSet.has(contributorId)) {
      mismatchDiagnostics.push(`dropped-id-present-in-retained id=${contributorId}`);
    }
  }

  return {
    version: 1,
    counts,
    projectedContributorIds,
    cpuRetainedContributorIds,
    retainedContributorIds,
    droppedContributorIds,
    orderedContributorIds,
    mismatchDiagnostics,
  };
}

function normalizeContributorList(contributors) {
  if (!Array.isArray(contributors)) {
    return [];
  }
  return [...contributors];
}

function readRetainedStatus(contributor) {
  if (contributor && typeof contributor === "object") {
    if (contributor.retentionStatus === "retained" || contributor.retentionStatus === "dropped") {
      return contributor.retentionStatus === "retained";
    }
    if (typeof contributor.retained === "boolean") {
      return contributor.retained;
    }
  }
  return true;
}

function readOriginalId(contributor) {
  return Number.isInteger(contributor?.originalId) ? contributor.originalId : -1;
}

function compareContributorOrder(left, right) {
  return (
    readContributorIndex(left) - readContributorIndex(right) ||
    readViewRank(left) - readViewRank(right) ||
    readOriginalId(left) - readOriginalId(right)
  );
}

function readContributorIndex(contributor) {
  return Number.isInteger(contributor?.contributorIndex) ? contributor.contributorIndex : Number.MAX_SAFE_INTEGER;
}

function readViewRank(contributor) {
  return Number.isInteger(contributor?.viewRank) ? contributor.viewRank : Number.MAX_SAFE_INTEGER;
}

function sameArray(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function nonNegativeInteger(value, fallback) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function formatIdList(values) {
  return `[${values.join(", ")}]`;
}
