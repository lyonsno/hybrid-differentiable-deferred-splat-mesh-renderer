# GPU Live Parity Mugshot Report

- Status: PASS
- Generated: 2026-05-25T22:30:04.913Z
- Base URL: http://127.0.0.1:55110/
- Contact sheet: `gpu-live-parity-mugshot-contact-sheet.png`
- Analysis JSON: local-only, omitted from committed evidence artifacts

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Classify same-view CPU reference versus direct GPU live route divergence before visual repair.
- Expected visual delta: none expected from this harness-only slice
- Evidence surface: GPU live parity mugshot report, contact sheet, screenshots, route identities, and pair image diffs


## Witness Set

- Capture count: 6
- Pair count: 3
- Witness views: default, dessert-close, dessert-porous-close
- Route roles: cpu-reference, direct-gpu-live
- Arena backends: cpu, gpu
- Effective arena backends: cpu, gpu
- Tile budgets: 16px/256 refs
- Primary divergence: tile-ref-population-divergence
- Pairs needing investigation: 3
- Tile-ref divergence pairs: whole-render, dessert-close, porous-close
- Final-color divergence pairs: whole-render, dessert-close, porous-close

## Pairs

### whole-render

- Witness view: default
- CPU capture: whole-render-cpu-reference
- GPU capture: whole-render-direct-gpu
- CPU refs: 61643
- GPU refs: 921600
- Ref ratio: 14.950602663724997
- CPU effective arena: cpu
- GPU effective arena: gpu
- Changed pixels: 10128 / 921600 (1.099%)
- Image comparable: true

### dessert-close

- Witness view: dessert-close
- CPU capture: dessert-close-cpu-reference
- GPU capture: dessert-close-direct-gpu
- CPU refs: 61643
- GPU refs: 921600
- Ref ratio: 14.950602663724997
- CPU effective arena: cpu
- GPU effective arena: gpu
- Changed pixels: 81047 / 921600 (8.794%)
- Image comparable: true

### porous-close

- Witness view: dessert-porous-close
- CPU capture: porous-close-cpu-reference
- GPU capture: porous-close-direct-gpu
- CPU refs: 412939
- GPU refs: 921600
- Ref ratio: 2.231806634878275
- CPU effective arena: cpu
- GPU effective arena: gpu
- Changed pixels: 131441 / 921600 (14.262%)
- Image comparable: true


## Captures

### Whole render CPU reference

- Pair: whole-render
- Route role: cpu-reference
- URL: http://127.0.0.1:55110/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=cpu
- Screenshot: `whole-render-cpu-reference.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 61643
- Arena requested/effective: cpu / cpu
- Witness view: default
- Generic nonblank smoke: false
- Generic real splat smoke: false
- Page source: scaniverse_ply / 94406 splats
- Changed pixels vs background: 1998 / 921600 (0.217%)
- Parity pixel evidence: true

### Whole render direct GPU live

- Pair: whole-render
- Route role: direct-gpu-live
- URL: http://127.0.0.1:55110/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu
- Screenshot: `whole-render-direct-gpu.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 921600
- Arena requested/effective: gpu / gpu
- Witness view: default
- Generic nonblank smoke: true
- Generic real splat smoke: true
- Page source: scaniverse_ply / 94406 splats
- Changed pixels vs background: 9048 / 921600 (0.982%)
- Parity pixel evidence: true

### Dessert close CPU reference

- Pair: dessert-close
- Route role: cpu-reference
- URL: http://127.0.0.1:55110/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=cpu&witnessView=dessert-close
- Screenshot: `dessert-close-cpu-reference.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 61643
- Arena requested/effective: cpu / cpu
- Witness view: dessert-close
- Generic nonblank smoke: true
- Generic real splat smoke: true
- Page source: scaniverse_ply / 94406 splats
- Changed pixels vs background: 40739 / 921600 (4.420%)
- Parity pixel evidence: true

### Dessert close direct GPU live

- Pair: dessert-close
- Route role: direct-gpu-live
- URL: http://127.0.0.1:55110/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&witnessView=dessert-close
- Screenshot: `dessert-close-direct-gpu.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 921600
- Arena requested/effective: gpu / gpu
- Witness view: dessert-close
- Generic nonblank smoke: true
- Generic real splat smoke: true
- Page source: scaniverse_ply / 94406 splats
- Changed pixels vs background: 86047 / 921600 (9.337%)
- Parity pixel evidence: true

### Porous close CPU reference

- Pair: porous-close
- Route role: cpu-reference
- URL: http://127.0.0.1:55110/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=cpu&witnessView=dessert-porous-close
- Screenshot: `porous-close-cpu-reference.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 412939
- Arena requested/effective: cpu / cpu
- Witness view: dessert-porous-close
- Generic nonblank smoke: true
- Generic real splat smoke: true
- Page source: scaniverse_ply / 94406 splats
- Changed pixels vs background: 145368 / 921600 (15.773%)
- Parity pixel evidence: true

### Porous close direct GPU live

- Pair: porous-close
- Route role: direct-gpu-live
- URL: http://127.0.0.1:55110/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&witnessView=dessert-porous-close
- Screenshot: `porous-close-direct-gpu.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 921600
- Arena requested/effective: gpu / gpu
- Witness view: dessert-porous-close
- Generic nonblank smoke: true
- Generic real splat smoke: true
- Page source: scaniverse_ply / 94406 splats
- Changed pixels vs background: 183266 / 921600 (19.886%)
- Parity pixel evidence: true


## Findings

- None

## Route Identity

```json
[
  {
    "id": "whole-render-cpu-reference",
    "pairId": "whole-render",
    "routeRole": "cpu-reference",
    "routeIdentity": {
      "captureId": "whole-render-cpu-reference",
      "evidenceRole": "gpu-live-parity-mugshot",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "default",
      "renderer": "tile-local-visible",
      "arenaBackend": "cpu",
      "effectiveArenaBackend": "cpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "traceAnchors": null,
      "presentationAnchors": null,
      "presentationScope": "full-scene",
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
    "id": "whole-render-direct-gpu",
    "pairId": "whole-render",
    "routeRole": "direct-gpu-live",
    "routeIdentity": {
      "captureId": "whole-render-direct-gpu",
      "evidenceRole": "gpu-live-parity-mugshot",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "default",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "traceAnchors": null,
      "presentationAnchors": null,
      "presentationScope": "full-scene",
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
    "id": "dessert-close-cpu-reference",
    "pairId": "dessert-close",
    "routeRole": "cpu-reference",
    "routeIdentity": {
      "captureId": "dessert-close-cpu-reference",
      "evidenceRole": "gpu-live-parity-mugshot",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "cpu",
      "effectiveArenaBackend": "cpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "traceAnchors": null,
      "presentationAnchors": null,
      "presentationScope": "full-scene",
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
    "id": "dessert-close-direct-gpu",
    "pairId": "dessert-close",
    "routeRole": "direct-gpu-live",
    "routeIdentity": {
      "captureId": "dessert-close-direct-gpu",
      "evidenceRole": "gpu-live-parity-mugshot",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "traceAnchors": null,
      "presentationAnchors": null,
      "presentationScope": "full-scene",
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
    "id": "porous-close-cpu-reference",
    "pairId": "porous-close",
    "routeRole": "cpu-reference",
    "routeIdentity": {
      "captureId": "porous-close-cpu-reference",
      "evidenceRole": "gpu-live-parity-mugshot",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-porous-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "cpu",
      "effectiveArenaBackend": "cpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "traceAnchors": null,
      "presentationAnchors": null,
      "presentationScope": "full-scene",
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
    "id": "porous-close-direct-gpu",
    "pairId": "porous-close",
    "routeRole": "direct-gpu-live",
    "routeIdentity": {
      "captureId": "porous-close-direct-gpu",
      "evidenceRole": "gpu-live-parity-mugshot",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-porous-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "traceAnchors": null,
      "presentationAnchors": null,
      "presentationScope": "full-scene",
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

- This witness compares final-color CPU/reference and direct GPU-live tile-local routes under the same camera/view.
- It does not repair alpha, conic, ordering, source selection, camera, tile caps, or deferred semantics.
- CPU/reference remains an observable oracle; direct GPU remains the live presentation route under test.

## Summary

PASS: CPU reference and direct GPU live routes were captured under 3 same-view final-color pairs; primary divergence is tile-ref-population-divergence.
