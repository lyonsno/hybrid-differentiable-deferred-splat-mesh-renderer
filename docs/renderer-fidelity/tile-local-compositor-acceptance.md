# Tile-Local Compositor Acceptance

Packet: `metadosis/coordination-packets/meshsplat-tile-local-gaussian-compositor_2026-04-30.md`

Lane: `reference-acceptance`

Status: synthetic acceptance contract and CPU reference probe only. This lane does not edit production renderer integration, WGSL, presenters, preprocessing, smoke assets, spherical harmonics, PBR relighting, mesh integration, or the final GPU tile ref-builder.

## Purpose

The first real tile-local Gaussian compositor is allowed to be ugly. It is not allowed to be fake. Acceptance starts when a tile-local visible mode can prove that it reads tile-local refs, ordered depths, raw coverage weights, activated opacity, and splat color, then accumulates them into image-like output.

The executable reference in `src/rendererFidelityProbes/tileLocalCompositor.js` pins the minimum observable behavior for that first slice:

- Dense overlap must use raw coverage weights as optical depth and suppress behind-surface contributions through source-over transfer.
- Equal-depth refs must resolve by stable tie id before accumulation.
- Sparse empty tiles must stay clear rather than inventing tile-block evidence.

## Bridge Diagnostic Boundary

The current visible bridge diagnostic is a buffer-visibility witness only. It is useful when proving that tile headers, refs, coverage weights, and alpha payloads reached the GPU path. It is not compositor acceptance.

Real compositor acceptance begins at ordered Gaussian alpha accumulation:

```text
tile-local refs -> stable back-to-front order -> coverageWeight as optical depth -> source-over color
```

The bridge diagnostic boundary is crossed only when output color is produced by splat payload color and opacity flowing through the ordered refs for the tile. Nearest-sampled tile blocks, per-tile header colors, ref-count heatmaps, and block witness colors are not acceptance evidence for the real compositor.

For empty tiles, block witness colors are not acceptance evidence. The reference compositor returns the clear color with alpha `0` and status `empty-tile-clear`; a sparse tile is not allowed to become a diagnostic patch just to prove the bridge buffer is alive.

## Required Synthetic Cases

### Dense Overlap

The dense-overlap case uses one bright behind layer and three nearer low-opacity surface layers. The surface layers carry coverage weight `10` each. Those weights are raw optical depth and must not be normalized before transfer.

Acceptance observations:

- Draw order remains back-to-front.
- Remaining transmission is less than `0.04`.
- The behind bright layer's visible transfer weight is less than `0.05`.
- The normalization policy remains `coverage-is-optical-depth-do-not-normalize`.

This case separates real accumulation from a bridge diagnostic because the output must be a weighted color result from multiple splat payloads, not a tile-block witness color.

### Equal-Depth Stable Tie

The equal-depth case gives three refs the same view depth and distinct stable tie ids. The reference order is stable tie id ascending after depth quantization.

Acceptance observations:

- Equal-depth refs with stable tie ids `100`, `101`, and `102` draw in that order.
- Transfer weights expose the stable order: nearer entries obscure farther entries through source-over transmission.
- The test does not require a particular sort backend. A global staging pass, per-tile radix list, or future per-tile GPU backend is acceptable only if the tile's observable ordered refs match this contract.

### Sparse Empty Tile

The sparse-empty case has no refs for the tile. The real compositor must emit the configured clear color and zero alpha.

Acceptance observations:

- `drawSplatIds` is empty.
- `orderedRefs` is empty.
- The only transfer weight is `{ id: "clear", weight: 1 }`.
- The bridge diagnostic boundary records that block witness colors are not allowed.

## Consumed Contracts

This lane consumes, without redefining:

- `tile-list-bridge`: tile-local refs exist and can point to splat payloads.
- `tile-coverage-builder`: `coverageWeight` is the non-negative local Gaussian coverage evidence for a tile/ref pair.
- `tile-ordering`: stable back-to-front tile-local order is depth first, then stable tie id.
- `alpha-transfer`: `coverageWeight` transfers opacity as optical depth through source-over composition.

The CPU reference helper is deliberately small so implementation lanes can compare observable behavior without inheriting a production architecture from this lane.

## Not Claimed

This acceptance contract does not claim:

- final GPU tile ref-builder
- spherical harmonics
- PBR relighting
- mesh integration
- deferred G-buffer output
- beauty, denoising, or production-quality image thresholds
- replacement of global/GPU sort architecture
- optimization policy

Those are later renderer-fidelity surfaces. This slice only separates legitimate ugly first compositor output from false confidence in bridge-only diagnostics.

## Executable Probe

Probe: `src/rendererFidelityProbes/tileLocalCompositor.js`

Tests: `tests/renderer/tileLocalCompositorAcceptance.test.mjs`

The probe returns each tile's ordered refs, draw splat ids, transfer weights, final color, alpha, remaining transmission, normalization policy, and bridge diagnostic boundary. That is enough for the implementation and visual/perf lanes to prove they are no longer showing only the bridge diagnostic, without this lane touching production implementation files.
