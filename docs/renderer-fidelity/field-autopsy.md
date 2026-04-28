# Field Autopsy

Lane: `field-autopsy` in `metadosis/coordination-packets/meshsplat-renderer-fidelity-truth-table_2026-04-28.md`.

Scope: asset-field semantics only. This lane did not change production decode behavior in `src/splats.ts`, `src/localPly.ts`, or `preprocessing/splat_oracle/first_smoke.py`.

## Contract Table

| Field | Contract | Evidence | Renderer implication |
| --- | --- | --- | --- |
| PLY position | Preserve source `x`, `y`, `z` as renderer world `xyz`; no loader-handedness flip. | Browser PLY loader writes `positions[0..2] = x,y,z` in `src/localPly.ts`. Preprocessing loader stacks `x,y,z` in `preprocessing/splat_oracle/loader.py`. Existing first-smoke manifest bounds are produced from those preserved positions. | Visible left/right/up/down oddities should not be attributed to a PLY decode axis swap unless a specific source asset proves Scaniverse's exported coordinate frame itself differs from renderer camera convention. |
| SH DC color | `rgb = clamp01(0.5 + 0.28209479177387814 * f_dc_*)`. Byte RGB fallback is `uchar / 255`. | Browser local PLY loader uses `SH_C0` and clamps. Preprocessing PLY and SPZ loaders use the same SH DC transform. Smoke manifest `decode.color` states the transform. `tests/assetFieldSemantics.test.ts` and `preprocessing/tests/test_field_semantics_export.py` pin it. | Color wash or darkening is unlikely to come from missing SH DC activation on the current PLY and exported-manifest paths. Higher-order SH is not rendered in first smoke; only DC/displayable RGB is consumed. |
| Opacity | PLY and SPZ opacity values are logits; renderer payload opacity is activated with `sigmoid(raw)` and then stored as unit interval float. Missing PLY opacity defaults to `1`. | Browser local PLY loader applies `sigmoid`. Preprocessing PLY/SPZ loaders apply sigmoid. Exported rows store unit interval opacity at byte offset 24. Tests cover raw `-2`, `0`, and `4` logits. | Alpha/compositing artifacts should be investigated after assuming opacity values entering WebGPU are already activated, not raw logits. |
| Scale | PLY/SPZ `scale_0..2` are log-space anisotropic axes. Payload radius seed is `max(exp(scale_0), exp(scale_1), exp(scale_2))`. Shape sidecar preserves the raw log-scale triplet. | `preprocessing/splat_oracle/first_smoke.py` writes `shape.scale_space = "log"` and sidecar raw scales. `src/localPly.ts` preserves raw scales and derives radius with `exp`. WGSL calls `exp(scaleLog)` before projecting axes. Field tests cover browser PLY decode and manifest sidecars. | Slab-size or anisotropy failures are not explained by a missing `exp` on the WebGPU path; the shader applies it. Conic/projection and clipping lanes can consume log-scale as the settled field contract. |
| Quaternion | Rotation order is `wxyz`: `rot_0` is scalar `w`, followed by vector `x,y,z`. Sidecars preserve that order. | `SplatCloud.rotations` documents `(w,x,y,z)`. PLY loader stacks `rot_0..3`. Export manifest writes `rotation_order = "wxyz"`. WGSL `rotateAxis` treats `q.x` as scalar and `q.yzw` as vector. New field tests include non-identity quaternions to prevent accidental identity-only coverage. | Projection math should consume quaternions as `wxyz`. Reordering to `xyzw` would be a renderer bug, not an asset decode fix. |
| SPZ manifests | Exported SPZ assets should use the same manifest contract as PLY: displayable RGB, activated opacity, log-scale sidecars, and `wxyz` rotations. | Python `load_spz` applies the same SH DC, sigmoid opacity, log scale, and raw rotation storage before export. `tests/splats.test.ts` marks SPZ manifests as `real_splat_spz`. | Browser drag/drop SPZ is not wired yet, so direct browser-vs-SPZ parity remains a future loader task. Exported SPZ manifests should already match the browser manifest decoder. |

## Parity Probes

Added `src/rendererFidelityProbes/fieldSemantics.ts` as an isolated executable contract. It defines the field semantics used by the tests without changing the production decoders.

Added `tests/assetFieldSemantics.test.ts`:

- Verifies local binary PLY drag/drop decodes SH DC color, opacity logits, log-scale radius seeds, raw log-scale sidecars, and non-identity `wxyz` quaternions according to the field contract.
- Verifies a first-smoke manifest payload reconstructed from the same decoded PLY values round-trips through `decodeFirstSmokeSplatManifest` with identical color, opacity, radius, scale, and rotation arrays.

Added `preprocessing/tests/test_field_semantics_export.py`:

- Verifies preprocessing export writes manifest decode notes, `shape.scale_space = "log"`, `shape.rotation_order = "wxyz"`, activated opacity rows, SH DC color rows, radius seeds, raw log scales, and non-identity quaternion sidecars.

## Build-Ready Fixes

Production manifest decoding currently trusts shape/decode metadata when sidecar byte lengths match. A later implementation packet should consider moving the probe's `requireFieldSemanticsManifest` validation, or an equivalent check, into `decodeFirstSmokeSplatManifest` so manifests that declare `scale_space = "linear"` or `rotation_order = "xyzw"` fail before rendering. That change is build-ready but intentionally not made here because this packet is investigation-only and forbids production decode rewrites.

SPZ drag/drop remains unwired. Once local SPZ loading exists in the browser, it should satisfy the same contract rather than inventing a second field surface.

## Remaining Unknowns

The PLY and exported-manifest paths preserve source `xyz`. This lane did not prove the semantic handedness of every upstream Scaniverse coordinate frame against a physical capture reference. If a scan appears mirrored or upside-down, the next check should compare a known asymmetric fixture between source viewer, preprocessing export, and WebGPU, not change field decode by guess.

Full projected-conic correctness is deliberately out of scope. This lane consumes no `conic-reckoner` conclusion yet; it only gives that lane the settled input contract: log scales and `wxyz` quaternions.

Alpha ordering, premultiplication, and clipping behavior are sibling contracts. This lane only establishes that opacity entering those systems is already a unit interval value.
