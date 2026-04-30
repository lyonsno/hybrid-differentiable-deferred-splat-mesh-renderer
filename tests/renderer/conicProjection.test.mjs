import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyConicCase,
  compareProjectedConicCase,
  makeConicSyntheticCases,
} from "../../src/rendererFidelityProbes/conicProjection.js";

const covarianceDistance = (a, b) =>
  Math.hypot(a.xx - b.xx, a.xy - b.xy, a.yy - b.yy);

const assertClose = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
};

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

test("projected fragment footprint scales linearly in radius and quadratically in area before the floor", () => {
  const { smallCentered } = makeConicSyntheticCases();
  const halfScale = compareProjectedConicCase(smallCentered, {
    viewportMinPx: 720,
    splatScale: 300,
    minRadiusPx: 0,
  }).fragmentFootprint;
  const fullScale = compareProjectedConicCase(smallCentered, {
    viewportMinPx: 720,
    splatScale: 600,
    minRadiusPx: 0,
  }).fragmentFootprint;

  assert.ok(halfScale);
  assert.ok(fullScale);
  assertClose(fullScale.rawRadiiPx.major / halfScale.rawRadiiPx.major, 2, 1e-12, "major radius scale");
  assertClose(fullScale.rawRadiiPx.minor / halfScale.rawRadiiPx.minor, 2, 1e-12, "minor radius scale");
  assertClose(fullScale.rawAreaPx / halfScale.rawAreaPx, 4, 1e-12, "area scale");
  assert.equal(fullScale.status, "reference-coverage");
});

test("glancing thin ribbons stay anisotropic under the fragment min-radius calibration", () => {
  const { glancingThinRibbon } = makeConicSyntheticCases();
  const footprint = compareProjectedConicCase(glancingThinRibbon, {
    viewportMinPx: 720,
    splatScale: 600,
    minRadiusPx: 0.75,
  }).fragmentFootprint;

  assert.ok(footprint);
  assert.equal(footprint.status, "thin-glancing-anti-fuzz");
  assert.equal(footprint.flooredAxes, 1);
  assert.ok(footprint.rawRadiiPx.minor < 0.05);
  assert.ok(footprint.calibratedRadiiPx.minor < 0.75 / 8);
  assert.ok(footprint.areaInflation < 5);
});
