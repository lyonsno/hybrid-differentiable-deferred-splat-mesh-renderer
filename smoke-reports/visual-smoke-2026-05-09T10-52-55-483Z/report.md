# Static Dessert Witness Report

- Status: PASS
- Generated: 2026-05-09T10:52:55.484Z
- Base URL: http://127.0.0.1:61623/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu
- Analysis JSON: `analysis.json`

## Fixed View

- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Viewport: 3456x1804
- Tile grid: 216x113
- Total tile refs: 94406
- Max tile refs per tile: 256
- Projected tile refs before cap: 94406
- Retained tile refs after cap: 94406
- Evicted tile refs by cap: 0
- Capped tiles: 0
- Saturated retained tiles: 0
- Max projected refs per tile: 256
- Header accounting matches retained refs: true
- Retention audit full frame: current 0 refs vs legacy 0; policy added 0, dropped 0
- Porous body retention audit: projected 0, current 0, legacy 0; capped tiles 0; policy added 0, dropped 0
- Center leak band retention audit: projected 0, current 0, legacy 0; policy added 0, dropped 0
- Plate renderer label: plate
- Tile-local renderer label: tile-local-visible-gaussian-compositor
- Plate/tile-local same asset: true
- Plate/tile-local same viewport: true
- Plate changed pixels: 25.289%
- Tile-local changed pixels: 13.550%
- Tile-local/plate changed-pixel ratio: 0.5358241699695367 (max 2)
- Rim crop source centers: 5735
- Rim crop projected support splats: 7391
- Rim crop near-floor minor splats: 422
- Rim crop source sample IDs: 534, 535, 552, 554, 562, 569, 570, 574, 575, 579, 580, 581
- Porous body source centers: 1416
- Porous body projected support splats: 2332
- Porous body near-floor minor splats: 85
- Porous body source sample IDs: 734, 735, 739, 740, 741, 742, 753, 754, 764, 767, 772, 773
- Estimated max accumulated alpha: 1
- Estimated min transmittance: 0
- Max conic major radius px: 1
- Min conic minor radius px: 1
- Max conic anisotropy: 1

## Captures

### Plate baseline final color

- URL: http://127.0.0.1:61623/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu
- Screenshot: `plate-final-color.png`
- Renderer label: plate
- Tile refs: 0
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 1576659 / 6234624 (25.289%)

### Final color tile-local visible compositor

- URL: http://127.0.0.1:61623/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible
- Screenshot: `final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 94406
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 844812 / 6234624 (13.550%)

### Coverage weight heatmap

- URL: http://127.0.0.1:61623/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 94406
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 913280 / 6234624 (14.649%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:61623/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 94406
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 904732 / 6234624 (14.511%)

### Transmittance heatmap

- URL: http://127.0.0.1:61623/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 94406
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 893246 / 6234624 (14.327%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:61623/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 94406
- Debug mode: tile-ref-count
- Nonblank: true
- Changed pixels: 4286128 / 6234624 (68.747%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:61623/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&tileDebug=conic-shape
- Screenshot: `conic-shape.png`
- Renderer label: tile-local-visible-debug-conic-shape
- Tile refs: 94406
- Debug mode: conic-shape
- Nonblank: true
- Changed pixels: 911387 / 6234624 (14.618%)


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
