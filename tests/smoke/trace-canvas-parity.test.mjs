import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
