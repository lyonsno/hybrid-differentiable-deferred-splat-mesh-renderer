import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveGpuLiveFootprintPolicy } from "../../node_modules/.cache/renderer-tests/src/gpuTileCoverage.js";

const shaderSource = () =>
  readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

const expectedBoundedMinorRadiusPx = (rawMajorRadiusPx, rawMinorRadiusPx, minRadiusPx) => {
  if (rawMinorRadiusPx >= minRadiusPx) {
    return rawMinorRadiusPx;
  }
  if (rawMajorRadiusPx < minRadiusPx) {
    return minRadiusPx;
  }
  return Math.min(
    minRadiusPx,
    Math.max(rawMinorRadiusPx * 4, minRadiusPx / 64),
  );
};

test("GPU-live footprint policy preserves anisotropic minor radius instead of re-flooring thin ribbons", () => {
  const rawMajorRadiusPx = 24;
  const rawMinorRadiusPx = 0.01;
  const minRadiusPx = 1.5;
  const expectedMinor = expectedBoundedMinorRadiusPx(rawMajorRadiusPx, rawMinorRadiusPx, minRadiusPx);

  const policy = resolveGpuLiveFootprintPolicy({
    majorRadiusPx: rawMajorRadiusPx,
    minorRadiusPx: rawMinorRadiusPx,
    viewportWidth: 1280,
    viewportHeight: 720,
    minRadiusPx,
  });

  assert.equal(policy.scale, 1, "the fixture should isolate min-radius policy from area or major-radius caps");
  assert.equal(policy.majorRadiusPx, rawMajorRadiusPx);
  assert.ok(
    policy.minorRadiusPx <= expectedMinor + 1e-12,
    `minor radius should preserve bounded anisotropy at ${expectedMinor}px, got ${policy.minorRadiusPx}px`,
  );
  assert.ok(policy.minorRadiusPx < minRadiusPx / 8, "thin ribbons should not be inflated into round min-radius blobs");

  const shader = shaderSource();
  assert.match(shader, /fn boundedMinorRadiusPx/);
  assert.doesNotMatch(
    shader,
    /let scaledMinorRadiusPx = max\(uncappedMinorRadiusPx \* footprintScale, minRadiusPx\)/,
    "WGSL should not undo boundedMinorRadiusPx by re-flooring the minor axis to minRadiusPx",
  );
});
