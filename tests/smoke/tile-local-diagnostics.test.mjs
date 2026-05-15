import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildTileLocalDiagnosticPlan,
  classifyTileLocalDiagnostics,
} from "../../scripts/visual-smoke/tile-local-diagnostics.mjs";
import { extractTileLocalPageMetrics } from "../../scripts/visual-smoke/tile-local-comparison.mjs";

test("tile-local diagnostic plan captures alpha, transmittance, coverage, ref density, and conic shape URLs", () => {
  const plan = buildTileLocalDiagnosticPlan("http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json");

  assert.deepEqual(
    plan.map((capture) => [capture.id, capture.expectedRendererLabel, capture.url]),
    [
      [
        "coverage-weight",
        "tile-local-visible-debug-coverage-weight",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=coverage-weight",
      ],
      [
        "accumulated-alpha",
        "tile-local-visible-debug-accumulated-alpha",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=accumulated-alpha",
      ],
      [
        "transmittance",
        "tile-local-visible-debug-transmittance",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=transmittance",
      ],
      [
        "tile-ref-count",
        "tile-local-visible-debug-tile-ref-count",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count",
      ],
      [
        "conic-shape",
        "tile-local-visible-debug-conic-shape",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=conic-shape",
      ],
    ]
  );
});

test("tile-local diagnostic classifier requires compact evidence for alpha/transmittance and tile-ref density", () => {
  const result = classifyTileLocalDiagnostics({
    captures: [
      diagnosticCapture("coverage-weight"),
      diagnosticCapture("accumulated-alpha", {
        diagnostics: {
          alpha: { estimatedMaxAccumulatedAlpha: 0.9, estimatedMinTransmittance: 0.1 },
        },
      }),
      diagnosticCapture("transmittance", {
        diagnostics: {
          alpha: { estimatedMaxAccumulatedAlpha: 0.9, estimatedMinTransmittance: 0.1 },
        },
      }),
      diagnosticCapture("tile-ref-count", {
        diagnostics: {
          tileRefs: { total: 24000, maxPerTile: 32, nonEmptyTiles: 400 },
        },
      }),
      diagnosticCapture("conic-shape", {
        diagnostics: {
          conicShape: { maxMajorRadiusPx: 12, minMinorRadiusPx: 0.75 },
        },
      }),
    ],
  });

  assert.equal(result.closeable, true);
  assert.equal(result.summary.status, "PASS");
  assert.equal(result.metrics.requiredModesPresent, true);
  assert.equal(result.metrics.maxTileRefsPerTile, 32);
});

test("tile-local diagnostic classifier reports status labels, overflow reasons, and heat counters", () => {
  const result = classifyTileLocalDiagnostics({
    captures: [
      diagnosticCapture("coverage-weight"),
      diagnosticCapture("accumulated-alpha"),
      diagnosticCapture("transmittance"),
      diagnosticCapture("tile-ref-count", {
        tileLocal: {
          status: "current",
          freshness: { status: "current" },
          budgetDiagnostics: {
            arenaRefs: { projected: 96, retained: 32, dropped: 64 },
            overflowReasons: [{ reason: "per-tile-ref-cap", droppedRefs: 64 }],
            heat: {
              cpu: { projectedRefs: 96, projectedRefsPerTile: 96, projectedToRetainedRatio: 3, buildDurationMs: 12.5 },
              gpu: { retainedRefs: 32, retainedRefBufferBytes: 512, alphaParamBufferBytes: 1024 },
            },
          },
        },
      }),
      diagnosticCapture("conic-shape"),
    ],
  });

  assert.equal(result.metrics.presentationStatus, "current");
  assert.deepEqual(result.metrics.overflowReasons, ["per-tile-ref-cap"]);
  assert.equal(result.metrics.projectedArenaRefs, 96);
  assert.equal(result.metrics.retainedArenaRefs, 32);
  assert.equal(result.metrics.droppedArenaRefs, 64);
  assert.equal(result.metrics.cpuProjectedRefsPerTile, 96);
  assert.equal(result.metrics.cpuBuildDurationMs, 12.5);
  assert.equal(result.metrics.gpuRetainedRefBufferBytes, 512);
  assert.equal(result.metrics.gpuAlphaParamBufferBytes, 1024);
});

test("tile-local diagnostic classifier rejects saturated low-detail heatmaps", () => {
  const result = classifyTileLocalDiagnostics({
    captures: [
      diagnosticCapture("coverage-weight", { distinctColorCount: 8 }),
      diagnosticCapture("accumulated-alpha"),
      diagnosticCapture("transmittance"),
      diagnosticCapture("tile-ref-count"),
      diagnosticCapture("conic-shape", { distinctColorCount: 2 }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.deepEqual(
    result.findings
      .filter((finding) => finding.kind === "low-detail-diagnostic")
      .map((finding) => finding.summary),
    [
      "coverage-weight exposed only 8 distinct colors; the heatmap is saturated rather than diagnostic.",
      "conic-shape exposed only 2 distinct colors; the heatmap is saturated rather than diagnostic.",
    ]
  );
});

test("visual smoke CLI exposes a tile-local diagnostics batch mode", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /--tile-local-diagnostics/);
  assert.match(source, /runTileLocalDiagnostics/);
  assert.match(source, /renderTileLocalDiagnosticsReport/);
});

test("tile-local page metrics preserve requested and effective arena backend evidence", () => {
  const metrics = extractTileLocalPageMetrics({
    rendererLabel: "tile-local-visible-gaussian-compositor",
    fps: 42,
    arenaRuntime: {
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "cpu",
      cpuBuildDurationMs: 12.5,
      gpuDispatchEnqueueDurationMs: null,
      unavailableReason: "gpu contributor arena runtime not promoted",
      skippedReason: "arena backend gpu requested without live GPU output",
    },
  });

  assert.deepEqual(metrics.arenaRuntime, {
    requestedArenaBackend: "gpu",
    effectiveArenaBackend: "cpu",
    cpuBuildDurationMs: 12.5,
    gpuDispatchEnqueueDurationMs: undefined,
    unavailableReason: "gpu contributor arena runtime not promoted",
    skippedReason: "arena backend gpu requested without live GPU output",
  });
});

test("visual smoke CLI reports requested and effective arena backend fields", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /Arena requested backend:/);
  assert.match(source, /Arena effective backend:/);
  assert.match(source, /Arena state:/);
  assert.match(source, /CPU bridge build duration ms:/);
  assert.match(source, /GPU dispatch enqueue duration ms:/);
  assert.doesNotMatch(source, /Arena GPU dispatch duration ms:/);
  assert.match(source, /Unavailable reason:/);
  assert.match(source, /Skipped reason:/);
});

test("visual smoke CLI reports runtime timing cadence, submit, readback, overlay, and camera costs", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /rAF cadence/i);
  assert.match(source, /Render submit duration ms/i);
  assert.match(source, /GPU timestamp readback ms/i);
  assert.match(source, /Overlay update duration ms/i);
  assert.match(source, /Camera interaction cost ms/i);
  assert.match(source, /Rebuild state/i);
});

function diagnosticCapture(id, overrides = {}) {
  const tileLocalOverrides = overrides.tileLocal ?? {};
  return {
    id,
    classification: {
      nonblank: true,
      realSplatEvidence: true,
      harnessPassed: true,
    },
    pageEvidence: {
      rendererLabel: `tile-local-visible-debug-${id}`,
      tileLocal: {
        refs: 24000,
        ...tileLocalOverrides,
        diagnostics: {
          debugMode: id,
          tileRefs: { total: 24000, maxPerTile: 32, nonEmptyTiles: 400 },
          coverageWeight: { max: 1 },
          alpha: { estimatedMaxAccumulatedAlpha: 0.6, estimatedMinTransmittance: 0.4 },
          conicShape: { maxMajorRadiusPx: 8, minMinorRadiusPx: 1 },
          ...overrides.diagnostics,
        },
      },
    },
    imageAnalysis: {
      nonblank: true,
      changedPixelRatio: overrides.changedPixelRatio ?? 0.2,
      distinctColorCount: overrides.distinctColorCount ?? 1024,
    },
  };
}
