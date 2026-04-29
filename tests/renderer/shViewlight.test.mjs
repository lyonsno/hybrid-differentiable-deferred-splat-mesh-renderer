import assert from "node:assert/strict";
import test from "node:test";

import {
  SH_VIEWLIGHT_CONTRACT,
  evaluateShColor,
} from "../../src/rendererFidelityProbes/shViewlight.js";

test("CPU SH witness changes color with view direction under preserved source coordinates", () => {
  const coeffs = new Float32Array([
    0.0, 0.0, 0.0,
    0.0, 0.6, 0.0,
    -0.8, 0.0, -0.4,
  ]);

  const fromPositiveX = evaluateShColor({
    dcColor: [0.5, 0.5, 0.5],
    shDegree: 1,
    shCoefficients: coeffs,
    viewDirection: [1, 0, 0],
  });
  const fromNegativeX = evaluateShColor({
    dcColor: [0.5, 0.5, 0.5],
    shDegree: 1,
    shCoefficients: coeffs,
    viewDirection: [-1, 0, 0],
  });

  assert.equal(SH_VIEWLIGHT_CONTRACT.coordinateConvention.sourceXScreenDirection, "positive_source_x_screen_right");
  assert.notDeepEqual(fromPositiveX, fromNegativeX);
  assert.ok(fromPositiveX[0] > fromNegativeX[0]);
  assert.equal(fromPositiveX[1], fromNegativeX[1]);
});
