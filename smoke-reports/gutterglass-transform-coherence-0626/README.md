# Gutterglass Transform Coherence Smoke

Question: Does the Kaminos point-cloud/correction preview and the hybrid renderer overlay share the same placement/orientation frame after renderer crop support and host model-matrix application?

Result: Pass. Kaminos `real-hybrid-cropped-supported-overlay` imported `evil_orb_final_composite.ply`, kept the corrected crop visible before and after hybrid handoff, started the real hybrid renderer overlay, reported renderer-applied crop, accepted scene context, honored exposure/environment fields, and projected the probe point to the same screen position for Kaminos preview and the PBRnext overlay. The inspected screenshot shows the cropped Evil Orb rendered coherently on the Kaminos support disk rather than drifting in a separate transform frame.

Route:
- renderer repo: `lyonsno/hybrid-differentiable-deferred-splat-mesh-renderer`
- renderer worktree: `/private/tmp/hybrid-differentiable-defferred-splat-mesh-renderer-ibl-envmap-coherence-0625`
- renderer branch/head: `cc/ibl-envmap-coherence-0625@c77fb71`
- Kaminos repo: `lyonsno/kaminos`
- Kaminos worktree: `/private/tmp/kaminos-gutterglass-scene-context-producer-0625`
- Kaminos branch/head: `cc/gutterglass-scene-context-producer-0624@1a4aa15`
- renderer module route: `http://127.0.0.1:5173/src/splatOverlay.ts`
- Kaminos route: `http://127.0.0.1:8094/?load=splat-inbox/evil_orb_final_composite.ply`
- command: `node scene-object-witness.mjs --url 'http://127.0.0.1:8094/?load=splat-inbox/evil_orb_final_composite.ply' --scenario real-hybrid-cropped-supported-overlay --hybrid-module-url http://127.0.0.1:5173/src/splatOverlay.ts --expected-server-root /private/tmp/kaminos-gutterglass-scene-context-producer-0625 --out /tmp/kaminos-gutterglass-transform-coherence-0626.png --report /tmp/kaminos-gutterglass-transform-coherence-0626.json --debug-port 9471 --settle-ms 3500`
- observed timestamp: `2026-06-27T00:54:53Z`

Images and reports:
- `kaminos-gutterglass-transform-coherence-0626.png`: candidate-fix output inspected by Gutterglass; cropped Evil Orb appears coherently placed in the Kaminos scene.
- `kaminos-gutterglass-transform-coherence-0626.report.json`: witness report with `ok:true`, renderer crop telemetry, scene-context telemetry, and projection probe values.

Key evidence:
- renderer crop: `cropAppliedByRenderer:true`, `cropFrame:"kaminos-raw-asset-to-preview"`, `keptCount:587623`, `sourceCount:1051601`
- scene context: `sceneContextAccepted:true`, honored `lighting.environment`, `lighting.environment.intensity`, `lighting.environment.rotationY`, and `lighting.exposure`
- transform/projection: `kaminosPreviewScreen` and `pbrnextOverlayScreen` both projected the probe to `x:544`, `y:556.5308147016121`; the old uncompensated path projected to `y:260.46918529838786`

Hashes:
- `kaminos-gutterglass-transform-coherence-0626.png`: `sha256:2c0fc2f813b1f1ff75909816e6bd5cffaaf9b389e2a5442f403f25e5a6e598f6`
- `kaminos-gutterglass-transform-coherence-0626.report.json`: `sha256:0c5ffe9988c1f972b98e74772e8b01aaa4cff642e0e26a44fe063511c984b241`

Does not prove: This is not a unified-canvas/depth-aware composition pass, does not prove mesh/splat shared AO or host-depth occlusion, and does not close the separate black-metal / baked-normal convention investigation. It proves the current dual-canvas hybrid overlay can render a corrected cropped splat in the same visible transform frame as Kaminos for this asset and route.
