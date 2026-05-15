import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildGpuTileCoverageBridge,
  writeGpuTileCoverageAlphaParams,
} from "../../src/gpuTileCoverageBridge.js";

const EPSILON = 1e-6;

function assertClose(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < EPSILON, `${label} expected ${expected}, got ${actual}`);
}

function assertCloseArray(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label} length`);
  for (let index = 0; index < actual.length; index += 1) {
    assertClose(actual[index], expected[index], `${label}[${index}]`);
  }
}

test("visible bridge stores contributor arena refs in compositor rank order", () => {
  const bridge = buildGpuTileCoverageBridge({
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 64,
    tileColumns: 1,
    tileRows: 1,
    sourceSplatCount: 3,
    splats: [],
    tileEntries: [],
    contributorArena: {
      records: [
        {
          tileIndex: 0,
          splatIndex: 2,
          originalId: 202,
          contributorIndex: 0,
          viewRank: 41,
          viewDepth: -8,
          depthBand: 0.8,
          coverageWeight: 0.75,
          opacity: 0.32,
          centerPx: [17, 19],
          inverseConic: { xx: 0.25, xy: 0.05, yy: 0.5 },
        },
        {
          tileIndex: 0,
          splatIndex: 1,
          originalId: 101,
          contributorIndex: 1,
          viewRank: 7,
          viewDepth: -2,
          depthBand: 0.2,
          coverageWeight: 2.5,
          opacity: 0.9,
          centerPx: [23, 29],
          inverseConic: { xx: 0.125, xy: -0.025, yy: 0.333 },
        },
      ],
    },
  });

  assert.equal(bridge.retainedTileEntryCount, 2);
  assert.deepEqual(Array.from(bridge.tileHeaders), [0, 2, 2, 0]);
  assert.deepEqual(Array.from(bridge.tileRefs.slice(0, 8)), [1, 101, 0, 0, 2, 202, 0, 1]);
  assert.deepEqual(Array.from(bridge.tileRefOrderingKeys), [7, 41, 0xffffffff]);
  assertClose(bridge.tileCoverageWeights[0], 2.5, "first arena coverage");
  assertClose(bridge.tileCoverageWeights[1], 0.75, "second arena coverage");
  assertClose(bridge.tileRefSourceOpacities[0], 0.9, "first arena opacity");
  assertClose(bridge.tileRefSourceOpacities[1], 0.32, "second arena opacity");
  assertCloseArray(
    Array.from(bridge.tileRefShapeParams.slice(0, 16)),
    [23, 29, 0.125, -0.025, 0.333, 0, 0, 0, 17, 19, 0.25, 0.05, 0.5, 0, 0, 0],
    "arena shape params",
  );

  const alphaParams = new Float32Array(bridge.tileEntryCount * 8);
  writeGpuTileCoverageAlphaParams(alphaParams, bridge, Float32Array.of(1, 0.1, 0.2), bridge.tileEntryCount);
  assertClose(alphaParams[0], 0.9, "first alpha param consumes arena opacity");
  assertClose(alphaParams[3], 7, "first alpha param carries arena ordering key");
  assertClose(alphaParams[4], 0.32, "second alpha param consumes arena opacity");
  assertClose(alphaParams[7], 41, "second alpha param carries arena ordering key");
});

test("visible shader consumes preordered tile refs without a per-pixel rank search", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(shader, /@binding\(3\) var<storage, read> scales/);
  assert.match(shader, /@binding\(4\) var<storage, read> rotations/);
  assert.match(shader, /let refIndex = header\.x \+ layer/);
  assert.match(shader, /let tileCoverageWeight = max\(tileCoverageWeights\[refIndex\], 0\.0\)/);
  assert.doesNotMatch(shader, /for \(var candidate = 0u; candidate < refLimit/);
  assert.doesNotMatch(shader, /selectedRefIndex|selectedRank|previousRank/);
  assert.doesNotMatch(shader, /resolve_tile_ref_ordering_key/);
});
