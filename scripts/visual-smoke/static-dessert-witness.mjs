import {
  classifyTraceCanvasParityWitness,
  TRACE_CANVAS_PARITY_KINDS,
} from "./trace-canvas-parity.mjs";

export const STATIC_DESSERT_WITNESS_CAPTURE_IDS = {
  plateFinalColor: "plate-final-color",
  finalColor: "final-color",
  visualGapTrace: "visual-gap-trace",
  operatorVisibleBadPixelTrace: "operator-visible-bad-pixel-trace",
  coverageWeight: "coverage-weight",
  accumulatedAlpha: "accumulated-alpha",
  transmittance: "transmittance",
  tileRefCount: "tile-ref-count",
  conicShape: "conic-shape",
};

const REQUIRED_CAPTURE_IDS = new Set(
  Object.values(STATIC_DESSERT_WITNESS_CAPTURE_IDS)
    .filter((id) => (
      id !== STATIC_DESSERT_WITNESS_CAPTURE_IDS.visualGapTrace &&
      id !== STATIC_DESSERT_WITNESS_CAPTURE_IDS.operatorVisibleBadPixelTrace
    ))
);
const DEBUG_CAPTURE_IDS = new Set([
  STATIC_DESSERT_WITNESS_CAPTURE_IDS.coverageWeight,
  STATIC_DESSERT_WITNESS_CAPTURE_IDS.accumulatedAlpha,
  STATIC_DESSERT_WITNESS_CAPTURE_IDS.transmittance,
  STATIC_DESSERT_WITNESS_CAPTURE_IDS.tileRefCount,
  STATIC_DESSERT_WITNESS_CAPTURE_IDS.conicShape,
]);
const DEFAULT_STATIC_TILE_LOCAL_ROUTE = Object.freeze({
  arenaBackend: "gpu",
  tileSizePx: "16",
  maxRefsPerTile: "256",
});
const STATIC_TILE_LOCAL_ROUTE_PARAMS = Object.freeze(Object.keys(DEFAULT_STATIC_TILE_LOCAL_ROUTE));
const PRESENTATION_ROUTE_PARAMS = Object.freeze([
  "presentationAnchors",
  "presentationAnchor",
  "tileLocalPresentationAnchors",
  "tileLocalPresentationAnchor",
  "presentationScope",
  "presentationMode",
  "tileLocalPresentationScope",
  "tileLocalPresentationMode",
]);
const TRACE_ROUTE_PARAMS = Object.freeze([
  "traceAnchors",
  "traceAnchor",
]);
const MAX_TILE_LOCAL_TO_PLATE_CHANGED_PIXEL_RATIO = 2.0;
const MAX_VISUAL_GAP_REMAINING_TRANSMITTANCE_FOR_SEALED = 0.1;
const MIN_VISUAL_GAP_ALPHA_FOR_SEALED = 0.9;

export function buildStaticDessertWitnessPlan(baseUrl) {
  return [
    plateFinalColorCapture(baseUrl),
    finalColorCapture(baseUrl),
    debugCapture(baseUrl, STATIC_DESSERT_WITNESS_CAPTURE_IDS.coverageWeight, "Coverage weight heatmap"),
    debugCapture(baseUrl, STATIC_DESSERT_WITNESS_CAPTURE_IDS.accumulatedAlpha, "Accumulated alpha heatmap"),
    debugCapture(baseUrl, STATIC_DESSERT_WITNESS_CAPTURE_IDS.transmittance, "Transmittance heatmap"),
    debugCapture(baseUrl, STATIC_DESSERT_WITNESS_CAPTURE_IDS.tileRefCount, "Tile-ref density heatmap"),
    debugCapture(baseUrl, STATIC_DESSERT_WITNESS_CAPTURE_IDS.conicShape, "Conic major/minor shape heatmap"),
  ];
}

export function buildStaticDessertVisualGapTraceCapture(baseUrl, anchors) {
  const url = new URL(baseUrl);
  url.searchParams.set("renderer", "tile-local-visible");
  applyStaticTileLocalRoute(url);
  url.searchParams.delete("tileDebug");
  url.searchParams.delete("debug");
  clearTraceRoute(url);
  clearPresentationRoute(url);
  url.searchParams.set("traceAnchors", encodeStaticDessertTraceAnchors(anchors));
  return {
    id: STATIC_DESSERT_WITNESS_CAPTURE_IDS.visualGapTrace,
    title: "Visual gap final-color trace anchors",
    expectedRendererLabel: "tile-local-visible",
    visualGapAnchors: normalizeStaticDessertVisualGapAnchors(anchors),
    url: url.toString().replaceAll("%2F", "/"),
  };
}

export function buildStaticDessertOperatorVisibleBadPixelTraceCapture(baseUrl, anchors) {
  const url = new URL(baseUrl);
  url.searchParams.set("renderer", "tile-local-visible");
  applyStaticTileLocalRoute(url);
  url.searchParams.delete("tileDebug");
  url.searchParams.delete("debug");
  clearTraceRoute(url);
  clearPresentationRoute(url);
  url.searchParams.set("traceAnchors", encodeStaticDessertOperatorVisibleBadPixelTraceAnchors(anchors));
  return {
    id: STATIC_DESSERT_WITNESS_CAPTURE_IDS.operatorVisibleBadPixelTrace,
    title: "Operator-visible bad-pixel final-color trace anchors",
    expectedRendererLabel: "tile-local-visible",
    operatorVisibleBadPixelAnchors: normalizeStaticDessertOperatorVisibleBadPixelAnchors(anchors),
    url: url.toString().replaceAll("%2F", "/"),
  };
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
  const plateFinalColor = byId.get(STATIC_DESSERT_WITNESS_CAPTURE_IDS.plateFinalColor);
  const visualGapTrace = summarizeVisualGapTrace(
    byId.get(STATIC_DESSERT_WITNESS_CAPTURE_IDS.visualGapTrace),
    staticTileLocalRouteExpectation(finalColor)
  );
  const plateSeepageClassification = classifyPlateSeepageFromVisualGapTrace(
    visualGapTrace,
    staticTileLocalRouteExpectation(finalColor)
  );
  const operatorVisibleBadPixelTrace = summarizeOperatorVisibleBadPixelTrace(
    byId.get(STATIC_DESSERT_WITNESS_CAPTURE_IDS.operatorVisibleBadPixelTrace),
    staticTileLocalRouteExpectation(finalColor)
  );
  const operatorVisibleBadPixelClassification = classifyOperatorVisibleBadPixelsFromTrace(
    operatorVisibleBadPixelTrace,
    staticTileLocalRouteExpectation(finalColor)
  );
  if (plateFinalColor && rendererLabel(plateFinalColor) !== "plate") {
    findings.push(
      finding(
        "plate-label-mismatch",
        `Plate final-color capture reported renderer label ${rendererLabel(plateFinalColor) || "missing"}.`
      )
    );
  }
  const finalColorRouteStatus = staticFinalColorRouteStatus(finalColor);
  if (finalColor && finalColorRouteStatus !== "ok") {
    findings.push(
      finding(
        "final-color-label-mismatch",
        finalColorRouteStatus
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
  const rimBandSupport =
    plateFinalColor?.pageEvidence?.witness?.projection?.cropSupport?.rimBand ??
    finalColor?.pageEvidence?.witness?.projection?.cropSupport?.rimBand;
  const porousBodySupport =
    plateFinalColor?.pageEvidence?.witness?.projection?.cropSupport?.porousBody ??
    finalColor?.pageEvidence?.witness?.projection?.cropSupport?.porousBody;
  if (!positiveNumber(rimBandSupport?.projectedSupportCount)) {
    findings.push(finding("missing-rim-source-support", "Static dessert witness did not report crop-local rim source support."));
  }
  if (!positiveNumber(porousBodySupport?.projectedSupportCount)) {
    findings.push(finding("missing-porous-body-source-support", "Static dessert witness did not report crop-local porous body source support."));
  }
  const plateChangedPixelRatio = finiteNumber(plateFinalColor?.imageAnalysis?.changedPixelRatio) ?? 0;
  const tileLocalChangedPixelRatio = finiteNumber(finalColor?.imageAnalysis?.changedPixelRatio) ?? 0;
  const tileLocalToPlateChangedPixelRatio =
    plateChangedPixelRatio > 0 ? tileLocalChangedPixelRatio / plateChangedPixelRatio : 0;
  const bridgeCapturesSameView =
    assetPath(plateFinalColor) !== "" &&
    assetPath(plateFinalColor) === assetPath(finalColor) &&
    viewportKey(plateFinalColor) !== "" &&
    viewportKey(plateFinalColor) === viewportKey(finalColor);
  if (
    bridgeCapturesSameView &&
    tileLocalToPlateChangedPixelRatio > MAX_TILE_LOCAL_TO_PLATE_CHANGED_PIXEL_RATIO
  ) {
    findings.push(
      finding(
        "tile-local-visible-footprint-expansion",
        `Tile-local final color changed ${tileLocalToPlateChangedPixelRatio.toFixed(2)}x as many pixels as plate on the fixed dessert witness.`
      )
    );
  }
  if (visualGapTrace.status === "not-captured") {
    findings.push(
      finding(
        "visual-gap-trace-not-captured",
        "Static dessert witness did not capture derived visual-gap trace anchors."
      )
    );
  } else if (visualGapTrace.status === "empty") {
    findings.push(
      finding(
        "visual-gap-anchors-missing",
        "Static dessert witness captured a visual-gap trace route without derived visual-gap anchors."
      )
    );
  } else if (visualGapTrace.status === "malformed") {
    findings.push(
      finding(
        "visual-gap-trace-malformed",
        visualGapTrace.routeStatus || "Visual gap trace capture did not preserve the expected tile-local trace route."
      )
    );
  } else if (visualGapTrace.status === "partial") {
    const incomplete = visualGapTrace.anchors
      .filter((anchor) => !anchor.traceComplete)
      .map((anchor) => `${anchor.id}:${anchor.traceStatus}`)
      .join(", ");
    findings.push(
      finding(
        "visual-gap-trace-incomplete",
        `Visual gap trace anchors were captured but missing required trace diagnostics: ${incomplete || "unknown"}.`
      )
    );
  }
  if (visualGapTrace.status === "present" && plateSeepageClassification.status !== "classified") {
    findings.push(
      finding(
        "plate-seepage-classification-blocked",
        `Plate/background seepage anchors were traced but not stage-classified: ${plateSeepageClassification.category}/${plateSeepageClassification.stage}.`
      )
    );
  }
  if (operatorVisibleBadPixelTrace.status === "malformed") {
    findings.push(
      finding(
        "operator-visible-bad-pixel-trace-malformed",
        operatorVisibleBadPixelTrace.routeStatus || "Operator-visible bad-pixel trace did not preserve the expected tile-local trace route."
      )
    );
  } else if (operatorVisibleBadPixelTrace.status === "partial") {
    const incomplete = operatorVisibleBadPixelTrace.anchors
      .filter((anchor) => !anchor.traceComplete)
      .map((anchor) => `${anchor.id}:${anchor.traceStatus}`)
      .join(", ");
    findings.push(
      finding(
        "operator-visible-bad-pixel-trace-incomplete",
        `Operator-visible bad-pixel trace anchors were captured but missing required trace diagnostics: ${incomplete || "unknown"}.`
      )
    );
  } else if (
    operatorVisibleBadPixelTrace.status === "present" &&
    operatorVisibleBadPixelClassification.category === "alpha-sealed-rgb-transfer-mismatch"
  ) {
    findings.push(
      finding(
        "operator-visible-bad-pixels-alpha-sealed",
        "Operator-visible bad pixels remain even though traced foreground survived and alpha/transmittance are sealed."
      )
    );
  } else if (
    operatorVisibleBadPixelTrace.status === "present" &&
    operatorVisibleBadPixelClassification.category === "trace-canvas-parity-blocked"
  ) {
    findings.push(
      finding(
        "operator-visible-bad-pixel-trace-canvas-parity-blocked",
        `Operator-visible bad pixels were traced, but trace/canvas parity blocked renderer attribution: ${operatorVisibleBadPixelTrace.traceCanvasParity?.status || "missing"}.`
      )
    );
  } else if (
    operatorVisibleBadPixelTrace.status === "present" &&
    operatorVisibleBadPixelClassification.status === "blocked"
  ) {
    findings.push(
      finding(
        "operator-visible-bad-pixels-unclassified",
        `Operator-visible bad pixels were traced but not classified for repair: ${operatorVisibleBadPixelClassification.category}/${operatorVisibleBadPixelClassification.stage}.`
      )
    );
  }

  const metrics = {
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
    rendererBridge: {
      plateRendererLabel: rendererLabel(plateFinalColor),
      tileLocalRendererLabel: rendererLabel(finalColor),
      sameAsset: assetPath(plateFinalColor) !== "" && assetPath(plateFinalColor) === assetPath(finalColor),
      sameViewport: viewportKey(plateFinalColor) !== "" && viewportKey(plateFinalColor) === viewportKey(finalColor),
      plateChangedPixelRatio,
      tileLocalChangedPixelRatio,
      tileLocalToPlateChangedPixelRatio,
      maxTileLocalToPlateChangedPixelRatio: MAX_TILE_LOCAL_TO_PLATE_CHANGED_PIXEL_RATIO,
    },
    sourceSupport: {
      rimBand: normalizeRimBandSourceSupport(
        plateFinalColor?.pageEvidence?.witness?.projection?.cropSupport?.rimBand ??
          finalColor?.pageEvidence?.witness?.projection?.cropSupport?.rimBand
      ),
      porousBody: normalizeRimBandSourceSupport(
        plateFinalColor?.pageEvidence?.witness?.projection?.cropSupport?.porousBody ??
          finalColor?.pageEvidence?.witness?.projection?.cropSupport?.porousBody
      ),
    },
    conicShape: {
      maxMajorRadiusPx: finiteNumber(conicDiagnostics?.conicShape?.maxMajorRadiusPx) ?? 0,
      minMinorRadiusPx: finiteNumber(conicDiagnostics?.conicShape?.minMinorRadiusPx) ?? 0,
      maxAnisotropy:
        finiteNumber(conicDiagnostics?.conicShape?.maxAnisotropyRatio) ??
        finiteNumber(conicDiagnostics?.conicShape?.maxAnisotropy) ??
        0,
    },
    visualGapTrace,
    plateSeepageClassification,
    operatorVisibleBadPixelTrace,
    operatorVisibleBadPixelClassification,
  };
  const closeable = findings.length === 0;
  return {
    closeable,
    summary: {
      status: closeable ? "PASS" : "FAIL",
      text: closeable
        ? "PASS: static dessert final color and debug witnesses share one asset, viewport, and tile grid."
        : `FAIL: ${findings[0]?.summary ?? "static dessert witness criteria were not satisfied"}`,
    },
    metrics,
    observations: staticDessertObservations(plateSeepageClassification, metrics),
    findings,
  };
}

function plateFinalColorCapture(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.delete("renderer");
  clearStaticDessertTransientRoute(url);
  clearStaticTileLocalRoute(url);
  return {
    id: STATIC_DESSERT_WITNESS_CAPTURE_IDS.plateFinalColor,
    title: "Plate baseline final color",
    expectedRendererLabel: "plate",
    url: url.toString().replaceAll("%2F", "/"),
  };
}

function finalColorCapture(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set("renderer", "tile-local-visible");
  applyStaticTileLocalRoute(url);
  clearStaticDessertTransientRoute(url);
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
  applyStaticTileLocalRoute(url);
  clearStaticDessertTransientRoute(url);
  url.searchParams.set("tileDebug", id);
  return {
    id,
    title,
    expectedRendererLabel: `tile-local-visible-debug-${id}`,
    readiness: {
      tileLocalDiagnostics: staticDessertDebugReadiness(id),
    },
    url: url.toString().replaceAll("%2F", "/"),
  };
}

function staticDessertDebugReadiness(id) {
  const base = {
    debugMode: id,
    requireTileRefs: true,
  };
  switch (id) {
    case STATIC_DESSERT_WITNESS_CAPTURE_IDS.coverageWeight:
      return { ...base, requireDiagnostics: true };
    case STATIC_DESSERT_WITNESS_CAPTURE_IDS.accumulatedAlpha:
      return { ...base, requireAlpha: true };
    case STATIC_DESSERT_WITNESS_CAPTURE_IDS.transmittance:
      return { ...base, requireTransmittance: true };
    case STATIC_DESSERT_WITNESS_CAPTURE_IDS.tileRefCount:
      return { ...base, requireRefDensity: true };
    case STATIC_DESSERT_WITNESS_CAPTURE_IDS.conicShape:
      return { ...base, requireConicShape: true };
    default:
      return base;
  }
}

function applyStaticTileLocalRoute(url) {
  for (const [key, value] of Object.entries(DEFAULT_STATIC_TILE_LOCAL_ROUTE)) {
    url.searchParams.set(key, value);
  }
}

function clearStaticTileLocalRoute(url) {
  for (const key of STATIC_TILE_LOCAL_ROUTE_PARAMS) {
    url.searchParams.delete(key);
  }
}

function clearPresentationRoute(url) {
  for (const key of PRESENTATION_ROUTE_PARAMS) {
    url.searchParams.delete(key);
  }
}

function clearTraceRoute(url) {
  for (const key of TRACE_ROUTE_PARAMS) {
    url.searchParams.delete(key);
  }
}

function clearStaticDessertTransientRoute(url) {
  url.searchParams.delete("tileDebug");
  url.searchParams.delete("debug");
  clearTraceRoute(url);
  clearPresentationRoute(url);
}

export function deriveStaticDessertVisualGapAnchorsFromImages({
  plateImage,
  finalImage,
  plateBackground = [0, 0, 0, 255],
  finalBackground = plateBackground,
  maxAnchors = 3,
  stridePx = 4,
  minSpacingPx = 72,
} = {}) {
  if (
    !validImage(plateImage) ||
    !validImage(finalImage) ||
    plateImage.width !== finalImage.width ||
    plateImage.height !== finalImage.height
  ) {
    return [];
  }

  const candidates = [];
  for (let y = 0; y < plateImage.height; y += stridePx) {
    for (let x = 0; x < plateImage.width; x += stridePx) {
      const platePixel = readImagePixel(plateImage, x, y);
      const finalPixel = readImagePixel(finalImage, x, y);
      const plateDelta = rgbDelta(platePixel, plateBackground);
      const finalDelta = rgbDelta(finalPixel, finalBackground);
      const plateVsFinal = rgbDelta(platePixel, finalPixel);
      const missingScore = plateDelta - finalDelta;
      if (plateDelta < 30 || missingScore < 24 || finalDelta > plateDelta * 0.55 || plateVsFinal < 28) {
        continue;
      }
      candidates.push({
        id: `visual-gap-${candidates.length + 1}`,
        kind: "plate-covered-tile-local-missing",
        x,
        y,
        score: roundMetric(missingScore + plateVsFinal * 0.5),
        plateDelta: roundMetric(plateDelta),
        tileLocalDelta: roundMetric(finalDelta),
      });
    }
  }

  candidates.sort((left, right) => (
    right.score - left.score ||
    left.y - right.y ||
    left.x - right.x
  ));
  const selected = [];
  const minSpacingSquared = minSpacingPx * minSpacingPx;
  for (const candidate of candidates) {
    if (selected.every((anchor) => squaredDistance(anchor, candidate) >= minSpacingSquared)) {
      selected.push({
        ...candidate,
        id: `visual-gap-${selected.length + 1}`,
      });
    }
    if (selected.length >= maxAnchors) {
      break;
    }
  }
  return selected;
}

export function deriveStaticDessertOperatorVisibleBadPixelAnchorsFromImages({
  plateImage,
  finalImage,
  plateBackground = [0, 0, 0, 255],
  finalBackground = plateBackground,
  maxAnchors = 3,
  stridePx = 1,
  minSpacingPx = 72,
  minFinalLuma = 145,
  minFinalVsPlateLuma = 48,
  minFinalVsPlateDelta = 42,
} = {}) {
  if (
    !validImage(plateImage) ||
    !validImage(finalImage) ||
    plateImage.width !== finalImage.width ||
    plateImage.height !== finalImage.height
  ) {
    return [];
  }

  const candidates = [];
  for (let y = 0; y < plateImage.height; y += stridePx) {
    for (let x = 0; x < plateImage.width; x += stridePx) {
      const platePixel = readImagePixel(plateImage, x, y);
      const finalPixel = readImagePixel(finalImage, x, y);
      const plateDelta = rgbDelta(platePixel, plateBackground);
      const finalDelta = rgbDelta(finalPixel, finalBackground);
      const finalVsPlate = rgbDelta(finalPixel, platePixel);
      const plateLuma = rgbLuma(platePixel);
      const finalLuma = rgbLuma(finalPixel);
      const finalLumaExcess = finalLuma - plateLuma;
      if (
        finalLuma < minFinalLuma ||
        finalLumaExcess < minFinalVsPlateLuma ||
        finalVsPlate < minFinalVsPlateDelta ||
        finalDelta < plateDelta * 1.2
      ) {
        continue;
      }
      candidates.push({
        id: `operator-bad-pixel-${candidates.length + 1}`,
        kind: "operator-visible-bright-outlier",
        x,
        y,
        score: roundMetric(finalVsPlate + finalLumaExcess + finalDelta * 0.25),
        plateDelta: roundMetric(plateDelta),
        finalDelta: roundMetric(finalDelta),
        plateLuma: roundMetric(plateLuma),
        finalLuma: roundMetric(finalLuma),
      });
    }
  }

  candidates.sort((left, right) => (
    right.score - left.score ||
    left.y - right.y ||
    left.x - right.x
  ));
  const selected = [];
  const minSpacingSquared = minSpacingPx * minSpacingPx;
  for (const candidate of candidates) {
    if (selected.every((anchor) => squaredDistance(anchor, candidate) >= minSpacingSquared)) {
      selected.push({
        ...candidate,
        id: `operator-bad-pixel-${selected.length + 1}`,
      });
    }
    if (selected.length >= maxAnchors) {
      break;
    }
  }
  return selected;
}

function validImage(image) {
  return Boolean(
    image &&
    Number.isInteger(image.width) &&
    Number.isInteger(image.height) &&
    image.width > 0 &&
    image.height > 0 &&
    image.rgba &&
    image.rgba.length === image.width * image.height * 4
  );
}

function readImagePixel(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [
    image.rgba[offset],
    image.rgba[offset + 1],
    image.rgba[offset + 2],
    image.rgba[offset + 3],
  ];
}

function rgbDelta(left, right) {
  return (
    Math.abs(left[0] - right[0]) +
    Math.abs(left[1] - right[1]) +
    Math.abs(left[2] - right[2])
  ) / 3;
}

function rgbLuma(pixel) {
  return pixel[0] * 0.2126 + pixel[1] * 0.7152 + pixel[2] * 0.0722;
}

function squaredDistance(left, right) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

function roundMetric(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : 0;
}

function encodeStaticDessertTraceAnchors(anchors) {
  return normalizeStaticDessertVisualGapAnchors(anchors)
    .map((anchor) => `${anchor.id}@${anchor.x},${anchor.y}:${anchor.kind}`)
    .join(";");
}

function encodeStaticDessertOperatorVisibleBadPixelTraceAnchors(anchors) {
  return normalizeStaticDessertOperatorVisibleBadPixelAnchors(anchors)
    .map((anchor) => `${anchor.id}@${anchor.x},${anchor.y}:${anchor.kind}`)
    .join(";");
}

function normalizeStaticDessertVisualGapAnchors(anchors) {
  return (Array.isArray(anchors) ? anchors : [])
    .map((anchor, index) => ({
      id: sanitizeAnchorToken(anchor?.id || `visual-gap-${index + 1}`, index),
      kind: sanitizeAnchorToken(anchor?.kind || "plate-covered-tile-local-missing", index),
      x: Math.max(0, Math.floor(finiteNumber(anchor?.x) ?? 0)),
      y: Math.max(0, Math.floor(finiteNumber(anchor?.y) ?? 0)),
      score: finiteNumber(anchor?.score) ?? 0,
      plateDelta: finiteNumber(anchor?.plateDelta) ?? 0,
      tileLocalDelta: finiteNumber(anchor?.tileLocalDelta) ?? 0,
    }));
}

function normalizeStaticDessertOperatorVisibleBadPixelAnchors(anchors) {
  return (Array.isArray(anchors) ? anchors : [])
    .map((anchor, index) => ({
      id: sanitizeAnchorToken(anchor?.id || `operator-bad-pixel-${index + 1}`, index),
      kind: sanitizeAnchorToken(anchor?.kind || "operator-visible-bright-outlier", index),
      x: Math.max(0, Math.floor(finiteNumber(anchor?.x) ?? 0)),
      y: Math.max(0, Math.floor(finiteNumber(anchor?.y) ?? 0)),
      score: finiteNumber(anchor?.score) ?? 0,
      plateDelta: finiteNumber(anchor?.plateDelta) ?? 0,
      finalDelta: finiteNumber(anchor?.finalDelta) ?? 0,
      plateLuma: finiteNumber(anchor?.plateLuma) ?? 0,
      finalLuma: finiteNumber(anchor?.finalLuma) ?? 0,
    }));
}

function sanitizeAnchorToken(value, index) {
  const sanitized = String(value).trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || `visual-gap-${index + 1}`;
}

function summarizeVisualGapTrace(capture, expectedRoute = {}) {
  const anchors = normalizeStaticDessertVisualGapAnchors(capture?.visualGapAnchors);
  const routeStatus = visualGapTraceRouteStatus(capture, anchors, expectedRoute);
  const tileLocal = capture?.pageEvidence?.tileLocal;
  const accumulationById = new Map(
    (Array.isArray(tileLocal?.perPixelFinalColorAccumulation) ? tileLocal.perPixelFinalColorAccumulation : [])
      .map((trace) => [trace?.anchorPixel?.id, trace])
      .filter(([id]) => typeof id === "string")
  );
  const ledgersById = new Map(
    (Array.isArray(tileLocal?.perPixelRetainedToOrderedSurvivalLedger?.anchorLedgers)
      ? tileLocal.perPixelRetainedToOrderedSurvivalLedger.anchorLedgers
      : [])
      .map((ledger) => [ledger?.anchorPixel?.id, ledger])
      .filter(([id]) => typeof id === "string")
  );
  const anchorSummaries = anchors.map((anchor) => {
    const accumulation = accumulationById.get(anchor.id);
    const ledger = ledgersById.get(anchor.id);
    const hasFinalAccumulation = Boolean(accumulation?.finalColorAccumulation);
    const hasSurvivalLedger = Boolean(ledger);
    const accumulationAnchorMatches = anchorPixelMatches(anchor, accumulation?.anchorPixel);
    const ledgerAnchorMatches = anchorPixelMatches(anchor, ledger?.anchorPixel);
    const outputAlpha = finiteNumber(accumulation?.finalColorAccumulation?.outputColor?.[3]);
    const remainingTransmittance = finiteNumber(accumulation?.finalColorAccumulation?.remainingTransmittance);
    const category = ledger?.category || "unclassified";
    const ledgerCounts = ledger?.counts && typeof ledger.counts === "object" ? ledger.counts : {};
    const ledgerMetrics = ledger?.metrics && typeof ledger.metrics === "object" ? ledger.metrics : {};
    const finalForegroundAlpha = finiteNumber(ledger?.metrics?.finalForegroundAlpha);
    const hasAlphaTransferEvidence = (
      outputAlpha !== undefined &&
      remainingTransmittance !== undefined &&
      (category !== "ordered-present" || finalForegroundAlpha !== undefined)
    );
    const traceStatus = !accumulation
      ? "missing-final-accumulation"
      : !hasFinalAccumulation
        ? "missing-final-accumulation-record"
        : !hasSurvivalLedger
          ? "missing-survival-ledger"
            : !accumulationAnchorMatches
              ? "final-accumulation-anchor-mismatch"
              : !ledgerAnchorMatches
                ? "survival-ledger-anchor-mismatch"
                : !hasAlphaTransferEvidence
                  ? "missing-alpha-transfer-evidence"
                  : accumulation.status || "present";
    return {
      ...anchor,
      traceStatus,
      traceComplete: hasFinalAccumulation && hasSurvivalLedger && accumulationAnchorMatches && ledgerAnchorMatches && hasAlphaTransferEvidence,
      finalStepCount: Array.isArray(accumulation?.finalColorAccumulation?.steps)
        ? accumulation.finalColorAccumulation.steps.length
        : 0,
      outputAlpha: outputAlpha ?? null,
      remainingTransmittance: remainingTransmittance ?? null,
      category,
      mechanism: ledger?.mechanism || "unclassified",
      projectedForegroundCount: finiteNumber(ledgerCounts.projectedForeground) ?? 0,
      projectedForegroundDroppedBeforeRetentionCount: finiteNumber(ledgerCounts.projectedForegroundDroppedBeforeRetention) ?? 0,
      retainedForegroundCount: finiteNumber(ledgerCounts.retainedForeground) ?? 0,
      orderedForegroundCount: finiteNumber(ledgerCounts.orderedForeground) ?? 0,
      projectedForegroundOcclusionWeight: finiteNumber(ledgerMetrics.projectedForegroundOcclusionWeight) ?? 0,
      projectedForegroundDroppedBeforeRetentionOcclusionWeight: finiteNumber(
        ledgerMetrics.projectedForegroundDroppedBeforeRetentionOcclusionWeight
      ) ?? 0,
      retainedForegroundOcclusionWeight: finiteNumber(ledgerMetrics.retainedForegroundOcclusionWeight) ?? 0,
      orderedForegroundOcclusionWeight: finiteNumber(ledgerMetrics.orderedForegroundOcclusionWeight) ?? 0,
      finalForegroundAlpha: finalForegroundAlpha ?? null,
    };
  });
  return {
    status: !capture
      ? "not-captured"
      : anchorSummaries.length === 0
        ? "empty"
        : routeStatus !== "ok"
          ? "malformed"
          : anchorSummaries.some((anchor) => !anchor.traceComplete)
            ? "partial"
            : "present",
    captureId: capture?.id || "",
    screenshotPath: capture?.screenshotPath || "",
    anchorCount: anchorSummaries.length,
    anchors: anchorSummaries,
    changedPixelRatio: finiteNumber(capture?.imageAnalysis?.changedPixelRatio) ?? 0,
    routeStatus,
  };
}

function summarizeOperatorVisibleTraceCanvasParity(capture, anchors = []) {
  const rawTraceCanvasParity = capture?.pageEvidence?.witness?.traceCanvasParity;
  if (!rawTraceCanvasParity) {
    return {
      status: "missing",
      kind: "missing",
      severity: "blocked",
      predictionSource: "",
      liveCompositorInputReadbackStatus: "",
      anchorCount: 0,
      matchedAnchorCount: 0,
      mismatchCount: 0,
      blockerCount: anchors.length,
      missingAnchorIds: anchors.map((anchor) => anchor.id),
      maxDelta: 0,
      summary: "Operator-visible bad-pixel trace/canvas parity evidence is missing.",
    };
  }
  const classification = classifyTraceCanvasParityWitness(rawTraceCanvasParity);
  const evidence = classification.evidence && typeof classification.evidence === "object"
    ? classification.evidence
    : {};
  const parityAnchors = Array.isArray(evidence.anchors) ? evidence.anchors : [];
  const parityAnchorsById = new Map(
    parityAnchors
      .map((anchor) => [stringValue(anchor?.id), anchor])
      .filter(([id]) => id !== "")
  );
  const missingAnchorIds = anchors
    .map((anchor) => anchor.id)
    .filter((id) => !parityAnchorsById.has(id));
  const mismatchAnchors = parityAnchors.filter((anchor) => anchor?.status === "mismatch");
  const matchedAnchors = parityAnchors.filter((anchor) => anchor?.status === "match");
  const blockedReasons = Array.isArray(evidence.blockedReasons) ? evidence.blockedReasons : [];
  const maxDelta = finiteNumber(evidence.maxDelta) ?? mismatchAnchors.reduce(
    (max, anchor) => Math.max(max, finiteNumber(anchor?.maxDelta) ?? 0),
    0
  );
  if (missingAnchorIds.length > 0) {
    return {
      status: TRACE_CANVAS_PARITY_KINDS.calibrationBlocked,
      kind: TRACE_CANVAS_PARITY_KINDS.calibrationBlocked,
      severity: "blocked",
      predictionSource: stringValue(evidence.predictionSource),
      liveCompositorInputReadbackStatus: stringValue(evidence.liveCompositorInputReadbackStatus),
      anchorCount: parityAnchors.length,
      matchedAnchorCount: matchedAnchors.length,
      mismatchCount: mismatchAnchors.length,
      blockerCount: missingAnchorIds.length + mismatchAnchors.length + blockedReasons.length,
      missingAnchorIds,
      maxDelta,
      summary: `Trace/canvas parity omitted operator-visible anchors: ${missingAnchorIds.join(", ")}.`,
    };
  }
  return {
    status: classification.status,
    kind: classification.kind,
    severity: classification.severity,
    predictionSource: stringValue(evidence.predictionSource),
    liveCompositorInputReadbackStatus: stringValue(evidence.liveCompositorInputReadbackStatus),
    anchorCount: parityAnchors.length,
    matchedAnchorCount: matchedAnchors.length,
    mismatchCount: mismatchAnchors.length,
    blockerCount: classification.status === TRACE_CANVAS_PARITY_KINDS.match
      ? 0
      : Math.max(1, mismatchAnchors.length + blockedReasons.length),
    missingAnchorIds,
    maxDelta,
    summary: classification.summary,
  };
}

function summarizeOperatorVisibleBadPixelTrace(capture, expectedRoute = {}) {
  const anchors = normalizeStaticDessertOperatorVisibleBadPixelAnchors(capture?.operatorVisibleBadPixelAnchors);
  const routeStatus = operatorVisibleBadPixelTraceRouteStatus(capture, anchors, expectedRoute);
  const tileLocal = capture?.pageEvidence?.tileLocal;
  const accumulationById = new Map(
    (Array.isArray(tileLocal?.perPixelFinalColorAccumulation) ? tileLocal.perPixelFinalColorAccumulation : [])
      .map((trace) => [trace?.anchorPixel?.id, trace])
      .filter(([id]) => typeof id === "string")
  );
  const ledgersById = new Map(
    (Array.isArray(tileLocal?.perPixelRetainedToOrderedSurvivalLedger?.anchorLedgers)
      ? tileLocal.perPixelRetainedToOrderedSurvivalLedger.anchorLedgers
      : [])
      .map((ledger) => [ledger?.anchorPixel?.id, ledger])
      .filter(([id]) => typeof id === "string")
  );
  const anchorSummaries = anchors.map((anchor) => {
    const accumulation = accumulationById.get(anchor.id);
    const ledger = ledgersById.get(anchor.id);
    const hasFinalAccumulation = Boolean(accumulation?.finalColorAccumulation);
    const hasSurvivalLedger = Boolean(ledger);
    const accumulationAnchorMatches = anchorPixelMatches(anchor, accumulation?.anchorPixel);
    const ledgerAnchorMatches = anchorPixelMatches(anchor, ledger?.anchorPixel);
    const outputColor = Array.isArray(accumulation?.finalColorAccumulation?.outputColor)
      ? accumulation.finalColorAccumulation.outputColor
      : [];
    const outputAlpha = finiteNumber(outputColor[3]);
    const remainingTransmittance = finiteNumber(accumulation?.finalColorAccumulation?.remainingTransmittance);
    const outputLuma = outputColor.length >= 3
      ? rgbLuma([
        (finiteNumber(outputColor[0]) ?? 0) * 255,
        (finiteNumber(outputColor[1]) ?? 0) * 255,
        (finiteNumber(outputColor[2]) ?? 0) * 255,
      ])
      : undefined;
    const category = ledger?.category || "unclassified";
    const ledgerCounts = ledger?.counts && typeof ledger.counts === "object" ? ledger.counts : {};
    const ledgerMetrics = ledger?.metrics && typeof ledger.metrics === "object" ? ledger.metrics : {};
    const finalForegroundAlpha = finiteNumber(ledger?.metrics?.finalForegroundAlpha);
    const hasAlphaTransferEvidence = outputAlpha !== undefined && remainingTransmittance !== undefined;
    const traceStatus = !accumulation
      ? "missing-final-accumulation"
      : !hasFinalAccumulation
        ? "missing-final-accumulation-record"
        : !hasSurvivalLedger
          ? "missing-survival-ledger"
          : !accumulationAnchorMatches
            ? "final-accumulation-anchor-mismatch"
            : !ledgerAnchorMatches
              ? "survival-ledger-anchor-mismatch"
              : !hasAlphaTransferEvidence
                ? "missing-alpha-transfer-evidence"
                : accumulation.status || "present";
    return {
      ...anchor,
      traceStatus,
      traceComplete: hasFinalAccumulation && hasSurvivalLedger && accumulationAnchorMatches && ledgerAnchorMatches && hasAlphaTransferEvidence,
      finalStepCount: Array.isArray(accumulation?.finalColorAccumulation?.steps)
        ? accumulation.finalColorAccumulation.steps.length
        : 0,
      outputAlpha: outputAlpha ?? null,
      remainingTransmittance: remainingTransmittance ?? null,
      outputLuma: outputLuma === undefined ? null : roundMetric(outputLuma),
      category,
      mechanism: ledger?.mechanism || "unclassified",
      projectedForegroundCount: finiteNumber(ledgerCounts.projectedForeground) ?? 0,
      retainedForegroundCount: finiteNumber(ledgerCounts.retainedForeground) ?? 0,
      orderedForegroundCount: finiteNumber(ledgerCounts.orderedForeground) ?? 0,
      projectedForegroundOcclusionWeight: finiteNumber(ledgerMetrics.projectedForegroundOcclusionWeight) ?? 0,
      retainedForegroundOcclusionWeight: finiteNumber(ledgerMetrics.retainedForegroundOcclusionWeight) ?? 0,
      orderedForegroundOcclusionWeight: finiteNumber(ledgerMetrics.orderedForegroundOcclusionWeight) ?? 0,
      finalForegroundAlpha: finalForegroundAlpha ?? null,
    };
  });
  const traceCanvasParity = summarizeOperatorVisibleTraceCanvasParity(capture, anchorSummaries);
  return {
    status: !capture
      ? "not-captured"
      : anchorSummaries.length === 0
        ? "empty"
        : routeStatus !== "ok"
          ? "malformed"
          : anchorSummaries.some((anchor) => !anchor.traceComplete)
            ? "partial"
            : "present",
    captureId: capture?.id || "",
    screenshotPath: capture?.screenshotPath || "",
    anchorCount: anchorSummaries.length,
    anchors: anchorSummaries,
    changedPixelRatio: finiteNumber(capture?.imageAnalysis?.changedPixelRatio) ?? 0,
    routeStatus,
    traceCanvasParity,
  };
}

function visualGapTraceRouteStatus(capture, anchors, expectedRoute = {}) {
  if (!capture) {
    return "not-captured";
  }
  if (!capture.classification?.harnessPassed) {
    return "visual-gap trace capture did not pass visual smoke classification";
  }
  if (!capture.classification?.realSplatEvidence) {
    return "visual-gap trace capture did not report real Scaniverse splat evidence";
  }
  const label = rendererLabel(capture);
  if (!label.includes("tile-local-visible") || label.includes("-debug-")) {
    return `visual-gap trace capture reported renderer label ${rendererLabel(capture) || "missing"}`;
  }
  const routeIdentity = capture.routeIdentity && typeof capture.routeIdentity === "object"
    ? capture.routeIdentity
    : {};
  const routeChecks = [
    ["assetPath", expectedRoute.assetPath],
    ["witnessView", expectedRoute.witnessView],
    ["renderer", "tile-local-visible"],
    ["arenaBackend", DEFAULT_STATIC_TILE_LOCAL_ROUTE.arenaBackend],
    ["tileSizePx", DEFAULT_STATIC_TILE_LOCAL_ROUTE.tileSizePx],
    ["maxRefsPerTile", DEFAULT_STATIC_TILE_LOCAL_ROUTE.maxRefsPerTile],
    ["wgslProjectedRefStream", expectedRoute.wgslProjectedRefStream],
    ["effectiveWgslProjectedRefStream", expectedRoute.effectiveWgslProjectedRefStream],
  ];
  for (const [field, expected] of routeChecks) {
    const actual = routeValue(capture, routeIdentity, field);
    if (stringValue(expected) !== "" && actual !== stringValue(expected)) {
      return `visual-gap trace route carried ${actual || "missing"} ${field} instead of ${expected}`;
    }
  }
  const traceAnchors = routeValue(capture, routeIdentity, "traceAnchors");
  const expectedTraceAnchors = encodeStaticDessertTraceAnchors(anchors);
  if (traceAnchors !== expectedTraceAnchors) {
    return `visual-gap trace route carried ${traceAnchors || "missing"} trace anchors instead of ${expectedTraceAnchors || "none"}`;
  }
  if (routeValue(capture, routeIdentity, "traceAnchor") !== "") {
    return "visual-gap trace route carried stale singular traceAnchor";
  }
  const presentationAnchorFields = [
    "presentationAnchors",
    "presentationAnchor",
    "tileLocalPresentationAnchors",
    "tileLocalPresentationAnchor",
  ];
  if (presentationAnchorFields.some((field) => routeValue(capture, routeIdentity, field) !== "")) {
    return "visual-gap trace route carried presentation anchors";
  }
  if (routeValue(capture, routeIdentity, "tileDebug") !== "" || routeValue(capture, routeIdentity, "debug") !== "") {
    return "visual-gap trace route carried debug mode params";
  }
  const presentationScope = routeValue(capture, routeIdentity, "presentationScope");
  if (presentationScope !== "" && presentationScope !== "full-scene") {
    return `visual-gap trace route carried presentation scope ${presentationScope}`;
  }
  const stalePresentationScopeFields = [
    "presentationMode",
    "tileLocalPresentationScope",
    "tileLocalPresentationMode",
  ];
  const stalePresentationScope = stalePresentationScopeFields.find((field) => routeValue(capture, routeIdentity, field) !== "");
  if (stalePresentationScope) {
    return `visual-gap trace route carried stale ${stalePresentationScope}`;
  }
  return "ok";
}

function operatorVisibleBadPixelTraceRouteStatus(capture, anchors, expectedRoute = {}) {
  if (!capture) {
    return "not-captured";
  }
  if (!capture.classification?.harnessPassed) {
    return "operator-visible bad-pixel trace capture did not pass visual smoke classification";
  }
  if (!capture.classification?.realSplatEvidence) {
    return "operator-visible bad-pixel trace capture did not report real Scaniverse splat evidence";
  }
  const label = rendererLabel(capture);
  if (!label.includes("tile-local-visible") || label.includes("-debug-")) {
    return `operator-visible bad-pixel trace capture reported renderer label ${rendererLabel(capture) || "missing"}`;
  }
  const routeIdentity = capture.routeIdentity && typeof capture.routeIdentity === "object"
    ? capture.routeIdentity
    : {};
  const routeChecks = [
    ["assetPath", expectedRoute.assetPath],
    ["witnessView", expectedRoute.witnessView],
    ["renderer", "tile-local-visible"],
    ["arenaBackend", DEFAULT_STATIC_TILE_LOCAL_ROUTE.arenaBackend],
    ["tileSizePx", DEFAULT_STATIC_TILE_LOCAL_ROUTE.tileSizePx],
    ["maxRefsPerTile", DEFAULT_STATIC_TILE_LOCAL_ROUTE.maxRefsPerTile],
    ["wgslProjectedRefStream", expectedRoute.wgslProjectedRefStream],
    ["effectiveWgslProjectedRefStream", expectedRoute.effectiveWgslProjectedRefStream],
  ];
  for (const [field, expected] of routeChecks) {
    const actual = routeValue(capture, routeIdentity, field);
    if (stringValue(expected) !== "" && actual !== stringValue(expected)) {
      return `operator-visible bad-pixel trace route carried ${actual || "missing"} ${field} instead of ${expected}`;
    }
  }
  const traceAnchors = routeValue(capture, routeIdentity, "traceAnchors");
  const expectedTraceAnchors = encodeStaticDessertOperatorVisibleBadPixelTraceAnchors(anchors);
  if (traceAnchors !== expectedTraceAnchors) {
    return `operator-visible bad-pixel trace route carried ${traceAnchors || "missing"} trace anchors instead of ${expectedTraceAnchors || "none"}`;
  }
  if (routeValue(capture, routeIdentity, "traceAnchor") !== "") {
    return "operator-visible bad-pixel trace route carried stale singular traceAnchor";
  }
  const presentationAnchorFields = [
    "presentationAnchors",
    "presentationAnchor",
    "tileLocalPresentationAnchors",
    "tileLocalPresentationAnchor",
  ];
  if (presentationAnchorFields.some((field) => routeValue(capture, routeIdentity, field) !== "")) {
    return "operator-visible bad-pixel trace route carried presentation anchors";
  }
  if (routeValue(capture, routeIdentity, "tileDebug") !== "" || routeValue(capture, routeIdentity, "debug") !== "") {
    return "operator-visible bad-pixel trace route carried debug mode params";
  }
  const presentationScope = routeValue(capture, routeIdentity, "presentationScope");
  if (presentationScope !== "" && presentationScope !== "full-scene") {
    return `operator-visible bad-pixel trace route carried presentation scope ${presentationScope}`;
  }
  const stalePresentationScopeFields = [
    "presentationMode",
    "tileLocalPresentationScope",
    "tileLocalPresentationMode",
  ];
  const stalePresentationScope = stalePresentationScopeFields.find((field) => routeValue(capture, routeIdentity, field) !== "");
  if (stalePresentationScope) {
    return `operator-visible bad-pixel trace route carried stale ${stalePresentationScope}`;
  }
  return "ok";
}

function staticFinalColorRouteStatus(capture) {
  if (!capture) {
    return "ok";
  }
  const label = rendererLabel(capture);
  if (!label.includes("tile-local-visible") || label.includes("-debug-")) {
    return `Final-color capture reported renderer label ${label || "missing"}.`;
  }
  const routeIdentity = capture.routeIdentity && typeof capture.routeIdentity === "object"
    ? capture.routeIdentity
    : {};
  const debugParam = ["tileDebug", "debug"].find((field) => routeValue(capture, routeIdentity, field) !== "");
  if (debugParam) {
    return `Final-color capture carried debug route param ${debugParam}.`;
  }
  const traceParam = TRACE_ROUTE_PARAMS.find((field) => routeValue(capture, routeIdentity, field) !== "");
  if (traceParam) {
    return `Final-color capture carried trace route param ${traceParam}.`;
  }
  const presentationAnchorFields = [
    "presentationAnchors",
    "presentationAnchor",
    "tileLocalPresentationAnchors",
    "tileLocalPresentationAnchor",
  ];
  const presentationParam = presentationAnchorFields.find((field) => routeValue(capture, routeIdentity, field) !== "");
  if (presentationParam) {
    return `Final-color capture carried presentation route param ${presentationParam}.`;
  }
  const presentationScope = routeValue(capture, routeIdentity, "presentationScope");
  if (presentationScope !== "" && presentationScope !== "full-scene") {
    return `Final-color capture carried presentation scope ${presentationScope}.`;
  }
  const stalePresentationScope = [
    "presentationMode",
    "tileLocalPresentationScope",
    "tileLocalPresentationMode",
  ].find((field) => routeValue(capture, routeIdentity, field) !== "");
  if (stalePresentationScope) {
    return `Final-color capture carried presentation route param ${stalePresentationScope}.`;
  }
  return "ok";
}

function staticTileLocalRouteExpectation(finalColorCapture = {}) {
  const identity = finalColorCapture?.routeIdentity && typeof finalColorCapture.routeIdentity === "object"
    ? finalColorCapture.routeIdentity
    : {};
  const requestedWgslProjectedRefStream = routeValue(finalColorCapture, identity, "wgslProjectedRefStream");
  return {
    assetPath: stringValue(identity.assetPath) || assetPath(finalColorCapture),
    witnessView: stringValue(identity.witnessView) || "default",
    wgslProjectedRefStream: requestedWgslProjectedRefStream,
    requestedWgslProjectedRefStream,
    effectiveWgslProjectedRefStream: routeValue(finalColorCapture, identity, "effectiveWgslProjectedRefStream"),
  };
}

function routeValue(capture, routeIdentity, field) {
  const searchParams = searchParamsFromCapture(capture);
  if (searchParams?.has(field)) {
    return stringValue(searchParams.get(field));
  }
  return stringValue(routeIdentity?.[field]);
}

function searchParamsFromCapture(capture) {
  if (!capture?.url) {
    return null;
  }
  try {
    return new URL(capture.url).searchParams;
  } catch {
    return null;
  }
}

function anchorPixelMatches(anchor, anchorPixel) {
  return (
    anchorPixel &&
    stringValue(anchorPixel.id) === anchor.id &&
    Math.floor(finiteNumber(anchorPixel.x) ?? -1) === anchor.x &&
    Math.floor(finiteNumber(anchorPixel.y) ?? -1) === anchor.y
  );
}

function classifyPlateSeepageFromVisualGapTrace(visualGapTrace = {}, expectedRoute = {}) {
  const anchors = Array.isArray(visualGapTrace.anchors) ? visualGapTrace.anchors : [];
  const sourceRoute = sourceRouteLabel(
    expectedRoute.effectiveWgslProjectedRefStream || expectedRoute.wgslProjectedRefStream
  );
  const base = {
    status: "blocked",
    category: "unclassified",
    stage: "trace",
    sourceRoute,
    anchorCount: anchors.length,
    classifiedAnchorCount: 0,
    mechanismCounts: {},
    blockerCount: anchors.length,
  };
  if (visualGapTrace.status === "not-captured") {
    return { ...base, category: "trace-missing", stage: "trace-capture" };
  }
  if (visualGapTrace.status === "empty") {
    return { ...base, category: "trace-empty", stage: "trace-anchor-derivation", blockerCount: 0 };
  }
  if (visualGapTrace.status === "malformed") {
    return { ...base, category: "trace-route-malformed", stage: "trace-route" };
  }
  if (visualGapTrace.status === "partial") {
    return {
      ...base,
      category: "trace-incomplete",
      stage: "trace-readback",
      blockerCount: anchors.filter((anchor) => !anchor.traceComplete).length,
    };
  }
  if (visualGapTrace.status !== "present") {
    return base;
  }

  const completeAnchors = anchors.filter((anchor) => anchor.traceComplete);
  const mechanismCounts = countBy(
    completeAnchors.map((anchor) => anchor.mechanism || "unclassified")
  );
  const categories = new Set(completeAnchors.map(plateSeepageCategoryForAnchor));
  const blockerCount = completeAnchors.filter((anchor) => (
    anchor.category === "trace-blocked" ||
    anchor.category === "unclassified" ||
    anchor.mechanism === "unclassified"
  )).length;
  const classification = classifyPlateSeepageCategories(categories);
  return {
    status: blockerCount > 0 || classification.category === "unclassified" ? "blocked" : "classified",
    category: classification.category,
    stage: classification.stage,
    sourceRoute,
    anchorCount: anchors.length,
    classifiedAnchorCount: completeAnchors.length - blockerCount,
    mechanismCounts,
    blockerCount,
  };
}

function classifyOperatorVisibleBadPixelsFromTrace(operatorVisibleBadPixelTrace = {}, expectedRoute = {}) {
  const anchors = Array.isArray(operatorVisibleBadPixelTrace.anchors) ? operatorVisibleBadPixelTrace.anchors : [];
  const sourceRoute = sourceRouteLabel(
    expectedRoute.effectiveWgslProjectedRefStream || expectedRoute.wgslProjectedRefStream
  );
  const base = {
    status: "blocked",
    category: "unclassified",
    stage: "trace",
    sourceRoute,
    anchorCount: anchors.length,
    classifiedAnchorCount: 0,
    blockerCount: anchors.length,
  };
  if (operatorVisibleBadPixelTrace.status === "not-captured") {
    return { ...base, status: "not-captured", category: "not-captured", stage: "trace-capture", blockerCount: 0 };
  }
  if (operatorVisibleBadPixelTrace.status === "empty") {
    return { ...base, status: "empty", category: "no-operator-visible-bad-pixels", stage: "anchor-derivation", blockerCount: 0 };
  }
  if (operatorVisibleBadPixelTrace.status === "malformed") {
    return { ...base, category: "trace-route-malformed", stage: "trace-route" };
  }
  if (operatorVisibleBadPixelTrace.status === "partial") {
    return {
      ...base,
      category: "trace-incomplete",
      stage: "trace-readback",
      blockerCount: anchors.filter((anchor) => !anchor.traceComplete).length,
    };
  }
  if (operatorVisibleBadPixelTrace.status !== "present") {
    return base;
  }
  if (!operatorVisibleTraceCanvasParityIsAttributionGrade(operatorVisibleBadPixelTrace.traceCanvasParity)) {
    return {
      ...base,
      category: "trace-canvas-parity-blocked",
      stage: "trace-canvas-parity",
      blockerCount: Math.max(1, finiteNumber(operatorVisibleBadPixelTrace.traceCanvasParity?.blockerCount) ?? anchors.length),
    };
  }
  const alphaSealedMismatchCount = anchors.filter((anchor) => (
    anchor.traceComplete &&
    anchor.category === "ordered-present" &&
    (finiteNumber(anchor.remainingTransmittance) ?? 1) <= MAX_VISUAL_GAP_REMAINING_TRANSMITTANCE_FOR_SEALED &&
    (finiteNumber(anchor.outputAlpha) ?? 0) >= MIN_VISUAL_GAP_ALPHA_FOR_SEALED &&
    (finiteNumber(anchor.finalForegroundAlpha) ?? 0) >= MIN_VISUAL_GAP_ALPHA_FOR_SEALED
  )).length;
  if (alphaSealedMismatchCount > 0) {
    return {
      ...base,
      status: "classified",
      category: "alpha-sealed-rgb-transfer-mismatch",
      stage: "color-transfer-after-alpha-seal",
      classifiedAnchorCount: alphaSealedMismatchCount,
      blockerCount: 0,
    };
  }
  return {
    ...base,
    status: "blocked",
    category: "operator-visible-bad-pixels-unclassified",
    stage: "visual-evidence",
    classifiedAnchorCount: 0,
    blockerCount: anchors.length,
  };
}

function operatorVisibleTraceCanvasParityIsAttributionGrade(traceCanvasParity = {}) {
  return (
    traceCanvasParity.status === TRACE_CANVAS_PARITY_KINDS.match &&
    traceCanvasParity.predictionSource === "live-compositor-input-readback" &&
    traceCanvasParity.liveCompositorInputReadbackStatus === "present"
  );
}

function plateSeepageCategoryForAnchor(anchor = {}) {
  const category = anchor.category || "unclassified";
  if (category === "ordered-present" && visualGapAnchorHasWeakFinalAlpha(anchor)) {
    if (!visualGapAnchorHasProjectedForegroundAuthority(anchor)) {
      return "ordered-present-foreground-support-underfilled";
    }
    return "ordered-present-final-alpha-weak";
  }
  return category;
}

function visualGapAnchorHasWeakFinalAlpha(anchor = {}) {
  const remainingTransmittance = finiteNumber(anchor.remainingTransmittance);
  if (remainingTransmittance !== undefined && remainingTransmittance > MAX_VISUAL_GAP_REMAINING_TRANSMITTANCE_FOR_SEALED) {
    return true;
  }
  const outputAlpha = finiteNumber(anchor.outputAlpha);
  if (outputAlpha !== undefined && outputAlpha < MIN_VISUAL_GAP_ALPHA_FOR_SEALED) {
    return true;
  }
  const finalForegroundAlpha = finiteNumber(anchor.finalForegroundAlpha);
  return finalForegroundAlpha !== undefined && finalForegroundAlpha < MIN_VISUAL_GAP_ALPHA_FOR_SEALED;
}

function visualGapAnchorHasProjectedForegroundAuthority(anchor = {}) {
  const projectedForegroundCount = finiteNumber(anchor.projectedForegroundCount) ?? 0;
  const projectedForegroundDroppedCount = finiteNumber(anchor.projectedForegroundDroppedBeforeRetentionCount) ?? 0;
  const projectedForegroundWeight = finiteNumber(anchor.projectedForegroundOcclusionWeight) ?? 0;
  const projectedForegroundDroppedWeight = finiteNumber(anchor.projectedForegroundDroppedBeforeRetentionOcclusionWeight) ?? 0;
  return (
    projectedForegroundCount > 0 ||
    projectedForegroundDroppedCount > 0 ||
    projectedForegroundWeight > 0 ||
    projectedForegroundDroppedWeight > 0
  );
}

function classifyPlateSeepageCategories(categories) {
  if (categories.has("narrower-role-source-blocker") || categories.has("no-retained-foreground-role-support")) {
    return { category: "source-role-loss", stage: "source-construction" };
  }
  if (categories.has("projected-foreground-dropped-before-retention")) {
    return { category: "tile-list-loss", stage: "retention-election" };
  }
  if (categories.has("retained-missing-from-order")) {
    return { category: "ordering-loss", stage: "compositor-order" };
  }
  if (categories.has("ordered-present-foreground-support-underfilled")) {
    return { category: "coverage-underfill", stage: "source-frontier-coverage" };
  }
  if (categories.has("ordered-present-final-alpha-weak")) {
    return { category: "alpha-under-accumulation", stage: "alpha-transfer" };
  }
  if (categories.size > 0 && [...categories].every((category) => category === "ordered-present")) {
    return { category: "no-seepage", stage: "foreground-survived" };
  }
  if (categories.has("trace-blocked")) {
    return { category: "trace-blocked", stage: "trace-readback" };
  }
  return { category: "unclassified", stage: "unknown" };
}

function sourceRouteLabel(wgslProjectedRefStream) {
  const stream = stringValue(wgslProjectedRefStream);
  if (stream.startsWith("wgsl-projected-ref-stream-")) {
    return stream;
  }
  if (stream === "source-frontier") {
    return "wgsl-projected-ref-stream-source-frontier";
  }
  if (stream !== "") {
    return `wgsl-projected-ref-stream-${stream}`;
  }
  return "default-retained-source";
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = stringValue(value) || "unclassified";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function staticDessertObservations(plateSeepageClassification = {}, metrics = {}) {
  const plateSeepageStatus = plateSeepageClassification.status === "classified"
    ? "classified-for-review"
    : "captured-for-review";
  const plateSeepageBoundary = plateSeepageClassification.status === "classified"
    ? `Plate/background seepage is classified at ${plateSeepageClassification.stage} (${plateSeepageClassification.category}) for ${plateSeepageClassification.sourceRoute}.`
    : "Plate/background seepage is witnessed through final color plus alpha/transmittance debug modes, not by opacity tuning.";
  const visibleHoleClassification = classifyVisibleHoleObservation(plateSeepageClassification, metrics);
  return {
    visibleHoles: {
      status: visibleHoleClassification.status,
      category: visibleHoleClassification.category,
      stage: visibleHoleClassification.stage,
      evidenceIds: visibleHoleClassification.evidenceIds,
      boundary: visibleHoleClassification.boundary,
    },
    plateSeepage: {
      status: plateSeepageStatus,
      evidenceIds: [
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.finalColor,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.accumulatedAlpha,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.transmittance,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.visualGapTrace,
      ],
      boundary: plateSeepageBoundary,
    },
    budgetSkip: {
      status: "separate-high-viewport-observation",
      evidenceIds: [],
      boundary: "High-viewport stale/cached-frame skips are not collapsed into the fixed 1280x720 final-color artifact.",
      repro: "Run the same smoke URL at a high viewport such as 3456x1916 and capture overlay text containing `tile-local skipped: projected tile refs exceed budget`.",
    },
  };
}

function classifyVisibleHoleObservation(plateSeepageClassification = {}, metrics = {}) {
  const operatorVisibleBadPixelClassification = metrics.operatorVisibleBadPixelClassification ?? {};
  if (operatorVisibleBadPixelClassification.category === "alpha-sealed-rgb-transfer-mismatch") {
    return {
      status: "classified-for-review",
      category: "operator-visible-bad-pixels",
      stage: "color-transfer-after-alpha-seal",
      evidenceIds: [
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.finalColor,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.operatorVisibleBadPixelTrace,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.accumulatedAlpha,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.transmittance,
      ],
      boundary:
        `Operator-visible bad pixels remain after alpha/transmittance seal and foreground survival; ${operatorVisibleBadPixelClassification.classifiedAnchorCount || 0} traced anchors route the next repair to RGB/color-transfer or support-footprint semantics instead of plate-seepage closure.`,
    };
  }
  const conicAnisotropy = finiteNumber(metrics.conicShape?.maxAnisotropy) ?? 0;
  const tileLocalToPlateRatio = finiteNumber(metrics.rendererBridge?.tileLocalToPlateChangedPixelRatio) ?? 0;
  const plateSeepageSealed =
    plateSeepageClassification.status === "classified" &&
    plateSeepageClassification.category === "no-seepage";
  if (plateSeepageSealed && conicAnisotropy >= 8 && tileLocalToPlateRatio > 1) {
    return {
    status: "classified-for-review",
    category: "conic-coverage-pressure",
    stage: "conic-coverage-support",
    evidenceIds: [
      STATIC_DESSERT_WITNESS_CAPTURE_IDS.finalColor,
      STATIC_DESSERT_WITNESS_CAPTURE_IDS.coverageWeight,
      STATIC_DESSERT_WITNESS_CAPTURE_IDS.conicShape,
    ],
    boundary:
      `Porous/non-square final-color gaps remain after plate seepage sealed; conic anisotropy ${formatObservationMetric(conicAnisotropy)} and tile-local/plate changed-pixel ratio ${formatObservationMetric(tileLocalToPlateRatio)} route the next repair to conic/coverage support, not alpha transfer.`,
  };
  }
  return {
    status: "captured-for-review",
    category: "unclassified",
    stage: "visual-evidence",
    evidenceIds: [
      STATIC_DESSERT_WITNESS_CAPTURE_IDS.finalColor,
      STATIC_DESSERT_WITNESS_CAPTURE_IDS.coverageWeight,
      STATIC_DESSERT_WITNESS_CAPTURE_IDS.conicShape,
    ],
    boundary: "Porous/non-square final-color gaps are witnessed separately from tile-ref density and alpha transfer.",
  };
}

function formatObservationMetric(value) {
  const number = finiteNumber(value);
  if (number === undefined) return "unknown";
  return Number.isInteger(number) ? String(number) : number.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function diagnostics(capture = {}) {
  return capture.pageEvidence?.tileLocal?.diagnostics ?? capture.pageEvidence?.tileLocalDiagnostics;
}

function rendererLabel(capture = {}) {
  return String(capture.pageEvidence?.rendererLabel ?? "").trim();
}

function assetPath(capture = {}) {
  return stringValue(capture.pageEvidence?.assetPath);
}

function tileRefs(capture = {}) {
  return finiteNumber(capture.pageEvidence?.tileLocal?.refs) ?? 0;
}

function normalizeRimBandSourceSupport(support = {}) {
  const crop = support && typeof support === "object" ? support.crop : {};
  return {
    crop: {
      x: finiteNumber(crop?.x) ?? 0,
      y: finiteNumber(crop?.y) ?? 0,
      width: finiteNumber(crop?.width) ?? 0,
      height: finiteNumber(crop?.height) ?? 0,
    },
    projectedCenterCount: finiteNumber(support?.projectedCenterCount) ?? 0,
    projectedSupportCount: finiteNumber(support?.projectedSupportCount) ?? 0,
    nearFloorMinorCount: finiteNumber(support?.nearFloorMinorCount) ?? 0,
    maxMajorRadiusPx: finiteNumber(support?.maxMajorRadiusPx) ?? 0,
    medianMajorRadiusPx: finiteNumber(support?.medianMajorRadiusPx) ?? 0,
    medianMinorRadiusPx: finiteNumber(support?.medianMinorRadiusPx) ?? 0,
    sampleOriginalIds: Array.isArray(support?.sampleOriginalIds) ? support.sampleOriginalIds.slice(0, 12) : [],
  };
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
      regions: {
        porousBody: normalizeRetentionAuditSummary(),
        centerLeakBand: normalizeRetentionAuditSummary(),
      },
    };
  }
  return {
    fullFrame: normalizeRetentionAuditSummary(retentionAudit.fullFrame),
    regions: {
      porousBody: normalizeRetentionAuditSummary(retentionAudit.regions?.porousBody),
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
