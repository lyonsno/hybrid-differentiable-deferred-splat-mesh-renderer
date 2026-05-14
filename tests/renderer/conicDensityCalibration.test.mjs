import assert from "node:assert/strict";
import test from "node:test";

import {
  ANCHOR_LEDGER_PIXELS,
  classifyLedgerConicDiagnosticReadiness,
  evaluateConicDensityAtPixel,
  makeConicDensitySyntheticCases,
} from "../../src/rendererFidelityProbes/conicDensityCalibration.js";

test("anchor ledger pixels are fixed inputs but debug RGB is insufficient for real-scene conic causality", () => {
  assert.deepEqual(
    ANCHOR_LEDGER_PIXELS.map((pixel) => pixel.id),
    [
      "lacunar-hole-dessert-1260-930",
      "dense-foreground-leak-1580-1260",
      "black-band-dropout-2300-1055",
    ],
  );

  const readiness = ANCHOR_LEDGER_PIXELS.map((pixel) => classifyLedgerConicDiagnosticReadiness(pixel));

  assert.ok(readiness.every((entry) => entry.status === "blocked-missing-per-pixel-conic-trace"));
  assert.ok(readiness.every((entry) => entry.backend.effectiveArenaBackend === "gpu"));
  assert.ok(readiness.every((entry) => entry.backend.orderingBackend === "gpu-sorted-index-rank-inversion"));
  assert.ok(readiness.every((entry) => entry.backend.projectedCount === 2360150));
  assert.ok(readiness.every((entry) => entry.backend.retainedCount === 2360150));
  assert.ok(readiness.every((entry) => entry.backend.droppedCount === 0));
  assert.ok(readiness.every((entry) => entry.missingFields.includes("perPixelContributors[].centerPx")));
  assert.ok(readiness.every((entry) => entry.missingFields.includes("perPixelContributors[].inverseConic")));
  assert.ok(readiness.every((entry) => entry.missingFields.includes("perPixelContributors[].coverageWeight")));
  assert.ok(readiness.every((entry) => entry.missingFields.includes("perPixelContributors[].depth")));
  assert.equal(
    readiness.find((entry) => entry.id === "black-band-dropout-2300-1055").supportSummary.status,
    "missing-band-specific-support-field",
  );
});

test("synthetic pixel trace proves conic-density underfill when projected support misses the sample", () => {
  const { lacunarFootprintGap } = makeConicDensitySyntheticCases();
  const verdict = evaluateConicDensityAtPixel(lacunarFootprintGap);

  assert.equal(verdict.status, "conic-density-underfill");
  assert.equal(verdict.mechanism, "screen-space-sampling-footprint-gap");
  assert.ok(verdict.maxCoverageWeight < lacunarFootprintGap.minPixelCoverageWeight);
  assert.ok(verdict.totalCoverageWeight < lacunarFootprintGap.minTotalCoverageWeight);
  assert.equal(verdict.contributors.length, 4);
  assert.deepEqual(Object.keys(verdict.contributors[0]), [
    "id",
    "originalId",
    "centerPx",
    "inverseConic",
    "coverageWeight",
    "depth",
    "projected",
    "retained",
    "dropped",
    "pixelCoverageWeight",
  ]);
});

test("synthetic pixel trace falsifies conic underfill when a retained contributor covers the sample", () => {
  const { coveredForegroundSample } = makeConicDensitySyntheticCases();
  const verdict = evaluateConicDensityAtPixel(coveredForegroundSample);

  assert.equal(verdict.status, "conic-density-sufficient");
  assert.equal(verdict.mechanism, "not-conic-density-underfill");
  assert.ok(verdict.maxCoverageWeight >= coveredForegroundSample.minPixelCoverageWeight);
  assert.ok(verdict.totalCoverageWeight >= coveredForegroundSample.minTotalCoverageWeight);
  assert.equal(verdict.strongestContributor.id, "foreground-centered");
  assert.deepEqual(verdict.strongestContributor.centerPx, [64, 64]);
  assert.deepEqual(verdict.strongestContributor.inverseConic, [1 / 36, 0, 1 / 36]);
});
