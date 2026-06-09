# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-09T02:18:51.290Z
- Base URL: http://127.0.0.1:50758/
- Contact sheet: `operator-witness-contact-sheet.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: decide whether depth-ordered source-frontier pool slots reduce alpha fallthrough enough to land or reveal a blocker
- Expected visual delta: alpha-fallthrough close/orbit views should reduce plate/background leakage through foreground dessert; if unchanged, report blocker
- Evidence surface: operator-witness contact sheet and report


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

- Total loop ms: 38758
- Total capture ms: 37733
- Slowest capture: porous-close-orbit-right (10883ms)
- Slowest stage: dessert-close-final-color/settle-before-interaction (5002ms)
- Slowest operator readiness: session/initial-readiness (724ms)
- Slowest app frame stage: porous-close-final-color/alpha-density (136.3ms, frame 45)
- Slowest app frame total: porous-close-final-color (188.2ms, frame 45)
- Source-frontier pack slowest substage: not reported
- Tile-local scene-state slowest substage: whole-render-final-color/tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30.8ms, frame 3)
- Source-frontier pack counts: not reported
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (724ms readiness vs 136.3ms app-frame stage; gap 587.7ms)
- Operator readiness vs app frame total: app-frame-total-not-reported (724ms readiness; readiness capture session, app-frame capture unknown)
- Operator readiness vs observed poll frame total: app-frame-total-not-reported (724ms readiness; readiness capture session, app-frame capture unknown)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=5 failed=4 elapsed=724ms slowestPoll=299ms@3 observedFrame=2 observedFrameTotal=2ms observedFrameSlowestStage=evidence-exposure:1.6ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=1 slowestPollObservedFrameTotal=63.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:59.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.2ms, frame 1) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-retained-refs-missing

- whole-render-final-color: 5192ms (apply-view:1ms, view-readiness:66ms, settle-before-interaction:5001ms, collect-settled-evidence:6ms, screenshot:20ms, image-analysis:81ms, trace-canvas-parity:16ms, classify-smoke:1ms, witness-diagnostics:0ms)
- dessert-close-final-color: 5487ms (apply-view:2ms, view-readiness:331ms, settle-before-interaction:5002ms, collect-settled-evidence:5ms, screenshot:50ms, image-analysis:81ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 5556ms (apply-view:1ms, view-readiness:352ms, settle-before-interaction:5001ms, collect-settled-evidence:3ms, screenshot:80ms, image-analysis:101ms, trace-canvas-parity:18ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 10615ms (apply-view:1ms, view-readiness:47ms, settle-before-interaction:5000ms, interactions:2ms, interaction-readiness:347ms, settle-after-interaction:5002ms, collect-settled-evidence:6ms, screenshot:98ms, image-analysis:96ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 10883ms (apply-view:2ms, view-readiness:336ms, settle-before-interaction:5002ms, interactions:1ms, interaction-readiness:333ms, settle-after-interaction:5002ms, collect-settled-evidence:6ms, screenshot:90ms, image-analysis:95ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:50758/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 2650
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 27004 / 921600 (2.930%)
- Total capture ms: 5192
- Readiness diagnostics: ready=true source=compact-readiness polls=1 failed=0 elapsed=66ms slowestPoll=66ms@1 observedFrame=3 observedFrameTotal=64.1ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:61.6ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30.8ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=64.1ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:61.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30.8ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=66ms slowestPoll=66ms@1 observedFrame=3 observedFrameTotal=64.1ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:61.6ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30.8ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=64.1ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:61.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30.8ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:50758/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 11895
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 192521 / 921600 (20.890%)
- Total capture ms: 5487
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=331ms slowestPoll=121ms@3 observedFrame=24 observedFrameTotal=164.5ms observedFrameSlowestStage=alpha-density:110.8ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.8ms, frame 24) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=164.5ms slowestPollObservedFrameSlowestStage=alpha-density:110.8ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.8ms, frame 24) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=331ms slowestPoll=121ms@3 observedFrame=24 observedFrameTotal=164.5ms observedFrameSlowestStage=alpha-density:110.8ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.8ms, frame 24) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=164.5ms slowestPollObservedFrameSlowestStage=alpha-density:110.8ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.8ms, frame 24) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:50758/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Visual contract: alpha-fallthrough-close-view
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 26339
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 918604 / 921600 (99.675%)
- Total capture ms: 5556
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=352ms slowestPoll=144ms@3 observedFrame=45 observedFrameTotal=188.2ms observedFrameSlowestStage=alpha-density:136.3ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.2ms, frame 45) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=45 slowestPollObservedFrameTotal=188.2ms slowestPollObservedFrameSlowestStage=alpha-density:136.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.2ms, frame 45) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=352ms slowestPoll=144ms@3 observedFrame=45 observedFrameTotal=188.2ms observedFrameSlowestStage=alpha-density:136.3ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.2ms, frame 45) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=45 slowestPollObservedFrameTotal=188.2ms slowestPollObservedFrameSlowestStage=alpha-density:136.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.2ms, frame 45) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:50758/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 27740
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 908819 / 921600 (98.613%)
- Total capture ms: 10615
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=347ms slowestPoll=141ms@3 observedFrame=67 observedFrameTotal=180.7ms observedFrameSlowestStage=alpha-density:133.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.1ms, frame 67) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=67 slowestPollObservedFrameTotal=180.7ms slowestPollObservedFrameSlowestStage=alpha-density:133.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.1ms, frame 67) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=47ms slowestPoll=47ms@1 observedFrame=46 observedFrameTotal=45.5ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:43.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22ms, frame 46) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=46 slowestPollObservedFrameTotal=45.5ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:43.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22ms, frame 46) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=347ms slowestPoll=141ms@3 observedFrame=67 observedFrameTotal=180.7ms observedFrameSlowestStage=alpha-density:133.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.1ms, frame 67) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=67 slowestPollObservedFrameTotal=180.7ms slowestPollObservedFrameSlowestStage=alpha-density:133.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.1ms, frame 67) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:50758/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 25336
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 917861 / 921600 (99.594%)
- Total capture ms: 10883
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=333ms slowestPoll=126ms@3 observedFrame=109 observedFrameTotal=167.6ms observedFrameSlowestStage=alpha-density:120.3ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.6ms, frame 109) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=109 slowestPollObservedFrameTotal=167.6ms slowestPollObservedFrameSlowestStage=alpha-density:120.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.6ms, frame 109) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=336ms slowestPoll=130ms@3 observedFrame=88 observedFrameTotal=168.8ms observedFrameSlowestStage=alpha-density:127.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.1ms, frame 88) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=88 slowestPollObservedFrameTotal=168.8ms slowestPollObservedFrameSlowestStage=alpha-density:127.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.1ms, frame 88) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=333ms slowestPoll=126ms@3 observedFrame=109 observedFrameTotal=167.6ms observedFrameSlowestStage=alpha-density:120.3ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.6ms, frame 109) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=109 slowestPollObservedFrameTotal=167.6ms slowestPollObservedFrameSlowestStage=alpha-density:120.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.6ms, frame 109) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}


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
