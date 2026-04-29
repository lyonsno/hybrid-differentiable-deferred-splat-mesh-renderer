# Meshsplat Renderer Fidelity Production Spine Synthesis

This document records the production fidelity spine baseline now landed on
renderer main at `1e6034f`. The original contract-synthesis carrier imported
the investigation docs, probes, and tests; subsequent renderer slices promoted
the first bounded production behavior into the smoke viewer.

Imported investigation contracts:

- `conic-reckoner`: reference Jacobian covariance projection plus witnesses for
  sign-sensitive endpoint projection, centered splats, rotated splats, and
  near-plane-adjacent splats.
- `field-autopsy`: browser/export field semantics for SH DC color, opacity
  activation, log-scale preservation, quaternion order, and source positions.
- `alpha-ledger`: straight source-over compositing, ascending depth order,
  equal-depth original-ID ties, opacity transfer, and alpha-energy obligations.
- `slab-sentinel`: near-plane center rejection, support crossing, pathological
  footprint, and large-valid-foreground classifications.
- `witness-scope`: diagnostic routing for anisotropy and foreground slab
  failures without weakening visual-smoke thresholds.

Expected current-production failures:

- None of the imported probes currently fail the production branch by design.
  They establish executable reference contracts and diagnostic classifiers.
- The first intentionally failing production contract should be added in the
  conic implementation slice, where shader/CPU projection output is compared
  against the Jacobian covariance reference for the sign-flip anisotropy case.

Guardrail:

- Do not use slab rejection or screen-radius clamps to hide conic projection
  defects. Conic parity has to be proved before slab/LOD policy can be judged.

## Production Progress

- `627ed09`: production shader projection moved from signed endpoint projection
  to Jacobian covariance projection. Epanorthosis regression review found no
  issues for `b16af1b..627ed09`.
- Slab/alpha slice: center-invalid splats still reject as before;
  valid centers whose scaled rotated support endpoints cross clip route to a
  bounded first-smoke LOD proxy instead of raw support projection. The LOD proxy
  keeps activated per-splat opacity and intentionally caps total screen energy
  by bounding footprint area rather than attempting to preserve pathological
  near-plane support energy.
- `1e6034f`: renderer main now carries the production-spine smoke baseline:
  real Scaniverse visual smoke, witness diagnostics, fly-camera framing,
  deferred CPU depth-key refresh, and WebGPU bitonic sorting wired into the
  smoke viewer. Remaining renderer-fidelity triage is still open before this
  can be treated as the finished production renderer.
