const CONTRACT = Object.freeze({
  consumes: Object.freeze([
    "gpu-live-trace:per-pixel-retained-contributors.projectedContributors",
    "gpu-live-trace:per-pixel-retained-contributors.retainedContributors",
    "gpu-live-trace:per-pixel-retained-contributors.droppedContributors",
  ]),
  categories: Object.freeze([
    "blocked-missing-retention-trace",
    "source-sparse",
    "wrong-retained-set",
    "later-transfer-failure",
    "narrower-blocker",
  ]),
  owns: Object.freeze([
    "retained-vs-dropped contributor identity",
    "foreground sealing role survival under cap pressure",
    "retained slate role/depth/weight summaries",
  ]),
  separatesFrom: Object.freeze([
    "visual-policy-repair",
    "global-opacity-scale-tuning",
    "tile-size-or-cap-change",
    "camera-or-projection-repair",
    "source-decode",
    "urmina-backend-construction",
    "deferred-gbuffer-voting",
  ]),
});

const DEFAULT_FOREGROUND_ROLES = Object.freeze([
  "foreground-sealing",
  "dense-foreground",
  "lacunar-surface",
  "porous-surface",
  "front-surface",
  "foreground",
]);

const DEFAULT_BEHIND_ROLES = Object.freeze([
  "behind-surface",
  "background-haze",
  "bright-behind",
  "plate-behind",
  "background",
]);

export function describeDeadSplatElectorLedgerContract() {
  return {
    consumes: [...CONTRACT.consumes],
    categories: [...CONTRACT.categories],
    owns: [...CONTRACT.owns],
    separatesFrom: [...CONTRACT.separatesFrom],
  };
}

export function buildDeadSplatElectorLedger(records, options = {}) {
  const sourceRecords = Array.isArray(records) ? records : [];
  const anchorLedgers = sourceRecords.map((record) => classifyDeadSplatElection(record, options));
  return {
    status: anchorLedgers.some((entry) => entry.status === "classified") ? "classified" : "blocked",
    anchorLedgers,
    summary: {
      totalAnchors: anchorLedgers.length,
      categoryCounts: countBy(anchorLedgers, (entry) => entry.category),
      wrongRetainedSetAnchorIds: anchorLedgers
        .filter((entry) => entry.category === "wrong-retained-set")
        .map((entry) => entry.anchorPixel.id),
      laterTransferFailureAnchorIds: anchorLedgers
        .filter((entry) => entry.category === "later-transfer-failure")
        .map((entry) => entry.anchorPixel.id),
    },
    contract: describeDeadSplatElectorLedgerContract(),
  };
}

export function classifyDeadSplatElection(record, {
  foregroundRoles = DEFAULT_FOREGROUND_ROLES,
  behindRoles = DEFAULT_BEHIND_ROLES,
  minSignificantOcclusionWeight = 0.05,
  droppedForegroundDominanceRatio = 1.25,
  retainedForegroundDominanceRatio = 3,
} = {}) {
  const anchorPixel = normalizeAnchorPixel(record?.anchorPixel);
  const missingFields = missingRetentionFields(record);
  if (missingFields.length > 0) {
    return verdict({
      status: "blocked",
      category: "blocked-missing-retention-trace",
      mechanism: "missing-retained-vs-dropped-contributor-fields",
      anchorPixel,
      missingFields,
    });
  }

  const projected = normalizeContributors(record.projectedContributors, {
    foregroundRoles,
    behindRoles,
    depthContext: record.projectedContributors,
  });
  const retained = normalizeContributors(record.retainedContributors, {
    foregroundRoles,
    behindRoles,
    depthContext: record.projectedContributors,
  });
  const dropped = normalizeContributors(record.droppedContributors, {
    foregroundRoles,
    behindRoles,
    depthContext: record.projectedContributors,
  });
  const summaries = {
    projected: summarizeContributors(projected),
    retained: summarizeContributors(retained),
    dropped: summarizeContributors(dropped),
  };
  const ids = {
    projectedForeground: idsForRoleClass(projected, "foreground"),
    retainedForeground: idsForRoleClass(retained, "foreground"),
    droppedForeground: idsForRoleClass(dropped, "foreground"),
    retainedBehindOrBackground: idsForRoleClass(retained, "behindOrBackground"),
    droppedBehindOrBackground: idsForRoleClass(dropped, "behindOrBackground"),
    retainedMiddleOrUnknown: idsForRoleClass(retained, "middleOrUnknown"),
    droppedMiddleOrUnknown: idsForRoleClass(dropped, "middleOrUnknown"),
  };
  const counts = Object.fromEntries(Object.entries(ids).map(([key, value]) => [key, value.length]));
  const metrics = {
    projectedForegroundOcclusionWeight: summaries.projected.foreground.occlusionWeight,
    retainedForegroundOcclusionWeight: summaries.retained.foreground.occlusionWeight,
    droppedForegroundOcclusionWeight: summaries.dropped.foreground.occlusionWeight,
    retainedBehindOrBackgroundOcclusionWeight: summaries.retained.behindOrBackground.occlusionWeight,
    droppedBehindOrBackgroundOcclusionWeight: summaries.dropped.behindOrBackground.occlusionWeight,
    retainedTotalOcclusionWeight: summaries.retained.total.occlusionWeight,
    droppedTotalOcclusionWeight: summaries.dropped.total.occlusionWeight,
    retainedForegroundFraction: fraction(summaries.retained.foreground.occlusionWeight, summaries.retained.total.occlusionWeight),
    droppedForegroundFraction: fraction(summaries.dropped.foreground.occlusionWeight, summaries.dropped.total.occlusionWeight),
    minSignificantOcclusionWeight,
  };

  if (projected.length === 0) {
    return classified({
      category: "source-sparse",
      mechanism: "no-projected-contributors-at-anchor",
      anchorPixel,
      ids,
      counts,
      metrics,
      summaries,
      sourceStatus: record.status ?? null,
    });
  }

  if (counts.projectedForeground === 0) {
    return classified({
      category: "source-sparse",
      mechanism: "no-projected-foreground-sealing-support",
      anchorPixel,
      ids,
      counts,
      metrics,
      summaries,
      sourceStatus: record.status ?? null,
    });
  }

  const droppedForegroundDominates =
    metrics.droppedForegroundOcclusionWeight >= minSignificantOcclusionWeight &&
    metrics.droppedForegroundOcclusionWeight > metrics.retainedForegroundOcclusionWeight * droppedForegroundDominanceRatio;
  if (droppedForegroundDominates || (counts.retainedForeground === 0 && counts.droppedForeground > 0)) {
    return classified({
      category: "wrong-retained-set",
      mechanism: "dropped-foreground-sealing-support-outranks-retained-slate",
      anchorPixel,
      ids,
      counts,
      metrics,
      summaries,
      sourceStatus: record.status ?? null,
    });
  }

  const retainedForegroundDominates =
    metrics.retainedForegroundOcclusionWeight >= minSignificantOcclusionWeight &&
    metrics.retainedForegroundOcclusionWeight >= metrics.droppedForegroundOcclusionWeight * retainedForegroundDominanceRatio;
  if (retainedForegroundDominates) {
    return classified({
      category: "later-transfer-failure",
      mechanism: "foreground-sealing-slate-retained",
      anchorPixel,
      ids,
      counts,
      metrics,
      summaries,
      sourceStatus: record.status ?? null,
    });
  }

  return classified({
    category: "narrower-blocker",
    mechanism: "retained-and-dropped-foreground-support-ambiguous",
    anchorPixel,
    ids,
    counts,
    metrics,
    summaries,
    sourceStatus: record.status ?? null,
  });
}

function classified(payload) {
  return verdict({
    status: "classified",
    ...payload,
  });
}

function verdict(payload) {
  return {
    status: payload.status,
    category: payload.category,
    mechanism: payload.mechanism,
    anchorPixel: payload.anchorPixel ?? normalizeAnchorPixel(null),
    provisional: payload.status !== "classified",
    ...(payload.missingFields ? { missingFields: payload.missingFields } : {}),
    ...(payload.ids ? { ids: payload.ids } : {}),
    ...(payload.counts ? { counts: payload.counts } : {}),
    ...(payload.metrics ? { metrics: payload.metrics } : {}),
    ...(payload.summaries ? { summaries: payload.summaries } : {}),
    ...(payload.sourceStatus != null ? { sourceStatus: payload.sourceStatus } : {}),
  };
}

function missingRetentionFields(record) {
  if (!record || typeof record !== "object") {
    return ["projectedContributors", "retainedContributors", "droppedContributors"];
  }
  return ["projectedContributors", "retainedContributors", "droppedContributors"]
    .filter((field) => !Array.isArray(record[field]));
}

function normalizeContributors(contributors, { foregroundRoles, behindRoles, depthContext }) {
  const depthBands = buildDepthBands(depthContext);
  const foregroundRoleSet = new Set(foregroundRoles.map(String));
  const behindRoleSet = new Set(behindRoles.map(String));
  return contributors.map((contributor, index) => {
    const id = contributorId(contributor, index);
    const role = String(contributor?.role ?? inferRole(contributor, depthBands));
    const roleClass = foregroundRoleSet.has(role)
      ? "foreground"
      : behindRoleSet.has(role)
        ? "behindOrBackground"
        : role === "foreground-depth-band"
          ? "foreground"
          : role === "behind-depth-band"
            ? "behindOrBackground"
            : "middleOrUnknown";
    const coverageWeight = nonNegative(contributor?.coverageWeight, 0);
    const opacity = clamp01(contributor?.opacity ?? 0);
    const occlusionWeight = nonNegative(
      contributor?.occlusionWeight ?? contributor?.retentionWeight ?? coverageWeight * opacity,
      coverageWeight * opacity,
    );
    return {
      id,
      role,
      roleClass,
      retained: Boolean(contributor?.retained ?? contributor?.retentionStatus === "retained"),
      retentionStatus: contributor?.retentionStatus ?? (contributor?.retained ? "retained" : "dropped"),
      retentionBand: String(contributor?.retentionBand ?? "middle"),
      coverageWeight,
      opacity,
      occlusionWeight,
      viewDepth: finiteOrNull(contributor?.viewDepth),
      viewRank: Number.isInteger(contributor?.viewRank) ? contributor.viewRank : null,
    };
  });
}

function inferRole(contributor, depthBands) {
  const retentionBand = String(contributor?.retentionBand ?? "").toLowerCase();
  if (retentionBand === "front" || retentionBand === "foreground") return "foreground-sealing";
  if (retentionBand === "behind" || retentionBand === "background") return "behind-surface";
  const viewDepth = finiteOrNull(contributor?.viewDepth);
  if (viewDepth != null && depthBands) {
    if (viewDepth <= depthBands.foregroundMaxDepth) return "foreground-depth-band";
    if (viewDepth >= depthBands.behindMinDepth) return "behind-depth-band";
  }
  return "middle-or-unknown";
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

function summarizeContributors(contributors) {
  const empty = () => ({ count: 0, occlusionWeight: 0, coverageWeight: 0 });
  const summary = {
    total: empty(),
    foreground: empty(),
    behindOrBackground: empty(),
    middleOrUnknown: empty(),
  };
  for (const contributor of contributors) {
    addContributor(summary.total, contributor);
    addContributor(summary[contributor.roleClass], contributor);
  }
  for (const bucket of Object.values(summary)) {
    bucket.occlusionWeight = roundMetric(bucket.occlusionWeight);
    bucket.coverageWeight = roundMetric(bucket.coverageWeight);
  }
  return summary;
}

function addContributor(bucket, contributor) {
  bucket.count += 1;
  bucket.occlusionWeight += contributor.occlusionWeight;
  bucket.coverageWeight += contributor.coverageWeight;
}

function idsForRoleClass(contributors, roleClass) {
  return contributors
    .filter((contributor) => contributor.roleClass === roleClass)
    .map((contributor) => contributor.id)
    .sort(compareIds);
}

function normalizeAnchorPixel(anchorPixel) {
  if (!anchorPixel || typeof anchorPixel !== "object") {
    return { id: "unidentified-anchor", kind: "unclassified", x: null, y: null };
  }
  return {
    id: String(anchorPixel.id ?? "unidentified-anchor"),
    kind: String(anchorPixel.kind ?? anchorPixel.class ?? "unclassified"),
    x: Number.isFinite(anchorPixel.x) ? anchorPixel.x : null,
    y: Number.isFinite(anchorPixel.y) ? anchorPixel.y : null,
    description: anchorPixel.description ?? null,
    canonicalTileAddress: anchorPixel.canonicalTileAddress ? { ...anchorPixel.canonicalTileAddress } : null,
  };
}

function contributorId(contributor, fallbackIndex) {
  if (contributor?.id != null) return String(contributor.id);
  if (contributor?.originalId != null) return String(contributor.originalId);
  if (contributor?.splatIndex != null) return String(contributor.splatIndex);
  return `contributor-${fallbackIndex}`;
}

function countBy(entries, readKey) {
  const counts = {};
  for (const entry of entries) {
    const key = readKey(entry);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function fraction(numerator, denominator) {
  return denominator > 0 ? roundMetric(numerator / denominator) : 0;
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

function nonNegative(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? Number(value) : fallback;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Number(value)));
}

function compareIds(left, right) {
  const numericLeft = Number(left);
  const numericRight = Number(right);
  if (Number.isFinite(numericLeft) && Number.isFinite(numericRight)) {
    return numericLeft - numericRight;
  }
  return String(left).localeCompare(String(right));
}

function roundMetric(value) {
  return Number(value.toFixed(12));
}
