const REQUIRED_HEADER_FIELDS = [
  "contributorOffset",
  "retainedContributorCount",
  "projectedContributorCount",
  "droppedContributorCount",
  "overflowFlags",
  "maxRetainedViewRank",
  "minRetainedDepth",
  "maxRetainedDepth",
];

const REQUIRED_RECORD_FIELDS = [
  "splatIndex",
  "originalId",
  "tileIndex",
  "contributorIndex",
  "viewRank",
  "viewDepth",
  "depthBand",
  "coverageWeight",
  "centerPx",
  "inverseConic",
  "opacity",
  "coverageAlpha",
  "transmittanceBefore",
  "retentionWeight",
  "occlusionWeight",
  "deferredSurface",
];

const REQUIRED_OVERFLOW_REASONS = [
  "none",
  "perTileRetainedCap",
  "globalProjectedBudget",
  "invalidProjection",
  "nearPlaneSupport",
  "nonFiniteCoverage",
];

const FIELD_USE = new Map([
  ["coverageAlpha", "current-final-color-only"],
  ["sourceColor", "current-final-color-only"],
  ["transmittanceBefore", "current-final-color-only"],
  ["centerPx", "shared-current-and-deferred"],
  ["contributorIndex", "shared-current-and-deferred"],
  ["coverageWeight", "shared-current-and-deferred"],
  ["depthBand", "shared-current-and-deferred"],
  ["inverseConic", "shared-current-and-deferred"],
  ["occlusionWeight", "shared-current-and-deferred"],
  ["opacity", "shared-current-and-deferred"],
  ["originalId", "shared-current-and-deferred"],
  ["retentionWeight", "shared-current-and-deferred"],
  ["splatIndex", "shared-current-and-deferred"],
  ["tileIndex", "shared-current-and-deferred"],
  ["viewDepth", "shared-current-and-deferred"],
  ["viewRank", "shared-current-and-deferred"],
  ["albedoConfidence", "future-deferred-surface-input"],
  ["deferredSurface", "future-deferred-surface-input"],
  ["gbufferVoteWeight", "future-deferred-surface-input"],
  ["materialConfidence", "future-deferred-surface-input"],
  ["meshPrimitiveId", "future-deferred-surface-input"],
  ["normalConfidence", "future-deferred-surface-input"],
  ["surfaceId", "future-deferred-surface-input"],
  ["surfaceKind", "future-deferred-surface-input"],
]);

export const TILE_LOCAL_CONTRIBUTOR_ARENA_CONTRACT = deepFreeze({
  version: 1,
  tileHeader: {
    uint32Stride: 6,
    float32Stride: 2,
    fields: [
      field("contributorOffset", "u32", "Index of the first retained contributor record for this tile."),
      field("retainedContributorCount", "u32", "Retained records available to the current consumer."),
      field("projectedContributorCount", "u32", "All projected contributors before tile-local retention and caps."),
      field("droppedContributorCount", "u32", "Projected contributors not retained for this tile."),
      field("overflowFlags", "u32", "Bitset of overflow/drop reasons observed while building the tile arena."),
      field("maxRetainedViewRank", "u32", "Largest retained back-to-front rank; exposes whether deep contributors survived."),
      field("minRetainedDepth", "f32", "Nearest retained contributor depth in the active view convention."),
      field("maxRetainedDepth", "f32", "Farthest retained contributor depth in the active view convention."),
    ],
  },
  contributorRecord: {
    uint32Stride: 5,
    float32Stride: 14,
    fields: [
      field("splatIndex", "u32", "Dense source splat index used by current renderer buffers."),
      field("originalId", "u32", "Stable source-file identity for diagnostics and cross-path parity."),
      field("tileIndex", "u32", "Owning tile index for local consumers and diagnostics."),
      field("contributorIndex", "u32", "Arena record index after retention; stable inside one built arena."),
      field("viewRank", "u32", "Back-to-front order rank consumed by the current visible compositor."),
      field("viewDepth", "f32", "View-space or NDC-compatible depth evidence used to rebuild/order records."),
      field("depthBand", "f32", "Quantized or normalized depth band for overflow diagnostics and future voting."),
      field("coverageWeight", "f32", "Projected Gaussian support weight; not normalized away before alpha/deferred use."),
      field("centerPx", "vec2f", "Projected center in framebuffer pixels."),
      field("inverseConic", "vec3f", "Packed inverse conic A, B, C for Mahalanobis coverage evaluation."),
      field("opacity", "f32", "Activated source opacity before coverage transfer."),
      field("coverageAlpha", "f32", "Current final-color coverage/opacity transfer result."),
      field("transmittanceBefore", "f32", "Current final-color running transmission before this record."),
      field("retentionWeight", "f32", "Retention/admission score; diagnostic only after construction."),
      field("occlusionWeight", "f32", "Foreground opacity pressure used by retention and diagnostics."),
      field("deferredSurface", "struct", "Future splat/mesh surface vote evidence; absent in current final-color path."),
    ],
  },
  overflow: {
    bitAssignments: [
      overflow("none", 0, "No contributors were dropped for this tile."),
      overflow("perTileRetainedCap", 1, "The tile had more projected contributors than the retained arena budget."),
      overflow("globalProjectedBudget", 2, "The frame-level projected-ref guard stopped arena construction."),
      overflow("invalidProjection", 4, "A source contributor could not be projected to a finite tile footprint."),
      overflow("nearPlaneSupport", 8, "A source contributor was rejected because support crosses the near plane."),
      overflow("nonFiniteCoverage", 16, "Coverage/conic math produced non-finite evidence."),
    ],
  },
  fieldUse: Object.fromEntries(FIELD_USE),
  legacyCompatibility: {
    tileHeaders: "offset/count projection only",
    tileRefs: "splat/original/tile/ref index projection only",
    tileCoverageWeights: "coverageWeight projection only",
    tileRefShapeParams: "centerPx/inverseConic projection only",
  },
});

export function classifyTileLocalContributorFieldUse(fieldName) {
  return FIELD_USE.get(fieldName) ?? "unknown";
}

export function summarizeTileLocalContributorArenaContract(contract = TILE_LOCAL_CONTRIBUTOR_ARENA_CONTRACT) {
  return {
    version: contract.version,
    headerFields: contract.tileHeader.fields.map((fieldDefinition) => fieldDefinition.name),
    recordFields: contract.contributorRecord.fields.map((fieldDefinition) => fieldDefinition.name),
    overflowReasons: contract.overflow.bitAssignments.map((assignment) => assignment.reason),
    legacyCompatibility: contract.legacyCompatibility,
  };
}

export function validateTileLocalContributorArenaContract(contract = TILE_LOCAL_CONTRIBUTOR_ARENA_CONTRACT) {
  const problems = [];
  assertRequiredNames(problems, "tileHeader.fields", contract.tileHeader?.fields, REQUIRED_HEADER_FIELDS);
  assertRequiredNames(problems, "contributorRecord.fields", contract.contributorRecord?.fields, REQUIRED_RECORD_FIELDS);
  assertRequiredNames(problems, "overflow.bitAssignments", contract.overflow?.bitAssignments, REQUIRED_OVERFLOW_REASONS, "reason");
  assertUniqueNames(problems, "tileHeader.fields", contract.tileHeader?.fields);
  assertUniqueNames(problems, "contributorRecord.fields", contract.contributorRecord?.fields);
  assertUniqueNames(problems, "overflow.bitAssignments", contract.overflow?.bitAssignments, "reason");
  return problems;
}

function assertRequiredNames(problems, path, values, requiredNames, key = "name") {
  const names = new Set(Array.isArray(values) ? values.map((value) => value?.[key]) : []);
  for (const requiredName of requiredNames) {
    if (!names.has(requiredName)) {
      problems.push(`${path} missing required field ${requiredName}`);
    }
  }
}

function assertUniqueNames(problems, path, values, key = "name") {
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const name = value?.[key];
    if (!name) {
      problems.push(`${path} contains unnamed entry`);
      continue;
    }
    if (seen.has(name)) {
      problems.push(`${path} contains duplicate entry ${name}`);
    }
    seen.add(name);
  }
}

function field(name, type, description) {
  return { name, type, description };
}

function overflow(reason, bit, description) {
  return { reason, bit, description };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return value;
}
