import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFinalAccumulationTribunalLedger,
  classifyFinalAccumulationVerdict,
  describeFinalAccumulationTribunalContract,
} from "../../src/rendererFidelityProbes/finalAccumulationTribunal.js";

test("contract keeps final accumulation verdicts out of visual repair policy", () => {
  assert.deepEqual(describeFinalAccumulationTribunalContract(), {
    consumes: [
      "gpu-live-trace:per-pixel-ordered-contributors.orderedContributors",
      "gpu-live-trace:per-pixel-final-color-accumulation.steps",
      "gpu-live-trace:per-pixel-final-color-accumulation.outputColor",
    ],
    categories: [
      "ordered-skipped-in-accumulation",
      "near-zero-alpha-transfer",
      "accumulation-support-sufficient",
      "trace-blocked",
      "narrower-blocker",
    ],
    owns: [
      "ordered foreground contributor identity entering final accumulation",
      "per-step alpha/color transfer and transmittance accounting",
      "final trace output RGBA support classification for ordered-present anchors",
    ],
    separatesFrom: [
      "broad-compositor-replacement",
      "global-opacity-or-conic-tuning",
      "source-decode",
      "urmina-backend-construction",
      "retention-policy-repair",
      "production-deferred-gbuffer-voting",
      "camera-tile-or-cap-change",
      "visual-repair",
    ],
  });
});

test("classifies sufficient foreground accumulation while preserving final color evidence", () => {
  const verdict = classifyFinalAccumulationVerdict({
    anchorPixel: { id: "fresh-d", kind: "lacunar-hole", x: 1514, y: 1324 },
    orderedContributors: [
      orderedContributor({ originalId: 9201, splatIndex: 301, orderIndex: 0, coverageWeight: 0.48, opacity: 0.88, sourceColor: [0.92, 0.78, 0.58] }),
      orderedContributor({ originalId: 9202, splatIndex: 302, orderIndex: 1, viewDepth: 0.16, coverageWeight: 0.36, opacity: 0.82, sourceColor: [0.88, 0.74, 0.55] }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({
          originalId: 9201,
          splatIndex: 301,
          orderIndex: 0,
          coverageWeight: 0.52,
          tileCoverageWeight: 0.48,
          opacity: 0.88,
          coverageAlpha: 0.52,
          transmittanceBefore: 1,
          transmittanceAfter: 0.48,
          sourceColor: [0.92, 0.78, 0.58],
          contributionColor: [0.4784, 0.4056, 0.3016],
          runningColor: [0.488, 0.415, 0.322],
        }),
        accumulationStep({
          originalId: 9202,
          splatIndex: 302,
          orderIndex: 1,
          coverageWeight: 0.37,
          tileCoverageWeight: 0.36,
          opacity: 0.82,
          coverageAlpha: 0.37,
          transmittanceBefore: 0.48,
          transmittanceAfter: 0.3024,
          sourceColor: [0.88, 0.74, 0.55],
          contributionColor: [0.3256, 0.2738, 0.2035],
          runningColor: [0.633, 0.535, 0.406],
        }),
      ],
      outputColor: [0.633, 0.535, 0.406, 0.6976],
    },
  });

  assert.equal(verdict.status, "classified");
  assert.equal(verdict.category, "accumulation-support-sufficient");
  assert.equal(verdict.mechanism, "ordered-foreground-accumulates-with-sufficient-alpha-and-color");
  assert.deepEqual(verdict.ids.orderedForeground, ["9201", "9202"]);
  assert.deepEqual(verdict.ids.accumulatedForeground, ["9201", "9202"]);
  assert.equal(verdict.counts.orderedForeground, 2);
  assert.equal(verdict.metrics.outputAlpha, 0.6976);
  assert.equal(verdict.metrics.foregroundCoverageAlpha, 0.6976);
  assert.equal(verdict.metrics.foregroundContributionLuminance, 0.693305);
  assert.deepEqual(verdict.outputRgba, [0.633, 0.535, 0.406, 0.6976]);
  assert.deepEqual(verdict.foregroundContributors[1], {
    originalId: "9202",
    splatIndex: 302,
    role: "foreground-sealing",
    roleClass: "foreground",
    orderIndex: 1,
    viewRank: 1,
    viewDepth: 0.16,
    orderedCoverageWeight: 0.36,
    orderedOpacity: 0.82,
    finalCoverageWeight: 0.37,
    tileCoverageWeight: 0.36,
    finalOpacity: 0.82,
    coverageAlpha: 0.37,
    transmittanceBefore: 0.48,
    transmittanceAfter: 0.3024,
    sourceColor: [0.88, 0.74, 0.55],
    contributionColor: [0.3256, 0.2738, 0.2035],
    runningColor: [0.633, 0.535, 0.406],
    accumulationStatus: "accumulated",
    skipReason: null,
  });
});

test("classifies ordered foreground that reaches the order feed but is skipped in accumulation", () => {
  const verdict = classifyFinalAccumulationVerdict({
    anchorPixel: { id: "fresh-e", kind: "lacunar-hole", x: 1422, y: 1324 },
    orderedContributors: [
      orderedContributor({ originalId: 9301, splatIndex: 401, orderIndex: 0, coverageWeight: 0.5, opacity: 0.85 }),
      orderedContributor({ originalId: 9302, splatIndex: 402, orderIndex: 1, coverageWeight: 0.31, opacity: 0.8 }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({
          originalId: 9301,
          splatIndex: 401,
          orderIndex: 0,
          coverageWeight: 0,
          tileCoverageWeight: 0,
          opacity: 0.85,
          coverageAlpha: 0,
          accumulationStatus: "skipped-zero-tile-coverage",
          sourceColor: [0.9, 0.75, 0.55],
          contributionColor: [0, 0, 0],
          runningColor: [0.02, 0.02, 0.04],
        }),
      ],
      outputColor: [0.02, 0.02, 0.04, 0],
    },
  });

  assert.equal(verdict.category, "ordered-skipped-in-accumulation");
  assert.equal(verdict.mechanism, "ordered-foreground-has-no-effective-final-accumulation-step");
  assert.deepEqual(verdict.ids.skippedForeground, ["9301", "9302"]);
  assert.deepEqual(
    verdict.foregroundContributors.map((entry) => [entry.originalId, entry.accumulationStatus, entry.skipReason]),
    [
      ["9301", "skipped-zero-tile-coverage", "skipped-zero-tile-coverage"],
      ["9302", "missing-final-accumulation-step", "missing-final-accumulation-step"],
    ],
  );
});

test("classifies near-zero alpha transfer when ordered foreground contributes only trace dust", () => {
  const verdict = classifyFinalAccumulationVerdict({
    anchorPixel: { id: "fresh-f", kind: "lacunar-hole", x: 2134, y: 988 },
    orderedContributors: [
      orderedContributor({ originalId: 9401, splatIndex: 501, orderIndex: 0, coverageWeight: 0.42, opacity: 0.9 }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({
          originalId: 9401,
          splatIndex: 501,
          orderIndex: 0,
          coverageWeight: 0.001,
          tileCoverageWeight: 0.42,
          opacity: 0.9,
          coverageAlpha: 0.0009,
          transmittanceBefore: 1,
          transmittanceAfter: 0.9991,
          sourceColor: [0.86, 0.7, 0.5],
          contributionColor: [0.000774, 0.00063, 0.00045],
          runningColor: [0.020756, 0.020612, 0.040414],
        }),
      ],
      outputColor: [0.020756, 0.020612, 0.040414, 0.0009],
    },
  });

  assert.equal(verdict.category, "near-zero-alpha-transfer");
  assert.equal(verdict.mechanism, "ordered-foreground-accumulates-with-near-zero-alpha-or-color-transfer");
  assert.deepEqual(verdict.ids.nearZeroForeground, ["9401"]);
  assert.equal(verdict.metrics.foregroundCoverageAlpha, 0.0009);
  assert.equal(verdict.metrics.foregroundContributionLuminance, 0.000648);
});

test("reports trace-blocked when ordered or final accumulation surfaces are absent", () => {
  const verdict = classifyFinalAccumulationVerdict({
    anchorPixel: { id: "fresh-blocked", kind: "lacunar-hole", x: 1, y: 2 },
    orderedContributors: null,
    finalColorAccumulation: null,
  });

  assert.equal(verdict.status, "blocked");
  assert.equal(verdict.category, "trace-blocked");
  assert.deepEqual(verdict.blockers, [
    {
      field: "orderedContributors",
      reason: "ordered contributor trace is missing or not an array",
    },
    {
      field: "finalColorAccumulation",
      reason: "final accumulation trace is missing or malformed",
    },
  ]);
});

test("reports a narrower blocker when no ordered foreground support exists", () => {
  const verdict = classifyFinalAccumulationVerdict({
    anchorPixel: { id: "fresh-a", kind: "lacunar-hole", x: 1320, y: 846 },
    orderedContributors: [
      orderedContributor({ originalId: 1001, splatIndex: 1, role: "behind-surface", retentionBand: "behind", viewDepth: 0.9 }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({ originalId: 1001, splatIndex: 1, role: "behind-surface", coverageAlpha: 0.4 }),
      ],
      outputColor: [0.1, 0.1, 0.1, 0.4],
    },
  });

  assert.equal(verdict.category, "narrower-blocker");
  assert.equal(verdict.mechanism, "no-ordered-foreground-role-support");
  assert.equal(verdict.counts.orderedForeground, 0);
});

test("uses final steps as ordered-present identity when explicit ordered records are empty", () => {
  const verdict = classifyFinalAccumulationVerdict({
    anchorPixel: { id: "fresh-real", kind: "lacunar-hole", x: 1514, y: 1324 },
    projectedContributors: [
      orderedContributor({ originalId: 1, role: null, roleClass: null, retentionBand: "middle", viewDepth: -0.3 }),
      orderedContributor({ originalId: 2, role: null, roleClass: null, retentionBand: "middle", viewDepth: -0.1 }),
      orderedContributor({ originalId: 3, role: null, roleClass: null, retentionBand: "middle", viewDepth: 0.2 }),
    ],
    retainedContributors: [
      orderedContributor({ originalId: 1, role: null, roleClass: null, retentionBand: "middle", viewDepth: -0.3 }),
    ],
    orderedContributors: [],
    finalColorAccumulation: {
      steps: [
        accumulationStep({ originalId: 1, splatIndex: 1, role: null, roleClass: null, coverageAlpha: 0.33, contributionColor: [0.2, 0.16, 0.1] }),
      ],
      outputColor: [0.21, 0.17, 0.12, 0.33],
    },
  });

  assert.equal(verdict.category, "accumulation-support-sufficient");
  assert.equal(verdict.foregroundContributors[0].role, "foreground-depth-band");
  assert.deepEqual(verdict.ids.orderedForeground, ["1"]);
  assert.deepEqual(verdict.ids.accumulatedForeground, ["1"]);
});

test("builds a ledger over anchors and summarizes final accumulation verdicts", () => {
  const ledger = buildFinalAccumulationTribunalLedger([
    {
      anchorPixel: { id: "fresh-d", kind: "lacunar-hole", x: 1514, y: 1324 },
      orderedContributors: [orderedContributor({ originalId: 1 })],
      finalColorAccumulation: {
        steps: [accumulationStep({ originalId: 1, coverageAlpha: 0.4, contributionColor: [0.2, 0.15, 0.1] })],
        outputColor: [0.2, 0.15, 0.1, 0.4],
      },
    },
    {
      anchorPixel: { id: "fresh-e", kind: "lacunar-hole", x: 1422, y: 1324 },
      orderedContributors: [orderedContributor({ originalId: 2 })],
      finalColorAccumulation: {
        steps: [accumulationStep({ originalId: 2, coverageAlpha: 0.001, contributionColor: [0.001, 0.001, 0.001] })],
        outputColor: [0.021, 0.021, 0.041, 0.001],
      },
    },
    {
      anchorPixel: { id: "fresh-f", kind: "lacunar-hole", x: 2134, y: 988 },
      orderedContributors: [orderedContributor({ originalId: 3 })],
      finalColorAccumulation: {
        steps: [],
        outputColor: [0.02, 0.02, 0.04, 0],
      },
    },
  ]);

  assert.equal(ledger.status, "classified");
  assert.deepEqual(ledger.summary.categoryCounts, {
    "accumulation-support-sufficient": 1,
    "near-zero-alpha-transfer": 1,
    "ordered-skipped-in-accumulation": 1,
  });
  assert.deepEqual(
    ledger.anchorVerdicts.map((entry) => [entry.anchorPixel.id, entry.category]),
    [
      ["fresh-d", "accumulation-support-sufficient"],
      ["fresh-e", "near-zero-alpha-transfer"],
      ["fresh-f", "ordered-skipped-in-accumulation"],
    ],
  );
});

function orderedContributor(overrides = {}) {
  return {
    originalId: 9201,
    splatIndex: 301,
    role: "foreground-sealing",
    roleClass: "foreground",
    retentionBand: "front",
    orderIndex: 0,
    viewRank: overrides.orderIndex ?? 0,
    viewDepth: 0.14,
    coverageWeight: 0.48,
    opacity: 0.88,
    sourceColor: [0.92, 0.78, 0.58],
    ...overrides,
  };
}

function accumulationStep(overrides = {}) {
  return {
    originalId: 9201,
    splatIndex: 301,
    role: "foreground-sealing",
    roleClass: "foreground",
    orderIndex: 0,
    coverageWeight: 0.52,
    tileCoverageWeight: 0.48,
    opacity: 0.88,
    coverageAlpha: 0.52,
    transmittanceBefore: 1,
    transmittanceAfter: 0.48,
    sourceColor: [0.92, 0.78, 0.58],
    contributionColor: [0.4784, 0.4056, 0.3016],
    runningColor: [0.488, 0.415, 0.322],
    accumulationStatus: "accumulated",
    ...overrides,
  };
}
