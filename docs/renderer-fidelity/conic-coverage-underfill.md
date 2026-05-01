# Conic Coverage Underfill: Tile-Integral Double Attenuation

Packet: `metadosis/coordination-packets/meshsplat-tile-local-occlusion-coverage-convergence_2026-05-01.md`

Lane: `conic-coverage-underfill`

Status: production shader repair plus bounded renderer tests. This lane does not redefine alpha transfer, contributor retention, tile output clearing, global opacity, global brightness, camera framing, or source asset decoding.

## Finding

The tile-local visible compositor already receives inverse-conic parameters for each retained tile ref and evaluates the per-pixel Gaussian response in WGSL:

```text
exp(-0.5 * mahalanobis2)
```

Before this repair, that sample-local response was multiplied by `tileCoverageWeights[selectedRefIndex]`. Those tile coverage weights are integrated Gaussian mass over a tile. They are useful geometry evidence for tile admission, ordering pressure, and contributor retention, but they are not the sample-local pixel response.

At a splat center, the bounded conic reference says the pixel response is `1`. Multiplying by the tile integral can drive that center response below `0.5` for normal `32px` tiles and an `8px` Gaussian, before alpha transfer sees the sample. Dense foreground splats therefore become too transparent even when the projected conic itself is correctly shaped.

## Repair

`src/shaders/gpu_tile_coverage.wgsl` now feeds the sample-local conic response directly into the existing optical-depth transfer:

```text
pixelCoverageWeight = conic_pixel_weight(alphaParam, conicParam, pixelCenter)
coverageAlpha = 1 - (1 - sourceOpacity) ^ pixelCoverageWeight
```

This preserves the alpha-transfer policy exactly. The change is only which conic coverage weight the visible pixel path supplies to that policy.

## Boundaries

Still owned by sibling or earlier lanes:

- Tile-list and contributor retention may continue using `tileCoverageWeights` as per-tile geometry evidence.
- Alpha transfer remains the optical-depth rule from `docs/renderer-fidelity/alpha-transfer.md`.
- The fix does not restore scalar-radius overcoverage; anisotropic falloff still uses `xx`, `xy`, and `yy` inverse-conic terms.
- Tile-local clear/resolve behavior and block artifact policy are unchanged.

## Executable Evidence

`tests/renderer/conicCoverageUnderfill.test.mjs` pins both parts of the contract:

- a fail-first fixture where the per-tile integral is below `0.5` while the conic center sample should be `1`;
- a WGSL assertion that the visible compositor uses `pixelCoverageWeight = conic_pixel_weight(...)` and does not multiply `tileCoverageWeights[selectedRefIndex]` into that response.
