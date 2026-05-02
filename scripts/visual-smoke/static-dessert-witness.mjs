export const STATIC_DESSERT_WITNESS_CAPTURE_IDS = {
  finalColor: "final-color",
  coverageWeight: "coverage-weight",
  accumulatedAlpha: "accumulated-alpha",
  transmittance: "transmittance",
  tileRefCount: "tile-ref-count",
  conicShape: "conic-shape",
};

const REQUIRED_CAPTURE_IDS = new Set(Object.values(STATIC_DESSERT_WITNESS_CAPTURE_IDS));
const DEBUG_CAPTURE_IDS = new Set([
  STATIC_DESSERT_WITNESS_CAPTURE_IDS.coverageWeight,
  STATIC_DESSERT_WITNESS_CAPTURE_IDS.accumulatedAlpha,
  STATIC_DESSERT_WITNESS_CAPTURE_IDS.transmittance,
  STATIC_DESSERT_WITNESS_CAPTURE_IDS.tileRefCount,
  STATIC_DESSERT_WITNESS_CAPTURE_IDS.conicShape,
]);

export function buildStaticDessertWitnessPlan(baseUrl) {
  return [
    finalColorCapture(baseUrl),
    debugCapture(baseUrl, STATIC_DESSERT_WITNESS_CAPTURE_IDS.coverageWeight, "Coverage weight heatmap"),
    debugCapture(baseUrl, STATIC_DESSERT_WITNESS_CAPTURE_IDS.accumulatedAlpha, "Accumulated alpha heatmap"),
    debugCapture(baseUrl, STATIC_DESSERT_WITNESS_CAPTURE_IDS.transmittance, "Transmittance heatmap"),
    debugCapture(baseUrl, STATIC_DESSERT_WITNESS_CAPTURE_IDS.tileRefCount, "Tile-ref density heatmap"),
    debugCapture(baseUrl, STATIC_DESSERT_WITNESS_CAPTURE_IDS.conicShape, "Conic major/minor shape heatmap"),
  ];
}

export function classifyStaticDessertWitness({ captures = [] } = {}) {
  const byId = new Map(captures.map((capture) => [capture.id, capture]));
  const findings = [];

  for (const id of REQUIRED_CAPTURE_IDS) {
    const capture = byId.get(id);
    if (!capture) {
      findings.push(finding("missing-capture", `Missing ${id} static dessert witness capture.`));
      continue;
    }
    if (!capture.classification?.harnessPassed) {
      findings.push(finding("capture-smoke-failed", `${id} did not pass visual smoke classification.`));
    }
    if (!capture.classification?.realSplatEvidence) {
      findings.push(finding("missing-real-splat-evidence", `${id} did not report real Scaniverse splat evidence.`));
    }
  }

  const finalColor = byId.get(STATIC_DESSERT_WITNESS_CAPTURE_IDS.finalColor);
  if (finalColor && !rendererLabel(finalColor).includes("tile-local-visible")) {
    findings.push(
      finding(
        "final-color-label-mismatch",
        `Final-color capture reported renderer label ${rendererLabel(finalColor) || "missing"}.`
      )
    );
  }

  for (const id of DEBUG_CAPTURE_IDS) {
    const capture = byId.get(id);
    if (!capture) continue;
    const expected = `tile-local-visible-debug-${id}`;
    if (!rendererLabel(capture).includes(expected)) {
      findings.push(
        finding(
          "debug-label-mismatch",
          `${id} reported renderer label ${rendererLabel(capture) || "missing"} instead of ${expected}.`
        )
      );
    }
    if (tileRefs(capture) <= 0) {
      findings.push(finding("missing-tile-refs", `${id} did not report positive retained tile refs.`));
    }
    if (!diagnostics(capture)) {
      findings.push(finding("missing-compact-diagnostics", `${id} did not expose compact tile-local diagnostics.`));
    }
  }

  const assets = unique(captures.map((capture) => stringValue(capture.pageEvidence?.assetPath)).filter(Boolean));
  if (assets.length !== 1) {
    findings.push(finding("asset-mismatch", `Static witness captures reported ${assets.length || "no"} asset paths.`));
  }

  const viewports = unique(captures.map((capture) => viewportKey(capture)).filter(Boolean));
  if (viewports.length !== 1) {
    findings.push(finding("viewport-mismatch", `Static witness captures reported ${viewports.length || "no"} viewport sizes.`));
  }

  const tileGrids = unique(captures.map((capture) => tileGridKey(capture)).filter(Boolean));
  if (tileGrids.length !== 1) {
    findings.push(finding("tile-grid-mismatch", `Static witness captures reported ${tileGrids.length || "no"} tile grids.`));
  }

  const alphaDiagnostics = diagnostics(byId.get(STATIC_DESSERT_WITNESS_CAPTURE_IDS.accumulatedAlpha));
  const transmittanceDiagnostics = diagnostics(byId.get(STATIC_DESSERT_WITNESS_CAPTURE_IDS.transmittance));
  const refDiagnostics = diagnostics(byId.get(STATIC_DESSERT_WITNESS_CAPTURE_IDS.tileRefCount));
  const conicDiagnostics = diagnostics(byId.get(STATIC_DESSERT_WITNESS_CAPTURE_IDS.conicShape));

  if (!positiveNumber(alphaDiagnostics?.alpha?.estimatedMaxAccumulatedAlpha)) {
    findings.push(finding("missing-alpha-range", "Accumulated-alpha capture did not report positive accumulated alpha."));
  }
  if (finiteNumber(transmittanceDiagnostics?.alpha?.estimatedMinTransmittance) === undefined) {
    findings.push(finding("missing-transmittance-range", "Transmittance capture did not report remaining transmittance."));
  }
  if (!positiveNumber(refDiagnostics?.tileRefs?.total) || !positiveNumber(refDiagnostics?.tileRefs?.maxPerTile)) {
    findings.push(finding("missing-ref-density", "Tile-ref capture did not report total refs and max refs per tile."));
  }
  if (!positiveNumber(conicDiagnostics?.conicShape?.maxMajorRadiusPx)) {
    findings.push(finding("missing-conic-shape", "Conic-shape capture did not report major/minor conic shape evidence."));
  }

  const closeable = findings.length === 0;
  const observations = staticDessertObservations();
  return {
    closeable,
    summary: {
      status: closeable ? "PASS" : "FAIL",
      text: closeable
        ? "PASS: static dessert final color and debug witnesses share one asset, viewport, tile grid, and artifact movement labels."
        : `FAIL: ${findings[0]?.summary ?? "static dessert witness criteria were not satisfied"}`,
    },
    metrics: {
      fixedView: {
        assetPath: assets[0] ?? "",
        viewport: viewports[0] ?? "",
        tileGrid: tileGrids[0] ?? "",
      },
      tileRefs: {
        total: finiteNumber(refDiagnostics?.tileRefs?.total) ?? 0,
        maxPerTile: finiteNumber(refDiagnostics?.tileRefs?.maxPerTile) ?? 0,
        nonEmptyTiles: finiteNumber(refDiagnostics?.tileRefs?.nonEmptyTiles) ?? 0,
      },
      tileRefCustody: normalizeTileRefCustody(refDiagnostics?.tileRefCustody, refDiagnostics?.tileRefs),
      retentionAudit: normalizeRetentionAudit(refDiagnostics?.retentionAudit),
      alpha: {
        estimatedMaxAccumulatedAlpha: finiteNumber(alphaDiagnostics?.alpha?.estimatedMaxAccumulatedAlpha) ?? 0,
        estimatedMinTransmittance: finiteNumber(transmittanceDiagnostics?.alpha?.estimatedMinTransmittance) ?? 0,
      },
      conicShape: {
        maxMajorRadiusPx: finiteNumber(conicDiagnostics?.conicShape?.maxMajorRadiusPx) ?? 0,
        minMinorRadiusPx: finiteNumber(conicDiagnostics?.conicShape?.minMinorRadiusPx) ?? 0,
        maxAnisotropy:
          finiteNumber(conicDiagnostics?.conicShape?.maxAnisotropyRatio) ??
          finiteNumber(conicDiagnostics?.conicShape?.maxAnisotropy) ??
          0,
      },
    },
    observations,
    findings,
  };
}

function finalColorCapture(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set("renderer", "tile-local-visible");
  url.searchParams.delete("tileDebug");
  url.searchParams.delete("debug");
  return {
    id: STATIC_DESSERT_WITNESS_CAPTURE_IDS.finalColor,
    title: "Final color tile-local visible compositor",
    expectedRendererLabel: "tile-local-visible",
    url: url.toString().replaceAll("%2F", "/"),
  };
}

function debugCapture(baseUrl, id, title) {
  const url = new URL(baseUrl);
  url.searchParams.set("renderer", "tile-local-visible");
  url.searchParams.set("tileDebug", id);
  return {
    id,
    title,
    expectedRendererLabel: `tile-local-visible-debug-${id}`,
    url: url.toString().replaceAll("%2F", "/"),
  };
}

function staticDessertObservations() {
  const thresholdPolicy = "regression/no-change/improvement labels are witness-only and do not close renderer fidelity";
  return {
    visibleHoles: {
      status: "captured-for-review",
      movement: artifactMovement("no-change", thresholdPolicy),
      evidenceIds: [
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.finalColor,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.coverageWeight,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.conicShape,
      ],
      boundary: "Porous/non-square final-color gaps are witnessed separately from tile-ref density and alpha transfer.",
    },
    plateSeepage: {
      status: "captured-for-review",
      movement: artifactMovement("no-change", thresholdPolicy),
      evidenceIds: [
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.finalColor,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.accumulatedAlpha,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.transmittance,
      ],
      boundary: "Plate/background seepage is witnessed through final color plus alpha/transmittance debug modes, not by opacity tuning.",
    },
    nearPlaneObstruction: {
      status: "not-measured-in-fixed-dessert",
      movement: artifactMovement("not-measured", thresholdPolicy),
      evidenceIds: [],
      boundary: "Dense real-scene near-plane obstruction requires a separate real-scene witness capture and must not be inferred from the fixed dessert view.",
    },
    budgetSkip: {
      status: "separate-high-viewport-observation",
      evidenceIds: [],
      boundary: "High-viewport stale/cached-frame skips are not collapsed into the fixed 1280x720 final-color artifact.",
      repro: "Run the same smoke URL at a high viewport such as 3456x1916 and capture overlay text containing `tile-local skipped: projected tile refs exceed budget`.",
    },
  };
}

function artifactMovement(status, thresholdPolicy) {
  return {
    status,
    thresholdPolicy,
  };
}

function diagnostics(capture = {}) {
  return capture.pageEvidence?.tileLocal?.diagnostics ?? capture.pageEvidence?.tileLocalDiagnostics;
}

function rendererLabel(capture = {}) {
  return String(capture.pageEvidence?.rendererLabel ?? "").trim();
}

function tileRefs(capture = {}) {
  return finiteNumber(capture.pageEvidence?.tileLocal?.refs) ?? 0;
}

function normalizeTileRefCustody(tileRefCustody, tileRefs = {}) {
  if (tileRefCustody && typeof tileRefCustody === "object") {
    return {
      projectedTileEntryCount: finiteNumber(tileRefCustody.projectedTileEntryCount) ?? 0,
      retainedTileEntryCount: finiteNumber(tileRefCustody.retainedTileEntryCount) ?? 0,
      evictedTileEntryCount: finiteNumber(tileRefCustody.evictedTileEntryCount) ?? 0,
      cappedTileCount: finiteNumber(tileRefCustody.cappedTileCount) ?? 0,
      saturatedRetainedTileCount: finiteNumber(tileRefCustody.saturatedRetainedTileCount) ?? 0,
      maxProjectedRefsPerTile: finiteNumber(tileRefCustody.maxProjectedRefsPerTile) ?? 0,
      maxRetainedRefsPerTile: finiteNumber(tileRefCustody.maxRetainedRefsPerTile) ?? 0,
      headerRefCount: finiteNumber(tileRefCustody.headerRefCount) ?? 0,
      headerAccountingMatches: tileRefCustody.headerAccountingMatches === true,
    };
  }
  const total = finiteNumber(tileRefs.total) ?? 0;
  const maxPerTile = finiteNumber(tileRefs.maxPerTile) ?? 0;
  return {
    projectedTileEntryCount: total,
    retainedTileEntryCount: total,
    evictedTileEntryCount: 0,
    cappedTileCount: 0,
    saturatedRetainedTileCount: 0,
    maxProjectedRefsPerTile: maxPerTile,
    maxRetainedRefsPerTile: maxPerTile,
    headerRefCount: total,
    headerAccountingMatches: true,
  };
}

function normalizeRetentionAudit(retentionAudit) {
  if (!retentionAudit || typeof retentionAudit !== "object") {
    return {
      fullFrame: normalizeRetentionAuditSummary(),
      regions: { centerLeakBand: normalizeRetentionAuditSummary() },
    };
  }
  return {
    fullFrame: normalizeRetentionAuditSummary(retentionAudit.fullFrame),
    regions: {
      centerLeakBand: normalizeRetentionAuditSummary(retentionAudit.regions?.centerLeakBand),
    },
  };
}

function normalizeRetentionAuditSummary(summary = {}) {
  return {
    region: stringValue(summary.region),
    tileCount: finiteNumber(summary.tileCount) ?? 0,
    cappedTileCount: finiteNumber(summary.cappedTileCount) ?? 0,
    projectedTileEntryCount: finiteNumber(summary.projectedTileEntryCount) ?? 0,
    currentRetainedEntryCount: finiteNumber(summary.currentRetainedEntryCount) ?? 0,
    legacyRetainedEntryCount: finiteNumber(summary.legacyRetainedEntryCount) ?? 0,
    addedByPolicyCount: finiteNumber(summary.addedByPolicyCount) ?? 0,
    droppedByPolicyCount: finiteNumber(summary.droppedByPolicyCount) ?? 0,
    addedRetentionWeightSum: finiteNumber(summary.addedRetentionWeightSum) ?? 0,
    droppedRetentionWeightSum: finiteNumber(summary.droppedRetentionWeightSum) ?? 0,
    addedOcclusionWeightSum: finiteNumber(summary.addedOcclusionWeightSum) ?? 0,
    droppedOcclusionWeightSum: finiteNumber(summary.droppedOcclusionWeightSum) ?? 0,
    addedByPolicySamples: Array.isArray(summary.addedByPolicySamples) ? summary.addedByPolicySamples.slice(0, 12) : [],
    droppedByPolicySamples: Array.isArray(summary.droppedByPolicySamples) ? summary.droppedByPolicySamples.slice(0, 12) : [],
  };
}

function viewportKey(capture = {}) {
  const canvas = capture.pageEvidence?.canvas ?? {};
  const width = finiteNumber(canvas.width);
  const height = finiteNumber(canvas.height);
  return width && height ? `${width}x${height}` : "";
}

function tileGridKey(capture = {}) {
  const tileLocal = capture.pageEvidence?.tileLocal ?? {};
  const columns = finiteNumber(tileLocal.tileColumns);
  const rows = finiteNumber(tileLocal.tileRows);
  return columns && rows ? `${columns}x${rows}` : "";
}

function finding(kind, summary) {
  return { kind, summary };
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function unique(values) {
  return [...new Set(values)];
}

function positiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
