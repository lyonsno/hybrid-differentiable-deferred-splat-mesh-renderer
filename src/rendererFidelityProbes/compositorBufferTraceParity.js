const REQUIRED_LIVE_BUFFER_FIELDS = Object.freeze([
  ["liveBuffer.legacyTileHeader", (row) => row?.liveBuffer?.legacyTileHeader],
  ["liveBuffer.legacyTileRefs", (row) => row?.liveBuffer?.legacyTileRefs],
  ["liveBuffer.legacyTileCoverageWeights", (row) => row?.liveBuffer?.legacyTileCoverageWeights],
  ["liveBuffer.legacyAlphaParams", (row) => row?.liveBuffer?.legacyAlphaParams],
  ["liveBuffer.sourceColor", (row) => row?.liveBuffer?.sourceColor],
  ["liveBuffer.opacity", (row) => row?.liveBuffer?.opacity],
  ["liveBuffer.outputSpace", (row) => row?.liveBuffer?.outputSpace],
]);

const CLASSIFICATION_PRIORITY = Object.freeze([
  "narrower-blocker",
  "buffer-underinstrumented",
  "buffer-identity-divergence",
  "buffer-order-divergence",
  "buffer-coverage-alpha-divergence",
  "buffer-source-payload-divergence",
  "buffer-matches-trace",
]);

export function classifyCompositorBufferTraceParity({
  traceFinalRows = [],
  liveBufferRows = [],
  tolerance = 1e-6,
} = {}) {
  const traces = Array.isArray(traceFinalRows) ? traceFinalRows : [];
  const liveRowsByAnchor = new Map((Array.isArray(liveBufferRows) ? liveBufferRows : [])
    .map((row) => [anchorId(row), row])
    .filter(([id]) => id));

  const perAnchor = traces.map((traceRow) => compareAnchor({
    traceRow,
    liveRow: liveRowsByAnchor.get(anchorId(traceRow)),
    tolerance,
  }));

  return {
    version: 1,
    classification: summarizeClassification(perAnchor),
    anchorCount: perAnchor.length,
    perAnchor,
  };
}

function compareAnchor({ traceRow, liveRow, tolerance }) {
  const id = anchorId(traceRow);
  const missingFields = missingLiveFields(liveRow);
  const base = {
    anchorId: id,
    anchorPixel: traceRow?.anchorPixel ?? liveRow?.anchorPixel ?? null,
    tileAddress: traceRow?.tileAddress ?? liveRow?.tileAddress ?? null,
    missingFields,
  };

  if (missingFields.length > 0) {
    return {
      ...base,
      status: "buffer-underinstrumented",
      contributorIds: [],
      order: [],
    };
  }

  const traceContributors = normalizeTraceContributors(traceRow);
  const bufferContributors = normalizeBufferContributors(liveRow);
  const traceIdentities = traceContributors.map(identity);
  const bufferIdentities = bufferContributors.map(identity);
  const missingTraceIdentitySample = identityDifference(traceIdentities, bufferIdentities);
  const extraBufferIdentitySample = identityDifference(bufferIdentities, traceIdentities);
  const contributorIds = bufferContributors.map((row) => row.splatIndex);
  const order = bufferContributors.map((row) => row.orderIndex);

  if (missingTraceIdentitySample.length > 0 || extraBufferIdentitySample.length > 0) {
    return {
      ...base,
      status: "buffer-identity-divergence",
      contributorIds,
      order,
      traceContributorCount: traceContributors.length,
      bufferContributorCount: bufferContributors.length,
      missingTraceIdentitySample,
      extraBufferIdentitySample,
    };
  }

  const firstDivergentOrderIndex = firstOrderMismatch(traceIdentities, bufferIdentities);
  if (firstDivergentOrderIndex !== -1) {
    return {
      ...base,
      status: "buffer-order-divergence",
      contributorIds,
      order,
      firstDivergentOrderIndex,
      traceOrderSample: traceIdentities.map(identityObject),
      bufferOrderSample: bufferIdentities.map(identityObject),
    };
  }

  const firstCoverageAlphaMismatch = firstFieldMismatch({
    fields: ["coverageWeight", "coverageAlpha", "opacity", "inverseConic"],
    traceContributors,
    bufferContributors,
    tolerance,
  });
  if (firstCoverageAlphaMismatch) {
    return {
      ...base,
      status: "buffer-coverage-alpha-divergence",
      contributorIds,
      order,
      firstCoverageAlphaMismatch,
    };
  }

  const firstSourcePayloadMismatch = firstFieldMismatch({
    fields: ["sourceColor", "outputSpace"],
    traceContributors,
    bufferContributors,
    tolerance,
  }) ?? outputSpaceMismatch(traceRow, liveRow);
  if (firstSourcePayloadMismatch) {
    return {
      ...base,
      status: "buffer-source-payload-divergence",
      contributorIds,
      order,
      firstSourcePayloadMismatch,
    };
  }

  return {
    ...base,
    status: "buffer-matches-trace",
    contributorIds,
    order,
    traceContributorCount: traceContributors.length,
    bufferContributorCount: bufferContributors.length,
  };
}

function summarizeClassification(perAnchor) {
  if (perAnchor.length === 0) {
    return "narrower-blocker";
  }
  const statuses = new Set(perAnchor.map((row) => row.status));
  return CLASSIFICATION_PRIORITY.find((classification) => statuses.has(classification)) ?? "narrower-blocker";
}

function missingLiveFields(liveRow) {
  if (!liveRow || typeof liveRow !== "object") {
    return REQUIRED_LIVE_BUFFER_FIELDS.map(([field]) => field);
  }
  return REQUIRED_LIVE_BUFFER_FIELDS
    .filter(([, read]) => isMissing(read(liveRow)))
    .map(([field]) => field);
}

function isMissing(value) {
  if (value === null || value === undefined) {
    return true;
  }
  return Array.isArray(value) && value.length === 0;
}

function normalizeTraceContributors(traceRow) {
  const steps = Array.isArray(traceRow?.finalColorAccumulation?.steps)
    ? traceRow.finalColorAccumulation.steps
    : [];
  return steps.map((step, index) => normalizeContributor(step, index));
}

function normalizeBufferContributors(liveRow) {
  if (Array.isArray(liveRow?.contributors)) {
    return liveRow.contributors.map((step, index) => normalizeContributor(step, index));
  }
  const refs = Array.isArray(liveRow?.liveBuffer?.legacyTileRefs) ? liveRow.liveBuffer.legacyTileRefs : [];
  return refs.map((splatIndex, index) => normalizeContributor({
    splatIndex,
    originalId: splatIndex,
    orderIndex: index,
    coverageWeight: liveRow?.liveBuffer?.legacyTileCoverageWeights?.[index],
    coverageAlpha: liveRow?.liveBuffer?.legacyAlphaParams?.[index]?.coverageAlpha,
    inverseConic: liveRow?.liveBuffer?.legacyAlphaParams?.[index]?.inverseConic,
    sourceColor: liveRow?.liveBuffer?.sourceColor?.[index],
    opacity: liveRow?.liveBuffer?.opacity?.[index],
    outputSpace: liveRow?.liveBuffer?.outputSpace,
  }, index));
}

function normalizeContributor(value, fallbackOrderIndex) {
  return {
    splatIndex: nonNegativeInteger(value?.splatIndex),
    originalId: nonNegativeInteger(value?.originalId ?? value?.splatIndex),
    orderIndex: nonNegativeInteger(value?.orderIndex ?? fallbackOrderIndex),
    coverageWeight: finiteNumber(value?.coverageWeight),
    coverageAlpha: finiteNumber(value?.coverageAlpha),
    opacity: finiteNumber(value?.opacity),
    inverseConic: numberArray(value?.inverseConic),
    sourceColor: numberArray(value?.sourceColor),
    outputSpace: value?.outputSpace && typeof value.outputSpace === "object"
      ? { ...value.outputSpace }
      : null,
  };
}

function firstOrderMismatch(traceIdentities, bufferIdentities) {
  const count = Math.max(traceIdentities.length, bufferIdentities.length);
  for (let index = 0; index < count; index += 1) {
    if (identityKey(traceIdentities[index]) !== identityKey(bufferIdentities[index])) {
      return index;
    }
  }
  return -1;
}

function firstFieldMismatch({ fields, traceContributors, bufferContributors, tolerance }) {
  for (let index = 0; index < traceContributors.length; index += 1) {
    const trace = traceContributors[index];
    const buffer = bufferContributors[index];
    for (const field of fields) {
      if (!valuesMatch(trace?.[field], buffer?.[field], tolerance)) {
        return {
          orderIndex: index,
          field,
          trace: trace?.[field] ?? null,
          buffer: buffer?.[field] ?? null,
        };
      }
    }
  }
  return null;
}

function outputSpaceMismatch(traceRow, liveRow) {
  const traceSpace = traceRow?.finalColorAccumulation?.outputSpace ??
    traceRow?.finalColorAccumulation?.outputColorSpace ??
    null;
  const bufferSpace = liveRow?.liveBuffer?.outputSpace ?? null;
  if (traceSpace === null || bufferSpace === null) {
    return null;
  }
  if (typeof traceSpace === "string") {
    return null;
  }
  return valuesMatch(traceSpace, bufferSpace, 0)
    ? null
    : { orderIndex: null, field: "outputSpace", trace: traceSpace, buffer: bufferSpace };
}

function valuesMatch(left, right, tolerance) {
  if (Array.isArray(left) || Array.isArray(right)) {
    const leftArray = Array.isArray(left) ? left : [];
    const rightArray = Array.isArray(right) ? right : [];
    if (leftArray.length !== rightArray.length) {
      return false;
    }
    return leftArray.every((value, index) => valuesMatch(value, rightArray[index], tolerance));
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
    return keys.every((key) => valuesMatch(left[key], right[key], tolerance));
  }
  if (Number.isFinite(left) || Number.isFinite(right)) {
    return Math.abs(finiteNumber(left) - finiteNumber(right)) <= tolerance;
  }
  return left === right;
}

function identity(value) {
  return {
    splatIndex: nonNegativeInteger(value?.splatIndex),
    originalId: nonNegativeInteger(value?.originalId ?? value?.splatIndex),
  };
}

function identityDifference(left, right) {
  const rightKeys = new Set(right.map(identityKey));
  return left
    .filter((value) => !rightKeys.has(identityKey(value)))
    .slice(0, 8)
    .map(identityObject);
}

function identityObject(value) {
  return {
    splatIndex: nonNegativeInteger(value?.splatIndex),
    originalId: nonNegativeInteger(value?.originalId ?? value?.splatIndex),
  };
}

function identityKey(value) {
  if (!value) {
    return "<missing>";
  }
  return `${nonNegativeInteger(value.splatIndex)}:${nonNegativeInteger(value.originalId ?? value.splatIndex)}`;
}

function anchorId(row) {
  return row?.anchorId ?? row?.id ?? row?.anchorPixel?.id ?? "";
}

function nonNegativeInteger(value) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function finiteNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function numberArray(value) {
  return Array.isArray(value) ? value.map(finiteNumber) : [];
}
