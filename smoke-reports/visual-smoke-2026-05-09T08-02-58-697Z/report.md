# Tile-Local Diagnostic Heatmap Report

- Status: PASS
- Generated: 2026-05-09T08:02:58.698Z
- Base URL: http://127.0.0.1:61622/?renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu
- Analysis JSON: `analysis.json`

## Captures

### Coverage weight heatmap

- URL: http://127.0.0.1:61622/?renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&tileDebug=coverage-weight
- Screenshot: `coverage-weight.png`
- Renderer label: tile-local-visible-debug-coverage-weight
- Tile refs: 94406
- Debug mode: coverage-weight
- Nonblank: true
- Changed pixels: 159546 / 6234624 (2.559%)

### Accumulated alpha heatmap

- URL: http://127.0.0.1:61622/?renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&tileDebug=accumulated-alpha
- Screenshot: `accumulated-alpha.png`
- Renderer label: tile-local-visible-debug-accumulated-alpha
- Tile refs: 94406
- Debug mode: accumulated-alpha
- Nonblank: true
- Changed pixels: 158629 / 6234624 (2.544%)

### Transmittance heatmap

- URL: http://127.0.0.1:61622/?renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&tileDebug=transmittance
- Screenshot: `transmittance.png`
- Renderer label: tile-local-visible-debug-transmittance
- Tile refs: 94406
- Debug mode: transmittance
- Nonblank: true
- Changed pixels: 158629 / 6234624 (2.544%)

### Tile-ref density heatmap

- URL: http://127.0.0.1:61622/?renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&tileDebug=tile-ref-count
- Screenshot: `tile-ref-count.png`
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile refs: 94406
- Debug mode: tile-ref-count
- Nonblank: true
- Changed pixels: 155136 / 6234624 (2.488%)

### Conic major/minor shape heatmap

- URL: http://127.0.0.1:61622/?renderer=tile-local-visible&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&tileDebug=conic-shape
- Screenshot: `conic-shape.png`
- Renderer label: tile-local-visible-debug-conic-shape
- Tile refs: 94406
- Debug mode: conic-shape
- Nonblank: true
- Changed pixels: 161280 / 6234624 (2.587%)


## Compact Diagnostics

- Required modes present: true
- Presentation status: current
- Total tile refs: 94406
- Max tile refs per tile: 256
- Projected arena refs: 94406
- Retained arena refs: 94406
- Dropped arena refs: 0
- Overflow reasons: none
- Tile-local CPU projected refs per tile: 0
- Tile-local CPU bridge build duration ms: 0
- Arena requested backend: gpu
- Arena effective backend: gpu
- Arena state: gpu-effective-with-cpu-bridge
- Arena CPU bridge build duration ms: 0
- Arena GPU dispatch enqueue duration ms: 0
- Unavailable reason: not reported
- Skipped reason: not reported
- GPU retained ref buffer bytes: 99975168
- GPU alpha param buffer bytes: 199950336
- Estimated max accumulated alpha: 1
- Estimated min transmittance: 0

## Findings

- None

## Summary

PASS: tile-local diagnostics expose alpha/transmittance and tile-ref density with compact evidence.
