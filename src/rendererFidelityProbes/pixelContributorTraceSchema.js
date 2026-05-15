const TRACE_RECORD_FIELDS = [
  "schemaVersion",
  "anchorPixel",
  "tileAddress",
  "projectedContributors",
  "retainedContributors",
  "orderedContributors",
  "finalColorAccumulation",
  "dispatchCache",
  "rendererMetadata",
  "deferredFields",
];

const CONTRIBUTOR_IDENTITY_FIELDS = ["splatIndex", "originalId"];

const CANONICAL_ANCHOR_PIXELS = [
  anchorPixel(
    "lacunar-hole-dessert-1260-930",
    "lacunar-hole",
    1260,
    930,
    "Dessert close-view hole where same-pixel projection, retention, order, and accumulation are missing.",
  ),
  anchorPixel(
    "dense-foreground-leak-1580-1260",
    "dense-foreground-leak",
    1580,
    1260,
    "Dense foreground leak where alpha/conic/retention causes must be separated by contributor identity.",
  ),
  anchorPixel(
    "black-band-dropout-2300-1055",
    "black-band-dropout",
    2300,
    1055,
    "Horizontal band/dropout pixel with known tile address at tileSizePx=16.",
    { tileX: 143, tileY: 65, tileIndex: 14183, localX: 12, localY: 15 },
  ),
];

const CONTRIBUTOR_LISTS = deepFreeze({
  projectedContributors: {
    requiredFields: [
      ...CONTRIBUTOR_IDENTITY_FIELDS,
      "projectionStatus",
      "centerPx",
      "footprintPx",
      "coverageWeight",
      "inverseConic",
      "viewDepth",
      "opacity",
    ],
    purpose: "Pixel-local geometric support before retention or ordering.",
  },
  retainedContributors: {
    requiredFields: [
      ...CONTRIBUTOR_IDENTITY_FIELDS,
      "retentionStatus",
      "retentionWeight",
      "occlusionWeight",
      "overflowReason",
      "retentionBand",
    ],
    purpose: "Survival/drop evidence after tile-local retention under cap pressure.",
  },
  orderedContributors: {
    requiredFields: [
      ...CONTRIBUTOR_IDENTITY_FIELDS,
      "orderIndex",
      "viewRank",
      "viewDepth",
      "tieBreakKey",
      "orderBackend",
    ],
    purpose: "Per-pixel accumulation order and tie identity after retention.",
  },
  "finalColorAccumulation.steps": {
    requiredFields: [
      ...CONTRIBUTOR_IDENTITY_FIELDS,
      "orderIndex",
      "coverageWeight",
      "opacity",
      "coverageAlpha",
      "transmittanceBefore",
      "transmittanceAfter",
      "sourceColor",
      "contributionColor",
      "runningColor",
    ],
    purpose: "Final-color transfer ledger for contributors that entered accumulation.",
  },
});

export const PIXEL_CONTRIBUTOR_TRACE_SCHEMA = deepFreeze({
  schemaVersion: 1,
  traceRecord: {
    fields: TRACE_RECORD_FIELDS.map((name) => field(name)),
    requiredFields: TRACE_RECORD_FIELDS,
  },
  anchors: CANONICAL_ANCHOR_PIXELS,
  tileAddress: {
    requiredFields: ["tileSizePx", "tileX", "tileY", "tileIndex", "localX", "localY"],
    compatibility: "Derived for the record's current viewport/tile grid; anchor IDs do not redefine renderer camera state.",
  },
  contributorLists: CONTRIBUTOR_LISTS,
  dispatchCache: {
    requiredFields: ["tileIndex", "clearFrameId", "buildFrameId", "compositeFrameId"],
    optionalFields: ["tileY", "tileSpan", "cacheState", "presentationFrameId", "rowDispatchState"],
  },
  rendererMetadata: {
    requiredFields: ["requestedRenderer", "effectiveRenderer"],
    optionalFields: [
      "requestedArenaBackend",
      "effectiveArenaBackend",
      "asset",
      "witnessView",
      "tileSizePx",
      "maxRefsPerTile",
      "viewport",
      "branch",
      "commit",
    ],
  },
  deferredFields: {
    requiredFields: ["preserved"],
    preservedFieldNames: [
      "deferredSurface",
      "normalSum",
      "albedoSum",
      "matSum",
      "weightSum",
      "provisionalDepth",
      "confidence",
      "lossEvidence",
    ],
  },
  compatibilityRules: [
    "Frame-level projected/retained/dropped counts are metadata only and never substitute for pixel-local contributor lists.",
    "Every contributor carried through a trace list must retain splatIndex and originalId.",
    "Missing instrumentation is represented by an explicit empty list plus blocker metadata, not by omitting the field.",
    "Trace producers must preserve backend labels and deferred-field payloads even when the current renderer ignores them.",
    "Trace schema changes require a schemaVersion increment or a backward-compatible optional field.",
  ],
});

export function summarizePixelContributorTraceSchema(schema = PIXEL_CONTRIBUTOR_TRACE_SCHEMA) {
  return {
    version: schema.schemaVersion,
    traceRecordFields: schema.traceRecord.requiredFields,
    anchorPixelIds: schema.anchors.map((anchor) => anchor.id),
    contributorIdentityFields: Object.fromEntries(
      Object.entries(schema.contributorLists).map(([listName, list]) => [
        listName,
        list.requiredFields.filter((fieldName) => CONTRIBUTOR_IDENTITY_FIELDS.includes(fieldName)),
      ]),
    ),
    tileAddressFields: schema.tileAddress.requiredFields,
    dispatchCacheFields: schema.dispatchCache.requiredFields,
    rendererMetadataFields: schema.rendererMetadata.requiredFields,
    deferredFields: schema.deferredFields.preservedFieldNames,
    compatibilityRules: schema.compatibilityRules,
  };
}

export function validatePixelContributorTraceSchema(schema = PIXEL_CONTRIBUTOR_TRACE_SCHEMA) {
  const problems = [];
  assertRequiredNames(problems, "traceRecord.fields", schema.traceRecord?.fields, TRACE_RECORD_FIELDS);
  assertUniqueNames(problems, "traceRecord.fields", schema.traceRecord?.fields);
  assertRequiredValues(problems, "anchors", schema.anchors?.map((anchor) => anchor?.id), CANONICAL_ANCHOR_PIXELS.map((anchor) => anchor.id));
  for (const [listName, list] of Object.entries(schema.contributorLists ?? {})) {
    assertRequiredValues(problems, `contributorLists.${listName}.requiredFields`, list.requiredFields, CONTRIBUTOR_IDENTITY_FIELDS);
  }
  return problems;
}

export function validatePixelContributorTraceRecord(record, schema = PIXEL_CONTRIBUTOR_TRACE_SCHEMA) {
  const problems = [];
  for (const fieldName of schema.traceRecord.requiredFields) {
    if (!(fieldName in (record ?? {}))) {
      problems.push(`traceRecord missing required field ${fieldName}`);
    }
  }
  if (problems.length > 0) return problems;

  validateAnchorPixel(problems, record.anchorPixel, schema);
  assertIntegerFields(problems, "tileAddress", record.tileAddress, schema.tileAddress.requiredFields);

  validateContributorList(problems, "projectedContributors", record.projectedContributors, CONTRIBUTOR_IDENTITY_FIELDS);
  validateContributorList(problems, "retainedContributors", record.retainedContributors, CONTRIBUTOR_IDENTITY_FIELDS);
  validateContributorList(problems, "orderedContributors", record.orderedContributors, CONTRIBUTOR_IDENTITY_FIELDS);
  validateContributorList(
    problems,
    "finalColorAccumulation.steps",
    record.finalColorAccumulation?.steps,
    CONTRIBUTOR_IDENTITY_FIELDS,
  );

  if (!Array.isArray(record.finalColorAccumulation?.outputColor) || record.finalColorAccumulation.outputColor.length !== 4) {
    problems.push("finalColorAccumulation.outputColor must be an rgba array");
  }
  assertRequiredObjectFields(problems, "dispatchCache", record.dispatchCache, schema.dispatchCache.requiredFields);
  assertRequiredObjectFields(problems, "rendererMetadata", record.rendererMetadata, schema.rendererMetadata.requiredFields);
  assertRequiredObjectFields(problems, "deferredFields", record.deferredFields, schema.deferredFields.requiredFields);
  return problems;
}

function validateAnchorPixel(problems, anchor, schema) {
  const known = schema.anchors.find((candidate) => candidate.id === anchor?.id);
  if (!known) {
    problems.push(`anchorPixel.id is not canonical: ${anchor?.id ?? "<missing>"}`);
    return;
  }
  for (const fieldName of ["x", "y"]) {
    if (anchor[fieldName] !== known[fieldName]) {
      problems.push(`anchorPixel.${fieldName} must match canonical ${known[fieldName]}`);
    }
  }
}

function validateContributorList(problems, path, values, requiredFields) {
  if (!Array.isArray(values)) {
    problems.push(`${path} must be an array`);
    return;
  }
  values.forEach((value, index) => {
    for (const fieldName of requiredFields) {
      if (!(fieldName in (value ?? {}))) {
        problems.push(`${path}[${index}] missing required field ${fieldName}`);
      }
    }
  });
}

function assertRequiredObjectFields(problems, path, value, requiredFields) {
  for (const fieldName of requiredFields) {
    if (!(fieldName in (value ?? {}))) {
      problems.push(`${path} missing required field ${fieldName}`);
    }
  }
}

function assertIntegerFields(problems, path, value, requiredFields) {
  for (const fieldName of requiredFields) {
    if (!Number.isInteger(value?.[fieldName])) {
      problems.push(`${path}.${fieldName} must be an integer`);
    }
  }
}

function assertRequiredNames(problems, path, values, requiredNames, key = "name") {
  const names = new Set(Array.isArray(values) ? values.map((value) => value?.[key]) : []);
  assertRequiredValues(problems, path, names, requiredNames);
}

function assertRequiredValues(problems, path, values, requiredNames) {
  const names = values instanceof Set ? values : new Set(Array.isArray(values) ? values : []);
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

function anchorPixel(id, kind, x, y, description, canonicalTileAddress = null) {
  return { id, kind, x, y, description, canonicalTileAddress };
}

function field(name) {
  return { name };
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
