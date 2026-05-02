import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildTileLocalDiagnosticPlan,
  classifyTileLocalDiagnostics,
} from "../../scripts/visual-smoke/tile-local-diagnostics.mjs";

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

test("tile-local diagnostic classifier makes CPU/GPU arena witness status explicit", () => {
  const result = classifyTileLocalDiagnostics({
    captures: [
      diagnosticCapture("coverage-weight"),
      diagnosticCapture("accumulated-alpha"),
      diagnosticCapture("transmittance"),
      diagnosticCapture("tile-ref-count", {
        tileLocal: {
          status: "current",
          arena: {
            backend: "cpu-contributor-arena",
            status: "current",
          },
          budgetDiagnostics: {
            arenaRefs: { projected: 2089656, retained: 44171, dropped: 2045485 },
            overflowReasons: [{ reason: "per-tile-ref-cap", droppedRefs: 2045485 }],
            heat: {
              cpu: { projectedRefs: 2089656, projectedRefsPerTile: 81.371, buildDurationMs: 6652.6 },
              gpu: { retainedRefs: 44171, retainedRefBufferBytes: 706736, dispatchDurationMs: 0 },
            },
          },
        },
      }),
      diagnosticCapture("conic-shape"),
    ],
  });

  assert.deepEqual(result.metrics.arenaWitness.cpu, {
    backend: "cpu-contributor-arena",
    status: "current",
    projectedArenaRefs: 2089656,
    retainedArenaRefs: 44171,
    droppedArenaRefs: 2045485,
    buildDurationMs: 6652.6,
  });
  assert.deepEqual(result.metrics.arenaWitness.gpu, {
    backend: "not-reported",
    status: "not-available",
    dispatchDurationMs: 0,
  });
  assert.equal(result.metrics.arenaWitness.comparison.status, "gpu-unavailable");
  assert.equal(result.metrics.arenaWitness.comparison.summary, "GPU arena construction was not reported; CPU fallback evidence remains current.");
  assert.equal(result.findings.some((finding) => finding.kind === "silent-gpu-fallback"), false);
});

test("visual smoke CLI exposes a tile-local diagnostics batch mode", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /--tile-local-diagnostics/);
  assert.match(source, /runTileLocalDiagnostics/);
  assert.match(source, /renderTileLocalDiagnosticsReport/);
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
