import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

function destroySplatSceneSource() {
  const match = mainSource.match(/function destroySplatScene\(scene: ActiveSplatScene \| null\): void \{[\s\S]*?\n\}/);
  assert.ok(match, "destroySplatScene must remain visible to lifecycle tests");
  return match[0];
}

test("compute compositor state records all GPU textures that require destruction", () => {
  const activeSceneMatch = mainSource.match(/interface ActiveSplatScene \{[\s\S]*?\n\}/);
  assert.ok(activeSceneMatch, "ActiveSplatScene must remain visible to lifecycle tests");
  const activeScene = activeSceneMatch[0];

  assert.match(activeScene, /gbufferDepthTexture: GPUTexture;/);
  assert.match(activeScene, /gbufferNormalTexture: GPUTexture;/);
  assert.match(activeScene, /litTexture: GPUTexture;/);
  assert.match(activeScene, /lastSortedViewProj: Float32Array \| null;/);
  assert.match(activeScene, /hasSortedRefs: boolean;/);
});

test("destroySplatScene releases compute compositor resources and textures", () => {
  const destroySource = destroySplatSceneSource();

  assert.match(destroySource, /scene\.computeCompositor\.resources\.destroy\(\);/);
  assert.match(destroySource, /scene\.computeCompositor\.outputTexture\.destroy\(\);/);
  assert.match(destroySource, /scene\.computeCompositor\.gbufferDepthTexture\.destroy\(\);/);
  assert.match(destroySource, /scene\.computeCompositor\.gbufferNormalTexture\.destroy\(\);/);
  assert.match(destroySource, /scene\.computeCompositor\.litTexture\.destroy\(\);/);
});
