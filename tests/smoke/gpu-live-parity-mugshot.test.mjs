import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS,
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
    assert.equal(params.has("traceAnchors"), false);
    assert.equal(params.has("presentationAnchors"), false);
    assert.equal(params.has("tileDebug"), false);
  }

  assert.equal(new URL(plan[0].url).searchParams.get("arenaBackend"), "cpu");
  assert.equal(new URL(plan[1].url).searchParams.get("arenaBackend"), "gpu");
  assert.equal(plan[0].url.replace("arenaBackend=cpu", "arenaBackend=gpu"), plan[1].url);
  assert.ok(plan.every((capture) => capture.timeoutMs === 60000));
  assert.ok(plan.every((capture) => capture.timeoutScreenshotMs === 60000));
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
    screenshotPath: `smoke-reports/gpu-live-parity/${id}.png`,
    pageEvidence: {
      rendererLabel: "tile-local-visible-gaussian-compositor",
      sourceKind: "real_scaniverse_ply",
      splatCount: 94406,
      assetPath: "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      tileLocal: {
        refs,
        refAccounting: overrides.refAccounting,
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
