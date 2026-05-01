import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  classifyDenseFrontOcclusionWitness,
  describeDenseFrontOcclusionWitnessContract,
} from "../../src/rendererFidelityProbes/denseFrontOcclusionWitness.js";

test("dense foreground reference suppresses bright behind while tile-local-visible leaks it", () => {
  const foreground = Array.from({ length: 24 }, (_, index) => ({
    id: `dessert-${index}`,
    role: "dense-foreground",
    depth: -2 + index * 0.001,
    color: [0.43, 0.36, 0.28],
    opacity: 0.08,
    referenceCoverageWeight: 10,
    tileCoverageWeight: 0.18,
    conicPixelWeight: 1,
  }));
  const brightBehind = {
    id: "plate-curve",
    role: "bright-behind",
    depth: -9,
    color: [1, 1, 1],
    opacity: 0.6,
    referenceCoverageWeight: 0.25,
    tileCoverageWeight: 0.25,
    conicPixelWeight: 1,
  };

  const witness = classifyDenseFrontOcclusionWitness({
    tileId: 17,
    pixelPx: [423.5, 311.5],
    layers: [brightBehind, ...foreground],
    requiredForegroundRoles: ["dense-foreground"],
    behindRoles: ["bright-behind"],
  });

  assert.equal(witness.status, "leak-detected");
  assert.equal(witness.category, "coverage-underfill");
  assert.equal(witness.recommendation, "handoff-to-conic-coverage-or-alpha-ledger-with-this-witness");
  assert.ok(witness.reference.behindWeight < 1e-9);
  assert.ok(witness.observed.behindWeight > 0.05);
  assert.ok(witness.observed.remainingTransmission > 0.5);
  assert.ok(witness.coverage.frontObservedToReferenceRatio < 0.03);
  assert.deepEqual(witness.retention.missingForegroundRoles, []);
  assert.deepEqual(witness.retention.presentBehindRoles, ["bright-behind"]);
});

test("witness classifies missing foreground refs as tile-list loss instead of alpha under-opacity", () => {
  const witness = classifyDenseFrontOcclusionWitness({
    tileId: 22,
    pixelPx: [96.5, 48.5],
    layers: [
      ...Array.from({ length: 16 }, (_, index) => ({
        id: `dropped-dessert-${index}`,
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
        depth: -8,
        color: [1, 1, 1],
        opacity: 0.6,
        referenceCoverageWeight: 0.25,
        tileCoverageWeight: 0.25,
        conicPixelWeight: 1,
      },
    ],
    requiredForegroundRoles: ["dense-foreground"],
    behindRoles: ["bright-behind"],
  });

  assert.equal(witness.status, "leak-detected");
  assert.equal(witness.category, "tile-list-loss");
  assert.deepEqual(witness.retention.missingForegroundRoles, ["dense-foreground"]);
  assert.ok(witness.observed.behindWeight > 0.1);
});

test("witness contract names its bounded evidence role", () => {
  assert.deepEqual(describeDenseFrontOcclusionWitnessContract(), {
    consumes: [
      "tile-local-visible:retained-tile-refs",
      "tile-local-visible:conic-pixel-weight",
      "alpha-transfer:optical-depth-source-over-reference",
    ],
    witnesses: [
      "dense-front-suppresses-bright-behind-reference",
      "tile-local-visible-bright-behind-leak",
      "foreground-under-opacity-vs-tile-list-loss",
    ],
    categories: [
      "coverage-underfill",
      "alpha-transfer",
      "tile-list-loss",
      "ordering-or-other",
      "no-leak",
    ],
    doesNotClaim: [
      "production-wgsl-fix",
      "global-opacity-tuning",
      "scaniverse-reference-parity",
    ],
  });
});

test("docs explain the plate-through-dessert witness without promoting a renderer fix", () => {
  const docs = readFileSync(
    new URL("../../docs/renderer-fidelity/dense-front-occlusion-witness.md", import.meta.url),
    "utf8",
  );

  assert.match(docs, /plate-through-dessert/);
  assert.match(docs, /coverage-underfill/);
  assert.match(docs, /tile-list-loss/);
  assert.match(docs, /bright behind/);
  assert.match(docs, /does not change WGSL/);
  assert.match(docs, /not a global opacity/);
  assert.match(docs, /does not claim Scaniverse reference parity/);
  assert.ok(!docs.includes("transparency is fixed"));
});
