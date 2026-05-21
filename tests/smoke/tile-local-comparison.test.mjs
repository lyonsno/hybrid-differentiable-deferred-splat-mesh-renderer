import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyArenaRuntimeState,
  buildTileLocalComparisonPlan,
  classifyTileLocalComparison,
  extractTileLocalPageMetrics,
  isVisualSmokeCaptureReady,
  summarizeTileLocalArenaWitness,
} from "../../scripts/visual-smoke/tile-local-comparison.mjs";

test("tile-local comparison plan captures plate, silent prepass, and visible compositor modes", () => {
  const plan = buildTileLocalComparisonPlan("http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json");

  assert.deepEqual(
    plan.map((capture) => [capture.id, capture.expectedRendererLabel, capture.url]),
    [
      [
        "plate",
        "plate",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      ],
      [
        "tile-local-prepass",
        "plate+tile-local-prepass",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local",
      ],
      [
        "tile-local-visible",
        "tile-local-visible",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible",
      ],
    ]
  );
});

test("tile-local comparison accepts distinguishable compositor evidence without mutating prepass semantics", () => {
  const result = classifyTileLocalComparison({
    captures: [
      capture("plate", { rendererLabel: "plate", fps: 60, changedPixelRatio: 0.18, imageFingerprint: "plate-a" }),
      capture("tile-local-prepass", {
        rendererLabel: "plate+tile-local-prepass",
        fps: 56,
        changedPixelRatio: 0.181,
        imageFingerprint: "plate-a",
        tileRefs: 22000,
      }),
      capture("tile-local-visible", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        fps: 42,
        changedPixelRatio: 0.27,
        imageFingerprint: "compositor-b",
        distinctColorCount: 2000,
        tileRefs: 22000,
        bridgeBlockRatio: 0.04,
      }),
    ],
  });

  assert.equal(result.closeable, true);
  assert.equal(result.summary.status, "PASS");
  assert.deepEqual(result.findings, []);
  assert.equal(result.metrics.fps.visibleToPlateRatio, 0.7);
});

test("tile-local comparison waits for first rendered evidence instead of initial smoke metadata", () => {
  assert.equal(
    isVisualSmokeCaptureReady(
      {
        ready: true,
        sourceKind: "real_scaniverse_ply",
        splatCount: 94406,
        rendererLabel: "",
        statsText: "Loading real Scaniverse splats...",
        canvas: { width: 300, height: 150, clientWidth: 1280, clientHeight: 720 },
        tileLocal: { refs: 0 },
      },
      { expectedRendererLabel: "tile-local-visible" }
    ),
    false
  );

  assert.equal(
    isVisualSmokeCaptureReady(
      {
        ready: true,
        sourceKind: "real_scaniverse_ply",
        splatCount: 94406,
        rendererLabel: "tile-local-visible-gaussian-compositor",
        statsText:
          "1280x720 | 60 fps | renderer: tile-local-visible-gaussian-compositor | tile-local: 27x15 tiles/22000 refs",
        canvas: { width: 1280, height: 720, clientWidth: 1280, clientHeight: 720 },
        tileLocal: { refs: 22000 },
      },
      { expectedRendererLabel: "tile-local-visible" }
    ),
    true
  );
});

test("tile-local comparison refuses stale cached tile-local output after a skipped rebuild", () => {
  const pageEvidence = {
    ready: true,
    sourceKind: "real_scaniverse_ply",
    splatCount: 94406,
    rendererLabel: "tile-local-visible-gaussian-compositor-stale-cache",
    statsText:
      "3456x1916 | 60 fps | renderer: tile-local-visible-gaussian-compositor-stale-cache | tile-local: 576x320 tiles/120000 refs | tile-local stale-cache: 842ms old | tile-local skipped: projected tile refs exceed budget: 20000001 > 20000000",
    canvas: { width: 3456, height: 1916, clientWidth: 3456, clientHeight: 1916 },
    tileLocalLastSkipReason: "projected tile refs exceed budget: 20000001 > 20000000",
    tileLocal: {
      refs: 120000,
      tileColumns: 576,
      tileRows: 320,
      freshness: {
        status: "stale-cache",
        cachedFrameAgeMs: 842,
        currentFrameSignature: "tile-local@3456x1916",
        cachedFrameSignature: "tile-local@1280x720",
      },
      budget: {
        skippedProjectedRefs: 20000001,
        maxProjectedRefs: 20000000,
      },
    },
  };

  const metrics = extractTileLocalPageMetrics(pageEvidence);
  assert.equal(metrics.tileLocal.tileColumns, 576);
  assert.equal(metrics.tileLocal.tileRows, 320);
  assert.equal(metrics.tileLocal.freshness.status, "stale-cache");
  assert.equal(metrics.tileLocal.budget.skippedProjectedRefs, 20000001);
  assert.equal(
    isVisualSmokeCaptureReady(pageEvidence, { expectedRendererLabel: "tile-local-visible" }),
    false
  );
});

test("tile-local comparison preserves initial high-viewport budget skip evidence without stale-cache labeling", () => {
  const pageEvidence = {
    ready: true,
    sourceKind: "real_scaniverse_ply",
    splatCount: 94406,
    rendererLabel: "tile-local-visible-budget-disabled-plate",
    statsText:
      "3456x1916 | 60 fps | renderer: tile-local-visible-budget-disabled-plate | tile-local disabled: projected tile refs exceed budget: 20000001 > 20000000",
    canvas: { width: 3456, height: 1916, clientWidth: 3456, clientHeight: 1916 },
    tileLocalDisabledReason: "projected tile refs exceed budget: 20000001 > 20000000",
  };

  const metrics = extractTileLocalPageMetrics(pageEvidence);
  assert.equal(metrics.tileLocalLastSkipReason, "projected tile refs exceed budget: 20000001 > 20000000");
  assert.equal(metrics.tileLocal.budget.skippedProjectedRefs, 20000001);
  assert.equal(metrics.tileLocal.budget.maxProjectedRefs, 20000000);
  assert.equal(metrics.tileLocal.budget.skipReason, "projected tile refs exceed budget: 20000001 > 20000000");
  assert.equal(metrics.tileLocal.freshness, undefined);
  assert.equal(
    isVisualSmokeCaptureReady(pageEvidence, { expectedRendererLabel: "tile-local-visible" }),
    false
  );
});

test("tile-local comparison does not coerce absent skipped-ref evidence to zero", () => {
  const metrics = extractTileLocalPageMetrics({
    ready: true,
    rendererLabel: "tile-local-visible-gaussian-compositor",
    statsText:
      "3456x1916 | 60 fps | renderer: tile-local-visible-gaussian-compositor | tile-local: 576x320 tiles/531136 refs",
    tileLocal: {
      refs: 531136,
      tileColumns: 576,
      tileRows: 320,
      freshness: { status: "current" },
      budget: {
        maxProjectedRefs: 20000000,
        skippedProjectedRefs: null,
        skipReason: null,
      },
    },
  });

  assert.equal(metrics.tileLocal.freshness.status, "current");
  assert.equal(metrics.tileLocal.budget.maxProjectedRefs, 20000000);
  assert.equal(metrics.tileLocal.budget.skippedProjectedRefs, undefined);
  assert.equal(metrics.tileLocal.budget.skipReason, undefined);
});

test("tile-local comparison treats GPU-allocated refs as positive evidence when compact diagnostics are stale", () => {
  const pageEvidence = {
    ready: true,
    rendererLabel: "tile-local-visible-debug-coverage-weight",
    statsText:
      "3456x1804 | 120 fps | renderer: tile-local-visible-debug-coverage-weight | tile-local: 216x113 tiles/94406 refs",
    canvas: { width: 3456, height: 1804, clientWidth: 1728, clientHeight: 902 },
    tileLocal: {
      refs: 0,
      allocatedRefs: 94406,
      tileColumns: 216,
      tileRows: 113,
      freshness: { status: "current" },
    },
  };

  const metrics = extractTileLocalPageMetrics(pageEvidence);
  assert.equal(metrics.tileLocal.refs, 94406);
  assert.equal(
    isVisualSmokeCaptureReady(pageEvidence, { expectedRendererLabel: "tile-local-visible-debug-coverage-weight" }),
    true
  );
});

test("tile-local comparison waits for pending output texture readback before capture", () => {
  const pageEvidence = {
    ready: true,
    rendererLabel: "tile-local-visible-gaussian-compositor",
    statsText:
      "3456x1916 | 60 fps | renderer: tile-local-visible-gaussian-compositor | tile-local: 216x120 tiles/157952 refs",
    canvas: { width: 3456, height: 1916, clientWidth: 3456, clientHeight: 1916 },
    tileLocal: {
      refs: 157952,
      tileColumns: 216,
      tileRows: 120,
      freshness: { status: "current" },
      perPixelFinalColorAccumulation: [{ anchorPixel: { id: "fresh-a" } }],
      outputTextureReadback: { status: "pending" },
    },
  };

  assert.equal(
    isVisualSmokeCaptureReady(pageEvidence, { expectedRendererLabel: "tile-local-visible" }),
    false
  );

  pageEvidence.tileLocal.outputTextureReadback = { status: "present", anchors: [] };
  assert.equal(
    isVisualSmokeCaptureReady(pageEvidence, { expectedRendererLabel: "tile-local-visible" }),
    true
  );

  delete pageEvidence.tileLocal.outputTextureReadback;
  assert.equal(
    isVisualSmokeCaptureReady(pageEvidence, { expectedRendererLabel: "tile-local-visible" }),
    false
  );
});

test("tile-local comparison catches visible mode falling back to the plate renderer", () => {
  const result = classifyTileLocalComparison({
    captures: [
      capture("plate", { rendererLabel: "plate", fps: 60, imageFingerprint: "same" }),
      capture("tile-local-prepass", { rendererLabel: "plate+tile-local-prepass", fps: 57, imageFingerprint: "same", tileRefs: 20 }),
      capture("tile-local-visible", { rendererLabel: "plate", fps: 58, imageFingerprint: "same", tileRefs: 20 }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.findings[0].kind, "visible-fallback-to-plate");
  assert.match(result.findings[0].summary, /plate/i);
});

test("tile-local comparison catches low-color blocky visible compositor output", () => {
  const result = classifyTileLocalComparison({
    captures: [
      capture("plate", { rendererLabel: "plate", fps: 60, imageFingerprint: "plate-a", distinctColorCount: 17000 }),
      capture("tile-local-prepass", {
        rendererLabel: "plate+tile-local-prepass",
        fps: 54,
        imageFingerprint: "plate-a",
        tileRefs: 3274714,
        distinctColorCount: 17000,
      }),
      capture("tile-local-visible", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        fps: 60,
        imageFingerprint: "blocky-visible",
        tileRefs: 3274714,
        bridgeBlockRatio: 0.4918,
        distinctColorCount: 44,
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.findings[0].kind, "visible-low-color-blocks");
  assert.match(result.findings[0].summary, /44 distinct colors/i);
});

test("tile-local comparison catches bridge-block diagnostics and frame-rate collapse", () => {
  const result = classifyTileLocalComparison({
    captures: [
      capture("plate", { rendererLabel: "plate", fps: 60, imageFingerprint: "plate-a" }),
      capture("tile-local-prepass", { rendererLabel: "plate+tile-local-prepass", fps: 54, imageFingerprint: "plate-a", tileRefs: 18 }),
      capture("tile-local-visible", {
        rendererLabel: "tile-local-visible-bridge-diagnostic",
        fps: 12,
        imageFingerprint: "blocks",
        tileRefs: 18,
        bridgeBlockRatio: 0.82,
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.deepEqual(
    result.findings.map((finding) => finding.kind),
    ["visible-bridge-block-diagnostic", "visible-frame-rate-collapse"]
  );
});

test("tile-local arena witness reports gpu-unavailable, current/fallback states, and regressed tile-cell artifacts without dispatch evidence", () => {
  const result = summarizeTileLocalArenaWitness({
    plate: capture("plate", {
      rendererLabel: "plate",
      fps: 60,
      changedPixelRatio: 0.18,
      imageFingerprint: "plate-a",
    }),
    prepass: capture("tile-local-prepass", {
      rendererLabel: "plate+tile-local-prepass",
      fps: 56,
      imageFingerprint: "plate-a",
      tileRefs: 22000,
      tileLocalStatus: "budget-disabled",
      tileLocalDisabledReason: "projected tile refs exceed budget: 20000001 > 20000000",
    }),
    visible: capture("tile-local-visible", {
      rendererLabel: "tile-local-visible-gaussian-compositor",
      fps: 42,
      changedPixelRatio: 0.27,
      imageFingerprint: "compositor-b",
      tileRefs: 22000,
      tileLocalStatus: "current",
      distinctColorCount: 44,
      tileLocal: {
        budgetDiagnostics: {
          heat: {
            cpu: { buildDurationMs: 9314.7 },
            gpu: {
              retainedRefBufferBytes: 512,
              alphaParamBufferBytes: 1024,
            },
          },
        },
      },
    }),
  });

  assert.equal(result.arenaBackend, "gpu-unavailable");
  assert.equal(result.cpuBuildDurationMs, 9314.7);
  assert.equal(result.gpuDispatchEnqueueDurationMs, undefined);
  assert.deepEqual(result.presentation, {
    plate: "not-applicable",
    prepass: "fallback",
    visible: "current",
  });
  assert.equal(result.artifactMovement.status, "regressed");
  assert.match(result.artifactMovement.summary, /tile-cell\/block artifacts/i);
});

test("tile-local arena witness forwards arenaRuntime evidence into backend and state labels", () => {
  const result = summarizeTileLocalArenaWitness({
    visible: capture("tile-local-visible", {
      rendererLabel: "tile-local-visible-gaussian-compositor",
      fps: 41,
      changedPixelRatio: 0.29,
      imageFingerprint: "visible-gpu",
      tileRefs: 22000,
      pageEvidence: {
        arenaRuntime: {
          requestedArenaBackend: "gpu",
          effectiveArenaBackend: "gpu",
          cpuBuildDurationMs: 24.37,
          cpuBridgeBuildDurationMs: 24.37,
          gpuDispatchEnqueueDurationMs: 0.84,
        },
      },
    }),
  });

  assert.equal(result.arenaBackend, "gpu");
  assert.equal(result.arenaState, "gpu-effective-with-cpu-bridge");
  assert.equal(result.cpuBuildDurationMs, 24.37);
  assert.equal(result.gpuDispatchEnqueueDurationMs, 0.84);
});

test("tile-local arena runtime state distinguishes CPU fallback, effective GPU bridge use, and blocked or unavailable states", () => {
  assert.equal(
    classifyArenaRuntimeState({
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "cpu",
      cpuBuildDurationMs: 24.37,
      unavailableReason: "gpu contributor arena runtime not promoted",
      fallbackReason: "requested gpu arena backend fell back to the CPU bridge",
    }),
    "gpu-requested-cpu-fallback"
  );

  assert.equal(
    classifyArenaRuntimeState({
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
      cpuBuildDurationMs: 24.37,
      gpuDispatchEnqueueDurationMs: 0.84,
    }),
    "gpu-effective-with-cpu-bridge"
  );

  assert.equal(
    classifyArenaRuntimeState({
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
      gpuDispatchEnqueueDurationMs: 0.84,
    }),
    "gpu-effective-without-cpu-bridge"
  );

  assert.equal(
    classifyArenaRuntimeState({
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "cpu",
      skippedReason: "gpu arena runtime blocked by missing retained records",
    }),
    "gpu-blocked"
  );

  assert.equal(
    classifyArenaRuntimeState({
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "cpu",
      unavailableReason: "gpu contributor arena runtime unavailable",
    }),
    "gpu-unavailable"
  );
});

function capture(id, overrides = {}) {
  const tileLocal = {
    refs: overrides.tileRefs ?? 0,
    ...(overrides.tileLocal ?? {}),
  };
  if (overrides.pageEvidence?.tileLocal) {
    Object.assign(tileLocal, overrides.pageEvidence.tileLocal);
  }
  return {
    id,
    classification: {
      nonblank: true,
      realSplatEvidence: true,
      harnessPassed: true,
    },
    imageAnalysis: {
      nonblank: true,
      changedPixelRatio: overrides.changedPixelRatio ?? 0.2,
      perceptualFingerprint: overrides.imageFingerprint,
      bridgeBlockRatio: overrides.bridgeBlockRatio ?? 0,
      distinctColorCount: overrides.distinctColorCount ?? 2000,
    },
    pageEvidence: {
      rendererLabel: overrides.rendererLabel,
      fps: overrides.fps,
      tileLocalStatus: overrides.tileLocalStatus,
      tileLocalDisabledReason: overrides.tileLocalDisabledReason,
      tileLocalLastSkipReason: overrides.tileLocalLastSkipReason,
      tileLocal,
      ...(overrides.pageEvidence ?? {}),
    },
  };
}
