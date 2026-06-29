# Normal/AO View-Matrix Fix 2026-06-29

Question: Was the Evil Orb AO/normal incoherence partly caused by feeding GTAO a model-composed projection view matrix when transforming already-world-space G-buffer normals into view space?

Result: Yes, the code path had that contract break. The projection path writes G-buffer normals after applying the model inverse-transpose into the host/world lighting frame, but GTAO was receiving `view * model` as its normal transform view matrix. Candidate fix adds a separate `lightingViewMatrix` and passes host camera view into GTAO, while leaving projection/sort on `view * model`. Current Kaminos route and close-ish visual smoke both render after the fix, with renderer-side crop and renderer controls telemetry accepted.

Route:
- repo: `hybrid-differentiable-defferred-splat-mesh-renderer`
- worktree: `/private/tmp/hybrid-differentiable-defferred-splat-mesh-renderer-ibl-envmap-coherence-0625`
- branch/head at capture: `cc/ibl-envmap-coherence-0625` with local candidate changes after `10692c4`
- renderer module: `http://127.0.0.1:5173/src/splatOverlay.ts`
- Kaminos worktree: `/private/tmp/kaminos-gutterglass-scene-context-producer-0625`
- Kaminos route: `http://127.0.0.1:8094/?load=splat-inbox/evil_orb_final_composite.ply&hybrid_splat_overlay_module_url=http%3A%2F%2F127.0.0.1%3A5173%2Fsrc%2FsplatOverlay.ts`
- backend/device: Chrome headless WebGPU through Kaminos dual-canvas hybrid overlay
- asset: `splat-inbox/evil_orb_final_composite.ply`
- timestamp: `2026-06-29T04:26:52Z` to `2026-06-29T04:29:36Z`

Commands:
- Route witness:
  `node scene-object-witness.mjs --scenario real-hybrid-cropped-supported-overlay --url 'http://127.0.0.1:8094/?load=splat-inbox/evil_orb_final_composite.ply&hybrid_splat_overlay_module_url=http%3A%2F%2F127.0.0.1%3A5173%2Fsrc%2FsplatOverlay.ts' --hybrid-module-url http://127.0.0.1:5173/src/splatOverlay.ts --splat-asset-name evil_orb_final_composite.ply --expected-server-root /private/tmp/kaminos-gutterglass-scene-context-producer-0625 --out /tmp/kaminos-normal-ao-viewmatrix-fix.png --report /tmp/kaminos-normal-ao-viewmatrix-fix.json --debug-port 9486 --settle-ms 4500`
- Close-ish visual capture: one-off CDP smoke against the same URL, setting `window.kaminosSetCameraDebugPose({ position: [0, 0.55, 2.15], target: [0, -0.28, 0] })`; report preserved as `candidate-fix-close.report.json`.

Images:
- `route-witness.png`: full Kaminos route witness screenshot. This proves the current overlay route renders and is not blank, but it is not close enough to judge normal coherence by itself.
- `candidate-fix-close.png`: closer current-code visual smoke after the `lightingViewMatrix` fix. This is the candidate-fix visual evidence to compare against the operator's inverted-AO/front-only-normal screenshots.

Reports:
- `route-witness.report.json`: full route evidence; key fields include `status:"rendering"`, `cropAppliedByRenderer:true`, `sceneContextAccepted:true`, `rendererControlsTelemetry.accepted:true`, source `evil_orb_final_composite.ply`, and kept crop count `587327`.
- `candidate-fix-close.report.json`: close-up CDP evidence; key fields include `status:"rendering"`, `frameCount:477`, `cropApplied:true`, `sceneContextAccepted:true`, accepted renderer controls, and explicit camera pose `[0, 0.55, 2.15]` targeting `[0, -0.28, 0]`.

SHA-256:
- `candidate-fix-close.png`: `aaca3806b65ee85f037c6f58b457ae8b91fcf8a31c7cd37aee11ccb3676bdb98`
- `route-witness.png`: `2e83245aecc31db628623ad695cf9c9fcabc9c10449818e427fd50685ffc15e4`
- `candidate-fix-close.report.json`: `4a953b2da6500065cfa804ecfdd11fe05b7fb41749bff49b38d78c552d255798`
- `route-witness.report.json`: `60b4307d537e937761333ec639727b24d77e0104c01c4fe91f92b8b70ebd1cc7`

Does not prove: This does not prove every rotated view is visually correct, does not settle remaining baked-normal/sidecar asset quality questions, and does not close unified mesh/splat depth composition. It does prove the identified double-model normal transform path is repaired and provides current visual evidence for operator smoke.
