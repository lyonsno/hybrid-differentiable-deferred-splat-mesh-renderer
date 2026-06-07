# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-07T03:16:02.928Z
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

- Total loop ms: 74992
- Total capture ms: 67394
- Slowest capture: porous-close-orbit-right (21838ms)
- Slowest stage: porous-close-orbit-right/interaction-readiness (8760ms)
- Slowest operator readiness: porous-close-orbit-right/interaction-readiness (8760ms)
- Slowest app frame stage: porous-close-orbit-left/wgsl-source-frontier-pack-candidate-source-inputs (4619.3ms, frame 24)
- Slowest app frame total: porous-close-orbit-left (7840.2ms, frame 24)
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (8760ms readiness vs 4619.3ms app-frame stage; gap 4140.7ms)
- Operator readiness vs app frame total: operator-readiness-exceeds-app-frame-total (8760ms readiness vs 30.4ms app-frame total; gap 8729.6ms; readiness capture porous-close-orbit-right, app-frame capture porous-close-orbit-right)
- Operator readiness vs observed poll frame total: operator-readiness-exceeds-app-frame-total (8760ms readiness vs 8549.2ms app-frame total; gap 210.8ms; readiness capture porous-close-orbit-right, app-frame capture porous-close-orbit-right)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=9 failed=8 elapsed=6313ms slowestPoll=2870ms@3 observedFrame=2 observedFrameTotal=9.9ms observedFrameSlowestStage=evidence-exposure:9.4ms slowestPollObservedFrame=not reported slowestPollObservedFrameTotal=not reportedms slowestPollObservedFrameSlowestStage=not reported blockers=none lastFailed=visual-smoke-not-ready

- whole-render-final-color: 4456ms (apply-view:2ms, view-readiness:2069ms, settle-before-interaction:2008ms, collect-settled-evidence:14ms, screenshot:93ms, image-analysis:241ms, trace-canvas-parity:28ms, classify-smoke:0ms, witness-diagnostics:1ms)
- dessert-close-final-color: 8335ms (apply-view:12ms, view-readiness:5921ms, settle-before-interaction:2001ms, collect-settled-evidence:8ms, screenshot:147ms, image-analysis:215ms, trace-canvas-parity:31ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 11238ms (apply-view:25ms, view-readiness:8352ms, settle-before-interaction:2001ms, collect-settled-evidence:8ms, screenshot:414ms, image-analysis:365ms, trace-canvas-parity:73ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 21527ms (apply-view:12ms, view-readiness:7503ms, settle-before-interaction:2003ms, interactions:2ms, interaction-readiness:8757ms, settle-after-interaction:2001ms, collect-settled-evidence:8ms, screenshot:825ms, image-analysis:385ms, trace-canvas-parity:30ms, classify-smoke:1ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 21838ms (apply-view:83ms, view-readiness:8178ms, settle-before-interaction:2002ms, interactions:3ms, interaction-readiness:8760ms, settle-after-interaction:2015ms, collect-settled-evidence:32ms, screenshot:348ms, image-analysis:351ms, trace-canvas-parity:65ms, classify-smoke:0ms, witness-diagnostics:0ms)

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
- Total capture ms: 4456
- Readiness diagnostics: ready=true source=compact-readiness polls=1 failed=0 elapsed=2069ms slowestPoll=2069ms@1 observedFrame=3 observedFrameTotal=2054.7ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:1555.4ms slowestPollObservedFrame=3 slowestPollObservedFrameTotal=2054.7ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:1555.4ms blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=2069ms slowestPoll=2069ms@1 observedFrame=3 observedFrameTotal=2054.7ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:1555.4ms slowestPollObservedFrame=3 slowestPollObservedFrameTotal=2054.7ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:1555.4ms blockers=none lastFailed=none}

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
- Total capture ms: 8335
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=5920ms slowestPoll=5691ms@3 observedFrame=12 observedFrameTotal=5744.1ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:3694.1ms slowestPollObservedFrame=12 slowestPollObservedFrameTotal=5744.1ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:3694.1ms blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=5920ms slowestPoll=5691ms@3 observedFrame=12 observedFrameTotal=5744.1ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:3694.1ms slowestPollObservedFrame=12 slowestPollObservedFrameTotal=5744.1ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:3694.1ms blockers=none lastFailed=visual-smoke-not-ready}

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
- Total capture ms: 11238
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=8352ms slowestPoll=8129ms@3 observedFrame=18 observedFrameTotal=8201.1ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4929.8ms slowestPollObservedFrame=18 slowestPollObservedFrameTotal=8201.1ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4929.8ms blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=8352ms slowestPoll=8129ms@3 observedFrame=18 observedFrameTotal=8201.1ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4929.8ms slowestPollObservedFrame=18 slowestPollObservedFrameTotal=8201.1ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4929.8ms blockers=none lastFailed=visual-smoke-not-ready}

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
- Total capture ms: 21527
- Readiness diagnostics: ready=true source=compact-readiness polls=8 failed=7 elapsed=8757ms slowestPoll=7793ms@8 observedFrame=24 observedFrameTotal=7840.2ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4619.3ms slowestPollObservedFrame=24 slowestPollObservedFrameTotal=7840.2ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4619.3ms blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=7503ms slowestPoll=7502ms@1 observedFrame=20 observedFrameTotal=7509.9ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4495.6ms slowestPollObservedFrame=20 slowestPollObservedFrameTotal=7509.9ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4495.6ms blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=8 failed=7 elapsed=8757ms slowestPoll=7793ms@8 observedFrame=24 observedFrameTotal=7840.2ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4619.3ms slowestPollObservedFrame=24 slowestPollObservedFrameTotal=7840.2ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4619.3ms blockers=none lastFailed=visual-smoke-not-ready}

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
- Total capture ms: 21838
- Readiness diagnostics: ready=true source=compact-readiness polls=2 failed=1 elapsed=8760ms slowestPoll=8590ms@2 observedFrame=34 observedFrameTotal=8549.2ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:5648.4ms slowestPollObservedFrame=34 slowestPollObservedFrameTotal=8549.2ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:5648.4ms blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=8178ms slowestPoll=7938ms@3 observedFrame=28 observedFrameTotal=8030.9ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4820.4ms slowestPollObservedFrame=28 slowestPollObservedFrameTotal=8030.9ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:4820.4ms blockers=none lastFailed=visual-smoke-not-ready} | interactionReadiness{ready=true source=compact-readiness polls=2 failed=1 elapsed=8760ms slowestPoll=8590ms@2 observedFrame=34 observedFrameTotal=8549.2ms observedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:5648.4ms slowestPollObservedFrame=34 slowestPollObservedFrameTotal=8549.2ms slowestPollObservedFrameSlowestStage=wgsl-source-frontier-pack-candidate-source-inputs:5648.4ms blockers=none lastFailed=visual-smoke-not-ready}


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
