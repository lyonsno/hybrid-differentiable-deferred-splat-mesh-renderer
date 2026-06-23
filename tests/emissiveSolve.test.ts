import assert from "node:assert/strict";
import test from "node:test";

import { solveHueGatedEmissive } from "../src/emissiveSolve.ts";

test("hue-gated emissive solve suppresses same-hue specular delta and keeps divergent glow", () => {
  const original = new Float32Array([
    0.8, 0.2, 0.2,
    0.7, 0.45, 0.2,
  ]);
  const albedo = new Float32Array([
    0.4, 0.1, 0.1,
    0.3, 0.3, 0.3,
  ]);

  const result = solveHueGatedEmissive({
    originalColors: original,
    albedoColors: albedo,
    hueGateLo: 0.02,
    hueGateHi: 0.15,
    minDeltaMag: 0.02,
  });

  assert.equal(result.count, 2);
  assert.equal(result.emissiveSplats, 1);
  assert.deepEqual(Array.from(result.emissive.slice(0, 3)), [0, 0, 0]);
  assert.ok(result.emissive[3] > 0.35, "divergent red/orange glow survives");
  assert.ok(result.emissive[4] > 0.1, "divergent red/orange glow keeps green component");
  assert.equal(result.emissive[5], 0);
});

