# Tile-Local Transparency and Conic Witness

This witness pins two failure classes observed after the first visible tile-local Gaussian compositor became image-like:

- `scalar-radius-overcoverage`: the visible compositor currently collapses a projected conic to one scalar radius. For a thin/profile covariance, that can keep pixels on the minor-axis side almost fully covered even when the actual conic weight is effectively zero.
- `candidate-cap-drops-required-role`: a coverage-first capped tile list can retain many strong transparent surface contributors while dropping a lower-coverage bright contributor behind the surface. Once dropped, alpha transfer cannot recover that behind-surface evidence.

The executable probe is `src/rendererFidelityProbes/tileLocalTransparencyConicWitness.js`, covered by `tests/renderer/tileLocalTransparencyConicWitness.test.mjs`.

## Bounded Contributor Retention

The contributor-retention production path consumes `candidate-cap-drops-required-role` in the CPU bridge before alpha transfer. Each tile exposes at most `32` visible refs to match the existing compositor read limit, and dense tiles reserve a small bounded slice for high visual-energy contributors ranked by `coverageWeight * opacity * luminance`. The retained refs still carry their real coverage weights; the policy only decides which refs survive the cap.

This keeps memory bounded by the splat-count storage floor plus a per-tile cap, while allowing low-coverage bright or reflective behind-surface evidence to remain available to the existing ordered alpha transfer. The policy does not redefine alpha-transfer math, conic weighting, SH/view-dependent color, or global opacity.

## Boundaries

This witness and retention policy do not implement the final conic shader and do not claim transparency is fixed. Conic-shader work should still consume `scalar-radius-overcoverage` and replace scalar radius weighting with projected conic evaluation using covariance or inverse-conic data.
