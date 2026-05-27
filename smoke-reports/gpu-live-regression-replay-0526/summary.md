# GPU Live Regression Replay Summary - 2026-05-26

## Purpose

Replay the recent GPU live/operator witness boundary after the operator challenged the claim that current `0 refs` was not alarming. The goal was to verify whether prior GPU live visual evidence really existed, identify the commit where direct-GPU live output went blank, and preserve quick-return notes for follow-up repair.

## Verdict

- Prior GPU live image evidence was real, not a memory artifact.
- `73d4028` (`Add GPU live parity mugshot witness`) produces GPU live images, but still reports the old retained-ref impostor shape: direct-GPU refs at `921600` for `1280x720`.
- `76fa098` (`Expose GPU live retained-ref accounting`) produces GPU live images and exposes nonzero readback retained refs.
- `78ac218` (`Fix CPU tile-local visible dispatch`) is the first replayed bad commit: CPU reference captures remain populated, but direct-GPU live captures are blank with `retainedRefs = 0`, `projectedScatterRefs = 0`, and `changedPixels = 0`.
- The regression boundary is therefore `76fa098..78ac218`, and the likely causal site is the `src/main.ts` dispatch change from `pipeline.dispatch(...)` to `pipeline.dispatchComposite(...)` for `scene.rendererMode === "tile-local-visible"` when `gpuArenaRuntime` is absent.

## Replayed Commits

### `73d4028` - `Add GPU live parity mugshot witness`

Operator loop:

- Command: `node scripts/run-visual-smoke.mjs --operator-witness-loop --report-dir smoke-reports/replay-73d4028-operator-loop-0526 --timeout-ms 60000`
- Result: PASS.
- Report: `smoke-reports/replay-73d4028-operator-loop-0526/report.md`
- Contact sheet: `smoke-reports/replay-73d4028-operator-loop-0526/operator-witness-contact-sheet.png`
- Key evidence: whole render, close crops, and orbit captures were nonblank.
- Direct-GPU refs were still reported as `921600`, matching the known full-canvas impostor smell.

Mugshot:

- Command: `node scripts/run-visual-smoke.mjs --gpu-live-parity-mugshot --report-dir smoke-reports/replay-73d4028-mugshot-0526 --timeout-ms 60000`
- Result: PASS.
- Report: `smoke-reports/replay-73d4028-mugshot-0526/report.md`
- Contact sheet: `smoke-reports/replay-73d4028-mugshot-0526/gpu-live-parity-mugshot-contact-sheet.png`
- Key evidence: CPU/GPU same-view pairs were produced; direct-GPU captures were nonblank; primary divergence was `tile-ref-population-divergence`.
- Example refs: CPU whole `61643`, CPU porous `412939`, GPU direct `921600`.

### `76fa098` - `Expose GPU live retained-ref accounting`

Operator loop:

- Command: `node scripts/run-visual-smoke.mjs --operator-witness-loop --report-dir smoke-reports/replay-76fa098-operator-loop-0526 --timeout-ms 60000`
- Result: PASS.
- Report: `smoke-reports/replay-76fa098-operator-loop-0526/report.md`
- Contact sheet: `smoke-reports/replay-76fa098-operator-loop-0526/operator-witness-contact-sheet.png`
- Key evidence: captures were nonblank and now exposed nonzero live retained readback through `gpu-scatter-cursor-readback`.
- Readback retained refs:
  - whole-render: `81942`
  - dessert-close: `495371`
  - porous-close: `729200`
  - orbit-left: `726031`
  - orbit-right: `734386`
- Remaining smell: `allocatedRefs` and `estimatedRetainedRefs` still showed `921600`, but retained/projected readback became meaningful.

Mugshot:

- Command: `node scripts/run-visual-smoke.mjs --gpu-live-parity-mugshot --report-dir smoke-reports/replay-76fa098-mugshot-0526 --timeout-ms 60000`
- Result: PASS.
- Report: `smoke-reports/replay-76fa098-mugshot-0526/report.md`
- Contact sheet: `smoke-reports/replay-76fa098-mugshot-0526/gpu-live-parity-mugshot-contact-sheet.png`
- Key evidence: CPU reference and direct-GPU captures both produced same-view image payloads; direct-GPU refs were nonzero from readback.
- Direct-GPU readback retained refs:
  - whole-render: `81942`
  - dessert-close: `495371`
  - porous-close: `729200`

### `78ac218` - `Fix CPU tile-local visible dispatch`

Operator loop:

- Command: `node scripts/run-visual-smoke.mjs --operator-witness-loop --report-dir smoke-reports/replay-78ac218-operator-loop-0526 --timeout-ms 60000`
- Result: FAIL.
- Report: `smoke-reports/replay-78ac218-operator-loop-0526/report.md`
- Contact sheet: `smoke-reports/replay-78ac218-operator-loop-0526/operator-witness-contact-sheet.png`
- Timeout image: `smoke-reports/replay-78ac218-operator-loop-0526/whole-render-final-color-timeout.png`
- Direct evidence: first capture blanked out with `changedPixels = 0`, `tileLocal.refs = 0`, `retainedRefs = 0`, `projectedScatterRefs = 0`, `projectedRefs = 0`.

Mugshot:

- Command: `node scripts/run-visual-smoke.mjs --gpu-live-parity-mugshot --report-dir smoke-reports/replay-78ac218-mugshot-0526 --timeout-ms 60000`
- Result: FAIL.
- Report: `smoke-reports/replay-78ac218-mugshot-0526/report.md`
- Contact sheet: `smoke-reports/replay-78ac218-mugshot-0526/gpu-live-parity-mugshot-contact-sheet.png`
- CPU reference evidence still populated:
  - whole-render CPU changed pixels: `41703`, refs: `61643`
  - dessert-close CPU changed pixels: `345326`, refs: `61643`
  - porous-close CPU changed pixels: `920769`, refs: `412939`
- Direct-GPU evidence failed:
  - whole-render direct GPU changed pixels: `0`
  - direct GPU `tileLocal.refs = 0`
  - direct GPU `retainedRefs = 0`
  - direct GPU `projectedScatterRefs = 0`

## Boundary Diff

The `76fa098..78ac218` diff is only:

- `src/main.ts`: one dispatch change.
- `tests/renderer/runtimeCompactSourceBypass.test.mjs`: contract string/test expectation update.

Critical code change:

```diff
} else if (scene.rendererMode === "tile-local-visible") {
-  tileLocalState.pipeline.dispatch(tileLocalComputePass, tileLocalState.bindGroup, tileLocalState.plan);
+  tileLocalState.pipeline.dispatchComposite(tileLocalComputePass, tileLocalState.bindGroup, tileLocalState.plan);
} else {
```

Interpretation: the change is correct for CPU-populated tile refs, but it appears to route the direct-GPU live witness through a composite-only path before any GPU projection/scatter build has populated live refs. That collapses direct-GPU retained/projected readback to zero while CPU reference captures still work.

## Extra Harness Finding

The single-default visual smoke path on current main hit an independent harness bug:

```text
ReferenceError: timeoutMs is not defined
```

Observed at `scripts/run-visual-smoke.mjs:225` in the default single-smoke path while calling `collectPageEvidenceWithTimeout(page, timeoutMs)`. The operator-loop and mugshot paths still ran, so this did not block the bisect, but it should be repaired separately.

## Follow-Up Shape

Repair target should preserve both invariants:

- CPU-backed `tile-local-visible` without a GPU contributor arena must composite prebuilt CPU refs without clearing/rebuilding them.
- Direct-GPU live/operator witness route must still run the GPU projection/scatter/build stage before compositor readback; it must not be sent through composite-only dispatch with empty live buffers.

The immediate next slice should introduce an explicit dispatch predicate or mode distinction instead of overloading `scene.rendererMode === "tile-local-visible"` for both CPU-backed visible composition and direct-GPU live construction.

## Repair Confirmation

Applied repair:

- `src/main.ts` now gates composite-only dispatch behind `scene.rendererMode === "tile-local-visible" && tileLocalState.arenaBackend === "cpu"`.
- Requested/effective GPU live state with `gpuArenaRuntime === null` falls through to the full tile coverage dispatch, restoring clear/build/composite before readback.

Focused tests:

- Command: `npm test -- --runInBand tests/renderer/runtimeCompactSourceBypass.test.mjs`
- Result: PASS.
- Note: repo script forwarded the filter imperfectly and ran the broader unit/renderer suites; observed `232` renderer tests passing, including the new dispatch ownership checks.

Repair smokes:

- Command: `node scripts/run-visual-smoke.mjs --operator-witness-loop --report-dir smoke-reports/replay-78ac218-dispatch-repair-operator-loop-0526 --timeout-ms 60000`
- Result: PASS.
- Direct-GPU retained refs returned:
  - whole-render: `81942`
  - dessert-close: `495371`
  - porous-close: `729200`
  - orbit-left: `726031`
  - orbit-right: `734386`

- Command: `node scripts/run-visual-smoke.mjs --gpu-live-parity-mugshot --report-dir smoke-reports/replay-78ac218-dispatch-repair-mugshot-0526 --timeout-ms 60000`
- Result: PASS.
- Direct-GPU retained refs returned:
  - whole-render: `81942`
  - dessert-close: `495371`
  - porous-close: `729200`

Remaining known caveat:

- Primary CPU/GPU divergence remains `tile-ref-population-divergence`; this slice restores live GPU witness viability and does not claim visual parity.
