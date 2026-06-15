# Handoff: Tiled Compute Rasterizer

Branch: `cc/conic-coverage-debug-0614` at `c8ee212`
Repo: `lyonsno/hybrid-differentiable-deferred-splat-mesh-renderer`
Worktree: `/private/tmp/hybrid-differentiable-defferred-splat-mesh-renderer-conic-coverage-debug-0614`
Date: 2026-06-15
Session: cc-conic-coverage-debug-0614

## What was built

A complete GPU tiled compute rasterizer for Gaussian splats, replacing the
previous broken per-tile bitonic sort and the slow 8-pass global radix sort.
The architecture is inspired by PlayCanvas engine's gsplat compute local
renderer (MIT license, architectural reference only — no code copied).

### Pipeline

```
project_splats → count_tile_refs → prefix_sum → scatter_tile_refs →
4-pass radix sort → reorder → classify_tiles →
small_tile_bitonic_sort (indirect) → bucket_pre_sort (indirect) →
chunk_bitonic_sort → composite (shared-memory 2×2 quad rasterizer)
```

### New shaders (8 WGSL files)

| Shader | Purpose |
| --- | --- |
| `gpu_project_splats.wgsl` | Project all splats → 8-u32 projection cache + depth buffer |
| `gpu_tile_splat_composite.wgsl` | Count (from cache), scatter (1-u32 entries), shared-memory batched rasterizer |
| `gpu_tile_classify.wgsl` | Classify tiles into small/large lists, write indirect dispatch args |
| `gpu_tile_depth_sort.wgsl` | Small tile bitonic sort (≤4096, log-depth quantization, 20-bit) |
| `gpu_tile_bucket_sort.wgsl` | Large tile bucket pre-sort (128 log-depth buckets → chunk packing) |
| `gpu_tile_chunk_sort.wgsl` | Bitonic sort per chunk from bucket cascade |
| `gpu_radix_sort.wgsl` | 4-pass radix sort (tile grouping only, not depth) |
| `gpu_prefix_sum.wgsl` | Hierarchical 3-pass exclusive prefix sum |

### Key architectural decisions

1. **Projection cache** — project once per splat per frame. All downstream
   passes read from cache. Eliminates redundant projection in count/scatter.

2. **1-u32 tile entries** — each tile entry is just a sortRank (projection
   cache index). 8× less memory than inline 8-u32 ref records. Enables
   4096-entry bitonic sort in 16KB shared memory.

3. **Two-level sort** — 4-pass radix sort groups entries by Morton tile ID
   (16 bits). Per-tile bitonic sort handles depth with full f32 precision
   via logarithmic quantization (per-tile adaptive range, 20 bits).

4. **Large-tile bucket cascade** — tiles with >4096 entries get:
   classify → 128 log-depth buckets → scatter to bucket order →
   greedy chunk packing (≤4096 per chunk) → bitonic sort per chunk.
   Eliminates tile-boundary artifacts on dense 760k-splat scenes.

5. **Shared-memory batched rasterizer** — 8×8 workgroup per 16×16 tile.
   Each thread owns a 2×2 pixel quad (4 pixels). Batches of 64 splats
   loaded into shared memory, vectorized vec4f Gaussian evaluation.

6. **Morton Z-order tile IDs** — bit-interleaved 2D coordinates for
   cache-coherent compositing. Also reduces sort-key fragmentation
   for splats near tile boundaries (eliminated inter-frame flicker).

7. **Indirect dispatch** — classify pass writes exact small/large tile
   counts to indirect dispatch buffer. Sort passes dispatch only what's
   needed. Zero wasted workgroups for scenes with no large tiles.

## Performance

94k splat dessert (1280×720, moving camera):
- Frame time: ~2-3ms
- GPU sort refresh: ~1-2ms

760k splat garden:
- Artifact-free at all zoom levels
- Handles tiles with >4096 overlapping splats via bucket cascade

## What works

- 94k dessert scene: clean, fast, no artifacts at any zoom
- 760k garden scene: artifact-free, all leaves/petals/stone resolved
- Morton tile IDs eliminate inter-frame flicker
- Log-depth quantization eliminates depth-shimmer on flat surfaces
- Indirect dispatch confirmed working in real Chrome
- `workgroupUniformLoad` for WGSL uniform control flow compliance
- All bitonic sort loop bounds are compile-time constants

## Known issues

1. **Static camera skip disabled** — `encodeCompositeOnly` causes visual
   "explosion" when camera stops. Likely buffer aliasing or stale projCache.
   The full pipeline runs every frame. Fix would recover sub-1ms static frames.

2. **Chunk sort not indirect** — `totalChunks` is written by bucket sort
   in the same command encoder, can't easily indirect-dispatch from it.
   Fixed at 256 workgroups with shader early-out. PlayCanvas uses a
   separate copy pass to work around this.

3. **Playwright headless Chrome** — `dispatchWorkgroupsIndirect` with
   `STORAGE | INDIRECT` buffer fails with "ImmediateAddressSpace" error
   in Playwright's bundled Chromium. Works in real Chrome. The smoke
   harness doesn't exercise `?renderer=compute` — it tests the plate
   renderer path.

4. **1 pre-existing test failure** — `runtimeCompactSourceBypass.test.mjs`
   alpha-density refresh test (from the alpha-density skip commit, not
   related to this work). 308/309 tests pass.

## Abandoned approaches

- **Per-tile bitonic sort with 512-ref cap** — different adjacent tiles
  keep different nearest-512 subsets, causing tile-boundary dark patches.
- **Per-tile streaming merge-sort** — replacing back half of shared memory
  with new batch and re-sorting. Buggy bitonic merge, same cap problem.
- **Subgroup-accelerated radix sort** — `subgroupAdd` histogram was slower
  than scalar `atomicAdd` due to 16-bucket loop overhead. Reverted.
- **16-bit linear depth quantization** — caused shimmer on flat surfaces.
  Fixed by logarithmic quantization with per-tile adaptive range.
- **Inline sort on global memory** — odd-even transposition swapping 8-u32
  records in global memory. Too slow and still had the cap problem.

## Next steps (from attractor doc)

- **A5: FXAA + CAS post-process** — Lane 3 (independent, can branch from `c8ee212`)
- **Static camera skip fix** — investigate buffer aliasing in composite-only path
- **Half-precision rasterizer** — f16 transmittance/color (doubles ALU throughput)
- **Color packing in projection cache** — pack RGB+opacity as 2 u32
- **Indirect dispatch for chunk sort** — copy pass pattern from PlayCanvas

## Files changed (from branch base)

```
new:  src/shaders/gpu_project_splats.wgsl
new:  src/shaders/gpu_tile_classify.wgsl
new:  src/shaders/gpu_tile_depth_sort.wgsl (rewritten)
new:  src/shaders/gpu_tile_bucket_sort.wgsl
new:  src/shaders/gpu_tile_chunk_sort.wgsl
mod:  src/shaders/gpu_tile_splat_composite.wgsl (major rewrite)
mod:  src/shaders/gpu_radix_sort.wgsl (minor — same shader)
mod:  src/shaders/gpu_prefix_sum.wgsl (hierarchical scan)
mod:  src/shaders/gpu_reorder_refs.wgsl (stride 1)
mod:  src/gpuTileSplatCompositor.ts (major rewrite — full pipeline)
mod:  src/gpuRadixSort.ts (4 passes)
mod:  src/gpu.ts (maxComputeWorkgroupStorageSize)
mod:  src/main.ts (tileSizePx 16, static skip disabled)
mod:  README.md
new:  docs/attractors/playcanvas-tiled-compute-rasterizer.md
```

## PlayCanvas reference files consulted

All MIT licensed. Architectural study only, no code copied.
- `src/scene/gsplat-unified/gsplat-compute-local-renderer.js`
- `src/scene/shader-lib/wgsl/chunks/gsplat/compute-gsplat-local-bitonic.js`
- `src/scene/shader-lib/wgsl/chunks/gsplat/compute-gsplat-local-rasterize.js`
- `src/scene/shader-lib/wgsl/chunks/gsplat/compute-gsplat-local-bucket-sort.js`
- `src/scene/shader-lib/wgsl/chunks/gsplat/compute-gsplat-local-classify.js`
- `src/scene/shader-lib/wgsl/chunks/gsplat/compute-gsplat-local-chunk-sort.js`
