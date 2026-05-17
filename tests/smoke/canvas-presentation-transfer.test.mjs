import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { classifyWitnessCapture } from "../../scripts/visual-smoke/witness-diagnostics.mjs";

const FIXTURE_PATH = new URL("./fixtures/retained-to-ordered-survival-0516-16x256-reconcile.json", import.meta.url);

test("canvas presentation transfer reports underinstrumented when mismatch lacks paired transfer samples", () => {
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  const result = classifyWitnessCapture({
    pageEvidence: {
      sourceKind: "real_scaniverse_ply",
      realScaniverse: true,
      splatCount: 94406,
      witness: {
        traceCanvasParity: fixture,
      },
      canvas: {
        width: 3456,
        height: 1916,
        clientWidth: 3456,
        clientHeight: 1916,
      },
    },
    imageAnalysis: { nonblank: true, changedPixelRatio: 0.18 },
  });

  const finding = result.findings.find((entry) => entry.owner === "canvas-presentation-transfer");
  assert.equal(finding?.kind, "presentation-underinstrumented");
  assert.equal(finding?.severity, "blocked");
  assert.deepEqual(finding?.evidence.rejectedTransforms, [
    "premultiplied-alpha",
    "alpha-blend-over-clear",
    "byte-normalization",
  ]);
  assert.deepEqual(finding?.evidence.missingEvidence, [
    "runtimeFinalColorRgba8ByAnchor",
    "canvasSampleRgba8ByAnchor",
    "mirroredCanvasSampleRgba8ByAnchor",
    "presentationMetadata",
  ]);
});
