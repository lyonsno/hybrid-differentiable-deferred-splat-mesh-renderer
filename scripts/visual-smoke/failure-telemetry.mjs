import { normalizePageEvidence } from "./evidence.mjs";

export function buildTimeoutFailureCapture({
  capture = {},
  error,
  elapsedMs,
  pageEvidence = {},
  imageAnalysis,
  screenshotPath,
  consoleMessages = [],
  pageErrors = [],
} = {}) {
  const normalized = normalizePageEvidence(pageEvidence);
  const hasSmokeEvidence = [
    "sourceKind",
    "splatCount",
    "assetPath",
    "rendererLabel",
    "ready",
    "arenaRuntime",
    "tileLocal",
  ].some((key) => pageEvidence[key] !== undefined);
  const hasStatsText = typeof pageEvidence.statsText === "string" && pageEvidence.statsText.length > 0;
  const hasTileLocalDiagnostics = Boolean(
    pageEvidence.tileLocalDiagnostics ??
      (pageEvidence.tileLocal && typeof pageEvidence.tileLocal === "object" ? pageEvidence.tileLocal.diagnostics : undefined)
  );

  return {
    ...capture,
    screenshotPath,
    pageEvidence,
    imageAnalysis: imageAnalysis ?? emptyImageAnalysis(),
    classification: {
      nonblank: Boolean(imageAnalysis?.nonblank),
      realSplatEvidence: false,
      closeable: false,
      harnessPassed: false,
      sourceKind: normalized.sourceKind,
      splatCount: normalized.splatCount,
      assetPath: normalized.assetPath,
      summary: `FAIL: timed out waiting for ${capture.expectedRendererLabel || "visual smoke"} evidence.`,
      reasons: ["visual smoke readiness timed out before the capture became closeable"],
    },
    witnessDiagnostics: {
      thresholdPolicy: "not evaluated after readiness timeout",
      findings: [
        {
          kind: "visual-smoke-timeout",
          summary: error?.message ?? "Timed out waiting for rendered visual smoke evidence.",
        },
      ],
    },
    captureFailure: {
      kind: "visual-smoke-timeout",
      message: error?.message ?? "Timed out waiting for rendered visual smoke evidence.",
      expectedRendererLabel: capture.expectedRendererLabel ?? "",
      elapsedMs,
      telemetry: {
        smoke: hasSmokeEvidence,
        witness: Boolean(pageEvidence.witness),
        tileLocalDiagnostics: hasTileLocalDiagnostics,
        statsText: hasStatsText,
        url: Boolean(capture.url),
        viewport: Boolean(pageEvidence.canvas),
        screenshot: Boolean(screenshotPath),
      },
    },
    consoleMessages,
    pageErrors,
  };
}

function emptyImageAnalysis() {
  return {
    width: 0,
    height: 0,
    nonblank: false,
    changedPixels: 0,
    totalPixels: 0,
    changedPixelRatio: 0,
    averageDelta: 0,
    distinctColorCount: 0,
    bridgeBlockRatio: 0,
  };
}
