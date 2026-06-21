import type { FirstSmokeSplatLayout, SplatAttributes, SplatBounds } from "./splats.js";

// ---------------------------------------------------------------------------
// Kaminos sidecar correction types
// ---------------------------------------------------------------------------

export interface KaminosSidecar {
  schema: string;
  root_id?: string;
  path?: string;
  source?: string;
  correction: {
    orientation?: { rotation: [number, number, number] };
    axisFlips?: [number, number, number];
    centroidOffset?: [number, number, number];
    crop?: {
      enabled: boolean;
      min: [number, number, number];
      max: [number, number, number];
    };
  };
  updatedAt?: string;
}

/** Try to fetch a .kaminos-splat.json sidecar for the given PLY URL. */
export async function tryFetchSidecar(plyUrl: string): Promise<KaminosSidecar | undefined> {
  const sidecarUrl = `${plyUrl}.kaminos-splat.json`;
  try {
    const resp = await fetch(sidecarUrl);
    if (!resp.ok) return undefined;
    const json = await resp.json();
    if (json && typeof json === "object" && json.correction) return json as KaminosSidecar;
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Apply Kaminos sidecar corrections to decoded SplatAttributes.
 * Operations applied in order: crop (raw PLY space), centroid offset, axis flips.
 * Crop bounds in the sidecar are in the original PLY coordinate space — they
 * must be applied before offset/flip transforms.
 * Returns a new SplatAttributes with filtered splats if crop is active,
 * or the same object (mutated in-place) if no crop.
 */
export function applySidecarCorrections(
  attrs: SplatAttributes,
  sidecar: KaminosSidecar,
): SplatAttributes {
  const correction = sidecar.correction;

  // Apply crop first — bounds are in raw PLY coordinate space
  if (correction.crop?.enabled) {
    const [minX, minY, minZ] = correction.crop.min;
    const [maxX, maxY, maxZ] = correction.crop.max;
    const positions = attrs.positions;
    const count = attrs.count;

    const keep = new Uint8Array(count);
    let kept = 0;
    for (let i = 0; i < count; i++) {
      const base = i * 3;
      const x = positions[base];
      const y = positions[base + 1];
      const z = positions[base + 2];
      if (x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ) {
        keep[i] = 1;
        kept++;
      }
    }

    if (kept < count) {
      attrs = filterSplatAttributes(attrs, keep, kept);
    }
  }

  const positions = attrs.positions;
  const count = attrs.count;

  // Apply centroid offset (subtract to re-center)
  if (correction.centroidOffset) {
    const [cx, cy, cz] = correction.centroidOffset;
    for (let i = 0; i < count; i++) {
      const base = i * 3;
      positions[base] -= cx;
      positions[base + 1] -= cy;
      positions[base + 2] -= cz;
    }
  }

  // Apply axis flips (multiply each axis by +1 or -1)
  if (correction.axisFlips) {
    const [fx, fy, fz] = correction.axisFlips;
    if (fx !== 1 || fy !== 1 || fz !== 1) {
      for (let i = 0; i < count; i++) {
        const base = i * 3;
        positions[base] *= fx;
        positions[base + 1] *= fy;
        positions[base + 2] *= fz;
      }
    }
  }

  // Recompute bounds after all transforms
  attrs.bounds = recomputeBounds(positions, count);
  return attrs;
}

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
  const hasNormals = fields.has("nx") && fields.has("ny") && fields.has("nz");
  const hasRoughness = fields.has("roughness");
  const hasMetallic = fields.has("metallic");
  const shLayout = discoverPlyShLayout(fields);
  const normals = hasNormals ? new Float32Array(count * 3) : undefined;
  const roughness = hasRoughness ? new Float32Array(count) : undefined;
  const metalness = hasMetallic ? new Float32Array(count) : undefined;
  const shCoefficients =
    shLayout === undefined
      ? undefined
      : new Float32Array(count * shLayout.coefficientCount * 3);

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
    if (hasNormals && normals !== undefined) {
      normals[vecBase] = readProperty(view, rowOffset, fields.get("nx")!);
      normals[vecBase + 1] = readProperty(view, rowOffset, fields.get("ny")!);
      normals[vecBase + 2] = readProperty(view, rowOffset, fields.get("nz")!);
    }
    if (hasRoughness && roughness !== undefined) {
      roughness[row] = readProperty(view, rowOffset, fields.get("roughness")!);
    }
    if (hasMetallic && metalness !== undefined) {
      metalness[row] = readProperty(view, rowOffset, fields.get("metallic")!);
    }
    if (shLayout !== undefined && shCoefficients !== undefined) {
      writePlyShRow(view, rowOffset, shLayout, shCoefficients, row);
    }
    originalIds[row] = row;
  }

  // Use percentile-based bounds (P5-P95) for framing to exclude outlier
  // splats that inflate the bounding sphere. Falls back to min/max for
  // small counts where percentiles aren't meaningful.
  const bounds = count > 100
    ? percentileBounds(positions, count, 0.05)
    : boundsFromExtents(minX, minY, minZ, maxX, maxY, maxZ);

  return {
    count,
    sourceKind: "scaniverse_ply",
    positions,
    colors,
    opacities,
    radii,
    scales,
    rotations,
    sh:
      shLayout === undefined || shCoefficients === undefined
        ? undefined
        : {
            degree: shLayout.degree,
            basis: "3dgs_real_sh",
            coefficientCount: shLayout.coefficientCount,
            layout: "splat_coeff_rgb",
            coefficients: shCoefficients,
          },
    normals,
    roughness,
    metalness,
    originalIds,
    bounds,
    layout: FIRST_SMOKE_SPLAT_LAYOUT,
  };
}

interface PlyShLayout {
  degree: number;
  coefficientCount: number;
  restPropertiesByChannel: PlyProperty[][];
}

function discoverPlyShLayout(fields: Map<string, PlyProperty>): PlyShLayout | undefined {
  const restProperties = Array.from(fields.entries())
    .filter(([name]) => /^f_rest_\d+$/.test(name))
    .sort(([left], [right]) => Number(left.slice("f_rest_".length)) - Number(right.slice("f_rest_".length)))
    .map(([, property]) => property);
  if (restProperties.length === 0) {
    return undefined;
  }
  if (restProperties.length % 3 !== 0) {
    throw new Error(`PLY f_rest_* field count must be divisible by 3 RGB channels, got ${restProperties.length}`);
  }
  const coefficientCount = restProperties.length / 3;
  const degree = Math.sqrt(coefficientCount + 1) - 1;
  if (!Number.isInteger(degree) || degree <= 0) {
    throw new Error(`PLY f_rest_* field count ${restProperties.length} does not describe a complete SH degree`);
  }

  const restPropertiesByChannel: PlyProperty[][] = [];
  for (let channel = 0; channel < 3; channel++) {
    restPropertiesByChannel.push(
      restProperties.slice(channel * coefficientCount, (channel + 1) * coefficientCount)
    );
  }
  return { degree, coefficientCount, restPropertiesByChannel };
}

function writePlyShRow(
  view: DataView,
  rowOffset: number,
  layout: PlyShLayout,
  target: Float32Array,
  row: number
): void {
  const rowBase = row * layout.coefficientCount * 3;
  for (let coeff = 0; coeff < layout.coefficientCount; coeff++) {
    for (let channel = 0; channel < 3; channel++) {
      target[rowBase + coeff * 3 + channel] = readProperty(
        view,
        rowOffset,
        layout.restPropertiesByChannel[channel][coeff]
      );
    }
  }
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

function percentileBounds(
  positions: Float32Array,
  count: number,
  trimFraction: number,
): SplatBounds {
  // Sample positions for sorting (full sort of 1M+ is expensive)
  const sampleCount = Math.min(count, 50000);
  const step = count / sampleCount;
  const xs = new Float32Array(sampleCount);
  const ys = new Float32Array(sampleCount);
  const zs = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const base = Math.floor(i * step) * 3;
    xs[i] = positions[base];
    ys[i] = positions[base + 1];
    zs[i] = positions[base + 2];
  }
  xs.sort();
  ys.sort();
  zs.sort();

  const lo = Math.floor(sampleCount * trimFraction);
  const hi = Math.min(Math.floor(sampleCount * (1 - trimFraction)), sampleCount - 1);
  return boundsFromExtents(xs[lo], ys[lo], zs[lo], xs[hi], ys[hi], zs[hi]);
}

function recomputeBounds(positions: Float32Array, count: number): SplatBounds {
  if (count > 100) return percentileBounds(positions, count, 0.05);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < count; i++) {
    const base = i * 3;
    const x = positions[base], y = positions[base + 1], z = positions[base + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return boundsFromExtents(minX, minY, minZ, maxX, maxY, maxZ);
}

function filterSplatAttributes(
  attrs: SplatAttributes,
  keep: Uint8Array,
  kept: number,
): SplatAttributes {
  const newPositions = new Float32Array(kept * 3);
  const newColors = new Float32Array(kept * 3);
  const newOpacities = new Float32Array(kept);
  const newRadii = new Float32Array(kept);
  const newScales = new Float32Array(kept * 3);
  const newRotations = new Float32Array(kept * 4);
  const newOriginalIds = new Uint32Array(kept);
  const newNormals = attrs.normals ? new Float32Array(kept * 3) : undefined;
  const newRoughness = attrs.roughness ? new Float32Array(kept) : undefined;
  const newMetalness = attrs.metalness ? new Float32Array(kept) : undefined;
  const newSh = attrs.sh
    ? new Float32Array(kept * attrs.sh.coefficientCount * 3)
    : undefined;

  let dst = 0;
  for (let src = 0; src < attrs.count; src++) {
    if (!keep[src]) continue;
    const srcVec = src * 3;
    const dstVec = dst * 3;
    newPositions[dstVec] = attrs.positions[srcVec];
    newPositions[dstVec + 1] = attrs.positions[srcVec + 1];
    newPositions[dstVec + 2] = attrs.positions[srcVec + 2];
    newColors[dstVec] = attrs.colors[srcVec];
    newColors[dstVec + 1] = attrs.colors[srcVec + 1];
    newColors[dstVec + 2] = attrs.colors[srcVec + 2];
    newOpacities[dst] = attrs.opacities[src];
    newRadii[dst] = attrs.radii[src];
    newScales[dstVec] = attrs.scales[srcVec];
    newScales[dstVec + 1] = attrs.scales[srcVec + 1];
    newScales[dstVec + 2] = attrs.scales[srcVec + 2];
    const srcQuat = src * 4;
    const dstQuat = dst * 4;
    newRotations[dstQuat] = attrs.rotations[srcQuat];
    newRotations[dstQuat + 1] = attrs.rotations[srcQuat + 1];
    newRotations[dstQuat + 2] = attrs.rotations[srcQuat + 2];
    newRotations[dstQuat + 3] = attrs.rotations[srcQuat + 3];
    newOriginalIds[dst] = attrs.originalIds[src];
    if (newNormals && attrs.normals) {
      newNormals[dstVec] = attrs.normals[srcVec];
      newNormals[dstVec + 1] = attrs.normals[srcVec + 1];
      newNormals[dstVec + 2] = attrs.normals[srcVec + 2];
    }
    if (newRoughness && attrs.roughness) newRoughness[dst] = attrs.roughness[src];
    if (newMetalness && attrs.metalness) newMetalness[dst] = attrs.metalness[src];
    if (newSh && attrs.sh) {
      const coeffCount = attrs.sh.coefficientCount * 3;
      const srcShBase = src * coeffCount;
      const dstShBase = dst * coeffCount;
      for (let c = 0; c < coeffCount; c++) {
        newSh[dstShBase + c] = attrs.sh.coefficients[srcShBase + c];
      }
    }
    dst++;
  }

  return {
    count: kept,
    sourceKind: attrs.sourceKind,
    positions: newPositions,
    colors: newColors,
    opacities: newOpacities,
    radii: newRadii,
    scales: newScales,
    rotations: newRotations,
    sh: attrs.sh && newSh
      ? { ...attrs.sh, coefficients: newSh }
      : attrs.sh,
    normals: newNormals,
    roughness: newRoughness,
    metalness: newMetalness,
    originalIds: newOriginalIds,
    bounds: recomputeBounds(newPositions, kept),
    layout: attrs.layout,
    splatScale: attrs.splatScale,
  };
}

