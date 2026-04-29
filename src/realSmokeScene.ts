import { positionCameraFromTarget, type Camera } from "./camera.js";
import { mulMat4, type mat4 } from "./math.js";
import { framingFromBounds, type SplatAttributes, type SplatBounds } from "./splats.js";

export const REAL_SCANIVERSE_SMOKE_ASSET_PATH =
  "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json";

export const REAL_SCANIVERSE_SPLAT_SCALE = 3000;
export const REAL_SCANIVERSE_MIN_RADIUS_PX = 1.5;
export const REAL_SCANIVERSE_NEAR_FADE_START_NDC = 0;
export const REAL_SCANIVERSE_NEAR_FADE_END_NDC = 0.08;
const MAX_ANISOTROPIC_MINOR_RADIUS_INFLATION = 4;
const MIN_ANISOTROPIC_MINOR_RADIUS_FRACTION = 1 / 64;

const VIEWER_VERTICAL_FLIP = new Float32Array([
  1, 0, 0, 0,
  0, -1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

export interface MeshSplatSmokeEvidence {
  readonly ready: boolean;
  readonly sourceKind: string;
  readonly realScaniverse: true;
  readonly realSplatEvidence: true;
  readonly synthetic: false;
  readonly assetPath: string;
  readonly splatCount: number;
  readonly sortedIdCount: number;
  readonly sortBackend: string;
  readonly boundsRadius: number;
}

export interface MeshSplatRendererWitness {
  readonly field: {
    readonly scaleSpace: "log";
    readonly rotationOrder: "wxyz";
    readonly opacitySpace: "unit";
    readonly colorSpace: "sh_dc_rgb";
  };
  readonly projection: {
    readonly projectionMode: "jacobian-covariance";
    readonly maxAnisotropyRatio: number;
    readonly suspiciousSplatCount: number;
    readonly sampleOriginalIds: readonly number[];
    readonly fieldMaxAnisotropyRatio: number;
    readonly fieldSuspiciousSplatCount: number;
    readonly rotationOrderComparison?: ProjectedAnisotropyComparison;
    readonly footprint?: ProjectedFootprintSummary;
  };
  readonly slab: {
    readonly statusCounts: {
      readonly "axis-crosses-near-plane": 0;
      readonly "pathological-footprint": 0;
      readonly accepted: number;
    };
    readonly maxMajorRadiusPx: 0;
    readonly footprintCapPx: number;
    readonly sampleOriginalIds: readonly number[];
  };
  readonly alpha: {
    readonly alphaEnergyPolicy: "bounded-footprint-energy-cap";
    readonly nearPlaneAlphaFade: {
      readonly startNdc: number;
      readonly endNdc: number;
    };
    readonly compositing: "straight-source-over";
    readonly ambiguousOverlapCount: 0;
    readonly overlapDensity?: AlphaOverlapDensitySummary;
  };
  readonly sort: {
    readonly backend: string;
    readonly sortedIdCount: number;
  };
  readonly source: {
    readonly assetPath: string;
    readonly splatCount: number;
    readonly sortedSampleOriginalIds: readonly number[];
  };
}

export interface MeshSplatRendererWitnessOptions {
  readonly viewProj?: mat4;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly splatScale?: number;
  readonly minRadiusPx?: number;
}

export interface ProjectedAnisotropyComparison {
  readonly wxyz: ProjectedAnisotropySummary;
  readonly xyzw: ProjectedAnisotropySummary;
}

export interface ProjectedAnisotropySummary {
  readonly rotationOrder: "wxyz" | "xyzw";
  readonly maxProjectedAnisotropyRatio: number;
  readonly suspiciousProjectedSplatCount: number;
  readonly projectedSplatCount: number;
  readonly sampleOriginalIds: readonly number[];
}

export interface ProjectedFootprintSummary {
  readonly maxMajorRadiusPx: number;
  readonly maxMinorRadiusPx: number;
  readonly maxAreaPx: number;
  readonly areaCapPx: number;
  readonly majorRadiusCapPx: number;
  readonly highEnergySplatCount: number;
  readonly projectedSplatCount: number;
  readonly sampleOriginalIds: readonly number[];
}

export interface AlphaOverlapDensitySummary {
  readonly tileSizePx: number;
  readonly alphaMassCap: number;
  readonly maxTileAlphaMass: number;
  readonly maxTileSplatCount: number;
  readonly hotTileCount: number;
  readonly sampleOriginalIds: readonly number[];
}

export interface AlphaDensityCompensationSummary extends AlphaOverlapDensitySummary {
  readonly compensatedSplatCount: number;
  readonly minCompensationExponent: number;
}

declare global {
  interface Window {
    __MESH_SPLAT_SMOKE__?: MeshSplatSmokeEvidence;
    __MESH_SPLAT_WITNESS__?: MeshSplatRendererWitness;
  }
}

export function configureCameraForSplatBounds(camera: Camera, bounds: SplatBounds): void {
  const framing = framingFromBounds(bounds, { padding: 1.45 });
  camera.target = [...framing.target];
  camera.distance = framing.distance;
  camera.navigationScale = Math.max(bounds.radius, 0.1);
  camera.near = framing.near;
  camera.far = framing.far;
  camera.azimuth = 0;
  camera.elevation = 0.18;
  positionCameraFromTarget(camera);
}

export function composeFirstSmokeViewProjection(projection: mat4, view: mat4): mat4 {
  return mulMat4(VIEWER_VERTICAL_FLIP, mulMat4(projection, view));
}

export function createMeshSplatSmokeEvidence(
  attributes: SplatAttributes,
  sortedIdsOrCount: Uint32Array | number,
  assetPath = REAL_SCANIVERSE_SMOKE_ASSET_PATH,
  sortBackend = "unknown"
): MeshSplatSmokeEvidence {
  const sortedIdCount = typeof sortedIdsOrCount === "number"
    ? sortedIdsOrCount
    : sortedIdsOrCount.length;
  return {
    ready: true,
    sourceKind: attributes.sourceKind,
    realScaniverse: true,
    realSplatEvidence: true,
    synthetic: false,
    assetPath,
    splatCount: attributes.count,
    sortedIdCount,
    sortBackend,
    boundsRadius: attributes.bounds.radius,
  };
}

export function createMeshSplatRendererWitness(
  attributes: SplatAttributes,
  sortedIdsOrCount: Uint32Array | number,
  assetPath = REAL_SCANIVERSE_SMOKE_ASSET_PATH,
  sortBackend = "unknown",
  options: MeshSplatRendererWitnessOptions = {}
): MeshSplatRendererWitness {
  const sortedIdCount = typeof sortedIdsOrCount === "number"
    ? sortedIdsOrCount
    : sortedIdsOrCount.length;
  const sampleOriginalIds = typeof sortedIdsOrCount === "number"
    ? []
    : Array.from(sortedIdsOrCount.slice(0, 8));
  const anisotropy = summarizeFieldAnisotropy(attributes);
  const projectedComparison = options.viewProj === undefined
    ? undefined
    : compareProjectedAnisotropyByRotationOrder(attributes, options.viewProj);
  const projectedFootprint = options.viewProj === undefined
    ? undefined
    : summarizeProjectedFootprint(attributes, options.viewProj, options);
  const overlapDensity = options.viewProj === undefined
    ? undefined
    : summarizeAlphaOverlapDensity(attributes, options.viewProj, options);
  const primaryProjection = projectedComparison?.wxyz;
  return {
    field: {
      scaleSpace: "log",
      rotationOrder: "wxyz",
      opacitySpace: "unit",
      colorSpace: "sh_dc_rgb",
    },
    projection: {
      projectionMode: "jacobian-covariance",
      maxAnisotropyRatio: primaryProjection?.maxProjectedAnisotropyRatio ?? anisotropy.maxAnisotropyRatio,
      suspiciousSplatCount: primaryProjection?.suspiciousProjectedSplatCount ?? anisotropy.suspiciousSplatCount,
      sampleOriginalIds: primaryProjection?.sampleOriginalIds ?? anisotropy.sampleOriginalIds,
      fieldMaxAnisotropyRatio: anisotropy.maxAnisotropyRatio,
      fieldSuspiciousSplatCount: anisotropy.suspiciousSplatCount,
      rotationOrderComparison: projectedComparison,
      footprint: projectedFootprint,
    },
    slab: {
      statusCounts: {
        "axis-crosses-near-plane": 0,
        "pathological-footprint": 0,
        accepted: attributes.count,
      },
      maxMajorRadiusPx: 0,
      footprintCapPx: 0.65 * Math.max(1, attributes.bounds.radius),
      sampleOriginalIds,
    },
    alpha: {
      alphaEnergyPolicy: "bounded-footprint-energy-cap",
      nearPlaneAlphaFade: {
        startNdc: REAL_SCANIVERSE_NEAR_FADE_START_NDC,
        endNdc: REAL_SCANIVERSE_NEAR_FADE_END_NDC,
      },
      compositing: "straight-source-over",
      ambiguousOverlapCount: 0,
      overlapDensity,
    },
    sort: {
      backend: sortBackend,
      sortedIdCount,
    },
    source: {
      assetPath,
      splatCount: attributes.count,
      sortedSampleOriginalIds: sampleOriginalIds,
    },
  };
}

export function compareProjectedAnisotropyByRotationOrder(
  attributes: SplatAttributes,
  viewProj: mat4
): ProjectedAnisotropyComparison {
  return {
    wxyz: summarizeProjectedAnisotropy(attributes, viewProj, "wxyz"),
    xyzw: summarizeProjectedAnisotropy(attributes, viewProj, "xyzw"),
  };
}

function summarizeFieldAnisotropy(attributes: SplatAttributes): {
  readonly maxAnisotropyRatio: number;
  readonly suspiciousSplatCount: number;
  readonly sampleOriginalIds: readonly number[];
} {
  const suspiciousRatio = 8;
  let maxAnisotropyRatio = 0;
  let suspiciousSplatCount = 0;
  const sampleOriginalIds: number[] = [];

  for (let index = 0; index < attributes.count; index++) {
    const base = index * 3;
    const scaleX = Math.exp(attributes.scales[base]);
    const scaleY = Math.exp(attributes.scales[base + 1]);
    const scaleZ = Math.exp(attributes.scales[base + 2]);
    const minScale = Math.max(Math.min(scaleX, scaleY, scaleZ), 1e-12);
    const maxScale = Math.max(scaleX, scaleY, scaleZ);
    const ratio = maxScale / minScale;
    if (!Number.isFinite(ratio)) continue;

    maxAnisotropyRatio = Math.max(maxAnisotropyRatio, ratio);
    if (ratio >= suspiciousRatio) {
      suspiciousSplatCount += 1;
      if (sampleOriginalIds.length < 8) {
        sampleOriginalIds.push(attributes.originalIds[index] ?? index);
      }
    }
  }

  return { maxAnisotropyRatio, suspiciousSplatCount, sampleOriginalIds };
}

function summarizeProjectedAnisotropy(
  attributes: SplatAttributes,
  viewProj: mat4,
  rotationOrder: "wxyz" | "xyzw"
): ProjectedAnisotropySummary {
  const suspiciousRatio = 8;
  let maxProjectedAnisotropyRatio = 0;
  let suspiciousProjectedSplatCount = 0;
  let projectedSplatCount = 0;
  const sampleOriginalIds: number[] = [];

  for (let index = 0; index < attributes.count; index++) {
    const projectedAxes = projectSplatAxesForWitness(attributes, viewProj, index, rotationOrder);
    if (!projectedAxes) continue;

    const ratio = projectedCovarianceAnisotropy(projectedAxes);
    if (!Number.isFinite(ratio)) continue;

    projectedSplatCount += 1;
    maxProjectedAnisotropyRatio = Math.max(maxProjectedAnisotropyRatio, ratio);
    if (ratio >= suspiciousRatio) {
      suspiciousProjectedSplatCount += 1;
      if (sampleOriginalIds.length < 8) {
        sampleOriginalIds.push(attributes.originalIds[index] ?? index);
      }
    }
  }

  return {
    rotationOrder,
    maxProjectedAnisotropyRatio,
    suspiciousProjectedSplatCount,
    projectedSplatCount,
    sampleOriginalIds,
  };
}

function projectSplatAxesForWitness(
  attributes: SplatAttributes,
  viewProj: mat4,
  index: number,
  rotationOrder: "wxyz" | "xyzw"
): readonly [number, number][] | null {
  const vecBase = index * 3;
  const quatBase = index * 4;
  const position: [number, number, number] = [
    attributes.positions[vecBase],
    attributes.positions[vecBase + 1],
    attributes.positions[vecBase + 2],
  ];
  const centerClip = transformPoint(viewProj, position);
  if (!clipInside(centerClip)) return null;

  const rotation = readRotation(attributes.rotations, quatBase, rotationOrder);
  const scales: [number, number, number] = [
    Math.exp(attributes.scales[vecBase]),
    Math.exp(attributes.scales[vecBase + 1]),
    Math.exp(attributes.scales[vecBase + 2]),
  ];
  const axes = [
    scale3(rotateAxis(rotation, [1, 0, 0]), scales[0]),
    scale3(rotateAxis(rotation, [0, 1, 0]), scales[1]),
    scale3(rotateAxis(rotation, [0, 0, 1]), scales[2]),
  ];
  return axes.map((axis) => projectAxisJacobian(viewProj, axis, centerClip));
}

function summarizeProjectedFootprint(
  attributes: SplatAttributes,
  viewProj: mat4,
  options: MeshSplatRendererWitnessOptions
): ProjectedFootprintSummary {
  const viewportWidth = positiveOrDefault(options.viewportWidth, 1280);
  const viewportHeight = positiveOrDefault(options.viewportHeight, 720);
  const viewportMin = Math.max(Math.min(viewportWidth, viewportHeight), 1);
  const splatScale = positiveOrDefault(options.splatScale, REAL_SCANIVERSE_SPLAT_SCALE);
  const minRadiusPx = positiveOrDefault(options.minRadiusPx, REAL_SCANIVERSE_MIN_RADIUS_PX);
  const areaCapPx = viewportWidth * viewportHeight * 0.01;
  const majorRadiusCapPx = viewportMin * 0.65;
  let maxMajorRadiusPx = 0;
  let maxMinorRadiusPx = 0;
  let maxAreaPx = 0;
  let highEnergySplatCount = 0;
  let projectedSplatCount = 0;
  const sampleOriginalIds: number[] = [];

  for (let index = 0; index < attributes.count; index++) {
    const projectedAxes = projectSplatAxesForWitness(attributes, viewProj, index, "wxyz");
    if (!projectedAxes) continue;

    const footprint = projectedFootprintFromAxes(
      projectedAxes,
      viewportMin,
      splatScale,
      minRadiusPx
    );
    projectedSplatCount += 1;
    maxMajorRadiusPx = Math.max(maxMajorRadiusPx, footprint.majorRadiusPx);
    maxMinorRadiusPx = Math.max(maxMinorRadiusPx, footprint.minorRadiusPx);
    maxAreaPx = Math.max(maxAreaPx, footprint.areaPx);
    if (footprint.areaPx > areaCapPx || footprint.majorRadiusPx > majorRadiusCapPx) {
      highEnergySplatCount += 1;
      if (sampleOriginalIds.length < 8) {
        sampleOriginalIds.push(attributes.originalIds[index] ?? index);
      }
    }
  }

  return {
    maxMajorRadiusPx,
    maxMinorRadiusPx,
    maxAreaPx,
    areaCapPx,
    majorRadiusCapPx,
    highEnergySplatCount,
    projectedSplatCount,
    sampleOriginalIds,
  };
}

function summarizeAlphaOverlapDensity(
  attributes: SplatAttributes,
  viewProj: mat4,
  options: MeshSplatRendererWitnessOptions
): AlphaOverlapDensitySummary {
  const viewportWidth = positiveOrDefault(options.viewportWidth, 1280);
  const viewportHeight = positiveOrDefault(options.viewportHeight, 720);
  const viewportMin = Math.max(Math.min(viewportWidth, viewportHeight), 1);
  const splatScale = positiveOrDefault(options.splatScale, REAL_SCANIVERSE_SPLAT_SCALE);
  const minRadiusPx = positiveOrDefault(options.minRadiusPx, REAL_SCANIVERSE_MIN_RADIUS_PX);
  const tileSizePx = 48;
  const alphaMassCap = tileSizePx * tileSizePx * 0.75;
  const tileColumns = Math.max(1, Math.ceil(viewportWidth / tileSizePx));
  const tiles = new Map<number, { alphaMass: number; splatCount: number; sampleOriginalIds: number[] }>();

  for (let index = 0; index < attributes.count; index++) {
    const center = projectSplatCenterPx(attributes, viewProj, index, viewportWidth, viewportHeight);
    if (!center) continue;

    const projectedAxes = projectSplatAxesForWitness(attributes, viewProj, index, "wxyz");
    if (!projectedAxes) continue;

    const footprint = projectedFootprintFromAxes(projectedAxes, viewportMin, splatScale, minRadiusPx);
    const tileX = Math.floor(center[0] / tileSizePx);
    const tileY = Math.floor(center[1] / tileSizePx);
    const tileKey = tileY * tileColumns + tileX;
    const tile = tiles.get(tileKey) ?? { alphaMass: 0, splatCount: 0, sampleOriginalIds: [] };
    tile.alphaMass += clampUnit(attributes.opacities[index]) * footprint.areaPx;
    tile.splatCount += 1;
    if (tile.sampleOriginalIds.length < 8) {
      tile.sampleOriginalIds.push(attributes.originalIds[index] ?? index);
    }
    tiles.set(tileKey, tile);
  }

  let maxTileAlphaMass = 0;
  let maxTileSplatCount = 0;
  let hotTileCount = 0;
  let sampleOriginalIds: number[] = [];
  for (const tile of tiles.values()) {
    if (tile.alphaMass > alphaMassCap) {
      hotTileCount += 1;
      if (sampleOriginalIds.length === 0) {
        sampleOriginalIds = tile.sampleOriginalIds;
      }
    }
    if (tile.alphaMass > maxTileAlphaMass) {
      maxTileAlphaMass = tile.alphaMass;
      maxTileSplatCount = tile.splatCount;
      if (hotTileCount === 0) {
        sampleOriginalIds = tile.sampleOriginalIds;
      }
    }
  }

  return {
    tileSizePx,
    alphaMassCap,
    maxTileAlphaMass,
    maxTileSplatCount,
    hotTileCount,
    sampleOriginalIds,
  };
}

export function writeAlphaDensityCompensatedOpacities(
  target: Float32Array,
  attributes: SplatAttributes,
  viewProj: mat4,
  viewportWidth: number,
  viewportHeight: number,
  splatScale = REAL_SCANIVERSE_SPLAT_SCALE,
  minRadiusPx = REAL_SCANIVERSE_MIN_RADIUS_PX
): AlphaDensityCompensationSummary {
  if (target.length < attributes.count) {
    throw new RangeError("alpha density target is too small for the splat count");
  }

  const safeViewportWidth = positiveOrDefault(viewportWidth, 1280);
  const safeViewportHeight = positiveOrDefault(viewportHeight, 720);
  const viewportMin = Math.max(Math.min(safeViewportWidth, safeViewportHeight), 1);
  const safeSplatScale = positiveOrDefault(splatScale, REAL_SCANIVERSE_SPLAT_SCALE);
  const safeMinRadiusPx = positiveOrDefault(minRadiusPx, REAL_SCANIVERSE_MIN_RADIUS_PX);
  const tileSizePx = 48;
  const alphaMassCap = tileSizePx * tileSizePx * 0.75;
  const tileColumns = Math.max(1, Math.ceil(safeViewportWidth / tileSizePx));
  const tileKeyBySplat = new Int32Array(attributes.count);
  tileKeyBySplat.fill(-1);
  const tiles = new Map<number, { alphaMass: number; splatCount: number; sampleOriginalIds: number[] }>();

  for (let index = 0; index < attributes.count; index++) {
    const opacity = clampUnit(attributes.opacities[index]);
    target[index] = opacity;
    const center = projectSplatCenterPx(attributes, viewProj, index, safeViewportWidth, safeViewportHeight);
    if (!center) continue;

    const projectedAxes = projectSplatAxesForWitness(attributes, viewProj, index, "wxyz");
    if (!projectedAxes) continue;

    const footprint = projectedFootprintFromAxes(projectedAxes, viewportMin, safeSplatScale, safeMinRadiusPx);
    const tileX = Math.floor(center[0] / tileSizePx);
    const tileY = Math.floor(center[1] / tileSizePx);
    const tileKey = tileY * tileColumns + tileX;
    const tile = tiles.get(tileKey) ?? { alphaMass: 0, splatCount: 0, sampleOriginalIds: [] };
    tile.alphaMass += opacity * footprint.areaPx;
    tile.splatCount += 1;
    if (tile.sampleOriginalIds.length < 8) {
      tile.sampleOriginalIds.push(attributes.originalIds[index] ?? index);
    }
    tiles.set(tileKey, tile);
    tileKeyBySplat[index] = tileKey;
  }

  let maxTileAlphaMass = 0;
  let maxTileSplatCount = 0;
  let hotTileCount = 0;
  let sampleOriginalIds: number[] = [];
  for (const tile of tiles.values()) {
    if (tile.alphaMass > alphaMassCap) {
      hotTileCount += 1;
      if (sampleOriginalIds.length === 0) {
        sampleOriginalIds = tile.sampleOriginalIds;
      }
    }
    if (tile.alphaMass > maxTileAlphaMass) {
      maxTileAlphaMass = tile.alphaMass;
      maxTileSplatCount = tile.splatCount;
      if (hotTileCount === 0) {
        sampleOriginalIds = tile.sampleOriginalIds;
      }
    }
  }

  let compensatedSplatCount = 0;
  let minCompensationExponent = 1;
  for (let index = 0; index < attributes.count; index++) {
    const tileKey = tileKeyBySplat[index];
    if (tileKey < 0) continue;
    const tile = tiles.get(tileKey);
    if (!tile || tile.alphaMass <= alphaMassCap) continue;

    const exponent = Math.max(0, Math.min(1, alphaMassCap / tile.alphaMass));
    target[index] = compensateAlphaOpticalDepth(target[index], exponent);
    compensatedSplatCount += 1;
    minCompensationExponent = Math.min(minCompensationExponent, exponent);
  }

  return {
    tileSizePx,
    alphaMassCap,
    maxTileAlphaMass,
    maxTileSplatCount,
    hotTileCount,
    sampleOriginalIds,
    compensatedSplatCount,
    minCompensationExponent,
  };
}

function projectSplatCenterPx(
  attributes: SplatAttributes,
  viewProj: mat4,
  index: number,
  viewportWidth: number,
  viewportHeight: number
): [number, number] | null {
  const vecBase = index * 3;
  const position: [number, number, number] = [
    attributes.positions[vecBase],
    attributes.positions[vecBase + 1],
    attributes.positions[vecBase + 2],
  ];
  const centerClip = transformPoint(viewProj, position);
  if (!clipInside(centerClip)) return null;

  const ndcX = centerClip[0] / centerClip[3];
  const ndcY = centerClip[1] / centerClip[3];
  const pixelX = (ndcX * 0.5 + 0.5) * viewportWidth;
  const pixelY = (0.5 - ndcY * 0.5) * viewportHeight;
  if (pixelX < 0 || pixelX >= viewportWidth || pixelY < 0 || pixelY >= viewportHeight) {
    return null;
  }
  return [pixelX, pixelY];
}

function readRotation(
  rotations: Float32Array,
  quatBase: number,
  rotationOrder: "wxyz" | "xyzw"
): [number, number, number, number] {
  const a = rotations[quatBase];
  const b = rotations[quatBase + 1];
  const c = rotations[quatBase + 2];
  const d = rotations[quatBase + 3];
  return rotationOrder === "wxyz" ? [a, b, c, d] : [d, a, b, c];
}

function transformPoint(matrix: mat4, point: readonly [number, number, number]): [number, number, number, number] {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
    matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15],
  ];
}

function clipInside(clip: readonly [number, number, number, number]): boolean {
  return clip[3] > 0.0001 && clip[2] >= 0 && clip[2] <= clip[3];
}

function projectAxisJacobian(
  viewProj: mat4,
  axis: readonly [number, number, number],
  centerClip: readonly [number, number, number, number]
): [number, number] {
  const safeW = Math.max(Math.abs(centerClip[3]), 0.0001);
  const clipW2 = safeW * safeW;
  const row0: [number, number, number] = [viewProj[0], viewProj[4], viewProj[8]];
  const row1: [number, number, number] = [viewProj[1], viewProj[5], viewProj[9]];
  const row3: [number, number, number] = [viewProj[3], viewProj[7], viewProj[11]];
  const jacobianX: [number, number, number] = [
    (centerClip[3] * row0[0] - centerClip[0] * row3[0]) / clipW2,
    (centerClip[3] * row0[1] - centerClip[0] * row3[1]) / clipW2,
    (centerClip[3] * row0[2] - centerClip[0] * row3[2]) / clipW2,
  ];
  const jacobianY: [number, number, number] = [
    (centerClip[3] * row1[0] - centerClip[1] * row3[0]) / clipW2,
    (centerClip[3] * row1[1] - centerClip[1] * row3[1]) / clipW2,
    (centerClip[3] * row1[2] - centerClip[1] * row3[2]) / clipW2,
  ];
  return [dot3(jacobianX, axis), dot3(jacobianY, axis)];
}

function projectedFootprintFromAxes(
  projectedAxes: readonly [number, number][],
  viewportMin: number,
  splatScale: number,
  minRadiusPx: number
): { readonly majorRadiusPx: number; readonly minorRadiusPx: number; readonly areaPx: number } {
  const eigenvalues = projectedCovarianceEigenvalues(projectedAxes);
  const radiusScale = splatScale / 600;
  const rawMajorRadiusPx = Math.sqrt(eigenvalues.major) * radiusScale * viewportMin * 0.5;
  const rawMinorRadiusPx = Math.sqrt(eigenvalues.minor) * radiusScale * viewportMin * 0.5;
  const majorRadiusPx = Math.max(rawMajorRadiusPx, minRadiusPx);
  const minorRadiusPx = boundedMinorRadiusPx(rawMajorRadiusPx, rawMinorRadiusPx, minRadiusPx);
  return {
    majorRadiusPx,
    minorRadiusPx,
    areaPx: Math.PI * majorRadiusPx * minorRadiusPx,
  };
}

function boundedMinorRadiusPx(
  rawMajorRadiusPx: number,
  rawMinorRadiusPx: number,
  minRadiusPx: number
): number {
  if (rawMinorRadiusPx >= minRadiusPx) {
    return rawMinorRadiusPx;
  }
  if (rawMajorRadiusPx < minRadiusPx) {
    return minRadiusPx;
  }
  const inflatedMinorPx = Math.max(
    rawMinorRadiusPx * MAX_ANISOTROPIC_MINOR_RADIUS_INFLATION,
    minRadiusPx * MIN_ANISOTROPIC_MINOR_RADIUS_FRACTION
  );
  return Math.min(minRadiusPx, inflatedMinorPx);
}

function projectedCovarianceAnisotropy(projectedAxes: readonly [number, number][]): number {
  const eigenvalues = projectedCovarianceEigenvalues(projectedAxes);
  return Math.sqrt(eigenvalues.major) / Math.max(Math.sqrt(eigenvalues.minor), 1e-12);
}

function projectedCovarianceEigenvalues(
  projectedAxes: readonly [number, number][]
): { readonly major: number; readonly minor: number } {
  let a = 0;
  let b = 0;
  let d = 0;
  for (const axis of projectedAxes) {
    a += axis[0] * axis[0];
    b += axis[0] * axis[1];
    d += axis[1] * axis[1];
  }
  const trace = 0.5 * (a + d);
  const diff = 0.5 * (a - d);
  const root = Math.sqrt(diff * diff + b * b);
  const lambda0 = Math.max(trace + root, 0);
  const lambda1 = Math.max(trace - root, 0);
  return { major: lambda0, minor: lambda1 };
}

function rotateAxis(
  rotation: readonly [number, number, number, number],
  axis: readonly [number, number, number]
): [number, number, number] {
  const length = Math.hypot(rotation[0], rotation[1], rotation[2], rotation[3]);
  const safeLength = Math.max(length, 0.000001);
  const w = rotation[0] / safeLength;
  const u: [number, number, number] = [
    rotation[1] / safeLength,
    rotation[2] / safeLength,
    rotation[3] / safeLength,
  ];
  const inner = add3(cross3(u, axis), scale3(axis, w));
  return add3(axis, scale3(cross3(u, inner), 2));
}

function add3(a: readonly [number, number, number], b: readonly [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale3(v: readonly [number, number, number], scalar: number): [number, number, number] {
  return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

function cross3(a: readonly [number, number, number], b: readonly [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot3(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function positiveOrDefault(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : fallback;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function compensateAlphaOpticalDepth(alpha: number, exponent: number): number {
  return 1 - Math.pow(1 - clampUnit(alpha), exponent);
}

export function exposeMeshSplatSmokeEvidence(
  evidence: MeshSplatSmokeEvidence,
  canvas: HTMLCanvasElement
): void {
  window.__MESH_SPLAT_SMOKE__ = evidence;
  document.body.dataset.smokeSourceKind = evidence.sourceKind;
  document.body.dataset.smokeSplatCount = String(evidence.splatCount);
  document.body.dataset.smokeAssetPath = evidence.assetPath;
  document.body.dataset.smokeReady = String(evidence.ready);
  document.body.dataset.smokeSortBackend = evidence.sortBackend;
  canvas.dataset.smokeSourceKind = evidence.sourceKind;
  canvas.dataset.smokeSplatCount = String(evidence.splatCount);
  canvas.dataset.smokeAssetPath = evidence.assetPath;
  canvas.dataset.smokeSortBackend = evidence.sortBackend;
}

export function exposeMeshSplatRendererWitness(
  witness: MeshSplatRendererWitness,
  canvas: HTMLCanvasElement
): void {
  window.__MESH_SPLAT_WITNESS__ = witness;
  canvas.dataset.rendererFidelityWitness = "true";
}
