# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-07T22:43:26.352Z
- Base URL: http://127.0.0.1:59883/
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
- Witness views: default, dessert-close, dessert-porous-close
- Renderers: tile-local-visible
- Arena backends: gpu
- Tile budgets: 16px/256 refs

## Timing

- Total loop ms: 59441
- Total capture ms: 56035
- Slowest capture: porous-close-orbit-left (16534ms)
- Slowest stage: porous-close-orbit-right/settle-before-interaction (5003ms)
- Slowest operator readiness: porous-close-final-color/view-readiness (4312ms)
- Slowest app frame stage: whole-render-final-color/tile-local-scene-state-refresh (1314.5ms, frame 3)
- Slowest app frame total: whole-render-final-color (1322.2ms, frame 3)
- Source-frontier pack slowest substage: not reported
- Source-frontier pack counts: not reported
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (4312ms readiness vs 1314.5ms app-frame stage; gap 2997.5ms)
- Operator readiness vs app frame total: operator-readiness-exceeds-app-frame-total (4312ms readiness vs 33.5ms app-frame total; gap 4278.5ms; readiness capture porous-close-final-color, app-frame capture porous-close-final-color)
- Operator readiness vs observed poll frame total: operator-readiness-exceeds-app-frame-total (4312ms readiness vs 4143.1ms app-frame total; gap 168.9ms; readiness capture porous-close-final-color, app-frame capture porous-close-final-color)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=4 failed=3 elapsed=3133ms slowestPoll=1540ms@3 observedFrame=1 observedFrameTotal=1340ms observedFrameSlowestStage=tile-local-scene-state-refresh:1330ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=not reported slowestPollObservedFrameTotal=not reportedms slowestPollObservedFrameSlowestStage=not reported slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready

- whole-render-final-color: 6473ms (apply-view:5ms, view-readiness:1327ms, settle-before-interaction:5001ms, collect-settled-evidence:5ms, screenshot:36ms, image-analysis:82ms, trace-canvas-parity:17ms, classify-smoke:0ms, witness-diagnostics:0ms)
- dessert-close-final-color: 7772ms (apply-view:1ms, view-readiness:2634ms, settle-before-interaction:5002ms, collect-settled-evidence:3ms, screenshot:40ms, image-analysis:77ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 9503ms (apply-view:1ms, view-readiness:4312ms, settle-before-interaction:5002ms, collect-settled-evidence:3ms, screenshot:60ms, image-analysis:107ms, trace-canvas-parity:17ms, classify-smoke:0ms, witness-diagnostics:1ms)
- porous-close-orbit-left: 16534ms (apply-view:1ms, view-readiness:2509ms, settle-before-interaction:5001ms, interactions:2ms, interaction-readiness:3839ms, settle-after-interaction:5001ms, collect-settled-evidence:3ms, screenshot:71ms, image-analysis:92ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 15753ms (apply-view:1ms, view-readiness:2706ms, settle-before-interaction:5003ms, interactions:46ms, interaction-readiness:2811ms, settle-after-interaction:5002ms, collect-settled-evidence:3ms, screenshot:71ms, image-analysis:93ms, trace-canvas-parity:17ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:59883/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 37590
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 34000 / 921600 (3.689%)
- Total capture ms: 6473
- Readiness diagnostics: ready=true source=compact-readiness polls=2 failed=1 elapsed=1327ms slowestPoll=1222ms@2 observedFrame=3 observedFrameTotal=1322.2ms observedFrameSlowestStage=tile-local-scene-state-refresh:1314.5ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=1322.2ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:1314.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=operator-witness-revision-pending
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=2 failed=1 elapsed=1327ms slowestPoll=1222ms@2 observedFrame=3 observedFrameTotal=1322.2ms observedFrameSlowestStage=tile-local-scene-state-refresh:1314.5ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=1322.2ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:1314.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=operator-witness-revision-pending}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:59883/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 157547
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 199174 / 921600 (21.612%)
- Total capture ms: 7772
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=2634ms slowestPoll=2423ms@3 observedFrame=24 observedFrameTotal=2466.3ms observedFrameSlowestStage=tile-local-scene-state-refresh:2305.1ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=2466.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2305.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2634ms slowestPoll=2423ms@3 observedFrame=24 observedFrameTotal=2466.3ms observedFrameSlowestStage=tile-local-scene-state-refresh:2305.1ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=2466.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2305.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:59883/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 320071
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921236 / 921600 (99.961%)
- Total capture ms: 9503
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=4312ms slowestPoll=4094ms@3 observedFrame=43 observedFrameTotal=4143.1ms observedFrameSlowestStage=tile-local-scene-state-refresh:3887.5ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=43 slowestPollObservedFrameTotal=4143.1ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:3887.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=4312ms slowestPoll=4094ms@3 observedFrame=43 observedFrameTotal=4143.1ms observedFrameSlowestStage=tile-local-scene-state-refresh:3887.5ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=43 slowestPollObservedFrameTotal=4143.1ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:3887.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:59883/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 340087
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921291 / 921600 (99.966%)
- Total capture ms: 16534
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=3839ms slowestPoll=3602ms@3 observedFrame=52 observedFrameTotal=3676.6ms observedFrameSlowestStage=tile-local-scene-state-refresh:3299.3ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=52 slowestPollObservedFrameTotal=3676.6ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:3299.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=2509ms slowestPoll=2509ms@1 observedFrame=45 observedFrameTotal=2507.1ms observedFrameSlowestStage=tile-local-scene-state-refresh:2481.9ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=45 slowestPollObservedFrameTotal=2507.1ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2481.9ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=3839ms slowestPoll=3602ms@3 observedFrame=52 observedFrameTotal=3676.6ms observedFrameSlowestStage=tile-local-scene-state-refresh:3299.3ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=52 slowestPollObservedFrameTotal=3676.6ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:3299.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:59883/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 302509
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921243 / 921600 (99.961%)
- Total capture ms: 15753
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=2811ms slowestPoll=2570ms@3 observedFrame=72 observedFrameTotal=2671.2ms observedFrameSlowestStage=tile-local-scene-state-refresh:2396.4ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=72 slowestPollObservedFrameTotal=2671.2ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2396.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2706ms slowestPoll=2475ms@3 observedFrame=62 observedFrameTotal=2531.5ms observedFrameSlowestStage=tile-local-scene-state-refresh:2262.4ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=62 slowestPollObservedFrameTotal=2531.5ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2262.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2811ms slowestPoll=2570ms@3 observedFrame=72 observedFrameTotal=2671.2ms observedFrameSlowestStage=tile-local-scene-state-refresh:2396.4ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=72 slowestPollObservedFrameTotal=2671.2ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2396.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}


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
