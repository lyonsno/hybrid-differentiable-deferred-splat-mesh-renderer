import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRetainedToOrderedSurvivalLedger,
  classifyRetainedToOrderedSurvival,
  describeRetainedToOrderedSurvivalLedgerContract,
} from "../../src/rendererFidelityProbes/retainedToOrderedSurvivalLedger.js";

test("contract keeps retained-to-ordered survival evidence out of visual repair policy", () => {
  assert.deepEqual(describeRetainedToOrderedSurvivalLedgerContract(), {
    consumes: [
      "gpu-live-trace:per-pixel-retained-contributors.retainedContributors",
      "gpu-live-trace:per-pixel-ordered-contributors.orderedContributors",
      "gpu-live-trace:per-pixel-final-color-accumulation.steps",
    ],
    categories: [
      "ordered-present",
      "projected-foreground-dropped-before-retention",
      "retained-missing-from-order",
      "ordered-present-final-alpha-weak",
      "trace-blocked",
      "narrower-role-source-blocker",
    ],
    owns: [
      "projected foreground support lost before retained tile rows",
      "retained foreground contributor identity surviving into ordered output",
      "ordered rank/depth/tie-break custody for retained foreground contributors",
      "final accumulation alpha/RGB participation for retained foreground contributors",
    ],
    separatesFrom: [
      "retention-policy-repair",
      "visual-policy-repair",
      "global-opacity-scale-tuning",
      "tile-size-or-cap-change",
      "camera-or-projection-repair",
      "source-decode",
      "urmina-backend-construction",
      "deferred-gbuffer-voting",
    ],
  });
});

test("classifies retained foreground contributors omitted from ordered output", () => {
  const verdict = classifyRetainedToOrderedSurvival({
    anchorPixel: { id: "fresh-b", kind: "lacunar-hole", x: 1390, y: 870 },
    retainedContributors: [
      retainedContributor({ originalId: 9101, splatIndex: 101, viewRank: 4, viewDepth: 0.2, coverageWeight: 0.54, opacity: 0.9, sourceColor: [0.84, 0.72, 0.52] }),
      retainedContributor({ originalId: 9102, splatIndex: 102, viewRank: 5, viewDepth: 0.22, coverageWeight: 0.31, opacity: 0.8, sourceColor: [0.78, 0.66, 0.48] }),
      retainedContributor({ originalId: 4101, splatIndex: 201, role: "behind-surface", viewRank: 18, viewDepth: 0.71, coverageWeight: 0.08, opacity: 0.5, sourceColor: [0.2, 0.18, 0.22] }),
    ],
    orderedContributors: [
      orderedContributor({ originalId: 9101, splatIndex: 101, orderIndex: 0, viewRank: 4, viewDepth: 0.2, coverageWeight: 0.54, opacity: 0.9 }),
      orderedContributor({ originalId: 4101, splatIndex: 201, orderIndex: 1, viewRank: 18, viewDepth: 0.71, coverageWeight: 0.08, opacity: 0.5 }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({ originalId: 9101, splatIndex: 101, orderIndex: 0, coverageAlpha: 0.43, sourceColor: [0.84, 0.72, 0.52] }),
      ],
      outputColor: [0.39, 0.33, 0.24, 0.43],
    },
  });

  assert.equal(verdict.status, "classified");
  assert.equal(verdict.category, "retained-missing-from-order");
  assert.equal(verdict.mechanism, "retained-foreground-identity-omitted-from-ordered-output");
  assert.deepEqual(verdict.ids.retainedForeground, ["9101", "9102"]);
  assert.deepEqual(verdict.ids.missingFromOrder, ["9102"]);
  assert.deepEqual(verdict.ids.orderedForeground, ["9101"]);
  assert.deepEqual(verdict.ids.accumulatedForeground, ["9101"]);
  assert.equal(verdict.counts.retainedForeground, 2);
  assert.equal(verdict.counts.missingFromOrder, 1);
  assert.ok(verdict.metrics.missingForegroundOcclusionWeight > 0.2);
  assert.deepEqual(verdict.missingForeground[0], {
    originalId: "9102",
    splatIndex: 102,
    role: "foreground-sealing",
    roleClass: "foreground",
    retentionBand: "front",
    coverageWeight: 0.31,
    opacity: 0.8,
    occlusionWeight: 0.248,
    viewRank: 5,
    viewDepth: 0.22,
    sourceColor: [0.78, 0.66, 0.48],
  });
});

test("preserves ordered rank, depth, coverage, opacity, source color, and final alpha for retained foreground", () => {
  const verdict = classifyRetainedToOrderedSurvival({
    anchorPixel: { id: "fresh-d", kind: "lacunar-hole", x: 1514, y: 1324 },
    retainedContributors: [
      retainedContributor({ originalId: 9201, splatIndex: 301, viewRank: 2, viewDepth: 0.14, coverageWeight: 0.48, opacity: 0.88, sourceColor: [0.92, 0.78, 0.58] }),
      retainedContributor({ originalId: 9202, splatIndex: 302, viewRank: 3, viewDepth: 0.16, coverageWeight: 0.36, opacity: 0.82, sourceColor: [0.88, 0.74, 0.55] }),
    ],
    orderedContributors: [
      orderedContributor({ originalId: 9201, splatIndex: 301, orderIndex: 0, viewRank: 2, viewDepth: 0.14, coverageWeight: 0.48, opacity: 0.88, sourceColor: [0.92, 0.78, 0.58] }),
      orderedContributor({ originalId: 9202, splatIndex: 302, orderIndex: 1, viewRank: 3, viewDepth: 0.16, coverageWeight: 0.36, opacity: 0.82, sourceColor: [0.88, 0.74, 0.55] }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({ originalId: 9201, splatIndex: 301, orderIndex: 0, coverageAlpha: 0.52, sourceColor: [0.92, 0.78, 0.58] }),
        accumulationStep({ originalId: 9202, splatIndex: 302, orderIndex: 1, coverageAlpha: 0.37, sourceColor: [0.88, 0.74, 0.55] }),
      ],
      outputColor: [0.62, 0.52, 0.39, 0.7],
    },
  });

  assert.equal(verdict.category, "ordered-present");
  assert.equal(verdict.mechanism, "retained-foreground-identity-survives-to-final-accumulation");
  assert.equal(verdict.orderedForeground[1].orderIndex, 1);
  assert.equal(verdict.orderedForeground[1].viewRank, 3);
  assert.equal(verdict.orderedForeground[1].viewDepth, 0.16);
  assert.equal(verdict.orderedForeground[1].coverageWeight, 0.36);
  assert.equal(verdict.orderedForeground[1].opacity, 0.82);
  assert.deepEqual(verdict.orderedForeground[1].sourceColor, [0.88, 0.74, 0.55]);
  assert.equal(verdict.finalForeground[1].coverageAlpha, 0.37);
  assert.equal(verdict.metrics.finalForegroundAlpha, 0.7);
});

test("separates weak final alpha from ordering survival", () => {
  const verdict = classifyRetainedToOrderedSurvival({
    anchorPixel: { id: "fresh-e", kind: "lacunar-hole", x: 1422, y: 1324 },
    retainedContributors: [
      retainedContributor({ originalId: 9301, splatIndex: 401, viewRank: 7, viewDepth: 0.31, coverageWeight: 0.5, opacity: 0.85 }),
    ],
    orderedContributors: [
      orderedContributor({ originalId: 9301, splatIndex: 401, orderIndex: 0, viewRank: 7, viewDepth: 0.31, coverageWeight: 0.5, opacity: 0.85 }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({ originalId: 9301, splatIndex: 401, orderIndex: 0, coverageAlpha: 0.06 }),
      ],
      outputColor: [0.05, 0.04, 0.03, 0.06],
    },
  });

  assert.equal(verdict.category, "ordered-present-final-alpha-weak");
  assert.equal(verdict.mechanism, "retained-foreground-ordered-but-final-alpha-below-sealing-threshold");
  assert.deepEqual(verdict.ids.orderedForeground, ["9301"]);
  assert.equal(verdict.metrics.finalForegroundAlpha, 0.06);
});

test("keeps weak final alpha when dropped projected foreground is weaker than retained foreground", () => {
  const verdict = classifyRetainedToOrderedSurvival({
    anchorPixel: { id: "visual-gap-low-projected", kind: "plate-covered-tile-local-missing", x: 608, y: 312 },
    projectedContributors: [
      retainedContributor({ originalId: 9403, splatIndex: 503, viewRank: 1, viewDepth: 0.12, coverageWeight: 0.08, opacity: 0.3 }),
    ],
    retainedContributors: [
      retainedContributor({ originalId: 9301, splatIndex: 401, viewRank: 7, viewDepth: 0.31, coverageWeight: 0.5, opacity: 0.85 }),
    ],
    orderedContributors: [
      orderedContributor({ originalId: 9301, splatIndex: 401, orderIndex: 0, viewRank: 7, viewDepth: 0.31, coverageWeight: 0.5, opacity: 0.85 }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({ originalId: 9301, splatIndex: 401, orderIndex: 0, coverageAlpha: 0.06 }),
      ],
      outputColor: [0.05, 0.04, 0.03, 0.06],
    },
  });

  assert.equal(verdict.category, "ordered-present-final-alpha-weak");
  assert.equal(verdict.mechanism, "retained-foreground-ordered-but-final-alpha-below-sealing-threshold");
  assert.deepEqual(verdict.ids.projectedForegroundDroppedBeforeRetention, ["9403"]);
  assert.ok(
    verdict.metrics.projectedForegroundDroppedBeforeRetentionOcclusionWeight <
      verdict.metrics.retainedForegroundOcclusionWeight,
  );
});

test("classifies pixel-strong projected foreground dropped before retained rows ahead of weak alpha", () => {
  const verdict = classifyRetainedToOrderedSurvival({
    anchorPixel: { id: "visual-gap-2", kind: "plate-covered-tile-local-missing", x: 644, y: 304 },
    projectedContributors: [
      retainedContributor({ originalId: 9401, splatIndex: 501, viewRank: 1, viewDepth: 0.12, coverageWeight: 0.64, opacity: 0.9 }),
      retainedContributor({ originalId: 9402, splatIndex: 502, viewRank: 2, viewDepth: 0.14, coverageWeight: 0.48, opacity: 0.85 }),
      retainedContributor({ originalId: 5401, splatIndex: 601, role: "behind-surface", viewRank: 20, viewDepth: 0.74, coverageWeight: 0.8, opacity: 0.5 }),
    ],
    retainedContributors: [
      retainedContributor({ originalId: 9501, splatIndex: 701, viewRank: 8, viewDepth: 0.25, coverageWeight: 0.03, opacity: 0.5 }),
    ],
    orderedContributors: [
      orderedContributor({ originalId: 9501, splatIndex: 701, orderIndex: 0, viewRank: 8, viewDepth: 0.25, coverageWeight: 0.03, opacity: 0.5 }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({ originalId: 9501, splatIndex: 701, orderIndex: 0, coverageAlpha: 0.03 }),
      ],
      outputColor: [0.03, 0.02, 0.02, 0.03],
    },
  });

  assert.equal(verdict.category, "projected-foreground-dropped-before-retention");
  assert.equal(verdict.mechanism, "pixel-strong-projected-foreground-support-lost-before-retained-slate");
  assert.deepEqual(verdict.ids.projectedForeground, ["9401", "9402"]);
  assert.deepEqual(verdict.ids.projectedForegroundDroppedBeforeRetention, ["9401", "9402"]);
  assert.equal(verdict.counts.projectedForegroundDroppedBeforeRetention, 2);
  assert.ok(
    verdict.metrics.projectedForegroundDroppedBeforeRetentionOcclusionWeight >
      verdict.metrics.retainedForegroundOcclusionWeight,
  );
});

test("infers foreground role from projected depth context and final steps when explicit ordered trace is absent", () => {
  const verdict = classifyRetainedToOrderedSurvival({
    anchorPixel: { id: "fresh-real", kind: "lacunar-hole", x: 1514, y: 1324 },
    projectedContributors: [
      retainedContributor({ originalId: 1, role: null, roleClass: null, retentionBand: "middle", viewDepth: -0.25, coverageWeight: 0.5 }),
      retainedContributor({ originalId: 2, role: null, roleClass: null, retentionBand: "middle", viewDepth: -0.15, coverageWeight: 0.5 }),
      retainedContributor({ originalId: 3, role: null, roleClass: null, retentionBand: "middle", viewDepth: -0.05, coverageWeight: 0.5 }),
    ],
    retainedContributors: [
      retainedContributor({ originalId: 1, role: null, roleClass: null, retentionBand: "middle", viewDepth: -0.25, coverageWeight: 0.5 }),
    ],
    orderedContributors: [],
    finalColorAccumulation: {
      steps: [
        accumulationStep({ originalId: 1, splatIndex: 1, orderIndex: 0, coverageAlpha: 0.4 }),
      ],
      outputColor: [0.3, 0.25, 0.2, 0.4],
    },
  });

  assert.equal(verdict.category, "ordered-present");
  assert.equal(verdict.retainedForeground[0].role, "foreground-depth-band");
  assert.deepEqual(verdict.ids.retainedForeground, ["1"]);
  assert.deepEqual(verdict.ids.orderedForeground, ["1"]);
  assert.deepEqual(verdict.ids.accumulatedForeground, ["1"]);
});

test("treats malformed optional projected evidence as absent", () => {
  const withoutProjected = classifyRetainedToOrderedSurvival({
    anchorPixel: { id: "fresh-null-projected", kind: "lacunar-hole", x: 1514, y: 1324 },
    retainedContributors: [
      retainedContributor({ originalId: 9201, splatIndex: 301, viewRank: 2, viewDepth: 0.14, coverageWeight: 0.48, opacity: 0.88 }),
    ],
    orderedContributors: [
      orderedContributor({ originalId: 9201, splatIndex: 301, orderIndex: 0, viewRank: 2, viewDepth: 0.14, coverageWeight: 0.48, opacity: 0.88 }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({ originalId: 9201, splatIndex: 301, orderIndex: 0, coverageAlpha: 0.52 }),
      ],
      outputColor: [0.39, 0.33, 0.24, 0.52],
    },
  });
  const withNullProjected = classifyRetainedToOrderedSurvival({
    anchorPixel: { id: "fresh-null-projected", kind: "lacunar-hole", x: 1514, y: 1324 },
    projectedContributors: null,
    retainedContributors: [
      retainedContributor({ originalId: 9201, splatIndex: 301, viewRank: 2, viewDepth: 0.14, coverageWeight: 0.48, opacity: 0.88 }),
    ],
    orderedContributors: [
      orderedContributor({ originalId: 9201, splatIndex: 301, orderIndex: 0, viewRank: 2, viewDepth: 0.14, coverageWeight: 0.48, opacity: 0.88 }),
    ],
    finalColorAccumulation: {
      steps: [
        accumulationStep({ originalId: 9201, splatIndex: 301, orderIndex: 0, coverageAlpha: 0.52 }),
      ],
      outputColor: [0.39, 0.33, 0.24, 0.52],
    },
  });

  assert.equal(withNullProjected.category, withoutProjected.category);
  assert.deepEqual(withNullProjected.ids.projectedForeground, []);
  assert.deepEqual(withNullProjected.ids.projectedForegroundDroppedBeforeRetention, []);
});

test("builds a ledger over anchors and summarizes stage verdicts", () => {
  const ledger = buildRetainedToOrderedSurvivalLedger([
    {
      anchorPixel: { id: "fresh-a", kind: "lacunar-hole", x: 1320, y: 846 },
      retainedContributors: [],
      orderedContributors: [],
      finalColorAccumulation: { steps: [], outputColor: [0, 0, 0, 0] },
    },
    {
      anchorPixel: { id: "fresh-b", kind: "lacunar-hole", x: 1390, y: 870 },
      retainedContributors: [retainedContributor({ originalId: 9101, splatIndex: 101 })],
      orderedContributors: [orderedContributor({ originalId: 9101, splatIndex: 101 })],
      finalColorAccumulation: { steps: [accumulationStep({ originalId: 9101, splatIndex: 101, coverageAlpha: 0.41 })], outputColor: [0.3, 0.25, 0.2, 0.41] },
    },
    {
      anchorPixel: { id: "fresh-c", kind: "lacunar-hole", x: 1470, y: 875 },
      retainedContributors: [retainedContributor({ originalId: 9102, splatIndex: 102 })],
      orderedContributors: [],
      finalColorAccumulation: { steps: [], outputColor: [0, 0, 0, 0] },
    },
  ]);

  assert.deepEqual(
    ledger.anchorLedgers.map((entry) => [entry.anchorPixel.id, entry.category]),
    [
      ["fresh-a", "narrower-role-source-blocker"],
      ["fresh-b", "ordered-present"],
      ["fresh-c", "retained-missing-from-order"],
    ],
  );
  assert.deepEqual(ledger.summary.categoryCounts, {
    "narrower-role-source-blocker": 1,
    "ordered-present": 1,
    "retained-missing-from-order": 1,
  });
});

test("reports trace-blocked when the required evidence surfaces are absent", () => {
  const verdict = classifyRetainedToOrderedSurvival({
    anchorPixel: { id: "fresh-f", kind: "lacunar-hole", x: 2134, y: 988 },
    retainedContributors: null,
    orderedContributors: null,
    finalColorAccumulation: null,
  });

  assert.equal(verdict.category, "trace-blocked");
  assert.deepEqual(verdict.blockers, [
    {
      field: "retainedContributors",
      reason: "retained contributor trace is missing or not an array",
    },
    {
      field: "orderedContributors",
      reason: "ordered contributor trace is missing or not an array",
    },
    {
      field: "finalColorAccumulation",
      reason: "final accumulation trace is missing or malformed",
    },
  ]);
  assert.deepEqual(verdict.projectedForeground, []);
  assert.deepEqual(verdict.projectedForegroundDroppedBeforeRetention, []);
});

function retainedContributor({
  originalId,
  splatIndex = Number(originalId),
  role = "foreground-sealing",
  roleClass = "foreground",
  retentionBand = "front",
  retained = true,
  coverageWeight = 0.25,
  opacity = 0.8,
  occlusionWeight = coverageWeight * opacity,
  viewRank = 0,
  viewDepth = 0.2,
  sourceColor = [0.8, 0.7, 0.55],
}) {
  return {
    originalId,
    splatIndex,
    role,
    roleClass,
    retentionStatus: retained ? "retained" : "dropped",
    retained,
    retentionBand,
    coverageWeight,
    opacity,
    occlusionWeight,
    retentionWeight: occlusionWeight,
    viewRank,
    viewDepth,
    sourceColor,
  };
}

function orderedContributor({
  originalId,
  splatIndex = Number(originalId),
  orderIndex = 0,
  viewRank = orderIndex,
  viewDepth = 0.2,
  coverageWeight = 0.25,
  opacity = 0.8,
  sourceColor = [0.8, 0.7, 0.55],
}) {
  return {
    originalId,
    splatIndex,
    orderIndex,
    viewRank,
    viewDepth,
    coverageWeight,
    opacity,
    sourceColor,
    tieBreakKey: `rank:${viewRank}|depth:${viewDepth}|original:${originalId}|splat:${splatIndex}`,
    orderBackend: "gpu-sorted-index-rank-inversion",
  };
}

function accumulationStep({
  originalId,
  splatIndex = Number(originalId),
  orderIndex = 0,
  coverageAlpha = 0.3,
  sourceColor = [0.8, 0.7, 0.55],
}) {
  return {
    originalId,
    splatIndex,
    orderIndex,
    coverageWeight: coverageAlpha,
    opacity: 0.8,
    coverageAlpha,
    transmittanceBefore: 1,
    transmittanceAfter: 1 - coverageAlpha,
    sourceColor,
    contributionColor: sourceColor.map((channel) => Number((channel * coverageAlpha).toFixed(6))),
    runningColor: sourceColor.map((channel) => Number((channel * coverageAlpha).toFixed(6))),
    accumulationStatus: "accumulated",
  };
}
