import type { vec3 } from "./math.js";

export type SplatVec3 = vec3;

export type FirstSmokeSplatFieldName =
  | "position"
  | "color"
  | "opacity"
  | "radius";

export interface FirstSmokeSplatFieldLayout {
  name: FirstSmokeSplatFieldName;
  type: "float32";
  components: 1 | 3;
  byteOffset: number;
}

export interface FirstSmokeSplatLayout {
  strideBytes: number;
  fields: FirstSmokeSplatFieldLayout[];
}

export interface SplatBounds {
  min: SplatVec3;
  max: SplatVec3;
  center: SplatVec3;
  radius: number;
}

export interface SplatFraming {
  target: SplatVec3;
  radius: number;
  distance: number;
  near: number;
  far: number;
}

export interface SplatAttributes {
  count: number;
  positions: Float32Array;
  colors: Float32Array;
  opacities: Float32Array;
  radii: Float32Array;
  originalIds: Uint32Array;
  bounds: SplatBounds;
  layout: FirstSmokeSplatLayout;
}

export interface SplatGpuBuffers {
  count: number;
  positionBuffer: GPUBuffer;
  colorBuffer: GPUBuffer;
  opacityBuffer: GPUBuffer;
  radiusBuffer: GPUBuffer;
  originalIdBuffer: GPUBuffer;
  bounds: SplatBounds;
  layout: FirstSmokeSplatLayout;
}

export interface SplatFramingOptions {
  fovY?: number;
  padding?: number;
  minNear?: number;
}

export interface FetchFirstSmokeSplatPayloadOptions extends RequestInit {
  fetchImpl?: FetchLike;
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

type UnknownRecord = Record<string, unknown>;

const REQUIRED_FIELD_LAYOUT: readonly FirstSmokeSplatFieldLayout[] = [
  { name: "position", type: "float32", components: 3, byteOffset: 0 },
  { name: "color", type: "float32", components: 3, byteOffset: 12 },
  { name: "opacity", type: "float32", components: 1, byteOffset: 24 },
  { name: "radius", type: "float32", components: 1, byteOffset: 28 },
];

export const FIRST_SMOKE_SPLAT_LAYOUT: FirstSmokeSplatLayout = {
  strideBytes: 32,
  fields: REQUIRED_FIELD_LAYOUT.map((field) => ({ ...field })),
};

export async function fetchFirstSmokeSplatPayload(
  input: RequestInfo | URL,
  options: FetchFirstSmokeSplatPayloadOptions = {}
): Promise<SplatAttributes> {
  const { fetchImpl = globalThis.fetch, ...init } = options;
  if (!fetchImpl) {
    throw new Error("fetch is not available for first-smoke splat payloads");
  }

  const response = await fetchImpl(input, init);
  if (!response.ok) {
    const body = await responseText(response);
    const suffix = body ? `: ${body}` : "";
    throw new Error(
      `Failed to fetch first-smoke splat payload: ${response.status} ${response.statusText}${suffix}`
    );
  }

  const payload = await response.json();
  if (isSidecarManifest(payload)) {
    const root = requireRecord(payload, "payload");
    const payloadInfo = requireRecord(root.payload, "payload.payload");
    const payloadBytes = await fetchArrayBuffer(
      fetchImpl,
      resolveSidecarUrl(input, requireString(payloadInfo.path, "payload.path")),
      init,
      "first-smoke splat payload sidecar"
    );

    const idsPath = sidecarIdsPath(root);
    const idsBytes =
      idsPath === undefined
        ? undefined
        : await fetchArrayBuffer(
            fetchImpl,
            resolveSidecarUrl(input, idsPath),
            init,
            "first-smoke splat ID sidecar"
          );

    return decodeFirstSmokeSplatManifest(payload, payloadBytes, idsBytes);
  }

  return decodeFirstSmokeSplatPayload(payload);
}

export function decodeFirstSmokeSplatPayload(payload: unknown): SplatAttributes {
  const root = requireRecord(payload, "payload");
  const metadata =
    root.metadata === undefined
      ? root
      : requireRecord(root.metadata, "metadata");
  const count = requirePositiveInteger(
    firstDefined(metadata.count, metadata.splat_count),
    "count"
  );
  const bounds = decodeBounds(metadata.bounds, "bounds");
  const layout = decodeLayout(layoutSource(metadata), "layout");

  const decoded =
    root.splats !== undefined
      ? decodeRowSplatAttributes(root.splats, count)
      : decodePlanarSplatAttributes(root.attributes, count);

  return {
    count,
    positions: decoded.positions,
    colors: decoded.colors,
    opacities: decoded.opacities,
    radii: decoded.radii,
    originalIds: decodeOriginalIds(root.originalIds, count),
    bounds,
    layout,
  };
}

export function decodeFirstSmokeSplatManifest(
  manifest: unknown,
  payloadBytes: ArrayBuffer,
  idsBytes?: ArrayBuffer
): SplatAttributes {
  const root = requireRecord(manifest, "manifest");
  const count = requirePositiveInteger(
    firstDefined(root.splat_count, root.count),
    "splat_count"
  );
  const endianness = firstDefined(root.endianness, "little");
  if (endianness !== "little") {
    throw new Error("manifest.endianness must be little");
  }

  const bounds = decodeBounds(root.bounds, "bounds");
  const layout = decodeLayout(layoutSource(root), "layout");
  const payloadInfo = requireRecord(root.payload, "payload");
  const expectedPayloadBytes = count * layout.strideBytes;
  const declaredPayloadBytes = requirePositiveInteger(
    firstDefined(payloadInfo.byte_length, expectedPayloadBytes),
    "payload.byte_length"
  );
  if (declaredPayloadBytes !== expectedPayloadBytes) {
    throw new Error(
      `payload.byte_length must be ${expectedPayloadBytes} for ${count} rows`
    );
  }
  if (payloadBytes.byteLength !== expectedPayloadBytes) {
    throw new Error(
      `payload sidecar byte length ${payloadBytes.byteLength} does not match expected ${expectedPayloadBytes}`
    );
  }

  const offsets = fieldOffsets(layout);
  const data = new DataView(payloadBytes);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const radii = new Float32Array(count);

  for (let row = 0; row < count; row++) {
    const base = row * layout.strideBytes;
    for (let component = 0; component < 3; component++) {
      positions[row * 3 + component] = data.getFloat32(
        base + offsets.position + component * 4,
        true
      );
      colors[row * 3 + component] = data.getFloat32(
        base + offsets.color + component * 4,
        true
      );
    }
    opacities[row] = requireUnitInterval(
      data.getFloat32(base + offsets.opacity, true),
      `payload.rows[${row}].opacity`
    );
    radii[row] = requirePositiveFinite(
      data.getFloat32(base + offsets.radius, true),
      `payload.rows[${row}].radius`
    );
  }

  return {
    count,
    positions,
    colors,
    opacities,
    radii,
    originalIds:
      idsBytes === undefined
        ? decodeOriginalIds(undefined, count)
        : decodeOriginalIdBytes(idsBytes, count),
    bounds,
    layout,
  };
}

export function framingFromBounds(
  bounds: SplatBounds,
  options: SplatFramingOptions = {}
): SplatFraming {
  const fovY = options.fovY ?? Math.PI / 3;
  const padding = options.padding ?? 1.35;
  const minNear = options.minNear ?? 0.001;

  if (!Number.isFinite(fovY) || fovY <= 0 || fovY >= Math.PI) {
    throw new Error("framing.fovY must be a finite angle in (0, pi)");
  }
  if (!Number.isFinite(padding) || padding < 1) {
    throw new Error("framing.padding must be a finite value >= 1");
  }

  const radius = Math.max(bounds.radius, distanceFromBounds(bounds));
  const paddedRadius = radius * padding;
  const distance = paddedRadius / Math.sin(fovY / 2);
  const near = Math.max(minNear, distance - paddedRadius * 2);
  const far = distance + paddedRadius * 2;

  return {
    target: [...bounds.center],
    radius,
    distance,
    near,
    far,
  };
}

export function uploadSplatAttributeBuffers(
  device: GPUDevice,
  attributes: SplatAttributes
): SplatGpuBuffers {
  return {
    count: attributes.count,
    positionBuffer: createMappedStorageBuffer(
      device,
      attributes.positions,
      "first_smoke_splat_positions"
    ),
    colorBuffer: createMappedStorageBuffer(
      device,
      attributes.colors,
      "first_smoke_splat_colors"
    ),
    opacityBuffer: createMappedStorageBuffer(
      device,
      attributes.opacities,
      "first_smoke_splat_opacities"
    ),
    radiusBuffer: createMappedStorageBuffer(
      device,
      attributes.radii,
      "first_smoke_splat_radii"
    ),
    originalIdBuffer: createMappedStorageBuffer(
      device,
      attributes.originalIds,
      "first_smoke_splat_original_ids"
    ),
    bounds: attributes.bounds,
    layout: attributes.layout,
  };
}

function decodeRowSplatAttributes(
  splats: unknown,
  count: number
): Pick<SplatAttributes, "positions" | "colors" | "opacities" | "radii"> {
  if (!Array.isArray(splats)) {
    throw new Error("splats must be an array of first-smoke splat rows");
  }
  if (splats.length !== count) {
    throw new Error(`count ${count} does not match ${splats.length} rows`);
  }

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const radii = new Float32Array(count);

  for (let i = 0; i < splats.length; i++) {
    const row = requireRecord(splats[i], `splats[${i}]`);
    positions.set(requireVec3(row.position, `splats[${i}].position`), i * 3);
    colors.set(requireVec3(row.color, `splats[${i}].color`), i * 3);
    opacities[i] = requireUnitInterval(row.opacity, `splats[${i}].opacity`);
    radii[i] = requirePositiveFinite(row.radius, `splats[${i}].radius`);
  }

  return { positions, colors, opacities, radii };
}

function decodePlanarSplatAttributes(
  attributes: unknown,
  count: number
): Pick<SplatAttributes, "positions" | "colors" | "opacities" | "radii"> {
  const root = requireRecord(attributes, "attributes");
  const positions = decodeFloat32Array(
    firstDefined(root.positions, root.position),
    count * 3,
    "attributes.positions"
  );
  const colors = decodeFloat32Array(
    firstDefined(root.colors, root.color),
    count * 3,
    "attributes.colors"
  );
  const opacities = decodeFloat32Array(
    firstDefined(root.opacities, root.opacity),
    count,
    "attributes.opacities",
    requireUnitInterval
  );
  const radii = decodeFloat32Array(
    firstDefined(root.radii, root.radius),
    count,
    "attributes.radii",
    requirePositiveFinite
  );
  return { positions, colors, opacities, radii };
}

function decodeBounds(value: unknown, path: string): SplatBounds {
  const bounds = requireRecord(value, path);
  return {
    min: requireVec3(bounds.min, `${path}.min`),
    max: requireVec3(bounds.max, `${path}.max`),
    center: requireVec3(bounds.center, `${path}.center`),
    radius: requirePositiveFinite(bounds.radius, `${path}.radius`),
  };
}

function decodeLayout(value: unknown, path: string): FirstSmokeSplatLayout {
  const layout = requireRecord(value, path);
  const strideBytes = requirePositiveInteger(
    layout.strideBytes,
    `${path}.strideBytes`
  );
  if (strideBytes !== FIRST_SMOKE_SPLAT_LAYOUT.strideBytes) {
    throw new Error(
      `${path}.strideBytes must be ${FIRST_SMOKE_SPLAT_LAYOUT.strideBytes}`
    );
  }

  if (!Array.isArray(layout.fields)) {
    throw new Error(`${path}.fields must be an array`);
  }
  if (layout.fields.length !== REQUIRED_FIELD_LAYOUT.length) {
    throw new Error(
      `${path}.fields must contain exactly the first-smoke row fields`
    );
  }

  const decodedFields = layout.fields.map((field, index) =>
    decodeFieldLayout(field, `${path}.fields[${index}]`)
  );

  for (const required of REQUIRED_FIELD_LAYOUT) {
    const field = decodedFields.find((candidate) => candidate.name === required.name);
    if (!field) {
      throw new Error(`${path}.fields is missing ${required.name}`);
    }
    if (
      field.type !== required.type ||
      field.components !== required.components ||
      field.byteOffset !== required.byteOffset
    ) {
      throw new Error(
        `${path}.fields.${required.name} must be ${required.type}x${required.components} at byte ${required.byteOffset}`
      );
    }
  }

  return {
    strideBytes,
    fields: REQUIRED_FIELD_LAYOUT.map((field) => ({ ...field })),
  };
}

function layoutSource(metadata: UnknownRecord): unknown {
  if (metadata.layout !== undefined) {
    return metadata.layout;
  }
  if (
    metadata.strideBytes !== undefined ||
    metadata.stride_bytes !== undefined ||
    metadata.fields !== undefined ||
    metadata.fieldLayout !== undefined
  ) {
    return {
      strideBytes: firstDefined(metadata.strideBytes, metadata.stride_bytes),
      fields: firstDefined(metadata.fields, metadata.fieldLayout),
    };
  }
  return undefined;
}

function decodeFieldLayout(
  value: unknown,
  path: string
): FirstSmokeSplatFieldLayout {
  const field = requireRecord(value, path);
  const name = field.name;
  if (
    name !== "position" &&
    name !== "color" &&
    name !== "opacity" &&
    name !== "radius"
  ) {
    throw new Error(`${path}.name is not a first-smoke row field`);
  }
  const componentType = firstDefined(field.type, field.component_type);
  if (componentType !== "float32") {
    throw new Error(`${path}.type must be float32`);
  }
  const components = requirePositiveInteger(field.components, `${path}.components`);
  if (components !== 1 && components !== 3) {
    throw new Error(`${path}.components must be 1 or 3`);
  }
  const byteOffset = requireNonNegativeInteger(
    firstDefined(field.byteOffset, field.byte_offset),
    `${path}.byteOffset`
  );
  return { name, type: "float32", components, byteOffset };
}

function decodeOriginalIds(value: unknown, count: number): Uint32Array {
  if (value === undefined) {
    const ids = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
      ids[i] = i;
    }
    return ids;
  }

  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) {
    throw new Error("originalIds must be an array or typed array");
  }
  const ids = new Uint32Array(count);
  const values = Array.from(value as ArrayLike<unknown>);
  if (values.length !== count) {
    throw new Error(`originalIds must contain ${count} entries`);
  }
  const seen = new Set<number>();
  for (let i = 0; i < values.length; i++) {
    const id = requireNonNegativeInteger(values[i], `originalIds[${i}]`);
    if (id >= count) {
      throw new Error(`originalIds[${i}] must be less than count ${count}`);
    }
    if (seen.has(id)) {
      throw new Error(`originalIds[${i}] duplicates original ID ${id}`);
    }
    seen.add(id);
    ids[i] = id;
  }
  return ids;
}

function decodeOriginalIdBytes(idsBytes: ArrayBuffer, count: number): Uint32Array {
  const expectedBytes = count * 4;
  if (idsBytes.byteLength !== expectedBytes) {
    throw new Error(
      `ID sidecar byte length ${idsBytes.byteLength} does not match expected ${expectedBytes}`
    );
  }
  const data = new DataView(idsBytes);
  const ids = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    ids[i] = data.getUint32(i * 4, true);
  }
  return decodeOriginalIds(ids, count);
}

function decodeFloat32Array(
  value: unknown,
  expectedLength: number,
  path: string,
  validator: (value: unknown, path: string) => number = requireFiniteNumber
): Float32Array {
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) {
    throw new Error(`${path} must be an array or typed array`);
  }
  const values = Array.from(value as ArrayLike<unknown>);
  if (values.length !== expectedLength) {
    throw new Error(`${path} must contain ${expectedLength} entries`);
  }
  const out = new Float32Array(expectedLength);
  for (let i = 0; i < values.length; i++) {
    out[i] = validator(values[i], `${path}[${i}]`);
  }
  return out;
}

function requireRecord(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as UnknownRecord;
}

function requireVec3(value: unknown, path: string): SplatVec3 {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`${path} must be a float3`);
  }
  return [
    requireFiniteNumber(value[0], `${path}[0]`),
    requireFiniteNumber(value[1], `${path}[1]`),
    requireFiniteNumber(value[2], `${path}[2]`),
  ];
}

function requireFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}

function requirePositiveFinite(value: unknown, path: string): number {
  const number = requireFiniteNumber(value, path);
  if (number <= 0) {
    throw new Error(`${path} must be greater than zero`);
  }
  return number;
}

function requireUnitInterval(value: unknown, path: string): number {
  const number = requireFiniteNumber(value, path);
  if (number < 0 || number > 1) {
    throw new Error(`${path} must be in [0, 1]`);
  }
  return number;
}

function requirePositiveInteger(value: unknown, path: string): number {
  const number = requireNonNegativeInteger(value, path);
  if (number <= 0) {
    throw new Error(`${path} must be greater than zero`);
  }
  return number;
}

function requireNonNegativeInteger(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(`${path} must be a non-negative integer`);
  }
  return value;
}

function firstDefined(primary: unknown, fallback: unknown): unknown {
  return primary === undefined ? fallback : primary;
}

function distanceFromBounds(bounds: SplatBounds): number {
  const dx = bounds.max[0] - bounds.min[0];
  const dy = bounds.max[1] - bounds.min[1];
  const dz = bounds.max[2] - bounds.min[2];
  return Math.hypot(dx, dy, dz) / 2;
}

async function responseText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 256);
  } catch {
    return "";
  }
}

async function fetchArrayBuffer(
  fetchImpl: FetchLike,
  input: RequestInfo | URL,
  init: RequestInit,
  label: string
): Promise<ArrayBuffer> {
  const response = await fetchImpl(input, init);
  if (!response.ok) {
    const body = await responseText(response);
    const suffix = body ? `: ${body}` : "";
    throw new Error(
      `Failed to fetch ${label}: ${response.status} ${response.statusText}${suffix}`
    );
  }
  return response.arrayBuffer();
}

function isSidecarManifest(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }
  const root = payload as UnknownRecord;
  if (!root.payload || typeof root.payload !== "object" || Array.isArray(root.payload)) {
    return false;
  }
  return typeof (root.payload as UnknownRecord).path === "string";
}

function sidecarIdsPath(manifest: UnknownRecord): string | undefined {
  if (manifest.ids !== undefined) {
    const ids = requireRecord(manifest.ids, "ids");
    if (ids.path !== undefined) {
      return requireString(ids.path, "ids.path");
    }
  }
  if (manifest.identity !== undefined) {
    const identity = requireRecord(manifest.identity, "identity");
    if (identity.ids_path !== undefined) {
      return requireString(identity.ids_path, "identity.ids_path");
    }
  }
  return undefined;
}

function resolveSidecarUrl(manifestUrl: RequestInfo | URL, path: string): string {
  if (isAbsoluteUrl(path) || path.startsWith("/")) {
    return path;
  }

  const base = requestInputToString(manifestUrl);
  if (base) {
    if (isAbsoluteUrl(base)) {
      return new URL(path, base).toString();
    }
    const slash = base.lastIndexOf("/");
    return slash >= 0 ? `${base.slice(0, slash + 1)}${path}` : path;
  }

  return path;
}

function requestInputToString(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  const maybeRequest = input as { url?: unknown };
  return typeof maybeRequest.url === "string" ? maybeRequest.url : "";
}

function isAbsoluteUrl(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
}

function fieldOffsets(layout: FirstSmokeSplatLayout): Record<FirstSmokeSplatFieldName, number> {
  return {
    position: fieldOffset(layout, "position"),
    color: fieldOffset(layout, "color"),
    opacity: fieldOffset(layout, "opacity"),
    radius: fieldOffset(layout, "radius"),
  };
}

function fieldOffset(
  layout: FirstSmokeSplatLayout,
  name: FirstSmokeSplatFieldName
): number {
  const field = layout.fields.find((candidate) => candidate.name === name);
  if (!field) {
    throw new Error(`layout.fields is missing ${name}`);
  }
  return field.byteOffset;
}

function createMappedStorageBuffer(
  device: GPUDevice,
  data: Float32Array | Uint32Array,
  label: string
): GPUBuffer {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint8Array(buffer.getMappedRange()).set(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  );
  buffer.unmap();
  return buffer;
}
