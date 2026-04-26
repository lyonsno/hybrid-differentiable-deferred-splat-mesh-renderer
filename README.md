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

```bash
npm install
npm run dev
```

Opens a browser with a WebGPU canvas. Currently renders a test cube — the rendering pipeline is being built out.

Requires a browser with WebGPU support (Chrome 113+, Edge 113+, Firefox Nightly).

## Project structure

```
src/
  main.ts          — frame loop, stats overlay
  gpu.ts           — WebGPU device, canvas, resize
  camera.ts        — orbit + WASD camera
  buffers.ts       — buffer/texture creation helpers
  timestamps.ts    — GPU timestamp query profiling
  math.ts          — minimal vec3/mat4 types
  shaders/         — WGSL shader sources
preprocessing/     — (planned) Python pipeline for SAM3 + VLM preprocessing
```

## Status

Early. The WebGPU scaffold is up. The rendering pipeline and preprocessing oracle are being built in parallel — see [FANOUT.md](FANOUT.md) for the coordination plan.

## License

MIT
