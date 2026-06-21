# MeshSplat Renderer — Agent Guidance

## Visual evaluation: use Kaminos

When working on this renderer, **evaluate visual output through Kaminos**, not the
standalone dev harness. The standalone page (`npm run dev` at `:5173`) has a single
directional light and black background — it is a debug surface, not a presentation
surface.

Kaminos (`~/dev/kaminos`, served at `:8090`) provides:
- HDR environment maps (Polyhaven: studio, outdoor, warehouse, esplanade, moonlit)
- GTAO compute ambient occlusion
- Scene persistence and asset browsing
- The full visual context your rendering work will be seen in

### How to smoke through Kaminos

**You start the servers — not the operator.** The operator is smoking multiple repos
concurrently. Start both servers, verify they're up, and hand them a URL.

```bash
# 1. Ensure renderer dev server is running
npm run dev &
# 2. Start Kaminos on a free port (check 8090-8099 for conflicts)
cd ~/dev/kaminos && python3 serve.py <port> &
# 3. Verify both are up
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:<port>/
# 4. Hand the operator: "open http://127.0.0.1:<port>"
```

Kaminos dynamically imports the overlay module from `http://127.0.0.1:5173/src/splatOverlay.ts`.
Hot reload works — save a renderer file and the overlay picks up the change.

Splat assets for the Kaminos browser live in `~/.local/state/kaminos/assets/splats/inbox/`.
If the asset you want smoked isn't there, symlink it in.

### When standalone smoke is sufficient

- Rasterizer correctness (sorting, tiling, projection)
- G-buffer plumbing (depth, normals, material channels)
- Automated CI regression (`npm run smoke:visual:real`)
- Performance profiling (timestamp queries, frame timing)

### When Kaminos smoke is needed

- Lighting/shading quality (BRDF, emissive, AO interaction)
- Postprocessing evaluation (tone mapping, AO, bloom)
- Asset-in-context evaluation (how does this splat look in a scene?)
- Overlay API changes (camera sync, viewport, model matrix)

## Overlay API contract

The integration seam is `src/splatOverlay.ts`. If you change this file, verify
that Kaminos still loads and renders correctly. Key contract points:

- `setCameraMatrices(view, proj, camPos)` — called by Kaminos every frame
- `setModelMatrix(mat4)` — world transform from Kaminos scene object
- `loadPly(url | ArrayBuffer)` — triggers WebGPU buffer rebuild
- `capabilities` — frozen route facts, consumed by Kaminos for UI decisions
- `sourceIdentity` — auto-tracked from load calls, consumed by Kaminos sidecar system

## Diaulos

The renderer handyman diaulos is `handy-renderman` (`dia-c14870ac-dfe8-4ee2-a572-940f2125616a`).
Use this identity when sending directives or reporting status related to this repo.
