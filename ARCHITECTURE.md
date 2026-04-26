# Unified Deferred WebGPU Renderer: Gaussian Splats + Meshes with Physically Sane Relighting

Load scan-born splats and ordinary triangles, extract PBR materials from the scan via semantic segmentation, distill the scan's global illumination into compact SH volumes, then light everything together in a single deferred pass — with dynamic lights, soft shadows, and no ghost bounce when geometry moves or occludes. No NeRF. No ML training loops. Just shrewd raster + compute + modern vision models as preprocessing oracles.

---

## 0. High-Level Data Flow

```
Phone scan (SPZ/PLY)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  PREPROCESSING (offline, minutes not hours)              │
│                                                          │
│  1. Ingest → splat blob array + culling structures       │
│  2. Render harvest views (16+ cameras)                   │
│  3. SAM3 material segmentation (text-prompted)           │
│  4. VLM scene lighting read + inverse tone mapping       │
│  5. Ghost splat detection + culling                      │
│  6. Radiance harvest → SH volumes (indirect + direct1)   │
│  7. Material solve (albedo/roughness/metalness)          │
│     constrained by semantic priors                       │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  RUNTIME (real-time, 4ms target @ 1080p)                 │
│                                                          │
│  1. GPU radix sort → depth-ordered splat draw list       │
│  2. Splat G-buffer voting (normals, albedo, PBR, conf)   │
│  3. Resolve → bilateral blur → rescue → temporal merge   │
│  4. Mesh G-buffer (standard deferred)                    │
│  5. Spec-highlight oracle (suppress baked highlights)    │
│  6. Deferred lighting: SH indirect + shadow-modulated    │
│     direct + dynamic lights + SSAO                       │
│  7. Composite + tone map + bloom + optional SSR          │
└─────────────────────────────────────────────────────────┘
```

Both splats and triangles drink from the same GI wells, share AO and shadows, and land in one composite.

---

## 1. Asset Ingestion & Visibility

### 1.1 Loading

Supported formats: SPZ, PLY (phone scans).

Per splat ("blob"):
- `position` (float3)
- `radius_tensor` (float3x3 or compact axial)
- `orientation` (quat or 3× basis)
- `opacity` (float)
- `baked_color` (float3)
- `baked_SH` (L2 or L3)
- Placeholders for solved: `albedo`, `roughness`, `metalness`, `material_class`, `material_confidence`

Build tight AABB per chunk and a coarse spatial grid (2×2×2 minimum) for frustum culling.

### 1.2 Sorting & Draw Lists

**GPU radix sort** for back-to-front ordering. No CPU sorting. One compute pass per frame produces a depth-ordered index buffer from view-space splat depths.

Mesh assets: standard index/vertex buffers, uploaded once, frustum-culled per frame.

---

## 2. Semantic Preprocessing Pipeline

This is the novel contribution. Phone scans bake lighting, exposure, white balance, and tone mapping into every pixel. We undo that corruption using vision models as oracles before any radiance math happens.

### 2.1 Harvest View Capture

Render splats from ≥16 views for angular coverage: 6 cube faces + 2 diagonals + 8 inward-facing corners. Per view, output:
- Linear(ish) color (pre-correction)
- Depth
- Splat ID buffer (which splat owns each pixel)

### 2.2 SAM3 Material Segmentation

Run Meta SAM3 (Segment Anything Model 3, Nov 2025) on harvest views with a material vocabulary via text prompts. SAM3's open-vocabulary concept segmentation finds and segments all instances of each concept across all views in a single pass per concept.

**Material vocabulary** (extensible):
```
"hardwood floor", "carpet", "painted wall", "painted ceiling",
"concrete", "brick", "stone", "ceramic tile", "marble",
"glass window", "mirror", "metal fixture", "brushed steel",
"stainless steel", "chrome", "fabric", "leather", "plastic",
"wood furniture", "paper", "cardboard"
```

**Reflective surface vocabulary** (for ghost detection, see §2.4):
```
"mirror", "glass window", "reflective glass", "TV screen",
"polished metal", "chrome surface", "water surface"
```

**Projection back to splats:** For each SAM3 segment, collect all splat IDs that contributed pixels in that view. Majority-vote material class per splat across all views. Disagreements flag mixed-material boundaries → low material confidence.

**Long-tail handling:** Regions not captured by the vocabulary get sent to a VLM (Claude, GPT-4V, Gemini) for freeform identification. SAM3 handles the 80%; VLM handles the tail.

### 2.3 VLM-Guided Inverse Tone Mapping

Phone cameras apply nonlinear processing: auto-exposure, local tone mapping (HDR+), white balance, gamma. Every pixel is a lie. We use a VLM + material priors to recover approximate linear radiance.

**Pass 0 — Naive render.** Render cube maps from raw splat data. Looks like phone output because it is.

**Pass 1 — VLM scene read.** Feed cube maps to VLM. Structured query:
- Identify light sources (type, approximate direction, relative intensity)
- Estimate ambient level and dynamic range (stops)
- Flag clipped highlights, crushed shadows
- Estimate color temperature per source
- Returns a *scene lighting descriptor*

**Pass 2 — Constrained inverse tone map.** Using VLM priors + material anchors:
- SAM3-identified known-reflectance surfaces serve as virtual gray cards (e.g., "white painted ceiling" → albedo ~0.8 in linear → constrains the exposure curve at those pixels)
- Fit a monotonic spline mapping sRGB → approximate linear radiance, anchored by known-reflectance reference surfaces across multiple views
- Different image regions may need different curves (phone local tone mapping) — VLM identifies region boundaries

**Pass 3 — Recursive refinement.** Re-render with corrected radiance. Feed back to VLM: "Are light sources the right relative brightness? Are shadows the right depth?" Adjust curve. Convergence criterion: VLM stops flagging physically implausible intensity relationships. Usually 2–3 passes.

**Pass 4 — Corrected radiance feeds all downstream.** SH harvest, material solve, and GI volumes now operate on approximately linear data instead of tone-mapped garbage.

### 2.4 Ghost Splat Detection & Culling

Phone scans reconstruct reflections as real geometry — phantom rooms behind mirrors and windows. Three-stage detection:

**Stage 1 — SAM3 reflective surface detection.** Run SAM3 with reflective surface vocabulary on harvest views. Identifies which pixels correspond to mirrors, glass, screens.

**Stage 2 — Plane fitting.** For each detected reflective region, fit a plane to the frontmost splats in that segment (the actual mirror/glass surface).

**Stage 3 — Depth culling.** Any splat whose position places it behind the fitted reflective surface plane, within the segment's projection cone across views → ghost candidate → cull (zero opacity) or flag as unreliable.

**Stage 4 — Photometric inconsistency (catches residual ghosts).** During harvest, flag splats whose color varies across views in patterns that correlate with reflective surface visibility changes. Ghost splats appear/disappear/shift as the reflection source moves relative to the camera. This catches partial reflections in dark glass, wet floors, etc. that SAM3 misses.

Surviving low-confidence ghosts get overwhelmed by real geometry in the voting pipeline.

---

## 3. Radiance Harvest & GI Volumes

Now operating on corrected linear radiance from §2.3.

### 3.1 View Capture (post-correction)

Re-render from the same ≥16 views, now with corrected radiance. Per view: linear radiance, depth, splat ID. Run depth-aware blur (GPU compute) to kill specular while keeping diffuse bleed.

### 3.2 Direct vs. Indirect Classification

Per harvest sample, assign soft weight `w_dir ∈ [0,1]` (direct-ish) and `w_ind = 1 - w_dir` (indirect-ish) using four deterministic metrics:

**Metric 1 — Spatial high-frequency excess.** Depth-aware bilateral low-pass → high-pass residual. Direct specular and hard sun bands are spatially sharp; indirect is low-frequency.
- `S_hi = saturate(H' / k_hi)`, typical `k_hi ∈ [0.15, 0.35]`

**Metric 2 — View-variance spike.** Across all harvest views for a given splat, compute robust spread (MAD→σ). Large positive luminance deviation suggests view-dependent energy.
- `S_var = saturate(max(0, Z) / k_var)`, typical `k_var ∈ [2, 3]`

**Metric 3 — Achromatic whiteness push.** Compare sample chroma to per-splat diffuse chroma mode. Dielectric highlights trend toward light color / white.
- `S_white = saturate((W - k_white_min) / k_white_span)`

**Metric 4 — Shadow-edge evidence.** Downward luminance residual aligned with depth edges. Direct lighting produces shadows; indirect rarely produces sharp decreases aligned with geometry.
- `S_shad = saturate(H⁻ / k_shad) · saturate(‖∇z‖ / k_∇z)`

**Fusion:**
```
w_dir = saturate(α₁·S_hi + α₂·S_var + α₃·S_white + α₄·S_shad - β)
```
Defaults: `α₁=0.4, α₂=0.35, α₃=0.15, α₄=0.25, β=0.15`. Conservative: when ambiguous, energy stays in indirect.

Classification confidence: `κ_cls = max(S_hi, S_var, S_shad)` (exclude S_white — material-dependent).

### 3.3 Volumes & Encoding

Three 3D textures, 64³ default (32³ for constrained VRAM):

- **Transmittance grid T:** Per voxel, six axis-aligned transmittances (±X, ±Y, ±Z). Built by voxelizing splat opacity.
- **Indirect SH grid `GI_indirect`:** RGB Spherical Harmonics L2, accumulated with `w_ind` weights + hit counter.
- **First-bounce direct SH grid `GI_direct1`:** Same SH format, accumulated with `w_dir` weights.

### 3.4 Additive Propagation

Propagate each grid 2–3 hops via separable sweeps. Per voxel per direction: push SH energy to neighbor scaled by propagation fraction α and axis transmittance from T. **No global renormalization** — clamp per-voxel if needed. Let energy accrue naturally.

**Axis-aligned leakage mitigations** (pick 1–2):
1. 26-neighbor propagation with directional weights (cosine-mix the six stored axis transmittances)
2. Per-voxel structure tensor from splat density gradient → bias propagation against leak directions
3. Two-hop clamping: detect voxels where opposing-axis incoming wildly disagrees; clamp to median

Result: two compact SH bricks (indirect + first-bounce direct), diffuse-filtered by scene geometry, plus T for occlusion-aware lookups.

---

## 4. Per-Splat Material Solve

Now constrained by SAM3 semantic priors from §2.2.

### 4.1 Albedo

For each sample of splat s, form weighted ratio `r_i = C_i / max(L_ind_i, ε)` where `L_ind_i` = indirect grid evaluation at sample position/normal. Weight by `(1 - w_dir) · κ_cls`. Reject outliers (drop top/bottom 10–20% by luminance, any sample with `w_dir > 0.6`). Trimmed weighted mean → albedo.

**Semantic constraint:** If SAM3 identified the splat as a known material, clamp albedo to the plausible range for that material class (e.g., white paint → [0.7, 0.9], hardwood → [0.1, 0.3], concrete → [0.2, 0.4]). This breaks the lighting-vs-material degeneracy.

Bias guard: If effective sample count < 6, inherit original color, flag low confidence.

### 4.2 Roughness

Per view, per splat: find highlight candidate pixels (`w_dir > 0.7`, `S_hi > k_hi`). Cluster contiguous candidates (4-connect, reject < 3px). Compute second moments → principal axis lengths. Normalize by projected splat footprint → `σ̄`. Map: `α = saturate(k_α · σ̄)`, `roughness = √α`.

Aggregate across views with trimmed mean. No clusters → roughness = 0.75 (diffuse-leaning), low confidence.

**Semantic override:** Material class provides strong prior (polished marble → ~0.1, concrete → ~0.8). Image-moments refine within the prior range.

### 4.3 Metalness

Two cues:
1. **Specular tint correlation:** At highlight peaks, compare highlight chroma to solved albedo chroma. `ρ = 1 - ‖u_h - u_a‖₁`
2. **Diffuse presence near peak:** Low diffuse base around a highlight → metal-leaning.

Fusion: `m_cand = saturate(γ₁·ρ + γ₂·(1 - q₀.₂₅(w_dir)) - γ₀)`. Aggregate via max of medians.

**Semantic override:** SAM3 material class often resolves metalness directly ("brushed steel" → 1.0, "painted wall" → 0.0). Only run the heuristic when material class is ambiguous or low-confidence.

Guardrails: dark + rough → clamp metalness ≤ 0.2. Cap F0 for dielectrics at 0.08; metals F0 = albedo color.

---

## 5. Runtime Frame Loop

Theme: vote → denoise → stabilize → light.

### 5.0 Common Buffers

| Buffer | Format | Contents |
|--------|--------|----------|
| Depth | D32F | Camera depth |
| N_conf | RGBA16F | xyz=normal, w=confidence |
| Albedo | RGBA8 (or 16F for HDR) | rgb=baseColor |
| Mat | RG16F | x=roughness, y=metalness |
| Vel | RG16F | Screen-space motion vectors |
| NormalSum | RGBA16F | Vote accumulator: Σ(n·w) |
| AlbedoSum | RGB16F | Vote accumulator: Σ(albedo·w) |
| MatSum | RG16F | Vote accumulator: Σ(rough·w, metal·w) |
| WeightSum | R16F | Vote accumulator: Σ(w) |

### 5.1 Splat G-Buffer Voting

**Vertex:** Project each blob as a screen-space ellipse from radius tensor + orientation.

**Fragment:** Compute vote weight `w`:
- Larger screen area → capped so giants don't bulldoze
- Closer, more opaque → higher weight
- `w ∝ opacity × min(1, area_norm) × distance_falloff`

Write to MRT: accumulate NormalSum, AlbedoSum, MatSum, WeightSum. Write provisional depth (highest-weight contributor per pixel).

### 5.2 Resolve + First Confidence

Compute fullscreen: if `WeightSum > 0`: normalize all sums, compute `conf₀ = saturate(remap(WeightSum, w_min→0, w_max→1))`. Else mark invalid.

### 5.3 Depth-Aware Bilateral Blur

3×3 window. Ignore neighbors with depth jumps. Weight by normal similarity (dot) and neighbor confidence. Blur normals (re-normalize), average confidence. Albedo/Mat very lightly or leave crisp.

### 5.4 Neighbor Rescue

For low-confidence pixels: expand to ring (r=2–3). **Two-lobe clustering** instead of naive averaging — split neighbors by dot with median normal (deterministic k≤2), pick heavier lobe. Preserves corners.

### 5.5 Temporal Merge

Reproject last frame's N_conf via velocity. **Reactive history mask:** compute reactivity from angular change × gradient magnitude. If reactive → halve history weight (prevents smear on motion). Otherwise blend and boost confidence.

### 5.6 Edge Grow

Every 8th frame, strong isolated pixels expand by 1 texel into nearby invalid holes. Clamps micro-cracks.

### 5.7 Mesh G-Buffer

Standard deferred raster for triangles to same buffers. Splat vs. mesh collision: prefer higher confidence (or closer depth on tie).

### 5.8 Specular-Highlight Oracle

Re-render touched splats at ¼-res, SH-only. Per full-res pixel, if `Y_current / (Y_baked + ε) > t_spec` AND `S_hi > k_hi` AND `w_dir > 0.5` → suppress analytic specular. Use hysteresis (±0.1) across frames to avoid flicker.

### 5.9 Deferred Lighting

**5.9.1 Indirect GI:**
`L_ind = sample_SH(GI_indirect, world_pos, normal)` modulated by SSAO and short-range transmittance occlusion from T. Also consider indirect specular from rough-convolved SH — nearly free, kills "everything looks matte."

**5.9.2 First-bounce direct (scan-born) with real-time occlusion:**
`L_dir1 = sample_SH(GI_direct1, world_pos, normal) × V_shadow`. New occluder blocks original source → V≈0 → no ghost bounce.

**5.9.3 Dynamic direct lights:**
Lambert + rough GGX. Mask out analytic specular where oracle says baked highlight exists. Shadows: shadow maps / VSM / PCSS.

**5.9.4 Ambient occlusion:**
SSAO/GTAO modulates indirect. Optionally multiply by transmittance-grid term near surface normal.

**5.9.5 Dynamic occlusion of static indirect:**
- **SSDO-lite:** 8–12 hemisphere taps, depth-aware, bent-normal output → attenuate `L_ind` by `V_ssdo`. Cheap, coherent with G-buffer.
- **Dynamic voxel injection (optional):** Voxelize moving meshes into low-res occupancy, update T locally, 1–2 local propagation hops. True volumetric indirect occlusion.

**5.9.6 Confidence-aware shading:**
When confidence < 0.3: bend normal 20–30% toward geometric fallback, lerp roughness toward 0.8, cap F0 toward 0.04. Low confidence devolves to "more diffuse, less mirror" — always the safer failure.

### 5.10 Composite & Post

```
C = (L_ind + L_dir1) × Albedo + L_dynamic_spec + L_dynamic_diffuse
```
Tone map, bloom, optional SSR (G-buffer has everything needed).

---

## 6. WebGPU Implementation

### 6.1 Bind Groups

| Group | Contents |
|-------|----------|
| BG0 (Frame) | Camera matrices, viewport, time, toggles |
| BG1 (Scene) | GI volumes (indirect, direct1), Transmittance T, shadow maps, light list |
| BG2 (Geometry) | Splat storage buffer (struct-of-arrays), mesh material table, textures |
| BG3 (History) | Last frame N_conf, velocities, temporal reservoirs |

### 6.2 Pipelines

| Pipeline | Type | Notes |
|----------|------|-------|
| P_radix_sort | Compute | GPU radix sort for splat depth ordering |
| P_splat_vote | Render | MRT for vote accumulators + splatDepth |
| P_resolve_bilateral | Compute | Fused: resolve + initial confidence + first bilateral blur (single dispatch, group barrier) |
| P_rescue | Compute | Ring scan with two-lobe clustering for low-conf |
| P_temporal | Compute | Motion vectors + reactive history mask |
| P_mesh_gbuffer | Render | Standard deferred |
| P_oracle_lowres | Render | ¼-res SH-only for baked highlight detection |
| P_deferred | Compute | Fullscreen lighting |
| P_post | Render/Compute | Tone map, bloom, SSR |

### 6.3 Formats & Precision

- Accumulations: RGBA16F / R11G11B10F
- Weights/confidences: R16F
- SH coefficients: RGB16F per coefficient
- GI volumes: L2 SH × RGB16F × 64³ ≈ a few MB each
- RenderBundles for splat draw (pre-record per cluster, re-use across frames)

### 6.4 Performance Targets (1080p, laptop 3060)

| Stage | Budget |
|-------|--------|
| GPU sort (150k splats) | ~0.5 ms |
| Splat voting | ~1 ms |
| Resolve + bilateral + rescue | ~1 ms |
| Temporal merge | ~0.2 ms |
| Deferred lighting | ~0.5 ms |
| Oracle ¼-res | ~0.3 ms |
| Post-FX | ~0.5 ms |
| **Total** | **~4 ms** |

---

## 7. Soft Shadows & Occlusion

- **Splats as shadow casters:** Render into light shadow maps as oriented discs with alpha; alpha-aware depth or VSM for partial coverage.
- **Transmittance T as soft-shadow bias:** Query local axis transmittances to widen penumbra and attenuate indirect rays through dense splat clusters.
- **Meshes occluding scan bounce:** V on GI_direct1.
- **Meshes vs. GI_indirect:** SSAO + short-range T attenuation (handles "no glow through new walls").

---

## 8. Confidence Plumbing

Uncertainty pays rent everywhere:

| Confidence | Source | Consumers |
|------------|--------|-----------|
| `κ_cls` (classification) | Direct/indirect split metrics | Weight grid injections |
| Material confidence | SAM3 agreement + solve sample count | Gate shading: lerp roughness→0.8, cap F0→0.04 as conf drops |
| Normal confidence | Voting WeightSum | Modulate AO strength, SSR weight, bend toward fallback normals |
| Ghost confidence | §2.4 detection stages | Splat opacity modulation / culling |

Everything noisy devolves to "more diffuse, less mirror" — always the safer failure.

---

## 9. Tuning Knobs

| Parameter | Default | Notes |
|-----------|---------|-------|
| k_hi | 0.25 | Spatial high-freq threshold |
| k_var | 2.5 | View-variance threshold |
| k_white_min / span | 0.1 / 0.2 | Achromatic push |
| k_shad | 0.2 | Shadow-edge threshold |
| Fusion α₁/α₂/α₃/α₄/β | 0.4/0.35/0.15/0.25/0.15 | Direct/indirect classification |
| w_min / w_max | Scene-dependent | Vote weight → confidence mapping |
| Rescue ring radius | 2–3 | Raise for pepper noise |
| Temporal dot threshold | 0.9 | Normal agreement for history blend |
| Propagation hops | 2–3 | Too many = soup, too few = anemic corners |
| SH order | L2 | L3 if crisper skylight lobes needed |
| Oracle spec threshold | 1.5–2× | Luminance ratio over SH-predicted |

---

## 10. Known Limitations & Failure Modes

| Issue | Mitigation |
|-------|------------|
| Sparkly normals in hairline gaps | Bump rescue radius; run edge grow more frequently after camera moves |
| Ghost lighting behind new occluders | GI_direct1 × V_shadow; reduce/disable GI_direct1 in fully re-lit scenes |
| Metalness misclassification | SAM3 material class override; clamp to {0,1} for non-metals |
| Over-soft GI | Reduce propagation α; down-weight transmittance for thin geometry |
| Temporal lag halos | Lower history weight in fast motion; use centroid-based splat reprojection |
| Mixed materials in one splat | Confidence drops → safer shading; option to split large splats by k-means on color |
| True direct-diffuse vs. bright indirect | Conservative bias toward indirect — correct when it matters (occlusion events) |
| Phone local tone mapping varies per-region | VLM identifies region boundaries; per-region inverse curves |
| Dynamic indirect only approximated | SSDO-lite by default; optional dynamic voxel injection |

---

## 11. Why This Works

1. **Normals converge** because votes are confidence-weighted and history only sticks when geometry is stable.
2. **Diffuse looks right** because GI bricks are distilled from the scene itself — then propagated additively with real occlusion from T — and built on corrected linear radiance, not phone-camera garbage.
3. **Specular stays honest** because the oracle refuses to double-light baked highlights.
4. **Materials are grounded** because SAM3 tells us what things are made of, breaking the lighting-vs-material degeneracy that plagues pure pixel-statistics approaches.
5. **Ghost splats die** because SAM3 identifies reflective surfaces and geometric culling removes the phantom geometry behind them.
6. **Hybrid geometry is seamless** because splats and triangles share GI wells, AO, shadows, and land in one deferred composite.

The whole point: drop this into WebGPU without a ray tracer or NeRF. Competent raster, a couple of SH volumes, vision-model preprocessing, and filters that behave like adults.
