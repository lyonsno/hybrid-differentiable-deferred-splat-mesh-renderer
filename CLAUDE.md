# MeshSplat Deferred Renderer — Agent Instructions

## Repo identity

Tiled compute WebGPU Gaussian splat rasterizer with deferred PBR lighting.
TypeScript + WGSL, Vite build. The renderer is consumed by Kaminos (`~/dev/kaminos`)
as an embeddable overlay via `src/splatOverlay.ts`.

## Dev setup

```bash
npm install
npm run dev          # starts Vite on http://127.0.0.1:5173
```

## Testing

```bash
npm test             # unit + renderer tests (28 tests)
npm run test:unit    # unit tests only
tsc                  # type check
```

## Visual smoke (standalone — Tier 1)

The standalone renderer loads PLY splat files via drag-and-drop or `?splat=` URL param.
It has a single directional light + flat ambient — no environment maps, no IBL.
This is the fast CI/regression gate ("does the rasterizer work at all").

```bash
npm run smoke:visual:real
```

## Visual smoke through Kaminos (Tier 2 — use this for visual evaluation)

For evaluating how rendering features actually look — emissive materials, postprocessing,
lighting quality — smoke through Kaminos. Kaminos provides HDR environment maps (Polyhaven),
GTAO ambient occlusion, scene graph, and the full presentation context.

Setup (two terminals):

```bash
# Terminal 1: start the renderer dev server
cd ~/dev/hybrid-differentiable-defferred-splat-mesh-renderer
npm run dev

# Terminal 2: start Kaminos
cd ~/dev/kaminos
python3 serve.py
```

Then open `http://127.0.0.1:8090` in a WebGPU-capable browser.
Load a PLY splat file (drag-and-drop or via the asset browser).
Kaminos automatically imports the renderer overlay from `http://127.0.0.1:5173/src/splatOverlay.ts`
and composites it over the Three.js scene with environment lighting.

**Default to Tier 2 when evaluating visual quality.** The standalone renderer's
single directional light is not representative of how the output will look in production.

## Key architecture facts

- **Deferred pipeline**: G-buffer (color, depth, oct-encoded normals, packed material, emissive) -> Cook-Torrance BRDF lighting pass
- **Overlay API** (`src/splatOverlay.ts`): The seam between this renderer and Kaminos. Exposes `setCameraMatrices`, `setModelMatrix`, `setViewport`, `loadPly`, `render`, `capabilities`, `sourceIdentity`.
- **Compute shaders**: 8 WGSL shaders in `src/shaders/` — projection, tiling, radix sort, bitonic sort, bucket cascade, compositing, deferred lighting
- **Preprocessing** (`preprocessing/`): Python pipeline — SAM3 segmentation, VLM inverse tone mapping, ghost detection, material solve. Requires Apple Silicon (MLX).

## Conventions

- Splat colors are sRGB in the G-buffer; linearize before BRDF, apply sRGB after tonemapping
- Y-flip for WebGPU NDC is in the viewProj; the covariance Jacobian uses a separate un-flipped view matrix (PlayCanvas convention)
- `PROJ_STRIDE` in projection shader = number of f32s per projected splat in cache
- PLY files use little-endian binary format; drag-and-drop decodes via `localPly.ts`
