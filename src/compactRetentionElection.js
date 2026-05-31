const SUPPORT_SAMPLE_FINAL_FRACTION = 0.25;

export function selectCompactProjectionRetentionRecords(records, maxRefsPerTile, candidateSources = undefined) {
  if (records.length <= maxRefsPerTile) {
    return [...records];
  }
  const balanced = compactProjectionBalancedRetentionRecords(records, maxRefsPerTile, candidateSources);
  if (balanced.length >= maxRefsPerTile) {
    return balanced;
  }
  return compactProjectionBackfillRetentionRecords(balanced, records, maxRefsPerTile);
}

function compactProjectionBalancedRetentionRecords(records, maxRefsPerTile, candidateSources = undefined) {
  const selected = [];
  const selectedKeys = new Set();
  const supportSampleGroups = compactProjectionSupportSampleGroups(records, candidateSources);
  const supportTarget = supportSampleGroups.length > 0
    ? Math.max(1, Math.floor(maxRefsPerTile * SUPPORT_SAMPLE_FINAL_FRACTION))
    : 0;
  const priorityTarget = maxRefsPerTile - supportTarget;

  compactProjectionRoundRobinSelect({
    selected,
    selectedKeys,
    maxSelected: priorityTarget,
    pools: compactProjectionPriorityRecordPools(records, candidateSources),
  });

  compactProjectionRoundRobinSelect({
    selected,
    selectedKeys,
    maxSelected: maxRefsPerTile,
    pools: supportSampleGroups.map((group) => ({
      records: [...group].sort(compareCompactProjectionSupportSamplePriority),
    })),
  });

  return selected;
}

function compactProjectionSupportSampleGroups(records, candidateSources = undefined) {
  const groups = candidateSources?.supportSampleRecordGroups;
  if (groups && groups.length > 0) {
    return groups;
  }
  const flatSupportRecords = candidateSources?.supportSampleRecords;
  return flatSupportRecords && flatSupportRecords.length > 0 ? [flatSupportRecords] : [];
}

function compactProjectionPriorityRecordPools(records, candidateSources = undefined) {
  const retentionRecords = candidateSources?.retentionRecords ?? records;
  const occlusionRecords = candidateSources?.occlusionRecords ?? records;
  const coverageRecords = candidateSources?.coverageRecords ?? records;
  return [
    { records: [...retentionRecords].sort(compareCompactProjectionRetentionPriority) },
    { records: [...occlusionRecords].sort(compareCompactProjectionOcclusionPriority) },
    { records: [...coverageRecords].sort(compareCompactProjectionRetentionCoverageOrder) },
  ];
}

function compactProjectionRoundRobinSelect({ selected, selectedKeys, maxSelected, pools }) {
  if (maxSelected <= selected.length || pools.length === 0) {
    return;
  }
  const cursors = new Array(pools.length).fill(0);

  while (selected.length < maxSelected) {
    let added = false;
    for (let poolIndex = 0; poolIndex < pools.length && selected.length < maxSelected; poolIndex += 1) {
      const pool = pools[poolIndex].records;
      while (cursors[poolIndex] < pool.length) {
        const record = pool[cursors[poolIndex]];
        cursors[poolIndex] += 1;
        const key = compactProjectionRetentionRecordKey(record);
        if (selectedKeys.has(key)) {
          continue;
        }
        selected.push(record);
        selectedKeys.add(key);
        added = true;
        break;
      }
    }
    if (!added) {
      break;
    }
  }
}

function compactProjectionBackfillRetentionRecords(selected, records, maxRefsPerTile) {
  const selectedRecords = [...selected];
  const selectedKeys = new Set(selectedRecords.map(compactProjectionRetentionRecordKey));
  for (const record of records) {
    if (selectedRecords.length >= maxRefsPerTile) {
      break;
    }
    const key = compactProjectionRetentionRecordKey(record);
    if (selectedKeys.has(key)) {
      continue;
    }
    selectedRecords.push(record);
    selectedKeys.add(key);
  }
  return selectedRecords;
}

export function compareCompactProjectionRetentionCoverageOrder(left, right) {
  return (
    left.tileIndex - right.tileIndex ||
    right.coverageWeight - left.coverageWeight ||
    left.viewRank - right.viewRank ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

export function compareCompactProjectionRetentionCompositorOrder(left, right) {
  return (
    left.tileIndex - right.tileIndex ||
    left.viewRank - right.viewRank ||
    left.viewDepth - right.viewDepth ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

export function compareCompactProjectionRetentionPriority(left, right) {
  return (
    right.retentionWeight - left.retentionWeight ||
    right.coverageWeight - left.coverageWeight ||
    left.viewRank - right.viewRank ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

export function compareCompactProjectionSupportSamplePriority(left, right) {
  return (
    finiteOrZero(right.supportSampleRetentionWeight) - finiteOrZero(left.supportSampleRetentionWeight) ||
    finiteOrZero(right.supportSampleWeight) - finiteOrZero(left.supportSampleWeight) ||
    right.retentionWeight - left.retentionWeight ||
    right.occlusionWeight - left.occlusionWeight ||
    left.viewRank - right.viewRank ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

export function compareCompactProjectionOcclusionPriority(left, right) {
  const leftDensity = finiteOrZero(left.occlusionDensity);
  const rightDensity = finiteOrZero(right.occlusionDensity);
  return (
    rightDensity - leftDensity ||
    right.occlusionWeight - left.occlusionWeight ||
    right.coverageWeight - left.coverageWeight ||
    left.viewRank - right.viewRank ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

export function compactProjectionRetentionRecordKey(contributor) {
  return (
    (BigInt(contributor.tileIndex) << 64n) |
    (BigInt(contributor.splatIndex) << 32n) |
    BigInt(contributor.originalId)
  );
}

function finiteOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}
