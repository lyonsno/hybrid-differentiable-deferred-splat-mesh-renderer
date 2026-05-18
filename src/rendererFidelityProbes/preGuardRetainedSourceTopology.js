const CPU_PREPASS_ROUTE_DESCRIPTORS = Object.freeze([
  "project-splat-center",
  "project-splat-covariance",
  "dense-projected-coverage",
  "view-order-projected-entries",
  "gpu-coverage-bridge-retention",
]);

const PROJECTED_COVERAGE_STAGE = "dense-projected-coverage";
const RETAINED_ROWS_STAGE = "gpu-coverage-bridge-retention";
const GUARD_QUANTITY = "dense-projected-tile-refs";
const HANDOFF_QUANTITY = "compact-retained-rows";

export function describeCpuPrepassRetainedSourceTopology({
  bridge,
  maxTileEntries = Number.POSITIVE_INFINITY,
  maxRefsPerTile,
} = {}) {
  const routeDescriptors = [...CPU_PREPASS_ROUTE_DESCRIPTORS];
  const projectedCoverageIndex = routeDescriptors.indexOf(PROJECTED_COVERAGE_STAGE);
  const retainedRowsIndex = routeDescriptors.indexOf(RETAINED_ROWS_STAGE);
  const constructsFullDenseProjectionBeforeRetention =
    projectedCoverageIndex !== -1 &&
    retainedRowsIndex !== -1 &&
    projectedCoverageIndex < retainedRowsIndex;
  const compactRetainedOffsets = hasCompactRetainedOffsets(bridge);

  return {
    route: "cpu-prepass-bridge",
    classification: constructsFullDenseProjectionBeforeRetention
      ? "pre-guard-source-blocked-by-projection-construction"
      : "pre-guard-source-route-observed",
    retainedSourceStage: constructsFullDenseProjectionBeforeRetention
      ? "after-dense-projected-coverage"
      : "before-dense-projected-coverage",
    projectedCoverageStage: PROJECTED_COVERAGE_STAGE,
    retainedRowsStage: RETAINED_ROWS_STAGE,
    guardStage: PROJECTED_COVERAGE_STAGE,
    guardQuantity: GUARD_QUANTITY,
    handoffQuantity: HANDOFF_QUANTITY,
    constructsFullDenseProjectionBeforeRetention,
    traceLawRetainedRows: compactRetainedOffsets,
    compactRetainedOffsets,
    routeDescriptors,
    evidence: {
      projectedTileEntries: nonNegativeInteger(
        bridge?.tileRefCustody?.projectedTileEntryCount,
        bridge?.retainedTileEntryCount,
      ),
      retainedTileEntries: nonNegativeInteger(bridge?.retainedTileEntryCount),
      tileCount: nonNegativeInteger(bridge?.tileCount),
      maxTileEntries,
      maxRefsPerTile: nonNegativeInteger(maxRefsPerTile ?? bridge?.maxRefsPerTile),
    },
  };
}

export function annotateProjectedCoverageTopologyError(error) {
  if (!error || typeof error !== "object") {
    return error;
  }
  error.sourceTopologyStage = PROJECTED_COVERAGE_STAGE;
  error.retainedRowsFormed = false;
  error.guardQuantity = GUARD_QUANTITY;
  error.handoffQuantity = HANDOFF_QUANTITY;
  error.routeDescriptors = CPU_PREPASS_ROUTE_DESCRIPTORS.slice(0, 3);
  return error;
}

function hasCompactRetainedOffsets(bridge) {
  if (!bridge || !bridge.tileHeaders || !bridge.tileRefs) {
    return false;
  }
  const retainedTileEntryCount = nonNegativeInteger(bridge.retainedTileEntryCount);
  if (retainedTileEntryCount === 0) {
    return false;
  }
  for (let refIndex = 0; refIndex < retainedTileEntryCount; refIndex += 1) {
    if (bridge.tileRefs[refIndex * 4 + 3] !== refIndex) {
      return false;
    }
  }
  return true;
}

function nonNegativeInteger(value, fallback = 0) {
  if (Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  return Number.isFinite(fallback) && fallback >= 0 ? Math.floor(fallback) : 0;
}
