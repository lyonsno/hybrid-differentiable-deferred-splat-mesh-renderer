import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const overlaySource = readFileSync(new URL("../src/splatOverlay.ts", import.meta.url), "utf8");

test("overlay applies setModelMatrix through effective model-view frame state", () => {
  assert.match(overlaySource, /function refreshEffectiveFrameMatrices\(/);
  assert.match(overlaySource, /currentModelView/);
  assert.match(overlaySource, /currentCameraModelLocal/);
  assert.match(overlaySource, /renderer\.shouldRefreshSort\(scene,\s*currentModelView/);
  assert.match(overlaySource, /renderer\.encodeSort\(scene,\s*encoder,\s*currentModelView/);
  assert.match(overlaySource, /viewMatrix:\s*currentModelView/);
  assert.match(overlaySource, /cameraPosition:\s*currentCameraModelLocal/);
});
