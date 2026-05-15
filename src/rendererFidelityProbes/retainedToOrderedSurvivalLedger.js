const DEFAULT_FOREGROUND_ROLES = Object.freeze([
  "foreground-sealing",
  "dense-foreground",
  "lacunar-surface",
  "porous-surface",
  "front-surface",
  "foreground",
]);

const REQUIRED_TRACE_FIELDS = Object.freeze([
  "retainedContributors",
  "orderedContributors",
  "finalColorAccumulation",
]);

export const RETAINED_TO_ORDERED_SURVIVAL_CATEGORIES = Object.freeze([
  "ordered-present",
  "retained-missing-from-order",
  "ordered-present-final-alpha-weak",
  "trace-blocked",
  "narrower-role-source-blocker",
]);

const BLOCKER_REASONS = Object.freeze({
  retainedContributors: "retained contributor trace is missing or not an array",
  orderedContributors: "ordered contributor trace is missing or not an array",
  finalColorAccumulation: "final accumulation trace is missing or malformed",
});

export function describeRetainedToOrderedSurvivalLedgerContract() {
  return {
    consumes: [
      "gpu-live-trace:per-pixel-retained-contributors.retainedContributors",
      "gpu-live-trace:per-pixel-ordered-contributors.orderedContributors",
      "gpu-live-trace:per-pixel-final-color-accumulation.steps",
    ],
    categories: [...RETAINED_TO_ORDERED_SURVIVAL_CATEGORIES],
    owns: [
      "retained foreground contributor identity surviving into ordered output",
      "ordered rank/depth/tie-break custody for retained foreground contributors",
      "final accumulation alpha/RGB participation for retained foreground contributors",
    ],
    separatesFrom: [
      "retention-policy-repair",
      "visual-policy-repair",
      "global-opacity-scale-tuning",
      "tile-size-or-cap-change",
      "camera-or-projection-repair",
      "source-decode",
      "urmina-backend-construction",
      "deferred-gbuffer-voting",
    ],
  };
}

export const describeRetainedToOrderedSurvivalContract = describeRetainedToOrderedSurvivalLedgerContract;

export function buildRetainedToOrderedSurvivalLedger(anchorTraces = [], options = {}) {
  if (!Array.isArray(anchorTraces)) {
    throw new TypeError("anchorTraces must be an array");
  }
  const anchorLedgers = anchorTraces.map((trace) => classifyRetainedToOrderedSurvival(trace, options));
  return {
    status: "classified",
    contract: describeRetainedToOrderedSurvivalLedgerContract(),
    summary: {
      anchorCount: anchorLedgers.length,
      totalAnchors: anchorLedgers.length,
      categoryCounts: countBy(anchorLedgers, (entry) => entry.category),
      mechanismCounts: countBy(anchorLedgers, (entry) => entry.mechanism),
      retainedForegroundCount: sum(anchorLedgers, (entry) => entry.counts.retainedForeground),
      orderedForegroundCount: sum(anchorLedgers, (entry) => entry.counts.orderedForeground),
      missingFromOrderCount: sum(anchorLedgers, (entry) => entry.counts.missingFromOrder),
      accumulatedForegroundCount: sum(anchorLedgers, (entry) => entry.counts.accumulatedForeground),
    },
    anchorLedgers,
  };
}

export function classifyRetainedToOrderedSurvival({
  anchorPixel,
  tileAddress = null,
  projectedContributors = [],
  retainedContributors,
  orderedContributors,
  finalColorAccumulation,
} = {}, {
  foregroundRoles = DEFAULT_FOREGROUND_ROLES,
  minFinalForegroundAlpha = 0.1,
} = {}) {
  validateRoleList(foregroundRoles);
  validateNonNegativeFinite(minFinalForegroundAlpha, "minFinalForegroundAlpha");

  const blockers = traceBlockers({ retainedContributors, orderedContributors, finalColorAccumulation });
  const anchor = normalizeAnchor(anchorPixel);
  if (blockers.length > 0) {
    return {
      status: "blocked",
      category: "trace-blocked",
      mechanism: "missing-retained-or-ordered-contributor-fields",
      provisional: true,
      anchorPixel: anchor,
      tileAddress: normalizeTileAddress(tileAddress),
      blockers,
      ids: emptyIds(),
      counts: emptyCounts(),
      metrics: emptyMetrics(),
      retainedForeground: [],
      orderedForeground: [],
      finalForeground: [],
      missingForeground: [],
    };
  }

  const foregroundRoleSet = new Set(foregroundRoles.map(String));
  const depthContext = Array.isArray(projectedContributors) && projectedContributors.length > 0
    ? projectedContributors
    : retainedContributors;
  const depthBands = buildDepthBands(depthContext);
  const roleLookup = buildRoleLookup(depthBands, projectedContributors, retainedContributors, orderedContributors, finalColorAccumulation.steps);
  const retained = retainedContributors.map((entry, index) =>
    normalizeContributor(entry, index, "retainedContributors", roleLookup, depthBands)
  );
  const finalSteps = finalColorAccumulation.steps.map((entry, index) =>
    normalizeFinalStep(entry, index, roleLookup)
  );
  const explicitOrdered = orderedContributors.map((entry, index) =>
    normalizeOrderedContributor(entry, index, "orderedContributors", roleLookup, depthBands)
  );
  const ordered = explicitOrdered.length > 0
    ? explicitOrdered
    : finalSteps.map((entry) => ({
        ...entry,
        occlusionWeight: round((entry.coverageWeight ?? entry.coverageAlpha ?? 0) * (entry.opacity ?? 0)),
      }));

  const retainedForeground = retained.filter((entry) => isForeground(entry, foregroundRoleSet));
  const orderedForeground = ordered.filter((entry) => isForeground(entry, foregroundRoleSet));
  const finalForeground = finalSteps.filter((entry) => isForeground(entry, foregroundRoleSet));
  const orderedIds = new Set(ordered.map((entry) => entry.originalId));
  const missingForeground = retainedForeground.filter((entry) => !orderedIds.has(entry.originalId));
  const finalForegroundAlpha = finalAlpha(finalColorAccumulation, finalForeground);
  const ids = {
    retainedForeground: idsFor(retainedForeground),
    missingFromOrder: idsFor(missingForeground),
    orderedForeground: idsFor(orderedForeground),
    accumulatedForeground: idsFor(finalForeground),
    retainedAll: idsFor(retained),
    orderedAll: idsFor(ordered),
  };
  const counts = {
    retainedForeground: retainedForeground.length,
    missingFromOrder: missingForeground.length,
    orderedForeground: orderedForeground.length,
    accumulatedForeground: finalForeground.length,
    retainedAll: retained.length,
    orderedAll: ordered.length,
  };
  const metrics = {
    missingForegroundOcclusionWeight: round(sum(missingForeground, (entry) => entry.occlusionWeight)),
    retainedForegroundOcclusionWeight: round(sum(retainedForeground, (entry) => entry.occlusionWeight)),
    orderedForegroundOcclusionWeight: round(sum(orderedForeground, (entry) => entry.occlusionWeight)),
    finalForegroundAlpha,
  };

  if (retainedForeground.length === 0) {
    return classified({
      category: "narrower-role-source-blocker",
      mechanism: "no-retained-foreground-role-support",
      anchor,
      tileAddress,
      ids,
      counts,
      metrics,
      retainedForeground,
      orderedForeground,
      finalForeground,
      missingForeground,
    });
  }

  if (missingForeground.length > 0) {
    return classified({
      category: "retained-missing-from-order",
      mechanism: "retained-foreground-identity-omitted-from-ordered-output",
      anchor,
      tileAddress,
      ids,
      counts,
      metrics,
      retainedForeground,
      orderedForeground,
      finalForeground,
      missingForeground,
    });
  }

  if (finalForegroundAlpha < minFinalForegroundAlpha) {
    return classified({
      category: "ordered-present-final-alpha-weak",
      mechanism: "retained-foreground-ordered-but-final-alpha-below-sealing-threshold",
      anchor,
      tileAddress,
      ids,
      counts,
      metrics,
      retainedForeground,
      orderedForeground,
      finalForeground,
      missingForeground,
    });
  }

  return classified({
    category: "ordered-present",
    mechanism: "retained-foreground-identity-survives-to-final-accumulation",
    anchor,
    tileAddress,
    ids,
    counts,
    metrics,
    retainedForeground,
    orderedForeground,
    finalForeground,
    missingForeground,
  });
}

function classified({
  category,
  mechanism,
  anchor,
  tileAddress,
  ids,
  counts,
  metrics,
  retainedForeground,
  orderedForeground,
  finalForeground,
  missingForeground,
}) {
  return {
    status: "classified",
    category,
    mechanism,
    provisional: false,
    anchorPixel: anchor,
    tileAddress: normalizeTileAddress(tileAddress),
    ids,
    counts,
    metrics,
    retainedForeground,
    orderedForeground,
    finalForeground,
    missingForeground,
  };
}

function traceBlockers({ retainedContributors, orderedContributors, finalColorAccumulation }) {
  const blockers = [];
  if (!Array.isArray(retainedContributors)) {
    blockers.push(blockerFor("retainedContributors"));
  }
  if (!Array.isArray(orderedContributors)) {
    blockers.push(blockerFor("orderedContributors"));
  }
  if (
    !finalColorAccumulation ||
    typeof finalColorAccumulation !== "object" ||
    !Array.isArray(finalColorAccumulation.steps)
  ) {
    blockers.push(blockerFor("finalColorAccumulation"));
  }
  return blockers;
}

function blockerFor(field) {
  return {
    field,
    reason: BLOCKER_REASONS[field],
  };
}

function buildRoleLookup(depthBands, ...lists) {
  const lookup = new Map();
  for (const list of lists) {
    for (const entry of Array.isArray(list) ? list : []) {
      const id = identityFor(entry);
      const explicitRole = explicitRoleFor(entry);
      const role = roleFor(entry, undefined, depthBands);
      if (id !== null && role !== "unclassified") {
        if (explicitRole !== null || !lookup.has(id)) {
          lookup.set(id, role);
        }
      }
    }
  }
  return lookup;
}

function normalizeContributor(entry, index, field, roleLookup, depthBands = null) {
  if (!entry || typeof entry !== "object") {
    throw new TypeError(`${field} entry ${index} must be an object`);
  }
  const originalId = identityFor(entry);
  if (originalId === null) {
    throw new TypeError(`${field} entry ${index} requires originalId, id, or splatIndex`);
  }
  const role = roleFor(entry, roleLookup.get(originalId), depthBands);
  const coverageWeight = nonNegativeFinite(entry.coverageWeight ?? 0, `${field} entry ${index} coverageWeight`);
  const opacity = clamp01(entry.opacity ?? 0);
  return {
    originalId,
    splatIndex: integerOrNull(entry.splatIndex),
    role,
    roleClass: String(entry.roleClass ?? roleClassFor(role)),
    retentionBand: String(entry.retentionBand ?? "unknown"),
    coverageWeight: round(coverageWeight),
    opacity: round(opacity),
    occlusionWeight: round(nonNegativeFinite(entry.occlusionWeight ?? coverageWeight * opacity, `${field} entry ${index} occlusionWeight`)),
    viewRank: Number.isInteger(entry.viewRank) ? entry.viewRank : null,
    viewDepth: finiteOrNull(entry.viewDepth),
    sourceColor: normalizeOptionalColor(entry.sourceColor),
  };
}

function normalizeOrderedContributor(entry, index, field, roleLookup, depthBands = null) {
  const base = normalizeContributor(entry, index, field, roleLookup, depthBands);
  return {
    ...base,
    orderIndex: nonNegativeInteger(entry.orderIndex ?? index, `${field} entry ${index} orderIndex`),
    tieBreakKey: entry.tieBreakKey === undefined ? null : String(entry.tieBreakKey),
    orderBackend: entry.orderBackend === undefined ? null : String(entry.orderBackend),
  };
}

function normalizeFinalStep(entry, index, roleLookup) {
  if (!entry || typeof entry !== "object") {
    throw new TypeError(`finalColorAccumulation.steps entry ${index} must be an object`);
  }
  const originalId = identityFor(entry);
  if (originalId === null) {
    throw new TypeError(`finalColorAccumulation.steps entry ${index} requires originalId, id, or splatIndex`);
  }
  return {
    originalId,
    splatIndex: integerOrNull(entry.splatIndex),
    role: roleFor(entry, roleLookup.get(originalId)),
    roleClass: String(entry.roleClass ?? roleClassFor(roleFor(entry, roleLookup.get(originalId)))),
    orderIndex: nonNegativeInteger(entry.orderIndex ?? index, `finalColorAccumulation.steps entry ${index} orderIndex`),
    coverageWeight: round(nonNegativeFinite(entry.coverageWeight ?? entry.coverageAlpha ?? 0, `finalColorAccumulation.steps entry ${index} coverageWeight`)),
    opacity: round(clamp01(entry.opacity ?? 0)),
    coverageAlpha: round(nonNegativeFinite(entry.coverageAlpha ?? 0, `finalColorAccumulation.steps entry ${index} coverageAlpha`)),
    sourceColor: normalizeOptionalColor(entry.sourceColor),
  };
}

function identityFor(entry) {
  if (!entry || typeof entry !== "object") return null;
  const value = entry.originalId ?? entry.id ?? entry.splatIndex;
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function roleFor(entry, fallback = null, depthBands = null) {
  const role = explicitRoleFor(entry) ?? fallback ?? inferRole(entry, depthBands);
  return role === undefined || role === null || role === "" ? "unclassified" : String(role);
}

function explicitRoleFor(entry) {
  const role = entry?.role ?? entry?.sourceRole ?? entry?.semanticRole;
  return role === undefined || role === null || role === "" ? null : String(role);
}

function roleClassFor(role) {
  if (DEFAULT_FOREGROUND_ROLES.includes(role) || role === "foreground-depth-band") {
    return "foreground";
  }
  if (role === "behind-depth-band" || role === "behind-surface" || role === "background-haze") {
    return "behindOrBackground";
  }
  return "unknown";
}

function isForeground(entry, foregroundRoleSet) {
  return foregroundRoleSet.has(entry.role) || entry.role === "foreground-depth-band" || (entry.role === "unclassified" && entry.roleClass === "foreground");
}

function inferRole(entry, depthBands) {
  const retentionBand = String(entry?.retentionBand ?? "").toLowerCase();
  if (retentionBand === "front" || retentionBand === "foreground") return "foreground-sealing";
  if (retentionBand === "behind" || retentionBand === "background") return "behind-surface";
  const viewDepth = finiteOrNull(entry?.viewDepth);
  if (viewDepth != null && depthBands) {
    if (viewDepth <= depthBands.foregroundMaxDepth) return "foreground-depth-band";
    if (viewDepth >= depthBands.behindMinDepth) return "behind-depth-band";
  }
  return "unclassified";
}

function buildDepthBands(contributors) {
  if (!Array.isArray(contributors)) return null;
  const depths = contributors
    .map((contributor) => finiteOrNull(contributor?.viewDepth))
    .filter((value) => value != null)
    .sort((left, right) => left - right);
  if (depths.length < 2) return null;
  const minDepth = depths[0];
  const maxDepth = depths[depths.length - 1];
  if (maxDepth <= minDepth) return null;
  return {
    foregroundMaxDepth: minDepth + (maxDepth - minDepth) * 0.25,
    behindMinDepth: minDepth + (maxDepth - minDepth) * 0.75,
  };
}

function finalAlpha(finalColorAccumulation, finalForeground) {
  const outputAlpha = finalColorAccumulation?.outputColor?.[3];
  if (Number.isFinite(outputAlpha)) {
    return round(outputAlpha);
  }
  let transmittance = 1;
  for (const entry of finalForeground) {
    transmittance *= 1 - clamp01(entry.coverageAlpha);
  }
  return round(1 - transmittance);
}

function emptyIds() {
  return {
    retainedForeground: [],
    missingFromOrder: [],
    orderedForeground: [],
    accumulatedForeground: [],
    retainedAll: [],
    orderedAll: [],
  };
}

function emptyCounts() {
  return {
    retainedForeground: 0,
    missingFromOrder: 0,
    orderedForeground: 0,
    accumulatedForeground: 0,
    retainedAll: 0,
    orderedAll: 0,
  };
}

function emptyMetrics() {
  return {
    missingForegroundOcclusionWeight: 0,
    retainedForegroundOcclusionWeight: 0,
    orderedForegroundOcclusionWeight: 0,
    finalForegroundAlpha: 0,
  };
}

function idsFor(entries) {
  return entries.map((entry) => entry.originalId).sort(compareStableText);
}

function normalizeAnchor(anchorPixel) {
  if (anchorPixel === undefined || anchorPixel === null) {
    return null;
  }
  if (typeof anchorPixel !== "object") {
    throw new TypeError("anchorPixel must be an object when provided");
  }
  return {
    id: String(anchorPixel.id ?? "unidentified-anchor"),
    class: String(anchorPixel.class ?? anchorPixel.kind ?? "unclassified"),
    x: finiteOrNull(anchorPixel.x),
    y: finiteOrNull(anchorPixel.y),
  };
}

function normalizeTileAddress(tileAddress) {
  if (tileAddress === undefined || tileAddress === null) {
    return null;
  }
  if (typeof tileAddress !== "object") {
    throw new TypeError("tileAddress must be an object when provided");
  }
  return {
    tileIndex: integerOrNull(tileAddress.tileIndex),
    tileX: integerOrNull(tileAddress.tileX),
    tileY: integerOrNull(tileAddress.tileY),
    tileSizePx: integerOrNull(tileAddress.tileSizePx),
  };
}

function validateRoleList(roles) {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new TypeError("foregroundRoles must be a non-empty array");
  }
}

function validateNonNegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative finite number`);
  }
}

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
  return value;
}

function nonNegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative finite number`);
  }
  return value;
}

function clamp01(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError("alpha/opacity must be finite");
  }
  return Math.min(Math.max(value, 0), 1);
}

function normalizeOptionalColor(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new TypeError("sourceColor must be an array when provided");
  }
  return value.map((channel) => round(nonNegativeFinite(channel, "sourceColor channel")));
}

function countBy(entries, keyFor) {
  const counts = {};
  for (const entry of entries) {
    const key = keyFor(entry);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function sum(entries, valueFor) {
  return entries.reduce((total, entry) => total + valueFor(entry), 0);
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function integerOrNull(value) {
  return Number.isInteger(value) ? value : null;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}

function compareStableText(left, right) {
  return left.localeCompare(right, "en", { numeric: true });
}
