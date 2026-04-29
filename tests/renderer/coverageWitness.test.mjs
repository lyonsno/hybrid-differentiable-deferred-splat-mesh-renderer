import assert from "node:assert/strict";
import test from "node:test";

import {
  makeCoverageSyntheticCases,
  measureCoverageCase,
} from "../../src/rendererFidelityProbes/coverageWitness.js";

const assertClose = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
};

test("glancing thin-surface witness exposes min-radius over-coverage without changing opacity", () => {
  const { glancingThinRibbon } = makeCoverageSyntheticCases();
  const measurement = measureCoverageCase(glancingThinRibbon, {
    viewportMinPx: 720,
    splatScale: 600,
    minRadiusPx: 0.75,
  });

  assert.equal(measurement.status, "min-radius-overcoverage");
  assert.equal(measurement.flooredAxes, 1);
  assert.equal(measurement.recommendation, "report-coverage-floor-do-not-change-opacity");
  assert.ok(measurement.referenceRadiiPx.major > 20);
  assert.ok(measurement.referenceRadiiPx.minor < 0.05);
  assert.ok(measurement.areaInflation > 20);
});

test("splat scale calibration is linear in radius and quadratic in area before any floor", () => {
  const { resolvedEllipticalSplat } = makeCoverageSyntheticCases();
  const halfScale = measureCoverageCase(resolvedEllipticalSplat, {
    viewportMinPx: 720,
    splatScale: 300,
    minRadiusPx: 0,
  });
  const fullScale = measureCoverageCase(resolvedEllipticalSplat, {
    viewportMinPx: 720,
    splatScale: 600,
    minRadiusPx: 0,
  });

  assertClose(fullScale.referenceRadiiPx.major / halfScale.referenceRadiiPx.major, 2, 1e-12, "major radius scale");
  assertClose(fullScale.referenceRadiiPx.minor / halfScale.referenceRadiiPx.minor, 2, 1e-12, "minor radius scale");
  assertClose(fullScale.referenceAreaPx / halfScale.referenceAreaPx, 4, 1e-12, "area scale");
  assert.equal(fullScale.status, "reference-coverage");
});

test("minimum radius policy leaves already resolved conics geometrically unchanged", () => {
  const { resolvedEllipticalSplat } = makeCoverageSyntheticCases();
  const measurement = measureCoverageCase(resolvedEllipticalSplat, {
    viewportMinPx: 720,
    splatScale: 600,
    minRadiusPx: 0.75,
  });

  assert.equal(measurement.status, "reference-coverage");
  assert.equal(measurement.flooredAxes, 0);
  assertClose(measurement.areaInflation, 1, 1e-12, "resolved conic area inflation");
});
