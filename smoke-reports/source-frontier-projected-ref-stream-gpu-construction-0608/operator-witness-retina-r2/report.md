# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-08T03:57:16.548Z
- Base URL: http://127.0.0.1:61731/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
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

- Total loop ms: 47085
- Total capture ms: 45691
- Slowest capture: porous-close-orbit-right (13075ms)
- Slowest stage: porous-close-final-color/settle-before-interaction (5002ms)
- Slowest operator readiness: porous-close-final-color/view-readiness (1456ms)
- Slowest app frame stage: porous-close-final-color/alpha-density (910.1ms, frame 19)
- Slowest app frame total: porous-close-final-color (999.4ms, frame 19)
- Source-frontier pack slowest substage: not reported
- Source-frontier pack counts: not reported
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (1456ms readiness vs 910.1ms app-frame stage; gap 545.9ms)
- Operator readiness vs app frame total: operator-readiness-exceeds-app-frame-total (1456ms readiness vs 999.4ms app-frame total; gap 456.6ms; readiness capture porous-close-final-color, app-frame capture porous-close-final-color)
- Operator readiness vs observed poll frame total: operator-readiness-exceeds-app-frame-total (1456ms readiness vs 999.4ms app-frame total; gap 456.6ms; readiness capture porous-close-final-color, app-frame capture porous-close-final-color)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=8 failed=7 elapsed=1138ms slowestPoll=217ms@3 observedFrame=4 observedFrameTotal=281.9ms observedFrameSlowestStage=alpha-density:182.2ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=not reported slowestPollObservedFrameTotal=not reportedms slowestPollObservedFrameSlowestStage=not reported slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready

- whole-render-final-color: 5875ms (apply-view:1ms, view-readiness:105ms, settle-before-interaction:5001ms, collect-settled-evidence:5ms, screenshot:169ms, image-analysis:493ms, trace-canvas-parity:101ms, classify-smoke:0ms, witness-diagnostics:0ms)
- dessert-close-final-color: 6650ms (apply-view:0ms, view-readiness:691ms, settle-before-interaction:5001ms, collect-settled-evidence:3ms, screenshot:236ms, image-analysis:579ms, trace-canvas-parity:137ms, classify-smoke:2ms, witness-diagnostics:0ms)
- porous-close-final-color: 7717ms (apply-view:1ms, view-readiness:1456ms, settle-before-interaction:5002ms, collect-settled-evidence:3ms, screenshot:443ms, image-analysis:686ms, trace-canvas-parity:126ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 12374ms (apply-view:2ms, view-readiness:63ms, settle-before-interaction:5002ms, interactions:1ms, interaction-readiness:795ms, settle-after-interaction:5001ms, collect-settled-evidence:5ms, screenshot:544ms, image-analysis:810ms, trace-canvas-parity:151ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 13075ms (apply-view:1ms, view-readiness:1095ms, settle-before-interaction:5001ms, interactions:2ms, interaction-readiness:754ms, settle-after-interaction:5001ms, collect-settled-evidence:3ms, screenshot:450ms, image-analysis:653ms, trace-canvas-parity:115ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61731/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `whole-render-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 158153
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 198619 / 6621696 (3.000%)
- Total capture ms: 5875
- Readiness diagnostics: ready=true source=compact-readiness polls=1 failed=0 elapsed=104ms slowestPoll=104ms@1 observedFrame=5 observedFrameTotal=101.9ms observedFrameSlowestStage=tile-local-scene-state-refresh:97ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=5 slowestPollObservedFrameTotal=101.9ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:97ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=104ms slowestPoll=104ms@1 observedFrame=5 observedFrameTotal=101.9ms observedFrameSlowestStage=tile-local-scene-state-refresh:97ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=5 slowestPollObservedFrameTotal=101.9ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:97ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61731/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `dessert-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 287905
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 1153157 / 6621696 (17.415%)
- Total capture ms: 6650
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=691ms slowestPoll=481ms@3 observedFrame=14 observedFrameTotal=492.4ms observedFrameSlowestStage=alpha-density:413.1ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=14 slowestPollObservedFrameTotal=492.4ms slowestPollObservedFrameSlowestStage=alpha-density:413.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=691ms slowestPoll=481ms@3 observedFrame=14 observedFrameTotal=492.4ms observedFrameSlowestStage=alpha-density:413.1ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=14 slowestPollObservedFrameTotal=492.4ms slowestPollObservedFrameSlowestStage=alpha-density:413.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61731/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 235513
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 6607563 / 6621696 (99.787%)
- Total capture ms: 7717
- Readiness diagnostics: ready=true source=compact-readiness polls=6 failed=5 elapsed=1456ms slowestPoll=938ms@6 observedFrame=19 observedFrameTotal=999.4ms observedFrameSlowestStage=alpha-density:910.1ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=19 slowestPollObservedFrameTotal=999.4ms slowestPollObservedFrameSlowestStage=alpha-density:910.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=6 failed=5 elapsed=1456ms slowestPoll=938ms@6 observedFrame=19 observedFrameTotal=999.4ms observedFrameSlowestStage=alpha-density:910.1ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=19 slowestPollObservedFrameTotal=999.4ms slowestPollObservedFrameSlowestStage=alpha-density:910.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:61731/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-orbit-left.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 225935
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 6567384 / 6621696 (99.180%)
- Total capture ms: 12374
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=795ms slowestPoll=587ms@3 observedFrame=25 observedFrameTotal=603.2ms observedFrameSlowestStage=alpha-density:550.6ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=25 slowestPollObservedFrameTotal=603.2ms slowestPollObservedFrameSlowestStage=alpha-density:550.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=63ms slowestPoll=63ms@1 observedFrame=20 observedFrameTotal=61.8ms observedFrameSlowestStage=tile-local-scene-state-refresh:60.2ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=20 slowestPollObservedFrameTotal=61.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:60.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=795ms slowestPoll=587ms@3 observedFrame=25 observedFrameTotal=603.2ms observedFrameSlowestStage=alpha-density:550.6ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=25 slowestPollObservedFrameTotal=603.2ms slowestPollObservedFrameSlowestStage=alpha-density:550.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:61731/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-orbit-right.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 236447
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 6603495 / 6621696 (99.725%)
- Total capture ms: 13075
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=754ms slowestPoll=547ms@3 observedFrame=36 observedFrameTotal=584.7ms observedFrameSlowestStage=alpha-density:526.2ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=36 slowestPollObservedFrameTotal=584.7ms slowestPollObservedFrameSlowestStage=alpha-density:526.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=1095ms slowestPoll=888ms@3 observedFrame=31 observedFrameTotal=932.6ms observedFrameSlowestStage=alpha-density:850.6ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=31 slowestPollObservedFrameTotal=932.6ms slowestPollObservedFrameSlowestStage=alpha-density:850.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=754ms slowestPoll=547ms@3 observedFrame=36 observedFrameTotal=584.7ms observedFrameSlowestStage=alpha-density:526.2ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=36 slowestPollObservedFrameTotal=584.7ms slowestPollObservedFrameSlowestStage=alpha-density:526.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready}


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
        "width": 1728,
        "height": 958
      },
      "canvas": {
        "width": 3456,
        "height": 1916,
        "clientWidth": 1728,
        "clientHeight": 958
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
        "width": 1728,
        "height": 958
      },
      "canvas": {
        "width": 3456,
        "height": 1916,
        "clientWidth": 1728,
        "clientHeight": 958
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
        "width": 1728,
        "height": 958
      },
      "canvas": {
        "width": 3456,
        "height": 1916,
        "clientWidth": 1728,
        "clientHeight": 958
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
        "width": 1728,
        "height": 958
      },
      "canvas": {
        "width": 3456,
        "height": 1916,
        "clientWidth": 1728,
        "clientHeight": 958
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
        "width": 1728,
        "height": 958
      },
      "canvas": {
        "width": 3456,
        "height": 1916,
        "clientWidth": 1728,
        "clientHeight": 958
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
