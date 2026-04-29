# Alpha Transfer: Optical-Depth Compositing Contract

Packet: `metadosis/coordination-packets/meshsplat-tile-coverage-compositor_2026-04-29.md`

Lane: `alpha-transfer`

Status: contract and deterministic probe only. No production renderer, shader, tile-list layout, coverage geometry, sort backend, SH payload, or center-tile bridge constant is changed here.

## Scope

This lane owns the transfer from trusted local coverage plus activated opacity into transmission/color. It consumes projected coverage weights from the coverage lanes and ordered contribution lists from the ordering lane. It does not define how projected Gaussian footprints overlap tiles, how tile buffers are laid out, or which sort primitive produces the ordered list.

The compositor input shape used by the probe is intentionally small:

- `id`: stable diagnostic identity
- `depth`: carried for evidence only; the probe assumes the caller has already supplied back-to-front order
- `color`: straight RGB in renderer numeric space
- `opacity`: already activated unit-interval source opacity
- `coverageWeight`: non-negative optical-depth weight from trusted local coverage accounting

## Transfer Rule

Coverage weight is optical depth. Convert source opacity and coverage with:

```text
coverageAlpha = 1 - (1 - opacity) ^ coverageWeight
```

This preserves transmittance under repeated partial coverage:

```text
(1 - coverageAlpha) = (1 - opacity) ^ coverageWeight
```

Important consequences:

- `coverageWeight = 0` contributes no alpha.
- `coverageWeight = 1` preserves the source opacity.
- fractional coverage is not linear opacity scaling.
- coverage weights above `1` are real accumulated optical depth, not an error to renormalize away.

## Normalization Policy

Never normalize coverage weights before alpha transfer. Normalization is allowed only as a diagnostic comparison that proves how much evidence would be erased.

Forbidden transfer input:

```text
coverageWeight_i := coverageWeight_i / sum(coverageWeight)
```

That operation turns a dense sheet into a single-sample distribution and lets bright behind-surface contributions leak through. If coverage accounting says a tile-local sheet has total effective coverage `30`, alpha transfer must see `30`, not `1`.

The only normalized value this lane allows in the transfer path is color math after transfer weights already exist, such as computing an average diagnostic color from completed weights. The transfer itself must use raw optical-depth coverage.

## Ordered Composition

The compositor consumes back-to-front contributions. It does not sort them in this lane because tile-ordering owns which global radix, per-tile radix, or bucket approximation provides the order.

Given ordered contributions, each layer's visible weight is:

```text
visibleWeight_i = coverageAlpha_i * product(transmission of nearer layers)
```

The clear/background weight is:

```text
clearWeight = product(transmission of all layers)
```

Final color is the weighted sum of layer straight RGB plus the opaque dark clear color. If ordering is approximate, alpha transfer will faithfully expose the resulting leakage or over-occlusion; it must not compensate for ordering uncertainty by changing opacity.

## Dense Sheet With Bright Behind-Surface Splat

The pinned probe case uses one bright behind layer and three trusted surface contributions, each with opacity `0.08` and coverage weight `10`. Raw transfer leaves less than `4%` total transmission and suppresses the bright behind layer below `0.05` visible weight.

If the same surface weights are illegally normalized to sum to `1`, the bright behind layer becomes more than six times more visible. That is exactly the failure mode this contract forbids: normalization hides coverage evidence and makes the compositor look better by throwing away optical depth.

## Executable Probe

Probe: `src/rendererFidelityProbes/alphaTransfer.js`

Tests: `tests/renderer/alphaTransfer.test.mjs`

The probe pins:

- `alphaFromCoverageOpacity`: optical-depth conversion from activated opacity and coverage weight.
- `composeOrderedAlphaTransfer`: back-to-front ordered compositing that reports final color, remaining transmission, per-layer coverage alpha, and visible transfer weights.
- `classifyAlphaTransferNormalization`: policy label for raw transfer input versus diagnostic-only normalized comparisons.

## Sibling Boundaries

- `coverage-reference` owns truth cases and expected outcomes for anchor scenes. This lane may consume those expected outcomes but must not silently redefine them.
- `tile-coverage-builder` owns projected ellipse/tile overlap and the CPU data shape for coverage weights. This lane consumes non-negative coverage weights only.
- `tile-ordering` owns the ordering guarantee. This lane consumes an already ordered list and states the consequence of approximate order.
- `gpu-tile-skeleton` owns GPU buffers/pipelines. This lane supplies math and tests, not production WGSL or renderer integration.

## Acceptance Statement

Alpha transfer is mature enough for steward integration when production code can feed trusted coverage weights and ordered contributions into the same optical-depth transfer without normalizing away dense sheets, changing current smoke bridge constants, or compensating for unresolved coverage/order errors.
