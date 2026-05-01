import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  classifyTileLocalCandidateRetention,
  compareConicToScalarRadiusWeight,
  describeTileLocalTransparencyConicWitness,
} from "../../src/rendererFidelityProbes/tileLocalTransparencyConicWitness.js";

test("scalar radius approximation over-covers a thin conic profile", () => {
  const witness = compareConicToScalarRadiusWeight({
    covariancePx: { xx: 64, xy: 0, yy: 0.04 },
    centerPx: [0, 0],
    samplePx: [0, 2],
  });

  assert.equal(witness.status, "scalar-radius-overcoverage");
  assert.ok(witness.scalarRadiusWeight > 0.9);
  assert.ok(witness.conicWeight < 1e-20);
  assert.ok(witness.overCoverageRatio > 1e20);
  assert.equal(witness.recommendation, "replace-scalar-radius-with-projected-conic");
});

test("coverage-only tile candidate caps can drop bright behind-surface contributors", () => {
  const surface = Array.from({ length: 36 }, (_, index) => ({
    id: `surface-${index}`,
    role: "transparent-surface",
    depth: -2 + index * 0.001,
    coverageWeight: 10,
    opacity: 0.08,
    color: [0.42, 0.43, 0.44],
  }));
  const brightBehind = {
    id: "bright-behind",
    role: "bright-behind",
    depth: -9,
    coverageWeight: 0.25,
    opacity: 0.6,
    color: [8, 7, 5],
  };

  const witness = classifyTileLocalCandidateRetention({
    tileRefs: [brightBehind, ...surface],
    candidateCap: 32,
    requiredRoles: ["bright-behind"],
  });

  assert.equal(witness.status, "candidate-cap-drops-required-role");
  assert.deepEqual(witness.droppedRequiredRoles, ["bright-behind"]);
  assert.equal(witness.coverageFirstSelectedIds.includes("bright-behind"), false);
  assert.ok(witness.uncappedTransferWeights.find((entry) => entry.id === "bright-behind").weight > 0);
  assert.equal(witness.recommendation, "packetize-contributor-retention-policy");
});

test("witness contract separates measuring the failure from solving renderer policy", () => {
  assert.deepEqual(describeTileLocalTransparencyConicWitness(), {
    consumes: [
      "conic-coverage:projected-covariance",
      "tile-local-compositor:ordered-alpha-transfer",
      "visual-smoke:tile-local-visible-comparison",
    ],
    witnesses: [
      "scalar-radius-overcoverage",
      "candidate-cap-drops-required-role",
    ],
    doesNotClaim: [
      "final-conic-shader-implementation",
      "final-contributor-spill-policy",
      "transparency-is-fixed",
      "scaniverse-reference-parity",
    ],
  });
});

test("docs state the transparency and conic witness without promoting a renderer fix", () => {
  const docs = readFileSync(
    new URL("../../docs/renderer-fidelity/tile-local-transparency-conic-witness.md", import.meta.url),
    "utf8",
  );

  assert.match(docs, /scalar-radius-overcoverage/);
  assert.match(docs, /candidate-cap-drops-required-role/);
  assert.match(docs, /at most `32` visible refs/);
  assert.match(docs, /coverageWeight \* opacity \* luminance/);
  assert.match(docs, /does not redefine alpha-transfer math/);
  assert.match(docs, /do not implement the final conic shader/);
  assert.match(docs, /transparency is fixed/i);
});
