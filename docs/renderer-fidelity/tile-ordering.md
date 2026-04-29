# Tile Ordering: Per-Tile Radix and Bucket Contract

Packet: `metadosis/coordination-packets/meshsplat-tile-coverage-compositor_2026-04-29.md`

Lane: `tile-ordering`

Status: contract and probe only. No production renderer, shader, coverage, alpha-transfer, GPU skeleton, SH payload, or center-tile bridge behavior is changed here.

## Finding

The mature tile compositor should consume a back-to-front list per tile, not a single global draw stream. A global radix order can still be useful as a staging or diagnostic primitive, but once a splat contributes to multiple tiles, the compositor needs tile-local offsets or lists so every tile can replay only its own contributing splats in stable depth order.

Chosen next shape: `per-tile-radix-lists`.

This lane does not settle the coverage data layout. It assumes a provisional contribution record with `tileId`, `splatId`, `viewDepth`, and a stable tie id after the coverage-builder lane has decided which tiles each splat contributes to. It also does not define alpha transfer. It only states the order in which the tile-local compositor consumes whatever alpha-transfer says should be composited.

## Executable Probe

Probe: `src/rendererFidelityProbes/tileOrdering.js`

Tests: `tests/renderer/tileOrdering.test.mjs`

The probe pins four ordering invariants:

- `createGlobalRadixStagingOrder` sorts contribution records back-to-front for diagnostic/staging purposes, while preserving repeated splat contributions across tiles.
- `buildPerTileOrdering` groups those records by `tileId` and emits one stable draw list per tile.
- Equal-depth ties remain stable by splat id inside each tile, matching the existing first-smoke CPU and GPU sort witness contract.
- `classifyBucketApproximation` treats depth buckets as a bounded approximation only when the maximum bucket width stays below an alpha-visible crossing tolerance.

## Contract

The next production tile compositor slice should carry ordering as either:

1. Per-tile radix lists sorted by quantized view depth plus stable splat tie id, or
2. A global radix staging buffer plus tile-local ranges/compaction output that is observationally equivalent to per-tile lists before compositing.

The compositor consumes tile-local back-to-front contribution lists. A global sorted stream by itself is insufficient unless there is a separate tile-local indirection layer. Depth buckets are not the target shape; they are lawful only as an explicitly bounded approximation with tests that name the maximum order error.

Each orderable contribution must carry:

- `tileId`: the tile consuming the contribution.
- `splatId`: the stable original splat id or a stable payload index tied back to it.
- `viewDepth`: the depth key in the active view convention.
- `stableTieId`: the deterministic tie breaker, normally the original splat id.

Coverage weights may travel beside the ordering key, but this lane does not define how coverage weights are computed. Alpha/optical-depth policy may consume the ordered list, but this lane does not define the alpha transfer.

## Acceptable Errors

Exact per-tile radix order is required for synthetic crossing or translucent layers when the depth separation is visible under the alpha-transfer contract.

Bucketed order is acceptable only when all of these are true:

- The bucket width is below the chosen alpha-visible crossing tolerance.
- The renderer reports the bucket width as `maxOrderError`.
- Synthetic crossing cases are classified as `bounded-approximation`, not as exact correctness.
- The steward and alpha-transfer lane can decide the visual error is acceptable for the targeted slice.

Bucketed order is an ordering blocker when one bucket can contain alpha-visible crossings. In that case, alpha tuning must not be used to hide the order error.

## Sibling Boundaries

Consumed sibling contracts:

- `tile-coverage-builder`: contributes the eventual tile-list data shape and coverage weights.
- `alpha-transfer`: defines how ordered contributions become transmission/color.

Forbidden claims:

- Coverage truth cases and projected Gaussian geometry.
- Alpha transfer, normalization, optical-depth policy, or dense-sheet behavior.
- GPU skeleton buffer/pipeline ownership.
- Live renderer integration or replacement of the current sort backend without steward amendment.
- SH payload/rendering or center-tile bridge tuning.

## Build-Ready Direction

The steward can safely treat `per-tile-radix-lists` as the next ordering target. If implementation pressure favors reuse of the existing global GPU bitonic/radix prototype, that global pass should be treated as staging. The observable handoff to the compositor still needs per-tile sorted contribution ranges or compacted lists before alpha compositing.
