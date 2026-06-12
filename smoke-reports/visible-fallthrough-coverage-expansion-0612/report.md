# Static Dessert Witness Report

- Status: FAIL
- Generated: 2026-06-12T23:03:57.276Z
- Base URL: http://127.0.0.1:52525/
- Operator smoke URL: http://127.0.0.1:52525/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
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
- Total tile refs: 14953
- Max tile refs per tile: 64
- Projected tile refs before cap: 714772
- Retained tile refs after cap: 14953
- Evicted tile refs by cap: 699819
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
- Tile-local changed pixels: 5.839%
- Tile-local/plate changed-pixel ratio: 1.7135532768613466 (max 2)
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
- Trace changed pixels: 5.716%

- visual-gap-1@588,364: present; score 186; plate delta 172.333; tile-local delta 48.333; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 0.999999930608; remaining T 6.9392e-8; foreground 48; foreground alpha 1
- visual-gap-2@520,388: present; score 164; plate delta 190; tile-local delta 80.667; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 0.999994250291; remaining T 0.000005749709; foreground 48; foreground alpha 0.999994
- visual-gap-3@756,424: present; score 161.5; plate delta 153.333; tile-local delta 45.667; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 61; alpha 1; remaining T 0; foreground 48; foreground alpha 1

## Operator-Visible Bad Pixel Trace

- Status: present
- Capture: operator-visible-bad-pixel-trace
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Derived anchor count: 3
- Trace changed pixels: 5.721%
- Trace/canvas parity: trace-canvas-mismatch
- Trace/canvas parity source: live-compositor-input-readback
- Trace/canvas parity mismatches: 1; missing anchors: none; max delta: 24
- Trace model/live parity: match; mismatches: none; max delta: 0

- operator-bad-pixel-1@528,374 (operator-visible-bright-outlier): present; score 523.046; plate luma 9.501; final luma 243.631; output luma 129.715; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 62; alpha 0.906763482855; remaining T 0.093236517145; foreground 48; foreground alpha 0.906763
- operator-bad-pixel-2@591,361 (operator-visible-dark-fallthrough): present; score 340.039; plate luma 191.24; final luma 32.034; output luma 95.874; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 60; alpha 0.999999999901; remaining T 9.9e-11; foreground 48; foreground alpha 1
- operator-bad-pixel-3@704,399 (operator-visible-bright-outlier): present; score 484.499; plate luma 34.1; final luma 248.265; output luma 216.322; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 62; alpha 0.999999999998; remaining T 2e-12; foreground 48; foreground alpha 1

## Operator-Visible Bad Pixel Classification

- Status: blocked
- Category: trace-canvas-parity-blocked
- Stage: trace-canvas-parity
- Source route: wgsl-projected-ref-stream-source-frontier
- Classified anchors: 0 / 3
- Blockers: 1

## Plate Seepage Classification

- Status: classified
- Category: no-seepage
- Stage: foreground-survived
- Source route: wgsl-projected-ref-stream-source-frontier
- Classified anchors: 3 / 3
- Blockers: 0
- Mechanisms: retained-foreground-identity-survives-to-final-accumulation=3

## Captures

### Plate baseline final color

- URL: http://127.0.0.1:52525/
- Screenshot: `plate-final-color.png`
- Renderer label: plate
- Tile refs: 0
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 31402 / 921600 (3.407%)

### Final color tile-local visible compositor

- URL: http://127.0.0.1:52525/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Screenshot: `final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14972
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 53809 / 921600 (5.839%)

### Coverage weight heatmap

- URL: http://127.0.0.1:52525/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 14932
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 48987 / 921600 (5.315%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:52525/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 14973
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 68023 / 921600 (7.381%)

### Transmittance heatmap

- URL: http://127.0.0.1:52525/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 14947
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 62935 / 921600 (6.829%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:52525/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 14953
- Debug mode: tile-ref-count
- Nonblank: true
- Changed pixels: 608969 / 921600 (66.077%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:52525/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=conic-shape
- Screenshot: `conic-shape.png`
- Renderer label: tile-local-visible-debug-conic-shape
- Tile refs: 14968
- Debug mode: conic-shape
- Nonblank: true
- Changed pixels: 74105 / 921600 (8.041%)

### Visual gap final-color trace anchors

- URL: http://127.0.0.1:52525/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=visual-gap-1%40588%2C364%3Aplate-covered-tile-local-missing%3Bvisual-gap-2%40520%2C388%3Aplate-covered-tile-local-missing%3Bvisual-gap-3%40756%2C424%3Aplate-covered-tile-local-missing
- Screenshot: `visual-gap-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14921
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 52675 / 921600 (5.716%)

### Operator-visible bad-pixel final-color trace anchors

- URL: http://127.0.0.1:52525/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=operator-bad-pixel-1%40528%2C374%3Aoperator-visible-bright-outlier%3Boperator-bad-pixel-2%40591%2C361%3Aoperator-visible-dark-fallthrough%3Boperator-bad-pixel-3%40704%2C399%3Aoperator-visible-bright-outlier
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14949
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 52722 / 921600 (5.721%)


## Observation Boundaries

### Visible holes

- Status: classified-for-review
- Category: conic-coverage-pressure
- Stage: conic-coverage-support
- Evidence IDs: final-color, coverage-weight, conic-shape
- Boundary: Porous/non-square final-color gaps remain after plate seepage sealed; conic anisotropy 21.797 and tile-local/plate changed-pixel ratio 1.714 route the next repair to conic/coverage support, not alpha transfer.

### Plate seepage

- Status: classified-for-review
- Evidence IDs: final-color, accumulated-alpha, transmittance, visual-gap-trace
- Boundary: Plate/background seepage is classified at foreground-survived (no-seepage) for wgsl-projected-ref-stream-source-frontier.

### High-viewport budget skip

- Status: separate-high-viewport-observation
- Boundary: High-viewport stale/cached-frame skips are not collapsed into the fixed 1280x720 final-color artifact.
- Repro: Run the same smoke URL at a high viewport such as 3456x1916 and capture overlay text containing `tile-local skipped: projected tile refs exceed budget`.

## Findings

- operator-visible-bad-pixel-trace-canvas-parity-blocked: Operator-visible bad pixels were traced, but trace/canvas parity blocked renderer attribution: trace-canvas-mismatch.

## Summary

FAIL: Operator-visible bad pixels were traced, but trace/canvas parity blocked renderer attribution: trace-canvas-mismatch.
