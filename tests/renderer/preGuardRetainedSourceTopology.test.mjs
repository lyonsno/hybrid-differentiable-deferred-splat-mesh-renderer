import assert from "node:assert/strict";
import test from "node:test";

import { buildTileLocalPrepassBridge } from "../../src/tileLocalPrepassBridge.js";

const identityViewProj = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

function buildTinyBridge() {
  return buildTileLocalPrepassBridge({
    attributes: {
      count: 2,
      positions: new Float32Array([
        0, 0, 0.5,
        0.25, 0.25, 0.5,
      ]),
      scales: new Float32Array([
        Math.log(0.2), Math.log(0.2), 0,
        Math.log(0.2), Math.log(0.2), 0,
      ]),
      colors: new Float32Array([
        1, 1, 1,
        0.5, 0.5, 0.5,
      ]),
      opacities: new Float32Array([1, 0.5]),
      originalIds: new Uint32Array([101, 102]),
    },
    viewMatrix: identityViewProj,
    viewProj: identityViewProj,
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 16,
    samplesPerAxis: 1,
    splatScale: 80,
    minRadiusPx: 1,
    maxRefsPerTile: 8,
    maxTileEntries: 128,
  });
}

test("CPU prepass bridge topology describes retained source after dense projected materialization", () => {
  const bridge = buildTinyBridge();

  assert.deepEqual(bridge.sourceTopologyDescriptor, {
    route: "cpu-prepass-bridge",
    classification: "pre-guard-source-blocked-by-projection-construction",
    retainedSourceStage: "after-dense-projected-coverage",
    projectedCoverageStage: "dense-projected-coverage",
    retainedRowsStage: "gpu-coverage-bridge-retention",
    guardStage: "dense-projected-coverage",
    guardQuantity: "dense-projected-tile-refs",
    handoffQuantity: "compact-retained-rows",
    constructsFullDenseProjectionBeforeRetention: true,
    traceLawRetainedRows: true,
    compactRetainedOffsets: true,
    routeDescriptors: [
      "project-splat-center",
      "project-splat-covariance",
      "dense-projected-coverage",
      "view-order-projected-entries",
      "gpu-coverage-bridge-retention",
    ],
    evidence: {
      projectedTileEntries: bridge.tileRefCustody.projectedTileEntryCount,
      retainedTileEntries: bridge.retainedTileEntryCount,
      tileCount: bridge.tileCount,
      maxTileEntries: 128,
      maxRefsPerTile: 8,
    },
  });
});

test("projected-ref guard fires before retained rows can be formed", () => {
  const attributes = {
    count: 12,
    positions: new Float32Array(12 * 3),
    scales: new Float32Array(12 * 3),
    originalIds: new Uint32Array(12),
  };
  for (let index = 0; index < attributes.count; index += 1) {
    attributes.positions.set([0, 0, 0.5], index * 3);
    attributes.scales.set([Math.log(4), Math.log(4), 0], index * 3);
    attributes.originalIds[index] = index;
  }

  assert.throws(
    () => buildTileLocalPrepassBridge({
      attributes,
      viewMatrix: identityViewProj,
      viewProj: identityViewProj,
      viewportWidth: 256,
      viewportHeight: 256,
      tileSizePx: 8,
      samplesPerAxis: 1,
      splatScale: 80,
      minRadiusPx: 1,
      maxRefsPerTile: 32,
      maxTileEntries: 128,
    }),
    (error) => {
      assert.match(error.message, /projected tile refs exceed budget: 129 > 128/);
      assert.equal(error.sourceTopologyStage, "dense-projected-coverage");
      assert.equal(error.retainedRowsFormed, false);
      assert.equal(error.guardQuantity, "dense-projected-tile-refs");
      assert.equal(error.handoffQuantity, "compact-retained-rows");
      return true;
    },
  );
});
