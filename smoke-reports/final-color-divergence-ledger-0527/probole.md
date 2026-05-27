# Probolē: Final Color Divergence Ledger 2026-05-27

## Review Target

Review branch `cc/final-color-divergence-ledger-0527` in:

`/private/tmp/hybrid-differentiable-defferred-splat-mesh-renderer-gpu-live-parity-mugshot-0525`

Changed files:

- `scripts/visual-smoke/gpu-live-parity-mugshot.mjs`
- `scripts/run-visual-smoke.mjs`
- `tests/smoke/gpu-live-parity-mugshot.test.mjs`
- `smoke-reports/final-color-divergence-ledger-0527/summary.md`
- `smoke-reports/final-color-divergence-ledger-0527/probole.md`

## Scope

This is a bounded witness/report slice. It should make the GPU live parity mugshot classify the surviving `final-color-divergence` with enough row-level evidence to decide the next repair. It must not mutate renderer math, source selection, camera behavior, GPU retention, alpha transfer, conic projection, ordering, or presentation semantics.

## Intended Behavior

The mugshot classifier should:

- keep comparing same-view CPU/reference and direct GPU-live final-color pairs;
- preserve the existing tile-ref divergence classification;
- expose a per-pair final-color ledger with CPU/GPU row counts, contributor presence, compositor-input readback status, trace/canvas parity status, and anchor mismatch IDs;
- report the current real-scene outcome as `missing-final-color-contributors` for all three same-view pairs;
- reject any capture with `captureFailure` so timeout screenshots cannot produce a false PASS.

## Evidence

Tests run:

```sh
node --test tests/smoke/gpu-live-parity-mugshot.test.mjs
npm run test:smoke
```

Real smoke run:

```sh
node scripts/run-visual-smoke.mjs --gpu-live-parity-mugshot --report-dir smoke-reports/final-color-divergence-ledger-0527-rerun --timeout-ms 120000
```

The clean rerun passed and reported:

- primary divergence: `final-color-divergence`
- tile-ref divergence pairs: none
- final-color divergence pairs: `whole-render`, `dessert-close`, `porous-close`
- final-color ledger for all pairs: `missing-final-color-contributors`
- CPU/GPU final-color rows for all pairs: `3 / 3`
- CPU/GPU contributors for all pairs: `no / no`
- CPU/GPU compositor input readback for all pairs: `missing / missing`

## Review Questions

Findings should focus on:

- false PASS risks in the classifier;
- ledger misclassification or misleading report text;
- accidental broadening into renderer behavior;
- fragile assumptions about current analysis JSON shapes;
- missing tests for the new witness contract.
