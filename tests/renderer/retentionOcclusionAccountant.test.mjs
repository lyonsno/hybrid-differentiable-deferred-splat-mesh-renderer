import assert from "node:assert/strict";
import test from "node:test";

import { buildGpuTileCoverageBridge, getRetentionOcclusionRequiredLedgerFields } from "../../src/gpuTileCoverageBridge.js";
import {
  classifyRetentionOcclusionLedger,
  describeRetentionOcclusionAccountantContract,
} from "../../src/rendererFidelityProbes/retentionOcclusionAccountant.js";

const REQUIRED_FIELDS = getRetentionOcclusionRequiredLedgerFields();

function makeCappedBridge() {
  const tileEntries = Array.from({ length: 257 }, (_, index) => ({
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: index,
    originalId: 1000 + index,
    coverageWeight: 257 - index,
    retentionWeight: index < 8 ? 2 - index * 0.01 : 0.5,
    occlusionWeight: index < 8 ? 1.5 - index * 0.01 : 0.4,
    viewRank: index,
    viewDepth: 0.1 + index * 0.001,
  }));

  return buildGpuTileCoverageBridge({
    viewportWidth: 16,
    viewportHeight: 16,
    tileSizePx: 16,
    tileColumns: 1,
    tileRows: 1,
    sourceSplatCount: tileEntries.length,
    splats: tileEntries.map((entry) => ({
      splatIndex: entry.splatIndex,
      originalId: entry.originalId,
      centerPx: [8, 8],
      covariancePx: { xx: 16, xy: 0, yy: 16 },
      tileBounds: { minTileX: 0, minTileY: 0, maxTileX: 0, maxTileY: 0 },
    })),
    tileEntries,
    maxRefsPerTile: 256,
  });
}

function makeContributor(identity, side, retained = true) {
  return {
    identity,
    role: side,
    side,
    retained,
    coverageWeight: side === "foreground" ? 10 : 0.25,
    depth: side === "foreground" ? 0.25 : 0.95,
  };
}

test("bridge frame evidence keeps the 16/256 cap contract visible without per-pixel inference", () => {
  const bridge = makeCappedBridge();

  assert.equal(bridge.retentionOcclusionFrameEvidence.version, 1);
  assert.equal(bridge.retentionOcclusionFrameEvidence.refs.projected, 257);
  assert.equal(bridge.retentionOcclusionFrameEvidence.refs.retained, 256);
  assert.equal(bridge.retentionOcclusionFrameEvidence.refs.dropped, 1);
  assert.equal(bridge.retentionOcclusionFrameEvidence.refs.maxRefsPerTile, 256);
  assert.equal(bridge.retentionOcclusionFrameEvidence.refs.tileCount, 1);
  assert.deepEqual(bridge.retentionOcclusionFrameEvidence.requiredFields, REQUIRED_FIELDS);
  assert.equal(bridge.retentionOcclusionFrameEvidence.tileRefCustody.headerAccountingMatches, true);
});

test("real-scene anchor pixels stay undiagnosable until the per-pixel contributor lists arrive", () => {
  const scenes = [
    {
      label: "lacunar-hole-dessert-1260-930",
      pixelPx: [1260, 930],
      crop: { x: 1232, y: 902, w: 80, h: 80 },
      finalRgb: [25, 17, 15],
      plateRgb: [79, 43, 30],
      cropProjectedSupportCount: 2759,
    },
    {
      label: "dense-foreground-leak-1580-1260",
      pixelPx: [1580, 1260],
      crop: { x: 1540, y: 1220, w: 96, h: 96 },
      finalRgb: [81, 46, 32],
      plateRgb: [80, 43, 28],
      cropProjectedSupportCount: 5071,
    },
    {
      label: "black-band-dropout-2300-1055",
      pixelPx: [2300, 1055],
      crop: { x: 2232, y: 1024, w: 160, h: 48 },
      finalRgb: [5, 5, 10],
      plateRgb: [80, 43, 28],
      cropProjectedSupportCount: 0,
    },
  ];

  for (const scene of scenes) {
    const verdict = classifyRetentionOcclusionLedger({
      ...scene,
      frame: {
        viewport: [3456, 1804],
        tileGrid: [216, 113],
        effectiveArenaBackend: "gpu",
        orderingBackend: "gpu-sorted-index-rank-inversion",
        projected: 2360150,
        retained: 2360150,
        dropped: 0,
        visibleCompositedRefLimit: 256,
      },
    });

    assert.equal(verdict.status, "undiagnosable");
    assert.deepEqual(verdict.missingFields, REQUIRED_FIELDS);
    assert.equal(verdict.backend.effectiveArenaBackend, "gpu");
    assert.equal(verdict.backend.orderingBackend, "gpu-sorted-index-rank-inversion");
    assert.equal(verdict.backend.visibleCompositedRefLimit, 256);
    assert.deepEqual(verdict.frame.viewport, [3456, 1804]);
    assert.deepEqual(verdict.frame.tileGrid, [216, 113]);
    assert.deepEqual(verdict.frameEvidence.requiredFields, REQUIRED_FIELDS);
    assert.deepEqual(verdict.frameEvidence.refs, {
      projected: 2360150,
      retained: 2360150,
      dropped: 0,
      maxRefsPerTile: 256,
      tileCount: 216 * 113,
    });
  }
});

test("retention accountant marks dropped foreground support as insufficient", () => {
  const bridge = makeCappedBridge();
  const verdict = classifyRetentionOcclusionLedger({
    label: "synthetic-insufficient",
    pixelPx: [10, 10],
    crop: { x: 0, y: 0, w: 16, h: 16 },
    finalRgb: [30, 20, 18],
    plateRgb: [80, 43, 28],
    cropProjectedSupportCount: 257,
    frameEvidence: bridge.retentionOcclusionFrameEvidence,
    frame: {
      viewport: [16, 16],
      tileGrid: [1, 1],
      effectiveArenaBackend: "gpu",
      orderingBackend: "gpu-sorted-index-rank-inversion",
      projected: 257,
      retained: 256,
      dropped: 1,
      visibleCompositedRefLimit: 256,
    },
    tileLocal: {
      perPixelProjectedContributors: [
        makeContributor("front-a", "foreground", true),
        makeContributor("front-b", "foreground", true),
        makeContributor("behind-a", "behind", true),
      ],
      perPixelRetainedContributors: [
        makeContributor("front-b", "foreground", true),
        makeContributor("behind-a", "behind", true),
      ],
      perPixelOrderedContributors: [
        makeContributor("front-b", "foreground", true),
        makeContributor("behind-a", "behind", true),
      ],
      perPixelFinalColorAccumulation: {
        observedBehindWeight: 0,
        referenceBehindWeight: 0,
        remainingTransmission: 0.24,
        leakedBehind: false,
      },
    },
  });

  assert.equal(verdict.status, "insufficient");
  assert.deepEqual(verdict.missingForegroundContributorIds, ["front-a"]);
  assert.equal(verdict.repair.keepContributorIds.includes("front-a"), true);
  assert.equal(verdict.repair.displaceContributorIds.includes("behind-a"), true);
});

test("retention accountant marks retained foreground that still leaks behind as misleadingly sufficient", () => {
  const verdict = classifyRetentionOcclusionLedger({
    label: "synthetic-misleading",
    pixelPx: [20, 20],
    crop: { x: 0, y: 0, w: 16, h: 16 },
    finalRgb: [54, 31, 24],
    plateRgb: [80, 43, 28],
    cropProjectedSupportCount: 312,
    frame: {
      viewport: [16, 16],
      tileGrid: [1, 1],
      effectiveArenaBackend: "gpu",
      orderingBackend: "gpu-sorted-index-rank-inversion",
      projected: 312,
      retained: 256,
      dropped: 56,
      visibleCompositedRefLimit: 256,
    },
    tileLocal: {
      perPixelProjectedContributors: [
        makeContributor("front-a", "foreground", true),
        makeContributor("front-b", "foreground", true),
        makeContributor("behind-a", "behind", true),
      ],
      perPixelRetainedContributors: [
        makeContributor("front-a", "foreground", true),
        makeContributor("front-b", "foreground", true),
        makeContributor("behind-a", "behind", true),
      ],
      perPixelOrderedContributors: [
        makeContributor("front-a", "foreground", true),
        makeContributor("front-b", "foreground", true),
        makeContributor("behind-a", "behind", true),
      ],
      perPixelFinalColorAccumulation: {
        observedBehindWeight: 0.015,
        referenceBehindWeight: 0,
        remainingTransmission: 0.18,
        leakedBehind: true,
      },
    },
  });

  assert.equal(verdict.status, "misleadingly sufficient");
  assert.deepEqual(verdict.repair.keepContributorIds, ["front-a", "front-b"]);
  assert.deepEqual(verdict.repair.displaceContributorIds, ["behind-a"]);
});

test("retention accountant marks clean retained foreground as sufficient", () => {
  const verdict = classifyRetentionOcclusionLedger({
    label: "synthetic-sufficient",
    pixelPx: [24, 24],
    crop: { x: 0, y: 0, w: 16, h: 16 },
    finalRgb: [25, 17, 15],
    plateRgb: [79, 43, 30],
    cropProjectedSupportCount: 72,
    frame: {
      viewport: [16, 16],
      tileGrid: [1, 1],
      effectiveArenaBackend: "gpu",
      orderingBackend: "gpu-sorted-index-rank-inversion",
      projected: 72,
      retained: 72,
      dropped: 0,
      visibleCompositedRefLimit: 256,
    },
    tileLocal: {
      perPixelProjectedContributors: [
        makeContributor("front-a", "foreground", true),
        makeContributor("front-b", "foreground", true),
        makeContributor("behind-a", "behind", true),
      ],
      perPixelRetainedContributors: [
        makeContributor("front-a", "foreground", true),
        makeContributor("front-b", "foreground", true),
        makeContributor("behind-a", "behind", true),
      ],
      perPixelOrderedContributors: [
        makeContributor("front-a", "foreground", true),
        makeContributor("front-b", "foreground", true),
        makeContributor("behind-a", "behind", true),
      ],
      perPixelFinalColorAccumulation: {
        observedBehindWeight: 0,
        referenceBehindWeight: 0,
        remainingTransmission: 0.04,
        leakedBehind: false,
      },
    },
  });

  assert.equal(verdict.status, "sufficient");
  assert.deepEqual(verdict.repair.keepContributorIds, ["front-a", "front-b"]);
  assert.deepEqual(verdict.repair.displaceContributorIds, []);
});

test("retention accountant contract names the bounded evidence surface", () => {
  assert.deepEqual(describeRetentionOcclusionAccountantContract(), {
    consumes: [
      "final-pixel-contributor-ledger:representative-real-scene-classes-and-coordinates",
      "tile-local-visible:per-pixel-projected-contributors",
      "tile-local-visible:per-pixel-retained-contributors",
      "tile-local-visible:per-pixel-ordered-contributors",
      "tile-local-visible:per-pixel-final-color-accumulation",
      "tile-local-visible:retention-audit",
    ],
    verdicts: [
      "sufficient",
      "insufficient",
      "misleadingly sufficient",
      "undiagnosable",
    ],
    forbiddenFixes: [
      "urmina-backend-redefinition",
      "source-decoding",
      "global-cap-raising",
      "global-opacity-or-brightness-tuning",
      "production-gbuffer-voting",
      "final-color-only-polish",
    ],
  });
});
