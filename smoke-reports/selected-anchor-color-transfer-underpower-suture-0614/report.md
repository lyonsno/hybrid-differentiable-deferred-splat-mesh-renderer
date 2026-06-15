# Static Dessert Witness Report

- Status: FAIL
- Generated: 2026-06-15T03:32:00.753Z
- Base URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Operator smoke URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: rereview finding disposition for selected-anchor support material clear-bootstrap guard
- Expected visual delta: no visual closure expected; two-support clear-bootstrap guard should preserve selected-anchor diagnostic classification without support-only clear-sequence full authority
- Evidence surface: static dessert witness report and committed PNG captures


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
- Tile-local changed pixels: 5.518%
- Tile-local/plate changed-pixel ratio: 1.6193554550665563 (max 2)
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
- Trace changed pixels: 5.532%

- visual-gap-1@564,376: present; score 194; plate delta 213.667; tile-local delta 84.333; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 1; remaining T 0; foreground 48; foreground alpha 1
- visual-gap-2@784,384: present; score 148; plate delta 137.667; tile-local delta 39; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 0.938823461108; remaining T 0.061176538892; foreground 48; foreground alpha 0.938823
- visual-gap-3@656,424: present; score 135; plate delta 127.333; tile-local delta 37.333; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 62; alpha 0.999999963632; remaining T 3.6368e-8; foreground 48; foreground alpha 1

## Operator-Visible Bad Pixel Trace

- Status: present
- Capture: operator-visible-bad-pixel-trace
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Derived anchor count: 3
- Trace changed pixels: 5.487%
- Trace/canvas parity: trace-canvas-match
- Trace/canvas parity source: live-compositor-input-readback
- Trace/canvas parity mismatches: 0; missing anchors: none; max delta: 0
- Trace model/live parity: match; mismatches: none; max delta: 1

- operator-bad-pixel-1@756,389 (operator-visible-bright-outlier): present; score 345.507; plate luma 44.656; final luma 195.413; output luma 188.988; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 62; alpha 0.999999999462; remaining T 5.38e-10; foreground 48; foreground alpha 1; rgb provenance selected-source-color-transferred-still-mismatched (source luma 255, contribution luma 102.797, color/alpha transfer 0.336); parity match delta 0; predicted [195,188,180,255]; sampled [195,188,180,255]; cpu-trace [195,188,180,255]; live [195,188,180,255]; model/live match delta 0
- operator-bad-pixel-2@546,367 (operator-visible-dark-fallthrough): present; score 317.498; plate luma 215.899; final luma 67.568; output luma 97.623; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 0.999944164014; remaining T 0.000055835986; foreground 48; foreground alpha 0.999944; rgb provenance selected-source-color-transferred-still-mismatched (source luma 240.459, contribution luma 60.941, color/alpha transfer 0.407); parity match delta 1; predicted [129,92,59,255]; sampled [128,92,59,255]; cpu-trace [129,92,59,255]; live [129,92,59,255]; model/live match delta 0
- operator-bad-pixel-3@632,393 (operator-visible-bright-outlier): present; score 248.34; plate luma 46.652; final luma 154.909; output luma 117.695; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 62; alpha 1; remaining T 0; foreground 48; foreground alpha 1; rgb provenance selected-source-color-transferred-still-mismatched (source luma 254.94, contribution luma 94.396, color/alpha transfer 0.266); parity match delta 0; predicted [157,111,77,255]; sampled [157,111,77,255]; cpu-trace [156,110,77,255]; live [157,111,77,255]; model/live match delta 1

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
- Tile refs: 14942
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 50851 / 921600 (5.518%)

### Coverage weight heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 14969
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 50546 / 921600 (5.485%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 14933
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 68145 / 921600 (7.394%)

### Transmittance heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 14988
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 63140 / 921600 (6.851%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 14970
- Debug mode: tile-ref-count
- Nonblank: true
- Changed pixels: 608969 / 921600 (66.077%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=conic-shape
- Screenshot: `conic-shape.png`
- Renderer label: tile-local-visible-debug-conic-shape
- Tile refs: 14956
- Debug mode: conic-shape
- Nonblank: true
- Changed pixels: 71913 / 921600 (7.803%)

### Visual gap final-color trace anchors

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=visual-gap-1%40564%2C376%3Aplate-covered-tile-local-missing%3Bvisual-gap-2%40784%2C384%3Aplate-covered-tile-local-missing%3Bvisual-gap-3%40656%2C424%3Aplate-covered-tile-local-missing
- Screenshot: `visual-gap-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14954
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 50982 / 921600 (5.532%)

### Operator-visible bad-pixel final-color trace anchors

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=operator-bad-pixel-1%40756%2C389%3Aoperator-visible-bright-outlier%3Boperator-bad-pixel-2%40546%2C367%3Aoperator-visible-dark-fallthrough%3Boperator-bad-pixel-3%40632%2C393%3Aoperator-visible-bright-outlier
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14966
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 50570 / 921600 (5.487%)


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
