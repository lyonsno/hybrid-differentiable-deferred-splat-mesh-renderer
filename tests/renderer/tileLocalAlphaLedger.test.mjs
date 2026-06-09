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
  assert.match(shader, /let alphaTransferWeight = source_frontier_alpha_transfer_weight\(pixelCoverageWeight,\s*tileCoverageWeight,\s*sourceFrontierSupportWeight,\s*sourceFrontierClassMask\)/);
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

test("source-frontier foreground support is spatially attenuated instead of tile-wide", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const traceSource = readFileSync(
    new URL("../../src/rendererFidelityProbes/finalAccumulationTrace.js", import.meta.url),
    "utf8",
  );
  const tileCoverageWeight = 8;
  const supportScale = 2;
  const mahalanobis2 = 4;
  const legacyPixelWeight = Math.exp(-2 * mahalanobis2);
  const spatialSupportPixelWeight = Math.exp(-0.5 * mahalanobis2);
  const tileWideSupportWeight = tileCoverageWeight * supportScale;
  const spatialSupportWeight = tileWideSupportWeight * spatialSupportPixelWeight;

  assert.ok(
    spatialSupportWeight > legacyPixelWeight * 1000,
    `expected broad support envelope to repair sparse per-pixel conic underfill: ${spatialSupportWeight} vs ${legacyPixelWeight}`,
  );
  assert.ok(
    spatialSupportWeight < tileWideSupportWeight * 0.2,
    `expected support to remain spatially attenuated instead of tile-wide: ${spatialSupportWeight} vs ${tileWideSupportWeight}`,
  );
  assert.match(
    shader,
    /const SOURCE_FRONTIER_SUPPORT_FALLOFF_SCALE = 0\.5/,
    "WGSL should name the broader source-frontier spatial support envelope",
  );
  assert.match(
    shader,
    /let sourceFrontierSupportWeight = conic_pixel_weight_with_falloff_scale\(alphaParam,\s*conicParam,\s*pixelCenter,\s*SOURCE_FRONTIER_SUPPORT_FALLOFF_SCALE\)/,
    "WGSL should compute a per-pixel support envelope separate from the narrow color conic",
  );
  assert.match(
    shader,
    /let supportWeight = max\(tileCoverageWeight,\s*0\.0\)\s*\*\s*SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE\s*\*\s*max\(sourceFrontierSupportWeight,\s*0\.0\)/,
    "source-frontier foreground support should scale tile coverage by a per-pixel support envelope",
  );
  assert.doesNotMatch(
    shader,
    /let supportWeight = max\(tileCoverageWeight,\s*0\.0\)\s*\*\s*SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE\s*;/,
    "source-frontier foreground support must not apply a tile-wide support floor to every pixel in the tile",
  );
  assert.match(
    mainSource,
    /sourceFrontierSupportPixelWeightFromParams/,
    "CPU readback mirror should expose the same spatial support envelope as WGSL",
  );
  assert.match(
    traceSource,
    /sourceFrontierSupportPixelWeight/,
    "final accumulation trace should report the spatial support envelope used by source-frontier alpha transfer",
  );
});
