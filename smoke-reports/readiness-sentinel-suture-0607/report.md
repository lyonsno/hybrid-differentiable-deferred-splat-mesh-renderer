# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-07T01:42:42.664Z
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

- Total loop ms: 43904
- Total capture ms: 41232
- Slowest capture: porous-close-orbit-left (13034ms)
- Slowest stage: porous-close-orbit-left/interaction-readiness (4680ms)
- Slowest operator readiness: porous-close-orbit-left/interaction-readiness (4680ms)
- Slowest app frame stage: whole-render-final-color/wgsl-source-frontier-pack-candidate-source-inputs (762.9ms, frame 3)
- Slowest app frame total: whole-render-final-color (1006.3ms, frame 3)
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (4680ms readiness vs 762.9ms app-frame stage; gap 3917.1ms)
- Operator readiness vs app frame total: operator-readiness-exceeds-app-frame-total (4680ms readiness vs 22.1ms app-frame total; gap 4657.9ms; readiness capture porous-close-orbit-left, app-frame capture porous-close-orbit-left)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=4 failed=3 elapsed=2437ms slowestPoll=1231ms@2 blockers=none lastFailed=visual-smoke-not-ready

- whole-render-final-color: 3146ms (apply-view:1ms, view-readiness:1008ms, settle-before-interaction:2002ms, collect-settled-evidence:9ms, screenshot:33ms, image-analysis:77ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:1ms)
- dessert-close-final-color: 5451ms (apply-view:1ms, view-readiness:3312ms, settle-before-interaction:2001ms, collect-settled-evidence:4ms, screenshot:41ms, image-analysis:79ms, trace-canvas-parity:13ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 6696ms (apply-view:4ms, view-readiness:4510ms, settle-before-interaction:2001ms, collect-settled-evidence:10ms, screenshot:62ms, image-analysis:94ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 13034ms (apply-view:1ms, view-readiness:4151ms, settle-before-interaction:2001ms, interactions:3ms, interaction-readiness:4680ms, settle-after-interaction:2002ms, collect-settled-evidence:3ms, screenshot:73ms, image-analysis:98ms, trace-canvas-parity:22ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 12905ms (apply-view:1ms, view-readiness:4381ms, settle-before-interaction:2001ms, interactions:2ms, interaction-readiness:4333ms, settle-after-interaction:2001ms, collect-settled-evidence:5ms, screenshot:79ms, image-analysis:88ms, trace-canvas-parity:14ms, classify-smoke:0ms, witness-diagnostics:0ms)

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
- Total capture ms: 3146
- Readiness diagnostics: ready=true source=compact-readiness polls=1 failed=0 elapsed=1008ms slowestPoll=1008ms@1 blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=1008ms slowestPoll=1008ms@1 blockers=none lastFailed=none}

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
- Total capture ms: 5451
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=3312ms slowestPoll=3097ms@3 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=3312ms slowestPoll=3097ms@3 blockers=none lastFailed=visual-smoke-not-ready}

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
- Total capture ms: 6696
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=4510ms slowestPoll=4291ms@3 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=4510ms slowestPoll=4291ms@3 blockers=none lastFailed=visual-smoke-not-ready}

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
- Total capture ms: 13034
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=4680ms slowestPoll=4451ms@3 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=4151ms slowestPoll=4150ms@1 blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=4680ms slowestPoll=4451ms@3 blockers=none lastFailed=visual-smoke-not-ready}

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
- Total capture ms: 12905
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=4333ms slowestPoll=4076ms@3 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=4381ms slowestPoll=4150ms@3 blockers=none lastFailed=visual-smoke-not-ready} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=4333ms slowestPoll=4076ms@3 blockers=none lastFailed=visual-smoke-not-ready}


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
