# GPU contributor arena count-prefix-scatter

Packet: `metadosis/coordination-packets/meshsplat-gpu-contributor-arena-scalability_2026-05-02.md`

Lane: `gpu-arena-count-prefix-scatter`

Status: first production count/prefix/scatter surface for deterministic projected contributor records. The live renderer still defaults to the current smokeable CPU/legacy bridge path until the runtime-bridge lane explicitly enables a GPU arena mode.

## Buffer Shape

The GPU arena keeps the CPU-owned contributor arena contract as the field authority:

- Header u32 fields: `contributorOffset`, `retainedContributorCount`, `projectedContributorCount`, `droppedContributorCount`, `overflowFlags`, `maxRetainedViewRank`.
- Header f32 fields: `minRetainedDepth`, `maxRetainedDepth`.
- Record u32 fields: `splatIndex`, `originalId`, `tileIndex`, `contributorIndex`, `viewRank`.
- Record f32 fields: `viewDepth`, `depthBand`, `coverageWeight`, `centerPx`, `inverseConic`, `opacity`, `coverageAlpha`, `transmittanceBefore`, `retentionWeight`, `occlusionWeight`, plus reserved padding for future deferred-surface evidence.

The storage buffers are padded to vec4-friendly strides:

- Header u32 stride: 8 words.
- Header f32 stride: 4 words.
- Record u32 stride: 8 words.
- Record f32 stride: 16 words.

This is a carrier layout for the anchor contract, not a new record contract.

## Stages

`src/shaders/gpu_tile_contributor_arena.wgsl` now has concrete count, prefix, and scatter stages:

- `clear_contributor_arena` clears header/count/cursor state per tile.
- `count_tile_contributors` atomically counts projected contributor records by tile.
- `prefix_tile_contributor_counts` writes exclusive tile offsets and count-derived header fields.
- `scatter_tile_contributors` atomically reserves tile-local slots and writes arena-shaped record fields.

The TypeScript deterministic builder in `src/gpuTileCoverage.ts` mirrors these stages for small synthetic parity tests and fails loudly when projected contributors exceed the reserved arena capacity. It does not choose retention policy, raise caps, change overflow classification, or promote the GPU arena onto the visible compositor path.

## Boundary

Owned here: GPU count/prefix/scatter layout, dispatch sizing, deterministic synthetic parity, and explicit budget failure.

Not owned here: visible compositor semantics, CPU reference semantics, cap-pressure policy beyond explicit budget failure, source decoding, camera controls, SH/view-dependent color, or mesh/deferred lighting.
