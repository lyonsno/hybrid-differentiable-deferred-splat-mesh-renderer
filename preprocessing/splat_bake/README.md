# Splat Bake Pipeline

Bake per-splat PBR attributes (normals, roughness, metallic, emissive) onto
Gaussian splat PLYs. Takes a SHARP-generated PLY and produces a fully
relightable PBR splat field.

## Pipeline

```
SHARP PLY (baked lighting)
  → trim_splats.py          remove fog (opacity < 0.05), recenter to median
  → render (headless)       2K render from the renderer for MoGE/SuperMat input
  → MoGE vits-normal        normal map from render
  → bake_normals.py         bake nx,ny,nz per-splat from normal map
  → SuperMat (676)          albedo, roughness, metallic maps from render
  → bake_materials.py       bake roughness, metallic per-splat from maps
  → bake albedo             replace SH color channels with SuperMat albedo
  → emissive extraction     hue divergence gate on (original - albedo) delta
```

Total compute: ~30 seconds. Output: PLY with per-splat normals, roughness,
metallic, and emissive_r/g/b attributes.

## Projection: Critical Footguns

Every script in this directory projects 3D splat positions to 2D pixel
coordinates to sample image-space maps (normals, roughness, metallic, albedo)
back onto splats. Getting this projection right is the single most important
thing. Here are the footguns we found the hard way:

### 1. Use the renderer's `viewProjMatrix`, not `view × proj`

The renderer applies `VIEWER_VERTICAL_FLIP` (Y negation) when composing its
viewProj matrix:

```js
// In realSmokeScene.ts
const VIEWER_VERTICAL_FLIP = [1, 0, 0, 0,  0, -1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1];
viewProj = flip × proj × view
```

If you multiply `view × proj` yourself in Python, you get the WRONG projection.
The Y axis will be flipped relative to the rendered image. Always use the
`viewProjMatrix` field from `__MESH_SPLAT_CAMERA_STATE__`, which includes the
flip.

```python
# WRONG — missing the Y flip
view_mat = np.array(cam["viewMatrix"]).reshape(4, 4).T
proj_mat = np.array(cam["projectionMatrix"]).reshape(4, 4).T
viewProj = proj_mat @ view_mat  # missing VIEWER_VERTICAL_FLIP

# RIGHT — use the pre-composed viewProj from the renderer
viewProj = np.array(cam["viewProjMatrix"]).reshape(4, 4).T
```

### 2. Column-major to row-major: `.reshape(4, 4).T`

WebGPU/JS stores matrices column-major. NumPy uses row-major. The conversion
is `.reshape(4, 4).T` — reshape puts column 0 in row 0, then transpose fixes
it. Do NOT use `.reshape(4, 4)` without `.T`.

### 3. NDC to pixel mapping

With the renderer's viewProjMatrix (which includes the Y flip), NDC Y+ points
DOWN in screen space. The correct NDC-to-pixel mapping is:

```python
px = (ndc_x + 1) * 0.5 * viewport_width
py = (1 - ndc_y) * 0.5 * viewport_height
```

If you get this wrong, the projection will appear shifted or flipped. The
symptom is a CV heatmap or debug overlay that looks "misregistered" — features
are in roughly the right place but offset or mirrored.

### 4. Viewport size must match the rendered image

The projection uses the viewport dimensions from the camera state. If the
rendered image has a different resolution (e.g., Playwright viewport was set
differently), the pixel coordinates will be wrong. Always check that
`cam["viewportWidth"]` matches the actual image width.

### 5. Single-session Playwright rendering

Launching a new Chromium instance per render is ~15 seconds of overhead each.
For light sweeps or multi-view pipelines, launch ONE browser, load the PLY
ONCE, then loop over camera/light combinations:

```js
// Load once
await page.goto(url);
await page.waitForFunction(() => splatCount > 0);

// Loop over views (fast — renderer does 4ms/frame)
for (const view of views) {
  await page.evaluate(p => __MESH_SPLAT_SET_CAMERA__(p), view);
  await page.waitForTimeout(300);
  const buf = await page.$('canvas').screenshot();
  // ...
}
```

### 6. Camera target is auto-framed, not at origin

The renderer auto-frames the camera target to the scene bounds center, which
is NOT necessarily the origin or the median position. The camera JSON tells
you exactly where the camera is looking — don't assume.

### 7. The `__MESH_SPLAT_SET_CAMERA__` API sets orbit params, not matrices

`distance`, `azimuth`, `elevation` — these orbit around the auto-framed
target. You cannot set the view matrix directly. The resulting matrices come
back from `__MESH_SPLAT_CAMERA_STATE__` after the orbit is applied.

## Emissive Extraction

The emissive channel separates baked emissive glow from baked specular
highlights in the `original - albedo` delta.

### Hue divergence gate (primary method)

Compare the RGB-space hue of the emissive delta to the hue of the albedo.
Specular reflections on metals have the same hue as the surface (Fresnel).
Emissive glow has a different hue (e.g., amber glow on gray metal).

```python
delta = max(0, original_color - albedo_color)
delta_dir = normalize(delta)      # unit vector in RGB
albedo_dir = normalize(albedo)    # unit vector in RGB
cos_sim = dot(delta_dir, albedo_dir)
hue_divergence = 1 - cos_sim     # 0 = same hue, 2 = opposite

# Keep delta where hue diverges from albedo (= emissive, not specular)
weight = smoothstep(hue_divergence, 0.02, 0.15)
emissive = delta * weight
```

No rendering, no light sweep, no material map thresholds. Works because
specular reflection preserves surface hue while emissive introduces new color.

**Generalization caveat:** Fails when emissive has the same hue as the surface
(e.g., red glow on red metal). Works well when emissive color differs from
albedo color, which is the common case for accent lighting and glow effects.

### Multi-view SuperMat consensus (material quality improvement)

SuperMat output is unstable to small view angle changes (~5 degree offset
produces mean metallic shift of 0.06). Running SuperMat from 4-6 slightly
offset views and averaging per-splat produces sharper material boundaries and
a superresolution effect. Use the original baked-lighting render as SuperMat
input, NOT the albedo-replaced render. Use `--image-size 676` (SuperMat's
training resolution).

## Scripts

| Script | Purpose |
|--------|---------|
| `trim_splats.py` | Remove fog splats, recenter to median |
| `bake_normals.py` | Single-view MoGE normal baking via PLY intrinsics |
| `bake_materials.py` | Bake roughness/metallic from SuperMat image maps |
| `multiview_normals.py` | Multi-view normal consensus (MoGE or Lotus-D) |
| `multiview_emissive.py` | Multi-view emissive via per-channel min (superseded) |
| `specular_mask_emissive.py` | Light sweep + hue divergence emissive extraction |
| `render_splat_view.py` | Simple CPU splat renderer for map generation |
| `sharpen_normals.py` | High-frequency detail injection from albedo into normals |

## Multi-view Normal Baking

`multiview_normals.py` renders N orbit views of a splat PLY, runs a normal
estimator on each, projects normals back to splats with cam-to-world rotation,
and takes the median across views with angular outlier rejection.

```bash
# MoGE (default)
python multiview_normals.py --ply input.ply --output output.ply --views 8

# Lotus-D (sharper on some assets)
python multiview_normals.py --ply input.ply --output output.ply --views 8 --normal-model lotus

# Front-hemisphere only (for assets with a clear front)
python multiview_normals.py --ply input.ply --output output.ply --views 8 \
  --azimuth-center 3.14 --azimuth-spread 3.14
```

### Normal coordinate conventions

- MoGE's facing-camera normal is `(0, 0, -1)`. The Z component must be negated
  before `cam_to_world` rotation: `(0, 0, -1)` → `(0, 0, +1)` → `cam_to_world`
  maps to the outward surface direction. Without this, normals point toward the
  camera instead of away, making `N·V` negative and killing all specular/metallic.
- `cam_to_world = view_matrix[:3, :3].T` converts camera-space normals to world space.
- **Lotus-D convention is unverified** — it may use `(0, 0, +1)` for facing-camera,
  in which case the Z-flip should be skipped. Test before using `--normal-model lotus`.
- The renderer's deferred lighting shader expects world-space normals (it computes
  `V = normalize(cameraPos - worldPos)` in world space).
- For single-view baking without rotation, the normals are in camera space and only
  look correct when viewed from the bake camera angle.

### Critical: renderer and bake pipeline must see the same splats

If the renderer crops splats (via Kaminos sidecar) but the bake pipeline projects
all splats, back-facing/occluded splats will project onto pixels showing background
or different geometry. MoGE produces junk normals for those pixels, and the bake
result looks "blobby" even though the projection is numerically correct.

**Rule: whatever the renderer shows is what MoGE sees. Only project splats that
the renderer actually rendered.** When sidecar crop is active in the renderer, the
bake pipeline must apply the same crop.

## Dependencies

All scripts run in the MoGE venv (`~/dev/moge-standalone/.venv/`). Requires:
`numpy`, `plyfile`, `Pillow`, `playwright-core` (for headless rendering).

MoGE inference: `~/dev/moge-standalone/`
Lotus-D inference: `~/dev/Lotus/` with model `jingheya/lotus-normal-d-v1-1`
SuperMat inference: `~/dev/SuperMat/` with checkpoint at `checkpoints/supermat.pth`
