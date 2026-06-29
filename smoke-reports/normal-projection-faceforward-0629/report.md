# Projection Normal Face-Forward Smoke - 2026-06-29

## Route

- Renderer branch: `cc/ibl-envmap-coherence-0625`
- Kaminos route: `http://127.0.0.1:8094/?load=splat-inbox/evil_orb_final_composite.ply&hybrid_splat_overlay_module_url=http%3A%2F%2F127.0.0.1%3A5173%2Fsrc%2FsplatOverlay.ts`
- Renderer module: `http://127.0.0.1:5173/src/splatOverlay.ts`
- Asset: `splat-inbox/evil_orb_final_composite.ply`

## Change Under Smoke

`src/shaders/gpu_project_splats.wgsl` now face-forwards each asset-local splat normal against the asset-local camera vector before transforming it through `normalMatrix` and writing the projection-cache normal. This is intentionally producer-side: the tile compositor averages projection-cache normals, so downstream deferred lighting/GTAO face-forwarding cannot recover sign-cancelled G-buffer normals.

## Captures

- `fallback-front-page.png` and `fallback-side-page.png`: rejected evidence. Kaminos loaded the asset, but the hybrid panel reported `idle - point-cloud fallback - renderer crop=false`.
- `live-front-page.png`: accepted live hybrid front-ish capture. Kaminos reported `rendering - dual-canvas P0 - renderer crop=true`.
- `live-side-page.png`: accepted live hybrid side-ish capture after camera drag. Kaminos still reported `rendering - dual-canvas P0 - renderer crop=true`.
- `live-capture-telemetry.json`: route/status text and canvas geometry.

## Visual Judgment

The live captures show material progress against the side-view black-normal collapse: the side exposure no longer becomes one broad dead black field, and lit ridges remain legible around the rotated view. This is not full closure. A pale/rough side patch remains visible on the right side of the orb, so AO and material response should still be judged only after the remaining normal/coherence issue is isolated or accepted as source-asset damage.

## Verification

- `node --experimental-strip-types --experimental-transform-types --test tests/ibl.test.ts`
- `npx tsc --noEmit`
- `git diff --check`
- `npm test`
