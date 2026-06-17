/**
 * COVER directional coverage primitives.
 *
 * Renderer-independent spatial math for the COVER algorithm
 * (Cheng et al., CVPR 2026). Ported from preprocessing/splat_oracle/coverage.py
 * at renderer commit 177d02c.
 *
 * These functions operate on plain arrays/typed arrays and have no
 * renderer, camera, or visibility dependencies.
 *
 * Reference: github.com/chengine/nbv_gym (MIT license).
 */

/**
 * Generate nBins evenly-spaced directions on the unit sphere
 * using the Fibonacci lattice.
 *
 * @param {number} nBins - Number of directional bins (typically 32-128).
 * @returns {number[][]} Array of [x, y, z] unit vectors, length nBins.
 */
export function fibonacciSphere(nBins) {
  const phi = (1.0 + Math.sqrt(5.0)) / 2.0; // golden ratio
  const bins = new Array(nBins);
  for (let i = 0; i < nBins; i++) {
    const z = 1.0 - 2.0 * (i + 0.5) / nBins;
    const r = Math.sqrt(Math.max(1.0 - z * z, 0.0));
    const theta = 2.0 * Math.PI * ((i / phi) % 1.0);
    bins[i] = [r * Math.cos(theta), r * Math.sin(theta), z];
  }
  return bins;
}

/**
 * Assign each view direction to its nearest bin by max dot product.
 *
 * @param {number[][]} binDirs - (G) array of [x,y,z] bin center unit vectors.
 * @param {number[][]} viewDirs - (N) array of [x,y,z] unit vectors.
 * @returns {number[]} (N) array of bin indices.
 */
export function dirToBin(binDirs, viewDirs) {
  const N = viewDirs.length;
  const G = binDirs.length;
  const result = new Array(N);
  for (let i = 0; i < N; i++) {
    const vx = viewDirs[i][0], vy = viewDirs[i][1], vz = viewDirs[i][2];
    let bestDot = -Infinity;
    let bestBin = 0;
    for (let g = 0; g < G; g++) {
      const dot = vx * binDirs[g][0] + vy * binDirs[g][1] + vz * binDirs[g][2];
      if (dot > bestDot) {
        bestDot = dot;
        bestBin = g;
      }
    }
    result[i] = bestBin;
  }
  return result;
}

/**
 * Increment coverage histogram counts for observed gaussians.
 *
 * @param {Int32Array[]} counts - (N) array of Int32Array(G) histograms.
 * @param {number[]} visibleIds - Indices of gaussians that were observed.
 * @param {number[]} binIds - Bin index for each visible gaussian (parallel to visibleIds).
 */
export function updateCoverageHistogram(counts, visibleIds, binIds) {
  for (let i = 0; i < visibleIds.length; i++) {
    counts[visibleIds[i]][binIds[i]] += 1;
  }
}

/**
 * Score candidate view directions by coverage overlap.
 *
 * For each view direction, computes max(cos(angle_to_bin), 0) over
 * observed bins. Uses clamped cosine (not (cos+1)/2) to preserve
 * dynamic range — the remapped version saturates too early.
 *
 * @param {number[][]} binDirs - (G) array of [x,y,z] bin center unit vectors.
 * @param {Int32Array[]} counts - (N) array of Int32Array(G) histograms.
 * @param {number[][]} viewDirs - (N) array of [x,y,z] view direction per gaussian.
 * @returns {number[]} (N) array of per-gaussian max coverage scores in [0, 1].
 *   High = already well covered from a similar direction.
 *   Zero = no observed bins, or all observed bins are in the opposite hemisphere.
 */
export function scoreCandidateDirections(binDirs, counts, viewDirs) {
  const N = viewDirs.length;
  const G = binDirs.length;
  const scores = new Array(N);
  for (let i = 0; i < N; i++) {
    const vx = viewDirs[i][0], vy = viewDirs[i][1], vz = viewDirs[i][2];
    let maxCoverage = 0.0;
    for (let g = 0; g < G; g++) {
      if (counts[i][g] > 0) {
        const cos = vx * binDirs[g][0] + vy * binDirs[g][1] + vz * binDirs[g][2];
        const clamped = cos > 0.0 ? cos : 0.0;
        if (clamped > maxCoverage) maxCoverage = clamped;
      }
    }
    scores[i] = maxCoverage;
  }
  return scores;
}
