# Dense Front Occlusion Witness

This witness pins the plate-through-dessert failure for `renderer=tile-local-visible`: a dense foreground dessert surface should suppress a bright behind layer, such as the white plate curve, when the ordered optical-depth reference says that behind contribution is effectively gone.

The executable probe is `src/rendererFidelityProbes/denseFrontOcclusionWitness.js`, covered by `tests/renderer/denseFrontOcclusionWitness.test.mjs`.

## Contract

The witness compares two bounded views of the same tile/pixel:

- Reference optical-depth composition uses the expected dense foreground coverage weights.
- Observed tile-local-visible composition uses the retained tile refs with `tileCoverageWeight * conicPixelWeight`, matching the current visible compositor's per-pixel coverage input.

When the reference behind weight is suppressed but the observed bright behind weight is still visible, the probe reports `leak-detected` and classifies the cause:

- `coverage-underfill`: foreground refs are present, but observed foreground optical depth is much lower than the reference.
- `alpha-transfer`: foreground coverage is present at roughly the expected magnitude, but the transfer still leaks the behind layer.
- `tile-list-loss`: required dense foreground roles are missing from the retained tile refs, so the leak is not primarily alpha under-opacity.
- `ordering-or-other`: the witness sees a leak but cannot assign it to the covered categories without more intermediate diagnostics.
- `no-leak`: this synthetic pixel does not reproduce the bright behind leak.

This makes the failure falsifiable without folding all tile-local symptoms into one screenshot. A repair lane can consume the witness and then show that the same tile/pixel no longer leaks in the relevant category.

## Boundaries

This lane does not change WGSL, tile-list retention, alpha transfer, global opacity, global brightness, source asset decoding, camera framing, or SH/view-dependent color. It is not a global opacity tuning surface and it does not claim Scaniverse reference parity. The result is evidence for the conic coverage, alpha/transmittance, tile-list/block, or debug lanes to consume.
