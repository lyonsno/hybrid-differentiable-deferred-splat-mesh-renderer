# GPU Retained Source Effective Feed Review Probolé

Review branch `cc/gpu-retained-source-effective-feed-0531` against
`origin/main`.

Scope:

- Review only the compact retained-source election handoff patch:
  - `src/main.ts`
  - `tests/renderer/gpuTileContributorArenaProduction.test.mjs`
  - `tests/smoke/operator-witness-loop.test.mjs`
- Do not edit files, mutate Epístaxis state, launch new lanes, or broaden into
  production visual repair, camera work, compositor policy, conic calibration,
  alpha repair, or WGSL source construction.

Intent:

- The live compact retained-source route still streams CPU projected candidate
  records for observability and oracle custody.
- This patch routes the final bounded retained-row election through the
  deterministic GPU projection-retention carrier instead of directly calling
  the compact CPU selector in the live finalize stage.
- This is a substrate/custody step toward GPU source construction. It must not
  claim that projected-ref streaming is already WGSL-owned.

Review questions:

- Does `buildCompactRetainedRecordsWithGpuCarrier` preserve projected,
  retained, and dropped header accounting, including per-tile retained offsets,
  retained counts, projected counts, dropped counts, and max retained view rank?
- Does grouping all bounded candidate records before carrier election preserve
  the compact election law without introducing accidental dense all-tile
  traversal, cap inflation, order drift, duplicate identity collapse, or stale
  per-tile records?
- Are `coverageRecords`, `retentionRecords`, `occlusionRecords`,
  `supportSampleRecords`, and `supportSampleRecordGroups` passed to the carrier
  in a way that preserves the compact election's candidate source semantics?
- Does the resulting retained list remain sorted in compositor order before
  being packed for the runtime?
- Do the updated custody labels truthfully distinguish CPU projected-candidate
  streaming, deterministic GPU retention-carrier election, CPU oracle/reference
  ownership, and the remaining `wgsl-projected-ref-stream` follow-on?
- Would the updated structural tests fail if the live path silently fell back to
  CPU retained-record election or falsely claimed full GPU/WGSL source
  construction?
- Is the memory/performance cost of collecting bounded candidate lists across
  buckets acceptable for this slice, or does it create a new obvious blocker?

Known local verification before review:

- Initial Aposképsis review of this probolé returned `needs repair` because
  the carrier filtered global candidate-source arrays once per tile, producing
  a quadratic finalize shape.
- The current branch repairs that by indexing candidate sources by tile once
  inside the carrier before the tile loop and adds a structural regression test
  for that shape.
- `npm run build`
  - passing.
- `npm run test:unit`
  - passing: 39/39.
- `npm run test:renderer`
  - passing: 245/245.
- `node --test tests/smoke/operator-witness-loop.test.mjs`
  - passing: 35/35.
- Initial parallel `npm run test:smoke`
  - failed only in the browser shape-gate group after Chromium/WebGPU device
    loss while other broad jobs were running.
- `node --test tests/smoke/pixel-shape-gate.test.mjs`
  - passing: 20/20.
- Clean serial `npm run test:smoke`
  - passing: 193/193.
- `git diff --check`
  - passing.

Known caveats:

- This patch is not a visual-quality repair.
- This patch is not WGSL projected-ref stream construction.
- The older bounded compact reference helper still exists for non-live/reference
  paths; do not require this slice to erase every CPU selector call unless it is
  on the current live compact source path or creates a false custody claim.
- The earlier failed Aposképsis launch for this branch had no durable probolé
  and should not count as review.

Expected review output:

- Findings first, ordered by severity, with file/line references.
- If no blocking findings, state that clearly.
- Include open questions, residual risks, test-gap notes, and a verdict:
  `clean`, `needs repair`, or `do not land`.
