# Deferred WebGPU Renderer for Gaussian Splats + Meshes

A unified deferred rendering pipeline that composites phone-scan Gaussian splats and triangle meshes under shared physically-based lighting. Built on WebGPU.

## What this does

Phone scans (via ARCore, LiDAR, etc.) produce Gaussian splat scenes with baked lighting — they look like photos frozen in time. This project makes them *relightable*: it extracts approximate PBR materials from the scan, distills the scene's global illumination into compact SH volumes, and renders everything in a single deferred pass with dynamic lights and soft shadows.

The key innovations:

- **SAM3 material segmentation** — Meta's Segment Anything Model 3 identifies materials by text prompt ("hardwood floor", "painted wall", "brushed steel"), breaking the lighting-vs-material degeneracy that defeats pure pixel-statistics approaches
- **VLM-guided inverse tone mapping** — a vision-language model reads the scene, identifies light sources and known-reflectance surfaces, and anchors a spline that recovers approximate linear radiance from phone-camera garbage
- **Ghost splat detection** — SAM3 identifies reflective surfaces; geometric plane fitting + depth culling removes phantom geometry behind mirrors and windows
- **Confidence-weighted G-buffer voting** — splats vote on surface properties (normals, albedo, roughness, metalness) with confidence weights; low confidence devolves to safe diffuse shading rather than sparkly nonsense
- **Hybrid splat+mesh compositing** — both geometry types share GI volumes, ambient occlusion, and shadow maps in one deferred composite

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full pipeline design.

## Quick start

### WebGPU renderer (standalone dev harness)

```bash
npm install
npm run dev
```

Opens a browser with a WebGPU canvas. Load PLY splat files via drag-and-drop, or
specify an asset with the `asset` query parameter:

```
http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
```

The standalone harness has a single directional light and flat ambient — useful for
debugging the rasterizer, but not representative of production visual quality.

### Visual evaluation through Kaminos (recommended)

For evaluating how rendering features look in context, use
[Kaminos](https://github.com/lyonsno/kaminos) (`~/dev/kaminos`) — the spatial asset
workbench that consumes this renderer as an overlay:

```bash
# Terminal 1: start the renderer dev server
npm run dev

# Terminal 2: start Kaminos
cd ~/dev/kaminos && python3 serve.py
```

Open `http://127.0.0.1:8090` and load a PLY. Kaminos imports the renderer overlay
from the Vite dev server and composites splats over a Three.js scene with HDR
environment maps, GTAO ambient occlusion, and full PBR scene context. Hot reload
works — save a renderer file and the overlay picks up the change.

### Compute compositor (GPU-sorted tile pipeline)

The compute compositor renders Gaussian splats entirely on the GPU via a tiled
compute pipeline with per-tile depth sorting:

```
http://127.0.0.1:5173/?renderer=compute
```

Pipeline:
```
project → count → prefix sum → scatter → 4-pass radix sort → reorder →
classify → small tile bitonic sort → large tile bucket pre-sort → chunk sort →
shared-memory 2×2 quad rasterizer
```

Key features:
- **Projection cache** — project once per splat, all downstream passes read from cache
- **Separate depth buffer** — full f32 depth per splat for per-tile sort precision
- **Two-level sort** — 4-pass radix sort groups by Morton tile ID, then per-tile
  bitonic sort with logarithmic depth quantization (20-bit, adaptive per-tile range)
- **Large-tile bucket cascade** — tiles >4096 entries get 128 log-depth buckets →
  scatter to bucket order → greedy chunk packing → bitonic sort per chunk. Handles
  760k+ splat scenes with zero tile-boundary artifacts.
- **Shared-memory batched rasterizer** — 8×8 workgroup per 16×16 tile, each thread
  owns a 2×2 pixel quad. Batches of 64 splats loaded into shared memory, vectorized
  vec4f Gaussian evaluation across the quad.
- **Morton-coded tile IDs** — Z-order curve encoding for cache-coherent compositing
- **Hierarchical prefix scan** — 3-pass scan (scan → scan_block_sums → propagate)
- **Front-to-back compositing** — transmittance cutoff at T < 0.001 for early-out
- **1-u32 tile entries** — 8× less memory per entry vs inline ref records

### Legacy tile-local modes

The older tile-local prepass and visible modes are still available:

```
http://127.0.0.1:5173/?renderer=tile-local
http://127.0.0.1:5173/?renderer=tile-local-visible
```

These use CPU-bridge-populated tile refs and are not the production path.

Smoke handoffs in this renderer repo must distinguish visual smoke from telemetry smoke. Visual smoke asks for image-quality or visual-regression judgment; telemetry smoke asks whether runtime evidence surfaces such as backend labels, trace arrays, timing counters, and observation manifests are alive and correctly populated. See `docs/smoke/smoke-handoff-contract.md`.

The viewer also accepts local binary little-endian PLY splat files by drag-and-drop onto the canvas. Drag-and-drop SPZ loading is not wired yet.

Requires WebGPU support (Chrome 113+, Edge 113+, Firefox Nightly).

### Preprocessing pipeline

```bash
cd preprocessing
uv venv --python 3.13 .venv && source .venv/bin/activate
uv pip install -e .
uv pip install "mlx_sam3 @ git+https://github.com/Deekshith-Dade/mlx_sam3.git"

splat-oracle /path/to/scan.spz -o ./output
```

Requires Apple Silicon (MLX) for SAM3 segmentation. Outputs `oracle_output.npz` with corrected colors, material classifications, PBR parameters, and ghost masks.

## First-smoke pipeline

The browser path loads real Scaniverse PLY-derived splat assets. With `?renderer=compute`,
the full GPU compute pipeline handles projection, tiling, sorting, and compositing.

The default (no query param) renders via the legacy splat plate path with CPU depth-key
sorting and WebGPU bitonic sort. The compute path is the production direction.

Both paths:
- load the committed Scaniverse PLY-derived smoke asset
- decode packed position/color/opacity/radius rows plus original-ID, scale, and quaternion sidecars
- upload separate WebGPU storage buffers for positions, colors, opacities, scales, rotations, and sorted IDs
- expose `window.__MESH_SPLAT_SMOKE__` so visual smoke tests can distinguish real splat evidence from a synthetic harness

To export a local Scaniverse/3DGS PLY into the first-smoke manifest shape:

```bash
env PYTHONPATH=preprocessing uv run --no-project --with numpy --with plyfile --with spz \
  scripts/export_scaniverse_ply_first_smoke.py /path/to/scan.ply \
  --output smoke-assets/my-scan \
  --asset-name my-scan
```

## Project structure

```
src/                           — WebGPU deferred renderer (TypeScript)
  main.ts                        frame loop, scene replacement, stats overlay
  gpu.ts                         WebGPU device, canvas, resize
  camera.ts                      orbit, cursor zoom, view-relative keyboard camera
  gpuTileSplatCompositor.ts      compute compositor: full pipeline orchestration
  gpuRadixSort.ts                4-pass GPU radix sort (tile grouping)
  splatPlateRenderer.ts          WebGPU baked-color splat plate pipeline (legacy)
  splatSort.ts                   CPU depth-key generation and settle cadence
  realSmokeScene.ts              first-smoke framing and evidence surface
  timestamps.ts                  GPU timestamp query profiling
  shaders/
    gpu_project_splats.wgsl        projection cache + depth buffer writer
    gpu_tile_splat_composite.wgsl  count, scatter, shared-memory 2x2 quad rasterizer
    gpu_tile_classify.wgsl         tile classification (small/large tile lists)
    gpu_tile_depth_sort.wgsl       small tile bitonic sort (≤4096 entries)
    gpu_tile_bucket_sort.wgsl      large tile bucket pre-sort (128 log-depth buckets)
    gpu_tile_chunk_sort.wgsl       chunk bitonic sort for bucket-sorted chunks
    gpu_radix_sort.wgsl            histogram + stable bitmask scatter
    gpu_prefix_sum.wgsl            hierarchical exclusive prefix sum
    gpu_reorder_refs.wgsl          tile entry reorder by sorted permutation
    splat_plate.wgsl               legacy plate vertex/fragment shader

docs/
  attractors/                    architectural direction documents
    playcanvas-tiled-compute-rasterizer.md  next-gen pipeline plan

preprocessing/                 — Python oracle pipeline
  splat_oracle/
    loader.py                    SPZ + PLY → SplatCloud (handles SH/opacity space conversion)
    spz_compat.py                SPZ native extension import shim
    camera.py                    harvest view camera generation
    harvest.py                   software splat rasterizer (mlx-splat for Metal)
    materials.py                 material vocabulary + physical priors database
    segmentation.py              SAM3 MLX text-prompted segmentation → splat majority vote
    ghost.py                     reflective surface detection → plane fit → depth cull
    tone_mapping.py              VLM scene read + material-anchored inverse tone map
    material_solve.py            albedo/roughness/metalness constrained by semantic priors
    cli.py                       end-to-end pipeline entry point

scripts/
  export_scaniverse_ply_first_smoke.py
  run-visual-smoke.mjs
```

## Verification

```bash
npm test
npm run build
npm run smoke:visual:real
npm run smoke:visual:real -- --tile-local-comparison --out-dir /tmp/tile-local-visual-perf-comparison
npm run smoke:visual:real -- --static-dessert-witness --out-dir /tmp/static-dessert-witness
```

When reporting smoke results, include the smoke kind, the decision requested, the expected visual delta, and the evidence surface. A telemetry-only branch may be mergeable while the renderer remains visually bad; do not ask for human visual approval unless the branch claims a visual delta.

Telemetry handoffs can make that explicit in the harness:

```bash
npm run smoke:visual:real -- --smoke-kind telemetry --decision-requested "confirm anchor traces are populated" --expected-visual-delta "none expected" --evidence-surface "analysis.json tileLocal.perPixelProjectedContributors"
```

## Status

The compute compositor (`?renderer=compute`) is the current production path.
Fully GPU-driven: projection, tiling, sorting, and compositing run entirely in
WebGPU compute shaders with no CPU readback stalls. Artifact-free on both
94k-splat Scaniverse dessert and 760k-splat garden scenes.

Architecture inspired by PlayCanvas engine's gsplat compute local renderer
(MIT license, architectural reference — no code copied).

Performance (94k splats, 1280×720, moving camera):
- ~3.6ms frame time
- 760k splats: artifact-free, handles tiles with >4096 overlapping splats
  via bucket cascade

Pipeline landed on this branch:
- **Projection cache** — project once per splat, separate depth buffer
- **Two-level sort** — 4-pass radix sort for tile grouping + per-tile bitonic
  depth sort with 20-bit logarithmic quantization (adaptive per-tile range)
- **Large-tile bucket cascade** — classify → bucket pre-sort (128 log-depth
  buckets) → chunk bitonic sort. Eliminates tile-boundary artifacts on dense scenes.
- **Shared-memory batched rasterizer** — 2×2 pixel quads, 64-splat batches
  loaded into shared memory, vectorized vec4f Gaussian evaluation
- **Morton Z-order tile IDs** — cache-coherent compositing and stable sort
- **Hierarchical prefix scan** — 3-pass scan scaling to 4K tile counts
- **1-u32 tile entries** — 8× less memory than inline ref records

Known remaining work:
- Static camera skip (disabled — buffer aliasing needs investigation)
- Indirect dispatch for sort passes (Chromium feature gate)
- FXAA + CAS post-process pass (Lane 3)

The preprocessing oracle (Packet L) is feature-complete. Validated on real
Scaniverse phone scans with SAM3 MLX running at 90ms/concept on M4 Max.

## License

MIT
