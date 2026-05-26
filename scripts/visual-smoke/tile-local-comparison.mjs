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
  const arena = summarizeTileLocalArenaWitness({ plate, prepass, visible });
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
    metrics: {
      ...metrics,
      ...arena,
    },
    findings,
  };
}

export function extractTileLocalPageMetrics(pageEvidence = {}) {
  const statsText = pageEvidence.statsText ?? "";
  const parsedGrid = parseTileGrid(statsText);
  const skipReason = pageEvidence.tileLocalLastSkipReason
    ?? parseTileLocalSkipReason(statsText)
    ?? parseTileLocalBudgetGuardrailReason(pageEvidence.tileLocalDisabledReason)
    ?? parseTileLocalBudgetGuardrailReason(statsText);
  const parsedBudget = parseTileLocalBudget(statsText);
  const tileLocal = pageEvidence.tileLocal && typeof pageEvidence.tileLocal === "object" ? pageEvidence.tileLocal : {};
  const arenaRuntime = pageEvidence.arenaRuntime && typeof pageEvidence.arenaRuntime === "object" ? pageEvidence.arenaRuntime : {};
  const freshness = tileLocal.freshness
    ?? (/stale-cache/i.test(statsText) ? { status: "stale-cache" } : undefined);
  return {
    rendererLabel: pageEvidence.rendererLabel ?? parseRendererLabel(statsText),
    fps: finiteNumber(pageEvidence.fps) ?? parseFps(statsText),
    tileLocalLastSkipReason: skipReason,
    arenaRuntime: {
      requestedArenaBackend: optionalString(arenaRuntime.requestedArenaBackend),
      effectiveArenaBackend: optionalString(arenaRuntime.effectiveArenaBackend),
      cpuBuildDurationMs: finiteNumber(arenaRuntime.cpuBuildDurationMs),
      gpuDispatchEnqueueDurationMs:
        finiteNumber(arenaRuntime.gpuDispatchEnqueueDurationMs) ?? finiteNumber(arenaRuntime.gpuDispatchDurationMs),
      unavailableReason: optionalString(arenaRuntime.unavailableReason),
      skippedReason: optionalString(arenaRuntime.skippedReason),
    },
    tileLocal: {
      ...tileLocal,
      refs:
        positiveRefCount(tileLocal.refAccounting?.retainedRefs) ??
        positiveRefCount(tileLocal.refStatsReadback?.retainedRefs) ??
        positiveRefCount(tileLocal.refs) ??
        parsedGrid.refs ??
        positiveRefCount(tileLocal.allocatedRefs) ??
        0,
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

export function summarizeTileLocalArenaWitness({
  plate,
  prepass,
  visible,
} = {}) {
  const visibleArenaRuntime = arenaRuntimeEvidence(visible);
  const presentation = {
    plate: capturePresentationState(plate),
    prepass: capturePresentationState(prepass),
    visible: capturePresentationState(visible),
  };
  return {
    arenaBackend: visibleArenaBackend(visible),
    arenaState: classifyArenaRuntimeState(visibleArenaRuntime),
    cpuBuildDurationMs: visibleCpuBuildDurationMs(visible),
    gpuDispatchEnqueueDurationMs: visibleGpuDispatchEnqueueDurationMs(visible),
    arenaRuntime: visibleArenaRuntime,
    presentation,
    artifactMovement: summarizeArtifactMovement({ plate, visible }),
  };
}

export function classifyArenaRuntimeState(arenaRuntime = {}) {
  const requestedArenaBackend = String(arenaRuntime.requestedArenaBackend ?? "").trim();
  const effectiveArenaBackend = String(arenaRuntime.effectiveArenaBackend ?? "").trim();
  const cpuBridgeBuildDurationMs =
    finiteNumber(arenaRuntime.cpuBridgeBuildDurationMs) ?? finiteNumber(arenaRuntime.cpuBuildDurationMs);
  const gpuDispatchEnqueueDurationMs =
    finiteNumber(arenaRuntime.gpuDispatchEnqueueDurationMs) ?? finiteNumber(arenaRuntime.gpuDispatchDurationMs);
  const hasExplicitEvidence =
    requestedArenaBackend.length > 0 ||
    effectiveArenaBackend.length > 0 ||
    cpuBridgeBuildDurationMs !== undefined ||
    gpuDispatchEnqueueDurationMs !== undefined ||
    arenaRuntime.unavailableReason ||
    arenaRuntime.skippedReason ||
    arenaRuntime.fallbackReason;

  if (!hasExplicitEvidence) {
    return "not-reported";
  }

  const requestedGpu = requestedArenaBackend === "gpu";
  const effectiveGpu = effectiveArenaBackend === "gpu";

  if (requestedGpu) {
    if (effectiveGpu) {
      return cpuBridgeBuildDurationMs !== undefined
        ? "gpu-effective-with-cpu-bridge"
        : "gpu-effective-without-cpu-bridge";
    }
    if (arenaRuntime.fallbackReason || cpuBridgeBuildDurationMs !== undefined) {
      return "gpu-requested-cpu-fallback";
    }
    if (arenaRuntime.skippedReason) {
      return "gpu-blocked";
    }
    if (arenaRuntime.unavailableReason) {
      return "gpu-unavailable";
    }
    return "gpu-requested-unknown";
  }

  if (effectiveGpu) {
    return cpuBridgeBuildDurationMs !== undefined
      ? "gpu-effective-with-cpu-bridge"
      : "gpu-effective-without-cpu-bridge";
  }

  if (arenaRuntime.skippedReason) {
    return "cpu-blocked";
  }
  if (arenaRuntime.unavailableReason) {
    return "cpu-unavailable";
  }
  return "cpu";
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
  if (expectedRendererLabel.includes("tile-local")) {
    const tileLocal = pageEvidence.tileLocal && typeof pageEvidence.tileLocal === "object" ? pageEvidence.tileLocal : {};
    const hasFinalRows = Array.isArray(tileLocal.perPixelFinalColorAccumulation) &&
      tileLocal.perPixelFinalColorAccumulation.length > 0;
    const readbackStatus = tileLocal.outputTextureReadback?.status;
    const compositorInputReadbackStatus = tileLocal.compositorInputReadback?.status;
    const hasAnyReadbackSurface = readbackStatus !== undefined || compositorInputReadbackStatus !== undefined;
    if (hasFinalRows && hasAnyReadbackSurface && !["present", "blocked"].includes(readbackStatus)) {
      return false;
    }
    if (hasFinalRows && hasAnyReadbackSurface && !["present", "blocked"].includes(compositorInputReadbackStatus)) {
      return false;
    }
  }
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

function capturePresentationState(capture = {}) {
  const status = String(
    capture.pageEvidence?.tileLocalStatus ??
      capture.pageEvidence?.tileLocal?.freshness?.status ??
      ""
  ).trim();
  if (status === "budget-disabled") return "fallback";
  if (status === "stale-cache") return "stale";
  if (status === "current") return "current";
  if (capture.pageEvidence?.tileLocalDisabledReason || capture.pageEvidence?.tileLocalLastSkipReason) {
    return "fallback";
  }
  if (!status) return "not-applicable";
  return status;
}

function visibleArenaBackend(capture = {}) {
  return visibleGpuDispatchEnqueueDurationMs(capture) === undefined ? "gpu-unavailable" : "gpu";
}

function arenaRuntimeEvidence(capture = {}) {
  const arenaRuntime = capture.pageEvidence?.arenaRuntime;
  return arenaRuntime && typeof arenaRuntime === "object" ? arenaRuntime : {};
}

function visibleCpuBuildDurationMs(capture = {}) {
  const arenaRuntime = arenaRuntimeEvidence(capture);
  const runtimeBuildDurationMs =
    finiteNumber(arenaRuntime?.cpuBridgeBuildDurationMs) ?? finiteNumber(arenaRuntime?.cpuBuildDurationMs);
  if (runtimeBuildDurationMs !== undefined) {
    return runtimeBuildDurationMs;
  }
  const heat = capture?.pageEvidence?.tileLocal?.budgetDiagnostics?.heat;
  return finiteNumber(heat?.cpu?.buildDurationMs);
}

function visibleGpuDispatchEnqueueDurationMs(capture = {}) {
  const arenaRuntime = arenaRuntimeEvidence(capture);
  const runtimeDispatchEnqueueDurationMs =
    finiteNumber(arenaRuntime?.gpuDispatchEnqueueDurationMs) ?? finiteNumber(arenaRuntime?.gpuDispatchDurationMs);
  if (runtimeDispatchEnqueueDurationMs !== undefined) {
    return runtimeDispatchEnqueueDurationMs;
  }
  const heat = capture?.pageEvidence?.tileLocal?.budgetDiagnostics?.heat;
  return finiteNumber(heat?.gpu?.dispatchEnqueueDurationMs) ?? finiteNumber(heat?.gpu?.dispatchDurationMs);
}

function summarizeArtifactMovement({ plate, visible } = {}) {
  if (!plate || !visible) {
    return {
      status: "not-measured",
      summary: "Missing plate or visible capture.",
      visibleChangedPixelRatio: finiteNumber(visible?.imageAnalysis?.changedPixelRatio) ?? undefined,
      plateChangedPixelRatio: finiteNumber(plate?.imageAnalysis?.changedPixelRatio) ?? undefined,
      changedPixelDelta: undefined,
      visibleToPlateChangedPixelRatio: undefined,
    };
  }

  const plateChangedPixelRatio = finiteNumber(plate.imageAnalysis?.changedPixelRatio) ?? 0;
  const visibleChangedPixelRatio = finiteNumber(visible.imageAnalysis?.changedPixelRatio) ?? 0;
  const changedPixelDelta = visibleChangedPixelRatio - plateChangedPixelRatio;
  const visibleToPlateChangedPixelRatio = ratio(visibleChangedPixelRatio, plateChangedPixelRatio);
  const visibleLabel = rendererLabel(visible);
  const visibleBlockRatio = bridgeBlockRatio(visible);
  const visibleDistinctColors = distinctColorCount(visible);

  if (sameFingerprint(plate, visible)) {
    return {
      status: "unchanged",
      summary: "Visible capture matches the plate baseline fingerprint.",
      visibleChangedPixelRatio,
      plateChangedPixelRatio,
      changedPixelDelta,
      visibleToPlateChangedPixelRatio,
    };
  }

  if (
    visibleLabel.includes("stale-cache") ||
    visibleLabel.includes("bridge-diagnostic") ||
    visibleBlockRatio >= 0.5 ||
    visibleDistinctColors < 256
  ) {
    return {
      status: "regressed",
      summary:
        `Visible capture still shows tile-cell/block artifacts ` +
        `(bridge ratio ${formatRatio(visibleBlockRatio)}, ${visibleDistinctColors} distinct colors).`,
      visibleChangedPixelRatio,
      plateChangedPixelRatio,
      changedPixelDelta,
      visibleToPlateChangedPixelRatio,
    };
  }

  return {
    status: "moved",
    summary: `Visible capture diverged from plate by ${formatRatio(changedPixelDelta)} changed-pixel ratio.`,
    visibleChangedPixelRatio,
    plateChangedPixelRatio,
    changedPixelDelta,
    visibleToPlateChangedPixelRatio,
  };
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

function parseTileLocalBudgetGuardrailReason(text) {
  const match = /projected tile refs exceed budget:\s*[\d,]+\s*>\s*[\d,]+/i.exec(text ?? "");
  return match ? match[0].trim() : undefined;
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
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function positiveRefCount(value) {
  const number = finiteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function optionalString(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
