import assert from "node:assert/strict";
import test from "node:test";

import { buildTileLocalPrepassBridge } from "../../src/tileLocalPrepassBridge.js";

const identityViewProj = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

test("tile-local prepass bridge preserves sparse splat ids and real coverage weights", () => {
  const attributes = {
    count: 2,
    positions: new Float32Array([
      2, 0, 0.5,
      0, 0, 0.5,
    ]),
    scales: new Float32Array([
      Math.log(0.25), Math.log(0.25), 0,
      Math.log(0.25), Math.log(0.125), 0,
    ]),
    originalIds: new Uint32Array([10, 42]),
  };

  const bridge = buildTileLocalPrepassBridge({
    attributes,
    viewMatrix: identityViewProj,
    viewProj: identityViewProj,
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 16,
    samplesPerAxis: 3,
    splatScale: 80,
    minRadiusPx: 1,
  });

  assert.equal(bridge.splatCount, 2);
  assert.equal(bridge.tileColumns, 4);
  assert.equal(bridge.tileRows, 4);
  assert.ok(bridge.tileEntryCount > 1);
  assert.deepEqual(Array.from(bridge.projectedBounds.slice(0, 4)), [0, 0, 0, 0]);
  assert.ok(bridge.projectedBounds[4] <= bridge.projectedBounds[6]);
  assert.ok(bridge.projectedBounds[5] <= bridge.projectedBounds[7]);
  assert.equal(bridge.tileRefs[0], 1);
  assert.equal(bridge.tileRefs[1], 42);
  assert.ok(Array.from(bridge.tileCoverageWeights).some((weight) => weight > 0 && weight < 1));
  assert.ok(Array.from(bridge.tileCoverageWeights).some((weight) => weight !== 1));
});

test("tile-local prepass bridge feeds each bounded tile list with strongest coverage candidates first", () => {
  const attributes = {
    count: 3,
    positions: new Float32Array([
      0, 0, 0.6,
      0, 0, 0.2,
      0, 0, 0.4,
    ]),
    scales: new Float32Array([
      Math.log(0.12), Math.log(0.12), 0,
      Math.log(0.32), Math.log(0.32), 0,
      Math.log(0.22), Math.log(0.22), 0,
    ]),
    originalIds: new Uint32Array([30, 10, 20]),
  };

  const bridge = buildTileLocalPrepassBridge({
    attributes,
    viewMatrix: identityViewProj,
    viewProj: identityViewProj,
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 64,
    samplesPerAxis: 1,
    splatScale: 80,
    minRadiusPx: 1,
  });

  assert.equal(bridge.tileHeaders[1], 3);
  assert.deepEqual(
    [bridge.tileRefs[0], bridge.tileRefs[4], bridge.tileRefs[8]],
    [2, 0, 1]
  );
  assert.ok(bridge.tileCoverageWeights[0] >= bridge.tileCoverageWeights[1]);
  assert.ok(bridge.tileCoverageWeights[1] > bridge.tileCoverageWeights[2]);
});
