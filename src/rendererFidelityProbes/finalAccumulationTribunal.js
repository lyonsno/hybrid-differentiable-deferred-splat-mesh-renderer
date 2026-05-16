const DEFAULT_FOREGROUND_ROLES = Object.freeze([
  "foreground-sealing",
  "dense-foreground",
  "lacunar-surface",
  "porous-surface",
  "front-surface",
  "foreground",
]);

export const FINAL_ACCUMULATION_TRIBUNAL_CATEGORIES = Object.freeze([
  "ordered-skipped-in-accumulation",
  "near-zero-alpha-transfer",
  "accumulation-support-sufficient",
  "trace-blocked",
  "narrower-blocker",
]);

const BLOCKER_REASONS = Object.freeze({
  orderedContributors: "ordered contributor trace is missing or not an array",
  finalColorAccumulation: "final accumulation trace is missing or malformed",
});

export function describeFinalAccumulationTribunalContract() {
  return {
    consumes: [
      "gpu-live-trace:per-pixel-ordered-contributors.orderedContributors",
      "gpu-live-trace:per-pixel-final-color-accumulation.steps",
      "gpu-live-trace:per-pixel-final-color-accumulation.outputColor",
    ],
    categories: [...FINAL_ACCUMULATION_TRIBUNAL_CATEGORIES],
    owns: [
      "ordered foreground contributor identity entering final accumulation",
      "per-step alpha/color transfer and transmittance accounting",
      "final trace output RGBA support classification for ordered-present anchors",
    ],
    separatesFrom: [
      "broad-compositor-replacement",
      "global-opacity-or-conic-tuning",
      "source-decode",
      "urmina-backend-construction",
      "retention-policy-repair",
      "production-deferred-gbuffer-voting",
      "camera-tile-or-cap-change",
      "visual-repair",
    ],
  };
}

export function buildFinalAccumulationTribunalLedger(anchorTraces = [], options = {}) {
  if (!Array.isArray(anchorTraces)) {
    throw new TypeError("anchorTraces must be an array");
  }
  const anchorVerdicts = anchorTraces.map((trace) => classifyFinalAccumulationVerdict(trace, options));
  return {
    status: "classified",
    contract: describeFinalAccumulationTribunalContract(),
    summary: {
      anchorCount: anchorVerdicts.length,
      totalAnchors: anchorVerdicts.length,
      categoryCounts: countBy(anchorVerdicts, (entry) => entry.category),
      mechanismCounts: countBy(anchorVerdicts, (entry) => entry.mechanism),
      orderedForegroundCount: sum(anchorVerdicts, (entry) => entry.counts.orderedForeground),
      accumulatedForegroundCount: sum(anchorVerdicts, (entry) => entry.counts.accumulatedForeground),
      skippedForegroundCount: sum(anchorVerdicts, (entry) => entry.counts.skippedForeground),
      nearZeroForegroundCount: sum(anchorVerdicts, (entry) => entry.counts.nearZeroForeground),
    },
    anchorVerdicts,
  };
}

export function classifyFinalAccumulationVerdict({
  anchorPixel,
  tileAddress = null,
  projectedContributors = [],
  retainedContributors = [],
  orderedContributors,
  finalColorAccumulation,
} = {}, {
  foregroundRoles = DEFAULT_FOREGROUND_ROLES,
  minForegroundAlpha = 0.02,
  minForegroundContribution = 0.02,
} = {}) {
  validateRoleList(foregroundRoles);
  validateNonNegativeFinite(minForegroundAlpha, "minForegroundAlpha");
  validateNonNegativeFinite(minForegroundContribution, "minForegroundContribution");

  const blockers = traceBlockers({ orderedContributors, finalColorAccumulation });
  const anchor = normalizeAnchor(anchorPixel);
  if (blockers.length > 0) {
    return {
      status: "blocked",
      category: "trace-blocked",
      mechanism: "missing-ordered-or-final-accumulation-fields",
      provisional: true,
      anchorPixel: anchor,
      tileAddress: normalizeTileAddress(tileAddress),
      outputRgba: [],
      blockers,
      ids: emptyIds(),
      counts: emptyCounts(),
      metrics: emptyMetrics(),
      foregroundContributors: [],
    };
  }

  const depthContext = Array.isArray(projectedContributors) && projectedContributors.length > 0
    ? projectedContributors
    : retainedContributors;
  const depthBands = buildDepthBands(depthContext);
  const roleLookup = buildRoleLookup(depthBands, projectedContributors, retainedContributors, orderedContributors, finalColorAccumulation.steps);
  const foregroundRoleSet = new Set(foregroundRoles.map(String));
  const steps = finalColorAccumulation.steps.map((step, index) => normalizeFinalStep(step, index, roleLookup, depthBands));
  const stepById = new Map(steps.map((step) => [step.originalId, step]));
  const orderedSource = orderedContributors.length > 0 ? orderedContributors : finalColorAccumulation.steps;
  const ordered = orderedSource.map((entry, index) =>
    normalizeOrderedContributor(entry, index, roleLookup, depthBands)
  );
  const orderedForeground = ordered.filter((entry) => isForeground(entry, foregroundRoleSet));
  const foregroundContributors = orderedForeground.map((entry) =>
    buildForegroundVerdictEntry(entry, stepById.get(entry.originalId) ?? null)
  );
  const skippedForeground = foregroundContributors.filter((entry) => entry.skipReason !== null);
  const accumulatedForeground = foregroundContributors.filter((entry) => entry.accumulationStatus === "accumulated");
  const nearZeroForeground = accumulatedForeground.filter((entry) =>
    entry.coverageAlpha <= minForegroundAlpha ||
      colorMagnitude(entry.contributionColor) <= minForegroundContribution
  );
  const foregroundCoverageAlpha = compositeCoverageAlpha(accumulatedForeground);
  const foregroundContributionLuminance = round(sum(accumulatedForeground, (entry) => colorMagnitude(entry.contributionColor)));
  const outputRgba = normalizeOutputRgba(finalColorAccumulation.outputColor);
  const ids = {
    orderedForeground: idsFor(orderedForeground),
    accumulatedForeground: idsFor(accumulatedForeground),
    skippedForeground: idsFor(skippedForeground),
    nearZeroForeground: idsFor(nearZeroForeground),
    orderedAll: idsFor(ordered),
  };
  const counts = {
    orderedForeground: orderedForeground.length,
    accumulatedForeground: accumulatedForeground.length,
    skippedForeground: skippedForeground.length,
    nearZeroForeground: nearZeroForeground.length,
    orderedAll: ordered.length,
  };
  const metrics = {
    outputAlpha: outputRgba.length === 4 ? outputRgba[3] : 0,
    foregroundCoverageAlpha,
    foregroundContributionLuminance,
    maxForegroundCoverageAlpha: round(Math.max(0, ...accumulatedForeground.map((entry) => entry.coverageAlpha))),
  };

  if (orderedForeground.length === 0) {
    return classified({
      category: "narrower-blocker",
      mechanism: "no-ordered-foreground-role-support",
      anchor,
      tileAddress,
      outputRgba,
      ids,
      counts,
      metrics,
      foregroundContributors,
    });
  }

  if (skippedForeground.length > 0) {
    return classified({
      category: "ordered-skipped-in-accumulation",
      mechanism: "ordered-foreground-has-no-effective-final-accumulation-step",
      anchor,
      tileAddress,
      outputRgba,
      ids,
      counts,
      metrics,
      foregroundContributors,
    });
  }

  if (
    accumulatedForeground.length === 0 ||
    foregroundCoverageAlpha <= minForegroundAlpha ||
    foregroundContributionLuminance <= minForegroundContribution ||
    nearZeroForeground.length === accumulatedForeground.length
  ) {
    return classified({
      category: "near-zero-alpha-transfer",
      mechanism: "ordered-foreground-accumulates-with-near-zero-alpha-or-color-transfer",
      anchor,
      tileAddress,
      outputRgba,
      ids,
      counts,
      metrics,
      foregroundContributors,
    });
  }

  return classified({
    category: "accumulation-support-sufficient",
    mechanism: "ordered-foreground-accumulates-with-sufficient-alpha-and-color",
    anchor,
    tileAddress,
    outputRgba,
    ids,
    counts,
    metrics,
    foregroundContributors,
  });
}

function classified({
  category,
  mechanism,
  anchor,
  tileAddress,
  outputRgba,
  ids,
  counts,
  metrics,
  foregroundContributors,
}) {
  return {
    status: "classified",
    category,
    mechanism,
    provisional: false,
    anchorPixel: anchor,
    tileAddress: normalizeTileAddress(tileAddress),
    outputRgba,
    blockers: [],
    ids,
    counts,
    metrics,
    foregroundContributors,
  };
}

function buildForegroundVerdictEntry(ordered, step) {
  const skipReason = skipReasonForStep(step);
  return {
    originalId: ordered.originalId,
    splatIndex: ordered.splatIndex,
    role: ordered.role,
    roleClass: ordered.roleClass,
    orderIndex: ordered.orderIndex,
    viewRank: ordered.viewRank,
    viewDepth: ordered.viewDepth,
    orderedCoverageWeight: ordered.coverageWeight,
    orderedOpacity: ordered.opacity,
    finalCoverageWeight: step?.coverageWeight ?? 0,
    tileCoverageWeight: step?.tileCoverageWeight ?? null,
    finalOpacity: step?.opacity ?? 0,
    coverageAlpha: step?.coverageAlpha ?? 0,
    transmittanceBefore: step?.transmittanceBefore ?? null,
    transmittanceAfter: step?.transmittanceAfter ?? null,
    sourceColor: step?.sourceColor ?? ordered.sourceColor,
    contributionColor: step?.contributionColor ?? [0, 0, 0],
    runningColor: step?.runningColor ?? null,
    accumulationStatus: step?.accumulationStatus ?? "missing-final-accumulation-step",
    skipReason,
  };
}

function skipReasonForStep(step) {
  if (!step) return "missing-final-accumulation-step";
  if (step.accumulationStatus && step.accumulationStatus !== "accumulated") {
    return step.accumulationStatus;
  }
  if (step.coverageAlpha <= 0) return "zero-coverage-alpha";
  return null;
}

function traceBlockers({ orderedContributors, finalColorAccumulation }) {
  const blockers = [];
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

function normalizeOrderedContributor(entry, index, roleLookup, depthBands = null) {
  if (!entry || typeof entry !== "object") {
    throw new TypeError(`orderedContributors entry ${index} must be an object`);
  }
  const originalId = identityFor(entry);
  if (originalId === null) {
    throw new TypeError(`orderedContributors entry ${index} requires originalId, id, or splatIndex`);
  }
  const role = roleFor(entry, roleLookup.get(originalId), depthBands);
  return {
    originalId,
    splatIndex: integerOrNull(entry.splatIndex),
    role,
    roleClass: String(entry.roleClass ?? roleClassFor(role)),
    orderIndex: nonNegativeInteger(entry.orderIndex ?? index, `orderedContributors entry ${index} orderIndex`),
    viewRank: Number.isInteger(entry.viewRank) ? entry.viewRank : index,
    viewDepth: finiteOrNull(entry.viewDepth),
    coverageWeight: round(nonNegativeFinite(entry.coverageWeight ?? 0, `orderedContributors entry ${index} coverageWeight`)),
    opacity: round(clamp01(entry.opacity ?? 0)),
    sourceColor: normalizeOptionalColor(entry.sourceColor),
  };
}

function normalizeFinalStep(entry, index, roleLookup, depthBands = null) {
  if (!entry || typeof entry !== "object") {
    throw new TypeError(`finalColorAccumulation.steps entry ${index} must be an object`);
  }
  const originalId = identityFor(entry);
  if (originalId === null) {
    throw new TypeError(`finalColorAccumulation.steps entry ${index} requires originalId, id, or splatIndex`);
  }
  const role = roleFor(entry, roleLookup.get(originalId), depthBands);
  const accumulationStatus = String(entry.accumulationStatus ?? (entry.coverageAlpha > 0 ? "accumulated" : "zero-coverage-alpha"));
  return {
    originalId,
    splatIndex: integerOrNull(entry.splatIndex),
    role,
    roleClass: String(entry.roleClass ?? roleClassFor(role)),
    orderIndex: nonNegativeInteger(entry.orderIndex ?? index, `finalColorAccumulation.steps entry ${index} orderIndex`),
    coverageWeight: round(nonNegativeFinite(entry.coverageWeight ?? entry.coverageAlpha ?? 0, `finalColorAccumulation.steps entry ${index} coverageWeight`)),
    tileCoverageWeight: Number.isFinite(entry.tileCoverageWeight) ? round(Math.max(entry.tileCoverageWeight, 0)) : null,
    opacity: round(clamp01(entry.opacity ?? 0)),
    coverageAlpha: round(nonNegativeFinite(entry.coverageAlpha ?? 0, `finalColorAccumulation.steps entry ${index} coverageAlpha`)),
    transmittanceBefore: finiteOrNull(entry.transmittanceBefore),
    transmittanceAfter: finiteOrNull(entry.transmittanceAfter),
    sourceColor: normalizeOptionalColor(entry.sourceColor) ?? [0, 0, 0],
    contributionColor: normalizeOptionalColor(entry.contributionColor) ?? [0, 0, 0],
    runningColor: normalizeOptionalColor(entry.runningColor),
    accumulationStatus,
  };
}

function identityFor(entry) {
  if (!entry || typeof entry !== "object") return null;
  const value = entry.originalId ?? entry.id ?? entry.splatIndex;
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function explicitRoleFor(entry) {
  const role = entry?.role ?? entry?.sourceRole ?? entry?.semanticRole;
  return role === undefined || role === null || role === "" ? null : String(role);
}

function roleFor(entry, fallback = null, depthBands = null) {
  const role = explicitRoleFor(entry) ?? fallback ?? inferRole(entry, depthBands);
  return role === undefined || role === null || role === "" ? "unclassified" : String(role);
}

function inferRole(entry, depthBands = null) {
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
  return foregroundRoleSet.has(entry.role) ||
    entry.role === "foreground-depth-band" ||
    (entry.role === "unclassified" && entry.roleClass === "foreground");
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

function compositeCoverageAlpha(entries) {
  let transmittance = 1;
  for (const entry of entries) {
    transmittance *= 1 - clamp01(entry.coverageAlpha);
  }
  return round(1 - transmittance);
}

function colorMagnitude(color) {
  if (!Array.isArray(color)) return 0;
  const red = Math.max(Number.isFinite(color[0]) ? color[0] : 0, 0);
  const green = Math.max(Number.isFinite(color[1]) ? color[1] : 0, 0);
  const blue = Math.max(Number.isFinite(color[2]) ? color[2] : 0, 0);
  return round(red * 0.2126 + green * 0.7152 + blue * 0.0722);
}

function idsFor(entries) {
  return entries.map((entry) => entry.originalId).sort(compareStableText);
}

function emptyIds() {
  return {
    orderedForeground: [],
    accumulatedForeground: [],
    skippedForeground: [],
    nearZeroForeground: [],
    orderedAll: [],
  };
}

function emptyCounts() {
  return {
    orderedForeground: 0,
    accumulatedForeground: 0,
    skippedForeground: 0,
    nearZeroForeground: 0,
    orderedAll: 0,
  };
}

function emptyMetrics() {
  return {
    outputAlpha: 0,
    foregroundCoverageAlpha: 0,
    foregroundContributionLuminance: 0,
    maxForegroundCoverageAlpha: 0,
  };
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

function normalizeOutputRgba(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).map((channel) => round(nonNegativeFinite(channel ?? 0, "outputColor channel")));
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
    throw new TypeError("color fields must be arrays when provided");
  }
  return value.map((channel) => round(nonNegativeFinite(channel, "color channel")));
}

function sum(entries, valueFor) {
  return entries.reduce((total, entry) => total + valueFor(entry), 0);
}

function countBy(entries, keyFor) {
  const counts = {};
  for (const entry of entries) {
    const key = keyFor(entry);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
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
