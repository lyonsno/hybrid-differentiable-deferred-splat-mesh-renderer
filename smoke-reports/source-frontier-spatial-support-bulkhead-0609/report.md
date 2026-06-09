# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-09T06:20:03.590Z
- Base URL: http://127.0.0.1:49809/
- Contact sheet: `operator-witness-contact-sheet.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Decide whether source-frontier spatial support reduced tile-wide block artifacts without losing foreground seal.
- Expected visual delta: tile-wide square support artifacts should reduce; foreground seal may be partial; exact plate parity is not expected.
- Evidence surface: operator witness loop report, contact sheet, and route identity JSON


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

- Total loop ms: 39420
- Total capture ms: 38271
- Slowest capture: porous-close-orbit-right (11096ms)
- Slowest stage: porous-close-orbit-right/settle-before-interaction (5003ms)
- Slowest operator readiness: session/initial-readiness (919ms)
- Slowest app frame stage: porous-close-orbit-left/alpha-density (200ms, frame 22)
- Slowest app frame total: porous-close-final-color (277.1ms, frame 15)
- Source-frontier pack slowest substage: not reported
- Tile-local scene-state slowest substage: dessert-close-final-color/tile-local-scene-state-refresh/create-state/source-frontier/project-splats (40ms, frame 9)
- Source-frontier pack counts: not reported
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (919ms readiness vs 200ms app-frame stage; gap 719ms)
- Operator readiness vs app frame total: app-frame-total-not-reported (919ms readiness; readiness capture session, app-frame capture unknown)
- Operator readiness vs observed poll frame total: app-frame-total-not-reported (919ms readiness; readiness capture session, app-frame capture unknown)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=5 failed=4 elapsed=918ms slowestPoll=450ms@3 observedFrame=2 observedFrameTotal=4.8ms observedFrameSlowestStage=evidence-exposure:4.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=1 slowestPollObservedFrameTotal=85.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:76.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (39.8ms, frame 1) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-retained-refs-missing

- whole-render-final-color: 5208ms (apply-view:1ms, view-readiness:92ms, settle-before-interaction:5001ms, collect-settled-evidence:5ms, screenshot:17ms, image-analysis:77ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- dessert-close-final-color: 5599ms (apply-view:2ms, view-readiness:409ms, settle-before-interaction:5002ms, collect-settled-evidence:3ms, screenshot:71ms, image-analysis:86ms, trace-canvas-parity:26ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 5641ms (apply-view:1ms, view-readiness:442ms, settle-before-interaction:5002ms, collect-settled-evidence:3ms, screenshot:80ms, image-analysis:97ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 10727ms (apply-view:1ms, view-readiness:74ms, settle-before-interaction:5001ms, interactions:1ms, interaction-readiness:440ms, settle-after-interaction:5002ms, collect-settled-evidence:3ms, screenshot:89ms, image-analysis:99ms, trace-canvas-parity:17ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 11096ms (apply-view:1ms, view-readiness:432ms, settle-before-interaction:5003ms, interactions:1ms, interaction-readiness:467ms, settle-after-interaction:5000ms, collect-settled-evidence:3ms, screenshot:76ms, image-analysis:96ms, trace-canvas-parity:17ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:49809/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 2651
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 27023 / 921600 (2.932%)
- Total capture ms: 5208
- Readiness diagnostics: ready=true source=compact-readiness polls=1 failed=0 elapsed=92ms slowestPoll=92ms@1 observedFrame=3 observedFrameTotal=90ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:84.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (39.5ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=90ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:84.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (39.5ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=92ms slowestPoll=92ms@1 observedFrame=3 observedFrameTotal=90ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:84.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (39.5ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=90ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:84.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (39.5ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:49809/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 11889
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 192308 / 921600 (20.867%)
- Total capture ms: 5599
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=409ms slowestPoll=198ms@3 observedFrame=9 observedFrameTotal=246.8ms observedFrameSlowestStage=alpha-density:166ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (40ms, frame 9) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=9 slowestPollObservedFrameTotal=246.8ms slowestPollObservedFrameSlowestStage=alpha-density:166ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (40ms, frame 9) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=409ms slowestPoll=198ms@3 observedFrame=9 observedFrameTotal=246.8ms observedFrameSlowestStage=alpha-density:166ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (40ms, frame 9) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=9 slowestPollObservedFrameTotal=246.8ms slowestPollObservedFrameSlowestStage=alpha-density:166ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (40ms, frame 9) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:49809/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Visual contract: alpha-fallthrough-close-view
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 26328
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 919307 / 921600 (99.751%)
- Total capture ms: 5641
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=442ms slowestPoll=231ms@3 observedFrame=15 observedFrameTotal=277.1ms observedFrameSlowestStage=alpha-density:199.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (33.3ms, frame 15) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=15 slowestPollObservedFrameTotal=277.1ms slowestPollObservedFrameSlowestStage=alpha-density:199.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (33.3ms, frame 15) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=442ms slowestPoll=231ms@3 observedFrame=15 observedFrameTotal=277.1ms observedFrameSlowestStage=alpha-density:199.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (33.3ms, frame 15) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=15 slowestPollObservedFrameTotal=277.1ms slowestPollObservedFrameSlowestStage=alpha-density:199.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (33.3ms, frame 15) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:49809/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 27739
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 918908 / 921600 (99.708%)
- Total capture ms: 10727
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=440ms slowestPoll=229ms@3 observedFrame=22 observedFrameTotal=275.6ms observedFrameSlowestStage=alpha-density:200ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (32.4ms, frame 22) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=22 slowestPollObservedFrameTotal=275.6ms slowestPollObservedFrameSlowestStage=alpha-density:200ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (32.4ms, frame 22) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=73ms slowestPoll=73ms@1 observedFrame=16 observedFrameTotal=72.3ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:67ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (33.1ms, frame 16) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=16 slowestPollObservedFrameTotal=72.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:67ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (33.1ms, frame 16) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=440ms slowestPoll=229ms@3 observedFrame=22 observedFrameTotal=275.6ms observedFrameSlowestStage=alpha-density:200ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (32.4ms, frame 22) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=22 slowestPollObservedFrameTotal=275.6ms slowestPollObservedFrameSlowestStage=alpha-density:200ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (32.4ms, frame 22) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:49809/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 25332
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 917365 / 921600 (99.540%)
- Total capture ms: 11096
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=467ms slowestPoll=256ms@3 observedFrame=35 observedFrameTotal=273.6ms observedFrameSlowestStage=alpha-density:193.9ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (32.6ms, frame 35) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=35 slowestPollObservedFrameTotal=273.6ms slowestPollObservedFrameSlowestStage=alpha-density:193.9ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (32.6ms, frame 35) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=432ms slowestPoll=222ms@3 observedFrame=28 observedFrameTotal=269.4ms observedFrameSlowestStage=alpha-density:196.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (33.7ms, frame 28) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=28 slowestPollObservedFrameTotal=269.4ms slowestPollObservedFrameSlowestStage=alpha-density:196.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (33.7ms, frame 28) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=467ms slowestPoll=256ms@3 observedFrame=35 observedFrameTotal=273.6ms observedFrameSlowestStage=alpha-density:193.9ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (32.6ms, frame 35) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=35 slowestPollObservedFrameTotal=273.6ms slowestPollObservedFrameSlowestStage=alpha-density:193.9ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/project-splats (32.6ms, frame 35) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}


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
