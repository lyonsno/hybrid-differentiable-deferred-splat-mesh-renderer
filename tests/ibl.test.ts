import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const SHADER_PATH = new URL("../src/shaders/gpu_deferred_lighting.wgsl", import.meta.url);

test("deferred equirect sampling maps +Y to HDR top and -Y to HDR bottom", async () => {
  const shader = await readFile(SHADER_PATH, "utf8");
  const match = shader.match(/let v = ([^;]+);/);

  assert.ok(match, "deferred lighting shader must compute equirect v coordinate explicitly");
  assert.equal(
    match[1].trim(),
    "0.5 - asin(clamp(rotDir.y, -1.0, 1.0)) / PI",
    "standard HDR lat-long convention maps world +Y to v=0 and world -Y to v=1",
  );
});
