# Tile-ref custody evidence

Packet: `metadosis/coordination-packets/meshsplat-static-artifact-diagnostic-convergence_2026-05-01.md`

Lane: `tile-ref-custody`

Status: diagnostic evidence from renderer branch `cc/tile-ref-custody-porous-dessert-0501` after fast-forward to integrated `origin/cc/double-attenuated-conic-seepage-integration-0501@7e26c56`. This lane does not change conic projection math, alpha transfer policy, global opacity/brightness, source asset decoding, camera controls, or the CPU bridge into a GPU tile-list builder.

## Contract

Tile-local smoke must distinguish four states before anyone treats a static final-color artifact as a current compositor result:

- `projectedTileEntryCount`: all tile refs estimated before the per-tile cap.
- `retainedTileEntryCount`: refs actually written into the tile-ref buffer after retention/cap selection.
- `evictedTileEntryCount`: projected refs not retained because of the cap.
- `headerAccountingMatches`: whether tile header counts sum back to retained refs.

The same evidence also reports `cappedTileCount`, `saturatedRetainedTileCount`, `maxProjectedRefsPerTile`, and `maxRetainedRefsPerTile`. Stale/skipped presentation remains separate under runtime `tileLocal.freshness` and `tileLocal.budget`.

## Static Dessert Evidence

Command:

```sh
npm run smoke:visual:real -- --static-dessert-witness --out-dir /tmp/tile-ref-custody-static-dessert-witness --viewport 1280x720 --settle-ms 6000 --timeout-ms 45000
```

Result: PASS.

Fixed view:

| Field | Value |
| --- | ---: |
| Viewport | `1280x720` |
| Tile grid | `214x120` |
| Projected tile refs before cap | `3,286,010` |
| Retained tile refs after cap | `77,221` |
| Evicted tile refs by cap | `3,208,789` |
| Capped tiles | `1,937` |
| Saturated retained tiles | `1,952` |
| Max projected refs per tile | `7,231` |
| Max retained refs per tile | `32` |
| Header ref count | `77,221` |
| Header accounting matches retained refs | `true` |
| Freshness | `current` |
| Budget skip projected refs | `0` |

Interpretation:

- The fixed 1280x720 dessert witness is not a stale cached frame and not a skipped prepass frame: runtime freshness is `current`, `tileLocalLastSkipReason` is absent, and budget evidence reports `skippedProjectedRefs: 0`.
- Tile header/ref accounting is internally consistent: header counts sum to the retained ref count, so the current evidence does not point to a header/count mismatch.
- The static frame is heavily cap-evicted: roughly `97.65%` of projected tile refs are not retained before compositing. That makes per-tile cap eviction a live explanation to synthesize with conic and alpha evidence, not a mere performance footnote.
- This evidence does not prove every visible hole or plate seepage pixel is caused only by tile-ref eviction. It proves the fixed frame is current, under the global projected-ref budget, header-consistent, and massively cap-limited.

## Verification

- Fail-first bridge test initially failed because `bridge.tileRefCustody` was missing.
- `node --test tests/renderer/tileListBridge.test.mjs`
- `npm run test:renderer`
- `npm run test:smoke`
- `npm run build`
- Static dessert visual smoke command above.
