# GPU contributor arena skeleton

Packet: `metadosis/coordination-packets/meshsplat-tile-local-contributor-arena_2026-05-01.md`

Lane: `gpu-arena-builder-skeleton`

Status: scaffold only. This lane does not define CPU reference semantics, does not redefine the contributor record contract, and does not route first smoke through the incomplete GPU arena path.

## Shape

`src/gpuTileCoverage.ts` now exposes a GPU-facing contributor arena layout beside the existing flat tile-ref buffers:

- `createGpuTileContributorArenaLayout(plan)` derives arena header, prefix-count, and contributor-record storage from the existing tile grid and `maxTileRefs`.
- `getGpuTileContributorArenaDispatchPlan(plan)` names the intended count, prefix, and scatter stages separately from final tile compositing.
- `assertGpuTileContributorArenaCompatibility(plan, arena)` keeps the legacy tile-header and tile-ref capacities explicit so the current smokeable bridge can remain alive while the arena matures.

The scaffold deliberately reports `forcesFirstSmokeGpuArena: false`. Integration should keep the current CPU/reference or legacy bridge path as the correctness gate until the anchor contract and CPU reference builder have settled the observable contributor facts.

## Shader

`src/shaders/gpu_tile_contributor_arena.wgsl` is a separate count-prefix-scatter skeleton. Its TODOs point back to the anchor-owned contributor arena contract for projected coverage, depth/order, opacity/transmittance, and overflow semantics. The shader is not imported by `gpuTileCoverageRenderer.ts`, so adding it does not alter the visible compositor or the plate renderer.

## Compatibility Boundary

This lane owns GPU buffer layout and dispatch scaffolding only. It consumes the anchor contract once available, and it can consume CPU reference fixtures for parity later. It must not decide which contributors survive, how overflow is classified, or how visible final-color compositing interprets arena records.
