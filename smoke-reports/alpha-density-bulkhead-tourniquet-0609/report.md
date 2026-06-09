# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-09T04:25:00.519Z
- Base URL: http://127.0.0.1:59493/
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

- Total loop ms: 7981
- Total capture ms: 6936
- Slowest capture: porous-close-orbit-right (2082ms)
- Slowest stage: porous-close-orbit-left/settle-before-interaction (602ms)
- Slowest operator readiness: session/initial-readiness (813ms)
- Slowest app frame stage: porous-close-final-color/alpha-density (141.1ms, frame 47)
- Slowest app frame total: porous-close-final-color (195.7ms, frame 47)
- Source-frontier pack slowest substage: not reported
- Tile-local scene-state slowest substage: whole-render-final-color/tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.6ms, frame 3)
- Source-frontier pack counts: not reported
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (813ms readiness vs 141.1ms app-frame stage; gap 671.9ms)
- Operator readiness vs app frame total: app-frame-total-not-reported (813ms readiness; readiness capture session, app-frame capture unknown)
- Operator readiness vs observed poll frame total: app-frame-total-not-reported (813ms readiness; readiness capture session, app-frame capture unknown)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=6 failed=5 elapsed=812ms slowestPoll=290ms@3 observedFrame=2 observedFrameTotal=1.4ms observedFrameSlowestStage=evidence-exposure:1.1ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=1 slowestPollObservedFrameTotal=59.6ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:55.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (25.7ms, frame 1) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-retained-refs-missing

- whole-render-final-color: 774ms (apply-view:1ms, view-readiness:62ms, settle-before-interaction:601ms, collect-settled-evidence:5ms, screenshot:16ms, image-analysis:75ms, trace-canvas-parity:14ms, classify-smoke:0ms, witness-diagnostics:0ms)
- dessert-close-final-color: 1084ms (apply-view:2ms, view-readiness:327ms, settle-before-interaction:601ms, collect-settled-evidence:4ms, screenshot:50ms, image-analysis:84ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 1174ms (apply-view:1ms, view-readiness:365ms, settle-before-interaction:601ms, collect-settled-evidence:4ms, screenshot:79ms, image-analysis:106ms, trace-canvas-parity:18ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 1822ms (apply-view:1ms, view-readiness:48ms, settle-before-interaction:602ms, interactions:1ms, interaction-readiness:351ms, settle-after-interaction:601ms, collect-settled-evidence:3ms, screenshot:96ms, image-analysis:102ms, trace-canvas-parity:17ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 2082ms (apply-view:3ms, view-readiness:344ms, settle-before-interaction:601ms, interactions:1ms, interaction-readiness:336ms, settle-after-interaction:601ms, collect-settled-evidence:4ms, screenshot:73ms, image-analysis:102ms, trace-canvas-parity:17ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:59493/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 2647
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 27025 / 921600 (2.932%)
- Total capture ms: 774
- Readiness diagnostics: ready=true source=compact-readiness polls=1 failed=0 elapsed=62ms slowestPoll=62ms@1 observedFrame=3 observedFrameTotal=59.9ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:57.7ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.6ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=59.9ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:57.7ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.6ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=62ms slowestPoll=62ms@1 observedFrame=3 observedFrameTotal=59.9ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:57.7ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.6ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=59.9ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:57.7ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.6ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:59493/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 11886
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 192602 / 921600 (20.899%)
- Total capture ms: 1084
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=327ms slowestPoll=117ms@3 observedFrame=25 observedFrameTotal=157.6ms observedFrameSlowestStage=alpha-density:107.7ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.7ms, frame 25) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=25 slowestPollObservedFrameTotal=157.6ms slowestPollObservedFrameSlowestStage=alpha-density:107.7ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.7ms, frame 25) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=327ms slowestPoll=117ms@3 observedFrame=25 observedFrameTotal=157.6ms observedFrameSlowestStage=alpha-density:107.7ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.7ms, frame 25) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=25 slowestPollObservedFrameTotal=157.6ms slowestPollObservedFrameSlowestStage=alpha-density:107.7ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.7ms, frame 25) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:59493/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Visual contract: alpha-fallthrough-close-view
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 26351
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 919482 / 921600 (99.770%)
- Total capture ms: 1174
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=365ms slowestPoll=158ms@3 observedFrame=47 observedFrameTotal=195.7ms observedFrameSlowestStage=alpha-density:141.1ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.4ms, frame 47) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=47 slowestPollObservedFrameTotal=195.7ms slowestPollObservedFrameSlowestStage=alpha-density:141.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.4ms, frame 47) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=365ms slowestPoll=158ms@3 observedFrame=47 observedFrameTotal=195.7ms observedFrameSlowestStage=alpha-density:141.1ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.4ms, frame 47) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=47 slowestPollObservedFrameTotal=195.7ms slowestPollObservedFrameSlowestStage=alpha-density:141.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.4ms, frame 47) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:59493/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 27721
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 919138 / 921600 (99.733%)
- Total capture ms: 1822
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=351ms slowestPoll=145ms@3 observedFrame=69 observedFrameTotal=181.8ms observedFrameSlowestStage=alpha-density:133.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.7ms, frame 69) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=69 slowestPollObservedFrameTotal=181.8ms slowestPollObservedFrameSlowestStage=alpha-density:133.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.7ms, frame 69) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=48ms slowestPoll=48ms@1 observedFrame=48 observedFrameTotal=47.1ms observedFrameSlowestStage=tile-local-scene-state-refresh:45ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (23.2ms, frame 48) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=48 slowestPollObservedFrameTotal=47.1ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:45ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (23.2ms, frame 48) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=351ms slowestPoll=145ms@3 observedFrame=69 observedFrameTotal=181.8ms observedFrameSlowestStage=alpha-density:133.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.7ms, frame 69) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=69 slowestPollObservedFrameTotal=181.8ms slowestPollObservedFrameSlowestStage=alpha-density:133.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.7ms, frame 69) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:59493/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 25350
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 916656 / 921600 (99.464%)
- Total capture ms: 2082
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=336ms slowestPoll=130ms@3 observedFrame=111 observedFrameTotal=170.4ms observedFrameSlowestStage=alpha-density:123.6ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (23.8ms, frame 111) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=111 slowestPollObservedFrameTotal=170.4ms slowestPollObservedFrameSlowestStage=alpha-density:123.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (23.8ms, frame 111) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=344ms slowestPoll=138ms@3 observedFrame=90 observedFrameTotal=173.9ms observedFrameSlowestStage=alpha-density:130.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.5ms, frame 90) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=90 slowestPollObservedFrameTotal=173.9ms slowestPollObservedFrameSlowestStage=alpha-density:130.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.5ms, frame 90) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=336ms slowestPoll=130ms@3 observedFrame=111 observedFrameTotal=170.4ms observedFrameSlowestStage=alpha-density:123.6ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (23.8ms, frame 111) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=111 slowestPollObservedFrameTotal=170.4ms slowestPollObservedFrameSlowestStage=alpha-density:123.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (23.8ms, frame 111) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}


## Findings

- None

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
