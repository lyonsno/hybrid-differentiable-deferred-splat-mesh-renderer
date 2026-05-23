import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";
import { deflateSync } from "node:zlib";

import { withTimeout } from "../../scripts/visual-smoke/async-timeout.mjs";
import { classifySmokeEvidence } from "../../scripts/visual-smoke/evidence.mjs";
import { buildTimeoutFailureCapture } from "../../scripts/visual-smoke/failure-telemetry.mjs";
import { analyzePngBuffer } from "../../scripts/visual-smoke/png-analysis.mjs";

test("PNG analysis treats a uniform capture as blank", () => {
  const png = makePng(4, 4, () => [5, 5, 10, 255]);
  const result = analyzePngBuffer(png);

  assert.equal(result.width, 4);
  assert.equal(result.height, 4);
  assert.equal(result.distinctColorCount, 1);
  assert.equal(result.nonblank, false);
  assert.equal(result.changedPixelRatio, 0);
});

test("PNG analysis detects pixels that differ from the background", () => {
  const png = makePng(4, 4, (x, y) => (x === 1 && y === 1 ? [220, 40, 30, 255] : [5, 5, 10, 255]));
  const result = analyzePngBuffer(png, { minChangedPixelRatio: 0.05, minAverageDelta: 1 });

  assert.equal(result.width, 4);
  assert.equal(result.height, 4);
  assert.equal(result.nonblank, true);
  assert.equal(result.changedPixels, 1);
  assert.ok(result.changedPixelRatio > 0.05);
  assert.ok(result.averageDelta > 1);
});

test("evidence classification refuses synthetic captures as first-smoke closure", () => {
  const result = classifySmokeEvidence({
    pageEvidence: { sourceKind: "synthetic", splatCount: 16 },
    imageAnalysis: { nonblank: true, changedPixelRatio: 0.25 },
    requireRealSplat: true,
  });

  assert.equal(result.nonblank, true);
  assert.equal(result.realSplatEvidence, false);
  assert.equal(result.closeable, false);
  assert.match(result.summary, /synthetic/i);
});

test("evidence classification accepts nonblank real Scaniverse splat captures", () => {
  const result = classifySmokeEvidence({
    pageEvidence: {
      sourceKind: "scaniverse-ply",
      splatCount: 1024,
      assetPath: "smoke-assets/eiffel-tower.scaniverse.json",
    },
    imageAnalysis: { nonblank: true, changedPixelRatio: 0.31 },
    requireRealSplat: true,
  });

  assert.equal(result.nonblank, true);
  assert.equal(result.realSplatEvidence, true);
  assert.equal(result.closeable, true);
  assert.match(result.summary, /scaniverse/i);
});

test("timeout failure capture preserves exact-route smoke telemetry", () => {
  const capture = buildTimeoutFailureCapture({
    capture: {
      id: "final-color",
      title: "Visible tile-local compositor",
      expectedRendererLabel: "tile-local-visible",
      url:
        "http://127.0.0.1:5188/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible",
    },
    error: new Error("Timed out waiting for rendered visual smoke evidence (tile-local-visible)"),
    elapsedMs: 30000,
    pageEvidence: {
      sourceKind: "real_scaniverse_ply",
      rendererLabel: "plate",
      statsText:
        "3456x1916 | 60 fps | renderer: plate | tile-local disabled: projected tile refs exceed budget: 20000001 > 20000000",
      tileLocalDiagnostics: { debugMode: "final-color", tileRefs: { total: 6635520 } },
      witness: { view: "dessert-porous-close", anchors: ["fresh-a"] },
      canvas: { width: 3456, height: 1916, clientWidth: 3456, clientHeight: 1916 },
    },
    imageAnalysis: { nonblank: true, changedPixelRatio: 0.21 },
    screenshotPath: "smoke-reports/exact-route/final-color-timeout.png",
    consoleMessages: [{ type: "warning", text: "slow tile-local route" }],
    pageErrors: [],
  });

  assert.equal(capture.id, "final-color");
  assert.equal(capture.classification.harnessPassed, false);
  assert.equal(capture.captureFailure.kind, "visual-smoke-timeout");
  assert.equal(capture.captureFailure.expectedRendererLabel, "tile-local-visible");
  assert.equal(capture.captureFailure.elapsedMs, 30000);
  assert.equal(capture.captureFailure.telemetry.smoke, true);
  assert.equal(capture.captureFailure.telemetry.witness, true);
  assert.equal(capture.captureFailure.telemetry.tileLocalDiagnostics, true);
  assert.equal(capture.captureFailure.telemetry.statsText, true);
  assert.equal(capture.captureFailure.telemetry.screenshot, true);
  assert.match(capture.pageEvidence.statsText, /20000001 > 20000000/);
  assert.equal(capture.pageEvidence.witness.view, "dessert-porous-close");
  assert.equal(capture.screenshotPath, "smoke-reports/exact-route/final-color-timeout.png");
});

test("async timeout wrapper rejects stuck page evidence collection", async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 5, "page evidence collection timed out"),
    /page evidence collection timed out/
  );
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
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
