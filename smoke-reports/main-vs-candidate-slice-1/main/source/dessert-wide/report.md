# Static Dessert Witness Report

- Status: PASS
- Generated: 2026-05-15T07:35:36.108Z
- Base URL: http://127.0.0.1:53549/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Analysis JSON: `analysis.json`

## Fixed View

- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Viewport: 1280x720
- Tile grid: 214x120
- Total tile refs: 77221
- Max tile refs per tile: 32
- Projected tile refs before cap: 3286010
- Retained tile refs after cap: 77221
- Evicted tile refs by cap: 3208789
- Capped tiles: 1937
- Saturated retained tiles: 1952
- Max projected refs per tile: 7231
- Header accounting matches retained refs: true
- Retention audit full frame: current 77221 refs vs legacy 77221; policy added 9363, dropped 9363
- Porous body retention audit: projected 1569835, current 27057, legacy 27057; capped tiles 791; policy added 2713, dropped 2713
- Center leak band retention audit: projected 3131729, current 44335, legacy 44335; policy added 6991, dropped 6991
- Plate renderer label: plate
- Tile-local renderer label: tile-local-visible-gaussian-compositor
- Plate/tile-local same asset: true
- Plate/tile-local same viewport: true
- Plate changed pixels: 3.407%
- Tile-local changed pixels: 1.856%
- Tile-local/plate changed-pixel ratio: 0.5446786828864404 (max 2)
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
- Max conic major radius px: 57.208888
- Min conic minor radius px: 1.5
- Max conic anisotropy: 19.643924

## Captures

### Plate baseline final color

- URL: http://127.0.0.1:53549/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Screenshot: `plate-final-color.png`
- Renderer label: plate
- Tile refs: 0
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 31402 / 921600 (3.407%)

### Final color tile-local visible compositor

- URL: http://127.0.0.1:53549/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible
- Screenshot: `final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 77221
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 17104 / 921600 (1.856%)

### Coverage weight heatmap

- URL: http://127.0.0.1:53549/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 77221
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 27300 / 921600 (2.962%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:53549/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 77221
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 26374 / 921600 (2.862%)

### Transmittance heatmap

- URL: http://127.0.0.1:53549/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 77221
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 22320 / 921600 (2.422%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:53549/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 77221
- Debug mode: tile-ref-count
- Nonblank: true
- Changed pixels: 615914 / 921600 (66.831%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:53549/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=conic-shape
- Screenshot: `conic-shape.png`
- Renderer label: tile-local-visible-debug-conic-shape
- Tile refs: 77221
- Debug mode: conic-shape
- Nonblank: true
- Changed pixels: 50760 / 921600 (5.508%)


## Observation Boundaries

### Visible holes

- Status: captured-for-review
- Evidence IDs: final-color, coverage-weight, conic-shape
- Boundary: Porous/non-square final-color gaps are witnessed separately from tile-ref density and alpha transfer.

### Plate seepage

- Status: captured-for-review
- Evidence IDs: final-color, accumulated-alpha, transmittance
- Boundary: Plate/background seepage is witnessed through final color plus alpha/transmittance debug modes, not by opacity tuning.

### High-viewport budget skip

- Status: separate-high-viewport-observation
- Boundary: High-viewport stale/cached-frame skips are not collapsed into the fixed 1280x720 final-color artifact.
- Repro: Run the same smoke URL at a high viewport such as 3456x1916 and capture overlay text containing `tile-local skipped: projected tile refs exceed budget`.

## Findings

- None

## Summary

PASS: static dessert final color and debug witnesses share one asset, viewport, and tile grid.
