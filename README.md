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

### WebGPU renderer

```bash
npm install
npm run dev
```

Opens a browser with a WebGPU canvas. The default scene is the committed real Scaniverse first-smoke asset:

```
http://127.0.0.1:5173/
```

You can load another exported first-smoke manifest with the `asset` query parameter:

```
http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
```

### Compute compositor (GPU-sorted tile pipeline)

The compute compositor renders Gaussian splats entirely on the GPU via a tiled
compute pipeline with per-tile depth sorting:

```
http://127.0.0.1:5173/?renderer=compute
```

Pipeline: project all splats → count tile refs → GPU prefix sum → scatter refs
with radix sort keys → global radix sort (8-pass, 4-bit, stable) → reorder →
front-to-back composite with transmittance cutoff.

Key features:
- **Morton-coded tile IDs** — Z-order curve encoding for cache-coherent compositing
- **Global radix sort** — stable sort on `(mortonTileId << 16 | depthInverted)`, all refs sorted per tile
- **Hierarchical prefix scan** — proper 3-pass scan (scan → scan_block_sums → propagate)
- **Front-to-back compositing** — transmittance cutoff at T < 0.001 for early-out
- **Static camera skip** — sub-1ms frames when viewProj unchanged (composite-only, skip sort)
- **Bitmask parallel scatter ranking** — countOneBits-based stable ranking in scatter

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
  gpuTileSplatCompositor.ts      compute compositor: tiling, sort, composite pipeline
  gpuRadixSort.ts                8-pass GPU radix sort (4-bit, stable, bitmask scatter)
  splatPlateRenderer.ts          WebGPU baked-color splat plate pipeline (legacy)
  splatSort.ts                   CPU depth-key generation and settle cadence
  gpuSortPrototype.ts            WebGPU bitonic index sort for smoke-viewer draw order
  realSmokeScene.ts              first-smoke framing and evidence surface
  timestamps.ts                  GPU timestamp query profiling
  shaders/
    gpu_tile_splat_composite.wgsl  count, scatter, composite (Morton tile IDs)
    gpu_radix_sort.wgsl            histogram + stable bitmask scatter
    gpu_prefix_sum.wgsl            hierarchical exclusive prefix sum
    gpu_reorder_refs.wgsl          ref record reorder by sorted permutation
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
WebGPU compute shaders with no CPU readback stalls. Tested against 94k-splat
Scaniverse dessert scene and 760k-splat garden scene.

Performance (94k splats, 1280x720):
- Static camera: sub-1ms frames (composite-only, sort skipped)
- Moving camera: ~3ms frames
- 760k splats: 15-25ms median moving

Optimizations landed on this branch:
- Morton Z-order tile IDs for cache-coherent compositing
- Hierarchical 3-pass prefix scan (scales to 4K tile counts)
- Global radix sort with bitmask parallel scatter ranking
- Front-to-back compositing with transmittance cutoff (skips 80%+ occluded splats)
- Static camera detection (skip sort when viewProj unchanged)

Next: projection cache + shared-memory tiled rasterizer (PlayCanvas-inspired).
See `docs/attractors/playcanvas-tiled-compute-rasterizer.md` for the plan.

The preprocessing oracle (Packet L) is feature-complete. Validated on real
Scaniverse phone scans with SAM3 MLX running at 90ms/concept on M4 Max.

## License

MIT
