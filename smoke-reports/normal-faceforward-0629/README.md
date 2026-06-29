# Normal Face-Forward 0629

Question: Does face-forwarding visible splat normals in deferred lighting and GTAO materially improve the Evil Orb side-view black-normal/AO failure?

Result: Partial improvement, not closure. The default baked-normal side view is less dead and shows more surface structure than the pre-fix `normal-source-compare-0629/baked-side.png`, but it remains a thin, incoherent side mass with visible AO/normal problems. The front view did not visibly regress. Screen-space normals remain a diagnostic mode, not a production default.

Route:
- renderer repo: `/private/tmp/hybrid-differentiable-defferred-splat-mesh-renderer-ibl-envmap-coherence-0625`
- renderer base head during capture: `f3d53b1f50cef9c19169d3e6c1c94a261ea6d5eb` plus working-tree face-forward shader and normal-control patches
- Kaminos repo: `/private/tmp/kaminos-gutterglass-scene-context-producer-0625`
- Kaminos base head during capture: `6e0961f820ebdc6071d4b951ba2e4d5033e1b6da` plus working-tree checkbox/control publisher patch
- URL: `http://127.0.0.1:8094/?load=splat-inbox/evil_orb_final_composite.ply&hybrid_splat_overlay_module_url=http%3A%2F%2F127.0.0.1%3A5173%2Fsrc%2FsplatOverlay.ts`
- renderer server: `http://127.0.0.1:5173/src/splatOverlay.ts`
- Kaminos server: `http://127.0.0.1:8094/`
- backend/device: Chrome headless WebGPU via Kaminos dual-canvas hybrid overlay
- asset: `/Users/noahlyons/.local/state/kaminos/assets/splats/inbox/evil_orb_final_composite.ply`
- route report: `receipt.json`

Images:
- `baked-front.png`: post-fix front view with PLY baked normals.
- `baked-side.png`: post-fix side view with PLY baked normals; shows partial improvement but not closure.
- `screen-front.png`: post-fix front view with `normal.forceScreenSpace=true`.
- `screen-side.png`: post-fix side view with `normal.forceScreenSpace=true`.

Hashes:
- `68b240d87091933cfb4dd8523a28be24ff2c918566fd925703747980f1e6d2a5  baked-front.png`
- `8364f3772f2a5d250ef6eb731a761bebc216ccca90bfc304da9cf81975203993  baked-side.png`
- `7d15b0ebd6d4aa2dbda5171ee997600e79e018a4aee6f47d585bec75ecc29caa  screen-front.png`
- `245ddd85219a4bc9f80a2e040d8b144f18f67394af66cdfefb8a9da888995341  screen-side.png`
- `d03268bafc68b4701866ce88d2e7ee0de6e176038e82a9ed9c904bd6b363e722  receipt.json`

Does not prove: This does not close the operator-reported AO or side-view coherence issue. It proves the face-forward shader policy is a useful correctness fix and that the remaining failure likely needs AO parameter/depth behavior diagnosis and/or repair of bad baked-normal ingestion for this asset.
