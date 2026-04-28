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

Opens a browser with a WebGPU canvas. Requires WebGPU support (Chrome 113+, Edge 113+, Firefox Nightly).

### Preprocessing pipeline

```bash
cd preprocessing
uv venv --python 3.13 .venv && source .venv/bin/activate
uv pip install -e .
uv pip install "mlx_sam3 @ git+https://github.com/Deekshith-Dade/mlx_sam3.git"

splat-oracle /path/to/scan.spz -o ./output
```

Requires Apple Silicon (MLX) for SAM3 segmentation. Outputs `oracle_output.npz` with corrected colors, material classifications, PBR parameters, and ghost masks.

## Project structure

```
src/                           — WebGPU deferred renderer (TypeScript)
  main.ts                        frame loop, stats overlay
  gpu.ts                         WebGPU device, canvas, resize
  camera.ts                      orbit + WASD camera
  buffers.ts                     buffer/texture creation helpers
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
```

## Status

The preprocessing oracle (Packet L) is feature-complete. Validated on real Scaniverse phone scans with SAM3 MLX running at 90ms/concept on M4 Max. The WebGPU renderer is scaffolded and being built out — see [FANOUT.md](FANOUT.md) for the coordination plan.

## License

MIT
