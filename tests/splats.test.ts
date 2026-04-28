import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeFirstSmokeSplatManifest,
  decodeFirstSmokeSplatPayload,
  fetchFirstSmokeSplatPayload,
  framingFromBounds,
  uploadSplatAttributeBuffers,
} from "../src/splats.ts";

const firstSmokeLayout = {
  strideBytes: 32,
  fields: [
    { name: "position", type: "float32", components: 3, byteOffset: 0 },
    { name: "color", type: "float32", components: 3, byteOffset: 12 },
    { name: "opacity", type: "float32", components: 1, byteOffset: 24 },
    { name: "radius", type: "float32", components: 1, byteOffset: 28 },
  ],
};

function validPayload() {
  return {
    version: 1,
    count: 2,
    bounds: {
      min: [-1, 0, -2],
      max: [3, 4, 2],
      center: [1, 2, 0],
      radius: 3,
    },
    layout: firstSmokeLayout,
    splats: [
      {
        position: [1, 2, 3],
        color: [0.25, 0.5, 0.75],
        opacity: 0.6,
        radius: 0.05,
      },
      {
        position: [-1, 0, 2],
        color: [1, 0, 0.25],
        opacity: 0.2,
        radius: 0.1,
      },
    ],
  };
}

function f32(values: number[]): number[] {
  return Array.from(new Float32Array(values));
}

function binaryManifest() {
  return {
    schema: "scaniverse_first_smoke_splat_v1",
    splat_count: 2,
    endianness: "little",
    stride_bytes: 32,
    fields: [
      { name: "position", component_type: "float32", components: 3, byte_offset: 0 },
      { name: "color", component_type: "float32", components: 3, byte_offset: 12 },
      { name: "opacity", component_type: "float32", components: 1, byte_offset: 24 },
      { name: "radius", component_type: "float32", components: 1, byte_offset: 28 },
    ],
    payload: {
      path: "scaniverse-first-smoke.f32.bin",
      component_type: "float32",
      byte_length: 64,
    },
    identity: {
      scheme: "row_index_is_original_zero_based_file_order",
      ids_component_type: "uint32",
      ids_path: "scaniverse-first-smoke.ids.u32.bin",
    },
    ids: {
      path: "scaniverse-first-smoke.ids.u32.bin",
      byte_length: 8,
      first_id: 0,
      last_id: 1,
    },
    bounds: validPayload().bounds,
  };
}

function binarySidecars() {
  const payload = new ArrayBuffer(64);
  const rows = new DataView(payload);
  const writeRow = (row: number, values: number[]) => {
    for (let i = 0; i < values.length; i++) {
      rows.setFloat32(row * 32 + i * 4, values[i], true);
    }
  };
  writeRow(0, [1, 2, 3, 0.25, 0.5, 0.75, 0.6, 0.05]);
  writeRow(1, [-1, 0, 2, 1, 0, 0.25, 0.2, 0.1]);

  const ids = new ArrayBuffer(8);
  const idView = new DataView(ids);
  idView.setUint32(0, 1, true);
  idView.setUint32(4, 0, true);

  return { payload, ids };
}

test("decodes first-smoke splat rows into typed browser attributes", () => {
  const decoded = decodeFirstSmokeSplatPayload(validPayload());

  assert.equal(decoded.count, 2);
  assert.deepEqual(Array.from(decoded.positions), [1, 2, 3, -1, 0, 2]);
  assert.deepEqual(Array.from(decoded.colors), [0.25, 0.5, 0.75, 1, 0, 0.25]);
  assert.deepEqual(Array.from(decoded.opacities), f32([0.6, 0.2]));
  assert.deepEqual(Array.from(decoded.radii), f32([0.05, 0.1]));
  assert.deepEqual(Array.from(decoded.originalIds), [0, 1]);
  assert.deepEqual(decoded.bounds.center, [1, 2, 0]);
  assert.equal(decoded.layout.strideBytes, 32);
});

test("accepts nested metadata with planar attribute arrays", () => {
  const rowPayload = validPayload();
  const decoded = decodeFirstSmokeSplatPayload({
    version: 1,
    metadata: {
      count: rowPayload.count,
      bounds: rowPayload.bounds,
      strideBytes: firstSmokeLayout.strideBytes,
      fields: firstSmokeLayout.fields,
    },
    attributes: {
      positions: [1, 2, 3, -1, 0, 2],
      colors: [0.25, 0.5, 0.75, 1, 0, 0.25],
      opacities: [0.6, 0.2],
      radii: [0.05, 0.1],
    },
    originalIds: [1, 0],
  });

  assert.equal(decoded.count, 2);
  assert.deepEqual(Array.from(decoded.positions), [1, 2, 3, -1, 0, 2]);
  assert.deepEqual(Array.from(decoded.originalIds), [1, 0]);
});

test("decodes Scaniverse first-smoke binary manifest sidecars", () => {
  const { payload, ids } = binarySidecars();
  const decoded = decodeFirstSmokeSplatManifest(binaryManifest(), payload, ids);

  assert.equal(decoded.count, 2);
  assert.deepEqual(Array.from(decoded.positions), [1, 2, 3, -1, 0, 2]);
  assert.deepEqual(Array.from(decoded.colors), [0.25, 0.5, 0.75, 1, 0, 0.25]);
  assert.deepEqual(Array.from(decoded.opacities), f32([0.6, 0.2]));
  assert.deepEqual(Array.from(decoded.radii), f32([0.05, 0.1]));
  assert.deepEqual(Array.from(decoded.originalIds), [1, 0]);
});

test("validates count, bounds, and required first-smoke row fields", () => {
  const missingRadius = validPayload();
  delete (missingRadius.splats[0] as { radius?: number }).radius;
  assert.throws(
    () => decodeFirstSmokeSplatPayload(missingRadius),
    /splats\[0\]\.radius/
  );

  const countMismatch = validPayload();
  countMismatch.count = 3;
  assert.throws(
    () => decodeFirstSmokeSplatPayload(countMismatch),
    /count .*2 rows/
  );

  const badBounds = validPayload();
  badBounds.bounds.radius = 0;
  assert.throws(
    () => decodeFirstSmokeSplatPayload(badBounds),
    /bounds\.radius/
  );

  const duplicateIds = validPayload();
  (duplicateIds as unknown as { originalIds: number[] }).originalIds = [0, 0];
  assert.throws(
    () => decodeFirstSmokeSplatPayload(duplicateIds),
    /duplicates original ID/
  );

  const { payload } = binarySidecars();
  assert.throws(
    () => decodeFirstSmokeSplatManifest(binaryManifest(), payload.slice(4)),
    /payload sidecar byte length/
  );
});

test("fetches and decodes browser-visible first-smoke payloads", async () => {
  let requested: RequestInfo | URL | undefined;
  const decoded = await fetchFirstSmokeSplatPayload("smoke-assets/scan.json", {
    fetchImpl: async (input) => {
      requested = input;
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => validPayload(),
      } as Response;
    },
  });

  assert.equal(requested, "smoke-assets/scan.json");
  assert.equal(decoded.count, 2);

  await assert.rejects(
    fetchFirstSmokeSplatPayload("missing.json", {
      fetchImpl: async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          text: async () => "nope",
        }) as Response,
    }),
    /404 Not Found/
  );
});

test("fetches Scaniverse manifest sidecars relative to the manifest URL", async () => {
  const { payload, ids } = binarySidecars();
  const requested: string[] = [];
  const decoded = await fetchFirstSmokeSplatPayload(
    "smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
    {
      fetchImpl: async (input) => {
        requested.push(String(input));
        if (String(input).endsWith(".json")) {
          return {
            ok: true,
            status: 200,
            statusText: "OK",
            json: async () => binaryManifest(),
          } as Response;
        }
        if (String(input).endsWith(".f32.bin")) {
          return {
            ok: true,
            status: 200,
            statusText: "OK",
            arrayBuffer: async () => payload,
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          arrayBuffer: async () => ids,
        } as Response;
      },
    }
  );

  assert.deepEqual(requested, [
    "smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
    "smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.f32.bin",
    "smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.ids.u32.bin",
  ]);
  assert.deepEqual(Array.from(decoded.originalIds), [1, 0]);
});

test("derives stable camera framing metadata from payload bounds", () => {
  const decoded = decodeFirstSmokeSplatPayload(validPayload());
  const framing = framingFromBounds(decoded.bounds, { fovY: Math.PI / 2 });

  assert.deepEqual(framing.target, [1, 2, 0]);
  assert.ok(framing.distance > decoded.bounds.radius);
  assert.ok(framing.near > 0);
  assert.ok(framing.far > framing.distance);
});

test("uploads typed splat attributes into separate GPU storage buffers", () => {
  (globalThis as typeof globalThis & { GPUBufferUsage: GPUBufferUsageFlags }).GPUBufferUsage = {
    STORAGE: 1,
    COPY_DST: 2,
  } as GPUBufferUsageFlags;

  const created: Array<{ desc: GPUBufferDescriptor; bytes: Uint8Array; unmapped: boolean }> = [];
  const device = {
    createBuffer(desc: GPUBufferDescriptor) {
      const entry = {
        desc,
        bytes: new Uint8Array(desc.size as number),
        unmapped: false,
      };
      created.push(entry);
      return {
        getMappedRange: () => entry.bytes.buffer,
        unmap: () => {
          entry.unmapped = true;
        },
      } as GPUBuffer;
    },
  } as GPUDevice;

  const decoded = decodeFirstSmokeSplatPayload(validPayload());
  const buffers = uploadSplatAttributeBuffers(device, decoded);

  assert.equal(buffers.count, 2);
  assert.equal(created.length, 5);
  assert.deepEqual(
    created.map((entry) => entry.desc.label),
    [
      "first_smoke_splat_positions",
      "first_smoke_splat_colors",
      "first_smoke_splat_opacities",
      "first_smoke_splat_radii",
      "first_smoke_splat_original_ids",
    ]
  );
  assert.ok(created.every((entry) => entry.unmapped));
  assert.deepEqual(Array.from(new Float32Array(created[0].bytes.buffer)), Array.from(decoded.positions));
  assert.deepEqual(Array.from(new Float32Array(created[1].bytes.buffer)), Array.from(decoded.colors));
  assert.deepEqual(Array.from(new Float32Array(created[2].bytes.buffer)), Array.from(decoded.opacities));
  assert.deepEqual(Array.from(new Float32Array(created[3].bytes.buffer)), Array.from(decoded.radii));
  assert.deepEqual(Array.from(new Uint32Array(created[4].bytes.buffer)), [0, 1]);
});
