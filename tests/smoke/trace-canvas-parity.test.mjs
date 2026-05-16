import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";
import { deflateSync } from "node:zlib";

import {
  buildTraceCanvasParitySummary,
  renderTraceCanvasParitySection,
} from "../../scripts/visual-smoke/trace-canvas-parity.mjs";

test("trace/canvas parity summary matches sampled pixels for the same observation identity", () => {
  const png = makePng(4, 4, (x, y) => {
    if (x === 1 && y === 1) return [26, 51, 77, 255];
    return [5, 5, 10, 255];
  });

  const result = buildTraceCanvasParitySummary({
    screenshotBuffer: png,
    pageEvidence: {
      rendererLabel: "tile-local-visible-gaussian-compositor",
      arenaRuntime: { effectiveArenaBackend: "gpu" },
      canvas: { width: 4, height: 4, clientWidth: 4, clientHeight: 4 },
      tileLocal: {
        visibleCompositedRefLimit: 32,
        perPixelFinalColorAccumulation: [
          {
            status: "present",
            anchorPixel: { id: "fresh-d", x: 1, y: 1 },
            tileAddress: { tileSizePx: 16 },
            finalColorAccumulation: {
              outputColor: [0.1, 0.2, 0.3, 1],
            },
          },
        ],
      },
    },
    gitIdentity: {
      branch: "cc/canvas-verdict-parity-witness",
      commit: "abc1234",
    },
    url: "http://127.0.0.1:5173/?witnessView=dessert-porous-close&renderer=tile-local-visible&arenaBackend=gpu",
    comparisonClass: "same-branch rerun",
    expectedObservationIdentity: {
      branch: "cc/canvas-verdict-parity-witness",
      commit: "abc1234",
      url: "http://127.0.0.1:5173/?witnessView=dessert-porous-close&renderer=tile-local-visible&arenaBackend=gpu",
      viewport: { width: 4, height: 4 },
      renderer: "tile-local-visible-gaussian-compositor",
      arenaBackend: "gpu",
      tileSizePx: 16,
      cap: 32,
      witnessView: "dessert-porous-close",
    },
  });

  assert.equal(result.status, "trace-canvas-match");
  assert.equal(result.comparisonClass, "same-branch rerun");
  assert.equal(result.observationIdentity.branch, "cc/canvas-verdict-parity-witness");
  assert.equal(result.observationIdentity.commit, "abc1234");
  assert.equal(result.observationIdentity.witnessView, "dessert-porous-close");
  assert.equal(result.anchors.length, 1);
  assert.equal(result.anchors[0].status, "match");
  assert.deepEqual(result.anchors[0].sampledRgba, [26, 51, 77, 255]);
  assert.deepEqual(result.anchors[0].predictedRgba8, [26, 51, 77, 255]);
  assert.match(renderTraceCanvasParitySection(result), /trace-canvas-match/);
  assert.match(renderTraceCanvasParitySection(result), /same-branch rerun/);
  assert.match(renderTraceCanvasParitySection(result), /Actual observation identity/);
  assert.match(renderTraceCanvasParitySection(result), /Expected observation identity/);
});

test("trace/canvas parity summary treats mismatched observation keys as observation-mismatch", () => {
  const png = makePng(4, 4, () => [26, 51, 77, 255]);

  const result = buildTraceCanvasParitySummary({
    screenshotBuffer: png,
    pageEvidence: {
      rendererLabel: "tile-local-visible-gaussian-compositor",
      arenaRuntime: { effectiveArenaBackend: "gpu" },
      canvas: { width: 4, height: 4, clientWidth: 4, clientHeight: 4 },
      tileLocal: {
        visibleCompositedRefLimit: 32,
        perPixelFinalColorAccumulation: [
          {
            status: "present",
            anchorPixel: { id: "fresh-d", x: 1, y: 1 },
            tileAddress: { tileSizePx: 16 },
            finalColorAccumulation: {
              outputColor: [0.1, 0.2, 0.3, 1],
            },
          },
        ],
      },
    },
    gitIdentity: {
      branch: "cc/canvas-verdict-parity-witness",
      commit: "abc1234",
    },
    url: "http://127.0.0.1:5173/?witnessView=dessert-porous-close&renderer=tile-local-visible&arenaBackend=gpu",
    comparisonClass: "same-branch rerun",
    expectedObservationIdentity: {
      branch: "cc/canvas-verdict-parity-witness",
      commit: "abc1234",
      url: "http://127.0.0.1:5173/?witnessView=dessert-porous-close&renderer=tile-local-visible&arenaBackend=gpu",
      viewport: { width: 4, height: 4 },
      renderer: "tile-local-visible-gaussian-compositor",
      arenaBackend: "gpu",
      tileSizePx: 16,
      cap: 64,
      witnessView: "dessert-porous-close",
    },
  });

  assert.equal(result.status, "observation-mismatch");
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("observation mismatch: cap")));
  assert.equal(result.anchors.length, 0);
  assert.match(renderTraceCanvasParitySection(result), /observation-mismatch/);
});

function makePng(width, height, pixelAt) {
  const scanlines = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
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
  data[8] = 8;
  data[9] = 6;
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
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
