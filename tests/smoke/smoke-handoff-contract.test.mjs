import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildSmokeHandoff,
  parseSmokeKind,
  renderSmokeHandoffSection,
} from "../../scripts/visual-smoke/smoke-handoff.mjs";

const smokeSource = () => readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

test("visual smoke CLI exposes smoke handoff contract metadata flags", () => {
  const source = smokeSource();

  assert.match(source, /--smoke-kind/);
  assert.match(source, /--decision-requested/);
  assert.match(source, /--expected-visual-delta/);
  assert.match(source, /--evidence-surface/);
});

test("visual smoke reports include the smoke handoff frame", () => {
  const source = smokeSource();

  assert.match(source, /renderSmokeHandoffSection/);
  assert.match(source, /smokeHandoff/);
});

test("smoke handoff defaults visual and telemetry decisions without losing caller overrides", () => {
  assert.deepEqual(buildSmokeHandoff({}), {
    smokeKind: "visual",
    decisionRequested: "Decide whether this smoke satisfies the branch-specific evidence contract.",
    expectedVisualDelta: "not specified",
    evidenceSurface: "report.md, analysis.json, page evidence, and captured canvas screenshot",
  });

  assert.deepEqual(buildSmokeHandoff({ smokeKind: "telemetry" }), {
    smokeKind: "telemetry",
    decisionRequested: "Decide whether this smoke satisfies the branch-specific evidence contract.",
    expectedVisualDelta: "none expected",
    evidenceSurface: "report.md, analysis.json, page evidence, and captured canvas screenshot",
  });

  assert.deepEqual(
    buildSmokeHandoff(
      { smokeKind: "telemetry", decisionRequested: "confirm traces", evidenceSurface: "analysis.json anchors" },
      { expectedVisualDelta: "default visual claim" }
    ),
    {
      smokeKind: "telemetry",
      decisionRequested: "confirm traces",
      expectedVisualDelta: "default visual claim",
      evidenceSurface: "analysis.json anchors",
    }
  );
});

test("smoke kind parser rejects labels outside the repo-local contract", () => {
  assert.equal(parseSmokeKind("visual"), "visual");
  assert.equal(parseSmokeKind("telemetry"), "telemetry");
  assert.throws(() => parseSmokeKind("diagnostic"), /Invalid smoke kind diagnostic/);
});

test("smoke handoff markdown renders the exact report fields operators consume", () => {
  assert.equal(
    renderSmokeHandoffSection({
      smokeKind: "telemetry",
      decisionRequested: "confirm traces",
      expectedVisualDelta: "none expected",
      evidenceSurface: "analysis.json anchors",
    }),
    `## Smoke Handoff

- Smoke kind: telemetry
- Decision requested: confirm traces
- Expected visual delta: none expected
- Evidence surface: analysis.json anchors
`
  );
});

test("visual smoke docs describe telemetry handoff flags", () => {
  const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
  const contract = readFileSync(new URL("../../docs/smoke/smoke-handoff-contract.md", import.meta.url), "utf8");

  assert.match(readme, /--smoke-kind telemetry/);
  assert.match(contract, /--smoke-kind/);
  assert.match(contract, /--decision-requested/);
  assert.match(contract, /--expected-visual-delta/);
  assert.match(contract, /--evidence-surface/);
});
