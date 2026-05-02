/**
 * pixel-shape-harness.test.mjs
 *
 * Tests for the browser/WebGPU pixel capture surface (renderer-pixel-harness lane).
 *
 * Acceptance criteria per coordination packet:
 * 1. Fail-first test proves old smoke classifier passes a nonblank malformed image
 *    (fat blob where edge-on ribbon should be) while the new pixel-shape gate rejects it.
 * 2. captureShapeWitness exports a clean API: captureShapeWitness(fixtureId, options?) => { png: Buffer, metadata: {...} }
 * 3. The capture function exercises the real renderer path — not a CPU fake.
 */

import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";
import { test } from "node:test";

import { analyzePngBuffer } from "../../scripts/visual-smoke/png-analysis.mjs";
import {
  captureShapeWitness,
  isShapeWithinRibbonThicknessBound,
  SHAPE_WITNESS_FIXTURE_IDS,
  SHAPE_WITNESS_CAPTURE_VIEWPORT,
  buildShapeWitnessUrl,
} from "../../scripts/visual-smoke/pixel-shape-capture.mjs";

// ---------------------------------------------------------------------------
// Helpers: synthetic PNG generation (self-contained; not shared from other test)
// ---------------------------------------------------------------------------

function makePng(width, height, pixelAt) {
  const scanlines = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter type: None
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixelAt(x, y);
      const offset = 1 + x * 4;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
      row[offset + 3] = a;
    }
    scanlines.push(row);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr(width, height)),
    chunk("IDAT", deflateSync(Buffer.concat(scanlines))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;  // bit depth
  data[9] = 6;  // color type: RGBA
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Makes a synthetic PNG representing a fat circular blob — the kind of shape a
 * grossly misprojected isotropic splat produces, or a misaligned edge-on ribbon
 * whose thinness was lost in projection.
 *
 * The blob fills a large circular region at center. The old smoke classifier would
 * call this nonblank (lots of changed pixels, high average delta) and pass it.
 * An edge-on ribbon shape gate should reject it because it is too fat: its
 * minimum bounding dimension exceeds what a thin ribbon should produce.
 */
function makeFatBlobPng(size, blobRadius) {
  const cx = size / 2;
  const cy = size / 2;
  return makePng(size, size, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const inBlob = Math.sqrt(dx * dx + dy * dy) <= blobRadius;
    return inBlob ? [220, 180, 80, 255] : [10, 10, 10, 255];
  });
}

/**
 * Makes a synthetic PNG representing a thin edge-on ribbon — the correct shape
 * for an anisotropic edge-on splat. The ribbon is a small number of pixels tall
 * centered horizontally across the image.
 */
function makeThinRibbonPng(size, ribbonThickness) {
  const midY = Math.floor(size / 2);
  return makePng(size, size, (x, y) => {
    const inRibbon = Math.abs(y - midY) <= Math.floor(ribbonThickness / 2);
    return inRibbon ? [220, 180, 80, 255] : [10, 10, 10, 255];
  });
}

// ---------------------------------------------------------------------------
// FAIL-FIRST TEST: Old smoke classifier passes a malformed (fat blob) image
// while the new shape gate rejects it.
//
// This is the epistemic core of the packet: existing nonblank smoke is blind
// to gross shape failures. The new gate must see the difference.
// ---------------------------------------------------------------------------

test("old nonblank smoke classifier passes a fat blob that a shape gate should reject", () => {
  // A 64x64 image with a fat circular blob 28px radius — clearly not a thin ribbon.
  const size = 64;
  const blobRadius = 28;
  const fatBlobPng = makeFatBlobPng(size, blobRadius);

  // 1. Old classifier: should say nonblank (lots of changed pixels).
  const smokeResult = analyzePngBuffer(fatBlobPng, {
    minChangedPixelRatio: 0.002,
    minAverageDelta: 0.5,
  });

  assert.equal(smokeResult.nonblank, true,
    "old smoke classifier must pass the fat blob as nonblank — this is the gap the shape gate closes");
  assert.ok(smokeResult.changedPixelRatio > 0.1,
    "fat blob should have substantial changed pixel ratio");

  // 2. New shape gate: the blob is too thick to be an edge-on ribbon.
  //    maxThicknessFraction: 0.08 means <= 8% of frame height (5px in 64px frame).
  //    The 28px-radius blob spans ~56px of a 64px frame — 87% — which must fail.
  const shapeGatePasses = isShapeWithinRibbonThicknessBound(fatBlobPng, {
    maxThicknessFraction: 0.08,
  });

  assert.equal(shapeGatePasses, false,
    "shape gate must reject the fat blob: it is too thick to be an edge-on ribbon");
});

test("shape gate accepts a correctly thin ribbon that the old smoke classifier also sees as nonblank", () => {
  // 1px ribbon in a 64x64 frame — thickness fraction = 1/64 ≈ 1.5%
  const size = 64;
  const thinRibbonPng = makeThinRibbonPng(size, 1);

  // Old classifier still sees it as nonblank
  const smokeResult = analyzePngBuffer(thinRibbonPng, {
    minChangedPixelRatio: 0.002,
    minAverageDelta: 0.5,
  });
  assert.equal(smokeResult.nonblank, true,
    "thin ribbon should still count as nonblank in old smoke classifier");

  // Shape gate: ribbon thickness 1px in 64px frame = 1.5% < 8% threshold — must accept.
  const shapeGatePasses = isShapeWithinRibbonThicknessBound(thinRibbonPng, {
    maxThicknessFraction: 0.08,
  });
  assert.equal(shapeGatePasses, true,
    "shape gate must accept a correctly thin ribbon");
});

test("shape gate uses default threshold when options are omitted", () => {
  const size = 64;
  const fatBlobPng = makeFatBlobPng(size, 28);
  // Default threshold is conservative enough to still reject a fat blob.
  const shapeGatePasses = isShapeWithinRibbonThicknessBound(fatBlobPng);
  assert.equal(shapeGatePasses, false,
    "default threshold must still reject a fat blob");
});

// ---------------------------------------------------------------------------
// API contract tests (module exports, no browser launch)
// ---------------------------------------------------------------------------

test("SHAPE_WITNESS_FIXTURE_IDS exports all five canonical fixture IDs", () => {
  const expected = [
    "isotropic-circle",
    "edge-on-ribbon",
    "rotated-ellipse",
    "near-plane-slab",
    "dense-foreground",
  ];
  assert.deepEqual(
    [...SHAPE_WITNESS_FIXTURE_IDS].sort(),
    [...expected].sort(),
    "SHAPE_WITNESS_FIXTURE_IDS must match the metadata handshake fixture types"
  );
});

test("SHAPE_WITNESS_CAPTURE_VIEWPORT is 512x512", () => {
  assert.equal(SHAPE_WITNESS_CAPTURE_VIEWPORT.width, 512);
  assert.equal(SHAPE_WITNESS_CAPTURE_VIEWPORT.height, 512);
});

test("buildShapeWitnessUrl produces the canonical query shape", () => {
  const url = buildShapeWitnessUrl("http://localhost:5173", "edge-on-ribbon");
  assert.ok(
    url.includes("?synthetic=shape-witness-edge-on-ribbon") ||
    url.includes("&synthetic=shape-witness-edge-on-ribbon"),
    `URL must contain synthetic=shape-witness-edge-on-ribbon; got: ${url}`
  );
});

test("buildShapeWitnessUrl rejects unknown fixture IDs", () => {
  assert.throws(
    () => buildShapeWitnessUrl("http://localhost:5173", "made-up-fixture"),
    /unknown.*fixture|invalid.*fixture|unrecognized/i,
    "buildShapeWitnessUrl must throw on unknown fixture ID"
  );
});

test("captureShapeWitness is exported as a function", () => {
  assert.equal(typeof captureShapeWitness, "function",
    "captureShapeWitness must be an exported function");
});
