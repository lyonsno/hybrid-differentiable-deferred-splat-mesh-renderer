# Static Dessert Witness Report

- Status: FAIL
- Generated: 2026-06-15T02:12:46.605Z
- Base URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Operator smoke URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Analysis JSON: local-only `analysis.json` (not committed; this report carries the durable classification metrics)

## Smoke Handoff

- Smoke kind: visual
- Decision requested: review finding disposition for selected-anchor support color guard
- Expected visual delta: no visual closure expected; clear-bootstrap guard should preserve existing diagnostic classification while avoiding support-only clear color authority
- Evidence surface: static dessert witness report and committed PNG captures


## Fixed View

- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Viewport: 1280x720
- Tile grid: 80x45
- Total tile refs: 14946
- Max tile refs per tile: 64
- Projected tile refs before cap: 714772
- Retained tile refs after cap: 14946
- Evicted tile refs by cap: 699826
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
- Tile-local changed pixels: 5.517%
- Tile-local/plate changed-pixel ratio: 1.61919622953952 (max 2)
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
- Trace changed pixels: 5.458%

- visual-gap-1@588,368: present; score 229.5; plate delta 194.333; tile-local delta 41.333; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 0.999586871532; remaining T 0.000413128468; foreground 48; foreground alpha 0.999587
- visual-gap-2@784,384: present; score 168; plate delta 137.667; tile-local delta 25.667; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 0.902621608982; remaining T 0.097378391018; foreground 48; foreground alpha 0.902622
- visual-gap-3@656,308: present; score 118.5; plate delta 115.667; tile-local delta 36.667; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 62; alpha 0.998930429469; remaining T 0.001069570531; foreground 48; foreground alpha 0.99893

## Operator-Visible Bad Pixel Trace

- Status: present
- Capture: operator-visible-bad-pixel-trace
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Derived anchor count: 3
- Trace changed pixels: 5.543%
- Trace/canvas parity: trace-canvas-match
- Trace/canvas parity source: live-compositor-input-readback
- Trace/canvas parity mismatches: 0; missing anchors: none; max delta: 0
- Trace model/live parity: match; mismatches: none; max delta: 0

- operator-bad-pixel-1@569,407 (operator-visible-bright-outlier): present; score 361.302; plate luma 47.878; final luma 206.179; output luma 179.348; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 63; alpha 1; remaining T 0; foreground 48; foreground alpha 1; rgb provenance selected-source-color-transferred-still-mismatched (source luma 255, contribution luma 93.71, color/alpha transfer 0.278); parity match delta 0; predicted [201,176,151,255]; sampled [201,176,151,255]; cpu-trace [201,176,151,255]; live [201,176,151,255]; model/live match delta 0
- operator-bad-pixel-2@589,368 (operator-visible-dark-fallthrough): present; score 359.314; plate luma 210.636; final luma 46.321; output luma 96.212; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 0.999999541473; remaining T 4.58527e-7; foreground 48; foreground alpha 1; rgb provenance selected-source-color-underpowered (source luma 254.79, contribution luma 37.529, color/alpha transfer 0.288); parity match delta 1; predicted [131,90,54,255]; sampled [130,90,54,255]; cpu-trace [131,90,54,255]; live [131,90,54,255]; model/live match delta 0
- operator-bad-pixel-3@765,408 (operator-visible-bright-outlier): present; score 330.335; plate luma 46.031; final luma 189.617; output luma 163.935; ordered-present/retained-foreground-identity-survives-to-final-accumulation; steps 64; alpha 1; remaining T 0; foreground 48; foreground alpha 1; rgb provenance selected-source-color-underpowered (source luma 255, contribution luma 51.94, color/alpha transfer 0.291); parity match delta 0; predicted [177,161,151,255]; sampled [177,161,151,255]; cpu-trace [177,161,151,255]; live [177,161,151,255]; model/live match delta 0

## Operator-Visible Bad Pixel Classification

- Status: classified
- Category: selected-anchor-post-alpha-color-mismatch
- Stage: selected-anchor-color-transfer
- Source route: wgsl-projected-ref-stream-source-frontier
- Classified anchors: 3 / 3
- Blockers: 0
- RGB provenance categories: selected-source-color-transferred-still-mismatched=1, selected-source-color-underpowered=2

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
- Tile refs: 14945
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 50846 / 921600 (5.517%)

### Coverage weight heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 14960
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 50457 / 921600 (5.475%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 14965
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 68218 / 921600 (7.402%)

### Transmittance heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 14973
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 61921 / 921600 (6.719%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 14946
- Debug mode: tile-ref-count
- Nonblank: true
- Changed pixels: 608969 / 921600 (66.077%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=conic-shape
- Screenshot: `conic-shape.png`
- Renderer label: tile-local-visible-debug-conic-shape
- Tile refs: 14960
- Debug mode: conic-shape
- Nonblank: true
- Changed pixels: 74411 / 921600 (8.074%)

### Visual gap final-color trace anchors

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=visual-gap-1%40588%2C368%3Aplate-covered-tile-local-missing%3Bvisual-gap-2%40784%2C384%3Aplate-covered-tile-local-missing%3Bvisual-gap-3%40656%2C308%3Aplate-covered-tile-local-missing
- Screenshot: `visual-gap-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14946
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 50297 / 921600 (5.458%)

### Operator-visible bad-pixel final-color trace anchors

- URL: http://127.0.0.1:64114/?renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&traceAnchors=operator-bad-pixel-1%40569%2C407%3Aoperator-visible-bright-outlier%3Boperator-bad-pixel-2%40589%2C368%3Aoperator-visible-dark-fallthrough%3Boperator-bad-pixel-3%40765%2C408%3Aoperator-visible-bright-outlier
- Screenshot: `operator-visible-bad-pixel-trace.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 14975
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 51082 / 921600 (5.543%)


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
