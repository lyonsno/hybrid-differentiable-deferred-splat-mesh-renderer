import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

test("renderer exposes Handy sidecar load log for page-level witnesses", () => {
  assert.match(mainSource, /__MESH_SPLAT_SIDECAR_LOAD_LOG__/);
  assert.match(mainSource, /handy-renderman\.sidecar-load-log\.v0/);
  assert.match(mainSource, /sidecarFound/);
  assert.match(mainSource, /rawSplatCount/);
  assert.match(mainSource, /postCropCount/);
});

test("evil orb route witness compares sidecar and nosidecar routes with screenshots and analysis", () => {
  const witnessSource = readFileSync(new URL("../../scripts/evil-orb-route-witness.mjs", import.meta.url), "utf8");

  assert.match(witnessSource, /sidecar/);
  assert.match(witnessSource, /nosidecar/);
  assert.match(witnessSource, /__MESH_SPLAT_SIDECAR_LOAD_LOG__/);
  assert.match(witnessSource, /analysis\.json/);
  assert.match(witnessSource, /sidecar\.png/);
  assert.match(witnessSource, /nosidecar\.png/);
});
