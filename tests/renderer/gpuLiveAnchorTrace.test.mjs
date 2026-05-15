import assert from "node:assert/strict";
import test from "node:test";

import { buildGpuLiveAnchorContributorTraces } from "../../src/rendererFidelityProbes/gpuLiveAnchorTrace.js";
import { PIXEL_CONTRIBUTOR_TRACE_SCHEMA } from "../../src/rendererFidelityProbes/pixelContributorTraceSchema.js";

const LACUNAR_ANCHOR = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.find(
  (anchor) => anchor.id === "lacunar-hole-dessert-1260-930",
);
const DENSE_ANCHOR = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.find(
  (anchor) => anchor.id === "dense-foreground-leak-1580-1260",
);

test("GPU-live anchor traces expose projected and retained contributors without a full CPU tile bridge", () => {
  const traces = buildGpuLiveAnchorContributorTraces({
    attributes: syntheticAttributes(),
    viewMatrix: identityMatrix(),
    viewProj: identityMatrix(),
    effectiveOpacities: new Float32Array([0.8, 0.7, 0.6]),
    viewportWidth: 3456,
    viewportHeight: 1804,
    tileSizePx: 16,
    tileColumns: 216,
    tileRows: 113,
    splatScale: 600,
    minRadiusPx: 1.5,
    maxRefsPerTile: 1,
    anchors: [LACUNAR_ANCHOR, DENSE_ANCHOR],
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible",
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
    },
  });

  const projectedById = new Map(traces.perPixelProjectedContributors.map((record) => [record.anchorPixel.id, record]));
  const retainedById = new Map(traces.perPixelRetainedContributors.map((record) => [record.anchorPixel.id, record]));

  assert.equal(projectedById.get(LACUNAR_ANCHOR.id)?.status, "present");
  assert.equal(projectedById.get(DENSE_ANCHOR.id)?.status, "present");
  assert.equal(retainedById.get(LACUNAR_ANCHOR.id)?.status, "sufficient");
  assert.equal(retainedById.get(DENSE_ANCHOR.id)?.status, "sufficient");
  assert.equal(
    retainedById.get(LACUNAR_ANCHOR.id)?.traceRecord.retainedContributors.length,
    1,
    "maxRefsPerTile=1 should preserve the lacunar anchor contributor without enumerating the whole tile grid",
  );
  assert.ok(
    traces.projectedContributors.length >= traces.retainedContributors.length,
    "retained contributors must be a subset of projected anchor contributors",
  );
});

function syntheticAttributes() {
  const positions = new Float32Array([
    ndcX(LACUNAR_ANCHOR.x, 3456), ndcY(LACUNAR_ANCHOR.y, 1804), 0,
    ndcX(LACUNAR_ANCHOR.x + 80, 3456), ndcY(LACUNAR_ANCHOR.y + 80, 1804), 0,
    ndcX(DENSE_ANCHOR.x, 3456), ndcY(DENSE_ANCHOR.y, 1804), 0,
  ]);
  const radiusScale = Math.log(0.014);
  return {
    count: 3,
    positions,
    scales: new Float32Array([
      radiusScale, radiusScale, radiusScale,
      radiusScale, radiusScale, radiusScale,
      radiusScale, radiusScale, radiusScale,
    ]),
    rotations: new Float32Array([
      1, 0, 0, 0,
      1, 0, 0, 0,
      1, 0, 0, 0,
    ]),
    opacities: new Float32Array([0.8, 0.7, 0.6]),
    colors: new Float32Array([
      1, 1, 1,
      0.5, 0.5, 0.5,
      0.9, 0.8, 0.7,
    ]),
    originalIds: new Uint32Array([100, 101, 200]),
  };
}

function ndcX(pixelX, viewportWidth) {
  return ((pixelX + 0.5) / viewportWidth) * 2 - 1;
}

function ndcY(pixelY, viewportHeight) {
  return 1 - ((pixelY + 0.5) / viewportHeight) * 2;
}

function identityMatrix() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}
