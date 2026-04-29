import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyReferenceMirrorCause,
  makeAsymmetricHandednessWitness,
  mirrorQuaternionPairWitness,
} from "../../src/rendererFidelityProbes/handednessWitness.js";

test("asymmetric witness keeps source xyz and applies only the first-smoke vertical presentation flip", () => {
  const witness = makeAsymmetricHandednessWitness();

  assert.deepEqual(witness.source.triangle, [
    [-2, -1, 4],
    [3, -1, 4],
    [-1, 2, 4],
  ]);
  assert.deepEqual(witness.source.orientationWxyz, [0.9238795325112867, 0, 0, 0.3826834323650898]);

  assert.equal(witness.presentation.flip, "post-projection-y");
  assert.equal(witness.presentation.sourceXPreservedOnScreen, true);
  assert.equal(witness.presentation.sourceYInvertedOnScreen, true);
  assert.equal(witness.presentation.sourceZPreservedBeforeProjection, true);
  assert.equal(witness.camera.positiveSourceXMapsScreenRight, true);
  assert.equal(witness.camera.horizontalMirrorIntroducedByFirstSmokeCamera, false);
});

test("true coordinate reflections require a paired quaternion-axis transform", () => {
  const witness = mirrorQuaternionPairWitness("x");

  assert.equal(witness.axis, "x");
  assert.equal(witness.positionRule, "mirror-position-component");
  assert.equal(witness.unpairedQuaternionBreaksCovarianceMirror, true);
  assert.equal(witness.pairedQuaternionPreservesMirroredCovariance, true);
});

test("reference mirror classification does not blame loader xyz or quaternion semantics", () => {
  const classification = classifyReferenceMirrorCause(makeAsymmetricHandednessWitness());

  assert.equal(classification.sourceXyzContract, "preserve-source-xyz");
  assert.equal(classification.quaternionContract, "preserve-source-wxyz-unless-a-coordinate-reflection-is-explicitly-paired");
  assert.equal(classification.currentRendererIntroducesHorizontalMirror, false);
  assert.deepEqual(classification.ruledOut, [
    "loader-position-flip",
    "unpaired-loader-quaternion-flip",
    "first-smoke-horizontal-presentation-flip",
  ]);
  assert.deepEqual(classification.remainingExplanations, [
    "native-reference-camera-convention",
    "side-by-side-presentation-alignment",
    "explicit-future-coordinate-reflection-with-paired-quaternion-transform",
  ]);
});
