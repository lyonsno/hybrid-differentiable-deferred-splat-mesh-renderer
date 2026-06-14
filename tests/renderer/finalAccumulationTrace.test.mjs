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
      candidateSourceClassMask: 8,
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

test("source-frontier support color carries a bounded portion of the support alpha gap", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const broadSupport = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 905,
    originalId: 905,
    viewRank: 0,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 8,
    coverageWeight: 0.9,
    centerPx: [anchor.x + 3, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.8,
  });
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [broadSupport],
    sourceColors: new Map([[broadSupport.splatIndex, [1, 0.5, 0.25]]]),
    retainedContributors: [broadSupport],
    tileSizePx: 16,
    tileColumns: 216,
  });
  const step = record.finalColorAccumulation.steps[0];

  assert.equal(step.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    step.alphaTransferWeight > step.sourceFrontierSupportPixelWeight * 4,
    `expected fixture to expose support/alpha gap: support ${step.sourceFrontierSupportPixelWeight}, alpha ${step.alphaTransferWeight}`,
  );
  assert.ok(
    step.colorTransferWeight > step.sourceFrontierSupportPixelWeight,
    `expected support color to carry bounded gap mass instead of pinning to sparse support weight: color ${step.colorTransferWeight}, support ${step.sourceFrontierSupportPixelWeight}`,
  );
  assert.ok(
    step.colorTransferWeight < step.alphaTransferWeight * 0.25,
    `expected support color to stay below tile-amplified alpha transfer: color ${step.colorTransferWeight}, alpha ${step.alphaTransferWeight}`,
  );
});

test("source-frontier retained support transfers selected color without support-only throttle", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const retainedSupport = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 906,
    originalId: 906,
    viewRank: 0,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 9,
    coverageWeight: 0.9,
    centerPx: [anchor.x + 3, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.8,
  });
  const supportOnly = {
    ...retainedSupport,
    splatIndex: 907,
    originalId: 907,
    candidateSourceClassMask: 8,
  };
  const retainedRecord = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [retainedSupport],
    sourceColors: new Map([[retainedSupport.splatIndex, [1, 0.5, 0.25]]]),
    retainedContributors: [retainedSupport],
    tileSizePx: 16,
    tileColumns: 216,
  });
  const supportOnlyRecord = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [supportOnly],
    sourceColors: new Map([[supportOnly.splatIndex, [1, 0.5, 0.25]]]),
    retainedContributors: [supportOnly],
    tileSizePx: 16,
    tileColumns: 216,
  });
  const retainedStep = retainedRecord.finalColorAccumulation.steps[0];
  const supportOnlyStep = supportOnlyRecord.finalColorAccumulation.steps[0];

  assert.equal(retainedStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.equal(supportOnlyStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.equal(
    retainedStep.candidateSourceClassMask,
    9,
    "final accumulation probe steps must expose retained+support source authority",
  );
  assert.equal(
    supportOnlyStep.candidateSourceClassMask,
    8,
    "final accumulation probe steps must expose support-only source authority",
  );
  assert.ok(
    retainedStep.alphaTransferWeight > retainedStep.sourceFrontierSupportPixelWeight * 4,
    `expected fixture to expose retained support alpha/color gap: support ${retainedStep.sourceFrontierSupportPixelWeight}, alpha ${retainedStep.alphaTransferWeight}`,
  );
  assert.ok(
    retainedStep.colorTransferWeight >= retainedStep.alphaTransferWeight * 0.95,
    `retained support should transfer selected color with alpha authority: color ${retainedStep.colorTransferWeight}, alpha ${retainedStep.alphaTransferWeight}`,
  );
  assert.ok(
    supportOnlyStep.colorTransferWeight < supportOnlyStep.alphaTransferWeight * 0.25,
    `support-only refs should keep bounded color transfer: color ${supportOnlyStep.colorTransferWeight}, alpha ${supportOnlyStep.alphaTransferWeight}`,
  );
});

test("source-frontier retention-only support keeps bounded color transfer", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const retentionOnly = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 908,
    originalId: 908,
    viewRank: 0,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 1,
    coverageWeight: 0.9,
    centerPx: [anchor.x + 3, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.8,
  });
  const retainedSupport = {
    ...retentionOnly,
    splatIndex: 909,
    originalId: 909,
    candidateSourceClassMask: 9,
  };
  const retentionOnlyRecord = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [retentionOnly],
    sourceColors: new Map([[retentionOnly.splatIndex, [1, 0.5, 0.25]]]),
    retainedContributors: [retentionOnly],
    tileSizePx: 16,
    tileColumns: 216,
  });
  const retainedSupportRecord = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [retainedSupport],
    sourceColors: new Map([[retainedSupport.splatIndex, [1, 0.5, 0.25]]]),
    retainedContributors: [retainedSupport],
    tileSizePx: 16,
    tileColumns: 216,
  });
  const retentionOnlyStep = retentionOnlyRecord.finalColorAccumulation.steps[0];
  const retainedSupportStep = retainedSupportRecord.finalColorAccumulation.steps[0];

  assert.equal(retentionOnlyStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.equal(retainedSupportStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    retentionOnlyStep.colorTransferWeight < retentionOnlyStep.alphaTransferWeight * 0.25,
    `retention-only refs should not inherit retained-support color authority: color ${retentionOnlyStep.colorTransferWeight}, alpha ${retentionOnlyStep.alphaTransferWeight}`,
  );
  assert.ok(
    retainedSupportStep.colorTransferWeight >= retainedSupportStep.alphaTransferWeight * 0.95,
    `retained-support refs should keep selected color authority: color ${retainedSupportStep.colorTransferWeight}, alpha ${retainedSupportStep.alphaTransferWeight}`,
  );
});

test("source-frontier support alpha does not erase retained foreground color faster than color transfer arrives", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const nearForeground = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 910,
    originalId: 910,
    viewRank: 0,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 9,
    coverageWeight: 1,
    centerPx: [anchor.x + 0.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.55,
  });
  const broadSupport = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 911,
    originalId: 911,
    viewRank: 1,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 8,
    coverageWeight: 0.95,
    centerPx: [anchor.x + 3, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.85,
  });
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [nearForeground, broadSupport],
    sourceColors: new Map([
      [nearForeground.splatIndex, [0.95, 0.78, 0.52]],
      [broadSupport.splatIndex, [0.06, 0.04, 0.03]],
    ]),
    retainedContributors: [nearForeground, broadSupport],
    preserveContributorOrder: true,
    tileSizePx: 16,
    tileColumns: 216,
  });
  const firstStep = record.finalColorAccumulation.steps[0];
  const supportStep = record.finalColorAccumulation.steps[1];

  assert.equal(supportStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    supportStep.coverageAlpha > supportStep.colorAlpha * 2,
    `expected fixture to expose alpha/color mass gap: coverage ${supportStep.coverageAlpha}, color ${supportStep.colorAlpha}`,
  );
  assert.ok(
    record.finalColorAccumulation.remainingTransmittance < 0.05,
    `expected broad support to preserve the alpha seal, saw ${record.finalColorAccumulation.remainingTransmittance}`,
  );
  const fullCoverageWipeRed =
    supportStep.sourceColor[0] * supportStep.colorAlpha + firstStep.runningColor[0] * (1 - supportStep.coverageAlpha);
  const freePreservationRed =
    supportStep.sourceColor[0] * supportStep.colorAlpha + firstStep.runningColor[0] * (1 - supportStep.colorAlpha);
  assert.ok(
    supportStep.sourceFrontierRunningColorAuthorityBefore > 0.75,
    `selected foreground should establish source color authority before broad support, saw ${supportStep.sourceFrontierRunningColorAuthorityBefore}`,
  );
  assert.ok(
    supportStep.colorOcclusionAlpha <= supportStep.colorAlpha + 0.001,
    `selected source authority should prevent broad support from reclaiming extra color occlusion: color ${supportStep.colorAlpha}, occlusion ${supportStep.colorOcclusionAlpha}`,
  );
  assert.ok(
    supportStep.colorOcclusionAlpha < supportStep.coverageAlpha,
    `expected support occlusion to stay below full alpha wipe: occlusion ${supportStep.colorOcclusionAlpha}, coverage ${supportStep.coverageAlpha}`,
  );
  assert.ok(
    record.finalColorAccumulation.outputColor[0] > fullCoverageWipeRed,
    `support alpha should not fall back to full coverage dark wipe: full wipe ${fullCoverageWipeRed}, final ${record.finalColorAccumulation.outputColor[0]}`,
  );
  assert.ok(
    record.finalColorAccumulation.outputColor[0] <= freePreservationRed + EPSILON,
    `support alpha should not exceed authorized selected-color preservation: free preservation ${freePreservationRed}, final ${record.finalColorAccumulation.outputColor[0]}`,
  );
});

test("source-frontier dull support preserves selected color authority while sealing alpha", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const selectedForeground = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 930,
    originalId: 930,
    viewRank: 0,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 9,
    coverageWeight: 1,
    centerPx: [anchor.x + 0.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.55,
  });
  const lateDullSupport = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 931,
    originalId: 931,
    viewRank: 1,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 8,
    coverageWeight: 0.95,
    centerPx: [anchor.x + 1.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.85,
  });
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [selectedForeground, lateDullSupport],
    sourceColors: new Map([
      [selectedForeground.splatIndex, [0.95, 0.78, 0.52]],
      [lateDullSupport.splatIndex, [0.25, 0.18, 0.12]],
    ]),
    retainedContributors: [selectedForeground, lateDullSupport],
    preserveContributorOrder: true,
    tileSizePx: 16,
    tileColumns: 216,
  });
  const firstStep = record.finalColorAccumulation.steps[0];
  const supportStep = record.finalColorAccumulation.steps[1];
  const firstLuma = luma(firstStep.runningColor);
  const supportLuma = luma(supportStep.sourceColor);
  const outputLuma = luma(record.finalColorAccumulation.outputColor);

  assert.equal(supportStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    record.finalColorAccumulation.remainingTransmittance < 0.001,
    `late support should still seal alpha, saw remaining transmittance ${record.finalColorAccumulation.remainingTransmittance}`,
  );
  assert.ok(
    supportLuma > firstLuma * 0.2 && supportLuma < firstLuma * 0.5,
    `fixture must expose color-bearing dull support after selected color arrives: support luma ${supportLuma}, selected luma ${firstLuma}`,
  );
  assert.ok(
    supportStep.colorOcclusionAlpha <= supportStep.colorAlpha + 0.001,
    `once selected source color is established, support-only alpha must not keep extra color occlusion authority: color ${supportStep.colorAlpha}, occlusion ${supportStep.colorOcclusionAlpha}`,
  );
  assert.ok(
    outputLuma > firstLuma * 0.83,
    `dull support should not suppress selected color authority: first luma ${firstLuma}, output luma ${outputLuma}`,
  );
});

test("source-frontier support-only layers cannot erase selected color authority before late support occlusion", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const selectedForegrounds = Array.from({ length: 3 }, (_, index) =>
    accumulationContributor({
      anchor,
      tileIndex: tileIndexForAnchor(anchor),
      splatIndex: 940 + index,
      originalId: 940 + index,
      viewRank: index,
      sourceRole: "foreground-sealing",
      role: "foreground-sealing",
      candidateSourceClassMask: 9,
      coverageWeight: 0.82,
      centerPx: [anchor.x + 0.5 + index * 0.1, anchor.y + 0.5],
      inverseConic: [1, 0, 1],
      opacity: 0.34,
    }),
  );
  const interveningDullSupports = Array.from({ length: 8 }, (_, index) =>
    accumulationContributor({
      anchor,
      tileIndex: tileIndexForAnchor(anchor),
      splatIndex: 960 + index,
      originalId: 960 + index,
      viewRank: selectedForegrounds.length + index,
      sourceRole: "foreground-sealing",
      role: "foreground-sealing",
      candidateSourceClassMask: 8,
      coverageWeight: 0.9,
      centerPx: [anchor.x + 1.1 + index * 0.05, anchor.y + 0.5],
      inverseConic: [1, 0, 1],
      opacity: 0.42,
    }),
  );
  const lateDullSupport = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 950,
    originalId: 950,
    viewRank: selectedForegrounds.length + interveningDullSupports.length,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 8,
    coverageWeight: 0.95,
    centerPx: [anchor.x + 1.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.85,
  });
  const contributors = [...selectedForegrounds, ...interveningDullSupports, lateDullSupport];
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors,
    sourceColors: new Map([
      ...selectedForegrounds.map((contributor) => [contributor.splatIndex, [0.95, 0.78, 0.52]]),
      ...interveningDullSupports.map((contributor) => [contributor.splatIndex, [0.24, 0.17, 0.11]]),
      [lateDullSupport.splatIndex, [0.25, 0.18, 0.12]],
    ]),
    retainedContributors: contributors,
    preserveContributorOrder: true,
    tileSizePx: 16,
    tileColumns: 216,
  });
  const supportStep = record.finalColorAccumulation.steps.at(-1);

  assert.equal(supportStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    supportStep.sourceFrontierRunningColorAuthorityBefore > 0.55,
    `support-only layers must not erase selected color authority before late support, saw ${supportStep.sourceFrontierRunningColorAuthorityBefore}`,
  );
  assert.ok(
    supportStep.colorOcclusionAlpha <= supportStep.colorAlpha + 0.02,
    `late support should not regain extra color occlusion authority after cumulative selected source color: color ${supportStep.colorAlpha}, occlusion ${supportStep.colorOcclusionAlpha}`,
  );
});

test("source-frontier coverage-class color establishes authority before dull support occlusion", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const coverageSource = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 970,
    originalId: 970,
    viewRank: 0,
    sourceRole: "porous-surface",
    role: "porous-surface",
    candidateSourceClassMask: 4,
    coverageWeight: 1,
    centerPx: [anchor.x + 0.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.56,
  });
  const lateDullSupport = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 971,
    originalId: 971,
    viewRank: 1,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 8,
    coverageWeight: 0.95,
    centerPx: [anchor.x + 1.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.85,
  });
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [coverageSource, lateDullSupport],
    sourceColors: new Map([
      [coverageSource.splatIndex, [0.62, 0.36, 0.19]],
      [lateDullSupport.splatIndex, [0.16, 0.11, 0.08]],
    ]),
    retainedContributors: [coverageSource, lateDullSupport],
    preserveContributorOrder: true,
    tileSizePx: 16,
    tileColumns: 216,
  });
  const coverageStep = record.finalColorAccumulation.steps[0];
  const supportStep = record.finalColorAccumulation.steps[1];
  const coverageLuma = luma(coverageStep.runningColor);
  const supportLuma = luma(supportStep.sourceColor);
  const outputLuma = luma(record.finalColorAccumulation.outputColor);

  assert.equal(supportStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    record.finalColorAccumulation.remainingTransmittance < 0.001,
    `late support should still seal alpha after coverage color, saw remaining transmittance ${record.finalColorAccumulation.remainingTransmittance}`,
  );
  assert.ok(
    supportLuma < coverageLuma * 0.55,
    `fixture must expose dull support after coverage color arrives: support ${supportLuma}, coverage ${coverageLuma}`,
  );
  assert.ok(
    coverageStep.sourceFrontierRunningColorAuthorityAfter > 0.35,
    `coverage-class color must establish source color authority, saw ${coverageStep.sourceFrontierRunningColorAuthorityAfter}`,
  );
  assert.ok(
    supportStep.sourceFrontierRunningColorAuthorityBefore > 0.35,
    `support-only tail must see coverage-source color authority, saw ${supportStep.sourceFrontierRunningColorAuthorityBefore}`,
  );
  assert.ok(
    supportStep.colorOcclusionAlpha <= supportStep.colorAlpha + 0.02,
    `dull support should not regain extra color occlusion authority after coverage-source color: color ${supportStep.colorAlpha}, occlusion ${supportStep.colorOcclusionAlpha}`,
  );
  assert.ok(
    outputLuma > coverageLuma * 0.75,
    `dull support should not suppress coverage-source color authority: coverage ${coverageLuma}, output ${outputLuma}`,
  );
});

test("source-frontier coverage-class source color uses its support footprint for RGB transfer", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const coverageSource = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 972,
    originalId: 972,
    viewRank: 0,
    sourceRole: "porous-surface",
    role: "porous-surface",
    candidateSourceClassMask: 4,
    coverageWeight: 1,
    centerPx: [anchor.x + 1.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.62,
  });
  const lateAlphaSupport = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 973,
    originalId: 973,
    viewRank: 1,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 8,
    coverageWeight: 0.95,
    centerPx: [anchor.x + 1.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.85,
  });
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [coverageSource, lateAlphaSupport],
    sourceColors: new Map([
      [coverageSource.splatIndex, [1, 0.84, 0.45]],
      [lateAlphaSupport.splatIndex, [0.08, 0.06, 0.04]],
    ]),
    retainedContributors: [coverageSource, lateAlphaSupport],
    preserveContributorOrder: true,
    tileSizePx: 16,
    tileColumns: 216,
  });
  const coverageStep = record.finalColorAccumulation.steps[0];
  const supportStep = record.finalColorAccumulation.steps[1];
  const sourceLuma = luma(coverageStep.sourceColor);
  const contributionLuma = luma(coverageStep.contributionColor);
  const outputLuma = luma(record.finalColorAccumulation.outputColor);

  assert.equal(supportStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    coverageStep.sourceFrontierSupportPixelWeight > coverageStep.coverageWeight * 3,
    `fixture must expose broad coverage-source support footprint: support ${coverageStep.sourceFrontierSupportPixelWeight}, pixel ${coverageStep.coverageWeight}`,
  );
  assert.ok(
    coverageStep.colorTransferWeight >= coverageStep.sourceFrontierSupportPixelWeight * 0.5,
    `coverage-source RGB transfer should use support footprint, not only tiny pixel coverage: color transfer ${coverageStep.colorTransferWeight}, support ${coverageStep.sourceFrontierSupportPixelWeight}`,
  );
  assert.ok(
    contributionLuma >= sourceLuma * 0.2,
    `coverage-source contribution should not be underpowered before alpha support arrives: source ${sourceLuma}, contribution ${contributionLuma}`,
  );
  assert.ok(
    outputLuma > contributionLuma * 0.85,
    `late support should not erase coverage-source RGB transfer: contribution ${contributionLuma}, output ${outputLuma}`,
  );
});

test("source-frontier composite coverage masks mirror live RGB transfer law", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const coverageRetentionSource = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 974,
    originalId: 974,
    viewRank: 0,
    sourceRole: "porous-surface",
    role: "porous-surface",
    candidateSourceClassMask: 5,
    coverageWeight: 1,
    centerPx: [anchor.x + 1.45, anchor.y + 0.45],
    inverseConic: [1, 0, 1],
    opacity: 0.58,
  });
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [coverageRetentionSource],
    sourceColors: new Map([[coverageRetentionSource.splatIndex, [1, 0.78, 0.38]]]),
    retainedContributors: [coverageRetentionSource],
    preserveContributorOrder: true,
    tileSizePx: 16,
    tileColumns: 216,
  });
  const step = record.finalColorAccumulation.steps[0];

  assert.equal(step.candidateSourceClassMask, 5);
  assert.equal(step.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    step.alphaTransferWeight > step.coverageWeight * 2,
    `fixture must exercise foreground alpha support for a composite coverage mask: alpha ${step.alphaTransferWeight}, pixel ${step.coverageWeight}`,
  );
  assert.ok(
    step.colorTransferWeight >= step.alphaTransferWeight * 0.99,
    `coverage-bit RGB transfer should mirror live law and use alpha/support transfer, not bounded support color: color ${step.colorTransferWeight}, alpha ${step.alphaTransferWeight}`,
  );
});

test("source-frontier near-black support cannot extinguish selected color authority while sealing alpha", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const selectedForeground = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 934,
    originalId: 934,
    viewRank: 0,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 9,
    coverageWeight: 1,
    centerPx: [anchor.x + 0.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.55,
  });
  const lateNearBlackSupport = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 935,
    originalId: 935,
    viewRank: 1,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 8,
    coverageWeight: 0.95,
    centerPx: [anchor.x + 1.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.85,
  });
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [selectedForeground, lateNearBlackSupport],
    sourceColors: new Map([
      [selectedForeground.splatIndex, [0.95, 0.78, 0.52]],
      [lateNearBlackSupport.splatIndex, [0.01, 0.01, 0.01]],
    ]),
    retainedContributors: [selectedForeground, lateNearBlackSupport],
    preserveContributorOrder: true,
    tileSizePx: 16,
    tileColumns: 216,
  });
  const firstStep = record.finalColorAccumulation.steps[0];
  const supportStep = record.finalColorAccumulation.steps[1];
  const firstLuma = luma(firstStep.runningColor);
  const supportLuma = luma(supportStep.sourceColor);
  const outputLuma = luma(record.finalColorAccumulation.outputColor);

  assert.equal(supportStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    record.finalColorAccumulation.remainingTransmittance < 0.001,
    `near-black support should still seal alpha, saw remaining transmittance ${record.finalColorAccumulation.remainingTransmittance}`,
  );
  assert.ok(
    supportLuma < firstLuma * 0.05,
    `fixture must expose near-black support after selected color arrives: support luma ${supportLuma}, selected luma ${firstLuma}`,
  );
  assert.ok(
    outputLuma > firstLuma * 0.65,
    `near-black support should not extinguish selected color authority: first luma ${firstLuma}, output luma ${outputLuma}`,
  );
});

test("source-frontier bright support cannot contaminate selected color authority while sealing alpha", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const selectedForeground = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 932,
    originalId: 932,
    viewRank: 0,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 9,
    coverageWeight: 1,
    centerPx: [anchor.x + 0.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.62,
  });
  const latePlateColoredSupport = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 933,
    originalId: 933,
    viewRank: 1,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 8,
    coverageWeight: 0.95,
    centerPx: [anchor.x + 1.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.85,
  });
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [selectedForeground, latePlateColoredSupport],
    sourceColors: new Map([
      [selectedForeground.splatIndex, [0.58, 0.34, 0.18]],
      [latePlateColoredSupport.splatIndex, [1, 0.96, 0.86]],
    ]),
    retainedContributors: [selectedForeground, latePlateColoredSupport],
    preserveContributorOrder: true,
    tileSizePx: 16,
    tileColumns: 216,
  });
  const firstStep = record.finalColorAccumulation.steps[0];
  const supportStep = record.finalColorAccumulation.steps[1];
  const firstLuma = luma(firstStep.runningColor);
  const supportLuma = luma(supportStep.sourceColor);
  const outputLuma = luma(record.finalColorAccumulation.outputColor);

  assert.equal(supportStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    record.finalColorAccumulation.remainingTransmittance < 0.001,
    `late bright support should still seal alpha, saw remaining transmittance ${record.finalColorAccumulation.remainingTransmittance}`,
  );
  assert.ok(
    supportLuma > firstLuma * 1.8,
    `fixture must expose plate-colored support after selected color arrives: support luma ${supportLuma}, selected luma ${firstLuma}`,
  );
  assert.ok(
    supportStep.sourceFrontierRunningColorAuthorityBefore > 0.35,
    `fixture must enter late bright support with selected-source color authority, saw ${supportStep.sourceFrontierRunningColorAuthorityBefore}`,
  );
  assert.ok(
    supportStep.sourceFrontierColorAuthority <= 0.25,
    `plate-colored support-only color authority should stay strongly throttled after selected-source authority: ${supportStep.sourceFrontierColorAuthority}`,
  );
  assert.ok(
    outputLuma < firstLuma * 1.65,
    `bright support should not contaminate selected color authority: first luma ${firstLuma}, output luma ${outputLuma}`,
  );
});

test("source-frontier retention-only late bright support cannot claim selected color authority", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const retainedForeground = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 936,
    originalId: 936,
    viewRank: 0,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 1,
    coverageWeight: 0.9,
    centerPx: [anchor.x + 0.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.5,
  });
  const latePlateColoredRetention = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 937,
    originalId: 937,
    viewRank: 1,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 1,
    coverageWeight: 0.95,
    centerPx: [anchor.x + 1.4, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.8,
  });
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [retainedForeground, latePlateColoredRetention],
    sourceColors: new Map([
      [retainedForeground.splatIndex, [0.34, 0.23, 0.16]],
      [latePlateColoredRetention.splatIndex, [1, 0.97, 0.88]],
    ]),
    retainedContributors: [retainedForeground, latePlateColoredRetention],
    preserveContributorOrder: true,
    tileSizePx: 16,
    tileColumns: 216,
  });
  const firstStep = record.finalColorAccumulation.steps[0];
  const retentionStep = record.finalColorAccumulation.steps[1];
  const firstLuma = luma(firstStep.runningColor);
  const retentionLuma = luma(retentionStep.sourceColor);
  const outputLuma = luma(record.finalColorAccumulation.outputColor);

  assert.equal(retentionStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    record.finalColorAccumulation.remainingTransmittance < 0.001,
    `late retained support should still seal alpha, saw remaining transmittance ${record.finalColorAccumulation.remainingTransmittance}`,
  );
  assert.ok(
    retentionLuma > firstLuma * 2.2,
    `fixture must expose plate-colored retention-only support after retained color arrives: retention ${retentionLuma}, first ${firstLuma}`,
  );
  assert.ok(
    retentionStep.sourceFrontierColorAuthority < 0.35,
    `retention-only support must not inherit selected color authority: ${retentionStep.sourceFrontierColorAuthority}`,
  );
  assert.ok(
    outputLuma < firstLuma * 2,
    `retention-only support should not flood prior retained color: first ${firstLuma}, output ${outputLuma}`,
  );
});

test("source-frontier support alpha attenuates stale bright color through the alpha/color mass gap", () => {
  const anchor = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0];
  const staleBrightLayer = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 920,
    originalId: 920,
    viewRank: 0,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 8,
    coverageWeight: 1,
    centerPx: [anchor.x + 0.5, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.6,
  });
  const broadDarkSupport = accumulationContributor({
    anchor,
    tileIndex: tileIndexForAnchor(anchor),
    splatIndex: 921,
    originalId: 921,
    viewRank: 1,
    sourceRole: "foreground-sealing",
    role: "foreground-sealing",
    candidateSourceClassMask: 8,
    coverageWeight: 0.95,
    centerPx: [anchor.x + 3, anchor.y + 0.5],
    inverseConic: [1, 0, 1],
    opacity: 0.85,
  });
  const record = buildFinalColorAccumulationTraceRecord({
    anchorPixel: anchor,
    contributors: [staleBrightLayer, broadDarkSupport],
    sourceColors: new Map([
      [staleBrightLayer.splatIndex, [1, 0.96, 0.9]],
      [broadDarkSupport.splatIndex, [0.04, 0.035, 0.03]],
    ]),
    retainedContributors: [staleBrightLayer, broadDarkSupport],
    preserveContributorOrder: true,
    tileSizePx: 16,
    tileColumns: 216,
  });
  const firstStep = record.finalColorAccumulation.steps[0];
  const supportStep = record.finalColorAccumulation.steps[1];
  const alphaColorGap = supportStep.coverageAlpha - supportStep.colorAlpha;
  const maximumFreePreservation = firstStep.runningColor[0] * (1 - alphaColorGap * 0.25);

  assert.equal(supportStep.sourceFrontierAlphaSupport, "foreground-spatial-support");
  assert.ok(
    alphaColorGap > 0.3,
    `expected fixture to expose a large alpha/color mass gap: coverage ${supportStep.coverageAlpha}, color ${supportStep.colorAlpha}`,
  );
  assert.ok(
    record.finalColorAccumulation.outputColor[0] < maximumFreePreservation,
    `support alpha should attenuate stale bright color through the mass gap: first ${firstStep.runningColor[0]}, final ${record.finalColorAccumulation.outputColor[0]}, gap ${alphaColorGap}, max free preservation ${maximumFreePreservation}`,
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

function luma(color) {
  return color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
}
