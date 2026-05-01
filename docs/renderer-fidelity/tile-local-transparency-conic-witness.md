# Tile-Local Transparency and Conic Witness

This witness pins two failure classes observed after the first visible tile-local Gaussian compositor became image-like:

- `scalar-radius-overcoverage`: the visible compositor currently collapses a projected conic to one scalar radius. For a thin/profile covariance, that can keep pixels on the minor-axis side almost fully covered even when the actual conic weight is effectively zero.
- `candidate-cap-drops-required-role`: a coverage-first capped tile list can retain many strong transparent surface contributors while dropping a lower-coverage bright contributor behind the surface. Once dropped, alpha transfer cannot recover that behind-surface evidence.

The executable probe is `src/rendererFidelityProbes/tileLocalTransparencyConicWitness.js`, covered by `tests/renderer/tileLocalTransparencyConicWitness.test.mjs`.

## Boundaries

This witness does not implement the final conic shader, does not define the final contributor spill or retention policy, and does not claim transparency is fixed. It only makes the current failure modes falsifiable before the next packet changes compositor math.

## Packet Handoff

Future contributor-retention work should consume `candidate-cap-drops-required-role` and decide which non-dominant contributors must survive a capped tile list for transparent or reflective surfaces.

Future conic-shader work should consume `scalar-radius-overcoverage` and replace scalar radius weighting with projected conic evaluation using covariance or inverse-conic data.
