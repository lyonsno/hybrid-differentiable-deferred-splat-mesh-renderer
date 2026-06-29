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
  assert.match(shader, /fn faceForwardNormal\(normal:\s*vec3f,\s*viewDir:\s*vec3f\)\s*->\s*vec3f/);
  assert.doesNotMatch(
    shader,
    /octEncode\(splatNormal\)/,
    "asset-local normals must not be oct-encoded before the host/model normal matrix is applied",
  );
  assert.match(
    shader,
    /let normalViewDir = normalize\(frame\.cameraPos - center\);/,
    "projection must compare normals with the asset-local camera vector before tile blending",
  );
  assert.match(
    shader,
    /let facedSplatNormal = faceForwardNormal\(splatNormal,\s*normalViewDir\);/,
    "per-splat normal orientation must be stabilized before G-buffer averaging",
  );
  assert.match(
    shader,
    /let worldNormal = normalize\(frame\.normalMatrix \* facedSplatNormal\);/,
    "faced asset-local normals must still be transformed into the host lighting frame",
  );
  assert.match(
    shader,
    /octEncode\(worldNormal\)/,
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

test("screen-space normal recovery only replaces grazing baked normals", async () => {
  const shader = await readFile(new URL("../src/shaders/gpu_screen_space_normals.wgsl", import.meta.url), "utf8");
  const renderer = await readFile(new URL("../src/splatRenderer.ts", import.meta.url), "utf8");

  assert.match(shader, /sourceNormalTexture:\s*texture_2d<u32>/);
  assert.match(shader, /recoveryMode:\s*f32/);
  assert.match(shader, /let sourceNdotV = max\(dot\(sourceNormal,\s*viewDir\),\s*0\.0\);/);
  assert.match(
    shader,
    /let screenBlend = 1\.0 - smoothstep\(params\.grazingStart,\s*params\.grazingEnd,\s*sourceNdotV\);/,
    "baked normals should yield to screen/depth normals only when they are grazing to the current view",
  );
  assert.match(shader, /normalize\(mix\(sourceNormal,\s*screenNormal,\s*screenBlend\)\)/);

  assert.match(renderer, /const normalRecoveryMode = \(!scene\.hasPerSplatNormals \|\| params\.forceScreenSpaceNormals\) \? 0 : 1;/);
  assert.match(
    renderer,
    /screenSpaceNormals\.encode\(\s*\n\s*encoder,\s*\n\s*scene\.gbufferDepthView,\s*\n\s*scene\.gbufferNormalView,\s*\n\s*cc\.filteredNormalTexture,/,
    "screen-space recovery must read source normals into a separate recovery target",
  );
  assert.match(
    renderer,
    /bilateralFilter\.encode\(\s*\n\s*encoder,\s*\n\s*cc\.filteredNormalTexture\.createView\(\),\s*\n\s*scene\.gbufferDepthView,\s*\n\s*cc\.gbufferNormalTexture,/,
    "the recovered normal field should be filtered back into the G-buffer normal texture",
  );
});

test("deferred lighting damps metallic IBL where source normals are low confidence", async () => {
  const projection = await readFile(new URL("../src/shaders/gpu_project_splats.wgsl", import.meta.url), "utf8");
  const compositor = await readFile(new URL("../src/shaders/gpu_tile_splat_composite.wgsl", import.meta.url), "utf8");
  const deferred = await readFile(new URL("../src/shaders/gpu_deferred_lighting.wgsl", import.meta.url), "utf8");

  assert.match(projection, /let normalFacingConfidence = saturate\(dot\(facedSplatNormal,\s*normalViewDir\)\);/);
  assert.match(projection, /projCache\[base \+ 13u\] = pack2x16float\(vec2f\(normalFacingConfidence,\s*0\.0\)\);/);

  assert.match(compositor, /var<workgroup> shNormalConfidence: array<f32,\s*64>;/);
  assert.match(compositor, /shNormalConfidence\[localIdx\] = unpack2x16float\(projCache\[cacheBase \+ 13u\]\)\.x;/);
  assert.match(compositor, /gbNormalConfidenceWeighted \+= shNormalConfidence\[i\] \* gbWeight;/);
  assert.match(compositor, /let gbNormalConfidence = gbNormalConfidenceWeighted \/ safeWeight;/);
  assert.match(compositor, /textureStore\(outputMaterial,\s*px,\s*vec4u\([^;]+pack2x16float\(vec2f\(gbNormalConfidence\.x,\s*0\.0\)\)\)\);/s);

  assert.match(deferred, /let normalConfidence = unpack2x16float\(matSample\.a\)\.x;/);
  assert.match(deferred, /let normalUncertainty = 1\.0 - smoothstep\(0\.45,\s*0\.80,\s*normalConfidence\);/);
  assert.match(deferred, /let roughness = max\(baseRoughness,\s*mix\(0\.04,\s*0\.72,\s*normalUncertainty \* baseMetallic\)\);/);
  assert.match(deferred, /let metallic = baseMetallic \* mix\(1\.0,\s*0\.35,\s*normalUncertainty\);/);
});

test("bilateral normal filter smooths recovered side normals instead of preserving speckle", async () => {
  const renderer = await readFile(new URL("../src/splatRenderer.ts", import.meta.url), "utf8");

  assert.match(renderer, /params\[2\] = 3\.0;\s*\/\/ spatialSigma/);
  assert.match(renderer, /params\[4\] = 1\.5;\s*\/\/ normalSigma/);
  assert.match(renderer, /params\[5\] = 3\.0;\s*\/\/ kernelRadius/);
});
