# Slab Sentinel: Near-Plane and Pathological Footprint Contract

Packet: `metadosis/coordination-packets/meshsplat-renderer-fidelity-truth-table_2026-04-28.md`

Lane: `slab-sentinel`

Status: investigation-only contract and probe. No production renderer behavior is changed here.

## Finding

The current first-smoke shader rejects splats whose centers are outside the clip volume, but it projects the three covariance axis endpoints without clipping those endpoints against the near plane. A splat center can be valid while one scaled/rotated axis endpoint has tiny or invalid clip `w`. Dividing that endpoint by its own `w` produces an enormous NDC delta, and the resulting quad can become a screen-flooding translucent slab.

The observed mechanism is independent of whether the final projection contract becomes the current three-axis covariance approximation or a conic/Gaussian reference. Any production projection path that divides an offscreen or near-plane-crossing support point by a near-zero `w` needs an explicit policy before rasterization.

## Executable Probe

Probe: `src/rendererFidelityProbes/slabFootprint.js`

Tests: `tests/renderer/slabClip.test.mjs`

The fail-first witness on the current radius math produced a 300,000 px footprint against a 468 px first-smoke cap. The final probe does not change production code; it classifies synthetic clip-space cases:

- `axis-crosses-near-plane`: center is valid, but at least one covariance/support endpoint is outside clip space before projection. Recommendation: `slice-or-lod`.
- `pathological-footprint`: all tested support endpoints are projectable, but the estimated footprint exceeds the cap. Recommendation: `lod-or-clamp`.
- `accepted`: center and support endpoints are projectable and the estimated footprint remains below the cap. Recommendation: `keep`.
- `reject-center`: center itself is outside clip space. Recommendation: `reject`.

The probe intentionally includes a large nearby splat below the cap to avoid turning the slab fix into a blanket foreground-splat hide rule.

## Provisional Contract

For first-smoke accountability, use a screen-footprint cap of `0.65 * min(viewportWidth, viewportHeight)` as the investigation threshold. This is not a final artistic or physical constant; it is a reproducible boundary for distinguishing "large visible foreground splat" from "one splat dominates most of the viewport because projection became pathological."

The production renderer should eventually make these decisions in this order:

1. Reject if the center is outside the clip volume. This matches the current shader center policy and is safe for splats fully behind the camera or outside depth range.
2. If the center is valid but any covariance/conic support used for footprint estimation crosses the near plane, do not project that support point raw. Route to a near-plane policy: slice the footprint against the near plane if the conic contract supports it, or render a bounded LOD proxy for first smoke.
3. If all sampled support is projectable but the screen footprint exceeds the cap, prefer LOD or an energy-aware clamp over silent full-size rendering.
4. Keep large bounded splats. A foreground splat with a large but cap-respecting footprint is legitimate scan content, not a slab failure by itself.

## Recommendation

Best build-ready first step: add a production-side footprint classifier equivalent to the probe, but keep the actual renderer response behind a steward-approved implementation packet. The response should likely be:

- `reject-center` -> discard, as today.
- `axis-crosses-near-plane` -> first-smoke LOD proxy or conservative near-plane slice. Do not raw-project the crossing endpoint.
- `pathological-footprint` -> bounded LOD or clamp with an observable debug counter.
- `accepted` -> current path.

Tradeoffs:

- Rejecting all axis-crossing splats is simple and stable, but it can punch holes in legitimate close-range geometry.
- Clamping the footprint is cheap and prevents full-screen slabs, but it changes apparent opacity/energy and can create a flat billboard look.
- Slicing the footprint against the near plane is the most geometrically honest, but it should consume `conic-reckoner` so this lane does not invent the final projection math.
- LOD is the best first-smoke compromise: it keeps a bounded contribution visible while avoiding near-plane division explosions. It still needs `alpha-ledger` before final opacity compensation is trustworthy.

## Sibling Contracts Consumed

- `conic-reckoner`: not yet available in this worktree at probe time. This lane consumed only the packet ownership rule that conic/projection math belongs to `conic-reckoner`, so this document treats the current three-axis projection as a witness mechanism rather than final geometry.
- `field-autopsy`: not yet available in this worktree at probe time. The probe assumes the current shader convention that per-axis scale inputs are log-scale and transformed with `exp(scaleLog)`, but final thresholds should be revisited after `field-autopsy` pins real Scaniverse/SPZ/PLY scale units.
- `alpha-ledger`: not consumed for classification. Any opacity compensation for clamped/LOD splats must wait for the alpha contract.
- `witness-scope`: not consumed yet. This lane recommends exposing the classification counts in a future visual witness overlay: rejected centers, near-plane-crossing support, footprint-capped/LOD splats, and accepted splats.

## Remaining Unknowns

- The final conic support shape may classify fewer or more near-plane crossings than the current three endpoint witness. The near-plane policy should attach to the final support geometry, not to this probe's axis list.
- The first-smoke cap ratio needs visual calibration on the Oakland and dessert scans. `0.65` is a reproducible investigation threshold, not a settled UX value.
- LOD opacity and color preservation remain unresolved until the alpha/compositing contract defines how a bounded proxy should contribute.
