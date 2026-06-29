import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const SHADER_PATH = new URL("../src/shaders/gpu_deferred_lighting.wgsl", import.meta.url);

test("deferred equirect sampling maps +Y to HDR top and -Y to HDR bottom", async () => {
  const shader = await readFile(SHADER_PATH, "utf8");
  const envSampler = shader.match(/fn sampleEnvEquirectLod[\s\S]+?return textureSampleLevel/);
  assert.ok(envSampler, "deferred lighting shader must define equirect environment sampling");
  const match = envSampler[0].match(/let v = ([^;]+);/);

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

test("GTAO transforms world normals with the lighting view matrix, not model-composed projection view", async () => {
  const renderer = await readFile(new URL("../src/splatRenderer.ts", import.meta.url), "utf8");
  const overlay = await readFile(new URL("../src/splatOverlay.ts", import.meta.url), "utf8");

  assert.match(renderer, /lightingViewMatrix\?:\s*Float32Array/);
  assert.match(renderer, /const lightingViewMatrix = params\.lightingViewMatrix \?\? params\.viewMatrix;/);
  assert.match(
    renderer,
    /params\.projMatrix,\s*\n\s*lightingViewMatrix,/,
    "GTAO receives host lighting view for world-normal transformation instead of view*model",
  );
  assert.match(overlay, /lightingViewMatrix:\s*currentLightingView/);
});

test("deferred lighting and GTAO face visible splat normals toward the camera", async () => {
  const deferred = await readFile(new URL("../src/shaders/gpu_deferred_lighting.wgsl", import.meta.url), "utf8");
  const gtao = await readFile(new URL("../src/shaders/gtao_main.wgsl", import.meta.url), "utf8");

  assert.match(deferred, /fn faceForwardNormal\(normal:\s*vec3f,\s*viewDir:\s*vec3f\)\s*->\s*vec3f/);
  assert.match(deferred, /let Nraw = octDecode\(unpack2x16float\(packedNormal\)\);/);
  assert.match(deferred, /let N = faceForwardNormal\(Nraw,\s*V\);/);

  assert.match(gtao, /fn faceForwardNormal\(normal:\s*vec3f,\s*viewDir:\s*vec3f\)\s*->\s*vec3f/);
  assert.match(gtao, /let viewNormalRaw = normalize\(\(params\.viewMatrix \* vec4f\(worldNormal,\s*0\.0\)\)\.xyz\);/);
  assert.match(gtao, /let viewDir = normalize\(-viewPos\);/);
  assert.match(gtao, /let viewNormal = faceForwardNormal\(viewNormalRaw,\s*viewDir\);/);
});
