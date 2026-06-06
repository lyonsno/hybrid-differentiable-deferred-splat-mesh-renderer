# Operator Witness Loop Report

- Status: FAIL
- Generated: 2026-06-06T04:20:49.701Z
- Base URL: http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Contact sheet: `operator-witness-contact-sheet.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Verify production-election prefix scatter now feeds the current compositor source without claiming visual or performance closure.
- Expected visual delta: route/source identity should change to production-election-prefix-scatter materialized compositor input; final image may change and remains useful ugly
- Evidence surface: operator witness loop report, route identity JSON, stats text, and final-color screenshots


## Witness Set

- Capture count: 1
- Operator visual captures: 1
- Filmstrip captures: 0
- Witness views: default
- Renderers: tile-local-visible
- Arena backends: gpu
- Tile budgets: 16px/256 refs

## Timing

- Total loop ms: 15421
- Total capture ms: 15321
- Slowest capture: whole-render-final-color (15321ms)
- Slowest stage: whole-render-final-color/initial-readiness (15038ms)
- Slowest app frame stage: whole-render-final-color/evidence-exposure (2ms, frame 2)

- whole-render-final-color: 15321ms (new-page:108ms, page-goto:46ms, canvas-locator:0ms, canvas-attached:15ms, canvas-clip:31ms, hide-overlays:82ms, initial-readiness:15038ms, page-close:3ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Screenshot: `whole-render-final-color-timeout.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 0
- Witness view: default
- Interaction count: 0
- Nonblank: false
- Real splat evidence: false
- Changed pixels: 0 / 921600 (0.000%)
- Total capture ms: 15321


## Findings

- capture-smoke-failed: whole-render-final-color did not pass visual smoke classification.
- blank-capture: whole-render-final-color did not produce a nonblank image.
- missing-capture: Missing dessert-close-final-color operator witness capture.
- missing-capture: Missing porous-close-final-color operator witness capture.
- missing-capture: Missing porous-close-orbit-left operator witness capture.
- missing-capture: Missing porous-close-orbit-right operator witness capture.

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
  }
]
```

## Boundary

- This is operator visual evidence, not trace evidence.
- Trace and presentation anchors are removed from every capture URL.
- Broad multi-anchor trace diagnostics remain a separate blocker.
- This harness does not claim production visual repair.

## Summary

FAIL: whole-render-final-color did not pass visual smoke classification.
