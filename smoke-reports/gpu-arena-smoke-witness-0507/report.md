# Tile-Local Visual/Perf Smoke Report

- Status: PASS
- Generated: 2026-05-07T23:42:10.370Z
- Base URL: http://127.0.0.1:64191/
- Analysis JSON: `analysis.json`

## Captures

### Plate baseline

- URL: http://127.0.0.1:64191/
- Screenshot: `plate.png`
- Renderer label: plate
- FPS: 0
- Tile refs: 0
- Real splat evidence: true
- Nonblank: true
- Changed pixels: 31402 / 921600 (3.407%)
- Bridge block ratio: 14.167%

### Plate with silent tile-local prepass

- URL: http://127.0.0.1:64191/?renderer=tile-local
- Screenshot: `tile-local-prepass.png`
- Renderer label: plate+tile-local-prepass
- FPS: 0
- Tile refs: 77221
- Real splat evidence: true
- Nonblank: true
- Changed pixels: 31402 / 921600 (3.407%)
- Bridge block ratio: 14.167%

### Visible tile-local compositor

- URL: http://127.0.0.1:64191/?renderer=tile-local-visible
- Screenshot: `tile-local-visible.png`
- Renderer label: tile-local-visible-gaussian-compositor
- FPS: 0
- Tile refs: 77221
- Real splat evidence: true
- Nonblank: true
- Changed pixels: 39051 / 921600 (4.237%)
- Bridge block ratio: 1.299%


## Comparison

- Plate FPS: 0
- Silent prepass FPS: 0 (n/a x plate)
- Visible tile-local FPS: 0 (n/a x plate)
- Prepass tile refs: 77221
- Visible tile refs: 77221
- Arena backend: gpu-unavailable
- CPU build duration ms: 11748
- GPU dispatch duration ms: gpu-unavailable
- Plate presentation state: not-applicable
- Silent prepass presentation state: current
- Visible presentation state: current
- Artifact movement: moved (Visible capture diverged from plate by 0.01 changed-pixel ratio.)

## Findings

- None

## Summary

PASS: plate, silent prepass, and visible tile-local compositor evidence are distinguishable without performance collapse.
