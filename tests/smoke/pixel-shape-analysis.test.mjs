/**
 * Tests for pixel-shape-analysis.mjs
 *
 * Uses synthetic PNG fixtures (via makePng / makePngFromMask) to exercise the
 * geometric analysis utilities without requiring a real renderer.
 *
 * Fail-first discipline: each test was written before the implementation file
 * existed. Running against the unimplemented module should fail at the import
 * step or at assertion time — not due to syntax/harness errors.
 */

import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";
import { deflateSync } from "node:zlib";

import {
  analyzeShape,
  computeBoundingBox,
  computeCentroid,
  computeForegroundSuppression,
  computePrincipalAxes,
  computeThicknessRatio,
  extractForegroundMask,
} from "../../scripts/visual-smoke/pixel-shape-analysis.mjs";

// ---------------------------------------------------------------------------
// Synthetic PNG helpers
// ---------------------------------------------------------------------------

/**
 * Build a PNG buffer from a pixel-value callback (x, y) => [r, g, b, a].
 * Identical contract to visual-smoke.test.mjs makePng so tests can share idioms.
 */
function makePng(width, height, pixelAt) {
  const scanlines = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter byte: None
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

/** Background color used across all tests. */
const BG = [5, 5, 10, 255];
/** Foreground color: clearly distinct from BG (delta >> 12 threshold). */
const FG = [220, 60, 30, 255];

/**
 * Pixel-at factory: returns FG when predicate(x, y) is true, BG otherwise.
 */
function fgWhere(predicate) {
  return (x, y) => (predicate(x, y) ? FG : BG);
}

/** Circle mask: pixels inside radius r from (cx, cy). */
function circleMask(cx, cy, r) {
  return (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/**
 * Axis-aligned rectangle mask.
 * x in [x0, x1), y in [y0, y1).
 */
function rectMask(x0, y0, x1, y1) {
  return (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
}

/**
 * Rotated rectangle mask.  The rectangle has half-extents (hw, hh) about
 * center (cx, cy) and is rotated by angleRad (counter-clockwise).
 * Uses inverse-rotation to test membership.
 */
function rotatedRectMask(cx, cy, hw, hh, angleRad) {
  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const rx = cos * dx - sin * dy;
    const ry = sin * dx + cos * dy;
    return Math.abs(rx) <= hw && Math.abs(ry) <= hh;
  };
}

// ---------------------------------------------------------------------------
// Test 1 — isotropic vs anisotropic discrimination
// ---------------------------------------------------------------------------

test("Test 1: round circle has high thickness ratio; thin horizontal rectangle has low thickness ratio", () => {
  const W = 200;
  const H = 200;

  // Round filled circle of radius 40, centered at (100, 100).
  const circlePng = makePng(W, H, fgWhere(circleMask(100, 100, 40)));
  const circleResult = analyzeShape(circlePng, W, H);

  // Thin horizontal rectangle: 100px wide, 6px tall, centered.
  const ribbonPng = makePng(W, H, fgWhere(rectMask(50, 97, 150, 103)));
  const ribbonResult = analyzeShape(ribbonPng, W, H);

  // Circle: should be roughly isotropic.
  assert.ok(
    circleResult.thicknessRatio > 0.8,
    `Expected circle thicknessRatio > 0.8, got ${circleResult.thicknessRatio.toFixed(3)}`
  );
  assert.ok(
    circleResult.aspectRatio > 0.8 && circleResult.aspectRatio < 1.25,
    `Expected circle aspectRatio near 1.0, got ${circleResult.aspectRatio.toFixed(3)}`
  );

  // Ribbon: should be highly elongated.
  assert.ok(
    ribbonResult.thicknessRatio < 0.2,
    `Expected ribbon thicknessRatio < 0.2, got ${ribbonResult.thicknessRatio.toFixed(3)}`
  );

  // Analyzer must distinguish them — the gap must be substantial.
  assert.ok(
    circleResult.thicknessRatio > ribbonResult.thicknessRatio + 0.5,
    `Expected circle (${circleResult.thicknessRatio.toFixed(3)}) >> ribbon (${ribbonResult.thicknessRatio.toFixed(3)}) by at least 0.5`
  );
});

// ---------------------------------------------------------------------------
// Test 2 — principal axis orientation
// ---------------------------------------------------------------------------

test("Test 2: principal axis of a ~45-degree rotated thin rectangle is within ±10 degrees of 45", () => {
  const W = 200;
  const H = 200;

  // Thin rectangle rotated 45 degrees: half-extents (50, 5) about center (100, 100).
  const angleRad = Math.PI / 4; // 45 degrees
  const png = makePng(W, H, fgWhere(rotatedRectMask(100, 100, 50, 5, angleRad)));

  const { rgba } = decodePngForTest(png, W, H);
  const { mask } = extractForegroundMask(rgba, W, H);
  const { angleDeg } = computePrincipalAxes(mask, W, H);

  // Principal axis angle should be within ±10 degrees of 45.
  // Angles are ambiguous modulo 180 degrees, so accept 45 or 135 (which is 45 + 90,
  // meaning we allow both ±45 and ±135 after normalizing).
  const normalizedAngle = ((angleDeg % 180) + 180) % 180; // [0, 180)
  const distanceTo45 = Math.min(
    Math.abs(normalizedAngle - 45),
    Math.abs(normalizedAngle - 135)
  );
  assert.ok(
    distanceTo45 <= 10,
    `Expected angleDeg within ±10° of 45 (or 135), got ${angleDeg.toFixed(1)}° (normalized: ${normalizedAngle.toFixed(1)}°, distance: ${distanceTo45.toFixed(1)}°)`
  );
});

// ---------------------------------------------------------------------------
// Test 3 — edge-on ribbon rejection (too thick)
// ---------------------------------------------------------------------------

test("Test 3: a too-thick rectangle is detected as NOT a thin ribbon (thicknessRatio > 0.3)", () => {
  const W = 200;
  const H = 200;

  // Simulates the "too thick spatula" bug: rectangle is 100x40 instead of 100x6.
  // This should NOT look like a thin ribbon.
  const thickPng = makePng(W, H, fgWhere(rectMask(50, 80, 150, 120)));
  const result = analyzeShape(thickPng, W, H);

  assert.ok(
    result.thicknessRatio > 0.3,
    `Expected thicknessRatio > 0.3 for a thick rectangle, got ${result.thicknessRatio.toFixed(3)} — analyzer failed to detect a non-thin shape`
  );
});

// ---------------------------------------------------------------------------
// Test 4 — near-plane slab detection (screen flooding)
// ---------------------------------------------------------------------------

test("Test 4: near-plane screen flooding is detected via changedPixelRatio > 0.6", () => {
  const W = 100;
  const H = 100;

  // >80% of pixels are foreground (simulates a huge near-plane splat).
  const png = makePng(W, H, (x, y) => {
    // Leave a thin 5px border as background, everything else is foreground.
    if (x < 5 || x >= W - 5 || y < 5 || y >= H - 5) return BG;
    return FG;
  });

  const result = analyzeShape(png, W, H);

  assert.ok(
    result.mask.changedPixelRatio > 0.6,
    `Expected changedPixelRatio > 0.6 for near-plane flooding, got ${result.mask.changedPixelRatio.toFixed(3)}`
  );
});

// ---------------------------------------------------------------------------
// Test 5 — foreground suppression
// ---------------------------------------------------------------------------

test("Test 5: opaque foreground rectangle over bright background gives suppressionRatio > 0.5", () => {
  const W = 100;
  const H = 100;

  // Scene: bright background.
  const backgroundRgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    backgroundRgba[i * 4 + 0] = 240; // bright red
    backgroundRgba[i * 4 + 1] = 230; // bright green
    backgroundRgba[i * 4 + 2] = 220; // bright blue
    backgroundRgba[i * 4 + 3] = 255;
  }

  // Rendered image: opaque dark foreground rectangle covering 80x80 pixels in center
  // (64% of the 100x100 canvas). The suppression ratio should be > 0.5 since
  // most bright background pixels are hidden by the dark foreground.
  const png = makePng(W, H, (x, y) => {
    if (x >= 10 && x < 90 && y >= 10 && y < 90) {
      return [30, 20, 25, 255]; // dark opaque foreground
    }
    return [240, 230, 220, 255]; // same as background
  });

  const { rgba } = decodePngForTest(png, W, H);
  const { suppressionRatio } = computeForegroundSuppression(rgba, W, H, backgroundRgba);

  assert.ok(
    suppressionRatio > 0.5,
    `Expected suppressionRatio > 0.5, got ${suppressionRatio.toFixed(3)}`
  );
});

// ---------------------------------------------------------------------------
// Additional unit tests for individual functions
// ---------------------------------------------------------------------------

test("extractForegroundMask: all-background image has zero changed pixels", () => {
  const W = 10;
  const H = 10;
  const png = makePng(W, H, () => BG);
  const { rgba } = decodePngForTest(png, W, H);
  const { mask, changedPixels } = extractForegroundMask(rgba, W, H);

  assert.equal(changedPixels, 0);
  assert.equal(mask.every((v) => v === 0), true);
});

test("computeBoundingBox: single foreground pixel", () => {
  const W = 20;
  const H = 20;
  const png = makePng(W, H, (x, y) => (x === 10 && y === 12 ? FG : BG));
  const { rgba } = decodePngForTest(png, W, H);
  const { mask } = extractForegroundMask(rgba, W, H);
  const bbox = computeBoundingBox(mask, W, H);

  assert.equal(bbox.minX, 10);
  assert.equal(bbox.maxX, 10);
  assert.equal(bbox.minY, 12);
  assert.equal(bbox.maxY, 12);
  assert.equal(bbox.width, 1);
  assert.equal(bbox.height, 1);
});

test("computeCentroid: rectangle centroid is near geometric center", () => {
  const W = 100;
  const H = 100;
  // Rectangle from (20,30) to (79,69).
  const png = makePng(W, H, fgWhere(rectMask(20, 30, 80, 70)));
  const { rgba } = decodePngForTest(png, W, H);
  const { mask } = extractForegroundMask(rgba, W, H);
  const { x, y } = computeCentroid(mask, W, H);

  // Centroid should be at approximately (49.5, 49.5).
  assert.ok(Math.abs(x - 49.5) < 2, `Expected centroid.x near 49.5, got ${x.toFixed(2)}`);
  assert.ok(Math.abs(y - 49.5) < 2, `Expected centroid.y near 49.5, got ${y.toFixed(2)}`);
});

test("computeThicknessRatio: perfect square has ratio close to 1", () => {
  const W = 100;
  const H = 100;
  // Perfect 40x40 square centered at (50, 50).
  const png = makePng(W, H, fgWhere(rectMask(30, 30, 70, 70)));
  const { rgba } = decodePngForTest(png, W, H);
  const { mask } = extractForegroundMask(rgba, W, H);
  const ratio = computeThicknessRatio(mask, W, H);

  assert.ok(
    ratio > 0.7,
    `Expected thicknessRatio > 0.7 for a square, got ${ratio.toFixed(3)}`
  );
});

// ---------------------------------------------------------------------------
// PNG decode helper for tests (avoids re-importing from png-analysis.mjs to
// keep dependencies explicit; duplicates minimal decode only for mask testing)
// ---------------------------------------------------------------------------

import { decodePng } from "../../scripts/visual-smoke/png-analysis.mjs";

function decodePngForTest(pngBuffer, expectedWidth, expectedHeight) {
  const { width, height, rgba } = decodePng(pngBuffer);
  assert.equal(width, expectedWidth);
  assert.equal(height, expectedHeight);
  return { rgba };
}

// ---------------------------------------------------------------------------
// PNG encoding helpers (same as visual-smoke.test.mjs)
// ---------------------------------------------------------------------------

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
