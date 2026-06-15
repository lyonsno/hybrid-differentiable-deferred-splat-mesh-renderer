# Attractor: PlayCanvas-Style Tiled Compute Rasterizer

Source: PlayCanvas engine `src/scene/gsplat-unified/`, inspected 2026-06-15.
License: MIT (PlayCanvas engine). We are not copying code; this is architectural study.
Branch: `cc/conic-coverage-debug-0614`

## Problem

Our current pipeline does a global 8-pass radix sort over ALL tile refs (~377k at
default zoom, much more zoomed in / 4K). This is the dominant cost. PlayCanvas
renders 10M splats at 126fps. Their secret: no global sort at all. They project
once into a cache, bin into tiles, sort per-tile with size-adaptive strategies,
and rasterize from shared memory with 2x2 pixel quads per thread.

## Current Pipeline (ours)

```
count tiles → prefix sum → scatter refs + sort keys → 8-pass radix sort →
reorder refs → composite (1 pixel/thread, reads global storage per splat)
```

## Target Pipeline (PlayCanvas-inspired)

```
project → projection cache (one write per visible splat)
  ↓
tile count + pair write (fused: count intersections, write tileIdx|localOffset pairs)
  ↓
prefix sum over tile counts
  ↓
place entries (deterministic scatter from pairs, no atomics for slot assignment)
  ↓
classify tiles (small ≤4096 / large / rasterize lists, indirect dispatch args)
  ↓
sort: small tiles → bitonic sort (1 workgroup per tile)
sort: large tiles → bucket pre-sort → chunk bitonic (indirect dispatch)
  ↓
rasterize: 8x8 workgroup, each thread owns 2x2 pixel quad (4 pixels)
  - batched shared-memory loading (64 splats per batch from projection cache)
  - vectorized vec4f Gaussian evaluation across the quad
  - half-precision transmittance/color (f16 doubles ALU throughput)
  - per-splat power cutoff (skip exp() early)
  - front-to-back with transmittance early-out
```

## Decomposition into Attractors

### A1: Projection Cache

**What:** Single compute pass that projects every visible splat and writes packed
results to a contiguous buffer. 8 u32 stride per splat: screen center (2),
conic coefficients (3), packed color+opacity (2), power cutoff (1).

**Why:** Eliminates redundant projection. Currently every tile ref re-reads raw
position/scale/rotation/opacity from global storage. A splat touching 4 tiles
gets projected 4 times in the compositor. With a cache, it's projected once.

**Parallelizable:** Yes — fully independent of tile sort and rasterizer changes.
Can be developed and tested against current pipeline. The existing compositor
can read from projection cache instead of raw buffers as a drop-in swap.

**Test:** Project all splats, read back cache, compare screen centers / conic /
opacity against CPU reference projection. Pixel-exact not required; within
f32 tolerance.

**Estimated complexity:** Small. One new compute shader, one new buffer, plumbing.

---

### A2: Shared-Memory Batched Rasterizer (2x2 Quads)

**What:** Replace the current 1-pixel-per-thread compositor with an 8x8 workgroup
where each thread owns a 2x2 pixel quad (covering a 16x16 tile). Each batch
loads 64 splats from the projection cache into shared memory, then all 64
threads evaluate those splats against their quads using vectorized vec4f ops.

**Why:** This is the single biggest per-pixel performance win available.
- Shared memory: 64 splats loaded once, read 64 times (vs 64 global reads)
- 2x2 quads: 4 pixels per thread, vectorized as vec4f → ~4x ALU density
- half precision: f16 transmittance/color doubles throughput on Apple Silicon
- Per-splat power cutoff: skip exp() for splats that can't contribute

**Parallelizable:** Partially. Depends on A1 (projection cache) for the shared
memory loading pattern. Can be developed concurrently if the projection cache
buffer format is agreed upfront.

**Test:** Visual parity with current compositor at default zoom. Pixel-level
comparison of composite output between old and new rasterizer on the dessert
scene.

**Estimated complexity:** Medium. New WGSL shader with shared memory, 2x2 quad
logic, half-precision math. The compositor dispatch changes from
`ceil(W/8) x ceil(H/8)` to `numTiles` workgroups.

---

### A3: Deterministic Tile Binning (No-Atomic Scatter)

**What:** Replace our current atomic-scatter tile ref placement with PlayCanvas's
two-phase approach:
1. Fused count + pair-write: for each splat, iterate tiles, write
   `(tileIdx << 16 | localOffset)` pairs into a contiguous pair buffer.
   `localOffset` comes from a per-splat prefix sum of the splat's tile count.
2. Place entries: each thread reads its pairs and writes splat index into
   `tileEntries[prefixSum[tileIdx] + localOffset]`. No atomics needed.

**Why:** Eliminates atomicAdd nondeterminism in scatter. Currently the slot
assignment within a tile depends on thread scheduling, which means the same
splat can land at different positions in different frames → sort instability.
Deterministic placement = deterministic sort input = no flicker.

**Parallelizable:** Yes — independent of rasterizer. Can be developed against
existing sort/composite pipeline. The output format (per-tile sorted entry
lists) is the same.

**Test:** Verify that tile entry lists are bitwise identical across 10 consecutive
frames with static camera. Currently they may vary due to atomicAdd races.

**Estimated complexity:** Medium. Requires a pair buffer, per-splat prefix sum
of tile counts (or bitmask approach), and the place-entries shader.

---

### A4: Per-Tile Sort with Large-Tile Handling

**What:** Replace global radix sort with per-tile sorting:
- Small tiles (≤4096 entries): bitonic sort in shared memory, one workgroup
  per tile.
- Large tiles (>4096 entries): bucket pre-sort by logarithmic depth range,
  then chunk bitonic sort on each bucket.
- Tile classification pass: scan tiles, build small/large tile lists, write
  indirect dispatch args.

**Why:** Eliminates the 8-pass global radix sort entirely. Per-tile sort only
touches the refs that actually need sorting, and most tiles have far fewer
than 4096 refs. The global sort processes padding/sentinel entries and moves
data through global memory 8 times.

**Parallelizable:** Partially. The bitonic sort kernel is independent (can reuse
PlayCanvas's shared bitonic logic). The bucket pre-sort and tile classification
are tightly coupled. Depends on A3 for deterministic tile entry placement.

**Test:** Visual parity with global radix sort. Sort correctness: verify per-tile
entries are monotonically non-decreasing in depth after sort.

**Estimated complexity:** Large. Multiple new shaders, indirect dispatch plumbing,
tile classification logic, large-tile bucket cascade.

---

### A5: FXAA + CAS Post-Process Pass

**What:** Single compute pass after compositing: FXAA (edge smoothing) followed
by CAS (contrast adaptive sharpening). Reads composited rgba16float texture,
writes to final output.

**Why:** Gaussian splats are inherently soft (low-pass filter + Gaussian falloff).
Light sharpening crisps detail without amplifying noise. FXAA smooths any
remaining tile-boundary or quantization artifacts. Combined cost is ~0.2ms.

**Parallelizable:** Fully independent. Can be developed and tested against any
compositor output.

**Test:** Visual comparison with/without. No pixel-exact reference — this is a
quality/taste decision.

**Estimated complexity:** Small. ~50 lines of WGSL. Well-known algorithms.

---

## Concurrency Map

```
Lane 1 (can start now):
  A1: Projection Cache
  → then A2: Shared-Memory Rasterizer (depends on A1's buffer format)

Lane 2 (can start now):
  A3: Deterministic Tile Binning
  → then A4: Per-Tile Sort (depends on A3's output format)

Lane 3 (can start now, fully independent):
  A5: FXAA + CAS Post-Process

Composition order:
  1. A5 lands first (independent, small)
  2. A1 lands (projection cache, tested against current pipeline)
  3. A2 lands (rasterizer swap, uses A1)
  4. A3 lands (deterministic binning, tested against current sort)
  5. A4 lands last (per-tile sort replaces global radix, uses A3)
```

## What We Keep

- Morton-coded tile IDs (cache locality for both per-tile sort and rasterizer)
- Hierarchical prefix scan (needed for tile offsets in all approaches)
- Front-to-back compositing with transmittance cutoff
- Static camera skip (composite-only when viewProj unchanged)
- Bitmask parallel scatter ranking (if we keep global sort as fallback)

## What Dies

- Global 8-pass radix sort (replaced by A4)
- Per-pixel global storage reads in compositor (replaced by A1+A2)
- Atomic scatter slot assignment (replaced by A3)
- The per-tile sort shader (`gpu_tile_sort.wgsl`) — already dead, replaced by
  radix sort restore; would be superseded by A4's bitonic approach anyway.

## Risk

A4 is the largest piece and the one most likely to have subtle bugs (the per-tile
sort was the source of all our tile-boundary artifacts). However, A1+A2 alone
deliver a major speedup without touching the sort at all — projection cache +
shared-memory rasterizer cuts per-pixel memory traffic regardless of sort strategy.

If A4 proves too complex, the fallback is: keep global radix sort + A1 + A2 + A5.
That's still a large improvement over current state.

## PlayCanvas Reference Files

All MIT licensed, architectural study only:
- `src/scene/gsplat-unified/gsplat-compute-local-renderer.js` — pipeline orchestration
- `src/scene/shader-lib/wgsl/chunks/gsplat/compute-gsplat-local-tile-sort.js` — per-tile bitonic
- `src/scene/shader-lib/wgsl/chunks/gsplat/compute-gsplat-local-rasterize.js` — tiled rasterizer
- `src/scene/shader-lib/wgsl/chunks/gsplat/compute-gsplat-local-bitonic.js` — shared bitonic sort
- `src/scene/shader-lib/wgsl/chunks/gsplat/compute-gsplat-local-bucket-sort.js` — large-tile bucket cascade
- `src/scene/shader-lib/wgsl/chunks/gsplat/compute-gsplat-local-classify.js` — tile classification
- `src/scene/graphics/radix-sort/` — their global radix sort (portable + OneSweep backends)
