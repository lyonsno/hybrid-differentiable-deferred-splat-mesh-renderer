/**
 * Deterministic tests for COVER directional coverage primitives.
 *
 * Reference values generated from preprocessing/splat_oracle/coverage.py
 * at renderer commit 177d02c using NumPy with float32 precision.
 *
 * Algorithm: COVER (Cheng et al., CVPR 2026), github.com/chengine/nbv_gym
 */

import { strict as assert } from 'node:assert';
import {
  fibonacciSphere,
  dirToBin,
  updateCoverageHistogram,
  scoreCandidateDirections,
} from './directional-coverage.js';

const ATOL = 1e-5;

function assertClose(actual, expected, msg, tol = ATOL) {
  assert.ok(
    Math.abs(actual - expected) < tol,
    `${msg}: expected ${expected}, got ${actual} (diff ${Math.abs(actual - expected)})`
  );
}

// --- fibonacciSphere ---

{
  const bins = fibonacciSphere(8);
  assert.equal(bins.length, 8, 'should return 8 bins');
  assert.equal(bins[0].length, 3, 'each bin should be [x, y, z]');

  // Reference values from NumPy float32
  const expected = [
    [0.48412293, 0.00000000, 0.87500000],
    [-0.57560825, -0.52730453, 0.62500000],
    [0.08104560, 0.92347527, 0.37500000],
    [0.60366666, -0.78737640, 0.12500000],
    [-0.97699022, 0.17281534, -0.12500000],
    [0.78218222, 0.49756002, -0.37500000],
    [-0.20265420, -0.75386095, -0.62500000],
    [-0.22313502, 0.42963448, -0.87500000],
  ];

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 3; j++) {
      assertClose(bins[i][j], expected[i][j], `bin[${i}][${j}]`);
    }
  }

  // All unit vectors
  for (let i = 0; i < 8; i++) {
    const norm = Math.sqrt(bins[i][0] ** 2 + bins[i][1] ** 2 + bins[i][2] ** 2);
    assertClose(norm, 1.0, `bin[${i}] norm`);
  }

  console.log('  fibonacciSphere: PASS');
}

// --- dirToBin ---

{
  const binDirs = fibonacciSphere(8);

  // +z should map to bin 0 (highest z = 0.875)
  // -z should map to bin 7 (lowest z = -0.875)
  // +x should map to bin 5 (highest x-aligned)
  const viewDirs = [
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
  ];

  const result = dirToBin(binDirs, viewDirs);
  assert.deepStrictEqual(result, [0, 7, 5], 'dir_to_bin [+z, -z, +x]');

  console.log('  dirToBin: PASS');
}

// --- updateCoverageHistogram ---

{
  // 4 gaussians, 8 bins, all zeros
  const counts = Array.from({ length: 4 }, () => new Int32Array(8));

  // Update: gaussians [0, 2] observed from bins [5, 0]
  updateCoverageHistogram(counts, [0, 2], [5, 0]);

  assert.equal(counts[0][5], 1, 'gaussian 0, bin 5 incremented');
  assert.equal(counts[2][0], 1, 'gaussian 2, bin 0 incremented');
  assert.equal(counts[1][0], 0, 'gaussian 1 untouched');
  assert.equal(counts[3][0], 0, 'gaussian 3 untouched');

  // Second update to same bin should increment
  updateCoverageHistogram(counts, [0], [5]);
  assert.equal(counts[0][5], 2, 'gaussian 0, bin 5 incremented again');

  console.log('  updateCoverageHistogram: PASS');
}

// --- scoreCandidateDirections ---

{
  const binDirs = fibonacciSphere(8);

  // Set up counts matching Python fixture
  const counts = Array.from({ length: 4 }, () => new Int32Array(8));
  counts[0][0] = 1;
  counts[1][3] = 2;
  counts[2][0] = 1;
  counts[2][5] = 1;
  // gaussian 3: no observations

  // View directions: unit vectors along axes
  const viewDirs = [
    [1, 0, 0],   // g0
    [0, 1, 0],   // g1
    [0, 0, 1],   // g2
    [-1, 0, 0],  // g3
  ];

  const scores = scoreCandidateDirections(binDirs, counts, viewDirs);
  assert.equal(scores.length, 4, 'one score per direction');

  // Reference values from Python: max(cos, 0) * observed, then max over bins
  assertClose(scores[0], 0.48412293, 'g0 score');
  assertClose(scores[1], 0.0, 'g1 score (observed bin 3 has cos<=0 from +y)');
  assertClose(scores[2], 0.87500000, 'g2 score');
  assertClose(scores[3], 0.0, 'g3 score (no observations)');

  // Mean matches Python
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  assertClose(mean, 0.33978073, 'mean score');

  console.log('  scoreCandidateDirections: PASS');
}

// --- Coverage metric uses max(cos,0) not (cos+1)/2 ---

{
  // Verify that the metric does NOT saturate early.
  // With (cos+1)/2, a single observed bin would give floor ~0.5 even
  // for orthogonal directions. With max(cos,0), orthogonal = 0.
  const binDirs = fibonacciSphere(8);
  const counts = [new Int32Array(8)];
  counts[0][0] = 1; // only bin 0 observed

  // View direction orthogonal to bin 0
  const bin0 = binDirs[0];
  // Cross product with arbitrary vector to get orthogonal
  const ortho = [
    -bin0[1],
    bin0[0],
    0,
  ];
  const norm = Math.sqrt(ortho[0] ** 2 + ortho[1] ** 2 + ortho[2] ** 2);
  const viewDir = [ortho[0] / norm, ortho[1] / norm, ortho[2] / norm];

  const scores = scoreCandidateDirections(binDirs, counts, [viewDir]);
  // With max(cos,0): cos of orthogonal direction to bin 0 is ~0,
  // and other bins are unobserved, so score should be ~0, not ~0.5
  assert.ok(scores[0] < 0.1, `orthogonal score should be near 0, got ${scores[0]}`);

  console.log('  metric saturation guard: PASS');
}

console.log('All directional-coverage tests passed.');
