# GPU Arena Runtime/Backend Contract Report

- Branch/ref: `cc/gpu-arena-runtime-backend-contract` in `/private/tmp/hybrid-differentiable-defferred-splat-mesh-renderer-gpu-arena-runtime-backend-contract`.
- Summary: Added an honest arena-runtime evidence object to the renderer smoke surface and carried it through the tile-local visual smoke parser and report renderer. The smoke overlay now exposes requested/effective arena backend labels, CPU build duration, GPU dispatch duration placeholder, and explicit unavailable/skipped reasons without claiming live GPU contributor-arena success.
- Evidence: `window.__MESH_SPLAT_SMOKE__` now carries `arenaRuntime`; `scripts/visual-smoke/tile-local-comparison.mjs` preserves that evidence; `scripts/run-visual-smoke.mjs` prints the contract fields in comparison and diagnostics reports.
- Verification: `node --test tests/smoke/tile-local-diagnostics.test.mjs`; `node --test tests/renderer/tileLocalSmokeToggle.test.mjs tests/smoke/tile-local-comparison.test.mjs tests/smoke/tile-local-diagnostics.test.mjs`.
- Residuals: `gpuDispatchDurationMs` remains absent because this lane has not consumed the prior-art carrier into a live GPU contributor-arena dispatcher. Requested GPU backend smoke requests should still report explicit unavailability and fallback reasons rather than success.
- Carrier dependency: the prior-art carrier lane must land in the renderer before a real GPU contributor-arena effective backend can be surfaced; until then, the renderer contract must remain CPU-backed and explicit about GPU unavailability.
