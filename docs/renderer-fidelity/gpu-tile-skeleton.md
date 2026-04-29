# GPU tile skeleton

The `gpu-tile-skeleton` lane exposes a non-optimized WebGPU structure for the mature tile compositor. It is not a visual-correctness claim and does not replace the live `splat_plate` renderer.

## Owned here

- `src/gpuTileCoverage.ts` defines the CPU-visible buffer sizes, binding numbers, tile-grid planning, dispatch planning, and frame-uniform packing for a tile raster pass.
- `src/gpuTileCoverageRenderer.ts` creates the WebGPU bind group layout, pipeline layout, and four compute pipeline entry points.
- `src/shaders/gpu_tile_coverage.wgsl` names the structural compute stages: `project_bounds`, `clear_tiles`, `build_tile_refs`, and `composite_tiles`.

## Consumed provisionally

- Coverage geometry and coverage weights come from the coverage-reference and tile-coverage-builder lanes.
- Optical-depth alpha transfer comes from the alpha-transfer lane through the `alphaParams` buffer.
- Tile-local ordering comes from the tile-ordering lane through the `orderingKeys` buffer.

The skeleton keeps these as separate bindings so the steward can swap in the settled sibling contracts without treating this lane as the authority for coverage, alpha, or ordering semantics.
