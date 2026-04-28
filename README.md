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

The current browser path is a real-splat smoke viewer, not the full deferred renderer yet. It:

- loads the committed Scaniverse PLY-derived smoke asset
- decodes packed position/color/opacity/radius rows plus original-ID, scale, and quaternion sidecars
- uploads separate WebGPU storage buffers for positions, colors, opacities, scales, rotations, and sorted IDs
- CPU-sorts splat IDs back-to-front from the current view matrix and refreshes them at a bounded cadence while navigating
- renders baked-color WebGPU splat plates as projected anisotropic ellipses
- exposes `window.__MESH_SPLAT_SMOKE__` so visual smoke tests can distinguish real splat evidence from a synthetic harness

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
  buffers.ts                     buffer/texture creation helpers
  splats.ts                      first-smoke manifest decode and GPU upload
  localPly.ts                    browser-side dropped PLY decoder
  splatSort.ts                   CPU back-to-front original-ID sort
  splatPlateRenderer.ts          WebGPU baked-color splat plate pipeline
  realSmokeScene.ts              first-smoke framing and evidence surface
  timestamps.ts                  GPU timestamp query profiling
  math.ts                        minimal vec3/mat4 types
  shaders/                       WGSL shader sources

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
```

## Status

The preprocessing oracle (Packet L) is feature-complete. Validated on real Scaniverse phone scans with SAM3 MLX running at 90ms/concept on M4 Max. First real-splat visual smoke is passing in the WebGPU viewer. The renderer is still a first-smoke approximation: splat anisotropy, projected conic math, clipping/culling, compositing, SH evaluation, and deferred G-buffer integration still need fidelity work before this should be treated as the production renderer. See [FANOUT.md](FANOUT.md) for the original coordination plan.

## License

MIT
