const REQUIRED_DEFERRED_FIELDS = Object.freeze([
  "contributorIdentity",
  "sourceColor",
  "materialHooks",
  "observationIdentity",
]);

const VALID_ROUTES = new Set([
  "cpu-prepass-bridge",
  "direct-gpu-live",
  "compact-pre-guard",
]);

export function classifyPreGuardRetainedSource(input = {}) {
  const route = readRoute(input.route);
  const projectedGuard = normalizeProjectedGuard(input.projectedGuard);
  const retainedCapacity = nonNegativeFinite(input.retainedCapacity);
  const missingDeferredFields = missingFields(input.preservedFields);
  const blockers = [];

  if (input.constructsFullDenseProjection === true) {
    blockers.push("full-dense-cpu-projection-before-retention");
  }
  if (input.traceLawRetainedRows !== true) {
    blockers.push("missing-trace-law-retained-rows");
  }
  if (input.compactRetainedOffsets !== true) {
    blockers.push(
      input.directGpuAddressClassification === "dense-index-consumed-as-compact-offset"
        ? "dense-gpu-live-addressing"
        : "missing-compact-retained-offsets",
    );
  }
  if (route === "compact-pre-guard" && input.retentionPolicyProven !== true) {
    blockers.push("retention-policy-unproven");
  }

  const retainedCapacityBelowProjectedGuard =
    retainedCapacity !== null &&
    projectedGuard !== null &&
    retainedCapacity <= projectedGuard.maxProjectedRefs;

  return {
    classification: classify({
      route,
      blockers,
      missingDeferredFields,
    }),
    route,
    guardQuantity: projectedGuard ? "dense-projected-tile-refs" : null,
    handoffQuantity: "compact-retained-rows",
    projectedGuard,
    retainedCapacity,
    retainedCapacityBelowProjectedGuard,
    directGpuAddressClassification:
      typeof input.directGpuAddressClassification === "string"
        ? input.directGpuAddressClassification
        : null,
    missingDeferredFields,
    blockers,
  };
}

function classify({ route, blockers, missingDeferredFields }) {
  if (blockers.includes("full-dense-cpu-projection-before-retention")) {
    return "pre-guard-source-blocked-by-projection-construction";
  }
  if (
    route === "direct-gpu-live" ||
    blockers.includes("missing-trace-law-retained-rows") ||
    blockers.includes("dense-gpu-live-addressing") ||
    blockers.includes("missing-compact-retained-offsets")
  ) {
    return "pre-guard-source-not-lawful";
  }
  if (blockers.includes("retention-policy-unproven")) {
    return "pre-guard-source-blocked-by-retention-policy";
  }
  if (missingDeferredFields.length > 0) {
    return "pre-guard-source-blocked-by-deferred-fields";
  }
  return "pre-guard-source-candidate";
}

function readRoute(route) {
  if (!VALID_ROUTES.has(route)) {
    throw new Error(`pre-guard retained source route must be one of ${[...VALID_ROUTES].join(", ")}`);
  }
  return route;
}

function normalizeProjectedGuard(guard) {
  if (!guard || typeof guard !== "object") {
    return null;
  }
  return {
    projectedRefs: nonNegativeInteger(guard.projectedRefs, "projectedGuard.projectedRefs"),
    maxProjectedRefs: nonNegativeInteger(guard.maxProjectedRefs, "projectedGuard.maxProjectedRefs"),
  };
}

function missingFields(fields) {
  return REQUIRED_DEFERRED_FIELDS.filter((field) => fields?.[field] !== true);
}

function nonNegativeFinite(value) {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}
