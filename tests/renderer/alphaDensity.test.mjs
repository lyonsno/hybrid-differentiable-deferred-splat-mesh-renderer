import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyAlphaDensityWitness,
  composePathologicalReflectionWitness,
  compensateAlphaForLayerDensity,
  compensateAlphaForProjectedArea,
  transmissionThroughAlphaLayers,
} from "../../src/rendererFidelityProbes/alphaDensity.js";

const EPSILON = 1e-12;

test("dense transparent surface layers can fully suppress a bright pathological splat behind them", () => {
  const witness = composePathologicalReflectionWitness({
    surfaceLayerCount: 72,
    surfaceAlpha: 0.08,
    behindLayer: { id: "reflection-hotspot", depth: -9, color: [10, 9, 7], alpha: 0.6 },
    clearColor: [0.02, 0.02, 0.04],
  });

  assert.equal(witness.surfaceLayerCount, 72);
  assert.ok(witness.behindLayerWeight < 0.003, `expected hidden bright weight, saw ${witness.behindLayerWeight}`);
  assert.equal(witness.classification.primaryCause, "density-occlusion");
  assert.equal(witness.classification.policy, "bounded-density-compensation-witness-only");
});

test("density compensation preserves sheet opacity while allowing deeper splats to contribute", () => {
  const targetSheetAlpha = 0.72;
  const uncompensatedTransmission = transmissionThroughAlphaLayers(48, 0.08);
  const compensatedAlpha = compensateAlphaForLayerDensity({
    layerAlpha: 0.08,
    layerCount: 48,
    referenceLayerCount: 12,
  });
  const compensatedTransmission = transmissionThroughAlphaLayers(48, compensatedAlpha);
  const referenceTransmission = transmissionThroughAlphaLayers(12, 0.08);

  assert.ok(uncompensatedTransmission < 0.02, `expected nearly opaque dense stack, saw ${uncompensatedTransmission}`);
  assert.ok(compensatedAlpha < 0.03, `expected per-layer alpha reduction, saw ${compensatedAlpha}`);
  assert.ok(Math.abs(compensatedTransmission - referenceTransmission) <= EPSILON);
  assert.ok(Math.abs(compensatedTransmission - (1 - targetSheetAlpha)) > 0.02);
});

test("projected-area compensation uses optical depth rather than linear opacity scaling", () => {
  const sourceAlpha = 0.35;
  const areaCompensated = compensateAlphaForProjectedArea({
    layerAlpha: sourceAlpha,
    projectedAreaRatio: 4,
  });
  const linearScale = sourceAlpha / 4;

  assert.ok(areaCompensated > linearScale);
  assert.ok(Math.abs(transmissionThroughAlphaLayers(4, areaCompensated) - (1 - sourceAlpha)) <= EPSILON);
});

test("witness separates density, conic, sort, SH, and coordinate explanations", () => {
  const classification = classifyAlphaDensityWitness({
    surfaceLayerCount: 64,
    surfaceAlpha: 0.07,
    projectedAreaRatio: 1.2,
    sortInversions: 0,
    hasHigherOrderSh: false,
    handednessAnchor: {
      sourceXyzPreserved: true,
      sourceWxyzQuaternionPreserved: true,
      horizontalMirror: false,
      presentationFlipY: true,
    },
  });

  assert.equal(classification.primaryCause, "density-occlusion");
  assert.equal(classification.coordinateStatus, "handedness-anchor-consumed");
  assert.deepEqual(classification.blockedBy, ["missing-sh"]);
  assert.equal(classification.rejectedExplanations.includes("horizontal-presentation-mirror"), true);
  assert.equal(classification.rejectedExplanations.includes("loader-position-flip"), true);
});

test("large projected area and sort inversions block alpha policy claims", () => {
  const classification = classifyAlphaDensityWitness({
    surfaceLayerCount: 18,
    surfaceAlpha: 0.06,
    projectedAreaRatio: 5.5,
    sortInversions: 3,
    hasHigherOrderSh: true,
    handednessAnchor: {
      sourceXyzPreserved: true,
      sourceWxyzQuaternionPreserved: true,
      horizontalMirror: false,
      presentationFlipY: true,
    },
  });

  assert.equal(classification.primaryCause, "blocked-by-conic-and-sort");
  assert.deepEqual(classification.blockedBy, ["conic-footprint-area", "sort-limits"]);
  assert.equal(classification.policy, "do-not-tune-alpha");
}
);
