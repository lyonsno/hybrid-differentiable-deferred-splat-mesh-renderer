# GPU Arena Smoke Witness

Packet: `metadosis/coordination-packets/meshsplat-gpu-contributor-arena-scalability_2026-05-02.md`
Lane: `heat-artifact-smoke-witness`
Renderer base: `origin/main@e06caed`

Status: witness-only reporting surface. This lane does not implement GPU arena construction, runtime selection, cap policy, renderer tuning, source decoding, or camera controls.

## Purpose

The witness report must keep scalability evidence visible while sibling lanes change how tile-local contributor arenas are built. A passing screenshot is not enough: the report must say which arena path produced the evidence, whether that path was CPU or GPU, whether the presentation was current or stale, and how many projected contributors were retained or dropped.

The current `--tile-local-diagnostics` report now emits an `arenaWitness` block under `classification.metrics` and a matching `Arena Construction Witness` section in `report.md`.

## Command

```bash
npm run smoke:visual:real -- --tile-local-diagnostics --out-dir /tmp/gpu-arena-smoke-witness --viewport 1280x720 --settle-ms 6000 --timeout-ms 30000
```

The command writes:

- `analysis.json`
- `report.md`
- `coverage-weight.png`
- `accumulated-alpha.png`
- `transmittance.png`
- `tile-ref-count.png`
- `conic-shape.png`

## Required Report Fields

The report preserves:

- presentation status: `current`, `stale-cache`, budget skip, or not reported;
- overflow reasons, especially `per-tile-ref-cap`;
- projected, retained, and dropped arena refs;
- CPU build duration in milliseconds;
- GPU construction dispatch duration when a real GPU arena path reports it;
- retained GPU buffer byte pressure when the current renderer exposes only buffer heat, not GPU construction;
- a CPU/GPU comparison status.

## CPU/GPU Comparison Semantics

The witness distinguishes three cases:

- `gpu-unavailable`: no GPU arena construction was reported. This is acceptable baseline evidence, not a GPU success.
- `improvement`: GPU dispatch is reported and is below 75 percent of the CPU build baseline.
- `regression`: GPU dispatch is reported and exceeds 125 percent of the CPU build baseline.
- `no-change`: GPU dispatch is reported but does not cross the improvement or regression thresholds.

The thresholds are report labels only. They do not close renderer fidelity, do not permit silent CPU fallback, and do not alter smoke pass/fail thresholds.

## Artifact Movement Semantics

The static dessert witness labels movement for:

- dessert holes;
- plate/background seepage;
- dense-scene near-plane obstruction.

Allowed movement labels are:

- `regression`
- `no-change`
- `improvement`
- `not-measured`

The fixed dessert view defaults dessert holes and plate seepage to `no-change` until a baseline-vs-current visual comparison is wired. Dense real-scene near-plane obstruction is `not-measured` in that fixed view because it belongs to a separate real-scene capture, not the dessert camera.

## Current Baseline Interpretation

On `origin/main@e06caed`, the live path still reports CPU arena construction. If the report shows:

- CPU backend `cpu-contributor-arena`;
- status `current`;
- projected refs greater than retained refs;
- nonzero dropped refs;
- GPU backend `not-reported`;
- comparison `gpu-unavailable`;

then the witness is doing the right thing: it is recording baseline CPU heat and cap pressure without claiming that the GPU skeleton is production arena construction.

## Forbidden Uses

Do not use this witness to justify:

- raising per-tile caps as the primary fix;
- hiding dropped-contributor evidence;
- presenting CPU fallback as GPU success;
- global opacity, brightness, source, camera, or color tuning;
- renderer production changes from this lane.
