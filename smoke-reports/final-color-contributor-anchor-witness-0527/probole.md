# Final-Color Contributor Anchor Witness 0527 Probolē

## Intent

Make the GPU live parity mugshot final-color ledger land on contributor-bearing diagnostic pixels, so the witness can distinguish real final-color row divergence from missing-anchor instrumentation.

## Boundaries

- Diagnostic/witness-only slice.
- Do not change renderer math, source selection, camera controls, presentation semantics, conics, alpha, ordering, or GPU retention.
- Keep trace anchors diagnostic-only: canonical trace anchors may be attached to mugshot routes after route scrub, but presentation anchors must remain scrubbed and full-scene presentation must remain the rendered surface.
- CPU/GPU captures in each pair must carry identical diagnostic trace anchors; arena backend remains the only intentional pair route difference.

## Artifact Names

- Primary report directory: `smoke-reports/final-color-contributor-anchor-witness-0527/`
- Rerun report directory, if needed: `smoke-reports/final-color-contributor-anchor-witness-0527-rerun/`
- Prior ledger artifacts remain under `smoke-reports/final-color-divergence-ledger-0527/` and `smoke-reports/final-color-divergence-ledger-0527-rerun/`.

## Close Condition

The focused mugshot tests pass and a real mugshot smoke either reports contributor-bearing final-color ledger rows or closes with a crisp blocker explaining why canonical diagnostic anchors still cannot produce contributor rows under the current route.
