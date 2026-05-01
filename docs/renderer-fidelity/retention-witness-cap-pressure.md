# Retention Witness Cap-Pressure Baseline

Packet: `metadosis/coordination-packets/meshsplat-tile-ref-cap-pressure-retention_2026-05-01.md`
Lane: `retention-witness`
Renderer baseline: `origin/cc/double-attenuated-conic-seepage-integration-0501@ef3e64b`
Evidence: `smoke-reports/retention-witness-baseline-ef3e64b/`

Status: baseline captured. The bounded retention implementation branch was not present on the renderer remote when this witness ran, so after-fix deltas remain pending.

## Baseline Capture

Command:

```sh
npm run smoke:visual:real -- --static-dessert-witness --out-dir /tmp/retention-witness-baseline-ef3e64b --viewport 1280x720 --settle-ms 6000 --timeout-ms 30000
```

Result: `PASS: static dessert final color and debug witnesses share one asset, viewport, and tile grid.`

The fixed dessert view is `1280x720` with a `214x120` tile grid. It retained `77,221` tile refs after cap out of `3,286,010` projected tile refs, evicting `3,208,789` refs. `1,937` tiles were capped, `1,952` retained tiles saturated at the cap, max projected refs per tile was `7,231`, max retained refs per tile was `32`, and header accounting matched retained refs.

Alpha and transmittance debug evidence is present at the frame level: estimated max accumulated alpha is `1` and estimated min transmittance is `0`. Conic-shape evidence is also present: max major radius is `57.208888px`, min minor radius is `1.5px`, and max anisotropy is `19.643924`.

## Visual Synthesis

The baseline final-color capture still shows porous dessert structure and plate/background seepage. The tile-ref-count heatmap shows cap-saturated density over the artifact region, matching the packet's cap-pressure hypothesis. Because the bounded retention branch was unavailable, this lane cannot yet classify holes or plate seepage as improved, regressed, or unchanged relative to the repair.

The after-fix comparison should rerun the same static dessert witness command on the bounded retention branch, compare against `smoke-reports/retention-witness-baseline-ef3e64b/analysis.json`, and report whether retained contributors increased in the artifact region with matching final-color, tile-ref-count, coverage, alpha/transmittance, and conic-shape evidence.
