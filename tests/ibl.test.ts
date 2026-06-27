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

test("deferred lighting applies scene exposure before tonemapping", async () => {
  const shader = await readFile(SHADER_PATH, "utf8");

  assert.match(shader, /exposure:\s*f32/);
  assert.match(shader, /let exposed = envColor \* params\.exposure;/);
  assert.match(shader, /let exposed = color \* params\.exposure;/);
});

test("projection shader transforms normals into the lighting frame", async () => {
  const shader = await readFile(new URL("../src/shaders/gpu_project_splats.wgsl", import.meta.url), "utf8");

  assert.match(shader, /normalMatrix:\s*mat3x3f/);
  assert.doesNotMatch(
    shader,
    /octEncode\(splatNormal\)/,
    "asset-local normals must not be oct-encoded before the host/model normal matrix is applied",
  );
  assert.match(
    shader,
    /octEncode\(normalize\(frame\.normalMatrix \* splatNormal\)\)/,
    "covariance, baked, and detail-perturbed normals must all be transformed at the final G-buffer write",
  );
});
