import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTileLocalPrepassBridge,
  captureTileLocalPrepassBridgeSignature,
  tileLocalPrepassBridgeSignatureChanged,
} from "../../src/tileLocalPrepassBridge.js";

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

test("tile-local prepass bridge keeps a bright behind-surface contributor inside the capped tile list", () => {
  const surfaceCount = 36;
  const brightIndex = surfaceCount;
  const count = surfaceCount + 1;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const originalIds = new Uint32Array(count);

  for (let index = 0; index < surfaceCount; index += 1) {
    positions.set([0, 0, 0.45 + index * 0.001], index * 3);
    scales.set([Math.log(0.2), Math.log(0.2), 0], index * 3);
    colors.set([0.42, 0.43, 0.44], index * 3);
    opacities[index] = 0.08;
    originalIds[index] = 100 + index;
  }
  positions.set([0, 0, 0.1], brightIndex * 3);
  scales.set([Math.log(0.8), Math.log(0.8), 0], brightIndex * 3);
  colors.set([8, 7, 5], brightIndex * 3);
  opacities[brightIndex] = 0.6;
  originalIds[brightIndex] = 900;

  const bridge = buildTileLocalPrepassBridge({
    attributes: {
      count,
      positions,
      scales,
      colors,
      opacities,
      originalIds,
    },
    viewMatrix: identityViewProj,
    viewProj: identityViewProj,
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 64,
    samplesPerAxis: 1,
    splatScale: 80,
    minRadiusPx: 1,
    maxRefsPerTile: 32,
  });

  const retainedRefCount = bridge.tileHeaders[1];
  const retainedSplatIds = [];
  let brightRefIndex = -1;
  for (let index = 0; index < retainedRefCount; index += 1) {
    const splatIndex = bridge.tileRefs[index * 4];
    retainedSplatIds.push(splatIndex);
    if (splatIndex === brightIndex) {
      brightRefIndex = index;
    }
  }

  assert.equal(retainedRefCount, 32);
  assert.equal(bridge.maxRefsPerTile, 32);
  assert.equal(bridge.retainedTileEntryCount, 32);
  assert.ok(bridge.tileEntryCount <= count);
  assert.equal(retainedSplatIds.includes(brightIndex), true);
  assert.notEqual(brightRefIndex, -1);
  assert.ok(bridge.tileCoverageWeights[brightRefIndex] > 0);
  assert.ok(bridge.tileCoverageWeights[brightRefIndex] < bridge.tileCoverageWeights[0]);
});

test("tile-local prepass bridge signatures mark view-dependent tile refs as stale", () => {
  const baseInput = {
    viewMatrix: identityViewProj,
    viewProj: identityViewProj,
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 16,
    samplesPerAxis: 1,
    splatScale: 80,
    minRadiusPx: 1,
    maxRefsPerTile: 32,
  };
  const copiedInput = {
    ...baseInput,
    viewMatrix: new Float32Array(identityViewProj),
    viewProj: new Float32Array(identityViewProj),
  };
  const shiftedViewProj = new Float32Array(identityViewProj);
  shiftedViewProj[12] = 0.25;

  const baseSignature = captureTileLocalPrepassBridgeSignature(baseInput);

  assert.equal(tileLocalPrepassBridgeSignatureChanged(null, baseInput), true);
  assert.equal(tileLocalPrepassBridgeSignatureChanged(baseSignature, copiedInput), false);
  assert.equal(
    tileLocalPrepassBridgeSignatureChanged(baseSignature, {
      ...baseInput,
      viewProj: shiftedViewProj,
    }),
    true,
    "screen-space tile/ref buffers must be rebuilt when the view-projection changes"
  );
});
