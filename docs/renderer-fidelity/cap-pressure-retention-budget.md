# Cap-pressure retention budget diagnostics

Packet: `metadosis/coordination-packets/meshsplat-gpu-contributor-arena-scalability_2026-05-02.md`

Lane: `cap-pressure-overflow-policy`

Status: diagnostic and policy-fixture contract only. This does not implement GPU count/prefix/scatter, runtime backend selection, source decoding, camera controls, SH/view color, mesh/deferred lighting, global visual tuning, or cap/budget increases.

## Contract

The contributor arena preserves two layers of overflow evidence:

- `overflowReason` remains the coarse, backward-compatible field. Dropped contributors under the retained per-tile cap still report `perTileRetainedCap`.
- `overflowReasonDetail` refines that coarse reason without replacing it. It distinguishes policy-reserve displacement from front, middle, and behind-surface band losses.

Projected contributors also carry:

- `retentionStatus`: `retained` or `dropped`;
- `retentionBand`: `front`, `middle`, or `back`;
- the original coverage, retention, occlusion, opacity, conic, center, depth, and transmittance evidence.

The important invariant is that dropped records remain visible in `contributorArena.projectedContributors`. The flat retained buffers may still expose only the surviving records, but diagnostics must be able to prove what was lost.

## Refined Reasons

| Detail reason | Meaning |
| --- | --- |
| `perTileRetainedCapPolicyReserve` | A contributor that would have survived the legacy coverage-first slice was displaced by the bounded retention/occlusion reserve. |
| `perTileRetainedCapForegroundBand` | A dropped contributor belonged to the front band and was not a legacy-policy displacement. |
| `perTileRetainedCapMiddleBand` | A dropped contributor belonged to the middle band and was not a legacy-policy displacement. |
| `perTileRetainedCapBehindSurfaceBand` | A dropped contributor belonged to the back/behind-surface band and was not a legacy-policy displacement. |

These are evidence labels, not beauty levers. A foreground or behind-surface loss can justify compression, LOD, or aggregation work, but it does not justify silently raising `maxRefsPerTile`, pretending loss is zero, or tuning opacity/brightness to hide the artifact.

## Summary Probe

`src/rendererFidelityProbes/capPressureRetention.js` exposes `summarizeCapPressureRetention(bridgeOrArena)`.

The summary reports:

- `classification`: `within-cap`, `at-cap`, or `over-cap`;
- projected, retained, and dropped refs;
- retained and dropped band counters;
- refined overflow-reason counts;
- foreground, behind-surface, policy-displacement, high-coverage, high-retention, and high-occlusion loss signals;
- policy hooks for `tile-local-lod` and `tile-local-aggregation`, both explicitly marked `raisesCap: false`.

`buildTileLocalPrepassBridge()` includes this summary as `budgetDiagnostics.capPressure`. The older top-level `budgetDiagnostics.retainedBands` and `budgetDiagnostics.droppedBands` fields are compatibility aliases to the same cap-pressure band counters, so one diagnostic object does not contain competing definitions of front/middle/back.

## Verification

- Fail-first: `npm run test:renderer -- --test-name-pattern cap-pressure` first failed because the retention summary module and refined projected-contributor fields were missing.
- Focused verification: `npm run test:renderer -- --test-name-pattern 'cap-pressure|budget overflow|CPU contributor arena preserves dense tile facts'`.
