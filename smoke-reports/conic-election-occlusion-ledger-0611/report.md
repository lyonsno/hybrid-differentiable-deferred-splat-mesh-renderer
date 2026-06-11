# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-11T17:08:03.000Z
- Base URL: http://127.0.0.1:49764/
- Contact sheet: `operator-witness-contact-sheet.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: operator visual gate for conic-election occlusion ledger repair
- Expected visual delta: source-frontier local conic support should no longer be skipped solely because tile-center coverage is zero; possible visual effect is reduced plate/dessert fall-through without claiming parity
- Evidence surface: operator witness loop contact sheet, report.md, analysis.json, and captured frames


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

- Total loop ms: 38338
- Total capture ms: 37253
- Slowest capture: porous-close-orbit-right (10632ms)
- Slowest stage: porous-close-final-color/settle-before-interaction (5002ms)
- Slowest operator readiness: session/initial-readiness (739ms)
- Slowest app frame stage: whole-render-final-color/tile-local-scene-state-refresh/create-state (62.9ms, frame 3)
- Slowest app frame total: whole-render-final-color (65.7ms, frame 3)
- Source-frontier pack slowest substage: not reported
- Tile-local scene-state slowest substage: dessert-close-final-color/tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30.5ms, frame 24)
- Source-frontier pack counts: not reported
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (739ms readiness vs 62.9ms app-frame stage; gap 676.1ms)
- Operator readiness vs app frame total: app-frame-total-not-reported (739ms readiness; readiness capture session, app-frame capture unknown)
- Operator readiness vs observed poll frame total: app-frame-total-not-reported (739ms readiness; readiness capture session, app-frame capture unknown)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=5 failed=4 elapsed=739ms slowestPoll=308ms@3 observedFrame=2 observedFrameTotal=2.2ms observedFrameSlowestStage=evidence-exposure:1.7ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=1 slowestPollObservedFrameTotal=65.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:60.1ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (27.7ms, frame 1) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-retained-refs-missing

- whole-render-final-color: 5202ms (apply-view:1ms, view-readiness:68ms, settle-before-interaction:5000ms, collect-settled-evidence:7ms, screenshot:27ms, image-analysis:84ms, operator-baseline-comparison:0ms, trace-canvas-parity:14ms, classify-smoke:0ms, witness-diagnostics:1ms)
- dessert-close-final-color: 5398ms (apply-view:1ms, view-readiness:225ms, settle-before-interaction:5001ms, collect-settled-evidence:10ms, screenshot:56ms, image-analysis:89ms, operator-baseline-comparison:0ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 5433ms (apply-view:1ms, view-readiness:217ms, settle-before-interaction:5002ms, collect-settled-evidence:12ms, screenshot:75ms, image-analysis:108ms, operator-baseline-comparison:0ms, trace-canvas-parity:18ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 10588ms (apply-view:1ms, view-readiness:56ms, settle-before-interaction:5001ms, interactions:3ms, interaction-readiness:317ms, settle-after-interaction:5001ms, collect-settled-evidence:4ms, screenshot:87ms, image-analysis:101ms, operator-baseline-comparison:0ms, trace-canvas-parity:17ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 10632ms (apply-view:1ms, view-readiness:219ms, settle-before-interaction:5002ms, interactions:9ms, interaction-readiness:212ms, settle-after-interaction:5001ms, collect-settled-evidence:8ms, screenshot:66ms, image-analysis:98ms, operator-baseline-comparison:0ms, trace-canvas-parity:16ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:49764/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14975
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 52419 / 921600 (5.688%)
- Baseline comparison: not requested
- Total capture ms: 5202
- Readiness diagnostics: ready=true source=compact-readiness polls=1 failed=0 elapsed=67ms slowestPoll=67ms@1 observedFrame=3 observedFrameTotal=65.7ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:62.9ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=65.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:62.9ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=67ms slowestPoll=67ms@1 observedFrame=3 observedFrameTotal=65.7ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:62.9ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30ms, frame 3) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=3 slowestPollObservedFrameTotal=65.7ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:62.9ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30ms, frame 3) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:49764/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Visual contract: general-operator-visual
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 136130
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 312476 / 921600 (33.906%)
- Baseline comparison: not requested
- Total capture ms: 5398
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=224ms slowestPoll=15ms@3 observedFrame=24 observedFrameTotal=62.3ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:60.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30.5ms, frame 24) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=62.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:60.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30.5ms, frame 24) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=224ms slowestPoll=15ms@3 observedFrame=24 observedFrameTotal=62.3ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:60.5ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30.5ms, frame 24) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=24 slowestPollObservedFrameTotal=62.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:60.5ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (30.5ms, frame 24) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:49764/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Visual contract: alpha-fallthrough-close-view
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 336909
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 919544 / 921600 (99.777%)
- Baseline comparison: not requested
- Total capture ms: 5433
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=217ms slowestPoll=10ms@3 observedFrame=46 observedFrameTotal=54.9ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:53.9ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.8ms, frame 46) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=46 slowestPollObservedFrameTotal=54.9ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:53.9ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.8ms, frame 46) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=217ms slowestPoll=10ms@3 observedFrame=46 observedFrameTotal=54.9ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:53.9ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.8ms, frame 46) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=46 slowestPollObservedFrameTotal=54.9ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:53.9ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (28.8ms, frame 46) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:49764/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 345919
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 920653 / 921600 (99.897%)
- Baseline comparison: not requested
- Total capture ms: 10588
- Readiness diagnostics: ready=true source=compact-readiness polls=4 failed=3 elapsed=317ms slowestPoll=6ms@1 observedFrame=69 observedFrameTotal=1ms observedFrameSlowestStage=evidence-exposure:0.8ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=49 slowestPollObservedFrameTotal=3.7ms slowestPollObservedFrameSlowestStage=evidence-exposure:2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-retained-refs-missing
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=56ms slowestPoll=55ms@1 observedFrame=48 observedFrameTotal=53.8ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:52.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.3ms, frame 48) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=48 slowestPollObservedFrameTotal=53.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:52.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (29.3ms, frame 48) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=4 failed=3 elapsed=317ms slowestPoll=6ms@1 observedFrame=69 observedFrameTotal=1ms observedFrameSlowestStage=evidence-exposure:0.8ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=49 slowestPollObservedFrameTotal=3.7ms slowestPollObservedFrameSlowestStage=evidence-exposure:2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-retained-refs-missing}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:49764/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Visual contract: alpha-fallthrough-orbit-frame
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 323388
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 918199 / 921600 (99.631%)
- Baseline comparison: not requested
- Total capture ms: 10632
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=212ms slowestPoll=4ms@3 observedFrame=111 observedFrameTotal=49.6ms observedFrameSlowestStage=tile-local-scene-state-refresh:47.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.7ms, frame 111) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=111 slowestPollObservedFrameTotal=49.6ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:47.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.7ms, frame 111) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=219ms slowestPoll=12ms@3 observedFrame=90 observedFrameTotal=52.1ms observedFrameSlowestStage=tile-local-scene-state-refresh/create-state:50.9ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (26.5ms, frame 90) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=90 slowestPollObservedFrameTotal=52.1ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh/create-state:50.9ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (26.5ms, frame 90) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=212ms slowestPoll=4ms@3 observedFrame=111 observedFrameTotal=49.6ms observedFrameSlowestStage=tile-local-scene-state-refresh:47.2ms observedSourceFrontierPackSubstage=not reported observedTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.7ms, frame 111) observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=111 slowestPollObservedFrameTotal=49.6ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:47.2ms slowestPollSourceFrontierPackSubstage=not reported slowestPollTileLocalSceneStateSubstage=tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence (22.7ms, frame 111) slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=tile-local-presentation-stale}


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
