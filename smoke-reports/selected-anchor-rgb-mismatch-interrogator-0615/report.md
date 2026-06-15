# Static Dessert Witness Report

- Status: FAIL
- Generated: 2026-06-15T04:40:50.469Z
- Base URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Operator smoke URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: selected-anchor RGB mismatch category split for weak transferred color authority
- Expected visual delta: no visual closure expected; witness should split transferred-still-mismatched into weak-authority if the real anchors match the measured color/alpha transfer ratios
- Evidence surface: static dessert witness report and committed PNG captures


## Fixed View

- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Viewport: 1280x720
- Tile grid: 80x45
- Total tile refs: 14952
- Max tile refs per tile: 64
- Projected tile refs before cap: 714772
- Retained tile refs after cap: 14952
- Evicted tile refs by cap: 699820
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
- Tile-local changed pixels: 5.475%
- Tile-local/plate changed-pixel ratio: 1.606840328641488 (max 2)
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
- Trace changed pixels: 5.479%

- visual-gap-1@520,388: present; score 201.5; plate delta 190; tile-local delta 55.667; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 62; alpha 0.999998565636; remaining T 0.000001434364; foreground 48; foreground alpha 0.999999
- visual-gap-2@784,384: present; score 186; plate delta 137.667; tile-local delta 13.667; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 0.996425014295; remaining T 0.003574985705; foreground 48; foreground alpha 0.996425
- visual-gap-3@608,368: present; score 171; plate delta 176.667; tile-local delta 62.667; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 61; alpha 0.999999978193; remaining T 2.1807e-8; foreground 48; foreground alpha 1

## Operator-Visible Bad Pixel Trace

- Status: present
- Capture: operator-visible-bad-pixel-trace
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Derived anchor count: 3
- Trace changed pixels: 5.549%
- Trace/canvas parity: trace-canvas-match
- Trace/canvas parity source: live-compositor-input-readback
- Trace/canvas parity mismatches: 0; missing anchors: none; max delta: 0
- Trace model/live parity: match; mismatches: none; max delta: 0

- operator-bad-pixel-1@537,399 (operator-visible-bright-outlier): present; score 351.153; plate luma 49.299; final luma 203.035; output luma 173.24; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 62; alpha 0.999999389007; remaining T 6.10993e-7; foreground 48; foreground alpha 0.999999; rgb provenance selected-source-color-transferred-weak-authority (source luma 255, contribution luma 77.674, color/alpha transfer 0.361); parity match delta 0; predicted [181,172,159,255]; sampled [181,172,159,255]; cpu-trace [181,172,159,255]; live [181,172,159,255]; model/live match delta 0
- operator-bad-pixel-2@521,387 (operator-visible-dark-fallthrough): present; score 326.296; plate luma 200.889; final luma 53.76; output luma 125.451; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 62; alpha 0.999825408586; remaining T 0.000174591414; foreground 48; foreground alpha 0.999825; rgb provenance selected-source-color-underpowered (source luma 255, contribution luma 63.53, color/alpha transfer 0.317); parity match delta 0; predicted [137,123,115,255]; sampled [137,123,115,255]; cpu-trace [137,123,115,255]; live [137,123,115,255]; model/live match delta 0
- operator-bad-pixel-3@765,396 (operator-visible-bright-outlier): present; score 322.618; plate luma 46.525; final luma 186.476; output luma 127.556; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 0.999999999958; remaining T 4.2e-11; foreground 48; foreground alpha 1; rgb provenance selected-source-color-transferred-weak-authority (source luma 255, contribution luma 87.202, color/alpha transfer 0.323); parity match delta 1; predicted [138,125,122,255]; sampled [137,125,122,255]; cpu-trace [138,125,122,255]; live [138,125,122,255]; model/live match delta 0

## Operator-Visible Bad Pixel Classification

- Status: classified
- Category: selected-anchor-post-alpha-color-mismatch
- Stage: selected-anchor-color-transfer
- Source route: wgsl-projected-ref-stream-source-frontier
- Classified anchors: 3 / 3
- Blockers: 0
- RGB provenance categories: selected-source-color-transferred-weak-authority=2, selected-source-color-underpowered=1

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
- Tile refs: 14961
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 50458 / 921600 (5.475%)

### Coverage weight heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 14942
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 50386 / 921600 (5.467%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 14961
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 68010 / 921600 (7.380%)

### Transmittance heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 14970
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 62016 / 921600 (6.729%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 14952
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
- Changed pixels: 73419 / 921600 (7.966%)

### Visual gap final-color trace anchors

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=visual-gap-1%40520%2C388%3Aplate-covered-tile-local-missing%3Bvisual-gap-2%40784%2C384%3Aplate-covered-tile-local-missing%3Bvisual-gap-3%40608%2C368%3Aplate-covered-tile-local-missing
- Screenshot: `visual-gap-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14976
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 50497 / 921600 (5.479%)

### Operator-visible bad-pixel final-color trace anchors

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=operator-bad-pixel-1%40537%2C399%3Aoperator-visible-bright-outlier%3Boperator-bad-pixel-2%40521%2C387%3Aoperator-visible-dark-fallthrough%3Boperator-bad-pixel-3%40765%2C396%3Aoperator-visible-bright-outlier
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14937
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 51142 / 921600 (5.549%)


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
