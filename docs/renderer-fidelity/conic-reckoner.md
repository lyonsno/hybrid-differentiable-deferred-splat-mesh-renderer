# Conic Reckoner: Projected Gaussian Contract

Packet: `metadosis/coordination-packets/meshsplat-renderer-fidelity-truth-table_2026-04-28.md`

Lane: `conic-reckoner`

Status: investigation-only contract and probe. No production renderer behavior is changed here.

## Contract

The renderer input shape contract consumed from `field-autopsy` is:

- Scale inputs are log-space anisotropic Gaussian axes. Projection code must apply `exp(scaleLog)` before forming covariance.
- Quaternion inputs are `wxyz`. The scalar component is `rot_0`.
- Field decode is not the cause of the conic discrepancy shown here; this lane assumes the browser and exported-manifest paths deliver log scales and `wxyz` rotations correctly.

For a splat center `p`, rotation matrix `R`, and linear scales `s = exp(scaleLog)`, the 3D Gaussian covariance is:

```text
Sigma3 = R * diag(sx^2, sy^2, sz^2) * transpose(R)
```

For first-smoke screen-space accountability, the projected reference conic is the local perspective projection of that covariance:

```text
Sigma2 = J(p) * Sigma3 * transpose(J(p))
```

where `J(p)` is the 2x3 Jacobian of the perspective divide from camera/world position to NDC `xy`. This reference is a local Gaussian/conic contract, not a finite endpoint witness.

The current shader path in `src/shaders/splat_plate.wgsl` instead projects the three positive one-sigma axis endpoints, subtracts the projected center, sums their 2D outer products, and eigendecomposes that 2D matrix. That approximation is acceptable only when the perspective divide is locally close to affine over the splat support. It is not a full projected Gaussian contract.

## Why The Current Approximation Fails

A covariance axis has no sign. The reference conic is invariant if an eigen-axis points in the opposite direction but spans the same covariance. The current endpoint approximation is not invariant under perspective because it samples only `p + axis`, not both signs or the local derivative.

The probe's strongest witness uses the same 3D covariance twice:

- `perspective-depth-axis-forward`: a depth-aligned anisotropic axis points farther from the camera.
- `perspective-depth-axis-backward`: a 180 degree rotation around X flips that same covariance axis toward the camera.

The Jacobian reference covariance is identical for both. The endpoint approximation changes materially:

| Case | Classification | Relative Frobenius error | Endpoint `xx` | Reference `xx` | Near-plane support |
| --- | --- | ---: | ---: | ---: | --- |
| `small-centered` | `acceptable` | `0.000000` | `0.000011` | `0.000011` | no |
| `rotated-in-plane` | `acceptable` | `0.000000` | `0.000025` | `0.000025` | no |
| `edge-on-depth-anisotropy` | `approximation-fails` | `0.538264` | `0.012416` | `0.026890` | no |
| `perspective-depth-axis-forward` | `approximation-fails` | `0.539702` | `0.017086` | `0.037120` | no |
| `perspective-depth-axis-backward` | `approximation-fails` | `2.679553` | `0.136587` | `0.037120` | no |
| `near-plane-adjacent` | `near-plane-support` | `7.899399` | `1.780278` | `0.200031` | yes |

The failure is not merely "big splat gets big." It is sign-sensitive projection of a covariance axis. That is a mathematical contract violation for a Gaussian/conic renderer.

## Executable Probe

Probe: `src/rendererFidelityProbes/conicProjection.js`

Tests: `tests/renderer/conicProjection.test.mjs`

The probe implements two isolated projection paths:

- `referenceJacobianCovariance`: local projected Gaussian/conic reference using `J * Sigma3 * J^T`.
- `currentEndpointCovariance`: CPU mirror of the shader's current three positive endpoint approximation.

The tests pin three contracts:

- The reference conic is invariant under the depth-axis sign flip, while the endpoint approximation is not.
- Small centered splats and in-plane rotated splats remain inside the stated approximation bound.
- Near-plane-adjacent support is classified as `near-plane-support` and routed to the `slab-sentinel` policy instead of being treated as an ordinary conic error.

The current investigation threshold is `relativeFrobeniusError <= 0.08` for "acceptable." This is a falsifiable first-smoke bound, not a final perceptual threshold.

## Build-Ready Fix

The build-ready renderer direction is to replace the finite positive-endpoint shape projection with a Jacobian projected covariance/conic:

1. Normalize `wxyz` quaternion.
2. Convert log scales with `exp`.
3. Build `Sigma3 = R diag(s^2) R^T`.
4. Build the perspective Jacobian at the splat center after model/view/projection placement.
5. Compute `Sigma2 = J Sigma3 J^T`.
6. Eigendecompose `Sigma2` for screen-space ellipse axes.
7. Route near-plane-support cases to the `slab-sentinel` policy before any raw divide by a crossing support point.

This is ready to implement in a later steward-approved implementation packet. It is intentionally not implemented here because this packet remains investigation-only and production rewrites in `src/shaders/splat_plate.wgsl`, `src/splatPlateRenderer.ts`, and `src/main.ts` are forbidden.

## Sibling Contracts Consumed

- `field-autopsy` at `origin/cc/field-autopsy` `66b4ea26e5d81ac614f4452b8d21308c4e432e1a`: consumed log-scale and `wxyz` quaternion semantics; did not redefine asset-field decode.
- `slab-sentinel` at `origin/cc/slab-sentinel` `ca96409`: consumed the near-plane witness policy. This lane classifies near-plane-support separately and recommends routing those cases to slab-sentinel rather than letting conic math silently divide crossing support points.
- `alpha-ledger`: not consumed. Opacity or energy compensation for any future LOD/clamp behavior remains outside this lane.
- `witness-scope`: not consumed yet. This contract gives witness-scope concrete case labels and numeric fields to expose if it builds a visual/debug overlay.

## Remaining Unknowns

- The production shader's exact Jacobian must be derived in the same coordinate convention as its matrix packing and clip-space depth policy. This probe uses a simple pinhole camera so the covariance contract is falsifiable without changing production renderer code.
- The acceptable-error threshold should be recalibrated after visual witnesses exist for dessert and Oakland scans.
- Near-plane slicing or LOD needs the slab and alpha contracts before it can be finalized.
