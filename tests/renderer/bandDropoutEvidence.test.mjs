import assert from "node:assert/strict";
import test from "node:test";

import {
  BLACK_BAND_TRACE_ANCHOR,
  buildBandDispatchCacheTrace,
  classifyBandDropoutMechanism,
} from "../../src/rendererFidelityProbes/bandOrderTrace.js";

const BAND_TILE = {
  tileSizePx: 16,
  tileX: 143,
  tileY: 65,
  tileIndex: 14183,
  localX: 12,
  localY: 15,
};

test("band dropout classifier selects dispatch/cache when the row or tile was not composited this frame", () => {
  const verdict = classifyBandDropoutMechanism({
    anchorPixel: BLACK_BAND_TRACE_ANCHOR,
    tileAddress: BAND_TILE,
    dispatchCache: buildBandDispatchCacheTrace({
      currentFrameId: 7,
      clearFrameId: 7,
      buildFrameId: 7,
      compositeFrameId: 6,
      cacheState: "stale-cache",
    }),
    orderedContributors: [orderedContributor()],
    finalColorAccumulation: accumulatedColor({ coverageAlpha: 0.4, outputAlpha: 0.4 }),
  });

  assert.deepEqual(verdict, {
    classification: "dispatch-cache",
    provisional: false,
    reason: "band tile 14183 or row 65 was not cleared/built/composited for the current frame",
    affectedRows: [65],
    affectedTiles: [14183],
    evidence: {
      orderedCount: 1,
      finalStepCount: 1,
      outputAlpha: 0.4,
      maxCoverageAlpha: 0.4,
      dispatchCurrentFrameComplete: false,
    },
  });
});

test("band dropout classifier selects order/rank when final accumulation diverges from ordered contributors", () => {
  const verdict = classifyBandDropoutMechanism({
    anchorPixel: BLACK_BAND_TRACE_ANCHOR,
    tileAddress: BAND_TILE,
    dispatchCache: currentDispatch(),
    orderedContributors: [
      orderedContributor({ splatIndex: 87386, originalId: 87386, orderIndex: 0, viewRank: 75720 }),
      orderedContributor({ splatIndex: 87369, originalId: 87369, orderIndex: 1, viewRank: 79126 }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({ splatIndex: 87369, originalId: 87369, orderIndex: 0, coverageAlpha: 0.2 }),
        accumulationStep({ splatIndex: 87386, originalId: 87386, orderIndex: 1, coverageAlpha: 0.3 }),
      ],
      outputColor: [0.2, 0.2, 0.2, 0.44],
    },
  });

  assert.equal(verdict.classification, "order-rank");
  assert.equal(verdict.reason, "band final accumulation order diverges from ordered contributor ranks");
  assert.deepEqual(verdict.affectedRows, [65]);
  assert.deepEqual(verdict.affectedTiles, [14183]);
  assert.deepEqual(verdict.evidence.orderedSplatIds, [87386, 87369]);
  assert.deepEqual(verdict.evidence.accumulatedSplatIds, [87369, 87386]);
});

test("band dropout classifier selects final accumulation when ordered support is present but steps are absent", () => {
  const verdict = classifyBandDropoutMechanism({
    anchorPixel: BLACK_BAND_TRACE_ANCHOR,
    tileAddress: BAND_TILE,
    dispatchCache: currentDispatch(),
    orderedContributors: [orderedContributor()],
    finalColorAccumulation: {
      steps: [],
      outputColor: [0.02, 0.02, 0.04, 0],
    },
  });

  assert.equal(verdict.classification, "final-accumulation");
  assert.equal(verdict.reason, "band ordered contributors are present but no final accumulation steps were emitted");
  assert.deepEqual(verdict.affectedRows, [65]);
  assert.deepEqual(verdict.affectedTiles, [14183]);
  assert.equal(verdict.evidence.orderedCount, 1);
  assert.equal(verdict.evidence.finalStepCount, 0);
});

test("band dropout classifier preserves the prior black-band trace as conic/alpha under-accumulation and provisional on GPU-live extraction", () => {
  const verdict = classifyBandDropoutMechanism({
    anchorPixel: BLACK_BAND_TRACE_ANCHOR,
    tileAddress: BAND_TILE,
    dispatchCache: currentDispatch(),
    traceSource: "cpu-prior-trace",
    gpuLiveTraceAvailable: false,
    orderedContributors: [
      orderedContributor({ splatIndex: 87386, originalId: 87386, orderIndex: 0, viewRank: 75720 }),
      orderedContributor({ splatIndex: 87369, originalId: 87369, orderIndex: 1, viewRank: 79126 }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({
          splatIndex: 87386,
          originalId: 87386,
          orderIndex: 0,
          coverageWeight: 0.000000096672,
          coverageAlpha: 0.000000019,
        }),
        accumulationStep({
          splatIndex: 87369,
          originalId: 87369,
          orderIndex: 1,
          coverageWeight: 0.000000335647,
          coverageAlpha: 0.00000015435,
        }),
      ],
      outputColor: [0.020000064731, 0.020000051389, 0.04000003882, 0.00000017335],
    },
  });

  assert.deepEqual(verdict, {
    classification: "conic-alpha-side-effect",
    provisional: true,
    reason:
      "band contributors reached current-frame accumulation, but max coverage alpha 1.5435e-7 leaves output alpha 1.7335e-7",
    affectedRows: [65],
    affectedTiles: [14183],
    blocker: "gpu-live-trace-extraction",
    evidence: {
      orderedCount: 2,
      finalStepCount: 2,
      outputAlpha: 0.00000017335,
      maxCoverageAlpha: 0.00000015435,
      maxCoverageWeight: 0.000000335647,
      dispatchCurrentFrameComplete: true,
      traceSource: "cpu-prior-trace",
    },
  });
});

function currentDispatch() {
  return buildBandDispatchCacheTrace({
    currentFrameId: 1,
    clearFrameId: 1,
    buildFrameId: 1,
    compositeFrameId: 1,
    cacheState: "current",
  });
}

function orderedContributor(overrides = {}) {
  return {
    splatIndex: 87386,
    originalId: 87386,
    orderIndex: 0,
    viewRank: 75720,
    viewDepth: -0.5866499543190002,
    ...overrides,
  };
}

function accumulationStep(overrides = {}) {
  return {
    splatIndex: 87386,
    originalId: 87386,
    orderIndex: 0,
    coverageWeight: 0.25,
    coverageAlpha: 0.2,
    ...overrides,
  };
}

function accumulatedColor({ coverageAlpha, outputAlpha }) {
  return {
    steps: [accumulationStep({ coverageAlpha })],
    outputColor: [0.1, 0.1, 0.1, outputAlpha],
  };
}
