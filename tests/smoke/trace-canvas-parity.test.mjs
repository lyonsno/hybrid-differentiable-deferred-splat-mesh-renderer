import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildTraceCanvasParityEvidence } from "../../scripts/visual-smoke/trace-canvas-parity.mjs";
import { classifyWitnessCapture } from "../../scripts/visual-smoke/witness-diagnostics.mjs";

const FIXTURE_PATH = new URL("./fixtures/retained-to-ordered-survival-0516-16x256-reconcile.json", import.meta.url);

test("trace-canvas parity witness freezes the same-observation mismatch for retained-to-ordered-survival-0516-16x256-reconcile", () => {
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  const result = classifyWitnessCapture({
    pageEvidence: {
      sourceKind: "real_scaniverse_ply",
      realScaniverse: true,
      splatCount: 94406,
      witness: {
        traceCanvasParity: fixture,
      },
    },
    imageAnalysis: { nonblank: true, changedPixelRatio: 0.18 },
  });

  assert.equal(result.findings[0]?.kind, "trace-canvas-mismatch");
  assert.equal(result.findings[0]?.owner, "trace-canvas-parity");
  assert.equal(result.findings[0]?.severity, "blocked");
  assert.equal(result.findings[0]?.evidence.observationId, fixture.observationId);
  assert.equal(result.findings[0]?.evidence.comparisonClass, fixture.comparisonClass);
  assert.deepEqual(result.findings[0]?.evidence.identityDiffs, []);
  assert.deepEqual(
    result.findings[0]?.evidence.anchors.map(({ id, predictedRgba8, sampledRgba8, maxDelta }) => ({
      id,
      predictedRgba8,
      sampledRgba8,
      maxDelta,
    })),
    fixture.anchors.map(({ id, predictedRgba8, sampledRgba8, maxDelta }) => ({
      id,
      predictedRgba8,
      sampledRgba8,
      maxDelta,
    })),
  );
  assert.equal(result.findings[0]?.evidence.sampleScale.x, 1);
  assert.equal(result.findings[0]?.evidence.sampleScale.y, 1);
});

test("trace-canvas parity evidence samples canvas pixels against final accumulation rows", () => {
  const witness = buildTraceCanvasParityEvidence({
    url: "http://127.0.0.1:5188/?witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible",
    viewport: { width: 2, height: 1 },
    pageEvidence: {
      rendererLabel: "tile-local-visible-gaussian-compositor",
      arenaRuntime: { effectiveArenaBackend: "gpu" },
      canvas: { width: 2, height: 1, clientWidth: 2, clientHeight: 1 },
      tileLocal: {
        budget: { tileSizePx: 16, maxRefsPerTile: 256 },
        perPixelFinalColorAccumulation: [
          {
            anchorPixel: { id: "fresh-a", x: 0, y: 0 },
            finalColorAccumulation: { outputColor: [10 / 255, 20 / 255, 30 / 255, 1] },
          },
          {
            anchorPixel: { id: "fresh-b", x: 1, y: 0 },
            finalColorAccumulation: { outputColor: [40 / 255, 50 / 255, 60 / 255, 1] },
          },
        ],
      },
    },
    image: {
      width: 2,
      height: 1,
      rgba: Buffer.from([
        10, 20, 30, 255,
        40, 50, 60, 255,
      ]),
    },
  });

  assert.equal(witness.comparisonClass, "exact-route-trace-final-vs-canvas");
  assert.deepEqual(witness.sampleScale, { x: 1, y: 1 });
  assert.deepEqual(
    witness.anchors.map(({ id, predictedRgba8, sampledRgba8, maxDelta }) => ({
      id,
      predictedRgba8,
      sampledRgba8,
      maxDelta,
    })),
    [
      { id: "fresh-a", predictedRgba8: [10, 20, 30, 255], sampledRgba8: [10, 20, 30, 255], maxDelta: 0 },
      { id: "fresh-b", predictedRgba8: [40, 50, 60, 255], sampledRgba8: [40, 50, 60, 255], maxDelta: 0 },
    ],
  );

  const result = classifyWitnessCapture({
    pageEvidence: { witness: { traceCanvasParity: witness } },
    imageAnalysis: { nonblank: true, changedPixelRatio: 1 },
  });
  assert.equal(result.findings.some((finding) => finding.owner === "trace-canvas-parity"), false);
});
