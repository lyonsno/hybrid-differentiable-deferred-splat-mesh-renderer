# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-01T22:05:56.023Z
- Base URL: http://127.0.0.1:61732/?projectedRefStream=source
- Contact sheet: `operator-witness-contact-sheet.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: depth-aware GPU retention election smoke before review/landing
- Expected visual delta: source-frontier GPU retention election now includes projected depth/frontness in the retained-ref score; output may change visually and should remain real, nonblank, and route-identifiable
- Evidence surface: operator witness contact sheet plus retained-source construction evidence


## Witness Set

- Capture count: 5
- Operator visual captures: 3
- Filmstrip captures: 2
- Witness views: default, dessert-close, dessert-porous-close
- Renderers: tile-local-visible
- Arena backends: gpu
- Tile budgets: 16px/256 refs

## Timing

- Total loop ms: 38718
- Total capture ms: 37846
- Slowest capture: porous-close-orbit-right (10921ms)
- Slowest stage: porous-close-final-color/settle-before-interaction (5002ms)
- Slowest app frame stage: whole-render-final-color/wgsl-source-frontier-project-splats (21ms, frame 3)

- whole-render-final-color: 5198ms (apply-view:1ms, view-readiness:59ms, settle-before-interaction:5000ms, collect-settled-evidence:3ms, screenshot:21ms, image-analysis:94ms, trace-canvas-parity:19ms, classify-smoke:1ms, witness-diagnostics:0ms)
- dessert-close-final-color: 5507ms (apply-view:16ms, view-readiness:343ms, settle-before-interaction:5001ms, collect-settled-evidence:3ms, screenshot:48ms, image-analysis:81ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 5571ms (apply-view:1ms, view-readiness:368ms, settle-before-interaction:5002ms, collect-settled-evidence:3ms, screenshot:83ms, image-analysis:98ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 10649ms (apply-view:1ms, view-readiness:45ms, settle-before-interaction:5001ms, interactions:1ms, interaction-readiness:369ms, settle-after-interaction:5002ms, collect-settled-evidence:4ms, screenshot:93ms, image-analysis:116ms, trace-canvas-parity:17ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 10921ms (apply-view:1ms, view-readiness:364ms, settle-before-interaction:5001ms, interactions:1ms, interaction-readiness:352ms, settle-after-interaction:5000ms, collect-settled-evidence:3ms, screenshot:85ms, image-analysis:98ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61732/?projectedRefStream=source&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 37590
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 33667 / 921600 (3.653%)
- Total capture ms: 5198

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61732/?projectedRefStream=source&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 157547
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 197740 / 921600 (21.456%)
- Total capture ms: 5507

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61732/?projectedRefStream=source&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 320071
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 918248 / 921600 (99.636%)
- Total capture ms: 5571

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:61732/?projectedRefStream=source&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 340087
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 918899 / 921600 (99.707%)
- Total capture ms: 10649

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:61732/?projectedRefStream=source&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 302509
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 917406 / 921600 (99.545%)
- Total capture ms: 10921


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
