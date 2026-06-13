import assert from "node:assert/strict";
import test from "node:test";

import {
  BLACK_BAND_FINAL_ACCUMULATION_ANCHOR,
  buildFinalColorAccumulationTraceRecord,
  buildPerPixelFinalColorAccumulationTraces,
} from "../../src/rendererFidelityProbes/finalAccumulationTrace.js";
import {
  PIXEL_CONTRIBUTOR_TRACE_SCHEMA,
  validatePixelContributorTraceRecord,
} from "../../src/rendererFidelityProbes/pixelContributorTraceSchema.js";

const EPSILON = 1e-9;

test("final accumulation trace matches ordered shader alpha transfer for a synthetic pixel", () => {
  const record = buildFinalColorAccumulationTraceRecord({
    contributors: [
      accumulationContributor({
        splatIndex: 2,
        originalId: 200,
        viewRank: 10,
        viewDepth: -4,
        opacity: 0.5,
      }),
      accumulationContributor({
        splatIndex: 7,
        originalId: 700,
        viewRank: 20,
        viewDepth: -3,
        opacity: 0.25,
      }),
    ],
    sourceColors: new Map([
      [2, [0.8, 0.2, 0.1]],
      [7, [0, 0.4, 1]],
    ]),
    retainedContributors: null,
    dispatchCache: {
      tileIndex: 14183,
      clearFrameId: 4,
      buildFrameId: 4,
      compositeFrameId: 4,
    },
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible-gaussian-compositor",
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
    },
  });

  assert.equal(record.anchorPixel.id, BLACK_BAND_FINAL_ACCUMULATION_ANCHOR.id);
  assert.deepEqual(validatePixelContributorTraceRecord(record), []);
  assert.equal(record.finalColorAccumulation.steps.length, 2);
  assert.deepEqual(
    record.finalColorAccumulation.steps.map((step) => [
      step.orderIndex,
      step.splatIndex,
      step.originalId,
      step.accumulationStatus,
      step.coverageWeight,
      step.opacity,
      step.coverageAlpha,
      step.transmittanceBefore,
      step.transmittanceAfter,
    ]),
    [
      [0, 2, 200, "accumulated", 1, 0.5, 0.5, 1, 0.5],
      [1, 7, 700, "accumulated", 1, 0.25, 0.25, 0.5, 0.375],
    ],
  );
  assertColorClose(record.finalColorAccumulation.steps[0].runningColor, [0.41, 0.11, 0.07]);
  assertColorClose(record.finalColorAccumulation.steps[1].runningColor, [0.3075, 0.1825, 0.3025]);
  assertColorClose(record.finalColorAccumulation.outputColor, [0.3075, 0.1825, 0.3025, 0.625]);
  assert.deepEqual(record.blockers, [
    {
      field: "retainedContributors",
      reason: "tileLocal.perPixelRetainedContributors not landed; accumulation uses ordered retained runtime contributors only",
    },
  ]);
});

test("final accumulation trace filters zero-support contributors before accumulated contributors", () => {
  const record = buildFinalColorAccumulationTraceRecord({
    contributors: [
      accumulationContributor({
        splatIndex: 3,
        originalId: 300,
        viewRank: 1,
        viewDepth: -2,
        coverageWeight: 0,
        opacity: 0.9,
      }),
      accumulationContributor({
        splatIndex: 4,
        originalId: 400,
        viewRank: 2,
        viewDepth: -1,
        opacity: 0.25,
      }),
    ],
    sourceColors: new Map([
      [3, [1, 0, 0]],
      [4, [0, 1, 0]],
    ]),
    retainedContributors: [],
  });

  assert.equal(record.finalColorAccumulation.steps.length, 1);
  assert.equal(record.finalColorAccumulation.steps[0].splatIndex, 4);
  assert.equal(record.finalColorAccumulation.steps[0].accumulationStatus, "accumulated");
  assertColorClose(record.finalColorAccumulation.outputColor, [0.015, 0.265, 0.03, 0.25]);
  assert.deepEqual(validatePixelContributorTraceRecord(record), []);
});

test("final accumulation trace closes or explicitly blocks every canonical anchor", () => {
  const traces = buildPerPixelFinalColorAccumulationTraces({
    contributors: [
      accumulationContributor({
        anchor: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0],
        tileIndex: tileIndexForAnchor(PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0]),
        splatIndex: 11,
        originalId: 1100,
        viewRank: 11,
        opacity: 0.4,
      }),
      accumulationContributor({
        anchor: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[2],
        tileIndex: tileIndexForAnchor(PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[2]),
        splatIndex: 22,
        originalId: 2200,
        viewRank: 22,
        opacity: 0.5,
      }),
    ],
    sourceColors: new Map([
      [11, [0.7, 0.5, 0.3]],
      [22, [0.2, 0.4, 0.8]],
    ]),
    retainedContributorsByAnchorId: new Map([
      ["lacunar-hole-dessert-1260-930", [{ splatIndex: 11, originalId: 1100 }]],
      ["dense-foreground-leak-1580-1260", []],
      ["black-band-dropout-2300-1055", [{ splatIndex: 22, originalId: 2200 }]],
    ]),
    tileSizePx: 16,
    tileColumns: 216,
  });

  assert.deepEqual(
    traces.map((trace) => trace.anchorPixel.id),
    PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.map((anchor) => anchor.id),
  );

  const byAnchorId = new Map(traces.map((trace) => [trace.anchorPixel.id, trace]));
  assert.equal(byAnchorId.get("lacunar-hole-dessert-1260-930").status, "present");
  assert.equal(byAnchorId.get("black-band-dropout-2300-1055").status, "present");
  assert.equal(byAnchorId.get("dense-foreground-leak-1580-1260").status, "blocked");
  assert.equal(
    byAnchorId.get("dense-foreground-leak-1580-1260").blockers[0].reason,
    "tileLocal.perPixelFinalColorAccumulation missing contributors for dense-foreground-leak-1580-1260",
  );
});

test("per-pixel final accumulation traces expose runtime ordered contributors when no explicit order trace exists", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const traces = buildPerPixelFinalColorAccumulationTraces({
    contributors: [
      accumulationContributor({
        anchor,
        tileIndex: tileIndexForAnchor(anchor),
        splatIndex: 31,
        originalId: 3100,
        viewRank: 31,
        opacity: 0.4,
      }),
    ],
    sourceColors: new Map([[31, [0.7, 0.5, 0.3]]]),
    retainedContributorsByAnchorId: new Map([
      [anchor.id, [{ splatIndex: 31, originalId: 3100 }]],
    ]),
    tileSizePx: 16,
    tileColumns: 216,
  });

  const trace = traces.find((entry) => entry.anchorPixel.id === anchor.id);
  assert.equal(trace.status, "present");
  assert.deepEqual(
    trace.orderedContributors.map(({ splatIndex, originalId, orderIndex, viewRank }) => [
      splatIndex,
      originalId,
      orderIndex,
      viewRank,
    ]),
    [[31, 3100, 0, 31]],
  );
  assert.equal(trace.orderedContributors[0].coverageWeight, 1);
  assert.equal(trace.orderedContributors[0].opacity, 0.4);
});

test("per-pixel final accumulation traces can consume anchor-keyed source-frontier readback contributors", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const readbackContributor = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 41,
    originalId: 41,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 9,
    opacity: 0.55,
  });
  const traces = buildPerPixelFinalColorAccumulationTraces({
    contributors: [],
    contributorsByAnchorId: new Map([[anchor.id, [readbackContributor]]]),
    sourceColors: new Map([[41, [0.6, 0.4, 0.2]]]),
    retainedContributorsByAnchorId: new Map([[anchor.id, [readbackContributor]]]),
    orderedContributorsByAnchorId: new Map([[anchor.id, [readbackContributor]]]),
    tileSizePx: 16,
    tileColumns: 216,
    anchors: [anchor],
  });

  assert.equal(traces.length, 1);
  assert.equal(traces[0].status, "present");
  assert.equal(traces[0].finalColorAccumulation.steps.length, 1);
  assert.equal(traces[0].retainedContributors[0].sourceRole, "foreground-sealing");
  assert.equal(traces[0].orderedContributors[0].candidateSourceClassMask, 9);
});

test("per-pixel final accumulation preserves explicit live compositor input order for final color replay", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const tileIndex = tileIndexForAnchor(anchor);
  const liveFirst = accumulationContributor({
    anchor,
    tileIndex,
    splatIndex: 51,
    originalId: 5100,
    viewRank: 20,
    opacity: 0.5,
  });
  const liveSecond = accumulationContributor({
    anchor,
    tileIndex,
    splatIndex: 52,
    originalId: 5200,
    viewRank: 10,
    opacity: 0.5,
  });
  const liveCompositorInputOrder = [liveFirst, liveSecond];

  const traces = buildPerPixelFinalColorAccumulationTraces({
    contributors: [],
    contributorsByAnchorId: new Map([[anchor.id, liveCompositorInputOrder]]),
    sourceColors: new Map([
      [51, [0, 0, 1]],
      [52, [1, 0, 0]],
    ]),
    retainedContributorsByAnchorId: new Map([[anchor.id, liveCompositorInputOrder]]),
    orderedContributorsByAnchorId: new Map([[anchor.id, liveCompositorInputOrder]]),
    tileSizePx: 16,
    tileColumns: 216,
    anchors: [anchor],
  });

  const trace = traces[0];
  assert.deepEqual(
    trace.finalColorAccumulation.steps.map((step) => step.splatIndex),
    [51, 52],
    "live compositor input readback is already in physical compositor order and must not be resorted",
  );
  assertColorClose(trace.finalColorAccumulation.outputColor, [0.505, 0.005, 0.26, 0.75]);
});

test("source-frontier foreground support crosses the final alpha bulkhead with spatial attenuation", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const foregroundSheet = Array.from({ length: 24 }, (_, index) =>
    accumulationContributor({
      anchor,
      tileIndex: tileIndexForAnchor(anchor),
      splatIndex: 700 + index,
      originalId: 700 + index,
      viewRank: index,
      sourceRole: "foreground-sealing",
      role: "foreground-sealing",
      candidateSourceClassMask: 9,
      coverageWeight: 0.42,
      centerPx: [anchor.x + 2.5, anchor.y + 0.5],
      inverseConic: [1, 0, 1],
      opacity: 0.08,
    })
  );

  const sourceColors = new Map(
    foregroundSheet.map((contributor) => [contributor.splatIndex, [0.75, 0.55, 0.32]])
  );
  const sourceFrontier = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: foregroundSheet,
    sourceColors,
    retainedContributors: foregroundSheet,
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible-gaussian-compositor",
      retainedSource: "deterministic-gpu-retention-carrier->gpu-contributor-arena-runtime",
    },
    tileSizePx: 16,
    tileColumns: 216,
  });
  const legacyConicOnly = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: foregroundSheet.map(({ sourceRole, role, candidateSourceClassMask, ...contributor }) => contributor),
    sourceColors,
    retainedContributors: foregroundSheet,
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible-gaussian-compositor",
      retainedSource: "legacy-identity",
    },
    tileSizePx: 16,
    tileColumns: 216,
  });
  const tileWideRemainingTransmittance = tileWideSupportRemainingTransmittance(
    sourceFrontier.finalColorAccumulation.steps,
  );

  assert.ok(
    sourceFrontier.finalColorAccumulation.steps[0].sourceFrontierSupportPixelWeight > 0.1,
    `expected broad support envelope above the legacy off-center conic, saw ${sourceFrontier.finalColorAccumulation.steps[0].sourceFrontierSupportPixelWeight}`,
  );
  assert.ok(
    sourceFrontier.finalColorAccumulation.remainingTransmittance > tileWideRemainingTransmittance * 100,
    `expected spatial support to avoid a tile-wide seal: spatial T ${sourceFrontier.finalColorAccumulation.remainingTransmittance}, tile-wide T ${tileWideRemainingTransmittance}`,
  );
  assert.ok(
    legacyConicOnly.finalColorAccumulation.remainingTransmittance > 0.96,
    `legacy conic-only transfer should stay weak for this off-center fixture, saw ${legacyConicOnly.finalColorAccumulation.remainingTransmittance}`,
  );
  assert.ok(
    sourceFrontier.finalColorAccumulation.remainingTransmittance < legacyConicOnly.finalColorAccumulation.remainingTransmittance * 0.85,
    "source-frontier foreground support should not be trapped behind the same conic-only alpha transfer as legacy refs",
  );
  assert.equal(sourceFrontier.finalColorAccumulation.steps[0].sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.equal(legacyConicOnly.finalColorAccumulation.steps[0].sourceFrontierAlphaSupport, "none");
});

test("source-frontier foreground support seals transmission without tile-amplifying off-center color", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const offConicSupport = Array.from({ length: 4 }, (_, index) =>
    accumulationContributor({
      anchor,
      tileIndex: tileIndexForAnchor(anchor),
      splatIndex: 880 + index,
      originalId: 880 + index,
      viewRank: index,
      sourceRole: "foreground-sealing",
      role: "foreground-sealing",
      candidateSourceClassMask: 9,
      coverageWeight: 0.8,
      centerPx: [anchor.x + 3, anchor.y + 0.5],
      inverseConic: [1, 0, 1],
      opacity: 0.8,
    })
  );
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: offConicSupport,
    sourceColors: new Map(offConicSupport.map((contributor) => [contributor.splatIndex, [1, 0.5, 0.25]])),
    retainedContributors: offConicSupport,
    tileSizePx: 16,
    tileColumns: 216,
  });
  const step = record.finalColorAccumulation.steps[0];

  assert.equal(step.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    step.colorTransferWeight < step.alphaTransferWeight * 0.25,
    `expected off-center support color to avoid tile-amplified transfer: color ${step.colorTransferWeight}, alpha ${step.alphaTransferWeight}`,
  );
  assert.ok(
    step.colorTransferWeight >= step.sourceFrontierSupportPixelWeight,
    `expected color to keep the spatial support envelope, saw ${step.colorTransferWeight} vs ${step.sourceFrontierSupportPixelWeight}`,
  );
  assert.ok(
    record.finalColorAccumulation.remainingTransmittance < 0.5,
    `expected support to still seal transmission, saw ${record.finalColorAccumulation.remainingTransmittance}`,
  );
  assert.ok(
    record.finalColorAccumulation.outputColor[0] < 0.35,
    `expected off-center support not to paint a full bright tile, saw ${record.finalColorAccumulation.outputColor[0]}`,
  );
});

function tileWideSupportRemainingTransmittance(steps) {
  return steps.reduce((remainingTransmittance, step) => {
    const supportPixelWeight = Math.max(step.sourceFrontierSupportPixelWeight, EPSILON);
    const tileWideTransferWeight = step.alphaTransferWeight / supportPixelWeight;
    const tileWideCoverageAlpha = 1 - Math.pow(1 - step.opacity, tileWideTransferWeight);
    return remainingTransmittance * (1 - tileWideCoverageAlpha);
  }, 1);
}

function accumulationContributor(overrides = {}) {
  const anchor = overrides.anchor ?? BLACK_BAND_FINAL_ACCUMULATION_ANCHOR;
  return {
    splatIndex: 1,
    originalId: 100,
    tileIndex: tileIndexForAnchor(anchor),
    viewRank: 1,
    viewDepth: -1,
    coverageWeight: 1,
    centerPx: [anchor.x + 0.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.5,
    ...overrides,
  };
}

function tileIndexForAnchor(anchor, tileSizePx = 16, tileColumns = 216) {
  if (anchor.canonicalTileAddress) return anchor.canonicalTileAddress.tileIndex;
  return Math.floor(anchor.y / tileSizePx) * tileColumns + Math.floor(anchor.x / tileSizePx);
}

function assertColorClose(actual, expected) {
  assert.equal(actual.length, expected.length, "channel count");
  for (let index = 0; index < expected.length; index += 1) {
    assert.ok(
      Math.abs(actual[index] - expected[index]) <= EPSILON,
      `channel ${index}: expected ${expected[index]}, got ${actual[index]}`,
    );
  }
}
