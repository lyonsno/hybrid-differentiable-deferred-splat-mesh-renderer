# Tile coverage builder

Lane: `tile-coverage-builder` in `metadosis/coordination-packets/meshsplat-tile-coverage-compositor_2026-04-29.md`.

Status: CPU/reference probe and contract shape only. This lane does not change production WebGPU pipelines, production shaders, alpha transfer policy, ordering policy, SH payload/rendering, or the current center-tile alpha-density smoke bridge.

## Scope

The mature compositor cannot assign a splat only to the tile containing its center. A projected Gaussian has support over an ellipse in screen space, and a tile compositor needs the splat in every tile that overlaps that support, with a geometry-only coverage weight per tile.

This lane adds `src/rendererFidelityProbes/tileCoverage.js`:

- `buildProjectedGaussianTileCoverage(...)` consumes projected Gaussian centers and 2D covariance in pixels.
- It computes a bounded axis-aligned tile range from a configurable sigma radius, defaulting to `3 sigma`.
- It samples each candidate tile with a deterministic grid and integrates normalized Gaussian density over the tile area.
- It returns sorted `tileEntries` shaped for GPU consumption: `{ tileIndex, tileX, tileY, splatIndex, originalId, coverageWeight }`.
- It also returns per-splat metadata: `centerTile`, `tileBounds`, `tiles`, and `totalCoverageWeight`.
- `summarizeCenterTileCoverageFailure(...)` reports how much coverage a center-tile-only path would drop.

The `coverageWeight` field is strictly a projected-geometry weight. It is not opacity, alpha transfer, ordering, brightness normalization, or a compositing result. Sibling lanes own those contracts.

For a full 2D covariance matrix, the axis-aligned support of the `sigma` ellipse uses the covariance support function: `radiusX = sigma * sqrt(Cxx)` and `radiusY = sigma * sqrt(Cyy)`. A non-zero `Cxy` rotates the density and changes per-tile weights, but it does not make the maximum marginal X/Y displacement larger than those support-function values. `tests/renderer/tileCoverage.test.mjs` pins this with a 45-degree anisotropic covariance so future changes do not silently collapse rotated splats back to axis-aligned assumptions.

## Data shape

The stable CPU output is:

```js
{
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  tileRows,
  sigmaRadius,
  samplesPerAxis,
  splats: [
    {
      splatIndex,
      originalId,
      centerPx: [x, y],
      covariancePx: { xx, xy, yy },
      centerTile: { tileX, tileY, tileIndex, coverageWeight },
      tileBounds: { minTileX, minTileY, maxTileX, maxTileY },
      tiles: [
        { tileIndex, tileX, tileY, splatIndex, originalId, coverageWeight },
      ],
      totalCoverageWeight,
    },
  ],
  tileEntries: [
    { tileIndex, tileX, tileY, splatIndex, originalId, coverageWeight },
  ],
}
```

`tileEntries` are sorted by `tileIndex`, then `splatIndex`, then `originalId`, so a future GPU skeleton can build prefix ranges or tile-local lists without relying on object insertion order.

## Center-tile failure witness

The fail-first center-tile witness uses a Gaussian centered at `[31, 31]` in a `32px` tile grid with `18px` standard deviation. The center lies in tile `(0, 0)`, but the `3 sigma` support overlaps six tiles in a `128 x 64` viewport.

The CPU probe reports:

| tile | coverage weight |
| --- | ---: |
| `(0, 0)` | `0.230954` |
| `(1, 0)` | `0.213890` |
| `(2, 0)` | `0.015628` |
| `(0, 1)` | `0.213890` |
| `(1, 1)` | `0.198087` |
| `(2, 1)` | `0.014473` |

Center-tile-only accounting would retain only `0.230954` of `0.886923` measured support and drop `0.655969`, or `73.9601%`, before alpha/order semantics even enter the discussion. That is the precise failure this lane contributes to the packet: center-tile accounting is geometrically insufficient.

## Consumed and deferred contracts

Consumed:

- `conicProjection.referenceJacobianCovariance` remains the upstream source of trustworthy projected Gaussian covariance when a caller needs to derive `covariancePx`.
- `coverageWitness` established that fixed display floors can over-cover thin/glancing splats; this probe reports tile coverage and does not change opacity to hide that issue.

Deferred to sibling lanes:

- `coverage-reference` owns the synthetic truth cases and final "correct enough" coverage outcomes.
- `alpha-transfer` owns how `coverageWeight`, opacity, and depth-ordered color become transmission/composited color.
- `tile-ordering` owns the order shape consumed by each tile.
- `gpu-tile-skeleton` owns buffers, shader skeletons, and pipeline adapters that consume this CPU shape.

## Verification

- `node --test tests/renderer/tileCoverage.test.mjs`
