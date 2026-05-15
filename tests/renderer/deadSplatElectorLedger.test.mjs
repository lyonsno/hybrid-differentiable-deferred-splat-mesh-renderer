import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeadSplatElectorLedger,
  classifyDeadSplatElection,
  describeDeadSplatElectorLedgerContract,
} from "../../src/rendererFidelityProbes/deadSplatElectorLedger.js";

test("contract keeps dead-splat election evidence scoped to retained-vs-dropped identity", () => {
  assert.deepEqual(describeDeadSplatElectorLedgerContract(), {
    consumes: [
      "gpu-live-trace:per-pixel-retained-contributors.projectedContributors",
      "gpu-live-trace:per-pixel-retained-contributors.retainedContributors",
      "gpu-live-trace:per-pixel-retained-contributors.droppedContributors",
    ],
    categories: [
      "blocked-missing-retention-trace",
      "source-sparse",
      "wrong-retained-set",
      "later-transfer-failure",
      "narrower-blocker",
    ],
    owns: [
      "retained-vs-dropped contributor identity",
      "foreground sealing role survival under cap pressure",
      "retained slate role/depth/weight summaries",
    ],
    separatesFrom: [
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

test("classifies a cap-saturated anchor as wrong-retained-set when dropped foreground support outranks the elected slate", () => {
  const verdict = classifyDeadSplatElection({
    anchorPixel: { id: "fresh-a", kind: "lacunar-hole", x: 1320, y: 846 },
    status: "insufficient",
    projectedContributors: [
      contributor({ originalId: 9001, role: "foreground-sealing", retained: false, coverageWeight: 0.42, opacity: 0.9, viewDepth: 0.18, retentionBand: "front" }),
      contributor({ originalId: 9002, role: "foreground-sealing", retained: false, coverageWeight: 0.37, opacity: 0.85, viewDepth: 0.2, retentionBand: "front" }),
      contributor({ originalId: 4001, role: "behind-surface", retained: true, coverageWeight: 0.11, opacity: 0.45, viewDepth: 0.74, retentionBand: "behind" }),
      contributor({ originalId: 4002, role: "background-haze", retained: true, coverageWeight: 0.09, opacity: 0.4, viewDepth: 0.82, retentionBand: "behind" }),
    ],
    retainedContributors: [
      contributor({ originalId: 4001, role: "behind-surface", retained: true, coverageWeight: 0.11, opacity: 0.45, viewDepth: 0.74, retentionBand: "behind" }),
      contributor({ originalId: 4002, role: "background-haze", retained: true, coverageWeight: 0.09, opacity: 0.4, viewDepth: 0.82, retentionBand: "behind" }),
    ],
    droppedContributors: [
      contributor({ originalId: 9001, role: "foreground-sealing", retained: false, coverageWeight: 0.42, opacity: 0.9, viewDepth: 0.18, retentionBand: "front" }),
      contributor({ originalId: 9002, role: "foreground-sealing", retained: false, coverageWeight: 0.37, opacity: 0.85, viewDepth: 0.2, retentionBand: "front" }),
    ],
  });

  assert.equal(verdict.status, "classified");
  assert.equal(verdict.category, "wrong-retained-set");
  assert.equal(verdict.mechanism, "dropped-foreground-sealing-support-outranks-retained-slate");
  assert.deepEqual(verdict.ids.droppedForeground, ["9001", "9002"]);
  assert.deepEqual(verdict.ids.retainedForeground, []);
  assert.equal(verdict.counts.retainedBehindOrBackground, 2);
  assert.ok(
    verdict.metrics.droppedForegroundOcclusionWeight > verdict.metrics.retainedForegroundOcclusionWeight,
    "dropped foreground support should dominate retained foreground support",
  );
});

test("classifies misleadingly sufficient retained foreground support as a later transfer failure instead of cap election", () => {
  const verdict = classifyDeadSplatElection({
    anchorPixel: { id: "fresh-b", kind: "lacunar-hole", x: 1390, y: 870 },
    status: "misleadingly-sufficient",
    projectedContributors: [
      contributor({ originalId: 9101, role: "foreground-sealing", retained: true, coverageWeight: 0.54, opacity: 0.9, viewDepth: 0.2, retentionBand: "front" }),
      contributor({ originalId: 9102, role: "foreground-sealing", retained: true, coverageWeight: 0.31, opacity: 0.8, viewDepth: 0.22, retentionBand: "front" }),
      contributor({ originalId: 4101, role: "behind-surface", retained: true, coverageWeight: 0.08, opacity: 0.5, viewDepth: 0.71, retentionBand: "behind" }),
      contributor({ originalId: 9103, role: "foreground-sealing", retained: false, coverageWeight: 0.03, opacity: 0.7, viewDepth: 0.25, retentionBand: "front" }),
    ],
    retainedContributors: [
      contributor({ originalId: 9101, role: "foreground-sealing", retained: true, coverageWeight: 0.54, opacity: 0.9, viewDepth: 0.2, retentionBand: "front" }),
      contributor({ originalId: 9102, role: "foreground-sealing", retained: true, coverageWeight: 0.31, opacity: 0.8, viewDepth: 0.22, retentionBand: "front" }),
      contributor({ originalId: 4101, role: "behind-surface", retained: true, coverageWeight: 0.08, opacity: 0.5, viewDepth: 0.71, retentionBand: "behind" }),
    ],
    droppedContributors: [
      contributor({ originalId: 9103, role: "foreground-sealing", retained: false, coverageWeight: 0.03, opacity: 0.7, viewDepth: 0.25, retentionBand: "front" }),
    ],
  });

  assert.equal(verdict.category, "later-transfer-failure");
  assert.equal(verdict.mechanism, "foreground-sealing-slate-retained");
  assert.deepEqual(verdict.ids.retainedForeground, ["9101", "9102"]);
  assert.equal(verdict.counts.droppedForeground, 1);
  assert.ok(
    verdict.metrics.retainedForegroundOcclusionWeight > verdict.metrics.droppedForegroundOcclusionWeight * 10,
    "the retained foreground slate should overwhelm the dropped foreground tail",
  );
});

test("builds a ledger over multiple anchors and summarizes classifications", () => {
  const ledger = buildDeadSplatElectorLedger([
    {
      anchorPixel: { id: "fresh-a", kind: "lacunar-hole", x: 1320, y: 846 },
      projectedContributors: [],
      retainedContributors: [],
      droppedContributors: [],
    },
    {
      anchorPixel: { id: "fresh-c", kind: "lacunar-hole", x: 1470, y: 875 },
      projectedContributors: [contributor({ originalId: 1, role: "foreground-sealing", retained: true })],
      retainedContributors: [contributor({ originalId: 1, role: "foreground-sealing", retained: true })],
      droppedContributors: [],
    },
  ]);

  assert.deepEqual(
    ledger.anchorLedgers.map((entry) => [entry.anchorPixel.id, entry.category]),
    [
      ["fresh-a", "source-sparse"],
      ["fresh-c", "later-transfer-failure"],
    ],
  );
  assert.deepEqual(ledger.summary.categoryCounts, {
    "source-sparse": 1,
    "later-transfer-failure": 1,
  });
});

function contributor({
  originalId,
  role,
  retained,
  coverageWeight = 0.25,
  opacity = 0.8,
  viewDepth = 0.3,
  retentionBand = "front",
}) {
  return {
    originalId,
    role,
    retained,
    retentionStatus: retained ? "retained" : "dropped",
    coverageWeight,
    occlusionWeight: coverageWeight * opacity,
    retentionWeight: coverageWeight * opacity,
    opacity,
    viewDepth,
    retentionBand,
  };
}
