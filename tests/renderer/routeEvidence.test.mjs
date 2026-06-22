import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

test("renderer exposes route evidence for URL sidecar and drag-drop no-sidecar paths", () => {
  assert.match(mainSource, /__MESH_SPLAT_ROUTE_EVIDENCE__/);
  assert.match(mainSource, /url-sidecar/);
  assert.match(mainSource, /drag-drop-no-sidecar/);
  assert.match(mainSource, /sidecarAttempted/);
  assert.match(mainSource, /sidecarFound/);
  assert.match(mainSource, /sourceCount/);
  assert.match(mainSource, /displayCount/);
  assert.match(mainSource, /cropFrame/);
});

test("evil orb route witness records both renderer routes with screenshots and analysis", () => {
  const witnessSource = readFileSync(new URL("../../scripts/evil-orb-route-witness.mjs", import.meta.url), "utf8");

  assert.match(witnessSource, /url-sidecar/);
  assert.match(witnessSource, /drag-drop-no-sidecar/);
  assert.match(witnessSource, /__MESH_SPLAT_ROUTE_EVIDENCE__/);
  assert.match(witnessSource, /analysis\.json/);
  assert.match(witnessSource, /url-sidecar\.png/);
  assert.match(witnessSource, /drag-drop-no-sidecar\.png/);
});
