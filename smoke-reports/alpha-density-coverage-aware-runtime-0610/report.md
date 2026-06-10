# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-10T09:38:41.792Z
- Base URL: http://127.0.0.1:56240/
- Contact sheet: `operator-witness-contact-sheet.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Inspect whole-render-first operator visual evidence before choosing the next renderer repair.
- Expected visual delta: none expected from this harness-only slice
- Evidence surface: operator witness loop report, contact sheet, per-frame screenshots, and route identity JSON


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

- Total loop ms: 38038
- Total capture ms: 37099
- Slowest capture: porous-close-orbit-right (10620ms)
- Slowest stage: porous-close-final-color/settle-before-interaction (5002ms)
- Slowest operator readiness: session/initial-readiness (694ms)
- Slowest app frame stage: whole-render-final-color/tile-local-scene-state-refresh/create-state (61.2ms, frame 3)
- Slowest app frame total: whole-render-final-color (63.8ms, frame 3)
- Source-frontier pack slowest substage: not reported
- Tile-local scene-state slowest substage: whole-render-final-color/tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.3ms, frame 3)
- Source-frontier pack counts: not reported
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (694ms readiness vs 61.2ms app-frame stage; gap 632.8ms)
- Operator readiness vs app frame total: app-frame-total-not-reported (694ms readiness; readiness capture session, app-frame capture unknown)
- Operator readiness vs observed poll frame total: app-frame-total-not-reported (694ms readiness; readiness capture session, app-frame capture unknown)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=4 failed=3 elapsed=694ms slowestPoll=385ms@2 observedFrame=2 observedFrameTotal=2.2ms observedFrameSlowestStage=evidence-exposure:1.8ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=1 slowestPollObservedFrameTotal=60.4ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:56ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.7ms, frame 1) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-retained-refs-missing

- whole-render-final-color: 5204ms (apply-view:0ms, view-readiness:67ms, settle-before-interaction:5001ms, collect-settled-evidence:9ms, screenshot:32ms, image-analysis:80ms, trace-canvas-parity:14ms, classify-smoke:0ms, witness-diagnostics:0ms)
- dessert-close-final-color: 5368ms (apply-view:2ms, view-readiness:223ms, settle-before-interaction:5000ms, collect-settled-evidence:5ms, screenshot:41ms, image-analysis:82ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 5432ms (apply-view:2ms, view-readiness:224ms, settle-before-interaction:5002ms, collect-settled-evidence:9ms, screenshot:82ms, image-analysis:97ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 10475ms (apply-view:1ms, view-readiness:49ms, settle-before-interaction:5001ms, interactions:1ms, interaction-readiness:218ms, settle-after-interaction:5001ms, collect-settled-evidence:5ms, screenshot:79ms, image-analysis:104ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 10620ms (apply-view:1ms, view-readiness:217ms, settle-before-interaction:5002ms, interactions:0ms, interaction-readiness:216ms, settle-after-interaction:5001ms, collect-settled-evidence:4ms, screenshot:69ms, image-analysis:95ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:56240/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 9577
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 37527 / 921600 (4.072%)
- Total capture ms: 5204
- Readiness diagnostics: ready=true source=compact-readiness polls=1 failed=0 elapsed=66ms slowestPoll=66ms@1 observedFrame=3 observedFrameTotal=63.8ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:61.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.3ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=63.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:61.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.3ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=66ms slowestPoll=66ms@1 observedFrame=3 observedFrameTotal=63.8ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:61.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.3ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=63.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:61.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.3ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:56240/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 40555
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 209480 / 921600 (22.730%)
- Total capture ms: 5368
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=223ms slowestPoll=16ms@3 observedFrame=25 observedFrameTotal=54.7ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:53.1ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.5ms, frame 25) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=25 slowestPollObservedFrameTotal=54.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:53.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.5ms, frame 25) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=223ms slowestPoll=16ms@3 observedFrame=25 observedFrameTotal=54.7ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:53.1ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.5ms, frame 25) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=25 slowestPollObservedFrameTotal=54.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:53.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.5ms, frame 25) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:56240/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Visual contract: alpha-fallthrough-close-view
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 83603
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 918317 / 921600 (99.644%)
- Total capture ms: 5432
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=224ms slowestPoll=17ms@3 observedFrame=47 observedFrameTotal=57.4ms observedFrameSlowestStage=tile-local-scene-state-refresh:56ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.5ms, frame 47) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=47 slowestPollObservedFrameTotal=57.4ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:56ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.5ms, frame 47) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=224ms slowestPoll=17ms@3 observedFrame=47 observedFrameTotal=57.4ms observedFrameSlowestStage=tile-local-scene-state-refresh:56ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.5ms, frame 47) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=47 slowestPollObservedFrameTotal=57.4ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:56ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.5ms, frame 47) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:56240/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 88594
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 917208 / 921600 (99.523%)
- Total capture ms: 10475
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=218ms slowestPoll=12ms@3 observedFrame=70 observedFrameTotal=49.9ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:49.1ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.1ms, frame 70) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=70 slowestPollObservedFrameTotal=49.9ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:49.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.1ms, frame 70) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=49ms slowestPoll=49ms@1 observedFrame=49 observedFrameTotal=46.8ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:45.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (23.2ms, frame 49) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=49 slowestPollObservedFrameTotal=46.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:45.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (23.2ms, frame 49) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=218ms slowestPoll=12ms@3 observedFrame=70 observedFrameTotal=49.9ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:49.1ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.1ms, frame 70) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=70 slowestPollObservedFrameTotal=49.9ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:49.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.1ms, frame 70) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:56240/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 78992
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 914617 / 921600 (99.242%)
- Total capture ms: 10620
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=216ms slowestPoll=8ms@3 observedFrame=114 observedFrameTotal=48.7ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:46ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.4ms, frame 114) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=114 slowestPollObservedFrameTotal=48.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:46ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.4ms, frame 114) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=217ms slowestPoll=10ms@3 observedFrame=92 observedFrameTotal=48.3ms observedFrameSlowestStage=tile-local-scene-state-refresh:47.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (23.5ms, frame 92) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=92 slowestPollObservedFrameTotal=48.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:47.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (23.5ms, frame 92) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=216ms slowestPoll=8ms@3 observedFrame=114 observedFrameTotal=48.7ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:46ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.4ms, frame 114) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=114 slowestPollObservedFrameTotal=48.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:46ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.4ms, frame 114) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}


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
