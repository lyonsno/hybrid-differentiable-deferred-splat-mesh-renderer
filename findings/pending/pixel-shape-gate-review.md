# Pixel Shape Gate Review Findings

## Gate: pixel-witness-shape-guillotine
## Branch: cc/pixel-shape-integration-0502 @ 3faa446
## Reviewer: Castrator Epistemic Reach (shape-gate-review lane)

## Material Findings

### Finding 1: Unit tests exercise synthetic PNGs, not the real renderer -- the gate only fires under opt-in browser smoke

- **Category**: fake-renderer-bypass
- **Severity**: material
- **Evidence**: `tests/smoke/pixel-shape-gate.test.mjs` lines 1-300+. All 14 "unit layer" tests construct synthetic PNGs using `makePng()` helper functions (circle, ribbon, diagonal ellipse, flooded PNG) and feed them to `analyzeShape()`. The browser smoke layer that would actually render through the real WebGPU path is gated behind `BROWSER_SMOKE=1` (line: `const BROWSER_SMOKE = process.env.BROWSER_SMOKE === "1"`). When `BROWSER_SMOKE` is not set, a placeholder test always passes: `"browser smoke tests skipped: set BROWSER_SMOKE=1..."`.

  The `pixel-shape-harness.test.mjs` similarly constructs synthetic PNGs via `makeFatBlobPng()` and `makeThinRibbonPng()` -- these are CPU-generated test images, not renderer output. The fail-first demonstration (old smoke passes fat blob, new gate rejects it) proves the analyzer can discriminate shapes, but it proves this on a CPU-generated PNG, not on a renderer-produced PNG.

  The only path that actually renders through the real WebGPU renderer requires manual opt-in (`BROWSER_SMOKE=1` + a running Vite dev server). There is no evidence this has ever been run -- it was not part of the automated test suite that validated the integration.

- **Would this have caught the known failure?**: No. The default test suite (`npm run test:smoke` or `npm run test:shape-gate` without env vars) runs only the unit layer, which tests `analyzeShape()` on CPU-generated PNGs. A renderer that produces wrong shapes would pass all automated tests. The gate exists but is never activated by default.
- **Recommendation**: The browser smoke layer must be runnable in CI or at minimum be demonstrated as having passed at least once on this branch. Without evidence that the real renderer's output has been captured and analyzed, the gate is an analyzer test, not a renderer test. The thesis anti-evidence item "A CPU-only image generator or alternate fake renderer is built and called 'pixel truth'" is partially triggered: the unit tests use CPU-generated PNGs as the primary verification surface.

### Finding 2: Alpha density compensation uses wrong splatScale for shape-witness fixtures

- **Category**: internal-value-assertion (affects rendered pixel output)
- **Severity**: material
- **Evidence**: `src/main.ts` `replaceSplatScene()` function, line ~248-256. The `writeAlphaDensityCompensatedOpacities()` call hardcodes `REAL_SCANIVERSE_SPLAT_SCALE` (3000) regardless of whether the scene is a shape-witness fixture. The same bug appears at line ~435 in the render-loop alpha density refresh. However, the plate renderer uniform write at line ~454 correctly uses `activeSplatScale` (600 for shape-witness, 3000 for Scaniverse).

  This means: the opacity buffer is computed using splatScale=3000 (which affects projected area estimates for density compensation), but the shader renders using splatScale=600. The mismatch means synthetic fixtures may receive incorrect opacity compensation, potentially making opaque foreground splats partially transparent or vice versa. This directly affects the dense-foreground suppression test.

- **Would this have caught the known failure?**: Unclear. The opacity mismatch could make foreground splats more transparent than intended in shape-witness mode, causing the dense-foreground fixture to show bright background bleed-through. Whether this matters depends on the magnitude of the density compensation effect at the fixture's splat scale. But it means the rendered pixels for shape-witness fixtures are not the same as what the same splats would produce under correct rendering parameters -- the gate is testing with a subtle rendering error baked in.
- **Recommendation**: `replaceSplatScene()` and the render-loop alpha density refresh should use `activeSplatScale` / `activeMinRadiusPx` instead of `REAL_SCANIVERSE_SPLAT_SCALE` / `REAL_SCANIVERSE_MIN_RADIUS_PX` when `shapeWitnessFixtureId !== null`. This is a one-line fix in two places.

### Finding 3: Dense-foreground browser smoke assertion does not actually compute foreground suppression

- **Category**: self-testing
- **Severity**: material
- **Evidence**: `tests/smoke/pixel-shape-gate.test.mjs`, the `foreground-suppression` case in the browser smoke switch statement (around line 250-280). The test calls `decodePngForSuppression(png)` which internally calls `await_sync_import_decodePng()`, which always returns `{ decodePng: null }` (the function body: `return { decodePng: null }`). This means `decoded` is always `null`, so the suppression assertion is silently skipped.

  Even if `decodePng` were available, the test does not have a background-only reference image to pass to `computeForegroundSuppression()`. Instead it falls back to a crude brightness check on the center patch (avg brightness < 200). This brightness check would pass if the foreground splats are dark, even if they are partially transparent and the bright background is bleeding through at moderate intensity. The fixture's stated invariant (`foregroundSuppressionRatio >= 0.7`) is never actually checked.

- **Would this have caught the known failure?**: No. The dense foreground transparency failure (bright background bleeding through opaque foreground) is the exact failure this fixture is supposed to catch. But the suppression ratio is never computed, and the fallback brightness check is too weak -- a partially transparent dark foreground over a bright background could easily produce an average brightness well below 200 while still being visibly wrong.
- **Recommendation**: Fix `decodePngForSuppression` to actually decode the PNG (it can import `decodePng` from `png-analysis.mjs` since that module is already loaded). Generate a background-only reference image by rendering the fixture with foreground splats removed (or use a solid bright-white reference). Assert the actual `foregroundSuppressionRatio` from `computeForegroundSuppression()` against the fixture's stated minimum.

### Finding 4: Near-plane slab tolerance (maxChangedPixelRatio <= 0.6) may be too loose

- **Category**: tolerance-blessed-wrong-shape
- **Severity**: material
- **Evidence**: `src/syntheticShapeFixtures.ts`, near-plane-slab fixture: `maxChangedPixelRatio: 0.6`. The fixture has a single splat at Z=-0.05 with scale 2.0x2.0, camera at Z=0.5 with near=0.1. The invariant says the splat must not flood more than 60% of the viewport.

  The known failure mode is a near-plane splat that fills the entire viewport (100% coverage). A threshold of 0.6 does reject a full-screen flood. But a splat covering 59% of the viewport would pass this gate -- and 59% of a 512x512 viewport (roughly 156,000 pixels) is a massive visual artifact that would be immediately obvious to a human as a "screen flood." The fixture is positioned only 0.55 units from the camera with radius 2.0 -- a correct renderer with proper near-plane handling should clip this significantly (the splat center is behind the near plane at 0.1). A passing result of 55% coverage would indicate seriously broken clipping.

- **Would this have caught the known failure?**: Only the most extreme case (>60% fill). A near-plane splat filling 50% of the screen -- still a gross visual failure -- would pass.
- **Recommendation**: Tighten `maxChangedPixelRatio` to 0.3 or 0.35. A splat whose center is behind the near plane and whose geometry barely extends past it should not produce more than ~30% screen coverage in a correct renderer. If the correct answer is actually higher, document why.

### Finding 5: Edge-on ribbon thicknessRatio tolerance (max 0.15) may pass the known spatula failure

- **Category**: tolerance-blessed-wrong-shape
- **Severity**: notable
- **Evidence**: `src/syntheticShapeFixtures.ts`, edge-on-ribbon fixture: `thicknessRatio.max: 0.15`. The splat has anisotropy ~60 (scales 1.2 vs 0.02). In a correct renderer, the projected edge-on ribbon should have a thicknessRatio well below 0.05. But the known human-visible failure is that "thin spatula/profile geometry remains too thick" -- the question is whether a misprojected spatula that appears, say, 3x too thick would have a thicknessRatio above 0.15.

  If the correct thicknessRatio for this fixture is ~0.02 (anisotropy 60 edge-on), then a 3x-too-thick spatula would be ~0.06 -- still well below 0.15. A 7x-too-thick spatula (~0.14) would still pass. Only a >7.5x thickness error would fail the gate.

  The `isShapeWithinRibbonThicknessBound` function in the harness uses a separate threshold (`maxThicknessFraction: 0.10` default) which measures vertical bounding extent, not the moments-based thicknessRatio. These are different metrics with different sensitivities.

- **Would this have caught the known failure?**: Depends on how thick the spatula actually is. If the known failure produces thicknessRatio > 0.15, yes. If the failure produces thicknessRatio 0.05-0.15 (which is still 2.5x-7.5x too thick and visually wrong), no.
- **Recommendation**: Tighten `thicknessRatio.max` to 0.05 or establish the actual correct thicknessRatio by running the browser smoke once and measuring. A 60:1 anisotropy edge-on should produce a very small thicknessRatio; 0.15 allows a lot of headroom for "too thick."

### Finding 6: No fixture tests the thin-spatula failure mode with a realistic multi-splat scene

- **Category**: missing-coverage
- **Severity**: notable
- **Evidence**: The known human-visible failure is "thin spatula/profile geometry remains too thick" in real Scaniverse scenes with thousands of splats. The edge-on-ribbon fixture tests a single highly anisotropic splat viewed perfectly edge-on. But real spatula failures may involve: (a) splats that are moderately anisotropic (not 60:1), (b) splats viewed at near-edge-on angles rather than perfectly edge-on, (c) collections of splats where individual splatulas accumulate into a thick band. A single perfect-edge-on 60:1 splat is the easiest case for the renderer to get right; the real failures are in the messy middle ground.

- **Would this have caught the known failure?**: Unclear. The single-splat fixture may or may not reproduce the specific rendering bug that causes the known spatula failure. If the bug is in the projection math (Jacobian computation), the single splat should expose it. If the bug is in how splats interact (alpha compositing, tile-local sorting), a single splat cannot expose it.
- **Recommendation**: Consider adding a multi-splat edge-on fixture with moderate anisotropy (5:1 to 10:1) at near-edge-on angles, which more closely matches the actual failure conditions.

## Immaterial Notes

### Note A: No beauty-test drift detected

The test suite stays cleanly within geometric shape discrimination. No test evaluates color accuracy, SH correctness, lighting quality, or Scaniverse visual parity. The packet non-goal boundary is respected.

### Note B: Renderer path is real -- not a CPU fake

The `src/main.ts` wiring correctly routes shape-witness fixtures through the full WebGPU tile-local compositor and plate renderer. The `splatAttributesFromFixture()` conversion produces real `SplatAttributes` objects. The renderer uses the same shaders, sort pass, and compositor as Scaniverse data. This is genuinely the same renderer path the human sees. The thesis anti-evidence item about a CPU-only fake renderer is NOT triggered for the renderer-path-integration layer -- the issue is that the test suite's default mode never actually exercises this path (Finding 1).

### Note C: Fixture data is independently defined, not derived from renderer code

The fixture splat attributes (positions, scales, rotations) are defined declaratively in `syntheticShapeFixtures.ts`. The expected invariants (thicknessRatio, aspectRatio, axisAngle) are independently specified geometric claims. The analyzer (`pixel-shape-analysis.mjs`) computes its own mask/moments analysis from raw pixels without consulting the fixture's source data. There is no self-testing circular dependency in the analysis path itself. The self-testing issue in Finding 3 is specific to the broken `decodePngForSuppression` function, not a systemic design flaw.

## Summary

This gate has the right architecture but is not yet firing. The unit test layer proves the analyzer can discriminate shapes on CPU-generated synthetic PNGs, and the renderer-path integration correctly routes fixtures through the real WebGPU pipeline. However, the gate's actual purpose -- catching renderer-produced wrong shapes -- is only testable via the browser smoke layer, which is opt-in and has never been demonstrated as having passed. Three of the five fixture invariants would be checked correctly if the browser layer ran (circular-mask, oriented-ellipse, thin-ribbon with caveats on tolerance). The dense-foreground suppression check is broken (never actually computes the suppression ratio). The near-plane slab tolerance is probably too loose. The alpha density compensation bug means shape-witness fixtures render with subtly wrong opacities.

The gate does NOT currently satisfy the packet thesis acceptance horizon: "npm run test:smoke (or a named shape-gate command) automatically fails a grossly misprojected edge-on splat, a screen-flooding near-plane slab, and a dense-foreground transparency leak." The automated test suite does not render anything through the real renderer by default, and the browser smoke layer has functional bugs in the suppression check. Material findings 1, 2, 3, and 4 must be addressed before the gate can claim to catch the known human-visible failures.
