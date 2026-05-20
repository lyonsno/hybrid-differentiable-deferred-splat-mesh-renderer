# Static Dessert Witness Report

- Status: FAIL
- Generated: 2026-05-20T07:07:25.809Z
- Base URL: http://127.0.0.1:5188/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&traceAnchors=fresh-a@1918,780:lacunar-hole;fresh-b@2166,908:lacunar-hole;fresh-c@1734,1044:lacunar-hole;fresh-d@1514,1324:lacunar-hole;fresh-e@1422,1324:lacunar-hole;fresh-f@2134,988:lacunar-hole
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Judge fixed dessert final-color and debug evidence for renderer-fidelity movement.
- Expected visual delta: fixed-view final-color should move only in the branch's claimed visual direction
- Evidence surface: static dessert witness report, analysis.json, final-color capture, and debug captures


## Fixed View

- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Viewport: 3456x1916
- Tile grid: not reported
- Total tile refs: 0
- Max tile refs per tile: 0
- Projected tile refs before cap: 0
- Retained tile refs after cap: 0
- Evicted tile refs by cap: 0
- Capped tiles: 0
- Saturated retained tiles: 0
- Max projected refs per tile: 0
- Header accounting matches retained refs: true
- Retention audit full frame: current 0 refs vs legacy 0; policy added 0, dropped 0
- Porous body retention audit: projected 0, current 0, legacy 0; capped tiles 0; policy added 0, dropped 0
- Center leak band retention audit: projected 0, current 0, legacy 0; policy added 0, dropped 0
- Plate renderer label: plate
- Tile-local renderer label: not reported
- Plate/tile-local same asset: false
- Plate/tile-local same viewport: false
- Plate changed pixels: 0.318%
- Tile-local changed pixels: 0.000%
- Tile-local/plate changed-pixel ratio: 0 (max 2)
- Rim crop source centers: 0
- Rim crop projected support splats: 0
- Rim crop near-floor minor splats: 0
- Rim crop source sample IDs: none
- Porous body source centers: 0
- Porous body projected support splats: 0
- Porous body near-floor minor splats: 0
- Porous body source sample IDs: none
- Estimated max accumulated alpha: 0
- Estimated min transmittance: 0
- Max conic major radius px: 0
- Min conic minor radius px: 0
- Max conic anisotropy: 0

## Captures

### Plate baseline final color

- URL: http://127.0.0.1:5188/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&traceAnchors=fresh-a%401918%2C780%3Alacunar-hole%3Bfresh-b%402166%2C908%3Alacunar-hole%3Bfresh-c%401734%2C1044%3Alacunar-hole%3Bfresh-d%401514%2C1324%3Alacunar-hole%3Bfresh-e%401422%2C1324%3Alacunar-hole%3Bfresh-f%402134%2C988%3Alacunar-hole
- Screenshot: `plate-final-color.png`
- Renderer label: plate
- Tile refs: 0
- Debug mode: final-color
- Nonblank: true
- Changed pixels: 21035 / 6621696 (0.318%)

### Final color tile-local visible compositor

- URL: http://127.0.0.1:5188/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&traceAnchors=fresh-a%401918%2C780%3Alacunar-hole%3Bfresh-b%402166%2C908%3Alacunar-hole%3Bfresh-c%401734%2C1044%3Alacunar-hole%3Bfresh-d%401514%2C1324%3Alacunar-hole%3Bfresh-e%401422%2C1324%3Alacunar-hole%3Bfresh-f%402134%2C988%3Alacunar-hole
- Screenshot: not captured
- Renderer label: not reported
- Tile refs: 0
- Debug mode: final-color
- Nonblank: false
- Changed pixels: 0 / 0 (0.000%)

### Coverage weight heatmap

- URL: http://127.0.0.1:5188/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&traceAnchors=fresh-a%401918%2C780%3Alacunar-hole%3Bfresh-b%402166%2C908%3Alacunar-hole%3Bfresh-c%401734%2C1044%3Alacunar-hole%3Bfresh-d%401514%2C1324%3Alacunar-hole%3Bfresh-e%401422%2C1324%3Alacunar-hole%3Bfresh-f%402134%2C988%3Alacunar-hole&tileDebug=coverage-weight
- Screenshot: not captured
- Renderer label: not reported
- Tile refs: 0
- Debug mode: final-color
- Nonblank: false
- Changed pixels: 0 / 0 (0.000%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:5188/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&traceAnchors=fresh-a%401918%2C780%3Alacunar-hole%3Bfresh-b%402166%2C908%3Alacunar-hole%3Bfresh-c%401734%2C1044%3Alacunar-hole%3Bfresh-d%401514%2C1324%3Alacunar-hole%3Bfresh-e%401422%2C1324%3Alacunar-hole%3Bfresh-f%402134%2C988%3Alacunar-hole&tileDebug=accumulated-alpha
- Screenshot: not captured
- Renderer label: not reported
- Tile refs: 0
- Debug mode: final-color
- Nonblank: false
- Changed pixels: 0 / 0 (0.000%)

### Transmittance heatmap

- URL: http://127.0.0.1:5188/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&traceAnchors=fresh-a%401918%2C780%3Alacunar-hole%3Bfresh-b%402166%2C908%3Alacunar-hole%3Bfresh-c%401734%2C1044%3Alacunar-hole%3Bfresh-d%401514%2C1324%3Alacunar-hole%3Bfresh-e%401422%2C1324%3Alacunar-hole%3Bfresh-f%402134%2C988%3Alacunar-hole&tileDebug=transmittance
- Screenshot: not captured
- Renderer label: not reported
- Tile refs: 0
- Debug mode: final-color
- Nonblank: false
- Changed pixels: 0 / 0 (0.000%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:5188/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&traceAnchors=fresh-a%401918%2C780%3Alacunar-hole%3Bfresh-b%402166%2C908%3Alacunar-hole%3Bfresh-c%401734%2C1044%3Alacunar-hole%3Bfresh-d%401514%2C1324%3Alacunar-hole%3Bfresh-e%401422%2C1324%3Alacunar-hole%3Bfresh-f%402134%2C988%3Alacunar-hole&tileDebug=tile-ref-count
- Screenshot: not captured
- Renderer label: not reported
- Tile refs: 0
- Debug mode: final-color
- Nonblank: false
- Changed pixels: 0 / 0 (0.000%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:5188/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible&traceAnchors=fresh-a%401918%2C780%3Alacunar-hole%3Bfresh-b%402166%2C908%3Alacunar-hole%3Bfresh-c%401734%2C1044%3Alacunar-hole%3Bfresh-d%401514%2C1324%3Alacunar-hole%3Bfresh-e%401422%2C1324%3Alacunar-hole%3Bfresh-f%402134%2C988%3Alacunar-hole&tileDebug=conic-shape
- Screenshot: not captured
- Renderer label: not reported
- Tile refs: 0
- Debug mode: final-color
- Nonblank: false
- Changed pixels: 0 / 0 (0.000%)


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

- capture-smoke-failed: final-color did not pass visual smoke classification.
- missing-real-splat-evidence: final-color did not report real Scaniverse splat evidence.
- capture-smoke-failed: coverage-weight did not pass visual smoke classification.
- missing-real-splat-evidence: coverage-weight did not report real Scaniverse splat evidence.
- capture-smoke-failed: accumulated-alpha did not pass visual smoke classification.
- missing-real-splat-evidence: accumulated-alpha did not report real Scaniverse splat evidence.
- capture-smoke-failed: transmittance did not pass visual smoke classification.
- missing-real-splat-evidence: transmittance did not report real Scaniverse splat evidence.
- capture-smoke-failed: tile-ref-count did not pass visual smoke classification.
- missing-real-splat-evidence: tile-ref-count did not report real Scaniverse splat evidence.
- capture-smoke-failed: conic-shape did not pass visual smoke classification.
- missing-real-splat-evidence: conic-shape did not report real Scaniverse splat evidence.
- final-color-label-mismatch: Final-color capture reported renderer label missing.
- debug-label-mismatch: coverage-weight reported renderer label missing instead of tile-local-visible-debug-coverage-weight.
- missing-tile-refs: coverage-weight did not report positive retained tile refs.
- missing-compact-diagnostics: coverage-weight did not expose compact tile-local diagnostics.
- debug-label-mismatch: accumulated-alpha reported renderer label missing instead of tile-local-visible-debug-accumulated-alpha.
- missing-tile-refs: accumulated-alpha did not report positive retained tile refs.
- missing-compact-diagnostics: accumulated-alpha did not expose compact tile-local diagnostics.
- debug-label-mismatch: transmittance reported renderer label missing instead of tile-local-visible-debug-transmittance.
- missing-tile-refs: transmittance did not report positive retained tile refs.
- missing-compact-diagnostics: transmittance did not expose compact tile-local diagnostics.
- debug-label-mismatch: tile-ref-count reported renderer label missing instead of tile-local-visible-debug-tile-ref-count.
- missing-tile-refs: tile-ref-count did not report positive retained tile refs.
- missing-compact-diagnostics: tile-ref-count did not expose compact tile-local diagnostics.
- debug-label-mismatch: conic-shape reported renderer label missing instead of tile-local-visible-debug-conic-shape.
- missing-tile-refs: conic-shape did not report positive retained tile refs.
- missing-compact-diagnostics: conic-shape did not expose compact tile-local diagnostics.
- viewport-mismatch: Static witness captures reported 2 viewport sizes.
- tile-grid-mismatch: Static witness captures reported no tile grids.
- missing-alpha-range: Accumulated-alpha capture did not report positive accumulated alpha.
- missing-transmittance-range: Transmittance capture did not report remaining transmittance.
- missing-ref-density: Tile-ref capture did not report total refs and max refs per tile.
- missing-conic-shape: Conic-shape capture did not report major/minor conic shape evidence.
- missing-rim-source-support: Static dessert witness did not report crop-local rim source support.
- missing-porous-body-source-support: Static dessert witness did not report crop-local porous body source support.

## Summary

FAIL: final-color did not pass visual smoke classification.
