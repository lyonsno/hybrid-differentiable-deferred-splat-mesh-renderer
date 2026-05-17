const ADDRESS_CLASSIFICATIONS = Object.freeze([
  "address-contract-ok",
  "dense-index-consumed-as-compact-offset",
  "compact-list-not-populated",
  "header-capacity-mismatch",
  "address-underinstrumented",
]);

const SUMMARY_PRIORITY = Object.freeze([
  "dense-index-consumed-as-compact-offset",
  "compact-list-not-populated",
  "header-capacity-mismatch",
  "address-underinstrumented",
  "address-contract-ok",
]);

export function classifyCompositorBufferAddressContract(input) {
  const anchorId = typeof input?.anchorId === "string" && input.anchorId.length > 0 ? input.anchorId : "unknown";
  const tileIndex = asNonNegativeInteger(input?.tileIndex);
  const headerOffset = asNonNegativeInteger(input?.headerOffset);
  const headerCount = asNonNegativeInteger(input?.headerCount);
  const scatterCount = asNonNegativeInteger(input?.scatterCount);
  const refCount = asNonNegativeInteger(input?.refCount);
  const liveRefCapacity = asNonNegativeInteger(input?.liveRefCapacity);
  const tileCapacity = asPositiveInteger(input?.tileCapacity);
  const traceExpectedContributorCount = asNonNegativeInteger(input?.traceExpectedContributorCount);

  const denseTileSlotOffset = tileIndex != null && tileCapacity != null ? tileIndex * tileCapacity : null;
  const effectiveCount = headerCount != null && scatterCount != null ? Math.max(headerCount, scatterCount) : null;
  const requestedEnd = headerOffset != null && effectiveCount != null ? headerOffset + effectiveCount : null;
  const capacityOverrun = requestedEnd != null && liveRefCapacity != null
    ? Math.max(0, requestedEnd - liveRefCapacity)
    : null;

  let classification = "address-underinstrumented";
  if (
    tileIndex != null &&
    headerOffset != null &&
    headerCount != null &&
    scatterCount != null &&
    refCount != null &&
    liveRefCapacity != null &&
    tileCapacity != null &&
    traceExpectedContributorCount != null &&
    denseTileSlotOffset != null &&
    effectiveCount != null &&
    requestedEnd != null
  ) {
    const outOfCapacity = headerOffset >= liveRefCapacity || requestedEnd > liveRefCapacity;
    const hasDenseTileSlotSignature = tileIndex > 0 && headerOffset === denseTileSlotOffset;
    if (outOfCapacity && hasDenseTileSlotSignature) {
      classification = "dense-index-consumed-as-compact-offset";
    } else if (outOfCapacity) {
      classification = "header-capacity-mismatch";
    } else if (traceExpectedContributorCount > 0 && refCount === 0) {
      classification = "compact-list-not-populated";
    } else {
      classification = "address-contract-ok";
    }
  }

  return {
    anchorId,
    classification,
    tileIndex,
    headerOffset,
    headerCount,
    scatterCount,
    effectiveCount,
    refCount,
    liveRefCapacity,
    tileCapacity,
    denseTileSlotOffset,
    requestedEnd,
    capacityOverrun,
    traceExpectedContributorCount,
  };
}

export function summarizeCompositorBufferAddressContract(rows) {
  const countsByClassification = Object.fromEntries(ADDRESS_CLASSIFICATIONS.map((classification) => [classification, 0]));
  const normalizedRows = Array.isArray(rows) ? rows : [];
  for (const row of normalizedRows) {
    const classification = ADDRESS_CLASSIFICATIONS.includes(row?.classification)
      ? row.classification
      : "address-underinstrumented";
    countsByClassification[classification] += 1;
  }

  const classification = SUMMARY_PRIORITY.find((candidate) => countsByClassification[candidate] > 0)
    ?? "address-underinstrumented";

  return {
    classification,
    rowCount: normalizedRows.length,
    countsByClassification,
    rows: normalizedRows,
  };
}

function asNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function asPositiveInteger(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}
