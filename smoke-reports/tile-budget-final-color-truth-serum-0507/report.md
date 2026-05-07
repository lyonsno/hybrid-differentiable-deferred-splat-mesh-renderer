# Tile Budget Sweep Report

- Status: BLOCKED
- Generated: 2026-05-07T23:40:59.416Z
- Base URL: http://127.0.0.1:63945/
- Analysis JSON: `analysis.json`

## Metric Schema

- schemaVersion: 1
- tileSizePx: query/runtime tile edge in CSS pixels
- maxRefsPerTile: per-tile retained contributor cap
- tileCount: tileColumns * tileRows
- projectedRefs: projected tile contributor refs before cap
- retainedRefs: retained refs after cap/policy
- droppedRefs: projectedRefs - retainedRefs when reported by diagnostics
- cappedTiles: tiles whose projected refs exceeded maxRefsPerTile
- buildTimeMs: CPU tile-local prepass build time
- renderTimeMs: GPU render pass duration when timestamp queries are available
- finalColor: separate final-color capture required before a candidate can become plausible
- visibleCompositedRefLimit: final-color compositor ref limit; lower than maxRefsPerTile rejects the candidate

## Candidates

### tile-6px-cap-32

- Status: baseline
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile size/cap: 6px / 32
- Tiles: 214x120 (25680)
- Refs: projected 3286010, retained 77221, dropped 3208789
- Capped tiles: 1937
- Build/render ms: 11789 / 0
- FPS: 0
- Final-color renderer label: tile-local-visible-gaussian-compositor
- Visible composited ref limit: 32

### tile-12px-cap-64

- Status: rejected
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile size/cap: 12px / 64
- Tiles: 107x60 (6420)
- Refs: projected 1091517, retained 35306, dropped 1056211
- Capped tiles: 441
- Build/render ms: 4472.3 / 0
- FPS: 0
- Final-color renderer label: tile-local-visible-gaussian-compositor
- Visible composited ref limit: 32

### tile-16px-cap-128

- Status: rejected
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile size/cap: 16px / 128
- Tiles: 80x45 (3600)
- Refs: projected 727348, retained 35746, dropped 691602
- Capped tiles: 219
- Build/render ms: 3158.5 / 0
- FPS: 0
- Final-color renderer label: tile-local-visible-gaussian-compositor
- Visible composited ref limit: 32

### tile-16px-cap-256

- Status: rejected
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile size/cap: 16px / 256
- Tiles: 80x45 (3600)
- Refs: projected 727348, retained 61643, dropped 665705
- Capped tiles: 190
- Build/render ms: 4700.3 / 0
- FPS: 0
- Final-color renderer label: tile-local-visible-gaussian-compositor
- Visible composited ref limit: 32

### tile-24px-cap-256

- Status: rejected
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile size/cap: 24px / 256
- Tiles: 54x30 (1620)
- Refs: projected 450640, retained 29466, dropped 421174
- Capped tiles: 90
- Build/render ms: 2629.2 / 0
- FPS: 0
- Final-color renderer label: tile-local-visible-gaussian-compositor
- Visible composited ref limit: 32

### tile-32px-cap-512

- Status: rejected
- Renderer label: tile-local-visible-debug-tile-ref-count
- Tile size/cap: 32px / 512
- Tiles: 40x23 (920)
- Refs: projected 329000, retained 30640, dropped 298360
- Capped tiles: 47
- Build/render ms: 3407.9 / 0
- FPS: 0
- Final-color renderer label: tile-local-visible-gaussian-compositor
- Visible composited ref limit: 32


## Findings

- visible-compositor-cap-mismatch: tile-12px-cap-64 reports cap 64 but final-color compositor consumes only 32 refs per tile.
- visible-compositor-cap-mismatch: tile-16px-cap-128 reports cap 128 but final-color compositor consumes only 32 refs per tile.
- visible-compositor-cap-mismatch: tile-16px-cap-256 reports cap 256 but final-color compositor consumes only 32 refs per tile.
- visible-compositor-cap-mismatch: tile-24px-cap-256 reports cap 256 but final-color compositor consumes only 32 refs per tile.
- visible-compositor-cap-mismatch: tile-32px-cap-512 reports cap 512 but final-color compositor consumes only 32 refs per tile.

## Provisional Recommendation

- Status: underdetermined
- Candidate IDs: none
- Boundary: final-color evidence required; default declaration still waits for human witness and G-buffer alignment lanes.
- Text: No larger tile/cap pair cleared both budget metrics and final-color acceptance; visual witness input is still required before any default change.

## Summary

BLOCKED: tile-12px-cap-64 reports cap 64 but final-color compositor consumes only 32 refs per tile.
