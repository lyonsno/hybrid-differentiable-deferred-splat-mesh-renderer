import { classifyDenseFrontOcclusionWitness } from "./denseFrontOcclusionWitness.js";

const STATIC_CANNOT_RULE_OUT = Object.freeze([
  "pixel-local coverage holes",
  "pixel-local tile-ref loss",
  "ordered alpha under-accumulation at seepage pixels",
]);

export function describeAlphaSeepageLedgerContract() {
  return {
    consumes: [
      "static-dessert-witness:alpha-transmittance-debug-captures",
      "dense-front-occlusion-witness:ordered-optical-depth-reference",
      "tile-local-visible:retained-foreground-refs",
      "tile-local-visible:conic-pixel-coverage",
    ],
    categories: [
      "alpha-under-accumulation",
      "coverage-underfill",
      "tile-list-loss",
      "ordering-or-other",
      "no-seepage",
    ],
    forbiddenFixes: [
      "conic-geometry",
      "tile-candidate-retention",
      "global-opacity-or-brightness",
      "source-decoding",
      "camera-controls",
      "sh-view-dependent-color",
      "gpu-tile-list-construction",
    ],
  };
}

export function summarizeStaticAlphaEvidence(analysis) {
  if (!analysis || typeof analysis !== "object") {
    throw new TypeError("static witness analysis must be an object");
  }
  if (!Array.isArray(analysis.captures)) {
    throw new TypeError("static witness analysis captures must be an array");
  }

  const finalColor = findCapture(analysis.captures, "final-color");
  const accumulatedAlpha = findCapture(analysis.captures, "accumulated-alpha");
  const transmittance = findCapture(analysis.captures, "transmittance");
  const tileRefCount = findCapture(analysis.captures, "tile-ref-count");
  const diagnostics = finalColor.pageEvidence?.tileLocalDiagnostics ?? finalColor.pageEvidence?.tileLocal?.diagnostics;
  if (!diagnostics) {
    throw new TypeError("static witness final-color capture is missing tile-local diagnostics");
  }

  const pageEvidence = finalColor.pageEvidence ?? {};
  const tileRefs = diagnostics.tileRefs ?? {};
  const alpha = diagnostics.alpha ?? {};
  const tileGrid = diagnostics.tileGrid ?? {};
  const debugCaptures = [finalColor, accumulatedAlpha, transmittance, tileRefCount];
  const debugCaptureIds = debugCaptures.map((capture) => capture.id);
  const allDebugCapturesReady = debugCaptures.every((capture) => capture.pageEvidence?.ready === true);
  const noSkipReason = debugCaptures.every((capture) => !capture.pageEvidence?.tileLocalLastSkipReason);
  const noStaleLabel = debugCaptures.every((capture) => !String(capture.pageEvidence?.rendererLabel ?? "").includes("stale-cache"));

  return {
    status: "static-alpha-debug-evidence",
    assetPath: pageEvidence.assetPath ?? null,
    viewport: {
      width: analysis.options?.viewport?.width ?? null,
      height: analysis.options?.viewport?.height ?? null,
    },
    debugCaptureIds,
    tileGrid: {
      columns: readFiniteNumber(tileGrid.columns, "tileGrid.columns"),
      rows: readFiniteNumber(tileGrid.rows, "tileGrid.rows"),
      tileSizePx: readFiniteNumber(tileGrid.tileSizePx, "tileGrid.tileSizePx"),
    },
    tileRefs: {
      total: readFiniteNumber(tileRefs.total, "tileRefs.total"),
      maxPerTile: readFiniteNumber(tileRefs.maxPerTile, "tileRefs.maxPerTile"),
      nonEmptyTiles: readFiniteNumber(tileRefs.nonEmptyTiles, "tileRefs.nonEmptyTiles"),
      density: readFiniteNumber(tileRefs.density, "tileRefs.density"),
    },
    alpha: {
      estimatedMaxAccumulatedAlpha: readFiniteNumber(alpha.estimatedMaxAccumulatedAlpha, "alpha.estimatedMaxAccumulatedAlpha"),
      estimatedMinTransmittance: readFiniteNumber(alpha.estimatedMinTransmittance, "alpha.estimatedMinTransmittance"),
      alphaParamRefs: readFiniteNumber(alpha.alphaParamRefs, "alpha.alphaParamRefs"),
    },
    rulesOut: {
      staleBudgetSkip: allDebugCapturesReady && noSkipReason && noStaleLabel && tileRefs.total > 0,
      globalAlphaAbsence: alpha.alphaParamRefs > 0 && alpha.estimatedMaxAccumulatedAlpha > 0,
    },
    cannotRuleOut: [...STATIC_CANNOT_RULE_OUT],
  };
}

export function classifyAlphaSeepageLedger(options = {}) {
  const witness = classifyDenseFrontOcclusionWitness(options);
  const category = mapDenseFrontCategory(witness.category);
  const seepageDetected = category !== "no-seepage";
  const foregroundObservedToReferenceRatio = witness.coverage.frontObservedToReferenceRatio;
  const missingForegroundRoles = witness.retention.missingForegroundRoles;
  const excludesTileListLoss = category !== "tile-list-loss" && missingForegroundRoles.length === 0;
  const excludesCoverageUnderfill = category !== "coverage-underfill";
  const excludesAlphaUnderAccumulation = category !== "alpha-under-accumulation";

  return {
    tileId: witness.tileId,
    pixelPx: witness.pixelPx,
    status: seepageDetected ? "seepage-detected" : "no-seepage",
    category,
    recommendation: recommendationFor(category),
    evidence: {
      referenceBehindWeight: witness.reference.behindWeight,
      observedBehindWeight: witness.observed.behindWeight,
      observedRemainingTransmission: witness.observed.remainingTransmission,
      foregroundReferenceCoverageWeight: witness.coverage.frontReferenceCoverageWeight,
      foregroundObservedCoverageWeight: witness.coverage.frontObservedCoverageWeight,
      foregroundObservedToReferenceRatio,
      retainedLayerIds: witness.retention.retainedLayerIds,
      missingForegroundRoles,
      presentForegroundRoles: witness.retention.presentForegroundRoles,
      presentBehindRoles: witness.retention.presentBehindRoles,
    },
    excludes: {
      tileListLoss: excludesTileListLoss,
      coverageUnderfill: excludesCoverageUnderfill,
      alphaUnderAccumulation: excludesAlphaUnderAccumulation,
    },
    denseFrontWitness: witness,
  };
}

function mapDenseFrontCategory(category) {
  switch (category) {
    case "alpha-transfer":
      return "alpha-under-accumulation";
    case "no-leak":
      return "no-seepage";
    case "coverage-underfill":
    case "tile-list-loss":
    case "ordering-or-other":
      return category;
    default:
      return "ordering-or-other";
  }
}

function recommendationFor(category) {
  switch (category) {
    case "alpha-under-accumulation":
      return "inspect-ordered-alpha-transfer-with-retained-foreground-and-coverage-present";
    case "coverage-underfill":
      return "handoff-to-conic-coverage-with-alpha-ledger-exclusion";
    case "tile-list-loss":
      return "handoff-to-tile-ref-custody-with-alpha-ledger-exclusion";
    case "ordering-or-other":
      return "capture-ordered-layer-and-alpha-debug-evidence-before-alpha-fix";
    case "no-seepage":
      return "no-alpha-seepage-for-this-witness";
    default:
      return "unclassified-alpha-ledger";
  }
}

function findCapture(captures, id) {
  const capture = captures.find((candidate) => candidate?.id === id);
  if (!capture) {
    throw new TypeError(`static witness capture ${id} is required`);
  }
  return capture;
}

function readFiniteNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`);
  }
  return value;
}
