# Static Dessert Witness

Lane: `static-dessert-witness` in `metadosis/coordination-packets/meshsplat-static-artifact-diagnostic-convergence_2026-05-01.md`.

Status: historical witness dossier from renderer base `origin/cc/double-attenuated-conic-seepage-integration-0501@223c6ff`, with later 2026-05-06 plate/tile-local bridge and conic parity evidence. The original witness lane did not change production renderer math, global opacity/brightness, tile-ref budgets, asset decoding, camera controls, or the tile-local bridge policy.

## 2026-05-06 Conic Parity Follow-Up

The tile-local visible compositor now uses the plate-rate conic falloff `exp(-2.0 * mahalanobis2)` for sample-local coverage, while preserving the optical-depth alpha transfer and not multiplying by the tile-integrated coverage mass. The hard support-discard variant was tested and rejected because it made the footprint metric tight while visibly exposing tile-cap perforation in the dessert body. The landed direction is the softer falloff: it reduces the fixed-view tile-local footprint expansion without pretending the remaining porous body is solved.

Durable artifacts:

- `docs/renderer-fidelity/static-dessert-witness-0506-conic-parity/report.md`
- `docs/renderer-fidelity/static-dessert-witness-0506-conic-parity/analysis.json`
- `docs/renderer-fidelity/static-dessert-witness-0506-conic-parity/plate-final-color.png`
- `docs/renderer-fidelity/static-dessert-witness-0506-conic-parity/final-color.png`
- `docs/renderer-fidelity/static-dessert-witness-0506-conic-parity/coverage-weight.png`
- `docs/renderer-fidelity/static-dessert-witness-0506-conic-parity/accumulated-alpha.png`
- `docs/renderer-fidelity/static-dessert-witness-0506-conic-parity/transmittance.png`
- `docs/renderer-fidelity/static-dessert-witness-0506-conic-parity/tile-ref-count.png`
- `docs/renderer-fidelity/static-dessert-witness-0506-conic-parity/conic-shape.png`

Parity metrics from the final capture:

| Field | Value |
| --- | ---: |
| Plate changed pixels | `31,402 / 921,600 (3.407%)` |
| Tile-local changed pixels | `40,000 / 921,600 (4.340%)` |
| Tile-local / plate changed-pixel ratio | `1.273804216291956` |
| Classifier maximum ratio | `2.0` |
| Pre-fix bridge ratio from `static-dessert-witness-0506` | `2.714` |

Interpretation boundary: this is a conic footprint/falloff repair, not an alpha, opacity, brightness, tile-budget, or global scale repair. The remaining final-color holes are still live evidence for tile-ref/cap and deeper contributor retention work.

## 2026-05-06 Plate/Tile-Local Bridge Update

The static dessert witness now captures the default `plate` renderer alongside the `tile-local-visible` final color and debug modes, so rim diagnosis can keep the renderer-mode gap explicit instead of treating tile-local debug evidence as if it were plate evidence. The witness also records crop-local source/footprint support for the packet rim band `x=390,y=322,w=500,h=115` at `1280x720`.

Durable artifacts:

- `docs/renderer-fidelity/static-dessert-witness-0506/report.md`
- `docs/renderer-fidelity/static-dessert-witness-0506/analysis.json`
- `docs/renderer-fidelity/static-dessert-witness-0506/plate-final-color.png`
- `docs/renderer-fidelity/static-dessert-witness-0506/final-color.png`
- `docs/renderer-fidelity/static-dessert-witness-0506/coverage-weight.png`
- `docs/renderer-fidelity/static-dessert-witness-0506/accumulated-alpha.png`
- `docs/renderer-fidelity/static-dessert-witness-0506/transmittance.png`
- `docs/renderer-fidelity/static-dessert-witness-0506/tile-ref-count.png`
- `docs/renderer-fidelity/static-dessert-witness-0506/conic-shape.png`

Fixed-view bridge metrics from the 2026-05-06 capture:

| Field | Value |
| --- | ---: |
| Plate renderer label | `plate` |
| Tile-local renderer label | `tile-local-visible-gaussian-compositor` |
| Same asset | `true` |
| Same viewport | `true` |
| Rim crop source centers | `87,499` |
| Rim crop projected support splats | `88,901` |
| Rim crop near-floor minor splats | `47,346` |
| Rim crop max major radius | `51.362080196886815px` |
| Rim crop median major radius | `3.2926847247256466px` |
| Rim crop median minor radius | `1.5533136541375223px` |

Interpretation boundary: this update is evidence plumbing, not a renderer fix. It makes source sparsity unlikely as the primary explanation for the fixed static crop, keeps alpha/global opacity blocked, and gives a future conic/coverage patch a concrete before/after witness.

## Fixed Static View

Command:

```bash
npm run smoke:visual:real -- --static-dessert-witness --out-dir /tmp/static-dessert-witness-0501 --viewport 1280x720 --settle-ms 6000 --timeout-ms 30000
```

Durable artifacts:

- `docs/renderer-fidelity/static-dessert-witness-0501/report.md`
- `docs/renderer-fidelity/static-dessert-witness-0501/analysis.json`
- `docs/renderer-fidelity/static-dessert-witness-0501/final-color.png`
- `docs/renderer-fidelity/static-dessert-witness-0501/coverage-weight.png`
- `docs/renderer-fidelity/static-dessert-witness-0501/accumulated-alpha.png`
- `docs/renderer-fidelity/static-dessert-witness-0501/transmittance.png`
- `docs/renderer-fidelity/static-dessert-witness-0501/tile-ref-count.png`
- `docs/renderer-fidelity/static-dessert-witness-0501/conic-shape.png`

Fixed-view metrics:

| Field | Value |
| --- | ---: |
| Asset | `/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json` |
| Viewport | `1280x720` |
| Tile grid | `214x120` |
| Retained tile refs | `77,221` |
| Max refs per tile | `32` |
| Non-empty tiles | `3,811` |
| Estimated max accumulated alpha | `1` |
| Estimated min transmittance | `0` |
| Max conic major radius | `57.208888px` |
| Min conic minor radius | `0.206878px` |
| Max conic anisotropy ratio | `61.3567` |

## Observation Boundaries

Visible holes are witnessed by `final-color.png`, `coverage-weight.png`, and `conic-shape.png`. The final-color frame shows porous, non-square gaps in the dessert body; the coverage and conic captures preserve that evidence separately from alpha/transmittance so conic and tile-ref lanes can inspect it without guessing from memory.

Plate-through-dessert seepage is witnessed by `final-color.png`, `accumulated-alpha.png`, and `transmittance.png`. The alpha/transmittance pair records that the fixed view reaches estimated accumulated alpha `1` and min transmittance `0` somewhere in the frame, while the final-color frame still visibly admits bright plate/background structure through the dessert. This is evidence for alpha/tile-ref/conic follow-up, not a license to tune global opacity.

Tile-ref density is witnessed by `tile-ref-count.png` and the compact JSON. It records the same `214x120` tile grid and `77,221` retained refs as the final-color/debug captures, with the current 32-ref per-tile cap visible as saturated red in the density heatmap.

## High-Viewport Budget Observation

Packet input included a user-reported high-viewport overlay:

```text
3456x1916 | 576x320 tiles | tile-local skipped: projected tile refs exceed budget: 20000001 > 20000000
```

This lane keeps that as a separate budget/staleness observation rather than mixing it with the fixed 1280x720 artifact. A direct high-viewport capture on this exact worktree/default view did not reproduce the skip:

```bash
npm run smoke:visual:real -- --url 'http://127.0.0.1:61600/?renderer=tile-local-visible' --out-dir /tmp/static-dessert-budget-skip-0501 --viewport 3456x1916 --settle-ms 6000 --timeout-ms 45000
```

Captured metrics:

| Field | Value |
| --- | ---: |
| Viewport | `3456x1916` |
| Tile grid | `576x320` |
| Retained tile refs | `531,136` |
| Renderer label | `tile-local-visible-gaussian-compositor` |
| Skip/disable reason | none reported |

Durable high-viewport artifacts:

- `docs/renderer-fidelity/static-dessert-witness-0501/high-viewport-report.md`
- `docs/renderer-fidelity/static-dessert-witness-0501/high-viewport-analysis.json`
- `docs/renderer-fidelity/static-dessert-witness-0501/high-viewport-final-color.png`

The non-reproduction matters: sibling `viewport-budget-honesty` should treat the packet overlay as a distinct view/camera or stale-frame condition, not as the default fixed dessert view captured here.
