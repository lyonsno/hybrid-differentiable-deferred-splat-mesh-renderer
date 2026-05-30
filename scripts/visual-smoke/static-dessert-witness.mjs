export const STATIC_DESSERT_WITNESS_CAPTURE_IDS = {
  plateFinalColor: "plate-final-color",
  finalColor: "final-color",
  visualGapTrace: "visual-gap-trace",
  coverageWeight: "coverage-weight",
  accumulatedAlpha: "accumulated-alpha",
  transmittance: "transmittance",
  tileRefCount: "tile-ref-count",
  conicShape: "conic-shape",
};

const REQUIRED_CAPTURE_IDS = new Set(
  Object.values(STATIC_DESSERT_WITNESS_CAPTURE_IDS)
    .filter((id) => id !== STATIC_DESSERT_WITNESS_CAPTURE_IDS.visualGapTrace)
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

  const closeable = findings.length === 0;
  return {
    closeable,
    summary: {
      status: closeable ? "PASS" : "FAIL",
      text: closeable
        ? "PASS: static dessert final color and debug witnesses share one asset, viewport, and tile grid."
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
    },
    observations: staticDessertObservations(),
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
    url: url.toString().replaceAll("%2F", "/"),
  };
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
              : accumulation.status || "present";
    return {
      ...anchor,
      traceStatus,
      traceComplete: hasFinalAccumulation && hasSurvivalLedger && accumulationAnchorMatches && ledgerAnchorMatches,
      finalStepCount: Array.isArray(accumulation?.finalColorAccumulation?.steps)
        ? accumulation.finalColorAccumulation.steps.length
        : 0,
      outputAlpha: finiteNumber(accumulation?.finalColorAccumulation?.outputColor?.[3]) ?? 0,
      remainingTransmittance: finiteNumber(accumulation?.finalColorAccumulation?.remainingTransmittance) ?? 1,
      category: ledger?.category || "unclassified",
      mechanism: ledger?.mechanism || "unclassified",
      retainedForegroundCount: finiteNumber(ledger?.counts?.retainedForeground) ?? 0,
      orderedForegroundCount: finiteNumber(ledger?.counts?.orderedForeground) ?? 0,
      finalForegroundAlpha: finiteNumber(ledger?.metrics?.finalForegroundAlpha) ?? 0,
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
  return {
    assetPath: stringValue(identity.assetPath) || assetPath(finalColorCapture),
    witnessView: stringValue(identity.witnessView) || "default",
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

function staticDessertObservations() {
  return {
    visibleHoles: {
      status: "captured-for-review",
      evidenceIds: [
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.finalColor,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.coverageWeight,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.conicShape,
      ],
      boundary: "Porous/non-square final-color gaps are witnessed separately from tile-ref density and alpha transfer.",
    },
    plateSeepage: {
      status: "captured-for-review",
      evidenceIds: [
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.finalColor,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.accumulatedAlpha,
        STATIC_DESSERT_WITNESS_CAPTURE_IDS.transmittance,
      ],
      boundary: "Plate/background seepage is witnessed through final color plus alpha/transmittance debug modes, not by opacity tuning.",
    },
    budgetSkip: {
      status: "separate-high-viewport-observation",
      evidenceIds: [],
      boundary: "High-viewport stale/cached-frame skips are not collapsed into the fixed 1280x720 final-color artifact.",
      repro: "Run the same smoke URL at a high viewport such as 3456x1916 and capture overlay text containing `tile-local skipped: projected tile refs exceed budget`.",
    },
  };
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
