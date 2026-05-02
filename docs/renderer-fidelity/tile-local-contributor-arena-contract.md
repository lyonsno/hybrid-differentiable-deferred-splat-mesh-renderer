# Tile-local contributor arena contract

Packet: `metadosis/coordination-packets/meshsplat-tile-local-contributor-arena_2026-05-01.md`

Lane: `contributor-record-contract`

Status: contract and typed probe only. This lane does not change production compositor shaders, CPU arena construction behavior, GPU builder behavior, global opacity/brightness, source asset decoding, camera controls, or SH/view-dependent color.

## Purpose

The current tile-local renderer still exposes a flat retained tile-ref list:

- `tileHeaders`: four `u32` values per tile, currently offset and retained count plus unused compatibility slots.
- `tileRefs`: four `u32` values per retained ref, currently splat index, original id, tile index, and retained ref index.
- `tileCoverageWeights`: one `f32` projected coverage value per retained ref.
- `tileRefShapeParams`: eight `f32` values per retained ref, currently center plus inverse-conic parameters.

That projection is useful for the smokeable visible compositor, but it is not the owner of the richer representation. The arena contract names the logical tile-local facts that CPU reference, visible compositor, diagnostics, and future GPU/deferred lanes may consume without redefining them.

Executable probe: `src/rendererFidelityProbes/tileLocalContributorContract.js`

Types: `src/rendererFidelityProbes/tileLocalContributorContract.d.ts`, `src/gpuTileCoverageBridge.d.ts`, and re-exported aliases from `src/tileLocalPrepassBridge.d.ts`.

## Tile Header

Each tile header has these logical fields:

| Field | Meaning |
| --- | --- |
| `contributorOffset` | Index of the first retained contributor record for this tile. |
| `retainedContributorCount` | Count available to the current consumer after retention. |
| `projectedContributorCount` | Count before tile-local retention and caps. |
| `droppedContributorCount` | Projected contributors not retained for this tile. |
| `overflowFlags` | Bitset of overflow/drop reasons observed while building the tile arena. |
| `maxRetainedViewRank` | Deepest retained back-to-front rank, so diagnostics can see whether behind-surface evidence survived. |
| `minRetainedDepth` | Nearest retained contributor depth in the active view convention. |
| `maxRetainedDepth` | Farthest retained contributor depth in the active view convention. |

The legacy `tileHeaders` buffer is only an offset/count projection of this header. Consumers must not infer that missing projected/dropped/depth fields are zero unless the arena header explicitly says so.

## Contributor Record

Each retained contributor record has these logical fields:

| Field | Use | Meaning |
| --- | --- | --- |
| `splatIndex` | shared-current-and-deferred | Dense source splat index used by current renderer buffers. |
| `originalId` | shared-current-and-deferred | Stable source-file identity for diagnostics and cross-path parity. |
| `tileIndex` | shared-current-and-deferred | Owning tile index. |
| `contributorIndex` | shared-current-and-deferred | Arena record index after retention, stable inside one built arena. |
| `viewRank` | shared-current-and-deferred | Back-to-front order rank. |
| `viewDepth` | shared-current-and-deferred | Depth evidence used to order or bucket records. |
| `depthBand` | shared-current-and-deferred | Quantized/normalized depth band for diagnostics and future voting. |
| `coverageWeight` | shared-current-and-deferred | Projected Gaussian support weight. This must not be normalized away before alpha or deferred voting. |
| `centerPx` | shared-current-and-deferred | Projected center in framebuffer pixels. |
| `inverseConic` | shared-current-and-deferred | Packed inverse conic A, B, C for Mahalanobis coverage evaluation. |
| `opacity` | shared-current-and-deferred | Activated source opacity before coverage transfer. |
| `coverageAlpha` | current-final-color-only | Current final-color coverage/opacity transfer result. |
| `transmittanceBefore` | current-final-color-only | Current final-color running transmission before this record. |
| `retentionWeight` | shared-current-and-deferred | Retention/admission score; diagnostic after construction. |
| `occlusionWeight` | shared-current-and-deferred | Foreground opacity pressure used by retention and diagnostics. |
| `deferredSurface` | future-deferred-surface-input | Future splat/mesh surface vote evidence. It is absent from the current final-color path. |

`sourceColor` is current-final-color-only even though it is not a required arena record field. Future deferred lanes should vote albedo/material/normal evidence through `deferredSurface` fields rather than treating baked final color as a PBR input.

## Overflow Semantics

Overflow is an observed fact, not a reason to hide the artifact by raising caps. The contract pins these reasons:

| Reason | Bit | Meaning |
| --- | ---: | --- |
| `none` | `0` | No contributors were dropped for this tile. |
| `perTileRetainedCap` | `1` | The tile had more projected contributors than the retained arena budget. |
| `globalProjectedBudget` | `2` | The frame-level projected-ref guard stopped arena construction. |
| `invalidProjection` | `4` | A source contributor could not be projected to a finite tile footprint. |
| `nearPlaneSupport` | `8` | A source contributor was rejected because support crosses the near plane. |
| `nonFiniteCoverage` | `16` | Coverage/conic math produced non-finite evidence. |

`projectedContributorCount - retainedContributorCount` must equal `droppedContributorCount` for a fully built tile. When a global projected budget prevents full construction, diagnostics may report an incomplete tile set, but they must carry `globalProjectedBudget` instead of pretending dropped counts are zero.

## Sibling Boundaries

- `cpu-arena-reference-builder` may construct records and compatibility projections, but must preserve these field names and overflow meanings.
- `visible-compositor-adapter` may consume `viewRank`, `coverageWeight`, `inverseConic`, `opacity`, `coverageAlpha`, and `transmittanceBefore` for current final-color compositing, but must not redefine the arena.
- `overflow-diagnostics-heat-guard` may add counters and reports for these fields, but must not suppress overflow/cap evidence to make a smoke look current.
- `gpu-arena-builder-skeleton` may create GPU buffer layouts that emit this contract, but must not make the incomplete GPU path the first correctness gate.
- Future deferred splat/mesh work consumes `deferredSurface`; it must not infer PBR material truth from current baked final color fields.

## Verification

- Fail-first: `node --test tests/renderer/tileLocalContributorContract.test.mjs` first failed because `src/rendererFidelityProbes/tileLocalContributorContract.js` was missing.
- Contract probe test: `node --test tests/renderer/tileLocalContributorContract.test.mjs`
