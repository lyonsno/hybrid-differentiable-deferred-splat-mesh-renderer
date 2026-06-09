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

  assert.match(shader, /let tileCoverageWeight = max\(tileCoverageWeights\[refIndex\], 0\.0\)/);
  assert.match(shader, /if\s*\(tileCoverageWeight <= 0\.0\)\s*\{\s*continue;\s*\}/);
  assert.match(shader, /let pixelCoverageWeight = conic_pixel_weight\(alphaParam, conicParam, pixelCenter\)/);
  assert.match(shader, /let alphaTransferWeight = source_frontier_alpha_transfer_weight\(pixelCoverageWeight,\s*tileCoverageWeight,\s*sourceFrontierClassMask\)/);
  assert.match(shader, /1\.0\s*-\s*pow\(1\.0\s*-\s*sourceOpacity,\s*alphaTransferWeight\)/);
  assert.doesNotMatch(shader, /tileCoverageWeights\[refIndex\][^;\n]*\*\s*conic_pixel_weight/);
});

test("source-frontier foreground support preserves tile coverage as optical depth above one", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const traceSource = readFileSync(
    new URL("../../src/rendererFidelityProbes/finalAccumulationTrace.js", import.meta.url),
    "utf8",
  );
  const denseForegroundOpacity = 0.08;
  const denseTileCoverageWeight = 8;
  const cappedSingleSampleAlpha = alphaFromCoverageOpacity(denseForegroundOpacity, 1);
  const opticalDepthAlpha = alphaFromCoverageOpacity(denseForegroundOpacity, denseTileCoverageWeight);

  assert.ok(
    opticalDepthAlpha > cappedSingleSampleAlpha * 4,
    `expected dense support to seal with tile optical depth, saw ${opticalDepthAlpha} vs capped ${cappedSingleSampleAlpha}`,
  );
  assert.doesNotMatch(
    shader,
    /min\(\s*max\(tileCoverageWeight,\s*0\.0\)\s*\*\s*SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE,\s*1\.0\s*\)/,
    "WGSL foreground support must not cap tile coverage optical depth to one sample",
  );
  assert.match(
    shader,
    /let supportWeight = max\(tileCoverageWeight,\s*0\.0\)\s*\*\s*SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE/,
    "WGSL foreground support should carry scaled tile coverage as optical depth",
  );
  assert.doesNotMatch(
    mainSource,
    /Math\.min\(\s*Math\.max\(Number\.isFinite\(tileCoverageWeight\) \? tileCoverageWeight : 0,\s*0\)\s*\*\s*SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE,\s*1,\s*\)/,
    "CPU readback mirror must not cap foreground support optical depth to one sample",
  );
  assert.doesNotMatch(
    traceSource,
    /Math\.min\(\s*Math\.max\(Number\.isFinite\(tileCoverageWeight\) \? tileCoverageWeight : 0,\s*0\)\s*\*\s*SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE,\s*1,\s*\)/,
    "final accumulation trace mirror must not cap foreground support optical depth to one sample",
  );
});
