import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTileLocalComparisonPlan,
  classifyTileLocalComparison,
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

function capture(id, overrides = {}) {
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
      tileLocal: {
        refs: overrides.tileRefs ?? 0,
      },
    },
  };
}
