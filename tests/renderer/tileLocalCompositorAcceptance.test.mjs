import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  composeTileLocalGaussianTile,
  describeTileLocalCompositorAcceptanceContract,
} from "../../src/rendererFidelityProbes/tileLocalCompositor.js";

const EPSILON = 1e-12;

function assertClose(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${label}: expected ${expected}, got ${actual}`);
}

function assertColor(actual, expected) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index += 1) {
    assertClose(actual[index], expected[index], `color component ${index}`);
  }
}

test("dense overlap composes ordered tile-local Gaussian refs with raw coverage weights", () => {
  const result = composeTileLocalGaussianTile({
    tileId: 12,
    clearColor: [0.02, 0.02, 0.04],
    tileRefs: [
      { splatId: 10, viewDepth: -9, stableTieId: 10, coverageWeight: 1 },
      { splatId: 21, viewDepth: -4, stableTieId: 21, coverageWeight: 10 },
      { splatId: 22, viewDepth: -3, stableTieId: 22, coverageWeight: 10 },
      { splatId: 23, viewDepth: -2, stableTieId: 23, coverageWeight: 10 },
    ],
    splats: [
      { splatId: 10, color: [8, 6, 4], opacity: 0.55 },
      { splatId: 21, color: [0.42, 0.42, 0.44], opacity: 0.08 },
      { splatId: 22, color: [0.44, 0.42, 0.41], opacity: 0.08 },
      { splatId: 23, color: [0.41, 0.43, 0.42], opacity: 0.08 },
    ],
  });

  assert.equal(result.status, "tile-local-gaussian-composited");
  assert.deepEqual(result.drawSplatIds, [10, 21, 22, 23]);
  assert.deepEqual(result.orderedRefs.map((entry) => entry.orderKey), [
    { quantizedDepth: -9, stableTieId: 10, tileId: 12 },
    { quantizedDepth: -4, stableTieId: 21, tileId: 12 },
    { quantizedDepth: -3, stableTieId: 22, tileId: 12 },
    { quantizedDepth: -2, stableTieId: 23, tileId: 12 },
  ]);
  assert.ok(result.remainingTransmission < 0.04);
  assert.ok(result.transferWeights[0].weight < 0.05);
  assertColor(result.color, [0.7462209731134554, 0.662456477592694, 0.567052825293155]);
  assert.equal(result.normalization.policy, "coverage-is-optical-depth-do-not-normalize");
});

test("equal-depth refs resolve by stable tie id before accumulation", () => {
  const result = composeTileLocalGaussianTile({
    tileId: 3,
    clearColor: [0, 0, 0],
    tileRefs: [
      { splatId: 21, viewDepth: -3.5, stableTieId: 102, coverageWeight: 1 },
      { splatId: 18, viewDepth: -3.5, stableTieId: 100, coverageWeight: 1 },
      { splatId: 24, viewDepth: -3.5, stableTieId: 101, coverageWeight: 1 },
    ],
    splats: [
      { splatId: 18, color: [1, 0, 0], opacity: 0.5 },
      { splatId: 21, color: [0, 0, 1], opacity: 0.5 },
      { splatId: 24, color: [0, 1, 0], opacity: 0.5 },
    ],
  });

  assert.deepEqual(result.drawSplatIds, [18, 24, 21]);
  assert.deepEqual(
    result.transferWeights.map((entry) => [entry.id, entry.weight]),
    [
      ["18", 0.125],
      ["24", 0.25],
      ["21", 0.5],
      ["clear", 0.125],
    ],
  );
  assertColor(result.color, [0.125, 0.25, 0.5]);
});

test("sparse empty tile stays clear and is not a bridge-block diagnostic witness", () => {
  const result = composeTileLocalGaussianTile({
    tileId: 99,
    clearColor: [0.02, 0.02, 0.04],
    tileRefs: [],
    splats: [
      { splatId: 1, color: [1, 0, 0], opacity: 1 },
    ],
  });

  assert.equal(result.status, "empty-tile-clear");
  assert.deepEqual(result.drawSplatIds, []);
  assert.deepEqual(result.orderedRefs, []);
  assert.deepEqual(result.transferWeights, [{ id: "clear", weight: 1 }]);
  assertColor(result.color, [0.02, 0.02, 0.04]);
  assert.equal(result.alpha, 0);
  assert.equal(result.bridgeDiagnosticBoundary.blockWitnessColorsAllowed, false);
});

test("acceptance contract names the bridge diagnostic boundary without claiming final renderer scope", () => {
  assert.deepEqual(describeTileLocalCompositorAcceptanceContract(), {
    consumes: [
      "tile-list-bridge:tile-local-refs",
      "tile-coverage-builder:coverageWeight",
      "tile-ordering:stable-back-to-front-order",
      "alpha-transfer:optical-depth-source-over",
    ],
    requiredCases: ["dense-overlap", "equal-depth-stable-tie", "sparse-empty-tile"],
    visiblyDifferentFromBridgeDiagnostic: [
      "accumulates splat color and opacity from refs",
      "uses raw coverage weights as optical depth",
      "returns clear output for empty tiles instead of tile-block witness colors",
    ],
    forbiddenClaims: [
      "final-gpu-tile-ref-builder",
      "spherical-harmonics-shading",
      "pbr-relighting",
      "deferred-g-buffer-output",
      "beauty-threshold",
    ],
  });
});

test("docs state the real-compositor boundary without promoting bridge diagnostics or final renderer claims", () => {
  const docs = readFileSync(
    new URL("../../docs/renderer-fidelity/tile-local-compositor-acceptance.md", import.meta.url),
    "utf8",
  );

  assert.match(docs, /Bridge Diagnostic Boundary/);
  assert.match(docs, /buffer-visibility witness only/);
  assert.match(docs, /ordered Gaussian alpha accumulation/);
  assert.match(docs, /block witness colors are not acceptance evidence/);
  assert.match(docs, /Not Claimed/);
  assert.match(docs, /final GPU tile ref-builder/);
  assert.match(docs, /spherical harmonics/);
});
