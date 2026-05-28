# Final-Color Contributor Anchor Witness 0527 Summary

## Slice

Diagnostic-only witness repair for the GPU live parity mugshot. The mugshot now owns a canonical `traceAnchors` set, scrubs incoming trace/presentation params, keeps presentation anchors absent, and includes trace/presentation fields in CPU/GPU route identity comparisons.

## Primary Artifact

`smoke-reports/final-color-contributor-anchor-witness-0527/`

Status: PASS, closeable diagnostic witness.

Primary finding: `final-color-divergence`.

The safe run showed GPU live compositor input readback at the canonical anchors:

- `whole-render`: CPU 3 final-color rows, no contributors, compositor input missing; GPU 12 rows, contributors present, compositor input present.
- `dessert-close`: CPU 3 final-color rows, no contributors, compositor input missing; GPU 12 rows, contributors present, compositor input present.
- `porous-close`: CPU 3 final-color rows, no contributors, compositor input missing; GPU 12 rows, contributors present, compositor input present.

All three pairs still report `missing-final-color-contributors` at the ledger level because the CPU reference route does not yet provide contributor-bearing readback for the canonical diagnostic anchors.

## Post-Revert Confirmation

`smoke-reports/final-color-contributor-anchor-witness-0527-safe-rerun/`

Status: PASS, closeable diagnostic witness.

This rerun was captured after reverting the unsafe CPU-state probe. It reproduced the safe primary finding:

- Primary divergence: `final-color-divergence`
- Tile-ref divergence pairs: none
- Final-color divergence pairs: `whole-render`, `dessert-close`, `porous-close`
- CPU side: 3 final-color rows per pair, no contributors, compositor input missing
- GPU side: 12 rows per pair, contributors present, compositor input present

## Review Disposition Rerun

`smoke-reports/final-color-contributor-anchor-witness-0527-safe-rerun-2/`

Status: PASS, closeable diagnostic witness.

This rerun was captured after Aposkepsis review fixes. It preserved the same primary finding and now reports per-pixel row provenance separately from live compositor input evidence:

- Primary divergence: `final-color-divergence`
- Tile-ref divergence pairs: none
- Final-color divergence pairs: `whole-render`, `dessert-close`, `porous-close`
- CPU side: 3 final-color rows per pair, no contributors, no per-pixel contributors, compositor input missing
- GPU side: 12 rows per pair, live compositor contributors present, no per-pixel contributors, compositor input present

## Failed Probe Kept Local

`smoke-reports/final-color-contributor-anchor-witness-0527-rerun/` and `smoke-reports/final-color-contributor-anchor-witness-0527-fresh/` came from a reverted probe that carried trace anchors into CPU state. That probe made CPU compositor input appear, but blanked CPU visual captures. A fresh-server rerun reproduced the blank CPU frames, so the CPU-state route was reverted and must not be treated as a safe repair.

## Current Blocker

The GPU live side is now contributor-bearing at the selected anchors. The remaining blocker is a safe CPU reference diagnostic readback path that can expose comparable contributor evidence without perturbing or blanking the CPU visual reference.
