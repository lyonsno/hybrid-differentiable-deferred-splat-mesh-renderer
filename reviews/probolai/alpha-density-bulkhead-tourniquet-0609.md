# Probolē: Alpha Density Bulkhead Tourniquet 0609

Review target: `f4e44f6..HEAD` on branch `cc/alpha-density-bulkhead-tourniquet-0609`.

Review context mode: contextual.

Required backend: ordinary Epanorthosis static review is sufficient for this slice; the change is shader/readback/probe alpha-transfer semantics, not Epistaxis live-substrate or public-forge work.

Implemented change:

- Source-frontier foreground support now preserves tile coverage as optical depth above one instead of capping support transfer weight to a single-opacity sample.
- The WGSL compositor path, `src/main.ts` readback mirror, and `src/rendererFidelityProbes/finalAccumulationTrace.js` mirror now share that uncapped support-weight law.
- `tests/renderer/tileLocalAlphaLedger.test.mjs` adds a fail-first contract for the forbidden cap and for dense support carrying optical depth.
- Visual evidence lives at `smoke-reports/alpha-density-bulkhead-tourniquet-0609/`.

Relevant non-diff contracts:

- `docs/renderer-fidelity/alpha-transfer.md`: coverage weight is optical depth; weights above one are real accumulated density and must not be normalized away.
- `tests/renderer/alphaTransfer.test.mjs`: dense transparent surface behavior depends on optical-depth transfer rather than linear/single-sample alpha.
- `tests/renderer/gpuTileCoverageSkeleton.test.mjs`: source-frontier class masks must survive into final alpha transfer.
- `tests/smoke/operator-witness-loop.test.mjs`: operator visual witness route identity must remain GPU arena, tile-local-visible, 16px/256 refs, real Scaniverse evidence.

Evidence already run by the implementation lane:

- Fail-first `node --test tests/renderer/tileLocalAlphaLedger.test.mjs` failed on the WGSL `min(..., 1.0)` cap before implementation.
- `node --test tests/renderer/tileLocalAlphaLedger.test.mjs`: pass, 3/3.
- `node --test tests/renderer/gpuTileCoverageSkeleton.test.mjs`: pass, 19/19 after normal renderer-test cache bootstrap.
- `npm run test:renderer`: pass, 280/280.
- `npm run build`: pass.
- `node --test tests/smoke/operator-witness-loop.test.mjs`: pass, 82/82.
- `npm run smoke:visual:real -- --operator-witness-loop --out-dir smoke-reports/alpha-density-bulkhead-tourniquet-0609 --timeout-ms 60000 --settle-ms 600`: pass.

Visual/evidence interpretation:

- The operator witness contact sheet is nonblank, real Scaniverse evidence, and materially changes close views versus `smoke-reports/alpha-fallthrough-tourniquet-0609/operator-witness/`.
- Pixel comparison against the prior alpha-fallthrough report showed about 17.9% changed pixels in `dessert-close-final-color.png` and about 40.5% in `porous-close-final-color.png`.
- Direct inspection: foreground mass is more opaque/coherent, but the renderer remains visibly blocky/tiled and not visually closed.

Non-goals:

- No exact plate parity.
- No final visual-quality claim.
- No retained-set, tile budget, camera, operator witness harness, or fallback-route rewrite.
- No CPU fallback revival or performance optimization.

Known residuals:

- Tile/pixel block texture remains.
- Alpha/coverage and support-set spatial quality remain incomplete.
- The visual smoke's slowest app frame stage is still `alpha-density`, up to about 141ms in the generated report.
