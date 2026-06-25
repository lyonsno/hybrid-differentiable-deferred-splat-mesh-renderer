import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Import planTileSplatCompositor for budget sizing tests.
// It's compiled by the test:renderer tsc step into node_modules/.cache/.
// For source-reading tests we use the raw TS source.
const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
const rendererSource = readFileSync(new URL("../../src/splatRenderer.ts", import.meta.url), "utf8");
const compositorSource = readFileSync(new URL("../../src/gpuTileSplatCompositor.ts", import.meta.url), "utf8");

function destroySceneInternalSource() {
  const match = rendererSource.match(/function destroySceneInternal\(scene: SplatScene\): void \{[\s\S]*?\n\}/);
  assert.ok(match, "destroySceneInternal must remain visible to lifecycle tests");
  return match[0];
}

test("compute compositor state records all GPU textures that require destruction", () => {
  const activeSceneMatch = rendererSource.match(/interface ActiveSceneInternal \{[\s\S]*?\n\}/);
  assert.ok(activeSceneMatch, "ActiveSceneInternal must remain visible to lifecycle tests");
  const activeScene = activeSceneMatch[0];

  assert.match(activeScene, /gbufferDepthTexture: GPUTexture;/);
  assert.match(activeScene, /gbufferNormalTexture: GPUTexture;/);
  assert.match(activeScene, /litTexture: GPUTexture;/);
  assert.match(activeScene, /lastSortedViewProj: Float32Array \| null;/);
  assert.match(activeScene, /hasSortedRefs: boolean;/);
});

test("destroySceneInternal releases compute compositor resources and textures", () => {
  const destroySource = destroySceneInternalSource();

  assert.match(destroySource, /cc\.resources\.destroy\(\);/);
  assert.match(destroySource, /cc\.outputTexture\.destroy\(\);/);
  assert.match(destroySource, /cc\.gbufferDepthTexture\.destroy\(\);/);
  assert.match(destroySource, /cc\.gbufferNormalTexture\.destroy\(\);/);
  assert.match(destroySource, /cc\.litTexture\.destroy\(\);/);
});

test("destroySceneInternal releases material, normal, and SH buffers", () => {
  const destroySource = destroySceneInternalSource();

  assert.match(destroySource, /scene\.buffers\.materialBuffer\.destroy\(\)/);
  assert.match(destroySource, /scene\.buffers\.normalBuffer\?\.destroy\(\)/);
  assert.match(destroySource, /scene\.buffers\.shDataBuffer\.destroy\(\)/);
});

test("tile ref budget never exceeds WebGPU dispatch limit", () => {
  // The reorder and radix-init passes dispatch ceil(maxTotalTileRefs / 256)
  // workgroups. WebGPU max is 65535 per dimension.
  const MAX_DISPATCH_SAFE = 65535 * 256;

  // Extract the budget formula from source
  assert.match(compositorSource, /MAX_DISPATCH_SAFE_REFS = 65535 \* 256/);
  assert.match(compositorSource, /Math\.min\(/);
  assert.match(compositorSource, /MAX_DISPATCH_SAFE_REFS/);

  // Verify the shader caps tile footprint per splat
  const projSource = readFileSync(new URL("../../src/shaders/gpu_project_splats.wgsl", import.meta.url), "utf8");
  assert.match(projSource, /clampedRadius = min\(radius, tileSize \* 8\.0\)/,
    "projection shader must cap splat tile footprint to prevent unbounded tile-ref growth");
  assert.match(projSource, /PROJ_STRIDE = 13u/,
    "projection cache stride must be 13 to include per-splat normal, color, and emissive slots");
});

test("projection cache stride matches between project and composite shaders", () => {
  const projSource = readFileSync(new URL("../../src/shaders/gpu_project_splats.wgsl", import.meta.url), "utf8");
  const compSource = readFileSync(new URL("../../src/shaders/gpu_tile_splat_composite.wgsl", import.meta.url), "utf8");
  const f16Source = readFileSync(new URL("../../src/shaders/gpu_tile_splat_composite_f16.wgsl", import.meta.url), "utf8");

  const projStride = projSource.match(/const PROJ_STRIDE = (\d+)u;/);
  const compStride = compSource.match(/const PROJ_STRIDE = (\d+)u;/);
  const f16Stride = f16Source.match(/const PROJ_STRIDE = (\d+)u;/);

  assert.ok(projStride, "project shader must declare PROJ_STRIDE");
  assert.ok(compStride, "composite shader must declare PROJ_STRIDE");
  assert.ok(f16Stride, "f16 composite shader must declare PROJ_STRIDE");
  assert.equal(projStride[1], compStride[1], "PROJ_STRIDE mismatch between project and composite shaders");
  assert.equal(projStride[1], f16Stride[1], "PROJ_STRIDE mismatch between project and f16 composite shaders");
});
