# Static Dessert Alpha/Conic Trace Parity Review Probolé

Review branch `cc/static-dessert-alpha-conic-repair-0530` against base
`origin/main` / `main` at `91612af`.

Scope:

- Review only the small witness trace parity patch:
  - `src/rendererFidelityProbes/gpuLiveAnchorTrace.js`
  - `tests/renderer/gpuLiveAnchorTrace.test.mjs`
- Do not require or review production renderer visual repair in this slice.
- Do not edit files, mutate Epístaxis state, run broad unrelated commands, or
  broaden into alpha/conic/retention repair.

Intent:

- The JS GPU-live anchor trace should classify source support using the same
  projected conic footprint law as the live WGSL tile-local builder.
- In particular, it should mirror the shader's bounded anisotropic minor-radius
  behavior and viewport footprint cap before deciding whether an anchor has
  projected support.
- The patch should tighten diagnostic truth without changing live renderer
  behavior or visual output.

Review questions:

- Does the JS projection now match `src/shaders/gpu_tile_coverage.wgsl` closely
  enough for footprint-cap/source-support classification?
- Are matrix, axis, eigenvalue, radius, min-radius, and footprint-cap
  conventions consistent with the shader?
- Is the synthetic test meaningful and would it have failed under the old
  uncapped trace projection?
- Does the patch accidentally broaden behavior beyond witness trace
  classification?
- Are any remaining parity gaps large enough that this trace can still
  materially misclassify static dessert visual-gap anchors?

Known local verification before review:

- `node --test tests/renderer/gpuLiveAnchorTrace.test.mjs tests/renderer/shaderRuntimeParity.test.mjs tests/renderer/tileLocalVisibleDiagnostic.test.mjs`
- `npm run build`
- Static dessert smoke:
  `node scripts/run-visual-smoke.mjs --static-dessert-witness --report-dir smoke-reports/static-dessert-alpha-conic-trace-parity-0530 --timeout-ms 120000`

Expected review output:

- Findings first, ordered by severity, with file/line references.
- If no blocking findings, state that clearly.
- Include residual risk and test-gap notes even if non-blocking.
