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

/**
 * Normalize a 3-vector in place, returning its length.
 * @param {number[]} v - [x, y, z] mutated in place.
 * @returns {number} Original length.
 */
function normalize3(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len > 1e-10) { v[0] /= len; v[1] /= len; v[2] /= len; }
  return len;
}

/**
 * Per-element directional coverage tracker.
 *
 * Tracks which directions each element (e.g. Gaussian splat) has been
 * observed from, using a discretized unit-sphere histogram. Candidate
 * views are scored by how much new coverage they would add.
 *
 * This is the renderer-independent core; the caller is responsible for
 * determining which elements are visible from a given viewpoint.
 */
export class DirectionalCoverageTracker {
  /**
   * @param {number} numElements - Number of elements to track (N).
   * @param {number} [nBins=64] - Number of directional bins on S^2 (G).
   */
  constructor(numElements, nBins = 64) {
    this.N = numElements;
    this.G = nBins;
    this.binDirs = fibonacciSphere(nBins);
    this.counts = Array.from({ length: numElements }, () => new Int32Array(nBins));
    this._viewsAdded = 0;
  }

  /**
   * Update coverage from a set of visible elements.
   *
   * @param {number[]} visibleIds - Indices of elements visible from this view.
   * @param {number[][]} positions - (N, 3) all element positions.
   * @param {number[]} camPos - [x, y, z] camera position.
   */
  updateFromVisibility(visibleIds, positions, camPos) {
    if (visibleIds.length === 0) return;

    const dirs = new Array(visibleIds.length);
    for (let i = 0; i < visibleIds.length; i++) {
      const p = positions[visibleIds[i]];
      const d = [p[0] - camPos[0], p[1] - camPos[1], p[2] - camPos[2]];
      normalize3(d);
      dirs[i] = d;
    }

    const binIds = dirToBin(this.binDirs, dirs);
    updateCoverageHistogram(this.counts, visibleIds, binIds);
    this._viewsAdded++;
  }

  /**
   * Score a candidate view by expected coverage gain.
   *
   * Lower score = more new information = better candidate.
   *
   * @param {number[][]} positions - (N, 3) all element positions.
   * @param {number[]} camPos - [x, y, z] candidate camera position.
   * @param {number[]|null} [visibleIds=null] - Indices of elements visible
   *   from this candidate. If null, scores all elements.
   * @returns {number} Mean max-cosine-coverage over visible elements.
   */
  scoreCandidateView(positions, camPos, visibleIds = null) {
    const ids = visibleIds ?? Array.from({ length: this.N }, (_, i) => i);
    if (ids.length === 0) return 1.0;

    const dirs = new Array(ids.length);
    for (let i = 0; i < ids.length; i++) {
      const p = positions[ids[i]];
      const d = [p[0] - camPos[0], p[1] - camPos[1], p[2] - camPos[2]];
      normalize3(d);
      dirs[i] = d;
    }

    const scores = scoreCandidateDirections(this.binDirs, ids.map(id => this.counts[id]), dirs);
    let sum = 0;
    for (let i = 0; i < scores.length; i++) sum += scores[i];
    return sum / scores.length;
  }

  /**
   * Greedily select the best N views from candidates.
   *
   * At each step, selects the candidate with the lowest coverage score
   * (most new information), updates coverage, and continues.
   *
   * @param {number[][]} candidateCamPositions - Array of [x,y,z] camera positions.
   * @param {number[][]} positions - (N, 3) all element positions.
   * @param {number} nSelect - Number of views to select.
   * @param {number[][]|null} [visibleIdsPerCamera=null] - Pre-computed visibility
   *   per camera. If null, scores all elements for each candidate.
   * @returns {number[]} Indices into candidateCamPositions, in selection order.
   */
  selectBestViews(candidateCamPositions, positions, nSelect, visibleIdsPerCamera = null) {
    const selected = [];
    const remaining = new Set(Array.from({ length: candidateCamPositions.length }, (_, i) => i));

    for (let step = 0; step < Math.min(nSelect, candidateCamPositions.length); step++) {
      let bestIdx = -1;
      let bestScore = Infinity;

      for (const idx of remaining) {
        const visIds = visibleIdsPerCamera ? visibleIdsPerCamera[idx] : null;
        const score = this.scoreCandidateView(positions, candidateCamPositions[idx], visIds);
        if (score < bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      }

      if (bestIdx < 0) break;

      selected.push(bestIdx);
      remaining.delete(bestIdx);

      // Update coverage with the selected view
      const visIds = visibleIdsPerCamera
        ? visibleIdsPerCamera[bestIdx]
        : Array.from({ length: this.N }, (_, i) => i);
      this.updateFromVisibility(visIds, positions, candidateCamPositions[bestIdx]);
    }

    return selected;
  }

  /** Fraction of bins observed per element. Returns Float32Array(N) in [0, 1]. */
  get perElementCoverage() {
    const result = new Float32Array(this.N);
    for (let i = 0; i < this.N; i++) {
      let observed = 0;
      for (let g = 0; g < this.G; g++) {
        if (this.counts[i][g] > 0) observed++;
      }
      result[i] = observed / this.G;
    }
    return result;
  }

  /** Mean coverage fraction across all elements. */
  get overallCoverage() {
    const cov = this.perElementCoverage;
    let sum = 0;
    for (let i = 0; i < cov.length; i++) sum += cov[i];
    return sum / cov.length;
  }
}
