import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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

  assert.match(source, /## Smoke Handoff/);
  assert.match(source, /Smoke kind:/);
  assert.match(source, /Decision requested:/);
  assert.match(source, /Expected visual delta:/);
  assert.match(source, /Evidence surface:/);
  assert.match(source, /smokeHandoff/);
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
