import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeLiveCompositorBufferReadback,
} from "../../src/rendererFidelityProbes/liveCompositorBufferReadback.js";

test("live compositor buffer readback reports old smoke payloads as underinstrumented", () => {
  const summary = summarizeLiveCompositorBufferReadback({
    anchors: [{ id: "fresh-a", x: 1260, y: 930, tileAddress: tileAddress(0, 78, 58, 1260, 930) }],
  });

  assert.equal(summary.classification, "buffer-readback-underinstrumented");
  assert.deepEqual(summary.missingFields, [
    "legacyTileHeaders",
    "legacyTileRefs",
    "legacyTileCoverageWeights",
    "legacyAlphaParams",
    "sourceColorRows",
    "sourceOpacityRows",
  ]);
  assert.equal(summary.rows[0].status, "buffer-readback-missing");
  assert.equal(summary.rows[0].headerRange, null);
});

test("live compositor buffer readback extracts anchor tile slices and source rows", () => {
  const summary = summarizeLiveCompositorBufferReadback({
    observation: {
      observationId: "retained-to-ordered-survival-0516-16x256-reconcile",
      renderer: "tile-local-visible",
      arenaBackend: "gpu",
      tileSizePx: 16,
      maxRefsPerTile: 256,
      viewport: { width: 3456, height: 1916, deviceScale: 1 },
      witnessView: "dessert-porous-close",
    },
    anchors: [
      { id: "fresh-a", x: 1260, y: 930, tileAddress: tileAddress(0, 78, 58, 1260, 930) },
      { id: "fresh-b", x: 1580, y: 1044, tileAddress: tileAddress(1, 98, 65, 1580, 1044) },
    ],
    legacyTileHeaders: u32([
      ...header(0, 2, 2, 0),
      ...header(2, 1, 1, 0),
    ]),
    legacyTileRefs: u32([
      ...ref(41, 410, 0, 0),
      ...ref(42, 420, 0, 1),
      ...ref(90, 900, 1, 2),
    ]),
    legacyTileScatterCursors: u32([2, 1]),
    legacyTileCoverageWeights: f32([0.25, 0.125, 0.5]),
    legacyAlphaParams: f32([
      ...alpha(0.2, 1260.5, 930.5, 3),
      ...alpha(0.4, 1262.5, 931.5, 4),
      ...alpha(0.9, 1580.5, 1044.5, 5),
      ...conic(0.1, 0.01, 0.2),
      ...conic(0.2, 0.02, 0.3),
      ...conic(0.3, 0.03, 0.4),
    ]),
    sourceColors: f32([
      ...Array(41 * 3).fill(0),
      0.8, 0.6, 0.4,
      0.7, 0.5, 0.3,
      ...Array((90 - 43) * 3).fill(0),
      0.2, 0.3, 0.4,
    ]),
    sourceOpacities: f32([
      ...Array(41).fill(0),
      0.2,
      0.4,
      ...Array(90 - 43).fill(0),
      0.9,
    ]),
    frameId: 7,
    readbackStage: "after-gpu-arena-dispatch-before-composite-tiles",
  });

  assert.equal(summary.classification, "buffer-readback-complete");
  assert.equal(summary.rows.length, 2);
  assert.deepEqual(summary.rows[0].headerRange, {
    tileIndex: 0,
    offset: 0,
    count: 2,
    projectedCount: 2,
    flags: 0,
    scatterCount: 2,
    effectiveCount: 2,
    liveRefCapacity: 3,
    requestedEnd: 2,
    refWindowStatus: "header-range-contained",
    truncatedCount: 0,
  });
  assert.deepEqual(summary.rows[0].refs.map((row) => row.splatIndex), [41, 42]);
  assert.equal(summary.rows[0].refs[0].coverageWeight, 0.25);
  assert.deepEqual(summary.rows[0].refs[0].alphaParams.primary, {
    opacity: 0.2,
    centerPx: [1260.5, 930.5],
    viewRank: 3,
  });
  assert.deepEqual(summary.rows[0].refs[0].alphaParams.inverseConic, [0.1, 0.01, 0.2]);
  assert.deepEqual(summary.rows[0].refs[0].sourceColor, [0.8, 0.6, 0.4]);
  assert.equal(summary.rows[0].refs[0].sourceOpacity, 0.2);
  assert.equal(summary.rows[1].refs[0].originalId, 900);
  assert.equal(summary.readbackStage, "after-gpu-arena-dispatch-before-composite-tiles");
});

function tileAddress(tileIndex, tileX, tileY, x, y) {
  return {
    tileSizePx: 16,
    tileX,
    tileY,
    tileIndex,
    localX: x - tileX * 16,
    localY: y - tileY * 16,
  };
}

function header(offset, count, projectedCount, flags) {
  return [offset, count, projectedCount, flags];
}

function ref(splatIndex, originalId, tileIndex, refIndex) {
  return [splatIndex, originalId, tileIndex, refIndex];
}

function alpha(opacity, centerX, centerY, viewRank) {
  return [opacity, centerX, centerY, viewRank];
}

function conic(x, y, z) {
  return [x, y, z, 0];
}

function u32(values) {
  return Uint32Array.from(values);
}

function f32(values) {
  return Float32Array.from(values);
}
