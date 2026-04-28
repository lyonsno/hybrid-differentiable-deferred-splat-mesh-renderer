import type { FirstSmokeSplatLayout, SplatAttributes, SplatBounds } from "./splats.js";

const SH_C0 = 0.28209479177387814;
const FIRST_SMOKE_SPLAT_LAYOUT: FirstSmokeSplatLayout = {
  strideBytes: 32,
  fields: [
    { name: "position", type: "float32", components: 3, byteOffset: 0 },
    { name: "color", type: "float32", components: 3, byteOffset: 12 },
    { name: "opacity", type: "float32", components: 1, byteOffset: 24 },
    { name: "radius", type: "float32", components: 1, byteOffset: 28 },
  ],
};

interface PlyProperty {
  name: string;
  type: PlyScalarType;
  offset: number;
}

type PlyScalarType =
  | "char"
  | "uchar"
  | "short"
  | "ushort"
  | "int"
  | "uint"
  | "float"
  | "double";

interface PlyHeader {
  vertexCount: number;
  properties: PlyProperty[];
  rowStride: number;
  dataOffset: number;
}

export async function loadDroppedSplatFile(file: File): Promise<SplatAttributes> {
  if (!file.name.toLowerCase().endsWith(".ply")) {
    throw new Error("Drop a binary Scaniverse/3DGS .ply file; SPZ drag-drop is not wired yet.");
  }
  return decodeLocalPlySplatPayload(file.name, await file.arrayBuffer());
}

export function decodeLocalPlySplatPayload(
  fileName: string,
  bytes: ArrayBuffer
): SplatAttributes {
  const header = parseBinaryLittleEndianPlyHeader(bytes);
  const view = new DataView(bytes, header.dataOffset);
  const fields = new Map(header.properties.map((property) => [property.name, property]));
  const count = header.vertexCount;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const scales = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 4);
  const radii = new Float32Array(count);
  const originalIds = new Uint32Array(count);

  requireFields(fields, ["x", "y", "z"]);
  const hasDcColor = fields.has("f_dc_0") && fields.has("f_dc_1") && fields.has("f_dc_2");
  const hasByteColor = fields.has("red") && fields.has("green") && fields.has("blue");
  const hasScales = fields.has("scale_0") && fields.has("scale_1") && fields.has("scale_2");
  const hasRotations = fields.has("rot_0") && fields.has("rot_1") && fields.has("rot_2") && fields.has("rot_3");

  if (header.dataOffset + count * header.rowStride > bytes.byteLength) {
    throw new Error(`${fileName} ended before all ${count} vertex rows could be read`);
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let row = 0; row < count; row++) {
    const rowOffset = row * header.rowStride;
    const x = readProperty(view, rowOffset, fields.get("x")!);
    const y = readProperty(view, rowOffset, fields.get("y")!);
    const z = readProperty(view, rowOffset, fields.get("z")!);
    const vecBase = row * 3;
    positions[vecBase] = x;
    positions[vecBase + 1] = y;
    positions[vecBase + 2] = z;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);

    if (hasDcColor) {
      colors[vecBase] = clamp01(0.5 + SH_C0 * readProperty(view, rowOffset, fields.get("f_dc_0")!));
      colors[vecBase + 1] = clamp01(0.5 + SH_C0 * readProperty(view, rowOffset, fields.get("f_dc_1")!));
      colors[vecBase + 2] = clamp01(0.5 + SH_C0 * readProperty(view, rowOffset, fields.get("f_dc_2")!));
    } else if (hasByteColor) {
      colors[vecBase] = clamp01(readProperty(view, rowOffset, fields.get("red")!) / 255);
      colors[vecBase + 1] = clamp01(readProperty(view, rowOffset, fields.get("green")!) / 255);
      colors[vecBase + 2] = clamp01(readProperty(view, rowOffset, fields.get("blue")!) / 255);
    } else {
      colors[vecBase] = 0.5;
      colors[vecBase + 1] = 0.5;
      colors[vecBase + 2] = 0.5;
    }

    opacities[row] = fields.has("opacity")
      ? sigmoid(readProperty(view, rowOffset, fields.get("opacity")!))
      : 1;

    if (hasScales) {
      scales[vecBase] = readProperty(view, rowOffset, fields.get("scale_0")!);
      scales[vecBase + 1] = readProperty(view, rowOffset, fields.get("scale_1")!);
      scales[vecBase + 2] = readProperty(view, rowOffset, fields.get("scale_2")!);
    }
    radii[row] = Math.max(
      Math.exp(scales[vecBase]),
      Math.exp(scales[vecBase + 1]),
      Math.exp(scales[vecBase + 2])
    );

    const quatBase = row * 4;
    if (hasRotations) {
      rotations[quatBase] = readProperty(view, rowOffset, fields.get("rot_0")!);
      rotations[quatBase + 1] = readProperty(view, rowOffset, fields.get("rot_1")!);
      rotations[quatBase + 2] = readProperty(view, rowOffset, fields.get("rot_2")!);
      rotations[quatBase + 3] = readProperty(view, rowOffset, fields.get("rot_3")!);
    } else {
      rotations[quatBase] = 1;
    }
    originalIds[row] = row;
  }

  const bounds = boundsFromExtents(minX, minY, minZ, maxX, maxY, maxZ);
  return {
    count,
    sourceKind: "scaniverse_ply",
    positions,
    colors,
    opacities,
    radii,
    scales,
    rotations,
    originalIds,
    bounds,
    layout: FIRST_SMOKE_SPLAT_LAYOUT,
  };
}

function parseBinaryLittleEndianPlyHeader(bytes: ArrayBuffer): PlyHeader {
  const headerEnd = findHeaderEnd(bytes);
  const headerText = new TextDecoder("ascii").decode(bytes.slice(0, headerEnd.headerTextEnd));
  const lines = headerText.split(/\r?\n/);
  if (lines[0] !== "ply") {
    throw new Error("Dropped file does not start with a PLY header");
  }

  let isBinaryLittleEndian = false;
  let vertexCount: number | null = null;
  let inVertexElement = false;
  const properties: PlyProperty[] = [];
  let rowStride = 0;

  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "format") {
      isBinaryLittleEndian = parts[1] === "binary_little_endian";
    } else if (parts[0] === "element") {
      inVertexElement = parts[1] === "vertex";
      if (inVertexElement) {
        vertexCount = Number(parts[2]);
      }
    } else if (parts[0] === "property" && inVertexElement) {
      if (parts[1] === "list") {
        throw new Error("PLY vertex list properties are not supported for splat drag-drop");
      }
      const type = normalizeScalarType(parts[1]);
      properties.push({ name: parts[2], type, offset: rowStride });
      rowStride += scalarTypeSize(type);
    }
  }

  if (!isBinaryLittleEndian) {
    throw new Error("Only binary_little_endian PLY drag-drop is supported");
  }
  if (!Number.isInteger(vertexCount) || vertexCount === null || vertexCount <= 0) {
    throw new Error("PLY vertex count must be a positive integer");
  }
  if (properties.length === 0) {
    throw new Error("PLY vertex element has no scalar properties");
  }

  return {
    vertexCount,
    properties,
    rowStride,
    dataOffset: headerEnd.dataOffset,
  };
}

function findHeaderEnd(bytes: ArrayBuffer): { headerTextEnd: number; dataOffset: number } {
  const data = new Uint8Array(bytes);
  const marker = "end_header";
  const markerBytes = new TextEncoder().encode(marker);
  for (let i = 0; i <= data.length - markerBytes.length; i++) {
    let matches = true;
    for (let j = 0; j < markerBytes.length; j++) {
      if (data[i + j] !== markerBytes[j]) {
        matches = false;
        break;
      }
    }
    if (!matches) {
      continue;
    }
    let dataOffset = i + markerBytes.length;
    if (data[dataOffset] === 13) {
      dataOffset += 1;
    }
    if (data[dataOffset] === 10) {
      dataOffset += 1;
    }
    return { headerTextEnd: i + markerBytes.length, dataOffset };
  }
  throw new Error("Dropped file does not contain a complete PLY header");
}

function normalizeScalarType(type: string): PlyScalarType {
  if (type === "int8") return "char";
  if (type === "uint8") return "uchar";
  if (type === "int16") return "short";
  if (type === "uint16") return "ushort";
  if (type === "int32") return "int";
  if (type === "uint32") return "uint";
  if (type === "float32") return "float";
  if (type === "float64") return "double";
  if (isPlyScalarType(type)) {
    return type;
  }
  throw new Error(`Unsupported PLY scalar property type: ${type}`);
}

function isPlyScalarType(type: string): type is PlyScalarType {
  return ["char", "uchar", "short", "ushort", "int", "uint", "float", "double"].includes(type);
}

function scalarTypeSize(type: PlyScalarType): number {
  switch (type) {
    case "char":
    case "uchar":
      return 1;
    case "short":
    case "ushort":
      return 2;
    case "int":
    case "uint":
    case "float":
      return 4;
    case "double":
      return 8;
  }
}

function readProperty(view: DataView, rowOffset: number, property: PlyProperty): number {
  const offset = rowOffset + property.offset;
  switch (property.type) {
    case "char":
      return view.getInt8(offset);
    case "uchar":
      return view.getUint8(offset);
    case "short":
      return view.getInt16(offset, true);
    case "ushort":
      return view.getUint16(offset, true);
    case "int":
      return view.getInt32(offset, true);
    case "uint":
      return view.getUint32(offset, true);
    case "float":
      return view.getFloat32(offset, true);
    case "double":
      return view.getFloat64(offset, true);
  }
}

function requireFields(fields: Map<string, PlyProperty>, names: string[]): void {
  for (const name of names) {
    if (!fields.has(name)) {
      throw new Error(`PLY vertex property ${name} is required`);
    }
  }
}

function boundsFromExtents(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number
): SplatBounds {
  const center: [number, number, number] = [
    (minX + maxX) * 0.5,
    (minY + maxY) * 0.5,
    (minZ + maxZ) * 0.5,
  ];
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center,
    radius: Math.hypot((maxX - minX) * 0.5, (maxY - minY) * 0.5, (maxZ - minZ) * 0.5),
  };
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
