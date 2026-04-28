import assert from "node:assert/strict";
import test from "node:test";

import { decodeLocalPlySplatPayload } from "../src/localPly.ts";
import { decodeFirstSmokeSplatManifest } from "../src/splats.ts";
import {
  FIELD_SEMANTICS_CONTRACT,
  decodePlySemanticFields,
  requireFieldSemanticsManifest,
} from "../src/rendererFidelityProbes/fieldSemantics.ts";

test("PLY field semantics decode to the same browser attributes as the field contract", () => {
  const raw = {
    position: [1, -2, 3] as [number, number, number],
    dc: [0, 1, -1] as [number, number, number],
    opacity: -2,
    scales: [Math.log(0.25), Math.log(2), Math.log(4)] as [number, number, number],
    rotation: [0.5, -0.5, 0.5, -0.5] as [number, number, number, number],
  };
  const decoded = decodeLocalPlySplatPayload("field-semantics.ply", binaryPlyFixture([raw]));
  const expected = decodePlySemanticFields(raw);

  assert.equal(FIELD_SEMANTICS_CONTRACT.colorSpace, "sh_dc_rgb");
  assert.equal(FIELD_SEMANTICS_CONTRACT.opacitySpace, "logit");
  assert.equal(FIELD_SEMANTICS_CONTRACT.scaleSpace, "log");
  assert.equal(FIELD_SEMANTICS_CONTRACT.rotationOrder, "wxyz");
  assert.deepEqual(Array.from(decoded.positions), raw.position);
  assert.deepEqual(Array.from(decoded.colors), f32(expected.color));
  assert.deepEqual(Array.from(decoded.opacities), f32([expected.opacity]));
  assert.deepEqual(Array.from(decoded.radii), f32([expected.radius]));
  assert.deepEqual(Array.from(decoded.scales), f32(raw.scales));
  assert.deepEqual(Array.from(decoded.rotations), f32(raw.rotation));
});

test("exported manifest sidecars preserve PLY log-scales and wxyz quaternions for browser parity", () => {
  const rows = [
    {
      position: [0, 1, 2] as [number, number, number],
      dc: [2, -2, 0.5] as [number, number, number],
      opacity: 0,
      scales: [Math.log(3), Math.log(0.5), Math.log(1)] as [number, number, number],
      rotation: [1, 0, 0, 0] as [number, number, number, number],
    },
    {
      position: [-1, -2, -3] as [number, number, number],
      dc: [-1, 0.25, 4] as [number, number, number],
      opacity: 4,
      scales: [Math.log(0.125), Math.log(0.25), Math.log(0.75)] as [number, number, number],
      rotation: [0.25, 0.5, -0.5, 0.75] as [number, number, number, number],
    },
  ];
  const plyDecoded = decodeLocalPlySplatPayload("field-semantics.ply", binaryPlyFixture(rows));
  const manifest = manifestForDecoded(rows.length);

  requireFieldSemanticsManifest(manifest);
  const manifestDecoded = decodeFirstSmokeSplatManifest(
    manifest,
    payloadSidecarFromDecoded(plyDecoded),
    uint32Sidecar([0, 1]),
    float32Sidecar(Array.from(plyDecoded.scales)),
    float32Sidecar(Array.from(plyDecoded.rotations))
  );

  assert.deepEqual(Array.from(manifestDecoded.colors), Array.from(plyDecoded.colors));
  assert.deepEqual(Array.from(manifestDecoded.opacities), Array.from(plyDecoded.opacities));
  assert.deepEqual(Array.from(manifestDecoded.radii), Array.from(plyDecoded.radii));
  assert.deepEqual(Array.from(manifestDecoded.scales), Array.from(plyDecoded.scales));
  assert.deepEqual(Array.from(manifestDecoded.rotations), Array.from(plyDecoded.rotations));
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

function payloadSidecarFromDecoded(decoded: ReturnType<typeof decodeLocalPlySplatPayload>): ArrayBuffer {
  const payload = new ArrayBuffer(decoded.count * 32);
  const view = new DataView(payload);
  for (let row = 0; row < decoded.count; row++) {
    const values = [
      decoded.positions[row * 3],
      decoded.positions[row * 3 + 1],
      decoded.positions[row * 3 + 2],
      decoded.colors[row * 3],
      decoded.colors[row * 3 + 1],
      decoded.colors[row * 3 + 2],
      decoded.opacities[row],
      decoded.radii[row],
    ];
    values.forEach((value, index) => view.setFloat32(row * 32 + index * 4, value, true));
  }
  return payload;
}

function manifestForDecoded(count: number) {
  return {
    schema: "scaniverse_first_smoke_splat_v1",
    source: { kind: "scaniverse_ply", filename: "field-semantics.ply" },
    splat_count: count,
    endianness: "little",
    stride_bytes: 32,
    fields: [
      { name: "position", component_type: "float32", components: 3, byte_offset: 0 },
      { name: "color", component_type: "float32", components: 3, byte_offset: 12 },
      { name: "opacity", component_type: "float32", components: 1, byte_offset: 24 },
      { name: "radius", component_type: "float32", components: 1, byte_offset: 28 },
    ],
    payload: { path: "field.f32.bin", component_type: "float32", byte_length: count * 32 },
    ids: { path: "field.ids.u32.bin", byte_length: count * 4 },
    shape: {
      scales_path: "field.scales.f32.bin",
      scales_component_type: "float32",
      scales_byte_length: count * 3 * 4,
      rotations_path: "field.rotations.f32.bin",
      rotations_component_type: "float32",
      rotations_byte_length: count * 4 * 4,
      scale_space: "log",
      rotation_order: "wxyz",
    },
    decode: {
      color: "displayable RGB float3 from loader: SH DC via 0.5 + 0.28209479 * f_dc, or uchar RGB / 255",
      opacity: "float opacity from loader: sigmoid(opacity) for PLY logit field, or 1.0 when absent",
      radius: "max(exp(scale_0), exp(scale_1), exp(scale_2)) from log-space PLY scale fields",
    },
    bounds: {
      min: [-1, -2, -3],
      max: [0, 1, 2],
      center: [-0.5, -0.5, -0.5],
      radius: 3,
    },
  };
}

function float32Sidecar(values: number[]): ArrayBuffer {
  return new Float32Array(values).buffer;
}

function uint32Sidecar(values: number[]): ArrayBuffer {
  return new Uint32Array(values).buffer;
}

function f32(values: number[]): number[] {
  return Array.from(new Float32Array(values));
}
