import assert from "node:assert/strict";
import test from "node:test";

import {
  describeSyntheticFinalColorOracleContract,
  makeSyntheticFinalColorScenes,
  renderSyntheticFinalColorScene,
} from "../../src/rendererFidelityProbes/syntheticFinalColorOracle.js";

const EPSILON = 1e-9;

test("synthetic final-color oracle contract names the dense-foreground and band-dropout scenes", () => {
  assert.deepEqual(describeSyntheticFinalColorOracleContract(), {
    consumes: [
      "final-color:ordered-alpha-transfer",
      "final-color:foreground-suppression-mask",
      "final-color:row-band-continuity",
    ],
    scenes: [
      "dense-foreground-occlusion",
      "row-band-dropout",
    ],
    assertions: [
      "foreground pixels stay dark while the hidden bright plate remains suppressed",
      "the middle band stays continuous instead of dropping rows",
      "alpha stays concrete rather than becoming a beauty-only score",
    ],
    doesNotClaim: [
      "real-scene-capture-harness",
      "Urmina-backend-construction",
      "production-visual-tuning",
    ],
  });
});

test("dense foreground final-color scene suppresses the plate except in the explicit hole", () => {
  const { denseForegroundOcclusion } = makeSyntheticFinalColorScenes();
  const result = renderSyntheticFinalColorScene(denseForegroundOcclusion);

  assertColorClose(result.pixels.get("foreground-left").color, [0.082, 0.058, 0.046], 5e-3);
  assertColorClose(result.pixels.get("foreground-right").color, [0.084, 0.060, 0.047], 5e-3);
  assertColorClose(result.pixels.get("hole-center").color, [0.94, 0.86, 0.76], 5e-3);
  assert.ok(result.pixels.get("foreground-left").alpha > 0.97);
  assert.ok(result.metrics.foregroundSuppressionRatio <= 0.12);
  assert.equal(result.metrics.brightLeakPixelIds.includes("hole-center"), false);
});

test("row dropout final-color scene keeps the dark middle band continuous", () => {
  const { rowBandDropout } = makeSyntheticFinalColorScenes();
  const result = renderSyntheticFinalColorScene(rowBandDropout);

  assert.deepEqual(result.metrics.bandMask, [false, true, false]);
  assertColorClose(result.pixels.get("row-top").color, [0.905, 0.82, 0.705], 5e-3);
  assertColorClose(result.pixels.get("row-middle").color, [0.055, 0.04, 0.035], 5e-3);
  assertColorClose(result.pixels.get("row-bottom").color, [0.903, 0.818, 0.704], 5e-3);
  assert.ok(result.metrics.bandContrastRatio <= 0.1);
});

test("simulated bad behaviors violate the same concrete final-color assertions", () => {
  const { denseForegroundOcclusion, rowBandDropout } = makeSyntheticFinalColorScenes();
  const leak = renderSyntheticFinalColorScene(denseForegroundOcclusion, { behavior: "foreground-leak" });
  const dropout = renderSyntheticFinalColorScene(rowBandDropout, { behavior: "row-dropout" });

  assert.ok(leak.metrics.foregroundSuppressionRatio > 0.9);
  assertColorClose(leak.pixels.get("foreground-left").color, [0.94, 0.86, 0.76], 5e-3);
  assert.ok(dropout.metrics.bandContrastRatio > 0.9);
  assert.deepEqual(dropout.metrics.bandMask, [false, true, false]);
  assertColorClose(dropout.pixels.get("row-middle").color, [0.905, 0.82, 0.705], 5e-3);
});

function assertColorClose(actual, expected, tolerance) {
  assert.equal(actual.length, expected.length, "channel count");
  for (let index = 0; index < expected.length; index += 1) {
    assert.ok(
      Math.abs(actual[index] - expected[index]) <= tolerance,
      `channel ${index}: expected ${expected[index]}, got ${actual[index]}`
    );
  }
}
