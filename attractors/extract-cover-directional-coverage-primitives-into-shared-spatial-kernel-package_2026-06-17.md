# Extract COVER directional coverage primitives into shared spatial-kernel package

Created: 2026-06-17
Status: active
Branch: `cc/cover-attractor-0617`

## Why

The renderer's `preprocessing/splat_oracle/coverage.py` contains ~260 lines implementing the COVER algorithm (Cheng et al., CVPR 2026). Most of the core math — Fibonacci sphere generation, direction-to-bin classification, coverage histogram updates, and greedy coverage scoring — is renderer-independent spatial geometry. Extracting these primitives into `@local/webgpu-geometry-primitives` enables:

1. JS/WebGPU parity for browser-side next-best-view selection.
2. Deterministic cross-language fixture testing.
3. Candidate upstream PR to `chengine/nbv_gym` (MIT) as the first JS/WebGPU COVER implementation.

## Boundary

**Moves to `@local/webgpu-geometry-primitives` (renderer-independent math):**
- `fibonacciSphere(nBins)` — quasi-uniform directions on S^2.
- `dirToBin(binDirs, viewDirs)` — nearest-bin classification via dot product.
- `updateCoverageHistogram(counts, visibleIds, binIds)` — sparse histogram increment.
- `scoreCandidateDirections(binDirs, counts, viewDirs)` — per-direction coverage metric using `max(cos, 0)` (not `(cos+1)/2`, which saturates too early per 177d02c fix).

**Stays in renderer repo (renderer policy):**
- `CoverageTracker` class with `HarvestView`/`Camera`/splat-ID integration.
- Candidate camera generation and adaptive selection cadence.
- MoGE/SuperMat baking orchestration.
- All visibility determination (splat-ID buffers, frustum tests).

## Upstream directive

Mushfinger's directive (`metadosis/upstream-directives/mushfinger-asks-meshsplat-cover-extraction-after-spatial-kernelization_2026-06-17T205253Z.md`) explicitly requests:
- Wait for or coordinate with the spatial-kernel submodule shape before landing.
- JS port + fixtures can start now; landing into the package waits for Mushfinger to seat the submodule boundary.

## Implementation plan

1. Write fail-first tests in `tests/directional-coverage.test.mjs` with deterministic fixtures.
2. Port pure math to `src/directional-coverage.js` — four exported functions.
3. Generate Python-JS cross-validation fixtures from the NumPy source.
4. Wire into `package.json` exports/test/check.
5. Landing: blocked on Mushfinger seating the submodule shape in `@local/webgpu-geometry-primitives`.

## Upstream opportunity

First JS/WebGPU implementation of COVER directional coverage primitives. Candidate PR to `chengine/nbv_gym` (MIT) after extraction lands and fixtures pass cross-language parity.

## References

- Source: `preprocessing/splat_oracle/coverage.py` at renderer `177d02c`
- Algorithm: COVER (Cheng et al., CVPR 2026), `github.com/chengine/nbv_gym`
- Coverage metric fix: `max(cos, 0)` not `(cos+1)/2` — see `177d02c`
- Target package: `@local/webgpu-geometry-primitives`
