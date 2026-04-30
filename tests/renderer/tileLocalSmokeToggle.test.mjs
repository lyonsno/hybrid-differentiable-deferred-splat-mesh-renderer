import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("main wires a smoke-toggleable tile-local prepass beside the plate fallback", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /selectedRendererMode/);
  assert.match(source, /params\.get\("renderer"\)\s*===\s*"tile-local"/);
  assert.match(source, /createGpuTileCoveragePipelineSkeleton/);
  assert.match(source, /tileCoverageWeightBuffer/);
  assert.match(source, /renderer: \$\{scene\.rendererMode\}/);
  assert.match(source, /createSplatPlateRenderer/);
});
