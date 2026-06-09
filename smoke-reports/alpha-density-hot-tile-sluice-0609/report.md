# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-09T08:51:15.451Z
- Base URL: http://127.0.0.1:58189/
- Contact sheet: `operator-witness-contact-sheet.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: runtime/accounting closure for alpha-density hot tile stream; no visual-quality closure
- Expected visual delta: none expected except possible inert jitter from alpha-density accounting storage refactor
- Evidence surface: operator witness report, contact sheet, and app timing stages


## Witness Set

- Capture count: 5
- Operator visual captures: 3
- Filmstrip captures: 2
- Visual contracts: alpha-fallthrough-close-view, alpha-fallthrough-orbit-frame
- Witness views: default, dessert-close, dessert-porous-close
- Renderers: tile-local-visible
- Arena backends: gpu
- Tile budgets: 16px/256 refs

## Timing

- Total loop ms: 38500
- Total capture ms: 37739
- Slowest capture: porous-close-orbit-right (10877ms)
- Slowest stage: whole-render-final-color/settle-before-interaction (5003ms)
- Slowest operator readiness: session/initial-readiness (465ms)
- Slowest app frame stage: whole-render-final-color/tile-local-scene-state-refresh/create-state (54.3ms, frame 3)
- Slowest app frame total: whole-render-final-color (56.7ms, frame 3)
- Source-frontier pack slowest substage: not reported
- Tile-local scene-state slowest substage: whole-render-final-color/tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (26.2ms, frame 3)
- Source-frontier pack counts: not reported
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (465ms readiness vs 54.3ms app-frame stage; gap 410.7ms)
- Operator readiness vs app frame total: app-frame-total-not-reported (465ms readiness; readiness capture session, app-frame capture unknown)
- Operator readiness vs observed poll frame total: app-frame-total-not-reported (465ms readiness; readiness capture session, app-frame capture unknown)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=465ms slowestPoll=254ms@2 observedFrame=2 observedFrameTotal=1.8ms observedFrameSlowestStage=evidence-exposure:1.6ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=not reported slowestPollObservedFrameTotal=not reportedms slowestPollObservedFrameSlowestStage=not reported slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=canvas-width-not-settled,canvas-height-not-settled,renderer-label-mismatch,tile-local-retained-refs-missing

- whole-render-final-color: 5192ms (apply-view:0ms, view-readiness:59ms, settle-before-interaction:5003ms, collect-settled-evidence:15ms, screenshot:23ms, image-analysis:79ms, trace-canvas-parity:12ms, classify-smoke:1ms, witness-diagnostics:0ms)
- dessert-close-final-color: 5476ms (apply-view:1ms, view-readiness:313ms, settle-before-interaction:5002ms, collect-settled-evidence:9ms, screenshot:57ms, image-analysis:79ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 5555ms (apply-view:1ms, view-readiness:342ms, settle-before-interaction:5001ms, collect-settled-evidence:9ms, screenshot:98ms, image-analysis:88ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 10639ms (apply-view:1ms, view-readiness:42ms, settle-before-interaction:5002ms, interactions:2ms, interaction-readiness:347ms, settle-after-interaction:5002ms, collect-settled-evidence:4ms, screenshot:112ms, image-analysis:100ms, trace-canvas-parity:27ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 10877ms (apply-view:1ms, view-readiness:332ms, settle-before-interaction:5003ms, interactions:8ms, interaction-readiness:316ms, settle-after-interaction:5002ms, collect-settled-evidence:7ms, screenshot:110ms, image-analysis:83ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:58189/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 2649
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 27329 / 921600 (2.965%)
- Total capture ms: 5192
- Readiness diagnostics: ready=true source=compact-readiness polls=1 failed=0 elapsed=59ms slowestPoll=59ms@1 observedFrame=3 observedFrameTotal=56.7ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:54.3ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (26.2ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=56.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:54.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (26.2ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=59ms slowestPoll=59ms@1 observedFrame=3 observedFrameTotal=56.7ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:54.3ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (26.2ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=56.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:54.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (26.2ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:58189/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 11887
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 192709 / 921600 (20.910%)
- Total capture ms: 5476
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=312ms slowestPoll=102ms@3 observedFrame=24 observedFrameTotal=150.7ms observedFrameSlowestStage=alpha-density:106.6ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (19.1ms, frame 24) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=150.7ms slowestPollObservedFrameSlowestStage=alpha-density:106.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (19.1ms, frame 24) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=312ms slowestPoll=102ms@3 observedFrame=24 observedFrameTotal=150.7ms observedFrameSlowestStage=alpha-density:106.6ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (19.1ms, frame 24) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=150.7ms slowestPollObservedFrameSlowestStage=alpha-density:106.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (19.1ms, frame 24) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:58189/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Visual contract: alpha-fallthrough-close-view
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 26354
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 919507 / 921600 (99.773%)
- Total capture ms: 5555
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=342ms slowestPoll=133ms@3 observedFrame=47 observedFrameTotal=173.1ms observedFrameSlowestStage=alpha-density:125.9ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.6ms, frame 47) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=47 slowestPollObservedFrameTotal=173.1ms slowestPollObservedFrameSlowestStage=alpha-density:125.9ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.6ms, frame 47) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=342ms slowestPoll=133ms@3 observedFrame=47 observedFrameTotal=173.1ms observedFrameSlowestStage=alpha-density:125.9ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.6ms, frame 47) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=47 slowestPollObservedFrameTotal=173.1ms slowestPollObservedFrameSlowestStage=alpha-density:125.9ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (24.6ms, frame 47) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:58189/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 27742
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 920116 / 921600 (99.839%)
- Total capture ms: 10639
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=347ms slowestPoll=132ms@3 observedFrame=70 observedFrameTotal=178.8ms observedFrameSlowestStage=alpha-density:138.4ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.1ms, frame 70) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=70 slowestPollObservedFrameTotal=178.8ms slowestPollObservedFrameSlowestStage=alpha-density:138.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.1ms, frame 70) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=41ms slowestPoll=41ms@1 observedFrame=49 observedFrameTotal=39.8ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:38.6ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (20.1ms, frame 49) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=49 slowestPollObservedFrameTotal=39.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:38.6ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (20.1ms, frame 49) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=347ms slowestPoll=132ms@3 observedFrame=70 observedFrameTotal=178.8ms observedFrameSlowestStage=alpha-density:138.4ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.1ms, frame 70) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=70 slowestPollObservedFrameTotal=178.8ms slowestPollObservedFrameSlowestStage=alpha-density:138.4ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.1ms, frame 70) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:58189/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 25290
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 918284 / 921600 (99.640%)
- Total capture ms: 10877
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=316ms slowestPoll=109ms@3 observedFrame=113 observedFrameTotal=158.7ms observedFrameSlowestStage=alpha-density:115.7ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.6ms, frame 113) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=113 slowestPollObservedFrameTotal=158.7ms slowestPollObservedFrameSlowestStage=alpha-density:115.7ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.6ms, frame 113) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=332ms slowestPoll=125ms@3 observedFrame=92 observedFrameTotal=165.3ms observedFrameSlowestStage=alpha-density:127.3ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (19.2ms, frame 92) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=92 slowestPollObservedFrameTotal=165.3ms slowestPollObservedFrameSlowestStage=alpha-density:127.3ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (19.2ms, frame 92) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=316ms slowestPoll=109ms@3 observedFrame=113 observedFrameTotal=158.7ms observedFrameSlowestStage=alpha-density:115.7ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.6ms, frame 113) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=113 slowestPollObservedFrameTotal=158.7ms slowestPollObservedFrameSlowestStage=alpha-density:115.7ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (21.6ms, frame 113) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}


## Blocking Harness Findings

- None

## Witness Diagnostics

These diagnostics are witness-only visual pressure from the backing analysis. They do not change the operator-witness pass/fail status unless the harness findings above fail.

- whole-render-final-color/projection-anisotropy (suspect): Projection anisotropy witness found ratio 70.33 across 1174 splats; route to conic-reckoner after field metadata is canonical.
- whole-render-final-color/compositing-ambiguous (suspect): Alpha density witness found 23 hot tiles with max mass 246902.52.
- dessert-close-final-color/projection-anisotropy (suspect): Projection anisotropy witness found ratio 70.33 across 1174 splats; route to conic-reckoner after field metadata is canonical.
- dessert-close-final-color/compositing-ambiguous (suspect): Alpha density witness found 23 hot tiles with max mass 246902.52.
- porous-close-final-color/projection-anisotropy (suspect): Projection anisotropy witness found ratio 70.33 across 1174 splats; route to conic-reckoner after field metadata is canonical.
- porous-close-final-color/compositing-ambiguous (suspect): Alpha density witness found 23 hot tiles with max mass 246902.52.
- porous-close-orbit-left/projection-anisotropy (suspect): Projection anisotropy witness found ratio 70.33 across 1174 splats; route to conic-reckoner after field metadata is canonical.
- porous-close-orbit-left/compositing-ambiguous (suspect): Alpha density witness found 23 hot tiles with max mass 246902.52.
- porous-close-orbit-right/projection-anisotropy (suspect): Projection anisotropy witness found ratio 70.33 across 1174 splats; route to conic-reckoner after field metadata is canonical.
- porous-close-orbit-right/compositing-ambiguous (suspect): Alpha density witness found 23 hot tiles with max mass 246902.52.

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
      "wgslProjectedRefStream": null,
      "requestedWgslProjectedRefStream": null,
      "effectiveWgslProjectedRefStream": "wgsl-projected-ref-stream-source-frontier",
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
      "wgslProjectedRefStream": null,
      "requestedWgslProjectedRefStream": null,
      "effectiveWgslProjectedRefStream": "wgsl-projected-ref-stream-source-frontier",
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
      "wgslProjectedRefStream": null,
      "requestedWgslProjectedRefStream": null,
      "effectiveWgslProjectedRefStream": "wgsl-projected-ref-stream-source-frontier",
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
      "wgslProjectedRefStream": null,
      "requestedWgslProjectedRefStream": null,
      "effectiveWgslProjectedRefStream": "wgsl-projected-ref-stream-source-frontier",
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
      "wgslProjectedRefStream": null,
      "requestedWgslProjectedRefStream": null,
      "effectiveWgslProjectedRefStream": "wgsl-projected-ref-stream-source-frontier",
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
