import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("source radiance is a top-level frame route that bypasses deferred work", async () => {
  const renderer = await readFile(new URL("../src/splatRenderer.ts", import.meta.url), "utf8");
  assert.match(renderer, /import sourceRadianceShader from "\.\/shaders\/gpu_source_radiance\.wgsl\?raw"/);
  assert.match(renderer, /function createSourceRadiancePass\(device: GPUDevice\)/);
  assert.match(
    renderer,
    /if \(params\.presentationMode === "source-radiance"\) \{[\s\S]+?sourceRadiance\.encode\([\s\S]+?return;[\s\S]+?\}[\s\S]+?screenSpaceNormals\.encode\(/,
    "source radiance must return before normal recovery, GTAO, bloom, material curves, and deferred lighting",
  );
  assert.doesNotMatch(renderer, /params\.sourceColorPreview \? 1\.0 : 0\.0/);
});

test("source radiance copy shader preserves compositor RGB and alpha", async () => {
  const shader = await readFile(new URL("../src/shaders/gpu_source_radiance.wgsl", import.meta.url), "utf8");
  assert.match(shader, /let sourceRadiance = textureLoad\(sourceColor, px, 0\);/);
  assert.match(shader, /textureStore\(outputRadiance, px, sourceRadiance\);/);
  assert.doesNotMatch(shader, /normal|roughness|metal|ao|exposure|tonemap/i);
});
