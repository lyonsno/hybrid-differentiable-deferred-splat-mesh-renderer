import assert from "node:assert/strict";
import test from "node:test";

import {
  describeSyntheticTraceParityContract,
  makeSyntheticTraceParityScenes,
  renderSyntheticTraceParityScene,
  validateSyntheticTraceParityScene,
} from "../../src/rendererFidelityProbes/syntheticTraceParity.js";

const EPSILON = 1e-9;

test("synthetic trace parity contract names the two deterministic scenes and the trace schema it must preserve", () => {
  assert.deepEqual(describeSyntheticTraceParityContract(), {
    consumes: [
      "trace-schema:projected-retained-ordered-final-accumulation",
      "final-color:ordered-alpha-transfer",
      "final-color:foreground-suppression-mask",
      "final-color:row-band-continuity",
    ],
    scenes: [
      "dense-foreground-occlusion",
      "row-band-dropout",
    ],
    assertions: [
      "projected, retained, ordered, and final-color accumulation evidence are all present on the same trace record",
      "the dense foreground scene still suppresses the bright plate in both pixels that remain covered",
      "the middle row band stays continuous instead of turning into a trace that only explains the pretty pixels",
    ],
    doesNotClaim: [
      "real-scene-capture-harness",
      "Urmina-backend-construction",
      "production-visual-tuning",
    ],
  });
});

test("reference synthetic scenes carry projected, retained, ordered, and final-color accumulation evidence", () => {
  const { denseForegroundOcclusion, rowBandDropout } = makeSyntheticTraceParityScenes();
  const dense = renderSyntheticTraceParityScene(denseForegroundOcclusion);
  const band = renderSyntheticTraceParityScene(rowBandDropout);

  assert.deepEqual(validateSyntheticTraceParityScene(dense), []);
  assert.deepEqual(validateSyntheticTraceParityScene(band), []);

  const denseForegroundLeft = dense.pixels.get("foreground-left");
  const rowMiddle = band.pixels.get("row-middle");

  assert.ok(Array.isArray(denseForegroundLeft.trace.projectedContributors));
  assert.ok(Array.isArray(denseForegroundLeft.trace.retainedContributors));
  assert.ok(Array.isArray(denseForegroundLeft.trace.orderedContributors));
  assert.ok(denseForegroundLeft.trace.finalColorAccumulation);
  assert.deepEqual(
    denseForegroundLeft.trace.finalColorAccumulation.drawIds,
    ["plate-behind", "dense-foreground"],
  );
  assert.ok(denseForegroundLeft.trace.projectedContributors.length >= 2);
  assert.ok(denseForegroundLeft.trace.retainedContributors.length >= 2);
  assert.ok(denseForegroundLeft.trace.orderedContributors.length >= 2);
  assertColorClose(denseForegroundLeft.color, [0.082, 0.058, 0.046], 5e-3);

  assert.ok(Array.isArray(rowMiddle.trace.projectedContributors));
  assert.ok(Array.isArray(rowMiddle.trace.retainedContributors));
  assert.ok(Array.isArray(rowMiddle.trace.orderedContributors));
  assert.ok(rowMiddle.trace.finalColorAccumulation);
  assert.deepEqual(
    rowMiddle.trace.finalColorAccumulation.drawIds,
    ["bright-row", "dark-band"],
  );
  assertColorClose(rowMiddle.color, [0.055, 0.04, 0.035], 5e-3);
});

test("dropping projected, retained, ordered, or accumulation evidence causes trace validation to fail", () => {
  const { denseForegroundOcclusion, rowBandDropout } = makeSyntheticTraceParityScenes();

  assert.throws(
    () => validateSyntheticTraceParityScene(renderSyntheticTraceParityScene(denseForegroundOcclusion, {
      behavior: "dropProjected",
    })),
    /projected/i,
  );

  assert.throws(
    () => validateSyntheticTraceParityScene(renderSyntheticTraceParityScene(denseForegroundOcclusion, {
      behavior: "dropRetained",
    })),
    /retained/i,
  );

  assert.throws(
    () => validateSyntheticTraceParityScene(renderSyntheticTraceParityScene(rowBandDropout, {
      behavior: "dropOrdered",
    })),
    /ordered/i,
  );

  assert.throws(
    () => validateSyntheticTraceParityScene(renderSyntheticTraceParityScene(rowBandDropout, {
      behavior: "dropAccumulation",
    })),
    /accumulation/i,
  );
});

function assertColorClose(actual, expected, tolerance) {
  assert.equal(actual.length, expected.length, "channel count");
  for (let index = 0; index < expected.length; index += 1) {
    assert.ok(
      Math.abs(actual[index] - expected[index]) <= tolerance,
      `channel ${index}: expected ${expected[index]}, got ${actual[index]}`,
    );
  }
}
