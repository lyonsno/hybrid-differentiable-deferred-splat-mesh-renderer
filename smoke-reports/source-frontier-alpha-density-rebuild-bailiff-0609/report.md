# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-09T07:47:50.357Z
- Base URL: http://127.0.0.1:51915/
- Contact sheet: `operator-witness-contact-sheet.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Decide whether frame-start tile-local rebuild deferral preserves interaction preview/rebuild scheduling without changing route identity.
- Expected visual delta: No visual convergence is expected; route identity and latency/readiness evidence are the target.
- Evidence surface: operator witness loop report, route identity JSON, readiness timing diagnostics, and witness-only visual diagnostics separated from blocking harness findings


## Witness Set

- Capture count: 5
- Operator visual captures: 3
- Filmstrip captures: 2
- Visual contracts: alpha-fallthrough-close-view, alpha-fallthrough-orbit-frame
- Witness views: default, dessert-close, dessert-porous-close
- Renderers: tile-local-visible
- Arena backends: gpu
- Tile budgets: 16px/256 refs

## Timing

- Total loop ms: 39127
- Total capture ms: 37804
- Slowest capture: porous-close-orbit-right (10900ms)
- Slowest stage: porous-close-orbit-right/settle-after-interaction (5003ms)
- Slowest operator readiness: session/initial-readiness (555ms)
- Slowest app frame stage: whole-render-final-color/tile-local-scene-state-refresh/create-state (56.4ms, frame 3)
- Slowest app frame total: whole-render-final-color (58.8ms, frame 3)
- Source-frontier pack slowest substage: not reported
- Tile-local scene-state slowest substage: porous-close-final-color/tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (32.3ms, frame 46)
- Source-frontier pack counts: not reported
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (555ms readiness vs 56.4ms app-frame stage; gap 498.6ms)
- Operator readiness vs app frame total: app-frame-total-not-reported (555ms readiness; readiness capture session, app-frame capture unknown)
- Operator readiness vs observed poll frame total: app-frame-total-not-reported (555ms readiness; readiness capture session, app-frame capture unknown)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=555ms slowestPoll=346ms@1 observedFrame=2 observedFrameTotal=1.5ms observedFrameSlowestStage=evidence-exposure:1.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=1 slowestPollObservedFrameTotal=51.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:47.8ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (20.9ms, frame 1) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-retained-refs-missing

- whole-render-final-color: 5234ms (apply-view:1ms, view-readiness:106ms, settle-before-interaction:5002ms, collect-settled-evidence:13ms, screenshot:26ms, image-analysis:74ms, trace-canvas-parity:12ms, classify-smoke:0ms, witness-diagnostics:0ms)
- dessert-close-final-color: 5488ms (apply-view:3ms, view-readiness:319ms, settle-before-interaction:5001ms, collect-settled-evidence:12ms, screenshot:58ms, image-analysis:80ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 5577ms (apply-view:1ms, view-readiness:354ms, settle-before-interaction:5002ms, collect-settled-evidence:10ms, screenshot:106ms, image-analysis:87ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 10605ms (apply-view:1ms, view-readiness:43ms, settle-before-interaction:5002ms, interactions:3ms, interaction-readiness:358ms, settle-after-interaction:5001ms, collect-settled-evidence:3ms, screenshot:79ms, image-analysis:99ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 10900ms (apply-view:2ms, view-readiness:322ms, settle-before-interaction:5002ms, interactions:5ms, interaction-readiness:361ms, settle-after-interaction:5003ms, collect-settled-evidence:11ms, screenshot:92ms, image-analysis:86ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:51915/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 2644
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 28023 / 921600 (3.041%)
- Total capture ms: 5234
- Readiness diagnostics: ready=true source=compact-readiness polls=2 failed=1 elapsed=106ms slowestPoll=2ms@2 observedFrame=3 observedFrameTotal=58.8ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:56.4ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.6ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=58.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:56.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.6ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=operator-witness-revision-pending
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=2 failed=1 elapsed=106ms slowestPoll=2ms@2 observedFrame=3 observedFrameTotal=58.8ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:56.4ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.6ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=58.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:56.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.6ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=operator-witness-revision-pending}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:51915/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 11901
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 193028 / 921600 (20.945%)
- Total capture ms: 5488
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=318ms slowestPoll=110ms@3 observedFrame=24 observedFrameTotal=152.6ms observedFrameSlowestStage=alpha-density:106.3ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (20.3ms, frame 24) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=152.6ms slowestPollObservedFrameSlowestStage=alpha-density:106.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (20.3ms, frame 24) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=318ms slowestPoll=110ms@3 observedFrame=24 observedFrameTotal=152.6ms observedFrameSlowestStage=alpha-density:106.3ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (20.3ms, frame 24) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=152.6ms slowestPollObservedFrameSlowestStage=alpha-density:106.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (20.3ms, frame 24) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:51915/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Visual contract: alpha-fallthrough-close-view
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 26350
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 919471 / 921600 (99.769%)
- Total capture ms: 5577
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=354ms slowestPoll=142ms@3 observedFrame=46 observedFrameTotal=191.6ms observedFrameSlowestStage=alpha-density:138.1ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (32.3ms, frame 46) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=46 slowestPollObservedFrameTotal=191.6ms slowestPollObservedFrameSlowestStage=alpha-density:138.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (32.3ms, frame 46) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=354ms slowestPoll=142ms@3 observedFrame=46 observedFrameTotal=191.6ms observedFrameSlowestStage=alpha-density:138.1ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (32.3ms, frame 46) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=46 slowestPollObservedFrameTotal=191.6ms slowestPollObservedFrameSlowestStage=alpha-density:138.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (32.3ms, frame 46) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:51915/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 27764
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 909897 / 921600 (98.730%)
- Total capture ms: 10605
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=357ms slowestPoll=143ms@3 observedFrame=68 observedFrameTotal=194.8ms observedFrameSlowestStage=alpha-density:145.4ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.8ms, frame 68) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=68 slowestPollObservedFrameTotal=194.8ms slowestPollObservedFrameSlowestStage=alpha-density:145.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.8ms, frame 68) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=43ms slowestPoll=43ms@1 observedFrame=48 observedFrameTotal=41.2ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:40ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (20.7ms, frame 48) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=48 slowestPollObservedFrameTotal=41.2ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:40ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (20.7ms, frame 48) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=357ms slowestPoll=143ms@3 observedFrame=68 observedFrameTotal=194.8ms observedFrameSlowestStage=alpha-density:145.4ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.8ms, frame 68) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=68 slowestPollObservedFrameTotal=194.8ms slowestPollObservedFrameSlowestStage=alpha-density:145.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.8ms, frame 68) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:51915/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 25311
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 917044 / 921600 (99.506%)
- Total capture ms: 10900
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=361ms slowestPoll=141ms@3 observedFrame=111 observedFrameTotal=193.7ms observedFrameSlowestStage=alpha-density:140.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.7ms, frame 111) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=111 slowestPollObservedFrameTotal=193.7ms slowestPollObservedFrameSlowestStage=alpha-density:140.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.7ms, frame 111) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=322ms slowestPoll=115ms@3 observedFrame=89 observedFrameTotal=159.2ms observedFrameSlowestStage=alpha-density:120ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (20.5ms, frame 89) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=89 slowestPollObservedFrameTotal=159.2ms slowestPollObservedFrameSlowestStage=alpha-density:120ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (20.5ms, frame 89) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=361ms slowestPoll=141ms@3 observedFrame=111 observedFrameTotal=193.7ms observedFrameSlowestStage=alpha-density:140.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.7ms, frame 111) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=111 slowestPollObservedFrameTotal=193.7ms slowestPollObservedFrameSlowestStage=alpha-density:140.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.7ms, frame 111) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}


## Blocking Harness Findings

- None

## Witness Diagnostics

These diagnostics are witness-only visual pressure from the backing analysis. They do not change the operator-witness pass/fail status unless the harness findings above fail.

- whole-render-final-color/projection-anisotropy (suspect): Projection anisotropy witness found ratio 70.33 across 1174 splats; route to conic-reckoner after field metadata is canonical.
- whole-render-final-color/compositing-ambiguous (suspect): Alpha density witness found 23 hot tiles with max mass 246902.52.
- dessert-close-final-color/projection-anisotropy (suspect): Projection anisotropy witness found ratio 70.33 across 1174 splats; route to conic-reckoner after field metadata is canonical.
- dessert-close-final-color/compositing-ambiguous (suspect): Alpha density witness found 23 hot tiles with max mass 246902.52.
- porous-close-final-color/projection-anisotropy (suspect): Projection anisotropy witness found ratio 70.33 across 1174 splats; route to conic-reckoner after field metadata is canonical.
- porous-close-final-color/compositing-ambiguous (suspect): Alpha density witness found 23 hot tiles with max mass 246902.52.
- porous-close-orbit-left/projection-anisotropy (suspect): Projection anisotropy witness found ratio 70.33 across 1174 splats; route to conic-reckoner after field metadata is canonical.
- porous-close-orbit-left/compositing-ambiguous (suspect): Alpha density witness found 23 hot tiles with max mass 246902.52.
- porous-close-orbit-right/projection-anisotropy (suspect): Projection anisotropy witness found ratio 70.33 across 1174 splats; route to conic-reckoner after field metadata is canonical.
- porous-close-orbit-right/compositing-ambiguous (suspect): Alpha density witness found 23 hot tiles with max mass 246902.52.

## Route Identity

```json
[
  {
    "id": "whole-render-final-color",
    "role": "operator-visual",
    "routeIdentity": {
      "captureId": "whole-render-final-color",
      "evidenceRole": "operator-visual",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "default",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "wgslProjectedRefStream": null,
      "requestedWgslProjectedRefStream": null,
      "effectiveWgslProjectedRefStream": "wgsl-projected-ref-stream-source-frontier",
      "tileDebug": null,
      "debug": null,
      "traceAnchors": null,
      "traceAnchor": null,
      "presentationAnchors": null,
      "presentationAnchor": null,
      "tileLocalPresentationAnchors": null,
      "tileLocalPresentationAnchor": null,
      "presentationScope": "full-scene",
      "presentationMode": null,
      "tileLocalPresentationScope": null,
      "tileLocalPresentationMode": null,
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "canvas": {
        "width": 1280,
        "height": 720,
        "clientWidth": 1280,
        "clientHeight": 720
      }
    }
  },
  {
    "id": "dessert-close-final-color",
    "role": "operator-visual",
    "routeIdentity": {
      "captureId": "dessert-close-final-color",
      "evidenceRole": "operator-visual",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "wgslProjectedRefStream": null,
      "requestedWgslProjectedRefStream": null,
      "effectiveWgslProjectedRefStream": "wgsl-projected-ref-stream-source-frontier",
      "tileDebug": null,
      "debug": null,
      "traceAnchors": null,
      "traceAnchor": null,
      "presentationAnchors": null,
      "presentationAnchor": null,
      "tileLocalPresentationAnchors": null,
      "tileLocalPresentationAnchor": null,
      "presentationScope": "full-scene",
      "presentationMode": null,
      "tileLocalPresentationScope": null,
      "tileLocalPresentationMode": null,
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "canvas": {
        "width": 1280,
        "height": 720,
        "clientWidth": 1280,
        "clientHeight": 720
      }
    }
  },
  {
    "id": "porous-close-final-color",
    "role": "operator-visual",
    "routeIdentity": {
      "captureId": "porous-close-final-color",
      "evidenceRole": "operator-visual",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-porous-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "wgslProjectedRefStream": null,
      "requestedWgslProjectedRefStream": null,
      "effectiveWgslProjectedRefStream": "wgsl-projected-ref-stream-source-frontier",
      "tileDebug": null,
      "debug": null,
      "traceAnchors": null,
      "traceAnchor": null,
      "presentationAnchors": null,
      "presentationAnchor": null,
      "tileLocalPresentationAnchors": null,
      "tileLocalPresentationAnchor": null,
      "presentationScope": "full-scene",
      "presentationMode": null,
      "tileLocalPresentationScope": null,
      "tileLocalPresentationMode": null,
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "canvas": {
        "width": 1280,
        "height": 720,
        "clientWidth": 1280,
        "clientHeight": 720
      }
    }
  },
  {
    "id": "porous-close-orbit-left",
    "role": "operator-filmstrip",
    "routeIdentity": {
      "captureId": "porous-close-orbit-left",
      "evidenceRole": "operator-filmstrip",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-porous-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "wgslProjectedRefStream": null,
      "requestedWgslProjectedRefStream": null,
      "effectiveWgslProjectedRefStream": "wgsl-projected-ref-stream-source-frontier",
      "tileDebug": null,
      "debug": null,
      "traceAnchors": null,
      "traceAnchor": null,
      "presentationAnchors": null,
      "presentationAnchor": null,
      "tileLocalPresentationAnchors": null,
      "tileLocalPresentationAnchor": null,
      "presentationScope": "full-scene",
      "presentationMode": null,
      "tileLocalPresentationScope": null,
      "tileLocalPresentationMode": null,
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "canvas": {
        "width": 1280,
        "height": 720,
        "clientWidth": 1280,
        "clientHeight": 720
      }
    }
  },
  {
    "id": "porous-close-orbit-right",
    "role": "operator-filmstrip",
    "routeIdentity": {
      "captureId": "porous-close-orbit-right",
      "evidenceRole": "operator-filmstrip",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-porous-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "wgslProjectedRefStream": null,
      "requestedWgslProjectedRefStream": null,
      "effectiveWgslProjectedRefStream": "wgsl-projected-ref-stream-source-frontier",
      "tileDebug": null,
      "debug": null,
      "traceAnchors": null,
      "traceAnchor": null,
      "presentationAnchors": null,
      "presentationAnchor": null,
      "tileLocalPresentationAnchors": null,
      "tileLocalPresentationAnchor": null,
      "presentationScope": "full-scene",
      "presentationMode": null,
      "tileLocalPresentationScope": null,
      "tileLocalPresentationMode": null,
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "canvas": {
        "width": 1280,
        "height": 720,
        "clientWidth": 1280,
        "clientHeight": 720
      }
    }
  }
]
```

## Boundary

- This is operator visual evidence, not trace evidence.
- Trace and presentation anchors are removed from every capture URL.
- Broad multi-anchor trace diagnostics remain a separate blocker.
- This harness does not claim production visual repair.

## Summary

PASS: operator witness loop captured whole render, close crops, and interaction filmstrip as real Scaniverse visual evidence.
