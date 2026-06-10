# Static Dessert Witness Report

- Status: PASS
- Generated: 2026-06-10T11:46:14.799Z
- Base URL: http://127.0.0.1:50963/
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Judge fixed dessert final-color and debug evidence for renderer-fidelity movement.
- Expected visual delta: fixed-view final-color should move only in the branch's claimed visual direction
- Evidence surface: static dessert witness report, analysis.json, final-color capture, and debug captures


## Fixed View

- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Viewport: 1280x720
- Tile grid: 80x45
- Total tile refs: 14956
- Max tile refs per tile: 64
- Projected tile refs before cap: 714772
- Retained tile refs after cap: 14956
- Evicted tile refs by cap: 699816
- Capped tiles: 0
- Saturated retained tiles: 0
- Max projected refs per tile: 64
- Header accounting matches retained refs: true
- Retention audit full frame (gpu-live-custody-estimate): current 0 refs vs legacy 0; policy added 0, dropped 0
- Porous body retention audit (gpu-live-region-unavailable:porous-body): projected 0, current 0, legacy 0; capped tiles 0; policy added 0, dropped 0
- Center leak band retention audit (gpu-live-region-unavailable:center-leak-band): projected 0, current 0, legacy 0; policy added 0, dropped 0
- Plate renderer label: plate
- Tile-local renderer label: tile-local-visible-gaussian-compositor
- Plate/tile-local same asset: true
- Plate/tile-local same viewport: true
- Plate changed pixels: 3.407%
- Tile-local changed pixels: 4.814%
- Tile-local/plate changed-pixel ratio: 1.4129673269218521 (max 2)
- Rim crop source centers: 87499
- Rim crop projected support splats: 88901
- Rim crop near-floor minor splats: 47346
- Rim crop source sample IDs: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
- Porous body source centers: 91238
- Porous body projected support splats: 92432
- Porous body near-floor minor splats: 49672
- Porous body source sample IDs: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
- Estimated max accumulated alpha: 1
- Estimated min transmittance: 0
- Max conic major radius px: 57.20889
- Min conic minor radius px: 1.5
- Max conic anisotropy: 21.797337

## Visual Gap Trace

- Status: present
- Capture: visual-gap-trace
- Screenshot: `visual-gap-trace.png`
- Derived anchor count: 3
- Trace changed pixels: 4.736%

- visual-gap-1@548,364: present; score 184; plate delta 195; tile-local delta 72.333; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 0.873906447883; remaining T 0.126093552117; foreground 48; foreground alpha 0.873906
- visual-gap-2@784,384: present; score 143; plate delta 137.667; tile-local delta 42.333; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 0.44197379473; remaining T 0.55802620527; foreground 48; foreground alpha 0.441974
- visual-gap-3@656,424: present; score 125; plate delta 127.333; tile-local delta 44; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 0.98343125338; remaining T 0.01656874662; foreground 48; foreground alpha 0.983431

## Plate Seepage Classification

- Status: classified
- Category: alpha-under-accumulation
- Stage: alpha-transfer
- Source route: wgsl-projected-ref-stream-source-frontier
- Classified anchors: 3 / 3
- Blockers: 0
- Mechanisms: retained-foreground-identity-survives-to-final-accumulation=3

## Captures

### Plate baseline final color

- URL: http://127.0.0.1:50963/
- Screenshot: `plate-final-color.png`
- Renderer label: plate
- Tile refs: 0
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 31402 / 921600 (3.407%)

### Final color tile-local visible compositor

- URL: http://127.0.0.1:50963/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Screenshot: `final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14946
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 44370 / 921600 (4.814%)

### Coverage weight heatmap

- URL: http://127.0.0.1:50963/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 14940
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 49927 / 921600 (5.417%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:50963/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 14951
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 57932 / 921600 (6.286%)

### Transmittance heatmap

- URL: http://127.0.0.1:50963/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 14950
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 54004 / 921600 (5.860%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:50963/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 14956
- Debug mode: tile-ref-count
- Nonblank: true
- Changed pixels: 608969 / 921600 (66.077%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:50963/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=conic-shape
- Screenshot: `conic-shape.png`
- Renderer label: tile-local-visible-debug-conic-shape
- Tile refs: 14956
- Debug mode: conic-shape
- Nonblank: true
- Changed pixels: 73800 / 921600 (8.008%)

### Visual gap final-color trace anchors

- URL: http://127.0.0.1:50963/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=visual-gap-1%40548%2C364%3Aplate-covered-tile-local-missing%3Bvisual-gap-2%40784%2C384%3Aplate-covered-tile-local-missing%3Bvisual-gap-3%40656%2C424%3Aplate-covered-tile-local-missing
- Screenshot: `visual-gap-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14926
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 43645 / 921600 (4.736%)


## Observation Boundaries

### Visible holes

- Status: captured-for-review
- Evidence IDs: final-color, coverage-weight, conic-shape
- Boundary: Porous/non-square final-color gaps are witnessed separately from tile-ref density and alpha transfer.

### Plate seepage

- Status: classified-for-review
- Evidence IDs: final-color, accumulated-alpha, transmittance, visual-gap-trace
- Boundary: Plate/background seepage is classified at alpha-transfer (alpha-under-accumulation) for wgsl-projected-ref-stream-source-frontier.

### High-viewport budget skip

- Status: separate-high-viewport-observation
- Boundary: High-viewport stale/cached-frame skips are not collapsed into the fixed 1280x720 final-color artifact.
- Repro: Run the same smoke URL at a high viewport such as 3456x1916 and capture overlay text containing `tile-local skipped: projected tile refs exceed budget`.

## Findings

- None

## Summary

PASS: static dessert final color and debug witnesses share one asset, viewport, and tile grid.
