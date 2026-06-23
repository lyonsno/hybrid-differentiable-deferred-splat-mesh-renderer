import type { SplatAttributes, SplatBounds } from "./splats.js";

export type SplatCorrectionCropFrame =
  | "disabled"
  | "axis-flipped-asset"
  | "visual-root-local"
  | "pivot-local-minus-centroid";

export interface SplatCorrectionIdentity {
  readonly rotation?: readonly number[];
  readonly axisFlips?: readonly (boolean | number)[];
  readonly centroidOffset?: readonly number[];
  readonly cropCoordinateMatrix?: readonly number[];
  readonly cropCoordinateFrame?: unknown;
  readonly crop?: unknown;
}

export interface SplatCorrectionApplication {
  readonly attributes: SplatAttributes;
  readonly cropApplied: boolean;
  readonly cropFrame: SplatCorrectionCropFrame;
  readonly sourceCount: number;
  readonly keptCount: number;
}

interface NormalizedCrop {
  readonly enabled: boolean;
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

export function applySplatCorrectionToAttributes(
  attributes: SplatAttributes,
  correction?: SplatCorrectionIdentity | null,
): SplatCorrectionApplication {
  const crop = normalizeCrop(correction?.crop);
  if (!crop.enabled) {
    return {
      attributes,
      cropApplied: false,
      cropFrame: "disabled",
      sourceCount: attributes.count,
      keptCount: attributes.count,
    };
  }

  const axisSigns = normalizeAxisSigns(correction?.axisFlips);
  const cropRecord = isRecord(correction?.crop) ? correction.crop : null;
  const cropCoordinateMatrix = normalizeMat4(correction?.cropCoordinateMatrix ?? cropRecord?.sourceToCropMatrix);
  const explicitCropFrame = normalizeCropFrame(correction?.cropCoordinateFrame ?? cropRecord?.frame);
  const centroidOffset = normalizeVec3(correction?.centroidOffset, "correction.centroidOffset", [0, 0, 0]);
  if (cropCoordinateMatrix) {
    const cropFrame = explicitCropFrame ?? "axis-flipped-asset";
    const keptIndices = collectMatrixCropIndices(attributes.positions, attributes.count, cropCoordinateMatrix, crop);
    return {
      attributes: filterSplatAttributes(attributes, keptIndices),
      cropApplied: true,
      cropFrame,
      sourceCount: attributes.count,
      keptCount: keptIndices.length,
    };
  }

  const canonicalIndices = collectCropIndices(attributes.positions, attributes.count, axisSigns, centroidOffset, crop, "axis-flipped-asset");
  const legacyIndices = canonicalIndices.length === 0 && centroidOffset.some(value => Math.abs(value) > 1e-9)
    ? collectCropIndices(attributes.positions, attributes.count, axisSigns, centroidOffset, crop, "pivot-local-minus-centroid")
    : [];
  const cropFrame = legacyIndices.length > 0 ? "pivot-local-minus-centroid" : "axis-flipped-asset";
  const keptIndices = legacyIndices.length > 0 ? legacyIndices : canonicalIndices;
  return {
    attributes: filterSplatAttributes(attributes, keptIndices),
    cropApplied: true,
    cropFrame,
    sourceCount: attributes.count,
    keptCount: keptIndices.length,
  };
}

function collectMatrixCropIndices(
  positions: Float32Array,
  count: number,
  cropCoordinateMatrix: readonly number[],
  crop: NormalizedCrop,
): number[] {
  const indices: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const base = index * 3;
    const [x, y, z] = transformPoint3(cropCoordinateMatrix, positions[base], positions[base + 1], positions[base + 2]);
    if (
      x >= crop.min[0] && x <= crop.max[0] &&
      y >= crop.min[1] && y <= crop.max[1] &&
      z >= crop.min[2] && z <= crop.max[2]
    ) {
      indices.push(index);
    }
  }
  return indices;
}

function collectCropIndices(
  positions: Float32Array,
  count: number,
  axisSigns: readonly [number, number, number],
  centroidOffset: readonly [number, number, number],
  crop: NormalizedCrop,
  frame: Exclude<SplatCorrectionCropFrame, "disabled">,
): number[] {
  const indices: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const base = index * 3;
    let x = positions[base] * axisSigns[0];
    let y = positions[base + 1] * axisSigns[1];
    let z = positions[base + 2] * axisSigns[2];
    if (frame === "pivot-local-minus-centroid") {
      x -= centroidOffset[0];
      y -= centroidOffset[1];
      z -= centroidOffset[2];
    }
    if (
      x >= crop.min[0] && x <= crop.max[0] &&
      y >= crop.min[1] && y <= crop.max[1] &&
      z >= crop.min[2] && z <= crop.max[2]
    ) {
      indices.push(index);
    }
  }
  return indices;
}

function filterSplatAttributes(attributes: SplatAttributes, indices: readonly number[]): SplatAttributes {
  if (indices.length === attributes.count) return attributes;
  return {
    ...attributes,
    count: indices.length,
    positions: filterFloat32Components(attributes.positions, indices, 3),
    colors: filterFloat32Components(attributes.colors, indices, 3),
    opacities: filterFloat32Components(attributes.opacities, indices, 1),
    radii: filterFloat32Components(attributes.radii, indices, 1),
    scales: filterFloat32Components(attributes.scales, indices, 3),
    rotations: filterFloat32Components(attributes.rotations, indices, 4),
    normals: attributes.normals ? filterFloat32Components(attributes.normals, indices, 3) : undefined,
    roughness: attributes.roughness ? filterFloat32Components(attributes.roughness, indices, 1) : undefined,
    metalness: attributes.metalness ? filterFloat32Components(attributes.metalness, indices, 1) : undefined,
    emissive: attributes.emissive ? filterFloat32Components(attributes.emissive, indices, 3) : undefined,
    sh: attributes.sh ? {
      ...attributes.sh,
      coefficients: filterFloat32Components(attributes.sh.coefficients, indices, attributes.sh.coefficientCount * 3),
    } : undefined,
    originalIds: filterUint32Components(attributes.originalIds, indices, 1),
    bounds: boundsFromPositions(filterFloat32Components(attributes.positions, indices, 3), indices.length),
  };
}

function filterFloat32Components(source: Float32Array, indices: readonly number[], components: number): Float32Array {
  const target = new Float32Array(indices.length * components);
  for (let outIndex = 0; outIndex < indices.length; outIndex += 1) {
    const inBase = indices[outIndex] * components;
    const outBase = outIndex * components;
    for (let component = 0; component < components; component += 1) {
      target[outBase + component] = source[inBase + component];
    }
  }
  return target;
}

function filterUint32Components(source: Uint32Array, indices: readonly number[], components: number): Uint32Array {
  const target = new Uint32Array(indices.length * components);
  for (let outIndex = 0; outIndex < indices.length; outIndex += 1) {
    const inBase = indices[outIndex] * components;
    const outBase = outIndex * components;
    for (let component = 0; component < components; component += 1) {
      target[outBase + component] = source[inBase + component];
    }
  }
  return target;
}

function boundsFromPositions(positions: Float32Array, count: number): SplatBounds {
  if (count === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      center: [0, 0, 0],
      radius: 1e-6,
    };
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < count; index += 1) {
    const base = index * 3;
    const x = positions[base];
    const y = positions[base + 1];
    const z = positions[base + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  const center: [number, number, number] = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  ];
  let radius = 1e-6;
  for (let index = 0; index < count; index += 1) {
    const base = index * 3;
    radius = Math.max(
      radius,
      Math.hypot(positions[base] - center[0], positions[base + 1] - center[1], positions[base + 2] - center[2]),
    );
  }
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center,
    radius,
  };
}

function normalizeCrop(value: unknown): NormalizedCrop {
  if (!isRecord(value) || value.enabled !== true) {
    return { enabled: false, min: [0, 0, 0], max: [0, 0, 0] };
  }
  const rawMin = normalizeVec3(value.min, "correction.crop.min", [0, 0, 0]);
  const rawMax = normalizeVec3(value.max, "correction.crop.max", [0, 0, 0]);
  return {
    enabled: true,
    min: [
      Math.min(rawMin[0], rawMax[0]),
      Math.min(rawMin[1], rawMax[1]),
      Math.min(rawMin[2], rawMax[2]),
    ],
    max: [
      Math.max(rawMin[0], rawMax[0]),
      Math.max(rawMin[1], rawMax[1]),
      Math.max(rawMin[2], rawMax[2]),
    ],
  };
}

function normalizeAxisSigns(value: unknown): readonly [number, number, number] {
  if (!Array.isArray(value)) return [1, 1, 1];
  return [
    axisSign(value[0]),
    axisSign(value[1]),
    axisSign(value[2]),
  ];
}

function normalizeCropFrame(value: unknown): Exclude<SplatCorrectionCropFrame, "disabled"> | null {
  if (value === "axis-flipped-asset" || value === "visual-root-local" || value === "pivot-local-minus-centroid") {
    return value;
  }
  return null;
}

function normalizeMat4(value: unknown): readonly number[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.length !== 16) {
    throw new Error("correction.cropCoordinateMatrix must be a finite mat4");
  }
  const matrix = value.map(Number);
  if (!matrix.every(Number.isFinite)) {
    throw new Error("correction.cropCoordinateMatrix must be a finite mat4");
  }
  return matrix;
}

function transformPoint3(matrix: readonly number[], x: number, y: number, z: number): [number, number, number] {
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  const safeW = Math.abs(w) > 1e-8 ? w : 1;
  return [
    (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / safeW,
    (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / safeW,
    (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / safeW,
  ];
}

function axisSign(value: unknown): number {
  if (value === true) return -1;
  if (typeof value === "number" && value < 0) return -1;
  return 1;
}

function normalizeVec3(value: unknown, path: string, fallback: readonly [number, number, number]): readonly [number, number, number] {
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`${path} must be a finite vec3`);
  }
  const vec = value.map(Number);
  if (!vec.every(Number.isFinite)) {
    throw new Error(`${path} must be a finite vec3`);
  }
  return [vec[0], vec[1], vec[2]];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
