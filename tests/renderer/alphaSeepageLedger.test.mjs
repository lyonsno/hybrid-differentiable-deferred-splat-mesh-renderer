import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  classifyAlphaSeepageLedger,
  describeAlphaSeepageLedgerContract,
  summarizeStaticAlphaEvidence,
} from "../../src/rendererFidelityProbes/alphaSeepageLedger.js";

const staticWitness = JSON.parse(
  readFileSync(
    new URL("../../docs/renderer-fidelity/static-dessert-witness-0501/analysis.json", import.meta.url),
    "utf8",
  ),
);

test("static alpha evidence records current debug evidence without overclaiming root cause", () => {
  const summary = summarizeStaticAlphaEvidence(staticWitness);

  assert.equal(summary.status, "static-alpha-debug-evidence");
  assert.equal(summary.assetPath, "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json");
  assert.equal(summary.tileGrid.columns, 214);
  assert.equal(summary.tileGrid.rows, 120);
  assert.equal(summary.tileRefs.total, 77221);
  assert.equal(summary.tileRefs.maxPerTile, 32);
  assert.equal(summary.alpha.estimatedMaxAccumulatedAlpha, 1);
  assert.equal(summary.alpha.estimatedMinTransmittance, 0);
  assert.equal(summary.rulesOut.staleBudgetSkip, true);
  assert.equal(summary.rulesOut.globalAlphaAbsence, true);
  assert.deepEqual(summary.cannotRuleOut, [
    "pixel-local coverage holes",
    "pixel-local tile-ref loss",
    "ordered alpha under-accumulation at seepage pixels",
  ]);
});

test("ledger classifies retained foreground with enough coverage but leaking behind as alpha under-accumulation", () => {
  const witness = classifyAlphaSeepageLedger({
    tileId: 17,
    pixelPx: [423.5, 311.5],
    coverageUnderfillRatio: 0.2,
    observedBehindWeightThreshold: 0.001,
    layers: [
      {
        id: "plate-curve",
        role: "bright-behind",
        depth: -9,
        color: [1, 1, 1],
        opacity: 0.6,
        referenceCoverageWeight: 0.25,
        tileCoverageWeight: 0.25,
        conicPixelWeight: 1,
      },
      ...Array.from({ length: 24 }, (_, index) => ({
        id: `dessert-${index}`,
        role: "dense-foreground",
        depth: -2 + index * 0.001,
        color: [0.43, 0.36, 0.28],
        opacity: 0.08,
        referenceCoverageWeight: 10,
        tileCoverageWeight: 2.5,
        conicPixelWeight: 1,
      })),
    ],
  });

  assert.equal(witness.status, "seepage-detected");
  assert.equal(witness.category, "alpha-under-accumulation");
  assert.equal(witness.excludes.tileListLoss, true);
  assert.equal(witness.excludes.coverageUnderfill, true);
  assert.ok(witness.evidence.foregroundObservedToReferenceRatio >= 0.2);
  assert.ok(witness.evidence.observedBehindWeight >= 0.001);
  assert.ok(witness.evidence.referenceBehindWeight < 1e-3);
});

test("ledger keeps missing foreground refs and coverage underfill out of alpha-under-accumulation", () => {
  const missingRefs = classifyAlphaSeepageLedger({
    tileId: 18,
    pixelPx: [96.5, 48.5],
    layers: [
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `missing-dessert-${index}`,
        role: "dense-foreground",
        retained: false,
        depth: -2 + index * 0.001,
        color: [0.43, 0.36, 0.28],
        opacity: 0.08,
        referenceCoverageWeight: 10,
        tileCoverageWeight: 0,
        conicPixelWeight: 1,
      })),
      {
        id: "plate-curve",
        role: "bright-behind",
        depth: -9,
        color: [1, 1, 1],
        opacity: 0.6,
        referenceCoverageWeight: 0.25,
        tileCoverageWeight: 0.25,
        conicPixelWeight: 1,
      },
    ],
  });

  assert.equal(missingRefs.category, "tile-list-loss");
  assert.equal(missingRefs.excludes.alphaUnderAccumulation, true);

  const underfill = classifyAlphaSeepageLedger({
    tileId: 19,
    pixelPx: [112.5, 64.5],
    layers: [
      {
        id: "plate-curve",
        role: "bright-behind",
        depth: -9,
        color: [1, 1, 1],
        opacity: 0.6,
        referenceCoverageWeight: 0.25,
        tileCoverageWeight: 0.25,
        conicPixelWeight: 1,
      },
      ...Array.from({ length: 24 }, (_, index) => ({
        id: `thin-dessert-${index}`,
        role: "dense-foreground",
        depth: -2 + index * 0.001,
        color: [0.43, 0.36, 0.28],
        opacity: 0.08,
        referenceCoverageWeight: 10,
        tileCoverageWeight: 0.18,
        conicPixelWeight: 1,
      })),
    ],
  });

  assert.equal(underfill.category, "coverage-underfill");
  assert.equal(underfill.excludes.alphaUnderAccumulation, true);
});

test("ledger contract names alpha scope and forbidden fixes", () => {
  assert.deepEqual(describeAlphaSeepageLedgerContract(), {
    consumes: [
      "static-dessert-witness:alpha-transmittance-debug-captures",
      "dense-front-occlusion-witness:ordered-optical-depth-reference",
      "tile-local-visible:retained-foreground-refs",
      "tile-local-visible:conic-pixel-coverage",
    ],
    categories: [
      "alpha-under-accumulation",
      "coverage-underfill",
      "tile-list-loss",
      "ordering-or-other",
      "no-seepage",
    ],
    forbiddenFixes: [
      "conic-geometry",
      "tile-candidate-retention",
      "global-opacity-or-brightness",
      "source-decoding",
      "camera-controls",
      "sh-view-dependent-color",
      "gpu-tile-list-construction",
    ],
  });
});

test("docs keep alpha evidence separate from conic, tile-ref, and global tuning fixes", () => {
  const docs = readFileSync(
    new URL("../../docs/renderer-fidelity/alpha-seepage-ledger.md", import.meta.url),
    "utf8",
  );

  assert.match(docs, /alpha-under-accumulation/);
  assert.match(docs, /coverage-underfill/);
  assert.match(docs, /tile-list-loss/);
  assert.match(docs, /does not change conic geometry/);
  assert.match(docs, /does not rule out pixel-local coverage holes/);
  assert.match(docs, /pixel-local tile-ref loss/);
  assert.ok(!docs.includes("global opacity fix"));
});
