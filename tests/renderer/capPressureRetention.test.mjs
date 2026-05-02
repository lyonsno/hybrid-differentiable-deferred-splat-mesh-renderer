import assert from "node:assert/strict";
import test from "node:test";

import { buildGpuTileCoverageBridge } from "../../src/gpuTileCoverageBridge.js";
import { summarizeCapPressureRetention } from "../../src/rendererFidelityProbes/capPressureRetention.js";

function makeSingleTileCoverage() {
  const tileEntries = [
    { splatIndex: 0, originalId: 100, coverageWeight: 10, retentionWeight: 0.35, occlusionWeight: 0.35, viewRank: 0, viewDepth: 0.1 },
    { splatIndex: 1, originalId: 101, coverageWeight: 9, retentionWeight: 0.35, occlusionWeight: 0.35, viewRank: 1, viewDepth: 0.2 },
    { splatIndex: 2, originalId: 102, coverageWeight: 8, retentionWeight: 0.35, occlusionWeight: 0.35, viewRank: 2, viewDepth: 0.3 },
    { splatIndex: 3, originalId: 103, coverageWeight: 7, retentionWeight: 0.35, occlusionWeight: 0.35, viewRank: 3, viewDepth: 0.55 },
    { splatIndex: 4, originalId: 104, coverageWeight: 0.2, retentionWeight: 1.1, occlusionWeight: 0.1, viewRank: 10, viewDepth: 1.0 },
    { splatIndex: 5, originalId: 105, coverageWeight: 0.18, retentionWeight: 0.2, occlusionWeight: 1.2, occlusionDensity: 0.95, viewRank: 4, viewDepth: 0.45 },
    { splatIndex: 6, originalId: 106, coverageWeight: 0.16, retentionWeight: 0.2, occlusionWeight: 0.01, viewRank: 11, viewDepth: 1.1 },
  ].map((entry) => ({
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    ...entry,
  }));

  return {
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 64,
    tileColumns: 1,
    tileRows: 1,
    sourceSplatCount: tileEntries.length,
    splats: tileEntries.map((entry) => ({
      splatIndex: entry.splatIndex,
      originalId: entry.originalId,
      centerPx: [32, 32],
      covariancePx: { xx: 16, xy: 0, yy: 16 },
      tileBounds: { minTileX: 0, minTileY: 0, maxTileX: 0, maxTileY: 0 },
    })),
    tileEntries,
  };
}

test("contributor arena preserves retained and dropped cap-pressure reasons per projected ref", () => {
  const bridge = buildGpuTileCoverageBridge(makeSingleTileCoverage(), {
    maxRefsPerTile: 4,
    depthBandCount: 3,
  });

  const projected = bridge.contributorArena.projectedContributors;
  assert.equal(projected.length, 7);
  assert.equal(projected.filter((record) => record.retentionStatus === "retained").length, 4);
  assert.equal(projected.filter((record) => record.retentionStatus === "dropped").length, 3);

  const droppedById = new Map(
    projected
      .filter((record) => record.retentionStatus === "dropped")
      .map((record) => [record.originalId, record])
  );

  assert.equal(droppedById.get(100).retentionBand, "front");
  assert.equal(droppedById.get(100).overflowReason, "perTileRetainedCap");
  assert.equal(droppedById.get(100).overflowReasonDetail, "perTileRetainedCapPolicyReserve");
  assert.equal(droppedById.get(103).retentionBand, "middle");
  assert.equal(droppedById.get(103).overflowReason, "perTileRetainedCap");
  assert.equal(droppedById.get(103).overflowReasonDetail, "perTileRetainedCapPolicyReserve");
  assert.equal(droppedById.get(106).retentionBand, "back");
  assert.equal(droppedById.get(106).overflowReason, "perTileRetainedCap");
  assert.equal(droppedById.get(106).overflowReasonDetail, "perTileRetainedCapBehindSurfaceBand");
});

test("cap-pressure retention summary exposes truthful loss signals and non-cap hooks", () => {
  const bridge = buildGpuTileCoverageBridge(makeSingleTileCoverage(), {
    maxRefsPerTile: 4,
    depthBandCount: 3,
  });

  const summary = summarizeCapPressureRetention(bridge);

  assert.equal(summary.version, 1);
  assert.equal(summary.classification, "over-cap");
  assert.equal(summary.refs.projected, 7);
  assert.equal(summary.refs.retained, 4);
  assert.equal(summary.refs.dropped, 3);
  assert.equal(summary.retainedBands.back.total, 1);
  assert.equal(summary.droppedBands.front.total, 1);
  assert.equal(summary.droppedBands.middle.total, 1);
  assert.equal(summary.droppedBands.back.total, 1);
  assert.equal(summary.overflowReasons.perTileRetainedCapPolicyReserve, 2);
  assert.equal(summary.overflowReasons.perTileRetainedCapMiddleBand, 0);
  assert.equal(summary.overflowReasons.perTileRetainedCapBehindSurfaceBand, 1);
  assert.equal(summary.lossSignals.foregroundDroppedRefs, 1);
  assert.equal(summary.lossSignals.behindSurfaceDroppedRefs, 1);
  assert.equal(summary.lossSignals.policyReserveDisplacedRefs, 2);
  assert.deepEqual(summary.policyHooks.map((hook) => hook.kind), ["tile-local-lod", "tile-local-aggregation"]);
});

test("cap-pressure retention summary rejects inconsistent retained aliases", () => {
  assert.throws(
    () => summarizeCapPressureRetention({
      version: 1,
      metadata: {
        projectedContributorCount: 1,
      },
      projectedContributors: [
        {
          originalId: 1,
          retentionStatus: "retained",
          retained: false,
          retentionBand: "front",
          overflowReason: "none",
          coverageWeight: 1,
        },
      ],
    }),
    /retained alias must match retentionStatus/
  );
});
