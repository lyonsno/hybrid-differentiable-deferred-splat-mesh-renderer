# Tile-ref retention policy

Status: bounded production retention repair for packet `metadosis/coordination-packets/meshsplat-tile-ref-cap-pressure-retention_2026-05-01.md`, implemented from renderer base `origin/cc/double-attenuated-conic-seepage-integration-0501@ef3e64b`.

## Contract

The tile-local CPU bridge still exposes at most `maxRefsPerTile` refs per tile and still stops at the existing projected-ref budget. Dense tiles remain coverage-first for the main slice, then use a small bounded reserve slice for refs that would otherwise be dropped by the cap.

The reserve slice has two independent admission channels:

- visual energy: `coverageWeight * opacity * luminance`, for bright or reflective behind-surface contributors that are visually visible even with low tile-integrated coverage;
- occlusion density: opacity-first foreground evidence, backed by `coverageWeight * opacity`, for dark or low-luminance contributors that are visually necessary because they block behind-surface color.

The policy changes only which already-projected refs survive per-tile truncation. It does not raise the per-tile cap, raise the projected-ref budget, change alpha transfer, tune global opacity or brightness, change conic production math, change source decoding, change camera controls, change SH/view-dependent color, or port tile-list construction to GPU.

## Diagnostics

Existing `tileRefCustody` fields remain the cap-pressure accounting surface:

- `projectedTileEntryCount`
- `retainedTileEntryCount`
- `evictedTileEntryCount`
- `cappedTileCount`
- `saturatedRetainedTileCount`
- `maxProjectedRefsPerTile`
- `maxRetainedRefsPerTile`
- `headerRefCount`
- `headerAccountingMatches`

The repair preserves the diagnostic meaning of those fields. A retained ref still carries its original coverage weight; retention scoring only affects admission before the cap.

## Verification

- Fail-first: `node --test tests/renderer/tileListBridge.test.mjs` failed because the previous visual-energy-only reserve kept a bright behind ref while dropping a dark alpha-occluding foreground ref.
- Focused fixed: `node --test tests/renderer/tileListBridge.test.mjs tests/renderer/tileLocalPrepassBridge.test.mjs`
