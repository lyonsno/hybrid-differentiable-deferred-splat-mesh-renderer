import assert from "node:assert/strict";
import test from "node:test";

import { buildGpuTileCoverageBridge } from "../../src/gpuTileCoverageBridge.js";
import { buildProjectedGaussianTileCoverage } from "../../src/rendererFidelityProbes/tileCoverage.js";
import { PIXEL_CONTRIBUTOR_TRACE_SCHEMA } from "../../src/rendererFidelityProbes/pixelContributorTraceSchema.js";

test("projection trace bridge exposes schema-shaped per-pixel contributor evidence for canonical anchors", () => {
  const coverage = buildProjectedGaussianTileCoverage({
    viewportWidth: 2400,
    viewportHeight: 1600,
    tileSizePx: 16,
    samplesPerAxis: 1,
    splats: [
      {
        splatIndex: 0,
        originalId: 42,
        centerPx: [1260, 930],
        covariancePx: { xx: 4, xy: 0, yy: 4 },
      },
    ],
  });
  const bridge = buildGpuTileCoverageBridge({
    ...coverage,
    sourceSplatCount: 1,
    maxRefsPerTile: 16,
  });

  assert.ok(Array.isArray(bridge.perPixelProjectedContributors), "bridge should expose per-pixel projected contributor traces");
  assert.equal(bridge.perPixelProjectedContributors.length, PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.length);

  const anchorIds = bridge.perPixelProjectedContributors.map((record) => record.anchorPixel.id);
  assert.deepEqual(anchorIds, PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.map((anchor) => anchor.id));

  const lacunarHole = bridge.perPixelProjectedContributors.find((record) => record.anchorPixel.id === "lacunar-hole-dessert-1260-930");
  assert.ok(lacunarHole, "synthetic coverage should produce a trace for the lacunar-hole anchor");
  assert.equal(lacunarHole.status, "present");
  assert.deepEqual(lacunarHole.traceRecord.anchorPixel, PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0]);
  assert.deepEqual(
    lacunarHole.traceRecord.projectedContributors.map(({ splatIndex, originalId }) => [splatIndex, originalId]),
    [[0, 42]],
  );
  assert.equal(lacunarHole.traceRecord.projectedContributors[0].projectionStatus, "projected");

  const denseForegroundLeak = bridge.perPixelProjectedContributors.find((record) => record.anchorPixel.id === "dense-foreground-leak-1580-1260");
  assert.ok(denseForegroundLeak, "the dense-foreground anchor should still be reported");
  assert.equal(denseForegroundLeak.status, "absent");
  assert.deepEqual(denseForegroundLeak.traceRecord.projectedContributors, []);
});
