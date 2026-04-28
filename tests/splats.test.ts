import assert from "node:assert/strict";
import test from "node:test";

import {
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
