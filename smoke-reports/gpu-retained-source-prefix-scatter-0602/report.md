# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-02T02:47:49.391Z
- Base URL: http://127.0.0.1:61744/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
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

- Total loop ms: 41241
- Total capture ms: 38550
- Slowest capture: porous-close-orbit-right (10957ms)
- Slowest stage: whole-render-final-color/settle-before-interaction (5002ms)
- Slowest app frame stage: whole-render-final-color/wgsl-source-frontier-project-splats (63.7ms, frame 3)

- whole-render-final-color: 5429ms (apply-view:53ms, view-readiness:146ms, settle-before-interaction:5002ms, collect-settled-evidence:6ms, screenshot:43ms, image-analysis:143ms, trace-canvas-parity:32ms, classify-smoke:1ms, witness-diagnostics:0ms)
- dessert-close-final-color: 5734ms (apply-view:1ms, view-readiness:537ms, settle-before-interaction:5002ms, collect-settled-evidence:4ms, screenshot:66ms, image-analysis:106ms, trace-canvas-parity:18ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 5753ms (apply-view:2ms, view-readiness:452ms, settle-before-interaction:5001ms, collect-settled-evidence:4ms, screenshot:123ms, image-analysis:149ms, trace-canvas-parity:21ms, classify-smoke:0ms, witness-diagnostics:1ms)
- porous-close-orbit-left: 10677ms (apply-view:1ms, view-readiness:68ms, settle-before-interaction:5002ms, interactions:2ms, interaction-readiness:375ms, settle-after-interaction:5001ms, collect-settled-evidence:4ms, screenshot:101ms, image-analysis:107ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 10957ms (apply-view:2ms, view-readiness:375ms, settle-before-interaction:5001ms, interactions:1ms, interaction-readiness:365ms, settle-after-interaction:5002ms, collect-settled-evidence:3ms, screenshot:85ms, image-analysis:105ms, trace-canvas-parity:18ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61744/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `whole-render-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 32885
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 32696 / 921600 (3.548%)
- Total capture ms: 5429

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61744/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `dessert-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 126058
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 196523 / 921600 (21.324%)
- Total capture ms: 5734

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61744/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 171026
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 918653 / 921600 (99.680%)
- Total capture ms: 5753

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:61744/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-orbit-left.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 168599
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 917928 / 921600 (99.602%)
- Total capture ms: 10677

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:61744/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-orbit-right.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 169276
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 918225 / 921600 (99.634%)
- Total capture ms: 10957


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
