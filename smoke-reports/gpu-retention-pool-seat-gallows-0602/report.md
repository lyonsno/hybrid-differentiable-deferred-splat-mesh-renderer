# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-02T07:09:14.438Z
- Base URL: http://127.0.0.1:61773/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Contact sheet: `operator-witness-contact-sheet.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: bounded pool-seat GPU retention election smoke before review and landing
- Expected visual delta: source-frontier route now uses bounded retention/occlusion/coverage/support pool slots; output may change visually and should remain real, nonblank, route-identifiable useful ugly
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

- Total loop ms: 38777
- Total capture ms: 37825
- Slowest capture: porous-close-orbit-right (10924ms)
- Slowest stage: porous-close-final-color/settle-before-interaction (5003ms)
- Slowest app frame stage: whole-render-final-color/wgsl-source-frontier-project-splats (23.2ms, frame 3)

- whole-render-final-color: 5182ms (apply-view:1ms, view-readiness:61ms, settle-before-interaction:5001ms, collect-settled-evidence:5ms, screenshot:25ms, image-analysis:75ms, trace-canvas-parity:13ms, classify-smoke:0ms, witness-diagnostics:1ms)
- dessert-close-final-color: 5510ms (apply-view:1ms, view-readiness:346ms, settle-before-interaction:5002ms, collect-settled-evidence:5ms, screenshot:65ms, image-analysis:77ms, trace-canvas-parity:14ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 5588ms (apply-view:1ms, view-readiness:371ms, settle-before-interaction:5003ms, collect-settled-evidence:5ms, screenshot:91ms, image-analysis:101ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 10621ms (apply-view:2ms, view-readiness:48ms, settle-before-interaction:5001ms, interactions:1ms, interaction-readiness:364ms, settle-after-interaction:5003ms, collect-settled-evidence:2ms, screenshot:87ms, image-analysis:98ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 10924ms (apply-view:1ms, view-readiness:364ms, settle-before-interaction:5002ms, interactions:1ms, interaction-readiness:357ms, settle-after-interaction:5002ms, collect-settled-evidence:5ms, screenshot:83ms, image-analysis:93ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61773/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `whole-render-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 35741
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 33448 / 921600 (3.629%)
- Total capture ms: 5182

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61773/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `dessert-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 145034
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 197200 / 921600 (21.398%)
- Total capture ms: 5510

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:61773/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 261026
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 919099 / 921600 (99.729%)
- Total capture ms: 5588

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:61773/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-orbit-left.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 272221
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 918916 / 921600 (99.709%)
- Total capture ms: 10621

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:61773/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `porous-close-orbit-right.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 249378
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 919221 / 921600 (99.742%)
- Total capture ms: 10924


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
