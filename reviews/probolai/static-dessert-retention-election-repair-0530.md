# Static Dessert Retention Election Repair Review Probolé

Review branch `cc/static-dessert-retention-election-repair-0530` in worktree
`/private/tmp/hybrid-differentiable-defferred-splat-mesh-renderer-landing-main-0528`
against `origin/main` / `main`.

Scope:

- Review only the compact-source retention election patch:
  - `src/compactRetentionElection.js`
  - `src/compactRetentionElection.d.ts`
  - `src/gpuTileCoverage.ts`
  - `src/main.ts`
  - `tests/renderer/compactRetentionElection.test.mjs`
  - `tests/smoke/operator-witness-loop.test.mjs`
- Treat the untracked `smoke-reports/` directories as evidence only. Do not ask
  to land generated smoke payloads.
- Do not edit files, mutate Epistaxis state, launch new lanes, or broaden into
  production visual quality, camera, compositor, conic, alpha, or GPU radix work.

Intent:

- Static dessert visual-gap traces showed pixel-strong projected foreground
  contributors were being dropped before retention.
- The patch changes compact-source tile retention from mostly top-weight
  election to a bounded, balanced slate:
  - coverage, retention, occlusion, and tile-local support candidates are kept;
  - per-sample support records add spatial coverage inside each tile;
  - final selection gives coverage/retention/occlusion priority pools hard
    seats before bounded support-sample backfill.
- This is allowed to change live/static tile-local visual output. It should not
  change source decode, trace semantics, cap semantics, camera behavior, or
  renderer route identity.

Review questions:

- Does `supportSampleWeight` / `supportSampleRetentionWeight` preserve custody
  and remain tile-local, or does it leak witness/trace-specific knowledge into
  production selection?
- Is `compactRetainSupportSampleRecords` bounded and deterministic under large
  splat/tile populations?
- Is the `maxRefsPerTile / samplesPerAxis` per-sample retention limit coherent
  with the final per-tile cap, and does it avoid accidental cap inflation?
- Does `compactProjectionBalancedRetentionRecords` preserve stable ordering,
  dedupe identity, and the distinction between source-presentation selection and
  trace/readback evidence?
- Does the final election prevent support samples from dominating the retained
  slate when coverage/retention/occlusion candidates are available?
- Is the luminance-derived color-aware support priority defensible, or can it
  bias retention toward visually bright but geometrically irrelevant
  contributors?
- Are the updated smoke tests structural enough to catch regressions without
  overfitting the current bad image?
- Is the performance profile acceptable for this slice, or is the support sample
  path a new blocker?
- Does the latest evidence justify landing as a visual-moving bounded repair
  while still explicitly resisting false closure on final image quality?

Known local verification before review:

- `node --test tests/smoke/operator-witness-loop.test.mjs tests/renderer/retainedToOrderedSurvivalLedger.test.mjs tests/smoke/static-dessert-witness.test.mjs`
  - 64/64 passing.
- `npm run build`
  - passing.
- `npm test`
  - 278/278 passing after the bounded support-quota repair.
- `git diff --check`
  - passing.

Relevant smoke evidence:

- Baseline:
  `smoke-reports/static-dessert-visible-alpha-repair-0530-retention-classifier-rereview/report.md`
  - all three visual-gap anchors classified as
    `projected-foreground-dropped-before-retention`.
- Latest:
  `smoke-reports/static-dessert-retention-election-repair-0530-color-aware-support/report.md`
  - tile-local changed pixels: 3.690%;
  - changed pixel ratio: 1.0829;
  - one derived visual-gap anchor now classified as
    `ordered-present/retained-foreground-identity-survives-to-final-accumulation`;
  - remaining anchors still expose retention/source failure;
  - latest trace route timing recorded total 1857.8ms, with
    `compact-source-stream-retention` 1539.3ms.
- Review-fix:
  `smoke-reports/static-dessert-retention-election-repair-0530-balanced-quota-reviewfix/report.md`
  - tile-local changed pixels: 3.689%;
  - changed pixel ratio: 1.0827;
  - two of three visual-gap anchors now classify as
    `ordered-present/retained-foreground-identity-survives-to-final-accumulation`;
  - one anchor still classifies as
    `projected-foreground-dropped-before-retention`;
  - representative final-color route timing recorded total 881ms, with
    `compact-source-stream-retention` 727.1ms and
    `compact-source-finalize-retained` 42.5ms.

Known caveats:

- The output is still visually bad; this slice is not a final image-quality
  repair.
- `trace-canvas-mismatch` remains present in the latest report, so do not treat
  exact pixel parity as proven.
- The latest visual result is dramatically different enough to justify operator
  smoke after review, but the review should decide whether the patch is safe to
  land first.
- A prior Aposkepsis pass returned `needs repair` because support samples could
  dominate the retained slate and because support construction cost was too
  high. The current patch is the bounded support-quota repair for that finding.

Expected review output:

- Findings first, ordered by severity, with file/line references.
- If no blocking findings, state that clearly.
- Include open questions, residual risk, test-gap notes, and a verdict:
  `clean`, `needs repair`, or `do not land`.
