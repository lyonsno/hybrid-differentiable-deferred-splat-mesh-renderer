import assert from "node:assert/strict";
import test from "node:test";

import {
  alphaFromCoverageOpacity,
  classifyAlphaTransferNormalization,
  composeOrderedAlphaTransfer,
} from "../../src/rendererFidelityProbes/alphaTransfer.js";

const EPSILON = 1e-12;

function assertColor(actual, expected) {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i += 1) {
    assert.ok(
      Math.abs(actual[i] - expected[i]) <= EPSILON,
      `component ${i}: expected ${expected[i]}, got ${actual[i]}`
    );
  }
}

test("coverage weight transfers opacity through optical depth rather than linear alpha scaling", () => {
  assert.equal(alphaFromCoverageOpacity(0.64, 0), 0);
  assert.equal(alphaFromCoverageOpacity(0.64, 1), 0.64);
  assert.ok(Math.abs(alphaFromCoverageOpacity(0.64, 0.25) - 0.2254033307585166) <= EPSILON);
  assert.ok(alphaFromCoverageOpacity(0.64, 0.25) > 0.64 * 0.25);
  assert.ok(Math.abs(alphaFromCoverageOpacity(0.64, 4) - 0.98320384) <= EPSILON);
});

test("ordered tile-local contributions compose without normalizing real coverage away", () => {
  const clearColor = [0.02, 0.02, 0.04];
  const contributions = [
    { id: "bright-behind", depth: -9, color: [8, 6, 4], opacity: 0.55, coverageWeight: 1 },
    { id: "surface-a", depth: -4, color: [0.42, 0.42, 0.44], opacity: 0.08, coverageWeight: 10 },
    { id: "surface-b", depth: -3, color: [0.44, 0.42, 0.41], opacity: 0.08, coverageWeight: 10 },
    { id: "surface-c", depth: -2, color: [0.41, 0.43, 0.42], opacity: 0.08, coverageWeight: 10 },
  ];

  const result = composeOrderedAlphaTransfer(contributions, { clearColor });
  const normalizedSheet = composeOrderedAlphaTransfer(
    contributions.map((contribution) =>
      contribution.id.startsWith("surface-")
        ? { ...contribution, coverageWeight: contribution.coverageWeight / 30 }
        : contribution
    ),
    { clearColor, normalizedForTransfer: true }
  );

  assert.deepEqual(result.drawIds, ["bright-behind", "surface-a", "surface-b", "surface-c"]);
  assert.ok(result.remainingTransmission < 0.04, `expected dense sheet transmission, saw ${result.remainingTransmission}`);
  assert.ok(result.transferWeights[0].weight < 0.05, `expected bright layer suppression, saw ${result.transferWeights[0].weight}`);
  assert.ok(
    normalizedSheet.transferWeights[0].weight > result.transferWeights[0].weight * 6,
    "normalizing coverage hides dense-sheet occlusion"
  );
  assert.equal(result.normalization.policy, "coverage-is-optical-depth-do-not-normalize");
  assert.equal(normalizedSheet.normalization.policy, "diagnostic-only-normalized-coverage");
});

test("normalization classifier separates legal diagnostics from forbidden transfer input", () => {
  assert.deepEqual(
    classifyAlphaTransferNormalization({
      coverageWeights: [10, 10, 10],
      normalizedForTransfer: false,
    }),
    {
      policy: "coverage-is-optical-depth-do-not-normalize",
      totalCoverageWeight: 30,
      normalizedForTransfer: false,
    }
  );
  assert.deepEqual(
    classifyAlphaTransferNormalization({
      coverageWeights: [10, 10, 10],
      normalizedForTransfer: true,
    }),
    {
      policy: "diagnostic-only-normalized-coverage",
      totalCoverageWeight: 30,
      normalizedForTransfer: true,
    }
  );
});
