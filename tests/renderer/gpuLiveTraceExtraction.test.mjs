import assert from "node:assert/strict";
import test from "node:test";

import { buildGpuLivePixelContributorTraces } from "../../src/gpuLiveTraceExtraction.js";
import { PIXEL_CONTRIBUTOR_TRACE_SCHEMA } from "../../src/rendererFidelityProbes/pixelContributorTraceSchema.js";

test("GPU-live trace extraction closes canonical anchors from shader-equivalent projected conics", () => {
  const traces = buildGpuLivePixelContributorTraces({
    attributes: centeredAnchorAttributes(),
    effectiveOpacities: new Float32Array([0.55]),
    viewMatrix: identityMatrix(),
    viewProj: identityMatrix(),
    viewportWidth: 2400,
    viewportHeight: 1600,
    tileSizePx: 16,
    tileColumns: 150,
    tileRows: 100,
    maxTileRefs: 150 * 100 * 4,
    splatScale: 600,
    minRadiusPx: 1.5,
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible-gaussian-compositor",
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
    },
  });

  assert.equal(traces.perPixelProjectedContributors.length, PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.length);
  assert.equal(traces.perPixelRetainedContributors.length, PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.length);
  assert.equal(traces.perPixelFinalColorAccumulation.length, PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.length);

  const projectedByAnchor = byAnchorId(traces.perPixelProjectedContributors);
  const retainedByAnchor = byAnchorId(traces.perPixelRetainedContributors);
  const finalByAnchor = byAnchorId(traces.perPixelFinalColorAccumulation);
  const lacunarId = "lacunar-hole-dessert-1260-930";

  assert.equal(projectedByAnchor.get(lacunarId).status, "present");
  assert.equal(retainedByAnchor.get(lacunarId).status, "sufficient");
  assert.equal(finalByAnchor.get(lacunarId).status, "present");
  assert.deepEqual(
    projectedByAnchor.get(lacunarId).traceRecord.projectedContributors.map(({ splatIndex, originalId, projectionStatus }) => [
      splatIndex,
      originalId,
      projectionStatus,
    ]),
    [[0, 77, "projected"]],
  );
  assert.deepEqual(
    retainedByAnchor.get(lacunarId).retainedContributors.map(({ splatIndex, originalId, retentionStatus }) => [
      splatIndex,
      originalId,
      retentionStatus,
    ]),
    [[0, 77, "retained"]],
  );
  assert.equal(finalByAnchor.get(lacunarId).finalColorAccumulation.steps.length, 1);
  assert.equal(finalByAnchor.get(lacunarId).finalColorAccumulation.steps[0].splatIndex, 0);
  assert.equal(finalByAnchor.get(lacunarId).traceRecord.rendererMetadata.traceExtractionBackend, "gpu-live-anchor-mirror");
});

function centeredAnchorAttributes() {
  return {
    count: 1,
    positions: new Float32Array([0.05, -0.1625, 0.5]),
    colors: new Float32Array([0.8, 0.5, 0.25]),
    opacities: new Float32Array([0.55]),
    scales: new Float32Array([Math.log(28), Math.log(28), Math.log(1)]),
    rotations: new Float32Array([1, 0, 0, 0]),
    originalIds: new Uint32Array([77]),
  };
}

function identityMatrix() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

function byAnchorId(traces) {
  return new Map(traces.map((trace) => [trace.anchorPixel.id, trace]));
}
