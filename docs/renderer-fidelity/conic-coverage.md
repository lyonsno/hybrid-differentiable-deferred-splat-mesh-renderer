# Conic Coverage: Thin And Glancing Surface Witness

Packet: `metadosis/coordination-packets/meshsplat-renderer-reference-parity_2026-04-29.md`

Lane: `conic-coverage`

Status: probe-and-contract evidence only. No production shader, loader, alpha, SH, or sort behavior is changed in this lane.

## Scope

This lane consumes the current conic projection baseline on `main`: log-scale Gaussian axes, source `wxyz` quaternions, source xyz preservation, and Jacobian-projected covariance.

It also consumes `handedness-witness` at `origin/cc/asymmetric-mirror-handedness-witness` `f4669b5`: the current renderer path preserves source xyz and source `wxyz` quaternions; the only intentional first-smoke reflection is the post-projection vertical Y presentation flip; default first-smoke framing does not introduce a horizontal mirror; positive source X remains screen-right. Therefore this lane does not blame thin/glancing coverage failures on loader position flips, unpaired quaternion changes, or a horizontal first-smoke presentation flip.

The witness asks a narrower question: once the projected conic is mathematically trustworthy, can the current minimum-radius display floor still make thin or glancing surfaces look too thick?

## Executable Probe

Probe: `src/rendererFidelityProbes/coverageWitness.js`

Tests: `tests/renderer/coverageWitness.test.mjs`

The probe measures a reference Jacobian conic in screen pixels, applies the same `splatScale / 600` radius calibration used by the WGSL path, then applies a configured `minRadiusPx` floor to each ellipse axis. It reports:

- projected major/minor radii before the floor
- major/minor radii after the floor
- reference footprint area
- floored footprint area
- area inflation
- number of axes that hit the floor

This is intentionally a coverage probe, not an opacity policy. Its over-coverage recommendation is `report-coverage-floor-do-not-change-opacity`.

## Witness Results

Using `viewportMinPx = 720`, `splatScale = 600`, and `minRadiusPx = 0.75`:

| Case | Status | Reference major px | Reference minor px | Floored major px | Floored minor px | Area inflation |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `glancing-thin-ribbon` | `min-radius-overcoverage` | `24.7503` | `0.0225` | `24.7503` | `0.7500` | `33.3333x` |
| `resolved-elliptical-splat` | `reference-coverage` | `23.1432` | `6.1717` | `23.1432` | `6.1717` | `1.0000x` |

The glancing/thin witness does not fail because the conic is wrong. It fails because the minor axis is legitimately subpixel, and a fixed display floor turns that subpixel support into a much wider footprint. That is a plausible mechanism for native Scaniverse resolving thin/glancing detail better than this renderer even after the Jacobian covariance fix.

## Scale Calibration

The probe pins the current scale calibration:

- doubling `splatScale` doubles both projected radii before any floor
- doubling `splatScale` quadruples projected footprint area before any floor
- `minRadiusPx = 0` leaves that calibration cleanly measurable

That means `splatScale` is a real coverage-energy lever. It should not be tuned casually to hide a thin-surface failure, because it changes area globally and couples directly to alpha-density behavior.

## Production Implications

Keep the Jacobian conic path as the geometric reference. The remaining coverage risk is the minimum-radius policy:

1. A fixed per-axis floor is useful for visibility and small-splat anti-dropout.
2. The same floor can over-thicken resolved anisotropic splats when only the minor axis is subpixel.
3. Changing opacity to compensate would cross into `alpha-density` and can hide the geometry problem.
4. A production fix should report or bound floor-hit cases separately from alpha policy, under the handedness contract from `f4669b5`.
5. If a future explicit coordinate reflection is introduced, reflected positions must be paired with corresponding quaternion/axis repair. Naked quaternion component or sign tweaks are outside this lane and forbidden by the consumed handedness contract.

## Unresolved

- Real Oakland/Scaniverse witness counts are still needed: how many splats hit exactly one axis floor, and which original IDs dominate thin/glancing surface regions.
- Any floor-aware energy compensation belongs to `alpha-density`, not this lane.
- The coordinate/quaternion convention is settled by `handedness-witness` `f4669b5`; future conic visual smoke should label this convention beside coverage/min-radius counters so mirror suspicion does not get rerouted back to loader flips.
