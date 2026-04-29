# Tile Coverage Contract: Synthetic Reference Anchors

Packet: `metadosis/coordination-packets/meshsplat-tile-coverage-compositor_2026-04-29.md`

Lane: `coverage-reference`

Status: reference contract and tests only. This lane does not change production GPU pipelines, renderer buffer layouts, radix/sort implementations, spherical-harmonic payloads, or the current center-tile alpha-density bridge.

## Scope

This contract pins the synthetic truth cases that sibling tile coverage lanes consume. It owns the case set and the expected coverage/compositing outcomes; it does not own the production tile-list data shape, optical-depth transfer policy, global/per-tile ordering backend, or GPU skeleton.

Executable probe: `src/rendererFidelityProbes/coverageWitness.js`

Tests:

- `tests/renderer/coverageReference.test.mjs`
- `tests/renderer/coverageWitness.test.mjs`

## Anchor Cases

`makeCoverageSyntheticCases()` exposes exactly five enumerable packet anchors:

| Case | Purpose | Pinned invariant |
| --- | --- | --- |
| `singleSplat` | Baseline projected Gaussian contribution. | Center coverage keeps activated opacity unchanged; one-sigma coverage is `opacity * exp(-2)`. |
| `extremeAnisotropicSplat` | Long, thin projected ellipse that is still a real Gaussian footprint. | Reference major/minor pixel radius ratio is greater than `900x` before any display floor; alpha must not be rewritten to hide anisotropy. |
| `glancingThinRibbon` | Glancing thin surface whose minor axis is legitimately subpixel. | With `viewportMinPx = 720`, `splatScale = 600`, and `minRadiusPx = 0.75`, the area inflation remains about `33.3333333x`; report this as coverage overreach, not opacity policy. |
| `denseTransparentSheetWithBrightBehind` | Transparent sheet that can suppress a bright behind-surface splat. | The bright behind layer has a nonzero but tiny source-over transfer weight: `0.6 * 0.92^72`, less than `0.002`. |
| `crossingTranslucentLayers` | Translucent layers whose correct color changes by sample-local depth order. | The red-front sample draws blue then red and resolves to `[0.505, 0.005, 0.26]`; the blue-front sample draws red then blue and resolves to `[0.255, 0.005, 0.51]` over the renderer clear color. |

`resolvedEllipticalSplat` remains as a non-enumerable compatibility alias for the earlier `coverageWitness` tests. It is not a sixth packet anchor.

## Boundaries For Sibling Lanes

`tile-coverage-builder` may consume the case geometry and propose tile coverage approximations, but it should not rename, remove, or silently relax the five anchors.

`alpha-transfer` may replace the transfer math with the packet-approved optical-depth contract, but it must preserve the observable intent of the dense-sheet and crossing-layer anchors: do not normalize away the bright behind-surface evidence, and do not make crossing layers order-invariant.

`tile-ordering` owns the eventual ordering shape. These cases only state the per-sample expected draw order and color for the synthetic crossing witness.

`gpu-tile-skeleton` may compile against provisional interfaces, but it should treat these outcomes as reference assertions rather than proof of production visual correctness.

## Production Implications

The mature renderer should move away from center-tile whole-splat opacity accounting toward projected Gaussian footprint coverage with local sample/tile contributions. The anchor cases make that pressure falsifiable:

1. A single splat must remain boring and exact.
2. Extreme anisotropy and glancing thin coverage must stay geometric, not get converted into opacity tuning.
3. Dense transparent sheets must expose their real transmittance instead of hiding evidence through normalization.
4. Crossing translucent layers need sample-local ordering evidence; a global outcome that makes both crossings look the same is not correct enough.
