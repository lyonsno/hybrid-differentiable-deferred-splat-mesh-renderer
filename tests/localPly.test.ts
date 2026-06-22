import assert from "node:assert/strict";
import test from "node:test";

import { decodeLocalPlySplatPayload, applySidecarCorrections, type KaminosSidecar } from "../src/localPly.ts";

const SH_C0 = 0.28209479;

test("decodes dropped binary 3DGS PLY into browser splat attributes", () => {
  const bytes = binaryPlyFixture([
    {
      position: [1, 2, 3],
      dc: [0, 1, -1],
      opacity: 0,
      scales: [0, Math.log(2), Math.log(0.5)],
      rotation: [1, 0, 0, 0],
      shRest: [0.25, 0.5, 0.75, 1, 1.25, 1.5, -0.25, -0.5, -0.75],
    },
    {
      position: [-1, 0, 2],
      dc: [2, -2, 0.5],
      opacity: -2,
      scales: [Math.log(0.25), Math.log(0.75), Math.log(1.5)],
      rotation: [0.5, 0.5, 0.5, 0.5],
      shRest: [2, 2.25, 2.5, 3, 3.25, 3.5, 4, 4.25, 4.5],
    },
  ]);

  const decoded = decodeLocalPlySplatPayload("dropped.ply", bytes);

  assert.equal(decoded.count, 2);
  assert.equal(decoded.sourceKind, "scaniverse_ply");
  assert.deepEqual(Array.from(decoded.positions), [1, 2, 3, -1, 0, 2]);
  assert.deepEqual(
    Array.from(decoded.colors),
    Array.from(
      new Float32Array([
        0.5,
        0.5 + SH_C0,
        0.5 - SH_C0,
        1,
        0,
        0.5 + SH_C0 * 0.5,
      ])
    )
  );
  assert.deepEqual(
    Array.from(decoded.opacities),
    Array.from(new Float32Array([0.5, 1 / (1 + Math.exp(2))]))
  );
  assert.deepEqual(Array.from(decoded.radii), Array.from(new Float32Array([2, 1.5])));
  assert.deepEqual(
    Array.from(decoded.scales),
    Array.from(
      new Float32Array([
        0,
        Math.log(2),
        Math.log(0.5),
        Math.log(0.25),
        Math.log(0.75),
        Math.log(1.5),
      ])
    )
  );
  assert.deepEqual(
    Array.from(decoded.rotations),
    Array.from(new Float32Array([1, 0, 0, 0, 0.5, 0.5, 0.5, 0.5]))
  );
  assert.deepEqual(Array.from(decoded.originalIds), [0, 1]);
  assert.equal(decoded.sh?.degree, 1);
  assert.equal(decoded.sh?.coefficientCount, 3);
  assert.deepEqual(
    Array.from(decoded.sh!.coefficients),
    Array.from(
      new Float32Array([
        0.25, 1, -0.25,
        0.5, 1.25, -0.5,
        0.75, 1.5, -0.75,
        2, 3, 4,
        2.25, 3.25, 4.25,
        2.5, 3.5, 4.5,
      ])
    )
  );
  assert.deepEqual(decoded.bounds.min, [-1, 0, 2]);
  assert.deepEqual(decoded.bounds.max, [1, 2, 3]);
  assert.deepEqual(decoded.bounds.center, [0, 1, 2.5]);
});

test("rejects dropped files that are not supported PLY splats", () => {
  assert.throws(
    () => decodeLocalPlySplatPayload("bad.txt", new TextEncoder().encode("not ply").buffer),
    /PLY header/
  );
});

test("decodes PLY with per-splat normals, roughness, and metallic attributes", () => {
  const bytes = binaryPlyFixture([
    {
      position: [1, 2, 3],
      dc: [0, 0, 0],
      opacity: 0,
      scales: [0, 0, 0],
      rotation: [1, 0, 0, 0],
      normal: [0, 1, 0],
      roughness: 0.3,
      metallic: 0.9,
    },
    {
      position: [4, 5, 6],
      dc: [1, 1, 1],
      opacity: 0,
      scales: [0, 0, 0],
      rotation: [1, 0, 0, 0],
      normal: [0.577, 0.577, 0.577],
      roughness: 0.8,
      metallic: 0.0,
    },
  ]);

  const decoded = decodeLocalPlySplatPayload("baked.ply", bytes);

  assert.equal(decoded.count, 2);
  assert.ok(decoded.normals, "normals should be present");
  assert.ok(decoded.roughness, "roughness should be present");
  assert.ok(decoded.metalness, "metalness should be present");

  // Check normals
  const normals = Array.from(decoded.normals!);
  assert.equal(normals.length, 6);
  assert.ok(Math.abs(normals[0] - 0) < 0.001);
  assert.ok(Math.abs(normals[1] - 1) < 0.001);
  assert.ok(Math.abs(normals[2] - 0) < 0.001);
  assert.ok(Math.abs(normals[3] - 0.577) < 0.001);
  assert.ok(Math.abs(normals[4] - 0.577) < 0.001);
  assert.ok(Math.abs(normals[5] - 0.577) < 0.001);

  // Check materials
  assert.ok(Math.abs(decoded.roughness![0] - 0.3) < 0.001);
  assert.ok(Math.abs(decoded.roughness![1] - 0.8) < 0.001);
  assert.ok(Math.abs(decoded.metalness![0] - 0.9) < 0.001);
  assert.ok(Math.abs(decoded.metalness![1] - 0.0) < 0.001);
});

test("PLY without normals/roughness/metallic returns undefined for those fields", () => {
  const bytes = binaryPlyFixture([
    {
      position: [1, 2, 3],
      dc: [0, 0, 0],
      opacity: 0,
      scales: [0, 0, 0],
      rotation: [1, 0, 0, 0],
    },
  ]);

  const decoded = decodeLocalPlySplatPayload("basic.ply", bytes);

  assert.equal(decoded.normals, undefined);
  assert.equal(decoded.roughness, undefined);
  assert.equal(decoded.metalness, undefined);
});

interface PlyFixtureRow {
  position: [number, number, number];
  dc: [number, number, number];
  opacity: number;
  scales: [number, number, number];
  rotation: [number, number, number, number];
  shRest?: number[];
  normal?: [number, number, number];
  roughness?: number;
  metallic?: number;
}

function binaryPlyFixture(rows: PlyFixtureRow[]): ArrayBuffer {
  const hasShRest = rows.some((row) => row.shRest !== undefined);
  const hasNormals = rows.some((row) => row.normal !== undefined);
  const hasRoughness = rows.some((row) => row.roughness !== undefined);
  const hasMetallic = rows.some((row) => row.metallic !== undefined);
  const properties = [
    "x",
    "y",
    "z",
    "f_dc_0",
    "f_dc_1",
    "f_dc_2",
    "opacity",
    "scale_0",
    "scale_1",
    "scale_2",
    "rot_0",
    "rot_1",
    "rot_2",
    "rot_3",
  ];
  if (hasShRest) {
    for (let index = 0; index < 9; index++) {
      properties.push(`f_rest_${index}`);
    }
  }
  if (hasNormals) {
    properties.push("nx", "ny", "nz");
  }
  if (hasRoughness) {
    properties.push("roughness");
  }
  if (hasMetallic) {
    properties.push("metallic");
  }
  const header = [
    "ply",
    "format binary_little_endian 1.0",
    `element vertex ${rows.length}`,
    ...properties.map((name) => `property float ${name}`),
    "end_header",
    "",
  ].join("\n");
  const headerBytes = new TextEncoder().encode(header);
  const rowStride = properties.length * Float32Array.BYTES_PER_ELEMENT;
  const buffer = new ArrayBuffer(headerBytes.byteLength + rows.length * rowStride);
  new Uint8Array(buffer).set(headerBytes);
  const view = new DataView(buffer, headerBytes.byteLength);
  rows.forEach((row, rowIndex) => {
    const values = [
      ...row.position,
      ...row.dc,
      row.opacity,
      ...row.scales,
      ...row.rotation,
      ...(hasShRest ? requireShRest(row) : []),
      ...(hasNormals ? (row.normal ?? [0, 0, 0]) : []),
      ...(hasRoughness ? [row.roughness ?? 0.5] : []),
      ...(hasMetallic ? [row.metallic ?? 0.0] : []),
    ];
    values.forEach((value, valueIndex) => {
      view.setFloat32(rowIndex * rowStride + valueIndex * 4, value, true);
    });
  });
  return buffer;
}

function requireShRest(row: PlyFixtureRow): number[] {
  if (row.shRest === undefined || row.shRest.length !== 9) {
    throw new Error("fixture row must provide 9 f_rest fields");
  }
  return row.shRest;
}

// ---------------------------------------------------------------------------
// Sidecar correction tests
// ---------------------------------------------------------------------------

test("applySidecarCorrections applies centroid offset", () => {
  const attrs = decodeLocalPlySplatPayload("test.ply", binaryPlyFixture([
    { position: [10, 20, 30], dc: [0, 0, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0] },
    { position: [12, 22, 32], dc: [0, 0, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0] },
  ]));

  const sidecar: KaminosSidecar = {
    schema: "kaminos.splat-correction.v0",
    correction: { centroidOffset: [10, 20, 30] },
  };

  const result = applySidecarCorrections(attrs, sidecar);
  assert.equal(result.count, 2);
  assert.ok(Math.abs(result.positions[0] - 0) < 0.001);
  assert.ok(Math.abs(result.positions[1] - 0) < 0.001);
  assert.ok(Math.abs(result.positions[2] - 0) < 0.001);
  assert.ok(Math.abs(result.positions[3] - 2) < 0.001);
  assert.ok(Math.abs(result.positions[4] - 2) < 0.001);
  assert.ok(Math.abs(result.positions[5] - 2) < 0.001);
});

test("applySidecarCorrections applies axis flips", () => {
  const attrs = decodeLocalPlySplatPayload("test.ply", binaryPlyFixture([
    { position: [1, 2, 3], dc: [0, 0, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0] },
  ]));

  const sidecar: KaminosSidecar = {
    schema: "kaminos.splat-correction.v0",
    correction: { axisFlips: [1, 1, -1] },
  };

  const result = applySidecarCorrections(attrs, sidecar);
  assert.ok(Math.abs(result.positions[0] - 1) < 0.001);
  assert.ok(Math.abs(result.positions[1] - 2) < 0.001);
  assert.ok(Math.abs(result.positions[2] - (-3)) < 0.001);
});

test("applySidecarCorrections crops splats outside bounds", () => {
  const attrs = decodeLocalPlySplatPayload("test.ply", binaryPlyFixture([
    { position: [0, 0, 0], dc: [1, 0, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0] },
    { position: [5, 5, 5], dc: [0, 1, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0] },
    { position: [0.5, 0.5, 0.5], dc: [0, 0, 1], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0] },
  ]));

  const sidecar: KaminosSidecar = {
    schema: "kaminos.splat-correction.v0",
    correction: {
      crop: { enabled: true, min: [-1, -1, -1], max: [1, 1, 1] },
    },
  };

  const result = applySidecarCorrections(attrs, sidecar);
  // Splat at [5,5,5] is outside crop bounds, should be removed
  assert.equal(result.count, 2);
  assert.ok(Math.abs(result.positions[0] - 0) < 0.001);
  assert.ok(Math.abs(result.positions[3] - 0.5) < 0.001);
});

test("applySidecarCorrections applies offset then crop in correct order", () => {
  const attrs = decodeLocalPlySplatPayload("test.ply", binaryPlyFixture([
    { position: [10, 10, 10], dc: [0, 0, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0] },
    { position: [10.5, 10.5, 10.5], dc: [0, 0, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0] },
    { position: [15, 15, 15], dc: [0, 0, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0] },
  ]));

  const sidecar: KaminosSidecar = {
    schema: "kaminos.splat-correction.v0",
    correction: {
      centroidOffset: [10, 10, 10],
      crop: { enabled: true, min: [-1, -1, -1], max: [1, 1, 1] },
    },
  };

  const result = applySidecarCorrections(attrs, sidecar);
  // After offset: [0,0,0], [0.5,0.5,0.5], [5,5,5]. Crop removes [5,5,5].
  assert.equal(result.count, 2);
  assert.ok(Math.abs(result.positions[0] - 0) < 0.001);
  assert.ok(Math.abs(result.positions[3] - 0.5) < 0.001);
});

test("applySidecarCorrections applies axis flips before centroid offset for legacy Kaminos crops", () => {
  const attrs = decodeLocalPlySplatPayload("test.ply", binaryPlyFixture([
    { position: [0, 0, 1], dc: [0, 0, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0] },
    { position: [0, 0, 0.3], dc: [0, 0, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0] },
  ]));

  const sidecar: KaminosSidecar = {
    schema: "kaminos.splat-correction.v0",
    correction: {
      axisFlips: [1, 1, -1],
      centroidOffset: [0, 0, 0.75],
      crop: { enabled: true, min: [-0.1, -0.1, -1.8], max: [0.1, 0.1, -1.7] },
    },
  };

  const result = applySidecarCorrections(attrs, sidecar);

  assert.equal(result.count, 1);
  assert.ok(Math.abs(result.positions[2] - (-1.75)) < 0.001);
});

test("applySidecarCorrections preserves SH coefficients through crop", () => {
  const attrs = decodeLocalPlySplatPayload("test.ply", binaryPlyFixture([
    { position: [0, 0, 0], dc: [0, 0, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0],
      shRest: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { position: [5, 5, 5], dc: [0, 0, 0], opacity: 0, scales: [0, 0, 0], rotation: [1, 0, 0, 0],
      shRest: [10, 20, 30, 40, 50, 60, 70, 80, 90] },
  ]));

  const sidecar: KaminosSidecar = {
    schema: "kaminos.splat-correction.v0",
    correction: {
      crop: { enabled: true, min: [-1, -1, -1], max: [1, 1, 1] },
    },
  };

  const result = applySidecarCorrections(attrs, sidecar);
  assert.equal(result.count, 1);
  assert.ok(result.sh, "SH should be preserved");
  // First splat's SH should survive
  assert.deepEqual(
    Array.from(result.sh!.coefficients),
    Array.from(new Float32Array([1, 4, 7, 2, 5, 8, 3, 6, 9]))
  );
});
