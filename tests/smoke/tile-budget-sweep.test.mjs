import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  TILE_BUDGET_SWEEP_PAIRS,
  buildTileBudgetSweepPlan,
  classifyTileBudgetSweep,
} from "../../scripts/visual-smoke/tile-budget-sweep.mjs";

test("tile budget sweep plan covers the packet-required coupled matrix", () => {
  const plan = buildTileBudgetSweepPlan("http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json");

  assert.deepEqual(TILE_BUDGET_SWEEP_PAIRS, [
    { tileSizePx: 6, maxRefsPerTile: 32 },
    { tileSizePx: 12, maxRefsPerTile: 64 },
    { tileSizePx: 16, maxRefsPerTile: 128 },
    { tileSizePx: 16, maxRefsPerTile: 256 },
    { tileSizePx: 24, maxRefsPerTile: 256 },
    { tileSizePx: 32, maxRefsPerTile: 512 },
  ]);
  assert.deepEqual(
    plan.map((capture) => [capture.id, capture.candidateId, capture.evidenceKind, capture.expectedRendererLabel, capture.tileSizePx, capture.maxRefsPerTile, capture.url]),
    [
      [
        "tile-6px-cap-32-tile-ref-count",
        "tile-6px-cap-32",
        "tile-ref-count",
        "tile-local-visible-debug-tile-ref-count",
        6,
        32,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=6&maxRefsPerTile=32",
      ],
      [
        "tile-6px-cap-32-final-color",
        "tile-6px-cap-32",
        "final-color",
        "tile-local-visible",
        6,
        32,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=6&maxRefsPerTile=32",
      ],
      [
        "tile-12px-cap-64-tile-ref-count",
        "tile-12px-cap-64",
        "tile-ref-count",
        "tile-local-visible-debug-tile-ref-count",
        12,
        64,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=12&maxRefsPerTile=64",
      ],
      [
        "tile-12px-cap-64-final-color",
        "tile-12px-cap-64",
        "final-color",
        "tile-local-visible",
        12,
        64,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=12&maxRefsPerTile=64",
      ],
      [
        "tile-16px-cap-128-tile-ref-count",
        "tile-16px-cap-128",
        "tile-ref-count",
        "tile-local-visible-debug-tile-ref-count",
        16,
        128,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=16&maxRefsPerTile=128",
      ],
      [
        "tile-16px-cap-128-final-color",
        "tile-16px-cap-128",
        "final-color",
        "tile-local-visible",
        16,
        128,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=128",
      ],
      [
        "tile-16px-cap-256-tile-ref-count",
        "tile-16px-cap-256",
        "tile-ref-count",
        "tile-local-visible-debug-tile-ref-count",
        16,
        256,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=16&maxRefsPerTile=256",
      ],
      [
        "tile-16px-cap-256-final-color",
        "tile-16px-cap-256",
        "final-color",
        "tile-local-visible",
        16,
        256,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256",
      ],
      [
        "tile-24px-cap-256-tile-ref-count",
        "tile-24px-cap-256",
        "tile-ref-count",
        "tile-local-visible-debug-tile-ref-count",
        24,
        256,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=24&maxRefsPerTile=256",
      ],
      [
        "tile-24px-cap-256-final-color",
        "tile-24px-cap-256",
        "final-color",
        "tile-local-visible",
        24,
        256,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=24&maxRefsPerTile=256",
      ],
      [
        "tile-32px-cap-512-tile-ref-count",
        "tile-32px-cap-512",
        "tile-ref-count",
        "tile-local-visible-debug-tile-ref-count",
        32,
        512,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=32&maxRefsPerTile=512",
      ],
      [
        "tile-32px-cap-512-final-color",
        "tile-32px-cap-512",
        "final-color",
        "tile-local-visible",
        32,
        512,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=32&maxRefsPerTile=512",
      ],
    ]
  );
});

test("tile budget sweep classifier requires final-color evidence before plausible status", () => {
  const result = classifyTileBudgetSweep({
    captures: [
      sweepCapture({ tileSizePx: 6, maxRefsPerTile: 32, tileColumns: 10, tileRows: 10, projected: 900, retained: 320, dropped: 580, cappedTiles: 80, buildTimeMs: 14, renderTimeMs: 3.2 }),
      sweepCapture({ tileSizePx: 16, maxRefsPerTile: 256, tileColumns: 4, tileRows: 4, projected: 500, retained: 480, dropped: 20, cappedTiles: 2, buildTimeMs: 7, renderTimeMs: 2.1 }),
    ],
  });

  assert.equal(result.candidates[1].status, "blocked");
  assert.deepEqual(result.recommendation, {
    status: "underdetermined",
    candidateIds: [],
    text: "No larger tile/cap pair cleared both budget metrics and final-color acceptance; visual witness input is still required before any default change.",
  });
  assert.equal(result.findings.some((finding) => finding.kind === "missing-final-color-evidence"), true);
});

test("tile budget sweep classifier rejects candidates whose final-color compositor consumes fewer refs than the reported cap", () => {
  const result = classifyTileBudgetSweep({
    captures: [
      sweepCapture({ tileSizePx: 6, maxRefsPerTile: 32, tileColumns: 10, tileRows: 10, projected: 900, retained: 320, dropped: 580, cappedTiles: 80, buildTimeMs: 14, renderTimeMs: 3.2 }),
      sweepCapture({ tileSizePx: 16, maxRefsPerTile: 256, tileColumns: 4, tileRows: 4, projected: 500, retained: 480, dropped: 20, cappedTiles: 2, buildTimeMs: 7, renderTimeMs: 2.1 }),
      finalColorCapture({ tileSizePx: 6, maxRefsPerTile: 32, visibleCompositedRefLimit: 32 }),
      finalColorCapture({ tileSizePx: 16, maxRefsPerTile: 256, visibleCompositedRefLimit: 32 }),
    ],
  });

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.baseline.id, "tile-6px-cap-32");
  assert.equal(result.candidates[0].metrics.tileCount, 100);
  assert.equal(result.candidates[0].metrics.projectedRefs, 900);
  assert.equal(result.candidates[0].metrics.retainedRefs, 320);
  assert.equal(result.candidates[0].metrics.droppedRefs, 580);
  assert.equal(result.candidates[0].metrics.cappedTiles, 80);
  assert.equal(result.candidates[0].metrics.buildTimeMs, 14);
  assert.equal(result.candidates[0].metrics.renderTimeMs, 3.2);
  assert.equal(result.candidates[0].status, "baseline");
  assert.equal(result.candidates[1].status, "rejected");
  assert.equal(result.candidates[1].finalColor.visibleCompositedRefLimit, 32);
  assert.equal(result.findings.some((finding) => finding.kind === "visible-compositor-cap-mismatch"), true);
});

test("visual smoke CLI exposes the tile-budget sweep batch mode", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /--tile-budget-sweep/);
  assert.match(source, /runTileBudgetSweep/);
  assert.match(source, /renderTileBudgetSweepReport/);
});

function sweepCapture({
  tileSizePx,
  maxRefsPerTile,
  tileColumns,
  tileRows,
  projected,
  retained,
  dropped,
  cappedTiles,
  buildTimeMs,
  renderTimeMs,
}) {
  return {
    id: `tile-${tileSizePx}px-cap-${maxRefsPerTile}-tile-ref-count`,
    candidateId: `tile-${tileSizePx}px-cap-${maxRefsPerTile}`,
    evidenceKind: "tile-ref-count",
    tileSizePx,
    maxRefsPerTile,
    classification: {
      nonblank: true,
      realSplatEvidence: true,
      harnessPassed: true,
    },
    pageEvidence: {
      rendererLabel: "tile-local-visible-debug-tile-ref-count",
      fps: 55,
      tileLocal: {
        status: "current",
        refs: retained,
        tileColumns,
        tileRows,
        budget: { tileSizePx, maxRefsPerTile },
        budgetDiagnostics: {
          arenaRefs: {
            projected,
            retained,
            dropped,
            cappedTileCount: cappedTiles,
          },
          heat: {
            cpu: { buildDurationMs: buildTimeMs },
            gpu: { renderDurationMs: renderTimeMs },
          },
        },
      },
    },
  };
}

function finalColorCapture({
  tileSizePx,
  maxRefsPerTile,
  visibleCompositedRefLimit,
}) {
  return {
    id: `tile-${tileSizePx}px-cap-${maxRefsPerTile}-final-color`,
    candidateId: `tile-${tileSizePx}px-cap-${maxRefsPerTile}`,
    evidenceKind: "final-color",
    tileSizePx,
    maxRefsPerTile,
    classification: {
      nonblank: true,
      realSplatEvidence: true,
      harnessPassed: true,
    },
    pageEvidence: {
      rendererLabel: "tile-local-visible-gaussian-compositor",
      tileLocal: {
        status: "current",
        debugMode: "final-color",
        visibleCompositedRefLimit,
        budget: { tileSizePx, maxRefsPerTile },
      },
    },
  };
}
