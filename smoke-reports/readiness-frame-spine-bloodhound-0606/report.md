# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-07T02:43:16.524Z
- Base URL: http://127.0.0.1:6176/?wgslProjectedRefStream=source-frontier
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

- Total loop ms: 68287
- Total capture ms: 62799
- Slowest capture: porous-close-orbit-right (20199ms)
- Slowest stage: porous-close-final-color/view-readiness (8010ms)
- Slowest operator readiness: porous-close-final-color/view-readiness (8010ms)
- Slowest app frame stage: whole-render-final-color/wgsl-source-frontier-pack-candidate-source-inputs (1441.9ms, frame 3)
- Slowest app frame total: whole-render-final-color (1878ms, frame 3)
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (8010ms readiness vs 1441.9ms app-frame stage; gap 6568.1ms)
- Operator readiness vs app frame total: operator-readiness-exceeds-app-frame-total (8010ms readiness vs 23.6ms app-frame total; gap 7986.4ms; readiness capture porous-close-final-color, app-frame capture porous-close-final-color)
- Operator readiness vs observed poll frame total: operator-readiness-exceeds-app-frame-total (8010ms readiness vs 7849.4ms app-frame total; gap 160.6ms; readiness capture porous-close-final-color, app-frame capture porous-close-final-color)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=2 failed=1 elapsed=4710ms slowestPoll=4603ms@1 observedFrame=2 observedFrameTotal=6.5ms observedFrameSlowestStage=evidence-exposure:6.2ms slowestPollObservedFrame=1 blockers=none lastFailed=visual-smoke-not-ready

- whole-render-final-color: 4267ms (apply-view:1ms, view-readiness:1882ms, settle-before-interaction:2001ms, collect-settled-evidence:13ms, screenshot:48ms, image-analysis:249ms, trace-canvas-parity:73ms, classify-smoke:0ms, witness-diagnostics:0ms)
- dessert-close-final-color: 8173ms (apply-view:27ms, view-readiness:5670ms, settle-before-interaction:2002ms, collect-settled-evidence:8ms, screenshot:87ms, image-analysis:234ms, trace-canvas-parity:145ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 10669ms (apply-view:31ms, view-readiness:8010ms, settle-before-interaction:2001ms, collect-settled-evidence:10ms, screenshot:122ms, image-analysis:400ms, trace-canvas-parity:95ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 19491ms (apply-view:6ms, view-readiness:7202ms, settle-before-interaction:2002ms, interactions:4ms, interaction-readiness:7696ms, settle-after-interaction:2002ms, collect-settled-evidence:7ms, screenshot:99ms, image-analysis:324ms, trace-canvas-parity:149ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 20199ms (apply-view:11ms, view-readiness:7863ms, settle-before-interaction:2001ms, interactions:3ms, interaction-readiness:7745ms, settle-after-interaction:2001ms, collect-settled-evidence:9ms, screenshot:134ms, image-analysis:300ms, trace-canvas-parity:132ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:6176/?wgslProjectedRefStream=source-frontier&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 37590
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 40593 / 921600 (4.405%)
- Total capture ms: 4267
- Readiness diagnostics: ready=true source=compact-readiness polls=1 failed=0 elapsed=1881ms slowestPoll=1881ms@1 observedFrame=3 observedFrameTotal=1878ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:1441.9ms slowestPollObservedFrame=3 blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=1881ms slowestPoll=1881ms@1 observedFrame=3 observedFrameTotal=1878ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:1441.9ms slowestPollObservedFrame=3 blockers=none lastFailed=none}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:6176/?wgslProjectedRefStream=source-frontier&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 157547
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 206477 / 921600 (22.404%)
- Total capture ms: 8173
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=5670ms slowestPoll=5451ms@3 observedFrame=23 observedFrameTotal=5532.6ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:3816.2ms slowestPollObservedFrame=23 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=5670ms slowestPoll=5451ms@3 observedFrame=23 observedFrameTotal=5532.6ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:3816.2ms slowestPollObservedFrame=23 blockers=none lastFailed=visual-smoke-not-ready}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:6176/?wgslProjectedRefStream=source-frontier&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 320071
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921234 / 921600 (99.960%)
- Total capture ms: 10669
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=8010ms slowestPoll=7771ms@3 observedFrame=38 observedFrameTotal=7849.4ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4701.3ms slowestPollObservedFrame=38 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=8010ms slowestPoll=7771ms@3 observedFrame=38 observedFrameTotal=7849.4ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4701.3ms slowestPollObservedFrame=38 blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:6176/?wgslProjectedRefStream=source-frontier&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 340087
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921330 / 921600 (99.971%)
- Total capture ms: 19491
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=7696ms slowestPoll=7453ms@3 observedFrame=47 observedFrameTotal=7526.6ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4655.9ms slowestPollObservedFrame=47 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=7202ms slowestPoll=7201ms@1 observedFrame=40 observedFrameTotal=7198.5ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4612.5ms slowestPollObservedFrame=40 blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=7696ms slowestPoll=7453ms@3 observedFrame=47 observedFrameTotal=7526.6ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4655.9ms slowestPollObservedFrame=47 blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:6176/?wgslProjectedRefStream=source-frontier&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 302509
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921120 / 921600 (99.948%)
- Total capture ms: 20199
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=7745ms slowestPoll=7501ms@3 observedFrame=60 observedFrameTotal=7562.5ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4529.3ms slowestPollObservedFrame=60 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=7863ms slowestPoll=7607ms@3 observedFrame=53 observedFrameTotal=7708.7ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4499.8ms slowestPollObservedFrame=53 blockers=none lastFailed=visual-smoke-not-ready} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=7745ms slowestPoll=7501ms@3 observedFrame=60 observedFrameTotal=7562.5ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4529.3ms slowestPollObservedFrame=60 blockers=none lastFailed=visual-smoke-not-ready}


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
      "wgslProjectedRefStream": "source-frontier",
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
      "wgslProjectedRefStream": "source-frontier",
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
      "wgslProjectedRefStream": "source-frontier",
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
      "wgslProjectedRefStream": "source-frontier",
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
      "wgslProjectedRefStream": "source-frontier",
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
