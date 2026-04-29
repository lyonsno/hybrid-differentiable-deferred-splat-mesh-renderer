import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  computeSplatPlateRadiusPx,
  getSplatPlateDrawCall,
  SPLAT_PLATE_BUFFER_BINDINGS,
  SPLAT_PLATE_FRAME_UNIFORM_BYTES,
  SPLAT_PLATE_SPLAT_ROW_BYTES,
  SPLAT_PLATE_VERTICES_PER_SPLAT,
  writeSplatPlateFrameUniforms,
} from "../../node_modules/.cache/renderer-tests/src/splatPlateContract.js";

test("splat plate draw plan emits one six-vertex plate per sorted original id", () => {
  assert.deepEqual(getSplatPlateDrawCall(4), {
    vertexCount: SPLAT_PLATE_VERTICES_PER_SPLAT,
    instanceCount: 4,
  });

  assert.equal(getSplatPlateDrawCall(0), null);
  assert.throws(() => getSplatPlateDrawCall(-1), /splat count/i);
  assert.throws(() => getSplatPlateDrawCall(1.5), /splat count/i);
});

test("splat plate source row stride matches position, color, opacity, radius packing", () => {
  assert.equal(SPLAT_PLATE_SPLAT_ROW_BYTES, 8 * Float32Array.BYTES_PER_ELEMENT);
});

test("splat plate bindings consume uploaded attributes separately from sorted ids", () => {
  assert.deepEqual(SPLAT_PLATE_BUFFER_BINDINGS, {
    positions: 0,
    colors: 1,
    opacities: 2,
    scales: 3,
    rotations: 4,
    sortedIndices: 5,
  });
});

test("splat plate frame uniforms pack matrix, viewport, radius controls, and near fade at shader offsets", () => {
  const matrix = Float32Array.from({ length: 16 }, (_, i) => i + 0.25);
  const target = new Float32Array(SPLAT_PLATE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);

  writeSplatPlateFrameUniforms(target, matrix, 1280, 720, 2.5, 3.5, 0.02, 0.12);

  assert.deepEqual(Array.from(target.slice(0, 16)), Array.from(matrix));
  assert.equal(target[16], 1280);
  assert.equal(target[17], 720);
  assert.equal(target[18], 2.5);
  assert.equal(target[19], 3.5);
  assert.ok(Math.abs(target[20] - 0.02) < 0.000001);
  assert.ok(Math.abs(target[21] - 0.12) < 0.000001);
  assert.throws(() => writeSplatPlateFrameUniforms(new Float32Array(4), matrix, 1, 1), /too small/i);
});

test("splat plate frame uniforms use stable radius and near fade defaults", () => {
  const matrix = Float32Array.from({ length: 16 }, (_, i) => i);
  const target = new Float32Array(SPLAT_PLATE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);

  writeSplatPlateFrameUniforms(target, matrix, 640, 480);

  assert.equal(target[18], 1);
  assert.equal(target[19], 1.5);
  assert.equal(target[20], 0);
  assert.ok(Math.abs(target[21] - 0.08) < 0.000001);
});

test("splat plate radius scales with perspective depth during zoom", () => {
  const nearRadius = computeSplatPlateRadiusPx(0.01, 0.5, 3000, 1.5);
  const farRadius = computeSplatPlateRadiusPx(0.01, 2, 3000, 1.5);
  const tinyFarRadius = computeSplatPlateRadiusPx(0.0001, 100, 3000, 1.5);

  assert.equal(nearRadius, 60);
  assert.equal(farRadius, 15);
  assert.equal(tinyFarRadius, 1.5);
});

test("splat plate shader consumes anisotropic shape buffers", () => {
  const shader = readFileSync(new URL("../../src/shaders/splat_plate.wgsl", import.meta.url), "utf8");

  assert.match(shader, /var<storage, read> scales: array<f32>/);
  assert.match(shader, /var<storage, read> rotations: array<f32>/);
  assert.doesNotMatch(shader, /var<storage, read> radii: array<f32>/);
  assert.match(shader, /projectSplatAxes/);
  assert.match(shader, /ellipseAxesFromCovariance/);
  assert.doesNotMatch(shader, /centerClip\.xy \+ local \* radiusNdc \* centerClip\.w/);
});

test("splat plate shader projects Gaussian covariance with a Jacobian instead of signed endpoints", () => {
  const shader = readFileSync(new URL("../../src/shaders/splat_plate.wgsl", import.meta.url), "utf8");

  assert.doesNotMatch(shader, /fn projectAxis\(/);
  assert.doesNotMatch(shader, /position \+ offset/);
  assert.match(shader, /projectAxisJacobian/);
  assert.match(shader, /centerClip\.w \* viewProjRow0 - centerClip\.x \* viewProjRow3/);
  assert.match(shader, /centerClip\.w \* viewProjRow1 - centerClip\.y \* viewProjRow3/);
});

test("splat plate shader rejects near-plane and behind-camera splat centers before projection", () => {
  const shader = readFileSync(new URL("../../src/shaders/splat_plate.wgsl", import.meta.url), "utf8");

  assert.match(shader, /splatCenterInsideClip/);
  assert.match(shader, /centerClip\.w <= MIN_SPLAT_CLIP_W/);
  assert.match(shader, /centerClip\.z < 0\.0/);
  assert.match(shader, /projectSplatAxes\(shape, centerClip\)/);
});

test("splat plate shader routes near-plane support crossings to a bounded LOD proxy", () => {
  const shader = readFileSync(new URL("../../src/shaders/splat_plate.wgsl", import.meta.url), "utf8");

  assert.match(shader, /struct SplatShape/);
  assert.match(shader, /splatSupportInsideClip/);
  assert.match(shader, /position \+ shape\.axis0/);
  assert.match(shader, /position - shape\.axis0/);
  assert.match(shader, /lodProxyAxes/);
  assert.match(shader, /if \(!splatSupportInsideClip\(position, shape\)\)/);
});

test("splat plate shader names the alpha policy for bounded footprint LOD", () => {
  const shader = readFileSync(new URL("../../src/shaders/splat_plate.wgsl", import.meta.url), "utf8");

  assert.match(shader, /alphaForFootprintPolicy/);
  assert.match(shader, /bounded footprint cap intentionally reduces total screen energy/);
  assert.match(shader, /alphaForFootprintPolicy\(opacity, usingLodProxy, centerClip\)/);
});

test("splat plate shader fades valid splats through a near-plane alpha band", () => {
  const shader = readFileSync(new URL("../../src/shaders/splat_plate.wgsl", import.meta.url), "utf8");

  assert.match(shader, /nearFadeStartNdc: f32/);
  assert.match(shader, /nearFadeEndNdc: f32/);
  assert.match(shader, /nearPlaneAlphaFade/);
  assert.match(shader, /centerClip\.z \/ max\(centerClip\.w, MIN_SPLAT_CLIP_W\)/);
  assert.match(shader, /alphaForFootprintPolicy\(opacity, usingLodProxy, centerClip\)/);
});
