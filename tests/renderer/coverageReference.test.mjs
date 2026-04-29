import assert from "node:assert/strict";
import test from "node:test";

import {
  makeCoverageSyntheticCases,
  measureCoverageCase,
} from "../../src/rendererFidelityProbes/coverageWitness.js";
import {
  composeStraightAlphaBackToFront,
  gaussianCoverageAlpha,
} from "../../src/rendererFidelityProbes/alphaCompositing.js";

const EPSILON = 1e-12;

const assertClose = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
};

const assertColor = (actual, expected, label) => {
  assert.equal(actual.length, expected.length, `${label}: channel count`);
  for (let index = 0; index < expected.length; index += 1) {
    assertClose(actual[index], expected[index], EPSILON, `${label} channel ${index}`);
  }
};

test("coverage reference exposes the five packet anchor truth cases", () => {
  const cases = makeCoverageSyntheticCases();

  assert.deepEqual(Object.keys(cases).sort(), [
    "crossingTranslucentLayers",
    "denseTransparentSheetWithBrightBehind",
    "extremeAnisotropicSplat",
    "glancingThinRibbon",
    "singleSplat",
  ]);
});

test("single splat pins gaussian center and one-sigma coverage alpha without tile normalization", () => {
  const { singleSplat } = makeCoverageSyntheticCases();
  assert.equal(singleSplat.name, "single-splat");

  const center = singleSplat.coverageSamples.find((sample) => sample.name === "center");
  const oneSigma = singleSplat.coverageSamples.find((sample) => sample.name === "one-sigma-major");

  assertClose(gaussianCoverageAlpha(singleSplat.opacity, center.radiusSquared), 0.7, EPSILON, "center alpha");
  assertClose(
    gaussianCoverageAlpha(singleSplat.opacity, oneSigma.radiusSquared),
    0.7 * Math.exp(-2),
    EPSILON,
    "one-sigma alpha"
  );
});

test("extreme anisotropic and glancing cases pin coverage shape before alpha policy", () => {
  const { extremeAnisotropicSplat, glancingThinRibbon } = makeCoverageSyntheticCases();
  const extreme = measureCoverageCase(extremeAnisotropicSplat, {
    viewportMinPx: 720,
    splatScale: 600,
    minRadiusPx: 0,
  });
  const glancing = measureCoverageCase(glancingThinRibbon, {
    viewportMinPx: 720,
    splatScale: 600,
    minRadiusPx: 0.75,
  });

  assert.ok(extreme.referenceRadiiPx.major / extreme.referenceRadiiPx.minor > 900);
  assert.equal(extreme.status, "reference-coverage");
  assert.equal(glancing.status, "min-radius-overcoverage");
  assertClose(glancing.areaInflation, 33.333333333333336, 1e-8, "glancing area inflation");
});

test("dense transparent sheet preserves the bright behind-splat as a tiny nonzero contribution", () => {
  const { denseTransparentSheetWithBrightBehind } = makeCoverageSyntheticCases();
  const result = composeStraightAlphaBackToFront(denseTransparentSheetWithBrightBehind.layers);
  const bright = result.transferWeights.find((entry) => entry.id === "bright-behind");

  assert.equal(denseTransparentSheetWithBrightBehind.surfaceLayerCount, 72);
  assertClose(bright.weight, 0.6 * Math.pow(0.92, 72), EPSILON, "bright behind transfer weight");
  assert.ok(bright.weight > 0);
  assert.ok(bright.weight < 0.002);
});

test("crossing translucent layers pin per-sample order-dependent color outcomes", () => {
  const { crossingTranslucentLayers } = makeCoverageSyntheticCases();

  for (const sample of crossingTranslucentLayers.samples) {
    const result = composeStraightAlphaBackToFront(sample.layers, [0.02, 0.02, 0.04], 1);
    assert.deepEqual(result.drawIds, sample.expectedDrawIds, `${sample.name}: draw order`);
    assertColor(result.color, sample.expectedColor, sample.name);
  }
});
