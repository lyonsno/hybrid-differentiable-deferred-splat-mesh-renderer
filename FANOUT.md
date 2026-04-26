# Fanout Coordination Plan

## Dependency Graph

```
                    ┌──────────────────┐
                    │  A: WebGPU Core  │
                    │  (device, canvas, │
                    │   buffer utils)  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────────┐
     │ B: Splat   │  │ C: Mesh    │  │ D: Compute     │
     │ Loader +   │  │ Loader +   │  │ Infrastructure │
     │ GPU Sort   │  │ G-Buffer   │  │ (fullscreen    │
     └─────┬──────┘  └─────┬──────┘  │  dispatch,     │
           │               │         │  ping-pong)     │
           │               │         └───────┬─────────┘
           ▼               │                 │
     ┌────────────┐        │         ┌───────┴─────────┐
     │ E: Splat   │        │         │                 │
     │ G-Buffer   │◄───────┘         ▼                 ▼
     │ Voting +   │         ┌────────────┐    ┌────────────────┐
     │ Resolve    │         │ F: Bilateral│    │ G: SH Volume   │
     └─────┬──────┘         │ Blur +     │    │ Data Structures│
           │                │ Rescue     │    │ + Sampling     │
           ├───────────────►│            │    └───────┬────────┘
           │                └─────┬──────┘            │
           │                      │                   │
           ▼                      ▼                   ▼
     ┌────────────┐         ┌────────────┐    ┌────────────────┐
     │ H: Temporal│         │ I: Deferred│◄───│ J: Harvest +   │
     │ Merge +    │────────►│ Lighting   │    │ GI Bake        │
     │ History    │         │ Pass       │    │ (offline)       │
     └────────────┘         └─────┬──────┘    └────────────────┘
                                  │                   ▲
                                  ▼                   │
                            ┌────────────┐    ┌────────────────┐
                            │ K: Post-FX │    │ L: SAM3 +      │
                            │ + Tone Map │    │ VLM Pipeline   │
                            └────────────┘    │ (Python)       │
                                              └────────────────┘
```

---

## Work Packets

### Packet A: WebGPU Core Scaffold
**Blocks:** B, C, D (everything)
**Estimated effort:** 1 day
**Deliverable:** Working WebGPU app shell

- Device acquisition, canvas setup, resize handling
- Buffer/texture creation helpers
- Bind group layout factories (BG0-BG3 from architecture)
- Camera (orbit + WASD), projection matrices, uniform upload
- Frame loop with timestamp queries
- Hot-reload for WGSL shaders (dev ergonomics)

**Done when:** Spinning cube or colored quad renders with camera control and timestamp readout.

---

### Packet B: Splat Loader + GPU Radix Sort
**Blocked by:** A
**Blocks:** E, J
**Estimated effort:** 2–3 days
**Deliverable:** Loaded splats rendered as forward-pass colored ellipses, depth-sorted on GPU

- SPZ parser (decompress + decode into blob struct-of-arrays)
- PLY parser (position, SH, opacity, covariance/scale+rotation)
- Upload to GPU storage buffer
- GPU radix sort compute pipeline (key = view-space depth, value = splat index)
- Forward splat renderer: project blobs as screen-space ellipses via vertex shader, alpha-blend back-to-front using sorted order
- AABB generation per chunk, coarse frustum cull

**Done when:** Can load an SPZ/PLY phone scan and see the scene rendered correctly with proper depth ordering. No lighting — just baked colors.

---

### Packet C: Mesh Loader + G-Buffer
**Blocked by:** A
**Blocks:** E (for hybrid compositing), I
**Estimated effort:** 1–2 days
**Deliverable:** glTF/OBJ mesh rendered to deferred G-buffer

- glTF loader (positions, normals, UVs, PBR material)
- Standard deferred G-buffer render pipeline: write N_conf, Albedo, Mat, Depth
- Mesh frustum culling

**Done when:** Can load a mesh and inspect G-buffer outputs as debug visualizations.

---

### Packet D: Compute Infrastructure
**Blocked by:** A
**Blocks:** F, G, H, I
**Estimated effort:** 1 day
**Deliverable:** Reusable compute dispatch patterns

- Fullscreen compute dispatch helper (workgroup sizing for arbitrary resolution)
- Ping-pong texture pair abstraction (for bilateral/temporal chains)
- Texture readback for debug visualization
- Bind group swapping pattern for history buffers

**Done when:** Can dispatch a trivial compute shader that reads one texture and writes another, visualize result.

---

### Packet E: Splat G-Buffer Voting + Resolve
**Blocked by:** B, C (for compositing), D
**Blocks:** F, H, I
**Estimated effort:** 2–3 days
**Deliverable:** Splats write to G-buffer via voting, resolved into usable normals/albedo/PBR

- MRT render pipeline: NormalSum, AlbedoSum, MatSum, WeightSum
- Per-fragment weight computation (opacity × capped area × distance falloff)
- Normal estimation from splat orientation/covariance
- Resolve compute shader: normalize sums, compute initial confidence
- Splat vs. mesh compositing (prefer higher confidence / closer depth)
- Debug vis: confidence heatmap, normal map, albedo

**Done when:** A phone scan renders with resolved normals that look coherent (not random noise). Confidence map shows high values on solid surfaces, low on edges/gaps.

---

### Packet F: Bilateral Blur + Neighbor Rescue
**Blocked by:** D, E
**Blocks:** I
**Estimated effort:** 1–2 days
**Deliverable:** Denoised G-buffer with filled holes

- 3×3 depth-aware bilateral blur (normals, optionally albedo/mat)
- Neighbor rescue with two-lobe clustering (ring r=2–3, split by dot with median, pick heavier lobe)
- Edge grow (every Nth frame, expand strong pixels into invalid holes)
- Optional unsharp mask on normals where conf is high

**Done when:** Resolved normals are smooth on surfaces, sharp at edges, holes are filled. A/B comparison with/without shows clear improvement.

---

### Packet G: SH Volume Data Structures + Sampling
**Blocked by:** D
**Blocks:** I, J
**Estimated effort:** 1–2 days
**Deliverable:** Can create, upload, and sample SH volumes in compute/fragment shaders

- 3D texture creation (64³, RGB16F per SH coefficient, L2 = 9 coefficients)
- SH evaluation functions in WGSL (L2 RGB)
- Trilinear sampling of SH grids at arbitrary world positions
- Transmittance grid (6-direction per voxel) creation and sampling
- Debug vis: slice views of SH volumes, dominant direction visualization

**Done when:** Can upload a test SH volume and sample it correctly in a compute shader. Visualize a slice showing plausible directional variation.

---

### Packet H: Temporal Merge + History
**Blocked by:** D, E
**Blocks:** I
**Estimated effort:** 1–2 days
**Deliverable:** Temporally stable G-buffer with motion-aware blending

- Motion vector computation (camera-derived for static, per-splat centroid for moving)
- History reprojection (sample last frame's N_conf at reprojected UV)
- Reactive history mask (angular change × gradient → halve weight when reactive)
- History buffer management (ping-pong N_conf + velocity)

**Done when:** Slow camera orbits show temporally stable normals with rising confidence. Fast pans don't smear.

---

### Packet I: Deferred Lighting Pass
**Blocked by:** E, F, G, H (needs G-buffer + SH volumes)
**Blocks:** K
**Estimated effort:** 2–3 days
**Deliverable:** Fully lit scene from G-buffer + SH volumes + dynamic lights

- Fullscreen compute: sample GI_indirect + GI_direct1 at each pixel's world pos/normal
- Shadow map generation (depth from light, splats as oriented disc shadow casters)
- GI_direct1 × shadow visibility
- Dynamic point/directional light: Lambert + rough GGX
- SSAO/GTAO implementation
- SSDO-lite for dynamic indirect occlusion (8–12 hemisphere taps)
- Confidence-aware shading fallback (bend normal, lerp roughness toward 0.8)
- Spec-highlight oracle (¼-res SH rerender, luminance ratio check, hysteresis)

**Done when:** Scene is lit with SH-based ambient + at least one dynamic light with shadows. Moving a dynamic light visibly changes the scene. Confidence fallback prevents sparkle in low-conf regions.

---

### Packet J: Radiance Harvest + GI Bake (offline)
**Blocked by:** B (needs splat renderer), G (needs SH volume structures)
**Blocks:** I (provides the SH data to light with)
**Estimated effort:** 3–4 days
**Deliverable:** Baked SH volumes from a phone scan

- Multi-view capture system (16+ cameras, render to offscreen textures)
- Depth-aware blur pass (kill specular, keep diffuse)
- Direct/indirect classification (4 metrics + fusion, compute shader)
- Voxelization: project classified samples into SH grids with appropriate weights
- Transmittance grid construction (voxelize splat opacity)
- Additive propagation (2–3 hops, separable sweeps, transmittance-gated)
- Axis-aligned leak mitigation (26-neighbor directional weights)

**Done when:** Baked SH volumes produce plausible ambient lighting when sampled in the deferred pass. Indirect volume lights corners and under-surfaces. Direct1 volume captures dominant light direction. Visualized slices look physically reasonable.

---

### Packet K: Post-FX + Tone Mapping
**Blocked by:** I
**Estimated effort:** 1–2 days
**Deliverable:** Final image with post-processing

- ACES / AgX / Khronos PBR neutral tone mapping
- Bloom (threshold + downsample chain + upsample blend)
- Optional SSR (ray march in screen space using depth + roughness)
- Final composite to canvas

**Done when:** Scene looks good on screen. Bloom on bright lights. Tone mapping handles HDR range without blowout.

---

### Packet L: SAM3 + VLM Preprocessing Pipeline (Python)
**Blocked by:** B (needs splat loader to render harvest views)
**Blocks:** J (provides corrected radiance + material priors)
**Estimated effort:** 4–5 days
**Deliverable:** Offline Python tool that takes a phone scan and outputs: material-classified splats, corrected linear radiance, ghost splat mask

- Harvest view renderer (reuse splat loader, render to image files)
- SAM3 integration: run with material vocabulary, collect per-view masks
- SAM3 reflective surface detection + ghost splat identification
- Plane fitting for reflective surfaces, depth-based ghost culling
- VLM integration (structured prompt → scene lighting descriptor)
- Inverse tone mapping (monotonic spline fit, anchored by known-reflectance surfaces)
- Recursive refinement loop (re-render, re-query VLM, converge)
- Splat-to-material projection (majority vote across views)
- Material prior database (known albedo/roughness/metalness ranges per class)
- Output: augmented splat file with material class, corrected colors, ghost mask

**Done when:** Feed in a phone scan of a room, get back material-segmented splats with corrected radiance. Visual comparison of raw vs. corrected shows plausible linear radiance. Ghost splats behind mirrors are culled.

---

## Parallelism Map

```
Week 1:
  Lane 1: [A] ──► [B: Splat Loader + Sort] ──► [E: Voting + Resolve]
  Lane 2: [A] ──► [C: Mesh Loader] ─────────────────┘(joins E for compositing)
  Lane 3: [A] ──► [D: Compute Infra] ──► [G: SH Volumes]

Week 2:
  Lane 1: [E] ──► [F: Bilateral + Rescue] ──► [H: Temporal]
  Lane 2: [B+G] ──► [J: Radiance Harvest + GI Bake]
  Lane 3: [B] ──► [L: SAM3 + VLM Pipeline] (Python, independent runtime)

Week 3:
  Lane 1: [F+G+H] ──► [I: Deferred Lighting]
  Lane 2: [L feeds corrected data to J] ──► [J completes]
  Lane 3: [I] ──► [K: Post-FX]
```

### Critical Path

**A → B → E → F → I → K** (the rendering spine)

Everything else feeds into this or runs alongside it. The SAM3/VLM pipeline (L) is the most novel piece but is deliberately decoupled — the renderer works with raw baked colors first, then gets dramatically better when L feeds it corrected data.

---

## First Moves (what to build today)

### Move 1: Packet A (WebGPU scaffold)
Get the app shell up. Device, canvas, camera, frame loop, timestamp queries, shader hot-reload. This unblocks everything.

### Move 2: Fork into three lanes immediately after A

**Lane 1 — Splat pipeline (B→E):** This is the critical path. Get splats loading, sorted, and rendering as colored ellipses within a day. Then immediately start voting + G-buffer resolve. This is where the novel rendering contribution lives.

**Lane 2 — Compute infra + SH volumes (D→G):** Small packet, unblocks the GI bake and deferred lighting. Fullscreen dispatch helpers, ping-pong textures, SH evaluation in WGSL.

**Lane 3 — SAM3 + VLM preprocessing (L):** Start the Python pipeline independently. It only needs harvest view images (which B can render). This is the riskiest/most novel piece — start proving it out early while the GPU pipeline matures.

### Move 3: Mesh loader (C) in parallel
Low effort, low risk. Standard deferred G-buffer for triangles. Can be done by a subagent or interleaved.

---

## Decision Points

1. **SH grid resolution:** Start at 64³. Drop to 32³ only if VRAM-constrained on target iGPUs. Monitor with timestamp queries.

2. **SAM3 execution environment:** Local (MLX on Mac? torch?) vs. API. Local preferred for iteration speed. Need to check SAM3 model availability and inference speed.

3. **VLM choice for inverse tone mapping:** Claude Vision vs. GPT-4V vs. Gemini. Structured output quality matters. Test with a few phone scans and pick whichever gives the most reliable scene lighting descriptors.

4. **Splat format priority:** SPZ first (Google's format, most phone scans) or PLY first (more universal)? SPZ probably — it's what people actually have.

5. **When to integrate L→J:** The renderer (A→B→E→F→H→I→K) should be demoable with raw baked colors before L is ready. L is an enhancement, not a gate.
