# Tile-Local Diagnostic Heatmap Report

- Status: PASS
- Generated: 2026-05-02T05:44:57.978Z
- Base URL: http://127.0.0.1:64302/
- Analysis JSON: `analysis.json`

## Captures

### Coverage weight heatmap

- URL: http://127.0.0.1:64302/?renderer=tile-local-visible&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 77221
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 99110 / 921600 (10.754%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:64302/?renderer=tile-local-visible&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 77221
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 98431 / 921600 (10.680%)

### Transmittance heatmap

- URL: http://127.0.0.1:64302/?renderer=tile-local-visible&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 77221
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 98431 / 921600 (10.680%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:64302/?renderer=tile-local-visible&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 77221
- Debug mode: tile-ref-count
- Nonblank: true
- Changed pixels: 114336 / 921600 (12.406%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:64302/?renderer=tile-local-visible&tileDebug=conic-shape
- Screenshot: `conic-shape.png`
- Renderer label: tile-local-visible-debug-conic-shape
- Tile refs: 77221
- Debug mode: conic-shape
- Nonblank: true
- Changed pixels: 137196 / 921600 (14.887%)


## Compact Diagnostics

- Required modes present: true
- Presentation status: current
- Total tile refs: 77221
- Max tile refs per tile: 32
- Projected arena refs: 3286010
- Retained arena refs: 77221
- Dropped arena refs: 3208789
- Overflow reasons: per-tile-ref-cap
- CPU projected refs per tile: 127.959891
- CPU build duration ms: 9314.7
- GPU retained ref buffer bytes: 1235536
- GPU alpha param buffer bytes: 3020992
- Estimated max accumulated alpha: 1
- Estimated min transmittance: 0

## Arena Construction Witness

- CPU backend: cpu-contributor-arena
- CPU status: current
- CPU projected/retained/dropped refs: 3286010/77221/3208789
- CPU build duration ms: 9314.7
- GPU backend: not-reported
- GPU status: not-available
- GPU dispatch duration ms: 0
- Comparison: gpu-unavailable
- Comparison summary: GPU arena construction was not reported; CPU fallback evidence remains current.

## Findings

- None

## Summary

PASS: tile-local diagnostics expose alpha/transmittance and tile-ref density with compact evidence.
