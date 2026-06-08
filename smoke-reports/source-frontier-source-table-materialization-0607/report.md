# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-08T00:46:38.355Z
- Base URL: http://127.0.0.1:57327/
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

- Total loop ms: 54985
- Total capture ms: 52856
- Slowest capture: porous-close-orbit-right (16100ms)
- Slowest stage: porous-close-orbit-left/settle-after-interaction (5002ms)
- Slowest operator readiness: porous-close-orbit-left/interaction-readiness (3202ms)
- Slowest app frame stage: whole-render-final-color/tile-local-scene-state-refresh (714.2ms, frame 3)
- Slowest app frame total: whole-render-final-color (718.7ms, frame 3)
- Source-frontier pack slowest substage: not reported
- Source-frontier pack counts: not reported
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (3202ms readiness vs 714.2ms app-frame stage; gap 2487.8ms)
- Operator readiness vs app frame total: operator-readiness-exceeds-app-frame-total (3202ms readiness vs 22.7ms app-frame total; gap 3179.3ms; readiness capture porous-close-orbit-left, app-frame capture porous-close-orbit-left)
- Operator readiness vs observed poll frame total: operator-readiness-exceeds-app-frame-total (3202ms readiness vs 3029.8ms app-frame total; gap 172.2ms; readiness capture porous-close-orbit-left, app-frame capture porous-close-orbit-left)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=4 failed=3 elapsed=1886ms slowestPoll=943ms@3 observedFrame=1 observedFrameTotal=716.2ms observedFrameSlowestStage=tile-local-scene-state-refresh:710.1ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=not reported slowestPollObservedFrameTotal=not reportedms slowestPollObservedFrameSlowestStage=not reported slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready

- whole-render-final-color: 5849ms (apply-view:3ms, view-readiness:727ms, settle-before-interaction:5001ms, collect-settled-evidence:4ms, screenshot:23ms, image-analysis:76ms, trace-canvas-parity:14ms, classify-smoke:1ms, witness-diagnostics:0ms)
- dessert-close-final-color: 7293ms (apply-view:1ms, view-readiness:2145ms, settle-before-interaction:5001ms, collect-settled-evidence:3ms, screenshot:49ms, image-analysis:79ms, trace-canvas-parity:14ms, classify-smoke:1ms, witness-diagnostics:0ms)
- porous-close-final-color: 8017ms (apply-view:1ms, view-readiness:2835ms, settle-before-interaction:5001ms, collect-settled-evidence:3ms, screenshot:69ms, image-analysis:92ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 15597ms (apply-view:1ms, view-readiness:2215ms, settle-before-interaction:5001ms, interactions:2ms, interaction-readiness:3202ms, settle-after-interaction:5002ms, collect-settled-evidence:3ms, screenshot:62ms, image-analysis:94ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 16100ms (apply-view:1ms, view-readiness:2789ms, settle-before-interaction:5001ms, interactions:1ms, interaction-readiness:3121ms, settle-after-interaction:5002ms, collect-settled-evidence:3ms, screenshot:73ms, image-analysis:93ms, trace-canvas-parity:15ms, classify-smoke:1ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:57327/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 37590
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 34000 / 921600 (3.689%)
- Total capture ms: 5849
- Readiness diagnostics: ready=true source=compact-readiness polls=2 failed=1 elapsed=727ms slowestPoll=623ms@2 observedFrame=3 observedFrameTotal=718.7ms observedFrameSlowestStage=tile-local-scene-state-refresh:714.2ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=718.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:714.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=operator-witness-revision-pending
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=2 failed=1 elapsed=727ms slowestPoll=623ms@2 observedFrame=3 observedFrameTotal=718.7ms observedFrameSlowestStage=tile-local-scene-state-refresh:714.2ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=718.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:714.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=operator-witness-revision-pending}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:57327/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 157547
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 199174 / 921600 (21.612%)
- Total capture ms: 7293
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=2145ms slowestPoll=1935ms@3 observedFrame=25 observedFrameTotal=1975.3ms observedFrameSlowestStage=tile-local-scene-state-refresh:1817.3ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=25 slowestPollObservedFrameTotal=1975.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:1817.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2145ms slowestPoll=1935ms@3 observedFrame=25 observedFrameTotal=1975.3ms observedFrameSlowestStage=tile-local-scene-state-refresh:1817.3ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=25 slowestPollObservedFrameTotal=1975.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:1817.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:57327/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 320071
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921236 / 921600 (99.961%)
- Total capture ms: 8017
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=2834ms slowestPoll=2615ms@3 observedFrame=44 observedFrameTotal=2668.8ms observedFrameSlowestStage=tile-local-scene-state-refresh:2434.6ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=44 slowestPollObservedFrameTotal=2668.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2434.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2834ms slowestPoll=2615ms@3 observedFrame=44 observedFrameTotal=2668.8ms observedFrameSlowestStage=tile-local-scene-state-refresh:2434.6ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=44 slowestPollObservedFrameTotal=2668.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2434.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:57327/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 340087
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921291 / 921600 (99.966%)
- Total capture ms: 15597
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=3202ms slowestPoll=2970ms@3 observedFrame=55 observedFrameTotal=3029.8ms observedFrameSlowestStage=tile-local-scene-state-refresh:2744.4ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=55 slowestPollObservedFrameTotal=3029.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2744.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=2215ms slowestPoll=2215ms@1 observedFrame=46 observedFrameTotal=2212.8ms observedFrameSlowestStage=tile-local-scene-state-refresh:2191ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=46 slowestPollObservedFrameTotal=2212.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2191ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=3202ms slowestPoll=2970ms@3 observedFrame=55 observedFrameTotal=3029.8ms observedFrameSlowestStage=tile-local-scene-state-refresh:2744.4ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=55 slowestPollObservedFrameTotal=3029.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2744.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:57327/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 302509
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921243 / 921600 (99.961%)
- Total capture ms: 16100
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=3121ms slowestPoll=2887ms@3 observedFrame=74 observedFrameTotal=2944.4ms observedFrameSlowestStage=tile-local-scene-state-refresh:2670.7ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=74 slowestPollObservedFrameTotal=2944.4ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2670.7ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2789ms slowestPoll=2549ms@3 observedFrame=64 observedFrameTotal=2626.6ms observedFrameSlowestStage=tile-local-scene-state-refresh:2352ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=64 slowestPollObservedFrameTotal=2626.6ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2352ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=3121ms slowestPoll=2887ms@3 observedFrame=74 observedFrameTotal=2944.4ms observedFrameSlowestStage=tile-local-scene-state-refresh:2670.7ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=74 slowestPollObservedFrameTotal=2944.4ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2670.7ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}


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
