import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("overlay advertises renderer-applied crop support and telemetry", async () => {
  const source = await readFile(new URL("../src/splatOverlay.ts", import.meta.url), "utf8");

  assert.match(source, /cropAppliedByRenderer:\s*true/);
  assert.match(source, /cropStatus/);
  assert.match(source, /correctionApplication/);
  assert.match(source, /get cropAppliedByRenderer\(\)/);
  assert.match(source, /setCorrectionIdentity[\s\S]*applySplatCorrectionToAttributes/);
  assert.doesNotMatch(source, /does not filter vertices/);
});
