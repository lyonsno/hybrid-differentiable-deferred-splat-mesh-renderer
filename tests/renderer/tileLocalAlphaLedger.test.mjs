import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  alphaFromCoverageOpacity,
  composeOrderedAlphaTransfer,
} from "../../src/rendererFidelityProbes/alphaTransfer.js";

const EPSILON = 1e-12;

test("tile-local alpha transfer treats conic pixel weight as optical depth without tile-mass double attenuation", () => {
  const sourceOpacity = 0.08;
  const tileIntegratedCoverageWeight = 0.23;
  const centerConicWeight = 1;
  const doubleAttenuatedAlpha = alphaFromCoverageOpacity(
    sourceOpacity,
    tileIntegratedCoverageWeight * centerConicWeight,
  );
  const pixelOpticalDepthAlpha = alphaFromCoverageOpacity(sourceOpacity, centerConicWeight);

  assert.ok(doubleAttenuatedAlpha < sourceOpacity * 0.25);
  assert.ok(Math.abs(pixelOpticalDepthAlpha - sourceOpacity) <= EPSILON);

  const brightBehind = { id: "bright-behind", depth: -9, color: [8, 8, 8], opacity: 0.6, coverageWeight: 1 };
  const doubleAttenuatedSheet = Array.from({ length: 30 }, (_, index) => ({
    id: `foreground-${index}`,
    depth: -4 + index * 0.001,
    color: [0.42, 0.38, 0.32],
    opacity: sourceOpacity,
    coverageWeight: tileIntegratedCoverageWeight,
  }));
  const repairedSheet = doubleAttenuatedSheet.map((layer) => ({
    ...layer,
    coverageWeight: centerConicWeight,
  }));

  const doubleAttenuated = composeOrderedAlphaTransfer([brightBehind, ...doubleAttenuatedSheet]);
  const repaired = composeOrderedAlphaTransfer([brightBehind, ...repairedSheet]);

  assert.ok(
    doubleAttenuated.remainingTransmission > repaired.remainingTransmission * 6,
    `expected double attenuation to leak much more background: ${doubleAttenuated.remainingTransmission} vs ${repaired.remainingTransmission}`,
  );
  assert.ok(repaired.transferWeights[0].weight < 0.06, `expected dense foreground to suppress behind layer, saw ${repaired.transferWeights[0].weight}`);
});

test("tile-local visible WGSL does not multiply tile-integrated coverage by conic pixel coverage for alpha transfer", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(shader, /let tileCoverageWeight = max\(tileCoverageWeights\[selectedRefIndex\], 0\.0\)/);
  assert.match(shader, /if\s*\(tileCoverageWeight <= 0\.0\)\s*\{\s*continue;\s*\}/);
  assert.match(shader, /let pixelCoverageWeight = conic_pixel_weight\(alphaParam, conicParam, pixelCenter\)/);
  assert.match(shader, /1\.0\s*-\s*pow\(1\.0\s*-\s*sourceOpacity,\s*pixelCoverageWeight\)/);
  assert.doesNotMatch(shader, /tileCoverageWeights\[selectedRefIndex\][^;\n]*\*\s*conic_pixel_weight/);
});
