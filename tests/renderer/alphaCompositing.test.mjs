import assert from "node:assert/strict";
import test from "node:test";

import {
  classifySplatOrder,
  composeStraightAlphaBackToFront,
  gaussianCoverageAlpha,
  sourceOverStraightAlpha,
} from "../../src/rendererFidelityProbes/alphaCompositing.js";

const EPSILON = 1e-12;

function assertColor(actual, expected) {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i += 1) {
    assert.ok(
      Math.abs(actual[i] - expected[i]) <= EPSILON,
      `component ${i}: expected ${expected[i]}, got ${actual[i]}`
    );
  }
}

test("two overlapping splats use straight source-over in sorted back-to-front order", () => {
  const farRed = { id: 0, depth: -9, color: [1, 0, 0], alpha: 0.5 };
  const nearBlue = { id: 1, depth: -2, color: [0, 0, 1], alpha: 0.25 };

  assert.deepEqual(classifySplatOrder([nearBlue, farRed]).drawIds, [0, 1]);
  assertColor(
    composeStraightAlphaBackToFront([farRed, nearBlue]).color,
    [0.3825, 0.0075, 0.265]
  );
});

test("three overlapping splats expose the ordered opacity transfer into the opaque clear color", () => {
  const layers = [
    { id: 0, depth: -7, color: [1, 0, 0], alpha: 0.5 },
    { id: 1, depth: -4, color: [0, 1, 0], alpha: 0.25 },
    { id: 2, depth: -1, color: [0, 0, 1], alpha: 0.125 },
  ];

  const result = composeStraightAlphaBackToFront(layers);

  assertColor(result.color, [0.3346875, 0.2253125, 0.138125]);
  assert.equal(result.alpha, 1);
  assert.deepEqual(result.transferWeights, [
    { id: 0, weight: 0.328125 },
    { id: 1, weight: 0.21875 },
    { id: 2, weight: 0.125 },
    { id: "clear", weight: 0.328125 },
  ]);
});

test("equal-depth splats keep original id order so later ids visibly land on top", () => {
  const layers = [
    { id: 2, depth: -4, color: [0, 0, 1], alpha: 0.5 },
    { id: 0, depth: -4, color: [1, 0, 0], alpha: 0.5 },
    { id: 1, depth: -4, color: [0, 1, 0], alpha: 0.5 },
  ];

  const order = classifySplatOrder(layers);
  const result = composeStraightAlphaBackToFront(layers);

  assert.deepEqual(order.drawIds, [0, 1, 2]);
  assertColor(result.color, [0.1275, 0.2525, 0.505]);
});

test("gaussian coverage multiplies already-activated opacity before blending", () => {
  assert.equal(gaussianCoverageAlpha(0.8, 0), 0.8);
  assert.equal(gaussianCoverageAlpha(2, 0), 1);
  assert.equal(gaussianCoverageAlpha(-1, 0), 0);
  assert.equal(gaussianCoverageAlpha(0.5, Number.POSITIVE_INFINITY), 0);
  assert.ok(Math.abs(gaussianCoverageAlpha(0.5, 1) - 0.5 * Math.exp(-2)) <= EPSILON);
});

test("straight alpha differs from premultiplied source-over for renderer shader outputs", () => {
  const destination = { color: [0.2, 0.4, 0.8], alpha: 1 };
  const straight = sourceOverStraightAlpha(
    { color: [1, 0, 0], alpha: 0.25 },
    destination
  );
  const premultipliedMistake = sourceOverStraightAlpha(
    { color: [0.25, 0, 0], alpha: 0.25 },
    destination
  );

  assertColor(straight.color, [0.4, 0.3, 0.6]);
  assertColor(premultipliedMistake.color, [0.2125, 0.3, 0.6]);
});
