import assert from "node:assert/strict";
import test from "node:test";

import {
  classifySlabSplatFootprint,
  SLAB_FOOTPRINT_STATUS,
  SLAB_RECOMMENDATION,
} from "../../src/rendererFidelityProbes/slabFootprint.js";

test("near-plane crossing axis endpoints are classified before projection", () => {
  const result = classifySlabSplatFootprint({
    centerClip: [0, 0, 0.5, 1],
    axisEndpointClips: [
      [0.01, 0, 0.5, 0.00005],
      [0, 0.01, 0.5, 1],
      [0, 0, 0.5, 1],
    ],
    viewportMinPx: 720,
    splatScale: 300,
  });

  assert.equal(result.status, SLAB_FOOTPRINT_STATUS.axisCrossesNearPlane);
  assert.equal(result.recommendation, SLAB_RECOMMENDATION.sliceOrLod);
  assert.equal(result.crossingAxes, 1);
  assert.ok(result.majorRadiusPx <= result.maxFootprintPx);
});

test("projectable splats over the screen cap are classified as LOD or clamp candidates", () => {
  const result = classifySlabSplatFootprint({
    centerClip: [0, 0, 0.5, 1],
    axisEndpointClips: [
      [2, 0, 0.0005, 0.001],
      [0, 0.01, 0.5, 1],
      [0, 0, 0.5, 1],
    ],
    viewportMinPx: 720,
    splatScale: 300,
  });

  assert.equal(result.status, SLAB_FOOTPRINT_STATUS.pathologicalFootprint);
  assert.equal(result.recommendation, SLAB_RECOMMENDATION.lodOrClamp);
  assert.ok(result.majorRadiusPx > result.maxFootprintPx);
});

test("large but bounded nearby splats remain accepted", () => {
  const result = classifySlabSplatFootprint({
    centerClip: [0, 0, 0.5, 1],
    axisEndpointClips: [
      [1, 0, 0.5, 1],
      [0, 0.8, 0.5, 1],
      [0, 0, 0.5, 1],
    ],
    viewportMinPx: 720,
    splatScale: 300,
  });

  assert.equal(result.status, SLAB_FOOTPRINT_STATUS.accepted);
  assert.equal(result.recommendation, SLAB_RECOMMENDATION.keep);
  assert.ok(result.majorRadiusPx > 150);
  assert.ok(result.majorRadiusPx < result.maxFootprintPx);
});
