import assert from "node:assert/strict";
import test from "node:test";

import { summarizeGpuArenaParity } from "../../src/rendererFidelityProbes/gpuArenaParity.js";

test("GPU offload parity ledger preserves projected, retained, dropped, and ordered IDs", () => {
  const bridge = parityBridge({
    projected: [
      contributor({ splatIndex: 0, originalId: 70, contributorIndex: 0, viewRank: 4, retentionStatus: "retained" }),
      contributor({ splatIndex: 1, originalId: 990, contributorIndex: 1, viewRank: 6, retentionStatus: "dropped" }),
      contributor({ splatIndex: 2, originalId: 30, contributorIndex: 2, viewRank: 8, retentionStatus: "retained" }),
    ],
    retained: [
      contributor({ splatIndex: 0, originalId: 70, contributorIndex: 0, viewRank: 4, retentionStatus: "retained" }),
      contributor({ splatIndex: 2, originalId: 30, contributorIndex: 2, viewRank: 8, retentionStatus: "retained" }),
    ],
    projectedCount: 3,
    retainedCount: 2,
    droppedCount: 1,
  });

  const summary = summarizeGpuArenaParity(bridge, bridge.contributorArena.contributors);

  assert.deepEqual(summary.counts, {
    projected: 3,
    retained: 2,
    dropped: 1,
  });
  assert.deepEqual(summary.projectedContributorIds, [70, 990, 30]);
  assert.deepEqual(summary.cpuRetainedContributorIds, [70, 30]);
  assert.deepEqual(summary.retainedContributorIds, [70, 30]);
  assert.deepEqual(summary.droppedContributorIds, [990]);
  assert.deepEqual(summary.orderedContributorIds, [70, 30]);
  assert.deepEqual(summary.mismatchDiagnostics, []);
});

test("GPU offload parity ledger reports order mismatches with concrete retained IDs", () => {
  const bridge = parityBridge({
    projected: [
      contributor({ splatIndex: 0, originalId: 70, contributorIndex: 0, viewRank: 4, retentionStatus: "retained" }),
      contributor({ splatIndex: 1, originalId: 990, contributorIndex: 1, viewRank: 6, retentionStatus: "dropped" }),
      contributor({ splatIndex: 2, originalId: 30, contributorIndex: 2, viewRank: 8, retentionStatus: "retained" }),
    ],
    retained: [
      contributor({ splatIndex: 0, originalId: 70, contributorIndex: 0, viewRank: 4, retentionStatus: "retained" }),
      contributor({ splatIndex: 2, originalId: 30, contributorIndex: 2, viewRank: 8, retentionStatus: "retained" }),
    ],
    projectedCount: 3,
    retainedCount: 2,
    droppedCount: 1,
  });

  const offloadContributors = [...bridge.contributorArena.contributors].reverse();
  const summary = summarizeGpuArenaParity(bridge, offloadContributors);

  assert.deepEqual(summary.cpuRetainedContributorIds, [70, 30]);
  assert.deepEqual(summary.retainedContributorIds, [30, 70]);
  assert.match(summary.mismatchDiagnostics.join("\n"), /retained-id-order-mismatch|offload-order-mismatch/);
});

function parityBridge({ projected, retained, projectedCount, retainedCount, droppedCount }) {
  return {
    tileRefCustody: {
      projectedTileEntryCount: projectedCount,
      retainedTileEntryCount: retainedCount,
      evictedTileEntryCount: droppedCount,
    },
    contributorArena: {
      projectedContributors: projected,
      contributors: retained,
      metadata: {
        projectedContributorCount: projectedCount,
        retainedContributorCount: retainedCount,
        droppedContributorCount: droppedCount,
      },
    },
  };
}

function contributor(overrides) {
  return {
    splatIndex: 0,
    originalId: 0,
    tileIndex: 0,
    contributorIndex: 0,
    viewRank: 0,
    viewDepth: 0,
    depthBand: 0,
    coverageWeight: 0.5,
    centerPx: [11, 12],
    inverseConic: [0.25, 0, 0.25],
    opacity: 0.2,
    coverageAlpha: 0.1,
    transmittanceBefore: 0.9,
    retentionWeight: 0.7,
    occlusionWeight: 0.6,
    retentionStatus: "retained",
    retentionBand: "middle",
    overflowReason: "none",
    overflowReasonDetail: "none",
    deferredSurface: null,
    ...overrides,
  };
}
