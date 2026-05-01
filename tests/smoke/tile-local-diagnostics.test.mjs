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

test("visual smoke CLI exposes a tile-local diagnostics batch mode", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /--tile-local-diagnostics/);
  assert.match(source, /runTileLocalDiagnostics/);
  assert.match(source, /renderTileLocalDiagnosticsReport/);
});

function diagnosticCapture(id, overrides = {}) {
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
