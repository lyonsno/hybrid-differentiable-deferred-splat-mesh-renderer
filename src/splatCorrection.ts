import type { SplatAttributes, SplatBounds } from "./splats.js";

export type SplatCorrectionCropFrame =
  | "disabled"
  | "axis-flipped-asset"
  | "visual-root-local"
  | "pivot-local-minus-centroid"
  | string;

export interface SplatCorrectionIdentity {
  readonly rotation?: readonly number[];
  readonly axisFlips?: readonly (boolean | number)[];
  readonly centroidOffset?: readonly number[];
  readonly cropCoordinateMatrix?: readonly number[];
  readonly cropCoordinateFrame?: unknown;
  readonly crop?: unknown;
}

export interface SplatCorrectionStatus {
  readonly cropAppliedByRenderer: boolean;
  readonly cropFrame: SplatCorrectionCropFrame;
  readonly sourceCount: number;
  readonly keptCount: number;
  readonly warning: string | null;
}

export interface SplatCorrectionApplication extends SplatCorrectionStatus {
  readonly attributes: SplatAttributes;
}

interface NormalizedCrop {
  readonly enabled: boolean;
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

export const EMPTY_SPLAT_CORRECTION_STATUS: SplatCorrectionStatus = Object.freeze({
  cropAppliedByRenderer: false,
  cropFrame: "disabled",
  sourceCount: 0,
  keptCount: 0,
  warning: null,
});

export function applySplatCorrectionToAttributes(
  attributes: SplatAttributes,
  correction?: SplatCorrectionIdentity | null,
): SplatCorrectionApplication {
  const crop = normalizeCrop(correction?.crop);
  if (!crop.enabled) {
    return {
      attributes,
      cropAppliedByRenderer: false,
      cropFrame: "disabled",
      sourceCount: attributes.count,
      keptCount: attributes.count,
      warning: null,
    };
  }

  const cropRecord = isRecord(correction?.crop) ? correction.crop : null;
  const cropMatrix = normalizeMat4(correction?.cropCoordinateMatrix ?? cropRecord?.sourceToCropMatrix);
  const cropFrame = normalizeCropFrame(correction?.cropCoordinateFrame ?? cropRecord?.frame)
    ?? (cropMatrix ? "axis-flipped-asset" : "axis-flipped-asset");
  const keep = cropMatrix
    ? collectMatrixCropMask(attributes.positions, attributes.count, cropMatrix, crop)
    : collectLegacyCropMask(attributes.positions, attributes.count, correction, crop);

  if (keep.kept === 0) {
    return {
      attributes,
      cropAppliedByRenderer: false,
      cropFrame,
      sourceCount: attributes.count,
      keptCount: 0,
      warning: "crop-filtered-all-splats",
    };
  }

  if (keep.kept === attributes.count) {
    return {
      attributes,
      cropAppliedByRenderer: true,
      cropFrame,
      sourceCount: attributes.count,
      keptCount: keep.kept,
      warning: null,
    };
  }

  return {
    attributes: filterSplatAttributesByMask(attributes, keep.mask, keep.kept),
    cropAppliedByRenderer: true,
    cropFrame,
    sourceCount: attributes.count,
    keptCount: keep.kept,
    warning: null,
  };
}

function collectMatrixCropMask(
  positions: Float32Array,
  count: number,
  matrix: readonly number[],
  crop: NormalizedCrop,
): { mask: Uint8Array; kept: number } {
  const mask = new Uint8Array(count);
  let kept = 0;
  for (let index = 0; index < count; index += 1) {
    const base = index * 3;
    const x = positions[base];
    const y = positions[base + 1];
    const z = positions[base + 2];
    const cx = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    const cy = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    const cz = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    if (pointInsideCrop(cx, cy, cz, crop)) {
      mask[index] = 1;
      kept += 1;
    }
  }
  return { mask, kept };
}

function collectLegacyCropMask(
  positions: Float32Array,
  count: number,
  correction: SplatCorrectionIdentity | null | undefined,
  crop: NormalizedCrop,
): { mask: Uint8Array; kept: number } {
  const axisSigns = normalizeAxisSigns(correction?.axisFlips);
  const centroidOffset = normalizeVec3(correction?.centroidOffset, [0, 0, 0]);
  const canonical = collectAxisCropMask(positions, count, axisSigns, [0, 0, 0], crop);
  if (canonical.kept > 0 || centroidOffset.every((value) => Math.abs(value) < 1e-9)) {
    return canonical;
  }
  return collectAxisCropMask(positions, count, axisSigns, centroidOffset, crop);
}

function collectAxisCropMask(
  positions: Float32Array,
  count: number,
  axisSigns: readonly [number, number, number],
  offset: readonly [number, number, number],
  crop: NormalizedCrop,
): { mask: Uint8Array; kept: number } {
  const mask = new Uint8Array(count);
  let kept = 0;
  for (let index = 0; index < count; index += 1) {
    const base = index * 3;
    const x = positions[base] * axisSigns[0] - offset[0];
    const y = positions[base + 1] * axisSigns[1] - offset[1];
    const z = positions[base + 2] * axisSigns[2] - offset[2];
    if (pointInsideCrop(x, y, z, crop)) {
      mask[index] = 1;
      kept += 1;
    }
  }
  return { mask, kept };
}

function pointInsideCrop(x: number, y: number, z: number, crop: NormalizedCrop): boolean {
  return x >= crop.min[0] && x <= crop.max[0]
    && y >= crop.min[1] && y <= crop.max[1]
    && z >= crop.min[2] && z <= crop.max[2];
}

function normalizeCrop(crop: unknown): NormalizedCrop {
  if (!isRecord(crop) || crop.enabled !== true) {
    return { enabled: false, min: [0, 0, 0], max: [0, 0, 0] };
  }
  const min = normalizeVec3(crop.min, [0, 0, 0]);
  const max = normalizeVec3(crop.max, [0, 0, 0]);
  return { enabled: true, min, max };
}

function normalizeMat4(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || value.length !== 16) return null;
  const values = value.map((item) => Number(item));
  return values.every(Number.isFinite) ? values : null;
}

function normalizeVec3(value: unknown, fallback: readonly [number, number, number]): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) return [...fallback];
  const values = value.map((item) => Number(item));
  if (!values.every(Number.isFinite)) return [...fallback];
  return [values[0], values[1], values[2]];
}

function normalizeAxisSigns(value: unknown): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) return [1, 1, 1];
  return [
    normalizeAxisSign(value[0]),
    normalizeAxisSign(value[1]),
    normalizeAxisSign(value[2]),
  ];
}

function normalizeAxisSign(value: unknown): number {
  if (value === false) return -1;
  const sign = Number(value);
  return sign < 0 ? -1 : 1;
}

function normalizeCropFrame(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function filterSplatAttributesByMask(
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
  const newEmissive = attrs.emissive ? new Float32Array(kept * 3) : undefined;
  const newDetailNormals = attrs.detailNormals ? new Float32Array(kept * 3) : undefined;
  const newSh = attrs.sh ? new Float32Array(kept * attrs.sh.coefficientCount * 3) : undefined;

  let dst = 0;
  for (let src = 0; src < attrs.count; src += 1) {
    if (!keep[src]) continue;
    copyComponents(attrs.positions, newPositions, src, dst, 3);
    copyComponents(attrs.colors, newColors, src, dst, 3);
    copyComponents(attrs.opacities, newOpacities, src, dst, 1);
    copyComponents(attrs.radii, newRadii, src, dst, 1);
    copyComponents(attrs.scales, newScales, src, dst, 3);
    copyComponents(attrs.rotations, newRotations, src, dst, 4);
    copyComponents(attrs.originalIds, newOriginalIds, src, dst, 1);
    if (attrs.normals && newNormals) copyComponents(attrs.normals, newNormals, src, dst, 3);
    if (attrs.roughness && newRoughness) copyComponents(attrs.roughness, newRoughness, src, dst, 1);
    if (attrs.metalness && newMetalness) copyComponents(attrs.metalness, newMetalness, src, dst, 1);
    if (attrs.emissive && newEmissive) copyComponents(attrs.emissive, newEmissive, src, dst, 3);
    if (attrs.detailNormals && newDetailNormals) copyComponents(attrs.detailNormals, newDetailNormals, src, dst, 3);
    if (attrs.sh && newSh) {
      copyComponents(attrs.sh.coefficients, newSh, src, dst, attrs.sh.coefficientCount * 3);
    }
    dst += 1;
  }

  return {
    ...attrs,
    count: kept,
    positions: newPositions,
    colors: newColors,
    opacities: newOpacities,
    radii: newRadii,
    scales: newScales,
    rotations: newRotations,
    originalIds: newOriginalIds,
    normals: newNormals,
    roughness: newRoughness,
    metalness: newMetalness,
    emissive: newEmissive,
    detailNormals: newDetailNormals,
    sh: attrs.sh && newSh ? { ...attrs.sh, coefficients: newSh } : attrs.sh,
    bounds: recomputeBounds(newPositions, kept),
  };
}

function copyComponents<T extends Float32Array | Uint32Array>(
  source: T,
  target: T,
  srcIndex: number,
  dstIndex: number,
  components: number,
): void {
  const srcBase = srcIndex * components;
  const dstBase = dstIndex * components;
  for (let component = 0; component < components; component += 1) {
    target[dstBase + component] = source[srcBase + component];
  }
}

function recomputeBounds(positions: Float32Array, count: number): SplatBounds {
  if (count === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      center: [0, 0, 0],
      radius: 1e-6,
    };
  }
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let index = 0; index < count; index += 1) {
    const base = index * 3;
    const x = positions[base], y = positions[base + 1], z = positions[base + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const center: [number, number, number] = [
    (minX + maxX) * 0.5,
    (minY + maxY) * 0.5,
    (minZ + maxZ) * 0.5,
  ];
  let radius = 1e-6;
  for (let index = 0; index < count; index += 1) {
    const base = index * 3;
    radius = Math.max(radius, Math.hypot(
      positions[base] - center[0],
      positions[base + 1] - center[1],
      positions[base + 2] - center[2],
    ));
  }
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center,
    radius,
  };
}
