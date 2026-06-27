# Normal Frame Final Transform

Question: Do baked and detail-perturbed splat normals enter the same host/world lighting frame as covariance-derived normals when Kaminos supplies model/crop transforms and HDR scene context?

Result: Candidate fix passes the Kaminos real hybrid overlay witnesses. The cropped sidecar route renders a coherent Evil Orb with renderer-side crop applied, environment/intensity/rotation/exposure telemetry honored, and projection probes matched between Kaminos preview and the hybrid overlay. The inspected cropped screenshot shows the orb upright in the corrected frame with highlights/reflections on the visible shell rather than visibly detached from the object transform.

Route:
- repo: `hybrid-differentiable-defferred-splat-mesh-renderer`
- worktree: `/private/tmp/hybrid-differentiable-defferred-splat-mesh-renderer-ibl-envmap-coherence-0625`
- branch/head at smoke time: `cc/ibl-envmap-coherence-0625` / `a22518f` plus local normal-frame patch
- Kaminos worktree/server: `/private/tmp/kaminos-gutterglass-scene-context-producer-0625` on `http://127.0.0.1:8094/`
- renderer dev server: `npm run dev -- --host 127.0.0.1` on `http://127.0.0.1:5173/`
- asset: `splat-inbox/evil_orb_final_composite.ply`
- backend/device: browser WebGPU via Kaminos `scene-object-witness.mjs`, Chrome remote debugging
- timestamp: 2026-06-27T21:29:47Z through 2026-06-27T21:30:26Z

Commands:

```bash
node scene-object-witness.mjs --scenario real-hybrid-splat-overlay --url 'http://127.0.0.1:8094/?load=splat-inbox/evil_orb_final_composite.ply&hybrid_splat_overlay_module_url=http%3A%2F%2F127.0.0.1%3A5173%2Fsrc%2FsplatOverlay.ts' --hybrid-module-url http://127.0.0.1:5173/src/splatOverlay.ts --splat-asset-name evil_orb_final_composite.ply --expected-server-root /private/tmp/kaminos-gutterglass-scene-context-producer-0625 --out /tmp/kaminos-evil-orb-normal-frame-fix.png --report /tmp/kaminos-evil-orb-normal-frame-fix.json --debug-port 9483 --settle-ms 4500

node scene-object-witness.mjs --scenario real-hybrid-cropped-supported-overlay --url 'http://127.0.0.1:8094/?load=splat-inbox/evil_orb_final_composite.ply&hybrid_splat_overlay_module_url=http%3A%2F%2F127.0.0.1%3A5173%2Fsrc%2FsplatOverlay.ts' --hybrid-module-url http://127.0.0.1:5173/src/splatOverlay.ts --splat-asset-name evil_orb_final_composite.ply --expected-server-root /private/tmp/kaminos-gutterglass-scene-context-producer-0625 --out /tmp/kaminos-evil-orb-cropped-normal-frame-fix.png --report /tmp/kaminos-evil-orb-cropped-normal-frame-fix.json --debug-port 9484 --settle-ms 4500
```

Images:
- `uncropped-candidate-fix.png`: real hybrid overlay route with Evil Orb visible; useful as a route/visibility witness, but not the cropped sidecar posture.
- `cropped-candidate-fix.png`: cropped-supported sidecar route; this is the load-bearing visual candidate-fix screenshot.
- `uncropped-witness-report.json`: browser witness report for the uncropped route.
- `cropped-witness-report.json`: browser witness report for the cropped route; records `cropApplied=true`, `keptCount=587327`, environment/intensity/rotation/exposure honored, and matched projection probes.

Hashes:
- `982ae82e1a0361275b1b44353bea8759b267b79dcbefb883c02d0dc77a54162b  cropped-candidate-fix.png`
- `11fdb408a9ee9566dc8541d2217beecc8ca8706d9adc2fc52bd07cc861ad0c2f  uncropped-candidate-fix.png`
- `139b1ffe3aaae55f5f4f181eb70c321fc17b4399f890f0c229dbf89557d7835d  cropped-witness-report.json`
- `45104e24374d2f020b90c233259bfbc533bce6f13fa47af38f62fc9a9e0c8d83  uncropped-witness-report.json`

Does not prove: unified-canvas/depth-aware mesh composition, mesh/splat shared AO, tone-mapping parity with Kaminos, or that every HDR preset has the correct perceptual orientation. It proves the patched renderer no longer lets baked PLY normals bypass the host/model normal matrix in the route under smoke.
