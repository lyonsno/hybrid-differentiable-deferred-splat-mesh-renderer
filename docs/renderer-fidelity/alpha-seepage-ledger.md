# Alpha Seepage Ledger

Lane: `alpha-seepage-ledger` in `metadosis/coordination-packets/meshsplat-static-artifact-diagnostic-convergence_2026-05-01.md`.

Status: evidence-only alpha/occlusion classifier against integrated renderer base `origin/cc/double-attenuated-conic-seepage-integration-0501@7e26c56`. This lane does not change conic geometry, tile candidate retention, global opacity or brightness, source decoding, camera controls, SH/view-dependent color, or GPU tile-list construction.

## Purpose

The static dessert witness proves that one fixed `renderer=tile-local-visible` view has current final color plus `coverage-weight`, `accumulated-alpha`, `transmittance`, `tile-ref-count`, and `conic-shape` debug captures. Those whole-frame captures are necessary but not sufficient to say why plate/background structure leaks through the dessert at a particular pixel.

`src/rendererFidelityProbes/alphaSeepageLedger.js` adds the missing alpha-lane decision surface:

- `summarizeStaticAlphaEvidence` consumes the fixed static witness JSON and records current alpha/transmittance evidence without overclaiming root cause.
- `classifyAlphaSeepageLedger` consumes ordered layer samples and separates `alpha-under-accumulation`, `coverage-underfill`, `tile-list-loss`, `ordering-or-other`, and `no-seepage`.
- `describeAlphaSeepageLedgerContract` names the consumed surfaces and forbidden fixes so future renderer changes do not turn this lane into a conic, tile-ref, global-opacity, or GPU-porting lane.

## Classification

`alpha-under-accumulation` is allowed only when all required foreground roles are retained and foreground observed coverage is above the configured underfill threshold, yet the ordered optical-depth reference suppresses the bright behind layer while the observed transfer still leaks it.

`coverage-underfill` means foreground refs are present, but observed foreground coverage is too small relative to the reference. That is conic/coverage evidence, not an alpha fix.

`tile-list-loss` means required foreground roles are missing from retained tile refs. That is tile-ref custody evidence, not an alpha fix.

`ordering-or-other` means the ledger sees seepage but cannot assign it to the bounded alpha, coverage, or tile-ref categories without more ordered-layer diagnostics.

`no-seepage` means this witness does not reproduce plate-through-dessert leakage.

## Static Witness Summary

The fixed static dessert witness at `docs/renderer-fidelity/static-dessert-witness-0501/analysis.json` records:

| Field | Value |
| --- | ---: |
| Asset | `/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json` |
| Tile grid | `214x120` |
| Retained tile refs | `77,221` |
| Max refs per tile | `32` |
| Estimated max accumulated alpha | `1` |
| Estimated min transmittance | `0` |

The alpha ledger treats this as current static alpha evidence that rules out a stale budget skip and a whole-frame absence of alpha parameters. It does not rule out pixel-local coverage holes, pixel-local tile-ref loss, or ordered alpha under-accumulation at seepage pixels.

## Verification

The fail-first test was `tests/renderer/alphaSeepageLedger.test.mjs`: it first failed on the missing probe module, then passed after the diagnostic classifier was added. The test covers static witness summarization, alpha-under-accumulation classification, explicit non-alpha classifications for missing foreground refs and coverage underfill, and the lane's forbidden-fix contract.
