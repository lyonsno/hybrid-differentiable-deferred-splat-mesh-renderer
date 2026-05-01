export const TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS = {
  coverageWeight: "coverage-weight",
  accumulatedAlpha: "accumulated-alpha",
  transmittance: "transmittance",
  tileRefCount: "tile-ref-count",
  conicShape: "conic-shape",
};

const REQUIRED_DIAGNOSTIC_IDS = new Set([
  TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS.accumulatedAlpha,
  TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS.transmittance,
  TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS.tileRefCount,
]);

export function buildTileLocalDiagnosticPlan(baseUrl) {
  return [
    diagnosticCapture(baseUrl, TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS.coverageWeight, "Coverage weight heatmap"),
    diagnosticCapture(baseUrl, TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS.accumulatedAlpha, "Accumulated alpha heatmap"),
    diagnosticCapture(baseUrl, TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS.transmittance, "Transmittance heatmap"),
    diagnosticCapture(baseUrl, TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS.tileRefCount, "Tile-ref density heatmap"),
    diagnosticCapture(baseUrl, TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS.conicShape, "Conic major/minor shape heatmap"),
  ];
}

export function classifyTileLocalDiagnostics({ captures = [] } = {}) {
  const byId = new Map(captures.map((capture) => [capture.id, capture]));
  const findings = [];

  for (const id of Object.values(TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS)) {
    const capture = byId.get(id);
    if (!capture) {
      findings.push(finding("missing-capture", `Missing ${id} diagnostic capture.`));
      continue;
    }
    if (!capture.classification?.harnessPassed) {
      findings.push(finding("capture-smoke-failed", `${id} did not pass visual smoke classification.`));
    }
    const label = rendererLabel(capture);
    if (!label.includes(`tile-local-visible-debug-${id}`)) {
      findings.push(finding("diagnostic-label-mismatch", `${id} reported renderer label ${label || "missing"}.`));
    }
    if (tileRefs(capture) <= 0) {
      findings.push(finding("missing-tile-refs", `${id} did not report positive tile-local refs.`));
    }
    if (!diagnostics(capture)) {
      findings.push(finding("missing-compact-diagnostics", `${id} did not expose compact tile-local diagnostics.`));
    }
  }

  for (const id of REQUIRED_DIAGNOSTIC_IDS) {
    if (!byId.has(id)) {
      findings.push(finding("missing-required-diagnostic", `Required diagnostic ${id} is absent.`));
    }
  }

  const alphaCapture = byId.get(TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS.accumulatedAlpha);
  const transmittanceCapture = byId.get(TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS.transmittance);
  const refCapture = byId.get(TILE_LOCAL_DIAGNOSTIC_CAPTURE_IDS.tileRefCount);
  const alphaDiagnostics = diagnostics(alphaCapture);
  const transmittanceDiagnostics = diagnostics(transmittanceCapture);
  const refDiagnostics = diagnostics(refCapture);

  if (!positiveNumber(alphaDiagnostics?.alpha?.estimatedMaxAccumulatedAlpha)) {
    findings.push(finding("missing-alpha-range", "Accumulated-alpha diagnostics did not report positive estimated alpha."));
  }
  if (finiteNumber(transmittanceDiagnostics?.alpha?.estimatedMinTransmittance) === undefined) {
    findings.push(finding("missing-transmittance-range", "Transmittance diagnostics did not report estimated remaining transmittance."));
  }
  if (!positiveNumber(refDiagnostics?.tileRefs?.total) || !positiveNumber(refDiagnostics?.tileRefs?.maxPerTile)) {
    findings.push(finding("missing-ref-density", "Tile-ref diagnostics did not report total refs and max refs per tile."));
  }

  const metrics = {
    requiredModesPresent: [...REQUIRED_DIAGNOSTIC_IDS].every((id) => byId.has(id)),
    totalTileRefs: finiteNumber(refDiagnostics?.tileRefs?.total) ?? 0,
    maxTileRefsPerTile: finiteNumber(refDiagnostics?.tileRefs?.maxPerTile) ?? 0,
    estimatedMaxAccumulatedAlpha: finiteNumber(alphaDiagnostics?.alpha?.estimatedMaxAccumulatedAlpha) ?? 0,
    estimatedMinTransmittance: finiteNumber(transmittanceDiagnostics?.alpha?.estimatedMinTransmittance) ?? 0,
  };
  const closeable = findings.length === 0;
  return {
    closeable,
    summary: {
      status: closeable ? "PASS" : "FAIL",
      text: closeable
        ? "PASS: tile-local diagnostics expose alpha/transmittance and tile-ref density with compact evidence."
        : `FAIL: ${findings[0]?.summary ?? "tile-local diagnostics criteria were not satisfied"}`,
    },
    metrics,
    findings,
  };
}

function diagnosticCapture(baseUrl, id, title) {
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

function finding(kind, summary) {
  return { kind, summary };
}

function rendererLabel(capture = {}) {
  return String(capture.pageEvidence?.rendererLabel ?? "").trim();
}

function tileRefs(capture = {}) {
  return finiteNumber(capture.pageEvidence?.tileLocal?.refs) ?? 0;
}

function diagnostics(capture = {}) {
  return capture.pageEvidence?.tileLocal?.diagnostics ?? capture.pageEvidence?.tileLocalDiagnostics;
}

function positiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
