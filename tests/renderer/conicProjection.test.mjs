import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyConicCase,
  compareProjectedConicCase,
  makeConicSyntheticCases,
} from "../../src/rendererFidelityProbes/conicProjection.js";

const covarianceDistance = (a, b) =>
  Math.hypot(a.xx - b.xx, a.xy - b.xy, a.yy - b.yy);

test("projected Gaussian reference is invariant to covariance axis sign while endpoint projection is not", () => {
  const cases = makeConicSyntheticCases();
  const forward = compareProjectedConicCase(cases.perspectiveDepthAxisForward);
  const backward = compareProjectedConicCase(cases.perspectiveDepthAxisBackward);

  assert.ok(
    covarianceDistance(forward.reference.covariance, backward.reference.covariance) < 1e-12,
    "the Jacobian conic reference should see the same 3D covariance after a 180 degree axis sign flip"
  );
  assert.ok(
    covarianceDistance(forward.endpointApproximation.covariance, backward.endpointApproximation.covariance) > 0.08,
    "the current endpoint projection is sign-sensitive for a depth-aligned anisotropic splat"
  );

  assert.equal(classifyConicCase(cases.perspectiveDepthAxisForward).status, "approximation-fails");
  assert.equal(classifyConicCase(cases.perspectiveDepthAxisBackward).status, "approximation-fails");
});

test("small centered splats stay within the stated approximation bounds", () => {
  const { smallCentered } = makeConicSyntheticCases();
  const comparison = compareProjectedConicCase(smallCentered);

  assert.equal(classifyConicCase(smallCentered).status, "acceptable");
  assert.ok(comparison.relativeFrobeniusError < 0.01);
  assert.ok(comparison.nearPlaneSupport.crossesNearPlane === false);
});

test("rotated and near-plane-adjacent witnesses are classified separately from field semantics", () => {
  const cases = makeConicSyntheticCases();

  assert.equal(classifyConicCase(cases.rotatedInPlane).status, "acceptable");
  assert.equal(classifyConicCase(cases.edgeOnDepthAnisotropy).status, "approximation-fails");

  const nearPlane = classifyConicCase(cases.nearPlaneAdjacent);
  assert.equal(nearPlane.status, "near-plane-support");
  assert.equal(nearPlane.recommendation, "consume-slab-sentinel-policy");
});
