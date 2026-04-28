import assert from "node:assert/strict";
import test from "node:test";

import { decodeLocalPlySplatPayload } from "../src/localPly.ts";

const SH_C0 = 0.28209479;

test("decodes dropped binary 3DGS PLY into browser splat attributes", () => {
  const bytes = binaryPlyFixture([
    {
      position: [1, 2, 3],
      dc: [0, 1, -1],
      opacity: 0,
      scales: [0, Math.log(2), Math.log(0.5)],
      rotation: [1, 0, 0, 0],
    },
    {
      position: [-1, 0, 2],
      dc: [2, -2, 0.5],
      opacity: -2,
      scales: [Math.log(0.25), Math.log(0.75), Math.log(1.5)],
      rotation: [0.5, 0.5, 0.5, 0.5],
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

interface PlyFixtureRow {
  position: [number, number, number];
  dc: [number, number, number];
  opacity: number;
  scales: [number, number, number];
  rotation: [number, number, number, number];
}

function binaryPlyFixture(rows: PlyFixtureRow[]): ArrayBuffer {
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
    ];
    values.forEach((value, valueIndex) => {
      view.setFloat32(rowIndex * rowStride + valueIndex * 4, value, true);
    });
  });
  return buffer;
}
