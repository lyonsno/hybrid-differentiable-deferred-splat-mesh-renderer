export const TILE_LOCAL_COMPARISON_CAPTURE_IDS = {
  plate: "plate",
  prepass: "tile-local-prepass",
  visible: "tile-local-visible",
};

export function buildTileLocalComparisonPlan(baseUrl) {
  return [
    {
      id: TILE_LOCAL_COMPARISON_CAPTURE_IDS.plate,
      title: "Plate baseline",
      expectedRendererLabel: "plate",
      url: rendererUrl(baseUrl, undefined),
    },
    {
      id: TILE_LOCAL_COMPARISON_CAPTURE_IDS.prepass,
      title: "Plate with silent tile-local prepass",
      expectedRendererLabel: "plate+tile-local-prepass",
      url: rendererUrl(baseUrl, "tile-local"),
    },
    {
      id: TILE_LOCAL_COMPARISON_CAPTURE_IDS.visible,
      title: "Visible tile-local compositor",
      expectedRendererLabel: "tile-local-visible",
      url: rendererUrl(baseUrl, "tile-local-visible"),
    },
  ];
}

export function classifyTileLocalComparison({
  captures = [],
  minVisibleToPlateFpsRatio = 0.35,
  maxBridgeBlockRatio = 0.5,
  minVisibleDistinctColors = 256,
} = {}) {
  const byId = new Map(captures.map((capture) => [capture.id, capture]));
  const plate = byId.get(TILE_LOCAL_COMPARISON_CAPTURE_IDS.plate);
  const prepass = byId.get(TILE_LOCAL_COMPARISON_CAPTURE_IDS.prepass);
  const visible = byId.get(TILE_LOCAL_COMPARISON_CAPTURE_IDS.visible);
  const findings = [];

  requireCapture(findings, plate, TILE_LOCAL_COMPARISON_CAPTURE_IDS.plate);
  requireCapture(findings, prepass, TILE_LOCAL_COMPARISON_CAPTURE_IDS.prepass);
  requireCapture(findings, visible, TILE_LOCAL_COMPARISON_CAPTURE_IDS.visible);

  if (plate && !hasRendererLabel(plate, "plate")) {
    findings.push(finding("plate-label-mismatch", `Plate capture reported renderer label ${rendererLabel(plate) || "missing"}.`));
  }

  if (prepass) {
    if (!hasRendererLabel(prepass, "plate+tile-local-prepass")) {
      findings.push(
        finding(
          "prepass-label-mismatch",
          `Silent prepass capture reported renderer label ${rendererLabel(prepass) || "missing"} instead of plate+tile-local-prepass.`
        )
      );
    }
    if (tileRefs(prepass) <= 0) {
      findings.push(finding("prepass-missing-tile-refs", "Silent prepass did not report positive tile-local refs."));
    }
  }

  if (visible) {
    const label = rendererLabel(visible);
    if (!label.includes("tile-local-visible")) {
      findings.push(
        finding("visible-fallback-to-plate", `Visible tile-local capture reported renderer label ${label || "missing"}.`)
      );
    }
    if (tileRefs(visible) <= 0) {
      findings.push(finding("visible-missing-tile-refs", "Visible tile-local capture did not report positive tile-local refs."));
    }
    if (label.includes("bridge-diagnostic") || bridgeBlockRatio(visible) >= maxBridgeBlockRatio) {
      findings.push(
        finding(
          "visible-bridge-block-diagnostic",
          `Visible tile-local capture still looks like the bridge block diagnostic (label ${label || "missing"}, block ratio ${formatRatio(bridgeBlockRatio(visible))}).`
        )
      );
    }
    if (distinctColorCount(visible) < minVisibleDistinctColors) {
      findings.push(
        finding(
          "visible-low-color-blocks",
          `Visible tile-local capture has only ${distinctColorCount(visible)} distinct colors, below ${minVisibleDistinctColors}; this is still block-quantized rather than image-like.`
        )
      );
    }
  }

  if (plate && visible && sameFingerprint(plate, visible) && !rendererLabel(visible).includes("bridge-diagnostic")) {
    findings.push(
      finding(
        "visible-fallback-to-plate",
        "Visible tile-local capture has the same image fingerprint as the plate baseline."
      )
    );
  }

  const metrics = comparisonMetrics({ plate, prepass, visible });
  if (Number.isFinite(metrics.fps.visibleToPlateRatio) && metrics.fps.visibleToPlateRatio < minVisibleToPlateFpsRatio) {
    findings.push(
      finding(
        "visible-frame-rate-collapse",
        `Visible tile-local FPS is ${formatRatio(metrics.fps.visibleToPlateRatio)}x plate baseline, below ${formatRatio(minVisibleToPlateFpsRatio)}x.`
      )
    );
  }

  const closeable = findings.length === 0;
  return {
    closeable,
    summary: {
      status: closeable ? "PASS" : "FAIL",
      text: closeable
        ? "PASS: plate, silent prepass, and visible tile-local compositor evidence are distinguishable without performance collapse."
        : `FAIL: ${findings[0]?.summary ?? "tile-local comparison criteria were not satisfied"}`,
    },
    metrics,
    findings,
  };
}

export function extractTileLocalPageMetrics(pageEvidence = {}) {
  const statsText = pageEvidence.statsText ?? "";
  const parsedGrid = parseTileGrid(statsText);
  const skipReason = pageEvidence.tileLocalLastSkipReason ?? parseTileLocalSkipReason(statsText);
  const parsedBudget = parseTileLocalBudget(statsText);
  const tileLocal = pageEvidence.tileLocal && typeof pageEvidence.tileLocal === "object" ? pageEvidence.tileLocal : {};
  const freshness = tileLocal.freshness
    ?? (/stale-cache/i.test(statsText) || skipReason ? { status: "stale-cache" } : undefined);
  return {
    rendererLabel: pageEvidence.rendererLabel ?? parseRendererLabel(statsText),
    fps: finiteNumber(pageEvidence.fps) ?? parseFps(statsText),
    tileLocalLastSkipReason: skipReason,
    tileLocal: {
      ...tileLocal,
      refs: finiteNumber(tileLocal.refs) ?? parsedGrid.refs,
      tileColumns: finiteNumber(tileLocal.tileColumns) ?? parsedGrid.tileColumns,
      tileRows: finiteNumber(tileLocal.tileRows) ?? parsedGrid.tileRows,
      freshness,
      budget: {
        ...(tileLocal.budget && typeof tileLocal.budget === "object" ? tileLocal.budget : {}),
        skippedProjectedRefs:
          finiteNumber(tileLocal.budget?.skippedProjectedRefs) ?? parsedBudget?.skippedProjectedRefs,
        maxProjectedRefs:
          finiteNumber(tileLocal.budget?.maxProjectedRefs) ?? parsedBudget?.maxProjectedRefs,
        skipReason:
          (tileLocal.budget && typeof tileLocal.budget === "object" ? tileLocal.budget.skipReason : undefined)
          ?? skipReason,
      },
    },
  };
}

export function isVisualSmokeCaptureReady(pageEvidence = {}, { expectedRendererLabel = "" } = {}) {
  const metrics = extractTileLocalPageMetrics(pageEvidence);
  const statsText = String(pageEvidence.statsText ?? "");
  const canvas = pageEvidence.canvas ?? {};
  const canvasWidth = finiteNumber(canvas.width) ?? 0;
  const canvasHeight = finiteNumber(canvas.height) ?? 0;
  const clientWidth = finiteNumber(canvas.clientWidth) ?? 0;
  const clientHeight = finiteNumber(canvas.clientHeight) ?? 0;

  if (pageEvidence.ready !== true) return false;
  if (/loading/i.test(statsText)) return false;
  if (canvasWidth <= 0 || canvasHeight <= 0) return false;
  if (clientWidth > 0 && canvasWidth < clientWidth) return false;
  if (clientHeight > 0 && canvasHeight < clientHeight) return false;
  if (expectedRendererLabel && !rendererLabelMatches(metrics.rendererLabel, expectedRendererLabel)) return false;
  if (expectedRendererLabel.includes("tile-local") && tileLocalPresentationIsStale(metrics)) return false;
  if (expectedRendererLabel.includes("tile-local") && metrics.tileLocal.refs <= 0) return false;
  return true;
}

function rendererUrl(baseUrl, renderer) {
  const url = new URL(baseUrl);
  if (renderer) {
    url.searchParams.set("renderer", renderer);
  } else {
    url.searchParams.delete("renderer");
  }
  return url.toString().replaceAll("%2F", "/");
}

function requireCapture(findings, capture, id) {
  if (!capture) {
    findings.push(finding("missing-capture", `Missing ${id} capture.`));
    return;
  }
  if (!capture.classification?.harnessPassed) {
    findings.push(finding("capture-smoke-failed", `${id} did not pass visual smoke classification.`));
  }
}

function comparisonMetrics({ plate, prepass, visible }) {
  const plateFps = fps(plate);
  const prepassFps = fps(prepass);
  const visibleFps = fps(visible);
  return {
    fps: {
      plate: plateFps,
      prepass: prepassFps,
      visible: visibleFps,
      prepassToPlateRatio: ratio(prepassFps, plateFps),
      visibleToPlateRatio: ratio(visibleFps, plateFps),
    },
    changedPixelRatio: {
      plate: finiteNumber(plate?.imageAnalysis?.changedPixelRatio) ?? 0,
      prepass: finiteNumber(prepass?.imageAnalysis?.changedPixelRatio) ?? 0,
      visible: finiteNumber(visible?.imageAnalysis?.changedPixelRatio) ?? 0,
    },
    tileRefs: {
      prepass: tileRefs(prepass),
      visible: tileRefs(visible),
    },
  };
}

function finding(kind, summary) {
  return { kind, summary };
}

function hasRendererLabel(capture, expected) {
  return rendererLabel(capture) === expected;
}

function rendererLabelMatches(actual, expected) {
  const label = String(actual ?? "").trim();
  return expected === "tile-local-visible" ? label.includes(expected) : label === expected;
}

function rendererLabel(capture = {}) {
  return String(capture.pageEvidence?.rendererLabel ?? "").trim();
}

function fps(capture = {}) {
  return finiteNumber(capture.pageEvidence?.fps) ?? 0;
}

function tileRefs(capture = {}) {
  return finiteNumber(capture.pageEvidence?.tileLocal?.refs) ?? 0;
}

function bridgeBlockRatio(capture = {}) {
  return finiteNumber(capture.imageAnalysis?.bridgeBlockRatio ?? capture.pageEvidence?.bridgeBlockRatio) ?? 0;
}

function distinctColorCount(capture = {}) {
  return finiteNumber(capture.imageAnalysis?.distinctColorCount) ?? 0;
}

function sameFingerprint(left, right) {
  const leftFingerprint = left?.imageAnalysis?.perceptualFingerprint;
  const rightFingerprint = right?.imageAnalysis?.perceptualFingerprint;
  return Boolean(leftFingerprint && rightFingerprint && leftFingerprint === rightFingerprint);
}

function ratio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return Number.NaN;
  return Number((numerator / denominator).toFixed(3));
}

function formatRatio(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function parseRendererLabel(statsText) {
  const match = /\brenderer:\s*([^|]+)/i.exec(statsText);
  return match ? match[1].trim() : "";
}

function parseFps(statsText) {
  const match = /\|\s*([\d.]+)\s*fps\b/i.exec(statsText);
  return match ? Number(match[1]) : 0;
}

function parseTileRefs(statsText) {
  return parseTileGrid(statsText).refs;
}

function parseTileGrid(statsText) {
  const match = /\btile-local:\s*([\d,]+)x([\d,]+)\s*tiles\/([\d,]+)\s*refs\b/i.exec(statsText);
  return {
    tileColumns: match ? Number(match[1].replaceAll(",", "")) : undefined,
    tileRows: match ? Number(match[2].replaceAll(",", "")) : undefined,
    refs: match ? Number(match[3].replaceAll(",", "")) : 0,
  };
}

function parseTileLocalSkipReason(statsText) {
  const match = /\btile-local skipped:\s*([^|]+)/i.exec(statsText);
  return match ? match[1].trim() : undefined;
}

function parseTileLocalBudget(statsText) {
  const match = /projected tile refs exceed budget:\s*([\d,]+)\s*>\s*([\d,]+)/i.exec(statsText);
  if (!match) return undefined;
  return {
    skippedProjectedRefs: Number(match[1].replaceAll(",", "")),
    maxProjectedRefs: Number(match[2].replaceAll(",", "")),
  };
}

function tileLocalPresentationIsStale(metrics) {
  const status = String(metrics.tileLocal?.freshness?.status ?? "").trim();
  if (status && status !== "current") return true;
  if (metrics.tileLocalLastSkipReason) return true;
  return /stale-cache/i.test(metrics.rendererLabel ?? "");
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
