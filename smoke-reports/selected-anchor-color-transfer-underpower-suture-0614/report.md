# Static Dessert Witness Report

- Status: FAIL
- Generated: 2026-06-15T00:59:20.155Z
- Base URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Operator smoke URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Decide whether selected-anchor support color underpower repair is converging enough for review/operator smoke.
- Expected visual delta: Support-only bright selected-anchor foreground should lift unclaimed RGB without reopening late plate-colored support contamination; alpha seal and route identity should remain preserved.
- Evidence surface: static dessert witness report, analysis json, and final-color captures


## Fixed View

- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Viewport: 1280x720
- Tile grid: 80x45
- Total tile refs: 14976
- Max tile refs per tile: 64
- Projected tile refs before cap: 714772
- Retained tile refs after cap: 14976
- Evicted tile refs by cap: 699796
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
- Tile-local changed pixels: 5.565%
- Tile-local/plate changed-pixel ratio: 1.6331443857079166 (max 2)
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
- Trace changed pixels: 5.560%

- visual-gap-1@592,368: present; score 219.5; plate delta 195.333; tile-local delta 49; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 0.999999832689; remaining T 1.67311e-7; foreground 48; foreground alpha 1
- visual-gap-2@516,388: present; score 182; plate delta 152; tile-local delta 30.667; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 0.99931039614; remaining T 0.00068960386; foreground 48; foreground alpha 0.99931
- visual-gap-3@784,384: present; score 164; plate delta 137.667; tile-local delta 28.333; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 0.976610884875; remaining T 0.023389115125; foreground 48; foreground alpha 0.976611

## Operator-Visible Bad Pixel Trace

- Status: present
- Capture: operator-visible-bad-pixel-trace
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Derived anchor count: 3
- Trace changed pixels: 5.490%
- Trace/canvas parity: trace-canvas-match
- Trace/canvas parity source: live-compositor-input-readback
- Trace/canvas parity mismatches: 0; missing anchors: none; max delta: 0
- Trace model/live parity: match; mismatches: none; max delta: 0

- operator-bad-pixel-1@569,407 (operator-visible-bright-outlier): present; score 339.838; plate luma 47.878; final luma 196.383; output luma 168.101; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 1; remaining T 0; foreground 48; foreground alpha 1; rgb provenance selected-source-color-transferred-still-mismatched (source luma 254.94, contribution luma 100.795, color/alpha transfer 0.299); parity match delta 0; predicted [186,165,144,255]; sampled [186,165,144,255]; cpu-trace [186,165,144,255]; live [186,165,144,255]; model/live match delta 0
- operator-bad-pixel-2@592,368 (operator-visible-dark-fallthrough): present; score 334.835; plate luma 209.567; final luma 57.649; output luma 138.671; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 61; alpha 0.999997553666; remaining T 0.000002446334; foreground 48; foreground alpha 0.999998; rgb provenance selected-source-color-transferred-still-mismatched (source luma 255, contribution luma 71.771, color/alpha transfer 0.314); parity match delta 0; predicted [167,134,101,255]; sampled [167,134,101,255]; cpu-trace [167,134,101,255]; live [167,134,101,255]; model/live match delta 0
- operator-bad-pixel-3@767,407 (operator-visible-bright-outlier): present; score 321.173; plate luma 43.316; final luma 183.323; output luma 148.549; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 0.99999999997; remaining T 3e-11; foreground 48; foreground alpha 1; rgb provenance selected-source-color-transferred-still-mismatched (source luma 255, contribution luma 72.694, color/alpha transfer 0.341); parity match delta 0; predicted [167,145,134,255]; sampled [167,145,134,255]; cpu-trace [167,145,134,255]; live [167,145,134,255]; model/live match delta 0

## Operator-Visible Bad Pixel Classification

- Status: classified
- Category: selected-anchor-post-alpha-color-mismatch
- Stage: selected-anchor-color-transfer
- Source route: wgsl-projected-ref-stream-source-frontier
- Classified anchors: 3 / 3
- Blockers: 0
- RGB provenance categories: selected-source-color-transferred-still-mismatched=3

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

- URL: http://127.0.0.1:64114/
- Screenshot: `plate-final-color.png`
- Renderer label: plate
- Tile refs: 0
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 31402 / 921600 (3.407%)

### Final color tile-local visible compositor

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Screenshot: `final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14972
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 51284 / 921600 (5.565%)

### Coverage weight heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 14962
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 50407 / 921600 (5.470%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 14949
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 68355 / 921600 (7.417%)

### Transmittance heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 14969
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 62196 / 921600 (6.749%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 14976
- Debug mode: tile-ref-count
- Nonblank: true
- Changed pixels: 608969 / 921600 (66.077%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=conic-shape
- Screenshot: `conic-shape.png`
- Renderer label: tile-local-visible-debug-conic-shape
- Tile refs: 14965
- Debug mode: conic-shape
- Nonblank: true
- Changed pixels: 74225 / 921600 (8.054%)

### Visual gap final-color trace anchors

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=visual-gap-1%40592%2C368%3Aplate-covered-tile-local-missing%3Bvisual-gap-2%40516%2C388%3Aplate-covered-tile-local-missing%3Bvisual-gap-3%40784%2C384%3Aplate-covered-tile-local-missing
- Screenshot: `visual-gap-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14964
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 51242 / 921600 (5.560%)

### Operator-visible bad-pixel final-color trace anchors

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=operator-bad-pixel-1%40569%2C407%3Aoperator-visible-bright-outlier%3Boperator-bad-pixel-2%40592%2C368%3Aoperator-visible-dark-fallthrough%3Boperator-bad-pixel-3%40767%2C407%3Aoperator-visible-bright-outlier
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14956
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 50595 / 921600 (5.490%)


## Observation Boundaries

### Visible holes

- Status: classified-for-review
- Category: operator-visible-bad-pixels
- Stage: selected-anchor-color-transfer
- Evidence IDs: final-color, operator-visible-bad-pixel-trace, accumulated-alpha, transmittance
- Boundary: Selected operator-visible bad-pixel anchors remain mismatched after traced foreground survival and per-anchor alpha/transmittance saturation; 3 traced anchors route the next repair to RGB/color-transfer or support-footprint semantics without claiming global alpha seal.

### Plate seepage

- Status: classified-for-review
- Evidence IDs: final-color, accumulated-alpha, transmittance, visual-gap-trace
- Boundary: Plate/background seepage is classified at foreground-survived (no-seepage) for wgsl-projected-ref-stream-source-frontier.

### High-viewport budget skip

- Status: separate-high-viewport-observation
- Boundary: High-viewport stale/cached-frame skips are not collapsed into the fixed 1280x720 final-color artifact.
- Repro: Run the same smoke URL at a high viewport such as 3456x1916 and capture overlay text containing `tile-local skipped: projected tile refs exceed budget`.

## Findings

- operator-visible-bad-pixels-selected-anchor-post-alpha: Selected operator-visible bad-pixel anchors remain mismatched after traced foreground survived and per-anchor alpha/transmittance saturated.

## Summary

FAIL: Selected operator-visible bad-pixel anchors remain mismatched after traced foreground survived and per-anchor alpha/transmittance saturated.
