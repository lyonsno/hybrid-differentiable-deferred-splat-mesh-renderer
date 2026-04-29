# SH Viewlight

Lane: `sh-viewlight`
Packet: `metadosis/coordination-packets/meshsplat-renderer-reference-parity_2026-04-29.md`
Branch: `cc/sh-viewlight-harmonic-payload-witness`

## Contract

Higher-order spherical harmonics are optional payload data beside the first-smoke DC color path. The existing row payload keeps `color` as displayable RGB decoded from SH DC (`0.5 + 0.28209479 * f_dc`) or byte RGB; this lane does not change DC-only rendering semantics.

When higher-order SH exists, the manifest carries:

```json
"sh": {
  "degree": 1,
  "basis": "3dgs_real_sh",
  "coefficients_layout": "splat_coeff_rgb",
  "coefficients_path": "<asset>.sh.f32.bin",
  "coefficients_component_type": "float32",
  "coefficient_count": 3,
  "coefficients_byte_length": 36,
  "dc_source": "payload.color contains displayable RGB decoded from SH DC"
}
```

The sidecar is little-endian float32 in `(splat, coefficient_without_dc, rgb)` order. PLY `f_rest_*` fields are discovered in standard 3DGS channel-major order, then exported and decoded into this coefficient-major RGB layout. Browser decoders expose the optional payload as `attributes.sh`; older DC-only payloads continue to decode with `attributes.sh === undefined`.

## Handedness Consumption

Consumed `handedness-witness` at `origin/cc/asymmetric-mirror-handedness-witness@f4669b5`.

- Source xyz is preserved.
- Source rotations remain source `wxyz` quaternions.
- First-smoke presentation applies only the intentional post-projection vertical Y flip.
- Positive source X remains screen-right in the default first-smoke framing.

Therefore this lane does not explain the Oakland side-by-side mirror by flipping loader positions, changing quaternion component order/signs, or adding a horizontal presentation flip. A future explicit coordinate reflection must pair position reflection with the matching quaternion/axis repair.

## Witness

`src/rendererFidelityProbes/shViewlight.js` is a bounded CPU witness, not production shader integration. It evaluates degree-1 3DGS real SH from displayable DC RGB plus optional higher-order coefficients, and `tests/renderer/shViewlight.test.mjs` proves opposite source-X view directions produce different color under the consumed convention.

Production WGSL integration remains steward-owned because `src/shaders/splat_plate.wgsl` is the packet collision surface for SH, conic coverage, near-plane behavior, and alpha policy.
