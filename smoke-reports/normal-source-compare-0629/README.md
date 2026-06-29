# Normal Source Compare 0629

Question: Does forcing screen-space reconstructed normals resolve the Evil Orb AO and side-view black-normal failure, or is the remaining failure downstream of the normal source?

Result: The screen-space normal path is a useful discriminator but not a complete fix. In the side view, baked normals reproduce the dark collapsed side mass; screen-space normals recover more ridged structure but still leave the side view incoherent. In the front view, screen-space normals brighten and expose structure but add noisy/overbright patches. The served PLY also has suspicious baked-normal data: `216957 / 1051601` normals are zero-length, detail normals are absent, and the dominant bins are heavily `-Z` and `-Y`.

Route:
- renderer repo: `/private/tmp/hybrid-differentiable-defferred-splat-mesh-renderer-ibl-envmap-coherence-0625`
- renderer head during capture: `f3d53b1f50cef9c19169d3e6c1c94a261ea6d5eb` plus working-tree `normal.forceScreenSpace` control patch
- Kaminos repo: `/private/tmp/kaminos-gutterglass-scene-context-producer-0625`
- Kaminos head during capture: `6e0961f820ebdc6071d4b951ba2e4d5033e1b6da` plus working-tree checkbox/control publisher patch
- URL: `http://127.0.0.1:8094/?load=splat-inbox/evil_orb_final_composite.ply&hybrid_splat_overlay_module_url=http%3A%2F%2F127.0.0.1%3A5173%2Fsrc%2FsplatOverlay.ts`
- renderer server: `http://127.0.0.1:5173/src/splatOverlay.ts`
- Kaminos server: `http://127.0.0.1:8094/`
- backend/device: Chrome headless WebGPU via Kaminos dual-canvas hybrid overlay
- asset: `/Users/noahlyons/.local/state/kaminos/assets/splats/inbox/evil_orb_final_composite.ply`
- route report: `receipt.json`
- normal stats: `evil-orb-normal-stats.json`

Images:
- `baked-front.png`: front view with PLY baked normals.
- `baked-side.png`: side view with PLY baked normals; shows the dark side collapse.
- `screen-front.png`: front view with `normal.forceScreenSpace=true`; brighter/noisier than baked.
- `screen-side.png`: side view with `normal.forceScreenSpace=true`; improves ridge visibility but does not close the side/AO failure.

Hashes:
- `58a18e1e96827736095e85d4b6a8b043eb9fec35c3574bbb0e85ce0a745eae4e  baked-front.png`
- `5bd4e742f8ebb124e905bc92b85920b7f1c251a37bb19d4ca298f1b2dec88826  baked-side.png`
- `f501d1c2e914c020044297dd1955115cea9bfef9881d638c0799646df9e3fa7b  screen-front.png`
- `22d385e065eeb826802ac99200da4f0841ea41387feae953fc9252e1f631a68f  screen-side.png`
- `85195859642a0710b0d93dde211cb8d9cac73f884b017ced2f434fe10071b66d  receipt.json`
- `b9a2976383f30eceb0877c428dc44f9d5367d5cfccd054bb9af3a48cf2a28eec  evil-orb-normal-stats.json`

Does not prove: This does not prove the final production normal policy. It only shows that the remaining failure is not fixed by switching wholesale to screen-space normals, and that the PLY baked normals are not trustworthy enough to be treated as the only explanation. The next fix target is explicit two-sided/face-forward handling in deferred lighting and GTAO, then another side-view smoke.
