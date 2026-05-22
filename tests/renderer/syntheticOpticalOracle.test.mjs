import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";

import { composeOrderedAlphaTransfer } from "../../src/rendererFidelityProbes/alphaTransfer.js";
import { analyzeShape } from "../../scripts/visual-smoke/pixel-shape-analysis.mjs";

test("dense foreground suppresses a bright behind patch with exact final RGBA and transmittance", () => {
  const witness = composeOrderedAlphaTransfer([
    { id: "bright-behind", depth: -9, color: [0.96, 0.92, 0.88], opacity: 0.6, coverageWeight: 1 },
    { id: "foreground-0", depth: -4, color: [0.42, 0.36, 0.28], opacity: 0.08, coverageWeight: 10 },
    { id: "foreground-1", depth: -3, color: [0.41, 0.35, 0.27], opacity: 0.08, coverageWeight: 10 },
    { id: "foreground-2", depth: -2, color: [0.40, 0.34, 0.26], opacity: 0.08, coverageWeight: 10 },
  ], { clearColor: [0.02, 0.02, 0.04] });

  assert.deepEqual(witness.drawIds, [
    "bright-behind",
    "foreground-0",
    "foreground-1",
    "foreground-2",
  ]);
  assert.deepEqual(witness.color, [
    0.41967327522054776,
    0.36262405854933194,
    0.2878698955782816,
  ]);
  assert.equal(witness.alpha, 0.9672135185690647);
  assert.equal(witness.remainingTransmission, 0.032786481430935314);
  assert.deepEqual(witness.finalRgba, [
    0.41967327522054776,
    0.36262405854933194,
    0.2878698955782816,
    0.9672135185690647,
  ]);
  assert.equal(witness.transmittance, witness.remainingTransmission);
});

test("near-zero support remains transparent with exact transmittance", () => {
  const witness = composeOrderedAlphaTransfer([
    { id: "near-zero-support", depth: -2, color: [0.12, 0.14, 0.18], opacity: 0.08, coverageWeight: 0.000001 },
  ], { clearColor: [0.02, 0.02, 0.04] });

  assert.deepEqual(witness.drawIds, ["near-zero-support"]);
  assert.deepEqual(witness.color, [
    0.02000000833816055,
    0.020000010005792664,
    0.040000011673424776,
  ]);
  assert.equal(witness.alpha, 8.338160550902529e-8);
  assert.equal(witness.remainingTransmission, 0.9999999166183945);
  assert.equal(witness.transmittance, witness.remainingTransmission);
});

test("tile/order discontinuity stays inside a bounded changed-pixel geometry", () => {
  const width = 8;
  const height = 6;
  const background = [5, 5, 10, 255];
  const foreground = [220, 60, 30, 255];
  const rgba = Buffer.alloc(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    rgba[offset + 0] = background[0];
    rgba[offset + 1] = background[1];
    rgba[offset + 2] = background[2];
    rgba[offset + 3] = background[3];
  }

  for (let x = 1; x <= 6; x += 1) {
    for (const y of [1, 3]) {
      const offset = (y * width + x) * 4;
      rgba[offset + 0] = foreground[0];
      rgba[offset + 1] = foreground[1];
      rgba[offset + 2] = foreground[2];
      rgba[offset + 3] = foreground[3];
    }
  }

  const analysis = analyzeShape(rgba, width, height);

  assert.equal(analysis.mask.changedPixels, 12);
  assert.equal(analysis.mask.changedPixelRatio, 0.25);
  assert.deepEqual(analysis.boundingBox, {
    minX: 1,
    minY: 1,
    maxX: 6,
    maxY: 3,
    width: 6,
    height: 3,
  });
  assert.deepEqual(analysis.changedPixelGeometry, {
    changedPixels: 12,
    changedPixelRatio: 0.25,
    boundingBox: {
      minX: 1,
      minY: 1,
      maxX: 6,
      maxY: 3,
      width: 6,
      height: 3,
    },
  });
});
