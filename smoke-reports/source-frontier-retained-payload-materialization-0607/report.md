# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-07T23:46:19.766Z
- Base URL: http://127.0.0.1:51474/
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

- Total loop ms: 54013
- Total capture ms: 52073
- Slowest capture: porous-close-orbit-right (16102ms)
- Slowest stage: whole-render-final-color/settle-before-interaction (5002ms)
- Slowest operator readiness: porous-close-orbit-right/interaction-readiness (3038ms)
- Slowest app frame stage: whole-render-final-color/tile-local-scene-state-refresh (697.1ms, frame 3)
- Slowest app frame total: whole-render-final-color (702.6ms, frame 3)
- Source-frontier pack slowest substage: not reported
- Source-frontier pack counts: not reported
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (3038ms readiness vs 697.1ms app-frame stage; gap 2340.9ms)
- Operator readiness vs app frame total: operator-readiness-exceeds-app-frame-total (3038ms readiness vs 18.1ms app-frame total; gap 3019.9ms; readiness capture porous-close-orbit-right, app-frame capture porous-close-orbit-right)
- Operator readiness vs observed poll frame total: operator-readiness-exceeds-app-frame-total (3038ms readiness vs 2856.7ms app-frame total; gap 181.3ms; readiness capture porous-close-orbit-right, app-frame capture porous-close-orbit-right)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=4 failed=3 elapsed=1715ms slowestPoll=829ms@3 observedFrame=1 observedFrameTotal=662.7ms observedFrameSlowestStage=tile-local-scene-state-refresh:656.5ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=not reported slowestPollObservedFrameTotal=not reportedms slowestPollObservedFrameSlowestStage=not reported slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready

- whole-render-final-color: 5835ms (apply-view:2ms, view-readiness:708ms, settle-before-interaction:5002ms, collect-settled-evidence:4ms, screenshot:24ms, image-analysis:81ms, trace-canvas-parity:14ms, classify-smoke:0ms, witness-diagnostics:0ms)
- dessert-close-final-color: 7183ms (apply-view:2ms, view-readiness:2046ms, settle-before-interaction:5001ms, collect-settled-evidence:4ms, screenshot:39ms, image-analysis:77ms, trace-canvas-parity:13ms, classify-smoke:1ms, witness-diagnostics:0ms)
- porous-close-final-color: 7907ms (apply-view:1ms, view-readiness:2716ms, settle-before-interaction:5001ms, collect-settled-evidence:9ms, screenshot:78ms, image-analysis:86ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 15046ms (apply-view:1ms, view-readiness:2263ms, settle-before-interaction:5002ms, interactions:1ms, interaction-readiness:2609ms, settle-after-interaction:5001ms, collect-settled-evidence:3ms, screenshot:61ms, image-analysis:89ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 16102ms (apply-view:2ms, view-readiness:2883ms, settle-before-interaction:5002ms, interactions:1ms, interaction-readiness:3038ms, settle-after-interaction:5000ms, collect-settled-evidence:3ms, screenshot:69ms, image-analysis:89ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:51474/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 37590
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 34000 / 921600 (3.689%)
- Total capture ms: 5835
- Readiness diagnostics: ready=true source=compact-readiness polls=2 failed=1 elapsed=708ms slowestPoll=605ms@2 observedFrame=3 observedFrameTotal=702.6ms observedFrameSlowestStage=tile-local-scene-state-refresh:697.1ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=702.6ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:697.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=operator-witness-revision-pending
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=2 failed=1 elapsed=708ms slowestPoll=605ms@2 observedFrame=3 observedFrameTotal=702.6ms observedFrameSlowestStage=tile-local-scene-state-refresh:697.1ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=702.6ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:697.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=operator-witness-revision-pending}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:51474/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 157547
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 199174 / 921600 (21.612%)
- Total capture ms: 7183
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=2046ms slowestPoll=1837ms@3 observedFrame=24 observedFrameTotal=1883.1ms observedFrameSlowestStage=tile-local-scene-state-refresh:1743ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=1883.1ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:1743ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2046ms slowestPoll=1837ms@3 observedFrame=24 observedFrameTotal=1883.1ms observedFrameSlowestStage=tile-local-scene-state-refresh:1743ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=1883.1ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:1743ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:51474/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 320071
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921236 / 921600 (99.961%)
- Total capture ms: 7907
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=2716ms slowestPoll=2496ms@3 observedFrame=44 observedFrameTotal=2552ms observedFrameSlowestStage=tile-local-scene-state-refresh:2328.8ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=44 slowestPollObservedFrameTotal=2552ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2328.8ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2716ms slowestPoll=2496ms@3 observedFrame=44 observedFrameTotal=2552ms observedFrameSlowestStage=tile-local-scene-state-refresh:2328.8ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=44 slowestPollObservedFrameTotal=2552ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2328.8ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:51474/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 340087
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921291 / 921600 (99.966%)
- Total capture ms: 15046
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=2609ms slowestPoll=2377ms@3 observedFrame=56 observedFrameTotal=2440.4ms observedFrameSlowestStage=tile-local-scene-state-refresh:2184ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=56 slowestPollObservedFrameTotal=2440.4ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2184ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=2263ms slowestPoll=2263ms@1 observedFrame=46 observedFrameTotal=2261.6ms observedFrameSlowestStage=tile-local-scene-state-refresh:2240.3ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=46 slowestPollObservedFrameTotal=2261.6ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2240.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2609ms slowestPoll=2377ms@3 observedFrame=56 observedFrameTotal=2440.4ms observedFrameSlowestStage=tile-local-scene-state-refresh:2184ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=56 slowestPollObservedFrameTotal=2440.4ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2184ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:51474/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 302509
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921243 / 921600 (99.961%)
- Total capture ms: 16102
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=3038ms slowestPoll=2800ms@3 observedFrame=76 observedFrameTotal=2856.7ms observedFrameSlowestStage=tile-local-scene-state-refresh:2595.6ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=76 slowestPollObservedFrameTotal=2856.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2595.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2883ms slowestPoll=2650ms@3 observedFrame=66 observedFrameTotal=2708.2ms observedFrameSlowestStage=tile-local-scene-state-refresh:2439.9ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=66 slowestPollObservedFrameTotal=2708.2ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2439.9ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=3038ms slowestPoll=2800ms@3 observedFrame=76 observedFrameTotal=2856.7ms observedFrameSlowestStage=tile-local-scene-state-refresh:2595.6ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=76 slowestPollObservedFrameTotal=2856.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2595.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}


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
