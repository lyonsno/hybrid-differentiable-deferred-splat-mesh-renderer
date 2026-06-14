# Static Dessert Witness Report

- Status: FAIL
- Generated: 2026-06-14T20:21:02.907Z
- Base URL: http://127.0.0.1:64042/
- Operator smoke URL: http://127.0.0.1:64042/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Evaluate selected-anchor retention-only color-authority seed repair before review/landing.
- Expected visual delta: May alter fall-through/color mismatch at selected-anchor retained foreground rows; not expected to solve conic/pixelation globally.
- Evidence surface: static dessert witness report, analysis.json, final-color capture, and debug captures


## Fixed View

- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Viewport: 1280x720
- Tile grid: 80x45
- Total tile refs: 14970
- Max tile refs per tile: 64
- Projected tile refs before cap: 714772
- Retained tile refs after cap: 14970
- Evicted tile refs by cap: 699802
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
- Tile-local changed pixels: 5.543%
- Tile-local/plate changed-pixel ratio: 1.6268390548372715 (max 2)
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
- Trace changed pixels: 5.452%

- visual-gap-1@592,368: present; score 225.5; plate delta 195.333; tile-local delta 45; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 0.999992235996; remaining T 0.000007764004; foreground 48; foreground alpha 0.999992
- visual-gap-2@520,388: present; score 180.5; plate delta 190; tile-local delta 69.667; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 0.999999996227; remaining T 3.773e-9; foreground 48; foreground alpha 1
- visual-gap-3@640,304: present; score 135; plate delta 132.333; tile-local delta 42.333; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 0.962632360941; remaining T 0.037367639059; foreground 48; foreground alpha 0.962632

## Operator-Visible Bad Pixel Trace

- Status: present
- Capture: operator-visible-bad-pixel-trace
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Derived anchor count: 3
- Trace changed pixels: 5.579%
- Trace/canvas parity: trace-canvas-match
- Trace/canvas parity source: live-compositor-input-readback
- Trace/canvas parity mismatches: 0; missing anchors: none; max delta: 0
- Trace model/live parity: match; mismatches: none; max delta: 0

- operator-bad-pixel-1@545,366 (operator-visible-dark-fallthrough): present; score 371.087; plate luma 213.976; final luma 40.39; output luma 54.764; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 0.997670407852; remaining T 0.002329592148; foreground 48; foreground alpha 0.99767; rgb provenance selected-source-color-underpowered (source luma 240.459, contribution luma 22.018, color/alpha transfer 0.342); parity match delta 1; predicted [79,50,32,254]; sampled [79,50,32,255]; cpu-trace [79,50,32,254]; live [79,50,32,254]; model/live match delta 0
- operator-bad-pixel-2@757,388 (operator-visible-bright-outlier): present; score 350.331; plate luma 43.941; final luma 196.689; output luma 163.951; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 60; alpha 0.999999988684; remaining T 1.1316e-8; foreground 48; foreground alpha 1; rgb provenance selected-source-color-transferred-still-mismatched (source luma 255, contribution luma 101.158, color/alpha transfer 0.305); parity match delta 0; predicted [167,164,156,255]; sampled [167,164,156,255]; cpu-trace [167,164,156,255]; live [167,164,156,255]; model/live match delta 0
- operator-bad-pixel-3@615,383 (operator-visible-bright-outlier): present; score 322.543; plate luma 48.506; final luma 188.966; output luma 150.442; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 1; remaining T 0; foreground 48; foreground alpha 1; rgb provenance selected-source-color-transferred-still-mismatched (source luma 255, contribution luma 96.118, color/alpha transfer 0.3); parity match delta 0; predicted [172,146,129,255]; sampled [172,146,129,255]; cpu-trace [172,146,129,255]; live [172,146,129,255]; model/live match delta 0

## Operator-Visible Bad Pixel Classification

- Status: classified
- Category: selected-anchor-post-alpha-color-mismatch
- Stage: selected-anchor-color-transfer
- Source route: wgsl-projected-ref-stream-source-frontier
- Classified anchors: 3 / 3
- Blockers: 0
- RGB provenance categories: selected-source-color-underpowered=1, selected-source-color-transferred-still-mismatched=2

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

- URL: http://127.0.0.1:64042/
- Screenshot: `plate-final-color.png`
- Renderer label: plate
- Tile refs: 0
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 31402 / 921600 (3.407%)

### Final color tile-local visible compositor

- URL: http://127.0.0.1:64042/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Screenshot: `final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14997
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 51086 / 921600 (5.543%)

### Coverage weight heatmap

- URL: http://127.0.0.1:64042/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 14940
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 50367 / 921600 (5.465%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:64042/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 14952
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 67367 / 921600 (7.310%)

### Transmittance heatmap

- URL: http://127.0.0.1:64042/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 14978
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 62884 / 921600 (6.823%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:64042/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 14970
- Debug mode: tile-ref-count
- Nonblank: true
- Changed pixels: 608969 / 921600 (66.077%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:64042/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=conic-shape
- Screenshot: `conic-shape.png`
- Renderer label: tile-local-visible-debug-conic-shape
- Tile refs: 14988
- Debug mode: conic-shape
- Nonblank: true
- Changed pixels: 72308 / 921600 (7.846%)

### Visual gap final-color trace anchors

- URL: http://127.0.0.1:64042/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=visual-gap-1%40592%2C368%3Aplate-covered-tile-local-missing%3Bvisual-gap-2%40520%2C388%3Aplate-covered-tile-local-missing%3Bvisual-gap-3%40640%2C304%3Aplate-covered-tile-local-missing
- Screenshot: `visual-gap-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14947
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 50250 / 921600 (5.452%)

### Operator-visible bad-pixel final-color trace anchors

- URL: http://127.0.0.1:64042/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=operator-bad-pixel-1%40545%2C366%3Aoperator-visible-dark-fallthrough%3Boperator-bad-pixel-2%40757%2C388%3Aoperator-visible-bright-outlier%3Boperator-bad-pixel-3%40615%2C383%3Aoperator-visible-bright-outlier
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14987
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 51417 / 921600 (5.579%)


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
