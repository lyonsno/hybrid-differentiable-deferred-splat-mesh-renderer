import assert from "node:assert/strict";
import test from "node:test";

import { buildTileLocalPrepassBridge } from "../../src/tileLocalPrepassBridge.js";

const identityViewProj = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

const assertClose = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
};

function inverseConicRadiiPx(shapeParams) {
  const xx = shapeParams[2];
  const xy = shapeParams[3];
  const yy = shapeParams[4];
  const trace = xx + yy;
  const discriminant = Math.sqrt(Math.max((xx - yy) ** 2 + 4 * xy * xy, 0));
  const lambdaSmall = Math.max(0.5 * (trace - discriminant), 1e-12);
  const lambdaLarge = Math.max(0.5 * (trace + discriminant), 1e-12);
  return {
    major: 1 / Math.sqrt(lambdaSmall),
    minor: 1 / Math.sqrt(lambdaLarge),
  };
}

test("tile-local conic packing floors a rotated thin splat's actual minor axis", () => {
  const minRadiusPx = 4;
  const fortyFiveDegreeZRotation = Math.PI / 4;
  const bridge = buildTileLocalPrepassBridge({
    attributes: {
      count: 1,
      positions: new Float32Array([0, 0, 0.5]),
      scales: new Float32Array([
        Math.log(0.2),
        Math.log(0.001),
        Math.log(0.001),
      ]),
      rotations: new Float32Array([
        Math.cos(fortyFiveDegreeZRotation / 2),
        0,
        0,
        Math.sin(fortyFiveDegreeZRotation / 2),
      ]),
      originalIds: new Uint32Array([77]),
    },
    viewMatrix: identityViewProj,
    viewProj: identityViewProj,
    viewportWidth: 200,
    viewportHeight: 200,
    tileSizePx: 200,
    samplesPerAxis: 1,
    splatScale: 600,
    minRadiusPx,
  });

  assert.equal(bridge.retainedTileEntryCount, 1);
  assertClose(bridge.tileRefShapeParams[0], 100, 1e-6, "center x");
  assertClose(bridge.tileRefShapeParams[1], 100, 1e-6, "center y");

  const radii = inverseConicRadiiPx(bridge.tileRefShapeParams);

  assert.ok(radii.major > 19 && radii.major < 21, `major radius should preserve projected support, got ${radii.major}`);
  assert.ok(
    radii.minor >= minRadiusPx - 1e-5,
    `packed inverse conic minor radius should honor minRadiusPx=${minRadiusPx}, got ${radii.minor}`,
  );
});
