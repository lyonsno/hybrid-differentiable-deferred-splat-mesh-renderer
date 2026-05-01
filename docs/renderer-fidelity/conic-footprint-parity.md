# Conic Footprint Parity: Rotated Minor-Axis Floor

Packet: `metadosis/coordination-packets/meshsplat-static-artifact-diagnostic-convergence_2026-05-01.md`

Lane: `conic-hole-vivisection`

Status: production conic projection repair plus bounded parity test. This lane does not redefine tile-ref retention, alpha/transmittance policy, GPU tile-list construction, source asset decoding, global opacity, brightness, or camera framing.

## Finding

The tile-local prepass projected each splat into a screen-space covariance, then applied `minRadiusPx` only to the covariance's `xx` and `yy` components. That is not the same as flooring the actual ellipse axes.

For a rotated thin splat, both marginal components can be large because the major axis contributes to both screen axes, while the true minor eigen-axis remains subpixel. The inverse-conic packed for the GPU then evaluates an extremely thin footprint even though the renderer was configured with a larger minimum radius. That is a conic underfill mechanism independent of tile-ref retention and alpha accumulation.

## Repair

`src/tileLocalPrepassBridge.js` now floors the projected covariance in principal-axis space:

1. compute the covariance eigenvalues;
2. floor each eigenvalue to `minRadiusPx ** 2`;
3. reconstruct the covariance with the original orientation;
4. pack the repaired covariance as the inverse conic consumed by `src/shaders/gpu_tile_coverage.wgsl`.

This keeps the major axis and rotation intact while making the minimum-radius policy apply to the actual minor axis, not just to axis-aligned covariance marginals.

## Executable Evidence

`tests/renderer/conicFootprintParity.test.mjs` builds a rotated, very thin splat through the tile-local prepass, reads the packed inverse-conic shape, and verifies that the recovered minor radius honors `minRadiusPx` while the major radius still preserves the projected support.
