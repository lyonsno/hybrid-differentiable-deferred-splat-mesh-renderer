import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS,
  GPU_LIVE_PARITY_MUGSHOT_TRACE_ANCHORS,
  buildGpuLiveParityMugshotPlan,
  classifyGpuLiveParityMugshot,
} from "../../scripts/visual-smoke/gpu-live-parity-mugshot.mjs";

const BASE_URL =
  "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible";

test("GPU live parity mugshot plan captures CPU reference and direct GPU under the same views", () => {
  const plan = buildGpuLiveParityMugshotPlan(BASE_URL);

  assert.deepEqual(
    plan.map((capture) => [capture.id, capture.pairId, capture.routeRole, capture.expectedRendererLabel]),
    [
      [GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, "whole-render", "cpu-reference", "tile-local-visible"],
      [GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, "whole-render", "direct-gpu-live", "tile-local-visible"],
      [GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseCpu, "dessert-close", "cpu-reference", "tile-local-visible"],
      [GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseGpu, "dessert-close", "direct-gpu-live", "tile-local-visible"],
      [GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseCpu, "porous-close", "cpu-reference", "tile-local-visible"],
      [GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseGpu, "porous-close", "direct-gpu-live", "tile-local-visible"],
    ]
  );
  assert.deepEqual(
    plan.map((capture) => capture.witnessView),
    ["default", "default", "dessert-close", "dessert-close", "dessert-porous-close", "dessert-porous-close"]
  );

  for (const capture of plan) {
    const params = new URL(capture.url).searchParams;
    assert.equal(params.get("asset"), "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json");
    assert.equal(params.get("renderer"), "tile-local-visible");
    assert.equal(params.get("tileSizePx"), "16");
    assert.equal(params.get("maxRefsPerTile"), "256");
    assert.equal(params.get("traceAnchors"), GPU_LIVE_PARITY_MUGSHOT_TRACE_ANCHORS);
    assert.equal(params.has("presentationAnchors"), false);
    assert.equal(params.has("presentationScope"), false);
    assert.equal(params.has("tileDebug"), false);
  }

  assert.equal(new URL(plan[0].url).searchParams.get("arenaBackend"), "cpu");
  assert.equal(new URL(plan[1].url).searchParams.get("arenaBackend"), "gpu");
  assert.equal(plan[0].url.replace("arenaBackend=cpu", "arenaBackend=gpu"), plan[1].url);
  assert.ok(plan.every((capture) => capture.timeoutMs === 60000));
  assert.ok(plan.every((capture) => capture.timeoutScreenshotMs === 60000));
});

test("GPU live parity mugshot replaces incoming trace routes with canonical diagnostic anchors", () => {
  const plan = buildGpuLiveParityMugshotPlan(
    `${BASE_URL}&traceAnchors=operator@1,2:stale&presentationAnchors=operator@3,4:stale&presentationScope=anchor-neighborhood&tileDebug=refs`
  );

  for (const capture of plan) {
    const params = new URL(capture.url).searchParams;
    assert.equal(params.get("traceAnchors"), GPU_LIVE_PARITY_MUGSHOT_TRACE_ANCHORS);
    assert.equal(params.has("presentationAnchors"), false);
    assert.equal(params.has("presentationScope"), false);
    assert.equal(params.has("tileDebug"), false);
  }
});

test("GPU live parity classifier closes the witness while preserving route divergence", () => {
  const captures = [
    witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
      pairId: "whole-render",
      routeRole: "cpu-reference",
      arenaBackend: "cpu",
      effectiveArenaBackend: "cpu",
      refs: 94406,
    }),
    witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
      pairId: "whole-render",
      routeRole: "direct-gpu-live",
      arenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
      refs: 2360150,
      refAccounting: liveRefAccounting(2360150, 2360150),
    }),
    witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseCpu, {
      pairId: "dessert-close",
      routeRole: "cpu-reference",
      arenaBackend: "cpu",
      effectiveArenaBackend: "cpu",
      witnessView: "dessert-close",
      refs: 94406,
    }),
    witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseGpu, {
      pairId: "dessert-close",
      routeRole: "direct-gpu-live",
      arenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
      witnessView: "dessert-close",
      refs: 2360150,
      refAccounting: liveRefAccounting(2360150, 2360150),
    }),
    witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseCpu, {
      pairId: "porous-close",
      routeRole: "cpu-reference",
      arenaBackend: "cpu",
      effectiveArenaBackend: "cpu",
      witnessView: "dessert-porous-close",
      refs: 94406,
    }),
    witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseGpu, {
      pairId: "porous-close",
      routeRole: "direct-gpu-live",
      arenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
      witnessView: "dessert-porous-close",
      refs: 2360150,
      refAccounting: liveRefAccounting(2360150, 2360150),
    }),
  ];

  const result = classifyGpuLiveParityMugshot({
    captures,
    comparisons: [
      { pairId: "whole-render", changedPixelRatio: 0.28, width: 1280, height: 720 },
      { pairId: "dessert-close", changedPixelRatio: 0.32, width: 1280, height: 720 },
      { pairId: "porous-close", changedPixelRatio: 0.36, width: 1280, height: 720 },
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  assert.equal(result.closeable, true);
  assert.equal(result.summary.status, "PASS");
  assert.equal(result.metrics.captureCount, 6);
  assert.deepEqual(result.metrics.witnessViews, ["default", "dessert-close", "dessert-porous-close"]);
  assert.equal(result.metrics.pairs.length, 3);
  assert.equal(result.metrics.pairs[0].refRatio, 25);
  assert.equal(result.divergence.primary, "tile-ref-population-divergence");
  assert.equal(result.divergence.pairsNeedingInvestigation, 3);
});

test("GPU live parity classifier fails if routes differ by more than backend", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        tileSizePx: "32",
      }),
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.equal(result.findings.some((finding) => finding.kind === "pair-route-mismatch"), true);
});

test("GPU live parity classifier fails if final-color images cannot be compared", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
      }),
    ],
    comparisons: [
      {
        pairId: "whole-render",
        comparable: false,
        changedPixelRatio: 0,
        reason: "dimension mismatch: cpu 1280x720, gpu 640x360",
      },
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.equal(result.findings.some((finding) => finding.kind === "image-comparison-not-comparable"), true);
});

test("GPU live parity classifier fails timeout captures even if route pixels exist", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        captureFailure: { kind: "visual-smoke-timeout" },
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
      }),
    ],
    comparisons: [{ pairId: "whole-render", comparable: true, changedPixelRatio: 0.1 }],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.equal(result.findings.some((finding) => finding.kind === "capture-failed"), true);
});

test("GPU live parity classifier fails if requested GPU route effectively falls back to CPU", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        effectiveArenaBackend: "cpu",
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        effectiveArenaBackend: "cpu",
      }),
    ],
    comparisons: [{ pairId: "whole-render", comparable: true, changedPixelRatio: 0.1 }],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.equal(result.findings.some((finding) => finding.kind === "pair-effective-backend-mismatch"), true);
});

test("GPU live parity classifier fails when route metadata is plausible but the image is blank", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        harnessPassed: false,
        nonblank: false,
        realSplatEvidence: false,
        changedPixels: 0,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        harnessPassed: false,
        nonblank: false,
        realSplatEvidence: false,
        changedPixels: 0,
      }),
    ],
    comparisons: [{ pairId: "whole-render", comparable: true, changedPixelRatio: 0 }],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.equal(result.findings.some((finding) => finding.kind === "capture-smoke-failed"), true);
  assert.equal(result.findings.some((finding) => finding.kind === "blank-capture"), true);
});

test("GPU live parity classifier accepts tiny real captures below the generic smoke threshold", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        harnessPassed: false,
        nonblank: false,
        realSplatEvidence: false,
        changedPixels: 2037,
        refs: 61643,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        changedPixels: 9340,
        refs: 921600,
        refAccounting: liveRefAccounting(81942, 921600),
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseCpu, {
        pairId: "dessert-close",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        witnessView: "dessert-close",
        refs: 61643,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseGpu, {
        pairId: "dessert-close",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        witnessView: "dessert-close",
        refs: 921600,
        refAccounting: liveRefAccounting(495371, 921600),
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseCpu, {
        pairId: "porous-close",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        witnessView: "dessert-porous-close",
        refs: 412939,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseGpu, {
        pairId: "porous-close",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        witnessView: "dessert-porous-close",
        refs: 921600,
        refAccounting: liveRefAccounting(729200, 921600),
      }),
    ],
    comparisons: [
      { pairId: "whole-render", comparable: true, changedPixelRatio: 0.01132 },
      { pairId: "dessert-close", comparable: true, changedPixelRatio: 0.08428 },
      { pairId: "porous-close", comparable: true, changedPixelRatio: 0.17994 },
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  assert.equal(result.closeable, true);
  assert.equal(result.findings.length, 0);
  assert.equal(result.divergence.primary, "tile-ref-population-divergence");
});

test("GPU live parity classifier refuses direct GPU legacy refs without live readback source", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        refs: 61643,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        refs: 921600,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseCpu, {
        pairId: "dessert-close",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        witnessView: "dessert-close",
        refs: 61643,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseGpu, {
        pairId: "dessert-close",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        witnessView: "dessert-close",
        refs: 921600,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseCpu, {
        pairId: "porous-close",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        witnessView: "dessert-porous-close",
        refs: 412939,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseGpu, {
        pairId: "porous-close",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        witnessView: "dessert-porous-close",
        refs: 921600,
      }),
    ],
    comparisons: [
      { pairId: "whole-render", comparable: true, changedPixelRatio: 0.01132 },
      { pairId: "dessert-close", comparable: true, changedPixelRatio: 0.08428 },
      { pairId: "porous-close", comparable: true, changedPixelRatio: 0.17994 },
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.equal(result.findings.filter((finding) => finding.kind === "gpu-live-ref-source-missing").length, 3);
  assert.equal(result.metrics.pairs[0].gpuRefSource, "legacy-tile-local-refs");
});

test("GPU live parity classifier prefers live retained-ref accounting over canvas-sized allocations", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        refs: 94406,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        refs: 921600,
        refAccounting: liveRefAccounting(94420, 921600),
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseCpu, {
        pairId: "dessert-close",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        witnessView: "dessert-close",
        refs: 94406,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseGpu, {
        pairId: "dessert-close",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        witnessView: "dessert-close",
        refs: 921600,
        refAccounting: liveRefAccounting(94430, 921600),
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseCpu, {
        pairId: "porous-close",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        witnessView: "dessert-porous-close",
        refs: 94406,
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseGpu, {
        pairId: "porous-close",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        witnessView: "dessert-porous-close",
        refs: 921600,
        refAccounting: liveRefAccounting(94410, 921600),
      }),
    ],
    comparisons: [
      { pairId: "whole-render", comparable: true, changedPixelRatio: 0.01132 },
      { pairId: "dessert-close", comparable: true, changedPixelRatio: 0.08428 },
      { pairId: "porous-close", comparable: true, changedPixelRatio: 0.17994 },
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  assert.equal(result.closeable, true);
  assert.equal(result.metrics.pairs[0].gpuRefs, 94420);
  assert.equal(result.metrics.pairs[0].gpuRefSource, "gpu-scatter-cursor-readback");
  assert.equal(result.divergence.primary, "final-color-divergence");
  assert.deepEqual(result.divergence.tileRefDivergencePairs, []);
});

test("GPU live parity classifier exposes final-color divergence instrumentation gaps", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        refs: 61643,
        finalColorRows: blockedFinalColorRows(),
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        refs: 81942,
        refAccounting: liveRefAccounting(81942),
        finalColorRows: blockedFinalColorRows(),
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseCpu, {
        pairId: "dessert-close",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        witnessView: "dessert-close",
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseGpu, {
        pairId: "dessert-close",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        witnessView: "dessert-close",
        refAccounting: liveRefAccounting(94406),
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseCpu, {
        pairId: "porous-close",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        witnessView: "dessert-porous-close",
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseGpu, {
        pairId: "porous-close",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        witnessView: "dessert-porous-close",
        refAccounting: liveRefAccounting(94406),
      }),
    ],
    comparisons: [
      { pairId: "whole-render", comparable: true, changedPixelRatio: 0.0464, changedPixels: 42763, totalPixels: 921600 },
      { pairId: "dessert-close", comparable: true, changedPixelRatio: 0.001, changedPixels: 922, totalPixels: 921600 },
      { pairId: "porous-close", comparable: true, changedPixelRatio: 0.001, changedPixels: 922, totalPixels: 921600 },
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  const ledger = result.metrics.pairs[0].finalColorLedger;
  assert.equal(result.divergence.primary, "final-color-divergence");
  assert.equal(ledger.status, "missing-final-color-contributors");
  assert.equal(ledger.cpu.rowCount, 3);
  assert.equal(ledger.gpu.rowCount, 3);
  assert.equal(ledger.cpu.hasContributors, false);
  assert.equal(ledger.gpu.hasContributors, false);
  assert.equal(ledger.cpu.perPixelHasContributors, false);
  assert.equal(ledger.gpu.perPixelHasContributors, false);
  assert.equal(ledger.cpu.compositorInputStatus, "missing");
  assert.equal(ledger.gpu.compositorInputStatus, "missing");
  assert.equal(ledger.compositorRowDelta.status, "missing-compositor-input-readback");
  assert.deepEqual(ledger.mismatchedAnchorIds, []);
  assert.ok(ledger.cpu.blockedAnchorIds.includes("lacunar-hole-dessert-1260-930"));
});

test("GPU live parity classifier uses live compositor input readback as contributor-bearing final-color evidence", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        refs: 61643,
        finalColorRows: blockedFinalColorRows(["whole-a"]),
        compositorInputReadback: liveCompositorInputReadback(
          "whole-a",
          [120, 80, 60, 255],
          3,
          "cpu-reference-diagnostic-state"
        ),
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        refs: 81942,
        refAccounting: liveRefAccounting(81942),
        finalColorRows: blockedFinalColorRows(["whole-a"]),
        compositorInputReadback: liveCompositorInputReadback("whole-a", [151, 88, 53, 255], 256),
      }),
    ],
    comparisons: [
      { pairId: "whole-render", comparable: true, changedPixelRatio: 0.0464, changedPixels: 42763, totalPixels: 921600 },
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  const ledger = result.metrics.pairs[0].finalColorLedger;
  assert.equal(result.divergence.primary, "final-color-divergence");
  assert.equal(ledger.status, "final-color-row-divergence");
  assert.equal(ledger.cpu.hasContributors, true);
  assert.equal(ledger.gpu.hasContributors, true);
  assert.equal(ledger.cpu.perPixelHasContributors, false);
  assert.equal(ledger.gpu.perPixelHasContributors, false);
  assert.deepEqual(ledger.cpu.perPixelBlockedAnchorIds, ["whole-a"]);
  assert.deepEqual(ledger.gpu.perPixelBlockedAnchorIds, ["whole-a"]);
  assert.deepEqual(ledger.cpu.blockedAnchorIds, ["whole-a"]);
  assert.deepEqual(ledger.gpu.blockedAnchorIds, ["whole-a"]);
  assert.equal(ledger.cpu.compositorInputStatus, "present");
  assert.equal(ledger.gpu.compositorInputStatus, "present");
  assert.equal(ledger.cpu.compositorInputSource, "cpu-reference-diagnostic-state");
  assert.equal(ledger.gpu.compositorInputSource, "missing");
  assert.equal(ledger.compositorRowDelta.status, "compositor-row-divergence");
  assert.deepEqual(ledger.compositorRowDelta.mismatchedAnchorIds, ["whole-a"]);
  assert.equal(ledger.compositorRowDelta.anchorDiffs[0].status, "header-mismatch");
  assert.equal(ledger.compositorRowDelta.anchorDiffs[0].cpuContributorCount, 3);
  assert.equal(ledger.compositorRowDelta.anchorDiffs[0].gpuContributorCount, 256);
  assert.deepEqual(ledger.anchorDiffs[0].cpuOutputRgba8, [120, 80, 60, 255]);
  assert.deepEqual(ledger.anchorDiffs[0].gpuOutputRgba8, [151, 88, 53, 255]);
  assert.deepEqual(ledger.mismatchedAnchorIds, ["whole-a"]);
});

test("GPU live parity classifier separates compositor row matches from final color row divergence", () => {
  const sharedContributors = [
    compositorContributor({
      layer: 0,
      refIndex: 10,
      splatIndex: 7,
      originalId: 70,
      alphaParamIndex: 10,
      pixelCoverageWeight: 0.42,
      sourceOpacity: 0.8,
      coverageAlpha: 0.35,
      sourceColor: [0.8, 0.5, 0.3],
    }),
  ];
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        refs: 61643,
        finalColorRows: blockedFinalColorRows(["whole-a"]),
        compositorInputReadback: liveCompositorInputReadback(
          "whole-a",
          [120, 80, 60, 255],
          sharedContributors,
          "cpu-reference-diagnostic-state"
        ),
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        refs: 81942,
        refAccounting: liveRefAccounting(81942),
        finalColorRows: blockedFinalColorRows(["whole-a"]),
        compositorInputReadback: liveCompositorInputReadback(
          "whole-a",
          [120, 80, 60, 255],
          sharedContributors,
          "gpu-buffer-readback"
        ),
      }),
    ],
    comparisons: [
      { pairId: "whole-render", comparable: true, changedPixelRatio: 0.0464, changedPixels: 42763, totalPixels: 921600 },
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  const ledger = result.metrics.pairs[0].finalColorLedger;
  assert.equal(ledger.status, "final-color-row-match");
  assert.equal(ledger.compositorRowDelta.status, "compositor-row-match");
  assert.deepEqual(ledger.compositorRowDelta.mismatchedAnchorIds, []);
  assert.equal(ledger.compositorRowDelta.anchorDiffs[0].status, "match");
  assert.deepEqual(ledger.compositorRowDelta.anchorDiffs[0].cpuContributorIds, [70]);
  assert.deepEqual(ledger.compositorRowDelta.anchorDiffs[0].gpuContributorIds, [70]);
});

test("GPU live parity classifier reports the first compositor contributor identity mismatch", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        refs: 61643,
        finalColorRows: blockedFinalColorRows(["whole-a"]),
        compositorInputReadback: liveCompositorInputReadback(
          "whole-a",
          [120, 80, 60, 255],
          [compositorContributor({ splatIndex: 7, originalId: 70 })],
          "cpu-reference-diagnostic-state"
        ),
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        refs: 81942,
        refAccounting: liveRefAccounting(81942),
        finalColorRows: blockedFinalColorRows(["whole-a"]),
        compositorInputReadback: liveCompositorInputReadback(
          "whole-a",
          [151, 88, 53, 255],
          [compositorContributor({ splatIndex: 8, originalId: 80 })],
          "gpu-buffer-readback"
        ),
      }),
    ],
    comparisons: [
      { pairId: "whole-render", comparable: true, changedPixelRatio: 0.0464, changedPixels: 42763, totalPixels: 921600 },
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  const delta = result.metrics.pairs[0].finalColorLedger.compositorRowDelta;
  assert.equal(delta.status, "compositor-row-divergence");
  assert.equal(delta.anchorDiffs[0].status, "contributor-identity-mismatch");
  assert.equal(delta.anchorDiffs[0].firstMismatch.index, 0);
  assert.equal(delta.anchorDiffs[0].firstMismatch.cpu.originalId, 70);
  assert.equal(delta.anchorDiffs[0].firstMismatch.gpu.originalId, 80);
});

test("GPU live parity classifier treats trace-anchor mismatches as route mismatches", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        traceAnchors: "cpu-a@1,2:test",
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        traceAnchors: "gpu-a@1,2:test",
      }),
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.equal(result.findings.some((finding) => finding.kind === "pair-route-mismatch"), true);
});

test("GPU live parity classifier rejects equal but non-canonical diagnostic routes", () => {
  const result = classifyGpuLiveParityMugshot({
    captures: [
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu, {
        pairId: "whole-render",
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        traceAnchors: "operator@1,2:stale",
        presentationAnchors: "operator@3,4:stale",
        presentationScope: "anchor-neighborhood",
      }),
      witnessCapture(GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu, {
        pairId: "whole-render",
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        traceAnchors: "operator@1,2:stale",
        presentationAnchors: "operator@3,4:stale",
        presentationScope: "anchor-neighborhood",
      }),
    ],
    contactSheetPath: "smoke-reports/gpu-live-parity/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.equal(result.findings.some((finding) => finding.kind === "pair-route-contract-mismatch"), true);
});

test("visual smoke CLI exposes the GPU live parity mugshot batch mode", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /--gpu-live-parity-mugshot/);
  assert.match(source, /runGpuLiveParityMugshot/);
  assert.match(source, /renderGpuLiveParityMugshotReport/);
});

function witnessCapture(id, overrides = {}) {
  const pairId = overrides.pairId ?? "whole-render";
  const routeRole = overrides.routeRole ?? "cpu-reference";
  const arenaBackend = overrides.arenaBackend ?? "cpu";
  const effectiveArenaBackend = overrides.effectiveArenaBackend ?? arenaBackend;
  const witnessView = overrides.witnessView ?? "default";
  const tileSizePx = overrides.tileSizePx ?? "16";
  const maxRefsPerTile = overrides.maxRefsPerTile ?? "256";
  const refs = overrides.refs ?? 94406;
  return {
    id,
    pairId,
    routeRole,
    classification: {
      nonblank: overrides.nonblank ?? true,
      realSplatEvidence: overrides.realSplatEvidence ?? true,
      harnessPassed: overrides.harnessPassed ?? true,
    },
    imageAnalysis: {
      width: 1280,
      height: 720,
      nonblank: overrides.nonblank ?? true,
      changedPixels: overrides.changedPixels ?? 12000,
      totalPixels: 1280 * 720,
      changedPixelRatio: (overrides.changedPixels ?? 12000) / (1280 * 720),
    },
    captureFailure: overrides.captureFailure,
    screenshotPath: `smoke-reports/gpu-live-parity/${id}.png`,
    pageEvidence: {
      rendererLabel: "tile-local-visible-gaussian-compositor",
      sourceKind: "real_scaniverse_ply",
      splatCount: 94406,
      assetPath: "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      tileLocal: {
        refs,
        refAccounting: overrides.refAccounting,
        perPixelFinalColorAccumulation: overrides.finalColorRows,
        compositorInputReadback: overrides.compositorInputReadback,
        outputTextureReadback: overrides.outputTextureReadback,
        tileColumns: 80,
        tileRows: 45,
      },
      arenaRuntime: {
        requestedArenaBackend: arenaBackend,
        effectiveArenaBackend,
      },
    },
    routeIdentity: {
      assetPath: "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      witnessView,
      renderer: "tile-local-visible",
      arenaBackend,
      effectiveArenaBackend,
      tileSizePx,
      maxRefsPerTile,
      traceAnchors: overrides.traceAnchors ?? GPU_LIVE_PARITY_MUGSHOT_TRACE_ANCHORS,
      presentationAnchors: overrides.presentationAnchors ?? null,
      presentationScope: overrides.presentationScope ?? "full-scene",
      viewport: { width: 1280, height: 720 },
    },
  };
}

function liveRefAccounting(retainedRefs, allocatedRefs = retainedRefs) {
  return {
    status: "present",
    source: "gpu-scatter-cursor-readback",
    retainedRefs,
    allocatedRefs,
    estimatedRetainedRefs: allocatedRefs,
  };
}

function blockedFinalColorRows(ids = [
    "lacunar-hole-dessert-1260-930",
    "dense-foreground-leak-1580-1260",
    "black-band-dropout-2300-1055",
  ]) {
  return ids.map((id) => ({
    status: "blocked",
    anchorPixel: { id, x: 12, y: 9 },
    finalColorAccumulation: {
      steps: [],
      outputColor: [0.02, 0.02, 0.04, 0],
    },
    blockers: [
      {
        field: "finalColorAccumulation.steps",
        reason: `tileLocal.perPixelFinalColorAccumulation missing contributors for ${id}`,
      },
    ],
  }));
}

function liveCompositorInputReadback(id, rgba8, contributorsOrCount, source) {
  const contributors = Array.isArray(contributorsOrCount)
    ? contributorsOrCount
    : Array.from({ length: contributorsOrCount }, (_, index) => ({
      layer: index,
      splatIndex: index + 1,
      originalId: index + 1,
    }));
  return {
    status: "present",
    source,
    anchors: [
      {
        id,
        tileAddress: { tileX: 2, tileY: 3, tileIndex: 302, localX: 8, localY: 4 },
        header: { firstRefIndex: 10, refCount: contributors.length, projectedCount: contributors.length, droppedCount: 0 },
        gpuScatterCount: contributors.length,
        tileCapacity: 256,
        refLimit: contributors.length,
        liveCompositorRgba8: rgba8,
        contributors,
      },
    ],
  };
}

function compositorContributor(overrides = {}) {
  return {
    layer: overrides.layer ?? 0,
    refIndex: overrides.refIndex ?? 10,
    splatIndex: overrides.splatIndex ?? 7,
    originalId: overrides.originalId ?? 70,
    alphaParamIndex: overrides.alphaParamIndex ?? 10,
    centerPx: overrides.centerPx ?? [640.5, 360.5],
    inverseConic: overrides.inverseConic ?? [0.2, 0, 0.2],
    coverageWeight: overrides.coverageWeight ?? 0.5,
    tileCoverageWeight: overrides.tileCoverageWeight ?? overrides.coverageWeight ?? 0.5,
    pixelCoverageWeight: overrides.pixelCoverageWeight ?? 0.42,
    sourceOpacity: overrides.sourceOpacity ?? 0.8,
    coverageAlpha: overrides.coverageAlpha ?? 0.35,
    transmittanceBefore: overrides.transmittanceBefore ?? 1,
    transmittanceAfter: overrides.transmittanceAfter ?? 0.65,
    sourceColor: overrides.sourceColor ?? [0.8, 0.5, 0.3],
    runningColor: overrides.runningColor ?? [0.29, 0.19, 0.13],
    remainingTransmission: overrides.remainingTransmission ?? 0.65,
    status: overrides.status ?? "accumulated",
  };
}
