# Evil Orb Residual Side Patch Investigation - 2026-06-29

## Route

- Renderer branch: `cc/ibl-envmap-coherence-0625`
- Renderer baseline: `2fc985f` (`Face-forward projection normals before tile blending`)
- Kaminos route: `http://127.0.0.1:8094/?load=splat-inbox/evil_orb_final_composite.ply&hybrid_splat_overlay_module_url=http%3A%2F%2F127.0.0.1%3A5173%2Fsrc%2FsplatOverlay.ts`
- Asset: `/Users/noahlyons/.local/state/kaminos/assets/splats/inbox/evil_orb_final_composite.ply`
- Sidecar: `/Users/noahlyons/.local/state/kaminos/assets/splats/inbox/evil_orb_final_composite.ply.kaminos-splat.json`

## Operator Symptom

After `2fc985f`, front and moderate side views are materially improved, but orbiting left/right still exposes a pale/black blotchy patch on the side of the orb. This investigation treats AO as downstream and tests whether the residual is missing normals, normal-frame incoherence, crop damage, or source geometry.

## Findings

### 1. The visible cropped asset is not dominated by zero normals

Raw Evil Orb has `216957 / 1051601` zero-length baked normals (`20.63%`). After applying the Kaminos sidecar crop/correction through the renderer decoder path, the visible cropped asset has `587327` splats and only `1` zero normal.

Evidence: `evil-orb-normal-material-diagnostic.json`.

### 2. The cropped asset is a thin slab, not a closed orb

The sidecar crop keeps a corrected volume with approximate bounds:

- `x`: `-1.3405` to `-0.1928` (`1.15` wide)
- `y`: `1.1616` to `2.3676` (`1.21` tall)
- `z`: `-5.7510` to `-5.2500` (`0.50` thick)

That means side orbit necessarily exposes a cut/open splat volume. The exposed side does not represent a newly reconstructed closed surface; it is a sliced set of source splats.

### 3. The source asset contains a larger rectangular/frayed sheet

`crop-off-front-page.png` and `crop-off-side-page.png` were captured after unchecking Kaminos `Crop enabled` before starting the hybrid overlay. Telemetry confirms `rendering - dual-canvas P0 - renderer crop=false`.

With crop disabled, the orb is visibly embedded in a larger rectangular/frayed sheet/backplate. With crop enabled, Kaminos removes most of that sheet but the side orbit still exposes retained/cut sheet material as the pale/black patch.

Evidence:

- `crop-off-capture-telemetry.json`
- `crop-off-front-page.png`
- `crop-off-side-page.png`
- Earlier crop-on accepted evidence: `../normal-projection-faceforward-0629/live-front-page.png` and `../normal-projection-faceforward-0629/live-side-page.png`

### 4. Baked normals are valid but strongly sheet/front-biased

After crop/correction, baked normals are overwhelmingly `+Z` dominant:

- `+Z`: `489150`
- `+Y`: `52549`
- `+X`: `26140`
- `-X`: `16073`
- `-Y`: `3415`
- `-Z`: `0`

The covariance-derived smallest-axis normal is also mostly `+Z` for this cropped sheet, so swapping wholesale to covariance normals is unlikely to make the retained sheet read like a closed side surface.

Evidence: `evil-orb-normal-coherence-diagnostic.json`.

## Diagnosis

The remaining side artifact is most likely source/crop-surviving sheet geometry, not AO and not the zero-normal fallback path. `2fc985f` fixed a real renderer-side normal-vote problem, but the visible left/right patch is now exposing that `evil_orb_final_composite.ply` is a front/composite splat sheet with an orb embedded in it. The current rectangular crop removes much of the surrounding sheet but still leaves an open cut volume. Orbiting sideways makes that retained sheet/crop boundary visible.

## Implications

- Do not debug AO against this side patch as the primary target; it is amplifying source/crop geometry.
- A renderer normal-frame fix alone cannot make this cropped slab behave like a closed orb.
- A better next slice is either asset/crop correction or a renderer-side debris/crop-boundary treatment, but that should be framed as source cleanup/crop semantics, not AO.
- If the goal is a clean object-orb demo, the likely fastest path is a tighter/non-rectangular crop or a producer-side/export-side cleanup that removes the backplate/sheet before the hybrid renderer sees it.

## Commands / Smokes

- `node --experimental-strip-types --experimental-transform-types --input-type=module` one-off decoder diagnostic using `decodeLocalPlySplatPayload` and `applySidecarCorrections`
- Playwright/System Chrome Kaminos smoke with `Crop enabled` unchecked before `Start Hybrid`
