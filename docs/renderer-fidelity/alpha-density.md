# Alpha Density: Pathological Reflection Leakage Witness

Packet: `metadosis/coordination-packets/meshsplat-renderer-reference-parity_2026-04-29.md`

Lane: `alpha-density`

Status: witness and policy options only. No production renderer, shader, blend-state, sort-backend, conic, SH, or coordinate behavior is changed here.

## Handedness Anchor Consumed

Consumed `origin/cc/asymmetric-mirror-handedness-witness` at `f4669b5`.

This lane treats the current first-smoke coordinate contract as:

- source xyz positions are preserved
- source `wxyz` quaternions are preserved
- the first-smoke path intentionally applies only a post-projection vertical Y presentation flip
- the default first-smoke camera framing does not introduce a horizontal mirror
- positive source X remains screen-right

Therefore alpha-density symptoms should not be attributed to loader position flips, unpaired loader quaternion changes, or a first-smoke horizontal presentation mirror. A future true coordinate reflection would need paired position reflection plus quaternion/axis repair, but that is outside this lane.

## Finding

A dense stack of transparent flat-surface splats can suppress bright pathological reflection splats behind or below the surface without any exotic blend bug.

The witness case uses:

- `72` surface layers
- surface alpha `0.08`
- a bright behind-surface layer at alpha `0.6`

With straight source-over blending, the behind layer's visible weight after the surface stack is:

```text
0.6 * (1 - 0.08)^72 = 0.001497...
```

That is effectively hidden even though every individual surface layer is only lightly transparent. This is the alpha-density mechanism the native Scaniverse reference may be avoiding or compensating around for glancing flat surfaces with reflective optimization artifacts.

This is not proof that alpha-density is the whole reference delta. The same visual symptom can still be caused or amplified by:

- missing higher-order SH view-dependent color
- projected conic footprint area that over-thickens a glancing surface
- sort limits for large/interpenetrating transparent splats

The witness rejects only coordinate-reflection explanations covered by the handedness anchor.

## Executable Probe

Probe: `src/rendererFidelityProbes/alphaDensity.js`

Tests:

- `tests/renderer/alphaDensity.test.mjs`
- `tests/smoke/witness-diagnostics.test.mjs`

The probe pins:

- `transmissionThroughAlphaLayers(layerCount, layerAlpha)`: accumulated visibility through a stack of transparent surface splats.
- `composePathologicalReflectionWitness`: a deterministic surface-plus-bright-behind-layer witness with final transfer weights.
- `compensateAlphaForLayerDensity`: an optical-depth compensation candidate that preserves a reference layer count's sheet opacity when sampling density changes.
- `compensateAlphaForProjectedArea`: an optical-depth compensation candidate for inflated projected footprint area.
- `classifyAlphaDensityWitness`: a routing classifier that separates density occlusion from conic footprint area, sort limits, missing SH, and coordinate explanations.

The smoke diagnostics path now accepts `witness.alphaDensity` and routes dense-overlap findings to owner `alpha-density` with kind `alpha-density-occlusion`. This is a report/witness field only; it does not affect visual-smoke pass/fail thresholds.

## Bounded Policy Options

These are options for the steward lane, not production changes made here.

### 1. Preserve Current Alpha Contract

Keep current per-fragment alpha:

```text
alpha = opacity * exp(-2 * r2)
```

Use this when density witnesses show surface transmission is not the dominant reason a behind-surface bright splat is hidden, or when conic/sort/SH evidence is not yet trustworthy.

### 2. Density Compensation By Optical Depth

When a flat surface is oversampled relative to a reference density, reduce per-layer alpha by preserving optical depth:

```text
alpha_comp = 1 - (1 - alpha_source)^(referenceLayerCount / layerCount)
```

This keeps:

```text
(1 - alpha_comp)^layerCount = (1 - alpha_source)^referenceLayerCount
```

It is safer than a global opacity multiplier because it is local to an observed density ratio and leaves ordinary sparse splats alone.

### 3. Projected-Area Compensation By Optical Depth

When conic coverage proves the current projected footprint area is inflated by ratio `r`, preserve transmittance with:

```text
alpha_comp = 1 - (1 - alpha_source)^(1 / r)
```

This is deliberately blocked until the conic-coverage lane says the area ratio is trustworthy. It must not paper over a coordinate or conic bug.

## Classification Rules

The current witness classifier reports:

- `density-occlusion`: surface stack transmission is below the threshold and conic/sort blockers are absent.
- `blocked-by-conic-footprint-area`: projected area ratio is too large to make an alpha policy claim.
- `blocked-by-sort-limits`: sort inversions are present, so the symptom may be order-dependent transparency.
- `blocked-by-conic-and-sort`: both hard blockers are present.
- `alpha-density-not-dominant`: dense overlap is not currently the leading explanation.

Missing higher-order SH is a blocker for final reference-parity claims but not for the narrow density witness. A density witness may still be useful while carrying `blockedBy: ["missing-sh"]`.

## Conclusion

Alpha-density is a plausible, independently testable explanation for hidden bright pathological reflection splats: ordinary low-alpha layers become effectively opaque when there are enough overlapping surface splats. The correct policy should be bounded and optical-depth based, not a global opacity hack.

The lane's recommendation is:

1. Keep the current alpha/blend contract unless a smoke witness exposes dense-overlap suppression.
2. Do not tune alpha while conic footprint area or sort inversions are active blockers.
3. If conic area and sort are clean, consider density or projected-area compensation using optical-depth formulas.
4. Keep missing SH visible as a separate blocker because native-looking reflective pathology may need view-dependent color even when alpha density is fixed.
