# Final Color Divergence Ledger 2026-05-27

## Scope

This slice tightens the GPU live parity mugshot witness around the surviving `final-color-divergence`. It does not change renderer math, source selection, camera behavior, GPU retention, alpha transfer, conic projection, ordering, or presentation semantics.

## Repair

The mugshot classifier now emits a per-pair final-color ledger that records:

- CPU/GPU final-color accumulation row counts
- whether those rows contain contributors
- live compositor input readback status and anchor counts
- trace/canvas parity status
- per-anchor final-color row mismatch status

The classifier also refuses captures that carry a `captureFailure`, even when timeout screenshots still contain plausible pixels. This closes a false-PASS hole found during this slice: a 60s run produced a porous CPU timeout capture but still reported `PASS` before the guard was added.

## Smoke

Command:

```sh
node scripts/run-visual-smoke.mjs --gpu-live-parity-mugshot --report-dir smoke-reports/final-color-divergence-ledger-0527-rerun --timeout-ms 120000
```

Result:

- Status: `PASS`
- Primary divergence: `final-color-divergence`
- Contact sheet: `smoke-reports/final-color-divergence-ledger-0527-rerun/gpu-live-parity-mugshot-contact-sheet.png`
- Report: `smoke-reports/final-color-divergence-ledger-0527-rerun/report.md`

Pair ledger:

| Pair | CPU refs | GPU refs | Changed pixels | Final-color ledger | CPU/GPU rows | CPU/GPU contributors | CPU/GPU compositor input |
| --- | ---: | ---: | ---: | --- | ---: | --- | --- |
| whole-render | 61,643 | 81,942 | 42,778 / 921,600 (4.642%) | `missing-final-color-contributors` | 3 / 3 | no / no | missing / missing |
| dessert-close | 412,939 | 495,371 | 360,760 / 921,600 (39.145%) | `missing-final-color-contributors` | 3 / 3 | no / no | missing / missing |
| porous-close | 722,539 | 729,200 | 652,419 / 921,600 (70.792%) | `missing-final-color-contributors` | 3 / 3 | no / no | missing / missing |

## Interpretation

The witness no longer points first at gross ref-population divergence. It now says the same-view CPU/GPU final images diverge, while the available per-anchor final-color ledgers are underpopulated on both routes: rows exist, but every sampled anchor has zero contributors, no live compositor input readback, and no trace/canvas parity classification.

That means the next repair should not start by changing visual math. The next bounded slice should make the final-color witness anchors land on meaningful contributor-bearing pixels or otherwise route the mugshot through the existing compositor-input readback surface, so the final-color divergence can be attributed to an actual row-level mismatch instead of an underinstrumented anchor set.

## Tests

- `node --test tests/smoke/gpu-live-parity-mugshot.test.mjs`
- `npm run test:smoke`
