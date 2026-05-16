const REQUIRED_PIXEL_TRACE_FIELDS = Object.freeze([
  "projectedContributors",
  "retainedContributors",
  "orderedContributors",
  "finalColorAccumulation",
]);

const DEFAULT_FOREGROUND_ROLES = Object.freeze([
  "dense-foreground",
  "lacunar-surface",
  "porous-surface",
]);

const DEFAULT_BEHIND_ROLES = Object.freeze([
  "bright-behind",
  "plate-behind",
]);

export const GPU_LIVE_LACUNAR_ANCHORS = Object.freeze({
  "lacunar-hole-dessert-1260-930": Object.freeze({
    id: "lacunar-hole-dessert-1260-930",
    class: "lacunar-hole",
    pixel: Object.freeze({ x: 1260, y: 930 }),
    crop: Object.freeze({ x: 1232, y: 902, w: 80, h: 80 }),
    finalRgb: Object.freeze([25, 17, 15]),
    plateRgb: Object.freeze([79, 43, 30]),
    cropProjectedSupport: 2759,
    effectiveArenaBackend: "gpu",
    orderingBackend: "gpu-sorted-index-rank-inversion",
  }),
  "dense-foreground-leak-1580-1260": Object.freeze({
    id: "dense-foreground-leak-1580-1260",
    class: "dense-foreground-leak",
    pixel: Object.freeze({ x: 1580, y: 1260 }),
    crop: Object.freeze({ x: 1540, y: 1220, w: 96, h: 96 }),
    finalRgb: Object.freeze([81, 46, 32]),
    plateRgb: Object.freeze([80, 43, 28]),
    cropProjectedSupport: 5071,
    effectiveArenaBackend: "gpu",
    orderingBackend: "gpu-sorted-index-rank-inversion",
  }),
});

export function describeLacunarOcclusionLedgerContract() {
  return {
    consumes: [
      "gpu-live-trace:per-pixel-projected-contributors",
      "gpu-live-trace:per-pixel-retained-contributors",
      "gpu-live-trace:per-pixel-ordered-contributors",
      "gpu-live-trace:per-pixel-final-color-accumulation",
      "lacunar-prior:synthetic-final-color-oracle",
    ],
    anchorIds: [
      "lacunar-hole-dessert-1260-930",
      "dense-foreground-leak-1580-1260",
    ],
    categories: [
      "blocked-missing-gpu-live-pixel-trace",
      "source-sparsity",
      "missing-retained-support",
      "conic-underfill",
      "weak-alpha-coverage-transfer",
      "order-or-compositor-failure",
      "support-sufficient",
    ],
    separatesFrom: [
      "black-band-row-dropout-ledger",
      "global-opacity-scale-tuning",
      "source-decode",
      "urmina-backend-construction",
    ],
  };
}

export function classifyLacunarOcclusionMechanism({
  anchor,
  pixelTrace,
  foregroundRoles = DEFAULT_FOREGROUND_ROLES,
  behindRoles = DEFAULT_BEHIND_ROLES,
  minForegroundSampleSupport = 0.05,
  minForegroundAlpha = 0.6,
  minBehindLeakAlpha = 0.1,
} = {}) {
  const normalizedAnchor = normalizeAnchor(anchor);
  validateRoleList(foregroundRoles, "foregroundRoles");
  validateRoleList(behindRoles, "behindRoles");
  validateNonNegativeFinite(minForegroundSampleSupport, "minForegroundSampleSupport");
  validateNonNegativeFinite(minForegroundAlpha, "minForegroundAlpha");
  validateNonNegativeFinite(minBehindLeakAlpha, "minBehindLeakAlpha");

  const missingFields = missingTraceFields(pixelTrace);
  if (missingFields.length > 0) {
    return {
      status: "blocked",
      category: "blocked-missing-gpu-live-pixel-trace",
      mechanism: "missing-pixel-local-gpu-live-contributor-fields",
      provisional: true,
      missingFields,
      anchor: normalizedAnchor,
      explanation: "Real-scene lacunar causality requires pixel-local projected, retained, ordered, and final-color accumulation records.",
    };
  }

  const roleLookup = buildRoleLookup(pixelTrace);
  const foregroundRoleSet = new Set(foregroundRoles.map(String));
  const behindRoleSet = new Set(behindRoles.map(String));
  const projected = pixelTrace.projectedContributors.map((entry, index) =>
    normalizeContributor(entry, index, "projectedContributors", roleLookup)
  );
  const retained = pixelTrace.retainedContributors.map((entry, index) =>
    normalizeContributor(entry, index, "retainedContributors", roleLookup)
  );
  const ordered = pixelTrace.orderedContributors.map((entry, index) =>
    normalizeContributor(entry, index, "orderedContributors", roleLookup)
  );
  const accumulated = pixelTrace.finalColorAccumulation.map((entry, index) =>
    normalizeAccumulation(entry, index, roleLookup)
  );

  const ids = {
    projectedForeground: idsForRole(projected, foregroundRoleSet),
    projectedBehind: idsForRole(projected, behindRoleSet),
    retainedForeground: idsForRole(retained, foregroundRoleSet),
    retainedBehind: idsForRole(retained, behindRoleSet),
    orderedForeground: idsForRole(ordered, foregroundRoleSet),
    orderedBehind: idsForRole(ordered, behindRoleSet),
    accumulatedForeground: idsForRole(accumulated, foregroundRoleSet),
    accumulatedBehind: idsForRole(accumulated, behindRoleSet),
  };
  const counts = Object.fromEntries(Object.entries(ids).map(([key, value]) => [key, value.length]));
  const metrics = summarizeAccumulation({
    accumulated,
    foregroundRoleSet,
    behindRoleSet,
    minForegroundSampleSupport,
    minForegroundAlpha,
    minBehindLeakAlpha,
  });

  if (counts.projectedForeground === 0) {
    return classified({
      category: "source-sparsity",
      mechanism: "no-projected-foreground-support",
      anchor: normalizedAnchor,
      ids,
      counts,
      metrics,
    });
  }

  if (counts.retainedForeground === 0) {
    return classified({
      category: "missing-retained-support",
      mechanism: "projected-foreground-missing-from-retained-list",
      anchor: normalizedAnchor,
      ids,
      counts,
      metrics,
    });
  }

  if (counts.orderedForeground === 0) {
    return classified({
      category: "order-or-compositor-failure",
      mechanism: "retained-foreground-missing-from-ordered-list",
      anchor: normalizedAnchor,
      ids,
      counts,
      metrics,
    });
  }

  if (counts.accumulatedForeground === 0) {
    return classified({
      category: "order-or-compositor-failure",
      mechanism: "ordered-foreground-omitted-from-final-accumulation",
      anchor: normalizedAnchor,
      ids,
      counts,
      metrics,
    });
  }

  if (metrics.foregroundSampleSupport < minForegroundSampleSupport) {
    return classified({
      category: "conic-underfill",
      mechanism: "retained-foreground-sample-support-below-threshold",
      anchor: normalizedAnchor,
      ids,
      counts,
      metrics,
    });
  }

  if (
    metrics.foregroundAlpha < minForegroundAlpha &&
    metrics.behindAlpha >= minBehindLeakAlpha
  ) {
    return classified({
      category: "weak-alpha-coverage-transfer",
      mechanism: "foreground-support-present-but-alpha-below-opaque-reference",
      anchor: normalizedAnchor,
      ids,
      counts,
      metrics,
    });
  }

  return classified({
    category: "support-sufficient",
    mechanism: "foreground-support-retained-ordered-and-accumulated",
    anchor: normalizedAnchor,
    ids,
    counts,
    metrics,
  });
}

export function classifyFreshAnchorRoleTightening(evidenceRecords = []) {
  if (!Array.isArray(evidenceRecords)) {
    throw new TypeError("evidenceRecords must be an array");
  }

  return evidenceRecords.map((record, index) => classifyFreshAnchorRecord(record, index));
}

function classified({ category, mechanism, anchor, ids, counts, metrics }) {
  return {
    status: "classified",
    category,
    mechanism,
    provisional: false,
    anchor,
    ids,
    counts,
    metrics,
  };
}

function missingTraceFields(pixelTrace) {
  if (!pixelTrace || typeof pixelTrace !== "object") {
    return [...REQUIRED_PIXEL_TRACE_FIELDS];
  }
  return REQUIRED_PIXEL_TRACE_FIELDS.filter((field) => !Array.isArray(pixelTrace[field]));
}

function normalizeAnchor(anchor) {
  if (anchor === undefined || anchor === null) {
    return null;
  }
  if (typeof anchor !== "object") {
    throw new TypeError("anchor must be an object when provided");
  }
  return {
    id: String(anchor.id ?? "unidentified-anchor"),
    class: String(anchor.class ?? "unclassified"),
    pixel: anchor.pixel ? { ...anchor.pixel } : null,
    crop: anchor.crop ? { ...anchor.crop } : null,
    finalRgb: Array.isArray(anchor.finalRgb) ? [...anchor.finalRgb] : null,
    plateRgb: Array.isArray(anchor.plateRgb) ? [...anchor.plateRgb] : null,
    cropProjectedSupport: anchor.cropProjectedSupport ?? null,
    effectiveArenaBackend: anchor.effectiveArenaBackend ?? null,
    orderingBackend: anchor.orderingBackend ?? null,
  };
}

function buildRoleLookup(pixelTrace) {
  const lookup = new Map();
  for (const field of REQUIRED_PIXEL_TRACE_FIELDS) {
    for (const entry of Array.isArray(pixelTrace?.[field]) ? pixelTrace[field] : []) {
      if (entry && typeof entry === "object" && "id" in entry && "role" in entry) {
        lookup.set(String(entry.id), String(entry.role));
      }
    }
  }
  return lookup;
}

function normalizeContributor(entry, index, field, roleLookup) {
  if (!entry || typeof entry !== "object") {
    throw new TypeError(`${field} entry ${index} must be an object`);
  }
  if (!("id" in entry)) {
    throw new TypeError(`${field} entry ${index} id is required`);
  }
  const id = String(entry.id);
  return {
    id,
    role: String(entry.role ?? roleLookup.get(id) ?? "unclassified"),
  };
}

function normalizeAccumulation(entry, index, roleLookup) {
  if (!entry || typeof entry !== "object") {
    throw new TypeError(`finalColorAccumulation entry ${index} must be an object`);
  }
  if (!("id" in entry)) {
    throw new TypeError(`finalColorAccumulation entry ${index} id is required`);
  }
  const id = String(entry.id);
  const coverageWeight = readNonNegative(entry.coverageWeight ?? 1, `finalColorAccumulation entry ${index} coverageWeight`);
  const conicWeight = readNonNegative(entry.conicWeight ?? 1, `finalColorAccumulation entry ${index} conicWeight`);
  const alphaContribution = readNonNegative(
    entry.alphaContribution ?? entry.coverageAlpha ?? ((entry.opacity ?? 0) * coverageWeight * conicWeight),
    `finalColorAccumulation entry ${index} alphaContribution`,
  );
  return {
    id,
    role: String(entry.role ?? roleLookup.get(id) ?? "unclassified"),
    coverageWeight,
    conicWeight,
    alphaContribution,
  };
}

function idsForRole(entries, roleSet) {
  return entries
    .filter((entry) => roleSet.has(entry.role))
    .map((entry) => entry.id)
    .sort();
}

function summarizeAccumulation({
  accumulated,
  foregroundRoleSet,
  behindRoleSet,
  minForegroundSampleSupport,
  minForegroundAlpha,
  minBehindLeakAlpha,
}) {
  let foregroundSampleSupport = 0;
  let foregroundAlpha = 0;
  let behindAlpha = 0;

  for (const step of accumulated) {
    if (foregroundRoleSet.has(step.role)) {
      foregroundSampleSupport += step.coverageWeight * step.conicWeight;
      foregroundAlpha += step.alphaContribution;
    }
    if (behindRoleSet.has(step.role)) {
      behindAlpha += step.alphaContribution;
    }
  }

  return {
    foregroundSampleSupport: roundMetric(foregroundSampleSupport),
    foregroundAlpha: roundMetric(foregroundAlpha),
    behindAlpha: roundMetric(behindAlpha),
    minForegroundSampleSupport,
    minForegroundAlpha,
    minBehindLeakAlpha,
  };
}

function validateRoleList(roles, label) {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new TypeError(`${label} must be a non-empty array`);
  }
}

function validateNonNegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number`);
  }
}

function readNonNegative(value, label) {
  validateNonNegativeFinite(value, label);
  return value;
}

function roundMetric(value) {
  return Number(value.toFixed(12));
}

function classifyFreshAnchorRecord(record, index) {
  if (!record || typeof record !== "object") {
    throw new TypeError(`fresh anchor record ${index} must be an object`);
  }

  const anchor = normalizeFreshAnchor(record.anchor, index);
  const deadSplatElector = normalizeFreshAnchorEvidence(record.deadSplatElector, "deadSplatElector", index);
  const retainedToOrdered = normalizeFreshAnchorEvidence(record.retainedToOrdered, "retainedToOrdered", index);
  const crossRunInference = observationsDiffer(deadSplatElector.observation, retainedToOrdered.observation);
  const priorDeadSplatCategory = deadSplatElector.category ?? null;
  const currentCategory = retainedToOrdered.category ?? "narrower blocker";

  return {
    status: "classified",
    category: currentCategory === "narrower-role-source-blocker" ? "narrower blocker" : String(currentCategory),
    mechanism: retainedToOrdered.mechanism ?? "retained-to-ordered-role/source-blocker",
    anchor,
    priorDeadSplatCategory,
    retainedToOrderedCategory: currentCategory,
    crossRunInference,
    evidence: {
      deadSplatElector,
      retainedToOrdered,
    },
    note: buildFreshAnchorNote({
      anchor,
      priorDeadSplatCategory,
      retainedToOrderedCategory: currentCategory,
      crossRunInference,
      deadSplatElector,
      retainedToOrdered,
    }),
  };
}

function normalizeFreshAnchor(anchor, index) {
  if (!anchor || typeof anchor !== "object") {
    throw new TypeError(`fresh anchor ${index} anchor must be an object`);
  }

  return {
    id: String(anchor.id ?? `fresh-anchor-${index}`),
    sourceColor: Array.isArray(anchor.sourceColor) ? [...anchor.sourceColor] : null,
    luminance: anchor.luminance ?? null,
    depthBand: anchor.depthBand ?? null,
    foregroundCluster: anchor.foregroundCluster ?? null,
    behindCluster: anchor.behindCluster ?? null,
    backgroundCluster: anchor.backgroundCluster ?? null,
  };
}

function normalizeFreshAnchorEvidence(evidence, label, index) {
  if (!evidence || typeof evidence !== "object") {
    throw new TypeError(`fresh anchor ${index} ${label} must be an object`);
  }

  return {
    category: evidence.category ?? null,
    mechanism: evidence.mechanism ?? null,
    retainedForegroundCount: evidence.retainedForegroundCount ?? null,
    orderedForegroundCount: evidence.orderedForegroundCount ?? null,
    finalForegroundCount: evidence.finalForegroundCount ?? null,
    retainedAll: evidence.retainedAll ?? null,
    orderedAll: evidence.orderedAll ?? null,
    droppedForegroundCount: evidence.droppedForegroundCount ?? null,
    observation: normalizeFreshAnchorObservation(evidence.observation, label, index),
  };
}

function normalizeFreshAnchorObservation(observation, label, index) {
  if (!observation || typeof observation !== "object") {
    throw new TypeError(`fresh anchor ${index} ${label}.observation must be an object`);
  }

  return {
    observationId: observation.observationId ?? null,
    tileSizePx: observation.tileSizePx ?? null,
    maxRefsPerTile: observation.maxRefsPerTile ?? null,
    witnessView: observation.witnessView ?? null,
    viewport: observation.viewport ? { ...observation.viewport } : null,
  };
}

function observationsDiffer(left, right) {
  if (!left || !right) {
    return false;
  }

  return (
    left.tileSizePx !== right.tileSizePx ||
    left.maxRefsPerTile !== right.maxRefsPerTile ||
    left.witnessView !== right.witnessView ||
    !sameViewport(left.viewport, right.viewport)
  );
}

function sameViewport(left, right) {
  if (!left || !right) {
    return left === right;
  }

  return left.width === right.width && left.height === right.height;
}

function buildFreshAnchorNote({
  anchor,
  priorDeadSplatCategory,
  retainedToOrderedCategory,
  crossRunInference,
  deadSplatElector,
  retainedToOrdered,
}) {
  const comparison = crossRunInference
    ? `cross-run inference only: dead-splat ${formatObservation(deadSplatElector.observation)} versus retained-to-ordered ${formatObservation(retainedToOrdered.observation)}`
    : "same-observation evidence";

  const sameClassNote = retainedToOrderedCategory === "narrower-role-source-blocker"
    ? "latest retained-to-ordered verdict keeps it in the same blocker class as fresh-a/c"
    : `latest retained-to-ordered verdict keeps it in ${retainedToOrderedCategory}`;

  return [
    `${anchor.id}: ${sameClassNote}.`,
    priorDeadSplatCategory ? `prior dead-splat category: ${priorDeadSplatCategory}.` : null,
    comparison,
  ].filter(Boolean).join(" ");
}

function formatObservation(observation) {
  if (!observation) {
    return "unknown observation";
  }

  const parts = [];
  if (observation.observationId) {
    parts.push(observation.observationId);
  }
  if (observation.tileSizePx !== null && observation.tileSizePx !== undefined) {
    parts.push(`tile=${observation.tileSizePx}`);
  }
  if (observation.maxRefsPerTile !== null && observation.maxRefsPerTile !== undefined) {
    parts.push(`cap=${observation.maxRefsPerTile}`);
  }
  if (observation.witnessView) {
    parts.push(`view=${observation.witnessView}`);
  }
  if (observation.viewport) {
    parts.push(`viewport=${observation.viewport.width}x${observation.viewport.height}`);
  }
  return parts.join(", ");
}
