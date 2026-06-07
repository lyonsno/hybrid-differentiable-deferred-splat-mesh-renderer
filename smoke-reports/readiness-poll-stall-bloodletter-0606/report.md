# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-07T00:30:54.738Z
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

- Total loop ms: 69551
- Total capture ms: 64019
- Slowest capture: porous-close-orbit-left (19772ms)
- Slowest stage: porous-close-final-color/view-readiness (8911ms)
- Slowest operator readiness: porous-close-final-color/view-readiness (8911ms)
- Slowest app frame stage: whole-render-final-color/wgsl-source-frontier-pack-candidate-source-inputs (1655.4ms, frame 3)
- Slowest app frame total: whole-render-final-color (2155.3ms, frame 3)
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (8911ms readiness vs 1655.4ms app-frame stage; gap 7255.6ms)
- Operator readiness vs app frame total: operator-readiness-exceeds-app-frame-total (8911ms readiness vs 2155.3ms app-frame total; gap 6755.7ms)
- Initial readiness diagnostics: ready=true polls=5 failed=4 elapsed=4838ms slowestPoll=2368ms@3 blockers=none lastFailed=visual-smoke-not-ready

- whole-render-final-color: 4710ms (apply-view:4ms, view-readiness:2170ms, settle-before-interaction:2003ms, collect-settled-evidence:10ms, screenshot:75ms, image-analysis:391ms, trace-canvas-parity:56ms, classify-smoke:1ms, witness-diagnostics:0ms)
- dessert-close-final-color: 8881ms (apply-view:83ms, view-readiness:6088ms, settle-before-interaction:2013ms, collect-settled-evidence:60ms, screenshot:187ms, image-analysis:346ms, trace-canvas-parity:103ms, classify-smoke:1ms, witness-diagnostics:0ms)
- porous-close-final-color: 11650ms (apply-view:22ms, view-readiness:8911ms, settle-before-interaction:2003ms, collect-settled-evidence:8ms, screenshot:185ms, image-analysis:463ms, trace-canvas-parity:57ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 19772ms (apply-view:2ms, view-readiness:7503ms, settle-before-interaction:2008ms, interactions:15ms, interaction-readiness:7833ms, settle-after-interaction:2001ms, collect-settled-evidence:11ms, screenshot:135ms, image-analysis:203ms, trace-canvas-parity:61ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 19006ms (apply-view:15ms, view-readiness:7232ms, settle-before-interaction:2002ms, interactions:10ms, interaction-readiness:7213ms, settle-after-interaction:2002ms, collect-settled-evidence:13ms, screenshot:228ms, image-analysis:245ms, trace-canvas-parity:46ms, classify-smoke:0ms, witness-diagnostics:0ms)

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
- Total capture ms: 4710
- Readiness diagnostics: ready=true polls=1 failed=0 elapsed=2170ms slowestPoll=2170ms@1 blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true polls=1 failed=0 elapsed=2170ms slowestPoll=2170ms@1 blockers=none lastFailed=none}

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
- Total capture ms: 8881
- Readiness diagnostics: ready=true polls=2 failed=1 elapsed=6088ms slowestPoll=5849ms@2 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true polls=2 failed=1 elapsed=6088ms slowestPoll=5849ms@2 blockers=none lastFailed=visual-smoke-not-ready}

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
- Total capture ms: 11650
- Readiness diagnostics: ready=true polls=3 failed=2 elapsed=8911ms slowestPoll=8600ms@3 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true polls=3 failed=2 elapsed=8911ms slowestPoll=8600ms@3 blockers=none lastFailed=visual-smoke-not-ready}

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
- Total capture ms: 19772
- Readiness diagnostics: ready=true polls=2 failed=1 elapsed=7832ms slowestPoll=7666ms@2 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true polls=1 failed=0 elapsed=7503ms slowestPoll=7503ms@1 blockers=none lastFailed=none} | interactionReadiness{ready=true polls=2 failed=1 elapsed=7832ms slowestPoll=7666ms@2 blockers=none lastFailed=visual-smoke-not-ready}

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
- Total capture ms: 19006
- Readiness diagnostics: ready=true polls=3 failed=2 elapsed=7213ms slowestPoll=6931ms@3 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true polls=3 failed=2 elapsed=7232ms slowestPoll=6947ms@3 blockers=none lastFailed=visual-smoke-not-ready} | interactionReadiness{ready=true polls=3 failed=2 elapsed=7213ms slowestPoll=6931ms@3 blockers=none lastFailed=visual-smoke-not-ready}


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
