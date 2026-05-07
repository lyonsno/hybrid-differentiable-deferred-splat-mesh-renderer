const OVERFLOW_REASONS = [
  "none",
  "perTileRetainedCap",
  "perTileRetainedCapPolicyReserve",
  "perTileRetainedCapForegroundBand",
  "perTileRetainedCapMiddleBand",
  "perTileRetainedCapBehindSurfaceBand",
];

export function summarizeCapPressureRetention(bridgeOrArena) {
  const arena = bridgeOrArena?.contributorArena ?? bridgeOrArena;
  const projected = Array.isArray(arena?.projectedContributors)
    ? arena.projectedContributors
    : [];
  const metadata = arena?.metadata ?? bridgeOrArena?.contributorArena?.metadata ?? {};
  const refs = summarizeRefs(projected, metadata);
  const retainedBands = createBandCounters();
  const droppedBands = createBandCounters();
  const overflowReasons = createOverflowReasonCounters();
  const lossSignals = {
    foregroundDroppedRefs: 0,
    behindSurfaceDroppedRefs: 0,
    policyReserveDisplacedRefs: 0,
    highCoverageDroppedRefs: 0,
    highRetentionDroppedRefs: 0,
    highOcclusionDroppedRefs: 0,
  };

  for (const contributor of projected) {
    const retained = readRetainedStatus(contributor);
    const band = normalizeBand(contributor.retentionBand);
    accumulateBand(retained ? retainedBands : droppedBands, band, contributor);
    const reason = normalizeOverflowReason(contributor.overflowReasonDetail ?? contributor.overflowReason, retained);
    overflowReasons[reason] += 1;
    if (!retained) {
      accumulateLossSignals(lossSignals, band, reason, contributor);
    }
  }

  return {
    version: 1,
    classification: classifyCapPressure(refs, metadata),
    refs,
    retainedBands,
    droppedBands,
    overflowReasons,
    lossSignals,
    policyHooks: recommendPolicyHooks(refs),
  };
}

function summarizeRefs(projected, metadata) {
  const projectedCount = nonNegativeInteger(metadata.projectedContributorCount, projected.length);
  const retainedCount = nonNegativeInteger(
    metadata.retainedContributorCount,
    projected.filter(readRetainedStatus).length
  );
  const droppedCount = nonNegativeInteger(
    metadata.droppedContributorCount,
    Math.max(0, projectedCount - retainedCount)
  );
  return {
    projected: projectedCount,
    retained: retainedCount,
    dropped: droppedCount,
    maxRefsPerTile: nonNegativeInteger(metadata.maxRefsPerTile, 0),
    tileCount: nonNegativeInteger(metadata.tileCount, 0),
  };
}

function readRetainedStatus(contributor) {
  if (contributor.retentionStatus === "retained" || contributor.retentionStatus === "dropped") {
    const retained = contributor.retentionStatus === "retained";
    if (typeof contributor.retained === "boolean" && contributor.retained !== retained) {
      throw new Error("projected contributor retained alias must match retentionStatus");
    }
    return retained;
  }
  return contributor.retained === true;
}

function classifyCapPressure(refs, metadata) {
  if (refs.dropped > 0) {
    return "over-cap";
  }
  const maxRefsPerTile = nonNegativeInteger(metadata.maxRefsPerTile, 0);
  const retained = Array.isArray(metadata.tileHeaders)
    ? metadata.tileHeaders.some((header) => header?.retainedContributorCount >= maxRefsPerTile)
    : false;
  return retained ? "at-cap" : "within-cap";
}

function createBandCounters() {
  return {
    front: createBandCounter(),
    middle: createBandCounter(),
    back: createBandCounter(),
  };
}

function createBandCounter() {
  return {
    total: 0,
    coverageHigh: 0,
    coverageMedium: 0,
    coverageLow: 0,
  };
}

function accumulateBand(bands, band, contributor) {
  const counter = bands[band];
  counter.total += 1;
  const coverage = finiteNumber(contributor.coverageWeight, 0);
  if (coverage >= 0.75) {
    counter.coverageHigh += 1;
  } else if (coverage >= 0.25) {
    counter.coverageMedium += 1;
  } else {
    counter.coverageLow += 1;
  }
}

function createOverflowReasonCounters() {
  return Object.fromEntries(OVERFLOW_REASONS.map((reason) => [reason, 0]));
}

function accumulateLossSignals(lossSignals, band, reason, contributor) {
  if (band === "front") {
    lossSignals.foregroundDroppedRefs += 1;
  }
  if (band === "back") {
    lossSignals.behindSurfaceDroppedRefs += 1;
  }
  if (reason === "perTileRetainedCapPolicyReserve") {
    lossSignals.policyReserveDisplacedRefs += 1;
  }
  if (finiteNumber(contributor.coverageWeight, 0) >= 0.75) {
    lossSignals.highCoverageDroppedRefs += 1;
  }
  if (finiteNumber(contributor.retentionWeight, 0) >= 0.75) {
    lossSignals.highRetentionDroppedRefs += 1;
  }
  if (finiteNumber(contributor.occlusionWeight, 0) >= 0.75) {
    lossSignals.highOcclusionDroppedRefs += 1;
  }
}

function recommendPolicyHooks(refs) {
  if (refs.dropped <= 0) {
    return [];
  }
  return [
    {
      kind: "tile-local-lod",
      reason: "compress dense same-tile contributors before the retained-ref cap rather than raising it",
      raisesCap: false,
    },
    {
      kind: "tile-local-aggregation",
      reason: "aggregate low-priority dropped contributors into explicit evidence instead of hiding loss",
      raisesCap: false,
    },
  ];
}

function normalizeBand(band) {
  return band === "front" || band === "middle" || band === "back" ? band : "middle";
}

function normalizeOverflowReason(reason, retained) {
  if (retained) {
    return "none";
  }
  return OVERFLOW_REASONS.includes(reason) ? reason : "perTileRetainedCap";
}

function nonNegativeInteger(value, fallback) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}
