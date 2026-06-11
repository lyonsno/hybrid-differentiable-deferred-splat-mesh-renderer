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
  assert.match(shader, /let pixelCoverageWeight = conic_pixel_weight\(alphaParam, conicParam, pixelCenter\)/);
  assert.match(shader, /let alphaTransferWeight = source_frontier_alpha_transfer_weight\(pixelCoverageWeight,\s*tileCoverageWeight,\s*tileLocalSupportWeight,\s*sourceFrontierSupportWeight,\s*sourceFrontierClassMask\)/);
  assert.match(shader, /1\.0\s*-\s*pow\(1\.0\s*-\s*sourceOpacity,\s*alphaTransferWeight\)/);
  assert.doesNotMatch(shader, /tileCoverageWeights\[refIndex\][^;\n]*\*\s*conic_pixel_weight/);
});

test("source-frontier retained conic support is not skipped by zero tile-center coverage", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const supportScale = numericConst(shader, "SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE");
  const zeroCenterRetainedRows = Array.from({ length: 4 }, (_, index) => ({
    opacity: 0.34,
    pixelCoverageWeight: 0,
    tileCoverageWeight: 0,
    tileLocalSupportWeight: 1.4 - index * 0.1,
    sourceFrontierSupportPixelWeight: 0.22,
  }));
  const prematureSkipAlpha = 0;
  const repairedAlpha = composeSourceFrontierSupportSlateAlpha(zeroCenterRetainedRows, supportScale);

  assert.ok(
    repairedAlpha > 0.7,
    `expected retained tile-local support to seal despite zero tile-center coverage, saw ${repairedAlpha}`,
  );
  assert.ok(
    repairedAlpha > prematureSkipAlpha + 0.7,
    "zero tile-center coverage must not make retained source-frontier support invisible",
  );
  assert.doesNotMatch(
    shader,
    /if\s*\(tileCoverageWeight <= 0\.0\)\s*\{\s*continue;\s*\}/,
    "WGSL compositor must not skip retained source-frontier support before reading tile-local conic support",
  );
  assert.match(
    shader,
    /let tileLocalSupportWeight = max\(tileCoverageWeight,\s*conicParam\.w\)[\s\S]*if\s*\(tileCoverageWeight <= 0\.0 && tileLocalSupportWeight <= 0\.0\)\s*\{\s*continue;\s*\}/,
    "WGSL compositor should skip only when both center coverage and tile-local support are absent",
  );
  assert.match(
    shader,
    /fn retained_ref_is_live\(refIndex: u32\) -> bool \{[\s\S]*let conicParam = alphaParams\[refIndex \+ frame\.maxTileRefs\];[\s\S]*let tileLocalSupportWeight = max\(tileCoverageWeight,\s*conicParam\.w\);[\s\S]*tileLocalSupportWeight > 0\.0/,
    "WGSL compaction liveness should keep retained refs alive when conic support exists without tile-center coverage",
  );
  assert.doesNotMatch(
    mainSource,
    /if\s*\(tileCoverageWeight <= 0\)\s*\{[\s\S]*status:\s*"skipped-zero-tile-coverage"[\s\S]*continue;/,
    "CPU readback mirror must not classify retained local-support rows as skipped solely because tile-center coverage is zero",
  );
  assert.match(
    mainSource,
    /const tileLocalSupportWeight = Math\.max\(tileCoverageWeight,\s*conicParam\[3\] \?\? 0\)[\s\S]*if\s*\(tileCoverageWeight <= 0 && tileLocalSupportWeight <= 0\)\s*\{/,
    "CPU readback mirror should skip only when both center coverage and tile-local support are absent",
  );
  const traceSource = readFileSync(
    new URL("../../src/rendererFidelityProbes/finalAccumulationTrace.js", import.meta.url),
    "utf8",
  );
  assert.match(
    traceSource,
    /function contributorCanEnterFinalAccumulation\(contributor, anchorPixel, tileAddress\) \{[\s\S]*const tileLocalSupportWeight = Math\.max\(tileCoverageWeight,\s*rawTileLocalSupportWeight,\s*0\);[\s\S]*if\s*\(tileCoverageWeight <= 0 && tileLocalSupportWeight <= 0\)\s*\{[\s\S]*return false;/,
    "final accumulation trace should not admit zero-center rows unless tile-local support is also present",
  );
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
    /let tileSupportWeight = max\(max\(tileCoverageWeight,\s*0\.0\),\s*max\(tileLocalSupportWeight,\s*0\.0\)\)/,
    "WGSL foreground support should carry the strongest tile-local support as optical depth",
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

test("source-frontier weak-anchor foreground slate seals through support-class optical depth", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const traceSource = readFileSync(
    new URL("../../src/rendererFidelityProbes/finalAccumulationTrace.js", import.meta.url),
    "utf8",
  );
  const supportScale = numericConst(shader, "SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE");
  const weakAnchorSupportRows = [
    { opacity: 0.372549, pixelCoverageWeight: 0.009460411758, tileCoverageWeight: 0.539417, sourceFrontierSupportPixelWeight: 0.311872807467 },
    { opacity: 0.464706, pixelCoverageWeight: 0.000392458726, tileCoverageWeight: 0.898066, sourceFrontierSupportPixelWeight: 0.140750030408 },
    { opacity: 0.229412, pixelCoverageWeight: 0.001673966555, tileCoverageWeight: 0.471458, sourceFrontierSupportPixelWeight: 0.20227243107 },
    { opacity: 0.098039, pixelCoverageWeight: 0.00000497852, tileCoverageWeight: 0.59525, sourceFrontierSupportPixelWeight: 0.04723621197 },
    { opacity: 0.196078, pixelCoverageWeight: 1.1e-11, tileCoverageWeight: 0.902387, sourceFrontierSupportPixelWeight: 0.001808808842 },
    { opacity: 0.462745, pixelCoverageWeight: 0, tileCoverageWeight: 0.621911, sourceFrontierSupportPixelWeight: 0.000783001392 },
    { opacity: 0.105882, pixelCoverageWeight: 0, tileCoverageWeight: 0.608511, sourceFrontierSupportPixelWeight: 0.000502424184 },
    { opacity: 0.464706, pixelCoverageWeight: 0, tileCoverageWeight: 0.28513, sourceFrontierSupportPixelWeight: 0.000679743557 },
    { opacity: 0.205882, pixelCoverageWeight: 0, tileCoverageWeight: 0.918075, sourceFrontierSupportPixelWeight: 0.000151997943 },
    { opacity: 0.317647, pixelCoverageWeight: 0, tileCoverageWeight: 0.33147, sourceFrontierSupportPixelWeight: 0.000325750114 },
    { opacity: 0.15098, pixelCoverageWeight: 0, tileCoverageWeight: 0.954736, sourceFrontierSupportPixelWeight: 0.000073932281 },
    { opacity: 0.317647, pixelCoverageWeight: 0, tileCoverageWeight: 0.97402, sourceFrontierSupportPixelWeight: 0.000012117079 },
    { opacity: 0.188235, pixelCoverageWeight: 0, tileCoverageWeight: 0.907382, sourceFrontierSupportPixelWeight: 0.000011170306 },
  ];
  const repairedAlpha = composeSourceFrontierSupportSlateAlpha(weakAnchorSupportRows, supportScale);
  const oldAlpha = composeSourceFrontierSupportSlateAlpha(weakAnchorSupportRows, 2);

  assert.ok(oldAlpha < 0.35, `expected the old 2x support scale to leak the weak anchor, saw ${oldAlpha}`);
  assert.ok(
    repairedAlpha > 0.75,
    `expected source-frontier foreground support to seal the weak anchor slate, saw ${repairedAlpha}`,
  );
  assert.equal(numericConst(mainSource, "SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE"), supportScale);
  assert.equal(numericConst(traceSource, "SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE"), supportScale);
});

test("source-frontier foreground support is spatially attenuated instead of tile-wide", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const traceSource = readFileSync(
    new URL("../../src/rendererFidelityProbes/finalAccumulationTrace.js", import.meta.url),
    "utf8",
  );
  const tileCoverageWeight = 8;
  const supportScale = numericConst(shader, "SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE");
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
    /let supportWeight = tileSupportWeight\s*\*\s*SOURCE_FRONTIER_FOREGROUND_ALPHA_SUPPORT_SCALE\s*\*\s*max\(sourceFrontierSupportWeight,\s*0\.0\)/,
    "source-frontier foreground support should scale tile-local support by a per-pixel support envelope",
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

function composeSourceFrontierSupportSlateAlpha(rows, supportScale) {
  let transmission = 1;
  for (const row of rows) {
    const tileSupportWeight = Math.max(row.tileCoverageWeight, row.tileLocalSupportWeight ?? 0);
    const alphaTransferWeight = Math.max(
      row.pixelCoverageWeight,
      tileSupportWeight * supportScale * row.sourceFrontierSupportPixelWeight,
    );
    transmission *= 1 - alphaFromCoverageOpacity(row.opacity, alphaTransferWeight);
  }
  return 1 - transmission;
}

function numericConst(source, name) {
  const match = source.match(new RegExp(`const ${name} = ([0-9.]+)`));
  assert.ok(match, `expected source to define ${name}`);
  return Number(match[1]);
}

test("source-frontier readback decodes foreground class masks from retained alpha payload", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(
    mainSource,
    /const SOURCE_FRONTIER_ALPHA_CLASS_MASK_SENTINEL = -1024/,
    "CPU readback mirror should name the same class-mask sentinel as the GPU retained-row payload",
  );
  assert.match(
    mainSource,
    /function sourceFrontierAlphaClassMaskFromAlphaParam\(/,
    "CPU readback mirror should decode source-frontier class masks from retained alpha payloads",
  );
  assert.match(
    mainSource,
    /const encodedCandidateSourceClassMask = sourceFrontierAlphaClassMaskFromAlphaParam\(alphaParam\)/,
    "source-frontier readback should inspect the retained row's encoded class mask",
  );
  assert.match(
    mainSource,
    /encodedCandidateSourceClassMask !== 0\s*\?\s*encodedCandidateSourceClassMask\s*:\s*candidateSourceClassMaskForSplatId\(plan,\s*tileHeaders,\s*splatIndex\)/,
    "source-frontier readback should prefer retained alpha payload role identity before falling back to source table lookup",
  );
  assert.doesNotMatch(
    mainSource,
    /const candidateSourceClassMask = tileRefPayloadEncoding === "source-frontier-score"\s*\?\s*candidateSourceClassMaskForSplatId\(plan,\s*tileHeaders,\s*splatIndex\)\s*:\s*0;/,
    "source-frontier readback must not classify retained rows only by source-index table lookup",
  );
});
