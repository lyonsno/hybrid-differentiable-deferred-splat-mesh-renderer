# Tile Ref Population Divergence Ledger 2026-05-27

## Scope

This slice repairs the witness contract around operator-view tile-local freshness. It does not change renderer presentation semantics, source selection, GPU retention, alpha transfer, conic math, or ordering.

## Finding

The GPU live parity mugshot previously allowed a CPU/reference capture to become ready after the operator witness revision changed but before the CPU tile-local compositor rebuilt for the new camera signature. That made the CPU route a stale comparator: in the prior repaired mugshot replay, `whole-render-cpu-reference` and `dessert-close-cpu-reference` both reported `61,643` retained refs even though the witness view and pixels changed.

## Repair

`src/main.ts` now passes the current tile-local prepass signature into freshness evidence. If the current camera signature differs from `lastCompositedSignature` and no hard skip occurred, tile-local evidence reports `pending-dispatch` instead of `current`. Existing smoke readiness treats any non-current tile-local freshness as stale, so the mugshot waits until the rebuilt CPU/reference presentation is actually exposed.

## Smoke

Command:

```sh
node scripts/run-visual-smoke.mjs --gpu-live-parity-mugshot --report-dir smoke-reports/tile-ref-population-divergence-ledger-0527 --timeout-ms 60000
```

Result:

- Status: `PASS`
- Primary divergence after repair: `final-color-divergence`
- Contact sheet: `smoke-reports/tile-ref-population-divergence-ledger-0527/gpu-live-parity-mugshot-contact-sheet.png`

Ref accounting after repair:

| Capture | Retained refs | Projected refs | Dropped refs | Non-empty tiles | Saturated tiles | Source |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| whole-render-cpu-reference | 61,643 | 727,348 | 665,705 | 570 | 190 | tile-header-diagnostics |
| whole-render-direct-gpu | 81,942 | 1,063,179 | 981,237 | 693 | 242 | gpu-scatter-cursor-readback |
| dessert-close-cpu-reference | 412,939 | 3,082,949 | 2,670,010 | 3,326 | 1,226 | tile-header-diagnostics |
| dessert-close-direct-gpu | 495,371 | 4,780,549 | 4,285,178 | 3,379 | 1,612 | gpu-scatter-cursor-readback |
| porous-close-cpu-reference | 722,539 | 5,708,210 | 4,985,671 | 3,600 | 2,425 | tile-header-diagnostics |
| porous-close-direct-gpu | 729,200 | 8,874,573 | 8,145,373 | 3,600 | 2,592 | gpu-scatter-cursor-readback |

## Interpretation

The old population divergence was at least substantially a stale CPU reference witness, not proof that the GPU route alone was overpopulating by a factor large enough to dominate the next repair. The surviving closeable blocker is final-color divergence under same-view CPU/GPU routes.

## Tests

- `node --test tests/smoke/tile-local-comparison.test.mjs`
- `node --test tests/renderer/tileLocalSmokeToggle.test.mjs`
- `node --test tests/smoke/gpu-live-parity-mugshot.test.mjs`
- `npm run test:renderer`
- `npm run test:smoke`
