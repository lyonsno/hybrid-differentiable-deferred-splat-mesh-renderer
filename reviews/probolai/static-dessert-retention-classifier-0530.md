# Static Dessert Retention Classifier Review Probolé

Review branch `cc/static-dessert-visible-alpha-repair-0530` against base
`origin/main` / `main`.

Scope:

- Review only the retained-to-ordered survival ledger classification patch:
  - `src/rendererFidelityProbes/retainedToOrderedSurvivalLedger.js`
  - `src/rendererFidelityProbes/retainedToOrderedSurvivalLedger.d.ts`
  - `tests/renderer/retainedToOrderedSurvivalLedger.test.mjs`
- Do not review or require production renderer visual repair in this slice.
- Do not edit files, mutate Epistaxis state, run broad unrelated commands, or
  broaden into retention election, alpha transfer, conic, camera, or compositor
  repair.

Intent:

- Static dessert visual-gap anchors were being classified as weak final alpha
  even when pixel-strong projected foreground contributors existed before tile
  retention and were absent from the retained slate.
- The ledger should expose that mechanism directly as
  `projected-foreground-dropped-before-retention`, so the next production
  repair targets retention election/source starvation instead of alpha transfer.
- This patch should change diagnostic witness language and structured evidence
  only. It must not change live renderer output.

Review questions:

- Is the new category ordered correctly before `narrower-role-source-blocker`
  and `ordered-present-final-alpha-weak`, without masking genuine weak-alpha
  cases?
- Is the comparison between dropped projected foreground occlusion weight and
  retained foreground occlusion weight a sound, bounded classifier for this
  witness layer?
- Are `ids`, `counts`, `metrics`, returned evidence arrays, and TypeScript
  declarations consistent and complete?
- Does the new test capture the pre-fix ambiguity and the intended priority over
  weak-alpha classification?
- Does the patch preserve the distinction between diagnostic classification and
  production visual repair?

Known local verification before review:

- `node --test tests/renderer/retainedToOrderedSurvivalLedger.test.mjs tests/smoke/static-dessert-witness.test.mjs`
- `npm run build`
- `npm run test:smoke`
- Static dessert smoke:
  `node scripts/run-visual-smoke.mjs --static-dessert-witness --report-dir smoke-reports/static-dessert-visible-alpha-repair-0530-retention-classifier --timeout-ms 120000`

Expected review output:

- Findings first, ordered by severity, with file/line references.
- If no blocking findings, state that clearly.
- Include residual risk and test-gap notes even if non-blocking.
