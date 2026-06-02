# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-02T04:09:29.314Z
- Base URL: http://127.0.0.1:61755/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Contact sheet: `operator-witness-contact-sheet.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: production-weighted GPU retention election smoke before review and landing
- Expected visual delta: source-frontier GPU retention election now scores retention with source luminance and occlusion-like channels before depth tie-breaking; output may change visually and should remain real, nonblank, route-identifiable useful ugly
- Evidence surface: operator witness contact sheet plus retained-source construction and WGSL projected stream evidence


## Witness Set

- Capture count: 5
- Operator visual captures: 3
- Filmstrip captures: 2
- Witness views: default, dessert-close, dessert-porous-close
- Renderers: tile-local-visible
- Arena backends: gpu
- Tile budgets: 16px/256 refs

## Timing

- Total loop ms: 40605
- Total capture ms: 38832
- Slowest capture: porous-close-orbit-right (11049ms)
- Slowest stage: porous-close-orbit-right/settle-after-interaction (5003ms)
- Slowest app frame stage: whole-render-final-color/wgsl-source-frontier-project-splats (36.6ms, frame 3)

- whole-render-final-color: 5274ms (apply-view:2ms, view-readiness:101ms, settle-before-interaction:5000ms, collect-settled-evidence:5ms, screenshot:34ms, image-analysis:111ms, trace-canvas-parity:20ms, classify-smoke:0ms, witness-diagnostics:1ms)
- dessert-close-final-color: 5674ms (apply-view:1ms, view-readiness:460ms, settle-before-interaction:5001ms, collect-settled-evidence:6ms, screenshot:64ms, image-analysis:122ms, trace-canvas-parity:20ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 5843ms (apply-view:1ms, view-readiness:492ms, settle-before-interaction:5002ms, collect-settled-evidence:5ms, screenshot:138ms, image-analysis:179ms, trace-canvas-parity:26ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 10992ms (apply-view:1ms, view-readiness:86ms, settle-before-interaction:5001ms, interactions:3ms, interaction-readiness:557ms, settle-after-interaction:5002ms, collect-settled-evidence:5ms, screenshot:143ms, image-analysis:170ms, trace-canvas-parity:24ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 11049ms (apply-view:1ms, view-readiness:424ms, settle-before-interaction:5001ms, interactions:2ms, interaction-readiness:376ms, settle-after-interaction:5003ms, collect-settled-evidence:3ms, screenshot:98ms, image-analysis:122ms, trace-canvas-parity:19ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61755/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `whole-render-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 32909
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 33138 / 921600 (3.596%)
- Total capture ms: 5274

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61755/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `dessert-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 126047
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 196716 / 921600 (21.345%)
- Total capture ms: 5674

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61755/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 171584
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 920580 / 921600 (99.889%)
- Total capture ms: 5843

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:61755/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-orbit-left.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 168405
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921038 / 921600 (99.939%)
- Total capture ms: 10992

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:61755/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-orbit-right.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 169490
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 920428 / 921600 (99.873%)
- Total capture ms: 11049


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
