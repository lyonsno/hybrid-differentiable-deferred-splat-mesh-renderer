import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyCompositorBufferTraceParity,
} from "../../src/rendererFidelityProbes/compositorBufferTraceParity.js";

test("compositor buffer parity reports exact readback fields missing from trace-only evidence", () => {
  const summary = classifyCompositorBufferTraceParity({
    traceFinalRows: [traceRow({ anchorId: "fresh-a" })],
    liveBufferRows: [],
  });

  assert.equal(summary.classification, "buffer-underinstrumented");
  assert.equal(summary.perAnchor.length, 1);
  assert.equal(summary.perAnchor[0].anchorId, "fresh-a");
  assert.equal(summary.perAnchor[0].status, "buffer-underinstrumented");
  assert.deepEqual(summary.perAnchor[0].missingFields, [
    "liveBuffer.legacyTileHeader",
    "liveBuffer.legacyTileRefs",
    "liveBuffer.legacyTileCoverageWeights",
    "liveBuffer.legacyAlphaParams",
    "liveBuffer.sourceColor",
    "liveBuffer.opacity",
    "liveBuffer.outputSpace",
  ]);
});

test("compositor buffer parity matches identity, order, coverage/alpha, source payload, and output metadata", () => {
  const summary = classifyCompositorBufferTraceParity({
    traceFinalRows: [traceRow({ anchorId: "fresh-a" })],
    liveBufferRows: [bufferRow({ anchorId: "fresh-a" })],
  });

  assert.equal(summary.classification, "buffer-matches-trace");
  assert.deepEqual(summary.perAnchor.map((row) => row.status), ["buffer-matches-trace"]);
  assert.deepEqual(summary.perAnchor[0].contributorIds, [101, 202]);
  assert.deepEqual(summary.perAnchor[0].order, [0, 1]);
});

test("compositor buffer parity classifies identity and order divergence before payload drift", () => {
  const identity = classifyCompositorBufferTraceParity({
    traceFinalRows: [traceRow({ anchorId: "fresh-a" })],
    liveBufferRows: [bufferRow({
      anchorId: "fresh-a",
      contributors: [
        contributor({ splatIndex: 101, originalId: 1010 }),
        contributor({ splatIndex: 303, originalId: 3030 }),
      ],
    })],
  });

  assert.equal(identity.classification, "buffer-identity-divergence");
  assert.equal(identity.perAnchor[0].status, "buffer-identity-divergence");
  assert.deepEqual(identity.perAnchor[0].missingTraceIdentitySample, [
    { splatIndex: 202, originalId: 2020 },
  ]);
  assert.deepEqual(identity.perAnchor[0].extraBufferIdentitySample, [
    { splatIndex: 303, originalId: 3030 },
  ]);

  const order = classifyCompositorBufferTraceParity({
    traceFinalRows: [traceRow({ anchorId: "fresh-a" })],
    liveBufferRows: [bufferRow({
      anchorId: "fresh-a",
      contributors: [
        contributor({ splatIndex: 202, originalId: 2020, orderIndex: 0 }),
        contributor({ splatIndex: 101, originalId: 1010, orderIndex: 1 }),
      ],
    })],
  });

  assert.equal(order.classification, "buffer-order-divergence");
  assert.equal(order.perAnchor[0].firstDivergentOrderIndex, 0);
});

test("compositor buffer parity classifies coverage alpha and source payload divergence", () => {
  const coverage = classifyCompositorBufferTraceParity({
    traceFinalRows: [traceRow({ anchorId: "fresh-a" })],
    liveBufferRows: [bufferRow({
      anchorId: "fresh-a",
      contributors: [
        contributor({ coverageWeight: 0.9, coverageAlpha: 0.25 }),
        contributor({ splatIndex: 202, originalId: 2020, orderIndex: 1 }),
      ],
    })],
  });

  assert.equal(coverage.classification, "buffer-coverage-alpha-divergence");
  assert.equal(coverage.perAnchor[0].firstCoverageAlphaMismatch.orderIndex, 0);
  assert.equal(coverage.perAnchor[0].firstCoverageAlphaMismatch.field, "coverageWeight");

  const source = classifyCompositorBufferTraceParity({
    traceFinalRows: [traceRow({ anchorId: "fresh-a" })],
    liveBufferRows: [bufferRow({
      anchorId: "fresh-a",
      contributors: [
        contributor({ sourceColor: [0.9, 0.7, 0.5] }),
        contributor({ splatIndex: 202, originalId: 2020, orderIndex: 1 }),
      ],
    })],
  });

  assert.equal(source.classification, "buffer-source-payload-divergence");
  assert.equal(source.perAnchor[0].firstSourcePayloadMismatch.field, "sourceColor");
});

function traceRow({ anchorId }) {
  return {
    anchorId,
    anchorPixel: { id: anchorId, x: 120, y: 64 },
    tileAddress: { tileSizePx: 16, tileX: 7, tileY: 4, tileIndex: 871, localX: 8, localY: 0 },
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible",
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
      viewport: { width: 3456, height: 1916, deviceScaleFactor: 1 },
      tileSizePx: 16,
      maxRefsPerTile: 256,
    },
    finalColorAccumulation: {
      outputColor: [0.3, 0.2, 0.1, 1],
      outputColorSpace: "rgba8-unorm",
      steps: [
        contributor(),
        contributor({ splatIndex: 202, originalId: 2020, orderIndex: 1 }),
      ],
    },
  };
}

function bufferRow({ anchorId, contributors } = {}) {
  const rows = Array.isArray(contributors)
    ? contributors
    : [
        contributor(),
        contributor({ splatIndex: 202, originalId: 2020, orderIndex: 1 }),
      ];
  return {
    anchorId,
    anchorPixel: { id: anchorId, x: 120, y: 64 },
    tileAddress: { tileSizePx: 16, tileX: 7, tileY: 4, tileIndex: 871, localX: 8, localY: 0 },
    liveBuffer: {
      legacyTileHeader: { contributorOffset: 10, retainedContributorCount: rows.length },
      legacyTileRefs: rows.map((row) => row.splatIndex),
      legacyTileCoverageWeights: rows.map((row) => row.coverageWeight),
      legacyAlphaParams: rows.map((row) => ({
        coverageAlpha: row.coverageAlpha,
        inverseConic: row.inverseConic,
      })),
      sourceColor: rows.map((row) => row.sourceColor),
      opacity: rows.map((row) => row.opacity),
      outputSpace: {
        textureFormat: "rgba16float",
        sampleSpace: "linear-float",
        transferStage: "legacy-compositor-buffer-before-composite_tiles",
      },
    },
    contributors: rows,
  };
}

function contributor(overrides = {}) {
  return {
    splatIndex: 101,
    originalId: 1010,
    orderIndex: 0,
    coverageWeight: 0.125,
    coverageAlpha: 0.0625,
    opacity: 0.5,
    inverseConic: [0.25, 0, 0.25],
    sourceColor: [1, 0.75, 0.5],
    outputSpace: {
      textureFormat: "rgba16float",
      sampleSpace: "linear-float",
    },
    ...overrides,
  };
}
