# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-07T00:57:36.779Z
- Base URL: http://127.0.0.1:6175/?wgslProjectedRefStream=source-frontier
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

- Total loop ms: 65892
- Total capture ms: 60376
- Slowest capture: porous-close-orbit-right (18777ms)
- Slowest stage: porous-close-final-color/view-readiness (7738ms)
- Slowest operator readiness: porous-close-final-color/view-readiness (7738ms)
- Slowest app frame stage: whole-render-final-color/wgsl-source-frontier-pack-candidate-source-inputs (1446.2ms, frame 3)
- Slowest app frame total: whole-render-final-color (1899.6ms, frame 3)
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (7738ms readiness vs 1446.2ms app-frame stage; gap 6291.8ms)
- Operator readiness vs app frame total: operator-readiness-exceeds-app-frame-total (7738ms readiness vs 30.4ms app-frame total; gap 7707.6ms; readiness capture porous-close-final-color, app-frame capture porous-close-final-color)
- Initial readiness diagnostics: ready=true polls=4 failed=3 elapsed=4486ms slowestPoll=2264ms@2 blockers=none lastFailed=visual-smoke-not-ready

- whole-render-final-color: 4442ms (apply-view:2ms, view-readiness:1919ms, settle-before-interaction:2002ms, collect-settled-evidence:12ms, screenshot:48ms, image-analysis:394ms, trace-canvas-parity:64ms, classify-smoke:0ms, witness-diagnostics:1ms)
- dessert-close-final-color: 7959ms (apply-view:19ms, view-readiness:5482ms, settle-before-interaction:2002ms, collect-settled-evidence:7ms, screenshot:162ms, image-analysis:240ms, trace-canvas-parity:47ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 10438ms (apply-view:33ms, view-readiness:7738ms, settle-before-interaction:2001ms, collect-settled-evidence:7ms, screenshot:182ms, image-analysis:425ms, trace-canvas-parity:51ms, classify-smoke:0ms, witness-diagnostics:1ms)
- porous-close-orbit-left: 18760ms (apply-view:30ms, view-readiness:6428ms, settle-before-interaction:2001ms, interactions:2ms, interaction-readiness:7548ms, settle-after-interaction:2003ms, collect-settled-evidence:32ms, screenshot:273ms, image-analysis:368ms, trace-canvas-parity:75ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 18777ms (apply-view:40ms, view-readiness:7406ms, settle-before-interaction:2002ms, interactions:1ms, interaction-readiness:7055ms, settle-after-interaction:2035ms, collect-settled-evidence:25ms, screenshot:67ms, image-analysis:129ms, trace-canvas-parity:17ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:6175/?wgslProjectedRefStream=source-frontier&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 37590
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 40593 / 921600 (4.405%)
- Total capture ms: 4442
- Readiness diagnostics: ready=true polls=1 failed=0 elapsed=1918ms slowestPoll=1918ms@1 blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true polls=1 failed=0 elapsed=1918ms slowestPoll=1918ms@1 blockers=none lastFailed=none}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:6175/?wgslProjectedRefStream=source-frontier&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 157547
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 206477 / 921600 (22.404%)
- Total capture ms: 7959
- Readiness diagnostics: ready=true polls=3 failed=2 elapsed=5482ms slowestPoll=5198ms@3 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true polls=3 failed=2 elapsed=5482ms slowestPoll=5198ms@3 blockers=none lastFailed=visual-smoke-not-ready}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:6175/?wgslProjectedRefStream=source-frontier&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 320071
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921234 / 921600 (99.960%)
- Total capture ms: 10438
- Readiness diagnostics: ready=true polls=3 failed=2 elapsed=7737ms slowestPoll=7448ms@3 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true polls=3 failed=2 elapsed=7737ms slowestPoll=7448ms@3 blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:6175/?wgslProjectedRefStream=source-frontier&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 340087
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921330 / 921600 (99.971%)
- Total capture ms: 18760
- Readiness diagnostics: ready=true polls=3 failed=2 elapsed=7548ms slowestPoll=7236ms@3 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true polls=1 failed=0 elapsed=6427ms slowestPoll=6427ms@1 blockers=none lastFailed=none} | interactionReadiness{ready=true polls=3 failed=2 elapsed=7548ms slowestPoll=7236ms@3 blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:6175/?wgslProjectedRefStream=source-frontier&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 302509
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921120 / 921600 (99.948%)
- Total capture ms: 18777
- Readiness diagnostics: ready=true polls=3 failed=2 elapsed=7055ms slowestPoll=6732ms@3 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true polls=2 failed=1 elapsed=7406ms slowestPoll=7258ms@2 blockers=none lastFailed=visual-smoke-not-ready} | interactionReadiness{ready=true polls=3 failed=2 elapsed=7055ms slowestPoll=6732ms@3 blockers=none lastFailed=visual-smoke-not-ready}


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
