# Static Dessert Witness Report

- Status: PASS
- Generated: 2026-05-01T18:00:20.467Z
- Base URL: http://127.0.0.1:60660/
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
- Estimated max accumulated alpha: 1
- Estimated min transmittance: 0
- Max conic major radius px: 57.208888
- Min conic minor radius px: 1.5
- Max conic anisotropy: 19.643924

## Captures

### Final color tile-local visible compositor

- URL: http://127.0.0.1:60660/?renderer=tile-local-visible
- Screenshot: `final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 77221
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 73999 / 921600 (8.029%)

### Coverage weight heatmap

- URL: http://127.0.0.1:60660/?renderer=tile-local-visible&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 77221
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 99110 / 921600 (10.754%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:60660/?renderer=tile-local-visible&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 77221
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 88176 / 921600 (9.568%)

### Transmittance heatmap

- URL: http://127.0.0.1:60660/?renderer=tile-local-visible&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 77221
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 88176 / 921600 (9.568%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:60660/?renderer=tile-local-visible&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 77221
- Debug mode: tile-ref-count
- Nonblank: true
- Changed pixels: 114336 / 921600 (12.406%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:60660/?renderer=tile-local-visible&tileDebug=conic-shape
- Screenshot: `conic-shape.png`
- Renderer label: tile-local-visible-debug-conic-shape
- Tile refs: 77221
- Debug mode: conic-shape
- Nonblank: true
- Changed pixels: 137196 / 921600 (14.887%)


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
