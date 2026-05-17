import assert from "node:assert/strict";
import test from "node:test";

import {
  compareTraceToRuntimeFinalColor,
} from "../../src/rendererFidelityProbes/finalColorRuntimeParity.js";

test("final-color runtime parity reports old trace-only payloads as underinstrumented", () => {
  const verdict = compareTraceToRuntimeFinalColor({
    traceAccumulation: [
      traceRow({
        id: "fresh-a",
        outputColor: [0.352072, 0.199142, 0.153725, 1],
        steps: [
          {
            splatIndex: 54864,
            originalId: 54864,
            coverageWeight: 0.117504,
            tileCoverageWeight: 0.117504,
            opacity: 0.388235,
            coverageAlpha: 0.056107,
            transmittanceBefore: 1,
            transmittanceAfter: 0.943893,
            sourceColor: [0.980458, 0.75212, 0.507472],
            contributionColor: [0.05501, 0.042199, 0.028473],
            runningColor: [0.073888, 0.061077, 0.066228],
            accumulationStatus: "accumulated",
          },
        ],
      }),
    ],
  });

  assert.equal(verdict.classification, "runtime-final-color-underinstrumented");
  assert.equal(verdict.rows.length, 1);
  assert.equal(verdict.rows[0].anchorId, "fresh-a");
  assert.equal(verdict.rows[0].status, "runtime-final-color-missing");
  assert.deepEqual(verdict.rows[0].traceRgba8, [90, 51, 39, 255]);
  assert.equal(verdict.rows[0].firstStep.coverageWeight, 0.117504);
  assert.equal(verdict.rows[0].firstStep.opacity, 0.388235);
  assert.equal(verdict.rows[0].firstStep.transmittanceBefore, 1);
  assert.deepEqual(verdict.rows[0].firstStep.sourceColor, [0.980458, 0.75212, 0.507472]);
});

test("final-color runtime parity classifies runtime rows before presentation", () => {
  const traceAccumulation = [
    traceRow({
      id: "fresh-a",
      outputColor: [0.352072, 0.199142, 0.153725, 1],
    }),
    traceRow({
      id: "fresh-b",
      outputColor: [0.355139, 0.201197, 0.158142, 1],
    }),
  ];

  const match = compareTraceToRuntimeFinalColor({
    traceAccumulation,
    runtimeFinalColor: [
      runtimeRow({ id: "fresh-a", rgba: [0.35208, 0.19915, 0.15372, 1] }),
      runtimeRow({ id: "fresh-b", rgba: [0.35514, 0.2012, 0.15814, 1] }),
    ],
    tolerance: 1 / 255,
  });

  assert.equal(match.classification, "runtime-final-color-matches-trace");
  assert.deepEqual(match.rows.map((row) => row.status), [
    "runtime-final-color-match",
    "runtime-final-color-match",
  ]);
  assert.deepEqual(match.rows[0].runtimeOutputFormat, {
    textureFormat: "rgba16float",
    sampleSpace: "linear-float",
    transferStage: "tile-local-output-texture-before-presentation",
  });

  const divergence = compareTraceToRuntimeFinalColor({
    traceAccumulation,
    runtimeFinalColor: [
      runtimeRow({ id: "fresh-a", rgba: [0.02, 0.02, 0.04, 1] }),
      runtimeRow({ id: "fresh-b", rgba: [0.35514, 0.2012, 0.15814, 1] }),
    ],
    tolerance: 1 / 255,
  });

  assert.equal(divergence.classification, "trace-runtime-final-color-divergence");
  assert.equal(divergence.rows[0].status, "trace-runtime-final-color-divergence");
  assert.deepEqual(divergence.rows[0].runtimeRgba8, [5, 5, 10, 255]);
  assert.equal(divergence.rows[0].maxChannelDelta8, 85);
  assert.equal(divergence.rows[0].blendReason, "runtime-output-read-before-presenter-blend");
  assert.equal(divergence.rows[0].clampReason, "half-float output decoded and clamped to normalized RGBA");
});

function traceRow({ id, outputColor, steps = [defaultStep()] }) {
  return {
    anchorPixel: { id, x: 1, y: 2 },
    finalColorAccumulation: {
      outputColor,
      steps,
    },
  };
}

function runtimeRow({ id, rgba }) {
  return {
    anchorId: id,
    rgba,
    textureFormat: "rgba16float",
    sampleSpace: "linear-float",
    transferStage: "tile-local-output-texture-before-presentation",
  };
}

function defaultStep() {
  return {
    splatIndex: 1,
    originalId: 1,
    coverageWeight: 1,
    tileCoverageWeight: 1,
    opacity: 0.5,
    coverageAlpha: 0.5,
    transmittanceBefore: 1,
    transmittanceAfter: 0.5,
    sourceColor: [0.8, 0.2, 0.1],
    contributionColor: [0.4, 0.1, 0.05],
    runningColor: [0.41, 0.11, 0.07],
    accumulationStatus: "accumulated",
  };
}
