import assert from "node:assert/strict";
import test from "node:test";

import {
  GPU_LIVE_LACUNAR_ANCHORS,
  classifyLacunarOcclusionMechanism,
  describeLacunarOcclusionLedgerContract,
} from "../../src/rendererFidelityProbes/lacunarOcclusionLedger.js";

test("contract keeps lacunar occlusion separate from black-band repair and global tuning", () => {
  assert.deepEqual(describeLacunarOcclusionLedgerContract(), {
    consumes: [
      "gpu-live-trace:per-pixel-projected-contributors",
      "gpu-live-trace:per-pixel-retained-contributors",
      "gpu-live-trace:per-pixel-ordered-contributors",
      "gpu-live-trace:per-pixel-final-color-accumulation",
      "lacunar-prior:synthetic-final-color-oracle",
    ],
    anchorIds: [
      "lacunar-hole-dessert-1260-930",
      "dense-foreground-leak-1580-1260",
    ],
    categories: [
      "blocked-missing-gpu-live-pixel-trace",
      "source-sparsity",
      "missing-retained-support",
      "conic-underfill",
      "weak-alpha-coverage-transfer",
      "order-or-compositor-failure",
      "support-sufficient",
    ],
    separatesFrom: [
      "black-band-row-dropout-ledger",
      "global-opacity-scale-tuning",
      "source-decode",
      "urmina-backend-construction",
    ],
  });
});

test("real GPU-live anchors stay provisional while pixel-local trace fields are absent", () => {
  const verdict = classifyLacunarOcclusionMechanism({
    anchor: GPU_LIVE_LACUNAR_ANCHORS["dense-foreground-leak-1580-1260"],
    pixelTrace: {
      projectedContributors: [{ id: "crop-support", role: "dense-foreground" }],
    },
  });

  assert.equal(verdict.status, "blocked");
  assert.equal(verdict.category, "blocked-missing-gpu-live-pixel-trace");
  assert.equal(verdict.provisional, true);
  assert.deepEqual(verdict.missingFields, [
    "retainedContributors",
    "orderedContributors",
    "finalColorAccumulation",
  ]);
  assert.equal(verdict.anchor.id, "dense-foreground-leak-1580-1260");
  assert.equal(verdict.anchor.cropProjectedSupport, 5071);
  assert.match(verdict.explanation, /pixel-local/);
});

test("classifies a lacunar hole as source sparsity when no foreground projects at the pixel", () => {
  const verdict = classifyLacunarOcclusionMechanism({
    pixelTrace: {
      projectedContributors: [
        { id: "plate-0", role: "bright-behind" },
      ],
      retainedContributors: [
        { id: "plate-0", role: "bright-behind" },
      ],
      orderedContributors: [
        { id: "plate-0", role: "bright-behind" },
      ],
      finalColorAccumulation: [
        { id: "plate-0", role: "bright-behind", alphaContribution: 0.35, conicWeight: 0.9 },
      ],
    },
  });

  assert.equal(verdict.status, "classified");
  assert.equal(verdict.category, "source-sparsity");
  assert.equal(verdict.mechanism, "no-projected-foreground-support");
  assert.equal(verdict.counts.projectedForeground, 0);
  assert.equal(verdict.counts.projectedBehind, 1);
});

test("classifies missing retained support before blaming alpha or conic transfer", () => {
  const verdict = classifyLacunarOcclusionMechanism({
    pixelTrace: {
      projectedContributors: [
        { id: "front-0", role: "dense-foreground" },
        { id: "plate-0", role: "bright-behind" },
      ],
      retainedContributors: [
        { id: "plate-0", role: "bright-behind" },
      ],
      orderedContributors: [
        { id: "plate-0", role: "bright-behind" },
      ],
      finalColorAccumulation: [
        { id: "plate-0", role: "bright-behind", alphaContribution: 0.42, conicWeight: 0.8 },
      ],
    },
  });

  assert.equal(verdict.category, "missing-retained-support");
  assert.equal(verdict.mechanism, "projected-foreground-missing-from-retained-list");
  assert.deepEqual(verdict.ids.projectedForeground, ["front-0"]);
  assert.deepEqual(verdict.ids.retainedForeground, []);
});

test("classifies conic underfill when retained foreground support misses the sample", () => {
  const verdict = classifyLacunarOcclusionMechanism({
    minForegroundSampleSupport: 0.05,
    pixelTrace: {
      projectedContributors: [
        { id: "front-0", role: "dense-foreground" },
        { id: "front-1", role: "dense-foreground" },
        { id: "plate-0", role: "bright-behind" },
      ],
      retainedContributors: [
        { id: "front-0", role: "dense-foreground" },
        { id: "front-1", role: "dense-foreground" },
        { id: "plate-0", role: "bright-behind" },
      ],
      orderedContributors: [
        { id: "plate-0", role: "bright-behind" },
        { id: "front-0", role: "dense-foreground" },
        { id: "front-1", role: "dense-foreground" },
      ],
      finalColorAccumulation: [
        { id: "front-0", role: "dense-foreground", coverageWeight: 0.4, conicWeight: 0.01, alphaContribution: 0.003 },
        { id: "front-1", role: "dense-foreground", coverageWeight: 0.4, conicWeight: 0.01, alphaContribution: 0.003 },
        { id: "plate-0", role: "bright-behind", coverageWeight: 0.7, conicWeight: 0.9, alphaContribution: 0.36 },
      ],
    },
  });

  assert.equal(verdict.category, "conic-underfill");
  assert.equal(verdict.mechanism, "retained-foreground-sample-support-below-threshold");
  assert.equal(verdict.metrics.foregroundSampleSupport, 0.008);
  assert.equal(verdict.metrics.minForegroundSampleSupport, 0.05);
});

test("classifies weak alpha transfer when foreground samples strongly but remains transparent", () => {
  const verdict = classifyLacunarOcclusionMechanism({
    minForegroundSampleSupport: 0.05,
    minForegroundAlpha: 0.6,
    minBehindLeakAlpha: 0.1,
    pixelTrace: {
      projectedContributors: [
        { id: "front-0", role: "dense-foreground" },
        { id: "front-1", role: "dense-foreground" },
        { id: "plate-0", role: "bright-behind" },
      ],
      retainedContributors: [
        { id: "front-0", role: "dense-foreground" },
        { id: "front-1", role: "dense-foreground" },
        { id: "plate-0", role: "bright-behind" },
      ],
      orderedContributors: [
        { id: "plate-0", role: "bright-behind" },
        { id: "front-0", role: "dense-foreground" },
        { id: "front-1", role: "dense-foreground" },
      ],
      finalColorAccumulation: [
        { id: "front-0", role: "dense-foreground", coverageWeight: 1, conicWeight: 0.7, alphaContribution: 0.12 },
        { id: "front-1", role: "dense-foreground", coverageWeight: 1, conicWeight: 0.7, alphaContribution: 0.1 },
        { id: "plate-0", role: "bright-behind", coverageWeight: 0.7, conicWeight: 0.9, alphaContribution: 0.28 },
      ],
    },
  });

  assert.equal(verdict.category, "weak-alpha-coverage-transfer");
  assert.equal(verdict.mechanism, "foreground-support-present-but-alpha-below-opaque-reference");
  assert.equal(verdict.metrics.foregroundAlpha, 0.22);
  assert.equal(verdict.metrics.behindAlpha, 0.28);
});

test("classifies ordered foreground omitted from final accumulation as compositor or order failure", () => {
  const verdict = classifyLacunarOcclusionMechanism({
    pixelTrace: {
      projectedContributors: [
        { id: "front-0", role: "dense-foreground" },
        { id: "plate-0", role: "bright-behind" },
      ],
      retainedContributors: [
        { id: "front-0", role: "dense-foreground" },
        { id: "plate-0", role: "bright-behind" },
      ],
      orderedContributors: [
        { id: "plate-0", role: "bright-behind" },
        { id: "front-0", role: "dense-foreground" },
      ],
      finalColorAccumulation: [
        { id: "plate-0", role: "bright-behind", coverageWeight: 1, conicWeight: 1, alphaContribution: 0.5 },
      ],
    },
  });

  assert.equal(verdict.category, "order-or-compositor-failure");
  assert.equal(verdict.mechanism, "ordered-foreground-omitted-from-final-accumulation");
  assert.deepEqual(verdict.ids.orderedForeground, ["front-0"]);
  assert.deepEqual(verdict.ids.accumulatedForeground, []);
});
