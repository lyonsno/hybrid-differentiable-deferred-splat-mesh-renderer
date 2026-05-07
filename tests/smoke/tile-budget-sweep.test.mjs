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
    plan.map((capture) => [capture.id, capture.tileSizePx, capture.maxRefsPerTile, capture.url]),
    [
      [
        "tile-6px-cap-32",
        6,
        32,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=6&maxRefsPerTile=32",
      ],
      [
        "tile-12px-cap-64",
        12,
        64,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=12&maxRefsPerTile=64",
      ],
      [
        "tile-16px-cap-128",
        16,
        128,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=16&maxRefsPerTile=128",
      ],
      [
        "tile-16px-cap-256",
        16,
        256,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=16&maxRefsPerTile=256",
      ],
      [
        "tile-24px-cap-256",
        24,
        256,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=24&maxRefsPerTile=256",
      ],
      [
        "tile-32px-cap-512",
        32,
        512,
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count&tileSizePx=32&maxRefsPerTile=512",
      ],
    ]
  );
});

test("tile budget sweep classifier emits stable metric schema and provisional statuses", () => {
  const result = classifyTileBudgetSweep({
    captures: [
      sweepCapture({ tileSizePx: 6, maxRefsPerTile: 32, tileColumns: 10, tileRows: 10, projected: 900, retained: 320, dropped: 580, cappedTiles: 80, buildTimeMs: 14, renderTimeMs: 3.2 }),
      sweepCapture({ tileSizePx: 16, maxRefsPerTile: 256, tileColumns: 4, tileRows: 4, projected: 500, retained: 480, dropped: 20, cappedTiles: 2, buildTimeMs: 7, renderTimeMs: 2.1 }),
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
  assert.equal(result.candidates[1].status, "plausible");
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
    id: `tile-${tileSizePx}px-cap-${maxRefsPerTile}`,
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
