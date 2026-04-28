# Meshsplat Renderer Fidelity Production Spine Synthesis

This branch is the contract-synthesis carrier for the production fidelity spine.
It imports the investigation docs, probes, and tests without changing production
renderer behavior.

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
