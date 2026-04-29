import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REAL_SCANIVERSE_SMOKE_ASSET_PATH,
  composeFirstSmokeViewProjection,
  configureCameraForSplatBounds,
  compareProjectedAnisotropyByRotationOrder,
  createMeshSplatRendererWitness,
  createMeshSplatSmokeEvidence,
  writeAlphaDensityCompensatedOpacities,
} from "../../node_modules/.cache/renderer-tests/src/realSmokeScene.js";

const attributes = {
  count: 3,
  sourceKind: "real_scaniverse_ply",
  positions: new Float32Array(9),
  colors: new Float32Array(9),
  opacities: new Float32Array(3),
  radii: new Float32Array(3),
  scales: new Float32Array(9),
  rotations: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
  originalIds: new Uint32Array([0, 1, 2]),
  bounds: {
    min: [-1, -2, -3],
    max: [3, 2, 1],
    center: [1, 0, -1],
    radius: 4,
  },
  layout: {
    strideBytes: 32,
    fields: [
      { name: "position", type: "float32", components: 3, byteOffset: 0 },
      { name: "color", type: "float32", components: 3, byteOffset: 12 },
      { name: "opacity", type: "float32", components: 1, byteOffset: 24 },
      { name: "radius", type: "float32", components: 1, byteOffset: 28 },
    ],
  },
};

test("real smoke evidence is closeable Scaniverse evidence, not synthetic harness evidence", () => {
  const evidence = createMeshSplatSmokeEvidence(attributes, new Uint32Array([2, 1, 0]));

  assert.equal(evidence.ready, true);
  assert.equal(evidence.sourceKind, "real_scaniverse_ply");
  assert.equal(evidence.realScaniverse, true);
  assert.equal(evidence.realSplatEvidence, true);
  assert.equal(evidence.synthetic, false);
  assert.equal(evidence.assetPath, REAL_SCANIVERSE_SMOKE_ASSET_PATH);
  assert.equal(evidence.splatCount, 3);
  assert.equal(evidence.sortedIdCount, 3);
});

test("real smoke camera framing targets the Scaniverse bounds", () => {
  const camera = {
    position: [0, 1, 3],
    target: [0, 0, 0],
    up: [0, 1, 0],
    fovY: Math.PI / 3,
    near: 0.01,
    far: 100,
    navigationScale: 1,
    azimuth: 1,
    elevation: 1,
    distance: 3,
    keys: new Set(),
    mouse: { down: false, lastX: 0, lastY: 0 },
  };

  configureCameraForSplatBounds(camera, attributes.bounds);

  assert.deepEqual(camera.target, attributes.bounds.center);
  assert.ok(camera.distance > attributes.bounds.radius);
  assert.equal(camera.navigationScale, attributes.bounds.radius);
  assert.ok(camera.near > 0);
  assert.ok(camera.far > camera.distance);
});

test("first-smoke presentation flips the viewer vertical axis", () => {
  const identity = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);

  assert.deepEqual(Array.from(composeFirstSmokeViewProjection(identity, identity)), [
    1, 0, 0, 0,
    0, -1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
});

test("real smoke scene exposes renderer fidelity witness data", () => {
  const source = readFileSync(new URL("../../src/realSmokeScene.ts", import.meta.url), "utf8");

  assert.match(source, /__MESH_SPLAT_WITNESS__/);
  assert.match(source, /createMeshSplatRendererWitness/);
  assert.match(source, /scaleSpace: "log"/);
  assert.match(source, /projectionMode: "jacobian-covariance"/);
  assert.match(source, /alphaEnergyPolicy: "bounded-footprint-energy-cap"/);
  assert.match(source, /nearPlaneAlphaFade/);
  assert.match(source, /MAX_ANISOTROPIC_MINOR_RADIUS_INFLATION/);
  assert.match(source, /boundedMinorRadiusPx/);
});

test("renderer witness reports anisotropic field risk instead of placeholder zeroes", () => {
  const thinSplatAttributes = {
    ...attributes,
    count: 2,
    scales: new Float32Array([
      Math.log(0.01), Math.log(0.02), Math.log(1.2),
      Math.log(0.08), Math.log(0.07), Math.log(0.09),
    ]),
    rotations: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0]),
    originalIds: new Uint32Array([42, 43]),
  };

  const witness = createMeshSplatRendererWitness(thinSplatAttributes, new Uint32Array([1, 0]));

  assert.ok(witness.projection.maxAnisotropyRatio >= 60);
  assert.equal(witness.projection.suspiciousSplatCount, 1);
  assert.deepEqual(witness.projection.sampleOriginalIds, [42]);
});

test("projected anisotropy comparison distinguishes wxyz from xyzw rotation interpretation", () => {
  const conventionSensitiveSplat = {
    ...attributes,
    count: 1,
    positions: new Float32Array([0, 0, 0.5]),
    scales: new Float32Array([Math.log(2), Math.log(0.2), Math.log(0.01)]),
    rotations: new Float32Array([-1, -0.75, -0.75, 1]),
    originalIds: new Uint32Array([7]),
  };
  const identityViewProjection = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);

  const comparison = compareProjectedAnisotropyByRotationOrder(
    conventionSensitiveSplat,
    identityViewProjection
  );

  assert.ok(comparison.wxyz.maxProjectedAnisotropyRatio < 3);
  assert.ok(comparison.xyzw.maxProjectedAnisotropyRatio > 50);
  assert.deepEqual(comparison.xyzw.sampleOriginalIds, [7]);
});

test("projected footprint witness reports high-energy splats instead of only anisotropy", () => {
  const hugeProjectedFootprint = {
    ...attributes,
    count: 2,
    positions: new Float32Array([0, 0, 0.5, 0.4, 0, 0.5]),
    scales: new Float32Array([
      Math.log(2), Math.log(0.2), Math.log(0.01),
      Math.log(0.01), Math.log(0.01), Math.log(0.01),
    ]),
    rotations: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0]),
    originalIds: new Uint32Array([99, 100]),
  };
  const identityViewProjection = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);

  const witness = createMeshSplatRendererWitness(
    hugeProjectedFootprint,
    hugeProjectedFootprint.count,
    "synthetic:footprint",
    "test",
    { viewProj: identityViewProjection, viewportWidth: 1000, viewportHeight: 1000, splatScale: 3000 }
  );

  assert.ok(witness.projection.footprint.maxMajorRadiusPx > 4000);
  assert.ok(witness.projection.footprint.maxAreaPx > witness.projection.footprint.areaCapPx);
  assert.equal(witness.projection.footprint.highEnergySplatCount, 1);
  assert.deepEqual(witness.projection.footprint.sampleOriginalIds, [99]);
});

test("alpha witness reports local overlap density for plausible-sized splats", () => {
  const overlappingSplats = {
    ...attributes,
    count: 4,
    positions: new Float32Array([
      0, 0, 0.5,
      0.01, 0, 0.5,
      -0.01, 0, 0.5,
      0, 0.01, 0.5,
    ]),
    scales: new Float32Array([
      Math.log(0.006), Math.log(0.006), Math.log(0.006),
      Math.log(0.006), Math.log(0.006), Math.log(0.006),
      Math.log(0.006), Math.log(0.006), Math.log(0.006),
      Math.log(0.006), Math.log(0.006), Math.log(0.006),
    ]),
    opacities: new Float32Array([0.9, 0.9, 0.9, 0.9]),
    rotations: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
    originalIds: new Uint32Array([20, 21, 22, 23]),
  };
  const identityViewProjection = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);

  const witness = createMeshSplatRendererWitness(
    overlappingSplats,
    overlappingSplats.count,
    "synthetic:overlap",
    "test",
    { viewProj: identityViewProjection, viewportWidth: 1000, viewportHeight: 1000, splatScale: 3000 }
  );

  assert.equal(witness.alpha.overlapDensity.accountingMode, "coverage-aware");
  assert.equal(witness.alpha.overlapDensity.maxTileSplatCount, 4);
  assert.ok(witness.alpha.overlapDensity.maxTileAlphaMass > witness.alpha.overlapDensity.alphaMassCap);
  assert.ok(witness.alpha.overlapDensity.hotTileCount > 0);
  assert.ok(witness.alpha.overlapDensity.maxSplatCoveredTileCount > 1);
  assert.deepEqual(witness.alpha.overlapDensity.sampleOriginalIds, [20, 21, 22, 23]);
});

test("alpha density compensation locally reduces only hot overlap tiles", () => {
  const densitySplats = {
    ...attributes,
    count: 5,
    positions: new Float32Array([
      0, 0, 0.5,
      0.01, 0, 0.5,
      -0.01, 0, 0.5,
      0, 0.01, 0.5,
      0.8, 0.8, 0.5,
    ]),
    scales: new Float32Array([
      Math.log(0.006), Math.log(0.006), Math.log(0.006),
      Math.log(0.006), Math.log(0.006), Math.log(0.006),
      Math.log(0.006), Math.log(0.006), Math.log(0.006),
      Math.log(0.006), Math.log(0.006), Math.log(0.006),
      Math.log(0.0001), Math.log(0.0001), Math.log(0.0001),
    ]),
    opacities: new Float32Array([0.9, 0.9, 0.9, 0.9, 0.4]),
    rotations: new Float32Array([
      1, 0, 0, 0,
      1, 0, 0, 0,
      1, 0, 0, 0,
      1, 0, 0, 0,
      1, 0, 0, 0,
    ]),
    originalIds: new Uint32Array([20, 21, 22, 23, 24]),
  };
  const identityViewProjection = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
  const target = new Float32Array(densitySplats.count);

  const summary = writeAlphaDensityCompensatedOpacities(
    target,
    densitySplats,
    identityViewProjection,
    1000,
    1000,
    3000
  );

  assert.equal(summary.accountingMode, "coverage-aware");
  assert.ok(summary.hotTileCount > 0);
  assert.equal(summary.compensatedSplatCount, 4);
  assert.ok(summary.maxSplatCoveredTileCount > 1);
  assert.ok(summary.minCompensationExponent > 0);
  assert.ok(summary.minCompensationExponent < 1);
  assert.ok(target[0] < 0.9);
  assert.ok(target[0] > 0);
  assert.ok(Math.abs(target[4] - 0.4) < 0.000001);
});

test("alpha density compensation does not erase individual hot-tile splats", () => {
  const denseSplats = {
    ...attributes,
    count: 4,
    positions: new Float32Array([
      0, 0, 0.5,
      0.01, 0, 0.5,
      -0.01, 0, 0.5,
      0, 0.01, 0.5,
    ]),
    scales: new Float32Array([
      Math.log(0.02), Math.log(0.02), Math.log(0.02),
      Math.log(0.02), Math.log(0.02), Math.log(0.02),
      Math.log(0.02), Math.log(0.02), Math.log(0.02),
      Math.log(0.02), Math.log(0.02), Math.log(0.02),
    ]),
    opacities: new Float32Array([0.9, 0.9, 0.9, 0.9]),
    rotations: new Float32Array([
      1, 0, 0, 0,
      1, 0, 0, 0,
      1, 0, 0, 0,
      1, 0, 0, 0,
    ]),
    originalIds: new Uint32Array([30, 31, 32, 33]),
  };
  const identityViewProjection = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
  const target = new Float32Array(denseSplats.count);

  const summary = writeAlphaDensityCompensatedOpacities(
    target,
    denseSplats,
    identityViewProjection,
    1000,
    1000,
    3000
  );

  assert.ok(summary.hotTileCount > 0);
  assert.equal(summary.compensatedSplatCount, 4);
  assert.ok(target[0] >= 0.449, `expected bounded opacity, saw ${target[0]}`);
});

test("alpha density compensation accounts for coverage across every overlapped tile", () => {
  const tileStraddlingSplat = {
    ...attributes,
    count: 1,
    positions: new Float32Array([-0.265625, -0.46875, 0.5]),
    scales: new Float32Array([
      Math.log(0.1125), Math.log(0.1125), Math.log(0.1125),
    ]),
    opacities: new Float32Array([0.8]),
    rotations: new Float32Array([1, 0, 0, 0]),
    originalIds: new Uint32Array([77]),
  };
  const identityViewProjection = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
  const target = new Float32Array(tileStraddlingSplat.count);

  const summary = writeAlphaDensityCompensatedOpacities(
    target,
    tileStraddlingSplat,
    identityViewProjection,
    128,
    64,
    3000
  );

  assert.equal(summary.accountingMode, "coverage-aware");
  assert.ok(summary.maxSplatCoveredTileCount > 1);
  assert.ok(summary.maxCenterTileDroppedCoverageFraction > 0.5);
  assert.ok(summary.tileEntryCount > tileStraddlingSplat.count);
});

test("renderer updates the uploaded opacity buffer with alpha density compensation", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /writeAlphaDensityCompensatedOpacities/);
  assert.match(source, /queue\.writeBuffer\(scene\.buffers\.opacityBuffer/);
  assert.match(source, /selectedAlphaDensityMode/);
  assert.match(source, /alpha: \$\{alphaSummary\.accountingMode\} density/);
});
